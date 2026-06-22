/* =========================================================================
 * FILTRA · M27 — Terapias contínuas (TRRC/CRRT): CVVH (convecção) × CVVHD
 * (difusão) × CVVHDF (os dois). Por que "contínuo".
 * ENGINE PURO. Espelhado inline no filtra27.html.
 *
 * TESE: a TRRC remove SOLUTO e VOLUME devagar e CONTÍNUO (24 h). Troca a
 * eficiência POR HORA pela gentileza hemodinâmica (UF < refilling, ponte M23/M24).
 * O instável tolera porque a remoção é lenta e sustentada — não rápida.
 *
 *  TRÊS MODOS, TRÊS FÍSICAS (M19):
 *   - CVVH  (convectivo): o clearance vem do ARRASTE por solvente. Repõe-se fluido
 *     (reposição) e ultrafiltra-se MUITO; o soluto é carregado junto com a água.
 *     clearance ≈ taxa de efluente convectivo × sieving. A pré-diluição DILUI o
 *     plasma que chega ao filtro → clearance EFETIVO cai (fator plasma/(plasma+pré)).
 *   - CVVHD (difusivo): dialisato em CONTRACORRENTE; o soluto difunde pelo gradiente
 *     de concentração. No fluxo BAIXO da TRRC o dialisato SATURA → clearance ≈ Qd
 *     para pequenos solutos (a eficiência da membrana, KoA, deixa de limitar).
 *   - CVVHDF: SOMA difusivo + convectivo, com desconto de INTERAÇÃO (a convecção
 *     "rouba" gradiente da difusão; o total é < soma ingênua).
 *
 *  FUNÇÃO-MÃE trrc(input): dado o modo, Qb, Qd, Qf (UF), pré/pós-diluição e peso →
 *   clearance total (mL/min), dose de efluente (mL/kg/h) e a comparação com a HDI
 *   (eficiência/hora baixa, mas dose/24 h adequada). Mostra por que o instável tolera.
 *
 *  LAYOUT PURO clearanceLayout(state,W,H): geometria clearance × fluxo (varre Qf no
 *   convectivo ou Qd no difusivo) para o canvas (canvas ≡ engine, tol 1e-6).
 *
 * UNIDADES: mL/min (Qb/Qd/Qf, clearance), mL/kg/h (dose de efluente), mL/h, %.
 *   §8 (DIALISA): SEM dose de massa solta (mg/mcg/µg). mEq/L aparece no soluto.
 *
 * PÉROLA: "contínuo" = clearance/hora BAIXO (≈ 25–45 mL/min, vs ~200+ da HDI),
 *   mas a DOSE/24 h é adequada porque o tempo é 24 h; e o instável TOLERA porque a
 *   UF é lenta (UF < refilling). Pós-diluição é mais eficiente, mas coagula mais.
 * ========================================================================= */

function clampv(v, a, b) { var n = Number(v); if (!isFinite(n)) n = a; if (n < a) n = a; if (n > b) n = b; return n; }

/* referências (espelham M19/M28) */
var SIEVING_PEQ = 1.0;   // coeficiente de sieving de soluto pequeno (ureia ≈ 1)
var QD_SAT = 0.95;       // no fluxo baixo da TRRC o dialisato satura ~95% → clearance ≈ Qd
var INTERACAO = 0.12;    // desconto de interação difusão↔convecção no CVVHDF
var CL_HDI = 200;        // clearance típico de ureia na HDI (mL/min) — referência de "rápido"

/* hematócrito → fração plasmática (o plasma é o que carrega o soluto na convecção) */
function fracPlasma(hct) { hct = clampv(hct, 0.10, 0.65); return 1 - hct; }

/* --- CVVH: clearance convectivo. qf em mL/min, sieving 0..1, preFrac 0..1 (fração da reposição PRÉ-filtro)
 * A pré-diluição dilui o plasma que chega ao filtro: fator = plasma/(plasma + pré).
 * Modelamos o fator de diluição como qPlasma/(qPlasma + preFrac·qf). */
function cvvh(o) {
  o = o || {};
  var qf = clampv(o.qf, 0, 80);                 // ultrafiltração/efluente convectivo (mL/min)
  var sieving = clampv(o.sieving !== undefined ? o.sieving : SIEVING_PEQ, 0, 1);
  var preFrac = clampv(o.preFrac !== undefined ? o.preFrac : 0, 0, 1);     // fração de reposição pré-filtro
  var qPlasma = clampv(o.qPlasma !== undefined ? o.qPlasma : 120, 10, 400);// fluxo plasmático (mL/min)
  // diluição pré-filtro: o plasma que chega ao filtro é diluído pela reposição pré.
  var fatorPre = clampv(qPlasma / (qPlasma + preFrac * qf), 0, 1);
  var clear = qf * sieving * fatorPre;          // clearance convectivo (mL/min)
  return clampv(clear, 0, 80);
}

/* --- CVVHD: clearance difusivo. qd em mL/min; no fluxo baixo o dialisato satura → clearance ≈ Qd·sat.
 * koa modula a aproximação à saturação (membrana ruim aproxima menos); sieving para pequenos ≈ 1. */
function cvvhd(o) {
  o = o || {};
  var qd = clampv(o.qd, 0, 80);                 // fluxo de dialisato (mL/min)
  var sieving = clampv(o.sieving !== undefined ? o.sieving : SIEVING_PEQ, 0, 1);
  var koa = clampv(o.koa !== undefined ? o.koa : 600, 50, 1200);
  // saturação efetiva: cresce com KoA, satura ~QD_SAT no fluxo baixo da TRRC
  var sat = clampv(QD_SAT * (1 - Math.exp(-koa / 300)), 0, 1);
  var clear = qd * sat * sieving;               // clearance difusivo (mL/min)
  return clampv(clear, 0, 80);
}

/* --- CVVHDF: soma difusivo + convectivo, com desconto de interação. */
function cvvhdf(o) {
  o = o || {};
  var cd = cvvhd(o);
  var cc = cvvh(o);
  var clear = (cd + cc) * (1 - INTERACAO);
  return clampv(clear, 0, 120);
}

/* FUNÇÃO-MÃE: a sessão de TRRC, modo a modo, com a dose de efluente e a comparação com a HDI. */
function trrc(input) {
  var inp = input || {};
  var modo = inp.modo;
  if (modo !== 'CVVH' && modo !== 'CVVHD' && modo !== 'CVVHDF') modo = 'CVVHDF';
  var qb = clampv(inp.qb !== undefined ? inp.qb : 150, 50, 350);             // sangue (mL/min)
  var qd = clampv(inp.qd !== undefined ? inp.qd : 25, 0, 80);                // dialisato (mL/min)
  var qf = clampv(inp.qf !== undefined ? inp.qf : 25, 0, 80);               // UF/efluente convectivo (mL/min)
  var preFrac = clampv(inp.preFrac !== undefined ? inp.preFrac : 0.3, 0, 1); // fração pré-diluição
  var sieving = clampv(inp.sieving !== undefined ? inp.sieving : SIEVING_PEQ, 0, 1);
  var koa = clampv(inp.koa !== undefined ? inp.koa : 600, 50, 1200);
  var hct = clampv(inp.hct !== undefined ? inp.hct : 0.30, 0.10, 0.65);
  var pesoKg = clampv(inp.pesoKg !== undefined ? inp.pesoKg : 70, 30, 200);  // kg
  var ufLiquida = clampv(inp.ufLiquida !== undefined ? inp.ufLiquida : 100, 0, 600); // remoção de VOLUME líquida (mL/h)
  var refilling = clampv(inp.refilling !== undefined ? inp.refilling : 400, 50, 800); // refilling plasmático (mL/h)

  var qPlasma = qb * fracPlasma(hct);           // mL/min — o plasma carrega o soluto

  // clearance por física, conforme o modo
  var clConv = 0, clDif = 0;
  if (modo === 'CVVH') { clConv = cvvh({ qf: qf, sieving: sieving, preFrac: preFrac, qPlasma: qPlasma }); }
  else if (modo === 'CVVHD') { clDif = cvvhd({ qd: qd, sieving: sieving, koa: koa }); }
  else { // CVVHDF
    clDif = cvvhd({ qd: qd, sieving: sieving, koa: koa });
    clConv = cvvh({ qf: qf, sieving: sieving, preFrac: preFrac, qPlasma: qPlasma });
  }
  var clearanceBruto = clDif + clConv;
  // CVVHDF: aplica o desconto de interação ao TOTAL (a convecção rouba gradiente da difusão)
  var clearanceTotal = (modo === 'CVVHDF') ? clearanceBruto * (1 - INTERACAO) : clearanceBruto;
  clearanceTotal = clampv(clearanceTotal, 0, 120);

  // dose de EFLUENTE: a água que sai (difusato + ultrafiltrado) por kg por hora
  // efluente total (mL/min) = qd (no difusivo) + qf (no convectivo), conforme o modo
  var efluenteMin = 0;
  if (modo === 'CVVH') efluenteMin = qf;
  else if (modo === 'CVVHD') efluenteMin = qd;
  else efluenteMin = qd + qf;
  var efluenteMlH = efluenteMin * 60;                         // mL/h
  var doseEfluente = clampv(efluenteMlH / pesoKg, 0, 60);      // mL/kg/h

  // DOSE/24 h em "volume depurado": clearance × tempo. Comparação com a HDI (4 h).
  var volDepuradoTRRC = clearanceTotal * 60 * 24;             // mL depurados em 24 h (TRRC contínua)
  var volDepuradoHDI = CL_HDI * 60 * 4;                       // mL depurados numa sessão HDI de 4 h
  var razaoEficienciaHora = clampv(clearanceTotal / CL_HDI, 0, 1); // eficiência/hora da TRRC vs HDI (baixa!)
  var razaoDose24h = clampv(volDepuradoTRRC / volDepuradoHDI, 0, 5); // dose/24h: TRRC alcança/ultrapassa a HDI

  // PÉROLA quantitativa: eficiência/hora baixa, mas dose/24 h adequada (≥~1 ⇒ alcança a HDI)
  var doseAdequada24h = razaoDose24h >= 0.9;
  var eficienciaHoraBaixa = razaoEficienciaHora < 0.4;        // < 40% da HDI por hora

  // TOLERÂNCIA hemodinâmica: a remoção de VOLUME (ufLiquida) deve ficar < refilling (M24)
  var ufExcedeRefilling = ufLiquida > refilling + 1e-9;
  var toleraVolume = !ufExcedeRefilling;
  var margemRefilling = clampv(refilling - ufLiquida, -600, 800); // mL/h de folga (negativo = risco)

  // pós-diluição é mais eficiente (não dilui o plasma) mas coagula mais (FF maior)
  var fracaoFiltracao = clampv(qf / Math.max(qPlasma, 1), 0, 1); // FF = Q_uf/Q_plasma
  var coagulaMais = (preFrac < 0.2) && (fracaoFiltracao > 0.20);  // pós-diluição com FF alta → coágulo
  var preProtege = preFrac >= 0.2;                                // pré-diluição protege a membrana

  return {
    // entradas ecoadas
    modo: modo, qb: qb, qd: qd, qf: qf, preFrac: preFrac, sieving: sieving, koa: koa, hct: hct,
    pesoKg: pesoKg, ufLiquida: ufLiquida, refilling: refilling,
    // físicas
    qPlasma: qPlasma, clDif: clDif, clConv: clConv, clearanceBruto: clearanceBruto, clearanceTotal: clearanceTotal,
    // dose
    efluenteMin: efluenteMin, efluenteMlH: efluenteMlH, doseEfluente: doseEfluente,
    // comparação contínuo × intermitente
    volDepuradoTRRC: volDepuradoTRRC, volDepuradoHDI: volDepuradoHDI,
    razaoEficienciaHora: razaoEficienciaHora, razaoDose24h: razaoDose24h,
    doseAdequada24h: doseAdequada24h, eficienciaHoraBaixa: eficienciaHoraBaixa,
    // tolerância
    ufExcedeRefilling: ufExcedeRefilling, toleraVolume: toleraVolume, margemRefilling: margemRefilling,
    // diluição
    fracaoFiltracao: fracaoFiltracao, coagulaMais: coagulaMais, preProtege: preProtege
  };
}

/* geometria PURA do clearance × FLUXO — a UI só pinta.
 * Eixo X = fluxo da modalidade (Qf no convectivo/HDF; Qd no difusivo), 0→60 mL/min.
 * Eixo Y = clearance (mL/min), 0→80.
 * Varre o fluxo relevante mantendo o resto do estado; o ponto de operação é o atual. */
function clearanceLayout(state, W, H) {
  state = state || {};
  W = clampv(W, 200, 100000); H = clampv(H, 120, 100000);
  var padL = 52, padR = 16, padT = 18, padB = 38, baseY = H - padB;
  var N = 60, fluxoMax = 60, clMax = 80;
  var pxX = (W - padL - padR) / fluxoMax, pxY = (baseY - padT) / clMax;
  var base = {}; for (var kk in state) base[kk] = state[kk];
  var modo = (base.modo === 'CVVH' || base.modo === 'CVVHD' || base.modo === 'CVVHDF') ? base.modo : 'CVVHDF';
  var convectivo = (modo !== 'CVVHD'); // CVVH e CVVHDF varrem Qf; CVVHD varre Qd
  var pts = [], i, fx;
  for (i = 0; i <= N; i++) {
    fx = (i / N) * fluxoMax;
    var st = {}; for (var z in base) st[z] = base[z];
    if (convectivo) st.qf = fx; else st.qd = fx;
    var r = trrc(st);
    var cl = clampv(r.clearanceTotal, 0, clMax);
    pts.push({ fluxo: fx, clearance: cl, x: padL + fx * pxX, y: baseY - cl * pxY });
  }
  // ponto de operação atual
  var cur = trrc(state);
  var fxCur = convectivo ? cur.qf : cur.qd;
  var cx = padL + clampv(fxCur, 0, fluxoMax) * pxX;
  var cy = baseY - clampv(cur.clearanceTotal, 0, clMax) * pxY;
  return {
    W: W, H: H, padL: padL, padR: padR, padT: padT, padB: padB, baseY: baseY, N: N,
    fluxoMax: fluxoMax, clMax: clMax, pxX: pxX, pxY: pxY, modo: modo, convectivo: convectivo,
    axis: { x0: padL, y0: padT, xEnd: W - padR, yEnd: baseY },
    pts: pts,
    current: { x: cx, y: cy, fluxo: fxCur, clearance: cur.clearanceTotal, modo: cur.modo }
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    clampv: clampv, fracPlasma: fracPlasma,
    cvvh: cvvh, cvvhd: cvvhd, cvvhdf: cvvhdf, trrc: trrc, clearanceLayout: clearanceLayout,
    SIEVING_PEQ: SIEVING_PEQ, QD_SAT: QD_SAT, INTERACAO: INTERACAO, CL_HDI: CL_HDI
  };
}
