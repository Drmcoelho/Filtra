/* =========================================================================
 * FILTRA · M32 — bateria de robustez REFORÇADA (0 falhas ou não entra)
 * 1 BASE · 2 IDENTIDADES · 3 LEIS · 4 PÉROLAS · 5 DETERMINISMO(5×) ·
 * 6 ROBUSTEZ · 7 LIMITES · 8 MONOTONIA EXAUSTIVA · 9 FUZZING ≥20000 (40% malignas) · 10 SAÍDA
 *
 * Exigência desta onda: fuzz ≥20000 com 40% entradas malignas; por iteração assertar
 * (a) nenhuma saída NaN/±Inf; (b) cada campo dentro de [min,max] DOCUMENTADO;
 * (c) identidades/conservação (tol 1e-7); (d) entrada não mutada (deep-compare) +
 * Object.freeze não lança. Determinismo byte-idêntico em 5 execuções. Monotonia em
 * TODA a faixa de cada alavanca (≥50 passos). ~300000+ asserções no total.
 * ========================================================================= */
var M = require('./model32.js');
var dialdrug = M.dialdrug, pmFator = M.pmFator, vdLayout = M.vdLayout, FARMACOS = M.FARMACOS;

var oks = 0, fails = 0;
function ok(c, m) { if (c) oks++; else { fails++; if (fails <= 40) console.log('  FALHA: ' + m); } }
function near(a, b, t) { return Math.abs(a - b) <= (t || 1e-7); }
function fin(x) { return typeof x === 'number' && isFinite(x); }

// ── LIMITES DOCUMENTADOS de cada campo numérico de saída ─────────────────
var BOUNDS = {
  pm: [1, 60000], ligacao: [0, 0.999], vd: [0.05, 30], kdial: [1, 400], t: [1, 1440], peso: [20, 250],
  fLivre: [0.001, 1], fpm: [0, 1], kEfetivo: [0, 400], vL: [1, 7500], expo: [0, 1e9],
  fracaoRemovida: [0, 1], doseMgKg: [0, 5000], doseTotalMg: [0, 1.25e6], doseSuplementarMg: [0, 1e7],
  meiaVidaDial: [1, 1e7]
};
function checkBounds(r) {
  for (var k in BOUNDS) {
    if (!fin(r[k])) return 'campo ' + k + ' não-finito (' + r[k] + ')';
    if (r[k] < BOUNDS[k][0] - 1e-6 || r[k] > BOUNDS[k][1] + 1e-6) return 'campo ' + k + '=' + r[k] + ' fora de [' + BOUNDS[k][0] + ',' + BOUNDS[k][1] + ']';
  }
  return null;
}

/* 1. BASE — faixas fisiológicas conhecidas */
(function () {
  var v = dialdrug({ droga: 'vancomicina', highFlux: true });
  ok(near(v.fLivre, 0.5), 'base: vancomicina f_livre = 1−0,5 = 0,5');
  ok(v.fracaoRemovida > 0.2 && v.fracaoRemovida < 0.6, 'base: vancomicina parcialmente removida em high-flux');
  var dig = dialdrug({ droga: 'digoxina', highFlux: true });
  ok(dig.fracaoRemovida < 0.15 && dig.classe === 'blindada_vd', 'base: digoxina (Vd 6) BLINDADA <15%');
  var li = dialdrug({ droga: 'litio' });
  ok(li.fLivre === 1 && li.fracaoRemovida > 0.4, 'base: lítio (ligação 0, Vd baixo) bem removido');
  var g = dialdrug({ droga: 'gentamicina' });
  ok(g.fracaoRemovida > 0.5 && g.doseSuplementarMg > 0, 'base: gentamicina bem removida → re-dose >0');
  ok(checkBounds(dialdrug({})) === null, 'base: default dentro dos limites');
})();

/* 2. IDENTIDADES — relações estruturais (tol 1e-7) */
(function () {
  for (var i = 0; i < 60; i++) {
    var lig = i / 70, r = dialdrug({ droga: 'custom', ligacao: lig, vd: 1, pm: 300, kdial: 200, t: 240, peso: 70 });
    ok(near(r.fLivre, 1 - Math.min(lig, 0.999), 1e-9) || near(r.fLivre, Math.max(1 - lig, 0.001), 1e-7), 'id: f_livre = 1 − ligação');
    ok(near(r.fracaoRemovida, 1 - Math.exp(-r.expo), 1e-9), 'id: fração = 1 − exp(−expo)');
    ok(near(r.doseSuplementarMg, r.doseTotalMg * r.fracaoRemovida, 1e-6), 'id: suplementar = doseTotal · fração');
    ok(near(r.doseTotalMg, r.doseMgKg * r.peso, 1e-6), 'id: doseTotal = mg/kg · peso');
    ok(near(r.kEfetivo, r.kdial * r.fLivre * r.fpm, 1e-6), 'id: K_efetivo = K_dial · f_livre · fpm');
    ok(near(r.vL, r.vd * r.peso, 1e-6) || r.vL === 7500 || r.vL === 1, 'id: vL = Vd · peso');
    ok(r.fracaoRemovida >= 0 && r.fracaoRemovida <= 1, 'id: fração em [0,1]');
  }
  ok(near(pmFator(1, false), 1, 0.01), 'id: pmFator(PM~0)≈1');
  ok(pmFator(60000, false) < 0.001, 'id: pmFator(PM enorme)≈0 low-flux');
})();

/* 3. LEIS — direção de cada termo */
(function () {
  var baseHF = { droga: 'custom', pm: 500, ligacao: 0.3, vd: 1, kdial: 200, t: 240, peso: 70, highFlux: true };
  function withv(k, val) { var o = {}; for (var x in baseHF) o[x] = baseHF[x]; o[k] = val; return dialdrug(o); }
  ok(withv('vd', 6).fracaoRemovida < withv('vd', 0.5).fracaoRemovida, 'lei: Vd↑ → fração removida↓ (pérola)');
  ok(withv('ligacao', 0.9).fracaoRemovida < withv('ligacao', 0.1).fracaoRemovida, 'lei: ligação↑ → fração↓ (só a livre sai)');
  ok(withv('pm', 30000).fracaoRemovida < withv('pm', 200).fracaoRemovida, 'lei: PM↑ → fração↓');
  ok(withv('kdial', 350).fracaoRemovida > withv('kdial', 50).fracaoRemovida, 'lei: K_dial↑ → fração↑');
  ok(withv('t', 480).fracaoRemovida > withv('t', 60).fracaoRemovida, 'lei: tempo↑ → fração↑');
  // high-flux remove PM médio que o low-flux não remove
  var hf = dialdrug({ droga: 'custom', pm: 8000, ligacao: 0.2, vd: 1, highFlux: true });
  var lf = dialdrug({ droga: 'custom', pm: 8000, ligacao: 0.2, vd: 1, highFlux: false });
  ok(hf.fracaoRemovida > lf.fracaoRemovida, 'lei: high-flux remove PM médio melhor que low-flux');
})();

/* 4. PÉROLAS */
(function () {
  // Vd alto BLINDA mesmo com clearance alto
  var dig = dialdrug({ droga: 'custom', pm: 780, ligacao: 0.25, vd: 6, kdial: 400, t: 480, highFlux: true });
  var digBaixoVd = dialdrug({ droga: 'custom', pm: 780, ligacao: 0.25, vd: 0.5, kdial: 400, t: 480, highFlux: true });
  ok(dig.fracaoRemovida < 0.4 && dig.fracaoRemovida < digBaixoVd.fracaoRemovida * 0.5, 'pérola: Vd alto blinda — mesma droga com Vd baixo remove muito mais (Vd 6 vs 0,5)');
  // a ligação esconde a maior parte
  var ligada = dialdrug({ droga: 'custom', pm: 200, ligacao: 0.95, vd: 0.5, kdial: 300, t: 480 });
  ok(ligada.fracaoRemovida < 0.2 && ligada.classe === 'blindada_ligacao', 'pérola: ligação proteica esconde — só a livre sai');
  // contraste: PM pequeno + ligação baixa + Vd baixo = bem removida
  var li = dialdrug({ droga: 'litio' });
  ok(li.fracaoRemovida > dig.fracaoRemovida, 'pérola: lítio (livre, Vd baixo) >> digoxina (blindada)');
  // dose suplementar só aparece em droga removida com dose definida
  ok(dialdrug({ droga: 'gentamicina' }).doseSuplementarMg > dialdrug({ droga: 'digoxina' }).doseSuplementarMg, 'pérola: re-dose maior na bem-removida');
})();

/* 5. DETERMINISMO — 5× byte-idêntico */
(function () {
  var inp = { droga: 'custom', pm: 600, ligacao: 0.4, vd: 1.2, kdial: 220, t: 300, peso: 80, highFlux: true, dose: 15 };
  var s0 = JSON.stringify(dialdrug(inp));
  var allEq = true;
  for (var i = 0; i < 5; i++) if (JSON.stringify(dialdrug(inp)) !== s0) allEq = false;
  ok(allEq, 'determinismo: 5 execuções byte-idênticas');
  var sL0 = JSON.stringify(vdLayout(inp, 900, 360));
  var allEqL = true;
  for (var j = 0; j < 5; j++) if (JSON.stringify(vdLayout(inp, 900, 360)) !== sL0) allEqL = false;
  ok(allEqL, 'determinismo: vdLayout 5× byte-idêntico');
  var frozen = Object.freeze({ droga: 'vancomicina', highFlux: true });
  var threw = false, a; try { a = dialdrug(frozen); } catch (e) { threw = true; }
  ok(!threw && fin(a.fracaoRemovida), 'determinismo: Object.freeze não lança');
})();

/* 6. ROBUSTEZ — entradas degeneradas → tudo finito e dentro dos clamps */
(function () {
  var maus = [undefined, null, {}, { pm: NaN }, { ligacao: 'x' }, { vd: -10 }, { kdial: Infinity },
    { t: -5 }, { peso: 0 }, { droga: 'xyz' }, { droga: 123 }, { dose: Infinity }, { ligacao: 5 },
    { vd: 1e9 }, { pm: 1e12 }, { droga: null }, { droga: 'custom', pm: NaN, ligacao: NaN, vd: NaN }];
  maus.forEach(function (m, i) {
    var r = dialdrug(m); var e = checkBounds(r);
    ok(e === null, 'robustez[' + i + ']: ' + (e || 'ok'));
  });
})();

/* 7. LIMITES — varredura cartesiana dentro/fora dos limites declarados */
(function () {
  var viol = 0, total = 0;
  var pms = [1, 50, 200, 500, 1500, 8000, 30000, 60000, 1e9];
  var ligs = [-1, 0, 0.25, 0.5, 0.9, 0.999, 5];
  var vds = [-1, 0.05, 0.5, 1, 3, 6, 30, 1e6];
  var ks = [-5, 1, 100, 200, 400, 1e6];
  var ts = [-1, 1, 60, 240, 480, 1440, 1e6];
  var hf = [true, false];
  for (var a = 0; a < pms.length; a++) for (var b = 0; b < ligs.length; b++) for (var c = 0; c < vds.length; c++)
    for (var d = 0; d < ks.length; d++) for (var e = 0; e < ts.length; e++) for (var f = 0; f < hf.length; f++) {
      total++;
      var r = dialdrug({ droga: 'custom', pm: pms[a], ligacao: ligs[b], vd: vds[c], kdial: ks[d], t: ts[e], peso: 70, highFlux: hf[f] });
      if (checkBounds(r) !== null) viol++;
    }
  ok(viol === 0, 'limites: ' + total + ' combinações cartesianas, 0 violações (' + viol + ')');
})();

/* 8. MONOTONIA EXAUSTIVA — cada alavanca, toda a faixa, ≥50 passos, cada par adjacente */
(function () {
  var STEPS = 60, bad = 0;
  function sweep(field, lo, hi, dir, fixed) {
    var prev = null, local = 0;
    for (var i = 0; i <= STEPS; i++) {
      var val = lo + (hi - lo) * i / STEPS;
      var o = { droga: 'custom', pm: 500, ligacao: 0.3, vd: 1, kdial: 200, t: 240, peso: 70, highFlux: true };
      for (var k in fixed) o[k] = fixed[k];
      o[field] = val;
      var fr = dialdrug(o).fracaoRemovida;
      if (prev !== null) {
        if (dir > 0 && fr < prev - 1e-9) local++;
        if (dir < 0 && fr > prev + 1e-9) local++;
      }
      prev = fr;
    }
    return local;
  }
  bad += sweep('vd', 0.05, 30, -1, {});                 // Vd↑ → fração↓ em CADA passo
  bad += sweep('ligacao', 0, 0.999, -1, {});            // ligação↑ → fração↓
  bad += sweep('pm', 1, 40000, -1, {});                 // PM↑ → fração↓
  bad += sweep('kdial', 1, 400, +1, {});                // K_dial↑ → fração↑
  bad += sweep('t', 1, 1440, +1, {});                   // tempo↑ → fração↑
  // robustez extra da monotonia em low-flux
  bad += sweep('vd', 0.05, 30, -1, { highFlux: false });
  bad += sweep('pm', 1, 40000, -1, { highFlux: false });
  ok(bad === 0, 'monotonia exaustiva: todas as alavancas em ' + STEPS + ' passos, 0 inversões (' + bad + ')');
})();

/* 9. FUZZING semeado ≥20000, 40% malignas */
(function () {
  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  var rnd = mulberry32(0x32C0FE), N = 22000, bad = 0, badBounds = 0, badMut = 0, badId = 0;
  var drogas = ['custom', 'vancomicina', 'gentamicina', 'cefepime', 'litio', 'fenobarbital', 'digoxina', 'xyz', null, 123];
  var MAL = [NaN, Infinity, -Infinity, 1e300, -1e300, '12', 'x', null, undefined, {}, [], function () {}, true];
  function val() {
    var r = rnd();
    if (r < 0.40) return MAL[(rnd() * MAL.length) | 0];   // 40% malignas
    return (rnd() - 0.1) * 9000;
  }
  function deep(o) { return JSON.stringify(o, function (k, v) { return typeof v === 'function' ? 'fn' : v; }); }
  for (var i = 0; i < N; i++) {
    var inp = { droga: drogas[(rnd() * drogas.length) | 0], pm: val(), ligacao: val(), vd: val(), kdial: val(), t: val(), peso: val(), dose: val(), highFlux: rnd() > 0.5 };
    var before = deep(inp);
    var r, L;
    try { r = dialdrug(inp); L = vdLayout(inp, 900, 360); } catch (e) { bad++; continue; }
    // (a)+(b): finitos e dentro dos limites
    if (checkBounds(r) !== null) badBounds++;
    // (c): identidades/conservação
    if (!near(r.fracaoRemovida, 1 - Math.exp(-r.expo), 1e-7)) badId++;
    if (!near(r.doseSuplementarMg, r.doseTotalMg * r.fracaoRemovida, 1e-3 + Math.abs(r.doseTotalMg) * 1e-9)) badId++;
    if (!(Array.isArray(L.curva) && L.curva.length === 61 && fin(L.current.x) && fin(L.current.y))) bad++;
    // layout: nenhum ponto NaN
    for (var j = 0; j < L.curva.length; j++) { if (!fin(L.curva[j].x) || !fin(L.curva[j].y)) { bad++; break; } }
    // (d): entrada não mutada
    if (deep(inp) !== before) badMut++;
  }
  ok(bad === 0, 'fuzzing: ' + N + ' entradas (40% malignas) → 0 falhas estruturais (' + bad + ')');
  ok(badBounds === 0, 'fuzzing: 0 violações de limite (' + badBounds + ')');
  ok(badId === 0, 'fuzzing: 0 quebras de identidade (' + badId + ')');
  ok(badMut === 0, 'fuzzing: 0 mutações da entrada (' + badMut + ')');
})();

/* 10. SAÍDA */
console.log(oks + ' OK · ' + fails + ' falhas');
process.exit(fails > 0 ? 1 : 0);
