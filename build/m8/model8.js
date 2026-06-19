/* =========================================================================
 * FILTRA · M8 — Ducto coletor: célula principal (ENaC/aldosterona) × intercalar
 * (H⁺/HCO₃), ADH/aquaporinas — e os POUPADORES DE K e VAPTANOS (§8).
 * ENGINE PURO. Espelhado inline no filtra8.html.
 *
 * Teses:
 *  - DUAS alavancas independentes: aldosterona (Na⁺ entra ↔ K⁺/H⁺ saem) e ADH (água).
 *  - a aldosterona abre o ENaC → reabsorve Na e SECRETA K/H; bloqueá-la (ou o ENaC)
 *    poupa K (risco de hipercalemia).
 *  - o ADH (V2) insere aquaporina-2 → reabsorve água usando o gradiente medular (M6).
 *  - vaptano bloqueia o V2 → AQUARESE (perde água livre) → sobe o Na (corrige SIADH).
 * ========================================================================= */

function clampv(v, a, b) { var n = Number(v); if (!isFinite(n)) n = a; if (n < a) n = a; if (n > b) n = b; return n; }

var FARMACOS = {
  nenhum: { nome: '— nenhum —', unidade: '', faixa: [0, 0], ec50: 1, alvo: '', classe: '', via: '' },
  espironolactona: { nome: 'Espironolactona', unidade: 'mg/dia', faixa: [25, 100], ec50: 25, alvo: 'receptor de aldosterona (antagonista)', classe: 'poupador de K (ARM)', via: 'mra' },
  eplerenona: { nome: 'Eplerenona', unidade: 'mg/dia', faixa: [25, 50], ec50: 25, alvo: 'receptor de aldosterona (seletivo)', classe: 'poupador de K (ARM seletivo)', via: 'mra' },
  amilorida: { nome: 'Amilorida', unidade: 'mg/dia', faixa: [5, 10], ec50: 5, alvo: 'ENaC (bloqueio direto do canal)', classe: 'poupador de K (bloqueador do ENaC)', via: 'enac' },
  tolvaptan: { nome: 'Tolvaptan', unidade: 'mg/dia', faixa: [15, 60], ec50: 15, alvo: 'receptor V2 da vasopressina (antagonista)', classe: 'vaptano (aquarese)', via: 'v2' }
};

function emaxModel(dose, ec50, emax) {
  dose = clampv(dose, 0, 1e6); ec50 = clampv(ec50, 1e-6, 1e6); emax = clampv(emax, 0, 1);
  return clampv(emax * dose / (ec50 + dose), 0, 1);
}

// potássio plasmático em função da atividade do ENaC (relação inversa)
function kFromEnac(enac) { return clampv(6.0 - clampv(enac, 0, 2) * 2.2, 2.8, 7.0); }

function collect(input) {
  var inp = input || {};
  var aldo = clampv(inp.aldo !== undefined ? inp.aldo : 1, 0, 2);     // aldosterona relativa (1 = normal)
  var adh = clampv(inp.adh !== undefined ? inp.adh : 1, 0, 2);        // ADH relativo (1 = normal)
  var droga = String(inp.droga == null ? 'nenhum' : inp.droga).toLowerCase();
  if (!FARMACOS.hasOwnProperty(droga)) droga = 'nenhum';
  var meta = FARMACOS[droga];
  var dose = clampv(inp.dose !== undefined ? inp.dose : (meta.faixa[0] || 0), 0, 5000);
  var efeito = droga === 'nenhum' ? 0 : emaxModel(dose, meta.ec50, 0.9);

  // vias de bloqueio
  var mraBlock = meta.via === 'mra' ? efeito : 0;       // antagonista do receptor de aldosterona
  var amilBlock = meta.via === 'enac' ? efeito : 0;     // bloqueio direto do ENaC
  var vaptanBlock = meta.via === 'v2' ? efeito : 0;     // antagonista V2

  // ENaC (célula principal): aldosterona efetiva × bloqueio direto
  var aldoEfetiva = aldo * (1 - mraBlock);
  var enac = clampv(aldoEfetiva * (1 - amilBlock), 0, 2);

  // potássio: ENaC alto (aldo) → secreta K → hipoK; ENaC baixo (poupador) → hiperK
  var plasmaK = kFromEnac(enac);
  var hiperK = plasmaK > 5.3;
  var hipoK = plasmaK < 3.5;

  // sódio: bloquear o ENaC dá natriurese leve
  var FENa = clampv(1.0 + Math.max(0, 1 - enac) * 2, 0.5, 6);

  // ácido-base: a aldosterona/ENaC também favorece a secreção de H⁺ (célula intercalar α)
  var secrecaoH = clampv(enac, 0, 2);                  // alta aldo → mais H⁺ excretado → alcalose; baixa → acidose
  var tendenciaAlcalose = secrecaoH > 1.2;
  var tendenciaAcidose = secrecaoH < 0.7;

  // água (ADH/aquaporina): vaptano bloqueia o V2 → aquarese
  var adhEfetivo = clampv(adh * (1 - vaptanBlock), 0, 2);
  var urineOsm = clampv(100 + adhEfetivo * 550, 50, 1200);
  var plasmaNa = clampv(140 - (adhEfetivo - 1) * 8, 120, 155); // SIADH (ADH↑) baixa o Na; vaptano sobe
  var aquarese = vaptanBlock > 0.2;

  var classe;
  if (droga === 'tolvaptan' && aquarese) classe = 'aquarese';
  else if (meta.via === 'mra' || meta.via === 'enac') classe = (mraBlock > 0.1 || amilBlock > 0.1) ? 'poupador_k' : 'normal';
  else if (adh > 1.4) classe = 'siadh';
  else if (aldo > 1.4) classe = 'hiperaldo';
  else classe = 'normal';

  return {
    aldo: aldo, adh: adh, droga: droga, dose: dose, unidade: meta.unidade, alvo: meta.alvo, faixa: meta.faixa,
    nomeFarmaco: meta.nome, classeFarmaco: meta.classe, via: meta.via, efeito: efeito,
    aldoEfetiva: aldoEfetiva, enac: enac, plasmaK: plasmaK, hiperK: hiperK, hipoK: hipoK, FENa: FENa,
    secrecaoH: secrecaoH, tendenciaAlcalose: tendenciaAlcalose, tendenciaAcidose: tendenciaAcidose,
    adhEfetivo: adhEfetivo, urineOsm: urineOsm, plasmaNa: plasmaNa, aquarese: aquarese, classe: classe
  };
}

// geometria PURA da curva K⁺ × atividade do ENaC (a UI só pinta)
function collectLayout(state, W, H) {
  state = state || {};
  W = clampv(W, 200, 100000); H = clampv(H, 120, 100000);
  var padL = 52, padR = 16, padT = 18, padB = 38, baseY = H - padB;
  var eMin = 0, eMax = 2, N = 56;
  var pxX = (W - padL - padR) / (eMax - eMin);
  var yMin = 2.5, yMax = 7;
  var pxY = (baseY - padT) / (yMax - yMin);
  var pts = [], i, e, k;
  for (i = 0; i <= N; i++) {
    e = eMin + (eMax - eMin) * i / N;
    k = kFromEnac(e);
    pts.push({ enac: e, K: k, x: padL + (e - eMin) * pxX, y: baseY - (clampv(k, yMin, yMax) - yMin) * pxY });
  }
  var cur = collect(state);
  var ec = clampv(cur.enac, eMin, eMax);
  return {
    W: W, H: H, padL: padL, padR: padR, padT: padT, padB: padB, baseY: baseY, eMin: eMin, eMax: eMax, yMin: yMin, yMax: yMax, pxX: pxX, pxY: pxY,
    axis: { x0: padL, y0: padT, xEnd: W - padR, yEnd: baseY },
    pts: pts, current: { x: padL + (ec - eMin) * pxX, y: baseY - (clampv(cur.plasmaK, yMin, yMax) - yMin) * pxY, enac: ec, K: cur.plasmaK }
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { clampv: clampv, emaxModel: emaxModel, kFromEnac: kFromEnac, collect: collect, collectLayout: collectLayout, FARMACOS: FARMACOS };
}
