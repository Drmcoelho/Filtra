'use strict';
/*
 * FILTRA · M6 — Alça de Henle: fina descendente × ramo espesso (NKCC2),
 *               multiplicador de contracorrente, gradiente corticomedular
 *               — e a FARMACOLOGIA do segmento: os DIURÉTICOS DE ALÇA (§8).
 * ---------------------------------------------------------------------------
 * Engine PURO, determinístico. Roda em Node e inline no HTML.
 * Regra-zero: o motor manda no pixel.
 *
 * Tese (o erro a corrigir): "a alça concentra a urina".
 * Verdade: a alça NÃO concentra — ela CRIA o gradiente corticomedular que permite,
 * lá no coletor (sob ADH), concentrar. O ramo espesso ASCENDENTE (TAL) é o MOTOR
 * DILUIDOR: reabsorve NaCl via NKCC2 e é IMPERMEÁVEL à água → o líquido sai diluído
 * e o interstício medular fica salgado. Quatro mecanismos:
 *   1. MULTIPLICADOR DE CONTRACORRENTE — a fina descendente é permeável à água (sai
 *      água, o conteúdo concentra), o TAL é impermeável à água e reabsorve NaCl (entra
 *      sal no interstício). O arranjo em alça MULTIPLICA um gradiente unitário pequeno
 *      (~200 mOsm) num eixo cortico→medular de ~300 (córtex) a ~1200 mOsm (papila).
 *   2. NKCC2 — cotransporta Na⁺-K⁺-2Cl⁻ no TAL. O K⁺ é RECICLADO de volta à luz (ROMK)
 *      → cria voltagem luminal POSITIVA → força a reabsorção PARACELULAR de Ca²⁺ e Mg²⁺.
 *   3. DIURÉTICOS DE ALÇA — bloqueiam o NKCC2 → abolem a reabsorção de NaCl no TAL →
 *      o gradiente corticomedular DESABA → natriurese POTENTE (teto alto, "diuréticos de
 *      teto alto"). E como matam a voltagem luminal+, perdem Ca²⁺ E Mg²⁺ (≠ tiazídico,
 *      que RETÉM Ca²⁺). Curva dose-resposta com LIMIAR e TETO; braking/resistência
 *      deslocam a curva à DIREITA (EC50↑). IV > VO (furosemida VO ~50% biodisponível).
 *   4. VASA RECTA — trocador de contracorrente: preserva o gradiente sem lavá-lo (perfunde
 *      a medula trazendo O₂ sem dissipar o sal). A medula vive à beira da hipóxia.
 *
 * Farmacologia (§8 — doses REAIS, efeito computado por dose-resposta sigmoide):
 *   efeito = Emax · D / (EC50 + D)   — teto = Emax; EC50 ilustrativo (ensina FORMA).
 *   • furosemida 20–80 mg VO (até 200–400 mg IV/infusão em IRC/resistência); VO ~50%.
 *   • bumetanida 0,5–2 mg (~40× mais potente que a furosemida; EC50 menor).
 *   • torasemida 10–20 mg (VO ~80%, meia-vida maior, curva mais "estável").
 *   IV desloca a curva à ESQUERDA (mais biodisponível); braking/resistência à DIREITA.
 */

// ─── helpers ───────────────────────────────────────────────────────────────

// clamp resiliente: NaN / null / ∞ → piso
function clampv(v, a, b) {
  var n = Number(v);
  if (!isFinite(n)) n = a;
  if (n < a) n = a;
  if (n > b) n = b;
  return n;
}

// merge sem mutar
function merge(a, b) {
  var o = {}, k;
  if (a) for (k in a) if (Object.prototype.hasOwnProperty.call(a, k)) o[k] = a[k];
  if (b) for (k in b) if (Object.prototype.hasOwnProperty.call(b, k)) o[k] = b[k];
  return o;
}

// ─── constantes fisiológicas calibradas ────────────────────────────────────
var OSM_CORTEX  = 300;    // osmolalidade do interstício cortical (mOsm/kg) — isosmótico ao plasma
var OSM_PAPILA  = 1200;   // osmolalidade máxima da papila (mOsm/kg) — o pico do gradiente
var GRAD_MAX    = OSM_PAPILA - OSM_CORTEX; // amplitude do gradiente corticomedular (mOsm)
var FRAC_NA_TAL = 0.25;   // fração do Na⁺ filtrado reabsorvida no TAL (~20–25%)
var NA_PLASMA   = 140;    // Na⁺ plasmático (mEq/L) — para a carga de Na
var TFG_N       = 120;    // TFG de referência (mL/min)
var CA_PARA_N   = 1.00;   // reabsorção paracelular relativa de Ca²⁺/Mg²⁺ no TAL (1 = normal)

// dose-resposta dos diuréticos de alça: EC50 (mg) e Emax (fração 0..1 da natriurese-teto)
// IV é a referência; VO some biodisponibilidade (desloca a curva à direita ⇔ EC50↑).
var FURO_EC50   = 25;     // furosemida: EC50 ~25 mg IV (faixa 20–80 mg VO; 200–400 mg IV resistência)
var FURO_EMAX   = 0.92;   // teto alto: bloqueia até ~92% do NaCl do TAL (diurético de teto ALTO)
var BUME_EC50   = 0.7;    // bumetanida: EC50 ~0,7 mg (~40× mais potente que a furosemida)
var BUME_EMAX   = 0.92;   // mesmo teto-classe (mesmo alvo NKCC2)
var TORA_EC50   = 12;     // torasemida: EC50 ~12 mg (faixa 10–20 mg)
var TORA_EMAX   = 0.92;   // mesmo teto-classe

var FURO_BIO_VO = 0.50;   // furosemida VO ~50% biodisponível (a errática); IV = 1.0
var TORA_BIO_VO = 0.80;   // torasemida VO ~80% (mais previsível)
var BUME_BIO_VO = 0.90;   // bumetanida VO ~80–90%

// natriurese-teto da alça (fração do Na⁺ filtrado que pode virar urina com bloqueio máximo)
var ALCA_NATR_CAP = 0.25; // diuréticos de alça entregam até ~25% do Na⁺ filtrado (POTENTE)

// braking/resistência: quanto a resistência diurética desloca a EC50 à direita (multiplicador)
var RESIST_EC50_MULT = 6; // resistência plena multiplica a EC50 por até ~6× (curva à direita)

// ─── dose-resposta sigmoide/hiperbólica  efeito = Emax·D/(EC50+D) ────────────
/**
 * doseResposta(D, EC50, Emax) → efeito ∈ [0, Emax)
 *   D    = dose EFETIVA (mg) — já corrigida por via (VO/IV) e por resistência
 *   EC50 = dose de meia-resposta (efeito = Emax/2)
 *   Emax = teto do efeito
 * Ensina a FORMA: teto (Emax), potência (EC50), saturação. Não é PK exata.
 */
function doseResposta(D, EC50, Emax) {
  var d  = clampv(D, 0, 1e9);
  var ec = clampv(EC50, 1e-9, 1e9);
  var em = clampv(Emax, 0, 1);
  var e = em * d / (ec + d);
  if (!isFinite(e) || e < 0) e = 0;
  if (e > em) e = em;
  return e;
}

// ─── função principal ───────────────────────────────────────────────────────
/**
 * alca(input) → estado completo da alça de Henle e da farmacologia do segmento.
 *
 * input: {
 *   TFG,        // TFG (mL/min; default 120)
 *   furo,       // dose de furosemida (mg; default 0)
 *   bume,       // dose de bumetanida (mg; default 0)
 *   tora,       // dose de torasemida (mg; default 0)
 *   via,        // 'iv' ou 'vo' (default 'iv') — VO some biodisponibilidade (curva à direita)
 *   resistencia // 0..1 grau de resistência diurética/braking (default 0) — desloca EC50↑
 * }
 *
 * A "dose efetiva" de cada droga = dose · biodisponibilidade(via). A EC50 efetiva sobe
 * com a resistência. O efeito-classe combinado (mesmo alvo NKCC2) é o MÁXIMO entre as
 * três curvas (não somam: bloqueiam o mesmo transportador).
 */
function alca(input) {
  var inp = input || {};

  var TFG  = clampv(inp.TFG  !== undefined ? inp.TFG  : TFG_N, 1, 200);
  var furo = clampv(inp.furo !== undefined ? inp.furo : 0, 0, 600);
  var bume = clampv(inp.bume !== undefined ? inp.bume : 0, 0, 20);
  var tora = clampv(inp.tora !== undefined ? inp.tora : 0, 0, 200);
  var resistencia = clampv(inp.resistencia !== undefined ? inp.resistencia : 0, 0, 1);
  var via = (inp.via === 'vo' || inp.via === 'VO' || inp.via === 0) ? 'vo' : 'iv';

  // biodisponibilidade por via (IV = 1.0; VO some absorção)
  var bioFuro = via === 'vo' ? FURO_BIO_VO : 1.0;
  var bioBume = via === 'vo' ? BUME_BIO_VO : 1.0;
  var bioTora = via === 'vo' ? TORA_BIO_VO : 1.0;

  // dose efetiva (mg) = dose · biodisponibilidade
  var furoEff = furo * bioFuro;
  var bumeEff = bume * bioBume;
  var toraEff = tora * bioTora;

  // EC50 efetiva: a resistência/braking desloca a curva à DIREITA (EC50↑)
  var resMult = 1 + resistencia * (RESIST_EC50_MULT - 1);
  var furoEC50e = FURO_EC50 * resMult;
  var bumeEC50e = BUME_EC50 * resMult;
  var toraEC50e = TORA_EC50 * resMult;

  // efeito de cada droga (fração de bloqueio do NKCC2)
  var eFuro = doseResposta(furoEff, furoEC50e, FURO_EMAX);
  var eBume = doseResposta(bumeEff, bumeEC50e, BUME_EMAX);
  var eTora = doseResposta(toraEff, toraEC50e, TORA_EMAX);

  // efeito-classe combinado: mesmo alvo (NKCC2) → o MÁXIMO, não a soma
  var bloqueioNKCC2 = Math.max(eFuro, eBume, eTora);
  if (!isFinite(bloqueioNKCC2) || bloqueioNKCC2 < 0) bloqueioNKCC2 = 0;
  if (bloqueioNKCC2 > 1) bloqueioNKCC2 = 1;

  // ─── 1. GRADIENTE CORTICOMEDULAR: o TAL é o motor; bloqueá-lo o ABOLE ───────
  // sem droga, o gradiente está cheio (papila ~1200). O bloqueio do NKCC2 derruba a
  // reabsorção de NaCl no TAL → o interstício medular perde sal → o pico cai.
  var gradFrac = 1 - bloqueioNKCC2;           // fração do gradiente preservada
  if (gradFrac < 0) gradFrac = 0;
  var osmPapila = OSM_CORTEX + GRAD_MAX * gradFrac; // novo pico medular (mOsm/kg)
  var gradiente = osmPapila - OSM_CORTEX;     // amplitude do gradiente (mOsm)

  // ─── 2/3. NaCl, natriurese e Ca/Mg (NKCC2 + voltagem luminal+) ─────────────
  var naFiltrado = TFG * NA_PLASMA / 1000;    // mEq/min de Na⁺ filtrado
  // Na⁺ que o TAL reabsorve normalmente (~25%), reduzido pelo bloqueio:
  var naReabTAL = naFiltrado * FRAC_NA_TAL * (1 - bloqueioNKCC2);
  // natriurese: o Na⁺ do TAL que escapa vira urina (a alça é potente — teto alto).
  // (o distal recaptura pouco do volume da alça: por isso o teto é ALTO ≠ proximal)
  var natriurese = naFiltrado * ALCA_NATR_CAP * bloqueioNKCC2; // mEq/min entregue
  if (!isFinite(natriurese) || natriurese < 0) natriurese = 0;

  // Ca²⁺/Mg²⁺ paracelular: depende da voltagem luminal+ gerada pela reciclagem do K⁺.
  // bloquear o NKCC2 mata a voltagem → reabsorção paracelular cai → CALCIÚRIA + MAGNESIÚRIA.
  var caMgReabFrac = CA_PARA_N * (1 - bloqueioNKCC2); // reabsorção relativa de Ca/Mg
  if (caMgReabFrac < 0) caMgReabFrac = 0;
  var caMgPerda = bloqueioNKCC2;              // perda urinária relativa de Ca²⁺/Mg²⁺ (0..1)

  // ─── água livre: a alça gera água livre (dilui no TAL impermeável à água) ───
  // sem droga, o TAL produz água livre (líquido sai diluído). Bloqueá-lo abole a
  // capacidade de DILUIR (e de concentrar, via gradiente): clearance de água livre cai.
  var aguaLivre = 1 - bloqueioNKCC2;          // capacidade relativa de gerar água livre

  // ─── braking/resistência: a curva deslocada à direita ──────────────────────
  var braking = clampv(resistencia, 0, 1);

  // ─── via e biodisponibilidade (a pérola IV > VO) ───────────────────────────
  var bioVigente = via === 'vo' ? FURO_BIO_VO : 1.0; // a furosemida é a referência da pérola

  // ─── regime (a leitura do módulo) ──────────────────────────────────────────
  var regime;
  if (bloqueioNKCC2 < 0.05)                            regime = 'normal';
  else if (resistencia >= 0.5 && bloqueioNKCC2 < 0.5) regime = 'resistencia_diuretica';
  else if (via === 'vo' && (furo > 0))                regime = 'alca_vo';
  else                                                regime = 'alca_iv';

  // a droga "ativa" (a de maior efeito) — para a leitura/pérola
  var ativa = 'nenhuma';
  if (bloqueioNKCC2 >= 0.05) {
    if (eFuro >= eBume && eFuro >= eTora) ativa = 'furosemida';
    else if (eBume >= eTora)              ativa = 'bumetanida';
    else                                 ativa = 'torasemida';
  }

  return {
    // entradas efetivas
    TFG: TFG, furo: furo, bume: bume, tora: tora, via: via, resistencia: resistencia,
    // dose efetiva e EC50 efetiva
    furoEff: furoEff, bumeEff: bumeEff, toraEff: toraEff,
    furoEC50e: furoEC50e, bumeEC50e: bumeEC50e, toraEC50e: toraEC50e,
    bioVigente: bioVigente, resMult: resMult,
    // dose-resposta
    eFuro: eFuro, eBume: eBume, eTora: eTora, bloqueioNKCC2: bloqueioNKCC2,
    furoEmax: FURO_EMAX, bumeEmax: BUME_EMAX, toraEmax: TORA_EMAX,
    furoEC50: FURO_EC50, bumeEC50: BUME_EC50, toraEC50: TORA_EC50,
    // gradiente corticomedular
    osmCortex: OSM_CORTEX, osmPapila: osmPapila, gradiente: gradiente, gradFrac: gradFrac,
    gradMax: GRAD_MAX,
    // Na, natriurese
    naFiltrado: naFiltrado, naReabTAL: naReabTAL, fracNaTAL: FRAC_NA_TAL, natriurese: natriurese,
    // Ca/Mg paracelular
    caMgReabFrac: caMgReabFrac, caMgPerda: caMgPerda,
    // água livre
    aguaLivre: aguaLivre,
    // braking
    braking: braking,
    // leitura
    regime: regime, ativa: ativa
  };
}

// ─── layout: o GRADIENTE CORTICOMEDULAR (perfil osmótico córtex→papila) ───────
/**
 * gradienteLayout(state, W, H)
 * Desenha o perfil de osmolalidade do córtex (~300) à papila (osmPapila do estado).
 * X = profundidade (0 = córtex, 1 = papila), Y = osmolalidade (mOsm/kg). Devolve a
 * polilinha do gradiente e marcadores. A UI só liga os pontos (o motor manda no pixel).
 *   pts: [{depth, osm, x, y}]  ·  papilaY · cortexY · axis.
 */
function gradienteLayout(state, W, H) {
  state = state || {};
  W = clampv(W, 200, 100000);
  H = clampv(H, 120, 100000);
  var r = alca(state);

  var padL = 54, padR = 16, padT = 18, padB = 38;
  var baseY = H - padB;
  var N = 60;
  var yMax = OSM_PAPILA * 1.08;

  var pxX = (W - padL - padR) / 1;     // depth 0..1
  var pxY = (baseY - padT) / yMax;

  function X(d) { return padL + clampv(d, 0, 1) * pxX; }
  function Y(o) { return baseY - clampv(o, 0, yMax) * pxY; }

  // perfil: cresce do córtex (300) à papila (osmPapila) — curva côncava (acelera na medula)
  var pts = [], i, depth, osm;
  for (i = 0; i <= N; i++) {
    depth = i / N;
    // forma côncava: o gradiente se intensifica na medula profunda (depth^1.4)
    osm = OSM_CORTEX + (r.osmPapila - OSM_CORTEX) * Math.pow(depth, 1.4);
    pts.push({ depth: depth, osm: osm, x: X(depth), y: Y(osm) });
  }
  var cortexY = Y(OSM_CORTEX);
  var papilaY = Y(r.osmPapila);
  var papilaMaxY = Y(OSM_PAPILA);   // o pico normal (referência fantasma)

  return {
    W: W, H: H, padL: padL, padR: padR, padT: padT, padB: padB, baseY: baseY,
    yMax: yMax, pxX: pxX, pxY: pxY,
    osmCortex: OSM_CORTEX, osmPapila: r.osmPapila, gradiente: r.gradiente,
    axis: { x0: padL, y0: padT, xEnd: W - padR, yEnd: baseY },
    pts: pts, cortexY: cortexY, papilaY: papilaY, papilaMaxY: papilaMaxY
  };
}

// ─── layout: a curva DOSE-RESPOSTA da natriurese  efeito = Emax·D/(EC50+D) ────
/**
 * doseRespostaLayout(EC50, Emax, dMax, W, H, curD, EC50b)
 * Varre a dose de 0 a dMax; em cada ponto computa efeito = Emax·D/(EC50+D). Quando
 * EC50b é dado (>0), desenha uma SEGUNDA curva deslocada à direita (resistência/braking).
 *   pts: [{d,e,x,y}]  ·  pts2 (curva deslocada ou [])  ·  ec50X · emaxY · cur · axis.
 */
function doseRespostaLayout(EC50, Emax, dMax, W, H, curD, EC50b) {
  W = clampv(W, 160, 100000);
  H = clampv(H, 100, 100000);
  var ec = clampv(EC50, 1e-6, 1e9);
  var em = clampv(Emax, 0.01, 1);
  var dM = clampv(dMax, ec * 2, 1e9);
  var cd = clampv(curD, 0, dM);
  var ec2 = (EC50b !== undefined && EC50b !== null && Number(EC50b) > 0) ? clampv(EC50b, 1e-6, 1e9) : 0;

  var padL = 40, padR = 12, padT = 14, padB = 28;
  var baseY = H - padB;
  var N = 50;
  var yMax = em * 1.08;

  var pxX = (W - padL - padR) / dM;
  var pxY = (baseY - padT) / yMax;

  function X(d) { return padL + clampv(d, 0, dM) * pxX; }
  function Y(e) { return baseY - clampv(e, 0, yMax) * pxY; }

  var pts = [], pts2 = [], i, d, e;
  for (i = 0; i <= N; i++) {
    d = dM * i / N;
    e = doseResposta(d, ec, em);
    pts.push({ d: d, e: e, x: X(d), y: Y(e) });
    if (ec2 > 0) {
      var e2 = doseResposta(d, ec2, em);
      pts2.push({ d: d, e: e2, x: X(d), y: Y(e2) });
    }
  }
  var ec50X = X(ec);
  var ec50bX = ec2 > 0 ? X(ec2) : 0;
  var emaxY = Y(em);
  var eCur = doseResposta(cd, ec, em);
  var cur = { d: cd, e: eCur, x: X(cd), y: Y(eCur) };

  return {
    W: W, H: H, padL: padL, padR: padR, padT: padT, padB: padB, baseY: baseY,
    EC50: ec, EC50b: ec2, Emax: em, dMax: dM, yMax: yMax, pxX: pxX, pxY: pxY,
    axis: { x0: padL, y0: padT, xEnd: W - padR, yEnd: baseY },
    pts: pts, pts2: pts2, ec50X: ec50X, ec50bX: ec50bX, emaxY: emaxY, cur: cur
  };
}

// ─── exports ────────────────────────────────────────────────────────────────
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    alca: alca,
    doseResposta: doseResposta,
    gradienteLayout: gradienteLayout,
    doseRespostaLayout: doseRespostaLayout,
    clampv: clampv,
    merge: merge,
    CONST: {
      OSM_CORTEX: OSM_CORTEX, OSM_PAPILA: OSM_PAPILA, GRAD_MAX: GRAD_MAX,
      FRAC_NA_TAL: FRAC_NA_TAL, NA_PLASMA: NA_PLASMA, TFG_N: TFG_N, CA_PARA_N: CA_PARA_N,
      FURO_EC50: FURO_EC50, FURO_EMAX: FURO_EMAX, BUME_EC50: BUME_EC50, BUME_EMAX: BUME_EMAX,
      TORA_EC50: TORA_EC50, TORA_EMAX: TORA_EMAX,
      FURO_BIO_VO: FURO_BIO_VO, TORA_BIO_VO: TORA_BIO_VO, BUME_BIO_VO: BUME_BIO_VO,
      ALCA_NATR_CAP: ALCA_NATR_CAP, RESIST_EC50_MULT: RESIST_EC50_MULT
    }
  };
}
