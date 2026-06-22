'use strict';
/*
 * FILTRA · M35 — validador jsdom (portão do §6) — Indicações de TRS (AEIOU)
 * estrutura · engine ≡ UI (aeiou, radarLayout, sevAcidose/E/I/O/U) ·
 * o radar pintado no canvas ≡ radarLayout() (tol 1e-6) · caso ≥5 atos · trilha ≥9 ·
 * dois bancos (ilustrado SVG/raster + textual) · figura viva ≥8 · cromo · disclaimer.
 * ROBUSTEZ EXTRA: recomputa ≥260 entradas MALIGNAS e confirma engine≡UI finito em todas.
 * Guarda farmacológica §8 (invertida): módulo DIALISA — sem dose de massa solta (mg/mcg/µg);
 * mEq/L é livre.
 */
var fs = require('fs');
var path = require('path');
var jsdom = require('jsdom');
var JSDOM = jsdom.JSDOM;

var ref = require('./model35.js');
var imgGuard = require('../lib/img-guard.js');

var oks = 0, fail = 0;
function ok(c, m) { if (c) { oks++; } else { fail++; console.error('FALHA: ' + m); } }
function fin(x) { return typeof x === 'number' && isFinite(x); }

var htmlPath = path.join(__dirname, '..', '..', 'filtra35.html');
var html = fs.readFileSync(htmlPath, 'utf8');

function recorderCtx() {
  var rects = [], texts = [], paths = [], cur = null;
  return {
    fillStyle: '', strokeStyle: '', lineWidth: 1, globalAlpha: 1, font: '', textAlign: '', canvas: null,
    clearRect: function () {},
    fillRect: function (x, y, w, h) { rects.push({ op: 'fill', x: x, y: y, w: w, h: h }); },
    strokeRect: function (x, y, w, h) { rects.push({ op: 'stroke', x: x, y: y, w: w, h: h }); },
    beginPath: function () { cur = []; paths.push(cur); },
    moveTo: function (x, y) { if (cur) cur.push({ t: 'M', x: x, y: y }); },
    lineTo: function (x, y) { if (cur) cur.push({ t: 'L', x: x, y: y }); },
    stroke: function () {}, setLineDash: function () {},
    fillText: function (t) { texts.push(String(t)); },
    arc: function () {}, fill: function () {}, closePath: function () { if (cur) cur.__closed = true; },
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
  'aeiou-canvas',
  'in-pH', 'in-hco3', 'in-acidoseRespondeu', 'in-k', 'in-ecg', 'in-kRespondeu',
  'in-dialisavel', 'in-nivelTox', 'in-gravidadeTox', 'in-volume', 'in-edemaPulmonar', 'in-diureticoRespondeu',
  'in-ureia', 'in-pericardite', 'in-encefalopatia',
  'out-recomendacao', 'out-disparos', 'out-dominante', 'out-sev', 'out-resumo',
  'veredito', 'instr-pearl', 'lab-pearl', 'fig-caso',
  'tutor-q', 'tutor-opts', 'tutor-fb', 'tutor-score', 'tutor-total', 'tutor-fig',
  'draw-aeiou', 'draw-acidose', 'draw-eletro', 'draw-intox', 'draw-over', 'draw-uremia'
];
ids.forEach(function (id) { ok(doc.getElementById(id) !== null, 'estrutura: #' + id + ' presente'); });
ok(doc.querySelectorAll('#tabs button').length === 6, 'estrutura: 6 abas');
ok(doc.getElementById('aeiou-canvas').tagName.toLowerCase() === 'canvas', 'instrumento: canvas aeiou-canvas');

// ---------- Conceito ----------
ok(doc.querySelectorAll('#tab-conceito svg').length >= 5, 'Conceito: ≥5 desenhos computados');
var conc = doc.getElementById('tab-conceito').textContent;
ok(/AEIOU/.test(conc), 'Conceito: o mnemônico AEIOU');
ok(/Acidose/i.test(conc), 'Conceito: A (acidose)');
ok(/Eletr[óo]litos/i.test(conc), 'Conceito: E (eletrólitos)');
ok(/Intoxica/i.test(conc), 'Conceito: I (intoxicação)');
ok(/sobrecarga|Overload/i.test(conc), 'Conceito: O (overload)');
ok(/Uremia/i.test(conc), 'Conceito: U (uremia)');
ok(/refrat[áa]ri/i.test(conc), 'Conceito: o gatilho refratário');
ok(/dialis[áa]vel/i.test(conc), 'Conceito: toxina dialisável (portão)');
ok(/homeostas/i.test(doc.body.textContent), 'Conceito: homeostasia como conceito-fio');
ok(/refrat[áa]rio.*respons|respons.*refrat[áa]rio/i.test(doc.body.textContent.replace(/\s+/g, ' ')), 'Conceito: refratário × responsivo');

// ---------- caso ≥5 + trilha ≥9 ----------
ok(doc.querySelectorAll('button.act[data-rev]').length >= 5, 'caso: ≥5 atos');
ok(doc.querySelectorAll('#caso .reveal').length >= 5, 'caso: ≥5 reveláveis');
ok(doc.querySelector('#fig-caso svg') !== null, 'Caso: ilustração SVG');
ok(doc.querySelectorAll('#trilha details').length >= 9, 'trilha: ≥9 passos');

// ---------- engine ≡ UI ----------
ok(typeof win.aeiou === 'function', 'UI expõe aeiou()');
ok(typeof win.radarLayout === 'function', 'UI expõe radarLayout()');
ok(typeof win.sevAcidose === 'function' && typeof win.sevEletrolitos === 'function' && typeof win.sevIntoxicacao === 'function'
  && typeof win.sevSobrecarga === 'function' && typeof win.sevUremia === 'function', 'UI expõe as 5 funções de severidade');
var amostras = [
  {}, { pH: 7.02, hco3: 8, acidoseRespondeu: 0.1 }, { k: 7.4, ecg: 0.9, kRespondeu: 0.1 },
  { dialisavel: 0.95, nivelTox: 0.9, gravidadeTox: 0.8 }, { volume: 11, edemaPulmonar: 0.9, diureticoRespondeu: 0.1 },
  { ureia: 280, pericardite: 0.8, encefalopatia: 0.5 }, { k: 6.8, ecg: 0.5, kRespondeu: 1, volume: 5, ureia: 200 },
  { pH: null, hco3: 'x', acidoseRespondeu: -2, k: 1e9, ecg: NaN, kRespondeu: 'z', dialisavel: Infinity, nivelTox: 9, gravidadeTox: -5, volume: 1e300, edemaPulmonar: 'a', diureticoRespondeu: -1, ureia: 1e9, pericardite: 'b', encefalopatia: 2 }
];
var divC = 0;
amostras.forEach(function (a) { if (JSON.stringify(win.aeiou(a)) !== JSON.stringify(ref.aeiou(a))) divC++; });
ok(divC === 0, 'engine ≡ UI: aeiou inline idêntico ao model35.js (' + divC + ' divergências)');
var divS = 0;
[[7.0, 8, 0], [7.3, 18, 0.5], [6.9, 6, 1]].forEach(function (t) { if (Math.abs(win.sevAcidose(t[0], t[1], t[2]) - ref.sevAcidose(t[0], t[1], t[2])) > 1e-12) divS++; });
[[7.5, 1, 0], [6.5, 1, 0], [6.0, 0, 1]].forEach(function (t) { if (Math.abs(win.sevEletrolitos(t[0], t[1], t[2]) - ref.sevEletrolitos(t[0], t[1], t[2])) > 1e-12) divS++; });
[[1, 1, 1], [0, 1, 1], [0.5, 0.5, 0.5]].forEach(function (t) { if (Math.abs(win.sevIntoxicacao(t[0], t[1], t[2]) - ref.sevIntoxicacao(t[0], t[1], t[2])) > 1e-12) divS++; });
[[14, 1, 0], [5, 0.5, 1], [12, 1, 0.5]].forEach(function (t) { if (Math.abs(win.sevSobrecarga(t[0], t[1], t[2]) - ref.sevSobrecarga(t[0], t[1], t[2])) > 1e-12) divS++; });
[[280, 1, 0], [250, 0, 0], [180, 0.5, 0.5]].forEach(function (t) { if (Math.abs(win.sevUremia(t[0], t[1], t[2]) - ref.sevUremia(t[0], t[1], t[2])) > 1e-12) divS++; });
ok(divS === 0, 'sev*() ≡ UI nas cinco funções (' + divS + ' divergências)');
var divL = 0;
amostras.forEach(function (a) { if (JSON.stringify(win.radarLayout(a, 640, 420)) !== JSON.stringify(ref.radarLayout(a, 640, 420))) divL++; });
ok(divL === 0, 'radarLayout ≡ UI (' + divL + ' divergências)');

// ---------- ROBUSTEZ EXTRA: ≥260 entradas malignas → engine≡UI finito em TODAS ----------
(function () {
  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  var rnd = mulberry32(0x35AE10), N = 280, div = 0, naoFin = 0;
  var MAL = [NaN, Infinity, -Infinity, 1e300, -1e300, '5', 'x', '', null, undefined, {}, [], true];
  function v() { if (rnd() < 0.55) return MAL[(rnd() * MAL.length) | 0]; return (rnd() - 0.25) * 600; }
  var REC = { indicar: 1, otimizar: 1, observar: 1 };
  for (var i = 0; i < N; i++) {
    var inp = { pH: v(), hco3: v(), acidoseRespondeu: v(), k: v(), ecg: v(), kRespondeu: v(), dialisavel: v(), nivelTox: v(), gravidadeTox: v(), volume: v(), edemaPulmonar: v(), diureticoRespondeu: v(), ureia: v(), pericardite: v(), encefalopatia: v() };
    var a = win.aeiou(inp), b = ref.aeiou(inp);
    if (JSON.stringify(a) !== JSON.stringify(b)) div++;
    if (!fin(a.sevA) || !fin(a.sevE) || !fin(a.sevI) || !fin(a.sevO) || !fin(a.sevU) || !fin(a.sevMax) || !fin(a.sevSoma)) naoFin++;
    if (!(a.recomendacao in REC)) naoFin++;
    var L = win.radarLayout(inp, 640, 420);
    if (!fin(L.cx) || !fin(L.cy) || !fin(L.R) || L.poly.length !== 5) naoFin++;
    else { for (var j = 0; j < 5; j++) { if (!fin(L.poly[j].x) || !fin(L.poly[j].y) || !fin(L.ring[j].x)) { naoFin++; break; } } }
  }
  ok(div === 0, 'robustez extra: ' + N + ' malignas engine≡UI (' + div + ' divergências)');
  ok(naoFin === 0, 'robustez extra: ' + N + ' malignas → saídas finitas/classificadas (' + naoFin + ' inválidas)');
})();

// ---------- canvas radar == radarLayout(engine) — estado inicial dos sliders ----------
function slv(id) { return +doc.getElementById(id).value; }
var initState = {};
['pH', 'hco3', 'acidoseRespondeu', 'k', 'ecg', 'kRespondeu', 'dialisavel', 'nivelTox', 'gravidadeTox', 'volume', 'edemaPulmonar', 'diureticoRespondeu', 'ureia', 'pericardite', 'encefalopatia'].forEach(function (f) { initState[f] = slv('in-' + f); });
var canvasEl = doc.getElementById('aeiou-canvas');
var rec = canvasEl.getContext('2d');
ok(rec && Array.isArray(rec.__paths), 'canvas: contexto exercido');
var Lref = ref.radarLayout(initState, canvasEl.width, canvasEl.height);
// procura o caminho do polígono de operação (5 pontos, fechado) que case com Lref.poly
function acharPoli(refPts) {
  var found = null;
  (rec.__paths || []).forEach(function (p) {
    if (p.length === refPts.length && p[0] && Math.abs(p[0].x - refPts[0].x) < 1e-4 && Math.abs(p[0].y - refPts[0].y) < 1e-4) found = p;
  });
  return found;
}
var polyPath = acharPoli(Lref.poly);
ok(polyPath !== null, 'canvas: polígono de operação pintado (' + Lref.poly.length + ' vértices)');
var pintaOk = true;
if (polyPath) { for (var i = 0; i < Lref.poly.length; i++) { var pp = polyPath[i]; if (Math.abs(pp.x - Lref.poly[i].x) > 1e-6 || Math.abs(pp.y - Lref.poly[i].y) > 1e-6) { pintaOk = false; break; } } }
ok(pintaOk, 'canvas: cada vértice do radar == radarLayout(engine) (tol 1e-6)');
var ringPath = acharPoli(Lref.ring);
ok(ringPath !== null, 'canvas: anel-limiar pintado (radarLayout.ring)');
ok((rec.__rects || []).filter(function (q) { return q.op === 'fill'; }).length >= 5, 'canvas: marcadores dos vértices pintados');

// ---------- Lab init ----------
ok(doc.getElementById('out-recomendacao').textContent !== '—' && doc.getElementById('out-recomendacao').textContent.length > 1, 'lab: out-recomendacao preenchido no init');
ok(doc.getElementById('out-disparos').textContent.length > 1, 'lab: out-disparos preenchido no init');
ok(doc.getElementById('out-sev').textContent.length > 1, 'lab: out-sev preenchido no init');
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
ok(/M35/.test(doc.querySelector('.kicker') ? doc.querySelector('.kicker').textContent : ''), 'cromo: kicker M35');
ok(doc.querySelector('nav.hex .ativo') !== null, 'cromo: hexápode ativo');
ok(/FILTRA/.test(doc.querySelector('nav.hex .ativo') ? doc.querySelector('nav.hex .ativo').textContent : ''), 'cromo: FILTRA ativo');
ok(/CRM-SP 151\.318 · Dr\. Matheus M\. Coelho · Limeira/.test(body), 'cromo: rodapé');
ok(doc.querySelector('a[href="dialisa.html"]') !== null || doc.querySelector('a[href="filtra.html"]') !== null, 'cromo: backlink');
ok(/educacional/i.test(body) && doc.querySelector('.disc') !== null, 'disclaimer educacional');

// ---------- guarda farmacológica invertida §8 ----------
ok(!/\b\d+\s?(mg|mcg|µg)\b(?!\/)/.test(body), 'guarda §8: nenhuma dose de massa solta (mg/mcg/µg)');
ok(/mEq\/L/.test(body), 'guarda §8: unidades do meio interno (mEq/L) presentes');

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
