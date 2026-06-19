'use strict';
/*
 * FILTRA · M7 — TCD: NCC, manejo de Ca²⁺, o segmento diluidor distal
 *               e a FARMACOLOGIA do segmento (§8: PIVÔ) — os TIAZÍDICOS.
 * ---------------------------------------------------------------------------
 * Engine PURO, determinístico. Roda em Node e inline no HTML.
 * Regra-zero: o motor manda no pixel.
 *
 * Tese (o erro a corrigir): "tudo é igual no túbulo".
 * Verdade: o TCD AJUSTA FINO. O NCC (Na-Cl apical) reabsorve só ~5% do Na⁺ filtrado;
 * o segmento é IMPERMEÁVEL à água (continua DILUINDO). Por isso o tiazídico é um
 * diurético MODESTO (≠ alça). E há o PARADOXO DO Ca²⁺: bloquear o NCC faz a célula
 * perder Na⁺ → ↑ a troca basolateral Na/Ca → ↑ reabsorção de Ca²⁺ → o Ca²⁺ URINÁRIO
 * CAI (oposto da alça). Quatro mecanismos:
 *   1. NCC NO TCD INICIAL — reabsorve ~5% do Na⁺ filtrado, SEM água (dilui mais ainda).
 *      Teto natriurético BAIXO: tiazídico é diurético modesto. Perde eficácia em TFG<30.
 *   2. PARADOXO DO Ca²⁺ — bloqueio do NCC → célula perde Na⁺ → ↑ Na/Ca basolateral (NCX)
 *      → ↑ reabsorção de Ca²⁺ → Ca URINÁRIO CAI. Trata litíase cálcica/hipercalciúria e
 *      osteoporose; CAUSA hipercalcemia (efeito adverso).
 *   3. SEGMENTO DILUIDOR DISTAL — impermeável à água: reabsorve Na sem água → afina o
 *      filtrado. Bloqueá-lo prejudica a diluição → risco de HIPONATREMIA (clássica na idosa).
 *   4. EFICÁCIA cai quando TFG<30 (pouca carga distal entregue; menos fármaco filtrado).
 *
 * Farmacologia (§8 — doses REAIS, efeito computado por dose-resposta sigmoide):
 *   efeito = Emax · D / (EC50 + D)   — teto = Emax; EC50 ilustrativo (ensina FORMA).
 *   • hidroclorotiazida 25–50 mg/dia VO → bloqueia o NCC → natriurese modesta + Ca urinário↓.
 *   • clortalidona 12,5–25 mg/dia VO → meia-vida longa, MAIS potente (EC50 menor, Emax maior).
 *   • indapamida 1,5–2,5 mg/dia VO → tiazídico-like, potente em baixa dose.
 * As DUAS curvas vs dose — natriurese (sobe, teto BAIXO) e Ca urinário (CAI) — divergem:
 * essa divergência É a pérola do módulo.
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
var TFG_N        = 120;    // TFG de referência (mL/min)
var NA_PLASMA    = 140;    // Na⁺ plasmático (mEq/L) — para a carga filtrada de Na
var FRAC_NA_NCC  = 0.05;   // fração do Na⁺ filtrado reabsorvida pelo NCC no TCD (~5%) — MODESTO
var CA_URIN_BASAL = 200;   // cálcio urinário basal (mg/dia) — referência
var NA_SERICO_N  = 140;    // Na⁺ sérico de referência (mEq/L)

// dose-resposta: EC50 ilustrativos (mg) e Emax (fração 0..1 do efeito-segmento)
// hidroclorotiazida (HCTZ): referência; clortalidona (CTD) mais potente; indapamida (IND) potente em baixa dose
var HCTZ_EC50 = 25;        // HCTZ: EC50 ~25 mg (faixa 25–50 mg)
var HCTZ_EMAX = 0.85;      // teto do bloqueio do NCC pela HCTZ
var CTD_EC50  = 12.5;      // clortalidona: EC50 ~12,5 mg (faixa 12,5–25 mg) — mais potente
var CTD_EMAX  = 0.95;      // teto maior (meia-vida longa, efeito mais completo)
var IND_EC50  = 1.5;       // indapamida: EC50 ~1,5 mg (faixa 1,5–2,5 mg) — potente em baixa dose
var IND_EMAX  = 0.90;      // teto alto em mg baixos

// o TETO NATRIURÉTICO do tiazídico é BAIXO (só ~5% do Na é alvo): a fração do Na filtrado
// que o tiazídico no máximo entrega como natriurese extra (modesto vs alça, que ataca ~25%).
var TIAZ_NATR_CAP = 0.05;  // teto natriurético: ~5% do Na filtrado (a alça chega a ~25%)

// paradoxo do Ca: o bloqueio do NCC reduz o Ca urinário em até ~50% no máximo (hipocalciúria)
var CA_QUEDA_MAX = 0.50;   // queda fracional máxima do Ca urinário (paradoxo: Ca urinário CAI)

// limiar de TFG abaixo do qual o tiazídico perde eficácia (mL/min)
var TFG_FALHA = 30;

// ─── dose-resposta sigmoide/hiperbólica  efeito = Emax·D/(EC50+D) ────────────
/**
 * doseResposta(D, EC50, Emax) → efeito ∈ [0, Emax)
 *   D    = dose (mg)
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

// ─── fator de eficácia pela TFG: cai quando TFG < 30 ─────────────────────────
/**
 * eficaciaTFG(tfg) → fator ∈ [0,1]: ~1 acima de 30, despenca abaixo (curva suave).
 * O tiazídico precisa ser filtrado e precisa de carga distal — em TFG baixa, falha.
 */
function eficaciaTFG(tfg) {
  var t = clampv(tfg, 0, 200);
  // sigmoide suave centrada em ~TFG_FALHA: ~0 em TFG muito baixa, →1 acima de ~45
  var f = 1 / (1 + Math.exp(-(t - TFG_FALHA) / 6));
  if (!isFinite(f) || f < 0) f = 0;
  if (f > 1) f = 1;
  return f;
}

// ─── função principal ───────────────────────────────────────────────────────
/**
 * distal(input) → estado completo do TCD e da farmacologia tiazídica.
 *
 * input: {
 *   TFG,        // TFG (mL/min; default 120)
 *   hctz,       // dose de hidroclorotiazida (mg; default 0)
 *   ctd,        // dose de clortalidona (mg; default 0)
 *   indap,      // dose de indapamida (mg; default 0)
 *   caUrinBasal,// cálcio urinário basal (mg/dia; default 200) — ↑ na hipercalciúria/litíase
 *   alca        // diurético de alça associado? (true = bloqueio sequencial alça+tiazida)
 * }
 */
function distal(input) {
  var inp = input || {};

  var TFG    = clampv(inp.TFG    !== undefined ? inp.TFG    : TFG_N, 1, 200);
  var hctz   = clampv(inp.hctz   !== undefined ? inp.hctz   : 0, 0, 500);
  var ctd    = clampv(inp.ctd    !== undefined ? inp.ctd    : 0, 0, 200);
  var indap  = clampv(inp.indap  !== undefined ? inp.indap  : 0, 0, 50);
  var caUrinBasal = clampv(inp.caUrinBasal !== undefined ? inp.caUrinBasal : CA_URIN_BASAL, 0, 2000);
  var alca   = (inp.alca === true || inp.alca === 1 || inp.alca === 'sim') ? true : false;

  // ─── dose-resposta dos três tiazídicos (efeito ∈ [0, Emax)) ────────────────
  var eHctz = doseResposta(hctz,  HCTZ_EC50, HCTZ_EMAX);   // bloqueio do NCC pela HCTZ
  var eCtd  = doseResposta(ctd,   CTD_EC50,  CTD_EMAX);    // bloqueio pela clortalidona
  var eInd  = doseResposta(indap, IND_EC50,  IND_EMAX);    // bloqueio pela indapamida

  // bloqueio EFETIVO do NCC: combinação não-aditiva dos três (frações independentes)
  var bloqNCC = 1 - (1 - eHctz) * (1 - eCtd) * (1 - eInd);
  if (bloqNCC < 0) bloqNCC = 0; if (bloqNCC > 1) bloqNCC = 1;

  // fator de eficácia pela TFG (cai em TFG<30)
  var fTFG = eficaciaTFG(TFG);
  // bloqueio NCC efetivamente entregue (reduzido pela TFG baixa)
  var bloqEff = bloqNCC * fTFG;

  // ─── 1. NCC: reabsorção MODESTA de Na (~5%), SEM água ──────────────────────
  var naFiltrado = TFG * NA_PLASMA / 1000;            // mEq/min
  // fração do Na filtrado reabsorvida pelo NCC (basal ~5%), reduzida pelo bloqueio
  var fracNaNcc = FRAC_NA_NCC * (1 - bloqEff);        // fração efetivamente reabsorvida no NCC
  var naReabNcc = naFiltrado * fracNaNcc;             // mEq/min reabsorvido pelo NCC
  // Na que o NCC normalmente recuperaria mas que o tiazídico deixa escapar:
  var naEscapaNcc = naFiltrado * FRAC_NA_NCC * bloqEff;

  // ─── natriurese do tiazídico: teto BAIXO (a alça é o grande alvo, não o TCD) ─
  // a natriurese final = o Na que escapa do NCC, capeado pelo teto natriurético baixo.
  // o coletor recaptura parte; mas o ponto didático é o TETO BAIXO vs a alça.
  var natriurese = naFiltrado * TIAZ_NATR_CAP * bloqEff; // mEq/min — modesta por construção
  // bloqueio sequencial alça+tiazida: sinergia — o tiazida bloqueia o "escape" da alça,
  // somando uma natriurese extra (efeito clínico de potencializar a alça).
  if (alca) natriurese += naFiltrado * 0.04 * bloqEff;   // sinergia do bloqueio sequencial
  if (!isFinite(natriurese) || natriurese < 0) natriurese = 0;

  // ─── 2. PARADOXO DO Ca²⁺: o Ca URINÁRIO CAI com o tiazídico ────────────────
  // bloqueio do NCC → célula perde Na → ↑ NCX basolateral (Na/Ca) → ↑ reabsorção de Ca
  // → o Ca urinário CAI (hipocalciúria). Oposto da alça (que AUMENTA o Ca urinário).
  var quedaCaFrac = CA_QUEDA_MAX * bloqEff;          // fração de queda do Ca urinário
  if (quedaCaFrac < 0) quedaCaFrac = 0; if (quedaCaFrac > CA_QUEDA_MAX) quedaCaFrac = CA_QUEDA_MAX;
  var caUrinario = caUrinBasal * (1 - quedaCaFrac);  // mg/dia — CAI com a dose (paradoxo)
  if (!isFinite(caUrinario) || caUrinario < 0) caUrinario = 0;
  // tendência à HIPERcalcemia (efeito adverso): proporcional à retenção de Ca
  var tendHipercalcemia = quedaCaFrac;               // 0..CA_QUEDA_MAX (proxy)

  // ─── 3. SEGMENTO DILUIDOR: risco de HIPONATREMIA ───────────────────────────
  // bloquear o diluidor distal prejudica a clearance de água livre → risco de Na sérico↓.
  // estimamos uma queda do Na sérico proporcional ao bloqueio (didática, autolimitada).
  var deltaNa = -8.0 * bloqEff;                      // mEq/L de queda estimada (didático)
  var naSerico = clampv(NA_SERICO_N + deltaNa, 120, 145);
  var riscoHipoNa = bloqEff;                          // 0..1 — risco relativo de hiponatremia

  // ─── 4. carga distal / falência em TFG baixa ───────────────────────────────
  // eficácia geral do tiazídico (0..1): combina bloqueio molecular e a TFG.
  var eficacia = bloqEff;                             // já inclui o fator TFG
  var falhaTFG = TFG < TFG_FALHA;                     // sinalizador: TFG<30 → tiazídico falha

  // ─── regime (a leitura do módulo) ──────────────────────────────────────────
  var regime;
  if (bloqNCC > 0.1 && falhaTFG)                regime = 'tiazidico_ineficaz_tfg_baixa';
  else if (alca && bloqNCC > 0.1)               regime = 'bloqueio_sequencial';
  else if (bloqEff > 0.1 && caUrinBasal > 300)  regime = 'tiazidico_hipercalciuria';
  else if (bloqEff > 0.1 && naSerico < 135)     regime = 'tiazidico_hiponatremia';
  else if (bloqEff > 0.1)                       regime = 'tiazidico';
  else                                          regime = 'normal';

  // pérola: a DIVERGÊNCIA — natriurese SOBE (modesta) enquanto o Ca urinário CAI.
  var paradoxoCa = (natriurese > 0 && caUrinario < caUrinBasal); // Na↑ mas Ca↓

  return {
    // entradas efetivas
    TFG: TFG, hctz: hctz, ctd: ctd, indap: indap, caUrinBasal: caUrinBasal, alca: alca,
    // dose-resposta
    eHctz: eHctz, eCtd: eCtd, eInd: eInd, bloqNCC: bloqNCC, bloqEff: bloqEff, fTFG: fTFG,
    hctzEC50: HCTZ_EC50, hctzEmax: HCTZ_EMAX, ctdEC50: CTD_EC50, ctdEmax: CTD_EMAX,
    indEC50: IND_EC50, indEmax: IND_EMAX,
    // Na / NCC / natriurese
    naFiltrado: naFiltrado, fracNaNcc: fracNaNcc, naReabNcc: naReabNcc, naEscapaNcc: naEscapaNcc,
    natriurese: natriurese, fracNaNccBasal: FRAC_NA_NCC,
    // Ca (o paradoxo)
    caUrinario: caUrinario, quedaCaFrac: quedaCaFrac, tendHipercalcemia: tendHipercalcemia,
    paradoxoCa: paradoxoCa,
    // diluidor / Na sérico
    naSerico: naSerico, deltaNa: deltaNa, riscoHipoNa: riscoHipoNa,
    // eficácia / TFG
    eficacia: eficacia, falhaTFG: falhaTFG, tfgFalha: TFG_FALHA,
    // regime
    regime: regime
  };
}

// ─── layout: as DUAS curvas dose-resposta vs DOSE ────────────────────────────
/**
 * duasCurvasLayout(state, W, H)
 * Varre a dose de HIDROCLOROTIAZIDA de 0 a dMax (mg); em cada ponto computa, via o engine,
 * a NATRIURESE (sobe, teto BAIXO) e o Ca URINÁRIO (CAI). Devolve DUAS polilinhas (a UI só
 * liga os pontos — o motor manda no pixel). X=dose HCTZ (mg), Y normalizado [0..1].
 * A DIVERGÊNCIA entre as curvas É a pérola do módulo.
 *   natr: [{d,v,x,y}]  ·  ca: [{d,v,x,y}]  ·  curN/curCa (ponto da dose atual) · axis.
 */
function duasCurvasLayout(state, W, H) {
  state = state || {};
  W = clampv(W, 200, 100000);
  H = clampv(H, 120, 100000);

  var base = merge(state, {});
  var dMax = 100, N = 60;

  // normalizadores: natriurese máxima possível e Ca urinário basal (do estado)
  var rRef = distal(base);
  var caBasal = rRef.caUrinBasal > 0 ? rRef.caUrinBasal : CA_URIN_BASAL;
  var natrMax = rRef.naFiltrado * TIAZ_NATR_CAP * 1.5; // folga para a sinergia da alça
  if (!isFinite(natrMax) || natrMax <= 0) natrMax = 1;

  var padL = 50, padR = 16, padT = 18, padB = 38;
  var baseY = H - padB;
  var pxX = (W - padL - padR) / dMax;
  var pxY = (baseY - padT);

  function X(d) { return padL + clampv(d, 0, dMax) * pxX; }
  function Yn(frac) { return baseY - clampv(frac, 0, 1) * pxY; } // frac normalizado [0..1]

  var natr = [], ca = [], i, d, r, natrFrac, caFrac;
  for (i = 0; i <= N; i++) {
    d = dMax * i / N;
    r = distal(merge(base, { hctz: d }));
    natrFrac = natrMax > 0 ? r.natriurese / natrMax : 0;
    if (natrFrac > 1) natrFrac = 1;
    caFrac = caBasal > 0 ? r.caUrinario / caBasal : 0;  // cai de 1 para baixo
    if (caFrac > 1) caFrac = 1; if (caFrac < 0) caFrac = 0;
    natr.push({ d: d, v: r.natriurese, frac: natrFrac, x: X(d), y: Yn(natrFrac) });
    ca.push({   d: d, v: r.caUrinario, frac: caFrac,   x: X(d), y: Yn(caFrac) });
  }

  // ponto da dose atual de HCTZ
  var dCur = clampv(state.hctz !== undefined ? state.hctz : 0, 0, dMax);
  var rCur = distal(merge(base, { hctz: dCur }));
  var natrCurFrac = natrMax > 0 ? rCur.natriurese / natrMax : 0; if (natrCurFrac > 1) natrCurFrac = 1;
  var caCurFrac = caBasal > 0 ? rCur.caUrinario / caBasal : 0; if (caCurFrac > 1) caCurFrac = 1;
  var curN  = { d: dCur, v: rCur.natriurese, x: X(dCur), y: Yn(natrCurFrac) };
  var curCa = { d: dCur, v: rCur.caUrinario, x: X(dCur), y: Yn(caCurFrac) };

  return {
    W: W, H: H, padL: padL, padR: padR, padT: padT, padB: padB, baseY: baseY,
    dMax: dMax, natrMax: natrMax, caBasal: caBasal, pxX: pxX, pxY: pxY,
    axis: { x0: padL, y0: padT, xEnd: W - padR, yEnd: baseY },
    natr: natr, ca: ca, curN: curN, curCa: curCa
  };
}

// ─── layout: a curva DOSE-RESPOSTA sigmoide  efeito = Emax·D/(EC50+D) ─────────
/**
 * doseRespostaLayout(EC50, Emax, dMax, W, H, curD)
 * Varre a dose de 0 a dMax; em cada ponto computa efeito = Emax·D/(EC50+D).
 * Marca o EC50 (onde efeito = Emax/2), o teto Emax e a dose atual curD.
 *   pts: [{d, e, x, y}]  ·  ec50X · emaxY · cur (ponto da dose atual) · axis.
 */
function doseRespostaLayout(EC50, Emax, dMax, W, H, curD) {
  W = clampv(W, 160, 100000);
  H = clampv(H, 100, 100000);
  var ec = clampv(EC50, 1e-6, 1e9);
  var em = clampv(Emax, 0.01, 1);
  var dM = clampv(dMax, ec * 2, 1e9);
  var cd = clampv(curD, 0, dM);

  var padL = 40, padR = 12, padT = 14, padB = 28;
  var baseY = H - padB;
  var N = 50;
  var yMax = em * 1.08;

  var pxX = (W - padL - padR) / dM;
  var pxY = (baseY - padT) / yMax;

  function X(d) { return padL + clampv(d, 0, dM) * pxX; }
  function Y(e) { return baseY - clampv(e, 0, yMax) * pxY; }

  var pts = [], i, d, e;
  for (i = 0; i <= N; i++) {
    d = dM * i / N;
    e = doseResposta(d, ec, em);
    pts.push({ d: d, e: e, x: X(d), y: Y(e) });
  }
  var ec50X = X(ec);
  var emaxY = Y(em);
  var eCur = doseResposta(cd, ec, em);
  var cur = { d: cd, e: eCur, x: X(cd), y: Y(eCur) };

  return {
    W: W, H: H, padL: padL, padR: padR, padT: padT, padB: padB, baseY: baseY,
    EC50: ec, Emax: em, dMax: dM, yMax: yMax, pxX: pxX, pxY: pxY,
    axis: { x0: padL, y0: padT, xEnd: W - padR, yEnd: baseY },
    pts: pts, ec50X: ec50X, emaxY: emaxY, cur: cur
  };
}

// ─── exports ────────────────────────────────────────────────────────────────
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    distal: distal,
    doseResposta: doseResposta,
    eficaciaTFG: eficaciaTFG,
    duasCurvasLayout: duasCurvasLayout,
    doseRespostaLayout: doseRespostaLayout,
    clampv: clampv,
    merge: merge,
    CONST: {
      TFG_N: TFG_N, NA_PLASMA: NA_PLASMA, FRAC_NA_NCC: FRAC_NA_NCC, CA_URIN_BASAL: CA_URIN_BASAL,
      NA_SERICO_N: NA_SERICO_N,
      HCTZ_EC50: HCTZ_EC50, HCTZ_EMAX: HCTZ_EMAX, CTD_EC50: CTD_EC50, CTD_EMAX: CTD_EMAX,
      IND_EC50: IND_EC50, IND_EMAX: IND_EMAX,
      TIAZ_NATR_CAP: TIAZ_NATR_CAP, CA_QUEDA_MAX: CA_QUEDA_MAX, TFG_FALHA: TFG_FALHA
    }
  };
}
