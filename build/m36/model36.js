/* =========================================================================
 * FILTRA · M36 — O MOMENTO da substituição renal (TRS): quando iniciar.
 * ENGINE PURO. Espelhado inline no filtra36.html.
 *
 * Teses:
 *  - Iniciar TRS é sobre FUNÇÃO refratária, não sobre o número da creatinina/ureia.
 *    Cada EIXO do meio interno (K, pH/HCO₃, volume, uremia) tem um limiar de
 *    REFRATARIEDADE; quando QUALQUER eixo cruza o refratário → gatilho absoluto → iniciar JÁ.
 *  - precoce × tardio: ELAIN sugeriu benefício precoce; AKIKI e STARRT-AKI NÃO mostraram
 *    benefício de iniciar cedo na maioria → esperar o gatilho clínico é seguro; iniciar cedo
 *    expõe a danos (acesso, hemodinâmica, anticoagulação) sem ganho. O mecanismo, não o número.
 *  - a RESPOSTA ao clínico ABAIXA o score (o eixo está respondendo → não é refratário);
 *    a TENDÊNCIA ascendente sem resposta SOBE o score (caminha para o gatilho).
 *
 * O score de indicação cresce com a gravidade de cada eixo; o gatilho ABSOLUTO dispara
 * quando um eixo cruza o refratário (independe do score total). Recomendação:
 *   gatilho cruzado            → 'iniciar'  (TRS já — função refratária)
 *   score alto + tendência↑    → 'preparar' (sem gatilho ainda, mas caminha — preparar acesso)
 *   demais                     → 'esperar'  (vigiar; iniciar cedo "por precaução" não ajuda)
 * ========================================================================= */

function clampv(v, a, b) { var n = Number(v); if (!isFinite(n)) n = a; if (n < a) n = a; if (n > b) n = b; return n; }

/* limiares de REFRATARIEDADE por eixo (o ponto que pede suporte) */
var K_REFR = 6.5;      // K⁺ (mEq/L) refratário com ECG → gatilho absoluto
var HCO3_REFR = 12;    // HCO₃⁻ (mEq/L) — acidose grave refratária (quanto MENOR, pior)
var VOL_REFR = 7;      // sobrecarga de volume (L acima do seco) refratária = edema pulmonar
var UREIA_REFR = 220;  // ureia (mg/dL) com sintomas urêmicos (pericardite/encefalopatia)

/* gravidade [0..1.4] de cada eixo: 0 = normal, 1 = no limiar refratário (pode passar até 1.4) */
function sevK(k) { k = clampv(k, 2, 9); return clampv((k - 4.0) / (K_REFR - 4.0), 0, 1.4); }
function sevHCO3(h) { h = clampv(h, 2, 30); return clampv((22 - h) / (22 - HCO3_REFR), 0, 1.4); }
function sevVol(v) { v = clampv(v, 0, 20); return clampv(v / VOL_REFR, 0, 1.4); }
function sevUreia(u, sint) { u = clampv(u, 20, 400); sint = clampv(sint, 0, 1);
  var base = clampv(u / UREIA_REFR, 0, 1.4); return clampv(base * (0.55 + 0.45 * sint), 0, 1.4); }

/* função-mãe: avalia o MOMENTO da substituição */
function timing(input) {
  var inp = input || {};
  var k = clampv(inp.k !== undefined ? inp.k : 4.5, 2, 9);                 // K⁺ mEq/L
  var hco3 = clampv(inp.hco3 !== undefined ? inp.hco3 : 22, 2, 30);        // HCO₃⁻ mEq/L
  var volume = clampv(inp.volume !== undefined ? inp.volume : 0, 0, 20);   // L acima do peso seco
  var ureia = clampv(inp.ureia !== undefined ? inp.ureia : 60, 20, 400);   // ureia mg/dL
  var sintomas = clampv(inp.sintomas !== undefined ? inp.sintomas : 0, 0, 1); // sintomas urêmicos 0..1
  var resposta = clampv(inp.resposta !== undefined ? inp.resposta : 0.5, 0, 1); // resposta ao clínico 0..1
  var tendencia = clampv(inp.tendencia !== undefined ? inp.tendencia : 0, -1, 1); // tendência (−melhora..+piora)

  // gravidade por eixo
  var sK = sevK(k), sH = sevHCO3(hco3), sV = sevVol(volume), sU = sevUreia(ureia, sintomas);

  // refratariedade ABSOLUTA por eixo: cruzou o limiar E o clínico não está controlando
  var naoResponde = (1 - resposta);                              // 0 (responde) .. 1 (refratário)
  var gateK = k >= K_REFR && naoResponde > 0.2;
  var gateHCO3 = hco3 <= HCO3_REFR && naoResponde > 0.2;
  var gateVol = volume >= VOL_REFR && naoResponde > 0.2;
  var gateUreia = ureia >= UREIA_REFR && sintomas >= 0.5;        // uremia exige SINTOMAS, não só o número
  var gatilhoCruzado = gateK || gateHCO3 || gateVol || gateUreia;

  // score de indicação 0..100: soma ponderada das gravidades, penalizada pela resposta,
  // amplificada pela tendência ascendente sem resposta
  var sevSoma = (sK + sH + sV + sU) / 4;                         // 0..1.4
  var fatorResposta = 0.35 + 0.65 * naoResponde;                 // responde → encolhe; refratário → cheio
  var fatorTend = 1 + 0.45 * clampv(tendencia, 0, 1) * naoResponde; // piora sem resposta amplifica
  var scoreBruto = sevSoma * fatorResposta * fatorTend * 70;     // escala
  var score = clampv(scoreBruto, 0, 100);
  if (gatilhoCruzado) score = clampv(Math.max(score, 80), 0, 100); // gatilho garante score alto

  // eixo DOMINANTE (a função que mais pede suporte)
  var eixos = [
    { nome: 'potássio', sev: sK, gate: gateK },
    { nome: 'acidose', sev: sH, gate: gateHCO3 },
    { nome: 'volume', sev: sV, gate: gateVol },
    { nome: 'uremia', sev: sU, gate: gateUreia }
  ];
  var dom = eixos[0], i;
  for (i = 1; i < eixos.length; i++) { if (eixos[i].sev > dom.sev + 1e-9) dom = eixos[i]; }
  var eixoDominante = dom.nome;

  // recomendação (enum)
  var recomendacao;
  if (gatilhoCruzado) recomendacao = 'iniciar';
  else if (score >= 55 && tendencia > 0.15) recomendacao = 'preparar';
  else recomendacao = 'esperar';

  // risco do PRECOCE × TARDIO (didático): iniciar cedo sem gatilho adiciona dano (acesso,
  // hemodinâmica, anticoagulação); esperar é seguro até o gatilho, mas tem custo se já refratário.
  var riscoPrecoce = clampv(20 + 60 * (1 - sevSoma / 1.4), 0, 100);  // sem gatilho → dano do "cedo demais"
  var riscoTardio = clampv(gatilhoCruzado ? 75 + 20 * naoResponde : 10 + 45 * sevSoma * clampv(tendencia, 0, 1), 0, 100);
  var janelaSegura = !gatilhoCruzado && riscoTardio < riscoPrecoce; // esperar ainda é seguro

  return {
    k: k, hco3: hco3, volume: volume, ureia: ureia, sintomas: sintomas, resposta: resposta, tendencia: tendencia,
    sevK: sK, sevHCO3: sH, sevVol: sV, sevUreia: sU,
    gateK: gateK, gateHCO3: gateHCO3, gateVol: gateVol, gateUreia: gateUreia, gatilhoCruzado: gatilhoCruzado,
    score: score, eixoDominante: eixoDominante, recomendacao: recomendacao,
    riscoPrecoce: riscoPrecoce, riscoTardio: riscoTardio, janelaSegura: janelaSegura
  };
}

// geometria PURA da curva risco × gravidade (precoce × tardio) — a UI só pinta.
// varre a gravidade global de 0→1, mantém resposta/tendência do estado, plota score, risco precoce e tardio.
function riskCurveLayout(state, W, H) {
  state = state || {};
  W = clampv(W, 200, 100000); H = clampv(H, 120, 100000);
  var padL = 52, padR = 16, padT = 18, padB = 38, baseY = H - padB;
  var N = 60;
  var resposta = clampv(state.resposta !== undefined ? state.resposta : 0.5, 0, 1);
  var tendencia = clampv(state.tendencia !== undefined ? state.tendencia : 0, -1, 1);
  var pxX = (W - padL - padR) / N, pxY = (baseY - padT) / 100;
  var pts = [], ptsPrec = [], ptsTard = [], i, sev, st, r;
  for (i = 0; i <= N; i++) {
    sev = i / N;                                    // gravidade global 0..1 mapeada nos eixos
    // mapeia a gravidade num conjunto de campos coerente (todos os eixos sobem juntos)
    st = {
      k: 4.0 + sev * (K_REFR - 4.0), hco3: 22 - sev * (22 - HCO3_REFR),
      volume: sev * VOL_REFR, ureia: 60 + sev * (UREIA_REFR - 60),
      sintomas: sev, resposta: resposta, tendencia: tendencia
    };
    r = timing(st);
    pts.push({ sev: sev, score: r.score, x: padL + i * pxX, y: baseY - clampv(r.score, 0, 100) * pxY });
    ptsPrec.push({ sev: sev, v: r.riscoPrecoce, x: padL + i * pxX, y: baseY - clampv(r.riscoPrecoce, 0, 100) * pxY });
    ptsTard.push({ sev: sev, v: r.riscoTardio, x: padL + i * pxX, y: baseY - clampv(r.riscoTardio, 0, 100) * pxY });
  }
  // ponto de operação atual (gravidade média do estado real)
  var cur = timing(state);
  var sevCur = clampv((cur.sevK + cur.sevHCO3 + cur.sevVol + cur.sevUreia) / 4, 0, 1);
  var gx = padL + clampv(sevCur, 0, 1) * N * pxX;
  return {
    W: W, H: H, padL: padL, padR: padR, padT: padT, padB: padB, baseY: baseY, N: N, pxX: pxX, pxY: pxY,
    axis: { x0: padL, y0: padT, xEnd: W - padR, yEnd: baseY },
    pts: pts, ptsPrec: ptsPrec, ptsTard: ptsTard,
    current: { x: gx, y: baseY - clampv(cur.score, 0, 100) * pxY, score: cur.score, sev: sevCur, gatilho: cur.gatilhoCruzado }
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    clampv: clampv, sevK: sevK, sevHCO3: sevHCO3, sevVol: sevVol, sevUreia: sevUreia,
    timing: timing, riskCurveLayout: riskCurveLayout,
    K_REFR: K_REFR, HCO3_REFR: HCO3_REFR, VOL_REFR: VOL_REFR, UREIA_REFR: UREIA_REFR
  };
}
