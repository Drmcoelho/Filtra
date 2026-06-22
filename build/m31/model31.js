/* =========================================================================
 * FILTRA · M31 — SLED / híbridas: o meio-termo entre HDI e TRRC.
 * ENGINE PURO. Espelhado inline no filtra31.html.
 *
 * TESE: a SLED (sustained low-efficiency dialysis) é um PONTO num espectro
 * eficiência × tempo × tolerância. Fluxos BAIXOS (Qb/Qd menores que a HDI) por
 * TEMPO LONGO (6–12 h). Resultado: a MESMA dose total (Kt) da HDI, mas com taxa
 * de UF e queda de gradiente MAIS LENTAS → tolerada por quem não aguenta a HDI
 * rápida, sem precisar da TRRC 24 h.
 *
 *  1) EFICIÊNCIA INSTANTÂNEA (clearance) sobe com os fluxos Qb/Qd e com o KoA da
 *     membrana, mas SATURA (a membrana e o menor dos fluxos limitam). Fluxos baixos
 *     da SLED → clearance/hora baixo.
 *
 *  2) DOSE TOTAL (Kt e Kt/V) = clearance · tempo / V. Tempo longo compensa o
 *     clearance baixo → a SLED ALCANÇA o Kt/V da HDI se o tempo for suficiente.
 *
 *  3) TOLERÂNCIA HEMODINÂMICA: UF rate = volume / tempo. Tempo longo → UF rate
 *     baixa → fica abaixo do refilling plasmático (ponte M23/M24) → tolerada.
 *     Índice de tolerância cai quando a UF rate excede o refilling.
 *
 *  ESPECTRO: posiciona a modalidade (HDI ↔ SLED ↔ TRRC) por eficiência/hora e por
 *  tolerância. HDI: alta eficiência/hora, curta, menos tolerada. TRRC: baixa
 *  eficiência/hora, 24 h, muito tolerada. SLED: o meio-termo.
 *
 * PÉROLA: a SLED atinge a MESMA meta (volume + soluto) da HDI com MENOR estresse
 * hemodinâmico POR HORA — o meio-termo cobre quem a HDI não tolera e para quem a
 * TRRC seria demais. A dose total é igual; o que muda é a TAXA.
 * ========================================================================= */

function clampv(v, a, b) { var n = Number(v); if (!isFinite(n)) n = a; if (n < a) n = a; if (n > b) n = b; return n; }

/* limiares/constantes de referência */
var REFILL_DEFAULT = 400;   // refilling plasmático típico (mL/h) — teto tolerado de UF (M24)
var KTV_ALVO = 1.2;         // Kt/V-alvo por sessão (adequação, M25)

/* EFICIÊNCIA instantânea: clearance (mL/min) por fluxos e membrana.
 * Modelo de difusão limitada: o clearance sobe com Qb e com KoA, mas SATURA —
 * nunca passa do menor dos fluxos efetivos (Qb, Qd). Fórmula amortecida e monótona. */
function eficiencia(args) {
  args = args || {};
  var qb = clampv(args.qb !== undefined ? args.qb : 300, 50, 500);   // fluxo de sangue (mL/min)
  var qd = clampv(args.qd !== undefined ? args.qd : 500, 100, 800);  // fluxo de dialisato (mL/min)
  var koa = clampv(args.koa !== undefined ? args.koa : 600, 100, 1500); // KoA da membrana (mL/min)
  // teto físico: o clearance não excede o menor dos fluxos (o gargalo)
  var teto = Math.min(qb, qd);
  // fração de aproveitamento sobe com KoA (saturação exponencial) e é puxada pelo gargalo de fluxo
  var fracMembrana = 1 - Math.exp(-koa / Math.max(teto, 1));   // 0..1, sobe com KoA
  var cl = teto * clampv(fracMembrana, 0, 1);                  // mL/min
  return clampv(cl, 0, 500);
}

/* DOSE TOTAL acumulada: Kt (mL) = clearance(mL/min) · tempo(min); Kt/V adimensional. */
function doseTotal(args) {
  args = args || {};
  var clearance = clampv(args.clearance !== undefined ? args.clearance : 200, 0, 500); // mL/min
  var tempo = clampv(args.tempo !== undefined ? args.tempo : 4, 0, 24);                // h
  var V = clampv(args.V !== undefined ? args.V : 36, 10, 80);                          // volume de distribuição de ureia (L)
  var ktMin = clearance * tempo * 60;          // mL (clearance·min)
  var ktL = ktMin / 1000;                       // L depurados
  var ktv = ktL / V;                            // Kt/V adimensional
  return { ktL: clampv(ktL, 0, 1000), ktv: clampv(ktv, 0, 12) };
}

/* TOLERÂNCIA da UF: UF rate (mL/h) = volume(mL)/tempo(h); índice de tolerância [0..1]
 * cai quando a UF rate excede o refilling plasmático (UF>refilling → hipotensão, M24). */
function toleranciaUF(args) {
  args = args || {};
  var volume = clampv(args.volume !== undefined ? args.volume : 3, 0, 20);          // L a remover
  var tempo = clampv(args.tempo !== undefined ? args.tempo : 4, 0.25, 24);          // h
  var refilling = clampv(args.refilling !== undefined ? args.refilling : REFILL_DEFAULT, 50, 1200); // mL/h
  var ufRate = volume * 1000 / tempo;           // mL/h
  // tolerância: 1 quando UF bem abaixo do refilling; cai conforme se aproxima/ultrapassa
  var razao = ufRate / refilling;               // <1 confortável, >1 perigoso
  var tol = clampv(1 - 0.85 * clampv(razao - 0.5, 0, 1.5) / 1.5, 0, 1);
  // se passar do refilling, o índice despenca mais
  if (razao > 1) tol = clampv(tol * (1 - 0.4 * clampv(razao - 1, 0, 1)), 0, 1);
  return { ufRate: clampv(ufRate, 0, 80000), razao: razao, tolerancia: clampv(tol, 0, 1), excedeRefilling: ufRate > refilling + 1e-9 };
}

/* FUNÇÃO-MÃE: posiciona a modalidade no espectro e prevê dose, UF e tolerância. */
function sled(input) {
  var inp = input || {};
  var pesoKg = clampv(inp.pesoKg !== undefined ? inp.pesoKg : 70, 30, 200);          // kg
  var V = clampv(inp.V !== undefined ? inp.V : pesoKg * 0.55, 10, 80);               // L (água corporal ~0,55·peso)
  var qb = clampv(inp.qb !== undefined ? inp.qb : 200, 50, 500);                     // mL/min
  var qd = clampv(inp.qd !== undefined ? inp.qd : 300, 100, 800);                    // mL/min
  var koa = clampv(inp.koa !== undefined ? inp.koa : 600, 100, 1500);               // mL/min
  var tempo = clampv(inp.tempo !== undefined ? inp.tempo : 8, 0.5, 24);              // h
  var volume = clampv(inp.volume !== undefined ? inp.volume : 3, 0, 20);             // L de sobrecarga a remover
  var refilling = clampv(inp.refilling !== undefined ? inp.refilling : REFILL_DEFAULT, 50, 1200); // mL/h

  // ----- eficiência instantânea (clearance) -----
  var clearance = eficiencia({ qb: qb, qd: qd, koa: koa });          // mL/min

  // ----- dose total acumulada (Kt/V) -----
  var dose = doseTotal({ clearance: clearance, tempo: tempo, V: V });
  var ktv = dose.ktv, ktL = dose.ktL;
  var atingiuAlvo = ktv >= KTV_ALVO - 1e-9;

  // ----- tolerância da UF -----
  var tol = toleranciaUF({ volume: volume, tempo: tempo, refilling: refilling });
  var ufRate = tol.ufRate;                                          // mL/h
  var tolerancia = tol.tolerancia;                                  // 0..1
  var excedeRefilling = tol.excedeRefilling;

  // ----- eficiência POR HORA (estresse de gradiente) — proxy do estresse difusivo/hora -----
  // Kt/V por hora: quanto da depuração se concentra em cada hora. Alto = HDI; baixo = TRRC.
  var ktvPorHora = ktv / tempo;                                     // 1/h

  // ----- POSIÇÃO NO ESPECTRO HDI ↔ SLED ↔ TRRC -----
  // classifica pela DURAÇÃO (o eixo do espectro): curta=HDI, longa=TRRC, meio=SLED.
  // ≤5 h → HDI ; ≥20 h → TRRC ; entre → SLED (o meio-termo).
  var modalidade;
  if (tempo <= 5) modalidade = 'HDI';
  else if (tempo >= 20) modalidade = 'TRRC';
  else modalidade = 'SLED';
  // índice de espectro 0 (HDI extremo) → 1 (TRRC extremo): mapeia o tempo
  var espectro = clampv((tempo - 4) / (24 - 4), 0, 1);

  // ----- estresse hemodinâmico POR HORA -----
  // combina a UF rate relativa ao refilling e o ktv/hora (gradiente difusivo/hora).
  var estresseUF = clampv(ufRate / refilling, 0, 3);                // <1 confortável
  var estresseHora = clampv(0.6 * estresseUF + 0.4 * (ktvPorHora / 0.4), 0, 3); // normaliza ktv/h ~0,4 da HDI

  // ----- veredito -----
  // tolera = índice de UF alto E não excede refilling
  var tolerada = tolerancia >= 0.6 && !excedeRefilling;

  return {
    // entradas ecoadas
    pesoKg: pesoKg, V: V, qb: qb, qd: qd, koa: koa, tempo: tempo, volume: volume, refilling: refilling,
    // eficiência e dose
    clearance: clearance, ktL: ktL, ktv: ktv, atingiuAlvo: atingiuAlvo, ktvPorHora: ktvPorHora,
    // UF e tolerância
    ufRate: ufRate, tolerancia: tolerancia, excedeRefilling: excedeRefilling,
    // espectro e estresse
    modalidade: modalidade, espectro: espectro, estresseUF: estresseUF, estresseHora: estresseHora,
    // veredito
    tolerada: tolerada
  };
}

/* geometria PURA do espectro Kt/V ACUMULADO × tempo — a UI só pinta.
 * Eixo X = tempo (0 → tempo da SLED corrente). Eixo Y = Kt/V acumulado.
 * Duas curvas: HDI (clearance alto, 4 h — íngreme e curta) e SLED (clearance do
 * estado, tempo longo — sobe devagar mas alcança). A linha do alvo (Kt/V=1,2). */
function espectroLayout(state, W, H) {
  state = state || {};
  W = clampv(W, 200, 100000); H = clampv(H, 120, 100000);
  var padL = 52, padR = 16, padT = 18, padB = 38, baseY = H - padB;
  var r = sled(state);
  var V = r.V;
  // HDI de referência: fluxos altos (Qb 350 / Qd 600), 4 h
  var clHDI = eficiencia({ qb: 350, qd: 600, koa: r.koa });
  var tHDI = 4;
  // SLED corrente: clearance do estado, tempo do estado
  var clSLED = r.clearance, tSLED = r.tempo;
  var tMax = Math.max(tHDI, tSLED, 1);
  // escala Y: até o maior Kt/V atingido + folga, mínimo cobre o alvo
  var ktvHDImax = clampv(clHDI * tHDI * 60 / 1000 / V, 0, 12);
  var ktvSLEDmax = r.ktv;
  var yMax = Math.max(ktvHDImax, ktvSLEDmax, KTV_ALVO * 1.1, 0.5);
  var pxX = (W - padL - padR) / tMax;
  var pxY = (baseY - padT) / yMax;
  function curva(cl, tEnd) {
    var pts = [], N = 48, i, t, ktv;
    for (i = 0; i <= N; i++) {
      t = tEnd * i / N;
      ktv = clampv(cl * t * 60 / 1000 / V, 0, 12);
      pts.push({ t: t, ktv: ktv, x: padL + t * pxX, y: baseY - clampv(ktv, 0, yMax) * pxY });
    }
    return pts;
  }
  var ptsHDI = curva(clHDI, tHDI);
  var ptsSLED = curva(clSLED, tSLED);
  // linha do alvo Kt/V
  var yAlvo = baseY - clampv(KTV_ALVO, 0, yMax) * pxY;
  return {
    W: W, H: H, padL: padL, padR: padR, padT: padT, padB: padB, baseY: baseY,
    pxX: pxX, pxY: pxY, tMax: tMax, yMax: yMax,
    axis: { x0: padL, y0: padT, xEnd: W - padR, yEnd: baseY },
    ptsHDI: ptsHDI, ptsSLED: ptsSLED,
    alvo: { ktv: KTV_ALVO, y: yAlvo },
    current: { modalidade: r.modalidade, ktv: r.ktv, ufRate: r.ufRate, tempo: tSLED, espectro: r.espectro }
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    clampv: clampv, eficiencia: eficiencia, doseTotal: doseTotal, toleranciaUF: toleranciaUF,
    sled: sled, espectroLayout: espectroLayout,
    REFILL_DEFAULT: REFILL_DEFAULT, KTV_ALVO: KTV_ALVO
  };
}
