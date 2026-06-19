'use strict';
/*
 * FILTRA · M3 — validador jsdom (portão do §6)
 * Confere: estrutura (IDs/abas) · engine ≡ UI (glomerulo, theta, sievingCurveLayout,
 * barreiraLayout) · a curva de sieving pintada no canvas ≡ sievingCurveLayout() ·
 * camada interativa · os dois bancos do tutor (ilustrado c/ SVG + textual) · cromo ·
 * disclaimer.
 *
 * Guarda farmacológica INVERTIDA (§8): M3 é a barreira de filtração — cita fármacos
 * como ALAVANCA da proteinúria (IECA/BRA, SGLT2i reduzem a hiperfiltração), mas SEM
 * dose em massa solta (a farmacologia dosada mora nos capstones). Logo: exige
 * disclaimer e proíbe dose solta (mg/mcg/µg).
 */

var fs   = require('fs');
var path = require('path');
var jsdom = require('jsdom');
var JSDOM = jsdom.JSDOM;

var ref      = require('./model3.js');           // engine canônico (Node)
var imgGuard = require('../lib/img-guard.js');   // guarda offline compartilhada

var oks = 0, fail = 0;
function ok(c, m) { if (c) { oks++; } else { fail++; console.error('FALHA: ' + m); } }

var htmlPath = path.join(__dirname, '..', '..', 'filtra3.html');
var html = fs.readFileSync(htmlPath, 'utf8');

// contexto-gravador: registra rects, texts e SUBPATHS (para verificar a polilinha do canvas)
function recorderCtx() {
  var rects = [], texts = [], paths = [], cur = null;
  return {
    fillStyle: '', strokeStyle: '', lineWidth: 1, globalAlpha: 1, font: '', canvas: null,
    clearRect: function () {},
    fillRect:  function (x, y, w, h) { rects.push({ op: 'fill',   x: x, y: y, w: w, h: h }); },
    strokeRect:function (x, y, w, h) { rects.push({ op: 'stroke', x: x, y: y, w: w, h: h }); },
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

// ─── estrutura: abas e IDs essenciais ────────────────────────────────────────
var ids = [
  'tabs','tab-conceito','tab-caso','tab-trilha','tab-instrumento','tab-lab','tab-avaliacao',
  'sieving-canvas','barreira-svg',
  'in-lp','in-s','in-cb','in-sb','in-tub','in-palb','in-gfr','in-probe',
  'out-kf','out-talb','out-tigg','out-si','out-selet','out-filt','out-alb','out-tub','out-banda','out-padrao','out-regime',
  'veredito','instr-pearl','lab-pearl','fig-caso',
  'tutor-q','tutor-opts','tutor-fb','tutor-score','tutor-total','tutor-fig',
  'draw-barreira','draw-carga','draw-tamanho','draw-podocito','draw-proteinuria'
];
ids.forEach(function (id) { ok(doc.getElementById(id) !== null, 'estrutura: #' + id + ' presente'); });

ok(doc.querySelectorAll('#tabs button').length === 6, 'estrutura: 6 abas');
ok(doc.getElementById('sieving-canvas').tagName.toLowerCase() === 'canvas', 'instrumento: canvas sieving-canvas');

// ─── aba CONCEITO: ≥5 SVGs + fórmula Kf=Lp·S + carga/tamanho ──────────────────
ok(doc.querySelectorAll('#tab-conceito svg').length >= 5,
  'Conceito: ≥5 desenhos esquemáticos (barreira, carga, tamanho, podócito, proteinúria)');

var conc = doc.getElementById('tab-conceito').textContent;
ok(/Kf\s*=\s*Lp\s*·?\s*S/.test(conc), 'Conceito: fórmula Kf = Lp · S exposta');
ok(/θ/.test(conc), 'Conceito: coeficiente de sieving θ mencionado');
ok(/carga/.test(conc) && /tamanho/.test(conc), 'Conceito: barreira de carga × tamanho explicadas');
ok(/podócito/.test(conc) && /nefrina/.test(conc), 'Conceito: podócito e nefrina (diafragma de fenda)');
ok(/glomerular/.test(conc) && /tubular/.test(conc), 'Conceito: proteinúria glomerular × tubular');
ok(/mesangial/.test(conc), 'Conceito: contração mesangial (alavanca do Kf)');

// ─── caso (5 atos, prever-depois-revelar) ────────────────────────────────────
ok(doc.querySelectorAll('button.act[data-rev]').length >= 5, 'caso: ≥5 atos com revelar');
ok(doc.querySelectorAll('#caso .reveal').length >= 5,        'caso: ≥5 blocos reveláveis');
ok(doc.querySelector('#fig-caso svg') !== null,              'Caso: ilustração SVG presente (#fig-caso)');

// ─── trilha socrática (≥9 passos) ────────────────────────────────────────────
ok(doc.querySelectorAll('#trilha details').length >= 9, 'trilha: ≥9 passos socráticos');

// ─── engine ≡ UI: glomerulo inline ≡ model3.js ───────────────────────────────
ok(typeof win.glomerulo === 'function', 'UI expõe glomerulo()');
var amostras = [
  { },
  { cb: 0, sb: 1 },
  { sb: 0.2 },
  { S: 0.4 },
  { tubInjury: 0.8 },
  { Lp: 1.3, S: 0.7, cb: 0.5, sb: 0.6, P_alb: 30, GFR: 90, probe: 'IgG' },
  { cb: null, sb: NaN, Lp: 'x', tubInjury: undefined, probe: 'lixo' } // sujeira → clamps
];
var divG = 0;
amostras.forEach(function (a) {
  if (JSON.stringify(win.glomerulo(a)) !== JSON.stringify(ref.glomerulo(a))) divG++;
});
ok(divG === 0, 'engine ≡ UI: glomerulo inline idêntico ao model3.js (' + divG + ' divergências)');

// ─── engine ≡ UI: theta, sievingCurveLayout, barreiraLayout ──────────────────
ok(typeof win.theta              === 'function', 'UI expõe theta()');
ok(typeof win.sievingCurveLayout === 'function', 'UI expõe sievingCurveLayout()');
ok(typeof win.barreiraLayout     === 'function', 'UI expõe barreiraLayout()');

var divT = 0, divSv = 0, divBar = 0;
[[1.4,0,1,1],[3.6,-1,1,1],[5.5,-1,0,1],[3.6,-1,0.5,0.5],[2.0,1,1,1]].forEach(function (p) {
  if (Math.abs(win.theta(p[0],p[1],p[2],p[3]) - ref.theta(p[0],p[1],p[2],p[3])) > 1e-9) divT++;
});
amostras.forEach(function (a) {
  if (JSON.stringify(win.sievingCurveLayout(a, 900, 320)) !== JSON.stringify(ref.sievingCurveLayout(a, 900, 320))) divSv++;
  if (JSON.stringify(win.barreiraLayout(a, 300, 190))     !== JSON.stringify(ref.barreiraLayout(a, 300, 190)))     divBar++;
});
ok(divT   === 0, 'theta ≡ UI (' + divT + ' divergências)');
ok(divSv  === 0, 'sievingCurveLayout ≡ UI (' + divSv + ' divergências)');
ok(divBar === 0, 'barreiraLayout ≡ UI (' + divBar + ' divergências)');

// ─── o canvas DESENHOU a curva de sieving (motor manda no pixel) ──────────────
var canvasEl = doc.getElementById('sieving-canvas');
var rec = canvasEl.getContext('2d');
ok(rec && Array.isArray(rec.__paths), 'canvas: contexto exercido (gravador ativo)');

// estado inicial dos controles: cb=1, sb=1, probe=albumina (lab usa Lp=1,S=1,...)
var initState = { Lp: 1, S: 1, cb: 1, sb: 1, tubInjury: 0, P_alb: 40, GFR: 125, probe: 'albumina' };
var Lref = ref.sievingCurveLayout(initState, canvasEl.width, canvasEl.height);

// acha a subpath cuja primeira coordenada y bate com y_anion[0] (distingue ânion da neutra)
var curvePath = null;
(rec.__paths || []).forEach(function (p) {
  if (p.length === Lref.pts.length && p[0] && Math.abs(p[0].y - Lref.pts[0].y_anion) < 1e-4) {
    curvePath = p;
  }
});
ok(curvePath !== null, 'canvas: polilinha de sieving (ânion) pintada (' + Lref.pts.length + ' pontos)');

var pintaOk = true;
if (curvePath) {
  for (var i = 0; i < Lref.pts.length; i++) {
    var pp = curvePath[i];
    if (Math.abs(pp.x - Lref.pts[i].x) > 1e-6 || Math.abs(pp.y - Lref.pts[i].y_anion) > 1e-6) { pintaOk = false; break; }
  }
}
ok(pintaOk, 'canvas: cada ponto da curva de sieving pintado == sievingCurveLayout(engine)');

// marcadores (quadrados fill) das sondas
var fills = (rec.__rects || []).filter(function (q) { return q.op === 'fill'; });
ok(fills.length >= 3, 'canvas: marcadores das três sondas pintados');
ok((rec.__texts || []).join(' ').indexOf('θ') >= 0, 'canvas: rótulo θ presente');
ok((rec.__texts || []).join(' ').indexOf('raio') >= 0, 'canvas: rótulo raio presente');

// ─── aba Lab: saídas preenchidas no init ─────────────────────────────────────
ok(doc.getElementById('out-kf').textContent   !== '—', 'lab: out-kf preenchido no init');
ok(doc.getElementById('out-alb').textContent  !== '—', 'lab: out-alb preenchido no init');
ok(doc.getElementById('out-si').textContent   !== '—', 'lab: out-si preenchido no init');
ok(doc.getElementById('veredito').textContent.length > 1, 'lab: veredito computado (não vazio)');
ok(doc.getElementById('lab-pearl').textContent.length > 1, 'lab: pérola computada (não vazia)');
ok(doc.querySelector('#barreira-svg svg') !== null, 'instrumento: esquema de barras (SVG) presente');

// ─── tutor: DOIS blocos (ilustrado ≥10 + textual ≥10), bem-formados ──────────
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

// cada item ilustrado precisa de ilustração: SVG computado OU figura raster real
var semFig = 0, comImg = 0;
(TI || []).forEach(function (it) {
  if (typeof it.fig !== 'function') { semFig++; return; }
  var s = '';
  try { s = String(it.fig()); } catch (e) { s = ''; }
  var ehSvg = /<svg[\s>]/.test(s) && /<(rect|circle|line|path|text)/.test(s);
  var img = s.match(/<img[^>]+src=["']([^"']+)["']/i);
  var ehImg = false;
  if (img) {
    ehImg = !/^https?:/i.test(img[1]) && fs.existsSync(path.join(__dirname, '..', '..', img[1]));
  }
  if (!ehSvg && !ehImg) semFig++;
  if (ehImg) comImg++;
});
ok(semFig === 0, 'tutor ilustrado: toda questão traz ilustração (SVG ou raster real) (' + semFig + ' sem)');
ok(comImg >= 1, 'tutor ilustrado: usa figuras-raster nos exercícios (' + comImg + ')');

// ─── a aba Avaliação renderizou a ilustração no DOM ───────────────────────────
ok(doc.getElementById('tutor-fig') !== null && doc.querySelector('#tutor-fig svg') !== null,
  'Avaliação: ilustração renderizada no DOM (#tutor-fig svg)');
ok(doc.querySelectorAll('#banktabs button').length === 2, 'Avaliação: dois blocos (ilustrada/textual)');

// ─── cromo: kicker, hexápode, rodapé, backlink, disclaimer ───────────────────
var body = doc.body.textContent;
ok(/FILTRA/.test(doc.querySelector('.kicker') ? doc.querySelector('.kicker').textContent : ''), 'cromo: kicker FILTRA');
ok(doc.querySelector('nav.hex .ativo') !== null, 'cromo: hexápode com braço ativo');
ok(/CRM-SP 151\.318 · Dr\. Matheus M\. Coelho · Limeira/.test(body), 'cromo: rodapé de série');
ok(doc.querySelector('a[href="filtra.html"]') !== null, 'cromo: backlink relativo ao índice');
ok(/educacional/i.test(body) && doc.querySelector('.disc') !== null, 'disclaimer educacional presente');
ok(/honestidade do modelo/i.test(body) || /nota de honestidade/i.test(body), 'disclaimer: nota de honestidade do modelo presente');

// ─── conteúdo fisiológico: as sondas e os conceitos-chave ─────────────────────
ok(/inulina/.test(body) && /albumina/.test(body) && /IgG/.test(body), 'conteúdo: três sondas (inulina/albumina/IgG)');
ok(/seletiv/i.test(body), 'conteúdo: seletividade da proteinúria');
ok(/megalina|cubilina|reabsor/.test(body), 'conteúdo: reabsorção tubular (megalina/cubilina)');

// ─── guarda farmacológica INVERTIDA (§8): M3 cita fármaco como ALAVANCA, SEM dose solta ─────────
ok(/IECA|BRA|SGLT2/.test(body), 'farmacologia: fármaco como alavanca (IECA/BRA/SGLT2i) citado');
// dose = massa solta (ex.: "40 mg"); NÃO conta concentração (ex.: "1,8 g/dL") nem g/dia de proteinúria
ok(!/\b\d+\s?(mg|mcg|µg)\b(?!\/)/.test(body), 'M3 sem doses soltas em massa (a farmacologia dosada mora nos capstones)');

// ─── guarda OFFLINE: nenhum <img> remoto ──────────────────────────────────────
ok(imgGuard.remoteImgs(doc).length === 0, 'offline: nenhum <img> remoto (fotos só de assets/ local)');

// ─── figura viva: fotos/figuras open-source INLINE na batida de conceito ──────
var figs = Array.prototype.slice.call(doc.querySelectorAll('figure.fviva'));
ok(figs.length >= 8, 'figura viva: ≥8 figuras inline (tem ' + figs.length + ')');
ok(!doc.querySelector('.galeria'), 'figura viva: sem mural .galeria (figuras dispersas)');
var noConceito = doc.querySelectorAll('#tab-conceito figure.fviva').length;
ok(noConceito >= 8, 'figura viva: ≥8 figuras dentro da aba Conceito (tem ' + noConceito + ')');
var faltam = figs.filter(function (fg) { var im = fg.querySelector('img'); var s = im ? (im.getAttribute('src') || '') : ''; return !s || !fs.existsSync(path.join(__dirname, '..', '..', s)); });
ok(faltam.length === 0, 'figura viva: todos os arquivos existem em assets/ (' + faltam.length + ' faltando)');
var semAlt = figs.filter(function (fg) { var im = fg.querySelector('img'); return !im || !((im.getAttribute('alt') || '').trim()); });
ok(semAlt.length === 0, 'figura viva: todo <img> tem alt descritivo');
var semCap = figs.filter(function (fg) { var cap = fg.querySelector('figcaption'); return !cap || (cap.textContent || '').trim().length < 30; });
ok(semCap.length === 0, 'figura viva: toda figura tem legenda que ensina (≥30 chars)');
ok(/Fig\.\s*\d/.test(html), 'figura viva: figuras referenciadas no texto ("Fig. N")');

console.log(oks + ' OK · ' + fail + ' falhas');
process.exit(fail > 0 ? 1 : 0);
