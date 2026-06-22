/* =========================================================================
 * FILTRA · M7 — TCD (túbulo contorcido distal): NCC, segmento diluidor distal,
 * manejo de Ca²⁺ (TRPV5/PTH) e os TIAZÍDICOS (§8): HCTZ, clortalidona, indapamida.
 * ENGINE PURO. Espelhado inline no filtra7.html.
 *
 * Teses:
 *  - "tudo é igual no túbulo" é FALSO: o TCD é o AJUSTE FINO. O NCC apical
 *    reabsorve ~5–7% do Na⁺ filtrado e o segmento é IMPERMEÁVEL à água
 *    (= segmento diluidor distal: dilui mais a urina).
 *  - PARADOXO DO Ca²⁺: o tiazídico bloqueia o NCC → ↓Na intracelular + contração
 *    de volume → ↑reabsorção de Ca (proximal e basolateral NCX) → HIPOcalciúria.
 *    Por isso o tiazídico trata a nefrolitíase cálcica (≠ alça, que ESPOLIA Ca).
 *  - dose-resposta sigmoide (Emax) com TETO; eficácia cai com TFG<30 (exceto
 *    clortalidona/metolazona). Adversos por mecanismo: hipoK, hipoNa (clássica),
 *    hiperCa/hipocalciúria, hipoMg, hiperuricemia, hiperglicemia.
 *  - GITELMAN = perda de função do NCC = "tiazídico endógeno": hipoK, alcalose,
 *    hipoMg e HIPOcalciúria (espelho da exceção de Bartter/alça do M6).
 * ========================================================================= */

function clampv(v, a, b) { var n = Number(v); if (!isFinite(n)) n = a; if (n < a) n = a; if (n > b) n = b; return n; }

// fármacos: dose com UNIDADE + mecanismo (§8). EC50 menor / potência maior.
var FARMACOS = {
  nenhum: { nome: '— nenhum —', unidade: '', faixa: [0, 0], ec50: 1, alvo: '', potencia: '' },
  hidroclorotiazida: { nome: 'Hidroclorotiazida', unidade: 'mg/dia', faixa: [12.5, 50], ec50: 12.5, alvo: 'NCC (cotransportador Na⁺-Cl⁻, TCD)', potencia: 'tiazídico de referência; teto ~50–100 mg' },
  clortalidona: { nome: 'Clortalidona', unidade: 'mg/dia', faixa: [12.5, 25], ec50: 6.25, alvo: 'NCC (cotransportador Na⁺-Cl⁻, TCD)', potencia: '≈1,5–2× a HCTZ; meia-vida longa; age com TFG baixa' },
  indapamida: { nome: 'Indapamida', unidade: 'mg/dia', faixa: [1.5, 2.5], ec50: 0.75, alvo: 'NCC (cotransportador Na⁺-Cl⁻, TCD)', potencia: 'tiazídico-símile; potente em mg baixos' }
};

// dose-resposta sigmoide (Emax)
function emaxModel(dose, ec50, emax) {
  dose = clampv(dose, 0, 1e6); ec50 = clampv(ec50, 1e-6, 1e6); emax = clampv(emax, 0, 1);
  return clampv(emax * dose / (ec50 + dose), 0, 1);
}

// O Ca²⁺ urinário (rel. ao normal=1) em função do bloqueio do NCC.
// Bloquear o NCC → ↓Na intracelular + contração → ↑reabsorção de Ca → HIPOcalciúria.
function caFromBlock(bloqueio) { return clampv(1 - clampv(bloqueio, 0, 1) * 0.7, 0.25, 1.4); }

// função-mãe
function tcd(input) {
  var inp = input || {};
  var gfr = clampv(inp.gfr !== undefined ? inp.gfr : 100, 1, 250);
  var naDistal = clampv(inp.naDistal !== undefined ? inp.naDistal : 0.10, 0.02, 0.30); // fração de Na pós-alça que chega ao TCD
  var nccBasal = clampv(inp.nccBasal !== undefined ? inp.nccBasal : 1, 0, 1);          // atividade basal do NCC (1 = normal)
  var pth = clampv(inp.pth !== undefined ? inp.pth : 1, 0, 3);                         // PTH relativo (estimula reabsorção de Ca no TCD)
  var gitelman = inp.gitelman === true;                                               // perda de função do NCC (tiazídico endógeno)
  var droga = String(inp.droga == null ? 'nenhum' : inp.droga).toLowerCase();
  if (!FARMACOS.hasOwnProperty(droga)) droga = 'nenhum';
  var meta = FARMACOS[droga];
  var dose = clampv(inp.dose !== undefined ? inp.dose : (meta.faixa[0] || 0), 0, 5000);

  // eficácia cai com TFG<30 — EXCETO clortalidona (e metolazona, fora deste escopo)
  var gfrFactor = gfr >= 30 ? 1 : (droga === 'clortalidona' ? clampv(0.45 + gfr / 55, 0.45, 1) : clampv((gfr / 30) * (gfr / 30), 0, 1));

  // bloqueio farmacológico do NCC pela curva Emax (× perda de eficácia por TFG)
  var bloqueioFarmaco = droga === 'nenhum' ? 0 : emaxModel(dose, meta.ec50, 0.85) * gfrFactor;
  // Gitelman = NCC quase abolido (bloqueio "endógeno"); combina com o NCC basal
  var bloqueioTotal = clampv(gitelman ? Math.max(0.9, bloqueioFarmaco) : bloqueioFarmaco + (1 - nccBasal) * 0.9, 0, 1);

  // atividade efetiva do NCC (0..1)
  var ncc = clampv(nccBasal * (1 - bloqueioFarmaco) * (gitelman ? 0.05 : 1), 0, 1);

  // reabsorção de Na NO TCD: o NCC pega ~6% do filtrado quando pleno
  var reabNaTCD = clampv(ncc * naDistal * 0.6, 0, 0.30);    // fração do filtrado reabsorvida aqui
  // Na entregue ao ducto coletor = o que chega ao TCD menos o reabsorvido aqui
  var naAoColetor = clampv(naDistal - reabNaTCD, 0.005, 0.30);

  // SECREÇÃO DISTAL DE K: mais Na ao ducto coletor (ENaC) → mais K secretado → hipoK
  // basal naAoColetor ~0.04 dá K ~4.0; subir naAoColetor baixa o K
  var plasmaK = clampv(4.2 - (naAoColetor - 0.04) * 14, 2.8, 6.2);
  var hipoK = plasmaK < 3.5;

  // SEGMENTO DILUIDOR DISTAL: o NCC ativo dilui a urina (reabsorve soluto sem água).
  // Bloquear o NCC piora a diluição → cai o clearance de água livre → hiponatremia.
  var capacidadeDiluir = clampv(ncc, 0, 1);                 // 1 = dilui ao máximo
  var clearanceAguaLivre = clampv(-2 + capacidadeDiluir * 8, -2, 6); // mL/min; cai quando o NCC é bloqueado
  var riscoHipoNa = capacidadeDiluir < 0.45;               // bloqueio + contração → ADH → hiponatremia clássica

  // O PARADOXO DO Ca²⁺ — o coração do módulo.
  // O bloqueio do NCC (farmacológico OU Gitelman) reduz o Ca urinário (hipocalciúria).
  var caUrinario = clampv(caFromBlock(bloqueioTotal) * (0.7 + pth * 0.3), 0.2, 1.6); // rel.; PTH ↑ reabsorção (↓ urina) modesto
  caUrinario = clampv(caUrinario, 0.2, 1.6);
  var hipocalciuria = caUrinario < 0.75;
  var hipercalcemiaLeve = bloqueioTotal > 0.4;             // menos Ca na urina → tendência a Ca sérico↑

  // Mg urinário: o TCD ajusta o Mg; o bloqueio do NCC (e Gitelman) gera HIPOmagnesemia (perde Mg)
  var mgUrinario = clampv(1 + bloqueioTotal * 1.2, 1, 2.4); // rel.; sobe com o bloqueio → hipoMg
  var hipoMg = mgUrinario > 1.6;

  // natriurese líquida (FENa): basal ~0.6%; teto MODESTO do tiazídico (~5–8%, < alça)
  var FENa = clampv(0.6 + bloqueioTotal * 6.5, 0.6, 8);
  var ceilingReached = bloqueioFarmaco > 0.8;

  var classe;
  if (gitelman) classe = 'gitelman';
  else if (droga === 'nenhum') classe = 'normal';
  else if (ceilingReached) classe = 'tiazidico_teto';
  else classe = 'tiazidico';

  return {
    gfr: gfr, naDistal: naDistal, nccBasal: nccBasal, pth: pth, gitelman: gitelman,
    droga: droga, dose: dose, unidade: meta.unidade, alvo: meta.alvo, faixa: meta.faixa,
    nomeFarmaco: meta.nome, potencia: meta.potencia, gfrFactor: gfrFactor,
    bloqueioFarmaco: bloqueioFarmaco, bloqueioTotal: bloqueioTotal, ncc: ncc,
    reabNaTCD: reabNaTCD, naAoColetor: naAoColetor, plasmaK: plasmaK, hipoK: hipoK,
    capacidadeDiluir: capacidadeDiluir, clearanceAguaLivre: clearanceAguaLivre, riscoHipoNa: riscoHipoNa,
    caUrinario: caUrinario, hipocalciuria: hipocalciuria, hipercalcemiaLeve: hipercalcemiaLeve,
    mgUrinario: mgUrinario, hipoMg: hipoMg, FENa: FENa, ceilingReached: ceilingReached, classe: classe
  };
}

// geometria PURA da curva do PARADOXO: FENa (natriurese) × Ca urinário, ambos × bloqueio do NCC.
// As duas curvas se cruzam: mais natriurese, MENOS cálcio na urina (o paradoxo).
function tcdLayout(state, W, H) {
  state = state || {};
  W = clampv(W, 200, 100000); H = clampv(H, 120, 100000);
  var padL = 52, padR = 16, padT = 18, padB = 38, baseY = H - padB;
  var bMin = 0, bMax = 1, N = 56;
  var pxX = (W - padL - padR) / (bMax - bMin);
  // eixo Y normalizado 0..1 (FENa mapeado de 0.6..8; Ca de 0.3..1.4)
  var pxY = (baseY - padT);
  function fenaAt(b) { return clampv(0.6 + b * 6.5, 0.6, 8); }
  function caAt(b) { return caFromBlock(b); }
  function nFena(f) { return clampv((f - 0.6) / (8 - 0.6), 0, 1); }
  function nCa(c) { return clampv((c - 0.3) / (1.4 - 0.3), 0, 1); }
  var ptsFena = [], ptsCa = [], i, b;
  for (i = 0; i <= N; i++) {
    b = bMin + (bMax - bMin) * i / N;
    ptsFena.push({ b: b, v: fenaAt(b), x: padL + (b - bMin) * pxX, y: baseY - nFena(fenaAt(b)) * pxY });
    ptsCa.push({ b: b, v: caAt(b), x: padL + (b - bMin) * pxX, y: baseY - nCa(caAt(b)) * pxY });
  }
  var cur = tcd(state);
  var bc = clampv(cur.bloqueioTotal, bMin, bMax);
  return {
    W: W, H: H, padL: padL, padR: padR, padT: padT, padB: padB, baseY: baseY, bMin: bMin, bMax: bMax, pxX: pxX, pxY: pxY,
    axis: { x0: padL, y0: padT, xEnd: W - padR, yEnd: baseY },
    ptsFena: ptsFena, ptsCa: ptsCa,
    current: {
      x: padL + (bc - bMin) * pxX,
      yFena: baseY - nFena(cur.FENa) * pxY,
      yCa: baseY - nCa(cur.caUrinario) * pxY,
      b: bc, FENa: cur.FENa, caUrinario: cur.caUrinario
    }
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { clampv: clampv, emaxModel: emaxModel, caFromBlock: caFromBlock, tcd: tcd, tcdLayout: tcdLayout, FARMACOS: FARMACOS };
}
