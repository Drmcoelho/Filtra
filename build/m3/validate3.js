'use strict';
/*
 * FILTRA · M3 — validador jsdom (portão do §6)
 * Confere: estrutura (IDs/abas) · engine ≡ UI (barreira, sieving, sievingLayout) ·
 * a curva θ×raio pintada no canvas ≡ sievingLayout() · camada interativa · os dois
 * bancos do tutor (ilustrado c/ SVG ou raster + textual) · figura viva · cromo · disclaimer.
 * M3 é fisiologia pura (sem doses): guarda recusa mg/mcg/µg soltos.
 */
var fs = require('fs');
var path = require('path');
var jsdom = require('jsdom');
var JSDOM = jsdom.JSDOM;

var ref = require('./model3.js');
var imgGuard = require('../lib/img-guard.js');

var oks = 0, fail = 0;
function ok(c, m) { if (c) { oks++; } else { fail++; console.error('FALHA: ' + m); } }

var htmlPath = path.join(__dirname, '..', '..', 'filtra3.html');
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

var vc = new jsdom.VirtualConsole();
vc.sendTo(console);
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

// ─── estrutura ───────────────────────────────────────────────────────────────
var ids = [
  'tabs', 'tab-conceito', 'tab-caso', 'tab-trilha', 'tab-instrumento', 'tab-lab', 'tab-avaliacao',
  'sieve-canvas',
  'in-raio', 'in-carga', 'in-carga-int', 'in-poro', 'in-tm', 'in-k', 'in-area', 'in-pgc', 'in-pbc', 'in-pi',
  'out-kf', 'out-nfp', 'out-tfg', 'out-theta', 'out-alb', 'out-igg', 'out-sel', 'out-prot', 'out-classe',
  'veredito', 'instr-pearl', 'lab-pearl', 'fig-caso',
  'tutor-q', 'tutor-opts', 'tutor-fb', 'tutor-score', 'tutor-total', 'tutor-fig',
  'draw-schema', 'draw-sieve', 'draw-kf'
];
ids.forEach(function (id) { ok(doc.getElementById(id) !== null, 'estrutura: #' + id + ' presente'); });
ok(doc.querySelectorAll('#tabs button').length === 6, 'estrutura: 6 abas');
ok(doc.getElementById('sieve-canvas').tagName.toLowerCase() === 'canvas', 'instrumento: canvas sieve-canvas');

// ─── aba CONCEITO ────────────────────────────────────────────────────────────
ok(doc.querySelectorAll('#tab-conceito svg').length >= 3, 'Conceito: ≥3 desenhos computados (schema, sieve, kf)');
var conc = doc.getElementById('tab-conceito').textContent;
ok(/carga/.test(conc) && /tamanho/.test(conc), 'Conceito: seletividade por tamanho e carga');
ok(/Kf/.test(conc), 'Conceito: Kf mencionado');
ok(/podócito|pedicelo|nefrina/.test(conc), 'Conceito: podócito/diafragma de fenda');
ok(/seletiva/.test(conc), 'Conceito: proteinúria seletiva × não-seletiva');
ok(/homeostas/i.test(conc), 'Conceito: homeostasia como conceito-fio');

// ─── caso (≥8 atos) + trilha (≥13) ───────────────────────────────────────────
ok(doc.querySelectorAll('button.act[data-rev]').length >= 8, 'caso: ≥8 atos com revelar');
ok(doc.querySelectorAll('#caso .reveal').length >= 8, 'caso: ≥8 blocos reveláveis');
ok(doc.querySelector('#fig-caso svg') !== null, 'Caso: ilustração SVG presente (#fig-caso)');
ok(doc.querySelectorAll('#trilha details').length >= 13, 'trilha: ≥13 passos socráticos');

// ─── engine ≡ UI: barreira / sieving / sievingLayout ─────────────────────────
ok(typeof win.barreira === 'function', 'UI expõe barreira()');
ok(typeof win.sieving === 'function', 'UI expõe sieving()');
ok(typeof win.sievingLayout === 'function', 'UI expõe sievingLayout()');
var amostras = [
  {}, { raioMol: 14, carga: 'neutro' }, { raioMol: 55, carga: 'anion' },
  { cargaIntacta: false }, { poroDano: 0.8 }, { areaFrac: 0.35 }, { kPerm: 0.6 },
  { tmFrac: 0.2 }, { P_BC: 35 }, { carga: 'cation', raioMol: 30 },
  { raioMol: null, carga: 'x', poroDano: 5, P_GC: NaN }
];
var divB = 0;
amostras.forEach(function (a) { if (JSON.stringify(win.barreira(a)) !== JSON.stringify(ref.barreira(a))) divB++; });
ok(divB === 0, 'engine ≡ UI: barreira inline idêntico ao model3.js (' + divB + ' divergências)');
var divS = 0;
[[14, 'neutro', true, 0], [36, 'anion', true, 0], [36, 'anion', false, 0], [55, 'anion', true, 0.8], [30, 'cation', true, 0.2]].forEach(function (t) {
  if (Math.abs(win.sieving(t[0], t[1], t[2], t[3]) - ref.sieving(t[0], t[1], t[2], t[3])) > 1e-12) divS++;
});
ok(divS === 0, 'sieving ≡ UI (' + divS + ' divergências)');
var divL = 0;
amostras.forEach(function (a) { if (JSON.stringify(win.sievingLayout(a, 900, 360)) !== JSON.stringify(ref.sievingLayout(a, 900, 360))) divL++; });
ok(divL === 0, 'sievingLayout ≡ UI (' + divL + ' divergências)');

// ─── canvas DESENHOU a curva θ×raio == sievingLayout(engine) ─────────────────
var canvasEl = doc.getElementById('sieve-canvas');
var rec = canvasEl.getContext('2d');
ok(rec && Array.isArray(rec.__paths), 'canvas: contexto exercido (gravador ativo)');
var initState = { raioMol: 36, carga: 'anion', cargaIntacta: true, poroDano: 0 };
var Lref = ref.sievingLayout(initState, canvasEl.width, canvasEl.height);
var curvePath = null;
(rec.__paths || []).forEach(function (p) {
  if (p.length === Lref.pts.length && p[0] && Math.abs(p[0].y - Lref.pts[0].y) < 1e-4) curvePath = p;
});
ok(curvePath !== null, 'canvas: polilinha θ pintada (' + Lref.pts.length + ' pontos)');
var pintaOk = true;
if (curvePath) {
  for (var i = 0; i < Lref.pts.length; i++) {
    var pp = curvePath[i];
    if (Math.abs(pp.x - Lref.pts[i].x) > 1e-4 || Math.abs(pp.y - Lref.pts[i].y) > 1e-4) { pintaOk = false; break; }
  }
}
ok(pintaOk, 'canvas: cada ponto da curva θ pintado == sievingLayout(engine)');
var fills = (rec.__rects || []).filter(function (q) { return q.op === 'fill'; });
ok(fills.length >= 1, 'canvas: marcador do probe pintado');
ok((rec.__texts || []).join(' ').indexOf('θ') >= 0, 'canvas: rótulo θ presente');

// ─── aba Lab: saídas preenchidas no init ─────────────────────────────────────
ok(doc.getElementById('out-tfg').textContent !== '—', 'lab: out-tfg preenchido no init');
ok(doc.getElementById('out-prot').textContent !== '—', 'lab: out-prot preenchido no init');
ok(doc.getElementById('out-classe').textContent !== '—', 'lab: out-classe preenchido no init');
ok(doc.getElementById('veredito').textContent.length > 1, 'lab: veredito computado');
ok(doc.getElementById('lab-pearl').textContent.length > 1, 'lab: pérola computada');
ok(doc.querySelectorAll('.presets button[data-preset]').length >= 4, 'lab: ≥4 botões de cenário (presets)');

// ─── tutor: dois blocos ──────────────────────────────────────────────────────
function malformados(bank) {
  var n = 0;
  (bank || []).forEach(function (it) {
    if (!it || !Array.isArray(it.o) || it.o.length < 2) n++;
    else if (typeof it.c !== 'number' || it.c < 0 || it.c >= it.o.length) n++;
    else if (!it.e || String(it.e).length < 3) n++;
  });
  return n;
}
var TI = win.TUTOR_ILUSTRADO, TT = win.TUTOR_TEXTUAL;
ok(Array.isArray(TI) && TI.length >= 10, 'tutor: bloco ILUSTRADO ≥10 (tem ' + (TI ? TI.length : 0) + ')');
ok(Array.isArray(TT) && TT.length >= 10, 'tutor: bloco TEXTUAL ≥10 (tem ' + (TT ? TT.length : 0) + ')');
ok(malformados(TI) === 0, 'tutor ilustrado: itens bem-formados');
ok(malformados(TT) === 0, 'tutor textual: itens bem-formados');
var semFig = 0, comImg = 0;
(TI || []).forEach(function (it) {
  if (typeof it.fig !== 'function') { semFig++; return; }
  var s = ''; try { s = String(it.fig()); } catch (e) { s = ''; }
  var ehSvg = /<svg[\s>]/.test(s) && /<(rect|circle|line|path|text)/.test(s);
  var img = s.match(/<img[^>]+src=["']([^"']+)["']/i);
  var ehImg = img ? (!/^https?:/i.test(img[1]) && fs.existsSync(path.join(__dirname, '..', '..', img[1]))) : false;
  if (!ehSvg && !ehImg) semFig++;
  if (ehImg) comImg++;
});
ok(semFig === 0, 'tutor ilustrado: toda questão traz ilustração (SVG ou raster real) (' + semFig + ' sem)');
ok(comImg >= 1, 'tutor ilustrado: usa figuras-raster nos exercícios (' + comImg + ')');
ok(doc.getElementById('tutor-fig') !== null && doc.querySelector('#tutor-fig svg') !== null,
  'Avaliação: ilustração renderizada no DOM (#tutor-fig svg)');
ok(doc.querySelectorAll('#banktabs button').length === 2, 'Avaliação: dois blocos');

// ─── cromo + disclaimer ──────────────────────────────────────────────────────
var body = doc.body.textContent;
ok(/FILTRA/.test(doc.querySelector('.kicker') ? doc.querySelector('.kicker').textContent : ''), 'cromo: kicker FILTRA');
ok(doc.querySelector('nav.hex .ativo') !== null, 'cromo: hexápode com braço ativo');
ok(/CRM-SP 151\.318 · Dr\. Matheus M\. Coelho · Limeira/.test(body), 'cromo: rodapé de série');
ok(doc.querySelector('a[href="filtra.html"]') !== null, 'cromo: backlink relativo ao índice');
ok(/educacional/i.test(body) && doc.querySelector('.disc') !== null, 'disclaimer educacional presente');

// ─── M3 é fisiologia pura: sem doses (mg/mcg/µg) soltas ──────────────────────
ok(!/\b\d+\s?(mg|mcg|µg)\b/.test(body), 'M3 sem doses (a farmacologia dosada entra no túbulo, M5+)');

// ─── offline + figura viva ───────────────────────────────────────────────────
ok(imgGuard.remoteImgs(doc).length === 0, 'offline: nenhum <img> remoto (fotos só de assets/ local)');
var figs = Array.prototype.slice.call(doc.querySelectorAll('figure.fviva'));
ok(figs.length >= 8, 'figura viva: ≥8 figuras inline (tem ' + figs.length + ')');
ok(!doc.querySelector('.galeria'), 'figura viva: sem mural .galeria (figuras dispersas)');
var noConceito = doc.querySelectorAll('#tab-conceito figure.fviva').length;
ok(noConceito >= 8, 'figura viva: ≥8 figuras dentro da aba Conceito (tem ' + noConceito + ')');
var faltam = figs.filter(function (fg) { var im = fg.querySelector('img'); var s = im ? (im.getAttribute('src') || '') : ''; return !s || !fs.existsSync(path.join(__dirname, '..', '..', s)); });
ok(faltam.length === 0, 'figura viva: todos os arquivos existem em assets/ (' + faltam.length + ' faltando)');
var semAlt = figs.filter(function (fg) { var im = fg.querySelector('img'); return !im || !((im.getAttribute('alt') || '').trim()); });
ok(semAlt.length === 0, 'figura viva: todo <img> tem alt descritivo');
var semCap = figs.filter(function (fg) { var cap = fg.querySelector('figcaption'); return !cap || (cap.textContent || '').trim().length < 30; });
ok(semCap.length === 0, 'figura viva: toda figura tem legenda que ensina (≥30 chars)');
ok(/Fig\.\s*\d/.test(html), 'figura viva: figuras referenciadas no texto ("Fig. N")');

console.log(oks + ' OK · ' + fail + ' falhas');
process.exit(fail > 0 ? 1 : 0);
