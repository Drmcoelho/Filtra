'use strict';
/*
 * FILTRA · M38 — validador jsdom (portão do §6) — CAPSTONE integrado DIALISA
 * estrutura · engine ≡ UI (capstone, decisionLayout, instabIndex, velocidadeIndex) ·
 * a curva pintada no canvas ≡ decisionLayout() (tol 1e-6) · caso ≥5 atos · trilha ≥9 ·
 * dois bancos (ilustrado SVG/raster + textual) · figura viva ≥8 · cromo · disclaimer.
 * ROBUSTEZ EXTRA: recomputa ≥260 entradas MALIGNAS e confirma engine≡UI finito em todas.
 * Guarda farmacológica §8 (invertida): módulo DIALISA — sem dose de massa solta (mg/mcg/µg);
 * mEq/L, mL/kg/h, mL/h, Kt/V e h são livres.
 */
var fs = require('fs');
var path = require('path');
var jsdom = require('jsdom');
var JSDOM = jsdom.JSDOM;

var ref = require('./model38.js');
var imgGuard = require('../lib/img-guard.js');

var oks = 0, fail = 0;
function ok(c, m) { if (c) { oks++; } else { fail++; console.error('FALHA: ' + m); } }
function fin(x) { return typeof x === 'number' && isFinite(x); }

var htmlPath = path.join(__dirname, '..', '..', 'filtra38.html');
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
  'decision-canvas',
  'in-instabilidade', 'in-pam', 'in-vasopressor', 'in-k', 'in-hco3', 'in-intoxicacao', 'in-volume',
  'in-ureia', 'in-sintomas', 'in-catabolismo', 'in-sangramento', 'in-pesoKg',
  'out-modalidade', 'out-dose', 'out-uf', 'out-anticoag', 'out-meio', 'out-eixos',
  'veredito', 'instr-pearl', 'lab-pearl', 'fig-caso',
  'tutor-q', 'tutor-opts', 'tutor-fb', 'tutor-score', 'tutor-total', 'tutor-fig',
  'draw-perguntas', 'draw-espaco', 'draw-prescr', 'draw-anticoag', 'draw-restaura'
];
ids.forEach(function (id) { ok(doc.getElementById(id) !== null, 'estrutura: #' + id + ' presente'); });
ok(doc.querySelectorAll('#tabs button').length === 6, 'estrutura: 6 abas');
ok(doc.getElementById('decision-canvas').tagName.toLowerCase() === 'canvas', 'instrumento: canvas decision-canvas');

// ---------- Conceito ----------
ok(doc.querySelectorAll('#tab-conceito svg').length >= 5, 'Conceito: ≥5 desenhos computados');
var conc = doc.getElementById('tab-conceito').textContent;
ok(/modalidade/i.test(conc), 'Conceito: a modalidade');
ok(/TRRC|CVVHDF/i.test(conc), 'Conceito: TRRC/CVVHDF (contínua)');
ok(/HDI/.test(conc), 'Conceito: HDI (intermitente)');
ok(/SLED/i.test(conc), 'Conceito: SLED (híbrida)');
ok(/mecanismo/i.test(conc), 'Conceito: a decisão por mecanismo');
ok(/refilling/i.test(conc) || /tolerância|tolerancia/i.test(conc), 'Conceito: UF × refilling (tolerância)');
ok(/desequil/i.test(conc), 'Conceito: desequilíbrio (M34)');
ok(/citrato/i.test(conc), 'Conceito: anticoagulação por citrato (M29)');
ok(/difus|convec/i.test(doc.body.textContent), 'Conceito: substitui FUNÇÕES por física (difusão/convecção)');
ok(/homeostas/i.test(doc.body.textContent), 'Conceito: homeostasia como conceito-fio');

// ---------- caso ≥5 + trilha ≥9 ----------
ok(doc.querySelectorAll('button.act[data-rev]').length >= 5, 'caso: ≥5 atos');
ok(doc.querySelectorAll('#caso .reveal').length >= 5, 'caso: ≥5 reveláveis');
ok(doc.querySelector('#fig-caso svg') !== null, 'Caso: ilustração SVG');
ok(doc.querySelectorAll('#trilha details').length >= 9, 'trilha: ≥9 passos');

// ---------- engine ≡ UI ----------
ok(typeof win.capstone === 'function', 'UI expõe capstone()');
ok(typeof win.decisionLayout === 'function', 'UI expõe decisionLayout()');
ok(typeof win.instabIndex === 'function' && typeof win.velocidadeIndex === 'function', 'UI expõe instabIndex()/velocidadeIndex()');
var amostras = [
  {}, { instabilidade: 0.85, pam: 55, vasopressor: 0.8, k: 6.5, sangramento: 0.7 },
  { instabilidade: 0.1, pam: 92, k: 7.5 }, { intoxicacao: 0.9, k: 5.0, pam: 88 },
  { ureia: 300, instabilidade: 0.15, pam: 88 }, { instabilidade: 0.5, pam: 68, vasopressor: 0.3, volume: 9 },
  { volume: 12, instabilidade: 0.9, pam: 50, vasopressor: 0.9 }, { cronico: 1, instabilidade: 0.1, pam: 95, k: 4.6 },
  { instabilidade: null, pam: 'x', vasopressor: -2, k: 1e9, hco3: NaN, volume: -5, ureia: 1e300, sintomas: 9, catabolismo: 'y', sangramento: Infinity, intoxicacao: 'z', pesoKg: -1 }
];
var divC = 0;
amostras.forEach(function (a) { if (JSON.stringify(win.capstone(a)) !== JSON.stringify(ref.capstone(a))) divC++; });
ok(divC === 0, 'engine ≡ UI: capstone inline idêntico ao model38.js (' + divC + ' divergências)');
var divI = 0;
[[0.8, 50, 0.7], [0.2, 90, 0], [1, 40, 1], [0, 130, 0]].forEach(function (t) { if (Math.abs(win.instabIndex(t[0], t[1], t[2]) - ref.instabIndex(t[0], t[1], t[2])) > 1e-12) divI++; });
ok(divI === 0, 'instabIndex ≡ UI (' + divI + ' divergências)');
var divV = 0;
[[6.5, 0, 0], [5.0, 0.9, 0.4], [7.5, 0, 0], [4.0, 0, 1]].forEach(function (t) { if (Math.abs(win.velocidadeIndex(t[0], t[1], t[2]) - ref.velocidadeIndex(t[0], t[1], t[2])) > 1e-12) divV++; });
ok(divV === 0, 'velocidadeIndex ≡ UI (' + divV + ' divergências)');
var divL = 0;
amostras.forEach(function (a) { if (JSON.stringify(win.decisionLayout(a, 900, 360)) !== JSON.stringify(ref.decisionLayout(a, 900, 360))) divL++; });
ok(divL === 0, 'decisionLayout ≡ UI (' + divL + ' divergências)');

// ---------- ROBUSTEZ EXTRA: ≥260 entradas malignas → engine≡UI finito em TODAS ----------
(function () {
  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  var rnd = mulberry32(0x38C0DE), N = 280, div = 0, naoFin = 0;
  var MAL = [NaN, Infinity, -Infinity, 1e300, -1e300, '5', 'x', '', null, undefined, {}, [], true];
  function v() { if (rnd() < 0.55) return MAL[(rnd() * MAL.length) | 0]; return (rnd() - 0.25) * 600; }
  for (var i = 0; i < N; i++) {
    var inp = { instabilidade: v(), pam: v(), vasopressor: v(), k: v(), hco3: v(), volume: v(), ureia: v(), sintomas: v(), catabolismo: v(), sangramento: v(), intoxicacao: v(), pesoKg: v(), cronico: v() };
    var a = win.capstone(inp), b = ref.capstone(inp);
    if (JSON.stringify(a) !== JSON.stringify(b)) div++;
    if (!fin(a.instab) || !fin(a.velocidade) || !fin(a.ufRate) || !fin(a.kCorr) || !fin(a.hco3Corr) || !fin(a.volCorr) || !fin(a.efluenteTotal)) naoFin++;
    if (['HDI', 'TRRC', 'SLED', 'DP'].indexOf(a.modalidade) < 0) naoFin++;
    var L = win.decisionLayout(inp, 900, 360);
    if (!fin(L.current.x) || !fin(L.current.y) || !fin(L.current.instab) || !fin(L.current.velocidade)) naoFin++;
  }
  ok(div === 0, 'robustez extra: ' + N + ' malignas engine≡UI (' + div + ' divergências)');
  ok(naoFin === 0, 'robustez extra: ' + N + ' malignas → saídas finitas/classificadas (' + naoFin + ' inválidas)');
})();

// ---------- canvas curva == decisionLayout(engine) — estado inicial dos sliders ----------
function slv(id) { return +doc.getElementById(id).value; }
var initState = {
  instabilidade: slv('in-instabilidade'), pam: slv('in-pam'), vasopressor: slv('in-vasopressor'),
  k: slv('in-k'), hco3: slv('in-hco3'), intoxicacao: slv('in-intoxicacao'), volume: slv('in-volume'),
  ureia: slv('in-ureia'), sintomas: slv('in-sintomas'), catabolismo: slv('in-catabolismo'),
  sangramento: slv('in-sangramento'), pesoKg: slv('in-pesoKg')
};
var canvasEl = doc.getElementById('decision-canvas');
var rec = canvasEl.getContext('2d');
ok(rec && Array.isArray(rec.__paths), 'canvas: contexto exercido');
var Lref = ref.decisionLayout(initState, canvasEl.width, canvasEl.height);
function acharPoli(ref0) {
  var found = null;
  (rec.__paths || []).forEach(function (p) {
    if (p.length === ref0.length && p[0] && Math.abs(p[0].y - ref0[0].y) < 1e-4 && Math.abs(p[0].x - ref0[0].x) < 1e-4) found = p;
  });
  return found;
}
var frontPath = acharPoli(Lref.pts);
ok(frontPath !== null, 'canvas: polilinha da fronteira de decisão pintada (' + Lref.pts.length + ' pontos)');
var pintaOk = true;
if (frontPath) { for (var i = 0; i < Lref.pts.length; i++) { var pp = frontPath[i]; if (Math.abs(pp.x - Lref.pts[i].x) > 1e-6 || Math.abs(pp.y - Lref.pts[i].y) > 1e-6) { pintaOk = false; break; } } }
ok(pintaOk, 'canvas: cada ponto da fronteira == decisionLayout(engine) (tol 1e-6)');
ok((rec.__rects || []).filter(function (q) { return q.op === 'fill'; }).length >= 1, 'canvas: marcador de operação pintado');

// ---------- Lab init ----------
ok(doc.getElementById('out-modalidade').textContent !== '—' && doc.getElementById('out-modalidade').textContent.length > 1, 'lab: out-modalidade preenchido no init');
ok(doc.getElementById('out-dose').textContent.length > 1, 'lab: out-dose preenchido no init');
ok(doc.getElementById('out-meio').textContent.length > 1, 'lab: out-meio preenchido no init');
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
ok(/M38/.test(doc.querySelector('.kicker') ? doc.querySelector('.kicker').textContent : ''), 'cromo: kicker M38');
ok(doc.querySelector('nav.hex .ativo') !== null, 'cromo: hexápode ativo');
ok(/FILTRA/.test(doc.querySelector('nav.hex .ativo') ? doc.querySelector('nav.hex .ativo').textContent : ''), 'cromo: FILTRA ativo');
ok(/CRM-SP 151\.318 · Dr\. Matheus M\. Coelho · Limeira/.test(body), 'cromo: rodapé');
ok(doc.querySelector('a[href="dialisa.html"]') !== null || doc.querySelector('a[href="filtra.html"]') !== null, 'cromo: backlink');
ok(/educacional/i.test(body) && doc.querySelector('.disc') !== null, 'disclaimer educacional');

// ---------- guarda farmacológica invertida §8 ----------
ok(!/\b\d+\s?(mg|mcg|µg)\b(?!\/)/.test(body), 'guarda §8: nenhuma dose de massa solta (mg/mcg/µg)');
ok(/mEq\/L/.test(body), 'guarda §8: unidades do meio interno (mEq/L) presentes');
ok(/mL\/kg\/h/.test(body) && /Kt\/V/.test(body), 'guarda §8: doses de DIÁLISE por mecanismo (mL/kg/h, Kt/V)');

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
