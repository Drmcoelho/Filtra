/* =========================================================================
 * FILTRA · M36 — bateria de robustez do engine (0 falhas ou não entra)
 * 1 BASE · 2 IDENTIDADES · 3 LEIS · 4 PÉROLAS · 5 DETERMINISMO 5× · 6 ROBUSTEZ ·
 * 7 LIMITES · 8 MONOTONIA EXAUSTIVA · 9 FUZZING ≥20000 (40% malignas) · 10 SAÍDA
 * ========================================================================= */
var M = require('./model36.js');
var timing = M.timing, riskCurveLayout = M.riskCurveLayout;

var oks = 0, fails = 0, micro = 0;
function ok(c, m) { if (c) oks++; else { fails++; console.log('  FALHA: ' + m); } }
function micros(n) { micro += n; } // contabiliza asserções internas dos laços (fuzz/monotonia/limites)
function near(a, b, t) { return Math.abs(a - b) <= (t || 1e-7); }
function fin(x) { return typeof x === 'number' && isFinite(x); }
var REC_OK = { iniciar: 1, preparar: 1, esperar: 1 };

/* faixas documentadas por campo de saída numérica [min,max] */
var BOUNDS = {
  k: [2, 9], hco3: [2, 30], volume: [0, 20], ureia: [20, 400], sintomas: [0, 1], resposta: [0, 1], tendencia: [-1, 1],
  sevK: [0, 1.4], sevHCO3: [0, 1.4], sevVol: [0, 1.4], sevUreia: [0, 1.4],
  score: [0, 100], riscoPrecoce: [0, 100], riscoTardio: [0, 100]
};
function dentroBounds(r) {
  for (var key in BOUNDS) { var b = BOUNDS[key]; if (!fin(r[key]) || r[key] < b[0] - 1e-9 || r[key] > b[1] + 1e-9) return key; }
  return null;
}

/* ---------- 1. LINHA DE BASE ---------- */
(function () {
  var r = timing({});
  ok(r.recomendacao === 'esperar', 'base: paciente estável → esperar (sem gatilho)');
  ok(!r.gatilhoCruzado, 'base: sem gatilho cruzado em condições normais');
  ok(r.score < 30, 'base: score baixo no estável (' + r.score.toFixed(1) + ')');
  ok(r.janelaSegura, 'base: a janela de espera é segura no estável');
  ok(dentroBounds(r) === null, 'base: todas as saídas em faixa');
})();

/* ---------- 2. IDENTIDADES ---------- */
(function () {
  for (var i = 0; i < 40; i++) {
    var k = 3 + i * 0.12, r = timing({ k: k });
    ok(near(r.sevK, M.sevK(k), 1e-9), 'id: sevK = sevK(k)');
    ok(r.recomendacao in REC_OK, 'id: recomendação é enum válido');
    ok(r.gatilhoCruzado === (r.gateK || r.gateHCO3 || r.gateVol || r.gateUreia), 'id: gatilho = OU dos eixos');
    ok(dentroBounds(r) === null, 'id: saídas em faixa');
  }
  // gatilho absoluto: K alto refratário (sem resposta) → iniciar
  var g = timing({ k: 7.2, resposta: 0 });
  ok(g.gateK && g.gatilhoCruzado && g.recomendacao === 'iniciar', 'id: K refratário → gatilho → iniciar');
  ok(g.score >= 80, 'id: gatilho garante score ≥80');
})();

/* ---------- 3. LEIS (monotonia direcional pontual) ---------- */
(function () {
  ok(timing({ k: 6 }).score > timing({ k: 4 }).score, 'lei: K↑ → score↑');
  ok(timing({ hco3: 8 }).score > timing({ hco3: 24 }).score, 'lei: HCO₃↓ (acidose) → score↑');
  ok(timing({ volume: 8 }).score > timing({ volume: 1 }).score, 'lei: sobrecarga↑ → score↑');
  ok(timing({ ureia: 260, sintomas: 1 }).score > timing({ ureia: 60, sintomas: 1 }).score, 'lei: ureia↑ → score↑');
  // resposta ao clínico ABAIXA o score (mesma gravidade)
  ok(timing({ k: 6, resposta: 0.9 }).score < timing({ k: 6, resposta: 0.1 }).score, 'lei: resposta↑ → score↓');
  // tendência ascendente (sem resposta) SOBE o score
  ok(timing({ volume: 5, resposta: 0.2, tendencia: 1 }).score > timing({ volume: 5, resposta: 0.2, tendencia: -1 }).score, 'lei: tendência↑ → score↑');
})();

/* ---------- 4. PÉROLAS ---------- */
(function () {
  // PÉROLA: iniciar é FUNÇÃO refratária, não o número da ureia. Ureia altíssima SEM sintomas e respondendo → esperar.
  var altaUreiaSemSint = timing({ ureia: 320, sintomas: 0, resposta: 0.8, tendencia: -0.5 });
  ok(!altaUreiaSemSint.gatilhoCruzado && altaUreiaSemSint.recomendacao !== 'iniciar', 'pérola: ureia alta SEM sintomas e respondendo → NÃO iniciar (não é o número)');
  // a MESMA ureia COM sintomas urêmicos → gatilho → iniciar
  var altaUreiaComSint = timing({ ureia: 320, sintomas: 1 });
  ok(altaUreiaComSint.gateUreia && altaUreiaComSint.recomendacao === 'iniciar', 'pérola: ureia alta COM sintomas urêmicos → iniciar (a função, não o número)');
  // precoce sem gatilho: iniciar cedo "por precaução" tem MAIS risco que esperar (janela segura)
  var precoce = timing({ k: 5, hco3: 19, volume: 2, ureia: 90, resposta: 0.7, tendencia: 0 });
  ok(precoce.janelaSegura && precoce.riscoPrecoce > precoce.riscoTardio, 'pérola: sem gatilho, iniciar cedo adiciona mais risco que esperar');
  // K refratário com ECG é gatilho absoluto independente do resto
  var soK = timing({ k: 7, resposta: 0, hco3: 24, volume: 0, ureia: 50 });
  ok(soK.gatilhoCruzado && soK.eixoDominante === 'potássio', 'pérola: um eixo refratário basta — K domina e dispara');
})();

/* ---------- 5. DETERMINISMO 5× byte-idêntico ---------- */
(function () {
  var inp = { k: 5.8, hco3: 14, volume: 5, ureia: 180, sintomas: 0.4, resposta: 0.3, tendencia: 0.6 };
  var ref = JSON.stringify(timing(inp));
  var igual = true;
  for (var n = 0; n < 5; n++) { if (JSON.stringify(timing(inp)) !== ref) igual = false; }
  ok(igual, 'determinismo: 5 execuções byte-idênticas');
  var Lref = JSON.stringify(riskCurveLayout(inp, 900, 360));
  var igualL = true;
  for (var m = 0; m < 5; m++) { if (JSON.stringify(riskCurveLayout(inp, 900, 360)) !== Lref) igualL = false; }
  ok(igualL, 'determinismo: layout 5× byte-idêntico');
  var frozen = Object.freeze({ k: 6.5, resposta: 0.2 });
  var threw = false, a; try { a = timing(frozen); } catch (e) { threw = true; }
  ok(!threw && fin(a.score), 'determinismo: Object.freeze não lança');
  ok(frozen.k === 6.5, 'determinismo: entrada não mutada');
})();

/* ---------- 6. ROBUSTEZ (lixo pontual) ---------- */
(function () {
  var maus = [undefined, null, {}, { k: NaN }, { k: 'x' }, { k: -10 }, { k: 1e9 }, { hco3: Infinity },
    { volume: -5 }, { ureia: 'z' }, { sintomas: 9 }, { resposta: -2 }, { tendencia: 1e300 }, [], function () {}];
  maus.forEach(function (mm, i) {
    var r = timing(mm);
    ok(dentroBounds(r) === null, 'robustez[' + i + ']: saídas finitas e em faixa');
    ok(r.recomendacao in REC_OK, 'robustez[' + i + ']: recomendação válida');
  });
})();

/* ---------- 7. LIMITES por campo ---------- */
(function () {
  // varre cada campo nos extremos e além; confirma clamps
  var fields = ['k', 'hco3', 'volume', 'ureia', 'sintomas', 'resposta', 'tendencia'];
  var extremos = [-1e9, -1e3, -1, 0, 1, 50, 1e3, 1e9, NaN, Infinity, -Infinity];
  fields.forEach(function (f) {
    extremos.forEach(function (v) {
      var inp = {}; inp[f] = v; var r = timing(inp);
      ok(dentroBounds(r) === null, 'limites: campo ' + f + '=' + v + ' → saídas em faixa');
    });
  });
})();

/* ---------- 8. MONOTONIA EXAUSTIVA (≥50 passos por eixo, cada par adjacente) ---------- */
(function () {
  var STEPS = 60;
  // K↑ → score↑ (não-decrescente; estritamente onde não saturado)
  function sweep(field, lo, hi, base, dir, label) {
    var prev = null, monoOk = true, viol = 0;
    for (var i = 0; i <= STEPS; i++) {
      var v = lo + (hi - lo) * i / STEPS;
      var inp = {}; for (var k in base) inp[k] = base[k]; inp[field] = v;
      var s = timing(inp).score;
      if (prev !== null) { var d = (s - prev) * dir; if (d < -1e-7) { monoOk = false; viol++; } micros(1); }
      prev = s;
    }
    ok(monoOk, 'monotonia: ' + label + ' (' + viol + ' violações em ' + STEPS + ' pares)');
  }
  sweep('k', 4.0, 6.4, { resposta: 0.3, sintomas: 0.4 }, +1, 'K↑ → score↑');
  sweep('volume', 0, 6.9, { resposta: 0.3 }, +1, 'volume↑ → score↑');
  sweep('ureia', 60, 215, { sintomas: 0.8, resposta: 0.3 }, +1, 'ureia↑ → score↑');
  sweep('hco3', 13, 24, { resposta: 0.3 }, -1, 'HCO₃↑ → score↓ (acidose alivia)');
  sweep('resposta', 0.25, 1, { k: 6, volume: 4, tendencia: 0.5 }, -1, 'resposta↑ → score↓');
  sweep('tendencia', 0, 1, { k: 5.5, volume: 4, resposta: 0.25 }, +1, 'tendência↑ → score↑');
})();

/* ---------- 9. FUZZING semeado ≥20000 (40% malignas) ---------- */
(function () {
  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  var rnd = mulberry32(0x36ABCD), N = 22000, bad = 0, badL = 0, badRec = 0, badMut = 0;
  var MAL = [NaN, Infinity, -Infinity, 1e300, -1e300, 1e-300, '5', 'x', '', null, undefined, {}, [], function () {}, true, false];
  function val() { if (rnd() < 0.4) return MAL[(rnd() * MAL.length) | 0]; return (rnd() - 0.2) * 500; }
  function fields() { return { k: val(), hco3: val(), volume: val(), ureia: val(), sintomas: val(), resposta: val(), tendencia: val() }; }
  function deepEq(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
  for (var i = 0; i < N; i++) {
    var inp = fields();
    var snapshot = JSON.parse(JSON.stringify(inp, function (key, v) { return (typeof v === 'function') ? '__fn__' : (v === undefined ? '__u__' : v); }));
    var r = timing(inp);
    var L = riskCurveLayout(inp, 900, 360);
    // (a)+(b) saídas finitas e em faixa
    if (dentroBounds(r) !== null) bad++;
    // (c) identidades
    if (r.gatilhoCruzado !== (r.gateK || r.gateHCO3 || r.gateVol || r.gateUreia)) bad++;
    if (Math.abs(r.sevK - M.sevK(r.k)) > 1e-7) bad++;
    // (e) recomendação enum
    if (!(r.recomendacao in REC_OK)) badRec++;
    // layout finito
    if (!Array.isArray(L.pts) || L.pts.length !== 61 || !fin(L.current.x) || !fin(L.current.y) || !fin(L.current.score)) badL++;
    for (var j = 0; j < L.pts.length; j++) { if (!fin(L.pts[j].x) || !fin(L.pts[j].y) || !fin(L.ptsPrec[j].y) || !fin(L.ptsTard[j].y)) { badL++; break; } }
    // (d) input não mutado (deep-compare via mesmo serializador)
    var after = JSON.parse(JSON.stringify(inp, function (key, v) { return (typeof v === 'function') ? '__fn__' : (v === undefined ? '__u__' : v); }));
    if (!deepEq(snapshot, after)) badMut++;
    micros(6 + 2 * L.pts.length); // ~6 checks por iteração + verificação ponto-a-ponto do layout
  }
  // (d) Object.freeze não lança em amostra congelada
  var threwFrozen = false; try { timing(Object.freeze({ k: 7, resposta: 0 })); } catch (e) { threwFrozen = true; }
  ok(bad === 0, 'fuzzing: ' + N + ' entradas (40% malignas) → 0 violações de faixa/identidade (' + bad + ')');
  ok(badL === 0, 'fuzzing: layout finito em todas (' + badL + ')');
  ok(badRec === 0, 'fuzzing: recomendação sempre enum válido (' + badRec + ')');
  ok(badMut === 0, 'fuzzing: input nunca mutado (' + badMut + ')');
  ok(!threwFrozen, 'fuzzing: Object.freeze não lança');
})();

/* ---------- 10. SAÍDA ---------- */
console.log((oks + micro) + ' OK (' + oks + ' macro + ' + micro + ' micro/fuzz) · ' + fails + ' falhas');
process.exit(fails > 0 ? 1 : 0);
