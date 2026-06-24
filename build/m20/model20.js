/* =========================================================================
 * FILTRA · M20 — O circuito extracorpóreo: acesso, bomba, dialisador, fluxos, TMP
 * ENGINE PURO. Espelhado inline no filtra20.html. (abre a metade DIALISA)
 *
 * Teses:
 *  - a diálise é um CIRCUITO DE PRESSÕES, não uma caixa-preta: o sangue sai por um
 *    acesso, a bomba o empurra (Qb), atravessa o dialisador contra o dialisato (Qd, em
 *    CONTRACORRENTE) e volta; cada pressão (arterial pré-bomba NEGATIVA, venosa de retorno
 *    POSITIVA, transmembrana TMP) relata a física de um segmento.
 *  - o ACESSO limita tudo: Qb_efetivo = min(Qb_pedido, o que o acesso entrega). Pedir Qb que
 *    o acesso não dá só torna a P_art mais negativa (sucção), sem subir o Qb_efetivo.
 *  - o clearance de pequenos solutos é BLOOD-FLOW-LIMITED: K satura com Qb (equação de
 *    Michaels do dialisador). Aumentar Qb além de certo ponto rende pouco.
 *  - remoção de VOLUME ← ultrafiltração: Q_uf = K_uf · TMP (a UF é prescrição de PRESSÃO).
 *  - agulhas próximas → RECIRCULAÇÃO → o clearance EFETIVO no corpo despenca (sangue já
 *    limpo volta à agulha arterial), mesmo com Qb/Qd "perfeitos" no display.
 * ========================================================================= */

function clampv(v, a, b) { var n = Number(v); if (!isFinite(n)) n = a; if (n < a) n = a; if (n > b) n = b; return n; }

// merge resiliente: defaults + entrada, sem mutar a entrada
function mergeDefaults(input, defs) {
  var o = {}, k;
  for (k in defs) { if (Object.prototype.hasOwnProperty.call(defs, k)) o[k] = defs[k]; }
  if (input) { for (k in input) { if (Object.prototype.hasOwnProperty.call(input, k) && input[k] !== undefined) o[k] = input[k]; } }
  return o;
}

var KOA_STD = 600;      // coeficiente de transferência de massa-área da membrana (mL/min) — ureia, high-flux ~600
var KUF_STD = 30;       // coeficiente de ultrafiltração (mL/h/mmHg) — high-flux
var P_DIAL = -40;       // pressão do compartimento do dialisato (mmHg), em geral subatmosférica

var DEFAULTS = {
  Qb: 300,            // mL/min — fluxo de sangue PEDIDO na bomba
  Qd: 500,            // mL/min — fluxo de dialisato (contracorrente)
  KoA: KOA_STD,       // mL/min — "potência" da membrana p/ ureia
  Kuf: KUF_STD,       // mL/h/mmHg — coeficiente de ultrafiltração
  Quf: 800,           // mL/h — taxa de UF PRESCRITA (volume a remover por hora)
  acesso: 1,          // capacidade do acesso (relativa): 1 = fístula madura; <1 = cateter/estenose
  distAgulhas: 1,     // proxy de distância das agulhas: 1 = bem separadas; →0 = juntas (recirculação)
  obstrucao: 0        // fração de obstrução do RETORNO venoso: 0 = linha livre; 1 = ocluída (dobra/coágulo/agulha mal posta)
};

// teto de Qb que o acesso ENTREGA (mL/min). Fístula madura entrega bem; cateter mal posicionado, pouco.
function qbDoAcesso(acesso) {
  acesso = clampv(acesso, 0.05, 1.5);
  return clampv(60 + acesso * 360, 60, 600);   // acesso 1 → ~420; acesso 0.5 → ~240; acesso 0.2 → ~132
}

// pressão arterial pré-bomba (mmHg, NEGATIVA): quanto mais a bomba puxa além do que o acesso entrega,
// mais negativa (sucção). Satura/alarma se o acesso é pobre.
function pArterial(Qb, acesso) {
  Qb = clampv(Qb, 0, 600);
  var teto = qbDoAcesso(acesso);
  var base = -0.4 * Qb;                          // perda de carga normal proporcional ao fluxo pedido
  var sobra = Math.max(0, Qb - teto);            // o quanto a bomba puxa ALÉM da entrega → sucção
  var succao = -0.9 * sobra;                     // sucção extra (parede do vaso)
  return clampv(base + succao, -350, 0);
}

// pressão venosa de retorno (mmHg, POSITIVA): resistência ao retorno (agulha, dobra, coágulo, posição).
// R_venoso entra via a folga do acesso (acesso pobre → retorno também sofre) + o fluxo de retorno + a
// OBSTRUÇÃO mecânica da linha venosa (dobra/coágulo/agulha mal posta). A obstrução é o termo que faz a
// P_ven subir e ALARMAR mesmo com Qb baixo — ela é a causa do "retorno obstruído" que o caso ensina.
function pVenosa(Qb, Qd, Kuf, Quf, acesso, obstrucao) {
  var Qbe = qbEfetivo(Qb, acesso);
  var Rrel = clampv(2 - clampv(acesso, 0.05, 1.5), 0.5, 1.95); // acesso pior → maior resistência relativa
  var obs = clampv(obstrucao, 0, 1);                           // 0 = linha livre; 1 = ocluída
  var Pobs = 320 * obs;                                        // resistência mecânica somada (independe de Qb)
  return clampv(20 + 0.30 * Qbe * Rrel + Pobs, 0, 350);
}

// Qb EFETIVO (mL/min): o que realmente passa = min(pedido, entrega do acesso).
function qbEfetivo(Qb, acesso) {
  Qb = clampv(Qb, 0, 600);
  return clampv(Math.min(Qb, qbDoAcesso(acesso)), 0, 600);
}

// TMP (mmHg) = pressão necessária p/ a UF prescrita: Q_uf = K_uf · TMP → TMP = Q_uf / K_uf.
function tmpNecessaria(Quf, Kuf) {
  Quf = clampv(Quf, 0, 6000); Kuf = clampv(Kuf, 0.5, 300);
  return clampv(Quf / Kuf, 0, 600);
}

// UF efetiva (mL/h) a partir da TMP e do Kuf: Q_uf = K_uf · TMP (a identidade-mãe da remoção de volume).
function ufDeTMP(tmp, Kuf) {
  tmp = clampv(tmp, 0, 600); Kuf = clampv(Kuf, 0.5, 300);
  return clampv(Kuf * tmp, 0, 6000);
}

// clearance do dialisador (mL/min) — equação de Michaels, blood-flow-limited e SATURANTE em Qb.
//   K = Qb · (e^z − 1) / (e^z − Qb/Qd),  z = KoA·(1 − Qb/Qd)/Qb
// usa o Qb EFETIVO (o que o acesso entrega). Para Qb≈Qd há a forma-limite K = Qb·KoA/(Qb+KoA).
function clearanceDialisador(Qbe, Qd, KoA) {
  Qbe = clampv(Qbe, 1, 600); Qd = clampv(Qd, 1, 1200); KoA = clampv(KoA, 1, 3000);
  var ratio = Qbe / Qd, K;
  if (Math.abs(1 - ratio) < 1e-4) {
    K = Qbe * KoA / (Qbe + KoA);               // forma-limite (Qb ≈ Qd) — sem singularidade
  } else {
    var z = KoA * (1 - ratio) / Qbe;
    z = clampv(z, -50, 50);
    var ez = Math.exp(z);
    var denom = ez - ratio;
    if (Math.abs(denom) < 1e-9) { K = Qbe * KoA / (Qbe + KoA); }
    else { K = Qbe * (ez - 1) / denom; }
  }
  if (!isFinite(K) || K < 0) K = 0;
  return clampv(K, 0, Math.min(Qbe, Qd));        // clearance nunca passa o menor fluxo
}

// recirculação (%): agulhas próximas devolvem sangue já dialisado à entrada arterial.
function recirculacaoPct(distAgulhas) {
  var d = clampv(distAgulhas, 0, 1);
  return clampv(40 * (1 - d), 0, 40);            // d=1 (separadas) → 0%; d=0 (juntas) → 40%
}

// função-mãe: estado completo do circuito extracorpóreo
function circuito(input) {
  var s = mergeDefaults(input, DEFAULTS);
  var Qb = clampv(s.Qb, 0, 600);
  var Qd = clampv(s.Qd, 0, 1200);
  var KoA = clampv(s.KoA, 1, 3000);
  var Kuf = clampv(s.Kuf, 0.5, 300);
  var Quf = clampv(s.Quf, 0, 6000);
  var acesso = clampv(s.acesso, 0.05, 1.5);
  var distAgulhas = clampv(s.distAgulhas, 0, 1);
  var obstrucao = clampv(s.obstrucao, 0, 1);

  var qbTeto = qbDoAcesso(acesso);
  var Qbe = qbEfetivo(Qb, acesso);
  var Part = pArterial(Qb, acesso);
  var Pven = pVenosa(Qb, Qd, Kuf, Quf, acesso, obstrucao);
  var TMP = tmpNecessaria(Quf, Kuf);
  var ufEfetiva = ufDeTMP(TMP, Kuf);                  // == Quf por construção (identidade UF = Kuf·TMP)
  var Kdial = clearanceDialisador(Qbe, clampv(Qd, 1, 1200), KoA);
  var recirc = recirculacaoPct(distAgulhas);
  var Kefetivo = clampv(Kdial * (1 - recirc / 100), 0, 600); // clearance que o corpo vê (descontada recirculação)

  // flags de mecanismo
  var succaoArterial = Part < -250 || Qb > qbTeto + 5;       // a bomba puxa além do que o acesso entrega
  var acessoLimita = Qb > qbTeto + 5;                        // Qb_efetivo travado pelo acesso
  var retornoObstruido = Pven > 200;                         // resistência alta ao retorno
  var tmpExcessiva = TMP > 350;                              // perto do teto da membrana
  var recircRoubaDose = recirc > 10;                         // recirculação significativa

  return {
    Qb: Qb, Qd: Qd, KoA: KoA, Kuf: Kuf, Quf: Quf, acesso: acesso, distAgulhas: distAgulhas, obstrucao: obstrucao,
    qbTeto: qbTeto, Qbe: Qbe, Part: Part, Pven: Pven, TMP: TMP, ufEfetiva: ufEfetiva,
    Kdial: Kdial, recirc: recirc, Kefetivo: Kefetivo,
    succaoArterial: succaoArterial, acessoLimita: acessoLimita, retornoObstruido: retornoObstruido,
    tmpExcessiva: tmpExcessiva, recircRoubaDose: recircRoubaDose
  };
}

// geometria PURA da curva clearance × Qb (saturante) — a UI só pinta
function clearanceCurveLayout(state, W, H) {
  state = state || {};
  W = clampv(W, 200, 100000); H = clampv(H, 120, 100000);
  var padL = 54, padR = 16, padT = 18, padB = 38, baseY = H - padB;
  var qbMin = 50, qbMax = 500, N = 58;
  var Qd = clampv(state.Qd !== undefined ? state.Qd : DEFAULTS.Qd, 1, 1200);
  var KoA = clampv(state.KoA !== undefined ? state.KoA : DEFAULTS.KoA, 1, 3000);
  var acesso = clampv(state.acesso !== undefined ? state.acesso : DEFAULTS.acesso, 0.05, 1.5);
  var distAgulhas = clampv(state.distAgulhas !== undefined ? state.distAgulhas : DEFAULTS.distAgulhas, 0, 1);
  var recirc = recirculacaoPct(distAgulhas);
  var yMax = 400;                          // mL/min no eixo (clearance)
  var pxX = (W - padL - padR) / (qbMax - qbMin), pxY = (baseY - padT) / yMax;
  var pts = [], i, qb, k;
  for (i = 0; i <= N; i++) {
    qb = qbMin + (qbMax - qbMin) * i / N;
    var qbe = qbEfetivo(qb, acesso);
    k = clearanceDialisador(qbe, Qd, KoA) * (1 - recirc / 100);
    pts.push({ qb: qb, k: k, x: padL + (qb - qbMin) * pxX, y: baseY - clampv(k, 0, yMax) * pxY });
  }
  var qc = clampv(state.Qb !== undefined ? state.Qb : DEFAULTS.Qb, qbMin, qbMax);
  var qce = qbEfetivo(qc, acesso);
  var kc = clearanceDialisador(qce, Qd, KoA) * (1 - recirc / 100);
  return {
    W: W, H: H, padL: padL, padR: padR, padT: padT, padB: padB, baseY: baseY,
    qbMin: qbMin, qbMax: qbMax, yMax: yMax, pxX: pxX, pxY: pxY,
    axis: { x0: padL, y0: padT, xEnd: W - padR, yEnd: baseY },
    pts: pts, current: { x: padL + (qc - qbMin) * pxX, y: baseY - clampv(kc, 0, yMax) * pxY, qb: qc, k: kc }
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    clampv: clampv, mergeDefaults: mergeDefaults,
    qbDoAcesso: qbDoAcesso, qbEfetivo: qbEfetivo, pArterial: pArterial, pVenosa: pVenosa,
    tmpNecessaria: tmpNecessaria, ufDeTMP: ufDeTMP, clearanceDialisador: clearanceDialisador,
    recirculacaoPct: recirculacaoPct, circuito: circuito, clearanceCurveLayout: clearanceCurveLayout,
    KOA_STD: KOA_STD, KUF_STD: KUF_STD, P_DIAL: P_DIAL, DEFAULTS: DEFAULTS
  };
}
