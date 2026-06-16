'use strict';
/*
 * FILTRA · M0 — Compartimentos do líquido corporal (diagrama de Darrow–Yannet)
 * ---------------------------------------------------------------------------
 * Engine PURO, determinístico. Roda em Node e inline no HTML (espelho fiel).
 * Regra-zero: o motor manda no pixel. Nenhuma entrada propaga NaN.
 *
 * Modelo: a água cruza livremente a membrana; no equilíbrio a TONICIDADE
 * (osmoles EFETIVOS / volume) é igual nos dois lados. Os osmoles efetivos
 * de cada compartimento são conservados (Na fica no ECF, cátions no ICF),
 * salvo o que a manobra adiciona/remove. A ureia é osmol INEFETIVO: distribui
 * por toda a água, soma à osmolalidade MEDIDA, mas não move água (pérola).
 */

// clamp resiliente: Number() força conversão; NaN/null/∞/string → piso.
function clampv(v, a, b) {
  var n = Number(v);
  if (!isFinite(n)) n = a;
  if (n < a) n = a;
  if (n > b) n = b;
  return n;
}

// fração de TBW por sexo (educacional, simplificado). Aceita número direto.
function fracSexo(sexo) {
  if (typeof sexo === 'number' && isFinite(sexo)) return clampv(sexo, 0.30, 0.75);
  var s = String(sexo == null ? '' : sexo).trim().toUpperCase();
  if (s === 'F' || s === 'FEMININO' || s === 'MULHER' || s === 'IDOSO') return 0.50;
  return 0.60; // masculino (default)
}

// manobras suportadas (a "alavanca" do laboratório)
var MANOBRAS = {
  nenhuma:          'sem intervenção',
  agua_livre:       'ganho de água pura (hipotônico)',
  isotonico_ganho:  'ganho isotônico (salina fisiológica)',
  isotonico_perda:  'perda isotônica (hemorragia/vômito isotônico)',
  hipertonico_ganho:'ganho hipertônico (NaCl 3%)',
  perda_agua_pura:  'perda de água pura (insensível/DI)',
  suor:             'suor (perda hipotônica)',
  ureia:            'carga de ureia (osmol inefetivo)',
  glicose:          'carga de glicose (osmol efetivo)'
};

/*
 * compartimentos(input) → estado completo do par ICF/ECF antes e depois.
 * input: {
 *   pesoKg, sexo|fracao, na0, glu0, ureia0,   // estado basal
 *   tipo, volumeL, solutoMmol                  // manobra
 * }
 */
function compartimentos(input) {
  var inp = input || {};

  var pesoKg = clampv(inp.pesoKg !== undefined ? inp.pesoKg : 70, 1, 400);
  var frac   = fracSexo(inp.sexo !== undefined ? inp.sexo : inp.fracao);
  var na0    = clampv(inp.na0   !== undefined ? inp.na0   : 140, 100, 200); // mmol/L
  var glu0   = clampv(inp.glu0  !== undefined ? inp.glu0  : 0,   0,   200); // mmol/L efetivo
  var ureia0 = clampv(inp.ureia0!== undefined ? inp.ureia0: 5,   0,   100); // mmol/L inefetivo

  var tipo   = String(inp.tipo == null ? 'nenhuma' : inp.tipo).trim().toLowerCase();
  if (!MANOBRAS.hasOwnProperty(tipo)) tipo = 'nenhuma';
  var V      = clampv(inp.volumeL    !== undefined ? inp.volumeL    : 0, 0, 15);   // litros
  var soluto = clampv(inp.solutoMmol !== undefined ? inp.solutoMmol : 0, 0, 5000); // mosm

  // --- estado basal ---
  var TBW0 = pesoKg * frac;
  var ICF0 = TBW0 * 2 / 3;
  var ECF0 = TBW0 * 1 / 3;

  var Tinit = 2 * na0 + glu0;        // tonicidade efetiva inicial (mosm/L)
  var ecfNa  = 2 * na0 * ECF0;       // osmoles efetivos de Na no ECF
  var ecfGlu = glu0 * ECF0;          // osmoles efetivos de glicose no ECF
  var icfOsm = Tinit * ICF0;         // osmoles efetivos intracelulares
  var ureiaTot = ureia0 * TBW0;      // ureia por TODA a água (inefetivo)

  // --- deltas da manobra ---
  var dVol = 0, dEcfNa = 0, dEcfGlu = 0, dUreia = 0;
  switch (tipo) {
    case 'agua_livre':         dVol = +V; break;
    case 'isotonico_ganho':    dVol = +V; dEcfNa += V * (2 * na0); break;
    case 'isotonico_perda':    dVol = -V; dEcfNa -= V * (2 * na0); break;
    case 'hipertonico_ganho':  dVol = +V; dEcfNa += V * (2 * 513); break; // NaCl 3% ≈ Na 513 mmol/L
    case 'perda_agua_pura':    dVol = -V; break;
    case 'suor':               dVol = -V; dEcfNa -= V * (2 * 30); break;  // suor Na ~ 30 (hipotônico)
    case 'ureia':              dUreia += soluto; break;                   // PÉROLA: inefetivo
    case 'glicose':            dEcfGlu += soluto; break;                  // hipertônico efetivo
    default: break;
  }

  // --- re-equilíbrio (pisos contra absurdos) ---
  var ecfNa2  = Math.max(ecfNa  + dEcfNa,  0);
  var ecfGlu2 = Math.max(ecfGlu + dEcfGlu, 0);
  var icfOsm2 = Math.max(icfOsm, 1e-6);
  var ureiaTot2 = Math.max(ureiaTot + dUreia, 0);
  var TBW2 = Math.max(TBW0 + dVol, 0.1);

  var ecfEff = ecfNa2 + ecfGlu2;
  var totEff = ecfEff + icfOsm2;
  var tonic  = totEff / TBW2;
  if (!isFinite(tonic) || tonic <= 0) tonic = 1e-6;

  var icfVol = icfOsm2 / tonic;
  var ecfVol = ecfEff  / tonic;
  var osmMed = (totEff + ureiaTot2) / TBW2;          // medida inclui ureia
  var na     = ecfVol > 0 ? ecfNa2 / (2 * ecfVol) : 0;
  var glu    = ecfVol > 0 ? ecfGlu2 / ecfVol : 0;
  var ureiaC = TBW2 > 0 ? ureiaTot2 / TBW2 : 0;

  var dICFpct = ICF0 > 0 ? (icfVol - ICF0) / ICF0 * 100 : 0;
  var dECFpct = ECF0 > 0 ? (ecfVol - ECF0) / ECF0 * 100 : 0;

  // sentido da célula: +1 inchou, -1 murchou, 0 estável
  var celula = (icfVol - ICF0) > 1e-6 ? 1 : (icfVol - ICF0) < -1e-6 ? -1 : 0;

  return {
    tipo: tipo, manobra: MANOBRAS[tipo],
    // basal
    TBW0: TBW0, ICF0: ICF0, ECF0: ECF0, tonic0: Tinit, na0: na0,
    // final
    TBW: TBW2, ICF: icfVol, ECF: ecfVol,
    tonicidade: tonic, osmMedida: osmMed,
    na: na, glu: glu, ureia: ureiaC,
    // leitura
    dICFpct: dICFpct, dECFpct: dECFpct, celula: celula,
    gapInefetivo: osmMed - tonic              // a "distância" que a ureia abre
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { compartimentos: compartimentos, clampv: clampv, fracSexo: fracSexo, MANOBRAS: MANOBRAS };
}
