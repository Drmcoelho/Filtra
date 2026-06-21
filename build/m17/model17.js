/* =========================================================================
 * FILTRA · M17 — Farmacologia diurética integrada (capstone 1): o néfron inteiro como alvo.
 * ENGINE PURO. Espelhado inline no filtra17.html. Guarda farmacológica invertida (§8):
 * cada classe entra com DOSE (mg) ancorada ao seu transportador; o efeito vem da dose-resposta (Emax).
 *
 * Teses:
 *  - cada diurético é uma chave numa fechadura de UM segmento; a curva dose-resposta é fisiologia, com TETO.
 *  - o néfron é uma CASCATA: bloquear um segmento joga Na adiante, e o segmento de baixo COMPENSA.
 *  - o braking (uso crônico) hipertrofia o néfron distal → desloca a curva à direita (tolerância).
 *  - a SINERGIA mora na sequência: bloquear o segmento que compensa (alça + tiazídico) multiplica a natriurese.
 *  - a RESISTÊNCIA é, em grande parte, falha de ENTREGA luminal do fármaco (TFG↓, hipoalbuminemia, proteinúria, AINE).
 * ========================================================================= */

function clampv(v, a, b) { var n = Number(v); if (!isFinite(n)) n = a; if (n < a) n = a; if (n > b) n = b; return n; }

// dose-resposta de Emax/Hill: fração de bloqueio do transportador (0..emax)
function emaxModel(dose, ec50, emax) {
  dose = clampv(dose, 0, 1e6); ec50 = clampv(ec50, 1e-6, 1e6); emax = clampv(emax, 0, 1);
  return emax * dose / (ec50 + dose);
}

// fármacos por segmento: alvo, faixa de dose (mg) e parâmetros de dose-resposta
var DRUGS = {
  acetazolamida: { seg: 'TCP', alvo: 'anidrase carbônica', unidade: 'mg', faixa: '250–500 mg', ec50: 250, emax: 0.45 },
  furosemida: { seg: 'alça', alvo: 'NKCC2', unidade: 'mg', faixa: '20–80 mg', ec50: 18, emax: 0.88 },
  tiazida: { seg: 'TCD', alvo: 'NCC', unidade: 'mg', faixa: '12,5–50 mg', ec50: 12, emax: 0.55 },
  poupadorK: { seg: 'ducto', alvo: 'ENaC / receptor de aldosterona', unidade: 'mg', faixa: '5–10 mg (amilorida)', ec50: 5, emax: 0.45 }
};

function diuretics(input) {
  var inp = input || {};
  var ca = clampv(inp.ca !== undefined ? inp.ca : 0, 0, 1000);        // acetazolamida (mg)
  var loop = clampv(inp.loop !== undefined ? inp.loop : 0, 0, 400);   // furosemida-equiv (mg)
  var thz = clampv(inp.thz !== undefined ? inp.thz : 0, 0, 100);      // tiazídico HCTZ-equiv (mg)
  var ksp = clampv(inp.ksp !== undefined ? inp.ksp : 0, 0, 40);       // poupador de K amilorida-equiv (mg)
  var braking = clampv(inp.braking !== undefined ? inp.braking : 0, 0, 1);   // uso crônico → hipertrofia distal
  var delivery = clampv(inp.delivery !== undefined ? inp.delivery : 1, 0.05, 1); // entrega luminal (1 = normal)

  // a resistência reduz a ENTREGA luminal → dose efetiva menor
  var blockCA = emaxModel(ca * delivery, DRUGS.acetazolamida.ec50, DRUGS.acetazolamida.emax);
  var blockLoop = emaxModel(loop * delivery, DRUGS.furosemida.ec50, DRUGS.furosemida.emax);
  var blockThz = emaxModel(thz * delivery, DRUGS.tiazida.ec50, DRUGS.tiazida.emax);
  var blockKsp = emaxModel(ksp * delivery, DRUGS.poupadorK.ec50, DRUGS.poupadorK.emax);

  // frações de reabsorção do Na DELIVERED por segmento (basais)
  var fTCP = 0.67, fTAL = 0.80, fTCD = 0.55, fCD = 0.70;
  // braking: o néfron distal hipertrofia → reabsorve fração maior (aproxima de 1)
  var fTCDb = fTCD + (1 - fTCD) * braking * 0.55;
  var fCDb = fCD + (1 - fCD) * braking * 0.55;

  // cascata: filtrado = 100 (% da carga filtrada de Na)
  var filt = 100;
  var rTCP = filt * fTCP * (1 - blockCA); var dTAL = filt - rTCP;
  var rTAL = dTAL * fTAL * (1 - blockLoop); var dTCD = dTAL - rTAL;
  var rTCD = dTCD * fTCDb * (1 - blockThz); var dCD = dTCD - rTCD;
  var rCD = dCD * fCDb * (1 - blockKsp); var escaped = dCD - rCD;
  var FENa = clampv(escaped, 0, 100);

  // referência sem nenhum fármaco (mesmo braking/delivery) p/ medir efeito e sinergia
  function escapeNoDrug() {
    var a = filt * fTCP; var b = (filt - a); var c = b * fTAL; var d = (b - c);
    var e = d * fTCDb; var f = (d - e); var g = f * fCDb; return (f - g);
  }
  var FENaBasal = clampv(escapeNoDrug(), 0, 100);
  var deltaFENa = FENa - FENaBasal;

  var segments = [
    { name: 'TCP', alvo: 'anidrase carbônica', delivered: filt, reabsorbed: rTCP, block: blockCA },
    { name: 'alça', alvo: 'NKCC2', delivered: dTAL, reabsorbed: rTAL, block: blockLoop },
    { name: 'TCD', alvo: 'NCC', delivered: dTCD, reabsorbed: rTCD, block: blockThz },
    { name: 'ducto', alvo: 'ENaC/MR', delivered: dCD, reabsorbed: rCD, block: blockKsp }
  ];

  var usados = [];
  if (ca > 0) usados.push('acetazolamida');
  if (loop > 0) usados.push('alça (furosemida)');
  if (thz > 0) usados.push('tiazídico');
  if (ksp > 0) usados.push('poupador de K');

  var sinergia = loop > 0 && thz > 0;           // bloqueio sequencial alça + tiazídico
  var brakingAtivo = braking > 0.3;
  var resistencia = delivery < 0.7;

  return {
    ca: ca, loop: loop, thz: thz, ksp: ksp, braking: braking, delivery: delivery,
    blockCA: blockCA, blockLoop: blockLoop, blockThz: blockThz, blockKsp: blockKsp,
    FENa: FENa, FENaBasal: FENaBasal, deltaFENa: deltaFENa, segments: segments,
    usados: usados, sinergia: sinergia, brakingAtivo: brakingAtivo, resistencia: resistencia
  };
}

// geometria PURA da curva dose-resposta FENa × dose de alça (com teto/braking/sinergia conforme o estado)
function diureticsLayout(state, W, H) {
  state = state || {};
  W = clampv(W, 200, 100000); H = clampv(H, 120, 100000);
  var padL = 54, padR = 16, padT = 18, padB = 38, baseY = H - padB;
  var dMin = 0, dMax = 160, N = 56, yMax = 12;
  var pxX = (W - padL - padR) / (dMax - dMin);
  var pxY = (baseY - padT) / yMax;
  var base = {
    ca: clampv(state.ca || 0, 0, 1000), thz: clampv(state.thz || 0, 0, 100), ksp: clampv(state.ksp || 0, 0, 40),
    braking: clampv(state.braking || 0, 0, 1), delivery: clampv(state.delivery !== undefined ? state.delivery : 1, 0.05, 1)
  };
  var pts = [], i, dose, r;
  for (i = 0; i <= N; i++) {
    dose = dMin + (dMax - dMin) * i / N;
    r = diuretics({ ca: base.ca, loop: dose, thz: base.thz, ksp: base.ksp, braking: base.braking, delivery: base.delivery });
    pts.push({ dose: dose, FENa: r.FENa, x: padL + (dose - dMin) * pxX, y: baseY - clampv(r.FENa, 0, yMax) * pxY });
  }
  var dc = clampv(state.loop !== undefined ? state.loop : 40, dMin, dMax);
  var rc = diuretics({ ca: base.ca, loop: dc, thz: base.thz, ksp: base.ksp, braking: base.braking, delivery: base.delivery });
  return {
    W: W, H: H, padL: padL, padR: padR, padT: padT, padB: padB, baseY: baseY, dMin: dMin, dMax: dMax, yMax: yMax, pxX: pxX, pxY: pxY,
    axis: { x0: padL, y0: padT, xEnd: W - padR, yEnd: baseY },
    pts: pts, current: { x: padL + (dc - dMin) * pxX, y: baseY - clampv(rc.FENa, 0, yMax) * pxY, dose: dc, FENa: rc.FENa }
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { clampv: clampv, emaxModel: emaxModel, DRUGS: DRUGS, diuretics: diuretics, diureticsLayout: diureticsLayout };
}
