/* FILTRA · M15 — robustez (0 falhas ou não entra) */
var M = require('./model15.js');
var renalState = M.renalState, renalLayout = M.renalLayout;
var oks = 0, fails = 0;
function ok(c, m) { if (c) oks++; else { fails++; console.log('  FALHA: ' + m); } }
function near(a, b, t) { return Math.abs(a - b) <= (t || 1e-7); }
function fin(x) { return typeof x === 'number' && isFinite(x); }

/* 1. BASE */
(function () {
  var pre = renalState({ avidez: 1 });
  ok(pre.FENa < 1 && pre.classe === 'pré-renal', 'base: avidez máxima → FENa<1, pré-renal');
  ok(pre.uOsm > 600 && pre.bunCr > 20, 'base: pré-renal concentra (U_osm alta, BUN:Cr alta)');
  var nta = renalState({ avidez: 0 });
  ok(nta.FENa > 2 && nta.classe === 'NTA (intrínseca)', 'base: avidez nula → FENa>2, NTA');
  ok(nta.uOsm < 360, 'base: NTA isosmótica');
})();

/* 2. IDENTIDADES */
(function () {
  for (var i = 0; i <= 10; i++) {
    var a = i / 10, r = renalState({ avidez: a });
    ok(near(r.FENa, Math.max(0.1, Math.min((3.4 - a * 3.2), 10)), 1e-9), 'id: FENa = 3,4 − avidez·3,2 (clamp)');
    ok(near(r.uOsm, 300 + a * 420, 1e-9), 'id: U_osm = 300 + avidez·420');
    ok(r.FENa >= 0.1 && r.FEurea >= 5 && r.uNa >= 5, 'id: índices nos clamps');
  }
})();

/* 3. LEIS */
(function () {
  ok(renalState({ avidez: 1 }).FENa < renalState({ avidez: 0 }).FENa, 'lei: avidez↑ → FENa↓');
  ok(renalState({ avidez: 1 }).FEurea < renalState({ avidez: 0 }).FEurea, 'lei: avidez↑ → FE_ureia↓');
  ok(renalState({ avidez: 1 }).uNa < renalState({ avidez: 0 }).uNa, 'lei: avidez↑ → Na urinário↓');
  ok(renalState({ avidez: 1 }).uOsm > renalState({ avidez: 0 }).uOsm, 'lei: avidez↑ → U_osm↑');
  ok(renalState({ avidez: 1 }).bunCr > renalState({ avidez: 0 }).bunCr, 'lei: avidez↑ → BUN:Cr↑');
  ok(renalState({ avidez: 0.8, diuretic: 1 }).FENa > renalState({ avidez: 0.8, diuretic: 0 }).FENa, 'lei: diurético → FENa↑');
})();

/* 4. PÉROLAS */
(function () {
  // diurético confunde a FENa numa pré-renal, mas a FE_ureia continua baixa
  var pre = renalState({ avidez: 0.85, diuretic: 1 });
  ok(pre.FENa >= 1 && pre.FEurea < 35 && pre.fenaEnganosa, 'pérola: diurético eleva FENa (enganosa), FE_ureia fica baixa');
  ok(pre.classe === 'pré-renal', 'pérola: com diurético, classifica pela FE_ureia → pré-renal');
  // pré-renal sem diurético: FENa baixa coerente
  ok(renalState({ avidez: 0.9 }).classe === 'pré-renal', 'pérola: pré-renal sem diurético → FENa<1');
  // muddy brown na NTA
  ok(renalState({ avidez: 0.1 }).sedimento.indexOf('granulosos') >= 0, 'pérola: NTA → cilindros granulosos pigmentados');
  ok(renalState({ avidez: 0.95 }).sedimento.indexOf('hialinos') >= 0, 'pérola: pré-renal → cilindros hialinos');
})();

/* 5. DETERMINISMO */
(function () {
  var inp = { avidez: 0.7, diuretic: 1 };
  ok(JSON.stringify(renalState(inp)) === JSON.stringify(renalState(inp)), 'determinismo: saída idêntica');
  var frozen = Object.freeze({ avidez: 0.3 });
  var a, threw = false; try { a = renalState(frozen); } catch (e) { threw = true; }
  ok(!threw && fin(a.FENa), 'determinismo: Object.freeze não lança');
  ok(frozen.avidez === 0.3, 'determinismo: entrada não mutada');
})();

/* 6. ROBUSTEZ */
(function () {
  var maus = [undefined, null, {}, { avidez: NaN }, { avidez: 'x' }, { avidez: -5 }, { avidez: 1e9 },
    { diuretic: NaN }, { diuretic: 9 }, { avidez: Infinity, diuretic: -2 }];
  maus.forEach(function (m, i) {
    var r = renalState(m);
    ok(fin(r.FENa) && fin(r.FEurea) && fin(r.uNa) && fin(r.uOsm) && fin(r.bunCr) && typeof r.classe === 'string', 'robustez[' + i + ']: finito');
    ok(r.FENa >= 0.1 && r.FENa <= 10 && r.FEurea >= 5 && r.FEurea <= 90 && r.uOsm >= 280 && r.uOsm <= 900, 'robustez[' + i + ']: clamps');
  });
})();

/* 7. FUZZING ≥5000 */
(function () {
  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  var rnd = mulberry32(0x1572E), N = 6000, bad = 0;
  function val() { var r = rnd(); if (r < 0.3) { var pool = [NaN, Infinity, -Infinity, 1e12, -1e12, 'x', null, undefined]; return pool[(rnd() * pool.length) | 0]; } return (r - 0.1) * 1.4; }
  for (var i = 0; i < N; i++) {
    var inp = { avidez: val(), diuretic: rnd() < 0.5 ? 1 : 0 };
    var r = renalState(inp); var L = renalLayout(inp, 900, 360);
    var good = fin(r.FENa) && fin(r.FEurea) && fin(r.uNa) && fin(r.uOsm) && fin(r.upCr) && fin(r.bunCr) &&
      typeof r.classe === 'string' && typeof r.sedimento === 'string' &&
      r.FENa >= 0.1 && r.FENa <= 10 && r.FEurea >= 5 && r.FEurea <= 90 && r.uNa >= 5 && r.uNa <= 140 &&
      r.uOsm >= 280 && r.uOsm <= 900 && r.bunCr >= 8 && r.bunCr <= 40 &&
      L && fin(L.current.x) && fin(L.current.y);
    if (!good) bad++;
  }
  ok(bad === 0, 'fuzzing: ' + N + ' entradas (30% malignas) → 0 violações (' + bad + ')');
})();

/* 8. SAÍDA */
console.log(oks + ' OK · ' + fails + ' falhas');
process.exit(fails > 0 ? 1 : 0);
