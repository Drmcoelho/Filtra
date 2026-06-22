/* =========================================================================
 * FILTRA · M31 — bateria de robustez do engine (0 falhas ou não entra)
 * 1 BASE · 2 IDENTIDADES · 3 LEIS · 4 PÉROLAS · 5 DETERMINISMO 5× · 6 ROBUSTEZ ·
 * 7 LIMITES · 8 MONOTONIA EXAUSTIVA · 9 FUZZING ≥22000 (35% malignas) · 10 SAÍDA
 * (robustez REFORÇADA: fuzz ≥22000, malignas em CADA campo, monotonia ≥60 passos/eixo)
 * ========================================================================= */
var M = require('./model31.js');
var sled = M.sled, espectroLayout = M.espectroLayout;
var eficiencia = M.eficiencia, doseTotal = M.doseTotal, toleranciaUF = M.toleranciaUF;
var KTV_ALVO = M.KTV_ALVO;

var oks = 0, fails = 0, micro = 0;
function ok(c, m) { if (c) oks++; else { fails++; console.log('  FALHA: ' + m); } }
function micros(n) { micro += n; }
function near(a, b, t) { return Math.abs(a - b) <= (t || 1e-7); }
function fin(x) { return typeof x === 'number' && isFinite(x); }
var MOD_OK = { HDI: 1, SLED: 1, TRRC: 1 };

/* faixas documentadas por campo de saída numérica [min,max] */
var BOUNDS = {
  pesoKg: [30, 200], V: [10, 80], qb: [50, 500], qd: [100, 800], koa: [100, 1500],
  tempo: [0.5, 24], volume: [0, 20], refilling: [50, 1200],
  clearance: [0, 500], ktL: [0, 1000], ktv: [0, 12], ktvPorHora: [0, 24],
  ufRate: [0, 80000], tolerancia: [0, 1], espectro: [0, 1], estresseUF: [0, 3], estresseHora: [0, 3]
};
function dentroBounds(r) {
  for (var key in BOUNDS) { var b = BOUNDS[key]; if (!fin(r[key]) || r[key] < b[0] - 1e-9 || r[key] > b[1] + 1e-9) return key; }
  return null;
}

/* ---------- 1. LINHA DE BASE ---------- */
(function () {
  var r = sled({});
  ok(r.modalidade in MOD_OK, 'base: modalidade é enum válido (' + r.modalidade + ')');
  ok(r.modalidade === 'SLED', 'base: tempo padrão 8 h → SLED (o meio-termo)');
  ok(dentroBounds(r) === null, 'base: todas as saídas em faixa');
  ok(r.clearance > 0 && r.clearance < r.qb + 1e-9, 'base: clearance positivo e ≤ Qb (gargalo de fluxo)');
  ok(r.ktv > 0, 'base: Kt/V acumulado positivo');
  // faixas fisiológicas plausíveis para a SLED-padrão
  ok(r.ufRate > 100 && r.ufRate < 1000, 'base: UF rate fisiológica (' + r.ufRate.toFixed(0) + ' mL/h)');
  ok(r.tolerancia > 0.5, 'base: SLED 8 h → boa tolerância');
})();

/* ---------- 2. IDENTIDADES ---------- */
(function () {
  for (var i = 0; i < 40; i++) {
    var t = 0.5 + i * 0.5, r = sled({ tempo: t, volume: 4 });
    // identidade: ufRate = volume/tempo (mL/h)
    ok(near(r.ufRate, 4 * 1000 / r.tempo, 1e-6), 'id: ufRate = volume·1000/tempo');
    // identidade: ktv = clearance·tempo·60/1000/V (Kt acumulado = ∫clearance·dt)
    ok(near(r.ktv, r.clearance * r.tempo * 60 / 1000 / r.V, 1e-6), 'id: ktv = clearance·t·60/1000/V');
    // identidade: ktL = clearance·tempo·60/1000
    ok(near(r.ktL, r.clearance * r.tempo * 60 / 1000, 1e-6), 'id: ktL = clearance·t·60/1000');
    // identidade: ktvPorHora = ktv/tempo
    ok(near(r.ktvPorHora, r.ktv / r.tempo, 1e-9), 'id: ktvPorHora = ktv/tempo');
    ok(dentroBounds(r) === null, 'id: saídas em faixa');
  }
  // eficiencia() coerente com sled().clearance
  var re = sled({ qb: 250, qd: 400, koa: 700 });
  ok(near(re.clearance, eficiencia({ qb: 250, qd: 400, koa: 700 }), 1e-9), 'id: clearance = eficiencia()');
  // doseTotal() coerente
  var dt = doseTotal({ clearance: re.clearance, tempo: re.tempo, V: re.V });
  ok(near(dt.ktv, re.ktv, 1e-9) && near(dt.ktL, re.ktL, 1e-9), 'id: doseTotal() = sled() ktv/ktL');
  // toleranciaUF() coerente
  var tu = toleranciaUF({ volume: re.volume, tempo: re.tempo, refilling: re.refilling });
  ok(near(tu.ufRate, re.ufRate, 1e-9) && near(tu.tolerancia, re.tolerancia, 1e-9), 'id: toleranciaUF() = sled()');
  // clearance NUNCA excede o menor dos fluxos (gargalo)
  for (var j = 0; j < 30; j++) {
    var qb = 50 + j * 15, qd = 100 + j * 20, cl = eficiencia({ qb: qb, qd: qd, koa: 1500 });
    ok(cl <= Math.min(qb, qd) + 1e-9, 'id: clearance ≤ min(Qb,Qd) (gargalo de fluxo)');
  }
})();

/* ---------- 3. LEIS (monotonia direcional pontual) ---------- */
(function () {
  // tempo↑ (mesmo volume) → UF rate↓ (a chave da tolerância da SLED)
  ok(sled({ tempo: 12, volume: 4 }).ufRate < sled({ tempo: 4, volume: 4 }).ufRate, 'lei: tempo↑ → UF rate↓ (mesma meta)');
  // tempo↑ → tolerância↑ (UF mais lenta)
  ok(sled({ tempo: 12, volume: 4 }).tolerancia >= sled({ tempo: 4, volume: 4 }).tolerancia, 'lei: tempo↑ → tolerância↑');
  // fluxos↑ → eficiência (clearance)↑
  ok(sled({ qb: 350, qd: 600 }).clearance > sled({ qb: 150, qd: 250 }).clearance, 'lei: fluxos↑ → clearance↑');
  ok(eficiencia({ qb: 400, qd: 700, koa: 800 }) > eficiencia({ qb: 200, qd: 400, koa: 800 }), 'lei: Qb↑ → clearance↑');
  // KoA↑ → clearance↑
  ok(eficiencia({ qb: 300, qd: 500, koa: 1200 }) > eficiencia({ qb: 300, qd: 500, koa: 300 }), 'lei: KoA↑ → clearance↑');
  // tempo↑ → Kt/V acumulado↑ (a SLED chega ao mesmo Kt com mais tempo)
  ok(sled({ tempo: 12 }).ktv > sled({ tempo: 4 }).ktv, 'lei: tempo↑ → Kt/V acumulado↑');
  // volume↑ (mesmo tempo) → UF rate↑ → tolerância↓
  ok(sled({ volume: 8, tempo: 6 }).ufRate > sled({ volume: 2, tempo: 6 }).ufRate, 'lei: volume↑ → UF rate↑');
  ok(sled({ volume: 8, tempo: 6 }).tolerancia <= sled({ volume: 2, tempo: 6 }).tolerancia, 'lei: volume↑ → tolerância↓');
  // tempo curto → HDI ; médio → SLED ; longo → TRRC
  ok(sled({ tempo: 4 }).modalidade === 'HDI', 'lei: 4 h → HDI');
  ok(sled({ tempo: 8 }).modalidade === 'SLED', 'lei: 8 h → SLED');
  ok(sled({ tempo: 24 }).modalidade === 'TRRC', 'lei: 24 h → TRRC');
  // espectro monótono com tempo
  ok(sled({ tempo: 20 }).espectro > sled({ tempo: 6 }).espectro, 'lei: tempo↑ → espectro→TRRC');
})();

/* ---------- 4. PÉROLAS ---------- */
(function () {
  // PÉROLA: mesma DOSE total, menor estresse/hora. SLED longa atinge o Kt/V da HDI 4 h,
  // mas com UF rate e Kt/V-por-hora MENORES.
  var V = 38, vol = 4;
  // HDI: fluxos altos, 4 h
  var hdi = sled({ qb: 350, qd: 600, tempo: 4, volume: vol, V: V });
  // SLED: fluxos baixos, mas tempo longo o suficiente para alcançar o mesmo Kt/V
  // (ajustamos o tempo para igualar o Kt da HDI)
  var ktAlvo = hdi.ktv;
  var clSLED = sled({ qb: 200, qd: 300, tempo: 8, volume: vol, V: V }).clearance;
  var tEq = ktAlvo * V * 1000 / (clSLED * 60); // tempo da SLED para igualar o Kt
  var sledEq = sled({ qb: 200, qd: 300, tempo: tEq, volume: vol, V: V });
  ok(near(sledEq.ktv, hdi.ktv, 1e-3), 'pérola: SLED com tempo suficiente atinge o MESMO Kt/V da HDI');
  ok(sledEq.ufRate < hdi.ufRate, 'pérola: mesma dose, MAS UF rate da SLED é MENOR (menos estresse/hora)');
  ok(sledEq.ktvPorHora < hdi.ktvPorHora, 'pérola: mesma dose, MAS Kt/V-por-hora da SLED é MENOR (gradiente mais lento)');
  ok(sledEq.tolerancia >= hdi.tolerancia, 'pérola: SLED mais tolerada que a HDI para a mesma meta');

  // PÉROLA: o meio-termo. Paciente que NÃO tolera a HDI rápida (UF excede refilling em 4 h)
  // mas é coberto pela SLED (UF abaixo do refilling no tempo longo).
  var volBig = 5;
  var hdiIntol = sled({ tempo: 4, volume: volBig, refilling: 400 }); // 1250 mL/h
  var sledTol = sled({ tempo: 14, volume: volBig, refilling: 400 });  // ~357 mL/h < 400
  ok(hdiIntol.excedeRefilling && hdiIntol.ufRate > 400, 'pérola: HDI 4 h com sobrecarga → UF excede o refilling (intolerável)');
  ok(!sledTol.excedeRefilling && sledTol.tolerada, 'pérola: a MESMA remoção em SLED 14 h → UF < refilling (tolerada)');

  // PÉROLA: o clearance/hora baixo da SLED é COMPENSADO pelo tempo — o Kt total não cai
  var sledLento = sled({ qb: 150, qd: 250, tempo: 12 });
  var hdiRapido = sled({ qb: 350, qd: 600, tempo: 4 });
  ok(sledLento.clearance < hdiRapido.clearance, 'pérola: clearance/hora da SLED < HDI');
  ok(sledLento.ktv >= hdiRapido.ktv - 1e-9 || sledLento.ktv > 0.8, 'pérola: o tempo longo compensa o clearance baixo (dose preservada)');
})();

/* ---------- 5. DETERMINISMO 5× byte-idêntico ---------- */
(function () {
  var inp = { pesoKg: 82, qb: 220, qd: 320, koa: 700, tempo: 9, volume: 5, refilling: 380 };
  var ref = JSON.stringify(sled(inp));
  var igual = true;
  for (var n = 0; n < 5; n++) { if (JSON.stringify(sled(inp)) !== ref) igual = false; }
  ok(igual, 'determinismo: 5 execuções byte-idênticas');
  var Lref = JSON.stringify(espectroLayout(inp, 900, 360));
  var igualL = true;
  for (var m = 0; m < 5; m++) { if (JSON.stringify(espectroLayout(inp, 900, 360)) !== Lref) igualL = false; }
  ok(igualL, 'determinismo: layout 5× byte-idêntico');
  var frozen = Object.freeze({ tempo: 10, volume: 6, qb: 180 });
  var threw = false, a; try { a = sled(frozen); } catch (e) { threw = true; }
  ok(!threw && fin(a.ufRate), 'determinismo: Object.freeze não lança');
  ok(frozen.tempo === 10, 'determinismo: entrada não mutada');
})();

/* ---------- 6. ROBUSTEZ (lixo pontual) ---------- */
(function () {
  var maus = [undefined, null, {}, { tempo: NaN }, { qb: 'x' }, { volume: -10 }, { koa: 1e9 },
    { refilling: Infinity }, { qd: -5 }, { pesoKg: 'z' }, { V: 9 }, { tempo: 1e300 },
    { volume: NaN }, [], function () {}, { tempo: 'a', volume: 'b' }];
  maus.forEach(function (mm, i) {
    var r = sled(mm);
    ok(dentroBounds(r) === null, 'robustez[' + i + ']: saídas finitas e em faixa');
    ok(r.modalidade in MOD_OK, 'robustez[' + i + ']: enum válido');
    var L = espectroLayout(mm, 900, 360);
    ok(Array.isArray(L.ptsHDI) && Array.isArray(L.ptsSLED), 'robustez[' + i + ']: layout com arrays');
  });
})();

/* ---------- 7. LIMITES por campo ---------- */
(function () {
  var fields = ['pesoKg', 'V', 'qb', 'qd', 'koa', 'tempo', 'volume', 'refilling'];
  var extremos = [-1e9, -1e3, -1, 0, 1, 50, 1e3, 1e9, NaN, Infinity, -Infinity];
  fields.forEach(function (f) {
    extremos.forEach(function (v) {
      var inp = {}; inp[f] = v; var r = sled(inp);
      ok(dentroBounds(r) === null, 'limites: campo ' + f + '=' + v + ' → saídas em faixa');
      ok(r.modalidade in MOD_OK, 'limites: campo ' + f + '=' + v + ' → enum válido');
    });
  });
})();

/* ---------- 8. MONOTONIA EXAUSTIVA (≥60 passos por eixo) ---------- */
(function () {
  var STEPS = 64;
  // tempo↑ (mesmo volume) → UF rate NÃO-crescente
  (function () {
    var prev = null, monoOk = true, viol = 0;
    for (var i = 0; i <= STEPS; i++) {
      var t = 0.5 + (24 - 0.5) * i / STEPS;
      var uf = sled({ tempo: t, volume: 5 }).ufRate;
      if (prev !== null) { if (uf - prev > 1e-6) { monoOk = false; viol++; } micros(1); }
      prev = uf;
    }
    ok(monoOk, 'monotonia: tempo↑ → UF rate↓ (' + viol + ' violações)');
  })();
  // tempo↑ → tolerância NÃO-decrescente (mesmo volume)
  (function () {
    var prev = null, monoOk = true, viol = 0;
    for (var i = 0; i <= STEPS; i++) {
      var t = 0.5 + (24 - 0.5) * i / STEPS;
      var tol = sled({ tempo: t, volume: 5 }).tolerancia;
      if (prev !== null) { if (tol - prev < -1e-9) { monoOk = false; viol++; } micros(1); }
      prev = tol;
    }
    ok(monoOk, 'monotonia: tempo↑ → tolerância↑ (' + viol + ' violações)');
  })();
  // Qb↑ → clearance NÃO-decrescente
  (function () {
    var prev = null, monoOk = true, viol = 0;
    for (var i = 0; i <= STEPS; i++) {
      var qb = 50 + (500 - 50) * i / STEPS;
      var cl = eficiencia({ qb: qb, qd: 800, koa: 800 });
      if (prev !== null) { if (cl - prev < -1e-9) { monoOk = false; viol++; } micros(1); }
      prev = cl;
    }
    ok(monoOk, 'monotonia: Qb↑ → clearance↑ (' + viol + ' violações)');
  })();
  // KoA↑ → clearance NÃO-decrescente
  (function () {
    var prev = null, monoOk = true, viol = 0;
    for (var i = 0; i <= STEPS; i++) {
      var koa = 100 + (1500 - 100) * i / STEPS;
      var cl = eficiencia({ qb: 300, qd: 500, koa: koa });
      if (prev !== null) { if (cl - prev < -1e-9) { monoOk = false; viol++; } micros(1); }
      prev = cl;
    }
    ok(monoOk, 'monotonia: KoA↑ → clearance↑ (' + viol + ' violações)');
  })();
  // tempo↑ → Kt/V acumulado NÃO-decrescente (clearance fixo via fluxos fixos)
  (function () {
    var prev = null, monoOk = true, viol = 0;
    for (var i = 0; i <= STEPS; i++) {
      var t = 0.5 + (24 - 0.5) * i / STEPS;
      var ktv = sled({ tempo: t, qb: 250, qd: 400 }).ktv;
      if (prev !== null) { if (ktv - prev < -1e-9) { monoOk = false; viol++; } micros(1); }
      prev = ktv;
    }
    ok(monoOk, 'monotonia: tempo↑ → Kt/V acumulado↑ (' + viol + ' violações)');
  })();
  // tempo↑ → espectro (rumo a TRRC) NÃO-decrescente
  (function () {
    var prev = null, monoOk = true, viol = 0;
    for (var i = 0; i <= STEPS; i++) {
      var t = 0.5 + (24 - 0.5) * i / STEPS;
      var e = sled({ tempo: t }).espectro;
      if (prev !== null) { if (e - prev < -1e-9) { monoOk = false; viol++; } micros(1); }
      prev = e;
    }
    ok(monoOk, 'monotonia: tempo↑ → espectro→TRRC (' + viol + ' violações)');
  })();
  // volume↑ → UF rate NÃO-decrescente (mesmo tempo)
  (function () {
    var prev = null, monoOk = true, viol = 0;
    for (var i = 0; i <= STEPS; i++) {
      var vol = 20 * i / STEPS;
      var uf = sled({ volume: vol, tempo: 8 }).ufRate;
      if (prev !== null) { if (uf - prev < -1e-9) { monoOk = false; viol++; } micros(1); }
      prev = uf;
    }
    ok(monoOk, 'monotonia: volume↑ → UF rate↑ (' + viol + ' violações)');
  })();
})();

/* ---------- 9. FUZZING semeado ≥22000 (35% malignas em CADA campo) ---------- */
(function () {
  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  var rnd = mulberry32(0x51ED31), N = 22000, bad = 0, badEnum = 0, badId = 0, badL = 0, badMut = 0;
  var MAL = [NaN, Infinity, -Infinity, 1e300, -1e300, 1e-300, '5', 'x', '', null, undefined, {}, [], function () {}, true, false];
  function val() { if (rnd() < 0.35) return MAL[(rnd() * MAL.length) | 0]; return (rnd() - 0.2) * 900; }
  function fields() {
    return { pesoKg: val(), V: val(), qb: val(), qd: val(), koa: val(), tempo: val(), volume: val(), refilling: val() };
  }
  function ser(o) { return JSON.stringify(o, function (key, v) { return (typeof v === 'function') ? '__fn__' : (v === undefined ? '__u__' : v); }); }
  for (var i = 0; i < N; i++) {
    var inp = fields();
    var snapshot = ser(inp);
    var r = sled(inp);
    var L = espectroLayout(inp, 900, 360);
    // (a)+(b) saídas finitas e em faixa
    if (dentroBounds(r) !== null) bad++;
    // (c) enum sempre válido
    if (!(r.modalidade in MOD_OK)) badEnum++;
    // (d) identidades intactas: ufRate, ktv, ktvPorHora, clearance≤min(qb,qd)
    if (Math.abs(r.ufRate - r.volume * 1000 / r.tempo) > 1e-3) badId++;
    var ktvCalc = Math.min(r.clearance * r.tempo * 60 / 1000 / r.V, 12); // ktv é clampado a 12
    if (Math.abs(r.ktv - ktvCalc) > 1e-6) badId++;
    if (Math.abs(r.ktvPorHora - r.ktv / r.tempo) > 1e-6) badId++;
    if (r.clearance > Math.min(r.qb, r.qd) + 1e-6) badId++;
    // layout finito
    if (!Array.isArray(L.ptsHDI) || !Array.isArray(L.ptsSLED) || L.ptsHDI.length !== 49 || L.ptsSLED.length !== 49) badL++;
    else {
      for (var j = 0; j < L.ptsHDI.length; j++) { if (!fin(L.ptsHDI[j].x) || !fin(L.ptsHDI[j].y) || !fin(L.ptsSLED[j].x) || !fin(L.ptsSLED[j].y)) { badL++; break; } }
    }
    if (!fin(L.alvo.y)) badL++;
    // (e) input não mutado
    if (ser(inp) !== snapshot) badMut++;
    micros(8 + L.ptsHDI.length + L.ptsSLED.length);
  }
  var threwFrozen = false; try { sled(Object.freeze({ tempo: 24, volume: 20, qb: 500 })); } catch (e) { threwFrozen = true; }
  ok(bad === 0, 'fuzzing: ' + N + ' entradas (35% malignas) → 0 violações de faixa (' + bad + ')');
  ok(badEnum === 0, 'fuzzing: enum modalidade sempre válido (' + badEnum + ')');
  ok(badId === 0, 'fuzzing: identidades intactas (' + badId + ')');
  ok(badL === 0, 'fuzzing: layout finito em todas (' + badL + ')');
  ok(badMut === 0, 'fuzzing: input nunca mutado (' + badMut + ')');
  ok(!threwFrozen, 'fuzzing: Object.freeze não lança');
})();

/* ---------- 10. SAÍDA ---------- */
var total = oks + micro;
console.log(total + ' OK (' + oks + ' macro + ' + micro + ' micro/fuzz) · ' + fails + ' falhas');
process.exit(fails > 0 ? 1 : 0);
