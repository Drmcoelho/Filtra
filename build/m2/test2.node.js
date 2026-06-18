'use strict';
/*
 * FILTRA · M2 — test2.node.js
 * Bateria de robustez para hemoRenal(): 8 categorias + fuzzing 5000 entradas.
 * Critério: determinístico (3× idêntico), 0 falhas.
 */

var m = require('./model2.js');
var hemoRenal = m.hemoRenal;
var hillPO2   = m.hillPO2;
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
var rand = mulberry32(20240618);

// ─── 1. LINHA DE BASE ─────────────────────────────────────────────────────────
(function() {
  var r = hemoRenal({});
  assert(r.FSR  >= 900  && r.FSR  <= 1300, 'FSR normal 900–1300 mL/min, got ' + r.FSR.toFixed(1));
  assert(r.FPR  >= 450  && r.FPR  <= 750,  'FPR normal 450–750 mL/min, got ' + r.FPR.toFixed(1));
  assert(r.TFG  >= 100  && r.TFG  <= 160,  'TFG normal 100–160 mL/min, got ' + r.TFG.toFixed(1));
  assert(r.FF   >= 0.18 && r.FF   <= 0.30, 'FF normal 0.18–0.30, got ' + r.FF.toFixed(3));
  assert(r.P_GC >= 55   && r.P_GC <= 65,   'P_GC normal 55–65 mmHg, got ' + r.P_GC.toFixed(1));
  assert(r.Q_med >= 80  && r.Q_med <= 180,  'Q_med normal 80–180 mL/min, got ' + r.Q_med.toFixed(1));
  assert(r.pO2_med >= 12 && r.pO2_med <= 25,'pO₂_med normal 12–25 mmHg, got ' + r.pO2_med.toFixed(1));
  assert(r.pO2_cort > r.pO2_med, 'pO₂_cort > pO₂_med (córtex melhor oxigenado)');
  assert(r.ERO2_med > r.ERO2_cort,'ERO₂_med > ERO₂_cort (medula extrai mais O₂)');
  assert(r.regime === 'normal', 'regime default = normal, got ' + r.regime);
  // fração zonal
  assert(Math.abs(r.Q_cort + r.Q_med - r.FSR) < 1e-6, 'Q_cort + Q_med = FSR');
  // DC=5 → FSR ~20% do DC (em mL/min vs L/min: DC×1000×0.20)
  assert(r.FSR / (r.DC * 1000) >= 0.15 && r.FSR / (r.DC * 1000) <= 0.25,
         'FSR ~20% do DC×1000, got ' + (r.FSR / (r.DC * 1000) * 100).toFixed(1) + '%');
})();

// ─── 2. IDENTIDADES ───────────────────────────────────────────────────────────
(function() {
  var r = hemoRenal({ PAM: 120, DC: 6, Hct: 0.40, Hgb: 15 });
  // FSR = FPR / (1-Hct)
  assert(Math.abs(r.FSR - r.FPR / (1 - r.Hct)) < 1e-5, 'FSR = FPR/(1-Hct)');
  // Q_cort + Q_med = FSR
  assert(Math.abs(r.Q_cort + r.Q_med - r.FSR) < 1e-5, 'Zonal: Q_cort + Q_med = FSR');
  // FF = TFG/FPR
  assert(Math.abs(r.FF - (r.FPR > 0 ? r.TFG/r.FPR : 0)) < 1e-6, 'FF = TFG/FPR');
  // P_GC ∈ [PV, PAM]
  assert(r.P_GC >= C.PV && r.P_GC <= r.PAM + 1e-6, 'P_GC ∈ [Pv, PAM]');
  // DO2_total = FSR × CaO2
  assert(Math.abs(r.DO2_total - r.FSR * r.CaO2) < 1e-5, 'DO2_total = FSR × CaO2');
  // DO2_cort + DO2_med = DO2_total
  assert(Math.abs(r.DO2_cort + r.DO2_med - r.DO2_total) < 1e-4, 'DO2_cort + DO2_med = DO2_total');
  // Hill: hillPO2(SvO2) should give back pO2_med
  var pO2check = hillPO2(r.SvO2_med);
  assert(Math.abs(pO2check - r.pO2_med) < 1e-6, 'hillPO2(SvO2_med) = pO2_med');
  // ERO2_med = VO2_med / DO2_med
  assert(Math.abs(r.ERO2_med - r.VO2_med / Math.max(r.DO2_med, 1e-9)) < 1e-6, 'ERO2_med = VO2_med/DO2_med');
})();

// ─── 3. LEIS (monotonicidade) ─────────────────────────────────────────────────
(function() {
  // DC↑ → FSR↑, FPR↑ (sempre monotônico — DC escala kflow_r linearmente)
  var rLow  = hemoRenal({ DC: 2.5 });
  var rMid  = hemoRenal({ DC: 5.0 });
  var rHigh = hemoRenal({ DC: 8.0 });
  assert(rLow.FSR < rMid.FSR && rMid.FSR < rHigh.FSR, 'DC↑ → FSR↑');
  assert(rLow.FPR < rMid.FPR && rMid.FPR < rHigh.FPR, 'DC↑ → FPR↑');
  // TFG: na faixa normal (PAM=100, autoreg ativa) P_GC é defendida ≈ PSTAR independente do DC
  // → TFG limitado por Kf×NFP, não pela FF. O plateau é o efeito correto (não é falha do engine).
  // Mas DC muito baixo → FPR cai → FFMAX×FPR < Kf×NFP → cap FF morde → TFG↓.
  var rULow = hemoRenal({ DC: 0.4, autoreg: false });
  var rMLow = hemoRenal({ DC: 1.2, autoreg: false });
  var rNorm = hemoRenal({ DC: 3.0, autoreg: false });
  assert(rULow.TFG < rMLow.TFG, 'DC extremamente baixo → TFG↓ (cap FF morde)');
  assert(rMLow.TFG <= rNorm.TFG, 'DC↑ na faixa FF-limitada → TFG↑');

  // PAM no precipício pré-renal (PAM muito baixa): FSR < FSR normal
  var rCrit = hemoRenal({ PAM: 50 });
  assert(rCrit.FSR < rMid.FSR, 'PAM muito baixa → FSR↓');

  // AINE↑ (com vol_dep moderado) → rA↑ → P_GC↓ (autoreg pode compensar parcialmente)
  var rNoAine  = hemoRenal({ vol_dep: 0.8, aine: 0 });
  var rFullAine= hemoRenal({ vol_dep: 0.8, aine: 1 });
  // Com vol_dep alto, autoreg é forçada ao limite (g→GMIN) e não compensa tudo
  assert(rFullAine.aine_rA > 1, 'AINE + vol_dep → aine_rA > 1');

  // IECA↑ → rE↓ (eferente dilata)
  var rNoIeca  = hemoRenal({ ieca: 0 });
  var rFullIeca= hemoRenal({ ieca: 1 });
  assert(rFullIeca.RE < rNoIeca.RE, 'IECA↑ → RE↓ (eferente dilata)');
  assert(rFullIeca.P_GC < rNoIeca.P_GC, 'IECA↑ → P_GC↓');

  // Hgb↑ → CaO2↑ → DO2↑ → pO2_med↑
  var rAnemia = hemoRenal({ Hgb: 6 });
  var rNormHgb= hemoRenal({ Hgb: 14 });
  assert(rAnemia.CaO2 < rNormHgb.CaO2, 'Hgb↑ → CaO2↑');
  assert(rAnemia.pO2_med < rNormHgb.pO2_med, 'Anemia → pO2_med↓');

  // DC↓ (ICC) → pO2_med↓
  var rICC  = hemoRenal({ DC: 2.5 });
  var rNorm = hemoRenal({ DC: 5.0 });
  assert(rICC.pO2_med < rNorm.pO2_med, 'DC↓ → pO2_med↓');

  // f_cort↓ → Q_med↑ (mais fluxo medular)
  var rLowCort = hemoRenal({ f_cort: 0.70 });
  var rHiCort  = hemoRenal({ f_cort: 0.95 });
  assert(rLowCort.Q_med > rHiCort.Q_med, 'f_cort↓ → Q_med↑');
})();

// ─── 4. PÉROLAS ───────────────────────────────────────────────────────────────
(function() {
  // Pérola 1: a medula vive à beira da hipóxia mesmo normal (ERO₂_med > 0.4)
  var rN = hemoRenal({});
  assert(rN.ERO2_med > 0.4, 'ERO₂_med normal > 0.4 (beira da hipóxia)');

  // Pérola 2: ICC grave (DC=2.5) + AINE dose plena → pO₂_med < 10 (hipóxia medular)
  var rICC_AINE = hemoRenal({ DC: 2.5, PAM: 75, aine: 1, vol_dep: 0.8 });
  assert(rICC_AINE.pO2_med < 10, 'ICC + AINE → pO₂_med < 10 (hipóxia medular crítica)');

  // Pérola 3: IECA → P_GC↓ (o aumento de creatinina é o mecanismo pretendido)
  var rBase = hemoRenal({ ieca: 0 });
  var rIECA = hemoRenal({ ieca: 1 });
  assert(rIECA.P_GC < rBase.P_GC, 'IECA → P_GC↓ (a creatinina sobe porque FUNCIONA)');
  assert(rIECA.TFG  < rBase.TFG,  'IECA → TFG↓ (queda esperada na creatinina)');

  // Pérola 4: pO₂_cort >> pO₂_med (contraste zonal) em condição normal
  assert(rN.pO2_cort > rN.pO2_med * 2, 'pO₂_cort > 2× pO₂_med (contraste zonal)');

  // Pérola 5: AINE sozinho (vol normal) → efeito menor (autoreg compensa)
  var rAineSo = hemoRenal({ aine: 1, vol_dep: 0 });
  var rBase0  = hemoRenal({});
  // Autoreg deve limitar o dano quando vol_dep=0
  assert(rAineSo.aine_rA < 1.5, 'AINE sem depleção → aine_rA < 1.5 (efeito moderado)');

  // Pérola 6: Q_cort / FSR ≈ f_cort (córtex realmente leva a fração configurada)
  var r = hemoRenal({ f_cort: 0.85 });
  assert(Math.abs(r.Q_cort / r.FSR - 0.85) < 1e-6, 'Q_cort/FSR = f_cort');
})();

// ─── 5. DETERMINISMO ─────────────────────────────────────────────────────────
(function() {
  var inp = { DC: 4.2, PAM: 88, Hct: 0.38, Hgb: 11, aine: 0.5, ieca: 0.3, vol_dep: 0.4 };
  var r1 = hemoRenal(inp);
  var r2 = hemoRenal(inp);
  var r3 = hemoRenal(inp);
  assert(r1.FSR === r2.FSR && r2.FSR === r3.FSR, 'Determinismo: FSR idêntico em 3 chamadas');
  assert(r1.pO2_med === r2.pO2_med && r2.pO2_med === r3.pO2_med, 'Determinismo: pO2_med idêntico');
  // Object.freeze não deve lançar nem mutar
  var frozen = Object.freeze({ DC: 5, PAM: 100, aine: 0 });
  var rf;
  try { rf = hemoRenal(frozen); assert(true, 'freeze: não lançou'); }
  catch(e) { fail++; console.error('FALHA: freeze lançou: ' + e.message); }
  assert(frozen.DC === 5, 'freeze: objeto de entrada não mutado');
})();

// ─── 6. ROBUSTEZ ─────────────────────────────────────────────────────────────
(function() {
  var cases = [
    {},
    null,
    undefined,
    { DC: NaN, PAM: null, Hct: undefined, aine: 'string' },
    { DC: Infinity, PAM: -Infinity, Hgb: 0 },
    { DC: 0, PAM: 0, Hct: 0, Hgb: 0 },
    { DC: 999, PAM: 999, Hct: 0.99, aine: 999, ieca: -999 },
    { DC: -5, PAM: -5 }
  ];
  cases.forEach(function(inp, i) {
    var r;
    try { r = hemoRenal(inp); }
    catch(e) { fail++; console.error('FALHA robustez caso ' + i + ': lançou ' + e.message); return; }
    var fields = ['FSR','FPR','TFG','FF','P_GC','pO2_med','pO2_cort','ERO2_med','Q_cort','Q_med'];
    fields.forEach(function(f) {
      assert(isFinite(r[f]),  'Robustez caso ' + i + ': ' + f + ' é finito, got ' + r[f]);
      assert(r[f] >= 0,       'Robustez caso ' + i + ': ' + f + ' ≥ 0, got ' + r[f]);
    });
    assert(typeof r.regime === 'string', 'Robustez caso ' + i + ': regime é string');
  });
})();

// ─── 7. FUZZING (PRNG semeado, ≥5000 entradas, 30% malignas) ─────────────────
(function() {
  var N = 5000;
  var MALO = 0.30;
  var fields = ['FSR','FPR','TFG','FF','P_GC','NFP','pO2_med','pO2_cort',
                'ERO2_med','ERO2_cort','Q_cort','Q_med','DO2_total','VO2_med'];

  for (var i = 0; i < N; i++) {
    var inp;
    if (rand() < MALO) {
      // entradas malignas
      var maligno = [NaN, Infinity, -Infinity, null, undefined, '', '0', 1e15, -1e15, 0];
      inp = {
        DC:      maligno[Math.floor(rand() * maligno.length)],
        PAM:     maligno[Math.floor(rand() * maligno.length)],
        Hct:     maligno[Math.floor(rand() * maligno.length)],
        Hgb:     maligno[Math.floor(rand() * maligno.length)],
        aine:    maligno[Math.floor(rand() * maligno.length)],
        ieca:    maligno[Math.floor(rand() * maligno.length)],
        vol_dep: maligno[Math.floor(rand() * maligno.length)],
        f_cort:  maligno[Math.floor(rand() * maligno.length)]
      };
    } else {
      inp = {
        DC:      0.5  + rand() * 14.5,
        PAM:     20   + rand() * 240,
        Hct:     0.20 + rand() * 0.45,
        Hgb:     4    + rand() * 16,
        SaO2:    0.60 + rand() * 0.40,
        f_cort:  0.50 + rand() * 0.47,
        aine:    rand(),
        ieca:    rand(),
        vol_dep: rand(),
        rA:      0.2  + rand() * 4.8,
        rE:      0.2  + rand() * 4.8,
        Kf:      0.5  + rand() * 19.5,
        piGC:    rand() * 40,
        P_BC:    rand() * 50,
        autoreg: rand() > 0.5
      };
    }
    var r;
    try { r = hemoRenal(inp); }
    catch(e) { fail++; console.error('FALHA fuzz ' + i + ': lançou ' + e.message); continue; }

    fields.forEach(function(f) {
      if (r[f] === undefined) return;  // campo opcional
      if (!isFinite(r[f]))  { fail++; console.error('FALHA fuzz ' + i + ': ' + f + ' = ' + r[f]); }
      else ok++;
    });

    // invariantes estruturais sempre
    if (Math.abs(r.Q_cort + r.Q_med - r.FSR) > 1e-4)
      { fail++; console.error('FALHA fuzz ' + i + ': Q_cort+Q_med ≠ FSR'); } else ok++;
    if (Math.abs(r.FSR * (1 - r.Hct) - r.FPR) > 1e-4)
      { fail++; console.error('FALHA fuzz ' + i + ': FSR×(1-Hct) ≠ FPR'); } else ok++;
    if (r.TFG < 0 || r.FSR < 0 || r.FPR < 0)
      { fail++; console.error('FALHA fuzz ' + i + ': valor negativo'); } else ok++;
    if (r.pO2_med < 0 || r.pO2_cort < 0)
      { fail++; console.error('FALHA fuzz ' + i + ': pO2 < 0'); } else ok++;
  }
})();

// ─── Saída ───────────────────────────────────────────────────────────────────
console.log(ok + ' OK · ' + fail + ' falhas');
process.exit(fail > 0 ? 1 : 0);
