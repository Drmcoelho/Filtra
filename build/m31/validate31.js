'use strict';
/*
 * FILTRA · M31 — validador jsdom (portão do §6) — SLED / híbridas
 * estrutura · engine ≡ UI (sled, espectroLayout, eficiencia, doseTotal, toleranciaUF) ·
 * a curva pintada no canvas ≡ espectroLayout() (tol 1e-6) · caso ≥5 atos · trilha ≥9 ·
 * dois bancos (ilustrado SVG/raster + textual) · figura viva ≥8 · cromo · disclaimer.
 * ROBUSTEZ EXTRA: recomputa ≥260 entradas MALIGNAS e confirma engine≡UI finito em todas.
 * Guarda farmacológica §8 (invertida): módulo DIALISA — sem dose de massa solta (mg/mcg/µg);
 * mEq/L, mL/min, mL/h, Kt/V e h são livres.
 */
var fs = require('fs');
var path = require('path');
var jsdom = require('jsdom');
var JSDOM = jsdom.JSDOM;

var ref = require('./model31.js');
var imgGuard = require('../lib/img-guard.js');

var oks = 0, fail = 0;
function ok(c, m) { if (c) { oks++; } else { fail++; console.error('FALHA: ' + m); } }
function fin(x) { return typeof x === 'number' && isFinite(x); }

var htmlPath = path.join(__dirname, '..', '..', 'filtra31.html');
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
  'espectro-canvas',
  'in-qb', 'in-qd', 'in-koa', 'in-tempo', 'in-volume', 'in-refilling', 'in-pesoKg',
  'out-modalidade', 'out-clearance', 'out-ktv', 'out-uf', 'out-tol', 'out-estresse',
  'veredito', 'instr-pearl', 'lab-pearl', 'fig-caso',
  'tutor-q', 'tutor-opts', 'tutor-fb', 'tutor-score', 'tutor-total', 'tutor-fig',
  'draw-espectro', 'draw-ktv', 'draw-uf', 'draw-estresse', 'draw-sintese'
];
ids.forEach(function (id) { ok(doc.getElementById(id) !== null, 'estrutura: #' + id + ' presente'); });
ok(doc.querySelectorAll('#tabs button').length === 6, 'estrutura: 6 abas');
ok(doc.getElementById('espectro-canvas').tagName.toLowerCase() === 'canvas', 'instrumento: canvas espectro-canvas');

// ---------- Conceito ----------
ok(doc.querySelectorAll('#tab-conceito svg').length >= 5, 'Conceito: ≥5 desenhos computados');
var conc = doc.getElementById('tab-conceito').textContent;
ok(/SLED/i.test(conc), 'Conceito: SLED');
ok(/HDI/.test(conc), 'Conceito: HDI (intermitente)');
ok(/TRRC/i.test(conc), 'Conceito: TRRC (contínua)');
ok(/meio-termo/i.test(conc), 'Conceito: o meio-termo');
ok(/espectro/i.test(conc), 'Conceito: o espectro eficiência × tempo');
ok(/Kt\/V/.test(conc), 'Conceito: Kt/V acumulado');
ok(/refilling/i.test(conc) || /tolerância|tolerancia/i.test(conc), 'Conceito: UF × refilling (tolerância)');
ok(/difus|convec/i.test(doc.body.textContent), 'Conceito: substitui FUNÇÕES por física (difusão/convecção)');
ok(/homeostas/i.test(doc.body.textContent), 'Conceito: homeostasia como conceito-fio');

// ---------- caso ≥5 + trilha ≥9 ----------
ok(doc.querySelectorAll('button.act[data-rev]').length >= 5, 'caso: ≥5 atos');
ok(doc.querySelectorAll('#caso .reveal').length >= 5, 'caso: ≥5 reveláveis');
ok(doc.querySelector('#fig-caso svg') !== null, 'Caso: ilustração SVG');
ok(doc.querySelectorAll('#trilha details').length >= 9, 'trilha: ≥9 passos');

// ---------- engine ≡ UI ----------
ok(typeof win.sled === 'function', 'UI expõe sled()');
ok(typeof win.espectroLayout === 'function', 'UI expõe espectroLayout()');
ok(typeof win.eficiencia === 'function' && typeof win.doseTotal === 'function' && typeof win.toleranciaUF === 'function', 'UI expõe eficiencia()/doseTotal()/toleranciaUF()');
var amostras = [
  {}, { qb: 350, qd: 600, koa: 800, tempo: 4, volume: 3 },
  { qb: 200, qd: 300, tempo: 8, volume: 4 }, { qb: 180, qd: 300, tempo: 12, volume: 5 },
  { qb: 150, qd: 250, tempo: 24, volume: 6 }, { volume: 5, tempo: 4, refilling: 400 },
  { tempo: 14, volume: 5, refilling: 380 }, { koa: 1400, qb: 450, qd: 800, tempo: 6 },
  { qb: null, qd: 'x', koa: -2, tempo: 1e9, volume: NaN, refilling: Infinity, pesoKg: -1 }
];
var divC = 0;
amostras.forEach(function (a) { if (JSON.stringify(win.sled(a)) !== JSON.stringify(ref.sled(a))) divC++; });
ok(divC === 0, 'engine ≡ UI: sled inline idêntico ao model31.js (' + divC + ' divergências)');
var divE = 0;
[[350, 600, 800], [200, 300, 600], [450, 800, 1400], [50, 100, 200]].forEach(function (t) { if (Math.abs(win.eficiencia({ qb: t[0], qd: t[1], koa: t[2] }) - ref.eficiencia({ qb: t[0], qd: t[1], koa: t[2] })) > 1e-12) divE++; });
ok(divE === 0, 'eficiencia ≡ UI (' + divE + ' divergências)');
var divD = 0;
[[200, 4, 36], [300, 8, 40], [180, 12, 44]].forEach(function (t) { var a = win.doseTotal({ clearance: t[0], tempo: t[1], V: t[2] }), b = ref.doseTotal({ clearance: t[0], tempo: t[1], V: t[2] }); if (Math.abs(a.ktv - b.ktv) > 1e-12 || Math.abs(a.ktL - b.ktL) > 1e-12) divD++; });
ok(divD === 0, 'doseTotal ≡ UI (' + divD + ' divergências)');
var divT = 0;
[[5, 4, 400], [5, 14, 400], [3, 8, 380]].forEach(function (t) { var a = win.toleranciaUF({ volume: t[0], tempo: t[1], refilling: t[2] }), b = ref.toleranciaUF({ volume: t[0], tempo: t[1], refilling: t[2] }); if (Math.abs(a.ufRate - b.ufRate) > 1e-9 || Math.abs(a.tolerancia - b.tolerancia) > 1e-12) divT++; });
ok(divT === 0, 'toleranciaUF ≡ UI (' + divT + ' divergências)');
var divL = 0;
amostras.forEach(function (a) { if (JSON.stringify(win.espectroLayout(a, 900, 360)) !== JSON.stringify(ref.espectroLayout(a, 900, 360))) divL++; });
ok(divL === 0, 'espectroLayout ≡ UI (' + divL + ' divergências)');

// ---------- ROBUSTEZ EXTRA: ≥260 entradas malignas → engine≡UI finito em TODAS ----------
(function () {
  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  var rnd = mulberry32(0x51ED31), N = 280, div = 0, naoFin = 0;
  var MAL = [NaN, Infinity, -Infinity, 1e300, -1e300, '5', 'x', '', null, undefined, {}, [], true];
  function v() { if (rnd() < 0.55) return MAL[(rnd() * MAL.length) | 0]; return (rnd() - 0.25) * 900; }
  for (var i = 0; i < N; i++) {
    var inp = { pesoKg: v(), V: v(), qb: v(), qd: v(), koa: v(), tempo: v(), volume: v(), refilling: v() };
    var a = win.sled(inp), b = ref.sled(inp);
    if (JSON.stringify(a) !== JSON.stringify(b)) div++;
    if (!fin(a.clearance) || !fin(a.ktv) || !fin(a.ufRate) || !fin(a.tolerancia) || !fin(a.espectro) || !fin(a.estresseHora)) naoFin++;
    if (['HDI', 'SLED', 'TRRC'].indexOf(a.modalidade) < 0) naoFin++;
    var L = win.espectroLayout(inp, 900, 360);
    if (!Array.isArray(L.ptsHDI) || !Array.isArray(L.ptsSLED) || !fin(L.alvo.y)) naoFin++;
  }
  ok(div === 0, 'robustez extra: ' + N + ' malignas engine≡UI (' + div + ' divergências)');
  ok(naoFin === 0, 'robustez extra: ' + N + ' malignas → saídas finitas/classificadas (' + naoFin + ' inválidas)');
})();

// ---------- canvas curva == espectroLayout(engine) — estado inicial dos sliders ----------
function slv(id) { return +doc.getElementById(id).value; }
var initState = {
  qb: slv('in-qb'), qd: slv('in-qd'), koa: slv('in-koa'), tempo: slv('in-tempo'),
  volume: slv('in-volume'), refilling: slv('in-refilling'), pesoKg: slv('in-pesoKg')
};
var canvasEl = doc.getElementById('espectro-canvas');
var rec = canvasEl.getContext('2d');
ok(rec && Array.isArray(rec.__paths), 'canvas: contexto exercido');
var Lref = ref.espectroLayout(initState, canvasEl.width, canvasEl.height);
function acharPoli(ref0) {
  var found = null;
  (rec.__paths || []).forEach(function (p) {
    if (p.length === ref0.length && p[0] && Math.abs(p[0].y - ref0[0].y) < 1e-4 && Math.abs(p[0].x - ref0[0].x) < 1e-4) found = p;
  });
  return found;
}
var sledPath = acharPoli(Lref.ptsSLED);
ok(sledPath !== null, 'canvas: polilinha da SLED pintada (' + Lref.ptsSLED.length + ' pontos)');
var pintaOk = true;
if (sledPath) { for (var i = 0; i < Lref.ptsSLED.length; i++) { var pp = sledPath[i]; if (Math.abs(pp.x - Lref.ptsSLED[i].x) > 1e-6 || Math.abs(pp.y - Lref.ptsSLED[i].y) > 1e-6) { pintaOk = false; break; } } }
ok(pintaOk, 'canvas: cada ponto da SLED == espectroLayout(engine) (tol 1e-6)');
var hdiPath = acharPoli(Lref.ptsHDI);
ok(hdiPath !== null, 'canvas: polilinha da HDI de referência pintada');
ok((rec.__rects || []).filter(function (q) { return q.op === 'fill'; }).length >= 1, 'canvas: marcador de chegada pintado');

// ---------- Lab init ----------
ok(doc.getElementById('out-modalidade').textContent !== '—' && doc.getElementById('out-modalidade').textContent.length > 1, 'lab: out-modalidade preenchido no init');
ok(doc.getElementById('out-ktv').textContent.length > 1, 'lab: out-ktv preenchido no init');
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
ok(/M31/.test(doc.querySelector('.kicker') ? doc.querySelector('.kicker').textContent : ''), 'cromo: kicker M31');
ok(doc.querySelector('nav.hex .ativo') !== null, 'cromo: hexápode ativo');
ok(/FILTRA/.test(doc.querySelector('nav.hex .ativo') ? doc.querySelector('nav.hex .ativo').textContent : ''), 'cromo: FILTRA ativo');
ok(/CRM-SP 151\.318 · Dr\. Matheus M\. Coelho · Limeira/.test(body), 'cromo: rodapé');
ok(doc.querySelector('a[href="dialisa.html"]') !== null || doc.querySelector('a[href="filtra.html"]') !== null, 'cromo: backlink');
ok(/educacional/i.test(body) && doc.querySelector('.disc') !== null, 'disclaimer educacional');

// ---------- guarda farmacológica invertida §8 ----------
ok(!/\b\d+\s?(mg|mcg|µg)\b(?!\/)/.test(body), 'guarda §8: nenhuma dose de massa solta (mg/mcg/µg)');
ok(/mEq\/L/.test(body), 'guarda §8: unidades do meio interno (mEq/L) presentes');
ok(/mL\/min/.test(body) && /Kt\/V/.test(body), 'guarda §8: unidades de DIÁLISE por mecanismo (mL/min, Kt/V)');

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
