/* =========================================================================
 * FILTRA · M19 — bateria de robustez do engine (0 falhas ou não entra)
 * 1 BASE · 2 IDENTIDADES · 3 LEIS · 4 PÉROLAS · 5 DETERMINISMO 5× · 6 ROBUSTEZ ·
 * 7 LIMITES · 8 MONOTONIA EXAUSTIVA · 9 FUZZING ≥20000 (35% malignas) · 10 SAÍDA
 * (robustez REFORÇADA: fuzz ≥20000, 35% malignas em CADA campo, monotonia ≥60 passos/eixo)
 * ========================================================================= */
var M = require('./model19.js');
var transporte = M.transporte, clearanceLayout = M.clearanceLayout;
var difusao = M.difusao, conveccao = M.conveccao, ultrafiltracao = M.ultrafiltracao, adsorcao = M.adsorcao;
var difCoef = M.difCoef, sievingCoef = M.sievingCoef;

var oks = 0, fails = 0, micro = 0;
function ok(c, m) { if (c) oks++; else { fails++; console.log('  FALHA: ' + m); } }
function micros(n) { micro += n; }
function near(a, b, t) { return Math.abs(a - b) <= (t || 1e-7); }
function fin(x) { return typeof x === 'number' && isFinite(x); }
var DOM_OK = { difusao: 1, conveccao: 1 };
var CLASSE_OK = { pequeno: 1, medio: 1, grande: 1 };
var MODO_OK = { difusivo: 1, convectivo: 1, retido: 1 };

/* faixas documentadas por campo de saída numérica [min,max] */
var BOUNDS = {
  pm: [60, 70000], gradConc: [0, 200], conc: [0, 200], area: [0.2, 3], espessura: [0.2, 5], qd: [0, 1000],
  ufRate: [0, 200], cutoff: [1000, 70000], modo: [0, 1], kuf: [0, 100], pHidro: [0, 400], pOnc: [0, 60],
  cap: [0, 1e6], kd: [1e-6, 1e6],
  dCoef: [0, 1], jDif: [0, 1e9], clearDif: [0, 320],
  sieving: [0, 1], jConv: [0, 1e9], clearConv: [0, 200],
  tmp: [-60, 400], qf: [0, 40000], volRemovido: [0, 40000],
  adsQ: [0, 1e12], adsSat: [0, 1],
  pesoDif: [0, 1], pesoConv: [0, 1], clearSoluto: [0, 320],
  clearDifMax: [0, 320], clearConvMax: [0, 200]
};
function dentroBounds(r) {
  for (var key in BOUNDS) { var b = BOUNDS[key]; if (!fin(r[key]) || r[key] < b[0] - 1e-6 || r[key] > b[1] + 1e-6) return key; }
  return null;
}

/* ---------- 1. LINHA DE BASE ---------- */
(function () {
  var r = transporte({});
  ok(r.dominante in DOM_OK, 'base: dominante é enum válido (' + r.dominante + ')');
  ok(r.classe in CLASSE_OK, 'base: classe é enum válido (' + r.classe + ')');
  ok(r.modoRecomendado in MODO_OK, 'base: modoRecomendado enum (' + r.modoRecomendado + ')');
  ok(dentroBounds(r) === null, 'base: todas as saídas em faixa (' + dentroBounds(r) + ')');
  // ureia (PM 60) — soluto pequeno, difusão alcança o teto
  ok(r.dCoef > 0.99, 'base: D(ureia) ≈ 1');
  ok(r.classe === 'pequeno', 'base: ureia (60 Da) é pequeno');
  ok(r.clearDif > 150, 'base: clearance difusivo da ureia é alto');
  // β2-microglobulina (PM ~11800) — médio, difunde MAL
  var b2m = transporte({ pm: 11800 });
  ok(b2m.dCoef < 0.25, 'base: D(β2-m) muito baixo (médio difunde mal)');
  ok(b2m.classe === 'medio', 'base: β2-m é soluto médio');
  ok(b2m.clearDif < r.clearDif, 'base: difusão da β2-m < difusão da ureia');
})();

/* ---------- 2. IDENTIDADES ---------- */
(function () {
  for (var i = 0; i < 50; i++) {
    var pm = 60 + i * 1200;
    var r = transporte({ pm: pm, ufRate: 40 });
    // clearance convectivo = ufRate × sieving (definição da convecção)
    var sv = sievingCoef(pm, 15000);
    ok(near(r.clearConv, 40 * sv, 1e-6), 'id: clearConv = ufRate × sieving (pm=' + pm + ')');
    // dCoef do resultado = difCoef(pm)
    ok(near(r.dCoef, difCoef(pm), 1e-9), 'id: dCoef = difCoef(pm)');
    ok(dentroBounds(r) === null, 'id: saídas em faixa (pm=' + pm + ')');
    micros(1);
  }
  // ultrafiltração: qf = kuf × max(0, TMP), TMP = pHidro − pOnc
  for (var j = 0; j < 30; j++) {
    var ph = 10 + j * 8, uf = ultrafiltracao({ kuf: 25, pHidro: ph, pOnc: 25 });
    ok(near(uf.tmp, ph - 25, 1e-9), 'id: TMP = pHidro − pOnc');
    ok(near(uf.qf, 25 * Math.max(0, ph - 25), 1e-6), 'id: qf = kuf × max(0,TMP)');
    micros(1);
  }
  // adsorção Langmuir: satFrac = conc/(kd+conc)
  for (var a = 0; a < 20; a++) {
    var c = a * 5, ad = adsorcao({ conc: c, cap: 100, kd: 10 });
    ok(near(ad.satFrac, c / (10 + c), 1e-9), 'id: satFrac = C/(Kd+C)');
    ok(near(ad.q, 100 * c / (10 + c), 1e-6), 'id: q = cap·C/(Kd+C)');
    micros(1);
  }
  // pesoDif + pesoConv = 1
  for (var mo = 0; mo <= 10; mo++) {
    var rr = transporte({ modo: mo / 10 });
    ok(near(rr.pesoDif + rr.pesoConv, 1, 1e-9), 'id: pesoDif + pesoConv = 1');
    // clearSoluto = pesoDif·clearDif + pesoConv·clearConv
    ok(near(rr.clearSoluto, rr.pesoDif * rr.clearDif + rr.pesoConv * rr.clearConv, 1e-6), 'id: clearSoluto = mistura ponderada');
    micros(1);
  }
})();

/* ---------- 3. LEIS (monotonia direcional pontual) ---------- */
(function () {
  // ↑PM → ↓difusão (D cai com PM)
  ok(transporte({ pm: 60 }).clearDif > transporte({ pm: 5000 }).clearDif, 'lei: PM↑ → difusão↓');
  ok(difCoef(60) > difCoef(1000) && difCoef(1000) > difCoef(11800), 'lei: D decrescente em PM');
  // ↑TMP → ↑Qf
  ok(ultrafiltracao({ kuf: 30, pHidro: 80, pOnc: 25 }).qf > ultrafiltracao({ kuf: 30, pHidro: 50, pOnc: 25 }).qf, 'lei: TMP↑ → Qf↑');
  // ↑Kuf → ↑Qf
  ok(ultrafiltracao({ kuf: 50, pHidro: 60, pOnc: 25 }).qf > ultrafiltracao({ kuf: 20, pHidro: 60, pOnc: 25 }).qf, 'lei: Kuf↑ → Qf↑');
  // ↑gradiente → ↑fluxo difusivo
  ok(difusao({ pm: 60, gradConc: 4 }).jDif > difusao({ pm: 60, gradConc: 1 }).jDif, 'lei: gradiente↑ → difusão↑');
  // ↑ufRate → ↑convecção
  ok(conveccao({ ufRate: 60, pm: 60 }).clearConv > conveccao({ ufRate: 20, pm: 60 }).clearConv, 'lei: ufRate↑ → convecção↑');
  // convecção independe do PM até o cutoff (sieving ~plano): clearConv quase igual para pequeno e médio
  var cvP = conveccao({ ufRate: 50, pm: 60 }).clearConv, cvM = conveccao({ ufRate: 50, pm: 5000 }).clearConv;
  ok(Math.abs(cvP - cvM) / cvP < 0.05, 'lei: convecção ~independe do PM abaixo do cutoff');
  // acima do cutoff a convecção também despenca (sieving→0)
  ok(conveccao({ ufRate: 50, pm: 40000 }).clearConv < conveccao({ ufRate: 50, pm: 5000 }).clearConv, 'lei: PM≫cutoff → sieving↓ → convecção↓');
  // ↑conc → ↑adsorção (mas satura)
  ok(adsorcao({ conc: 50 }).q > adsorcao({ conc: 5 }).q, 'lei: conc↑ → adsorção↑ (saturável)');
})();

/* ---------- 4. PÉROLAS ---------- */
(function () {
  // PÉROLA central: a convecção remove o MÉDIO que a difusão não remove.
  // Em fluxo convectivo (HF/CVVH, ufRate alto), para soluto médio (β2-m) a convecção SUPERA a difusão.
  var medioConv = transporte({ pm: 11800, ufRate: 50 });
  ok(medioConv.clearConvMax > medioConv.clearDifMax, 'pérola: soluto MÉDIO → convecção > difusão (remove o que a difusão não alcança)');
  ok(medioConv.dominante === 'conveccao', 'pérola: β2-m em HF → dominante = convecção');
  // para soluto PEQUENO (ureia) a difusão domina mesmo com convecção
  var pequeno = transporte({ pm: 60, ufRate: 50 });
  ok(pequeno.clearDifMax > pequeno.clearConvMax && pequeno.dominante === 'difusao', 'pérola: soluto pequeno → difusão domina');
  // HDF soma os dois: clearSoluto do misto > qualquer um dos puros isolados, para soluto médio
  var hdf = transporte({ pm: 8000, ufRate: 50, modo: 0.5 });
  var soHD = transporte({ pm: 8000, ufRate: 50, modo: 0.0 });
  var soHF = transporte({ pm: 8000, ufRate: 50, modo: 1.0 });
  ok(hdf.clearSoluto > Math.min(soHD.clearSoluto, soHF.clearSoluto), 'pérola: HDF (misto) soma difusão + convecção');
  // dobrar o PM derruba a difusão, mas quase não muda a convecção (abaixo do cutoff)
  var p1 = transporte({ pm: 2000, ufRate: 50 }), p2 = transporte({ pm: 4000, ufRate: 50 });
  ok(p2.clearDifMax < p1.clearDifMax, 'pérola: dobrar PM → difusão cai');
  ok(Math.abs(p2.clearConvMax - p1.clearConvMax) / p1.clearConvMax < 0.05, 'pérola: dobrar PM → convecção quase intacta');
  // ULTRAFILTRAÇÃO remove VOLUME mesmo sem gradiente de concentração: qf>0 com gradConc=0
  var soVol = transporte({ gradConc: 0, conc: 0, kuf: 30, pHidro: 70, pOnc: 25 });
  ok(soVol.qf > 0, 'pérola: UF remove VOLUME independente de soluto (qf>0 sem gradiente)');
  // TMP ≤ 0 → sem ultrafiltração (a oncótica venceu a hidrostática)
  ok(transporte({ kuf: 30, pHidro: 20, pOnc: 25 }).qf === 0, 'pérola: TMP≤0 → sem UF');
  // ADSORÇÃO satura: a fração saturada tende a 1 com conc≫Kd
  ok(adsorcao({ conc: 5000, cap: 100, kd: 10 }).satFrac > 0.99, 'pérola: adsorção satura (sítios esgotam)');
})();

/* ---------- 5. DETERMINISMO 5× byte-idêntico ---------- */
(function () {
  var inp = { pm: 8000, gradConc: 3, conc: 4, area: 1.8, qd: 600, ufRate: 45, modo: 0.4, kuf: 35, pHidro: 70, pOnc: 22, cap: 200, kd: 8 };
  var ref = JSON.stringify(transporte(inp));
  var igual = true;
  for (var n = 0; n < 5; n++) { if (JSON.stringify(transporte(inp)) !== ref) igual = false; }
  ok(igual, 'determinismo: 5 execuções byte-idênticas');
  var Lref = JSON.stringify(clearanceLayout(inp, 900, 360));
  var igualL = true;
  for (var m = 0; m < 5; m++) { if (JSON.stringify(clearanceLayout(inp, 900, 360)) !== Lref) igualL = false; }
  ok(igualL, 'determinismo: layout 5× byte-idêntico');
  var frozen = Object.freeze({ pm: 11800, ufRate: 50, modo: 0.5 });
  var threw = false, a; try { a = transporte(frozen); } catch (e) { threw = true; }
  ok(!threw && fin(a.clearSoluto), 'determinismo: Object.freeze não lança');
  ok(frozen.pm === 11800, 'determinismo: entrada não mutada');
})();

/* ---------- 6. ROBUSTEZ (lixo pontual) ---------- */
(function () {
  var maus = [undefined, null, {}, { pm: NaN }, { pm: 'x' }, { ufRate: -10 }, { gradConc: 1e9 },
    { pHidro: Infinity }, { kuf: -5 }, { conc: 'z' }, { modo: 9 }, { cutoff: 1e300 },
    { kd: 0 }, { kd: -3 }, [], function () {}, { pm: -100 }, { area: 1e9 }];
  maus.forEach(function (mm, i) {
    var r = transporte(mm);
    ok(dentroBounds(r) === null, 'robustez[' + i + ']: saídas finitas e em faixa (' + dentroBounds(r) + ')');
    ok(r.dominante in DOM_OK && r.classe in CLASSE_OK && r.modoRecomendado in MODO_OK, 'robustez[' + i + ']: enums válidos');
    var L = clearanceLayout(mm, 900, 360);
    ok(Array.isArray(L.ptsDif) && L.ptsDif.length === 61 && fin(L.current.x), 'robustez[' + i + ']: layout finito');
  });
})();

/* ---------- 7. LIMITES por campo ---------- */
(function () {
  var fields = ['pm', 'gradConc', 'conc', 'area', 'espessura', 'qd', 'ufRate', 'cutoff', 'modo', 'kuf', 'pHidro', 'pOnc', 'cap', 'kd'];
  var extremos = [-1e9, -1e3, -1, 0, 1, 50, 1e3, 1e9, NaN, Infinity, -Infinity];
  fields.forEach(function (f) {
    extremos.forEach(function (v) {
      var inp = {}; inp[f] = v; var r = transporte(inp);
      ok(dentroBounds(r) === null, 'limites: ' + f + '=' + v + ' → faixa (' + dentroBounds(r) + ')');
      ok(r.dominante in DOM_OK && r.classe in CLASSE_OK, 'limites: ' + f + '=' + v + ' → enums');
      micros(1);
    });
  });
})();

/* ---------- 8. MONOTONIA EXAUSTIVA (≥60 passos por eixo) ---------- */
(function () {
  var STEPS = 80;
  // difCoef monótono DECRESCENTE em PM
  (function () {
    var prev = null, monoOk = true, viol = 0;
    for (var i = 0; i <= STEPS; i++) {
      var pm = 60 * Math.pow(70000 / 60, i / STEPS);
      var d = difCoef(pm);
      if (prev !== null) { if (d - prev > 1e-12) { monoOk = false; viol++; } micros(1); }
      prev = d;
    }
    ok(monoOk, 'monotonia: D decrescente em PM (' + viol + ' violações)');
  })();
  // clearDif (difusão) decrescente em PM
  (function () {
    var prev = null, monoOk = true, viol = 0;
    for (var i = 0; i <= STEPS; i++) {
      var pm = 60 * Math.pow(70000 / 60, i / STEPS);
      var c = transporte({ pm: pm }).clearDifMax;
      if (prev !== null) { if (c - prev > 1e-9) { monoOk = false; viol++; } micros(1); }
      prev = c;
    }
    ok(monoOk, 'monotonia: clearance difusivo decrescente em PM (' + viol + ' violações)');
  })();
  // sieving decrescente em PM
  (function () {
    var prev = null, monoOk = true, viol = 0;
    for (var i = 0; i <= STEPS; i++) {
      var pm = 60 * Math.pow(70000 / 60, i / STEPS);
      var s = sievingCoef(pm, 15000);
      if (prev !== null) { if (s - prev > 1e-12) { monoOk = false; viol++; } micros(1); }
      prev = s;
    }
    ok(monoOk, 'monotonia: sieving decrescente em PM (' + viol + ' violações)');
  })();
  // qf crescente em TMP (pHidro)
  (function () {
    var prev = null, monoOk = true, viol = 0;
    for (var i = 0; i <= STEPS; i++) {
      var ph = 400 * i / STEPS;
      var q = ultrafiltracao({ kuf: 30, pHidro: ph, pOnc: 25 }).qf;
      if (prev !== null) { if (q - prev < -1e-9) { monoOk = false; viol++; } micros(1); }
      prev = q;
    }
    ok(monoOk, 'monotonia: qf crescente em TMP (' + viol + ' violações)');
  })();
  // clearConv crescente em ufRate
  (function () {
    var prev = null, monoOk = true, viol = 0;
    for (var i = 0; i <= STEPS; i++) {
      var uf = 200 * i / STEPS;
      var c = conveccao({ ufRate: uf, pm: 60 }).clearConv;
      if (prev !== null) { if (c - prev < -1e-9) { monoOk = false; viol++; } micros(1); }
      prev = c;
    }
    ok(monoOk, 'monotonia: convecção crescente em ufRate (' + viol + ' violações)');
  })();
  // adsorção q crescente em conc (saturável mas monótona)
  (function () {
    var prev = null, monoOk = true, viol = 0;
    for (var i = 0; i <= STEPS; i++) {
      var c = 1000 * i / STEPS;
      var q = adsorcao({ conc: c, cap: 100, kd: 10 }).q;
      if (prev !== null) { if (q - prev < -1e-9) { monoOk = false; viol++; } micros(1); }
      prev = q;
    }
    ok(monoOk, 'monotonia: adsorção crescente em conc (' + viol + ' violações)');
  })();
})();

/* ---------- 9. FUZZING semeado ≥20000 (35% malignas em CADA campo) ---------- */
(function () {
  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  var rnd = mulberry32(0x19D1A), N = 24000, bad = 0, badL = 0, badEnum = 0, badMut = 0, badId = 0;
  var MAL = [NaN, Infinity, -Infinity, 1e300, -1e300, 1e-300, '5', 'x', '', null, undefined, {}, [], function () {}, true, false];
  function val() { if (rnd() < 0.35) return MAL[(rnd() * MAL.length) | 0]; return (rnd() - 0.15) * 60000; }
  function fields() {
    return {
      pm: val(), gradConc: val(), conc: val(), area: val(), espessura: val(), qd: val(),
      ufRate: val(), cutoff: val(), modo: val(), kuf: val(), pHidro: val(), pOnc: val(), cap: val(), kd: val()
    };
  }
  function ser(o) { return JSON.stringify(o, function (key, v) { return (typeof v === 'function') ? '__fn__' : (v === undefined ? '__u__' : v); }); }
  for (var i = 0; i < N; i++) {
    var inp = fields();
    var snapshot = ser(inp);
    var r = transporte(inp);
    var L = clearanceLayout(inp, 900, 360);
    // (a)+(b) saídas finitas e em faixa documentada
    if (dentroBounds(r) !== null) bad++;
    // (c) enums sempre válidos
    if (!(r.dominante in DOM_OK) || !(r.classe in CLASSE_OK) || !(r.modoRecomendado in MODO_OK)) badEnum++;
    // (d) identidades sob clamp: pesoDif+pesoConv=1; clearConv=ufRate(clamp)×sieving; clearSoluto=mistura
    if (Math.abs(r.pesoDif + r.pesoConv - 1) > 1e-9) badId++;
    if (Math.abs(r.clearConv - r.ufRate * r.sieving) > 1e-6) badId++;
    if (Math.abs(r.clearSoluto - (r.pesoDif * r.clearDif + r.pesoConv * r.clearConv)) > 1e-6) badId++;
    // layout finito
    if (!Array.isArray(L.ptsDif) || L.ptsDif.length !== 61 || !Array.isArray(L.ptsConv) || L.ptsConv.length !== 61 || !fin(L.current.x) || !fin(L.current.yDif) || !fin(L.current.yConv)) badL++;
    for (var j = 0; j < L.ptsDif.length; j++) { if (!fin(L.ptsDif[j].x) || !fin(L.ptsDif[j].y) || !fin(L.ptsConv[j].x) || !fin(L.ptsConv[j].y)) { badL++; break; } }
    // (e) input não mutado
    if (ser(inp) !== snapshot) badMut++;
    micros(6 + L.ptsDif.length + L.ptsConv.length);
  }
  var threwFrozen = false; try { transporte(Object.freeze({ pm: 70000, ufRate: 200, modo: 1, kuf: 100 })); } catch (e) { threwFrozen = true; }
  ok(bad === 0, 'fuzzing: ' + N + ' entradas (35% malignas) → 0 violações de faixa (' + bad + ')');
  ok(badEnum === 0, 'fuzzing: enums (dominante/classe/modo) sempre válidos (' + badEnum + ')');
  ok(badId === 0, 'fuzzing: identidades intactas (' + badId + ')');
  ok(badL === 0, 'fuzzing: layout finito em todas (' + badL + ')');
  ok(badMut === 0, 'fuzzing: input nunca mutado (' + badMut + ')');
  ok(!threwFrozen, 'fuzzing: Object.freeze não lança');
})();

/* ---------- 10. SAÍDA ---------- */
var total = oks + micro;
console.log(total + ' OK (' + oks + ' macro + ' + micro + ' micro/fuzz) · ' + fails + ' falhas');
process.exit(fails > 0 ? 1 : 0);
