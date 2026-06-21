/* =========================================================================
 * FILTRA · M28 — Dose e fluidos na TRRC: efluente mL/kg/h, pré × pós-diluição
 * ENGINE PURO. Espelhado inline no filtra28.html.
 *
 * TRRC = terapia de substituição renal CONTÍNUA (CVVH/CVVHD/CVVHDF). A dose NÃO é
 * o Kt/V da HDI (M25): é a taxa de EFLUENTE normalizada ao peso, em mL/kg/h.
 *
 * Teses:
 *  - DOSE = EFLUENTE: dose prescrita = Q_efluente / peso (mL/kg/h). Alvo prescrito ~25
 *    (entrega-se ~20–25). A dose ENTREGUE < PRESCRITA por interrupções (downtime).
 *  - PRÉ × PÓS-diluição: o líquido de reposição (convecção/CVVH) entra ANTES do filtro
 *    (pré) → dilui o sangue → clearance EFETIVO menor (fator = Qb/(Qb+Q_pré)), mas
 *    protege o filtro (menos hemoconcentração); ou DEPOIS (pós) → clearance cheio, mas
 *    FRAÇÃO DE FILTRAÇÃO alta → hemoconcentração → coágulo.
 *  - FF = Q_uf / Q_plasma; manter < ~20–25% (pós-diluição) para não coagular.
 *  - clearance ≈ taxa de efluente (solutos pequenos têm sieving ~1), corrigido pela pré-diluição.
 * ========================================================================= */

function clampv(v, a, b) { var n = Number(v); if (!isFinite(n)) n = a; if (n < a) n = a; if (n > b) n = b; return n; }

// merge sem mutar a entrada
function merge(def, inp) {
  var o = {}, k; for (k in def) { o[k] = def[k]; }
  if (inp) { for (k in def) { if (inp[k] !== undefined) o[k] = inp[k]; } }
  return o;
}

var DOSE_ALVO = 25;        // dose-alvo prescrita de TRRC (mL/kg/h) — recomendação RENAL/ATN
var FF_LIMITE = 0.25;      // fração de filtração de alerta (pós-diluição) → risco de coágulo
var HCT_STD = 0.30;        // hematócrito padrão do crítico (fração) → plasma = (1−Hct)·Qb

var DEFAULTS = {
  peso: 70,               // kg
  qEfluente: 1750,        // mL/h — efluente TOTAL (reposição + dialisato + UF líquida)
  qPre: 1000,             // mL/h — reposição PRÉ-filtro
  qPos: 0,                // mL/h — reposição PÓS-filtro
  qb: 150,                // mL/min — fluxo de sangue
  hct: HCT_STD,           // hematócrito (fração)
  downtime: 20            // % do tempo com o circuito parado (trocas, coágulo, exames)
};

// fluxo de plasma (mL/min): só o plasma "filtra"; as hemácias não
function fluxoPlasma(qb, hct) {
  qb = clampv(qb, 1, 600); hct = clampv(hct, 0, 0.7);
  return qb * (1 - hct);
}

// fator de pré-diluição: a reposição pré-filtro dilui o sangue antes de filtrar
// fator = Qb_plasma / (Qb_plasma + Q_pré)  (ambos em mL/min)
function fatorPreDiluicao(qbPlasmaMlMin, qPreMlMin) {
  qbPlasmaMlMin = clampv(qbPlasmaMlMin, 1e-6, 1e6);
  qPreMlMin = clampv(qPreMlMin, 0, 1e6);
  return qbPlasmaMlMin / (qbPlasmaMlMin + qPreMlMin);
}

// função-mãe: a prescrição da dose contínua
function trrc(input) {
  var inp = merge(DEFAULTS, input);
  var peso = clampv(inp.peso, 1, 300);
  var qEfluente = clampv(inp.qEfluente, 0, 12000);   // mL/h
  var qPre = clampv(inp.qPre, 0, 12000);             // mL/h
  var qPos = clampv(inp.qPos, 0, 12000);             // mL/h
  var qb = clampv(inp.qb, 10, 600);                  // mL/min
  var hct = clampv(inp.hct, 0, 0.7);
  var downtime = clampv(inp.downtime, 0, 95);        // %

  // 1) DOSE = EFLUENTE / PESO (mL/kg/h)
  var dosePrescrita = qEfluente / peso;              // mL/kg/h
  // dose ENTREGUE: o circuito fica parado uma fração do tempo (downtime)
  var fracAtiva = 1 - downtime / 100;
  var doseEntregue = dosePrescrita * fracAtiva;      // mL/kg/h

  // 2) hemodinâmica do filtro
  var qPlasma = fluxoPlasma(qb, hct);                // mL/min
  var qPlasmaH = qPlasma * 60;                       // mL/h
  // ultrafiltrado bruto que cruza a membrana por convecção (na CVVH, ≈ a reposição + UF líquida).
  // Aproximação didática: Q_uf que conta para a FF = reposição pós + a fração que sai como efluente
  // convectivo. Usamos o efluente como proxy do volume que cruza a membrana.
  var qUf = qEfluente;                               // mL/h (volume que cruza a membrana)
  // 3) FRAÇÃO DE FILTRAÇÃO = Q_uf / Q_plasma — mas a pré-diluição AUMENTA o plasma efetivo no filtro
  var qPlasmaEfetivo = qPlasmaH + qPre;              // pré-diluição soma volume ao plasma → protege
  var ff = qUf / Math.max(qPlasmaEfetivo, 1e-6);     // fração (0–1+)
  ff = clampv(ff, 0, 2);

  // 4) fator de pré-diluição (penaliza o clearance): plasma/(plasma+pré)
  var qPreMlMin = qPre / 60;
  var fatorPre = fatorPreDiluicao(qPlasma, qPreMlMin);   // ≤ 1
  // clearance ≈ efluente, corrigido pela pré-diluição (solutos pequenos, sieving≈1)
  var clearanceMlMin = (qEfluente / 60) * fatorPre;       // mL/min
  var clearanceEfluenteMlMin = qEfluente / 60;            // mL/min sem a penalidade (referência)

  // alertas de mecanismo
  var coagulo = ff > FF_LIMITE;                       // FF alta → hemoconcentração → coágulo
  var subdose = doseEntregue < 20;                   // alvo de entrega ~20–25
  var entregueMenorPrescrita = doseEntregue < dosePrescrita - 1e-9;
  var prePenaliza = qPre > 0 && fatorPre < 0.999;    // a pré-diluição custou clearance

  return {
    peso: peso, qEfluente: qEfluente, qPre: qPre, qPos: qPos, qb: qb, hct: hct, downtime: downtime,
    dosePrescrita: dosePrescrita, doseEntregue: doseEntregue, fracAtiva: fracAtiva,
    qPlasma: qPlasma, qPlasmaH: qPlasmaH, qUf: qUf, qPlasmaEfetivo: qPlasmaEfetivo,
    ff: ff, fatorPre: fatorPre, clearanceMlMin: clearanceMlMin, clearanceEfluenteMlMin: clearanceEfluenteMlMin,
    coagulo: coagulo, subdose: subdose, entregueMenorPrescrita: entregueMenorPrescrita, prePenaliza: prePenaliza
  };
}

// quanto de efluente (mL/h) para entregar uma dose-alvo num paciente de dado peso
function efluenteParaDose(doseAlvo, peso) {
  doseAlvo = clampv(doseAlvo, 0, 100); peso = clampv(peso, 1, 300);
  return doseAlvo * peso;   // mL/h
}

// geometria PURA: clearance efetivo (mL/min) × taxa de efluente, curvas pré × pós-diluição
function clearanceCurveLayout(state, W, H) {
  state = state || {};
  W = clampv(W, 200, 100000); H = clampv(H, 120, 100000);
  var padL = 54, padR = 16, padT = 18, padB = 38, baseY = H - padB;
  var qb = clampv(state.qb !== undefined ? state.qb : 150, 10, 600);
  var hct = clampv(state.hct !== undefined ? state.hct : HCT_STD, 0, 0.7);
  var qPre = clampv(state.qPre !== undefined ? state.qPre : 1000, 0, 12000);
  var qPlasma = fluxoPlasma(qb, hct);
  var effMin = 0, effMax = 4000, N = 60;    // efluente em mL/h no eixo X
  var yMax = 70;                            // clearance em mL/min no eixo Y
  var pxX = (W - padL - padR) / (effMax - effMin), pxY = (baseY - padT) / yMax;
  var fatorPre = fatorPreDiluicao(qPlasma, qPre / 60);
  var ptsPre = [], ptsPos = [], i, eff, cPre, cPos;
  for (i = 0; i <= N; i++) {
    eff = effMin + (effMax - effMin) * i / N;
    cPos = clampv(eff / 60, 0, yMax);                 // pós: clearance = efluente cheio
    cPre = clampv((eff / 60) * fatorPre, 0, yMax);    // pré: penalizado
    ptsPos.push({ eff: eff, c: cPos, x: padL + (eff - effMin) * pxX, y: baseY - cPos * pxY });
    ptsPre.push({ eff: eff, c: cPre, x: padL + (eff - effMin) * pxX, y: baseY - cPre * pxY });
  }
  var effc = clampv(state.qEfluente !== undefined ? state.qEfluente : 1750, effMin, effMax);
  var cc = clampv((effc / 60) * fatorPre, 0, yMax);
  return {
    W: W, H: H, padL: padL, padR: padR, padT: padT, padB: padB, baseY: baseY,
    effMin: effMin, effMax: effMax, yMax: yMax, pxX: pxX, pxY: pxY, fatorPre: fatorPre,
    axis: { x0: padL, y0: padT, xEnd: W - padR, yEnd: baseY },
    ptsPre: ptsPre, ptsPos: ptsPos,
    current: { x: padL + (effc - effMin) * pxX, y: baseY - cc * pxY, eff: effc, c: cc }
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    clampv: clampv, merge: merge, fluxoPlasma: fluxoPlasma, fatorPreDiluicao: fatorPreDiluicao,
    trrc: trrc, efluenteParaDose: efluenteParaDose, clearanceCurveLayout: clearanceCurveLayout,
    DOSE_ALVO: DOSE_ALVO, FF_LIMITE: FF_LIMITE, HCT_STD: HCT_STD, DEFAULTS: DEFAULTS
  };
}
