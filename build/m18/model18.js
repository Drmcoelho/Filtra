/* =========================================================================
 * FILTRA · M18 — Anti-hipertensivos, RAAS e eixo endócrino-renal + ajuste
 * renal de fármacos. [CAPSTONE FARMACOLÓGICO 2]
 * ENGINE PURO. Espelhado inline no filtra18.html.
 *
 * Teses:
 *  - bloquear o RAAS (IECA/BRA/IDR/ARM/ARNI) DILATA a eferente → P_GC↓ → TFG↓ →
 *    a creatinina sobe ~até 30% — e isso costuma ser o efeito ESPERADO (nefroproteção:
 *    ↓pressão intraglomerular, ↓proteinúria). Suspender só se Cr↑ >30% ou hipercalemia.
 *  - a MESMA droga vira precipício na estenose BILATERAL de artéria renal: ali a TFG
 *    dependia da constrição eferente da AngII; removê-la derruba a P_GC.
 *  - eixo endócrino-renal: ESA (Hb↑ com teto), quelante de P (PO₄↓), calcimimético (PTH↓),
 *    análogo de vit D (Ca↑ / PTH↓).
 *  - ajuste renal de dose: dose_ajustada = f(Vd, ligação proteica, fração renal, clearance);
 *    fármaco hidrofílico, pouco ligado, de fração renal alta → acumula na DRC e a diálise o remove.
 *  - cada fármaco é uma alavanca com dose-resposta sigmoide: efeito = Emax·D/(EC50+D).
 * ========================================================================= */

function clampv(v, a, b) { var n = Number(v); if (!isFinite(n)) n = a; if (n < a) n = a; if (n > b) n = b; return n; }

// merge raso resiliente (não muta a entrada)
function merge(base, extra) { var o = {}, k; for (k in base) o[k] = base[k]; if (extra) for (k in extra) o[k] = extra[k]; return o; }

// metadados dos fármacos (dose com UNIDADE + faixa + mecanismo — §8)
// eixo: 'raas' move a hemodinâmica glomerular; 'endo' move o eixo endócrino-renal.
var FARMACOS = {
  nenhum:        { nome: '— nenhum —',                 unidade: '',        faixa: [0, 0],     ec50: 1,   eixo: '',     alvo: '',                                         efeito: '' },
  enalapril:     { nome: 'Enalapril (IECA)',           unidade: 'mg/dia',  faixa: [5, 40],    ec50: 8,   eixo: 'raas', alvo: 'ECA → ↓AngII → eferente dilata (R_E↓)',     efeito: 'P_GC↓ · TFG↓ · proteinúria↓ · K⁺↑' },
  losartana:     { nome: 'Losartana (BRA)',            unidade: 'mg/dia',  faixa: [50, 100],  ec50: 50,  eixo: 'raas', alvo: 'receptor AT₁ (bloqueio) → eferente dilata', efeito: 'P_GC↓ · TFG↓ · proteinúria↓ · K⁺↑ (menos tosse)' },
  alisquireno:   { nome: 'Alisquireno (IDR)',          unidade: 'mg/dia',  faixa: [150, 300], ec50: 150, eixo: 'raas', alvo: 'renina (inibição direta, topo da cascata)', efeito: 'P_GC↓ · TFG↓ · proteinúria↓ · K⁺↑' },
  espironolactona:{ nome: 'Espironolactona (ARM)',     unidade: 'mg/dia',  faixa: [25, 50],   ec50: 25,  eixo: 'raas', alvo: 'receptor de aldosterona (coletor)',        efeito: 'natriurese leve · K⁺↑ (poupador)' },
  sacubitril:    { nome: 'Sacubitril/valsartana (ARNI)', unidade: 'mg 2×/dia', faixa: [24, 97], ec50: 30, eixo: 'raas', alvo: 'neprilisina↓ (↑PN) + AT₁↓ (valsartana)',  efeito: 'vasodilatação + natriurese · P_GC↓ · K⁺↑' },
  epoetina:      { nome: 'Epoetina alfa (ESA)',        unidade: 'UI/kg 3×/sem', faixa: [50, 100], ec50: 50, eixo: 'endo', alvo: 'receptor de EPO (eritropoese)',         efeito: 'Hb↑ (alvo conservador, não normalizar)' },
  sevelamer:     { nome: 'Sevelâmer (quelante de P)',  unidade: 'mg/refeição', faixa: [800, 1600], ec50: 800, eixo: 'endo', alvo: 'fosfato luminal (intestino)',          efeito: 'absorção de PO₄↓ → fosfato sérico↓' },
  cinacalcete:   { nome: 'Cinacalcete (calcimimético)', unidade: 'mg/dia', faixa: [30, 90],   ec50: 30,  eixo: 'endo', alvo: 'receptor sensível ao Ca²⁺ (paratireoide)', efeito: 'PTH↓' }
};

// dose-resposta sigmoide (Emax): efeito fracionário 0..1
function emaxModel(dose, ec50, emax) {
  dose = clampv(dose, 0, 1e6); ec50 = clampv(ec50, 1e-6, 1e6); emax = clampv(emax, 0, 1);
  return clampv(emax * dose / (ec50 + dose), 0, 1);
}

// ajuste renal de dose: fração da dose plena que se deve manter na DRC.
// Vd grande, alta ligação proteica → pouco filtrado/dialisável; fração renal alta + clearance baixo → acumula (↓dose).
// dialisável quando hidrofílico (Vd baixo), pouco ligado a proteína e de fração renal relevante.
function ajusteRenal(p) {
  p = p || {};
  var Vd = clampv(p.Vd !== undefined ? p.Vd : 0.7, 0.05, 20);          // L/kg
  var ligacao = clampv(p.ligacaoProteica !== undefined ? p.ligacaoProteica : 50, 0, 100) / 100; // fração
  var fracaoRenal = clampv(p.fracaoRenal !== undefined ? p.fracaoRenal : 0.5, 0, 1);
  var clearance = clampv(p.clearance !== undefined ? p.clearance : 100, 1, 200); // mL/min (do paciente)
  // fração da dose a manter: cai com fração renal alta e clearance baixo
  var fatorClear = clearance / 100;                                     // 1 = normal
  var manter = 1 - fracaoRenal * (1 - clampv(fatorClear, 0, 1));        // 0..1
  manter = clampv(manter, 0.1, 1);
  // dialisável: Vd baixo + baixa ligação + fração renal relevante
  var indiceDialise = clampv((1 - ligacao) * (1 / (1 + Vd)) * (0.5 + fracaoRenal), 0, 1);
  var dialisavel = indiceDialise > 0.25;
  return { fracaoManter: manter, indiceDialise: indiceDialise, dialisavel: dialisavel, Vd: Vd, ligacao: ligacao * 100, fracaoRenal: fracaoRenal, clearance: clearance };
}

// função-mãe
function rim(input) {
  var inp = input || {};
  var droga = String(inp.droga == null ? 'nenhum' : inp.droga).toLowerCase();
  if (!FARMACOS.hasOwnProperty(droga)) droga = 'nenhum';
  var meta = FARMACOS[droga];
  var dose = clampv(inp.dose !== undefined ? inp.dose : (meta.faixa[0] || 0), 0, 5000);

  // basais
  var TFG = clampv(inp.TFG !== undefined ? inp.TFG : 60, 3, 160);       // mL/min
  var Cr_basal = clampv(inp.Cr_basal !== undefined ? inp.Cr_basal : 1.4, 0.3, 12); // mg/dL
  var K_basal = clampv(inp.K_basal !== undefined ? inp.K_basal : 4.5, 2.5, 7.5);   // mmol/L
  var proteinuria = clampv(inp.proteinuria !== undefined ? inp.proteinuria : 1.5, 0, 12); // g/dia
  var estenoseBilateral = inp.estenoseBilateral === true;
  // eixo endócrino basais
  var Hb_basal = clampv(inp.Hb_basal !== undefined ? inp.Hb_basal : 9.0, 4, 18);   // g/dL
  var PTH_basal = clampv(inp.PTH_basal !== undefined ? inp.PTH_basal : 600, 50, 2000); // pg/mL
  var PO4_basal = clampv(inp.PO4_basal !== undefined ? inp.PO4_basal : 6.0, 2, 12); // mg/dL
  var Ca_basal = clampv(inp.Ca_basal !== undefined ? inp.Ca_basal : 8.8, 5, 13);   // mg/dL
  var peso = clampv(inp.peso !== undefined ? inp.peso : 70, 20, 200);   // kg

  // efeito do fármaco (fração 0..1) pela curva Emax
  var efeitoFarm = droga === 'nenhum' ? 0 : emaxModel(dose, meta.ec50, 0.95);

  // ---- HEMODINÂMICA GLOMERULAR (bloqueio do RAAS na eferente) ----
  // bloqueio do RAAS dilata a eferente → ↓P_GC → ↓TFG → ↑Cr; e ↓proteinúria, ↑K.
  var bloqueioRAAS = (meta.eixo === 'raas') ? efeitoFarm : 0;
  // ARM e ARNI agem menos na eferente que IECA/BRA/IDR puros
  var potenciaEferente = 1;
  if (droga === 'espironolactona') potenciaEferente = 0.35;
  if (droga === 'sacubitril') potenciaEferente = 0.6;
  var bloqEf = bloqueioRAAS * potenciaEferente;

  // queda fracionária da P_GC (sem estenose): teto ~22% para a dilatação eferente benigna
  var dPGC_benigno = -0.22 * bloqEf;                                    // fração (negativa)
  // a TFG cai junto da P_GC; a Cr sobe inversamente (Cr ∝ 1/TFG)
  var dTFGfrac, dCrPct, flag, conduta;
  if (estenoseBilateral && bloqEf > 0) {
    // PRECIPÍCIO: a TFG dependia da AngII na eferente; remover → queda amplificada
    dTFGfrac = -(0.22 * bloqEf + 0.55 * bloqEf);                        // queda muito maior
    dPGC_benigno = -(0.22 + 0.55) * bloqEf;
  } else {
    dTFGfrac = -0.22 * bloqEf;
  }
  dTFGfrac = clampv(dTFGfrac, -0.85, 0);
  var TFG_novo = clampv(TFG * (1 + dTFGfrac), 1, 160);
  // Cr ∝ 1/TFG → ΔCr% = (TFG_basal/TFG_novo − 1)·100
  dCrPct = (TFG_novo > 0 ? (TFG / TFG_novo - 1) : 0) * 100;
  dCrPct = clampv(dCrPct, 0, 600);
  var Cr_novo = clampv(Cr_basal * (1 + dCrPct / 100), 0.3, 20);

  // fração de filtração cai (fluxo plasmático preservado) — separa do dano tubular
  var dFFfrac = clampv(-0.18 * bloqEf, -0.3, 0);                        // FF↓ no efeito hemodinâmico

  // potássio: bloqueio do RAAS sobe o K (↓aldosterona); ARM é o mais potente
  var subaK = 0;
  if (meta.eixo === 'raas') {
    subaK = (droga === 'espironolactona') ? 0.9 * efeitoFarm : 0.5 * efeitoFarm;
  }
  var K_novo = clampv(K_basal + subaK, 2.5, 8);
  var hipercalemia = K_novo >= 5.5;

  // proteinúria: bloqueio do RAAS reduz (nefroproteção) — só sem estenose perigosa
  var dProtFrac = clampv(-0.45 * bloqEf, -0.6, 0);
  var proteinuria_nova = clampv(proteinuria * (1 + dProtFrac), 0, 12);

  // ---- EIXO ENDÓCRINO-RENAL ----
  var Hb_novo = Hb_basal, PTH_novo = PTH_basal, PO4_novo = PO4_basal, Ca_novo = Ca_basal;
  if (droga === 'epoetina') Hb_novo = clampv(Hb_basal + 3.0 * efeitoFarm, 4, 12);   // teto conservador ~12
  if (droga === 'sevelamer') PO4_novo = clampv(PO4_basal * (1 - 0.45 * efeitoFarm), 2, 12);
  if (droga === 'cinacalcete') { PTH_novo = clampv(PTH_basal * (1 - 0.6 * efeitoFarm), 30, 2000); Ca_novo = clampv(Ca_basal - 0.6 * efeitoFarm, 5, 13); }

  // ---- AJUSTE RENAL DE DOSE ----
  var aj = ajusteRenal(inp);
  var dose_renal_ajustada = clampv(dose * aj.fracaoManter, 0, 5000);

  // ---- CONDUTA / FLAG hemodinâmico ----
  if (meta.eixo === 'raas' && bloqEf > 0) {
    if (estenoseBilateral) { flag = 'estenose_precipicio'; conduta = 'suspender'; }
    else if (hipercalemia) { flag = 'hipercalemia'; conduta = 'suspender'; }
    else if (dCrPct > 30) { flag = 'alta_perigosa'; conduta = 'suspender'; }
    else { flag = 'alta_esperada'; conduta = 'manter'; }
  } else if (droga === 'epoetina') { flag = 'esa'; conduta = 'titular_Hb'; }
  else if (droga === 'sevelamer') { flag = 'quelante'; conduta = 'as_refeicoes'; }
  else if (droga === 'cinacalcete') { flag = 'calcimimetico'; conduta = 'vigiar_Ca'; }
  else { flag = 'basal'; conduta = 'observar'; }

  return {
    droga: droga, dose: dose, unidade: meta.unidade, alvo: meta.alvo, faixa: meta.faixa, eixo: meta.eixo,
    nomeFarmaco: meta.nome, efeitoFarm: efeitoFarm, bloqueioRAAS: bloqueioRAAS, bloqEf: bloqEf,
    estenoseBilateral: estenoseBilateral,
    dPGCfrac: dPGC_benigno, dTFGfrac: dTFGfrac, dFFfrac: dFFfrac,
    TFG: TFG, TFG_novo: TFG_novo, Cr_basal: Cr_basal, Cr_novo: Cr_novo, dCrPct: dCrPct,
    K_basal: K_basal, K_novo: K_novo, hipercalemia: hipercalemia,
    proteinuria: proteinuria, proteinuria_nova: proteinuria_nova, dProtFrac: dProtFrac,
    Hb_basal: Hb_basal, Hb_novo: Hb_novo, PTH_basal: PTH_basal, PTH_novo: PTH_novo,
    PO4_basal: PO4_basal, PO4_novo: PO4_novo, Ca_basal: Ca_basal, Ca_novo: Ca_novo,
    Vd: aj.Vd, ligacao: aj.ligacao, fracaoRenal: aj.fracaoRenal, clearance: aj.clearance,
    fracaoManter: aj.fracaoManter, dose_renal_ajustada: dose_renal_ajustada,
    indiceDialise: aj.indiceDialise, dialisavel: aj.dialisavel, peso: peso,
    flag: flag, conduta: conduta
  };
}

// geometria PURA da curva ΔCr% × dose do bloqueio RAAS, com a zona "esperado ≤30%" × "suspender >30%".
function craLayout(state, W, H) {
  state = state || {};
  W = clampv(W, 200, 100000); H = clampv(H, 120, 100000);
  var padL = 52, padR = 16, padT = 18, padB = 38, baseY = H - padB;
  var droga = String(state.droga == null ? 'enalapril' : state.droga).toLowerCase();
  if (!FARMACOS.hasOwnProperty(droga) || FARMACOS[droga].eixo !== 'raas') droga = 'enalapril';
  var meta = FARMACOS[droga];
  var dMax = Math.max(meta.faixa[1] * 2, meta.faixa[1] + 1), N = 60;
  var crMax = 60;                                                       // % no eixo Y (teto de display)
  var estenose = state.estenoseBilateral === true;
  var TFG = clampv(state.TFG !== undefined ? state.TFG : 60, 3, 160);
  var pxX = (W - padL - padR) / dMax, pxY = (baseY - padT) / crMax;
  var pts = [], i, dd;
  for (i = 0; i <= N; i++) {
    dd = dMax * i / N;
    var r = rim({ droga: droga, dose: dd, TFG: TFG, estenoseBilateral: estenose });
    var x = padL + dd * pxX, y = baseY - clampv(r.dCrPct, 0, crMax) * pxY;
    pts.push({ x: x, y: y });
  }
  // linha do limiar de 30% (zona esperado × suspender)
  var y30 = baseY - 30 * pxY;
  var doseAtual = clampv(state.dose !== undefined ? state.dose : meta.faixa[1], 0, dMax);
  var rc = rim({ droga: droga, dose: doseAtual, TFG: TFG, estenoseBilateral: estenose });
  return {
    W: W, H: H, padL: padL, padR: padR, padT: padT, padB: padB, baseY: baseY,
    dMax: dMax, crMax: crMax, pxX: pxX, pxY: pxY, y30: y30, estenose: estenose, droga: droga,
    axis: { x0: padL, y0: padT, xEnd: W - padR, yEnd: baseY },
    curva: pts,
    current: { x: padL + doseAtual * pxX, dose: doseAtual, dCrPct: rc.dCrPct, conduta: rc.conduta }
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    clampv: clampv, merge: merge, emaxModel: emaxModel, ajusteRenal: ajusteRenal,
    rim: rim, craLayout: craLayout, FARMACOS: FARMACOS
  };
}
