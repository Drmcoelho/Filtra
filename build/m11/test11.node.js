/* FILTRA · M11 — robustez (0 falhas ou não entra) */
var M = require('./model11.js');
var potassium = M.potassium, emFrom = M.emFrom, ecgFrom = M.ecgFrom, potassiumLayout = M.potassiumLayout;
var oks = 0, fails = 0;
function ok(c, m) { if (c) oks++; else { fails++; console.log('  FALHA: ' + m); } }
function near(a, b, t) { return Math.abs(a - b) <= (t || 1e-7); }
function fin(x) { return typeof x === 'number' && isFinite(x); }

/* 1. BASE */
(function () {
  var r = potassium({});
  ok(r.plasmaK > 3.8 && r.plasmaK < 4.6, 'base: K plasmático ~4,2 mEq/L');
  ok(r.Em > -100 && r.Em < -85, 'base: Em ~ -90 mV');
  ok(r.classe === 'normocalemia', 'base: normocalemia');
  ok(near(r.kSecretion, 1, 1e-9), 'base: secreção ~normal');
  ok(r.ecg === 'ECG normal', 'base: ECG normal');
})();

/* 2. IDENTIDADES */
(function () {
  for (var i = 0; i < 30; i++) {
    var k = 1.5 + i / 5, e = emFrom(k);
    ok(near(e, -61.5 * (Math.log(140 / k) / Math.LN10), 1e-9), 'id: Nernst exata');
  }
  var r = potassium({ aldo: 1.5, distalNa: 1.2 });
  ok(near(r.kSecretion, 1.5 * 1.2, 1e-9), 'id: secreção = aldo × aporte distal');
  var b = potassium({ kTotal: 1 });
  ok(near(b.base, 2.5 + 1.7, 1e-9), 'id: base = 2,5 + kTotal·1,7');
})();

/* 3. LEIS */
(function () {
  ok(potassium({ kTotal: 1.5 }).plasmaK > potassium({ kTotal: 0.5 }).plasmaK, 'lei: estoque↑ → K plasmático↑');
  ok(potassium({ pH: 7.2 }).plasmaK > potassium({ pH: 7.5 }).plasmaK, 'lei: acidose → K plasmático↑');
  ok(potassium({ insulin: 1.8 }).plasmaK < potassium({ insulin: 0.5 }).plasmaK, 'lei: insulina↑ → K plasmático↓');
  ok(potassium({ beta: 1.8 }).plasmaK < potassium({ beta: 0.5 }).plasmaK, 'lei: β↑ → K plasmático↓');
  ok(potassium({ aldo: 1.8 }).plasmaK < potassium({ aldo: 0.4 }).plasmaK, 'lei: aldosterona↑ → excreta → K↓');
  ok(potassium({ distalNa: 1.8 }).plasmaK < potassium({ distalNa: 0.4 }).plasmaK, 'lei: aporte distal↑ → excreta → K↓');
  ok(emFrom(7) > emFrom(4), 'lei: K↑ despolariza (Em menos negativo)');
  ok(emFrom(2.5) < emFrom(4), 'lei: K↓ hiperpolariza (Em mais negativo)');
})();

/* 4. PÉROLAS */
(function () {
  // depleção oculta: estoque baixo mas plasma normal/alto na acidose (DKA)
  var dka = potassium({ kTotal: 0.5, pH: 7.15 });
  ok(dka.plasmaK >= 3.5 && dka.deplecaoOculta, 'pérola: acidose mascara depleção (K plasma normal, estoque baixo)');
  // shift muda plasma SEM mudar estoque (a alavanca de emergência da hipercalemia)
  var a = potassium({ kTotal: 1.4, insulin: 1 }), b = potassium({ kTotal: 1.4, insulin: 2 });
  ok(b.plasmaK < a.plasmaK && near(a.kTotal, b.kTotal, 1e-9), 'pérola: insulina baixa o plasma sem tirar K do corpo');
  // secreção precisa de AMBOS: aldo alto mas aporte distal baixo → secreção baixa
  var s = potassium({ aldo: 2, distalNa: 0.2 });
  ok(s.kSecretion < 0.6, 'pérola: aldo alto + aporte distal baixo → secreção baixa (precisa dos dois)');
  // ambos os extremos mexem no ECG
  ok(/sinus|QRS/.test(potassium({ kTotal: 2, pH: 7.1 }).ecg), 'pérola: hipercalemia grave → ECG ameaçador');
  ok(/U|arritmia/.test(potassium({ kTotal: 0.2, insulin: 1.8 }).ecg), 'pérola: hipocalemia → ondas U/arritmia');
})();

/* 5. DETERMINISMO */
(function () {
  var inp = { kTotal: 1.3, pH: 7.25, insulin: 0.8, aldo: 1.4, distalNa: 0.6 };
  ok(JSON.stringify(potassium(inp)) === JSON.stringify(potassium(inp)), 'determinismo: saída idêntica');
  var frozen = Object.freeze({ kTotal: 0.5, pH: 7.2 });
  var a, threw = false; try { a = potassium(frozen); } catch (e) { threw = true; }
  ok(!threw && fin(a.plasmaK), 'determinismo: Object.freeze não lança');
  ok(frozen.kTotal === 0.5, 'determinismo: entrada não mutada');
})();

/* 6. ROBUSTEZ */
(function () {
  var maus = [undefined, null, {}, { kTotal: NaN }, { pH: 'x' }, { insulin: -5 }, { beta: Infinity },
    { aldo: NaN }, { distalNa: 1e9 }, { pH: 1 }, { pH: 99 }, { kTotal: 1e9 }];
  maus.forEach(function (m, i) {
    var r = potassium(m);
    ok(fin(r.plasmaK) && fin(r.Em) && fin(r.kSecretion) && typeof r.ecg === 'string', 'robustez[' + i + ']: finito');
    ok(r.plasmaK >= 1.5 && r.plasmaK <= 9 && r.kSecretion >= 0 && r.kSecretion <= 4, 'robustez[' + i + ']: clamps');
  });
})();

/* 7. FUZZING ≥5000 */
(function () {
  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  var rnd = mulberry32(0xC0FFEE), N = 6000, bad = 0;
  function val() { var r = rnd(); if (r < 0.3) { var pool = [NaN, Infinity, -Infinity, 1e12, -1e12, 'x', null, undefined]; return pool[(rnd() * pool.length) | 0]; } return (r - 0.1) * 3; }
  function valPh() { var r = rnd(); if (r < 0.3) { var pool = [NaN, Infinity, 'x', null, -5, 99]; return pool[(rnd() * pool.length) | 0]; } return 6.6 + r * 1.4; }
  for (var i = 0; i < N; i++) {
    var inp = { kTotal: val(), pH: valPh(), insulin: val(), beta: val(), aldo: val(), distalNa: val() };
    var r = potassium(inp); var L = potassiumLayout(inp, 900, 360);
    var good = fin(r.plasmaK) && fin(r.Em) && fin(r.kSecretion) && fin(r.shiftTotal) && typeof r.ecg === 'string' &&
      r.plasmaK >= 1.5 && r.plasmaK <= 9 && r.kSecretion >= 0 && r.kSecretion <= 4 &&
      r.Em >= -130 && r.Em <= -60 &&
      Array.isArray(L.pts) && L.pts.length === 61 && fin(L.current.y);
    if (!good) bad++;
  }
  ok(bad === 0, 'fuzzing: ' + N + ' entradas (30% malignas) → 0 violações (' + bad + ')');
})();

/* 8. SAÍDA */
console.log(oks + ' OK · ' + fails + ' falhas');
process.exit(fails > 0 ? 1 : 0);
