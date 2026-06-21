'use strict';
/*
 * FILTRA · M26 — validador jsdom (portão do §6)
 * estrutura · engine ≡ UI (ureaKinetics, spKtV, urrFrom, eKtVdaugirdas, ureaCurveLayout) ·
 * a curva ureia×tempo pintada no canvas ≡ ureaCurveLayout() · caso ≥5 · trilha ≥9 · dois bancos
 * (ilustrado SVG/raster + textual) · figura viva ≥8 · cromo · disclaimer.
 * M26 é prescrição de diálise em Kt/V · mL/min · h — SEM doses de massa (mg) soltas: a guarda PROÍBE mg.
 */
var fs = require('fs');
var path = require('path');
var jsdom = require('jsdom');
var JSDOM = jsdom.JSDOM;

var ref = require('./model26.js');
var imgGuard = require('../lib/img-guard.js');

var oks = 0, fail = 0;
function ok(c, m) { if (c) { oks++; } else { fail++; console.error('FALHA: ' + m); } }

var htmlPath = path.join(__dirname, '..', '..', 'filtra26.html');
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
  'urea-canvas', 'in-c0', 'in-k', 'in-v', 'in-t', 'in-kc',
  'out-sp', 'out-e', 'out-cfim', 'out-ceq', 'out-rebote', 'out-urr', 'out-mentira',
  'veredito', 'instr-pearl', 'lab-pearl', 'fig-caso',
  'tutor-q', 'tutor-opts', 'tutor-fb', 'tutor-score', 'tutor-total', 'tutor-fig',
  'draw-single', 'draw-twocomp', 'draw-rebote', 'draw-daugirdas', 'draw-rapidogentil'
];
ids.forEach(function (id) { ok(doc.getElementById(id) !== null, 'estrutura: #' + id + ' presente'); });
ok(doc.querySelectorAll('#tabs button').length === 6, 'estrutura: 6 abas');
ok(doc.getElementById('urea-canvas').tagName.toLowerCase() === 'canvas', 'instrumento: canvas urea-canvas');

// Conceito
ok(doc.querySelectorAll('#tab-conceito svg').length >= 5, 'Conceito: ≥5 desenhos computados');
var conc = doc.getElementById('tab-conceito').textContent;
ok(/compartimento/i.test(conc), 'Conceito: compartimentos');
ok(/pool único|único/i.test(conc), 'Conceito: pool único');
ok(/rebote/i.test(conc), 'Conceito: rebote');
ok(/Kt\/V/.test(conc), 'Conceito: Kt/V');
ok(/Daugirdas/i.test(conc), 'Conceito: equação de Daugirdas');
ok(/C₀·exp|exp\(−Kt\/V\)|exp\(-Kt\/V\)/.test(conc), 'Conceito: fórmula C(t)=C₀·exp(−Kt/V)');
ok(/homeostas/i.test(conc), 'Conceito: homeostasia como conceito-fio');

// caso ≥5 + trilha ≥9
ok(doc.querySelectorAll('button.act[data-rev]').length >= 5, 'caso: ≥5 atos');
ok(doc.querySelectorAll('#caso .reveal').length >= 5, 'caso: ≥5 reveláveis');
ok(doc.querySelector('#fig-caso svg') !== null, 'Caso: ilustração SVG');
ok(doc.querySelectorAll('#trilha details').length >= 9, 'trilha: ≥9 passos');

// engine ≡ UI
ok(typeof win.ureaKinetics === 'function', 'UI expõe ureaKinetics()');
ok(typeof win.spKtV === 'function', 'UI expõe spKtV()');
ok(typeof win.urrFrom === 'function', 'UI expõe urrFrom()');
ok(typeof win.eKtVdaugirdas === 'function', 'UI expõe eKtVdaugirdas()');
ok(typeof win.ureaCurveLayout === 'function', 'UI expõe ureaCurveLayout()');
var amostras = [
  {}, { t: 2, K: 420 }, { t: 6, K: 200 }, { Kc: 250 }, { V: 55 },
  { K: 350, V: 30 }, { C0: 1.2, t: 3 }, { K: null, t: 'x', Kc: -5 }
];
var divC = 0;
amostras.forEach(function (a) { if (JSON.stringify(win.ureaKinetics(a)) !== JSON.stringify(ref.ureaKinetics(a))) divC++; });
ok(divC === 0, 'engine ≡ UI: ureaKinetics inline idêntico ao model26.js (' + divC + ' divergências)');
var divSp = 0;
[[210, 35, 4], [420, 35, 2], [150, 40, 6], [300, 30, 3]].forEach(function (t) {
  if (Math.abs(win.spKtV(t[0], t[1], t[2]) - ref.spKtV(t[0], t[1], t[2])) > 1e-12) divSp++;
});
ok(divSp === 0, 'spKtV ≡ UI (' + divSp + ' divergências)');
ok(Math.abs(win.eKtVdaugirdas(1.4, 4) - ref.eKtVdaugirdas(1.4, 4)) < 1e-9, 'eKtVdaugirdas ≡ UI');
ok(Math.abs(win.urrFrom(1.4) - ref.urrFrom(1.4)) < 1e-9, 'urrFrom ≡ UI');
var divL = 0;
amostras.forEach(function (a) { if (JSON.stringify(win.ureaCurveLayout(a, 900, 360)) !== JSON.stringify(ref.ureaCurveLayout(a, 900, 360))) divL++; });
ok(divL === 0, 'ureaCurveLayout ≡ UI (' + divL + ' divergências)');

// canvas curva == ureaCurveLayout(engine)
var canvasEl = doc.getElementById('urea-canvas');
var rec = canvasEl.getContext('2d');
ok(rec && Array.isArray(rec.__paths), 'canvas: contexto exercido');
var initState = { C0: 1, K: 210, V: 35, t: 4, Kc: 800 };
var Lref = ref.ureaCurveLayout(initState, canvasEl.width, canvasEl.height);
// procura a polilinha do SANGUE (bloodPts)
var bloodPath = null;
(rec.__paths || []).forEach(function (p) { if (p.length === Lref.bloodPts.length && p[0] && Math.abs(p[0].y - Lref.bloodPts[0].y) < 1e-4 && Math.abs(p[0].x - Lref.bloodPts[0].x) < 1e-4) bloodPath = p; });
ok(bloodPath !== null, 'canvas: polilinha do sangue (2 comp.) pintada (' + Lref.bloodPts.length + ' pontos)');
var pintaOk = true;
if (bloodPath) { for (var i = 0; i < Lref.bloodPts.length; i++) { var pp = bloodPath[i]; if (Math.abs(pp.x - Lref.bloodPts[i].x) > 1e-6 || Math.abs(pp.y - Lref.bloodPts[i].y) > 1e-6) { pintaOk = false; break; } } }
ok(pintaOk, 'canvas: cada ponto do sangue == ureaCurveLayout(engine) (tol 1e-6)');
// procura a polilinha do REBOTE
var rebPath = null;
(rec.__paths || []).forEach(function (p) { if (p.length === Lref.reboutePts.length && p[0] && Math.abs(p[0].x - Lref.reboutePts[0].x) < 1e-4) rebPath = p; });
ok(rebPath !== null, 'canvas: polilinha do rebote pintada (' + Lref.reboutePts.length + ' pontos)');
var rebOk = true;
if (rebPath) { for (var j = 0; j < Lref.reboutePts.length; j++) { var rp = rebPath[j]; if (Math.abs(rp.x - Lref.reboutePts[j].x) > 1e-6 || Math.abs(rp.y - Lref.reboutePts[j].y) > 1e-6) { rebOk = false; break; } } }
ok(rebOk, 'canvas: cada ponto do rebote == ureaCurveLayout(engine) (tol 1e-6)');
// procura a polilinha do POOL ÚNICO
var spPath = null;
(rec.__paths || []).forEach(function (p) { if (p.length === Lref.singlePts.length && p[0] && Math.abs(p[0].y - Lref.singlePts[0].y) < 1e-4) spPath = p; });
ok(spPath !== null, 'canvas: polilinha do pool único pintada (' + Lref.singlePts.length + ' pontos)');
ok((rec.__rects || []).filter(function (q) { return q.op === 'fill'; }).length >= 1, 'canvas: marcador pintado');

// Lab init
ok(doc.getElementById('out-sp').textContent !== '—', 'lab: out-sp preenchido no init');
ok(doc.getElementById('out-e').textContent !== '—', 'lab: out-e preenchido no init');
ok(doc.getElementById('out-rebote').textContent !== '—', 'lab: out-rebote preenchido no init');
ok(doc.getElementById('veredito').textContent.length > 1, 'lab: veredito computado');
ok(doc.getElementById('lab-pearl').textContent.length > 1, 'lab: pérola computada');
ok(doc.querySelectorAll('.presets button[data-preset]').length >= 5, 'lab: ≥5 presets');

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
ok(/módulo M26/.test(doc.querySelector('.kicker') ? doc.querySelector('.kicker').textContent : ''), 'cromo: kicker M26');
ok(doc.querySelector('nav.hex .ativo') !== null, 'cromo: hexápode ativo');
ok(/FILTRA/.test(doc.querySelector('nav.hex .ativo') ? doc.querySelector('nav.hex .ativo').textContent : ''), 'cromo: FILTRA ativo');
ok(/CRM-SP 151\.318 · Dr\. Matheus M\. Coelho · Limeira/.test(body), 'cromo: rodapé');
ok(doc.querySelector('a[href="filtra.html"]') !== null, 'cromo: backlink');
ok(doc.querySelector('a[href="dialisa.html"]') !== null, 'cromo: link ao antebraço DIALISA');
ok(/educacional/i.test(body) && doc.querySelector('.disc') !== null, 'disclaimer educacional');

// guarda farmacológica INVERTIDA — DIALISA: prescrição em Kt/V · mL/min · h, NENHUMA dose de massa solta (mg/mcg/µg)
ok(!/\b\d+\s?(mg|mcg|µg)\b(?!\/)/.test(body), 'guarda: nenhuma dose de massa (mg/mcg/µg) solta — prescrição em Kt/V·mL/min·h');
ok(/Kt\/V/.test(body) && /mL\/min/.test(body) && /\bh\b/.test(body), 'guarda: prescrição ancorada em Kt/V · mL/min · h');

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
