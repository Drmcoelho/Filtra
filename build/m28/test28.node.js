/* =========================================================================
 * FILTRA · M28 — bateria de robustez do engine (0 falhas ou não entra)
 * 1 BASE · 2 IDENTIDADES · 3 LEIS · 4 PÉROLAS · 5 DETERMINISMO · 6 ROBUSTEZ · 7 FUZZING ≥5000 · 8 SAÍDA
 * ========================================================================= */
var M = require('./model28.js');
var trrc = M.trrc, efluenteParaDose = M.efluenteParaDose, fluxoPlasma = M.fluxoPlasma,
  fatorPreDiluicao = M.fatorPreDiluicao, clearanceCurveLayout = M.clearanceCurveLayout;

var oks = 0, fails = 0;
function ok(c, m) { if (c) oks++; else { fails++; console.log('  FALHA: ' + m); } }
function near(a, b, t) { return Math.abs(a - b) <= (t || 1e-7); }
function fin(x) { return typeof x === 'number' && isFinite(x); }

/* ---------- 1. LINHA DE BASE ---------- */
(function () {
  // 25 mL/kg/h num paciente de 70 kg → efluente ~1750 mL/h
  ok(near(efluenteParaDose(25, 70), 1750), 'base: 25 mL/kg/h × 70 kg = 1750 mL/h de efluente');
  var r = trrc({ peso: 70, qEfluente: 1750, qPre: 1000, qPos: 0, qb: 150, downtime: 20 });
  ok(near(r.dosePrescrita, 25, 1e-6), 'base: dose prescrita = 1750/70 = 25 mL/kg/h');
  ok(r.doseEntregue < r.dosePrescrita, 'base: dose entregue < prescrita (downtime 20%)');
  ok(r.ff < M.FF_LIMITE, 'base: com pré-diluição, FF < 25% (filtro protegido)');
  ok(r.dosePrescrita > 20 && r.dosePrescrita <= 30, 'base: alvo prescrito na faixa 20–30 mL/kg/h');
  ok(r.clearanceMlMin > 0 && r.clearanceMlMin < 30, 'base: clearance efetivo plausível (mL/min)');
  ok(fluxoPlasma(150, 0.30) > 0, 'base: fluxo de plasma positivo (Qb·(1−Hct))');
})();

/* ---------- 2. IDENTIDADES ---------- */
(function () {
  for (var i = 0; i < 40; i++) {
    var peso = 40 + i * 2, qEff = 800 + i * 80, qPre = 200 + i * 50, qb = 100 + (i % 6) * 40;
    var r = trrc({ peso: peso, qEfluente: qEff, qPre: qPre, qb: qb, downtime: (i % 5) * 10 });
    ok(near(r.dosePrescrita, r.qEfluente / r.peso, 1e-9), 'id: dose = Q_efluente / peso');
    ok(near(r.doseEntregue, r.dosePrescrita * (1 - r.downtime / 100), 1e-9), 'id: entregue = prescrita·(1−downtime)');
    ok(near(r.qPlasma, r.qb * (1 - r.hct), 1e-9), 'id: Q_plasma = Qb·(1−Hct)');
    ok(near(r.ff, r.qUf / r.qPlasmaEfetivo, 1e-9), 'id: FF = Q_uf / Q_plasma_efetivo');
    // clearance_pré = clearance·plasma/(plasma+pré)
    var fp = fatorPreDiluicao(r.qPlasma, r.qPre / 60);
    ok(near(r.clearanceMlMin, (r.qEfluente / 60) * fp, 1e-9), 'id: clearance_pré = (efluente/60)·plasma/(plasma+pré)');
    ok(near(r.fatorPre, fp, 1e-9), 'id: fatorPre = plasma/(plasma+pré)');
  }
  // sem pré-diluição → fator = 1 → clearance = efluente cheio
  var s = trrc({ qPre: 0, qEfluente: 2000, qPos: 1000 });
  ok(near(s.fatorPre, 1, 1e-9), 'id: sem pré-diluição → fatorPre = 1');
  ok(near(s.clearanceMlMin, s.clearanceEfluenteMlMin, 1e-9), 'id: sem pré → clearance = efluente cheio');
})();

/* ---------- 3. LEIS ---------- */
(function () {
  // efluente↑ → dose↑ e clearance↑
  ok(trrc({ qEfluente: 2500 }).dosePrescrita > trrc({ qEfluente: 1500 }).dosePrescrita, 'lei: efluente↑ → dose↑');
  ok(trrc({ qEfluente: 2500, qPre: 1000 }).clearanceMlMin > trrc({ qEfluente: 1500, qPre: 1000 }).clearanceMlMin, 'lei: efluente↑ → clearance↑');
  // pré-diluição↑ → clearance efetivo↓ (mesmo efluente)
  ok(trrc({ qEfluente: 2000, qPre: 2000 }).clearanceMlMin < trrc({ qEfluente: 2000, qPre: 200 }).clearanceMlMin, 'lei: pré-diluição↑ → clearance efetivo↓');
  // downtime↑ → dose entregue↓ (mesma prescrição)
  ok(trrc({ qEfluente: 1750, downtime: 40 }).doseEntregue < trrc({ qEfluente: 1750, downtime: 5 }).doseEntregue, 'lei: downtime↑ → dose entregue↓');
  // pós-diluição alta (efluente alto, pré=0) → FF↑ → coágulo
  var posAlta = trrc({ qEfluente: 4000, qPre: 0, qb: 100 });
  var posBaixa = trrc({ qEfluente: 1000, qPre: 0, qb: 100 });
  ok(posAlta.ff > posBaixa.ff, 'lei: efluente/pós alto → FF↑');
  ok(posAlta.coagulo, 'lei: FF acima do limite → alerta de coágulo');
  // paciente grande → mesma dose exige mais efluente
  ok(efluenteParaDose(25, 100) > efluenteParaDose(25, 60), 'lei: paciente maior → mais efluente para a mesma dose');
  // Qb maior → mais plasma → FF menor (mesmo efluente)
  ok(trrc({ qb: 250, qEfluente: 2000, qPre: 0 }).ff < trrc({ qb: 100, qEfluente: 2000, qPre: 0 }).ff, 'lei: Qb↑ → FF↓');
})();

/* ---------- 4. PÉROLAS ---------- */
(function () {
  // (1) a dose ENTREGUE é menor que a PRESCRITA (downtime)
  var r = trrc({ peso: 70, qEfluente: 1750, downtime: 20 });
  ok(r.entregueMenorPrescrita && r.doseEntregue < 25, 'pérola: dose entregue (20) < prescrita (25) por downtime');
  ok(near(r.doseEntregue, 20, 1e-6), 'pérola: prescrever 25, entregar 20 com 20% de downtime');
  // (2) a pré-diluição protege o filtro mas custa clearance — prescrever mais efluente para compensar
  var pre = trrc({ qEfluente: 2000, qPre: 1500, qb: 150 });
  var pos = trrc({ qEfluente: 2000, qPre: 0, qPos: 1500, qb: 150 });
  ok(pre.clearanceMlMin < pos.clearanceMlMin, 'pérola: pré-diluição custa clearance (vs pós, mesmo efluente)');
  ok(pre.ff < pos.ff, 'pérola: pré-diluição protege o filtro (FF menor que pós)');
  ok(pre.prePenaliza, 'pérola: a pré-diluição penaliza o clearance (fatorPre<1)');
  // compensar: subir o efluente na pré recupera o clearance
  ok(trrc({ qEfluente: 2800, qPre: 1500 }).clearanceMlMin >= pos.clearanceMlMin - 1e-6, 'pérola: mais efluente compensa a penalidade da pré-diluição');
})();

/* ---------- 5. DETERMINISMO ---------- */
(function () {
  var inp = { peso: 80, qEfluente: 2000, qPre: 1200, qPos: 300, qb: 180, downtime: 15 };
  ok(JSON.stringify(trrc(inp)) === JSON.stringify(trrc(inp)), 'determinismo: mesma entrada → saída idêntica');
  var frozen = Object.freeze({ peso: 90, qEfluente: 2200 });
  var a, threw = false; try { a = trrc(frozen); } catch (e) { threw = true; }
  ok(!threw && fin(a.dosePrescrita), 'determinismo: Object.freeze não lança nem é mutado');
  ok(frozen.peso === 90, 'determinismo: entrada não mutada');
})();

/* ---------- 6. ROBUSTEZ ---------- */
(function () {
  var maus = [undefined, null, {}, { peso: NaN }, { peso: 'x' }, { peso: -10 }, { peso: 1e9 },
    { qEfluente: Infinity }, { qPre: -50 }, { qb: 'z' }, { downtime: 9999 }, { hct: 5 },
    { qEfluente: NaN, qPre: NaN, qb: NaN }];
  maus.forEach(function (m, i) {
    var r = trrc(m);
    ok(fin(r.dosePrescrita) && fin(r.doseEntregue) && fin(r.ff) && fin(r.clearanceMlMin) && fin(r.fatorPre),
      'robustez[' + i + ']: saídas finitas');
    ok(r.ff >= 0 && r.ff <= 2, 'robustez[' + i + ']: FF nos clamps');
    ok(r.fatorPre >= 0 && r.fatorPre <= 1, 'robustez[' + i + ']: fatorPre em [0,1]');
    ok(r.doseEntregue <= r.dosePrescrita + 1e-9, 'robustez[' + i + ']: entregue ≤ prescrita');
  });
  ok(fin(efluenteParaDose(NaN, 'x')) && efluenteParaDose(NaN, 'x') >= 0, 'robustez: efluenteParaDose com lixo → finito ≥0');
})();

/* ---------- 7. FUZZING semeado ≥5000 ---------- */
(function () {
  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  var rnd = mulberry32(0x28C0FFEE), N = 6000, bad = 0;
  function val() { var r = rnd(); if (r < 0.3) { var pool = [NaN, Infinity, -Infinity, 1e12, -1e12, 'x', null, undefined]; return pool[(rnd() * pool.length) | 0]; } return (r - 0.1) * 5000; }
  for (var i = 0; i < N; i++) {
    var inp = { peso: val(), qEfluente: val(), qPre: val(), qPos: val(), qb: val(), hct: rnd() < 0.3 ? val() : rnd() * 0.6, downtime: val() };
    var r = trrc(inp);
    var L = clearanceCurveLayout(inp, 900, 360);
    var good = fin(r.dosePrescrita) && fin(r.doseEntregue) && fin(r.ff) && fin(r.clearanceMlMin) &&
      fin(r.fatorPre) && fin(r.qPlasma) &&
      r.ff >= 0 && r.ff <= 2 && r.fatorPre >= 0 && r.fatorPre <= 1 &&
      r.dosePrescrita >= 0 && r.doseEntregue >= 0 && r.doseEntregue <= r.dosePrescrita + 1e-6 &&
      r.clearanceMlMin >= 0 &&
      Array.isArray(L.ptsPre) && L.ptsPre.length === 61 && Array.isArray(L.ptsPos) && L.ptsPos.length === 61 &&
      fin(L.current.y);
    if (!good) bad++;
  }
  ok(bad === 0, 'fuzzing: ' + N + ' entradas (30% malignas) → 0 violações (' + bad + ')');
})();

/* ---------- 8. SAÍDA ---------- */
console.log(oks + ' OK · ' + fails + ' falhas');
process.exit(fails > 0 ? 1 : 0);
