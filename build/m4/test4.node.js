'use strict';
/*
 * FILTRA · M4 — test4.node.js
 * Bateria de robustez para creatinina(): 8 categorias + fuzzing 5000 entradas.
 * Critério: determinístico (3× idêntico), 0 falhas.
 */

var m = require('./model4.js');
var creatinina = m.creatinina;
var clearance  = m.clearance;
var egfrFromCr = m.egfrFromCr;
var ckdStage   = m.ckdStage;
var hiperboleLayout = m.hiperboleLayout;
var atrasoLayout    = m.atrasoLayout;
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
  var r = creatinina({});
  assert(r.pcr > 0.7 && r.pcr < 1.1, 'P_Cr default ≈ 0.9 mg/dL, got ' + r.pcr.toFixed(3));
  assert(r.pcrSs > 0.7 && r.pcrSs < 1.1, 'P_Cr_ss default ≈ 0.9, got ' + r.pcrSs.toFixed(3));
  assert(r.eGFR_cr > 85 && r.eGFR_cr < 125, 'eGFR_cr default ~saudável (85..125), got ' + r.eGFR_cr.toFixed(0));
  assert(r.eGFR_cys > 85, 'eGFR_cys default saudável, got ' + r.eGFR_cys.toFixed(0));
  assert(r.cys > 0.7 && r.cys < 1.0, 'cistatina C default ≈ 0.85 mg/L, got ' + r.cys.toFixed(3));
  assert(r.clCr > r.GFR, 'ClCr default > TFG (secreção superestima)');
  assert(Math.abs(r.clCr - r.GFR * (1 + r.secEff)) < 1e-9, 'ClCr = TFG·(1+secEff)');
  assert(r.estagio === 'G1', 'estágio default G1 (TFG 120), got ' + r.estagio);
  assert(r.regime === 'normal', 'regime default normal, got ' + r.regime);
  assert(Math.abs(r.lag) < 1e-9, 'lag default ≈ 0 (equilíbrio), got ' + r.lag);
  // estadiamento KDIGO
  assert(ckdStage(120) === 'G1' && ckdStage(75) === 'G2' && ckdStage(50) === 'G3a'
      && ckdStage(35) === 'G3b' && ckdStage(20) === 'G4' && ckdStage(10) === 'G5',
    'ckdStage cobre G1..G5');
})();

// ─── 2. IDENTIDADES ───────────────────────────────────────────────────────────
(function() {
  var r = creatinina({ GFR: 60, muscle: 1.2, sexF: true, age: 70, drug: 0.5 });
  // ClCr = TFG·(1+secEff)
  assert(Math.abs(r.clCr - r.GFR * (1 + r.secEff)) < 1e-7, 'ID: ClCr = TFG·(1+secEff)');
  // overestimate = ClCr - TFG
  assert(Math.abs(r.overestimate - (r.clCr - r.GFR)) < 1e-7, 'ID: overestimate = ClCr - TFG');
  // HIPÉRBOLE: P_Cr_ss · TFG · (1+secEff) = geração (no equilíbrio, geração=excreção)
  assert(Math.abs(r.pcrSs * r.GFR * (1 + r.secEff) - r.gen) < 1e-6, 'ID: P_Cr_ss·TFG·(1+secEff) = geração (hipérbole)');
  // secEff = SEC_N·(1 - SEC_BLOCK·drug)
  assert(Math.abs(r.secEff - C.SEC_N * (1 - C.SEC_BLOCK * r.drug)) < 1e-9, 'ID: secEff = SEC_N·(1-SEC_BLOCK·drug)');
  // cys = CYS_N · (GFR_N/GFR)
  assert(Math.abs(r.cys - C.CYS_N * (C.GFR_N / r.GFR)) < 1e-7, 'ID: cys = CYS_N·(GFR_N/GFR)');
  // clearance algébrico: C = U·V/P
  assert(Math.abs(clearance(120, 1, 1) - 120) < 1e-9, 'ID: clearance U·V/P (inulina = TFG)');
  assert(Math.abs(clearance(60, 2, 1) - 120) < 1e-9, 'ID: clearance escala com U e V̇');
  // no equilíbrio (day grande) pcr → pcrSs
  var re = creatinina({ GFR0: 120, GFR: 20, day: 999 });
  assert(Math.abs(re.pcr - re.pcrSs) < 1e-3, 'ID: day grande → pcr converge ao platô pcrSs');
  // lag = pcrSs - pcr
  assert(Math.abs(r.lag - (r.pcrSs - r.pcr)) < 1e-9, 'ID: lag = pcrSs - pcr');
})();

// ─── 3. LEIS (monotonicidade) ─────────────────────────────────────────────────
(function() {
  // P_Cr↑ conforme TFG↓ (a hipérbole)
  var a = creatinina({ GFR: 120 }), b = creatinina({ GFR: 60 }), c = creatinina({ GFR: 30 });
  assert(a.pcrSs < b.pcrSs && b.pcrSs < c.pcrSs, 'LEI: P_Cr↑ conforme TFG↓ (hipérbole)');
  // P_Cr↑ conforme massa muscular↑ (mesma TFG)
  var m1 = creatinina({ GFR: 80, muscle: 0.5 }), m2 = creatinina({ GFR: 80, muscle: 1.0 }), m3 = creatinina({ GFR: 80, muscle: 1.6 });
  assert(m1.pcrSs < m2.pcrSs && m2.pcrSs < m3.pcrSs, 'LEI: P_Cr↑ conforme músculo↑');
  // ClCr ≥ TFG sempre (secreção superestima)
  [120, 90, 60, 30, 15].forEach(function(g) {
    var r = creatinina({ GFR: g });
    assert(r.clCr >= r.GFR, 'LEI: ClCr ≥ TFG em TFG=' + g + ' (secreção)');
  });
  // eGFR↓ conforme Cr↑
  assert(egfrFromCr(0.8, 50, false) > egfrFromCr(1.5, 50, false), 'LEI: eGFR↓ conforme Cr↑');
  assert(egfrFromCr(1.5, 50, false) > egfrFromCr(4.0, 50, false), 'LEI: eGFR↓ conforme Cr↑ (faixa alta)');
  // cistatina↑ conforme TFG↓
  assert(a.cys < b.cys && b.cys < c.cys, 'LEI: cistatina↑ conforme TFG↓');
  // bloqueio da secreção↑ → P_Cr_ss↑ (sem mexer na TFG)
  var d0 = creatinina({ GFR: 100, drug: 0 }), d1 = creatinina({ GFR: 100, drug: 0.5 }), d2 = creatinina({ GFR: 100, drug: 1 });
  assert(d0.pcrSs < d1.pcrSs && d1.pcrSs < d2.pcrSs, 'LEI: P_Cr_ss↑ conforme bloqueio da secreção↑');
  assert(d0.GFR === d2.GFR, 'LEI: bloqueio não muda a TFG (a Cr sobe sem lesão)');
  // no não-equilíbrio, a Cr cresce com o tempo após queda de TFG
  var t1 = creatinina({ GFR0: 120, GFR: 20, day: 0.5 });
  var t2 = creatinina({ GFR0: 120, GFR: 20, day: 3 });
  var t3 = creatinina({ GFR0: 120, GFR: 20, day: 10 });
  assert(t1.pcr < t2.pcr && t2.pcr < t3.pcr, 'LEI: P_Cr↑ com o tempo após queda aguda de TFG');
})();

// ─── 4. PÉROLAS ───────────────────────────────────────────────────────────────
(function() {
  // Pérola 1 (faixa cega): TFG 120→60 mantém a Cr ainda em faixa próxima do normal,
  // enquanto 30→15 DOBRA a Cr e a tira de qualquer dúvida.
  var g120 = creatinina({ GFR: 120 }), g60 = creatinina({ GFR: 60 });
  var g30  = creatinina({ GFR: 30 }),  g15 = creatinina({ GFR: 15 });
  assert(g60.pcrSs / g120.pcrSs > 1.9 && g60.pcrSs / g120.pcrSs < 2.1, 'PÉROLA: 120→60 dobra a Cr (mas ainda baixa em absoluto)');
  assert(g120.pcrSs < 1.0 && g60.pcrSs < 2.0, 'PÉROLA faixa cega: metade da TFG perdida, Cr ainda < 2');
  assert(g15.pcrSs - g30.pcrSs > 3.0, 'PÉROLA: 30→15 = salto dramático de Cr (> 3 mg/dL)');
  // a faixa cega: TFG 90 (perda de 25%) ainda dá Cr ~limiar de normalidade
  var g90 = creatinina({ GFR: 90 });
  assert(g90.pcrSs < 1.3, 'PÉROLA faixa cega: TFG 90 (perda 25%) → Cr ainda quase normal (' + g90.pcrSs.toFixed(2) + ')');

  // Pérola 2 (massa muscular): baixa massa → Cr NORMAL apesar de TFG ruim.
  var idosa = creatinina({ GFR: 35, muscle: 0.4, sexF: true, age: 80 });
  assert(idosa.pcrSs < idosa.crLimiar, 'PÉROLA massa: idosa caquética TFG 35 → Cr abaixo do limiar (a creatinina MENTE)');
  assert(idosa.faixaCega === true, 'PÉROLA massa: idosa cai na faixa cega (Cr engana)');
  // mesma TFG, músculo normal → Cr já francamente alterada
  var jovem = creatinina({ GFR: 35, muscle: 1.3, age: 30 });
  assert(jovem.pcrSs > idosa.pcrSs * 1.5, 'PÉROLA massa: mesma TFG, músculo alto → Cr muito maior');

  // Pérola 3 (secreção bloqueada): droga sobe a Cr SEM mudar a TFG.
  var semDroga = creatinina({ GFR: 120, drug: 0 });
  var comDroga = creatinina({ GFR: 120, drug: 1 });
  assert(comDroga.pcrSs > semDroga.pcrSs, 'PÉROLA secreção: droga sobe a Cr');
  assert(comDroga.GFR === semDroga.GFR, 'PÉROLA secreção: TFG inalterada (não é lesão)');
  assert(comDroga.regime === 'secrecao_bloqueada', 'PÉROLA secreção: regime secrecao_bloqueada');

  // Pérola 4 (não-equilíbrio): logo após a queda, a Cr ATRASA — subestima a gravidade.
  var dia1 = creatinina({ GFR0: 120, GFR: 20, day: 1 });
  assert(dia1.lag > 1.0, 'PÉROLA não-equilíbrio: Cr ainda muito abaixo do platô (lag > 1)');
  assert(dia1.pcr < dia1.pcrSs, 'PÉROLA não-equilíbrio: Cr atual < Cr de equilíbrio');
  assert(dia1.regime === 'nao_equilibrio', 'PÉROLA não-equilíbrio: regime nao_equilibrio');
  // o eGFR pela Cr atrasada SUPERESTIMA a função real
  assert(dia1.eGFR_cr > 30, 'PÉROLA não-equilíbrio: eGFR-Cr ainda parece razoável apesar de TFG real = 20');

  // Pérola 5 (cistatina): independe de músculo — idosa caquética tem cistatina alta mesmo com Cr normal
  assert(idosa.cys > 2.0, 'PÉROLA cistatina: idosa TFG 35 → cistatina alta (não engana como a Cr)');
  assert(idosa.eGFR_cys < idosa.eGFR_cr, 'PÉROLA cistatina: eGFR-cistatina < eGFR-Cr (a Cr mente p/ cima na baixa massa)');
})();

// ─── 5. DETERMINISMO ─────────────────────────────────────────────────────────
(function() {
  var inp = { GFR: 45, GFR0: 90, muscle: 0.7, sexF: true, age: 66, drug: 0.4, day: 2 };
  var r1 = creatinina(inp), r2 = creatinina(inp), r3 = creatinina(inp);
  assert(r1.pcr === r2.pcr && r2.pcr === r3.pcr, 'Determinismo: pcr idêntico em 3 chamadas');
  assert(r1.eGFR_cr === r2.eGFR_cr && r2.eGFR_cr === r3.eGFR_cr, 'Determinismo: eGFR_cr idêntico');
  assert(r1.regime === r2.regime, 'Determinismo: regime idêntico');
  var frozen = Object.freeze({ GFR: 50, muscle: 1, day: 1 });
  try { creatinina(frozen); assert(true, 'freeze: não lançou'); }
  catch (e) { fail++; console.error('FALHA: freeze lançou: ' + e.message); }
  assert(frozen.GFR === 50, 'freeze: objeto de entrada não mutado');
  // layouts também não devem mutar o estado
  var st = Object.freeze({ GFR: 30, muscle: 0.8 });
  try { hiperboleLayout(st, 900, 320); atrasoLayout(st, 600, 240); assert(true, 'layouts: freeze ok'); }
  catch (e) { fail++; console.error('FALHA: layout freeze lançou: ' + e.message); }
})();

// ─── 6. ROBUSTEZ ─────────────────────────────────────────────────────────────
(function() {
  var cases = [
    {},
    null,
    undefined,
    { GFR: NaN, muscle: null, age: undefined, drug: 'string', day: 'x' },
    { GFR: Infinity, GFR0: -Infinity, muscle: 999, age: -5, drug: 2, day: -1 },
    { GFR: 0, GFR0: 0, muscle: 0, age: 0, drug: 0, day: 0 },
    { GFR: 1e9, muscle: -1e9, age: 1e9, drug: 1e9, day: 1e9 },
    { sexF: 'F', muscle: 'lixo' }
  ];
  var fields = ['pcr', 'pcrSs', 'pcr0', 'clCr', 'overestimate', 'cys', 'eGFR_cr', 'eGFR_cys',
                'gen', 'secEff', 'tau', 'GFR'];
  cases.forEach(function(inp, i) {
    var r;
    try { r = creatinina(inp); }
    catch (e) { fail++; console.error('FALHA robustez caso ' + i + ': lançou ' + e.message); return; }
    fields.forEach(function(f) {
      assert(isFinite(r[f]), 'Robustez caso ' + i + ': ' + f + ' é finito, got ' + r[f]);
    });
    assert(r.pcr >= 0.1 && r.pcr <= 25, 'Robustez caso ' + i + ': pcr no clamp [0.1,25]');
    assert(r.eGFR_cr >= 0, 'Robustez caso ' + i + ': eGFR_cr ≥ 0');
    assert(r.cys >= 0.3 && r.cys <= 12, 'Robustez caso ' + i + ': cys no clamp');
    assert(typeof r.regime === 'string', 'Robustez caso ' + i + ': regime é string');
    assert(typeof r.estagio === 'string', 'Robustez caso ' + i + ': estagio é string');
    assert(typeof r.faixaCega === 'boolean', 'Robustez caso ' + i + ': faixaCega é boolean');
    // layouts robustos
    var L = hiperboleLayout(inp, 900, 320), A = atrasoLayout(inp, 600, 240);
    assert(L.pts.length > 0 && isFinite(L.pts[0].x) && isFinite(L.pts[0].y), 'Robustez caso ' + i + ': hiperboleLayout finito');
    assert(A.pts.length > 0 && isFinite(A.pts[0].y), 'Robustez caso ' + i + ': atrasoLayout finito');
  });
})();

// ─── 7. FUZZING (PRNG semeado, ≥5000 entradas, 30% malignas) ─────────────────
(function() {
  var N = 5000;
  var MALO = 0.30;
  var fields = ['pcr', 'pcrSs', 'pcr0', 'clCr', 'overestimate', 'overestimatePct', 'cys',
                'eGFR_cr', 'eGFR_cys', 'gen', 'secEff', 'tau', 'lag'];

  for (var i = 0; i < N; i++) {
    var inp;
    if (rand() < MALO) {
      var mal = [NaN, Infinity, -Infinity, null, undefined, '', '0', 1e15, -1e15, 0];
      inp = {
        GFR:    mal[Math.floor(rand() * mal.length)],
        GFR0:   mal[Math.floor(rand() * mal.length)],
        muscle: mal[Math.floor(rand() * mal.length)],
        sexF:   mal[Math.floor(rand() * mal.length)],
        age:    mal[Math.floor(rand() * mal.length)],
        drug:   mal[Math.floor(rand() * mal.length)],
        day:    mal[Math.floor(rand() * mal.length)]
      };
    } else {
      inp = {
        GFR:    2   + rand() * 198,
        GFR0:   2   + rand() * 198,
        muscle: 0.3 + rand() * 1.5,
        sexF:   rand() < 0.5,
        age:    18  + rand() * 90,
        drug:   rand(),
        day:    rand() * 20
      };
    }
    var r;
    try { r = creatinina(inp); }
    catch (e) { fail++; console.error('FALHA fuzz ' + i + ': lançou ' + e.message); continue; }

    fields.forEach(function(f) {
      if (r[f] === undefined) return;
      if (!isFinite(r[f])) { fail++; console.error('FALHA fuzz ' + i + ': ' + f + ' = ' + r[f]); }
      else ok++;
    });

    // invariantes estruturais sempre
    if (r.pcr < 0.1 || r.pcr > 25) { fail++; console.error('FALHA fuzz ' + i + ': pcr fora do clamp'); } else ok++;
    if (r.cys < 0.3 || r.cys > 12) { fail++; console.error('FALHA fuzz ' + i + ': cys fora do clamp'); } else ok++;
    if (Math.abs(r.clCr - r.GFR * (1 + r.secEff)) > 1e-6) { fail++; console.error('FALHA fuzz ' + i + ': ClCr ≠ TFG·(1+secEff)'); } else ok++;
    if (r.clCr < r.GFR - 1e-9) { fail++; console.error('FALHA fuzz ' + i + ': ClCr < TFG (secreção)'); } else ok++;
    // a hipérbole só vale quando pcrSs NÃO está saturada nos clamps [0.1, 25]
    if (r.pcrSs > 0.1 + 1e-9 && r.pcrSs < 25 - 1e-9) {
      if (Math.abs(r.pcrSs * r.GFR * (1 + r.secEff) - r.gen) > 1e-3) { fail++; console.error('FALHA fuzz ' + i + ': hipérbole quebrou'); } else ok++;
    } else ok++;
    if (r.eGFR_cr < 0 || r.eGFR_cys < 0) { fail++; console.error('FALHA fuzz ' + i + ': eGFR negativo'); } else ok++;
    if (typeof r.regime !== 'string' || typeof r.estagio !== 'string') { fail++; console.error('FALHA fuzz ' + i + ': classificação não-string'); } else ok++;

    // layouts: sem NaN nos pontos
    var L = hiperboleLayout(inp, 900, 320);
    if (!isFinite(L.pts[0].x) || !isFinite(L.pts[L.pts.length - 1].y)) { fail++; console.error('FALHA fuzz ' + i + ': layout NaN'); } else ok++;
  }
})();

// ─── Saída ───────────────────────────────────────────────────────────────────
console.log(ok + ' OK · ' + fail + ' falhas');
process.exit(fail > 0 ? 1 : 0);
