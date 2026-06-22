/* FILTRA · M19 — robustez AMPLIADA (0 falhas ou não entra)
 * Além do padrão §6: leis multiponto estritas, testes METAMÓRFICOS (propriedade) e
 * fuzzing 20000 + 2ª varredura de monotonicidade em pares aleatórios. */
var M = require('./model19.js');
var transport = M.transport, transportLayout = M.transportLayout, sizeDiffusion = M.sizeDiffusion, sievingCoef = M.sievingCoef;
var oks = 0, fails = 0;
function ok(c, m) { if (c) oks++; else { fails++; console.log('  FALHA: ' + m); } }
function near(a, b, t) { return Math.abs(a - b) <= (t || 1e-7); }
function fin(x) { return typeof x === 'number' && isFinite(x); }

/* 1. LINHA DE BASE — faixas fisiológicas conhecidas */
(function () {
  var u = transport({ MW: 60 });            // ureia: HD difusiva
  ok(u.Kdiff > 130 && u.Kdiff <= u.Qb, 'base: ureia tem clearance difusivo alto');
  ok(u.dominante === 'difusão', 'base: na ureia a difusão domina');
  ok(u.sieving > 0.99, 'base: ureia passa livre (sieving ~1)');
  var alb = transport({ MW: 66000 });       // albumina: rejeitada
  ok(alb.sieving === 0, 'base: albumina rejeitada (sieving 0)');
  ok(alb.Kconv < 1e-9, 'base: convecção não remove albumina');
  ok(transport({}).Jv >= 0 && transport({}).Qeff > 0, 'base: Jv≥0 e Qeff>0');
})();

/* 2. IDENTIDADES — valem SEMPRE (tol 1e-7) */
(function () {
  for (var i = 0; i < 40; i++) {
    var MW = 30 + i * 1700, KoA = 100 + i * 40, Qb = 100 + i * 10, Qd = 200 + i * 15, TMP = i * 8, Kuf = i * 2;
    var r = transport({ MW: MW, KoA: KoA, Qb: Qb, Qd: Qd, TMP: TMP, Kuf: Kuf });
    ok(near(r.Jv, (Math.min(Kuf, 100) / 60) * Math.min(TMP, 500)), 'id: Jv = (Kuf/60)·TMP');
    ok(near(r.Qeff, (r.Qb * r.Qd) / (r.Qb + r.Qd)), 'id: Qeff = Qb·Qd/(Qb+Qd)');
    ok(near(r.Kconv, r.Jv * r.sieving), 'id: Kconv = Jv·sieving');
    ok(near(r.sizeD, sizeDiffusion(r.MW)) && near(r.sieving, sievingCoef(r.MW)), 'id: fatores de tamanho consistentes');
    ok(r.Ktotal <= r.Qb + 1e-9, 'id: clearance total ≤ fluxo de sangue');
    ok(r.Kdiff <= r.sizeD * r.Qeff + 1e-9, 'id: Kdiff ≤ sizeD·Qeff (limite difusivo)');
  }
  ok(near(transport({ MW: 60, Kuf: 0, TMP: 0, adsCap: 0 }).Kconv, 0), 'id: sem UF nem adsorção → só difusão');
})();

/* 3. LEIS — monotonicidade estrita, multiponto */
(function () {
  // KoA↑ → Kdiff↑ (abaixo do teto)
  var prevK = -1, monoK = true; for (var koa = 50; koa <= 1500; koa += 100) { var v = transport({ MW: 60, KoA: koa, TMP: 0, Kuf: 0 }).Kdiff; if (v <= prevK) monoK = false; prevK = v; } ok(monoK, 'lei: KoA↑ → Kdiff↑ (multiponto)');
  // Qb↑ → Qeff↑ → Kdiff↑
  var prevB = -1, monoB = true; for (var qb = 100; qb <= 500; qb += 40) { var vb = transport({ MW: 60, Qb: qb, TMP: 0, Kuf: 0 }).Kdiff; if (vb <= prevB) monoB = false; prevB = vb; } ok(monoB, 'lei: Qb↑ → Kdiff↑ (multiponto)');
  // Qd↑ → Kdiff↑
  var prevD = -1, monoD = true; for (var qd = 100; qd <= 900; qd += 80) { var vd = transport({ MW: 60, Qd: qd, TMP: 0, Kuf: 0 }).Kdiff; if (vd <= prevD) monoD = false; prevD = vd; } ok(monoD, 'lei: Qd↑ → Kdiff↑ (multiponto)');
  // TMP↑ → Jv↑ (estrito) e Kconv↑ (sieving>0)
  var prevJ = -1, monoJ = true; for (var tmp = 0; tmp <= 300; tmp += 25) { var vj = transport({ MW: 60, Kuf: 30, TMP: tmp }).Jv; if (vj < prevJ) monoJ = false; prevJ = vj; } ok(monoJ, 'lei: TMP↑ → Jv↑ (multiponto)');
  // Kuf↑ → Jv↑
  ok(transport({ Kuf: 80, TMP: 50 }).Jv > transport({ Kuf: 10, TMP: 50 }).Jv, 'lei: Kuf↑ → Jv↑');
  // MW↑ → sizeD↓, sieving↓ (não-crescentes), Kdiff↓
  var prevSz = 2, prevSv = 2, prevKd = 1e9, monoMW = true; for (var mw = 60; mw <= 70000; mw += 3500) { var rm = transport({ MW: mw, TMP: 0, Kuf: 0 }); if (rm.sizeD > prevSz + 1e-12 || rm.sieving > prevSv + 1e-12 || rm.Kdiff > prevKd + 1e-9) monoMW = false; prevSz = rm.sizeD; prevSv = rm.sieving; prevKd = rm.Kdiff; } ok(monoMW, 'lei: MW↑ → sizeD/sieving/Kdiff não aumentam (multiponto)');
})();

/* 4. PÉROLAS — achados contra-intuitivos, provados pelo motor */
(function () {
  // na HD típica (baixo TMP), a molécula PEQUENA é removida sobretudo por difusão
  var hd = { KoA: 600, Qb: 300, Qd: 500, TMP: 30, Kuf: 8 };
  var pequeno = transport(Object.assign({ MW: 60 }, hd));
  ok(pequeno.Kdiff > pequeno.Kconv, 'pérola: na HD típica, a molécula PEQUENA é removida por difusão');
  // o CROSSOVER: na HF de alto fluxo, a molécula MÉDIA passa a ser removida por convecção
  var hf = { KoA: 600, Qb: 300, Qd: 500, TMP: 200, Kuf: 60 };
  var medio = transport(Object.assign({ MW: 12000 }, hf));
  ok(medio.Kconv > medio.Kdiff, 'pérola: na molécula MÉDIA a convecção domina (crossover)');
  // UF independe da concentração: Jv não muda com MW
  ok(near(transport({ MW: 60, Kuf: 40, TMP: 100 }).Jv, transport({ MW: 50000, Kuf: 40, TMP: 100 }).Jv), 'pérola: UF (Jv) independe do tamanho/concentração');
  // alto-fluxo (Kuf alto) habilita a convecção; baixo-fluxo quase não
  ok(transport({ MW: 12000, Kuf: 60, TMP: 150 }).Kconv > 5 * transport({ MW: 12000, Kuf: 8, TMP: 150 }).Kconv, 'pérola: high-flux (Kuf↑) habilita convecção da molécula média');
  // adsorção satura: saturação 1 → contribuição zero
  ok(transport({ adsCap: 50, saturation: 0 }).Kads > 0 && near(transport({ adsCap: 50, saturation: 1 }).Kads, 0), 'pérola: adsorção satura (capacidade esgota)');
})();

/* 5. DETERMINISMO — mesma entrada → saída idêntica; freeze não muta */
(function () {
  var inp = { MW: 11800, KoA: 700, Qb: 350, Qd: 600, TMP: 120, Kuf: 50, adsCap: 10, saturation: 0.3 };
  ok(JSON.stringify(transport(inp)) === JSON.stringify(transport(inp)), 'determinismo: saída idêntica');
  // determinismo em 500 entradas aleatórias semeadas (hash acumulado estável)
  function mb(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function hashRun(seed) { var r = mb(seed), acc = ''; for (var i = 0; i < 500; i++) { var o = transport({ MW: r() * 70000, KoA: r() * 2000, Qb: 50 + r() * 550, Qd: 50 + r() * 950, TMP: r() * 400, Kuf: r() * 100, adsCap: r() * 80, saturation: r() }); acc += o.Ktotal.toFixed(6) + '|' + o.Jv.toFixed(6) + ';'; } return acc; }
  ok(hashRun(123) === hashRun(123), 'determinismo: 500 entradas semeadas → hash idêntico');
  var frozen = Object.freeze({ MW: 12000, TMP: 100 });
  var a, threw = false; try { a = transport(frozen); } catch (e) { threw = true; }
  ok(!threw && fin(a.Ktotal), 'determinismo: Object.freeze não lança');
  ok(frozen.MW === 12000, 'determinismo: entrada não mutada');
})();

/* 6. ROBUSTEZ — lixo entra, finito sai, clamps respeitados */
(function () {
  var maus = [undefined, null, {}, { MW: NaN }, { MW: 'x' }, { MW: -5 }, { KoA: Infinity }, { Qb: 0 },
    { Qd: -10 }, { TMP: NaN }, { Kuf: 1e9 }, { MW: 1e12 }, { saturation: 9 }, { adsCap: -3 }];
  maus.forEach(function (m, i) {
    var r = transport(m);
    ok(fin(r.Kdiff) && fin(r.Kconv) && fin(r.Kads) && fin(r.Ktotal) && fin(r.Jv) && fin(r.Qeff), 'robustez[' + i + ']: tudo finito');
    ok(r.Ktotal >= 0 && r.Ktotal <= r.Qb + 1e-9 && r.sieving >= 0 && r.sieving <= 1 && r.sizeD > 0 && r.sizeD <= 1, 'robustez[' + i + ']: clamps');
    ok(typeof r.dominante === 'string', 'robustez[' + i + ']: dominante string');
  });
})();

/* 7. FUZZING ≥20000 — PRNG semeado, 30% maligno */
(function () {
  function mb(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  var rnd = mb(0x19A19), N = 20000, bad = 0;
  function v(scale) { var r = rnd(); if (r < 0.3) { var pool = [NaN, Infinity, -Infinity, 1e12, -1e12, 'x', null, undefined, '']; return pool[(rnd() * pool.length) | 0]; } return r * scale; }
  for (var i = 0; i < N; i++) {
    var inp = { MW: v(80000), KoA: v(2200), Qb: v(650), Qd: v(1100), TMP: v(550), Kuf: v(110), adsCap: v(90), saturation: v(1.2) };
    var r = transport(inp); var L = transportLayout(inp, 900, 360);
    var good = fin(r.Kdiff) && fin(r.Kconv) && fin(r.Kads) && fin(r.Ktotal) && fin(r.Jv) && fin(r.Qeff) &&
      r.Ktotal >= 0 && r.Ktotal <= r.Qb + 1e-9 &&
      r.sieving >= 0 && r.sieving <= 1 && r.sizeD > 0 && r.sizeD <= 1 &&
      r.Kdiff >= 0 && r.Kconv >= 0 && r.Kads >= 0 && r.Jv >= 0 &&
      L && Array.isArray(L.diff) && L.diff.length === 65 && Array.isArray(L.conv) && Array.isArray(L.tot) && fin(L.current.y);
    if (!good) bad++;
  }
  ok(bad === 0, 'fuzzing: ' + N + ' entradas (30% malignas) → 0 violações (' + bad + ')');
})();

/* 8. METAMÓRFICO — propriedades em PARES aleatórios (relações que devem se manter) */
(function () {
  function mb(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  var rnd = mb(0x7E57), N = 12000, viol = 0;
  for (var i = 0; i < N; i++) {
    var base = { MW: 30 + rnd() * 60000, KoA: rnd() * 1800, Qb: 80 + rnd() * 400, Qd: 120 + rnd() * 800, TMP: rnd() * 300, Kuf: rnd() * 90, adsCap: rnd() * 40, saturation: rnd() };
    var dTMP = rnd() * 100, dMW = rnd() * 10000, dKoA = rnd() * 400, dSat = rnd() * (1 - base.saturation);
    // (a) ↑TMP nunca reduz Jv nem Kconv
    var aHi = transport(Object.assign({}, base, { TMP: base.TMP + dTMP }));
    var aLo = transport(base);
    if (aHi.Jv < aLo.Jv - 1e-9 || aHi.Kconv < aLo.Kconv - 1e-9) viol++;
    // (b) ↑MW nunca aumenta o sieving nem o sizeD
    var bHi = transport(Object.assign({}, base, { MW: base.MW + dMW }));
    if (bHi.sieving > aLo.sieving + 1e-12 || bHi.sizeD > aLo.sizeD + 1e-12) viol++;
    // (c) ↑KoA nunca reduz Kdiff
    var cHi = transport(Object.assign({}, base, { KoA: base.KoA + dKoA }));
    if (cHi.Kdiff < aLo.Kdiff - 1e-9) viol++;
    // (d) ↑saturação nunca aumenta Kads
    var dHi = transport(Object.assign({}, base, { saturation: base.saturation + dSat }));
    if (dHi.Kads > aLo.Kads + 1e-9) viol++;
  }
  ok(viol === 0, 'metamórfico: ' + (N * 4) + ' propriedades em pares aleatórios → 0 violações (' + viol + ')');
})();

/* 9. SAÍDA */
console.log(oks + ' OK · ' + fails + ' falhas');
process.exit(fails > 0 ? 1 : 0);
