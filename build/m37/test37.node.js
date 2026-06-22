/* =========================================================================
 * FILTRA · M37 — bateria de robustez do engine (0 falhas ou não entra)
 * 1 BASE · 2 IDENTIDADES · 3 LEIS · 4 PÉROLAS · 5 DETERMINISMO 5× · 6 ROBUSTEZ ·
 * 7 LIMITES · 8 MONOTONIA EXAUSTIVA · 9 FUZZING ≥22000 (~35% malignas) · 10 SAÍDA
 * (robustez REFORÇADA: fuzz ≥22000, ~35% malignas em CADA campo, monotonia ≥60 passos/eixo)
 * ========================================================================= */
var M = require('./model37.js');
var cardiorrenal = M.cardiorrenal, congestaoLayout = M.congestaoLayout;
var perfusaoRenal = M.perfusaoRenal, tfgDePerfusao = M.tfgDePerfusao;
var respostaDiuretico = M.respostaDiuretico, ultrafiltracaoMecanica = M.ultrafiltracaoMecanica;

var oks = 0, fails = 0, micro = 0;
function ok(c, m) { if (c) oks++; else { fails++; console.log('  FALHA: ' + m); } }
function micros(n) { micro += n; }
function near(a, b, t) { return Math.abs(a - b) <= (t || 1e-7); }
function fin(x) { return typeof x === 'number' && isFinite(x); }
var COND_OK = { diuretico: 1, UF: 1 };

/* faixas documentadas por campo de saída numérica [min,max] */
var BOUNDS = {
  dc: [1, 10], pvc: [0, 30], pam: [40, 130], doseDiuretico: [0, 8], resistencia: [0, 1],
  volume: [0, 20], refilling: [50, 400], ufRate: [0, 400],
  perfPressao: [-130, 130], perfEfetiva: [0, 200], tfg: [0, 120],
  natriurese: [0, 1], ec50: [1, 4], emax: [0.35, 1], entregaFrac: [0.15, 1.2],
  debitoDiuretico: [0, 500], ufEfetiva: [0, 400],
  remocaoMlh: [0, 500], pvcAlvo: [2, 30], tfgPos: [0, 120], ganhoTFG: [0, 120],
  perdaPorCongestao: [0, 120], perdaPorDC: [0, 120],
  volRemovido24h: [0, 20], volResidual: [0, 20]
};
function dentroBounds(r) {
  for (var key in BOUNDS) { var b = BOUNDS[key]; if (!fin(r[key]) || r[key] < b[0] - 1e-9 || r[key] > b[1] + 1e-9) return key; }
  return null;
}

/* ---------- 1. LINHA DE BASE ---------- */
(function () {
  var r = cardiorrenal({});
  ok(r.conduta in COND_OK, 'base: conduta é enum válido (' + r.conduta + ')');
  ok(r.tfg > 60 && r.tfg <= 120, 'base: euvolemia/perfusão boa → TFG > 60 (' + r.tfg.toFixed(1) + ')');
  ok(r.conduta === 'diuretico', 'base: dose baixa não refratária → 1ª linha diurético');
  ok(dentroBounds(r) === null, 'base: todas as saídas em faixa');
  // perfusão renal efetiva ≈ função de PAM − PVC
  var p = perfusaoRenal({ dc: 5, pvc: 6, pam: 80 });
  ok(near(p.perfPressao, 80 - 6, 1e-9), 'base: perfPressao = PAM − PVC');
  ok(r.descongestionado === false || r.descongestionado === true, 'base: descongestionado é booleano');
})();

/* ---------- 2. IDENTIDADES ---------- */
(function () {
  for (var i = 0; i < 40; i++) {
    var pvc = i * 0.6, pam = 60 + i, r = cardiorrenal({ pvc: pvc, pam: pam, dc: 5 });
    ok(near(r.perfPressao, perfusaoRenal({ dc: 5, pvc: pvc, pam: pam }).perfPressao, 1e-9), 'id: perfPressao = PAM − PVC');
    ok(r.conduta in COND_OK, 'id: conduta enum');
    ok(dentroBounds(r) === null, 'id: saídas em faixa');
  }
  // TFG do engine = tfgDePerfusao(perfEfetiva)
  for (var j = 0; j < 30; j++) {
    var dc = 1 + j * 0.3, rj = cardiorrenal({ dc: dc, pvc: 10, pam: 75 });
    ok(near(rj.tfg, tfgDePerfusao(rj.perfEfetiva), 1e-9), 'id: tfg = tfgDePerfusao(perfEfetiva)');
  }
  // natriurese do engine = respostaDiuretico(...).natriurese com a mesma perfusão
  var re = cardiorrenal({ dc: 4, pvc: 12, pam: 72, doseDiuretico: 2, resistencia: 0.4 });
  var dn = respostaDiuretico({ doseDiuretico: 2, perfusao: re.perfEfetiva, resistencia: 0.4 }).natriurese;
  ok(near(re.natriurese, dn, 1e-9), 'id: natriurese consistente com respostaDiuretico()');
  // UF mecânica: ufEfetiva = min(ufRate, refilling)
  var ru = ultrafiltracaoMecanica({ ufRate: 350, refilling: 250 });
  ok(near(ru.ufEfetiva, 250, 1e-9) && ru.ufSegura === false, 'id: ufEfetiva = min(uf,refilling); UF>refilling não-segura');
  var rs = ultrafiltracaoMecanica({ ufRate: 200, refilling: 300 });
  ok(near(rs.ufEfetiva, 200, 1e-9) && rs.ufSegura === true, 'id: UF<refilling → segura, ufEfetiva = uf');
})();

/* ---------- 3. LEIS (monotonia direcional pontual) ---------- */
(function () {
  // PVC↑ → TFG↓ (congestão venosa derruba a TFG)
  ok(cardiorrenal({ pvc: 22, dc: 5, pam: 80 }).tfg < cardiorrenal({ pvc: 4, dc: 5, pam: 80 }).tfg, 'lei: PVC↑ → TFG↓ (congestão)');
  // DC↑ → TFG↑ (perfusão anterógrada)
  ok(cardiorrenal({ dc: 7, pvc: 10, pam: 75 }).tfg > cardiorrenal({ dc: 2.5, pvc: 10, pam: 75 }).tfg, 'lei: DC↑ → TFG↑');
  // PAM↑ → TFG↑ (mais pressão de empurro)
  ok(cardiorrenal({ pam: 100, pvc: 10, dc: 5 }).tfg > cardiorrenal({ pam: 55, pvc: 10, dc: 5 }).tfg, 'lei: PAM↑ → TFG↑');
  // resistência↑ → resposta diurética↓ (curva deslocada à direita)
  ok(cardiorrenal({ resistencia: 0.9, doseDiuretico: 2 }).natriurese < cardiorrenal({ resistencia: 0.05, doseDiuretico: 2 }).natriurese, 'lei: resistência↑ → natriurese↓');
  // EC50 sobe com a resistência (deslocamento à direita)
  ok(respostaDiuretico({ resistencia: 0.9 }).ec50 > respostaDiuretico({ resistencia: 0.1 }).ec50, 'lei: resistência↑ → EC50↑ (curva à direita)');
  // dose↑ → natriurese↑ (até o teto)
  ok(respostaDiuretico({ doseDiuretico: 4, resistencia: 0.3 }).natriurese > respostaDiuretico({ doseDiuretico: 0.5, resistencia: 0.3 }).natriurese, 'lei: dose↑ → natriurese↑');
  // UF mecânica INDEPENDE da resistência tubular (mesma ufEfetiva com resistência alta ou baixa)
  var ua = cardiorrenal({ resistencia: 0.95, volume: 8, ufRate: 280, refilling: 320 });
  var ub = cardiorrenal({ resistencia: 0.75, volume: 8, ufRate: 280, refilling: 320 });
  ok(ua.conduta === 'UF' && ub.conduta === 'UF' && near(ua.ufEfetiva, ub.ufEfetiva, 1e-9), 'lei: UF mecânica independe da resistência tubular');
  // refilling↑ → ufEfetiva pode subir (mais espaço de UF segura)
  ok(ultrafiltracaoMecanica({ ufRate: 380, refilling: 380 }).ufEfetiva >= ultrafiltracaoMecanica({ ufRate: 380, refilling: 200 }).ufEfetiva, 'lei: refilling↑ → UF efetiva segura ≥');
})();

/* ---------- 4. PÉROLAS ---------- */
(function () {
  // PÉROLA 1: a CONGESTÃO VENOSA (não só o DC baixo) derruba a TFG; descongestionar melhora o rim.
  var congesto = cardiorrenal({ dc: 5, pvc: 24, pam: 80 });   // DC normal, PVC altíssima
  ok(congesto.perdaPorCongestao > 0 && congesto.congestaoDomina, 'pérola1: PVC alta com DC normal → congestão DOMINA a queda da TFG');
  // descongestionar (baixar a PVC) melhora a TFG
  var antes = cardiorrenal({ dc: 4, pvc: 20, pam: 75, doseDiuretico: 1.5 });
  ok(antes.tfgPos >= antes.tfg && antes.ganhoTFG >= 0, 'pérola1: descongestionar (PVC↓) prevê TFG↑ (ganhoTFG ≥ 0)');
  // a TFG melhora mais baixando a PVC do que seria a mesma perfusão com PVC alta
  var altaPVC = cardiorrenal({ dc: 5, pvc: 22, pam: 80 }).tfg;
  var baixaPVC = cardiorrenal({ dc: 5, pvc: 4, pam: 80 }).tfg;
  ok(baixaPVC > altaPVC, 'pérola1: mesma PAM/DC, só baixar a PVC sobe a TFG');

  // PÉROLA 2: a RESISTÊNCIA ao diurético desloca a curva dose-resposta à direita.
  var semR = respostaDiuretico({ doseDiuretico: 1, perfusao: 75, resistencia: 0 });
  var comR = respostaDiuretico({ doseDiuretico: 1, perfusao: 75, resistencia: 0.8 });
  ok(comR.ec50 > semR.ec50 && comR.natriurese < semR.natriurese, 'pérola2: resistência → EC50↑ e natriurese↓ (curva à direita)');
  // dobrar a dose no resistente recupera menos que no não-resistente (teto + braking)
  var r1 = respostaDiuretico({ doseDiuretico: 1, resistencia: 0.8 }).natriurese;
  var r2 = respostaDiuretico({ doseDiuretico: 2, resistencia: 0.8 }).natriurese;
  var s1 = respostaDiuretico({ doseDiuretico: 1, resistencia: 0.0 }).natriurese;
  var s2 = respostaDiuretico({ doseDiuretico: 2, resistencia: 0.0 }).natriurese;
  ok((r2 - r1) < (s2 - s1) + 1e-9, 'pérola2: dobrar a dose rende menos no resistente (teto/braking)');

  // PÉROLA 3: a UF mecânica RESGATA quando o diurético falha, mas não substitui a função renal.
  var refrat = cardiorrenal({ resistencia: 0.85, volume: 10, doseDiuretico: 3, ufRate: 300, refilling: 350 });
  ok(refrat.refratario && refrat.conduta === 'UF', 'pérola3: diurético falha (refratário) → conduta UF mecânica');
  ok(refrat.ufEfetiva > 0 && refrat.removeIndependente !== false, 'pérola3: UF remove volume independente do túbulo');
  // a UF NÃO corrige eletrólitos como o rim: o engine não promete normalizar K/ácido-base (não há esse campo) —
  // verificamos que a remoção é puramente volumétrica (mL/h), não uma "função renal restaurada".
  ok(refrat.remocaoMlh === refrat.ufEfetiva, 'pérola3: na conduta UF, a remoção é a UF mecânica (volume), não débito tubular');
  // UF acima do refilling não remove mais (limitada pela tolerância — ponte M24)
  var ufAgressiva = ultrafiltracaoMecanica({ ufRate: 400, refilling: 250 });
  ok(ufAgressiva.ufEfetiva === 250 && ufAgressiva.ufSegura === false, 'pérola3: UF > refilling não tira mais (limite hemodinâmico)');
})();

/* ---------- 5. DETERMINISMO 5× byte-idêntico ---------- */
(function () {
  var inp = { dc: 3.5, pvc: 16, pam: 70, doseDiuretico: 2.5, resistencia: 0.55, volume: 7, refilling: 280, ufRate: 260 };
  var ref = JSON.stringify(cardiorrenal(inp));
  var igual = true;
  for (var n = 0; n < 5; n++) { if (JSON.stringify(cardiorrenal(inp)) !== ref) igual = false; }
  ok(igual, 'determinismo: 5 execuções byte-idênticas');
  var Lref = JSON.stringify(congestaoLayout(inp, 900, 360));
  var igualL = true;
  for (var m = 0; m < 5; m++) { if (JSON.stringify(congestaoLayout(inp, 900, 360)) !== Lref) igualL = false; }
  ok(igualL, 'determinismo: layout 5× byte-idêntico');
  var Ld = JSON.stringify(congestaoLayout({ modo: 'diuretico', resistencia: 0.6 }, 900, 360));
  var igualD = true;
  for (var d = 0; d < 5; d++) { if (JSON.stringify(congestaoLayout({ modo: 'diuretico', resistencia: 0.6 }, 900, 360)) !== Ld) igualD = false; }
  ok(igualD, 'determinismo: layout diurético 5× byte-idêntico');
  var frozen = Object.freeze({ pvc: 18, dc: 3, resistencia: 0.7 });
  var threw = false, a; try { a = cardiorrenal(frozen); } catch (e) { threw = true; }
  ok(!threw && fin(a.tfg), 'determinismo: Object.freeze não lança');
  ok(frozen.pvc === 18, 'determinismo: entrada não mutada');
})();

/* ---------- 6. ROBUSTEZ (lixo pontual) ---------- */
(function () {
  var maus = [undefined, null, {}, { pvc: NaN }, { dc: 'x' }, { pam: -10 }, { volume: 1e9 },
    { ufRate: Infinity }, { resistencia: -5 }, { doseDiuretico: 'z' }, { refilling: 9 }, { pam: 1e300 },
    { pvc: NaN, dc: NaN, pam: NaN }, [], function () {}, { resistencia: 'a' }];
  maus.forEach(function (mm, i) {
    var r = cardiorrenal(mm);
    ok(dentroBounds(r) === null, 'robustez[' + i + ']: saídas finitas e em faixa');
    ok(r.conduta in COND_OK, 'robustez[' + i + ']: conduta válida');
    var L = congestaoLayout(mm, 900, 360);
    ok(Array.isArray(L.pts) && fin(L.current.x) && fin(L.current.y), 'robustez[' + i + ']: layout finito');
  });
})();

/* ---------- 7. LIMITES por campo ---------- */
(function () {
  var fields = ['dc', 'pvc', 'pam', 'doseDiuretico', 'resistencia', 'volume', 'refilling', 'ufRate'];
  var extremos = [-1e9, -1e3, -1, 0, 1, 50, 1e3, 1e9, NaN, Infinity, -Infinity];
  fields.forEach(function (f) {
    extremos.forEach(function (v) {
      var inp = {}; inp[f] = v; var r = cardiorrenal(inp);
      ok(dentroBounds(r) === null, 'limites: campo ' + f + '=' + v + ' → saídas em faixa');
      ok(r.conduta in COND_OK, 'limites: campo ' + f + '=' + v + ' → conduta válida');
    });
  });
})();

/* ---------- 8. MONOTONIA EXAUSTIVA (≥60 passos por eixo, cada par adjacente) ---------- */
(function () {
  var STEPS = 70;
  // PVC↑ → TFG não-crescente
  (function () {
    var prev = null, monoOk = true, viol = 0;
    for (var i = 0; i <= STEPS; i++) {
      var pvc = 30 * i / STEPS;
      var t = cardiorrenal({ pvc: pvc, dc: 5, pam: 85 }).tfg;
      if (prev !== null) { if (t - prev > 1e-9) { monoOk = false; viol++; } micros(1); }
      prev = t;
    }
    ok(monoOk, 'monotonia: PVC↑ → TFG↓ (' + viol + ' violações)');
  })();
  // DC↑ → TFG não-decrescente
  (function () {
    var prev = null, monoOk = true, viol = 0;
    for (var i = 0; i <= STEPS; i++) {
      var dc = 1 + 9 * i / STEPS;
      var t = cardiorrenal({ dc: dc, pvc: 12, pam: 75 }).tfg;
      if (prev !== null) { if (t - prev < -1e-9) { monoOk = false; viol++; } micros(1); }
      prev = t;
    }
    ok(monoOk, 'monotonia: DC↑ → TFG↑ (' + viol + ' violações)');
  })();
  // PAM↑ → TFG não-decrescente
  (function () {
    var prev = null, monoOk = true, viol = 0;
    for (var i = 0; i <= STEPS; i++) {
      var pam = 40 + 90 * i / STEPS;
      var t = cardiorrenal({ pam: pam, pvc: 12, dc: 5 }).tfg;
      if (prev !== null) { if (t - prev < -1e-9) { monoOk = false; viol++; } micros(1); }
      prev = t;
    }
    ok(monoOk, 'monotonia: PAM↑ → TFG↑ (' + viol + ' violações)');
  })();
  // resistência↑ → natriurese não-crescente (dose fixa)
  (function () {
    var prev = null, monoOk = true, viol = 0;
    for (var i = 0; i <= STEPS; i++) {
      var res = i / STEPS;
      var nv = respostaDiuretico({ doseDiuretico: 2, perfusao: 75, resistencia: res }).natriurese;
      if (prev !== null) { if (nv - prev > 1e-9) { monoOk = false; viol++; } micros(1); }
      prev = nv;
    }
    ok(monoOk, 'monotonia: resistência↑ → natriurese↓ (' + viol + ' violações)');
  })();
  // resistência↑ → EC50 não-decrescente (deslocamento à direita)
  (function () {
    var prev = null, monoOk = true, viol = 0;
    for (var i = 0; i <= STEPS; i++) {
      var res = i / STEPS;
      var e = respostaDiuretico({ resistencia: res }).ec50;
      if (prev !== null) { if (e - prev < -1e-9) { monoOk = false; viol++; } micros(1); }
      prev = e;
    }
    ok(monoOk, 'monotonia: resistência↑ → EC50↑ (curva à direita) (' + viol + ' violações)');
  })();
  // dose↑ → natriurese não-decrescente (resistência fixa)
  (function () {
    var prev = null, monoOk = true, viol = 0;
    for (var i = 0; i <= STEPS; i++) {
      var dose = 8 * i / STEPS;
      var nv = respostaDiuretico({ doseDiuretico: dose, perfusao: 75, resistencia: 0.4 }).natriurese;
      if (prev !== null) { if (nv - prev < -1e-9) { monoOk = false; viol++; } micros(1); }
      prev = nv;
    }
    ok(monoOk, 'monotonia: dose↑ → natriurese↑ (' + viol + ' violações)');
  })();
  // ufRate↑ → ufEfetiva não-decrescente (refilling fixo alto)
  (function () {
    var prev = null, monoOk = true, viol = 0;
    for (var i = 0; i <= STEPS; i++) {
      var u = 400 * i / STEPS;
      var ue = ultrafiltracaoMecanica({ ufRate: u, refilling: 400 }).ufEfetiva;
      if (prev !== null) { if (ue - prev < -1e-9) { monoOk = false; viol++; } micros(1); }
      prev = ue;
    }
    ok(monoOk, 'monotonia: ufRate↑ → ufEfetiva↑ (até refilling) (' + viol + ' violações)');
  })();
})();

/* ---------- 9. FUZZING semeado ≥22000 (~35% malignas em CADA campo) ---------- */
(function () {
  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  var rnd = mulberry32(0x37C0DE), N = 22000, bad = 0, badL = 0, badEnum = 0, badMut = 0, badId = 0;
  var MAL = [NaN, Infinity, -Infinity, 1e300, -1e300, 1e-300, '5', 'x', '', null, undefined, {}, [], function () {}, true, false];
  function val() { if (rnd() < 0.35) return MAL[(rnd() * MAL.length) | 0]; return (rnd() - 0.2) * 500; }
  function fields() {
    return {
      dc: val(), pvc: val(), pam: val(), doseDiuretico: val(), resistencia: val(),
      volume: val(), refilling: val(), ufRate: val()
    };
  }
  function ser(o) { return JSON.stringify(o, function (key, v) { return (typeof v === 'function') ? '__fn__' : (v === undefined ? '__u__' : v); }); }
  for (var i = 0; i < N; i++) {
    var inp = fields();
    var snapshot = ser(inp);
    var r = cardiorrenal(inp);
    // alterna modo do layout para exercitar os dois caminhos
    if (i % 2 === 0) inp.modo = 'diuretico';
    var L = congestaoLayout(inp, 900, 360);
    delete inp.modo;
    // (a)+(b) saídas finitas e em faixa documentada
    if (dentroBounds(r) !== null) bad++;
    // (c) conduta sempre válida
    if (!(r.conduta in COND_OK)) badEnum++;
    // (d) identidades: perfPressao = PAM − PVC; tfg = tfgDePerfusao(perfEfetiva)
    if (Math.abs(r.perfPressao - (r.pam - r.pvc)) > 1e-7) badId++;
    if (Math.abs(r.tfg - tfgDePerfusao(r.perfEfetiva)) > 1e-7) badId++;
    if (Math.abs(r.ufEfetiva - Math.min(r.ufRate, r.refilling)) > 1e-7) badId++;
    // layout finito
    if (!Array.isArray(L.pts) || L.pts.length !== 61 || !fin(L.current.x) || !fin(L.current.y)) badL++;
    for (var j = 0; j < L.pts.length; j++) { if (!fin(L.pts[j].x) || !fin(L.pts[j].y)) { badL++; break; } }
    // (e) input não mutado
    if (ser(inp) !== snapshot) badMut++;
    micros(6 + L.pts.length);
  }
  var threwFrozen = false; try { cardiorrenal(Object.freeze({ pvc: 30, dc: 1, resistencia: 1 })); } catch (e) { threwFrozen = true; }
  ok(bad === 0, 'fuzzing: ' + N + ' entradas (~35% malignas) → 0 violações de faixa (' + bad + ')');
  ok(badEnum === 0, 'fuzzing: conduta sempre válida (' + badEnum + ')');
  ok(badId === 0, 'fuzzing: identidades intactas (' + badId + ')');
  ok(badL === 0, 'fuzzing: layout finito em todas (' + badL + ')');
  ok(badMut === 0, 'fuzzing: input nunca mutado (' + badMut + ')');
  ok(!threwFrozen, 'fuzzing: Object.freeze não lança');
})();

/* ---------- 10. SAÍDA ---------- */
var total = oks + micro;
console.log(total + ' OK (' + oks + ' macro + ' + micro + ' micro/fuzz) · ' + fails + ' falhas');
process.exit(fails > 0 ? 1 : 0);
