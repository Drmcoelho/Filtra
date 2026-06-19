/* =========================================================================
 * FILTRA · M4 — bateria de robustez do engine (0 falhas ou não entra)
 * 1 BASE · 2 IDENTIDADES · 3 LEIS · 4 PÉROLAS · 5 DETERMINISMO · 6 ROBUSTEZ · 7 FUZZING ≥5000 · 8 SAÍDA
 * ========================================================================= */
var M = require('./model4.js');
var clearance = M.clearance, pcrEquilibrio = M.pcrEquilibrio, clearanceMedido = M.clearanceMedido, pcrCurveLayout = M.pcrCurveLayout;

var oks = 0, fails = 0;
function ok(c, m) { if (c) oks++; else { fails++; console.log('  FALHA: ' + m); } }
function near(a, b, t) { return Math.abs(a - b) <= (t || 1e-7); }
function fin(x) { return typeof x === 'number' && isFinite(x); }

/* ---------- 1. LINHA DE BASE ---------- */
(function () {
  var r = clearance({});
  ok(r.pcrAtual > 0.6 && r.pcrAtual < 1.0, 'base: Pcr normal ~0,8 mg/dL (TFG 120, massa normal)');
  ok(r.ccrMedido > r.gfr, 'base: clearance de creatinina > TFG (secreção)');
  ok(near(r.eGFRcistatina, r.gfr), 'base: cistatina rastreia a TFG verdadeira');
  ok(Math.abs(r.erroEgfr) < 5, 'base: em condições padrão, eGFR-creatinina ≈ TFG');
  ok(!r.enganaPorMusculo && !r.foraEquilibrio, 'base: sem mentira de massa nem fora de equilíbrio');
  // inulina como padrão-ouro: clearance medido = TFG quando U·V/P bate
  ok(near(clearanceMedido(125, 1, 1), 125), 'base: clearance medido = U·V̇/P (inulina)');
})();

/* ---------- 2. IDENTIDADES ---------- */
(function () {
  for (var i = 0; i < 40; i++) {
    var gfr = 10 + i * 3;
    var r = clearance({ gfr: gfr, muscleFactor: 0.4 + (i % 5) * 0.3, secrecaoFrac: (i % 4) * 0.1 });
    ok(near(r.ccrMedido, r.gfr * (1 + r.secrecaoFrac), 1e-6), 'id: Ccr = TFG·(1+secreção)');
    ok(near(r.producao, r.muscleFactor * M.PROD_STD, 1e-6), 'id: produção = massa × padrão');
    ok(near(r.pcrSSnova, pcrEquilibrio(r.gfr, r.producao, r.secrecaoFrac), 1e-9), 'id: PcrSS = pcrEquilibrio(TFG,produção,secr)');
    ok(r.pcrAtual >= 0.05 && r.pcrAtual <= 60, 'id: Pcr nos clamps');
  }
  // identidade cinética: t=0 → Pcr velha; t enorme → Pcr nova
  var a = clearance({ gfr: 20, gfrPrev: 120, tempoDias: 0 });
  ok(near(a.pcrAtual, a.pcrSSvelha, 1e-6), 'id: t=0 → Pcr = equilíbrio ANTIGO');
  var b = clearance({ gfr: 20, gfrPrev: 120, tempoDias: 60 });
  ok(Math.abs(b.pcrAtual - b.pcrSSnova) < 0.05, 'id: t grande → Pcr → novo equilíbrio');
})();

/* ---------- 3. LEIS ---------- */
(function () {
  // hipérbole: TFG↓ → Pcr↑
  ok(clearance({ gfr: 30 }).pcrAtual > clearance({ gfr: 120 }).pcrAtual, 'lei: TFG↓ → Pcr↑ (hipérbole)');
  // faixa cega: cair de 120→60 mexe pouco; de 60→30 mexe muito (não-linear)
  var d1 = clearance({ gfr: 60 }).pcrAtual - clearance({ gfr: 120 }).pcrAtual;
  var d2 = clearance({ gfr: 30 }).pcrAtual - clearance({ gfr: 60 }).pcrAtual;
  ok(d2 > d1, 'lei: faixa cega — o mesmo ΔTFG move mais a Pcr em TFG baixa');
  // massa muscular: mais massa → mais produção → Pcr↑
  ok(clearance({ muscleFactor: 1.6 }).pcrAtual > clearance({ muscleFactor: 0.4 }).pcrAtual, 'lei: massa↑ → Pcr↑');
  // secreção: mais secreção → Ccr maior, Pcr menor
  ok(clearance({ secrecaoFrac: 0.4 }).pcrAtual < clearance({ secrecaoFrac: 0 }).pcrAtual, 'lei: secreção↑ → Pcr↓ (Ccr superestima)');
  // cinética: mais tempo após queda → Pcr maior (sobe rumo à nova SS)
  ok(clearance({ gfr: 20, gfrPrev: 120, tempoDias: 5 }).pcrAtual > clearance({ gfr: 20, gfrPrev: 120, tempoDias: 0.5 }).pcrAtual, 'lei: pós-queda, Pcr sobe com o tempo');
  // τ maior quando TFG menor (clearance menor → relaxa mais devagar)
  ok(clearance({ gfr: 15 }).tau > clearance({ gfr: 120 }).tau, 'lei: TFG baixa → τ maior (creatinina mais lenta)');
})();

/* ---------- 4. PÉROLAS ---------- */
(function () {
  // (1) massa baixa esconde TFG baixa: creatinina "normal" com TFG 40
  var idoso = clearance({ gfr: 40, muscleFactor: 0.4 });
  ok(idoso.creatininaParecesNormal && idoso.enganaPorMusculo, 'pérola: pouca massa → creatinina normal com TFG baixa (a mentira da massa)');
  // (2) fase aguda: TFG despencou mas a creatinina ainda atrasa (subestima a lesão)
  var aguda = clearance({ gfr: 15, gfrPrev: 120, tempoDias: 1 });
  ok(aguda.foraEquilibrio && aguda.eGFRcreatNaive > aguda.gfr + 10, 'pérola: na fase aguda a creatinina atrasa → eGFR superestima a TFG');
  // (3) secreção: o clearance de creatinina mede mais que a TFG verdadeira
  ok(clearance({}).superestimaPorSecrecao, 'pérola: secreção tubular → Ccr superestima a TFG');
  // cistatina não mente por massa
  var cys = clearance({ gfr: 40, muscleFactor: 0.4 });
  ok(near(cys.eGFRcistatina, 40), 'pérola: a cistatina C rastreia a TFG (independe da massa)');
})();

/* ---------- 5. DETERMINISMO ---------- */
(function () {
  var inp = { gfr: 55, gfrPrev: 90, tempoDias: 3, muscleFactor: 0.8, secrecaoFrac: 0.15 };
  ok(JSON.stringify(clearance(inp)) === JSON.stringify(clearance(inp)), 'determinismo: mesma entrada → saída idêntica');
  var frozen = Object.freeze({ gfr: 70, muscleFactor: 1.2 });
  var a, threw = false; try { a = clearance(frozen); } catch (e) { threw = true; }
  ok(!threw && fin(a.pcrAtual), 'determinismo: Object.freeze não lança nem é mutado');
  ok(frozen.gfr === 70, 'determinismo: entrada não mutada');
})();

/* ---------- 6. ROBUSTEZ ---------- */
(function () {
  var maus = [undefined, null, {}, { gfr: NaN }, { gfr: 'x' }, { gfr: -10 }, { gfr: 1e9 },
    { muscleFactor: 0 }, { muscleFactor: Infinity }, { secrecaoFrac: 9 }, { tempoDias: -5 },
    { gfrPrev: NaN }, { tempoDias: 'z' }];
  maus.forEach(function (m, i) {
    var r = clearance(m);
    ok(fin(r.pcrAtual) && fin(r.ccrMedido) && fin(r.eGFRcreatNaive) && fin(r.tau), 'robustez[' + i + ']: saídas finitas');
    ok(r.pcrAtual >= 0.05 && r.pcrAtual <= 60, 'robustez[' + i + ']: Pcr nos clamps');
    ok(r.eGFRcreatNaive >= 1 && r.eGFRcreatNaive <= 300, 'robustez[' + i + ']: eGFR nos clamps');
  });
  // clearanceMedido com lixo
  ok(clearanceMedido(NaN, 'x', 0) >= 0 && fin(clearanceMedido(NaN, 'x', 0)), 'robustez: clearanceMedido com lixo → finito ≥0');
})();

/* ---------- 7. FUZZING semeado ≥5000 ---------- */
(function () {
  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  var rnd = mulberry32(0x5EED4), N = 6000, bad = 0;
  function val() { var r = rnd(); if (r < 0.3) { var pool = [NaN, Infinity, -Infinity, 1e12, -1e12, 'x', null, undefined]; return pool[(rnd() * pool.length) | 0]; } return (r - 0.15) * 260; }
  for (var i = 0; i < N; i++) {
    var inp = { gfr: val(), gfrPrev: val(), tempoDias: val(), muscleFactor: val(), secrecaoFrac: val() };
    var r = clearance(inp);
    var L = pcrCurveLayout(inp, 900, 360);
    var good = fin(r.pcrAtual) && fin(r.ccrMedido) && fin(r.eGFRcreatNaive) && fin(r.tau) && fin(r.erroEgfr) &&
      r.pcrAtual >= 0.05 && r.pcrAtual <= 60 && r.eGFRcreatNaive >= 1 && r.eGFRcreatNaive <= 300 &&
      r.ccrMedido >= 0 && r.tau > 0 &&
      Array.isArray(L.pts) && L.pts.length === 59 && fin(L.current.y);
    if (!good) bad++;
  }
  ok(bad === 0, 'fuzzing: ' + N + ' entradas (30% malignas) → 0 violações (' + bad + ')');
})();

/* ---------- 8. SAÍDA ---------- */
console.log(oks + ' OK · ' + fails + ' falhas');
process.exit(fails > 0 ? 1 : 0);
