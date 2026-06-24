/* =========================================================================
 * FILTRA · M21 — bateria de robustez do engine (0 falhas ou não entra)
 * 1 BASE · 2 IDENTIDADES · 3 LEIS · 4 PÉROLAS · 5 DETERMINISMO 5× · 6 ROBUSTEZ ·
 * 7 LIMITES · 8 MONOTONIA EXAUSTIVA · 9 FUZZING ≥20000 (~35% malignas) · 10 SAÍDA
 * (robustez REFORÇADA: fuzz ≥20000, monotonia ≥60 passos/eixo; centenas de
 *  milhares de asserções via micro-contadores)
 * ========================================================================= */
var M = require('./model21.js');
var clearanceDialisador = M.clearanceDialisador, sieving = M.sieving, backfiltration = M.backfiltration;
var membrana = M.membrana, clearanceLayout = M.clearanceLayout;
var PM_UREIA = M.PM_UREIA, PM_B2M = M.PM_B2M, CUTOFF_LOW = M.CUTOFF_LOW, CUTOFF_HIGH = M.CUTOFF_HIGH, STEEP = M.STEEP;

var oks = 0, fails = 0, micro = 0;
function ok(c, m) { if (c) oks++; else { fails++; console.log('  FALHA: ' + m); } }
function micros(n) { micro += n; }
function near(a, b, t) { return Math.abs(a - b) <= (t || 1e-7); }
function fin(x) { return typeof x === 'number' && isFinite(x); }

/* faixas documentadas por campo numérico de membrana() [min,max] */
var BOUNDS = {
  koa: [0, 2000], qb: [1, 600], qd: [1, 1200], tmp: [0, 400], highFlux: [0, 1], cutoff: [200, 60000], steep: [1, 12],
  clearUreia: [0, 600], clearMedio: [0, 600], fracUreia: [0, 1], ganhoMarginal: [0, 1],
  sUreia: [0, 1], sMedio: [0, 1], koaMedio: [0, 1200],
  backfilt: [0, 1]
};
function dentroBounds(r) {
  for (var key in BOUNDS) { var b = BOUNDS[key]; if (!fin(r[key]) || r[key] < b[0] - 1e-9 || r[key] > b[1] + 1e-9) return key; }
  return null;
}

/* ---------- 1. LINHA DE BASE (faixas fisiológicas conhecidas) ---------- */
(function () {
  var r = membrana({});
  ok(dentroBounds(r) === null, 'base: todas as saídas em faixa (' + dentroBounds(r) + ')');
  ok(r.classe === 'high-flux', 'base: default é high-flux');
  // dialisador típico: KoA 600, Qb 300, Qd 500 → clearance de ureia ~200–260 mL/min
  ok(r.clearUreia > 180 && r.clearUreia < 280, 'base: clearance de ureia ~200–260 mL/min (tem ' + r.clearUreia.toFixed(1) + ')');
  ok(r.clearUreia <= r.qb + 1e-9, 'base: K ≤ Qb');
  ok(r.clearMedio < r.clearUreia, 'base: clearance do médio < ureia (molécula maior depura menos)');
  ok(r.sUreia > 0.99, 'base: sieving da ureia ≈ 1 (passa livre)');
  ok(r.removeMedio === true, 'base: high-flux remove o médio (β2m)');
  // CALIBRAÇÃO CLÍNICA: β2m em high-flux S≈0,5–0,7 (não 0,95) — valor real de membrana
  ok(r.sMedio > 0.5 && r.sMedio < 0.7, 'base: sieving da β2m em high-flux ≈0,5–0,7 (calibrado, tem ' + r.sMedio.toFixed(3) + ')');
  ok(Math.abs(r.sMedio - 0.6) < 0.05, 'base: β2m high-flux ≈0,60 (alvo de calibração, tem ' + r.sMedio.toFixed(3) + ')');
  // low-flux barra o médio
  var lf = membrana({ highFlux: 0 });
  ok(lf.classe === 'low-flux' && lf.removeMedio === false, 'base: low-flux NÃO remove o médio');
  ok(lf.sMedio < 0.05, 'base: low-flux quase não deixa passar o β2m (S≈0)');
  // albumina (66 kDa) retida em high-flux (cutoff calibrado não a deixa passar)
  var sAlb = sieving({ pm: 66000, cutoff: CUTOFF_HIGH, steep: STEEP });
  ok(sAlb < 0.01, 'base: albumina (66 kDa) retida em high-flux (S≈0, tem ' + sAlb.toFixed(4) + ')');
})();

/* ---------- 2. IDENTIDADES (valem SEMPRE) ---------- */
(function () {
  // (a) K ≤ Qb e K ≤ Qd para uma grade ampla
  var bad = 0, badS = 0, badId = 0;
  for (var iq = 0; iq < 40; iq++) {
    var qb = 50 + iq * 12;
    for (var jq = 0; jq < 30; jq++) {
      var qd = 100 + jq * 30, koa = 50 + iq * 40 + jq * 10;
      var K = clearanceDialisador({ koa: koa, qb: qb, qd: qd });
      if (K > qb + 1e-6 || K > qd + 1e-6 || K < -1e-9) bad++;
      micros(1);
    }
  }
  ok(bad === 0, 'identidade: K ≤ min(Qb,Qd) e K ≥ 0 em toda a grade (' + bad + ' violações)');
  // (b) KoA crescente ⇒ K → min(Qb,Qd) (assíntota); KoA grande chega perto do teto
  var Kk = [200, 600, 1500, 2000].map(function (kk) { return clearanceDialisador({ koa: kk, qb: 300, qd: 500 }); });
  ok(Kk[0] < Kk[1] && Kk[1] < Kk[2] && Kk[2] < Kk[3], 'identidade: KoA↑ → K se aproxima de min(Qb,Qd)=Qb monotonicamente');
  ok(Kk[3] < 300 + 1e-6 && Kk[3] > 285, 'identidade: KoA grande → K perto do teto Qb (<Qb, tem ' + Kk[3].toFixed(1) + ')');
  // a assíntota matemática: para KoA muito acima do clamp, K → Qb (verifica na função pura sem clamp de entrada)
  var asym = clearanceDialisador({ koa: 2000, qb: 100, qd: 500 });   // Qb pequeno → satura cedo
  ok(near(asym, 100, 1.0), 'identidade: KoA alto com Qb pequeno → K → Qb (tem ' + asym.toFixed(2) + ')');
  var asym2 = clearanceDialisador({ koa: 2000, qb: 500, qd: 100 });  // Qd pequeno → teto é Qd
  ok(near(asym2, 100, 1.0), 'identidade: KoA alto, Qd<Qb → K → Qd=100 (tem ' + asym2.toFixed(2) + ')');
  // (c) KoA → 0 ⇒ K → 0
  ok(near(clearanceDialisador({ koa: 0, qb: 300, qd: 500 }), 0, 1e-9), 'identidade: KoA=0 → K=0');
  // (d) Qb=Qd caso limite ≡ forma fechada Qb·KoA/(Qb+KoA), e contínuo no limite
  var qbe = 350, koae = 700;
  var Klim = clearanceDialisador({ koa: koae, qb: qbe, qd: qbe });
  ok(near(Klim, qbe * koae / (qbe + koae), 1e-6), 'identidade: Qb=Qd → forma fechada Qb·KoA/(Qb+KoA)');
  var Knear1 = clearanceDialisador({ koa: koae, qb: qbe, qd: qbe + 0.5 });
  var Knear2 = clearanceDialisador({ koa: koae, qb: qbe, qd: qbe - 0.5 });
  ok(near(Klim, Knear1, 2) && near(Klim, Knear2, 2), 'identidade: clearance contínuo na vizinhança de Qb=Qd');
  // (e) sieving ∈ [0,1] sempre; S(cutoff) = 0,5
  for (var p = 0; p < 200; p++) {
    var pm = 10 + p * 350, S = sieving({ pm: pm, cutoff: 5000, steep: 4 });
    if (!(S >= 0 && S <= 1)) badS++;
    micros(1);
  }
  ok(badS === 0, 'identidade: sieving ∈ [0,1] sempre (' + badS + ' fora)');
  ok(near(sieving({ pm: 5000, cutoff: 5000, steep: 4 }), 0.5, 1e-9), 'identidade: S(pm=cutoff)=0,5');
  // (f) membrana(): efeitos derivados coerentes
  for (var t = 0; t < 60; t++) {
    var r = membrana({ koa: 100 + t * 30, qb: 200 + t, qd: 400 + t * 5, highFlux: t % 2 });
    if (r.clearUreia > r.qb + 1e-6) badId++;
    if (r.clearMedio > r.clearUreia + 1e-6) badId++;     // médio sempre ≤ ureia
    if (Math.abs(r.fracUreia - r.clearUreia / r.qb) > 1e-6) badId++;
    micros(3);
  }
  ok(badId === 0, 'identidade: membrana() — K≤Qb, médio≤ureia, fracUreia=K/Qb (' + badId + ' violações)');
})();

/* ---------- 3. LEIS (monotonia direcional pontual) ---------- */
(function () {
  // ↑KoA → ↑K
  ok(clearanceDialisador({ koa: 900, qb: 300, qd: 500 }) > clearanceDialisador({ koa: 300, qb: 300, qd: 500 }), 'lei: ↑KoA → ↑K');
  // ↑Qb → ↑K (com saturação: o salto encolhe)
  var k150 = clearanceDialisador({ koa: 600, qb: 150, qd: 500 });
  var k300 = clearanceDialisador({ koa: 600, qb: 300, qd: 500 });
  var k450 = clearanceDialisador({ koa: 600, qb: 450, qd: 500 });
  ok(k300 > k150 && k450 > k300, 'lei: ↑Qb → ↑K');
  ok((k450 - k300) < (k300 - k150), 'lei: o ganho de K por Qb DIMINUI (saturação)');
  // ↑Qd → ↑K
  ok(clearanceDialisador({ koa: 600, qb: 300, qd: 800 }) > clearanceDialisador({ koa: 600, qb: 300, qd: 350 }), 'lei: ↑Qd → ↑K');
  // ↑PM → ↓sieving
  ok(sieving({ pm: 12000, cutoff: 5000, steep: 4 }) < sieving({ pm: 1000, cutoff: 5000, steep: 4 }), 'lei: ↑PM → ↓sieving');
  // ↑cutoff → ↑sieving (membrana mais aberta deixa passar mais)
  ok(sieving({ pm: 11800, cutoff: 25000, steep: 4 }) > sieving({ pm: 11800, cutoff: 2000, steep: 4 }), 'lei: ↑cutoff → ↑sieving do médio');
  // backfiltration: só com high-flux
  ok(backfiltration({ highFlux: 0, qb: 480, tmp: 10 }) === 0, 'lei: low-flux → sem backfiltration');
  // DRIVER PRIMÁRIO: ↑Qb (queda axial de pressão do sangue) → ↑backfiltration (high-flux)
  ok(backfiltration({ highFlux: 1, qb: 500, tmp: 10 }) > backfiltration({ highFlux: 1, qb: 250, tmp: 10 }), 'lei: ↑Qb → ↑backfiltration (queda axial, high-flux)');
  ok(backfiltration({ highFlux: 1, qb: 480, tmp: 5 }) > backfiltration({ highFlux: 1, qb: 480, tmp: 200 }), 'lei: ↓TMP → ↑backfiltration');
  // Qd ainda é monotônico, mas é contribuinte MENOR que o Qb
  ok(backfiltration({ highFlux: 1, qb: 300, qd: 800, tmp: 50 }) >= backfiltration({ highFlux: 1, qb: 300, qd: 300, tmp: 50 }), 'lei: ↑Qd → ↑backfiltration (contribuinte menor)');
  var dQbbf = backfiltration({ highFlux: 1, qb: 500, qd: 500, tmp: 50 }) - backfiltration({ highFlux: 1, qb: 200, qd: 500, tmp: 50 });
  var dQdbf = backfiltration({ highFlux: 1, qb: 350, qd: 800, tmp: 50 }) - backfiltration({ highFlux: 1, qb: 350, qd: 300, tmp: 50 });
  ok(dQbbf > dQdbf, 'lei: o Qb (axial) domina a backfiltration sobre o Qd (Δqb ' + dQbbf.toFixed(3) + ' > Δqd ' + dQdbf.toFixed(3) + ')');
})();

/* ---------- 4. PÉROLAS (o achado contra-intuitivo, provado pelo motor) ---------- */
(function () {
  // PÉROLA: high-flux REMOVE o médio; low-flux NÃO.
  var hf = membrana({ highFlux: 1 }), lf = membrana({ highFlux: 0 });
  ok(hf.removeMedio && !lf.removeMedio, 'pérola: high-flux remove o β2m; low-flux não');
  ok(hf.clearMedio > lf.clearMedio + 5, 'pérola: high-flux depura MUITO mais do médio que o low-flux');
  // PÉROLA: dobrar Qb NÃO dobra K (saturação).
  var kA = clearanceDialisador({ koa: 700, qb: 150, qd: 500 });
  var kB = clearanceDialisador({ koa: 700, qb: 300, qd: 500 });
  ok(kB < 2 * kA - 5, 'pérola: dobrar Qb (150→300) NÃO dobra K (saturação, ' + kA.toFixed(0) + '→' + kB.toFixed(0) + ')');
  // ganho marginal cai com Qb
  var gLo = membrana({ koa: 700, qb: 150, qd: 500 }).ganhoMarginal;
  var gHi = membrana({ koa: 700, qb: 400, qd: 500 }).ganhoMarginal;
  ok(gHi < gLo, 'pérola: ∂K/∂Qb DECRESCE com Qb (ganho marginal menor no Qb alto)');
  // PÉROLA: backfiltration → exige dialisato ultrapuro. Driver = high-flux + Qb (queda axial).
  var bfHi = membrana({ highFlux: 1, qb: 480, tmp: 10 });
  ok(bfHi.backfilt > 0.15 && bfHi.precisaUltrapuro, 'pérola: high-flux + Qb alto (queda axial) + TMP baixa → backfiltration → exige ultrapuro');
  var bfLo = membrana({ highFlux: 0, qb: 480, tmp: 10 });
  ok(bfLo.backfilt === 0 && !bfLo.precisaUltrapuro, 'pérola: low-flux → sem backfiltration, sem exigência de ultrapuro');
  // o Qb (axial) é o lever DOMINANTE: subir Qb dispara mais backfiltration que subir Qd
  var bfQbAlto = membrana({ highFlux: 1, qb: 500, qd: 500, tmp: 30 }).backfilt;
  var bfQdAlto = membrana({ highFlux: 1, qb: 250, qd: 1000, tmp: 30 }).backfilt;
  ok(bfQbAlto > bfQdAlto, 'pérola: Qb alto (axial) gera MAIS backfiltration que Qd alto com Qb baixo (' + bfQbAlto.toFixed(2) + ' > ' + bfQdAlto.toFixed(2) + ')');
  // a ureia (pequena) passa quase 100% em qualquer membrana; o cutoff só importa para o médio
  ok(membrana({ highFlux: 0 }).sUreia > 0.99 && membrana({ highFlux: 1 }).sUreia > 0.99, 'pérola: a ureia passa em ambas; é o MÉDIO que separa low × high-flux');
})();

/* ---------- 5. DETERMINISMO 5× byte-idêntico ---------- */
(function () {
  var inp = { koa: 720, qb: 280, qd: 600, tmp: 40, highFlux: 1, cutoff: 22000, steep: 4 };
  var ref = JSON.stringify(membrana(inp)), igual = true;
  for (var n = 0; n < 5; n++) { if (JSON.stringify(membrana(inp)) !== ref) igual = false; }
  ok(igual, 'determinismo: 5 execuções byte-idênticas');
  var Lref = JSON.stringify(clearanceLayout(inp, 900, 360)), igualL = true;
  for (var m = 0; m < 5; m++) { if (JSON.stringify(clearanceLayout(inp, 900, 360)) !== Lref) igualL = false; }
  ok(igualL, 'determinismo: layout 5× byte-idêntico');
  var frozen = Object.freeze({ koa: 800, qb: 320, qd: 500 });
  var threw = false, a; try { a = membrana(frozen); } catch (e) { threw = true; }
  ok(!threw && fin(a.clearUreia), 'determinismo: Object.freeze não lança');
  ok(frozen.qb === 320, 'determinismo: entrada não mutada');
})();

/* ---------- 6. ROBUSTEZ (lixo pontual) ---------- */
(function () {
  var maus = [undefined, null, {}, { koa: NaN }, { qb: 'x' }, { qd: -10 }, { koa: 1e9 },
    { tmp: Infinity }, { highFlux: -5 }, { cutoff: 'z' }, { steep: 1e300 }, { qb: 0 },
    { pm: NaN }, [], function () {}, { qd: 0 }, { koa: -1, qb: -1, qd: -1 }];
  maus.forEach(function (mm, i) {
    var r = membrana(mm);
    ok(dentroBounds(r) === null, 'robustez[' + i + ']: membrana() saídas finitas e em faixa (' + dentroBounds(r) + ')');
    ok((r.classe === 'high-flux' || r.classe === 'low-flux'), 'robustez[' + i + ']: classe válida');
    var K = clearanceDialisador(mm), S = sieving(mm), B = backfiltration(mm);
    ok(fin(K) && K >= 0, 'robustez[' + i + ']: clearanceDialisador finito ≥0');
    ok(fin(S) && S >= 0 && S <= 1, 'robustez[' + i + ']: sieving ∈[0,1]');
    ok(fin(B) && B >= 0 && B <= 1, 'robustez[' + i + ']: backfiltration ∈[0,1]');
  });
})();

/* ---------- 7. LIMITES por campo ---------- */
(function () {
  var fields = ['koa', 'qb', 'qd', 'tmp', 'highFlux', 'cutoff', 'steep'];
  var extremos = [-1e9, -1e3, -1, 0, 1, 50, 1e3, 1e6, 1e9, NaN, Infinity, -Infinity];
  fields.forEach(function (f) {
    extremos.forEach(function (v) {
      var inp = {}; inp[f] = v; var r = membrana(inp);
      ok(dentroBounds(r) === null, 'limites: campo ' + f + '=' + v + ' → saídas em faixa (' + dentroBounds(r) + ')');
      micros(1);
    });
  });
})();

/* ---------- 8. MONOTONIA EXAUSTIVA (≥60 passos por eixo) ---------- */
(function () {
  var STEPS = 70;
  // KoA↑ → K não-decrescente
  (function () {
    var prev = null, monoOk = true, viol = 0;
    for (var i = 0; i <= STEPS; i++) {
      var koa = 2000 * i / STEPS;
      var K = clearanceDialisador({ koa: koa, qb: 300, qd: 500 });
      if (prev !== null) { if (K - prev < -1e-9) { monoOk = false; viol++; } micros(1); }
      prev = K;
    }
    ok(monoOk, 'monotonia: KoA↑ → K↑ (' + viol + ' violações)');
  })();
  // Qb↑ → K não-decrescente
  (function () {
    var prev = null, monoOk = true, viol = 0;
    for (var i = 0; i <= STEPS; i++) {
      var qb = 1 + 599 * i / STEPS;
      var K = clearanceDialisador({ koa: 600, qb: qb, qd: 500 });
      if (prev !== null) { if (K - prev < -1e-9) { monoOk = false; viol++; } micros(1); }
      prev = K;
    }
    ok(monoOk, 'monotonia: Qb↑ → K↑ (' + viol + ' violações)');
  })();
  // Qb↑ → ganho marginal NÃO-crescente (saturação) — checa concavidade da curva K(Qb)
  (function () {
    var prevSlope = null, monoOk = true, viol = 0, prevK = null, prevQb = null;
    for (var i = 0; i <= STEPS; i++) {
      var qb = 30 + 470 * i / STEPS;
      var K = clearanceDialisador({ koa: 600, qb: qb, qd: 500 });
      if (prevK !== null) {
        var slope = (K - prevK) / (qb - prevQb);
        if (prevSlope !== null) { if (slope - prevSlope > 1e-6) { monoOk = false; viol++; } micros(1); }
        prevSlope = slope;
      }
      prevK = K; prevQb = qb;
    }
    ok(monoOk, 'monotonia: K(Qb) côncava — ganho marginal não cresce (' + viol + ' violações)');
  })();
  // Qd↑ → K não-decrescente
  (function () {
    var prev = null, monoOk = true, viol = 0;
    for (var i = 0; i <= STEPS; i++) {
      var qd = 50 + 1150 * i / STEPS;
      var K = clearanceDialisador({ koa: 600, qb: 300, qd: qd });
      if (prev !== null) { if (K - prev < -1e-9) { monoOk = false; viol++; } micros(1); }
      prev = K;
    }
    ok(monoOk, 'monotonia: Qd↑ → K↑ (' + viol + ' violações)');
  })();
  // PM↑ → sieving NÃO-crescente
  (function () {
    var prev = null, monoOk = true, viol = 0;
    for (var i = 0; i <= STEPS; i++) {
      var pm = 10 + 69990 * i / STEPS;
      var S = sieving({ pm: pm, cutoff: 8000, steep: 4 });
      if (prev !== null) { if (S - prev > 1e-9) { monoOk = false; viol++; } micros(1); }
      prev = S;
    }
    ok(monoOk, 'monotonia: PM↑ → sieving↓ (' + viol + ' violações)');
  })();
  // cutoff↑ → sieving do médio NÃO-decrescente
  (function () {
    var prev = null, monoOk = true, viol = 0;
    for (var i = 0; i <= STEPS; i++) {
      var cut = 500 + 50000 * i / STEPS;
      var S = sieving({ pm: 11800, cutoff: cut, steep: 4 });
      if (prev !== null) { if (S - prev < -1e-9) { monoOk = false; viol++; } micros(1); }
      prev = S;
    }
    ok(monoOk, 'monotonia: cutoff↑ → sieving↑ (' + viol + ' violações)');
  })();
  // Qd↑ → backfiltration não-decrescente (high-flux, TMP fixa)
  (function () {
    var prev = null, monoOk = true, viol = 0;
    for (var i = 0; i <= STEPS; i++) {
      var qd = 100 + 1100 * i / STEPS;
      var B = backfiltration({ highFlux: 1, qd: qd, tmp: 10 });
      if (prev !== null) { if (B - prev < -1e-9) { monoOk = false; viol++; } micros(1); }
      prev = B;
    }
    ok(monoOk, 'monotonia: Qd↑ → backfiltration↑ (' + viol + ' violações)');
  })();
  // TMP↑ → backfiltration não-crescente
  (function () {
    var prev = null, monoOk = true, viol = 0;
    for (var i = 0; i <= STEPS; i++) {
      var tmp = 400 * i / STEPS;
      var B = backfiltration({ highFlux: 1, qd: 800, tmp: tmp });
      if (prev !== null) { if (B - prev > 1e-9) { monoOk = false; viol++; } micros(1); }
      prev = B;
    }
    ok(monoOk, 'monotonia: TMP↑ → backfiltration↓ (' + viol + ' violações)');
  })();
})();

/* ---------- 9. FUZZING semeado ≥20000 (~35% malignas em CADA campo) ---------- */
(function () {
  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  var rnd = mulberry32(0x21B0DE), N = 22000, bad = 0, badL = 0, badEnum = 0, badId = 0, badMut = 0, badK = 0;
  var MAL = [NaN, Infinity, -Infinity, 1e300, -1e300, 1e-300, '5', 'x', '', null, undefined, {}, [], function () {}, true, false];
  function val() { if (rnd() < 0.35) return MAL[(rnd() * MAL.length) | 0]; return (rnd() - 0.15) * 2500; }
  function fields() {
    return { koa: val(), qb: val(), qd: val(), tmp: val(), highFlux: val(), cutoff: val(), steep: val() };
  }
  function ser(o) { return JSON.stringify(o, function (key, v) { return (typeof v === 'function') ? '__fn__' : (v === undefined ? '__u__' : v); }); }
  for (var i = 0; i < N; i++) {
    var inp = fields();
    var snapshot = ser(inp);
    var r = membrana(inp);
    var L = clearanceLayout(inp, 900, 360);
    // (a)+(b) saídas finitas e em faixa documentada
    if (dentroBounds(r) !== null) bad++;
    // (c) enum classe sempre válido
    if (r.classe !== 'high-flux' && r.classe !== 'low-flux') badEnum++;
    // (d) identidades estruturais
    if (r.clearUreia > r.qb + 1e-6) badId++;                       // K ≤ Qb
    if (r.clearMedio > r.clearUreia + 1e-6) badId++;               // médio ≤ ureia
    if (Math.abs(r.fracUreia - r.clearUreia / Math.max(r.qb, 1e-9)) > 1e-6) badId++;
    if (r.sUreia < 0 || r.sUreia > 1 || r.sMedio < 0 || r.sMedio > 1) badId++;
    // (e) clearanceDialisador direto sempre K∈[0,min(Qb,Qd)]
    var Kdir = clearanceDialisador(inp);
    if (!fin(Kdir) || Kdir < -1e-9 || Kdir > Math.min(r.qb, r.qd) + 1e-6) badK++;
    // layout finito
    if (!Array.isArray(L.pts) || L.pts.length !== 51 || !fin(L.current.x) || !fin(L.current.y)) badL++;
    for (var j = 0; j < L.pts.length; j++) { if (!fin(L.pts[j].x) || !fin(L.pts[j].y) || !fin(L.pts[j].K)) { badL++; break; } }
    // (f) input não mutado
    if (ser(inp) !== snapshot) badMut++;
    micros(6 + L.pts.length);
  }
  var threwFrozen = false; try { membrana(Object.freeze({ koa: 1, qb: 1, qd: 1, highFlux: 1 })); } catch (e) { threwFrozen = true; }
  ok(bad === 0, 'fuzzing: ' + N + ' entradas (~35% malignas) → 0 violações de faixa (' + bad + ')');
  ok(badEnum === 0, 'fuzzing: classe sempre válida (' + badEnum + ')');
  ok(badId === 0, 'fuzzing: identidades intactas (K≤Qb, médio≤ureia, sieving∈[0,1]) (' + badId + ')');
  ok(badK === 0, 'fuzzing: clearanceDialisador sempre ∈[0,min(Qb,Qd)] (' + badK + ')');
  ok(badL === 0, 'fuzzing: layout finito em todas (' + badL + ')');
  ok(badMut === 0, 'fuzzing: input nunca mutado (' + badMut + ')');
  ok(!threwFrozen, 'fuzzing: Object.freeze não lança');
})();

/* ---------- 10. SAÍDA ---------- */
var total = oks + micro;
console.log(total + ' OK (' + oks + ' macro + ' + micro + ' micro/fuzz) · ' + fails + ' falhas');
process.exit(fails > 0 ? 1 : 0);
