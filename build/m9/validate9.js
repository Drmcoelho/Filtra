'use strict';
/*
 * FILTRA · M9 — validador jsdom (portão do §6)
 * estrutura · engine ≡ UI (volemia, fenaFrom, volemiaLayout) · curva FENa×VCE pintada ≡
 * volemiaLayout() · caso ≥8 · trilha ≥13 · dois bancos (SVG/raster) · figura viva ≥8 · cromo.
 * M9 é fisiologia do volume (sem fármaco-dose) — sem guarda farmacológica.
 */
var fs = require('fs');
var path = require('path');
var jsdom = require('jsdom');
var JSDOM = jsdom.JSDOM;

var ref = require('./model9.js');
var imgGuard = require('../lib/img-guard.js');

var oks = 0, fail = 0;
function ok(c, m) { if (c) { oks++; } else { fail++; console.error('FALHA: ' + m); } }

var htmlPath = path.join(__dirname, '..', '..', 'filtra9.html');
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
  'vol-canvas', 'in-ecv', 'in-ecf', 'in-map',
  'out-aldo', 'out-sns', 'out-anp', 'out-fena', 'out-una', 'out-edema', 'out-classe',
  'veredito', 'instr-pearl', 'lab-pearl', 'fig-caso',
  'tutor-q', 'tutor-opts', 'tutor-fb', 'tutor-score', 'tutor-total', 'tutor-fig',
  'draw-ecf', 'draw-fena', 'draw-horm'
];
ids.forEach(function (id) { ok(doc.getElementById(id) !== null, 'estrutura: #' + id + ' presente'); });
ok(doc.querySelectorAll('#tabs button').length === 6, 'estrutura: 6 abas');
ok(doc.getElementById('vol-canvas').tagName.toLowerCase() === 'canvas', 'instrumento: canvas vol-canvas');

ok(doc.querySelectorAll('#tab-conceito svg').length >= 3, 'Conceito: ≥3 desenhos computados');
var conc = doc.getElementById('tab-conceito').textContent;
ok(/circulante efetivo|VCE/i.test(conc), 'Conceito: volume circulante efetivo');
ok(/FENa/.test(conc), 'Conceito: FENa');
ok(/edema|subenchimento/i.test(conc), 'Conceito: edema/subenchimento');
ok(/homeostas/i.test(conc), 'Conceito: homeostasia como conceito-fio');

ok(doc.querySelectorAll('button.act[data-rev]').length >= 8, 'caso: ≥8 atos');
ok(doc.querySelectorAll('#caso .reveal').length >= 8, 'caso: ≥8 reveláveis');
ok(doc.querySelector('#fig-caso svg') !== null, 'Caso: ilustração SVG');
ok(doc.querySelectorAll('#trilha details').length >= 13, 'trilha: ≥13 passos');

ok(typeof win.volemia === 'function', 'UI expõe volemia()');
ok(typeof win.fenaFrom === 'function', 'UI expõe fenaFrom()');
ok(typeof win.volemiaLayout === 'function', 'UI expõe volemiaLayout()');
var amostras = [
  {}, { ecv: 0.4 }, { ecv: 0.5, totalECF: 1.6, map: 90 }, { ecv: 0.45, totalECF: 1.7 }, { ecv: 1.5, totalECF: 1.6, map: 115 },
  { ecv: 0.4, totalECF: 0.7, map: 80 }, { map: 150 }, { ecv: null, totalECF: 'x', map: NaN }
];
var divV = 0;
amostras.forEach(function (a) { if (JSON.stringify(win.volemia(a)) !== JSON.stringify(ref.volemia(a))) divV++; });
ok(divV === 0, 'engine ≡ UI: volemia inline idêntico ao model9.js (' + divV + ' divergências)');
var divF = 0;
[[0.4, 95], [1, 95], [1.6, 95], [1, 150]].forEach(function (t) { if (Math.abs(win.fenaFrom(t[0], t[1]) - ref.fenaFrom(t[0], t[1])) > 1e-12) divF++; });
ok(divF === 0, 'fenaFrom ≡ UI (' + divF + ' divergências)');
var divL = 0;
amostras.forEach(function (a) { if (JSON.stringify(win.volemiaLayout(a, 900, 360)) !== JSON.stringify(ref.volemiaLayout(a, 900, 360))) divL++; });
ok(divL === 0, 'volemiaLayout ≡ UI (' + divL + ' divergências)');

var canvasEl = doc.getElementById('vol-canvas');
var rec = canvasEl.getContext('2d');
ok(rec && Array.isArray(rec.__paths), 'canvas: contexto exercido');
var initState = { ecv: 1, totalECF: 1, map: 95 };
var Lref = ref.volemiaLayout(initState, canvasEl.width, canvasEl.height);
var curvePath = null;
(rec.__paths || []).forEach(function (p) { if (p.length === Lref.pts.length && p[0] && Math.abs(p[0].y - Lref.pts[0].y) < 1e-4) curvePath = p; });
ok(curvePath !== null, 'canvas: polilinha FENa pintada (' + Lref.pts.length + ' pontos)');
var pintaOk = true;
if (curvePath) { for (var i = 0; i < Lref.pts.length; i++) { if (Math.abs(curvePath[i].x - Lref.pts[i].x) > 1e-4 || Math.abs(curvePath[i].y - Lref.pts[i].y) > 1e-4) { pintaOk = false; break; } } }
ok(pintaOk, 'canvas: cada ponto da curva == volemiaLayout(engine)');
ok((rec.__rects || []).filter(function (q) { return q.op === 'fill'; }).length >= 1, 'canvas: marcador pintado');

ok(doc.getElementById('out-fena').textContent !== '—', 'lab: out-fena preenchido no init');
ok(doc.getElementById('out-aldo').textContent !== '—', 'lab: out-aldo preenchido no init');
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
