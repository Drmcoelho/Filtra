/* =========================================================================
 * FILTRA · M39 — bateria de robustez do engine psicométrico (0 falhas ou não entra)
 * 1 BASE · 2 IDENTIDADES · 3 LEIS · 4 PÉROLAS · 5 DETERMINISMO 5× · 6 ROBUSTEZ ·
 * 7 LIMITES · 8 VARREDURA EXAUSTIVA · 9 FUZZING ≥20000 (≥35% malignas) · 10 SAÍDA
 * ========================================================================= */
var M = require('./model39.js');
var gradeExam = M.gradeExam, domainBreakdown = M.domainBreakdown, scoreProfileLayout = M.scoreProfileLayout;
var itemDifficulty = M.itemDifficulty, itemDiscrimination = M.itemDiscrimination, kr20 = M.kr20, psychometrics = M.psychometrics;
var escoresTotais = M.escoresTotais;

var oks = 0, fails = 0, micro = 0;
function ok(c, m) { if (c) oks++; else { fails++; console.log('  FALHA: ' + m); } }
function micros(n) { micro += n; }
function near(a, b, t) { return Math.abs(a - b) <= (t || 1e-7); }
function fin(x) { return typeof x === 'number' && isFinite(x); }

function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

/* ----- geradores determinísticos de gabarito/respostas/coorte ----- */
function makeGabarito(n, rnd) { var g = [], i; for (i = 0; i < n; i++) g.push((rnd() * 4) | 0); return g; }
function makeDominios(n, doms, rnd) { var d = [], i; for (i = 0; i < n; i++) d.push(doms[(rnd() * doms.length) | 0]); return d; }
// aluno com habilidade theta ∈ [0,1]: acerta cada item com prob ~ theta (mistura sinal/ruído)
function makeRespostas(gab, theta, rnd) {
  var r = [], i; for (i = 0; i < gab.length; i++) { r.push(rnd() < theta ? gab[i] : ((gab[i] + 1 + ((rnd() * 3) | 0)) % 4)); } return r;
}
function makeCohort(gab, nJ, rnd) {
  var mat = [], j; for (j = 0; j < nJ; j++) { var theta = 0.2 + 0.7 * rnd(); mat.push(makeRespostas(gab, theta, rnd)); } return mat;
}

/* ---------- 1. LINHA DE BASE ---------- */
(function () {
  var gab = [0, 1, 2, 3, 0, 1, 2, 3, 0, 1];
  var doms = ['A', 'A', 'B', 'B', 'C', 'C', 'D', 'D', 'E', 'E'];
  var perfeito = gab.slice();
  var rP = gradeExam(perfeito, gab, 0.6);
  ok(rP.score === 10 && near(rP.fracao, 1) && rP.aprovado, 'base: gabarito idêntico → 100% aprovado');
  var zero = [9, 9, 9, 9, 9, 9, 9, 9, 9, 9];
  var rZ = gradeExam(zero, gab, 0.6);
  ok(rZ.score === 0 && near(rZ.fracao, 0) && !rZ.aprovado, 'base: tudo errado → 0% reprovado');
  var meio = [0, 1, 2, 3, 0, 9, 9, 9, 9, 9];
  var rM = gradeExam(meio, gab, 0.6);
  ok(rM.score === 5 && near(rM.fracao, 0.5), 'base: 5/10 → fração 0.5');
  ok(!rM.aprovado, 'base: 50% < corte 60% → reprovado');
  var db = domainBreakdown(perfeito, gab, doms);
  ok(db.linhas.length === 5 && near(db.fracaoGlobal, 1), 'base: 5 domínios, fração global 1 no gabarito');
  ok(db.totalItens === 10 && db.totalAcertos === 10, 'base: domínios somam o total');
})();

/* ---------- 2. IDENTIDADES ---------- */
(function () {
  var rnd = mulberry32(0x39A1);
  for (var t = 0; t < 200; t++) {
    var n = 5 + ((rnd() * 30) | 0);
    var gab = makeGabarito(n, rnd);
    var doms = makeDominios(n, ['A', 'B', 'C', 'D', 'E', 'F'], rnd);
    var resp = makeRespostas(gab, rnd(), rnd);
    var g = gradeExam(resp, gab, rnd());
    // score = soma do vetor de acertos
    var soma = 0, k; for (k = 0; k < g.acertos.length; k++) soma += g.acertos[k];
    ok(g.score === soma, 'id: score = Σ acertos');
    ok(near(g.fracao, n > 0 ? g.score / n : 0), 'id: fração = score/n');
    ok(g.fracao >= 0 && g.fracao <= 1, 'id: fração ∈ [0,1]');
    ok(near(g.percentual, g.fracao * 100), 'id: percentual = fração·100');
    // domínios: acertos e totais somam o exame
    var db = domainBreakdown(resp, gab, doms);
    var sa = 0, st = 0; for (k = 0; k < db.linhas.length; k++) { sa += db.linhas[k].acertos; st += db.linhas[k].total; }
    ok(sa === g.score && st === n, 'id: domínios somam acertos e itens do exame');
    ok(db.totalAcertos === g.score && db.totalItens === n, 'id: totais do breakdown = exame');
    // cada linha: acertos ≤ total, fração coerente
    var coerente = true;
    for (k = 0; k < db.linhas.length; k++) { var L = db.linhas[k]; if (L.acertos > L.total || L.acertos < 0 || !near(L.fracao, L.total > 0 ? L.acertos / L.total : 0)) coerente = false; micros(1); }
    ok(coerente, 'id: cada domínio acertos≤total e fração=acertos/total');
  }
})();

/* ---------- 3. LEIS (monotonia direcional) ---------- */
(function () {
  var rnd = mulberry32(0x5EE);
  var gab = makeGabarito(40, rnd);
  // mais acertos → maior score (substituir erros por acertos nunca diminui)
  var base = makeRespostas(gab, 0.3, rnd);
  var melhor = base.slice(); var i;
  for (i = 0; i < melhor.length; i += 2) melhor[i] = gab[i]; // força acertos em metade
  ok(gradeExam(melhor, gab).score >= gradeExam(base, gab).score, 'lei: forçar acertos não diminui o score');
  ok(gradeExam(gab, gab).score >= gradeExam(melhor, gab).score, 'lei: gabarito completo é o máximo');
  // corte mais alto nunca facilita a aprovação
  var resp = makeRespostas(gab, 0.65, rnd);
  var apBaixo = gradeExam(resp, gab, 0.2).aprovado;
  var apAlto = gradeExam(resp, gab, 0.95).aprovado;
  ok(!(apAlto && !apBaixo), 'lei: corte↑ nunca torna aprovado quem reprovava em corte menor');
  // dificuldade: coorte forte → p alto; coorte fraca → p baixo
  var rs = mulberry32(0x111);
  var matForte = []; for (i = 0; i < 60; i++) matForte.push(makeRespostas(gab, 0.9, rs));
  var matFraca = []; for (i = 0; i < 60; i++) matFraca.push(makeRespostas(gab, 0.25, rs));
  var pF = itemDifficulty(matForte, gab), pf = itemDifficulty(matFraca, gab);
  var mF = pF.reduce(function (a, b) { return a + b; }, 0) / pF.length;
  var mf = pf.reduce(function (a, b) { return a + b; }, 0) / pf.length;
  ok(mF > mf, 'lei: coorte forte tem dificuldade média p maior (itens mais "fáceis" para ela)');
})();

/* ---------- 4. PÉROLAS ---------- */
(function () {
  var rnd = mulberry32(0xBEE);
  var gab = makeGabarito(50, rnd);
  // PÉROLA: KR-20 sobe quando o teste discrimina (coorte heterogênea) e ~0 quando todos iguais
  var matHetero = [], i; var rs = mulberry32(0xC0);
  for (i = 0; i < 120; i++) matHetero.push(makeRespostas(gab, 0.15 + 0.8 * rs(), rs));
  var relHetero = kr20(matHetero, gab);
  // coorte homogênea: todos com mesma theta alta → variância de escore baixa → KR-20 baixo
  var matHomo = []; var rh = mulberry32(0xC1);
  for (i = 0; i < 120; i++) matHomo.push(makeRespostas(gab, 0.95, rh));
  var relHomo = kr20(matHomo, gab);
  ok(relHetero > relHomo, 'pérola: confiabilidade (KR-20) maior na coorte heterogênea que na homogênea');
  ok(relHetero >= 0 && relHetero <= 1 && relHomo >= 0 && relHomo <= 1, 'pérola: KR-20 ∈ [0,1]');
  // PÉROLA: discriminação ~0 num item que todos acertam (constante) — não separa ninguém
  var matC = []; var rc = mulberry32(0xC2);
  for (i = 0; i < 80; i++) { var r = makeRespostas(gab, 0.3 + 0.6 * rc(), rc); r[0] = gab[0]; matC.push(r); } // item 0: todos acertam
  var disc = itemDiscrimination(matC, gab);
  ok(near(disc[0], 0, 1e-9), 'pérola: item que todos acertam tem discriminação 0 (não separa)');
  // PÉROLA: o número (score) é sombra; o PERFIL por domínio mostra ONDE falha
  var doms = ['LRA', 'LRA', 'HDI', 'HDI', 'TRRC'];
  var gab2 = [0, 1, 2, 3, 0];
  var resp2 = [0, 1, 9, 9, 0]; // acerta LRA e TRRC, erra HDI
  var db = domainBreakdown(resp2, gab2, doms);
  ok(db.pontoFraco === 'HDI', 'pérola: o perfil por domínio aponta o ponto fraco (HDI), que o score total esconde');
})();

/* ---------- 5. DETERMINISMO 5× byte-idêntico ---------- */
(function () {
  var rnd = mulberry32(0xD00);
  var gab = makeGabarito(30, rnd), doms = makeDominios(30, ['A', 'B', 'C', 'D'], rnd);
  var resp = makeRespostas(gab, 0.55, rnd);
  var refG = JSON.stringify(gradeExam(resp, gab, 0.6)), igG = true;
  for (var n = 0; n < 5; n++) if (JSON.stringify(gradeExam(resp, gab, 0.6)) !== refG) igG = false;
  ok(igG, 'determinismo: gradeExam 5× byte-idêntico');
  var refD = JSON.stringify(domainBreakdown(resp, gab, doms)), igD = true;
  for (n = 0; n < 5; n++) if (JSON.stringify(domainBreakdown(resp, gab, doms)) !== refD) igD = false;
  ok(igD, 'determinismo: domainBreakdown 5× byte-idêntico');
  var db = domainBreakdown(resp, gab, doms);
  var refL = JSON.stringify(scoreProfileLayout(db, 900, 360)), igL = true;
  for (n = 0; n < 5; n++) if (JSON.stringify(scoreProfileLayout(db, 900, 360)) !== refL) igL = false;
  ok(igL, 'determinismo: scoreProfileLayout 5× byte-idêntico');
  // entradas congeladas não lançam nem são mutadas
  var fg = Object.freeze(gab.slice()), fr = Object.freeze(resp.slice());
  var threw = false, a; try { a = gradeExam(fr, fg, 0.6); } catch (e) { threw = true; }
  ok(!threw && fin(a.score), 'determinismo: Object.freeze (resp/gab) não lança');
  ok(fr.length === resp.length && fr[0] === resp[0], 'determinismo: entrada não mutada');
})();

/* ---------- 6. ROBUSTEZ (lixo pontual) ---------- */
(function () {
  var maus = [undefined, null, {}, [], 'x', 42, NaN, Infinity, [NaN, 'a', null], [Infinity, -1, 2.5], function () {}, true];
  maus.forEach(function (g, gi) {
    maus.forEach(function (r, ri) {
      var res = gradeExam(r, g, NaN);
      ok(fin(res.score) && fin(res.fracao) && fin(res.percentual) && res.fracao >= 0 && res.fracao <= 1, 'robustez: gradeExam(' + ri + ',' + gi + ') finito e em faixa');
      var db = domainBreakdown(r, g, maus[(gi + ri) % maus.length]);
      ok(fin(db.fracaoGlobal) && db.fracaoGlobal >= 0 && db.fracaoGlobal <= 1, 'robustez: domainBreakdown finito');
      var L = scoreProfileLayout(db, NaN, Infinity);
      ok(fin(L.W) && fin(L.H) && fin(L.baseY) && Array.isArray(L.bars), 'robustez: layout finito');
      micros(3);
    });
  });
  // psicometria com matrizes-lixo
  var matsMaus = [undefined, null, {}, 'x', [null, undefined, NaN], [[NaN], ['x'], [Infinity]], [[]], 5];
  matsMaus.forEach(function (mat, mi) {
    var p = itemDifficulty(mat, [0, 1, 2]);
    var d = itemDiscrimination(mat, [0, 1, 2]);
    var rel = kr20(mat, [0, 1, 2]);
    var allFin = p.every(fin) && d.every(fin) && fin(rel) && rel >= 0 && rel <= 1;
    ok(allFin, 'robustez: psicometria(' + mi + ') finita e em faixa');
    micros(2);
  });
})();

/* ---------- 7. LIMITES ---------- */
(function () {
  // exame vazio
  var e = gradeExam([], []);
  ok(e.nItens === 0 && e.score === 0 && e.fracao === 0 && !e.aprovado, 'limites: exame vazio → 0, não aprovado');
  // respostas mais curtas que o gabarito (faltando) contam como branco/errado
  var g = [0, 1, 2, 3, 0];
  var curto = gradeExam([0, 1], g);
  ok(curto.score === 2 && curto.nItens === 5, 'limites: respostas faltando contam como erro');
  // respostas mais longas que o gabarito: o excedente é ignorado
  var longo = gradeExam([0, 1, 2, 3, 0, 7, 7, 7], g);
  ok(longo.score === 5 && longo.nItens === 5, 'limites: respostas excedentes ignoradas');
  // corte extremo
  ok(gradeExam(g, g, 0).aprovado, 'limites: corte 0 aprova qualquer um');
  ok(gradeExam(g, g, 1).aprovado, 'limites: corte 1 aprova só os 100% (e este é 100%)');
  ok(!gradeExam([0, 1, 2, 3, 9], g, 1).aprovado, 'limites: corte 1 reprova 80%');
  // coorte de 1 examinando: discriminação/KR-20 indefinidos → 0
  ok(near(kr20([[0, 1, 2]], [0, 1, 2]), 0), 'limites: KR-20 com 1 examinando → 0');
  var d1 = itemDiscrimination([[0, 1, 2]], [0, 1, 2]);
  ok(d1.every(function (x) { return x === 0; }), 'limites: discriminação com 1 examinando → 0');
})();

/* ---------- 8. VARREDURA EXAUSTIVA (escore monótono em substituição de acertos) ---------- */
(function () {
  var rnd = mulberry32(0x8A8);
  var gab = makeGabarito(100, rnd);
  // começa tudo errado, vai acertando item a item: score deve crescer 1 a 1
  var resp = []; var i; for (i = 0; i < 100; i++) resp[i] = (gab[i] + 1) % 4;
  var prev = gradeExam(resp, gab).score, monoOk = true;
  ok(prev === 0, 'varredura: começa em 0 acertos');
  for (i = 0; i < 100; i++) {
    resp[i] = gab[i];
    var s = gradeExam(resp, gab).score;
    if (s !== prev + 1) monoOk = false;
    prev = s; micros(1);
  }
  ok(monoOk && prev === 100, 'varredura: cada acerto soma exatamente 1, chega a 100');
  // layout: o nº de barras = nº de domínios para qualquer perfil
  var rnd2 = mulberry32(0x8B8);
  var okBars = true;
  for (i = 0; i < 200; i++) {
    var nD = 1 + ((rnd2() * 12) | 0);
    var linhas = []; var k; for (k = 0; k < nD; k++) linhas.push({ dominio: 'D' + k, total: 1 + ((rnd2() * 10) | 0), acertos: 0, fracao: rnd2(), percentual: rnd2() * 100 });
    var L = scoreProfileLayout({ linhas: linhas }, 800, 320);
    if (L.bars.length !== nD || L.pts.length !== nD) okBars = false;
    for (k = 0; k < L.bars.length; k++) { if (!fin(L.bars[k].x) || !fin(L.bars[k].y) || !fin(L.bars[k].h) || L.bars[k].h < -1e-9) okBars = false; micros(1); }
  }
  ok(okBars, 'varredura: layout gera 1 barra por domínio, geometria finita e h≥0');
})();

/* ---------- 9. FUZZING semeado ≥20000 (≥35% malignas) ---------- */
(function () {
  var rnd = mulberry32(0x39F1FF);
  var N = 22000, badG = 0, badD = 0, badL = 0, badP = 0, badMut = 0, badSum = 0;
  var MAL = [NaN, Infinity, -Infinity, 1e300, -1e300, '0', '2', 'x', '', null, undefined, {}, [], function () {}, true, false, -1, 2.7];
  function maybeMal() { return rnd() < 0.35; }
  function valIdx() { if (maybeMal()) return MAL[(rnd() * MAL.length) | 0]; return (rnd() * 4) | 0; }
  function vecIdx(n) { var a = [], i; for (i = 0; i < n; i++) a.push(valIdx()); return a; }
  var doms = ['Compartimentos/meio interno', 'Glomérulo/clearance', 'Túbulo/diuréticos', 'Eletrólitos/ácido-base', 'RAAS/endócrino', 'LRA', 'Princípios de diálise', 'HDI', 'TRRC/contínuas', 'Indicação/integração'];
  for (var it = 0; it < N; it++) {
    var n = 1 + ((rnd() * 40) | 0);
    var gab = vecIdx(n);
    var resp = vecIdx(n);
    var dn = []; var i; for (i = 0; i < n; i++) dn.push(maybeMal() ? MAL[(rnd() * MAL.length) | 0] : doms[(rnd() * doms.length) | 0]);
    var corte = maybeMal() ? MAL[(rnd() * MAL.length) | 0] : rnd();
    // snapshot para checar não-mutação
    var snapG = JSON.stringify(gab, function (k, v) { return typeof v === 'function' ? '__fn__' : (v === undefined ? '__u__' : v); });
    var snapR = JSON.stringify(resp, function (k, v) { return typeof v === 'function' ? '__fn__' : (v === undefined ? '__u__' : v); });

    var g = gradeExam(resp, gab, corte);
    if (!fin(g.score) || !fin(g.fracao) || g.fracao < -1e-9 || g.fracao > 1 + 1e-9 || !fin(g.percentual) || typeof g.aprovado !== 'boolean') badG++;
    if (g.score < 0 || g.score > g.nItens) badG++;

    var db = domainBreakdown(resp, gab, dn);
    if (!fin(db.fracaoGlobal) || db.fracaoGlobal < -1e-9 || db.fracaoGlobal > 1 + 1e-9) badD++;
    // domínios somam o exame
    var sa = 0, st = 0, j;
    for (j = 0; j < db.linhas.length; j++) { sa += db.linhas[j].acertos; st += db.linhas[j].total; if (!fin(db.linhas[j].fracao) || db.linhas[j].fracao < -1e-9 || db.linhas[j].fracao > 1 + 1e-9) badD++; }
    if (sa !== g.score || st !== g.nItens) badSum++;

    var L = scoreProfileLayout(db, maybeMal() ? MAL[(rnd() * MAL.length) | 0] : 200 + rnd() * 800, maybeMal() ? MAL[(rnd() * MAL.length) | 0] : 120 + rnd() * 400);
    if (!fin(L.W) || !fin(L.H) || !fin(L.baseY) || !fin(L.corteY) || L.bars.length !== db.linhas.length) badL++;
    for (j = 0; j < L.bars.length; j++) { if (!fin(L.bars[j].x) || !fin(L.bars[j].y) || !fin(L.bars[j].h) || !fin(L.pts[j].x) || !fin(L.pts[j].y)) { badL++; break; } }

    // psicometria sobre uma mini-coorte construída do fuzz
    if (it % 7 === 0) {
      var nJ = 1 + ((rnd() * 8) | 0), mat = []; for (j = 0; j < nJ; j++) mat.push(vecIdx(n));
      var p = itemDifficulty(mat, gab), d = itemDiscrimination(mat, gab), rel = kr20(mat, gab);
      var pf = p.every(fin) && p.every(function (x) { return x >= -1e-9 && x <= 1 + 1e-9; });
      var dfi = d.every(fin) && d.every(function (x) { return x >= -1 - 1e-9 && x <= 1 + 1e-9; });
      if (!pf || !dfi || !fin(rel) || rel < -1e-9 || rel > 1 + 1e-9) badP++;
      micros(p.length + d.length + 1);
    }

    var afterG = JSON.stringify(gab, function (k, v) { return typeof v === 'function' ? '__fn__' : (v === undefined ? '__u__' : v); });
    var afterR = JSON.stringify(resp, function (k, v) { return typeof v === 'function' ? '__fn__' : (v === undefined ? '__u__' : v); });
    if (afterG !== snapG || afterR !== snapR) badMut++;
    micros(8 + 3 * L.bars.length);
  }
  ok(badG === 0, 'fuzzing: gradeExam finito/faixa em todas (' + badG + ')');
  ok(badD === 0, 'fuzzing: domainBreakdown finito/faixa em todas (' + badD + ')');
  ok(badSum === 0, 'fuzzing: domínios SEMPRE somam o exame (conservação) (' + badSum + ')');
  ok(badL === 0, 'fuzzing: layout finito e 1 barra/domínio em todas (' + badL + ')');
  ok(badP === 0, 'fuzzing: psicometria finita/faixa em todas (' + badP + ')');
  ok(badMut === 0, 'fuzzing: entradas (gab/resp) nunca mutadas (' + badMut + ')');
})();

/* ---------- 10. SAÍDA ---------- */
console.log((oks + micro) + ' OK (' + oks + ' macro + ' + micro + ' micro/fuzz) · ' + fails + ' falhas');
process.exit(fails > 0 ? 1 : 0);
