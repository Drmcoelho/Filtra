'use strict';
/*
 * FILTRA · M33 — validador jsdom (portão do §6) — Remoção de TOXINAS (DIALISA)
 * estrutura · engine ≡ UI (toxina, nivelLayout, dialisabilidade, remocao, rebote) ·
 * a curva pintada no canvas ≡ nivelLayout() (tol 1e-6) · caso ≥5 atos · trilha ≥9 ·
 * dois bancos (ilustrado SVG/raster + textual) · figura viva ≥8 · cromo · disclaimer.
 * ROBUSTEZ EXTRA: recomputa ≥260 entradas MALIGNAS e confirma engine≡UI finito em todas.
 * Guarda §8 (invertida): módulo DIALISA — sem dose de massa solta (mg/mcg/µg);
 * níveis de toxina usam mg/dL, mmol/L, mEq/L COM "/"; clearance mL/min; tempos em h.
 */
var fs = require('fs');
var path = require('path');
var jsdom = require('jsdom');
var JSDOM = jsdom.JSDOM;

var ref = require('./model33.js');
var imgGuard = require('../lib/img-guard.js');

var oks = 0, fail = 0;
function ok(c, m) { if (c) { oks++; } else { fail++; console.error('FALHA: ' + m); } }
function fin(x) { return typeof x === 'number' && isFinite(x); }

var htmlPath = path.join(__dirname, '..', '..', 'filtra33.html');
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
  'nivel-canvas',
  'in-toxina', 'in-nivel', 'in-pm', 'in-ligacao', 'in-vd', 'in-hidro', 'in-kdial', 'in-peso', 'in-tSessao', 'in-sintomas', 'in-acidose',
  'out-score', 'out-indica', 'out-fracao', 'out-talvo', 'out-rebote', 'out-acido',
  'veredito', 'instr-pearl', 'lab-pearl', 'fig-caso',
  'tutor-q', 'tutor-opts', 'tutor-fb', 'tutor-score', 'tutor-total', 'tutor-fig',
  'draw-criterios', 'draw-litio', 'draw-salicilato', 'draw-queda', 'draw-indicacao'
];
ids.forEach(function (id) { ok(doc.getElementById(id) !== null, 'estrutura: #' + id + ' presente'); });
ok(doc.querySelectorAll('#tabs button').length === 6, 'estrutura: 6 abas');
ok(doc.getElementById('nivel-canvas').tagName.toLowerCase() === 'canvas', 'instrumento: canvas nivel-canvas');

// ---------- Conceito ----------
ok(doc.querySelectorAll('#tab-conceito svg').length >= 5, 'Conceito: ≥5 desenhos computados');
var conc = doc.getElementById('tab-conceito').textContent;
ok(/dialisab/i.test(conc), 'Conceito: dialisabilidade');
ok(/lítio|litio/i.test(conc), 'Conceito: lítio');
ok(/salicilato/i.test(conc), 'Conceito: salicilato');
ok(/metanol/i.test(conc) && /etilenoglicol/i.test(conc), 'Conceito: metanol/etilenoglicol');
ok(/rebote/i.test(conc), 'Conceito: o rebote (Vd alto)');
ok(/fomepizol/i.test(conc), 'Conceito: fomepizol (bloqueio da ADH)');
ok(/ligaç|ligac/i.test(conc), 'Conceito: ligação proteica (fração livre)');
ok(/Vd/.test(conc), 'Conceito: Vd');
ok(/acidose/i.test(doc.body.textContent), 'Conceito: correção da acidose');
ok(/homeostas/i.test(doc.body.textContent), 'Conceito: homeostasia como conceito-fio');
ok(/difus/i.test(doc.body.textContent), 'Conceito: remoção por difusão');

// ---------- caso ≥5 + trilha ≥9 ----------
ok(doc.querySelectorAll('button.act[data-rev]').length >= 5, 'caso: ≥5 atos');
ok(doc.querySelectorAll('#caso .reveal').length >= 5, 'caso: ≥5 reveláveis');
ok(doc.querySelector('#fig-caso svg') !== null, 'Caso: ilustração SVG');
ok(doc.querySelectorAll('#trilha details').length >= 9, 'trilha: ≥9 passos');

// ---------- engine ≡ UI ----------
ok(typeof win.toxina === 'function', 'UI expõe toxina()');
ok(typeof win.nivelLayout === 'function', 'UI expõe nivelLayout()');
ok(typeof win.dialisabilidade === 'function' && typeof win.remocao === 'function' && typeof win.rebote === 'function', 'UI expõe dialisabilidade()/remocao()/rebote()');
var amostras = [
  {}, { toxina: 'litio', nivel: 4 }, { toxina: 'salicilato', nivel: 90, acidose: 0.7 },
  { toxina: 'metanol', nivel: 60 }, { toxina: 'etilenoglicol', nivel: 60 }, { toxina: 'digoxina', nivel: 10, sintomas: 0.9 },
  { toxina: 'custom', pm: 300, ligacao: 0.97, vd: 0.3, hidro: 1, nivel: 50 },
  { toxina: 'custom', pm: 50, ligacao: 0.05, vd: 0.4, hidro: 1, nivel: 10, kdial: 250, tSessao: 360 },
  { toxina: null, nivel: 'x', pm: 1e9, ligacao: NaN, vd: -5, hidro: 9, kdial: Infinity, peso: -1, tSessao: 1e300, sintomas: 'y', acidose: -3 }
];
var divC = 0;
amostras.forEach(function (a) { if (JSON.stringify(win.toxina(a)) !== JSON.stringify(ref.toxina(a))) divC++; });
ok(divC === 0, 'engine ≡ UI: toxina inline idêntico ao model33.js (' + divC + ' divergências)');
var divD = 0;
[[100, 0.3, 0.6, 0.8], [7, 0, 0.7, 1], [781, 0.25, 6, 0.3], [300, 0.97, 0.3, 1]].forEach(function (t) { if (JSON.stringify(win.dialisabilidade({ pm: t[0], ligacao: t[1], vd: t[2], hidro: t[3] })) !== JSON.stringify(ref.dialisabilidade({ pm: t[0], ligacao: t[1], vd: t[2], hidro: t[3] }))) divD++; });
ok(divD === 0, 'dialisabilidade ≡ UI (' + divD + ' divergências)');
var divR = 0;
[[90, 30, 180, 0, 0.2, 70, 240], [60, 20, 220, 5, 0.6, 70, 300]].forEach(function (t) { var inp = { c0: t[0], alvo: t[1], kdial: t[2], kendo: t[3], vd: t[4], peso: t[5], t: t[6] }; if (JSON.stringify(win.remocao(inp)) !== JSON.stringify(ref.remocao(inp))) divR++; });
ok(divR === 0, 'remocao ≡ UI (' + divR + ' divergências)');
var divL = 0;
amostras.forEach(function (a) { if (JSON.stringify(win.nivelLayout(a, 900, 360)) !== JSON.stringify(ref.nivelLayout(a, 900, 360))) divL++; });
ok(divL === 0, 'nivelLayout ≡ UI (' + divL + ' divergências)');

// ---------- ROBUSTEZ EXTRA: ≥260 entradas malignas → engine≡UI finito em TODAS ----------
(function () {
  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  var rnd = mulberry32(0x33C0DE), N = 300, div = 0, naoFin = 0;
  var MAL = [NaN, Infinity, -Infinity, 1e300, -1e300, '5', 'x', '', null, undefined, {}, [], true];
  var TX = ['custom', 'litio', 'salicilato', 'metanol', 'etilenoglicol', 'digoxina', 'inexistente', 42, null];
  var CLASSE = { blindada_vd: 1, blindada_ligacao: 1, muito_dialisavel: 1, parcial: 1, mal_dialisavel: 1 };
  function v() { if (rnd() < 0.55) return MAL[(rnd() * MAL.length) | 0]; return (rnd() - 0.25) * 700; }
  for (var i = 0; i < N; i++) {
    var inp = { toxina: TX[(rnd() * TX.length) | 0], pm: v(), ligacao: v(), vd: v(), hidro: v(), nivel: v(), alvo: v(), limiar: v(), kdial: v(), kendo: v(), peso: v(), sintomas: v(), acidose: v(), tSessao: v() };
    var a = win.toxina(inp), b = ref.toxina(inp);
    if (JSON.stringify(a) !== JSON.stringify(b)) div++;
    if (!fin(a.score) || !fin(a.fracaoRemovida) || !fin(a.tAlvoH) || !fin(a.fracaoRebote) || !fin(a.kdialEf) || !fin(a.ct)) naoFin++;
    if (!(a.classe in CLASSE)) naoFin++;
    var L = win.nivelLayout(inp, 900, 360);
    if (!fin(L.refs.yAlvo) || !fin(L.refs.yLimiar) || !fin(L.refs.xSessao) || !Array.isArray(L.comHD) || L.comHD.length !== 81) naoFin++;
    if (!fin(L.comHD[0].py) || !fin(L.semHD[80].py)) naoFin++;
  }
  ok(div === 0, 'robustez extra: ' + N + ' malignas engine≡UI (' + div + ' divergências)');
  ok(naoFin === 0, 'robustez extra: ' + N + ' malignas → saídas finitas/classificadas (' + naoFin + ' inválidas)');
})();

// ---------- canvas curva == nivelLayout(engine) — estado inicial dos sliders ----------
function slv(id) { return +doc.getElementById(id).value; }
var initState = {
  toxina: doc.getElementById('in-toxina').value, nivel: slv('in-nivel'), pm: slv('in-pm'),
  ligacao: slv('in-ligacao'), vd: slv('in-vd'), hidro: slv('in-hidro'), kdial: slv('in-kdial'),
  peso: slv('in-peso'), tSessao: slv('in-tSessao'), sintomas: slv('in-sintomas'), acidose: slv('in-acidose')
};
var canvasEl = doc.getElementById('nivel-canvas');
var rec = canvasEl.getContext('2d');
ok(rec && Array.isArray(rec.__paths), 'canvas: contexto exercido');
var Lref = ref.nivelLayout(initState, canvasEl.width, canvasEl.height);
function acharPoli(ref0, useY) {
  var found = null;
  (rec.__paths || []).forEach(function (p) {
    if (p.length === ref0.length && p[0] && Math.abs(p[0].y - ref0[0][useY]) < 1e-4 && Math.abs(p[0].x - ref0[0].x) < 1e-4) found = p;
  });
  return found;
}
var comHDPath = acharPoli(Lref.comHD, 'py');
ok(comHDPath !== null, 'canvas: polilinha COM HD pintada (' + Lref.comHD.length + ' pontos)');
var pintaOk = true;
if (comHDPath) { for (var i = 0; i < Lref.comHD.length; i++) { var pp = comHDPath[i]; if (Math.abs(pp.x - Lref.comHD[i].x) > 1e-6 || Math.abs(pp.y - Lref.comHD[i].py) > 1e-6) { pintaOk = false; break; } } }
ok(pintaOk, 'canvas: cada ponto da curva == nivelLayout(engine) (tol 1e-6)');
var semHDPath = acharPoli(Lref.semHD, 'py');
ok(semHDPath !== null, 'canvas: polilinha SEM HD (rim) pintada');

// ---------- Lab init ----------
ok(doc.getElementById('out-score').textContent.length > 1, 'lab: out-score preenchido no init');
ok(doc.getElementById('out-indica').textContent.length > 1, 'lab: out-indica preenchido no init');
ok(doc.getElementById('out-rebote').textContent.length > 1, 'lab: out-rebote preenchido no init');
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
ok(/M33/.test(doc.querySelector('.kicker') ? doc.querySelector('.kicker').textContent : ''), 'cromo: kicker M33');
ok(doc.querySelector('nav.hex .ativo') !== null, 'cromo: hexápode ativo');
ok(/FILTRA/.test(doc.querySelector('nav.hex .ativo') ? doc.querySelector('nav.hex .ativo').textContent : ''), 'cromo: FILTRA ativo');
ok(/CRM-SP 151\.318 · Dr\. Matheus M\. Coelho · Limeira/.test(body), 'cromo: rodapé');
ok(doc.querySelector('a[href="dialisa.html"]') !== null || doc.querySelector('a[href="filtra.html"]') !== null, 'cromo: backlink');
ok(/educacional/i.test(body) && doc.querySelector('.disc') !== null, 'disclaimer educacional');

// ---------- guarda §8 invertida — sem dose de massa solta; níveis com "/" ----------
ok(!/\b\d+\s?(mg|mcg|µg)\b(?!\/)/.test(body), 'guarda §8: nenhuma dose de massa solta (mg/mcg/µg)');
ok(/mEq\/L/.test(body), 'guarda §8: unidades do meio interno (mEq/L) presentes');
ok(/mg\/dL/.test(body) && /mL\/min/.test(body), 'guarda §8: níveis (mg/dL) e clearance (mL/min) com "/"');

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
