/* =========================================================================
 * FILTRA · M30 — Diálise peritoneal: o peritônio como membrana; UF OSMÓTICA
 * pela glicose; PET / tipos de transportador.
 * ENGINE PURO. Espelhado inline no filtra30.html.
 *
 * Teses:
 *  - O peritônio é a MEMBRANA: o dialisato (glicose hipertônica 1.5/2.5/4.25%)
 *    fica no abdome (DWELL); o soluto difunde do sangue para o dialisato pelo
 *    capilar peritoneal; a UF é OSMÓTICA, puxada pelo gradiente de glicose.
 *  - A glicose é ABSORVIDA durante o dwell → o gradiente cai → a UF DESACELERA
 *    e, em dwells longos, REVERTE (reabsorção). Há um pico de UF e depois queda.
 *  - PET classifica o TIPO DE TRANSPORTADOR: alto (rápido) equilibra o soluto
 *    rápido (bom clearance) MAS perde o gradiente de glicose cedo (UF ruim);
 *    baixo (lento) mantém a UF mas clearance lento. D/P de creatinina às 4 h.
 *  - PÉROLA: o alto transportador é um PARADOXO — ótima depuração, péssima UF
 *    (perde o gradiente cedo) → precisa de dwells curtos ou icodextrina.
 *  - icodextrina (polímero não absorvido) mantém a UF no dwell longo.
 *
 * Modelo (cinética de 1ª ordem, didática):
 *  glicose remanescente ∝ exp(−kG·t)         (absorção da glicose)
 *  gradiente osmótico(t) = g0 · exp(−kG·t)    (decai com a glicose absorvida)
 *  UF taxa(t) = LUF·gradiente(t) − LABS       (drenagem osmótica menos reabsorção)
 *  UF(t) = ∫ taxa  → sobe, atinge pico, depois cai/reverte
 *  D/P(t) = 1 − exp(−kT·t)  (equilíbrio de soluto; kT cresce com o tipo de transp.)
 *  kG cresce com o tipo de transportador (alto absorve glicose mais cedo)
 * ========================================================================= */

function clampv(v, a, b) { var n = Number(v); if (!isFinite(n)) n = a; if (n < a) n = a; if (n > b) n = b; return n; }

// constantes do modelo
var KG_BASE = 0.34;     // h⁻¹ — absorção basal da glicose (transportador médio)
var KT_BASE = 0.55;     // h⁻¹ — velocidade de equilíbrio de soluto (médio)
var LUF = 400;          // mL·h⁻¹ por unidade de gradiente osmótico normalizado
var LABS = 68;          // mL·h⁻¹ — reabsorção linfática/capilar (constante, puxa p/ baixo)
var VINF_STD = 2000;    // mL — volume infundido padrão
var ICO_KG = 0.04;      // icodextrina: absorção desprezível (polímero não difunde)

// mistura os parâmetros default com o input, sem mutar a entrada
function merge(input) {
  var inp = input || {};
  return {
    dextrose: clampv(inp.dextrose !== undefined ? inp.dextrose : 2.5, 1.5, 4.25),
    dwellH: clampv(inp.dwellH !== undefined ? inp.dwellH : 4, 0, 16),
    // tipoTransp: 0 = baixo, 0.5 = médio, 1 = alto (rápido)
    tipoTransp: clampv(inp.tipoTransp !== undefined ? inp.tipoTransp : 0.5, 0, 1),
    vInf: clampv(inp.vInf !== undefined ? inp.vInf : VINF_STD, 500, 3000),
    icodextrina: inp.icodextrina ? 1 : 0
  };
}

// força osmótica inicial normalizada (0..1) conforme a dextrose
function g0Osm(dextrose) {
  dextrose = clampv(dextrose, 1.5, 4.25);
  var f = (dextrose - 1.5) / (4.25 - 1.5);     // 0..1
  return 0.45 + 0.55 * f;                       // mesmo o 1.5% tem algum gradiente
}

// constante de absorção de glicose conforme o tipo de transportador (alto absorve cedo)
function kGlicose(tipoTransp, icodextrina) {
  tipoTransp = clampv(tipoTransp, 0, 1);
  if (icodextrina) return ICO_KG;                 // polímero não é absorvido por difusão
  return KG_BASE * (0.55 + 1.30 * tipoTransp);    // baixo ~0.165, médio ~0.36, alto ~0.555 h⁻¹
}

// constante de equilíbrio de soluto (alto transportador equilibra rápido → D/P alto cedo)
function kTransporte(tipoTransp) {
  tipoTransp = clampv(tipoTransp, 0, 1);
  return KT_BASE * (0.309 + 0.545 * tipoTransp);  // baixo ~0.17, médio ~0.32, alto ~0.47 h⁻¹
}

// gradiente osmótico normalizado (0..1) no instante t do dwell
function gradienteOsm(t, dextrose, kG) {
  t = clampv(t, 0, 16); dextrose = clampv(dextrose, 1.5, 4.25); kG = clampv(kG, 0, 5);
  return clampv(g0Osm(dextrose) * Math.exp(-kG * t), 0, 1);
}

// taxa instantânea de UF (mL·h⁻¹) — drenagem osmótica menos reabsorção
function ufTaxa(t, dextrose, kG) {
  return LUF * gradienteOsm(t, dextrose, kG) - LABS;
}

// UF acumulada (mL) ao longo do dwell, por integração de passo fixo (determinística)
function ufAcumulada(dwellH, dextrose, kG) {
  dwellH = clampv(dwellH, 0, 16); dextrose = clampv(dextrose, 1.5, 4.25); kG = clampv(kG, 0, 5);
  if (dwellH <= 0) return 0;
  var n = 240, dt = dwellH / n, uf = 0, t, i;          // 240 passos fixos → determinístico
  for (i = 0; i < n; i++) { t = (i + 0.5) * dt; uf += ufTaxa(t, dextrose, kG) * dt; }
  return uf;
}

// instante do pico de UF (taxa = 0): LUF·g0·exp(−kG·t) = LABS → t* = ln(LUF·g0/LABS)/kG
function tempoPicoUF(dextrose, kG) {
  dextrose = clampv(dextrose, 1.5, 4.25); kG = clampv(kG, 1e-6, 5);
  var razao = LUF * g0Osm(dextrose) / LABS;
  if (razao <= 1) return 0;                            // nunca há UF líquida positiva
  return clampv(Math.log(razao) / kG, 0, 16);
}

// glicose absorvida (g) durante o dwell: fração absorvida × gramas iniciais
function glicoseAbsorvida(dwellH, dextrose, kG, vInf) {
  dwellH = clampv(dwellH, 0, 16); dextrose = clampv(dextrose, 1.5, 4.25);
  kG = clampv(kG, 0, 5); vInf = clampv(vInf, 500, 3000);
  var gFrac = 1 - Math.exp(-kG * dwellH);              // fração da glicose absorvida
  var gramasIniciais = dextrose * (vInf / 100);        // g/dL · dL = g
  return clampv(gFrac * gramasIniciais, 0, 1e5);
}

// função-mãe: o estado de uma troca de DP
function dpExchange(input) {
  var p = merge(input);
  var kG = kGlicose(p.tipoTransp, p.icodextrina);
  var kT = kTransporte(p.tipoTransp);
  var uf = ufAcumulada(p.dwellH, p.dextrose, kG);                 // mL (pode ser negativo = reabsorve)
  var drenado = p.vInf + uf;                                       // volume drenado = infundido + UF
  var tPico = tempoPicoUF(p.dextrose, kG);
  var ufPico = ufAcumulada(tPico, p.dextrose, kG);                 // UF no instante do pico
  var dpCr = clampv(1 - Math.exp(-kT * p.dwellH), 0, 1);           // D/P creatinina (0..1)
  var dpCr4h = clampv(1 - Math.exp(-kT * 4), 0, 1);                // D/P às 4 h (classifica o PET)
  var gliAbs = glicoseAbsorvida(p.dwellH, p.dextrose, kG, p.vInf); // g absorvidos
  var gradFinal = gradienteOsm(p.dwellH, p.dextrose, kG);          // gradiente remanescente (0..1)
  var reabsorve = uf < 0;                                           // dwell longo demais → reabsorção
  var revertido = p.dwellH > tPico && tPico > 0;                    // já passou do pico
  // clearance de soluto da troca (proporcional a D/P × volume drenado), em L
  var clearanceL = dpCr * (drenado / 1000);
  // classificação PET pelo D/P de creatinina às 4 h
  var classe = dpCr4h >= 0.81 ? 'alto' : dpCr4h >= 0.65 ? 'médio-alto' : dpCr4h >= 0.50 ? 'médio-baixo' : 'baixo';
  // pérola: paradoxo do alto transportador (clearance bom, UF ruim)
  var paradoxoAlto = p.tipoTransp >= 0.75 && uf < 350 && dpCr4h >= 0.75;

  return {
    dextrose: p.dextrose, dwellH: p.dwellH, tipoTransp: p.tipoTransp, vInf: p.vInf, icodextrina: p.icodextrina,
    kG: kG, kT: kT, uf: uf, drenado: drenado, tPico: tPico, ufPico: ufPico,
    dpCr: dpCr, dpCr4h: dpCr4h, gliAbs: gliAbs, gradFinal: gradFinal, clearanceL: clearanceL,
    reabsorve: reabsorve, revertido: revertido, classe: classe, paradoxoAlto: paradoxoAlto
  };
}

// geometria PURA da curva UF × tempo de dwell (a UI só pinta).
// Pinta a curva do tipo atual e a curva de "alto transportador" como referência.
function ufCurveLayout(state, W, H) {
  state = state || {};
  W = clampv(W, 200, 100000); H = clampv(H, 120, 100000);
  var p = merge(state);
  var padL = 54, padR = 16, padT = 18, padB = 38, baseY = H - padB;
  var tMax = 12, N = 60;                                  // 0..12 h
  var ufMax = 1000, ufMin = -400;                          // mL no eixo
  var kGcur = kGlicose(p.tipoTransp, p.icodextrina);
  var kGalto = kGlicose(1, 0);                             // referência: alto transportador
  var pxX = (W - padL - padR) / tMax;
  var span = ufMax - ufMin, pxY = (baseY - padT) / span;
  function yOf(uf) { return baseY - (clampv(uf, ufMin, ufMax) - ufMin) * pxY; }
  var zeroY = yOf(0);
  var pts = [], ptsAlto = [], i, t, uf, ufa;
  for (i = 0; i <= N; i++) {
    t = tMax * i / N;
    uf = ufAcumulada(t, p.dextrose, kGcur);
    ufa = ufAcumulada(t, p.dextrose, kGalto);
    pts.push({ t: t, uf: uf, x: padL + t * pxX, y: yOf(uf) });
    ptsAlto.push({ t: t, uf: ufa, x: padL + t * pxX, y: yOf(ufa) });
  }
  var tc = clampv(p.dwellH, 0, tMax);
  var ufc = ufAcumulada(tc, p.dextrose, kGcur);
  return {
    W: W, H: H, padL: padL, padR: padR, padT: padT, padB: padB, baseY: baseY,
    tMax: tMax, ufMax: ufMax, ufMin: ufMin, pxX: pxX, pxY: pxY, zeroY: zeroY,
    axis: { x0: padL, y0: padT, xEnd: W - padR, yEnd: baseY },
    pts: pts, ptsAlto: ptsAlto,
    current: { x: padL + tc * pxX, y: yOf(ufc), t: tc, uf: ufc }
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    clampv: clampv, merge: merge, g0Osm: g0Osm,
    kGlicose: kGlicose, kTransporte: kTransporte, gradienteOsm: gradienteOsm,
    ufTaxa: ufTaxa, ufAcumulada: ufAcumulada, tempoPicoUF: tempoPicoUF, glicoseAbsorvida: glicoseAbsorvida,
    dpExchange: dpExchange, ufCurveLayout: ufCurveLayout,
    KG_BASE: KG_BASE, KT_BASE: KT_BASE, LUF: LUF, LABS: LABS, VINF_STD: VINF_STD, ICO_KG: ICO_KG
  };
}
