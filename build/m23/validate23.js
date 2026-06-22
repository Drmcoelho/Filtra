'use strict';
/*
 * FILTRA · M23 — validador jsdom (portão do §6) — Ultrafiltração e balanço de volume
 * estrutura · engine ≡ UI (ultrafiltracao, rbvLayout, refilling) · a curva pintada
 * no canvas ≡ rbvLayout() (tol 1e-6) · caso ≥5 atos · trilha ≥9 · dois bancos
 * (ilustrado SVG/raster + textual) · figura viva ≥8 · cromo · disclaimer.
 * ROBUSTEZ EXTRA: recomputa ≥200 entradas MALIGNAS e confirma engine≡UI finito.
 * Guarda farmacológica §8 (invertida): módulo DIALISA — sem dose de massa solta
 * (mg/mcg/µg); mEq/L, mL/h, mL/kg/h, L, kg, h são livres.
 */
var fs = require('fs');
var path = require('path');
var jsdom = require('jsdom');
var JSDOM = jsdom.JSDOM;

var ref = require('./model23.js');
var imgGuard = require('../lib/img-guard.js');

var oks = 0, fail = 0;
function ok(c, m) { if (c) { oks++; } else { fail++; console.error('FALHA: ' + m); } }
function fin(x) { return typeof x === 'number' && isFinite(x); }

var htmlPath = path.join(__dirname, '..', '..', 'filtra23.html');
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
  'rbv-canvas',
  'in-pesoAtual', 'in-pesoSeco', 'in-sobrecargaL', 'in-tempoSessao', 'in-taxaRefillBasal', 'in-albumina', 'in-volPlasma',
  'out-uftotal', 'out-ufrate', 'out-refill', 'out-margem', 'out-rbv', 'out-erro',
  'veredito', 'instr-pearl', 'lab-pearl', 'fig-caso',
  'tutor-q', 'tutor-opts', 'tutor-fb', 'tutor-score', 'tutor-total', 'tutor-fig',
  'draw-seco', 'draw-balanco', 'draw-rbv', 'draw-taxa', 'draw-hipo'
];
ids.forEach(function (id) { ok(doc.getElementById(id) !== null, 'estrutura: #' + id + ' presente'); });
ok(doc.querySelectorAll('#tabs button').length === 6, 'estrutura: 6 abas');
ok(doc.getElementById('rbv-canvas').tagName.toLowerCase() === 'canvas', 'instrumento: canvas rbv-canvas');

// ---------- Conceito ----------
ok(doc.querySelectorAll('#tab-conceito svg').length >= 5, 'Conceito: ≥5 desenhos computados');
var conc = doc.getElementById('tab-conceito').textContent;
ok(/peso seco/i.test(conc), 'Conceito: o peso seco');
ok(/refilling/i.test(conc), 'Conceito: o refilling');
ok(/ultrafiltra|\bUF\b/i.test(conc), 'Conceito: ultrafiltração / UF');
ok(/RBV/.test(conc), 'Conceito: RBV');
ok(/stunning/i.test(conc), 'Conceito: stunning miocárdico');
ok(/hipotens/i.test(conc), 'Conceito: hipotensão intradialítica');
ok(/homeostas/i.test(doc.body.textContent), 'Conceito: homeostasia como conceito-fio');

// ---------- caso ≥5 + trilha ≥9 ----------
ok(doc.querySelectorAll('button.act[data-rev]').length >= 5, 'caso: ≥5 atos');
ok(doc.querySelectorAll('#caso .reveal').length >= 5, 'caso: ≥5 reveláveis');
ok(doc.querySelector('#fig-caso svg') !== null, 'Caso: ilustração SVG');
ok(doc.querySelectorAll('#trilha details').length >= 9, 'trilha: ≥9 passos');

// ---------- engine ≡ UI ----------
ok(typeof win.ultrafiltracao === 'function', 'UI expõe ultrafiltracao()');
ok(typeof win.rbvLayout === 'function', 'UI expõe rbvLayout()');
ok(typeof win.refilling === 'function', 'UI expõe refilling()');
var amostras = [
  {}, { pesoAtual: 80, pesoSeco: 75, sobrecargaL: 5, tempoSessao: 2 },
  { pesoAtual: 80, pesoSeco: 75, sobrecargaL: 5, tempoSessao: 8 },
  { pesoAtual: 78, pesoSeco: 74, sobrecargaL: 4, tempoSessao: 4, albumina: 1.8 },
  { pesoAtual: 85, pesoSeco: 75, sobrecargaL: 10, tempoSessao: 4 },
  { pesoAtual: 80, pesoSeco: 72, sobrecargaL: 4, tempoSessao: 4 },
  { pesoAtual: 73, pesoSeco: 70, sobrecargaL: 3, tempoSessao: 4 },
  { pesoAtual: null, pesoSeco: 'x', sobrecargaL: -5, tempoSessao: 1e9, taxaRefillBasal: NaN, albumina: Infinity, volPlasma: -2 }
];
var divC = 0;
amostras.forEach(function (a) { if (JSON.stringify(win.ultrafiltracao(a)) !== JSON.stringify(ref.ultrafiltracao(a))) divC++; });
ok(divC === 0, 'engine ≡ UI: ultrafiltracao inline idêntico ao model23.js (' + divC + ' divergências)');
var divR = 0;
[[3, 4, 1300, 4, 400], [1, 4, 1300, 4, 400], [4, 4, 1300, 1.8, 600], [4, 4, 300, 3.8, 50]].forEach(function (t) {
  var s = { sobrecarga: t[0], sobrecargaIni: t[1], taxaRefillBasal: t[2], albumina: t[3], deficit: t[4] };
  if (Math.abs(win.refilling(s) - ref.refilling(s)) > 1e-12) divR++;
});
ok(divR === 0, 'refilling ≡ UI (' + divR + ' divergências)');
var divL = 0;
amostras.forEach(function (a) { if (JSON.stringify(win.rbvLayout(a, 900, 360)) !== JSON.stringify(ref.rbvLayout(a, 900, 360))) divL++; });
ok(divL === 0, 'rbvLayout ≡ UI (' + divL + ' divergências)');

// ---------- ROBUSTEZ EXTRA: ≥200 entradas malignas → engine≡UI finito em TODAS ----------
(function () {
  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  var rnd = mulberry32(0x23F117), N = 240, div = 0, naoFin = 0;
  var MAL = [NaN, Infinity, -Infinity, 1e300, -1e300, '5', 'x', '', null, undefined, {}, [], true];
  function v() { if (rnd() < 0.55) return MAL[(rnd() * MAL.length) | 0]; return (rnd() - 0.25) * 400; }
  for (var i = 0; i < N; i++) {
    var inp = { pesoAtual: v(), pesoSeco: v(), sobrecargaL: v(), tempoSessao: v(), taxaRefillBasal: v(), albumina: v(), volPlasma: v() };
    var a = win.ultrafiltracao(inp), b = ref.ultrafiltracao(inp);
    if (JSON.stringify(a) !== JSON.stringify(b)) div++;
    if (!fin(a.ufRate) || !fin(a.refillCap) || !fin(a.rbvFinal) || !fin(a.rbvMin) || !fin(a.margemRefill) || !fin(a.erroSecoKg)) naoFin++;
    if (typeof a.hipotensao !== 'boolean' || typeof a.stunning !== 'boolean') naoFin++;
    var L = win.rbvLayout(inp, 900, 360);
    if (!fin(L.end.x) || !fin(L.end.y) || !fin(L.end.rbv) || !fin(L.crashY)) naoFin++;
  }
  ok(div === 0, 'robustez extra: ' + N + ' malignas engine≡UI (' + div + ' divergências)');
  ok(naoFin === 0, 'robustez extra: ' + N + ' malignas → saídas finitas/booleanas (' + naoFin + ' inválidas)');
})();

// ---------- canvas curva == rbvLayout(engine) — estado inicial dos sliders ----------
function slv(id) { return +doc.getElementById(id).value; }
var initState = {
  pesoAtual: slv('in-pesoAtual'), pesoSeco: slv('in-pesoSeco'), sobrecargaL: slv('in-sobrecargaL'),
  tempoSessao: slv('in-tempoSessao'), taxaRefillBasal: slv('in-taxaRefillBasal'), albumina: slv('in-albumina'),
  volPlasma: slv('in-volPlasma')
};
var canvasEl = doc.getElementById('rbv-canvas');
var rec = canvasEl.getContext('2d');
ok(rec && Array.isArray(rec.__paths), 'canvas: contexto exercido');
var Lref = ref.rbvLayout(initState, canvasEl.width, canvasEl.height);
function acharPoli(ref0) {
  var found = null;
  (rec.__paths || []).forEach(function (p) {
    if (p.length === ref0.length && p[0] && Math.abs(p[0].y - ref0[0].y) < 1e-4 && Math.abs(p[0].x - ref0[0].x) < 1e-4) found = p;
  });
  return found;
}
var curvePath = acharPoli(Lref.pts);
ok(curvePath !== null, 'canvas: polilinha da curva RBV pintada (' + Lref.pts.length + ' pontos)');
var pintaOk = true;
if (curvePath) { for (var i = 0; i < Lref.pts.length; i++) { var pp = curvePath[i]; if (Math.abs(pp.x - Lref.pts[i].x) > 1e-6 || Math.abs(pp.y - Lref.pts[i].y) > 1e-6) { pintaOk = false; break; } } }
ok(pintaOk, 'canvas: cada ponto da curva == rbvLayout(engine) (tol 1e-6)');
ok((rec.__rects || []).filter(function (q) { return q.op === 'fill'; }).length >= 1, 'canvas: marcador final pintado');

// ---------- Lab init ----------
ok(doc.getElementById('out-ufrate').textContent.length > 1, 'lab: out-ufrate preenchido no init');
ok(doc.getElementById('out-rbv').textContent.length > 1, 'lab: out-rbv preenchido no init');
ok(doc.getElementById('out-refill').textContent.length > 1, 'lab: out-refill preenchido no init');
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
ok(doc.querySelector('#tutor-fig svg') !== null || doc.querySelector('#tutor-fig img') !== null, 'Avaliação: ilustração renderizada no DOM');
ok(doc.querySelectorAll('#banktabs button').length === 2, 'Avaliação: dois blocos');

// ---------- cromo ----------
var body = doc.body.textContent;
ok(/FILTRA/.test(doc.querySelector('.kicker') ? doc.querySelector('.kicker').textContent : ''), 'cromo: kicker');
ok(/M23/.test(doc.querySelector('.kicker') ? doc.querySelector('.kicker').textContent : ''), 'cromo: kicker M23');
ok(doc.querySelector('nav.hex .ativo') !== null, 'cromo: hexápode ativo');
ok(/FILTRA/.test(doc.querySelector('nav.hex .ativo') ? doc.querySelector('nav.hex .ativo').textContent : ''), 'cromo: FILTRA ativo');
ok(/CRM-SP 151\.318 · Dr\. Matheus M\. Coelho · Limeira/.test(body), 'cromo: rodapé');
ok(doc.querySelector('a[href="dialisa.html"]') !== null || doc.querySelector('a[href="filtra.html"]') !== null, 'cromo: backlink');
ok(/educacional/i.test(body) && doc.querySelector('.disc') !== null, 'disclaimer educacional');

// ---------- guarda farmacológica invertida §8 ----------
ok(!/\b\d+\s?(mg|mcg|µg)\b(?!\/)/.test(body), 'guarda §8: nenhuma dose de massa solta (mg/mcg/µg)');
ok(/mL\/h/.test(body) && /mL\/kg\/h/.test(body), 'guarda §8: doses de volume por mecanismo (mL/h, mL/kg/h)');

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
