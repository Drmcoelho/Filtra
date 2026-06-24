'use strict';
/*
 * FILTRA · M22 — validador jsdom (portão do §6)
 * estrutura · engine ≡ UI (hdi, ktOverV, concAt, clearanceParaAlvo, ureaCurveLayout) ·
 * a curva de ureia pintada no canvas ≡ ureaCurveLayout() · caso ≥5 · trilha ≥9 · dois bancos
 * (ilustrado SVG/raster + textual) · figura viva ≥8 · cromo · disclaimer.
 * M22 prescreve em mL/min, h e Kt/V (não mg) — a guarda PROÍBE massa solta (mg/mcg/µg) §8.
 */
var fs = require('fs');
var path = require('path');
var jsdom = require('jsdom');
var JSDOM = jsdom.JSDOM;

var ref = require('./model22.js');
var imgGuard = require('../lib/img-guard.js');

var oks = 0, fail = 0;
function ok(c, m) { if (c) { oks++; } else { fail++; console.error('FALHA: ' + m); } }

var htmlPath = path.join(__dirname, '..', '..', 'filtra22.html');
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
  'urea-canvas', 'in-c0', 'in-k', 'in-v', 'in-t',
  'out-ktv', 'out-urr', 'out-ct', 'out-cmean', 'out-cteq', 'out-ef', 'out-desac',
  'veredito', 'instr-pearl', 'lab-pearl', 'fig-caso',
  'tutor-q', 'tutor-opts', 'tutor-fb', 'tutor-score', 'tutor-total', 'tutor-fig',
  'draw-gradiente', 'draw-cinetica', 'draw-eficiencia', 'draw-rebote'
];
ids.forEach(function (id) { ok(doc.getElementById(id) !== null, 'estrutura: #' + id + ' presente'); });
ok(doc.querySelectorAll('#tabs button').length === 6, 'estrutura: 6 abas');
ok(doc.getElementById('urea-canvas').tagName.toLowerCase() === 'canvas', 'instrumento: canvas urea-canvas');

// Conceito
ok(doc.querySelectorAll('#tab-conceito svg').length >= 5, 'Conceito: ≥5 desenhos computados');
var conc = doc.getElementById('tab-conceito').textContent;
ok(/difus/i.test(conc), 'Conceito: difusão por gradiente');
ok(/Kt\/V/.test(conc), 'Conceito: Kt/V');
ok(/exp\(−Kt\/V\)|C₀·exp|C\(t\)/.test(conc), 'Conceito: fórmula C(t)=C₀·exp(−Kt/V)');
ok(/URR/.test(conc), 'Conceito: URR');
ok(/dente de serra|intermitente/i.test(conc), 'Conceito: dente de serra / custo do intermitente');
ok(/rebote/i.test(conc), 'Conceito: rebote pós-diálise');
ok(/homeostas/i.test(doc.getElementById('tab-trilha').textContent + conc), 'Conceito/Trilha: homeostasia como conceito-fio');

// caso ≥5 + trilha ≥9
ok(doc.querySelectorAll('button.act[data-rev]').length >= 5, 'caso: ≥5 atos');
ok(doc.querySelectorAll('#caso .reveal').length >= 5, 'caso: ≥5 reveláveis');
ok(doc.querySelector('#fig-caso svg') !== null, 'Caso: ilustração SVG');
ok(doc.querySelectorAll('#trilha details').length >= 9, 'trilha: ≥9 passos');

// engine ≡ UI
ok(typeof win.hdi === 'function', 'UI expõe hdi()');
ok(typeof win.ktOverV === 'function', 'UI expõe ktOverV()');
ok(typeof win.concAt === 'function', 'UI expõe concAt()');
ok(typeof win.clearanceParaAlvo === 'function', 'UI expõe clearanceParaAlvo()');
ok(typeof win.ureaCurveLayout === 'function', 'UI expõe ureaCurveLayout()');
var amostras = [
  {}, { t: 2, K: 420 }, { t: 6, K: 140 }, { K: 120 }, { V: 60 }, { c0: 140, t: 3.5 },
  { K: 'x', V: null, t: -2, c0: NaN }, { reboteFrac: 0.2, K: 350 }
];
var divC = 0;
amostras.forEach(function (a) { if (JSON.stringify(win.hdi(a)) !== JSON.stringify(ref.hdi(a))) divC++; });
ok(divC === 0, 'engine ≡ UI: hdi inline idêntico ao model22.js (' + divC + ' divergências)');
var divK = 0;
[[210, 4, 42], [420, 2, 42], [120, 4, 42], [160, 6, 55]].forEach(function (t) {
  if (Math.abs(win.ktOverV(t[0], t[1], t[2]) - ref.ktOverV(t[0], t[1], t[2])) > 1e-12) divK++;
});
ok(divK === 0, 'ktOverV ≡ UI (' + divK + ' divergências)');
ok(Math.abs(win.concAt(80, 210, 42, 4) - ref.concAt(80, 210, 42, 4)) < 1e-9, 'concAt ≡ UI');
ok(Math.abs(win.clearanceParaAlvo(1.2, 2, 42) - ref.clearanceParaAlvo(1.2, 2, 42)) < 1e-9, 'clearanceParaAlvo ≡ UI');
var divL = 0;
amostras.forEach(function (a) { if (JSON.stringify(win.ureaCurveLayout(a, 900, 360)) !== JSON.stringify(ref.ureaCurveLayout(a, 900, 360))) divL++; });
ok(divL === 0, 'ureaCurveLayout ≡ UI (' + divL + ' divergências)');

// canvas curva == ureaCurveLayout(engine)
var canvasEl = doc.getElementById('urea-canvas');
var rec = canvasEl.getContext('2d');
ok(rec && Array.isArray(rec.__paths), 'canvas: contexto exercido');
var initState = { c0: 80, K: 210, V: 42, t: 4 };
var Lref = ref.ureaCurveLayout(initState, canvasEl.width, canvasEl.height);
var curvePath = null;
(rec.__paths || []).forEach(function (p) { if (p.length === Lref.pts.length && p[0] && Math.abs(p[0].y - Lref.pts[0].y) < 1e-4) curvePath = p; });
ok(curvePath !== null, 'canvas: polilinha da curva de ureia pintada (' + Lref.pts.length + ' pontos)');
var pintaOk = true;
if (curvePath) { for (var i = 0; i < Lref.pts.length; i++) { var pp = curvePath[i]; if (Math.abs(pp.x - Lref.pts[i].x) > 1e-6 || Math.abs(pp.y - Lref.pts[i].y) > 1e-6) { pintaOk = false; break; } } }
ok(pintaOk, 'canvas: cada ponto da curva == ureaCurveLayout(engine) (1e-6)');
ok((rec.__rects || []).filter(function (q) { return q.op === 'fill'; }).length >= 1, 'canvas: marcador pintado');

// Lab init
ok(doc.getElementById('out-ktv').textContent !== '—', 'lab: out-ktv preenchido no init');
ok(doc.getElementById('out-urr').textContent !== '—', 'lab: out-urr preenchido no init');
ok(doc.getElementById('out-cmean').textContent !== '—', 'lab: out-cmean preenchido no init');
ok(doc.getElementById('veredito').textContent.length > 1, 'lab: veredito computado');
ok(doc.getElementById('lab-pearl').textContent.length > 1, 'lab: pérola computada');
ok(doc.querySelectorAll('.presets button[data-preset]').length >= 5, 'lab: ≥5 presets');

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
ok(/módulo M22/.test(doc.querySelector('.kicker') ? doc.querySelector('.kicker').textContent : ''), 'cromo: kicker módulo M22');
ok(doc.querySelector('nav.hex .ativo') !== null, 'cromo: hexápode ativo');
ok(/FILTRA/.test(doc.querySelector('nav.hex .ativo') ? doc.querySelector('nav.hex .ativo').textContent : ''), 'cromo: FILTRA ativo');
ok(/CRM-SP 151\.318 · Dr\. Matheus M\. Coelho · Limeira/.test(body), 'cromo: rodapé');
ok(doc.querySelector('a[href="dialisa.html"]') !== null || doc.querySelector('a[href="filtra.html"]') !== null, 'cromo: backlink');
ok(/educacional/i.test(body) && doc.querySelector('.disc') !== null, 'disclaimer educacional');

// guarda §8: prescreve em mL/min, h, Kt/V — NÃO em massa solta (mg/mcg/µg)
ok(!/\b\d+\s?(mg|mcg|µg)\b(?!\/)/.test(body), 'guarda §8: sem dose de massa solta (mg/mcg/µg)');
ok(/mL\/min/.test(body) && /Kt\/V/.test(body), 'guarda §8: prescrição em mL/min e Kt/V presente');

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
