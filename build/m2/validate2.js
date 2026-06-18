'use strict';
/*
 * FILTRA · M2 — validador jsdom (portão do §6)
 * Confere: estrutura (IDs/abas) · engine ≡ UI (hemoRenal, fsrCurveLayout, medulaLayout,
 * hillPO2) · a curva FSR pintada no canvas ≡ fsrCurveLayout() · camada interativa ·
 * os dois bancos do tutor (ilustrado c/ SVG + textual) · cromo · disclaimer.
 *
 * Guarda farmacológica INVERTIDA (§8): M2 É o módulo de hemodinâmica renal COM
 * farmacologia de dose — EXIGE que doses de AINEs e IECA/BRA apareçam com unidade
 * explícita e ancoragem de mecanismo. A ausência de dose é falha.
 */

var fs   = require('fs');
var path = require('path');
var jsdom = require('jsdom');
var JSDOM = jsdom.JSDOM;

var ref      = require('./model2.js');           // engine canônico (Node)
var imgGuard = require('../lib/img-guard.js');   // guarda offline compartilhada

var oks = 0, fail = 0;
function ok(c, m) { if (c) { oks++; } else { fail++; console.error('FALHA: ' + m); } }

var htmlPath = path.join(__dirname, '..', '..', 'filtra2.html');
var html = fs.readFileSync(htmlPath, 'utf8');

// contexto-gravador: registra rects, texts e SUBPATHS (para verificar a polilinha do canvas)
function recorderCtx() {
  var rects = [], texts = [], paths = [], cur = null;
  return {
    fillStyle: '', strokeStyle: '', lineWidth: 1, globalAlpha: 1, font: '', canvas: null,
    clearRect: function () {},
    fillRect:  function (x, y, w, h) { rects.push({ op: 'fill',   x: x, y: y, w: w, h: h }); },
    strokeRect:function (x, y, w, h) { rects.push({ op: 'stroke', x: x, y: y, w: w, h: h }); },
    beginPath: function () { cur = []; paths.push(cur); },
    moveTo: function (x, y) { if (cur) cur.push({ t: 'M', x: x, y: y }); },
    lineTo: function (x, y) { if (cur) cur.push({ t: 'L', x: x, y: y }); },
    stroke: function () {}, setLineDash: function () {},
    fillText: function (t) { texts.push(String(t)); },
    arc: function () {}, fill: function () {}, closePath: function () {},
    __rects: rects, __texts: texts, __paths: paths
  };
}

var vc = new jsdom.VirtualConsole();
vc.sendTo(console);

var dom = new JSDOM(html, {
  runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, virtualConsole: vc,
  beforeParse: function (window) {
    window.HTMLCanvasElement.prototype.getContext = function () {
      if (!this.__rec) { this.__rec = recorderCtx(); this.__rec.canvas = this; }
      return this.__rec;
    };
  }
});
var win = dom.window, doc = win.document;

// ─── estrutura: abas e IDs essenciais ────────────────────────────────────────
var ids = [
  'tabs','tab-conceito','tab-caso','tab-trilha','tab-instrumento','tab-lab','tab-avaliacao',
  'fsr-canvas',
  'in-dc','in-pam','in-hct','in-hgb','in-aine','in-ieca','in-voldep','in-fcort',
  'out-fsr','out-fpr','out-tfg','out-ff','out-pgc','out-qmed','out-po2med','out-po2cort','out-ero2med','out-regime',
  'veredito','instr-pearl','lab-pearl','fig-caso',
  'tutor-q','tutor-opts','tutor-fb','tutor-score','tutor-total','tutor-fig',
  'draw-cardiac','draw-cortex-medula','draw-autorreg','draw-aine','draw-ieca'
];
ids.forEach(function (id) { ok(doc.getElementById(id) !== null, 'estrutura: #' + id + ' presente'); });

ok(doc.querySelectorAll('#tabs button').length === 6, 'estrutura: 6 abas');
ok(doc.getElementById('fsr-canvas').tagName.toLowerCase() === 'canvas', 'instrumento: canvas fsr-canvas');

// ─── aba CONCEITO: ≥5 SVGs (cardiac, córtex×medula, autorregulação, aine, ieca) ────────────
ok(doc.querySelectorAll('#tab-conceito svg').length >= 5,
  'Conceito: ≥5 desenhos (cardiac, córtex×medula, autorregulação, AINE, IECA)');

var conc = doc.getElementById('tab-conceito').textContent;
ok(/20/.test(conc) && /DC/.test(conc), 'Conceito: 20% do DC mencionado');
ok(/medula/.test(conc) && /córtex/.test(conc), 'Conceito: córtex × medula explicados');
ok(/pO₂/.test(conc) || /pO2/.test(conc), 'Conceito: pO₂ medular mencionado');
ok(/AINE/.test(conc) && /IECA/.test(conc), 'Conceito: AINE e IECA como alavancas');
ok(/aferente/.test(conc) && /eferente/.test(conc), 'Conceito: arteríolas aferente e eferente');

// ─── caso (5 atos, prever-depois-revelar) ────────────────────────────────────
ok(doc.querySelectorAll('button.act[data-rev]').length >= 5, 'caso: ≥5 atos com revelar');
ok(doc.querySelectorAll('#caso .reveal').length >= 5,        'caso: ≥5 blocos reveláveis');
ok(doc.querySelector('#fig-caso svg') !== null,              'Caso: ilustração SVG presente (#fig-caso)');

// ─── trilha socrática (≥9 passos) ────────────────────────────────────────────
ok(doc.querySelectorAll('#trilha details').length >= 9, 'trilha: ≥9 passos socráticos');

// ─── engine ≡ UI: hemoRenal inline ≡ model2.js ───────────────────────────────
ok(typeof win.hemoRenal === 'function', 'UI expõe hemoRenal()');
var amostras = [
  { DC: 5, PAM: 100 },
  { DC: 3, PAM: 85, aine: 0.8, vol_dep: 0.7 },
  { DC: 5, PAM: 100, ieca: 0.9, autoreg: false },
  { DC: 2.5, PAM: 75, aine: 1, vol_dep: 1 },
  { DC: 5, PAM: 60 },
  { DC: 7, PAM: 140 },
  { DC: 5, PAM: 100, Hgb: 7, Hct: 0.25 },
  { DC: null, PAM: NaN, aine: 'x', ieca: undefined } // sujeira → clamps
];
var divHR = 0;
amostras.forEach(function (a) {
  if (JSON.stringify(win.hemoRenal(a)) !== JSON.stringify(ref.hemoRenal(a))) divHR++;
});
ok(divHR === 0, 'engine ≡ UI: hemoRenal inline idêntico ao model2.js (' + divHR + ' divergências)');

// ─── engine ≡ UI: fsrCurveLayout e medulaLayout ──────────────────────────────
ok(typeof win.fsrCurveLayout === 'function', 'UI expõe fsrCurveLayout()');
ok(typeof win.medulaLayout   === 'function', 'UI expõe medulaLayout()');
ok(typeof win.hillPO2        === 'function', 'UI expõe hillPO2()');

var divCurve = 0, divMed = 0, divHill = 0;
amostras.forEach(function (a) {
  if (JSON.stringify(win.fsrCurveLayout(a, 900, 320)) !== JSON.stringify(ref.fsrCurveLayout(a, 900, 320))) divCurve++;
  if (JSON.stringify(win.medulaLayout(a, 300, 200))   !== JSON.stringify(ref.medulaLayout(a, 300, 200)))   divMed++;
});
[0.05, 0.3, 0.6, 0.9, 0.99].forEach(function (s) {
  if (Math.abs(win.hillPO2(s) - ref.hillPO2(s)) > 1e-9) divHill++;
});
ok(divCurve === 0, 'fsrCurveLayout ≡ UI (' + divCurve + ' divergências)');
ok(divMed   === 0, 'medulaLayout ≡ UI (' + divMed + ' divergências)');
ok(divHill  === 0, 'hillPO2 ≡ UI (' + divHill + ' divergências)');

// ─── o canvas DESENHOU a curva FSR×PAM (motor manda no pixel) ─────────────────
var canvasEl = doc.getElementById('fsr-canvas');
var rec = canvasEl.getContext('2d');
ok(rec && Array.isArray(rec.__paths), 'canvas: contexto exercido (gravador ativo)');

// estado inicial: DC=5, PAM=100, aine=0, ieca=0, vol_dep=0
var initState = { DC: 5, PAM: 100, aine: 0, ieca: 0, vol_dep: 0 };
var Lref = ref.fsrCurveLayout(initState, canvasEl.width, canvasEl.height);

// procura a subpath cuja primeira coordenada y bate com y_fsr[0] (distingue FSR da pO₂)
var curvePath = null;
(rec.__paths || []).forEach(function (p) {
  if (p.length === Lref.pts.length && p[0] && Math.abs(p[0].y - Lref.pts[0].y_fsr) < 1e-4) {
    curvePath = p;
  }
});
ok(curvePath !== null, 'canvas: polilinha FSR pintada (' + Lref.pts.length + ' pontos)');

var pintaOk = true;
if (curvePath) {
  for (var i = 0; i < Lref.pts.length; i++) {
    var pp = curvePath[i];
    if (Math.abs(pp.x - Lref.pts[i].x) > 1e-4 || Math.abs(pp.y - Lref.pts[i].y_fsr) > 1e-4) { pintaOk = false; break; }
  }
}
ok(pintaOk, 'canvas: cada ponto da curva FSR pintado == fsrCurveLayout(engine)');

// marcador (quadrado fill) deve existir
var fills = (rec.__rects || []).filter(function (q) { return q.op === 'fill'; });
ok(fills.length >= 1, 'canvas: marcador do ponto de operação pintado');
ok((rec.__texts || []).join(' ').indexOf('FSR') >= 0, 'canvas: rótulo FSR presente');

// ─── aba Lab: saídas preenchidas no init ─────────────────────────────────────
ok(doc.getElementById('out-fsr').textContent    !== '—', 'lab: out-fsr preenchido no init');
ok(doc.getElementById('out-po2med').textContent !== '—', 'lab: out-po2med preenchido no init');
ok(doc.getElementById('veredito').textContent.length > 1,'lab: veredito computado (não vazio)');
ok(doc.getElementById('lab-pearl').textContent.length > 1,'lab: pérola computada (não vazia)');

// ─── tutor: DOIS blocos (ilustrado ≥10 + textual ≥10), bem-formados ──────────
function malformados(bank) {
  var n = 0;
  (bank || []).forEach(function (it) {
    if (!it || !Array.isArray(it.o) || it.o.length < 2) n++;
    else if (typeof it.c !== 'number' || it.c < 0 || it.c >= it.o.length) n++;
    else if (!it.e || String(it.e).length < 3) n++;
  });
  return n;
}
var TI = win.TUTOR_ILUSTRADO, TT = win.TUTOR_TEXTUAL;
ok(Array.isArray(TI) && TI.length >= 10, 'tutor: bloco ILUSTRADO ≥10 (tem ' + (TI ? TI.length : 0) + ')');
ok(Array.isArray(TT) && TT.length >= 10, 'tutor: bloco TEXTUAL ≥10 (tem ' + (TT ? TT.length : 0) + ')');
ok(malformados(TI) === 0, 'tutor ilustrado: itens bem-formados');
ok(malformados(TT) === 0, 'tutor textual: itens bem-formados');

// cada item ilustrado precisa de ilustração SVG não-vazia
var semFig = 0;
(TI || []).forEach(function (it) {
  if (typeof it.fig !== 'function') { semFig++; return; }
  var svg = '';
  try { svg = it.fig(); } catch (e) { svg = ''; }
  if (!/<svg[\s>]/.test(String(svg)) || !/<(rect|circle|line|path|text)/.test(String(svg))) semFig++;
});
ok(semFig === 0, 'tutor ilustrado: toda questão traz ilustração SVG não-vazia (' + semFig + ' sem)');

// ─── a aba Avaliação renderizou a ilustração no DOM ───────────────────────────
ok(doc.getElementById('tutor-fig') !== null && doc.querySelector('#tutor-fig svg') !== null,
  'Avaliação: ilustração renderizada no DOM (#tutor-fig svg)');
ok(doc.querySelectorAll('#banktabs button').length === 2, 'Avaliação: dois blocos (ilustrada/textual)');

// ─── cromo: kicker, hexápode, rodapé, backlink, disclaimer ───────────────────
var body = doc.body.textContent;
ok(/FILTRA/.test(doc.querySelector('.kicker') ? doc.querySelector('.kicker').textContent : ''), 'cromo: kicker FILTRA');
ok(doc.querySelector('nav.hex .ativo') !== null, 'cromo: hexápode com braço ativo');
ok(/CRM-SP 151\.318 · Dr\. Matheus M\. Coelho · Limeira/.test(body), 'cromo: rodapé de série');
ok(doc.querySelector('a[href="filtra.html"]') !== null, 'cromo: backlink relativo ao índice');
ok(/educacional/i.test(body) && doc.querySelector('.disc') !== null, 'disclaimer educacional presente');
// M2 tem fármacos com dose — a nota de honestidade do modelo deve estar presente
ok(/honestidade do modelo/i.test(body) || /nota de honestidade/i.test(body), 'disclaimer: nota de honestidade do modelo presente');

// ─── guarda farmacológica INVERTIDA (§8): M2 EXIGE doses com unidade + mecanismo ─────────────
// a) fármacos citados (AINE e IECA/BRA)
ok(/AINE/.test(body) && /IECA/.test(body), 'farmacologia: AINE e IECA citados');
ok(/aferente/.test(body) && /eferente/.test(body), 'farmacologia: mecanismo aferente/eferente exposto');

// b) doses com unidade explícita (mg/dia, mg q8h, etc.)
//    ibuprofeno 400–800 mg | naproxeno 250–500 mg | enalapril 5–40 mg | ramipril 2,5–10 mg | losartan 25–100 mg
ok(/\b\d+[\s–-]+\d+\s?mg/.test(body) || /\b\d+\s?mg\b/.test(body),
  'farmacologia (EXIGIDO em M2): doses com unidade mg presentes');
ok(/ibuprofeno|naproxeno|diclofenaco/.test(body), 'farmacologia: AINE específico citado');
ok(/enalapril|ramipril|losartan/.test(body), 'farmacologia: IECA/BRA específico citado');

// c) mecanismo âncora (não número solto)
ok(/COX|prostaglandina|PGE|PGI/.test(body), 'farmacologia: mecanismo COX/PG do AINE');
ok(/AngII|angiotensina/i.test(body), 'farmacologia: mecanismo AngII do IECA/BRA');

// d) dose-resposta computada pelo motor (aine_rA presente na UI)
ok(/aine_rA/.test(win.pearlInstr ? win.pearlInstr.toString() : '') ||
   /aine_rA/.test(html), 'farmacologia: dose-resposta computada (aine_rA exposta na UI)');

// ─── guarda OFFLINE: nenhum <img> remoto ──────────────────────────────────────
ok(imgGuard.remoteImgs(doc).length === 0, 'offline: nenhum <img> remoto (fotos só de assets/ local)');

console.log(oks + ' OK · ' + fail + ' falhas');
process.exit(fail > 0 ? 1 : 0);
