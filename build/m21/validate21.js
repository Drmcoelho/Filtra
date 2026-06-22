'use strict';
/*
 * FILTRA · M21 — validador jsdom (portão do §6) — A MEMBRANA E O CLEARANCE
 * estrutura · engine ≡ UI (membrana, clearanceDialisador, sieving, backfiltration,
 * clearanceLayout) · a curva pintada no canvas ≡ clearanceLayout() (tol 1e-6) ·
 * caso ≥5 atos · trilha ≥9 · dois bancos (ilustrado SVG/raster + textual) ·
 * figura viva ≥8 · cromo · disclaimer.
 * ROBUSTEZ EXTRA: recomputa ≥260 entradas MALIGNAS e confirma engine≡UI finito em todas.
 * Guarda §8 (invertida — módulo DIALISA): sem dose de MASSA solta (mg/mcg/µg); mEq/L,
 * mL/min, mL·min⁻¹·mmHg⁻¹, Da/kDa, mmHg são livres.
 */
var fs = require('fs');
var path = require('path');
var jsdom = require('jsdom');
var JSDOM = jsdom.JSDOM;

var ref = require('./model21.js');
var imgGuard = require('../lib/img-guard.js');

var oks = 0, fail = 0;
function ok(c, m) { if (c) { oks++; } else { fail++; console.error('FALHA: ' + m); } }
function fin(x) { return typeof x === 'number' && isFinite(x); }

var htmlPath = path.join(__dirname, '..', '..', 'filtra21.html');
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
  'clear-canvas',
  'in-koa', 'in-qb', 'in-qd', 'in-highFlux', 'in-cutoff', 'in-tmp',
  'out-classe', 'out-clearUreia', 'out-clearMedio', 'out-sieving', 'out-ganho', 'out-backfilt',
  'veredito', 'instr-pearl', 'lab-pearl', 'fig-caso',
  'tutor-q', 'tutor-opts', 'tutor-fb', 'tutor-score', 'tutor-total', 'tutor-fig',
  'draw-fibras', 'draw-koa', 'draw-clear', 'draw-sieve', 'draw-flux', 'draw-back', 'draw-cutoff'
];
ids.forEach(function (id) { ok(doc.getElementById(id) !== null, 'estrutura: #' + id + ' presente'); });
ok(doc.querySelectorAll('#tabs button').length === 6, 'estrutura: 6 abas');
ok(doc.getElementById('clear-canvas').tagName.toLowerCase() === 'canvas', 'instrumento: canvas clear-canvas');

// ---------- Conceito ----------
ok(doc.querySelectorAll('#tab-conceito svg').length >= 5, 'Conceito: ≥5 desenhos computados');
var conc = doc.getElementById('tab-conceito').textContent;
ok(/KoA/.test(conc), 'Conceito: KoA');
ok(/sieving/i.test(conc), 'Conceito: sieving');
ok(/backfiltration/i.test(conc), 'Conceito: backfiltration');
ok(/high-flux/i.test(conc) && /low-flux/i.test(conc), 'Conceito: high-flux × low-flux');
ok(/cutoff/i.test(conc), 'Conceito: cutoff');
ok(/satura/i.test(conc), 'Conceito: saturação do clearance');
ok(/ultrapuro/i.test(conc), 'Conceito: dialisato ultrapuro');
ok(/contracorrente/i.test(doc.body.textContent), 'Conceito: contracorrente');
ok(/difus|convec/i.test(doc.body.textContent), 'Conceito: substitui FUNÇÕES por física (difusão/convecção)');
ok(/homeostas/i.test(doc.body.textContent), 'Conceito: homeostasia como conceito-fio');

// ---------- caso ≥5 + trilha ≥9 ----------
ok(doc.querySelectorAll('button.act[data-rev]').length >= 5, 'caso: ≥5 atos');
ok(doc.querySelectorAll('#caso .reveal').length >= 5, 'caso: ≥5 reveláveis');
ok(doc.querySelector('#fig-caso svg') !== null, 'Caso: ilustração SVG');
ok(doc.querySelectorAll('#trilha details').length >= 9, 'trilha: ≥9 passos');

// ---------- engine ≡ UI ----------
ok(typeof win.membrana === 'function', 'UI expõe membrana()');
ok(typeof win.clearanceDialisador === 'function', 'UI expõe clearanceDialisador()');
ok(typeof win.sieving === 'function' && typeof win.backfiltration === 'function', 'UI expõe sieving()/backfiltration()');
ok(typeof win.clearanceLayout === 'function', 'UI expõe clearanceLayout()');
var amostras = [
  {}, { koa: 800, qb: 300, qd: 500, highFlux: 1 }, { koa: 500, qb: 250, qd: 500, highFlux: 0 },
  { koa: 1400, qb: 300, qd: 500 }, { koa: 900, qb: 480, qd: 900, tmp: 20 },
  { koa: 600, qb: 150, qd: 300, cutoff: 30000 }, { highFlux: 0, cutoff: 2000 },
  { koa: null, qb: 'x', qd: -5, highFlux: 9, cutoff: 1e9, tmp: NaN }
];
var divM = 0;
amostras.forEach(function (a) { if (JSON.stringify(win.membrana(a)) !== JSON.stringify(ref.membrana(a))) divM++; });
ok(divM === 0, 'engine ≡ UI: membrana inline idêntico ao model21.js (' + divM + ' divergências)');
var divCl = 0;
[[600, 300, 500], [500, 250, 500], [1400, 300, 500], [800, 480, 900], [0, 300, 500]].forEach(function (t) {
  if (Math.abs(win.clearanceDialisador({ koa: t[0], qb: t[1], qd: t[2] }) - ref.clearanceDialisador({ koa: t[0], qb: t[1], qd: t[2] })) > 1e-12) divCl++;
});
ok(divCl === 0, 'clearanceDialisador ≡ UI (' + divCl + ' divergências)');
var divS = 0;
[[60, 2000, 4], [11800, 25000, 4], [11800, 2000, 4], [66000, 25000, 4]].forEach(function (t) {
  if (Math.abs(win.sieving({ pm: t[0], cutoff: t[1], steep: t[2] }) - ref.sieving({ pm: t[0], cutoff: t[1], steep: t[2] })) > 1e-12) divS++;
});
ok(divS === 0, 'sieving ≡ UI (' + divS + ' divergências)');
var divB = 0;
[[1, 800, 20], [0, 800, 20], [1, 300, 200], [1, 900, 5]].forEach(function (t) {
  if (Math.abs(win.backfiltration({ highFlux: t[0], qd: t[1], tmp: t[2] }) - ref.backfiltration({ highFlux: t[0], qd: t[1], tmp: t[2] })) > 1e-12) divB++;
});
ok(divB === 0, 'backfiltration ≡ UI (' + divB + ' divergências)');
var divL = 0;
amostras.forEach(function (a) { if (JSON.stringify(win.clearanceLayout(a, 900, 360)) !== JSON.stringify(ref.clearanceLayout(a, 900, 360))) divL++; });
ok(divL === 0, 'clearanceLayout ≡ UI (' + divL + ' divergências)');

// ---------- ROBUSTEZ EXTRA: ≥260 entradas malignas → engine≡UI finito em TODAS ----------
(function () {
  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  var rnd = mulberry32(0x21B0DE), N = 300, div = 0, naoFin = 0;
  var MAL = [NaN, Infinity, -Infinity, 1e300, -1e300, '5', 'x', '', null, undefined, {}, [], true];
  function v() { if (rnd() < 0.55) return MAL[(rnd() * MAL.length) | 0]; return (rnd() - 0.25) * 3000; }
  for (var i = 0; i < N; i++) {
    var inp = { koa: v(), qb: v(), qd: v(), tmp: v(), highFlux: v(), cutoff: v(), steep: v() };
    var a = win.membrana(inp), b = ref.membrana(inp);
    if (JSON.stringify(a) !== JSON.stringify(b)) div++;
    if (!fin(a.clearUreia) || !fin(a.clearMedio) || !fin(a.sUreia) || !fin(a.sMedio) || !fin(a.backfilt) || !fin(a.ganhoMarginal)) naoFin++;
    if (a.classe !== 'high-flux' && a.classe !== 'low-flux') naoFin++;
    if (a.clearUreia > a.qb + 1e-6) naoFin++;       // K ≤ Qb invariante
    var L = win.clearanceLayout(inp, 900, 360);
    if (!fin(L.current.x) || !fin(L.current.y) || !fin(L.current.K) || !fin(L.teto.K)) naoFin++;
  }
  ok(div === 0, 'robustez extra: ' + N + ' malignas engine≡UI (' + div + ' divergências)');
  ok(naoFin === 0, 'robustez extra: ' + N + ' malignas → saídas finitas/classificadas/K≤Qb (' + naoFin + ' inválidas)');
})();

// ---------- canvas curva == clearanceLayout(engine) — estado inicial dos sliders ----------
function slv(id) { return +doc.getElementById(id).value; }
var initState = {
  koa: slv('in-koa'), qb: slv('in-qb'), qd: slv('in-qd'),
  highFlux: slv('in-highFlux'), cutoff: slv('in-cutoff'), tmp: slv('in-tmp')
};
var canvasEl = doc.getElementById('clear-canvas');
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
var curvePath = acharPoli(Lref.pts);
ok(curvePath !== null, 'canvas: curva K(Qb) pintada (' + Lref.pts.length + ' pontos)');
var pintaOk = true;
if (curvePath) { for (var i = 0; i < Lref.pts.length; i++) { var pp = curvePath[i]; if (Math.abs(pp.x - Lref.pts[i].x) > 1e-6 || Math.abs(pp.y - Lref.pts[i].y) > 1e-6) { pintaOk = false; break; } } }
ok(pintaOk, 'canvas: cada ponto da curva == clearanceLayout(engine) (tol 1e-6)');
ok((rec.__rects || []).filter(function (q) { return q.op === 'fill'; }).length >= 1, 'canvas: marcador de operação pintado');

// ---------- Lab init ----------
ok(doc.getElementById('out-classe').textContent !== '—' && doc.getElementById('out-classe').textContent.length > 1, 'lab: out-classe preenchido no init');
ok(doc.getElementById('out-clearUreia').textContent.length > 1, 'lab: out-clearUreia preenchido no init');
ok(doc.getElementById('out-clearMedio').textContent.length > 1, 'lab: out-clearMedio preenchido no init');
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
ok(/M21/.test(doc.querySelector('.kicker') ? doc.querySelector('.kicker').textContent : ''), 'cromo: kicker M21');
ok(doc.querySelector('nav.hex .ativo') !== null, 'cromo: hexápode ativo');
ok(/FILTRA/.test(doc.querySelector('nav.hex .ativo') ? doc.querySelector('nav.hex .ativo').textContent : ''), 'cromo: FILTRA ativo');
ok(/CRM-SP 151\.318 · Dr\. Matheus M\. Coelho · Limeira/.test(body), 'cromo: rodapé');
ok(doc.querySelector('a[href="dialisa.html"]') !== null || doc.querySelector('a[href="filtra.html"]') !== null, 'cromo: backlink');
ok(/educacional/i.test(body) && doc.querySelector('.disc') !== null, 'disclaimer educacional');

// ---------- guarda farmacológica invertida §8 ----------
ok(!/\b\d+\s?(mg|mcg|µg)\b(?!\/)/.test(body), 'guarda §8: nenhuma dose de massa solta (mg/mcg/µg)');
ok(/mEq\/L/.test(body) || /mEq/.test(body), 'guarda §8: unidades do meio interno (mEq/L) presentes');
ok(/mL\/min/.test(body), 'guarda §8: fluxos/clearance em mL/min');

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
