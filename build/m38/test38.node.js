/* =========================================================================
 * FILTRA · M38 — bateria de robustez do engine (0 falhas ou não entra)
 * 1 BASE · 2 IDENTIDADES · 3 LEIS · 4 PÉROLAS · 5 DETERMINISMO 5× · 6 ROBUSTEZ ·
 * 7 LIMITES · 8 MONOTONIA EXAUSTIVA · 9 FUZZING ≥20000 (40% malignas) · 10 SAÍDA
 * (robustez REFORÇADA: fuzz ≥20000, 40% malignas em CADA campo, monotonia ≥50 passos/eixo)
 * ========================================================================= */
var M = require('./model38.js');
var capstone = M.capstone, decisionLayout = M.decisionLayout;
var instabIndex = M.instabIndex, velocidadeIndex = M.velocidadeIndex;

var oks = 0, fails = 0, micro = 0;
function ok(c, m) { if (c) oks++; else { fails++; console.log('  FALHA: ' + m); } }
function micros(n) { micro += n; }
function near(a, b, t) { return Math.abs(a - b) <= (t || 1e-7); }
function fin(x) { return typeof x === 'number' && isFinite(x); }
var MOD_OK = { TRRC: 1, HDI: 1, SLED: 1, DP: 1 };
var ANTI_OK = { citrato: 1, heparina: 1 };
// rank de CONTINUIDADE (quão "contínua/gentil" é a modalidade): DP < HDI < SLED < TRRC
var CONT_RANK = { DP: 0, HDI: 1, SLED: 2, TRRC: 3 };

/* faixas documentadas por campo de saída numérica [min,max] */
var BOUNDS = {
  instabilidade: [0, 1], pam: [30, 130], vasopressor: [0, 1], k: [2, 9], hco3: [2, 30], volume: [0, 20],
  ureia: [20, 400], sintomas: [0, 1], catabolismo: [0, 1], sangramento: [0, 1], intoxicacao: [0, 1],
  pesoKg: [30, 200], cronico: [0, 1],
  instab: [0, 1], velocidade: [0, 1],
  ktvAlvo: [0.9, 1.2], tempoHDI: [2.5, 4], tempoSLED: [6, 8],
  efluenteDose: [20, 35], efluenteTotal: [600, 7000], preFrac: [0.2, 0.6], trocasDP: [4, 4],
  ufRate: [0, 400], kCorr: [3.5, 9], hco3Corr: [2, 26], volRemovidoL: [0, 20], volCorr: [0, 20]
};
function dentroBounds(r) {
  for (var key in BOUNDS) { var b = BOUNDS[key]; if (!fin(r[key]) || r[key] < b[0] - 1e-9 || r[key] > b[1] + 1e-9) return key; }
  return null;
}

/* ---------- 1. LINHA DE BASE ---------- */
(function () {
  var r = capstone({});
  ok(r.modalidade in MOD_OK, 'base: modalidade é enum válido (' + r.modalidade + ')');
  ok(r.anticoag in ANTI_OK, 'base: anticoag é enum válido (' + r.anticoag + ')');
  ok(r.anticoag === 'heparina', 'base: sangramento baixo → heparina');
  ok(!r.gentilPrimeira, 'base: ureia normal → não é gentil');
  ok(dentroBounds(r) === null, 'base: todas as saídas em faixa');
  ok(r.meioRestaurado === true, 'base: paciente leve → meio interno restaurado previsto');
})();

/* ---------- 2. IDENTIDADES ---------- */
(function () {
  for (var i = 0; i < 40; i++) {
    var ins = i / 40, r = capstone({ instabilidade: ins, pam: 80 - ins * 40, vasopressor: ins });
    ok(near(r.instab, instabIndex(ins, 80 - ins * 40, ins), 1e-9), 'id: instab = instabIndex()');
    ok(r.modalidade in MOD_OK, 'id: modalidade enum');
    ok(r.anticoag in ANTI_OK, 'id: anticoag enum');
    ok(dentroBounds(r) === null, 'id: saídas em faixa');
  }
  // velocidade = velocidadeIndex
  for (var j = 0; j < 30; j++) {
    var kk = 4 + j * 0.12, rv = capstone({ k: kk, intoxicacao: 0.3, sintomas: 0.2 });
    ok(near(rv.velocidade, velocidadeIndex(kk, 0.3, 0.2), 1e-9), 'id: velocidade = velocidadeIndex()');
  }
  // efluenteTotal = efluenteDose * pesoKg
  var re = capstone({ catabolismo: 0.5, pesoKg: 90 });
  ok(near(re.efluenteTotal, re.efluenteDose * re.pesoKg, 1e-6), 'id: efluenteTotal = dose × peso');
  // gentilPrimeira ⇔ muitoUremico
  var gu = capstone({ ureia: 250 });
  ok(gu.muitoUremico && gu.gentilPrimeira, 'id: ureia≥200 → muitoUremico → gentilPrimeira');
})();

/* ---------- 3. LEIS (monotonia direcional pontual) ---------- */
(function () {
  // instabilidade↑ → favorece contínuo (rank de continuidade ≥)
  var lo = capstone({ instabilidade: 0.1, pam: 90, vasopressor: 0 });
  var hi = capstone({ instabilidade: 0.9, pam: 50, vasopressor: 0.8 });
  ok(CONT_RANK[hi.modalidade] >= CONT_RANK[lo.modalidade], 'lei: instabilidade↑ → modalidade mais contínua');
  ok(hi.modalidade === 'TRRC', 'lei: muito instável → TRRC');
  // K↑/velocidade↑ → favorece rápido (HDI) quando estável
  ok(capstone({ k: 7.5, instabilidade: 0.1, pam: 90 }).modalidade === 'HDI', 'lei: estável + K alto → HDI (rápido)');
  ok(capstone({ k: 7.5, instabilidade: 0.1 }).velocidade > capstone({ k: 4.5, instabilidade: 0.1 }).velocidade, 'lei: K↑ → velocidade↑');
  // sangramento↑ → favorece citrato
  ok(capstone({ sangramento: 0.1 }).anticoag === 'heparina', 'lei: sangramento baixo → heparina');
  ok(capstone({ sangramento: 0.9 }).anticoag === 'citrato', 'lei: sangramento alto → citrato');
  // ureia↑ → favorece início gentil
  ok(!capstone({ ureia: 100 }).gentilPrimeira && capstone({ ureia: 300 }).gentilPrimeira, 'lei: ureia↑ → início gentil');
  // instabilidade↑ → UF rate cortada (tolerância)
  ok(capstone({ instabilidade: 0.9, pam: 50, vasopressor: 0.8, volume: 10 }).ufRate < capstone({ instabilidade: 0.05, pam: 95, volume: 10 }).ufRate, 'lei: instável → UF menor (tolerância)');
  // catabolismo↑ → efluente↑
  ok(capstone({ catabolismo: 0.9 }).efluenteDose > capstone({ catabolismo: 0.0 }).efluenteDose, 'lei: catabolismo↑ → efluente↑');
})();

/* ---------- 4. PÉROLAS ---------- */
(function () {
  // PÉROLA: a modalidade sai do MECANISMO, não de receita.
  // mesmo K alto, mas INSTÁVEL → contínuo (não o rápido HDI).
  var instavelKalto = capstone({ k: 7.0, instabilidade: 0.85, pam: 52, vasopressor: 0.8 });
  ok(instavelKalto.modalidade === 'TRRC', 'pérola: K alto MAS instável → TRRC (contínuo gentil), não HDI');
  // estável + K alto → HDI (rápido só quando pode E precisa)
  var estavelKalto = capstone({ k: 7.0, instabilidade: 0.1, pam: 92 });
  ok(estavelKalto.modalidade === 'HDI', 'pérola: estável + K alto → HDI (rápido)');
  // muito urêmico → 1ª sessão GENTIL (evita desequilíbrio, M34)
  var uremico = capstone({ ureia: 300, instabilidade: 0.1, pam: 90 });
  ok(uremico.gentilPrimeira && uremico.ktvAlvo < 1.2 && uremico.tempoHDI < 4, 'pérola: muito urêmico → 1ª sessão gentil (Kt/V e tempo menores)');
  ok(!uremico.alertaDesequilibrio, 'pérola: prescrição gentil MITIGA o alerta de desequilíbrio');
  // sangramento alto → citrato regional (não anticoagula o paciente)
  var sangra = capstone({ sangramento: 0.8 });
  ok(sangra.anticoag === 'citrato', 'pérola: sangramento alto → citrato regional');
  // instável com sobrecarga → UF LIMITADA pela hemodinâmica (UF < refilling)
  var sobrecargaInstavel = capstone({ instabilidade: 0.9, pam: 50, vasopressor: 0.9, volume: 12 });
  ok(sobrecargaInstavel.ufLimitadaPorHemodinamica && sobrecargaInstavel.ufRate < 400, 'pérola: instável → UF limitada pela tolerância (evita UF>refilling)');
  // a prescrição restaura o meio interno num cenário tratável
  var trat = capstone({ instabilidade: 0.7, pam: 60, vasopressor: 0.5, k: 6.0, hco3: 14, volume: 4 });
  ok(trat.kCorr < trat.k && trat.hco3Corr > trat.hco3, 'pérola: a diálise corrige K↓ e HCO₃↑ por física (difusão/tampão)');
})();

/* ---------- 5. DETERMINISMO 5× byte-idêntico ---------- */
(function () {
  var inp = { instabilidade: 0.6, pam: 62, vasopressor: 0.5, k: 6.1, hco3: 15, volume: 6, ureia: 210, sintomas: 0.5, catabolismo: 0.6, sangramento: 0.6, pesoKg: 82 };
  var ref = JSON.stringify(capstone(inp));
  var igual = true;
  for (var n = 0; n < 5; n++) { if (JSON.stringify(capstone(inp)) !== ref) igual = false; }
  ok(igual, 'determinismo: 5 execuções byte-idênticas');
  var Lref = JSON.stringify(decisionLayout(inp, 900, 360));
  var igualL = true;
  for (var m = 0; m < 5; m++) { if (JSON.stringify(decisionLayout(inp, 900, 360)) !== Lref) igualL = false; }
  ok(igualL, 'determinismo: layout 5× byte-idêntico');
  var frozen = Object.freeze({ instabilidade: 0.8, k: 6.5, sangramento: 0.7 });
  var threw = false, a; try { a = capstone(frozen); } catch (e) { threw = true; }
  ok(!threw && fin(a.ufRate), 'determinismo: Object.freeze não lança');
  ok(frozen.k === 6.5, 'determinismo: entrada não mutada');
})();

/* ---------- 6. ROBUSTEZ (lixo pontual) ---------- */
(function () {
  var maus = [undefined, null, {}, { k: NaN }, { instabilidade: 'x' }, { pam: -10 }, { volume: 1e9 },
    { ureia: Infinity }, { sangramento: -5 }, { catabolismo: 'z' }, { pesoKg: 9 }, { vasopressor: 1e300 },
    { intoxicacao: NaN }, [], function () {}, { cronico: 'a' }];
  maus.forEach(function (mm, i) {
    var r = capstone(mm);
    ok(dentroBounds(r) === null, 'robustez[' + i + ']: saídas finitas e em faixa');
    ok(r.modalidade in MOD_OK && r.anticoag in ANTI_OK, 'robustez[' + i + ']: enums válidos');
  });
})();

/* ---------- 7. LIMITES por campo ---------- */
(function () {
  var fields = ['instabilidade', 'pam', 'vasopressor', 'k', 'hco3', 'volume', 'ureia', 'sintomas', 'catabolismo', 'sangramento', 'intoxicacao', 'pesoKg', 'cronico'];
  var extremos = [-1e9, -1e3, -1, 0, 1, 50, 1e3, 1e9, NaN, Infinity, -Infinity];
  fields.forEach(function (f) {
    extremos.forEach(function (v) {
      var inp = {}; inp[f] = v; var r = capstone(inp);
      ok(dentroBounds(r) === null, 'limites: campo ' + f + '=' + v + ' → saídas em faixa');
      ok(r.modalidade in MOD_OK && r.anticoag in ANTI_OK, 'limites: campo ' + f + '=' + v + ' → enums válidos');
    });
  });
})();

/* ---------- 8. MONOTONIA EXAUSTIVA (≥50 passos por eixo, cada par adjacente) ---------- */
(function () {
  var STEPS = 60;
  // instabilidade↑ → CONT_RANK não-decrescente (favorece contínuo); usa pam/vaso coerentes
  (function () {
    var prev = null, monoOk = true, viol = 0;
    for (var i = 0; i <= STEPS; i++) {
      var ins = i / STEPS;
      var r = capstone({ instabilidade: ins, pam: 90 - ins * 45, vasopressor: ins, k: 5.0 });
      var rk = CONT_RANK[r.modalidade];
      if (prev !== null) { if (rk - prev < -1e-9) { monoOk = false; viol++; } micros(1); }
      prev = rk;
    }
    ok(monoOk, 'monotonia: instabilidade↑ → modalidade mais contínua (' + viol + ' violações)');
  })();
  // velocidade (K↑) → velocidade index não-decrescente
  (function () {
    var prev = null, monoOk = true, viol = 0;
    for (var i = 0; i <= STEPS; i++) {
      var k = 4.0 + 4.0 * i / STEPS;
      var v = capstone({ k: k }).velocidade;
      if (prev !== null) { if (v - prev < -1e-9) { monoOk = false; viol++; } micros(1); }
      prev = v;
    }
    ok(monoOk, 'monotonia: K↑ → velocidade↑ (' + viol + ' violações)');
  })();
  // instab index não-decrescente com instabilidade
  (function () {
    var prev = null, monoOk = true, viol = 0;
    for (var i = 0; i <= STEPS; i++) {
      var ins = i / STEPS;
      var v = capstone({ instabilidade: ins }).instab;
      if (prev !== null) { if (v - prev < -1e-9) { monoOk = false; viol++; } micros(1); }
      prev = v;
    }
    ok(monoOk, 'monotonia: instabilidade↑ → instab↑ (' + viol + ' violações)');
  })();
  // sangramento↑ → anticoag passa de heparina(0) para citrato(1), monótono (degrau único)
  (function () {
    var prev = null, monoOk = true, viol = 0;
    for (var i = 0; i <= STEPS; i++) {
      var s = i / STEPS;
      var a = capstone({ sangramento: s }).anticoag === 'citrato' ? 1 : 0;
      if (prev !== null) { if (a - prev < -1e-9) { monoOk = false; viol++; } micros(1); }
      prev = a;
    }
    ok(monoOk, 'monotonia: sangramento↑ → favorece citrato (degrau monótono, ' + viol + ' violações)');
  })();
  // ureia↑ → gentilPrimeira passa de 0 para 1, monótono
  (function () {
    var prev = null, monoOk = true, viol = 0;
    for (var i = 0; i <= STEPS; i++) {
      var u = 20 + 380 * i / STEPS;
      var g = capstone({ ureia: u }).gentilPrimeira ? 1 : 0;
      if (prev !== null) { if (g - prev < -1e-9) { monoOk = false; viol++; } micros(1); }
      prev = g;
    }
    ok(monoOk, 'monotonia: ureia↑ → favorece início gentil (degrau monótono, ' + viol + ' violações)');
  })();
  // catabolismo↑ → efluenteDose não-decrescente
  (function () {
    var prev = null, monoOk = true, viol = 0;
    for (var i = 0; i <= STEPS; i++) {
      var cat = i / STEPS;
      var e = capstone({ catabolismo: cat }).efluenteDose;
      if (prev !== null) { if (e - prev < -1e-9) { monoOk = false; viol++; } micros(1); }
      prev = e;
    }
    ok(monoOk, 'monotonia: catabolismo↑ → efluente↑ (' + viol + ' violações)');
  })();
  // volume↑ → ufRate não-decrescente (estável, sem corte de tolerância)
  (function () {
    var prev = null, monoOk = true, viol = 0;
    for (var i = 0; i <= STEPS; i++) {
      var vol = 20 * i / STEPS;
      var uf = capstone({ instabilidade: 0.05, pam: 95, volume: vol }).ufRate;
      if (prev !== null) { if (uf - prev < -1e-9) { monoOk = false; viol++; } micros(1); }
      prev = uf;
    }
    ok(monoOk, 'monotonia: volume↑ → UF↑ (estável) (' + viol + ' violações)');
  })();
})();

/* ---------- 9. FUZZING semeado ≥20000 (40% malignas em CADA campo) ---------- */
(function () {
  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  var rnd = mulberry32(0x38C0DE), N = 22000, bad = 0, badL = 0, badEnum = 0, badMut = 0, badId = 0;
  var MAL = [NaN, Infinity, -Infinity, 1e300, -1e300, 1e-300, '5', 'x', '', null, undefined, {}, [], function () {}, true, false];
  function val() { if (rnd() < 0.4) return MAL[(rnd() * MAL.length) | 0]; return (rnd() - 0.2) * 500; }
  function fields() {
    return {
      instabilidade: val(), pam: val(), vasopressor: val(), k: val(), hco3: val(), volume: val(),
      ureia: val(), sintomas: val(), catabolismo: val(), sangramento: val(), intoxicacao: val(),
      pesoKg: val(), cronico: val()
    };
  }
  function ser(o) { return JSON.stringify(o, function (key, v) { return (typeof v === 'function') ? '__fn__' : (v === undefined ? '__u__' : v); }); }
  for (var i = 0; i < N; i++) {
    var inp = fields();
    var snapshot = ser(inp);
    var r = capstone(inp);
    var L = decisionLayout(inp, 900, 360);
    // (a)+(b) saídas finitas e em faixa documentada
    if (dentroBounds(r) !== null) bad++;
    // (c) enums sempre válidos
    if (!(r.modalidade in MOD_OK) || !(r.anticoag in ANTI_OK)) badEnum++;
    // (d) identidades: efluenteTotal = dose×peso; instab = índice; gentil ⇔ muitoUremico
    if (Math.abs(r.efluenteTotal - r.efluenteDose * r.pesoKg) > 1e-6) badId++;
    if (Math.abs(r.instab - instabIndex(r.instabilidade, r.pam, r.vasopressor)) > 1e-7) badId++;
    if (r.gentilPrimeira !== r.muitoUremico) badId++;
    // layout finito
    if (!Array.isArray(L.pts) || L.pts.length !== 61 || !fin(L.current.x) || !fin(L.current.y)) badL++;
    for (var j = 0; j < L.pts.length; j++) { if (!fin(L.pts[j].x) || !fin(L.pts[j].y) || !fin(L.pts[j].instab)) { badL++; break; } }
    // (e) input não mutado
    if (ser(inp) !== snapshot) badMut++;
    micros(6 + L.pts.length);
  }
  var threwFrozen = false; try { capstone(Object.freeze({ instabilidade: 1, k: 9, sangramento: 1 })); } catch (e) { threwFrozen = true; }
  ok(bad === 0, 'fuzzing: ' + N + ' entradas (40% malignas) → 0 violações de faixa (' + bad + ')');
  ok(badEnum === 0, 'fuzzing: enums (modalidade/anticoag) sempre válidos (' + badEnum + ')');
  ok(badId === 0, 'fuzzing: identidades intactas (' + badId + ')');
  ok(badL === 0, 'fuzzing: layout finito em todas (' + badL + ')');
  ok(badMut === 0, 'fuzzing: input nunca mutado (' + badMut + ')');
  ok(!threwFrozen, 'fuzzing: Object.freeze não lança');
})();

/* ---------- 10. SAÍDA ---------- */
var total = oks + micro;
console.log(total + ' OK (' + oks + ' macro + ' + micro + ' micro/fuzz) · ' + fails + ' falhas');
process.exit(fails > 0 ? 1 : 0);
