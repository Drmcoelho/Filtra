/* FILTRA · M6 — robustez (0 falhas ou não entra)
 * 1 BASE · 2 IDENTIDADES · 3 LEIS · 4 PÉROLAS · 5 DETERMINISMO · 6 ROBUSTEZ · 7 FUZZING ≥5000 · 8 SAÍDA */
var M = require('./model6.js');
var alca = M.alca, emaxModel = M.emaxModel, alcaLayout = M.alcaLayout;
var oks = 0, fails = 0;
function ok(c, m) { if (c) oks++; else { fails++; console.log('  FALHA: ' + m); } }
function near(a, b, t) { return Math.abs(a - b) <= (t || 1e-7); }
function fin(x) { return typeof x === 'number' && isFinite(x); }

/* 1. BASE */
(function () {
  var r = alca({});
  ok(near(r.nkcc2, 1), 'base: NKCC2 ativo (sem fármaco)');
  ok(r.gradiente > 1100, 'base: gradiente corticomedular ~1200 mOsm');
  ok(r.FENa < 1.5, 'base: FENa basal baixa');
  ok(r.podeConcentrar, 'base: consegue concentrar (gradiente alto)');
  ok(r.classe === 'normal', 'base: classe normal');
})();

/* 2. IDENTIDADES */
(function () {
  for (var i = 0; i < 30; i++) {
    var dose = i * 5, r = alca({ droga: 'furosemida', dose: dose });
    ok(near(r.nkcc2, 1 - r.bloqueio, 1e-9), 'id: NKCC2 = 1 − bloqueio');
    ok(near(r.gradiente, Math.max(300, Math.min(300 + r.nkcc2 * 900, 1200)), 1e-6), 'id: gradiente = 300 + nkcc2·900 (clamp)');
    ok(r.FENa >= 0.8 && r.FENa <= 25, 'id: FENa nos clamps');
    ok(r.bloqueio >= 0 && r.bloqueio <= 1, 'id: bloqueio em [0,1]');
  }
  ok(near(emaxModel(0, 20, 0.9), 0), 'id: emax(0)=0');
})();

/* 3. LEIS */
(function () {
  ok(alca({ droga: 'furosemida', dose: 80 }).FENa > alca({ droga: 'furosemida', dose: 10 }).FENa, 'lei: dose↑ → natriurese↑');
  ok(alca({ droga: 'furosemida', dose: 80 }).gradiente < alca({}).gradiente, 'lei: diurético de alça abole o gradiente');
  ok(alca({ droga: 'furosemida', dose: 80 }).nkcc2 < alca({ droga: 'furosemida', dose: 10 }).nkcc2, 'lei: dose↑ → NKCC2↓');
  // potência: bumetanida atinge o mesmo bloqueio com dose ~40× menor
  ok(near(alca({ droga: 'bumetanida', dose: 0.5 }).bloqueio, alca({ droga: 'furosemida', dose: 20 }).bloqueio, 0.05), 'lei: bumetanida 0,5 mg ≈ furosemida 20 mg (potência)');
  // braking: crônico reduz o efeito líquido
  ok(alca({ droga: 'furosemida', dose: 80, cronico: true }).FENa < alca({ droga: 'furosemida', dose: 80, cronico: false }).FENa, 'lei: uso crônico (braking) → FENa↓');
  // concentração: sem gradiente, não concentra
  ok(!alca({ droga: 'furosemida', dose: 80 }).podeConcentrar, 'lei: sem gradiente → não concentra (isostenúria)');
})();

/* 4. PÉROLAS */
(function () {
  // teto alto: o diurético de alça atinge FENa muito maior que o basal
  ok(alca({ droga: 'furosemida', dose: 200 }).FENa > 15, 'pérola: diurético de alça = teto ALTO (FENa pode passar de 15%)');
  // perde cálcio (≠ tiazídico, M7)
  ok(alca({ droga: 'furosemida', dose: 80 }).perdaCa, 'pérola: a alça PERDE cálcio (útil na hipercalcemia)');
  // bumetanida muito mais potente: dose minúscula, mesmo efeito
  ok(alca({ droga: 'bumetanida', dose: 1 }).bloqueio > 0.5, 'pérola: bumetanida 1 mg já bloqueia bem (40× potente)');
  // abolir o gradiente prejudica concentrar E diluir ao máximo
  var f = alca({ droga: 'furosemida', dose: 120 });
  ok(!f.podeConcentrar && !f.podeDiluirMax, 'pérola: o diurético de alça tira a concentração E a diluição máxima');
})();

/* 5. DETERMINISMO */
(function () {
  var inp = { droga: 'torasemida', dose: 20, cronico: true, gfr: 90 };
  ok(JSON.stringify(alca(inp)) === JSON.stringify(alca(inp)), 'determinismo: saída idêntica');
  var frozen = Object.freeze({ droga: 'furosemida', dose: 40 });
  var a, threw = false; try { a = alca(frozen); } catch (e) { threw = true; }
  ok(!threw && fin(a.FENa), 'determinismo: Object.freeze não lança');
  ok(frozen.dose === 40, 'determinismo: entrada não mutada');
})();

/* 6. ROBUSTEZ */
(function () {
  var maus = [undefined, null, {}, { dose: NaN }, { dose: 'x' }, { droga: 'xyz' }, { droga: 9 }, { gfr: -5 },
    { dose: Infinity }, { dose: -50 }, { gfr: 1e9 }, { droga: 'furosemida', dose: 1e9 }];
  maus.forEach(function (m, i) {
    var r = alca(m);
    ok(fin(r.FENa) && fin(r.gradiente) && fin(r.nkcc2) && fin(r.urineOsm), 'robustez[' + i + ']: finito');
    ok(r.FENa >= 0.8 && r.FENa <= 25 && r.gradiente >= 300 && r.gradiente <= 1200, 'robustez[' + i + ']: clamps');
    ok(r.nkcc2 >= 0 && r.nkcc2 <= 1, 'robustez[' + i + ']: NKCC2 em [0,1]');
  });
})();

/* 7. FUZZING ≥5000 */
(function () {
  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  var rnd = mulberry32(0xA17C), N = 6000, bad = 0;
  var drogas = ['nenhum', 'furosemida', 'bumetanida', 'torasemida', 'xyz', null];
  function val() { var r = rnd(); if (r < 0.3) { var pool = [NaN, Infinity, -Infinity, 1e12, -1e12, 'x', null, undefined]; return pool[(rnd() * pool.length) | 0]; } return (r - 0.1) * 400; }
  for (var i = 0; i < N; i++) {
    var inp = { droga: drogas[(rnd() * drogas.length) | 0], dose: val(), gfr: val(), cronico: rnd() > 0.5, adh: rnd() > 0.5 };
    var r = alca(inp); var L = alcaLayout(inp, 900, 360);
    var good = fin(r.FENa) && fin(r.gradiente) && fin(r.nkcc2) && fin(r.urineOsm) && fin(r.bloqueio) &&
      r.FENa >= 0.8 && r.FENa <= 25 && r.gradiente >= 300 && r.gradiente <= 1200 &&
      r.nkcc2 >= 0 && r.nkcc2 <= 1 && r.bloqueio >= 0 && r.bloqueio <= 1 &&
      Array.isArray(L.pts) && L.pts.length === 61 && fin(L.current.y);
    if (!good) bad++;
  }
  ok(bad === 0, 'fuzzing: ' + N + ' entradas (30% malignas) → 0 violações (' + bad + ')');
})();

/* 8. SAÍDA */
console.log(oks + ' OK · ' + fails + ' falhas');
process.exit(fails > 0 ? 1 : 0);
