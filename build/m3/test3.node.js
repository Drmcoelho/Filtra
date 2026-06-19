'use strict';
/*
 * FILTRA · M3 — test3.node.js
 * Bateria de robustez para glomerulo(): 8 categorias + fuzzing 5000 entradas.
 * Critério: determinístico (3× idêntico), 0 falhas.
 */

var m = require('./model3.js');
var glomerulo = m.glomerulo;
var theta     = m.theta;
var clampv    = m.clampv;
var C         = m.CONST;

var ok = 0, fail = 0;
function assert(cond, msg) {
  if (cond) { ok++; }
  else { fail++; console.error('FALHA: ' + msg); }
}

// ─── PRNG semeado (mulberry32) ────────────────────────────────────────────────
function mulberry32(seed) {
  return function() {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = t + Math.imul(t ^ (t >>> 7), 61 | t) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
var rand = mulberry32(20240619);

// ─── 1. LINHA DE BASE ─────────────────────────────────────────────────────────
(function() {
  var r = glomerulo({});
  assert(Math.abs(r.Kf - 7.5) < 1e-9, 'Kf default = 7.5, got ' + r.Kf);
  assert(r.theta_alb > 4e-4 && r.theta_alb < 8e-4, 'θ_alb normal ≈ 0.0006, got ' + r.theta_alb.toExponential(3));
  assert(r.theta_inulina > 0.95, 'θ_inulina ≈ 0.99 (passa livre), got ' + r.theta_inulina.toFixed(3));
  assert(r.theta_igg < 1e-4, 'θ_IgG ≈ 0 (excluído por tamanho), got ' + r.theta_igg.toExponential(2));
  assert(r.albuminuria < 0.03, 'albuminúria normal < 0.03 g/dia, got ' + r.albuminuria.toFixed(4));
  assert(r.banda === 'normal', 'banda default = normal, got ' + r.banda);
  assert(r.seletividade === 'seletiva', 'seletividade default = seletiva, got ' + r.seletividade);
  assert(r.padrao === 'glomerular', 'padrao default = glomerular, got ' + r.padrao);
  assert(r.regime === 'normal', 'regime default = normal, got ' + r.regime);
  assert(r.tubProt === 0, 'tubProt default = 0, got ' + r.tubProt);
  // âncoras das sondas
  assert(Math.abs(theta(3.6, -1, 0, 1) / 0.0019 - 1) < 0.15, 'âncora: alb carga perdida ≈ 0.0019');
})();

// ─── 2. IDENTIDADES ───────────────────────────────────────────────────────────
(function() {
  var r = glomerulo({ Lp: 1.3, S: 0.8, cb: 0.5, sb: 0.7, P_alb: 35, GFR: 90 });
  // Kf = Lp·S·KF_N
  assert(Math.abs(r.Kf - r.Lp * r.S * C.KF_N) < 1e-7, 'Kf = Lp·S·KF_N');
  // tfgRel = Kf/KF_N
  assert(Math.abs(r.tfgRel - r.Kf / C.KF_N) < 1e-7, 'tfgRel = Kf/KF_N');
  // SI = θ_igg / θ_alb
  assert(Math.abs(r.SI - r.theta_igg / Math.max(r.theta_alb, 1e-9)) < 1e-7, 'SI = θ_igg/θ_alb');
  // protTotal = albuminuria + tubProt
  assert(Math.abs(r.protTotal - (r.albuminuria + r.tubProt)) < 1e-7, 'protTotal = albuminuria + tubProt');
  // GFR_Lday = GFR·1440/1000
  assert(Math.abs(r.GFR_Lday - r.GFR * 1440 / 1000) < 1e-7, 'GFR_Lday = GFR·1440/1000');
  // filteredAlb = GFR_Lday · P_alb · theta_load
  assert(Math.abs(r.filteredAlb - r.GFR_Lday * r.P_alb * r.theta_load) < 1e-7, 'filteredAlb = GFR_Lday·P_alb·θ_load');
  // theta_load = min(theta_alb, THETA_ALB_LOAD_MAX)
  assert(Math.abs(r.theta_load - Math.min(r.theta_alb, C.THETA_ALB_LOAD_MAX)) < 1e-12, 'theta_load = min(θ_alb, teto)');
  // tubProt = tubInjury·1.5
  var r2 = glomerulo({ tubInjury: 0.6 });
  assert(Math.abs(r2.tubProt - 0.6 * 1.5) < 1e-9, 'tubProt = tubInjury·1.5');
})();

// ─── 3. LEIS (monotonicidade) ─────────────────────────────────────────────────
(function() {
  // θ decresce com o raio (peneira)
  var tA = theta(1.0, -1, 1, 1), tB = theta(3.0, -1, 1, 1), tC = theta(5.0, -1, 1, 1);
  assert(tA > tB && tB > tC, 'θ↓ conforme r↑ (peneira de tamanho)');
  // albuminúria↑ conforme cb↓ (perda de carga)
  var c1 = glomerulo({ cb: 1.0 }), c2 = glomerulo({ cb: 0.5 }), c3 = glomerulo({ cb: 0.0 });
  assert(c1.albuminuria < c2.albuminuria && c2.albuminuria < c3.albuminuria, 'albuminúria↑ conforme cb↓');
  // θ_alb↑ conforme cb↓
  assert(c1.theta_alb < c2.theta_alb && c2.theta_alb < c3.theta_alb, 'θ_alb↑ conforme cb↓');
  // albuminúria↑ conforme sb↓ (perda de tamanho)
  var s1 = glomerulo({ sb: 1.0 }), s2 = glomerulo({ sb: 0.7 }), s3 = glomerulo({ sb: 0.4 });
  assert(s1.albuminuria <= s2.albuminuria && s2.albuminuria <= s3.albuminuria, 'albuminúria↑ conforme sb↓');
  // θ_alb↑ conforme sb↓
  assert(s1.theta_alb < s2.theta_alb && s2.theta_alb < s3.theta_alb, 'θ_alb↑ conforme sb↓');
  // proteinúria total↑ conforme tubInjury↑ (via tubProt + queda da reabsorção)
  var t1 = glomerulo({ tubInjury: 0.0 }), t2 = glomerulo({ tubInjury: 0.4 }), t3 = glomerulo({ tubInjury: 0.9 });
  assert(t1.protTotal < t2.protTotal && t2.protTotal < t3.protTotal, 'protTotal↑ conforme tubInjury↑');
  assert(t1.tubProt < t2.tubProt && t2.tubProt < t3.tubProt, 'tubProt↑ conforme tubInjury↑');
  // Kf↓ conforme S↓ (contração mesangial)
  var k1 = glomerulo({ S: 1.0 }), k2 = glomerulo({ S: 0.6 }), k3 = glomerulo({ S: 0.3 });
  assert(k1.Kf > k2.Kf && k2.Kf > k3.Kf, 'Kf↓ conforme S↓ (mesangial)');
  // SI↑ conforme sb↓ (a peneira de tamanho rompe → IgG passa)
  assert(s1.SI < s3.SI, 'SI↑ conforme sb↓ (perda de seletividade de tamanho)');
})();

// ─── 4. PÉROLAS ───────────────────────────────────────────────────────────────
(function() {
  // Pérola 1: perda de carga (cb 1→0) com tamanho intacto → albuminúria nefrótica,
  // MAS a seletividade permanece SELETIVA (IgG continua excluído por tamanho).
  var pc = glomerulo({ cb: 0, sb: 1 });
  assert(pc.banda === 'nefrotica', 'PÉROLA carga: cb=0 → albuminúria nefrótica, got ' + pc.banda);
  assert(pc.seletividade === 'seletiva', 'PÉROLA carga: cb=0 ainda SELETIVA (IgG excluído), got ' + pc.seletividade);

  // Pérola 2: perda de tamanho → SI sobe → não-seletiva (IgG agora passa).
  var ps = glomerulo({ sb: 0.2 });
  assert(ps.seletividade === 'nao_seletiva', 'PÉROLA tamanho: sb=0.2 → não-seletiva, got ' + ps.seletividade);
  assert(ps.SI > 0.5, 'PÉROLA tamanho: SI > 0.5, got ' + ps.SI.toFixed(3));

  // Pérola 3: contração mesangial (S↓) derruba o Kf SEM tocar a peneira (θ inalterado).
  var pm = glomerulo({ S: 0.4 });
  var pn = glomerulo({ S: 1.0 });
  assert(pm.Kf < pn.Kf, 'PÉROLA mesangial: S↓ → Kf↓');
  assert(Math.abs(pm.theta_alb - pn.theta_alb) < 1e-12, 'PÉROLA mesangial: θ_alb inalterado (Kf ≠ peneira)');
  assert(pm.regime === 'mesangial_Kf_baixo', 'PÉROLA mesangial: regime mesangial_Kf_baixo');

  // Pérola 4: padrão tubular — tubInjury alto sozinho → proteinúria de padrão tubular
  var pt = glomerulo({ tubInjury: 0.5 });
  assert(pt.tubProt > 0, 'PÉROLA tubular: tubProt > 0 com lesão tubular');

  // Pérola 5: inulina (neutra, pequena) passa quase livre — não é proteinúria
  var ri = glomerulo({});
  assert(ri.theta_inulina > 0.95, 'PÉROLA: inulina passa livre (marcador de TFG)');
})();

// ─── 5. DETERMINISMO ─────────────────────────────────────────────────────────
(function() {
  var inp = { Lp: 1.2, S: 0.7, cb: 0.4, sb: 0.6, tubInjury: 0.3, P_alb: 32, GFR: 80 };
  var r1 = glomerulo(inp), r2 = glomerulo(inp), r3 = glomerulo(inp);
  assert(r1.albuminuria === r2.albuminuria && r2.albuminuria === r3.albuminuria, 'Determinismo: albuminúria idêntica em 3 chamadas');
  assert(r1.SI === r2.SI && r2.SI === r3.SI, 'Determinismo: SI idêntico');
  // Object.freeze não deve lançar nem mutar
  var frozen = Object.freeze({ Lp: 1, S: 1, cb: 1, sb: 1 });
  try { glomerulo(frozen); assert(true, 'freeze: não lançou'); }
  catch (e) { fail++; console.error('FALHA: freeze lançou: ' + e.message); }
  assert(frozen.Lp === 1, 'freeze: objeto de entrada não mutado');
})();

// ─── 6. ROBUSTEZ ─────────────────────────────────────────────────────────────
(function() {
  var cases = [
    {},
    null,
    undefined,
    { Lp: NaN, S: null, cb: undefined, sb: 'string' },
    { Lp: Infinity, S: -Infinity, cb: 2, sb: -1 },
    { Lp: 0, S: 0, cb: 0, sb: 0, tubInjury: 0, P_alb: 0, GFR: 0 },
    { Lp: 999, S: 999, cb: 999, sb: -999, P_alb: 1e9, GFR: 1e9 },
    { tubInjury: 'x', probe: 'inexistente' }
  ];
  cases.forEach(function(inp, i) {
    var r;
    try { r = glomerulo(inp); }
    catch (e) { fail++; console.error('FALHA robustez caso ' + i + ': lançou ' + e.message); return; }
    var fields = ['Kf', 'theta_alb', 'theta_igg', 'theta_inulina', 'SI', 'albuminuria',
                  'tubProt', 'protTotal', 'filteredAlb', 'reab', 'tfgRel'];
    fields.forEach(function(f) {
      assert(isFinite(r[f]), 'Robustez caso ' + i + ': ' + f + ' é finito, got ' + r[f]);
      assert(r[f] >= 0,      'Robustez caso ' + i + ': ' + f + ' ≥ 0, got ' + r[f]);
    });
    assert(r.theta_alb <= 1 && r.theta_igg <= 1 && r.theta_inulina <= 1, 'Robustez caso ' + i + ': θ ≤ 1 (clamp)');
    assert(typeof r.regime === 'string', 'Robustez caso ' + i + ': regime é string');
    assert(typeof r.banda === 'string', 'Robustez caso ' + i + ': banda é string');
  });
})();

// ─── 7. FUZZING (PRNG semeado, ≥5000 entradas, 30% malignas) ─────────────────
(function() {
  var N = 5000;
  var MALO = 0.30;
  var fields = ['Kf', 'theta_alb', 'theta_igg', 'theta_inulina', 'theta_probe', 'SI',
                'albuminuria', 'tubProt', 'protTotal', 'filteredAlb', 'reab', 'tfgRel', 'GFR_Lday'];
  var probes = ['inulina', 'albumina', 'IgG'];

  for (var i = 0; i < N; i++) {
    var inp;
    if (rand() < MALO) {
      var maligno = [NaN, Infinity, -Infinity, null, undefined, '', '0', 1e15, -1e15, 0];
      inp = {
        Lp:        maligno[Math.floor(rand() * maligno.length)],
        S:         maligno[Math.floor(rand() * maligno.length)],
        cb:        maligno[Math.floor(rand() * maligno.length)],
        sb:        maligno[Math.floor(rand() * maligno.length)],
        tubInjury: maligno[Math.floor(rand() * maligno.length)],
        P_alb:     maligno[Math.floor(rand() * maligno.length)],
        GFR:       maligno[Math.floor(rand() * maligno.length)],
        probe:     maligno[Math.floor(rand() * maligno.length)]
      };
    } else {
      inp = {
        Lp:        0.1  + rand() * 1.9,
        S:         0.1  + rand() * 1.4,
        cb:        rand(),
        sb:        rand(),
        tubInjury: rand(),
        P_alb:     5    + rand() * 65,
        GFR:       1    + rand() * 249,
        probe:     probes[Math.floor(rand() * probes.length)]
      };
    }
    var r;
    try { r = glomerulo(inp); }
    catch (e) { fail++; console.error('FALHA fuzz ' + i + ': lançou ' + e.message); continue; }

    fields.forEach(function(f) {
      if (r[f] === undefined) return;
      if (!isFinite(r[f]))  { fail++; console.error('FALHA fuzz ' + i + ': ' + f + ' = ' + r[f]); }
      else ok++;
    });

    // invariantes estruturais sempre
    if (Math.abs(r.Kf - r.Lp * r.S * 7.5) > 1e-6)
      { fail++; console.error('FALHA fuzz ' + i + ': Kf ≠ Lp·S·KF_N'); } else ok++;
    if (Math.abs(r.protTotal - (r.albuminuria + r.tubProt)) > 1e-6)
      { fail++; console.error('FALHA fuzz ' + i + ': protTotal ≠ alb + tub'); } else ok++;
    if (r.theta_alb < 0 || r.theta_alb > 1 || r.theta_igg < 0 || r.theta_igg > 1 || r.theta_inulina < 0 || r.theta_inulina > 1)
      { fail++; console.error('FALHA fuzz ' + i + ': θ fora de [0,1]'); } else ok++;
    if (r.albuminuria < 0 || r.tubProt < 0 || r.Kf < 0)
      { fail++; console.error('FALHA fuzz ' + i + ': valor negativo'); } else ok++;
    if (typeof r.regime !== 'string' || typeof r.banda !== 'string' || typeof r.seletividade !== 'string')
      { fail++; console.error('FALHA fuzz ' + i + ': classificação não-string'); } else ok++;
  }
})();

// ─── Saída ───────────────────────────────────────────────────────────────────
console.log(ok + ' OK · ' + fail + ' falhas');
process.exit(fail > 0 ? 1 : 0);
