import { store, ONLINE } from './store.js';
import * as R from './rules.js';
import { Sheet } from './sheet.js';
import { esc, toast, ask } from './ui.js';

const app = document.getElementById('app');
let user = null, sheet = null, unwatch = null;
const go = h => { if (location.hash === h || (!location.hash && h === '#/')) route(); else location.hash = h; }; // um único caminho para navegar

function cleanup() { sheet?.destroy(); sheet = null; unwatch?.(); unwatch = null; }
async function route() {
  cleanup();
  const [, page, id] = (location.hash || '#/').split('/');
  try {
    if (!user) return viewAuth();
    if (page === 'ficha' && id) return await viewSheet(id);
    if (page === 'sala' && id) return await viewRoom(id);
    return await viewHome(page === 'salas' ? 'salas' : 'fichas');
  } catch (e) { console.error(e); app.innerHTML = `<div class="wrap"><div class="empty err"><p>${esc(e.message)}</p><button class="btn" onclick="location.hash='#/'">Início</button></div></div>`; }
}

/* ───────── Autenticação ───────── */
function viewAuth(modo = 'entrar') {
  app.innerHTML = `<div class="auth"><div class="auth-card">
    <div class="logo"><span class="compass" aria-hidden="true">✦</span><h1>EDEN</h1><p>Ficha do Jogador</p><small class="tagline">Três polaridades. Infinitas possibilidades.</small></div>
    ${ONLINE ? '' : '<div class="demo">Modo demonstração — as contas e fichas ficam só neste navegador. Para jogar online com a mesa, configure o Supabase (veja o README).</div>'}
    <div class="tabs2" role="tablist"><button role="tab" class="${modo === 'entrar' ? 'on' : ''}" data-m="entrar">Entrar</button><button role="tab" class="${modo === 'criar' ? 'on' : ''}" data-m="criar">Criar conta</button></div>
    <form id="fa" novalidate>
      ${modo === 'criar' ? '<label class="fld"><span>Nome de jogador</span><input class="f" name="nome" autocomplete="nickname" required></label>' : ''}
      <label class="fld"><span>E-mail</span><input class="f" name="email" type="email" autocomplete="email" required></label>
      <label class="fld"><span>Senha</span><input class="f" name="pw" type="password" autocomplete="${modo === 'criar' ? 'new-password' : 'current-password'}" minlength="6" required></label>
      <p class="form-err" id="ferr" role="alert"></p>
      <button class="btn accent wide" type="submit">${modo === 'criar' ? 'Criar conta' : 'Entrar'}</button>
    </form></div></div>`;
  app.querySelectorAll('[data-m]').forEach(b => b.onclick = () => viewAuth(b.dataset.m));
  app.querySelector('#fa').onsubmit = async e => {
    e.preventDefault(); const f = new FormData(e.target), err = app.querySelector('#ferr'); err.textContent = '';
    if (!f.get('email') || !f.get('pw')) { err.textContent = 'Preencha e-mail e senha.'; return; }
    try { user = modo === 'criar' ? await store.signUp(f.get('email'), f.get('pw'), f.get('nome')) : await store.signIn(f.get('email'), f.get('pw')); go('#/'); }
    catch (x) { err.textContent = x.message; }
  };
}

function topbar(extra = '') {
  return `<header class="top"><a class="brand-s" href="#/"><span aria-hidden="true">✦</span> EDEN</a>${extra}<span class="sp"></span><span class="who">${esc(user.nome)}</span><button class="btn ghost small" id="out">Sair</button></header>`;
}
function bindTop() { app.querySelector('#out')?.addEventListener('click', async () => { await store.signOut(); user = null; go('#/'); }); }

/* ───────── Início: fichas e salas ───────── */
async function viewHome(tab) {
  const [chars, rooms] = await Promise.all([store.listChars(), store.listRooms()]);
  const roomName = id => rooms.find(r => r.id === id)?.nome;
  const fichas = `<div class="grid-cards">
    <button class="card-new" id="newc"><span>＋</span>Nova ficha</button>
    ${chars.map(c => { const d = R.derivar(R.completar(c.data), c.nivel); return `<article class="pc ${c.morto ? 'dead' : ''}"><a class="pc-main" href="#/ficha/${c.id}">${c.foto ? `<img src="${c.foto}" alt="">` : '<span class="silh sm" aria-hidden="true"></span>'}
      <div><b>${esc(c.nome || 'Sem nome')}</b><small>${esc(c.casca || 'Sem Casca')} · Nível ${c.nivel}</small><small>PV ${c.data?.rec?.pv ?? '—'}/${d.pvMax}${c.morto ? ' · ☠ morto' : ''}</small>${c.room_id ? `<em class="pill">${esc(roomName(c.room_id) || 'Sala')}</em>` : ''}</div></a>
      <button class="b-x" data-del="${c.id}" aria-label="Excluir ficha ${esc(c.nome)}">🗑</button></article>`; }).join('')}</div>`;
  const salas = `<div class="room-actions">
      <form class="inline" id="fcr"><input class="f" name="n" placeholder="Nome da nova sala (você será o Mestre)" required><button class="btn accent">Criar sala</button></form>
      <form class="inline" id="fjn"><input class="f" name="c" placeholder="Código da sala" maxlength="12" required><button class="btn">Entrar na sala</button></form></div>
    ${rooms.length ? `<div class="grid-cards rooms">${rooms.map(r => `<a class="room" href="#/sala/${r.id}"><b>${esc(r.nome)}</b><span class="pill ${r.isGM ? 'gm' : ''}">${r.isGM ? 'Mestre' : 'Jogador'}</span>${r.isGM ? `<small>Código: <code>${esc(r.codigo)}</code></small>` : `<small>Mestre: ${esc(r.gmNome || '')}</small>`}</a>`).join('')}</div>` : '<div class="empty"><p>Você ainda não está em nenhuma sala. Crie uma como Mestre ou entre com o código que o Mestre passou.</p></div>'}`;
  app.innerHTML = `<div class="wrap">${topbar()}
    <nav class="tabs2 big" role="tablist"><a role="tab" class="${tab === 'fichas' ? 'on' : ''}" href="#/">Minhas fichas <span class="count">${chars.length}</span></a><a role="tab" class="${tab === 'salas' ? 'on' : ''}" href="#/salas">Salas <span class="count">${rooms.length}</span></a></nav>
    ${tab === 'fichas' ? fichas : salas}</div>`;
  bindTop();
  app.querySelector('#newc')?.addEventListener('click', async () => { const c = await store.createChar({ nome: '', data: R.novaData() }); go('#/ficha/' + c.id); });
  app.querySelectorAll('[data-del]').forEach(b => b.onclick = async () => { if (confirm('Excluir esta ficha para sempre?')) { await store.deleteChar(b.dataset.del); route(); } });
  app.querySelector('#fcr')?.addEventListener('submit', async e => { e.preventDefault(); try { const r = await store.createRoom(new FormData(e.target).get('n')); go('#/sala/' + r.id); } catch (x) { toast(x.message, 'err'); } });
  app.querySelector('#fjn')?.addEventListener('submit', async e => { e.preventDefault(); try { const r = await store.joinRoom(new FormData(e.target).get('c')); toast(`Você entrou em “${r.nome}”.`); go('#/sala/' + r.id); } catch (x) { toast(x.message, 'err'); } });
}

/* ───────── Sala ───────── */
async function viewRoom(id) {
  const rooms = await store.listRooms(); const room = rooms.find(r => r.id === id);
  if (!room) throw new Error('Sala não encontrada.');
  const draw = async () => {
    const mine = await store.listChars();
    const list = room.isGM ? await store.listRoomChars(id) : mine.filter(c => c.room_id === id);
    const livres = mine.filter(c => c.room_id !== id);
    const body = room.isGM ? gmGrid(list) : playerView(list, livres);
    const keep = window.scrollY;
    app.innerHTML = `<div class="wrap">${topbar()}
      <div class="room-h"><div><a href="#/salas" class="back">← Salas</a><h1>${esc(room.nome)}</h1><span class="pill ${room.isGM ? 'gm' : ''}">${room.isGM ? 'Você é o Mestre' : 'Jogador'}</span></div>
        ${room.isGM ? `<div class="code"><small>Código da sala</small><b id="code">${esc(room.codigo)}</b><button class="btn small" id="cp">Copiar</button></div>` : ''}</div>
      ${body}
      <div class="room-foot">${room.isGM ? '<button class="btn danger small" id="delroom">Excluir sala</button>' : '<button class="btn ghost small" id="leave">Sair da sala</button>'}</div></div>`;
    window.scrollTo(0, keep); bindTop(); bindRoom(room, list, draw);
  };
  await draw();
  unwatch = store.watchRoom(id, () => { if (!document.querySelector('dialog[open]')) draw().catch(() => {}); });
}
function gmGrid(list) {
  if (!list.length) return '<div class="empty"><p>Nenhuma ficha na sala ainda. Passe o código aos jogadores: eles entram na sala e colocam suas fichas nela.</p></div>';
  return `<div class="gm-grid">${list.map(c => {
    const data = R.completar(c.data), d = R.derivar(data, c.nivel), pv = data.rec.pv, pct = Math.max(0, Math.min(100, d.pvMax ? pv / d.pvMax * 100 : 0));
    const chips = [c.morto && '<span class="pill danger">☠ Morto</span>', d.morrendo && !c.morto && '<span class="pill danger">Morrendo</span>', d.forma && `<span class="pill gm" title="Forma demoníaca ativa">♆ ${d.forma.n}º ${esc(d.forma.pecado.split(' ')[0])} · ${data.evol.horas}h</span>`, !d.forma && data.evol?.circulo && `<span class="pill" title="Preso a este Círculo">preso: ${esc(data.evol.circulo)}</span>`, ...R.CONDICOES.filter(x => data.cond[x.k] && x.k !== 'morrendo').map(x => `<span class="pill">${x.n}</span>`)].filter(Boolean).join('');
    return `<article class="gmc ${c.morto ? 'dead' : ''}" data-id="${c.id}">
      <a class="gmc-top" href="#/ficha/${c.id}">${c.foto ? `<img src="${c.foto}" alt="">` : '<span class="silh sm" aria-hidden="true"></span>'}<div><b>${esc(c.nome || 'Sem nome')}</b><small>${esc(c.jogador || '')} · ${esc(c.casca || 'Sem Casca')} · Nv ${c.nivel}</small></div></a>
      <div class="gmc-bars"><div class="bl"><span>PV</span><div class="bar"><i style="width:${pct}%" data-low="${pct <= 25 ? 1 : pct <= 50 ? 2 : 0}"></i></div><b>${pv}/${d.pvMax}</b></div>
        <div class="gmc-st"><span title="PA">PA ${d.paEf}</span><span title="PM">PM ${d.pmEf}</span><span title="Evasão">EVA ${d.evasao}</span><span title="Defesa">DEF ${d.defesa}</span><span title="Insanidade">INS ${data.surv.insan}/${data.surv.insanLim}</span></div>
        <div class="gmc-st"><span>Fome ${data.surv.fome}</span><span>Sede ${data.surv.sede}</span><span>Fadiga ${data.surv.fadiga}</span><span class="${d.usados >= d.slots ? 'full' : ''}" title="Pontos de atributo arquivados">Arquivo ${d.usados}/${d.slots}${d.usados ? ' (' + R.arquivados(data).join(' ') + ')' : ''}</span></div>
        ${R.ATTR_KEYS.length ? `<div class="gmc-attr">${R.ATTR_KEYS.map(k => `<span><small>${k}</small>${d.a[k]}</span>`).join('')}</div>` : ''}</div>
      <div class="gmc-chips">${chips}</div>
      <div class="gmc-act"><a class="btn small" href="#/ficha/${c.id}">Abrir ficha</a><button class="btn small accent" data-give="${c.id}">Conceder</button><button class="btn small ghost" data-kick="${c.id}">Remover</button></div></article>`;
  }).join('')}</div>`;
}
function playerView(list, livres) {
  return `<h2 class="sub">Suas fichas nesta sala</h2>${list.length ? `<div class="grid-cards">${list.map(c => `<article class="pc"><a class="pc-main" href="#/ficha/${c.id}">${c.foto ? `<img src="${c.foto}" alt="">` : '<span class="silh sm" aria-hidden="true"></span>'}<div><b>${esc(c.nome || 'Sem nome')}</b><small>${esc(c.casca || 'Sem Casca')} · Nível ${c.nivel}</small></div></a><button class="btn small ghost" data-unplace="${c.id}">Tirar</button></article>`).join('')}</div>` : '<div class="empty"><p>Nenhuma ficha sua está nesta sala ainda.</p></div>'}
    ${livres.length ? `<h2 class="sub">Colocar uma ficha na sala</h2><div class="inline"><select class="f" id="place">${livres.map(c => `<option value="${c.id}">${esc(c.nome || 'Sem nome')} — ${esc(c.casca || 'Sem Casca')}${c.room_id ? ' (em outra sala)' : ''}</option>`).join('')}</select><button class="btn accent" id="placeBtn">Colocar na sala</button></div>` : '<p class="hint">Crie uma ficha em “Minhas fichas” para colocá-la aqui.</p>'}`;
}
function bindRoom(room, list, draw) {
  app.querySelector('#cp')?.addEventListener('click', async () => { try { await navigator.clipboard.writeText(room.codigo); toast('Código copiado!'); } catch { toast('Código: ' + room.codigo); } });
  app.querySelector('#delroom')?.addEventListener('click', async () => { if (confirm('Excluir a sala? As fichas dos jogadores continuam existindo, só saem da sala.')) { await store.deleteRoom(room.id); go('#/salas'); } });
  app.querySelector('#leave')?.addEventListener('click', async () => { if (confirm('Sair da sala? Suas fichas saem dela.')) { await store.leaveRoom(room.id); go('#/salas'); } });
  app.querySelector('#placeBtn')?.addEventListener('click', async () => { try { await store.setCharRoom(app.querySelector('#place').value, room.id); toast('Ficha colocada na sala.'); draw(); } catch (x) { toast(x.message, 'err'); } });
  app.querySelectorAll('[data-unplace]').forEach(b => b.onclick = async () => { await store.setCharRoom(b.dataset.unplace, null); draw(); });
  app.querySelectorAll('[data-kick]').forEach(b => b.onclick = async () => { if (confirm('Remover esta ficha da sala? (ela continua com o jogador)')) { await store.kickChar(b.dataset.kick); draw(); } });
  app.querySelectorAll('[data-give]').forEach(b => b.onclick = () => conceder(list.find(c => c.id === b.dataset.give), draw));
}

// O Mestre concede pontos de atributo (arquivados) e/ou FP — respeitando o limite do nível.
function conceder(c, draw) {
  const dlg = document.createElement('dialog'); dlg.className = 'ask';
  dlg.innerHTML = `<form method="dialog"><h3>Conceder a ${esc(c.nome || 'ficha')}</h3>
    <p class="hint">Criatura derrotada → ponto de atributo arquivado (limite do nível ${c.nivel}: ${R.slotsArquivo(c.nivel)} espaços).</p>
    <div class="row2"><label class="fld"><span>Ponto de atributo</span><select class="f" id="gA"><option value="">— nenhum —</option>${R.ATTRS.map(a => `<option value="${a.k}">${a.n} (${a.k})</option>`).join('')}</select></label>
    <label class="fld"><span>Frutos Proibidos (FP)</span><input class="f" id="gF" type="number" min="0" value="0"></label></div>
    <p class="form-err" id="gE" role="alert"></p>
    <div class="rl-btns"><button type="button" class="btn accent" id="gOk">Conceder</button><button class="btn ghost" value="x">Fechar</button></div></form>`;
  document.body.append(dlg); dlg.addEventListener('close', () => dlg.remove()); dlg.showModal();
  dlg.querySelector('#gOk').onclick = async () => {
    const err = dlg.querySelector('#gE'); err.textContent = '';
    try {
      const fresh = await store.getChar(c.id); const data = R.completar(fresh.data); const out = [];
      const attr = dlg.querySelector('#gA').value, fp = Math.max(0, Math.floor(Number(dlg.querySelector('#gF').value) || 0));
      if (attr) { const r = R.arquivarPonto(data, fresh.nivel, attr); if (!r.ok) { err.textContent = r.msg; return; } out.push(r.msg); }
      if (fp) { data.fp = (Number(data.fp) || 0) + fp; out.push(`+${fp} FP`); }
      if (!out.length) { err.textContent = 'Escolha um atributo ou informe FP.'; return; }
      await store.saveChar(c.id, { data }); toast(out.join(' · ')); dlg.close(); draw();
    } catch (x) { err.textContent = x.message; }
  };
}

/* ───────── Ficha ───────── */
async function viewSheet(id) {
  const c = await store.getChar(id);
  const isGM = c.owner !== user.id;
  app.innerHTML = '<div class="wrap sheet-wrap" id="sheetRoot"></div>';
  sheet = new Sheet(app.querySelector('#sheetRoot'), c, { store, user, isGM, onBack: () => { const to = c.room_id && isGM ? '#/sala/' + c.room_id : '#/'; sheet?.flush().finally(() => go(to)); } });
}

window.addEventListener('hashchange', route);
window.addEventListener('beforeunload', () => sheet?.flush());
if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});
(async () => { try { user = await store.init(); } catch (e) { console.error(e); } route(); })();
