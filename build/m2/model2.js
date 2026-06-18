'use strict';
/*
 * FILTRA · M2 — Hemodinâmica renal: 20% do DC, autorregulação, córtex × medula
 * ---------------------------------------------------------------------------
 * Engine PURO, determinístico. Roda em Node e inline no HTML.
 * Regra-zero: o motor manda no pixel.
 *
 * Tese (o erro a corrigir): "o rim recebe pouco fluxo"
 * Verdade: FSR ≈ 20% do DC (≈ 1000 mL/min) — é o 4º órgão em DO₂.
 * Mas a MEDULA vive à beira da hipóxia mesmo em repouso (pO₂ ~15–20 mmHg,
 * ERO₂ ~50–75%) → qualquer queda de FSR precipita hipóxia medular → NTA
 * do ramo espesso da alça de Henle.
 *
 * Fórmulas-mãe:
 *   FSR   = FPR / (1 − Hct)
 *   FPR   = kflow_r × (PAM − Pv) / (R_A + R_E)     kflow_r = KFLOW × DC/DC_N
 *   TFG   = Kf × max(NFP, 0)   onde NFP = P_GC − P_BC − π_GC  [cap: FFMAX × FPR]
 *   FF    = TFG / FPR
 *   Q_med = FSR × (1 − f_cort)
 *   SvO₂_med = SaO₂ − VO₂_TAL × 100 / (Q_med × Hgb × 1.34)   [Fick zonal]
 *   pO₂_med  = P50 × (SvO₂/(1−SvO₂))^(1/n)                   [Hill invertido]
 *
 * Alavancas farmacológicas (o segmento aferente×eferente como alvo):
 *   AINE   → bloqueia PGs vasodilatadoras → rA↑ (constrição aferente)
 *            efeito amplificado por depleção volêmica (RAAS ativado usa PGs como safety net)
 *   IECA/BRA → bloqueia AngII → rE↓ (dilatação eferente) → P_GC↓ → TFG↓
 *              a creatinina sobe porque FUNCIONA — não é sinal de parar o IECA
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

// merge sem mutar (varrer PAM para a curva sem alterar o estado do chamador)
function merge(a, b) {
  var o = {}, k;
  if (a) for (k in a) if (Object.prototype.hasOwnProperty.call(a, k)) o[k] = a[k];
  if (b) for (k in b) if (Object.prototype.hasOwnProperty.call(b, k)) o[k] = b[k];
  return o;
}

// ─── constantes fisiológicas calibradas ────────────────────────────────────
var DC_N    = 5.0;   // débito cardíaco normal (L/min)
var PV      = 8;     // pressão venosa renal (mmHg)
var RA0     = 1.0;   // resistência aferente basal (u.r.)
var RE0     = 1.3;   // resistência eferente basal (> aferente — mais estreita)
var KFLOW   = 15;    // escala: FPR≈600 mL/min a DC=5L/min, PAM=100, RA=1.0, RE=1.3
var PSTAR   = 60;    // P_GC alvo da autorregulação (mmHg)
var GMIN    = 0.5;   // máxima DILATAÇÃO aferente (joelho inferior ~80 mmHg)
var GMAX    = 3.0;   // máxima CONSTRIÇÃO aferente (joelho superior ~180 mmHg)
var FFMAX   = 0.65;  // teto de fração de filtração
var F_CORT0 = 0.88;  // fração cortical do FSR (córtex recebe ~88%)
var P50_O2  = 26;    // P50 da hemoglobina (mmHg, curva padrão)
var N_HILL  = 2.7;   // coeficiente de Hill (cooperatividade da Hgb)
var VO2_TAL = 18;    // consumo O₂ do ramo espesso (mL O₂/min, 2 rins) — NKCC2-driven

// ─── funções auxiliares ─────────────────────────────────────────────────────

/**
 * hillPO2(sO2) → pO₂ (mmHg) por inversão da equação de Hill
 *   sO₂ = (pO₂/P50)^n / (1 + (pO₂/P50)^n)
 *   → pO₂ = P50 × (sO₂/(1−sO₂))^(1/n)
 */
function hillPO2(sO2) {
  var s = clampv(sO2, 0.001, 0.999);
  return P50_O2 * Math.pow(s / (1 - s), 1 / N_HILL);
}

// ─── função principal ───────────────────────────────────────────────────────

/**
 * hemoRenal(input) → estado hemodinâmico-oxigenatório do rim inteiro + zonal
 *
 * input: {
 *   DC,      // débito cardíaco (L/min; default 5.0)
 *   PAM,     // pressão arterial média chegando ao rim (mmHg; default 100)
 *   Hct,     // hematócrito (default 0.45)
 *   Hgb,     // hemoglobina (g/dL; default 14)
 *   SaO2,    // saturação arterial (0–1; default 0.98)
 *   f_cort,  // fração cortical do FSR (default 0.88)
 *   aine,    // bloqueio de PGs por AINE (0–1; 0=sem, 1=dose máxima)
 *   ieca,    // bloqueio de AngII por IECA/BRA (0–1)
 *   vol_dep, // grau de depleção volêmica (0–1); amplifica o efeito dos AINEs
 *   rA,      // tônus aferente basal (relativo; 1=normal)
 *   rE,      // tônus eferente basal (relativo; 1=normal)
 *   Kf,      // coeficiente de ultrafiltração (default 7.5)
 *   piGC,    // pressão oncótica capilar (mmHg; default 28)
 *   P_BC,    // pressão de Bowman (mmHg; default 15)
 *   autoreg  // autorregulação ativa? (default true)
 * }
 */
function hemoRenal(input) {
  var inp = input || {};

  var DC      = clampv(inp.DC      !== undefined ? inp.DC      : 5.0,  0.5, 15.0);
  var PAM     = clampv(inp.PAM     !== undefined ? inp.PAM     : 100,  20,  260);
  var Hct     = clampv(inp.Hct     !== undefined ? inp.Hct     : 0.45, 0.20, 0.65);
  var Hgb     = clampv(inp.Hgb     !== undefined ? inp.Hgb     : 14,   4,   20);
  var SaO2    = clampv(inp.SaO2    !== undefined ? inp.SaO2    : 0.98, 0.60, 1.0);
  var f_cort  = clampv(inp.f_cort  !== undefined ? inp.f_cort  : F_CORT0, 0.50, 0.97);
  var aine    = clampv(inp.aine    !== undefined ? inp.aine    : 0,    0,   1);
  var ieca    = clampv(inp.ieca    !== undefined ? inp.ieca    : 0,    0,   1);
  var vol_dep = clampv(inp.vol_dep !== undefined ? inp.vol_dep : 0,    0,   1);
  var rA_in   = clampv(inp.rA      !== undefined ? inp.rA      : 1,    0.2, 5);
  var rE_in   = clampv(inp.rE      !== undefined ? inp.rE      : 1,    0.2, 5);
  var Kf      = clampv(inp.Kf      !== undefined ? inp.Kf      : 7.5,  0.5, 20);
  var piGC    = clampv(inp.piGC    !== undefined ? inp.piGC    : 28,   0,   40);
  var P_BC    = clampv(inp.P_BC    !== undefined ? inp.P_BC    : 15,   0,   50);
  var autoreg = inp.autoreg !== false;

  // ─── alavancas farmacológicas sobre tônus arteriolar ──────────────────────
  //
  // AINE: bloqueia PGs vasodilatadoras na arteríola AFERENTE
  //   Em vol normal, PGs têm papel modesto (efeito moderado: rA × 1.25 máx)
  //   Em depleção/RAAS ativado, PGs são o safety net → bloqueio → rA × 2.75 máx
  var aine_rA = 1 + aine * (0.25 + vol_dep * 1.50);   // [1.0 → 2.75]
  //
  // IECA/BRA: bloqueia AngII → dilatação da arteríola EFERENTE (rE↓)
  //   Efeito: P_GC↓ → TFG↓ → creatinina sobe — esse é o MECANISMO pretendido
  var ieca_rE = clampv(1 - ieca * 0.45, 0.20, 1.0);   // [1.0 → 0.55]

  var rA = clampv(rA_in * aine_rA, 0.2, 8);
  var rE = clampv(rE_in * ieca_rE, 0.2, 5);

  // ─── escala de fluxo com DC ────────────────────────────────────────────────
  // KFLOW foi calibrado para DC=5 L/min; escala linearmente com DC
  var kflow_r = KFLOW * (DC / DC_N);   // [0→15×3=45]

  // ─── autorregulação aferente (miogênica + TGF da mácula densa) ────────────
  // Laço de ponto-fixo AMORTECIDO (relaxação=0.4) sobre o ganho aferente g.
  // g↑ = constringe R_A (PAM alta → P_GC > PSTAR → compensa subindo R_A)
  // g↓ = dilata R_A (PAM baixa → P_GC < PSTAR → dilata até GMIN)
  // Fora do alcance [GMIN, GMAX]: g satura → autorregulação quebra → precipício.
  var RE = RE0 * rE;
  var g  = 1.0;
  if (autoreg) {
    var relax = 0.4;
    for (var it = 0; it < 60; it++) {
      var RAi  = RA0 * rA * g;
      var pgcI = (PAM * RE + PV * RAi) / (RAi + RE);
      var err  = (pgcI - PSTAR) / PSTAR;
      g = clampv(g * (1 + relax * err), GMIN, GMAX);
    }
  }
  var RA = RA0 * rA * g;

  // ─── hemodinâmica glomerular ────────────────────────────────────────────────
  var P_GC = (PAM * RE + PV * RA) / (RA + RE);
  if (!isFinite(P_GC)) P_GC = PV;

  // FPR total (2 rins, mL/min)
  var FPR = kflow_r * Math.max(PAM - PV, 0) / (RA + RE);
  if (!isFinite(FPR) || FPR < 0) FPR = 0;

  // FSR = FPR / (1-Hct)  (mL/min)
  var FSR = FPR / Math.max(1 - Hct, 0.10);

  // TFG (mL/min, 2 rins)
  var NFP    = P_GC - P_BC - piGC;
  var TFGraw = Kf * Math.max(NFP, 0);
  var TFG    = Math.min(TFGraw, FFMAX * FPR);
  if (!isFinite(TFG) || TFG < 0) TFG = 0;
  var FF = FPR > 0 ? TFG / FPR : 0;

  // ─── distribuição zonal ─────────────────────────────────────────────────────
  var Q_cort = FSR * f_cort;          // mL/min
  var Q_med  = FSR * (1 - f_cort);    // mL/min ~12% do FSR

  // ─── oxigenação (O₂) ─────────────────────────────────────────────────────────
  //
  // CaO₂ (mL O₂/dL sangue): componente ligado + dissolvido
  //   = Hgb(g/dL) × 1.34(mL O₂/g Hgb) × SaO₂ + 0.003(mL/dL/mmHg) × PaO₂
  var PaO2_est = 95;   // pO₂ arterial normal (supõe pulmão OK)
  var CaO2_dl  = Hgb * 1.34 * SaO2 + 0.003 * PaO2_est;  // mL O₂/dL
  var CaO2     = CaO2_dl / 100;                           // mL O₂/mL sangue

  // DO₂ (mL O₂/min): FSR(mL/min) × CaO₂(mL O₂/mL)
  var DO2_total = FSR  * CaO2;
  var DO2_cort  = Q_cort * CaO2;
  var DO2_med   = Q_med  * CaO2;

  // ─── O₂ medular (a pérola do módulo) ─────────────────────────────────────────
  //
  // VO₂_TAL: consumo da alça espessa (NKCC2 + Na/K-ATPase) ≈ 18 mL O₂/min
  // Mas não pode consumir mais do que 95% do que chega (clamp):
  var VO2_med  = clampv(VO2_TAL, 0, DO2_med * 0.95);
  var ERO2_med = DO2_med > 0 ? VO2_med / DO2_med : 0.95;
  //
  // SvO₂ medular por Fick zonal:
  //   VO₂_med = Q_med × Hgb × 1.34/100 × (SaO₂ − SvO₂_med)
  //   → SvO₂_med = SaO₂ − VO₂_med × 100 / (Q_med × Hgb × 1.34)
  var hgb_carry = Q_med * Hgb * 1.34 / 100;  // capacidade de transporte de Hgb (mL O₂/min)
  var SvO2_med  = hgb_carry > 0
    ? clampv(SaO2 - VO2_med / hgb_carry, 0.001, 0.999)
    : 0.05;
  //
  // pO₂ medular por Hill invertido (troca contracorrente agrava ainda mais, mas
  // o Hill já captura bem a curva de dissociação nessa faixa de baixa SvO₂):
  var pO2_med = hillPO2(SvO2_med);

  // ─── O₂ cortical (referência: muito melhor → mostra o contraste) ─────────────
  var ERO2_cort = 0.08;  // córtex extrai ~8% (muito fluxo, pouco consumo por volume)
  var VO2_cort  = DO2_cort * ERO2_cort;
  var hgb_carry_c = Q_cort * Hgb * 1.34 / 100;
  var SvO2_cort = hgb_carry_c > 0
    ? clampv(SaO2 - VO2_cort / hgb_carry_c, 0.001, 0.999)
    : 0.70;
  var pO2_cort = hillPO2(SvO2_cort);

  // ─── regime (a sombra com mecânicas distintas) ────────────────────────────────
  var regime;
  if (FSR < 300)          regime = 'isquemia_critica';
  else if (pO2_med < 8)   regime = 'hipoxia_medular';
  else if (FSR < 600)     regime = 'hipoperfusao';
  else if (P_GC < 52)     regime = 'pre_renal';
  else if (FSR > 1500)    regime = 'hiperperfusao';
  else                    regime = 'normal';

  return {
    // entradas efetivas
    DC: DC, PAM: PAM, Hct: Hct, Hgb: Hgb, SaO2: SaO2,
    f_cort: f_cort, aine: aine, ieca: ieca, vol_dep: vol_dep,
    rA_in: rA_in, rE_in: rE_in, aine_rA: aine_rA, ieca_rE: ieca_rE,
    // arteriolar
    rA: rA, rE: rE, RA: RA, RE: RE, g: g,
    // glomerular
    P_GC: P_GC, NFP: NFP, P_BC: P_BC, piGC: piGC, Kf: Kf,
    FPR: FPR, FSR: FSR, TFG: TFG, FF: FF,
    // zonal
    Q_cort: Q_cort, Q_med: Q_med,
    // O₂
    CaO2: CaO2, CaO2_dl: CaO2_dl,
    DO2_total: DO2_total, DO2_cort: DO2_cort, DO2_med: DO2_med,
    VO2_med: VO2_med, VO2_cort: VO2_cort,
    ERO2_med: ERO2_med, ERO2_cort: ERO2_cort,
    SvO2_med: SvO2_med, SvO2_cort: SvO2_cort,
    pO2_med: pO2_med, pO2_cort: pO2_cort,
    // regime
    regime: regime
  };
}

// ─── layout: curva FSR × PAM ────────────────────────────────────────────────

/**
 * fsrCurveLayout(state, W, H)
 * Varre PAM mantendo o restante fixo; devolve:
 *   pts: [{PAM, FSR, FPR, TFG, pO2_med, x, y_fsr, y_fpr, y_tfg, y_po2}]
 *   current: ponto de operação atual
 *   axis, yMax_fsr, yMax_po2
 * A UI só liga os pontos — o motor manda no pixel.
 */
function fsrCurveLayout(state, W, H) {
  state = state || {};
  W = clampv(W, 200, 100000);
  H = clampv(H, 120, 100000);
  var padL = 56, padR = 16, padT = 18, padB = 38;
  var baseY = H - padB;
  var pamMin = 20, pamMax = 220, N = 50;

  var raw = [], i, pam, r;
  var maxFSR = 200, maxPO2 = 30;
  for (i = 0; i <= N; i++) {
    pam = pamMin + (pamMax - pamMin) * i / N;
    r = hemoRenal(merge(state, { PAM: pam }));
    raw.push({ PAM: pam, FSR: r.FSR, FPR: r.FPR, TFG: r.TFG, pO2_med: r.pO2_med });
    if (r.FSR > maxFSR) maxFSR = r.FSR;
    if (r.pO2_med > maxPO2) maxPO2 = r.pO2_med;
  }
  var yMaxFSR = maxFSR * 1.12;
  var yMaxPO2 = Math.max(maxPO2 * 1.12, 35);
  var pxX   = (W - padL - padR) / (pamMax - pamMin);
  var pxFSR = (baseY - padT) / yMaxFSR;
  var pxPO2 = (baseY - padT) / yMaxPO2;

  var pts = raw.map(function(d) {
    return {
      PAM: d.PAM, FSR: d.FSR, FPR: d.FPR, TFG: d.TFG, pO2_med: d.pO2_med,
      x:      padL + (d.PAM - pamMin) * pxX,
      y_fsr:  baseY - clampv(d.FSR,  0, yMaxFSR) * pxFSR,
      y_fpr:  baseY - clampv(d.FPR,  0, yMaxFSR) * pxFSR,
      y_tfg:  baseY - clampv(d.TFG * 4, 0, yMaxFSR) * pxFSR,  // ×4 escala para visibilidade
      y_po2:  baseY - clampv(d.pO2_med, 0, yMaxPO2) * pxPO2
    };
  });

  var curPAM = clampv(state.PAM !== undefined ? state.PAM : 100, pamMin, pamMax);
  var cur    = hemoRenal(state);
  var cx     = padL + (curPAM - pamMin) * pxX;

  return {
    W: W, H: H, padL: padL, padR: padR, padT: padT, padB: padB, baseY: baseY,
    pamMin: pamMin, pamMax: pamMax, yMaxFSR: yMaxFSR, yMaxPO2: yMaxPO2,
    pxX: pxX, pxFSR: pxFSR, pxPO2: pxPO2,
    axis: { x0: padL, y0: padT, xEnd: W - padR, yEnd: baseY },
    pts: pts,
    current: {
      x: cx,
      y_fsr:  baseY - clampv(cur.FSR,  0, yMaxFSR) * pxFSR,
      y_po2:  baseY - clampv(cur.pO2_med, 0, yMaxPO2) * pxPO2,
      PAM: curPAM, FSR: cur.FSR, FPR: cur.FPR, TFG: cur.TFG, pO2_med: cur.pO2_med
    }
  };
}

// ─── layout: diagrama zonal córtex × medula ─────────────────────────────────

/**
 * medulaLayout(state, W, H)
 * Geometria pura para o diagrama didático de distribuição zonal + O₂.
 * Devolve barras de fluxo, barras de DO₂ e indicador de pO₂ medular.
 * Formato: {
 *   cortex: { flowBar, do2Bar, pO2bar, label },
 *   medulla: { flowBar, do2Bar, pO2bar, label },
 *   po2Indicator: { cx, cy, r, pO2_med, color }
 * }
 */
function medulaLayout(state, W, H) {
  state = state || {};
  W = clampv(W, 200, 100000);
  H = clampv(H, 120, 100000);

  var r  = hemoRenal(state);
  var padL = 12, padR = 12, padT = 20, padB = 30;
  var innerW = W - padL - padR;
  var innerH = H - padT - padB;
  var colW   = innerW / 2 - 8;
  var xCort  = padL;
  var xMed   = padL + innerW / 2 + 8;

  // normalização das barras pelo FSR normal (~1090 mL/min, CaO2 normal ~0.187)
  var FSR_REF  = 1090;
  var DO2_REF  = FSR_REF * 0.187;

  function bar(q, qRef, pO2, x, y0, label) {
    var frac    = clampv(q / qRef, 0, 1.5);
    var barH    = frac * innerH * 0.55;
    var fracO2  = clampv(r[q === r.Q_cort ? 'DO2_cort' : 'DO2_med'] / (DO2_REF * (q === r.Q_cort ? F_CORT0 : (1-F_CORT0))), 0, 1.5);
    var do2H    = fracO2 * innerH * 0.35;
    var po2H    = clampv(pO2 / 100, 0, 1) * innerH * 0.25;
    // cor do pO₂: verde ≥20, amarelo 10–20, vermelho <10
    var po2color = pO2 >= 20 ? '#22c55e' : pO2 >= 10 ? '#f59e0b' : '#ef4444';
    return {
      flow: { x: x, y: y0 + innerH - barH, w: colW, h: barH, q: q, frac: frac },
      do2:  { x: x, y: y0 + innerH - do2H, w: colW * 0.55, h: do2H },
      po2:  { x: x, y: y0 + innerH * 0.05, w: colW * 0.3, h: po2H, color: po2color, pO2: pO2 },
      label: { x: x + colW/2, y: y0 + innerH + 18, text: label }
    };
  }

  var y0 = padT;
  var bCort = bar(r.Q_cort, FSR_REF * F_CORT0, r.pO2_cort, xCort, y0, 'Córtex (~88%)');
  var bMed  = bar(r.Q_med,  FSR_REF * (1-F_CORT0), r.pO2_med, xMed, y0, 'Medula (~12%)');

  // indicador circular de pO₂ medular
  var po2color = r.pO2_med >= 20 ? '#22c55e' : r.pO2_med >= 10 ? '#f59e0b' : '#ef4444';

  return {
    W: W, H: H, r: r,
    cortex:  bCort,
    medulla: bMed,
    po2Indicator: {
      cx: W/2, cy: H - padB/2 + 2,
      r: 10, pO2_med: r.pO2_med, color: po2color
    }
  };
}

// ─── exports ────────────────────────────────────────────────────────────────
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    hemoRenal: hemoRenal,
    fsrCurveLayout: fsrCurveLayout,
    medulaLayout: medulaLayout,
    hillPO2: hillPO2,
    clampv: clampv,
    merge: merge,
    CONST: {
      DC_N: DC_N, PV: PV, RA0: RA0, RE0: RE0, KFLOW: KFLOW, PSTAR: PSTAR,
      GMIN: GMIN, GMAX: GMAX, FFMAX: FFMAX, F_CORT0: F_CORT0,
      P50_O2: P50_O2, N_HILL: N_HILL, VO2_TAL: VO2_TAL
    }
  };
}
