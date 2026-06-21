/* =========================================================================
 * FILTRA · M32 — DIALISA: Depuração de solutos e drogas — peso molecular,
 * ligação proteica, Vd; dosagem de fármacos na diálise (§8 farmacologia).
 * ENGINE PURO. Espelhado inline no filtra32.html.
 *
 * Teses (3 propriedades decidem se a diálise REMOVE a droga):
 *  - PESO MOLECULAR (PM): pequeno (<~500 Da) atravessa fácil; high-flux remove médios.
 *  - LIGAÇÃO PROTEICA: só a FRAÇÃO LIVRE é dialisável → f_livre = 1 − ligação.
 *  - Vd (volume de distribuição): Vd alto = a droga mora nos TECIDOS, não no sangue →
 *      pouca droga no compartimento dialisável → remoção ínfima mesmo com clearance alto.
 *      É a PÉROLA: o Vd alto BLINDA a droga (vancomicina, digoxina).
 *
 * Fração removida por sessão (modelo exponencial de wash-out do pool dialisável):
 *   K_efetivo = K_dial · f_livre · pmFator(PM, flux)          (mL/min)
 *   V_L       = Vd · peso                                     (litros do compartimento)
 *   fracaoRemovida = 1 − exp( −K_efetivo · t / (V_L · 1000) ) (t em min; V_L·1000 = mL)
 *   doseSuplementar = doseManutencao · fracaoRemovida          (re-dose pós-HD)
 *
 * Doses REAIS de referência: vancomicina 15–20 mg/kg; gentamicina 1–1,7 mg/kg;
 * cefepime ajustado por TFG. Vd: vancomicina ~0,7 / digoxina ~6 (blindada) /
 * lítio ~0,7 / fenobarbital ~0,6 (bem dialisados).
 * ========================================================================= */

function clampv(v, a, b) { var n = Number(v); if (!isFinite(n)) n = a; if (n < a) n = a; if (n > b) n = b; return n; }

// metadados dos fármacos-exemplo: dose com UNIDADE + mecanismo/propriedades (§8)
// pm: peso molecular (Da) · lig: ligação proteica (0..1) · vd: L/kg · dose: mg/kg de manutenção
var FARMACOS = {
  custom: { nome: '— manual (sliders) —', unidade: 'mg/kg', pm: 1500, lig: 0.5, vd: 1.0, dose: 10, faixa: [0, 50], alvo: 'definido nos sliders', nota: 'ajuste PM, ligação e Vd à mão' },
  vancomicina: { nome: 'Vancomicina', unidade: 'mg/kg', pm: 1449, lig: 0.5, vd: 0.7, dose: 17.5, faixa: [15, 20], alvo: 'parede bacteriana (glicopeptídeo)', nota: 'Vd moderado, PM ~1449; em HIGH-FLUX é parcialmente removida → re-dose por nível' },
  gentamicina: { nome: 'Gentamicina', unidade: 'mg/kg', pm: 478, lig: 0.10, vd: 0.25, dose: 1.7, faixa: [1, 1.7], alvo: 'ribossomo 30S (aminoglicosídeo)', nota: 'PM baixo, pouca ligação, Vd baixo → BEM removida → suplementar pós-HD' },
  cefepime: { nome: 'Cefepime', unidade: 'mg/kg', pm: 480, lig: 0.20, vd: 0.3, dose: 30, faixa: [15, 30], alvo: 'PBP (β-lactâmico)', nota: 'PM baixo, Vd baixo → dialisável; ajustado por TFG, suplementar pós-HD' },
  litio: { nome: 'Lítio', unidade: 'mEq/kg', pm: 7, lig: 0.0, vd: 0.7, dose: 0, faixa: [0, 0], alvo: 'íon (estabilizador de humor)', nota: 'PM ínfimo, ligação ZERO, Vd baixo → ALTAMENTE dialisável (toxina, M33)' },
  fenobarbital: { nome: 'Fenobarbital', unidade: 'mg/kg', pm: 232, lig: 0.45, vd: 0.6, dose: 0, faixa: [0, 0], alvo: 'GABA-A (barbitúrico)', nota: 'PM baixo, Vd baixo → dialisável (toxina, M33)' },
  digoxina: { nome: 'Digoxina', unidade: 'mcg/kg', pm: 781, lig: 0.25, vd: 6.0, dose: 0, faixa: [0, 0], alvo: 'Na/K-ATPase (cardiotônico)', nota: 'Vd ENORME (~6 L/kg) → BLINDADA: a diálise quase não a remove' }
};

// fator de permeabilidade da membrana ao PM (0..1): low-flux cai cedo, high-flux remove médios
function pmFator(pm, highFlux) {
  pm = clampv(pm, 1, 60000);
  var corte = highFlux ? 15000 : 1500;      // PM (Da) de meia-passagem da membrana
  var n = highFlux ? 2.2 : 3.0;             // inclinação (low-flux corta mais abrupto)
  // sigmoide decrescente: pequeno ~1, grande ~0
  var f = 1 / (1 + Math.pow(pm / corte, n));
  return clampv(f, 0, 1);
}

// função-mãe: depuração de uma droga por uma sessão de diálise
function dialdrug(input) {
  var inp = input || {};
  var droga = String(inp.droga == null ? 'custom' : inp.droga).toLowerCase();
  if (!FARMACOS.hasOwnProperty(droga)) droga = 'custom';
  var meta = FARMACOS[droga];

  // propriedades: do fármaco escolhido OU dos sliders (modo manual)
  var manual = droga === 'custom';
  var pm = clampv(inp.pm !== undefined && manual ? inp.pm : meta.pm, 1, 60000);          // Da
  var ligacao = clampv((inp.ligacao !== undefined && manual ? inp.ligacao : meta.lig), 0, 0.999); // fração 0..0.999
  var vd = clampv(inp.vd !== undefined && manual ? inp.vd : meta.vd, 0.05, 30);          // L/kg
  var kdial = clampv(inp.kdial !== undefined ? inp.kdial : 180, 1, 400);                 // mL/min (clearance do dialisador)
  var t = clampv(inp.t !== undefined ? inp.t : 240, 1, 1440);                            // min (duração da sessão)
  var peso = clampv(inp.peso !== undefined ? inp.peso : 70, 20, 250);                    // kg
  var highFlux = inp.highFlux === true;
  var doseMgKg = clampv(inp.dose !== undefined && manual ? inp.dose : meta.dose, 0, 5000); // dose de manutenção (mg/kg)

  // (a) só a fração LIVRE é dialisável
  var fLivre = clampv(1 - ligacao, 0.001, 1);
  // (b) o PM modula a passagem pela membrana
  var fpm = pmFator(pm, highFlux);
  // clearance efetivo da droga (mL/min)
  var kEfetivo = clampv(kdial * fLivre * fpm, 0, 400);

  // (c) Vd: volume do compartimento dialisável (L → mL)
  var vL = clampv(vd * peso, 1, 7500);          // litros
  var vmL = vL * 1000;                          // mL

  // wash-out exponencial do pool: fração removida na sessão
  var expo = kEfetivo * t / vmL;                // adimensional
  var fracaoRemovida = clampv(1 - Math.exp(-expo), 0, 1);   // 0..1

  // dose de manutenção total e suplementar (re-dose pós-HD)
  var doseTotalMg = doseMgKg * peso;            // mg (a dose absoluta)
  var doseSuplementarMg = clampv(doseTotalMg * fracaoRemovida, 0, 1e7); // mg

  // meia-vida intradialítica equivalente (min) — quanto a diálise "encurta" a droga
  var meiaVidaDial = kEfetivo > 1e-9 ? clampv(0.693 * vmL / kEfetivo, 1, 1e7) : 1e7;

  // dialisabilidade (rótulo por mecanismo)
  var dializavel = fracaoRemovida >= 0.25;      // ≥25% removido = clinicamente relevante
  var classe;
  if (vd >= 3) classe = 'blindada_vd';                       // Vd alto blinda
  else if (ligacao >= 0.85) classe = 'blindada_ligacao';     // muito ligada
  else if (fracaoRemovida >= 0.5) classe = 'bem_removida';
  else if (dializavel) classe = 'parcial';
  else classe = 'mal_removida';

  return {
    droga: droga, nomeFarmaco: meta.nome, unidade: meta.unidade, alvo: meta.alvo, nota: meta.nota,
    pm: pm, ligacao: ligacao, vd: vd, kdial: kdial, t: t, peso: peso, highFlux: highFlux,
    fLivre: fLivre, fpm: fpm, kEfetivo: kEfetivo, vL: vL, expo: expo,
    fracaoRemovida: fracaoRemovida, doseMgKg: doseMgKg, doseTotalMg: doseTotalMg,
    doseSuplementarMg: doseSuplementarMg, meiaVidaDial: meiaVidaDial,
    dializavel: dializavel, classe: classe
  };
}

// geometria PURA da curva fração removida × Vd (o despencar com Vd alto), com markers
function vdLayout(state, W, H) {
  state = state || {};
  W = clampv(W, 200, 100000); H = clampv(H, 120, 100000);
  var padL = 52, padR = 16, padT = 18, padB = 38, baseY = H - padB;
  var vdMin = 0.1, vdMax = 8, N = 60;
  var droga = String(state.droga == null ? 'custom' : state.droga).toLowerCase();
  if (!FARMACOS.hasOwnProperty(droga)) droga = 'custom';
  var meta = FARMACOS[droga], manual = droga === 'custom';
  var ligacao = clampv((state.ligacao !== undefined && manual ? state.ligacao : meta.lig), 0, 0.999);
  var pm = clampv(state.pm !== undefined && manual ? state.pm : meta.pm, 1, 60000);
  var kdial = clampv(state.kdial !== undefined ? state.kdial : 180, 1, 400);
  var t = clampv(state.t !== undefined ? state.t : 240, 1, 1440);
  var peso = clampv(state.peso !== undefined ? state.peso : 70, 20, 250);
  var highFlux = state.highFlux === true;
  var fLivre = clampv(1 - ligacao, 0.001, 1), fpm = pmFator(pm, highFlux);
  var kEf = clampv(kdial * fLivre * fpm, 0, 400);

  var pxX = (W - padL - padR) / (vdMax - vdMin), pxY = (baseY - padT);
  var curva = [], i, vdv, fr;
  for (i = 0; i <= N; i++) {
    vdv = vdMin + (vdMax - vdMin) * i / N;
    var vmL = clampv(vdv * peso, 1, 7500) * 1000;
    fr = clampv(1 - Math.exp(-(kEf * t / vmL)), 0, 1);
    curva.push({ x: padL + (vdv - vdMin) * pxX, y: baseY - fr * pxY, vd: vdv, fr: fr });
  }
  // markers dos fármacos-exemplo (mesma membrana/t/peso, propriedade Vd própria)
  var marks = [];
  ['litio', 'gentamicina', 'vancomicina', 'digoxina'].forEach(function (k) {
    var m = FARMACOS[k]; var fl = clampv(1 - m.lig, 0.001, 1), fp = pmFator(m.pm, highFlux);
    var ke = clampv(kdial * fl * fp, 0, 400);
    var vmL = clampv(m.vd * peso, 1, 7500) * 1000;
    var f = clampv(1 - Math.exp(-(ke * t / vmL)), 0, 1);
    var vdc = clampv(m.vd, vdMin, vdMax);
    marks.push({ k: k, nome: m.nome, vd: m.vd, fr: f, x: padL + (vdc - vdMin) * pxX, y: baseY - f * pxY });
  });
  var vdReal = (state.vd !== undefined && manual ? state.vd : meta.vd);
  var vdc = clampv(vdReal, vdMin, vdMax);
  var vmLc = clampv(vdReal, 0.05, 30) * clampv(peso, 20, 250) * 1000;
  var frc = clampv(1 - Math.exp(-(kEf * t / vmLc)), 0, 1);
  return {
    W: W, H: H, padL: padL, padR: padR, padT: padT, padB: padB, baseY: baseY,
    vdMin: vdMin, vdMax: vdMax, pxX: pxX, pxY: pxY,
    axis: { x0: padL, y0: padT, xEnd: W - padR, yEnd: baseY },
    curva: curva, marks: marks,
    current: { x: padL + (vdc - vdMin) * pxX, y: baseY - frc * pxY, vd: vdc, fr: frc }
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    clampv: clampv, pmFator: pmFator, dialdrug: dialdrug, vdLayout: vdLayout, FARMACOS: FARMACOS
  };
}
