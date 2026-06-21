/* FILTRA · M17 — robustez (0 falhas ou não entra) */
var M = require('./model17.js');
var diuretics = M.diuretics, emaxModel = M.emaxModel, diureticsLayout = M.diureticsLayout;
var oks = 0, fails = 0;
function ok(c, m) { if (c) oks++; else { fails++; console.log('  FALHA: ' + m); } }
function near(a, b, t) { return Math.abs(a - b) <= (t || 1e-7); }
function fin(x) { return typeof x === 'number' && isFinite(x); }

/* 1. BASE */
(function () {
  var r = diuretics({});
  ok(r.FENa > 0.4 && r.FENa < 1.6, 'base: sem fármaco FENa ~1%');
  ok(near(r.FENa, r.FENaBasal, 1e-9) && near(r.deltaFENa, 0, 1e-9), 'base: sem fármaco, efeito zero');
  ok(r.segments.length === 4, 'base: 4 segmentos');
  ok(!r.sinergia && !r.brakingAtivo && !r.resistencia, 'base: sem flags');
})();

/* 2. IDENTIDADES */
(function () {
  ok(near(emaxModel(18, 18, 0.88), 0.44, 1e-9), 'id: Emax em EC50 = metade do emax');
  ok(near(emaxModel(0, 18, 0.88), 0, 1e-9), 'id: dose 0 → bloqueio 0');
  var r = diuretics({ loop: 80 });
  // conservação: delivered de cada segmento = delivered anterior − reabsorvido anterior
  var s = r.segments;
  ok(near(s[1].delivered, s[0].delivered - s[0].reabsorbed, 1e-7), 'id: cascata conserva (alça)');
  ok(near(s[2].delivered, s[1].delivered - s[1].reabsorbed, 1e-7), 'id: cascata conserva (TCD)');
  ok(near(s[3].delivered, s[2].delivered - s[2].reabsorbed, 1e-7), 'id: cascata conserva (ducto)');
})();

/* 3. LEIS */
(function () {
  ok(diuretics({ loop: 80 }).FENa > diuretics({ loop: 10 }).FENa, 'lei: dose de alça↑ → FENa↑');
  ok(diuretics({ loop: 80 }).FENa > diuretics({}).FENa, 'lei: alça natriurese > basal');
  ok(diuretics({ thz: 50 }).FENa > diuretics({}).FENa, 'lei: tiazídico natriurese > basal');
  // teto: dobrar muito além do EC50 acrescenta pouco (plateau)
  var a = diuretics({ loop: 80 }).FENa, b = diuretics({ loop: 320 }).FENa;
  ok((b - a) < (diuretics({ loop: 40 }).FENa - diuretics({ loop: 0 }).FENa), 'lei: TETO — incremento cai no platô');
  // braking: reduz o efeito da mesma dose
  ok(diuretics({ loop: 80, braking: 0.8 }).FENa < diuretics({ loop: 80, braking: 0 }).FENa, 'lei: braking → menos natriurese');
  // resistência: menor entrega → menos efeito
  ok(diuretics({ loop: 80, delivery: 0.3 }).FENa < diuretics({ loop: 80, delivery: 1 }).FENa, 'lei: resistência (entrega↓) → menos efeito');
})();

/* 4. PÉROLAS */
(function () {
  // SINERGIA: alça + tiazídico > soma dos efeitos isolados (supra-aditivo)
  var base = diuretics({}).FENa;
  var soLoop = diuretics({ loop: 80 }).FENa - base;
  var soThz = diuretics({ thz: 50 }).FENa - base;
  var ambos = diuretics({ loop: 80, thz: 50 }).FENa - base;
  ok(ambos > soLoop + soThz, 'pérola: bloqueio sequencial (alça+tiazídico) é SUPRA-aditivo (sinergia)');
  ok(diuretics({ loop: 80, thz: 50 }).sinergia, 'pérola: flag de sinergia');
  // braking superado pela adição do tiazídico
  var brakeLoop = diuretics({ loop: 80, braking: 0.8 }).FENa;
  var brakeLoopThz = diuretics({ loop: 80, thz: 50, braking: 0.8 }).FENa;
  ok(brakeLoopThz > brakeLoop * 1.3, 'pérola: tiazídico vence o braking (resgata a resposta)');
  // alça tem teto MAIOR que tiazídico (mais natriurese máxima)
  ok(diuretics({ loop: 320 }).FENa > diuretics({ thz: 100 }).FENa, 'pérola: alça (teto alto) > tiazídico (teto baixo)');
})();

/* 5. DETERMINISMO */
(function () {
  var inp = { ca: 250, loop: 40, thz: 25, ksp: 5, braking: 0.5, delivery: 0.7 };
  ok(JSON.stringify(diuretics(inp)) === JSON.stringify(diuretics(inp)), 'determinismo: saída idêntica');
  var frozen = Object.freeze({ loop: 80, thz: 25 });
  var a, threw = false; try { a = diuretics(frozen); } catch (e) { threw = true; }
  ok(!threw && fin(a.FENa), 'determinismo: Object.freeze não lança');
  ok(frozen.loop === 80, 'determinismo: entrada não mutada');
})();

/* 6. ROBUSTEZ */
(function () {
  var maus = [undefined, null, {}, { loop: NaN }, { loop: 'x' }, { loop: -50 }, { thz: Infinity },
    { braking: NaN }, { delivery: 0 }, { delivery: -3 }, { loop: 1e9 }, { ca: 1e9, thz: 1e9, ksp: 1e9 }];
  maus.forEach(function (m, i) {
    var r = diuretics(m);
    ok(fin(r.FENa) && fin(r.deltaFENa) && fin(r.blockLoop), 'robustez[' + i + ']: finito');
    ok(r.FENa >= 0 && r.FENa <= 100 && r.blockLoop >= 0 && r.blockLoop <= 1, 'robustez[' + i + ']: clamps');
    r.segments.forEach(function (s) { ok(fin(s.delivered) && fin(s.reabsorbed) && s.reabsorbed >= -1e-6, 'robustez[' + i + ']: segmento finito'); });
  });
})();

/* 7. FUZZING ≥5000 */
(function () {
  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  var rnd = mulberry32(0xD17E), N = 6000, bad = 0;
  function val(scale) { var r = rnd(); if (r < 0.3) { var pool = [NaN, Infinity, -Infinity, 1e12, -1e12, 'x', null, undefined]; return pool[(rnd() * pool.length) | 0]; } return r * scale; }
  for (var i = 0; i < N; i++) {
    var inp = { ca: val(600), loop: val(200), thz: val(80), ksp: val(20), braking: val(1.2), delivery: val(1.1) };
    var r = diuretics(inp); var L = diureticsLayout(inp, 900, 360);
    var good = fin(r.FENa) && fin(r.deltaFENa) && fin(r.FENaBasal) &&
      r.FENa >= 0 && r.FENa <= 100 &&
      r.blockCA >= 0 && r.blockCA <= 1 && r.blockLoop >= 0 && r.blockLoop <= 1 &&
      r.blockThz >= 0 && r.blockThz <= 1 && r.blockKsp >= 0 && r.blockKsp <= 1 &&
      Array.isArray(r.segments) && r.segments.length === 4 &&
      L && Array.isArray(L.pts) && L.pts.length === 57 && fin(L.current.y);
    if (!good) bad++;
  }
  ok(bad === 0, 'fuzzing: ' + N + ' entradas (30% malignas) → 0 violações (' + bad + ')');
})();

/* 8. SAÍDA */
console.log(oks + ' OK · ' + fails + ' falhas');
process.exit(fails > 0 ? 1 : 0);
