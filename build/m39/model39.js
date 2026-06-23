/* =========================================================================
 * FILTRA · M39 — REVISÃO GLOBAL · exame de domínio · 100 questões.
 * ENGINE PURO (psicométrico). Espelhado inline no filtra39.html.
 *
 * M39 não tem uma fisiologia única; é um INSTRUMENTO DE AVALIAÇÃO. O "motor
 * manda no pixel" mesmo aqui: a nota, o perfil por domínio e a psicometria
 * (dificuldade, discriminação, confiabilidade) são COMPUTADOS, determinísticos
 * e resilientes. A UI só pinta o que o motor calcula.
 *
 * Vocabulário:
 *  - gabarito[i]      = índice correto da questão i.
 *  - respostas[i]     = índice marcado pelo aluno na questão i (−1/ausente = em branco).
 *  - dominios[i]      = rótulo do bloco curricular da questão i (ex.: 'LRA').
 *  - matriz[j][i]     = resposta do examinando j na questão i (coorte → psicometria).
 *
 * Fórmulas (documentadas):
 *  - acertou(i)            = (respostas[i] === gabarito[i]) ? 1 : 0
 *  - score                 = Σ acertou(i)         (total de acertos)
 *  - fração                = score / nItens       ∈ [0,1]
 *  - aprovado              = fração ≥ corte
 *  - p_i (dificuldade)     = (Σ_j acertou_j(i)) / nExaminandos     ∈ [0,1]  (1 = fácil)
 *  - discriminação (D)     = ponto-bisserial: corr(acerto_i, escoreTotal_j)
 *                            r_pb = ((M+ − M−)/sd_total)·√(p·q)   (forma clássica)
 *  - KR-20                 = (k/(k−1))·(1 − Σ p_i·q_i / var_total)  (confiabilidade)
 *
 * Todas as funções são puras: não mutam entradas, defaults sensatos, clamp
 * resiliente (NaN/null/string/∞ → piso), saídas sempre finitas e em faixa.
 * ========================================================================= */

function clampv(v, a, b) { var n = Number(v); if (!isFinite(n)) n = a; if (n < a) n = a; if (n > b) n = b; return n; }
function toIntIdx(v) { var n = Number(v); if (!isFinite(n)) return -1; n = Math.floor(n); return n; } // índice de opção; −1 = inválido/branco

/* domínios canônicos do braço (os blocos curriculares) — ordem estável */
var DOMINIOS = [
  'Compartimentos/meio interno',
  'Glomérulo/clearance',
  'Túbulo/diuréticos',
  'Eletrólitos/ácido-base',
  'RAAS/endócrino',
  'LRA',
  'Princípios de diálise',
  'HDI',
  'TRRC/contínuas',
  'Indicação/integração'
];

/* ----- normalização defensiva de vetores ----- */
function asArray(x) { return Object.prototype.toString.call(x) === '[object Array]' ? x : []; }

/* acerto item a item: retorna vetor 0/1 do tamanho do gabarito */
function acertos(respostas, gabarito) {
  var g = asArray(gabarito), r = asArray(respostas), out = [], i;
  for (i = 0; i < g.length; i++) {
    var gi = toIntIdx(g[i]), ri = toIntIdx(r[i]);
    out.push((gi >= 0 && ri === gi) ? 1 : 0);
  }
  return out;
}

/* função-mãe da nota: total, fração, aprovação vs corte */
function gradeExam(respostas, gabarito, corte) {
  var ac = acertos(respostas, gabarito);
  var n = ac.length, i, soma = 0;
  for (i = 0; i < n; i++) soma += ac[i];
  var c = clampv(corte !== undefined ? corte : 0.6, 0, 1);
  var fracao = n > 0 ? soma / n : 0;
  // proteção numérica explícita
  fracao = clampv(fracao, 0, 1);
  return {
    nItens: n,
    score: soma,                          // inteiro [0..n]
    fracao: fracao,                       // [0,1]
    percentual: clampv(fracao * 100, 0, 100),
    corte: c,
    aprovado: n > 0 && fracao >= c - 1e-12,
    acertos: ac
  };
}

/* perfil por domínio: para cada domínio, acertos/total e fração.
 * domains = vetor de rótulos por questão (paralelo ao gabarito). */
function domainBreakdown(respostas, gabarito, dominios) {
  var ac = acertos(respostas, gabarito);
  var dn = asArray(dominios);
  var mapa = {}, ordem = [], i;
  for (i = 0; i < ac.length; i++) {
    var d = (i < dn.length && dn[i] != null) ? String(dn[i]) : 'sem-domínio';
    if (!mapa[d]) { mapa[d] = { dominio: d, total: 0, acertos: 0 }; ordem.push(d); }
    mapa[d].total += 1;
    mapa[d].acertos += ac[i];
  }
  var linhas = [], somaAc = 0, somaTot = 0;
  for (i = 0; i < ordem.length; i++) {
    var e = mapa[ordem[i]];
    var frac = e.total > 0 ? clampv(e.acertos / e.total, 0, 1) : 0;
    linhas.push({ dominio: e.dominio, total: e.total, acertos: e.acertos, fracao: frac, percentual: clampv(frac * 100, 0, 100) });
    somaAc += e.acertos; somaTot += e.total;
  }
  // o ponto fraco: menor fração (desempate por mais itens, depois ordem)
  var fraco = null;
  for (i = 0; i < linhas.length; i++) {
    if (!fraco || linhas[i].fracao < fraco.fracao - 1e-12 ||
       (Math.abs(linhas[i].fracao - fraco.fracao) <= 1e-12 && linhas[i].total > fraco.total)) fraco = linhas[i];
  }
  return {
    linhas: linhas,
    totalAcertos: somaAc,
    totalItens: somaTot,
    fracaoGlobal: somaTot > 0 ? clampv(somaAc / somaTot, 0, 1) : 0,
    pontoFraco: fraco ? fraco.dominio : null
  };
}

/* ============ PSICOMETRIA (sobre uma matriz coorte × itens) ============ */
/* matriz[j] = vetor de respostas do examinando j (índices de opção).
 * gabarito  = vetor de índices corretos.
 * Constrói a matriz 0/1 de acertos e dela extrai dificuldade, escore total e
 * discriminação ponto-bisserial por item, além do KR-20. */
function matrizAcertos(matriz, gabarito) {
  var M = asArray(matriz), g = asArray(gabarito), out = [], j;
  for (j = 0; j < M.length; j++) out.push(acertos(M[j], g));
  return out; // out[j][i] ∈ {0,1}
}

/* dificuldade p por item: fração de examinandos que acertam (1 = fácil, 0 = difícil) */
function itemDifficulty(matriz, gabarito) {
  var A = matrizAcertos(matriz, gabarito);
  var nJ = A.length, nI = asArray(gabarito).length, p = [], i, j;
  for (i = 0; i < nI; i++) {
    var s = 0;
    for (j = 0; j < nJ; j++) s += (A[j] && A[j][i]) ? 1 : 0;
    p.push(nJ > 0 ? clampv(s / nJ, 0, 1) : 0);
  }
  return p;
}

/* escore total por examinando (linha) */
function escoresTotais(matriz, gabarito) {
  var A = matrizAcertos(matriz, gabarito), out = [], j, i;
  for (j = 0; j < A.length; j++) { var s = 0; for (i = 0; i < A[j].length; i++) s += A[j][i]; out.push(s); }
  return out;
}

function media(v) { var s = 0, i; for (i = 0; i < v.length; i++) s += v[i]; return v.length > 0 ? s / v.length : 0; }
function variancia(v) { var m = media(v), s = 0, i; for (i = 0; i < v.length; i++) { var d = v[i] - m; s += d * d; } return v.length > 0 ? s / v.length : 0; } // populacional

/* discriminação ponto-bisserial por item:
 * r_pb = ((M1 − M0)/sd_total)·√(p·q), onde M1/M0 = média do escore total entre
 * quem acertou/errou o item; p = dificuldade; q = 1−p. ∈ [−1,1]. */
function itemDiscrimination(matriz, gabarito) {
  var A = matrizAcertos(matriz, gabarito);
  var tot = escoresTotais(matriz, gabarito);
  var sd = Math.sqrt(variancia(tot));
  var nJ = A.length, nI = asArray(gabarito).length, out = [], i, j;
  for (i = 0; i < nI; i++) {
    if (sd <= 1e-12 || nJ < 2) { out.push(0); continue; }
    var s1 = 0, n1 = 0, s0 = 0, n0 = 0;
    for (j = 0; j < nJ; j++) {
      var ok = (A[j] && A[j][i]) ? 1 : 0;
      if (ok) { s1 += tot[j]; n1++; } else { s0 += tot[j]; n0++; }
    }
    if (n1 === 0 || n0 === 0) { out.push(0); continue; } // item constante → discriminação 0
    var m1 = s1 / n1, m0 = s0 / n0, p = n1 / nJ, q = 1 - p;
    var r = ((m1 - m0) / sd) * Math.sqrt(p * q);
    out.push(clampv(r, -1, 1));
  }
  return out;
}

/* KR-20: confiabilidade de consistência interna (itens dicotômicos)
 * KR20 = (k/(k−1))·(1 − Σ p_i·q_i / var_total). ∈ (−∞,1], clampado a [0,1]. */
function kr20(matriz, gabarito) {
  var p = itemDifficulty(matriz, gabarito);
  var k = p.length;
  if (k < 2) return 0;
  var tot = escoresTotais(matriz, gabarito);
  var varTot = variancia(tot);
  if (varTot <= 1e-12) return 0;
  var sumPQ = 0, i;
  for (i = 0; i < k; i++) sumPQ += p[i] * (1 - p[i]);
  var r = (k / (k - 1)) * (1 - sumPQ / varTot);
  return clampv(r, 0, 1);
}

/* resumo psicométrico de um conjunto de itens sobre uma coorte */
function psychometrics(matriz, gabarito) {
  var p = itemDifficulty(matriz, gabarito);
  var d = itemDiscrimination(matriz, gabarito);
  var rel = kr20(matriz, gabarito);
  var i, somaP = 0, somaD = 0;
  for (i = 0; i < p.length; i++) { somaP += p[i]; somaD += d[i]; }
  var k = p.length;
  return {
    k: k,
    dificuldadeMedia: k > 0 ? clampv(somaP / k, 0, 1) : 0,
    discriminacaoMedia: k > 0 ? clampv(somaD / k, -1, 1) : 0,
    kr20: rel,
    p: p, d: d
  };
}

/* ============ LAYOUT (geometria pura — a UI só pinta) ============ */
/* perfil por domínio como barras + polilinha de fração; geometria estável,
 * verificável byte-a-byte pelo validador (canvas == engine, tol 1e-6). */
function scoreProfileLayout(domainScores, W, H) {
  var linhas = asArray(domainScores && domainScores.linhas ? domainScores.linhas : domainScores);
  W = clampv(W, 200, 100000); H = clampv(H, 120, 100000);
  var padL = 52, padR = 16, padT = 18, padB = 46, baseY = H - padB;
  var n = linhas.length;
  var innerW = W - padL - padR, innerH = baseY - padT;
  var pxY = innerH / 100; // eixo y: percentual 0..100
  var slot = n > 0 ? innerW / n : innerW;
  var barW = slot * 0.6;
  var bars = [], pts = [], i;
  for (i = 0; i < n; i++) {
    var ln = linhas[i] || {};
    var pct = clampv(ln.percentual !== undefined ? ln.percentual : (clampv(ln.fracao, 0, 1) * 100), 0, 100);
    var cx = padL + slot * (i + 0.5);
    var bx = cx - barW / 2;
    var by = baseY - pct * pxY;
    bars.push({ i: i, dominio: ln.dominio != null ? String(ln.dominio) : '', pct: pct, x: bx, y: by, w: barW, h: pct * pxY, cx: cx });
    pts.push({ i: i, pct: pct, x: cx, y: by });
  }
  // linha do corte (passa-rasante): 60% por padrão, ou domainScores.corte
  var corte = clampv(domainScores && domainScores.corte !== undefined ? domainScores.corte : 0.6, 0, 1);
  var corteY = baseY - corte * 100 * pxY;
  return {
    W: W, H: H, padL: padL, padR: padR, padT: padT, padB: padB, baseY: baseY,
    n: n, pxY: pxY, slot: slot, barW: barW,
    axis: { x0: padL, y0: padT, xEnd: W - padR, yEnd: baseY },
    bars: bars, pts: pts,
    corte: corte, corteY: corteY,
    cortePts: [{ x: padL, y: corteY }, { x: W - padR, y: corteY }]
  };
}

/* ============ CASO CLÍNICO DINÂMICO (trajetória do paciente) ============
 * Um caso interativo é uma sequência de decisões; cada acerto MELHORA o estado
 * (severidade↑ rumo a 1 = recuperado) e cada erro PIORA (rumo a 0 = grave).
 * caseTrajectory transforma os deltas das escolhas numa TRAJETÓRIA computada,
 * determinística e clampada — o "motor manda no pixel" também no caso dinâmico. */
function caseTrajectory(deltas, start) {
  var d = asArray(deltas);
  var s = clampv(start !== undefined ? start : 0.5, 0, 1);
  var pts = [s], i, cur = s;
  for (i = 0; i < d.length; i++) {
    var step = Number(d[i]); if (!isFinite(step)) step = 0;
    cur = clampv(cur + step, 0, 1);
    pts.push(cur);
  }
  var final = pts[pts.length - 1];
  var outcome = final >= 0.7 ? 'recuperado' : (final >= 0.45 ? 'estável' : (final >= 0.2 ? 'deteriorando' : 'crítico'));
  return { points: pts, final: final, outcome: outcome, n: pts.length };
}

/* geometria PURA da trajetória (a UI só pinta) — severidade 0..1 × passos */
function caseTrajectoryLayout(deltas, start, W, H) {
  W = clampv(W, 200, 100000); H = clampv(H, 120, 100000);
  var tr = caseTrajectory(deltas, start);
  var padL = 46, padR = 16, padT = 16, padB = 30, baseY = H - padB;
  var n = tr.points.length;
  var pxX = (n > 1) ? (W - padL - padR) / (n - 1) : 0;
  var innerH = baseY - padT;
  var pts = [], i;
  for (i = 0; i < n; i++) {
    pts.push({ i: i, sev: tr.points[i], x: padL + i * pxX, y: baseY - tr.points[i] * innerH });
  }
  return {
    W: W, H: H, padL: padL, padR: padR, padT: padT, padB: padB, baseY: baseY, pxX: pxX,
    axis: { x0: padL, y0: padT, xEnd: W - padR, yEnd: baseY },
    yMid: baseY - 0.5 * innerH, yAlta: baseY - 0.7 * innerH,
    pts: pts, final: tr.final, outcome: tr.outcome
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    clampv: clampv, toIntIdx: toIntIdx, DOMINIOS: DOMINIOS,
    acertos: acertos, gradeExam: gradeExam, domainBreakdown: domainBreakdown,
    matrizAcertos: matrizAcertos, itemDifficulty: itemDifficulty, escoresTotais: escoresTotais,
    media: media, variancia: variancia, itemDiscrimination: itemDiscrimination,
    kr20: kr20, psychometrics: psychometrics, scoreProfileLayout: scoreProfileLayout,
    caseTrajectory: caseTrajectory, caseTrajectoryLayout: caseTrajectoryLayout
  };
}
