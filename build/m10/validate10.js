'use strict';
/*
 * FILTRA · M10 — validador jsdom (portão do §6)
 * estrutura · engine ≡ UI (agua, adhFrom, aguaLayout) · a trajetória do Na e a faixa
 * segura pintadas no canvas ≡ aguaLayout() · caso ≥8 · trilha ≥13 · dois bancos
 * (ilustrado SVG/raster + textual) · figura viva ≥8 · cromo · disclaimer.
 * M10 é Água livre e disnatremias (ADH, clearance de água livre, velocidade de
 * correção) — fisiologia NÃO farmacológica. Portanto SEM guarda farmacológica de dose.
 */
var fs = require('fs');
var path = require('path');
var jsdom = require('jsdom');
var JSDOM = jsdom.JSDOM;

var ref = require('./model10.js');
var imgGuard = require('../lib/img-guard.js');

var oks = 0, fail = 0;
function ok(c, m) { if (c) { oks++; } else { fail++; console.error('FALHA: ' + m); } }

var htmlPath = path.join(__dirname, '..', '..', 'filtra10.html');
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
  'na-canvas', 'in-agua', 'in-osm', 'in-vce', 'in-def', 'in-ing', 'in-perda', 'in-cron', 'in-taxa',
  'out-na', 'out-toni', 'out-tbw', 'out-adh', 'out-uosm', 'out-ch2o', 'out-dna', 'out-lim', 'out-disn', 'out-classe', 'out-risco',
  'veredito', 'instr-pearl', 'lab-pearl', 'fig-caso',
  'tutor-q', 'tutor-opts', 'tutor-fb', 'tutor-score', 'tutor-total', 'tutor-fig',
  'draw-osmo', 'draw-na', 'draw-clear', 'draw-classe', 'draw-di', 'draw-adapt', 'draw-sintese'
];
ids.forEach(function (id) { ok(doc.getElementById(id) !== null, 'estrutura: #' + id + ' presente'); });
ok(doc.querySelectorAll('#tabs button').length === 6, 'estrutura: 6 abas');
ok(doc.getElementById('na-canvas').tagName.toLowerCase() === 'canvas', 'instrumento: canvas na-canvas');

// Conceito
ok(doc.querySelectorAll('#tab-conceito svg').length >= 3, 'Conceito: ≥3 desenhos computados');
var conc = doc.getElementById('tab-conceito').textContent;
ok(/ADH|vasopressina/i.test(conc), 'Conceito: ADH/vasopressina');
ok(/água livre/i.test(conc), 'Conceito: água livre');
ok(/SIADH/i.test(conc), 'Conceito: SIADH');
ok(/diabetes insipidus/i.test(conc), 'Conceito: diabetes insipidus');
ok(/mielin[óo]lise/i.test(conc), 'Conceito: mielinólise');
ok(/velocidade|correção/i.test(conc), 'Conceito: velocidade/correção');
ok(/homeostas/i.test(conc), 'Conceito: homeostasia como conceito-fio');

// caso ≥8 + trilha ≥13
ok(doc.querySelectorAll('button.act[data-rev]').length >= 8, 'caso: ≥8 atos');
ok(doc.querySelectorAll('#caso .reveal').length >= 8, 'caso: ≥8 reveláveis');
ok(doc.querySelector('#fig-caso svg') !== null, 'Caso: ilustração SVG');
ok(doc.querySelectorAll('#trilha details').length >= 13, 'trilha: ≥13 passos');

// engine ≡ UI
ok(typeof win.agua === 'function', 'UI expõe agua()');
ok(typeof win.adhFrom === 'function', 'UI expõe adhFrom()');
ok(typeof win.aguaLayout === 'function', 'UI expõe aguaLayout()');
var amostras = [
  {}, { aguaLivre: 8 }, { aguaLivre: -8 }, { defeito: 'siadh', aguaLivre: 8 }, { vce: 0.5, aguaLivre: 6 },
  { defeito: 'central', aguaLivre: -9 }, { defeito: 'nefrogenico', aguaLivre: -9 },
  { aguaLivre: 8, cronicidade: 1, taxaCorrecao: 14 }, { aguaLivre: 8, cronicidade: 0, taxaCorrecao: 8 },
  { aguaLivre: null, osmEfet: 'x', vce: NaN, defeito: 'lixo', ingestaAgua: Infinity, perdaInsens: -5, cronicidade: 9, taxaCorrecao: -3 }
];
var divC = 0;
amostras.forEach(function (a) { if (JSON.stringify(win.agua(a)) !== JSON.stringify(ref.agua(a))) divC++; });
ok(divC === 0, 'engine ≡ UI: agua inline idêntico ao model10.js (' + divC + ' divergências)');
var divA = 0;
[[140, 1, 'nenhum'], [150, 1, 'nenhum'], [120, 0.4, 'nenhum'], [120, 1, 'siadh'], [180, 1, 'central'], [130, 0.6, 'nenhum']].forEach(function (t) {
  if (Math.abs(win.adhFrom(t[0], t[1], t[2]) - ref.adhFrom(t[0], t[1], t[2])) > 1e-12) divA++;
});
ok(divA === 0, 'adhFrom ≡ UI (' + divA + ' divergências)');
var divL = 0;
amostras.forEach(function (a) { if (JSON.stringify(win.aguaLayout(a, 900, 360)) !== JSON.stringify(ref.aguaLayout(a, 900, 360))) divL++; });
ok(divL === 0, 'aguaLayout ≡ UI (' + divL + ' divergências)');

// canvas trajetória/faixa == aguaLayout(engine)
var canvasEl = doc.getElementById('na-canvas');
var rec = canvasEl.getContext('2d');
ok(rec && Array.isArray(rec.__paths), 'canvas: contexto exercido');
var initState = { aguaLivre: 0, osmEfet: 1, vce: 1, defeito: 'nenhum', ingestaAgua: 1, perdaInsens: 1, cronicidade: 1, taxaCorrecao: 6 };
var Lref = ref.aguaLayout(initState, canvasEl.width, canvasEl.height);
// localiza a polilinha do teto seguro (ptsSeguro): comprimento == N+1 e primeiro ponto bate
var safePath = null, corrPath = null;
(rec.__paths || []).forEach(function (p) {
  if (p.length === Lref.ptsSeguro.length && p[0] && Math.abs(p[0].x - Lref.ptsSeguro[0].x) < 1e-4 && Math.abs(p[0].y - Lref.ptsSeguro[0].y) < 1e-4) safePath = p;
});
(rec.__paths || []).forEach(function (p) {
  if (p.length === Lref.ptsCorrige.length && p[0] && Math.abs(p[0].x - Lref.ptsCorrige[0].x) < 1e-4 && Math.abs(p[0].y - Lref.ptsCorrige[0].y) < 1e-4) corrPath = p;
});
ok(safePath !== null, 'canvas: teto seguro pintado (' + Lref.ptsSeguro.length + ' pontos)');
ok(corrPath !== null, 'canvas: trajetória de correção pintada (' + Lref.ptsCorrige.length + ' pontos)');
var pintaOk = true;
if (corrPath) { for (var i = 0; i < Lref.ptsCorrige.length; i++) { var pp = corrPath[i]; if (Math.abs(pp.x - Lref.ptsCorrige[i].x) > 1e-4 || Math.abs(pp.y - Lref.ptsCorrige[i].y) > 1e-4) { pintaOk = false; break; } } }
ok(pintaOk, 'canvas: cada ponto da trajetória == aguaLayout(engine)');
ok((rec.__rects || []).filter(function (q) { return q.op === 'fill'; }).length >= 1, 'canvas: marcador pintado');

// Lab init
ok(doc.getElementById('out-na').textContent !== '—', 'lab: out-na preenchido no init');
ok(doc.getElementById('out-adh').textContent !== '—', 'lab: out-adh preenchido no init');
ok(doc.getElementById('out-lim').textContent !== '—', 'lab: out-lim preenchido no init');
ok(doc.getElementById('veredito').textContent.length > 1, 'lab: veredito computado');
ok(doc.getElementById('lab-pearl').textContent.length > 1, 'lab: pérola computada');
ok(doc.querySelectorAll('.presets button[data-preset]').length >= 4, 'lab: ≥4 presets');

// tutor
function malformados(bank) { var n = 0; (bank || []).forEach(function (it) { if (!it || !Array.isArray(it.o) || it.o.length < 2) n++; else if (typeof it.c !== 'number' || it.c < 0 || it.c >= it.o.length) n++; else if (!it.e || String(it.e).length < 3) n++; }); return n; }
var TI = win.TUTOR_ILUSTRADO, TT = win.TUTOR_TEXTUAL;
ok(Array.isArray(TI) && TI.length >= 13, 'tutor: ILUSTRADO ≥13 (tem ' + (TI ? TI.length : 0) + ')');
ok(Array.isArray(TT) && TT.length >= 13, 'tutor: TEXTUAL ≥13 (tem ' + (TT ? TT.length : 0) + ')');
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
ok(doc.querySelector('nav.hex .ativo') !== null, 'cromo: hexápode ativo');
ok(/CRM-SP 151\.318 · Dr\. Matheus M\. Coelho · Limeira/.test(body), 'cromo: rodapé');
ok(doc.querySelector('a[href="filtra.html"]') !== null, 'cromo: backlink');
ok(/educacional/i.test(body) && doc.querySelector('.disc') !== null, 'disclaimer educacional');
ok(/honestidade do modelo/i.test(body), 'disclaimer: nota de honestidade do modelo');

// pontes obrigatórias (M9 / M8)
ok(/M9/.test(body), 'ponte: M9 (volume × tonicidade) citada');
ok(/M8/.test(body), 'ponte: M8 (ADH/aquaporina/vaptano) citado');

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

// ANTI-STUB: cada SVG referenciado de assets/m10 deve ser figura autoral (>2KB e sem o template-stub)
var svgsRef = {};
(html.match(/assets\/m10\/[a-z0-9-]+\.svg/gi) || []).forEach(function (s) { svgsRef[s] = true; });
var refList = Object.keys(svgsRef);
ok(refList.length >= 8, 'anti-stub: ≥8 SVGs autorais referenciados (tem ' + refList.length + ')');
var stubRestante = refList.filter(function (rel) {
  var p = path.join(__dirname, '..', '..', rel);
  if (!fs.existsSync(p)) return true;
  var t = fs.readFileSync(p, 'utf8');
  if (t.length < 2048) return true;                                   // ~2KB mínimo
  return /ícone visual simples/.test(t) || /text-anchor="middle" font-size="17" font-weight="bold"/.test(t);
});
ok(stubRestante.length === 0, 'anti-stub: nenhum SVG-stub remanescente (' + stubRestante.join(', ') + ')');

console.log(oks + ' OK · ' + fail + ' falhas');
process.exit(fail > 0 ? 1 : 0);
