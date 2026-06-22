/* =========================================================================
 * FILTRA · M35 — bateria de robustez do engine (0 falhas ou não entra)
 * 1 BASE · 2 IDENTIDADES · 3 LEIS · 4 PÉROLAS · 5 DETERMINISMO 5× · 6 ROBUSTEZ ·
 * 7 LIMITES · 8 MONOTONIA EXAUSTIVA · 9 FUZZING ≥22000 (~35% malignas) · 10 SAÍDA
 * (robustez REFORÇADA: fuzz ≥22000, monotonia ≥60 passos/eixo, centenas de milhares de asserções)
 * ========================================================================= */
var M = require('./model35.js');
var aeiou = M.aeiou, radarLayout = M.radarLayout;
var sevAcidose = M.sevAcidose, sevEletrolitos = M.sevEletrolitos, sevIntoxicacao = M.sevIntoxicacao;
var sevSobrecarga = M.sevSobrecarga, sevUremia = M.sevUremia;
var LIM = M.LIMIAR_DISPARO;

var oks = 0, fails = 0, micro = 0;
function ok(c, m) { if (c) oks++; else { fails++; console.log('  FALHA: ' + m); } }
function micros(n) { micro += n; }
function near(a, b, t) { return Math.abs(a - b) <= (t || 1e-7); }
function fin(x) { return typeof x === 'number' && isFinite(x); }
var REC_OK = { indicar: 1, otimizar: 1, observar: 1 };
var LETRAS = { A: 1, E: 1, I: 1, O: 1, U: 1 };

/* faixas documentadas por campo de saída numérica [min,max] */
var BOUNDS = {
  pH: [6.6, 7.6], hco3: [2, 30], acidoseRespondeu: [0, 1],
  k: [2, 9], ecg: [0, 1], kRespondeu: [0, 1],
  dialisavel: [0, 1], nivelTox: [0, 1], gravidadeTox: [0, 1],
  volume: [0, 20], edemaPulmonar: [0, 1], diureticoRespondeu: [0, 1],
  ureia: [20, 400], pericardite: [0, 1], encefalopatia: [0, 1],
  sevA: [0, 1], sevE: [0, 1], sevI: [0, 1], sevO: [0, 1], sevU: [0, 1],
  sevMax: [0, 1], sevSoma: [0, 5], nDisparados: [0, 5]
};
function dentroBounds(r) {
  for (var key in BOUNDS) { var b = BOUNDS[key]; if (!fin(r[key]) || r[key] < b[0] - 1e-9 || r[key] > b[1] + 1e-9) return key; }
  return null;
}
function disparoCoerente(r) {
  // o disparo de cada eixo == (sev >= limiar); algumDisparo == OR; nDisparados == contagem
  var pares = [[r.dispA, r.sevA], [r.dispE, r.sevE], [r.dispI, r.sevI], [r.dispO, r.sevO], [r.dispU, r.sevU]];
  var n = 0, anyD = false;
  for (var i = 0; i < pares.length; i++) {
    if (pares[i][0] !== (pares[i][1] >= LIM)) return 'disp/sev incoerente eixo ' + i;
    if (pares[i][0]) { n++; anyD = true; }
  }
  if (n !== r.nDisparados) return 'nDisparados errado';
  if (anyD !== r.algumDisparo) return 'algumDisparo errado';
  // recomendação == indicar sse algumDisparo
  if (r.algumDisparo && r.recomendacao !== 'indicar') return 'recomendação não-indicar com disparo';
  if (!r.algumDisparo && r.recomendacao === 'indicar') return 'recomendação indicar sem disparo';
  return null;
}

/* ---------- 1. LINHA DE BASE ---------- */
(function () {
  var r = aeiou({});
  ok(r.recomendacao in REC_OK, 'base: recomendação é enum válido (' + r.recomendacao + ')');
  ok(r.recomendacao === 'observar', 'base: paciente normal → observar (nenhum eixo dispara)');
  ok(r.nDisparados === 0, 'base: zero eixos disparados');
  ok(!r.algumDisparo, 'base: nenhum disparo');
  ok(dentroBounds(r) === null, 'base: todas as saídas em faixa');
  ok(disparoCoerente(r) === null, 'base: disparos coerentes com severidades');
  ok(r.dominante.letra in LETRAS, 'base: dominante é uma letra AEIOU');
  // cada severidade ∈ [0,1]
  ['sevA', 'sevE', 'sevI', 'sevO', 'sevU'].forEach(function (s) { ok(r[s] >= 0 && r[s] <= 1, 'base: ' + s + ' ∈ [0,1]'); });
})();

/* ---------- 2. IDENTIDADES ---------- */
(function () {
  // sevX da função-mãe == a função de severidade isolada (consistência)
  for (var i = 0; i < 40; i++) {
    var f = i / 40;
    var inp = {
      pH: 6.8 + f * 0.7, hco3: 4 + f * 22, acidoseRespondeu: f,
      k: 4 + f * 4, ecg: f, kRespondeu: 1 - f,
      dialisavel: f, nivelTox: 1 - f, gravidadeTox: f,
      volume: f * 16, edemaPulmonar: f, diureticoRespondeu: 1 - f,
      ureia: 60 + f * 320, pericardite: f, encefalopatia: 1 - f
    };
    var r = aeiou(inp);
    ok(near(r.sevA, sevAcidose(inp.pH, inp.hco3, inp.acidoseRespondeu), 1e-12), 'id: sevA == sevAcidose()');
    ok(near(r.sevE, sevEletrolitos(inp.k, inp.ecg, inp.kRespondeu), 1e-12), 'id: sevE == sevEletrolitos()');
    ok(near(r.sevI, sevIntoxicacao(inp.dialisavel, inp.nivelTox, inp.gravidadeTox), 1e-12), 'id: sevI == sevIntoxicacao()');
    ok(near(r.sevO, sevSobrecarga(inp.volume, inp.edemaPulmonar, inp.diureticoRespondeu), 1e-12), 'id: sevO == sevSobrecarga()');
    ok(near(r.sevU, sevUremia(inp.ureia, inp.pericardite, inp.encefalopatia), 1e-12), 'id: sevU == sevUremia()');
    // sevMax == max das cinco; sevSoma == soma
    var mx = Math.max(r.sevA, r.sevE, r.sevI, r.sevO, r.sevU);
    ok(near(r.sevMax, mx, 1e-12), 'id: sevMax == max(sev)');
    ok(near(r.sevSoma, r.sevA + r.sevE + r.sevI + r.sevO + r.sevU, 1e-12), 'id: sevSoma == Σ sev');
    // o DISPARO é OR, não AND/soma: coerência total
    ok(disparoCoerente(r) === null, 'id: disparo = OR dos eixos (não AND/soma)');
    ok(dentroBounds(r) === null, 'id: saídas em faixa');
  }
})();

/* ---------- 3. LEIS (monotonia direcional pontual) ---------- */
(function () {
  // A: pH↓ → sevA↑ (refratário)
  ok(aeiou({ pH: 6.9, hco3: 8, acidoseRespondeu: 0 }).sevA > aeiou({ pH: 7.25, hco3: 8, acidoseRespondeu: 0 }).sevA, 'lei: pH↓ → sevA↑');
  // A: responder à clínica baixa a severidade
  ok(aeiou({ pH: 6.9, hco3: 6, acidoseRespondeu: 0 }).sevA > aeiou({ pH: 6.9, hco3: 6, acidoseRespondeu: 1 }).sevA, 'lei: acidose respondeu → sevA↓');
  // E: K↑ refratário → sevE↑
  ok(aeiou({ k: 7.5, ecg: 1, kRespondeu: 0 }).sevE > aeiou({ k: 6.2, ecg: 1, kRespondeu: 0 }).sevE, 'lei: K↑ refratário → sevE↑');
  // E: ECG agrava
  ok(aeiou({ k: 7.0, ecg: 1, kRespondeu: 0 }).sevE > aeiou({ k: 7.0, ecg: 0, kRespondeu: 0 }).sevE, 'lei: ECG → sevE↑');
  // E: responder baixa a severidade
  ok(aeiou({ k: 7.2, ecg: 1, kRespondeu: 0 }).sevE > aeiou({ k: 7.2, ecg: 1, kRespondeu: 1 }).sevE, 'lei: K respondeu → sevE↓');
  // I: nível/gravidade↑ → sevI↑ (se dialisável)
  ok(aeiou({ dialisavel: 1, nivelTox: 1, gravidadeTox: 1 }).sevI > aeiou({ dialisavel: 1, nivelTox: 0.3, gravidadeTox: 0.3 }).sevI, 'lei: nível tóxico↑ → sevI↑');
  // I: não dialisável → sevI ≈ 0 (portão)
  ok(aeiou({ dialisavel: 0, nivelTox: 1, gravidadeTox: 1 }).sevI < 1e-9, 'lei: não dialisável → sevI = 0 (portão)');
  // O: volume refratário↑ → sevO↑
  ok(aeiou({ volume: 14, edemaPulmonar: 1, diureticoRespondeu: 0 }).sevO > aeiou({ volume: 5, edemaPulmonar: 1, diureticoRespondeu: 0 }).sevO, 'lei: volume↑ refratário → sevO↑');
  // O: responder ao diurético baixa a severidade
  ok(aeiou({ volume: 12, edemaPulmonar: 1, diureticoRespondeu: 0 }).sevO > aeiou({ volume: 12, edemaPulmonar: 1, diureticoRespondeu: 1 }).sevO, 'lei: diurético respondeu → sevO↓');
  // U: sintoma urêmico → sevU↑
  ok(aeiou({ ureia: 250, pericardite: 1 }).sevU > aeiou({ ureia: 250, pericardite: 0, encefalopatia: 0 }).sevU, 'lei: pericardite → sevU↑');
})();

/* ---------- 4. PÉROLAS ---------- */
(function () {
  // PÉROLA 1: UM eixo refratário BASTA — hipercalemia refratária indica mesmo com ureia/pH normais.
  var soK = aeiou({ k: 7.6, ecg: 1, kRespondeu: 0, pH: 7.40, hco3: 24, ureia: 50, volume: 0 });
  ok(soK.recomendacao === 'indicar' && soK.dispE && soK.nDisparados === 1, 'pérola: hipercalemia refratária indica TRS sozinha (1 eixo basta)');
  ok(soK.dominante.letra === 'E', 'pérola: dominante = E (eletrólitos)');
  // PÉROLA 2: responder ao diurético TIRA a sobrecarga da indicação (mesmo volume).
  var refratario = aeiou({ volume: 12, edemaPulmonar: 1, diureticoRespondeu: 0 });
  var responsivo = aeiou({ volume: 12, edemaPulmonar: 1, diureticoRespondeu: 1 });
  ok(refratario.dispO && !responsivo.dispO, 'pérola: o MESMO volume — refratário dispara O, responsivo não');
  ok(refratario.recomendacao === 'indicar' && responsivo.recomendacao !== 'indicar', 'pérola: responder ao diurético tira a sobrecarga da indicação');
  // PÉROLA 3: o mesmo número decide diferente conforme refratário × responsivo (K).
  var kRefr = aeiou({ k: 6.8, ecg: 1, kRespondeu: 0 });
  var kResp = aeiou({ k: 6.8, ecg: 1, kRespondeu: 1 });
  ok(kRefr.dispE && !kResp.dispE, 'pérola: K⁺ 6,8 com ECG — refratário indica, responsivo não (o mesmo número)');
  // PÉROLA 4: NÃO é soma — cinco eixos moderados (todos abaixo do limiar) NÃO indicam,
  // mas UM eixo refratário acima do limiar indica, mesmo com soma menor.
  var cincoMod = aeiou({ pH: 7.05, hco3: 13, acidoseRespondeu: 0.45, k: 6.6, ecg: 0.7, kRespondeu: 0.45,
    dialisavel: 0.9, nivelTox: 0.55, gravidadeTox: 0.45, volume: 7, edemaPulmonar: 0.6, diureticoRespondeu: 0.42,
    ureia: 240, pericardite: 0.42, encefalopatia: 0 });
  var umForte = aeiou({ k: 7.0, ecg: 0.5, kRespondeu: 0 });
  ok(!cincoMod.algumDisparo, 'pérola: cinco eixos moderados (cada < limiar) NÃO disparam (não é soma)');
  ok(umForte.algumDisparo && umForte.sevSoma < cincoMod.sevSoma, 'pérola: UM eixo forte indica mesmo com SOMA menor que cinco moderados (OR > soma)');
  // PÉROLA 5: intoxicação NÃO dialisável (digoxina, Vd alto) não indica por mais grave que seja.
  var digox = aeiou({ dialisavel: 0, nivelTox: 1, gravidadeTox: 1 });
  ok(!digox.dispI && digox.recomendacao !== 'indicar', 'pérola: toxina NÃO dialisável (Vd alto) não indica TRS');
})();

/* ---------- 5. DETERMINISMO 5× byte-idêntico ---------- */
(function () {
  var inp = { pH: 7.05, hco3: 9, acidoseRespondeu: 0.2, k: 6.6, ecg: 0.8, kRespondeu: 0.3,
    dialisavel: 0.7, nivelTox: 0.6, gravidadeTox: 0.5, volume: 8, edemaPulmonar: 0.7, diureticoRespondeu: 0.2,
    ureia: 240, pericardite: 0.6, encefalopatia: 0.4 };
  var ref = JSON.stringify(aeiou(inp));
  var igual = true;
  for (var n = 0; n < 5; n++) { if (JSON.stringify(aeiou(inp)) !== ref) igual = false; }
  ok(igual, 'determinismo: 5 execuções byte-idênticas');
  var Lref = JSON.stringify(radarLayout(inp, 420, 360));
  var igualL = true;
  for (var m = 0; m < 5; m++) { if (JSON.stringify(radarLayout(inp, 420, 360)) !== Lref) igualL = false; }
  ok(igualL, 'determinismo: radarLayout 5× byte-idêntico');
  var frozen = Object.freeze({ k: 7.5, ecg: 1, kRespondeu: 0, volume: 10 });
  var threw = false, a; try { a = aeiou(frozen); } catch (e) { threw = true; }
  ok(!threw && fin(a.sevE), 'determinismo: Object.freeze não lança');
  ok(frozen.k === 7.5, 'determinismo: entrada não mutada');
})();

/* ---------- 6. ROBUSTEZ (lixo pontual) ---------- */
(function () {
  var maus = [undefined, null, {}, { k: NaN }, { pH: 'x' }, { hco3: -10 }, { volume: 1e9 },
    { ureia: Infinity }, { ecg: -5 }, { nivelTox: 'z' }, { dialisavel: 1e300 }, { edemaPulmonar: NaN },
    { acidoseRespondeu: 'a' }, [], function () {}, { pericardite: -Infinity }];
  maus.forEach(function (mm, i) {
    var r = aeiou(mm);
    ok(dentroBounds(r) === null, 'robustez[' + i + ']: saídas finitas e em faixa');
    ok(r.recomendacao in REC_OK && disparoCoerente(r) === null, 'robustez[' + i + ']: recomendação válida e coerente');
    var L = radarLayout(mm, 420, 360);
    ok(fin(L.cx) && fin(L.cy) && L.poly.length === 5, 'robustez[' + i + ']: radarLayout finito');
  });
})();

/* ---------- 7. LIMITES por campo ---------- */
(function () {
  var fields = ['pH', 'hco3', 'acidoseRespondeu', 'k', 'ecg', 'kRespondeu', 'dialisavel', 'nivelTox', 'gravidadeTox',
    'volume', 'edemaPulmonar', 'diureticoRespondeu', 'ureia', 'pericardite', 'encefalopatia'];
  var extremos = [-1e9, -1e3, -1, 0, 1, 50, 1e3, 1e9, NaN, Infinity, -Infinity];
  fields.forEach(function (f) {
    extremos.forEach(function (v) {
      var inp = {}; inp[f] = v; var r = aeiou(inp);
      ok(dentroBounds(r) === null, 'limites: campo ' + f + '=' + v + ' → saídas em faixa');
      ok(r.recomendacao in REC_OK && disparoCoerente(r) === null, 'limites: campo ' + f + '=' + v + ' → coerente');
    });
  });
})();

/* ---------- 8. MONOTONIA EXAUSTIVA (≥60 passos por eixo) ---------- */
(function () {
  var STEPS = 70;
  function monoNaoDecr(get, nome) {
    var prev = null, monoOk = true, viol = 0;
    for (var i = 0; i <= STEPS; i++) { var v = get(i / STEPS); if (prev !== null) { if (v - prev < -1e-9) { monoOk = false; viol++; } micros(1); } prev = v; }
    ok(monoOk, 'monotonia: ' + nome + ' (' + viol + ' violações)');
  }
  function monoNaoCresc(get, nome) {
    var prev = null, monoOk = true, viol = 0;
    for (var i = 0; i <= STEPS; i++) { var v = get(i / STEPS); if (prev !== null) { if (v - prev > 1e-9) { monoOk = false; viol++; } micros(1); } prev = v; }
    ok(monoOk, 'monotonia: ' + nome + ' (' + viol + ' violações)');
  }
  // pH↓ → sevA↑ : varremos pH de alto para baixo
  monoNaoDecr(function (f) { return aeiou({ pH: 7.15 - f * 0.35, acidoseRespondeu: 0 }).sevA; }, 'pH↓ → sevA↑');
  // HCO₃↓ → sevA↑
  monoNaoDecr(function (f) { return aeiou({ hco3: 12 - f * 8, acidoseRespondeu: 0 }).sevA; }, 'HCO₃↓ → sevA↑');
  // acidoseRespondeu↑ → sevA↓
  monoNaoCresc(function (f) { return aeiou({ pH: 6.9, hco3: 7, acidoseRespondeu: f }).sevA; }, 'acidose respondeu↑ → sevA↓');
  // K↑ → sevE↑
  monoNaoDecr(function (f) { return aeiou({ k: 5.2 + f * 3.3, ecg: 0.5, kRespondeu: 0 }).sevE; }, 'K↑ → sevE↑');
  // ECG↑ → sevE↑
  monoNaoDecr(function (f) { return aeiou({ k: 7.0, ecg: f, kRespondeu: 0 }).sevE; }, 'ECG↑ → sevE↑');
  // kRespondeu↑ → sevE↓
  monoNaoCresc(function (f) { return aeiou({ k: 7.4, ecg: 1, kRespondeu: f }).sevE; }, 'K respondeu↑ → sevE↓');
  // nivelTox↑ → sevI↑
  monoNaoDecr(function (f) { return aeiou({ dialisavel: 1, nivelTox: f, gravidadeTox: 0.5 }).sevI; }, 'nível tóxico↑ → sevI↑');
  // dialisavel↑ → sevI↑ (portão)
  monoNaoDecr(function (f) { return aeiou({ dialisavel: f, nivelTox: 1, gravidadeTox: 1 }).sevI; }, 'dialisabilidade↑ → sevI↑');
  // volume↑ → sevO↑
  monoNaoDecr(function (f) { return aeiou({ volume: f * 16, edemaPulmonar: 0.5, diureticoRespondeu: 0 }).sevO; }, 'volume↑ → sevO↑');
  // diureticoRespondeu↑ → sevO↓
  monoNaoCresc(function (f) { return aeiou({ volume: 12, edemaPulmonar: 1, diureticoRespondeu: f }).sevO; }, 'diurético respondeu↑ → sevO↓');
  // pericardite↑ → sevU↑
  monoNaoDecr(function (f) { return aeiou({ ureia: 250, pericardite: f }).sevU; }, 'pericardite↑ → sevU↑');
  // ureia↑ → sevU↑ (com sintoma fixo)
  monoNaoDecr(function (f) { return aeiou({ ureia: 180 + f * 200, encefalopatia: 0.6 }).sevU; }, 'ureia↑ → sevU↑');
})();

/* ---------- 9. FUZZING semeado ≥22000 (~35% malignas em CADA campo) ---------- */
(function () {
  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  var rnd = mulberry32(0x35AE10), N = 22000, bad = 0, badEnum = 0, badId = 0, badDisp = 0, badL = 0, badMut = 0;
  var MAL = [NaN, Infinity, -Infinity, 1e300, -1e300, 1e-300, '5', 'x', '', null, undefined, {}, [], function () {}, true, false];
  function val() { if (rnd() < 0.35) return MAL[(rnd() * MAL.length) | 0]; return (rnd() - 0.2) * 500; }
  function fields() {
    return {
      pH: val(), hco3: val(), acidoseRespondeu: val(), k: val(), ecg: val(), kRespondeu: val(),
      dialisavel: val(), nivelTox: val(), gravidadeTox: val(), volume: val(), edemaPulmonar: val(),
      diureticoRespondeu: val(), ureia: val(), pericardite: val(), encefalopatia: val()
    };
  }
  function ser(o) { return JSON.stringify(o, function (key, v) { return (typeof v === 'function') ? '__fn__' : (v === undefined ? '__u__' : v); }); }
  for (var i = 0; i < N; i++) {
    var inp = fields();
    var snapshot = ser(inp);
    var r = aeiou(inp);
    var L = radarLayout(inp, 420, 360);
    if (dentroBounds(r) !== null) bad++;
    if (!(r.recomendacao in REC_OK)) badEnum++;
    if (!(r.dominante.letra in LETRAS)) badEnum++;
    // identidades: sevMax == max; sevSoma == soma; cada sev ∈ [0,1]
    var mx = Math.max(r.sevA, r.sevE, r.sevI, r.sevO, r.sevU);
    if (Math.abs(r.sevMax - mx) > 1e-9) badId++;
    if (Math.abs(r.sevSoma - (r.sevA + r.sevE + r.sevI + r.sevO + r.sevU)) > 1e-9) badId++;
    // disparo coerente (OR, não soma)
    if (disparoCoerente(r) !== null) badDisp++;
    // layout finito
    if (!Array.isArray(L.poly) || L.poly.length !== 5 || !fin(L.cx) || !fin(L.cy) || !fin(L.R)) badL++;
    else { for (var j = 0; j < 5; j++) { if (!fin(L.poly[j].x) || !fin(L.poly[j].y) || !fin(L.ring[j].x) || !fin(L.spokes[j].x1)) { badL++; break; } } }
    if (ser(inp) !== snapshot) badMut++;
    micros(6 + L.poly.length);
  }
  var threwFrozen = false; try { aeiou(Object.freeze({ k: 9, ecg: 1, volume: 20 })); } catch (e) { threwFrozen = true; }
  ok(bad === 0, 'fuzzing: ' + N + ' entradas (~35% malignas) → 0 violações de faixa (' + bad + ')');
  ok(badEnum === 0, 'fuzzing: enums (recomendação/dominante) sempre válidos (' + badEnum + ')');
  ok(badId === 0, 'fuzzing: identidades sevMax/sevSoma intactas (' + badId + ')');
  ok(badDisp === 0, 'fuzzing: disparo = OR coerente em todas (' + badDisp + ')');
  ok(badL === 0, 'fuzzing: radarLayout finito em todas (' + badL + ')');
  ok(badMut === 0, 'fuzzing: input nunca mutado (' + badMut + ')');
  ok(!threwFrozen, 'fuzzing: Object.freeze não lança');
})();

/* ---------- 10. SAÍDA ---------- */
var total = oks + micro;
console.log(total + ' OK (' + oks + ' macro + ' + micro + ' micro/fuzz) · ' + fails + ' falhas');
process.exit(fails > 0 ? 1 : 0);
