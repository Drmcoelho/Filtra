/* FILTRA · M14 — robustez (0 falhas ou não entra) */
var M = require('./model14.js');
var endocrino = M.endocrino, reninaFrom = M.reninaFrom, endocrinoLayout = M.endocrinoLayout, sig = M.sig;
var oks = 0, fails = 0;
function ok(c, m) { if (c) oks++; else { fails++; console.log('  FALHA: ' + m); } }
function near(a, b, t) { return Math.abs(a - b) <= (t || 1e-7); }
function fin(x) { return typeof x === 'number' && isFinite(x); }

/* 1. LINHA DE BASE — faixas fisiológicas com o rim normal (tudo = 1) */
(function () {
  var r = endocrino({});
  ok(near(r.renina, 1, 1e-6), 'base: renina normal (~1) no estado basal');
  ok(near(r.angII, 1, 1e-6), 'base: AngII ~1 com ECA normal');
  ok(r.aldosterona > 0.9 && r.aldosterona < 1.1, 'base: aldosterona ~1');
  ok(r.plasmaK > 4.0 && r.plasmaK < 4.4, 'base: K plasmático ~4,2');
  ok(r.hb > 9 && r.hb < 12, 'base: Hb normal-baixa fisiológica (~10–11)');
  ok(r.calcio > 8.5 && r.calcio < 9.5, 'base: cálcio ~9 mg/dL');
  ok(r.classe === 'normal', 'base: classe normal');
  ok(!r.anemiaRenal && !r.hiperPTH2, 'base: sem anemia renal nem hiperPTH2');
})();

/* 2. IDENTIDADES — relações estruturais que valem SEMPRE */
(function () {
  for (var i = 0; i < 30; i++) {
    var p = i / 15, r = endocrino({ perfusao: p });
    ok(near(r.renina, reninaFrom(p, 1, 1), 1e-9), 'id: renina = reninaFrom(perfusao,1,1)');
    ok(near(r.angI, r.renina, 1e-9), 'id: AngI proporcional à renina');
    ok(near(r.angII, r.angI * r.eca, 1e-9), 'id: AngII = AngI · ECA');
    ok(r.renina >= 0 && r.renina <= 4, 'id: renina em [0,4]');
    ok(r.plasmaK >= 2.8 && r.plasmaK <= 7.5, 'id: K nos clamps');
    ok(r.hb >= 5 && r.hb <= 17, 'id: Hb nos clamps');
    ok(r.calcio >= 5.5 && r.calcio <= 11.5, 'id: cálcio nos clamps');
  }
  ok(near(sig(0, 0, 1), 0.5, 1e-9), 'id: sig(0,0,k)=0.5');
  ok(near(reninaFrom(1, 1, 1), 1, 1e-9), 'id: reninaFrom basal = 1');
})();

/* 3. LEIS — monotonicidade (cada termo no sentido certo) */
(function () {
  // barorreceptor: ↓pressão de perfusão → ↑renina
  ok(endocrino({ perfusao: 0.4 }).renina > endocrino({ perfusao: 1 }).renina, 'lei: perfusao↓ → renina↑ (barorreceptor)');
  // mácula densa: ↓NaCl → ↑renina
  ok(endocrino({ naclMD: 0.4 }).renina > endocrino({ naclMD: 1 }).renina, 'lei: NaCl↓ → renina↑ (mácula densa)');
  // simpático: ↑tônus → ↑renina
  ok(endocrino({ simpatico: 2.5 }).renina > endocrino({ simpatico: 1 }).renina, 'lei: simpático↑ → renina↑ (β1)');
  // AngII → aldosterona
  ok(endocrino({ perfusao: 0.4 }).aldosterona > endocrino({ perfusao: 1 }).aldosterona, 'lei: AngII↑ → aldosterona↑');
  // aldosterona ↑ → K ↓
  ok(endocrino({ perfusao: 0.3 }).plasmaK < endocrino({ perfusao: 1 }).plasmaK, 'lei: aldo↑ → K↓');
  // IECA (ECA↓) → AngII↓
  ok(endocrino({ eca: 0.2, perfusao: 0.5 }).angII < endocrino({ eca: 1, perfusao: 0.5 }).angII, 'lei: ECA↓ (IECA) → AngII↓');
  // hipóxia (o2↓) → EPO↑ (rim íntegro)
  ok(endocrino({ o2: 0.5 }).epo > endocrino({ o2: 1 }).epo, 'lei: hipóxia → EPO↑');
  // massa de néfrons ↓ → EPO ↓ (fábrica perdida)
  ok(endocrino({ nefrons: 0.2 }).epo < endocrino({ nefrons: 1 }).epo, 'lei: néfrons↓ → EPO↓');
  // massa de néfrons ↓ → calcitriol ↓ (1-α-hidroxilase perdida)
  ok(endocrino({ nefrons: 0.2 }).calcitriol < endocrino({ nefrons: 1 }).calcitriol, 'lei: néfrons↓ → calcitriol↓');
  // calcitriol ↓ → cálcio ↓
  ok(endocrino({ nefrons: 0.2 }).calcio < endocrino({ nefrons: 1 }).calcio, 'lei: calcitriol↓ → Ca↓');
  // Ang II constringe a eferente → defende P_GC/TFG vs sem RAAS
  ok(endocrino({ perfusao: 0.6 }).tonusEferente > endocrino({ perfusao: 0.6, eca: 0.1 }).tonusEferente, 'lei: RAAS ativo → eferente mais constrita');
})();

/* 4. PÉROLAS — os achados contra-intuitivos, provados pelo motor */
(function () {
  // (1) o rim lê VOLUME/pressão (perfusao/NaCl), não a concentração de Na: perfusão baixa dispara renina
  var pr = endocrino({ perfusao: 0.4 });
  ok(pr.renina > 1.5 && pr.aldosterona > 1, 'pérola 1: hipoperfusão → renina/aldo↑ (lê o volume efetivo)');
  // (2) Ang II DEFENDE a TFG pela eferente: ao bloquear a ECA na hipoperfusão, a TFG CAI
  var comRAAS = endocrino({ perfusao: 0.55 });
  var semRAAS = endocrino({ perfusao: 0.55, eca: 0.1 });
  ok(semRAAS.tfg < comRAAS.tfg, 'pérola 2: IECA na hipoperfusão → TFG cai (a eferente defendia a TFG)');
  // (3) anemia da DRC = perda da fábrica de EPO
  var drc = endocrino({ nefrons: 0.2, o2: 1 });
  ok(drc.epo < 0.6 && drc.anemiaRenal, 'pérola 3: DRC → EPO↓ → anemia renal (fábrica perdida)');
  // (4) DRC-DMO: perda da ativação de vit D → hiperPTH secundário
  var dmo = endocrino({ nefrons: 0.2, pth: 1 });
  ok(dmo.calcitriol < 0.8 && dmo.hiperPTH2, 'pérola 4: DRC → calcitriol↓ → hiperPTH secundário');
})();

/* 5. DETERMINISMO */
(function () {
  var inp = { perfusao: 0.6, naclMD: 0.7, simpatico: 1.5, o2: 0.8, nefrons: 0.5, eca: 0.3, pth: 2 };
  ok(JSON.stringify(endocrino(inp)) === JSON.stringify(endocrino(inp)), 'determinismo: saída idêntica');
  var frozen = Object.freeze({ perfusao: 0.4, nefrons: 0.3 });
  var a, threw = false; try { a = endocrino(frozen); } catch (e) { threw = true; }
  ok(!threw && fin(a.renina) && fin(a.calcio), 'determinismo: Object.freeze não lança');
  ok(frozen.perfusao === 0.4, 'determinismo: entrada não mutada');
})();

/* 6. ROBUSTEZ */
(function () {
  var maus = [undefined, null, {}, { perfusao: NaN }, { perfusao: 'x' }, { naclMD: Infinity }, { simpatico: -5 },
    { o2: -1 }, { nefrons: 9 }, { eca: 'y' }, { pth: NaN }, { perfusao: 1e9, nefrons: 1e9 }, { o2: -1e12 }];
  maus.forEach(function (m, i) {
    var r = endocrino(m);
    ok(fin(r.renina) && fin(r.angII) && fin(r.aldosterona) && fin(r.hb) && fin(r.calcio) && fin(r.plasmaK), 'robustez[' + i + ']: finito');
    ok(r.renina >= 0 && r.renina <= 4 && r.angII >= 0 && r.angII <= 4, 'robustez[' + i + ']: RAAS nos clamps');
    ok(r.hb >= 5 && r.hb <= 17 && r.calcio >= 5.5 && r.calcio <= 11.5 && r.plasmaK >= 2.8 && r.plasmaK <= 7.5, 'robustez[' + i + ']: saídas nos clamps');
  });
})();

/* 7. FUZZING ≥5000 (PRNG semeado, ~30% malignas) */
(function () {
  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  var rnd = mulberry32(0x14E2), N = 6000, bad = 0;
  function val() { var r = rnd(); if (r < 0.3) { var pool = [NaN, Infinity, -Infinity, 1e12, -1e12, 'x', null, undefined]; return pool[(rnd() * pool.length) | 0]; } return (r - 0.1) * 4; }
  for (var i = 0; i < N; i++) {
    var inp = { perfusao: val(), naclMD: val(), simpatico: val(), o2: val(), nefrons: val(), eca: val(), pth: val() };
    var r = endocrino(inp); var L = endocrinoLayout(inp, 900, 360);
    var good = fin(r.renina) && fin(r.angI) && fin(r.angII) && fin(r.aldosterona) && fin(r.tfg) &&
      fin(r.epo) && fin(r.hb) && fin(r.calcitriol) && fin(r.calcio) && fin(r.plasmaK) && fin(r.pGC) &&
      r.renina >= 0 && r.renina <= 4 && r.angII >= 0 && r.angII <= 4 && r.aldosterona >= 0 && r.aldosterona <= 3 &&
      r.hb >= 5 && r.hb <= 17 && r.calcio >= 5.5 && r.calcio <= 11.5 && r.plasmaK >= 2.8 && r.plasmaK <= 7.5 &&
      r.epo >= 0 && r.epo <= 4 &&
      // identidades sob fuzzing
      near(r.angII, r.angI * r.eca, 1e-6) && near(r.renina, r.angI, 1e-6) &&
      Array.isArray(L.pts) && L.pts.length === 57 && fin(L.current.y);
    if (!good) bad++;
  }
  ok(bad === 0, 'fuzzing: ' + N + ' entradas (30% malignas) → 0 violações (' + bad + ')');
})();

/* 8. SAÍDA */
console.log(oks + ' OK · ' + fails + ' falhas');
process.exit(fails > 0 ? 1 : 0);
