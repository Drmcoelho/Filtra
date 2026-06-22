/* =========================================================================
 * FILTRA · M29 — ANTICOAGULAÇÃO DO CIRCUITO: citrato regional × heparina.
 * ENGINE PURO. Espelhado inline no filtra29.html.
 *
 * A TESE. O circuito extracorpóreo COAGULA sem anticoagulante (sangue parado
 * sobre superfícies estranhas). Mas anticoagular o PACIENTE faz ele SANGRAR.
 * A saída é a anticoagulação REGIONAL: agir só no circuito, não no doente.
 *
 *  1) CITRATO REGIONAL (a chave da quelação)
 *     O citrato infunde ANTES do filtro e QUELA o Ca²⁺ ionizado do sangue do
 *     circuito. O Ca²⁺ é COFATOR da cascata de coagulação (fatores II, VII, IX,
 *     X dependem de Ca²⁺). Sem Ca²⁺ ionizado, a cascata NÃO dispara → o circuito
 *     não coagula. Alvo do Ca²⁺ ionizado pós-filtro (no circuito): ~0,25–0,35
 *     mmol/L (anticoagulação local). DEPOIS do filtro, repõe-se cálcio (mmol/h)
 *     para devolver o Ca²⁺ SISTÊMICO ao normal (~1,1–1,3 mmol/L). O paciente
 *     NUNCA fica anticoagulado: só o circuito.
 *
 *  2) ACÚMULO DE CITRATO (o perigo do fígado ruim)
 *     O citrato que volta ao paciente é METABOLIZADO (fígado/músculo) a
 *     bicarbonato + Ca²⁺ liberado. Se o clearance hepático cai (choque,
 *     insuficiência hepática, lactato alto), o citrato ACUMULA. O citrato
 *     circulante quela Ca²⁺ SISTÊMICO → o Ca²⁺ IONIZADO cai mas o Ca TOTAL sobe
 *     (citrato-Ca conta no total). O sinal: a razão Ca_total/Ca_ionizado SOBE.
 *     Razão > 2,5 é ALARME de acúmulo → contraindica/reduz o citrato.
 *
 *  3) HEPARINA (sistêmica, simples, sangra)
 *     A heparina anticoagula o PACIENTE INTEIRO (potencia a antitrombina →
 *     TTPa↑). Sem proteção regional: o risco de sangramento sobe com a dose.
 *     Simples e barata — escolha de quem NÃO sangra.
 *
 *  ESCOLHA (a função-mãe): sangra muito (e fígado bom) → CITRATO; fígado ruim
 *  (acúmulo) → não-citrato; baixo risco de sangrar → HEPARINA.
 *
 * PÉROLAS provadas pelo motor:
 *   • o citrato anticoagula SÓ o circuito (Ca circuito baixo, Ca sistêmico normal).
 *   • o paciente que SANGRA prefere citrato (não anticoagula o doente).
 *   • o fígado RUIM contraindica o citrato pelo ACÚMULO (gap Ca total/ionizado↑).
 *
 * DOSES de DIÁLISE/infusão SEM massa solta: mmol/L, mmol/h, mL/h, %, razão.
 * ========================================================================= */

function clampv(v, a, b) { var n = Number(v); if (!isFinite(n)) n = a; if (n < a) n = a; if (n > b) n = b; return n; }

/* alvos de referência (mmol/L) */
var CA_CIRC_ALVO_LO = 0.25;   // Ca²⁺ ionizado no circuito — piso anticoagulante
var CA_CIRC_ALVO_HI = 0.35;   // teto da janela anticoagulante
var CA_SIST_ALVO = 1.20;      // Ca²⁺ ionizado sistêmico-alvo (mmol/L)
var GAP_ALARME = 2.5;         // razão Ca_total/Ca_ionizado que alarma acúmulo

/* -------------------------------------------------------------------------
 * CITRATO REGIONAL — quelação do Ca²⁺ no circuito.
 * citratoDose em mmol de citrato por LITRO de sangue (típico 2,5–4,0 mmol/L);
 * qb = fluxo de sangue (mL/min). caBasal = Ca²⁺ ionizado de entrada (mmol/L).
 * O Ca²⁺ ionizado pós-citrato cai com a dose (quelação saturante).
 * ------------------------------------------------------------------------- */
function citrato(inp) {
  inp = inp || {};
  var citratoDose = clampv(inp.citratoDose !== undefined ? inp.citratoDose : 3.0, 0, 8);   // mmol/L de sangue
  var qb = clampv(inp.qb !== undefined ? inp.qb : 150, 50, 350);                            // mL/min
  var caBasal = clampv(inp.caBasal !== undefined ? inp.caBasal : 1.15, 0.4, 1.6);           // mmol/L
  var caReposicao = clampv(inp.caReposicao !== undefined ? inp.caReposicao : 1.7, 0, 6);    // mmol/h reposição p/ retorno

  // Ca²⁺ ionizado no circuito: quelação saturante. Cada mmol/L de citrato quela
  // uma fração do Ca; modelamos decaimento exponencial até um piso.
  var quela = 1 - Math.exp(-0.85 * citratoDose);                 // 0..1, satura com a dose
  var caCircuito = clampv(caBasal * (1 - 0.97 * quela), 0.05, caBasal); // mmol/L pós-filtro no circuito

  // carga de citrato infundida ao paciente (mmol/h) = dose × fluxo de sangue
  var qbLh = qb * 60 / 1000;                                     // L/h de sangue
  var cargaCitrato = citratoDose * qbLh;                         // mmol/h de citrato ao paciente

  // anticoagulação adequada quando o Ca circuito cai dentro/abaixo da janela alvo
  var anticoagulado = caCircuito <= CA_CIRC_ALVO_HI;
  var subdosado = caCircuito > CA_CIRC_ALVO_HI;                  // circuito ainda coagula
  var sobredosado = caCircuito < CA_CIRC_ALVO_LO - 1e-9;         // quelação excessiva

  return {
    citratoDose: citratoDose, qb: qb, caBasal: caBasal, caReposicao: caReposicao,
    quela: quela, caCircuito: caCircuito, qbLh: qbLh, cargaCitrato: cargaCitrato,
    anticoagulado: anticoagulado, subdosado: subdosado, sobredosado: sobredosado
  };
}

/* -------------------------------------------------------------------------
 * ACÚMULO DE CITRATO — clearance hepático reduzido → citrato sobe → quela Ca
 * sistêmico → gap Ca_total/Ca_ionizado sobe.
 * funcaoHepatica em [0..1] (1 = normal, 0 = falência total).
 * cargaCitrato em mmol/h (vinda do citrato regional).
 * ------------------------------------------------------------------------- */
function acumuloCitrato(inp) {
  inp = inp || {};
  var funcaoHepatica = clampv(inp.funcaoHepatica !== undefined ? inp.funcaoHepatica : 1.0, 0, 1);
  var cargaCitrato = clampv(inp.cargaCitrato !== undefined ? inp.cargaCitrato : 18, 0, 120);  // mmol/h
  var caReposicao = clampv(inp.caReposicao !== undefined ? inp.caReposicao : 1.7, 0, 6);       // mmol/h
  var caSistBasal = clampv(inp.caSistBasal !== undefined ? inp.caSistBasal : 1.20, 0.5, 1.6);  // mmol/L

  // clearance de citrato proporcional à função hepática; citrato acumulado = carga não depurada.
  var clearanceRel = clampv(0.08 + 0.92 * funcaoHepatica, 0.05, 1);          // fração depurada
  var citratoNaoDepurado = cargaCitrato * (1 - clearanceRel);                // mmol/h "sobrando"
  // citrato sérico acumulado (mmol/L, proxy): sobe com o não-depurado, satura
  var citratoSerico = clampv(0.2 + 0.06 * citratoNaoDepurado, 0.1, 2.5);     // mmol/L (proxy didático)

  // o citrato sérico quela Ca²⁺ ionizado sistêmico; a reposição tenta compensar.
  var caIonizado = clampv(caSistBasal + 0.10 * (caReposicao - 1.7) - 0.32 * (citratoSerico - 0.2), 0.5, 1.6);
  // Ca TOTAL = ionizado + cálcio LIGADO ao citrato + ligação basal à albumina
  var caLigadoCitrato = 0.55 * citratoSerico;                                // mmol/L de Ca preso ao citrato
  var caTotal = clampv(caIonizado + caLigadoCitrato + 0.9, 1.0, 4.5);        // +0,9 da ligação à albumina basal
  var gap = clampv(caTotal / Math.max(caIonizado, 0.05), 1.0, 12);           // razão total/ionizado

  var alarmeAcumulo = gap > GAP_ALARME;                                      // acúmulo de citrato

  return {
    funcaoHepatica: funcaoHepatica, cargaCitrato: cargaCitrato, caReposicao: caReposicao,
    clearanceRel: clearanceRel, citratoNaoDepurado: citratoNaoDepurado, citratoSerico: citratoSerico,
    caIonizado: caIonizado, caLigadoCitrato: caLigadoCitrato, caTotal: caTotal, gap: gap,
    alarmeAcumulo: alarmeAcumulo
  };
}

/* -------------------------------------------------------------------------
 * HEPARINA — sistêmica. dose ADIMENSIONAL [0..1] (fração da dose plena) para
 * fugir de "massa solta". O efeito é TTPa↑ (razão) e risco de sangramento.
 * dose [0..1]; sangramentoBasal [0..1].
 * ------------------------------------------------------------------------- */
function heparina(inp) {
  inp = inp || {};
  var dose = clampv(inp.dose !== undefined ? inp.dose : 0.5, 0, 1);                 // fração da dose plena
  var sangramentoBasal = clampv(inp.sangramentoBasal !== undefined ? inp.sangramentoBasal : 0.2, 0, 1);

  // TTPa relativo ao basal (razão): sobe com a dose (1,0 = basal, ~2,6 = pleno)
  var ttpaRatio = clampv(1.0 + 1.6 * dose, 1.0, 3.0);
  // risco de sangramento: basal + contribuição sistêmica (sem proteção regional)
  var riscoSangramento = clampv(sangramentoBasal + 0.7 * dose, 0, 1);
  var regional = false;     // heparina é SISTÊMICA

  return {
    dose: dose, sangramentoBasal: sangramentoBasal, ttpaRatio: ttpaRatio,
    riscoSangramento: riscoSangramento, regional: regional
  };
}

/* -------------------------------------------------------------------------
 * FUNÇÃO-MÃE — escolhe e avalia citrato × heparina; retorna Ca circuito, Ca
 * sistêmico, gap, alarme de acúmulo e risco de sangramento.
 * ------------------------------------------------------------------------- */
function anticoagulacao(input) {
  var inp = input || {};
  var sangramento = clampv(inp.sangramento !== undefined ? inp.sangramento : 0.2, 0, 1);     // risco do paciente
  var funcaoHepatica = clampv(inp.funcaoHepatica !== undefined ? inp.funcaoHepatica : 1.0, 0, 1);
  var citratoDose = clampv(inp.citratoDose !== undefined ? inp.citratoDose : 3.0, 0, 8);     // mmol/L de sangue
  var qb = clampv(inp.qb !== undefined ? inp.qb : 150, 50, 350);                              // mL/min
  var caBasal = clampv(inp.caBasal !== undefined ? inp.caBasal : 1.15, 0.4, 1.6);             // mmol/L
  var caReposicao = clampv(inp.caReposicao !== undefined ? inp.caReposicao : 1.7, 0, 6);      // mmol/h
  var caSistBasal = clampv(inp.caSistBasal !== undefined ? inp.caSistBasal : 1.20, 0.5, 1.6); // mmol/L
  var heparinaDose = clampv(inp.heparinaDose !== undefined ? inp.heparinaDose : 0.5, 0, 1);   // fração

  // --- ramo CITRATO ---
  var cit = citrato({ citratoDose: citratoDose, qb: qb, caBasal: caBasal, caReposicao: caReposicao });
  var acc = acumuloCitrato({ funcaoHepatica: funcaoHepatica, cargaCitrato: cit.cargaCitrato, caReposicao: caReposicao, caSistBasal: caSistBasal });

  // --- ramo HEPARINA ---
  var hep = heparina({ dose: heparinaDose, sangramentoBasal: sangramento });

  // --- ESCOLHA por mecanismo ---
  var figadoRuim = funcaoHepatica < 0.4;
  var modalidade, motivo;
  if (sangramento >= 0.4 && !figadoRuim) {
    modalidade = 'citrato';
    motivo = 'paciente sangra e o fígado depura o citrato → regional, não anticoagula o doente';
  } else if (sangramento >= 0.4 && figadoRuim) {
    modalidade = 'heparina';
    motivo = 'sangra MAS fígado ruim contraindica citrato (acúmulo) → heparina/sem anticoag com cautela';
  } else {
    modalidade = 'heparina';
    motivo = 'baixo risco de sangrar → heparina sistêmica, mais simples';
  }

  // citrato seguro só se não houver acúmulo previsto
  var citratoContraindicado = figadoRuim || acc.alarmeAcumulo;
  var citratoSeguro = (modalidade === 'citrato') && !citratoContraindicado;

  // risco de sangramento RESULTANTE da escolha
  var riscoSangramentoResultante = (modalidade === 'citrato')
    ? clampv(sangramento, 0, 1)                 // regional: paciente não anticoagulado → ≈ basal
    : hep.riscoSangramento;                     // heparina: basal + incremento sistêmico

  var caCircuito = cit.caCircuito;
  var caSistemico = acc.caIonizado;
  var gap = acc.gap;
  var alarmeAcumulo = acc.alarmeAcumulo;

  // circuito protegido? citrato: na janela E sem acúmulo; heparina: TTPa elevado
  var circuitoProtegido = (modalidade === 'citrato')
    ? (cit.anticoagulado && !alarmeAcumulo)
    : (hep.ttpaRatio >= 1.8);

  return {
    // entradas ecoadas
    sangramento: sangramento, funcaoHepatica: funcaoHepatica, citratoDose: citratoDose, qb: qb,
    caBasal: caBasal, caReposicao: caReposicao, caSistBasal: caSistBasal, heparinaDose: heparinaDose,
    // decisão
    modalidade: modalidade, motivo: motivo, figadoRuim: figadoRuim,
    citratoContraindicado: citratoContraindicado, citratoSeguro: citratoSeguro,
    // ramo citrato
    quela: cit.quela, cargaCitrato: cit.cargaCitrato, citratoSubdosado: cit.subdosado, citratoSobredosado: cit.sobredosado,
    citratoSerico: acc.citratoSerico, caLigadoCitrato: acc.caLigadoCitrato, caTotal: acc.caTotal,
    // ramo heparina
    ttpaRatio: hep.ttpaRatio,
    // saídas-chave
    caCircuito: caCircuito, caSistemico: caSistemico, gap: gap, alarmeAcumulo: alarmeAcumulo,
    riscoSangramento: riscoSangramentoResultante, circuitoProtegido: circuitoProtegido
  };
}

/* -------------------------------------------------------------------------
 * LAYOUT PURO — geometria para o canvas (canvas ≡ engine, tol 1e-6).
 *  (A) Ca²⁺ ionizado ao longo do CIRCUITO: paciente (caBasal) → pós-citrato
 *      (caCircuito, baixo, anticoagula) → retorno (caSistemico, normal de volta).
 *  (B) curva gap × função hepática: para cada funcaoHepatica em [0..1], o gap
 *      Ca_total/Ca_ionizado previsto — sobe no fígado ruim.
 * ------------------------------------------------------------------------- */
function caLayout(state, W, H) {
  state = state || {};
  W = clampv(W, 200, 100000); H = clampv(H, 120, 100000);
  var padL = 54, padR = 18, padT = 20, padB = 40, baseY = H - padB;
  var plotW = W - padL - padR, plotH = baseY - padT;
  var base = {}; for (var kk in state) base[kk] = state[kk];

  var r = anticoagulacao(base);

  // (A) três estações do circuito (mmol/L), eixo Y = Ca²⁺ ionizado 0..1.6
  var caMax = 1.6;
  function yCa(ca) { return baseY - clampv(ca, 0, caMax) / caMax * plotH; }
  var stations = [
    { nome: 'paciente', ca: r.caBasal, x: padL + plotW * 0.12 },
    { nome: 'pós-citrato', ca: r.caCircuito, x: padL + plotW * 0.50 },
    { nome: 'retorno', ca: r.caSistemico, x: padL + plotW * 0.88 }
  ];
  for (var s = 0; s < stations.length; s++) { stations[s].y = yCa(stations[s].ca); }

  // janela anticoagulante (faixa alvo do Ca circuito) em coordenadas Y
  var bandHi = yCa(CA_CIRC_ALVO_HI), bandLo = yCa(CA_CIRC_ALVO_LO);

  // (B) curva gap × função hepática (N pontos), eixo Y = gap 0..gapMax
  var N = 48, gapMax = 6, pts = [];
  for (var i = 0; i <= N; i++) {
    var fh = i / N;
    var stm = {}; for (var z in base) stm[z] = base[z];
    stm.funcaoHepatica = fh;
    var rg = anticoagulacao(stm);
    pts.push({
      fh: fh, gap: rg.gap,
      x: padL + (i / N) * plotW,
      y: baseY - clampv(rg.gap, 0, gapMax) / gapMax * plotH
    });
  }
  var alarmY = baseY - clampv(GAP_ALARME, 0, gapMax) / gapMax * plotH;
  var curX = padL + clampv(r.funcaoHepatica, 0, 1) * plotW;
  var curY = baseY - clampv(r.gap, 0, gapMax) / gapMax * plotH;

  return {
    W: W, H: H, padL: padL, padR: padR, padT: padT, padB: padB, baseY: baseY, plotW: plotW, plotH: plotH,
    caMax: caMax, gapMax: gapMax,
    axis: { x0: padL, y0: padT, xEnd: W - padR, yEnd: baseY },
    stations: stations, bandHi: bandHi, bandLo: bandLo,
    N: N, pts: pts, alarmY: alarmY,
    current: { x: curX, y: curY, funcaoHepatica: r.funcaoHepatica, gap: r.gap, modalidade: r.modalidade, alarme: r.alarmeAcumulo }
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    clampv: clampv, citrato: citrato, acumuloCitrato: acumuloCitrato, heparina: heparina,
    anticoagulacao: anticoagulacao, caLayout: caLayout,
    CA_CIRC_ALVO_LO: CA_CIRC_ALVO_LO, CA_CIRC_ALVO_HI: CA_CIRC_ALVO_HI,
    CA_SIST_ALVO: CA_SIST_ALVO, GAP_ALARME: GAP_ALARME
  };
}
