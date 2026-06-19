'use strict';
/*
 * FILTRA · M4 — Clearance: medir a função, e por que a creatinina MENTE
 * ---------------------------------------------------------------------------
 * Engine PURO, determinístico. Roda em Node e inline no HTML.
 * Regra-zero: o motor manda no pixel.
 *
 * Tese (o erro a corrigir): "creatinina = função".
 * Verdade: a creatinina é uma SOMBRA atrasada e distorcida da TFG. São CINCO
 * mentiras, cada uma um mecanismo:
 *   1. HIPÉRBOLE — no estado estável geração = excreção ⇒ P_Cr ∝ 1/TFG. A relação
 *      é uma hipérbole: a "faixa cega" esconde a primeira metade da perda de TFG.
 *   2. SECREÇÃO TUBULAR — a creatinina é filtrada E secretada (~10–20%); o clearance
 *      de creatinina SUPERESTIMA a TFG (pior em TFG baixa). Drogas (cimetidina,
 *      trimetoprima) bloqueiam a secreção → Cr sobe SEM lesão.
 *   3. MASSA MUSCULAR — geração ∝ massa muscular. Idoso/caquético → geração baixa →
 *      Cr "normal" com TFG ruim (a creatinina mente).
 *   4. NÃO-EQUILÍBRIO (LRA) — quando a TFG despenca, a Cr ATRASA: sobe dia a dia
 *      até o novo platô. A TFG real é muito pior do que a Cr mostra em tempo real.
 *   5. CISTATINA C — produzida por todas as células nucleadas, independe de massa
 *      muscular → melhor marcador em baixa massa.
 *
 * Fórmulas-mãe:
 *   clearance: C_x = (U_x · V̇) / P_x        (inulina: C = TFG, padrão-ouro)
 *   geração de Cr ∝ massa muscular:  gen = GEN_N · muscleFactor   (mg/min equiv.)
 *   secreção: ClCr_potencial = TFG · (1 + secFrac)   (Cr filtrada E secretada)
 *   estado estável:  P_Cr_ss = gen / (TFG · (1 + secFrac_efetiva))   ⇒ hipérbole
 *   não-equilíbrio:  P_Cr(t) = P_Cr_ss + (P_Cr0 - P_Cr_ss)·exp(-t/τ),  τ ∝ 1/TFG
 *   eGFR (CKD-EPI-like a partir de Cr) e estadiamento DRC (G1–G5).
 *   cistatina C: gen independe de músculo → eGFR_cys mais fiel em baixa massa.
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
var GFR_N      = 120;    // TFG "normal" de referência (mL/min)
var SEC_N      = 0.15;   // fração de secreção tubular da creatinina (~15%)
var SEC_BLOCK  = 0.85;   // quanto a droga (cimetidina/trimetoprima) bloqueia a secreção
// GEN: geração de creatinina calibrada para que, em TFG=120, músculo normal,
// secreção 0.15, a P_Cr_ss caia em ~0.9 mg/dL. (P_Cr_ss = GEN / (TFG·(1+SEC)))
//   GEN = 0.9 · 120 · 1.15 ≈ 124.2  (unidade arbitrária mg/dL·mL/min)
var GEN_N      = 124.2;  // geração de referência (músculo=1, sexo=masc)
var PCR_N      = 0.9;    // P_Cr de referência calibrada
var TAU_N      = 0.55;   // constante de tempo (dias) da subida da Cr em TFG normal
var TAU_SPAN   = 9.0;    // a τ alonga conforme a TFG cai (a Cr atrasa MAIS na LRA grave)
var CYS_N      = 0.85;   // cistatina C de referência (mg/L) em TFG 120

// fatores de músculo/sexo (escala relativa de geração)
var MUSC_MIN   = 0.35;   // caquético/idosa
var MUSC_MAX   = 1.7;    // musculoso
var SEX_F_FACT = 0.80;   // mulher gera menos creatinina que homem (~−20%)

// ─── clearance genérico  C_x = (U_x · V̇)/P_x  ──────────────────────────────
/**
 * clearance(Ux, Vdot, Px) → depuração (mL/min)
 *   Ux   = concentração urinária do soluto
 *   Vdot = fluxo urinário (mL/min)
 *   Px   = concentração plasmática do soluto
 * Para a inulina (livre, não reabsorvida nem secretada) C = TFG (padrão-ouro).
 */
function clearance(Ux, Vdot, Px) {
  var u = clampv(Ux, 0, 1e9);
  var v = clampv(Vdot, 0, 1e6);
  var p = clampv(Px, 1e-9, 1e9);
  var c = (u * v) / p;
  if (!isFinite(c) || c < 0) c = 0;
  return c;
}

// ─── geração de creatinina ∝ massa muscular ────────────────────────────────
function generation(muscle, sexF) {
  var m = clampv(muscle, MUSC_MIN, MUSC_MAX);
  var s = sexF ? SEX_F_FACT : 1;
  return GEN_N * m * s;
}

// ─── secreção efetiva (bloqueada por droga) ────────────────────────────────
function secFracEff(drug) {
  var d = clampv(drug, 0, 1);          // 0=sem droga, 1=bloqueio máximo
  return SEC_N * (1 - SEC_BLOCK * d);  // a droga derruba a fração secretada
}

// ─── eGFR estimado a partir da creatinina (CKD-EPI-like) ───────────────────
/**
 * egfrFromCr(pcr, age, sexF) → eGFR (mL/min/1,73m²)
 * Forma CKD-EPI-2009-like simplificada: eGFR = 142 · min(Cr/κ,1)^α · max(Cr/κ,1)^-1.2
 *                                              · 0.9938^age · (1.012 se mulher)
 * κ=0.7 (F)/0.9 (M); α=-0.241 (F)/-0.302 (M).
 */
function egfrFromCr(pcr, age, sexF) {
  var cr = clampv(pcr, 0.1, 25);
  var a  = clampv(age, 18, 110);
  var kappa = sexF ? 0.7 : 0.9;
  var alpha = sexF ? -0.241 : -0.302;
  var r = cr / kappa;
  var lo = Math.pow(Math.min(r, 1), alpha);
  var hi = Math.pow(Math.max(r, 1), -1.200);
  var e = 142 * lo * hi * Math.pow(0.9938, a) * (sexF ? 1.012 : 1);
  if (!isFinite(e) || e < 0) e = 0;
  return e;
}

// ─── eGFR a partir da cistatina C (independe de músculo) ───────────────────
/**
 * egfrFromCys(cys, age) → eGFR (mL/min/1,73m²) — CKD-EPI-cistatina-like (sem sexo).
 */
function egfrFromCys(cys, age) {
  var c = clampv(cys, 0.3, 12);
  var a = clampv(age, 18, 110);
  var r = c / 0.8;
  var lo = Math.pow(Math.min(r, 1), -0.499);
  var hi = Math.pow(Math.max(r, 1), -1.328);
  var e = 133 * lo * hi * Math.pow(0.996, a);
  if (!isFinite(e) || e < 0) e = 0;
  return e;
}

// ─── estágio de DRC (KDIGO G1–G5) por TFG ───────────────────────────────────
function ckdStage(gfr) {
  var g = clampv(gfr, 0, 250);
  if (g >= 90) return 'G1';
  if (g >= 60) return 'G2';
  if (g >= 45) return 'G3a';
  if (g >= 30) return 'G3b';
  if (g >= 15) return 'G4';
  return 'G5';
}

// ─── função principal ───────────────────────────────────────────────────────
/**
 * creatinina(input) → o estado completo da medida da função renal.
 *
 * input: {
 *   GFR,        // TFG VERDADEIRA atual (mL/min; default 120) — a "realidade"
 *   GFR0,       // TFG anterior (mL/min; default = GFR) — para o não-equilíbrio
 *   muscle,     // massa muscular relativa (0.35..1.7; default 1)
 *   sexF,       // true = mulher (gera menos Cr; afeta eGFR/κ); default false
 *   age,        // idade (anos; default 50) — afeta eGFR
 *   drug,       // bloqueio da secreção tubular 0..1 (cimetidina/trimetoprima); default 0
 *   day         // dias desde a queda aguda de TFG (default 999 = equilíbrio); 0 = no instante
 * }
 */
function creatinina(input) {
  var inp = input || {};

  var GFR    = clampv(inp.GFR    !== undefined ? inp.GFR    : GFR_N, 1, 200);
  var GFR0   = clampv(inp.GFR0   !== undefined ? inp.GFR0   : GFR,   1, 200);
  var muscle = clampv(inp.muscle !== undefined ? inp.muscle : 1, MUSC_MIN, MUSC_MAX);
  var sexF   = (inp.sexF === true || inp.sexF === 1 || inp.sexF === 'F') ? true : false;
  var age    = clampv(inp.age    !== undefined ? inp.age    : 50, 18, 110);
  var drug   = clampv(inp.drug   !== undefined ? inp.drug   : 0, 0, 1);
  var day    = clampv(inp.day    !== undefined ? inp.day    : 999, 0, 999);

  // geração de creatinina (∝ músculo, sexo)
  var gen = generation(muscle, sexF);

  // secreção efetiva (droga bloqueia)
  var secEff = secFracEff(drug);

  // ─── HIPÉRBOLE: P_Cr de estado estável na TFG atual ────────────────────────
  // No equilíbrio, excreção = geração:  gen = P_Cr · TFG · (1 + secEff)
  //   ⇒ P_Cr_ss = gen / (TFG · (1+secEff))   — a hipérbole P_Cr ∝ 1/TFG.
  var pcrSs = gen / (GFR * (1 + secEff));
  if (!isFinite(pcrSs)) pcrSs = 25;
  pcrSs = clampv(pcrSs, 0.1, 25);

  // P_Cr de estado estável na TFG ANTERIOR (ponto de partida do não-equilíbrio)
  var pcr0 = gen / (GFR0 * (1 + secEff));
  if (!isFinite(pcr0)) pcr0 = 25;
  pcr0 = clampv(pcr0, 0.1, 25);

  // ─── NÃO-EQUILÍBRIO: a Cr ATRASA após uma queda aguda de TFG ────────────────
  // P_Cr(t) = P_Cr_ss + (P_Cr0 - P_Cr_ss)·exp(-t/τ);  τ alonga quando a TFG cai
  // (rim ruim limpa devagar → a Cr demora mais a alcançar o platô).
  var tau = TAU_N + TAU_SPAN * (1 - GFR / GFR_N >= 0 ? (1 - GFR / GFR_N) : 0);
  if (tau < TAU_N) tau = TAU_N;
  var decay = Math.exp(-day / tau);
  if (!isFinite(decay)) decay = 0;
  var pcr = pcrSs + (pcr0 - pcrSs) * decay;
  if (!isFinite(pcr)) pcr = pcrSs;
  pcr = clampv(pcr, 0.1, 25);

  // o "atraso": quão longe a Cr atual está do que ela SERÁ no equilíbrio
  var lag = pcrSs - pcr;                 // >0 enquanto a Cr ainda está subindo

  // ─── CLEARANCE DE CREATININA (o que se MEDIRIA por coleta de urina) ─────────
  // A creatinina é filtrada E secretada → o clearance medido SUPERESTIMA a TFG.
  //   ClCr = TFG · (1 + secEff)   (usa o estado estável; é a depuração real do soluto)
  var clCr = GFR * (1 + secEff);
  var overestimate = clCr - GFR;         // mL/min de superestimativa pela secreção
  var overestimatePct = (clCr / GFR - 1) * 100;

  // ─── CISTATINA C (independe de músculo) ────────────────────────────────────
  // produção ~constante; concentração ∝ 1/TFG. Calibrada a CYS_N em TFG 120.
  var cys = CYS_N * (GFR_N / GFR);
  if (!isFinite(cys)) cys = 12;
  cys = clampv(cys, 0.3, 12);

  // ─── eGFR estimado (a leitura clínica) ─────────────────────────────────────
  var eGFR_cr  = egfrFromCr(pcr, age, sexF);      // a partir da Cr ATUAL (mente!)
  var eGFR_cys = egfrFromCys(cys, age);           // a partir da cistatina (mais fiel)

  // ─── faixa cega: a Cr atual ainda "parece normal" embora a TFG já tenha caído? ─
  // limiar de normalidade ~1.2 mg/dL (M) / ~1.0 (F). Se TFG já < 75% do normal
  // mas a Cr de equilíbrio ainda < limiar → estamos na FAIXA CEGA.
  var crLimiar = sexF ? 1.0 : 1.2;
  var faixaCega = (GFR < 0.75 * GFR_N) && (pcrSs < crLimiar);

  // estágio de DRC (pela TFG verdadeira — a realidade)
  var estagio = ckdStage(GFR);
  // estágio que o clínico estimaria pelo eGFR-Cr (pode divergir da realidade)
  var estagioEstimado = ckdStage(eGFR_cr);

  // ─── regime (a leitura do módulo) ──────────────────────────────────────────
  var regime;
  if (day < 3 && lag > 0.3)                       regime = 'nao_equilibrio';   // LRA: Cr atrasa
  else if (drug > 0.3 && secEff < SEC_N * 0.7)    regime = 'secrecao_bloqueada'; // Cr↑ sem lesão
  else if (faixaCega)                             regime = 'faixa_cega';        // TFG↓ mas Cr normal
  else if (muscle < 0.6 && pcrSs < crLimiar && GFR < 70) regime = 'massa_baixa'; // Cr mente p/ baixo
  else if (GFR < 60)                              regime = 'drc_estabelecida';
  else                                            regime = 'normal';

  return {
    // entradas efetivas
    GFR: GFR, GFR0: GFR0, muscle: muscle, sexF: sexF, age: age, drug: drug, day: day,
    // geração e secreção
    gen: gen, secEff: secEff, secFracN: SEC_N,
    // o número e a hipérbole
    pcr: pcr, pcrSs: pcrSs, pcr0: pcr0, lag: lag, tau: tau,
    // clearance de creatinina e a superestimativa
    clCr: clCr, overestimate: overestimate, overestimatePct: overestimatePct,
    // cistatina C
    cys: cys,
    // eGFR estimados
    eGFR_cr: eGFR_cr, eGFR_cys: eGFR_cys,
    // estágios e faixa cega
    estagio: estagio, estagioEstimado: estagioEstimado,
    faixaCega: faixaCega, crLimiar: crLimiar,
    // regime
    regime: regime
  };
}

// ─── layout: a HIPÉRBOLE P_Cr × TFG (com a faixa cega) ──────────────────────
/**
 * hiperboleLayout(state, W, H)
 * Varre a TFG de 5 a 150 mL/min; em cada TFG computa P_Cr_ss (estado estável)
 * com a geração/secreção do estado. Devolve:
 *   pts: [{gfr, pcr, x, y}]                a polilinha da hipérbole
 *   blind: {x0, x1}                        faixa cega (TFG ~60..120) sombreada
 *   current: {gfr, pcr, x, y}             o ponto da TFG verdadeira atual (Cr de equilíbrio)
 *   markers: pontos de TFG 120/60/30/15 sobre a curva
 *   axis. A UI só liga os pontos — o motor manda no pixel. X=TFG, Y=Cr.
 */
function hiperboleLayout(state, W, H) {
  state = state || {};
  W = clampv(W, 200, 100000);
  H = clampv(H, 120, 100000);

  var muscle = clampv(state.muscle !== undefined ? state.muscle : 1, MUSC_MIN, MUSC_MAX);
  var sexF   = (state.sexF === true || state.sexF === 1 || state.sexF === 'F') ? true : false;
  var drug   = clampv(state.drug !== undefined ? state.drug : 0, 0, 1);
  var gen    = generation(muscle, sexF);
  var secEff = secFracEff(drug);

  var padL = 52, padR = 16, padT = 18, padB = 38;
  var baseY = H - padB;
  var gfrMin = 5, gfrMax = 150, N = 60;
  var crMin = 0, crMax = 8;   // eixo Y de Cr (mg/dL); a curva clampa nesse teto

  var pxX = (W - padL - padR) / (gfrMax - gfrMin);
  var pxY = (baseY - padT) / (crMax - crMin);

  function crOf(g) {
    var v = gen / (g * (1 + secEff));
    if (!isFinite(v)) v = crMax;
    return v;
  }
  function X(g) { return padL + (clampv(g, gfrMin, gfrMax) - gfrMin) * pxX; }
  function Y(cr) { return baseY - clampv(cr, crMin, crMax) * pxY; }

  var pts = [], i, g, cr;
  for (i = 0; i <= N; i++) {
    g = gfrMin + (gfrMax - gfrMin) * i / N;
    cr = crOf(g);
    pts.push({ gfr: g, pcr: cr, x: X(g), y: Y(cr) });
  }

  // faixa cega: TFG entre 60 e 120 (a primeira metade da perda, escondida)
  var blind = { x0: X(60), x1: X(120), gfrLo: 60, gfrHi: 120 };

  // marcadores nos pontos didáticos
  function mk(gv) { var c = crOf(gv); return { gfr: gv, pcr: c, x: X(gv), y: Y(c) }; }
  var markers = [mk(120), mk(60), mk(30), mk(15)];

  // ponto da TFG verdadeira atual (mostra a Cr de EQUILÍBRIO naquela TFG)
  var gCur = clampv(state.GFR !== undefined ? state.GFR : GFR_N, 1, 200);
  var current = { gfr: gCur, pcr: crOf(gCur), x: X(gCur), y: Y(crOf(gCur)) };

  return {
    W: W, H: H, padL: padL, padR: padR, padT: padT, padB: padB, baseY: baseY,
    gfrMin: gfrMin, gfrMax: gfrMax, crMin: crMin, crMax: crMax, pxX: pxX, pxY: pxY,
    gen: gen, secEff: secEff,
    axis: { x0: padL, y0: padT, xEnd: W - padR, yEnd: baseY },
    pts: pts, blind: blind, markers: markers, current: current
  };
}

// ─── layout: o ATRASO da Cr no tempo após a queda de TFG ────────────────────
/**
 * atrasoLayout(state, W, H)
 * Varre o tempo (dias) de 0 a 14 após a queda de TFG (GFR0 → GFR). Em cada dia
 * computa P_Cr(t). Mostra a Cr subindo devagar (a LRA "escondida") até o platô.
 *   pts: [{day, pcr, x, y}]   ·   ssLine: y do platô P_Cr_ss   ·   axis.
 */
function atrasoLayout(state, W, H) {
  state = state || {};
  W = clampv(W, 200, 100000);
  H = clampv(H, 120, 100000);

  var padL = 48, padR = 14, padT = 16, padB = 34;
  var baseY = H - padB;
  var dMin = 0, dMax = 14, N = 56;

  // computa o platô da Cr e o ponto inicial via o engine
  var rSs = creatinina(merge(state, { day: 999 }));
  var crMax = Math.max(rSs.pcrSs * 1.15, 1.5);
  var crMin = 0;

  var pxX = (W - padL - padR) / (dMax - dMin);
  var pxY = (baseY - padT) / (crMax - crMin);

  function X(d) { return padL + (clampv(d, dMin, dMax) - dMin) * pxX; }
  function Y(cr) { return baseY - clampv(cr, crMin, crMax) * pxY; }

  var pts = [], i, d, r;
  for (i = 0; i <= N; i++) {
    d = dMin + (dMax - dMin) * i / N;
    r = creatinina(merge(state, { day: d }));
    pts.push({ day: d, pcr: r.pcr, x: X(d), y: Y(r.pcr) });
  }

  return {
    W: W, H: H, padL: padL, padR: padR, padT: padT, padB: padB, baseY: baseY,
    dMin: dMin, dMax: dMax, crMin: crMin, crMax: crMax, pxX: pxX, pxY: pxY,
    pcrSs: rSs.pcrSs, ssY: Y(rSs.pcrSs),
    axis: { x0: padL, y0: padT, xEnd: W - padR, yEnd: baseY },
    pts: pts
  };
}

// ─── exports ────────────────────────────────────────────────────────────────
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    creatinina: creatinina,
    clearance: clearance,
    generation: generation,
    secFracEff: secFracEff,
    egfrFromCr: egfrFromCr,
    egfrFromCys: egfrFromCys,
    ckdStage: ckdStage,
    hiperboleLayout: hiperboleLayout,
    atrasoLayout: atrasoLayout,
    clampv: clampv,
    merge: merge,
    CONST: {
      GFR_N: GFR_N, SEC_N: SEC_N, SEC_BLOCK: SEC_BLOCK, GEN_N: GEN_N, PCR_N: PCR_N,
      TAU_N: TAU_N, TAU_SPAN: TAU_SPAN, CYS_N: CYS_N,
      MUSC_MIN: MUSC_MIN, MUSC_MAX: MUSC_MAX, SEX_F_FACT: SEX_F_FACT
    }
  };
}
