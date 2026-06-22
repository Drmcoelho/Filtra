'use strict';
/*
 * FILTRA · M25 — validador jsdom (portão do §6) — DOSE e ADEQUAÇÃO (Kt/V, URR)
 * estrutura · engine ≡ UI (dose, ktvLayout, urr, ktv, clearanceK, ureiaPos) ·
 * a curva pintada no canvas ≡ ktvLayout() (tol 1e-6) · caso ≥5 atos · trilha ≥9 ·
 * dois bancos (ilustrado SVG/raster + textual) · figura viva ≥8 · cromo · disclaimer.
 * ROBUSTEZ EXTRA: recomputa ≥260 entradas MALIGNAS e confirma engine≡UI finito em todas.
 * Guarda farmacológica §8 (invertida): módulo DIALISA — sem dose de massa solta (mg/mcg/µg);
 * mEq/L, mL/min, mL/kg/h, Kt/V e h são livres.
 */
var fs = require('fs');
var path = require('path');
var jsdom = require('jsdom');
var JSDOM = jsdom.JSDOM;

var ref = require('./model25.js');
var imgGuard = require('../lib/img-guard.js');

var oks = 0, fail = 0;
function ok(c, m) { if (c) { oks++; } else { fail++; console.error('FALHA: ' + m); } }
function fin(x) { return typeof x === 'number' && isFinite(x); }

var htmlPath = path.join(__dirname, '..', '..', 'filtra25.html');
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
  'ktv-canvas',
  'in-peso', 'in-sexo', 'in-ureiaPre', 'in-t', 'in-uf', 'in-qb', 'in-qd', 'in-koa', 'in-primeira',
  'out-kv', 'out-pos', 'out-ktv', 'out-urr', 'out-adeq', 'out-alav',
  'veredito', 'instr-pearl', 'lab-pearl', 'fig-caso',
  'tutor-q', 'tutor-opts', 'tutor-fb', 'tutor-score', 'tutor-total', 'tutor-fig',
  'draw-ktv', 'draw-urr', 'draw-satura', 'draw-alav'
];
ids.forEach(function (id) { ok(doc.getElementById(id) !== null, 'estrutura: #' + id + ' presente'); });
ok(doc.querySelectorAll('#tabs button').length === 6, 'estrutura: 6 abas');
ok(doc.getElementById('ktv-canvas').tagName.toLowerCase() === 'canvas', 'instrumento: canvas ktv-canvas');

// ---------- Conceito ----------
ok(doc.querySelectorAll('#tab-conceito svg').length >= 5, 'Conceito: ≥5 desenhos computados');
var conc = doc.getElementById('tab-conceito').textContent;
ok(/Kt\/V/.test(conc), 'Conceito: Kt/V');
ok(/URR/.test(conc), 'Conceito: URR');
ok(/clearance/i.test(conc), 'Conceito: clearance K');
ok(/satura/i.test(conc), 'Conceito: saturação do clearance');
ok(/KoA/.test(conc), 'Conceito: KoA / high-flux');
ok(/Qb/.test(conc) && /tempo/i.test(conc), 'Conceito: as alavancas da prescrição (Qb, tempo)');
ok(/desequil/i.test(conc), 'Conceito: 1ª sessão gentil / desequilíbrio (M34)');
ok(/difus/i.test(doc.body.textContent), 'Conceito: substitui FUNÇÃO por física (difusão)');
ok(/homeostas/i.test(doc.body.textContent), 'Conceito: homeostasia como conceito-fio');

// ---------- caso ≥5 + trilha ≥9 ----------
ok(doc.querySelectorAll('button.act[data-rev]').length >= 5, 'caso: ≥5 atos');
ok(doc.querySelectorAll('#caso .reveal').length >= 5, 'caso: ≥5 reveláveis');
ok(doc.querySelector('#fig-caso svg') !== null, 'Caso: ilustração SVG');
ok(doc.querySelectorAll('#trilha details').length >= 9, 'trilha: ≥9 passos');

// ---------- engine ≡ UI ----------
ok(typeof win.dose === 'function', 'UI expõe dose()');
ok(typeof win.ktvLayout === 'function', 'UI expõe ktvLayout()');
ok(typeof win.urr === 'function' && typeof win.ktv === 'function', 'UI expõe urr()/ktv()');
ok(typeof win.clearanceK === 'function' && typeof win.ureiaPos === 'function', 'UI expõe clearanceK()/ureiaPos()');
var amostras = [
  {}, { peso: 70, t: 4, qb: 300, koa: 900 }, { peso: 120, t: 4, qb: 350, koa: 1000 },
  { t: 2, qb: 250, koa: 600 }, { ureiaPre: 320, t: 2, primeiraUremica: true },
  { peso: 90, t: 3, qb: 450, koa: 500, qd: 800 }, { sexo: 'F', peso: 60, t: 4 },
  { k: 250, t: 4, peso: 70 },
  { peso: null, t: 'x', qb: -2, qd: 1e9, koa: NaN, uf: -5, ureiaPre: 1e300, sexo: 9, primeiraUremica: 'a' }
];
var divC = 0;
amostras.forEach(function (a) { if (JSON.stringify(win.dose(a)) !== JSON.stringify(ref.dose(a))) divC++; });
ok(divC === 0, 'engine ≡ UI: dose inline idêntico ao model25.js (' + divC + ' divergências)');
var divU = 0;
[0.1, 0.32, 0.5, 0.8, 0.95].forEach(function (R) { if (Math.abs(win.urr(R) - ref.urr(R)) > 1e-12) divU++; });
ok(divU === 0, 'urr ≡ UI (' + divU + ' divergências)');
var divK = 0;
[{ R: 0.3, t: 4, uf: 2, peso: 70 }, { R: 0.5, t: 3, uf: 0, peso: 90 }, { R: 0.2, t: 5, uf: 3, peso: 60 }].forEach(function (o) { if (Math.abs(win.ktv(o) - ref.ktv(o)) > 1e-12) divK++; });
ok(divK === 0, 'ktv ≡ UI (' + divK + ' divergências)');
var divCl = 0;
[{ qb: 200, qd: 500, koa: 800 }, { qb: 400, qd: 600, koa: 1000 }, { qb: 300, qd: 400, koa: 500 }].forEach(function (o) { if (Math.abs(win.clearanceK(o) - ref.clearanceK(o)) > 1e-12) divCl++; });
ok(divCl === 0, 'clearanceK ≡ UI (' + divCl + ' divergências)');
var divL = 0;
amostras.forEach(function (a) { if (JSON.stringify(win.ktvLayout(a, 900, 360)) !== JSON.stringify(ref.ktvLayout(a, 900, 360))) divL++; });
ok(divL === 0, 'ktvLayout ≡ UI (' + divL + ' divergências)');

// ---------- ROBUSTEZ EXTRA: ≥260 entradas malignas → engine≡UI finito em TODAS ----------
(function () {
  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  var rnd = mulberry32(0x25C0DE), N = 280, div = 0, naoFin = 0;
  var MAL = [NaN, Infinity, -Infinity, 1e300, -1e300, '5', 'x', '', null, undefined, {}, [], true];
  function v() { if (rnd() < 0.55) return MAL[(rnd() * MAL.length) | 0]; return (rnd() - 0.25) * 600; }
  var ALA = { manter: 1, tempo: 1, qb: 1, dialisador: 1 };
  for (var i = 0; i < N; i++) {
    var inp = { peso: v(), ureiaPre: v(), t: v(), uf: v(), qb: v(), qd: v(), koa: v(), k: v(), sexo: rnd() < 0.5 ? 'F' : 'M', primeiraUremica: rnd() < 0.5 };
    var a = win.dose(inp), b = ref.dose(inp);
    if (JSON.stringify(a) !== JSON.stringify(b)) div++;
    if (!fin(a.spKtV) || !fin(a.URR) || !fin(a.K) || !fin(a.V) || !fin(a.R) || !fin(a.ureiaPos) || !fin(a.deficitKtV)) naoFin++;
    if (!(a.alavanca in ALA)) naoFin++;
    if (!(a.R > 0 && a.R <= 1 + 1e-12)) naoFin++;
    var L = win.ktvLayout(inp, 900, 360);
    if (!fin(L.current.x) || !fin(L.current.y) || !fin(L.yAlvo) || L.pts.length !== 61) naoFin++;
  }
  ok(div === 0, 'robustez extra: ' + N + ' malignas engine≡UI (' + div + ' divergências)');
  ok(naoFin === 0, 'robustez extra: ' + N + ' malignas → saídas finitas/classificadas (' + naoFin + ' inválidas)');
})();

// ---------- canvas curva == ktvLayout(engine) — estado inicial dos sliders ----------
function slv(id) { return +doc.getElementById(id).value; }
var initState = {
  peso: slv('in-peso'), sexo: (slv('in-sexo') === 1 ? 'F' : 'M'), ureiaPre: slv('in-ureiaPre'),
  t: slv('in-t'), uf: slv('in-uf'), qb: slv('in-qb'), qd: slv('in-qd'), koa: slv('in-koa'),
  primeiraUremica: (slv('in-primeira') === 1)
};
var canvasEl = doc.getElementById('ktv-canvas');
var rec = canvasEl.getContext('2d');
ok(rec && Array.isArray(rec.__paths), 'canvas: contexto exercido');
var Lref = ref.ktvLayout(initState, canvasEl.width, canvasEl.height);
function acharPoli(ref0) {
  var found = null;
  (rec.__paths || []).forEach(function (p) {
    if (p.length === ref0.length && p[0] && Math.abs(p[0].y - ref0[0].y) < 1e-4 && Math.abs(p[0].x - ref0[0].x) < 1e-4) found = p;
  });
  return found;
}
var curvePath = acharPoli(Lref.pts);
ok(curvePath !== null, 'canvas: curva Kt/V×tempo pintada (' + Lref.pts.length + ' pontos)');
var pintaOk = true;
if (curvePath) { for (var i = 0; i < Lref.pts.length; i++) { var pp = curvePath[i]; if (Math.abs(pp.x - Lref.pts[i].x) > 1e-6 || Math.abs(pp.y - Lref.pts[i].y) > 1e-6) { pintaOk = false; break; } } }
ok(pintaOk, 'canvas: cada ponto da curva == ktvLayout(engine) (tol 1e-6)');
ok((rec.__rects || []).filter(function (q) { return q.op === 'fill'; }).length >= 1, 'canvas: marcador de operação pintado');

// ---------- Lab init ----------
ok(doc.getElementById('out-ktv').textContent.length > 1, 'lab: out-ktv preenchido no init');
ok(doc.getElementById('out-urr').textContent.length > 1, 'lab: out-urr preenchido no init');
ok(doc.getElementById('out-alav').textContent.length > 1, 'lab: out-alav preenchido no init');
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
ok(/M25/.test(doc.querySelector('.kicker') ? doc.querySelector('.kicker').textContent : ''), 'cromo: kicker M25');
ok(doc.querySelector('nav.hex .ativo') !== null, 'cromo: hexápode ativo');
ok(/FILTRA/.test(doc.querySelector('nav.hex .ativo') ? doc.querySelector('nav.hex .ativo').textContent : ''), 'cromo: FILTRA ativo');
ok(/CRM-SP 151\.318 · Dr\. Matheus M\. Coelho · Limeira/.test(body), 'cromo: rodapé');
ok(doc.querySelector('a[href="dialisa.html"]') !== null || doc.querySelector('a[href="filtra.html"]') !== null, 'cromo: backlink');
ok(/educacional/i.test(body) && doc.querySelector('.disc') !== null, 'disclaimer educacional');

// ---------- guarda farmacológica invertida §8 ----------
ok(!/\b\d+\s?(mg|mcg|µg)\b(?!\/)/.test(body), 'guarda §8: nenhuma dose de massa solta (mg/mcg/µg)');
ok(/Kt\/V/.test(body), 'guarda §8: Kt/V presente no body');
ok(/mL\/min/.test(body) && /URR/.test(body), 'guarda §8: métricas de dose por mecanismo (mL/min, URR)');

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
