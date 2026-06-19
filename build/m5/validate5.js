'use strict';
/*
 * FILTRA · M5 — validador jsdom (portão do §6)
 * estrutura · engine ≡ UI (tcp, glicoseHandling, emaxModel, tcpLayout) · a curva de
 * titulação pintada no canvas ≡ tcpLayout() · caso ≥8 · trilha ≥13 · dois bancos
 * (ilustrado SVG/raster + textual) · figura viva ≥8 · cromo.
 *
 * Guarda farmacológica INVERTIDA (§8): M5 É um módulo COM farmacologia de dose —
 * EXIGE fármacos com dose+unidade (mg) ancorados a mecanismo, dose-resposta computada
 * (emaxModel) e a nota de honestidade do modelo. A ausência de dose é falha.
 */
var fs = require('fs');
var path = require('path');
var jsdom = require('jsdom');
var JSDOM = jsdom.JSDOM;

var ref = require('./model5.js');
var imgGuard = require('../lib/img-guard.js');

var oks = 0, fail = 0;
function ok(c, m) { if (c) { oks++; } else { fail++; console.error('FALHA: ' + m); } }

var htmlPath = path.join(__dirname, '..', '..', 'filtra5.html');
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
  'glu-canvas', 'in-glu', 'in-gfr', 'in-hco3', 'in-droga', 'in-dose', 'in-fanconi',
  'out-tmg', 'out-filt', 'out-excr', 'out-limiar', 'out-hco3', 'out-na', 'out-diurese', 'out-classe',
  'veredito', 'instr-pearl', 'lab-pearl', 'fig-caso', 'dose-box',
  'tutor-q', 'tutor-opts', 'tutor-fb', 'tutor-score', 'tutor-total', 'tutor-fig',
  'draw-tcp', 'draw-titulacao', 'draw-dose'
];
ids.forEach(function (id) { ok(doc.getElementById(id) !== null, 'estrutura: #' + id + ' presente'); });
ok(doc.querySelectorAll('#tabs button').length === 6, 'estrutura: 6 abas');
ok(doc.getElementById('glu-canvas').tagName.toLowerCase() === 'canvas', 'instrumento: canvas glu-canvas');

// Conceito
ok(doc.querySelectorAll('#tab-conceito svg').length >= 3, 'Conceito: ≥3 desenhos computados');
var conc = doc.getElementById('tab-conceito').textContent;
ok(/SGLT2/.test(conc), 'Conceito: SGLT2');
ok(/anidrase carbônica/i.test(conc), 'Conceito: anidrase carbônica');
ok(/Fanconi/i.test(conc), 'Conceito: Fanconi');
ok(/homeostas/i.test(conc), 'Conceito: homeostasia como conceito-fio');

// caso ≥8 + trilha ≥13
ok(doc.querySelectorAll('button.act[data-rev]').length >= 8, 'caso: ≥8 atos');
ok(doc.querySelectorAll('#caso .reveal').length >= 8, 'caso: ≥8 reveláveis');
ok(doc.querySelector('#fig-caso svg') !== null, 'Caso: ilustração SVG');
ok(doc.querySelectorAll('#trilha details').length >= 13, 'trilha: ≥13 passos');

// engine ≡ UI
ok(typeof win.tcp === 'function', 'UI expõe tcp()');
ok(typeof win.glicoseHandling === 'function', 'UI expõe glicoseHandling()');
ok(typeof win.emaxModel === 'function', 'UI expõe emaxModel()');
ok(typeof win.tcpLayout === 'function', 'UI expõe tcpLayout()');
var amostras = [
  {}, { plasmaGlu: 300 }, { droga: 'sglt2i', dose: 25, plasmaGlu: 100 }, { droga: 'acetazolamida', dose: 500 },
  { droga: 'manitol', dose: 50 }, { fanconi: true, plasmaGlu: 95 }, { gfr: 60, plasmaGlu: 300 },
  { plasmaGlu: null, droga: 'xyz', dose: -5, gfr: NaN }
];
var divT = 0;
amostras.forEach(function (a) { if (JSON.stringify(win.tcp(a)) !== JSON.stringify(ref.tcp(a))) divT++; });
ok(divT === 0, 'engine ≡ UI: tcp inline idêntico ao model5.js (' + divT + ' divergências)');
var divE = 0;
[[0, 5, 0.9], [10, 3, 0.95], [500, 250, 0.95], [50, 30, 0.95]].forEach(function (t) {
  if (Math.abs(win.emaxModel(t[0], t[1], t[2]) - ref.emaxModel(t[0], t[1], t[2])) > 1e-12) divE++;
});
ok(divE === 0, 'emaxModel ≡ UI (' + divE + ' divergências)');
var divL = 0;
amostras.forEach(function (a) { if (JSON.stringify(win.tcpLayout(a, 900, 360)) !== JSON.stringify(ref.tcpLayout(a, 900, 360))) divL++; });
ok(divL === 0, 'tcpLayout ≡ UI (' + divL + ' divergências)');

// canvas titulação == tcpLayout(engine) — confere a linha "filtrada"
var canvasEl = doc.getElementById('glu-canvas');
var rec = canvasEl.getContext('2d');
ok(rec && Array.isArray(rec.__paths), 'canvas: contexto exercido');
var initState = { plasmaGlu: 100, gfr: 125, droga: 'nenhum', dose: 0, fanconi: false };
var Lref = ref.tcpLayout(initState, canvasEl.width, canvasEl.height);
var filtPath = null;
(rec.__paths || []).forEach(function (p) {
  if (p.length === Lref.filtrada.length && p[0] && Math.abs(p[0].y - Lref.filtrada[0].y) < 1e-4 && Math.abs(p[p.length - 1].y - Lref.filtrada[Lref.filtrada.length - 1].y) < 1e-4) filtPath = p;
});
ok(filtPath !== null, 'canvas: polilinha "filtrada" pintada (' + Lref.filtrada.length + ' pontos)');
var pintaOk = true;
if (filtPath) { for (var i = 0; i < Lref.filtrada.length; i++) { if (Math.abs(filtPath[i].x - Lref.filtrada[i].x) > 1e-4 || Math.abs(filtPath[i].y - Lref.filtrada[i].y) > 1e-4) { pintaOk = false; break; } } }
ok(pintaOk, 'canvas: cada ponto da "filtrada" == tcpLayout(engine)');
ok((rec.__texts || []).join(' ').indexOf('filtrada') >= 0, 'canvas: rótulo das curvas presente');

// Lab init
ok(doc.getElementById('out-tmg').textContent !== '—', 'lab: out-tmg preenchido no init');
ok(doc.getElementById('out-limiar').textContent !== '—', 'lab: out-limiar preenchido no init');
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
ok(doc.querySelector('nav.hex .ativo') !== null, 'cromo: hexápode ativo');
ok(/CRM-SP 151\.318 · Dr\. Matheus M\. Coelho · Limeira/.test(body), 'cromo: rodapé');
ok(doc.querySelector('a[href="filtra.html"]') !== null, 'cromo: backlink');
ok(/educacional/i.test(body) && doc.querySelector('.disc') !== null, 'disclaimer educacional');
ok(/honestidade do modelo/i.test(body), 'disclaimer: nota de honestidade do modelo (§8)');

// ─── GUARDA FARMACOLÓGICA INVERTIDA (§8): EXIGE dose+unidade+mecanismo ────────
ok(/SGLT2|empagliflozina/i.test(body), 'farmacologia: SGLT2i citado');
ok(/acetazolamida/i.test(body), 'farmacologia: acetazolamida citada');
ok(/manitol/i.test(body), 'farmacologia: manitol citado');
ok(/\b\d+[\s–-]+\d+\s?mg/.test(body) || /\b\d+\s?mg\b/.test(body), 'farmacologia (EXIGIDO): doses com unidade mg presentes');
ok(/g\/kg/.test(body), 'farmacologia: manitol com dose em g/kg');
ok(/anidrase carbônica/i.test(body), 'farmacologia: mecanismo (anidrase carbônica) ancorado');
ok(/cotransport|Na\/glicose|S1/i.test(body), 'farmacologia: mecanismo do SGLT2 ancorado');
ok(typeof win.emaxModel === 'function' && /efeitoFarm|Emax/i.test(html), 'farmacologia: dose-resposta computada (emaxModel/efeitoFarm)');
// dose-resposta de fato responde à dose (computa, não é número solto)
ok(ref.tcp({ droga: 'sglt2i', dose: 25 }).efeitoFarm > ref.tcp({ droga: 'sglt2i', dose: 5 }).efeitoFarm, 'farmacologia: efeito sobe com a dose (curva computada)');

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
