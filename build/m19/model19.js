/* =========================================================================
 * FILTRA · M19 — Princípios físicos do transporte: DIFUSÃO · CONVECÇÃO ·
 * ULTRAFILTRAÇÃO · ADSORÇÃO. A base física de TODA a diálise (Bloco VI).
 * ENGINE PURO. Espelhado inline no filtra19.html.
 *
 * Tese: a diálise não substitui o rim — substitui FUNÇÕES por física.
 *  - remoção de SOLUTO  ← DIFUSÃO (gradiente de concentração) + CONVECÇÃO (arraste por solvente)
 *  - remoção de VOLUME  ← ULTRAFILTRAÇÃO (gradiente de pressão transmembrana, TMP)
 *  - ADSORÇÃO           ← ligação do soluto à própria membrana (saturável)
 *
 * As quatro físicas, por mecanismo:
 *
 *  1) DIFUSÃO (Fick): J ∝ D · A · ΔC / Δx. O coeficiente de difusão D CAI com o
 *     peso molecular (PM): D ∝ PM^(−1/3) (raio de Stokes-Einstein). Pequenos solutos
 *     (ureia 60 Da) difundem RÁPIDO; médios (β2-microglobulina ~11800 Da) MAL difundem.
 *     O clearance difusivo é dominado pela difusão e satura com o fluxo de dialisato Qd.
 *
 *  2) CONVECÇÃO ("solvent drag"): o soluto é ARRASTADO pela água que ultrafiltra.
 *     Fluxo = Q_uf · C · S, onde S = coeficiente de PENEIRAMENTO (sieving, 0..1).
 *     INDEPENDE do PM até o cutoff da membrana → remove MÉDIOS que a difusão não remove.
 *
 *  3) ULTRAFILTRAÇÃO: Q_uf = Kuf · TMP, com TMP = P_hidrostática − P_oncótica.
 *     É o mecanismo de remoção de VOLUME (e o motor da convecção).
 *
 *  4) ADSORÇÃO (Langmuir): q = cap · C / (Kd + C). Capacidade SATURÁVEL — a membrana
 *     satura com o tempo/carga; some quando os sítios se esgotam.
 *
 *  FUNÇÃO-MÃE transporte(): combina os quatro e diz qual MECANISMO domina para um PM:
 *     pequeno → difusão; médio → convecção (HDF soma os dois).
 *
 * PÉROLA: a convecção remove o soluto MÉDIO que a difusão não alcança; HDF (difusão +
 * convecção) soma os dois mecanismos. Dobrar o PM derruba a difusão, não a convecção.
 * ========================================================================= */

function clampv(v, a, b) { var n = Number(v); if (!isFinite(n)) n = a; if (n < a) n = a; if (n > b) n = b; return n; }

/* referências físicas */
var PM_UREIA = 60;          // Da — soluto pequeno de referência (D = 1)
var PM_CUTOFF = 15000;      // Da — cutoff de peneiramento da membrana high-flux (~15 kDa)
var PM_MEDIO = 1000;        // Da — fronteira didática pequeno × médio (sub-clamp informativo)

/* coeficiente de difusão RELATIVO ao da ureia: D(PM) = (PM_UREIA/PM)^(1/3) (Stokes-Einstein).
 * Cai monotonicamente com o PM. Ureia → 1 ; β2-m (11800) → ~0,17. */
function difCoef(pm) {
  pm = clampv(pm, PM_UREIA, 70000);
  return clampv(Math.pow(PM_UREIA / pm, 1 / 3), 0, 1);
}

/* coeficiente de PENEIRAMENTO (sieving) da membrana para um PM: ~1 até o cutoff, despenca acima.
 * Sigmoide decrescente centrada no cutoff. Pequenos/médios peneiram livre (S≈1); grandes são retidos. */
function sievingCoef(pm, cutoff) {
  pm = clampv(pm, PM_UREIA, 70000);
  cutoff = clampv(cutoff, 1000, 70000);
  var x = (pm - cutoff) / (0.18 * cutoff);
  return clampv(1 / (1 + Math.exp(x)), 0, 1);
}

/* DIFUSÃO (Fick relativo): fluxo difusivo ∝ D(PM) · A · ΔC / Δx, modulado por Qd (satura).
 * retorna { jDif, dCoef, clearDif } — jDif em "unidades de fluxo" relativas; clearDif em mL/min. */
function difusao(inp) {
  var p = inp || {};
  var pm = clampv(p.pm !== undefined ? p.pm : PM_UREIA, PM_UREIA, 70000);
  var gradConc = clampv(p.gradConc !== undefined ? p.gradConc : 1, 0, 200);   // ΔC (mEq/L ou mg/dL, relativo)
  var area = clampv(p.area !== undefined ? p.area : 1.5, 0.2, 3);             // m² do dialisador
  var espessura = clampv(p.espessura !== undefined ? p.espessura : 1, 0.2, 5);// Δx relativo
  var qd = clampv(p.qd !== undefined ? p.qd : 500, 0, 1000);                  // mL/min fluxo de dialisato
  var dCoef = difCoef(pm);
  // saturação difusiva com o dialisato: clearance sobe e satura com Qd
  var qdFator = clampv(qd / (qd + 250), 0, 1);
  var jDif = dCoef * area * gradConc / espessura;                            // fluxo relativo
  // clearance difusivo (mL/min): teto ~ Qb efetivo; pequenos solutos alcançam o teto, médios ficam abaixo
  var clearDif = clampv(280 * dCoef * qdFator * (area / 1.5), 0, 320);       // mL/min
  return { jDif: jDif, dCoef: dCoef, clearDif: clearDif, qdFator: qdFator };
}

/* CONVECÇÃO (solvent drag): fluxo = Q_uf · C · S(PM). Independe do PM até o cutoff.
 * retorna { jConv, sieving, clearConv } — clearConv = Q_uf · S (mL/min). */
function conveccao(inp) {
  var p = inp || {};
  var ufRate = clampv(p.ufRate !== undefined ? p.ufRate : 30, 0, 200);       // mL/min de ultrafiltração
  var conc = clampv(p.conc !== undefined ? p.conc : 1, 0, 200);              // C do soluto (relativo)
  var pm = clampv(p.pm !== undefined ? p.pm : PM_UREIA, PM_UREIA, 70000);
  var cutoff = clampv(p.cutoff !== undefined ? p.cutoff : PM_CUTOFF, 1000, 70000);
  var sieving = (p.sieving !== undefined) ? clampv(p.sieving, 0, 1) : sievingCoef(pm, cutoff);
  var jConv = ufRate * conc * sieving;                                       // fluxo de massa
  var clearConv = ufRate * sieving;                                          // mL/min (clearance convectivo)
  return { jConv: jConv, sieving: sieving, clearConv: clearConv };
}

/* ULTRAFILTRAÇÃO: Q_uf = Kuf · TMP ; TMP = P_hidrostática − P_oncótica.
 * retorna { tmp, qf } — qf em mL/h. */
function ultrafiltracao(inp) {
  var p = inp || {};
  var kuf = clampv(p.kuf !== undefined ? p.kuf : 30, 0, 100);               // mL/h/mmHg (coef. de UF do dialisador)
  var pHidro = clampv(p.pHidro !== undefined ? p.pHidro : 60, 0, 400);      // mmHg pressão hidrostática transmembrana
  var pOnc = clampv(p.pOnc !== undefined ? p.pOnc : 25, 0, 60);             // mmHg pressão oncótica (opõe-se)
  var tmp = pHidro - pOnc;                                                   // mmHg (pode ser ≤0 → sem UF)
  var qf = clampv(kuf * Math.max(0, tmp), 0, 40000);                        // mL/h
  return { tmp: tmp, qf: qf };
}

/* ADSORÇÃO (Langmuir): q = cap · C / (Kd + C). Saturável; fração saturada satFrac. */
function adsorcao(inp) {
  var p = inp || {};
  var conc = clampv(p.conc !== undefined ? p.conc : 5, 0, 1000);           // C do soluto
  var cap = clampv(p.cap !== undefined ? p.cap : 100, 0, 1e6);             // capacidade máxima de sítios
  var kd = clampv(p.kd !== undefined ? p.kd : 10, 1e-6, 1e6);             // constante de meia-saturação
  var q = cap * conc / (kd + conc);                                         // massa adsorvida
  var satFrac = clampv(conc / (kd + conc), 0, 1);                           // fração dos sítios ocupados
  return { q: q, satFrac: satFrac };
}

/* FUNÇÃO-MÃE: combina os quatro mecanismos e decide qual DOMINA para um dado PM.
 * Modos: 'difusivo' (HD), 'convectivo' (HF/CVVH), 'misto' (HDF some os dois). */
function transporte(input) {
  var inp = input || {};
  var pm = clampv(inp.pm !== undefined ? inp.pm : PM_UREIA, PM_UREIA, 70000);
  var gradConc = clampv(inp.gradConc !== undefined ? inp.gradConc : 1, 0, 200);
  var conc = clampv(inp.conc !== undefined ? inp.conc : 1, 0, 200);
  var area = clampv(inp.area !== undefined ? inp.area : 1.5, 0.2, 3);
  var espessura = clampv(inp.espessura !== undefined ? inp.espessura : 1, 0.2, 5);
  var qd = clampv(inp.qd !== undefined ? inp.qd : 500, 0, 1000);
  var ufRateMlMin = clampv(inp.ufRate !== undefined ? inp.ufRate : 30, 0, 200);   // mL/min p/ convecção
  var cutoff = clampv(inp.cutoff !== undefined ? inp.cutoff : PM_CUTOFF, 1000, 70000);
  // modo: 0 difusivo puro (HD), 1 convectivo puro (HF), entre = HDF misto
  var modo = clampv(inp.modo !== undefined ? inp.modo : 0.5, 0, 1);
  // ultrafiltração (volume) — params separados, em mmHg/mL·h
  var kuf = clampv(inp.kuf !== undefined ? inp.kuf : 30, 0, 100);
  var pHidro = clampv(inp.pHidro !== undefined ? inp.pHidro : 60, 0, 400);
  var pOnc = clampv(inp.pOnc !== undefined ? inp.pOnc : 25, 0, 60);
  // adsorção
  var cap = clampv(inp.cap !== undefined ? inp.cap : 100, 0, 1e6);
  var kd = clampv(inp.kd !== undefined ? inp.kd : 10, 1e-6, 1e6);

  var dif = difusao({ pm: pm, gradConc: gradConc, area: area, espessura: espessura, qd: qd });
  var conv = conveccao({ ufRate: ufRateMlMin, conc: conc, pm: pm, cutoff: cutoff });
  var uf = ultrafiltracao({ kuf: kuf, pHidro: pHidro, pOnc: pOnc });
  var ads = adsorcao({ conc: conc, cap: cap, kd: kd });

  // clearance de SOLUTO combinado pelo modo: HD usa só difusão, HF só convecção, HDF mistura.
  var pesoDif = 1 - modo;                                                    // peso da difusão
  var pesoConv = modo;                                                       // peso da convecção
  var clearSoluto = pesoDif * dif.clearDif + pesoConv * conv.clearConv;      // mL/min

  // qual MECANISMO domina para ESTE soluto, à parte do modo escolhido:
  // pequeno (PM baixo) → difusão alcança; médio (PM alto, abaixo do cutoff) → convecção.
  // comparamos o clearance máximo possível de cada física para o PM (modo-independente).
  var clearDifMax = dif.clearDif;                                            // difusão isolada
  var clearConvMax = conv.clearConv;                                         // convecção isolada
  var dominante = (clearConvMax > clearDifMax + 1e-9) ? 'conveccao' : 'difusao';
  // classe do soluto por PM (didática)
  var classe = pm < 300 ? 'pequeno' : (pm < cutoff ? 'medio' : 'grande');

  // "modo recomendado" pelo soluto-alvo: pequeno → difusivo; médio → convectivo/misto; grande → retido
  var modoRecomendado = (classe === 'pequeno') ? 'difusivo' : (classe === 'medio' ? 'convectivo' : 'retido');

  // remoção de VOLUME pela UF (mL/h)
  var volRemovido = uf.qf;

  return {
    // entradas ecoadas
    pm: pm, gradConc: gradConc, conc: conc, area: area, espessura: espessura, qd: qd,
    ufRate: ufRateMlMin, cutoff: cutoff, modo: modo, kuf: kuf, pHidro: pHidro, pOnc: pOnc, cap: cap, kd: kd,
    // por mecanismo
    dCoef: dif.dCoef, jDif: dif.jDif, clearDif: dif.clearDif,
    sieving: conv.sieving, jConv: conv.jConv, clearConv: conv.clearConv,
    tmp: uf.tmp, qf: uf.qf, volRemovido: volRemovido,
    adsQ: ads.q, adsSat: ads.satFrac,
    // combinação e veredito
    pesoDif: pesoDif, pesoConv: pesoConv, clearSoluto: clearSoluto,
    clearDifMax: clearDifMax, clearConvMax: clearConvMax,
    dominante: dominante, classe: classe, modoRecomendado: modoRecomendado
  };
}

/* geometria PURA da curva CLEARANCE × PM (a UI só pinta).
 * Eixo X = peso molecular (log, PM_UREIA..70000); eixo Y = clearance (mL/min).
 * Duas curvas: difusivo (cai com PM) e convectivo (~plano até o cutoff, despenca depois).
 * Marca o soluto atual (PM do state) e a linha do cutoff. */
function clearanceLayout(state, W, H) {
  state = state || {};
  W = clampv(W, 200, 100000); H = clampv(H, 120, 100000);
  var padL = 52, padR = 16, padT = 18, padB = 38, baseY = H - padB;
  var N = 60, PMlo = PM_UREIA, PMhi = 70000;
  var logLo = Math.log(PMlo), logHi = Math.log(PMhi);
  var YMAX = 320;                                                            // mL/min teto do eixo
  var plotW = W - padL - padR, plotH = baseY - padT;
  function px(pm) { return padL + (Math.log(clampv(pm, PMlo, PMhi)) - logLo) / (logHi - logLo) * plotW; }
  function py(cl) { return baseY - clampv(cl, 0, YMAX) / YMAX * plotH; }
  var base = {};
  for (var kk in state) base[kk] = state[kk];
  var ptsDif = [], ptsConv = [], i, pm, st, r;
  for (i = 0; i <= N; i++) {
    pm = Math.exp(logLo + (logHi - logLo) * i / N);
    st = {}; for (var z in base) st[z] = base[z];
    st.pm = pm;
    r = transporte(st);
    ptsDif.push({ pm: pm, cl: r.clearDifMax, x: px(pm), y: py(r.clearDifMax) });
    ptsConv.push({ pm: pm, cl: r.clearConvMax, x: px(pm), y: py(r.clearConvMax) });
  }
  // soluto atual
  var cur = transporte(state);
  var curX = px(cur.pm);
  var curYdif = py(cur.clearDifMax), curYconv = py(cur.clearConvMax);
  // marca do cutoff
  var cutX = px(clampv(state.cutoff !== undefined ? state.cutoff : PM_CUTOFF, PMlo, PMhi));
  return {
    W: W, H: H, padL: padL, padR: padR, padT: padT, padB: padB, baseY: baseY, N: N, YMAX: YMAX,
    axis: { x0: padL, y0: padT, xEnd: W - padR, yEnd: baseY },
    ptsDif: ptsDif, ptsConv: ptsConv, cutX: cutX,
    current: { pm: cur.pm, x: curX, yDif: curYdif, yConv: curYconv, clearDif: cur.clearDifMax, clearConv: cur.clearConvMax, dominante: cur.dominante, classe: cur.classe }
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    clampv: clampv, difCoef: difCoef, sievingCoef: sievingCoef,
    difusao: difusao, conveccao: conveccao, ultrafiltracao: ultrafiltracao, adsorcao: adsorcao,
    transporte: transporte, clearanceLayout: clearanceLayout,
    PM_UREIA: PM_UREIA, PM_CUTOFF: PM_CUTOFF, PM_MEDIO: PM_MEDIO
  };
}
