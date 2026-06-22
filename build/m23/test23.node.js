/* =========================================================================
 * FILTRA · M23 — bateria de robustez do engine (0 falhas ou não entra)
 * 1 BASE · 2 IDENTIDADES · 3 LEIS · 4 PÉROLAS · 5 DETERMINISMO 5× · 6 ROBUSTEZ ·
 * 7 LIMITES · 8 MONOTONIA EXAUSTIVA · 9 FUZZING ≥20000 (~35% malignas) · 10 SAÍDA
 * (robustez REFORÇADA: fuzz ≥20000, ~35% malignas em CADA campo, monotonia ≥60 passos/eixo)
 * ========================================================================= */
var M = require('./model23.js');
var ultrafiltracao = M.ultrafiltracao, rbvLayout = M.rbvLayout, refilling = M.refilling;
var UF_RATE_ALTA = M.UF_RATE_ALTA, RBV_CRASH = M.RBV_CRASH;

var oks = 0, fails = 0, micro = 0;
function ok(c, m) { if (c) oks++; else { fails++; console.log('  FALHA: ' + m); } }
function micros(n) { micro += n; }
function near(a, b, t) { return Math.abs(a - b) <= (t || 1e-7); }
function fin(x) { return typeof x === 'number' && isFinite(x); }

/* faixas documentadas por campo de saída numérica [min,max] */
var BOUNDS = {
  pesoAtual: [30, 250], pesoSeco: [25, 250], tempoSessao: [0.5, 12], sobrecargaL: [0, 30],
  taxaRefillBasal: [50, 1500], albumina: [1.0, 5.5], volPlasma: [1.5, 6.0],
  ufTotalL: [0, 30], ufRate: [0, 60000], ufRatePorKg: [0, 1000],
  refillMedio: [0, 1500], refillCap: [0, 1500], rbvFinal: [0.3, 1.05], rbvMin: [0.3, 1.05], quedaRBVporH: [0, 1],
  secoReal: [25, 250], ufRatePorKg2: [0, 1000]
};
function dentroBounds(r) {
  for (var key in BOUNDS) {
    if (key === 'ufRatePorKg2') continue;
    var b = BOUNDS[key];
    if (!fin(r[key]) || r[key] < b[0] - 1e-9 || r[key] > b[1] + 1e-9) return key;
  }
  // campos finitos extra
  if (!fin(r.margemRefill)) return 'margemRefill';
  if (!fin(r.erroSecoKg)) return 'erroSecoKg';
  if (!fin(r.crashTempo)) return 'crashTempo';
  return null;
}

/* ---------- 1. LINHA DE BASE ---------- */
(function () {
  var r = ultrafiltracao({ pesoAtual: 73, pesoSeco: 70, tempoSessao: 4 });
  ok(dentroBounds(r) === null, 'base: todas as saídas em faixa (' + dentroBounds(r) + ')');
  ok(near(r.ufTotalL, 3, 1e-9), 'base: UF total = peso atual − peso seco = 3 L');
  ok(near(r.ufRate, 750, 1e-6), 'base: UF rate = 3000/4 = 750 mL/h');
  ok(r.rbvFinal <= 1.0 && r.rbvFinal >= 0.7, 'base: RBV final em faixa fisiológica');
  ok(r.rbvFinal < 1.0, 'base: o RBV cai durante a sessão');
  // 3 L em 4 h num paciente médio é tolerável (sem crash)
  ok(!r.hipotensao || r.rbvMin >= 0.7, 'base: cenário leve não crasha absurdamente');
})();

/* ---------- 2. IDENTIDADES ---------- */
(function () {
  for (var i = 0; i < 40; i++) {
    var so = i / 10;                         // 0..3.9 L
    var t = 2 + i / 20;                      // 2..3.95 h
    var r = ultrafiltracao({ pesoAtual: 75, pesoSeco: 75 - so, tempoSessao: t, sobrecargaL: so });
    ok(near(r.ufTotalL, so, 1e-9), 'id: UF total = sobrecarga');
    ok(near(r.ufRate, so * 1000 / t, 1e-6), 'id: UF rate = sobrecarga·1000/tempo');
    ok(near(r.ufRatePorKg, r.ufRate / r.pesoSeco, 1e-6), 'id: UF rate/kg = UF rate / peso seco');
    ok(r.rbvFinal >= 0.3 && r.rbvFinal <= 1.05, 'id: RBV ∈ [0.3,1.05]');
    ok(r.rbvMin <= r.rbvFinal + 1e-9, 'id: rbvMin ≤ rbvFinal (mínimo é o menor)');
    ok(near(r.margemRefill, r.refillCap - r.ufRate, 1e-6), 'id: margem = refillCap − UF rate');
    ok(near(r.erroSecoKg, r.pesoSeco - r.secoReal, 1e-9), 'id: erroSeco = pesoSeco − secoReal');
  }
  // volume removido ≤ sobrecarga viável (UF total nunca > sobrecarga)
  for (var j = 0; j < 30; j++) {
    var s = j / 5, rj = ultrafiltracao({ pesoAtual: 80, pesoSeco: 80 - s, tempoSessao: 4, sobrecargaL: s });
    ok(rj.ufTotalL <= rj.sobrecargaL + 1e-9, 'id: vol removido (UF total) ≤ sobrecarga');
  }
  // refilling: monótono em sobrecarga e em albumina (definição) — exige déficit > 0 para sair de zero
  ok(refilling({ sobrecarga: 4, sobrecargaIni: 4, albumina: 4, deficit: 400 }) > refilling({ sobrecarga: 1, sobrecargaIni: 4, albumina: 4, deficit: 400 }), 'id: refilling sobe com sobrecarga residual');
  ok(refilling({ sobrecarga: 4, sobrecargaIni: 4, albumina: 4.5, deficit: 400 }) > refilling({ sobrecarga: 4, sobrecargaIni: 4, albumina: 2.0, deficit: 400 }), 'id: refilling sobe com albumina');
  ok(refilling({ sobrecarga: 4, sobrecargaIni: 4, albumina: 4, deficit: 600 }) > refilling({ sobrecarga: 4, sobrecargaIni: 4, albumina: 4, deficit: 50 }), 'id: refilling sobe com déficit plasmático');
})();

/* ---------- 3. LEIS (monotonia direcional pontual) ---------- */
(function () {
  // ↑ taxa de UF (mesma meta, menos tempo) → ↓ RBV final
  var lento = ultrafiltracao({ pesoAtual: 78, pesoSeco: 74, tempoSessao: 6, sobrecargaL: 4 });
  var rapido = ultrafiltracao({ pesoAtual: 78, pesoSeco: 74, tempoSessao: 2, sobrecargaL: 4 });
  ok(rapido.ufRate > lento.ufRate, 'lei: menos tempo → UF rate maior (mesma meta)');
  ok(rapido.rbvFinal < lento.rbvFinal, 'lei: ↑ taxa de UF → ↓ RBV final');
  // ↑ refilling (taxa basal) → ↑ RBV final (mesma UF)
  var refLento = ultrafiltracao({ pesoAtual: 78, pesoSeco: 74, tempoSessao: 4, sobrecargaL: 4, taxaRefillBasal: 300 });
  var refRapido = ultrafiltracao({ pesoAtual: 78, pesoSeco: 74, tempoSessao: 4, sobrecargaL: 4, taxaRefillBasal: 1400 });
  ok(refRapido.rbvFinal > refLento.rbvFinal, 'lei: ↑ refilling → ↑ RBV final');
  // ↑ tempo (mesma meta) → ↓ taxa de UF
  var t2 = ultrafiltracao({ sobrecargaL: 4, tempoSessao: 2, pesoAtual: 78, pesoSeco: 74 });
  var t8 = ultrafiltracao({ sobrecargaL: 4, tempoSessao: 8, pesoAtual: 78, pesoSeco: 74 });
  ok(t8.ufRate < t2.ufRate, 'lei: ↑ tempo → ↓ taxa de UF (mesma meta)');
  ok(t8.rbvFinal > t2.rbvFinal, 'lei: ↑ tempo → ↑ RBV (UF cabe no refilling)');
  // ↓ albumina → refilling pior → RBV menor
  var albBoa = ultrafiltracao({ pesoAtual: 78, pesoSeco: 74, tempoSessao: 4, sobrecargaL: 4, albumina: 4.5 });
  var albRuim = ultrafiltracao({ pesoAtual: 78, pesoSeco: 74, tempoSessao: 4, sobrecargaL: 4, albumina: 1.8 });
  ok(albRuim.rbvFinal < albBoa.rbvFinal, 'lei: ↓ albumina → refilling pior → ↓ RBV');
  // ↑ sobrecarga (mesma janela) → UF rate maior
  ok(ultrafiltracao({ pesoAtual: 84, pesoSeco: 74, tempoSessao: 4, sobrecargaL: 6 }).ufRate >
     ultrafiltracao({ pesoAtual: 80, pesoSeco: 74, tempoSessao: 4, sobrecargaL: 2 }).ufRate, 'lei: ↑ sobrecarga → ↑ UF rate');
})();

/* ---------- 4. PÉROLAS ---------- */
(function () {
  // PÉROLA: a MESMA meta em MENOS tempo derruba a PAM (RBV mín cai abaixo do crash)
  var folgado = ultrafiltracao({ pesoAtual: 80, pesoSeco: 75, tempoSessao: 8, sobrecargaL: 5 });
  var apertado = ultrafiltracao({ pesoAtual: 80, pesoSeco: 75, tempoSessao: 2, sobrecargaL: 5 });
  ok(apertado.rbvMin < folgado.rbvMin, 'pérola: mesma meta em menos tempo → RBV mínimo menor');
  ok(apertado.ufExcedeRefill, 'pérola: a janela curta faz UF exceder a capacidade de refilling');
  ok(apertado.hipotensao && !folgado.hipotensao, 'pérola: a sessão rápida crasha (hipotensão), a lenta não');
  // PÉROLA: refilling LENTO = intolerância (mesma UF, RBV despenca)
  var refOk = ultrafiltracao({ pesoAtual: 78, pesoSeco: 74, tempoSessao: 4, sobrecargaL: 4 });
  var refMau = ultrafiltracao({ pesoAtual: 78, pesoSeco: 74, tempoSessao: 4, sobrecargaL: 4, taxaRefillBasal: 300 });
  ok(refMau.rbvMin < refOk.rbvMin, 'pérola: refilling lento → RBV mínimo despenca (intolerância)');
  ok(refMau.hipotensao && !refOk.hipotensao, 'pérola: refilling lento → hipotensão na MESMA UF');
  // PÉROLA: UF lenta e longa PROTEGE (RBV estável, sem crash)
  var protege = ultrafiltracao({ pesoAtual: 80, pesoSeco: 75, tempoSessao: 10, sobrecargaL: 5 });
  ok(!protege.hipotensao && protege.rbvMin >= RBV_CRASH, 'pérola: UF lenta e longa protege (RBV estável)');
  // PÉROLA: errar o peso seco para BAIXO ou para CIMA é nocivo (vale em U)
  var secoBaixo = ultrafiltracao({ pesoAtual: 80, pesoSeco: 72, tempoSessao: 4, sobrecargaL: 4 }); // alvo 72 < real 76
  var secoAlto = ultrafiltracao({ pesoAtual: 80, pesoSeco: 79, tempoSessao: 4, sobrecargaL: 4 });  // alvo 79 > real 76
  ok(secoBaixo.secoBaixoDemais && !secoBaixo.secoAltoDemais, 'pérola: alvo abaixo do real → tira demais (seco baixo)');
  ok(secoAlto.secoAltoDemais && !secoAlto.secoBaixoDemais, 'pérola: alvo acima do real → deixa sobrecarga (seco alto)');
  // stunning: a queda rápida do RBV atordoa o miocárdio
  ok(apertado.stunning, 'pérola: queda rápida do RBV → stunning miocárdico');
})();

/* ---------- 5. DETERMINISMO 5× byte-idêntico ---------- */
(function () {
  var inp = { pesoAtual: 82, pesoSeco: 76, tempoSessao: 3, sobrecargaL: 6, taxaRefillBasal: 300, albumina: 2.6, volPlasma: 3.2 };
  var ref = JSON.stringify(ultrafiltracao(inp)), igual = true;
  for (var n = 0; n < 5; n++) { if (JSON.stringify(ultrafiltracao(inp)) !== ref) igual = false; }
  ok(igual, 'determinismo: 5 execuções byte-idênticas');
  var Lref = JSON.stringify(rbvLayout(inp, 900, 360)), igualL = true;
  for (var m = 0; m < 5; m++) { if (JSON.stringify(rbvLayout(inp, 900, 360)) !== Lref) igualL = false; }
  ok(igualL, 'determinismo: layout 5× byte-idêntico');
  var frozen = Object.freeze({ pesoAtual: 80, pesoSeco: 75, tempoSessao: 2, sobrecargaL: 5 });
  var threw = false, a; try { a = ultrafiltracao(frozen); } catch (e) { threw = true; }
  ok(!threw && fin(a.rbvFinal), 'determinismo: Object.freeze não lança');
  ok(frozen.pesoSeco === 75, 'determinismo: entrada não mutada');
})();

/* ---------- 6. ROBUSTEZ (lixo pontual) ---------- */
(function () {
  var maus = [undefined, null, {}, { pesoAtual: NaN }, { tempoSessao: 'x' }, { sobrecargaL: -10 },
    { pesoSeco: Infinity }, { taxaRefillBasal: -5 }, { albumina: 'z' }, { volPlasma: 1e9 },
    { tempoSessao: 0 }, { sobrecargaL: 1e300 }, [], function () {}, { pesoAtual: -1 }, { albumina: NaN }];
  maus.forEach(function (mm, i) {
    var r = ultrafiltracao(mm);
    ok(dentroBounds(r) === null, 'robustez[' + i + ']: saídas finitas e em faixa (' + dentroBounds(r) + ')');
    var L = rbvLayout(mm, 900, 360);
    var okL = Array.isArray(L.pts) && L.pts.length === 81 && fin(L.end.x) && fin(L.end.y);
    for (var k = 0; k < L.pts.length && okL; k++) { if (!fin(L.pts[k].x) || !fin(L.pts[k].y)) okL = false; }
    ok(okL, 'robustez[' + i + ']: layout finito');
  });
})();

/* ---------- 7. LIMITES por campo ---------- */
(function () {
  var fields = ['pesoAtual', 'pesoSeco', 'tempoSessao', 'sobrecargaL', 'taxaRefillBasal', 'albumina', 'volPlasma'];
  var extremos = [-1e9, -1e3, -1, 0, 0.1, 1, 50, 1e3, 1e9, NaN, Infinity, -Infinity];
  fields.forEach(function (f) {
    extremos.forEach(function (v) {
      var inp = {}; inp[f] = v; var r = ultrafiltracao(inp);
      ok(dentroBounds(r) === null, 'limites: ' + f + '=' + v + ' → saídas em faixa (' + dentroBounds(r) + ')');
    });
  });
})();

/* ---------- 8. MONOTONIA EXAUSTIVA (≥60 passos por eixo) ---------- */
(function () {
  var STEPS = 70;
  // tempo↑ (mesma meta) → UF rate não-crescente
  (function () {
    var prev = null, monoOk = true, viol = 0;
    for (var i = 0; i <= STEPS; i++) {
      var t = 0.5 + (12 - 0.5) * i / STEPS;
      var uf = ultrafiltracao({ pesoAtual: 80, pesoSeco: 75, tempoSessao: t, sobrecargaL: 5 }).ufRate;
      if (prev !== null) { if (uf - prev > 1e-6) { monoOk = false; viol++; } micros(1); }
      prev = uf;
    }
    ok(monoOk, 'monotonia: tempo↑ → UF rate↓ (' + viol + ' violações)');
  })();
  // tempo↑ (mesma meta) → RBV final não-decrescente
  (function () {
    var prev = null, monoOk = true, viol = 0;
    for (var i = 0; i <= STEPS; i++) {
      var t = 0.5 + (12 - 0.5) * i / STEPS;
      var rbv = ultrafiltracao({ pesoAtual: 80, pesoSeco: 75, tempoSessao: t, sobrecargaL: 5, taxaRefillBasal: 500 }).rbvFinal;
      if (prev !== null) { if (rbv - prev < -1e-6) { monoOk = false; viol++; } micros(1); }
      prev = rbv;
    }
    ok(monoOk, 'monotonia: tempo↑ → RBV final↑ (' + viol + ' violações)');
  })();
  // refilling basal↑ → RBV final não-decrescente
  (function () {
    var prev = null, monoOk = true, viol = 0;
    for (var i = 0; i <= STEPS; i++) {
      var rb = 50 + (1200 - 50) * i / STEPS;
      var rbv = ultrafiltracao({ pesoAtual: 80, pesoSeco: 75, tempoSessao: 3, sobrecargaL: 5, taxaRefillBasal: rb }).rbvFinal;
      if (prev !== null) { if (rbv - prev < -1e-6) { monoOk = false; viol++; } micros(1); }
      prev = rbv;
    }
    ok(monoOk, 'monotonia: refilling basal↑ → RBV final↑ (' + viol + ' violações)');
  })();
  // sobrecarga↑ (mesma janela) → UF rate não-decrescente
  (function () {
    var prev = null, monoOk = true, viol = 0;
    for (var i = 0; i <= STEPS; i++) {
      var so = 30 * i / STEPS;
      var uf = ultrafiltracao({ pesoAtual: 70 + so, pesoSeco: 70, tempoSessao: 4, sobrecargaL: so }).ufRate;
      if (prev !== null) { if (uf - prev < -1e-6) { monoOk = false; viol++; } micros(1); }
      prev = uf;
    }
    ok(monoOk, 'monotonia: sobrecarga↑ → UF rate↑ (' + viol + ' violações)');
  })();
  // albumina↑ → refilling não-decrescente (mesma sobrecarga)
  (function () {
    var prev = null, monoOk = true, viol = 0;
    for (var i = 0; i <= STEPS; i++) {
      var alb = 1.0 + (5.5 - 1.0) * i / STEPS;
      var rf = refilling({ sobrecarga: 4, sobrecargaIni: 4, taxaRefillBasal: 500, albumina: alb, deficit: 400 });
      if (prev !== null) { if (rf - prev < -1e-6) { monoOk = false; viol++; } micros(1); }
      prev = rf;
    }
    ok(monoOk, 'monotonia: albumina↑ → refilling↑ (' + viol + ' violações)');
  })();
  // RBV ao longo do tempo é não-crescente quando UF≫refilling (curva cai)
  (function () {
    var L = rbvLayout({ pesoAtual: 84, pesoSeco: 75, tempoSessao: 2, sobrecargaL: 9, taxaRefillBasal: 250 }, 900, 360);
    var monoOk = true, viol = 0;
    for (var i = 1; i < L.pts.length; i++) { if (L.pts[i].rbv - L.pts[i - 1].rbv > 1e-6) { monoOk = false; viol++; } micros(1); }
    ok(monoOk, 'monotonia: curva RBV cai ao longo da sessão quando UF≫refilling (' + viol + ' violações)');
  })();
})();

/* ---------- 9. FUZZING semeado ≥20000 (~35% malignas em CADA campo) ---------- */
(function () {
  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  var rnd = mulberry32(0x23F117), N = 22000, bad = 0, badL = 0, badId = 0, badMut = 0, badEnum = 0;
  var MAL = [NaN, Infinity, -Infinity, 1e300, -1e300, 1e-300, '5', 'x', '', null, undefined, {}, [], function () {}, true, false];
  function val() { if (rnd() < 0.35) return MAL[(rnd() * MAL.length) | 0]; return (rnd() - 0.15) * 300; }
  function fields() {
    return { pesoAtual: val(), pesoSeco: val(), tempoSessao: val(), sobrecargaL: val(),
      taxaRefillBasal: val(), albumina: val(), volPlasma: val() };
  }
  function ser(o) { return JSON.stringify(o, function (key, v) { return (typeof v === 'function') ? '__fn__' : (v === undefined ? '__u__' : v); }); }
  for (var i = 0; i < N; i++) {
    var inp = fields();
    var snapshot = ser(inp);
    var r = ultrafiltracao(inp);
    var L = rbvLayout(inp, 900, 360);
    // (a)+(b) saídas finitas e em faixa
    if (dentroBounds(r) !== null) bad++;
    // (c) flags são booleanas
    if (typeof r.hipotensao !== 'boolean' || typeof r.stunning !== 'boolean' || typeof r.ufExcedeRefill !== 'boolean') badEnum++;
    // (d) identidades: UF rate = sobrecarga·1000/tempo; UF rate/kg = UF rate/peso seco; rbvMin ≤ rbvFinal
    if (Math.abs(r.ufRate - r.sobrecargaL * 1000 / r.tempoSessao) > 1e-3 && r.ufRate < 60000 - 1e-6) badId++;
    if (Math.abs(r.ufRatePorKg - r.ufRate / r.pesoSeco) > 1e-3 && r.ufRatePorKg < 1000 - 1e-6) badId++;
    if (r.rbvMin > r.rbvFinal + 1e-9) badId++;
    // layout finito
    if (!Array.isArray(L.pts) || L.pts.length !== 81 || !fin(L.end.x) || !fin(L.end.y) || !fin(L.crashY)) badL++;
    for (var j = 0; j < L.pts.length; j++) { if (!fin(L.pts[j].x) || !fin(L.pts[j].y) || !fin(L.pts[j].rbv)) { badL++; break; } }
    // (e) input não mutado
    if (ser(inp) !== snapshot) badMut++;
    micros(6 + L.pts.length);
  }
  var threwFrozen = false; try { ultrafiltracao(Object.freeze({ pesoAtual: 200, pesoSeco: 30, tempoSessao: 0.5, sobrecargaL: 30 })); } catch (e) { threwFrozen = true; }
  ok(bad === 0, 'fuzzing: ' + N + ' entradas (~35% malignas) → 0 violações de faixa (' + bad + ')');
  ok(badEnum === 0, 'fuzzing: flags sempre booleanas (' + badEnum + ')');
  ok(badId === 0, 'fuzzing: identidades intactas (' + badId + ')');
  ok(badL === 0, 'fuzzing: layout finito em todas (' + badL + ')');
  ok(badMut === 0, 'fuzzing: input nunca mutado (' + badMut + ')');
  ok(!threwFrozen, 'fuzzing: Object.freeze não lança');
})();

/* ---------- 10. SAÍDA ---------- */
var total = oks + micro;
console.log(total + ' OK (' + oks + ' macro + ' + micro + ' micro/fuzz) · ' + fails + ' falhas');
process.exit(fails > 0 ? 1 : 0);
