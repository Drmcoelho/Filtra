'use strict';
/*
 * FILTRA · M29 — validador jsdom (portão do §6) — anticoagulação do circuito.
 * estrutura · engine ≡ UI (anticoagulacao, caLayout, citrato, acumuloCitrato, heparina) ·
 * o gráfico pintado no canvas ≡ caLayout() (tol 1e-6) · caso ≥5 atos · trilha ≥9 ·
 * dois bancos (ilustrado SVG/raster + textual) · figura viva ≥8 · cromo · disclaimer.
 * ROBUSTEZ EXTRA: recomputa ≥260 entradas MALIGNAS e confirma engine≡UI finito em todas.
 * Guarda farmacológica §8 (invertida): módulo DIALISA — sem dose de massa solta (mg/mcg/µg);
 * mmol/L, mmol/h, mL/h, razão e % são livres.
 */
var fs = require('fs');
var path = require('path');
var jsdom = require('jsdom');
var JSDOM = jsdom.JSDOM;

var ref = require('./model29.js');
var imgGuard = require('../lib/img-guard.js');

var oks = 0, fail = 0;
function ok(c, m) { if (c) { oks++; } else { fail++; console.error('FALHA: ' + m); } }
function fin(x) { return typeof x === 'number' && isFinite(x); }

var htmlPath = path.join(__dirname, '..', '..', 'filtra29.html');
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
  'ca-canvas',
  'in-sangramento', 'in-funcaoHepatica', 'in-citratoDose', 'in-qb', 'in-caBasal', 'in-caReposicao',
  'in-caSistBasal', 'in-heparinaDose',
  'out-modalidade', 'out-cacirc', 'out-casist', 'out-gap', 'out-carga', 'out-sangra',
  'veredito', 'instr-pearl', 'lab-pearl', 'fig-caso',
  'tutor-q', 'tutor-opts', 'tutor-fb', 'tutor-score', 'tutor-total', 'tutor-fig',
  'draw-cascata', 'draw-regional', 'draw-heparina', 'draw-gap', 'draw-homeostase'
];
ids.forEach(function (id) { ok(doc.getElementById(id) !== null, 'estrutura: #' + id + ' presente'); });
ok(doc.querySelectorAll('#tabs button').length === 6, 'estrutura: 6 abas');
ok(doc.getElementById('ca-canvas').tagName.toLowerCase() === 'canvas', 'instrumento: canvas ca-canvas');

// ---------- Conceito ----------
ok(doc.querySelectorAll('#tab-conceito svg').length >= 5, 'Conceito: ≥5 desenhos computados');
var conc = doc.getElementById('tab-conceito').textContent;
ok(/citrato/i.test(conc), 'Conceito: citrato');
ok(/heparina/i.test(conc), 'Conceito: heparina');
ok(/quela|quelaç|cofator/i.test(conc), 'Conceito: quelação do Ca²⁺ (cofator)');
ok(/regional/i.test(conc), 'Conceito: anticoagulação regional');
ok(/acúmulo|acumulo/i.test(conc), 'Conceito: acúmulo de citrato');
ok(/gap/i.test(conc) && /ionizado/i.test(conc), 'Conceito: gap Ca total/ionizado');
ok(/fígado|figado|hepátic|hepatic/i.test(conc), 'Conceito: fígado/clearance hepático');
ok(/difus|convec/i.test(doc.body.textContent), 'Conceito: substitui FUNÇÕES por física (difusão/convecção)');
ok(/homeostas/i.test(doc.body.textContent), 'Conceito: homeostasia como conceito-fio');

// ---------- caso ≥5 + trilha ≥9 ----------
ok(doc.querySelectorAll('button.act[data-rev]').length >= 5, 'caso: ≥5 atos');
ok(doc.querySelectorAll('#caso .reveal').length >= 5, 'caso: ≥5 reveláveis');
ok(doc.querySelector('#fig-caso svg') !== null, 'Caso: ilustração SVG');
ok(doc.querySelectorAll('#trilha details').length >= 9, 'trilha: ≥9 passos');

// ---------- engine ≡ UI ----------
ok(typeof win.anticoagulacao === 'function', 'UI expõe anticoagulacao()');
ok(typeof win.caLayout === 'function', 'UI expõe caLayout()');
ok(typeof win.citrato === 'function' && typeof win.acumuloCitrato === 'function' && typeof win.heparina === 'function', 'UI expõe citrato()/acumuloCitrato()/heparina()');
var amostras = [
  {}, { sangramento: 0.8, funcaoHepatica: 1.0, citratoDose: 2.0, qb: 150 },
  { sangramento: 0.7, funcaoHepatica: 0.1, citratoDose: 4, qb: 220 }, { sangramento: 0.1, heparinaDose: 0.7 },
  { sangramento: 0.9, funcaoHepatica: 0.9, citratoDose: 2 }, { citratoDose: 0.8, sangramento: 0.7 },
  { funcaoHepatica: 0.05, citratoDose: 5, qb: 300, caReposicao: 0.5 }, { caBasal: 1.3, citratoDose: 3 },
  { sangramento: null, funcaoHepatica: 'x', citratoDose: -2, qb: 1e9, caBasal: NaN, caReposicao: Infinity, caSistBasal: 'y', heparinaDose: 1e300 }
];
var divC = 0;
amostras.forEach(function (a) { if (JSON.stringify(win.anticoagulacao(a)) !== JSON.stringify(ref.anticoagulacao(a))) divC++; });
ok(divC === 0, 'engine ≡ UI: anticoagulacao inline idêntico ao model29.js (' + divC + ' divergências)');
var divCit = 0;
[[2, 150, 1.15], [4, 220, 1.1], [0.8, 150, 1.15], [6, 300, 1.3]].forEach(function (t) {
  if (JSON.stringify(win.citrato({ citratoDose: t[0], qb: t[1], caBasal: t[2] })) !== JSON.stringify(ref.citrato({ citratoDose: t[0], qb: t[1], caBasal: t[2] }))) divCit++;
});
ok(divCit === 0, 'citrato ≡ UI (' + divCit + ' divergências)');
var divHep = 0;
[[0.7, 0.8], [0.1, 0.2], [1, 0], [0, 0.5]].forEach(function (t) {
  if (JSON.stringify(win.heparina({ dose: t[0], sangramentoBasal: t[1] })) !== JSON.stringify(ref.heparina({ dose: t[0], sangramentoBasal: t[1] }))) divHep++;
});
ok(divHep === 0, 'heparina ≡ UI (' + divHep + ' divergências)');
var divL = 0;
amostras.forEach(function (a) { if (JSON.stringify(win.caLayout(a, 900, 360)) !== JSON.stringify(ref.caLayout(a, 900, 360))) divL++; });
ok(divL === 0, 'caLayout ≡ UI (' + divL + ' divergências)');

// ---------- ROBUSTEZ EXTRA: ≥260 entradas malignas → engine≡UI finito em TODAS ----------
(function () {
  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  var rnd = mulberry32(0x29C1A7), N = 280, div = 0, naoFin = 0;
  var MAL = [NaN, Infinity, -Infinity, 1e300, -1e300, '5', 'x', '', null, undefined, {}, [], true];
  function v() { if (rnd() < 0.55) return MAL[(rnd() * MAL.length) | 0]; return (rnd() - 0.25) * 500; }
  for (var i = 0; i < N; i++) {
    var inp = { sangramento: v(), funcaoHepatica: v(), citratoDose: v(), qb: v(), caBasal: v(), caReposicao: v(), caSistBasal: v(), heparinaDose: v() };
    var a = win.anticoagulacao(inp), b = ref.anticoagulacao(inp);
    if (JSON.stringify(a) !== JSON.stringify(b)) div++;
    if (!fin(a.caCircuito) || !fin(a.caSistemico) || !fin(a.gap) || !fin(a.cargaCitrato) || !fin(a.ttpaRatio) || !fin(a.riscoSangramento)) naoFin++;
    if (['citrato', 'heparina'].indexOf(a.modalidade) < 0) naoFin++;
    var L = win.caLayout(inp, 900, 360);
    if (!fin(L.current.x) || !fin(L.current.y) || !fin(L.current.gap) || L.pts.length !== 49 || L.stations.length !== 3) naoFin++;
  }
  ok(div === 0, 'robustez extra: ' + N + ' malignas engine≡UI (' + div + ' divergências)');
  ok(naoFin === 0, 'robustez extra: ' + N + ' malignas → saídas finitas/classificadas (' + naoFin + ' inválidas)');
})();

// ---------- canvas curva == caLayout(engine) — estado inicial dos sliders ----------
function slv(id) { return +doc.getElementById(id).value; }
var initState = {
  sangramento: slv('in-sangramento'), funcaoHepatica: slv('in-funcaoHepatica'), citratoDose: slv('in-citratoDose'),
  qb: slv('in-qb'), caBasal: slv('in-caBasal'), caReposicao: slv('in-caReposicao'),
  caSistBasal: slv('in-caSistBasal'), heparinaDose: slv('in-heparinaDose')
};
var canvasEl = doc.getElementById('ca-canvas');
var rec = canvasEl.getContext('2d');
ok(rec && Array.isArray(rec.__paths), 'canvas: contexto exercido');
var Lref = ref.caLayout(initState, canvasEl.width, canvasEl.height);
function acharPoli(ref0) {
  var found = null;
  (rec.__paths || []).forEach(function (p) {
    if (p.length === ref0.length && p[0] && Math.abs(p[0].y - ref0[0].y) < 1e-4 && Math.abs(p[0].x - ref0[0].x) < 1e-4) found = p;
  });
  return found;
}
var gapPath = acharPoli(Lref.pts);
ok(gapPath !== null, 'canvas: polilinha do gap × função hepática pintada (' + Lref.pts.length + ' pontos)');
var pintaOk = true;
if (gapPath) { for (var i = 0; i < Lref.pts.length; i++) { var pp = gapPath[i]; if (Math.abs(pp.x - Lref.pts[i].x) > 1e-6 || Math.abs(pp.y - Lref.pts[i].y) > 1e-6) { pintaOk = false; break; } } }
ok(pintaOk, 'canvas: cada ponto da curva gap == caLayout(engine) (tol 1e-6)');
ok((rec.__rects || []).filter(function (q) { return q.op === 'fill'; }).length >= 3, 'canvas: barras das estações + marcador pintados');

// ---------- Lab init ----------
ok(doc.getElementById('out-modalidade').textContent !== '—' && doc.getElementById('out-modalidade').textContent.length > 1, 'lab: out-modalidade preenchido no init');
ok(doc.getElementById('out-cacirc').textContent.length > 1, 'lab: out-cacirc preenchido no init');
ok(doc.getElementById('out-gap').textContent.length > 1, 'lab: out-gap preenchido no init');
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
ok(/M29/.test(doc.querySelector('.kicker') ? doc.querySelector('.kicker').textContent : ''), 'cromo: kicker M29');
ok(doc.querySelector('nav.hex .ativo') !== null, 'cromo: hexápode ativo');
ok(/FILTRA/.test(doc.querySelector('nav.hex .ativo') ? doc.querySelector('nav.hex .ativo').textContent : ''), 'cromo: FILTRA ativo');
ok(/CRM-SP 151\.318 · Dr\. Matheus M\. Coelho · Limeira/.test(body), 'cromo: rodapé');
ok(doc.querySelector('a[href="dialisa.html"]') !== null || doc.querySelector('a[href="filtra.html"]') !== null, 'cromo: backlink');
ok(/educacional/i.test(body) && doc.querySelector('.disc') !== null, 'disclaimer educacional');

// ---------- guarda farmacológica invertida §8 ----------
ok(!/\b\d+\s?(mg|mcg|µg)\b(?!\/)/.test(body), 'guarda §8: nenhuma dose de massa solta (mg/mcg/µg)');
ok(/mmol\/L/.test(body), 'guarda §8: unidades do meio interno (mmol/L) presentes');
ok(/mmol\/h/.test(body) && /mL\/min/.test(body), 'guarda §8: doses de DIÁLISE por mecanismo (mmol/h, mL/min)');

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
