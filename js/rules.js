// Regras do sistema EDEN (livro) em funções puras — sem DOM, testáveis em Node.
import { CASCAS } from './data/cascas.js';

export const ATTRS = [
  { k: 'FOR', n: 'Força' }, { k: 'DES', n: 'Destreza' }, { k: 'CON', n: 'Constituição' },
  { k: 'INT', n: 'Inteligência' }, { k: 'PER', n: 'Percepção' }, { k: 'VON', n: 'Vontade' },
  { k: 'CAR', n: 'Carisma' },
];
export const ATTR_KEYS = ATTRS.map(a => a.k);

// Aptidões na ordem da ficha (coluna esquerda, depois direita). `a` = atributo sugerido.
export const APTIDOES = [
  { n: 'Atletismo', a: 'FOR' }, { n: 'Acrobacia', a: 'DES' }, { n: 'Furtividade', a: 'DES' },
  { n: 'Luta', a: 'FOR' }, { n: 'Conhecimento de Armas', a: 'INT' }, { n: 'Pontaria', a: 'DES' },
  { n: 'Investigação', a: 'INT' }, { n: 'Crafting', a: 'INT' }, { n: 'Medicina', a: 'INT' },
  { n: 'Sobrevivência', a: 'PER' },
  { n: 'Persuasão', a: 'CAR' }, { n: 'Intimidação', a: 'CAR' }, { n: 'Empatia', a: 'PER' },
  { n: 'Enganação', a: 'CAR' }, { n: 'Percepção', a: 'PER' }, { n: 'Vontade', a: 'VON' },
  { n: 'Improviso', a: 'INT' },
];

export const NE = [
  { v: 0, n: 'Sem NE (só rolar)' }, { v: 10, n: 'NE 1 — 10 Rotineiro' }, { v: 15, n: 'NE 2 — 15 Desafiador' },
  { v: 20, n: 'NE 3 — 20 Difícil' }, { v: 25, n: 'NE 4 — 25 Muito Difícil' }, { v: 30, n: 'NE 5 — 30 Quase Impossível' },
];

export const CONDICOES = [
  { k: 'atordoado', n: 'Atordoado', pa: -3, pmZero: true, dados: -2 },
  { k: 'lento', n: 'Lento', pm: -2, mantidosFis: -1 },
  { k: 'acelerado', n: 'Acelerado', pm: 2 },
  { k: 'inspirado', n: 'Inspirado', pa: 2, dados: 1 },
  { k: 'exausto', n: 'Exausto', pa: -1, pm: -1, mantidos: -1 },
  { k: 'furioso', n: 'Furioso', pa: 2 },
  { k: 'envenenado', n: 'Envenenado', pa: -1, pm: -1 },
  { k: 'faminto', n: 'Faminto', pa: -1 },
  { k: 'desnorteado', n: 'Desnorteado', txt: '1 ação significativa; afastar-se do perigo' },
  { k: 'morrendo', n: 'Morrendo' },
];

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const num = v => { const n = Number(v); return Number.isFinite(n) ? n : 0; };

/* ───────── Pontos de Atributo arquivados ───────── */
// Limite do livro (3.1 / 9.6): nível 1→2, 2→3, 3→4, 4→5, 5+→6 espaços.
export function slotsArquivo(nivel) {
  const n = Math.floor(num(nivel)) || 1;
  return Math.min(Math.max(n, 1), 5) + 1;
}
export function arquivados(data) {
  return Array.isArray(data?.arquivados) ? data.arquivados.filter(k => ATTR_KEYS.includes(k)) : [];
}
// Todas retornam { ok, msg } e só alteram `data` quando ok === true.
export function arquivarPonto(data, nivel, attr) {
  if (!ATTR_KEYS.includes(attr)) return { ok: false, msg: 'Atributo inválido.' };
  const arq = arquivados(data), lim = slotsArquivo(nivel);
  if (arq.length >= lim) return { ok: false, msg: `Limite atingido: no nível ${nivel} você tem apenas ${lim} espaços de arquivo. Consolide ou descarte um ponto antes.` };
  data.arquivados = [...arq, attr];
  return { ok: true, msg: `+1 ponto de ${attr} arquivado (${arq.length + 1}/${lim}).` };
}
export function consolidarPonto(data, idx, { maxAttr = 5 } = {}) {
  const arq = arquivados(data);
  if (idx < 0 || idx >= arq.length) return { ok: false, msg: 'Espaço vazio.' };
  const k = arq[idx];
  const atual = num(data.attrs?.[k]);
  if (atual >= maxAttr) return { ok: false, msg: `${k} já está em ${atual}. Acima de ${maxAttr} é capacidade sobrenatural — fale com o Mestre.` };
  data.attrs = { ...data.attrs, [k]: atual + 1 };
  data.arquivados = arq.filter((_, i) => i !== idx);
  return { ok: true, msg: `${k} consolidado: ${atual} → ${atual + 1}. Este ponto não pode mais ser perdido.` };
}
export function descartarPonto(data, idx) {
  const arq = arquivados(data);
  if (idx < 0 || idx >= arq.length) return { ok: false, msg: 'Espaço vazio.' };
  data.arquivados = arq.filter((_, i) => i !== idx);
  return { ok: true, msg: 'Ponto descartado.' };
}
// Fuga ou derrota: pontos arquivados (ainda não consolidados) podem ser perdidos.
export function perderArquivados(data) {
  const n = arquivados(data).length;
  data.arquivados = [];
  return { ok: true, msg: n ? `${n} ponto(s) arquivado(s) perdido(s).` : 'Nenhum ponto arquivado para perder.' };
}
// Se o nível cair (ressurreição etc.), nunca deixa passar do limite.
export function normalizarArquivo(data, nivel) {
  const arq = arquivados(data), lim = slotsArquivo(nivel);
  if (arq.length > lim) data.arquivados = arq.slice(0, lim);
  else if (!Array.isArray(data.arquivados)) data.arquivados = arq;
}

/* ───────── Polaridade (2.24) ───────── */
// Gastar + gera − na mesma quantidade (e vice-versa). Limite 10 de cada. Neutra não converte.
export function gastarPolaridade(pol, tipo, qtd) {
  qtd = Math.floor(num(qtd));
  if (!['pos', 'neg', 'neu'].includes(tipo) || qtd <= 0) return { ok: false, msg: 'Quantidade inválida.' };
  if (pol[tipo] < qtd) return { ok: false, msg: 'Polaridade insuficiente.' };
  pol[tipo] -= qtd;
  if (tipo === 'neu') return { ok: true, msg: `−${qtd} Neutra gasta.` };
  const op = tipo === 'pos' ? 'neg' : 'pos';
  const antes = pol[op];
  pol[op] = Math.min(10, pol[op] + qtd);
  const perdido = antes + qtd - pol[op];
  return { ok: true, msg: `Gasto ${qtd} ${tipo === 'pos' ? '+' : '−'} → ${pol[op] - antes} ${op === 'pos' ? '+' : '−'} gerado(s)` + (perdido ? ` (${perdido} perdido(s) pelo limite de 10)` : '') + '.' };
}

/* ───────── Casca / Raça ───────── */
export function achar(lista, id) { return (lista || []).find(x => x.id === id || x.nome === id); }
export const circulosDe = casca => (casca?.sistema?.tipo === 'circulos' ? casca.sistema.circulos : []);
// Forma demoníaca ativa (Círculo assumido): substitui atributos, PV base e características do Limbo.
export function formaAtiva(data, casca) {
  const e = data.evol; if (!e?.ativa || !e.circulo) return null;
  return circulosDe(casca).find(c => c.id === e.circulo) || null;
}
export function cascaInfo(data) {
  const casca = achar(CASCAS, data.casca);
  const raca = achar(casca?.racas, data.raca);
  const cultura = achar(casca?.culturas, data.cultura);
  const heranca = achar(casca?.herancas, data.heranca);
  const forma = formaAtiva(data, casca);
  const base = forma || casca; // fonte de PV base, modificadores e características da Casca
  const mods = { pv: 0, pa: 0, pm: 0, evasao: 0, defesa: 0, resFisica: 0, resMental: 0, iniciativa: 0, fomeMax: 0, sedeMax: 0, attrs: {}, sentidos: { visao: 0, audicao: 0, olfato: 0 } };
  for (const src of [base, raca, cultura, heranca]) {
    const m = src?.mods; if (!m) continue;
    for (const k of Object.keys(mods)) if (k !== 'attrs' && k !== 'sentidos') mods[k] += num(m[k]);
    for (const [k, v] of Object.entries(m.attrs || {})) mods.attrs[k] = (mods.attrs[k] || 0) + num(v);
    for (const [k, v] of Object.entries(m.sentidos || {})) mods.sentidos[k] = (mods.sentidos[k] || 0) + num(v);
  }
  if (forma?.escolhaAttr) { // 9º Círculo: Vigor +6 OU Inteligência +6
    const ops = forma.escolhaAttr.opcoes, k = ops.includes(data.evol?.escolhaAttr) ? data.evol.escolhaAttr : ops[0];
    mods.attrs[k] = (mods.attrs[k] || 0) + num(forma.escolhaAttr.valor);
  }
  if (forma?.regra === 'confronto') { // 7º Círculo: Fúria (+1/stack, até 2) e Dependência (−2/stack, até 4)
    const f = clamp(num(data.evol.furia), 0, 2), dp = clamp(num(data.evol.dep), 0, 4);
    mods.attrs.FOR = (mods.attrs.FOR || 0) + f - 2 * dp;
  }
  const caracteristicas = [];
  const fontes = [[forma ? 'Forma' : 'Casca', base, forma ? `${forma.n}º Círculo — ${forma.nome}` : casca?.nome], ['Raça', raca, raca?.nome], ['Cultura', cultura, cultura?.nome], ['Herança', heranca, heranca?.nome]];
  for (const [origem, src, de] of fontes) for (const c of src?.caracteristicas || []) caracteristicas.push({ ...c, origem, de });
  const evolucoes = [...(casca?.evolucoes || []), ...(raca?.evolucoes || [])];
  return { casca, raca, cultura, heranca, forma, base, mods, caracteristicas, evolucoes };
}

/* ───────── Penalidades de estado ───────── */
export function ferimento(pv, pvMax) {
  if (pvMax <= 0) return { tier: 0, txt: 'Sem penalidade', dados: 0, pm: 0, pa: 0 };
  const p = (pv / pvMax) * 100;
  if (pv <= 0) return { tier: 5, txt: 'Inconsciente e Morrendo', dados: 0, pm: 0, pa: 0, morrendo: true };
  if (p > 75) return { tier: 0, txt: 'Sem penalidade', dados: 0, pm: 0, pa: 0 };
  if (p > 50) return { tier: 1, txt: '−1 dado físico', dados: -1, pm: 0, pa: 0 };
  if (p > 25) return { tier: 2, txt: '−2 dados; −1 PM', dados: -2, pm: -1, pa: 0 };
  if (p > 10) return { tier: 3, txt: '−3 dados; −2 PM; −1 PA', dados: -3, pm: -2, pa: -1 };
  return { tier: 4, txt: '−4 dados; −3 PM; −2 PA; risco de inconsciência', dados: -4, pm: -3, pa: -2 };
}
export function fomeEfeito(n, max = 10) {
  n = num(n); if (max !== 10 && max > 0) n = Math.ceil(n * 10 / max); // escala o máximo ampliado (Gula) para a tabela 0–10
  if (n <= 0) return { est: 'Normal', txt: 'Nenhum', dados: 0, pa: 0, pm: 0 };
  if (n <= 3) return { est: 'Leve', txt: 'Nenhuma penalidade significativa', dados: 0, pa: 0, pm: 0 };
  if (n <= 6) return { est: 'Moderada', txt: '−1 dado físico; −1 PA', dados: -1, pa: -1, pm: 0 };
  if (n <= 9) return { est: 'Severa', txt: '−2 dados; −2 PA; −1 PM; 1d6 dano/dia', dados: -2, pa: -2, pm: -1 };
  return { est: 'Inanição', txt: '−1d6 PV por turno; estado Furioso', dados: 0, pa: 0, pm: 0 };
}
export function sedeEfeito(n, max = 10) {
  n = num(n); if (max !== 10 && max > 0) n = Math.ceil(n * 10 / max);
  if (n <= 0) return { est: 'Normal', txt: 'Nenhum', dados: 0, pa: 0, pm: 0 };
  if (n <= 3) return { est: 'Leve', txt: 'Nenhuma penalidade significativa', dados: 0, pa: 0, pm: 0 };
  if (n <= 6) return { est: 'Moderada', txt: '−1 dado mental e físico; −1 PA', dados: -1, pa: -1, pm: 0 };
  if (n <= 9) return { est: 'Severa', txt: '−2 dados; −2 PA; −1 PM; risco de desmaio', dados: -2, pa: -2, pm: -1 };
  return { est: 'Desidratação extrema', txt: '−1d6 PV por turno; risco de inconsciência', dados: 0, pa: 0, pm: 0 };
}
const FADIGA = [
  { txt: 'Nenhum', mant: 0, pa: 0, pm: 0 }, { txt: '−1 dado mantido', mant: -1, pa: 0, pm: 0 },
  { txt: '−1 dado mantido; −1 PA', mant: -1, pa: -1, pm: 0 }, { txt: '−2 mantidos; −1 PA; −1 PM', mant: -2, pa: -1, pm: -1 },
  { txt: '−2 mantidos; −2 PA; −1 PM', mant: -2, pa: -2, pm: -1 }, { txt: '−3 mantidos; −2 PA; −2 PM; risco de colapso', mant: -3, pa: -2, pm: -2 },
];
export const fadigaEfeito = n => FADIGA[clamp(Math.floor(num(n)), 0, 5)];

/* ───────── Ficha padrão ───────── */
export function novaData() {
  const apt = {}; APTIDOES.forEach(a => apt[a.n] = 0);
  return {
    conceito: '', casca: '', raca: '', cultura: '', heranca: '', circulo: '', fp: 0,
    attrs: { FOR: 1, DES: 1, CON: 1, INT: 1, PER: 1, VON: 1, CAR: 1 },
    arquivados: [],
    aptidoes: apt,
    disciplinas: [{ nome: '', apt: '', nivel: 0 }, { nome: '', apt: '', nivel: 0 }],
    rec: { pv: 20, pa: 8, pm: 5, pvLast: 20, paLast: 8, pmLast: 5, modPv: 0, modPa: 0, modPm: 0, modEvasao: 0, modDefesa: 0, modResFis: 0, modResMen: 0, modIni: 0, visao: 2, audicao: 2, olfato: 2 },
    pol: { neg: 0, neu: 0, pos: 0 },
    surv: { fome: 0, sede: 0, fadiga: 0, insan: 0, insanLim: 5, condPsi: [] },
    cond: {}, condOutro: '',
    manifest: Array.from({ length: 8 }, () => ({ nome: '', pol: '', pa: '', carga: '', efeito: '' })),
    ataques: [{ nome: '', teste: '', dano: '', pa: '', alcance: '' }],
    equip: { armadura: { nome: '', defesa: 0 }, escudo: { nome: '', defesa: 0 }, armas: [{ nome: '' }, { nome: '' }], ferramentas: '' },
    inventario: [{ item: '', qtd: '' }],
    pers: { personalidade: '', desejo: '', medo: '', valor: '', defeito: '', historia: '', aparencia: '', motivacao: '' },
    relacoes: [{ pessoa: '', relacao: '' }],
    recursos: { dinheiro: '', jcoin: '', materiais: '', consumiveis: '', raros: '' },
    alma: { estado: '', arma: '' },
    virt: { rep: {}, faltaDeFe: false, usos: {}, bm: { tipo: 'Bênção', nome: '', efeito: '' }, original: '', menores: [{ nome: '', versiculos: 0 }] },
    evol: { circulo: '', ativa: false, horas: 0, confronto: false, furia: 0, dep: 0, escolhaAttr: 'CON', campos: {}, goat: { ativa: false, via: '', vala: '', semFala: false }, draco: { ativa: false, ponto: false }, linhagem: '' },
    melhorias: '', notas: '', evolucoesAdquiridas: '',
  };
}
// Completa campos que faltam em fichas antigas (migração segura).
export function completar(data) {
  const base = novaData();
  const merge = (b, d) => {
    if (Array.isArray(b)) return Array.isArray(d) ? d : b;
    if (b && typeof b === 'object') { const o = { ...(d && typeof d === 'object' ? d : {}) }; for (const k of Object.keys(b)) o[k] = merge(b[k], o[k]); return o; }
    return d === undefined || d === null ? b : d;
  };
  return merge(base, data || {});
}

/* ───────── Valores derivados (a ficha "automática") ───────── */
export function disciplinaBonus(nivel) {
  nivel = num(nivel);
  if (nivel >= 5) return { dados: 3, mantidos: 1, txt: '+3 dados ou +1 mantido' };
  if (nivel >= 3) return { dados: 2, mantidos: 0, txt: '+2 dados' };
  if (nivel >= 1) return { dados: 1, mantidos: 0, txt: '+1 dado' };
  return { dados: 0, mantidos: 0, txt: '—' };
}
export function derivar(data, nivel) {
  const info = cascaInfo(data);
  const a = {}; for (const k of ATTR_KEYS) a[k] = Math.max(0, num(data.attrs?.[k]) + num(info.mods.attrs[k])); // ex.: Anjo DES −4
  const apt = n => num(data.aptidoes?.[n]);
  const r = data.rec, s = data.surv;
  const pvBase = info.raca?.pvBase != null ? num(info.raca.pvBase) : info.base ? num(info.base.pvBase ?? 15) : 15; // o Corpo (sub-raça) ou a forma (Círculo) pode ter PV próprio
  const paBase = info.base?.paBase != null ? num(info.base.paBase) : info.casca?.paBase != null ? num(info.casca.paBase) : 8;
  const pmBase = info.base?.pmBase != null ? num(info.base.pmBase) : info.casca?.pmBase != null ? num(info.casca.pmBase) : 5;
  const desPa = a.DES >= 5 ? 2 : a.DES >= 3 ? 1 : 0; // 4.5 / 4.9
  const pvMax = Math.max(1, pvBase + a.CON * 5 + info.mods.pv + num(r.modPv));
  const paMax = Math.max(1, paBase + desPa + info.mods.pa + num(r.modPa));
  const pmMax = Math.max(0, pmBase + desPa + info.mods.pm + num(r.modPm));
  const def = num(data.equip?.armadura?.defesa) + num(data.equip?.escudo?.defesa) + info.mods.defesa + num(r.modDefesa);
  const wound = ferimento(num(r.pv), pvMax);
  const fomeMax = 10 + info.mods.fomeMax, sedeMax = 10 + info.mods.sedeMax;
  const fome = fomeEfeito(s.fome, fomeMax), sede = sedeEfeito(s.sede, sedeMax), fad = fadigaEfeito(s.fadiga);
  // Penalidades somadas (PA/PM/dados) de ferimento + fome + sede + fadiga + condições marcadas
  const fontes = [];
  const add = (nome, o) => { if (o && (o.pa || o.pm || o.dados || o.mant || o.pmZero || o.txt)) fontes.push({ nome, ...o }); };
  add('Ferimento', wound); add('Fome', fome); add('Sede', sede); add('Fadiga', { pa: fad.pa, pm: fad.pm, mant: fad.mant });
  for (const c of CONDICOES) if (data.cond?.[c.k]) add(c.n, { pa: c.pa, pm: c.pm, pmZero: c.pmZero, dados: c.dados, mant: c.mantidos || c.mantidosFis, txt: c.txt });
  // Gula (3º Círculo): Faminto automático a partir de 1/4 da reserva restante (Fome ≥ 3/4 do máximo); Fome Selvagem no máximo
  const famintoAuto = !!info.forma?.flags?.famintoGula && num(s.fome) >= Math.ceil(fomeMax * 0.75);
  const selvagem = famintoAuto && num(s.fome) >= fomeMax;
  if (famintoAuto && !data.cond?.faminto) add('Faminto (Gula)' + (selvagem ? ' — Fome Selvagem' : ''), { pa: -1 });
  const tot = fontes.reduce((t, f) => ({ pa: t.pa + num(f.pa), pm: t.pm + num(f.pm), dados: t.dados + num(f.dados), mant: t.mant + num(f.mant), pmZero: t.pmZero || !!f.pmZero }), { pa: 0, pm: 0, dados: 0, mant: 0, pmZero: false });
  const paEf = Math.max(1, paMax + tot.pa); // 4.5: PA nunca abaixo de 1
  const pmEf = tot.pmZero ? 0 : Math.max(0, pmMax + tot.pm);
  const resMental = { rolled: a.VON + apt('Vontade') + info.mods.resMental + num(r.modResMen), kept: a.VON };
  const resFisica = { rolled: a.CON + info.mods.resFisica + num(r.modResFis), kept: a.CON };
  const ini = { rolled: a.PER + apt('Percepção') + info.mods.iniciativa + num(r.modIni), kept: a.PER };
  return {
    info, a, pvBase, pvMax, paMax, pmMax, paEf, pmEf,
    evasao: 10 + a.DES + info.mods.evasao + num(r.modEvasao), defesa: def,
    resFisica, resMental, ini, percPassiva: 5 + a.PER + apt('Percepção'),
    wound, fome, sede, fad, fontes, tot, fomeMax, sedeMax, famintoAuto, selvagem, forma: info.forma,
    sent: { visao: num(r.visao) + info.mods.sentidos.visao, audicao: num(r.audicao) + info.mods.sentidos.audicao, olfato: num(r.olfato) + info.mods.sentidos.olfato },
    slots: slotsArquivo(nivel), usados: arquivados(data).length,
    morrendo: wound.morrendo || !!data.cond?.morrendo,
    insanPct: s.insanLim ? num(s.insan) / s.insanLim : 0,
  };
}
// Ao mudar o máximo, quem estava "cheio" continua cheio (fica automático ao subir CON, por ex.).
export function sincronizarRecursos(data, d) {
  const r = data.rec;
  for (const [cur, last, max] of [['pv', 'pvLast', d.pvMax], ['pa', 'paLast', d.paEf], ['pm', 'pmLast', d.pmEf]]) {
    if (num(r[cur]) >= num(r[last]) && num(r[last]) !== max) r[cur] = max;
    r[cur] = clamp(num(r[cur]), 0, max);
    r[last] = max;
  }
}
// Insanidade: ao alcançar o limite → condição psicológica e limite +5 (3.14).
export function checarInsanidade(data) {
  const s = data.surv; let novas = 0;
  s.insan = Math.max(0, Math.floor(num(s.insan)));
  while (s.insanLim > 0 && s.insan >= s.insanLim) {
    s.insanLim += 5; novas++;
    s.condPsi = [...(s.condPsi || []), { nome: '', desc: '' }];
  }
  return novas;
}

/* ───────── Rolagem (cap. 2) ───────── */
export function rolar({ rolled, kept, ne = 0, rng = Math.random }) {
  rolled = Math.max(1, Math.floor(rolled)); kept = clamp(Math.floor(kept), 1, rolled);
  const d10 = () => 1 + Math.floor(rng() * 10);
  const dados = Array.from({ length: rolled }, d10);
  const ordem = dados.map((v, i) => ({ v, i })).sort((x, y) => y.v - x.v || x.i - y.i);
  const mant = new Set(ordem.slice(0, kept).map(o => o.i));
  let total = 0, maxChain = 0; const explosoes = [];
  dados.forEach((v, i) => {
    if (!mant.has(i)) return;
    total += v;
    if (v === 10) { // explode (só dados mantidos)
      let chain = 0, x;
      do { x = d10(); total += x; chain++; explosoes.push(x); } while (x === 10);
      maxChain = Math.max(maxChain, chain);
    }
  });
  const uns = dados.filter(v => v === 1).length, dez = dados.filter(v => v === 10).length;
  let res, ok = true;
  if (!ne) res = 'Resultado';
  else if (total >= ne) {
    res = total >= ne + 10 ? 'Sucesso Excepcional' : 'Sucesso';
    if (uns >= 2) res += ' com Complicação';
  } else {
    ok = false;
    res = uns >= 3 ? 'Falha Crítica' : dez >= 1 ? 'Falha com Consequência' : 'Falha';
  }
  const avisos = [];
  if (maxChain >= 3) avisos.push('3ª explosão consecutiva: +1 Fadiga.');
  if (maxChain >= 5) avisos.push('5ª explosão consecutiva: 1d2 de dano mental.');
  if (res === 'Falha Crítica') avisos.push('Falha Crítica concede 1 FP.');
  return { dados, mantidos: [...mant].sort((a, b) => a - b), explosoes, total, uns, dez, res, ok, avisos, ne };
}

// Reconhece "FOR+Luta", "DES + Pontaria", "VON+VON" etc. em textos de teste.
export function parseTeste(txt) {
  const m = String(txt || '').trim().match(/^(FOR|DES|CON|INT|PER|VON|CAR)\s*\+\s*(.+)$/i);
  if (!m) return null;
  const attr = m[1].toUpperCase(); const nome = m[2].trim();
  const apt = APTIDOES.find(a => a.n.toLowerCase() === nome.toLowerCase());
  if (apt) return { attr, apt: apt.n };
  if (ATTR_KEYS.includes(nome.toUpperCase())) return { attr, apt: null };
  return null;
}

/* ───────── Morte / Alma ───────── */
export function almaRestante(dataMorteISO, agora = Date.now()) {
  if (!dataMorteISO) return null;
  const t = new Date(dataMorteISO).getTime(); if (!Number.isFinite(t)) return null;
  const rest = 48 * 3600e3 - (agora - t);
  if (rest <= 0) return { expirada: true, h: 0, m: 0, txt: 'Expirada' };
  const h = Math.floor(rest / 3600e3), m = Math.floor((rest % 3600e3) / 60e3);
  return { expirada: false, h, m, txt: `${String(h).padStart(2, '0')}h${String(m).padStart(2, '0')}` };
}

/* ───────── Sistemas próprios de Casca (ex.: Virtudes dos Anjos) ───────── */
// Polaridade Bônus (Anjo): com PV < 1/4 do máximo, 1/4 do PV atual vira Polaridade Bônus.
export function polaridadeBonus(pv, pvMax) {
  pv = num(pv); if (pvMax <= 0 || pv <= 0 || pv >= pvMax / 4) return { ativa: false, valor: 0 };
  return { ativa: true, valor: Math.floor(pv / 4) };
}
export const virtudesRepresentadas = data => Object.values(data.virt?.rep || {}).filter(Boolean).length;
// Um poder está disponível se a Virtude é representada e (sem Falta de Fé OU protegido contra ela).
export function poderDisponivel(data, virtudeId, poder) {
  if (!data.virt?.rep?.[virtudeId]) return { ok: false, motivo: 'Virtude não representada' };
  if (data.virt.faltaDeFe && !poder.protegida) return { ok: false, motivo: 'Perdida pela Falta de Fé' };
  return { ok: true };
}
export function usarPoder(data, poder) {
  const u = poder.usos; if (!u) return { ok: true, msg: '' };
  const usados = num(data.virt.usos?.[poder.id]);
  if (usados >= u.max) return { ok: false, msg: `${poder.nome}: sem usos até a próxima ${u.por}.` };
  data.virt.usos = { ...data.virt.usos, [poder.id]: usados + 1 };
  return { ok: true, msg: `${poder.nome}: ${usados + 1}/${u.max} usos (${u.por}).` };
}
export function todosPoderes(casca) {
  const out = [...(casca?.caracteristicas || [])];
  for (const v of casca?.sistema?.virtudes || []) out.push(...v.poderes);
  for (const c of casca?.sistema?.circulos || []) out.push(...(c.caracteristicas || []));
  for (const r of casca?.racas || []) out.push(...(r.caracteristicas || []));
  return out.filter(p => p.id);
}
export function resetarUsos(data, por, casca) {
  const ids = new Set(todosPoderes(casca).filter(p => p.usos?.por === por).map(p => p.id));
  const usos = { ...data.virt.usos }; ids.forEach(i => delete usos[i]); data.virt.usos = usos;
}
// Escolher a Casca aplica a Polaridade inicial dela (só se a ficha ainda não tem Polaridade).
// Polaridade de partida da combinação Casca/Raça (o Corpo do Condenado "muta" a Polaridade).
export const polDe = info => info.raca?.polInicial || info.casca?.polInicial || null;
const mesmaPol = (a, b) => !!a && !!b && (a.pos || 0) === (b.pos || 0) && (a.neu || 0) === (b.neu || 0) && (a.neg || 0) === (b.neg || 0);
// Substitui a Polaridade se a ficha está zerada ou ainda tem exatamente a de partida anterior
// (ou seja, o jogador não a mexeu). Se já foi alterada/gasta, não sobrescreve.
export function aplicarPolInicial(data, novo, anterior = null) {
  if (!novo) return false;
  const zerada = !(data.pol.pos || data.pol.neu || data.pol.neg);
  if (!zerada && !mesmaPol(data.pol, anterior)) return false;
  data.pol = { pos: novo.pos || 0, neu: novo.neu || 0, neg: novo.neg || 0 }; return true;
}

/* ───────── Evolução Demoníaca (Círculos) ───────── */
// Mudar de forma não cura nem enche: só reajusta os máximos e limita o valor atual.
export function fixarRecursos(data, d) {
  const r = data.rec;
  for (const [cur, last, max] of [['pv', 'pvLast', d.pvMax], ['pa', 'paLast', d.paEf], ['pm', 'pmLast', d.pmEf]]) { r[cur] = clamp(num(r[cur]), 0, max); r[last] = max; }
}
const nomeCirculo = c => `${c.n}º Círculo — ${c.nome} (${c.pecado})`;
// Alcançar um tipo de evolução prende o demônio a ele: nenhuma outra forma poderá ser assumida.
export function confirmarEvolucao(data, casca, circId) {
  const e = data.evol, lista = circulosDe(casca);
  if (e.circulo) return { ok: false, msg: `Você já está preso ao ${nomeCirculo(lista.find(c => c.id === e.circulo) || { n: '?', nome: e.circulo, pecado: '' })}. Só o Mestre pode liberar.` };
  const c = lista.find(x => x.id === circId);
  if (!c) return { ok: false, msg: 'Escolha um Círculo.' };
  if (c.pendente) return { ok: false, msg: `${c.n}º Círculo — ${c.nome}: os dados ainda não foram cadastrados.` };
  e.circulo = c.id;
  return { ok: true, msg: `Evolução confirmada: ${nomeCirculo(c)}. Você está preso a este Círculo.` };
}
export function liberarEvolucao(data) {
  data.evol = { ...data.evol, circulo: '', ativa: false, horas: 0, confronto: false, furia: 0, dep: 0, goat: { ativa: false, via: '', vala: '', semFala: false }, draco: { ativa: false, ponto: false } };
  return { ok: true, msg: 'Evolução liberada pelo Mestre: o personagem voltou ao Limbo e pode escolher outro Círculo.' };
}
export function assumirForma(data, casca, nivel) {
  const e = data.evol, sis = casca?.sistema;
  if (sis?.tipo !== 'circulos') return { ok: false, msg: 'Esta Casca não tem formas.' };
  if (!e.circulo) return { ok: false, msg: 'Confirme primeiro a evolução para um Círculo.' };
  if (e.ativa) return { ok: false, msg: 'A forma já está ativa.' };
  if (num(data.rec.pa) < sis.custoPA) return { ok: false, msg: `PA insuficiente: assumir a forma custa ${sis.custoPA} PA (você tem ${num(data.rec.pa)}).` };
  data.rec.pa = num(data.rec.pa) - sis.custoPA;
  Object.assign(e, { ativa: true, horas: sis.duracaoH, furia: 0, dep: 0, confronto: false });
  fixarRecursos(data, derivar(data, nivel));
  return { ok: true, msg: `Forma assumida (−${sis.custoPA} PA). Dura ${sis.duracaoH} h.` };
}
export function encerrarForma(data, nivel, motivo = 'Forma encerrada.') {
  const e = data.evol; if (!e.ativa) return { ok: false, msg: 'Nenhuma forma ativa.' };
  Object.assign(e, { ativa: false, horas: 0, furia: 0, dep: 0, confronto: false, goat: { ...e.goat, ativa: false, semFala: false }, draco: { ativa: false, ponto: false } });
  fixarRecursos(data, derivar(data, nivel));
  return { ok: true, msg: motivo + ' De volta ao Limbo.' };
}
export function passarHoras(data, nivel, h) {
  const e = data.evol; if (!e.ativa) return { ok: false, msg: 'Nenhuma forma ativa.' };
  e.horas = Math.max(0, num(e.horas) - h);
  if (e.horas <= 0) return encerrarForma(data, nivel, 'As 12 h terminaram.');
  return { ok: true, msg: `Restam ${e.horas} h de forma.` };
}
// Rotação Dia↔Noite: renova usos "por rotação" e aplica Fúria / Dependência do Confronto (7º Círculo).
export function rotacaoCiclo(data, casca) {
  const e = data.evol, forma = formaAtiva(data, casca), out = [];
  resetarUsos(data, 'rotação', casca);
  if (forma?.regra === 'confronto') {
    if (e.confronto) { e.furia = Math.min(2, num(e.furia) + 1); e.dep = 0; out.push(`Fúria do Confronto: +${e.furia} Força.`); }
    else { e.furia = 0; e.dep = Math.min(4, num(e.dep) + 1); out.push(`Dependência do Confronto: −${2 * e.dep} Força.`); }
  }
  e.confronto = false;
  return { ok: true, msg: ['Nova rotação.', ...out].join(' ') };
}
// Corpo Morto (8º Círculo): 1ª vez a 0 PV no combate → 1 PV, Polaridade Negativa 6 e Goat Form.
export function corpoMorto(data, casca) {
  if (formaAtiva(data, casca)?.id !== 'fraude') return { ok: false, msg: 'Só com a forma do 8º Círculo (Fraude) ativa.' };
  const p = todosPoderes(casca).find(x => x.id === 'fraude-corpo-morto');
  const u = usarPoder(data, p); if (!u.ok) return u;
  data.rec.pv = 1; data.pol.neg = 6;
  data.evol.goat = { ...data.evol.goat, ativa: true, via: data.evol.goat.via || 'derrota', semFala: true };
  return { ok: true, msg: 'Corpo Morto: PV 1, Polaridade Negativa 6, Goat Form (não pode falar nem conjurar).' };
}

// Ponto de Ira (5º Círculo): só com a forma ativa e PV na metade ou menos; −3 Sanidade = +3 Insanidade.
export function pontoIra(data, casca, pvMax) {
  if (formaAtiva(data, casca)?.id !== 'ira') return { ok: false, msg: 'Só com a forma do 5º Círculo (Ira) ativa.' };
  if (num(data.rec.pv) > Math.floor(num(pvMax) / 2)) return { ok: false, msg: 'O Ponto de Ira só pode ser ativado com PV na metade ou menos.' };
  const p = todosPoderes(casca).find(x => x.id === 'ira-ponto');
  const u = usarPoder(data, p); if (!u.ok) return u;
  data.evol.draco = { ...(data.evol.draco || {}), ativa: true, ponto: true };
  data.surv.insan = num(data.surv.insan) + 3;
  return { ok: true, msg: 'Ponto de Ira: Draco Form total, +3 Insanidade, alvo Flanqueado. Sopro de Fogo +3 de dano.' };
}
// Gasta PA de uma habilidade/ataque (não deixa o PA ficar negativo).
export function gastarPA(data, custo, nome = '') {
  const c = num(custo), atual = num(data.rec.pa);
  if (c <= 0) return { ok: true, msg: 'Sem custo de PA.' };
  if (atual < c) return { ok: false, msg: `PA insuficiente (${atual}/${c}).` };
  data.rec.pa = atual - c;
  return { ok: true, msg: `${nome ? nome + ': ' : ''}−${c} PA (restam ${data.rec.pa}).` };
}
