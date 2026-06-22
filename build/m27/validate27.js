'use strict';
/*
 * FILTRA · M27 — validador jsdom (portão do §6) — Terapias contínuas (TRRC/CRRT)
 * estrutura · engine ≡ UI (trrc, clearanceLayout, cvvh, cvvhd, cvvhdf) ·
 * a curva pintada no canvas ≡ clearanceLayout() (tol 1e-6) · caso ≥5 atos · trilha ≥9 ·
 * dois bancos (ilustrado SVG/raster + textual) · figura viva ≥8 · cromo · disclaimer.
 * ROBUSTEZ EXTRA: recomputa ≥200 entradas MALIGNAS e confirma engine≡UI finito em todas.
 * Guarda farmacológica §8 (invertida): módulo DIALISA — sem dose de massa solta (mg/mcg/µg);
 * mEq/L, mL/kg/h, mL/min, mL/h são livres.
 */
var fs = require('fs');
var path = require('path');
var jsdom = require('jsdom');
var JSDOM = jsdom.JSDOM;

var ref = require('./model27.js');
var imgGuard = require('../lib/img-guard.js');

var oks = 0, fail = 0;
function ok(c, m) { if (c) { oks++; } else { fail++; console.error('FALHA: ' + m); } }
function fin(x) { return typeof x === 'number' && isFinite(x); }

var htmlPath = path.join(__dirname, '..', '..', 'filtra27.html');
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

// ---------- estrutura ----------
var ids = [
  'tabs', 'tab-conceito', 'tab-caso', 'tab-trilha', 'tab-instrumento', 'tab-lab', 'tab-avaliacao',
  'clearance-canvas',
  'in-modo', 'in-qb', 'in-qd', 'in-qf', 'in-preFrac', 'in-koa', 'in-hct', 'in-pesoKg', 'in-ufLiquida', 'in-refilling',
  'out-modo', 'out-clear', 'out-comp', 'out-dose', 'out-comparacao', 'out-tolera',
  'veredito', 'instr-pearl', 'lab-pearl', 'fig-caso',
  'tutor-q', 'tutor-opts', 'tutor-fb', 'tutor-score', 'tutor-total', 'tutor-fig',
  'draw-cvvh', 'draw-cvvhd', 'draw-diluicao', 'draw-continuo'
];
ids.forEach(function (id) { ok(doc.getElementById(id) !== null, 'estrutura: #' + id + ' presente'); });
ok(doc.querySelectorAll('#tabs button').length === 6, 'estrutura: 6 abas');
ok(doc.getElementById('clearance-canvas').tagName.toLowerCase() === 'canvas', 'instrumento: canvas clearance-canvas');

// ---------- Conceito ----------
ok(doc.querySelectorAll('#tab-conceito svg').length >= 5, 'Conceito: ≥5 desenhos computados');
var conc = doc.getElementById('tab-conceito').textContent;
ok(/convec/i.test(conc), 'Conceito: convecção (CVVH)');
ok(/difus/i.test(conc), 'Conceito: difusão (CVVHD)');
ok(/CVVHDF/.test(conc), 'Conceito: CVVHDF (os dois)');
ok(/mecanismo|física|fisica/i.test(conc), 'Conceito: a física/mecanismo');
ok(/refilling/i.test(conc) || /tolerância|tolerancia/i.test(conc), 'Conceito: UF × refilling (tolerância)');
ok(/cont[íi]nuo/i.test(conc), 'Conceito: o "contínuo"');
ok(/pr[ée]\s*-?\s*diluiç|pós\s*-?\s*diluiç|pre|pos/i.test(conc), 'Conceito: pré × pós-diluição');
ok(/efluente/i.test(conc), 'Conceito: dose de efluente');
ok(/homeostas/i.test(doc.body.textContent), 'Conceito: homeostasia como conceito-fio');

// ---------- caso ≥5 + trilha ≥9 ----------
ok(doc.querySelectorAll('button.act[data-rev]').length >= 5, 'caso: ≥5 atos');
ok(doc.querySelectorAll('#caso .reveal').length >= 5, 'caso: ≥5 reveláveis');
ok(doc.querySelector('#fig-caso svg') !== null, 'Caso: ilustração SVG');
ok(doc.querySelectorAll('#trilha details').length >= 9, 'trilha: ≥9 passos');

// ---------- engine ≡ UI ----------
ok(typeof win.trrc === 'function', 'UI expõe trrc()');
ok(typeof win.clearanceLayout === 'function', 'UI expõe clearanceLayout()');
ok(typeof win.cvvh === 'function' && typeof win.cvvhd === 'function' && typeof win.cvvhdf === 'function', 'UI expõe cvvh/cvvhd/cvvhdf()');
var amostras = [
  {}, { modo: 'CVVH', qf: 35, preFrac: 0.3 }, { modo: 'CVVHD', qd: 30, koa: 600 },
  { modo: 'CVVHDF', qd: 25, qf: 25, preFrac: 0.3, hct: 0.30, qb: 180 },
  { modo: 'CVVH', qf: 45, preFrac: 0.6, hct: 0.40 }, { modo: 'CVVH', qf: 45, preFrac: 0, hct: 0.30, qb: 120 },
  { modo: 'CVVHDF', ufLiquida: 550, refilling: 300 }, { modo: 'CVVHD', qd: 60, koa: 1200 },
  { modo: 'lixo', qb: null, qd: 'x', qf: -2, preFrac: 1e9, koa: NaN, hct: Infinity, pesoKg: -5, ufLiquida: 1e300, refilling: 'z' }
];
var divC = 0;
amostras.forEach(function (a) { if (JSON.stringify(win.trrc(a)) !== JSON.stringify(ref.trrc(a))) divC++; });
ok(divC === 0, 'engine ≡ UI: trrc inline idêntico ao model27.js (' + divC + ' divergências)');
var divH = 0;
[[0, 35, 0.3, 120], [40, 0, 0, 100], [60, 1, 0.6, 80], [25, 1, 0, 200]].forEach(function (t) {
  if (Math.abs(win.cvvh({ qf: t[0], sieving: t[1], preFrac: t[2], qPlasma: t[3] }) - ref.cvvh({ qf: t[0], sieving: t[1], preFrac: t[2], qPlasma: t[3] })) > 1e-12) divH++;
});
ok(divH === 0, 'cvvh ≡ UI (' + divH + ' divergências)');
var divD = 0;
[[0, 600, 1], [30, 1200, 1], [40, 200, 1], [60, 600, 0.8]].forEach(function (t) {
  if (Math.abs(win.cvvhd({ qd: t[0], koa: t[1], sieving: t[2] }) - ref.cvvhd({ qd: t[0], koa: t[1], sieving: t[2] })) > 1e-12) divD++;
});
ok(divD === 0, 'cvvhd ≡ UI (' + divD + ' divergências)');
var divL = 0;
amostras.forEach(function (a) { if (JSON.stringify(win.clearanceLayout(a, 900, 360)) !== JSON.stringify(ref.clearanceLayout(a, 900, 360))) divL++; });
ok(divL === 0, 'clearanceLayout ≡ UI (' + divL + ' divergências)');

// ---------- ROBUSTEZ EXTRA: ≥200 entradas malignas → engine≡UI finito em TODAS ----------
(function () {
  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  var rnd = mulberry32(0x27C0DE), N = 240, div = 0, naoFin = 0;
  var MAL = [NaN, Infinity, -Infinity, 1e300, -1e300, '5', 'x', '', null, undefined, {}, [], true];
  var MODOS = ['CVVH', 'CVVHD', 'CVVHDF', 'lixo', undefined];
  function v() { if (rnd() < 0.55) return MAL[(rnd() * MAL.length) | 0]; return (rnd() - 0.25) * 500; }
  for (var i = 0; i < N; i++) {
    var inp = { modo: MODOS[(rnd() * MODOS.length) | 0], qb: v(), qd: v(), qf: v(), preFrac: v(), koa: v(), hct: v(), pesoKg: v(), ufLiquida: v(), refilling: v() };
    var a = win.trrc(inp), b = ref.trrc(inp);
    if (JSON.stringify(a) !== JSON.stringify(b)) div++;
    if (!fin(a.clearanceTotal) || !fin(a.clDif) || !fin(a.clConv) || !fin(a.doseEfluente) || !fin(a.margemRefilling) || !fin(a.razaoDose24h) || !fin(a.qPlasma)) naoFin++;
    if (['CVVH', 'CVVHD', 'CVVHDF'].indexOf(a.modo) < 0) naoFin++;
    var L = win.clearanceLayout(inp, 900, 360);
    if (!fin(L.current.x) || !fin(L.current.y) || !fin(L.current.clearance) || !fin(L.current.fluxo)) naoFin++;
  }
  ok(div === 0, 'robustez extra: ' + N + ' malignas engine≡UI (' + div + ' divergências)');
  ok(naoFin === 0, 'robustez extra: ' + N + ' malignas → saídas finitas/classificadas (' + naoFin + ' inválidas)');
})();

// ---------- canvas curva == clearanceLayout(engine) — estado inicial dos sliders ----------
function slv(id) { return +doc.getElementById(id).value; }
var initState = {
  modo: doc.getElementById('in-modo').value,
  qb: slv('in-qb'), qd: slv('in-qd'), qf: slv('in-qf'), preFrac: slv('in-preFrac'),
  koa: slv('in-koa'), hct: slv('in-hct'), pesoKg: slv('in-pesoKg'),
  ufLiquida: slv('in-ufLiquida'), refilling: slv('in-refilling')
};
var canvasEl = doc.getElementById('clearance-canvas');
var rec = canvasEl.getContext('2d');
ok(rec && Array.isArray(rec.__paths), 'canvas: contexto exercido');
var Lref = ref.clearanceLayout(initState, canvasEl.width, canvasEl.height);
function acharPoli(ref0) {
  var found = null;
  (rec.__paths || []).forEach(function (p) {
    if (p.length === ref0.length && p[0] && Math.abs(p[0].y - ref0[0].y) < 1e-4 && Math.abs(p[0].x - ref0[0].x) < 1e-4) found = p;
  });
  return found;
}
var clearPath = acharPoli(Lref.pts);
ok(clearPath !== null, 'canvas: curva de clearance pintada (' + Lref.pts.length + ' pontos)');
var pintaOk = true;
if (clearPath) { for (var i = 0; i < Lref.pts.length; i++) { var pp = clearPath[i]; if (Math.abs(pp.x - Lref.pts[i].x) > 1e-6 || Math.abs(pp.y - Lref.pts[i].y) > 1e-6) { pintaOk = false; break; } } }
ok(pintaOk, 'canvas: cada ponto da curva == clearanceLayout(engine) (tol 1e-6)');
ok((rec.__rects || []).filter(function (q) { return q.op === 'fill'; }).length >= 1, 'canvas: marcador de operação pintado');

// ---------- Lab init ----------
ok(doc.getElementById('out-modo').textContent !== '—' && doc.getElementById('out-modo').textContent.length > 1, 'lab: out-modo preenchido no init');
ok(doc.getElementById('out-clear').textContent.length > 1, 'lab: out-clear preenchido no init');
ok(doc.getElementById('out-dose').textContent.length > 1, 'lab: out-dose preenchido no init');
ok(doc.getElementById('veredito').textContent.length > 1, 'lab: veredito computado');
ok(doc.getElementById('lab-pearl').textContent.length > 1, 'lab: pérola computada');
ok(doc.querySelectorAll('.presets button[data-preset]').length >= 4, 'lab: ≥4 presets');

// ---------- tutor ----------
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

// ---------- cromo ----------
var body = doc.body.textContent;
ok(/FILTRA/.test(doc.querySelector('.kicker') ? doc.querySelector('.kicker').textContent : ''), 'cromo: kicker');
ok(/M27/.test(doc.querySelector('.kicker') ? doc.querySelector('.kicker').textContent : ''), 'cromo: kicker M27');
ok(doc.querySelector('nav.hex .ativo') !== null, 'cromo: hexápode ativo');
ok(/FILTRA/.test(doc.querySelector('nav.hex .ativo') ? doc.querySelector('nav.hex .ativo').textContent : ''), 'cromo: FILTRA ativo');
ok(/CRM-SP 151\.318 · Dr\. Matheus M\. Coelho · Limeira/.test(body), 'cromo: rodapé');
ok(doc.querySelector('a[href="dialisa.html"]') !== null || doc.querySelector('a[href="filtra.html"]') !== null, 'cromo: backlink');
ok(/educacional/i.test(body) && doc.querySelector('.disc') !== null, 'disclaimer educacional');

// ---------- guarda farmacológica invertida §8 ----------
ok(!/\b\d+\s?(mg|mcg|µg)\b(?!\/)/.test(body), 'guarda §8: nenhuma dose de massa solta (mg/mcg/µg)');
ok(/mEq\/L/.test(body), 'guarda §8: unidade do meio interno (mEq/L) presente');
ok(/mL\/kg\/h/.test(body) && /mL\/min/.test(body), 'guarda §8: doses de DIÁLISE por mecanismo (mL/kg/h, mL/min)');

// ---------- offline + figura viva ----------
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
