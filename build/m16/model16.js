/* =========================================================================
 * FILTRA · M16 — A LRA por mecanismo (CAPSTONE fisiológico)
 * ENGINE PURO. Espelhado inline no filtra16.html.
 *
 * Teses:
 *  - "LRA" não é um diagnóstico: é uma SOMBRA projetada por 3 mecânicas opostas.
 *    A MESMA creatinina/oligúria nasce de: (1) P_GC↓ pré-renal · (2) parênquima
 *    lesado intrínseca (NTA·NIA·glomerular) · (3) P_BC↑ pós-renal/obstrução.
 *  - TFG = Kf·(P_GC − P_BC − π_GC)  (herda M1) — a função-sombra do número.
 *  - KDIGO estadia por ↑creatinina E por débito urinário — a PIOR das duas define.
 *  - índices da urina (FE_Na, FE_ureia, BUN/Cr, U_osm, sedimento) separam as vias:
 *      pré-renal: FE_Na<1% · FE_ureia<35% · BUN/Cr>20 · U_osm>500 · responde a volume
 *      NTA:       FE_Na>2% · U_osm~300 (isostenúria) · cilindros granulosos · NÃO responde
 *      pós-renal: P_BC↑ (hidronefrose) · restaura ao desobstruir
 *  - cardiorrenal: FE_Na baixa por RAAS ávido, mas o motor é CONGESTÃO venosa →
 *    volume PIORA; a conduta é descongestionar.
 *  - hepatorrenal: vasoconstrição funcional; rim normal, FE_Na<0,1%, sedimento limpo.
 * ========================================================================= */

function clampv(v, a, b) { var n = Number(v); if (!isFinite(n)) n = a; if (n < a) n = a; if (n > b) n = b; return n; }

// merge defensivo (não muta a entrada)
function merge(def, inp) {
  var o = {}, k; for (k in def) o[k] = def[k];
  if (inp) for (k in inp) if (inp[k] !== undefined) o[k] = inp[k];
  return o;
}

var KF_STD = 12.5;     // coeficiente de ultrafiltração (mL/min/mmHg)
var PIGC_STD = 28;     // pressão oncótica glomerular (mmHg)
var TFG_STD = 100;     // TFG de referência (mL/min)

// índice fracionado de sódio (%): FE_Na = (U_Na·P_Cr)/(P_Na·U_Cr)·100
function feNa(uNa, pCr, pNa, uCr) {
  uNa = clampv(uNa, 0, 300); pCr = clampv(pCr, 0.05, 60);
  pNa = clampv(pNa, 100, 180); uCr = clampv(uCr, 1, 600);
  var f = (uNa * pCr) / (pNa * uCr) * 100;
  return isFinite(f) && f >= 0 ? f : 0;
}

// índice fracionado de ureia (%): FE_ureia = (U_ur·P_Cr)/(P_ur·U_Cr)·100  (útil sob diurético)
function feUreia(uUr, pCr, pUr, uCr) {
  uUr = clampv(uUr, 0, 4000); pCr = clampv(pCr, 0.05, 60);
  pUr = clampv(pUr, 1, 400); uCr = clampv(uCr, 1, 600);
  var f = (uUr * pCr) / (pUr * uCr) * 100;
  return isFinite(f) && f >= 0 ? f : 0;
}

// TFG de Starling glomerular (mL/min) — herda M1
function tfgStarling(pGC, pBC, kf, piGC) {
  pGC = clampv(pGC, 0, 120); pBC = clampv(pBC, 0, 90);
  kf = clampv(kf, 0, 30); piGC = clampv(piGC, 0, 45);
  var puf = pGC - pBC - piGC;                 // pressão líquida de ultrafiltração
  var g = kf * (puf > 0 ? puf : 0);
  return clampv(g, 0, 250);
}

// estágio KDIGO por creatinina (relativa × absoluta)
function kdigoCreat(crBasal, crAtual) {
  crBasal = clampv(crBasal, 0.1, 30); crAtual = clampv(crAtual, 0.1, 30);
  var ratio = crAtual / crBasal;
  if (crAtual >= 4.0 || ratio >= 3.0) return 3;
  if (ratio >= 2.0) return 2;
  if (ratio >= 1.5 || (crAtual - crBasal) >= 0.3) return 1;
  return 0;
}
// estágio KDIGO por débito urinário (mL/kg/h sustentado)
function kdigoDebito(debito) {
  debito = clampv(debito, 0, 5);
  if (debito < 0.3) return 3;             // <0,3 por 24h ou anúria
  if (debito < 0.5) return 2;             // <0,5 por ≥12h (simplificação didática: estágio ≥2)
  return 0;
}

// função-mãe: a LRA como sombra de 3 mecânicas — estadia, classifica e prescreve conduta
function lra(input) {
  var def = {
    pArt: 100,           // pressão arterial média que chega ao rim (mmHg)
    pGC: 55,             // pressão capilar glomerular (mmHg) — cai no pré-renal
    pBC: 15,             // pressão na cápsula de Bowman (mmHg) — sobe na obstrução
    kf: KF_STD,          // coeficiente de ultrafiltração — cai na lesão glomerular/NTA
    integridadeTub: 1,   // 1 = túbulo íntegro; <1 = NTA (necrose tubular)
    piGC: PIGC_STD,      // pressão oncótica glomerular
    crBasal: 1.0,        // creatinina basal (mg/dL)
    crAtual: 1.0,        // creatinina atual (mg/dL)
    debitoUrinario: 1.0, // débito urinário (mL/kg/h)
    uNa: 20, pNa: 140, uCr: 100, pCr: 1.0,   // índices urinários (FE_Na)
    uUr: 400, pUr: 40,                        // ureia (FE_ureia)
    uOsm: 600,           // osmolalidade urinária (mOsm/kg) — alta no pré-renal, ~300 na NTA
    sedimento: 'limpo',  // 'limpo' | 'granuloso' | 'hematico' | 'eosinofilo'
    dc: 5.0,             // débito cardíaco (L/min) — ponte Choca (cardiorrenal)
    pressaoVenosa: 8,    // pressão venosa central (mmHg) — congestão se ↑ (cardiorrenal)
    vasodilatacaoEsplancnica: 0   // 0..1 ponte hepatorrenal (cirrose)
  };
  var inp = merge(def, input);
  var pArt = clampv(inp.pArt, 20, 200);
  var pGC = clampv(inp.pGC, 0, 120);
  var pBC = clampv(inp.pBC, 0, 90);
  var kf = clampv(inp.kf, 0, 30);
  var integridadeTub = clampv(inp.integridadeTub, 0, 1);
  var piGC = clampv(inp.piGC, 0, 45);
  var crBasal = clampv(inp.crBasal, 0.1, 30);
  var crAtual = clampv(inp.crAtual, 0.1, 30);
  var debito = clampv(inp.debitoUrinario, 0, 5);
  var uNa = clampv(inp.uNa, 0, 300);
  var pNa = clampv(inp.pNa, 100, 180);
  var uCr = clampv(inp.uCr, 1, 600);
  var pCr = clampv(inp.pCr, 0.05, 60);
  var uUr = clampv(inp.uUr, 0, 4000);
  var pUr = clampv(inp.pUr, 1, 400);
  var uOsm = clampv(inp.uOsm, 50, 1400);
  var dc = clampv(inp.dc, 1, 12);
  var pVen = clampv(inp.pressaoVenosa, 0, 30);
  var vasoEspl = clampv(inp.vasodilatacaoEsplancnica, 0, 1);
  var sedimento = (inp.sedimento === 'granuloso' || inp.sedimento === 'hematico' ||
                   inp.sedimento === 'eosinofilo' || inp.sedimento === 'limpo') ? inp.sedimento : 'limpo';

  // a TFG-sombra: o filtro de Starling, com Kf efetivo penalizado pela lesão tubular (NTA reduz superfície)
  var kfEff = kf * (0.3 + 0.7 * integridadeTub);
  var tfg = tfgStarling(pGC, pBC, kfEff, piGC);

  // índices urinários computados
  var FENa = feNa(uNa, pCr, pNa, uCr);
  var FEureia = feUreia(uUr, pCr, pUr, uCr);
  var bunCr = (pUr * 0.467) / pCr;             // BUN ≈ ureia·0.467; razão BUN/Cr plasmática

  // estadiagem KDIGO — a PIOR das duas (creatinina × débito)
  var kCreat = kdigoCreat(crBasal, crAtual);
  var kDeb = kdigoDebito(debito);
  var estagioKDIGO = Math.max(kCreat, kDeb);

  // classificador de MECANISMO (a inversão central) — lê física + índices + contexto
  var obstrucao = pBC >= 25;                   // P_BC alta = contrapressão da obstrução
  var congestao = pVen >= 14;                  // pressão venosa renal alta = cardiorrenal
  var tubuloLesado = integridadeTub < 0.6 || FENa > 2 || (uOsm < 380 && sedimento === 'granuloso');
  var preRenal = (FENa < 1) && (uOsm > 450) && (bunCr > 20);

  var mecanismo, reversibilidade, respondeVolume, conduta;
  if (obstrucao) {
    mecanismo = 'pós-renal';
    reversibilidade = 'alta (se desobstruir cedo)';
    respondeVolume = false;
    conduta = 'desobstruir: sondagem/nefrostomia/cateter — a TFG restaura quando P_BC cai. Volume não resolve.';
  } else if (vasoEspl >= 0.5 && integridadeTub >= 0.7 && FENa < 0.2 && sedimento === 'limpo') {
    mecanismo = 'hepatorrenal';
    reversibilidade = 'funcional (sem dano estrutural)';
    respondeVolume = false;
    conduta = 'vasoconstritor esplâncnico (terlipressina/noradrenalina) + albumina — restaura o VCE. SF isolado não corrige.';
  } else if (congestao && integridadeTub >= 0.7) {
    mecanismo = 'cardiorrenal';
    reversibilidade = 'alta (com descongestão)';
    respondeVolume = false;
    conduta = 'DESCONGESTIONAR (diurético de alça em infusão / UF se refratário) + otimizar DC. Volume PIORA (sobe a pressão venosa renal).';
  } else if (sedimento === 'eosinofilo') {
    mecanismo = 'NIA';
    reversibilidade = 'média (suspender o fármaco; corticoide se necessário)';
    respondeVolume = false;
    conduta = 'suspender o fármaco culpado (AINE, IBP, antibiótico) — nefrite intersticial alérgica; eosinofilúria.';
  } else if (sedimento === 'hematico') {
    mecanismo = 'glomerular';
    reversibilidade = 'variável (depende da causa glomerular)';
    respondeVolume = false;
    conduta = 'investigar glomerulonefrite (cilindros hemáticos, proteinúria) — biópsia/imunossupressão conforme causa.';
  } else if (tubuloLesado) {
    mecanismo = 'NTA (intrínseca)';
    reversibilidade = 'baixa (regenera em 1–3 semanas)';
    respondeVolume = false;
    conduta = 'suporte: suspender nefrotóxicos, evitar nova isquemia, manejar volume/eletrólitos. Volume NÃO restaura a TFG.';
  } else if (preRenal) {
    mecanismo = 'pré-renal';
    reversibilidade = 'alta (reverte com volume/perfusão)';
    respondeVolume = true;
    conduta = 'restaurar a perfusão (volume se hipovolêmico) — o túbulo está íntegro e ávido; a TFG retorna com P_GC.';
  } else {
    // sombra ambígua — usa a física dominante
    if (pGC < 45) { mecanismo = 'pré-renal'; reversibilidade = 'alta'; respondeVolume = true;
      conduta = 'restaurar a perfusão renal (P_GC↓ domina); reavaliar índices.'; }
    else { mecanismo = 'NTA (intrínseca)'; reversibilidade = 'baixa'; respondeVolume = false;
      conduta = 'tratar como intrínseca enquanto os índices não definem; suspender nefrotóxicos.'; }
  }

  // flags didáticas
  var fenaBaixa = FENa < 1;
  var fenaBaixaMasNaoVolume = fenaBaixa && (mecanismo === 'cardiorrenal' || mecanismo === 'hepatorrenal');
  var isostenuria = Math.abs(uOsm - 300) < 60;
  var temLRA = estagioKDIGO >= 1;

  return {
    pArt: pArt, pGC: pGC, pBC: pBC, kf: kf, kfEff: kfEff, integridadeTub: integridadeTub, piGC: piGC,
    tfg: tfg, crBasal: crBasal, crAtual: crAtual, debitoUrinario: debito,
    FENa: FENa, FEureia: FEureia, bunCr: bunCr, uOsm: uOsm, sedimento: sedimento,
    kCreat: kCreat, kDeb: kDeb, estagioKDIGO: estagioKDIGO, temLRA: temLRA,
    mecanismo: mecanismo, reversibilidade: reversibilidade, respondeVolume: respondeVolume, conduta: conduta,
    dc: dc, pressaoVenosa: pVen, vasodilatacaoEsplancnica: vasoEspl,
    obstrucao: obstrucao, congestao: congestao,
    fenaBaixa: fenaBaixa, fenaBaixaMasNaoVolume: fenaBaixaMasNaoVolume, isostenuria: isostenuria
  };
}

/* ---- geometria PURA do INSTRUMENTO: o espaço de índices (FE_Na × U_osm) ----
 * eixo X = FE_Na (0..6 %), eixo Y = U_osm (200..1000 mOsm/kg).
 * Três regiões: pré-renal (FE_Na baixa, U_osm alta), NTA (FE_Na alta, U_osm ~300),
 * pós-renal (banda própria). A polilinha é a fronteira diagnóstica FE_Na=1% que a UI pinta;
 * o ponto do caso marca onde o paciente cai. (a UI só pinta — validador confere ponto a ponto)
 */
function indexSpaceLayout(state, W, H) {
  state = state || {};
  W = clampv(W, 200, 100000); H = clampv(H, 120, 100000);
  var padL = 54, padR = 16, padT = 18, padB = 38, baseY = H - padB;
  var xMin = 0, xMax = 6, yMin = 200, yMax = 1000, N = 48;
  var pxX = (W - padL - padR) / (xMax - xMin);
  var pxY = (baseY - padT) / (yMax - yMin);
  function X(fe) { return padL + (clampv(fe, xMin, xMax) - xMin) * pxX; }
  function Y(osm) { return baseY - (clampv(osm, yMin, yMax) - yMin) * pxY; }
  // fronteira FE_Na = 1% (linha vertical amostrada N+1 pontos, para o validador percorrer)
  var pts = [], i, osm;
  for (i = 0; i <= N; i++) {
    osm = yMin + (yMax - yMin) * i / N;
    pts.push({ feNa: 1, uOsm: osm, x: X(1), y: Y(osm) });
  }
  var r = lra(state);
  return {
    W: W, H: H, padL: padL, padR: padR, padT: padT, padB: padB, baseY: baseY,
    xMin: xMin, xMax: xMax, yMin: yMin, yMax: yMax, pxX: pxX, pxY: pxY,
    axis: { x0: padL, y0: padT, xEnd: W - padR, yEnd: baseY },
    pts: pts,
    boundFENa1: X(1), boundOsm500: Y(500),
    current: { x: X(r.FENa), y: Y(r.uOsm), feNa: r.FENa, uOsm: r.uOsm, mecanismo: r.mecanismo }
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    clampv: clampv, merge: merge,
    feNa: feNa, feUreia: feUreia, tfgStarling: tfgStarling,
    kdigoCreat: kdigoCreat, kdigoDebito: kdigoDebito,
    lra: lra, indexSpaceLayout: indexSpaceLayout,
    KF_STD: KF_STD, PIGC_STD: PIGC_STD, TFG_STD: TFG_STD
  };
}
