'use strict';
/*
 * FILTRA · M10 — Água livre e o sódio: disnatremias são distúrbios de ÁGUA
 * ---------------------------------------------------------------------------
 * Engine PURO, determinístico. Roda em Node e inline no HTML.
 * Regra-zero: o motor manda no pixel.
 *
 * Tese (o erro a corrigir): "tratar o número Na".
 * Verdade: o Na⁺ é PROXY DA ÁGUA, não do sal. A disnatremia é um problema de
 * balanço de ÁGUA LIVRE — e a VELOCIDADE da correção mata. São cinco mecanismos:
 *   1. EDELMAN — o Na⁺ plasmático ≈ (Na+K trocáveis) / ÁGT (água corporal total).
 *      Mexer a ÁGUA (numerador fixo) move o Na: ganhar água livre → Na↓; perder → Na↑.
 *   2. ADH/AQUAPORINA-2 — a vasopressina governa a reabsorção de água livre no ducto
 *      coletor (insere AQP2). ADH alto → urina concentrada (retém água). ADH baixo →
 *      urina diluída (perde água). A sede é a segunda defesa.
 *   3. CLEARANCE DE ÁGUA LIVRE — C_H2O = V̇ − C_osm, onde C_osm = (U_osm·V̇)/P_osm.
 *      C_H2O > 0 → o rim EXCRETA água livre (dilui o corpo). C_H2O < 0 → o rim
 *      CONCENTRA (retém água livre, reabsorve mais do que excreta).
 *   4. SIADH × DIABETES INSÍPIDO — ADH inapropriadamente ALTO retém água →
 *      hiponatremia euvolêmica, U_osm ALTA. DI (central/nefrogênico) → não concentra →
 *      poliúria de água, hipernatremia, U_osm BAIXA. São imagens espelhadas.
 *   5. VELOCIDADE — hiponatremia CRÔNICA corrigida rápido demais → mielinólise pontina
 *      (desmielinização osmótica: o cérebro adaptou expelindo osmolitos e encolhe ao
 *      subir o Na rápido). Hipernatremia CRÔNICA corrigida rápido → EDEMA cerebral
 *      (a água entra em células carregadas de osmolitos). Limite seguro ~6–8 mEq/L/24h.
 *
 * Fórmulas-mãe:
 *   EDELMAN:        Na_prev = (Na+K trocáveis) / ÁGT
 *   ADROGUÉ–MADIAS: ΔNa por litro de infusato = (Na_inf − Na_sérico)/(ÁGT + 1)
 *   CLEARANCE H2O:  C_osm = (U_osm·V̇)/P_osm ;  C_H2O = V̇ − C_osm   (mL/h ou L/dia)
 *   ΔNa/24h previsto pela infusão: ΔNa_dia = ΔNa_porL · (taxa·24/1000)  (L/dia)
 *   tonicidade efetiva ≈ 2·Na (ureia/glicose à parte; aqui o eixo é a ÁGUA)
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
var NA_N       = 140;     // Na⁺ plasmático de referência (mEq/L)
var POSM_N     = 285;     // osmolalidade plasmática de referência (mOsm/kg)
var SEGURO_24  = 8;       // teto seguro de correção do Na (mEq/L por 24 h)
var ALVO_24    = 6;       // alvo prudente de correção (mEq/L por 24 h)
var TBW_FRAC_M = 0.6;     // fração de água corporal — homem
var TBW_FRAC_F = 0.5;     // fração de água corporal — mulher
var PESO_N     = 70;      // peso de referência (kg)

// faixas de Na (limiares clínicos)
var NA_HIPO_G  = 120;     // hiponatremia grave
var NA_HIPO    = 135;     // limite inferior do normal
var NA_HIPER   = 145;     // limite superior do normal
var NA_HIPER_G = 160;     // hipernatremia grave

// infusatos: Na⁺ (mEq/L) de cada fluido (Adrogué–Madias usa o Na do infusato)
//   NaCl 3% ~513 ; SF 0,9% ~154 ; Ringer ~130 ; SG5% ~0 (água livre);
//   meio-SF 0,45% ~77 ; água oral ~0
var INFUSATOS = {
  nacl3:   { na: 513, nome: 'NaCl 3% (hipertônico)' },
  sf:      { na: 154, nome: 'SF 0,9% (salina isotônica)' },
  ringer:  { na: 130, nome: 'Ringer lactato' },
  meiosf:  { na: 77,  nome: 'NaCl 0,45% (meio-salina)' },
  sg5:     { na: 0,   nome: 'SG 5% (água livre, isenta de Na)' },
  agua:    { na: 0,   nome: 'água livre / oral' }
};

// ─── água corporal total (ÁGT) ──────────────────────────────────────────────
/**
 * agtDe(peso, sexF) → ÁGT (litros) = peso · fração(sexo).
 */
function agtDe(peso, sexF) {
  var p = clampv(peso, 25, 250);
  var f = sexF ? TBW_FRAC_F : TBW_FRAC_M;
  return p * f;
}

// ─── EDELMAN: Na ≈ (Na+K trocáveis)/ÁGT ─────────────────────────────────────
/**
 * naEdelman(naK, agt) → Na⁺ plasmático previsto pela equação de Edelman.
 *   naK = osmoles de Na+K trocáveis (mEq) ; agt = água corporal total (L).
 */
function naEdelman(naK, agt) {
  var nk = clampv(naK, 1, 1e7);
  var w  = clampv(agt, 1, 1000);
  var na = nk / w;
  if (!isFinite(na)) na = NA_N;
  return na;
}

// ─── CLEARANCE DE ÁGUA LIVRE: C_H2O = V̇ − C_osm ────────────────────────────
/**
 * clearanceAguaLivre(uOsm, vdot, pOsm) → { cOsm, cH2O } (mesma unidade de vdot).
 *   C_osm = (U_osm·V̇)/P_osm ;  C_H2O = V̇ − C_osm.
 *   C_H2O > 0 → excreta água livre (dilui) ; < 0 → reabsorve (concentra).
 */
function clearanceAguaLivre(uOsm, vdot, pOsm) {
  var u = clampv(uOsm, 0, 1400);
  var v = clampv(vdot, 0, 1e6);
  var p = clampv(pOsm, 50, 600);
  var cOsm = (u * v) / p;
  if (!isFinite(cOsm)) cOsm = 0;
  var cH2O = v - cOsm;
  if (!isFinite(cH2O)) cH2O = 0;
  return { cOsm: cOsm, cH2O: cH2O };
}

// ─── ADROGUÉ–MADIAS: ΔNa por litro de infusato ──────────────────────────────
/**
 * deltaNaPorLitro(naInf, naSerico, agt) → variação prevista do Na sérico (mEq/L)
 * ao infundir 1 L do infusato:  ΔNa = (Na_inf − Na_sérico)/(ÁGT + 1).
 */
function deltaNaPorLitro(naInf, naSerico, agt) {
  var ni = clampv(naInf, 0, 1200);
  var ns = clampv(naSerico, 100, 200);
  var w  = clampv(agt, 1, 1000);
  var d = (ni - ns) / (w + 1);
  if (!isFinite(d)) d = 0;
  return d;
}

// ─── classificação da disnatremia ───────────────────────────────────────────
function classNa(na) {
  var n = clampv(na, 90, 200);
  if (n < NA_HIPO_G) return 'hipo_grave';
  if (n < NA_HIPO)   return 'hipo';
  if (n <= NA_HIPER) return 'normal';
  if (n < NA_HIPER_G) return 'hiper';
  return 'hiper_grave';
}

// ─── função principal ───────────────────────────────────────────────────────
/**
 * disnatremia(input) → o estado completo do balanço de água livre e do risco
 * de correção. O Na é proxy da ÁGUA: ADH e infusato movem a água, não o sal.
 *
 * input: {
 *   na,        // Na⁺ sérico atual (mEq/L; default 140)
 *   peso,      // peso corporal (kg; default 70) — define a ÁGT
 *   sexF,      // true = mulher (ÁGT menor, 0.5×peso); default false (0.6×)
 *   cronico,   // 0..1 cronicidade da disnatremia (1 = crônica, cérebro adaptado); default 1
 *   adh,       // tônus de ADH/vasopressina 0..1 (1 = máximo → urina concentrada); default 0.5
 *   uOsm,      // osmolalidade urinária (mOsm/kg; default = derivada do ADH se ausente)
 *   pOsm,      // osmolalidade plasmática (mOsm/kg; default ≈ 2·Na)
 *   vUrina,    // fluxo urinário (mL/h; default 60)
 *   infusato,  // chave do fluido infundido (default 'sf')
 *   taxa       // taxa de infusão (mL/h; default 0 = sem infusão)
 * }
 */
function disnatremia(input) {
  var inp = input || {};

  var na      = clampv(inp.na      !== undefined ? inp.na      : NA_N, 100, 190);
  var peso    = clampv(inp.peso    !== undefined ? inp.peso    : PESO_N, 25, 250);
  var sexF    = (inp.sexF === true || inp.sexF === 1 || (typeof inp.sexF==='string'&&inp.sexF.toUpperCase()==='F')) ? true : false;
  var cronico = clampv(inp.cronico !== undefined ? inp.cronico : 1, 0, 1);
  var adh     = clampv(inp.adh     !== undefined ? inp.adh     : 0.5, 0, 1);
  var vUrina  = clampv(inp.vUrina  !== undefined ? inp.vUrina  : 60, 0, 2000);
  var taxa    = clampv(inp.taxa    !== undefined ? inp.taxa    : 0, 0, 2000);

  // U_osm: se não informado, deriva do ADH (ADH alto → urina concentrada ~50..1200)
  var uOsm;
  if (inp.uOsm !== undefined && isFinite(Number(inp.uOsm))) {
    uOsm = clampv(inp.uOsm, 0, 1400);
  } else {
    uOsm = 50 + adh * 1100;   // ADH 0 → 50 (máx. diluída); ADH 1 → 1150 (máx. concentrada)
  }

  // osmolalidade plasmática: default ≈ 2·Na (a tonicidade efetiva)
  var pOsm = clampv(inp.pOsm !== undefined ? inp.pOsm : 2 * na, 150, 400);

  // água corporal total
  var agt = agtDe(peso, sexF);

  // ── EDELMAN: os osmoles trocáveis que sustentam este Na nesta ÁGT ──────────
  var naK = na * agt;                 // (Na+K trocáveis) = Na · ÁGT
  var naPrev = naEdelman(naK, agt);   // ≈ na (identidade de fechamento)

  // ── CLEARANCE DE ÁGUA LIVRE ───────────────────────────────────────────────
  var ca = clearanceAguaLivre(uOsm, vUrina, pOsm);
  var cOsm = ca.cOsm, cH2O = ca.cH2O;   // mL/h
  var concentra = cH2O < 0;             // o rim reabsorve água livre (concentra)?

  // ── ADROGUÉ–MADIAS: efeito do infusato ────────────────────────────────────
  var infKey = (inp.infusato&&Object.prototype.hasOwnProperty.call(INFUSATOS,inp.infusato)) ? inp.infusato : 'sf';
  var inf = INFUSATOS[infKey];
  var naInf = inf.na;
  var dNaPorL = deltaNaPorLitro(naInf, na, agt);    // mEq/L por litro infundido

  // volume infundido em 24 h (L) a esta taxa
  var volDia = taxa * 24 / 1000;                    // mL/h → L/dia
  var dNa24 = dNaPorL * volDia;                     // ΔNa previsto em 24 h pela infusão
  if (!isFinite(dNa24)) dNa24 = 0;

  // ── classificação e direção ───────────────────────────────────────────────
  var classe = classNa(na);
  var hipo  = na < NA_HIPO;
  var hiper = na > NA_HIPER;

  // ── RISCO da VELOCIDADE de correção ───────────────────────────────────────
  // a magnitude da correção em 24 h (valor absoluto do ΔNa em direção ao normal)
  var corr24 = Math.abs(dNa24);
  // excesso sobre o teto seguro (>0 = corrigindo rápido demais)
  var excesso = corr24 - SEGURO_24;

  // risco de mielinólise: hiponatremia CRÔNICA corrigida para CIMA rápido demais
  var subindo = dNa24 > 0;             // o Na está subindo com a infusão?
  var descendo = dNa24 < 0;
  var riscoMielinolise = 0;
  if (hipo && cronico > 0.5 && subindo && corr24 > ALVO_24) {
    riscoMielinolise = clampv((corr24 - ALVO_24) / (SEGURO_24 - ALVO_24 + 6) + cronico * 0.3, 0, 1);
  }
  // risco de edema cerebral: hipernatremia CRÔNICA corrigida para BAIXO rápido demais
  var riscoEdema = 0;
  if (hiper && cronico > 0.5 && descendo && corr24 > ALVO_24) {
    riscoEdema = clampv((corr24 - ALVO_24) / (SEGURO_24 - ALVO_24 + 6) + cronico * 0.3, 0, 1);
  }
  // hiponatremia AGUDA (cérebro NÃO adaptado): aqui o perigo é o oposto — edema agudo
  // por água; corrigir é seguro/urgente. Marcamos para o veredito.
  var agudaHipoEdema = hipo && cronico < 0.5;
  // hiponatremia aguda → edema cerebral por entrada de água (o cérebro incha)
  var riscoEdemaAgudo = agudaHipoEdema ? clampv((NA_HIPO - na) / 30 + (1 - cronico) * 0.4, 0, 1) : 0;

  // seguro? a correção fica dentro do corredor (≤ teto)
  var dentroCorredor = corr24 <= SEGURO_24 + 1e-9;

  // ── regime (a leitura do módulo) ──────────────────────────────────────────
  var regime;
  if (riscoMielinolise > 0.5)                regime = 'mielinolise';        // crônica + rápido p/ cima
  else if (riscoEdema > 0.5)                 regime = 'edema_correcao';     // hiper crônica + rápido p/ baixo
  else if (hipo && uOsm > 100 && adh > 0.5)  regime = 'siadh';              // ADH↑ inapropriado, U_osm alta
  else if (hiper && uOsm < 300 && adh < 0.4) regime = 'diabetes_insipido';  // não concentra, U_osm baixa
  else if (hipo)                             regime = 'hiponatremia';
  else if (hiper)                            regime = 'hipernatremia';
  else                                       regime = 'normal';

  return {
    // entradas efetivas
    na: na, peso: peso, sexF: sexF, cronico: cronico, adh: adh,
    uOsm: uOsm, pOsm: pOsm, vUrina: vUrina, taxa: taxa, infusato: infKey, naInf: naInf,
    // ÁGT e Edelman
    agt: agt, naK: naK, naPrev: naPrev,
    // clearance de água livre
    cOsm: cOsm, cH2O: cH2O, concentra: concentra,
    // Adrogué–Madias
    dNaPorL: dNaPorL, volDia: volDia, dNa24: dNa24,
    // correção e risco
    corr24: corr24, excesso: excesso, dentroCorredor: dentroCorredor,
    riscoMielinolise: riscoMielinolise, riscoEdema: riscoEdema, riscoEdemaAgudo: riscoEdemaAgudo,
    subindo: subindo, descendo: descendo,
    // classificação
    classe: classe, hipo: hipo, hiper: hiper, regime: regime,
    // tetos
    alvo24: ALVO_24, seguro24: SEGURO_24
  };
}

// ─── layout: a TRAJETÓRIA de correção do Na no tempo (com o corredor seguro) ─
/**
 * correcaoLayout(state, W, H)
 * Projeta a trajetória do Na ao longo de 24 h dado o ΔNa/24h previsto pela infusão,
 * e desenha o CORREDOR SEGURO (±SEGURO_24 a partir do Na inicial em direção ao normal),
 * com a zona de perigo sombreada. A UI só liga os pontos — o motor manda no pixel.
 *   pts: [{h, na, x, y}]              a trajetória prevista do Na
 *   corridorTopY / corridorBotY      as bordas do corredor seguro (≤8 mEq/24h)
 *   axis. X = horas (0..24), Y = Na (mEq/L).
 */
function correcaoLayout(state, W, H) {
  state = state || {};
  W = clampv(W, 200, 100000);
  H = clampv(H, 120, 100000);

  var r = disnatremia(state);
  var na0 = r.na;
  var dNa24 = r.dNa24;

  var padL = 50, padR = 16, padT = 18, padB = 36;
  var baseY = H - padB;
  var hMin = 0, hMax = 24, N = 48;

  // eixo Y: centra na faixa do Na inicial ± uma janela que cubra o corredor e a trajetória
  var span = Math.max(Math.abs(dNa24), SEGURO_24) + 6;
  var naMin = na0 - span;
  var naMax = na0 + span;

  var pxX = (W - padL - padR) / (hMax - hMin);
  var pxY = (baseY - padT) / (naMax - naMin);

  function X(h) { return padL + (clampv(h, hMin, hMax) - hMin) * pxX; }
  function Y(na) { return baseY - (clampv(na, naMin, naMax) - naMin) * pxY; }

  var pts = [], i, h, na;
  for (i = 0; i <= N; i++) {
    h = hMin + (hMax - hMin) * i / N;
    na = na0 + dNa24 * (h / 24);
    pts.push({ h: h, na: na, x: X(h), y: Y(na) });
  }

  // corredor seguro: ±SEGURO_24 sobre 24 h a partir de na0 (na direção do dNa)
  var naSafeUp = na0 + SEGURO_24;     // teto se subindo
  var naSafeDn = na0 - SEGURO_24;     // piso se descendo
  var corridorTopY = Y(naSafeUp);
  var corridorBotY = Y(naSafeDn);
  var na0Y = Y(na0);

  return {
    W: W, H: H, padL: padL, padR: padR, padT: padT, padB: padB, baseY: baseY,
    hMin: hMin, hMax: hMax, naMin: naMin, naMax: naMax, pxX: pxX, pxY: pxY,
    na0: na0, dNa24: dNa24, na0Y: na0Y,
    corridorTopY: corridorTopY, corridorBotY: corridorBotY,
    naSafeUp: naSafeUp, naSafeDn: naSafeDn,
    axis: { x0: padL, y0: padT, xEnd: W - padR, yEnd: baseY },
    pts: pts
  };
}

// ─── layout: o clearance de ÁGUA LIVRE × tônus de ADH ───────────────────────
/**
 * aguaLivreLayout(state, W, H)
 * Varre o tônus de ADH de 0 a 1; em cada ponto computa o clearance de água livre
 * (com o U_osm derivado do ADH e o V̇/P_osm do estado). Mostra C_H2O cruzando o
 * zero: ADH baixo → C_H2O > 0 (excreta água, dilui) ; ADH alto → C_H2O < 0 (concentra).
 *   pts: [{adh, cH2O, x, y}]   ·   zeroY (linha C_H2O = 0)   ·   axis.
 */
function aguaLivreLayout(state, W, H) {
  state = state || {};
  W = clampv(W, 200, 100000);
  H = clampv(H, 120, 100000);

  var padL = 52, padR = 16, padT = 18, padB = 36;
  var baseY = H - padB;
  var aMin = 0, aMax = 1, N = 50;

  var vUrina = clampv(state.vUrina !== undefined ? state.vUrina : 60, 0, 2000);
  var na = clampv(state.na !== undefined ? state.na : NA_N, 100, 190);
  var pOsm = clampv(state.pOsm !== undefined ? state.pOsm : 2 * na, 150, 400);

  // varre o ADH → U_osm → C_H2O
  function ch2oOf(a) {
    var uOsm = 50 + clampv(a, 0, 1) * 1100;
    var ca = clearanceAguaLivre(uOsm, vUrina, pOsm);
    return ca.cH2O;
  }

  // eixo Y simétrico em torno de 0, cobrindo o intervalo de C_H2O na varredura
  var maxAbs = Math.max(Math.abs(ch2oOf(0)), Math.abs(ch2oOf(1)), 10);
  var yMin = -maxAbs, yMax = maxAbs;

  var pxX = (W - padL - padR) / (aMax - aMin);
  var pxY = (baseY - padT) / (yMax - yMin);

  function X(a) { return padL + (clampv(a, aMin, aMax) - aMin) * pxX; }
  function Y(c) { return baseY - (clampv(c, yMin, yMax) - yMin) * pxY; }

  var pts = [], i, a, c;
  for (i = 0; i <= N; i++) {
    a = aMin + (aMax - aMin) * i / N;
    c = ch2oOf(a);
    pts.push({ adh: a, cH2O: c, x: X(a), y: Y(c) });
  }

  var zeroY = Y(0);
  var aCur = clampv(state.adh !== undefined ? state.adh : 0.5, 0, 1);
  var current = { adh: aCur, cH2O: ch2oOf(aCur), x: X(aCur), y: Y(ch2oOf(aCur)) };

  return {
    W: W, H: H, padL: padL, padR: padR, padT: padT, padB: padB, baseY: baseY,
    aMin: aMin, aMax: aMax, yMin: yMin, yMax: yMax, pxX: pxX, pxY: pxY,
    zeroY: zeroY,
    axis: { x0: padL, y0: padT, xEnd: W - padR, yEnd: baseY },
    pts: pts, current: current
  };
}

// ─── exports ────────────────────────────────────────────────────────────────
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    disnatremia: disnatremia,
    agtDe: agtDe,
    naEdelman: naEdelman,
    clearanceAguaLivre: clearanceAguaLivre,
    deltaNaPorLitro: deltaNaPorLitro,
    classNa: classNa,
    correcaoLayout: correcaoLayout,
    aguaLivreLayout: aguaLivreLayout,
    clampv: clampv,
    merge: merge,
    INFUSATOS: INFUSATOS,
    CONST: {
      NA_N: NA_N, POSM_N: POSM_N, SEGURO_24: SEGURO_24, ALVO_24: ALVO_24,
      TBW_FRAC_M: TBW_FRAC_M, TBW_FRAC_F: TBW_FRAC_F, PESO_N: PESO_N,
      NA_HIPO_G: NA_HIPO_G, NA_HIPO: NA_HIPO, NA_HIPER: NA_HIPER, NA_HIPER_G: NA_HIPER_G
    }
  };
}
