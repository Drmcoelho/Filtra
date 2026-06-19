'use strict';
/*
 * FILTRA · M5 — TCP: reabsorção isosmótica, Na/glicose (SGLT2), HCO₃/anidrase
 *               carbônica, Fanconi — e a FARMACOLOGIA do segmento (§8: PIVÔ).
 * ---------------------------------------------------------------------------
 * Engine PURO, determinístico. Roda em Node e inline no HTML.
 * Regra-zero: o motor manda no pixel.
 *
 * Tese (o erro a corrigir): "o proximal só reabsorve".
 * Verdade: o TCP reabsorve ~65% do Na⁺ filtrado em MASSA e isosmótica — e por isso
 * "a alça é prisioneira do proximal": o que sobra aqui é a carga distal. É o alvo de
 * TRÊS fármacos (acetazolamida, SGLT2i, manitol). Quatro mecanismos:
 *   1. REABSORÇÃO ISOSMÓTICA EM MASSA — ~65% do Na⁺ filtrado e a água o segue; o
 *      restante define a carga distal. Inibir aqui tem teto: o distal compensa (braking).
 *   2. Na/GLICOSE via SGLT2 — cotransporte apical. Curva de TITULAÇÃO da glicose:
 *      filtrada = TFG·glicemia; reabsorvida satura no Tm (~375 mg/min); excretada =
 *      filtrada − reabsorvida, aparece acima do LIMIAR (~180–200 mg/dL) com SPLAY.
 *   3. HCO₃ / ANIDRASE CARBÔNICA — NHE3 secreta H⁺, a CA (IV apical + II citoplasmática)
 *      regenera CO₂/HCO₃ → ~85% do HCO₃ filtrado reabsorvido no TCP.
 *   4. FANCONI — disfunção proximal generalizada → glicosúria, aminoacidúria, fosfatúria,
 *      bicarbonatúria, uricosúria COM plasma normal (ATR proximal tipo 2).
 *
 * Farmacologia (§8 — doses REAIS, efeito computado por dose-resposta sigmoide):
 *   efeito = Emax · D / (EC50 + D)   — teto = Emax; EC50 ilustrativo (ensina FORMA).
 *   • acetazolamida 250–500 mg VO/IV → inibe a anidrase carbônica → bicarbonatúria +
 *     acidose metabólica + diurese leve; AUTOLIMITADA (escape proximal).
 *   • SGLT2i: dapagliflozina 10 mg/dia VO; empagliflozina 10–25 mg/dia VO → bloqueiam
 *     SGLT2 → baixam limiar/Tm → glicosúria + natriurese + ↓glicemia; restauram o
 *     feedback tubuloglomerular (nefroproteção; ponte com M2).
 *   • manitol 0,25–1 g/kg IV → osmótico não-reabsorvido → diurese osmótica.
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
var TFG_N      = 120;     // TFG de referência (mL/min)
var GLIC_N     = 100;     // glicemia de referência (mg/dL)
var TM_GLI     = 375;     // transporte máximo de reabsorção de glicose (mg/min) — o TETO clássico
var LIMIAR_GLI = 200;     // limiar (mg/dL) de excreção no rim normal (faixa clássica 180–200)
var SPLAY      = 25;      // "splay" (mg/dL) — largura da transição (néfrons heterogêneos)
var FRAC_NA_TCP   = 0.65; // fração do Na⁺ filtrado reabsorvida no TCP (~65%)
var FRAC_HCO3_TCP = 0.85; // fração do HCO₃⁻ filtrado reabsorvida no TCP (~85%)
var NA_PLASMA  = 140;     // Na⁺ plasmático (mEq/L) — para a carga filtrada de Na

// dose-resposta: EC50 ilustrativos (mg) e Emax (fração 0..1 do efeito-segmento)
var ACZ_EC50   = 250;     // acetazolamida: EC50 ~250 mg (faixa 250–500 mg)
var ACZ_EMAX   = 0.80;    // teto: bloqueia até ~80% da reabsorção de HCO₃ no TCP
var SGLT2_EC50 = 5;       // SGLT2i: EC50 ~5 mg (dapa 10, empa 10–25 mg)
var SGLT2_EMAX = 0.55;    // teto: derruba até ~55% do Tm/limiar de glicose
var MAN_EC50   = 0.35;    // manitol: EC50 ~0,35 g/kg (faixa 0,25–1 g/kg)
var MAN_EMAX   = 1.00;    // teto da diurese osmótica relativa

// teto da eficácia diurética da inibição PROXIMAL (a alça é prisioneira → braking)
var PROX_DIUR_CAP = 0.30; // a inibição proximal sozinha entrega no máx ~30% de natriurese
                          // (o distal recaptura o resto: braking)

// ─── dose-resposta sigmoide/hiperbólica  efeito = Emax·D/(EC50+D) ────────────
/**
 * doseResposta(D, EC50, Emax) → efeito ∈ [0, Emax)
 *   D    = dose (mg ou g/kg, conforme o fármaco)
 *   EC50 = dose de meia-resposta (efeito = Emax/2)
 *   Emax = teto do efeito
 * Ensina a FORMA: teto (Emax), potência (EC50), saturação. Não é PK exata.
 */
function doseResposta(D, EC50, Emax) {
  var d  = clampv(D, 0, 1e9);
  var ec = clampv(EC50, 1e-9, 1e9);
  var em = clampv(Emax, 0, 1);
  var e = em * d / (ec + d);
  if (!isFinite(e) || e < 0) e = 0;
  if (e > em) e = em;
  return e;
}

// ─── titulação da glicose: filtrada / reabsorvida (Tm+splay) / excretada ─────
/**
 * tituloGlicose(glicemia, tfg, tmEff, limiar)
 *   filtrada    = tfg · glicemia / 100        (mg/min)  [glicemia em mg/dL, tfg em mL/min]
 *   excretada   = começa acima do LIMIAR (mg/dL) com SPLAY (transição suave), e cresce
 *                 ~paralela à filtrada uma vez saturado o Tm efetivo.
 *   reabsorvida = filtrada − excretada, com TETO em tmEff.
 * O LIMIAR (≈180–200 mg/dL no rim normal) é o que o aluno "sente": abaixo dele a urina é
 * livre de glicose; acima, a glicosúria sobe. SGLT2i e Fanconi BAIXAM o limiar (e o Tm).
 * Nota de honestidade: a reabsorção PLATEIA na zona de saturação (transporte máximo
 * efetivo, governado pelo limiar/splay) sempre ≤ Tm absoluto (375 mg/min) — a curva ensina
 * a FORMA (limiar, splay, saturação), não os valores exatos de PK.
 */
function tituloGlicose(glicemia, tfg, tmEff, limiar) {
  var g   = clampv(glicemia, 0, 2000);
  var t   = clampv(tfg, 1, 200);
  var tm  = clampv(tmEff, 0, TM_GLI);
  var lim = clampv(limiar, 0, 2000);
  var filtrada = t * g / 100;            // mg/min

  // excreção: 0 bem abaixo do limiar; segue (filtrada − cap) acima.
  // splay: uma soft-plus em torno do limiar dá o joelho suave do nefron heterogêneo.
  // "déficit" de reabsorção = quanto da filtrada excede a capacidade de reabsorver.
  // A capacidade de reabsorver em cada glicemia ~ min(filtrada, Tm) MAS limitada pelo
  // limiar: acima do limiar, o excedente escapa. Modelamos a excreção como soft-plus:
  var sp = SPLAY > 0 ? SPLAY : 1;        // largura do splay (mg/dL)
  // fluxo de glicose acima do limiar (mg/min), suavizado:
  var z = (g - lim) / sp;
  var softpos = z > 30 ? z : (z < -3 ? 0 : Math.log(1 + Math.exp(z))); // log(1+e^z): soft-plus
  // abaixo de ~3 larguras de splay do limiar a glicosúria é sub-clínica → 0 limpo
  var excAcimaLimiar = softpos * sp * (t / 100);   // converte mg/dL→mg/min via TFG
  // acima do Tm efetivo, a reabsorção satura e a excreção cresce paralela à filtrada:
  var reabCap = Math.min(filtrada, tm);
  var excPorTm = filtrada - reabCap;     // ≥0 só quando filtrada > tm
  var excretada = Math.max(excAcimaLimiar, excPorTm);
  if (!isFinite(excretada) || excretada < 0) excretada = 0;
  if (excretada > filtrada) excretada = filtrada;

  var reab = filtrada - excretada;
  if (reab > tm) {                       // o Tm é teto absoluto da reabsorção
    excretada += (reab - tm);
    reab = tm;
  }
  if (!isFinite(reab) || reab < 0) reab = 0;
  if (excretada > filtrada) excretada = filtrada;
  return { filtrada: filtrada, reabsorvida: reab, excretada: excretada };
}

// ─── função principal ───────────────────────────────────────────────────────
/**
 * proximal(input) → estado completo do túbulo proximal e da farmacologia do segmento.
 *
 * input: {
 *   glicemia,   // glicemia plasmática (mg/dL; default 100)
 *   TFG,        // TFG (mL/min; default 120)
 *   acz,        // dose de acetazolamida (mg; default 0) — inibe a anidrase carbônica
 *   sglt2,      // dose de SGLT2i (mg; default 0) — bloqueia SGLT2 (dapa/empa)
 *   manitol,    // dose de manitol (g/kg; default 0) — osmótico
 *   fanconi     // true = síndrome de Fanconi (disfunção proximal generalizada); default false
 * }
 */
function proximal(input) {
  var inp = input || {};

  var glicemia = clampv(inp.glicemia !== undefined ? inp.glicemia : GLIC_N, 0, 2000);
  var TFG      = clampv(inp.TFG      !== undefined ? inp.TFG      : TFG_N, 1, 200);
  var acz      = clampv(inp.acz      !== undefined ? inp.acz      : 0, 0, 2000);
  var sglt2    = clampv(inp.sglt2    !== undefined ? inp.sglt2    : 0, 0, 200);
  var manitol  = clampv(inp.manitol  !== undefined ? inp.manitol  : 0, 0, 5);
  var fanconi  = (inp.fanconi === true || inp.fanconi === 1 || inp.fanconi === 'sim') ? true : false;

  // ─── dose-resposta dos três fármacos (efeito ∈ [0, Emax)) ──────────────────
  var eAcz   = doseResposta(acz,   ACZ_EC50,   ACZ_EMAX);    // inibição da CA (fração)
  var eSglt2 = doseResposta(sglt2, SGLT2_EC50, SGLT2_EMAX);  // bloqueio do SGLT2 (fração)
  var eMan   = doseResposta(manitol, MAN_EC50, MAN_EMAX);    // diurese osmótica (fração)

  // ─── 2. SGLT2: o Tm e o limiar de glicose deslocados pela droga e pelo Fanconi ─
  // SGLT2i baixa o Tm (e portanto o limiar); Fanconi também (transporte proximal ruído).
  var fanconiTmHit = fanconi ? 0.70 : 0;              // Fanconi derruba ~70% do Tm de glicose
  var tmFrac = (1 - eSglt2) * (1 - fanconiTmHit);
  if (tmFrac < 0) tmFrac = 0;
  var tmEff = TM_GLI * tmFrac;                        // Tm efetivo (mg/min)
  // limiar efetivo (mg/dL): basal ~200 no rim normal, deslocado para BAIXO por SGLT2i
  // (glicosúria em normoglicemia) e por Fanconi (glicosúria renal com plasma normal).
  var limiarEff = LIMIAR_GLI * (1 - eSglt2) * (1 - (fanconi ? 0.80 : 0));
  if (!isFinite(limiarEff) || limiarEff < 0) limiarEff = 0;

  var tit = tituloGlicose(glicemia, TFG, tmEff, limiarEff);
  var glicosuria = tit.excretada;                    // mg/min de glicose excretada
  var glicosuriaPos = glicosuria > 0.5;              // há glicosúria clínica?

  // ─── 1. REABSORÇÃO ISOSMÓTICA EM MASSA: Na⁺ e a carga distal ───────────────
  // Na⁺ filtrado (mEq/min) = TFG(mL/min)·Na_plasma(mEq/L)/1000
  var naFiltrado = TFG * NA_PLASMA / 1000;            // mEq/min
  // fração reabsorvida no TCP, reduzida pela inibição proximal (acetazolamida via NHE3
  // acoplado à CA; manitol retém água→Na no túbulo; SGLT2i carrega Na junto com glicose)
  var inibProx = 1 - (1 - 0.35 * eAcz) * (1 - 0.25 * eMan) * (1 - 0.20 * eSglt2);
  if (inibProx < 0) inibProx = 0; if (inibProx > 1) inibProx = 1;
  var fracNaTcp = FRAC_NA_TCP * (1 - inibProx);       // fração efetivamente reabsorvida no TCP
  if (fanconi) fracNaTcp *= 0.7;                      // Fanconi: reabsorção proximal global ↓
  var naReabTcp = naFiltrado * fracNaTcp;             // mEq/min reabsorvido no TCP
  var cargaDistalNa = naFiltrado - naReabTcp;         // mEq/min que CHEGA ao distal
  // fração do Na filtrado que escapa do proximal (= carga distal relativa)
  var fracDistal = naFiltrado > 0 ? cargaDistalNa / naFiltrado : 0;

  // ─── eficácia diurética da inibição proximal (TETO: a alça é prisioneira) ──
  // o distal recaptura a maior parte do Na extra → natriurese final limitada (braking).
  var natriureseProximalBruta = cargaDistalNa - (FRAC_NA_TCP < 1 ? naFiltrado * (1 - FRAC_NA_TCP) : 0);
  if (natriureseProximalBruta < 0) natriureseProximalBruta = 0;
  // o que de fato vira urina: fração capeada da natriurese bruta + osmótico do manitol
  var fracEntregueDistal = inibProx;                 // 0..1, quanto a mais chega ao distal
  var natriureseFinal = naFiltrado * (FRAC_NA_TCP) * fracEntregueDistal * PROX_DIUR_CAP
                        + naFiltrado * 0.02 * eMan;   // manitol adiciona arraste osmótico
  if (!isFinite(natriureseFinal) || natriureseFinal < 0) natriureseFinal = 0;

  // ─── 3. HCO₃ / ANIDRASE CARBÔNICA: bicarbonatúria pela acetazolamida ───────
  // a acetazolamida bloqueia a CA → reabsorção de HCO₃ no TCP cai por eAcz (fração)
  var fracHco3 = FRAC_HCO3_TCP * (1 - eAcz);
  if (fanconi) fracHco3 *= 0.6;                      // Fanconi: ATR proximal tipo 2 (perde HCO₃)
  if (fracHco3 < 0) fracHco3 = 0;
  var hco3UrinarioFrac = (FRAC_HCO3_TCP - fracHco3); // fração a MAIS de HCO₃ na urina vs basal
  if (hco3UrinarioFrac < 0) hco3UrinarioFrac = 0;
  // bicarbonatúria relativa (0 = nenhuma; 1 = perda máxima do que o TCP normalmente salva)
  var bicarbonaturia = FRAC_HCO3_TCP > 0 ? hco3UrinarioFrac / FRAC_HCO3_TCP : 0;
  // acidose metabólica estimada: queda de HCO₃ plasmático proporcional à perda renal
  var deltaHco3 = -6.0 * bicarbonaturia;             // mEq/L de queda (didático, autolimitado)
  var hco3Plasma = clampv(24 + deltaHco3, 8, 30);    // novo HCO₃ plasmático aproximado

  // ─── 4. FANCONI: perdas múltiplas com plasma normal ────────────────────────
  // marcadores qualitativos de perda urinária (true = espoliação)
  var fanconiPerdas = {
    glicose:    fanconi || glicosuriaPos,
    aminoacido: fanconi,
    fosfato:    fanconi,
    bicarbonato: fanconi || bicarbonaturia > 0.15,
    acidoUrico: fanconi
  };

  // ─── regime (a leitura do módulo) ──────────────────────────────────────────
  var regime;
  if (fanconi)                                  regime = 'fanconi';
  else if (eSglt2 > 0.25 && glicosuriaPos && glicemia < 180)  regime = 'sglt2i_glicosuria_normo';
  else if (eAcz > 0.25 && bicarbonaturia > 0.2) regime = 'acetazolamida';
  else if (eMan > 0.3)                          regime = 'manitol_osmotico';
  else if (glicosuriaPos && glicemia >= 180)    regime = 'glicosuria_hiperglicemica';
  else                                          regime = 'normal';

  // pérola: a alça é prisioneira do proximal — inibição proximal ↑ carga distal,
  // MAS a natriurese final é capeada (braking). Quantificamos o "desperdício".
  var braking = natriureseProximalBruta > 0
    ? 1 - (natriureseFinal / (natriureseProximalBruta + 1e-9))
    : 0;
  braking = clampv(braking, 0, 1);

  return {
    // entradas efetivas
    glicemia: glicemia, TFG: TFG, acz: acz, sglt2: sglt2, manitol: manitol, fanconi: fanconi,
    // dose-resposta
    eAcz: eAcz, eSglt2: eSglt2, eMan: eMan,
    aczEC50: ACZ_EC50, aczEmax: ACZ_EMAX, sglt2EC50: SGLT2_EC50, sglt2Emax: SGLT2_EMAX,
    manEC50: MAN_EC50, manEmax: MAN_EMAX,
    // titulação da glicose
    glicoseFiltrada: tit.filtrada, glicoseReabsorvida: tit.reabsorvida, glicosuria: glicosuria,
    glicosuriaPos: glicosuriaPos, tmEff: tmEff, limiarEff: limiarEff, tmBasal: TM_GLI,
    // Na e carga distal
    naFiltrado: naFiltrado, fracNaTcp: fracNaTcp, naReabTcp: naReabTcp,
    cargaDistalNa: cargaDistalNa, fracDistal: fracDistal,
    natriureseFinal: natriureseFinal, braking: braking, inibProx: inibProx,
    // HCO₃ / CA
    fracHco3: fracHco3, bicarbonaturia: bicarbonaturia, hco3Plasma: hco3Plasma, deltaHco3: deltaHco3,
    // Fanconi
    fanconiPerdas: fanconiPerdas,
    // regime
    regime: regime
  };
}

// ─── layout: a CURVA DE TITULAÇÃO da glicose (filtrada/reabsorvida/excretada) ─
/**
 * glicoseTitulacaoLayout(state, W, H)
 * Varre a glicemia de 0 a 600 mg/dL. Em cada ponto computa filtrada/reabsorvida/
 * excretada com o Tm efetivo do estado (deslocado por SGLT2i/Fanconi). Devolve três
 * polilinhas (a UI só liga os pontos — o motor manda no pixel). X=glicemia, Y=mg/min.
 *   filt: [{g,x,y}]  ·  reab: [{g,x,y}]  ·  exc: [{g,x,y}]
 *   limiarX (linha do limiar) · tmY (linha do Tm) · axis.
 */
function glicoseTitulacaoLayout(state, W, H) {
  state = state || {};
  W = clampv(W, 200, 100000);
  H = clampv(H, 120, 100000);

  // recompute o Tm/limiar efetivos via o engine (consistência total)
  var r = proximal(state);
  var tmEff  = r.tmEff;
  var limEff = r.limiarEff;
  var tfg    = r.TFG;

  var padL = 54, padR = 16, padT = 18, padB = 38;
  var baseY = H - padB;
  var gMin = 0, gMax = 600, N = 60;
  // eixo Y: mg/min; topo = filtrada na glicemia máxima (TFG·600/100) com folga
  var yMax = Math.max(tfg * gMax / 100, TM_GLI) * 1.05;
  if (!isFinite(yMax) || yMax <= 0) yMax = 800;

  var pxX = (W - padL - padR) / (gMax - gMin);
  var pxY = (baseY - padT) / yMax;

  function X(g) { return padL + (clampv(g, gMin, gMax) - gMin) * pxX; }
  function Y(v) { return baseY - clampv(v, 0, yMax) * pxY; }

  var filt = [], reab = [], exc = [], i, g, t;
  for (i = 0; i <= N; i++) {
    g = gMin + (gMax - gMin) * i / N;
    t = tituloGlicose(g, tfg, tmEff, limEff);
    filt.push({ g: g, v: t.filtrada,    x: X(g), y: Y(t.filtrada) });
    reab.push({ g: g, v: t.reabsorvida, x: X(g), y: Y(t.reabsorvida) });
    exc.push({  g: g, v: t.excretada,   x: X(g), y: Y(t.excretada) });
  }

  // marcadores: o limiar efetivo (linha vertical) e o Tm (linha horizontal)
  var limiarX = X(clampv(r.limiarEff, gMin, gMax));
  var tmY = Y(tmEff);
  // o ponto da glicemia atual sobre a curva de excreção
  var gCur = clampv(r.glicemia, gMin, gMax);
  var tCur = tituloGlicose(gCur, tfg, tmEff, limEff);
  var current = { g: gCur, exc: tCur.excretada, x: X(gCur), y: Y(tCur.excretada) };

  return {
    W: W, H: H, padL: padL, padR: padR, padT: padT, padB: padB, baseY: baseY,
    gMin: gMin, gMax: gMax, yMax: yMax, pxX: pxX, pxY: pxY,
    tmEff: tmEff, tfg: tfg, limiarEff: r.limiarEff,
    axis: { x0: padL, y0: padT, xEnd: W - padR, yEnd: baseY },
    filt: filt, reab: reab, exc: exc,
    limiarX: limiarX, tmY: tmY, current: current
  };
}

// ─── layout: a curva DOSE-RESPOSTA sigmoide  efeito = Emax·D/(EC50+D) ─────────
/**
 * doseRespostaLayout(EC50, Emax, dMax, W, H, curD)
 * Varre a dose de 0 a dMax; em cada ponto computa efeito = Emax·D/(EC50+D).
 * Marca o EC50 (onde efeito = Emax/2), o teto Emax e a dose atual curD.
 *   pts: [{d, e, x, y}]  ·  ec50X · emaxY · cur (ponto da dose atual) · axis.
 */
function doseRespostaLayout(EC50, Emax, dMax, W, H, curD) {
  W = clampv(W, 160, 100000);
  H = clampv(H, 100, 100000);
  var ec = clampv(EC50, 1e-6, 1e9);
  var em = clampv(Emax, 0.01, 1);
  var dM = clampv(dMax, ec * 2, 1e9);
  var cd = clampv(curD, 0, dM);

  var padL = 40, padR = 12, padT = 14, padB = 28;
  var baseY = H - padB;
  var N = 50;
  var yMax = em * 1.08;

  var pxX = (W - padL - padR) / dM;
  var pxY = (baseY - padT) / yMax;

  function X(d) { return padL + clampv(d, 0, dM) * pxX; }
  function Y(e) { return baseY - clampv(e, 0, yMax) * pxY; }

  var pts = [], i, d, e;
  for (i = 0; i <= N; i++) {
    d = dM * i / N;
    e = doseResposta(d, ec, em);
    pts.push({ d: d, e: e, x: X(d), y: Y(e) });
  }
  var ec50X = X(ec);
  var emaxY = Y(em);
  var eCur = doseResposta(cd, ec, em);
  var cur = { d: cd, e: eCur, x: X(cd), y: Y(eCur) };

  return {
    W: W, H: H, padL: padL, padR: padR, padT: padT, padB: padB, baseY: baseY,
    EC50: ec, Emax: em, dMax: dM, yMax: yMax, pxX: pxX, pxY: pxY,
    axis: { x0: padL, y0: padT, xEnd: W - padR, yEnd: baseY },
    pts: pts, ec50X: ec50X, emaxY: emaxY, cur: cur
  };
}

// ─── exports ────────────────────────────────────────────────────────────────
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    proximal: proximal,
    doseResposta: doseResposta,
    tituloGlicose: tituloGlicose,
    glicoseTitulacaoLayout: glicoseTitulacaoLayout,
    doseRespostaLayout: doseRespostaLayout,
    clampv: clampv,
    merge: merge,
    CONST: {
      TFG_N: TFG_N, GLIC_N: GLIC_N, TM_GLI: TM_GLI, LIMIAR_GLI: LIMIAR_GLI, SPLAY: SPLAY,
      FRAC_NA_TCP: FRAC_NA_TCP, FRAC_HCO3_TCP: FRAC_HCO3_TCP, NA_PLASMA: NA_PLASMA,
      ACZ_EC50: ACZ_EC50, ACZ_EMAX: ACZ_EMAX, SGLT2_EC50: SGLT2_EC50, SGLT2_EMAX: SGLT2_EMAX,
      MAN_EC50: MAN_EC50, MAN_EMAX: MAN_EMAX, PROX_DIUR_CAP: PROX_DIUR_CAP
    }
  };
}
