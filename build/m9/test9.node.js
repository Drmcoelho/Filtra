/* FILTRA · M9 — robustez (0 falhas ou não entra) */
var M = require('./model9.js');
var volume = M.volume, vceFrom = M.vceFrom, volumeLayout = M.volumeLayout, sig = M.sig;
var oks = 0, fails = 0;
function ok(c, m) { if (c) oks++; else { fails++; console.log('  FALHA: ' + m); } }
function near(a, b, t) { return Math.abs(a - b) <= (t || 1e-7); }
function fin(x) { return typeof x === 'number' && isFinite(x); }

/* 1. LINHA DE BASE — faixas fisiológicas com euvolemia (defaults) */
(function () {
  var r = volume({});
  ok(near(r.vce, 1, 1e-6), 'base: VCE normal (~1)');
  ok(r.naSerico > 138 && r.naSerico < 142, 'base: Na sérico ~140 mEq/L');
  ok(r.tonicidade > 276 && r.tonicidade < 284, 'base: tonicidade ~280 mOsm/kg');
  ok(r.disnatremia === 'normonatremia', 'base: normonatremia');
  ok(r.feNa > 0.3 && r.feNa < 1.5, 'base: FE_Na fisiológico (<1,5%)');
  ok(r.uNa > 30 && r.uNa < 120, 'base: U_Na intermediário');
  ok(!r.edema && !r.terceiroEspaco, 'base: sem edema');
  ok(r.classe === 'euvolemia', 'base: euvolemia');
  ok(r.raasSns > 1 && r.natriuretico > 1, 'base: RAAS e ANP presentes no basal');
})();

/* 2. IDENTIDADES — relações estruturais que valem SEMPRE */
(function () {
  for (var i = 0; i < 30; i++) {
    var e = i / 14;
    var r = volume({ enchimento: e });
    ok(near(r.vce, vceFrom(e, 4.4, 0, 1), 1e-9), 'id: VCE = vceFrom(enchimento,...)');
    ok(near(r.tonicidade, 2 * r.naSerico, 1e-9) || r.tonicidade === 350 || r.tonicidade === 210, 'id: tonicidade = 2·Na (fora dos clamps)');
    ok(r.vce >= 0.05 && r.vce <= 1.8, 'id: VCE nos clamps');
    ok(r.feNa >= 0.05 && r.feNa <= 8, 'id: FE_Na nos clamps');
    ok(r.uNa >= 2 && r.uNa <= 160, 'id: U_Na nos clamps');
    ok(r.naSerico >= 105 && r.naSerico <= 175, 'id: Na sérico nos clamps');
    // avido é coerente com sua definição
    ok(r.avido === ((r.feNa < 1) && (r.uNa < 20)), 'id: avido ≡ (FE_Na<1 & U_Na<20)');
  }
  ok(near(sig(0, 0, 1), 0.5, 1e-9), 'id: sig(0,0,k)=0.5');
  ok(near(volume({}).vce, 1, 1e-6), 'id: estado basal VCE=1');
})();

/* 3. LEIS — monotonicidade (cada termo no sentido certo) */
(function () {
  // enchimento arterial ↓ → VCE ↓
  ok(volume({ enchimento: 0.4 }).vce < volume({ enchimento: 1 }).vce, 'lei: enchimento↓ → VCE↓');
  // VCE ↓ → barorreceptor descarregado ↓
  ok(volume({ enchimento: 0.4 }).sinalBaro < volume({ enchimento: 1 }).sinalBaro, 'lei: VCE↓ → sinal barorreceptor↓');
  // VCE ↓ → RAAS/SNS ↑ (retém Na)
  ok(volume({ enchimento: 0.4 }).raasSns > volume({ enchimento: 1 }).raasSns, 'lei: VCE↓ → RAAS/SNS↑');
  // VCE ↑ → ANP/BNP ↑ (estiramento atrial)
  ok(volume({ enchimento: 1.6 }).natriuretico > volume({ enchimento: 1 }).natriuretico, 'lei: VCE↑ → ANP/BNP↑');
  // RAAS alto → FE_Na ↓ (retenção ávida)
  ok(volume({ enchimento: 0.4 }).feNa < volume({ enchimento: 1 }).feNa, 'lei: RAAS↑ → FE_Na↓ (ávido)');
  // RAAS alto → U_Na ↓
  ok(volume({ enchimento: 0.4 }).uNa < volume({ enchimento: 1 }).uNa, 'lei: RAAS↑ → U_Na↓');
  // albumina ↓ → VCE ↓ (oncótica perde o plasma)
  ok(volume({ albumina: 1.8 }).vce < volume({ albumina: 4.4 }).vce, 'lei: albumina↓ → VCE↓');
  // leak ↑ → VCE ↓ (terceiro espaço)
  ok(volume({ leak: 0.6 }).vce < volume({ leak: 0 }).vce, 'lei: leak↑ → VCE↓');
  // Na total ↑ → ECF expande
  ok(volume({ naTotal: 1.7 }).ecfExpansao > volume({ naTotal: 1 }).ecfExpansao, 'lei: Na total↑ → ECF expande');
  // ingesta de Na ↑ → balanço de Na mais positivo (retém)
  ok(volume({ ingestaNa: 3 }).balancoNa > volume({ ingestaNa: 1 }).balancoNa, 'lei: ingesta Na↑ → balanço Na↑');
  // água corporal ↑ → Na sérico ↓ (diluição) — eixo da ÁGUA
  ok(volume({ aguaCorporal: 1.3 }).naSerico < volume({ aguaCorporal: 1 }).naSerico, 'lei: água↑ → Na sérico↓ (diluição)');
  // água corporal ↓ → Na sérico ↑ (concentração)
  ok(volume({ aguaCorporal: 0.8 }).naSerico > volume({ aguaCorporal: 1 }).naSerico, 'lei: água↓ → Na sérico↑');
})();

/* 4. PÉROLAS — os achados contra-intuitivos, provados pelo motor */
(function () {
  // (1) hiponatremia ≠ falta de sal: água em excesso DILUI mesmo com Na total normal/alto
  var siadh = volume({ aguaCorporal: 1.35, naTotal: 1.0 });
  ok(siadh.naSerico < 135 && siadh.classe !== 'hipovolemia', 'pérola 1: água↑ → hiponatremia SEM hipovolemia (não é falta de sal)');
  // o eixo é ORTOGONAL: mover o volume (naTotal) quase não move a natremia
  var volBaixo = volume({ naTotal: 0.6 }).naSerico, volAlto = volume({ naTotal: 1.6 }).naSerico;
  ok(Math.abs(volAlto - volBaixo) < 5, 'pérola 1b: volume (naTotal) ⟂ tonicidade — natremia quase intacta (Δ<5)');

  // (2) edema = retenção de Na porque o VCE é SENTIDO baixo apesar do total ALTO (underfilling)
  var icc = volume({ enchimento: 0.45, naTotal: 1.5, ingestaNa: 2 });
  ok(icc.vce < 0.85 && icc.naTotal > 1.2 && icc.edema && icc.avido, 'pérola 2: ICC → VCE↓ com Na total↑ → rim retém → edema (underfilling)');
  ok(icc.classe === 'edema-underfill', 'pérola 2b: classe edema-underfill (VCE baixo, total alto)');

  // (3) U_Na/FE_Na revela a leitura de volume do rim: ávido na hipoperfusão, natriurético na sobrecarga
  var avido = volume({ enchimento: 0.4 });
  var natri = volume({ naTotal: 1.7, ingestaNa: 3, enchimento: 1.1 });
  ok(avido.feNa < 1 && avido.uNa < 20, 'pérola 3: VCE↓ → rim ávido (FE_Na<1%, U_Na<20)');
  ok(natri.feNa > avido.feNa && natri.natriuretico > avido.natriuretico, 'pérola 3b: VCE↑ → rim natriurético (FE_Na↑)');

  // (4) ANP/BNP é o contrapeso natriurético do RAAS (sobem em sentidos opostos com o VCE)
  var baixo = volume({ enchimento: 0.4 }), alto = volume({ enchimento: 1.6 });
  ok(baixo.raasSns > alto.raasSns && baixo.natriuretico < alto.natriuretico, 'pérola 4: RAAS e ANP/BNP são contrapesos (opostos no VCE)');
})();

/* 5. DETERMINISMO */
(function () {
  var inp = { enchimento: 0.5, albumina: 2.2, leak: 0.3, naTotal: 1.5, ingestaNa: 2, aguaCorporal: 1.1 };
  ok(JSON.stringify(volume(inp)) === JSON.stringify(volume(inp)), 'determinismo: saída idêntica');
  var frozen = Object.freeze({ enchimento: 0.4, naTotal: 1.4 });
  var a, threw = false; try { a = volume(frozen); } catch (e) { threw = true; }
  ok(!threw && fin(a.vce) && fin(a.naSerico) && fin(a.feNa), 'determinismo: Object.freeze não lança');
  ok(frozen.enchimento === 0.4, 'determinismo: entrada não mutada');
})();

/* 6. ROBUSTEZ */
(function () {
  var maus = [undefined, null, {}, { enchimento: NaN }, { enchimento: 'x' }, { albumina: Infinity }, { leak: -5 },
    { naTotal: -1 }, { ingestaNa: 9e9 }, { aguaCorporal: 'y' }, { leak: NaN }, { enchimento: 1e9, naTotal: 1e9 }, { aguaCorporal: -1e12 }];
  maus.forEach(function (m, i) {
    var r = volume(m);
    ok(fin(r.vce) && fin(r.sinalBaro) && fin(r.raasSns) && fin(r.natriuretico) && fin(r.feNa) && fin(r.uNa) &&
       fin(r.ecfExpansao) && fin(r.forcaEdema) && fin(r.naSerico) && fin(r.tonicidade), 'robustez[' + i + ']: finito');
    ok(r.vce >= 0.05 && r.vce <= 1.8 && r.feNa >= 0.05 && r.feNa <= 8 && r.uNa >= 2 && r.uNa <= 160, 'robustez[' + i + ']: VCE/FE_Na/U_Na nos clamps');
    ok(r.naSerico >= 105 && r.naSerico <= 175 && r.raasSns >= 0 && r.raasSns <= 4 && r.natriuretico >= 0 && r.natriuretico <= 4, 'robustez[' + i + ']: saídas nos clamps');
    ok(typeof r.edema === 'boolean' && typeof r.avido === 'boolean' && typeof r.classe === 'string', 'robustez[' + i + ']: flags/classe bem-formados');
  });
})();

/* 7. FUZZING ≥5000 (PRNG semeado, ~30% malignas) */
(function () {
  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  var rnd = mulberry32(0x9A37), N = 6000, bad = 0;
  function val(scale) { var r = rnd(); if (r < 0.3) { var pool = [NaN, Infinity, -Infinity, 1e12, -1e12, 'x', null, undefined]; return pool[(rnd() * pool.length) | 0]; } return (r - 0.1) * scale; }
  for (var i = 0; i < N; i++) {
    var inp = { enchimento: val(2.4), albumina: val(7), leak: val(1.4), naTotal: val(2.4), ingestaNa: val(5), aguaCorporal: val(2.2) };
    var r = volume(inp); var L = volumeLayout(inp, 900, 360);
    var good = fin(r.vce) && fin(r.sinalBaro) && fin(r.raasSns) && fin(r.natriuretico) && fin(r.balancoEfetor) &&
      fin(r.feNa) && fin(r.uNa) && fin(r.ecfExpansao) && fin(r.balancoNa) && fin(r.forcaEdema) &&
      fin(r.naSerico) && fin(r.tonicidade) &&
      r.vce >= 0.05 && r.vce <= 1.8 && r.feNa >= 0.05 && r.feNa <= 8 && r.uNa >= 2 && r.uNa <= 160 &&
      r.raasSns >= 0 && r.raasSns <= 4 && r.natriuretico >= 0 && r.natriuretico <= 4 &&
      r.naSerico >= 105 && r.naSerico <= 175 && r.tonicidade >= 210 && r.tonicidade <= 350 &&
      r.sinalBaro >= 0 && r.sinalBaro <= 1 &&
      typeof r.edema === 'boolean' && typeof r.avido === 'boolean' &&
      // identidade sob fuzzing: avido coerente
      r.avido === ((r.feNa < 1) && (r.uNa < 20)) &&
      Array.isArray(L.pts) && L.pts.length === 57 && fin(L.current.y) && fin(L.current.x);
    if (!good) bad++;
  }
  ok(bad === 0, 'fuzzing: ' + N + ' entradas (30% malignas) → 0 violações (' + bad + ')');
})();

/* 8. SAÍDA */
console.log(oks + ' OK · ' + fails + ' falhas');
process.exit(fails > 0 ? 1 : 0);
