/* =========================================================================
 * FILTRA · M7 — TCD: NCC, manejo de Ca²⁺, o segmento diluidor distal e os TIAZÍDICOS (§8).
 * ENGINE PURO. Espelhado inline no filtra7.html.
 *
 * Teses:
 *  - o TCD ajusta fino o Na pelo NCC (Na-Cl) e é o "diluidor distal"; teto BAIXO de natriurese.
 *  - PARADOXO DO CÁLCIO: o tiazídico RETÉM Ca²⁺ (↓Ca urinário) — oposto do diurético de alça.
 *  - tiazídico perde eficácia na TFG baixa (<30) — ao contrário do de alça.
 *  - efeitos: hipoK, hipoNa (prejudica a diluição), e "hiper-tudo" exceto Ca (hiperCa leve, úrico, glicose).
 *  - Gitelman = perda genética do NCC ≈ tiazídico crônico.
 * ========================================================================= */

function clampv(v, a, b) { var n = Number(v); if (!isFinite(n)) n = a; if (n < a) n = a; if (n > b) n = b; return n; }

var FARMACOS = {
  nenhum: { nome: '— nenhum —', unidade: '', faixa: [0, 0], ec50: 1, alvo: '', nota: '' },
  hidroclorotiazida: { nome: 'Hidroclorotiazida', unidade: 'mg/dia', faixa: [12.5, 50], ec50: 12.5, alvo: 'NCC (cotransportador Na-Cl, TCD)', nota: 'referência' },
  clortalidona: { nome: 'Clortalidona', unidade: 'mg/dia', faixa: [12.5, 25], ec50: 10, alvo: 'NCC (cotransportador Na-Cl, TCD)', nota: 'mais potente, meia-vida longa' },
  indapamida: { nome: 'Indapamida', unidade: 'mg/dia', faixa: [1.5, 2.5], ec50: 1.25, alvo: 'NCC (cotransportador Na-Cl, TCD)', nota: 'tiazídico-símile' }
};

function emaxModel(dose, ec50, emax) {
  dose = clampv(dose, 0, 1e6); ec50 = clampv(ec50, 1e-6, 1e6); emax = clampv(emax, 0, 1);
  return clampv(emax * dose / (ec50 + dose), 0, 1);
}

function tcd(input) {
  var inp = input || {};
  var gfr = clampv(inp.gfr !== undefined ? inp.gfr : 120, 1, 250);
  var gitelman = inp.gitelman === true;
  var droga = String(inp.droga == null ? 'nenhum' : inp.droga).toLowerCase();
  if (!FARMACOS.hasOwnProperty(droga)) droga = 'nenhum';
  var meta = FARMACOS[droga];
  var dose = clampv(inp.dose !== undefined ? inp.dose : (meta.faixa[0] || 0), 0, 5000);

  var efeito = droga === 'nenhum' ? 0 : emaxModel(dose, meta.ec50, 0.9);
  // bloqueio efetivo do NCC: fármaco ou perda genética (Gitelman ≈ tiazídico crônico)
  var nccBlock = Math.max(efeito, gitelman ? 0.8 : 0);
  var ncc = clampv(1 - nccBlock, 0, 1);

  // eficácia cai na TFG baixa (o tiazídico precisa chegar/filtrar; <30 perde força)
  var eficaciaGFR = clampv((gfr - 15) / 15, 0, 1);

  // natriurese de TETO BAIXO (FENa ~5% vs ~25% do de alça)
  var FENa = clampv(0.8 + nccBlock * 4.2 * (gitelman ? 1 : eficaciaGFR), 0.6, 6);

  // PARADOXO DO CÁLCIO: tiazídico ↓ Ca urinário (retém Ca)
  var caUrinaria = clampv(1 - nccBlock * 0.6, 0.25, 1.2);   // relativo (1 = normal)
  var plasmaCa = clampv(9.5 + nccBlock * 0.6, 8.5, 11.5);   // mg/dL (leve hiperCa)

  // potássio: mais Na ao ducto → secreta K → hipoK
  var plasmaK = clampv(4.0 - nccBlock * 1.1, 2.6, 4.5);
  var hipoK = plasmaK < 3.5;

  // diluição distal prejudicada → risco de hiponatremia (clássico do tiazídico)
  var diluicaoPrejudicada = nccBlock > 0.3;
  var plasmaNa = clampv(140 - nccBlock * 6, 125, 142);

  var classe;
  if (gitelman) classe = 'gitelman';
  else if (nccBlock > 0.1) classe = 'tiazidico';
  else classe = 'normal';

  return {
    gfr: gfr, gitelman: gitelman, droga: droga, dose: dose, unidade: meta.unidade, alvo: meta.alvo, faixa: meta.faixa,
    nomeFarmaco: meta.nome, nota: meta.nota, efeito: efeito, nccBlock: nccBlock, ncc: ncc, eficaciaGFR: eficaciaGFR,
    FENa: FENa, caUrinaria: caUrinaria, plasmaCa: plasmaCa, plasmaK: plasmaK, hipoK: hipoK,
    diluicaoPrejudicada: diluicaoPrejudicada, plasmaNa: plasmaNa, classe: classe
  };
}

// geometria PURA da curva FENa × dose (teto BAIXO) — contraste com o de alça (M6)
function tcdLayout(state, W, H) {
  state = state || {};
  W = clampv(W, 200, 100000); H = clampv(H, 120, 100000);
  var padL = 52, padR = 16, padT = 18, padB = 38, baseY = H - padB;
  var droga = String(state.droga == null ? 'hidroclorotiazida' : state.droga).toLowerCase();
  if (!FARMACOS.hasOwnProperty(droga) || droga === 'nenhum') droga = 'hidroclorotiazida';
  var meta = FARMACOS[droga];
  var gfr = clampv(state.gfr !== undefined ? state.gfr : 120, 1, 250);
  var efic = clampv((gfr - 15) / 15, 0, 1);
  var dMax = meta.ec50 * 10, N = 60, yMax = 26;     // mesmo eixo do M6 (FENa%) p/ ver o teto baixo
  var pxX = (W - padL - padR) / dMax, pxY = (baseY - padT) / yMax;
  var pts = [], i, d, b, fena;
  for (i = 0; i <= N; i++) {
    d = dMax * i / N;
    b = emaxModel(d, meta.ec50, 0.9);
    fena = clampv(0.8 + b * 4.2 * efic, 0.6, 6);
    pts.push({ dose: d, FENa: fena, x: padL + d * pxX, y: baseY - clampv(fena, 0, yMax) * pxY });
  }
  var dc = clampv(state.dose !== undefined ? state.dose : meta.faixa[0], 0, dMax);
  var bc = emaxModel(dc, meta.ec50, 0.9), fc = clampv(0.8 + bc * 4.2 * efic, 0.6, 6);
  return {
    W: W, H: H, padL: padL, padR: padR, padT: padT, padB: padB, baseY: baseY, dMax: dMax, yMax: yMax, pxX: pxX, pxY: pxY,
    axis: { x0: padL, y0: padT, xEnd: W - padR, yEnd: baseY },
    pts: pts, current: { x: padL + dc * pxX, y: baseY - clampv(fc, 0, yMax) * pxY, dose: dc, FENa: fc }
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { clampv: clampv, emaxModel: emaxModel, tcd: tcd, tcdLayout: tcdLayout, FARMACOS: FARMACOS };
}
