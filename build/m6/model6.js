/* =========================================================================
 * FILTRA · M6 — Alça de Henle: NKCC2, contracorrente, gradiente corticomedular
 * e os DIURÉTICOS DE ALÇA (§8): furosemida, bumetanida, torasemida.
 * ENGINE PURO. Espelhado inline no filtra6.html.
 *
 * Teses:
 *  - o ramo descendente concentra (água sai); o ramo ESPESSO (TAL) dilui e BOMBEIA NaCl
 *    pelo NKCC2 → cria o gradiente corticomedular (multiplicador contracorrente).
 *  - o gradiente é o que permite concentrar a urina depois (ADH no ducto, M8).
 *  - o diurético de alça bloqueia o NKCC2: natriurese potente (TETO ALTO), abole o gradiente
 *    (não concentra nem dilui ao máximo), e tem dose-resposta com teto + braking.
 *  - bumetanida ≈ 40× mais potente que a furosemida (mesma curva, EC50 menor).
 *  - perde Na/K/Cl/Ca/Mg (hipoK, hipoCa, hipoMg, alcalose) — usa-se a perda de Ca na hipercalcemia.
 * ========================================================================= */

function clampv(v, a, b) { var n = Number(v); if (!isFinite(n)) n = a; if (n < a) n = a; if (n > b) n = b; return n; }

// fármacos: dose com UNIDADE + mecanismo (§8). EC50 menor = mais potente.
var FARMACOS = {
  nenhum: { nome: '— nenhum —', unidade: '', faixa: [0, 0], ec50: 1, alvo: '', potencia: '' },
  furosemida: { nome: 'Furosemida', unidade: 'mg', faixa: [20, 80], ec50: 20, alvo: 'NKCC2 (ramo espesso ascendente)', potencia: 'referência (1×)' },
  bumetanida: { nome: 'Bumetanida', unidade: 'mg', faixa: [0.5, 2], ec50: 0.5, alvo: 'NKCC2 (ramo espesso ascendente)', potencia: '≈40× a furosemida' },
  torasemida: { nome: 'Torasemida', unidade: 'mg', faixa: [10, 20], ec50: 7.5, alvo: 'NKCC2 (ramo espesso ascendente)', potencia: '≈2–3× a furosemida; meia-vida maior' }
};

// dose-resposta sigmoide (Emax)
function emaxModel(dose, ec50, emax) {
  dose = clampv(dose, 0, 1e6); ec50 = clampv(ec50, 1e-6, 1e6); emax = clampv(emax, 0, 1);
  return clampv(emax * dose / (ec50 + dose), 0, 1);
}

// função-mãe
function alca(input) {
  var inp = input || {};
  var gfr = clampv(inp.gfr !== undefined ? inp.gfr : 120, 1, 250);
  var adh = inp.adh !== false;                       // ADH presente (concentrando)?
  var cronico = inp.cronico === true;                // uso crônico → braking (adaptação distal)
  var droga = String(inp.droga == null ? 'nenhum' : inp.droga).toLowerCase();
  if (!FARMACOS.hasOwnProperty(droga)) droga = 'nenhum';
  var meta = FARMACOS[droga];
  var dose = clampv(inp.dose !== undefined ? inp.dose : (meta.faixa[0] || 0), 0, 5000);

  // bloqueio do NKCC2 pela curva Emax
  var bloqueio = droga === 'nenhum' ? 0 : emaxModel(dose, meta.ec50, 0.9);
  var nkcc2 = clampv(1 - bloqueio, 0, 1);            // atividade do cotransportador (0..1)

  // gradiente corticomedular criado pelo TAL (300 isosmótico → ~1200 na papila)
  var gradiente = clampv(300 + nkcc2 * 900, 300, 1200);

  // natriurese: FENa basal ~0.8%; o teto do diurético de alça é alto (~25%)
  var braking = cronico ? 0.6 : 1;                   // adaptação distal reduz o efeito líquido
  var FENa = clampv(0.8 + bloqueio * 24 * braking, 0.8, 25);

  // capacidade de concentrar: com ADH e gradiente alto → urina concentrada; sem gradiente → isostenúria
  var urineOsm = adh ? gradiente : clampv(50 + (gradiente - 300) * 0.3, 50, 1200);
  // o diurético de alça também impede a DILUIÇÃO máxima (o TAL é o segmento diluidor)
  var podeConcentrar = gradiente > 600;
  var podeDiluirMax = nkcc2 > 0.5;

  // eletrólitos perdidos (índice 0..1) — Na/K/Cl/Ca/Mg seguem o bloqueio
  var perda = bloqueio;
  var perdaCa = bloqueio > 0.2;                       // alça PERDE cálcio (≠ tiazídico)
  var ceilingReached = bloqueio > 0.85;

  var classe;
  if (droga === 'nenhum') classe = 'normal';
  else if (ceilingReached) classe = 'diuretico_alca_teto';
  else classe = 'diuretico_alca';

  return {
    gfr: gfr, adh: adh, cronico: cronico, droga: droga, dose: dose, unidade: meta.unidade, alvo: meta.alvo,
    faixa: meta.faixa, nomeFarmaco: meta.nome, potencia: meta.potencia, bloqueio: bloqueio, nkcc2: nkcc2,
    gradiente: gradiente, FENa: FENa, braking: braking, urineOsm: urineOsm, podeConcentrar: podeConcentrar,
    podeDiluirMax: podeDiluirMax, perda: perda, perdaCa: perdaCa, ceilingReached: ceilingReached, classe: classe
  };
}

// geometria PURA da curva dose-resposta FENa × dose (teto alto + potência por EC50)
function alcaLayout(state, W, H) {
  state = state || {};
  W = clampv(W, 200, 100000); H = clampv(H, 120, 100000);
  var padL = 52, padR = 16, padT = 18, padB = 38, baseY = H - padB;
  var droga = String(state.droga == null ? 'furosemida' : state.droga).toLowerCase();
  if (!FARMACOS.hasOwnProperty(droga) || droga === 'nenhum') droga = 'furosemida';
  var meta = FARMACOS[droga];
  var cronico = state.cronico === true, braking = cronico ? 0.6 : 1;
  var dMax = meta.ec50 * 10, N = 60;
  var yMax = 26;                                     // FENa %
  var pxX = (W - padL - padR) / dMax, pxY = (baseY - padT) / yMax;
  var pts = [], i, d, b, fena;
  for (i = 0; i <= N; i++) {
    d = dMax * i / N;
    b = emaxModel(d, meta.ec50, 0.9);
    fena = clampv(0.8 + b * 24 * braking, 0.8, 25);
    pts.push({ dose: d, FENa: fena, x: padL + d * pxX, y: baseY - clampv(fena, 0, yMax) * pxY });
  }
  var dc = clampv(state.dose !== undefined ? state.dose : meta.faixa[0], 0, dMax);
  var bc = emaxModel(dc, meta.ec50, 0.9), fc = clampv(0.8 + bc * 24 * braking, 0.8, 25);
  return {
    W: W, H: H, padL: padL, padR: padR, padT: padT, padB: padB, baseY: baseY, dMax: dMax, yMax: yMax, pxX: pxX, pxY: pxY,
    axis: { x0: padL, y0: padT, xEnd: W - padR, yEnd: baseY },
    pts: pts, current: { x: padL + dc * pxX, y: baseY - clampv(fc, 0, yMax) * pxY, dose: dc, FENa: fc }
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { clampv: clampv, emaxModel: emaxModel, alca: alca, alcaLayout: alcaLayout, FARMACOS: FARMACOS };
}
