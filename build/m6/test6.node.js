'use strict';
/*
 * FILTRA · M6 — test6.node.js
 * Bateria de robustez para alca()/doseResposta()/layouts: 8 categorias
 * + fuzzing 5000 entradas. Critério: determinístico (3× idêntico), 0 falhas.
 */

var m = require('./model6.js');
var alca         = m.alca;
var doseResposta = m.doseResposta;
var gradienteLayout    = m.gradienteLayout;
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
var rand = mulberry32(20240620);

// ─── 1. LINHA DE BASE ─────────────────────────────────────────────────────────
(function() {
  var r = alca({});
  // sem droga: gradiente cheio (papila ~1200), TAL impermeável → gradiente máximo
  assert(Math.abs(r.osmPapila - C.OSM_PAPILA) < 1e-9, 'sem droga → papila ~1200 mOsm (gradiente cheio), got ' + r.osmPapila.toFixed(0));
  assert(Math.abs(r.gradiente - C.GRAD_MAX) < 1e-9, 'sem droga → gradiente máximo ~900 mOsm, got ' + r.gradiente.toFixed(0));
  // o TAL é impermeável à água: sua reabsorção é de Na (água livre cheia sem droga)
  assert(Math.abs(r.aguaLivre - 1) < 1e-9, 'sem droga → capacidade de gerar água livre cheia (TAL impermeável à água)');
  assert(Math.abs(r.fracNaTAL - C.FRAC_NA_TAL) < 1e-9, 'TAL reabsorve ~25% do Na filtrado, got ' + r.fracNaTAL.toFixed(2));
  assert(r.bloqueioNKCC2 === 0 && r.natriurese === 0, 'sem droga → sem bloqueio NKCC2, sem natriurese extra');
  assert(r.regime === 'normal', 'regime default normal, got ' + r.regime);
  assert(r.ativa === 'nenhuma', 'sem droga → nenhuma droga ativa');
  // furosemida 40 mg IV → natriurese > 0 e gradiente cai
  var f = alca({ furo: 40, via: 'iv' });
  assert(f.natriurese > 0, 'furosemida 40mg IV → natriurese > 0, got ' + f.natriurese.toFixed(3));
  assert(f.gradiente < C.GRAD_MAX, 'furosemida 40mg → gradiente corticomedular cai, got ' + f.gradiente.toFixed(0));
  assert(f.bloqueioNKCC2 > 0.5, 'furosemida 40mg IV → bloqueio NKCC2 > 50%, got ' + f.bloqueioNKCC2.toFixed(2));
  assert(f.ativa === 'furosemida', 'furosemida 40mg → droga ativa furosemida');
  // Na filtrado = TFG·140/1000
  assert(Math.abs(r.naFiltrado - 120 * C.NA_PLASMA / 1000) < 1e-9, 'Na filtrado = TFG·Na/1000');
})();

// ─── 2. IDENTIDADES ───────────────────────────────────────────────────────────
(function() {
  // dose-resposta: efeito(0)=0, efeito(∞)→Emax, efeito(EC50)=Emax/2
  assert(doseResposta(0, 25, 0.92) === 0, 'ID: efeito(0) = 0');
  assert(Math.abs(doseResposta(1e12, 25, 0.92) - 0.92) < 1e-6, 'ID: efeito(∞) → Emax');
  assert(Math.abs(doseResposta(25, 25, 0.92) - 0.46) < 1e-9, 'ID: efeito(EC50) = Emax/2 (furosemida)');
  assert(Math.abs(doseResposta(0.7, 0.7, 0.92) - 0.46) < 1e-9, 'ID: efeito(EC50) = Emax/2 (bumetanida)');
  // engine usa a mesma dose-resposta: furosemida na EC50 IV → eFuro = Emax/2
  var r = alca({ furo: C.FURO_EC50, via: 'iv' });
  assert(Math.abs(r.eFuro - C.FURO_EMAX / 2) < 1e-9, 'ID: eFuro na EC50 (IV) = Emax/2 (motor)');
  var rb = alca({ bume: C.BUME_EC50, via: 'iv' });
  assert(Math.abs(rb.eBume - C.BUME_EMAX / 2) < 1e-9, 'ID: eBume na EC50 (IV) = Emax/2 (motor)');
  // gradiente = osmPapila − osmCortex
  [{}, { furo: 40 }, { bume: 1 }, { tora: 20 }].forEach(function(p) {
    var s = alca(p);
    assert(Math.abs(s.gradiente - (s.osmPapila - s.osmCortex)) < 1e-9, 'ID: gradiente = osmPapila − osmCortex');
    assert(Math.abs(s.gradFrac - (1 - s.bloqueioNKCC2)) < 1e-9, 'ID: gradFrac = 1 − bloqueio');
    assert(Math.abs(s.aguaLivre - (1 - s.bloqueioNKCC2)) < 1e-9, 'ID: aguaLivre = 1 − bloqueio');
    assert(Math.abs(s.caMgPerda - s.bloqueioNKCC2) < 1e-9, 'ID: caMgPerda = bloqueio (perde Ca/Mg com bloqueio)');
  });
  // bloqueio-classe = max(eFuro,eBume,eTora) (mesmo alvo NKCC2)
  var mix = alca({ furo: 40, bume: 1, tora: 20, via: 'iv' });
  assert(Math.abs(mix.bloqueioNKCC2 - Math.max(mix.eFuro, mix.eBume, mix.eTora)) < 1e-9, 'ID: bloqueio = max das três curvas (não somam)');
  // VO desloca dose efetiva (furosemida VO 50%)
  var rvo = alca({ furo: 80, via: 'vo' });
  assert(Math.abs(rvo.furoEff - 80 * C.FURO_BIO_VO) < 1e-9, 'ID: furoEff = dose·bio(VO)');
})();

// ─── 3. LEIS (monotonicidade) ─────────────────────────────────────────────────
(function() {
  // natriurese↑ com dose de furosemida (até o teto)
  var f1 = alca({ furo: 10 }), f2 = alca({ furo: 40 }), f3 = alca({ furo: 200 });
  assert(f1.natriurese < f2.natriurese && f2.natriurese < f3.natriurese, 'LEI: natriurese↑ com dose de furosemida (até teto)');
  assert(f1.bloqueioNKCC2 < f2.bloqueioNKCC2 && f2.bloqueioNKCC2 < f3.bloqueioNKCC2, 'LEI: bloqueio NKCC2↑ com dose');
  // gradiente↓ com dose (o TAL é o motor: bloqueá-lo o derruba)
  assert(f1.gradiente > f2.gradiente && f2.gradiente > f3.gradiente, 'LEI: gradiente corticomedular↓ com dose (abolido pelo bloqueio)');
  // Ca/Mg perda↑ com bloqueio (calciúria + magnesiúria)
  assert(f1.caMgPerda < f2.caMgPerda && f2.caMgPerda < f3.caMgPerda, 'LEI: perda de Ca/Mg↑ com bloqueio do NKCC2');
  assert(f1.caMgReabFrac > f2.caMgReabFrac, 'LEI: reabsorção paracelular de Ca/Mg↓ com bloqueio');
  // resistência → EC50 efetiva↑ (curva à direita) → menos efeito para a mesma dose
  var noRes = alca({ furo: 40, resistencia: 0 });
  var hiRes = alca({ furo: 40, resistencia: 1 });
  assert(hiRes.furoEC50e > noRes.furoEC50e, 'LEI: resistência → EC50 efetiva↑ (curva à direita)');
  assert(hiRes.eFuro < noRes.eFuro, 'LEI: resistência → menos efeito para a mesma dose (braking)');
  // IV > VO (mesma dose de furosemida)
  var iv = alca({ furo: 40, via: 'iv' });
  var vo = alca({ furo: 40, via: 'vo' });
  assert(iv.eFuro > vo.eFuro, 'LEI: IV > VO (furosemida VO ~50% biodisponível)');
  // dose-resposta monotônica
  assert(doseResposta(10, 25, 0.92) < doseResposta(40, 25, 0.92), 'LEI: dose-resposta monotônica crescente');
})();

// ─── 4. PÉROLAS ───────────────────────────────────────────────────────────────
(function() {
  // Pérola 1: TETO ALTO + braking. A furosemida é diurético de teto ALTO (≠ proximal).
  var hi = alca({ furo: 400, via: 'iv' });
  assert(hi.natriurese > hi.naFiltrado * 0.15, 'PÉROLA teto alto: a alça entrega natriurese POTENTE (≠ proximal capeado)');
  assert(hi.eFuro < C.FURO_EMAX, 'PÉROLA teto: o efeito tem teto (Emax) — nunca 100%');
  // braking/resistência desloca a curva à direita: a mesma dose rende menos
  var semR = alca({ furo: 40, resistencia: 0 }).natriurese;
  var comR = alca({ furo: 40, resistencia: 1 }).natriurese;
  assert(comR < semR, 'PÉROLA braking: resistência desloca a curva à direita → mesma dose rende MENOS');

  // Pérola 2: IV > VO. A furosemida 40 IV ≈ furosemida 80 VO (biodisponibilidade ~50%).
  var iv40 = alca({ furo: 40, via: 'iv' });
  var vo40 = alca({ furo: 40, via: 'vo' });
  assert(iv40.eFuro > vo40.eFuro, 'PÉROLA IV>VO: 40 mg IV faz mais que 40 mg VO');
  var vo80 = alca({ furo: 80, via: 'vo' });
  assert(Math.abs(iv40.furoEff - vo80.furoEff) < 1e-9, 'PÉROLA IV>VO: 40 IV ≈ 80 VO (dose efetiva igual, bio 50%)');

  // Pérola 3: perde Ca²⁺ E Mg²⁺ (≠ tiazídico, que RETÉM Ca²⁺).
  var f = alca({ furo: 80, via: 'iv' });
  assert(f.caMgPerda > 0.5, 'PÉROLA Ca/Mg: o diurético de alça PERDE Ca²⁺ e Mg²⁺ (voltagem luminal+ abolida)');
  assert(f.caMgReabFrac < 0.5, 'PÉROLA Ca/Mg: a reabsorção paracelular de Ca/Mg despenca (≠ tiazídico que retém Ca)');

  // Pérola 4: a alça CRIA o gradiente; bloqueá-la o ABOLE (não "concentra a urina").
  var sem = alca({});
  var com = alca({ furo: 200, via: 'iv' });
  assert(sem.gradiente > 800, 'PÉROLA gradiente: sem droga o gradiente está cheio (a alça o CRIOU)');
  assert(com.gradiente < sem.gradiente * 0.4, 'PÉROLA gradiente: o diurético de alça o ABOLE (o TAL é o motor)');
  assert(com.osmPapila < 600, 'PÉROLA gradiente: a papila perde sal → a capacidade de concentrar cai junto');

  // bumetanida ~40× mais potente: 1 mg bumetanida ≈ 40 mg furosemida (EC50)
  assert(C.FURO_EC50 / C.BUME_EC50 > 20, 'PÉROLA potência: bumetanida é dezenas de vezes mais potente (EC50 menor)');
})();

// ─── 5. DETERMINISMO ─────────────────────────────────────────────────────────
(function() {
  var inp = { TFG: 90, furo: 60, bume: 0, tora: 0, via: 'vo', resistencia: 0.3 };
  var r1 = alca(inp), r2 = alca(inp), r3 = alca(inp);
  assert(r1.natriurese === r2.natriurese && r2.natriurese === r3.natriurese, 'Determinismo: natriurese idêntica em 3 chamadas');
  assert(r1.gradiente === r2.gradiente, 'Determinismo: gradiente idêntico');
  assert(r1.regime === r2.regime, 'Determinismo: regime idêntico');
  var frozen = Object.freeze({ furo: 40, via: 'iv', resistencia: 0.5 });
  try { alca(frozen); assert(true, 'freeze: não lançou'); }
  catch (e) { fail++; console.error('FALHA: freeze lançou: ' + e.message); }
  assert(frozen.furo === 40, 'freeze: objeto de entrada não mutado');
  var st = Object.freeze({ furo: 40 });
  try { gradienteLayout(st, 900, 320); doseRespostaLayout(C.FURO_EC50, C.FURO_EMAX, 200, 300, 180, 40, C.FURO_EC50 * 6); assert(true, 'layouts: freeze ok'); }
  catch (e) { fail++; console.error('FALHA: layout freeze lançou: ' + e.message); }
})();

// ─── 6. ROBUSTEZ ─────────────────────────────────────────────────────────────
(function() {
  var cases = [
    {},
    null,
    undefined,
    { TFG: NaN, furo: null, bume: undefined, tora: 'string', via: 'lixo', resistencia: 'x' },
    { TFG: Infinity, furo: -Infinity, bume: 1e12, tora: -5, via: 0, resistencia: 1e9 },
    { TFG: 0, furo: 0, bume: 0, tora: 0, resistencia: 0 },
    { TFG: 1e9, furo: 1e9, bume: -1e9, tora: 1e9, resistencia: -1e9 },
    { TFG: '120', furo: '40', via: 'vo', resistencia: '0.5' }
  ];
  var fields = ['TFG', 'furoEff', 'bumeEff', 'toraEff', 'furoEC50e', 'eFuro', 'eBume', 'eTora',
                'bloqueioNKCC2', 'osmPapila', 'gradiente', 'gradFrac', 'naFiltrado', 'naReabTAL',
                'natriurese', 'caMgReabFrac', 'caMgPerda', 'aguaLivre', 'braking', 'resMult'];
  cases.forEach(function(inp, i) {
    var r;
    try { r = alca(inp); }
    catch (e) { fail++; console.error('FALHA robustez caso ' + i + ': lançou ' + e.message); return; }
    fields.forEach(function(f) {
      assert(isFinite(r[f]), 'Robustez caso ' + i + ': ' + f + ' é finito, got ' + r[f]);
    });
    assert(r.bloqueioNKCC2 >= 0 && r.bloqueioNKCC2 <= 1 + 1e-9, 'Robustez caso ' + i + ': bloqueio em [0,1]');
    assert(r.eFuro >= 0 && r.eFuro <= C.FURO_EMAX + 1e-9, 'Robustez caso ' + i + ': eFuro em [0,Emax]');
    assert(r.natriurese >= 0, 'Robustez caso ' + i + ': natriurese ≥ 0');
    assert(r.gradiente >= -1e-9 && r.gradiente <= C.GRAD_MAX + 1e-9, 'Robustez caso ' + i + ': gradiente em [0,GRAD_MAX]');
    assert(r.osmPapila >= C.OSM_CORTEX - 1e-9 && r.osmPapila <= C.OSM_PAPILA + 1e-9, 'Robustez caso ' + i + ': papila no clamp [300,1200]');
    assert(r.caMgPerda >= 0 && r.caMgPerda <= 1 + 1e-9, 'Robustez caso ' + i + ': caMgPerda em [0,1]');
    assert(typeof r.regime === 'string', 'Robustez caso ' + i + ': regime é string');
    assert(typeof r.ativa === 'string', 'Robustez caso ' + i + ': ativa é string');
    var G = gradienteLayout(inp, 900, 320);
    assert(G.pts.length > 0 && isFinite(G.pts[0].x) && isFinite(G.pts[G.pts.length - 1].y), 'Robustez caso ' + i + ': gradienteLayout finito');
    var furoIn = (inp && inp.furo !== undefined) ? inp.furo : 0;
    var D = doseRespostaLayout(C.FURO_EC50, C.FURO_EMAX, 200, 300, 180, furoIn, C.FURO_EC50 * 6);
    assert(D.pts.length > 0 && isFinite(D.pts[0].y) && D.pts2.length > 0 && isFinite(D.pts2[0].y), 'Robustez caso ' + i + ': doseRespostaLayout (2 curvas) finito');
  });
})();

// ─── 7. FUZZING (PRNG semeado, ≥5000 entradas, 30% malignas) ─────────────────
(function() {
  var N = 5000;
  var MALO = 0.30;
  var fields = ['eFuro', 'eBume', 'eTora', 'bloqueioNKCC2', 'osmPapila', 'gradiente', 'gradFrac',
                'naFiltrado', 'naReabTAL', 'natriurese', 'caMgReabFrac', 'caMgPerda', 'aguaLivre',
                'furoEff', 'bumeEff', 'toraEff', 'resMult'];

  for (var i = 0; i < N; i++) {
    var inp;
    if (rand() < MALO) {
      var mal = [NaN, Infinity, -Infinity, null, undefined, '', '0', 1e15, -1e15, 0, 'lixo'];
      inp = {
        TFG:  mal[Math.floor(rand() * mal.length)],
        furo: mal[Math.floor(rand() * mal.length)],
        bume: mal[Math.floor(rand() * mal.length)],
        tora: mal[Math.floor(rand() * mal.length)],
        via:  mal[Math.floor(rand() * mal.length)],
        resistencia: mal[Math.floor(rand() * mal.length)]
      };
    } else {
      inp = {
        TFG:  5 + rand() * 195,
        furo: rand() < 0.5 ? 0 : rand() * 400,
        bume: rand() < 0.5 ? 0 : rand() * 4,
        tora: rand() < 0.5 ? 0 : rand() * 40,
        via:  rand() < 0.5 ? 'iv' : 'vo',
        resistencia: rand() < 0.5 ? 0 : rand()
      };
    }
    var r;
    try { r = alca(inp); }
    catch (e) { fail++; console.error('FALHA fuzz ' + i + ': lançou ' + e.message); continue; }

    fields.forEach(function(f) {
      if (r[f] === undefined) return;
      if (!isFinite(r[f])) { fail++; console.error('FALHA fuzz ' + i + ': ' + f + ' = ' + r[f]); }
      else ok++;
    });

    // invariantes estruturais sempre
    if (r.bloqueioNKCC2 < -1e-9 || r.bloqueioNKCC2 > 1 + 1e-9) { fail++; console.error('FALHA fuzz ' + i + ': bloqueio fora de [0,1]'); } else ok++;
    if (r.natriurese < 0) { fail++; console.error('FALHA fuzz ' + i + ': natriurese < 0'); } else ok++;
    if (r.osmPapila < C.OSM_CORTEX - 1e-6 || r.osmPapila > C.OSM_PAPILA + 1e-6) { fail++; console.error('FALHA fuzz ' + i + ': papila fora de [300,1200]'); } else ok++;
    if (r.gradiente < -1e-6 || r.gradiente > C.GRAD_MAX + 1e-6) { fail++; console.error('FALHA fuzz ' + i + ': gradiente fora de [0,GRAD_MAX]'); } else ok++;
    // identidade: gradiente = osmPapila − osmCortex
    if (Math.abs(r.gradiente - (r.osmPapila - r.osmCortex)) > 1e-6) { fail++; console.error('FALHA fuzz ' + i + ': gradiente ≠ osmPapila−osmCortex'); } else ok++;
    // identidade: caMgPerda = bloqueio
    if (Math.abs(r.caMgPerda - r.bloqueioNKCC2) > 1e-6) { fail++; console.error('FALHA fuzz ' + i + ': caMgPerda ≠ bloqueio'); } else ok++;
    // identidade: aguaLivre = 1 − bloqueio
    if (Math.abs(r.aguaLivre - (1 - r.bloqueioNKCC2)) > 1e-6) { fail++; console.error('FALHA fuzz ' + i + ': aguaLivre ≠ 1−bloqueio'); } else ok++;
    if (r.eFuro < -1e-9 || r.eFuro > C.FURO_EMAX + 1e-9) { fail++; console.error('FALHA fuzz ' + i + ': eFuro fora de [0,Emax]'); } else ok++;
    if (typeof r.regime !== 'string') { fail++; console.error('FALHA fuzz ' + i + ': regime não-string'); } else ok++;

    // layouts: sem NaN nos pontos
    var G = gradienteLayout(inp, 900, 320);
    if (!isFinite(G.pts[0].x) || !isFinite(G.pts[G.pts.length - 1].y)) { fail++; console.error('FALHA fuzz ' + i + ': gradienteLayout NaN'); } else ok++;
    var D = doseRespostaLayout(C.FURO_EC50, C.FURO_EMAX, 200, 300, 180, (inp && isFinite(Number(inp.furo))) ? inp.furo : 0, C.FURO_EC50 * 6);
    if (!isFinite(D.pts[0].y) || !isFinite(D.pts2[0].y)) { fail++; console.error('FALHA fuzz ' + i + ': doseRespostaLayout NaN'); } else ok++;
  }
})();

// ─── Saída ───────────────────────────────────────────────────────────────────
console.log(ok + ' OK · ' + fail + ' falhas');
process.exit(fail > 0 ? 1 : 0);
