/* =========================================================================
 * FILTRA · M27 — bateria de robustez do engine (0 falhas ou não entra)
 * 1 BASE · 2 IDENTIDADES · 3 LEIS · 4 PÉROLAS · 5 DETERMINISMO 5× · 6 ROBUSTEZ ·
 * 7 LIMITES · 8 MONOTONIA EXAUSTIVA · 9 FUZZING ≥22000 (35% malignas) · 10 SAÍDA
 * (robustez REFORÇADA: fuzz ≥22000, ~35% malignas em CADA campo, monotonia ≥60 passos/eixo)
 * ========================================================================= */
var M = require('./model27.js');
var trrc = M.trrc, clearanceLayout = M.clearanceLayout;
var cvvh = M.cvvh, cvvhd = M.cvvhd, cvvhdf = M.cvvhdf, fracPlasma = M.fracPlasma;
var INTERACAO = M.INTERACAO, CL_HDI = M.CL_HDI;

var oks = 0, fails = 0, micro = 0;
function ok(c, m) { if (c) oks++; else { fails++; console.log('  FALHA: ' + m); } }
function micros(n) { micro += n; }
function near(a, b, t) { return Math.abs(a - b) <= (t || 1e-7); }
function fin(x) { return typeof x === 'number' && isFinite(x); }
var MODO_OK = { CVVH: 1, CVVHD: 1, CVVHDF: 1 };

/* faixas documentadas por campo de saída numérica [min,max] */
var BOUNDS = {
  qb: [50, 350], qd: [0, 80], qf: [0, 80], preFrac: [0, 1], sieving: [0, 1], koa: [50, 1200], hct: [0.10, 0.65],
  pesoKg: [30, 200], ufLiquida: [0, 600], refilling: [50, 800],
  qPlasma: [0, 350], clDif: [0, 80], clConv: [0, 80], clearanceBruto: [0, 160], clearanceTotal: [0, 120],
  efluenteMin: [0, 160], efluenteMlH: [0, 9600], doseEfluente: [0, 60],
  volDepuradoTRRC: [0, 172800], volDepuradoHDI: [0, 1e9],
  razaoEficienciaHora: [0, 1], razaoDose24h: [0, 5],
  margemRefilling: [-600, 800], fracaoFiltracao: [0, 1]
};
function dentroBounds(r) {
  for (var key in BOUNDS) { var b = BOUNDS[key]; if (!fin(r[key]) || r[key] < b[0] - 1e-9 || r[key] > b[1] + 1e-9) return key; }
  return null;
}

/* ---------- 1. LINHA DE BASE ---------- */
(function () {
  var r = trrc({});
  ok(r.modo in MODO_OK, 'base: modo é enum válido (' + r.modo + ')');
  ok(r.modo === 'CVVHDF', 'base: modo default é CVVHDF');
  ok(dentroBounds(r) === null, 'base: todas as saídas em faixa (' + dentroBounds(r) + ')');
  ok(r.clearanceTotal > 10 && r.clearanceTotal < 80, 'base: clearance contínuo fisiológico (~25–60 mL/min) = ' + r.clearanceTotal.toFixed(1));
  ok(r.doseEfluente > 15 && r.doseEfluente < 60, 'base: dose de efluente fisiológica (mL/kg/h) = ' + r.doseEfluente.toFixed(1));
  ok(r.eficienciaHoraBaixa, 'base: eficiência/hora baixa vs HDI (pérola do contínuo)');
  ok(r.toleraVolume, 'base: UF default < refilling → tolera volume');
})();

/* ---------- 2. IDENTIDADES ---------- */
(function () {
  // CVVH: clearance = qf × sieving × fatorPre. Sem pré-diluição, clearance = qf×sieving.
  for (var i = 0; i < 40; i++) {
    var qf = i, c = cvvh({ qf: qf, sieving: 1, preFrac: 0, qPlasma: 120 });
    ok(near(c, qf * 1, 1e-9), 'id: CVVH sem pré → clearance = qf×sieving');
  }
  // CVVHD: clearance ≤ Qd (saturação ≤ 1)
  for (var j = 0; j < 40; j++) {
    var qd = j, cd = cvvhd({ qd: qd, koa: 600, sieving: 1 });
    ok(cd <= qd + 1e-9, 'id: CVVHD → clearance ≤ Qd (satura)');
  }
  // CVVHDF ≥ max(componentes) — a soma com desconto ainda ≥ cada parte isolada? NÃO necessariamente;
  // exigimos clearanceTotal ≥ max(clConv, clDif)·(algo). Em vez disso: CVVHDF bruto = clConv+clDif.
  for (var k = 0; k < 30; k++) {
    var st = { modo: 'CVVHDF', qd: 10 + k, qf: 10 + k, koa: 600, preFrac: 0, hct: 0.30, qb: 150 };
    var r = trrc(st);
    ok(near(r.clearanceBruto, r.clConv + r.clDif, 1e-9), 'id: CVVHDF bruto = clConv + clDif');
    ok(near(r.clearanceTotal, r.clearanceBruto * (1 - INTERACAO), 1e-9), 'id: CVVHDF total = bruto·(1−interação)');
    ok(r.clearanceTotal >= Math.max(r.clConv, r.clDif) - 1e-9 || r.clConv === 0 || r.clDif === 0,
      'id: CVVHDF total ≥ max(componente) (com ambos > 0)');
  }
  // efluente: CVVHDF efluenteMin = qd + qf
  var re = trrc({ modo: 'CVVHDF', qd: 20, qf: 18 });
  ok(near(re.efluenteMin, 20 + 18, 1e-9), 'id: CVVHDF efluente = qd + qf');
  ok(near(re.efluenteMlH, re.efluenteMin * 60, 1e-9), 'id: efluente mL/h = efluenteMin×60');
  ok(near(re.doseEfluente, re.efluenteMlH / re.pesoKg, 1e-9), 'id: dose = efluente mL/h ÷ peso');
  // qPlasma = qb·(1−hct)
  var rp = trrc({ qb: 200, hct: 0.40 });
  ok(near(rp.qPlasma, 200 * (1 - 0.40), 1e-9), 'id: qPlasma = qb·(1−hct)');
  // razaoEficienciaHora = clearanceTotal / CL_HDI (clamp 0..1)
  var rr = trrc({ modo: 'CVVHDF', qd: 25, qf: 25 });
  ok(near(rr.razaoEficienciaHora, Math.min(rr.clearanceTotal / CL_HDI, 1), 1e-9), 'id: razão eficiência/hora = clearance/CL_HDI');
})();

/* ---------- 3. LEIS (monotonia direcional pontual) ---------- */
(function () {
  // ↑Qf → ↑clearance convectivo (CVVH)
  ok(cvvh({ qf: 40, preFrac: 0 }) > cvvh({ qf: 10, preFrac: 0 }), 'lei: ↑Qf → ↑clearance convectivo');
  // ↑Qd → ↑clearance difusivo (CVVHD)
  ok(cvvhd({ qd: 40 }) > cvvhd({ qd: 10 }), 'lei: ↑Qd → ↑clearance difusivo');
  // pré-diluição dilui → ↓clearance efetivo (CVVH com pré vs sem pré, mesmo qf)
  ok(cvvh({ qf: 40, preFrac: 0.6, qPlasma: 100 }) < cvvh({ qf: 40, preFrac: 0, qPlasma: 100 }), 'lei: pré-diluição → ↓clearance efetivo');
  // ↑KoA → ↑clearance difusivo (membrana melhor aproxima mais da saturação)
  ok(cvvhd({ qd: 30, koa: 1000 }) >= cvvhd({ qd: 30, koa: 200 }) - 1e-9, 'lei: ↑KoA → clearance difusivo ↑');
  // CVVHDF > CVVHD e > CVVH no mesmo fluxo (soma, mesmo com desconto, se ambos > 0)
  var hdf = trrc({ modo: 'CVVHDF', qd: 25, qf: 25, preFrac: 0 });
  var hd = trrc({ modo: 'CVVHD', qd: 25 });
  var h = trrc({ modo: 'CVVH', qf: 25, preFrac: 0 });
  ok(hdf.clearanceTotal > hd.clearanceTotal && hdf.clearanceTotal > h.clearanceTotal, 'lei: CVVHDF > componentes isolados');
  // ↑ufLiquida acima do refilling → não tolera
  ok(trrc({ ufLiquida: 500, refilling: 400 }).ufExcedeRefilling, 'lei: UF > refilling → excede');
  ok(!trrc({ ufLiquida: 200, refilling: 400 }).ufExcedeRefilling, 'lei: UF < refilling → tolera');
  // ↑hct → ↓qPlasma → ↓clearance convectivo (menos plasma carrega o soluto via fatorPre com pré)
  ok(trrc({ modo: 'CVVH', qf: 40, preFrac: 0.5, hct: 0.55, qb: 150 }).clConv <
     trrc({ modo: 'CVVH', qf: 40, preFrac: 0.5, hct: 0.15, qb: 150 }).clConv, 'lei: ↑hct → ↓qPlasma → ↓clearance convectivo (com pré)');
})();

/* ---------- 4. PÉROLAS ---------- */
(function () {
  // PÉROLA: contínuo = eficiência/hora baixa MAS dose/24 h adequada.
  var r = trrc({ modo: 'CVVHDF', qd: 25, qf: 25, pesoKg: 70 });
  ok(r.eficienciaHoraBaixa, 'pérola: clearance/hora baixo vs HDI (<40%)');
  ok(r.razaoEficienciaHora < 0.4, 'pérola: razão eficiência/hora < 0,4 (TRRC é lenta por hora)');
  ok(r.doseAdequada24h, 'pérola: dose/24 h adequada (≥0,9× a HDI) apesar do clearance/hora baixo');
  // PÉROLA: o instável TOLERA porque a UF é lenta (UF < refilling)
  var inst = trrc({ ufLiquida: 150, refilling: 400 });
  ok(inst.toleraVolume && inst.margemRefilling > 0, 'pérola: instável tolera — UF lenta < refilling (margem > 0)');
  // PÉROLA: pós-diluição mais eficiente mas coagula mais (FF alta, sem pré)
  var pos = trrc({ modo: 'CVVH', qf: 45, preFrac: 0, hct: 0.30, qb: 120 });
  var pre = trrc({ modo: 'CVVH', qf: 45, preFrac: 0.5, hct: 0.30, qb: 120 });
  ok(pos.clConv > pre.clConv, 'pérola: pós-diluição mais eficiente que pré (não dilui o plasma)');
  ok(pos.coagulaMais && !pre.coagulaMais, 'pérola: pós-diluição com FF alta coagula mais; pré protege');
  ok(pre.preProtege, 'pérola: pré-diluição protege a membrana');
  // PÉROLA: CVVHD satura → clearance ≈ Qd (não excede Qd)
  var sat = cvvhd({ qd: 30, koa: 1200 });
  ok(sat <= 30 + 1e-9 && sat > 0.8 * 30, 'pérola: CVVHD satura → clearance ≈ Qd (≤ Qd, perto dele)');
})();

/* ---------- 5. DETERMINISMO 5× byte-idêntico ---------- */
(function () {
  var inp = { modo: 'CVVHDF', qb: 180, qd: 30, qf: 28, preFrac: 0.4, koa: 700, hct: 0.32, pesoKg: 82, ufLiquida: 180, refilling: 450 };
  var ref = JSON.stringify(trrc(inp));
  var igual = true;
  for (var n = 0; n < 5; n++) { if (JSON.stringify(trrc(inp)) !== ref) igual = false; }
  ok(igual, 'determinismo: 5 execuções byte-idênticas');
  var Lref = JSON.stringify(clearanceLayout(inp, 900, 360));
  var igualL = true;
  for (var m = 0; m < 5; m++) { if (JSON.stringify(clearanceLayout(inp, 900, 360)) !== Lref) igualL = false; }
  ok(igualL, 'determinismo: layout 5× byte-idêntico');
  var frozen = Object.freeze({ modo: 'CVVH', qf: 30, preFrac: 0.3 });
  var threw = false, a; try { a = trrc(frozen); } catch (e) { threw = true; }
  ok(!threw && fin(a.clearanceTotal), 'determinismo: Object.freeze não lança');
  ok(frozen.qf === 30, 'determinismo: entrada não mutada');
})();

/* ---------- 6. ROBUSTEZ (lixo pontual) ---------- */
(function () {
  var maus = [undefined, null, {}, { qf: NaN }, { qd: 'x' }, { qb: -10 }, { koa: 1e9 },
    { hct: Infinity }, { preFrac: -5 }, { pesoKg: 'z' }, { sieving: 1e300 }, { modo: 'XYZ' },
    { ufLiquida: NaN }, [], function () {}, { refilling: 'a' }, { qf: -1e9, qd: 1e9 }];
  maus.forEach(function (mm, i) {
    var r = trrc(mm);
    ok(dentroBounds(r) === null, 'robustez[' + i + ']: saídas finitas e em faixa (' + dentroBounds(r) + ')');
    ok(r.modo in MODO_OK, 'robustez[' + i + ']: modo válido');
    var L = clearanceLayout(mm, 900, 360);
    ok(Array.isArray(L.pts) && L.pts.length === 61 && fin(L.current.x) && fin(L.current.y), 'robustez[' + i + ']: layout finito');
  });
})();

/* ---------- 7. LIMITES por campo ---------- */
(function () {
  var fields = ['qb', 'qd', 'qf', 'preFrac', 'sieving', 'koa', 'hct', 'pesoKg', 'ufLiquida', 'refilling'];
  var extremos = [-1e9, -1e3, -1, 0, 1, 50, 1e3, 1e9, NaN, Infinity, -Infinity];
  var modos = ['CVVH', 'CVVHD', 'CVVHDF', 'lixo'];
  fields.forEach(function (f) {
    extremos.forEach(function (v) {
      modos.forEach(function (md) {
        var inp = { modo: md }; inp[f] = v; var r = trrc(inp);
        ok(dentroBounds(r) === null, 'limites: ' + md + ' ' + f + '=' + v + ' → saídas em faixa (' + dentroBounds(r) + ')');
        ok(r.modo in MODO_OK, 'limites: ' + md + ' ' + f + '=' + v + ' → modo válido');
        micros(1);
      });
    });
  });
})();

/* ---------- 8. MONOTONIA EXAUSTIVA (≥60 passos por eixo, cada par adjacente) ---------- */
(function () {
  var STEPS = 70;
  // Qf↑ → clearance convectivo (CVVH) não-decrescente
  (function () {
    var prev = null, monoOk = true, viol = 0;
    for (var i = 0; i <= STEPS; i++) {
      var qf = 60 * i / STEPS;
      var c = trrc({ modo: 'CVVH', qf: qf, preFrac: 0.3, qb: 150, hct: 0.30 }).clearanceTotal;
      if (prev !== null) { if (c - prev < -1e-9) { monoOk = false; viol++; } micros(1); }
      prev = c;
    }
    ok(monoOk, 'monotonia: Qf↑ → clearance convectivo↑ (' + viol + ' violações)');
  })();
  // Qd↑ → clearance difusivo (CVVHD) não-decrescente
  (function () {
    var prev = null, monoOk = true, viol = 0;
    for (var i = 0; i <= STEPS; i++) {
      var qd = 60 * i / STEPS;
      var c = trrc({ modo: 'CVVHD', qd: qd, koa: 600 }).clearanceTotal;
      if (prev !== null) { if (c - prev < -1e-9) { monoOk = false; viol++; } micros(1); }
      prev = c;
    }
    ok(monoOk, 'monotonia: Qd↑ → clearance difusivo↑ (' + viol + ' violações)');
  })();
  // preFrac↑ → clearance convectivo NÃO-CRESCENTE (dilui)
  (function () {
    var prev = null, monoOk = true, viol = 0;
    for (var i = 0; i <= STEPS; i++) {
      var pf = i / STEPS;
      var c = cvvh({ qf: 45, preFrac: pf, qPlasma: 100, sieving: 1 });
      if (prev !== null) { if (c - prev > 1e-9) { monoOk = false; viol++; } micros(1); }
      prev = c;
    }
    ok(monoOk, 'monotonia: pré-diluição↑ → clearance efetivo↓ (' + viol + ' violações)');
  })();
  // KoA↑ → clearance difusivo não-decrescente
  (function () {
    var prev = null, monoOk = true, viol = 0;
    for (var i = 0; i <= STEPS; i++) {
      var koa = 50 + 1150 * i / STEPS;
      var c = cvvhd({ qd: 30, koa: koa, sieving: 1 });
      if (prev !== null) { if (c - prev < -1e-9) { monoOk = false; viol++; } micros(1); }
      prev = c;
    }
    ok(monoOk, 'monotonia: KoA↑ → clearance difusivo↑ (' + viol + ' violações)');
  })();
  // ufLiquida↑ → margemRefilling não-crescente
  (function () {
    var prev = null, monoOk = true, viol = 0;
    for (var i = 0; i <= STEPS; i++) {
      var uf = 600 * i / STEPS;
      var mr = trrc({ ufLiquida: uf, refilling: 400 }).margemRefilling;
      if (prev !== null) { if (mr - prev > 1e-9) { monoOk = false; viol++; } micros(1); }
      prev = mr;
    }
    ok(monoOk, 'monotonia: ufLiquida↑ → margem de refilling↓ (' + viol + ' violações)');
  })();
  // hct↑ → qPlasma não-crescente
  (function () {
    var prev = null, monoOk = true, viol = 0;
    for (var i = 0; i <= STEPS; i++) {
      var hct = 0.10 + 0.55 * i / STEPS;
      var qp = trrc({ qb: 200, hct: hct }).qPlasma;
      if (prev !== null) { if (qp - prev > 1e-9) { monoOk = false; viol++; } micros(1); }
      prev = qp;
    }
    ok(monoOk, 'monotonia: hct↑ → qPlasma↓ (' + viol + ' violações)');
  })();
  // layout clearance não-decrescente ao varrer o fluxo (convectivo, sem pré)
  (function () {
    var L = clearanceLayout({ modo: 'CVVH', preFrac: 0, qb: 150, hct: 0.30 }, 900, 360);
    var prev = null, monoOk = true, viol = 0;
    for (var i = 0; i < L.pts.length; i++) {
      var c = L.pts[i].clearance;
      if (prev !== null) { if (c - prev < -1e-9) { monoOk = false; viol++; } micros(1); }
      prev = c;
    }
    ok(monoOk, 'monotonia: layout — clearance↑ com o fluxo (' + viol + ' violações)');
  })();
})();

/* ---------- 9. FUZZING semeado ≥22000 (~35% malignas em CADA campo) ---------- */
(function () {
  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  var rnd = mulberry32(0x27C0DE), N = 22000, bad = 0, badL = 0, badEnum = 0, badMut = 0, badId = 0;
  var MAL = [NaN, Infinity, -Infinity, 1e300, -1e300, 1e-300, '5', 'x', '', null, undefined, {}, [], function () {}, true, false];
  var MODOS = ['CVVH', 'CVVHD', 'CVVHDF', 'lixo', undefined, 42];
  function val() { if (rnd() < 0.35) return MAL[(rnd() * MAL.length) | 0]; return (rnd() - 0.2) * 400; }
  function fields() {
    return {
      modo: MODOS[(rnd() * MODOS.length) | 0],
      qb: val(), qd: val(), qf: val(), preFrac: val(), sieving: val(), koa: val(), hct: val(),
      pesoKg: val(), ufLiquida: val(), refilling: val()
    };
  }
  function ser(o) { return JSON.stringify(o, function (key, v) { return (typeof v === 'function') ? '__fn__' : (v === undefined ? '__u__' : v); }); }
  for (var i = 0; i < N; i++) {
    var inp = fields();
    var snapshot = ser(inp);
    var r = trrc(inp);
    var L = clearanceLayout(inp, 900, 360);
    // (a)+(b) saídas finitas e em faixa documentada
    if (dentroBounds(r) !== null) bad++;
    // (c) enums sempre válidos
    if (!(r.modo in MODO_OK)) badEnum++;
    // (d) identidades: qPlasma = qb·(1−hct); efluenteMlH = efluenteMin×60; dose = efluenteMlH/peso;
    //     clearanceTotal ≤ clearanceBruto (interação só reduz)
    if (Math.abs(r.qPlasma - r.qb * (1 - r.hct)) > 1e-6) badId++;
    if (Math.abs(r.efluenteMlH - r.efluenteMin * 60) > 1e-6) badId++;
    if (Math.abs(r.doseEfluente - Math.min(r.efluenteMlH / r.pesoKg, 60)) > 1e-6 && r.efluenteMlH / r.pesoKg < 60) badId++;
    if (r.clearanceTotal > r.clearanceBruto + 1e-6) badId++;
    // layout finito
    if (!Array.isArray(L.pts) || L.pts.length !== 61 || !fin(L.current.x) || !fin(L.current.y)) badL++;
    for (var j = 0; j < L.pts.length; j++) { if (!fin(L.pts[j].x) || !fin(L.pts[j].y) || !fin(L.pts[j].clearance)) { badL++; break; } }
    // (e) input não mutado
    if (ser(inp) !== snapshot) badMut++;
    micros(7 + L.pts.length);
  }
  var threwFrozen = false; try { trrc(Object.freeze({ modo: 'CVVHDF', qf: 80, qd: 80, koa: 1200 })); } catch (e) { threwFrozen = true; }
  ok(bad === 0, 'fuzzing: ' + N + ' entradas (35% malignas) → 0 violações de faixa (' + bad + ')');
  ok(badEnum === 0, 'fuzzing: enum modo sempre válido (' + badEnum + ')');
  ok(badId === 0, 'fuzzing: identidades intactas (' + badId + ')');
  ok(badL === 0, 'fuzzing: layout finito em todas (' + badL + ')');
  ok(badMut === 0, 'fuzzing: input nunca mutado (' + badMut + ')');
  ok(!threwFrozen, 'fuzzing: Object.freeze não lança');
})();

/* ---------- 10. SAÍDA ---------- */
var total = oks + micro;
console.log(total + ' OK (' + oks + ' macro + ' + micro + ' micro/fuzz) · ' + fails + ' falhas');
process.exit(fails > 0 ? 1 : 0);
