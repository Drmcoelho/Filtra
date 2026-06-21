'use strict';
/*
 * FILTRA · M16 — validador jsdom (portão do §6)
 * estrutura · engine ≡ UI (lra, feNa, feUreia, tfgStarling, kdigo*, indexSpaceLayout) ·
 * a fronteira FE_Na=1% pintada no canvas ≡ indexSpaceLayout() · caso ≥5 atos · trilha ≥9 ·
 * dois bancos (ilustrado SVG/raster + textual) · figura viva ≥8 · cromo · disclaimer.
 * M16 é capstone fisiológico (mecanismo, índices, conduta) — NÃO promete dose de massa solta:
 * a guarda PROÍBE \b\d+\s?(mg|mcg|µg)\b (sem barra de taxa) — valores/taxas de lab são livres.
 */
var fs = require('fs');
var path = require('path');
var jsdom = require('jsdom');
var JSDOM = jsdom.JSDOM;

var ref = require('./model16.js');
var imgGuard = require('../lib/img-guard.js');

var oks = 0, fail = 0;
function ok(c, m) { if (c) { oks++; } else { fail++; console.error('FALHA: ' + m); } }

var htmlPath = path.join(__dirname, '..', '..', 'filtra16.html');
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
  'lra-canvas', 'in-pgc', 'in-tub', 'in-pbc', 'in-pven', 'in-vaso', 'in-una', 'in-ucr', 'in-pcr', 'in-uosm',
  'in-cratual', 'in-debito', 'in-sed',
  'out-tfg', 'out-fena', 'out-feur', 'out-buncr', 'out-uosm', 'out-kdigo', 'out-mec', 'out-vol',
  'veredito', 'instr-pearl', 'lab-pearl', 'fig-caso',
  'tutor-q', 'tutor-opts', 'tutor-fb', 'tutor-score', 'tutor-total', 'tutor-fig',
  'draw-portas', 'draw-kdigo', 'draw-indices', 'draw-pos', 'draw-pontes'
];
ids.forEach(function (id) { ok(doc.getElementById(id) !== null, 'estrutura: #' + id + ' presente'); });
ok(doc.querySelectorAll('#tabs button').length === 6, 'estrutura: 6 abas');
ok(doc.getElementById('lra-canvas').tagName.toLowerCase() === 'canvas', 'instrumento: canvas lra-canvas');

// Conceito ≥5 desenhos SVG computados + a fórmula FENa
ok(doc.querySelectorAll('#tab-conceito svg').length >= 5, 'Conceito: ≥5 desenhos computados (SVG)');
var conc = doc.getElementById('tab-conceito').textContent;
ok(/FE_Na\s*=\s*\(U_Na·P_Cr\)\/\(P_Na·U_Cr\)·100/.test(conc), 'Conceito: fórmula FE_Na presente');
ok(/pré-renal/i.test(conc) && /intrínseca|NTA/i.test(conc) && /pós-renal/i.test(conc), 'Conceito: as três vias');
ok(/KDIGO/.test(conc), 'Conceito: KDIGO');
ok(/cardiorrenal/i.test(conc) && /hepatorrenal/i.test(conc), 'Conceito: pontes cardiorrenal e hepatorrenal');
ok(/homeostas/i.test(conc), 'Conceito: homeostasia como conceito-fio');

// caso ≥5 atos + trilha ≥9
ok(doc.querySelectorAll('button.act[data-rev]').length >= 5, 'caso: ≥5 atos');
ok(doc.querySelectorAll('#caso .reveal').length >= 5, 'caso: ≥5 reveláveis');
ok(doc.querySelector('#fig-caso svg') !== null, 'Caso: ilustração SVG');
ok(doc.querySelectorAll('#trilha details').length >= 9, 'trilha: ≥9 passos');

// engine ≡ UI
ok(typeof win.lra === 'function', 'UI expõe lra()');
ok(typeof win.feNa === 'function', 'UI expõe feNa()');
ok(typeof win.feUreia === 'function', 'UI expõe feUreia()');
ok(typeof win.tfgStarling === 'function', 'UI expõe tfgStarling()');
ok(typeof win.kdigoCreat === 'function', 'UI expõe kdigoCreat()');
ok(typeof win.indexSpaceLayout === 'function', 'UI expõe indexSpaceLayout()');
var amostras = [
  {}, { pGC: 38, crBasal: 1, crAtual: 2.5, uNa: 10, uCr: 150, pCr: 2.5, uOsm: 650, uUr: 1200, pUr: 120 },
  { integridadeTub: 0.3, uNa: 60, uCr: 40, pCr: 3.2, uOsm: 300, sedimento: 'granuloso', crAtual: 3.2 },
  { pBC: 35, crAtual: 3.0, debitoUrinario: 0.2 },
  { sedimento: 'eosinofilo', integridadeTub: 0.8 },
  { pressaoVenosa: 18, integridadeTub: 0.9, uNa: 8, uCr: 120, pCr: 2.4 },
  { vasodilatacaoEsplancnica: 0.8, integridadeTub: 0.9, uNa: 5, uCr: 200, pCr: 2.8 },
  { pGC: null, uNa: 'x', crAtual: -5, sedimento: 'bizarro' }
];
var divC = 0;
amostras.forEach(function (a) { if (JSON.stringify(win.lra(a)) !== JSON.stringify(ref.lra(a))) divC++; });
ok(divC === 0, 'engine ≡ UI: lra inline idêntico ao model16.js (' + divC + ' divergências)');
var divF = 0;
[[10, 2.5, 140, 150], [60, 3.2, 140, 40], [40, 3.0, 138, 50], [5, 2.8, 142, 200]].forEach(function (t) {
  if (Math.abs(win.feNa(t[0], t[1], t[2], t[3]) - ref.feNa(t[0], t[1], t[2], t[3])) > 1e-12) divF++;
});
ok(divF === 0, 'feNa ≡ UI (' + divF + ' divergências)');
ok(Math.abs(win.tfgStarling(55, 15, 12, 28) - ref.tfgStarling(55, 15, 12, 28)) < 1e-9, 'tfgStarling ≡ UI');
ok(win.kdigoCreat(1, 3.2) === ref.kdigoCreat(1, 3.2) && win.kdigoDebito(0.2) === ref.kdigoDebito(0.2), 'kdigo ≡ UI');
var divL = 0;
amostras.forEach(function (a) { if (JSON.stringify(win.indexSpaceLayout(a, 900, 360)) !== JSON.stringify(ref.indexSpaceLayout(a, 900, 360))) divL++; });
ok(divL === 0, 'indexSpaceLayout ≡ UI (' + divL + ' divergências)');

// canvas: a fronteira FE_Na=1% == indexSpaceLayout(engine)
var canvasEl = doc.getElementById('lra-canvas');
var rec = canvasEl.getContext('2d');
ok(rec && Array.isArray(rec.__paths), 'canvas: contexto exercido');
var initState = {
  pGC: 55, integridadeTub: 1, pBC: 15, pressaoVenosa: 8, vasodilatacaoEsplancnica: 0,
  uNa: 20, uCr: 100, pCr: 2.5, uOsm: 600, crBasal: 1.0, crAtual: 2.5, debitoUrinario: 0.4, sedimento: 'limpo',
  uUr: 400 + 600 * 1.2, pUr: 40 + 2.5 * 16
};
var Lref = ref.indexSpaceLayout(initState, canvasEl.width, canvasEl.height);
var curvePath = null;
(rec.__paths || []).forEach(function (p) { if (p.length === Lref.pts.length && p[0] && Math.abs(p[0].y - Lref.pts[0].y) < 1e-4 && Math.abs(p[0].x - Lref.pts[0].x) < 1e-4) curvePath = p; });
ok(curvePath !== null, 'canvas: polilinha da fronteira FE_Na=1% pintada (' + Lref.pts.length + ' pontos)');
var pintaOk = true;
if (curvePath) { for (var i = 0; i < Lref.pts.length; i++) { var pp = curvePath[i]; if (Math.abs(pp.x - Lref.pts[i].x) > 1e-6 || Math.abs(pp.y - Lref.pts[i].y) > 1e-6) { pintaOk = false; break; } } }
ok(pintaOk, 'canvas: cada ponto da fronteira == indexSpaceLayout(engine) (1e-6)');
ok((rec.__rects || []).filter(function (q) { return q.op === 'fill'; }).length >= 1, 'canvas: ponto do caso pintado');

// Lab init
ok(doc.getElementById('out-tfg').textContent !== '—', 'lab: out-tfg preenchido no init');
ok(doc.getElementById('out-fena').textContent !== '—', 'lab: out-fena preenchido no init');
ok(doc.getElementById('out-mec').textContent !== '—', 'lab: mecanismo computado no init');
ok(doc.getElementById('veredito').textContent.length > 1, 'lab: veredito computado');
ok(doc.getElementById('lab-pearl').textContent.length > 1, 'lab: pérola computada');
ok(doc.querySelectorAll('.presets button[data-preset]').length >= 6, 'lab: ≥6 presets (um por mecanismo)');

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
ok(/módulo M16/.test(doc.querySelector('.kicker') ? doc.querySelector('.kicker').textContent : ''), 'cromo: kicker M16');
ok(doc.querySelector('nav.hex .ativo') !== null, 'cromo: hexápode ativo');
ok(/FILTRA/.test(doc.querySelector('nav.hex .ativo').textContent), 'cromo: FILTRA é o braço ativo');
ok(/CRM-SP 151\.318 · Dr\. Matheus M\. Coelho · Limeira/.test(body), 'cromo: rodapé');
ok(doc.querySelector('a[href="filtra.html"]') !== null, 'cromo: backlink');
ok(/educacional/i.test(body) && doc.querySelector('.disc') !== null, 'disclaimer educacional');
ok(/honestidade do modelo/i.test(body), 'disclaimer: nota de honestidade do modelo');

// guarda farmacológica INVERTIDA p/ capstone fisiológico: NÃO há dose de massa solta
ok(!/\b\d+\s?(mg|mcg|µg)\b(?!\/)/.test(body), 'guarda: nenhuma dose de massa solta (mg/mcg/µg sem taxa) — M16 é mecanismo, não prescrição');

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
