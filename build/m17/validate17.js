'use strict';
/*
 * FILTRA · M17 — validador jsdom (portão do §6) — CAPSTONE FARMACOLÓGICO
 * estrutura · engine ≡ UI (diuretics, emaxModel, diureticsLayout) · curva dose-resposta pintada ≡
 * diureticsLayout() · caso ≥8 · trilha ≥13 · dois bancos (SVG/raster) · figura viva ≥8 · cromo.
 * GUARDA FARMACOLÓGICA INVERTIDA (§8): EXIGE doses em mg ancoradas ao transportador, dose-resposta
 * computada (emaxModel) e nota de honestidade do modelo.
 */
var fs = require('fs');
var path = require('path');
var jsdom = require('jsdom');
var JSDOM = jsdom.JSDOM;

var ref = require('./model17.js');
var imgGuard = require('../lib/img-guard.js');

var oks = 0, fail = 0;
function ok(c, m) { if (c) { oks++; } else { fail++; console.error('FALHA: ' + m); } }

var htmlPath = path.join(__dirname, '..', '..', 'filtra17.html');
var html = fs.readFileSync(htmlPath, 'utf8');

function recorderCtx() {
  var rects = [], texts = [], paths = [], arcs = [], cur = null;
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
    arc: function (x, y, r) { arcs.push({ x: x, y: y, r: r }); }, fill: function () {}, closePath: function () {},
    __rects: rects, __texts: texts, __paths: paths, __arcs: arcs
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

var ids = [
  'tabs', 'tab-conceito', 'tab-caso', 'tab-trilha', 'tab-instrumento', 'tab-lab', 'tab-avaliacao',
  'diu-canvas', 'in-ca', 'in-loop', 'in-thz', 'in-ksp', 'in-brk', 'in-del',
  'out-bca', 'out-bloop', 'out-bthz', 'out-bksp', 'out-fena', 'out-delta',
  'dose-box', 'veredito', 'instr-pearl', 'lab-pearl', 'fig-caso',
  'tutor-q', 'tutor-opts', 'tutor-fb', 'tutor-score', 'tutor-total', 'tutor-fig',
  'draw-curve', 'draw-segments'
];
ids.forEach(function (id) { ok(doc.getElementById(id) !== null, 'estrutura: #' + id + ' presente'); });
ok(doc.querySelectorAll('#tabs button').length === 6, 'estrutura: 6 abas');
ok(doc.getElementById('diu-canvas').tagName.toLowerCase() === 'canvas', 'instrumento: canvas diu-canvas');

ok(doc.querySelectorAll('#tab-conceito svg').length >= 2, 'Conceito: ≥2 desenhos computados');
var conc = doc.getElementById('tab-conceito').textContent;
ok(/dose-resposta|Emax/i.test(conc), 'Conceito: dose-resposta');
ok(/teto/i.test(conc), 'Conceito: teto');
ok(/braking/i.test(conc), 'Conceito: braking');
ok(/sinergia|sequencial/i.test(conc), 'Conceito: sinergia/bloqueio sequencial');

ok(doc.querySelectorAll('button.act[data-rev]').length >= 8, 'caso: ≥8 atos');
ok(doc.querySelectorAll('#caso .reveal').length >= 8, 'caso: ≥8 reveláveis');
ok(doc.querySelector('#fig-caso svg') !== null, 'Caso: ilustração SVG');
ok(doc.querySelectorAll('#trilha details').length >= 13, 'trilha: ≥13 passos');

ok(typeof win.diuretics === 'function', 'UI expõe diuretics()');
ok(typeof win.emaxModel === 'function', 'UI expõe emaxModel()');
ok(typeof win.diureticsLayout === 'function', 'UI expõe diureticsLayout()');
var amostras = [
  {}, { loop: 80 }, { loop: 80, thz: 25 }, { loop: 80, braking: 0.8 }, { loop: 80, delivery: 0.3 },
  { ca: 500, loop: 120, thz: 50, ksp: 10 }, { loop: 10 }, { loop: 'x', thz: NaN, delivery: -3 }
];
var divD = 0;
amostras.forEach(function (a) { if (JSON.stringify(win.diuretics(a)) !== JSON.stringify(ref.diuretics(a))) divD++; });
ok(divD === 0, 'engine ≡ UI: diuretics inline idêntico ao model17.js (' + divD + ' divergências)');
var divE = 0;
[[18, 18, 0.88], [40, 12, 0.55], [0, 5, 0.45]].forEach(function (t) { if (Math.abs(win.emaxModel(t[0], t[1], t[2]) - ref.emaxModel(t[0], t[1], t[2])) > 1e-12) divE++; });
ok(divE === 0, 'emaxModel ≡ UI (' + divE + ' divergências)');
var divL = 0;
amostras.forEach(function (a) { if (JSON.stringify(win.diureticsLayout(a, 900, 380)) !== JSON.stringify(ref.diureticsLayout(a, 900, 380))) divL++; });
ok(divL === 0, 'diureticsLayout ≡ UI (' + divL + ' divergências)');

var canvasEl = doc.getElementById('diu-canvas');
var rec = canvasEl.getContext('2d');
ok(rec && Array.isArray(rec.__paths), 'canvas: contexto exercido');
var initState = { ca: 0, loop: 40, thz: 0, ksp: 0, braking: 0, delivery: 1 };
var Lref = ref.diureticsLayout(initState, canvasEl.width, canvasEl.height);
var curvePath = null;
(rec.__paths || []).forEach(function (p) { if (p.length === Lref.pts.length && p[0] && Math.abs(p[0].y - Lref.pts[0].y) < 1e-4 && Math.abs(p[0].x - Lref.pts[0].x) < 1e-4) curvePath = p; });
ok(curvePath !== null, 'canvas: polilinha dose-resposta pintada (' + Lref.pts.length + ' pontos)');
var pintaOk = true;
if (curvePath) { for (var i = 0; i < Lref.pts.length; i++) { if (Math.abs(curvePath[i].x - Lref.pts[i].x) > 1e-4 || Math.abs(curvePath[i].y - Lref.pts[i].y) > 1e-4) { pintaOk = false; break; } } }
ok(pintaOk, 'canvas: cada ponto da curva == diureticsLayout(engine)');
var marcou = (rec.__arcs || []).some(function (a) { return Math.abs(a.x - Lref.current.x) < 1e-4 && Math.abs(a.y - Lref.current.y) < 1e-4; });
ok(marcou, 'canvas: marcador no ponto atual (dose, FENa)');

ok(doc.getElementById('out-fena').textContent !== '—', 'lab: out-fena preenchido no init');
ok(doc.getElementById('out-bloop').textContent !== '—', 'lab: bloqueio da alça computado');
ok(doc.getElementById('veredito').textContent.length > 1, 'lab: veredito computado');
ok(doc.getElementById('lab-pearl').textContent.length > 1, 'lab: pérola computada');
ok(doc.querySelectorAll('.presets button[data-preset]').length >= 4, 'lab: ≥4 presets');

/* ===== GUARDA FARMACOLÓGICA INVERTIDA (§8) ===== */
var body = doc.body.textContent;
ok(/furosemida/i.test(body), 'farmacologia: furosemida citada');
ok(/bumetanida/i.test(body), 'farmacologia: bumetanida citada');
ok(/torasemida/i.test(body), 'farmacologia: torasemida citada');
ok(/\b\d+[\s–-]+\d+\s?mg/.test(body) || /\b\d+\s?mg\b/.test(body), 'farmacologia (EXIGIDO): doses com unidade mg presentes');
ok(/NKCC2/.test(body), 'farmacologia: mecanismo NKCC2 ancorado');
ok(/NCC/.test(body), 'farmacologia: mecanismo NCC ancorado (tiazídico)');
ok(/anidrase carbônica/i.test(body) && /ENaC/.test(body), 'farmacologia: alvos TCP (anidrase) e ducto (ENaC) ancorados');
ok(typeof win.emaxModel === 'function' && /Emax/i.test(html), 'farmacologia: dose-resposta computada (emaxModel/Emax)');
ok(ref.diuretics({ loop: 80 }).FENa > ref.diuretics({ loop: 10 }).FENa, 'farmacologia: efeito sobe com a dose (curva computada)');
ok(ref.diuretics({ loop: 80, thz: 50 }).FENa - ref.diuretics({}).FENa > (ref.diuretics({ loop: 80 }).FENa - ref.diuretics({}).FENa) + (ref.diuretics({ thz: 50 }).FENa - ref.diuretics({}).FENa), 'farmacologia: SINERGIA supra-aditiva computada');
ok(/honestidade do modelo/i.test(body), 'disclaimer: nota de honestidade do modelo (§8)');
ok(doc.getElementById('dose-box').textContent.length > 1, 'farmacologia: dose-box com regime e mg');

ok(/educacional/i.test(body) && doc.querySelector('.disc') !== null, 'disclaimer educacional');
ok(/FILTRA/.test(doc.querySelector('.kicker') ? doc.querySelector('.kicker').textContent : ''), 'cromo: kicker');
ok(doc.querySelector('nav.hex .ativo') !== null, 'cromo: hexápode ativo');
ok(/CRM-SP 151\.318 · Dr\. Matheus M\. Coelho · Limeira/.test(body), 'cromo: rodapé');
ok(doc.querySelector('a[href="filtra.html"]') !== null, 'cromo: backlink');

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

ok(imgGuard.remoteImgs(doc).length === 0, 'offline: nenhum <img> remoto');
var figs = Array.prototype.slice.call(doc.querySelectorAll('figure.fviva'));
ok(figs.length >= 8, 'figura viva: ≥8 figuras inline (tem ' + figs.length + ')');
ok(!doc.querySelector('.galeria'), 'figura viva: sem mural .galeria');
ok(doc.querySelectorAll('#tab-conceito figure.fviva').length >= 8, 'figura viva: ≥8 na aba Conceito');
var faltam = figs.filter(function (fg) { var im = fg.querySelector('img'); var s = im ? (im.getAttribute('src') || '') : ''; return !s || !fs.existsSync(path.join(__dirname, '..', '..', s)); });
ok(faltam.length === 0, 'figura viva: arquivos existem em assets/ (' + faltam.length + ' faltando)');
var temPng = figs.some(function (fg) { var im = fg.querySelector('img'); return im && /\.png$/i.test(im.getAttribute('src') || ''); });
ok(temPng, 'figura viva: usa a imagem raster real (sitios-diureticos-nefron.png)');
var semAlt = figs.filter(function (fg) { var im = fg.querySelector('img'); return !im || !((im.getAttribute('alt') || '').trim()); });
ok(semAlt.length === 0, 'figura viva: todo <img> tem alt');
var semCap = figs.filter(function (fg) { var cap = fg.querySelector('figcaption'); return !cap || (cap.textContent || '').trim().length < 30; });
ok(semCap.length === 0, 'figura viva: legenda que ensina (≥30 chars)');
ok(/Fig\.\s*\d/.test(html), 'figura viva: referência "Fig. N"');

console.log(oks + ' OK · ' + fail + ' falhas');
process.exit(fail > 0 ? 1 : 0);
