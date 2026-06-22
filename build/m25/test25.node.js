/* =========================================================================
 * FILTRA · M25 — bateria de robustez do engine (0 falhas ou não entra)
 * 1 BASE · 2 IDENTIDADES · 3 LEIS · 4 PÉROLAS · 5 DETERMINISMO 5× · 6 ROBUSTEZ ·
 * 7 LIMITES · 8 MONOTONIA EXAUSTIVA · 9 FUZZING ≥20000 (~35% malignas) · 10 SAÍDA
 * (robustez REFORÇADA: fuzz ≥20000, malignas em CADA campo, monotonia ≥60 passos/eixo)
 * ========================================================================= */
var M = require('./model25.js');
var dose = M.dose, ktvLayout = M.ktvLayout;
var urr = M.urr, ktv = M.ktv, clearanceK = M.clearanceK, ureiaPos = M.ureiaPos, volumeUreia = M.volumeUreia;
var KTV_ALVO = M.KTV_ALVO, URR_ALVO = M.URR_ALVO, KOA_MAX = M.KOA_MAX;

var oks = 0, fails = 0, micro = 0;
function ok(c, m) { if (c) oks++; else { fails++; console.log('  FALHA: ' + m); } }
function micros(n) { micro += n; }
function near(a, b, t) { return Math.abs(a - b) <= (t || 1e-7); }
function fin(x) { return typeof x === 'number' && isFinite(x); }
var ALA_OK = { manter: 1, tempo: 1, qb: 1, dialisador: 1 };

/* faixas documentadas por campo de saída numérica [min,max] */
var BOUNDS = {
  peso: [25, 200], ureiaPre: [20, 400], t: [0.5, 8], uf: [0, 8], qb: [100, 500], qd: [300, 900], koa: [300, 1200],
  V: [12, 120], K: [5, 500], R: [0.02, 1], ureiaPos: [4, 400], fracSaturacao: [0, 1],
  URR: [0, 98], spKtV: [0, 3.5], ktvSemanal: [0, 10],
  alvoEfetivo: [0.9, 1.2], deficitKtV: [0, 3.5],
  ktvSeTempo: [0, 3.5], ktvSeQb: [0, 3.5], ktvSeHF: [0, 3.5]
};
function dentroBounds(r) {
  for (var key in BOUNDS) { var b = BOUNDS[key]; if (!fin(r[key]) || r[key] < b[0] - 1e-9 || r[key] > b[1] + 1e-9) return key; }
  return null;
}

/* ---------- 1. LINHA DE BASE ---------- */
(function () {
  var r = dose({});
  ok(dentroBounds(r) === null, 'base: todas as saídas em faixa');
  ok(r.alavanca in ALA_OK, 'base: alavanca é enum válido (' + r.alavanca + ')');
  // Kt/V plausível 0,5–2,0 numa sessão padrão (4 h, Qb 300, high-flux moderado)
  ok(r.spKtV > 0.5 && r.spKtV < 2.0, 'base: Kt/V plausível (' + r.spKtV.toFixed(3) + ')');
  ok(r.URR > 40 && r.URR < 90, 'base: URR plausível (' + r.URR.toFixed(1) + '%)');
  ok(r.R > 0 && r.R <= 1, 'base: R ∈ (0,1]');
  ok(r.V > 30 && r.V < 50, 'base: V ≈ 0,58·70 kg (' + r.V.toFixed(1) + ' L)');
  ok(r.adequado === true, 'base: sessão padrão adequada (Kt/V≥1,2 e URR≥65)');
})();

/* ---------- 2. IDENTIDADES ---------- */
(function () {
  for (var i = 0; i < 40; i++) {
    var R = 0.05 + i * 0.022;
    // URR = (1-R)·100 (exata, antes do clamp superior; testar R não-extremo)
    if (R > 0.05 && R < 0.95) {
      ok(near(urr(R), (1 - R) * 100, 1e-9), 'id: URR = (1−R)·100');
    }
  }
  // R = ureia_pós/ureia_pré, dentro da função-mãe
  var rd = dose({ ureiaPre: 200, t: 4 });
  ok(near(rd.R, rd.ureiaPos / rd.ureiaPre, 1e-6), 'id: R = ureiaPos / ureiaPre');
  // URR e spKtV derivam do MESMO R → URR e Kt/V andam juntos
  ok(near(rd.URR, urr(rd.R), 1e-9), 'id: URR da função-mãe = urr(R)');
  ok(near(rd.spKtV, ktv({ R: rd.R, t: rd.t, uf: rd.uf, peso: rd.peso }), 1e-9), 'id: spKtV = ktv(R,t,uf,peso)');
  // V = peso·fração
  ok(near(volumeUreia(70, 'M'), 70 * 0.58, 1e-9), 'id: V(homem) = peso·0,58');
  ok(near(volumeUreia(70, 'F'), 70 * 0.50, 1e-9), 'id: V(mulher) = peso·0,50');
  // ktvSemanal = spKtV·3
  ok(near(rd.ktvSemanal, rd.spKtV * 3, 1e-9), 'id: ktvSemanal = spKtV·3');
  // R∈(0,1] em todo i
  for (var j = 0; j < 50; j++) {
    var r2 = dose({ t: 0.5 + j * 0.15, qb: 100 + j * 8 });
    ok(r2.R > 0 && r2.R <= 1, 'id: R ∈ (0,1] sempre');
    ok(near(r2.URR, urr(r2.R), 1e-9), 'id: URR≡urr(R) sempre');
  }
})();

/* ---------- 3. LEIS (monotonia direcional pontual) ---------- */
(function () {
  // ↑tempo → ↑Kt/V
  ok(dose({ t: 5 }).spKtV > dose({ t: 2 }).spKtV, 'lei: ↑tempo → ↑Kt/V');
  ok(dose({ t: 5 }).URR > dose({ t: 2 }).URR, 'lei: ↑tempo → ↑URR');
  // ↑Qb → ↑K → ↑Kt/V
  ok(dose({ qb: 400 }).K > dose({ qb: 200 }).K, 'lei: ↑Qb → ↑K (clearance)');
  ok(dose({ qb: 400 }).spKtV > dose({ qb: 200 }).spKtV, 'lei: ↑Qb → ↑Kt/V');
  // ↑Qd → ↑K
  ok(dose({ qd: 800 }).K > dose({ qd: 350 }).K, 'lei: ↑Qd → ↑K');
  // high-flux (↑KoA) → ↑K
  ok(dose({ koa: 1200 }).K > dose({ koa: 400 }).K, 'lei: ↑KoA (high-flux) → ↑K');
  // ↑V (peso) → ↓Kt/V (mesmo K·t, V maior dilui a dose)
  ok(dose({ peso: 120, k: 200 }).spKtV < dose({ peso: 50, k: 200 }).spKtV, 'lei: ↑peso (↑V) → ↓Kt/V');
  // ↑UF → ↑Kt/V (termo convectivo de Daugirdas)
  ok(dose({ uf: 4, k: 200, t: 4 }).spKtV > dose({ uf: 0, k: 200, t: 4 }).spKtV, 'lei: ↑UF → ↑Kt/V (convecção)');
  // ↑ureiaPre não muda R/Kt/V (R é razão), só a ureia pós absoluta
  ok(near(dose({ ureiaPre: 300, t: 4, k: 200 }).spKtV, dose({ ureiaPre: 100, t: 4, k: 200 }).spKtV, 1e-9), 'lei: Kt/V independe da ureia pré (é razão)');
  ok(dose({ ureiaPre: 300, t: 4, k: 200 }).ureiaPos > dose({ ureiaPre: 100, t: 4, k: 200 }).ureiaPos, 'lei: ↑ureiaPre → ↑ureiaPos absoluta');
})();

/* ---------- 4. PÉROLAS ---------- */
(function () {
  // PÉROLA 1: URR e Kt/V andam JUNTOS (correlação positiva) — varrendo t
  var prevK = null, prevU = null, juntos = true;
  for (var i = 0; i <= 30; i++) {
    var r = dose({ t: 0.5 + i * 0.2 });
    if (prevK !== null) { if ((r.spKtV - prevK) * (r.URR - prevU) < -1e-9) juntos = false; }
    prevK = r.spKtV; prevU = r.URR;
  }
  ok(juntos, 'pérola: URR e Kt/V andam juntos (mesma direção em t)');

  // PÉROLA 2: dobrar Qb NÃO dobra Kt/V (saturação do clearance pelo KoA)
  var lo = dose({ qb: 150, t: 4, koa: 600, qd: 400 });
  var hi = dose({ qb: 300, t: 4, koa: 600, qd: 400 });
  ok(hi.spKtV > lo.spKtV, 'pérola: ↑Qb sobe Kt/V (sentido certo)');
  ok(hi.spKtV < 2 * lo.spKtV, 'pérola: dobrar Qb NÃO dobra Kt/V (saturação do clearance)');
  // e o clearance bruto também satura
  var Klo = clearanceK({ qb: 150, qd: 400, koa: 600 }), Khi = clearanceK({ qb: 300, qd: 400, koa: 600 });
  ok(Khi < 2 * Klo, 'pérola: dobrar Qb não dobra K (KoA satura)');

  // PÉROLA 3: a 1ª sessão muito urêmica NÃO busca Kt/V alto (alvo rebaixado, gentil)
  var ur = dose({ ureiaPre: 320, t: 2, primeiraUremica: true });
  ok(ur.alvoEfetivo < KTV_ALVO, 'pérola: 1ª sessão urêmica → alvo rebaixado (não busca Kt/V alto)');
  ok(ur.gentilOk, 'pérola: a prescrição gentil (Kt/V baixo) é o adequado na 1ª sessão urêmica');
  ok(ur.alavanca === 'manter', 'pérola: na 1ª sessão urêmica a conduta é MANTER gentil, não intensificar');

  // PÉROLA 4: paciente subdose → a alavanca sugerida é coerente (clearance saturado → tempo)
  var sub = dose({ t: 3, qb: 450, koa: 500, qd: 800, peso: 100 });   // K já saturado
  ok(!sub.adequado, 'pérola: cenário de subdose detectado');
  ok(sub.alavanca === 'tempo' || sub.alavanca === 'dialisador', 'pérola: clearance saturado → mover tempo/dialisador, não Qb');
  // com folga em Qb, a alavanca é Qb
  var subQb = dose({ t: 3, qb: 200, koa: 1000, qd: 700, peso: 95 });
  ok(!subQb.adequado && subQb.alavanca === 'qb', 'pérola: folga em Qb → ↑Qb é a alavanca eficiente');

  // PÉROLA 5: sessão curta demais → subdose (o "custo do intermitente": tempo importa)
  var curta = dose({ t: 1.5, qb: 300 });
  ok(curta.spKtV < KTV_ALVO, 'pérola: sessão curta → subdose (tempo importa, M22)');
})();

/* ---------- 5. DETERMINISMO 5× byte-idêntico ---------- */
(function () {
  var inp = { peso: 82, sexo: 'F', ureiaPre: 220, t: 3.5, uf: 3, qb: 350, qd: 600, koa: 1000 };
  var ref = JSON.stringify(dose(inp));
  var igual = true;
  for (var n = 0; n < 5; n++) { if (JSON.stringify(dose(inp)) !== ref) igual = false; }
  ok(igual, 'determinismo: 5 execuções byte-idênticas');
  var Lref = JSON.stringify(ktvLayout(inp, 900, 360));
  var igualL = true;
  for (var m = 0; m < 5; m++) { if (JSON.stringify(ktvLayout(inp, 900, 360)) !== Lref) igualL = false; }
  ok(igualL, 'determinismo: layout 5× byte-idêntico');
  var frozen = Object.freeze({ peso: 90, t: 4, qb: 300 });
  var threw = false, a; try { a = dose(frozen); } catch (e) { threw = true; }
  ok(!threw && fin(a.spKtV), 'determinismo: Object.freeze não lança');
  ok(frozen.peso === 90, 'determinismo: entrada não mutada');
})();

/* ---------- 6. ROBUSTEZ (lixo pontual) ---------- */
(function () {
  var maus = [undefined, null, {}, { t: NaN }, { qb: 'x' }, { peso: -10 }, { ureiaPre: 1e9 },
    { uf: Infinity }, { koa: -5 }, { qd: 'z' }, { k: NaN }, { t: 1e300 },
    { sexo: 123 }, [], function () {}, { primeiraUremica: 'a' }];
  maus.forEach(function (mm, i) {
    var r = dose(mm);
    ok(dentroBounds(r) === null, 'robustez[' + i + ']: saídas finitas e em faixa');
    ok(r.alavanca in ALA_OK, 'robustez[' + i + ']: alavanca válida');
    ok(r.R > 0 && r.R <= 1, 'robustez[' + i + ']: R ∈ (0,1]');
  });
})();

/* ---------- 7. LIMITES por campo ---------- */
(function () {
  var fields = ['peso', 'ureiaPre', 't', 'uf', 'qb', 'qd', 'koa', 'k'];
  var extremos = [-1e9, -1e3, -1, 0, 1, 50, 1e3, 1e9, NaN, Infinity, -Infinity];
  fields.forEach(function (f) {
    extremos.forEach(function (v) {
      var inp = {}; inp[f] = v; var r = dose(inp);
      ok(dentroBounds(r) === null, 'limites: campo ' + f + '=' + v + ' → saídas em faixa');
      ok(r.alavanca in ALA_OK, 'limites: campo ' + f + '=' + v + ' → alavanca válida');
    });
  });
})();

/* ---------- 8. MONOTONIA EXAUSTIVA (≥60 passos por eixo, cada par adjacente) ---------- */
(function () {
  var STEPS = 70;
  function monoUp(fn, lo, hi, label, tol) {
    tol = tol || 1e-9;
    var prev = null, monoOk = true, viol = 0;
    for (var i = 0; i <= STEPS; i++) {
      var x = lo + (hi - lo) * i / STEPS;
      var y = fn(x);
      if (prev !== null) { if (y - prev < -tol) { monoOk = false; viol++; } micros(1); }
      prev = y;
    }
    ok(monoOk, label + ' (' + viol + ' violações)');
  }
  // tempo↑ → Kt/V↑
  monoUp(function (t) { return dose({ t: t }).spKtV; }, 0.5, 8, 'monotonia: tempo↑ → Kt/V↑');
  // tempo↑ → URR↑
  monoUp(function (t) { return dose({ t: t }).URR; }, 0.5, 8, 'monotonia: tempo↑ → URR↑');
  // Qb↑ → K↑
  monoUp(function (q) { return dose({ qb: q }).K; }, 100, 500, 'monotonia: Qb↑ → K↑');
  // Qb↑ → Kt/V↑
  monoUp(function (q) { return dose({ qb: q }).spKtV; }, 100, 500, 'monotonia: Qb↑ → Kt/V↑');
  // Qd↑ → K↑
  monoUp(function (q) { return dose({ qd: q }).K; }, 300, 900, 'monotonia: Qd↑ → K↑');
  // KoA↑ → K↑
  monoUp(function (k) { return dose({ koa: k }).K; }, 300, 1200, 'monotonia: KoA↑ → K↑');
  // peso↑ → V↑ (não-decrescente)
  monoUp(function (p) { return dose({ peso: p }).V; }, 25, 200, 'monotonia: peso↑ → V↑');
  // peso↑ → Kt/V↓ (K direto fixo) → testar como decrescente: monoUp do NEGATIVO
  monoUp(function (p) { return -dose({ peso: p, k: 200 }).spKtV; }, 25, 200, 'monotonia: peso↑ → Kt/V↓ (V dilui)');
  // UF↑ → Kt/V↑ (convecção)
  monoUp(function (u) { return dose({ uf: u, k: 200, t: 4 }).spKtV; }, 0, 8, 'monotonia: UF↑ → Kt/V↑');
})();

/* ---------- 9. FUZZING semeado ≥20000 (~35% malignas em CADA campo) ---------- */
(function () {
  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  var rnd = mulberry32(0x25C0DE), N = 22000, bad = 0, badL = 0, badAla = 0, badMut = 0, badId = 0;
  var MAL = [NaN, Infinity, -Infinity, 1e300, -1e300, 1e-300, '5', 'x', '', null, undefined, {}, [], function () {}, true, false];
  function val() { if (rnd() < 0.35) return MAL[(rnd() * MAL.length) | 0]; return (rnd() - 0.2) * 600; }
  function fields() {
    return {
      peso: val(), ureiaPre: val(), t: val(), uf: val(), qb: val(), qd: val(), koa: val(), k: val(),
      sexo: rnd() < 0.5 ? 'F' : 'M', primeiraUremica: rnd() < 0.5
    };
  }
  function ser(o) { return JSON.stringify(o, function (key, v) { return (typeof v === 'function') ? '__fn__' : (v === undefined ? '__u__' : v); }); }
  for (var i = 0; i < N; i++) {
    var inp = fields();
    var snapshot = ser(inp);
    var r = dose(inp);
    var L = ktvLayout(inp, 900, 360);
    // (a)+(b) saídas finitas e em faixa documentada
    if (dentroBounds(r) !== null) bad++;
    // (c) alavanca sempre válida
    if (!(r.alavanca in ALA_OK)) badAla++;
    // (d) identidades: URR=urr(R); R∈(0,1]; ktvSemanal=spKtV·3
    if (Math.abs(r.URR - urr(r.R)) > 1e-7) badId++;
    if (!(r.R > 0 && r.R <= 1 + 1e-12)) badId++;
    if (Math.abs(r.ktvSemanal - Math.min(r.spKtV * 3, 10)) > 1e-7) badId++;
    // layout finito e correto
    if (!Array.isArray(L.pts) || L.pts.length !== 61 || !fin(L.current.x) || !fin(L.current.y) || !fin(L.yAlvo)) badL++;
    else { for (var j = 0; j < L.pts.length; j++) { if (!fin(L.pts[j].x) || !fin(L.pts[j].y) || !fin(L.pts[j].ktv)) { badL++; break; } } }
    // (e) input não mutado
    if (ser(inp) !== snapshot) badMut++;
    micros(7 + L.pts.length);
  }
  var threwFrozen = false; try { dose(Object.freeze({ peso: 200, t: 8, qb: 500, koa: 1200 })); } catch (e) { threwFrozen = true; }
  ok(bad === 0, 'fuzzing: ' + N + ' entradas (~35% malignas) → 0 violações de faixa (' + bad + ')');
  ok(badAla === 0, 'fuzzing: alavanca sempre válida (' + badAla + ')');
  ok(badId === 0, 'fuzzing: identidades intactas (URR≡urr(R), R∈(0,1], semanal=3×) (' + badId + ')');
  ok(badL === 0, 'fuzzing: layout finito em todas (' + badL + ')');
  ok(badMut === 0, 'fuzzing: input nunca mutado (' + badMut + ')');
  ok(!threwFrozen, 'fuzzing: Object.freeze não lança');
})();

/* ---------- 10. SAÍDA ---------- */
var total = oks + micro;
console.log(total + ' OK (' + oks + ' macro + ' + micro + ' micro/fuzz) · ' + fails + ' falhas');
process.exit(fails > 0 ? 1 : 0);
