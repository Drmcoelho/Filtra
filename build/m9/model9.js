/* =========================================================================
 * FILTRA · M9 — Sódio e volume: o rim defende o VOLUME CIRCULANTE EFETIVO.
 * ENGINE PURO. Espelhado inline no filtra9.html.
 *
 * Teses:
 *  - o Na⁺ é o osmol do ECF: o CONTEÚDO de Na define o VOLUME do ECF (≠ concentração = água, M10).
 *  - o rim defende o VOLUME CIRCULANTE EFETIVO (VCE) — o que enche o leito arterial —, não o ECF total.
 *  - VCE baixo → RAAS/SNS ativados → retém Na (FENa baixa); VCE/atrio cheios → ANP/BNP → natriurese.
 *  - efetivo ≠ total: ICC, cirrose e nefrótica têm ECF EXPANDIDO (edema) mas VCE BAIXO (subenchimento)
 *    → retêm Na avidamente apesar do excesso total. Edema = retenção de Na.
 *  - natriurese de pressão (Guyton): ↑PA → ↑excreção de Na (ponte com o Choca).
 * ========================================================================= */

function clampv(v, a, b) { var n = Number(v); if (!isFinite(n)) n = a; if (n < a) n = a; if (n > b) n = b; return n; }

// FENa em função do VCE e da pressão (natriurese de pressão)
function fenaFrom(ecv, map) {
  ecv = clampv(ecv, 0, 2); map = clampv(map, 40, 220);
  return clampv((0.12 + Math.max(0, ecv - 0.2) * 1.1) * (map / 95), 0.1, 8);
}

function volemia(input) {
  var inp = input || {};
  var ecv = clampv(inp.ecv !== undefined ? inp.ecv : 1, 0, 2);          // volume circulante EFETIVO (1 = normal)
  var totalECF = clampv(inp.totalECF !== undefined ? inp.totalECF : 1, 0, 3); // ECF TOTAL (1 = normal)
  var map = clampv(inp.map !== undefined ? inp.map : 95, 40, 220);

  // sensores e hormônios
  var aldo = clampv(2 - ecv, 0, 2);            // VCE baixo → RAAS↑ → aldosterona↑
  var renina = aldo, angII = aldo;
  var sns = clampv(2 - ecv, 0, 2);             // simpático↑ no VCE baixo
  var anp = clampv(totalECF, 0, 3);            // estiramento atrial/ECF cheio → ANP/BNP↑
  var adhVolume = ecv < 0.6;                    // "override" de volume: ADH sobe mesmo na hiponatremia

  // manejo renal do Na: VCE baixo → retém (FENa baixa); pressão alta → natriurese
  var FENa = fenaFrom(ecv, map);
  var urineNa = clampv(FENa * 28, 5, 130);     // mmol/L (aproximado, didático)

  var edema = totalECF > 1.3;
  var retencaoAvida = FENa < 1;
  // a dissociação: edema (ECF total alto) COM retenção ávida (FENa baixa) = subenchimento
  var subenchimento = edema && retencaoAvida;

  var classe;
  if (ecv < 0.7 && totalECF < 0.9) classe = 'hipovolemia';
  else if (subenchimento) classe = 'subenchimento';           // ICC, cirrose, nefrótica
  else if (totalECF > 1.3 && ecv >= 1.2) classe = 'sobrecarga'; // volume verdadeiro (ANP↑, natriurese)
  else classe = 'euvolemia';

  return {
    ecv: ecv, totalECF: totalECF, map: map, aldo: aldo, renina: renina, angII: angII, sns: sns, anp: anp,
    adhVolume: adhVolume, FENa: FENa, urineNa: urineNa, edema: edema, retencaoAvida: retencaoAvida,
    subenchimento: subenchimento, classe: classe
  };
}

// geometria PURA da curva FENa × VCE (a UI só pinta)
function volemiaLayout(state, W, H) {
  state = state || {};
  W = clampv(W, 200, 100000); H = clampv(H, 120, 100000);
  var padL = 52, padR = 16, padT = 18, padB = 38, baseY = H - padB;
  var eMin = 0, eMax = 2, N = 56;
  var map = clampv(state.map !== undefined ? state.map : 95, 40, 220);
  var pxX = (W - padL - padR) / (eMax - eMin);
  var yMax = 6;
  var pxY = (baseY - padT) / yMax;
  var pts = [], i, e, f;
  for (i = 0; i <= N; i++) {
    e = eMin + (eMax - eMin) * i / N;
    f = fenaFrom(e, map);
    pts.push({ ecv: e, FENa: f, x: padL + (e - eMin) * pxX, y: baseY - clampv(f, 0, yMax) * pxY });
  }
  var ec = clampv(state.ecv !== undefined ? state.ecv : 1, eMin, eMax);
  var fc = fenaFrom(ec, map);
  return {
    W: W, H: H, padL: padL, padR: padR, padT: padT, padB: padB, baseY: baseY, eMin: eMin, eMax: eMax, yMax: yMax, pxX: pxX, pxY: pxY,
    axis: { x0: padL, y0: padT, xEnd: W - padR, yEnd: baseY },
    pts: pts, current: { x: padL + (ec - eMin) * pxX, y: baseY - clampv(fc, 0, yMax) * pxY, ecv: ec, FENa: fc }
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { clampv: clampv, fenaFrom: fenaFrom, volemia: volemia, volemiaLayout: volemiaLayout };
}
