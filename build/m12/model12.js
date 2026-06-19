'use strict';
/*
 * FILTRA · M12 — Cálcio · fósforo · magnésio: o eixo ósseo-mineral (PTH, vitamina D, FGF23)
 * ---------------------------------------------------------------------------
 * Engine PURO, determinístico. Roda em Node e inline no HTML.
 * Regra-zero: o motor manda no pixel.
 *
 * Tese (o erro a corrigir): "cálcio sérico = cálcio".
 * Verdade: o cálcio que IMPORTA é o IONIZADO (livre, fisiologicamente ativo). O
 * cálcio TOTAL medido engana por DOIS motivos mecânicos:
 *   1. ALBUMINA — ~40% do Ca circula ligado à albumina. Hipoalbuminemia derruba o
 *      Ca TOTAL sem tocar o ionizado (pseudo-hipocalcemia). Corrige-se:
 *        Ca_corrigido = Ca_total + 0,8·(4 − albumina)
 *   2. pH — a alcalose AUMENTA a ligação do Ca à albumina → ionizado↓ → TETANIA,
 *      mesmo com Ca total normal. A acidose libera Ca da albumina → ionizado↑.
 *        Ca_ion ← desloca ~0,2 mg/dL por 0,1 de ΔpH (sinal invertido)
 *
 * O TRIÂNGULO Ca–PO₄–PTH (o eixo de regulação):
 *   PTH (paratireoide, sente o Ca IONIZADO):
 *     ↑ reabsorção renal de Ca (TCD)         → Ca↑
 *     ↓ reabsorção de PO₄ (inibe NaPi no TCP)→ fosfatúria → PO₄↓
 *     ↑ 1α-hidroxilase renal → calcitriol↑
 *   CALCITRIOL (vit D ativa, feita no rim):
 *     ↑ absorção intestinal de Ca e PO₄
 *   FGF23 (do OSSO; sobe cedo na DRC):
 *     ↑ excreção de PO₄ (fosfatúrico)        → PO₄↓
 *     ↓ 1α-hidroxilase → calcitriol↓
 *   MAGNÉSIO (reabsorvido na alça/TAL): é COFATOR da secreção de PTH. Mg muito
 *     baixo PARALISA a secreção/ação do PTH → hipocalcemia REFRATÁRIA (só corrige
 *     repondo Mg) — o "segredo" do Mg.
 *
 * DRC e o HIPERPARATIREOIDISMO SECUNDÁRIO:
 *   TFG↓ → excreção de PO₄↓ → PO₄ retido↑; rim lesado → calcitriol↓; FGF23↑ cedo.
 *   PO₄↑ + calcitriol↓ + Ca↓ → estímulo TRIPLO ao PTH → PTH↑↑ (hiperPTH 2º) →
 *   doença óssea (osteíte fibrosa).
 *
 * Fórmulas-mãe:
 *   Ca_corr = Ca_total + 0,8·(4 − alb)
 *   Ca_ion  = f(Ca_corr, pH)   ;   ΔpH altera ligação (alcalose → ion↓)
 *   PTH     = base · resposta(Ca_ion↓) · (PO₄↑) · (calcitriol↓) · gate(Mg)
 *   PO₄     = carga − fosfatúria(PTH,FGF23) ; retém quando TFG↓
 *   calcitriol = base · estímuloPTH · inibiçãoFGF23 · capacidade renal(TFG)
 */

// ─── helpers ───────────────────────────────────────────────────────────────

// clamp resiliente: NaN / null / ∞ → piso
function clampv(v, a, b) {
  var n = Number(v);
  if (!isFinite(n)) n = a;
  if (n < a) n = a;
  if (n > b) n = b;
  return n;
}

// merge sem mutar
function merge(a, b) {
  var o = {}, k;
  if (a) for (k in a) if (Object.prototype.hasOwnProperty.call(a, k)) o[k] = a[k];
  if (b) for (k in b) if (Object.prototype.hasOwnProperty.call(b, k)) o[k] = b[k];
  return o;
}

// ─── constantes fisiológicas calibradas ────────────────────────────────────
var ALB_N      = 4.0;    // albumina normal (g/dL) — âncora da correção
var CORR_K     = 0.8;    // coeficiente da correção (Ca += 0,8·(4 − alb))
var PH_N       = 7.40;   // pH normal de referência
var PH_SLOPE   = 0.20;   // Ca_ion desloca ~0,2 mg/dL por 0,1 de ΔpH (mg/dL por 0,1)
var ION_FRAC   = 0.50;   // ~50% do Ca total é ionizado em pH/alb normais
var CA_TOT_N   = 9.4;    // Ca total normal de referência (mg/dL)
var CA_ION_N   = 4.7;    // Ca ionizado normal (mg/dL ≈ 1,18 mmol/L)
var PO4_N      = 3.5;    // fósforo normal (mg/dL)
var MG_N       = 2.0;    // magnésio normal (mg/dL)
var PTH_N      = 40;     // PTH normal de referência (pg/mL)
var CALCITRIOL_N = 40;   // calcitriol normal (pg/mL)
var FGF23_N    = 50;     // FGF23 normal de referência (RU/mL)
var GFR_N      = 120;    // TFG normal (mL/min)

// alvos de set-point e sensibilidades
var CA_SETPOINT = 4.7;   // Ca_ion alvo do sensor da paratireoide (mg/dL)
var PTH_GAIN    = 6.0;   // ganho da resposta do PTH ao desvio de Ca_ion
var MG_GATE_LO  = 1.2;   // abaixo disto o Mg começa a paralisar a secreção de PTH
var MG_GATE_HI  = 1.6;   // acima disto a secreção de PTH é plena

// ─── correção do Ca pela albumina ───────────────────────────────────────────
/**
 * caCorrigido(caTotal, alb) → Ca corrigido (mg/dL)
 *   Ca_corr = Ca_total + 0,8·(4 − albumina)
 * Hipoalbuminemia: o Ca total cai mas o corrigido (e o ionizado) ficam normais.
 */
function caCorrigido(caTotal, alb) {
  var ca = clampv(caTotal, 2, 20);
  var a  = clampv(alb, 0.5, 7);
  return ca + CORR_K * (ALB_N - a);
}

// ─── Ca ionizado a partir do corrigido e do pH ──────────────────────────────
/**
 * caIonizado(caCorr, pH) → Ca ionizado (mg/dL)
 * Parte do corrigido (que já retirou o viés da albumina) e aplica o efeito do pH:
 * alcalose (pH↑) aumenta a ligação à albumina → ionizado↓; acidose → ionizado↑.
 *   ion = ION_FRAC·caCorr − PH_SLOPE·((pH − 7,40)/0,1)
 */
function caIonizado(caCorr, pH) {
  var cc = clampv(caCorr, 2, 20);
  var p  = clampv(pH, 6.6, 7.8);
  var base = ION_FRAC * cc;                  // fração ionizada em pH normal
  var shift = PH_SLOPE * ((p - PH_N) / 0.1); // alcalose → shift>0 → subtrai
  var ion = base - shift;
  return clampv(ion, 1.5, 9);
}

// ─── gate do magnésio sobre a secreção/ação do PTH ──────────────────────────
/**
 * mgGate(mg) → fator 0..1 (1 = secreção plena; →0 = paralisada por Mg muito baixo)
 * Hipomagnesemia grave PARALISA a paratireoide → hipocalcemia refratária.
 */
function mgGate(mg) {
  var m = clampv(mg, 0.1, 6);
  if (m >= MG_GATE_HI) return 1;
  if (m <= MG_GATE_LO) return 0.12;          // resíduo: nunca zero absoluto
  // rampa linear entre LO e HI
  var f = 0.12 + (1 - 0.12) * (m - MG_GATE_LO) / (MG_GATE_HI - MG_GATE_LO);
  return clampv(f, 0.12, 1);
}

// ─── capacidade renal de ativar a vitamina D (1α-hidroxilase ∝ massa renal) ──
function renalActivation(gfr) {
  var g = clampv(gfr, 1, 200);
  return clampv(g / GFR_N, 0.05, 1.2);       // fração da capacidade normal
}

// ─── função principal ───────────────────────────────────────────────────────
/**
 * mineral(input) → o estado completo do eixo ósseo-mineral.
 *
 * input: {
 *   caTotal,    // Ca TOTAL sérico medido (mg/dL; default 9.4)
 *   alb,        // albumina (g/dL; default 4.0)
 *   pH,         // pH sanguíneo (default 7.40)
 *   po4,        // carga/oferta de fosfato (mg/dL; default 3.5) — antes do manejo renal
 *   mg,         // magnésio sérico (mg/dL; default 2.0)
 *   gfr,        // TFG (mL/min; default 120) — DRC quando baixa
 *   pthExtra,   // estímulo exógeno ao PTH/PTHrP (1 = nenhum; >1 malignidade/hiperPTH 1º)
 *   calcitriolDose // suplemento de vit D ativa (0 = nenhum; soma ao endógeno)
 * }
 */
function mineral(input) {
  var inp = input || {};

  var caTotal = clampv(inp.caTotal !== undefined ? inp.caTotal : CA_TOT_N, 2, 20);
  var alb     = clampv(inp.alb     !== undefined ? inp.alb     : ALB_N, 0.5, 7);
  var pH      = clampv(inp.pH      !== undefined ? inp.pH      : PH_N, 6.6, 7.8);
  var po4In   = clampv(inp.po4     !== undefined ? inp.po4     : PO4_N, 0.5, 15);
  var mg      = clampv(inp.mg      !== undefined ? inp.mg      : MG_N, 0.1, 6);
  var gfr     = clampv(inp.gfr     !== undefined ? inp.gfr     : GFR_N, 1, 200);
  var pthExtra= clampv(inp.pthExtra !== undefined ? inp.pthExtra : 1, 0, 8);
  var calcDose= clampv(inp.calcitriolDose !== undefined ? inp.calcitriolDose : 0, 0, 200);

  // ─── 1. Ca corrigido e ionizado (a verdade por trás do número) ─────────────
  var caCorr = caCorrigido(caTotal, alb);
  caCorr = clampv(caCorr, 2, 20);
  var caIon = caIonizado(caCorr, pH);

  // ─── 2. retenção de fosfato pela TFG (DRC retém PO₄) ───────────────────────
  // Em TFG normal o rim excreta o excedente; conforme a TFG cai, o PO₄ retém.
  var renalCap = renalActivation(gfr);       // 1 normal; <1 na DRC
  var retencao = clampv((1 - renalCap), 0, 1);

  // ─── 3. FGF23 — sobe cedo na DRC e com PO₄ alto (fosfatúrico) ──────────────
  // É o primeiro a subir na DRC; responde à carga de PO₄ e à queda de TFG.
  var fgf23 = FGF23_N * (1 + 2.6 * retencao) * (0.6 + 0.4 * (po4In / PO4_N));
  fgf23 = clampv(fgf23, 5, 5000);

  // ─── 4. calcitriol — feito no rim (1α-hidroxilase); PTH↑ estimula, FGF23↓ inibe ─
  // estímulo do PTH (computado abaixo) entra por aproximação de ponto-fixo amortecido.
  // Começamos com uma estimativa e iteramos PTH↔calcitriol↔PO₄ poucas vezes.
  var pth = PTH_N, calcitriol = CALCITRIOL_N, po4 = po4In;

  var gate = mgGate(mg);
  var i;
  for (i = 0; i < 24; i++) {
    // — PO₄ sérico: carga + retenção (DRC) − fosfatúria (PTH e FGF23 são fosfatúricos) ─
    // calibrado para que no estado normal (PTH=base, FGF23=base) o PO₄ ≈ po4In:
    // a fosfatúria é medida como EXCESSO sobre a basal (0,30+0,30=0,60).
    var fosfaturia = clampv(0.30 * (pth / PTH_N) + 0.30 * (fgf23 / FGF23_N) - 0.60, 0, 4);
    var po4New = po4In * (1 + 1.4 * retencao) / (1 + 0.55 * fosfaturia);
    po4New = clampv(po4New, 0.5, 18);

    // — calcitriol: base · estímuloPTH · inibiçãoFGF23 · capacidade renal + dose ─
    var stimPTH = clampv(pth / PTH_N, 0.1, 6);
    var inhFGF  = clampv(FGF23_N / fgf23, 0.05, 1.5);
    var calcNew = CALCITRIOL_N * Math.pow(stimPTH, 0.45) * Math.pow(inhFGF, 0.6) * renalCap + calcDose;
    calcNew = clampv(calcNew, 2, 300);

    // — PTH: sobe quando Ca_ion < set-point, quando PO₄↑ (direto) e calcitriol↓ ─
    var caDeficit = clampv((CA_SETPOINT - caIon), -3, 3);   // >0 = hipocalcemia
    var po4Drive  = clampv((po4New - PO4_N) / PO4_N, -0.8, 4); // PO₄ alto sobe PTH
    var calcDrive = clampv((CALCITRIOL_N - calcNew) / CALCITRIOL_N, -1, 1); // calcitriol baixo sobe PTH
    var drive = 1
      + PTH_GAIN * Math.max(caDeficit, 0) * 0.18      // hipocalcemia → PTH↑↑
      - 2.6 * Math.max(-caDeficit, 0) * 0.30          // hipercalcemia → PTH↓↓ (suprime forte)
      + 0.8 * Math.max(po4Drive, 0)
      + 1.1 * Math.max(calcDrive, 0);
    if (drive < 0.02) drive = 0.02;
    var pthNew = PTH_N * drive * pthExtra * gate;       // Mg gate paralisa se Mg↓↓
    pthNew = clampv(pthNew, 1, 3000);

    // amortecimento (relaxação) para convergir sem oscilar
    var lam = 0.5;
    pth        = pth        + lam * (pthNew - pth);
    calcitriol = calcitriol + lam * (calcNew - calcitriol);
    po4        = po4        + lam * (po4New - po4);
  }
  pth = clampv(pth, 1, 3000);
  calcitriol = clampv(calcitriol, 2, 300);
  po4 = clampv(po4, 0.5, 18);

  // fosfatúria final (excesso sobre a basal) — para a UI/figura
  var fosfaturiaRel = clampv(0.30 * (pth / PTH_N) + 0.30 * (fgf23 / FGF23_N) - 0.60, 0, 4);

  // ─── 5. produto Ca×PO₄ (risco de calcificação) ─────────────────────────────
  var caxpo4 = caCorr * po4;

  // ─── 6. classificação do cálcio ionizado ───────────────────────────────────
  var estadoCa;
  if (caIon < 4.0)      estadoCa = 'hipocalcemia';
  else if (caIon > 5.4) estadoCa = 'hipercalcemia';
  else                  estadoCa = 'normal';

  // pseudo-hipocalcemia: Ca total baixo mas corrigido/ionizado normais (hipoalbuminemia)
  var pseudoHipo = (caTotal < 8.5) && (caCorr >= 8.5) && (caIon >= 4.0);

  // tetania por alcalose: ionizado baixo apesar de Ca total normal
  var tetaniaAlcalose = (pH > 7.46) && (caIon < 4.3) && (caTotal >= 8.5);

  // ─── 7. regime (a leitura do módulo) ───────────────────────────────────────
  var regime;
  if (mg < MG_GATE_LO && caIon < 4.3)              regime = 'hipocalcemia_mg';   // refratária por Mg
  else if (tetaniaAlcalose)                         regime = 'tetania_alcalose';  // ion↓ por pH
  else if (pseudoHipo)                              regime = 'pseudo_hipocalcemia'; // albumina
  else if (gfr < 45 && pth > PTH_N * 2 && po4 > PO4_N) regime = 'hiperpth_secundario'; // DRC
  else if (estadoCa === 'hipercalcemia' && pthExtra > 1.2) regime = 'hipercalcemia_pthrp'; // malignidade
  else if (estadoCa === 'hipocalcemia')            regime = 'hipocalcemia';
  else if (estadoCa === 'hipercalcemia')           regime = 'hipercalcemia';
  else                                              regime = 'normal';

  return {
    // entradas efetivas
    caTotal: caTotal, alb: alb, pH: pH, po4In: po4In, mg: mg, gfr: gfr,
    pthExtra: pthExtra, calcitriolDose: calcDose,
    // cálcio
    caCorr: caCorr, caIon: caIon, ionFrac: ION_FRAC,
    // eixo hormonal
    pth: pth, calcitriol: calcitriol, fgf23: fgf23,
    // fosfato e manejo
    po4: po4, fosfaturia: fosfaturiaRel, retencao: retencao, renalCap: renalCap,
    // magnésio
    mgGate: gate,
    // produtos e classificação
    caxpo4: caxpo4, estadoCa: estadoCa,
    pseudoHipo: pseudoHipo, tetaniaAlcalose: tetaniaAlcalose,
    regime: regime
  };
}

// ─── layout: Ca IONIZADO × ALBUMINA (duas curvas: pH normal × alcalose) ──────
/**
 * caIonLayout(state, W, H)
 * Varre a albumina de 1 a 6 g/dL. Em cada albumina, mantém o Ca CORRIGIDO fixo
 * (deduzido do estado) e calcula o IONIZADO em dois pH:
 *   curva A — pH 7,40 (normal)   ·   curva B — pH 7,55 (alcalose)
 * Mostra: o ionizado quase NÃO varia com a albumina quando o Ca total é "real"
 * (corrigir resolve), mas a ALCALOSE empurra a curva inteira para baixo (tetania).
 *   ptsN: [{alb, ion, x, y}]   ptsAlc: [...]   ·   markers   ·   axis.
 * A UI só liga os pontos — o motor manda no pixel. X=albumina, Y=Ca ionizado.
 */
function caIonLayout(state, W, H) {
  state = state || {};
  W = clampv(W, 200, 100000);
  H = clampv(H, 120, 100000);

  var caTrueCorr = clampv(state.caCorr !== undefined ? state.caCorr
                     : caCorrigido(state.caTotal !== undefined ? state.caTotal : CA_TOT_N,
                                   state.alb !== undefined ? state.alb : ALB_N), 5, 14);

  var padL = 52, padR = 16, padT = 18, padB = 38;
  var baseY = H - padB;
  var albMin = 1.0, albMax = 6.0, N = 50;
  var ionMin = 2.0, ionMax = 7.0;   // eixo Y de Ca ionizado (mg/dL)

  var pxX = (W - padL - padR) / (albMax - albMin);
  var pxY = (baseY - padT) / (ionMax - ionMin);

  function X(a) { return padL + (clampv(a, albMin, albMax) - albMin) * pxX; }
  function Y(ion) { return baseY - (clampv(ion, ionMin, ionMax) - ionMin) * pxY; }

  function ionAt(a, pH) {
    // Ca total observado nesta albumina (corrigido constante)
    var caTotObs = caTrueCorr - CORR_K * (ALB_N - clampv(a, albMin, albMax));
    var cc = caCorrigido(caTotObs, a);   // recupera o corrigido (≈ caTrueCorr)
    return caIonizado(cc, pH);
  }

  var ptsN = [], ptsAlc = [], i, a;
  for (i = 0; i <= N; i++) {
    a = albMin + (albMax - albMin) * i / N;
    var iN = ionAt(a, PH_N);
    var iA = ionAt(a, 7.55);
    ptsN.push({ alb: a, ion: iN, x: X(a), y: Y(iN) });
    ptsAlc.push({ alb: a, ion: iA, x: X(a), y: Y(iA) });
  }

  // marcadores de albumina didáticos (4.0 normal, 2.0 hipoalbuminemia)
  function mk(av, pH) { var iv = ionAt(av, pH); return { alb: av, ion: iv, x: X(av), y: Y(iv) }; }
  var markers = [mk(4.0, PH_N), mk(2.0, PH_N)];

  // linha do limiar de hipocalcemia ionizada (~4.0 mg/dL)
  var limiarY = Y(4.0);

  // ponto atual
  var aCur = clampv(state.alb !== undefined ? state.alb : ALB_N, albMin, albMax);
  var pHcur = clampv(state.pH !== undefined ? state.pH : PH_N, 6.6, 7.8);
  var current = { alb: aCur, ion: ionAt(aCur, pHcur), x: X(aCur), y: Y(ionAt(aCur, pHcur)) };

  return {
    W: W, H: H, padL: padL, padR: padR, padT: padT, padB: padB, baseY: baseY,
    albMin: albMin, albMax: albMax, ionMin: ionMin, ionMax: ionMax, pxX: pxX, pxY: pxY,
    caTrueCorr: caTrueCorr,
    axis: { x0: padL, y0: padT, xEnd: W - padR, yEnd: baseY },
    ptsN: ptsN, ptsAlc: ptsAlc, markers: markers, limiarY: limiarY, current: current
  };
}

// ─── layout: a progressão da DRC (PO₄ / PTH / calcitriol vs TFG) ─────────────
/**
 * drcLayout(state, W, H)
 * Varre a TFG de 5 a 120 mL/min. Em cada TFG computa o eixo mineral e plota
 * (normalizados a tetos fixos) o PO₄, o PTH e o calcitriol: conforme a TFG cai,
 * PO₄↑ e PTH↑ (hiperPTH 2º) enquanto calcitriol↓.
 *   ptsPO4, ptsPTH, ptsCalc: [{gfr, v, x, y}]   ·   axis.
 */
function drcLayout(state, W, H) {
  state = state || {};
  W = clampv(W, 200, 100000);
  H = clampv(H, 120, 100000);

  var padL = 48, padR = 14, padT = 16, padB = 34;
  var baseY = H - padB;
  var gfrMin = 5, gfrMax = 120, N = 46;

  var pxX = (W - padL - padR) / (gfrMax - gfrMin);
  // eixos normalizados a tetos fixos para caber as três curvas
  var PO4_TOP = 10, PTH_TOP = 600, CALC_TOP = 60;

  function X(g) { return padL + (clampv(g, gfrMin, gfrMax) - gfrMin) * pxX; }
  function Yn(frac) { return baseY - clampv(frac, 0, 1) * (baseY - padT); }

  var ptsPO4 = [], ptsPTH = [], ptsCalc = [], i, g, r;
  for (i = 0; i <= N; i++) {
    g = gfrMin + (gfrMax - gfrMin) * i / N;
    r = mineral(merge(state, { gfr: g }));
    ptsPO4.push({ gfr: g, v: r.po4, x: X(g), y: Yn(r.po4 / PO4_TOP) });
    ptsPTH.push({ gfr: g, v: r.pth, x: X(g), y: Yn(r.pth / PTH_TOP) });
    ptsCalc.push({ gfr: g, v: r.calcitriol, x: X(g), y: Yn(r.calcitriol / CALC_TOP) });
  }

  return {
    W: W, H: H, padL: padL, padR: padR, padT: padT, padB: padB, baseY: baseY,
    gfrMin: gfrMin, gfrMax: gfrMax, PO4_TOP: PO4_TOP, PTH_TOP: PTH_TOP, CALC_TOP: CALC_TOP,
    pxX: pxX,
    axis: { x0: padL, y0: padT, xEnd: W - padR, yEnd: baseY },
    ptsPO4: ptsPO4, ptsPTH: ptsPTH, ptsCalc: ptsCalc
  };
}

// ─── exports ────────────────────────────────────────────────────────────────
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    mineral: mineral,
    caCorrigido: caCorrigido,
    caIonizado: caIonizado,
    mgGate: mgGate,
    renalActivation: renalActivation,
    caIonLayout: caIonLayout,
    drcLayout: drcLayout,
    clampv: clampv,
    merge: merge,
    CONST: {
      ALB_N: ALB_N, CORR_K: CORR_K, PH_N: PH_N, PH_SLOPE: PH_SLOPE, ION_FRAC: ION_FRAC,
      CA_TOT_N: CA_TOT_N, CA_ION_N: CA_ION_N, PO4_N: PO4_N, MG_N: MG_N,
      PTH_N: PTH_N, CALCITRIOL_N: CALCITRIOL_N, FGF23_N: FGF23_N, GFR_N: GFR_N,
      CA_SETPOINT: CA_SETPOINT, PTH_GAIN: PTH_GAIN, MG_GATE_LO: MG_GATE_LO, MG_GATE_HI: MG_GATE_HI
    }
  };
}
