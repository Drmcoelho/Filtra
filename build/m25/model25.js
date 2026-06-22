/* =========================================================================
 * FILTRA · M25 — DOSE e ADEQUAÇÃO da hemodiálise intermitente (HDI):
 * Kt/V, URR, clearance; a PRESCRIÇÃO de dose (tempo · Qb · Qd · dialisador).
 * ENGINE PURO. Espelhado inline no filtra25.html.
 *
 * A TESE: a dose de HDI é MEDIDA, não adivinhada. Dois números a quantificam:
 *
 *  Kt/V (adimensional) = clearance K · tempo t / volume de distribuição V da ureia.
 *    É a "dose" fracionada: quantas vezes o volume corporal de ureia foi "limpo".
 *    Daugirdas 2ª geração (single-pool), a partir da razão R = ureia_pós/ureia_pré:
 *      spKt/V = −ln(R − 0,008·t) + (4 − 3,5·R)·UF/peso
 *    (t em h; UF em L removidos; peso em kg — o termo da UF corrige a convecção).
 *
 *  URR (%) = (1 − R)·100 — a taxa de redução da ureia, leitura direta e crua.
 *
 *  A PRESCRIÇÃO é o que se MOVE para atingir o alvo (Kt/V ≥ 1,2/sessão, URR ≥ 65%,
 *  3×/sem): ↑tempo, ↑Qb (fluxo de sangue), ↑Qd/dialisador (KoA) — cada alavanca
 *  sobe K ou t, e Kt/V sobe. Mas o clearance SATURA: dobrar Qb NÃO dobra Kt/V
 *  (limite do KoA da membrana). E V = peso × fração da ÁGT (≈0,55): um paciente
 *  grande tem V grande → o MESMO K·t rende um Kt/V MENOR.
 *
 * R deriva da cinética: R = e^(−K·t/V) (single-pool, sem geração), mais a
 * contribuição da UF (concentra a ureia residual → R um pouco maior).
 *
 * PÉROLA: URR e Kt/V andam juntos (são a mesma coisa por ângulos distintos);
 * dobrar Qb não dobra Kt/V (saturação do clearance pelo KoA); a 1ª sessão muito
 * urêmica NÃO busca Kt/V alto (desequilíbrio — ponte M34/M26/M38).
 * ========================================================================= */

function clampv(v, a, b) { var n = Number(v); if (!isFinite(n)) n = a; if (n < a) n = a; if (n > b) n = b; return n; }

/* alvos de referência (espelham as diretrizes de adequação) */
var KTV_ALVO = 1.2;    // Kt/V single-pool alvo por sessão (3×/sem)
var URR_ALVO = 65;     // URR (%) alvo por sessão
var KOA_MAX = 1200;    // KoA típico de dialisador high-flux (mL/min) — teto da saturação do clearance

/* URR (%) a partir da razão R = ureia_pós/ureia_pré */
function urr(R) { R = clampv(R, 0.02, 1); return clampv((1 - R) * 100, 0, 98); }

/* Kt/V single-pool de Daugirdas (2ª geração) a partir de R, tempo (h), UF (L) e peso (kg).
 * spKt/V = −ln(R − 0,008·t) + (4 − 3,5·R)·UF/peso. Robusto: o argumento do ln é piso-limitado. */
function ktv(o) {
  o = o || {};
  var R = clampv(o.R, 0.02, 1);
  var t = clampv(o.t, 0.1, 12);            // h
  var uf = clampv(o.uf, 0, 8);             // L removidos
  var peso = clampv(o.peso, 25, 200);      // kg
  var arg = R - 0.008 * t;                 // pode ficar ≤0 em R muito baixo
  arg = clampv(arg, 0.001, 1);             // piso para o ln
  var sp = -Math.log(arg) + (4 - 3.5 * R) * (uf / peso);
  return clampv(sp, 0, 3.5);
}

/* clearance efetivo K (mL/min) a partir das alavancas da prescrição:
 * Qb (fluxo de sangue), Qd (fluxo do banho) e o KoA do dialisador.
 * Modelo de saturação: K sobe com Qb mas SATURA no KoA (dobrar Qb não dobra K).
 * K = KoA_ef · Qb / (KoA_ef + Qb), com KoA_ef modulado por Qd (banho mais rápido → mais gradiente). */
function clearanceK(o) {
  o = o || {};
  var qb = clampv(o.qb, 100, 500);         // mL/min
  var qd = clampv(o.qd, 300, 900);         // mL/min
  var koa = clampv(o.koa, 300, KOA_MAX);   // mL/min (capacidade da membrana)
  // o banho (Qd) eleva o KoA EFETIVO até um teto (gradiente de concentração); satura ~Qd 800
  var qdFator = 0.6 + 0.4 * clampv((qd - 300) / 500, 0, 1);   // 0.6 → 1.0
  var koaEf = koa * qdFator;
  // saturação de Qb: clearance limitado pela membrana
  var K = (koaEf * qb) / (koaEf + qb);     // mL/min — sempre < min(koaEf,qb-assintota)
  return clampv(K, 5, 500);
}

/* volume de distribuição da ureia V (L) = peso · fração da ÁGT (Watson simplificado por sexo) */
function volumeUreia(peso, sexo) {
  peso = clampv(peso, 25, 200);
  var frac = (sexo === 'F') ? 0.50 : 0.58;   // mulher ~0,50 ; homem ~0,58 da massa
  return clampv(peso * frac, 12, 120);       // L
}

/* razão R = ureia_pós/ureia_pré pela cinética single-pool: R = e^(−K·t/V), corrigida pela UF.
 * K em mL/min, t em h, V em L. K·t/V em litros: (K·60·t)/(V·1000). A UF concentra a ureia residual. */
function ureiaPos(o) {
  o = o || {};
  var K = clampv(o.k, 5, 500);             // mL/min
  var t = clampv(o.t, 0.1, 12);            // h
  var V = clampv(o.V, 12, 120);            // L
  var uf = clampv(o.uf, 0, 8);             // L
  var ktvBruto = (K * 60 * t) / (V * 1000);          // adimensional (K·t/V em litros)
  var Rdif = Math.exp(-ktvBruto);                    // difusão pura
  // a UF retira volume → concentra a ureia residual (sobe R levemente); fração ~ uf/V
  var concentra = 1 + clampv(uf / Math.max(V, 1), 0, 0.25) * 0.6;
  var R = clampv(Rdif * concentra, 0.02, 1);
  return R;
}

/* função-mãe: a DOSE da sessão de HDI.
 * input: peso, sexo, ureiaPre, tempo(t,h), uf(L) + prescrição (qb, qd, koa) OU K direto.
 * computa V, K, R, spKt/V, URR; classifica adequado × subdose; sugere a ALAVANCA a mover. */
function dose(input) {
  var inp = input || {};
  var peso = clampv(inp.peso !== undefined ? inp.peso : 70, 25, 200);     // kg
  var sexo = (inp.sexo === 'F') ? 'F' : 'M';
  var ureiaPre = clampv(inp.ureiaPre !== undefined ? inp.ureiaPre : 150, 20, 400);  // mg/dL
  var t = clampv(inp.t !== undefined ? inp.t : 4, 0.5, 8);                // h
  var uf = clampv(inp.uf !== undefined ? inp.uf : 2, 0, 8);               // L removidos
  var qb = clampv(inp.qb !== undefined ? inp.qb : 300, 100, 500);         // mL/min
  var qd = clampv(inp.qd !== undefined ? inp.qd : 500, 300, 900);         // mL/min
  var koa = clampv(inp.koa !== undefined ? inp.koa : 800, 300, KOA_MAX);  // mL/min
  var primeiraUremica = !!inp.primeiraUremica;                            // 1ª sessão muito urêmica

  // V — volume de distribuição da ureia
  var V = volumeUreia(peso, sexo);                                        // L

  // K — clearance efetivo: direto OU das alavancas
  var K;
  if (inp.k !== undefined && isFinite(Number(inp.k))) K = clampv(inp.k, 5, 500);
  else K = clearanceK({ qb: qb, qd: qd, koa: koa });                      // mL/min

  // R — razão de ureia pela cinética, depois ureia pós medida
  var R = ureiaPos({ k: K, t: t, V: V, uf: uf });
  var ureiaPosCalc = clampv(ureiaPre * R, 4, 400);                        // mg/dL

  // os dois índices de dose
  var URR = urr(R);
  var spKtV = ktv({ R: R, t: t, uf: uf, peso: peso });

  // adequação: alvo Kt/V ≥ 1,2 E URR ≥ 65%
  var ktvAdequado = spKtV >= KTV_ALVO - 1e-9;
  var urrAdequado = URR >= URR_ALVO - 1e-9;
  var adequado = ktvAdequado && urrAdequado;

  // 1ª sessão muito urêmica: NÃO busca Kt/V alto (evita desequilíbrio, M34/M26) — alvo rebaixado
  var alvoEfetivo = primeiraUremica ? 0.9 : KTV_ALVO;
  var gentilOk = primeiraUremica && spKtV <= 1.1;     // gentil bem prescrita

  // quanto falta de Kt/V para o alvo
  var deficitKtV = clampv(alvoEfetivo - spKtV, 0, 3.5);

  // ALAVANCA sugerida para subir o Kt/V até o alvo (quando subdose):
  // se o clearance já está perto da saturação (K perto do KoA efetivo), ↑Qb rende pouco → ↑tempo.
  var koaEfAprox = koa * (0.6 + 0.4 * clampv((qd - 300) / 500, 0, 1));
  var fracSaturacao = clampv(K / koaEfAprox, 0, 1);     // quão saturado está o clearance
  var alavanca;
  if (adequado || primeiraUremica) alavanca = 'manter';
  else if (fracSaturacao >= 0.7) alavanca = 'tempo';    // clearance saturado → ↑tempo
  else if (qb < 400) alavanca = 'qb';                   // há folga em Qb → ↑Qb
  else if (koa < KOA_MAX - 1 || qd < 800) alavanca = 'dialisador';  // ↑Qd / high-flux
  else alavanca = 'tempo';                              // tudo no teto → só ↑tempo resta

  // ganho ESTIMADO de Kt/V por mover a alavanca (didático): tempo +1 h, Qb +50, ou high-flux
  var tNovo = clampv(t + 1, 0.5, 8);
  var qbNovo = clampv(qb + 50, 100, 500);
  var Kqb = clearanceK({ qb: qbNovo, qd: qd, koa: koa });
  var Khf = clearanceK({ qb: qb, qd: clampv(qd + 100, 300, 900), koa: KOA_MAX });
  var ktvSeTempo = ktv({ R: ureiaPos({ k: K, t: tNovo, V: V, uf: uf }), t: tNovo, uf: uf, peso: peso });
  var ktvSeQb = ktv({ R: ureiaPos({ k: Kqb, t: t, V: V, uf: uf }), t: t, uf: uf, peso: peso });
  var ktvSeHF = ktv({ R: ureiaPos({ k: Khf, t: t, V: V, uf: uf }), t: t, uf: uf, peso: peso });

  // dose semanal (stdKt/V didático simplificado para 3×/sem)
  var ktvSemanal = clampv(spKtV * 3, 0, 10);

  return {
    // entradas ecoadas
    peso: peso, sexo: sexo, ureiaPre: ureiaPre, t: t, uf: uf, qb: qb, qd: qd, koa: koa,
    primeiraUremica: primeiraUremica,
    // derivados de cinética
    V: V, K: K, R: R, ureiaPos: ureiaPosCalc, fracSaturacao: fracSaturacao,
    // os índices de dose
    URR: URR, spKtV: spKtV, ktvSemanal: ktvSemanal,
    // adequação
    ktvAdequado: ktvAdequado, urrAdequado: urrAdequado, adequado: adequado,
    alvoEfetivo: alvoEfetivo, gentilOk: gentilOk, deficitKtV: deficitKtV,
    // prescrição: a alavanca e os ganhos estimados
    alavanca: alavanca, ktvSeTempo: ktvSeTempo, ktvSeQb: ktvSeQb, ktvSeHF: ktvSeHF
  };
}

/* geometria PURA da curva Kt/V × tempo (sobe e satura) — a UI só pinta.
 * Eixo X = tempo da sessão (0 → tMax h). Eixo Y = spKt/V (0 → yMax).
 * Mantém K, V, UF, peso do estado; varre t. Desenha a linha do ALVO (1,2) e o ponto atual. */
function ktvLayout(state, W, H) {
  state = state || {};
  W = clampv(W, 200, 100000); H = clampv(H, 120, 100000);
  var padL = 52, padR = 16, padT = 18, padB = 38, baseY = H - padB;
  var N = 60, tMax = 6, yMax = 2.0;
  var pxX = (W - padL - padR) / N, pxY = (baseY - padT) / yMax;
  // estado base coerente: deriva K, V do estado atual via dose()
  var d0 = dose(state);
  var K = d0.K, V = d0.V, uf = d0.uf, peso = d0.peso;
  var pts = [], i, tt, R, y;
  for (i = 0; i <= N; i++) {
    tt = (i / N) * tMax;                                  // h
    R = ureiaPos({ k: K, t: tt, V: V, uf: uf });
    y = ktv({ R: R, t: tt, uf: uf, peso: peso });
    pts.push({ t: tt, ktv: y, x: padL + i * pxX, y: baseY - clampv(y, 0, yMax) * pxY });
  }
  // linha do alvo (Kt/V 1,2)
  var yAlvo = baseY - clampv(KTV_ALVO, 0, yMax) * pxY;
  // ponto de operação atual (t do estado)
  var tCur = clampv(d0.t, 0, tMax);
  var cx = padL + (tCur / tMax) * N * pxX;
  var cy = baseY - clampv(d0.spKtV, 0, yMax) * pxY;
  return {
    W: W, H: H, padL: padL, padR: padR, padT: padT, padB: padB, baseY: baseY, N: N, pxX: pxX, pxY: pxY,
    tMax: tMax, yMax: yMax,
    axis: { x0: padL, y0: padT, xEnd: W - padR, yEnd: baseY },
    pts: pts, yAlvo: yAlvo, ktvAlvo: KTV_ALVO,
    current: { x: cx, y: cy, t: tCur, ktv: d0.spKtV, adequado: d0.adequado }
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    clampv: clampv, urr: urr, ktv: ktv, clearanceK: clearanceK, volumeUreia: volumeUreia,
    ureiaPos: ureiaPos, dose: dose, ktvLayout: ktvLayout,
    KTV_ALVO: KTV_ALVO, URR_ALVO: URR_ALVO, KOA_MAX: KOA_MAX
  };
}
