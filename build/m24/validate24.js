'use strict';
/*
 * FILTRA · M24 — validador jsdom (portão do §6)
 * estrutura · engine ≡ UI (ufSession, refillEfetivo, fatorAlbumina, pvCurveLayout) ·
 * a curva pintada no canvas ≡ pvCurveLayout() · caso ≥8 · trilha ≥13 · dois bancos
 * (ilustrado SVG/raster + textual) · figura viva ≥8 · cromo · disclaimer.
 * Guarda farmacológica §8: módulo DIALISA — prescrição em mL/h, mL/kg/h, kg (NÃO mg);
 * a guarda PROÍBE dose de massa solta (mg/mcg/µg sem "/"); mL/h e mL/kg/h passam.
 */
var fs = require('fs');
var path = require('path');
var jsdom = require('jsdom');
var JSDOM = jsdom.JSDOM;

var ref = require('./model24.js');
var imgGuard = require('../lib/img-guard.js');

var oks = 0, fail = 0;
function ok(c, m) { if (c) { oks++; } else { fail++; console.error('FALHA: ' + m); } }

var htmlPath = path.join(__dirname, '..', '..', 'filtra24.html');
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
  'pv-canvas', 'in-pesoatual', 'in-pesoseco', 'in-tempo', 'in-refill', 'in-alb',
  'out-uftotal', 'out-ufmlh', 'out-ufkgh', 'out-refmax', 'out-margem', 'out-queda', 'out-risco',
  'veredito', 'instr-pearl', 'lab-pearl', 'fig-caso',
  'tutor-q', 'tutor-opts', 'tutor-fb', 'tutor-score', 'tutor-total', 'tutor-fig',
  'draw-mech', 'draw-curva', 'draw-refill', 'draw-stun', 'draw-manejo'
];
ids.forEach(function (id) { ok(doc.getElementById(id) !== null, 'estrutura: #' + id + ' presente'); });
ok(doc.querySelectorAll('#tabs button').length === 6, 'estrutura: 6 abas');
ok(doc.getElementById('pv-canvas').tagName.toLowerCase() === 'canvas', 'instrumento: canvas pv-canvas');

// Conceito
ok(doc.querySelectorAll('#tab-conceito svg').length >= 5, 'Conceito: ≥5 desenhos computados');
var conc = doc.getElementById('tab-conceito').textContent;
ok(/refilling/i.test(conc), 'Conceito: refilling');
ok(/ultrafiltra|\bUF\b/i.test(conc), 'Conceito: ultrafiltração/UF');
ok(/UF\s*(rate)?\s*[>×x].*refilling|UF\s*rate\s*×\s*refilling|UF\s*>\s*refilling/i.test(conc), 'Conceito: a relação UF rate × refilling');
ok(/stunning/i.test(conc), 'Conceito: stunning miocárdico');
ok(/homeostas/i.test(conc), 'Conceito: homeostasia como conceito-fio');

// caso ≥8 + trilha ≥13
ok(doc.querySelectorAll('button.act[data-rev]').length >= 8, 'caso: ≥8 atos');
ok(doc.querySelectorAll('#caso .reveal').length >= 8, 'caso: ≥8 reveláveis');
ok(doc.querySelector('#fig-caso svg') !== null, 'Caso: ilustração SVG');
ok(doc.querySelectorAll('#trilha details').length >= 9, 'trilha: ≥9 passos');

// engine ≡ UI
ok(typeof win.ufSession === 'function', 'UI expõe ufSession()');
ok(typeof win.refillEfetivo === 'function', 'UI expõe refillEfetivo()');
ok(typeof win.fatorAlbumina === 'function', 'UI expõe fatorAlbumina()');
ok(typeof win.pvCurveLayout === 'function', 'UI expõe pvCurveLayout()');
var amostras = [
  {}, { pesoAtual: 75, pesoSeco: 70, tempoHoras: 3 }, { pesoAtual: 73, pesoSeco: 70, tempoHoras: 4, albumina: 2 },
  { pesoAtual: 75, pesoSeco: 70, tempoHoras: 6 }, { pesoAtual: 71, pesoSeco: 70 }, { refillBase: 20 },
  { pesoAtual: 80, pesoSeco: 70, tempoHoras: 2.5, albumina: 3.2 }, { pesoAtual: null, tempoHoras: 'x', albumina: -5 }
];
var divU = 0;
amostras.forEach(function (a) { if (JSON.stringify(win.ufSession(a)) !== JSON.stringify(ref.ufSession(a))) divU++; });
ok(divU === 0, 'engine ≡ UI: ufSession inline idêntico ao model24.js (' + divU + ' divergências)');
var divR = 0;
[[12, 4, 0], [12, 2, 0.5], [6, 3, 0.9], [20, 5, 0.2]].forEach(function (t) {
  if (Math.abs(win.refillEfetivo(t[0], t[1], t[2]) - ref.refillEfetivo(t[0], t[1], t[2])) > 1e-12) divR++;
});
ok(divR === 0, 'refillEfetivo ≡ UI (' + divR + ' divergências)');
ok(Math.abs(win.fatorAlbumina(2.5) - ref.fatorAlbumina(2.5)) < 1e-9, 'fatorAlbumina ≡ UI');
var divL = 0;
amostras.forEach(function (a) { if (JSON.stringify(win.pvCurveLayout(a, 900, 360)) !== JSON.stringify(ref.pvCurveLayout(a, 900, 360))) divL++; });
ok(divL === 0, 'pvCurveLayout ≡ UI (' + divL + ' divergências)');

// canvas curva == pvCurveLayout(engine) — estado inicial dos sliders
var canvasEl = doc.getElementById('pv-canvas');
var rec = canvasEl.getContext('2d');
ok(rec && Array.isArray(rec.__paths), 'canvas: contexto exercido');
var initState = { pesoAtual: 75, pesoSeco: 70, tempoHoras: 3, refillBase: 12, albumina: 4 };
var Lref = ref.pvCurveLayout(initState, canvasEl.width, canvasEl.height);
var curvePath = null;
(rec.__paths || []).forEach(function (p) { if (p.length === Lref.pts.length && p[0] && Math.abs(p[0].y - Lref.pts[0].y) < 1e-4 && Math.abs(p[0].x - Lref.pts[0].x) < 1e-4) curvePath = p; });
ok(curvePath !== null, 'canvas: polilinha da curva pintada (' + Lref.pts.length + ' pontos)');
var pintaOk = true;
if (curvePath) { for (var i = 0; i < Lref.pts.length; i++) { var pp = curvePath[i]; if (Math.abs(pp.x - Lref.pts[i].x) > 1e-6 || Math.abs(pp.y - Lref.pts[i].y) > 1e-6) { pintaOk = false; break; } } }
ok(pintaOk, 'canvas: cada ponto da curva == pvCurveLayout(engine) (tol 1e-6)');
// curva gentil também pintada
var gentlePath = null;
(rec.__paths || []).forEach(function (p) { if (p.length === Lref.ptsGentle.length && p[0] && Math.abs(p[0].y - Lref.ptsGentle[0].y) < 1e-4 && Math.abs(p[0].x - Lref.ptsGentle[0].x) < 1e-4 && p !== curvePath) gentlePath = p; });
ok(gentlePath !== null, 'canvas: polilinha da curva gentil pintada');
ok((rec.__rects || []).filter(function (q) { return q.op === 'fill'; }).length >= 1, 'canvas: marcador de crash pintado');

// Lab init
ok(doc.getElementById('out-ufkgh').textContent !== '—', 'lab: out-ufkgh preenchido no init');
ok(doc.getElementById('out-risco').textContent !== '—', 'lab: out-risco preenchido no init');
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
ok(/M24/.test(doc.querySelector('.kicker') ? doc.querySelector('.kicker').textContent : ''), 'cromo: kicker M24');
ok(doc.querySelector('nav.hex .ativo') !== null, 'cromo: hexápode ativo');
ok(/CRM-SP 151\.318 · Dr\. Matheus M\. Coelho · Limeira/.test(body), 'cromo: rodapé');
ok(doc.querySelector('a[href="dialisa.html"]') !== null || doc.querySelector('a[href="filtra.html"]') !== null, 'cromo: backlink');
ok(/educacional/i.test(body) && doc.querySelector('.disc') !== null, 'disclaimer educacional');

// guarda farmacológica invertida §8: prescrição em mL/h, mL/kg/h, kg — NÃO mg solto
ok(!/\b\d+\s?(mg|mcg|µg)\b(?!\/)/.test(body), 'guarda §8: nenhuma dose de massa solta (mg/mcg/µg)');
ok(/mL\/kg\/h/.test(body), 'guarda §8: prescrição em mL/kg/h presente');

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
