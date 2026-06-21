'use strict';
/*
 * FILTRA · M36 — validador jsdom (portão do §6)
 * estrutura · engine ≡ UI (timing, riskCurveLayout, sevK/sevHCO3/sevVol/sevUreia) ·
 * a curva pintada no canvas ≡ riskCurveLayout() (tol 1e-6) · caso ≥5 atos · trilha ≥9 ·
 * dois bancos (ilustrado SVG/raster + textual) · figura viva ≥8 · cromo · disclaimer.
 * ROBUSTEZ EXTRA: recomputa ≥200 entradas MALIGNAS e confirma engine≡UI finito em todas.
 * Guarda farmacológica §8 (invertida): módulo DIALISA — sem dose de massa solta (mg/mcg/µg);
 * mEq/L, mL e h são livres.
 */
var fs = require('fs');
var path = require('path');
var jsdom = require('jsdom');
var JSDOM = jsdom.JSDOM;

var ref = require('./model36.js');
var imgGuard = require('../lib/img-guard.js');

var oks = 0, fail = 0;
function ok(c, m) { if (c) { oks++; } else { fail++; console.error('FALHA: ' + m); } }
function fin(x) { return typeof x === 'number' && isFinite(x); }

var htmlPath = path.join(__dirname, '..', '..', 'filtra36.html');
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
  'score-canvas', 'in-k', 'in-hco3', 'in-volume', 'in-ureia', 'in-sintomas', 'in-resposta', 'in-tendencia',
  'out-score', 'out-gatilho', 'out-eixo', 'out-precoce', 'out-tardio', 'out-rec',
  'veredito', 'instr-pearl', 'lab-pearl', 'fig-caso',
  'tutor-q', 'tutor-opts', 'tutor-fb', 'tutor-score', 'tutor-total', 'tutor-fig',
  'draw-gatilhos', 'draw-refrat', 'draw-precoce', 'draw-eixos', 'draw-tend'
];
ids.forEach(function (id) { ok(doc.getElementById(id) !== null, 'estrutura: #' + id + ' presente'); });
ok(doc.querySelectorAll('#tabs button').length === 6, 'estrutura: 6 abas');
ok(doc.getElementById('score-canvas').tagName.toLowerCase() === 'canvas', 'instrumento: canvas score-canvas');

// Conceito
ok(doc.querySelectorAll('#tab-conceito svg').length >= 5, 'Conceito: ≥5 desenhos computados');
var conc = doc.getElementById('tab-conceito').textContent;
ok(/gatilho/i.test(conc), 'Conceito: os gatilhos');
ok(/refrat/i.test(conc), 'Conceito: refratário');
ok(/precoce.*tardio|tardio.*precoce/i.test(conc), 'Conceito: precoce × tardio');
ok(/AKIKI|STARRT|ELAIN/i.test(conc), 'Conceito: os ensaios (ELAIN/AKIKI/STARRT)');
ok(/função|funcao/i.test(conc) && /creatinina|ureia/i.test(conc), 'Conceito: função refratária × número');
ok(/homeostas/i.test(doc.body.textContent), 'Conceito: homeostasia como conceito-fio');

// caso ≥5 + trilha ≥9
ok(doc.querySelectorAll('button.act[data-rev]').length >= 5, 'caso: ≥5 atos');
ok(doc.querySelectorAll('#caso .reveal').length >= 5, 'caso: ≥5 reveláveis');
ok(doc.querySelector('#fig-caso svg') !== null, 'Caso: ilustração SVG');
ok(doc.querySelectorAll('#trilha details').length >= 9, 'trilha: ≥9 passos');

// engine ≡ UI
ok(typeof win.timing === 'function', 'UI expõe timing()');
ok(typeof win.riskCurveLayout === 'function', 'UI expõe riskCurveLayout()');
ok(typeof win.sevK === 'function' && typeof win.sevHCO3 === 'function' && typeof win.sevVol === 'function' && typeof win.sevUreia === 'function', 'UI expõe sev*()');
var amostras = [
  {}, { k: 7.0, resposta: 0.1 }, { hco3: 9, resposta: 0.1 }, { volume: 9, resposta: 0.1 },
  { ureia: 260, sintomas: 1 }, { ureia: 320, sintomas: 0, resposta: 0.8 }, { k: 5.6, volume: 4.5, resposta: 0.25, tendencia: 0.7 },
  { k: null, hco3: 'x', volume: -5, ureia: 1e9, sintomas: 9, resposta: -2, tendencia: 1e300 }
];
var divT = 0;
amostras.forEach(function (a) { if (JSON.stringify(win.timing(a)) !== JSON.stringify(ref.timing(a))) divT++; });
ok(divT === 0, 'engine ≡ UI: timing inline idêntico ao model36.js (' + divT + ' divergências)');
var divS = 0;
[[3], [4], [5], [6.5], [7.2]].forEach(function (t) { if (Math.abs(win.sevK(t[0]) - ref.sevK(t[0])) > 1e-12) divS++; });
ok(divS === 0, 'sevK ≡ UI (' + divS + ' divergências)');
var divL = 0;
amostras.forEach(function (a) { if (JSON.stringify(win.riskCurveLayout(a, 900, 360)) !== JSON.stringify(ref.riskCurveLayout(a, 900, 360))) divL++; });
ok(divL === 0, 'riskCurveLayout ≡ UI (' + divL + ' divergências)');

// ROBUSTEZ EXTRA: ≥200 entradas malignas → engine≡UI finito em TODAS
(function () {
  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  var rnd = mulberry32(0xB36C36), N = 260, div = 0, naoFin = 0;
  var MAL = [NaN, Infinity, -Infinity, 1e300, -1e300, '5', 'x', '', null, undefined, {}, [], true];
  function v() { if (rnd() < 0.55) return MAL[(rnd() * MAL.length) | 0]; return (rnd() - 0.25) * 600; }
  for (var i = 0; i < N; i++) {
    var inp = { k: v(), hco3: v(), volume: v(), ureia: v(), sintomas: v(), resposta: v(), tendencia: v() };
    var a = win.timing(inp), b = ref.timing(inp);
    if (JSON.stringify(a) !== JSON.stringify(b)) div++;
    if (!fin(a.score) || !fin(a.riscoPrecoce) || !fin(a.riscoTardio) || !fin(a.sevK)) naoFin++;
    var L = win.riskCurveLayout(inp, 900, 360);
    if (!fin(L.current.x) || !fin(L.current.y) || !fin(L.current.score)) naoFin++;
  }
  ok(div === 0, 'robustez extra: ' + N + ' malignas engine≡UI (' + div + ' divergências)');
  ok(naoFin === 0, 'robustez extra: ' + N + ' malignas → saídas finitas (' + naoFin + ' não-finitas)');
})();

// canvas curva == riskCurveLayout(engine) — estado inicial dos sliders
var canvasEl = doc.getElementById('score-canvas');
var rec = canvasEl.getContext('2d');
ok(rec && Array.isArray(rec.__paths), 'canvas: contexto exercido');
var initState = { k: 4.5, hco3: 22, volume: 0, ureia: 60, sintomas: 0, resposta: 0.5, tendencia: 0 };
var Lref = ref.riskCurveLayout(initState, canvasEl.width, canvasEl.height);
function acharPoli(ref0) {
  var found = null;
  (rec.__paths || []).forEach(function (p) {
    if (p.length === ref0.length && p[0] && Math.abs(p[0].y - ref0[0].y) < 1e-4 && Math.abs(p[0].x - ref0[0].x) < 1e-4) found = p;
  });
  return found;
}
var scorePath = acharPoli(Lref.pts);
ok(scorePath !== null, 'canvas: polilinha do score pintada (' + Lref.pts.length + ' pontos)');
var pintaOk = true;
if (scorePath) { for (var i = 0; i < Lref.pts.length; i++) { var pp = scorePath[i]; if (Math.abs(pp.x - Lref.pts[i].x) > 1e-6 || Math.abs(pp.y - Lref.pts[i].y) > 1e-6) { pintaOk = false; break; } } }
ok(pintaOk, 'canvas: cada ponto do score == riskCurveLayout(engine) (tol 1e-6)');
// curvas precoce e tardio também pintadas
ok(acharPoli(Lref.ptsPrec) !== null, 'canvas: polilinha do risco precoce pintada');
ok(acharPoli(Lref.ptsTard) !== null, 'canvas: polilinha do risco tardio pintada');
ok((rec.__rects || []).filter(function (q) { return q.op === 'fill'; }).length >= 1, 'canvas: marcador de operação pintado');

// Lab init
ok(doc.getElementById('out-score').textContent !== '—', 'lab: out-score preenchido no init');
ok(doc.getElementById('out-rec').textContent !== '—', 'lab: out-rec preenchido no init');
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
ok(/M36/.test(doc.querySelector('.kicker') ? doc.querySelector('.kicker').textContent : ''), 'cromo: kicker M36');
ok(doc.querySelector('nav.hex .ativo') !== null, 'cromo: hexápode ativo');
ok(/FILTRA/.test(doc.querySelector('nav.hex .ativo') ? doc.querySelector('nav.hex .ativo').textContent : ''), 'cromo: FILTRA ativo');
ok(/CRM-SP 151\.318 · Dr\. Matheus M\. Coelho · Limeira/.test(body), 'cromo: rodapé');
ok(doc.querySelector('a[href="dialisa.html"]') !== null || doc.querySelector('a[href="filtra.html"]') !== null, 'cromo: backlink');
ok(/educacional/i.test(body) && doc.querySelector('.disc') !== null, 'disclaimer educacional');

// guarda farmacológica invertida §8: sem dose de massa solta (mg/mcg/µg sem "/"); mEq/L é livre
ok(!/\b\d+\s?(mg|mcg|µg)\b(?!\/)/.test(body), 'guarda §8: nenhuma dose de massa solta (mg/mcg/µg)');
ok(/mEq\/L/.test(body), 'guarda §8: unidades do meio interno (mEq/L) presentes');

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
