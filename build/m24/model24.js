/* =========================================================================
 * FILTRA · M24 — Hipotensão intradialítica: UF > refilling, stunning miocárdico
 * ENGINE PURO. Espelhado inline no filtra24.html.
 *
 * Teses:
 *  - a ultrafiltração (UF) retira volume do PLASMA; o interstício reabastece o plasma
 *    a uma TAXA DE REFILLING (plasma refilling rate). Enquanto UF rate ≤ refilling, o
 *    volume plasmático se mantém. Quando UF rate > refilling, o intravascular CAI →
 *    pré-carga↓ → DC↓ → HIPOTENSÃO. NÃO é "pouco volume corporal" — é a VELOCIDADE.
 *  - o refilling depende do gradiente oncótico (albumina) e CAI ao se aproximar do peso
 *    seco (menos interstício para doar). Comer durante a diálise desvia sangue (esplâncnico).
 *  - peso seco / taxa de UF: UF total = (peso atual − peso seco); UF rate = UF total / tempo.
 *    Taxa de UF alta (>10–13 mL/kg/h) → risco. Mais tempo (mesma UF total) → UF rate↓ → seguro.
 *  - stunning miocárdico: hipoperfusão repetida a cada sessão → isquemia → lesão CUMULATIVA.
 * ========================================================================= */

function clampv(v, a, b) { var n = Number(v); if (!isFinite(n)) n = a; if (n < a) n = a; if (n > b) n = b; return n; }

// mescla defaults sem mutar a entrada
function merge(input) {
  var inp = input || {};
  return {
    pesoAtual: clampv(inp.pesoAtual !== undefined ? inp.pesoAtual : 73, 30, 200),    // kg, peso pré-diálise
    pesoSeco: clampv(inp.pesoSeco !== undefined ? inp.pesoSeco : 70, 25, 200),        // kg, peso seco alvo
    tempoHoras: clampv(inp.tempoHoras !== undefined ? inp.tempoHoras : 4, 1, 12),     // h, duração da sessão
    refillBase: clampv(inp.refillBase !== undefined ? inp.refillBase : 12, 2, 25),    // mL/kg/h, capacidade máx. de refilling
    albumina: clampv(inp.albumina !== undefined ? inp.albumina : 4, 1.5, 6)           // g/dL, oncótico do plasma
  };
}

var REF_ALB = 4;          // albumina de referência (g/dL)
var LLIM_KGH = 13;        // limiar de taxa de UF "alta" (mL/kg/h)
var PV_BASE_FRAC = 0.045; // volume plasmático ≈ 4,5% do peso seco (L/kg → ~3,15 L num 70 kg)

// fator oncótico do refilling: menos albumina → menos refilling (gradiente oncótico↓)
function fatorAlbumina(alb) {
  alb = clampv(alb, 1.5, 6);
  return clampv(alb / REF_ALB, 0.3, 1.3);   // 4 g/dL → 1,0; hipoalbuminemia reduz
}

// refilling efetivo (mL/kg/h) num dado "esgotamento" do interstício (0 = cheio, 1 = no peso seco)
function refillEfetivo(refillBase, alb, esgotamento) {
  refillBase = clampv(refillBase, 2, 25);
  esgotamento = clampv(esgotamento, 0, 1);
  var fAlb = fatorAlbumina(alb);
  // perto do peso seco, o interstício tem pouco a doar → o refilling despenca (queda quadrática)
  var fReserva = clampv(1 - esgotamento * esgotamento, 0, 1);
  return clampv(refillBase * fAlb * fReserva, 0, 40);
}

// função-mãe: a sessão de UF e o destino do volume plasmático
function ufSession(input) {
  var s = merge(input);
  var ufTotalMl = clampv((s.pesoAtual - s.pesoSeco) * 1000, 0, 200000);    // mL a remover
  var ufRateMlh = ufTotalMl / s.tempoHoras;                                // mL/h
  var ufRateKgh = ufRateMlh / s.pesoAtual;                                 // mL/kg/h (normalizado)

  // volume plasmático inicial (mL): ~4,5% do peso seco
  var pvInicial = PV_BASE_FRAC * s.pesoSeco * 1000;                        // mL
  var refMax = refillEfetivo(s.refillBase, s.albumina, 0) * s.pesoAtual;   // mL/h máx (interstício cheio)
  var refMaxKgh = refillEfetivo(s.refillBase, s.albumina, 0);             // mL/kg/h máx

  // integração temporal: a cada passo, plasma -= UF, plasma += refilling(esgotamento)
  var Nsteps = 240, dt = s.tempoHoras / Nsteps;
  var pv = pvInicial, pvMin = pvInicial, tMin = 0;
  var removidoTotal = 0, crashTime = -1;
  var traj = [];
  for (var i = 0; i <= Nsteps; i++) {
    var t = i * dt;
    // esgotamento do interstício: fração do líquido extravascular removível já retirado
    var reservatorio = clampv((s.pesoAtual - s.pesoSeco) * 1000, 1e-6, 200000);
    var esg = clampv(removidoTotal / reservatorio, 0, 1);
    var refKgh = refillEfetivo(s.refillBase, s.albumina, esg);
    var refMlh = refKgh * s.pesoAtual;
    var netMlh = refMlh - ufRateMlh;        // ganho líquido do plasma por hora (negativo = caindo)
    traj.push({ t: t, pv: pv, ufRate: ufRateMlh, refill: refMlh, net: netMlh, esg: esg });
    if (pv < pvMin) { pvMin = pv; tMin = t; }
    if (pv < pvInicial * 0.82 && crashTime < 0) crashTime = t;  // queda >18% do PV → hipotensão
    if (i < Nsteps) {
      pv += netMlh * dt;
      pv = clampv(pv, pvInicial * 0.35, pvInicial * 1.05);
      removidoTotal += ufRateMlh * dt;
    }
  }
  var quedaPVfrac = (pvInicial - pvMin) / pvInicial;             // fração de queda do PV (0..)
  var pvFinal = pv;

  // diferença UF rate × refilling no INÍCIO (interstício cheio): o sinal do mecanismo
  var margemKgh = refMaxKgh - ufRateKgh;                         // >0 estável · <0 crash

  // risco de hipotensão intradialítica (0..1) — função da queda do PV e da taxa de UF
  var riscoQueda = clampv(quedaPVfrac / 0.25, 0, 1);            // 25% de queda → risco máx
  var riscoTaxa = clampv((ufRateKgh - 8) / (LLIM_KGH - 8), 0, 1.3);
  var risco = clampv(0.62 * riscoQueda + 0.38 * clampv(riscoTaxa, 0, 1), 0, 1);

  // flags de mecanismo
  var ufExcedeRefilling = ufRateKgh > refMaxKgh;                 // a desigualdade central
  var taxaAlta = ufRateKgh > LLIM_KGH;                          // >13 mL/kg/h
  var hipotensao = risco > 0.5;
  // stunning: hipoperfusão (queda significativa do PV) → custo cumulativo silencioso
  var stunning = quedaPVfrac > 0.15 || ufRateKgh > LLIM_KGH;
  var hipoalbumin = s.albumina < 3;

  return {
    pesoAtual: s.pesoAtual, pesoSeco: s.pesoSeco, tempoHoras: s.tempoHoras,
    refillBase: s.refillBase, albumina: s.albumina,
    ufTotalMl: ufTotalMl, ufRateMlh: ufRateMlh, ufRateKgh: ufRateKgh,
    refMaxMlh: refMax, refMaxKgh: refMaxKgh, margemKgh: margemKgh,
    pvInicial: pvInicial, pvMin: pvMin, pvFinal: pvFinal, tMin: tMin,
    quedaPVfrac: quedaPVfrac, crashTime: crashTime, traj: traj,
    risco: risco, ufExcedeRefilling: ufExcedeRefilling, taxaAlta: taxaAlta,
    hipotensao: hipotensao, stunning: stunning, hipoalbumin: hipoalbumin
  };
}

// geometria PURA do gráfico volume plasmático × tempo (a UI só pinta)
// desenha DUAS curvas: a do estado atual e a de referência "UF gentil" (mais tempo)
function pvCurveLayout(state, W, H) {
  state = state || {};
  W = clampv(W, 200, 100000); H = clampv(H, 120, 100000);
  var padL = 54, padR = 16, padT = 18, padB = 38, baseY = H - padB;
  var s = merge(state);
  var r = ufSession(s);
  var tMax = s.tempoHoras;
  // eixo Y em % do PV inicial (de 60% a 105%)
  var yLo = 60, yHi = 105;
  var pxX = (W - padL - padR) / Math.max(tMax, 1e-6);
  var pxY = (baseY - padT) / (yHi - yLo);
  function ptY(pvFrac) { var pct = clampv(pvFrac * 100, yLo, yHi); return baseY - (pct - yLo) * pxY; }
  var pts = [], i;
  for (i = 0; i < r.traj.length; i++) {
    var tr = r.traj[i];
    pts.push({ t: tr.t, pvFrac: tr.pv / r.pvInicial, x: padL + tr.t * pxX, y: ptY(tr.pv / r.pvInicial) });
  }
  // curva de referência: a MESMA UF total em tempo dobrado (UF rate menor → estável)
  var gentle = ufSession({ pesoAtual: s.pesoAtual, pesoSeco: s.pesoSeco, tempoHoras: clampv(s.tempoHoras * 2, 1, 12), refillBase: s.refillBase, albumina: s.albumina });
  var ptsGentle = [];
  for (i = 0; i < gentle.traj.length; i++) {
    var tg = gentle.traj[i];
    // reescala o tempo da curva gentil para o mesmo eixo X (mostra o platô que ela mantém)
    var tx = (tg.t / Math.max(gentle.tempoHoras, 1e-6)) * tMax;
    ptsGentle.push({ t: tx, pvFrac: tg.pv / gentle.pvInicial, x: padL + tx * pxX, y: ptY(tg.pv / gentle.pvInicial) });
  }
  // ponto de crash (queda >18%) sobre a curva atual
  var crash = null;
  if (r.crashTime >= 0) crash = { x: padL + r.crashTime * pxX, y: ptY(0.82), t: r.crashTime };
  // linha do limiar de hipotensão (82% do PV)
  var thresholdY = ptY(0.82);
  return {
    W: W, H: H, padL: padL, padR: padR, padT: padT, padB: padB, baseY: baseY,
    tMax: tMax, yLo: yLo, yHi: yHi, pxX: pxX, pxY: pxY,
    axis: { x0: padL, y0: padT, xEnd: W - padR, yEnd: baseY },
    pts: pts, ptsGentle: ptsGentle, crash: crash, thresholdY: thresholdY,
    risco: r.risco, ufRateKgh: r.ufRateKgh, refMaxKgh: r.refMaxKgh
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    clampv: clampv, merge: merge, fatorAlbumina: fatorAlbumina, refillEfetivo: refillEfetivo,
    ufSession: ufSession, pvCurveLayout: pvCurveLayout,
    REF_ALB: REF_ALB, LLIM_KGH: LLIM_KGH, PV_BASE_FRAC: PV_BASE_FRAC
  };
}
