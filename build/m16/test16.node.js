/* =========================================================================
 * FILTRA · M16 — bateria de robustez do engine (0 falhas ou não entra)
 * 1 BASE · 2 IDENTIDADES · 3 LEIS · 4 PÉROLAS · 5 DETERMINISMO · 6 ROBUSTEZ · 7 FUZZING ≥5000 · 8 SAÍDA
 * ========================================================================= */
var M = require('./model16.js');
var lra = M.lra, feNa = M.feNa, feUreia = M.feUreia, tfgStarling = M.tfgStarling,
    kdigoCreat = M.kdigoCreat, kdigoDebito = M.kdigoDebito, indexSpaceLayout = M.indexSpaceLayout;

var oks = 0, fails = 0;
function ok(c, m) { if (c) oks++; else { fails++; console.log('  FALHA: ' + m); } }
function near(a, b, t) { return Math.abs(a - b) <= (t || 1e-7); }
function fin(x) { return typeof x === 'number' && isFinite(x); }

// cenários-âncora reusados
var PRE = { pGC: 38, crBasal: 1, crAtual: 2.5, debitoUrinario: 0.4, uNa: 10, uCr: 150, pCr: 2.5, uOsm: 650, uUr: 1200, pUr: 120, sedimento: 'limpo' };
var NTA = { pGC: 55, integridadeTub: 0.3, crBasal: 1, crAtual: 3.2, debitoUrinario: 0.4, uNa: 60, uCr: 40, pCr: 3.2, uOsm: 300, uUr: 300, pUr: 60, sedimento: 'granuloso' };
var POS = { pBC: 35, crBasal: 1, crAtual: 3.0, debitoUrinario: 0.3, uNa: 40, uCr: 50, pCr: 3.0, uOsm: 350, sedimento: 'limpo' };
var NIA = { integridadeTub: 0.8, crBasal: 1, crAtual: 2.2, debitoUrinario: 0.6, uNa: 45, uCr: 60, pCr: 2.2, uOsm: 350, sedimento: 'eosinofilo' };
var HEP = { vasodilatacaoEsplancnica: 0.8, integridadeTub: 0.9, crBasal: 1, crAtual: 2.8, debitoUrinario: 0.3, uNa: 5, uCr: 200, pCr: 2.8, uOsm: 550, uUr: 900, pUr: 90, sedimento: 'limpo' };
var CR = { pressaoVenosa: 18, integridadeTub: 0.9, pGC: 50, crBasal: 1.2, crAtual: 2.4, debitoUrinario: 0.4, uNa: 8, uCr: 120, pCr: 2.4, uOsm: 600, uUr: 900, pUr: 90, dc: 3, sedimento: 'limpo' };

/* ---------- 1. LINHA DE BASE ---------- */
(function () {
  var base = lra({});
  ok(base.estagioKDIGO === 0 && !base.temLRA, 'base: estado normal não é LRA (KDIGO 0)');
  ok(base.tfg > 80 && base.tfg < 200, 'base: TFG normal na faixa fisiológica');

  var p = lra(PRE);
  ok(p.mecanismo === 'pré-renal', 'base: cenário pré-renal classifica pré-renal');
  ok(p.FENa < 1, 'base: pré-renal → FE_Na < 1%');
  ok(p.bunCr > 20, 'base: pré-renal → BUN/Cr > 20');
  ok(p.respondeVolume === true, 'base: pré-renal responde a volume');

  var n = lra(NTA);
  ok(n.mecanismo.indexOf('NTA') === 0, 'base: cenário NTA classifica NTA');
  ok(n.FENa > 2, 'base: NTA → FE_Na > 2%');
  ok(Math.abs(n.uOsm - 300) < 60, 'base: NTA → U_osm ~300 (isostenúria)');
  ok(n.respondeVolume === false, 'base: NTA NÃO responde a volume');

  var po = lra(POS);
  ok(po.mecanismo === 'pós-renal' && po.obstrucao, 'base: P_BC alta → pós-renal (obstrução)');
})();

/* ---------- 2. IDENTIDADES ---------- */
(function () {
  for (var i = 0; i < 40; i++) {
    var uNa = 5 + i * 4, pCr = 1 + (i % 5), pNa = 135 + (i % 6), uCr = 30 + i * 8;
    var direta = feNa(uNa, pCr, pNa, uCr);
    var manual = (uNa * pCr) / (pNa * uCr) * 100;
    ok(near(direta, manual, 1e-7), 'id: FE_Na = (U_Na·P_Cr)/(P_Na·U_Cr)·100');
  }
  // FE_ureia idêntica à definição
  for (var j = 0; j < 20; j++) {
    var uUr = 100 + j * 60, pcr = 1 + (j % 4), pUr = 20 + j * 5, ucr = 40 + j * 10;
    ok(near(feUreia(uUr, pcr, pUr, ucr), (uUr * pcr) / (pUr * ucr) * 100, 1e-7), 'id: FE_ureia = (U_ur·P_Cr)/(P_ur·U_Cr)·100');
  }
  // TFG = Kf·(P_GC − P_BC − π) quando positivo
  ok(near(tfgStarling(55, 15, 12, 28), 12 * (55 - 15 - 28), 1e-7), 'id: TFG = Kf·(P_GC−P_BC−π)');
  ok(tfgStarling(30, 15, 12, 28) === 0, 'id: pressão líquida ≤0 → TFG 0');
  // KDIGO: pior das duas = max(creat, débito)
  var r = lra({ crBasal: 1, crAtual: 1.6, debitoUrinario: 0.2 });
  ok(r.estagioKDIGO === Math.max(r.kCreat, r.kDeb), 'id: KDIGO = max(creatinina, débito)');
  ok(r.kDeb === 3 && r.estagioKDIGO === 3, 'id: débito <0,3 domina (estágio 3)');
  // FE_Na nos clamps sempre ≥0
  ok(feNa(-5, 0, 0, 0) >= 0, 'id: FE_Na clampado ≥0');
})();

/* ---------- 3. LEIS ---------- */
(function () {
  // P_GC↓ derruba a TFG (pré-renal)
  ok(lra({ pGC: 35 }).tfg < lra({ pGC: 60 }).tfg, 'lei: P_GC↓ → TFG↓');
  // túbulo lesado → FE_Na sobe (NTA perde reabsorção) — via índice de entrada
  var sao = lra({ uNa: 10, uCr: 150, pCr: 1.5 });
  var doente = lra({ uNa: 70, uCr: 40, pCr: 1.5 });
  ok(doente.FENa > sao.FENa, 'lei: mais Na e menos Cr urinário → FE_Na↑ (túbulo lesado)');
  // P_BC↑ → pós-renal e TFG cai
  ok(lra({ pBC: 35 }).mecanismo === 'pós-renal', 'lei: P_BC↑ → pós-renal');
  ok(lra({ pBC: 40 }).tfg < lra({ pBC: 10 }).tfg, 'lei: P_BC↑ → TFG↓ (contrapressão)');
  // Cr↑ → KDIGO sobe (monotônico)
  ok(kdigoCreat(1, 1.4) <= kdigoCreat(1, 1.6), 'lei: ↑Cr → KDIGO não-decrescente (1)');
  ok(kdigoCreat(1, 1.6) <= kdigoCreat(1, 2.2), 'lei: ↑Cr → KDIGO não-decrescente (2)');
  ok(kdigoCreat(1, 2.2) <= kdigoCreat(1, 3.5), 'lei: ↑Cr → KDIGO não-decrescente (3)');
  // débito↓ → KDIGO sobe
  ok(kdigoDebito(0.6) <= kdigoDebito(0.4), 'lei: débito↓ → KDIGO não-decrescente');
  ok(kdigoDebito(0.4) <= kdigoDebito(0.2), 'lei: oligúria→anúria → KDIGO sobe');
  // Kf↓ (lesão glomerular) → TFG↓
  ok(lra({ kf: 4 }).tfg < lra({ kf: 18 }).tfg, 'lei: Kf↓ → TFG↓');
})();

/* ---------- 4. PÉROLAS ---------- */
(function () {
  // (1) UM número, TRÊS fisiologias: a MESMA creatinina ~3,0 por 3 mecânicas
  var cPre = lra(PRE), cNta = lra(NTA), cPos = lra(POS);
  ok(cPre.crAtual >= 2.4 && cNta.crAtual >= 2.4 && cPos.crAtual >= 2.4, 'pérola: mesma faixa de creatinina alta nas 3 vias');
  var mecs = [cPre.mecanismo, cNta.mecanismo, cPos.mecanismo];
  ok(mecs[0] !== mecs[1] && mecs[1] !== mecs[2] && mecs[0] !== mecs[2], 'pérola: 3 mecanismos distintos para o mesmo número (a sombra)');
  ok(cPre.respondeVolume && !cNta.respondeVolume && !cPos.respondeVolume, 'pérola: condutas antagônicas (volume cura o pré-renal, não a NTA/pós)');

  // (2) FE_Na separa pré-renal de NTA
  ok(cPre.FENa < 1 && cNta.FENa > 2, 'pérola: FE_Na separa pré-renal (<1%) de NTA (>2%)');

  // (3) FE_ureia salva sob diurético: pré-renal mantém FE_ureia baixa mesmo com FE_Na alterada
  ok(cPre.FEureia < 35, 'pérola: pré-renal → FE_ureia < 35% (útil sob diurético)');

  // (4) cardiorrenal: FE_Na baixa, mas NÃO responde a volume (congestão, não depleção)
  var cr = lra(CR);
  ok(cr.mecanismo === 'cardiorrenal', 'pérola: congestão venosa → cardiorrenal');
  ok(cr.fenaBaixa && cr.fenaBaixaMasNaoVolume && !cr.respondeVolume, 'pérola: FE_Na baixa NÃO autoriza volume (cardiorrenal: volume PIORA)');

  // (5) hepatorrenal: vasoconstrição funcional, FE_Na quase zero, rim sem dano, não é volume isolado
  var hep = lra(HEP);
  ok(hep.mecanismo === 'hepatorrenal' && hep.FENa < 0.2, 'pérola: hepatorrenal → FE_Na <0,1% com rim normal');
  ok(!hep.respondeVolume, 'pérola: hepatorrenal não cura com SF isolado (vasoconstritor + albumina)');

  // (6) NIA: eosinofilúria → suspender o fármaco
  var nia = lra(NIA);
  ok(nia.mecanismo === 'NIA', 'pérola: eosinofilúria → nefrite intersticial (NIA)');
})();

/* ---------- 5. DETERMINISMO ---------- */
(function () {
  ok(JSON.stringify(lra(NTA)) === JSON.stringify(lra(NTA)), 'determinismo: mesma entrada → saída idêntica');
  var frozen = Object.freeze({ pGC: 40, crBasal: 1, crAtual: 2.0 });
  var a, threw = false; try { a = lra(frozen); } catch (e) { threw = true; }
  ok(!threw && fin(a.tfg), 'determinismo: Object.freeze não lança nem é mutado');
  ok(frozen.pGC === 40, 'determinismo: entrada não mutada');
  // layout determinístico
  ok(JSON.stringify(indexSpaceLayout(PRE, 900, 360)) === JSON.stringify(indexSpaceLayout(PRE, 900, 360)), 'determinismo: layout idêntico');
})();

/* ---------- 6. ROBUSTEZ ---------- */
(function () {
  var maus = [undefined, null, {}, { pGC: NaN }, { pGC: 'x' }, { pBC: -10 }, { kf: 1e9 },
    { crAtual: NaN }, { crBasal: 0 }, { debitoUrinario: Infinity }, { uNa: 'z' }, { uCr: 0 },
    { pCr: NaN }, { uOsm: -5 }, { sedimento: 'bizarro' }, { vasodilatacaoEsplancnica: 9 },
    { pressaoVenosa: -3 }, { integridadeTub: 5 }];
  maus.forEach(function (m, i) {
    var r = lra(m);
    ok(fin(r.tfg) && fin(r.FENa) && fin(r.FEureia) && fin(r.bunCr), 'robustez[' + i + ']: saídas numéricas finitas');
    ok(r.estagioKDIGO >= 0 && r.estagioKDIGO <= 3, 'robustez[' + i + ']: KDIGO em 0..3');
    ok(r.FENa >= 0 && r.tfg >= 0, 'robustez[' + i + ']: FE_Na e TFG ≥0');
    ok(typeof r.mecanismo === 'string' && r.mecanismo.length > 0, 'robustez[' + i + ']: mecanismo atribuído');
    ok(typeof r.respondeVolume === 'boolean', 'robustez[' + i + ']: respondeVolume booleano');
  });
})();

/* ---------- 7. FUZZING semeado ≥5000 ---------- */
(function () {
  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  var rnd = mulberry32(0x16AC0DE), N = 6000, bad = 0;
  var seds = ['limpo', 'granuloso', 'hematico', 'eosinofilo', 'bizarro', null];
  function val() { var r = rnd(); if (r < 0.3) { var pool = [NaN, Infinity, -Infinity, 1e12, -1e12, 'x', null, undefined]; return pool[(rnd() * pool.length) | 0]; } return (r - 0.15) * 400; }
  for (var i = 0; i < N; i++) {
    var inp = {
      pArt: val(), pGC: val(), pBC: val(), kf: val(), integridadeTub: val(), piGC: val(),
      crBasal: val(), crAtual: val(), debitoUrinario: val(),
      uNa: val(), pNa: val(), uCr: val(), pCr: val(), uUr: val(), pUr: val(), uOsm: val(),
      sedimento: seds[(rnd() * seds.length) | 0],
      dc: val(), pressaoVenosa: val(), vasodilatacaoEsplancnica: val()
    };
    var r = lra(inp);
    var L = indexSpaceLayout(inp, 900, 360);
    var good = fin(r.tfg) && fin(r.FENa) && fin(r.FEureia) && fin(r.bunCr) && fin(r.kfEff) &&
      r.FENa >= 0 && r.tfg >= 0 && r.tfg <= 250 &&
      r.estagioKDIGO >= 0 && r.estagioKDIGO <= 3 &&
      typeof r.mecanismo === 'string' && r.mecanismo.length > 0 &&
      typeof r.respondeVolume === 'boolean' &&
      Array.isArray(L.pts) && L.pts.length === 49 && fin(L.current.x) && fin(L.current.y);
    if (!good) bad++;
  }
  ok(bad === 0, 'fuzzing: ' + N + ' entradas (30% malignas) → 0 violações (' + bad + ')');
})();

/* ---------- 8. SAÍDA ---------- */
console.log(oks + ' OK · ' + fails + ' falhas');
process.exit(fails > 0 ? 1 : 0);
