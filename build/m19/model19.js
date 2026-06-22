/* =========================================================================
 * FILTRA · M19 — Princípios físicos do transporte: difusão, convecção, ultrafiltração, adsorção.
 * ENGINE PURO. Espelhado inline no filtra19.html. Base de toda a DIALISA.
 *
 * Teses:
 *  - difusão (gradiente de concentração) remove bem MOLÉCULAS PEQUENAS (ureia); cai rápido com o tamanho.
 *  - convecção (arraste por solvente, "solvent drag") remove MOLÉCULAS MÉDIAS; cai devagar com o tamanho.
 *  - ultrafiltração (UF) remove VOLUME por pressão transmembrana (TMP): Jv = Kuf · TMP — independe da concentração.
 *  - adsorção: o soluto adere à membrana (saturável) — uma via extra para algumas toxinas/citocinas.
 *  - o coeficiente de PENEIRAMENTO (sieving) S vai de 1 (passa livre) a 0 (rejeitado: albumina).
 * ========================================================================= */

function clampv(v, a, b) { var n = Number(v); if (!isFinite(n)) n = a; if (n < a) n = a; if (n > b) n = b; return n; }

// fatores dependentes do tamanho molecular (MW em Daltons)
function sizeDiffusion(MW) { MW = clampv(MW, 1, 1e7); return 1 / (1 + MW / 800); }      // difusão: cai rápido
function sievingCoef(MW) { MW = clampv(MW, 1, 1e7); return clampv(1 - MW / 40000, 0, 1); } // convecção: cai devagar; albumina → 0

function transport(input) {
  var inp = input || {};
  var MW = clampv(inp.MW !== undefined ? inp.MW : 60, 1, 1e7);            // Daltons (ureia 60, β2m 11800, albumina 66000)
  var KoA = clampv(inp.KoA !== undefined ? inp.KoA : 600, 0, 2000);       // mL/min — capacidade difusiva da membrana
  var Qb = clampv(inp.Qb !== undefined ? inp.Qb : 300, 1, 600);           // mL/min — fluxo de sangue
  var Qd = clampv(inp.Qd !== undefined ? inp.Qd : 500, 1, 1000);          // mL/min — fluxo de dialisato
  var TMP = clampv(inp.TMP !== undefined ? inp.TMP : 30, 0, 500);         // mmHg — pressão transmembrana
  var Kuf = clampv(inp.Kuf !== undefined ? inp.Kuf : 20, 0, 100);         // mL/h/mmHg — permeabilidade hidráulica
  var adsCap = clampv(inp.adsCap !== undefined ? inp.adsCap : 0, 0, 100); // mL/min — capacidade adsortiva
  var saturation = clampv(inp.saturation !== undefined ? inp.saturation : 0, 0, 1);

  var sizeD = sizeDiffusion(MW);
  var S = sievingCoef(MW);
  var Jv = (Kuf / 60) * TMP;                                              // mL/min — taxa de ultrafiltração
  var Qeff = (Qb * Qd) / (Qb + Qd);                                       // fluxo efetivo contracorrente
  var Kdiff = sizeD * Qeff * (1 - Math.exp(-KoA / Qeff));                 // clearance difusivo (≤ sizeD·Qeff)
  var Kconv = Jv * S;                                                     // clearance convectivo
  var Kads = adsCap * (1 - saturation);                                   // clearance adsortivo (satura)
  var Ktotal = clampv(Kdiff + Kconv + Kads, 0, Qb);                       // não excede o fluxo de sangue

  // mecanismo dominante
  var dom = 'difusão', dmax = Kdiff;
  if (Kconv > dmax) { dom = 'convecção'; dmax = Kconv; }
  if (Kads > dmax) { dom = 'adsorção'; dmax = Kads; }
  if (Ktotal <= 1e-9) dom = 'nenhum';

  return {
    MW: MW, KoA: KoA, Qb: Qb, Qd: Qd, TMP: TMP, Kuf: Kuf, adsCap: adsCap, saturation: saturation,
    sizeD: sizeD, sieving: S, Jv: Jv, Qeff: Qeff,
    Kdiff: Kdiff, Kconv: Kconv, Kads: Kads, Ktotal: Ktotal, dominante: dom
  };
}

// geometria PURA: clearance × tamanho molecular (log MW) — curvas difusiva, convectiva e total
function transportLayout(state, W, H) {
  state = state || {};
  W = clampv(W, 200, 100000); H = clampv(H, 120, 100000);
  var padL = 54, padR = 16, padT = 18, padB = 38, baseY = H - padB;
  var mwMin = 30, mwMax = 70000, N = 64;
  var l0 = Math.log(mwMin) / Math.LN10, l1 = Math.log(mwMax) / Math.LN10;
  var base = {
    KoA: clampv(state.KoA !== undefined ? state.KoA : 600, 0, 2000),
    Qb: clampv(state.Qb !== undefined ? state.Qb : 300, 1, 600),
    Qd: clampv(state.Qd !== undefined ? state.Qd : 500, 1, 1000),
    TMP: clampv(state.TMP !== undefined ? state.TMP : 30, 0, 500),
    Kuf: clampv(state.Kuf !== undefined ? state.Kuf : 20, 0, 100),
    adsCap: clampv(state.adsCap !== undefined ? state.adsCap : 0, 0, 100),
    saturation: clampv(state.saturation !== undefined ? state.saturation : 0, 0, 1)
  };
  var yMax = clampv(base.Qb, 50, 600);
  var pxX = (W - padL - padR) / (l1 - l0);
  var pxY = (baseY - padT) / yMax;
  function X(mw) { return padL + (Math.log(clampv(mw, mwMin, mwMax)) / Math.LN10 - l0) * pxX; }
  function Y(k) { return baseY - clampv(k, 0, yMax) * pxY; }
  var diff = [], conv = [], tot = [], i, mw, r;
  for (i = 0; i <= N; i++) {
    mw = Math.pow(10, l0 + (l1 - l0) * i / N);
    r = transport({ MW: mw, KoA: base.KoA, Qb: base.Qb, Qd: base.Qd, TMP: base.TMP, Kuf: base.Kuf, adsCap: base.adsCap, saturation: base.saturation });
    diff.push({ mw: mw, k: r.Kdiff, x: X(mw), y: Y(r.Kdiff) });
    conv.push({ mw: mw, k: r.Kconv, x: X(mw), y: Y(r.Kconv) });
    tot.push({ mw: mw, k: r.Ktotal, x: X(mw), y: Y(r.Ktotal) });
  }
  var mwc = clampv(state.MW !== undefined ? state.MW : 60, mwMin, mwMax);
  var rc = transport({ MW: mwc, KoA: base.KoA, Qb: base.Qb, Qd: base.Qd, TMP: base.TMP, Kuf: base.Kuf, adsCap: base.adsCap, saturation: base.saturation });
  // marcos didáticos de moléculas
  var marks = [{ mw: 60, nome: 'ureia' }, { mw: 113, nome: 'creatinina' }, { mw: 11800, nome: 'β2-micro' }, { mw: 66000, nome: 'albumina' }];
  marks.forEach(function (m) { m.x = X(m.mw); });
  return {
    W: W, H: H, padL: padL, padR: padR, padT: padT, padB: padB, baseY: baseY, mwMin: mwMin, mwMax: mwMax, yMax: yMax, pxX: pxX, pxY: pxY,
    axis: { x0: padL, y0: padT, xEnd: W - padR, yEnd: baseY },
    diff: diff, conv: conv, tot: tot, marks: marks,
    current: { x: X(mwc), y: Y(rc.Ktotal), MW: mwc, Ktotal: rc.Ktotal, Kdiff: rc.Kdiff, Kconv: rc.Kconv }
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { clampv: clampv, sizeDiffusion: sizeDiffusion, sievingCoef: sievingCoef, transport: transport, transportLayout: transportLayout };
}
