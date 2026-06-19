/* FILTRA · M7 — robustez (0 falhas ou não entra) */
var M = require('./model7.js');
var tcd = M.tcd, emaxModel = M.emaxModel, tcdLayout = M.tcdLayout;
var oks = 0, fails = 0;
function ok(c, m) { if (c) oks++; else { fails++; console.log('  FALHA: ' + m); } }
function near(a, b, t) { return Math.abs(a - b) <= (t || 1e-7); }
function fin(x) { return typeof x === 'number' && isFinite(x); }

/* 1. BASE */
(function () {
  var r = tcd({});
  ok(near(r.ncc, 1), 'base: NCC ativo (sem fármaco)');
  ok(r.FENa < 1.2, 'base: FENa basal baixa');
  ok(near(r.caUrinaria, 1, 1e-9), 'base: Ca urinário normal');
  ok(near(r.plasmaK, 4.0, 1e-9), 'base: K normal ~4,0');
  ok(r.classe === 'normal', 'base: classe normal');
})();

/* 2. IDENTIDADES */
(function () {
  for (var i = 0; i < 30; i++) {
    var dose = i * 4, r = tcd({ droga: 'hidroclorotiazida', dose: dose });
    ok(near(r.ncc, 1 - r.nccBlock, 1e-9), 'id: NCC = 1 − bloqueio');
    ok(r.FENa >= 0.6 && r.FENa <= 6, 'id: FENa nos clamps (teto baixo)');
    ok(r.caUrinaria >= 0.25 && r.caUrinaria <= 1.2, 'id: Ca urinário nos clamps');
    ok(r.plasmaK >= 2.6 && r.plasmaK <= 4.5, 'id: K nos clamps');
  }
  ok(near(emaxModel(0, 12.5, 0.9), 0), 'id: emax(0)=0');
})();

/* 3. LEIS */
(function () {
  ok(tcd({ droga: 'hidroclorotiazida', dose: 50 }).FENa > tcd({ droga: 'hidroclorotiazida', dose: 12.5 }).FENa, 'lei: dose↑ → natriurese↑');
  // PARADOXO DO CÁLCIO: tiazídico REDUZ o Ca urinário
  ok(tcd({ droga: 'hidroclorotiazida', dose: 50 }).caUrinaria < tcd({}).caUrinaria, 'lei: tiazídico → Ca urinário↓ (retém Ca)');
  // hipocalemia
  ok(tcd({ droga: 'hidroclorotiazida', dose: 50 }).plasmaK < tcd({}).plasmaK, 'lei: tiazídico → K↓ (hipocalemia)');
  // perde eficácia na TFG baixa
  ok(tcd({ droga: 'hidroclorotiazida', dose: 50, gfr: 20 }).FENa < tcd({ droga: 'hidroclorotiazida', dose: 50, gfr: 120 }).FENa, 'lei: TFG baixa → tiazídico perde eficácia');
  // clortalidona mais potente que HCTZ na mesma dose
  ok(tcd({ droga: 'clortalidona', dose: 12.5 }).nccBlock > tcd({ droga: 'hidroclorotiazida', dose: 12.5 }).nccBlock, 'lei: clortalidona mais potente que HCTZ');
  // diluição prejudicada com bloqueio relevante
  ok(tcd({ droga: 'hidroclorotiazida', dose: 50 }).diluicaoPrejudicada, 'lei: tiazídico prejudica a diluição (risco de hipoNa)');
})();

/* 4. PÉROLAS */
(function () {
  // TETO BAIXO: mesmo na dose máxima a FENa fica bem abaixo do de alça (~25%)
  ok(tcd({ droga: 'hidroclorotiazida', dose: 200 }).FENa < 7, 'pérola: tiazídico = teto BAIXO (FENa não chega perto de 25%)');
  // paradoxo do cálcio: retém Ca (uso em litíase cálcica/osteoporose)
  ok(tcd({ droga: 'hidroclorotiazida', dose: 50 }).caUrinaria < 0.7, 'pérola: tiazídico retém Ca (≠ diurético de alça)');
  // Gitelman ≈ tiazídico crônico: hipoK + hipocalciúria mesmo SEM fármaco
  var g = tcd({ gitelman: true });
  ok(g.hipoK && g.caUrinaria < 0.7 && g.classe === 'gitelman', 'pérola: Gitelman = perda do NCC ≈ tiazídico crônico');
  // funciona na TFG baixa? quase não — contraste com o de alça
  ok(tcd({ droga: 'hidroclorotiazida', dose: 50, gfr: 18 }).FENa < 2, 'pérola: na TFG baixa o tiazídico quase não funciona');
})();

/* 5. DETERMINISMO */
(function () {
  var inp = { droga: 'clortalidona', dose: 25, gfr: 90 };
  ok(JSON.stringify(tcd(inp)) === JSON.stringify(tcd(inp)), 'determinismo: saída idêntica');
  var frozen = Object.freeze({ droga: 'hidroclorotiazida', dose: 25 });
  var a, threw = false; try { a = tcd(frozen); } catch (e) { threw = true; }
  ok(!threw && fin(a.FENa), 'determinismo: Object.freeze não lança');
  ok(frozen.dose === 25, 'determinismo: entrada não mutada');
})();

/* 6. ROBUSTEZ */
(function () {
  var maus = [undefined, null, {}, { dose: NaN }, { dose: 'x' }, { droga: 'xyz' }, { droga: 9 }, { gfr: -5 },
    { dose: Infinity }, { dose: -50 }, { gfr: 1e9 }, { droga: 'hidroclorotiazida', dose: 1e9 }];
  maus.forEach(function (m, i) {
    var r = tcd(m);
    ok(fin(r.FENa) && fin(r.caUrinaria) && fin(r.plasmaK) && fin(r.plasmaNa), 'robustez[' + i + ']: finito');
    ok(r.FENa >= 0.6 && r.FENa <= 6 && r.caUrinaria >= 0.25 && r.caUrinaria <= 1.2, 'robustez[' + i + ']: clamps');
    ok(r.ncc >= 0 && r.ncc <= 1, 'robustez[' + i + ']: NCC em [0,1]');
  });
})();

/* 7. FUZZING ≥5000 */
(function () {
  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  var rnd = mulberry32(0xC73D), N = 6000, bad = 0;
  var drogas = ['nenhum', 'hidroclorotiazida', 'clortalidona', 'indapamida', 'xyz', null];
  function val() { var r = rnd(); if (r < 0.3) { var pool = [NaN, Infinity, -Infinity, 1e12, -1e12, 'x', null, undefined]; return pool[(rnd() * pool.length) | 0]; } return (r - 0.1) * 120; }
  for (var i = 0; i < N; i++) {
    var inp = { droga: drogas[(rnd() * drogas.length) | 0], dose: val(), gfr: val(), gitelman: rnd() > 0.7 };
    var r = tcd(inp); var L = tcdLayout(inp, 900, 360);
    var good = fin(r.FENa) && fin(r.caUrinaria) && fin(r.plasmaK) && fin(r.plasmaNa) && fin(r.nccBlock) &&
      r.FENa >= 0.6 && r.FENa <= 6 && r.caUrinaria >= 0.25 && r.caUrinaria <= 1.2 &&
      r.plasmaK >= 2.6 && r.plasmaK <= 4.5 && r.ncc >= 0 && r.ncc <= 1 &&
      Array.isArray(L.pts) && L.pts.length === 61 && fin(L.current.y);
    if (!good) bad++;
  }
  ok(bad === 0, 'fuzzing: ' + N + ' entradas (30% malignas) → 0 violações (' + bad + ')');
})();

/* 8. SAÍDA */
console.log(oks + ' OK · ' + fails + ' falhas');
process.exit(fails > 0 ? 1 : 0);
