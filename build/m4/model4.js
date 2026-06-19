/* =========================================================================
 * FILTRA · M4 — Clearance: medir a função e por que a creatinina MENTE
 * ENGINE PURO. Espelhado inline no filtra4.html.
 *
 * Teses:
 *  - clearance C_x = U_x·V̇ / P_x; a inulina (livre, sem secreção/reabsorção) = padrão-ouro da TFG.
 *  - a creatinina mente por TRÊS motivos: (1) secreção tubular → superestima a TFG;
 *    (2) cinética LENTA → na fase aguda a creatinina atrasa e subestima a lesão;
 *    (3) depende da MASSA MUSCULAR → pouca massa → creatinina "normal" com TFG baixa.
 *  - Pcr no equilíbrio ∝ produção / TFG → hipérbole (faixa cega: cai metade da TFG, Pcr mal muda).
 *  - a cistatina C é independente de massa muscular → rastreia a TFG real.
 * ========================================================================= */

function clampv(v, a, b) { var n = Number(v); if (!isFinite(n)) n = a; if (n < a) n = a; if (n > b) n = b; return n; }

var PROD_STD = 1500;   // produção padrão de creatinina (mg/dia, ~70 kg)
var VD = 42;           // volume de distribuição da creatinina (L, ~ÁGT)
var SECR_STD = 0.10;   // fração de secreção tubular assumida pelas fórmulas

// clearance medido pela coleta: C = U·V̇ / P  (mL/min)
function clearanceMedido(Ux, Vfluxo, Px) {
  Ux = clampv(Ux, 0, 1e6); Vfluxo = clampv(Vfluxo, 0, 100); Px = clampv(Px, 1e-6, 1e6);
  var c = Ux * Vfluxo / Px;
  return isFinite(c) && c >= 0 ? c : 0;
}

// Pcr de equilíbrio (mg/dL) dada a TFG, a produção e a secreção
function pcrEquilibrio(gfr, producao, secr) {
  gfr = clampv(gfr, 1, 250); producao = clampv(producao, 50, 6000); secr = clampv(secr, 0, 1);
  var ccrLdia = gfr * (1 + secr) * 1.44;          // clearance de creatinina em L/dia
  var pcrMgL = producao / ccrLdia;                 // mg/L
  return clampv(pcrMgL / 10, 0.05, 60);            // mg/dL
}

// função-mãe: estado do "medir a função" (equilíbrio + cinética + as três mentiras)
function clearance(input) {
  var inp = input || {};
  var gfr = clampv(inp.gfr !== undefined ? inp.gfr : 120, 1, 250);          // TFG verdadeira (mL/min)
  var gfrPrev = clampv(inp.gfrPrev !== undefined ? inp.gfrPrev : gfr, 1, 250); // TFG antes da mudança
  var tempoDias = clampv(inp.tempoDias !== undefined ? inp.tempoDias : 30, 0, 60); // dias desde a mudança
  var muscleFactor = clampv(inp.muscleFactor !== undefined ? inp.muscleFactor : 1, 0.2, 2); // massa muscular relativa
  var secr = clampv(inp.secrecaoFrac !== undefined ? inp.secrecaoFrac : SECR_STD, 0, 1);
  var producao = muscleFactor * PROD_STD;

  // equilíbrios (antes e depois)
  var pcrSSnova = pcrEquilibrio(gfr, producao, secr);
  var pcrSSvelha = pcrEquilibrio(gfrPrev, producao, secr);
  // cinética: Pcr(t) relaxa exponencialmente para a nova SS (τ = Vd / clearance)
  var ccrLdiaNova = gfr * (1 + secr) * 1.44;
  var tau = VD / Math.max(ccrLdiaNova, 1e-6);                 // dias
  var pcrAtual = pcrSSnova + (pcrSSvelha - pcrSSnova) * Math.exp(-tempoDias / tau);
  pcrAtual = clampv(pcrAtual, 0.05, 60);

  // marcadores: inulina (verdade), creatinina (Ccr medido), cistatina (muscle-independent ≈ TFG)
  var ccrMedido = gfr * (1 + secr);                          // clearance de creatinina (mL/min) — superestima a TFG
  var eGFRcreatNaive = (PROD_STD / (pcrAtual * 10 * 1.44)) / (1 + SECR_STD); // fórmula assume produção/secreção padrão
  eGFRcreatNaive = clampv(eGFRcreatNaive, 1, 300);
  var eGFRcistatina = gfr;                                    // independente de massa → rastreia a TFG real
  var erroEgfr = eGFRcreatNaive - gfr;                        // o quanto a creatinina engana (+ = parece melhor que a verdade)

  // as três mentiras (flags)
  var foraEquilibrio = Math.abs(pcrAtual - pcrSSnova) > 0.1;   // cinética: ainda subindo/descendo
  var creatininaParecesNormal = pcrAtual < 1.3;
  var enganaPorMusculo = creatininaParecesNormal && gfr < 60;  // TFG baixa com creatinina "normal"
  var superestimaPorSecrecao = (ccrMedido - gfr) / gfr > 0.05; // Ccr > TFG por secreção

  return {
    gfr: gfr, gfrPrev: gfrPrev, tempoDias: tempoDias, muscleFactor: muscleFactor, secrecaoFrac: secr, producao: producao,
    pcrSSnova: pcrSSnova, pcrSSvelha: pcrSSvelha, pcrAtual: pcrAtual, tau: tau,
    ccrMedido: ccrMedido, eGFRcreatNaive: eGFRcreatNaive, eGFRcistatina: eGFRcistatina, erroEgfr: erroEgfr,
    foraEquilibrio: foraEquilibrio, creatininaParecesNormal: creatininaParecesNormal,
    enganaPorMusculo: enganaPorMusculo, superestimaPorSecrecao: superestimaPorSecrecao
  };
}

// geometria PURA da hipérbole Pcr × TFG (a UI só pinta)
function pcrCurveLayout(state, W, H) {
  state = state || {};
  W = clampv(W, 200, 100000); H = clampv(H, 120, 100000);
  var padL = 52, padR = 16, padT = 18, padB = 38, baseY = H - padB;
  var gMin = 5, gMax = 150, N = 58;
  var muscleFactor = clampv(state.muscleFactor !== undefined ? state.muscleFactor : 1, 0.2, 2);
  var secr = clampv(state.secrecaoFrac !== undefined ? state.secrecaoFrac : SECR_STD, 0, 1);
  var prod = muscleFactor * PROD_STD;
  var yMax = 6;                          // mg/dL no eixo
  var pxX = (W - padL - padR) / (gMax - gMin), pxY = (baseY - padT) / yMax;
  var pts = [], i, g, pcr;
  for (i = 0; i <= N; i++) {
    g = gMin + (gMax - gMin) * i / N;
    pcr = pcrEquilibrio(g, prod, secr);
    pts.push({ gfr: g, pcr: pcr, x: padL + (g - gMin) * pxX, y: baseY - clampv(pcr, 0, yMax) * pxY });
  }
  var gc = clampv(state.gfr !== undefined ? state.gfr : 120, gMin, gMax);
  var pcrc = pcrEquilibrio(gc, prod, secr);
  return {
    W: W, H: H, padL: padL, padR: padR, padT: padT, padB: padB, baseY: baseY,
    gMin: gMin, gMax: gMax, yMax: yMax, pxX: pxX, pxY: pxY,
    axis: { x0: padL, y0: padT, xEnd: W - padR, yEnd: baseY },
    pts: pts, current: { x: padL + (gc - gMin) * pxX, y: baseY - clampv(pcrc, 0, yMax) * pxY, gfr: gc, pcr: pcrc }
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    clampv: clampv, clearanceMedido: clearanceMedido, pcrEquilibrio: pcrEquilibrio,
    clearance: clearance, pcrCurveLayout: pcrCurveLayout, PROD_STD: PROD_STD, VD: VD, SECR_STD: SECR_STD
  };
}
