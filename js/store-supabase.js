// MODO ONLINE — Supabase (Auth + Postgres + RLS). Veja supabase/schema.sql.
import CONFIG from './config.js';
const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm');
const sb = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY, { auth: { persistSession: true, autoRefreshToken: true } });
const LIGHT = 'id,owner,room_id,nome,jogador,casca,nivel,morto,data_morte,foto,updated_at,data';
const ok = ({ data, error }) => { if (error) throw new Error(traduz(error.message)); return data; };
const traduz = m => /Invalid login/i.test(m) ? 'E-mail ou senha incorretos.' : /already registered/i.test(m) ? 'Este e-mail já está cadastrado.' : /Password should/i.test(m) ? 'A senha precisa ter ao menos 6 caracteres.' : /row-level security/i.test(m) ? 'Sem permissão para essa ação.' : m;
const pub = u => u && { id: u.id, email: u.email, nome: u.user_metadata?.nome || u.email.split('@')[0] };
let _u = null;

export default {
  mode: 'online',
  async init() { const { data } = await sb.auth.getSession(); _u = pub(data.session?.user); return _u || null; },
  async signUp(email, password, nome) {
    const { data, error } = await sb.auth.signUp({ email: email.trim(), password, options: { data: { nome: nome?.trim() } } });
    if (error) throw new Error(traduz(error.message));
    if (!data.session) throw new Error('Conta criada! Confirme o e-mail que enviamos e depois entre.');
    _u = pub(data.user); return _u;
  },
  async signIn(email, password) { const { data, error } = await sb.auth.signInWithPassword({ email: email.trim(), password }); if (error) throw new Error(traduz(error.message)); _u = pub(data.user); return _u; },
  async signOut() { await sb.auth.signOut(); _u = null; },

  async listChars() { return ok(await sb.from('characters').select(LIGHT).eq('owner', _u.id).order('updated_at', { ascending: false })); },
  async listRoomChars(roomId) { return ok(await sb.from('characters').select(LIGHT).eq('room_id', roomId).order('nome')); },
  async getChar(id) { return ok(await sb.from('characters').select('*').eq('id', id).single()); },
  async getCharLight(id) { return ok(await sb.from('characters').select('id,nome,jogador,casca,nivel,morto,data_morte,updated_at,data').eq('id', id).single()); },
  async createChar(init) { return ok(await sb.from('characters').insert({ jogador: _u.nome, ...init }).select('*').single()); },
  async saveChar(id, patch) { return ok(await sb.from('characters').update(patch).eq('id', id).select('id,updated_at').single()); },
  async deleteChar(id) { ok(await sb.from('characters').delete().eq('id', id)); },

  async listRooms() {
    const rooms = ok(await sb.from('rooms').select('id,nome,codigo,gm,created_at').order('created_at', { ascending: false }));
    return rooms.map(r => ({ ...r, isGM: r.gm === _u.id }));
  },
  async createRoom(nome) { if (!nome?.trim()) throw new Error('Dê um nome à sala.'); return ok(await sb.from('rooms').insert({ nome: nome.trim(), gm: _u.id }).select('*').single()); },
  async deleteRoom(id) { ok(await sb.from('rooms').delete().eq('id', id)); },
  async joinRoom(codigo) { const r = ok(await sb.rpc('entrar_sala', { p_codigo: codigo.trim().toUpperCase(), p_nome: _u.nome })); if (!r) throw new Error('Código de sala não encontrado.'); return r; },
  async leaveRoom(roomId) { ok(await sb.rpc('sair_sala', { p_room: roomId })); },
  async setCharRoom(charId, roomId) { ok(await sb.from('characters').update({ room_id: roomId || null }).eq('id', charId)); },
  async kickChar(charId) { ok(await sb.rpc('remover_da_sala', { p_char: charId })); },
  watchRoom(roomId, cb) {
    const ch = sb.channel('room-' + roomId).on('postgres_changes', { event: '*', schema: 'public', table: 'characters', filter: `room_id=eq.${roomId}` }, () => cb()).subscribe();
    const t = setInterval(cb, 20000); // fallback caso o Realtime não esteja ativo
    return () => { sb.removeChannel(ch); clearInterval(t); };
  },
};
