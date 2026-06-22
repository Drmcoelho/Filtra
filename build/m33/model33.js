/* =========================================================================
 * FILTRA · M33 — DIALISA: Remoção de TOXINAS — intoxicações dialisáveis
 * (lítio, salicilato, metanol, etilenoglicol); indicação e dose. ENGINE PURO.
 * Espelhado inline no filtra33.html.
 *
 * TESE: uma toxina é DIALISÁVEL quando tem
 *   - baixo PESO MOLECULAR (atravessa a membrana),
 *   - baixa LIGAÇÃO proteica (só a fração LIVRE é dialisável),
 *   - baixo Vd (mora no sangue, não nos tecidos) e é HIDROSSOLÚVEL.
 *
 * Cinética de remoção (wash-out exponencial do pool dialisável):
 *   K_total = K_dial + K_endo            (mL/min) — extracorpóreo + endógeno
 *   V_mL    = Vd · peso · 1000           (mL do compartimento de distribuição)
 *   C(t) = C0 · exp( -K_total · t / V_mL )    (t em min)
 *   t_alvo = V_mL/K_total · ln(C0/alvo)        (min até o nível seguro)
 *
 * REBOTE pós-diálise: toxinas com Vd alto (lítio nos tecidos) reequilibram ->
 *   o nível plasmático SOBE após desligar a máquina -> pode pedir nova sessão.
 *
 * As toxinas-âncora também CORRIGEM A ACIDOSE: a HD remove o tóxico E repõe
 * tampão (salicilato, metanol, etilenoglicol geram ácido). O FOMEPIZOL bloqueia
 * a álcool-desidrogenase (ADH) -> impede a conversão em metabólito tóxico
 * (metanol->formato; etilenoglicol->oxalato) — mecanismo, sem dose de massa.
 *
 * §8 (DIALISA): NÍVEIS de toxina como CONCENTRAÇÕES (mEq/L, mmol/L, mg/dL —
 * sempre com "/"); clearances em mL/min; tempos em h. SEM dose de massa solta.
 * ========================================================================= */

function clampv(v, a, b) { var n = Number(v); if (!isFinite(n)) n = a; if (n < a) n = a; if (n > b) n = b; return n; }

/* metadados das toxinas-âncora (§8: nível em CONCENTRAÇÃO com "/"; sem dose de massa).
 * pm: peso molecular (Da) · lig: ligação proteica (0..1) · vd: L/kg · hidro: hidrossolubilidade (0..1)
 * unidade: a do NÍVEL · c0: nível típico de gravidade · alvo: nível-alvo seguro · limiar: nível que indica HD
 * corrigeAcido: a HD também repõe tampão · fomepizol: o bloqueio enzimático faz sentido */
var TOXINAS = {
  custom: { nome: '— manual (sliders) —', unidade: 'mmol/L', pm: 100, lig: 0.3, vd: 0.6, hidro: 0.8, c0: 4, alvo: 1, limiar: 2.5, corrigeAcido: false, fomepizol: false, alvoMolec: 'definido nos sliders', nota: 'ajuste PM, ligação, Vd à mão' },
  litio: { nome: 'Lítio', unidade: 'mEq/L', pm: 7, lig: 0.0, vd: 0.7, hidro: 1.0, c0: 3.5, alvo: 1.0, limiar: 4.0, corrigeAcido: false, fomepizol: false, alvoMolec: 'íon monovalente (estabilizador de humor)', nota: 'PM ínfimo, ligação ZERO, Vd baixo -> ALTAMENTE dialisável; MAS rebota dos tecidos (pool intracelular) -> reavaliar o nível e repetir a sessão' },
  salicilato: { nome: 'Salicilato (AAS)', unidade: 'mg/dL', pm: 138, lig: 0.55, vd: 0.2, hidro: 0.9, c0: 90, alvo: 30, limiar: 80, corrigeAcido: true, fomepizol: false, alvoMolec: 'desacopla a fosforilação oxidativa', nota: 'PM baixo, Vd baixo; a ligação satura e o Vd sobe na acidemia (mais fração livre) -> dialisável; a HD remove o tóxico E corrige a acidose metabólica' },
  metanol: { nome: 'Metanol', unidade: 'mg/dL', pm: 32, lig: 0.0, vd: 0.6, hidro: 1.0, c0: 60, alvo: 20, limiar: 50, corrigeAcido: true, fomepizol: true, alvoMolec: 'metabolizado a FORMATO (toxina retiniana/SNC)', nota: 'PM ínfimo, ligação zero, Vd baixo -> muito dialisável; a HD remove o álcool E o ácido (formato + acidose). Fomepizol BLOQUEIA a ADH e trava a produção de formato' },
  etilenoglicol: { nome: 'Etilenoglicol', unidade: 'mg/dL', pm: 62, lig: 0.0, vd: 0.65, hidro: 1.0, c0: 60, alvo: 20, limiar: 50, corrigeAcido: true, fomepizol: true, alvoMolec: 'metabolizado a OXALATO (cristais -> LRA)', nota: 'PM baixo, Vd baixo -> dialisável; a HD remove o álcool E o ácido. Fomepizol BLOQUEIA a ADH e trava a produção de glicolato/oxalato' },
  digoxina: { nome: 'Digoxina', unidade: 'ng/mL', pm: 781, lig: 0.25, vd: 6.0, hidro: 0.3, c0: 6, alvo: 2, limiar: 5, corrigeAcido: false, fomepizol: false, alvoMolec: 'Na/K-ATPase (cardiotônico)', nota: 'FRONTEIRA: Vd ENORME (~6 L/kg) -> mora nos tecidos -> NÃO dialisável; trata-se com Fab antidigoxina, não com a máquina' }
};

/* ÍNDICE DE DIALISABILIDADE [0..1] — função de PM, ligação, Vd, hidrossolubilidade.
 * Quatro fatores multiplicativos: cada propriedade "ruim" derruba o score. */
function dialisabilidade(input) {
  var inp = input || {};
  var pm = clampv(inp.pm !== undefined ? inp.pm : 100, 1, 60000);        // Da
  var ligacao = clampv(inp.ligacao !== undefined ? inp.ligacao : 0.3, 0, 0.999); // fração
  var vd = clampv(inp.vd !== undefined ? inp.vd : 0.6, 0.05, 30);        // L/kg
  var hidro = clampv(inp.hidro !== undefined ? inp.hidro : 0.8, 0, 1);   // hidrossolubilidade 0..1

  // PM: sigmoide decrescente (pequeno ~1, grande ~0); corte ~1500 Da
  var fPM = clampv(1 / (1 + Math.pow(pm / 1500, 2.2)), 0, 1);
  // ligação: só a fração livre é dialisável
  var fLig = clampv(1 - ligacao, 0.001, 1);
  // Vd: Vd baixo ~1; Vd alto blinda (sigmoide decrescente, meia-queda ~1.2 L/kg)
  var fVd = clampv(1 / (1 + Math.pow(vd / 1.2, 1.8)), 0, 1);
  // hidrossolubilidade entra linear (lipossolúvel sequestra em gordura)
  var fHidro = clampv(0.3 + 0.7 * hidro, 0, 1);

  var score = clampv(fPM * fLig * fVd * fHidro, 0, 1);
  return { pm: pm, ligacao: ligacao, vd: vd, hidro: hidro, fPM: fPM, fLig: fLig, fVd: fVd, fHidro: fHidro, score: score };
}

/* CINÉTICA DE REMOÇÃO — wash-out exponencial; tempo até o nível-alvo seguro. */
function remocao(input) {
  var inp = input || {};
  var c0 = clampv(inp.c0 !== undefined ? inp.c0 : 4, 0, 1e6);            // nível inicial (na unidade da toxina)
  var alvo = clampv(inp.alvo !== undefined ? inp.alvo : 1, 0, 1e6);      // nível-alvo seguro
  var kdial = clampv(inp.kdial !== undefined ? inp.kdial : 180, 0, 400); // mL/min (clearance extracorpóreo)
  var kendo = clampv(inp.kendo !== undefined ? inp.kendo : 10, 0, 400);  // mL/min (clearance endógeno residual)
  var vd = clampv(inp.vd !== undefined ? inp.vd : 0.6, 0.05, 30);        // L/kg
  var peso = clampv(inp.peso !== undefined ? inp.peso : 70, 20, 250);    // kg
  var t = clampv(inp.t !== undefined ? inp.t : 240, 1, 1440);           // min (duração avaliada)

  var kTotal = clampv(kdial + kendo, 0.001, 800);                        // mL/min
  var vmL = clampv(vd * peso, 1, 7500) * 1000;                           // mL do compartimento
  var kRate = kTotal / vmL;                                              // min^-1 (constante de decaimento)

  var ct = clampv(c0 * Math.exp(-kRate * t), 0, 1e6);                    // nível em t
  var fracaoRemovida = c0 > 1e-12 ? clampv(1 - ct / c0, 0, 1) : 0;       // fração tirada na janela
  // tempo até o alvo (min) — só se C0 > alvo
  var tAlvoMin = (c0 > alvo && alvo > 0 && kRate > 1e-12) ? clampv(Math.log(c0 / alvo) / kRate, 0, 1e6) : 0;
  var tAlvoH = tAlvoMin / 60;
  // meia-vida intradialítica equivalente (min)
  var meiaVida = kRate > 1e-12 ? clampv(0.693 / kRate, 0, 1e7) : 1e7;

  return {
    c0: c0, alvo: alvo, kdial: kdial, kendo: kendo, vd: vd, peso: peso, t: t,
    kTotal: kTotal, vmL: vmL, kRate: kRate, ct: ct, fracaoRemovida: fracaoRemovida,
    tAlvoMin: tAlvoMin, tAlvoH: tAlvoH, meiaVida: meiaVida
  };
}

/* REBOTE pós-diálise — Vd alto reequilibra dos tecidos -> nível plasmático sobe.
 * fração de rebote [0..1] cresce com Vd (sigmoide), modulada pelo quanto foi removido. */
function rebote(input) {
  var inp = input || {};
  var vd = clampv(inp.vd !== undefined ? inp.vd : 0.6, 0.05, 30);
  var fracaoRemovida = clampv(inp.fracaoRemovida !== undefined ? inp.fracaoRemovida : 0.5, 0, 1);
  var ctFim = clampv(inp.ctFim !== undefined ? inp.ctFim : 0, 0, 1e6);   // nível no fim da sessão

  // potencial de rebote pelo Vd: Vd baixo ~ pouco; alto ~ muito (meia-subida ~1.0 L/kg)
  var potencialVd = clampv((vd / (vd + 1.0)), 0, 1);
  // só rebota o que ainda há nos tecidos -> escala pelo quanto foi removido do sangue
  var fracaoRebote = clampv(potencialVd * (0.4 + 0.6 * fracaoRemovida), 0, 0.9);
  // nível previsto após o reequilíbrio: sobe a partir do fim de sessão
  var nivelPosRebote = clampv(ctFim * (1 + fracaoRebote * 3), 0, 1e6);
  var reboteSignificativo = fracaoRebote >= 0.30;

  return { vd: vd, potencialVd: potencialVd, fracaoRebote: fracaoRebote, nivelPosRebote: nivelPosRebote, reboteSignificativo: reboteSignificativo };
}

/* FUNÇÃO-MÃE — dada a toxina e o nível, decide dialisabilidade, indicação de HD,
 * tempo estimado de sessão e risco de rebote; integra correção de acidose + fomepizol. */
function toxina(input) {
  var inp = input || {};
  var nome = String(inp.toxina == null ? 'custom' : inp.toxina).toLowerCase();
  if (!TOXINAS.hasOwnProperty(nome)) nome = 'custom';
  var meta = TOXINAS[nome];
  var manual = nome === 'custom';

  // propriedades: do metadado OU dos sliders (modo manual)
  var pm = clampv((inp.pm !== undefined && manual) ? inp.pm : meta.pm, 1, 60000);
  var ligacao = clampv((inp.ligacao !== undefined && manual) ? inp.ligacao : meta.lig, 0, 0.999);
  var vd = clampv((inp.vd !== undefined && manual) ? inp.vd : meta.vd, 0.05, 30);
  var hidro = clampv((inp.hidro !== undefined && manual) ? inp.hidro : meta.hidro, 0, 1);

  // nível atual e parâmetros do circuito
  var nivel = clampv(inp.nivel !== undefined ? inp.nivel : meta.c0, 0, 1e6);  // na unidade da toxina
  var alvo = clampv(inp.alvo !== undefined ? inp.alvo : meta.alvo, 0, 1e6);
  var limiar = clampv(inp.limiar !== undefined ? inp.limiar : meta.limiar, 0, 1e6);
  var kdial = clampv(inp.kdial !== undefined ? inp.kdial : 180, 0, 400);  // mL/min
  var kendo = clampv(inp.kendo !== undefined ? inp.kendo : (meta.fomepizol ? 5 : 12), 0, 400); // mL/min
  var peso = clampv(inp.peso !== undefined ? inp.peso : 70, 20, 250);     // kg
  var sintomas = clampv(inp.sintomas !== undefined ? inp.sintomas : 0, 0, 1); // gravidade clínica 0..1
  var acidose = clampv(inp.acidose !== undefined ? inp.acidose : 0, 0, 1);    // gravidade da acidose 0..1
  var tSessao = clampv(inp.tSessao !== undefined ? inp.tSessao : 240, 30, 1440); // min

  // (1) índice de dialisabilidade
  var di = dialisabilidade({ pm: pm, ligacao: ligacao, vd: vd, hidro: hidro });

  // (2) cinética: clearance efetivo escala pela dialisabilidade (a membrana só remove o que passa)
  var kdialEf = clampv(kdial * di.score, 0, 400);
  var rk = remocao({ c0: nivel, alvo: alvo, kdial: kdialEf, kendo: kendo, vd: vd, peso: peso, t: tSessao });

  // (3) rebote
  var rb = rebote({ vd: vd, fracaoRemovida: rk.fracaoRemovida, ctFim: rk.ct });

  // (4) INDICAÇÃO de HD — por nível acima do limiar OU gravidade OU acidose grave nas toxinas que a geram
  var acimaLimiar = nivel >= limiar;
  var graveClinico = sintomas >= 0.6;
  var acidoGrave = meta.corrigeAcido && acidose >= 0.6;
  var dialisavel = di.score >= 0.4;        // dialisabilidade clinicamente relevante
  var indicaHD = dialisavel && (acimaLimiar || graveClinico || acidoGrave);
  // FRONTEIRA: toxina NÃO dialisável (Vd alto / muito ligada) -> HD não ajuda mesmo grave
  var naoDialisavel = di.score < 0.4;

  // (5) a HD corrige a ACIDOSE nas toxinas que a geram (repõe tampão)
  var corrigeAcidose = meta.corrigeAcido;
  var fomepizolUtil = meta.fomepizol;

  // classe (rótulo por mecanismo)
  var classe;
  if (vd >= 3) classe = 'blindada_vd';
  else if (ligacao >= 0.85) classe = 'blindada_ligacao';
  else if (di.score >= 0.6) classe = 'muito_dialisavel';
  else if (dialisavel) classe = 'parcial';
  else classe = 'mal_dialisavel';

  return {
    toxina: nome, nome: meta.nome, unidade: meta.unidade, alvoMolec: meta.alvoMolec, nota: meta.nota,
    pm: pm, ligacao: ligacao, vd: vd, hidro: hidro,
    nivel: nivel, alvo: alvo, limiar: limiar, kdial: kdial, kdialEf: kdialEf, kendo: kendo, peso: peso,
    sintomas: sintomas, acidose: acidose, tSessao: tSessao,
    // dialisabilidade
    score: di.score, fPM: di.fPM, fLig: di.fLig, fVd: di.fVd, fHidro: di.fHidro,
    // cinética
    kTotal: rk.kTotal, kRate: rk.kRate, ct: rk.ct, fracaoRemovida: rk.fracaoRemovida,
    tAlvoMin: rk.tAlvoMin, tAlvoH: rk.tAlvoH, meiaVida: rk.meiaVida,
    // rebote
    potencialVd: rb.potencialVd, fracaoRebote: rb.fracaoRebote, nivelPosRebote: rb.nivelPosRebote, reboteSignificativo: rb.reboteSignificativo,
    // decisão
    acimaLimiar: acimaLimiar, graveClinico: graveClinico, acidoGrave: acidoGrave,
    dialisavel: dialisavel, indicaHD: indicaHD, naoDialisavel: naoDialisavel,
    corrigeAcidose: corrigeAcidose, fomepizolUtil: fomepizolUtil, classe: classe
  };
}

/* LAYOUT PURO — geometria da QUEDA do nível x tempo (com HD, sem HD, e rebote pós).
 * Eixo X = tempo (0..tMax min); eixo Y = nível normalizado (0..nivel0). A UI só pinta. */
function nivelLayout(state, W, H) {
  state = state || {};
  W = clampv(W, 200, 100000); H = clampv(H, 120, 100000);
  var padL = 52, padR = 16, padT = 18, padB = 38, baseY = H - padB;

  var r = toxina(state);
  var nivel0 = clampv(r.nivel, 1e-6, 1e6);
  var tSessao = r.tSessao;                       // min de HD
  var tMax = clampv(tSessao * 1.8, 60, 1440);    // janela total mostrada (inclui pós)
  var N = 80;

  // escala Y: do 0 ao nivel0 (com folga para o rebote)
  var yMaxData = Math.max(nivel0, r.nivelPosRebote);
  var yTop = yMaxData * 1.05;
  var pxX = (W - padL - padR) / tMax;
  var pxY = (baseY - padT) / (yTop > 1e-9 ? yTop : 1);

  // curva COM HD: exponencial durante a sessão, depois rebote (sobe rumo a nivelPosRebote)
  // curva SEM HD: só o clearance endógeno (lento)
  var kHD = r.kRate;                              // min^-1 com a máquina
  var vmLendo = clampv(r.vd * r.peso, 1, 7500) * 1000;
  var kEndoRate = clampv(r.kendo / vmLendo, 0, 1);
  var comHD = [], semHD = [], i, tt, yHD, ySem, ctFim = r.ct;
  for (i = 0; i <= N; i++) {
    tt = tMax * i / N;
    if (tt <= tSessao) {
      yHD = nivel0 * Math.exp(-kHD * tt);
    } else {
      // pós-sessão: parte de ctFim e rebota assintoticamente para nivelPosRebote
      var dt = tt - tSessao;
      var alvoReb = r.nivelPosRebote;
      yHD = alvoReb - (alvoReb - ctFim) * Math.exp(-dt / 60); // tau~60 min de reequilíbrio
    }
    ySem = nivel0 * Math.exp(-kEndoRate * tt);
    yHD = clampv(yHD, 0, 1e6); ySem = clampv(ySem, 0, 1e6);
    comHD.push({ t: tt, y: yHD, x: padL + tt * pxX, py: baseY - clampv(yHD, 0, yTop) * pxY });
    semHD.push({ t: tt, y: ySem, x: padL + tt * pxX, py: baseY - clampv(ySem, 0, yTop) * pxY });
  }
  // linhas de referência: alvo e limiar
  var yAlvo = baseY - clampv(r.alvo, 0, yTop) * pxY;
  var yLimiar = baseY - clampv(r.limiar, 0, yTop) * pxY;
  var xSessao = padL + clampv(tSessao, 0, tMax) * pxX;

  return {
    W: W, H: H, padL: padL, padR: padR, padT: padT, padB: padB, baseY: baseY, N: N,
    pxX: pxX, pxY: pxY, tMax: tMax, yTop: yTop, tSessao: tSessao,
    axis: { x0: padL, y0: padT, xEnd: W - padR, yEnd: baseY },
    comHD: comHD, semHD: semHD,
    refs: { yAlvo: yAlvo, yLimiar: yLimiar, xSessao: xSessao, alvo: r.alvo, limiar: r.limiar },
    score: r.score, fracaoRemovida: r.fracaoRemovida, fracaoRebote: r.fracaoRebote,
    indicaHD: r.indicaHD, naoDialisavel: r.naoDialisavel
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    clampv: clampv, dialisabilidade: dialisabilidade, remocao: remocao, rebote: rebote,
    toxina: toxina, nivelLayout: nivelLayout, TOXINAS: TOXINAS
  };
}
