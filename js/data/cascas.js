import { DEMONIO } from './demonio.js';

// ════════════════════════════════════════════════════════════════════════════
//  CASCAS / RAÇAS DE EDEN — ARQUIVO DE DADOS
//  A ficha lê tudo daqui: PV base, PA/PM, sentidos, modificadores e as
//  Características Raciais que aparecem automaticamente na ficha.
//
//  Completas: Anjo e Condenado (Corpos de Porcelana, Costurado e Sombra = sub-raças).
//  Demônio: Limbo + Círculos (js/data/demonio.js). 5º Círculo (Ira) aguardando dados.
//
//  Estrutura (todos os campos são opcionais, exceto id e nome):
//  {
//    id, nome, rotuloRaca: 'Corpo', descricao, polInicial: { pos, neu, neg },   // aplicada ao escolher a Casca
//    sistema: { tipo: 'virtudes' | 'circulos', ... }        // sistema próprio da Casca (Virtudes dos Anjos, Círculos dos Demônios)
//    pvBase: 15,  paBase: 8,  pmBase: 5,           // PV = pvBase + CON×5
//    sentidos: { visao: 2, audicao: 2, olfato: 2 }, // padrão do livro: 2/2/2
//    mods: { pv, pa, pm, evasao, defesa, resFisica, resMental, iniciativa,
//            attrs: { FOR: 0, DES: 0, ... } },       // somados automaticamente
//    fisico: { altura, peso, estrutura, expectativa, pele, olhos, cabelos, distintivas, particularidades },
//    caracteristicas: [ { nome, tipo: 'passiva'|'ativa'|'potencializada', pa: 0,
//                         alcance, duracao, efeito, limitacoes, condicoes } ],
//    evolucoes: [ { nome, descricao, efeito, requisito } ],
//    racas:     [ { id, nome, descricao, origem, distribuicao, mods, caracteristicas, evolucoes } ],
//    culturas:  [ { id, nome, descricao, valores, costumes, organizacao, tradicoes, mods, caracteristicas } ],
//    herancas:  [ { id, nome, tipo, descricao, origem, manifestacao, efeito, restricoes, mods, caracteristicas } ],
//  }
// ════════════════════════════════════════════════════════════════════════════


// ───────────────────────── ANJO ─────────────────────────
// Convertido para as regras do livro: HP→PV, Agilidade→DES, "ações"→PA, "vantagem"→+2 dados rolados (2.16).
// pa com paSugerido:true = o texto original não dava custo em PA; usei valores dentro da faixa do livro
// (passiva 0 PA · ativa 1–4 PA, cap. 6.7). Confirme/ajuste.
const ANJO = {
  id: 'anjo', nome: 'Anjo',
  frase: 'A luz de um anjo não existe para apagar a escuridão. Ela existe para mostrar que ainda existe um caminho.',
  descricao: 'Seres dotados de propriedades divinas, com capacidades físicas e mentais próximas às humanas. Sua força está em conduzir correntes de habilidades positivas; a evolução está ligada às Virtudes que representam, não à quantidade de Polaridade.',
  pvBase: 40, paBase: 8, pmBase: 5, sentidos: { visao: 2, audicao: 2, olfato: 2 },
  polInicial: { pos: 4, neu: 0, neg: 2 },
  mods: { attrs: { CAR: 3, FOR: 1, DES: -4 } },
  caracteristicas: [
    { nome: 'Graça', tipo: 'ativa', pa: 1, paSugerido: true, alcance: 'Aliado afetado', efeito: 'A presença do Anjo manifesta uma luz gentil: o aliado afetado recupera +2 PV. Auxílio sem precisar de uma grande manifestação divina.' },
    { nome: 'Bênção ou Maldição', tipo: 'passiva', pa: 0, efeito: 'Na criação, além da habilidade original ou criada, o Anjo escolhe uma Bênção ou uma Maldição, que passa a fazer parte de seus poderes (registre na seção Virtudes).' },
    { nome: 'Polaridade Bônus', tipo: 'passiva', pa: 0, efeito: 'Com menos de 1/4 do PV máximo, 1/4 do PV atual é convertido em Polaridade Bônus (+), usada por certas Virtudes para cura, transferência de poder ou fortalecimento. Calculado automaticamente na seção Virtudes.', condicoes: 'PV < 1/4 do máximo' },
    { nome: 'Retaliação ao Mal', tipo: 'passiva', pa: 0, negativa: true, efeito: 'Sua presença incomoda Demônios e criaturas de Polaridade Negativa; quanto mais próximas as polaridades, maior o desconforto. Em situações extremas causa enfraquecimento temporário. Efeito exato: Mestre.' },
    { nome: 'Falta de Fé', tipo: 'passiva', pa: 0, negativa: true, efeito: 'Vacilo, recusa ou ato contra a fé do deus/entidade/princípio servido faz perder a conexão divina: o Anjo fica totalmente impossibilitado de usar suas habilidades, e perde também as Virtudes sem a proteção “Não é retirada pela Falta de Fé”, enquanto durar.' },
  ],
  evolucoes: [{ nome: 'Evolução pelas Virtudes', efeito: 'O Anjo evolui representando Virtudes (define o Rank) e dominando Versículos (define a força). Não precisa abandonar uma Virtude para desenvolver outra.' }],
  sistema: {
    tipo: 'virtudes', polBonus: true, rotulo: 'Virtudes',
    intro: 'Rank define a posição · Versículos definem o domínio · Fé mantém o vínculo.',
    virtudes: [
      { id: 'castidade', nome: 'Castidade', polaridade: '+2', sobre: 'Domínio sobre o próprio desejo e a capacidade de não deixar impulsos externos controlarem suas decisões.',
        extra: 'Polaridade +2: ao gastar Polaridade adicional, os poderes divinos ganham maior potência, e efeitos que normalmente impediriam ou negariam a conjuração não os afetam.',
        poderes: [{ id: 'pureza', nome: 'Pureza', tipo: 'passiva', pa: 0, protegida: true, efeito: 'Imune a qualquer técnica ou ação de sedução. Exceção: se feita por sua pessoa amada, afeta normalmente.' }] },
      { id: 'generosidade', nome: 'Generosidade', polaridade: '', sobre: 'Poder não precisa permanecer nas mãos de quem o possui.',
        poderes: [
          { id: 'transmutar', nome: 'Transmutar para Curar', tipo: 'ativa', pa: 3, paSugerido: true, protegida: true, usos: { max: 2, por: 'rotação' }, efeito: 'Usa a Polaridade Bônus e qualquer Polaridade adicional para restaurar 1/4 do PV de um aliado/alvo. A Polaridade usada é efetivamente gasta (não converte). Após 2 usos, só volta quando Eden girar de Dia para Noite.' },
          { id: 'doacao', nome: 'Doação', tipo: 'ativa', pa: 2, paSugerido: true, protegida: true, usos: { max: 1, por: 'sessão' }, efeito: 'Doa a Polaridade Bônus a um aliado/alvo; metade da Polaridade doada sofre conversão.' }] },
      { id: 'temperanca', nome: 'Temperança', polaridade: '', sobre: 'Força sem controle deixa de ser virtude.',
        poderes: [{ id: 'decreto', nome: 'Decreto de Anúbis — Versículo Pv 16.32', tipo: 'ativa', pa: 4, paSugerido: true, custoPv: 8, protegida: false, efeito: '“Melhor o longânimo do que o valente, e o que governa o seu espírito do que o que toma uma cidade.” Quem decidir causar dano a outra criatura recebe de volta o dano que tentou causar. Custo: −8 PV (PV temporário ou máximo, conforme a natureza do uso).' }] },
      { id: 'diligencia', nome: 'Diligência', polaridade: '', sobre: 'Agir com propósito e continuar até concluir o que foi escolhido.',
        poderes: [
          { id: 'hiperfoco', nome: 'Hiperfoco', tipo: 'passiva', pa: 0, protegida: true, efeito: 'No início de cada rotação de Dia para Noite escolha 1: (1) Confronto — no início da batalha selecione uma criatura; você só pode atacar e só pode ser atacado por ela. (2) Condução — metade do tempo para conduzir Cânticos, Versículos e Bênçãos, sem cancelar se for acertado. (3) Criação — metade do tempo para criar algo e +5% na taxa de criação.' },
          { id: 'res-sed-dil', nome: 'Resistência à Sedução', tipo: 'passiva', pa: 0, protegida: true, efeito: 'Resistente a habilidades e tentativas de sedução.' }] },
      { id: 'paciencia', nome: 'Paciência', polaridade: '', sobre: 'Saber quando agir e, principalmente, quando esperar.',
        poderes: [
          { id: 'foco', nome: 'Estado de Foco', tipo: 'passiva', pa: 0, protegida: true, efeito: '+1 dado rolado em testes de Furtividade para não ser detectado; +2 de dano com armas à distância.' },
          { id: 'acalmar', nome: 'Acalmar a Mente', tipo: 'ativa', pa: 0, custoPol: '1 a 5 (+)', protegida: false, efeito: 'Sessão de tratamento contra a insanidade (fora de combate). O Mestre dá uma missão ligada aos seus medos: se cumprir, −3 Insanidade; se falhar, +2 Insanidade.' },
          { id: 'intuicao', nome: 'Intuição', tipo: 'passiva', pa: 0, protegida: false, efeito: '+1 nível em Intuição e +2 dados rolados em Carisma para acalmar outra pessoa (o livro não lista a Aptidão “Intuição”; anote em Melhorias ou use a Aptidão que o Mestre definir).' }] },
      { id: 'caridade', nome: 'Caridade', polaridade: '', sobre: 'Generosidade compartilha o que possui; Caridade sacrifica o que possui para que outro continue.',
        poderes: [
          { id: 'compartilha', nome: 'Compartilha', tipo: 'ativa', pa: 2, paSugerido: true, protegida: true, efeito: 'Consome qualquer quantidade de um Atributo escolhido; um alvo no seu campo de visão recebe bônus igual à metade do Atributo gasto. Depois: custo adicional de +1 Polaridade a cada 3 turnos.' },
          { id: 'gratidao', nome: 'Gratidão', tipo: 'ativa', pa: 4, paSugerido: true, protegida: true, efeito: 'Gasta o PV restante (ou completo) e dá o mesmo valor de PV a outro indivíduo; ignora a condição de Morte (pode trazer o alvo de volta). Preço absoluto: seu PV vai a 0, sem Mesa de Aposta, e você vira Alma sem Corpo (um item): não fala, não age, e seus Atributos arquivados são apagados.' }] },
      { id: 'humildade', nome: 'Humildade', polaridade: '', sobre: 'Ter poder não torna alguém superior aos demais.',
        poderes: [
          { id: 'conceder', nome: 'Conceder', tipo: 'ativa', pa: 0, protegida: true, efeito: 'Abdica da sua posição na Iniciativa e a cede a outra pessoa; sua nova posição passa a ser a mesma dela. (Ação livre, 0 PA.)' },
          { id: 'qni', nome: 'Qualidade Não Importa', tipo: 'ativa', pa: 0, paNota: 'soma dos PA das duas', protegida: false, efeito: 'No descanso, vincule temporariamente duas habilidades: no próximo uso, ambas no mesmo turno. Não é fusão. Custos de Polaridade e de PA são somados (ex.: 2 PA + 3 PA = 5 PA); sem PA suficiente, não pode. Depois o vínculo se desfaz.' },
          { id: 'iguais', nome: 'Somos Todos Iguais', tipo: 'passiva', pa: 0, protegida: true, efeito: '“Somos todos iguais. Ninguém está acima do outro.” Em campo, divergências entre raças deixam de interferir na relação dos envolvidos.' }] },
    ],
  },
  racas: [], culturas: [], herancas: [],
};

// ───────────────────────── CONDENADOS (Corpos = sub-raças) ─────────────────────────
// Vigor→CON, Agilidade→DES. Polaridade do Corpo é aplicada ao escolhê-lo ("mutação"): ver README.
// pa com paSugerido:true = você pediu um custo em PA e o texto não trazia valor; sugeri dentro da faixa do livro (1–4 PA).
// "+2 em testes" → +2 dados rolados (modificador de dados do livro, 3.2). "Diplomacia" não é Aptidão do livro → só Persuasão.
const CONDENADOS = {
  id: 'condenado', nome: 'Condenado', rotuloRaca: 'Corpo',
  frase: 'Você pode julgar um Condenado pelo corpo. Só não espere que o corpo seja aquilo que vai matá-lo.',
  descricao: 'Sua existência em Eden está ligada ao Corpo que possuem. Polaridade Neutra: não estão naturalmente ligados às energias Positiva ou Negativa; concentram-se em poderes de ataque mágico com alto desempenho físico. O Corpo define como o Condenado sobrevive, luta e interage; a aparência afeta como os outros o percebem (o Mestre considera isso nas cenas).',
  pvBase: 15, paBase: 8, pmBase: 5, polInicial: { pos: 0, neu: 0, neg: 0 },
  caracteristicas: [], evolucoes: [], culturas: [], herancas: [],
  racas: [
    { id: 'porcelana', nome: 'Corpo de Porcelana', pvBase: 25, polInicial: { pos: 1, neu: 3, neg: 1 },
      descricao: 'Pele de porcelana delicada, beleza frágil e quase etérea; olhos de brilho sutil, cabelos suaves e brilhantes; podem ser confundidos com bonecos ou estátuas. Notável capacidade de recuperação, mas que exige cuidados específicos. Beleza desperta admiração e confiança, mas a estrutura frágil faz subestimarem o combatente. Capacidades variadas, não ligadas a uma única Polaridade.',
      mods: { attrs: { CON: 2, DES: 1, FOR: -2 } },
      caracteristicas: [
        { nome: 'Elegância Etérea', tipo: 'passiva', pa: 0, efeito: '+2 dados rolados em testes de Carisma quando a aparência puder influenciar positivamente a interação (encanto, admiração, delicadeza, impressão de algo incomum e belo).' },
        { nome: 'Toque da Porcelana', tipo: 'ativa', pa: 1, paSugerido: true, alcance: 'Contato físico', efeito: 'No contato físico com outro ser, a pele transmite calma e serenidade: +2 dados rolados em Persuasão quando o contato puder contribuir para a interação.' },
        { nome: 'Fragilidade Extrema', tipo: 'passiva', pa: 0, negativa: true, efeito: 'Sofre o dobro de dano de ataques físicos (o corpo racha, quebra ou sofre danos estruturais).' },
        { nome: 'Restauração Delicada', tipo: 'passiva', pa: 0, negativa: true, efeito: 'Recuperar ferimentos é mais difícil: exige ambiente adequado e cuidados específicos. A recuperação natural não é cura simples: rachaduras, partes quebradas e danos estruturais podem exigir atenção especial antes de o corpo voltar ao normal.' },
      ] },
      { id: 'costurado', nome: 'Corpo Costurado', pvBase: 30, polInicial: { pos: 0, neu: 5, neg: 0 },
      descricao: 'Corpo humanoide de partes costuradas e remendadas; costuras e cicatrizes visíveis, membros trocados por partes de outros seres ou peças mecânicas. Grande resistência: continua funcionando após ferimentos que incapacitariam outros. Capacidades focadas em aplicações básicas. Aparência macabra pode causar medo ou repulsa.',
      mods: { attrs: { CON: 2, FOR: 2, CAR: -3 } },
      caracteristicas: [
        { nome: 'Ghoul', tipo: 'ativa', pa: 1, paSugerido: true, efeito: 'Ao comer carne (da própria raça ou de outros seres) recupera 1 a 5 PV, a critério do Mestre. Comida normal mantém o corpo saciado, mas não recupera PV.' },
        { nome: 'Costuras', tipo: 'ativa', pa: 2, paSugerido: true, paNota: 'varia conforme a parte recolocada (1–4 PA)', efeito: 'Recoloca membros perdidos durante a batalha. Não recupera PV: só devolve o uso da parte e evita as consequências permanentes da perda. O membro recolocado é parte funcional do corpo.' },
        { nome: 'Faminto', tipo: 'passiva', pa: 0, negativa: true, efeito: 'Com fome, a necessidade de carne domina os instintos: nenhuma comida normal sacia. A fome evolui para fúria e compulsão alimentar, e aliados, inimigos e até criaturas que normalmente não seriam alimento passam a ser vistos como presas.' },
      ] },
      { id: 'sombra', nome: 'Corpo de Sombra', pvBase: 25, polInicial: { pos: 0, neu: 0, neg: 3 },
      descricao: 'Pele pálida e translúcida, parcialmente feita de sombras; olhos de luz sinistra; movimentos fluidos, silenciosos e difíceis de acompanhar; pode se misturar à escuridão. Mais próximo das manifestações demoníacas; a alma ficou mais densa de sombra do que de matéria. Excelente em ocultação, camuflagem e manipulação de sombras.',
      mods: { attrs: { DES: 3, CON: 1, FOR: -3 } },
      caracteristicas: [
        { nome: 'Manipulação das Sombras', tipo: 'ativa', pa: 2, paSugerido: true, efeito: 'Usa sombras para camuflar o corpo, esconder a presença ou criar ilusões, conforme as possibilidades de suas habilidades. Além disso: +2 dados rolados em Furtividade.' },
        { nome: 'Visão Noturna', tipo: 'passiva', pa: 0, efeito: 'Enxerga perfeitamente em ambientes com pouca ou nenhuma luz: a escuridão não é barreira.' },
        { nome: 'Dependência das Sombras', tipo: 'passiva', pa: 0, negativa: true, efeito: 'Precisa de uma fonte de sombras para ficar confortável e energizado. Sem sombras suficientes, o corpo enfraquece; ambientes muito iluminados ou sem nenhuma sombra são especialmente prejudiciais.' },
        { nome: 'Visão Noturna Acentuada', tipo: 'passiva', pa: 0, negativa: true, efeito: 'A visão é adaptada ao escuro de forma tão intensa que locais muito iluminados são desconfortáveis e, em situações extremas, prejudiciais.' },
      ] },
  ],
};

export const CASCAS = [
  {
    id: 'padrao', nome: 'Sem Casca específica',
    descricao: 'Personagem sem Casca própria: PV = 15 + CON × 5 (livro, 3.10).',
    pvBase: 15, sentidos: { visao: 2, audicao: 2, olfato: 2 },
    caracteristicas: [], evolucoes: [], racas: [], culturas: [], herancas: [],
  },
  // PV base oficiais (livro 3.10). Raças, culturas, heranças e características: aguardando dados.
  DEMONIO,
  ANJO,
  CONDENADOS,
];
