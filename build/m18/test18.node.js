/* =========================================================================
 * FILTRA · M18 — bateria de robustez (0 falhas ou não entra)
 * 1 BASE · 2 IDENTIDADES · 3 LEIS · 4 PÉROLAS · 5 DETERMINISMO · 6 ROBUSTEZ · 7 FUZZING ≥5000 · 8 SAÍDA
 * ========================================================================= */
var M = require('./model18.js');
var rim = M.rim, emaxModel = M.emaxModel, ajusteRenal = M.ajusteRenal, craLayout = M.craLayout;

var oks = 0, fails = 0;
function ok(c, m) { if (c) oks++; else { fails++; console.log('  FALHA: ' + m); } }
function near(a, b, t) { return Math.abs(a - b) <= (t || 1e-7); }
function fin(x) { return typeof x === 'number' && isFinite(x); }

/* 1. BASE */
(function () {
  // IECA em dose padrão → Cr↑ entre 10 e 30% (esperado), proteinúria cai
  var r = rim({ droga: 'enalapril', dose: 20 });
  ok(r.dCrPct > 10 && r.dCrPct <= 30, 'base: IECA padrão → Cr↑ 10–30% (esperado) [' + r.dCrPct.toFixed(1) + '%]');
  ok(r.proteinuria_nova < r.proteinuria, 'base: IECA → proteinúria↓ (nefroproteção)');
  ok(r.flag === 'alta_esperada' && r.conduta === 'manter', 'base: IECA padrão → flag esperada / manter');
  ok(r.dFFfrac < 0, 'base: FF cai (fluxo plasmático preservado)');
  // EPO → Hb sobe
  var e = rim({ droga: 'epoetina', dose: 100, Hb_basal: 8 });
  ok(e.Hb_novo > 8, 'base: EPO → Hb↑');
  // cinacalcete → PTH cai
  var c = rim({ droga: 'cinacalcete', dose: 90, PTH_basal: 700 });
  ok(c.PTH_novo < 700, 'base: cinacalcete → PTH↓');
  // sem fármaco → nada muda
  var z = rim({});
  ok(near(z.dCrPct, 0) && z.flag === 'basal', 'base: sem fármaco → Cr estável, flag basal');
})();

/* 2. IDENTIDADES */
(function () {
  // emax: efeito(0)=0; em EC50 → Emax/2; em ∞ → Emax
  ok(near(emaxModel(0, 50, 0.9), 0), 'id: emax(0)=0');
  ok(near(emaxModel(50, 50, 0.9), 0.45, 1e-9), 'id: emax(EC50)=Emax/2');
  ok(emaxModel(1e9, 50, 0.9) <= 0.9 + 1e-9 && emaxModel(1e9, 50, 0.9) > 0.8999, 'id: emax(∞)→Emax');
  for (var i = 0; i < 30; i++) {
    var dose = 5 + i * 3, r = rim({ droga: 'enalapril', dose: dose, TFG: 70 });
    // Cr ∝ 1/TFG: Cr_novo/Cr_basal == TFG/TFG_novo
    ok(near(r.Cr_novo / r.Cr_basal, r.TFG / r.TFG_novo, 1e-6), 'id: Cr ∝ 1/TFG');
    // ΔCr% coerente com Cr_novo
    ok(near(r.Cr_novo, r.Cr_basal * (1 + r.dCrPct / 100), 1e-6), 'id: Cr_novo = Cr_basal·(1+ΔCr%)');
    ok(r.efeitoFarm >= 0 && r.efeitoFarm <= 1, 'id: efeitoFarm em [0,1]');
  }
  // ajuste renal: clearance normal e fração renal 0 → manter ~dose plena
  var aj = ajusteRenal({ fracaoRenal: 0, clearance: 100 });
  ok(near(aj.fracaoManter, 1, 1e-9), 'id: fração renal 0 → manter dose plena');
})();

/* 3. LEIS */
(function () {
  // dose RAAS↑ → Cr↑ e proteinúria↓
  ok(rim({ droga: 'enalapril', dose: 40 }).dCrPct > rim({ droga: 'enalapril', dose: 5 }).dCrPct, 'lei: dose IECA↑ → ΔCr%↑');
  ok(rim({ droga: 'enalapril', dose: 40 }).proteinuria_nova < rim({ droga: 'enalapril', dose: 5 }).proteinuria_nova, 'lei: dose IECA↑ → proteinúria↓');
  ok(rim({ droga: 'losartana', dose: 100 }).K_novo > rim({ droga: 'losartana', dose: 0 }).K_novo, 'lei: dose BRA↑ → K↑');
  // EPO↑ → Hb↑
  ok(rim({ droga: 'epoetina', dose: 100, Hb_basal: 8 }).Hb_novo > rim({ droga: 'epoetina', dose: 50, Hb_basal: 8 }).Hb_novo, 'lei: EPO↑ → Hb↑');
  // cinacalcete↑ → PTH↓
  ok(rim({ droga: 'cinacalcete', dose: 90, PTH_basal: 800 }).PTH_novo < rim({ droga: 'cinacalcete', dose: 30, PTH_basal: 800 }).PTH_novo, 'lei: cinacalcete↑ → PTH↓');
  // sevelâmer↑ → PO4↓
  ok(rim({ droga: 'sevelamer', dose: 1600, PO4_basal: 7 }).PO4_novo < rim({ droga: 'sevelamer', dose: 800, PO4_basal: 7 }).PO4_novo, 'lei: sevelâmer↑ → PO₄↓');
  // estenose bilateral → ΔCr% muito maior que sem
  ok(rim({ droga: 'enalapril', dose: 40, estenoseBilateral: true }).dCrPct > rim({ droga: 'enalapril', dose: 40 }).dCrPct, 'lei: estenose bilateral → ΔCr%↑↑ (precipício)');
  // ajuste renal: fração renal↑ e clearance↓ → manter menos
  ok(ajusteRenal({ fracaoRenal: 0.9, clearance: 20 }).fracaoManter < ajusteRenal({ fracaoRenal: 0.2, clearance: 100 }).fracaoManter, 'lei: fração renal↑ + clearance↓ → ↓dose');
})();

/* 4. PÉROLAS */
(function () {
  // PÉROLA 1: Cr↑ ≤30% pelo eferente é ESPERADO (manter), com FF↓
  var p = rim({ droga: 'enalapril', dose: 20, Cr_basal: 1.4, K_basal: 4.5 });
  ok(p.dCrPct <= 30 && p.flag === 'alta_esperada' && p.conduta === 'manter' && p.dFFfrac < 0, 'pérola: Cr↑≤30% pelo eferente é esperado (FF↓, manter)');
  // PÉROLA 2: mesma droga, dois destinos — estenose decide
  var benigno = rim({ droga: 'enalapril', dose: 40, TFG: 60 });
  var precipicio = rim({ droga: 'enalapril', dose: 40, TFG: 60, estenoseBilateral: true });
  ok(benigno.conduta === 'manter' && precipicio.conduta === 'suspender' && precipicio.dCrPct > 30, 'pérola: a mesma dose — nefroproteção × precipício pela estenose');
  // PÉROLA 3: hipercalemia manda suspender mesmo com ΔCr pequena (IECA+ARM sobe K)
  var hiper = rim({ droga: 'espironolactona', dose: 50, K_basal: 5.2 });
  ok(hiper.K_novo >= 5.5 && hiper.hipercalemia, 'pérola: ARM com K basal alto → hipercalemia');
  // suspender por hipercalemia
  var ieca_hiper = rim({ droga: 'enalapril', dose: 40, K_basal: 5.3 });
  ok(ieca_hiper.flag === 'hipercalemia' && ieca_hiper.conduta === 'suspender', 'pérola: IECA + K alto → suspender por hipercalemia');
  // PÉROLA 4: fármaco hidrofílico, pouco ligado, fração renal alta → dialisável + ↓dose
  var dial = rim({ droga: 'enalapril', dose: 20, Vd: 0.2, ligacaoProteica: 10, fracaoRenal: 0.9, clearance: 20 });
  ok(dial.dialisavel && dial.fracaoManter < 1, 'pérola: hidrofílico/pouco ligado/fração renal alta → dialisável + ↓dose');
})();

/* 5. DETERMINISMO */
(function () {
  var inp = { droga: 'losartana', dose: 75, TFG: 55, K_basal: 4.8, estenoseBilateral: false };
  ok(JSON.stringify(rim(inp)) === JSON.stringify(rim(inp)), 'determinismo: saída idêntica');
  var frozen = Object.freeze({ droga: 'enalapril', dose: 20, TFG: 60 });
  var a, threw = false; try { a = rim(frozen); } catch (e) { threw = true; }
  ok(!threw && fin(a.dCrPct), 'determinismo: Object.freeze não lança');
  ok(frozen.dose === 20, 'determinismo: entrada não mutada');
})();

/* 6. ROBUSTEZ */
(function () {
  var maus = [undefined, null, {}, { dose: NaN }, { droga: 'xyz' }, { droga: 123 }, { TFG: -10 },
    { dose: Infinity }, { Cr_basal: NaN }, { K_basal: 'x' }, { TFG: 1e9 }, { Vd: NaN }, { clearance: -5 },
    { droga: 'enalapril', dose: 'abc' }, { proteinuria: Infinity }, { Hb_basal: -3 }];
  maus.forEach(function (m, i) {
    var r = rim(m);
    ok(fin(r.dCrPct) && fin(r.TFG_novo) && fin(r.Cr_novo) && fin(r.K_novo) && fin(r.Hb_novo) && fin(r.PTH_novo) && fin(r.dose_renal_ajustada), 'robustez[' + i + ']: finito');
    ok(r.dCrPct >= 0 && r.dCrPct <= 600 && r.K_novo >= 2.5 && r.K_novo <= 8 && r.fracaoManter >= 0.1 && r.fracaoManter <= 1, 'robustez[' + i + ']: clamps');
    ok(r.efeitoFarm >= 0 && r.efeitoFarm <= 1, 'robustez[' + i + ']: efeitoFarm nos clamps');
  });
})();

/* 7. FUZZING semeado ≥5000 */
(function () {
  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  var rnd = mulberry32(0x18C5), N = 6000, bad = 0;
  var drogas = ['nenhum', 'enalapril', 'losartana', 'alisquireno', 'espironolactona', 'sacubitril', 'epoetina', 'sevelamer', 'cinacalcete', 'xyz', null];
  function val() { var r = rnd(); if (r < 0.3) { var pool = [NaN, Infinity, -Infinity, 1e12, -1e12, 'x', null, undefined]; return pool[(rnd() * pool.length) | 0]; } return (r - 0.1) * 900; }
  for (var i = 0; i < N; i++) {
    var inp = {
      droga: drogas[(rnd() * drogas.length) | 0], dose: val(), TFG: val(), Cr_basal: val(), K_basal: val(),
      proteinuria: val(), Hb_basal: val(), PTH_basal: val(), PO4_basal: val(), Ca_basal: val(),
      Vd: val(), ligacaoProteica: val(), fracaoRenal: val(), clearance: val(),
      estenoseBilateral: rnd() > 0.5
    };
    var r = rim(inp); var L = craLayout(inp, 900, 360);
    var good = fin(r.dCrPct) && fin(r.TFG_novo) && fin(r.Cr_novo) && fin(r.K_novo) && fin(r.Hb_novo) &&
      fin(r.PTH_novo) && fin(r.PO4_novo) && fin(r.Ca_novo) && fin(r.dose_renal_ajustada) && fin(r.efeitoFarm) &&
      r.dCrPct >= 0 && r.dCrPct <= 600 && r.K_novo >= 2.5 && r.K_novo <= 8 &&
      r.fracaoManter >= 0.1 && r.fracaoManter <= 1 && r.efeitoFarm >= 0 && r.efeitoFarm <= 1 &&
      r.Hb_novo >= 4 && r.Hb_novo <= 18 && r.TFG_novo >= 1 && r.TFG_novo <= 160 &&
      Array.isArray(L.curva) && L.curva.length === 61 && fin(L.current.x) && fin(L.current.dCrPct);
    if (!good) bad++;
  }
  ok(bad === 0, 'fuzzing: ' + N + ' entradas (30% malignas) → 0 violações (' + bad + ')');
})();

/* 8. SAÍDA */
console.log(oks + ' OK · ' + fails + ' falhas');
process.exit(fails > 0 ? 1 : 0);
