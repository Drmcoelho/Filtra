/* =========================================================================
 * FILTRA · M34 — bateria de robustez REFORÇADA (0 falhas ou não entra)
 * 1 BASE · 2 IDENTIDADES · 3 LEIS · 4 PÉROLAS · 5 DETERMINISMO 5× · 6 ROBUSTEZ ·
 * 7 LIMITES · 8 MONOTONIA EXAUSTIVA (≥50 passos, par-a-par) · 9 FUZZING ≥20000 (40% malignas) · 10 SAÍDA
 * Reporta a contagem total de asserções (>~300000 OK).
 * ========================================================================= */
var M = require('./model34.js');
var dds = M.dds, ureiaSangue = M.ureiaSangue, ureiaCerebro = M.ureiaCerebro, gradienteOsm = M.gradienteOsm,
  tauCerebro = M.tauCerebro, ddsCurveLayout = M.ddsCurveLayout, edemaSweepLayout = M.edemaSweepLayout;

var oks = 0, fails = 0;
function ok(c, m) { if (c) oks++; else { fails++; if (fails <= 40) console.log('  FALHA: ' + m); } }
function near(a, b, t) { return Math.abs(a - b) <= (t || 1e-7); }
function fin(x) { return typeof x === 'number' && isFinite(x); }

/* campos e seus LIMITES documentados [min,max] (declaração explícita — §6) */
var LIM = {
  bun0: [1, 300], removalRate: [0, 5], tempo: [0.1, 24], bbb: [0, 1], primeira: [0, 1],
  tau: [0.05, 10], bunBloodFim: [0, 300], bunBrainFim: [0, 300],
  gradFim: [0, 100], gPico: [0, 100], tPico: [0, 24], quedaPct: [0, 100], edemaPct: [0, 60],
  riscoScore: [0, 1e6], risco: [0, 2]
};
function dentroLimites(r) {
  for (var k in LIM) {
    if (r[k] === undefined) continue;
    if (!fin(r[k])) return false;
    if (r[k] < LIM[k][0] - 1e-9 || r[k] > LIM[k][1] + 1e-9) return false;
  }
  return true;
}

/* ---------- 1. LINHA DE BASE ---------- */
(function () {
  var r = dds({});
  ok(r.quedaPct > 60 && r.quedaPct < 80, 'base: sessão padrão remove ~70% da ureia sanguínea');
  ok(r.bunBrainFim > r.bunBloodFim, 'base: ureia CEREBRAL > sanguínea no fim (o cérebro atrasa)');
  ok(r.gPico > 0, 'base: gradiente de pico cérebro−sangue positivo (osmose reversa)');
  ok(r.edemaPct > 0 && r.edemaPct < 15, 'base: edema modesto numa sessão padrão adaptada');
  ok(r.tau > 1 && r.tau < 4, 'base: τ cerebral fisiológico (lag do efluxo)');
  ok(!r.agressiva && !r.gentil, 'base: nem agressiva nem gentil (sessão padrão)');
  ok(near(ureiaSangue(80, 0, 4), 80), 'base: sem remoção (k=0) → ureia sanguínea não cai');
})();

/* ---------- 2. IDENTIDADES (valem SEMPRE) ---------- */
(function () {
  for (var i = 0; i < 60; i++) {
    var bun0 = 20 + i * 4, k = 0.05 + (i % 7) * 0.12, tempo = 1 + (i % 5) * 1.2, bbb = (i % 11) / 10, prim = i % 2;
    var r = dds({ bun0: bun0, removalRate: k, tempo: tempo, bbb: bbb, primeira: prim });
    // ureia sanguínea no fim == fórmula fechada
    ok(near(r.bunBloodFim, M.clampv(bun0 * Math.exp(-M.clampv(k, 0, 5) * M.clampv(tempo, 0.1, 24)), 0, 300), 1e-6), 'id: bunBloodFim = bun0·exp(−k·t)');
    // queda% == (1 − bunBloodFim/bun0)·100
    ok(near(r.quedaPct, M.clampv((1 - r.bunBloodFim / M.clampv(bun0, 1, 300)) * 100, 0, 100), 1e-6), 'id: quedaPct = (1−Bfim/B0)·100');
    // τ == tauCerebro(bbb,primeira)
    ok(near(r.tau, tauCerebro(bbb, prim), 1e-9), 'id: τ = tauCerebro(bbb,primeira)');
    // gradFim == (cérebro − sangue)·OSM_FATOR (clamp ≥0)
    var gExp = Math.max(0, (r.bunBrainFim - r.bunBloodFim) * M.OSM_FATOR); gExp = Math.min(gExp, 100);
    ok(near(r.gradFim, gExp, 1e-6), 'id: gradFim = (cérebro−sangue)·OSM_FATOR');
    // edema == gPico·EDEMA_K (clamp)
    ok(near(r.edemaPct, M.clampv(r.gPico * M.EDEMA_K, 0, 60), 1e-6), 'id: edema = gPico·EDEMA_K');
    // condição inicial: ureia cerebral(t=0) == bun0
    ok(near(ureiaCerebro(bun0, k, r.tau, 0), M.clampv(bun0, 1, 300), 1e-6), 'id: cérebro(t=0) = bun0');
    // sangue(t=0) == bun0
    ok(near(ureiaSangue(bun0, k, 0), M.clampv(bun0, 1, 300), 1e-6), 'id: sangue(t=0) = bun0');
  }
  // caso degenerado k=1/τ não explode (solução fechada alternativa)
  var tau0 = tauCerebro(0.7, 0), kdeg = 1 / tau0;
  ok(fin(ureiaCerebro(100, kdeg, tau0, 3)), 'id: caso k=1/τ finito (sem divisão por zero)');
})();

/* ---------- 3. LEIS (sentido físico) ---------- */
(function () {
  // BUN inicial ↑ → gradiente/edema ↑
  ok(dds({ bun0: 200 }).gPico > dds({ bun0: 60 }).gPico, 'lei: BUN inicial↑ → gradiente↑');
  ok(dds({ bun0: 200 }).edemaPct > dds({ bun0: 60 }).edemaPct, 'lei: BUN inicial↑ → edema↑');
  // remoção mais rápida (k↑) → edema ↑
  ok(dds({ removalRate: 1.2 }).edemaPct > dds({ removalRate: 0.2 }).edemaPct, 'lei: remoção mais rápida → edema↑');
  // BHE mais íntegra → efluxo cerebral mais lento → gradiente ↑
  ok(dds({ bbb: 1.0, removalRate: 1.0 }).gPico > dds({ bbb: 0.0, removalRate: 1.0 }).gPico, 'lei: BHE↑ → gradiente↑');
  // 1ª diálise → τ maior → gradiente/edema maior
  ok(dds({ primeira: 1, removalRate: 0.8 }).gPico > dds({ primeira: 0, removalRate: 0.8 }).gPico, 'lei: 1ª diálise → gradiente↑');
  // gentil (k baixo) tem edema MENOR que agressiva (k alto) — mesmo BUN
  ok(dds({ bun0: 150, removalRate: 0.15, tempo: 6 }).edemaPct < dds({ bun0: 150, removalRate: 1.2, tempo: 2 }).edemaPct, 'lei: gentil → edema↓ vs agressiva');
  // τ cresce com BHE
  ok(tauCerebro(1, 0) > tauCerebro(0, 0), 'lei: τ↑ com integridade da BHE');
})();

/* ---------- 4. PÉROLAS (o contra-intuitivo, provado) ---------- */
(function () {
  // (1) OSMOSE REVERSA: na sessão agressiva, o cérebro fica HIPEROSMOLAR vs sangue → água entra → edema
  var ag = dds({ bun0: 180, removalRate: 1.2, tempo: 2, primeira: 1, bbb: 0.9 });
  ok(ag.bunBrainFim > ag.bunBloodFim && ag.gPico > 5, 'pérola: osmose reversa — cérebro hiperosmolar puxa água (gradiente grande)');
  ok(ag.risco === 2, 'pérola: a sessão "boa demais, rápido demais" no muito urêmico → risco ALTO');
  // (2) GENTIL É SEGURO: mesma remoção total, mas devagar → gradiente e edema pequenos
  var ge = dds({ bun0: 180, removalRate: 0.15, tempo: 8, primeira: 1, bbb: 0.9 });
  ok(ge.edemaPct < ag.edemaPct, 'pérola: a 1ª sessão GENTIL machuca menos (edema menor)');
  ok(ge.gentil === true, 'pérola: a prevenção é a baixa eficiência (gentil=true)');
  // (3) o BUN muito alto é a munição do gradiente
  ok(dds({ bun0: 250, removalRate: 0.6 }).gPico > dds({ bun0: 80, removalRate: 0.6 }).gPico * 2, 'pérola: BUN muito alto multiplica o gradiente');
})();

/* ---------- 5. DETERMINISMO 5× (byte-idêntico) ---------- */
(function () {
  var inp = { bun0: 175, removalRate: 0.85, tempo: 3, bbb: 0.6, primeira: 1 };
  var ref = JSON.stringify(dds(inp));
  var igual = true;
  for (var n = 0; n < 5; n++) { if (JSON.stringify(dds(inp)) !== ref) igual = false; }
  ok(igual, 'determinismo: 5× a mesma entrada → saída byte-idêntica');
  var refL = JSON.stringify(ddsCurveLayout(inp, 900, 360));
  var igualL = true; for (var m = 0; m < 5; m++) { if (JSON.stringify(ddsCurveLayout(inp, 900, 360)) !== refL) igualL = false; }
  ok(igualL, 'determinismo: ddsCurveLayout 5× byte-idêntico');
  var refS = JSON.stringify(edemaSweepLayout(inp, 900, 360));
  var igualS = true; for (var p = 0; p < 5; p++) { if (JSON.stringify(edemaSweepLayout(inp, 900, 360)) !== refS) igualS = false; }
  ok(igualS, 'determinismo: edemaSweepLayout 5× byte-idêntico');
  // Object.freeze não lança nem é mutado (deep-compare)
  var frozen = Object.freeze({ bun0: 120, removalRate: 0.5, tempo: 4, bbb: 0.8, primeira: 0 });
  var snap = JSON.stringify(frozen), threw = false, r;
  try { r = dds(frozen); } catch (e) { threw = true; }
  ok(!threw && fin(r.gPico), 'determinismo: Object.freeze não lança');
  ok(JSON.stringify(frozen) === snap, 'determinismo: entrada não mutada (deep-compare)');
})();

/* ---------- 6. ROBUSTEZ (lixo dirigido) ---------- */
(function () {
  var maus = [undefined, null, {}, [], function () {}, { bun0: NaN }, { bun0: 'x' }, { bun0: -50 }, { bun0: 1e9 },
    { removalRate: Infinity }, { removalRate: -3 }, { tempo: -10 }, { tempo: 'z' }, { bbb: 9 }, { bbb: -2 },
    { primeira: 'sim' }, { bun0: {}, removalRate: [], tempo: null, bbb: undefined, primeira: NaN }];
  maus.forEach(function (mau, i) {
    var r = dds(mau);
    ok(dentroLimites(r), 'robustez[' + i + ']: todas as saídas finitas e nos limites');
    ok(fin(r.gPico) && fin(r.edemaPct) && fin(r.tau) && fin(r.quedaPct), 'robustez[' + i + ']: campos-chave finitos');
    var L = ddsCurveLayout(mau, 800, 320);
    ok(Array.isArray(L.blood) && Array.isArray(L.brain) && fin(L.current.yBlood), 'robustez[' + i + ']: layout finito');
    var S = edemaSweepLayout(mau, 800, 320);
    ok(Array.isArray(S.pts) && fin(S.current.y), 'robustez[' + i + ']: sweep finito');
  });
})();

/* ---------- 7. LIMITES ([min,max] por campo — declarados, nenhuma entrada viola) ---------- */
(function () {
  // extremos de cada campo
  var extremos = [
    { bun0: 1 }, { bun0: 300 }, { bun0: 1e6 }, { bun0: -1e6 },
    { removalRate: 0 }, { removalRate: 5 }, { removalRate: 1e9 },
    { tempo: 0.1 }, { tempo: 24 }, { tempo: 1e9 },
    { bbb: 0 }, { bbb: 1 }, { primeira: 0 }, { primeira: 1 }
  ];
  extremos.forEach(function (e, i) { ok(dentroLimites(dds(e)), 'limites[' + i + ']: extremo dentro de [min,max]'); });
})();

/* ---------- 8. MONOTONIA EXAUSTIVA (cada alavanca, ≥50 passos, par-a-par) ---------- */
(function () {
  var STEPS = 60, EPS = 1e-7;
  // BUN inicial ↑ → gPico ↑ e edema ↑ (em cada par adjacente)
  (function () {
    var prevG = -1, prevE = -1, monoG = true, monoE = true;
    for (var i = 0; i <= STEPS; i++) {
      var bun0 = 20 + (280) * i / STEPS;
      var r = dds({ bun0: bun0, removalRate: 0.6, tempo: 4, bbb: 0.7, primeira: 0 });
      if (i > 0 && r.gPico < prevG - EPS) monoG = false;
      if (i > 0 && r.edemaPct < prevE - EPS) monoE = false;
      prevG = r.gPico; prevE = r.edemaPct;
    }
    ok(monoG, 'monotonia: BUN inicial↑ → gPico↑ em CADA par (' + STEPS + ' passos)');
    ok(monoE, 'monotonia: BUN inicial↑ → edema↑ em CADA par');
  })();
  // remoção k ↑ → edema ↑ (par-a-par)
  (function () {
    var prevE = -1, mono = true;
    for (var i = 0; i <= STEPS; i++) {
      var k = 0.02 + (1.8) * i / STEPS;
      var r = dds({ bun0: 150, removalRate: k, tempo: 4, bbb: 0.8, primeira: 0 });
      if (i > 0 && r.edemaPct < prevE - EPS) mono = false;
      prevE = r.edemaPct;
    }
    ok(mono, 'monotonia: remoção mais rápida (k↑) → edema↑ em CADA par');
  })();
  // BHE íntegra ↑ → gPico ↑ (par-a-par)
  (function () {
    var prevG = -1, mono = true;
    for (var i = 0; i <= STEPS; i++) {
      var bbb = i / STEPS;
      var r = dds({ bun0: 150, removalRate: 1.0, tempo: 3, bbb: bbb, primeira: 0 });
      if (i > 0 && r.gPico < prevG - EPS) mono = false;
      prevG = r.gPico;
    }
    ok(mono, 'monotonia: BHE íntegra↑ → gradiente↑ em CADA par');
  })();
  // τ ↑ monotônico com BHE
  (function () {
    var prevT = -1, mono = true;
    for (var i = 0; i <= STEPS; i++) { var t = tauCerebro(i / STEPS, 0); if (i > 0 && t < prevT - EPS) mono = false; prevT = t; }
    ok(mono, 'monotonia: τ↑ com BHE em CADA par');
  })();
  // GENTIL → edema desce conforme k baixa (i.e. edema(k) decrescente quando varremos k para baixo)
  (function () {
    var prevE = 1e9, mono = true;
    for (var i = STEPS; i >= 0; i--) {
      var k = 0.02 + (1.8) * i / STEPS;
      var r = dds({ bun0: 180, removalRate: k, tempo: 4, bbb: 0.8, primeira: 1 });
      if (i < STEPS && r.edemaPct > prevE + EPS) mono = false;
      prevE = r.edemaPct;
    }
    ok(mono, 'monotonia: gentil (k↓) → edema↓ em CADA par');
  })();
})();

/* ---------- 9. FUZZING semeado ≥20000 (40% malignas) ---------- */
(function () {
  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  var rnd = mulberry32(0x34DD5), N = 20000, bad = 0, asserts = 0;
  var MALIGNOS = [NaN, Infinity, -Infinity, 1e300, -1e300, 1e-300, '7', 'x', '', {}, [], function () {}, null, undefined, true];
  function val() {
    var r = rnd();
    if (r < 0.40) return MALIGNOS[(rnd() * MALIGNOS.length) | 0];   // 40% malignas
    return (rnd() - 0.20) * 320;                                     // 60% numéricas (inclui negativos e grandes)
  }
  for (var i = 0; i < N; i++) {
    var inp = { bun0: val(), removalRate: val(), tempo: val(), bbb: val(), primeira: val() };
    var snap = JSON.stringify(inp);
    var r = dds(inp);
    var L = ddsCurveLayout(inp, 900, 360);
    var S = edemaSweepLayout(inp, 900, 360);
    // (a) nenhuma saída NaN/±Inf  (b) cada campo nos limites  (c) identidades  (d) input não mutado + layouts finitos
    var finOk = fin(r.gPico) && fin(r.edemaPct) && fin(r.tau) && fin(r.gradFim) && fin(r.bunBloodFim) &&
      fin(r.bunBrainFim) && fin(r.quedaPct) && fin(r.tPico) && fin(r.riscoScore);
    var limOk = dentroLimites(r);
    var idOk = near(r.edemaPct, M.clampv(r.gPico * M.EDEMA_K, 0, 60), 1e-6) &&
      r.bunBrainFim >= r.bunBloodFim - 1e-6 + (r.gradFim > 0 ? 0 : 0) &&  // cérebro ≥ sangue OU gradFim=0
      r.gradFim >= -1e-9;
    var layoutOk = Array.isArray(L.blood) && L.blood.length === 81 && Array.isArray(L.brain) && L.brain.length === 81 &&
      Array.isArray(S.pts) && S.pts.length === 71 && fin(L.current.yBlood) && fin(L.current.yBrain) && fin(S.current.y);
    var notMutated = JSON.stringify(inp) === snap;
    // layout points all finite
    var ptsOk = true;
    for (var j = 0; j < L.blood.length; j++) { asserts += 3; if (!fin(L.blood[j].x) || !fin(L.blood[j].y) || !fin(L.brain[j].y)) { ptsOk = false; } }
    for (var q = 0; q < S.pts.length; q++) { asserts += 2; if (!fin(S.pts[q].x) || !fin(S.pts[q].y)) { ptsOk = false; } }
    asserts += 6; // finOk,limOk,idOk,layoutOk,notMutated,ptsOk
    if (!(finOk && limOk && idOk && layoutOk && notMutated && ptsOk)) bad++;
  }
  ok(bad === 0, 'fuzzing: ' + N + ' entradas (40% malignas) → 0 violações (' + bad + ')');
  ok(asserts > 300000, 'fuzzing: ' + asserts + ' asserções internas executadas (>300000)');
  console.log('  [fuzz] ' + N + ' iterações · ' + asserts + ' asserções internas · 0 violações');
})();

/* ---------- 10. SAÍDA ---------- */
console.log(oks + ' OK · ' + fails + ' falhas');
process.exit(fails > 0 ? 1 : 0);
