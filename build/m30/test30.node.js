/* =========================================================================
 * FILTRA · M30 — bateria de robustez do engine (0 falhas ou não entra)
 * 1 BASE · 2 IDENTIDADES · 3 LEIS · 4 PÉROLAS · 5 DETERMINISMO · 6 ROBUSTEZ · 7 FUZZING ≥5000 · 8 SAÍDA
 * ========================================================================= */
var M = require('./model30.js');
var dpExchange = M.dpExchange, ufAcumulada = M.ufAcumulada, gradienteOsm = M.gradienteOsm,
    glicoseAbsorvida = M.glicoseAbsorvida, kGlicose = M.kGlicose, kTransporte = M.kTransporte,
    tempoPicoUF = M.tempoPicoUF, ufCurveLayout = M.ufCurveLayout;

var oks = 0, fails = 0;
function ok(c, m) { if (c) oks++; else { fails++; console.log('  FALHA: ' + m); } }
function near(a, b, t) { return Math.abs(a - b) <= (t || 1e-7); }
function fin(x) { return typeof x === 'number' && isFinite(x); }

/* ---------- 1. LINHA DE BASE ---------- */
(function () {
  var r = dpExchange({});  // 2.5% dextrose, dwell 4 h, transportador médio, 2000 mL
  ok(r.uf > 150 && r.uf < 400, 'base: UF positiva ~algumas centenas de mL (2.5%/4h/médio) — tem ' + r.uf.toFixed(0));
  ok(r.drenado > r.vInf, 'base: volume drenado > infundido (UF líquida positiva)');
  ok(r.gliAbs > 20 && r.gliAbs < 60, 'base: glicose absorvida ~30–50 g (' + r.gliAbs.toFixed(0) + ')');
  ok(r.dpCr4h > 0.5 && r.dpCr4h < 0.85, 'base: D/P creatinina 4 h em faixa intermediária');
  ok(r.clearanceL > 0, 'base: clearance de soluto positivo');
  // alto transportador → UF cai mais (perde o gradiente cedo)
  var alto = dpExchange({ tipoTransp: 1 });
  ok(alto.uf < r.uf, 'base: alto transportador → UF MENOR que o médio (perde o gradiente cedo)');
})();

/* ---------- 2. IDENTIDADES ---------- */
(function () {
  for (var i = 0; i < 40; i++) {
    var dex = 1.5 + (i % 3) * 1.375;            // 1.5 / 2.875 / 4.25
    var dw = 1 + (i % 8);                         // 1..8 h
    var tp = (i % 5) / 4;                         // 0..1
    var r = dpExchange({ dextrose: dex, dwellH: dw, tipoTransp: tp, vInf: 1500 + (i % 4) * 500 });
    ok(near(r.drenado, r.vInf + r.uf, 1e-7), 'id: drenado = infundido + UF');
    ok(near(r.uf, ufAcumulada(r.dwellH, r.dextrose, r.kG), 1e-9), 'id: UF = ufAcumulada(dwell,dex,kG)');
    ok(r.dpCr >= 0 && r.dpCr <= 1, 'id: D/P em [0,1]');
    ok(near(r.gliAbs, glicoseAbsorvida(r.dwellH, r.dextrose, r.kG, r.vInf), 1e-9), 'id: glicose absorvida casa com o helper');
    ok(r.gradFinal >= 0 && r.gradFinal <= 1, 'id: gradiente osmótico normalizado em [0,1]');
  }
  // o gradiente osmótico DECAI com a glicose absorvida (exp decrescente)
  var g1 = gradienteOsm(1, 2.5, kGlicose(0.5, 0));
  var g3 = gradienteOsm(3, 2.5, kGlicose(0.5, 0));
  ok(g3 < g1, 'id: gradiente(t=3) < gradiente(t=1) — a glicose absorvida derruba o gradiente');
  // dwell zero → UF zero
  ok(near(dpExchange({ dwellH: 0 }).uf, 0, 1e-9), 'id: dwell = 0 → UF = 0');
})();

/* ---------- 3. LEIS ---------- */
(function () {
  // dextrose% ↑ → UF ↑
  ok(dpExchange({ dextrose: 4.25 }).uf > dpExchange({ dextrose: 1.5 }).uf, 'lei: dextrose%↑ → UF↑');
  // dwell ↑ → UF sobe até o pico, depois cai/reverte (não-monótona)
  var d2 = dpExchange({ dwellH: 2 }).uf, d4 = dpExchange({ dwellH: 4 }).uf, d10 = dpExchange({ dwellH: 10 }).uf;
  ok(d4 >= d2 - 1, 'lei: UF cresce de 2 h para 4 h (rumo ao pico)');
  ok(d10 < d4, 'lei: UF CAI de 4 h para 10 h (passou do pico → reabsorve)');
  // existe um pico de UF positivo (médio, 2.5%)
  var tp = tempoPicoUF(2.5, kGlicose(0.5, 0));
  ok(tp > 0 && tp < 12, 'lei: existe instante de pico de UF (0 < t* < 12 h)');
  ok(ufAcumulada(tp, 2.5, kGlicose(0.5, 0)) >= ufAcumulada(tp + 2, 2.5, kGlicose(0.5, 0)) - 1, 'lei: a UF no pico é ≥ a UF depois');
  // transportador alto → UF↓ mais cedo E clearance↑ (D/P maior)
  var alto = dpExchange({ tipoTransp: 1 }), baixo = dpExchange({ tipoTransp: 0 });
  ok(alto.uf < baixo.uf, 'lei: transportador alto → UF MENOR (perde o gradiente cedo)');
  ok(alto.dpCr4h > baixo.dpCr4h, 'lei: transportador alto → D/P↑ (equilibra o soluto rápido)');
  ok(alto.kG > baixo.kG && alto.kT > baixo.kT, 'lei: alto transportador → kG e kT maiores');
  // glicose absorvida ↑ com o tempo e com a dextrose
  ok(dpExchange({ dwellH: 8 }).gliAbs > dpExchange({ dwellH: 2 }).gliAbs, 'lei: dwell↑ → glicose absorvida↑');
  ok(dpExchange({ dextrose: 4.25 }).gliAbs > dpExchange({ dextrose: 1.5 }).gliAbs, 'lei: dextrose%↑ → glicose absorvida↑');
})();

/* ---------- 4. PÉROLAS ---------- */
(function () {
  // (1) O PARADOXO do alto transportador: clearance bom, UF ruim
  var alto = dpExchange({ tipoTransp: 1, dwellH: 4 });
  var medio = dpExchange({ tipoTransp: 0.5, dwellH: 4 });
  ok(alto.clearanceL >= medio.clearanceL && alto.uf < medio.uf, 'pérola: alto transportador — MELHOR clearance, PIOR UF (o paradoxo)');
  ok(alto.paradoxoAlto, 'pérola: a flag do paradoxo do alto transportador dispara');
  // (2) dwell longo REABSORVE (UF negativa) — o pico já passou
  var longo = dpExchange({ tipoTransp: 1, dwellH: 10 });
  ok(longo.uf < 0 && longo.reabsorve, 'pérola: dwell longo no alto transportador → UF negativa (REABSORVE líquido)');
  // (3) icodextrina RESOLVE: dwell longo com UF mantida (polímero não absorvido)
  var ico = dpExchange({ tipoTransp: 1, dwellH: 10, icodextrina: true });
  ok(ico.uf > longo.uf + 500, 'pérola: icodextrina mantém a UF no dwell longo (não absorve → gradiente preservado)');
  ok(ico.gliAbs < longo.gliAbs, 'pérola: icodextrina → quase nada de glicose absorvida');
  // dextrose 4.25% dá mais UF que 2.5% (mais gradiente osmótico)
  ok(dpExchange({ dextrose: 4.25 }).uf > dpExchange({ dextrose: 2.5 }).uf, 'pérola: 4.25% puxa mais UF que 2.5% (gradiente maior)');
})();

/* ---------- 5. DETERMINISMO ---------- */
(function () {
  var inp = { dextrose: 4.25, dwellH: 6, tipoTransp: 0.7, vInf: 2500 };
  ok(JSON.stringify(dpExchange(inp)) === JSON.stringify(dpExchange(inp)), 'determinismo: mesma entrada → saída idêntica');
  var frozen = Object.freeze({ dextrose: 2.5, dwellH: 4, tipoTransp: 0.5 });
  var a, threw = false; try { a = dpExchange(frozen); } catch (e) { threw = true; }
  ok(!threw && fin(a.uf), 'determinismo: Object.freeze não lança nem é mutado');
  ok(frozen.dwellH === 4, 'determinismo: entrada não mutada');
})();

/* ---------- 6. ROBUSTEZ ---------- */
(function () {
  var maus = [undefined, null, {}, { dextrose: NaN }, { dwellH: 'x' }, { tipoTransp: -10 }, { dextrose: 1e9 },
    { vInf: 0 }, { vInf: Infinity }, { dwellH: -5 }, { tipoTransp: 'z' }, { dextrose: 'a', dwellH: NaN },
    { icodextrina: 'sim' }];
  maus.forEach(function (m, i) {
    var r = dpExchange(m);
    ok(fin(r.uf) && fin(r.drenado) && fin(r.dpCr) && fin(r.gliAbs) && fin(r.clearanceL) && fin(r.tPico), 'robustez[' + i + ']: saídas finitas');
    ok(r.dpCr >= 0 && r.dpCr <= 1 && r.gradFinal >= 0 && r.gradFinal <= 1, 'robustez[' + i + ']: D/P e gradiente nos clamps');
    ok(r.gliAbs >= 0 && r.vInf >= 500 && r.vInf <= 3000, 'robustez[' + i + ']: glicose ≥0, vInf clampado');
  });
  ok(fin(ufAcumulada(NaN, 'x', null)) && fin(gradienteOsm('a', NaN, Infinity)), 'robustez: helpers com lixo → finito');
})();

/* ---------- 7. FUZZING semeado ≥5000 ---------- */
(function () {
  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  var rnd = mulberry32(0x30FA11), N = 6000, bad = 0;
  function val() { var r = rnd(); if (r < 0.3) { var pool = [NaN, Infinity, -Infinity, 1e12, -1e12, 'x', null, undefined]; return pool[(rnd() * pool.length) | 0]; } return (r - 0.15) * 30; }
  for (var i = 0; i < N; i++) {
    var inp = { dextrose: val(), dwellH: val(), tipoTransp: val(), vInf: val() * 100, icodextrina: rnd() < 0.5 };
    var r = dpExchange(inp);
    var L = ufCurveLayout(inp, 900, 360);
    var good = fin(r.uf) && fin(r.drenado) && fin(r.dpCr) && fin(r.dpCr4h) && fin(r.gliAbs) &&
      fin(r.clearanceL) && fin(r.tPico) && fin(r.kG) && fin(r.kT) && fin(r.gradFinal) &&
      r.dpCr >= 0 && r.dpCr <= 1 && r.dpCr4h >= 0 && r.dpCr4h <= 1 && r.gradFinal >= 0 && r.gradFinal <= 1 &&
      r.gliAbs >= 0 && r.vInf >= 500 && r.vInf <= 3000 && r.tPico >= 0 && r.tPico <= 16 &&
      Array.isArray(L.pts) && L.pts.length === 61 && Array.isArray(L.ptsAlto) && L.ptsAlto.length === 61 &&
      fin(L.current.y) && fin(L.zeroY);
    if (!good) bad++;
  }
  ok(bad === 0, 'fuzzing: ' + N + ' entradas (30% malignas) → 0 violações (' + bad + ')');
})();

/* ---------- 8. SAÍDA ---------- */
console.log(oks + ' OK · ' + fails + ' falhas');
process.exit(fails > 0 ? 1 : 0);
