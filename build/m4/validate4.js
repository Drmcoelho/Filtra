'use strict';
/*
 * FILTRA · M4 — validador jsdom (portão do §6)
 * Confere: estrutura (IDs/abas) · engine ≡ UI (creatinina, egfrFromCr, hiperboleLayout,
 * atrasoLayout) · a hipérbole pintada no canvas ≡ hiperboleLayout() ponto-a-ponto ·
 * camada interativa · os dois bancos do tutor (ilustrado c/ SVG + textual) · cromo ·
 * disclaimer.
 *
 * Guarda farmacológica INVERTIDA (§8): M4 cita fármacos como MECANISMO que distorce a
 * medida (cimetidina/trimetoprima bloqueiam a secreção tubular), SEM dose em massa solta
 * (M4 não tem prescrição dosada). Logo: exige disclaimer e proíbe dose solta (mg/mcg/µg);
 * valores de laboratório como "mg/dL", "mL/min" são permitidos.
 */

var fs   = require('fs');
var path = require('path');
var jsdom = require('jsdom');
var JSDOM = jsdom.JSDOM;

var ref      = require('./model4.js');           // engine canônico (Node)
var imgGuard = require('../lib/img-guard.js');   // guarda offline compartilhada

var oks = 0, fail = 0;
function ok(c, m) { if (c) { oks++; } else { fail++; console.error('FALHA: ' + m); } }

var htmlPath = path.join(__dirname, '..', '..', 'filtra4.html');
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
  'hiperbole-canvas','atraso-svg',
  'in-gfr','in-gfr0','in-day','in-musc','in-drug','in-age','in-sex','in-marker',
  'out-pcr','out-pcrss','out-lag','out-clcr','out-over','out-cys','out-egfrcr','out-egfrcys',
  'out-estagio','out-estest','out-cega','out-regime',
  'veredito','instr-pearl','lab-pearl','fig-caso',
  'tutor-q','tutor-opts','tutor-fb','tutor-score','tutor-total','tutor-fig',
  'draw-clearance','draw-hiperbole','draw-secrecao','draw-massa','draw-atraso'
];
ids.forEach(function (id) { ok(doc.getElementById(id) !== null, 'estrutura: #' + id + ' presente'); });

ok(doc.querySelectorAll('#tabs button').length === 6, 'estrutura: 6 abas');
ok(doc.getElementById('hiperbole-canvas').tagName.toLowerCase() === 'canvas', 'instrumento: canvas hiperbole-canvas');

// ─── aba CONCEITO: ≥5 SVGs + fórmula C=U·V/P + hipérbole/faixa cega ───────────
ok(doc.querySelectorAll('#tab-conceito svg').length >= 5,
  'Conceito: ≥5 desenhos esquemáticos (clearance, hipérbole, secreção, massa, atraso)');

var conc = doc.getElementById('tab-conceito').textContent;
ok(/C_x\s*=\s*\(U_x\s*·\s*V̇\)\s*\/\s*P_x/.test(conc) || /C\s*=\s*\(U\s*·\s*V̇\)\s*\/\s*P/.test(conc),
  'Conceito: fórmula do clearance C = (U·V̇)/P exposta');
ok(/hipérbole/i.test(conc), 'Conceito: a hipérbole P_Cr × TFG mencionada');
ok(/faixa cega/i.test(conc), 'Conceito: a "faixa cega" explicada');
ok(/secreção/i.test(conc) && /superestima/i.test(conc), 'Conceito: secreção tubular superestima a TFG');
ok(/massa muscular/i.test(conc) && /cistatina/i.test(conc), 'Conceito: massa muscular e cistatina C');
ok(/não-equilíbrio|atrasa|atraso/i.test(conc), 'Conceito: não-equilíbrio / a Cr atrasa (LRA)');
ok(/inulina/i.test(conc) && /padrão-ouro/i.test(conc), 'Conceito: inulina como padrão-ouro');

// ─── caso (5 atos, prever-depois-revelar) ────────────────────────────────────
ok(doc.querySelectorAll('button.act[data-rev]').length >= 5, 'caso: ≥5 atos com revelar');
ok(doc.querySelectorAll('#caso .reveal').length >= 5,        'caso: ≥5 blocos reveláveis');
ok(doc.querySelector('#fig-caso svg') !== null,              'Caso: ilustração SVG presente (#fig-caso)');

// ─── trilha socrática (≥9 passos) ────────────────────────────────────────────
ok(doc.querySelectorAll('#trilha details').length >= 9, 'trilha: ≥9 passos socráticos');

// ─── engine ≡ UI: creatinina inline ≡ model4.js ──────────────────────────────
ok(typeof win.creatinina === 'function', 'UI expõe creatinina()');
var amostras = [
  { },
  { GFR: 60 },
  { GFR: 30 },
  { GFR: 35, muscle: 0.4, sexF: true, age: 80 },
  { GFR: 120, drug: 1 },
  { GFR0: 120, GFR: 20, day: 1 },
  { GFR: null, muscle: NaN, drug: 'x', age: undefined, sexF: 'lixo', day: 'y' } // sujeira → clamps
];
var divC = 0;
amostras.forEach(function (a) {
  if (JSON.stringify(win.creatinina(a)) !== JSON.stringify(ref.creatinina(a))) divC++;
});
ok(divC === 0, 'engine ≡ UI: creatinina inline idêntica ao model4.js (' + divC + ' divergências)');

// ─── engine ≡ UI: egfrFromCr, hiperboleLayout, atrasoLayout ──────────────────
ok(typeof win.egfrFromCr      === 'function', 'UI expõe egfrFromCr()');
ok(typeof win.hiperboleLayout === 'function', 'UI expõe hiperboleLayout()');
ok(typeof win.atrasoLayout    === 'function', 'UI expõe atrasoLayout()');
ok(typeof win.ckdStage        === 'function', 'UI expõe ckdStage()');

var divE = 0, divHip = 0, divAtr = 0;
[[0.8,50,false],[1.5,70,true],[3.6,40,false],[1.0,80,true],[0.5,25,false]].forEach(function (p) {
  if (Math.abs(win.egfrFromCr(p[0],p[1],p[2]) - ref.egfrFromCr(p[0],p[1],p[2])) > 1e-9) divE++;
});
amostras.forEach(function (a) {
  if (JSON.stringify(win.hiperboleLayout(a, 900, 320)) !== JSON.stringify(ref.hiperboleLayout(a, 900, 320))) divHip++;
  if (JSON.stringify(win.atrasoLayout(a, 300, 180))     !== JSON.stringify(ref.atrasoLayout(a, 300, 180)))     divAtr++;
});
ok(divE   === 0, 'egfrFromCr ≡ UI (' + divE + ' divergências)');
ok(divHip === 0, 'hiperboleLayout ≡ UI (' + divHip + ' divergências)');
ok(divAtr === 0, 'atrasoLayout ≡ UI (' + divAtr + ' divergências)');

// ─── o canvas DESENHOU a hipérbole (motor manda no pixel) ─────────────────────
var canvasEl = doc.getElementById('hiperbole-canvas');
var rec = canvasEl.getContext('2d');
ok(rec && Array.isArray(rec.__paths), 'canvas: contexto exercido (gravador ativo)');

// estado inicial dos controles do lab: TFG=120, músculo=1, drug=0, sexo=M
var initState = { GFR: 120, GFR0: 120, day: 14, muscle: 1, drug: 0, age: 50, sexF: false };
var Lref = ref.hiperboleLayout(initState, canvasEl.width, canvasEl.height);

// acha a subpath cujo primeiro ponto bate com pts[0] (a polilinha da hipérbole)
var curvePath = null;
(rec.__paths || []).forEach(function (p) {
  if (p.length === Lref.pts.length && p[0]
      && Math.abs(p[0].x - Lref.pts[0].x) < 1e-4 && Math.abs(p[0].y - Lref.pts[0].y) < 1e-4) {
    curvePath = p;
  }
});
ok(curvePath !== null, 'canvas: polilinha da hipérbole pintada (' + Lref.pts.length + ' pontos)');

var pintaOk = true;
if (curvePath) {
  for (var i = 0; i < Lref.pts.length; i++) {
    var pp = curvePath[i];
    if (Math.abs(pp.x - Lref.pts[i].x) > 1e-6 || Math.abs(pp.y - Lref.pts[i].y) > 1e-6) { pintaOk = false; break; }
  }
}
ok(pintaOk, 'canvas: cada ponto da hipérbole pintado == hiperboleLayout(engine)');

// marcadores (quadrados fill) das TFGs didáticas + faixa cega sombreada (fillRect)
var fills = (rec.__rects || []).filter(function (q) { return q.op === 'fill'; });
ok(fills.length >= 4, 'canvas: marcadores das TFGs (120/60/30/15) pintados');
ok((rec.__texts || []).join(' ').indexOf('TFG') >= 0, 'canvas: rótulo TFG presente');
ok((rec.__texts || []).join(' ').indexOf('Cr') >= 0, 'canvas: rótulo Cr presente');
ok((rec.__texts || []).join(' ').indexOf('faixa cega') >= 0, 'canvas: rótulo faixa cega presente');

// ─── aba Lab: saídas preenchidas no init ─────────────────────────────────────
ok(doc.getElementById('out-pcr').textContent    !== '—', 'lab: out-pcr preenchido no init');
ok(doc.getElementById('out-clcr').textContent   !== '—', 'lab: out-clcr preenchido no init');
ok(doc.getElementById('out-egfrcr').textContent !== '—', 'lab: out-egfrcr preenchido no init');
ok(doc.getElementById('out-cys').textContent    !== '—', 'lab: out-cys preenchido no init');
ok(doc.getElementById('veredito').textContent.length > 1, 'lab: veredito computado (não vazio)');
ok(doc.getElementById('lab-pearl').textContent.length > 1, 'lab: pérola computada (não vazia)');
ok(doc.querySelector('#atraso-svg svg') !== null, 'instrumento: figura do atraso (SVG) presente');

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

// ─── conteúdo fisiológico: os mecanismos-chave ────────────────────────────────
ok(/clearance/i.test(body) && /inulina/i.test(body), 'conteúdo: clearance e inulina (padrão-ouro)');
ok(/hipérbole/i.test(body) && /faixa cega/i.test(body), 'conteúdo: hipérbole e faixa cega');
ok(/secreção/i.test(body) && /superestima/i.test(body), 'conteúdo: secreção tubular superestima a TFG');
ok(/massa muscular/i.test(body), 'conteúdo: massa muscular gera a creatinina');
ok(/cistatina/i.test(body), 'conteúdo: cistatina C (marcador alternativo)');
ok(/não-equilíbrio|atrasa|atraso/i.test(body), 'conteúdo: não-equilíbrio / a Cr atrasa');
ok(/eGFR|CKD-EPI/i.test(body), 'conteúdo: eGFR estimado');
ok(/G1|G3|G4|G5|estágio|estagio/i.test(body), 'conteúdo: estadiamento DRC (KDIGO)');

// ─── guarda farmacológica INVERTIDA (§8): fármaco como MECANISMO, SEM dose solta ─────────
ok(/cimetidina|trimetoprima/i.test(body), 'farmacologia: fármaco como mecanismo (cimetidina/trimetoprima) citado');
// dose = massa solta (ex.: "40 mg"); NÃO conta lab (ex.: "1,2 mg/dL") nem mL/min
ok(!/\b\d+\s?(mg|mcg|µg)\b(?!\/)/.test(body), 'M4 sem doses soltas em massa (M4 não tem prescrição dosada)');

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
