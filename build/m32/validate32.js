'use strict';
/*
 * FILTRA · M32 — validador jsdom (portão do §6)
 * estrutura · engine ≡ UI (dialdrug, pmFator, vdLayout) · a curva fração removida × Vd
 * pintada no canvas ≡ vdLayout() · caso ≥5 · trilha ≥9 · dois bancos (ilustrado SVG/raster
 * + textual) · figura viva ≥8 · cromo.
 *
 * Guarda farmacológica INVERTIDA (§8): M32 É um módulo COM farmacologia de dose —
 * EXIGE fármacos com dose+unidade (mg/kg) ancorados a mecanismo, dose-resposta/clearance
 * computado (dialdrug) e a nota de honestidade do modelo. A ausência de dose é falha.
 *
 * Robustez reforçada: recomputa ≥200 entradas malignas e confirma win.fn(x) finito e
 * == ref.fn(x) em TODAS.
 */
var fs = require('fs');
var path = require('path');
var jsdom = require('jsdom');
var JSDOM = jsdom.JSDOM;

var ref = require('./model32.js');
var imgGuard = require('../lib/img-guard.js');

var oks = 0, fail = 0;
function ok(c, m) { if (c) { oks++; } else { fail++; console.error('FALHA: ' + m); } }
function fin(x) { return typeof x === 'number' && isFinite(x); }

var htmlPath = path.join(__dirname, '..', '..', 'filtra32.html');
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
  'vd-canvas', 'in-droga', 'in-pm', 'in-lig', 'in-vd', 'in-kdial', 'in-t', 'in-peso', 'in-dose', 'in-flux',
  'out-livre', 'out-fpm', 'out-kef', 'out-vl', 'out-frac', 'out-supl', 'out-t12', 'out-classe',
  'veredito', 'instr-pearl', 'lab-pearl', 'fig-caso', 'dose-box',
  'tutor-q', 'tutor-opts', 'tutor-fb', 'tutor-score', 'tutor-total', 'tutor-fig',
  'draw-vd', 'draw-livre', 'draw-dose'
];
ids.forEach(function (id) { ok(doc.getElementById(id) !== null, 'estrutura: #' + id + ' presente'); });
ok(doc.querySelectorAll('#tabs button').length === 6, 'estrutura: 6 abas');
ok(doc.getElementById('vd-canvas').tagName.toLowerCase() === 'canvas', 'instrumento: canvas vd-canvas');

// Conceito
ok(doc.querySelectorAll('#tab-conceito svg').length >= 3, 'Conceito: ≥3 desenhos computados');
var conc = doc.getElementById('tab-conceito').textContent;
ok(/peso molecular/i.test(conc), 'Conceito: peso molecular');
ok(/liga[çc][ãa]o proteica/i.test(conc), 'Conceito: ligação proteica');
ok(/Vd/.test(conc), 'Conceito: Vd');
ok(/homeostas/i.test(conc), 'Conceito: homeostasia como conceito-fio');

// caso ≥5 + trilha ≥9
ok(doc.querySelectorAll('button.act[data-rev]').length >= 5, 'caso: ≥5 atos');
ok(doc.querySelectorAll('#caso .reveal').length >= 5, 'caso: ≥5 reveláveis');
ok(doc.querySelector('#fig-caso svg') !== null, 'Caso: ilustração SVG');
ok(doc.querySelectorAll('#trilha details').length >= 9, 'trilha: ≥9 passos');

// engine ≡ UI
ok(typeof win.dialdrug === 'function', 'UI expõe dialdrug()');
ok(typeof win.pmFator === 'function', 'UI expõe pmFator()');
ok(typeof win.vdLayout === 'function', 'UI expõe vdLayout()');
var amostras = [
  {}, { droga: 'vancomicina', highFlux: true }, { droga: 'gentamicina' }, { droga: 'litio' },
  { droga: 'digoxina', kdial: 300, t: 480 }, { droga: 'custom', pm: 300, ligacao: 0.95, vd: 0.5 },
  { droga: 'custom', pm: 1449, ligacao: 0.5, vd: 0.7, highFlux: false },
  { droga: 'xyz', pm: NaN, ligacao: -1, vd: 1e9, kdial: Infinity, t: -5 }
];
var divT = 0;
amostras.forEach(function (a) { if (JSON.stringify(win.dialdrug(a)) !== JSON.stringify(ref.dialdrug(a))) divT++; });
ok(divT === 0, 'engine ≡ UI: dialdrug inline idêntico ao model32.js (' + divT + ' divergências)');
var divP = 0;
[[1, true], [500, false], [1449, true], [8000, false], [30000, true]].forEach(function (t) {
  if (Math.abs(win.pmFator(t[0], t[1]) - ref.pmFator(t[0], t[1])) > 1e-12) divP++;
});
ok(divP === 0, 'pmFator ≡ UI (' + divP + ' divergências)');
var divL = 0;
amostras.forEach(function (a) { if (JSON.stringify(win.vdLayout(a, 900, 360)) !== JSON.stringify(ref.vdLayout(a, 900, 360))) divL++; });
ok(divL === 0, 'vdLayout ≡ UI (' + divL + ' divergências)');

// ── ROBUSTEZ REFORÇADA: recompute ≥200 entradas malignas, win == ref e finito ────
(function () {
  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  var rnd = mulberry32(0x32AB1D), N = 300, bad = 0, diff = 0;
  var drogas = ['custom', 'vancomicina', 'gentamicina', 'litio', 'digoxina', 'xyz', null, 123];
  var MAL = [NaN, Infinity, -Infinity, 1e300, -1e300, '12', 'x', null, undefined, {}, [], true];
  function val() { var r = rnd(); if (r < 0.5) return MAL[(rnd() * MAL.length) | 0]; return (rnd() - 0.1) * 9000; }
  for (var i = 0; i < N; i++) {
    var inp = { droga: drogas[(rnd() * drogas.length) | 0], pm: val(), ligacao: val(), vd: val(), kdial: val(), t: val(), peso: val(), dose: val(), highFlux: rnd() > 0.5 };
    var rr = ref.dialdrug(inp), wr = win.dialdrug(inp);
    if (!fin(wr.fracaoRemovida) || !fin(wr.doseSuplementarMg) || !fin(wr.kEfetivo) || !fin(wr.fLivre) || !fin(wr.fpm) || !fin(wr.meiaVidaDial)) bad++;
    if (JSON.stringify(rr) !== JSON.stringify(wr)) diff++;
  }
  ok(bad === 0, 'robustez reforçada: ' + N + ' entradas malignas → todas finitas no win.dialdrug (' + bad + ')');
  ok(diff === 0, 'robustez reforçada: win.dialdrug == ref.dialdrug em todas as ' + N + ' malignas (' + diff + ')');
})();

// canvas curva == vdLayout(engine) — confere a polilinha da curva (1e-6)
var canvasEl = doc.getElementById('vd-canvas');
var rec = canvasEl.getContext('2d');
ok(rec && Array.isArray(rec.__paths), 'canvas: contexto exercido');
var initState = { droga: 'custom', pm: 1500, ligacao: 0.5, vd: 1.0, kdial: 180, t: 240, peso: 70, dose: 10, highFlux: true };
var Lref = ref.vdLayout(initState, canvasEl.width, canvasEl.height);
var curvaPath = null;
(rec.__paths || []).forEach(function (p) {
  if (p.length === Lref.curva.length && p[0] && Math.abs(p[0].y - Lref.curva[0].y) < 1e-4 && Math.abs(p[p.length - 1].y - Lref.curva[Lref.curva.length - 1].y) < 1e-4) curvaPath = p;
});
ok(curvaPath !== null, 'canvas: polilinha da curva pintada (' + Lref.curva.length + ' pontos)');
var pintaOk = true;
if (curvaPath) { for (var i = 0; i < Lref.curva.length; i++) { if (Math.abs(curvaPath[i].x - Lref.curva[i].x) > 1e-6 || Math.abs(curvaPath[i].y - Lref.curva[i].y) > 1e-6) { pintaOk = false; break; } } }
ok(pintaOk, 'canvas: cada ponto da curva == vdLayout(engine) (tol 1e-6)');
ok((rec.__texts || []).join(' ').indexOf('fração removida') >= 0, 'canvas: rótulo da curva presente');

// Lab init
ok(doc.getElementById('out-frac').textContent !== '—', 'lab: out-frac preenchido no init');
ok(doc.getElementById('out-supl').textContent !== '—', 'lab: out-supl preenchido no init');
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
ok(/M32/.test(doc.querySelector('.kicker') ? doc.querySelector('.kicker').textContent : ''), 'cromo: kicker M32');
ok(doc.querySelector('nav.hex .ativo') !== null, 'cromo: hexápode ativo');
ok(/CRM-SP 151\.318 · Dr\. Matheus M\. Coelho · Limeira/.test(body), 'cromo: rodapé');
ok(doc.querySelector('a[href="dialisa.html"]') !== null || doc.querySelector('a[href="filtra.html"]') !== null, 'cromo: backlink');
ok(/educacional/i.test(body) && doc.querySelector('.disc') !== null, 'disclaimer educacional');
ok(/honestidade do modelo/i.test(body), 'disclaimer: nota de honestidade do modelo (§8)');

// ─── GUARDA FARMACOLÓGICA INVERTIDA (§8): EXIGE dose+unidade+mecanismo ────────
ok(/vancomicina/i.test(body), 'farmacologia: vancomicina citada');
ok(/gentamicina/i.test(body), 'farmacologia: gentamicina citada');
ok(/digoxina/i.test(body), 'farmacologia: digoxina citada (Vd alto)');
ok(/l[íi]tio/i.test(body), 'farmacologia: lítio citado (bem removido)');
ok(/\b\d+[\s–-]+\d+\s?mg\/kg/.test(body) || /\b\d+(?:[.,]\d+)?\s?mg\/kg/.test(body), 'farmacologia (EXIGIDO): doses com unidade mg/kg presentes');
ok(/15[\s–-]+20\s?mg\/kg/.test(body), 'farmacologia: vancomicina 15–20 mg/kg ancorada');
ok(/1[\s,–-]+1,7\s?mg\/kg/.test(body) || /1–1,7\s?mg\/kg/.test(body), 'farmacologia: gentamicina 1–1,7 mg/kg ancorada');
// "muito ligada" anchored to mechanism
ok(/fra[çc][ãa]o livre/i.test(body) && /liga[çc][ãa]o proteica/i.test(body), 'farmacologia: fração livre × ligação proteica (mecanismo)');
ok(/Vd alto/i.test(body) && /(blinda|blindada)/i.test(body), 'farmacologia: pérola Vd alto blinda ancorada');
ok(typeof win.dialdrug === 'function' && /fracaoRemovida|doseSuplementarMg/i.test(html), 'farmacologia: clearance/dose computada (dialdrug)');
// a dose suplementar de fato responde à fração removida (computa, não é número solto)
ok(ref.dialdrug({ droga: 'gentamicina' }).doseSuplementarMg > ref.dialdrug({ droga: 'digoxina' }).doseSuplementarMg, 'farmacologia: re-dose computada maior na bem-removida (curva computada)');
ok(ref.dialdrug({ droga: 'custom', vd: 0.5, ligacao: 0.3, pm: 400 }).fracaoRemovida > ref.dialdrug({ droga: 'custom', vd: 6, ligacao: 0.3, pm: 400 }).fracaoRemovida, 'farmacologia: Vd alto reduz a fração removida computada');

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
