'use strict';
/*
 * FILTRA · M7 — test7.node.js
 * Bateria de robustez para distal()/doseResposta()/eficaciaTFG()/layouts: 8 categorias
 * + fuzzing 5000 entradas. Critério: determinístico (3× idêntico), 0 falhas.
 */

var m = require('./model7.js');
var distal       = m.distal;
var doseResposta = m.doseResposta;
var eficaciaTFG  = m.eficaciaTFG;
var duasCurvasLayout   = m.duasCurvasLayout;
var doseRespostaLayout = m.doseRespostaLayout;
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
var rand = mulberry32(20240719);

// ─── 1. LINHA DE BASE ─────────────────────────────────────────────────────────
(function() {
  var r = distal({});
  // NCC reabsorve ~5% do Na (sem droga)
  assert(Math.abs(r.fracNaNcc - C.FRAC_NA_NCC) < 1e-9, 'NCC reabsorve ~5% do Na filtrado, got ' + r.fracNaNcc.toFixed(3));
  // sem droga → sem natriurese, sem queda de Ca
  assert(Math.abs(r.natriurese) < 1e-9, 'sem droga → sem natriurese extra');
  assert(Math.abs(r.caUrinario - C.CA_URIN_BASAL) < 1e-9, 'sem droga → Ca urinário = basal, got ' + r.caUrinario.toFixed(0));
  assert(Math.abs(r.naSerico - C.NA_SERICO_N) < 1e-9, 'sem droga → Na sérico 140, got ' + r.naSerico.toFixed(1));
  assert(r.regime === 'normal', 'regime default normal, got ' + r.regime);
  assert(r.eHctz === 0 && r.eCtd === 0 && r.eInd === 0, 'sem droga → efeitos zero');
  // Na filtrado = TFG·140/1000
  assert(Math.abs(r.naFiltrado - 120 * C.NA_PLASMA / 1000) < 1e-9, 'Na filtrado = TFG·Na/1000');
  // COM tiazida: o Ca urinário CAI (paradoxo)
  var rt = distal({ hctz: 50 });
  assert(rt.caUrinario < C.CA_URIN_BASAL, 'tiazida → Ca urinário CAI (paradoxo), got ' + rt.caUrinario.toFixed(0));
  assert(rt.natriurese > 0, 'tiazida → há natriurese (modesta)');
  assert(rt.paradoxoCa === true, 'tiazida → paradoxo do Ca ligado (Na↑ mas Ca↓)');
  // natriurese MODESTA: bem menor que o Na filtrado (teto baixo, ~5%)
  assert(rt.natriurese < rt.naFiltrado * 0.10, 'tiazida → natriurese MODESTA (teto baixo ~5%)');
  // fTFG ~1 em TFG normal
  assert(r.fTFG > 0.95, 'TFG normal → fator de eficácia ~1, got ' + r.fTFG.toFixed(3));
})();

// ─── 2. IDENTIDADES ───────────────────────────────────────────────────────────
(function() {
  // dose-resposta: efeito(0)=0, efeito(∞)→Emax, efeito(EC50)=Emax/2
  assert(doseResposta(0, 25, 0.85) === 0, 'ID: efeito(0) = 0');
  assert(Math.abs(doseResposta(1e12, 25, 0.85) - 0.85) < 1e-6, 'ID: efeito(∞) → Emax');
  assert(Math.abs(doseResposta(25, 25, 0.85) - 0.425) < 1e-9, 'ID: efeito(EC50) = Emax/2 (HCTZ)');
  assert(Math.abs(doseResposta(12.5, 12.5, 0.95) - 0.475) < 1e-9, 'ID: efeito(EC50) = Emax/2 (CTD)');
  assert(Math.abs(doseResposta(1.5, 1.5, 0.90) - 0.45) < 1e-9, 'ID: efeito(EC50) = Emax/2 (IND)');
  // engine usa a mesma dose-resposta
  var r = distal({ hctz: C.HCTZ_EC50 });
  assert(Math.abs(r.eHctz - C.HCTZ_EMAX / 2) < 1e-9, 'ID: eHctz na EC50 = Emax/2 (motor)');
  var rc = distal({ ctd: C.CTD_EC50 });
  assert(Math.abs(rc.eCtd - C.CTD_EMAX / 2) < 1e-9, 'ID: eCtd na EC50 = Emax/2 (motor)');
  // Na escapado do NCC = Na filtrado · 5% · bloqueio efetivo
  var rb = distal({ hctz: 50 });
  assert(Math.abs(rb.naEscapaNcc - rb.naFiltrado * C.FRAC_NA_NCC * rb.bloqEff) < 1e-9, 'ID: naEscapaNcc = naFiltrado·5%·bloqEff');
  // fracNaNcc = 5%·(1−bloqEff)
  assert(Math.abs(rb.fracNaNcc - C.FRAC_NA_NCC * (1 - rb.bloqEff)) < 1e-9, 'ID: fracNaNcc = 5%·(1−bloqEff)');
  // Ca urinário = basal·(1 − quedaCaFrac)
  assert(Math.abs(rb.caUrinario - rb.caUrinBasal * (1 - rb.quedaCaFrac)) < 1e-9, 'ID: caUrinario = basal·(1−quedaCaFrac)');
  // bloqEff = bloqNCC · fTFG
  assert(Math.abs(rb.bloqEff - rb.bloqNCC * rb.fTFG) < 1e-9, 'ID: bloqEff = bloqNCC·fTFG');
  // eficaciaTFG monótona e em [0,1]
  assert(eficaciaTFG(120) > eficaciaTFG(30) && eficaciaTFG(30) > eficaciaTFG(10), 'ID: eficaciaTFG monotônica crescente');
})();

// ─── 3. LEIS (monotonicidade) ─────────────────────────────────────────────────
(function() {
  // natriurese↑ com a dose de HCTZ (até o teto baixo)
  var n0 = distal({ hctz: 0 }), n1 = distal({ hctz: 12.5 }), n2 = distal({ hctz: 50 });
  assert(n0.natriurese < n1.natriurese && n1.natriurese < n2.natriurese, 'LEI: natriurese↑ com dose de HCTZ');
  // Ca urinário↓ com a dose (PARADOXO)
  assert(n0.caUrinario > n1.caUrinario && n1.caUrinario > n2.caUrinario, 'LEI: Ca urinário↓ com dose (paradoxo)');
  // teto BAIXO: dobrar a dose muito além da EC50 rende pouca natriurese extra
  var hi1 = distal({ hctz: 100 }), hi2 = distal({ hctz: 400 });
  assert(hi2.natriurese - hi1.natriurese < hi1.natriurese * 0.3, 'LEI: teto natriurético BAIXO (saturação)');
  // clortalidona é MAIS potente que HCTZ na mesma dose (EC50 menor, Emax maior)
  var ctd = distal({ ctd: 25 }), hctz = distal({ hctz: 25 });
  assert(ctd.bloqNCC > hctz.bloqNCC, 'LEI: clortalidona mais potente que HCTZ (mesma dose)');
  // eficácia↓ quando TFG<30
  var tNorm = distal({ hctz: 50, TFG: 120 }), tBaixa = distal({ hctz: 50, TFG: 20 });
  assert(tBaixa.bloqEff < tNorm.bloqEff, 'LEI: eficácia↓ em TFG baixa (<30)');
  assert(tBaixa.natriurese < tNorm.natriurese, 'LEI: natriurese↓ em TFG baixa');
  assert(tBaixa.falhaTFG === true && tNorm.falhaTFG === false, 'LEI: falhaTFG sinaliza TFG<30');
  // Na sérico↓ com a dose (risco de hiponatremia)
  assert(n0.naSerico > n2.naSerico, 'LEI: Na sérico↓ com a dose (segmento diluidor bloqueado)');
  // dose-resposta é monotônica crescente
  assert(doseResposta(10, 25, 0.85) < doseResposta(40, 25, 0.85), 'LEI: dose-resposta monotônica crescente');
  // indapamida potente em dose baixa
  var ind = distal({ indap: 2.5 });
  assert(ind.bloqNCC > 0.5, 'LEI: indapamida potente em 2,5 mg, got ' + ind.bloqNCC.toFixed(2));
})();

// ─── 4. PÉROLAS ───────────────────────────────────────────────────────────────
(function() {
  // Pérola 1: o PARADOXO DO Ca — natriurese SOBE mas o Ca urinário CAI (oposto da alça).
  var r = distal({ hctz: 50 });
  assert(r.natriurese > 0 && r.caUrinario < r.caUrinBasal, 'PÉROLA paradoxo: Na URINÁRIO↑ mas Ca URINÁRIO↓ (oposto da alça)');
  assert(r.paradoxoCa === true, 'PÉROLA paradoxo: flag paradoxoCa ligado');
  assert(r.quedaCaFrac > 0 && r.tendHipercalcemia > 0, 'PÉROLA paradoxo: queda do Ca urinário → tendência à HIPERcalcemia');
  // trata litíase cálcica/hipercalciúria: com Ca basal alto, o tiazida derruba o Ca urinário
  var litiase = distal({ hctz: 50, caUrinBasal: 400 });
  assert(litiase.caUrinario < 400, 'PÉROLA litíase: tiazida derruba o Ca urinário na hipercalciúria');
  assert(litiase.regime === 'tiazidico_hipercalciuria', 'PÉROLA litíase: regime tiazidico_hipercalciuria');

  // Pérola 2: diurético MODESTO (≠ alça) — natriurese é uma fração pequena do Na filtrado.
  var forte = distal({ hctz: 400 });
  assert(forte.natriurese < forte.naFiltrado * 0.10, 'PÉROLA modesto: mesmo na dose máxima, a natriurese é pequena (teto baixo)');

  // Pérola 3: HIPONATREMIA — o segmento diluidor bloqueado → Na sérico cai (clássica na idosa).
  var hipo = distal({ hctz: 50 });
  assert(hipo.naSerico < C.NA_SERICO_N, 'PÉROLA hiponatremia: o diluidor distal bloqueado derruba o Na sérico');
  assert(hipo.riscoHipoNa > 0, 'PÉROLA hiponatremia: risco relativo > 0');

  // Pérola 4: INEFICÁCIA em TFG<30 — o tiazida "para de funcionar".
  var falha = distal({ hctz: 50, TFG: 20 });
  assert(falha.bloqEff < distal({ hctz: 50, TFG: 120 }).bloqEff * 0.6, 'PÉROLA ineficácia: TFG<30 derruba a eficácia do tiazida');
  assert(falha.regime === 'tiazidico_ineficaz_tfg_baixa', 'PÉROLA ineficácia: regime tiazidico_ineficaz_tfg_baixa');

  // Pérola 5: bloqueio SEQUENCIAL alça+tiazida — sinergia (natriurese extra).
  var seq = distal({ hctz: 50, alca: true });
  var soTiaz = distal({ hctz: 50, alca: false });
  assert(seq.natriurese > soTiaz.natriurese, 'PÉROLA sequencial: alça+tiazida soma natriurese (sinergia)');
  assert(seq.regime === 'bloqueio_sequencial', 'PÉROLA sequencial: regime bloqueio_sequencial');
})();

// ─── 5. DETERMINISMO ─────────────────────────────────────────────────────────
(function() {
  var inp = { TFG: 90, hctz: 25, ctd: 12.5, indap: 1.5, caUrinBasal: 350, alca: false };
  var r1 = distal(inp), r2 = distal(inp), r3 = distal(inp);
  assert(r1.natriurese === r2.natriurese && r2.natriurese === r3.natriurese, 'Determinismo: natriurese idêntica em 3 chamadas');
  assert(r1.caUrinario === r2.caUrinario, 'Determinismo: Ca urinário idêntico');
  assert(r1.regime === r2.regime, 'Determinismo: regime idêntico');
  var frozen = Object.freeze({ hctz: 50, ctd: 25, caUrinBasal: 400 });
  try { distal(frozen); assert(true, 'freeze: não lançou'); }
  catch (e) { fail++; console.error('FALHA: freeze lançou: ' + e.message); }
  assert(frozen.hctz === 50, 'freeze: objeto de entrada não mutado');
  var st = Object.freeze({ hctz: 25, caUrinBasal: 300 });
  try { duasCurvasLayout(st, 900, 320); doseRespostaLayout(C.HCTZ_EC50, C.HCTZ_EMAX, 100, 300, 180, 25); assert(true, 'layouts: freeze ok'); }
  catch (e) { fail++; console.error('FALHA: layout freeze lançou: ' + e.message); }
})();

// ─── 6. ROBUSTEZ ─────────────────────────────────────────────────────────────
(function() {
  var cases = [
    {},
    null,
    undefined,
    { TFG: NaN, hctz: null, ctd: undefined, indap: 'string', caUrinBasal: 'x', alca: 'lixo' },
    { TFG: Infinity, hctz: -Infinity, ctd: 1e12, indap: -5, caUrinBasal: 1e9, alca: 1 },
    { TFG: 0, hctz: 0, ctd: 0, indap: 0, caUrinBasal: 0, alca: false },
    { TFG: 1e9, hctz: 1e9, ctd: -1e9, indap: 1e9, caUrinBasal: -1e9 },
    { TFG: '120', hctz: '50', alca: 'sim' }
  ];
  var fields = ['TFG', 'eHctz', 'eCtd', 'eInd', 'bloqNCC', 'bloqEff', 'fTFG',
                'naFiltrado', 'fracNaNcc', 'naReabNcc', 'naEscapaNcc', 'natriurese',
                'caUrinario', 'quedaCaFrac', 'tendHipercalcemia',
                'naSerico', 'deltaNa', 'riscoHipoNa', 'eficacia'];
  cases.forEach(function(inp, i) {
    var r;
    try { r = distal(inp); }
    catch (e) { fail++; console.error('FALHA robustez caso ' + i + ': lançou ' + e.message); return; }
    fields.forEach(function(f) {
      assert(isFinite(r[f]), 'Robustez caso ' + i + ': ' + f + ' é finito, got ' + r[f]);
    });
    assert(r.eHctz >= 0 && r.eHctz <= C.HCTZ_EMAX + 1e-9, 'Robustez caso ' + i + ': eHctz em [0,Emax]');
    assert(r.eCtd >= 0 && r.eCtd <= C.CTD_EMAX + 1e-9, 'Robustez caso ' + i + ': eCtd em [0,Emax]');
    assert(r.bloqNCC >= 0 && r.bloqNCC <= 1 + 1e-9, 'Robustez caso ' + i + ': bloqNCC em [0,1]');
    assert(r.natriurese >= 0, 'Robustez caso ' + i + ': natriurese ≥ 0');
    assert(r.caUrinario >= 0, 'Robustez caso ' + i + ': Ca urinário ≥ 0');
    assert(r.caUrinario <= r.caUrinBasal + 1e-6, 'Robustez caso ' + i + ': Ca urinário ≤ basal (só cai)');
    assert(r.naSerico >= 120 && r.naSerico <= 145, 'Robustez caso ' + i + ': Na sérico no clamp');
    assert(typeof r.regime === 'string', 'Robustez caso ' + i + ': regime é string');
    assert(typeof r.paradoxoCa === 'boolean', 'Robustez caso ' + i + ': paradoxoCa é boolean');
    var L = duasCurvasLayout(inp, 900, 320);
    assert(L.natr.length > 0 && isFinite(L.natr[0].x) && isFinite(L.ca[L.ca.length - 1].y), 'Robustez caso ' + i + ': duasCurvasLayout finito');
    var hctzIn = (inp && inp.hctz !== undefined) ? inp.hctz : 0;
    var D = doseRespostaLayout(C.HCTZ_EC50, C.HCTZ_EMAX, 100, 300, 180, hctzIn);
    assert(D.pts.length > 0 && isFinite(D.pts[0].y), 'Robustez caso ' + i + ': doseRespostaLayout finito');
  });
})();

// ─── 7. FUZZING (PRNG semeado, ≥5000 entradas, 30% malignas) ─────────────────
(function() {
  var N = 5000;
  var MALO = 0.30;
  var fields = ['eHctz', 'eCtd', 'eInd', 'bloqNCC', 'bloqEff', 'fTFG', 'naFiltrado',
                'fracNaNcc', 'naReabNcc', 'naEscapaNcc', 'natriurese', 'caUrinario',
                'quedaCaFrac', 'tendHipercalcemia', 'naSerico', 'deltaNa', 'riscoHipoNa'];

  for (var i = 0; i < N; i++) {
    var inp;
    if (rand() < MALO) {
      var mal = [NaN, Infinity, -Infinity, null, undefined, '', '0', 1e15, -1e15, 0];
      inp = {
        TFG:         mal[Math.floor(rand() * mal.length)],
        hctz:        mal[Math.floor(rand() * mal.length)],
        ctd:         mal[Math.floor(rand() * mal.length)],
        indap:       mal[Math.floor(rand() * mal.length)],
        caUrinBasal: mal[Math.floor(rand() * mal.length)],
        alca:        mal[Math.floor(rand() * mal.length)]
      };
    } else {
      inp = {
        TFG:         5 + rand() * 195,
        hctz:        rand() < 0.5 ? 0 : rand() * 100,
        ctd:         rand() < 0.5 ? 0 : rand() * 50,
        indap:       rand() < 0.5 ? 0 : rand() * 5,
        caUrinBasal: rand() * 800,
        alca:        rand() < 0.3
      };
    }
    var r;
    try { r = distal(inp); }
    catch (e) { fail++; console.error('FALHA fuzz ' + i + ': lançou ' + e.message); continue; }

    fields.forEach(function(f) {
      if (r[f] === undefined) return;
      if (!isFinite(r[f])) { fail++; console.error('FALHA fuzz ' + i + ': ' + f + ' = ' + r[f]); }
      else ok++;
    });

    // invariantes estruturais sempre
    if (r.natriurese < 0) { fail++; console.error('FALHA fuzz ' + i + ': natriurese < 0'); } else ok++;
    if (r.caUrinario < 0) { fail++; console.error('FALHA fuzz ' + i + ': Ca urinário < 0'); } else ok++;
    if (r.caUrinario > r.caUrinBasal + 1e-6) { fail++; console.error('FALHA fuzz ' + i + ': Ca urinário > basal (só pode cair)'); } else ok++;
    if (r.bloqNCC < -1e-9 || r.bloqNCC > 1 + 1e-9) { fail++; console.error('FALHA fuzz ' + i + ': bloqNCC fora de [0,1]'); } else ok++;
    if (r.bloqEff < -1e-9 || r.bloqEff > 1 + 1e-9) { fail++; console.error('FALHA fuzz ' + i + ': bloqEff fora de [0,1]'); } else ok++;
    if (r.eHctz < 0 || r.eHctz > C.HCTZ_EMAX + 1e-9) { fail++; console.error('FALHA fuzz ' + i + ': eHctz fora de [0,Emax]'); } else ok++;
    if (r.naSerico < 120 - 1e-9 || r.naSerico > 145 + 1e-9) { fail++; console.error('FALHA fuzz ' + i + ': Na sérico fora do clamp'); } else ok++;
    if (r.quedaCaFrac < -1e-9 || r.quedaCaFrac > C.CA_QUEDA_MAX + 1e-9) { fail++; console.error('FALHA fuzz ' + i + ': quedaCaFrac fora de [0,CA_QUEDA_MAX]'); } else ok++;
    if (typeof r.regime !== 'string') { fail++; console.error('FALHA fuzz ' + i + ': regime não-string'); } else ok++;

    // layouts: sem NaN nos pontos
    var L = duasCurvasLayout(inp, 900, 320);
    if (!isFinite(L.natr[0].x) || !isFinite(L.ca[L.ca.length - 1].y)) { fail++; console.error('FALHA fuzz ' + i + ': layout NaN'); } else ok++;
  }
})();

// ─── Saída ───────────────────────────────────────────────────────────────────
console.log(ok + ' OK · ' + fail + ' falhas');
process.exit(fail > 0 ? 1 : 0);
