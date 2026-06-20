/* =========================================================================
 * FILTRA · M11 — Potássio: o gradiente transcelular × o estoque, e o eletrólito que mata.
 * ENGINE PURO. Espelhado inline no filtra11.html.
 *
 * Teses:
 *  - 98% do K⁺ é INTRACELULAR: a caliemia plasmática é a ponta do iceberg; o estoque total pode estar
 *    depletado com K plasmático normal (o shift mascara).
 *  - dois balanços: INTERNO (shift transcelular, minuto a minuto — insulina, β, pH, lise celular) e
 *    EXTERNO (excreção renal, horas — secreção distal: aldosterona × aporte distal de Na, multiplicativo).
 *  - o K⁺ define o potencial de repouso da membrana (Nernst): tanto a HIPER quanto a HIPOcalemia matam,
 *    por mecanismos opostos no ECG.
 * ========================================================================= */

function clampv(v, a, b) { var n = Number(v); if (!isFinite(n)) n = a; if (n < a) n = a; if (n > b) n = b; return n; }

// potencial de repouso pela equação de Nernst (K intracelular ~140 mmol/L)
function emFrom(plasmaK) {
  plasmaK = clampv(plasmaK, 1, 12);
  return -61.5 * (Math.log(140 / plasmaK) / Math.LN10); // mV
}

// achado de ECG por mecanismo (o K muda o potencial → muda a despolarização/repolarização)
function ecgFrom(plasmaK) {
  plasmaK = clampv(plasmaK, 0, 20);
  if (plasmaK >= 7.5) return 'onda sinusoidal — risco de parada';
  if (plasmaK >= 6.5) return 'QRS alargado, P alargada';
  if (plasmaK >= 5.5) return 'onda T apiculada';
  if (plasmaK >= 3.5) return 'ECG normal';
  if (plasmaK >= 3.0) return 'T achatada, onda U incipiente';
  if (plasmaK >= 2.5) return 'ondas U, T achatada, extrassístoles';
  return 'arritmia — risco de TV/torsades';
}

function classeFrom(plasmaK) {
  if (plasmaK >= 6.0) return 'hipercalemia grave';
  if (plasmaK > 5.0) return 'hipercalemia';
  if (plasmaK >= 3.5) return 'normocalemia';
  if (plasmaK >= 2.5) return 'hipocalemia';
  return 'hipocalemia grave';
}

function potassium(input) {
  var inp = input || {};
  var kTotal = clampv(inp.kTotal !== undefined ? inp.kTotal : 1, 0, 2);     // estoque corporal total (1 = normal)
  var pH = clampv(inp.pH !== undefined ? inp.pH : 7.4, 6.8, 7.8);
  var insulin = clampv(inp.insulin !== undefined ? inp.insulin : 1, 0, 2);
  var beta = clampv(inp.beta !== undefined ? inp.beta : 1, 0, 2);           // tônus β-adrenérgico
  var aldo = clampv(inp.aldo !== undefined ? inp.aldo : 1, 0, 2);
  var distalNa = clampv(inp.distalNa !== undefined ? inp.distalNa : 1, 0, 2); // aporte distal de Na⁺/fluxo

  // o K plasmático "base" reflete o estoque; os shifts e a excreção o deslocam
  var base = 2.5 + kTotal * 1.7;                       // estoque → caliemia base (kTotal 1 → 4.2)
  var shiftPh = (7.4 - pH) * 4;                        // acidose (H⁺ entra, K⁺ sai) → ↑ plasma (~0,4/0,1pH)
  var shiftInsulin = -(insulin - 1) * 0.6;            // insulina → K⁺ para dentro → ↓ plasma
  var shiftBeta = -(beta - 1) * 0.5;                  // β-agonista → K⁺ para dentro → ↓ plasma
  var shiftExcr = -((aldo - 1) * 0.4 + (distalNa - 1) * 0.3); // excreção renal → ↓ plasma
  var plasmaK = clampv(base + shiftPh + shiftInsulin + shiftBeta + shiftExcr, 1.5, 9);

  // secreção distal de K⁺: precisa de aldosterona E aporte distal de Na (multiplicativo)
  var kSecretion = clampv(aldo * distalNa, 0, 4);

  var Em = emFrom(plasmaK);
  var ecg = ecgFrom(plasmaK);
  var classe = classeFrom(plasmaK);
  // o estoque pode estar depletado com plasma normal/alto (shift mascara): "depleção oculta"
  var depleçãoOculta = kTotal < 0.7 && plasmaK >= 3.5;
  var shiftTotal = shiftPh + shiftInsulin + shiftBeta;

  return {
    kTotal: kTotal, pH: pH, insulin: insulin, beta: beta, aldo: aldo, distalNa: distalNa,
    base: base, shiftPh: shiftPh, shiftInsulin: shiftInsulin, shiftBeta: shiftBeta, shiftExcr: shiftExcr,
    shiftTotal: shiftTotal, plasmaK: plasmaK, kSecretion: kSecretion, Em: Em, ecg: ecg, classe: classe,
    deplecaoOculta: depleçãoOculta
  };
}

// geometria PURA da curva Nernst Em × K plasmático
function potassiumLayout(state, W, H) {
  state = state || {};
  W = clampv(W, 200, 100000); H = clampv(H, 120, 100000);
  var padL = 54, padR = 16, padT = 18, padB = 38, baseY = H - padB;
  var kMin = 1.5, kMax = 9, N = 60;
  var emMin = -120, emMax = -70;                       // faixa de Em a desenhar (mV)
  var pxX = (W - padL - padR) / (kMax - kMin);
  var pxY = (baseY - padT) / (emMax - emMin);
  var pts = [], i, k, em, yv;
  for (i = 0; i <= N; i++) {
    k = kMin + (kMax - kMin) * i / N;
    em = clampv(emFrom(k), emMin, emMax);
    yv = baseY - (em - emMin) * pxY;
    pts.push({ k: k, Em: em, x: padL + (k - kMin) * pxX, y: yv });
  }
  var kc = clampv(state.plasmaK !== undefined ? state.plasmaK : (potassium(state).plasmaK), kMin, kMax);
  var emc = clampv(emFrom(kc), emMin, emMax);
  return {
    W: W, H: H, padL: padL, padR: padR, padT: padT, padB: padB, baseY: baseY, kMin: kMin, kMax: kMax,
    emMin: emMin, emMax: emMax, pxX: pxX, pxY: pxY,
    axis: { x0: padL, y0: padT, xEnd: W - padR, yEnd: baseY },
    pts: pts, current: { x: padL + (kc - kMin) * pxX, y: baseY - (emc - emMin) * pxY, k: kc, Em: emc }
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { clampv: clampv, emFrom: emFrom, ecgFrom: ecgFrom, classeFrom: classeFrom, potassium: potassium, potassiumLayout: potassiumLayout };
}
