/* =========================================================================
 * FILTRA · M22 — A sessão de HDI: gradientes, eficiência × tempo
 * ENGINE PURO. Espelhado inline no filtra22.html.
 *
 * Teses:
 *  - Difusão por GRADIENTE: o clearance remove soluto ∝ gradiente sangue-dialisato;
 *    conforme o soluto cai, o gradiente cai → a remoção DESACELERA (exponencial intra-sessão).
 *  - Cinética da ureia (compartimento ÚNICO): C(t) = C0·exp(−K·t/V).
 *    Kt/V é o expoente adimensional (a DOSE — aprofundada no M25). URR = 1 − Ct/C0 = 1 − exp(−Kt/V).
 *  - Eficiência × TEMPO (o custo do intermitente): a MESMA Kt/V vem de muito clearance em pouco
 *    tempo (alta eficiência, grandes oscilações) OU menos clearance em mais tempo (gentil).
 *    O rim é CONTÍNUO; a HDI 3×/sem faz a concentração oscilar em DENTE DE SERRA. A concentração
 *    MÉDIA-NO-TEMPO é a verdadeira exposição urêmica, não só o valor pós.
 *  - Rebote pós-diálise: o soluto reequilibra dos tecidos → a ureia sobe um pouco após o fim (gancho M26).
 *
 * Unidades: C em mg/dL (BUN); K (clearance) em mL/min; V (ÁGT) em L; t (duração) em h.
 * Kt/V = (K[mL/min] · t[h] · 60) / (V[L] · 1000)  — adimensional.
 * ========================================================================= */

function clampv(v, a, b) { var n = Number(v); if (!isFinite(n)) n = a; if (n < a) n = a; if (n > b) n = b; return n; }

function merge(def, inp) {
  var o = {}, k; for (k in def) o[k] = def[k];
  if (inp) for (k in def) if (inp[k] !== undefined) o[k] = inp[k];
  return o;
}

var DEFAULTS = {
  c0: 80,           // BUN pré-diálise (mg/dL)
  K: 210,           // clearance efetivo de ureia do dialisador (mL/min)
  V: 42,            // volume de distribuição da ureia ≈ ÁGT (L)
  t: 4,             // duração da sessão (h)
  reboteFrac: 0.12  // fração de rebote pós-diálise (reequilíbrio dos tecidos)
};

// Kt/V adimensional a partir de K(mL/min), t(h), V(L)
function ktOverV(K, t, V) {
  K = clampv(K, 0, 600); t = clampv(t, 0, 12); V = clampv(V, 5, 90);
  var kv = (K * t * 60) / (V * 1000);
  return clampv(kv, 0, 12);
}

// concentração intra-sessão no tempo th (horas), modelo de compartimento único
function concAt(c0, K, V, th) {
  c0 = clampv(c0, 1, 400); K = clampv(K, 0, 600); V = clampv(V, 5, 90); th = clampv(th, 0, 12);
  var kv = (K * th * 60) / (V * 1000);
  return clampv(c0 * Math.exp(-kv), 0, 400);
}

// função-mãe: estado da sessão de HDI
function hdi(input) {
  var inp = merge(DEFAULTS, input || {});
  var c0 = clampv(inp.c0, 1, 400);
  var K = clampv(inp.K, 0, 600);
  var V = clampv(inp.V, 5, 90);
  var t = clampv(inp.t, 0, 12);
  var reboteFrac = clampv(inp.reboteFrac, 0, 0.5);

  var KtV = ktOverV(K, t, V);
  var ct = clampv(c0 * Math.exp(-KtV), 0, 400);           // concentração pós-sessão
  var urr = clampv(1 - ct / c0, 0, 1);                    // = 1 − exp(−Kt/V)
  var urrPct = urr * 100;

  // remoção e a sua DESACELERAÇÃO (gradiente que decai)
  var removido = c0 - ct;                                  // queda total de concentração (mg/dL)
  // taxa instantânea no início vs no fim (∝ concentração corrente): dC/dt = −(K·60/(V·1000))·C
  var rateConst = (K * 60) / (V * 1000);                   // por hora
  var taxaInicial = rateConst * c0;                        // mg/dL por hora no início
  var taxaFinal = rateConst * ct;                          // mg/dL por hora no fim
  var desaceleracao = taxaInicial > 0 ? (taxaInicial - taxaFinal) / taxaInicial : 0; // fração

  // concentração MÉDIA-NO-TEMPO durante a sessão: ∫C dt / t = (C0−Ct)/(Kt/V)
  var cMean = KtV > 1e-9 ? removido / KtV : c0;
  cMean = clampv(cMean, 0, 400);

  // rebote pós-diálise: reequilíbrio dos tecidos sobe a ureia
  var ctEq = clampv(ct * (1 + reboteFrac), 0, 400);        // BUN equilibrado pós
  var urrEq = clampv(1 - ctEq / c0, 0, 1);                 // URR "real" (equilibrada), menor

  // eficiência: clearance por litro de V (quão "rápido" é o tratamento)
  var eficiencia = K / V;                                  // mL/min por L
  var altaEficiencia = eficiencia > 8;                     // muito clearance p/ o volume → oscila mais

  // flags clínicas (por mecanismo)
  var subdialise = KtV < 1.2;                              // dose abaixo do alvo
  var doseAdequada = KtV >= 1.2;
  var oscilacaoGrande = urrPct > 70;                       // grande balanço pré/pós (custo do intermitente)

  return {
    c0: c0, K: K, V: V, t: t, reboteFrac: reboteFrac,
    KtV: KtV, ct: ct, urr: urr, urrPct: urrPct,
    removido: removido, rateConst: rateConst, taxaInicial: taxaInicial, taxaFinal: taxaFinal,
    desaceleracao: desaceleracao, cMean: cMean,
    ctEq: ctEq, urrEq: urrEq, eficiencia: eficiencia, altaEficiencia: altaEficiencia,
    subdialise: subdialise, doseAdequada: doseAdequada, oscilacaoGrande: oscilacaoGrande
  };
}

// para um Kt/V-alvo fixo, o clearance K necessário dado o tempo t (eficiência × tempo)
function clearanceParaAlvo(KtVtarget, t, V) {
  KtVtarget = clampv(KtVtarget, 0.1, 4); t = clampv(t, 0.25, 12); V = clampv(V, 5, 90);
  var K = (KtVtarget * V * 1000) / (t * 60);
  return clampv(K, 0, 1200);
}

// geometria PURA da curva de concentração da ureia no tempo (a UI só pinta)
function ureaCurveLayout(state, W, H) {
  state = merge(DEFAULTS, state || {});
  W = clampv(W, 200, 100000); H = clampv(H, 120, 100000);
  var padL = 52, padR = 16, padT = 18, padB = 38, baseY = H - padB;
  var c0 = clampv(state.c0, 1, 400);
  var K = clampv(state.K, 0, 600);
  var V = clampv(state.V, 5, 90);
  var t = clampv(state.t, 0, 12);
  var tMax = 5, N = 60;                 // eixo do tempo (h)
  var yMax = Math.max(100, Math.ceil(c0 / 20) * 20); // mg/dL no eixo
  var pxX = (W - padL - padR) / tMax, pxY = (baseY - padT) / yMax;
  var pts = [], i, th, c;
  for (i = 0; i <= N; i++) {
    th = tMax * i / N;
    c = concAt(c0, K, V, th);
    pts.push({ t: th, c: c, x: padL + th * pxX, y: baseY - clampv(c, 0, yMax) * pxY });
  }
  // ponto de operação = fim da sessão (t)
  var tc = clampv(t, 0, tMax);
  var cc = concAt(c0, K, V, tc);
  return {
    W: W, H: H, padL: padL, padR: padR, padT: padT, padB: padB, baseY: baseY,
    tMax: tMax, yMax: yMax, pxX: pxX, pxY: pxY,
    axis: { x0: padL, y0: padT, xEnd: W - padR, yEnd: baseY },
    pts: pts, current: { x: padL + tc * pxX, y: baseY - clampv(cc, 0, yMax) * pxY, t: tc, c: cc }
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    clampv: clampv, merge: merge, ktOverV: ktOverV, concAt: concAt,
    hdi: hdi, clearanceParaAlvo: clearanceParaAlvo, ureaCurveLayout: ureaCurveLayout,
    DEFAULTS: DEFAULTS
  };
}
