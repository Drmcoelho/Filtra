'use strict';
/*
 * FILTRA · M18 — validador jsdom (portão do §6) [CAPSTONE FARMACOLÓGICO 2]
 * estrutura · engine ≡ UI (rim, emaxModel, ajusteRenal, craLayout) · a curva ΔCr%×dose
 * pintada no canvas ≡ craLayout() · caso ≥8 · trilha ≥13 · dois bancos
 * (ilustrado SVG/raster + textual) · figura viva ≥8 · cromo.
 *
 * Guarda farmacológica INVERTIDA (§8): M18 É um capstone COM farmacologia de dose —
 * EXIGE fármacos com dose+unidade (mg / UI) ancorados a mecanismo, dose-resposta
 * computada (emaxModel) e a nota de honestidade do modelo. A ausência de dose é falha.
 */
var fs = require('fs');
var path = require('path');
var jsdom = require('jsdom');
var JSDOM = jsdom.JSDOM;

var ref = require('./model18.js');
var imgGuard = require('../lib/img-guard.js');

var oks = 0, fail = 0;
function ok(c, m) { if (c) { oks++; } else { fail++; console.error('FALHA: ' + m); } }

var htmlPath = path.join(__dirname, '..', '..', 'filtra18.html');
var html = fs.readFileSync(htmlPath, 'utf8');

function recorderCtx() {
  var rects = [], texts = [], paths = [], cur = null;
  return {
    fillStyle: '', strokeStyle: '', lineWidth: 1, globalAlpha: 1, font: '', canvas: null,
    clearRect: function () {},
    fillRect: function (x, y, w, h) { rects.push({ op: 'fill', x: x, y: y, w: w, h: h }); },
    strokeRect: function (x, y, w, h) { rects.push({ op: 'stroke', x: x, y: y, w: w, h: h }); },
    beginPath: function () { cur = []; paths.push(cur); },
    moveTo: function (x, y) { if (cur) cur.push({ t: 'M', x: x, y: y }); },
    lineTo: function (x, y) { if (cur) cur.push({ t: 'L', x: x, y: y }); },
    stroke: function () {}, setLineDash: function () {},
    fillText: function (t) { texts.push(String(t)); },
    arc: function () {}, fill: function () {}, closePath: function () {},
    __rects: rects, __texts: texts, __paths: paths
  };
}
var vc = new jsdom.VirtualConsole(); vc.sendTo(console);
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

// estrutura
var ids = [
  'tabs', 'tab-conceito', 'tab-caso', 'tab-trilha', 'tab-instrumento', 'tab-lab', 'tab-avaliacao',
  'cra-canvas', 'in-droga', 'in-dose', 'in-tfg', 'in-k', 'in-cr', 'in-prot', 'in-hb', 'in-pth', 'in-po4',
  'in-fr', 'in-clr', 'in-estenose',
  'out-pgc', 'out-tfg', 'out-cr', 'out-prot', 'out-k', 'out-hb', 'out-mineral', 'out-ajuste', 'out-classe',
  'veredito', 'instr-pearl', 'lab-pearl', 'fig-caso', 'dose-box',
  'tutor-q', 'tutor-opts', 'tutor-fb', 'tutor-score', 'tutor-total', 'tutor-fig',
  'draw-glomerulo', 'draw-zona', 'draw-endo', 'draw-ajuste', 'draw-dose'
];
ids.forEach(function (id) { ok(doc.getElementById(id) !== null, 'estrutura: #' + id + ' presente'); });
ok(doc.querySelectorAll('#tabs button').length === 6, 'estrutura: 6 abas');
ok(doc.getElementById('cra-canvas').tagName.toLowerCase() === 'canvas', 'instrumento: canvas cra-canvas');

// Conceito
ok(doc.querySelectorAll('#tab-conceito svg').length >= 3, 'Conceito: ≥3 desenhos computados');
var conc = doc.getElementById('tab-conceito').textContent;
ok(/eferente/i.test(conc), 'Conceito: eferente');
ok(/RAAS|AngII|angiotensina/i.test(conc), 'Conceito: RAAS/AngII');
ok(/estenose/i.test(conc), 'Conceito: estenose');
ok(/homeostas/i.test(conc), 'Conceito: homeostasia como conceito-fio');

// caso ≥8 + trilha ≥13
ok(doc.querySelectorAll('button.act[data-rev]').length >= 8, 'caso: ≥8 atos');
ok(doc.querySelectorAll('#caso .reveal').length >= 8, 'caso: ≥8 reveláveis');
ok(doc.querySelector('#fig-caso svg') !== null, 'Caso: ilustração SVG');
ok(doc.querySelectorAll('#trilha details').length >= 13, 'trilha: ≥13 passos');

// engine ≡ UI
ok(typeof win.rim === 'function', 'UI expõe rim()');
ok(typeof win.emaxModel === 'function', 'UI expõe emaxModel()');
ok(typeof win.ajusteRenal === 'function', 'UI expõe ajusteRenal()');
ok(typeof win.craLayout === 'function', 'UI expõe craLayout()');
var amostras = [
  {}, { droga: 'enalapril', dose: 20 }, { droga: 'enalapril', dose: 40, estenoseBilateral: true },
  { droga: 'espironolactona', dose: 50, K_basal: 5.2 }, { droga: 'losartana', dose: 100 },
  { droga: 'epoetina', dose: 100, Hb_basal: 8 }, { droga: 'cinacalcete', dose: 90, PTH_basal: 700 },
  { droga: 'sevelamer', dose: 1600, PO4_basal: 7 },
  { droga: 'xyz', dose: -5, TFG: NaN, Vd: 0.2, ligacaoProteica: 10, fracaoRenal: 0.9, clearance: 20 }
];
var divT = 0;
amostras.forEach(function (a) { if (JSON.stringify(win.rim(a)) !== JSON.stringify(ref.rim(a))) divT++; });
ok(divT === 0, 'engine ≡ UI: rim inline idêntico ao model18.js (' + divT + ' divergências)');
var divE = 0;
[[0, 8, 0.95], [20, 8, 0.95], [50, 50, 0.95], [90, 30, 0.95]].forEach(function (t) {
  if (Math.abs(win.emaxModel(t[0], t[1], t[2]) - ref.emaxModel(t[0], t[1], t[2])) > 1e-12) divE++;
});
ok(divE === 0, 'emaxModel ≡ UI (' + divE + ' divergências)');
var divA = 0;
[{ fracaoRenal: 0.9, clearance: 20 }, { Vd: 0.2, ligacaoProteica: 10, fracaoRenal: 0.9, clearance: 20 }, {}].forEach(function (a) {
  if (JSON.stringify(win.ajusteRenal(a)) !== JSON.stringify(ref.ajusteRenal(a))) divA++;
});
ok(divA === 0, 'ajusteRenal ≡ UI (' + divA + ' divergências)');
var divL = 0;
amostras.forEach(function (a) { if (JSON.stringify(win.craLayout(a, 900, 360)) !== JSON.stringify(ref.craLayout(a, 900, 360))) divL++; });
ok(divL === 0, 'craLayout ≡ UI (' + divL + ' divergências)');

// canvas curva ΔCr% == craLayout(engine) — confere a polilinha
var canvasEl = doc.getElementById('cra-canvas');
var rec = canvasEl.getContext('2d');
ok(rec && Array.isArray(rec.__paths), 'canvas: contexto exercido');
var initState = { droga: 'enalapril', dose: 20, TFG: 60, Cr_basal: 1.4, K_basal: 4.5, proteinuria: 1.5, Hb_basal: 9.0, PTH_basal: 600, PO4_basal: 6.0, fracaoRenal: 0.5, clearance: 100, estenoseBilateral: false };
var Lref = ref.craLayout(initState, canvasEl.width, canvasEl.height);
var curvaPath = null;
(rec.__paths || []).forEach(function (p) {
  if (p.length === Lref.curva.length && p[0] && Math.abs(p[0].y - Lref.curva[0].y) < 1e-4 && Math.abs(p[p.length - 1].y - Lref.curva[Lref.curva.length - 1].y) < 1e-4) curvaPath = p;
});
ok(curvaPath !== null, 'canvas: polilinha ΔCr% pintada (' + Lref.curva.length + ' pontos)');
var pintaOk = true;
if (curvaPath) { for (var i = 0; i < Lref.curva.length; i++) { if (Math.abs(curvaPath[i].x - Lref.curva[i].x) > 1e-6 || Math.abs(curvaPath[i].y - Lref.curva[i].y) > 1e-6) { pintaOk = false; break; } } }
ok(pintaOk, 'canvas: cada ponto da curva == craLayout(engine) (tol 1e-6)');
ok((rec.__texts || []).join(' ').indexOf('zona') >= 0, 'canvas: rótulo das zonas presente');

// Lab init
ok(doc.getElementById('out-cr').textContent !== '—', 'lab: out-cr preenchido no init');
ok(doc.getElementById('out-tfg').textContent !== '—', 'lab: out-tfg preenchido no init');
ok(doc.getElementById('veredito').textContent.length > 1, 'lab: veredito computado');
ok(doc.getElementById('lab-pearl').textContent.length > 1, 'lab: pérola computada');
ok(doc.querySelectorAll('.presets button[data-preset]').length >= 4, 'lab: ≥4 presets');

// tutor
function malformados(bank) { var n = 0; (bank || []).forEach(function (it) { if (!it || !Array.isArray(it.o) || it.o.length < 2) n++; else if (typeof it.c !== 'number' || it.c < 0 || it.c >= it.o.length) n++; else if (!it.e || String(it.e).length < 3) n++; }); return n; }
var TI = win.TUTOR_ILUSTRADO, TT = win.TUTOR_TEXTUAL;
ok(Array.isArray(TI) && TI.length >= 10, 'tutor: ILUSTRADO ≥10 (tem ' + (TI ? TI.length : 0) + ')');
ok(Array.isArray(TT) && TT.length >= 10, 'tutor: TEXTUAL ≥10 (tem ' + (TT ? TT.length : 0) + ')');
ok(malformados(TI) === 0, 'tutor ilustrado: bem-formado');
ok(malformados(TT) === 0, 'tutor textual: bem-formado');
var semFig = 0, comImg = 0;
(TI || []).forEach(function (it) {
  if (typeof it.fig !== 'function') { semFig++; return; }
  var s = ''; try { s = String(it.fig()); } catch (e) { s = ''; }
  var ehSvg = /<svg[\s>]/.test(s) && /<(rect|circle|line|path|text)/.test(s);
  var img = s.match(/<img[^>]+src=["']([^"']+)["']/i);
  var ehImg = img ? (!/^https?:/i.test(img[1]) && fs.existsSync(path.join(__dirname, '..', '..', img[1]))) : false;
  if (!ehSvg && !ehImg) semFig++; if (ehImg) comImg++;
});
ok(semFig === 0, 'tutor ilustrado: toda questão tem ilustração (SVG ou raster) (' + semFig + ' sem)');
ok(comImg >= 1, 'tutor ilustrado: usa figuras-raster nos exercícios (' + comImg + ')');
ok(doc.querySelector('#tutor-fig svg') !== null, 'Avaliação: ilustração renderizada no DOM');
ok(doc.querySelectorAll('#banktabs button').length === 2, 'Avaliação: dois blocos');

// cromo
var body = doc.body.textContent;
ok(/FILTRA/.test(doc.querySelector('.kicker') ? doc.querySelector('.kicker').textContent : ''), 'cromo: kicker');
ok(/módulo M18/.test(doc.querySelector('.kicker') ? doc.querySelector('.kicker').textContent : ''), 'cromo: kicker módulo M18');
ok(doc.querySelector('nav.hex .ativo') !== null, 'cromo: hexápode ativo');
ok(doc.querySelector('nav.hex .ativo').textContent.indexOf('FILTRA') >= 0, 'cromo: FILTRA ativo');
ok(/CRM-SP 151\.318 · Dr\. Matheus M\. Coelho · Limeira/.test(body), 'cromo: rodapé');
ok(doc.querySelector('a[href="filtra.html"]') !== null, 'cromo: backlink');
ok(/educacional/i.test(body) && doc.querySelector('.disc') !== null, 'disclaimer educacional');
ok(/honestidade do modelo/i.test(body), 'disclaimer: nota de honestidade do modelo (§8)');

// ─── GUARDA FARMACOLÓGICA INVERTIDA (§8): EXIGE dose+unidade+mecanismo ────────
function nearText(re1, re2, win) {
  win = win || 60; var m = body.match(re1); if (!m) return false; var idx = body.search(re1);
  var slice = body.slice(Math.max(0, idx - win), idx + win + 40); return re2.test(slice);
}
ok(/enalapril/i.test(body), 'farmacologia: enalapril (IECA) citado');
ok(/losartana/i.test(body), 'farmacologia: losartana (BRA) citada');
ok(/alisquireno/i.test(body), 'farmacologia: alisquireno (IDR) citado');
ok(/espironolactona/i.test(body), 'farmacologia: espironolactona (ARM) citada');
ok(/sacubitril/i.test(body), 'farmacologia: sacubitril/valsartana (ARNI) citado');
ok(/sevel[âa]mer/i.test(body), 'farmacologia: sevelâmer citado');
ok(/cinacalcete/i.test(body), 'farmacologia: cinacalcete citado');
ok(/epoetina|eritropoetina/i.test(body), 'farmacologia: EPO/ESA citada');
// doses com unidade ancoradas
ok(nearText(/enalapril/i, /\d+[\s–-]+\d+\s?mg|\d+\s?mg/i), 'farmacologia (EXIGIDO): enalapril com dose mg');
ok(nearText(/losartana/i, /\d+[\s–-]+\d+\s?mg|\d+\s?mg/i), 'farmacologia (EXIGIDO): losartana com dose mg');
ok(nearText(/espironolactona/i, /\d+[\s–-]+\d+\s?mg|\d+\s?mg/i), 'farmacologia (EXIGIDO): espironolactona com dose mg');
ok(nearText(/sevel[âa]mer/i, /\d+[\s–-]+\d+\s?mg|\d+\s?mg/i), 'farmacologia (EXIGIDO): sevelâmer com dose mg');
ok(nearText(/cinacalcete/i, /\d+[\s–-]+\d+\s?mg|\d+\s?mg/i), 'farmacologia (EXIGIDO): cinacalcete com dose mg');
ok(nearText(/epoetina|eritropoetina/i, /\d+[\s–-]+\d+\s?UI|\d+\s?UI/i), 'farmacologia (EXIGIDO): EPO com dose UI/kg');
// mecanismos ancorados
ok(/eferente/i.test(body) && /AngII|angiotensina|ECA/i.test(body), 'farmacologia: mecanismo (eferente / ↓AngII) ancorado');
ok(/aldosterona/i.test(body), 'farmacologia: mecanismo (aldosterona / ARM) ancorado');
ok(/neprilisina/i.test(body), 'farmacologia: mecanismo (neprilisina / ARNI) ancorado');
ok(/PTH|paratire/i.test(body), 'farmacologia: mecanismo (PTH / calcimimético) ancorado');
ok(typeof win.emaxModel === 'function' && /efeitoFarm|Emax/i.test(html), 'farmacologia: dose-resposta computada (emaxModel/efeitoFarm)');
// dose-resposta de fato responde à dose (computa, não é número solto)
ok(ref.rim({ droga: 'enalapril', dose: 40 }).efeitoFarm > ref.rim({ droga: 'enalapril', dose: 5 }).efeitoFarm, 'farmacologia: efeito sobe com a dose (curva computada)');
// a inversão central: Cr↑ esperada × precipício pela estenose
ok(ref.rim({ droga: 'enalapril', dose: 20 }).conduta === 'manter' && ref.rim({ droga: 'enalapril', dose: 40, estenoseBilateral: true }).conduta === 'suspender', 'farmacologia: Cr↑ esperada (manter) × estenose (suspender) computada');
// ajuste renal computado
var dialUI = win.rim({ droga: 'enalapril', dose: 20, Vd: 0.2, ligacaoProteica: 10, fracaoRenal: 0.9, clearance: 20 });
ok(dialUI.dialisavel && dialUI.fracaoManter < 1, 'farmacologia: ajuste renal/dialisável computado');

// offline + figura viva
ok(imgGuard.remoteImgs(doc).length === 0, 'offline: nenhum <img> remoto');
var figs = Array.prototype.slice.call(doc.querySelectorAll('figure.fviva'));
ok(figs.length >= 8, 'figura viva: ≥8 figuras inline (tem ' + figs.length + ')');
ok(!doc.querySelector('.galeria'), 'figura viva: sem mural .galeria');
ok(doc.querySelectorAll('#tab-conceito figure.fviva').length >= 8, 'figura viva: ≥8 na aba Conceito');
var faltam = figs.filter(function (fg) { var im = fg.querySelector('img'); var s = im ? (im.getAttribute('src') || '') : ''; return !s || !fs.existsSync(path.join(__dirname, '..', '..', s)); });
ok(faltam.length === 0, 'figura viva: arquivos existem em assets/ (' + faltam.length + ' faltando)');
var semAlt = figs.filter(function (fg) { var im = fg.querySelector('img'); return !im || !((im.getAttribute('alt') || '').trim()); });
ok(semAlt.length === 0, 'figura viva: todo <img> tem alt');
var semCap = figs.filter(function (fg) { var cap = fg.querySelector('figcaption'); return !cap || (cap.textContent || '').trim().length < 30; });
ok(semCap.length === 0, 'figura viva: legenda que ensina (≥30 chars)');
ok(/Fig\.\s*\d/.test(html), 'figura viva: referência "Fig. N"');

console.log(oks + ' OK · ' + fail + ' falhas');
process.exit(fail > 0 ? 1 : 0);
