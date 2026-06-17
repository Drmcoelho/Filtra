'use strict';
/*
 * FILTRA · M1 — validador jsdom (portão do §6)
 * Confere: estrutura (IDs/abas) · engine ≡ UI (nefron, tfgCurveLayout, glomLayout) ·
 * a curva PINTADA no canvas ≡ a geometria computada · camada interativa · os dois
 * bancos do tutor (ilustrado c/ SVG + textual) · cromo · disclaimer.
 * Guarda farmacológica invertida (§8): o M1 é hemodinâmica pura — cita fármacos como
 * alavanca, mas SEM dose (a dose entra no M2). Logo: exige disclaimer e proíbe dose solta.
 */

var fs = require('fs');
var path = require('path');
var jsdom = require('jsdom');
var JSDOM = jsdom.JSDOM;

var ref = require('./model1.js'); // engine canônico (Node) p/ comparar com a UI

var oks = 0, fail = 0;
function ok(c, m) { if (c) { oks++; } else { fail++; console.error('FALHA: ' + m); } }

var htmlPath = path.join(__dirname, '..', '..', 'filtra1.html');
var html = fs.readFileSync(htmlPath, 'utf8');

// contexto-gravador: registra retângulos, textos e SUBPATHS (moveTo/lineTo) — assim o
// canvas "desenha" de verdade e conferimos que a polilinha pintada == tfgCurveLayout().
function recorderCtx() {
  var rects = [], texts = [], paths = [], cur = null;
  return {
    fillStyle: '', strokeStyle: '', lineWidth: 1, globalAlpha: 1, font: '', canvas: null,
    clearRect: function () {},
    fillRect: function (x, y, w, h) { rects.push({ op: 'fill', x: x, y: y, w: w, h: h }); },
    strokeRect: function (x, y, w, h) { rects.push({ op: 'stroke', x: x, y: y, w: w, h: h }); },
    beginPath: function () { cur = []; paths.push(cur); },
    moveTo: function (x, y) { if (cur) cur.push({ x: x, y: y }); },
    lineTo: function (x, y) { if (cur) cur.push({ x: x, y: y }); },
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

// ----- estrutura: abas e IDs essenciais -----
var ids = ['tabs','tab-caso','tab-trilha','tab-instrumento','tab-lab','tab-avaliacao',
  'tfg-canvas','in-pam','in-ra','in-re','in-kf','in-pi','in-pbc','in-autoreg',
  'out-pgc','out-nfp','out-tfg','out-fpr','out-ff','out-ra','out-re','out-regime',
  'veredito','glom-svg','instr-pearl','lab-pearl','fig-conceito',
  'tutor-q','tutor-opts','tutor-fb','tutor-score','tutor-total','tutor-fig'];
ids.forEach(function (id) { ok(doc.getElementById(id) !== null, 'estrutura: #' + id + ' presente'); });

ok(doc.querySelectorAll('#tabs button').length === 5, 'estrutura: 5 abas');
ok(doc.getElementById('tfg-canvas').tagName.toLowerCase() === 'canvas', 'instrumento: canvas vivo');

// ----- caso (5 atos, prever-depois-revelar) -----
ok(doc.querySelectorAll('button.act[data-rev]').length >= 5, 'caso: ≥5 atos com revelar');
ok(doc.querySelectorAll('#caso .reveal').length >= 5, 'caso: ≥5 blocos reveláveis');

// ----- trilha socrática (≥9 passos) -----
ok(doc.querySelectorAll('#trilha details').length >= 9, 'trilha: ≥9 passos socráticos');

// ----- engine ≡ UI (o motor manda no pixel) -----
ok(typeof win.nefron === 'function', 'UI expõe nefron()');
var amostras = [
  { PAM: 100 }, { PAM: 75, rA: 1.8 }, { PAM: 100, rE: 0.5, autoreg: false },
  { PAM: 160, rE: 1.4 }, { PAM: 55 }, { PAM: 100, P_BC: 32 },
  { PAM: 'x', rA: null, rE: undefined } // sujeira → clamps idênticos
];
var divergiu = 0;
amostras.forEach(function (a) {
  if (JSON.stringify(win.nefron(a)) !== JSON.stringify(ref.nefron(a))) divergiu++;
});
ok(divergiu === 0, 'engine ≡ UI: nefron inline idêntico ao model1.js (' + divergiu + ' divergências)');

ok(typeof win.tfgCurveLayout === 'function', 'UI expõe tfgCurveLayout()');
ok(typeof win.glomLayout === 'function', 'UI expõe glomLayout()');
var divC = 0, divG = 0;
amostras.forEach(function (a) {
  if (JSON.stringify(win.tfgCurveLayout(a, 900, 360)) !== JSON.stringify(ref.tfgCurveLayout(a, 900, 360))) divC++;
  var r = ref.nefron(a);
  if (JSON.stringify(win.glomLayout(r, 300, 180)) !== JSON.stringify(ref.glomLayout(r, 300, 180))) divG++;
});
ok(divC === 0, 'tfgCurveLayout ≡ UI: inline idêntico (' + divC + ' divergências)');
ok(divG === 0, 'glomLayout ≡ UI: inline idêntico (' + divG + ' divergências)');

// ----- o canvas DESENHOU a curva, e a polilinha == tfgCurveLayout (motor manda no pixel) -----
var canvasEl = doc.getElementById('tfg-canvas');
var rec = canvasEl.getContext('2d');
ok(rec && Array.isArray(rec.__paths), 'canvas: contexto exercido (gravador ativo)');
// estado inicial dos controles: PAM 100 · rA 1 · rE 1 · Kf 7.5 · π 28 · P_BC 15 · autoreg on
var initState = { PAM: 100, rA: 1, rE: 1, Kf: 7.5, piGC: 28, P_BC: 15, autoreg: true };
var Lref = ref.tfgCurveLayout(initState, canvasEl.width, canvasEl.height);
// acha a subpath cujo tamanho bate com a curva computada
var curvePath = null;
(rec.__paths || []).forEach(function (p) { if (p.length === Lref.pts.length) curvePath = p; });
ok(curvePath !== null, 'canvas: polilinha da curva pintada (' + Lref.pts.length + ' pontos)');
var pintaOk = true;
if (curvePath) {
  for (var i = 0; i < Lref.pts.length; i++) {
    if (Math.abs(curvePath[i].x - Lref.pts[i].x) > 1e-6 || Math.abs(curvePath[i].y - Lref.pts[i].y) > 1e-6) { pintaOk = false; break; }
  }
}
ok(pintaOk, 'canvas: cada ponto pintado == tfgCurveLayout(engine)');
// marcador do ponto de operação pintado como retângulo (fill)
var fills = (rec.__rects || []).filter(function (q) { return q.op === 'fill'; });
ok(fills.length >= 1, 'canvas: marcador do ponto de operação pintado');
ok((rec.__texts || []).join(' ').indexOf('TFG') >= 0, 'canvas: rótulos de eixo presentes');

// ----- o esquema do glomérulo (SVG) foi renderizado a partir do engine -----
ok(doc.querySelector('#glom-svg svg') !== null, 'instrumento: esquema do glomérulo (SVG) presente');

// ----- tutor: DOIS blocos (ilustrado ≥10 + textual ≥10), bem-formados -----
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
// cada item ilustrado precisa de uma ilustração SVG não-vazia, computada
var semFig = 0;
(TI || []).forEach(function (it) {
  if (typeof it.fig !== 'function') { semFig++; return; }
  var svg = '';
  try { svg = it.fig(); } catch (e) { svg = ''; }
  if (!/<svg[\s>]/.test(String(svg)) || !/<(rect|circle|line|path|text)/.test(String(svg))) semFig++;
});
ok(semFig === 0, 'tutor ilustrado: toda questão traz ilustração SVG não-vazia (' + semFig + ' sem)');

// ----- ilustração viva: a aba Avaliação renderiza a figura no DOM + conceito no Caso -----
ok(doc.getElementById('tutor-fig') !== null && doc.querySelector('#tutor-fig svg') !== null,
  'Avaliação: ilustração renderizada no DOM (#tutor-fig svg)');
ok(doc.querySelector('#fig-conceito svg') !== null, 'Caso: ilustração de conceito presente');
ok(doc.querySelectorAll('#banktabs button').length === 2, 'Avaliação: dois blocos (ilustrada/textual)');

// ----- lab/veredito existe e reage -----
ok(doc.getElementById('veredito').textContent.length > 1, 'lab: veredito computado (não vazio)');
ok(doc.getElementById('out-tfg').textContent !== '—', 'lab: saídas preenchidas no init');

// ----- cromo: kicker, hexápode, rodapé, backlink, disclaimer -----
var body = doc.body.textContent;
ok(/FILTRA/.test(doc.querySelector('.kicker') ? doc.querySelector('.kicker').textContent : ''), 'cromo: kicker FILTRA');
ok(doc.querySelector('nav.hex .ativo') !== null, 'cromo: hexápode com braço ativo');
ok(/CRM-SP 151\.318 · Dr\. Matheus M\. Coelho · Limeira/.test(body), 'cromo: rodapé de série');
ok(doc.querySelector('a[href="filtra.html"]') !== null, 'cromo: backlink relativo ao índice');
ok(/educacional/i.test(body) && doc.querySelector('.disc') !== null, 'disclaimer educacional presente');

// ----- guarda invertida (§8): M1 é hemodinâmica pura → cita fármaco, mas SEM dose solta -----
ok(/AINE/.test(body) && /IECA/.test(body), 'fármaco como alavanca (AINE/IECA citados)');
// dose = massa solta (ex.: "40 mg"); NÃO conta concentração laboratorial (ex.: "2,3 mg/dL")
ok(!/\b\d+\s?(mg|mcg|µg)\b(?!\/)/.test(body), 'M1 sem doses soltas (a farmacologia dosada entra no M2)');

console.log(oks + ' OK · ' + fail + ' falhas');
process.exit(fail > 0 ? 1 : 0);
