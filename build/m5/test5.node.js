/* =========================================================================
 * FILTRA · M5 — bateria de robustez (0 falhas ou não entra)
 * 1 BASE · 2 IDENTIDADES · 3 LEIS · 4 PÉROLAS · 5 DETERMINISMO · 6 ROBUSTEZ · 7 FUZZING ≥5000 · 8 SAÍDA
 * ========================================================================= */
var M = require('./model5.js');
var tcp = M.tcp, glicoseHandling = M.glicoseHandling, emaxModel = M.emaxModel, tcpLayout = M.tcpLayout;

var oks = 0, fails = 0;
function ok(c, m) { if (c) oks++; else { fails++; console.log('  FALHA: ' + m); } }
function near(a, b, t) { return Math.abs(a - b) <= (t || 1e-7); }
function fin(x) { return typeof x === 'number' && isFinite(x); }

/* 1. BASE */
(function () {
  var r = tcp({});
  ok(near(r.naReabsFrac, 0.65), 'base: TCP reabsorve ~65% do Na');
  ok(!r.glicosuria, 'base: sem glicosúria com glicemia 100');
  ok(r.limiarGlu > 250 && r.limiarGlu < 320, 'base: limiar de glicose ~Tm/GFR (≈300 teórico)');
  ok(near(r.plasmaHCO3novo, 24, 1e-6), 'base: HCO₃ plasmático preservado sem fármaco');
  ok(r.classe === 'normal', 'base: classe normal');
  ok(near(glicoseHandling(100, 125, 375).excretada, 0), 'base: glicose 100 → excreção ~0');
})();

/* 2. IDENTIDADES */
(function () {
  for (var i = 0; i < 40; i++) {
    var pg = 60 + i * 25, r = tcp({ plasmaGlu: pg, gfr: 120 });
    ok(near(r.gluFiltrada, 120 * pg / 100, 1e-6), 'id: filtrada = GFR·Pglu/100');
    ok(near(r.gluExcretada, Math.max(r.gluFiltrada - r.gluReabsorvida, 0), 1e-6), 'id: excretada = filtrada − reabsorvida');
    ok(r.gluReabsorvida <= r.TmG + 1e-9, 'id: reabsorvida ≤ Tm');
    ok(r.diureseIndex >= 1 && r.diureseIndex <= 8, 'id: diurese nos clamps');
  }
  // emax satura em [0, Emax]
  ok(near(emaxModel(0, 5, 0.9), 0), 'id: emax(0)=0');
  ok(emaxModel(1e6, 5, 0.9) <= 0.9 + 1e-9 && emaxModel(1e6, 5, 0.9) > 0.89, 'id: emax satura em Emax');
})();

/* 3. LEIS */
(function () {
  // glicose: acima do limiar, glicemia↑ → excreção↑
  ok(tcp({ plasmaGlu: 500 }).gluExcretada > tcp({ plasmaGlu: 350 }).gluExcretada, 'lei: acima do limiar, glicemia↑ → glicosúria↑');
  ok(near(tcp({ plasmaGlu: 120 }).gluExcretada, 0), 'lei: abaixo do limiar, sem glicosúria');
  // SGLT2i: dose↑ → Tm↓ → glicosúria mesmo com glicemia normal
  ok(tcp({ droga: 'sglt2i', dose: 25, plasmaGlu: 100 }).gluExcretada > tcp({ droga: 'sglt2i', dose: 0, plasmaGlu: 100 }).gluExcretada, 'lei: SGLT2i ↑dose → glicosúria normoglicêmica');
  ok(tcp({ droga: 'sglt2i', dose: 25 }).TmG < tcp({ droga: 'sglt2i', dose: 5 }).TmG, 'lei: SGLT2i ↑dose → Tm↓');
  // acetazolamida: dose↑ → reabsHCO3↓ → HCO3 plasmático↓ (acidose)
  ok(tcp({ droga: 'acetazolamida', dose: 1000 }).plasmaHCO3novo < tcp({ droga: 'acetazolamida', dose: 250 }).plasmaHCO3novo, 'lei: acetazolamida ↑dose → HCO₃↓ (acidose)');
  ok(tcp({ droga: 'acetazolamida', dose: 1000 }).bicarbonaturia, 'lei: acetazolamida → bicarbonatúria');
  // manitol: diurese osmótica
  ok(tcp({ droga: 'manitol', dose: 100 }).diureseIndex > tcp({ droga: 'manitol', dose: 12 }).diureseIndex, 'lei: manitol ↑dose → diurese↑');
  // natriurese: acetazolamida e sglt2i reduzem a reabsorção de Na
  ok(tcp({ droga: 'acetazolamida', dose: 1000 }).naReabsFrac < 0.65, 'lei: acetazolamida → natriurese (Na reabs↓)');
})();

/* 4. PÉROLAS */
(function () {
  // SGLT2i causa glicosúria com glicemia NORMAL (chave que abre o segmento)
  var s = tcp({ droga: 'sglt2i', dose: 25, plasmaGlu: 95 });
  ok(s.glicosuria && s.classe === 'glicosuria', 'pérola: SGLT2i → glicosúria com glicemia normal');
  // Fanconi: glicosúria normoglicêmica + bicarbonatúria + (TmG baixo) sem fármaco
  var f = tcp({ fanconi: true, plasmaGlu: 95 });
  ok(f.glicosuria && f.bicarbonaturia && f.classe === 'fanconi', 'pérola: Fanconi → glicosúria normoglicêmica + bicarbonatúria');
  // a "alça é prisioneira do proximal": bloquear o proximal entrega mais Na adiante (natriurese)
  ok(tcp({ droga: 'acetazolamida', dose: 1000 }).naReabsFrac < tcp({}).naReabsFrac, 'pérola: bloquear o TCP entrega mais Na a jusante');
  // limiar: o mesmo Tm dá limiar maior quando a TFG é menor (menos glicose filtrada)
  ok(tcp({ gfr: 60 }).limiarGlu > tcp({ gfr: 125 }).limiarGlu, 'pérola: TFG baixa → limiar de glicosúria mais alto');
})();

/* 5. DETERMINISMO */
(function () {
  var inp = { plasmaGlu: 300, droga: 'sglt2i', dose: 20, gfr: 110 };
  ok(JSON.stringify(tcp(inp)) === JSON.stringify(tcp(inp)), 'determinismo: saída idêntica');
  var frozen = Object.freeze({ plasmaGlu: 250, droga: 'acetazolamida', dose: 500 });
  var a, threw = false; try { a = tcp(frozen); } catch (e) { threw = true; }
  ok(!threw && fin(a.plasmaHCO3novo), 'determinismo: Object.freeze não lança');
  ok(frozen.plasmaGlu === 250, 'determinismo: entrada não mutada');
})();

/* 6. ROBUSTEZ */
(function () {
  var maus = [undefined, null, {}, { plasmaGlu: NaN }, { plasmaGlu: 'x' }, { gfr: -10 }, { dose: Infinity },
    { droga: 'xyz' }, { droga: 123 }, { plasmaHCO3: NaN }, { dose: -50 }, { gfr: 1e9 }, { plasmaGlu: 1e9 }];
  maus.forEach(function (m, i) {
    var r = tcp(m);
    ok(fin(r.gluExcretada) && fin(r.plasmaHCO3novo) && fin(r.diureseIndex) && fin(r.TmG), 'robustez[' + i + ']: finito');
    ok(r.gluExcretada >= 0 && r.diureseIndex >= 1 && r.diureseIndex <= 8, 'robustez[' + i + ']: clamps');
    ok(r.naReabsFrac >= 0.3 && r.naReabsFrac <= 0.65, 'robustez[' + i + ']: Na reabs nos clamps');
  });
})();

/* 7. FUZZING semeado ≥5000 */
(function () {
  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  var rnd = mulberry32(0x70C5), N = 20000, bad = 0;
  var drogas = ['nenhum', 'sglt2i', 'acetazolamida', 'manitol', 'xyz', null];
  function val() { var r = rnd(); if (r < 0.3) { var pool = [NaN, Infinity, -Infinity, 1e12, -1e12, 'x', null, undefined]; return pool[(rnd() * pool.length) | 0]; } return (r - 0.1) * 900; }
  for (var i = 0; i < N; i++) {
    var inp = { plasmaGlu: val(), gfr: val(), plasmaHCO3: val(), dose: val(), droga: drogas[(rnd() * drogas.length) | 0], fanconi: rnd() > 0.5 };
    var r = tcp(inp); var L = tcpLayout(inp, 900, 360);
    var good = fin(r.gluExcretada) && fin(r.plasmaHCO3novo) && fin(r.diureseIndex) && fin(r.TmG) && fin(r.efeitoFarm) &&
      r.gluExcretada >= 0 && r.diureseIndex >= 1 && r.diureseIndex <= 8 &&
      r.naReabsFrac >= 0.3 && r.naReabsFrac <= 0.65 && r.plasmaHCO3novo >= 8 && r.plasmaHCO3novo <= 40 &&
      r.efeitoFarm >= 0 && r.efeitoFarm <= 1 &&
      Array.isArray(L.filtrada) && L.filtrada.length === 61 && fin(L.current.x);
    if (!good) bad++;
  }
  ok(bad === 0, 'fuzzing: ' + N + ' entradas (30% malignas) → 0 violações (' + bad + ')');
})();

/* 8. SAÍDA */
console.log(oks + ' OK · ' + fails + ' falhas');
process.exit(fails > 0 ? 1 : 0);
