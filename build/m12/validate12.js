'use strict';
/*
 * FILTRA · M12 — validador jsdom (portão do §6)
 * Confere: estrutura (IDs/abas) · engine ≡ UI (mineral, caCorrigido, caIonLayout,
 * drcLayout) · a curva do Ca ionizado pintada no canvas ≡ caIonLayout() ponto-a-ponto ·
 * camada interativa · os dois bancos do tutor (ilustrado c/ SVG + textual) · cromo ·
 * disclaimer.
 *
 * Guarda farmacológica INVERTIDA (§8): M12 é módulo de MECANISMO (cálcio/fósforo/
 * magnésio, PTH/vit D/FGF23). As condutas entram como mecanismo (corrigir por
 * albumina, repor Mg, quelar PO₄) SEM dose em massa solta (mg/mcg/µg). Logo: exige
 * disclaimer e proíbe dose solta; valores de laboratório (mg/dL, pg/mL) são permitidos.
 */

var fs   = require('fs');
var path = require('path');
var jsdom = require('jsdom');
var JSDOM = jsdom.JSDOM;

var ref      = require('./model12.js');          // engine canônico (Node)
var imgGuard = require('../lib/img-guard.js');   // guarda offline compartilhada

var oks = 0, fail = 0;
function ok(c, m) { if (c) { oks++; } else { fail++; console.error('FALHA: ' + m); } }

var htmlPath = path.join(__dirname, '..', '..', 'filtra12.html');
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
  'caion-canvas','drc-svg',
  'in-ca','in-alb','in-ph','in-po4','in-mg','in-gfr','in-pthx','in-marker',
  'out-cacorr','out-caion','out-pth','out-calc','out-fgf23','out-po4','out-fosf',
  'out-caxpo4','out-mggate','out-estado','out-regime',
  'veredito','instr-pearl','lab-pearl','fig-caso','presets',
  'tutor-q','tutor-opts','tutor-fb','tutor-score','tutor-total','tutor-fig',
  'draw-albumina','draw-ph','draw-pth','draw-fgf23','draw-triangulo'
];
ids.forEach(function (id) { ok(doc.getElementById(id) !== null, 'estrutura: #' + id + ' presente'); });

ok(doc.querySelectorAll('#tabs button').length === 6, 'estrutura: 6 abas');
ok(doc.getElementById('caion-canvas').tagName.toLowerCase() === 'canvas', 'instrumento: canvas caion-canvas');

// ─── aba CONCEITO: ≥5 SVGs + fórmula Ca corrigido + mecanismos ───────────────
ok(doc.querySelectorAll('#tab-conceito svg').length >= 5,
  'Conceito: ≥5 desenhos esquemáticos (albumina, pH, PTH, FGF23/DRC, triângulo)');

var conc = doc.getElementById('tab-conceito').textContent;
ok(/Ca_corr\s*=\s*Ca_total\s*\+\s*0,8\s*·\s*\(4\s*−\s*albumina\)/.test(conc) || /Ca\s*\+\s*0,8\s*·\s*\(4\s*−\s*alb/.test(conc),
  'Conceito: fórmula do Ca corrigido Ca + 0,8·(4 − alb) exposta');
ok(/ionizado/i.test(conc), 'Conceito: o Ca ionizado (ativo) explicado');
ok(/albumina/i.test(conc) && /pseudo-hipocalcemia|pseudo/i.test(conc), 'Conceito: pseudo-hipocalcemia da hipoalbuminemia');
ok(/alcalose/i.test(conc) && /tetania/i.test(conc), 'Conceito: alcalose → ionizado↓ → tetania');
ok(/PTH/.test(conc) && /calcitriol/i.test(conc) && /FGF23/.test(conc), 'Conceito: PTH, calcitriol e FGF23');
ok(/triângulo/i.test(conc) && /hiperparatireoidismo|hiperPTH/i.test(conc), 'Conceito: triângulo e hiperPTH 2º da DRC');
ok(/magnésio/i.test(conc) && /cofator/i.test(conc), 'Conceito: o magnésio como cofator do PTH');

// ─── caso (5 atos, prever-depois-revelar) ────────────────────────────────────
ok(doc.querySelectorAll('button.act[data-rev]').length >= 5, 'caso: ≥5 atos com revelar');
ok(doc.querySelectorAll('#caso .reveal').length >= 5,        'caso: ≥5 blocos reveláveis');
ok(doc.querySelector('#fig-caso svg') !== null,              'Caso: ilustração SVG presente (#fig-caso)');

// ─── trilha socrática (≥9 passos) ────────────────────────────────────────────
ok(doc.querySelectorAll('#trilha details').length >= 9, 'trilha: ≥9 passos socráticos');

// ─── engine ≡ UI: mineral inline ≡ model12.js ────────────────────────────────
ok(typeof win.mineral === 'function', 'UI expõe mineral()');
var amostras = [
  { },
  { caTotal: 7.4, alb: 2.0 },
  { caTotal: 9.4, pH: 7.62 },
  { gfr: 12, po4: 6.8, caTotal: 8.2 },
  { caTotal: 13, pthExtra: 1.6 },
  { caTotal: 7.4, mg: 0.8 },
  { caTotal: null, alb: NaN, pH: 'x', po4: undefined, mg: 'lixo', gfr: 'y' } // sujeira → clamps
];
var divC = 0;
amostras.forEach(function (a) {
  if (JSON.stringify(win.mineral(a)) !== JSON.stringify(ref.mineral(a))) divC++;
});
ok(divC === 0, 'engine ≡ UI: mineral inline idêntica ao model12.js (' + divC + ' divergências)');

// ─── engine ≡ UI: caCorrigido, caIonizado, caIonLayout, drcLayout ────────────
ok(typeof win.caCorrigido === 'function', 'UI expõe caCorrigido()');
ok(typeof win.caIonizado  === 'function', 'UI expõe caIonizado()');
ok(typeof win.caIonLayout === 'function', 'UI expõe caIonLayout()');
ok(typeof win.drcLayout   === 'function', 'UI expõe drcLayout()');
ok(typeof win.mgGate      === 'function', 'UI expõe mgGate()');

var divCC = 0, divCI = 0, divLay = 0, divDrc = 0;
[[9.4,4.0],[7.4,2.0],[10,5],[8,3]].forEach(function (p) {
  if (Math.abs(win.caCorrigido(p[0],p[1]) - ref.caCorrigido(p[0],p[1])) > 1e-9) divCC++;
});
[[9.4,7.40],[9.4,7.55],[8,7.30],[12,7.62]].forEach(function (p) {
  if (Math.abs(win.caIonizado(p[0],p[1]) - ref.caIonizado(p[0],p[1])) > 1e-9) divCI++;
});
amostras.forEach(function (a) {
  if (JSON.stringify(win.caIonLayout(a, 900, 320)) !== JSON.stringify(ref.caIonLayout(a, 900, 320))) divLay++;
  if (JSON.stringify(win.drcLayout(a, 300, 180))    !== JSON.stringify(ref.drcLayout(a, 300, 180)))    divDrc++;
});
ok(divCC  === 0, 'caCorrigido ≡ UI (' + divCC + ' divergências)');
ok(divCI  === 0, 'caIonizado ≡ UI (' + divCI + ' divergências)');
ok(divLay === 0, 'caIonLayout ≡ UI (' + divLay + ' divergências)');
ok(divDrc === 0, 'drcLayout ≡ UI (' + divDrc + ' divergências)');

// ─── o canvas DESENHOU a curva do Ca ionizado (motor manda no pixel) ──────────
var canvasEl = doc.getElementById('caion-canvas');
var rec = canvasEl.getContext('2d');
ok(rec && Array.isArray(rec.__paths), 'canvas: contexto exercido (gravador ativo)');

// estado inicial dos controles do lab: Ca 9.4, alb 4.0, pH 7.40, gfr 120
var initState = { caTotal: 9.4, alb: 4.0, pH: 7.40, po4: 3.5, mg: 2.0, gfr: 120, pthExtra: 1.0 };
var Lref = ref.caIonLayout(initState, canvasEl.width, canvasEl.height);

// acha a subpath cujo primeiro ponto bate com ptsN[0] (a polilinha pH normal)
var curvePath = null;
(rec.__paths || []).forEach(function (p) {
  if (p.length === Lref.ptsN.length && p[0]
      && Math.abs(p[0].x - Lref.ptsN[0].x) < 1e-4 && Math.abs(p[0].y - Lref.ptsN[0].y) < 1e-4) {
    curvePath = p;
  }
});
ok(curvePath !== null, 'canvas: polilinha do Ca ionizado pintada (' + Lref.ptsN.length + ' pontos)');

var pintaOk = true;
if (curvePath) {
  for (var i = 0; i < Lref.ptsN.length; i++) {
    var pp = curvePath[i];
    if (Math.abs(pp.x - Lref.ptsN[i].x) > 1e-6 || Math.abs(pp.y - Lref.ptsN[i].y) > 1e-6) { pintaOk = false; break; }
  }
}
ok(pintaOk, 'canvas: cada ponto do Ca ionizado pintado == caIonLayout(engine)');

// marcadores (quadrados fill) das albuminas didáticas + zona de hipocalcemia (fillRect)
var fills = (rec.__rects || []).filter(function (q) { return q.op === 'fill'; });
ok(fills.length >= 2, 'canvas: marcadores das albuminas (4,0/2,0) pintados');
ok((rec.__texts || []).join(' ').indexOf('Ca ion') >= 0, 'canvas: rótulo Ca ion presente');
ok((rec.__texts || []).join(' ').indexOf('albumina') >= 0, 'canvas: rótulo albumina presente');
ok((rec.__texts || []).join(' ').indexOf('tetania') >= 0, 'canvas: rótulo limiar de tetania presente');

// ─── aba Lab: saídas preenchidas no init ─────────────────────────────────────
ok(doc.getElementById('out-cacorr').textContent !== '—', 'lab: out-cacorr preenchido no init');
ok(doc.getElementById('out-caion').textContent  !== '—', 'lab: out-caion preenchido no init');
ok(doc.getElementById('out-pth').textContent    !== '—', 'lab: out-pth preenchido no init');
ok(doc.getElementById('out-calc').textContent   !== '—', 'lab: out-calc preenchido no init');
ok(doc.getElementById('veredito').textContent.length > 1, 'lab: veredito computado (não vazio)');
ok(doc.getElementById('lab-pearl').textContent.length > 1, 'lab: pérola computada (não vazia)');
ok(doc.querySelector('#drc-svg svg') !== null, 'instrumento: figura da progressão DRC (SVG) presente');
ok(doc.querySelectorAll('#presets button').length >= 5, 'lab: presets de cenário (≥5)');

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
ok(/ionizado/i.test(body) && /albumina/i.test(body), 'conteúdo: Ca ionizado e correção pela albumina');
ok(/alcalose/i.test(body) && /tetania/i.test(body), 'conteúdo: alcalose → ionizado↓ → tetania');
ok(/PTH/.test(body) && /fosfatúria|fosfatúrico/i.test(body), 'conteúdo: PTH e a fosfatúria');
ok(/calcitriol/i.test(body) && /1α-hidroxilase|hidroxilase/i.test(body), 'conteúdo: calcitriol e a 1α-hidroxilase');
ok(/FGF23/.test(body), 'conteúdo: FGF23 (fosfatúrico do osso)');
ok(/triângulo/i.test(body) && /Ca/.test(body) && /PO₄/.test(body), 'conteúdo: o triângulo Ca–PO₄–PTH');
ok(/hiperparatireoidismo|hiperPTH/i.test(body) && /DRC/i.test(body), 'conteúdo: hiperPTH secundário da DRC');
ok(/magnésio/i.test(body) && /(refratária|paralisa|cofator)/i.test(body), 'conteúdo: Mg perpetua a hipocalcemia');

// ─── guarda farmacológica INVERTIDA (§8): conduta como MECANISMO, SEM dose solta ─────
ok(/corrig/i.test(body) && /albumina/i.test(body), 'conduta: corrigir o cálcio pela albumina (mecanismo)');
// dose = massa solta (ex.: "40 mg"); NÃO conta lab (ex.: "9,4 mg/dL") nem pg/mL
ok(!/\b\d+\s?(mg|mcg|µg)\b(?!\/)/.test(body), 'M12 sem doses soltas em massa (módulo de mecanismo)');

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
