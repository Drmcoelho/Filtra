'use strict';
/*
 * FILTRA · M28 — validador jsdom (portão do §6)
 * estrutura · engine ≡ UI (trrc, efluenteParaDose, fluxoPlasma, fatorPreDiluicao, clearanceCurveLayout) ·
 * a curva clearance × efluente pintada no canvas ≡ clearanceCurveLayout() · caso ≥5 · trilha ≥9 ·
 * dois bancos (ilustrado SVG/raster + textual) · figura viva ≥8 · cromo · disclaimer.
 * Guarda farmacológica invertida §8: a dose é mL/kg/h — PROÍBE mg/mcg/µg solto; EXIGE mL/kg/h presente.
 */
var fs = require('fs');
var path = require('path');
var jsdom = require('jsdom');
var JSDOM = jsdom.JSDOM;

var ref = require('./model28.js');
var imgGuard = require('../lib/img-guard.js');

var oks = 0, fail = 0;
function ok(c, m) { if (c) { oks++; } else { fail++; console.error('FALHA: ' + m); } }

var htmlPath = path.join(__dirname, '..', '..', 'filtra28.html');
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
  'clear-canvas', 'in-peso', 'in-qeff', 'in-qpre', 'in-qpos', 'in-qb', 'in-down',
  'out-presc', 'out-entr', 'out-plasma', 'out-ff', 'out-fpre', 'out-clear',
  'veredito', 'instr-pearl', 'lab-pearl', 'fig-caso',
  'tutor-q', 'tutor-opts', 'tutor-fb', 'tutor-score', 'tutor-total', 'tutor-fig',
  'draw-efluente', 'draw-downtime', 'draw-prepos', 'draw-ff', 'draw-clear'
];
ids.forEach(function (id) { ok(doc.getElementById(id) !== null, 'estrutura: #' + id + ' presente'); });
ok(doc.querySelectorAll('#tabs button').length === 6, 'estrutura: 6 abas');
ok(doc.getElementById('clear-canvas').tagName.toLowerCase() === 'canvas', 'instrumento: canvas clear-canvas');

// Conceito
ok(doc.querySelectorAll('#tab-conceito svg').length >= 5, 'Conceito: ≥5 desenhos computados (SVG inline)');
var conc = doc.getElementById('tab-conceito').textContent;
ok(/efluente/i.test(conc), 'Conceito: efluente');
ok(/mL\/kg\/h/i.test(conc), 'Conceito: dose em mL/kg/h');
ok(/pré.?dilui|pos.?dilui|pós.?dilui/i.test(conc), 'Conceito: pré × pós-diluição');
ok(/fração de filtra/i.test(conc), 'Conceito: fração de filtração');
ok(/homeostas/i.test(conc), 'Conceito: homeostasia como conceito-fio');
ok(/Q_efluente\s*÷\s*peso|efluente\s*÷\s*peso/i.test(conc), 'Conceito: fórmula da dose (efluente ÷ peso)');
ok(/Q_plasma\s*÷\s*\(Q_plasma\s*\+\s*Q_pré\)|plasma\/\(plasma\+pré\)/i.test(conc), 'Conceito: fórmula do fator de pré-diluição');

// caso ≥5 + trilha ≥9
ok(doc.querySelectorAll('button.act[data-rev]').length >= 5, 'caso: ≥5 atos');
ok(doc.querySelectorAll('#caso .reveal').length >= 5, 'caso: ≥5 reveláveis');
ok(doc.querySelector('#fig-caso svg') !== null, 'Caso: ilustração SVG');
ok(doc.querySelectorAll('#trilha details').length >= 9, 'trilha: ≥9 passos');

// engine ≡ UI
ok(typeof win.trrc === 'function', 'UI expõe trrc()');
ok(typeof win.efluenteParaDose === 'function', 'UI expõe efluenteParaDose()');
ok(typeof win.fluxoPlasma === 'function', 'UI expõe fluxoPlasma()');
ok(typeof win.fatorPreDiluicao === 'function', 'UI expõe fatorPreDiluicao()');
ok(typeof win.clearanceCurveLayout === 'function', 'UI expõe clearanceCurveLayout()');
var amostras = [
  {}, { peso: 110, qEfluente: 1750 }, { qEfluente: 4000, qPre: 0, qPos: 2000, qb: 100 },
  { qEfluente: 2000, qPre: 2000, qb: 150 }, { downtime: 40 }, { qb: 250, qEfluente: 2000, qPre: 0 },
  { peso: null, qEfluente: 'x', qb: -5, downtime: 9999 }
];
var divT = 0;
amostras.forEach(function (a) { if (JSON.stringify(win.trrc(a)) !== JSON.stringify(ref.trrc(a))) divT++; });
ok(divT === 0, 'engine ≡ UI: trrc inline idêntico ao model28.js (' + divT + ' divergências)');
var divE = 0;
[[25, 70], [25, 110], [20, 80], [30, 60]].forEach(function (t) {
  if (Math.abs(win.efluenteParaDose(t[0], t[1]) - ref.efluenteParaDose(t[0], t[1])) > 1e-9) divE++;
});
ok(divE === 0, 'efluenteParaDose ≡ UI (' + divE + ' divergências)');
ok(Math.abs(win.fluxoPlasma(150, 0.30) - ref.fluxoPlasma(150, 0.30)) < 1e-9, 'fluxoPlasma ≡ UI');
ok(Math.abs(win.fatorPreDiluicao(105, 16.6) - ref.fatorPreDiluicao(105, 16.6)) < 1e-9, 'fatorPreDiluicao ≡ UI');
var divL = 0;
amostras.forEach(function (a) { if (JSON.stringify(win.clearanceCurveLayout(a, 900, 360)) !== JSON.stringify(ref.clearanceCurveLayout(a, 900, 360))) divL++; });
ok(divL === 0, 'clearanceCurveLayout ≡ UI (' + divL + ' divergências)');

// canvas curva == clearanceCurveLayout(engine)
var canvasEl = doc.getElementById('clear-canvas');
var rec = canvasEl.getContext('2d');
ok(rec && Array.isArray(rec.__paths), 'canvas: contexto exercido');
var initState = { peso: 70, qEfluente: 1750, qPre: 1000, qPos: 0, qb: 150, downtime: 20 };
var Lref = ref.clearanceCurveLayout(initState, canvasEl.width, canvasEl.height);
function acharPath(pts) {
  // ptsPre e ptsPos partem do mesmo ponto (eff=0 → c=0); desambigua por um ponto do meio.
  var mid = (pts.length / 2) | 0, found = null;
  (rec.__paths || []).forEach(function (p) {
    if (p.length === pts.length && p[mid] && Math.abs(p[mid].y - pts[mid].y) < 1e-4 && Math.abs(p[mid].x - pts[mid].x) < 1e-4) found = p;
  });
  return found;
}
var posPath = acharPath(Lref.ptsPos), prePath = acharPath(Lref.ptsPre);
ok(posPath !== null, 'canvas: polilinha PÓS pintada (' + Lref.ptsPos.length + ' pontos)');
ok(prePath !== null, 'canvas: polilinha PRÉ pintada (' + Lref.ptsPre.length + ' pontos)');
function bate(p, pts) { if (!p) return false; for (var i = 0; i < pts.length; i++) { if (Math.abs(p[i].x - pts[i].x) > 1e-6 || Math.abs(p[i].y - pts[i].y) > 1e-6) return false; } return true; }
ok(bate(posPath, Lref.ptsPos), 'canvas: cada ponto PÓS == clearanceCurveLayout(engine) (1e-6)');
ok(bate(prePath, Lref.ptsPre), 'canvas: cada ponto PRÉ == clearanceCurveLayout(engine) (1e-6)');
ok((rec.__rects || []).filter(function (q) { return q.op === 'fill'; }).length >= 1, 'canvas: marcador pintado');

// Lab init
ok(doc.getElementById('out-presc').textContent !== '—', 'lab: out-presc preenchido no init');
ok(doc.getElementById('out-ff').textContent !== '—', 'lab: out-ff preenchido no init');
ok(doc.getElementById('out-clear').textContent !== '—', 'lab: out-clear preenchido no init');
ok(doc.getElementById('veredito').textContent.length > 1, 'lab: veredito computado');
ok(doc.getElementById('lab-pearl').textContent.length > 1, 'lab: pérola computada');
ok(doc.querySelectorAll('.presets button[data-preset]').length >= 4, 'lab: ≥4 presets');

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
ok(comImg >= 1, 'tutor ilustrado: usa figuras nos exercícios (' + comImg + ')');
ok(doc.querySelector('#tutor-fig svg') !== null, 'Avaliação: ilustração renderizada no DOM');
ok(doc.querySelectorAll('#banktabs button').length === 2, 'Avaliação: dois blocos');

// guarda farmacológica invertida (§8): NÃO pode haver dose de massa solta (mg/mcg/µg);
// a dose deste módulo é mL/kg/h. mL/h e % são livres.
var body = doc.body.textContent;
ok(!/\b\d+\s?(mg|mcg|µg)\b(?!\/)/.test(body), 'guarda §8: sem dose de massa solta (mg/mcg/µg) — a dose é mL/kg/h');
ok(/mL\/kg\/h/.test(body), 'guarda §8: dose em mL/kg/h presente e explícita');

// cromo
ok(/FILTRA/.test(doc.querySelector('.kicker') ? doc.querySelector('.kicker').textContent : ''), 'cromo: kicker');
ok(/módulo M28/.test(doc.querySelector('.kicker') ? doc.querySelector('.kicker').textContent : ''), 'cromo: kicker M28');
ok(doc.querySelector('nav.hex .ativo') !== null, 'cromo: hexápode ativo');
ok(/CRM-SP 151\.318 · Dr\. Matheus M\. Coelho · Limeira/.test(body), 'cromo: rodapé');
ok(doc.querySelector('a[href="dialisa.html"]') !== null, 'cromo: backlink dialisa');
ok(/educacional/i.test(body) && doc.querySelector('.disc') !== null, 'disclaimer educacional');

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
