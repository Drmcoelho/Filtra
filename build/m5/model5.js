/* =========================================================================
 * FILTRA · M5 — TCP: reabsorção isosmótica, Na/glicose (SGLT2), HCO₃/anidrase
 * carbônica, Fanconi — e a FARMACOLOGIA encadeada no segmento (§8).
 * ENGINE PURO. Espelhado inline no filtra5.html.
 *
 * Teses:
 *  - o TCP reabsorve ~65% do Na filtrado (isosmótico): a alça é prisioneira do proximal.
 *  - glicose: SGLT2 (S1) reabsorve ~90%; há um Tm → limiar de glicosúria (~180–200 mg/dL).
 *  - HCO₃ é "reabsorvido" pela anidrase carbônica no TCP; bloqueá-la → bicarbonatúria → acidose.
 *  - cada fármaco é uma CHAVE de um transportador, com dose-resposta sigmoide (Emax):
 *      SGLT2i (empagliflozina), acetazolamida (anidrase carbônica), manitol (osmótico).
 *  - Fanconi = disfunção global do TCP → glicosúria normoglicêmica + bicarbonatúria + fosfatúria.
 * ========================================================================= */

function clampv(v, a, b) { var n = Number(v); if (!isFinite(n)) n = a; if (n < a) n = a; if (n > b) n = b; return n; }

// metadados dos fármacos (dose com UNIDADE + mecanismo — §8)
var FARMACOS = {
  nenhum: { nome: '— nenhum —', unidade: '', faixa: [0, 0], ec50: 1, alvo: '', efeito: '' },
  sglt2i: { nome: 'Empagliflozina (SGLT2i)', unidade: 'mg/dia', faixa: [10, 25], ec50: 3, alvo: 'SGLT2 (cotransportador Na/glicose, S1 do TCP)', efeito: 'glicosúria + natriurese leve' },
  acetazolamida: { nome: 'Acetazolamida', unidade: 'mg/dia', faixa: [250, 500], ec50: 250, alvo: 'anidrase carbônica (TCP)', efeito: 'bicarbonatúria → acidose metabólica' },
  manitol: { nome: 'Manitol', unidade: 'g/kg', faixa: [0.25, 1.5], ec50: 0.5, alvo: 'osmol não reabsorvido (luz tubular)', efeito: 'diurese osmótica (dose-linear)' }
};

// dose-resposta sigmoide (Emax): efeito fracionário 0..1
function emaxModel(dose, ec50, emax) {
  dose = clampv(dose, 0, 1e6); ec50 = clampv(ec50, 1e-6, 1e6); emax = clampv(emax, 0, 1);
  var e = emax * dose / (ec50 + dose);
  return clampv(e, 0, 1);
}

// manejo da glicose: filtrada / reabsorvida (Tm) / excretada (mg/min) + limiar (mg/dL)
function glicoseHandling(plasmaGlu, gfr, TmG) {
  plasmaGlu = clampv(plasmaGlu, 20, 1200); gfr = clampv(gfr, 1, 250); TmG = clampv(TmG, 0, 500);
  var filtrada = gfr * plasmaGlu / 100;            // mg/min
  var reabs = Math.min(filtrada, TmG);
  var excr = Math.max(filtrada - reabs, 0);
  var limiar = gfr > 0 ? TmG / gfr * 100 : 0;       // plasmaGlu (mg/dL) em que começa a glicosúria
  return { filtrada: filtrada, reabsorvida: reabs, excretada: excr, limiar: limiar };
}

// função-mãe
function tcp(input) {
  var inp = input || {};
  var plasmaGlu = clampv(inp.plasmaGlu !== undefined ? inp.plasmaGlu : 100, 20, 1200);
  var gfr = clampv(inp.gfr !== undefined ? inp.gfr : 125, 1, 250);
  var plasmaHCO3 = clampv(inp.plasmaHCO3 !== undefined ? inp.plasmaHCO3 : 24, 5, 40);
  var fanconi = inp.fanconi === true;
  var droga = String(inp.droga == null ? 'nenhum' : inp.droga).toLowerCase();
  if (!FARMACOS.hasOwnProperty(droga)) droga = 'nenhum';
  var meta = FARMACOS[droga];
  var dose = clampv(inp.dose !== undefined ? inp.dose : (meta.faixa[0] || 0), 0, 5000);

  // efeito do fármaco (fração 0..1)
  //  - SGLT2i e acetazolamida: curva Emax saturável (Tm/receptor → há TETO; dobrar a dose rende pouco)
  //  - manitol: diurese OSMÓTICA é ~LINEAR na dose (não há receptor a saturar); fração = dose/faixaMax
  var efeitoFarm;
  if (droga === 'nenhum') efeitoFarm = 0;
  else if (droga === 'manitol') efeitoFarm = clampv(dose / (meta.faixa[1] || 1), 0, 1);
  else efeitoFarm = emaxModel(dose, meta.ec50, 0.95);

  // ----- glicose -----
  var TmG0 = 375;                                   // Tm normal (mg/min)
  var TmG = TmG0;
  if (droga === 'sglt2i') TmG = TmG0 * (1 - 0.95 * efeitoFarm); // bloqueio do SGLT2 derruba o Tm
  if (fanconi) TmG = Math.min(TmG, TmG0 * 0.15);                // vazamento proximal de glicose
  var glu = glicoseHandling(plasmaGlu, gfr, TmG);
  var glicosuria = glu.excretada > 1;              // mg/min relevante

  // ----- bicarbonato (anidrase carbônica no TCP) -----
  var reabsHCO3frac = 0.85;                         // fração reabsorvida no TCP (basal)
  if (droga === 'acetazolamida') reabsHCO3frac *= (1 - 0.7 * efeitoFarm);
  if (fanconi) reabsHCO3frac *= 0.6;               // ATR proximal (tipo 2)
  var filtHCO3 = gfr * plasmaHCO3 / 100;           // mmol/min (escala relativa)
  var urinaHCO3 = filtHCO3 * (0.85 - reabsHCO3frac > 0 ? (0.85 - reabsHCO3frac) : 0) / 0.85;
  var perdaHCO3 = (0.85 - reabsHCO3frac) / 0.85;   // fração de HCO₃ perdida vs basal (0..1)
  var plasmaHCO3novo = clampv(plasmaHCO3 - perdaHCO3 * 8, 8, 40); // acidose proporcional
  var bicarbonaturia = perdaHCO3 > 0.05;

  // ----- sódio / diurese (TCP reabsorve ~65% do Na) -----
  var naReabsFrac = 0.65;
  var natriurese = 0;
  if (droga === 'acetazolamida') natriurese = 0.25 * efeitoFarm;  // bloqueia o NHE3 acoplado
  if (droga === 'sglt2i') natriurese = 0.15 * efeitoFarm;        // bloqueia o cotransporte Na/glicose
  naReabsFrac = clampv(0.65 - natriurese, 0.3, 0.65);
  // diurese osmótica: glicose e/ou manitol não reabsorvidos retêm água na luz
  var cargaOsmotica = glu.excretada / 50;          // glicose excretada
  if (droga === 'manitol') cargaOsmotica += efeitoFarm * 3;
  var diureseIndex = clampv(1 + natriurese * 2 + cargaOsmotica, 1, 8);

  // classificação do efeito dominante
  var classe;
  if (fanconi) classe = 'fanconi';
  else if (droga === 'sglt2i' && glicosuria) classe = 'glicosuria';
  else if (droga === 'acetazolamida' && bicarbonaturia) classe = 'bicarbonaturia';
  else if (droga === 'manitol') classe = 'diurese_osmotica';
  else if (glicosuria) classe = 'glicosuria_hiperglicemica';
  else classe = 'normal';

  return {
    plasmaGlu: plasmaGlu, gfr: gfr, plasmaHCO3: plasmaHCO3, fanconi: fanconi, droga: droga, dose: dose,
    unidade: meta.unidade, alvo: meta.alvo, faixa: meta.faixa, nomeFarmaco: meta.nome, efeitoFarm: efeitoFarm,
    TmG: TmG, gluFiltrada: glu.filtrada, gluReabsorvida: glu.reabsorvida, gluExcretada: glu.excretada, limiarGlu: glu.limiar,
    glicosuria: glicosuria, reabsHCO3frac: reabsHCO3frac, urinaHCO3: urinaHCO3, perdaHCO3: perdaHCO3,
    plasmaHCO3novo: plasmaHCO3novo, bicarbonaturia: bicarbonaturia, naReabsFrac: naReabsFrac,
    diureseIndex: diureseIndex, classe: classe
  };
}

// geometria PURA da curva de titulação da glicose (filtrada/reabsorvida/excretada × plasmaGlu)
function tcpLayout(state, W, H) {
  state = state || {};
  W = clampv(W, 200, 100000); H = clampv(H, 120, 100000);
  var padL = 52, padR = 16, padT = 18, padB = 38, baseY = H - padB;
  var pgMin = 0, pgMax = 600, N = 60;
  var gfr = clampv(state.gfr !== undefined ? state.gfr : 125, 1, 250);
  var droga = String(state.droga == null ? 'nenhum' : state.droga).toLowerCase();
  var fanconi = state.fanconi === true;
  var dose = clampv(state.dose !== undefined ? state.dose : 0, 0, 5000);
  var ec50 = (FARMACOS[droga] || FARMACOS.nenhum).ec50;
  var efeito = droga === 'nenhum' ? 0 : emaxModel(dose, ec50, 0.95);
  var TmG = 375;
  if (droga === 'sglt2i') TmG = 375 * (1 - 0.95 * efeito);
  if (fanconi) TmG = Math.min(TmG, 375 * 0.15);
  var yMax = gfr * pgMax / 100;                     // mg/min máx (= filtrada em pgMax)
  var pxX = (W - padL - padR) / (pgMax - pgMin), pxY = (baseY - padT) / yMax;
  var filt = [], reab = [], excr = [], i, pg, g;
  for (i = 0; i <= N; i++) {
    pg = pgMin + (pgMax - pgMin) * i / N;
    g = glicoseHandling(pg, gfr, TmG);
    var x = padL + (pg - pgMin) * pxX;
    filt.push({ x: x, y: baseY - clampv(g.filtrada, 0, yMax) * pxY });
    reab.push({ x: x, y: baseY - clampv(g.reabsorvida, 0, yMax) * pxY });
    excr.push({ x: x, y: baseY - clampv(g.excretada, 0, yMax) * pxY });
  }
  var pgc = clampv(state.plasmaGlu !== undefined ? state.plasmaGlu : 100, pgMin, pgMax);
  var gc = glicoseHandling(pgc, gfr, TmG);
  return {
    W: W, H: H, padL: padL, padR: padR, padT: padT, padB: padB, baseY: baseY,
    pgMin: pgMin, pgMax: pgMax, yMax: yMax, pxX: pxX, pxY: pxY, TmG: TmG, limiar: gc.limiar,
    axis: { x0: padL, y0: padT, xEnd: W - padR, yEnd: baseY },
    filtrada: filt, reabsorvida: reab, excretada: excr,
    current: { x: padL + (pgc - pgMin) * pxX, pg: pgc, excretada: gc.excretada }
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    clampv: clampv, emaxModel: emaxModel, glicoseHandling: glicoseHandling, tcp: tcp, tcpLayout: tcpLayout, FARMACOS: FARMACOS
  };
}
