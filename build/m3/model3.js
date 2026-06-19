/* =========================================================================
 * FILTRA · M3 — O glomérulo: barreira de filtração, Kf, podócito, proteinúria
 * ENGINE PURO (a fórmula primeiro; nada de UI). Espelhado inline no filtra3.html.
 *
 * Teses:
 *  - a barreira filtra por TAMANHO (poros) e por CARGA (glicocálice/MBG aniônicos).
 *  - o albumina é barrado sobretudo pela CARGA: perder a carga → albuminúria seletiva
 *    (lesão mínima) mesmo com o tamanho ~preservado.
 *  - Kf = permeabilidade × superfície; cair Kf derruba a TFG sem mexer nas pressões.
 *  - proteinúria por mecanismo: glomerular (carga/tamanho) × tubular × normal.
 * ========================================================================= */

function clampv(v, a, b) { var n = Number(v); if (!isFinite(n)) n = a; if (n < a) n = a; if (n > b) n = b; return n; }

// ----- coeficiente de peneiramento θ (0..1): fração da concentração plasmática que passa -----
// r = raio molecular efetivo (Å); carga = 'anion'|'neutro'|'cation';
// cargaIntacta = barreira de CARGA preservada?; poroDano = dano à barreira de TAMANHO (0..1)
var R50 = 33, BSTEEP = 0.5;                 // sigmoide de tamanho (r50 ~ albumina; declive)
function sieving(r, carga, cargaIntacta, poroDano) {
  r = clampv(r, 1, 80);
  poroDano = clampv(poroDano, 0, 1);
  cargaIntacta = (cargaIntacta !== false);
  var r50 = R50 + poroDano * 25;            // dano ↑ → poros maiores → r50 sobe → mais vazamento
  var thetaSize = 1 / (1 + Math.exp(BSTEEP * (r - r50)));
  var c = String(carga == null ? 'neutro' : carga).toLowerCase();
  var f;
  if (c === 'anion' || c === 'anionico' || c === 'aniônico') f = cargaIntacta ? 0.05 : 1.0; // repulsão se a carga está íntegra
  else if (c === 'cation' || c === 'cationico' || c === 'catiônico') f = 2.0;               // cátions atraídos → filtram mais
  else f = 1.0;                                                                              // neutro: só tamanho
  return clampv(thetaSize * f, 0, 1);
}

// ----- função-mãe: estado da barreira + Kf/TFG + proteinúria -----
function barreira(input) {
  var inp = input || {};
  var raio = clampv(inp.raioMol !== undefined ? inp.raioMol : 36, 1, 80);  // probe (default ~albumina 36 Å)
  var carga = inp.carga !== undefined ? inp.carga : 'anion';
  var cargaIntacta = inp.cargaIntacta !== false;
  var poroDano = clampv(inp.poroDano !== undefined ? inp.poroDano : 0, 0, 1);
  var areaFrac = clampv(inp.areaFrac !== undefined ? inp.areaFrac : 1, 0.05, 1); // superfície (mesângio) → Kf
  var kPerm = clampv(inp.kPerm !== undefined ? inp.kPerm : 1, 0.1, 3);           // permeabilidade hidráulica relativa
  var P_GC = clampv(inp.P_GC !== undefined ? inp.P_GC : 60, 0, 150);
  var P_BC = clampv(inp.P_BC !== undefined ? inp.P_BC : 15, 0, 80);
  var piGC = clampv(inp.piGC !== undefined ? inp.piGC : 28, 0, 60);
  var tmFrac = clampv(inp.tmFrac !== undefined ? inp.tmFrac : 1, 0, 1);          // capacidade de reabsorção tubular (0..1)

  // Kf e TFG (o saldo de Starling com Kf explícito)
  var KF0 = 12.5;                                  // mL·min⁻¹·mmHg⁻¹ (rim inteiro)
  var Kf = KF0 * kPerm * areaFrac;
  var NFP = P_GC - P_BC - piGC;                    // pressão de filtração líquida
  var TFG = Kf * Math.max(NFP, 0);                 // mL/min
  if (!isFinite(TFG) || TFG < 0) TFG = 0;

  // peneiramento do probe e de marcadores fixos
  var thetaProbe = sieving(raio, carga, cargaIntacta, poroDano);
  var thetaInulina = sieving(14, 'neutro', cargaIntacta, poroDano); // marcador livre (~1)
  var thetaAlb = sieving(36, 'anion', cargaIntacta, poroDano);      // albumina (aniônica)
  var thetaIgG = sieving(55, 'anion', cargaIntacta, poroDano);      // IgG (grande)
  // seletividade = IgG/albumina: baixa → seletiva (só albumina); alta → não-seletiva
  var seletividade = thetaAlb > 1e-9 ? thetaIgG / thetaAlb : 0;

  // proteinúria (g/dia) — modelo calibrado dirigido pelos parâmetros da barreira
  var protGlomCarga = cargaIntacta ? 0 : 5.0;      // perda de carga → albuminúria (seletiva)
  var protGlomTam = poroDano * 12.0;               // dano de tamanho → não-seletiva
  var protTub = (1 - tmFrac) * 2.5;                // falência tubular → proteínas de baixo PM
  var fluxoFac = clampv(TFG / 125, 0, 2);          // menos filtração → menos proteína filtrada
  var urineProt = clampv(0.05 + (protGlomCarga + protGlomTam) * fluxoFac + protTub, 0.02, 30);

  // classificação por mecanismo
  var glomTotal = protGlomCarga + protGlomTam * fluxoFac;
  var classe;
  if (urineProt < 0.15) classe = 'normal';
  else if (protTub > glomTotal) classe = 'tubular';
  else if (poroDano > 0.2 && seletividade > 0.2) classe = 'glomerular_nao_seletiva';
  else classe = 'glomerular_seletiva';
  var nefrotico = urineProt >= 3.5;

  return {
    raioMol: raio, carga: carga, cargaIntacta: cargaIntacta, poroDano: poroDano,
    areaFrac: areaFrac, kPerm: kPerm, P_GC: P_GC, P_BC: P_BC, piGC: piGC, tmFrac: tmFrac,
    Kf: Kf, NFP: NFP, TFG: TFG,
    thetaProbe: thetaProbe, thetaInulina: thetaInulina, thetaAlb: thetaAlb, thetaIgG: thetaIgG,
    seletividade: seletividade, urineProt: urineProt, classe: classe, nefrotico: nefrotico
  };
}

// ----- geometria PURA da curva de peneiramento θ × raio (a UI só pinta) -----
function sievingLayout(state, W, H) {
  state = state || {};
  W = clampv(W, 200, 100000); H = clampv(H, 120, 100000);
  var padL = 52, padR = 16, padT = 18, padB = 38, baseY = H - padB;
  var rMin = 4, rMax = 70, N = 60;
  var carga = state.carga !== undefined ? state.carga : 'anion';
  var cargaIntacta = state.cargaIntacta !== false;
  var poroDano = clampv(state.poroDano !== undefined ? state.poroDano : 0, 0, 1);
  var pxX = (W - padL - padR) / (rMax - rMin), pxY = (baseY - padT);
  var pts = [], i, r, th;
  for (i = 0; i <= N; i++) {
    r = rMin + (rMax - rMin) * i / N;
    th = sieving(r, carga, cargaIntacta, poroDano);
    pts.push({ r: r, theta: th, x: padL + (r - rMin) * pxX, y: baseY - clampv(th, 0, 1) * pxY });
  }
  var rp = clampv(state.raioMol !== undefined ? state.raioMol : 36, rMin, rMax);
  var thp = sieving(rp, carga, cargaIntacta, poroDano);
  return {
    W: W, H: H, padL: padL, padR: padR, padT: padT, padB: padB, baseY: baseY,
    rMin: rMin, rMax: rMax, pxX: pxX, pxY: pxY,
    axis: { x0: padL, y0: padT, xEnd: W - padR, yEnd: baseY },
    pts: pts, current: { x: padL + (rp - rMin) * pxX, y: baseY - clampv(thp, 0, 1) * pxY, r: rp, theta: thp }
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { clampv: clampv, sieving: sieving, barreira: barreira, sievingLayout: sievingLayout, R50: R50, BSTEEP: BSTEEP };
}
