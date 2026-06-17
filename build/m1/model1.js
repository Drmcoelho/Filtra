'use strict';
/*
 * FILTRA · M1 — O néfron / forças de Starling glomerulares (aferente × eferente)
 * ---------------------------------------------------------------------------
 * Engine PURO, determinístico. Roda em Node e inline no HTML (espelho fiel).
 * Regra-zero: o motor manda no pixel.
 *
 * Fórmula-mãe (Starling glomerular):
 *     TFG = Kf · (P_GC − P_BC − π_GC)            [pressão de filtração líquida = NFP]
 *
 * A P_GC mora ENTRE DUAS RESISTÊNCIAS (aferente R_A, eferente R_E). Tratando o
 * leito como um divisor de pressão entre a P arterial (PAM) e a P venosa renal:
 *     P_GC = (PAM·R_E + P_v·R_A) / (R_A + R_E)   → ↑ com R_E, ↓ com R_A
 *     FPR  = Kflow · (PAM − P_v) / (R_A + R_E)   → fluxo plasmático renal
 *     FF   = TFG / FPR                            [fração de filtração]
 *
 * Autorregulação: o tônus AFERENTE se ajusta (miogênico + feedback tubuloglomerular)
 * para DEFENDER a P_GC ~constante na faixa PAM ∈ [~80,~180]. Modelada como ganho g
 * sobre R_A, resolvido por LAÇO DE PONTO-FIXO AMORTECIDO (relaxação) e CLAMPADO ao
 * alcance miogênico [gMin,gMax]; fora do alcance, g satura e a P_GC segue a PAM —
 * o precipício pré-renal à esquerda, a hipertensão glomerular à direita.
 */

// clamp resiliente: Number() força conversão; NaN/null/∞/string → piso.
function clampv(v, a, b) {
  var n = Number(v);
  if (!isFinite(n)) n = a;
  if (n < a) n = a;
  if (n > b) n = b;
  return n;
}

// merge sem mutar (para varrer PAM na curva sem tocar o estado do chamador)
function merge(a, b) {
  var o = {}, k;
  if (a) for (k in a) if (Object.prototype.hasOwnProperty.call(a, k)) o[k] = a[k];
  if (b) for (k in b) if (Object.prototype.hasOwnProperty.call(b, k)) o[k] = b[k];
  return o;
}

// --- constantes fisiológicas (didáticas, calibradas para a linha de base normal) ---
var PV     = 8;     // pressão venosa renal (mmHg)
var RA0    = 1.0;   // resistência aferente basal (unidades relativas)
var RE0    = 1.3;   // resistência eferente basal (eferente é mais estreita)
var KFLOW  = 15;    // escala de fluxo → FPR em mL/min
var PSTAR  = 60;    // P_GC defendida pela autorregulação (mmHg)
var GMIN   = 0.5;   // máxima DILATAÇÃO aferente (joelho inferior ~80 mmHg)
var GMAX   = 3.0;   // máxima CONSTRIÇÃO aferente (joelho superior ~180 mmHg)
var FFMAX  = 0.65;  // teto de fração de filtração (equilíbrio de filtração)
var PRE_THR = 52;   // P_GC abaixo disto → regime pré-renal (hipofiltração)
var HTN_THR = 70;   // P_GC acima disto → hipertensão glomerular
var PBC_THR = 24;   // P_BC acima disto → congestão pós-renal (obstrução)

/*
 * nefron(input) → estado hemodinâmico-funcional do glomérulo.
 * input: {
 *   PAM,            // pressão arterial média que chega ao rim (mmHg)
 *   rA, rE,         // tônus AFERENTE / EFERENTE (relativo; 1 = normal)
 *                   //   AINE → rA↑ (fecha aferente); IECA/BRA → rE↓ (abre eferente); AngII → rE↑
 *   Kf,             // coeficiente de ultrafiltração (mL·min⁻¹·mmHg⁻¹)
 *   piGC,           // pressão oncótica do capilar (mmHg)
 *   P_BC,           // pressão hidrostática de Bowman (mmHg) — sobe na obstrução
 *   autoreg         // autorregulação ligada? (default true)
 * }
 */
function nefron(input) {
  var inp = input || {};

  var PAM  = clampv(inp.PAM  !== undefined ? inp.PAM  : 100, 20, 260);
  var rA   = clampv(inp.rA   !== undefined ? inp.rA   : 1,   0.2, 5);
  var rE   = clampv(inp.rE   !== undefined ? inp.rE   : 1,   0.2, 5);
  var Kf   = clampv(inp.Kf   !== undefined ? inp.Kf   : 7.5, 0.5, 20);
  var piGC = clampv(inp.piGC !== undefined ? inp.piGC : 28,  0,  40);
  var P_BC = clampv(inp.P_BC !== undefined ? inp.P_BC : 15,  0,  50);
  var autoreg = inp.autoreg !== false; // default: ligada

  var RE = RE0 * rE;

  // --- autorregulação: laço de ponto-fixo AMORTECIDO sobre o ganho aferente g ---
  // sobe R_A quando P_GC > alvo (constrição), abaixa quando P_GC < alvo (dilatação),
  // sempre clampado ao alcance miogênico. 60 passos, relaxação 0,4 → converge sem oscilar.
  var g = 1;
  if (autoreg) {
    var relax = 0.4;
    for (var it = 0; it < 60; it++) {
      var RAi = RA0 * rA * g;
      var pgcI = (PAM * RE + PV * RAi) / (RAi + RE);
      var err = (pgcI - PSTAR) / PSTAR;           // >0: P_GC alta → constringe (g↑)
      g = clampv(g * (1 + relax * err), GMIN, GMAX);
    }
  }

  var RA = RA0 * rA * g;

  // --- hemodinâmica glomerular ---
  var P_GC = (PAM * RE + PV * RA) / (RA + RE);     // ∈ [P_v, PAM] por construção
  if (!isFinite(P_GC)) P_GC = PV;
  var FPR = KFLOW * Math.max(PAM - PV, 0) / (RA + RE);
  if (!isFinite(FPR) || FPR < 0) FPR = 0;

  // --- forças de Starling ---
  var NFP = P_GC - P_BC - piGC;                    // pode ser ≤ 0 (filtração cessa)
  var TFGraw = Kf * Math.max(NFP, 0);
  // teto de fração de filtração: não se filtra mais que ~FFMAX do plasma que flui
  var TFG = Math.min(TFGraw, FFMAX * FPR);
  if (!isFinite(TFG) || TFG < 0) TFG = 0;
  var FF = FPR > 0 ? TFG / FPR : 0;

  // --- regime (a sombra com mecânicas distintas) ---
  var regime;
  if (P_BC > PBC_THR)      regime = 'pos_renal';   // obstrução: P_BC↑ contrapressa
  else if (P_GC < PRE_THR) regime = 'pre_renal';   // pressão de filtração insuficiente
  else if (P_GC > HTN_THR) regime = 'htn_glomerular';
  else                     regime = 'plato';

  return {
    PAM: PAM, rA: rA, rE: rE, Kf: Kf, piGC: piGC, P_BC: P_BC, autoreg: autoreg,
    R_A: RA, R_E: RE, g: g,
    P_GC: P_GC, NFP: NFP, TFG: TFG, FPR: FPR, FF: FF,
    regime: regime
  };
}

/*
 * tfgCurveLayout(state, W, H) — GEOMETRIA PURA da curva TFG × PAM (o instrumento).
 * Varre a PAM mantendo o resto do estado fixo; devolve a polilinha já em coordenadas
 * de canvas, mais os eixos e o marcador do ponto de operação atual. O motor manda no
 * pixel: a UI só liga os pontos. Determinística e resiliente (nada de NaN).
 */
function tfgCurveLayout(state, W, H) {
  state = state || {};
  W = clampv(W, 200, 100000);
  H = clampv(H, 120, 100000);
  var padL = 52, padR = 16, padT = 18, padB = 38, baseY = H - padB;
  var pamMin = 20, pamMax = 240, N = 56;

  var raw = [], maxT = 160, i, pam, r;
  for (i = 0; i <= N; i++) {
    pam = pamMin + (pamMax - pamMin) * i / N;
    r = nefron(merge(state, { PAM: pam }));
    raw.push({ PAM: pam, TFG: r.TFG });
    if (r.TFG > maxT) maxT = r.TFG;
  }
  var yMax = maxT * 1.12;
  var pxX = (W - padL - padR) / (pamMax - pamMin);
  var pxY = (baseY - padT) / yMax;

  var pts = [];
  for (i = 0; i < raw.length; i++) {
    pts.push({
      PAM: raw[i].PAM, TFG: raw[i].TFG,
      x: padL + (raw[i].PAM - pamMin) * pxX,
      y: baseY - clampv(raw[i].TFG, 0, yMax) * pxY
    });
  }

  var cur = nefron(state);
  var curPAM = clampv(state.PAM !== undefined ? state.PAM : 100, pamMin, pamMax);
  var cx = padL + (curPAM - pamMin) * pxX;
  var cy = baseY - clampv(cur.TFG, 0, yMax) * pxY;

  return {
    W: W, H: H, padL: padL, padR: padR, padT: padT, padB: padB, baseY: baseY,
    pamMin: pamMin, pamMax: pamMax, yMax: yMax, pxX: pxX, pxY: pxY,
    axis: { x0: padL, y0: padT, xEnd: W - padR, yEnd: baseY },
    pts: pts,
    current: { x: cx, y: cy, PAM: curPAM, TFG: cur.TFG }
  };
}

/*
 * glomLayout(r, W, H) — GEOMETRIA PURA do esquema do glomérulo (ilustração SVG).
 * Aferente e eferente como tubos de largura ∝ 1/R (mais largo = mais dilatado);
 * a P_GC como barra entre os dois. Determinística e resiliente.
 */
function glomLayout(r, W, H) {
  r = r || {};
  W = clampv(W, 160, 100000);
  H = clampv(H, 120, 100000);
  var RA = clampv(r.R_A, 0.01, 1e4), RE = clampv(r.R_E, 0.01, 1e4);
  var PGC = clampv(r.P_GC, 0, 300);
  var cx = W * 0.5, cy = H * 0.5;
  var tuftR = Math.min(W, H) * 0.16;
  var wA = clampv(16 / RA, 3, 46);   // largura ∝ 1/R_A
  var wE = clampv(16 / RE, 3, 46);   // largura ∝ 1/R_E
  var barMax = 80;
  var barH = clampv(PGC / barMax, 0, 1) * (H * 0.42);

  return {
    W: W, H: H, cx: cx, cy: cy, tuftR: tuftR,
    afferent: { x: 6, y: cy - wA / 2, w: Math.max(cx - tuftR - 6, 1), h: wA, width: wA },
    efferent: { x: cx + tuftR, y: cy - wE / 2, w: Math.max(W - 6 - (cx + tuftR), 1), h: wE, width: wE },
    pgcBar: { x: cx - 7, y: cy - barH, w: 14, h: barH, PGC: PGC }
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    nefron: nefron, tfgCurveLayout: tfgCurveLayout, glomLayout: glomLayout,
    clampv: clampv, merge: merge,
    CONST: { PV: PV, RA0: RA0, RE0: RE0, KFLOW: KFLOW, PSTAR: PSTAR, GMIN: GMIN, GMAX: GMAX, FFMAX: FFMAX }
  };
}
