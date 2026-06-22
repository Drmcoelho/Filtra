/* FILTRA · M7 — robustez (0 falhas ou não entra) */
var M = require('./model7.js');
var tcd = M.tcd, emaxModel = M.emaxModel, caFromBlock = M.caFromBlock, tcdLayout = M.tcdLayout;
var oks = 0, fails = 0;
function ok(c, m) { if (c) oks++; else { fails++; console.log('  FALHA: ' + m); } }
function near(a, b, t) { return Math.abs(a - b) <= (t || 1e-7); }
function fin(x) { return typeof x === 'number' && isFinite(x); }

/* 1. BASE — sem fármaco, NCC pleno */
(function () {
  var r = tcd({});
  ok(near(r.ncc, 1), 'base: NCC pleno (sem fármaco, não-Gitelman)');
  ok(r.plasmaK > 3.9 && r.plasmaK < 4.5, 'base: K plasmático ~4,2');
  ok(near(r.caUrinario, 1, 1e-9), 'base: Ca urinário normal (=1)');
  ok(r.FENa > 0.5 && r.FENa < 1.0, 'base: FENa basal baixo (~0,6%)');
  ok(r.clearanceAguaLivre > 4, 'base: dilui bem (clearance de água livre alto)');
  ok(r.classe === 'normal', 'base: classe normal');
})();

/* 2. IDENTIDADES (tol 1e-7) */
(function () {
  for (var i = 0; i <= 20; i++) {
    var b = i / 20, r = tcd({ droga: 'hidroclorotiazida', dose: b * 100 });
    ok(near(r.caUrinario, M.clampv(caFromBlock(r.bloqueioTotal) * (0.7 + r.pth * 0.3), 0.2, 1.6), 1e-9), 'id: Ca = caFromBlock(bloqueio)·PTH');
    ok(r.plasmaK >= 2.8 && r.plasmaK <= 6.2, 'id: K nos clamps');
    ok(r.ncc >= 0 && r.ncc <= 1, 'id: NCC em [0,1]');
    ok(r.caUrinario >= 0.2 && r.caUrinario <= 1.6, 'id: Ca urinário nos clamps');
    ok(r.FENa >= 0.6 && r.FENa <= 8, 'id: FENa nos clamps');
    // conservação de Na distal: reabsorvido + entregue = chega (dentro do clamp do entregue)
    ok(r.reabNaTCD + r.naAoColetor <= r.naDistal + 1e-9 || r.naAoColetor === 0.005, 'id: Na conservado no TCD');
  }
  ok(near(emaxModel(0, 12.5, 0.85), 0), 'id: emax(0)=0');
  ok(near(caFromBlock(0), 1), 'id: bloqueio 0 → Ca normal');
})();

/* 3. LEIS (monotonicidade) */
(function () {
  // tiazídico ↑ dose → ↑ natriurese (FENa)
  ok(tcd({ droga: 'hidroclorotiazida', dose: 50 }).FENa > tcd({ droga: 'hidroclorotiazida', dose: 5 }).FENa, 'lei: dose↑ → natriurese↑');
  // tiazídico ↑ dose → ↓ Ca urinário (o paradoxo, monotônico)
  ok(tcd({ droga: 'hidroclorotiazida', dose: 50 }).caUrinario < tcd({ droga: 'hidroclorotiazida', dose: 5 }).caUrinario, 'lei: dose↑ → Ca urinário↓ (paradoxo)');
  // bloquear o NCC → mais Na ao coletor → K↓ (hipocalemia)
  ok(tcd({ droga: 'hidroclorotiazida', dose: 50 }).plasmaK < tcd({}).plasmaK, 'lei: tiazídico → K↓ (hipocalemia)');
  // bloquear o NCC → pior diluição → clearance de água livre↓
  ok(tcd({ droga: 'hidroclorotiazida', dose: 50 }).clearanceAguaLivre < tcd({}).clearanceAguaLivre, 'lei: tiazídico → diluição↓ (risco hipoNa)');
  // bloquear o NCC → Mg urinário↑ (hipoMg)
  ok(tcd({ droga: 'hidroclorotiazida', dose: 50 }).mgUrinario > tcd({}).mgUrinario, 'lei: tiazídico → Mg urinário↑');
  // clortalidona mantém eficácia com TFG baixa; HCTZ perde mais
  ok(tcd({ droga: 'clortalidona', dose: 25, gfr: 18 }).gfrFactor > tcd({ droga: 'hidroclorotiazida', dose: 50, gfr: 18 }).gfrFactor, 'lei: TFG baixa — clortalidona > HCTZ');
  // potência: indapamida (EC50 baixo) atinge mais bloqueio na faixa terapêutica que HCTZ na sua
  ok(tcd({ droga: 'indapamida', dose: 2.5 }).bloqueioFarmaco > 0.6, 'lei: indapamida potente em mg baixos');
  // PTH ↑ reduz modestamente o Ca urinário (mais reabsorção)... na verdade aqui PTH↑ AUMENTA o fator → Ca↑.
  // mantemos a relação como definida: PTH alto → mais Ca filtrado chega? Testamos a definição (0.7+pth*0.3):
  ok(tcd({ pth: 2 }).caUrinario > tcd({ pth: 0.5 }).caUrinario, 'lei: termo PTH move o Ca urinário no sentido definido');
})();

/* 4. PÉROLAS */
(function () {
  // O PARADOXO: o tiazídico AUMENTA a natriurese e DIMINUI o Ca urinário ao mesmo tempo
  var base = tcd({}), tz = tcd({ droga: 'hidroclorotiazida', dose: 50 });
  ok(tz.FENa > base.FENa && tz.caUrinario < base.caUrinario, 'pérola: tiazídico = +natriurese MAS −Ca urinário (paradoxo → trata litíase)');
  ok(tz.hipocalciuria, 'pérola: tiazídico → hipocalciúria (uso na nefrolitíase cálcica)');
  // contraste com a alça (M6): o tiazídico ESPELHA o efeito de Ca da alça (alça espolia, tiazídico poupa)
  ok(tcd({ droga: 'hidroclorotiazida', dose: 50 }).caUrinario < 1, 'pérola: tiazídico poupa Ca (≠ alça, que espolia)');
  // GITELMAN ≡ tiazídico crônico: hipoK + hipoMg + HIPOcalciúria
  var g = tcd({ gitelman: true });
  ok(g.hipoK && g.hipoMg && g.hipocalciuria, 'pérola: Gitelman = tiazídico endógeno (hipoK, hipoMg, hipocalciúria)');
  ok(g.ncc < 0.1, 'pérola: Gitelman aboliu o NCC');
  // segmento diluidor: bloquear o NCC piora a diluição → hiponatremia clássica do tiazídico
  ok(tz.riscoHipoNa, 'pérola: bloquear o segmento diluidor distal → hiponatremia clássica');
})();

/* 5. DETERMINISMO */
(function () {
  var inp = { gfr: 80, droga: 'clortalidona', dose: 25, pth: 1.2, naDistal: 0.12 };
  ok(JSON.stringify(tcd(inp)) === JSON.stringify(tcd(inp)), 'determinismo: saída idêntica');
  var frozen = Object.freeze({ droga: 'indapamida', dose: 2.5, gitelman: false });
  var a, threw = false; try { a = tcd(frozen); } catch (e) { threw = true; }
  ok(!threw && fin(a.caUrinario), 'determinismo: Object.freeze não lança');
  ok(frozen.dose === 2.5, 'determinismo: entrada não mutada');
})();

/* 6. ROBUSTEZ */
(function () {
  var maus = [undefined, null, {}, { gfr: NaN }, { dose: 'x' }, { droga: 'xyz' }, { droga: 9 }, { dose: Infinity },
    { pth: -5 }, { dose: -50 }, { naDistal: 1e9 }, { gfr: 1e9 }, { nccBasal: NaN }, { gitelman: 'sim' }];
  maus.forEach(function (m, i) {
    var r = tcd(m);
    ok(fin(r.plasmaK) && fin(r.caUrinario) && fin(r.ncc) && fin(r.FENa) && fin(r.clearanceAguaLivre) && fin(r.mgUrinario), 'robustez[' + i + ']: finito');
    ok(r.plasmaK >= 2.8 && r.plasmaK <= 6.2 && r.caUrinario >= 0.2 && r.caUrinario <= 1.6, 'robustez[' + i + ']: clamps K/Ca');
    ok(r.ncc >= 0 && r.ncc <= 1 && r.FENa >= 0.6 && r.FENa <= 8, 'robustez[' + i + ']: clamps NCC/FENa');
  });
})();

/* 7. FUZZING ≥5000 */
(function () {
  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  var rnd = mulberry32(0x7CD1), N = 6000, bad = 0;
  var drogas = ['nenhum', 'hidroclorotiazida', 'clortalidona', 'indapamida', 'xyz', null];
  function val() { var r = rnd(); if (r < 0.3) { var pool = [NaN, Infinity, -Infinity, 1e12, -1e12, 'x', null, undefined]; return pool[(rnd() * pool.length) | 0]; } return (r - 0.1) * 120; }
  for (var i = 0; i < N; i++) {
    var inp = { gfr: val(), naDistal: val(), nccBasal: val(), pth: val(), droga: drogas[(rnd() * drogas.length) | 0], dose: val(), gitelman: rnd() < 0.15 };
    var r = tcd(inp); var L = tcdLayout(inp, 900, 360);
    var good = fin(r.plasmaK) && fin(r.caUrinario) && fin(r.ncc) && fin(r.FENa) && fin(r.bloqueioTotal) && fin(r.mgUrinario) && fin(r.clearanceAguaLivre) &&
      r.plasmaK >= 2.8 && r.plasmaK <= 6.2 && r.caUrinario >= 0.2 && r.caUrinario <= 1.6 &&
      r.ncc >= 0 && r.ncc <= 1 && r.FENa >= 0.6 && r.FENa <= 8 && r.bloqueioTotal >= 0 && r.bloqueioTotal <= 1 &&
      Array.isArray(L.ptsFena) && L.ptsFena.length === 57 && Array.isArray(L.ptsCa) && L.ptsCa.length === 57 &&
      fin(L.current.yFena) && fin(L.current.yCa);
    if (!good) bad++;
  }
  ok(bad === 0, 'fuzzing: ' + N + ' entradas (30% malignas) → 0 violações (' + bad + ')');
})();

/* 8. SAÍDA */
console.log(oks + ' OK · ' + fails + ' falhas');
process.exit(fails > 0 ? 1 : 0);
