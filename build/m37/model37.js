/* =========================================================================
 * FILTRA · M37 — Síndrome CARDIORRENAL e a ULTRAFILTRAÇÃO.
 * Coração e rim falham JUNTOS; o volume é a ponte. ENGINE PURO.
 * Espelhado inline no filtra37.html. (Ponte com o braço CHOCA: PAM = DC × RVS.)
 *
 * TESE: a oligúria/queda da TFG da síndrome cardiorrenal NÃO nasce só do débito
 * cardíaco baixo (perfusão anterógrada). A CONGESTÃO VENOSA (PVC alta) é o motor
 * subestimado: ela é a pressão a MONTANTE do rim, e a perfusão renal efetiva é a
 * DIFERENÇA entre a pressão que empurra (PAM) e a que represa (PVC).
 *
 *   pressão de perfusão renal efetiva ≈ PAM − PVC
 *
 * Portanto DESCONGESTIONAR (baixar a PVC) melhora a TFG tanto ou mais que subir o DC.
 *
 * A 1ª linha de descongestão é o DIURÉTICO de alça. Mas a congestão e a baixa
 * perfusão causam RESISTÊNCIA ao diurético: a entrega da droga ao néfron cai e a
 * resposta tubular satura → a curva dose-resposta desloca-se À DIREITA (pérola
 * compartilhada com o M17). Quando o diurético FALHA (refratariedade), a
 * ULTRAFILTRAÇÃO mecânica remove volume a uma taxa fixa (mL/h), independente da
 * resposta tubular — mas exige acesso/anticoagulação e NÃO corrige eletrólitos
 * como o rim (e a UF deve ficar < refilling plasmático, ponte M23/M24).
 *
 * PÉROLAS:
 *  (1) a CONGESTÃO VENOSA, não só o DC baixo, derruba a TFG → descongestionar é o alvo.
 *  (2) a RESISTÊNCIA ao diurético desloca a curva dose-resposta à direita (teto + braking).
 *  (3) a UF mecânica RESGATA quando o diurético falha (independe do túbulo), mas não
 *      substitui a função renal (não ajusta finamente eletrólitos/ácido-base).
 * ========================================================================= */

function clampv(v, a, b) { var n = Number(v); if (!isFinite(n)) n = a; if (n < a) n = a; if (n > b) n = b; return n; }

/* limiares de referência */
var PERF_BASAL = 75;     // PAM − PVC (mmHg) de perfusão renal "plena" (TFG ~ platô)
var EC50_BASE = 1.0;     // dose-meia-resposta basal do diurético (unidade relativa de entrega)
var UF_REFILL = 400;     // teto de UF (mL/h) tolerado sem instabilidade (refilling plasmático)
var TFG_MAX = 120;       // TFG (mL/min) de teto

/* PERFUSÃO RENAL EFETIVA — o coração da tese: o que chega ao rim é PAM menos a PVC
 * (a congestão venosa é a pressão a montante que represa o glomérulo). */
function perfusaoRenal(inp) {
  inp = inp || {};
  var dc = clampv(inp.dc !== undefined ? inp.dc : 5.0, 1.0, 10.0);     // L/min
  var pvc = clampv(inp.pvc !== undefined ? inp.pvc : 6, 0, 30);        // mmHg
  var pam = clampv(inp.pam !== undefined ? inp.pam : 80, 40, 130);     // mmHg
  // pressão de perfusão renal efetiva: o gradiente arteriovenoso através do rim
  var perfPressao = pam - pvc;                                          // mmHg (clamp adiante)
  // o DC baixo reduz o componente anterógrado de forma adicional (fluxo, não só pressão):
  // um coração fraco entrega menos volume por minuto ao leito renal.
  var fatorDC = clampv(dc / 5.0, 0.2, 1.6);                            // 1.0 = DC normal
  var perfEfetiva = clampv(perfPressao, 0, 130) * (0.55 + 0.45 * clampv(fatorDC, 0, 1.4));
  return {
    dc: dc, pvc: pvc, pam: pam,
    perfPressao: perfPressao,                                          // PAM − PVC bruto (mmHg)
    fatorDC: fatorDC,
    perfEfetiva: clampv(perfEfetiva, 0, 200)                           // mmHg-equivalente de perfusão renal
  };
}

/* TFG a partir da perfusão efetiva: monótona, satura num platô (autorregulação). */
function tfgDePerfusao(perfEfetiva) {
  perfEfetiva = clampv(perfEfetiva, 0, 200);
  // Michaelis-like: sobe com a perfusão, satura perto de TFG_MAX no platô
  var f = perfEfetiva / (perfEfetiva + 30);                            // 0..~0.87
  return clampv(TFG_MAX * f / 0.74, 0, TFG_MAX);                       // normaliza p/ ~TFG_MAX em perf alta
}

/* RESPOSTA DIURÉTICA — natriurese ∝ entrega ao néfron × resposta tubular.
 * A congestão e a baixa perfusão deslocam a curva À DIREITA (EC50 sobe = resistência).
 * doseDiuretico em unidade relativa de ENTREGA (a UI rotula com mg/h ancorado ao mecanismo). */
function respostaDiuretico(inp) {
  inp = inp || {};
  var dose = clampv(inp.doseDiuretico !== undefined ? inp.doseDiuretico : 1.0, 0, 8);  // entrega relativa
  var perfusao = clampv(inp.perfusao !== undefined ? inp.perfusao : PERF_BASAL, 0, 200); // perf renal efetiva
  var resistencia = clampv(inp.resistencia !== undefined ? inp.resistencia : 0.2, 0, 1); // 0..1 (braking/CRS)
  // a baixa perfusão reduz a ENTREGA do diurético ao seu sítio (menos fluxo tubular):
  var entregaFrac = clampv(0.35 + 0.65 * (perfusao / PERF_BASAL), 0.15, 1.2);          // ~1 em perf plena
  // a resistência desloca a EC50 à DIREITA (precisa de mais dose p/ o mesmo efeito) e baixa o TETO:
  var ec50 = EC50_BASE * (1 + 3.0 * resistencia);                                       // EC50↑ com resistência
  var emax = clampv(1.0 - 0.45 * resistencia, 0.35, 1.0);                               // teto cai um pouco
  var doseEfetiva = dose * entregaFrac;                                                  // a que de fato age
  var ocupacao = doseEfetiva / (doseEfetiva + ec50);                                     // Emax·D/(EC50+D)
  var natriurese = clampv(emax * ocupacao, 0, 1);                                        // 0..1 (fração do máx)
  return {
    dose: dose, perfusao: perfusao, resistencia: resistencia,
    entregaFrac: entregaFrac, ec50: ec50, emax: emax, doseEfetiva: doseEfetiva,
    natriurese: natriurese
  };
}

/* ULTRAFILTRAÇÃO MECÂNICA — remove volume a taxa fixa (mL/h), independente do túbulo.
 * Mas UF deve ficar < refilling plasmático (senão hipotensão; ponte M23/M24). */
function ultrafiltracaoMecanica(inp) {
  inp = inp || {};
  var ufRate = clampv(inp.ufRate !== undefined ? inp.ufRate : 200, 0, UF_REFILL);       // mL/h
  var refilling = clampv(inp.refilling !== undefined ? inp.refilling : 300, 50, UF_REFILL); // mL/h
  var ufSegura = ufRate <= refilling + 1e-9;                                             // UF < refilling?
  var ufEfetiva = clampv(Math.min(ufRate, refilling), 0, UF_REFILL);                     // o que sai sem crash
  return {
    ufRate: ufRate, refilling: refilling, ufSegura: ufSegura, ufEfetiva: ufEfetiva,
    removeIndependente: true                                                             // independe do túbulo
  };
}

/* FUNÇÃO-MÃE: integra a hemodinâmica cardiorrenal, a resposta diurética e a UF,
 * decide DIURÉTICO × UF mecânica e prevê a TFG e a descongestão. */
function cardiorrenal(input) {
  var inp = input || {};
  var dc = clampv(inp.dc !== undefined ? inp.dc : 5.0, 1.0, 10.0);             // L/min
  var pvc = clampv(inp.pvc !== undefined ? inp.pvc : 6, 0, 30);               // mmHg
  var pam = clampv(inp.pam !== undefined ? inp.pam : 80, 40, 130);            // mmHg
  var doseDiuretico = clampv(inp.doseDiuretico !== undefined ? inp.doseDiuretico : 1.0, 0, 8);
  var resistencia = clampv(inp.resistencia !== undefined ? inp.resistencia : 0.2, 0, 1);
  var volume = clampv(inp.volume !== undefined ? inp.volume : 4, 0, 20);      // L acima do seco (congestão)
  var refilling = clampv(inp.refilling !== undefined ? inp.refilling : 300, 50, UF_REFILL); // mL/h
  var ufRate = clampv(inp.ufRate !== undefined ? inp.ufRate : 200, 0, UF_REFILL); // mL/h (se UF mecânica)

  // ----- hemodinâmica renal -----
  var perf = perfusaoRenal({ dc: dc, pvc: pvc, pam: pam });
  var tfg = tfgDePerfusao(perf.perfEfetiva);                                   // mL/min

  // ----- resposta diurética esperada -----
  var diur = respostaDiuretico({ doseDiuretico: doseDiuretico, perfusao: perf.perfEfetiva, resistencia: resistencia });
  // débito urinário-equivalente (mL/h) que o diurético tira — proxy didático:
  // natriurese plena ~ até ~350 mL/h de remoção líquida em rim que responde
  var debitoDiuretico = clampv(diur.natriurese * 350 * clampv(tfg / 60, 0.1, 1.2), 0, 500); // mL/h

  // RESISTÊNCIA ao diurético = refratariedade: natriurese baixa apesar de dose alta
  var refratario = (doseDiuretico >= 2.0 && diur.natriurese < 0.30) || resistencia >= 0.7;

  // ----- DECISÃO diurético × UF mecânica -----
  // diurético é a 1ª linha; UF mecânica entra quando refratário (a droga falhou)
  var conduta = refratario ? 'UF' : 'diuretico';

  // ----- UF mecânica (se indicada / se configurada) -----
  var uf = ultrafiltracaoMecanica({ ufRate: ufRate, refilling: refilling });

  // remoção de volume EFETIVA conforme a conduta (mL/h):
  var remocaoMlh;
  if (conduta === 'UF') {
    remocaoMlh = uf.ufEfetiva;                                                 // taxa fixa, independe do túbulo
  } else {
    remocaoMlh = debitoDiuretico;                                             // depende do rim/entrega
  }

  // ----- DESCONGESTÃO prevista e seu efeito na TFG (a pérola central) -----
  // baixar a PVC (descongestionar) sobe a perfEfetiva → sobe a TFG.
  // simula uma PVC alvo após ~24 h de remoção (tira volume → enche menos a veia):
  var pvcAlvo = clampv(pvc - clampv(remocaoMlh * 24 / 1000, 0, volume) * 1.2, 2, 30);  // PVC após descongestão
  var perfPos = perfusaoRenal({ dc: dc, pvc: pvcAlvo, pam: pam });
  var tfgPos = tfgDePerfusao(perfPos.perfEfetiva);                            // TFG prevista pós-descongestão
  var ganhoTFG = clampv(tfgPos - tfg, 0, TFG_MAX);                            // mL/min ganhos só descongestionando

  // quanto da queda da TFG é atribuível à CONGESTÃO (PVC) vs ao DC baixo:
  var tfgSemCongestao = tfgDePerfusao(perfusaoRenal({ dc: dc, pvc: 6, pam: pam }).perfEfetiva); // PVC normal
  var tfgSemDCbaixo = tfgDePerfusao(perfusaoRenal({ dc: 5.0, pvc: pvc, pam: pam }).perfEfetiva); // DC normal
  var perdaPorCongestao = clampv(tfgSemCongestao - tfg, 0, TFG_MAX);          // mL/min perdidos pela PVC
  var perdaPorDC = clampv(tfgSemDCbaixo - tfg, 0, TFG_MAX);                   // mL/min perdidos pelo DC

  // congestão domina a queda?
  var congestaoDomina = perdaPorCongestao >= perdaPorDC;

  // ----- veredito de descongestão -----
  var volRemovido24h = clampv(remocaoMlh * 24 / 1000, 0, volume);            // L tirados em 24 h
  var volResidual = clampv(volume - volRemovido24h, 0, 20);                  // L de congestão residual
  var descongestionado = volResidual <= 2.0;                                 // alvo: euvolemia

  return {
    // entradas ecoadas
    dc: dc, pvc: pvc, pam: pam, doseDiuretico: doseDiuretico, resistencia: resistencia,
    volume: volume, refilling: refilling, ufRate: ufRate,
    // hemodinâmica renal
    perfPressao: perf.perfPressao, perfEfetiva: perf.perfEfetiva, tfg: tfg,
    // diurético
    natriurese: diur.natriurese, ec50: diur.ec50, emax: diur.emax, entregaFrac: diur.entregaFrac,
    debitoDiuretico: debitoDiuretico, refratario: refratario,
    // decisão
    conduta: conduta,
    // UF
    ufSegura: uf.ufSegura, ufEfetiva: uf.ufEfetiva,
    // remoção e descongestão
    remocaoMlh: remocaoMlh, pvcAlvo: pvcAlvo, tfgPos: tfgPos, ganhoTFG: ganhoTFG,
    perdaPorCongestao: perdaPorCongestao, perdaPorDC: perdaPorDC, congestaoDomina: congestaoDomina,
    volRemovido24h: volRemovido24h, volResidual: volResidual, descongestionado: descongestionado
  };
}

/* GEOMETRIA PURA para o canvas (a UI só pinta). Duas curvas, ambas computadas:
 *  modo 'congestao' : TFG (eixo Y) × PVC (eixo X, 0→24) — CAI quando a PVC sobe.
 *  modo 'diuretico' : natriurese (eixo Y) × dose (eixo X, 0→6) — curva DESLOCADA à
 *                     direita pela resistência (duas polilinhas: sem × com resistência).
 * Sempre devolve `pts` (curva principal) e `current` (ponto de operação). */
function congestaoLayout(state, W, H) {
  state = state || {};
  W = clampv(W, 200, 100000); H = clampv(H, 120, 100000);
  var modo = state.modo === 'diuretico' ? 'diuretico' : 'congestao';
  var padL = 52, padR = 16, padT = 18, padB = 38, baseY = H - padB;
  var N = 60;
  var pxX = (W - padL - padR) / N, pxY = (baseY - padT);
  var base = {}; for (var kk in state) base[kk] = state[kk];
  var pts = [], pts2 = [], i;

  if (modo === 'diuretico') {
    // natriurese × dose (0→6). pts = resistência ATUAL; pts2 = sem resistência (referência).
    var resAtual = clampv(base.resistencia !== undefined ? base.resistencia : 0.2, 0, 1);
    var perfAtual = perfusaoRenal({ dc: base.dc, pvc: base.pvc, pam: base.pam }).perfEfetiva;
    for (i = 0; i <= N; i++) {
      var dose = 6 * i / N;
      var rA = respostaDiuretico({ doseDiuretico: dose, perfusao: perfAtual, resistencia: resAtual }).natriurese;
      var rB = respostaDiuretico({ doseDiuretico: dose, perfusao: PERF_BASAL, resistencia: 0 }).natriurese;
      pts.push({ x: padL + i * pxX, y: baseY - clampv(rA, 0, 1) * pxY, dose: dose, val: rA });
      pts2.push({ x: padL + i * pxX, y: baseY - clampv(rB, 0, 1) * pxY, dose: dose, val: rB });
    }
    var curR = cardiorrenal(state);
    var cdose = clampv(curR.doseDiuretico, 0, 6);
    var cx = padL + (cdose / 6) * N * pxX;
    var cy = baseY - clampv(curR.natriurese, 0, 1) * pxY;
    return {
      W: W, H: H, padL: padL, padR: padR, padT: padT, padB: padB, baseY: baseY, N: N, pxX: pxX, pxY: pxY,
      modo: modo, axis: { x0: padL, y0: padT, xEnd: W - padR, yEnd: baseY },
      pts: pts, pts2: pts2,
      current: { x: cx, y: cy, dose: cdose, val: curR.natriurese, conduta: curR.conduta }
    };
  }

  // modo 'congestao': TFG × PVC (0→24). CAI quando a PVC sobe.
  for (i = 0; i <= N; i++) {
    var pvc = 24 * i / N;
    var perf = perfusaoRenal({ dc: base.dc, pvc: pvc, pam: base.pam }).perfEfetiva;
    var tfg = tfgDePerfusao(perf);
    pts.push({ x: padL + i * pxX, y: baseY - clampv(tfg / TFG_MAX, 0, 1) * pxY, pvc: pvc, tfg: tfg });
  }
  var cur = cardiorrenal(state);
  var cpvc = clampv(cur.pvc, 0, 24);
  var ccx = padL + (cpvc / 24) * N * pxX;
  var ccy = baseY - clampv(cur.tfg / TFG_MAX, 0, 1) * pxY;
  // ponto-alvo da descongestão (PVC alvo, TFG pós)
  var apvc = clampv(cur.pvcAlvo, 0, 24);
  var ax = padL + (apvc / 24) * N * pxX;
  var ay = baseY - clampv(cur.tfgPos / TFG_MAX, 0, 1) * pxY;
  return {
    W: W, H: H, padL: padL, padR: padR, padT: padT, padB: padB, baseY: baseY, N: N, pxX: pxX, pxY: pxY,
    modo: modo, axis: { x0: padL, y0: padT, xEnd: W - padR, yEnd: baseY },
    pts: pts, pts2: pts2,
    current: { x: ccx, y: ccy, pvc: cpvc, tfg: cur.tfg, conduta: cur.conduta },
    alvo: { x: ax, y: ay, pvc: apvc, tfg: cur.tfgPos }
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    clampv: clampv,
    perfusaoRenal: perfusaoRenal, tfgDePerfusao: tfgDePerfusao,
    respostaDiuretico: respostaDiuretico, ultrafiltracaoMecanica: ultrafiltracaoMecanica,
    cardiorrenal: cardiorrenal, congestaoLayout: congestaoLayout,
    PERF_BASAL: PERF_BASAL, EC50_BASE: EC50_BASE, UF_REFILL: UF_REFILL, TFG_MAX: TFG_MAX
  };
}
