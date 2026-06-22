/* =========================================================================
 * FILTRA · M38 — CAPSTONE integrado: LRA grave → escolha de MODALIDADE e
 * PRESCRIÇÃO por MECANISMO → meio interno restaurado.
 * ENGINE PURO. Espelhado inline no filtra38.html.
 *
 * Integra M16 (LRA por mecanismo) + M19–M37. Três decisões, todas por MECANISMO:
 *
 *  1) ESTABILIDADE × VELOCIDADE → MODALIDADE
 *     - instável (instabilidade alta, PAM baixa, vasopressor) → TRRC/CVVHDF:
 *       contínua e GENTIL, retira volume devagar (UF < refilling, M24/M27/M28).
 *     - estável + necessidade de remoção RÁPIDA (hipercalemia/intoxicação) → HDI:
 *       gradientes altos, clearance veloz em poucas horas (M22).
 *     - meio-termo (instabilidade intermediária) → SLED: híbrida (M31).
 *     - cenário crônico/ambulatorial → DP (M30) — não para o crítico instável.
 *     A modalidade NÃO é receita: sai do mecanismo descompensado.
 *
 *  2) PRESCRIÇÃO por MECANISMO
 *     - HDI: Kt/V-alvo (~1,2/sessão) + TEMPO (h) — 1ª sessão urêmica = GENTIL (M34, evitar
 *       desequilíbrio): menos tempo/eficiência para não baixar a ureia rápido demais.
 *     - TRRC: efluente em mL/kg/h (~25, faixa 20–35) + pré/pós-diluição (M28); catabolismo↑
 *       pede dose um pouco maior.
 *     - UF rate (mL/h) pela TOLERÂNCIA hemodinâmica (M24): instável → UF baixa (evita UF>refilling
 *       e hipotensão/stunning); estável com sobrecarga → UF mais alta.
 *
 *  3) ANTICOAGULAÇÃO do circuito (M29)
 *     - sangramento alto → CITRATO regional (quela Ca²⁺ no circuito, não anticoagula o paciente).
 *     - sangramento baixo → heparina (sistêmica, mais simples).
 *
 *  RESTAURAÇÃO do meio interno: prevê K⁺/pH/volume corrigidos pela prescrição, SEM desequilíbrio.
 *  A diálise NÃO substitui o rim — substitui FUNÇÕES por física (difusão/convecção/UF, M19).
 *
 * PÉROLA: a modalidade e a dose saem do MECANISMO descompensado (instável → contínuo gentil;
 * rápido só quando o gatilho é veloz), não de uma receita fixa.
 * ========================================================================= */

function clampv(v, a, b) { var n = Number(v); if (!isFinite(n)) n = a; if (n < a) n = a; if (n > b) n = b; return n; }

/* limiares de referência (espelham M36/M33/M24) */
var K_RAPIDO = 6.2;      // K⁺ (mEq/L) que pede remoção RÁPIDA
var UF_REFILL = 400;     // teto de UF (mL/h) tolerado sem instabilidade (refilling plasmático)
var EFLU_ALVO = 25;      // efluente-alvo TRRC (mL/kg/h)

/* índice de INSTABILIDADE hemodinâmica [0..1]: combina instabilidade direta, PAM baixa e vasopressor */
function instabIndex(instabilidade, pam, vaso) {
  instabilidade = clampv(instabilidade, 0, 1);
  pam = clampv(pam, 30, 130);
  vaso = clampv(vaso, 0, 1);
  var pamComp = clampv((75 - pam) / 35, 0, 1);          // PAM 75→0 ; 40→1
  return clampv(0.45 * instabilidade + 0.30 * pamComp + 0.25 * vaso, 0, 1);
}

/* índice de VELOCIDADE necessária de clearance [0..1]: hipercalemia e intoxicação puxam para rápido */
function velocidadeIndex(k, intoxicacao, sintomas) {
  k = clampv(k, 2, 9);
  intoxicacao = clampv(intoxicacao, 0, 1);
  sintomas = clampv(sintomas, 0, 1);
  var kComp = clampv((k - 5.0) / (K_RAPIDO - 5.0), 0, 1.3);  // K 5,0→0 ; 6,2→1 ; pode passar
  return clampv(0.55 * clampv(kComp, 0, 1) + 0.30 * intoxicacao + 0.15 * sintomas, 0, 1);
}

/* função-mãe: o capstone — decide modalidade, prescrição, anticoagulação e prevê o meio interno */
function capstone(input) {
  var inp = input || {};
  var instabilidade = clampv(inp.instabilidade !== undefined ? inp.instabilidade : 0.2, 0, 1);
  var pam = clampv(inp.pam !== undefined ? inp.pam : 80, 30, 130);            // mmHg
  var vasopressor = clampv(inp.vasopressor !== undefined ? inp.vasopressor : 0, 0, 1);
  var k = clampv(inp.k !== undefined ? inp.k : 4.8, 2, 9);                    // mEq/L
  var hco3 = clampv(inp.hco3 !== undefined ? inp.hco3 : 22, 2, 30);           // mEq/L
  var volume = clampv(inp.volume !== undefined ? inp.volume : 0, 0, 20);      // L acima do seco
  var ureia = clampv(inp.ureia !== undefined ? inp.ureia : 80, 20, 400);      // mg/dL
  var sintomas = clampv(inp.sintomas !== undefined ? inp.sintomas : 0, 0, 1); // sintomas urêmicos 0..1
  var catabolismo = clampv(inp.catabolismo !== undefined ? inp.catabolismo : 0.3, 0, 1);
  var sangramento = clampv(inp.sangramento !== undefined ? inp.sangramento : 0.2, 0, 1);
  var intoxicacao = clampv(inp.intoxicacao !== undefined ? inp.intoxicacao : 0, 0, 1);
  var pesoKg = clampv(inp.pesoKg !== undefined ? inp.pesoKg : 70, 30, 200);   // kg
  var cronico = clampv(inp.cronico !== undefined ? inp.cronico : 0, 0, 1);    // contexto crônico/ambulatorial

  // ----- os dois eixos da decisão -----
  var instab = instabIndex(instabilidade, pam, vasopressor);                  // 0..1
  var velocidade = velocidadeIndex(k, intoxicacao, sintomas);                 // 0..1

  // ----- MODALIDADE por mecanismo -----
  // crônico/ambulatorial estável → DP (peritônio como membrana, M30) — só fora do crítico instável
  // instável → TRRC/CVVHDF (contínua, gentil, M27/M28)
  // estável + rápido (K/intoxicação) → HDI (M22)
  // meio-termo → SLED (M31)
  var modalidade;
  if (cronico >= 0.5 && instab < 0.35 && velocidade < 0.5) {
    modalidade = 'DP';
  } else if (instab >= 0.55) {
    modalidade = 'TRRC';
  } else if (velocidade >= 0.55 && instab < 0.45) {
    modalidade = 'HDI';
  } else if (instab >= 0.30) {
    modalidade = 'SLED';
  } else if (velocidade >= 0.55) {
    modalidade = 'HDI';
  } else {
    // estável, sem urgência de velocidade → HDI padrão é a base do intermitente
    modalidade = 'HDI';
  }

  // ----- PRESCRIÇÃO por mecanismo -----
  // primeira sessão muito urêmica → GENTIL (M34): reduzir eficiência para evitar desequilíbrio dialítico
  var muitoUremico = ureia >= 200;
  var gentilPrimeira = muitoUremico;                                          // sinaliza prescrição gentil

  // HDI: Kt/V-alvo e tempo (h). Alvo padrão 1,2/sessão; gentil baixa o alvo e o tempo.
  var ktvAlvo = gentilPrimeira ? 0.9 : 1.2;
  var tempoHDI = gentilPrimeira ? 2.5 : 4.0;                                  // h
  // SLED: estende o tempo, eficiência intermediária
  var tempoSLED = gentilPrimeira ? 6 : 8;                                     // h

  // TRRC: efluente mL/kg/h (~25), catabolismo sobe um pouco (teto 35); doseEfluente total mL/h
  var efluenteDose = clampv(EFLU_ALVO + 8 * catabolismo, 20, 35);            // mL/kg/h
  var efluenteTotal = efluenteDose * pesoKg;                                  // mL/h
  // fração de PRÉ-diluição sobe com catabolismo/hemoconcentração (protege a membrana e reduz coágulo)
  var preFrac = clampv(0.25 + 0.35 * catabolismo, 0.2, 0.6);                  // 0..1

  // DP: dose por trocas/dia (didática) — câmbios de ~2 L
  var trocasDP = 4;

  // UF rate (mL/h) pela TOLERÂNCIA (M24): instável → baixa (UF < refilling); estável + sobrecarga → alta.
  // alvo bruto pela sobrecarga, depois cortado pela instabilidade (não exceder o refilling).
  var ufAlvoBruto = clampv(volume * 1000 / 24, 0, 600);                       // mL/h para tirar a sobrecarga em ~24 h
  var tetoTolerado = clampv(UF_REFILL * (1 - 0.7 * instab), 50, UF_REFILL);   // instável corta o teto
  var ufRate = clampv(Math.min(ufAlvoBruto, tetoTolerado), 0, UF_REFILL);     // mL/h
  var ufLimitadaPorHemodinamica = ufAlvoBruto > tetoTolerado + 1e-9;          // a hemodinâmica limitou a UF

  // ----- ANTICOAGULAÇÃO (M29) -----
  var anticoag = sangramento >= 0.4 ? 'citrato' : 'heparina';

  // ----- alerta de DESEQUILÍBRIO (M34): urêmico + remoção RÁPIDA (HDI eficiente) → risco de edema cerebral
  var removendoRapido = (modalidade === 'HDI' && ktvAlvo >= 1.1 && tempoHDI <= 3.5);
  var alertaDesequilibrio = muitoUremico && (modalidade === 'HDI') && !gentilPrimeira;
  // se gentil acionado em urêmico, o alerta é MITIGADO (a prescrição já é gentil)
  var desequilibrioMitigado = muitoUremico && gentilPrimeira;

  // ----- RESTAURAÇÃO prevista do meio interno -----
  // a diálise corrige por física: K cai por difusão; HCO₃ sobe (tampão do banho/reposição);
  // volume cai pela UF (limitada pela tolerância). Modalidade rápida corrige K mais e mais rápido.
  var fatorRapido = (modalidade === 'HDI') ? 1.0 : (modalidade === 'SLED' ? 0.7 : (modalidade === 'TRRC' ? 0.55 : 0.4));
  var kCorr = clampv(k - (k - 4.2) * (0.55 + 0.4 * fatorRapido), 3.5, 9);     // K previsto pós-sessão/24h
  var hco3Corr = clampv(hco3 + (24 - hco3) * (0.45 + 0.3 * fatorRapido), hco3, 26); // HCO₃ sobe rumo a 24
  // volume removido = UF rate aplicada por uma janela (HDI ~ tempo da sessão; contínua 24 h)
  var horasJanela = (modalidade === 'HDI') ? tempoHDI : (modalidade === 'SLED' ? tempoSLED : 24);
  var volRemovidoL = clampv(ufRate * horasJanela / 1000, 0, volume);          // L tirados na janela
  var volCorr = clampv(volume - volRemovidoL, 0, 20);                         // sobrecarga residual (L)

  // "meio interno restaurado?" — todos os eixos dentro de faixa segura e sem alerta de desequilíbrio
  var meioRestaurado = (kCorr <= 5.5) && (hco3Corr >= 18) && (volCorr <= 3) && !alertaDesequilibrio;

  return {
    // entradas ecoadas
    instabilidade: instabilidade, pam: pam, vasopressor: vasopressor, k: k, hco3: hco3, volume: volume,
    ureia: ureia, sintomas: sintomas, catabolismo: catabolismo, sangramento: sangramento, intoxicacao: intoxicacao,
    pesoKg: pesoKg, cronico: cronico,
    // eixos
    instab: instab, velocidade: velocidade,
    // decisões
    modalidade: modalidade, anticoag: anticoag,
    // prescrição
    ktvAlvo: ktvAlvo, tempoHDI: tempoHDI, tempoSLED: tempoSLED,
    efluenteDose: efluenteDose, efluenteTotal: efluenteTotal, preFrac: preFrac, trocasDP: trocasDP,
    ufRate: ufRate, ufLimitadaPorHemodinamica: ufLimitadaPorHemodinamica,
    gentilPrimeira: gentilPrimeira, muitoUremico: muitoUremico, removendoRapido: removendoRapido,
    // segurança
    alertaDesequilibrio: alertaDesequilibrio, desequilibrioMitigado: desequilibrioMitigado,
    // restauração prevista
    kCorr: kCorr, hco3Corr: hco3Corr, volRemovidoL: volRemovidoL, volCorr: volCorr, meioRestaurado: meioRestaurado
  };
}

/* geometria PURA do ESPAÇO DE DECISÃO (instabilidade × velocidade) — a UI só pinta.
 * Eixo X = velocidade necessária (0→1, esquerda lento, direita rápido).
 * Eixo Y = instabilidade (0 embaixo estável, 1 em cima instável).
 * A polilinha de referência é a FRONTEIRA TRRC↔resto varrida (a "diagonal" da decisão):
 * para cada velocidade, a instabilidade-limiar acima da qual escolhemos contínuo (TRRC). */
function decisionLayout(state, W, H) {
  state = state || {};
  W = clampv(W, 200, 100000); H = clampv(H, 120, 100000);
  var padL = 52, padR = 16, padT = 18, padB = 38, baseY = H - padB;
  var N = 60;
  var pxX = (W - padL - padR) / N, pxY = (baseY - padT) / 1;     // y: instabilidade 0..1
  var base = {};
  for (var kk in state) base[kk] = state[kk];
  var pts = [], i, v, instabLim, mod, lo, hi, mid, j;
  for (i = 0; i <= N; i++) {
    v = i / N;
    // mapeia v na velocidade através de k coerente (velocidade sobe com K)
    var stV = {}; for (var z in base) stV[z] = base[z];
    stV.k = 4.6 + v * 2.0;
    stV.intoxicacao = 0;
    stV.sintomas = base.sintomas !== undefined ? base.sintomas : 0;
    // busca binária da instabilidade-limiar onde a modalidade passa a contínuo (TRRC)
    lo = 0; hi = 1; instabLim = 1;
    for (j = 0; j < 22; j++) {
      mid = (lo + hi) / 2;
      var stm = {}; for (var y in stV) stm[y] = stV[y];
      stm.instabilidade = mid; stm.pam = 80 - mid * 45; stm.vasopressor = mid; stm.cronico = 0;
      mod = capstone(stm).modalidade;
      if (mod === 'TRRC') { instabLim = mid; hi = mid; } else { lo = mid; }
    }
    pts.push({ v: v, instab: instabLim, x: padL + i * pxX, y: baseY - clampv(instabLim, 0, 1) * pxY });
  }
  // ponto de operação atual
  var cur = capstone(state);
  var cx = padL + clampv(cur.velocidade, 0, 1) * N * pxX;
  var cy = baseY - clampv(cur.instab, 0, 1) * pxY;
  return {
    W: W, H: H, padL: padL, padR: padR, padT: padT, padB: padB, baseY: baseY, N: N, pxX: pxX, pxY: pxY,
    axis: { x0: padL, y0: padT, xEnd: W - padR, yEnd: baseY },
    pts: pts,
    current: { x: cx, y: cy, velocidade: cur.velocidade, instab: cur.instab, modalidade: cur.modalidade }
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    clampv: clampv, instabIndex: instabIndex, velocidadeIndex: velocidadeIndex,
    capstone: capstone, decisionLayout: decisionLayout,
    K_RAPIDO: K_RAPIDO, UF_REFILL: UF_REFILL, EFLU_ALVO: EFLU_ALVO
  };
}
