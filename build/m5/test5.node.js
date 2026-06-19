'use strict';
/*
 * FILTRA · M5 — test5.node.js
 * Bateria de robustez para proximal()/doseResposta()/tituloGlicose(): 8 categorias
 * + fuzzing 5000 entradas. Critério: determinístico (3× idêntico), 0 falhas.
 */

var m = require('./model5.js');
var proximal      = m.proximal;
var doseResposta  = m.doseResposta;
var tituloGlicose = m.tituloGlicose;
var glicoseTitulacaoLayout = m.glicoseTitulacaoLayout;
var doseRespostaLayout     = m.doseRespostaLayout;
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
  var r = proximal({});
  // TCP reabsorve ~65% do Na (sem droga)
  assert(Math.abs(r.fracNaTcp - C.FRAC_NA_TCP) < 1e-9, 'TCP reabsorve ~65% do Na filtrado, got ' + r.fracNaTcp.toFixed(3));
  // glicemia 100 → glicosúria ~0
  assert(r.glicosuria < 0.5 && r.glicosuriaPos === false, 'glicemia 100 → glicosúria ≈ 0, got ' + r.glicosuria.toFixed(2));
  // glicemia 300 → glicosúria > 0
  var r3 = proximal({ glicemia: 300 });
  assert(r3.glicosuria > 0 && r3.glicosuriaPos === true, 'glicemia 300 → glicosúria > 0, got ' + r3.glicosuria.toFixed(2));
  // HCO3 ~85% reabsorvido no TCP (sem droga)
  assert(Math.abs(r.fracHco3 - C.FRAC_HCO3_TCP) < 1e-9, 'HCO3 ~85% reabsorvido no TCP, got ' + r.fracHco3.toFixed(3));
  assert(Math.abs(r.bicarbonaturia) < 1e-9, 'sem droga → sem bicarbonatúria');
  assert(Math.abs(r.hco3Plasma - 24) < 1e-6, 'sem droga → HCO3 plasmático 24, got ' + r.hco3Plasma.toFixed(1));
  // carga distal de Na ≈ 35% sem droga (1 - 0.65)
  assert(Math.abs(r.fracDistal - (1 - C.FRAC_NA_TCP)) < 1e-9, 'carga distal ≈ 35% do Na filtrado sem droga, got ' + r.fracDistal.toFixed(3));
  // Na filtrado = TFG·140/1000
  assert(Math.abs(r.naFiltrado - 120 * C.NA_PLASMA / 1000) < 1e-9, 'Na filtrado = TFG·Na/1000');
  assert(r.regime === 'normal', 'regime default normal, got ' + r.regime);
  // efeitos zerados sem droga
  assert(r.eAcz === 0 && r.eSglt2 === 0 && r.eMan === 0, 'sem droga → efeitos zero');
})();

// ─── 2. IDENTIDADES ───────────────────────────────────────────────────────────
(function() {
  // titulação: excretada = max(filtrada − reabsorvida, 0)  e  filtrada = TFG·glicemia/100
  [[100,120],[300,120],[500,120],[250,90],[200,150]].forEach(function(p) {
    var t = tituloGlicose(p[0], p[1], C.TM_GLI, C.LIMIAR_GLI);
    assert(Math.abs(t.filtrada - p[1] * p[0] / 100) < 1e-7, 'ID: filtrada = TFG·glicemia/100 (g=' + p[0] + ')');
    assert(Math.abs(t.excretada - Math.max(t.filtrada - t.reabsorvida, 0)) < 1e-7, 'ID: excretada = max(filtrada−reab,0) (g=' + p[0] + ')');
    assert(t.reabsorvida <= C.TM_GLI + 1e-7, 'ID: reabsorvida ≤ Tm (g=' + p[0] + ')');
    assert(t.reabsorvida <= t.filtrada + 1e-7, 'ID: reabsorvida ≤ filtrada (g=' + p[0] + ')');
  });
  // dose-resposta: efeito(0)=0, efeito(∞)→Emax, efeito(EC50)=Emax/2
  assert(doseResposta(0, 250, 0.8) === 0, 'ID: efeito(0) = 0');
  assert(Math.abs(doseResposta(1e12, 250, 0.8) - 0.8) < 1e-6, 'ID: efeito(∞) → Emax');
  assert(Math.abs(doseResposta(250, 250, 0.8) - 0.4) < 1e-9, 'ID: efeito(EC50) = Emax/2');
  assert(Math.abs(doseResposta(5, 5, 0.55) - 0.275) < 1e-9, 'ID: efeito(EC50) = Emax/2 (SGLT2i)');
  // engine usa a mesma dose-resposta
  var r = proximal({ acz: C.ACZ_EC50 });
  assert(Math.abs(r.eAcz - C.ACZ_EMAX / 2) < 1e-9, 'ID: eAcz na EC50 = Emax/2 (motor)');
  var rs = proximal({ sglt2: C.SGLT2_EC50 });
  assert(Math.abs(rs.eSglt2 - C.SGLT2_EMAX / 2) < 1e-9, 'ID: eSglt2 na EC50 = Emax/2 (motor)');
  // bicarbonatúria: fracHco3 = FRAC_HCO3_TCP·(1−eAcz)
  var ra = proximal({ acz: 500 });
  assert(Math.abs(ra.fracHco3 - C.FRAC_HCO3_TCP * (1 - ra.eAcz)) < 1e-9, 'ID: fracHco3 = 0.85·(1−eAcz)');
  // carga distal = Na filtrado − reabsorvido
  assert(Math.abs(r.cargaDistalNa - (r.naFiltrado - r.naReabTcp)) < 1e-9, 'ID: cargaDistal = Na filtrado − reabsorvido');
})();

// ─── 3. LEIS (monotonicidade) ─────────────────────────────────────────────────
(function() {
  // glicosúria↑ conforme glicemia↑ (acima do limiar)
  var g1 = proximal({ glicemia: 250 }), g2 = proximal({ glicemia: 350 }), g3 = proximal({ glicemia: 500 });
  assert(g1.glicosuria < g2.glicosuria && g2.glicosuria < g3.glicosuria, 'LEI: glicosúria↑ conforme glicemia↑');
  // reabsorção de glicose satura no Tm (não passa do Tm efetivo)
  [300, 400, 600, 1000].forEach(function(g) {
    var t = tituloGlicose(g, 120, C.TM_GLI, C.LIMIAR_GLI);
    assert(t.reabsorvida <= C.TM_GLI + 1e-6, 'LEI: reabsorção satura no Tm (g=' + g + ')');
  });
  var rHi1 = proximal({ glicemia: 700 }), rHi2 = proximal({ glicemia: 1500 });
  assert(Math.abs(rHi1.glicoseReabsorvida - rHi2.glicoseReabsorvida) < 1, 'LEI: em glicemia alta a reabsorção PLATEIA (satura — não cresce mais)');
  assert(rHi2.glicoseReabsorvida <= C.TM_GLI + 1e-6, 'LEI: a reabsorção saturada respeita o teto Tm');
  // SGLT2i dose↑ → limiar↓ → glicosúria↑ (em normoglicemia)
  var s0 = proximal({ glicemia: 100, sglt2: 0 });
  var s1 = proximal({ glicemia: 100, sglt2: 10 });
  var s2 = proximal({ glicemia: 100, sglt2: 25 });
  assert(s0.limiarEff > s1.limiarEff && s1.limiarEff > s2.limiarEff, 'LEI: SGLT2i dose↑ → limiar↓');
  assert(s0.glicosuria < s1.glicosuria && s1.glicosuria < s2.glicosuria, 'LEI: SGLT2i dose↑ → glicosúria↑ (normoglicemia)');
  // acetazolamida dose↑ → HCO3 urinário↑
  var a0 = proximal({ acz: 0 }), a1 = proximal({ acz: 250 }), a2 = proximal({ acz: 500 });
  assert(a0.bicarbonaturia < a1.bicarbonaturia && a1.bicarbonaturia < a2.bicarbonaturia, 'LEI: acetazolamida dose↑ → bicarbonatúria↑');
  assert(a0.hco3Plasma > a1.hco3Plasma && a1.hco3Plasma > a2.hco3Plasma, 'LEI: acetazolamida dose↑ → HCO3 plasmático↓ (acidose)');
  // carga distal de Na↑ com QUALQUER inibidor proximal
  var base = proximal({}).fracDistal;
  assert(proximal({ acz: 500 }).fracDistal > base, 'LEI: acetazolamida ↑ carga distal de Na');
  assert(proximal({ sglt2: 25 }).fracDistal > base, 'LEI: SGLT2i ↑ carga distal de Na');
  assert(proximal({ manitol: 1 }).fracDistal > base, 'LEI: manitol ↑ carga distal de Na');
  // dose-resposta é monotônica crescente
  assert(doseResposta(100, 250, 0.8) < doseResposta(300, 250, 0.8), 'LEI: dose-resposta monotônica crescente');
})();

// ─── 4. PÉROLAS ───────────────────────────────────────────────────────────────
(function() {
  // Pérola 1: a alça é PRISIONEIRA do proximal — inibição proximal ↑ carga distal,
  // MAS a natriurese final é capeada (braking): muito do Na extra é recapturado.
  var r = proximal({ acz: 500 });
  assert(r.fracDistal > (1 - C.FRAC_NA_TCP), 'PÉROLA prisioneira: inibição proximal AUMENTA a carga distal de Na');
  assert(r.braking > 0.3, 'PÉROLA braking: a maior parte do Na extra é recapturada (eficácia diurética limitada), braking ' + r.braking.toFixed(2));
  // mesmo com bloqueio forte, a natriurese final é uma FRAÇÃO pequena do Na filtrado
  assert(r.natriureseFinal < r.naFiltrado * 0.1, 'PÉROLA: natriurese proximal final é pequena vs Na filtrado (teto/braking)');

  // Pérola 2: SGLT2i restaura o FEEDBACK TUBULOGLOMERULAR → mais Na na mácula densa.
  // sinal: mais Na escapa do proximal (carga distal↑) em normoglicemia → nefroproteção.
  var sg = proximal({ glicemia: 100, sglt2: 25 });
  assert(sg.glicosuriaPos === true && sg.glicemia < 180, 'PÉROLA SGLT2i: glicosúria em NORMOglicemia (limiar baixado)');
  assert(sg.fracDistal > (1 - C.FRAC_NA_TCP), 'PÉROLA SGLT2i: mais Na entregue ao distal (sinal de TGF restaurado → nefroproteção)');
  assert(sg.regime === 'sglt2i_glicosuria_normo', 'PÉROLA SGLT2i: regime sglt2i_glicosuria_normo');

  // Pérola 3: Fanconi = perdas MÚLTIPLAS com plasma normal (ATR proximal tipo 2).
  var fz = proximal({ glicemia: 100, fanconi: true });
  assert(fz.fanconiPerdas.glicose && fz.fanconiPerdas.aminoacido && fz.fanconiPerdas.fosfato
      && fz.fanconiPerdas.bicarbonato && fz.fanconiPerdas.acidoUrico, 'PÉROLA Fanconi: perde glicose+aa+fosfato+HCO3+ácido úrico');
  assert(fz.glicosuria > 0 && fz.glicemia === 100, 'PÉROLA Fanconi: glicosúria com glicemia NORMAL (glicosúria renal)');
  assert(fz.bicarbonaturia > 0, 'PÉROLA Fanconi: bicarbonatúria (ATR proximal tipo 2)');
  assert(fz.regime === 'fanconi', 'PÉROLA Fanconi: regime fanconi');

  // Pérola 4: acetazolamida AUTOLIMITADA — efeito tem teto (Emax) e a acidose é modesta.
  var lo = proximal({ acz: 250 }), hi = proximal({ acz: 2000 });
  assert(hi.eAcz < C.ACZ_EMAX, 'PÉROLA autolimitada: efeito da acetazolamida tem TETO (Emax) — nunca 100%');
  assert(hi.eAcz - lo.eAcz < lo.eAcz, 'PÉROLA autolimitada: dobrar+ a dose rende cada vez MENOS (saturação)');
  assert(hi.hco3Plasma > 8, 'PÉROLA autolimitada: a acidose é modesta (escape proximal)');
})();

// ─── 5. DETERMINISMO ─────────────────────────────────────────────────────────
(function() {
  var inp = { glicemia: 280, TFG: 90, acz: 375, sglt2: 12, manitol: 0.5, fanconi: false };
  var r1 = proximal(inp), r2 = proximal(inp), r3 = proximal(inp);
  assert(r1.glicosuria === r2.glicosuria && r2.glicosuria === r3.glicosuria, 'Determinismo: glicosúria idêntica em 3 chamadas');
  assert(r1.bicarbonaturia === r2.bicarbonaturia, 'Determinismo: bicarbonatúria idêntica');
  assert(r1.regime === r2.regime, 'Determinismo: regime idêntico');
  var frozen = Object.freeze({ glicemia: 300, acz: 500, sglt2: 10 });
  try { proximal(frozen); assert(true, 'freeze: não lançou'); }
  catch (e) { fail++; console.error('FALHA: freeze lançou: ' + e.message); }
  assert(frozen.glicemia === 300, 'freeze: objeto de entrada não mutado');
  var st = Object.freeze({ glicemia: 250, sglt2: 10 });
  try { glicoseTitulacaoLayout(st, 900, 320); doseRespostaLayout(C.SGLT2_EC50, C.SGLT2_EMAX, 50, 300, 180, 10); assert(true, 'layouts: freeze ok'); }
  catch (e) { fail++; console.error('FALHA: layout freeze lançou: ' + e.message); }
})();

// ─── 6. ROBUSTEZ ─────────────────────────────────────────────────────────────
(function() {
  var cases = [
    {},
    null,
    undefined,
    { glicemia: NaN, TFG: null, acz: undefined, sglt2: 'string', manitol: 'x', fanconi: 'lixo' },
    { glicemia: Infinity, TFG: -Infinity, acz: 1e12, sglt2: -5, manitol: 1e9, fanconi: 1 },
    { glicemia: 0, TFG: 0, acz: 0, sglt2: 0, manitol: 0, fanconi: false },
    { glicemia: 1e9, TFG: 1e9, acz: -1e9, sglt2: 1e9, manitol: -1e9 },
    { glicemia: '300', TFG: '120', fanconi: 'sim' }
  ];
  var fields = ['glicemia', 'TFG', 'eAcz', 'eSglt2', 'eMan', 'glicoseFiltrada', 'glicoseReabsorvida',
                'glicosuria', 'tmEff', 'limiarEff', 'naFiltrado', 'fracNaTcp', 'naReabTcp',
                'cargaDistalNa', 'fracDistal', 'natriureseFinal', 'braking', 'inibProx',
                'fracHco3', 'bicarbonaturia', 'hco3Plasma'];
  cases.forEach(function(inp, i) {
    var r;
    try { r = proximal(inp); }
    catch (e) { fail++; console.error('FALHA robustez caso ' + i + ': lançou ' + e.message); return; }
    fields.forEach(function(f) {
      assert(isFinite(r[f]), 'Robustez caso ' + i + ': ' + f + ' é finito, got ' + r[f]);
    });
    assert(r.eAcz >= 0 && r.eAcz <= C.ACZ_EMAX + 1e-9, 'Robustez caso ' + i + ': eAcz em [0,Emax]');
    assert(r.eSglt2 >= 0 && r.eSglt2 <= C.SGLT2_EMAX + 1e-9, 'Robustez caso ' + i + ': eSglt2 em [0,Emax]');
    assert(r.glicosuria >= 0, 'Robustez caso ' + i + ': glicosúria ≥ 0');
    assert(r.glicoseReabsorvida <= C.TM_GLI + 1e-6, 'Robustez caso ' + i + ': reabsorção ≤ Tm');
    assert(r.fracHco3 >= 0, 'Robustez caso ' + i + ': fracHco3 ≥ 0');
    assert(r.hco3Plasma >= 8 && r.hco3Plasma <= 30, 'Robustez caso ' + i + ': HCO3 plasmático no clamp');
    assert(typeof r.regime === 'string', 'Robustez caso ' + i + ': regime é string');
    assert(typeof r.fanconiPerdas === 'object', 'Robustez caso ' + i + ': fanconiPerdas é objeto');
    var L = glicoseTitulacaoLayout(inp, 900, 320);
    assert(L.filt.length > 0 && isFinite(L.filt[0].x) && isFinite(L.exc[L.exc.length - 1].y), 'Robustez caso ' + i + ': glicoseTitulacaoLayout finito');
    var aczIn = (inp && inp.acz !== undefined) ? inp.acz : 0;
    var D = doseRespostaLayout(aczIn, 0.8, 1000, 300, 180, aczIn);
    assert(D.pts.length > 0 && isFinite(D.pts[0].y), 'Robustez caso ' + i + ': doseRespostaLayout finito');
  });
})();

// ─── 7. FUZZING (PRNG semeado, ≥5000 entradas, 30% malignas) ─────────────────
(function() {
  var N = 5000;
  var MALO = 0.30;
  var fields = ['glicosuria', 'glicoseFiltrada', 'glicoseReabsorvida', 'eAcz', 'eSglt2', 'eMan',
                'tmEff', 'limiarEff', 'naFiltrado', 'cargaDistalNa', 'fracDistal', 'natriureseFinal',
                'braking', 'fracHco3', 'bicarbonaturia', 'hco3Plasma'];

  for (var i = 0; i < N; i++) {
    var inp;
    if (rand() < MALO) {
      var mal = [NaN, Infinity, -Infinity, null, undefined, '', '0', 1e15, -1e15, 0];
      inp = {
        glicemia: mal[Math.floor(rand() * mal.length)],
        TFG:      mal[Math.floor(rand() * mal.length)],
        acz:      mal[Math.floor(rand() * mal.length)],
        sglt2:    mal[Math.floor(rand() * mal.length)],
        manitol:  mal[Math.floor(rand() * mal.length)],
        fanconi:  mal[Math.floor(rand() * mal.length)]
      };
    } else {
      inp = {
        glicemia: rand() * 800,
        TFG:      5 + rand() * 195,
        acz:      rand() < 0.5 ? 0 : rand() * 1000,
        sglt2:    rand() < 0.5 ? 0 : rand() * 50,
        manitol:  rand() < 0.5 ? 0 : rand() * 2,
        fanconi:  rand() < 0.15
      };
    }
    var r;
    try { r = proximal(inp); }
    catch (e) { fail++; console.error('FALHA fuzz ' + i + ': lançou ' + e.message); continue; }

    fields.forEach(function(f) {
      if (r[f] === undefined) return;
      if (!isFinite(r[f])) { fail++; console.error('FALHA fuzz ' + i + ': ' + f + ' = ' + r[f]); }
      else ok++;
    });

    // invariantes estruturais sempre
    if (r.glicosuria < 0) { fail++; console.error('FALHA fuzz ' + i + ': glicosúria < 0'); } else ok++;
    if (r.glicoseReabsorvida > C.TM_GLI + 1e-6) { fail++; console.error('FALHA fuzz ' + i + ': reabsorção > Tm'); } else ok++;
    if (r.glicoseReabsorvida > r.glicoseFiltrada + 1e-6) { fail++; console.error('FALHA fuzz ' + i + ': reab > filtrada'); } else ok++;
    // identidade da titulação: excretada = max(filtrada − reab, 0)
    if (Math.abs(r.glicosuria - Math.max(r.glicoseFiltrada - r.glicoseReabsorvida, 0)) > 1e-6) { fail++; console.error('FALHA fuzz ' + i + ': excretada ≠ max(filt−reab,0)'); } else ok++;
    if (r.eAcz < 0 || r.eAcz > C.ACZ_EMAX + 1e-9) { fail++; console.error('FALHA fuzz ' + i + ': eAcz fora de [0,Emax]'); } else ok++;
    if (r.eSglt2 < 0 || r.eSglt2 > C.SGLT2_EMAX + 1e-9) { fail++; console.error('FALHA fuzz ' + i + ': eSglt2 fora de [0,Emax]'); } else ok++;
    if (r.hco3Plasma < 8 - 1e-9 || r.hco3Plasma > 30 + 1e-9) { fail++; console.error('FALHA fuzz ' + i + ': HCO3 plasmático fora do clamp'); } else ok++;
    if (r.fracDistal < -1e-9 || r.fracDistal > 1 + 1e-9) { fail++; console.error('FALHA fuzz ' + i + ': fracDistal fora de [0,1]'); } else ok++;
    if (typeof r.regime !== 'string') { fail++; console.error('FALHA fuzz ' + i + ': regime não-string'); } else ok++;

    // layouts: sem NaN nos pontos
    var L = glicoseTitulacaoLayout(inp, 900, 320);
    if (!isFinite(L.filt[0].x) || !isFinite(L.exc[L.exc.length - 1].y)) { fail++; console.error('FALHA fuzz ' + i + ': layout NaN'); } else ok++;
  }
})();

// ─── Saída ───────────────────────────────────────────────────────────────────
console.log(ok + ' OK · ' + fail + ' falhas');
process.exit(fail > 0 ? 1 : 0);
