'use strict';
/*
 * FILTRA · M1 — bateria de robustez (engine do néfron / forças de Starling)
 * Espelha a estrutura canônica (§6): linha de base · identidades · leis ·
 * pérolas · determinismo · robustez · fuzzing semeado ≥ 5000 · saída.
 * Determinístico entre execuções (PRNG semeado).
 */

var M = require('./model1.js');
var nefron = M.nefron, tfgCurveLayout = M.tfgCurveLayout, glomLayout = M.glomLayout, C = M.CONST;

var oks = 0, fail = 0;
function ok(cond, msg) { if (cond) { oks++; } else { fail++; console.error('FALHA: ' + msg); } }
function near(a, b, tol) { return Math.abs(a - b) <= (tol === undefined ? 1e-7 : tol); }
function fin(x) { return typeof x === 'number' && isFinite(x); }
function finN(o) { for (var k in o) { if (typeof o[k] === 'number' && !isFinite(o[k])) return false; } return true; }

// ----------------------------------------------------------------- 1. LINHA DE BASE
(function () {
  var r = nefron({ PAM: 100 });                 // normal, autorregulado
  ok(near(r.P_GC, 60, 0.5), 'baseline P_GC ≈ 60 mmHg (tem ' + r.P_GC.toFixed(1) + ')');
  ok(r.TFG > 110 && r.TFG < 140, 'baseline TFG ≈ 125 mL/min (tem ' + r.TFG.toFixed(1) + ')');
  ok(r.FPR > 540 && r.FPR < 660, 'baseline FPR ≈ 600 mL/min (tem ' + r.FPR.toFixed(0) + ')');
  ok(r.FF > 0.17 && r.FF < 0.24, 'baseline FF ≈ 0,20 (tem ' + r.FF.toFixed(3) + ')');
  ok(near(r.NFP, r.P_GC - r.P_BC - r.piGC, 1e-9), 'baseline NFP = P_GC − P_BC − π_GC');
  ok(r.regime === 'plato', 'baseline está no platô autorregulado');
})();

// ----------------------------------------------------------------- 2. IDENTIDADES
(function () {
  var casos = [
    { PAM: 100 }, { PAM: 120, rE: 1.4 }, { PAM: 75, rA: 1.6 },
    { PAM: 160, rE: 0.7, autoreg: false }, { PAM: 90, Kf: 10, piGC: 24 },
    { PAM: 100, P_BC: 30 }, { PAM: 60, rA: 1.2, rE: 0.6, autoreg: false }
  ];
  for (var i = 0; i < casos.length; i++) {
    var r = nefron(casos[i]);
    // definição de NFP
    ok(near(r.NFP, r.P_GC - r.P_BC - r.piGC, 1e-9), 'NFP = P_GC−P_BC−π_GC [' + i + ']');
    // FF · FPR = TFG (conservação da definição)
    ok(near(r.FF * r.FPR, r.TFG, 1e-6), 'FF·FPR = TFG [' + i + ']');
    // P_GC é média ponderada de PAM e P_v → fica entre os dois
    ok(r.P_GC >= C.PV - 1e-6 && r.P_GC <= r.PAM + 1e-6, 'P_v ≤ P_GC ≤ PAM [' + i + ']');
    // FF dentro do teto físico
    ok(r.FF >= 0 && r.FF <= C.FFMAX + 1e-9, '0 ≤ FF ≤ FFMAX [' + i + ']');
    ok(r.TFG >= 0, 'TFG ≥ 0 [' + i + ']');
    // GEOMETRIA do instrumento: a curva COMPUTADA passa pelo ponto de operação atual
    var L = tfgCurveLayout(casos[i], 900, 360);
    var c = L.current;
    ok(near(c.x, L.padL + (c.PAM - L.pamMin) * L.pxX, 1e-6), 'curva: x do marcador = PAM mapeada [' + i + ']');
    ok(c.y <= L.baseY + 1e-6 && c.y >= L.padT - 1e-6, 'curva: y do marcador dentro do quadro [' + i + ']');
    // x estritamente crescente ao longo da polilinha (PAM crescente)
    var mono = true;
    for (var k = 1; k < L.pts.length; k++) if (L.pts[k].x <= L.pts[k - 1].x) mono = false;
    ok(mono, 'curva: PAM (x) estritamente crescente [' + i + ']');
  }
})();

// ----------------------------------------------------------------- 3. LEIS (monotonicidade)
(function () {
  // isolar a hemodinâmica: autoreg OFF separa o efeito puro de cada resistência
  function N(o) { return nefron(o); }
  var base = { PAM: 100, autoreg: false };

  // ∂TFG/∂rA < 0 : fechar a aferente estrangula tudo a jusante
  var a1 = N(merge(base, { rA: 1.0 })), a2 = N(merge(base, { rA: 1.8 }));
  ok(a2.TFG < a1.TFG, 'aferente↑ → TFG↓');
  ok(a2.P_GC < a1.P_GC, 'aferente↑ → P_GC↓');
  ok(a2.FPR < a1.FPR, 'aferente↑ → FPR↓ (fluxo cai)');

  // ∂TFG/∂rE > 0 (zona fisiológica) : fechar a eferente represa a P_GC
  var e1 = N(merge(base, { rE: 1.0 })), e2 = N(merge(base, { rE: 1.5 }));
  ok(e2.P_GC > e1.P_GC, 'eferente↑ → P_GC↑ (represa a montante)');
  ok(e2.TFG > e1.TFG, 'eferente↑ → TFG↑ (zona fisiológica)');
  ok(e2.FPR < e1.FPR, 'eferente↑ → FPR↓ (fluxo cai)');
  ok(e2.FF > e1.FF, 'eferente↑ → FF↑');

  // ∂TFG/∂P_BC < 0 : a contrapressão de Bowman (obstrução)
  var b1 = N(merge(base, { P_BC: 15 })), b2 = N(merge(base, { P_BC: 30 }));
  ok(b2.TFG < b1.TFG, 'P_BC↑ → TFG↓ (pós-renal)');

  // ∂TFG/∂Kf > 0 ; ∂TFG/∂π_GC < 0
  ok(N(merge(base, { Kf: 10 })).TFG > N(merge(base, { Kf: 6 })).TFG, 'Kf↑ → TFG↑');
  ok(N(merge(base, { piGC: 32 })).TFG < N(merge(base, { piGC: 24 })).TFG, 'π_GC↑ → TFG↓');

  // PLATÔ: com autorregulação, a TFG quase não muda na faixa 90–130
  var p90 = N({ PAM: 90 }), p110 = N({ PAM: 110 }), p130 = N({ PAM: 130 });
  ok(Math.abs(p110.TFG - p90.TFG) < 6 && Math.abs(p130.TFG - p110.TFG) < 6, 'platô: ΔTFG/ΔPAM ≈ 0 (90–130)');
  ok(p90.regime === 'plato' && p130.regime === 'plato', 'platô: regime autorregulado em 90 e 130');

  // PRECIPÍCIO: abaixo do joelho a TFG despenca e segue a PAM
  var lo = N({ PAM: 55 });
  ok(lo.TFG < p90.TFG - 30, 'precipício: TFG despenca abaixo do joelho');
  ok(lo.regime === 'pre_renal', 'precipício: regime pré-renal');
  // a queda por 20 mmHg é MUITO maior no precipício que no platô (duas derivadas)
  var dPlato = Math.abs(p110.TFG - p90.TFG);
  var dPrec = Math.abs(N({ PAM: 70 }).TFG - N({ PAM: 50 }).TFG);
  ok(dPrec > dPlato + 10, 'platô≠reta: |ΔTFG| no precipício ≫ no platô');
})();
function merge(a, b) { return M.merge(a, b); }

// ----------------------------------------------------------------- 4. PÉROLAS
(function () {
  // PÉROLA 1 — paradoxo do eferente: DILATAR a eferente (IECA) baixa P_GC e TFG,
  // enquanto o fluxo plasmático SOBE (FF cai). A creatinina sobe porque a droga age.
  var semIECA = nefron({ PAM: 100, rE: 1.0, autoreg: false });
  var comIECA = nefron({ PAM: 100, rE: 0.5, autoreg: false });   // IECA dilata eferente
  ok(comIECA.P_GC < semIECA.P_GC, 'eferente dilatada → P_GC↓');
  ok(comIECA.TFG < semIECA.TFG, 'eferente dilatada → TFG↓ (creatinina sobe)');
  ok(comIECA.FPR > semIECA.FPR, 'eferente dilatada → FPR↑ (fluxo sobe)');
  ok(comIECA.FF < semIECA.FF, 'eferente dilatada → FF↓ (a queda é hemodinâmica, não lesão)');

  // PÉROLA 2 — a autorregulação DEFENDE a TFG onde, sem ela, a TFG cairia.
  var comAuto = nefron({ PAM: 90 });
  var semAuto = nefron({ PAM: 90, autoreg: false });
  ok(Math.abs(comAuto.TFG - nefron({ PAM: 120 }).TFG) < 6, 'autorregulação: TFG defendida 90↔120');
  ok(comAuto.g < 1, 'autorregulação: a 90 mmHg a aferente DILATA (g<1) para defender P_GC');

  // PÉROLA 3 — tríplice ameaça: AINE (rA↑) + IECA (rE↓) + depleção (PAM↓) somam-se
  // e colapsam a filtração, cada um sozinho sendo tolerável.
  var aine = nefron({ PAM: 90, rA: 1.8 });
  var ieca = nefron({ PAM: 90, rE: 0.5 });
  var deplec = nefron({ PAM: 75 });
  var triplo = nefron({ PAM: 75, rA: 1.8, rE: 0.5 });
  ok(triplo.TFG < aine.TFG && triplo.TFG < ieca.TFG && triplo.TFG < deplec.TFG,
    'tríplice ameaça: o conjunto filtra MENOS que qualquer fator isolado');
  ok(triplo.TFG < 40, 'tríplice ameaça: a filtração colapsa (TFG muito baixa)');
})();

// ----------------------------------------------------------------- 5. DETERMINISMO
(function () {
  var inp = { PAM: 118, rA: 1.3, rE: 0.8, Kf: 9, piGC: 26, P_BC: 14 };
  var a = nefron(inp), b = nefron(inp);
  ok(JSON.stringify(a) === JSON.stringify(b), 'mesma entrada → saída idêntica');
  // o laço de ponto-fixo converge ao mesmo g em execuções repetidas
  ok(a.g === b.g, 'autorregulação determinística (g idêntico)');
  var frozen = Object.freeze({ PAM: 100, rA: 1.2, rE: 0.9 });
  var threw = false; try { nefron(frozen); } catch (e) { threw = true; }
  ok(!threw, 'entrada Object.freeze não lança (não muta a entrada)');
  ok(frozen.PAM === 100, 'entrada não foi mutada');
  // a curva (varredura de PAM) não muta o estado passado
  var st = { PAM: 100, rA: 1 };
  tfgCurveLayout(st, 800, 320);
  ok(st.PAM === 100 && Object.keys(st).length === 2, 'tfgCurveLayout não muta o estado');
})();

// ----------------------------------------------------------------- 6. ROBUSTEZ
(function () {
  var sujeiras = [
    undefined, null, {}, { PAM: NaN }, { PAM: 'abc', rA: 'x', rE: null },
    { PAM: -50, rA: -3, rE: -1, Kf: -9, piGC: -10, P_BC: -5 },
    { PAM: 1e9, rA: 1e9, rE: 1e9, Kf: 1e9, P_BC: 1e9 },
    { PAM: Infinity, rA: -Infinity, rE: Infinity, autoreg: false },
    { PAM: 100, rA: 0, rE: 0 },                       // resistências nulas (clamp protege)
    { PAM: 40, rA: 5, rE: 5 }, { PAM: 250, rE: 0.2 }
  ];
  for (var i = 0; i < sujeiras.length; i++) {
    var r = nefron(sujeiras[i]);
    ok(finN(r), 'robustez: nenhum NaN/∞ na saída [#' + i + ']');
    ok(r.TFG >= 0 && r.FPR >= 0, 'robustez: TFG e FPR não-negativos [#' + i + ']');
    ok(r.FF >= 0 && r.FF <= C.FFMAX + 1e-9, 'robustez: FF em [0,FFMAX] [#' + i + ']');
    ok(r.P_GC >= C.PV - 1e-6 && r.P_GC <= r.PAM + 1e-6, 'robustez: P_v ≤ P_GC ≤ PAM [#' + i + ']');
    ok(r.g >= C.GMIN - 1e-9 && r.g <= C.GMAX + 1e-9, 'robustez: g dentro do alcance miogênico [#' + i + ']');
    // geometria nunca produz NaN
    var L = tfgCurveLayout(sujeiras[i], 900, 360);
    var badPt = false;
    for (var k = 0; k < L.pts.length; k++) if (!fin(L.pts[k].x) || !fin(L.pts[k].y)) badPt = true;
    ok(!badPt && fin(L.current.x) && fin(L.current.y), 'robustez: curva sem NaN [#' + i + ']');
    var G = glomLayout(r, 320, 200);
    ok(G.afferent.width > 0 && G.efferent.width > 0 && fin(G.pgcBar.h), 'robustez: glomLayout finito [#' + i + ']');
  }
})();

// ----------------------------------------------------------------- 7. FUZZING (semeado, ≥5000)
(function () {
  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  var rnd = mulberry32(0x1F11A);
  var malignos = [NaN, Infinity, -Infinity, null, undefined, '', 'xx', '12abc', 1e308, -1e308];
  function val(r) { return r < 0.30 ? malignos[(rnd() * malignos.length) | 0] : null; }

  var N = 20000, bad = 0;
  for (var i = 0; i < N; i++) {
    var inp = {
      PAM:  val(rnd()) !== null ? val(rnd()) : (rnd() * 240 + 20),
      rA:   val(rnd()) !== null ? val(rnd()) : (rnd() * 4.8 + 0.2),
      rE:   val(rnd()) !== null ? val(rnd()) : (rnd() * 4.8 + 0.2),
      Kf:   val(rnd()) !== null ? val(rnd()) : (rnd() * 19 + 0.5),
      piGC: val(rnd()) !== null ? val(rnd()) : (rnd() * 40),
      P_BC: val(rnd()) !== null ? val(rnd()) : (rnd() * 50),
      autoreg: rnd() < 0.5
    };
    var r = nefron(inp);
    if (!finN(r)) { bad++; continue; }
    if (r.TFG < 0 || r.FPR < 0) { bad++; continue; }
    if (r.FF < 0 || r.FF > C.FFMAX + 1e-9) { bad++; continue; }          // teto de FF
    if (r.P_GC < C.PV - 1e-6 || r.P_GC > r.PAM + 1e-6) { bad++; continue; } // P_GC ∈ [P_v,PAM]
    if (r.g < C.GMIN - 1e-9 || r.g > C.GMAX + 1e-9) { bad++; continue; } // ganho miogênico
    if (!near(r.FF * r.FPR, r.TFG, 1e-5)) { bad++; continue; }           // FF·FPR = TFG
    if (!near(r.NFP, r.P_GC - r.P_BC - r.piGC, 1e-6)) { bad++; continue; } // definição de NFP
    // a geometria do instrumento nunca produz NaN nem x não-monotônico
    var L = tfgCurveLayout(inp, 900, 360), pts = L.pts;
    for (var k = 0; k < pts.length; k++) {
      if (!fin(pts[k].x) || !fin(pts[k].y)) { bad++; break; }
      if (k > 0 && pts[k].x <= pts[k - 1].x) { bad++; break; }
    }
  }
  ok(bad === 0, 'fuzzing ' + N + ': ' + bad + ' violações (NaN/∞/clamp/FF/P_GC/conservação/geometria)');
})();

// ----------------------------------------------------------------- 8. SAÍDA

/* METAMÓRFICO — leis como propriedade em pares aleatórios (robustez ampliada) */
(function(){
 function mrg(a,b){var o={},k;for(k in a)o[k]=a[k];for(k in b)o[k]=b[k];return o;}
 function mb(a){return function(){a|=0;a=a+0x6D2B79F5|0;var t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;};}
 var rnd=mb(0x1A22), N=12000, viol=0, eps=1e-6, K=4;
 for(var i=0;i<N;i++){
  var b={PAM:60+rnd()*90,autoreg:false,rA:0.6+rnd()*1.4,rE:0.6+rnd()*1.4,P_BC:8+rnd()*22,Kf:4+rnd()*10,piGC:18+rnd()*18}; var b0=nefron(b);
  if(nefron(mrg(b,{rA:b.rA+rnd()*0.8+0.02})).TFG>b0.TFG+eps) viol++;
  if(nefron(mrg(b,{P_BC:b.P_BC+rnd()*15+0.5})).TFG>b0.TFG+eps) viol++;
  if(nefron(mrg(b,{Kf:b.Kf+rnd()*6+0.2})).TFG<b0.TFG-eps) viol++;
  if(nefron(mrg(b,{piGC:b.piGC+rnd()*12+0.5})).TFG>b0.TFG+eps) viol++;
 }
 ok(viol===0,'metamórfico: '+(N*K)+' propriedades em pares → 0 violações ('+viol+')');
})();

console.log(oks + ' OK · ' + fail + ' falhas');
process.exit(fail > 0 ? 1 : 0);
