'use strict';
/*
 * FILTRA · M14 — RAAS e o eixo endócrino renal
 * ---------------------------------------------------------------------------
 * Engine PURO, determinístico. Roda em Node e inline no HTML.
 * Regra-zero: o motor manda no pixel.
 *
 * Tese (o erro a corrigir): "o rim só filtra".
 * Verdade: o rim é uma GLÂNDULA. Ele SENTE pressão, Na⁺ e O₂ e RESPONDE com
 * hormônios que defendem o VOLUME CIRCULANTE EFETIVO e o meio interno:
 *
 *   1. RENINA (aparelho justaglomerular) — liberada por TRÊS sinais:
 *        ↓pressão na arteríola aferente (barorreceptor),
 *        ↓Na⁺ na mácula densa (feedback tubuloglomerular),
 *        ↑tônus simpático (β1).
 *      É o gatilho do eixo. O VOLUME é o sinal integrador: volume↑ → renina↓ (feedback).
 *
 *   2. CASCATA — angiotensinogênio →(renina)→ Ang I →(ECA, pulmão)→ Ang II.
 *      Ang II: constrição EFERENTE (preserva a TFG — ponte M2), sede, ↑ADH,
 *      ↑reabsorção proximal de Na⁺ e ↑ALDOSTERONA (suprarrenal).
 *      Aldosterona → ENaC no ducto coletor: retém Na⁺, secreta K⁺/H⁺ (ponte M8).
 *
 *   3. ADH / vasopressina — dois estímulos:
 *        osmótico (tonicidade↑ → ADH↑, muito sensível) e
 *        não-osmótico (volume↓↓ → ADH↑, override hemodinâmico — ponte M10).
 *
 *   4. ERITROPOETINA — fibroblastos peritubulares sentem O₂ (HIF): O₂↓ → EPO↑
 *      → eritropoese. Na DRC, a MASSA renal cai → EPO cai → anemia.
 *
 *   5. VITAMINA D — a 1α-hidroxilase RENAL ativa o calcitriol (ponte M12).
 *      Depende da massa renal → cai na DRC.
 *
 * Fórmulas-mãe (didáticas, normalizadas a 1 = basal):
 *   renina   = baro(pressão) · macula(Na) · simp · feedbackVolume(volume)
 *   AngII    = renina · angiotensinogênio
 *   aldo     = AngII · fatorK
 *   ADH      = osmótico(tonicidade) + não-osmótico(volume)
 *   EPO      = hipoxia(O₂) · massaRenal(GFR)        [cai na DRC]
 *   calcitriol = massaRenal(GFR)
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

// ─── constantes fisiológicas calibradas (basais = 1) ────────────────────────
var P_N      = 95;     // pressão aferente de referência (mmHg)
var P_LO     = 50;     // pressão onde o barorreceptor satura (renina máxima)
var P_HI     = 140;    // pressão onde a renina é máxima suprimida
var BARO_MAX = 3.0;    // ganho máximo do barorreceptor (renina ×3 na hipotensão)

var NA_N     = 100;    // Na⁺ na mácula densa de referência (%)
var MAC_MAX  = 2.4;    // ganho máximo do feedback da mácula densa (↓Na → renina↑)

var SYMP_N   = 1.0;    // tônus simpático basal
var SYMP_MAX = 2.0;    // tônus simpático máximo (β1)
var SYMP_GAIN= 0.8;    // quanto o simpático amplifica a renina por unidade acima do basal

var VOL_N    = 100;    // volume circulante efetivo de referência (%)
var VOL_FB   = 0.020;  // ganho do FEEDBACK do volume sobre a renina (volume↑ → renina↓)

var AGT_N    = 1.0;    // angiotensinogênio (substrato hepático) de referência

var KPLUS_N  = 4.0;    // K⁺ sérico de referência (mEq/L) — estímulo direto da aldo
var ALDO_K   = 0.35;   // ganho da hipercalemia sobre a aldosterona (por mEq/L)

var TONIC_N  = 290;    // tonicidade/osmolalidade efetiva de referência (mOsm/kg)
var ADH_OSM  = 0.06;   // ganho osmótico do ADH (por mOsm/kg acima do limiar)
var ADH_THR  = 280;    // limiar osmótico do ADH (mOsm/kg)
var ADH_VOL  = 0.045;  // ganho NÃO-osmótico (por % de queda de volume abaixo do limiar)
var ADH_VOLTHR=92;     // limiar de volume para o disparo não-osmótico (%)

var O2_N     = 100;    // O₂/Hb renal de referência (%)
var EPO_HYP  = 0.060;  // ganho da hipóxia sobre a EPO (por % de queda de O₂)

var GFR_N    = 100;    // TFG de referência (mL/min) — proxy de massa renal funcionante
var GFR_DRC  = 30;     // abaixo disto a glândula endócrina começa a falir
var CALC_N   = 1.0;    // calcitriol basal

// ─── sub-respostas (puras) ──────────────────────────────────────────────────

// barorreceptor da aferente: pressão↓ → renina↑ (rampa entre P_LO e P_HI)
function baro(pressure) {
  var p = clampv(pressure, 20, 220);
  var frac = (P_HI - p) / (P_HI - P_LO);  // 1 em P_LO, 0 em P_HI
  frac = clampv(frac, 0, 1);
  return 0.4 + (BARO_MAX - 0.4) * frac;   // [0.4 (HAS) .. BARO_MAX (hipotensão)]
}

// mácula densa: Na⁺ entregue↓ → renina↑ (feedback tubuloglomerular)
function macula(naMacula) {
  var na = clampv(naMacula, 10, 200);
  var frac = (NA_N - na) / NA_N;          // >0 quando Na baixo
  frac = clampv(frac, -0.6, 1);
  return clampv(1 + MAC_MAX * frac, 0.4, MAC_MAX + 1);
}

// simpático: β1 amplifica a renina
function simpatico(symp) {
  var s = clampv(symp, 0, SYMP_MAX);
  return clampv(1 + SYMP_GAIN * (s - SYMP_N), 0.3, 1 + SYMP_GAIN * (SYMP_MAX - SYMP_N));
}

// feedback do volume: volume circulante efetivo↑ → renina↓ (alça de feedback)
function feedbackVolume(volume) {
  var v = clampv(volume, 40, 200);
  var f = 1 - VOL_FB * (v - VOL_N);       // v=100 → 1; v=150 → 0; v=50 → 2
  return clampv(f, 0.05, 2.5);
}

// ─── função principal ───────────────────────────────────────────────────────
/**
 * eixo(input) → o estado completo do eixo endócrino renal.
 *
 * input: {
 *   pressure,  // pressão na aferente / PAM (mmHg; default 95) — barorreceptor
 *   volume,    // volume circulante efetivo (%; default 100) — feedback integrador
 *   naMacula,  // Na⁺ entregue à mácula densa (%; default 100) — feedback TG
 *   symp,      // tônus simpático (0..2; default 1) — β1
 *   agt,       // angiotensinogênio / substrato (rel.; default 1)
 *   kplus,     // K⁺ sérico (mEq/L; default 4) — estímulo direto da aldosterona
 *   aldoAuto,  // aldosterona AUTÔNOMA do adenoma (rel.; default 0) — hiperaldo 1º (Conn)
 *   tonicity,  // tonicidade efetiva (mOsm/kg; default 290) — estímulo osmótico do ADH
 *   adhDrive,  // ADH inapropriado/ectópico (rel.; default 0) — SIADH (secreção sem estímulo)
 *   o2,        // O₂/Hb renal (%; default 100) — sensor HIF da EPO
 *   GFR        // TFG (mL/min; default 100) — massa renal (EPO e calcitriol caem na DRC)
 * }
 */
function eixo(input) {
  var inp = input || {};

  var pressure = clampv(inp.pressure !== undefined ? inp.pressure : P_N, 20, 220);
  var volume   = clampv(inp.volume   !== undefined ? inp.volume   : VOL_N, 40, 200);
  var naMacula = clampv(inp.naMacula !== undefined ? inp.naMacula : NA_N, 10, 200);
  var symp     = clampv(inp.symp     !== undefined ? inp.symp     : SYMP_N, 0, SYMP_MAX);
  var agt      = clampv(inp.agt      !== undefined ? inp.agt      : AGT_N, 0.2, 4);
  var kplus    = clampv(inp.kplus    !== undefined ? inp.kplus    : KPLUS_N, 1.5, 9);
  var aldoAuto = clampv(inp.aldoAuto !== undefined ? inp.aldoAuto : 0, 0, 30);
  var tonicity = clampv(inp.tonicity !== undefined ? inp.tonicity : TONIC_N, 240, 360);
  var adhDrive = clampv(inp.adhDrive !== undefined ? inp.adhDrive : 0, 0, 20);
  var o2       = clampv(inp.o2       !== undefined ? inp.o2       : O2_N, 20, 130);
  var GFR      = clampv(inp.GFR!==undefined?inp.GFR:(inp.gfr!==undefined?inp.gfr:GFR_N), 2, 160);

  // ─── RENINA: três sinais × feedback do volume ──────────────────────────────
  // A aldosterona AUTÔNOMA (adenoma) retém Na⁺/volume → SUPRIME a renina pela
  // alça do JGA (renina BAIXA com aldo ALTA = a assinatura do hiperaldo 1º).
  var sBaro = baro(pressure);            // sinal 1: ↓pressão
  var sMac  = macula(naMacula);          // sinal 2: ↓Na na mácula densa
  var sSymp = simpatico(symp);           // sinal 3: ↑simpático (β1)
  var fVol  = feedbackVolume(volume);    // alça integradora: volume↑ → renina↓
  var supAuto = 1 / (1 + 0.35 * aldoAuto); // a aldo autônoma freia a renina
  var renina = sBaro * sMac * sSymp * fVol * supAuto;
  if (!isFinite(renina)) renina = 0;
  renina = clampv(renina, 0, 30);

  // ─── CASCATA: AngII ∝ renina · angiotensinogênio ───────────────────────────
  var angII = renina * agt;
  if (!isFinite(angII)) angII = 0;
  angII = clampv(angII, 0, 60);

  // ─── ALDOSTERONA = (∝ AngII, + K⁺ direto) + a parcela AUTÔNOMA do adenoma ───
  var fatorK = 1 + ALDO_K * (kplus - KPLUS_N);     // hipercalemia estimula direto
  fatorK = clampv(fatorK, 0.2, 4);
  var aldoRAAS = angII * fatorK;                   // a fração regulada pelo RAAS
  var aldo = aldoRAAS + aldoAuto;                  // adenoma some uma parcela fixa
  if (!isFinite(aldo)) aldo = 0;
  aldo = clampv(aldo, 0, 120);

  // ─── ADH / vasopressina: osmótico + não-osmótico + inapropriado ────────────
  var adhOsm = 1 + ADH_OSM * (tonicity - ADH_THR);  // osmótico (sensível)
  if (adhOsm < 0) adhOsm = 0;
  // não-osmótico: dispara forte quando o volume cai abaixo do limiar (override)
  var deficit = ADH_VOLTHR - volume;
  var adhVol = deficit > 0 ? ADH_VOL * deficit * deficit / 10 : 0; // quadrático: override
  // inapropriado (ectópico): ADH secretado SEM estímulo osmótico nem de volume (SIADH)
  var adh = adhOsm + adhVol + adhDrive;
  if (!isFinite(adh)) adh = 0;
  adh = clampv(adh, 0, 40);

  // ─── ERITROPOETINA: hipóxia × massa renal (cai na DRC) ─────────────────────
  var hyp = 1 + EPO_HYP * (O2_N - o2);              // O₂↓ → EPO↑
  if (hyp < 0) hyp = 0;
  // massa renal funcionante (proxy da glândula): satura em 1 acima do normal
  var massaRenal = GFR >= GFR_N ? 1 : (GFR <= 2 ? 0 : GFR / GFR_N);
  massaRenal = clampv(massaRenal, 0, 1);
  // a fábrica de EPO morre mais cedo na DRC avançada (queda mais íngreme)
  var epoMassa = GFR >= GFR_DRC ? massaRenal : (GFR <= 2 ? 0 : Math.pow(GFR/GFR_DRC,2)*(GFR_DRC/GFR_N));
  epoMassa = clampv(epoMassa, 0, 1);
  var epo = hyp * epoMassa;
  if (!isFinite(epo)) epo = 0;
  epo = clampv(epo, 0, 30);

  // ─── CALCITRIOL (vit D ativa): 1α-hidroxilase renal — massa renal ──────────
  var calcitriol = CALC_N * massaRenal;
  if (!isFinite(calcitriol)) calcitriol = 0;
  calcitriol = clampv(calcitriol, 0, 2);

  // razão aldosterona/renina (ARR — pista do hiperaldo primário)
  var arr = aldo / (renina + 1e-6);

  // ─── leitura: o "regime" do eixo (a história computada) ─────────────────────
  var regime;
  if (aldo > 4 && renina < 0.9 && arr > 6)    regime = 'hiperaldo_primario'; // aldo ALTA, renina BAIXA, ARR↑
  else if (GFR < GFR_DRC)                     regime = 'drc_endocrina';      // glândula falha: EPO/vitD↓
  else if (volume < 80 || pressure < 75)      regime = 'hipovolemia';        // RAAS ativado (apropriado)
  else if (adhDrive > 2 && tonicity <= TONIC_N && volume >= ADH_VOLTHR) regime = 'siadh'; // ADH sem estímulo
  else if (renina > 2.2)                      regime = 'raas_ativado';
  else                                        regime = 'basal';

  return {
    // entradas efetivas
    pressure: pressure, volume: volume, naMacula: naMacula, symp: symp,
    agt: agt, kplus: kplus, aldoAuto: aldoAuto, tonicity: tonicity, adhDrive: adhDrive,
    o2: o2, GFR: GFR,
    // sinais da renina
    sBaro: sBaro, sMac: sMac, sSymp: sSymp, fVol: fVol, supAuto: supAuto,
    // a cascata
    renina: renina, angII: angII, fatorK: fatorK, aldoRAAS: aldoRAAS, aldo: aldo, arr: arr,
    // ADH decomposto
    adh: adh, adhOsm: adhOsm, adhVol: adhVol,
    // EPO e calcitriol
    epo: epo, hyp: hyp, massaRenal: massaRenal, epoMassa: epoMassa, calcitriol: calcitriol,
    // leitura
    regime: regime
  };
}

// ─── layout: a CASCATA RAAS computada (renina → AngII → aldo vs estímulo) ────
/**
 * cascataLayout(state, W, H)
 * Varre o estímulo "volume circulante" de 130% a 50%. Em cada ponto computa
 * renina, AngII e aldosterona. Devolve TRÊS polilinhas (renina, AngII, aldo)
 * sobre o mesmo eixo X (volume), mostrando a ALÇA DE FEEDBACK: volume↑ →
 * renina↓. A UI só liga os pontos — o motor manda no pixel. X = volume (%),
 * Y = nível hormonal (rel.).
 */
function cascataLayout(state, W, H) {
  state = state || {};
  W = clampv(W, 200, 100000);
  H = clampv(H, 120, 100000);

  var padL = 50, padR = 16, padT = 18, padB = 38;
  var baseY = H - padB;
  var vMin = 50, vMax = 130, N = 64;
  var yMin = 0, yMax = 12;   // nível hormonal relativo (clampa no teto)

  var pxX = (W - padL - padR) / (vMax - vMin);
  var pxY = (baseY - padT) / (yMax - yMin);

  function X(v) { return padL + (clampv(v, vMin, vMax) - vMin) * pxX; }
  function Y(y) { return baseY - clampv(y, yMin, yMax) * pxY; }

  var renP = [], angP = [], aldP = [], i, v, r;
  for (i = 0; i <= N; i++) {
    v = vMin + (vMax - vMin) * i / N;
    r = eixo(merge(state, { volume: v }));
    renP.push({ vol: v, val: r.renina, x: X(v), y: Y(r.renina) });
    angP.push({ vol: v, val: r.angII,  x: X(v), y: Y(r.angII) });
    aldP.push({ vol: v, val: r.aldo,   x: X(v), y: Y(r.aldo) });
  }

  // ponto do volume atual sobre a curva da renina
  var vCur = clampv(state.volume !== undefined ? state.volume : VOL_N, vMin, vMax);
  var rCur = eixo(merge(state, { volume: vCur }));
  var current = { vol: vCur, val: rCur.renina, x: X(vCur), y: Y(rCur.renina) };

  return {
    W: W, H: H, padL: padL, padR: padR, padT: padT, padB: padB, baseY: baseY,
    vMin: vMin, vMax: vMax, yMin: yMin, yMax: yMax, pxX: pxX, pxY: pxY,
    axis: { x0: padL, y0: padT, xEnd: W - padR, yEnd: baseY },
    renP: renP, angP: angP, aldP: aldP, current: current
  };
}

// ─── layout: a RESPOSTA de cada hormônio ao seu estímulo (barras computadas) ─
/**
 * respostaLayout(state, W, H)
 * Cinco hormônios (renina, AngII, aldo, ADH, EPO) computados no estado atual,
 * desenhados como BARRAS verticais (altura ∝ nível, normalizado por um teto
 * didático). Pura função de layout: a UI só pinta os retângulos.
 */
function respostaLayout(state, W, H) {
  state = state || {};
  W = clampv(W, 200, 100000);
  H = clampv(H, 120, 100000);

  var padL = 36, padR = 14, padT = 18, padB = 36;
  var baseY = H - padB;

  var r = eixo(state);
  // tetos didáticos para normalizar cada barra a [0..1]
  var defs = [
    { key: 'renina', label: 'renina', val: r.renina, cap: 8,  col: '#e0556b' },
    { key: 'angII',  label: 'Ang II', val: r.angII,  cap: 8,  col: '#e8a13a' },
    { key: 'aldo',   label: 'aldo',   val: r.aldo,   cap: 12, col: '#52c08a' },
    { key: 'adh',    label: 'ADH',    val: r.adh,    cap: 8,  col: '#3a7bd5' },
    { key: 'epo',    label: 'EPO',    val: r.epo,    cap: 4,  col: '#39c0c8' }
  ];

  var n = defs.length;
  var slot = (W - padL - padR) / n;
  var bw = slot * 0.56;
  var bars = [];
  for (var i = 0; i < n; i++) {
    var frac = clampv(defs[i].val / defs[i].cap, 0, 1);
    var h = frac * (baseY - padT);
    var x = padL + slot * i + (slot - bw) / 2;
    bars.push({
      key: defs[i].key, label: defs[i].label, col: defs[i].col,
      val: defs[i].val, frac: frac,
      x: x, w: bw, y: baseY - h, h: h, cx: x + bw / 2
    });
  }

  return {
    W: W, H: H, padL: padL, padR: padR, padT: padT, padB: padB, baseY: baseY,
    axis: { x0: padL, y0: padT, xEnd: W - padR, yEnd: baseY },
    bars: bars
  };
}

// ─── exports ────────────────────────────────────────────────────────────────
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    eixo: eixo,
    baro: baro,
    macula: macula,
    simpatico: simpatico,
    feedbackVolume: feedbackVolume,
    cascataLayout: cascataLayout,
    respostaLayout: respostaLayout,
    clampv: clampv,
    merge: merge,
    CONST: {
      P_N: P_N, P_LO: P_LO, P_HI: P_HI, BARO_MAX: BARO_MAX,
      NA_N: NA_N, MAC_MAX: MAC_MAX, SYMP_N: SYMP_N, SYMP_MAX: SYMP_MAX, SYMP_GAIN: SYMP_GAIN,
      VOL_N: VOL_N, VOL_FB: VOL_FB, AGT_N: AGT_N, KPLUS_N: KPLUS_N, ALDO_K: ALDO_K,
      TONIC_N: TONIC_N, ADH_OSM: ADH_OSM, ADH_THR: ADH_THR, ADH_VOL: ADH_VOL, ADH_VOLTHR: ADH_VOLTHR,
      O2_N: O2_N, EPO_HYP: EPO_HYP, GFR_N: GFR_N, GFR_DRC: GFR_DRC, CALC_N: CALC_N
    }
  };
}
