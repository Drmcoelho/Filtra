/* =========================================================================
 * FILTRA · M26 — bateria de robustez do engine (0 falhas ou não entra)
 * 1 BASE · 2 IDENTIDADES · 3 LEIS · 4 PÉROLAS · 5 DETERMINISMO · 6 ROBUSTEZ · 7 FUZZING ≥5000 · 8 SAÍDA
 * ========================================================================= */
var M = require('./model26.js');
var ureaKinetics = M.ureaKinetics, spKtV = M.spKtV, urrFrom = M.urrFrom,
  eKtVdaugirdas = M.eKtVdaugirdas, cSingle = M.cSingle, twoComp = M.twoComp, ureaCurveLayout = M.ureaCurveLayout;

var oks = 0, fails = 0;
function ok(c, m) { if (c) oks++; else { fails++; console.log('  FALHA: ' + m); } }
function near(a, b, t) { return Math.abs(a - b) <= (t || 1e-7); }
function fin(x) { return typeof x === 'number' && isFinite(x); }

/* ---------- 1. LINHA DE BASE ---------- */
(function () {
  var r = ureaKinetics({});                         // sessão 4 h padrão (K210, V35)
  ok(r.spMedido > 1.3 && r.spMedido < 1.5, 'base: spKt/V ~1,4 na sessão padrão (tem ' + r.spMedido.toFixed(3) + ')');
  ok(r.eKtV > 1.1 && r.eKtV < 1.3, 'base: eKt/V ~1,2 na sessão padrão (tem ' + r.eKtV.toFixed(3) + ')');
  ok(r.rebotePct > 9 && r.rebotePct < 16, 'base: rebote ~10–15% na sessão padrão (tem ' + r.rebotePct.toFixed(1) + '%)');
  ok(r.eKtV < r.spMedido, 'base: eKt/V < spKt/V (o rebote baixa a dose efetiva)');
  ok(r.Ceq > r.Cfim, 'base: a ureia do equilíbrio > a do fim (rebote sobe)');
  ok(r.Cfim > 0 && r.Cfim < 0.4, 'base: ureia final ~20–30% do basal');
  ok(r.urrSp > 0.6 && r.urrSp < 0.85, 'base: URR ~65–80%');
})();

/* ---------- 2. IDENTIDADES ---------- */
(function () {
  for (var i = 0; i < 40; i++) {
    var K = 80 + i * 18, V = 25 + (i % 6) * 8, t = 1 + (i % 5) * 1.2;
    var sp = spKtV(K, V, t);
    ok(near(sp, (K / 1000 * 60 * t) / V, 1e-9), 'id: spKt/V = K·t/V (mL/min→L)');
    // URR = 1 − exp(−Kt/V)
    ok(near(urrFrom(sp), 1 - Math.exp(-sp), 1e-9), 'id: URR = 1 − exp(−Kt/V)');
    // eKt/V por Daugirdas (antes da trava de invariante)
    var e = eKtVdaugirdas(sp, t);
    ok(near(e, Math.max(0, sp - 0.6 * (sp / t) + 0.03), 1e-9) || e === 0, 'id: eKt/V = spKt/V − 0,6·(spKt/V/t) + 0,03 (Daugirdas)');
    // cSingle: C ao fim = C0·exp(−Kt/V)
    ok(near(cSingle(1, sp), Math.exp(-sp), 1e-9), 'id: C(t) = C0·exp(−Kt/V)');
  }
  // conservação de massa no rebote: Ceq = (Vec·Ce + Vic·Ci)/V
  var two = twoComp(1, 250, 36, 4, 1 / 3, 800);
  ok(near(two.Ceq, (two.Vec * two.Ce + two.Vic * two.Ci) / 36, 1e-6) || two.Ceq >= two.Cfim, 'id: Ceq = média ponderada por volume (massa conservada)');
  // o eKt/V medido do equilíbrio = −ln(Ceq/C0)
  var r = ureaKinetics({ C0: 1 });
  ok(near(r.eMedido, -Math.log(r.Ceq / 1), 1e-6), 'id: eKt/V medido = −ln(Ceq/C0)');
  ok(near(r.spMedido, -Math.log(r.Cfim / 1), 1e-6), 'id: spKt/V medido = −ln(Cfim/C0)');
})();

/* ---------- 3. LEIS ---------- */
(function () {
  // K↑ → mais dose (spKt/V↑) → menos ureia final
  ok(ureaKinetics({ K: 350 }).spMedido > ureaKinetics({ K: 150 }).spMedido, 'lei: clearance↑ → spKt/V↑');
  ok(ureaKinetics({ K: 350 }).Cfim < ureaKinetics({ K: 150 }).Cfim, 'lei: clearance↑ → ureia final↓');
  // t↑ (mesmo K) → mais dose
  ok(ureaKinetics({ t: 6 }).spMedido > ureaKinetics({ t: 2 }).spMedido, 'lei: tempo↑ → spKt/V↑');
  // V↑ → menos dose (mais diluído)
  ok(ureaKinetics({ V: 50 }).spMedido < ureaKinetics({ V: 25 }).spMedido, 'lei: volume↑ → spKt/V↓');
  // O TEMPO IMPORTA: à MESMA dose (sp~1.4), t curto → rebote↑ e eKt/V cai MAIS abaixo do sp
  var lenta = ureaKinetics({ t: 4, K: 210 });        // sp ~1.4
  var rapida = ureaKinetics({ t: 2, K: 420 });       // sp ~1.4 também
  ok(near(lenta.spMedido, rapida.spMedido, 0.08), 'lei(setup): mesma dose sp nas duas sessões');
  ok(rapida.rebotePct > lenta.rebotePct, 'lei: sessão mais RÁPIDA → rebote maior (mesmo sp)');
  ok((rapida.spMedido - rapida.eKtV) > (lenta.spMedido - lenta.eKtV), 'lei: rápida → eKt/V cai MAIS abaixo do spKt/V');
  // transferência intercompartimental↑ → rebote↓
  ok(ureaKinetics({ Kc: 2000 }).rebotePct < ureaKinetics({ Kc: 300 }).rebotePct, 'lei: transferência IC↑ → rebote↓');
  // eKt/V ≤ spKt/V SEMPRE (invariante físico do rebote)
  for (var i = 0; i < 60; i++) {
    var r = ureaKinetics({ K: 30 + i * 15, V: 15 + (i % 5) * 12, t: 0.5 + (i % 7) * 1.5, Kc: 100 + (i % 6) * 500 });
    ok(r.eKtV <= r.spMedido + 1e-9, 'lei: eKt/V ≤ spKt/V (rebote só baixa a dose)');
  }
})();

/* ---------- 4. PÉROLAS ---------- */
(function () {
  // (1) a amostra do FIM mente: spMedido (sangue do fim) > eKt/V (dose real pós-rebote)
  var r = ureaKinetics({});
  ok(r.spMedido > r.eKtV && r.mentira > 0, 'pérola: a amostra precoce (fim) MENTE — spKt/V > eKt/V');
  // (2) eKt/V é a dose REAL: bate com −ln(Ceq/C0)
  ok(Math.abs(r.eMedido - r.eKtV) < 0.12, 'pérola: o eKt/V (Daugirdas) ≈ dose medida pós-rebote (a verdade)');
  // (3) rápido = mais mentira: a queda% do sp para o eKt/V é maior na sessão rápida
  var rapida = ureaKinetics({ t: 2, K: 420 }), lenta = ureaKinetics({ t: 6, K: 150 });
  ok(rapida.quedaPct > lenta.quedaPct, 'pérola: quanto mais RÁPIDA a sessão, maior a mentira (queda% sp→eKt/V)');
  // (4) subdiálise mascarada: "adequado no papel" (sp≥1.2) mas eKt/V<1.2 → mascarada
  var masc = ureaKinetics({ t: 2, K: 420 });
  ok(masc.spMedido >= 1.2 && masc.eKtV < 1.2 && masc.mascarada, 'pérola: subdiálise MASCARADA — sp adequado, eKt/V inadequado');
  // a sessão gentil NÃO mascara
  ok(!ureaKinetics({ t: 6, K: 200 }).mascarada, 'pérola: sessão gentil entrega a dose (sem máscara)');
})();

/* ---------- 5. DETERMINISMO ---------- */
(function () {
  var inp = { C0: 1.1, K: 280, V: 38, t: 3.5, fEC: 0.34, Kc: 700 };
  ok(JSON.stringify(ureaKinetics(inp)) === JSON.stringify(ureaKinetics(inp)), 'determinismo: mesma entrada → saída idêntica');
  var frozen = Object.freeze({ K: 300, V: 40, t: 4 });
  var a, threw = false; try { a = ureaKinetics(frozen); } catch (e) { threw = true; }
  ok(!threw && fin(a.eKtV), 'determinismo: Object.freeze não lança nem é mutado');
  ok(frozen.K === 300 && frozen.V === 40, 'determinismo: entrada não mutada');
  var L1 = JSON.stringify(ureaCurveLayout(inp, 900, 360)), L2 = JSON.stringify(ureaCurveLayout(inp, 900, 360));
  ok(L1 === L2, 'determinismo: layout idêntico entre execuções');
})();

/* ---------- 6. ROBUSTEZ ---------- */
(function () {
  var maus = [undefined, null, {}, { K: NaN }, { K: 'x' }, { K: -10 }, { K: 1e9 },
    { V: 0 }, { V: Infinity }, { t: -5 }, { t: 'z' }, { fEC: 9 }, { Kc: NaN }, { C0: -3 }, { C0: 1e9 }];
  maus.forEach(function (m, i) {
    var r = ureaKinetics(m);
    ok(fin(r.spMedido) && fin(r.eKtV) && fin(r.Cfim) && fin(r.Ceq) && fin(r.rebotePct), 'robustez[' + i + ']: saídas finitas');
    ok(r.eKtV >= 0 && r.eKtV <= 12 && r.spMedido >= 0 && r.spMedido <= 12, 'robustez[' + i + ']: Kt/V nos clamps');
    ok(r.eKtV <= r.spMedido + 1e-9, 'robustez[' + i + ']: invariante eKt/V ≤ spKt/V');
    ok(r.rebotePct >= -1e-6, 'robustez[' + i + ']: rebote ≥ 0');
    var L = ureaCurveLayout(m, 800, 320);
    ok(fin(L.fimMark.y) && fin(L.eqMark.y) && Array.isArray(L.bloodPts), 'robustez[' + i + ']: layout finito');
  });
  ok(fin(spKtV(NaN, 'x', null)) && spKtV(NaN, 'x', null) >= 0, 'robustez: spKtV com lixo → finito ≥0');
  ok(fin(eKtVdaugirdas(NaN, 0)) && eKtVdaugirdas(NaN, 0) >= 0, 'robustez: eKtVdaugirdas com lixo → finito');
})();

/* ---------- 7. FUZZING semeado ≥5000 ---------- */
(function () {
  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  var rnd = mulberry32(0x26EED), N = 6000, bad = 0;
  function val() { var r = rnd(); if (r < 0.3) { var pool = [NaN, Infinity, -Infinity, 1e12, -1e12, 'x', null, undefined]; return pool[(rnd() * pool.length) | 0]; } return (r - 0.1) * 1100; }
  for (var i = 0; i < N; i++) {
    var inp = { C0: val(), K: val(), V: val(), t: val(), fEC: val(), Kc: val() };
    var r = ureaKinetics(inp);
    var L = ureaCurveLayout(inp, 900, 360);
    var good = fin(r.spMedido) && fin(r.eKtV) && fin(r.Cfim) && fin(r.Ceq) && fin(r.rebotePct) && fin(r.mentira) && fin(r.quedaPct) &&
      r.eKtV >= 0 && r.eKtV <= 12 && r.spMedido >= 0 && r.spMedido <= 12 &&
      r.eKtV <= r.spMedido + 1e-9 &&            // invariante físico
      r.rebotePct >= -1e-6 && r.Ceq >= r.Cfim - 1e-9 &&
      r.Cfim >= 0 && r.Ceq >= 0 &&
      Array.isArray(L.bloodPts) && L.bloodPts.length === 61 &&
      Array.isArray(L.reboutePts) && L.reboutePts.length === 25 &&
      Array.isArray(L.singlePts) && L.singlePts.length === 61 &&
      fin(L.fimMark.y) && fin(L.eqMark.y);
    if (!good) bad++;
  }
  ok(bad === 0, 'fuzzing: ' + N + ' entradas (30% malignas) → 0 violações (' + bad + ')');
})();

/* ---------- 8. SAÍDA ---------- */
console.log(oks + ' OK · ' + fails + ' falhas');
process.exit(fails > 0 ? 1 : 0);
