/* =========================================================================
 * FILTRA · M26 — Cinética da ureia: compartimento único × duplo, rebote pós-diálise
 * ENGINE PURO. Espelhado inline no filtra26.html.
 *
 * Teses:
 *  - COMPARTIMENTO ÚNICO (revisão M22): C(t) = C0·exp(−K·t/V). É a "leitura ingênua":
 *    trata todo o corpo como um único tanque bem-misturado. Subestima o nadir quando a
 *    remoção é rápida, porque ignora que o sangue (extracelular) esvazia antes do resto.
 *  - DOIS COMPARTIMENTOS: a ureia mora no INTRACELULAR (lento, grande) + EXTRACELULAR
 *    (rápido, é o que o sangue vê). A diálise tira do extracelular mais rápido do que o
 *    intracelular consegue repor (transferência intercompartimental Kc finita) → no FIM
 *    da sessão o sangue está "artificialmente baixo" (Cfim).
 *  - REBOTE pós-diálise: 30–60 min após o fim, a ureia reequilibra dos tecidos → o sangue
 *    SOBE até o platô de equilíbrio Ceq. Rebote% = (Ceq − Cfim)/Cfim · 100 (~10–20%).
 *    Logo o Kt/V EQUILIBRADO (eKt/V) < Kt/V de POOL ÚNICO (spKt/V).
 *  - DAUGIRDAS (rate equation): eKt/V = spKt/V − 0,6·(spKt/V/t) + 0,03 (t em HORAS, acesso venoso).
 *  - O TEMPO IMPORTA: remoção rápida (alta eficiência K, tempo t curto) → maior gradiente
 *    intercompartimental → maior rebote → eKt/V cai MAIS abaixo do spKt/V. Sessão mais
 *    longa/gentil → menos rebote, eKt/V ≈ spKt/V.
 *
 * Pérola: o Kt/V medido LOGO APÓS a diálise MENTE (sangue artificialmente baixo); o eKt/V
 *         (pós-rebote) é a dose REAL. Quanto mais rápida a sessão, MAIOR a mentira.
 *
 * Unidades: K (clearance) mL/min · V (volume de distribuição da ureia ≈ ÁGT) L · t horas ·
 *           Kt/V adimensional · C concentração relativa (fração de C0). Sem doses de massa (mg).
 * ========================================================================= */

function clampv(v, a, b) { var n = Number(v); if (!isFinite(n)) n = a; if (n < a) n = a; if (n > b) n = b; return n; }

// merge não-mutante: defaults + overrides válidos
function merge(def, inp) {
  var o = {}, k; for (k in def) o[k] = def[k];
  if (inp) for (k in def) if (inp[k] !== undefined) o[k] = inp[k];
  return o;
}

var DEFAULTS = {
  C0: 1.0,        // ureia inicial (fração relativa; 1.0 = 100% do basal pré-diálise)
  K: 210,         // clearance efetivo do dialisador (mL/min)
  V: 35,          // volume de distribuição da ureia (L ≈ ÁGT, ~50% do peso)
  t: 4.0,         // tempo de sessão (horas)
  fEC: 1 / 3,     // fração do volume que é EXTRACELULAR (o sangue vê este)
  Kc: 800         // transferência intercompartimental (mL/min) — quão rápido o IC repõe o EC
};

// spKt/V de pool único — a "dose" geométrica do dialisador na sessão
function spKtV(K, V, t) {
  K = clampv(K, 1, 1000); V = clampv(V, 5, 80); t = clampv(t, 0.1, 12);
  return (K / 1000 * 60 * t) / V;  // (mL/min→L/min ·60min/h ·t h) / V
}

// URR (redução de ureia) por pool único: 1 − exp(−Kt/V)
function urrFrom(ktv) { ktv = clampv(ktv, 0, 12); return 1 - Math.exp(-ktv); }

// eKt/V de Daugirdas (rate equation, acesso venoso): corrige o spKt/V pelo rebote
function eKtVdaugirdas(sp, t) {
  sp = clampv(sp, 0, 12); t = clampv(t, 0.1, 12);
  var e = sp - 0.6 * (sp / t) + 0.03;
  return clampv(e, 0, 12);
}

// concentração de pool ÚNICO ao fim da sessão (a leitura ingênua)
function cSingle(C0, ktv) { C0 = clampv(C0, 0, 5); ktv = clampv(ktv, 0, 12); return C0 * Math.exp(-ktv); }

/* -------------------------------------------------------------------------
 * Solução BI-EXPONENCIAL do modelo de dois compartimentos.
 * Durante a sessão: o EC perde para o dialisador (K) e troca com o IC (Kc).
 *   dCe/dt = −(K/Vec)·Ce − (Kc/Vec)·(Ce − Ci)
 *   dCi/dt = +(Kc/Vic)·(Ce − Ci)
 * Resolvemos por integração numérica amortecida (passo pequeno, estável).
 * O SANGUE vê Ce. Ao fim: Cfim = Ce(t). Depois, OFF-dialysis (K=0), Ce e Ci
 * reequilibram → o platô comum Ceq = (Vec·Ce + Vic·Ci)/V (conservação de massa).
 * O rebote é Ceq − Cfim.
 * ------------------------------------------------------------------------- */
function twoComp(C0, K, V, t, fEC, Kc) {
  C0 = clampv(C0, 0, 5); K = clampv(K, 1, 1000); V = clampv(V, 5, 80);
  t = clampv(t, 0.1, 12); fEC = clampv(fEC, 0.1, 0.6); Kc = clampv(Kc, 10, 4000);
  var Vec = V * fEC, Vic = V * (1 - fEC);           // litros
  // converte mL/min → L/h: ·60/1000 = ·0.06
  var kK = K * 0.06, kC = Kc * 0.06;                // L/h
  var Ce = C0, Ci = C0;                             // ambos partem do basal
  var steps = 2400, dt = t / steps, i;              // passo fino, integração estável
  for (i = 0; i < steps; i++) {
    var fluxDial = kK * Ce / Vec;                   // perda p/ o dialisador (do EC)
    var fluxInter = kC * (Ce - Ci);                 // troca EC→IC (positiva se EC>IC)
    var dCe = (-fluxDial - fluxInter / Vec) * dt;
    var dCi = (fluxInter / Vic) * dt;
    Ce = Ce + dCe; Ci = Ci + dCi;
    if (Ce < 0) Ce = 0; if (Ci < 0) Ci = 0;
  }
  var Cfim = Ce;                                    // o que o sangue mostra AO FIM
  var Ceq = (Vec * Ce + Vic * Ci) / V;             // platô comum pós-reequilíbrio (massa conservada)
  if (Ceq < Cfim) Ceq = Cfim;                       // o rebote SOBE (nunca desce)
  var rebotePct = Cfim > 1e-9 ? (Ceq - Cfim) / Cfim * 100 : 0;
  return { Cfim: Cfim, Ceq: Ceq, Ci: Ci, Ce: Ce, Vec: Vec, Vic: Vic, rebotePct: rebotePct };
}

// função-mãe: o estado completo da cinética da ureia da sessão
function ureaKinetics(input) {
  var s = merge(DEFAULTS, input);
  var C0 = clampv(s.C0, 0, 5), K = clampv(s.K, 1, 1000), V = clampv(s.V, 5, 80);
  var t = clampv(s.t, 0.1, 12), fEC = clampv(s.fEC, 0.1, 0.6), Kc = clampv(s.Kc, 10, 4000);

  var sp = spKtV(K, V, t);                          // dose de pool único
  var urrSp = urrFrom(sp);                          // URR ingênua
  var cFimSingle = cSingle(C0, sp);                 // C ao fim pelo modelo ingênuo

  var two = twoComp(C0, K, V, t, fEC, Kc);
  var Cfim = two.Cfim, Ceq = two.Ceq, rebotePct = two.rebotePct;

  // spKt/V "MEDIDO" a partir do sangue do FIM (a leitura logo após a diálise → MENTE)
  var spMedido = C0 > 1e-9 && Cfim > 1e-9 ? -Math.log(Cfim / C0) : sp;
  spMedido = clampv(spMedido, 0, 12);
  // eKt/V "MEDIDO" a partir do sangue de EQUILÍBRIO (pós-rebote → a dose REAL)
  var eMedido = C0 > 1e-9 && Ceq > 1e-9 ? -Math.log(Ceq / C0) : sp;
  eMedido = clampv(eMedido, 0, 12);

  // eKt/V por Daugirdas (a fórmula clínica, sem precisar de coleta tardia).
  // INVARIANTE FÍSICO: o rebote só PODE baixar a dose efetiva → eKt/V ≤ spKt/V sempre.
  // (em sp muito baixo o termo constante +0,03 da fórmula poderia ultrapassá-lo; travamos.)
  var eKtV = Math.min(eKtVdaugirdas(spMedido, t), spMedido);
  var urrEq = urrFrom(eKtV);

  // a "mentira": quanto o spKt/V do fim superestima a dose real
  var mentira = spMedido - eKtV;                    // >0: o fim parece melhor que a verdade
  var quedaPct = spMedido > 1e-9 ? mentira / spMedido * 100 : 0;

  // flags de mecanismo
  var rapida = t < 3.0;                             // sessão de alta eficiência / tempo curto
  var reboteGrande = rebotePct > 12;               // rebote clinicamente relevante
  var subdialise = eKtV < 1.2;                     // alvo eKt/V mínimo ~1.2 (≈ spKt/V 1.4)
  var mascarada = spMedido >= 1.2 && eKtV < 1.2;   // "adequado no papel" mas inadequado de verdade

  return {
    C0: C0, K: K, V: V, t: t, fEC: fEC, Kc: Kc,
    Vec: two.Vec, Vic: two.Vic,
    spKtV: sp, spMedido: spMedido, eKtV: eKtV, eMedido: eMedido,
    urrSp: urrSp, urrEq: urrEq,
    cFimSingle: cFimSingle, Cfim: Cfim, Ceq: Ceq, Ci: two.Ci,
    rebotePct: rebotePct, mentira: mentira, quedaPct: quedaPct,
    rapida: rapida, reboteGrande: reboteGrande, subdialise: subdialise, mascarada: mascarada
  };
}

/* -------------------------------------------------------------------------
 * GEOMETRIA PURA da curva ureia × tempo (a UI só pinta).
 * Mostra: (1) a queda intra-sessão do SANGUE (Ce do modelo de 2 comp.), de 0 a t;
 *         (2) o REBOTE pós-fim (de t até t+0.75 h), Ce subindo de Cfim a Ceq;
 *         (3) a linha do pool único (ingênua) sobreposta, para comparar.
 * Tudo em fração de C0 (eixo Y 0..1.05).
 * ------------------------------------------------------------------------- */
function ureaCurveLayout(state, W, H) {
  state = state || {};
  W = clampv(W, 200, 100000); H = clampv(H, 120, 100000);
  var padL = 52, padR = 16, padT = 18, padB = 38, baseY = H - padB;
  var C0 = clampv(state.C0 !== undefined ? state.C0 : 1, 0, 5);
  var K = clampv(state.K !== undefined ? state.K : 210, 1, 1000);
  var V = clampv(state.V !== undefined ? state.V : 35, 5, 80);
  var t = clampv(state.t !== undefined ? state.t : 4, 0.1, 12);
  var fEC = clampv(state.fEC !== undefined ? state.fEC : 1 / 3, 0.1, 0.6);
  var Kc = clampv(state.Kc !== undefined ? state.Kc : 800, 10, 4000);

  var reboteDur = 0.75;                             // janela de rebote pintada (h)
  var tMax = t + reboteDur;
  var yMax = Math.max(C0 * 1.05, 0.2);
  var pxX = (W - padL - padR) / tMax, pxY = (baseY - padT) / yMax;
  function X(tt) { return padL + tt * pxX; }
  function Y(cc) { return baseY - clampv(cc, 0, yMax) * pxY; }

  // (1) curva do SANGUE (2 comp.) intra-sessão — integra e amostra Ce
  var Vec = V * fEC, Vic = V * (1 - fEC);
  var kK = K * 0.06, kC = Kc * 0.06;
  var N = 60, i, Ce = C0, Ci = C0, dt = t / (N * 4);
  var bloodPts = [{ tt: 0, c: C0, x: X(0), y: Y(C0) }];
  var sampleEvery = 4, count = 0;
  // integra com 4× resolução, grava 1 a cada 4
  for (i = 0; i < N * 4; i++) {
    var fluxDial = kK * Ce / Vec, fluxInter = kC * (Ce - Ci);
    Ce = Ce + (-fluxDial - fluxInter / Vec) * dt;
    Ci = Ci + (fluxInter / Vic) * dt;
    if (Ce < 0) Ce = 0; if (Ci < 0) Ci = 0;
    count++;
    if (count % sampleEvery === 0) {
      var tt = (i + 1) * dt;
      bloodPts.push({ tt: tt, c: Ce, x: X(tt), y: Y(Ce) });
    }
  }
  var Cfim = Ce;
  var Ceq = (Vec * Ce + Vic * Ci) / V; if (Ceq < Cfim) Ceq = Cfim;

  // (2) rebote pós-fim: Ce sobe de Cfim a Ceq com constante de tempo do reequilíbrio
  var reboteTau = Vec / Math.max(kC, 1e-6) * (1 + Vec / Vic); // h (aprox)
  var reboteTau2 = clampv(reboteTau, 0.05, 0.6);
  var M = 24, reboutePts = [{ tt: t, c: Cfim, x: X(t), y: Y(Cfim) }];
  for (i = 1; i <= M; i++) {
    var tr = i / M * reboteDur;
    var c = Ceq - (Ceq - Cfim) * Math.exp(-tr / reboteTau2);
    reboutePts.push({ tt: t + tr, c: c, x: X(t + tr), y: Y(c) });
  }

  // (3) linha do POOL ÚNICO (ingênua) — exponencial pura ao longo da sessão
  var sp = spKtV(K, V, t), singlePts = [];
  for (i = 0; i <= N; i++) {
    var ts = i / N * t, cs = C0 * Math.exp(-sp * ts / t);
    singlePts.push({ tt: ts, c: cs, x: X(ts), y: Y(cs) });
  }

  return {
    W: W, H: H, padL: padL, padR: padR, padT: padT, padB: padB, baseY: baseY,
    tMax: tMax, yMax: yMax, pxX: pxX, pxY: pxY, C0: C0, t: t,
    axis: { x0: padL, y0: padT, xEnd: W - padR, yEnd: baseY },
    bloodPts: bloodPts, reboutePts: reboutePts, singlePts: singlePts,
    Cfim: Cfim, Ceq: Ceq,
    fimMark: { x: X(t), y: Y(Cfim), c: Cfim },
    eqMark: { x: X(tMax), y: Y(Ceq), c: Ceq }
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    clampv: clampv, merge: merge, DEFAULTS: DEFAULTS,
    spKtV: spKtV, urrFrom: urrFrom, eKtVdaugirdas: eKtVdaugirdas, cSingle: cSingle,
    twoComp: twoComp, ureaKinetics: ureaKinetics, ureaCurveLayout: ureaCurveLayout
  };
}
