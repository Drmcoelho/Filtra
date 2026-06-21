/* FILTRA · M13 — robustez (0 falhas ou não entra) */
var M = require('./model13.js');
var acidbase = M.acidbase, phFrom = M.phFrom, hco3FromPhPco2 = M.hco3FromPhPco2, acidbaseLayout = M.acidbaseLayout;
var oks = 0, fails = 0;
function ok(c, m) { if (c) oks++; else { fails++; console.log('  FALHA: ' + m); } }
function near(a, b, t) { return Math.abs(a - b) <= (t || 1e-7); }
function fin(x) { return typeof x === 'number' && isFinite(x); }

/* 1. BASE */
(function () {
  var r = acidbase({});
  ok(r.pH > 7.38 && r.pH < 7.43, 'base: pH ~7,40');
  ok(near(r.AG, 140 - (104 + 24), 1e-9) && r.AG > 8 && r.AG < 16, 'base: AG ~12');
  ok(r.primario === 'normal', 'base: normal');
  ok(!r.highAG, 'base: AG não alto');
})();

/* 2. IDENTIDADES */
(function () {
  for (var i = 0; i < 25; i++) {
    var h = 5 + i, c = 40, ph = phFrom(h, c);
    ok(near(ph, 6.1 + Math.log(h / (0.03 * c)) / Math.LN10, 1e-9), 'id: Henderson–Hasselbalch');
  }
  var r = acidbase({ Na: 140, Cl: 100, HCO3: 15 });
  ok(near(r.AG, 140 - (100 + 15), 1e-9), 'id: AG = Na − (Cl + HCO₃)');
  var ra = acidbase({ albumin: 2 });
  ok(near(ra.AGcorr, ra.AG + 2.5 * (4 - 2), 1e-9), 'id: AGcorr = AG + 2,5·(4 − alb)');
  ok(near(hco3FromPhPco2(7.4, 40), 24, 0.3), 'id: isóbara 40 passa por ~24 em pH 7,4');
})();

/* 3. LEIS */
(function () {
  ok(acidbase({ HCO3: 10 }).pH < acidbase({ HCO3: 30 }).pH, 'lei: HCO₃↓ → pH↓ (acidose metabólica)');
  ok(acidbase({ PaCO2: 70 }).pH < acidbase({ PaCO2: 25 }).pH, 'lei: PaCO₂↑ → pH↓ (acidose respiratória)');
  ok(acidbase({ Cl: 120 }).AG < acidbase({ Cl: 90 }).AG, 'lei: Cl↑ → AG↓ (hiperclorêmica)');
  ok((acidbase({ albumin: 2 }).AGcorr - acidbase({ albumin: 2 }).AG) > (acidbase({ albumin: 4 }).AGcorr - acidbase({ albumin: 4 }).AG), 'lei: albumina↓ → correção do AG↑');
  ok(acidbase({ HCO3: 10 }).winterExp < acidbase({ HCO3: 20 }).winterExp, 'lei: Winter sobe com HCO₃');
})();

/* 4. PÉROLAS */
(function () {
  // hipoalbuminemia mascara o AG alto
  var m = acidbase({ Na: 140, Cl: 110, HCO3: 18, albumin: 2.0 }); // AG = 12 (parece normal)
  ok(m.AG <= 12.5 && m.AGcorr > 13 && m.highAG, 'pérola: albumina baixa mascara AG alto (AGcorr desmascara)');
  // acidose metabólica de AG alto pura: delta-delta ~1
  var hag = acidbase({ Na: 140, Cl: 95, HCO3: 9 }); // AG = 36? compute
  ok(hag.deltaRatio !== null && hag.deltaRatio >= 0.9 && hag.deltaRatio <= 2.2, 'pérola: HAGMA pura → Δ-Δ ~1–2');
  // HAGMA + alcalose metabólica → delta-delta > 2
  var mix = acidbase({ Na: 145, Cl: 85, HCO3: 20 }); // AG = 40, ΔAG=28, ΔHCO3=4 → ratio 7
  ok(mix.deltaRatio !== null && mix.deltaRatio > 2 && mix.misto.join(' ').indexOf('alcalose metab') >= 0, 'pérola: Δ-Δ > 2 → alcalose metabólica concomitante');
  // acidose metabólica + acidose respiratória (PaCO2 acima do Winter)
  var dbl = acidbase({ HCO3: 12, PaCO2: 50 });
  ok(dbl.misto.join(' ').indexOf('acidose respirat') >= 0, 'pérola: PaCO₂ acima do Winter → acidose respiratória somada');
})();

/* 5. DETERMINISMO */
(function () {
  var inp = { Na: 138, Cl: 96, HCO3: 16, PaCO2: 30, albumin: 3 };
  ok(JSON.stringify(acidbase(inp)) === JSON.stringify(acidbase(inp)), 'determinismo: saída idêntica');
  var frozen = Object.freeze({ HCO3: 12, PaCO2: 50 });
  var a, threw = false; try { a = acidbase(frozen); } catch (e) { threw = true; }
  ok(!threw && fin(a.pH), 'determinismo: Object.freeze não lança');
  ok(frozen.HCO3 === 12, 'determinismo: entrada não mutada');
})();

/* 6. ROBUSTEZ */
(function () {
  var maus = [undefined, null, {}, { Na: NaN }, { Cl: 'x' }, { HCO3: -5 }, { PaCO2: Infinity },
    { albumin: NaN }, { HCO3: 1e9 }, { PaCO2: 0 }, { Na: 1e9 }, { albumin: -3 }];
  maus.forEach(function (m, i) {
    var r = acidbase(m);
    ok(fin(r.pH) && fin(r.AG) && fin(r.AGcorr) && fin(r.winterExp) && typeof r.primario === 'string', 'robustez[' + i + ']: finito');
    ok(r.pH > 5.4 && r.pH < 8.8, 'robustez[' + i + ']: pH finito/limitado pelos clamps (cantos extremos)');
    ok(r.deltaRatio === null || fin(r.deltaRatio), 'robustez[' + i + ']: deltaRatio null ou finito');
  });
})();

/* 7. FUZZING ≥5000 */
(function () {
  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  var rnd = mulberry32(0xAC1D), N = 6000, bad = 0;
  function pick(lo, hi) { var r = rnd(); if (r < 0.3) { var pool = [NaN, Infinity, -Infinity, 1e12, -1e12, 'x', null, undefined]; return pool[(rnd() * pool.length) | 0]; } return lo + (hi - lo) * r; }
  for (var i = 0; i < N; i++) {
    var inp = { Na: pick(110, 170), Cl: pick(70, 130), HCO3: pick(2, 50), PaCO2: pick(8, 120), albumin: pick(1, 5.5) };
    var r = acidbase(inp); var L = acidbaseLayout(inp, 900, 360);
    var good = fin(r.pH) && fin(r.AG) && fin(r.AGcorr) && fin(r.winterExp) && typeof r.primario === 'string' &&
      Array.isArray(r.misto) && (r.deltaRatio === null || fin(r.deltaRatio)) &&
      r.pH > 5.4 && r.pH < 8.8 &&
      L && Array.isArray(L.isobars) && L.isobars.length === 4 && fin(L.current.x) && fin(L.current.y);
    if (!good) bad++;
  }
  ok(bad === 0, 'fuzzing: ' + N + ' entradas (30% malignas) → 0 violações (' + bad + ')');
})();

/* 8. SAÍDA */
console.log(oks + ' OK · ' + fails + ' falhas');
process.exit(fails > 0 ? 1 : 0);
