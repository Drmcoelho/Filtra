'use strict';
/*
 * FILTRA · M9 — validador jsdom (portão do §6)
 * estrutura · engine ≡ UI (volume, vceFrom, volumeLayout) · a curva FE_Na×VCE pintada
 * no canvas ≡ volumeLayout() · caso ≥8 · trilha ≥13 · dois bancos (ilustrado SVG/raster
 * + textual) · figura viva ≥8 · cromo · disclaimer.
 * M9 é Sódio e volume (VCE, sensores, RAAS/SNS×ANP/BNP, edema, eixos ortogonais) —
 * fisiologia NÃO farmacológica. Portanto SEM guarda farmacológica de dose.
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

// estrutura
var ids = [
  'tabs', 'tab-conceito', 'tab-caso', 'tab-trilha', 'tab-instrumento', 'tab-lab', 'tab-avaliacao',
  'vce-canvas', 'in-ench', 'in-alb', 'in-leak', 'in-nat', 'in-ing', 'in-agua',
  'out-vce', 'out-baro', 'out-raas', 'out-anp', 'out-fena', 'out-una', 'out-ecf', 'out-na', 'out-toni', 'out-disn', 'out-classe',
  'veredito', 'instr-pearl', 'lab-pearl', 'fig-caso',
  'tutor-q', 'tutor-opts', 'tutor-fb', 'tutor-score', 'tutor-total', 'tutor-fig',
  'draw-vce', 'draw-baro', 'draw-efetor', 'draw-anp', 'draw-balanco', 'draw-edema', 'draw-orto'
];
ids.forEach(function (id) { ok(doc.getElementById(id) !== null, 'estrutura: #' + id + ' presente'); });
ok(doc.querySelectorAll('#tabs button').length === 6, 'estrutura: 6 abas');
ok(doc.getElementById('vce-canvas').tagName.toLowerCase() === 'canvas', 'instrumento: canvas vce-canvas');

// Conceito
ok(doc.querySelectorAll('#tab-conceito svg').length >= 3, 'Conceito: ≥3 desenhos computados');
var conc = doc.getElementById('tab-conceito').textContent;
ok(/volume circulante efetivo/i.test(conc), 'Conceito: volume circulante efetivo');
ok(/barorreceptor/i.test(conc), 'Conceito: barorreceptor');
ok(/ANP|BNP/.test(conc), 'Conceito: ANP/BNP');
ok(/edema/i.test(conc), 'Conceito: edema');
ok(/tonicidade/i.test(conc), 'Conceito: tonicidade');
ok(/homeostas/i.test(conc), 'Conceito: homeostasia como conceito-fio');

// caso ≥8 + trilha ≥13
ok(doc.querySelectorAll('button.act[data-rev]').length >= 8, 'caso: ≥8 atos');
ok(doc.querySelectorAll('#caso .reveal').length >= 8, 'caso: ≥8 reveláveis');
ok(doc.querySelector('#fig-caso svg') !== null, 'Caso: ilustração SVG');
ok(doc.querySelectorAll('#trilha details').length >= 13, 'trilha: ≥13 passos');

// engine ≡ UI
ok(typeof win.volume === 'function', 'UI expõe volume()');
ok(typeof win.vceFrom === 'function', 'UI expõe vceFrom()');
ok(typeof win.volumeLayout === 'function', 'UI expõe volumeLayout()');
var amostras = [
  {}, { enchimento: 0.4 }, { albumina: 1.8 }, { leak: 0.5 }, { naTotal: 1.7, ingestaNa: 3 },
  { enchimento: 0.45, naTotal: 1.5, ingestaNa: 2 }, { aguaCorporal: 1.35 }, { aguaCorporal: 0.7 },
  { enchimento: null, albumina: 'x', leak: NaN, naTotal: Infinity, ingestaNa: -5, aguaCorporal: 9 }
];
var divC = 0;
amostras.forEach(function (a) { if (JSON.stringify(win.volume(a)) !== JSON.stringify(ref.volume(a))) divC++; });
ok(divC === 0, 'engine ≡ UI: volume inline idêntico ao model9.js (' + divC + ' divergências)');
var divV = 0;
[[1, 4.4, 0, 1], [0.4, 4.4, 0, 1], [1, 1.8, 0, 1.4], [0.6, 2.2, 0.2, 1.5], [1.1, 4.4, 0, 1.7]].forEach(function (t) {
  if (Math.abs(win.vceFrom(t[0], t[1], t[2], t[3]) - ref.vceFrom(t[0], t[1], t[2], t[3])) > 1e-12) divV++;
});
ok(divV === 0, 'vceFrom ≡ UI (' + divV + ' divergências)');
var divL = 0;
amostras.forEach(function (a) { if (JSON.stringify(win.volumeLayout(a, 900, 360)) !== JSON.stringify(ref.volumeLayout(a, 900, 360))) divL++; });
ok(divL === 0, 'volumeLayout ≡ UI (' + divL + ' divergências)');

// canvas curva == volumeLayout(engine)
var canvasEl = doc.getElementById('vce-canvas');
var rec = canvasEl.getContext('2d');
ok(rec && Array.isArray(rec.__paths), 'canvas: contexto exercido');
var initState = { enchimento: 1, albumina: 4.4, leak: 0, naTotal: 1, ingestaNa: 1, aguaCorporal: 1 };
var Lref = ref.volumeLayout(initState, canvasEl.width, canvasEl.height);
var curvePath = null;
(rec.__paths || []).forEach(function (p) { if (p.length === Lref.pts.length && p[0] && Math.abs(p[0].y - Lref.pts[0].y) < 1e-4) curvePath = p; });
ok(curvePath !== null, 'canvas: polilinha FE_Na×VCE pintada (' + Lref.pts.length + ' pontos)');
var pintaOk = true;
if (curvePath) { for (var i = 0; i < Lref.pts.length; i++) { var pp = curvePath[i]; if (Math.abs(pp.x - Lref.pts[i].x) > 1e-4 || Math.abs(pp.y - Lref.pts[i].y) > 1e-4) { pintaOk = false; break; } } }
ok(pintaOk, 'canvas: cada ponto da curva == volumeLayout(engine)');
ok((rec.__rects || []).filter(function (q) { return q.op === 'fill'; }).length >= 1, 'canvas: marcador pintado');

// Lab init
ok(doc.getElementById('out-vce').textContent !== '—', 'lab: out-vce preenchido no init');
ok(doc.getElementById('out-fena').textContent !== '—', 'lab: out-fena preenchido no init');
ok(doc.getElementById('out-na').textContent !== '—', 'lab: out-na preenchido no init');
ok(doc.getElementById('veredito').textContent.length > 1, 'lab: veredito computado');
ok(doc.getElementById('lab-pearl').textContent.length > 1, 'lab: pérola computada');
ok(doc.querySelectorAll('.presets button[data-preset]').length >= 4, 'lab: ≥4 presets');

// tutor
function malformados(bank) { var n = 0; (bank || []).forEach(function (it) { if (!it || !Array.isArray(it.o) || it.o.length < 2) n++; else if (typeof it.c !== 'number' || it.c < 0 || it.c >= it.o.length) n++; else if (!it.e || String(it.e).length < 3) n++; }); return n; }
var TI = win.TUTOR_ILUSTRADO, TT = win.TUTOR_TEXTUAL;
ok(Array.isArray(TI) && TI.length >= 13, 'tutor: ILUSTRADO ≥13 (tem ' + (TI ? TI.length : 0) + ')');
ok(Array.isArray(TT) && TT.length >= 13, 'tutor: TEXTUAL ≥13 (tem ' + (TT ? TT.length : 0) + ')');
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
ok(/honestidade do modelo/i.test(body), 'disclaimer: nota de honestidade do modelo');

// pontes obrigatórias (M10 / M14 / Choca)
ok(/M10/.test(body), 'ponte: M10 (água/disnatremias) citada');
ok(/choca/i.test(body), 'ponte: Choca (Guyton/ressuscitação volêmica) citado');

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

// nenhum stub remanescente (os 8 SVGs precisam ter sido reescritos como figuras autorais)
var stubs = ['volume-circulante-efetivo.svg', 'barorreceptores.svg', 'balanco-sodio-rim.svg', 'edema-fisiopatologia.svg', 'sns-raas-volume.svg', 'peptideo-natriuretico.svg', 'terceiro-espaco.svg', 'volume-vs-tonicidade.svg'];
var stubRestante = stubs.filter(function (f) {
  var p = path.join(__dirname, '..', '..', 'assets', 'm9', f);
  if (!fs.existsSync(p)) return true;
  var t = fs.readFileSync(p, 'utf8');
  return /text-anchor="middle" font-size="17" font-weight="bold"/.test(t) || /ícone visual simples/.test(t);
});
ok(stubRestante.length === 0, 'assets: nenhum SVG-stub remanescente (' + stubRestante.join(', ') + ')');

console.log(oks + ' OK · ' + fail + ' falhas');
process.exit(fail > 0 ? 1 : 0);
