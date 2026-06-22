/* =========================================================================
 * FILTRA · M23 — ULTRAFILTRAÇÃO e o balanço de VOLUME: peso seco, taxa de UF,
 * refilling plasmático.
 * ENGINE PURO. Espelhado inline no filtra23.html.
 *
 * TESE: a ultrafiltração (UF) retira água do COMPARTIMENTO INTRAVASCULAR (o
 * plasma). O interstício a repõe pelo REFILLING plasmático — mas com ATRASO.
 *
 *   se taxa de UF ≤ taxa de refilling → o volume sanguíneo se mantém (tolerado)
 *   se taxa de UF >  taxa de refilling → o volume sanguíneo CAI  → hipotensão
 *
 * O "PESO SECO" é o alvo: o peso em que o paciente está euvolêmico.
 *   errar para BAIXO (peso seco < real) → tira volume demais → hipotensão/cãibra
 *   errar para CIMA  (peso seco > real) → sobra volume        → sobrecarga/HVE
 *
 * VARIÁVEIS-CHAVE
 *   UF total (L)   = peso atual − peso seco        (o que precisa sair)
 *   UF rate (mL/h) = UF total · 1000 / tempo       (a velocidade)
 *   RBV (relative blood volume) ∈ [0,1] = volume plasmático / inicial; cai na
 *     sessão conforme o balanço (UF − refilling) integra ao longo do tempo.
 *   refilling (mL/h) ∝ sobrecarga intersticial atual (gradiente que empurra água
 *     do interstício para o vaso) e ∝ taxa basal de refilling do paciente
 *     (oncótica/capilar). Cai perto do peso seco (reserva intersticial esgota) e
 *     com hipoalbuminemia (gradiente oncótico menor).
 *
 * PÉROLAS (provadas pelo motor):
 *   - a MESMA meta de volume em MENOS tempo derruba a PAM (UF rate↑ > refilling).
 *   - refilling LENTO = intolerância (mesma UF, RBV despenca → crash).
 *   - UF LENTA e LONGA protege (UF rate ≤ refilling → RBV estável).
 *   - errar o peso seco para baixo OU para cima é nocivo (vale em U).
 *
 * Consequência didática: a queda RÁPIDA do RBV hipoperfunde o miocárdio →
 * "stunning" (atordoamento) — dano cumulativo silencioso (ponte com M24).
 * ========================================================================= */

function clampv(v, a, b) { var n = Number(v); if (!isFinite(n)) n = a; if (n < a) n = a; if (n > b) n = b; return n; }

/* limiares de referência (mecanismo) */
var UF_RATE_ALTA = 13;     // mL/kg/h — acima disto a UF rate é "alta" (risco)
var RBV_CRASH = 0.85;      // RBV abaixo do qual o crash hipotensivo é provável
var REFILL_BASAL = 1300;   // capacidade de refilling de referência (mL/h) — albumina/interstício normais
var DEFICIT_REF = 50;      // déficit plasmático (mL) que satura a resposta de refilling (rampa rápida)
var RES_FLOOR = 0.5;       // piso da reserva intersticial (o interstício nunca seca de todo)

/* refilling instantâneo (mL/h): a água que o interstício devolve ao plasma.
 * Modelo de FORÇA RESTAURADORA: o refilling cresce com o DÉFICIT plasmático já
 * instalado (quanto mais o plasma murchou, mais o interstício empurra) — rampa
 * rápida e saturante —, limitado por uma CAPACIDADE basal (oncótica/capilar) e
 * cortado por dois fatores: o oncótico (albumina baixa → refilling pobre) e a
 * RESERVA intersticial (perto do peso seco o interstício seca, mas nunca de
 * todo — piso RES_FLOOR). Em equilíbrio, o refilling iguala a UF e o déficit
 * (logo o RBV) estabiliza — desde que a CAPACIDADE comporte a UF rate. */
function refilling(state) {
  var st = state || {};
  var sobrecarga = clampv(st.sobrecarga, 0, 30);            // L acima do seco AINDA presentes
  var sobrecargaIni = clampv(st.sobrecargaIni, 0.0001, 30); // sobrecarga inicial (normaliza a reserva)
  var taxaBasal = clampv(st.taxaRefillBasal, 50, 1500);    // mL/h capacidade basal (teto) de refilling
  var albumina = clampv(st.albumina, 1.0, 5.5);            // g/dL — gradiente oncótico
  var deficit = clampv(st.deficit, 0, 5000);               // mL de plasma já perdido (motor da resposta)
  // resposta saturante ao déficit: 0 sem déficit, → 1 quando o déficit cresce
  var fDeficit = deficit / (deficit + DEFICIT_REF);
  // reserva intersticial: 1 cheio, RES_FLOOR perto do peso seco (nunca seca de todo)
  var fracReserva = clampv(RES_FLOOR + (1 - RES_FLOOR) * clampv(sobrecarga / sobrecargaIni, 0, 1), 0, 1);
  // o oncótico modula a eficiência do refilling (albumina baixa → refilling pobre)
  var fOnco = clampv(0.35 + 0.65 * (albumina - 1.5) / (4.0 - 1.5), 0.2, 1.0);
  return clampv(taxaBasal * fDeficit * fracReserva * fOnco, 0, 1500); // mL/h
}

/* função-mãe: simula a sessão e devolve UF rate necessária, RBV ao fim, queda/h
 * e a flag de hipotensão intradialítica (UF rate > refilling). */
function ultrafiltracao(input) {
  var inp = input || {};
  var pesoAtual = clampv(inp.pesoAtual !== undefined ? inp.pesoAtual : 73, 30, 250);   // kg
  var pesoSeco = clampv(inp.pesoSeco !== undefined ? inp.pesoSeco : 70, 25, 250);       // kg (alvo)
  var tempoSessao = clampv(inp.tempoSessao !== undefined ? inp.tempoSessao : 4, 0.5, 12); // h
  var sobrecargaL = clampv(inp.sobrecargaL !== undefined ? inp.sobrecargaL : (pesoAtual - pesoSeco), 0, 30); // L a retirar
  var taxaRefillBasal = clampv(inp.taxaRefillBasal !== undefined ? inp.taxaRefillBasal : REFILL_BASAL, 50, 1500); // mL/h
  var albumina = clampv(inp.albumina !== undefined ? inp.albumina : 3.8, 1.0, 5.5);     // g/dL
  var volPlasma = clampv(inp.volPlasma !== undefined ? inp.volPlasma : 3.0, 1.5, 6.0);  // L plasma inicial

  // a meta de volume (L) é a sobrecarga a retirar; UF total = essa meta.
  var ufTotalL = sobrecargaL;                                   // L
  var ufRate = clampv(ufTotalL * 1000 / tempoSessao, 0, 60000); // mL/h (a velocidade da retirada)
  var ufRatePorKg = clampv(ufRate / pesoSeco, 0, 1000);         // mL/kg/h (normalizado)

  // erro do peso seco: o pesoSeco prescrito é o ALVO; o seco "real" = peso atual − sobrecarga real.
  var secoReal = clampv(pesoAtual - sobrecargaL, 25, 250);      // kg
  var erroSecoKg = pesoSeco - secoReal;                         // + : alvo acima do real (deixa sobrecarga)
                                                                // − : alvo abaixo do real (tira demais)
  // ----- simulação da sessão: RBV cai conforme integra (UF − refilling) -----
  var STEPS = 240;
  var dt = tempoSessao / STEPS;                                 // h por passo
  var rbv = 1.0;                                                // volume sanguíneo relativo inicial
  var sobra = sobrecargaL;                                      // sobrecarga residual (L) — alimenta o refilling
  var rbvMin = 1.0, somaRefill = 0, nRefill = 0;
  var crashTempo = -1;                                          // h em que o RBV cruza o limiar (−1 = nunca)
  for (var i = 0; i < STEPS; i++) {
    var deficitMl = clampv((1.0 - rbv) * volPlasma * 1000, 0, 5000); // mL de plasma já perdidos
    var refill = refilling({ sobrecarga: sobra, sobrecargaIni: sobrecargaL, taxaRefillBasal: taxaRefillBasal, albumina: albumina, deficit: deficitMl }); // mL/h
    somaRefill += refill; nRefill++;
    // balanço no plasma neste passo: água que sai pela UF − água que entra pelo refilling (mL)
    var saiPlasma = (ufRate - refill) * dt;                     // mL líquidos retirados do plasma
    var dRBV = -saiPlasma / (volPlasma * 1000);                 // variação fracional do RBV
    rbv = clampv(rbv + dRBV, 0.3, 1.05);
    if (rbv < rbvMin) rbvMin = rbv;
    if (crashTempo < 0 && rbv < RBV_CRASH) crashTempo = (i + 1) * dt;
    // o volume removido sai (em média) do interstício → a sobra cai pela UF
    sobra = clampv(sobra - (ufRate * dt) / 1000, 0, 30);        // L
  }
  var refillMedio = nRefill > 0 ? somaRefill / nRefill : 0;     // mL/h médio na sessão
  var rbvFinal = rbv;                                           // RBV ao fim da sessão
  var quedaRBVporH = clampv((1.0 - rbvFinal) / tempoSessao, 0, 1); // queda fracional por hora

  // capacidade MÁXIMA sustentável de refilling neste paciente (déficit saturado, reserva plena):
  // é o teto contra o qual a UF rate compete — a desigualdade central.
  var refillCap = refilling({ sobrecarga: sobrecargaL, sobrecargaIni: sobrecargaL, taxaRefillBasal: taxaRefillBasal, albumina: albumina, deficit: 5000 }); // mL/h

  // ----- a desigualdade central: UF rate × refilling sustentável -----
  var ufExcedeRefill = ufRate > refillCap + 1e-9;             // a UF supera o refilling máximo sustentável
  var margemRefill = refillCap - ufRate;                       // mL/h de folga (negativo = déficit)

  // hipotensão intradialítica provável: UF > refilling E o RBV cruza o limiar de crash
  var hipotensao = ufExcedeRefill && (rbvMin < RBV_CRASH);
  // stunning miocárdico: queda rápida do RBV hipoperfunde o miocárdio (didático)
  var stunning = (quedaRBVporH > 0.06) || (rbvMin < RBV_CRASH);

  // ----- erro de peso seco (vale em U) -----
  var secoBaixoDemais = erroSecoKg < -0.5;   // alvo abaixo do real → tira demais → hipotensão
  var secoAltoDemais = erroSecoKg > 0.5;     // alvo acima do real → deixa sobrecarga
  var ufRateAlta = ufRatePorKg > UF_RATE_ALTA;

  return {
    // entradas ecoadas
    pesoAtual: pesoAtual, pesoSeco: pesoSeco, tempoSessao: tempoSessao, sobrecargaL: sobrecargaL,
    taxaRefillBasal: taxaRefillBasal, albumina: albumina, volPlasma: volPlasma,
    // núcleo
    ufTotalL: ufTotalL, ufRate: ufRate, ufRatePorKg: ufRatePorKg,
    refillMedio: refillMedio, refillCap: refillCap, margemRefill: margemRefill, ufExcedeRefill: ufExcedeRefill,
    rbvFinal: rbvFinal, rbvMin: rbvMin, quedaRBVporH: quedaRBVporH, crashTempo: crashTempo,
    // peso seco
    secoReal: secoReal, erroSecoKg: erroSecoKg, secoBaixoDemais: secoBaixoDemais, secoAltoDemais: secoAltoDemais,
    // veredito
    ufRateAlta: ufRateAlta, hipotensao: hipotensao, stunning: stunning
  };
}

/* geometria PURA da curva RBV × tempo — a UI só pinta.
 * Eixo X = tempo (0 → tempoSessao). Eixo Y = RBV (0.70 embaixo → 1.02 em cima).
 * A curva cai; estabiliza se UF ≤ refilling; despenca se UF ≫ refilling.
 * Reusa a MESMA simulação amortecida de ultrafiltracao() para coerência. */
function rbvLayout(state, W, H) {
  state = state || {};
  W = clampv(W, 200, 100000); H = clampv(H, 120, 100000);
  var padL = 52, padR = 16, padT = 18, padB = 38, baseY = H - padB;
  var inp = {};
  inp.pesoAtual = clampv(state.pesoAtual !== undefined ? state.pesoAtual : 73, 30, 250);
  inp.pesoSeco = clampv(state.pesoSeco !== undefined ? state.pesoSeco : 70, 25, 250);
  inp.tempoSessao = clampv(state.tempoSessao !== undefined ? state.tempoSessao : 4, 0.5, 12);
  inp.sobrecargaL = clampv(state.sobrecargaL !== undefined ? state.sobrecargaL : (inp.pesoAtual - inp.pesoSeco), 0, 30);
  inp.taxaRefillBasal = clampv(state.taxaRefillBasal !== undefined ? state.taxaRefillBasal : REFILL_BASAL, 50, 1500);
  inp.albumina = clampv(state.albumina !== undefined ? state.albumina : 3.8, 1.0, 5.5);
  inp.volPlasma = clampv(state.volPlasma !== undefined ? state.volPlasma : 3.0, 1.5, 6.0);

  var ufRate = clampv(inp.sobrecargaL * 1000 / inp.tempoSessao, 0, 60000);
  var N = 80, dt = inp.tempoSessao / N;
  var pxX = (W - padL - padR) / inp.tempoSessao;
  // mapeia RBV [0.70, 1.02] no eixo Y
  var rbvLo = 0.70, rbvHi = 1.02, pxY = (baseY - padT) / (rbvHi - rbvLo);
  function yOf(rbv) { return baseY - (clampv(rbv, rbvLo, rbvHi) - rbvLo) * pxY; }

  var pts = [], rbv = 1.0, sobra = inp.sobrecargaL, i;
  pts.push({ t: 0, rbv: rbv, x: padL, y: yOf(rbv) });
  for (i = 0; i < N; i++) {
    var deficitMl = clampv((1.0 - rbv) * inp.volPlasma * 1000, 0, 5000);
    var refill = refilling({ sobrecarga: sobra, sobrecargaIni: inp.sobrecargaL, taxaRefillBasal: inp.taxaRefillBasal, albumina: inp.albumina, deficit: deficitMl });
    var saiPlasma = (ufRate - refill) * dt;
    rbv = clampv(rbv - saiPlasma / (inp.volPlasma * 1000), 0.30, 1.05);
    sobra = clampv(sobra - (ufRate * dt) / 1000, 0, 30);
    var t = (i + 1) * dt;
    pts.push({ t: t, rbv: rbv, x: padL + t * pxX, y: yOf(rbv) });
  }
  var crashY = yOf(RBV_CRASH);
  return {
    W: W, H: H, padL: padL, padR: padR, padT: padT, padB: padB, baseY: baseY,
    N: N, pxX: pxX, pxY: pxY, rbvLo: rbvLo, rbvHi: rbvHi, ufRate: ufRate,
    axis: { x0: padL, y0: padT, xEnd: W - padR, yEnd: baseY },
    crashY: crashY, crashRBV: RBV_CRASH,
    pts: pts,
    end: { x: pts[pts.length - 1].x, y: pts[pts.length - 1].y, rbv: pts[pts.length - 1].rbv }
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    clampv: clampv, refilling: refilling, ultrafiltracao: ultrafiltracao, rbvLayout: rbvLayout,
    UF_RATE_ALTA: UF_RATE_ALTA, RBV_CRASH: RBV_CRASH, REFILL_BASAL: REFILL_BASAL
  };
}
