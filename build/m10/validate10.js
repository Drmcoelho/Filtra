'use strict';
/*
 * FILTRA · M10 — validador jsdom (portão do §6)
 * Confere: estrutura (IDs/abas) · engine ≡ UI (disnatremia, naEdelman, correcaoLayout,
 * aguaLivreLayout) · a trajetória pintada no canvas ≡ correcaoLayout() ponto-a-ponto ·
 * camada interativa · os dois bancos do tutor (ilustrado c/ SVG + textual) · cromo ·
 * disclaimer.
 *
 * Guarda farmacológica INVERTIDA (§8): M10 é um módulo de MECANISMO (água livre,
 * ADH, clearance, velocidade de correção). Usa mEq/L, mL/h, mOsm/kg, L — NÃO há dose
 * em massa solta (mg/mcg/µg). Logo: exige disclaimer e proíbe dose solta em massa;
 * valores de laboratório/taxas são permitidos.
 */

var fs   = require('fs');
var path = require('path');
var jsdom = require('jsdom');
var JSDOM = jsdom.JSDOM;

var ref      = require('./model10.js');          // engine canônico (Node)
var imgGuard = require('../lib/img-guard.js');    // guarda offline compartilhada

var oks = 0, fail = 0;
function ok(c, m) { if (c) { oks++; } else { fail++; console.error('FALHA: ' + m); } }

var htmlPath = path.join(__dirname, '..', '..', 'filtra10.html');
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
  'correcao-canvas','agualivre-svg',
  'in-na','in-cron','in-adh','in-uosm','in-peso','in-sex','in-infusato','in-taxa',
  'out-na','out-agt','out-uosm','out-ch2o','out-concentra','out-dnapl','out-dna24','out-corr24',
  'out-mielino','out-edema','out-corredor','out-regime',
  'veredito','instr-pearl','lab-pearl','fig-caso',
  'tutor-q','tutor-opts','tutor-fb','tutor-score','tutor-total','tutor-fig',
  'draw-edelman','draw-adh','draw-siadh','draw-corredor','draw-lesoes'
];
ids.forEach(function (id) { ok(doc.getElementById(id) !== null, 'estrutura: #' + id + ' presente'); });

ok(doc.querySelectorAll('#tabs button').length === 6, 'estrutura: 6 abas');
ok(doc.getElementById('correcao-canvas').tagName.toLowerCase() === 'canvas', 'instrumento: canvas correcao-canvas');

// ─── aba CONCEITO: ≥5 SVGs + Edelman + clearance de água livre ───────────────
ok(doc.querySelectorAll('#tab-conceito svg').length >= 5,
  'Conceito: ≥5 desenhos esquemáticos (Edelman, ADH, SIADH/DI, corredor, lesões)');

var conc = doc.getElementById('tab-conceito').textContent;
ok(/Na\s*≈\s*\(Na\+K\s*trocáveis\)\s*\/\s*ÁGT/.test(conc) || /Edelman/i.test(conc),
  'Conceito: equação de Edelman Na ≈ (Na+K trocáveis)/ÁGT exposta');
ok(/C_H2O\s*=\s*V̇\s*−\s*C_osm/.test(conc) || /clearance de água livre/i.test(conc),
  'Conceito: fórmula do clearance de água livre C_H2O = V̇ − C_osm');
ok(/ADH|vasopressina/i.test(conc) && /aquaporina/i.test(conc), 'Conceito: ADH/vasopressina e aquaporina-2');
ok(/SIADH/i.test(conc) && /diabetes insípido/i.test(conc), 'Conceito: SIADH × diabetes insípido');
ok(/mielinólise/i.test(conc) && /edema/i.test(conc), 'Conceito: mielinólise × edema (as duas lesões)');
ok(/velocidade/i.test(conc) && /(6.?8|crônica)/i.test(conc), 'Conceito: a velocidade da correção / corredor seguro');
ok(/Adrogué.?Madias/i.test(conc), 'Conceito: a fórmula de Adrogué–Madias');

// ─── caso (5 atos, prever-depois-revelar) ────────────────────────────────────
ok(doc.querySelectorAll('button.act[data-rev]').length >= 5, 'caso: ≥5 atos com revelar');
ok(doc.querySelectorAll('#caso .reveal').length >= 5,        'caso: ≥5 blocos reveláveis');
ok(doc.querySelector('#fig-caso svg') !== null,              'Caso: ilustração SVG presente (#fig-caso)');

// ─── trilha socrática (≥9 passos) ────────────────────────────────────────────
ok(doc.querySelectorAll('#trilha details').length >= 9, 'trilha: ≥9 passos socráticos');

// ─── engine ≡ UI: disnatremia inline ≡ model10.js ────────────────────────────
ok(typeof win.disnatremia === 'function', 'UI expõe disnatremia()');
var amostras = [
  { },
  { na: 124, adh: 0.9 },
  { na: 152, adh: 0.05 },
  { na: 116, cronico: 1, infusato: 'nacl3', taxa: 90 },
  { na: 165, cronico: 1, infusato: 'sg5', taxa: 120 },
  { na: 120, cronico: 0, infusato: 'nacl3', taxa: 60 },
  { na: null, adh: NaN, uOsm: 'x', peso: undefined, sexF: 'lixo', taxa: 'y', infusato: 'lixo' } // sujeira → clamps
];
var divD = 0;
amostras.forEach(function (a) {
  if (JSON.stringify(win.disnatremia(a)) !== JSON.stringify(ref.disnatremia(a))) divD++;
});
ok(divD === 0, 'engine ≡ UI: disnatremia inline idêntica ao model10.js (' + divD + ' divergências)');

// ─── engine ≡ UI: naEdelman, correcaoLayout, aguaLivreLayout ─────────────────
ok(typeof win.naEdelman        === 'function', 'UI expõe naEdelman()');
ok(typeof win.correcaoLayout   === 'function', 'UI expõe correcaoLayout()');
ok(typeof win.aguaLivreLayout  === 'function', 'UI expõe aguaLivreLayout()');
ok(typeof win.classNa          === 'function', 'UI expõe classNa()');

var divE = 0, divCor = 0, divAgua = 0;
[[5600,40],[5600,47],[4900,35],[5040,42],[6000,50]].forEach(function (p) {
  if (Math.abs(win.naEdelman(p[0],p[1]) - ref.naEdelman(p[0],p[1])) > 1e-9) divE++;
});
amostras.forEach(function (a) {
  if (JSON.stringify(win.correcaoLayout(a, 900, 320)) !== JSON.stringify(ref.correcaoLayout(a, 900, 320))) divCor++;
  if (JSON.stringify(win.aguaLivreLayout(a, 300, 180))  !== JSON.stringify(ref.aguaLivreLayout(a, 300, 180)))  divAgua++;
});
ok(divE    === 0, 'naEdelman ≡ UI (' + divE + ' divergências)');
ok(divCor  === 0, 'correcaoLayout ≡ UI (' + divCor + ' divergências)');
ok(divAgua === 0, 'aguaLivreLayout ≡ UI (' + divAgua + ' divergências)');

// ─── o canvas DESENHOU a trajetória (motor manda no pixel) ───────────────────
var canvasEl = doc.getElementById('correcao-canvas');
var rec = canvasEl.getContext('2d');
ok(rec && Array.isArray(rec.__paths), 'canvas: contexto exercido (gravador ativo)');

// estado inicial dos controles do lab: Na=120, cronico=1, infusato=nacl3, taxa=40
var initState = { na: 120, cronico: 1, adh: 0.5, uOsm: 600, peso: 70, sexF: false, infusato: 'nacl3', taxa: 40 };
var Lref = ref.correcaoLayout(initState, canvasEl.width, canvasEl.height);

// acha a subpath cujo primeiro ponto bate com pts[0] (a polilinha da trajetória)
var curvePath = null;
(rec.__paths || []).forEach(function (p) {
  if (p.length === Lref.pts.length && p[0]
      && Math.abs(p[0].x - Lref.pts[0].x) < 1e-4 && Math.abs(p[0].y - Lref.pts[0].y) < 1e-4) {
    curvePath = p;
  }
});
ok(curvePath !== null, 'canvas: polilinha da trajetória pintada (' + Lref.pts.length + ' pontos)');

var pintaOk = true;
if (curvePath) {
  for (var i = 0; i < Lref.pts.length; i++) {
    var pp = curvePath[i];
    if (Math.abs(pp.x - Lref.pts[i].x) > 1e-6 || Math.abs(pp.y - Lref.pts[i].y) > 1e-6) { pintaOk = false; break; }
  }
}
ok(pintaOk, 'canvas: cada ponto da trajetória pintado == correcaoLayout(engine)');

// marcadores (quadrados fill) + corredor seguro sombreado (fillRect)
var fills = (rec.__rects || []).filter(function (q) { return q.op === 'fill'; });
ok(fills.length >= 2, 'canvas: marcadores/faixas pintados (fillRect)');
ok((rec.__texts || []).join(' ').indexOf('Na') >= 0, 'canvas: rótulo Na presente');
ok((rec.__texts || []).join(' ').indexOf('corredor seguro') >= 0, 'canvas: rótulo corredor seguro presente');
ok((rec.__texts || []).join(' ').indexOf('horas') >= 0, 'canvas: rótulo horas presente');

// ─── aba Lab: saídas preenchidas no init ─────────────────────────────────────
ok(doc.getElementById('out-na').textContent     !== '—', 'lab: out-na preenchido no init');
ok(doc.getElementById('out-ch2o').textContent   !== '—', 'lab: out-ch2o preenchido no init');
ok(doc.getElementById('out-dna24').textContent  !== '—', 'lab: out-dna24 preenchido no init');
ok(doc.getElementById('out-mielino').textContent!== '—', 'lab: out-mielino preenchido no init');
ok(doc.getElementById('veredito').textContent.length > 1, 'lab: veredito computado (não vazio)');
ok(doc.getElementById('lab-pearl').textContent.length > 1, 'lab: pérola computada (não vazia)');
ok(doc.querySelector('#agualivre-svg svg') !== null, 'instrumento: figura do clearance de água livre (SVG) presente');

// ─── lab: presets de cenário (botões) ────────────────────────────────────────
ok(doc.querySelectorAll('button.preset').length >= 4, 'lab: botões de preset de cenário presentes');

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
ok(/Edelman/i.test(body) && /ÁGT|água corporal total/i.test(body), 'conteúdo: Edelman e ÁGT');
ok(/proxy da água|proxy da ÁGUA/i.test(body), 'conteúdo: o Na como proxy da água');
ok(/ADH|vasopressina/i.test(body) && /aquaporina/i.test(body), 'conteúdo: ADH e aquaporina-2');
ok(/clearance de água livre/i.test(body), 'conteúdo: clearance de água livre');
ok(/SIADH/i.test(body) && /diabetes insípido/i.test(body), 'conteúdo: SIADH e diabetes insípido');
ok(/mielinólise/i.test(body), 'conteúdo: mielinólise pontina');
ok(/edema cerebral/i.test(body), 'conteúdo: edema cerebral');
ok(/velocidade/i.test(body) && /corredor/i.test(body), 'conteúdo: a velocidade e o corredor seguro');
ok(/Adrogué.?Madias/i.test(body), 'conteúdo: fórmula de Adrogué–Madias');

// ─── guarda farmacológica INVERTIDA (§8): mecanismo, SEM dose solta em massa ─────────
// dose = massa solta (ex.: "40 mg"); NÃO conta lab/taxas (mEq/L, mL/h, mOsm/kg, L)
ok(!/\b\d+\s?(mg|mcg|µg)\b(?!\/)/.test(body), 'M10 sem doses soltas em massa (módulo de mecanismo)');

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
