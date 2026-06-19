'use strict';
/*
 * FILTRA · M8 — validador jsdom (portão do §6)
 * estrutura · engine ≡ UI (collect, emaxModel, kFromEnac, collectLayout) · curva K×ENaC
 * pintada ≡ collectLayout() · caso ≥8 · trilha ≥13 · dois bancos · figura viva ≥8 · cromo.
 * Guarda farmacológica INVERTIDA (§8): EXIGE poupadores de K e vaptano com dose+unidade
 * ancorados ao mecanismo (aldosterona/ENaC/V2), dose-resposta computada e nota de honestidade.
 */
var fs = require('fs');
var path = require('path');
var jsdom = require('jsdom');
var JSDOM = jsdom.JSDOM;

var ref = require('./model8.js');
var imgGuard = require('../lib/img-guard.js');

var oks = 0, fail = 0;
function ok(c, m) { if (c) { oks++; } else { fail++; console.error('FALHA: ' + m); } }

var htmlPath = path.join(__dirname, '..', '..', 'filtra8.html');
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

var ids = [
  'tabs', 'tab-conceito', 'tab-caso', 'tab-trilha', 'tab-instrumento', 'tab-lab', 'tab-avaliacao',
  'k-canvas', 'in-aldo', 'in-adh', 'in-droga', 'in-dose',
  'out-enac', 'out-k', 'out-fena', 'out-adh', 'out-uosm', 'out-na', 'out-classe',
  'veredito', 'instr-pearl', 'lab-pearl', 'fig-caso', 'dose-box',
  'tutor-q', 'tutor-opts', 'tutor-fb', 'tutor-score', 'tutor-total', 'tutor-fig',
  'draw-k', 'draw-agua', 'draw-dose'
];
ids.forEach(function (id) { ok(doc.getElementById(id) !== null, 'estrutura: #' + id + ' presente'); });
ok(doc.querySelectorAll('#tabs button').length === 6, 'estrutura: 6 abas');
ok(doc.getElementById('k-canvas').tagName.toLowerCase() === 'canvas', 'instrumento: canvas k-canvas');

ok(doc.querySelectorAll('#tab-conceito svg').length >= 3, 'Conceito: ≥3 desenhos computados');
var conc = doc.getElementById('tab-conceito').textContent;
ok(/ENaC/.test(conc), 'Conceito: ENaC');
ok(/aldosterona/i.test(conc), 'Conceito: aldosterona');
ok(/ADH|vasopressina/i.test(conc), 'Conceito: ADH');
ok(/homeostas/i.test(conc), 'Conceito: homeostasia como conceito-fio');

ok(doc.querySelectorAll('button.act[data-rev]').length >= 8, 'caso: ≥8 atos');
ok(doc.querySelectorAll('#caso .reveal').length >= 8, 'caso: ≥8 reveláveis');
ok(doc.querySelector('#fig-caso svg') !== null, 'Caso: ilustração SVG');
ok(doc.querySelectorAll('#trilha details').length >= 13, 'trilha: ≥13 passos');

ok(typeof win.collect === 'function', 'UI expõe collect()');
ok(typeof win.emaxModel === 'function', 'UI expõe emaxModel()');
ok(typeof win.kFromEnac === 'function', 'UI expõe kFromEnac()');
ok(typeof win.collectLayout === 'function', 'UI expõe collectLayout()');
var amostras = [
  {}, { aldo: 1.8 }, { droga: 'espironolactona', dose: 100, aldo: 1.4 }, { droga: 'amilorida', dose: 10 },
  { adh: 1.8 }, { droga: 'tolvaptan', dose: 60, adh: 1.8 }, { droga: 'eplerenona', dose: 50 },
  { aldo: null, droga: 'xyz', dose: -5, adh: NaN }
];
var divC = 0;
amostras.forEach(function (a) { if (JSON.stringify(win.collect(a)) !== JSON.stringify(ref.collect(a))) divC++; });
ok(divC === 0, 'engine ≡ UI: collect inline idêntico ao model8.js (' + divC + ' divergências)');
var divK = 0;
[0, 0.5, 1, 1.5, 2].forEach(function (e) { if (Math.abs(win.kFromEnac(e) - ref.kFromEnac(e)) > 1e-12) divK++; });
ok(divK === 0, 'kFromEnac ≡ UI (' + divK + ' divergências)');
var divL = 0;
amostras.forEach(function (a) { if (JSON.stringify(win.collectLayout(a, 900, 360)) !== JSON.stringify(ref.collectLayout(a, 900, 360))) divL++; });
ok(divL === 0, 'collectLayout ≡ UI (' + divL + ' divergências)');

var canvasEl = doc.getElementById('k-canvas');
var rec = canvasEl.getContext('2d');
ok(rec && Array.isArray(rec.__paths), 'canvas: contexto exercido');
var initState = { aldo: 1, adh: 1, droga: 'nenhum', dose: 0 };
var Lref = ref.collectLayout(initState, canvasEl.width, canvasEl.height);
var curvePath = null;
(rec.__paths || []).forEach(function (p) { if (p.length === Lref.pts.length && p[0] && Math.abs(p[0].y - Lref.pts[0].y) < 1e-4) curvePath = p; });
ok(curvePath !== null, 'canvas: polilinha K×ENaC pintada (' + Lref.pts.length + ' pontos)');
var pintaOk = true;
if (curvePath) { for (var i = 0; i < Lref.pts.length; i++) { if (Math.abs(curvePath[i].x - Lref.pts[i].x) > 1e-4 || Math.abs(curvePath[i].y - Lref.pts[i].y) > 1e-4) { pintaOk = false; break; } } }
ok(pintaOk, 'canvas: cada ponto da curva == collectLayout(engine)');
ok((rec.__rects || []).filter(function (q) { return q.op === 'fill'; }).length >= 1, 'canvas: marcador pintado');

ok(doc.getElementById('out-k').textContent !== '—', 'lab: out-k preenchido no init');
ok(doc.getElementById('out-na').textContent !== '—', 'lab: out-na preenchido no init');
ok(doc.getElementById('veredito').textContent.length > 1, 'lab: veredito computado');
ok(doc.getElementById('lab-pearl').textContent.length > 1, 'lab: pérola computada');
ok(doc.querySelectorAll('.presets button[data-preset]').length >= 4, 'lab: ≥4 presets');

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

var body = doc.body.textContent;
ok(/FILTRA/.test(doc.querySelector('.kicker') ? doc.querySelector('.kicker').textContent : ''), 'cromo: kicker');
ok(doc.querySelector('nav.hex .ativo') !== null, 'cromo: hexápode ativo');
ok(/CRM-SP 151\.318 · Dr\. Matheus M\. Coelho · Limeira/.test(body), 'cromo: rodapé');
ok(doc.querySelector('a[href="filtra.html"]') !== null, 'cromo: backlink');
ok(/educacional/i.test(body) && doc.querySelector('.disc') !== null, 'disclaimer educacional');
ok(/honestidade do modelo/i.test(body), 'disclaimer: nota de honestidade do modelo (§8)');

// GUARDA FARMACOLÓGICA INVERTIDA (§8)
ok(/espironolactona/i.test(body), 'farmacologia: espironolactona citada');
ok(/eplerenona/i.test(body), 'farmacologia: eplerenona citada');
ok(/amilorida/i.test(body), 'farmacologia: amilorida citada');
ok(/tolvaptan|vaptano/i.test(body), 'farmacologia: vaptano citado');
ok(/\b\d+[\s–-]+\d+\s?mg/.test(body) || /\b\d+\s?mg\b/.test(body), 'farmacologia (EXIGIDO): doses com unidade mg presentes');
ok(/ENaC/.test(body) && /aldosterona/i.test(body) && /V2/.test(body), 'farmacologia: mecanismos (ENaC/aldosterona/V2) ancorados');
ok(typeof win.emaxModel === 'function' && /efeito|Emax/i.test(html), 'farmacologia: dose-resposta computada (emaxModel)');
ok(ref.collect({ droga: 'espironolactona', dose: 100 }).plasmaK > ref.collect({}).plasmaK, 'farmacologia: efeito (poupa K) computado pela dose');

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
