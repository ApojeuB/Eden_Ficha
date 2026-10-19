// MODO LOCAL — mesma interface do store-supabase, guardando tudo no localStorage.
// Serve para testar/demonstrar. Não é seguro (senhas em texto no navegador).
import { slotsArquivo } from './rules.js';
const KEY = 'eden.local.db', SES = 'eden.local.session';
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : 'id-' + Math.random().toString(36).slice(2) + Date.now());
const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || { users: [], rooms: [], members: [], chars: [] }; } catch { return { users: [], rooms: [], members: [], chars: [] }; } };
const save = db => localStorage.setItem(KEY, JSON.stringify(db));
const me = () => localStorage.getItem(SES);
const need = () => { const u = me(); if (!u) throw new Error('Faça login.'); return u; };
const isGM = (db, roomId, u) => !!roomId && db.rooms.some(r => r.id === roomId && r.gm === u);
const isMember = (db, roomId, u) => db.members.some(m => m.room_id === roomId && m.user_id === u);
const pub = u => u && { id: u.id, email: u.email, nome: u.nome };

function checkChar(c) {
  const arq = Array.isArray(c.data?.arquivados) ? c.data.arquivados.length : 0, lim = slotsArquivo(c.nivel);
  if (arq > lim) throw new Error(`Limite de pontos arquivados excedido (${arq} de ${lim} espaços no nível ${c.nivel}).`);
}
const listeners = new Set();
const bc = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('eden-local') : null;
const ping = () => { listeners.forEach(f => f()); bc?.postMessage('x'); };
bc && (bc.onmessage = () => listeners.forEach(f => f()));

export default {
  mode: 'local',
  async init() { const db = load(); return pub(db.users.find(u => u.id === me())) || null; },
  async signUp(email, pw, nome) {
    const db = load(); email = email.trim().toLowerCase();
    if (db.users.some(u => u.email === email)) throw new Error('Este e-mail já está cadastrado.');
    if (pw.length < 6) throw new Error('A senha precisa ter ao menos 6 caracteres.');
    const u = { id: uid(), email, pw, nome: nome?.trim() || email.split('@')[0] };
    db.users.push(u); save(db); localStorage.setItem(SES, u.id); return pub(u);
  },
  async signIn(email, pw) {
    const db = load(); const u = db.users.find(x => x.email === email.trim().toLowerCase() && x.pw === pw);
    if (!u) throw new Error('E-mail ou senha incorretos.');
    localStorage.setItem(SES, u.id); return pub(u);
  },
  async signOut() { localStorage.removeItem(SES); },

  async listChars() { const db = load(), u = need(); return db.chars.filter(c => c.owner === u).map(c => ({ ...c, galeria: undefined })); },
  async listRoomChars(roomId) {
    const db = load(), u = need(); if (!isGM(db, roomId, u)) throw new Error('Somente o Mestre.');
    return db.chars.filter(c => c.room_id === roomId).map(c => ({ ...c, galeria: undefined }));
  },
  async getChar(id) {
    const db = load(), u = need(); const c = db.chars.find(x => x.id === id);
    if (!c || !(c.owner === u || isGM(db, c.room_id, u))) throw new Error('Ficha não encontrada ou sem permissão.');
    return structuredClone(c);
  },
  async getCharLight(id) { const c = await this.getChar(id); return { ...c, foto: undefined, galeria: undefined }; },
  async createChar(init) {
    const db = load(), u = need(); const usr = db.users.find(x => x.id === u);
    const c = { id: uid(), owner: u, room_id: null, nome: '', jogador: usr.nome, casca: '', nivel: 1, morto: false, data_morte: null, foto: null, galeria: [], data: {}, updated_at: new Date().toISOString(), ...init };
    checkChar(c); db.chars.push(c); save(db); return structuredClone(c);
  },
  async saveChar(id, patch) {
    const db = load(), u = need(); const c = db.chars.find(x => x.id === id);
    if (!c || !(c.owner === u || isGM(db, c.room_id, u))) throw new Error('Sem permissão.');
    const next = { ...c, ...patch, owner: c.owner, room_id: c.room_id, updated_at: new Date().toISOString() };
    checkChar(next); Object.assign(c, next); save(db); ping(); return structuredClone(c);
  },
  async deleteChar(id) { const db = load(), u = need(); db.chars = db.chars.filter(c => !(c.id === id && c.owner === u)); save(db); ping(); },

  async listRooms() {
    const db = load(), u = need();
    return db.rooms.filter(r => r.gm === u || isMember(db, r.id, u)).map(r => ({
      ...r, isGM: r.gm === u, total: db.chars.filter(c => c.room_id === r.id).length,
      gmNome: db.users.find(x => x.id === r.gm)?.nome || '—',
    }));
  },
  async createRoom(nome) {
    const db = load(), u = need(); if (!nome?.trim()) throw new Error('Dê um nome à sala.');
    const r = { id: uid(), nome: nome.trim(), codigo: Math.random().toString(36).slice(2, 8).toUpperCase(), gm: u, created_at: new Date().toISOString() };
    db.rooms.push(r); save(db); return r;
  },
  async deleteRoom(id) {
    const db = load(), u = need(); if (!isGM(db, id, u)) throw new Error('Somente o Mestre.');
    db.rooms = db.rooms.filter(r => r.id !== id); db.members = db.members.filter(m => m.room_id !== id);
    db.chars.forEach(c => { if (c.room_id === id) c.room_id = null; }); save(db); ping();
  },
  async joinRoom(codigo) {
    const db = load(), u = need(); const r = db.rooms.find(x => x.codigo === codigo.trim().toUpperCase());
    if (!r) throw new Error('Código de sala não encontrado.');
    if (!isMember(db, r.id, u) && r.gm !== u) db.members.push({ room_id: r.id, user_id: u });
    save(db); return r;
  },
  async leaveRoom(roomId) {
    const db = load(), u = need(); db.members = db.members.filter(m => !(m.room_id === roomId && m.user_id === u));
    db.chars.forEach(c => { if (c.owner === u && c.room_id === roomId) c.room_id = null; }); save(db); ping();
  },
  async setCharRoom(charId, roomId) {
    const db = load(), u = need(); const c = db.chars.find(x => x.id === charId);
    if (!c || c.owner !== u) throw new Error('Só o dono move a ficha.');
    if (roomId && !(isMember(db, roomId, u) || isGM(db, roomId, u))) throw new Error('Você não está nessa sala.');
    c.room_id = roomId || null; save(db); ping();
  },
  async kickChar(charId) {
    const db = load(), u = need(); const c = db.chars.find(x => x.id === charId);
    if (!c || !isGM(db, c.room_id, u)) throw new Error('Somente o Mestre.'); c.room_id = null; save(db); ping();
  },
  watchRoom(roomId, cb) { const f = () => cb(); listeners.add(f); const t = setInterval(f, 6000); return () => { listeners.delete(f); clearInterval(t); }; },
};
