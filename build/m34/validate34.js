'use strict';
/*
 * FILTRA · M34 — validador jsdom (portão do §6)
 * estrutura · engine ≡ UI (dds, ureiaSangue, ureiaCerebro, gradienteOsm, tauCerebro,
 *   ddsCurveLayout, edemaSweepLayout) · a curva edema×k pintada no canvas ≡ edemaSweepLayout() ·
 * caso ≥5 · trilha ≥9 · dois bancos (ilustrado SVG/raster + textual) · figura viva ≥8 ·
 * cromo · disclaimer · ROBUSTEZ REFORÇADA: ≥200 entradas malignas recomputadas engine≡UI finitas.
 * M34 prescreve em mL/min, h, %, mOsm e k(h⁻¹) — a guarda PROÍBE massa solta (mg/mcg/µg) §8.
 */
var fs = require('fs');
var path = require('path');
var jsdom = require('jsdom');
var JSDOM = jsdom.JSDOM;

var ref = require('./model34.js');
var imgGuard = require('../lib/img-guard.js');

var oks = 0, fail = 0;
function ok(c, m) { if (c) { oks++; } else { fail++; console.error('FALHA: ' + m); } }
function fin(x) { return typeof x === 'number' && isFinite(x); }

var htmlPath = path.join(__dirname, '..', '..', 'filtra34.html');
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
  'edema-canvas', 'in-bun', 'in-k', 'in-t', 'in-bbb',
  'out-queda', 'out-bblood', 'out-bbrain', 'out-gpico', 'out-tau', 'out-edema', 'out-risco',
  'veredito', 'instr-pearl', 'lab-pearl', 'fig-caso',
  'tutor-q', 'tutor-opts', 'tutor-fb', 'tutor-score', 'tutor-total', 'tutor-fig',
  'draw-duas', 'draw-osmose', 'draw-sintomas', 'draw-prevencao'
];
ids.forEach(function (id) { ok(doc.getElementById(id) !== null, 'estrutura: #' + id + ' presente'); });
ok(doc.querySelectorAll('#tabs button').length === 6, 'estrutura: 6 abas');
ok(doc.getElementById('edema-canvas').tagName.toLowerCase() === 'canvas', 'instrumento: canvas edema-canvas');

// Conceito
ok(doc.querySelectorAll('#tab-conceito svg').length >= 5, 'Conceito: ≥5 desenhos computados');
var conc = doc.getElementById('tab-conceito').textContent;
ok(/osmose reversa/i.test(conc), 'Conceito: osmose reversa');
ok(/gradiente.*(cérebro|cerebro).*(sangue)|(cérebro|cerebro)[−\-]sangue/i.test(conc), 'Conceito: gradiente cérebro−sangue (a relação no texto)');
ok(/edema/i.test(conc), 'Conceito: edema cerebral');
ok(/barreira hematoencef|BHE/i.test(conc), 'Conceito: barreira hematoencefálica');
ok(/cefaleia|convuls/i.test(conc), 'Conceito: escada de sintomas');
ok(/gentil/i.test(conc), 'Conceito: gentil é seguro (prevenção)');
ok(/homeostas/i.test(conc + doc.getElementById('tab-trilha').textContent), 'Conceito/Trilha: homeostasia como conceito-fio');

// caso ≥5 + trilha ≥9
ok(doc.querySelectorAll('button.act[data-rev]').length >= 5, 'caso: ≥5 atos');
ok(doc.querySelectorAll('#caso .reveal').length >= 5, 'caso: ≥5 reveláveis');
ok(doc.querySelector('#fig-caso svg') !== null, 'Caso: ilustração SVG');
ok(doc.querySelectorAll('#trilha details').length >= 9, 'trilha: ≥9 passos');

// engine ≡ UI
ok(typeof win.dds === 'function', 'UI expõe dds()');
ok(typeof win.ureiaSangue === 'function', 'UI expõe ureiaSangue()');
ok(typeof win.ureiaCerebro === 'function', 'UI expõe ureiaCerebro()');
ok(typeof win.gradienteOsm === 'function', 'UI expõe gradienteOsm()');
ok(typeof win.tauCerebro === 'function', 'UI expõe tauCerebro()');
ok(typeof win.ddsCurveLayout === 'function', 'UI expõe ddsCurveLayout()');
ok(typeof win.edemaSweepLayout === 'function', 'UI expõe edemaSweepLayout()');
var amostras = [
  {}, { bun0: 180, removalRate: 0.9, tempo: 2, primeira: 1, bbb: 0.9 },
  { bun0: 180, removalRate: 0.15, tempo: 6 }, { bun0: 250, removalRate: 0.6 },
  { bbb: 0.1, removalRate: 1.0 }, { bun0: 60, removalRate: 0.3 },
  { bun0: null, removalRate: 'x', tempo: -5, bbb: NaN, primeira: 'sim' }, { primeira: 1, removalRate: 1.2 }
];
var divD = 0;
amostras.forEach(function (a) { if (JSON.stringify(win.dds(a)) !== JSON.stringify(ref.dds(a))) divD++; });
ok(divD === 0, 'engine ≡ UI: dds inline idêntico ao model34.js (' + divD + ' divergências)');
var divS = 0;
[[80, 0.3, 4], [180, 0.9, 2], [250, 0.6, 4], [120, 1.0, 3]].forEach(function (t) {
  if (Math.abs(win.ureiaSangue(t[0], t[1], t[2]) - ref.ureiaSangue(t[0], t[1], t[2])) > 1e-12) divS++;
});
ok(divS === 0, 'ureiaSangue ≡ UI (' + divS + ' divergências)');
var divB = 0;
[[180, 0.9, 2.2, 3], [120, 0.3, 1.6, 4], [250, 0.6, 2.0, 5]].forEach(function (t) {
  if (Math.abs(win.ureiaCerebro(t[0], t[1], t[2], t[3]) - ref.ureiaCerebro(t[0], t[1], t[2], t[3])) > 1e-9) divB++;
});
ok(divB === 0, 'ureiaCerebro ≡ UI (' + divB + ' divergências)');
ok(Math.abs(win.tauCerebro(0.9, 1) - ref.tauCerebro(0.9, 1)) < 1e-12, 'tauCerebro ≡ UI');
ok(Math.abs(win.gradienteOsm(180, 0.9, 2.2, 3) - ref.gradienteOsm(180, 0.9, 2.2, 3)) < 1e-9, 'gradienteOsm ≡ UI');
var divL = 0;
amostras.forEach(function (a) { if (JSON.stringify(win.ddsCurveLayout(a, 900, 360)) !== JSON.stringify(ref.ddsCurveLayout(a, 900, 360))) divL++; });
ok(divL === 0, 'ddsCurveLayout ≡ UI (' + divL + ' divergências)');
var divE = 0;
amostras.forEach(function (a) { if (JSON.stringify(win.edemaSweepLayout(a, 900, 360)) !== JSON.stringify(ref.edemaSweepLayout(a, 900, 360))) divE++; });
ok(divE === 0, 'edemaSweepLayout ≡ UI (' + divE + ' divergências)');

// ROBUSTEZ REFORÇADA: ≥200 entradas malignas recomputadas → engine≡UI finito em TODAS
(function () {
  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  var rnd = mulberry32(0xB34CE), N = 260, bad = 0, naoFinito = 0;
  var MAL = [NaN, Infinity, -Infinity, 1e300, -1e300, '9', 'x', '', {}, [], null, undefined, true];
  function v() { var r = rnd(); if (r < 0.5) return MAL[(rnd() * MAL.length) | 0]; return (rnd() - 0.2) * 340; }
  for (var i = 0; i < N; i++) {
    var inp = { bun0: v(), removalRate: v(), tempo: v(), bbb: v(), primeira: v() };
    var a = win.dds(inp), b = ref.dds(inp);
    if (JSON.stringify(a) !== JSON.stringify(b)) bad++;
    if (!(fin(a.gPico) && fin(a.edemaPct) && fin(a.tau) && fin(a.gradFim) && fin(a.bunBloodFim) && fin(a.bunBrainFim) && fin(a.quedaPct) && fin(a.riscoScore))) naoFinito++;
    var L = win.edemaSweepLayout(inp, 800, 320);
    if (!(Array.isArray(L.pts) && fin(L.current.x) && fin(L.current.y))) naoFinito++;
  }
  ok(bad === 0, 'robustez reforçada: ' + N + ' entradas malignas → engine≡UI (' + bad + ' divergências)');
  ok(naoFinito === 0, 'robustez reforçada: ' + N + ' entradas malignas → todas finitas (' + naoFinito + ' não-finitas)');
})();

// canvas curva edema×k == edemaSweepLayout(engine)
var canvasEl = doc.getElementById('edema-canvas');
var rec = canvasEl.getContext('2d');
ok(rec && Array.isArray(rec.__paths), 'canvas: contexto exercido');
var initState = { bun0: 80, removalRate: 0.3, tempo: 4, bbb: 0.7, primeira: 0 };
var Lref = ref.edemaSweepLayout(initState, canvasEl.width, canvasEl.height);
var curvePath = null;
(rec.__paths || []).forEach(function (p) { if (p.length === Lref.pts.length && p[0] && Math.abs(p[0].y - Lref.pts[0].y) < 1e-4) curvePath = p; });
ok(curvePath !== null, 'canvas: polilinha do edema×k pintada (' + Lref.pts.length + ' pontos)');
var pintaOk = true;
if (curvePath) { for (var i = 0; i < Lref.pts.length; i++) { var pp = curvePath[i]; if (Math.abs(pp.x - Lref.pts[i].x) > 1e-6 || Math.abs(pp.y - Lref.pts[i].y) > 1e-6) { pintaOk = false; break; } } }
ok(pintaOk, 'canvas: cada ponto da curva == edemaSweepLayout(engine) (1e-6)');
ok((rec.__rects || []).filter(function (q) { return q.op === 'fill'; }).length >= 1, 'canvas: marcador pintado');

// Lab init
ok(doc.getElementById('out-queda').textContent !== '—', 'lab: out-queda preenchido no init');
ok(doc.getElementById('out-gpico').textContent !== '—', 'lab: out-gpico preenchido no init');
ok(doc.getElementById('out-edema').textContent !== '—', 'lab: out-edema preenchido no init');
ok(doc.getElementById('out-risco').textContent !== '—', 'lab: out-risco preenchido no init');
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
ok(/módulo M34/.test(doc.querySelector('.kicker') ? doc.querySelector('.kicker').textContent : ''), 'cromo: kicker módulo M34');
ok(doc.querySelector('nav.hex .ativo') !== null, 'cromo: hexápode ativo');
ok(/FILTRA/.test(doc.querySelector('nav.hex .ativo') ? doc.querySelector('nav.hex .ativo').textContent : ''), 'cromo: FILTRA ativo');
ok(/CRM-SP 151\.318 · Dr\. Matheus M\. Coelho · Limeira/.test(body), 'cromo: rodapé');
ok(doc.querySelector('a[href="dialisa.html"]') !== null || doc.querySelector('a[href="filtra.html"]') !== null, 'cromo: backlink');
ok(/educacional/i.test(body) && doc.querySelector('.disc') !== null, 'disclaimer educacional');

// guarda §8: prescreve em mL/min, h, %, mOsm, k(h⁻¹) — NÃO em massa solta (mg/mcg/µg)
ok(!/\b\d+\s?(mg|mcg|µg)\b(?!\/)/.test(body), 'guarda §8: sem dose de massa solta (mg/mcg/µg)');
ok(/h⁻¹|mOsm|%/.test(body), 'guarda §8: prescrição em unidades fisiológicas (h⁻¹, mOsm, %)');

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
