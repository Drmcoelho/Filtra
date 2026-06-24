/* =========================================================================
 * FILTRA · M21 — A MEMBRANA E O CLEARANCE: KoA, permeabilidade, sieving,
 * backfiltration (high-flux × low-flux). ENGINE PURO. Espelhado inline no
 * filtra21.html.
 *
 * TESE: a MEMBRANA define o que passa. O clearance DIFUSIVO do dialisador é
 * função de TRÊS coisas — KoA (coef. de transferência de massa × área, a
 * "competência" da membrana), Qb (fluxo de sangue) e Qd (fluxo de dialisato).
 *
 *   z = KoA·(1 − Qb/Qd)/Qb
 *   K = Qb·(e^z − 1)/(e^z − Qb/Qd)             (equação clássica do dialisador)
 *
 * Limites que o motor respeita SEMPRE:
 *   - K ≤ Qb (não se pode depurar mais sangue do que passa).
 *   - KoA → ∞  ⇒  K → min(Qb,Qd) (membrana perfeita, limitado pelo MENOR fluxo).
 *   - KoA → 0  ⇒  K → 0 (membrana inerte não depura).
 *   - Qb = Qd é um caso LIMITE (z indefinido) tratado pela forma fechada:
 *       K = Qb·KoA/(Qb + KoA).
 *
 * SIEVING (S) × peso molecular: a fração do soluto que ATRAVESSA por convecção.
 * Sigmoide que CAI perto do cutoff da membrana. High-flux tem cutoff MAIOR
 * (deixa passar moléculas médias, ~β2-microglobulina 11,8 kDa); low-flux não.
 *   S(pm) = 1/(1 + (pm/cutoff)^steep)            ∈ [0,1]
 *
 * BACKFILTRATION: o motor é a QUEDA AXIAL de pressão do SANGUE ao longo da
 * fibra oca. O sangue entra com pressão alta e a perde por atrito ao percorrer
 * a fibra; na porção DISTAL do dialisador HIGH-FLUX (membrana muito permeável à
 * água) essa pressão cai ABAIXO da do dialisato → fluxo REVERSO (dialisato →
 * sangue) naquele trecho. O driver PRIMÁRIO é high-flux + o gradiente axial de
 * pressão (∝ Qb, que dita a queda de pressão ao longo da fibra); a TMP média
 * modula (TMP baixa favorece o cruzamento distal) e o Qd é contribuinte MENOR.
 * Se o dialisato não for ULTRAPURO, endotoxina entra. Índice 0..1.
 *
 * FUNÇÃO-MÃE membrana(input): combina KoA/Qb/Qd → clearance de ureia (pequeno,
 * 60 Da) e de molécula média (β2m, 11800 Da); classifica high-flux × low-flux;
 * sinaliza backfiltration e a importância da PUREZA do dialisato.
 *
 * PÉROLAS provadas pelo motor:
 *   - high-flux REMOVE o médio (sieving do β2m alto); low-flux não.
 *   - dobrar Qb NÃO dobra K (saturação: o ganho marginal cai — limitado por KoA/Qd).
 *   - backfiltration EXIGE dialisato ultrapuro (senão a endotoxina reflui).
 * ========================================================================= */

function clampv(v, a, b) { var n = Number(v); if (!isFinite(n)) n = a; if (n < a) n = a; if (n > b) n = b; return n; }

/* pesos moleculares de referência (Da) e cutoffs (Da) */
var PM_UREIA = 60;        // ureia ~60 Da (soluto pequeno)
var PM_B2M = 11800;       // β2-microglobulina ~11,8 kDa (molécula média)
var CUTOFF_LOW = 2000;    // low-flux: cutoff baixo, barra o médio (β2m S≈0)
var CUTOFF_HIGH = 12800;  // high-flux: cutoff calibrado p/ β2m S≈0,6 (clínico)
var STEEP = 5;            // inclinação da sigmoide de sieving

/* clearance difusivo do dialisador (mL/min). z = KoA·(1−Qb/Qd)/Qb.
 * Caso limite Qb≈Qd: forma fechada K = Qb·KoA/(Qb+KoA). */
function clearanceDialisador(o) {
  o = o || {};
  var koa = clampv(o.koa, 0, 2000);   // mL·min⁻¹ (transferência de massa × área)
  var qb = clampv(o.qb, 1, 600);      // mL/min
  var qd = clampv(o.qd, 1, 1200);     // mL/min
  var ratio = qb / qd;
  var K;
  if (Math.abs(qb - qd) < 1e-6) {
    // limite: z→0 ⇒ K = Qb·KoA/(Qb+KoA)
    K = qb * koa / (qb + koa);
  } else {
    var z = koa * (1 - ratio) / qb;
    // proteção numérica: z muito grande satura no menor fluxo
    if (z > 60) { K = Math.min(qb, qd); }
    else if (z < -60) { K = qb * koa / (qb + koa); } // ramo degenerado, fallback estável
    else {
      var ez = Math.exp(z);
      var denom = ez - ratio;
      if (Math.abs(denom) < 1e-9) { K = qb * koa / (qb + koa); }
      else { K = qb * (ez - 1) / denom; }
    }
  }
  // o clearance NUNCA excede o sangue que passa nem o menor fluxo, e nunca < 0
  K = clampv(K, 0, Math.min(qb, qd));
  return K;
}

/* coeficiente de sieving (fração que atravessa por convecção) ∈ [0,1].
 * S(pm) = 1/(1 + (pm/cutoff)^steep). Cai perto do cutoff. */
function sieving(o) {
  o = o || {};
  var pm = clampv(o.pm, 1, 70000);
  var cutoff = clampv(o.cutoff, 200, 60000);
  var steep = clampv(o.steep, 1, 12);
  var S = 1 / (1 + Math.pow(pm / cutoff, steep));
  return clampv(S, 0, 1);
}

/* índice de backfiltration 0..1: fluxo reverso (dialisato→sangue) na porção
 * distal. Só ocorre em HIGH-FLUX (membrana muito permeável à água). O driver
 * PRIMÁRIO é a QUEDA AXIAL de pressão do sangue ao longo da fibra: o sangue
 * perde pressão por atrito e, no trecho distal, cai abaixo da do dialisato. Essa
 * queda axial cresce com Qb (mais fluxo → maior gradiente de pressão na fibra).
 * A TMP média modula (TMP baixa favorece o cruzamento distal); o Qd é MENOR. */
function backfiltration(o) {
  o = o || {};
  var highFlux = clampv(o.highFlux, 0, 1);     // 1 = high-flux, 0 = low-flux
  var qb = clampv(o.qb, 1, 600);               // mL/min (sangue) — dita a queda axial
  var qd = clampv(o.qd, 1, 1200);              // mL/min (banho) — contribuinte menor
  var tmp = clampv(o.tmp, 0, 400);             // mmHg (TMP média do filtro)
  // DRIVER PRIMÁRIO: gradiente axial de pressão do sangue ∝ Qb. Qb alto faz a
  // pressão do sangue despencar no trecho distal e ficar abaixo da do banho.
  var axialComp = clampv((qb - 200) / 300, 0, 1);       // Qb 200→0 ; 500→1
  // TMP média baixa favorece o cruzamento distal (modula)
  var tmpComp = clampv(1 - tmp / 80, 0, 1);             // TMP 0→1 ; 80+→0
  // Qd alto empurra um pouco mais de pressão no banho distal (MENOR)
  var qdComp = clampv((qd - 300) / 500, 0, 1);          // 300→0 ; 800→1
  var bf = highFlux * (0.60 * axialComp + 0.30 * tmpComp + 0.10 * qdComp);
  return clampv(bf, 0, 1);
}

/* FUNÇÃO-MÃE: a membrana inteira — clearances, classe de flux, backfiltration */
function membrana(input) {
  var inp = input || {};
  var koa = clampv(inp.koa !== undefined ? inp.koa : 600, 0, 2000);     // mL·min⁻¹
  var qb = clampv(inp.qb !== undefined ? inp.qb : 300, 1, 600);         // mL/min
  var qd = clampv(inp.qd !== undefined ? inp.qd : 500, 1, 1200);        // mL/min
  var tmp = clampv(inp.tmp !== undefined ? inp.tmp : 100, 0, 400);      // mmHg
  // classe da membrana: high-flux declarado OU cutoff alto declarado
  var highFlux = clampv(inp.highFlux !== undefined ? inp.highFlux : 1, 0, 1);
  var cutoff = inp.cutoff !== undefined ? clampv(inp.cutoff, 200, 60000)
    : (highFlux >= 0.5 ? CUTOFF_HIGH : CUTOFF_LOW);
  var steep = clampv(inp.steep !== undefined ? inp.steep : STEEP, 1, 12);

  // clearance difusivo (mesma membrana, dois solutos): K depende de Qb/Qd/KoA
  var clearUreia = clearanceDialisador({ koa: koa, qb: qb, qd: qd });    // ureia, pequena
  // o KoA EFETIVO do soluto médio é menor (a molécula grande difunde menos);
  // escalado pelo sieving da membrana ao PM do médio (a permeabilidade pesa)
  var sUreia = sieving({ pm: PM_UREIA, cutoff: cutoff, steep: steep });
  var sMedio = sieving({ pm: PM_B2M, cutoff: cutoff, steep: steep });
  var koaMedio = koa * sMedio * 0.6;  // o médio "vê" um KoA reduzido pela permeabilidade
  var clearMedio = clearanceDialisador({ koa: koaMedio, qb: qb, qd: qd });

  // eficiência relativa do sangue depurado (fração de Qb): K/Qb
  var fracUreia = clampv(clearUreia / Math.max(qb, 1e-9), 0, 1);

  // classe textual
  var classe = highFlux >= 0.5 ? 'high-flux' : 'low-flux';
  // high-flux remove o médio se o sieving do β2m for relevante
  var removeMedio = sMedio >= 0.3;

  // backfiltration e a exigência de pureza
  var bf = backfiltration({ highFlux: highFlux, qb: qb, qd: qd, tmp: tmp });
  var precisaUltrapuro = bf >= 0.15;   // há fluxo reverso suficiente → dialisato ultrapuro obrigatório

  // saturação: ganho marginal de K ao subir Qb (derivada numérica, mL/min por mL/min)
  var dQb = 1;
  var Khi = clearanceDialisador({ koa: koa, qb: clampv(qb + dQb, 1, 600), qd: qd });
  var Klo = clearanceDialisador({ koa: koa, qb: clampv(qb - dQb, 1, 600), qd: qd });
  var ganhoMarginal = clampv((Khi - Klo) / (2 * dQb), 0, 1);   // ∂K/∂Qb ∈ [0,1]

  return {
    // entradas ecoadas
    koa: koa, qb: qb, qd: qd, tmp: tmp, highFlux: highFlux, cutoff: cutoff, steep: steep,
    // clearances
    clearUreia: clearUreia, clearMedio: clearMedio, fracUreia: fracUreia, ganhoMarginal: ganhoMarginal,
    // sieving
    sUreia: sUreia, sMedio: sMedio, koaMedio: koaMedio,
    // classe e flags
    classe: classe, removeMedio: removeMedio,
    // backfiltration
    backfilt: bf, precisaUltrapuro: precisaUltrapuro
  };
}

/* LAYOUT PURO — geometria do clearance × Qb (sobe e satura) para o canvas.
 * Varre Qb de 1..qbMax mantendo KoA/Qd do estado; marca o ponto de operação.
 * A UI só PINTA — canvas ≡ engine (tol 1e-6). */
function clearanceLayout(state, W, H) {
  state = state || {};
  W = clampv(W, 200, 100000); H = clampv(H, 120, 100000);
  var padL = 52, padR = 16, padT = 18, padB = 38, baseY = H - padB;
  var koa = clampv(state.koa !== undefined ? state.koa : 600, 0, 2000);
  var qd = clampv(state.qd !== undefined ? state.qd : 500, 1, 1200);
  var qbCur = clampv(state.qb !== undefined ? state.qb : 300, 1, 600);
  var QBMAX = 500;             // eixo X: Qb 0..500 mL/min
  var KMAX = 320;             // eixo Y: clearance 0..320 mL/min
  var N = 50;
  var plotW = (W - padL - padR), plotH = (baseY - padT);
  var pts = [], i, qb, K;
  for (i = 0; i <= N; i++) {
    qb = 1 + (QBMAX - 1) * i / N;
    K = clearanceDialisador({ koa: koa, qb: qb, qd: qd });
    pts.push({
      qb: qb, K: K,
      x: padL + (qb / QBMAX) * plotW,
      y: baseY - clampv(K / KMAX, 0, 1) * plotH
    });
  }
  // ponto de operação atual
  var Kcur = clearanceDialisador({ koa: koa, qb: qbCur, qd: qd });
  var cx = padL + clampv(qbCur / QBMAX, 0, 1) * plotW;
  var cy = baseY - clampv(Kcur / KMAX, 0, 1) * plotH;
  // assíntota: o teto (menor fluxo) onde a curva satura
  var teto = Math.min(QBMAX, qd);
  var ytetoK = clearanceDialisador({ koa: koa, qb: teto, qd: qd });
  return {
    W: W, H: H, padL: padL, padR: padR, padT: padT, padB: padB, baseY: baseY,
    QBMAX: QBMAX, KMAX: KMAX, N: N, plotW: plotW, plotH: plotH,
    axis: { x0: padL, y0: padT, xEnd: W - padR, yEnd: baseY },
    pts: pts,
    current: { x: cx, y: cy, qb: qbCur, K: Kcur },
    teto: { qb: teto, K: ytetoK, x: padL + clampv(teto / QBMAX, 0, 1) * plotW, y: baseY - clampv(ytetoK / KMAX, 0, 1) * plotH }
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    clampv: clampv,
    clearanceDialisador: clearanceDialisador, sieving: sieving, backfiltration: backfiltration,
    membrana: membrana, clearanceLayout: clearanceLayout,
    PM_UREIA: PM_UREIA, PM_B2M: PM_B2M, CUTOFF_LOW: CUTOFF_LOW, CUTOFF_HIGH: CUTOFF_HIGH, STEEP: STEEP
  };
}
