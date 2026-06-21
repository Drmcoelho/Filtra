/* =========================================================================
 * FILTRA · M13 — Ácido-base renal: o rim regula o HCO₃⁻; AG, delta-delta e as ATRs.
 * ENGINE PURO. Espelhado inline no filtra13.html.
 *
 * Teses:
 *  - o pulmão ajusta o PaCO₂ (rápido); o RIM regula o HCO₃⁻ (reabsorve o filtrado + REGENERA excretando
 *    H⁺ como acidez titulável e, sobretudo, NH₄⁺ — a amoniogênese é o tampão ajustável).
 *  - o ânion gap revela a NATUREZA da acidose metabólica (ácido fixo × perda de HCO₃/Cl⁺); a albumina baixa
 *    MASCARA o gap (corrigir).
 *  - o delta-delta desmascara distúrbios MISTOS; as ATRs são defeitos do néfron por segmento (II proximal,
 *    I distal, IV hipoaldo).
 * ========================================================================= */

function clampv(v, a, b) { var n = Number(v); if (!isFinite(n)) n = a; if (n < a) n = a; if (n > b) n = b; return n; }

// Henderson–Hasselbalch
function phFrom(hco3, paco2) {
  hco3 = clampv(hco3, 1, 60); paco2 = clampv(paco2, 5, 150);
  return 6.1 + (Math.log(hco3 / (0.03 * paco2)) / Math.LN10);
}
// HCO₃⁻ numa isóbara de PCO₂ (para o diagrama de Davenport)
function hco3FromPhPco2(pH, paco2) {
  pH = clampv(pH, 6.5, 8); paco2 = clampv(paco2, 5, 150);
  return 0.03 * paco2 * Math.pow(10, pH - 6.1);
}

function acidbase(input) {
  var inp = input || {};
  var Na = clampv(inp.Na !== undefined ? inp.Na : 140, 100, 180);
  var Cl = clampv(inp.Cl !== undefined ? inp.Cl : 104, 60, 140);
  var HCO3 = clampv(inp.HCO3 !== undefined ? inp.HCO3 : 24, 1, 60);
  var PaCO2 = clampv(inp.PaCO2 !== undefined ? inp.PaCO2 : 40, 5, 150);
  var albumin = clampv(inp.albumin !== undefined ? inp.albumin : 4.0, 0.5, 6);

  var pH = phFrom(HCO3, PaCO2);
  var AG = Na - (Cl + HCO3);
  var AGcorr = AG + 2.5 * (4.0 - albumin);          // correção pela albumina (cada 1 g/dL ↓ → +2,5 no AG)
  var highAG = AGcorr > 12;

  // estados primários (por convenção: faixas)
  var acidemia = pH < 7.35, alkalemia = pH > 7.45;
  var metabAcid = HCO3 < 22, metabAlk = HCO3 > 26;
  var respAcid = PaCO2 > 45, respAlk = PaCO2 < 35;

  // compensação esperada na acidose metabólica (Winter): PaCO₂ = 1,5·HCO₃ + 8 (±2)
  var winterExp = 1.5 * HCO3 + 8;

  // delta-delta (só faz sentido na acidose de AG alto): (ΔAG)/(ΔHCO₃)
  var deltaRatio = null;
  if (HCO3 < 24 && AGcorr > 12) deltaRatio = (AGcorr - 12) / (24 - HCO3);

  // classificação primária
  var primario;
  if (acidemia) primario = metabAcid ? 'acidose metabólica' : (respAcid ? 'acidose respiratória' : 'acidemia (misto)');
  else if (alkalemia) primario = metabAlk ? 'alcalose metabólica' : (respAlk ? 'alcalose respiratória' : 'alcalemia (misto)');
  else { // pH "normal": pode ser normal ou duplo distúrbio compensado
    if (metabAcid || respAcid || metabAlk || respAlk) primario = 'compensado / misto';
    else primario = 'normal';
  }
  var subtipo = '';
  if (metabAcid) subtipo = highAG ? 'ânion gap alto' : 'ânion gap normal (hiperclorêmica)';

  // achados mistos por Winter e delta-delta
  var misto = [];
  if (metabAcid) {
    if (PaCO2 > winterExp + 3) misto.push('+ acidose respiratória (PaCO₂ acima do esperado)');
    else if (PaCO2 < winterExp - 3) misto.push('+ alcalose respiratória (PaCO₂ abaixo do esperado)');
  }
  if (deltaRatio !== null) {
    if (deltaRatio < 0.9) misto.push('+ acidose de AG normal concomitante (Δ-Δ < 1)');
    else if (deltaRatio > 2.0) misto.push('+ alcalose metabólica concomitante (Δ-Δ > 2)');
  }

  return {
    Na: Na, Cl: Cl, HCO3: HCO3, PaCO2: PaCO2, albumin: albumin,
    pH: pH, AG: AG, AGcorr: AGcorr, highAG: highAG, winterExp: winterExp, deltaRatio: deltaRatio,
    acidemia: acidemia, alkalemia: alkalemia, metabAcid: metabAcid, metabAlk: metabAlk, respAcid: respAcid, respAlk: respAlk,
    primario: primario, subtipo: subtipo, misto: misto
  };
}

// geometria PURA do diagrama de Davenport (pH × HCO₃⁻ com isóbaras de PCO₂)
function acidbaseLayout(state, W, H) {
  state = state || {};
  W = clampv(W, 200, 100000); H = clampv(H, 120, 100000);
  var padL = 54, padR = 16, padT = 18, padB = 38, baseY = H - padB;
  var phMin = 7.0, phMax = 7.7, hMin = 0, hMax = 44, N = 48;
  var pxX = (W - padL - padR) / (phMax - phMin);
  var pxY = (baseY - padT) / (hMax - hMin);
  function X(ph) { return padL + (clampv(ph, phMin, phMax) - phMin) * pxX; }
  function Y(h) { return baseY - (clampv(h, hMin, hMax) - hMin) * pxY; }
  var isobars = [20, 40, 60, 80], lines = [], i, j, ph, h;
  for (i = 0; i < isobars.length; i++) {
    var pts = [];
    for (j = 0; j <= N; j++) {
      ph = phMin + (phMax - phMin) * j / N;
      h = hco3FromPhPco2(ph, isobars[i]);
      if (h <= hMax + 4) pts.push({ pH: ph, hco3: h, x: X(ph), y: Y(h) });
    }
    lines.push({ pco2: isobars[i], pts: pts });
  }
  var r = acidbase(state);
  return {
    W: W, H: H, padL: padL, padR: padR, padT: padT, padB: padB, baseY: baseY,
    phMin: phMin, phMax: phMax, hMin: hMin, hMax: hMax, pxX: pxX, pxY: pxY,
    axis: { x0: padL, y0: padT, xEnd: W - padR, yEnd: baseY },
    normalBox: { x1: X(7.35), x2: X(7.45), y1: Y(26), y2: Y(22) },
    isobars: lines,
    current: { x: X(r.pH), y: Y(r.HCO3), pH: r.pH, hco3: r.HCO3 }
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { clampv: clampv, phFrom: phFrom, hco3FromPhPco2: hco3FromPhPco2, acidbase: acidbase, acidbaseLayout: acidbaseLayout };
}
