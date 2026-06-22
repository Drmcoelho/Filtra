/* =========================================================================
 * FILTRA · M35 — Indicações de TRS: o AEIOU como MAPA de conduta.
 * ENGINE PURO. Espelhado inline no filtra35.html.
 *
 * TESE: a indicação de terapia de substituição renal (TRS) NÃO é um número de
 * creatinina. É um GATILHO REFRATÁRIO em um dos cinco eixos do mnemônico AEIOU:
 *   A — Acidose      (metabólica grave, refratária ao tampão/clínica)
 *   E — Eletrólitos  (hipercalemia refratária, com alteração de ECG)
 *   I — Intoxicação  (toxina DIALISÁVEL em nível/gravidade que pede remoção)
 *   O — Overload     (sobrecarga de volume refratária — edema pulmonar)
 *   U — Uremia       (sintomática — pericardite, encefalopatia)
 *
 * PRINCÍPIO CENTRAL (a inversão): QUALQUER eixo refratário DISPARA a indicação,
 * INDEPENDENTE dos outros. Não é um score somado que precisa de muitos eixos —
 * é um OR de cinco gatilhos. Hipercalemia refratária com ECG indica a máquina
 * mesmo com ureia normal, pH normal e sem sobrecarga.
 *
 * REFRATÁRIO × RESPONSIVO: o mesmo número decide diferente conforme RESPONDE ou
 * NÃO à clínica. K⁺ 6,8 que cai com insulina/glicose/beta-2 não indica TRS; o
 * mesmo K⁺ 6,8 refratário, com ECG, indica. Responder à clínica BAIXA a
 * severidade do eixo e o tira da indicação.
 *
 * (Distinto do M36 — que é o MOMENTO/precoce×tardio. Aqui é o MAPA AEIOU →
 *  conduta: identificar O QUE indica, e qual eixo é dominante.)
 *
 * Unidades: K⁺/HCO₃⁻ em mEq/L; ureia em mg/dL; volume em L. Sem dose de massa.
 * ========================================================================= */

function clampv(v, a, b) { var n = Number(v); if (!isFinite(n)) n = a; if (n < a) n = a; if (n > b) n = b; return n; }

/* limiares de referência (espelham a literatura/M33/M36) */
var PH_GRAVE = 7.15;      // pH abaixo do qual a acidose é grave
var HCO3_GRAVE = 12;      // HCO₃⁻ (mEq/L) abaixo do qual a acidose é grave
var K_PERIGO = 6.0;       // K⁺ (mEq/L) que entra na zona de perigo
var UREIA_ALTA = 180;     // ureia (mg/dL) onde a uremia começa a pesar
var LIMIAR_DISPARO = 0.5; // severidade ACIMA da qual o eixo (refratário) dispara

/* ---------- A · ACIDOSE: severidade [0..1] ----------
 * Grave (pH baixo, HCO₃ baixo) E refratária (não respondeu ao tampão/clínica). */
function sevAcidose(pH, hco3, respondeu) {
  pH = clampv(pH, 6.6, 7.6);
  hco3 = clampv(hco3, 2, 30);
  respondeu = clampv(respondeu, 0, 1);              // 0 refratário → 1 respondeu plenamente
  var phComp = clampv((PH_GRAVE - pH) / (PH_GRAVE - 6.8), 0, 1);       // pH 7,15→0 ; 6,8→1
  var hco3Comp = clampv((HCO3_GRAVE - hco3) / (HCO3_GRAVE - 4), 0, 1); // HCO₃ 12→0 ; 4→1
  var grave = clampv(Math.max(phComp, hco3Comp), 0, 1);
  return clampv(grave * (1 - 0.85 * respondeu), 0, 1);
}

/* ---------- E · ELETRÓLITOS (hipercalemia): severidade [0..1] ----------
 * K⁺ alto, peso do ECG (ondas T → QRS alargado → senoidal), e refratariedade. */
function sevEletrolitos(k, ecg, respondeu) {
  k = clampv(k, 2, 9);
  ecg = clampv(ecg, 0, 1);                          // 0 sem alteração → 1 alteração ameaçadora
  respondeu = clampv(respondeu, 0, 1);
  var kComp = clampv((k - K_PERIGO) / (7.5 - K_PERIGO), 0, 1);     // K 6,0→0 ; 7,5→1
  // o ECG agrava: a hipercalemia com ECG é a verdadeira emergência
  var base = clampv(0.6 * kComp + 0.4 * ecg, 0, 1);
  // só conta se o K já está em zona de perigo (sem K alto, não há eletrólito crítico)
  var gate = clampv((k - 5.2) / (K_PERIGO - 5.2), 0, 1);
  return clampv(base * gate * (1 - 0.85 * respondeu), 0, 1);
}

/* ---------- I · INTOXICAÇÃO: severidade [0..1] ----------
 * Só dispara se DIALISÁVEL; sobe com o nível e a gravidade clínica. */
function sevIntoxicacao(dialisavel, nivel, gravidade) {
  dialisavel = clampv(dialisavel, 0, 1);            // 0 não dialisável → 1 muito dialisável
  nivel = clampv(nivel, 0, 1);                      // nível tóxico normalizado 0..1
  gravidade = clampv(gravidade, 0, 1);              // gravidade clínica 0..1
  var carga = clampv(0.55 * nivel + 0.45 * gravidade, 0, 1);
  // a dialisabilidade é um PORTÃO: digoxina (Vd alto) não sai na máquina (M32/M33)
  return clampv(dialisavel * carga, 0, 1);
}

/* ---------- O · OVERLOAD (sobrecarga): severidade [0..1] ----------
 * Volume acima do seco, peso do edema pulmonar, e refratariedade ao diurético. */
function sevSobrecarga(volume, edemaPulmonar, respondeuDiuretico) {
  volume = clampv(volume, 0, 20);                   // L acima do peso seco
  edemaPulmonar = clampv(edemaPulmonar, 0, 1);      // 0 sem → 1 edema pulmonar franco
  respondeuDiuretico = clampv(respondeuDiuretico, 0, 1);
  var volComp = clampv(volume / 8, 0, 1);           // 8 L → 1
  var base = clampv(0.55 * volComp + 0.45 * edemaPulmonar, 0, 1);
  return clampv(base * (1 - 0.85 * respondeuDiuretico), 0, 1);
}

/* ---------- U · UREMIA: severidade [0..1] ----------
 * É a uremia SINTOMÁTICA que indica — não o número da ureia. Pericardite e
 * encefalopatia são os gatilhos; a ureia alta apenas predispõe. */
function sevUremia(ureia, pericardite, encefalopatia) {
  ureia = clampv(ureia, 20, 400);
  pericardite = clampv(pericardite, 0, 1);
  encefalopatia = clampv(encefalopatia, 0, 1);
  var ureiaComp = clampv((ureia - UREIA_ALTA) / (300 - UREIA_ALTA), 0, 1); // 180→0 ; 300→1
  var sintoma = clampv(Math.max(pericardite, encefalopatia), 0, 1);
  // o SINTOMA é o que dispara; a ureia alta sozinha pesa pouco
  return clampv(0.75 * sintoma + 0.13 * ureiaComp * sintoma + 0.12 * ureiaComp, 0, 1);
}

/* função-mãe: o MAPA AEIOU — cinco eixos, identifica os DISPARADOS, o DOMINANTE
 * e a recomendação de conduta. A indicação é o OR dos eixos refratários. */
function aeiou(input) {
  var inp = input || {};
  // A — acidose
  var pH = clampv(inp.pH !== undefined ? inp.pH : 7.38, 6.6, 7.6);
  var hco3 = clampv(inp.hco3 !== undefined ? inp.hco3 : 24, 2, 30);
  var acidoseRespondeu = clampv(inp.acidoseRespondeu !== undefined ? inp.acidoseRespondeu : 1, 0, 1);
  // E — eletrólitos
  var k = clampv(inp.k !== undefined ? inp.k : 4.5, 2, 9);
  var ecg = clampv(inp.ecg !== undefined ? inp.ecg : 0, 0, 1);
  var kRespondeu = clampv(inp.kRespondeu !== undefined ? inp.kRespondeu : 1, 0, 1);
  // I — intoxicação
  var dialisavel = clampv(inp.dialisavel !== undefined ? inp.dialisavel : 0, 0, 1);
  var nivelTox = clampv(inp.nivelTox !== undefined ? inp.nivelTox : 0, 0, 1);
  var gravidadeTox = clampv(inp.gravidadeTox !== undefined ? inp.gravidadeTox : 0, 0, 1);
  // O — overload
  var volume = clampv(inp.volume !== undefined ? inp.volume : 0, 0, 20);
  var edemaPulmonar = clampv(inp.edemaPulmonar !== undefined ? inp.edemaPulmonar : 0, 0, 1);
  var diureticoRespondeu = clampv(inp.diureticoRespondeu !== undefined ? inp.diureticoRespondeu : 1, 0, 1);
  // U — uremia
  var ureia = clampv(inp.ureia !== undefined ? inp.ureia : 60, 20, 400);
  var pericardite = clampv(inp.pericardite !== undefined ? inp.pericardite : 0, 0, 1);
  var encefalopatia = clampv(inp.encefalopatia !== undefined ? inp.encefalopatia : 0, 0, 1);

  // ----- as cinco severidades [0..1] -----
  var sevA = sevAcidose(pH, hco3, acidoseRespondeu);
  var sevE = sevEletrolitos(k, ecg, kRespondeu);
  var sevI = sevIntoxicacao(dialisavel, nivelTox, gravidadeTox);
  var sevO = sevSobrecarga(volume, edemaPulmonar, diureticoRespondeu);
  var sevU = sevUremia(ureia, pericardite, encefalopatia);

  // ----- DISPARO por eixo: refratário acima do limiar (OR, não soma) -----
  var dispA = sevA >= LIMIAR_DISPARO;
  var dispE = sevE >= LIMIAR_DISPARO;
  var dispI = sevI >= LIMIAR_DISPARO;
  var dispO = sevO >= LIMIAR_DISPARO;
  var dispU = sevU >= LIMIAR_DISPARO;

  var eixos = [
    { letra: 'A', nome: 'Acidose', sev: sevA, disp: dispA },
    { letra: 'E', nome: 'Eletrólitos', sev: sevE, disp: dispE },
    { letra: 'I', nome: 'Intoxicação', sev: sevI, disp: dispI },
    { letra: 'O', nome: 'Overload', sev: sevO, disp: dispO },
    { letra: 'U', nome: 'Uremia', sev: sevU, disp: dispU }
  ];

  // contagem de disparados e o eixo DOMINANTE (maior severidade; desempate por ordem AEIOU)
  var nDisparados = (dispA ? 1 : 0) + (dispE ? 1 : 0) + (dispI ? 1 : 0) + (dispO ? 1 : 0) + (dispU ? 1 : 0);
  var algumDisparo = nDisparados >= 1;
  var dominante = eixos[0], i;
  for (i = 1; i < eixos.length; i++) { if (eixos[i].sev > dominante.sev + 1e-12) dominante = eixos[i]; }
  var sevMax = dominante.sev;
  var sevSoma = sevA + sevE + sevI + sevO + sevU;   // só descritivo — NÃO é o que decide

  // "quase lá": o maior eixo está alto mas ainda responde/abaixo do limiar → otimizar a clínica
  var quaseLa = !algumDisparo && sevMax >= 0.30;

  // ----- RECOMENDAÇÃO de conduta -----
  // indicar TRS se QUALQUER eixo refratário disparou; senão otimizar a clínica; senão observar.
  var recomendacao;
  if (algumDisparo) recomendacao = 'indicar';
  else if (quaseLa) recomendacao = 'otimizar';
  else recomendacao = 'observar';

  return {
    // entradas ecoadas
    pH: pH, hco3: hco3, acidoseRespondeu: acidoseRespondeu,
    k: k, ecg: ecg, kRespondeu: kRespondeu,
    dialisavel: dialisavel, nivelTox: nivelTox, gravidadeTox: gravidadeTox,
    volume: volume, edemaPulmonar: edemaPulmonar, diureticoRespondeu: diureticoRespondeu,
    ureia: ureia, pericardite: pericardite, encefalopatia: encefalopatia,
    // severidades
    sevA: sevA, sevE: sevE, sevI: sevI, sevO: sevO, sevU: sevU,
    sevMax: sevMax, sevSoma: sevSoma,
    // disparos
    dispA: dispA, dispE: dispE, dispI: dispI, dispO: dispO, dispU: dispU,
    nDisparados: nDisparados, algumDisparo: algumDisparo, quaseLa: quaseLa,
    // mapa
    eixos: eixos, dominante: { letra: dominante.letra, nome: dominante.nome, sev: dominante.sev, disp: dominante.disp },
    recomendacao: recomendacao,
    limiar: LIMIAR_DISPARO
  };
}

/* geometria PURA do RADAR / pentágono AEIOU — a UI só pinta (canvas ≡ engine).
 * 5 vértices (um por eixo, severidade ao longo do raio), o anel-limiar e o
 * polígono do ponto de operação. Ordem dos vértices: A, E, I, O, U a partir do topo. */
function radarLayout(state, W, H) {
  W = clampv(W, 200, 100000); H = clampv(H, 160, 100000);
  var r = aeiou(state || {});
  var cx = W / 2, cy = H / 2 + 6;
  var R = clampv(Math.min(W, H) * 0.36, 20, 100000);   // raio máximo (sev = 1)
  var sevs = [r.sevA, r.sevE, r.sevI, r.sevO, r.sevU];
  var letras = ['A', 'E', 'I', 'O', 'U'];
  var N = 5, i, ang;
  // ângulos: começa no topo (−90°) e gira no sentido horário
  function pt(idx, frac) {
    ang = -Math.PI / 2 + (2 * Math.PI * idx / N);
    return { x: cx + R * frac * Math.cos(ang), y: cy + R * frac * Math.sin(ang) };
  }
  var spokes = [], ring = [], poly = [], labels = [];
  for (i = 0; i < N; i++) {
    var outer = pt(i, 1);
    spokes.push({ x0: cx, y0: cy, x1: outer.x, y1: outer.y });
    ring.push(pt(i, LIMIAR_DISPARO));                    // anel do limiar de disparo
    poly.push(pt(i, clampv(sevs[i], 0, 1)));             // ponto de operação por eixo
    // rótulo um pouco além do vértice externo
    var lab = pt(i, 1.16);
    labels.push({ x: lab.x, y: lab.y, letra: letras[i], sev: clampv(sevs[i], 0, 1), disp: sevs[i] >= LIMIAR_DISPARO });
  }
  return {
    W: W, H: H, cx: cx, cy: cy, R: R, N: N, limiar: LIMIAR_DISPARO,
    spokes: spokes, ring: ring, poly: poly, labels: labels,
    recomendacao: r.recomendacao, dominante: r.dominante.letra, nDisparados: r.nDisparados
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    clampv: clampv,
    sevAcidose: sevAcidose, sevEletrolitos: sevEletrolitos, sevIntoxicacao: sevIntoxicacao,
    sevSobrecarga: sevSobrecarga, sevUremia: sevUremia,
    aeiou: aeiou, radarLayout: radarLayout,
    PH_GRAVE: PH_GRAVE, HCO3_GRAVE: HCO3_GRAVE, K_PERIGO: K_PERIGO, UREIA_ALTA: UREIA_ALTA, LIMIAR_DISPARO: LIMIAR_DISPARO
  };
}
