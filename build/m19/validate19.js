'use strict';
/*
 * FILTRA · M19 — validador jsdom (portão do §6) — princípios físicos do transporte
 * estrutura · engine ≡ UI (transporte, clearanceLayout, difusao, conveccao, ultrafiltracao,
 * adsorcao, difCoef, sievingCoef) · a curva pintada no canvas ≡ clearanceLayout() (tol 1e-6) ·
 * caso ≥5 atos · trilha ≥9 · dois bancos (ilustrado SVG/raster + textual) · figura viva ≥8 ·
 * cromo · disclaimer.
 * ROBUSTEZ EXTRA: recomputa ≥260 entradas MALIGNAS e confirma engine≡UI finito em todas.
 * Guarda farmacológica §8 (invertida): módulo DIALISA — sem dose de massa solta (mg/mcg/µg);
 * mEq/L, mL/min, mL/h, mmHg, Da/kDa são livres.
 */
var fs = require('fs');
var path = require('path');
var jsdom = require('jsdom');
var JSDOM = jsdom.JSDOM;

var ref = require('./model19.js');
var imgGuard = require('../lib/img-guard.js');

var oks = 0, fail = 0;
function ok(c, m) { if (c) { oks++; } else { fail++; console.error('FALHA: ' + m); } }
function fin(x) { return typeof x === 'number' && isFinite(x); }

var htmlPath = path.join(__dirname, '..', '..', 'filtra19.html');
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
  'in-pm', 'in-gradConc', 'in-conc', 'in-area', 'in-qd', 'in-cutoff', 'in-modo', 'in-ufRate',
  'in-kuf', 'in-pHidro', 'in-pOnc', 'in-cap',
  'out-classe', 'out-dif', 'out-conv', 'out-soluto', 'out-uf', 'out-ads',
  'veredito', 'instr-pearl', 'lab-pearl', 'fig-caso',
  'tutor-q', 'tutor-opts', 'tutor-fb', 'tutor-score', 'tutor-total', 'tutor-fig',
  'draw-difusao', 'draw-conveccao', 'draw-clearance', 'draw-uf', 'draw-adsorcao'
];
ids.forEach(function (id) { ok(doc.getElementById(id) !== null, 'estrutura: #' + id + ' presente'); });
ok(doc.querySelectorAll('#tabs button').length === 6, 'estrutura: 6 abas');
ok(doc.getElementById('clearance-canvas').tagName.toLowerCase() === 'canvas', 'instrumento: canvas clearance-canvas');

// ---------- Conceito ----------
ok(doc.querySelectorAll('#tab-conceito svg').length >= 5, 'Conceito: ≥5 desenhos computados');
var conc = doc.getElementById('tab-conceito').textContent;
ok(/difus/i.test(conc), 'Conceito: difusão');
ok(/convec/i.test(conc), 'Conceito: convecção');
ok(/ultrafiltra/i.test(conc), 'Conceito: ultrafiltração');
ok(/adsor/i.test(conc), 'Conceito: adsorção');
ok(/TMP/.test(conc), 'Conceito: TMP (pressão transmembrana)');
ok(/sieving|peneira/i.test(conc), 'Conceito: sieving/peneiramento');
ok(/peso molecular|PM/i.test(conc), 'Conceito: peso molecular');
ok(/cutoff/i.test(conc), 'Conceito: cutoff da membrana');
ok(/homeostas/i.test(doc.body.textContent), 'Conceito: homeostasia como conceito-fio');
ok(/substitui.+fun/i.test(doc.body.textContent), 'Conceito: substitui FUNÇÕES por física');

// ---------- caso ≥5 + trilha ≥9 ----------
ok(doc.querySelectorAll('button.act[data-rev]').length >= 5, 'caso: ≥5 atos');
ok(doc.querySelectorAll('#caso .reveal').length >= 5, 'caso: ≥5 reveláveis');
ok(doc.querySelector('#fig-caso svg') !== null, 'Caso: ilustração SVG');
ok(doc.querySelectorAll('#trilha details').length >= 9, 'trilha: ≥9 passos');

// ---------- engine ≡ UI ----------
ok(typeof win.transporte === 'function', 'UI expõe transporte()');
ok(typeof win.clearanceLayout === 'function', 'UI expõe clearanceLayout()');
ok(typeof win.difusao === 'function' && typeof win.conveccao === 'function', 'UI expõe difusao()/conveccao()');
ok(typeof win.ultrafiltracao === 'function' && typeof win.adsorcao === 'function', 'UI expõe ultrafiltracao()/adsorcao()');
ok(typeof win.difCoef === 'function' && typeof win.sievingCoef === 'function', 'UI expõe difCoef()/sievingCoef()');
var amostras = [
  {}, { pm: 11800, ufRate: 50, modo: 0.6 }, { pm: 60, modo: 0 }, { pm: 66000, ufRate: 40 },
  { pHidro: 20, pOnc: 25, kuf: 30 }, { pHidro: 120, pOnc: 25, kuf: 40 }, { modo: 1, ufRate: 80 },
  { pm: 8000, modo: 0.5, ufRate: 50, conc: 4, cap: 200 },
  { pm: null, gradConc: 'x', conc: -2, area: 1e9, qd: NaN, cutoff: Infinity, modo: 9, ufRate: 1e300, kuf: 'z', pHidro: -5, pOnc: 99, cap: 'y' }
];
var divC = 0;
amostras.forEach(function (a) { if (JSON.stringify(win.transporte(a)) !== JSON.stringify(ref.transporte(a))) divC++; });
ok(divC === 0, 'engine ≡ UI: transporte inline idêntico ao model19.js (' + divC + ' divergências)');
var divD = 0;
[60, 1000, 11800, 70000, 300].forEach(function (pm) { if (Math.abs(win.difCoef(pm) - ref.difCoef(pm)) > 1e-12) divD++; });
ok(divD === 0, 'difCoef ≡ UI (' + divD + ' divergências)');
var divS = 0;
[[60, 15000], [5000, 15000], [15000, 15000], [40000, 15000], [11800, 25000]].forEach(function (t) { if (Math.abs(win.sievingCoef(t[0], t[1]) - ref.sievingCoef(t[0], t[1])) > 1e-12) divS++; });
ok(divS === 0, 'sievingCoef ≡ UI (' + divS + ' divergências)');
var divU = 0;
[[30, 60, 25], [30, 20, 25], [50, 120, 25], [0, 80, 25]].forEach(function (t) { if (JSON.stringify(win.ultrafiltracao({ kuf: t[0], pHidro: t[1], pOnc: t[2] })) !== JSON.stringify(ref.ultrafiltracao({ kuf: t[0], pHidro: t[1], pOnc: t[2] }))) divU++; });
ok(divU === 0, 'ultrafiltracao ≡ UI (' + divU + ' divergências)');
var divL = 0;
amostras.forEach(function (a) { if (JSON.stringify(win.clearanceLayout(a, 900, 360)) !== JSON.stringify(ref.clearanceLayout(a, 900, 360))) divL++; });
ok(divL === 0, 'clearanceLayout ≡ UI (' + divL + ' divergências)');

// ---------- ROBUSTEZ EXTRA: ≥260 entradas malignas → engine≡UI finito em TODAS ----------
(function () {
  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  var rnd = mulberry32(0x19D1A), N = 280, div = 0, naoFin = 0;
  var MAL = [NaN, Infinity, -Infinity, 1e300, -1e300, '5', 'x', '', null, undefined, {}, [], true];
  function v() { if (rnd() < 0.55) return MAL[(rnd() * MAL.length) | 0]; return (rnd() - 0.25) * 60000; }
  for (var i = 0; i < N; i++) {
    var inp = { pm: v(), gradConc: v(), conc: v(), area: v(), qd: v(), cutoff: v(), modo: v(), ufRate: v(), kuf: v(), pHidro: v(), pOnc: v(), cap: v(), kd: v() };
    var a = win.transporte(inp), b = ref.transporte(inp);
    if (JSON.stringify(a) !== JSON.stringify(b)) div++;
    if (!fin(a.dCoef) || !fin(a.clearDif) || !fin(a.sieving) || !fin(a.clearConv) || !fin(a.qf) || !fin(a.clearSoluto) || !fin(a.adsSat)) naoFin++;
    if (['difusao', 'conveccao'].indexOf(a.dominante) < 0) naoFin++;
    if (['pequeno', 'medio', 'grande'].indexOf(a.classe) < 0) naoFin++;
    var L = win.clearanceLayout(inp, 900, 360);
    if (!fin(L.current.x) || !fin(L.current.yDif) || !fin(L.current.yConv) || L.ptsDif.length !== 61 || L.ptsConv.length !== 61) naoFin++;
  }
  ok(div === 0, 'robustez extra: ' + N + ' malignas engine≡UI (' + div + ' divergências)');
  ok(naoFin === 0, 'robustez extra: ' + N + ' malignas → saídas finitas/classificadas (' + naoFin + ' inválidas)');
})();

// ---------- canvas curva == clearanceLayout(engine) — estado inicial dos sliders ----------
function slv(id) { return +doc.getElementById(id).value; }
var initState = {
  pm: slv('in-pm'), gradConc: slv('in-gradConc'), conc: slv('in-conc'), area: slv('in-area'),
  qd: slv('in-qd'), cutoff: slv('in-cutoff'), modo: slv('in-modo'), ufRate: slv('in-ufRate'),
  kuf: slv('in-kuf'), pHidro: slv('in-pHidro'), pOnc: slv('in-pOnc'), cap: slv('in-cap'), kd: 10
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
var difPath = acharPoli(Lref.ptsDif);
ok(difPath !== null, 'canvas: polilinha difusiva pintada (' + Lref.ptsDif.length + ' pontos)');
var pintaDif = true;
if (difPath) { for (var i = 0; i < Lref.ptsDif.length; i++) { var pp = difPath[i]; if (Math.abs(pp.x - Lref.ptsDif[i].x) > 1e-6 || Math.abs(pp.y - Lref.ptsDif[i].y) > 1e-6) { pintaDif = false; break; } } }
ok(pintaDif, 'canvas: cada ponto difusivo == clearanceLayout(engine) (tol 1e-6)');
var convPath = acharPoli(Lref.ptsConv);
ok(convPath !== null, 'canvas: polilinha convectiva pintada (' + Lref.ptsConv.length + ' pontos)');
var pintaConv = true;
if (convPath) { for (var j = 0; j < Lref.ptsConv.length; j++) { var qq = convPath[j]; if (Math.abs(qq.x - Lref.ptsConv[j].x) > 1e-6 || Math.abs(qq.y - Lref.ptsConv[j].y) > 1e-6) { pintaConv = false; break; } } }
ok(pintaConv, 'canvas: cada ponto convectivo == clearanceLayout(engine) (tol 1e-6)');
ok((rec.__rects || []).filter(function (q) { return q.op === 'fill'; }).length >= 1, 'canvas: marcador do soluto pintado');

// ---------- Lab init ----------
ok(doc.getElementById('out-classe').textContent !== '—' && doc.getElementById('out-classe').textContent.length > 1, 'lab: out-classe preenchido no init');
ok(doc.getElementById('out-dif').textContent.length > 1, 'lab: out-dif preenchido no init');
ok(doc.getElementById('out-uf').textContent.length > 1, 'lab: out-uf preenchido no init');
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
ok(/M19/.test(doc.querySelector('.kicker') ? doc.querySelector('.kicker').textContent : ''), 'cromo: kicker M19');
ok(doc.querySelector('nav.hex .ativo') !== null, 'cromo: hexápode ativo');
ok(/FILTRA/.test(doc.querySelector('nav.hex .ativo') ? doc.querySelector('nav.hex .ativo').textContent : ''), 'cromo: FILTRA ativo');
ok(/CRM-SP 151\.318 · Dr\. Matheus M\. Coelho · Limeira/.test(body), 'cromo: rodapé');
ok(doc.querySelector('a[href="dialisa.html"]') !== null || doc.querySelector('a[href="filtra.html"]') !== null, 'cromo: backlink');
ok(/educacional/i.test(body) && doc.querySelector('.disc') !== null, 'disclaimer educacional');

// ---------- guarda farmacológica invertida §8 ----------
ok(!/\b\d+\s?(mg|mcg|µg)\b(?!\/)/.test(body), 'guarda §8: nenhuma dose de massa solta (mg/mcg/µg)');
ok(/mEq\/L/.test(body), 'guarda §8: unidades do meio interno (mEq/L) presentes');
ok(/mL\/min/.test(body) && /mmHg/.test(body), 'guarda §8: grandezas físicas da diálise (mL/min, mmHg)');

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
