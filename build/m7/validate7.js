'use strict';
/*
 * FILTRA · M7 — validador jsdom (portão do §6)
 * estrutura · engine ≡ UI (tcd, tcdLayout, emaxModel, caFromBlock) · curva do PARADOXO
 * (FENa × Ca urinário) pintada ≡ tcdLayout() · caso ≥8 · trilha ≥13 · dois bancos ·
 * figura viva ≥8 · cromo. Guarda farmacológica INVERTIDA (§8): EXIGE tiazídicos com
 * dose+unidade (mg) ancorados ao NCC, dose-resposta computada e nota de honestidade.
 */
var fs = require('fs');
var path = require('path');
var jsdom = require('jsdom');
var JSDOM = jsdom.JSDOM;

var ref = require('./model7.js');
var imgGuard = require('../lib/img-guard.js');

var oks = 0, fail = 0;
function ok(c, m) { if (c) { oks++; } else { fail++; console.error('FALHA: ' + m); } }

var htmlPath = path.join(__dirname, '..', '..', 'filtra7.html');
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
  'paradoxo-canvas', 'in-droga', 'in-dose', 'in-gfr', 'in-gitelman', 'in-pth',
  'out-ncc', 'out-k', 'out-ca', 'out-cawl', 'out-fena', 'out-mg', 'out-classe',
  'veredito', 'instr-pearl', 'lab-pearl', 'fig-caso', 'dose-box',
  'tutor-q', 'tutor-opts', 'tutor-fb', 'tutor-score', 'tutor-total', 'tutor-fig',
  'draw-ca', 'draw-dose', 'draw-k', 'draw-paradoxo'
];
ids.forEach(function (id) { ok(doc.getElementById(id) !== null, 'estrutura: #' + id + ' presente'); });
ok(doc.querySelectorAll('#tabs button').length === 6, 'estrutura: 6 abas');
ok(doc.getElementById('paradoxo-canvas').tagName.toLowerCase() === 'canvas', 'instrumento: canvas paradoxo-canvas');

ok(doc.querySelectorAll('#tab-conceito svg').length >= 3, 'Conceito: ≥3 desenhos computados');
var conc = doc.getElementById('tab-conceito').textContent;
ok(/NCC/.test(conc), 'Conceito: NCC');
ok(/tiazíd/i.test(conc), 'Conceito: tiazídico');
ok(/c[aá]lcio|Ca²⁺/i.test(conc) && /paradoxo/i.test(conc), 'Conceito: paradoxo do cálcio');
ok(/homeostas/i.test(conc), 'Conceito: homeostasia como conceito-fio');

ok(doc.querySelectorAll('button.act[data-rev]').length >= 8, 'caso: ≥8 atos');
ok(doc.querySelectorAll('#caso .reveal').length >= 8, 'caso: ≥8 reveláveis');
ok(doc.querySelector('#fig-caso svg') !== null, 'Caso: ilustração SVG');
ok(doc.querySelectorAll('#trilha details').length >= 13, 'trilha: ≥13 passos');

ok(typeof win.tcd === 'function', 'UI expõe tcd()');
ok(typeof win.tcdLayout === 'function', 'UI expõe tcdLayout()');
ok(typeof win.emaxModel === 'function', 'UI expõe emaxModel()');
ok(typeof win.caFromBlock === 'function', 'UI expõe caFromBlock()');
var amostras = [
  {}, { droga: 'hidroclorotiazida', dose: 50 }, { droga: 'clortalidona', dose: 25, gfr: 20 },
  { droga: 'indapamida', dose: 2.5 }, { gitelman: true }, { pth: 2, nccBasal: 0.6 },
  { naDistal: 0.2, droga: 'hidroclorotiazida', dose: 25 }, { droga: 'xyz', dose: -5, gfr: NaN }
];
var divC = 0;
amostras.forEach(function (a) { if (JSON.stringify(win.tcd(a)) !== JSON.stringify(ref.tcd(a))) divC++; });
ok(divC === 0, 'engine ≡ UI: tcd inline idêntico ao model7.js (' + divC + ' divergências)');
var divE = 0;
[0, 6.25, 12.5, 25, 50].forEach(function (d) { if (Math.abs(win.emaxModel(d, 12.5, 0.85) - ref.emaxModel(d, 12.5, 0.85)) > 1e-12) divE++; });
ok(divE === 0, 'emaxModel ≡ UI (' + divE + ' divergências)');
var divB = 0;
[0, 0.3, 0.6, 0.9, 1].forEach(function (b) { if (Math.abs(win.caFromBlock(b) - ref.caFromBlock(b)) > 1e-12) divB++; });
ok(divB === 0, 'caFromBlock ≡ UI (' + divB + ' divergências)');
var divL = 0;
amostras.forEach(function (a) { if (JSON.stringify(win.tcdLayout(a, 900, 360)) !== JSON.stringify(ref.tcdLayout(a, 900, 360))) divL++; });
ok(divL === 0, 'tcdLayout ≡ UI (' + divL + ' divergências)');

var canvasEl = doc.getElementById('paradoxo-canvas');
var rec = canvasEl.getContext('2d');
ok(rec && Array.isArray(rec.__paths), 'canvas: contexto exercido');
var initState = {
  gfr: +doc.getElementById('in-gfr').value, pth: +doc.getElementById('in-pth').value,
  gitelman: doc.getElementById('in-gitelman').checked, droga: doc.getElementById('in-droga').value,
  dose: +doc.getElementById('in-dose').value
};
var Lref = ref.tcdLayout(initState, canvasEl.width, canvasEl.height);
var curve = null;
(rec.__paths || []).forEach(function (p) {
  if (p.length === Lref.ptsFena.length && p[0] && Math.abs(p[0].x - Lref.ptsFena[0].x) < 1e-4 && Math.abs(p[0].y - Lref.ptsFena[0].y) < 1e-4) curve = p;
});
ok(curve !== null, 'canvas: polilinha FENa (paradoxo) pintada (' + Lref.ptsFena.length + ' pontos)');
var pintaOk = true;
if (curve) { for (var i = 0; i < Lref.ptsFena.length; i++) { if (Math.abs(curve[i].x - Lref.ptsFena[i].x) > 1e-4 || Math.abs(curve[i].y - Lref.ptsFena[i].y) > 1e-4) { pintaOk = false; break; } } }
ok(pintaOk, 'canvas: cada ponto da curva == tcdLayout(engine)');
ok((rec.__rects || []).filter(function (q) { return q.op === 'fill'; }).length >= 1, 'canvas: marcador pintado');

ok(doc.getElementById('out-k').textContent !== '—', 'lab: out-k preenchido no init');
ok(doc.getElementById('out-ca').textContent !== '—', 'lab: out-ca preenchido no init');
ok(doc.getElementById('out-ncc').textContent !== '—', 'lab: out-ncc preenchido no init');
ok(doc.getElementById('veredito').textContent.length > 1, 'lab: veredito computado');
ok(doc.getElementById('lab-pearl').textContent.length > 1, 'lab: pérola computada');
ok(doc.querySelectorAll('.presets button[data-preset]').length >= 4, 'lab: ≥4 presets');

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
ok(/hidroclorotiazida/i.test(body), 'farmacologia: hidroclorotiazida citada');
ok(/clortalidona/i.test(body), 'farmacologia: clortalidona citada');
ok(/indapamida/i.test(body), 'farmacologia: indapamida citada');
ok(/gitelman/i.test(body), 'farmacologia: Gitelman (fronteira) citado');
ok(/\b\d+(?:[.,]\d+)?[\s–-]+\d+(?:[.,]\d+)?\s?mg/.test(body) || /\b\d+(?:[.,]\d+)?\s?mg\b/.test(body), 'farmacologia (EXIGIDO): doses com unidade mg presentes');
ok(/NCC/.test(body) && /Na⁺-Cl⁻|Na-Cl|cotransportador/i.test(body), 'farmacologia: mecanismo (NCC, Na⁺-Cl⁻) ancorado');
ok(typeof win.emaxModel === 'function' && /Emax|dose-resposta|emaxModel/i.test(html), 'farmacologia: dose-resposta computada (emaxModel)');
ok(ref.tcd({ droga: 'hidroclorotiazida', dose: 50 }).caUrinario < ref.tcd({}).caUrinario, 'farmacologia: paradoxo (tiazídico ↓ Ca urinário) computado pela dose');
ok(ref.tcd({ droga: 'hidroclorotiazida', dose: 50 }).FENa > ref.tcd({}).FENa, 'farmacologia: natriurese (FENa↑) computada pela dose');

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
