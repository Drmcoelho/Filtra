/* =========================================================================
 * FILTRA · M20 — bateria de robustez do engine (0 falhas ou não entra)
 * 1 BASE · 2 IDENTIDADES · 3 LEIS · 4 PÉROLAS · 5 DETERMINISMO · 6 ROBUSTEZ · 7 FUZZING ≥5000 · 8 SAÍDA
 * ========================================================================= */
var M = require('./model20.js');
var circuito = M.circuito, clearanceDialisador = M.clearanceDialisador, qbEfetivo = M.qbEfetivo,
    tmpNecessaria = M.tmpNecessaria, ufDeTMP = M.ufDeTMP, recirculacaoPct = M.recirculacaoPct,
    qbDoAcesso = M.qbDoAcesso, clearanceCurveLayout = M.clearanceCurveLayout;

var oks = 0, fails = 0;
function ok(c, m) { if (c) oks++; else { fails++; console.log('  FALHA: ' + m); } }
function near(a, b, t) { return Math.abs(a - b) <= (t || 1e-7); }
function fin(x) { return typeof x === 'number' && isFinite(x); }

/* ---------- 1. LINHA DE BASE ---------- */
(function () {
  var r = circuito({});
  ok(r.Kdial > 200 && r.Kdial < 250, 'base: Qb300/Qd500 → clearance ureia ~200–250 mL/min (' + r.Kdial.toFixed(0) + ')');
  ok(r.Part < 0, 'base: P_art pré-bomba é NEGATIVA');
  ok(r.Pven > 0, 'base: P_ven de retorno é POSITIVA');
  ok(r.Part < 0 && r.Pven > 0, 'base: P_art < 0 < P_ven');
  ok(r.Qbe <= r.Qb + 1e-9, 'base: Qb_efetivo ≤ Qb_pedido');
  ok(near(r.ufEfetiva, r.Quf, 1e-6), 'base: UF efetiva = UF prescrita (TMP = Quf/Kuf)');
  ok(r.recirc === 0, 'base: agulhas separadas → 0% recirculação');
  ok(near(r.Kefetivo, r.Kdial, 1e-9), 'base: sem recirculação, K efetivo = K dialisador');
  ok(near(r.TMP, 800 / 30, 1e-6), 'base: TMP = 800/30 ≈ 26,7 mmHg');
})();

/* ---------- 2. IDENTIDADES ---------- */
(function () {
  for (var i = 0; i < 40; i++) {
    var Quf = 200 + i * 120, Kuf = 10 + (i % 5) * 8;
    var tmp = tmpNecessaria(Quf, Kuf);
    ok(near(ufDeTMP(tmp, Kuf), Math.min(Quf, 6000), 1e-6), 'id: UF = Kuf·TMP (reversível) [' + i + ']');
    ok(near(tmp, Math.min(Quf, 6000) / Kuf, 1e-6) || tmp === 600, 'id: TMP = Quf/Kuf [' + i + ']');
  }
  for (var j = 0; j < 30; j++) {
    var Qb = 100 + j * 12, acesso = 0.2 + (j % 6) * 0.2;
    var r = circuito({ Qb: Qb, acesso: acesso, Quf: 1000, Kuf: 25, distAgulhas: (j % 4) / 3 });
    ok(near(r.Qbe, Math.min(Qb, qbDoAcesso(acesso)), 1e-6), 'id: Qb_efetivo = min(pedido, acesso) [' + j + ']');
    ok(near(r.ufEfetiva, r.Quf, 1e-6) || r.TMP === 600, 'id: UF = Kuf·TMP no estado [' + j + ']');
    ok(near(r.Kefetivo, r.Kdial * (1 - r.recirc / 100), 1e-9), 'id: K efetivo = K·(1−recirc) [' + j + ']');
    ok(r.recirc >= 0 && r.recirc <= 100, 'id: recirculação ∈ [0,100]% [' + j + ']');
    ok(r.Kdial <= Math.min(r.Qbe, r.Qd) + 1e-6, 'id: clearance ≤ menor fluxo [' + j + ']');
  }
})();

/* ---------- 3. LEIS ---------- */
(function () {
  // clearance↑ com Qb, mas SATURA (ganho marginal decrescente)
  ok(circuito({ Qb: 350 }).Kdial > circuito({ Qb: 250 }).Kdial, 'lei: Qb↑ → clearance↑');
  var g1 = circuito({ Qb: 250 }).Kdial - circuito({ Qb: 200 }).Kdial;
  var g2 = circuito({ Qb: 450 }).Kdial - circuito({ Qb: 400 }).Kdial;
  ok(g2 < g1, 'lei: clearance SATURA — o mesmo ΔQb rende menos em Qb alto (blood-flow-limited)');
  // clearance↑ com Qd e com KoA
  ok(circuito({ Qd: 800 }).Kdial > circuito({ Qd: 500 }).Kdial, 'lei: Qd↑ → clearance↑');
  ok(circuito({ KoA: 1000 }).Kdial > circuito({ KoA: 400 }).Kdial, 'lei: KoA↑ → clearance↑ (membrana mais potente)');
  // UF↑ com TMP
  ok(circuito({ Quf: 1500 }).TMP > circuito({ Quf: 600 }).TMP, 'lei: UF prescrita↑ → TMP necessária↑');
  ok(ufDeTMP(50, 30) > ufDeTMP(20, 30), 'lei: TMP↑ → UF↑');
  // acesso ruim → Qb_efetivo↓ → clearance↓
  ok(circuito({ Qb: 400, acesso: 0.3 }).Qbe < circuito({ Qb: 400, acesso: 1 }).Qbe, 'lei: acesso ruim → Qb_efetivo↓');
  ok(circuito({ Qb: 400, acesso: 0.3 }).Kdial < circuito({ Qb: 400, acesso: 1 }).Kdial, 'lei: acesso ruim → clearance↓');
  // Qb↑ → P_art mais negativa
  ok(circuito({ Qb: 400 }).Part < circuito({ Qb: 200 }).Part, 'lei: Qb↑ → P_art mais negativa');
  // recirculação↑ → K efetivo↓
  ok(circuito({ distAgulhas: 0.1 }).Kefetivo < circuito({ distAgulhas: 1 }).Kefetivo, 'lei: agulhas próximas → recirc → K efetivo↓');
  // Kuf maior → menos TMP p/ a mesma UF
  ok(tmpNecessaria(1000, 50) < tmpNecessaria(1000, 20), 'lei: Kuf↑ → menos TMP p/ a mesma UF');
})();

/* ---------- 4. PÉROLAS ---------- */
(function () {
  // (1) o acesso limita TUDO: pedir Qb que o acesso não dá não acelera nada — só suga
  var bom = circuito({ Qb: 300, acesso: 1 });
  var ruim300 = circuito({ Qb: 300, acesso: 0.3 });
  var ruim500 = circuito({ Qb: 500, acesso: 0.3 });
  ok(ruim500.Qbe <= ruim300.Qbe + 1e-6 && ruim500.Part < ruim300.Part, 'pérola: subir o pedido em acesso pobre → mais sucção, Qb_efetivo NÃO sobe');
  ok(ruim300.acessoLimita && ruim300.succaoArterial, 'pérola: acesso pobre trava o Qb_efetivo (flag) e suga (P_art)');
  ok(bom.Kdial > ruim300.Kdial, 'pérola: por mais potente que seja a membrana, acesso ruim derruba o clearance');
  // (2) recirculação ROUBA a dose: Qb/Qd "perfeitos" mas K efetivo despenca
  var perto = circuito({ Qb: 400, Qd: 800, KoA: 1000, distAgulhas: 0.1 });
  ok(perto.recircRoubaDose && perto.Kefetivo < perto.Kdial - 20, 'pérola: recirculação rouba a dose (K efetivo < K dialisador) apesar de fluxos ótimos');
  // (3) TMP é só a conta da UF: querer tirar mais volume exige mais pressão
  ok(circuito({ Quf: 3000, Kuf: 15 }).TMP > circuito({ Quf: 800, Kuf: 15 }).TMP, 'pérola: TMP é prescrição de pressão — mais UF exige mais TMP');
  // contracorrente: Qd alto maximiza o gradiente → mais clearance (limitado por Qb)
  ok(circuito({ Qb: 300, Qd: 800 }).Kdial > circuito({ Qb: 300, Qd: 300 }).Kdial, 'pérola: contracorrente — Qd alto maximiza o gradiente');
})();

/* ---------- 5. DETERMINISMO ---------- */
(function () {
  var inp = { Qb: 350, Qd: 700, KoA: 800, Kuf: 28, Quf: 1200, acesso: 0.7, distAgulhas: 0.4 };
  ok(JSON.stringify(circuito(inp)) === JSON.stringify(circuito(inp)), 'determinismo: mesma entrada → saída idêntica');
  var frozen = Object.freeze({ Qb: 300, acesso: 0.5 });
  var a, threw = false; try { a = circuito(frozen); } catch (e) { threw = true; }
  ok(!threw && fin(a.Kdial), 'determinismo: Object.freeze não lança nem é mutado');
  ok(frozen.Qb === 300, 'determinismo: entrada não mutada');
})();

/* ---------- 6. ROBUSTEZ ---------- */
(function () {
  var maus = [undefined, null, {}, { Qb: NaN }, { Qb: 'x' }, { Qb: -50 }, { Qb: 1e9 },
    { Qd: NaN }, { KoA: Infinity }, { Kuf: 0 }, { Quf: -100 }, { acesso: -5 }, { acesso: 'z' },
    { distAgulhas: NaN }, { distAgulhas: 9 }];
  maus.forEach(function (m, i) {
    var r = circuito(m);
    ok(fin(r.Kdial) && fin(r.Part) && fin(r.Pven) && fin(r.TMP) && fin(r.Qbe) && fin(r.recirc) && fin(r.Kefetivo),
      'robustez[' + i + ']: saídas finitas');
    ok(r.Kdial >= 0 && r.Kdial <= 600, 'robustez[' + i + ']: clearance nos clamps');
    ok(r.Part <= 0 && r.Part >= -350, 'robustez[' + i + ']: P_art ∈ [−350,0]');
    ok(r.Pven >= 0 && r.Pven <= 350, 'robustez[' + i + ']: P_ven ∈ [0,350]');
    ok(r.recirc >= 0 && r.recirc <= 100, 'robustez[' + i + ']: recirculação ∈ [0,100]');
    ok(r.TMP >= 0 && r.TMP <= 600, 'robustez[' + i + ']: TMP ∈ [0,600]');
  });
  ok(clearanceDialisador(NaN, 'x', 0) >= 0 && fin(clearanceDialisador(NaN, 'x', 0)), 'robustez: clearanceDialisador com lixo → finito ≥0');
  ok(fin(tmpNecessaria('a', null)), 'robustez: tmpNecessaria com lixo → finito');
})();

/* ---------- 7. FUZZING semeado ≥5000 ---------- */
(function () {
  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  var rnd = mulberry32(0x5EED20), N = 6000, bad = 0;
  function val() { var r = rnd(); if (r < 0.3) { var pool = [NaN, Infinity, -Infinity, 1e12, -1e12, 'x', null, undefined]; return pool[(rnd() * pool.length) | 0]; } return (r - 0.15) * 1100; }
  for (var i = 0; i < N; i++) {
    var inp = { Qb: val(), Qd: val(), KoA: val(), Kuf: val(), Quf: val(), acesso: val(), distAgulhas: val() };
    var r = circuito(inp);
    var L = clearanceCurveLayout(inp, 900, 360);
    var good = fin(r.Kdial) && fin(r.Part) && fin(r.Pven) && fin(r.TMP) && fin(r.Qbe) &&
      fin(r.recirc) && fin(r.Kefetivo) && fin(r.ufEfetiva) && fin(r.qbTeto) &&
      r.Kdial >= 0 && r.Kdial <= 600 && r.Part <= 0 && r.Part >= -350 && r.Pven >= 0 && r.Pven <= 350 &&
      r.recirc >= 0 && r.recirc <= 100 && r.TMP >= 0 && r.TMP <= 600 && r.Qbe >= 0 && r.Qbe <= 600 &&
      r.Qbe <= r.Qb + 1e-6 && r.Kefetivo <= r.Kdial + 1e-6 &&
      Math.abs(r.Kefetivo - r.Kdial * (1 - r.recirc / 100)) < 1e-6 &&
      Array.isArray(L.pts) && L.pts.length === 59 && fin(L.current.y);
    if (!good) bad++;
  }
  ok(bad === 0, 'fuzzing: ' + N + ' entradas (30% malignas) → 0 violações (' + bad + ')');
})();

/* ---------- 8. SAÍDA ---------- */
console.log(oks + ' OK · ' + fails + ' falhas');
process.exit(fails > 0 ? 1 : 0);
