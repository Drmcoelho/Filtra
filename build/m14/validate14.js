'use strict';
/*
 * FILTRA · M14 — validador jsdom (portão do §6)
 * estrutura · engine ≡ UI (endocrino, reninaFrom, endocrinoLayout) · a curva renina×perfusão
 * pintada no canvas ≡ endocrinoLayout() · caso ≥8 · trilha ≥13 · dois bancos (ilustrado SVG/raster
 * + textual) · figura viva ≥8 · cromo · disclaimer.
 * M14 é o rim como GLÂNDULA (RAAS/EPO/vit D) — fisiologia endócrina; a farmacologia do RAAS é o M18.
 * Portanto SEM guarda farmacológica de dose (só gancho IECA/BRA, sem exigência de mg).
 */
var fs = require('fs');
var path = require('path');
var jsdom = require('jsdom');
var JSDOM = jsdom.JSDOM;

var ref = require('./model14.js');
var imgGuard = require('../lib/img-guard.js');

var oks = 0, fail = 0;
function ok(c, m) { if (c) { oks++; } else { fail++; console.error('FALHA: ' + m); } }

var htmlPath = path.join(__dirname, '..', '..', 'filtra14.html');
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
  'renina-canvas', 'in-perf', 'in-nacl', 'in-simp', 'in-eca', 'in-o2', 'in-nef', 'in-pth',
  'out-renina', 'out-angii', 'out-aldo', 'out-efer', 'out-tfg', 'out-k', 'out-epo', 'out-hb', 'out-calcitriol', 'out-ca', 'out-classe',
  'veredito', 'instr-pearl', 'lab-pearl', 'fig-caso',
  'tutor-q', 'tutor-opts', 'tutor-fb', 'tutor-score', 'tutor-total', 'tutor-fig',
  'draw-renina', 'draw-cascata', 'draw-pearl', 'draw-epo', 'draw-calcio'
];
ids.forEach(function (id) { ok(doc.getElementById(id) !== null, 'estrutura: #' + id + ' presente'); });
ok(doc.querySelectorAll('#tabs button').length === 6, 'estrutura: 6 abas');
ok(doc.getElementById('renina-canvas').tagName.toLowerCase() === 'canvas', 'instrumento: canvas renina-canvas');

// Conceito
ok(doc.querySelectorAll('#tab-conceito svg').length >= 3, 'Conceito: ≥3 desenhos computados');
var conc = doc.getElementById('tab-conceito').textContent;
ok(/renina/i.test(conc), 'Conceito: renina');
ok(/angiotensina|ang ii/i.test(conc), 'Conceito: angiotensina');
ok(/aldosterona/i.test(conc), 'Conceito: aldosterona');
ok(/EPO|eritropoetina/i.test(conc), 'Conceito: EPO');
ok(/vitamina d|calcitriol/i.test(conc), 'Conceito: vitamina D');
ok(/homeostas/i.test(conc), 'Conceito: homeostasia como conceito-fio');

// caso ≥8 + trilha ≥13
ok(doc.querySelectorAll('button.act[data-rev]').length >= 8, 'caso: ≥8 atos');
ok(doc.querySelectorAll('#caso .reveal').length >= 8, 'caso: ≥8 reveláveis');
ok(doc.querySelector('#fig-caso svg') !== null, 'Caso: ilustração SVG');
ok(doc.querySelectorAll('#trilha details').length >= 13, 'trilha: ≥13 passos');

// engine ≡ UI
ok(typeof win.endocrino === 'function', 'UI expõe endocrino()');
ok(typeof win.reninaFrom === 'function', 'UI expõe reninaFrom()');
ok(typeof win.endocrinoLayout === 'function', 'UI expõe endocrinoLayout()');
var amostras = [
  {}, { perfusao: 0.4 }, { naclMD: 0.3 }, { simpatico: 2.5 }, { eca: 0.15, perfusao: 0.6 },
  { nefrons: 0.2 }, { o2: 0.5 }, { nefrons: 0.2, pth: 2 },
  { perfusao: null, naclMD: 'x', simpatico: NaN, eca: Infinity, o2: -5, nefrons: 9, pth: 'y' }
];
var divC = 0;
amostras.forEach(function (a) { if (JSON.stringify(win.endocrino(a)) !== JSON.stringify(ref.endocrino(a))) divC++; });
ok(divC === 0, 'engine ≡ UI: endocrino inline idêntico ao model14.js (' + divC + ' divergências)');
var divR = 0;
[[1, 1, 1], [0.4, 1, 1], [1, 0.3, 1], [1, 1, 2.5], [0.5, 0.5, 1.8]].forEach(function (t) {
  if (Math.abs(win.reninaFrom(t[0], t[1], t[2]) - ref.reninaFrom(t[0], t[1], t[2])) > 1e-12) divR++;
});
ok(divR === 0, 'reninaFrom ≡ UI (' + divR + ' divergências)');
var divL = 0;
amostras.forEach(function (a) { if (JSON.stringify(win.endocrinoLayout(a, 900, 360)) !== JSON.stringify(ref.endocrinoLayout(a, 900, 360))) divL++; });
ok(divL === 0, 'endocrinoLayout ≡ UI (' + divL + ' divergências)');

// canvas curva == endocrinoLayout(engine)
var canvasEl = doc.getElementById('renina-canvas');
var rec = canvasEl.getContext('2d');
ok(rec && Array.isArray(rec.__paths), 'canvas: contexto exercido');
var initState = { perfusao: 1, naclMD: 1, simpatico: 1, eca: 1, o2: 1, nefrons: 1, pth: 1 };
var Lref = ref.endocrinoLayout(initState, canvasEl.width, canvasEl.height);
var curvePath = null;
(rec.__paths || []).forEach(function (p) { if (p.length === Lref.pts.length && p[0] && Math.abs(p[0].y - Lref.pts[0].y) < 1e-4) curvePath = p; });
ok(curvePath !== null, 'canvas: polilinha renina×perfusão pintada (' + Lref.pts.length + ' pontos)');
var pintaOk = true;
if (curvePath) { for (var i = 0; i < Lref.pts.length; i++) { var pp = curvePath[i]; if (Math.abs(pp.x - Lref.pts[i].x) > 1e-4 || Math.abs(pp.y - Lref.pts[i].y) > 1e-4) { pintaOk = false; break; } } }
ok(pintaOk, 'canvas: cada ponto da curva == endocrinoLayout(engine)');
ok((rec.__rects || []).filter(function (q) { return q.op === 'fill'; }).length >= 1, 'canvas: marcador pintado');

// Lab init
ok(doc.getElementById('out-renina').textContent !== '—', 'lab: out-renina preenchido no init');
ok(doc.getElementById('out-hb').textContent !== '—', 'lab: out-hb preenchido no init');
ok(doc.getElementById('out-ca').textContent !== '—', 'lab: out-ca preenchido no init');
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

// pontes obrigatórias (M18 / Choca)
ok(/M18/.test(body), 'ponte: M18 (farmacologia do RAAS) citada');
ok(/choca/i.test(body), 'ponte: Choca (vasopressores/V1) citado');

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

// nenhum stub remanescente (os 7 SVGs precisam ter sido reescritos como figuras autorais)
var stubs = ['raas-esquema.svg', 'renina-liberacao.svg', 'angiotensina-ii-acoes.svg', 'aldosterona-sintese.svg', 'adh-vasopressina.svg', 'eritropoetina-rim.svg', 'vitamina-d-ativacao-renal.svg'];
var stubRestante = stubs.filter(function (f) {
  var p = path.join(__dirname, '..', '..', 'assets', 'm14', f);
  if (!fs.existsSync(p)) return true;
  var t = fs.readFileSync(p, 'utf8');
  return /text-anchor="middle" font-size="17" font-weight="bold"/.test(t) || /ícone visual simples/.test(t);
});
ok(stubRestante.length === 0, 'assets: nenhum SVG-stub remanescente (' + stubRestante.join(', ') + ')');

console.log(oks + ' OK · ' + fail + ' falhas');
process.exit(fail > 0 ? 1 : 0);
