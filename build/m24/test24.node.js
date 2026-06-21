/* =========================================================================
 * FILTRA · M24 — bateria de robustez do engine (0 falhas ou não entra)
 * 1 BASE · 2 IDENTIDADES · 3 LEIS · 4 PÉROLAS · 5 DETERMINISMO · 6 ROBUSTEZ · 7 FUZZING ≥5000 · 8 SAÍDA
 * ========================================================================= */
var M = require('./model24.js');
var ufSession = M.ufSession, refillEfetivo = M.refillEfetivo, fatorAlbumina = M.fatorAlbumina, pvCurveLayout = M.pvCurveLayout;

var oks = 0, fails = 0;
function ok(c, m) { if (c) oks++; else { fails++; console.log('  FALHA: ' + m); } }
function near(a, b, t) { return Math.abs(a - b) <= (t || 1e-7); }
function fin(x) { return typeof x === 'number' && isFinite(x); }

/* ---------- 1. LINHA DE BASE ---------- */
(function () {
  // UF gentil: 2 kg em 4 h → UF rate baixa < refilling → volume estável
  var gentil = ufSession({ pesoAtual: 72, pesoSeco: 70, tempoHoras: 4, albumina: 4, refillBase: 12 });
  ok(gentil.ufRateKgh > 6 && gentil.ufRateKgh < 8, 'base: UF gentil ~6,9 mL/kg/h');
  ok(!gentil.ufExcedeRefilling, 'base: UF gentil NÃO excede o refilling');
  ok(gentil.quedaPVfrac < 0.12, 'base: UF gentil → volume plasmático estável (queda <12%)');
  ok(!gentil.hipotensao, 'base: UF gentil → sem hipotensão');
  // UF agressiva: 5 kg em 3 h → UF rate alta > refilling → volume cai (crash)
  var agr = ufSession({ pesoAtual: 75, pesoSeco: 70, tempoHoras: 3, albumina: 4, refillBase: 12 });
  ok(agr.ufRateKgh > 18, 'base: UF agressiva alta (>18 mL/kg/h)');
  ok(agr.ufExcedeRefilling, 'base: UF agressiva EXCEDE o refilling');
  ok(agr.quedaPVfrac > gentil.quedaPVfrac, 'base: UF agressiva → volume plasmático cai mais');
  ok(agr.hipotensao && agr.stunning, 'base: UF agressiva → hipotensão e stunning');
  // refilling máximo na albumina de referência
  ok(near(refillEfetivo(12, 4, 0), 12, 1e-9), 'base: refilling máx = refillBase na alb=4, interstício cheio');
})();

/* ---------- 2. IDENTIDADES ---------- */
(function () {
  for (var i = 0; i < 40; i++) {
    var pAtual = 60 + (i % 8) * 4, pSeco = 55 + (i % 5) * 3, t = 2 + (i % 6);
    if (pAtual < pSeco) { var tmp = pAtual; pAtual = pSeco + 1; pSeco = tmp; }
    var r = ufSession({ pesoAtual: pAtual, pesoSeco: pSeco, tempoHoras: t, albumina: 3 + (i % 3), refillBase: 6 + (i % 4) * 4 });
    ok(near(r.ufTotalMl, (r.pesoAtual - r.pesoSeco) * 1000, 1e-6), 'id: UF total = (peso atual − peso seco)·1000');
    ok(near(r.ufRateMlh, r.ufTotalMl / r.tempoHoras, 1e-6), 'id: UF rate (mL/h) = UF total / tempo');
    ok(near(r.ufRateKgh, r.ufRateMlh / r.pesoAtual, 1e-6), 'id: UF rate (mL/kg/h) = UF rate / peso');
    ok(near(r.margemKgh, r.refMaxKgh - r.ufRateKgh, 1e-6), 'id: margem = refilling máx − UF rate');
    ok(r.pvMin <= r.pvInicial + 1e-6, 'id: PV mínimo ≤ PV inicial');
  }
  // fator de albumina: linear até o teto
  ok(near(fatorAlbumina(4), 1, 1e-9), 'id: fator albumina = 1 em alb=4 (referência)');
  ok(fatorAlbumina(2) < fatorAlbumina(4), 'id: fator albumina cai com a hipoalbuminemia');
  // refilling cai com o esgotamento (quadrático)
  ok(refillEfetivo(12, 4, 0) > refillEfetivo(12, 4, 0.9), 'id: refilling esgotado < refilling cheio');
})();

/* ---------- 3. LEIS ---------- */
(function () {
  var b = { pesoAtual: 73, pesoSeco: 70, refillBase: 12, albumina: 4 };
  function set(o) { var x = {}; for (var k in b) x[k] = b[k]; for (var k2 in o) x[k2] = o[k2]; return x; }
  // UF rate↑ (menos tempo, mesma UF total) → volume plasmático↓ e risco↑
  var t3 = ufSession(set({ tempoHoras: 3 })), t6 = ufSession(set({ tempoHoras: 6 }));
  ok(t3.ufRateKgh > t6.ufRateKgh, 'lei: menos tempo → UF rate maior');
  ok(t3.quedaPVfrac > t6.quedaPVfrac, 'lei: UF rate↑ → volume plasmático cai mais');
  ok(t3.risco > t6.risco, 'lei: UF rate↑ → risco↑');
  // mais tempo (MESMA UF total) → UF rate↓ → risco↓ (a prevenção)
  ok(ufSession(set({ tempoHoras: 6 })).risco < ufSession(set({ tempoHoras: 4 })).risco, 'lei: mais tempo (mesma UF total) → risco↓');
  // refilling↑ → tolera mais (queda menor)
  ok(ufSession(set({ refillBase: 20 })).quedaPVfrac < ufSession(set({ refillBase: 6 })).quedaPVfrac, 'lei: refilling↑ → tolera mais (menos queda)');
  ok(ufSession(set({ refillBase: 20 })).risco <= ufSession(set({ refillBase: 6 })).risco, 'lei: refilling↑ → risco↓');
  // albumina↓ → refilling↓ → queda↑ → risco↑
  ok(ufSession(set({ albumina: 2 })).refMaxKgh < ufSession(set({ albumina: 4 })).refMaxKgh, 'lei: albumina↓ → refilling↓');
  ok(ufSession(set({ albumina: 2 })).quedaPVfrac > ufSession(set({ albumina: 4 })).quedaPVfrac, 'lei: albumina↓ → volume cai mais');
  // mais UF total (mais peso a tirar) na mesma janela → UF rate↑ → risco↑
  ok(ufSession(set({ pesoAtual: 75 })).ufRateKgh > ufSession(set({ pesoAtual: 72 })).ufRateKgh, 'lei: mais peso a remover → UF rate↑');
})();

/* ---------- 4. PÉROLAS ---------- */
(function () {
  // (1) a hipotensão é UF > refilling, NÃO "volume baixo": dois doentes com a MESMA UF total,
  //     um tolera (refilling alto) e o outro crasha (refilling baixo)
  var tolera = ufSession({ pesoAtual: 74, pesoSeco: 70, tempoHoras: 4, refillBase: 18, albumina: 4 });
  var crasha = ufSession({ pesoAtual: 74, pesoSeco: 70, tempoHoras: 4, refillBase: 6, albumina: 4 });
  ok(near(tolera.ufTotalMl, crasha.ufTotalMl, 1e-6), 'pérola: MESMA UF total nos dois');
  ok(tolera.risco < crasha.risco && crasha.ufExcedeRefilling && !tolera.ufExcedeRefilling,
    'pérola: a hipotensão é UF>refilling, não "volume baixo" (mesma UF total, destinos opostos)');
  // (2) baixar a TAXA de UF (mais tempo) previne — mesma UF total
  var rapido = ufSession({ pesoAtual: 75, pesoSeco: 70, tempoHoras: 2.5, refillBase: 12, albumina: 4 });
  var lento = ufSession({ pesoAtual: 75, pesoSeco: 70, tempoHoras: 6, refillBase: 12, albumina: 4 });
  ok(near(rapido.ufTotalMl, lento.ufTotalMl, 1e-6) && lento.risco < rapido.risco,
    'pérola: mais tempo (mesma UF total) previne a hipotensão');
  // (3) stunning é o custo cumulativo silencioso da UF agressiva
  var stun = ufSession({ pesoAtual: 76, pesoSeco: 70, tempoHoras: 3, refillBase: 12, albumina: 4 });
  ok(stun.stunning && stun.ufRateKgh > M.LLIM_KGH, 'pérola: UF agressiva → stunning miocárdico (custo cumulativo)');
  // hipoalbuminemia: refilling baixo, crasha com UF moderada
  var hipo = ufSession({ pesoAtual: 73, pesoSeco: 70, tempoHoras: 4, refillBase: 12, albumina: 2 });
  ok(hipo.hipoalbumin && hipo.refMaxKgh < 9, 'pérola: hipoalbuminemia → refilling baixo (gradiente oncótico↓)');
})();

/* ---------- 5. DETERMINISMO ---------- */
(function () {
  var inp = { pesoAtual: 74.5, pesoSeco: 70, tempoHoras: 3.5, refillBase: 11, albumina: 3.2 };
  ok(JSON.stringify(ufSession(inp)) === JSON.stringify(ufSession(inp)), 'determinismo: mesma entrada → saída idêntica');
  var frozen = Object.freeze({ pesoAtual: 76, pesoSeco: 70 });
  var a, threw = false; try { a = ufSession(frozen); } catch (e) { threw = true; }
  ok(!threw && fin(a.risco), 'determinismo: Object.freeze não lança nem é mutado');
  ok(frozen.pesoAtual === 76, 'determinismo: entrada não mutada');
})();

/* ---------- 6. ROBUSTEZ ---------- */
(function () {
  var maus = [undefined, null, {}, { pesoAtual: NaN }, { pesoAtual: 'x' }, { pesoSeco: -10 },
    { tempoHoras: 0 }, { tempoHoras: Infinity }, { refillBase: 1e9 }, { albumina: -3 },
    { pesoAtual: 50, pesoSeco: 90 }, { albumina: 'z' }, { tempoHoras: NaN }];
  maus.forEach(function (m, i) {
    var r = ufSession(m);
    ok(fin(r.ufRateKgh) && fin(r.risco) && fin(r.quedaPVfrac) && fin(r.refMaxKgh) && fin(r.margemKgh),
      'robustez[' + i + ']: saídas finitas');
    ok(r.risco >= 0 && r.risco <= 1, 'robustez[' + i + ']: risco em [0,1]');
    ok(r.ufRateKgh >= 0 && r.refMaxKgh >= 0, 'robustez[' + i + ']: taxas não-negativas');
    ok(r.quedaPVfrac >= -1e-9 && r.quedaPVfrac <= 1, 'robustez[' + i + ']: queda do PV em [0,1]');
  });
  ok(refillEfetivo(NaN, 'x', Infinity) >= 0 && fin(refillEfetivo(NaN, 'x', Infinity)), 'robustez: refillEfetivo com lixo → finito ≥0');
})();

/* ---------- 7. FUZZING semeado ≥5000 ---------- */
(function () {
  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  var rnd = mulberry32(0x24F11A), N = 6000, bad = 0;
  function val() { var r = rnd(); if (r < 0.3) { var pool = [NaN, Infinity, -Infinity, 1e12, -1e12, 'x', null, undefined]; return pool[(rnd() * pool.length) | 0]; } return (r - 0.15) * 260; }
  for (var i = 0; i < N; i++) {
    var inp = { pesoAtual: val(), pesoSeco: val(), tempoHoras: val(), refillBase: val(), albumina: val() };
    var r = ufSession(inp);
    var L = pvCurveLayout(inp, 900, 360);
    var good = fin(r.ufRateKgh) && fin(r.ufRateMlh) && fin(r.risco) && fin(r.quedaPVfrac) && fin(r.refMaxKgh) &&
      fin(r.margemKgh) && fin(r.pvInicial) && fin(r.pvMin) &&
      r.risco >= 0 && r.risco <= 1 && r.ufRateKgh >= 0 && r.refMaxKgh >= 0 &&
      r.quedaPVfrac >= -1e-9 && r.quedaPVfrac <= 1 &&
      Array.isArray(L.pts) && L.pts.length === 241 && fin(L.pts[0].y) && fin(L.thresholdY) &&
      Array.isArray(L.ptsGentle) && L.ptsGentle.length === 241;
    if (!good) bad++;
  }
  ok(bad === 0, 'fuzzing: ' + N + ' entradas (30% malignas) → 0 violações (' + bad + ')');
})();

/* ---------- 8. SAÍDA ---------- */
console.log(oks + ' OK · ' + fails + ' falhas');
process.exit(fails > 0 ? 1 : 0);
