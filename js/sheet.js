// A ficha em si: renderização, edição, cálculos automáticos, arquivo de atributos, rolagem e fotos.
import * as R from './rules.js';
import { CASCAS } from './data/cascas.js';
import { esc, toast, imgToDataURL, fmtData, toLocalInput } from './ui.js';

const get = (o, p) => p.split('.').reduce((a, k) => (a == null ? a : a[k]), o);
const set = (o, p, v) => { const ks = p.split('.'); let a = o; for (let i = 0; i < ks.length - 1; i++) a = a[ks[i]] ??= {}; a[ks[ks.length - 1]] = v; };
const POLS = [['neg', '−', 'Negativa'], ['neu', 'n', 'Neutra'], ['pos', '+', 'Positiva']]; // ordem pedida: − n +
const LISTAS = { // modelos de linha para "adicionar"
  disciplinas: () => ({ nome: '', apt: '', nivel: 0 }), manifest: () => ({ nome: '', pol: '', pa: '', carga: '', efeito: '' }),
  ataques: () => ({ nome: '', teste: '', dano: '', pa: '', alcance: '' }), inventario: () => ({ item: '', qtd: '' }),
  relacoes: () => ({ pessoa: '', relacao: '' }), 'virt.menores': () => ({ nome: '', versiculos: 0 }), 'equip.armas': () => ({ nome: '' }),
};

export class Sheet {
  constructor(root, char, { store, user, isGM, onBack }) {
    Object.assign(this, { root, c: char, store, user, isGM, onBack });
    this.c.data = R.completar(this.c.data);
    R.normalizarArquivo(this.c.data, this.c.nivel);
    this.ui = { arq: sessionStorage.getItem('eden.arq') === '1', sel: -1, msg: '' };
    this.dirty = false; this.saving = false; this.flags = {};
    this.root.addEventListener('input', e => this.onInput(e));
    this.root.addEventListener('change', e => this.onChange(e));
    this.root.addEventListener('click', e => this.onClick(e));
    this._vis = () => { if (document.hidden) this.flush(); };
    document.addEventListener('visibilitychange', this._vis);
    this.timer = setInterval(() => this.tick(), 15000);
    this.render();
  }
  destroy() { this.flush(); clearInterval(this.timer); document.removeEventListener('visibilitychange', this._vis); this.root.replaceChildren(); }

  $(s) { return this.root.querySelector(s); }
  $$(s) { return [...this.root.querySelectorAll(s)]; }
  get data() { return this.c.data; }

  /* ───────── helpers de campos ───────── */
  v(path) { return path.startsWith('c.') ? this.c[path.slice(2)] : get(this.data, path); }
  inp(path, { type = 'text', cls = '', ph = '', min, max, attrs = '' } = {}) {
    const val = this.v(path);
    return `<input class="f ${cls}" data-b="${path}" type="${type}" value="${esc(val ?? '')}" placeholder="${esc(ph)}" ${min != null ? `min="${min}" data-min="${min}"` : ''} ${max != null ? `max="${max}" data-max="${max}"` : ''} ${type === 'number' ? 'inputmode="numeric"' : ''} autocomplete="off" ${attrs}>`;
  }
  area(path, rows = 3, ph = '') { return `<textarea class="f" data-b="${path}" rows="${rows}" placeholder="${esc(ph)}">${esc(this.v(path) ?? '')}</textarea>`; }
  field(label, html, cls = '') { return `<label class="fld ${cls}"><span>${label}</span>${html}</label>`; }
  card(id, glyph, title, body, extra = '') { return `<section class="card" id="${id}"><header class="card-h"><i class="hex" aria-hidden="true">${glyph}</i><h2>${title}</h2>${extra}</header>${body}</section>`; }
  step(path, label, { min = 0, max = 99 } = {}) {
    return `<div class="stepper"><button type="button" class="b-ico" data-act="step" data-path="${path}" data-d="-1" data-min="${min}" data-max="${max}" aria-label="Diminuir ${label}">−</button>${this.inp(path, { type: 'number', cls: 'c', min, max })}<button type="button" class="b-ico" data-act="step" data-path="${path}" data-d="1" data-min="${min}" data-max="${max}" aria-label="Aumentar ${label}">+</button></div>`;
  }
  listRows(path, rows, cols, { min = 1, extra = () => '' } = {}) {
    return rows.map((r, i) => `<tr>${cols.map(c => `<td${c.cls ? ` class="${c.cls}"` : ''}>${c.html(r, i, `${path}.${i}`)}</td>`).join('')}<td class="x"><button type="button" class="b-x" data-act="delRow" data-list="${path}" data-i="${i}" aria-label="Remover linha" ${rows.length <= min ? 'disabled' : ''}>×</button></td></tr>${extra(r, i, `${path}.${i}`)}`).join('');
  }

  /* ───────── render ───────── */
  render() {
    const y = window.scrollY;
    const d = this.data;
    this.root.innerHTML = `
      <div class="sheet-bar" id="bar">
        <button class="btn ghost" data-act="back">← Voltar</button>
        <div class="sheet-title"><b>${esc(this.c.nome || 'Nova ficha')}</b>${this.isGM && this.c.owner !== this.user.id ? '<em class="pill gm">Editando como Mestre</em>' : ''}</div>
        <span class="save" id="saveState" role="status">Salvo ✓</span>
        <button class="btn accent" data-act="roll">🎲 Rolar</button>
      </div>
      <nav class="chips" aria-label="Seções">${[['sec-id', 'Identidade'], ['sec-attrs', 'Atributos'], ['sec-rec', 'Recursos'], ['sec-surv', 'Sobrevivência'], ['sec-apt', 'Aptidões'], ['sec-man', 'Manifestações'], ['sec-atk', 'Ataques'], ['sec-eq', 'Equipamentos'], ['sec-pers', 'Personalidade'], ['sec-alma', 'Alma'], ['sec-notas', 'Notas']].map(([h, t]) => `<a href="#" data-act="jump" data-to="${h}">${t}</a>`).join('')}</nav>
      <div class="sheet ${this.c.morto ? 'is-dead' : ''}">
        <div class="col col1">${this.secId()}${this.secAttrs()}${this.secApt()}${this.secDisc()}${this.secRec()}<div class="duo">${this.secPol()}${this.secSurv()}</div>${this.secCond()}</div>
        <div class="col col2">${this.secMan()}${this.secAtk()}<div class="duo">${this.secEquip()}${this.secInv()}</div><div class="duo">${this.secPers()}${this.secRel()}</div>${this.secEvol()}${this.secRaciais()}${this.secVirt()}${this.secRecursos()}<div class="duo">${this.secAlma()}${this.secProg()}</div>${this.secNotas()}${this.secGaleria()}</div>
      </div>`;
    this.refresh(); window.scrollTo(0, y);
  }
  rerender(id, fn) {
    const el = this.$('#' + id); if (!el) return;
    const abertos = [...el.querySelectorAll('details[data-keep][open]')].map(d => d.dataset.keep); // não fecha o que o usuário abriu
    el.outerHTML = fn.call(this);
    abertos.forEach(k => { const d = this.$(`#${id} details[data-keep="${k}"]`); if (d) d.open = true; });
    this.refresh();
  }

  sel(path) {
    const info = R.cascaInfo(this.data);
    const lista = { casca: CASCAS, raca: info.casca?.racas, cultura: info.casca?.culturas, heranca: info.casca?.herancas }[path] || [];
    return lista;
  }
  selOrText(path, label, ph = '') {
    const lista = this.sel(path); const val = this.v(path) ?? '';
    label = this.rotulo(path, label);
    if (lista.length) return this.field(label, `<select class="f" data-b="${path}" data-reset="${path}"><option value="">—</option>${lista.map(o => `<option value="${esc(o.id || o.nome)}" ${(o.id === val || o.nome === val) ? 'selected' : ''}>${esc(o.nome)}</option>`).join('')}</select>`);
    return this.field(label, this.inp(path, { ph }));
  }
  rotulo(path, padrao) { return (path === 'raca' && R.cascaInfo(this.data).casca?.rotuloRaca) || padrao; }

  secId() {
    const foto = this.c.foto ? `<img src="${this.c.foto}" alt="Foto do personagem">` : '<span class="silh" aria-hidden="true"></span>';
    return `<section class="card id-card" id="sec-id">
      <div class="id-grid">
        <button type="button" class="photo" data-act="photo" aria-label="Alterar foto do personagem">${foto}<small>Trocar foto</small></button>
        <div class="id-fields">
          <div class="brand"><b>EDEN</b><span>Ficha do Jogador</span></div>
          ${this.field('Nome', this.inp('c.nome', { ph: 'Nome do personagem' }))}
          ${this.field('Conceito', this.inp('conceito', { ph: 'Quem era antes de chegar a Eden?' }))}
          <div class="row2">${this.selOrText('casca', 'Casca', 'Casca')}${this.selOrText('raca', 'Raça / Povo', 'Raça')}</div>
          <div class="row2">${this.selOrText('cultura', 'Cultura', 'Cultura')}${this.selOrText('heranca', 'Herança', 'Herança')}</div>
          <div class="row4">${this.circuloTxt() != null ? this.field('Círculo', `<input class="f c" data-circ readonly title="Calculado pela Evolução Demoníaca" value="${esc(this.circuloTxt())}">`) : this.field('Círculo', this.inp('circulo', { cls: 'c' }))}${this.field('Nível', this.inp('c.nivel', { type: 'number', cls: 'c', min: 1, max: 99 }))}${this.field('FP', this.inp('fp', { type: 'number', cls: 'c', min: 0 }))}${this.field('Jogador', this.inp('c.jogador'))}</div>
        </div>
      </div>
      <div class="deadbar" id="deadbar"></div>
    </section>`;
  }

  /* ── Atributos / Arquivo ── */
  secAttrs() {
    const toggle = `<button type="button" class="btn ${this.ui.arq ? 'accent' : 'ghost'}" data-act="toggleArq" aria-pressed="${this.ui.arq}">${this.ui.arq ? '◂ Voltar aos atributos' : `Pontos arquivados <span class="count" data-d="arqCount"></span>`}</button>`;
    return this.card('sec-attrs', '✦', 'Atributos', this.ui.arq ? this.arqPanel() : this.attrGrid(), toggle);
  }
  attrGrid() {
    const arq = R.arquivados(this.data);
    return `<div class="attrs">${R.ATTRS.map(a => {
      const n = arq.filter(k => k === a.k).length;
      return `<div class="attr"><label title="${a.n}"><span class="ab">${a.k}</span>${this.inp('attrs.' + a.k, { type: 'number', cls: 'big c', min: 0, max: 10 })}</label><small class="eff" data-eff="${a.k}"></small><div class="arqmini" title="Pontos arquivados em ${a.n}"><span>ARQUIVADO</span><b>${n ? '●'.repeat(n) : '○'}</b></div></div>`;
    }).join('')}</div>
    <p class="hint">Valor normal: 1 a 5 (acima de 5 é sobrenatural). Dados rolados = Atributo + Aptidão; mantidos = Atributo.</p>`;
  }
  arqPanel() {
    const arq = R.arquivados(this.data), lim = R.slotsArquivo(this.c.nivel);
    const slots = Array.from({ length: lim }, (_, i) => arq[i]
      ? `<button type="button" class="slot full ${this.ui.sel === i ? 'sel' : ''}" data-act="slot" data-i="${i}" aria-label="Espaço ${i + 1}: ponto de ${arq[i]}">${arq[i]}</button>`
      : `<div class="slot empty" aria-label="Espaço ${i + 1} vazio">vazio</div>`).join('');
    const sel = this.ui.sel >= 0 && arq[this.ui.sel] ? `<div class="slot-act"><b>${arq[this.ui.sel]}</b>
        <button class="btn accent" data-act="consolidar" data-i="${this.ui.sel}">Consolidar → ${arq[this.ui.sel]} +1</button>
        <button class="btn ghost" data-act="descartar" data-i="${this.ui.sel}">Descartar</button></div>` : '<p class="hint">Toque num ponto arquivado para consolidar ou descartar.</p>';
    const cheio = arq.length >= lim;
    return `<div class="arq" id="arqPanel">
      <div class="arq-head"><strong>Espaços de arquivo — Nível ${this.c.nivel}</strong><span class="pill ${cheio ? 'warn' : ''}">${arq.length} / ${lim}${cheio ? ' · CHEIO' : ''}</span></div>
      <div class="slots" style="--n:${lim}">${slots}</div>${sel}
      <div class="arq-gain"><span>Ganhar ponto (criatura derrotada):</span><div>${R.ATTRS.map(a => `<button type="button" class="btn small" data-act="arqAdd" data-k="${a.k}" ${cheio ? 'disabled' : ''} title="${a.n}">+${a.k}</button>`).join('')}</div></div>
      <p class="arq-msg ${this.ui.err ? 'err' : ''}" role="status" aria-live="polite">${esc(this.ui.msg || (cheio ? 'Todos os espaços deste nível estão ocupados. Consolide ou descarte um ponto para ganhar outro.' : ''))}</p>
      <div class="arq-foot"><button class="btn danger small" data-act="arqPerder" ${arq.length ? '' : 'disabled'}>Perder pontos arquivados (fuga / derrota)</button></div>
      <details class="rule"><summary>Regra</summary><p>Pontos de Atributo são conquistados derrotando criaturas ligadas ao atributo e podem ser <b>arquivados</b>. Limite por nível: <b>1→2 · 2→3 · 3→4 · 4→5 · 5+→6</b> espaços. Pontos arquivados podem ser perdidos ao fugir ou ser derrotado; pontos <b>consolidados</b> não.</p></details>
    </div>`;
  }
  arqDo(fn, ...a) {
    const r = fn(this.data, ...a); this.ui.msg = r.msg; this.ui.err = !r.ok; if (r.ok) { this.ui.sel = -1; this.touch(); }
    this.rerender('sec-attrs', this.secAttrs);
  }

  /* ── Aptidões / Disciplinas ── */
  secApt() {
    const half = Math.ceil(R.APTIDOES.length / 2);
    const col = list => `<div class="aptcol"><div class="th"><span>Aptidão</span><span>Nível</span></div>${list.map(a => `<div class="apt"><button type="button" class="aptname" data-act="rollApt" data-n="${esc(a.n)}" title="Rolar ${a.n} (${a.a})">${a.n}<small>${a.a}</small></button>${this.inp('aptidoes.' + a.n, { type: 'number', cls: 'c sm', min: 0, max: 9 })}</div>`).join('')}</div>`;
    return this.card('sec-apt', '✧', 'Aptidões', `<div class="aptgrid">${col(R.APTIDOES.slice(0, half))}${col(R.APTIDOES.slice(half))}</div><p class="hint">0 sem treino · 1 Iniciante · 2 Competente · 3 Experiente · 4 Especialista · 5 Mestre · 6+ Lendário. Toque no nome para rolar.</p>`);
  }
  secDisc() {
    const rows = this.listRows('disciplinas', this.data.disciplinas, [
      { html: (r, i, p) => this.inp(p + '.nome', { ph: 'Ex.: Corrida' }) },
      { html: (r, i, p) => `<select class="f" data-b="${p}.apt"><option value="">—</option>${R.APTIDOES.map(a => `<option ${r.apt === a.n ? 'selected' : ''}>${a.n}</option>`).join('')}</select>` },
      { cls: 'n', html: (r, i, p) => this.inp(p + '.nivel', { type: 'number', cls: 'c sm', min: 0, max: 5 }) },
      { cls: 'bonus', html: (r) => `<span class="bonus-t">${R.disciplinaBonus(r.nivel).txt}</span>` },
    ], { min: 1 });
    return this.card('sec-disc', '◈', 'Disciplinas', `<table class="tbl"><thead><tr><th>Disciplina</th><th>Aptidão</th><th>Nível</th><th>Bônus</th><th></th></tr></thead><tbody id="tb-disciplinas">${rows}</tbody></table><button class="btn small add" data-act="addRow" data-list="disciplinas">+ Disciplina</button><p class="hint">Cada personagem começa com 2 Disciplinas. Nível 1–2: +1 dado · 3–4: +2 dados · 5: +3 dados ou +1 mantido.</p>`);
  }

  /* ── Recursos principais ── */
  secRec() {
    const res = (k, glyph, nome, extra = '') => `<div class="res res-${k}"><div class="res-h"><i aria-hidden="true">${glyph}</i><b>${nome}</b></div>
      <div class="res-v">${this.inp('rec.' + k, { type: 'number', cls: 'c big', min: 0 })}<span>/</span><b data-d="${k}Max"></b></div><div class="bar"><i data-bar="${k}"></i></div><small class="res-s" data-d="${k}Sub"></small></div>`;
    const box = (l, d, extra = '') => `<div class="stat"><span>${l}</span><b data-d="${d}"></b>${extra}</div>`;
    return this.card('sec-rec', '♥', 'Recursos Principais', `
      <div class="ress">${res('pv', '♥', 'PV')}${res('pa', 'ϟ', 'PA')}${res('pm', '♨', 'PM')}</div>
      <div class="stats">${box('Evasão', 'evasao')}${box('Defesa', 'defesa')}
        <button type="button" class="stat btn-stat" data-act="rollPool" data-k="resF"><span>Res. Física</span><b data-d="resF"></b><em>🎲</em></button>
        <button type="button" class="stat btn-stat" data-act="rollPool" data-k="resM"><span>Res. Mental</span><b data-d="resM"></b><em>🎲</em></button>
        <button type="button" class="stat btn-stat" data-act="rollPool" data-k="ini"><span>Iniciativa</span><b data-d="ini"></b><em>🎲</em></button>
        ${box('Perc. passiva', 'pp')}</div>
      <div class="senses">${[['visao', 'Visão'], ['audicao', 'Audição'], ['olfato', 'Olfato']].map(([k, n]) => this.field(n, this.inp('rec.' + k, { type: 'number', cls: 'c sm', min: 0, max: 9 }) + `<small class="hint eff" data-sent="${k}"></small>`)).join('')}</div>
      <div class="wound" id="woundBox"></div>
      <details class="mods"><summary>Modificadores manuais (equipamento, manifestações, etc.)</summary><div class="modgrid">${[['modPv', 'PV'], ['modPa', 'PA'], ['modPm', 'PM'], ['modEvasao', 'Evasão'], ['modDefesa', 'Defesa'], ['modResFis', 'Res. Fís. (dados)'], ['modResMen', 'Res. Men. (dados)'], ['modIni', 'Iniciativa (dados)']].map(([k, n]) => this.field(n, this.inp('rec.' + k, { type: 'number', cls: 'c sm' }))).join('')}</div></details>`);
  }

  /* ── Polaridades ── */
  secPol() {
    const rows = POLS.map(([k, sym, nome]) => `<div class="pol pol-${k}"><span class="polh" title="${nome}"><i>${sym}</i> ${nome}</span><div class="sq" role="group" aria-label="Polaridade ${nome}">${Array.from({ length: 10 }, (_, i) => `<button type="button" class="sqb ${this.data.pol[k] > i ? 'on' : ''}" data-act="polSet" data-k="${k}" data-n="${i + 1}" aria-label="${nome} ${i + 1}" aria-pressed="${this.data.pol[k] > i}">${sym}</button>`).join('')}</div><b class="polv">${this.data.pol[k]}<small>/10</small></b></div>`).join('');
    return this.card('sec-pol', '⚖', 'Polaridades', `${rows}
      <div class="polspend"><select class="f" id="polT"><option value="pos">Gastar +</option><option value="neg">Gastar −</option><option value="neu">Gastar n</option></select><input class="f c sm" id="polQ" type="number" min="1" max="10" value="1" aria-label="Quantidade"><button class="btn small" data-act="polGastar">Gastar</button></div>
      <p class="hint" id="polMsg">Gastar + gera − na mesma quantidade (e vice-versa). Neutra não converte. Máx. 10 de cada.</p>`);
  }

  /* ── Sobrevivência ── */
  secSurv() {
    const dd = R.derivar(this.data, this.c.nivel);
    const s = this.data.surv;
    const row = (k, glyph, nome, max, lim) => `<div class="sv"><i aria-hidden="true">${glyph}</i><div class="svn"><b>${nome}</b><small data-d="${k}Est"></small></div>${this.step('surv.' + k, nome, { min: 0, max: max })}<span class="svm">/ ${lim ?? max}</span></div>`;
    const psi = (s.condPsi || []).map((c, i) => `<div class="psi"><span class="pill warn">Condição psicológica</span>${this.inp(`surv.condPsi.${i}.nome`, { ph: 'Ansiedade, fobia, paranoia…' })}<button class="b-x" data-act="delPsi" data-i="${i}" aria-label="Remover">×</button></div>`).join('');
    return this.card('sec-surv', '☣', 'Sobrevivência', `${row('fome', '🍖', 'Fome', dd.fomeMax)}${row('sede', '💧', 'Sede', dd.sedeMax)}${row('fadiga', '☾', 'Fadiga', 5)}
      <div class="sv"><i aria-hidden="true">☠</i><div class="svn"><b>Insanidade</b><small data-d="insanEst"></small></div>${this.step('surv.insan', 'Insanidade', { min: 0, max: 99 })}<span class="svm">/ <b data-d="insanLim"></b></span></div>
      ${psi}<p class="hint">Ao alcançar o limite de Insanidade você ganha uma Condição Psicológica e o limite sobe em 5. Fome e Sede começam em 0.</p>`);
  }
  secCond() {
    const c = this.data.cond;
    return this.card('sec-cond', '⚑', 'Condições', `<div class="conds">${R.CONDICOES.map(x => `<label class="cb"><input type="checkbox" data-b="cond.${x.k}" ${c[x.k] ? 'checked' : ''}><span>${x.n}</span></label>`).join('')}<label class="cb outro"><span>Outro:</span>${this.inp('condOutro')}</label></div>
      <div class="pen" id="penBox"></div>`);
  }

  /* ── Página 2 ── */
  secMan() {
    const rows = this.listRows('manifest', this.data.manifest, [
      { cls: 'n', html: (r, i) => `<span class="idx">${i + 1}</span>` },
      { html: (r, i, p) => this.inp(p + '.nome', { ph: 'Nome da manifestação' }) },
      { cls: 'pols', html: (r, i) => POLS.map(([k, sym, nome]) => `<button type="button" class="pdot pdot-${k} ${r.pol === k ? 'on' : ''}" data-act="manPol" data-i="${i}" data-k="${k}" aria-pressed="${r.pol === k}" title="${nome}">${sym}</button>`).join('') },
      { cls: 'n', html: (r, i, p) => this.inp(p + '.pa', { cls: 'c sm' }) },
      { cls: 'n', html: (r, i, p) => this.inp(p + '.carga', { cls: 'c sm' }) },
    ], { min: 1, extra: (r, i, p) => `<tr class="sub"><td></td><td colspan="5"><details ${r.efeito ? 'open' : ''}><summary>efeito / notas</summary>${this.area(p + '.efeito', 2, 'Alcance, área, duração, efeito, sobrecarga…')}</details></td><td></td></tr>` });
    return this.card('sec-man', '☬', 'Manifestações', `<table class="tbl man"><thead><tr><th>#</th><th>Nome</th><th class="pols-h"><span title="Negativa">−</span><span title="Neutra">n</span><span title="Positiva">+</span></th><th>PA</th><th>Carga</th><th></th></tr></thead><tbody>${rows}</tbody></table><button class="btn small add" data-act="addRow" data-list="manifest">+ Manifestação (Slot adicional)</button>`, '<small class="tag">O que você manifesta, te manifesta.</small>');
  }
  secAtk() {
    const rows = this.listRows('ataques', this.data.ataques, [
      { html: (r, i, p) => this.inp(p + '.nome', { ph: 'Ataque / ação' }) },
      { html: (r, i, p) => `<div class="teste">${this.inp(p + '.teste', { ph: 'FOR+Luta' })}${R.parseTeste(r.teste) ? `<button type="button" class="b-ico" data-act="rollAtk" data-i="${i}" title="Rolar teste">🎲</button>` : ''}</div>` },
      { html: (r, i, p) => this.inp(p + '.dano', { ph: '1d10…' }) }, { cls: 'n', html: (r, i, p) => this.inp(p + '.pa', { cls: 'c sm' }) }, { html: (r, i, p) => this.inp(p + '.alcance') },
    ], { min: 1 });
    return this.card('sec-atk', '⚔', 'Ataques e Ações', `<table class="tbl atk"><thead><tr><th>Ataque / Ação</th><th>Teste</th><th>Dano</th><th>PA</th><th>Alcance</th><th></th></tr></thead><tbody>${rows}</tbody></table><button class="btn small add" data-act="addRow" data-list="ataques">+ Ataque</button><p class="hint">Escreva o teste como <b>FOR+Luta</b> (Atributo+Aptidão) para ganhar o botão de rolagem.</p>`);
  }
  secEquip() {
    const e = this.data.equip;
    const armas = e.armas.map((a, i) => `<div class="eqrow">${this.inp(`equip.armas.${i}.nome`, { ph: 'Arma' })}<button class="b-x" data-act="delRow" data-list="equip.armas" data-i="${i}" ${e.armas.length <= 1 ? 'disabled' : ''} aria-label="Remover arma">×</button></div>`).join('');
    return this.card('sec-eq', '🛡', 'Equipamentos', `
      <div class="eqrow lbl"><b>Armadura</b>${this.inp('equip.armadura.nome', { ph: 'Nome' })}${this.field('Def.', this.inp('equip.armadura.defesa', { type: 'number', cls: 'c sm', min: 0 }), 'mini')}</div>
      <div class="eqrow lbl"><b>Escudo</b>${this.inp('equip.escudo.nome', { ph: 'Nome' })}${this.field('Def.', this.inp('equip.escudo.defesa', { type: 'number', cls: 'c sm', min: 0 }), 'mini')}</div>
      <div class="eqlist"><b>Armas</b>${armas}<button class="btn small add" data-act="addRow" data-list="equip.armas">+ Arma</button></div>
      <label class="fld"><span>Ferramentas</span>${this.area('equip.ferramentas', 2)}</label>`);
  }
  secInv() {
    const rows = this.listRows('inventario', this.data.inventario, [{ html: (r, i, p) => this.inp(p + '.item', { ph: 'Item' }) }, { cls: 'n', html: (r, i, p) => this.inp(p + '.qtd', { cls: 'c sm' }) }], { min: 1 });
    return this.card('sec-inv', '🎒', 'Inventário', `<table class="tbl"><thead><tr><th>Item</th><th>Qtd.</th><th></th></tr></thead><tbody>${rows}</tbody></table><button class="btn small add" data-act="addRow" data-list="inventario">+ Item</button>`);
  }
  secPers() {
    return this.card('sec-pers', '☺', 'Personalidade', `${[['personalidade', 'Personalidade'], ['desejo', 'Desejo'], ['medo', 'Medo'], ['valor', 'Valor'], ['defeito', 'Defeito']].map(([k, n]) => this.field(n, this.inp('pers.' + k))).join('')}
      <details><summary>História, aparência e motivação</summary>${this.field('História', this.area('pers.historia', 4))}${this.field('Aparência', this.area('pers.aparencia', 3, 'Idade, altura, marcas, cicatrizes, traços da Casca…'))}${this.field('Motivação', this.area('pers.motivacao', 2))}</details>`);
  }
  secRel() {
    const rows = this.listRows('relacoes', this.data.relacoes, [{ html: (r, i, p) => this.inp(p + '.pessoa', { ph: 'Pessoa / Grupo' }) }, { html: (r, i, p) => this.inp(p + '.relacao', { ph: 'Relação' }) }], { min: 1 });
    return this.card('sec-rel', '☻', 'Relações', `<table class="tbl"><thead><tr><th>Pessoa / Grupo</th><th>Relação</th><th></th></tr></thead><tbody>${rows}</tbody></table><button class="btn small add" data-act="addRow" data-list="relacoes">+ Relação</button>`);
  }
  secRaciais() {
    const info = R.cascaInfo(this.data);
    const ffe = !!this.data.virt?.faltaDeFe;
    const carac = info.caracteristicas.map(c => this.traitHTML(c, { ffe })).join('');
    const evo = info.evolucoes.map(e => `<article class="trait"><header><b>${esc(e.nome)}</b><span class="pill">evolução</span></header><p>${esc(e.efeito || e.descricao || '')}</p></article>`).join('');
    const vazio = !info.casca ? 'Escolha uma Casca para ver as Características Raciais.' : (!carac && !evo) ? `Nenhuma característica cadastrada para ${esc(info.casca.nome)} ainda. Elas são lidas de <code>js/data/cascas.js</code>.` : '';
    return this.card('sec-rac', '❖', 'Características Raciais', `${carac}${evo}${vazio ? `<p class="hint">${vazio}</p>` : ''}${this.field('Evoluções raciais adquiridas', this.area('evolucoesAdquiridas', 2))}`);
  }
  secEvol() {
    const info = R.cascaInfo(this.data), casca = info.casca, sis = casca?.sistema;
    if (sis?.tipo !== 'circulos') return '<section id="sec-evol" hidden></section>';
    const e = this.data.evol, circ = R.circulosDe(casca), alc = circ.find(c => c.id === e.circulo), forma = info.forma, pa = Number(this.data.rec.pa) || 0;
    const lim = casca.limbo;
    const estado = forma ? `<b>${forma.n}º Círculo — ${esc(forma.nome)}</b> <span class="pill gm">forma ativa</span> · restam <b>${e.horas} h</b> de ${sis.duracaoH}` : `<b>1º Círculo — ${lim.nome}</b> <span class="pill">forma base</span>`;
    let ctrl;
    if (!alc) ctrl = `<div class="evol-pick"><label class="fld"><span>Círculo alcançado (evolução)</span><select class="f" id="evSel"><option value="">— escolha —</option>${circ.map(c => `<option value="${c.id}" ${c.pendente ? 'disabled' : ''}>${c.n}º ${esc(c.nome)} — ${esc(c.pecado)}${c.pendente ? ' (dados pendentes)' : ''}</option>`).join('')}</select></label><button class="btn accent" data-act="evolConfirmar">Confirmar evolução</button></div><p class="hint">Ao alcançar um tipo de evolução você fica <b>preso</b> a ele: nunca poderá assumir outra forma.</p>`;
    else ctrl = `<p class="evol-lock">Evoluído para o <b>${alc.n}º Círculo — ${esc(alc.nome)}</b> (${esc(alc.pecado)}). <span class="pill danger">preso a esta forma</span> ${this.isGM ? '<button class="btn small danger" data-act="evolLiberar">Liberar (Mestre)</button>' : ''}</p>
      <div class="evol-act">${forma ? `<button class="btn" data-act="evolHoras" data-h="1">−1 h</button><button class="btn" data-act="evolHoras" data-h="3">−3 h</button><button class="btn" data-act="evolHoras" data-h="6">−6 h</button><button class="btn danger" data-act="evolEncerrar">Encerrar forma</button>` : `<button class="btn accent" data-act="evolAssumir" ${pa >= sis.custoPA ? '' : 'disabled'}>Assumir a forma — ${sis.custoPA} PA</button>${pa >= sis.custoPA ? '' : `<small class="hint">PA insuficiente (${pa}/${sis.custoPA})</small>`}`}</div>
      <p class="hint">A forma dura ${sis.duracaoH} h (marque o tempo de jogo com os botões); depois volta ao Limbo e custa ${sis.custoPA} PA para assumir de novo. Ao assumir, atributos, PV base e características do Limbo são substituídos pelos do Círculo.</p>`;
    const reset = `<div class="uses-reset"><button class="btn small" data-act="evolRotacao">Nova rotação Dia↔Noite</button><button class="btn small" data-act="evolReset" data-por="combate">Fim do combate</button><button class="btn small" data-act="evolReset" data-por="sessão">Nova sessão</button></div>`;
    let esp = '';
    if (alc) {
      const campos = (alc.campos || []).map(c => this.field(c.rotulo, c.area ? this.area('evol.campos.' + c.k, 3) : this.inp('evol.campos.' + c.k, { ph: c.ph || '' }))).join('');
      const esc9 = alc.escolhaAttr ? this.field(`Atributo +${alc.escolhaAttr.valor}`, `<select class="f" data-b="evol.escolhaAttr">${alc.escolhaAttr.opcoes.map(k => `<option value="${k}" ${e.escolhaAttr === k ? 'selected' : ''}>${R.ATTRS.find(a => a.k === k).n} (${k})</option>`).join('')}</select>`) : '';
      const conf = alc.regra === 'confronto' ? `<label class="cb"><input type="checkbox" data-b="evol.confronto" ${e.confronto ? 'checked' : ''}><span>Participou de confronto desde a última rotação</span></label><p class="hint">Fúria: <b>+${Math.min(2, e.furia)} Força</b> (${e.furia}/2) · Dependência: <b>−${2 * Math.min(4, e.dep)} Força</b> (${e.dep}/4). Aplicado ao apertar “Nova rotação”, só com a forma ativa.</p>` : '';
      let goat = '';
      if (alc.regra === 'goat') {
        const g = e.goat, vs = alc.linhagens, ln = vs.find(v => v.id === e.linhagem);
        goat = `<h3 class="sub">Goat Form</h3><label class="cb"><input type="checkbox" data-b="evol.goat.ativa" ${g.ativa ? 'checked' : ''}><span>Goat Form ativa</span></label>
          <div class="row2"><label class="fld"><span>Via</span><select class="f" data-b="evol.goat.via"><option value="">—</option><option value="conquista" ${g.via === 'conquista' ? 'selected' : ''}>Conquista</option><option value="derrota" ${g.via === 'derrota' ? 'selected' : ''}>Derrota</option></select></label>
          <label class="fld"><span>Vala (tipo de ${g.via === 'derrota' ? 'derrota' : 'conquista'})</span><select class="f" data-b="evol.goat.vala"><option value="">—</option>${vs.map(v => `<option value="${v.id}" ${g.vala === v.id ? 'selected' : ''}>${v.n}. ${esc(v.vala)}</option>`).join('')}</select></label></div>
          <p class="hint">Exige queda brusca de Polaridade para −6. ${g.ativa && g.via === 'conquista' ? '<b>Olhos Hipnóticos ativos</b> (Carisma +2 dados cara a cara).' : ''} ${g.ativa && g.via === 'derrota' ? '<b class="err">Descontrolado:</b> procura meios físicos de convencer.' : ''} ${g.semFala ? '<b class="err">Corpo Morto: não pode falar nem conjurar.</b>' : ''}</p>
          <label class="fld"><span>Linhagem de cabra (aparência)</span><select class="f" data-b="evol.linhagem"><option value="">—</option>${vs.map(v => `<option value="${v.id}" ${e.linhagem === v.id ? 'selected' : ''}>${v.n}. ${esc(v.linhagem)}</option>`).join('')}</select></label>
          ${ln ? `<article class="trait"><header><b>${esc(ln.linhagem)}</b><span class="pill">${ln.n}ª vala — ${esc(ln.vala)}</span></header><p>${esc(ln.aparencia)}</p><p class="hint"><b>Pecado:</b> ${esc(ln.pecado)}. <b>Punição:</b> ${esc(ln.punicao)}</p></article>` : ''}
          <details><summary>As dez linhagens de cabras de Malebolge</summary>${vs.map(v => `<article class="trait"><header><b>${v.n}. ${esc(v.linhagem)}</b><span class="pill">${esc(v.vala)}</span></header><p>${esc(v.aparencia)}</p><p class="hint"><b>Punição:</b> ${esc(v.punicao)}</p></article>`).join('')}</details>`;
      }
      const dr = e.draco || {};
      const draco = alc.regra === 'draco' ? `<h3 class="sub">Draco Form</h3><label class="cb"><input type="checkbox" data-b="evol.draco.ativa" ${dr.ativa ? 'checked' : ''}><span>Draco Form ativa (Ira despertada)</span></label>
        <p class="hint">${dr.ponto ? '<b class="err">Ponto de Ira ativo:</b> todas as habilidades da forma liberadas, Sopro de Fogo +3 de dano (2d8+3), alvo Flanqueado, aliados que interferirem viram inimigos.' : dr.ativa ? 'Ira normal: use <b>apenas UMA</b> habilidade da Draco Form nesta transformação.' : 'O Ponto de Ira exige PV na metade ou menos.'}</p>` : '';
      const prev = !forma ? `<details><summary>Habilidades do ${alc.n}º Círculo (forma inativa)</summary>${alc.caracteristicas.map(c => this.traitHTML(c, { preview: true })).join('')}</details>` : '';
      esp = `${esc9}${campos}${conf}${goat}${draco}${prev}<details><summary>Aparência e origem — ${alc.n}º Círculo</summary><p>${esc(alc.resumo)}</p><p><b>Aparência:</b> ${esc(alc.aparencia)}</p>${alc.origem ? `<p class="hint"><b>Origem (Dante):</b> ${esc(alc.origem)}</p>` : ''}</details>`;
    }
    const visao = `<details class="virt"><summary><b>Os Círculos do Inferno</b></summary>${circ.map(c => `<p class="hint"><b>${c.n}º ${esc(c.nome)} — ${esc(c.pecado)}${c.pendente ? ' (dados pendentes)' : ''}.</b> ${esc(c.resumo)}</p>`).join('')}<p class="hint"><b>1º Limbo.</b> ${esc(lim.resumo)}</p><p class="hint">${esc(casca.aparenciaCorpos)}</p><p class="hint">${esc(sis.identidade)}</p></details>`;
    return `<section class="card" id="sec-evol"><header class="card-h"><i class="hex" aria-hidden="true">♆</i><h2>${esc(sis.rotulo)}</h2></header>
      <p class="hint" style="margin-top:0">${esc(sis.intro)}</p><p class="evol-state">${estado}</p>${ctrl}${reset}${esp}${visao}</section>`;
  }
  findPoder(id) { return R.todosPoderes(R.cascaInfo(this.data).casca).find(p => p.id === id) || null; }
  traitHTML(c, { ffe = false, preview = false } = {}) {
    const bloq = ffe && !c.negativa, usados = Number(this.data.virt?.usos?.[c.id]) || 0;
    const camp = [['alcance', 'Alcance'], ['duracao', 'Duração'], ['dano', 'Dano'], ['tipo_dano', 'Tipo'], ['evasiva', 'Evasiva'], ['capacidade', 'Capacidade'], ['custoPol', 'Custo (Polaridade)'], ['efeito', 'Efeito'], ['critico', 'Crítico'], ['limitacoes', 'Limitações'], ['condicoes', 'Condições']];
    const pa = c.pa != null ? `<span class="pill" ${c.paSugerido ? 'title="PA sugerido — confirme com o livro/Mestre"' : ''}>${c.pa} PA${c.paSugerido ? '*' : ''}${c.paNota ? ' · ' + esc(c.paNota) : ''}</span>` : '';
    const gasto = !preview && c.tipo === 'ativa' && c.pa > 0 ? `<button class="btn small" data-act="gastarPA" data-id="${c.id}" ${bloq ? 'disabled' : ''} title="Desconta ${c.pa} PA do seu total">Gastar ${c.pa} PA</button>` : '';
    const uso = !preview && c.usos ? `<div class="uses"><span>${esc(c.usosRotulo || 'Usos')} (por ${c.usos.por}): <b>${usados}/${c.usos.max}</b></span><button class="btn small" data-act="${c.acao || 'virtUsar'}" data-id="${c.id}" ${usados < c.usos.max && !bloq ? '' : 'disabled'}>${c.acao ? 'Ativar' : 'Usar'}</button></div>` : '';
    return `<article class="trait ${c.negativa ? 'neg' : ''} ${bloq ? 'blocked' : ''}"><header><b>${esc(c.nome)}</b><span class="pill">${esc(c.tipo || 'passiva')}</span>${pa}${c.negativa ? '<span class="pill danger">ponto negativo</span>' : ''}${bloq ? '<span class="pill danger">bloqueada: Falta de Fé</span>' : ''}${c.origem ? `<small>${esc(c.origem)}: ${esc(c.de)}</small>` : ''}</header>
      <dl>${camp.filter(([k]) => c[k]).map(([k, n]) => `<div><dt>${n}</dt><dd>${esc(c[k])}</dd></div>`).join('')}</dl>${c.nota ? `<p class="hint">${esc(c.nota)}</p>` : ''}${gasto ? `<div class="uses">${gasto}</div>` : ''}${uso}</article>`;
  }
  secVirt() {
    const casca = R.cascaInfo(this.data).casca, sis = casca?.sistema;
    if (!sis || sis.tipo !== 'virtudes') return '<section id="sec-virt" hidden></section>';
    const v = this.data.virt, n = R.virtudesRepresentadas(this.data), pb = R.polaridadeBonus(this.data.rec.pv, R.derivar(this.data, this.c.nivel).pvMax);
    const poder = (vt, p) => {
      const av = R.poderDisponivel(this.data, vt.id, p), usados = Number(v.usos?.[p.id]) || 0;
      const custo = [p.pa != null ? `${p.pa} PA${p.paSugerido ? '*' : ''}${p.paNota ? ' (' + esc(p.paNota) + ')' : ''}` : '', p.custoPv ? `−${p.custoPv} PV` : '', p.custoPol ? `Pol. ${esc(p.custoPol)}` : ''].filter(Boolean).join(' · ');
      return `<article class="trait vpow ${av.ok ? '' : 'blocked'}"><header><b>${esc(p.nome)}</b><span class="pill">${esc(p.tipo)}</span><span class="pill">${custo}</span>${p.protegida ? '<span class="pill" title="Não é retirada pela Falta de Fé">🛡 fé</span>' : ''}${av.ok ? '' : `<span class="pill danger">${av.motivo}</span>`}</header><p>${esc(p.efeito)}</p>
        ${p.tipo === 'ativa' && p.pa > 0 ? `<div class="uses"><button class="btn small" data-act="gastarPA" data-id="${p.id}">Gastar ${p.pa} PA</button></div>` : ''}${p.usos ? `<div class="uses"><span>Usos por ${p.usos.por}: <b>${usados}/${p.usos.max}</b></span><button class="btn small" data-act="virtUsar" data-id="${p.id}" ${av.ok && usados < p.usos.max ? '' : 'disabled'}>Usar</button></div>` : ''}</article>`;
    };
    const lista = sis.virtudes.map(vt => `<details class="virt ${v.rep[vt.id] ? 'on' : ''}" data-keep="${vt.id}"><summary><label class="cb" onclick="event.stopPropagation()"><input type="checkbox" data-b="virt.rep.${vt.id}" ${v.rep[vt.id] ? 'checked' : ''}><span><b>${vt.nome}</b>${vt.polaridade ? ` <small>Polaridade ${vt.polaridade}</small>` : ''}</span></label></summary>
        <p class="hint">${esc(vt.sobre)}</p>${vt.extra ? `<p class="hint">${esc(vt.extra)}</p>` : ''}${vt.poderes.map(p => poder(vt, p)).join('')}</details>`).join('');
    const menores = this.listRows('virt.menores', v.menores, [
      { html: (r, i, p) => this.inp(p + '.nome', { ph: 'Virtude Menor' }) },
      { cls: 'n', html: () => `<span class="pill">Rank ${n}</span>` },
      { cls: 'n', html: (r, i, p) => this.inp(p + '.versiculos', { type: 'number', cls: 'c sm', min: 0 }) },
    ], { min: 1 });
    return `<section class="card" id="sec-virt"><header class="card-h"><i class="hex" aria-hidden="true">☼</i><h2>${esc(sis.rotulo || 'Virtudes')}</h2><span class="pill">${n} representada(s)</span></header>
      <p class="hint" style="margin-top:0">${esc(sis.intro || '')}</p>
      <div class="virt-top">
        <div class="stat"><span>Polaridade Bônus</span><b data-d="pbVal">${pb.valor}</b><small class="hint" data-d="pbSub">${pb.ativa ? 'ativa (PV < 1/4)' : 'inativa (PV ≥ 1/4)'}</small></div>
        <label class="cb dead"><input type="checkbox" data-b="virt.faltaDeFe" ${v.faltaDeFe ? 'checked' : ''}><span>Falta de Fé</span></label>
        <div class="uses-reset"><button class="btn small" data-act="virtReset" data-por="rotação">Nova rotação Dia↔Noite</button><button class="btn small" data-act="virtReset" data-por="sessão">Nova sessão</button></div>
      </div>
      ${v.faltaDeFe ? '<p class="form-err">Conexão divina perdida: nenhuma habilidade do Anjo pode ser usada, e as Virtudes sem proteção (🛡) estão perdidas.</p>' : ''}
      ${lista}
      <h3 class="sub">Bênção ou Maldição / habilidade original</h3>
      <div class="row2"><label class="fld"><span>Tipo</span><select class="f" data-b="virt.bm.tipo"><option ${v.bm.tipo === 'Bênção' ? 'selected' : ''}>Bênção</option><option ${v.bm.tipo === 'Maldição' ? 'selected' : ''}>Maldição</option></select></label>${this.field('Nome', this.inp('virt.bm.nome'))}</div>
      ${this.field('Efeito', this.area('virt.bm.efeito', 2))}${this.field('Habilidade original ou criada', this.inp('virt.original'))}
      <h3 class="sub">Virtudes Menores e Versículos</h3>
      <table class="tbl"><thead><tr><th>Virtude Menor</th><th>Rank</th><th>Versículos</th><th></th></tr></thead><tbody>${menores}</tbody></table><button class="btn small add" data-act="addRow" data-list="virt.menores">+ Virtude Menor</button>
      <p class="hint">Rank = quantidade de Virtudes representadas. Poder = Versículos dominados. PA marcado com * é sugestão (o texto original não trazia custo em PA).</p></section>`;
  }
  secRecursos() {
    return this.card('sec-recs', '◎', 'Recursos', `<div class="grid2">${[['dinheiro', 'Dinheiro'], ['jcoin', 'JCoin'], ['materiais', 'Materiais'], ['consumiveis', 'Consumíveis'], ['raros', 'Itens raros']].map(([k, n]) => this.field(n, this.inp('recursos.' + k))).join('')}</div>`);
  }
  secAlma() {
    return this.card('sec-alma', '◉', 'Alma', `
      <label class="cb dead"><input type="checkbox" data-b="c.morto" ${this.c.morto ? 'checked' : ''}><span>Personagem morto</span></label>
      ${this.field('Data da morte', `<input class="f" type="datetime-local" data-b="c.data_morte" value="${esc(toLocalInput(this.c.data_morte))}">`)}
      <div class="alma-t"><span>Tempo restante</span><b data-d="almaTxt">—</b><span>/ 48h</span></div>
      ${this.field('Estado', this.inp('alma.estado'))}${this.field('Arma de Alma', this.inp('alma.arma'))}`);
  }
  secProg() {
    return this.card('sec-prog', '⇧', 'Progressão', `<div class="row2">${this.field('Nível', this.inp('c.nivel', { type: 'number', cls: 'c', min: 1, max: 99 }))}${this.field('FP', this.inp('fp', { type: 'number', cls: 'c', min: 0 }))}</div>
      <p class="hint">Espaços de arquivo neste nível: <b data-d="slots"></b>.</p>${this.field('Melhorias adquiridas', this.area('melhorias', 4))}`);
  }
  secNotas() { return this.card('sec-notas', '✎', 'Anotações', this.area('notas', 8, 'Anotações da campanha…'), '<small class="tag">A luz também é uma escolha.</small>'); }
  secGaleria() {
    const g = this.c.galeria || [];
    return this.card('sec-gal', '▣', 'Galeria', `<div class="gal">${g.map((src, i) => `<figure><img src="${src}" alt="Foto ${i + 1}" data-act="viewImg" data-i="${i}"><button class="b-x" data-act="delImg" data-i="${i}" aria-label="Remover foto">×</button></figure>`).join('')}${g.length < 8 ? '<button type="button" class="gal-add" data-act="addImg"><span>＋</span>Adicionar foto</button>' : ''}</div><p class="hint">Até 8 fotos (reduzidas automaticamente).</p>`);
  }

  /* ───────── cálculo automático e atualização da tela ───────── */
  refresh() {
    const data = this.data;
    const d = this.d = R.derivar(data, this.c.nivel);
    R.sincronizarRecursos(data, d);
    const pool = p => `${p.rolled}d · mantém ${p.kept}`;
    const map = {
      pvMax: d.pvMax, paMax: d.paEf === d.paMax ? d.paMax : `${d.paEf}`, pmMax: d.pmEf === d.pmMax ? d.pmMax : `${d.pmEf}`,
      evasao: d.evasao, defesa: d.defesa, resF: pool(d.resFisica), resM: pool(d.resMental), ini: pool(d.ini), pp: d.percPassiva,
      pvSub: d.wound.txt, paSub: d.paEf !== d.paMax ? `base ${d.paMax} · penalidades ${d.paEf - d.paMax}` : `base ${d.paMax}`, pmSub: d.pmEf !== d.pmMax ? `base ${d.pmMax} · penalidades` : `base ${d.pmMax}`,
      fomeEst: `${d.fome.est} — ${d.fome.txt}`, sedeEst: `${d.sede.est} — ${d.sede.txt}`, fadigaEst: d.fad.txt,
      pbVal: R.polaridadeBonus(data.rec.pv, d.pvMax).valor, pbSub: R.polaridadeBonus(data.rec.pv, d.pvMax).ativa ? 'ativa (PV < 1/4)' : 'inativa (PV ≥ 1/4)',
      insanLim: data.surv.insanLim, insanEst: `${data.surv.insan} de ${data.surv.insanLim}`, slots: d.slots, arqCount: `${d.usados}/${d.slots}`,
    };
    this.$$('[data-d]').forEach(el => { const k = el.dataset.d; if (k in map) el.textContent = map[k]; });
    for (const k of ['pv', 'pa', 'pm']) {
      const inp = this.$(`[data-b="rec.${k}"]`); if (inp && document.activeElement !== inp) inp.value = data.rec[k];
      const max = { pv: d.pvMax, pa: d.paEf, pm: d.pmEf }[k], bar = this.$(`[data-bar="${k}"]`);
      if (bar) { const p = max ? Math.min(100, (data.rec[k] / max) * 100) : 0; bar.style.width = p + '%'; bar.dataset.low = p <= 25 ? '1' : p <= 50 ? '2' : '0'; }
    }
    this.$$('[data-sent]').forEach(el => { const m = d.info.mods.sentidos[el.dataset.sent] || 0; el.textContent = m ? `${m > 0 ? '+' : ''}${m} = ${d.sent[el.dataset.sent]}` : ''; });
    const ba = this.$('[data-act=evolAssumir]'); if (ba) ba.disabled = (Number(this.data.rec.pa) || 0) < 4;
    const ci = this.$('[data-circ]'); if (ci) ci.value = this.circuloTxt() ?? '';
    this.$$('[data-eff]').forEach(el => { const m = d.info.mods.attrs[el.dataset.eff] || 0; el.textContent = m ? `${m > 0 ? '+' : ''}${m} racial = ${d.a[el.dataset.eff]}` : ''; });
    const wb = this.$('#woundBox'); if (wb) wb.innerHTML = `<b>Estado físico:</b> <span class="w w${d.wound.tier}">${d.wound.txt}</span>${d.morrendo ? ' <span class="pill danger">Morrendo — Mesa de Aposta</span>' : ''}`;
    const pb = this.$('#penBox');
    if (pb) pb.innerHTML = d.fontes.length ? `<b>Penalidades ativas (automático)</b><ul>${d.fontes.map(f => `<li><span>${esc(f.nome)}</span>${[f.dados && `${f.dados} dados`, f.mant && `${f.mant} mantidos`, f.pa && `${f.pa} PA`, f.pm && `${f.pm} PM`, f.pmZero && 'PM = 0'].filter(Boolean).join(' · ')}</li>`).join('')}</ul><div class="pen-t">Total: <b>${d.tot.dados} dados</b> · <b>${d.tot.mant} mantidos</b> · <b>PA ${d.paEf}</b> · <b>PM ${d.pmEf}</b></div>` : '<small class="hint">Nenhuma penalidade ativa.</small>';
    this.refreshDead(); this.refreshAlma();
  }
  refreshDead() {
    const b = this.$('#deadbar'); if (!b) return;
    b.innerHTML = this.c.morto ? `☠ Morto${this.c.data_morte ? ' em ' + fmtData(this.c.data_morte) : ''}` : '';
    b.hidden = !this.c.morto; this.$('.sheet')?.classList.toggle('is-dead', !!this.c.morto);
  }
  refreshAlma() {
    const el = this.$('[data-d="almaTxt"]'); if (!el) return; const a = R.almaRestante(this.c.data_morte);
    el.textContent = a ? a.txt : '—'; el.classList.toggle('exp', !!a?.expirada);
  }

  /* ───────── eventos ───────── */
  onInput(e) {
    const t = e.target, b = t.dataset?.b; if (!b || t.type === 'checkbox' || t.tagName === 'SELECT') return;
    if (t.type === 'datetime-local') return;
    let v = t.value; if (t.type === 'number') v = v === '' ? '' : Number(v);
    this.assign(b, v, t, false);
  }
  onChange(e) {
    const t = e.target, b = t.dataset?.b; if (!b) return;
    if (t.type === 'checkbox') return this.assign(b, t.checked, t, true);
    if (t.type === 'datetime-local') { const iso = t.value ? new Date(t.value).toISOString() : null; this.assign(b, iso, t, true); if (iso && !this.c.morto) { this.c.morto = true; } this.refreshDead(); this.refreshAlma(); return this.render(); }
    if (t.tagName === 'SELECT' && t.dataset.reset) { this._polAnt = R.polDe(R.cascaInfo(this.data)); return this.assign(b, t.value, t, true); }
    if (t.type === 'number') { let v = Number(t.value || 0); const mn = t.dataset.min, mx = t.dataset.max; if (mn != null && mn !== '') v = Math.max(Number(mn), v); if (mx != null && mx !== '') v = Math.min(Number(mx), v); t.value = v; this.assign(b, v, t, true); return; }
    if (t.tagName === 'SELECT') this.assign(b, t.value, t, true);
  }
  assign(path, v, src, structural) {
    const prevNivel = this.c.nivel;
    if (path.startsWith('c.')) { const k = path.slice(2); this.c[k] = k === 'nivel' ? Math.max(1, Math.floor(Number(v) || 1)) : v; if (k === 'morto' && v) { this.c.data_morte ||= new Date().toISOString(); } if (k === 'morto' && !v) { /* mantém a data */ } }
    else {
      set(this.data, path, v);
      if (path === 'casca') { const c = R.achar(CASCAS, v); this.c.casca = c?.nome || v; const ant = this._polAnt; Object.assign(this.data, { raca: '', cultura: '', heranca: '' }); if (R.aplicarPolInicial(this.data, R.polDe(R.cascaInfo(this.data)), ant)) toast('Polaridade inicial aplicada.'); this.touch(); return this.render(); }
      if (['raca', 'cultura', 'heranca'].includes(path)) { if (path === 'raca' && R.aplicarPolInicial(this.data, R.polDe(R.cascaInfo(this.data)), this._polAnt)) toast('Mutação de Polaridade do Corpo aplicada.'); this.touch(); return this.render(); }
      if (path === 'surv.insan') { const n = R.checarInsanidade(this.data); if (structural || n) { if (n) toast('Limite de Insanidade atingido: nova Condição Psicológica (limite +5).', 'warn'); this.rerender('sec-surv', this.secSurv); } }
    }
    // espelha em campos com o mesmo caminho (ex.: Nível aparece em 2 lugares)
    this.$$(`[data-b="${path}"]`).forEach(el => { if (el !== src && el.type !== 'checkbox') el.value = v ?? ''; });
    if (path === 'c.nivel') {
      R.normalizarArquivo(this.data, this.c.nivel);
      if (this.c.nivel !== prevNivel) this.rerender('sec-attrs', this.secAttrs);
    }
    if (path === 'c.morto') { this.refreshDead(); this.refreshAlma(); const el = this.$('[data-b="c.data_morte"]'); if (el) el.value = toLocalInput(this.c.data_morte); }
    if (path.startsWith('disciplinas.') && path.endsWith('.nivel')) this.rerenderDisc();
    if (structural && path.startsWith('evol.') && (typeof v === 'boolean' || path === 'evol.escolhaAttr' || path.startsWith('evol.goat') || path === 'evol.linhagem')) { this.rerender('sec-evol', this.secEvol); this.rerender('sec-rac', this.secRaciais); }
    if (structural && path.startsWith('virt.') && typeof v === 'boolean') { this.rerender('sec-virt', this.secVirt); if (path === 'virt.faltaDeFe') this.rerender('sec-rac', this.secRaciais); }
    if (/^ataques\.\d+\.teste$/.test(path)) this.testeBtn(+path.split('.')[1]);
    this.refresh(); this.touch();
  }
  // mostra/oculta o botão 🎲 da linha de ataque sem re-renderizar (não tira o foco do teclado)
  testeBtn(i) {
    const box = this.$$('#sec-atk .teste')[i]; if (!box) return;
    const has = box.querySelector('[data-act="rollAtk"]'), ok = !!R.parseTeste(this.data.ataques[i].teste);
    if (ok && !has) { const b = document.createElement('button'); b.type = 'button'; b.className = 'b-ico'; b.dataset.act = 'rollAtk'; b.dataset.i = i; b.title = 'Rolar teste'; b.textContent = '🎲'; box.append(b); }
    if (!ok && has) has.remove();
  }
  rerenderDisc() { this.$$('#tb-disciplinas tr').forEach((tr, i) => { const b = tr.querySelector('.bonus-t'); if (b) b.textContent = R.disciplinaBonus(this.data.disciplinas[i].nivel).txt; }); }

  onClick(e) {
    const el = e.target.closest('[data-act]'); if (!el) return; const a = el.dataset.act, D = el.dataset;
    switch (a) {
      case 'back': e.preventDefault(); return this.onBack();
      case 'jump': e.preventDefault(); return this.$('#' + D.to)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      case 'toggleArq': this.ui.arq = !this.ui.arq; this.ui.sel = -1; this.ui.msg = ''; sessionStorage.setItem('eden.arq', this.ui.arq ? '1' : '0'); return this.rerender('sec-attrs', this.secAttrs);
      case 'slot': this.ui.sel = this.ui.sel === +D.i ? -1 : +D.i; return this.rerender('sec-attrs', this.secAttrs);
      case 'arqAdd': return this.arqDo(R.arquivarPonto, this.c.nivel, D.k);
      case 'consolidar': return this.arqDo(R.consolidarPonto, +D.i, { maxAttr: this.isGM && this.c.owner !== this.user.id ? 99 : 5 });
      case 'descartar': return this.arqDo(R.descartarPonto, +D.i);
      case 'arqPerder': if (confirm('Fuga ou derrota: perder TODOS os pontos arquivados? (os já consolidados ficam)')) this.arqDo(R.perderArquivados); return;
      case 'step': { const p = D.path; let v = (Number(this.v(p)) || 0) + Number(D.d); v = Math.max(Number(D.min), Math.min(Number(D.max), v)); const inp = this.$(`[data-b="${p}"]`); if (inp) inp.value = v; return this.assign(p, v, inp, true); }
      case 'polSet': { const k = D.k, n = +D.n; this.data.pol[k] = this.data.pol[k] === n ? n - 1 : n; this.rerender('sec-pol', this.secPol); return this.touch(); }
      case 'polGastar': { const r = R.gastarPolaridade(this.data.pol, this.$('#polT').value, this.$('#polQ').value); this.rerender('sec-pol', this.secPol); const m = this.$('#polMsg'); if (m) { m.textContent = r.msg; m.classList.toggle('err', !r.ok); } if (r.ok) this.touch(); return; }
      case 'manPol': { const m = this.data.manifest[+D.i]; m.pol = m.pol === D.k ? '' : D.k; this.$$(`[data-act="manPol"][data-i="${D.i}"]`).forEach(b => { b.classList.toggle('on', b.dataset.k === m.pol); b.setAttribute('aria-pressed', b.dataset.k === m.pol); }); return this.touch(); }
      case 'addRow': { const arr = get(this.data, D.list); arr.push(LISTAS[D.list]()); this.touch(); return this.render(); }
      case 'delRow': { const arr = get(this.data, D.list); if (arr.length > 1) { arr.splice(+D.i, 1); this.touch(); this.render(); } return; }
      case 'delPsi': this.data.surv.condPsi.splice(+D.i, 1); this.rerender('sec-surv', this.secSurv); return this.touch();
      case 'roll': return this.openRoller({});
      case 'rollApt': { const ap = R.APTIDOES.find(x => x.n === D.n); return this.openRoller({ attr: ap.a, apt: ap.n }); }
      case 'rollPool': return this.openRoller({ resF: { attr: 'CON', apt: '' }, resM: { attr: 'VON', apt: 'Vontade' }, ini: { attr: 'PER', apt: 'Percepção' } }[D.k]);
      case 'rollAtk': { const t = R.parseTeste(this.data.ataques[+D.i].teste); return t && this.openRoller({ attr: t.attr, apt: t.apt || '' }); }
      case 'photo': return this.pickImg(async url => { this.c.foto = url; this.flags.foto = true; this.touch(); this.render(); }, 420, 0.82);
      case 'addImg': return this.pickImg(async url => { (this.c.galeria ||= []).push(url); this.flags.galeria = true; this.touch(); this.rerender('sec-gal', this.secGaleria); }, 760, 0.75);
      case 'delImg': this.c.galeria.splice(+D.i, 1); this.flags.galeria = true; this.touch(); return this.rerender('sec-gal', this.secGaleria);
      case 'virtUsar': { const p = this.findPoder(D.id); const r = R.usarPoder(this.data, p); toast(r.msg || 'Usado.', r.ok ? '' : 'warn'); if (r.ok) this.touch(); this.rerender('sec-virt', this.secVirt); this.rerender('sec-rac', this.secRaciais); return this.rerender('sec-evol', this.secEvol); }
      case 'virtReset': R.resetarUsos(this.data, D.por, R.cascaInfo(this.data).casca); toast(`Usos por ${D.por} renovados.`); this.touch(); return this.rerender('sec-virt', this.secVirt);
      case 'gastarPA': { const p = this.findPoder(D.id); const r = R.gastarPA(this.data, p?.pa, p?.nome); toast(r.msg, r.ok ? '' : 'warn'); if (r.ok) { this.touch(); this.render(); } return; }
      case 'pontoIra': { const d = R.derivar(this.data, this.c.nivel); if (confirm('Ativar o Ponto de Ira?\n\n+3 Insanidade, Foco Absoluto num alvo; você só para quando ele cair (ou você).')) this.evolDo(R.pontoIra, R.cascaInfo(this.data).casca, d.pvMax); return; }
      case 'evolConfirmar': {
        const casca = R.cascaInfo(this.data).casca, id = this.$('#evSel')?.value, c = R.circulosDe(casca).find(x => x.id === id);
        if (!c) return toast('Escolha um Círculo.', 'warn');
        if (!confirm(`Confirmar evolução para o ${c.n}º Círculo — ${c.nome} (${c.pecado})?\n\nAo alcançar um tipo de evolução você fica PRESO a ele: nunca poderá assumir outra forma (só o Mestre pode liberar).`)) return;
        return this.evolDo(R.confirmarEvolucao, casca, id);
      }
      case 'evolLiberar': if (confirm('Liberar a evolução deste demônio? Ele volta ao Limbo e poderá escolher outro Círculo.')) this.evolDo(R.liberarEvolucao); return;
      case 'evolAssumir': return this.evolDo(R.assumirForma, R.cascaInfo(this.data).casca, this.c.nivel);
      case 'evolEncerrar': return this.evolDo(R.encerrarForma, this.c.nivel);
      case 'evolHoras': return this.evolDo(R.passarHoras, this.c.nivel, +D.h);
      case 'evolRotacao': return this.evolDo(R.rotacaoCiclo, R.cascaInfo(this.data).casca);
      case 'evolReset': R.resetarUsos(this.data, D.por, R.cascaInfo(this.data).casca); toast(`Usos “por ${D.por}” renovados.`); this.touch(); return this.render();
      case 'corpoMorto': if (confirm('Ativar Corpo Morto?\n\nPV → 1 · Polaridade Negativa → 6 · assume a Goat Form (não pode falar nem conjurar).')) this.evolDo(R.corpoMorto, R.cascaInfo(this.data).casca); return;
      case 'viewImg': return this.viewImg(this.c.galeria[+D.i]);
    }
  }

  evolDo(fn, ...args) { const r = fn(this.data, ...args); toast(r.msg, r.ok ? '' : 'warn'); if (r.ok) { this.touch(); this.render(); } }
  circuloTxt() {
    const info = R.cascaInfo(this.data); if (info.casca?.sistema?.tipo !== 'circulos') return null;
    const c = R.circulosDe(info.casca).find(x => x.id === this.data.evol.circulo);
    return info.forma ? `${info.forma.n}º ${info.forma.pecado.split(' ')[0]}` : c ? `1º Limbo → ${c.n}º` : '1º Limbo';
  }
  pickImg(cb, max, q) {
    const f = document.createElement('input'); f.type = 'file'; f.accept = 'image/*';
    f.onchange = async () => { const file = f.files[0]; if (!file) return; try { cb(await imgToDataURL(file, max, q)); } catch (err) { toast(err.message, 'err'); } };
    f.click();
  }
  viewImg(src) {
    const dlg = document.createElement('dialog'); dlg.className = 'imgview'; dlg.innerHTML = `<img src="${src}" alt=""><button class="btn" autofocus>Fechar</button>`;
    dlg.onclick = () => { dlg.close(); dlg.remove(); }; document.body.append(dlg); dlg.showModal();
  }

  /* ───────── rolagem ───────── */
  openRoller(preset = {}) {
    const d = this.d, data = this.data;
    const dlg = document.createElement('dialog'); dlg.className = 'roller';
    const discs = data.disciplinas.filter(x => x.nome && x.apt);
    dlg.innerHTML = `<form method="dialog" class="rl">
      <h3>🎲 Rolagem</h3>
      <div class="rl-grid">
        <label>Atributo<select id="rlA">${R.ATTRS.map(a => `<option value="${a.k}" ${a.k === preset.attr ? 'selected' : ''}>${a.k} (${d.a[a.k]})</option>`).join('')}</select></label>
        <label>Aptidão<select id="rlP"><option value="">— nenhuma —</option>${R.APTIDOES.map(a => `<option ${a.n === preset.apt ? 'selected' : ''}>${a.n}</option>`).join('')}</select></label>
        <label>Disciplina<select id="rlD"><option value="">—</option>${discs.map((x, i) => `<option value="${i}">${esc(x.nome)} (${esc(x.apt)} ${x.nivel})</option>`).join('')}</select></label>
        <label>Dados extras<input id="rlX" type="number" value="0" inputmode="numeric"></label>
        <label>Dificuldade<select id="rlN">${R.NE.map(n => `<option value="${n.v}">${n.n}</option>`).join('')}</select></label>
        <label class="ck"><input type="checkbox" id="rlPen" checked> Aplicar penalidades de estado</label>
        <label class="ck" id="rlKw" hidden><input type="checkbox" id="rlK"> Disciplina 5: +1 mantido (em vez de +3 dados)</label>
      </div>
      <p class="rl-pool" id="rlPool"></p>
      <div class="rl-res" id="rlRes" aria-live="polite"></div>
      <div class="rl-btns"><button type="button" class="btn accent" id="rlGo">Rolar</button><button class="btn ghost" value="x">Fechar</button></div></form>`;
    document.body.append(dlg);
    const q = s => dlg.querySelector(s);
    const pool = () => {
      const a = d.a[q('#rlA').value], ap = q('#rlP').value ? (Number(data.aptidoes[q('#rlP').value]) || 0) : 0;
      const dsc = q('#rlD').value !== '' ? discs[+q('#rlD').value] : null; const b = dsc ? R.disciplinaBonus(dsc.nivel) : { dados: 0, mantidos: 0 };
      q('#rlKw').hidden = !(dsc && Number(dsc.nivel) >= 5);
      const useK = !q('#rlKw').hidden && q('#rlK').checked;
      let rolled = a + ap + (useK ? 0 : b.dados) + Number(q('#rlX').value || 0), kept = a + (useK ? 1 : 0);
      if (q('#rlPen').checked) { rolled += d.tot.dados; kept += d.tot.mant; }
      rolled = Math.max(1, rolled); kept = Math.max(1, Math.min(kept, rolled));
      q('#rlPool').innerHTML = `Rola <b>${rolled}d10</b> · mantém <b>${kept}</b>${q('#rlPen').checked && (d.tot.dados || d.tot.mant) ? ` <small>(penalidades: ${d.tot.dados} dados, ${d.tot.mant} mantidos)</small>` : ''}`;
      return { rolled, kept };
    };
    dlg.addEventListener('input', pool); dlg.addEventListener('change', pool); pool();
    q('#rlGo').onclick = () => {
      const p = pool(), r = R.rolar({ ...p, ne: Number(q('#rlN').value) });
      const keptCount = {}; r.mantidos.forEach(i => keptCount[i] = true);
      q('#rlRes').innerHTML = `<div class="dice">${r.dados.map((v, i) => `<span class="die ${keptCount[i] ? 'kept' : ''} ${v === 10 ? 'ten' : ''} ${v === 1 ? 'one' : ''}">${v}</span>`).join('')}${r.explosoes.map(v => `<span class="die kept boom">${v}</span>`).join('')}</div>
        <div class="rl-total"><b>${r.total}</b>${r.ne ? `<span> vs ${r.ne}</span>` : ''}</div><div class="rl-out ${r.ne ? (r.ok ? 'ok' : 'bad') : ''}">${r.res}</div>
        ${r.avisos.map(a => `<p class="hint">${a}</p>`).join('')}<small class="hint">Destacados = dados mantidos. ${r.uns} dado(s) com 1 · ${r.dez} dado(s) com 10.</small>`;
    };
    dlg.addEventListener('close', () => dlg.remove());
    dlg.showModal();
  }

  /* ───────── salvar / sincronizar ───────── */
  touch() { this.dirty = true; this.setState('Editando…'); clearTimeout(this._t); this._t = setTimeout(() => this.flush(), 800); }
  setState(t, err) { const s = this.$('#saveState'); if (s) { s.textContent = t; s.classList.toggle('err', !!err); } }
  async flush() {
    if (!this.dirty) return; clearTimeout(this._t);
    if (this.saving) { this._again = true; return; }
    this.saving = true; this.dirty = false; this.setState('Salvando…');
    const c = this.c, patch = { nome: c.nome || '', jogador: c.jogador || '', casca: c.casca || '', nivel: c.nivel, morto: !!c.morto, data_morte: c.data_morte || null, data: this.data };
    if (this.flags.foto) patch.foto = c.foto || null; if (this.flags.galeria) patch.galeria = c.galeria || [];
    const fl = { ...this.flags }; this.flags = {};
    try { const r = await this.store.saveChar(c.id, patch); this.c.updated_at = r.updated_at; this.setState('Salvo ✓'); }
    catch (err) { this.dirty = true; Object.assign(this.flags, fl); this.setState('Erro ao salvar', true); toast(err.message, 'err'); }
    finally { this.saving = false; if (this._again) { this._again = false; this.flush(); } }
    const title = this.$('.sheet-title b'); if (title) title.textContent = this.c.nome || 'Nova ficha';
  }
  // A cada 15s: atualiza o tempo da Alma e, se o Mestre mexeu na ficha, traz as mudanças.
  async tick() {
    this.refreshAlma();
    if (this.dirty || this.saving || this.root.querySelector('dialog[open]')) return;
    if (this.root.contains(document.activeElement) && /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) return;
    try {
      const fresh = await this.store.getCharLight(this.c.id);
      if (fresh && fresh.updated_at && fresh.updated_at !== this.c.updated_at) {
        Object.assign(this.c, { nome: fresh.nome, jogador: fresh.jogador, casca: fresh.casca, nivel: fresh.nivel, morto: fresh.morto, data_morte: fresh.data_morte, updated_at: fresh.updated_at, data: R.completar(fresh.data) });
        this.render(); toast('Ficha atualizada (alteração do Mestre ou de outro aparelho).');
      }
    } catch { /* offline: tenta de novo depois */ }
  }
}
