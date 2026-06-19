'use strict';
/*
 * FILTRA · M8 — Ducto coletor: célula PRINCIPAL (ENaC/aldosterona) × célula
 *               INTERCALAR (H⁺/HCO₃), ADH/aquaporinas — e a FARMACOLOGIA do
 *               segmento (§8: poupadores de K + vaptanos).
 * ---------------------------------------------------------------------------
 * Engine PURO, determinístico. Roda em Node e inline no HTML.
 * Regra-zero: o motor manda no pixel.
 *
 * Tese (o erro a corrigir): "aldosterona = sódio".
 * Verdade: a aldosterona NÃO "só retém sódio" — ela TROCA Na⁺ por K⁺ e H⁺. E o ADH
 * é uma alavanca SEPARADA: abre aquaporinas → reabsorve ÁGUA LIVRE. DUAS alavancas
 * distintas (volume × água livre). Quatro mecanismos:
 *   1. CÉLULA PRINCIPAL — o ENaC apical reabsorve Na⁺ → a luz fica ELETRONEGATIVA →
 *      essa voltagem IMPULSIONA a secreção de K⁺ e H⁺. A aldosterona ↑ENaC e ↑Na/K-ATPase
 *      → reabsorve Na⁺ e SECRETA K⁺ e H⁺ (hiperaldo → hipocalemia + alcalose metabólica).
 *   2. CÉLULA INTERCALAR — tipo A secreta H⁺ (H⁺-ATPase) e regenera HCO₃⁻ (acidez
 *      titulável / NH₄⁺); tipo B secreta HCO₃⁻. O ducto é o ajuste FINO do ácido-base.
 *   3. ADH / VASOPRESSINA — V2 → aquaporina-2 apical → reabsorção de ÁGUA LIVRE
 *      (concentra a urina). Eixo INDEPENDENTE do Na⁺ (ponte M10).
 *   4. O DUCTO É O AJUSTE FINO — só ~2–3% do Na⁺ filtrado, MAS define o K⁺, o H⁺ e a
 *      água final. Pouco Na⁺, grande poder sobre o meio interno.
 *
 * Farmacologia (§8 — doses REAIS, efeito computado por dose-resposta sigmoide):
 *   efeito = Emax · D / (EC50 + D)   — teto = Emax; EC50 ilustrativo (ensina FORMA).
 *   • espironolactona 25–100 mg/dia VO → antagonista do receptor mineralocorticoide (MR),
 *     poupador de K⁺: bloqueia a aldosterona → ↓ENaC → natriurese leve + RETENÇÃO de K⁺.
 *   • eplerenona 25–50 mg/dia VO → MR-antagonista SELETIVO (menos ginecomastia).
 *   • amilorida 5–10 mg/dia VO → bloqueia DIRETAMENTE o ENaC (poupador de K⁺, sem MR).
 *   • tolvaptana 15–60 mg/dia VO → antagonista do V2 → AQUARESE (água livre) para
 *     hiponatremia → clearance de água livre ↑ → Na⁺ sérico ↑ SEM mexer no Na⁺ corporal.
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
var ALDO_N    = 1.0;    // atividade basal da aldosterona (×normal)
var ADH_N     = 1.0;    // atividade basal do ADH/vasopressina (×normal)
var K_N       = 4.2;    // K⁺ sérico de referência (mEq/L)
var NA_N      = 140;    // Na⁺ sérico de referência (mEq/L)
var FRAC_NA_DUCTO = 0.025;  // fração do Na⁺ filtrado manejada pelo ducto (~2–3%)
var KSEC_N    = 1.0;    // secreção de K⁺ de referência (unidades relativas, basal=1)

// sensibilidades (didáticas) — quanto cada eixo move o K⁺/Na⁺ sérico
var K_PER_ALDO   = 0.9;  // mEq/L de queda de K por unidade de atividade aldo acima do basal
var K_PER_BLOCK  = 1.6;  // mEq/L de SUBIDA de K com bloqueio MR/ENaC pleno (poupador)
var NA_PER_AQUA  = 12;   // mEq/L de subida de Na sérico com aquarese plena (tolvaptana)

// dose-resposta: EC50 ilustrativos (mg) e Emax (fração 0..1 do efeito-segmento)
var SPIRO_EC50 = 50;    // espironolactona: EC50 ~50 mg (faixa 25–100 mg/dia)
var SPIRO_EMAX = 0.85;  // teto: bloqueia até ~85% do MR
var EPLE_EC50  = 50;    // eplerenona: EC50 ~50 mg (faixa 25–50 mg/dia)
var EPLE_EMAX  = 0.75;  // teto: MR-antagonista seletivo (um pouco menos potente)
var AMIL_EC50  = 5;     // amilorida: EC50 ~5 mg (faixa 5–10 mg/dia)
var AMIL_EMAX  = 0.80;  // teto: bloqueio direto do ENaC
var TOLVA_EC50 = 15;    // tolvaptana: EC50 ~15 mg (faixa 15–60 mg/dia)
var TOLVA_EMAX = 0.90;  // teto da aquarese (bloqueio do V2)

// ─── dose-resposta sigmoide/hiperbólica  efeito = Emax·D/(EC50+D) ────────────
/**
 * doseResposta(D, EC50, Emax) → efeito ∈ [0, Emax)
 *   D    = dose (mg)
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

// ─── função principal ───────────────────────────────────────────────────────
/**
 * ductoColetor(input) → estado completo do ducto coletor e da farmacologia do segmento.
 *
 * input: {
 *   aldo,        // atividade da aldosterona (×normal; default 1.0) — 0=ausente, >1=hiperaldo
 *   adh,         // atividade do ADH/vasopressina (×normal; default 1.0)
 *   espiro,      // dose de espironolactona (mg; default 0) — MR-antagonista (poupador K)
 *   eplerenona,  // dose de eplerenona (mg; default 0) — MR-antagonista seletivo
 *   amilorida,   // dose de amilorida (mg; default 0) — bloqueia ENaC (poupador K)
 *   tolvaptana,  // dose de tolvaptana (mg; default 0) — antagonista V2 (aquarese)
 *   ieca,        // true = IECA/BRA concomitante (hipocaliúrico → risco de hipercalemia); default false
 *   liddle       // true = síndrome de Liddle (ENaC constitutivamente ativo); default false
 * }
 */
function ductoColetor(input) {
  var inp = input || {};

  var aldo  = clampv(inp.aldo  !== undefined ? inp.aldo  : ALDO_N, 0, 10);
  var adh   = clampv(inp.adh   !== undefined ? inp.adh   : ADH_N, 0, 10);
  var espiro     = clampv(inp.espiro     !== undefined ? inp.espiro     : 0, 0, 400);
  var eplerenona = clampv(inp.eplerenona !== undefined ? inp.eplerenona : 0, 0, 400);
  var amilorida  = clampv(inp.amilorida  !== undefined ? inp.amilorida  : 0, 0, 80);
  var tolvaptana = clampv(inp.tolvaptana !== undefined ? inp.tolvaptana : 0, 0, 120);
  var ieca   = (inp.ieca   === true || inp.ieca   === 1 || inp.ieca   === 'sim') ? true : false;
  var liddle = (inp.liddle === true || inp.liddle === 1 || inp.liddle === 'sim') ? true : false;

  // ─── dose-resposta dos quatro fármacos (efeito ∈ [0, Emax)) ────────────────
  var eSpiro = doseResposta(espiro,     SPIRO_EC50, SPIRO_EMAX);  // bloqueio do MR (fração)
  var eEple  = doseResposta(eplerenona, EPLE_EC50,  EPLE_EMAX);   // bloqueio do MR (fração)
  var eAmil  = doseResposta(amilorida,  AMIL_EC50,  AMIL_EMAX);   // bloqueio do ENaC (fração)
  var eTolva = doseResposta(tolvaptana, TOLVA_EC50, TOLVA_EMAX);  // bloqueio do V2 (fração)

  // bloqueio MR combinado (espiro + eplerenona não somam além de 1)
  var blocoMR = 1 - (1 - eSpiro) * (1 - eEple);
  if (blocoMR < 0) blocoMR = 0; if (blocoMR > 1) blocoMR = 1;
  // bloqueio EFETIVO do ENaC = MR (reduz síntese de ENaC) combinado com amilorida (bloqueio direto)
  var blocoENaC = 1 - (1 - blocoMR) * (1 - eAmil);
  if (blocoENaC < 0) blocoENaC = 0; if (blocoENaC > 1) blocoENaC = 1;

  // ─── 1. CÉLULA PRINCIPAL: atividade efetiva do ENaC ────────────────────────
  // a aldosterona ↑ENaC; o poupador (MR-antag ou amilorida) o derruba.
  // Liddle: ENaC constitutivamente ATIVO → independe da aldosterona (e resiste à espiro).
  var enacAldo = liddle ? Math.max(aldo, 2.2) : aldo;     // drive da aldosterona sobre o ENaC
  // a amilorida bloqueia o ENaC mesmo no Liddle (bloqueio de canal); a espiro (MR) NÃO.
  var blocoENaCef = liddle ? eAmil : blocoENaC;
  if (blocoENaCef < 0) blocoENaCef = 0; if (blocoENaCef > 1) blocoENaCef = 1;
  var enacAtiv = enacAldo * (1 - blocoENaCef);            // atividade efetiva do ENaC
  if (enacAtiv < 0) enacAtiv = 0;

  // reabsorção de Na⁺ no ducto (fração do Na⁺ filtrado): basal ~2.5%, escalada pelo ENaC
  var fracNaDucto = FRAC_NA_DUCTO * clampv(enacAtiv, 0, 4);
  if (fracNaDucto > 0.06) fracNaDucto = 0.06;            // teto fisiológico (o ducto é fino)

  // voltagem luminal NEGATIVA gerada pela reabsorção de Na⁺ via ENaC (impulsiona K/H)
  var voltagemLuminal = -8 * clampv(enacAtiv, 0, 4);     // mV (mais Na reabsorvido → mais negativo)

  // ─── secreção de K⁺ e H⁺ (impulsionada pela voltagem/ENaC) ─────────────────
  // a secreção é PROPORCIONAL à atividade do ENaC (a voltagem é o motor).
  var kSecrecao = KSEC_N * clampv(enacAtiv, 0, 4);       // secreção relativa de K⁺
  var hSecrecao = KSEC_N * clampv(enacAtiv, 0, 4) * 0.8; // secreção relativa de H⁺ (célula intercalar A apoia)

  // ─── K⁺ sérico: sobe com bloqueio (poupador), desce com aldosterona/ENaC alto ─
  // basal: aldo=1 mantém K=4.2. Aldo>1 → hipocalemia; bloqueio → hipercalemia.
  var deltaKaldo  = -K_PER_ALDO * (enacAldo - 1);        // aldo alto → K cai
  var deltaKblock =  K_PER_BLOCK * blocoENaCef;          // bloqueio poupador → K sobe
  var deltaKieca  = ieca ? 0.5 : 0;                      // IECA/BRA → menos aldo → K sobe
  var kSerico = clampv(K_N + deltaKaldo + deltaKblock + deltaKieca, 1.5, 9.0);

  // ─── H⁺ / ácido-base: aldosterona ↑ → secreta H⁺ → alcalose; bloqueio → acidose ─
  // (hiperaldo → alcalose metabólica; poupador → acidose metabólica hiperkalêmica leve)
  var deltaHco3 = 2.5 * (enacAldo - 1) - 3.0 * blocoENaCef;
  var hco3Plasma = clampv(24 + deltaHco3, 14, 36);

  // ─── 3. ADH / AQUAPORINA-2: reabsorção de ÁGUA LIVRE (eixo independente) ────
  // a tolvaptana bloqueia o V2 → AQP2 não inserida → água livre escapa (aquarese).
  var adhEf = adh * (1 - eTolva);                        // atividade efetiva do ADH no V2
  if (adhEf < 0) adhEf = 0;
  // osmolalidade urinária: ADH alto → urina concentrada; bloqueio → urina diluída
  var osmUrina = clampv(80 + 720 * (adhEf / (0.4 + adhEf)), 50, 1200); // mOsm/kg (50=máx diluído, 1200=máx conc)
  var urinaConcentrada = osmUrina > 300;

  // reabsorção de água livre (relativa): proporcional ao ADH efetivo
  var aguaLivreReab = clampv(adhEf, 0, 10);              // unidades relativas (basal 1)
  // clearance de água livre: NEGATIVO quando reabsorve (ADH alto), POSITIVO com aquarese
  // basal (adhEf=1) ~ ligeiramente negativo (urina concentrada). Tolvaptana → positivo.
  var clearanceAguaLivre = 2.5 - 3.0 * (adhEf / (0.4 + adhEf)); // mL/min (didático)

  // ─── Na⁺ sérico: a AQUARESE (tolvaptana) sobe o Na SEM mexer no Na corporal ─
  // ADH alto retém água livre → dilui o Na (hiponatremia, ex.: SIADH). Tolvaptana
  // remove água livre → Na sobe. É correção pela ÁGUA, não pelo sódio.
  var diluicaoADH = -6 * (clampv(adh, 0, 10) / (0.5 + clampv(adh, 0, 10)) - (1 / 1.5)); // ADH basal(1)→0; >1 dilui
  var correcaoAquarese = NA_PER_AQUA * eTolva * (clampv(adh, 0, 10) / (0.5 + clampv(adh, 0, 10)));
  var naSerico = clampv(NA_N + diluicaoADH + correcaoAquarese, 110, 165);

  // ─── natriurese do poupador (LEVE — o ducto é fino) ────────────────────────
  // bloquear o ENaC entrega só os ~2–3% do Na⁺ do ducto → diurese leve.
  var natriurese = clampv(FRAC_NA_DUCTO * blocoENaCef * (liddle ? eAmil : 1), 0, 0.06);
  // tolvaptana também aumenta o fluxo urinário (aquarese), mas de ÁGUA, não de Na
  var fluxoUrinario = clampv(1 + 3.0 * eTolva + 10 * natriurese, 0.2, 8); // relativo (basal 1)

  // ─── regime (a leitura do módulo) ──────────────────────────────────────────
  var regime;
  if (liddle && eAmil < 0.2)                       regime = 'liddle';
  else if (liddle && eAmil >= 0.2)                 regime = 'liddle_amilorida';
  else if (eTolva > 0.25 && adh > 1.1)             regime = 'tolvaptana_aquarese';
  else if ((eSpiro > 0.25 || eEple > 0.25 || eAmil > 0.25) && ieca) regime = 'poupador_ieca_hipercalemia';
  else if (eSpiro > 0.25 || eEple > 0.25 || eAmil > 0.25) regime = 'poupador_k';
  else if (aldo > 1.5)                             regime = 'hiperaldosteronismo';
  else if (aldo < 0.4)                             regime = 'hipoaldosteronismo';
  else                                             regime = 'normal';

  // pérola quantificada: a aldosterona TROCA Na por K/H — não "só retém Na".
  // a secreção de K acompanha o ENaC/Na (é o acoplamento da troca).
  var trocaNaK = kSecrecao;

  return {
    // entradas efetivas
    aldo: aldo, adh: adh, espiro: espiro, eplerenona: eplerenona, amilorida: amilorida,
    tolvaptana: tolvaptana, ieca: ieca, liddle: liddle,
    // dose-resposta
    eSpiro: eSpiro, eEple: eEple, eAmil: eAmil, eTolva: eTolva,
    blocoMR: blocoMR, blocoENaC: blocoENaC, blocoENaCef: blocoENaCef,
    spiroEC50: SPIRO_EC50, spiroEmax: SPIRO_EMAX, epleEC50: EPLE_EC50, epleEmax: EPLE_EMAX,
    amilEC50: AMIL_EC50, amilEmax: AMIL_EMAX, tolvaEC50: TOLVA_EC50, tolvaEmax: TOLVA_EMAX,
    // célula principal
    enacAtiv: enacAtiv, fracNaDucto: fracNaDucto, voltagemLuminal: voltagemLuminal,
    kSecrecao: kSecrecao, hSecrecao: hSecrecao, trocaNaK: trocaNaK,
    // K e ácido-base
    kSerico: kSerico, hco3Plasma: hco3Plasma, deltaHco3: deltaHco3,
    // ADH / água livre
    adhEf: adhEf, osmUrina: osmUrina, urinaConcentrada: urinaConcentrada,
    aguaLivreReab: aguaLivreReab, clearanceAguaLivre: clearanceAguaLivre, naSerico: naSerico,
    // diurese
    natriurese: natriurese, fluxoUrinario: fluxoUrinario,
    // regime
    regime: regime
  };
}

// ─── layout: secreção de K⁺ vs atividade da aldosterona/ENaC ─────────────────
/**
 * kSecrecaoLayout(state, W, H)
 * Varre a atividade da aldosterona de 0 a 4×. Em cada ponto computa a secreção de K⁺
 * do estado (com o bloqueio do poupador atual). Devolve duas polilinhas (a UI só liga
 * os pontos — o motor manda no pixel): a secreção SEM bloqueio e COM o poupador atual.
 * X = atividade da aldosterona; Y = secreção de K⁺ (relativa).
 *   semBloco: [{a,x,y}]  ·  comBloco: [{a,x,y}]  ·  aCurX (linha da aldo atual) · axis.
 */
function kSecrecaoLayout(state, W, H) {
  state = state || {};
  W = clampv(W, 200, 100000);
  H = clampv(H, 120, 100000);

  var r0 = ductoColetor(state);

  var padL = 54, padR = 16, padT = 18, padB = 38;
  var baseY = H - padB;
  var aMin = 0, aMax = 4, N = 60;
  var yMax = 4.2; // teto da secreção de K (ENaC capeado em 4×)

  var pxX = (W - padL - padR) / (aMax - aMin);
  var pxY = (baseY - padT) / yMax;

  function X(a) { return padL + (clampv(a, aMin, aMax) - aMin) * pxX; }
  function Y(v) { return baseY - clampv(v, 0, yMax) * pxY; }

  var semBloco = [], comBloco = [], i, a, rs, rc;
  for (i = 0; i <= N; i++) {
    a = aMin + (aMax - aMin) * i / N;
    // sem bloqueio: só a aldosterona (poupadores zerados)
    rs = ductoColetor(merge(state, { aldo: a, espiro: 0, eplerenona: 0, amilorida: 0, liddle: false }));
    // com o poupador atual
    rc = ductoColetor(merge(state, { aldo: a }));
    semBloco.push({ a: a, v: rs.kSecrecao, x: X(a), y: Y(rs.kSecrecao) });
    comBloco.push({ a: a, v: rc.kSecrecao, x: X(a), y: Y(rc.kSecrecao) });
  }

  var aCur = clampv(r0.aldo, aMin, aMax);
  var aCurX = X(aCur);
  var kCur = r0.kSecrecao;
  var current = { a: aCur, k: kCur, x: X(aCur), y: Y(kCur) };

  return {
    W: W, H: H, padL: padL, padR: padR, padT: padT, padB: padB, baseY: baseY,
    aMin: aMin, aMax: aMax, yMax: yMax, pxX: pxX, pxY: pxY,
    axis: { x0: padL, y0: padT, xEnd: W - padR, yEnd: baseY },
    semBloco: semBloco, comBloco: comBloco, aCurX: aCurX, current: current
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
    ductoColetor: ductoColetor,
    doseResposta: doseResposta,
    kSecrecaoLayout: kSecrecaoLayout,
    doseRespostaLayout: doseRespostaLayout,
    clampv: clampv,
    merge: merge,
    CONST: {
      ALDO_N: ALDO_N, ADH_N: ADH_N, K_N: K_N, NA_N: NA_N, FRAC_NA_DUCTO: FRAC_NA_DUCTO,
      KSEC_N: KSEC_N, K_PER_ALDO: K_PER_ALDO, K_PER_BLOCK: K_PER_BLOCK, NA_PER_AQUA: NA_PER_AQUA,
      SPIRO_EC50: SPIRO_EC50, SPIRO_EMAX: SPIRO_EMAX, EPLE_EC50: EPLE_EC50, EPLE_EMAX: EPLE_EMAX,
      AMIL_EC50: AMIL_EC50, AMIL_EMAX: AMIL_EMAX, TOLVA_EC50: TOLVA_EC50, TOLVA_EMAX: TOLVA_EMAX
    }
  };
}
