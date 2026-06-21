/* =========================================================================
 * FILTRA · M22 — bateria de robustez do engine (0 falhas ou não entra)
 * 1 BASE · 2 IDENTIDADES · 3 LEIS · 4 PÉROLAS · 5 DETERMINISMO · 6 ROBUSTEZ · 7 FUZZING ≥5000 · 8 SAÍDA
 * ========================================================================= */
var M = require('./model22.js');
var hdi = M.hdi, ktOverV = M.ktOverV, concAt = M.concAt, clearanceParaAlvo = M.clearanceParaAlvo, ureaCurveLayout = M.ureaCurveLayout;

var oks = 0, fails = 0;
function ok(c, m) { if (c) oks++; else { fails++; console.log('  FALHA: ' + m); } }
function near(a, b, t) { return Math.abs(a - b) <= (t || 1e-7); }
function fin(x) { return typeof x === 'number' && isFinite(x); }

/* ---------- 1. LINHA DE BASE ---------- */
(function () {
  var r = hdi({});
  ok(r.KtV > 1.1 && r.KtV < 1.45, 'base: sessão 4 h padrão → Kt/V ~1,2-1,4 (' + r.KtV.toFixed(2) + ')');
  ok(r.urrPct > 64 && r.urrPct < 71, 'base: URR ~65-70% (' + r.urrPct.toFixed(1) + '%)');
  ok(r.ct < r.c0, 'base: concentração pós < pré (a sessão remove)');
  ok(r.cMean > r.ct && r.cMean < r.c0, 'base: a média-no-tempo fica entre o pré e o pós');
  ok(r.ctEq > r.ct, 'base: rebote pós-diálise sobe a ureia');
  ok(r.doseAdequada && !r.subdialise, 'base: dose adequada (Kt/V ≥ 1,2)');
})();

/* ---------- 2. IDENTIDADES ---------- */
(function () {
  for (var i = 0; i < 40; i++) {
    var c0 = 30 + i * 8, K = 80 + (i % 6) * 70, V = 28 + (i % 5) * 9, t = 1 + (i % 5) * 1.0;
    var r = hdi({ c0: c0, K: K, V: V, t: t });
    // Kt/V = (K·t·60)/(V·1000)
    ok(near(r.KtV, (K * t * 60) / (V * 1000), 1e-7), 'id: Kt/V = (K·t·60)/(V·1000)');
    // C(t) = C0·exp(−Kt/V)
    ok(near(r.ct, c0 * Math.exp(-r.KtV), 1e-7), 'id: Ct = C0·exp(−Kt/V)');
    // URR = 1 − Ct/C0 = 1 − exp(−Kt/V)
    ok(near(r.urr, 1 - r.ct / c0, 1e-9), 'id: URR = 1 − Ct/C0');
    ok(near(r.urr, 1 - Math.exp(-r.KtV), 1e-9), 'id: URR = 1 − exp(−Kt/V)');
    // média-no-tempo: (C0−Ct)/(Kt/V)
    ok(near(r.cMean, (c0 - r.ct) / r.KtV, 1e-6), 'id: cMean = (C0−Ct)/(Kt/V)');
  }
  // concAt em t=0 = c0; concAt monotônica
  ok(near(concAt(80, 210, 42, 0), 80, 1e-9), 'id: C(0) = C0');
  ok(near(hdi({ t: 0 }).ct, hdi({ t: 0 }).c0, 1e-9), 'id: t=0 → nada removido (Ct=C0)');
  // ktOverV bate com hdi
  ok(near(ktOverV(210, 4, 42), hdi({ K: 210, t: 4, V: 42 }).KtV, 1e-9), 'id: ktOverV ≡ hdi.KtV');
})();

/* ---------- 3. LEIS ---------- */
(function () {
  // t↑ → Kt/V↑ e URR↑
  ok(hdi({ t: 5 }).KtV > hdi({ t: 3 }).KtV, 'lei: t↑ → Kt/V↑');
  ok(hdi({ t: 5 }).urr > hdi({ t: 3 }).urr, 'lei: t↑ → URR↑');
  // K↑ → Kt/V↑
  ok(hdi({ K: 300 }).KtV > hdi({ K: 150 }).KtV, 'lei: K (clearance)↑ → Kt/V↑');
  // V↑ → Kt/V↓ (mesma máquina, mais volume → dose relativa menor)
  ok(hdi({ V: 60 }).KtV < hdi({ V: 30 }).KtV, 'lei: V (ÁGT)↑ → Kt/V↓');
  // a remoção DESACELERA: taxa no fim < taxa no início (gradiente que decai)
  var r = hdi({});
  ok(r.taxaFinal < r.taxaInicial && r.desaceleracao > 0, 'lei: a remoção desacelera (taxa fim < taxa início — gradiente cai)');
  // mais c0 → mais removido em valor absoluto
  ok(hdi({ c0: 120 }).removido > hdi({ c0: 60 }).removido, 'lei: c0↑ → mais ureia removida (mg/dL)');
  // exponencial: a queda na 1ª metade da sessão > queda na 2ª metade
  var meio = concAt(80, 210, 42, 2), fim = concAt(80, 210, 42, 4);
  ok((80 - meio) > (meio - fim), 'lei: cinética exponencial — cai mais na 1ª metade que na 2ª');
})();

/* ---------- 4. PÉROLAS ---------- */
(function () {
  // MESMA Kt/V por CAMINHOS diferentes (eficiência × tempo): muito K em pouco t == menos K em mais t
  var Kcurto = clearanceParaAlvo(1.2, 2, 42);   // alta eficiência, 2 h
  var Klongo = clearanceParaAlvo(1.2, 6, 42);   // gentil, 6 h
  var rCurto = hdi({ K: Kcurto, t: 2, V: 42 });
  var rLongo = hdi({ K: Klongo, t: 6, V: 42 });
  ok(near(rCurto.KtV, rLongo.KtV, 1e-6) && near(rCurto.ct, rLongo.ct, 1e-6),
    'pérola: a MESMA Kt/V vem de caminhos diferentes (alta eficiência × gentil)');
  // ...mas a EFICIÊNCIA (oscilação) é muito maior no caminho curto — o custo do intermitente
  ok(rCurto.eficiencia > rLongo.eficiencia * 2, 'pérola: mesma dose, eficiência (oscilação) bem maior no curto');
  // intermitente OSCILA ≠ contínuo: grande balanço pré→pós numa sessão eficiente
  var ef = hdi({ K: 350, t: 4 });
  ok(ef.oscilacaoGrande && ef.urrPct > 70, 'pérola: o intermitente oscila — grande balanço pré/pós (≠ o rim contínuo)');
  // a MÉDIA-NO-TEMPO importa: a exposição urêmica real é cMean, não o Ct pós (que é o vale)
  var rr = hdi({});
  ok(rr.cMean > rr.ct, 'pérola: a média-no-tempo (exposição real) > o Ct pós (o vale) — não leia só o pós');
  // rebote: o pós-diálise sobe — o Ct medido logo após subestima a ureia equilibrada
  ok(rr.ctEq > rr.ct && rr.urrEq < rr.urr, 'pérola: o rebote sobe a ureia → a URR "real" (equilibrada) é menor');
})();

/* ---------- 5. DETERMINISMO ---------- */
(function () {
  var inp = { c0: 95, K: 260, V: 38, t: 3.5, reboteFrac: 0.1 };
  ok(JSON.stringify(hdi(inp)) === JSON.stringify(hdi(inp)), 'determinismo: mesma entrada → saída idêntica');
  var frozen = Object.freeze({ c0: 100, K: 200, t: 4 });
  var a, threw = false; try { a = hdi(frozen); } catch (e) { threw = true; }
  ok(!threw && fin(a.KtV), 'determinismo: Object.freeze não lança nem é mutado');
  ok(frozen.c0 === 100, 'determinismo: entrada não mutada');
})();

/* ---------- 6. ROBUSTEZ ---------- */
(function () {
  var maus = [undefined, null, {}, { c0: NaN }, { K: 'x' }, { V: -10 }, { t: 1e9 },
    { c0: Infinity }, { K: -50 }, { V: 0 }, { t: -3 }, { reboteFrac: 9 },
    { c0: 'z', K: null, V: NaN, t: 'q' }];
  maus.forEach(function (m, i) {
    var r = hdi(m);
    ok(fin(r.KtV) && fin(r.ct) && fin(r.urr) && fin(r.cMean) && fin(r.ctEq), 'robustez[' + i + ']: saídas finitas');
    ok(r.KtV >= 0 && r.KtV <= 12 && r.ct >= 0 && r.ct <= 400, 'robustez[' + i + ']: nos clamps');
    ok(r.urr >= 0 && r.urr <= 1, 'robustez[' + i + ']: URR ∈ [0,1]');
  });
  ok(concAt(NaN, 'x', -1, 'z') >= 0 && fin(concAt(NaN, 'x', -1, 'z')), 'robustez: concAt com lixo → finito ≥0');
  ok(fin(clearanceParaAlvo(NaN, -1, 'x')), 'robustez: clearanceParaAlvo com lixo → finito');
})();

/* ---------- 7. FUZZING semeado ≥5000 ---------- */
(function () {
  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  var rnd = mulberry32(0x22FE3), N = 6000, bad = 0;
  function val() { var r = rnd(); if (r < 0.3) { var pool = [NaN, Infinity, -Infinity, 1e12, -1e12, 'x', null, undefined]; return pool[(rnd() * pool.length) | 0]; } return (r - 0.15) * 800; }
  for (var i = 0; i < N; i++) {
    var inp = { c0: val(), K: val(), V: val(), t: val(), reboteFrac: val() };
    var r = hdi(inp);
    var L = ureaCurveLayout(inp, 900, 360);
    var good = fin(r.KtV) && fin(r.ct) && fin(r.urr) && fin(r.cMean) && fin(r.ctEq) && fin(r.eficiencia) &&
      r.KtV >= 0 && r.KtV <= 12 && r.ct >= 0 && r.ct <= 400 && r.urr >= 0 && r.urr <= 1 &&
      r.cMean >= 0 && r.cMean <= 400 && r.ctEq >= 0 && r.ctEq <= 400 &&
      Array.isArray(L.pts) && L.pts.length === 61 && fin(L.current.y);
    if (!good) bad++;
  }
  ok(bad === 0, 'fuzzing: ' + N + ' entradas (30% malignas) → 0 violações (' + bad + ')');
})();

/* ---------- 8. SAÍDA ---------- */
console.log(oks + ' OK · ' + fails + ' falhas');
process.exit(fails > 0 ? 1 : 0);
