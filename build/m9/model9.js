/* =========================================================================
 * FILTRA · M9 — Sódio e volume: o rim defende o VOLUME CIRCULANTE EFETIVO
 * ENGINE PURO. Espelhado inline no filtra9.html.
 *
 * Tese: "Na baixo = falta de sal" é ERRO. O sódio é proxy de ÁGUA/volume.
 *   - VOLUME (conteúdo de Na na ECF) e TONICIDADE (concentração = água) são
 *     dois eixos ORTOGONAIS. O Na CORPORAL TOTAL fixa o tamanho da ECF; a
 *     NATREMIA é problema de ÁGUA (gancho M10).
 *   - O rim não lê o volume total: lê o VOLUME CIRCULANTE EFETIVO (VCE) — a
 *     fração que perfunde e "enche" o leito arterial e é SENTIDA pelos
 *     barorreceptores (seio carotídeo/arco aórtico, aferente/JGA, átrios).
 *   - VCE baixo → RAAS+SNS retêm Na avidamente (U_Na<20, FE_Na<1%);
 *     VCE alto → ANP/BNP (natriurese, vasodilatação) — o contrapeso.
 *   - Estados de EDEMA (ICC, cirrose, nefrótico): VCE BAIXO apesar do Na/água
 *     total ALTO ("underfilling") → o rim retém Na → edema/terceiro espaço.
 *
 * Pérolas (provadas pelo motor):
 *   (1) hiponatremia ≠ falta de sal — é água/tonicidade (eixo separado, M10);
 *   (2) edema = retenção de Na porque o VCE é SENTIDO baixo mesmo com total alto;
 *   (3) U_Na/FE_Na revela a "leitura" de volume do rim (ávido vs natriurético);
 *   (4) ANP/BNP é o contrapeso natriurético do RAAS.
 * ========================================================================= */

function clampv(v, a, b) { var n = Number(v); if (!isFinite(n)) n = a; if (n < a) n = a; if (n > b) n = b; return n; }

// sigmoide normalizada (0..1), centrada x0, inclinação k
function sig(x, x0, k) { return 1 / (1 + Math.exp(-clampv(k, 1e-6, 1e3) * (Number(x) - Number(x0)))); }

/* VCE relativo (1 = normal) a partir dos quatro determinantes:
 *  - enchimento arterial (débito cardíaco × tônus) → enche o leito;
 *  - oncótica (albumina) → segura o plasma DENTRO do vaso;
 *  - permeabilidade capilar (leak) → esvazia o intravascular para o interstício;
 *  - Na corporal total → mais sal = mais ECF, mas pode NÃO virar VCE (underfilling).
 * A subtileza: subir o Na total NÃO sobe o VCE proporcionalmente quando o
 * coração/oncótica/leak fazem o líquido escapar do compartimento efetivo. */
function vceFrom(enchimento, albumina, leak, naTotal) {
  var E = clampv(enchimento, 0, 2);   // enchimento arterial efetivo (DC×tônus), 1=normal
  var A = clampv(albumina, 0.5, 6);   // albumina g/dL (3,5–5,0 normal)
  var K = clampv(leak, 0, 1);         // fração de permeabilidade capilar (0=normal, 1=máx)
  var Ntot = clampv(naTotal, 0.4, 2); // Na corporal total relativo (1=normal)
  // retenção oncótica: albumina baixa rebaixa o teto do VCE (terceiro espaço)
  var oncot = clampv(0.45 + A / 8, 0.4, 1.1);       // ~1 quando A~4,4
  var retencaoVaso = clampv(1 - 0.7 * K, 0.3, 1);   // leak drena o intravascular
  // o Na total contribui pouco quando o "vaso não segura" (underfilling)
  var efetividade = clampv(oncot * retencaoVaso, 0.2, 1.1);
  var vce = clampv(0.35 * E + 0.65 * E * efetividade * (0.4 + 0.6 * Ntot), 0.05, 1.8);
  return vce;
}

/* o modelo-mãe do sódio e do volume */
function volume(input) {
  var inp = input || {};
  // ----- ENTRADAS -----
  var enchimento = clampv(inp.enchimento !== undefined ? inp.enchimento : 1, 0, 2);  // enchimento arterial (DC×tônus), 1=normal
  var albumina = clampv(inp.albumina !== undefined ? inp.albumina : 4.4, 0.5, 6);    // g/dL
  var leak = clampv(inp.leak !== undefined ? inp.leak : 0, 0, 1);                    // permeabilidade capilar (0=normal)
  var naTotal = clampv(inp.naTotal !== undefined ? inp.naTotal : 1, 0.4, 2);         // Na corporal total relativo (tamanho da ECF)
  var ingestaNa = clampv(inp.ingestaNa !== undefined ? inp.ingestaNa : 1, 0, 4);     // ingesta de Na relativa (1=normal ~150 mEq/d)
  var aguaCorporal = clampv(inp.aguaCorporal !== undefined ? inp.aguaCorporal : 1, 0.5, 1.8); // água corporal total relativa (eixo da TONICIDADE)

  // ----- VOLUME CIRCULANTE EFETIVO (o que o rim sente) -----
  var vce = vceFrom(enchimento, albumina, leak, naTotal);

  // ----- BARORRECEPTORES: o sinal de "encher" (1 = pleno) -----
  // alta pressão (seio carotídeo/arco) + JGA + átrios (estiramento). VCE baixo → sinal baixo.
  var sinalBaro = clampv(sig(vce, 0.85, 5.0) * 0.85 + 0.15 * clampv(vce, 0, 1.4) / 1.4, 0, 1);

  // ----- EFETORES: RAAS+SNS (retêm Na) × ANP/BNP (excretam Na) -----
  // VCE baixo → barorreceptor descarregado → RAAS/SNS ALTO
  var raasSns = clampv(1 + 2.4 * (1 - sinalBaro) - 0.4 * (sinalBaro), 0, 4);   // tônus antinatriurético (×normal)
  // ANP/BNP segue o ESTIRAMENTO atrial (VCE/volume alto) → natriurese
  var natriuretico = clampv(0.5 + 2.2 * sig(vce, 1.05, 4.0), 0, 4);            // peptídeo natriurético (×normal)
  // o balanço efetor líquido: >1 retém Na, <1 excreta Na
  var balancoEfetor = clampv(raasSns / (0.6 + 0.4 * natriuretico), 0.1, 6);

  // ----- MANEJO RENAL DE Na (a leitura de volume do rim) -----
  // FE_Na cai quando o rim retém avidamente (balanço efetor alto)
  var feNa = clampv(1.1 / (balancoEfetor * balancoEfetor) , 0.05, 8);          // % (normal ~1; pré-renal/ávido <1)
  // U_Na (mEq/L): retenção ávida → U_Na baixo
  var uNa = clampv(95 / balancoEfetor - 20, 2, 160);                           // mEq/L (ávido <20)
  var avido = (feNa < 1) && (uNa < 20);                                        // rim "com sede de Na"

  // ----- BALANÇO DE Na → tamanho da ECF / edema -----
  // Na retido = ingesta × (quanto o rim retém). Em equilíbrio a excreção iguala a ingesta;
  // o desequilíbrio (reter mais do que come) EXPANDE a ECF.
  var excrecaoNaRel = clampv(feNa / 1.0, 0.05, 8);                             // capacidade excretora relativa (1=normal)
  var balancoNa = clampv(ingestaNa - excrecaoNaRel, -4, 4);                    // >0 retém (expande ECF)
  // pressão hidrostática capilar sobe com a ECF expandida + má drenagem (leak/oncótica)
  var ecfExpansao = clampv(naTotal + 0.5 * clampv(balancoNa, 0, 4), 0.4, 3);  // tamanho da ECF relativo
  // força de edema: ECF expandida + oncótica baixa + leak + VCE baixo (underfilling perpetua a retenção)
  var forcaEdema = clampv(0.6 * (ecfExpansao - 1) + 0.5 * (1 - sinalBaro) + 0.6 * (4.4 - albumina) / 4.4 + 0.6 * leak, 0, 3);
  var edema = forcaEdema > 0.55;                                               // limiar didático
  var terceiroEspaco = (leak > 0.35 || albumina < 3.0) && edema;              // líquido fora do leito útil

  // ----- EIXO ORTOGONAL: TONICIDADE (concentração de Na = ÁGUA) -----
  // A NATREMIA é a concentração: Na sérico = (Na trocável) / (água corporal total).
  // É o eixo da ÁGUA — quase INDEPENDENTE do tamanho da ECF (naTotal). Mais água
  // livre DILUI (hiponatremia); falta de água CONCENTRA (hipernatremia). O Na total
  // (volume) só desloca a natremia de leve, porque sobe água JUNTO (proporcional).
  // É EXATAMENTE o ponto da aula: volume e tonicidade são eixos ortogonais.
  var naSerico = clampv(140 / aguaCorporal + 6 * (naTotal - 1) / Math.max(aguaCorporal, 0.5) * 0.25, 105, 175); // mEq/L
  var tonicidade = clampv(2 * naSerico, 210, 350);                            // mOsm/kg efetiva ≈ 2·Na
  var disnatremia;
  if (naSerico < 135) disnatremia = 'hiponatremia';
  else if (naSerico > 145) disnatremia = 'hipernatremia';
  else disnatremia = 'normonatremia';

  // ----- CLASSIFICAÇÃO do estado volêmico -----
  var classe;
  if (edema && vce < 0.85) classe = 'edema-underfill';   // ICC/cirrose/nefrótico: VCE baixo, total alto
  else if (vce < 0.7) classe = 'hipovolemia';            // desidratação: VCE e total baixos
  else if (ecfExpansao > 1.5 && vce >= 1.05) classe = 'sobrecarga'; // hipervolemia "verdadeira" (ex.: TFG baixa + sal)
  else classe = 'euvolemia';

  return {
    enchimento: enchimento, albumina: albumina, leak: leak, naTotal: naTotal, ingestaNa: ingestaNa, aguaCorporal: aguaCorporal,
    vce: vce, sinalBaro: sinalBaro,
    raasSns: raasSns, natriuretico: natriuretico, balancoEfetor: balancoEfetor,
    feNa: feNa, uNa: uNa, avido: avido,
    excrecaoNaRel: excrecaoNaRel, balancoNa: balancoNa, ecfExpansao: ecfExpansao,
    forcaEdema: forcaEdema, edema: edema, terceiroEspaco: terceiroEspaco,
    naSerico: naSerico, tonicidade: tonicidade, disnatremia: disnatremia,
    classe: classe
  };
}

/* geometria PURA da curva FE_Na × VCE (a UI só pinta).
 * o sensor de volume: VCE baixo → rim retém Na avidamente → FE_Na despenca.
 * mantém albumina/leak/naTotal do estado atual; varre o enchimento arterial. */
function volumeLayout(state, W, H) {
  state = state || {};
  W = clampv(W, 200, 100000); H = clampv(H, 120, 100000);
  var padL = 54, padR = 16, padT = 18, padB = 38, baseY = H - padB;
  var xMin = 0, xMax = 1.8, N = 56;          // VCE no eixo X
  var pxX = (W - padL - padR) / (xMax - xMin);
  var yMin = 0, yMax = 4;                     // FE_Na (%) no eixo Y
  var pxY = (baseY - padT) / (yMax - yMin);
  var alb = clampv(state.albumina !== undefined ? state.albumina : 4.4, 0.5, 6);
  var lk = clampv(state.leak !== undefined ? state.leak : 0, 0, 1);
  var nt = clampv(state.naTotal !== undefined ? state.naTotal : 1, 0.4, 2);
  var ag = clampv(state.aguaCorporal !== undefined ? state.aguaCorporal : 1, 0.5, 1.8);
  var ing = clampv(state.ingestaNa !== undefined ? state.ingestaNa : 1, 0, 4);
  var pts = [], i, e, vc, r;
  // varre o enchimento arterial; para cada um, calcula o VCE resultante e o FE_Na
  for (i = 0; i <= N; i++) {
    e = 2 * i / N;                                   // enchimento 0..2
    r = volume({ enchimento: e, albumina: alb, leak: lk, naTotal: nt, aguaCorporal: ag, ingestaNa: ing });
    vc = clampv(r.vce, xMin, xMax);
    pts.push({ enchimento: e, vce: vc, feNa: r.feNa, x: padL + (vc - xMin) * pxX, y: baseY - (clampv(r.feNa, yMin, yMax) - yMin) * pxY });
  }
  var cur = volume(state);
  var cvce = clampv(cur.vce, xMin, xMax);
  return {
    W: W, H: H, padL: padL, padR: padR, padT: padT, padB: padB, baseY: baseY,
    xMin: xMin, xMax: xMax, yMin: yMin, yMax: yMax, pxX: pxX, pxY: pxY,
    axis: { x0: padL, y0: padT, xEnd: W - padR, yEnd: baseY },
    pts: pts,
    current: { x: padL + (cvce - xMin) * pxX, y: baseY - (clampv(cur.feNa, yMin, yMax) - yMin) * pxY, vce: cvce, feNa: cur.feNa }
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { clampv: clampv, sig: sig, vceFrom: vceFrom, volume: volume, volumeLayout: volumeLayout };
}
