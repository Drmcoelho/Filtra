/* =========================================================================
 * FILTRA · M14 — RAAS e o eixo endócrino renal
 * ENGINE PURO. Espelhado inline no filtra14.html.
 *
 * Tese: o rim NÃO só filtra — é GLÂNDULA. Sente pressão, NaCl e O₂ e responde
 * com hormônios que defendem o meio interno (homeostasia):
 *   - RENINA (células justaglomerulares): 3 estímulos → ↓pressão de perfusão
 *     (barorreceptor renal), ↓NaCl na mácula densa, ↑tônus simpático (β1).
 *   - cascata: angiotensinogênio →(renina)→ Ang I →(ECA, pulmão)→ Ang II.
 *   - Ang II: constrição da EFERENTE (↑P_GC, DEFENDE a TFG), aldosterona,
 *     sede/ADH, reabsorção proximal de Na, vasoconstrição sistêmica (↑PA).
 *   - ALDOSTERONA → ENaC (reabsorve Na, secreta K/H).
 *   - EPO (fibroblastos intersticiais): sentem HIPÓXIA → eritropoese → Hb.
 *     anemia da DRC = perda da FÁBRICA de EPO (massa de néfrons↓).
 *   - VITAMINA D: 25(OH)D →(1-α-hidroxilase, TCP)→ 1,25(OH)₂D (calcitriol) →
 *     absorção intestinal de Ca²⁺. DRC → falha → hipocalcemia → hiperPTH 2ário.
 *
 * Pérolas (provadas pelo motor):
 *   (1) o rim lê o VOLUME circulante efetivo (pressão/NaCl), não a concentração;
 *   (2) a Ang II DEFENDE a TFG pela eferente (gancho M18: não suspender IECA por reflexo);
 *   (3) anemia da DRC = perda da fábrica de EPO;
 *   (4) DRC-DMO = perda da ativação de vit D → hiperPTH secundário.
 * ========================================================================= */

function clampv(v, a, b) { var n = Number(v); if (!isFinite(n)) n = a; if (n < a) n = a; if (n > b) n = b; return n; }

// curva sigmoide normalizada genérica (0..1), centrada e com inclinação k
function sig(x, x0, k) { return 1 / (1 + Math.exp(-clampv(k, 1e-6, 1e3) * (Number(x) - Number(x0)))); }

/* renina relativa (1 = normal) a partir dos três estímulos.
 * pressão de perfusão BAIXA → renina ALTA; NaCl da mácula densa BAIXO → renina ALTA;
 * tônus simpático ALTO → renina ALTA. Saída em [0, 4] (× do normal). */
function reninaFrom(perfusao, naclMD, simpatico) {
  var P = clampv(perfusao, 0, 2);    // pressão de perfusão renal relativa (1 = normal)
  var N = clampv(naclMD, 0, 2);      // NaCl na mácula densa relativo (1 = normal)
  var S = clampv(simpatico, 0, 3);   // tônus simpático relativo (1 = normal)
  // cada estímulo desloca a renina; barorreceptor e mácula densa são inversos, simpático direto
  var rp = 2.0 * (1 - P);            // ↓P → +renina (até +2 quando P=0)
  var rn = 1.6 * (1 - N);            // ↓NaCl → +renina
  var rs = 0.7 * (S - 1);            // simpático acima do normal → +renina
  return clampv(1 + rp + rn + rs, 0, 4);
}

/* eixo endócrino renal completo */
function endocrino(input) {
  var inp = input || {};
  // ENTRADAS sensoriais (o rim como sensor)
  var perfusao = clampv(inp.perfusao !== undefined ? inp.perfusao : 1, 0, 2);   // pressão de perfusão renal (1 = normal)
  var naclMD = clampv(inp.naclMD !== undefined ? inp.naclMD : 1, 0, 2);         // NaCl entregue à mácula densa
  var simpatico = clampv(inp.simpatico !== undefined ? inp.simpatico : 1, 0, 3);// tônus simpático (β1)
  var o2 = clampv(inp.o2 !== undefined ? inp.o2 : 1, 0, 2);                      // oferta de O₂ ao interstício renal (1 = normal)
  var nefrons = clampv(inp.nefrons !== undefined ? inp.nefrons : 1, 0, 1);       // massa funcionante de néfrons (1 = rim íntegro; DRC < 1)
  var eca = clampv(inp.eca !== undefined ? inp.eca : 1, 0, 1);                   // atividade da ECA (1 = normal; IECA reduz; gancho M18)

  // ----- RAAS -----
  var renina = reninaFrom(perfusao, naclMD, simpatico);
  // angiotensinogênio (fígado) é substrato amplo; renina é o passo limitante
  var angI = clampv(renina, 0, 4);                          // proporcional à renina (substrato em excesso)
  var angII = clampv(angI * eca, 0, 4);                     // ECA (pulmão) converte; IECA reduz
  // aldosterona segue a Ang II (zona glomerulosa) + um leve drive direto por K (didático: omitido aqui)
  var aldosterona = clampv(0.4 + angII * 0.6, 0, 3);        // relativa (1 ~ normal quando angII ~ 1)

  // ----- ações da Ang II -----
  // tônus da arteriola EFERENTE (constrição → mantém P_GC e a TFG quando a perfusão cai)
  var tonusEferente = clampv(1 + (angII - 1) * 0.6, 0.3, 3);
  // P_GC defendida: mesmo com perfusão baixa, a eferente sustenta a pressão glomerular
  var pGC = clampv(0.55 * perfusao + 0.45 * (perfusao * tonusEferente), 0.2, 1.6);
  // TFG relativa: cai com a perfusão, mas é amortecida pela eferente (autorregulação humoral)
  var tfg = clampv(pGC, 0.05, 1.6);
  // efeito na pressão arterial sistêmica (vasoconstrição + retenção de Na via aldo)
  var paEfeito = clampv(0.6 + angII * 0.25 + aldosterona * 0.15, 0.4, 2.2); // relativa (1 = normal)
  // manejo de Na/K pela aldosterona (ENaC): retém Na, secreta K
  var retencaoNa = clampv(aldosterona, 0, 3);              // > 1 = retém mais Na
  var plasmaK = clampv(4.2 - (aldosterona - 1) * 0.9, 2.8, 7.5); // aldo↑ → K↓ ; aldo↓ → K↑

  // ----- EPO / Hb -----
  // a fábrica de EPO depende da massa de néfrons (fibroblastos intersticiais) E sente hipóxia
  var epoDrive = clampv((1.4 - o2), 0, 1.4);              // hipóxia (o2<1) → drive↑
  var epo = clampv(nefrons * (0.4 + epoDrive * 2.0), 0, 4); // relativa; DRC (nefrons↓) derruba a EPO
  // hemoglobina de equilíbrio (g/dL): EPO sustenta a eritropoese
  var hb = clampv(7 + epo * 3.2, 5, 17);                  // EPO ~1 → Hb ~10–11; EPO alta → ~16
  var anemiaRenal = (nefrons < 0.6) && (hb < 11);

  // ----- Vitamina D -----
  // 1-α-hidroxilase (TCP) ativa a 25(OH)D em calcitriol; depende da massa de néfrons; PTH estimula
  var pth = clampv(inp.pth !== undefined ? inp.pth : 1, 0, 6);  // PTH relativo (1 = normal); sobe na hipocalcemia
  var alfaHidroxilase = clampv(nefrons * (0.6 + pth * 0.4), 0, 3);
  var calcitriol = clampv(alfaHidroxilase, 0, 3);         // 1,25(OH)₂D relativo
  // cálcio sérico: depende da absorção intestinal (calcitriol) e do PTH (osso/rim)
  var calcioAbsorcao = clampv(calcitriol, 0, 3);
  var calcio = clampv(7.2 + calcioAbsorcao * 1.7, 5.5, 11.5); // mg/dL; calcitriol baixo → hipocalcemia
  // hiperPTH secundário: rim doente → calcitriol↓ → Ca↓ → PTH sobe (resposta apropriada)
  var hiperPTH2 = (nefrons < 0.6) && (calcitriol < 0.8);

  // ----- classificação do estado -----
  var classe;
  if (nefrons < 0.45) classe = 'drc';                 // rim-glândula falhando (EPO/vit D)
  else if (eca < 0.6) classe = 'ieca';                // bloqueio do RAAS (gancho M18)
  else if (perfusao < 0.6 || naclMD < 0.6) classe = 'hipoperfusao'; // rim defende a TFG/volume
  else if (simpatico > 1.6) classe = 'simpatico';
  else classe = 'normal';

  return {
    perfusao: perfusao, naclMD: naclMD, simpatico: simpatico, o2: o2, nefrons: nefrons, eca: eca, pth: pth,
    renina: renina, angI: angI, angII: angII, aldosterona: aldosterona,
    tonusEferente: tonusEferente, pGC: pGC, tfg: tfg, paEfeito: paEfeito,
    retencaoNa: retencaoNa, plasmaK: plasmaK,
    epoDrive: epoDrive, epo: epo, hb: hb, anemiaRenal: anemiaRenal,
    alfaHidroxilase: alfaHidroxilase, calcitriol: calcitriol, calcio: calcio, hiperPTH2: hiperPTH2,
    classe: classe
  };
}

/* geometria PURA da curva renina × pressão de perfusão (a UI só pinta).
 * mostra o sensor barorreceptor: ↓pressão → ↑renina, mantendo NaCl/simpático no estado atual. */
function endocrinoLayout(state, W, H) {
  state = state || {};
  W = clampv(W, 200, 100000); H = clampv(H, 120, 100000);
  var padL = 52, padR = 16, padT = 18, padB = 38, baseY = H - padB;
  var pMin = 0, pMax = 2, N = 56;
  var pxX = (W - padL - padR) / (pMax - pMin);
  var yMin = 0, yMax = 4;            // renina relativa
  var pxY = (baseY - padT) / (yMax - yMin);
  var nacl = clampv(state.naclMD !== undefined ? state.naclMD : 1, 0, 2);
  var simp = clampv(state.simpatico !== undefined ? state.simpatico : 1, 0, 3);
  var pts = [], i, p, r;
  for (i = 0; i <= N; i++) {
    p = pMin + (pMax - pMin) * i / N;
    r = reninaFrom(p, nacl, simp);
    pts.push({ perfusao: p, renina: r, x: padL + (p - pMin) * pxX, y: baseY - (clampv(r, yMin, yMax) - yMin) * pxY });
  }
  var cur = endocrino(state);
  var pc = clampv(cur.perfusao, pMin, pMax);
  return {
    W: W, H: H, padL: padL, padR: padR, padT: padT, padB: padB, baseY: baseY,
    pMin: pMin, pMax: pMax, yMin: yMin, yMax: yMax, pxX: pxX, pxY: pxY,
    axis: { x0: padL, y0: padT, xEnd: W - padR, yEnd: baseY },
    pts: pts,
    current: { x: padL + (pc - pMin) * pxX, y: baseY - (clampv(cur.renina, yMin, yMax) - yMin) * pxY, perfusao: pc, renina: cur.renina }
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { clampv: clampv, sig: sig, reninaFrom: reninaFrom, endocrino: endocrino, endocrinoLayout: endocrinoLayout };
}
