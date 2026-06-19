/* FILTRA · M9 — robustez (0 falhas ou não entra) */
var M = require('./model9.js');
var volemia = M.volemia, fenaFrom = M.fenaFrom, volemiaLayout = M.volemiaLayout;
var oks = 0, fails = 0;
function ok(c, m) { if (c) oks++; else { fails++; console.log('  FALHA: ' + m); } }
function near(a, b, t) { return Math.abs(a - b) <= (t || 1e-7); }
function fin(x) { return typeof x === 'number' && isFinite(x); }

/* 1. BASE */
(function () {
  var r = volemia({});
  ok(r.FENa > 0.8 && r.FENa < 1.3, 'base: FENa ~1% no VCE normal');
  ok(near(r.aldo, 1, 1e-9), 'base: aldosterona ~normal');
  ok(!r.edema && !r.subenchimento, 'base: sem edema/subenchimento');
  ok(r.classe === 'euvolemia', 'base: euvolemia');
})();

/* 2. IDENTIDADES */
(function () {
  for (var i = 0; i < 30; i++) {
    var ecv = i / 15, r = volemia({ ecv: ecv });
    ok(near(r.aldo, Math.max(0, Math.min(2 - ecv, 2)), 1e-9), 'id: aldo = 2 − VCE (clamp)');
    ok(near(r.FENa, fenaFrom(r.ecv, r.map), 1e-9), 'id: FENa = fenaFrom(VCE, PA)');
    ok(r.FENa >= 0.1 && r.FENa <= 8, 'id: FENa nos clamps');
  }
})();

/* 3. LEIS */
(function () {
  ok(volemia({ ecv: 0.4 }).FENa < volemia({ ecv: 1.6 }).FENa, 'lei: VCE↓ → FENa↓ (retém Na)');
  ok(volemia({ ecv: 0.4 }).aldo > volemia({ ecv: 1.4 }).aldo, 'lei: VCE↓ → aldosterona↑');
  ok(volemia({ ecv: 0.4 }).sns > volemia({ ecv: 1.4 }).sns, 'lei: VCE↓ → simpático↑');
  ok(volemia({ totalECF: 2 }).anp > volemia({ totalECF: 0.8 }).anp, 'lei: ECF total↑ → ANP↑');
  ok(volemia({ ecv: 1, map: 140 }).FENa > volemia({ ecv: 1, map: 80 }).FENa, 'lei: PA↑ → natriurese de pressão (FENa↑)');
  ok(volemia({ totalECF: 1.6 }).edema && !volemia({ totalECF: 1 }).edema, 'lei: ECF total alto → edema');
})();

/* 4. PÉROLAS */
(function () {
  // ICC: ECF total alto MAS VCE baixo → retém Na apesar do edema (subenchimento)
  var icc = volemia({ ecv: 0.5, totalECF: 1.6, map: 90 });
  ok(icc.edema && icc.retencaoAvida && icc.subenchimento && icc.classe === 'subenchimento', 'pérola: ICC/cirrose = edema COM FENa baixa (efetivo ≠ total)');
  // sobrecarga verdadeira: VCE alto + ECF alto → natriurese (ANP), não retém
  var sob = volemia({ ecv: 1.5, totalECF: 1.6, map: 110 });
  ok(!sob.retencaoAvida && sob.anp > 1.3 && sob.classe === 'sobrecarga', 'pérola: sobrecarga verdadeira → natriurese (ANP), FENa não baixa');
  // hipovolemia: VCE e ECF baixos → retém, sem edema
  var hipo = volemia({ ecv: 0.4, totalECF: 0.7, map: 80 });
  ok(hipo.retencaoAvida && !hipo.edema && hipo.classe === 'hipovolemia', 'pérola: hipovolemia retém Na sem edema');
  // natriurese de pressão isolada
  ok(volemia({ ecv: 1, map: 160 }).FENa > 1.4, 'pérola: PA muito alta → natriurese de pressão marcante');
})();

/* 5. DETERMINISMO */
(function () {
  var inp = { ecv: 0.6, totalECF: 1.5, map: 88 };
  ok(JSON.stringify(volemia(inp)) === JSON.stringify(volemia(inp)), 'determinismo: saída idêntica');
  var frozen = Object.freeze({ ecv: 0.5, totalECF: 1.6 });
  var a, threw = false; try { a = volemia(frozen); } catch (e) { threw = true; }
  ok(!threw && fin(a.FENa), 'determinismo: Object.freeze não lança');
  ok(frozen.ecv === 0.5, 'determinismo: entrada não mutada');
})();

/* 6. ROBUSTEZ */
(function () {
  var maus = [undefined, null, {}, { ecv: NaN }, { ecv: 'x' }, { ecv: -5 }, { totalECF: Infinity },
    { map: NaN }, { map: -100 }, { ecv: 1e9 }, { totalECF: 1e9 }, { map: 1e9 }];
  maus.forEach(function (m, i) {
    var r = volemia(m);
    ok(fin(r.FENa) && fin(r.aldo) && fin(r.anp) && fin(r.urineNa), 'robustez[' + i + ']: finito');
    ok(r.FENa >= 0.1 && r.FENa <= 8 && r.aldo >= 0 && r.aldo <= 2, 'robustez[' + i + ']: clamps');
    ok(r.urineNa >= 5 && r.urineNa <= 130, 'robustez[' + i + ']: urineNa nos clamps');
  });
})();

/* 7. FUZZING ≥5000 */
(function () {
  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  var rnd = mulberry32(0xD3A1), N = 6000, bad = 0;
  function val() { var r = rnd(); if (r < 0.3) { var pool = [NaN, Infinity, -Infinity, 1e12, -1e12, 'x', null, undefined]; return pool[(rnd() * pool.length) | 0]; } return (r - 0.1) * 5; }
  function valM() { var r = rnd(); if (r < 0.3) { var pool = [NaN, Infinity, -Infinity, 1e12, 'x', null]; return pool[(rnd() * pool.length) | 0]; } return r * 260; }
  for (var i = 0; i < N; i++) {
    var inp = { ecv: val(), totalECF: val(), map: valM() };
    var r = volemia(inp); var L = volemiaLayout(inp, 900, 360);
    var good = fin(r.FENa) && fin(r.aldo) && fin(r.anp) && fin(r.urineNa) && fin(r.sns) &&
      r.FENa >= 0.1 && r.FENa <= 8 && r.aldo >= 0 && r.aldo <= 2 && r.anp >= 0 && r.anp <= 3 &&
      r.urineNa >= 5 && r.urineNa <= 130 &&
      Array.isArray(L.pts) && L.pts.length === 57 && fin(L.current.y);
    if (!good) bad++;
  }
  ok(bad === 0, 'fuzzing: ' + N + ' entradas (30% malignas) → 0 violações (' + bad + ')');
})();

/* 8. SAÍDA */
console.log(oks + ' OK · ' + fails + ' falhas');
process.exit(fails > 0 ? 1 : 0);
