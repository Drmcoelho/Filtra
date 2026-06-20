'use strict';
/*
 * FILTRA · M12 — test12.node.js
 * Bateria de robustez para mineral(): 8 categorias + fuzzing 5000 entradas.
 * Critério: determinístico (3× idêntico), 0 falhas.
 */

var m = require('./model12.js');
var mineral     = m.mineral;
var caCorrigido = m.caCorrigido;
var caIonizado  = m.caIonizado;
var mgGate      = m.mgGate;
var caIonLayout = m.caIonLayout;
var drcLayout   = m.drcLayout;
var C = m.CONST;

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
  var r = mineral({});
  assert(r.caCorr > 9.0 && r.caCorr < 10.0, 'Ca corrigido default ≈ 9.4, got ' + r.caCorr.toFixed(2));
  assert(r.caIon > 4.4 && r.caIon < 5.0, 'Ca ionizado default ≈ 4.7, got ' + r.caIon.toFixed(2));
  assert(r.po4 > 3.0 && r.po4 < 4.0, 'PO₄ default ≈ 3.5, got ' + r.po4.toFixed(2));
  assert(r.pth > 30 && r.pth < 55, 'PTH default ≈ 40, got ' + r.pth.toFixed(0));
  assert(r.calcitriol > 30 && r.calcitriol < 55, 'calcitriol default ≈ 40, got ' + r.calcitriol.toFixed(0));
  assert(r.fgf23 > 40 && r.fgf23 < 65, 'FGF23 default ≈ 50, got ' + r.fgf23.toFixed(0));
  assert(r.estadoCa === 'normal', 'estado default normal, got ' + r.estadoCa);
  assert(r.regime === 'normal', 'regime default normal, got ' + r.regime);
  assert(r.mgGate > 0.99, 'mg gate default ≈ 1 (Mg normal)');

  // ALCALOSE → ionizado↓ (tetania)
  var alc = mineral({ pH: 7.62 });
  assert(alc.caIon < r.caIon - 0.2, 'BASE: alcalose derruba o Ca ionizado (' + alc.caIon.toFixed(2) + ' < ' + r.caIon.toFixed(2) + ')');
  assert(alc.tetaniaAlcalose === true, 'BASE: alcalose com Ca total normal → tetania por ionizado baixo');

  // DRC avançada → PO₄↑ / calcitriol↓ / PTH↑ / FGF23↑
  var drc = mineral({ gfr: 12, po4: 6, caTotal: 8.2 });
  assert(drc.po4 > C.PO4_N, 'BASE: DRC retém PO₄ (' + drc.po4.toFixed(2) + ' > ' + C.PO4_N + ')');
  assert(drc.calcitriol < r.calcitriol, 'BASE: DRC derruba o calcitriol (' + drc.calcitriol.toFixed(1) + ')');
  assert(drc.pth > r.pth * 2, 'BASE: DRC → hiperPTH 2º (' + drc.pth.toFixed(0) + ')');
  assert(drc.fgf23 > r.fgf23 * 2, 'BASE: DRC → FGF23↑↑ (' + drc.fgf23.toFixed(0) + ')');
  assert(drc.regime === 'hiperpth_secundario', 'BASE: DRC regime hiperpth_secundario, got ' + drc.regime);
})();

// ─── 2. IDENTIDADES ───────────────────────────────────────────────────────────
(function() {
  // Ca corrigido = Ca + 0,8·(4 − alb)
  var r = mineral({ caTotal: 7.0, alb: 2.0 });
  assert(Math.abs(r.caCorr - (7.0 + 0.8 * (4 - 2.0))) < 1e-7, 'ID: Ca_corr = Ca + 0,8·(4−alb)');
  assert(Math.abs(caCorrigido(8.0, 3.0) - (8.0 + 0.8 * (4 - 3.0))) < 1e-7, 'ID: caCorrigido fórmula direta');
  // albumina normal (4.0) → corrigido = total
  assert(Math.abs(caCorrigido(9.4, 4.0) - 9.4) < 1e-9, 'ID: alb 4.0 → corrigido = total');
  // ionizado em pH normal = ION_FRAC·corrigido
  assert(Math.abs(caIonizado(9.4, C.PH_N) - C.ION_FRAC * 9.4) < 1e-7, 'ID: ion(pH 7,40) = 0,5·corrigido');
  // efeito do pH: cada 0,1 de ΔpH desloca PH_SLOPE mg/dL (sinal invertido)
  var i40 = caIonizado(9.4, 7.40), i50 = caIonizado(9.4, 7.50);
  assert(Math.abs((i40 - i50) - C.PH_SLOPE) < 1e-7, 'ID: ΔpH 0,1 desloca ' + C.PH_SLOPE + ' mg/dL (alcalose ↓)');
  // produto Ca×PO₄
  assert(Math.abs(r.caxpo4 - r.caCorr * r.po4) < 1e-7, 'ID: caxpo4 = caCorr · po4');
  // mgGate plena em Mg normal e mínima em Mg muito baixo
  assert(Math.abs(mgGate(2.0) - 1) < 1e-9, 'ID: mgGate(2.0) = 1 (secreção plena)');
  assert(mgGate(0.5) < 0.2, 'ID: mgGate(0,5) baixíssimo (paralisia)');
  // retenção = 1 − renalCap
  assert(Math.abs(r.retencao - (1 - r.renalCap)) < 1e-7, 'ID: retencao = 1 − renalCap');
})();

// ─── 3. LEIS (monotonicidade) ─────────────────────────────────────────────────
(function() {
  // albumina↓ → Ca TOTAL constante derruba o corrigido SOBE, mas o IONIZADO ~igual
  // (testamos: mantendo o Ca corrigido fixo via total ajustado, o ionizado é ~estável)
  var a4 = mineral({ caTotal: 9.4, alb: 4.0 });
  var a2 = mineral({ caTotal: 9.4 - 0.8 * (4 - 2.0), alb: 2.0 }); // mesmo corrigido
  assert(Math.abs(a4.caIon - a2.caIon) < 1e-6, 'LEI: albumina↓ com mesmo Ca real → ionizado IGUAL');
  assert(a4.caTotal > a2.caTotal, 'LEI: hipoalbuminemia derruba o Ca TOTAL medido');

  // pH↑ (alcalose) → ionizado↓ (monotônico)
  var p1 = mineral({ pH: 7.30 }), p2 = mineral({ pH: 7.40 }), p3 = mineral({ pH: 7.55 });
  assert(p1.caIon > p2.caIon && p2.caIon > p3.caIon, 'LEI: ionizado↓ conforme pH↑ (alcalose)');

  // PTH exógeno↑ → Ca↑ (via reabsorção) — modelado como pthExtra elevando o Ca alvo:
  // aqui testamos a SUPRESSÃO: hipercalcemia suprime o PTH endógeno
  var hi = mineral({ caTotal: 12.5 }), lo = mineral({ caTotal: 7.0 });
  assert(hi.pth < lo.pth, 'LEI: hipercalcemia suprime o PTH; hipocalcemia o eleva');

  // hipocalcemia → PTH↑ E calcitriol↑ (resposta à hipocalcemia)
  var norm = mineral({}), hypo = mineral({ caTotal: 6.5 });
  assert(hypo.pth > norm.pth, 'LEI: hipocalcemia → PTH↑');
  assert(hypo.calcitriol > norm.calcitriol, 'LEI: PTH↑ → 1α-hidroxilase → calcitriol↑');

  // PO₄ ofertado↑ → PO₄ sérico↑ e PTH↑ (fosfato sobe o PTH)
  var f1 = mineral({ po4: 3.5 }), f2 = mineral({ po4: 6.5 });
  assert(f2.po4 > f1.po4, 'LEI: maior carga de PO₄ → PO₄ sérico↑');
  assert(f2.pth >= f1.pth, 'LEI: PO₄↑ → PTH↑ (estímulo direto)');

  // FGF23↑ (via DRC) → PO₄↓ relativo (fosfatúrico) e calcitriol↓
  var g120 = mineral({ gfr: 120, po4: 5 }), g15 = mineral({ gfr: 15, po4: 5 });
  assert(g15.fgf23 > g120.fgf23, 'LEI: TFG↓ → FGF23↑');
  assert(g15.calcitriol < g120.calcitriol, 'LEI: FGF23↑ + rim lesado → calcitriol↓');

  // TFG↓ → PO₄↑ (retenção) e PTH↑ (hiperPTH 2º)
  var t1 = mineral({ gfr: 120, po4: 4 }), t2 = mineral({ gfr: 20, po4: 4 });
  assert(t2.po4 > t1.po4, 'LEI: TFG↓ → PO₄ retido↑');
  assert(t2.pth > t1.pth, 'LEI: TFG↓ → PTH↑ (hiperPTH 2º)');

  // Mg↓ → gate↓ → PTH↓ (paralisia da paratireoide)
  var mgHi = mineral({ caTotal: 7.5, mg: 2.0 }), mgLo = mineral({ caTotal: 7.5, mg: 0.8 });
  assert(mgLo.pth < mgHi.pth, 'LEI: hipomagnesemia paralisa o PTH (apesar da hipocalcemia)');
})();

// ─── 4. PÉROLAS ───────────────────────────────────────────────────────────────
(function() {
  // Pérola 1 (o cálcio sérico engana — corrigir por albumina):
  var pseudo = mineral({ caTotal: 7.4, alb: 2.0 });
  assert(pseudo.caTotal < 8.5, 'PÉROLA albumina: Ca TOTAL "baixo" (' + pseudo.caTotal.toFixed(1) + ')');
  assert(pseudo.caCorr >= 8.5, 'PÉROLA albumina: Ca CORRIGIDO normal (pseudo-hipocalcemia)');
  assert(pseudo.pseudoHipo === true, 'PÉROLA albumina: flag pseudo-hipocalcemia');
  assert(pseudo.regime === 'pseudo_hipocalcemia', 'PÉROLA albumina: regime pseudo_hipocalcemia');

  // Pérola 2 (o cálcio sérico engana — corrigir por pH): alcalose → tetania
  var alc = mineral({ caTotal: 9.4, alb: 4.0, pH: 7.62 });
  assert(alc.caTotal >= 8.5, 'PÉROLA pH: Ca total NORMAL na alcalose');
  assert(alc.caIon < 4.3, 'PÉROLA pH: mas o IONIZADO caiu (tetania) — ' + alc.caIon.toFixed(2));
  assert(alc.tetaniaAlcalose === true && alc.regime === 'tetania_alcalose', 'PÉROLA pH: regime tetania_alcalose');

  // Pérola 3 (hiperPTH 2º da DRC = PO₄↑ + calcitriol↓):
  var drc = mineral({ gfr: 15, po4: 6.5, caTotal: 8.2 });
  assert(drc.po4 > C.PO4_N, 'PÉROLA DRC: PO₄ retido↑ (' + drc.po4.toFixed(1) + ')');
  assert(drc.calcitriol < 15, 'PÉROLA DRC: calcitriol baixo (' + drc.calcitriol.toFixed(1) + ')');
  assert(drc.pth > C.PTH_N * 2, 'PÉROLA DRC: PTH↑↑ pelo estímulo triplo (' + drc.pth.toFixed(0) + ')');
  assert(drc.fgf23 > C.FGF23_N * 2, 'PÉROLA DRC: FGF23 sobe cedo (' + drc.fgf23.toFixed(0) + ')');
  assert(drc.regime === 'hiperpth_secundario', 'PÉROLA DRC: regime hiperpth_secundario');

  // Pérola 4 (Mg baixo perpetua a hipocalcemia — PTH paralisado):
  var mgBaixo = mineral({ caTotal: 7.4, mg: 0.8 });
  assert(mgBaixo.caIon < 4.3, 'PÉROLA Mg: hipocalcemia presente');
  assert(mgBaixo.mgGate < 0.3, 'PÉROLA Mg: gate da paratireoide quase fechado');
  assert(mgBaixo.pth < C.PTH_N, 'PÉROLA Mg: PTH INADEQUADAMENTE baixo apesar da hipocalcemia (refratária)');
  assert(mgBaixo.regime === 'hipocalcemia_mg', 'PÉROLA Mg: regime hipocalcemia_mg');
  // comparado a Mg normal com a mesma hipocalcemia: o PTH deveria estar ALTO
  var mgOk = mineral({ caTotal: 7.4, mg: 2.0 });
  assert(mgOk.pth > C.PTH_N, 'PÉROLA Mg: com Mg normal, a mesma hipocalcemia eleva o PTH');

  // Pérola 5 (hipercalcemia da malignidade/PTHrP): Ca↑ com PTH SUPRIMIDO
  var malig = mineral({ caTotal: 13, pthExtra: 1.6 });
  assert(malig.estadoCa === 'hipercalcemia', 'PÉROLA PTHrP: hipercalcemia');
  assert(malig.pth < C.PTH_N, 'PÉROLA PTHrP: PTH endógeno SUPRIMIDO (o PTHrP não é medido pelo ensaio de PTH)');
})();

// ─── 5. DETERMINISMO ─────────────────────────────────────────────────────────
(function() {
  var inp = { caTotal: 8.2, alb: 2.6, pH: 7.48, po4: 5.5, mg: 1.4, gfr: 28, pthExtra: 1.1 };
  var r1 = mineral(inp), r2 = mineral(inp), r3 = mineral(inp);
  assert(r1.caIon === r2.caIon && r2.caIon === r3.caIon, 'Determinismo: caIon idêntico em 3 chamadas');
  assert(r1.pth === r2.pth && r2.pth === r3.pth, 'Determinismo: PTH idêntico');
  assert(r1.regime === r2.regime, 'Determinismo: regime idêntico');
  var frozen = Object.freeze({ caTotal: 9, alb: 3, pH: 7.4, gfr: 60 });
  try { mineral(frozen); assert(true, 'freeze: não lançou'); }
  catch (e) { fail++; console.error('FALHA: freeze lançou: ' + e.message); }
  assert(frozen.caTotal === 9, 'freeze: objeto de entrada não mutado');
  var st = Object.freeze({ gfr: 30, caTotal: 8.5, alb: 3 });
  try { caIonLayout(st, 900, 320); drcLayout(st, 600, 240); assert(true, 'layouts: freeze ok'); }
  catch (e) { fail++; console.error('FALHA: layout freeze lançou: ' + e.message); }
})();

// ─── 6. ROBUSTEZ ─────────────────────────────────────────────────────────────
(function() {
  var cases = [
    {},
    null,
    undefined,
    { caTotal: NaN, alb: null, pH: undefined, po4: 'string', mg: 'x', gfr: NaN },
    { caTotal: Infinity, alb: -Infinity, pH: 99, po4: -5, mg: 999, gfr: Infinity, pthExtra: 1e9 },
    { caTotal: 0, alb: 0, pH: 0, po4: 0, mg: 0, gfr: 0 },
    { caTotal: 1e9, alb: -1e9, pH: -1e9, po4: 1e9, mg: -1e9, gfr: 1e9 },
    { caTotal: 'lixo', alb: 'lixo', pH: 'lixo' }
  ];
  var fields = ['caCorr', 'caIon', 'pth', 'calcitriol', 'fgf23', 'po4', 'fosfaturia',
                'caxpo4', 'mgGate', 'renalCap', 'retencao'];
  cases.forEach(function(inp, i) {
    var r;
    try { r = mineral(inp); }
    catch (e) { fail++; console.error('FALHA robustez caso ' + i + ': lançou ' + e.message); return; }
    fields.forEach(function(f) {
      assert(isFinite(r[f]), 'Robustez caso ' + i + ': ' + f + ' é finito, got ' + r[f]);
    });
    assert(r.caIon >= 1.5 && r.caIon <= 9, 'Robustez caso ' + i + ': caIon no clamp');
    assert(r.pth >= 1 && r.pth <= 3000, 'Robustez caso ' + i + ': pth no clamp');
    assert(r.po4 >= 0.5 && r.po4 <= 18, 'Robustez caso ' + i + ': po4 no clamp');
    assert(r.calcitriol >= 2 && r.calcitriol <= 300, 'Robustez caso ' + i + ': calcitriol no clamp');
    assert(typeof r.regime === 'string', 'Robustez caso ' + i + ': regime é string');
    assert(typeof r.estadoCa === 'string', 'Robustez caso ' + i + ': estadoCa é string');
    assert(typeof r.pseudoHipo === 'boolean', 'Robustez caso ' + i + ': pseudoHipo é boolean');
    var L = caIonLayout(inp, 900, 320), D = drcLayout(inp, 600, 240);
    assert(L.ptsN.length > 0 && isFinite(L.ptsN[0].x) && isFinite(L.ptsN[0].y), 'Robustez caso ' + i + ': caIonLayout finito');
    assert(D.ptsPTH.length > 0 && isFinite(D.ptsPTH[0].y), 'Robustez caso ' + i + ': drcLayout finito');
  });
})();

// ─── 7. FUZZING (PRNG semeado, ≥5000 entradas, 30% malignas) ─────────────────
(function() {
  var N = 5000;
  var MALO = 0.30;
  var fields = ['caCorr', 'caIon', 'pth', 'calcitriol', 'fgf23', 'po4', 'fosfaturia',
                'caxpo4', 'mgGate', 'renalCap', 'retencao'];

  for (var i = 0; i < N; i++) {
    var inp;
    if (rand() < MALO) {
      var mal = [NaN, Infinity, -Infinity, null, undefined, '', '0', 1e15, -1e15, 0];
      inp = {
        caTotal: mal[Math.floor(rand() * mal.length)],
        alb:     mal[Math.floor(rand() * mal.length)],
        pH:      mal[Math.floor(rand() * mal.length)],
        po4:     mal[Math.floor(rand() * mal.length)],
        mg:      mal[Math.floor(rand() * mal.length)],
        gfr:     mal[Math.floor(rand() * mal.length)],
        pthExtra:mal[Math.floor(rand() * mal.length)]
      };
    } else {
      inp = {
        caTotal: 4   + rand() * 12,
        alb:     1   + rand() * 5,
        pH:      6.9 + rand() * 0.8,
        po4:     1   + rand() * 11,
        mg:      0.4 + rand() * 3,
        gfr:     5   + rand() * 145,
        pthExtra:rand() * 4
      };
    }
    var r;
    try { r = mineral(inp); }
    catch (e) { fail++; console.error('FALHA fuzz ' + i + ': lançou ' + e.message); continue; }

    fields.forEach(function(f) {
      if (r[f] === undefined) return;
      if (!isFinite(r[f])) { fail++; console.error('FALHA fuzz ' + i + ': ' + f + ' = ' + r[f]); }
      else ok++;
    });

    // invariantes estruturais sempre
    if (r.caIon < 1.5 || r.caIon > 9) { fail++; console.error('FALHA fuzz ' + i + ': caIon fora do clamp'); } else ok++;
    if (r.pth < 1 || r.pth > 3000) { fail++; console.error('FALHA fuzz ' + i + ': pth fora do clamp'); } else ok++;
    if (r.po4 < 0.5 || r.po4 > 18) { fail++; console.error('FALHA fuzz ' + i + ': po4 fora do clamp'); } else ok++;
    if (r.calcitriol < 2 || r.calcitriol > 300) { fail++; console.error('FALHA fuzz ' + i + ': calcitriol fora do clamp'); } else ok++;
    if (r.fgf23 < 5 || r.fgf23 > 5000) { fail++; console.error('FALHA fuzz ' + i + ': fgf23 fora do clamp'); } else ok++;
    // identidade do corrigido só vale quando o resultado NÃO saturou no clamp [2,20]
    var caCorrRaw = r.caTotal + C.CORR_K * (C.ALB_N - r.alb);
    if (r.caCorr > 2 + 1e-9 && r.caCorr < 20 - 1e-9) {
      if (Math.abs(r.caCorr - caCorrRaw) > 1e-6) { fail++; console.error('FALHA fuzz ' + i + ': caCorr ≠ fórmula'); } else ok++;
    } else ok++;
    // produto caxpo4
    if (Math.abs(r.caxpo4 - r.caCorr * r.po4) > 1e-6) { fail++; console.error('FALHA fuzz ' + i + ': caxpo4 ≠ caCorr·po4'); } else ok++;
    if (typeof r.regime !== 'string' || typeof r.estadoCa !== 'string') { fail++; console.error('FALHA fuzz ' + i + ': classificação não-string'); } else ok++;

    // layouts: sem NaN nos pontos
    var L = caIonLayout(inp, 900, 320);
    if (!isFinite(L.ptsN[0].x) || !isFinite(L.ptsAlc[L.ptsAlc.length - 1].y)) { fail++; console.error('FALHA fuzz ' + i + ': caIonLayout NaN'); } else ok++;
    var D = drcLayout(inp, 600, 240);
    if (!isFinite(D.ptsPO4[0].y) || !isFinite(D.ptsCalc[D.ptsCalc.length - 1].y)) { fail++; console.error('FALHA fuzz ' + i + ': drcLayout NaN'); } else ok++;
  }
})();

// ─── Saída ───────────────────────────────────────────────────────────────────
console.log(ok + ' OK · ' + fail + ' falhas');
process.exit(fail > 0 ? 1 : 0);
