/* =========================================================================
 * FILTRA · M10 — Água livre e disnatremias: o sódio mede ÁGUA, não sal
 * ENGINE PURO. Espelhado inline no filtra10.html.
 *
 * Tese: "tratar o número Na" é ERRO. As disnatremias são distúrbios de ÁGUA.
 *   - NATREMIA = TONICIDADE = osmoles efetivos / ÁGUA corporal total (TBW).
 *     O Na sérico mede a relação soluto/ÁGUA, não o sal corporal total.
 *   - O ADH/vasopressina governa a reabsorção de ÁGUA (aquaporina-2 no ducto
 *     coletor). É liberado por OSMORRECEPTORES (hipotálamo) e por
 *     BARORRECEPTORES (estímulo NÃO-osmótico, quando o volume cai — DOMINA
 *     sobre o osmótico). A SEDE é o outro braço do balanço de água.
 *   - CLEARANCE DE ÁGUA LIVRE C_H2O = V̇ − C_osm: a capacidade do rim de
 *     excretar (urina diluída, Uosm baixa) ou reter (Uosm alta) água pura.
 *   - HIPONATREMIA = excesso de água relativo ao Na. SIADH = ADH inapropriado
 *     (Uosm alta apesar de hipotônico). DI = déficit de água por ausência
 *     (central) ou resistência (nefrogênico) ao ADH → Uosm baixa apesar de
 *     hiperNa.
 *   - A VELOCIDADE é o coração do módulo. Hipo CRÔNICA → o cérebro adapta
 *     (extrusão de osmólitos orgânicos) → corrigir RÁPIDO demais ressseca o
 *     neurônio adaptado → MIELINÓLISE (desmielinização osmótica pontina).
 *     Hipo AGUDA (sem adaptação) → EDEMA cerebral. Hiper corrigida rápido →
 *     EDEMA. Limite seguro ≈ 6–8 mEq/L por 24 h na crônica.
 *
 * Pérolas (provadas pelo motor):
 *   (1) trate a ÁGUA, não o número do Na — mover a água move a natremia, mover
 *       o sal corporal quase não a move (Na sérico ⟂ Na total);
 *   (2) o MESMO Na pode ser hipo/eu/hipervolêmico — o ADH + o volume é que
 *       classificam (a natremia sozinha não diz o volume);
 *   (3) a CRONICIDADE dita a velocidade segura (cérebro adaptado → corrigir
 *       devagar; corrigir rápido a crônica → mielinólise);
 *   (4) DI = déficit de água por ausência/resistência ao ADH → Uosm BAIXA
 *       apesar da hipernatremia (o rim "joga água fora" no momento errado).
 * ========================================================================= */

function clampv(v, a, b) { var n = Number(v); if (!isFinite(n)) n = a; if (n < a) n = a; if (n > b) n = b; return n; }

// sigmoide normalizada (0..1), centrada x0, inclinação k
function sig(x, x0, k) { return 1 / (1 + Math.exp(-clampv(k, 1e-6, 1e3) * (Number(x) - Number(x0)))); }

/* nível de ADH (× normal, 0..4) a partir dos dois estímulos.
 *  - OSMÓTICO: a natremia/tonicidade sobe acima do limiar (~135) → osmorreceptor
 *    dispara linearmente; abaixo do limiar a sede/ADH é suprimida (Uosm baixa).
 *  - NÃO-OSMÓTICO (barorreceptor): o VCE baixo (volume) dispara ADH com força e
 *    DOMINA — é o "override" que explica a hiponatremia hipovolêmica e a da ICC.
 * defeito = doença do eixo: 'central' anula o ADH (DI central), 'nefrogenico'
 * deixa o ADH alto mas o rim não responde (tratado no clearance), 'siadh' fixa
 * o ADH alto e inapropriado. */
function adhFrom(naSerico, vce, defeito) {
  var Na = clampv(naSerico, 100, 185);
  var V = clampv(vce, 0.05, 1.8);
  if (defeito === 'central') return 0;                       // sem secreção de ADH
  if (defeito === 'siadh') return clampv(3.0, 0, 4);          // ADH fixo, alto, inapropriado
  // osmótico: limiar ~135; ganho ~0,22 por mEq acima; abaixo é suprimido
  var osmotico = clampv(0.2 + 0.22 * (Na - 135), 0, 4);
  // não-osmótico: VCE baixo → ADH alto; satura quando o volume despenca
  var naoOsmotico = clampv(3.4 * (1 - sig(V, 0.8, 6.0)), 0, 4);
  // o barorreceptor DOMINA: quando o VCE cai, prevalece o maior dos dois
  return clampv(Math.max(osmotico, naoOsmotico), 0, 4);
}

/* o modelo-mãe da água livre e das disnatremias */
function agua(input) {
  var inp = input || {};
  // ----- ENTRADAS -----
  var peso = clampv(inp.peso !== undefined ? inp.peso : 70, 20, 200);                   // kg
  var fracTBW = clampv(inp.fracTBW !== undefined ? inp.fracTBW : 0.6, 0.4, 0.7);         // fração de água (homem 0,6; mulher 0,5; idoso menor)
  var osmEfet = clampv(inp.osmEfet !== undefined ? inp.osmEfet : 1, 0.5, 1.8);           // osmoles EFETIVOS corporais (× normal) — o "sal trocável"
  var aguaLivre = clampv(inp.aguaLivre !== undefined ? inp.aguaLivre : 0, -10, 10);      // ÁGUA livre acumulada (L): >0 EXCESSO (dilui, hipoNa); <0 DÉFICIT (concentra, hiperNa)
  var ingestaAgua = clampv(inp.ingestaAgua !== undefined ? inp.ingestaAgua : 1, 0, 6);   // ingesta de água livre (× normal ~1,5 L/d)
  var perdaInsens = clampv(inp.perdaInsens !== undefined ? inp.perdaInsens : 1, 0, 6);   // perdas insensíveis/extrarrenais de água livre (× normal)
  var vce = clampv(inp.vce !== undefined ? inp.vce : 1, 0.05, 1.8);                       // volume circulante efetivo (× normal) — vem do M9
  var defeito = (inp.defeito === 'central' || inp.defeito === 'nefrogenico' || inp.defeito === 'siadh') ? inp.defeito : 'nenhum';
  var cronicidade = clampv(inp.cronicidade !== undefined ? inp.cronicidade : 1, 0, 1);   // 0 = aguda (<48h); 1 = crônica (cérebro adaptado)
  var taxaCorrecao = clampv(inp.taxaCorrecao !== undefined ? inp.taxaCorrecao : 6, 0, 30); // mEq/L por 24h que se PRETENDE corrigir

  // ----- TBW e a equação-mãe da natremia -----
  var tbwBase = clampv(peso * fracTBW, 8, 140);                                          // L (água "seca")
  var tbw = clampv(tbwBase + aguaLivre, 6, 160);                                         // L com a água livre acumulada
  // Na sérico = osmoles efetivos / ÁGUA. No basal (osmEfet=1, aguaLivre=0) → 140.
  // GANHAR água livre (TBW↑) DILUI (Na↓ = hiponatremia); PERDER água (TBW↓)
  // CONCENTRA (Na↑ = hipernatremia). Mover osmEfet (o sal trocável) move POUCO,
  // porque a referência de água é o tamanho — é o eixo ⟂ ao volume (gancho M9).
  var naSerico = clampv(140 * osmEfet * (tbwBase / tbw), 100, 185);                       // mEq/L
  var tonicidade = clampv(2 * naSerico, 200, 370);                                       // mOsm/kg efetiva ≈ 2·Na

  var disnatremia;
  if (naSerico < 135) disnatremia = 'hiponatremia';
  else if (naSerico > 145) disnatremia = 'hipernatremia';
  else disnatremia = 'normonatremia';

  // ----- ADH: o controlador da ÁGUA -----
  var adh = adhFrom(naSerico, vce, defeito);                                             // × normal (0..4)

  // ----- Uosm: a resposta renal (concentra com ADH; dilui sem ele) -----
  // ADH abre a aquaporina-2 → reabsorve água → Uosm alta. No nefrogênico o ADH
  // existe mas o rim NÃO responde → Uosm baixa apesar do ADH.
  var respostaRenal = (defeito === 'nefrogenico') ? 0.12 : 1;                            // 0..1 (fração de resposta à AQP2)
  var uosm = clampv(60 + (1200 - 60) * sig(adh * respostaRenal, 1.0, 2.2), 40, 1300);    // mOsm/kg
  var urinaDiluida = uosm < 250;                                                          // o rim excreta água livre
  var urinaConcentrada = uosm > 600;                                                      // o rim retém água

  // ----- CLEARANCE DE ÁGUA LIVRE: C_H2O = V̇ − C_osm -----
  // carga osmolar diária a excretar (× normal); V̇ é o fluxo urinário.
  var cargaOsm = clampv(osmEfet, 0.3, 2);                                                // proporcional aos osmoles a despejar
  var posm = clampv(tonicidade, 200, 370);                                               // osmolalidade plasmática
  // fluxo urinário: mais água ingerida e menos ADH → mais urina; carga osmolar puxa diurese osmótica
  var fluxoUrina = clampv(1.2 * (0.4 + 0.9 * ingestaAgua) / (0.5 + 0.9 * (uosm / 600)) + 0.3 * cargaOsm, 0.1, 12); // L/d (× didático)
  var cOsm = clampv(fluxoUrina * uosm / posm, 0.05, 14);                                 // clearance osmolar (L/d)
  var cH2O = clampv(fluxoUrina - cOsm, -12, 12);                                         // L/d: >0 excreta água livre; <0 retém (reabsorve)

  // ----- BALANÇO DE ÁGUA → para onde a natremia caminha -----
  // entra água (ingesta) − sai água (urina livre + insensível). >0 ganha água → DILUI (Na↓);
  // <0 perde água → CONCENTRA (Na↑). É o motor das disnatremias.
  var perdaRenalLivre = clampv(cH2O, -12, 12);
  var balancoAgua = clampv(1.4 * ingestaAgua - perdaInsens - clampv(perdaRenalLivre, 0, 12) + clampv(-perdaRenalLivre, 0, 12) * 0.0, -8, 8); // L/d
  // sinal didático: ganha água (balanço>0) → Na cairá; perde água → Na subirá
  var deltaNaTendencia = clampv(-2.6 * balancoAgua, -12, 12);                            // mEq/L por dia (tendência)

  // ----- O EIXO DA VELOCIDADE: cronicidade → adaptação → segurança/risco -----
  // o cérebro CRÔNICO extrudou osmólitos (adaptou-se) → corrigir rápido resseca o
  // neurônio → mielinólise. o AGUDO ainda não adaptou → o perigo é o EDEMA.
  var adaptacaoCerebral = clampv(cronicidade, 0, 1);                                     // 0..1 (1 = totalmente adaptado)
  // limite seguro de correção por 24h: crônica ~6–8; aguda tolera mais (10–12)
  var limiteSeguro = clampv(8 - 2 * adaptacaoCerebral + 4 * (1 - adaptacaoCerebral), 6, 12); // mEq/L/24h
  var excesso = clampv(taxaCorrecao - limiteSeguro, -30, 30);                            // o quanto passou do teto

  var riscoMielinolise = (disnatremia === 'hiponatremia') && adaptacaoCerebral > 0.5 && excesso > 0; // crônica corrigida rápido
  var riscoEdemaAguda = (disnatremia === 'hiponatremia') && adaptacaoCerebral < 0.5;     // aguda: edema pela própria hipoNa
  var riscoEdemaHiper = (disnatremia === 'hipernatremia') && excesso > 0;                // hiperNa corrigida rápido → edema

  var risco;
  if (riscoMielinolise) risco = 'mielinolise';
  else if (riscoEdemaHiper) risco = 'edema-hiper';
  else if (riscoEdemaAguda) risco = 'edema-agudo';
  else risco = 'seguro';

  // ----- CLASSIFICAÇÃO da disnatremia por VOLUME + ADH/defeito -----
  var classe;
  if (disnatremia === 'hiponatremia') {
    if (defeito === 'siadh') classe = 'hipo-euvolemica-siadh';     // ADH inapropriado, euvolêmica
    else if (vce < 0.8) classe = 'hipo-hipovolemica';              // ADH apropriado (não-osmótico), hipovolêmica
    else if (vce >= 1.05 || osmEfet > 1.2) classe = 'hipo-hipervolemica'; // ICC/cirrose: VCE baixo efetivo, total alto
    else classe = 'hipo-euvolemica';
  } else if (disnatremia === 'hipernatremia') {
    if (defeito === 'central') classe = 'hiper-di-central';        // sem ADH
    else if (defeito === 'nefrogenico') classe = 'hiper-di-nefrogenico'; // resistência ao ADH
    else classe = 'hiper-deficit-agua';                            // ingesta inadequada / perda de água
  } else {
    classe = 'normonatremia';
  }

  return {
    peso: peso, fracTBW: fracTBW, osmEfet: osmEfet, ingestaAgua: ingestaAgua, perdaInsens: perdaInsens,
    vce: vce, defeito: defeito, cronicidade: cronicidade, taxaCorrecao: taxaCorrecao,
    tbw: tbw, naSerico: naSerico, tonicidade: tonicidade, disnatremia: disnatremia,
    adh: adh, uosm: uosm, urinaDiluida: urinaDiluida, urinaConcentrada: urinaConcentrada,
    fluxoUrina: fluxoUrina, cOsm: cOsm, cH2O: cH2O,
    balancoAgua: balancoAgua, deltaNaTendencia: deltaNaTendencia,
    adaptacaoCerebral: adaptacaoCerebral, limiteSeguro: limiteSeguro, excesso: excesso,
    riscoMielinolise: riscoMielinolise, riscoEdemaAguda: riscoEdemaAguda, riscoEdemaHiper: riscoEdemaHiper,
    risco: risco, classe: classe
  };
}

/* geometria PURA da trajetória do Na no tempo durante a correção (a UI só pinta).
 * eixo X = horas (0..48), eixo Y = Na (mEq/L). traça a reta de correção na taxa
 * pretendida e a FAIXA SEGURA (cone do limite seguro/24h a partir do Na inicial).
 * o ponto vermelho é o Na às 48 h; se a reta cruza o teto da faixa, é mielinólise. */
function aguaLayout(state, W, H) {
  state = state || {};
  W = clampv(W, 200, 100000); H = clampv(H, 120, 100000);
  var padL = 54, padR = 16, padT = 18, padB = 38, baseY = H - padB;
  var xMin = 0, xMax = 48, N = 48;                 // horas
  var pxX = (W - padL - padR) / (xMax - xMin);
  var cur = agua(state);
  var na0 = clampv(cur.naSerico, 100, 185);
  // janela Y centrada na faixa de interesse: Na0 .. Na0 + 2·limite
  var yLo = clampv(na0 - 4, 100, 185);
  var yHi = clampv(na0 + 2 * cur.limiteSeguro + 6, yLo + 8, 185);
  var pxY = (baseY - padT) / (yHi - yLo);
  function yOf(na) { return baseY - (clampv(na, yLo, yHi) - yLo) * pxY; }
  function xOf(h) { return padL + (clampv(h, xMin, xMax) - xMin) * pxX; }
  // reta de correção pretendida (taxaCorrecao por 24h) e tetos da faixa segura
  var ptsCorrige = [], ptsSeguro = [], i, h, naC, naS;
  for (i = 0; i <= N; i++) {
    h = xMax * i / N;
    naC = na0 + cur.taxaCorrecao * (h / 24);                 // trajetória pretendida
    naS = na0 + cur.limiteSeguro * (h / 24);                 // teto seguro
    ptsCorrige.push({ h: h, na: naC, x: xOf(h), y: yOf(naC) });
    ptsSeguro.push({ h: h, na: naS, x: xOf(h), y: yOf(naS) });
  }
  var na48 = na0 + cur.taxaCorrecao * (48 / 24);
  return {
    W: W, H: H, padL: padL, padR: padR, padT: padT, padB: padB, baseY: baseY,
    xMin: xMin, xMax: xMax, yLo: yLo, yHi: yHi, pxX: pxX, pxY: pxY,
    axis: { x0: padL, y0: padT, xEnd: W - padR, yEnd: baseY },
    na0: na0, limiteSeguro: cur.limiteSeguro, taxaCorrecao: cur.taxaCorrecao, risco: cur.risco,
    ptsCorrige: ptsCorrige, ptsSeguro: ptsSeguro,
    current: { x: xOf(48), y: yOf(na48), h: 48, na: clampv(na48, yLo, yHi) }
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { clampv: clampv, sig: sig, adhFrom: adhFrom, agua: agua, aguaLayout: aguaLayout };
}
