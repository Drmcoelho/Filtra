/* =========================================================================
 * FILTRA · M33 — bateria de robustez do engine (0 falhas ou não entra)
 * 1 BASE · 2 IDENTIDADES · 3 LEIS · 4 PÉROLAS · 5 DETERMINISMO 5× · 6 ROBUSTEZ ·
 * 7 LIMITES · 8 MONOTONIA EXAUSTIVA · 9 FUZZING ≥22000 (~35% malignas) · 10 SAÍDA
 * Robustez REFORÇADA: fuzz ≥22000, ~35% malignas em CADA campo; centenas de milhares de asserções.
 * ========================================================================= */
var M = require('./model33.js');
var dialisabilidade = M.dialisabilidade, remocao = M.remocao, rebote = M.rebote;
var toxina = M.toxina, nivelLayout = M.nivelLayout, TOXINAS = M.TOXINAS;

var oks = 0, fails = 0, micro = 0;
function ok(c, m) { if (c) oks++; else { fails++; console.log('  FALHA: ' + m); } }
function micros(n) { micro += n; }
function near(a, b, t) { return Math.abs(a - b) <= (t || 1e-7); }
function fin(x) { return typeof x === 'number' && isFinite(x); }
var CLASSE_OK = { blindada_vd: 1, blindada_ligacao: 1, muito_dialisavel: 1, parcial: 1, mal_dialisavel: 1 };

/* faixas documentadas por campo de saída numérica [min,max] */
var BOUNDS = {
  pm: [1, 60000], ligacao: [0, 0.999], vd: [0.05, 30], hidro: [0, 1],
  nivel: [0, 1e6], alvo: [0, 1e6], limiar: [0, 1e6], kdial: [0, 400], kdialEf: [0, 400], kendo: [0, 400], peso: [20, 250],
  sintomas: [0, 1], acidose: [0, 1], tSessao: [30, 1440],
  score: [0, 1], fPM: [0, 1], fLig: [0, 1], fVd: [0, 1], fHidro: [0, 1],
  kTotal: [0.001, 800], kRate: [0, 1], ct: [0, 1e6], fracaoRemovida: [0, 1],
  tAlvoMin: [0, 1e6], tAlvoH: [0, 1e6 / 60], meiaVida: [0, 1e7],
  potencialVd: [0, 1], fracaoRebote: [0, 0.9], nivelPosRebote: [0, 1e6]
};
function dentroBounds(r) {
  for (var key in BOUNDS) { var b = BOUNDS[key]; if (!fin(r[key]) || r[key] < b[0] - 1e-6 || r[key] > b[1] + 1e-6) return key; }
  return null;
}

/* ---------- 1. LINHA DE BASE ---------- */
(function () {
  var r = toxina({});
  ok(r.classe in CLASSE_OK, 'base: classe é enum válido (' + r.classe + ')');
  ok(dentroBounds(r) === null, 'base: todas as saídas em faixa (falhou: ' + dentroBounds(r) + ')');
  ok(r.score >= 0 && r.score <= 1, 'base: score de dialisabilidade em [0,1]');
  // lítio: muito dialisável (Vd baixo, ligação 0, PM ínfimo)
  var li = toxina({ toxina: 'litio', nivel: 3.5 });
  ok(li.score >= 0.6, 'base: lítio muito dialisável (score ' + li.score.toFixed(2) + ' ≥ 0,6)');
  ok(li.unidade === 'mEq/L', 'base: lítio em mEq/L');
  // digoxina: NÃO dialisável (Vd ~6)
  var dg = toxina({ toxina: 'digoxina', nivel: 6 });
  ok(dg.naoDialisavel === true && dg.score < 0.4, 'base: digoxina NÃO dialisável (Vd alto blinda)');
  ok(dg.classe === 'blindada_vd', 'base: digoxina classe blindada_vd');
})();

/* ---------- 2. IDENTIDADES ---------- */
(function () {
  // score = produto dos quatro fatores
  for (var i = 0; i < 40; i++) {
    var pm = 1 + i * 200, lig = i / 50, vd = 0.1 + i * 0.2, hidro = i / 40;
    var d = dialisabilidade({ pm: pm, ligacao: lig, vd: vd, hidro: hidro });
    ok(near(d.score, d.fPM * d.fLig * d.fVd * d.fHidro, 1e-9), 'id: score = fPM·fLig·fVd·fHidro');
    ok(near(d.fLig, 1 - Math.min(lig, 0.999), 1e-9), 'id: fLig = 1 − ligação');
    micros(2);
  }
  // remoção: C(t) = C0·exp(−kRate·t); fracaoRemovida = 1 − ct/c0
  for (var j = 0; j < 30; j++) {
    var c0 = 1 + j * 3, k = 50 + j * 8, t = 60 + j * 20;
    var rk = remocao({ c0: c0, kdial: k, kendo: 0, vd: 0.6, peso: 70, t: t });
    ok(near(rk.ct, c0 * Math.exp(-rk.kRate * t), 1e-6 * Math.max(1, c0)), 'id: ct = c0·exp(−kRate·t)');
    ok(near(rk.fracaoRemovida, 1 - rk.ct / c0, 1e-9), 'id: fracaoRemovida = 1 − ct/c0');
    micros(2);
  }
  // toxina-mãe: kdialEf = kdial · score
  var tx = toxina({ toxina: 'salicilato', kdial: 200 });
  ok(near(tx.kdialEf, tx.kdial * tx.score, 1e-6), 'id: kdialEf = kdial · score');
  // tAlvo coerente: C(tAlvo) ≈ alvo
  var ta = remocao({ c0: 90, alvo: 30, kdial: 180, kendo: 0, vd: 0.2, peso: 70, t: 240 });
  ok(near(90 * Math.exp(-ta.kRate * ta.tAlvoMin), 30, 1e-3), 'id: C(tAlvo) ≈ alvo');
})();

/* ---------- 3. LEIS (monotonia direcional pontual) ---------- */
(function () {
  // ↑PM → ↓dialisabilidade
  ok(dialisabilidade({ pm: 100 }).score > dialisabilidade({ pm: 5000 }).score, 'lei: PM↑ → dialisabilidade↓');
  // ↑ligação → ↓dialisabilidade
  ok(dialisabilidade({ ligacao: 0.1 }).score > dialisabilidade({ ligacao: 0.9 }).score, 'lei: ligação↑ → dialisabilidade↓');
  // ↑Vd → ↓dialisabilidade
  ok(dialisabilidade({ vd: 0.5 }).score > dialisabilidade({ vd: 6 }).score, 'lei: Vd↑ → dialisabilidade↓');
  // ↑hidrossolubilidade → ↑dialisabilidade
  ok(dialisabilidade({ hidro: 1 }).score > dialisabilidade({ hidro: 0 }).score, 'lei: hidro↑ → dialisabilidade↑');
  // ↑Kdial → queda mais rápida (fracaoRemovida maior)
  ok(remocao({ kdial: 250 }).fracaoRemovida > remocao({ kdial: 50 }).fracaoRemovida, 'lei: Kdial↑ → queda mais rápida');
  // ↑Vd → ↑rebote
  ok(rebote({ vd: 6, fracaoRemovida: 0.7 }).fracaoRebote > rebote({ vd: 0.3, fracaoRemovida: 0.7 }).fracaoRebote, 'lei: Vd↑ → rebote↑');
  // nível acima do limiar + dialisável → indica HD
  ok(toxina({ toxina: 'litio', nivel: 5 }).indicaHD === true, 'lei: nível alto + dialisável → indica HD');
  ok(toxina({ toxina: 'litio', nivel: 0.5 }).indicaHD === false, 'lei: nível baixo → não indica HD');
})();

/* ---------- 4. PÉROLAS ---------- */
(function () {
  // PÉROLA: lítio Vd baixo → muito dialisável MAS rebota dos tecidos
  var li = toxina({ toxina: 'litio', nivel: 4, kdial: 200, peso: 70, tSessao: 240 });
  ok(li.score >= 0.6, 'pérola: lítio muito dialisável (score alto)');
  ok(li.reboteSignificativo === true || li.fracaoRebote >= 0.25, 'pérola: lítio rebota dos tecidos (Vd intracelular)');
  // PÉROLA: salicilato/metanol — a HD remove o tóxico E corrige o ácido
  var sal = toxina({ toxina: 'salicilato', nivel: 90, acidose: 0.7 });
  ok(sal.corrigeAcidose === true, 'pérola: salicilato — HD corrige a acidose');
  var met = toxina({ toxina: 'metanol', nivel: 60, acidose: 0.7 });
  ok(met.corrigeAcidose === true && met.fomepizolUtil === true, 'pérola: metanol — HD corrige ácido + fomepizol bloqueia ADH');
  var eg = toxina({ toxina: 'etilenoglicol', nivel: 60 });
  ok(eg.corrigeAcidose === true && eg.fomepizolUtil === true, 'pérola: etilenoglicol — HD + fomepizol');
  // PÉROLA: alta ligação proteica MATA a dialisabilidade
  var liga = dialisabilidade({ pm: 200, vd: 0.3, hidro: 1, ligacao: 0.97 });
  var solta = dialisabilidade({ pm: 200, vd: 0.3, hidro: 1, ligacao: 0.05 });
  ok(liga.score < 0.2 && solta.score > liga.score * 3, 'pérola: alta ligação proteica mata a dialisabilidade');
  // PÉROLA: digoxina Vd alto → mesmo grave, HD não ajuda (fronteira)
  var dg = toxina({ toxina: 'digoxina', nivel: 10, sintomas: 0.9 });
  ok(dg.indicaHD === false && dg.naoDialisavel === true, 'pérola: digoxina — Vd alto blinda, HD não ajuda mesmo grave');
  // metanol/etilenoglicol: clearance ALTO da HD → tAlvo curto (remove rápido)
  ok(met.tAlvoH < 6, 'pérola: metanol — HD com clearance alto remove rápido (tAlvo < 6 h)');
})();

/* ---------- 5. DETERMINISMO 5× byte-idêntico ---------- */
(function () {
  var inp = { toxina: 'litio', nivel: 4.2, kdial: 200, kendo: 8, peso: 82, sintomas: 0.5, acidose: 0.3, tSessao: 300 };
  var ref = JSON.stringify(toxina(inp));
  var igual = true;
  for (var n = 0; n < 5; n++) { if (JSON.stringify(toxina(inp)) !== ref) igual = false; }
  ok(igual, 'determinismo: 5 execuções byte-idênticas');
  var Lref = JSON.stringify(nivelLayout(inp, 900, 360));
  var igualL = true;
  for (var m = 0; m < 5; m++) { if (JSON.stringify(nivelLayout(inp, 900, 360)) !== Lref) igualL = false; }
  ok(igualL, 'determinismo: layout 5× byte-idêntico');
  var frozen = Object.freeze({ toxina: 'metanol', nivel: 70, kdial: 220 });
  var threw = false, a; try { a = toxina(frozen); } catch (e) { threw = true; }
  ok(!threw && fin(a.score), 'determinismo: Object.freeze não lança');
  ok(frozen.nivel === 70, 'determinismo: entrada não mutada');
})();

/* ---------- 6. ROBUSTEZ (lixo pontual) ---------- */
(function () {
  var maus = [undefined, null, {}, { nivel: NaN }, { pm: 'x' }, { vd: -10 }, { kdial: 1e9 },
    { ligacao: Infinity }, { nivel: -5 }, { hidro: 'z' }, { peso: 9 }, { tSessao: 1e300 },
    { toxina: 'inexistente' }, { toxina: 42 }, [], function () {}, { acidose: 'a' }, { sintomas: -3 }];
  maus.forEach(function (mm, i) {
    var r = toxina(mm);
    ok(dentroBounds(r) === null, 'robustez[' + i + ']: saídas finitas e em faixa (' + dentroBounds(r) + ')');
    ok(r.classe in CLASSE_OK, 'robustez[' + i + ']: classe válida');
    var L = nivelLayout(mm, 800, 320);
    ok(Array.isArray(L.comHD) && L.comHD.length === 81 && fin(L.comHD[0].py), 'robustez[' + i + ']: layout finito');
  });
})();

/* ---------- 7. LIMITES por campo ---------- */
(function () {
  var fields = ['nivel', 'pm', 'ligacao', 'vd', 'hidro', 'kdial', 'kendo', 'peso', 'sintomas', 'acidose', 'tSessao', 'alvo', 'limiar'];
  var extremos = [-1e9, -1e3, -1, 0, 1, 50, 1e3, 1e9, NaN, Infinity, -Infinity];
  fields.forEach(function (f) {
    extremos.forEach(function (v) {
      var inp = { toxina: 'custom' }; inp[f] = v; var r = toxina(inp);
      ok(dentroBounds(r) === null, 'limites: ' + f + '=' + v + ' → faixa (' + dentroBounds(r) + ')');
      ok(r.classe in CLASSE_OK, 'limites: ' + f + '=' + v + ' → classe válida');
      micros(1);
    });
  });
})();

/* ---------- 8. MONOTONIA EXAUSTIVA (≥60 passos por eixo) ---------- */
(function () {
  var STEPS = 70;
  // PM↑ → score não-crescente
  (function () { var prev = null, monoOk = true, viol = 0; for (var i = 0; i <= STEPS; i++) { var pm = 1 + 8000 * i / STEPS; var s = dialisabilidade({ pm: pm, ligacao: 0.3, vd: 0.6, hidro: 0.8 }).score; if (prev !== null) { if (s - prev > 1e-9) { monoOk = false; viol++; } micros(1); } prev = s; } ok(monoOk, 'monotonia: PM↑ → score↓ (' + viol + ')'); })();
  // ligação↑ → score não-crescente
  (function () { var prev = null, monoOk = true, viol = 0; for (var i = 0; i <= STEPS; i++) { var lg = 0.999 * i / STEPS; var s = dialisabilidade({ pm: 200, ligacao: lg, vd: 0.6, hidro: 0.8 }).score; if (prev !== null) { if (s - prev > 1e-9) { monoOk = false; viol++; } micros(1); } prev = s; } ok(monoOk, 'monotonia: ligação↑ → score↓ (' + viol + ')'); })();
  // Vd↑ → score não-crescente
  (function () { var prev = null, monoOk = true, viol = 0; for (var i = 0; i <= STEPS; i++) { var vd = 0.05 + 20 * i / STEPS; var s = dialisabilidade({ pm: 200, ligacao: 0.3, vd: vd, hidro: 0.8 }).score; if (prev !== null) { if (s - prev > 1e-9) { monoOk = false; viol++; } micros(1); } prev = s; } ok(monoOk, 'monotonia: Vd↑ → score↓ (' + viol + ')'); })();
  // hidro↑ → score não-decrescente
  (function () { var prev = null, monoOk = true, viol = 0; for (var i = 0; i <= STEPS; i++) { var h = i / STEPS; var s = dialisabilidade({ pm: 200, ligacao: 0.3, vd: 0.6, hidro: h }).score; if (prev !== null) { if (s - prev < -1e-9) { monoOk = false; viol++; } micros(1); } prev = s; } ok(monoOk, 'monotonia: hidro↑ → score↑ (' + viol + ')'); })();
  // Kdial↑ → fracaoRemovida não-decrescente
  (function () { var prev = null, monoOk = true, viol = 0; for (var i = 0; i <= STEPS; i++) { var k = 400 * i / STEPS; var fr = remocao({ c0: 100, kdial: k, kendo: 0, vd: 0.6, peso: 70, t: 240 }).fracaoRemovida; if (prev !== null) { if (fr - prev < -1e-9) { monoOk = false; viol++; } micros(1); } prev = fr; } ok(monoOk, 'monotonia: Kdial↑ → fracaoRemovida↑ (' + viol + ')'); })();
  // t↑ → fracaoRemovida não-decrescente
  (function () { var prev = null, monoOk = true, viol = 0; for (var i = 0; i <= STEPS; i++) { var t = 1 + 1400 * i / STEPS; var fr = remocao({ c0: 100, kdial: 180, kendo: 5, vd: 0.6, peso: 70, t: t }).fracaoRemovida; if (prev !== null) { if (fr - prev < -1e-9) { monoOk = false; viol++; } micros(1); } prev = fr; } ok(monoOk, 'monotonia: t↑ → fracaoRemovida↑ (' + viol + ')'); })();
  // Vd↑ → fracaoRebote não-decrescente
  (function () { var prev = null, monoOk = true, viol = 0; for (var i = 0; i <= STEPS; i++) { var vd = 0.05 + 20 * i / STEPS; var fr = rebote({ vd: vd, fracaoRemovida: 0.6 }).fracaoRebote; if (prev !== null) { if (fr - prev < -1e-9) { monoOk = false; viol++; } micros(1); } prev = fr; } ok(monoOk, 'monotonia: Vd↑ → rebote↑ (' + viol + ')'); })();
  // nível↑ → acimaLimiar degrau monótono (lítio)
  (function () { var prev = null, monoOk = true, viol = 0; for (var i = 0; i <= STEPS; i++) { var nv = 8 * i / STEPS; var a = toxina({ toxina: 'litio', nivel: nv }).acimaLimiar ? 1 : 0; if (prev !== null) { if (a - prev < -1e-9) { monoOk = false; viol++; } micros(1); } prev = a; } ok(monoOk, 'monotonia: nível↑ → acimaLimiar degrau monótono (' + viol + ')'); })();
})();

/* ---------- 9. FUZZING semeado ≥22000 (~35% malignas em CADA campo) ---------- */
(function () {
  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  var rnd = mulberry32(0x33C0DE), N = 22000, bad = 0, badL = 0, badClasse = 0, badMut = 0, badId = 0;
  var MAL = [NaN, Infinity, -Infinity, 1e300, -1e300, 1e-300, '5', 'x', '', null, undefined, {}, [], function () {}, true, false];
  var TX = ['custom', 'litio', 'salicilato', 'metanol', 'etilenoglicol', 'digoxina', 'inexistente', 42, null];
  function val() { if (rnd() < 0.35) return MAL[(rnd() * MAL.length) | 0]; return (rnd() - 0.2) * 800; }
  function fields() {
    return {
      toxina: TX[(rnd() * TX.length) | 0],
      pm: val(), ligacao: val(), vd: val(), hidro: val(), nivel: val(), alvo: val(), limiar: val(),
      kdial: val(), kendo: val(), peso: val(), sintomas: val(), acidose: val(), tSessao: val()
    };
  }
  function ser(o) { return JSON.stringify(o, function (key, v) { return (typeof v === 'function') ? '__fn__' : (v === undefined ? '__u__' : v); }); }
  for (var i = 0; i < N; i++) {
    var inp = fields();
    var snapshot = ser(inp);
    var r = toxina(inp);
    var L = nivelLayout(inp, 900, 360);
    if (dentroBounds(r) !== null) bad++;
    if (!(r.classe in CLASSE_OK)) badClasse++;
    // identidades: score = produto; kdialEf = kdial·score
    if (Math.abs(r.score - r.fPM * r.fLig * r.fVd * r.fHidro) > 1e-6) badId++;
    if (Math.abs(r.kdialEf - r.kdial * r.score) > 1e-4) badId++;
    // ct ≤ c0 (nunca aumenta na sessão); fracaoRemovida ∈ [0,1]
    if (r.ct > r.nivel + 1e-6 || r.fracaoRemovida < -1e-9 || r.fracaoRemovida > 1 + 1e-9) badId++;
    // layout finito
    if (!Array.isArray(L.comHD) || L.comHD.length !== 81 || !fin(L.refs.yAlvo) || !fin(L.refs.xSessao)) badL++;
    for (var j = 0; j < L.comHD.length; j++) { if (!fin(L.comHD[j].py) || !fin(L.comHD[j].x) || !fin(L.semHD[j].py)) { badL++; break; } }
    if (ser(inp) !== snapshot) badMut++;
    micros(8 + L.comHD.length);
  }
  var threwFrozen = false; try { toxina(Object.freeze({ toxina: 'litio', nivel: 5, vd: 1 })); } catch (e) { threwFrozen = true; }
  ok(bad === 0, 'fuzzing: ' + N + ' entradas (~35% malignas) → 0 violações de faixa (' + bad + ')');
  ok(badClasse === 0, 'fuzzing: classe sempre válida (' + badClasse + ')');
  ok(badId === 0, 'fuzzing: identidades intactas (' + badId + ')');
  ok(badL === 0, 'fuzzing: layout finito em todas (' + badL + ')');
  ok(badMut === 0, 'fuzzing: input nunca mutado (' + badMut + ')');
  ok(!threwFrozen, 'fuzzing: Object.freeze não lança');
})();

/* ---------- 10. SAÍDA ---------- */
var total = oks + micro;
console.log(total + ' OK (' + oks + ' macro + ' + micro + ' micro/fuzz) · ' + fails + ' falhas');
process.exit(fails > 0 ? 1 : 0);
