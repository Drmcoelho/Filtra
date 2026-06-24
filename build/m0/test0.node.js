'use strict';
/*
 * FILTRA · M0 — bateria de robustez (engine de compartimentos / Darrow–Yannet)
 * Espelha a estrutura canônica (§6): linha de base · identidades · leis ·
 * pérolas · determinismo · robustez · fuzzing semeado ≥ 5000 · saída.
 * Determinístico entre execuções (PRNG semeado).
 */

var M = require('./model0.js');
var compartimentos = M.compartimentos, clampv = M.clampv, dyLayout = M.dyLayout, balanco = M.balanco;

var oks = 0, fail = 0;
function ok(cond, msg) { if (cond) { oks++; } else { fail++; console.error('FALHA: ' + msg); } }
function near(a, b, tol) { return Math.abs(a - b) <= (tol === undefined ? 1e-7 : tol); }
function fin(x) { return typeof x === 'number' && isFinite(x); }
function finN(o) { for (var k in o) { if (typeof o[k] === 'number' && !isFinite(o[k])) return false; } return true; }

// ----------------------------------------------------------------- 1. LINHA DE BASE
(function () {
  var r = compartimentos({ pesoKg: 70, sexo: 'M', na0: 140 });
  ok(near(r.TBW0, 42, 1e-9), 'baseline TBW 70kg·0,6 = 42 L');
  ok(near(r.ICF0, 28, 1e-9), 'baseline ICF = 2/3 = 28 L');
  ok(near(r.ECF0, 14, 1e-9), 'baseline ECF = 1/3 = 14 L');
  ok(near(r.ICF, 28, 1e-9) && near(r.ECF, 14, 1e-9), 'sem manobra: compartimentos imóveis');
  ok(near(r.tonicidade, 280, 1e-9), 'tonicidade basal = 2·140 = 280');
  ok(r.osmMedida >= 284 && r.osmMedida <= 286, 'osm medida ≈ 285 (com ureia 5)');
  ok(near(r.osmMedida0, 285, 1e-9), 'osm medida basal = 280 + 5 = 285');
  ok(near(r.na, 140, 1e-9), 'Na resultante = 140');
  var f = compartimentos({ pesoKg: 60, sexo: 'F' });
  ok(near(f.TBW0, 30, 1e-9), 'mulher 60kg·0,5 = 30 L');
})();

// ----------------------------------------------------------------- 2. IDENTIDADES
(function () {
  var casos = [
    { pesoKg: 70, na0: 140, tipo: 'agua_livre', volumeL: 3 },
    { pesoKg: 80, na0: 150, tipo: 'isotonico_ganho', volumeL: 2 },
    { pesoKg: 55, na0: 130, tipo: 'hipertonico_ganho', volumeL: 1 },
    { pesoKg: 90, na0: 145, tipo: 'perda_agua_pura', volumeL: 2 },
    { pesoKg: 65, na0: 138, tipo: 'suor', volumeL: 2 },
    { pesoKg: 70, na0: 140, tipo: 'ureia', solutoMmol: 600 },
    { pesoKg: 70, na0: 140, tipo: 'glicose', solutoMmol: 400 }
  ];
  for (var i = 0; i < casos.length; i++) {
    var r = compartimentos(casos[i]);
    ok(near(r.ICF + r.ECF, r.TBW, 1e-6), 'conservação ICF+ECF=TBW [' + casos[i].tipo + ']');
    ok(near(r.ICF / (r.ICF || 1), 1), 'sanidade'); // trivial guard
    // equilíbrio osmótico: tonicidade é a mesma dos dois lados (por construção)
    ok(r.tonicidade > 0, 'tonicidade positiva [' + casos[i].tipo + ']');
    // medida ≥ tonicidade (ureia inefetiva só soma)
    ok(r.osmMedida >= r.tonicidade - 1e-6, 'osm medida ≥ tonicidade [' + casos[i].tipo + ']');
    ok(near(r.gapInefetivo, r.osmMedida - r.tonicidade, 1e-9), 'gap inefetivo coerente [' + casos[i].tipo + ']');
    // GEOMETRIA do instrumento: o desenho é COMPUTADO (o motor manda no pixel)
    var L = dyLayout(r, 900, 380);
    var b = L.boxes;
    ok(near(b.icf.w + b.ecf.w, r.TBW * L.pxV, 1e-6), 'dyLayout: largura(ICF)+largura(ECF)=largura(TBW) [' + casos[i].tipo + ']');
    ok(near(b.icf.h, b.ecf.h, 1e-9), 'dyLayout: ICF e ECF têm a mesma altura (mesma tonicidade) [' + casos[i].tipo + ']');
    ok(b.icf.x >= L.padL - 1e-9 && b.ecf.x >= b.icf.x - 1e-9, 'dyLayout: ECF à direita do ICF [' + casos[i].tipo + ']');
    ok(near(b.ecf.x, b.icf.x + b.icf.w, 1e-6), 'dyLayout: caixas contíguas (ECF começa onde ICF termina) [' + casos[i].tipo + ']');
  }
  // Na ≈ tonicidade/2 quando não há glicose
  var s = compartimentos({ pesoKg: 70, na0: 140, glu0: 0, tipo: 'agua_livre', volumeL: 4 });
  ok(near(s.na, s.tonicidade / 2, 1e-6), 'Na = tonicidade/2 (glu=0)');
})();

// ----------------------------------------------------------------- 3. LEIS (monotonicidade)
(function () {
  var base = { pesoKg: 70, na0: 140 };
  function withM(t, v, sol) { var o = { pesoKg: 70, na0: 140, tipo: t }; if (v !== undefined) o.volumeL = v; if (sol !== undefined) o.solutoMmol = sol; return compartimentos(o); }

  // água livre: ↑volume → tonicidade↓, Na↓, ICF↑, ECF↑
  var a1 = withM('agua_livre', 1), a2 = withM('agua_livre', 4);
  ok(a2.tonicidade < a1.tonicidade, 'água livre↑ → tonicidade↓');
  ok(a2.na < a1.na, 'água livre↑ → Na↓');
  ok(a2.ICF > a1.ICF && a2.ECF > a1.ECF, 'água livre↑ → ambos compartimentos↑');

  // perda de água pura: ↑perda → tonicidade↑, Na↑, ICF↓, ECF↓
  var p1 = withM('perda_agua_pura', 1), p2 = withM('perda_agua_pura', 4);
  ok(p2.tonicidade > p1.tonicidade, 'perda água↑ → tonicidade↑');
  ok(p2.ICF < p1.ICF && p2.ECF < p1.ECF, 'perda água↑ → ambos↓');
  // GEOMETRIA: tonicidade↑ → caixa mais ALTA que a basal (altura ∝ tonicidade)
  var Lp = dyLayout(p2, 900, 380);
  ok(Lp.boxes.icf.h > Lp.boxes.icf0.h, 'dyLayout: pós (tonicidade↑) mais alto que o basal');
  // água livre: tonicidade↓ → caixa mais BAIXA que a basal
  var La = dyLayout(a2, 900, 380);
  ok(La.boxes.icf.h < La.boxes.icf0.h, 'dyLayout: pós (tonicidade↓) mais baixo que o basal');

  // isotônico: ECF↑ enquanto ICF e tonicidade ~ constantes
  var i0 = compartimentos(base), i2 = withM('isotonico_ganho', 3);
  ok(i2.ECF > i0.ECF + 2.5, 'isotônico → ECF↑ (≈ todo o volume)');
  ok(near(i2.ICF, i0.ICF, 1e-6), 'isotônico → ICF imóvel');
  ok(near(i2.tonicidade, i0.tonicidade, 1e-6), 'isotônico → tonicidade imóvel');

  // hipertônico: tonicidade↑, Na↑, ECF↑, ICF↓ (puxa água da célula)
  var h0 = compartimentos(base), h2 = withM('hipertonico_ganho', 2);
  ok(h2.tonicidade > h0.tonicidade, 'hipertônico → tonicidade↑');
  ok(h2.na > h0.na, 'hipertônico → Na↑');
  ok(h2.ECF > h0.ECF, 'hipertônico → ECF↑');
  ok(h2.ICF < h0.ICF, 'hipertônico → ICF↓ (célula murcha)');

  // suor (hipotônico): perde mais água que sal → tonicidade↑
  var su = withM('suor', 3);
  ok(su.tonicidade > h0.tonicidade, 'suor → tonicidade↑ (perda hipotônica)');

  // FLUIDOS IV — onde cada fluido vai (introdução à fluidoterapia)
  var sf = withM('sf09', 2);
  ok(sf.ECF > i0.ECF + 1.5, 'SF 0,9% → ECF↑ (fica no ECF)');
  ok(Math.abs(sf.ICF - i0.ICF) < 0.3, 'SF 0,9% → ICF quase imóvel');
  var rl = withM('ringer', 2);
  ok(rl.ECF > i0.ECF, 'Ringer → ECF↑');
  ok(rl.ICF >= i0.ICF - 1e-9, 'Ringer (levemente hipotônico) → ICF não cai');
  var sg = withM('sg5', 3);
  ok(sg.ICF > i0.ICF && sg.ECF > i0.ECF, 'SG5% (glicose metabolizada → água livre) → ambos↑');
  ok(sg.na < i0.na, 'SG5% → Na↓');
  ok(near(sg.tonicidade, withM('agua_livre', 3).tonicidade, 1e-9), 'SG5% ≡ água livre na tonicidade');
  var n3 = withM('nacl3', 2);
  ok(n3.ICF < i0.ICF, 'NaCl 3% → ICF↓ (murcha)');
  ok(n3.na > i0.na, 'NaCl 3% → Na↑');
  var col = withM('coloide', 2);
  ok(col.ECF > i0.ECF + 1.5, 'coloide → ECF↑ (expansor do ECF)');
})();

// ----------------------------------------------------------------- 3b. BALANÇO HÍDRICO
(function () {
  var b = balanco({});
  ok(b.entradas === 2300 && b.saidas === 2300 && b.liquido === 0, 'balanço default em estado estável (≈0)');
  ok(near(b.entradas, b.oral + b.iv + b.metab, 1e-9), 'entradas = oral + IV + metabólica');
  ok(near(b.saidas, b.urina + b.insensivel + b.suor + b.fezes, 1e-9), 'saídas = urina + insensível + suor + fezes');
  ok(near(b.liquido, b.entradas - b.saidas, 1e-9), 'líquido = entradas − saídas');
  ok(balanco({ oralMl: 3000 }).liquido > b.liquido, 'mais ingesta → líquido↑');
  ok(balanco({ urinaMl: 3000 }).liquido < b.liquido, 'mais diurese → líquido↓');
  ok(balanco({ ivMl: 2000 }).ganho === true, 'IV 2 L → balanço positivo (retém água)');
  var sujo = balanco({ oralMl: 'x', urinaMl: NaN, suorMl: -50, ivMl: Infinity });
  ok(fin(sujo.entradas) && fin(sujo.saidas) && fin(sujo.liquido), 'balanço robusto: nada de NaN');
  ok(sujo.suor >= 0 && sujo.iv <= 20000, 'balanço: clamps respeitados');
})();

// ----------------------------------------------------------------- 4. PÉROLAS
(function () {
  var base = compartimentos({ pesoKg: 70, na0: 140 });
  // PÉROLA 1 — ureia: osm MEDIDA sobe, mas a célula NÃO muda (osmol inefetivo)
  var u = compartimentos({ pesoKg: 70, na0: 140, tipo: 'ureia', solutoMmol: 700 });
  ok(u.osmMedida > base.osmMedida + 5, 'ureia: osm medida↑');
  ok(near(u.tonicidade, base.tonicidade, 1e-6), 'ureia: tonicidade IMÓVEL');
  ok(near(u.ICF, base.ICF, 1e-6) && near(u.ECF, base.ECF, 1e-6), 'ureia: célula NÃO muda (pérola)');
  ok(near(u.na, base.na, 1e-6), 'ureia: Na imóvel');

  // PÉROLA 2 — glicose: Na MEDIDO cai, mas a tonicidade SOBE (hiponatremia hipertônica)
  var g = compartimentos({ pesoKg: 70, na0: 140, tipo: 'glicose', solutoMmol: 500 });
  ok(g.na < base.na, 'glicose: Na medido↓ (translocacional)');
  ok(g.tonicidade > base.tonicidade, 'glicose: tonicidade↑ apesar do Na baixo');
  ok(g.ICF < base.ICF, 'glicose: célula murcha (osmol efetivo)');
})();

// ----------------------------------------------------------------- 5. DETERMINISMO
(function () {
  var inp = { pesoKg: 73, sexo: 'M', na0: 137, glu0: 6, tipo: 'hipertonico_ganho', volumeL: 1.5 };
  var a = compartimentos(inp), b = compartimentos(inp);
  ok(JSON.stringify(a) === JSON.stringify(b), 'mesma entrada → saída idêntica');
  var frozen = Object.freeze({ pesoKg: 70, na0: 140, tipo: 'agua_livre', volumeL: 2 });
  var threw = false; try { compartimentos(frozen); } catch (e) { threw = true; }
  ok(!threw, 'entrada Object.freeze não lança (não muta a entrada)');
  ok(frozen.volumeL === 2, 'entrada não foi mutada');
})();

// ----------------------------------------------------------------- 6. ROBUSTEZ
(function () {
  var sujeiras = [
    undefined, null, {}, { pesoKg: NaN }, { pesoKg: 'abc', na0: 'x' },
    { pesoKg: -50, na0: -10, volumeL: -99, tipo: 'agua_livre' },
    { pesoKg: 1e9, na0: 1e9, glu0: 1e9, tipo: 'glicose', solutoMmol: 1e12 },
    { pesoKg: Infinity, na0: -Infinity, tipo: 'isotonico_perda', volumeL: Infinity },
    { tipo: 'manobra_inexistente', volumeL: 3 },
    { pesoKg: 70, na0: 140, tipo: 'isotonico_perda', volumeL: 999 }
  ];
  for (var i = 0; i < sujeiras.length; i++) {
    var r = compartimentos(sujeiras[i]);
    ok(finN(r), 'robustez: nenhum NaN/∞ na saída [#' + i + ']');
    ok(r.TBW >= 0.1 && r.ICF >= 0 && r.ECF >= 0, 'robustez: volumes não-negativos [#' + i + ']');
    ok(r.tonicidade > 0, 'robustez: tonicidade > 0 [#' + i + ']');
    ok(fin(r.na) && r.na >= 0, 'robustez: Na finito ≥ 0 [#' + i + ']');
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
  var rnd = mulberry32(0x1F11A);  // semente fixa → determinístico
  var tipos = Object.keys(M.MANOBRAS);
  var malignos = [NaN, Infinity, -Infinity, null, undefined, '', 'xx', '12abc', 1e308, -1e308];
  function val(r) { return r < 0.30 ? malignos[(rnd() * malignos.length) | 0] : null; }

  var N = 20000, bad = 0;
  for (var i = 0; i < N; i++) {
    var inp = {
      pesoKg:     val(rnd()) !== null ? val(rnd()) : (rnd() * 200 + 1),
      na0:        val(rnd()) !== null ? val(rnd()) : (rnd() * 100 + 100),
      glu0:       val(rnd()) !== null ? val(rnd()) : (rnd() * 80),
      ureia0:     val(rnd()) !== null ? val(rnd()) : (rnd() * 60),
      sexo:       rnd() < 0.5 ? 'M' : 'F',
      tipo:       tipos[(rnd() * tipos.length) | 0],
      volumeL:    val(rnd()) !== null ? val(rnd()) : (rnd() * 12),
      solutoMmol: val(rnd()) !== null ? val(rnd()) : (rnd() * 1500)
    };
    var r = compartimentos(inp);
    if (!finN(r)) { bad++; continue; }
    if (r.TBW < 0.1 || r.ICF < 0 || r.ECF < 0) { bad++; continue; }
    if (r.tonicidade <= 0) { bad++; continue; }
    if (!near(r.ICF + r.ECF, r.TBW, 1e-5)) { bad++; continue; }   // conservação
    if (r.osmMedida < r.tonicidade - 1e-5) { bad++; continue; }   // medida ≥ tonicidade
    // geometria do instrumento nunca produz NaN nem caixas negativas
    var L = dyLayout(r, 900, 380), bx = L.boxes;
    var todas = [bx.icf, bx.ecf, bx.icf0, bx.ecf0];
    for (var k = 0; k < todas.length; k++) {
      var q = todas[k];
      if (!finN(q) || q.w < 0 || q.h < 0) { bad++; break; }
    }
  }
  ok(bad === 0, 'fuzzing ' + N + ': ' + bad + ' violações (NaN/∞/clamp/conservação/geometria)');
})();

// ----------------------------------------------------------------- 8. SAÍDA

/* METAMÓRFICO — leis como propriedade em pares aleatórios (robustez ampliada) */
(function(){
 function mrg(a,b){var o={},k;for(k in a)o[k]=a[k];for(k in b)o[k]=b[k];return o;}
 function mb(a){return function(){a|=0;a=a+0x6D2B79F5|0;var t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;};}
 var rnd=mb(0x0A11), N=12000, viol=0, eps=1e-6, K=2;
 for(var i=0;i<N;i++){
  var base={pesoKg:40+rnd()*80,na0:128+rnd()*22}; var v=rnd()*4, dv=rnd()*3+0.05;
  var al1=compartimentos(mrg(base,{tipo:'agua_livre',volumeL:v})), al2=compartimentos(mrg(base,{tipo:'agua_livre',volumeL:v+dv}));
  if(al2.tonicidade>al1.tonicidade+eps) viol++;
  var pp1=compartimentos(mrg(base,{tipo:'perda_agua_pura',volumeL:v})), pp2=compartimentos(mrg(base,{tipo:'perda_agua_pura',volumeL:v+dv}));
  if(pp2.tonicidade<pp1.tonicidade-eps) viol++;
 }
 ok(viol===0,'metamórfico: '+(N*K)+' propriedades em pares → 0 violações ('+viol+')');
})();

console.log(oks + ' OK · ' + fail + ' falhas');
process.exit(fail > 0 ? 1 : 0);
