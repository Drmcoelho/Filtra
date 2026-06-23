/* =========================================================================
 * FILTRA · M3 — bateria de robustez do engine (0 falhas ou não entra)
 * 1 LINHA DE BASE · 2 IDENTIDADES · 3 LEIS · 4 PÉROLAS · 5 DETERMINISMO
 * 6 ROBUSTEZ · 7 FUZZING semeado ≥5000 · 8 SAÍDA
 * ========================================================================= */
var M = require('./model3.js');
var barreira = M.barreira, sieving = M.sieving, sievingLayout = M.sievingLayout;

var oks = 0, fails = 0;
function ok(c, m) { if (c) oks++; else { fails++; console.log('  FALHA: ' + m); } }
function near(a, b, t) { return Math.abs(a - b) <= (t || 1e-7); }
function fin(x) { return typeof x === 'number' && isFinite(x); }

/* ---------- 1. LINHA DE BASE (faixas fisiológicas) ---------- */
(function () {
  var r = barreira({});
  ok(near(r.Kf, 12.5, 1e-9), 'base: Kf normal = 12,5 mL/min/mmHg');
  ok(near(r.NFP, 60 - 15 - 28), 'base: NFP = P_GC − P_BC − π_GC = 17');
  ok(r.TFG > 200 && r.TFG < 230, 'base: TFG ~212 mL/min (Kf·NFP) na faixa');
  ok(r.thetaInulina > 0.98, 'base: inulina (14 Å, neutra) ~livremente filtrada (θ≈1)');
  ok(r.thetaAlb < 0.02, 'base: albumina barrada (θ baixo) com carga íntegra');
  ok(r.classe === 'normal' && r.urineProt < 0.15, 'base: sem proteinúria significativa');
  ok(!r.nefrotico, 'base: não nefrótico');
})();

/* ---------- 2. IDENTIDADES (valem sempre) ---------- */
(function () {
  for (var i = 0; i < 40; i++) {
    var inp = { raioMol: 4 + i, poroDano: (i % 5) / 4, cargaIntacta: (i % 2 === 0), P_GC: 40 + i, areaFrac: 0.2 + (i % 4) * 0.2 };
    var r = barreira(inp);
    ok(near(r.NFP, r.P_GC - r.P_BC - r.piGC), 'id: NFP = P_GC − P_BC − π_GC');
    ok(near(r.TFG, r.Kf * Math.max(r.NFP, 0), 1e-6), 'id: TFG = Kf · max(NFP,0)');
    ok(r.thetaProbe >= 0 && r.thetaProbe <= 1, 'id: θ do probe em [0,1]');
    ok(r.thetaAlb >= 0 && r.thetaAlb <= 1 && r.thetaIgG >= 0 && r.thetaIgG <= 1, 'id: θ marcadores em [0,1]');
    ok(r.urineProt >= 0.02 && r.urineProt <= 30, 'id: proteinúria nos clamps');
  }
})();

/* ---------- 3. LEIS (monotonicidade dirigida) ---------- */
(function () {
  // tamanho: θ cai com o raio
  ok(sieving(10, 'neutro', true, 0) > sieving(30, 'neutro', true, 0), 'lei: θ cai quando o raio sobe (peneira de tamanho)');
  ok(sieving(30, 'neutro', true, 0) > sieving(55, 'neutro', true, 0), 'lei: θ cai do médio ao grande');
  // carga: anion < neutro < cation (mesmo raio)
  ok(sieving(36, 'anion', true, 0) < sieving(36, 'neutro', true, 0), 'lei: ânion filtra menos que neutro (repulsão)');
  ok(sieving(36, 'neutro', true, 0) < sieving(36, 'cation', true, 0), 'lei: cátion filtra mais que neutro');
  // perda de carga aumenta θ do ânion
  ok(sieving(36, 'anion', false, 0) > sieving(36, 'anion', true, 0), 'lei: perder a carga ↑ θ da albumina');
  // dano de tamanho aumenta θ de moléculas grandes
  ok(sieving(55, 'anion', true, 0.8) > sieving(55, 'anion', true, 0), 'lei: dano de tamanho ↑ θ da IgG');
  // Kf: TFG sobe com área e permeabilidade; cai com NFP
  ok(barreira({ areaFrac: 1 }).TFG > barreira({ areaFrac: 0.4 }).TFG, 'lei: área↓ (Kf↓) → TFG↓');
  ok(barreira({ kPerm: 1.5 }).TFG > barreira({ kPerm: 0.6 }).TFG, 'lei: permeabilidade↑ → TFG↑');
  ok(barreira({ P_BC: 35 }).TFG < barreira({ P_BC: 15 }).TFG, 'lei: P_BC↑ (obstrução) → NFP↓ → TFG↓');
  // proteinúria: carga, tamanho e tubular aumentam; mais dano → mais proteína
  ok(barreira({ cargaIntacta: false }).urineProt > barreira({}).urineProt, 'lei: perda de carga → proteinúria↑');
  ok(barreira({ poroDano: 0.8 }).urineProt > barreira({ poroDano: 0.2 }).urineProt, 'lei: mais dano de tamanho → proteinúria↑');
  ok(barreira({ tmFrac: 0.2 }).urineProt > barreira({ tmFrac: 1 }).urineProt, 'lei: falência tubular → proteinúria↑');
})();

/* ---------- 4. PÉROLAS (achados contra-intuitivos, provados pelo motor) ---------- */
(function () {
  // perda de carga isolada → albuminúria SELETIVA (lesão mínima): nefrótico, mas tamanho preservado (seletividade baixa)
  var lm = barreira({ cargaIntacta: false, poroDano: 0 });
  ok(lm.classe === 'glomerular_seletiva', 'pérola: perda de carga isolada → proteinúria glomerular SELETIVA');
  ok(lm.nefrotico, 'pérola: perda de carga isolada pode ser nefrótica');
  ok(lm.seletividade < 0.2, 'pérola: seletividade baixa (IgG ainda barrada pelo tamanho)');
  // dano de tamanho grande → NÃO seletiva (IgG vaza também)
  var ns = barreira({ poroDano: 0.85 });
  ok(ns.classe === 'glomerular_nao_seletiva', 'pérola: dano de tamanho → proteinúria NÃO-seletiva');
  ok(ns.seletividade > barreira({}).seletividade, 'pérola: dano de tamanho ↑ a razão IgG/albumina');
  // Kf derruba a TFG sem tocar nas pressões
  var k = barreira({ areaFrac: 0.3 });
  ok(near(k.NFP, barreira({}).NFP) && k.TFG < barreira({}).TFG, 'pérola: Kf↓ derruba a TFG com as MESMAS pressões');
  // inulina sempre ~livre, mesmo com barreira danificada
  ok(barreira({ poroDano: 1, cargaIntacta: false }).thetaInulina > 0.98, 'pérola: inulina filtra livre em qualquer estado da barreira');
})();

/* ---------- 5. DETERMINISMO ---------- */
(function () {
  var inp = { raioMol: 36, carga: 'anion', poroDano: 0.5, areaFrac: 0.7, P_GC: 58 };
  ok(JSON.stringify(barreira(inp)) === JSON.stringify(barreira(inp)), 'determinismo: mesma entrada → saída idêntica');
  var frozen = Object.freeze({ raioMol: 30, carga: 'neutro', P_BC: 20 });
  var a; var threw = false; try { a = barreira(frozen); } catch (e) { threw = true; }
  ok(!threw && fin(a.TFG), 'determinismo: entrada Object.freeze não lança nem é mutada');
  ok(frozen.raioMol === 30, 'determinismo: objeto de entrada não mutado');
})();

/* ---------- 6. ROBUSTEZ (lixo na entrada → finito, nos clamps) ---------- */
(function () {
  var maus = [undefined, null, {}, { raioMol: NaN }, { raioMol: 'abc' }, { poroDano: 5 }, { poroDano: -3 },
    { areaFrac: 0 }, { kPerm: Infinity }, { P_GC: -50 }, { P_GC: 1e9 }, { carga: 123 }, { carga: 'xyz' },
    { tmFrac: 9 }, { piGC: NaN }, { raioMol: -10 }];
  maus.forEach(function (m, i) {
    var r = barreira(m);
    ok(fin(r.TFG) && fin(r.Kf) && fin(r.NFP) && fin(r.urineProt), 'robustez[' + i + ']: saídas finitas');
    ok(r.thetaProbe >= 0 && r.thetaProbe <= 1, 'robustez[' + i + ']: θ nos limites');
    ok(r.urineProt >= 0.02 && r.urineProt <= 30, 'robustez[' + i + ']: proteinúria nos clamps');
    ok(r.TFG >= 0, 'robustez[' + i + ']: TFG ≥ 0');
  });
})();

/* ---------- 7. FUZZING semeado (mulberry32) ≥5000, 30% malignos ---------- */
(function () {
  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  var rnd = mulberry32(0x3CAFE), N = 20000, bad = 0;
  var cargas = ['anion', 'neutro', 'cation', 'xyz', 42, null];
  function val(i) {
    var r = rnd();
    if (i < 0.3) { var pool = [NaN, Infinity, -Infinity, 1e12, -1e12, 'x', null, undefined]; return pool[(rnd() * pool.length) | 0]; }
    return (r - 0.2) * 120;
  }
  for (var i = 0; i < N; i++) {
    var inp = {
      raioMol: val(rnd()), poroDano: val(rnd()), areaFrac: val(rnd()), kPerm: val(rnd()),
      P_GC: val(rnd()), P_BC: val(rnd()), piGC: val(rnd()), tmFrac: val(rnd()),
      carga: cargas[(rnd() * cargas.length) | 0], cargaIntacta: rnd() > 0.5
    };
    var r = barreira(inp);
    var L = sievingLayout(inp, 900, 360);
    var good = fin(r.TFG) && fin(r.Kf) && fin(r.NFP) && fin(r.urineProt) &&
      r.thetaProbe >= 0 && r.thetaProbe <= 1 && r.thetaAlb >= 0 && r.thetaAlb <= 1 &&
      r.thetaIgG >= 0 && r.thetaIgG <= 1 && r.TFG >= 0 &&
      r.urineProt >= 0.02 && r.urineProt <= 30 &&
      near(r.NFP, r.P_GC - r.P_BC - r.piGC, 1e-6) &&
      Array.isArray(L.pts) && L.pts.length === 61 && fin(L.current.y);
    if (!good) bad++;
  }
  ok(bad === 0, 'fuzzing: ' + N + ' entradas (30% malignas) → 0 violações (' + bad + ')');
})();

/* ---------- 8. SAÍDA ---------- */
console.log(oks + ' OK · ' + fails + ' falhas');
process.exit(fails > 0 ? 1 : 0);
