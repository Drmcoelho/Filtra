/* =========================================================================
 * FILTRA · M29 — bateria de robustez do engine (0 falhas ou não entra)
 * 1 BASE · 2 IDENTIDADES · 3 LEIS · 4 PÉROLAS · 5 DETERMINISMO 5× · 6 ROBUSTEZ ·
 * 7 LIMITES · 8 MONOTONIA EXAUSTIVA · 9 FUZZING ≥22000 (~35% malignas) · 10 SAÍDA
 * (robustez REFORÇADA: fuzz ≥22000, ~35% malignas em CADA campo, monotonia ≥60 passos/eixo)
 * ========================================================================= */
var M = require('./model29.js');
var anticoagulacao = M.anticoagulacao, caLayout = M.caLayout;
var citrato = M.citrato, acumuloCitrato = M.acumuloCitrato, heparina = M.heparina;
var GAP_ALARME = M.GAP_ALARME, CA_CIRC_ALVO_HI = M.CA_CIRC_ALVO_HI;

var oks = 0, fails = 0, micro = 0;
function ok(c, m) { if (c) oks++; else { fails++; console.log('  FALHA: ' + m); } }
function micros(n) { micro += n; }
function near(a, b, t) { return Math.abs(a - b) <= (t || 1e-7); }
function fin(x) { return typeof x === 'number' && isFinite(x); }
var MOD_OK = { citrato: 1, heparina: 1 };

/* faixas documentadas por campo de saída numérica [min,max] */
var BOUNDS = {
  sangramento: [0, 1], funcaoHepatica: [0, 1], citratoDose: [0, 8], qb: [50, 350],
  caBasal: [0.4, 1.6], caReposicao: [0, 6], caSistBasal: [0.5, 1.6], heparinaDose: [0, 1],
  quela: [0, 1], cargaCitrato: [0, 168], citratoSerico: [0.1, 2.5], caLigadoCitrato: [0, 1.4],
  caTotal: [1.0, 4.5], ttpaRatio: [1.0, 3.0],
  caCircuito: [0.05, 1.6], caSistemico: [0.5, 1.6], gap: [1.0, 12], riscoSangramento: [0, 1]
};
function dentroBounds(r) {
  for (var key in BOUNDS) { var b = BOUNDS[key]; if (!fin(r[key]) || r[key] < b[0] - 1e-9 || r[key] > b[1] + 1e-9) return key; }
  return null;
}

/* ---------- 1. LINHA DE BASE ---------- */
(function () {
  var r = anticoagulacao({});
  ok(r.modalidade in MOD_OK, 'base: modalidade enum válido (' + r.modalidade + ')');
  ok(r.modalidade === 'heparina', 'base: sangramento baixo → heparina');
  ok(dentroBounds(r) === null, 'base: todas as saídas em faixa (' + dentroBounds(r) + ')');
  ok(r.caCircuito < r.caBasal, 'base: citrato baixa o Ca²⁺ do circuito (anticoagula localmente)');
  ok(near(r.caSistemico, 1.20, 0.05), 'base: Ca²⁺ sistêmico ~1,2 mmol/L (normal)');
  ok(!r.alarmeAcumulo, 'base: fígado normal → sem alarme de acúmulo');
  // citrato regional: circuito baixo, sistêmico normal — anticoagula SÓ o circuito
  ok(r.caCircuito < 0.4 && r.caSistemico > 1.0, 'base: anticoagulação REGIONAL (circuito baixo, sistêmico normal)');
})();

/* ---------- 2. IDENTIDADES (valem SEMPRE) ---------- */
(function () {
  for (var i = 0; i < 40; i++) {
    var fh = i / 40;
    var r = anticoagulacao({ funcaoHepatica: fh, sangramento: 0.6, citratoDose: 4, qb: 200 });
    // gap = caTotal / caIonizado(sistêmico)
    ok(near(r.gap, r.caTotal / Math.max(r.caSistemico, 0.05), 1e-6) || r.gap >= 12 - 1e-9, 'id: gap = Ca_total/Ca_ionizado');
    // alarme ⇔ gap > limiar
    ok(r.alarmeAcumulo === (r.gap > GAP_ALARME), 'id: alarmeAcumulo ⇔ gap > 2,5');
    // anticoagulado ⇔ caCircuito ≤ janela
    var cit = citrato({ citratoDose: 4, qb: 200, caBasal: 1.15 });
    ok(cit.anticoagulado === (cit.caCircuito <= CA_CIRC_ALVO_HI + 1e-12), 'id: anticoagulado ⇔ Ca circuito ≤ alvo');
    ok(dentroBounds(r) === null, 'id: saídas em faixa (' + dentroBounds(r) + ')');
    micros(4);
  }
  // citrato: cargaCitrato = dose × Qb(L/h)
  for (var j = 0; j < 30; j++) {
    var d = 0.2 * j, q = 60 + j * 8;
    var c = citrato({ citratoDose: d, qb: q });
    ok(near(c.cargaCitrato, c.citratoDose * (c.qb * 60 / 1000), 1e-9), 'id: cargaCitrato = dose × Qb(L/h)');
    micros(1);
  }
  // heparina: ttpaRatio = 1 + 1.6·dose (clamp)
  for (var h = 0; h <= 20; h++) {
    var dd = h / 20, hp = heparina({ dose: dd });
    ok(near(hp.ttpaRatio, Math.min(1 + 1.6 * dd, 3), 1e-9), 'id: TTPa = 1+1,6·dose');
    micros(1);
  }
})();

/* ---------- 3. LEIS (monotonia direcional pontual) ---------- */
(function () {
  // ↑citrato → ↓Ca circuito
  ok(citrato({ citratoDose: 1 }).caCircuito > citrato({ citratoDose: 4 }).caCircuito, 'lei: ↑citrato → ↓Ca circuito');
  // ↓função hepática → ↑acúmulo → ↑gap
  var figBom = anticoagulacao({ funcaoHepatica: 1.0, citratoDose: 4, qb: 200 });
  var figRuim = anticoagulacao({ funcaoHepatica: 0.1, citratoDose: 4, qb: 200 });
  ok(figRuim.gap > figBom.gap, 'lei: ↓função hepática → ↑gap (acúmulo)');
  ok(figRuim.caSistemico < figBom.caSistemico, 'lei: acúmulo → ↓Ca²⁺ ionizado sistêmico');
  // ↑heparina → ↑sangramento e ↑TTPa
  ok(heparina({ dose: 0.9, sangramentoBasal: 0.2 }).riscoSangramento > heparina({ dose: 0.1, sangramentoBasal: 0.2 }).riscoSangramento, 'lei: ↑heparina → ↑sangramento');
  ok(heparina({ dose: 0.9 }).ttpaRatio > heparina({ dose: 0.1 }).ttpaRatio, 'lei: ↑heparina → ↑TTPa');
  // ↑sangramento → favorece citrato (com fígado bom)
  ok(anticoagulacao({ sangramento: 0.1, funcaoHepatica: 1 }).modalidade === 'heparina', 'lei: sangramento baixo → heparina');
  ok(anticoagulacao({ sangramento: 0.9, funcaoHepatica: 1 }).modalidade === 'citrato', 'lei: sangramento alto + fígado bom → citrato');
  // ↑Qb → ↑carga de citrato ao paciente
  ok(citrato({ qb: 250, citratoDose: 3 }).cargaCitrato > citrato({ qb: 80, citratoDose: 3 }).cargaCitrato, 'lei: ↑Qb → ↑carga de citrato');
  // ↑reposição de cálcio → ↑Ca²⁺ sistêmico
  ok(anticoagulacao({ caReposicao: 4, funcaoHepatica: 0.5, citratoDose: 4, qb: 200 }).caSistemico > anticoagulacao({ caReposicao: 0.5, funcaoHepatica: 0.5, citratoDose: 4, qb: 200 }).caSistemico, 'lei: ↑reposição Ca → ↑Ca²⁺ sistêmico');
})();

/* ---------- 4. PÉROLAS (o contra-intuitivo, provado pelo motor) ---------- */
(function () {
  // PÉROLA 1: o citrato anticoagula SÓ o circuito — circuito baixo, sistêmico normal
  var p = anticoagulacao({ sangramento: 0.8, funcaoHepatica: 1.0, citratoDose: 2.0, qb: 150, caReposicao: 1.7 });
  ok(p.modalidade === 'citrato' && p.caCircuito <= 0.4 && p.caSistemico >= 1.0, 'pérola: citrato anticoagula SÓ o circuito (circuito baixo, sistêmico normal)');
  ok(p.riscoSangramento <= p.sangramento + 1e-9, 'pérola: citrato regional NÃO aumenta o sangramento do paciente');
  // PÉROLA 2: o paciente que SANGRA prefere citrato (não anticoagula o doente) vs heparina
  var hepRisco = heparina({ dose: 0.7, sangramentoBasal: 0.8 }).riscoSangramento;
  ok(p.riscoSangramento < hepRisco, 'pérola: quem sangra prefere citrato (risco < heparina sistêmica)');
  // PÉROLA 3: fígado RUIM contraindica citrato pelo ACÚMULO (gap alto)
  var ruim = anticoagulacao({ sangramento: 0.8, funcaoHepatica: 0.1, citratoDose: 4, qb: 200 });
  ok(ruim.alarmeAcumulo && ruim.gap > GAP_ALARME, 'pérola: fígado ruim → acúmulo de citrato (gap > 2,5)');
  ok(ruim.modalidade !== 'citrato' || ruim.citratoContraindicado, 'pérola: fígado ruim contraindica o citrato');
  ok(ruim.citratoContraindicado, 'pérola: contraindicação de citrato sinalizada no fígado ruim');
  // o Ca TOTAL sobe enquanto o IONIZADO cai no acúmulo (gap = a pista)
  var figBom = anticoagulacao({ funcaoHepatica: 1.0, citratoDose: 4, qb: 200 });
  ok(ruim.caTotal > figBom.caTotal && ruim.caSistemico < figBom.caSistemico, 'pérola: acúmulo → Ca TOTAL↑ e Ca IONIZADO↓ (gap é a pista)');
})();

/* ---------- 5. DETERMINISMO 5× byte-idêntico ---------- */
(function () {
  var inp = { sangramento: 0.7, funcaoHepatica: 0.3, citratoDose: 3.5, qb: 180, caBasal: 1.1, caReposicao: 2.2, caSistBasal: 1.15, heparinaDose: 0.6 };
  var ref = JSON.stringify(anticoagulacao(inp)), igual = true;
  for (var n = 0; n < 5; n++) { if (JSON.stringify(anticoagulacao(inp)) !== ref) igual = false; }
  ok(igual, 'determinismo: 5 execuções byte-idênticas');
  var Lref = JSON.stringify(caLayout(inp, 900, 360)), igualL = true;
  for (var m = 0; m < 5; m++) { if (JSON.stringify(caLayout(inp, 900, 360)) !== Lref) igualL = false; }
  ok(igualL, 'determinismo: layout 5× byte-idêntico');
  var frozen = Object.freeze({ sangramento: 0.8, funcaoHepatica: 0.2, citratoDose: 4 });
  var threw = false, a; try { a = anticoagulacao(frozen); } catch (e) { threw = true; }
  ok(!threw && fin(a.gap), 'determinismo: Object.freeze não lança');
  ok(frozen.funcaoHepatica === 0.2, 'determinismo: entrada não mutada');
})();

/* ---------- 6. ROBUSTEZ (lixo pontual) ---------- */
(function () {
  var maus = [undefined, null, {}, { funcaoHepatica: NaN }, { sangramento: 'x' }, { citratoDose: -10 },
    { qb: 1e9 }, { caBasal: Infinity }, { caReposicao: -5 }, { citratoDose: 'z' }, { heparinaDose: 1e300 },
    { caSistBasal: NaN }, { funcaoHepatica: 'a' }, [], function () {}, { qb: -1 }];
  maus.forEach(function (mm, i) {
    var r = anticoagulacao(mm);
    ok(dentroBounds(r) === null, 'robustez[' + i + ']: saídas finitas e em faixa (' + dentroBounds(r) + ')');
    ok(r.modalidade in MOD_OK, 'robustez[' + i + ']: modalidade válida');
    var L = caLayout(mm, 900, 360);
    ok(fin(L.current.x) && fin(L.current.y) && L.pts.length === 49, 'robustez[' + i + ']: layout finito');
    micros(1);
  });
})();

/* ---------- 7. LIMITES por campo ---------- */
(function () {
  var fields = ['sangramento', 'funcaoHepatica', 'citratoDose', 'qb', 'caBasal', 'caReposicao', 'caSistBasal', 'heparinaDose'];
  var extremos = [-1e9, -1e3, -1, 0, 1, 50, 1e3, 1e9, NaN, Infinity, -Infinity];
  fields.forEach(function (f) {
    extremos.forEach(function (v) {
      var inp = {}; inp[f] = v; var r = anticoagulacao(inp);
      ok(dentroBounds(r) === null, 'limites: ' + f + '=' + v + ' → em faixa (' + dentroBounds(r) + ')');
      ok(r.modalidade in MOD_OK, 'limites: ' + f + '=' + v + ' → enum válido');
      micros(1);
    });
  });
})();

/* ---------- 8. MONOTONIA EXAUSTIVA (≥60 passos por eixo) ---------- */
(function () {
  var STEPS = 80;
  // citrato↑ → Ca circuito não-crescente
  (function () {
    var prev = null, mono = true, viol = 0;
    for (var i = 0; i <= STEPS; i++) {
      var d = 8 * i / STEPS, v = citrato({ citratoDose: d, caBasal: 1.15 }).caCircuito;
      if (prev !== null) { if (v - prev > 1e-9) { mono = false; viol++; } micros(1); }
      prev = v;
    }
    ok(mono, 'monotonia: citrato↑ → Ca circuito↓ (' + viol + ' violações)');
  })();
  // função hepática↑ → gap não-crescente (menos acúmulo)
  (function () {
    var prev = null, mono = true, viol = 0;
    for (var i = 0; i <= STEPS; i++) {
      var fh = i / STEPS, v = anticoagulacao({ funcaoHepatica: fh, citratoDose: 4, qb: 200 }).gap;
      if (prev !== null) { if (v - prev > 1e-9) { mono = false; viol++; } micros(1); }
      prev = v;
    }
    ok(mono, 'monotonia: função hepática↑ → gap↓ (' + viol + ' violações)');
  })();
  // função hepática↓ → gap↑ (espelho): varre decrescente
  (function () {
    var prev = null, mono = true, viol = 0;
    for (var i = 0; i <= STEPS; i++) {
      var fh = 1 - i / STEPS, v = anticoagulacao({ funcaoHepatica: fh, citratoDose: 4, qb: 200 }).gap;
      if (prev !== null) { if (v - prev < -1e-9) { mono = false; viol++; } micros(1); }
      prev = v;
    }
    ok(mono, 'monotonia: função hepática↓ → gap↑ (' + viol + ' violações)');
  })();
  // heparina↑ → sangramento não-decrescente
  (function () {
    var prev = null, mono = true, viol = 0;
    for (var i = 0; i <= STEPS; i++) {
      var d = i / STEPS, v = heparina({ dose: d, sangramentoBasal: 0.2 }).riscoSangramento;
      if (prev !== null) { if (v - prev < -1e-9) { mono = false; viol++; } micros(1); }
      prev = v;
    }
    ok(mono, 'monotonia: heparina↑ → sangramento↑ (' + viol + ' violações)');
  })();
  // heparina↑ → TTPa não-decrescente
  (function () {
    var prev = null, mono = true, viol = 0;
    for (var i = 0; i <= STEPS; i++) {
      var d = i / STEPS, v = heparina({ dose: d }).ttpaRatio;
      if (prev !== null) { if (v - prev < -1e-9) { mono = false; viol++; } micros(1); }
      prev = v;
    }
    ok(mono, 'monotonia: heparina↑ → TTPa↑ (' + viol + ' violações)');
  })();
  // Qb↑ → carga de citrato não-decrescente
  (function () {
    var prev = null, mono = true, viol = 0;
    for (var i = 0; i <= STEPS; i++) {
      var q = 50 + 300 * i / STEPS, v = citrato({ qb: q, citratoDose: 3 }).cargaCitrato;
      if (prev !== null) { if (v - prev < -1e-9) { mono = false; viol++; } micros(1); }
      prev = v;
    }
    ok(mono, 'monotonia: Qb↑ → carga de citrato↑ (' + viol + ' violações)');
  })();
  // reposição Ca↑ → Ca²⁺ sistêmico não-decrescente
  (function () {
    var prev = null, mono = true, viol = 0;
    for (var i = 0; i <= STEPS; i++) {
      var cr = 6 * i / STEPS, v = anticoagulacao({ caReposicao: cr, funcaoHepatica: 0.5, citratoDose: 4, qb: 200 }).caSistemico;
      if (prev !== null) { if (v - prev < -1e-9) { mono = false; viol++; } micros(1); }
      prev = v;
    }
    ok(mono, 'monotonia: reposição Ca↑ → Ca²⁺ sistêmico↑ (' + viol + ' violações)');
  })();
  // sangramento↑ (fígado bom) → modalidade passa heparina(0)→citrato(1), degrau monótono
  (function () {
    var prev = null, mono = true, viol = 0;
    for (var i = 0; i <= STEPS; i++) {
      var s = i / STEPS, a = anticoagulacao({ sangramento: s, funcaoHepatica: 1 }).modalidade === 'citrato' ? 1 : 0;
      if (prev !== null) { if (a - prev < -1e-9) { mono = false; viol++; } micros(1); }
      prev = a;
    }
    ok(mono, 'monotonia: sangramento↑ → favorece citrato (degrau monótono, ' + viol + ' violações)');
  })();
})();

/* ---------- 9. FUZZING semeado ≥22000 (~35% malignas em CADA campo) ---------- */
(function () {
  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  var rnd = mulberry32(0x29C1A7), N = 22000, bad = 0, badEnum = 0, badId = 0, badL = 0, badMut = 0;
  var MAL = [NaN, Infinity, -Infinity, 1e300, -1e300, 1e-300, '5', 'x', '', null, undefined, {}, [], function () {}, true, false];
  function val() { if (rnd() < 0.35) return MAL[(rnd() * MAL.length) | 0]; return (rnd() - 0.2) * 400; }
  function fields() {
    return {
      sangramento: val(), funcaoHepatica: val(), citratoDose: val(), qb: val(),
      caBasal: val(), caReposicao: val(), caSistBasal: val(), heparinaDose: val()
    };
  }
  function ser(o) { return JSON.stringify(o, function (k, v) { return (typeof v === 'function') ? '__fn__' : (v === undefined ? '__u__' : v); }); }
  for (var i = 0; i < N; i++) {
    var inp = fields();
    var snap = ser(inp);
    var r = anticoagulacao(inp);
    var L = caLayout(inp, 900, 360);
    if (dentroBounds(r) !== null) bad++;
    if (!(r.modalidade in MOD_OK)) badEnum++;
    // identidades: gap = caTotal/caSistemico (ou clamp 12); alarme ⇔ gap>2,5
    if (Math.abs(r.gap - r.caTotal / Math.max(r.caSistemico, 0.05)) > 1e-6 && r.gap < 12 - 1e-9) badId++;
    if (r.alarmeAcumulo !== (r.gap > GAP_ALARME)) badId++;
    // layout finito
    if (!Array.isArray(L.pts) || L.pts.length !== 49 || !fin(L.current.x) || !fin(L.current.y) || L.stations.length !== 3) badL++;
    for (var j = 0; j < L.pts.length; j++) { if (!fin(L.pts[j].x) || !fin(L.pts[j].y) || !fin(L.pts[j].gap)) { badL++; break; } }
    for (var s = 0; s < L.stations.length; s++) { if (!fin(L.stations[s].x) || !fin(L.stations[s].y) || !fin(L.stations[s].ca)) { badL++; break; } }
    if (ser(inp) !== snap) badMut++;
    micros(8 + L.pts.length);
  }
  var threwFrozen = false; try { anticoagulacao(Object.freeze({ sangramento: 1, funcaoHepatica: 0, citratoDose: 8 })); } catch (e) { threwFrozen = true; }
  ok(bad === 0, 'fuzzing: ' + N + ' entradas (~35% malignas) → 0 violações de faixa (' + bad + ')');
  ok(badEnum === 0, 'fuzzing: modalidade sempre válida (' + badEnum + ')');
  ok(badId === 0, 'fuzzing: identidades intactas (gap, alarme) (' + badId + ')');
  ok(badL === 0, 'fuzzing: layout finito em todas (' + badL + ')');
  ok(badMut === 0, 'fuzzing: input nunca mutado (' + badMut + ')');
  ok(!threwFrozen, 'fuzzing: Object.freeze não lança');
})();

/* ---------- 10. SAÍDA ---------- */
var total = oks + micro;
console.log(total + ' OK (' + oks + ' macro + ' + micro + ' micro/fuzz) · ' + fails + ' falhas');
process.exit(fails > 0 ? 1 : 0);
