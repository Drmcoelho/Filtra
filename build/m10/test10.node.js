/* FILTRA · M10 — robustez (0 falhas ou não entra) */
var M = require('./model10.js');
var agua = M.agua, adhFrom = M.adhFrom, aguaLayout = M.aguaLayout, sig = M.sig;
var oks = 0, fails = 0;
function ok(c, m) { if (c) oks++; else { fails++; console.log('  FALHA: ' + m); } }
function near(a, b, t) { return Math.abs(a - b) <= (t || 1e-7); }
function fin(x) { return typeof x === 'number' && isFinite(x); }

/* 1. LINHA DE BASE — faixas fisiológicas no estado euvolêmico (defaults) */
(function () {
  var r = agua({});
  ok(near(r.naSerico, 140, 1e-6), 'base: Na sérico ~140 mEq/L');
  ok(near(r.tonicidade, 280, 1e-6), 'base: tonicidade ~280 mOsm/kg');
  ok(r.disnatremia === 'normonatremia', 'base: normonatremia');
  ok(near(r.tbw, 42, 1e-6), 'base: TBW ~42 L (70 kg · 0,6)');
  ok(r.adh > 0.5 && r.adh < 2.5, 'base: ADH intermediário');
  ok(r.uosm > 300 && r.uosm < 1000, 'base: Uosm fisiológica');
  ok(r.limiteSeguro >= 6 && r.limiteSeguro <= 8, 'base: limite seguro ~6 (crônico default)');
  ok(r.risco === 'seguro', 'base: sem risco no basal');
  ok(r.classe === 'normonatremia', 'base: classe normonatremia');
})();

/* 2. IDENTIDADES — relações estruturais que valem SEMPRE (tol 1e-7) */
(function () {
  for (var i = 0; i < 30; i++) {
    var w = (i - 15) * 0.5;            // água livre -7,5..+7
    var r = agua({ aguaLivre: w });
    // tonicidade ≡ 2·Na (fora dos clamps)
    ok(near(r.tonicidade, 2 * r.naSerico, 1e-9) || r.tonicidade === 370 || r.tonicidade === 200, 'id: tonicidade = 2·Na');
    // Na = 140·osmEfet·(tbwBase/tbw) — recomputa a equação-mãe (com osmEfet=1, tbwBase=42)
    var tbwBase = 42, naCalc = 140 * 1 * (tbwBase / r.tbw);
    if (naCalc > 100 && naCalc < 185) ok(near(r.naSerico, naCalc, 1e-7), 'id: Na = osmoles/ÁGUA (equação-mãe)');
    ok(r.naSerico >= 100 && r.naSerico <= 185, 'id: Na nos clamps');
    ok(r.adh >= 0 && r.adh <= 4, 'id: ADH nos clamps');
    ok(r.uosm >= 40 && r.uosm <= 1300, 'id: Uosm nos clamps');
    ok(r.limiteSeguro >= 6 && r.limiteSeguro <= 12, 'id: limite seguro nos clamps');
    // disnatremia coerente com Na
    var d = r.naSerico < 135 ? 'hiponatremia' : (r.naSerico > 145 ? 'hipernatremia' : 'normonatremia');
    ok(r.disnatremia === d, 'id: disnatremia ≡ faixa do Na');
  }
  ok(near(sig(0, 0, 1), 0.5, 1e-9), 'id: sig(0,0,k)=0.5');
  ok(adhFrom(180, 1, 'central') === 0, 'id: DI central → ADH = 0');
  ok(adhFrom(120, 1, 'siadh') === 3, 'id: SIADH → ADH fixo alto');
})();

/* 3. LEIS — monotonicidade (cada termo no sentido certo) */
(function () {
  // ganhar ÁGUA livre → DILUI → Na ↓
  ok(agua({ aguaLivre: 6 }).naSerico < agua({ aguaLivre: 0 }).naSerico, 'lei: água livre↑ → Na↓ (dilui)');
  // perder ÁGUA → CONCENTRA → Na ↑
  ok(agua({ aguaLivre: -6 }).naSerico > agua({ aguaLivre: 0 }).naSerico, 'lei: água livre↓ → Na↑ (concentra)');
  // osmoles efetivos (sal trocável) ↑ → Na ↑
  ok(agua({ osmEfet: 1.3 }).naSerico > agua({ osmEfet: 0.8 }).naSerico, 'lei: osmEfet↑ → Na↑');
  // natremia alta → osmorreceptor → ADH ↑
  ok(adhFrom(150, 1, 'nenhum') > adhFrom(140, 1, 'nenhum'), 'lei: Na↑ → ADH osmótico↑');
  // VCE baixo → ADH não-osmótico ↑ (domina)
  ok(adhFrom(135, 0.4, 'nenhum') > adhFrom(135, 1.2, 'nenhum'), 'lei: VCE↓ → ADH não-osmótico↑');
  // ADH ↑ → Uosm ↑ (concentra a urina) — via SIADH vs sem ADH
  ok(agua({ defeito: 'siadh', aguaLivre: 6 }).uosm > agua({ defeito: 'central', aguaLivre: -6 }).uosm, 'lei: ADH↑ → Uosm↑ (concentra)');
  // nefrogênico: ADH alto mas resposta renal baixa → Uosm não sobe como deveria
  ok(agua({ defeito: 'nefrogenico', aguaLivre: -6 }).uosm < agua({ aguaLivre: -6 }).uosm, 'lei: resistência ao ADH → Uosm↓ apesar do ADH');
  // cronicidade ↑ (adaptado) → limite seguro ↓ (corrigir devagar)
  ok(agua({ cronicidade: 1 }).limiteSeguro < agua({ cronicidade: 0 }).limiteSeguro, 'lei: cronicidade↑ → limite seguro↓');
  // taxa de correção ↑ → excesso ↑
  ok(agua({ taxaCorrecao: 14 }).excesso > agua({ taxaCorrecao: 6 }).excesso, 'lei: taxaCorreção↑ → excesso↑');
  // ingesta de água ↑ → balanço de água mais positivo (tende a diluir → ΔNa<0)
  ok(agua({ ingestaAgua: 4 }).deltaNaTendencia < agua({ ingestaAgua: 0.5 }).deltaNaTendencia, 'lei: ingesta água↑ → ΔNa tende a cair');
})();

/* 4. PÉROLAS — os achados contra-intuitivos, provados pelo motor */
(function () {
  // (1) trate a ÁGUA, não o número: mover a água move muito o Na; mover o sal move pouco
  var na_aguaMais = agua({ aguaLivre: 6 }).naSerico, na_aguaBase = agua({ aguaLivre: 0 }).naSerico;
  var na_salMais = agua({ osmEfet: 1.15 }).naSerico, na_salBase = agua({ osmEfet: 1.0 }).naSerico;
  ok(Math.abs(na_aguaMais - na_aguaBase) > Math.abs(na_salMais - na_salBase) * 0.6, 'pérola 1: a ÁGUA livre é a alavanca dominante da natremia');
  ok(agua({ aguaLivre: 8 }).disnatremia === 'hiponatremia', 'pérola 1b: excesso de água → hiponatremia (é água, não falta de sal)');

  // (2) o MESMO Na pode ser hipo/eu/hipervolêmico — ADH+volume é que classificam
  var siadh = agua({ defeito: 'siadh', aguaLivre: 8 });
  var hipovol = agua({ vce: 0.5, aguaLivre: 6 });
  var hiperv = agua({ vce: 1.06, aguaLivre: 9 });
  ok(siadh.disnatremia === 'hiponatremia' && hipovol.disnatremia === 'hiponatremia' && hiperv.disnatremia === 'hiponatremia', 'pérola 2: três hiponatremias');
  ok(siadh.classe !== hipovol.classe && hipovol.classe !== hiperv.classe && siadh.classe !== hiperv.classe, 'pérola 2b: mesma natremia, classes (volume/ADH) distintas');
  ok(/siadh/.test(siadh.classe) && /hipovol/.test(hipovol.classe) && /hiperv/.test(hiperv.classe), 'pérola 2c: ADH+volume classificam, não o número');

  // (3) a CRONICIDADE dita a velocidade segura: crônica corrigida rápido → mielinólise; aguda → não
  var cronRapido = agua({ aguaLivre: 8, cronicidade: 1, taxaCorrecao: 14 });
  var cronDevagar = agua({ aguaLivre: 8, cronicidade: 1, taxaCorrecao: 6 });
  var agudaRapido = agua({ aguaLivre: 8, cronicidade: 0, taxaCorrecao: 14 });
  ok(cronRapido.risco === 'mielinolise', 'pérola 3: hipoNa crônica corrigida rápido → mielinólise');
  ok(cronDevagar.risco !== 'mielinolise', 'pérola 3b: a MESMA crônica corrigida devagar → seguro');
  ok(agudaRapido.risco !== 'mielinolise', 'pérola 3c: a aguda tolera correção mais rápida (não adaptada)');
  ok(cronDevagar.limiteSeguro < agudaRapido.limiteSeguro, 'pérola 3d: cérebro adaptado → teto de correção MENOR');

  // (4) DI = déficit de água por ausência/resistência ao ADH → Uosm BAIXA apesar de hiperNa
  var diC = agua({ defeito: 'central', aguaLivre: -9 });
  var diN = agua({ defeito: 'nefrogenico', aguaLivre: -9 });
  ok(diC.disnatremia === 'hipernatremia' && diC.uosm < 250, 'pérola 4: DI central → hiperNa com urina DILUÍDA (Uosm<250)');
  ok(diN.disnatremia === 'hipernatremia' && diN.adh > 2 && diN.uosm < 600, 'pérola 4b: DI nefrogênico → ADH alto mas urina não concentra');
})();

/* 5. DETERMINISMO */
(function () {
  var inp = { peso: 80, fracTBW: 0.55, osmEfet: 1.1, aguaLivre: 5, ingestaAgua: 2, perdaInsens: 1.5, vce: 0.7, defeito: 'siadh', cronicidade: 1, taxaCorrecao: 10 };
  ok(JSON.stringify(agua(inp)) === JSON.stringify(agua(inp)), 'determinismo: saída idêntica');
  var frozen = Object.freeze({ aguaLivre: 7, cronicidade: 1, taxaCorrecao: 12 });
  var a, threw = false; try { a = agua(frozen); } catch (e) { threw = true; }
  ok(!threw && fin(a.naSerico) && fin(a.adh) && fin(a.uosm), 'determinismo: Object.freeze não lança');
  ok(frozen.aguaLivre === 7, 'determinismo: entrada não mutada');
})();

/* 6. ROBUSTEZ */
(function () {
  var maus = [undefined, null, {}, { aguaLivre: NaN }, { aguaLivre: 'x' }, { osmEfet: Infinity }, { vce: -5 },
    { peso: -1 }, { taxaCorrecao: 9e9 }, { cronicidade: 'y' }, { fracTBW: NaN }, { aguaLivre: 1e9, osmEfet: 1e9 },
    { perdaInsens: -1e12 }, { defeito: 'lixo' }, { ingestaAgua: -Infinity }];
  maus.forEach(function (m, i) {
    var r = agua(m);
    ok(fin(r.naSerico) && fin(r.tonicidade) && fin(r.tbw) && fin(r.adh) && fin(r.uosm) && fin(r.cOsm) &&
       fin(r.cH2O) && fin(r.balancoAgua) && fin(r.deltaNaTendencia) && fin(r.limiteSeguro) && fin(r.excesso), 'robustez[' + i + ']: finito');
    ok(r.naSerico >= 100 && r.naSerico <= 185 && r.tonicidade >= 200 && r.tonicidade <= 370 &&
       r.adh >= 0 && r.adh <= 4 && r.uosm >= 40 && r.uosm <= 1300, 'robustez[' + i + ']: saídas nos clamps');
    ok(r.cH2O >= -12 && r.cH2O <= 12 && r.limiteSeguro >= 6 && r.limiteSeguro <= 12, 'robustez[' + i + ']: C_H2O/limite nos clamps');
    ok(typeof r.disnatremia === 'string' && typeof r.classe === 'string' && typeof r.risco === 'string' &&
       typeof r.riscoMielinolise === 'boolean' && typeof r.urinaDiluida === 'boolean', 'robustez[' + i + ']: flags/strings bem-formados');
  });
})();

/* 7. FUZZING ≥5000 (PRNG semeado, ~30% malignas) */
(function () {
  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  var rnd = mulberry32(0xA10C), N = 6000, bad = 0;
  var defs = ['nenhum', 'central', 'nefrogenico', 'siadh', 'lixo', undefined];
  function val(scale, off) { var r = rnd(); if (r < 0.3) { var pool = [NaN, Infinity, -Infinity, 1e12, -1e12, 'x', null, undefined]; return pool[(rnd() * pool.length) | 0]; } return (r - 0.1) * scale + (off || 0); }
  for (var i = 0; i < N; i++) {
    var inp = {
      peso: val(220), fracTBW: val(0.9), osmEfet: val(2.2), aguaLivre: val(24, -12),
      ingestaAgua: val(7), perdaInsens: val(7), vce: val(2.2), defeito: defs[(rnd() * defs.length) | 0],
      cronicidade: val(1.5), taxaCorrecao: val(35)
    };
    var r = agua(inp); var L = aguaLayout(inp, 900, 360);
    var good = fin(r.naSerico) && fin(r.tonicidade) && fin(r.tbw) && fin(r.adh) && fin(r.uosm) &&
      fin(r.fluxoUrina) && fin(r.cOsm) && fin(r.cH2O) && fin(r.balancoAgua) && fin(r.deltaNaTendencia) &&
      fin(r.limiteSeguro) && fin(r.excesso) &&
      r.naSerico >= 100 && r.naSerico <= 185 && r.tonicidade >= 200 && r.tonicidade <= 370 &&
      r.adh >= 0 && r.adh <= 4 && r.uosm >= 40 && r.uosm <= 1300 &&
      r.cH2O >= -12 && r.cH2O <= 12 && r.limiteSeguro >= 6 && r.limiteSeguro <= 12 &&
      typeof r.disnatremia === 'string' && typeof r.classe === 'string' && typeof r.risco === 'string' &&
      // identidade sob fuzzing: tonicidade = 2·Na (dentro dos clamps)
      (near(r.tonicidade, 2 * r.naSerico, 1e-6) || r.tonicidade === 370 || r.tonicidade === 200) &&
      // disnatremia coerente com Na
      r.disnatremia === (r.naSerico < 135 ? 'hiponatremia' : (r.naSerico > 145 ? 'hipernatremia' : 'normonatremia')) &&
      Array.isArray(L.ptsCorrige) && L.ptsCorrige.length === 49 && fin(L.current.y) && fin(L.current.x);
    if (!good) bad++;
  }
  ok(bad === 0, 'fuzzing: ' + N + ' entradas (30% malignas) → 0 violações (' + bad + ')');
})();

/* 8. SAÍDA */
console.log(oks + ' OK · ' + fails + ' falhas');
process.exit(fails > 0 ? 1 : 0);
