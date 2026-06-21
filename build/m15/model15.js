/* =========================================================================
 * FILTRA · M15 — Ureia, creatinina, eGFR e a urina: os índices que separam pré-renal de NTA.
 * ENGINE PURO. Espelhado inline no filtra15.html.
 *
 * Teses:
 *  - a urina CONTA A HISTÓRIA: na pré-renal o túbulo está ÍNTEGRO e trabalhando (reabsorve avidamente →
 *    FENa baixa, U_osm alta, Na urinário baixo, BUN:Cr alta); na NTA o túbulo está LESADO (não reabsorve →
 *    FENa alta, U_osm isosmótica, cilindros granulosos pigmentados).
 *  - a ureia é reabsorvida (segue a água, mais no baixo fluxo) → BUN:Cr sobe na pré-renal; a creatinina não.
 *  - o DIURÉTICO confunde a FENa (eleva-a mesmo na pré-renal) → usar a FE_ureia, que se mantém baixa.
 * ========================================================================= */

function clampv(v, a, b) { var n = Number(v); if (!isFinite(n)) n = a; if (n < a) n = a; if (n > b) n = b; return n; }

function renalState(input) {
  var inp = input || {};
  // avidez tubular: 1 = túbulo íntegro e ávido (pré-renal); 0 = túbulo lesado (NTA)
  var avidez = clampv(inp.avidez !== undefined ? inp.avidez : 0.5, 0, 1);
  // diurético em uso (0/1): confunde a FENa
  var diuretic = clampv(inp.diuretic !== undefined ? inp.diuretic : 0, 0, 1);

  // índices computados a partir da avidez (todos co-variam coerentemente)
  var FENa = clampv((3.4 - avidez * 3.2) + diuretic * 1.8, 0.1, 10);     // % — pré-renal <1, NTA >2
  var FEurea = clampv((62 - avidez * 42) + diuretic * 3, 5, 90);          // % — pré-renal <35 (robusta ao diurético)
  var uNa = clampv((72 - avidez * 62) + diuretic * 30, 5, 140);          // mEq/L — pré-renal <20, NTA >40
  var uOsm = clampv(300 + avidez * 420, 280, 900);                        // mOsm/kg — pré-renal alta, NTA ~iso
  var upCr = clampv(8 + avidez * 44, 4, 70);                              // U/P creatinina — pré-renal >40, NTA <20
  var bunCr = clampv(10 + avidez * 16, 8, 40);                            // BUN:Cr — pré-renal >20

  // qual índice usar: com diurético a FENa é não-confiável → FE_ureia
  var idxName = diuretic >= 0.5 ? 'FE_ureia' : 'FE_Na';
  var idxVal = diuretic >= 0.5 ? FEurea : FENa;
  var prerenalCut = diuretic >= 0.5 ? 35 : 1.0;
  var ntaCut = diuretic >= 0.5 ? 50 : 2.0;

  var classe;
  if (idxVal < prerenalCut) classe = 'pré-renal';
  else if (idxVal > ntaCut) classe = 'NTA (intrínseca)';
  else classe = 'indeterminado';

  var sedimento;
  if (avidez >= 0.6) sedimento = 'cilindros hialinos (bland)';
  else if (avidez <= 0.4) sedimento = 'cilindros granulosos pigmentados (muddy brown)';
  else sedimento = 'sedimento inespecífico';

  // confundidor sinalizado: diurético com túbulo ávido → FENa "alta" enganosa
  var fenaEnganosa = diuretic >= 0.5 && avidez >= 0.6 && FENa >= 1.0;

  return {
    avidez: avidez, diuretic: diuretic,
    FENa: FENa, FEurea: FEurea, uNa: uNa, uOsm: uOsm, upCr: upCr, bunCr: bunCr,
    idxName: idxName, idxVal: idxVal, prerenalCut: prerenalCut, ntaCut: ntaCut,
    classe: classe, sedimento: sedimento, fenaEnganosa: fenaEnganosa
  };
}

// geometria PURA do mapa de impressão digital FENa × U_osm (zonas pré-renal × NTA + marca atual)
function renalLayout(state, W, H) {
  state = state || {};
  W = clampv(W, 200, 100000); H = clampv(H, 120, 100000);
  var padL = 56, padR = 16, padT = 18, padB = 38, baseY = H - padB;
  var feMin = 0, feMax = 6, oMin = 250, oMax = 900;
  var pxX = (W - padL - padR) / (feMax - feMin);
  var pxY = (baseY - padT) / (oMax - oMin);
  function X(fe) { return padL + (clampv(fe, feMin, feMax) - feMin) * pxX; }
  function Y(o) { return baseY - (clampv(o, oMin, oMax) - oMin) * pxY; }
  var r = renalState(state);
  return {
    W: W, H: H, padL: padL, padR: padR, padT: padT, padB: padB, baseY: baseY,
    feMin: feMin, feMax: feMax, oMin: oMin, oMax: oMax, pxX: pxX, pxY: pxY,
    axis: { x0: padL, y0: padT, xEnd: W - padR, yEnd: baseY },
    // pré-renal: FENa < 1 e U_osm > 500 (alto/esquerda); NTA: FENa > 2 e U_osm < 400 (baixo/direita)
    zonaPre: { x1: X(0), x2: X(1), y1: Y(900), y2: Y(500) },
    zonaNta: { x1: X(2), x2: X(6), y1: Y(400), y2: Y(250) },
    current: { x: X(r.FENa), y: Y(r.uOsm), FENa: r.FENa, uOsm: r.uOsm }
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { clampv: clampv, renalState: renalState, renalLayout: renalLayout };
}
