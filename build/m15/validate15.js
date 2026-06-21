'use strict';
/*
 * FILTRA · M15 — validador jsdom (portão do §6)
 * estrutura · engine ≡ UI (renalState, renalLayout) · zonas/marcador do mapa pintados ≡ renalLayout() ·
 * caso ≥8 · trilha ≥13 · dois bancos · figura viva ≥8 · cromo. M15 é fisiologia (sem dose mg) — sem guarda farmacológica.
 */
var fs = require('fs');
var path = require('path');
var jsdom = require('jsdom');
var JSDOM = jsdom.JSDOM;

var ref = require('./model15.js');
var imgGuard = require('../lib/img-guard.js');

var oks = 0, fail = 0;
function ok(c, m) { if (c) { oks++; } else { fail++; console.error('FALHA: ' + m); } }

var htmlPath = path.join(__dirname, '..', '..', 'filtra15.html');
var html = fs.readFileSync(htmlPath, 'utf8');

function recorderCtx() {
  var rects = [], texts = [], paths = [], arcs = [], cur = null;
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
    arc: function (x, y, r) { arcs.push({ x: x, y: y, r: r }); }, fill: function () {}, closePath: function () {},
    __rects: rects, __texts: texts, __paths: paths, __arcs: arcs
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
  'ur-canvas', 'in-av', 'in-diu',
  'out-fena', 'out-feu', 'out-una', 'out-uosm', 'out-bun', 'out-sed', 'out-dx',
  'veredito', 'instr-pearl', 'lab-pearl', 'fig-caso',
  'tutor-q', 'tutor-opts', 'tutor-fb', 'tutor-score', 'tutor-total', 'tutor-fig',
  'draw-indices', 'draw-fingerprint'
];
ids.forEach(function (id) { ok(doc.getElementById(id) !== null, 'estrutura: #' + id + ' presente'); });
ok(doc.querySelectorAll('#tabs button').length === 6, 'estrutura: 6 abas');
ok(doc.getElementById('ur-canvas').tagName.toLowerCase() === 'canvas', 'instrumento: canvas ur-canvas');

ok(doc.querySelectorAll('#tab-conceito svg').length >= 2, 'Conceito: ≥2 desenhos computados');
var conc = doc.getElementById('tab-conceito').textContent;
ok(/FE_Na|FENa/i.test(conc), 'Conceito: FE_Na');
ok(/FE_ureia|FE_ureia/i.test(conc), 'Conceito: FE_ureia');
ok(/sedimento|cilindros/i.test(conc), 'Conceito: sedimento');
ok(/pré-renal|NTA/i.test(conc), 'Conceito: pré-renal × NTA');
ok(/homeostas/i.test(conc), 'Conceito: homeostasia como conceito-fio');

ok(doc.querySelectorAll('button.act[data-rev]').length >= 8, 'caso: ≥8 atos');
ok(doc.querySelectorAll('#caso .reveal').length >= 8, 'caso: ≥8 reveláveis');
ok(doc.querySelector('#fig-caso svg') !== null, 'Caso: ilustração SVG');
ok(doc.querySelectorAll('#trilha details').length >= 13, 'trilha: ≥13 passos');

ok(typeof win.renalState === 'function', 'UI expõe renalState()');
ok(typeof win.renalLayout === 'function', 'UI expõe renalLayout()');
var amostras = [
  {}, { avidez: 1 }, { avidez: 0 }, { avidez: 0.85, diuretic: 1 }, { avidez: 0.5 }, { avidez: 0.1, diuretic: 1 },
  { avidez: null, diuretic: 'x' }, { avidez: Infinity }
];
var divS = 0;
amostras.forEach(function (a) { if (JSON.stringify(win.renalState(a)) !== JSON.stringify(ref.renalState(a))) divS++; });
ok(divS === 0, 'engine ≡ UI: renalState inline idêntico ao model15.js (' + divS + ' divergências)');
var divL = 0;
amostras.forEach(function (a) { if (JSON.stringify(win.renalLayout(a, 900, 380)) !== JSON.stringify(ref.renalLayout(a, 900, 380))) divL++; });
ok(divL === 0, 'renalLayout ≡ UI (' + divL + ' divergências)');

var canvasEl = doc.getElementById('ur-canvas');
var rec = canvasEl.getContext('2d');
ok(rec && Array.isArray(rec.__arcs), 'canvas: contexto exercido');
var initState = { avidez: 0.5, diuretic: 0 };
var Lref = ref.renalLayout(initState, canvasEl.width, canvasEl.height);
var marcou = (rec.__arcs || []).some(function (a) { return Math.abs(a.x - Lref.current.x) < 1e-4 && Math.abs(a.y - Lref.current.y) < 1e-4; });
ok(marcou, 'canvas: marcador no ponto atual (FE_Na, U_osm) == renalLayout(engine)');
var zonas = (rec.__rects || []).filter(function (q) { return q.op === 'fill'; });
ok(zonas.length >= 2, 'canvas: zonas pré-renal e NTA pintadas');
var temZonaPre = zonas.some(function (q) { return Math.abs(q.x - Lref.zonaPre.x1) < 1e-4 && Math.abs(q.y - Lref.zonaPre.y1) < 1e-4; });
ok(temZonaPre, 'canvas: zona pré-renal == renalLayout.zonaPre');

ok(doc.getElementById('out-fena').textContent !== '—', 'lab: out-fena preenchido no init');
ok(doc.getElementById('out-feu').textContent !== '—', 'lab: out-feu preenchido no init');
ok(doc.getElementById('out-dx').textContent.length > 2, 'lab: diagnóstico computado');
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
