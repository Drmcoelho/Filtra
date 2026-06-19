'use strict';
/*
 * FILTRA · M3 — O glomérulo: barreira de filtração, Kf, podócito, proteinúria
 * ---------------------------------------------------------------------------
 * Engine PURO, determinístico. Roda em Node e inline no HTML.
 * Regra-zero: o motor manda no pixel.
 *
 * Tese (o erro a corrigir): "proteinúria = rim falhando".
 * Verdade: a proteinúria tem MECANISMO — barreira de CARGA × barreira de TAMANHO,
 * e a origem é GLOMERULAR × TUBULAR. E o Kf = Lp·S é uma alavanca DISTINTA da
 * hemodinâmica (M1/M2): a contração mesangial derruba a filtração sem mexer na
 * pressão glomerular.
 *
 * Fórmulas-mãe:
 *   θ(r,z) = exp(-(r/c)^PEXP) · F(z)          coeficiente de sieving (peneira)
 *   c      = CK · (r0 / R0_N)                 escala do poro
 *   r0     = R0_N + (1-sb)·R0_SPAN            poro efetivo (abre com perda de tamanho)
 *   F      = ânion: 1 - cb·(1-CHGMIN) | neutra: 1 | cátion: 1 + cb·0.30
 *   Kf     = Lp · S · KF_N                    coeficiente de ultrafiltração
 *   SI     = θ_IgG / θ_alb                    índice de seletividade
 *   albumina filtrada = TFG · P_alb · θ_load
 *   reabsorção = Tmax·(1 - exp(-filtrada/KM)) megalina/cubilina (saturável)
 *   albuminúria = max(filtrada - reabsorção, 0)
 *
 * Âncoras (moléculas-sonda): inulina r=1.4 nm (neutra) ≈ 0.99 livre;
 * albumina r=3.6 nm (ânion) ≈ 0.0006 (a carga exclui); IgG r=5.5 nm (ânion) ≈ 0.
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

// merge sem mutar (varrer r para a curva sem alterar o estado do chamador)
function merge(a, b) {
  var o = {}, k;
  if (a) for (k in a) if (Object.prototype.hasOwnProperty.call(a, k)) o[k] = a[k];
  if (b) for (k in b) if (Object.prototype.hasOwnProperty.call(b, k)) o[k] = b[k];
  return o;
}

// ─── constantes fisiológicas calibradas ────────────────────────────────────
var R0_N    = 4.4;    // raio efetivo de poro normal (nm)
var R0_SPAN = 8.0;    // abertura do poro ao perder barreira de tamanho (nm)
                      // calibrado: ao perder a barreira de tamanho (sb→0) o poro abre
                      // o bastante p/ deixar passar IgG → SI sobe → não-seletiva (a pérola)
var CK      = 2.75;   // parâmetro de escala da curva de sieving (calibrado)
var PEXP    = 6.81;   // expoente da curva de sieving (calibrado — borda abrupta)
var CHGMIN  = 0.30;   // fração a que a barreira de carga intacta reduz θ de um ânion
var THETA_ALB_LOAD_MAX = 0.0025; // teto de θ_alb SÓ para a carga filtrada (ver nota)
var P_ALB_N = 40;     // albumina plasmática normal (g/L)
var GFR_N   = 125;    // TFG normal (mL/min)
var TMAX_REAB = 4.7;  // capacidade de reabsorção tubular megalina/cubilina (g/dia)
                      // calibrado p/ que a albuminúria NORMAL caia abaixo de 0.03 g/dia
                      // (o glomérulo filtra ~4 g/dia e o túbulo reabsorve quase tudo)
var KM_REAB = 1.72;   // constante de meia-saturação da reabsorção (g/dia)
var KF_N    = 7.5;    // coeficiente de ultrafiltração normal (escala M1/M2)

// raios efetivos das moléculas-sonda de referência (nm)
var R_INULINA = 1.4;  // neutra
var R_ALB     = 3.6;  // ânion
var R_IGG     = 5.5;  // ânion

// carga das sondas: -1 ânion, 0 neutra, +1 cátion
var Z_INULINA = 0;
var Z_ALB     = -1;
var Z_IGG     = -1;

// ─── coeficiente de sieving (a peneira) ─────────────────────────────────────

/**
 * theta(r, z, cb, sb) → coeficiente de sieving (0..1)
 *   r  = raio efetivo da molécula (nm)
 *   z  = carga (-1 ânion, 0 neutra, +1 cátion)
 *   cb = integridade da barreira de CARGA (0..1, 1=intacta)
 *   sb = integridade da barreira de TAMANHO (0..1, 1=intacta)
 *
 * size term: exp(-(r/c)^PEXP), c = CK·(r0/R0_N), r0 = R0_N + (1-sb)·R0_SPAN
 * charge factor: ânion → 1 - cb·(1-CHGMIN); neutra → 1; cátion → 1 + cb·0.30
 */
function theta(r, z, cb, sb) {
  var rr = clampv(r, 0, 100);
  var cbb = clampv(cb, 0, 1);
  var sbb = clampv(sb, 0, 1);
  var r0 = R0_N + (1 - sbb) * R0_SPAN;
  var c  = CK * (r0 / R0_N);
  var theta_size = Math.exp(-Math.pow(rr / c, PEXP));
  var F;
  if (z < 0)      F = 1 - cbb * (1 - CHGMIN);   // ânion: carga intacta exclui (→0.30)
  else if (z > 0) F = 1 + cbb * 0.30;            // cátion: carga atrai (→1.30)
  else            F = 1;                          // neutra
  return clampv(theta_size * F, 0, 1);
}

// ─── função principal ───────────────────────────────────────────────────────

/**
 * glomerulo(input) → estado da barreira de filtração + proteinúria por mecanismo
 *
 * input: {
 *   Lp,        // permeabilidade hidráulica relativa (default 1; 0.1..2)
 *   S,         // área de superfície relativa — contração mesangial reduz (default 1; 0.1..1.5)
 *   cb,        // integridade da barreira de CARGA (0..1; default 1)
 *   sb,        // integridade da barreira de TAMANHO (0..1; default 1)
 *   tubInjury, // lesão tubular (0..1; default 0) — reduz reabsorção + leak de baixo peso
 *   P_alb,     // albumina plasmática (g/L; default 40)
 *   GFR,       // TFG (mL/min; default 125)
 *   probe      // 'inulina' | 'albumina' | 'IgG' (default 'albumina')
 * }
 */
function glomerulo(input) {
  var inp = input || {};

  var Lp        = clampv(inp.Lp        !== undefined ? inp.Lp        : 1,    0.1, 2);
  var S         = clampv(inp.S         !== undefined ? inp.S         : 1,    0.1, 1.5);
  var cb        = clampv(inp.cb        !== undefined ? inp.cb        : 1,    0,   1);
  var sb        = clampv(inp.sb        !== undefined ? inp.sb        : 1,    0,   1);
  var tubInjury = clampv(inp.tubInjury !== undefined ? inp.tubInjury : 0,    0,   1);
  var P_alb     = clampv(inp.P_alb     !== undefined ? inp.P_alb     : P_ALB_N, 5, 70);
  var GFR       = clampv(inp.GFR       !== undefined ? inp.GFR       : GFR_N, 1, 250);
  var probe     = (inp.probe === 'inulina' || inp.probe === 'IgG') ? inp.probe : 'albumina';

  // ─── Kf = Lp·S·KF_N (alavanca distinta da hemodinâmica) ────────────────────
  var Kf = Lp * S * KF_N;
  if (!isFinite(Kf)) Kf = 0;
  var tfgRel = Kf / KF_N;   // contração mesangial derruba a filtração SEM hemodinâmica

  // ─── coeficientes de sieving das três sondas de referência ─────────────────
  var theta_inulina = theta(R_INULINA, Z_INULINA, cb, sb);
  var theta_alb     = theta(R_ALB,     Z_ALB,     cb, sb);
  var theta_igg     = theta(R_IGG,     Z_IGG,     cb, sb);

  // sonda selecionada (para o lab)
  var theta_probe;
  if (probe === 'inulina')   theta_probe = theta_inulina;
  else if (probe === 'IgG')  theta_probe = theta_igg;
  else                       theta_probe = theta_alb;

  // ─── índice de seletividade SI = θ_IgG / θ_alb ─────────────────────────────
  // baixo = seletiva (só albumina passa, IgG ainda excluído por tamanho);
  // alto  = não-seletiva (a peneira de tamanho rompeu → IgG passa também).
  var SI = theta_igg / Math.max(theta_alb, 1e-9);
  var seletividade;
  if (SI < 0.1)      seletividade = 'seletiva';
  else if (SI < 0.5) seletividade = 'intermediaria';
  else               seletividade = 'nao_seletiva';

  // ─── proteinúria de ALBUMINA (g/dia) ───────────────────────────────────────
  // carga filtrada de albumina: usa θ com teto baixo (a fração filtrada real é
  // pequena mesmo em nefrótica; o teto evita superestimar quando a barreira some)
  var theta_load = Math.min(theta_alb, THETA_ALB_LOAD_MAX);
  var GFR_Lday   = GFR * 1440 / 1000;                 // mL/min → L/dia
  var filteredAlb = GFR_Lday * P_alb * theta_load;    // g/dia (L/dia · g/L · adim)
  // reabsorção tubular saturável (megalina/cubilina), reduzida pela lesão tubular
  var Tmax = TMAX_REAB * (1 - 0.85 * tubInjury);
  var reab = Tmax * (1 - Math.exp(-filteredAlb / KM_REAB));
  if (!isFinite(reab) || reab < 0) reab = 0;
  var albuminuria = Math.max(filteredAlb - reab, 0);

  // ─── proteinúria TUBULAR de baixo peso (g/dia) ─────────────────────────────
  // β2-microglobulina etc.: normalmente filtradas e reabsorvidas; aparecem na
  // urina quando o túbulo falha (proteinúria tubular, não glomerular).
  var tubProt = tubInjury * 1.5;

  var protTotal = albuminuria + tubProt;

  // ─── bandas (eixo da albumina) ─────────────────────────────────────────────
  var banda;
  if (albuminuria < 0.03)      banda = 'normal';
  else if (albuminuria < 0.3)  banda = 'microalbuminuria';
  else if (albuminuria < 3.5)  banda = 'macroalbuminuria';
  else                         banda = 'nefrotica';

  // ─── padrão glomerular × tubular ───────────────────────────────────────────
  var padrao = (tubProt > albuminuria) ? 'tubular' : 'glomerular';

  // ─── regime (a sombra com mecânicas distintas) ─────────────────────────────
  var regime;
  if (tfgRel < 0.6)                              regime = 'mesangial_Kf_baixo';
  else if (padrao === 'tubular' && tubProt > 0.3) regime = 'proteinuria_tubular';
  else if (albuminuria >= 0.03 && seletividade === 'nao_seletiva') regime = 'proteinuria_nao_seletiva';
  else if (albuminuria >= 0.03)                  regime = 'proteinuria_seletiva';
  else                                           regime = 'normal';

  return {
    // entradas efetivas
    Lp: Lp, S: S, cb: cb, sb: sb, tubInjury: tubInjury,
    P_alb: P_alb, GFR: GFR, probe: probe,
    // peneira
    theta_inulina: theta_inulina, theta_alb: theta_alb, theta_igg: theta_igg,
    theta_probe: theta_probe,
    SI: SI, seletividade: seletividade,
    // Kf (alavanca mesangial)
    Kf: Kf, tfgRel: tfgRel,
    // proteinúria
    theta_load: theta_load, GFR_Lday: GFR_Lday,
    filteredAlb: filteredAlb, Tmax: Tmax, reab: reab,
    albuminuria: albuminuria, tubProt: tubProt, protTotal: protTotal,
    banda: banda, padrao: padrao,
    // regime
    regime: regime
  };
}

// ─── layout: curva de sieving θ × raio ──────────────────────────────────────

/**
 * sievingCurveLayout(state, W, H)
 * Varre o raio molecular r de 0.5 a 6.5 nm; em cada r computa θ(r,-1) [ânion]
 * e θ(r,0) [neutra]. Devolve:
 *   pts: [{r, thetaAnion, thetaNeutral, x, y_anion, y_neutral}]
 *   markers: [{name, r, theta, x, y}] para inulina/albumina/IgG (a sonda real)
 *   current, axis. A UI só liga os pontos — o motor manda no pixel.
 * Eixo X = raio (nm), eixo Y = θ (0..1).
 */
function sievingCurveLayout(state, W, H) {
  state = state || {};
  W = clampv(W, 200, 100000);
  H = clampv(H, 120, 100000);
  var cb = clampv(state.cb !== undefined ? state.cb : 1, 0, 1);
  var sb = clampv(state.sb !== undefined ? state.sb : 1, 0, 1);

  var padL = 52, padR = 16, padT = 18, padB = 38;
  var baseY = H - padB;
  var rMin = 0.5, rMax = 6.5, N = 50;

  var pxX = (W - padL - padR) / (rMax - rMin);
  var pxY = (baseY - padT) / 1.0;   // θ ∈ [0,1]

  var pts = [], i, rr;
  for (i = 0; i <= N; i++) {
    rr = rMin + (rMax - rMin) * i / N;
    var ta = theta(rr, -1, cb, sb);
    var tn = theta(rr,  0, cb, sb);
    pts.push({
      r: rr, thetaAnion: ta, thetaNeutral: tn,
      x: padL + (rr - rMin) * pxX,
      y_anion:   baseY - clampv(ta, 0, 1) * pxY,
      y_neutral: baseY - clampv(tn, 0, 1) * pxY
    });
  }

  // marcadores das moléculas-sonda (sobre a curva ANIÔNICA para alb/IgG; inulina é neutra)
  function mk(name, r, z) {
    var t = theta(r, z, cb, sb);
    return {
      name: name, r: r, theta: t,
      x: padL + (clampv(r, rMin, rMax) - rMin) * pxX,
      y: baseY - clampv(t, 0, 1) * pxY
    };
  }
  var markers = [
    mk('inulina',  R_INULINA, Z_INULINA),
    mk('albumina', R_ALB,     Z_ALB),
    mk('IgG',      R_IGG,      Z_IGG)
  ];

  // sonda corrente (destaque)
  var probe = (state.probe === 'inulina' || state.probe === 'IgG') ? state.probe : 'albumina';
  var curR, curZ;
  if (probe === 'inulina')  { curR = R_INULINA; curZ = Z_INULINA; }
  else if (probe === 'IgG') { curR = R_IGG;     curZ = Z_IGG; }
  else                      { curR = R_ALB;     curZ = Z_ALB; }
  var current = mk(probe, curR, curZ);

  return {
    W: W, H: H, padL: padL, padR: padR, padT: padT, padB: padB, baseY: baseY,
    rMin: rMin, rMax: rMax, pxX: pxX, pxY: pxY, cb: cb, sb: sb,
    axis: { x0: padL, y0: padT, xEnd: W - padR, yEnd: baseY },
    pts: pts, markers: markers, current: current
  };
}

// ─── layout: barras de proteinúria (filtrada → reabsorvida → excretada) ─────

/**
 * barreiraLayout(state, W, H)
 * Geometria pura para o diagrama de barras de albumina: filtrada, reabsorvida
 * e excretada (g/dia), escalonadas. Devolve as caixas que o HTML desenha.
 */
function barreiraLayout(state, W, H) {
  state = state || {};
  W = clampv(W, 200, 100000);
  H = clampv(H, 120, 100000);
  var r = glomerulo(state);

  var padL = 14, padR = 14, padT = 22, padB = 30;
  var innerW = W - padL - padR;
  var innerH = H - padT - padB;
  var baseY = padT + innerH;

  // escala: o eixo cobre a maior das três quantidades (mín. 0.5 g/dia p/ não estourar)
  var maxQ = Math.max(r.filteredAlb, r.reab, r.albuminuria + r.tubProt, 0.5);
  var pxQ = innerH / (maxQ * 1.1);

  var colW = innerW / 3 - 10;
  function box(idx, q, color, label) {
    var x = padL + idx * (innerW / 3) + 5;
    var h = clampv(q, 0, maxQ * 1.1) * pxQ;
    return {
      x: x, y: baseY - h, w: colW, h: h, q: q, color: color,
      label: { x: x + colW / 2, y: baseY + 14, text: label }
    };
  }

  return {
    W: W, H: H, padL: padL, padR: padR, padT: padT, padB: padB,
    baseY: baseY, innerH: innerH, maxQ: maxQ, pxQ: pxQ, r: r,
    filtered: box(0, r.filteredAlb, '#39c0c8', 'filtrada'),
    reab:     box(1, r.reab,        '#3a7bd5', 'reabsorvida'),
    excreted: box(2, r.albuminuria, '#e8a13a', 'albuminúria'),
    tub:      box(2, r.tubProt,     '#e0556b', 'tubular')   // empilha sobre a excretada
  };
}

// ─── exports ────────────────────────────────────────────────────────────────
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    glomerulo: glomerulo,
    theta: theta,
    sievingCurveLayout: sievingCurveLayout,
    barreiraLayout: barreiraLayout,
    clampv: clampv,
    merge: merge,
    CONST: {
      R0_N: R0_N, R0_SPAN: R0_SPAN, CK: CK, PEXP: PEXP, CHGMIN: CHGMIN,
      THETA_ALB_LOAD_MAX: THETA_ALB_LOAD_MAX, P_ALB_N: P_ALB_N, GFR_N: GFR_N,
      TMAX_REAB: TMAX_REAB, KM_REAB: KM_REAB, KF_N: KF_N,
      R_INULINA: R_INULINA, R_ALB: R_ALB, R_IGG: R_IGG
    }
  };
}
