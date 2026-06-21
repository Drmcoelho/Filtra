/* =========================================================================
 * FILTRA · M34 — Síndrome de desequilíbrio dialítico (DDS):
 *   edema cerebral por OSMOSE REVERSA; o gradiente que machuca.
 * ENGINE PURO. Espelhado inline no filtra34.html.
 *
 * Teses:
 *  - A HD remove ureia do SANGUE rápido (difusão no dialisador), mas a ureia do
 *    CÉREBRO sai DEVAGAR — a barreira hematoencefálica (BHE) atrasa o efluxo e o
 *    cérebro gera osmoles idiogênicos. Resultado: o cérebro fica HIPEROSMOLAR
 *    relativo ao sangue → a água migra DO sangue PARA o cérebro → EDEMA CEREBRAL.
 *  - O gradiente é a OSMOSE REVERSA: normalmente a osmolalidade protege a célula;
 *    aqui, "boa demais, rápido demais" no paciente muito urêmico, ela machuca.
 *  - Gradiente osmótico cérebro−sangue = (ureia_cérebro − ureia_sangue)·fator.
 *    Quanto MAIS RÁPIDA a queda da ureia sanguínea e MAIS ALTA a ureia inicial
 *    (BUN muito alto), maior o gradiente → pior o edema.
 *  - Fatores de risco: 1ª diálise, BUN muito alto, remoção agressiva (alta
 *    eficiência/tempo curto), idade extrema (BHE/complacência). Prevenção:
 *    1ª sessão GENTIL (baixo fluxo, curta, queda-alvo limitada <~30–40%).
 *
 * Unidades: BUN/ureia em mg/dL; removalRate é a constante de remoção sanguínea
 *   k (por hora, adimensional·h⁻¹) — proxy de eficiência (Kt/V por hora); tempo em h;
 *   bbb (integridade da BHE) 0–1; idoso/criança como modificadores de τ cerebral.
 * Modelo de DOIS compartimentos (sangue × cérebro), tempo amortecido (sem oscilar):
 *   ureia_sangue(t) = bun0·exp(−k·t)
 *   d(ureia_cérebro)/dt = (ureia_sangue − ureia_cérebro)/τ_cérebro   (1ª ordem, lag)
 *   τ_cérebro ↑ com a integridade da BHE (efluxo cerebral mais lento).
 * ========================================================================= */

function clampv(v, a, b) { var n = Number(v); if (!isFinite(n)) n = a; if (n < a) n = a; if (n > b) n = b; return n; }

function merge(def, inp) {
  var o = {}, k; for (k in def) o[k] = def[k];
  if (inp) for (k in def) if (inp[k] !== undefined) o[k] = inp[k];
  return o;
}

var DEFAULTS = {
  bun0: 80,          // BUN inicial (mg/dL)
  removalRate: 0.3,  // constante de remoção SANGUÍNEA k (h⁻¹) — proxy de eficiência (Kt/V por hora);
                     //   0,3·4h ≈ Kt/V 1,2 (URR ~70%) = sessão padrão
  tempo: 4,          // duração da sessão (h)
  bbb: 0.7,          // integridade da BHE (0=permeável → equilibra rápido; 1=intacta → atrasa muito)
  primeira: 0        // 1ª diálise? (0/1) — sem adaptação prévia, pior; modula τ cerebral e osmoles
};

var OSM_FATOR = 0.10;   // mOsm/kg por mg/dL de ureia (≈ ureia[mg/dL]/2,8 → simplificado a 0,357·… ); usamos 0,10 p/ escala didática
var TAU_BASE = 0.35;    // τ cerebral mínimo (h) com BHE permeável
var TAU_BBB = 2.6;      // ganho de τ pela integridade da BHE (h)
var TAU_PRIMEIRA = 1.4; // ganho de τ extra na 1ª diálise (sem adaptação, efluxo ainda mais lento)
var EDEMA_K = 3.2;      // ganho do edema por mOsm de gradiente de pico (%/mOsm) — escala didática

// constante de tempo do efluxo cerebral (h): BHE intacta + 1ª diálise → maior atraso → maior gradiente
function tauCerebro(bbb, primeira) {
  bbb = clampv(bbb, 0, 1); primeira = clampv(primeira, 0, 1);
  return clampv(TAU_BASE + TAU_BBB * bbb + TAU_PRIMEIRA * primeira, 0.05, 10);
}

// ureia sanguínea no tempo th (h): queda exponencial governada por k
function ureiaSangue(bun0, k, th) {
  bun0 = clampv(bun0, 1, 300); k = clampv(k, 0, 5); th = clampv(th, 0, 24);
  return clampv(bun0 * Math.exp(-k * th), 0, 300);
}

// ureia cerebral no tempo th (h): rastreia o sangue com lag de 1ª ordem (τ).
// Solução fechada do sistema linear (sem laço numérico, determinístico):
//   Cb(t)=bun0·e^{-k t};  dCc/dt=(Cb−Cc)/τ, Cc(0)=bun0
//   Cc(t)= bun0·[ (1/(1−kτ))·e^{-k t} − (kτ/(1−kτ))·e^{-t/τ} ]    (k≠1/τ)
//   caso degenerado k=1/τ:  Cc(t)= bun0·e^{-k t}·(1 + k t)
function ureiaCerebro(bun0, k, tau, th) {
  bun0 = clampv(bun0, 1, 300); k = clampv(k, 0, 5); tau = clampv(tau, 0.05, 10); th = clampv(th, 0, 24);
  var a = k * tau;
  var cc;
  if (Math.abs(1 - a) < 1e-6) {
    cc = bun0 * Math.exp(-k * th) * (1 + th / tau);
  } else {
    var e1 = Math.exp(-k * th);
    var e2 = Math.exp(-th / tau);
    cc = bun0 * ((1 / (1 - a)) * e1 - (a / (1 - a)) * e2);
  }
  return clampv(cc, 0, 300);
}

// gradiente osmótico cérebro−sangue (mOsm/kg) no tempo th
function gradienteOsm(bun0, k, tau, th) {
  var cb = ureiaSangue(bun0, k, th);
  var cc = ureiaCerebro(bun0, k, tau, th);
  var g = (cc - cb) * OSM_FATOR;     // ureia cerebral mais alta → gradiente positivo (água entra no cérebro)
  return g > 0 ? g : 0;              // só o gradiente que PUXA água para o cérebro machuca
}

// função-mãe: estado da síndrome de desequilíbrio para uma sessão
function dds(input) {
  var inp = merge(DEFAULTS, input || {});
  var bun0 = clampv(inp.bun0, 1, 300);
  var k = clampv(inp.removalRate, 0, 5);
  var tempo = clampv(inp.tempo, 0.1, 24);
  var bbb = clampv(inp.bbb, 0, 1);
  var primeira = clampv(inp.primeira, 0, 1);

  var tau = tauCerebro(bbb, primeira);

  // varredura no tempo (passo fixo) — acha o gradiente de PICO e o tempo do pico
  var N = 120, gPico = 0, tPico = 0, i, th, g;
  for (i = 0; i <= N; i++) {
    th = tempo * i / N;
    g = gradienteOsm(bun0, k, tau, th);
    if (g > gPico) { gPico = g; tPico = th; }
  }
  gPico = clampv(gPico, 0, 100);

  // valores no FIM da sessão
  var bunBloodFim = ureiaSangue(bun0, k, tempo);
  var bunBrainFim = ureiaCerebro(bun0, k, tau, tempo);
  var gradFim = clampv((bunBrainFim - bunBloodFim) * OSM_FATOR, 0, 100);

  // queda da ureia sanguínea (%) — a "agressividade" entregue
  var quedaPct = clampv((1 - bunBloodFim / bun0) * 100, 0, 100);

  // edema cerebral estimado (% acima do basal) ∝ gradiente de pico
  var edemaPct = clampv(gPico * EDEMA_K, 0, 60);

  // risco categórico por mecanismo (0=baixo,1=moderado,2=alto)
  // dirigido pelo GRADIENTE DE PICO (o que machuca), agravado por BUN muito alto,
  // 1ª diálise (sem adaptação) e queda muito agressiva.
  var riscoScore = gPico
    + (bun0 > 150 ? 1.6 : 0)
    + (primeira > 0.5 ? 1.6 : 0)
    + (quedaPct > 50 ? 1.0 : 0);
  var risco = riscoScore < 3.0 ? 0 : (riscoScore < 5.5 ? 1 : 2);
  var riscoTxt = risco === 0 ? 'baixo' : (risco === 1 ? 'moderado' : 'alto');

  // flags clínicas (k em h⁻¹; a AGRESSIVIDADE do DDS é a VELOCIDADE k, não a queda total)
  var agressiva = (k >= 0.55);                       // alta eficiência (queda rápida → gradiente íngreme)
  var gentil = (k <= 0.22);                          // sessão gentil — baixa eficiência (prevenção)
  var alvoQuedaOk = quedaPct <= 40;                  // queda-alvo limitada (<~30–40%) — prevenção clássica

  return {
    bun0: bun0, removalRate: k, tempo: tempo, bbb: bbb, primeira: primeira,
    tau: tau,
    bunBloodFim: bunBloodFim, bunBrainFim: bunBrainFim,
    gradFim: gradFim, gPico: gPico, tPico: tPico,
    quedaPct: quedaPct, edemaPct: edemaPct,
    riscoScore: riscoScore, risco: risco, riscoTxt: riscoTxt,
    agressiva: agressiva, gentil: gentil, alvoQuedaOk: alvoQuedaOk
  };
}

// geometria PURA das duas curvas (sangue, cérebro) + gradiente no tempo (a UI só pinta)
function ddsCurveLayout(state, W, H) {
  state = merge(DEFAULTS, state || {});
  W = clampv(W, 200, 100000); H = clampv(H, 120, 100000);
  var padL = 52, padR = 16, padT = 18, padB = 38, baseY = H - padB;
  var bun0 = clampv(state.bun0, 1, 300);
  var k = clampv(state.removalRate, 0, 5);
  var tempo = clampv(state.tempo, 0.1, 24);
  var tau = tauCerebro(state.bbb, state.primeira);
  var tMax = clampv(Math.max(tempo, 4), 0.1, 24), N = 80;
  var yMax = Math.max(40, Math.ceil(bun0 / 20) * 20);   // mg/dL no eixo
  var pxX = (W - padL - padR) / tMax, pxY = (baseY - padT) / yMax;
  var blood = [], brain = [], grad = [], i, th, cb, cc, g;
  for (i = 0; i <= N; i++) {
    th = tMax * i / N;
    cb = ureiaSangue(bun0, k, th);
    cc = ureiaCerebro(bun0, k, tau, th);
    g = (cc - cb) * OSM_FATOR; if (g < 0) g = 0;
    blood.push({ t: th, c: cb, x: padL + th * pxX, y: baseY - clampv(cb, 0, yMax) * pxY });
    brain.push({ t: th, c: cc, x: padL + th * pxX, y: baseY - clampv(cc, 0, yMax) * pxY });
    grad.push({ t: th, g: g });
  }
  var tc = clampv(tempo, 0, tMax);
  var cbc = ureiaSangue(bun0, k, tc), ccc = ureiaCerebro(bun0, k, tau, tc);
  return {
    W: W, H: H, padL: padL, padR: padR, padT: padT, padB: padB, baseY: baseY,
    tMax: tMax, yMax: yMax, pxX: pxX, pxY: pxY,
    axis: { x0: padL, y0: padT, xEnd: W - padR, yEnd: baseY },
    blood: blood, brain: brain, grad: grad,
    current: {
      t: tc,
      xB: padL + tc * pxX, yBlood: baseY - clampv(cbc, 0, yMax) * pxY,
      yBrain: baseY - clampv(ccc, 0, yMax) * pxY, cBlood: cbc, cBrain: ccc
    }
  };
}

// geometria PURA do edema × taxa de remoção (a curva-tese: pico na agressiva, plana na gentil)
function edemaSweepLayout(state, W, H) {
  state = merge(DEFAULTS, state || {});
  W = clampv(W, 200, 100000); H = clampv(H, 120, 100000);
  var padL = 52, padR = 16, padT = 18, padB = 38, baseY = H - padB;
  var kMin = 0.05, kMax = 2.0, N = 70;
  var yMax = 50;   // % de edema no eixo
  var pxX = (W - padL - padR) / (kMax - kMin), pxY = (baseY - padT) / yMax;
  var pts = [], i, kk, r;
  for (i = 0; i <= N; i++) {
    kk = kMin + (kMax - kMin) * i / N;
    r = dds({ bun0: state.bun0, removalRate: kk, tempo: state.tempo, bbb: state.bbb, primeira: state.primeira });
    pts.push({ k: kk, edema: r.edemaPct, x: padL + (kk - kMin) * pxX, y: baseY - clampv(r.edemaPct, 0, yMax) * pxY });
  }
  var kc = clampv(state.removalRate, kMin, kMax);
  var rc = dds(state);
  return {
    W: W, H: H, padL: padL, padR: padR, padT: padT, padB: padB, baseY: baseY,
    kMin: kMin, kMax: kMax, yMax: yMax, pxX: pxX, pxY: pxY,
    axis: { x0: padL, y0: padT, xEnd: W - padR, yEnd: baseY },
    pts: pts,
    current: { x: padL + (kc - kMin) * pxX, y: baseY - clampv(rc.edemaPct, 0, yMax) * pxY, k: kc, edema: rc.edemaPct }
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    clampv: clampv, merge: merge,
    tauCerebro: tauCerebro, ureiaSangue: ureiaSangue, ureiaCerebro: ureiaCerebro, gradienteOsm: gradienteOsm,
    dds: dds, ddsCurveLayout: ddsCurveLayout, edemaSweepLayout: edemaSweepLayout,
    DEFAULTS: DEFAULTS, OSM_FATOR: OSM_FATOR, EDEMA_K: EDEMA_K
  };
}
