'use strict';
/*
 * FILTRA · M14 — test14.node.js
 * Bateria de robustez para eixo(): 8 categorias + fuzzing 5000 entradas.
 * Critério: determinístico (3× idêntico), 0 falhas.
 */

var m = require('./model14.js');
var eixo = m.eixo;
var baro = m.baro;
var macula = m.macula;
var feedbackVolume = m.feedbackVolume;
var cascataLayout = m.cascataLayout;
var respostaLayout = m.respostaLayout;
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
  var r = eixo({});  // euvolemia / normotenso
  assert(r.renina > 1.0 && r.renina < 3.0, 'renina basal ~moderada, got ' + r.renina.toFixed(2));
  assert(r.angII > 1.0 && r.angII < 3.0, 'AngII basal, got ' + r.angII.toFixed(2));
  assert(r.aldo > 1.0 && r.aldo < 3.0, 'aldosterona basal, got ' + r.aldo.toFixed(2));
  assert(r.epo > 0.8 && r.epo < 1.3, 'EPO basal ~1 (O₂ e massa renal normais), got ' + r.epo.toFixed(2));
  assert(r.calcitriol > 0.8 && r.calcitriol < 1.3, 'calcitriol basal ~1, got ' + r.calcitriol.toFixed(2));
  assert(r.regime === 'basal', 'regime default basal, got ' + r.regime);

  // hipovolemia ATIVA o eixo
  var h = eixo({ pressure: 65, volume: 65, naMacula: 70, symp: 1.8 });
  assert(h.renina > r.renina * 3, 'hipovolemia: renina↑↑ (>3× basal)');
  assert(h.angII > r.angII * 3, 'hipovolemia: AngII↑↑');
  assert(h.aldo > r.aldo * 3, 'hipovolemia: aldosterona↑↑');
  assert(h.regime === 'hipovolemia', 'hipovolemia: regime hipovolemia, got ' + h.regime);

  // DRC: a glândula falha (EPO↓, calcitriol↓)
  var d = eixo({ GFR: 18, o2: 80 });
  assert(d.epo < r.epo, 'DRC: EPO↓ apesar da hipóxia (a fábrica morreu) = anemia');
  assert(d.calcitriol < 0.5, 'DRC: calcitriol↓ (1α-hidroxilase renal falha)');
  assert(d.regime === 'drc_endocrina', 'DRC: regime drc_endocrina, got ' + d.regime);

  // baro/macula/feedback nos pontos de referência
  assert(Math.abs(baro(C.P_HI) - 0.4) < 1e-9, 'baro satura em 0.4 na HAS (P_HI)');
  assert(Math.abs(macula(C.NA_N) - 1) < 1e-9, 'macula = 1 no Na de referência');
  assert(Math.abs(feedbackVolume(C.VOL_N) - 1) < 1e-9, 'feedbackVolume = 1 no volume de referência');
})();

// ─── 2. IDENTIDADES ───────────────────────────────────────────────────────────
(function() {
  var r = eixo({ pressure: 70, volume: 85, naMacula: 80, symp: 1.4, agt: 1.3, kplus: 5.0 });
  // AngII = renina · angiotensinogênio
  assert(Math.abs(r.angII - r.renina * r.agt) < 1e-7, 'ID: AngII = renina · angiotensinogênio');
  // aldo = AngII · fatorK (quando NÃO há aldo autônoma)
  assert(Math.abs(r.aldo - r.angII * r.fatorK) < 1e-7, 'ID: aldo = AngII · fatorK (sem adenoma)');
  // fatorK = 1 + ALDO_K·(K - KPLUS_N)
  assert(Math.abs(r.fatorK - (1 + C.ALDO_K * (r.kplus - C.KPLUS_N))) < 1e-9, 'ID: fatorK = 1 + ALDO_K·(K−4)');
  // renina = sBaro·sMac·sSymp·fVol·supAuto
  assert(Math.abs(r.renina - r.sBaro * r.sMac * r.sSymp * r.fVol * r.supAuto) < 1e-7, 'ID: renina = produto dos sinais');
  // aldo = aldoRAAS + aldoAuto
  var ra = eixo({ aldoAuto: 7, kplus: 3.2 });
  assert(Math.abs(ra.aldo - (ra.aldoRAAS - 0 + ra.aldoAuto)) < 1e-7, 'ID: aldo = aldoRAAS + aldoAuto');
  assert(Math.abs(ra.aldoRAAS - ra.angII * ra.fatorK) < 1e-7, 'ID: aldoRAAS = AngII·fatorK');
  // ADH = adhOsm + adhVol + adhDrive
  var rd = eixo({ tonicity: 300, volume: 80, adhDrive: 3 });
  assert(Math.abs(rd.adh - (rd.adhOsm + rd.adhVol + rd.adhDrive)) < 1e-7, 'ID: ADH = osm + vol + drive');
  // EPO = hyp · epoMassa
  assert(Math.abs(r.epo - r.hyp * r.epoMassa) < 1e-7, 'ID: EPO = hipóxia · massaRenal');
  // arr = aldo/(renina+eps)
  assert(Math.abs(r.arr - r.aldo / (r.renina + 1e-6)) < 1e-6, 'ID: ARR = aldo/renina');
})();

// ─── 3. LEIS (monotonicidade) ─────────────────────────────────────────────────
(function() {
  // pressão↓ → renina↑
  var p1 = eixo({ pressure: 120 }), p2 = eixo({ pressure: 95 }), p3 = eixo({ pressure: 60 });
  assert(p1.renina < p2.renina && p2.renina < p3.renina, 'LEI: pressão↓ → renina↑ (barorreceptor)');
  // Na na mácula densa↓ → renina↑
  var n1 = eixo({ naMacula: 130 }), n2 = eixo({ naMacula: 100 }), n3 = eixo({ naMacula: 60 });
  assert(n1.renina < n2.renina && n2.renina < n3.renina, 'LEI: Na mácula densa↓ → renina↑ (feedback TG)');
  // simpático↑ → renina↑
  var s1 = eixo({ symp: 0.5 }), s2 = eixo({ symp: 1.0 }), s3 = eixo({ symp: 1.8 });
  assert(s1.renina < s2.renina && s2.renina < s3.renina, 'LEI: simpático↑ → renina↑ (β1)');
  // volume↑ → renina↓ (FEEDBACK)
  var v1 = eixo({ volume: 60 }), v2 = eixo({ volume: 100 }), v3 = eixo({ volume: 140 });
  assert(v1.renina > v2.renina && v2.renina > v3.renina, 'LEI: volume↑ → renina↓ (alça de feedback)');
  // AngII↑ → aldo↑
  var a1 = eixo({ pressure: 110 }), a2 = eixo({ pressure: 70 });
  assert(a2.angII > a1.angII && a2.aldo > a1.aldo, 'LEI: AngII↑ → aldosterona↑');
  // K⁺↑ → aldo↑ (estímulo direto)
  var k1 = eixo({ kplus: 3.0 }), k2 = eixo({ kplus: 6.0 });
  assert(k2.aldo > k1.aldo, 'LEI: hipercalemia → aldosterona↑ (estímulo direto)');
  // O₂↓ → EPO↑
  var o1 = eixo({ o2: 100 }), o2 = eixo({ o2: 70 });
  assert(o2.epo > o1.epo, 'LEI: O₂↓ → EPO↑ (HIF)');
  // tonicidade↑ → ADH↑
  var t1 = eixo({ tonicity: 285 }), t2 = eixo({ tonicity: 310 });
  assert(t2.adh > t1.adh, 'LEI: tonicidade↑ → ADH↑ (osmótico)');
  // volume↓↓ → ADH↑ (não-osmótico, override)
  var w1 = eixo({ volume: 100 }), w2 = eixo({ volume: 70 });
  assert(w2.adhVol > w1.adhVol && w2.adh > w1.adh, 'LEI: volume↓↓ → ADH↑ (não-osmótico)');
  // GFR↓ → calcitriol↓
  var g1 = eixo({ GFR: 100 }), g2 = eixo({ GFR: 20 });
  assert(g2.calcitriol < g1.calcitriol, 'LEI: TFG↓ → calcitriol↓ (massa renal)');
  // aldo autônoma↑ → renina↓ (supressão)
  var au1 = eixo({ aldoAuto: 0 }), au2 = eixo({ aldoAuto: 10 });
  assert(au2.renina < au1.renina && au2.aldo > au1.aldo, 'LEI: aldo autônoma↑ → renina↓, aldo↑ (Conn)');
})();

// ─── 4. PÉROLAS ───────────────────────────────────────────────────────────────
(function() {
  // PÉROLA 1: o rim é GLÂNDULA — três sinais independentes disparam a renina.
  var base = eixo({});
  var soBaro = eixo({ pressure: 60 });
  var soMac  = eixo({ naMacula: 60 });
  var soSymp = eixo({ symp: 2.0 });
  assert(soBaro.renina > base.renina, 'PÉROLA glândula: ↓pressão sozinha já sobe a renina');
  assert(soMac.renina  > base.renina, 'PÉROLA glândula: ↓Na na mácula densa sozinho sobe a renina');
  assert(soSymp.renina > base.renina, 'PÉROLA glândula: simpático sozinho sobe a renina');

  // PÉROLA 2: AngII preserva a TFG pela eferente (ponte M2) — AngII↑ na hipovolemia.
  var hipo = eixo({ pressure: 60, volume: 65, naMacula: 75 });
  assert(hipo.angII > 3 * base.angII, 'PÉROLA eferente (M2): hipovolemia → AngII↑↑ (constringe a eferente, salva a TFG)');

  // PÉROLA 3: EPO CAI na DRC = anemia (a hipóxia não consegue mais resgatar).
  var hipoxiaSadia = eixo({ o2: 70, GFR: 100 });   // hipóxia, rim íntegro → EPO alta
  var hipoxiaDRC   = eixo({ o2: 70, GFR: 15 });     // mesma hipóxia, rim destruído → EPO baixa
  assert(hipoxiaSadia.epo > hipoxiaDRC.epo * 1.5, 'PÉROLA EPO: a DRC mata a fábrica → EPO↓ apesar da hipóxia (anemia)');
  assert(hipoxiaDRC.epo < base.epo, 'PÉROLA EPO: na DRC a EPO fica ABAIXO do basal mesmo com hipóxia');

  // PÉROLA 4: aldosterona troca Na por K/H (ponte M8) — hiperaldo 1º com K BAIXO.
  // No Conn, a aldo autônoma é ALTA, a renina é BAIXA → ARR alto (a assinatura).
  var conn = eixo({ aldoAuto: 8, kplus: 3.0 });
  assert(conn.aldo > 4 && conn.renina < 0.9, 'PÉROLA aldo: hiperaldo 1º → aldo ALTA com renina BAIXA');
  assert(conn.arr > 6, 'PÉROLA aldo: a razão aldo/renina (ARR) é alta no hiperaldo primário');
  assert(conn.regime === 'hiperaldo_primario', 'PÉROLA aldo: regime hiperaldo_primario');
  // contraste: na hipovolemia a aldo também é alta, mas a renina TAMBÉM é alta → ARR normal
  assert(hipo.arr < conn.arr, 'PÉROLA aldo: hipovolemia tem ARR normal (renina sobe junto), Conn tem ARR alto');

  // PÉROLA 5: SIADH = ADH alto SEM estímulo (tonicidade baixa, volume normal).
  var siadh = eixo({ tonicity: 268, volume: 100, adhDrive: 5 });
  assert(siadh.adh > base.adh, 'PÉROLA ADH: SIADH → ADH alto apesar da tonicidade baixa');
  assert(siadh.regime === 'siadh', 'PÉROLA ADH: regime siadh');
})();

// ─── 5. DETERMINISMO ─────────────────────────────────────────────────────────
(function() {
  var inp = { pressure: 72, volume: 80, naMacula: 75, symp: 1.5, kplus: 5.2, o2: 82, GFR: 45, aldoAuto: 2, adhDrive: 1, tonicity: 298 };
  var r1 = eixo(inp), r2 = eixo(inp), r3 = eixo(inp);
  assert(r1.renina === r2.renina && r2.renina === r3.renina, 'Determinismo: renina idêntica em 3 chamadas');
  assert(r1.aldo === r2.aldo && r2.aldo === r3.aldo, 'Determinismo: aldo idêntica');
  assert(r1.regime === r2.regime, 'Determinismo: regime idêntico');
  var frozen = Object.freeze({ pressure: 70, volume: 90, GFR: 50 });
  try { eixo(frozen); assert(true, 'freeze: não lançou'); }
  catch (e) { fail++; console.error('FALHA: freeze lançou: ' + e.message); }
  assert(frozen.pressure === 70, 'freeze: objeto de entrada não mutado');
  // layouts também não devem mutar o estado
  var st = Object.freeze({ volume: 80, pressure: 70 });
  try { cascataLayout(st, 900, 320); respostaLayout(st, 600, 240); assert(true, 'layouts: freeze ok'); }
  catch (e) { fail++; console.error('FALHA: layout freeze lançou: ' + e.message); }
})();

// ─── 6. ROBUSTEZ ─────────────────────────────────────────────────────────────
(function() {
  var cases = [
    {},
    null,
    undefined,
    { pressure: NaN, volume: null, naMacula: undefined, symp: 'x', o2: 'y', GFR: 'z' },
    { pressure: Infinity, volume: -Infinity, naMacula: 999, symp: -5, kplus: 1e9, GFR: -1 },
    { pressure: 0, volume: 0, naMacula: 0, symp: 0, kplus: 0, tonicity: 0, o2: 0, GFR: 0 },
    { pressure: 1e9, volume: -1e9, naMacula: 1e9, symp: 1e9, kplus: 1e9, o2: 1e9, GFR: 1e9, aldoAuto: 1e9, adhDrive: 1e9 },
    { agt: 'lixo', kplus: 'lixo' }
  ];
  var campos = ['renina', 'angII', 'aldo', 'arr', 'adh', 'adhOsm', 'adhVol', 'epo', 'hyp',
                'calcitriol', 'sBaro', 'sMac', 'sSymp', 'fVol', 'fatorK', 'massaRenal'];
  cases.forEach(function(inp, i) {
    var r;
    try { r = eixo(inp); }
    catch (e) { fail++; console.error('FALHA robustez caso ' + i + ': lançou ' + e.message); return; }
    campos.forEach(function(f) {
      assert(isFinite(r[f]), 'Robustez caso ' + i + ': ' + f + ' é finito, got ' + r[f]);
    });
    assert(r.renina >= 0 && r.renina <= 30, 'Robustez caso ' + i + ': renina no clamp [0,30]');
    assert(r.aldo >= 0 && r.aldo <= 120, 'Robustez caso ' + i + ': aldo no clamp');
    assert(r.epo >= 0 && r.epo <= 30, 'Robustez caso ' + i + ': epo no clamp');
    assert(r.calcitriol >= 0 && r.calcitriol <= 2, 'Robustez caso ' + i + ': calcitriol no clamp');
    assert(typeof r.regime === 'string', 'Robustez caso ' + i + ': regime é string');
    // layouts robustos
    var L = cascataLayout(inp, 900, 320), A = respostaLayout(inp, 600, 240);
    assert(L.renP.length > 0 && isFinite(L.renP[0].x) && isFinite(L.renP[0].y), 'Robustez caso ' + i + ': cascataLayout finito');
    assert(A.bars.length === 5 && isFinite(A.bars[0].h), 'Robustez caso ' + i + ': respostaLayout finito');
  });
})();

// ─── 7. FUZZING (PRNG semeado, ≥5000 entradas, 30% malignas) ─────────────────
(function() {
  var N = 5000;
  var MALO = 0.30;
  var campos = ['renina', 'angII', 'aldo', 'arr', 'adh', 'adhOsm', 'adhVol', 'epo', 'hyp',
                'calcitriol', 'sBaro', 'sMac', 'sSymp', 'fVol', 'fatorK', 'massaRenal', 'aldoRAAS'];

  for (var i = 0; i < N; i++) {
    var inp;
    if (rand() < MALO) {
      var mal = [NaN, Infinity, -Infinity, null, undefined, '', '0', 1e15, -1e15, 0];
      inp = {
        pressure: mal[Math.floor(rand() * mal.length)],
        volume:   mal[Math.floor(rand() * mal.length)],
        naMacula: mal[Math.floor(rand() * mal.length)],
        symp:     mal[Math.floor(rand() * mal.length)],
        agt:      mal[Math.floor(rand() * mal.length)],
        kplus:    mal[Math.floor(rand() * mal.length)],
        aldoAuto: mal[Math.floor(rand() * mal.length)],
        tonicity: mal[Math.floor(rand() * mal.length)],
        adhDrive: mal[Math.floor(rand() * mal.length)],
        o2:       mal[Math.floor(rand() * mal.length)],
        GFR:      mal[Math.floor(rand() * mal.length)]
      };
    } else {
      inp = {
        pressure: 30  + rand() * 180,
        volume:   45  + rand() * 120,
        naMacula: 20  + rand() * 160,
        symp:     rand() * 2,
        agt:      0.3 + rand() * 3,
        kplus:    2   + rand() * 6,
        aldoAuto: rand() < 0.2 ? rand() * 15 : 0,
        tonicity: 250 + rand() * 90,
        adhDrive: rand() < 0.2 ? rand() * 10 : 0,
        o2:       30  + rand() * 90,
        GFR:      3   + rand() * 150
      };
    }
    var r;
    try { r = eixo(inp); }
    catch (e) { fail++; console.error('FALHA fuzz ' + i + ': lançou ' + e.message); continue; }

    campos.forEach(function(f) {
      if (r[f] === undefined) return;
      if (!isFinite(r[f])) { fail++; console.error('FALHA fuzz ' + i + ': ' + f + ' = ' + r[f]); }
      else ok++;
    });

    // invariantes estruturais sempre
    if (r.renina < 0 || r.renina > 30) { fail++; console.error('FALHA fuzz ' + i + ': renina fora do clamp'); } else ok++;
    if (r.aldo < 0 || r.aldo > 120) { fail++; console.error('FALHA fuzz ' + i + ': aldo fora do clamp'); } else ok++;
    if (r.epo < 0 || r.epo > 30) { fail++; console.error('FALHA fuzz ' + i + ': epo fora do clamp'); } else ok++;
    if (r.calcitriol < 0 || r.calcitriol > 2) { fail++; console.error('FALHA fuzz ' + i + ': calcitriol fora do clamp'); } else ok++;
    // AngII = renina·agt (sempre)
    if (Math.abs(r.angII - Math.min(r.renina * r.agt, 60)) > 1e-6 && r.renina * r.agt < 60) { fail++; console.error('FALHA fuzz ' + i + ': AngII ≠ renina·agt'); } else ok++;
    // aldoRAAS = angII·fatorK (sempre, antes do clamp da aldo total)
    if (Math.abs(r.aldoRAAS - r.angII * r.fatorK) > 1e-6) { fail++; console.error('FALHA fuzz ' + i + ': aldoRAAS ≠ AngII·fatorK'); } else ok++;
    if (typeof r.regime !== 'string') { fail++; console.error('FALHA fuzz ' + i + ': regime não-string'); } else ok++;

    // layouts: sem NaN nos pontos
    var L = cascataLayout(inp, 900, 320);
    if (!isFinite(L.renP[0].x) || !isFinite(L.aldP[L.aldP.length - 1].y)) { fail++; console.error('FALHA fuzz ' + i + ': layout NaN'); } else ok++;
    var A = respostaLayout(inp, 600, 240);
    if (!isFinite(A.bars[4].h) || A.bars.length !== 5) { fail++; console.error('FALHA fuzz ' + i + ': barras NaN'); } else ok++;
  }
})();

// ─── Saída ───────────────────────────────────────────────────────────────────
console.log(ok + ' OK · ' + fail + ' falhas');
process.exit(fail > 0 ? 1 : 0);
