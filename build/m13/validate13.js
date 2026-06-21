'use strict';
/*
 * FILTRA · M13 — validador jsdom (portão do §6)
 * estrutura · engine ≡ UI (acidbase, phFrom, hco3FromPhPco2, acidbaseLayout) · isóbaras do Davenport
 * pintadas ≡ acidbaseLayout() · caso ≥8 · trilha ≥13 · dois bancos · figura viva ≥8 · cromo.
 * M13 é fisiologia ácido-base (sem dose mg) — sem guarda farmacológica.
 */
var fs = require('fs');
var path = require('path');
var jsdom = require('jsdom');
var JSDOM = jsdom.JSDOM;

var ref = require('./model13.js');
var imgGuard = require('../lib/img-guard.js');

var oks = 0, fail = 0;
function ok(c, m) { if (c) { oks++; } else { fail++; console.error('FALHA: ' + m); } }

var htmlPath = path.join(__dirname, '..', '..', 'filtra13.html');
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
  'ab-canvas', 'in-na', 'in-cl', 'in-hco3', 'in-paco2', 'in-alb',
  'out-ph', 'out-ag', 'out-agc', 'out-winter', 'out-dd', 'out-dx',
  'veredito', 'instr-pearl', 'lab-pearl', 'fig-caso',
  'tutor-q', 'tutor-opts', 'tutor-fb', 'tutor-score', 'tutor-total', 'tutor-fig',
  'draw-gap', 'draw-delta', 'draw-davenport'
];
ids.forEach(function (id) { ok(doc.getElementById(id) !== null, 'estrutura: #' + id + ' presente'); });
ok(doc.querySelectorAll('#tabs button').length === 6, 'estrutura: 6 abas');
ok(doc.getElementById('ab-canvas').tagName.toLowerCase() === 'canvas', 'instrumento: canvas ab-canvas');

ok(doc.querySelectorAll('#tab-conceito svg').length >= 3, 'Conceito: ≥3 desenhos computados');
var conc = doc.getElementById('tab-conceito').textContent;
ok(/HCO₃|bicarbonato/i.test(conc), 'Conceito: bicarbonato');
ok(/ânion gap|anion gap/i.test(conc), 'Conceito: ânion gap');
ok(/delta-delta|Δ-Δ/i.test(conc), 'Conceito: delta-delta');
ok(/amoniog|NH₄/i.test(conc), 'Conceito: amoniogênese/NH4');
ok(/homeostas/i.test(conc), 'Conceito: homeostasia como conceito-fio');

ok(doc.querySelectorAll('button.act[data-rev]').length >= 8, 'caso: ≥8 atos');
ok(doc.querySelectorAll('#caso .reveal').length >= 8, 'caso: ≥8 reveláveis');
ok(doc.querySelector('#fig-caso svg') !== null, 'Caso: ilustração SVG');
ok(doc.querySelectorAll('#trilha details').length >= 13, 'trilha: ≥13 passos');

ok(typeof win.acidbase === 'function', 'UI expõe acidbase()');
ok(typeof win.phFrom === 'function', 'UI expõe phFrom()');
ok(typeof win.acidbaseLayout === 'function', 'UI expõe acidbaseLayout()');
var amostras = [
  {}, { HCO3: 8, PaCO2: 20 }, { Na: 138, Cl: 115, HCO3: 14, PaCO2: 30 }, { HCO3: 34, PaCO2: 65 },
  { Na: 145, Cl: 85, HCO3: 20, PaCO2: 34 }, { Na: 138, Cl: 100, HCO3: 11, PaCO2: 24, albumin: 2.5 },
  { albumin: 2, Na: 140, Cl: 110, HCO3: 18 }, { Na: null, Cl: 'x', HCO3: NaN, PaCO2: Infinity, albumin: -3 }
];
var divA = 0;
amostras.forEach(function (a) { if (JSON.stringify(win.acidbase(a)) !== JSON.stringify(ref.acidbase(a))) divA++; });
ok(divA === 0, 'engine ≡ UI: acidbase inline idêntico ao model13.js (' + divA + ' divergências)');
var divP = 0;
[[24, 40], [12, 30], [34, 65]].forEach(function (t) { if (Math.abs(win.phFrom(t[0], t[1]) - ref.phFrom(t[0], t[1])) > 1e-12) divP++; });
ok(divP === 0, 'phFrom ≡ UI (' + divP + ' divergências)');
var divL = 0;
amostras.forEach(function (a) { if (JSON.stringify(win.acidbaseLayout(a, 900, 380)) !== JSON.stringify(ref.acidbaseLayout(a, 900, 380))) divL++; });
ok(divL === 0, 'acidbaseLayout ≡ UI (' + divL + ' divergências)');

var canvasEl = doc.getElementById('ab-canvas');
var rec = canvasEl.getContext('2d');
ok(rec && Array.isArray(rec.__paths), 'canvas: contexto exercido');
var initState = { Na: 140, Cl: 104, HCO3: 24, PaCO2: 40, albumin: 4.0 };
var Lref = ref.acidbaseLayout(initState, canvasEl.width, canvasEl.height);
var iso40 = Lref.isobars[1]; // pco2 40
var isoPath = null;
(rec.__paths || []).forEach(function (p) { if (p.length === iso40.pts.length && p[0] && Math.abs(p[0].x - iso40.pts[0].x) < 1e-4 && Math.abs(p[0].y - iso40.pts[0].y) < 1e-4) isoPath = p; });
ok(isoPath !== null, 'canvas: isóbara PCO₂ 40 pintada (' + iso40.pts.length + ' pontos)');
var pintaOk = true;
if (isoPath) { for (var i = 0; i < iso40.pts.length; i++) { if (Math.abs(isoPath[i].x - iso40.pts[i].x) > 1e-4 || Math.abs(isoPath[i].y - iso40.pts[i].y) > 1e-4) { pintaOk = false; break; } } }
ok(pintaOk, 'canvas: cada ponto da isóbara == acidbaseLayout(engine)');
var marcou = (rec.__arcs || []).some(function (a) { return Math.abs(a.x - Lref.current.x) < 1e-4 && Math.abs(a.y - Lref.current.y) < 1e-4; });
ok(marcou, 'canvas: marcador no ponto atual (pH, HCO₃)');
ok((rec.__rects || []).filter(function (q) { return q.op === 'fill'; }).length >= 1, 'canvas: caixa normal pintada');

ok(doc.getElementById('out-ph').textContent !== '—', 'lab: out-ph preenchido no init');
ok(doc.getElementById('out-ag').textContent !== '—', 'lab: out-ag preenchido no init');
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
