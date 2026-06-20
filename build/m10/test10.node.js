'use strict';
/*
 * FILTRA · M10 — test10.node.js
 * Bateria de robustez para disnatremia(): 8 categorias + fuzzing ≥5000 entradas.
 * Critério: determinístico (3× idêntico), 0 falhas.
 */

var m = require('./model10.js');
var disnatremia = m.disnatremia;
var agtDe = m.agtDe;
var naEdelman = m.naEdelman;
var clearanceAguaLivre = m.clearanceAguaLivre;
var deltaNaPorLitro = m.deltaNaPorLitro;
var classNa = m.classNa;
var correcaoLayout = m.correcaoLayout;
var aguaLivreLayout = m.aguaLivreLayout;
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
  var r = disnatremia({});
  assert(Math.abs(r.na - 140) < 1e-9, 'Na default = 140 mEq/L, got ' + r.na);
  assert(r.classe === 'normal', 'classe default normal, got ' + r.classe);
  assert(r.regime === 'normal', 'regime default normal, got ' + r.regime);
  assert(Math.abs(r.agt - 42) < 1e-9, 'ÁGT default = 70·0.6 = 42 L, got ' + r.agt);
  assert(Math.abs(r.dNa24) < 1e-9, 'ΔNa24 default ≈ 0 (sem infusão), got ' + r.dNa24);
  assert(r.riscoMielinolise === 0 && r.riscoEdema === 0, 'sem risco no default');

  // SIADH: ADH alto inapropriado → hiponatremia, U_osm alta
  var s = disnatremia({ na: 124, adh: 0.9, cronico: 1 });
  assert(s.hipo === true, 'SIADH: hiponatremia');
  assert(s.uOsm > 100, 'SIADH: U_osm alta (urina concentrada), got ' + s.uOsm.toFixed(0));
  assert(s.regime === 'siadh', 'SIADH: regime siadh, got ' + s.regime);

  // DI: não concentra → hipernatremia, U_osm baixa, ADH baixo
  var di = disnatremia({ na: 152, adh: 0.05, cronico: 1 });
  assert(di.hiper === true, 'DI: hipernatremia');
  assert(di.uOsm < 300, 'DI: U_osm baixa (não concentra), got ' + di.uOsm.toFixed(0));
  assert(di.regime === 'diabetes_insipido', 'DI: regime diabetes_insipido, got ' + di.regime);

  // classNa cobre as faixas
  assert(classNa(115) === 'hipo_grave' && classNa(128) === 'hipo' && classNa(140) === 'normal'
      && classNa(150) === 'hiper' && classNa(165) === 'hiper_grave', 'classNa cobre as faixas');
})();

// ─── 2. IDENTIDADES ───────────────────────────────────────────────────────────
(function() {
  var r = disnatremia({ na: 125, peso: 60, sexF: true, adh: 0.7, vUrina: 80, infusato: 'nacl3', taxa: 50 });
  // EDELMAN: Na ∝ osmoles/ÁGT  →  naK = na·ÁGT  e  naPrev = naK/ÁGT = na
  assert(Math.abs(r.naK - r.na * r.agt) < 1e-7, 'ID: naK = Na·ÁGT (Edelman)');
  assert(Math.abs(r.naPrev - r.na) < 1e-7, 'ID: naPrev = naK/ÁGT = Na (fechamento de Edelman)');
  // naEdelman algébrico: Na ∝ 1/ÁGT (mesmos osmoles, mais água → Na menor)
  assert(Math.abs(naEdelman(5600, 40) - 140) < 1e-9, 'ID: naEdelman = naK/ÁGT');
  assert(naEdelman(5600, 50) < naEdelman(5600, 40), 'ID: mesmos osmoles, +água → Na menor (proxy da água)');
  // ÁGT = peso·fração
  assert(Math.abs(r.agt - agtDe(r.peso, r.sexF)) < 1e-9, 'ID: ÁGT = peso·fração(sexo)');
  assert(Math.abs(agtDe(70, false) - 42) < 1e-9 && Math.abs(agtDe(70, true) - 35) < 1e-9, 'ID: ÁGT M=0.6 / F=0.5');
  // CLEARANCE DE ÁGUA LIVRE: C_H2O = V̇ − C_osm  e  C_osm = U_osm·V̇/P_osm
  var ca = clearanceAguaLivre(r.uOsm, r.vUrina, r.pOsm);
  assert(Math.abs(r.cOsm - ca.cOsm) < 1e-7, 'ID: cOsm reportado = clearanceAguaLivre');
  assert(Math.abs(r.cH2O - (r.vUrina - r.cOsm)) < 1e-7, 'ID: C_H2O = V̇ − C_osm');
  assert(Math.abs(r.cOsm - (r.uOsm * r.vUrina / r.pOsm)) < 1e-6, 'ID: C_osm = U_osm·V̇/P_osm');
  // ADROGUÉ–MADIAS: ΔNa por litro = (Na_inf − Na)/(ÁGT+1)
  assert(Math.abs(r.dNaPorL - deltaNaPorLitro(r.naInf, r.na, r.agt)) < 1e-7, 'ID: dNaPorL = (Na_inf−Na)/(ÁGT+1)');
  assert(Math.abs(r.dNaPorL - (r.naInf - r.na) / (r.agt + 1)) < 1e-6, 'ID: Adrogué–Madias explícita');
  // ΔNa24 = dNaPorL · volDia ; volDia = taxa·24/1000
  assert(Math.abs(r.volDia - r.taxa * 24 / 1000) < 1e-9, 'ID: volDia = taxa·24/1000 (L/dia)');
  assert(Math.abs(r.dNa24 - r.dNaPorL * r.volDia) < 1e-7, 'ID: ΔNa24 = dNaPorL·volDia');
  // corr24 = |ΔNa24|
  assert(Math.abs(r.corr24 - Math.abs(r.dNa24)) < 1e-9, 'ID: corr24 = |ΔNa24|');
})();

// ─── 3. LEIS (monotonicidade) ─────────────────────────────────────────────────
(function() {
  // ADH↑ → urina mais concentrada → retém água → C_H2O cai (mais negativo)
  var a0 = disnatremia({ adh: 0.1 }), a1 = disnatremia({ adh: 0.5 }), a2 = disnatremia({ adh: 0.95 });
  assert(a0.uOsm < a1.uOsm && a1.uOsm < a2.uOsm, 'LEI: ADH↑ → U_osm↑ (urina concentrada)');
  assert(a0.cH2O > a1.cH2O && a1.cH2O > a2.cH2O, 'LEI: ADH↑ → C_H2O↓ (retém água, concentra)');
  // água livre negativa = concentra
  assert(a2.cH2O < 0 && a2.concentra === true, 'LEI: ADH alto → C_H2O < 0 (concentra)');
  assert(a0.cH2O > 0 && a0.concentra === false, 'LEI: ADH baixo → C_H2O > 0 (excreta água, dilui)');
  // mais ÁGT (mais peso) → o Na move-se menos por litro infundido (Adrogué–Madias)
  var p1 = disnatremia({ na: 120, peso: 50, infusato: 'nacl3', taxa: 40 });
  var p2 = disnatremia({ na: 120, peso: 100, infusato: 'nacl3', taxa: 40 });
  assert(Math.abs(p1.dNaPorL) > Math.abs(p2.dNaPorL), 'LEI: mais ÁGT → menor ΔNa por litro');
  // taxa↑ → maior correção em 24 h (mesma direção)
  var t1 = disnatremia({ na: 120, infusato: 'nacl3', taxa: 20 });
  var t2 = disnatremia({ na: 120, infusato: 'nacl3', taxa: 60 });
  assert(t2.corr24 > t1.corr24, 'LEI: taxa↑ → correção/24h↑');
  // infusato hipertônico sobe o Na; água livre (SG5%) baixa o Na
  var hiper = disnatremia({ na: 130, infusato: 'nacl3', taxa: 50 });
  var agua  = disnatremia({ na: 130, infusato: 'sg5', taxa: 50 });
  assert(hiper.dNa24 > 0, 'LEI: NaCl 3% sobe o Na (ΔNa24 > 0)');
  assert(agua.dNa24 < 0, 'LEI: SG5% (água livre) baixa o Na (ΔNa24 < 0)');
  // correção rápida numa hiponatremia CRÔNICA → risco de mielinólise↑
  var lento  = disnatremia({ na: 118, cronico: 1, infusato: 'nacl3', taxa: 8 });
  var rapido = disnatremia({ na: 118, cronico: 1, infusato: 'nacl3', taxa: 80 });
  assert(rapido.riscoMielinolise > lento.riscoMielinolise, 'LEI: correção rápida na crônica → risco mielinólise↑');
  // Na é proxy da água: SF (Na 154) > Na sérico baixo → sobe o Na (puxa água p/ fora relativo)
  assert(disnatremia({ na: 120, infusato: 'sf', taxa: 50 }).dNa24 > 0, 'LEI: SF sobe um Na muito baixo');
})();

// ─── 4. PÉROLAS ───────────────────────────────────────────────────────────────
(function() {
  // Pérola 1 (a velocidade mata — crônica): hiponatremia crônica + correção rápida → mielinólise
  var cronicaRapida = disnatremia({ na: 116, cronico: 1, infusato: 'nacl3', taxa: 90 });
  assert(cronicaRapida.corr24 > C.SEGURO_24, 'PÉROLA velocidade: corr24 > teto seguro (8 mEq/24h)');
  assert(cronicaRapida.riscoMielinolise > 0.5, 'PÉROLA velocidade: risco de mielinólise alto');
  assert(cronicaRapida.regime === 'mielinolise', 'PÉROLA velocidade: regime mielinolise');
  // a MESMA correção rápida numa hiponatremia AGUDA NÃO gera mielinólise (cérebro não adaptou)
  var agudaRapida = disnatremia({ na: 116, cronico: 0, infusato: 'nacl3', taxa: 90 });
  assert(agudaRapida.riscoMielinolise === 0, 'PÉROLA: a mesma velocidade na AGUDA não dá mielinólise (cérebro não adaptado)');

  // Pérola 2 (hipernatremia rápida → edema): hipernatremia crônica corrigida rápido p/ baixo
  var hiperRapida = disnatremia({ na: 165, cronico: 1, infusato: 'sg5', taxa: 120 });
  assert(hiperRapida.dNa24 < 0 && hiperRapida.corr24 > C.SEGURO_24, 'PÉROLA edema: hiper descendo rápido demais');
  assert(hiperRapida.riscoEdema > 0.5, 'PÉROLA edema: risco de edema cerebral alto');
  assert(hiperRapida.regime === 'edema_correcao', 'PÉROLA edema: regime edema_correcao');

  // Pérola 3 (o número Na é proxy da ÁGUA): mesmo Na, mecanismos opostos de ÁGUA
  var siadh = disnatremia({ na: 124, adh: 0.9 });   // retém água (ADH alto)
  var poto  = disnatremia({ na: 124, adh: 0.05 });  // dilui (ADH baixo, água em excesso)
  assert(siadh.uOsm > poto.uOsm, 'PÉROLA proxy: mesmo Na 124, U_osm oposta (SIADH concentra, potomania dilui)');
  assert(siadh.cH2O < poto.cH2O, 'PÉROLA proxy: o problema é a ÁGUA (C_H2O), não o sal');

  // Pérola 4 (Edelman): adicionar ÁGUA livre (numerador fixo) DILUI o Na
  var seco = naEdelman(5600, 40), inchado = naEdelman(5600, 47);
  assert(seco > inchado, 'PÉROLA Edelman: +7 L de água livre baixa o Na (proxy da água)');
  assert(seco > 139 && inchado < 120, 'PÉROLA Edelman: 5600 mEq em 40 L = 140; em 47 L < 120');

  // Pérola 5 (corredor seguro): uma taxa prudente fica DENTRO do corredor
  var prudente = disnatremia({ na: 118, cronico: 1, infusato: 'nacl3', taxa: 8 });
  assert(prudente.corr24 <= C.SEGURO_24 + 1e-9, 'PÉROLA corredor: taxa prudente fica ≤ 8 mEq/24h');
  assert(prudente.dentroCorredor === true, 'PÉROLA corredor: dentroCorredor verdadeiro');
  assert(prudente.riscoMielinolise <= 0.5, 'PÉROLA corredor: sem risco quando dentro do corredor');
})();

// ─── 5. DETERMINISMO ─────────────────────────────────────────────────────────
(function() {
  var inp = { na: 122, peso: 64, sexF: true, cronico: 1, adh: 0.8, vUrina: 40, infusato: 'nacl3', taxa: 30 };
  var r1 = disnatremia(inp), r2 = disnatremia(inp), r3 = disnatremia(inp);
  assert(r1.dNa24 === r2.dNa24 && r2.dNa24 === r3.dNa24, 'Determinismo: dNa24 idêntico em 3 chamadas');
  assert(r1.cH2O === r2.cH2O && r2.regime === r3.regime, 'Determinismo: cH2O/regime idênticos');
  var frozen = Object.freeze({ na: 130, adh: 0.5, taxa: 20 });
  try { disnatremia(frozen); assert(true, 'freeze: não lançou'); }
  catch (e) { fail++; console.error('FALHA: freeze lançou: ' + e.message); }
  assert(frozen.na === 130, 'freeze: objeto de entrada não mutado');
  // layouts não devem mutar o estado
  var st = Object.freeze({ na: 120, adh: 0.6, infusato: 'nacl3', taxa: 40 });
  try { correcaoLayout(st, 900, 320); aguaLivreLayout(st, 600, 240); assert(true, 'layouts: freeze ok'); }
  catch (e) { fail++; console.error('FALHA: layout freeze lançou: ' + e.message); }
})();

// ─── 6. ROBUSTEZ ─────────────────────────────────────────────────────────────
(function() {
  var cases = [
    {},
    null,
    undefined,
    { na: NaN, peso: null, adh: undefined, vUrina: 'string', taxa: 'x', uOsm: 'q' },
    { na: Infinity, peso: -Infinity, adh: 999, cronico: -5, taxa: -1, infusato: 'lixo' },
    { na: 0, peso: 0, adh: 0, cronico: 0, vUrina: 0, taxa: 0, uOsm: 0, pOsm: 0 },
    { na: 1e9, peso: -1e9, adh: 1e9, cronico: 1e9, vUrina: 1e9, taxa: 1e9 },
    { sexF: 'F', infusato: 'nacl3', uOsm: 'lixo' }
  ];
  var fields = ['na', 'agt', 'naK', 'naPrev', 'cOsm', 'cH2O', 'dNaPorL', 'volDia', 'dNa24',
                'corr24', 'excesso', 'riscoMielinolise', 'riscoEdema', 'uOsm', 'pOsm'];
  cases.forEach(function(inp, i) {
    var r;
    try { r = disnatremia(inp); }
    catch (e) { fail++; console.error('FALHA robustez caso ' + i + ': lançou ' + e.message); return; }
    fields.forEach(function(f) {
      assert(isFinite(r[f]), 'Robustez caso ' + i + ': ' + f + ' é finito, got ' + r[f]);
    });
    assert(r.na >= 100 && r.na <= 190, 'Robustez caso ' + i + ': na no clamp [100,190]');
    assert(r.riscoMielinolise >= 0 && r.riscoMielinolise <= 1, 'Robustez caso ' + i + ': risco mielinólise [0,1]');
    assert(r.riscoEdema >= 0 && r.riscoEdema <= 1, 'Robustez caso ' + i + ': risco edema [0,1]');
    assert(typeof r.regime === 'string', 'Robustez caso ' + i + ': regime é string');
    assert(typeof r.classe === 'string', 'Robustez caso ' + i + ': classe é string');
    assert(typeof r.concentra === 'boolean', 'Robustez caso ' + i + ': concentra é boolean');
    // layouts robustos
    var L = correcaoLayout(inp, 900, 320), A = aguaLivreLayout(inp, 600, 240);
    assert(L.pts.length > 0 && isFinite(L.pts[0].x) && isFinite(L.pts[0].y), 'Robustez caso ' + i + ': correcaoLayout finito');
    assert(A.pts.length > 0 && isFinite(A.pts[0].y), 'Robustez caso ' + i + ': aguaLivreLayout finito');
  });
})();

// ─── 7. FUZZING (PRNG semeado, ≥5000 entradas, 30% malignas) ─────────────────
(function() {
  var N = 5000;
  var MALO = 0.30;
  var fields = ['na', 'agt', 'naK', 'naPrev', 'cOsm', 'cH2O', 'dNaPorL', 'volDia', 'dNa24',
                'corr24', 'excesso', 'riscoMielinolise', 'riscoEdema', 'riscoEdemaAgudo', 'uOsm', 'pOsm'];
  var infKeys = ['nacl3', 'sf', 'ringer', 'meiosf', 'sg5', 'agua', 'lixo'];

  for (var i = 0; i < N; i++) {
    var inp;
    if (rand() < MALO) {
      var mal = [NaN, Infinity, -Infinity, null, undefined, '', '0', 1e15, -1e15, 0];
      inp = {
        na:      mal[Math.floor(rand() * mal.length)],
        peso:    mal[Math.floor(rand() * mal.length)],
        sexF:    mal[Math.floor(rand() * mal.length)],
        cronico: mal[Math.floor(rand() * mal.length)],
        adh:     mal[Math.floor(rand() * mal.length)],
        uOsm:    mal[Math.floor(rand() * mal.length)],
        vUrina:  mal[Math.floor(rand() * mal.length)],
        taxa:    mal[Math.floor(rand() * mal.length)],
        infusato: infKeys[Math.floor(rand() * infKeys.length)]
      };
    } else {
      inp = {
        na:      105 + rand() * 80,
        peso:    35  + rand() * 90,
        sexF:    rand() < 0.5,
        cronico: rand(),
        adh:     rand(),
        vUrina:  rand() * 600,
        taxa:    rand() * 300,
        infusato: infKeys[Math.floor(rand() * infKeys.length)]
      };
      if (rand() < 0.5) inp.uOsm = rand() * 1300;
    }
    var r;
    try { r = disnatremia(inp); }
    catch (e) { fail++; console.error('FALHA fuzz ' + i + ': lançou ' + e.message); continue; }

    fields.forEach(function(f) {
      if (r[f] === undefined) return;
      if (!isFinite(r[f])) { fail++; console.error('FALHA fuzz ' + i + ': ' + f + ' = ' + r[f]); }
      else ok++;
    });

    // invariantes estruturais sempre
    if (r.na < 100 || r.na > 190) { fail++; console.error('FALHA fuzz ' + i + ': na fora do clamp'); } else ok++;
    if (r.riscoMielinolise < 0 || r.riscoMielinolise > 1) { fail++; console.error('FALHA fuzz ' + i + ': risco mielinólise fora [0,1]'); } else ok++;
    if (r.riscoEdema < 0 || r.riscoEdema > 1) { fail++; console.error('FALHA fuzz ' + i + ': risco edema fora [0,1]'); } else ok++;
    // EDELMAN: naPrev ≈ na (fechamento) sempre
    if (Math.abs(r.naPrev - r.na) > 1e-6) { fail++; console.error('FALHA fuzz ' + i + ': naPrev ≠ na (Edelman)'); } else ok++;
    // C_H2O = V̇ − C_osm sempre
    if (Math.abs(r.cH2O - (r.vUrina - r.cOsm)) > 1e-6) { fail++; console.error('FALHA fuzz ' + i + ': C_H2O ≠ V̇−C_osm'); } else ok++;
    // corr24 = |dNa24| sempre
    if (Math.abs(r.corr24 - Math.abs(r.dNa24)) > 1e-9) { fail++; console.error('FALHA fuzz ' + i + ': corr24 ≠ |dNa24|'); } else ok++;
    if (typeof r.regime !== 'string' || typeof r.classe !== 'string') { fail++; console.error('FALHA fuzz ' + i + ': classificação não-string'); } else ok++;

    // layouts: sem NaN nos pontos
    var L = correcaoLayout(inp, 900, 320);
    if (!isFinite(L.pts[0].x) || !isFinite(L.pts[L.pts.length - 1].y)) { fail++; console.error('FALHA fuzz ' + i + ': layout NaN'); } else ok++;
    var A = aguaLivreLayout(inp, 600, 240);
    if (!isFinite(A.pts[0].y) || !isFinite(A.zeroY)) { fail++; console.error('FALHA fuzz ' + i + ': aguaLivreLayout NaN'); } else ok++;
  }
})();

// ─── Saída ───────────────────────────────────────────────────────────────────
console.log(ok + ' OK · ' + fail + ' falhas');
process.exit(fail > 0 ? 1 : 0);
