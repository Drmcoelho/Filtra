'use strict';
/*
 * FILTRA · M8 — test8.node.js
 * Bateria de robustez para ductoColetor()/doseResposta(): 8 categorias
 * + fuzzing 5000 entradas. Critério: determinístico (3× idêntico), 0 falhas.
 */

var m = require('./model8.js');
var ductoColetor = m.ductoColetor;
var doseResposta = m.doseResposta;
var kSecrecaoLayout    = m.kSecrecaoLayout;
var doseRespostaLayout = m.doseRespostaLayout;
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
  var r = ductoColetor({});
  // basal: aldo=1 → K=4.2, kSec=1
  assert(Math.abs(r.kSerico - C.K_N) < 1e-9, 'basal: K⁺ sérico ≈ 4.2, got ' + r.kSerico.toFixed(2));
  assert(Math.abs(r.kSecrecao - C.KSEC_N) < 1e-9, 'basal: secreção de K⁺ ≈ 1, got ' + r.kSecrecao.toFixed(2));
  assert(Math.abs(r.naSerico - C.NA_N) < 1e-9, 'basal: Na⁺ sérico ≈ 140, got ' + r.naSerico.toFixed(1));
  // aldosterona alta → K secretado↑ + K sérico↓
  var ra = ductoColetor({ aldo: 2.5 });
  assert(ra.kSecrecao > r.kSecrecao, 'BASE: aldosterona alta → K secretado↑');
  assert(ra.kSerico < r.kSerico, 'BASE: aldosterona alta → K sérico↓ (hipocalemia)');
  assert(ra.hco3Plasma > r.hco3Plasma, 'BASE: aldosterona alta → HCO₃↑ (alcalose metabólica)');
  // Na reabsorvido pelo ducto sobe com aldo (mas é fino ~2-3%)
  assert(ra.fracNaDucto > r.fracNaDucto, 'BASE: aldosterona alta → Na reabsorvido no ducto↑');
  assert(r.fracNaDucto <= 0.06 + 1e-9, 'BASE: o ducto maneja só ~2–3% do Na⁺ (fino)');
  // ADH alto → urina concentrada / água reabsorvida↑
  var rd = ductoColetor({ adh: 2.5 });
  assert(rd.osmUrina > r.osmUrina, 'BASE: ADH alto → urina mais concentrada (osmU↑)');
  assert(rd.aguaLivreReab > r.aguaLivreReab, 'BASE: ADH alto → reabsorção de água livre↑');
  assert(rd.clearanceAguaLivre < r.clearanceAguaLivre, 'BASE: ADH alto → clearance de água livre↓ (retém água)');
  assert(r.regime === 'normal', 'BASE: regime default normal, got ' + r.regime);
  // sem droga → efeitos zerados
  assert(r.eSpiro === 0 && r.eEple === 0 && r.eAmil === 0 && r.eTolva === 0, 'BASE: sem droga → efeitos zero');
})();

// ─── 2. IDENTIDADES ───────────────────────────────────────────────────────────
(function() {
  // dose-resposta: efeito(0)=0, efeito(∞)→Emax, efeito(EC50)=Emax/2
  assert(doseResposta(0, 50, 0.85) === 0, 'ID: efeito(0) = 0');
  assert(Math.abs(doseResposta(1e12, 50, 0.85) - 0.85) < 1e-6, 'ID: efeito(∞) → Emax');
  assert(Math.abs(doseResposta(50, 50, 0.85) - 0.425) < 1e-9, 'ID: efeito(EC50) = Emax/2 (espiro)');
  assert(Math.abs(doseResposta(5, 5, 0.80) - 0.40) < 1e-9, 'ID: efeito(EC50) = Emax/2 (amilorida)');
  assert(Math.abs(doseResposta(15, 15, 0.90) - 0.45) < 1e-9, 'ID: efeito(EC50) = Emax/2 (tolvaptana)');
  // o motor usa a mesma dose-resposta
  var rs = ductoColetor({ espiro: C.SPIRO_EC50 });
  assert(Math.abs(rs.eSpiro - C.SPIRO_EMAX / 2) < 1e-9, 'ID: eSpiro na EC50 = Emax/2 (motor)');
  var rt = ductoColetor({ tolvaptana: C.TOLVA_EC50 });
  assert(Math.abs(rt.eTolva - C.TOLVA_EMAX / 2) < 1e-9, 'ID: eTolva na EC50 = Emax/2 (motor)');
  // a secreção de K acompanha a atividade do ENaC (trocaNaK = kSecrecao)
  var r = ductoColetor({ aldo: 2 });
  assert(Math.abs(r.trocaNaK - r.kSecrecao) < 1e-9, 'ID: trocaNaK = kSecrecao (acoplamento ENaC→K)');
  // sem Liddle: enacAtiv = aldo·(1−blocoENaCef)
  assert(Math.abs(r.kSecrecao - r.enacAtiv) < 1e-9, 'ID: kSecrecao = enacAtiv (basal sem teto)');
  // bloqueio combinado MR não passa de 1
  var rmix = ductoColetor({ espiro: 1000, eplerenona: 1000 });
  assert(rmix.blocoMR <= 1 + 1e-9, 'ID: bloqueio MR combinado ≤ 1');
  assert(rmix.blocoENaC <= 1 + 1e-9, 'ID: bloqueio ENaC combinado ≤ 1');
})();

// ─── 3. LEIS (monotonicidade) ─────────────────────────────────────────────────
(function() {
  // poupador dose↑ → K sérico↑ + natriurese leve↑
  var p0 = ductoColetor({ espiro: 0 }), p1 = ductoColetor({ espiro: 25 }), p2 = ductoColetor({ espiro: 100 });
  assert(p0.kSerico < p1.kSerico && p1.kSerico < p2.kSerico, 'LEI: espironolactona dose↑ → K sérico↑');
  assert(p0.natriurese < p1.natriurese && p1.natriurese < p2.natriurese, 'LEI: espironolactona dose↑ → natriurese↑');
  // amilorida idem
  var a1 = ductoColetor({ amilorida: 5 }), a2 = ductoColetor({ amilorida: 10 });
  assert(a1.kSerico < a2.kSerico, 'LEI: amilorida dose↑ → K sérico↑');
  // eplerenona idem
  var e1 = ductoColetor({ eplerenona: 25 }), e2 = ductoColetor({ eplerenona: 50 });
  assert(e1.kSerico < e2.kSerico, 'LEI: eplerenona dose↑ → K sérico↑');
  // tolvaptana dose↑ → clearance de água livre↑ → Na sérico↑ (em ADH alto / SIADH)
  var t0 = ductoColetor({ tolvaptana: 0, adh: 3 });
  var t1 = ductoColetor({ tolvaptana: 15, adh: 3 });
  var t2 = ductoColetor({ tolvaptana: 60, adh: 3 });
  assert(t0.clearanceAguaLivre < t1.clearanceAguaLivre && t1.clearanceAguaLivre < t2.clearanceAguaLivre,
    'LEI: tolvaptana dose↑ → clearance de água livre↑ (aquarese)');
  assert(t0.naSerico < t1.naSerico && t1.naSerico < t2.naSerico, 'LEI: tolvaptana dose↑ → Na sérico↑');
  // aldosterona↑ → K secretado↑ (e K sérico↓)
  var al1 = ductoColetor({ aldo: 1 }), al2 = ductoColetor({ aldo: 2 }), al3 = ductoColetor({ aldo: 3 });
  assert(al1.kSecrecao < al2.kSecrecao && al2.kSecrecao < al3.kSecrecao, 'LEI: aldosterona↑ → K secretado↑');
  assert(al1.kSerico > al2.kSerico && al2.kSerico > al3.kSerico, 'LEI: aldosterona↑ → K sérico↓');
  // ADH↑ → urina concentrada (osmU↑) e clearance de água livre↓
  var d1 = ductoColetor({ adh: 1 }), d2 = ductoColetor({ adh: 2 }), d3 = ductoColetor({ adh: 4 });
  assert(d1.osmUrina < d2.osmUrina && d2.osmUrina < d3.osmUrina, 'LEI: ADH↑ → osmolalidade urinária↑');
  assert(d1.clearanceAguaLivre > d2.clearanceAguaLivre && d2.clearanceAguaLivre > d3.clearanceAguaLivre,
    'LEI: ADH↑ → clearance de água livre↓');
  // dose-resposta monotônica crescente
  assert(doseResposta(25, 50, 0.85) < doseResposta(100, 50, 0.85), 'LEI: dose-resposta monotônica crescente');
})();

// ─── 4. PÉROLAS ───────────────────────────────────────────────────────────────
(function() {
  // Pérola 1: a aldosterona TROCA Na por K/H — não "só retém Na".
  // sinal: subir a aldo aumenta o Na reabsorvido E a secreção de K (acoplados) → K sérico cai.
  var b = ductoColetor({ aldo: 1 }), h = ductoColetor({ aldo: 3 });
  assert(h.fracNaDucto > b.fracNaDucto, 'PÉROLA troca: aldo alta → Na reabsorvido↑');
  assert(h.kSecrecao > b.kSecrecao, 'PÉROLA troca: aldo alta → K SECRETADO↑ (não só retém Na)');
  assert(h.kSerico < b.kSerico && h.hco3Plasma > b.hco3Plasma,
    'PÉROLA troca: aldo alta → hipocalemia + alcalose (troca Na por K e H)');

  // Pérola 2: poupador + IECA → HIPERCALEMIA (somam-se no eixo da aldosterona).
  var pp = ductoColetor({ espiro: 50 });
  var ppi = ductoColetor({ espiro: 50, ieca: true });
  assert(ppi.kSerico > pp.kSerico, 'PÉROLA poupador+IECA: o IECA agrava o K (hipercalemia)');
  assert(ppi.regime === 'poupador_ieca_hipercalemia', 'PÉROLA poupador+IECA: regime de hipercalemia');
  assert(ppi.kSerico > 5.0, 'PÉROLA poupador+IECA: K sérico em faixa de hipercalemia, got ' + ppi.kSerico.toFixed(2));

  // Pérola 3: a tolvaptana corrige a água SEM mexer no Na corporal (aquarese).
  // o Na sérico sobe pela remoção de ÁGUA LIVRE (clearance↑), não por ganho de sódio.
  var siadh = ductoColetor({ adh: 3, tolvaptana: 0 });
  var corr  = ductoColetor({ adh: 3, tolvaptana: 30 });
  assert(corr.naSerico > siadh.naSerico, 'PÉROLA tolvaptana: Na sérico sobe (corrige a hiponatremia)');
  assert(corr.clearanceAguaLivre > siadh.clearanceAguaLivre, 'PÉROLA tolvaptana: corrige pela ÁGUA (clearance de água livre↑)');
  assert(Math.abs(corr.natriurese - siadh.natriurese) < 1e-9, 'PÉROLA tolvaptana: NÃO é natriurese (Na corporal inalterado)');
  assert(corr.regime === 'tolvaptana_aquarese', 'PÉROLA tolvaptana: regime de aquarese');

  // Pérola 4: ADH e aldosterona são alavancas DISTINTAS (água livre × volume/K).
  // mover só o ADH não muda o K sérico; mover só a aldo não muda a osmolalidade urinária.
  var soAdh  = ductoColetor({ adh: 3 });
  var soAldo = ductoColetor({ aldo: 3 });
  assert(Math.abs(soAdh.kSerico - C.K_N) < 1e-9, 'PÉROLA alavancas: o ADH (água) NÃO mexe no K sérico');
  assert(Math.abs(soAldo.osmUrina - ductoColetor({}).osmUrina) < 1e-9, 'PÉROLA alavancas: a aldosterona (Na/K) NÃO mexe na osmolalidade urinária');
  assert(soAdh.osmUrina > ductoColetor({}).osmUrina && soAldo.kSecrecao > ductoColetor({}).kSecrecao,
    'PÉROLA alavancas: cada eixo move SÓ a sua variável (água livre × volume/K)');

  // Pérola 5: Liddle resiste à espironolactona (MR) mas cede à amilorida (canal).
  var lid    = ductoColetor({ liddle: true });
  var lidSpi = ductoColetor({ liddle: true, espiro: 100 });
  var lidAmi = ductoColetor({ liddle: true, amilorida: 10 });
  assert(Math.abs(lidSpi.kSecrecao - lid.kSecrecao) < 1e-9, 'PÉROLA Liddle: a espironolactona (MR) NÃO resolve (ENaC constitutivo)');
  assert(lidAmi.kSecrecao < lid.kSecrecao, 'PÉROLA Liddle: a amilorida (bloqueio de canal) RESOLVE');
})();

// ─── 5. DETERMINISMO ─────────────────────────────────────────────────────────
(function() {
  var inp = { aldo: 2.2, adh: 1.8, espiro: 50, eplerenona: 0, amilorida: 5, tolvaptana: 30, ieca: false, liddle: false };
  var r1 = ductoColetor(inp), r2 = ductoColetor(inp), r3 = ductoColetor(inp);
  assert(r1.kSerico === r2.kSerico && r2.kSerico === r3.kSerico, 'Determinismo: K sérico idêntico em 3 chamadas');
  assert(r1.naSerico === r2.naSerico, 'Determinismo: Na sérico idêntico');
  assert(r1.regime === r2.regime, 'Determinismo: regime idêntico');
  var frozen = Object.freeze({ aldo: 3, espiro: 50, tolvaptana: 30 });
  try { ductoColetor(frozen); assert(true, 'freeze: não lançou'); }
  catch (e) { fail++; console.error('FALHA: freeze lançou: ' + e.message); }
  assert(frozen.aldo === 3, 'freeze: objeto de entrada não mutado');
  var st = Object.freeze({ aldo: 2, espiro: 50 });
  try { kSecrecaoLayout(st, 900, 320); doseRespostaLayout(C.SPIRO_EC50, C.SPIRO_EMAX, 200, 300, 180, 50); assert(true, 'layouts: freeze ok'); }
  catch (e) { fail++; console.error('FALHA: layout freeze lançou: ' + e.message); }
})();

// ─── 6. ROBUSTEZ ─────────────────────────────────────────────────────────────
(function() {
  var cases = [
    {},
    null,
    undefined,
    { aldo: NaN, adh: null, espiro: undefined, eplerenona: 'string', amilorida: 'x', tolvaptana: 'y', ieca: 'lixo', liddle: 'lixo' },
    { aldo: Infinity, adh: -Infinity, espiro: 1e12, eplerenona: -5, amilorida: 1e9, tolvaptana: -1e9, ieca: 1, liddle: 1 },
    { aldo: 0, adh: 0, espiro: 0, eplerenona: 0, amilorida: 0, tolvaptana: 0 },
    { aldo: 1e9, adh: 1e9, espiro: -1e9, eplerenona: 1e9, amilorida: -1e9, tolvaptana: 1e9 },
    { aldo: '3', adh: '2', espiro: '50', ieca: 'sim', liddle: 'sim' }
  ];
  var fields = ['aldo', 'adh', 'eSpiro', 'eEple', 'eAmil', 'eTolva', 'blocoMR', 'blocoENaC', 'blocoENaCef',
                'enacAtiv', 'fracNaDucto', 'voltagemLuminal', 'kSecrecao', 'hSecrecao',
                'kSerico', 'hco3Plasma', 'adhEf', 'osmUrina', 'aguaLivreReab', 'clearanceAguaLivre',
                'naSerico', 'natriurese', 'fluxoUrinario'];
  cases.forEach(function(inp, i) {
    var r;
    try { r = ductoColetor(inp); }
    catch (e) { fail++; console.error('FALHA robustez caso ' + i + ': lançou ' + e.message); return; }
    fields.forEach(function(f) {
      assert(isFinite(r[f]), 'Robustez caso ' + i + ': ' + f + ' é finito, got ' + r[f]);
    });
    assert(r.eSpiro >= 0 && r.eSpiro <= C.SPIRO_EMAX + 1e-9, 'Robustez caso ' + i + ': eSpiro em [0,Emax]');
    assert(r.eTolva >= 0 && r.eTolva <= C.TOLVA_EMAX + 1e-9, 'Robustez caso ' + i + ': eTolva em [0,Emax]');
    assert(r.kSerico >= 1.5 - 1e-9 && r.kSerico <= 9.0 + 1e-9, 'Robustez caso ' + i + ': K sérico no clamp');
    assert(r.naSerico >= 110 - 1e-9 && r.naSerico <= 165 + 1e-9, 'Robustez caso ' + i + ': Na sérico no clamp');
    assert(r.hco3Plasma >= 14 - 1e-9 && r.hco3Plasma <= 36 + 1e-9, 'Robustez caso ' + i + ': HCO₃ no clamp');
    assert(r.osmUrina >= 50 - 1e-9 && r.osmUrina <= 1200 + 1e-9, 'Robustez caso ' + i + ': osmU no clamp');
    assert(r.fracNaDucto >= 0 && r.fracNaDucto <= 0.06 + 1e-9, 'Robustez caso ' + i + ': fracNaDucto no clamp');
    assert(typeof r.regime === 'string', 'Robustez caso ' + i + ': regime é string');
    var L = kSecrecaoLayout(inp, 900, 320);
    assert(L.semBloco.length > 0 && isFinite(L.semBloco[0].x) && isFinite(L.comBloco[L.comBloco.length - 1].y), 'Robustez caso ' + i + ': kSecrecaoLayout finito');
    var spiroIn = (inp && inp.espiro !== undefined) ? inp.espiro : 0;
    var D = doseRespostaLayout(spiroIn, 0.85, 200, 300, 180, spiroIn);
    assert(D.pts.length > 0 && isFinite(D.pts[0].y), 'Robustez caso ' + i + ': doseRespostaLayout finito');
  });
})();

// ─── 7. FUZZING (PRNG semeado, ≥5000 entradas, 30% malignas) ─────────────────
(function() {
  var N = 5000;
  var MALO = 0.30;
  var fields = ['eSpiro', 'eEple', 'eAmil', 'eTolva', 'blocoMR', 'blocoENaC', 'blocoENaCef',
                'enacAtiv', 'fracNaDucto', 'kSecrecao', 'hSecrecao', 'kSerico', 'hco3Plasma',
                'adhEf', 'osmUrina', 'clearanceAguaLivre', 'naSerico', 'natriurese', 'fluxoUrinario'];

  for (var i = 0; i < N; i++) {
    var inp;
    if (rand() < MALO) {
      var mal = [NaN, Infinity, -Infinity, null, undefined, '', '0', 1e15, -1e15, 0];
      inp = {
        aldo:       mal[Math.floor(rand() * mal.length)],
        adh:        mal[Math.floor(rand() * mal.length)],
        espiro:     mal[Math.floor(rand() * mal.length)],
        eplerenona: mal[Math.floor(rand() * mal.length)],
        amilorida:  mal[Math.floor(rand() * mal.length)],
        tolvaptana: mal[Math.floor(rand() * mal.length)],
        ieca:       mal[Math.floor(rand() * mal.length)],
        liddle:     mal[Math.floor(rand() * mal.length)]
      };
    } else {
      inp = {
        aldo:       rand() * 5,
        adh:        rand() * 5,
        espiro:     rand() < 0.5 ? 0 : rand() * 200,
        eplerenona: rand() < 0.5 ? 0 : rand() * 100,
        amilorida:  rand() < 0.5 ? 0 : rand() * 20,
        tolvaptana: rand() < 0.5 ? 0 : rand() * 60,
        ieca:       rand() < 0.2,
        liddle:     rand() < 0.1
      };
    }
    var r;
    try { r = ductoColetor(inp); }
    catch (e) { fail++; console.error('FALHA fuzz ' + i + ': lançou ' + e.message); continue; }

    fields.forEach(function(f) {
      if (r[f] === undefined) return;
      if (!isFinite(r[f])) { fail++; console.error('FALHA fuzz ' + i + ': ' + f + ' = ' + r[f]); }
      else ok++;
    });

    // invariantes estruturais sempre
    if (r.kSerico < 1.5 - 1e-9 || r.kSerico > 9.0 + 1e-9) { fail++; console.error('FALHA fuzz ' + i + ': K sérico fora do clamp'); } else ok++;
    if (r.naSerico < 110 - 1e-9 || r.naSerico > 165 + 1e-9) { fail++; console.error('FALHA fuzz ' + i + ': Na sérico fora do clamp'); } else ok++;
    if (r.hco3Plasma < 14 - 1e-9 || r.hco3Plasma > 36 + 1e-9) { fail++; console.error('FALHA fuzz ' + i + ': HCO₃ fora do clamp'); } else ok++;
    if (r.osmUrina < 50 - 1e-9 || r.osmUrina > 1200 + 1e-9) { fail++; console.error('FALHA fuzz ' + i + ': osmU fora do clamp'); } else ok++;
    if (r.fracNaDucto < -1e-9 || r.fracNaDucto > 0.06 + 1e-9) { fail++; console.error('FALHA fuzz ' + i + ': fracNaDucto fora do clamp'); } else ok++;
    if (r.eSpiro < 0 || r.eSpiro > C.SPIRO_EMAX + 1e-9) { fail++; console.error('FALHA fuzz ' + i + ': eSpiro fora de [0,Emax]'); } else ok++;
    if (r.eTolva < 0 || r.eTolva > C.TOLVA_EMAX + 1e-9) { fail++; console.error('FALHA fuzz ' + i + ': eTolva fora de [0,Emax]'); } else ok++;
    if (r.blocoENaCef < -1e-9 || r.blocoENaCef > 1 + 1e-9) { fail++; console.error('FALHA fuzz ' + i + ': blocoENaCef fora de [0,1]'); } else ok++;
    if (typeof r.regime !== 'string') { fail++; console.error('FALHA fuzz ' + i + ': regime não-string'); } else ok++;
    // identidade: trocaNaK = kSecrecao
    if (Math.abs(r.trocaNaK - r.kSecrecao) > 1e-9) { fail++; console.error('FALHA fuzz ' + i + ': trocaNaK ≠ kSecrecao'); } else ok++;

    // layouts: sem NaN nos pontos
    var L = kSecrecaoLayout(inp, 900, 320);
    if (!isFinite(L.semBloco[0].x) || !isFinite(L.comBloco[L.comBloco.length - 1].y)) { fail++; console.error('FALHA fuzz ' + i + ': layout NaN'); } else ok++;
  }
})();

// ─── Saída ───────────────────────────────────────────────────────────────────
console.log(ok + ' OK · ' + fail + ' falhas');
process.exit(fail > 0 ? 1 : 0);
