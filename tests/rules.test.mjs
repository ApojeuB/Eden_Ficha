import assert from 'node:assert/strict';
import * as R from '../js/rules.js';

// Limite de arquivo por nível (livro 3.1/9.6): 1→2, 2→3, 3→4, 4→5, 5+→6
assert.deepEqual([1,2,3,4,5,6,9].map(R.slotsArquivo), [2,3,4,5,6,6,6]);

// Arquivar respeita o limite à risca
let d = R.novaData();
assert.ok(R.arquivarPonto(d, 1, 'FOR').ok);
assert.ok(R.arquivarPonto(d, 1, 'DES').ok);
let r = R.arquivarPonto(d, 1, 'CON');
assert.equal(r.ok, false); assert.equal(d.arquivados.length, 2);
// subir de nível libera espaço
assert.ok(R.arquivarPonto(d, 2, 'CON').ok); assert.equal(d.arquivados.length, 3);
// consolidar: +1 no atributo e libera o espaço
r = R.consolidarPonto(d, 0); assert.ok(r.ok); assert.equal(d.attrs.FOR, 2); assert.equal(d.arquivados.length, 2);
// consolidar acima de 5 é bloqueado
d.attrs.DES = 5; r = R.consolidarPonto(d, 0); assert.equal(r.ok, false);
// perder arquivados (fuga/derrota)
R.perderArquivados(d); assert.equal(d.arquivados.length, 0);
// normalizar quando o nível cai
d.arquivados = ['FOR','FOR','FOR','FOR']; R.normalizarArquivo(d, 1); assert.equal(d.arquivados.length, 2);

// PV: 15 + CON×5; Casca com base própria
d = R.novaData(); d.attrs.CON = 3;
assert.equal(R.derivar(d,1).pvMax, 30);
d.casca = 'anjo'; assert.equal(R.derivar(d,1).pvMax, 55);
d.casca = 'condenado'; d.raca = 'costurado'; d.attrs.CON = 1; assert.equal(R.derivar(d,1).pvMax, 45); d.raca = ''; d.casca = 'anjo';
// PA/PM: base 8/5; DES 3+ → +1; DES 5+ → +2
d = R.novaData(); assert.equal(R.derivar(d,1).paMax, 8); d.attrs.DES = 3;
assert.equal(R.derivar(d,1).paMax, 9); assert.equal(R.derivar(d,1).pmMax, 6);
d.attrs.DES = 5; assert.equal(R.derivar(d,1).paMax, 10);
// Evasão = 10 + DES
assert.equal(R.derivar(d,1).evasao, 15);
// Percepção passiva = 5 + PER + Percepção
d.attrs.PER = 3; d.aptidoes['Percepção'] = 2; assert.equal(R.derivar(d,1).percPassiva, 10);
// Iniciativa = PER + Percepção
assert.deepEqual(R.derivar(d,1).ini, { rolled: 5, kept: 3 });

// Ferimentos
const f = (pv)=>R.ferimento(pv,100).tier;
assert.deepEqual([100,76,75,51,50,26,25,11,10,1,0].map(f), [0,0,1,1,2,2,3,3,4,4,5]);
// Penalidades: fome severa + fadiga 5 reduzem PA mas nunca abaixo de 1
d = R.novaData(); d.surv.fome = 8; d.surv.fadiga = 5; let x = R.derivar(d,1);
assert.equal(x.paEf, 8 - 2 - 2); d.cond.atordoado = true; x = R.derivar(d,1);
assert.equal(x.pmEf, 0); assert.ok(x.paEf >= 1);

// Insanidade: ao alcançar o limite, +5 e nova condição psicológica
d = R.novaData(); d.surv.insan = 5; assert.equal(R.checarInsanidade(d), 1);
assert.equal(d.surv.insanLim, 10); assert.equal(d.surv.condPsi.length, 1);

// Polaridade: gastar + gera −, limite 10
let p = { pos: 6, neu: 2, neg: 4 }; R.gastarPolaridade(p, 'pos', 3);
assert.deepEqual(p, { pos: 3, neu: 2, neg: 7 });   // exemplo exato do livro (2.24.3)
p = { pos: 5, neu: 0, neg: 9 }; R.gastarPolaridade(p, 'pos', 3); assert.equal(p.neg, 10);
assert.equal(R.gastarPolaridade({pos:1,neu:0,neg:0},'pos',2).ok, false);

// Rolagem: exemplo do livro — 5d10 [2,4,7,8,9], mantém 3 → 24
const seq = seqRng([2,4,7,8,9]); let o = R.rolar({ rolled: 5, kept: 3, ne: 20, rng: seq });
assert.equal(o.total, 24); assert.equal(o.res, 'Sucesso');
// Explosão: 7,8,10 + 6 = 31 (sucesso excepcional contra NE 20)
o = R.rolar({ rolled: 3, kept: 3, ne: 20, rng: seqRng([7,8,10,6]) }); assert.equal(o.total, 31); assert.equal(o.res, 'Sucesso Excepcional');
// 3 uns e falha = Falha Crítica; 10 e falha = Falha com Consequência
o = R.rolar({ rolled: 4, kept: 2, ne: 30, rng: seqRng([1,1,1,5]) }); assert.equal(o.res, 'Falha Crítica');
o = R.rolar({ rolled: 3, kept: 1, ne: 30, rng: seqRng([10,3,3,2]) }); assert.equal(o.res, 'Falha com Consequência');
// dois uns + sucesso = com complicação
o = R.rolar({ rolled: 4, kept: 2, ne: 10, rng: seqRng([9,9,1,1]) }); assert.equal(o.res, 'Sucesso com Complicação');
// dado NÃO mantido que tira 10 não explode: kept=1, dados [10? kept] — usa [3,10]→ mantém 10 (explode); teste: kept=2, [10,10,2]
o = R.rolar({ rolled: 3, kept: 1, ne: 0, rng: seqRng([10,10,2,4]) }); assert.equal(o.total, 10 + 4); // só o mantido explode

assert.deepEqual(R.parseTeste('FOR + Luta'), { attr: 'FOR', apt: 'Luta' });
assert.equal(R.parseTeste('xyz'), null);
assert.equal(R.almaRestante('2026-01-01T00:00:00Z', Date.parse('2026-01-02T00:00:00Z')).txt, '24h00');
assert.equal(R.almaRestante('2026-01-01T00:00:00Z', Date.parse('2026-01-04T00:00:00Z')).expirada, true);

// completar() preenche fichas antigas
assert.equal(R.completar({ conceito: 'x' }).attrs.FOR, 1);
console.log('rules.js: todos os testes passaram ✔');

function seqRng(vals){ let i=0; return ()=>{ const v = vals[i++ % vals.length]; return (v-1)/10 + 0.001; }; }

// ── Anjo ──
import { CASCAS } from '../js/data/cascas.js';
{
  let d = R.novaData(); d.casca = 'anjo';
  let x = R.derivar(d, 1);
  assert.equal(x.pvBase, 40); assert.equal(x.pvMax, 45);          // 40 + CON1×5
  assert.equal(x.a.CAR, 4); assert.equal(x.a.FOR, 2); assert.equal(x.a.DES, 0); // DES 1−4 → 0 (mín.)
  assert.equal(x.paMax, 8); assert.equal(x.pmMax, 5); assert.equal(x.evasao, 10);
  assert.ok(R.aplicarPolInicial(d, CASCAS.find(c => c.id === 'anjo').polInicial));
  assert.deepEqual(d.pol, { pos: 4, neu: 0, neg: 2 });
  assert.equal(R.aplicarPolInicial(d, CASCAS.find(c => c.id === 'anjo').polInicial), false); // não sobrescreve
  // Polaridade Bônus: PV < 1/4 do máx → floor(PV/4)
  assert.deepEqual(R.polaridadeBonus(10, 45), { ativa: true, valor: 2 });
  assert.equal(R.polaridadeBonus(12, 45).ativa, false); assert.equal(R.polaridadeBonus(0, 45).ativa, false);
  // Falta de Fé: só poderes protegidos continuam
  const ger = CASCAS.find(c => c.id === 'anjo').sistema.virtudes;
  const pureza = ger[0].poderes[0], decreto = ger[2].poderes[0];
  d.virt.rep.castidade = true; d.virt.rep.temperanca = true;
  assert.ok(R.poderDisponivel(d, 'castidade', pureza).ok); assert.ok(R.poderDisponivel(d, 'temperanca', decreto).ok);
  d.virt.faltaDeFe = true;
  assert.ok(R.poderDisponivel(d, 'castidade', pureza).ok); assert.equal(R.poderDisponivel(d, 'temperanca', decreto).ok, false);
  assert.equal(R.poderDisponivel(d, 'humildade', pureza).ok, false); // não representada
  // Usos: Transmutar 2 por rotação
  const transm = ger[1].poderes[0];
  assert.ok(R.usarPoder(d, transm).ok); assert.ok(R.usarPoder(d, transm).ok); assert.equal(R.usarPoder(d, transm).ok, false);
  R.resetarUsos(d, 'rotação', CASCAS.find(c => c.id === 'anjo')); assert.ok(R.usarPoder(d, transm).ok);
  // PA/PM: nenhum poder ativo passa de 4 PA (faixa do livro, 6.7)
  for (const v of ger) for (const p of v.poderes) assert.ok(p.pa <= 4, p.nome);
  console.log('Anjo: ok ✔');
}

// ── Condenado ──
{
  const co = CASCAS.find(c => c.id === 'condenado');
  assert.deepEqual(co.racas.map(r => r.pvBase), [25, 30, 25]);
  let d = R.novaData(); d.casca = 'condenado'; d.raca = 'porcelana';
  let x = R.derivar(d, 1);
  assert.equal(x.pvMax, 25 + (1 + 2) * 5);                      // CON 1+2 = 3
  assert.deepEqual([x.a.CON, x.a.DES, x.a.FOR], [3, 2, 0]);      // FOR 1−2 → 0 (mín.)
  d.raca = 'costurado'; x = R.derivar(d, 1);
  assert.equal(x.pvMax, 30 + 3 * 5); assert.deepEqual([x.a.FOR, x.a.CAR], [3, 0]);
  d.raca = 'sombra'; x = R.derivar(d, 1);
  assert.equal(x.pvMax, 25 + 2 * 5); assert.equal(x.a.DES, 4); assert.equal(x.paMax, 9); assert.equal(x.pmMax, 6); // DES 4 → +1 PA/PM
  // Mutação de Polaridade: troca de corpo substitui enquanto não foi mexida
  d = R.novaData(); d.casca = 'condenado'; d.raca = 'porcelana';
  const por = R.polDe(R.cascaInfo(d)); assert.deepEqual(por, { pos: 1, neu: 3, neg: 1 });
  assert.ok(R.aplicarPolInicial(d, por, null)); assert.deepEqual(d.pol, { pos: 1, neu: 3, neg: 1 });
  d.raca = 'sombra'; assert.ok(R.aplicarPolInicial(d, R.polDe(R.cascaInfo(d)), por)); assert.deepEqual(d.pol, { pos: 0, neu: 0, neg: 3 });
  d.pol.neg = 1; d.raca = 'costurado'; assert.equal(R.aplicarPolInicial(d, R.polDe(R.cascaInfo(d)), { pos: 0, neu: 0, neg: 3 }), false); // já gasta → preserva
  for (const r of co.racas) for (const c of r.caracteristicas) assert.ok(c.pa <= 4);
  console.log('Condenado: ok ✔');
}

// ── Demônio ──
{
  const dem = CASCAS.find(c => c.id === 'demonio');
  const pvs = Object.fromEntries(dem.sistema.circulos.map(c => [c.id, c.pvBase]));
  assert.deepEqual(pvs, { luxuria: 30, gula: 25, avareza: 25, ira: 40, heresia: 35, violencia: 35, fraude: 40, traicao: 25 });
  assert.ok(!dem.sistema.circulos.find(c => c.id === 'ira').pendente);
  let d = R.novaData(); d.casca = 'demonio';
  let x = R.derivar(d, 1);
  assert.equal(x.pvMax, 25 + 5);                                                        // Limbo: base 25 + CON1×5
  assert.deepEqual([x.a.DES, x.a.CAR, x.a.FOR], [2, 4, 0]);                             // DES+1 CAR+3 FOR−2 (mín. 0)
  assert.deepEqual(R.polDe(R.cascaInfo(d)), { pos: 1, neu: 0, neg: 3 });
  d.rec.pv = 30; d.rec.pvLast = 30;
  // Evolução trava no 1º Círculo escolhido; 5º (Ira) ainda não tem dados
  assert.ok(R.confirmarEvolucao(d, dem, 'luxuria').ok);
  assert.equal(R.confirmarEvolucao(d, dem, 'gula').ok, false); assert.equal(d.evol.circulo, 'luxuria');
  // Assumir forma: 4 PA, 12 h
  d.rec.pa = 3; assert.equal(R.assumirForma(d, dem, 1).ok, false);
  d.rec.pa = 8; assert.ok(R.assumirForma(d, dem, 1).ok);
  assert.equal(d.rec.pa, 4); assert.equal(d.evol.ativa, true); assert.equal(d.evol.horas, 12);
  x = R.derivar(d, 1);
  assert.equal(x.pvMax, 30 + 5 * 5);                                                    // 2º Círculo: base 30 + CON(1+4)×5
  assert.deepEqual([x.a.DES, x.a.CAR, x.a.CON, x.a.FOR], [2, 5, 5, 0]);                 // atributos SUBSTITUEM os do Limbo
  assert.equal(d.rec.pv, 30);                                                           // trocar de forma não cura
  assert.equal(R.assumirForma(d, dem, 1).ok, false);                                    // já ativa
  assert.ok(R.cascaInfo(d).caracteristicas.some(c => c.id === 'luxuria-seducao'));
  assert.ok(!R.cascaInfo(d).caracteristicas.some(c => c.id === 'limbo-toque'));         // características do Limbo saem
  // 12 h acabam → volta ao Limbo
  assert.ok(R.passarHoras(d, 1, 6).ok); assert.equal(d.evol.horas, 6);
  R.passarHoras(d, 1, 6); assert.equal(d.evol.ativa, false);
  assert.equal(R.derivar(d, 1).pvMax, 30); assert.ok(d.rec.pv <= 30);
  assert.ok(R.cascaInfo(d).caracteristicas.some(c => c.id === 'limbo-toque'));
  // Mestre libera → pode escolher outro
  R.liberarEvolucao(d); assert.ok(R.confirmarEvolucao(d, dem, 'gula').ok);

  // Gula: Fome/Sede +5 e Faminto automático (Fome ≥ 3/4 do máximo 15 = 12)
  d.rec.pa = 8; R.assumirForma(d, dem, 1); x = R.derivar(d, 1);
  assert.deepEqual([x.fomeMax, x.sedeMax], [15, 15]);
  d.surv.fome = 11; assert.equal(R.derivar(d, 1).famintoAuto, false);
  d.surv.fome = 12; x = R.derivar(d, 1); assert.equal(x.famintoAuto, true); assert.ok(x.fontes.some(f => f.nome.startsWith('Faminto (Gula)')));
  d.surv.fome = 15; assert.equal(R.derivar(d, 1).selvagem, true);
  d.cond.faminto = true; assert.equal(R.derivar(d, 1).fontes.filter(f => /Faminto/.test(f.nome)).length, 1); // sem duplicar

  // 7º Círculo: Fúria (+1/stack até 2) e Dependência (−2/stack até 4) a cada rotação
  d = R.novaData(); d.casca = 'demonio'; R.confirmarEvolucao(d, dem, 'violencia'); d.rec.pa = 8; R.assumirForma(d, dem, 1);
  assert.equal(R.derivar(d, 1).a.FOR, 1 + 5);
  d.evol.confronto = true; R.rotacaoCiclo(d, dem); assert.equal(R.derivar(d, 1).a.FOR, 7);
  d.evol.confronto = true; R.rotacaoCiclo(d, dem); d.evol.confronto = true; R.rotacaoCiclo(d, dem); assert.equal(d.evol.furia, 2); assert.equal(R.derivar(d, 1).a.FOR, 8);
  R.rotacaoCiclo(d, dem); assert.deepEqual([d.evol.furia, d.evol.dep], [0, 1]); assert.equal(R.derivar(d, 1).a.FOR, 6 - 2);
  for (let i = 0; i < 6; i++) R.rotacaoCiclo(d, dem); assert.equal(d.evol.dep, 4); assert.equal(R.derivar(d, 1).a.FOR, 0); // 6−8 → mín. 0
  d.evol.confronto = true; R.rotacaoCiclo(d, dem); assert.equal(d.evol.dep, 0);        // confronto zera a Dependência

  // 9º Círculo: Vigor +6 OU Inteligência +6; +1 PA; sentidos
  d = R.novaData(); d.casca = 'demonio'; R.confirmarEvolucao(d, dem, 'traicao'); d.rec.pa = 8; R.assumirForma(d, dem, 1);
  x = R.derivar(d, 1); assert.equal(x.a.CON, 7); assert.equal(x.a.INT, 1); assert.equal(x.a.CAR, 0); assert.equal(x.paMax, 9);
  assert.equal(x.sent.olfato, 5); assert.equal(x.sent.audicao, 4);
  d.evol.escolhaAttr = 'INT'; x = R.derivar(d, 1); assert.equal(x.a.INT, 7); assert.equal(x.a.CON, 1);

  // 8º Círculo: Corpo Morto (1 por combate) só com a forma ativa
  d = R.novaData(); d.casca = 'demonio'; assert.equal(R.corpoMorto(d, dem).ok, false);
  R.confirmarEvolucao(d, dem, 'fraude'); d.rec.pa = 8; R.assumirForma(d, dem, 1);
  d.rec.pv = 0; assert.ok(R.corpoMorto(d, dem).ok); assert.deepEqual([d.rec.pv, d.pol.neg, d.evol.goat.ativa], [1, 6, true]);
  assert.equal(R.corpoMorto(d, dem).ok, false);
  R.resetarUsos(d, 'combate', dem); assert.ok(R.corpoMorto(d, dem).ok);
  R.encerrarForma(d, 1); assert.equal(d.evol.goat.ativa, false);
  assert.equal(dem.sistema.circulos.find(c => c.id === 'fraude').linhagens.length, 10);
  // Todo poder ativo tem custo em PA definido (user pediu); ativas ≤ 4 PA
  for (const c of dem.sistema.circulos) for (const p of c.caracteristicas) { assert.ok(p.pa != null, p.nome); if (p.tipo === 'ativa') assert.ok(p.pa <= 4, p.nome); }
  console.log('Demônio: ok ✔');
}

{ // 5º Círculo (Ira) + Gastar PA
  const dem = CASCAS.find(c => c.id === 'demonio');
  let d = R.novaData(); d.casca = 'demonio';
  assert.ok(R.confirmarEvolucao(d, dem, 'ira').ok);
  d.rec.pa = 8; assert.ok(R.assumirForma(d, dem, 1).ok);
  let x = R.derivar(d, 1);
  assert.deepEqual([x.a.FOR, x.a.DES, x.a.CAR], [6, 4, 0]);                 // base 1 + FOR5 DES3 CAR−4 (mín. 0)
  assert.equal(x.pvMax, 45);                                       // 40 + CON1×5
  d.rec.pv = 45; assert.equal(R.pontoIra(d, dem, x.pvMax).ok, false);       // PV cheio: não ativa
  d.rec.pv = 20; const ins = d.surv.insan;
  assert.ok(R.pontoIra(d, dem, x.pvMax).ok); assert.equal(d.surv.insan, ins + 3); assert.equal(d.evol.draco.ponto, true);
  assert.equal(R.pontoIra(d, dem, x.pvMax).ok, false);                      // 1×/combate
  assert.equal(R.gastarPA(d, 3, 'Cuspir Fogo').ok, true); assert.equal(d.rec.pa, 1);
  assert.equal(R.gastarPA(d, 3).ok, false); assert.equal(d.rec.pa, 1);
  const ativas = dem.sistema.circulos.find(c => c.id === 'ira').caracteristicas.filter(c => c.tipo === 'ativa');
  assert.ok(ativas.filter(c => c.dano).every(c => c.pa > 0 || c.id === 'ira-sopro'));
  console.log('Ira + Gastar PA: ok ✔');
}
