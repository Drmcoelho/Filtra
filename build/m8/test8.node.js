/* FILTRA · M8 — robustez (0 falhas ou não entra) */
var M = require('./model8.js');
var collect = M.collect, emaxModel = M.emaxModel, kFromEnac = M.kFromEnac, collectLayout = M.collectLayout;
var oks = 0, fails = 0;
function ok(c, m) { if (c) oks++; else { fails++; console.log('  FALHA: ' + m); } }
function near(a, b, t) { return Math.abs(a - b) <= (t || 1e-7); }
function fin(x) { return typeof x === 'number' && isFinite(x); }

/* 1. BASE */
(function () {
  var r = collect({});
  ok(near(r.enac, 1), 'base: ENaC normal (aldo 1, sem fármaco)');
  ok(r.plasmaK > 3.7 && r.plasmaK < 4.1, 'base: K plasmático ~3,9');
  ok(r.urineOsm > 600 && r.urineOsm < 700, 'base: urina concentrável com ADH normal');
  ok(near(r.plasmaNa, 140), 'base: Na ~140 com ADH normal');
  ok(r.classe === 'normal', 'base: classe normal');
})();

/* 2. IDENTIDADES */
(function () {
  for (var i = 0; i < 30; i++) {
    var aldo = i / 15, r = collect({ aldo: aldo });
    ok(near(r.plasmaK, kFromEnac(r.enac), 1e-9), 'id: K = kFromEnac(ENaC)');
    ok(r.plasmaK >= 2.8 && r.plasmaK <= 7.0, 'id: K nos clamps');
    ok(r.enac >= 0 && r.enac <= 2, 'id: ENaC em [0,2]');
    ok(r.urineOsm >= 50 && r.urineOsm <= 1200, 'id: urineOsm nos clamps');
  }
  ok(near(emaxModel(0, 25, 0.9), 0), 'id: emax(0)=0');
})();

/* 3. LEIS */
(function () {
  // aldosterona alta → ENaC↑ → K↓ (hipocalemia)
  ok(collect({ aldo: 1.8 }).plasmaK < collect({ aldo: 1 }).plasmaK, 'lei: aldo↑ → K↓');
  // MRA (espironolactona) → ENaC↓ → K↑ (poupa K)
  ok(collect({ droga: 'espironolactona', dose: 100 }).plasmaK > collect({}).plasmaK, 'lei: espironolactona → K↑ (poupa K)');
  // amilorida bloqueia o ENaC direto → K↑ mesmo com aldo normal
  ok(collect({ droga: 'amilorida', dose: 10 }).plasmaK > collect({}).plasmaK, 'lei: amilorida → K↑ (bloqueia ENaC)');
  ok(collect({ droga: 'amilorida', dose: 10 }).enac < collect({}).enac, 'lei: amilorida → ENaC↓');
  // vaptano → aquarese → Na↑, urina diluída
  ok(collect({ droga: 'tolvaptan', dose: 60 }).plasmaNa > collect({ adh: 1.6 }).plasmaNa, 'lei: vaptano sobe o Na (corrige SIADH)');
  ok(collect({ droga: 'tolvaptan', dose: 60 }).urineOsm < collect({}).urineOsm, 'lei: vaptano → urina diluída (aquarese)');
  // ADH alto (SIADH) → urina concentrada, Na↓
  ok(collect({ adh: 1.8 }).plasmaNa < collect({ adh: 1 }).plasmaNa, 'lei: ADH↑ (SIADH) → Na↓');
  ok(collect({ adh: 1.8 }).urineOsm > collect({ adh: 1 }).urineOsm, 'lei: ADH↑ → urina mais concentrada');
})();

/* 4. PÉROLAS */
(function () {
  // aldosterona é "Na in, K out": a alça de K e a de Na são opostas
  var hiper = collect({ aldo: 1.8 });
  ok(hiper.enac > 1 && hiper.hipoK, 'pérola: hiperaldo = ENaC↑ + hipocalemia (Na in, K out)');
  // poupadores: dois caminhos para o mesmo fim (hipercalemia)
  ok(collect({ droga: 'espironolactona', dose: 100 }).hiperK || collect({ droga: 'amilorida', dose: 10 }).hiperK, 'pérola: poupadores de K → risco de hipercalemia');
  // amilorida funciona SEM aldosterona (bloqueio direto) — útil no Liddle
  var liddleLike = collect({ aldo: 0.2, droga: 'amilorida', dose: 10 });
  ok(liddleLike.enac < collect({ aldo: 0.2 }).enac, 'pérola: amilorida bloqueia o ENaC mesmo com aldo baixa (Liddle)');
  // vaptano: água sem sal → sobe o Na (≠ restrição hídrica lenta)
  ok(collect({ adh: 1.8, droga: 'tolvaptan', dose: 60 }).plasmaNa > collect({ adh: 1.8 }).plasmaNa, 'pérola: vaptano corrige a hiponatremia da SIADH (aquarese)');
})();

/* 5. DETERMINISMO */
(function () {
  var inp = { aldo: 1.4, adh: 1.2, droga: 'eplerenona', dose: 50 };
  ok(JSON.stringify(collect(inp)) === JSON.stringify(collect(inp)), 'determinismo: saída idêntica');
  var frozen = Object.freeze({ droga: 'tolvaptan', dose: 30 });
  var a, threw = false; try { a = collect(frozen); } catch (e) { threw = true; }
  ok(!threw && fin(a.plasmaNa), 'determinismo: Object.freeze não lança');
  ok(frozen.dose === 30, 'determinismo: entrada não mutada');
})();

/* 6. ROBUSTEZ */
(function () {
  var maus = [undefined, null, {}, { aldo: NaN }, { aldo: 'x' }, { droga: 'xyz' }, { droga: 9 }, { dose: Infinity },
    { adh: -5 }, { dose: -50 }, { aldo: 1e9 }, { adh: 1e9 }];
  maus.forEach(function (m, i) {
    var r = collect(m);
    ok(fin(r.plasmaK) && fin(r.plasmaNa) && fin(r.enac) && fin(r.urineOsm), 'robustez[' + i + ']: finito');
    ok(r.plasmaK >= 2.8 && r.plasmaK <= 7.0 && r.plasmaNa >= 120 && r.plasmaNa <= 155, 'robustez[' + i + ']: clamps');
    ok(r.enac >= 0 && r.enac <= 2, 'robustez[' + i + ']: ENaC em [0,2]');
  });
})();

/* 7. FUZZING ≥5000 */
(function () {
  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  var rnd = mulberry32(0xB8E2), N = 20000, bad = 0;
  var drogas = ['nenhum', 'espironolactona', 'eplerenona', 'amilorida', 'tolvaptan', 'xyz', null];
  function val() { var r = rnd(); if (r < 0.3) { var pool = [NaN, Infinity, -Infinity, 1e12, -1e12, 'x', null, undefined]; return pool[(rnd() * pool.length) | 0]; } return (r - 0.1) * 120; }
  for (var i = 0; i < N; i++) {
    var inp = { aldo: val(), adh: val(), droga: drogas[(rnd() * drogas.length) | 0], dose: val() };
    var r = collect(inp); var L = collectLayout(inp, 900, 360);
    var good = fin(r.plasmaK) && fin(r.plasmaNa) && fin(r.enac) && fin(r.urineOsm) && fin(r.efeito) &&
      r.plasmaK >= 2.8 && r.plasmaK <= 7.0 && r.plasmaNa >= 120 && r.plasmaNa <= 155 &&
      r.enac >= 0 && r.enac <= 2 && r.urineOsm >= 50 && r.urineOsm <= 1200 && r.efeito >= 0 && r.efeito <= 1 &&
      Array.isArray(L.pts) && L.pts.length === 57 && fin(L.current.y);
    if (!good) bad++;
  }
  ok(bad === 0, 'fuzzing: ' + N + ' entradas (30% malignas) → 0 violações (' + bad + ')');
})();

/* 8. SAÍDA */
console.log(oks + ' OK · ' + fails + ' falhas');
process.exit(fails > 0 ? 1 : 0);
