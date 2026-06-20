'use strict';
/*
 * FILTRA · M14 — validador jsdom (portão do §6)
 * Confere: estrutura (IDs/abas) · engine ≡ UI (eixo, baro, cascataLayout,
 * respostaLayout) · a cascata pintada no canvas ≡ cascataLayout() ponto-a-ponto ·
 * camada interativa · os dois bancos do tutor (ilustrado c/ SVG + textual) · cromo ·
 * disclaimer.
 *
 * Guarda farmacológica INVERTIDA (§8): M14 é a FISIOLOGIA do eixo endócrino — os
 * fármacos do RAAS (IECA/BRA, antagonistas da aldo, vaptanos) são o capstone M18,
 * NÃO aqui. Logo: exige disclaimer e PROÍBE dose em massa solta (mg/mcg/µg);
 * valores de laboratório (mEq/L, mmHg, mOsm/kg, mL/min) são permitidos.
 */

var fs   = require('fs');
var path = require('path');
var jsdom = require('jsdom');
var JSDOM = jsdom.JSDOM;

var ref      = require('./model14.js');          // engine canônico (Node)
var imgGuard = require('../lib/img-guard.js');   // guarda offline compartilhada

var oks = 0, fail = 0;
function ok(c, m) { if (c) { oks++; } else { fail++; console.error('FALHA: ' + m); } }

var htmlPath = path.join(__dirname, '..', '..', 'filtra14.html');
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
  'cascata-canvas','resposta-svg',
  'in-press','in-vol','in-na','in-symp','in-aldoauto','in-k','in-ton','in-adhdrive','in-o2','in-gfr',
  'out-renina','out-angii','out-aldo','out-arr','out-adh','out-adhvol','out-epo','out-calc','out-regime',
  'veredito','instr-pearl','lab-pearl','fig-caso',
  'tutor-q','tutor-opts','tutor-fb','tutor-score','tutor-total','tutor-fig',
  'draw-jga','draw-cascata','draw-angeff','draw-adh','draw-epo'
];
ids.forEach(function (id) { ok(doc.getElementById(id) !== null, 'estrutura: #' + id + ' presente'); });

ok(doc.querySelectorAll('#tabs button').length === 6, 'estrutura: 6 abas');
ok(doc.getElementById('cascata-canvas').tagName.toLowerCase() === 'canvas', 'instrumento: canvas cascata-canvas');

// ─── aba CONCEITO: ≥5 SVGs + eixo-mãe + cascata + os mecanismos ──────────────
ok(doc.querySelectorAll('#tab-conceito svg').length >= 5,
  'Conceito: ≥5 desenhos esquemáticos (JGA, cascata, eferente/aldo, ADH, EPO/vitD)');

var conc = doc.getElementById('tab-conceito').textContent;
ok(/renina\s*=\s*baro/i.test(conc) || /AngII\s*=\s*renina/i.test(conc) || /cascata/i.test(conc),
  'Conceito: a cascata / eixo-mãe exposto');
ok(/aparelho justaglomerular/i.test(conc), 'Conceito: o aparelho justaglomerular');
ok(/m[áa]cula densa/i.test(conc) && /simp[áa]tico/i.test(conc), 'Conceito: os três sinais (mácula densa, simpático)');
ok(/angiotensinog[êe]nio/i.test(conc) && /Ang(iotensina)?\s*II/i.test(conc), 'Conceito: a cascata angiotensinogênio → Ang II');
ok(/aldosterona/i.test(conc) && /ENaC/i.test(conc), 'Conceito: aldosterona e ENaC (ponte M8)');
ok(/eferente/i.test(conc), 'Conceito: Ang II na eferente (ponte M2)');
ok(/ADH|vasopressina/i.test(conc) && /(osm[óo]tico|tonicidade)/i.test(conc), 'Conceito: ADH osmótico × não-osmótico');
ok(/eritropoetina|EPO/i.test(conc) && /(HIF|hip[óo]xia|O₂|oxig[êe]nio)/i.test(conc), 'Conceito: EPO e o sensor de O₂ (HIF)');
ok(/vitamina d|calcitriol|1α-hidroxilase|1[αa]-hidroxilase/i.test(conc), 'Conceito: vitamina D / calcitriol (ponte M12)');

// ─── caso (5 atos, prever-depois-revelar) ────────────────────────────────────
ok(doc.querySelectorAll('button.act[data-rev]').length >= 5, 'caso: ≥5 atos com revelar');
ok(doc.querySelectorAll('#caso .reveal').length >= 5,        'caso: ≥5 blocos reveláveis');
ok(doc.querySelector('#fig-caso svg') !== null,              'Caso: ilustração SVG presente (#fig-caso)');

// ─── trilha socrática (≥9 passos) ────────────────────────────────────────────
ok(doc.querySelectorAll('#trilha details').length >= 9, 'trilha: ≥9 passos socráticos');

// ─── engine ≡ UI: eixo inline ≡ model14.js ───────────────────────────────────
ok(typeof win.eixo === 'function', 'UI expõe eixo()');
var amostras = [
  { },
  { pressure: 65, volume: 65, naMacula: 70, symp: 1.8 },
  { pressure: 68, naMacula: 72 },
  { aldoAuto: 8, kplus: 3.0 },
  { GFR: 18, o2: 80 },
  { tonicity: 268, volume: 100, adhDrive: 5 },
  { pressure: null, volume: NaN, naMacula: 'x', symp: undefined, o2: 'lixo', GFR: 'y', kplus: 'z' } // sujeira → clamps
];
var divC = 0;
amostras.forEach(function (a) {
  if (JSON.stringify(win.eixo(a)) !== JSON.stringify(ref.eixo(a))) divC++;
});
ok(divC === 0, 'engine ≡ UI: eixo inline idêntica ao model14.js (' + divC + ' divergências)');

// ─── engine ≡ UI: baro, cascataLayout, respostaLayout ────────────────────────
ok(typeof win.baro           === 'function', 'UI expõe baro()');
ok(typeof win.cascataLayout  === 'function', 'UI expõe cascataLayout()');
ok(typeof win.respostaLayout === 'function', 'UI expõe respostaLayout()');
ok(typeof win.feedbackVolume === 'function', 'UI expõe feedbackVolume()');

var divB = 0, divCas = 0, divResp = 0;
[60, 95, 120, 140, 40].forEach(function (p) {
  if (Math.abs(win.baro(p) - ref.baro(p)) > 1e-9) divB++;
});
amostras.forEach(function (a) {
  if (JSON.stringify(win.cascataLayout(a, 900, 320))  !== JSON.stringify(ref.cascataLayout(a, 900, 320)))  divCas++;
  if (JSON.stringify(win.respostaLayout(a, 300, 180)) !== JSON.stringify(ref.respostaLayout(a, 300, 180))) divResp++;
});
ok(divB    === 0, 'baro ≡ UI (' + divB + ' divergências)');
ok(divCas  === 0, 'cascataLayout ≡ UI (' + divCas + ' divergências)');
ok(divResp === 0, 'respostaLayout ≡ UI (' + divResp + ' divergências)');

// ─── o canvas DESENHOU a cascata (motor manda no pixel) ───────────────────────
var canvasEl = doc.getElementById('cascata-canvas');
var rec = canvasEl.getContext('2d');
ok(rec && Array.isArray(rec.__paths), 'canvas: contexto exercido (gravador ativo)');

// estado inicial dos controles do lab (defaults)
var initState = { pressure: 95, volume: 100, naMacula: 100, symp: 1, aldoAuto: 0, kplus: 4,
                  tonicity: 290, adhDrive: 0, o2: 100, GFR: 100 };
var Lref = ref.cascataLayout(initState, canvasEl.width, canvasEl.height);

// acha a subpath cujo primeiro ponto bate com renP[0] (a polilinha da renina)
var curvePath = null;
(rec.__paths || []).forEach(function (p) {
  if (p.length === Lref.renP.length && p[0]
      && Math.abs(p[0].x - Lref.renP[0].x) < 1e-4 && Math.abs(p[0].y - Lref.renP[0].y) < 1e-4) {
    curvePath = p;
  }
});
ok(curvePath !== null, 'canvas: polilinha da cascata (renina) pintada (' + Lref.renP.length + ' pontos)');

var pintaOk = true;
if (curvePath) {
  for (var i = 0; i < Lref.renP.length; i++) {
    var pp = curvePath[i];
    if (Math.abs(pp.x - Lref.renP[i].x) > 1e-6 || Math.abs(pp.y - Lref.renP[i].y) > 1e-6) { pintaOk = false; break; }
  }
}
ok(pintaOk, 'canvas: cada ponto da renina pintado == cascataLayout(engine)');

// também a polilinha da aldosterona deve aparecer (uma das três curvas)
var aldPath = null;
(rec.__paths || []).forEach(function (p) {
  if (p.length === Lref.aldP.length && p[0]
      && Math.abs(p[0].x - Lref.aldP[0].x) < 1e-4 && Math.abs(p[0].y - Lref.aldP[0].y) < 1e-4) {
    aldPath = p;
  }
});
ok(aldPath !== null, 'canvas: polilinha da aldosterona também pintada');

// rótulos do canvas
ok((rec.__texts || []).join(' ').toLowerCase().indexOf('volume') >= 0, 'canvas: rótulo volume presente');
ok((rec.__texts || []).join(' ').toLowerCase().indexOf('renina') >= 0, 'canvas: rótulo renina presente');
ok((rec.__texts || []).join(' ').indexOf('feedback') >= 0, 'canvas: rótulo feedback presente');

// ─── aba Lab: saídas preenchidas no init ─────────────────────────────────────
ok(doc.getElementById('out-renina').textContent !== '—', 'lab: out-renina preenchido no init');
ok(doc.getElementById('out-aldo').textContent   !== '—', 'lab: out-aldo preenchido no init');
ok(doc.getElementById('out-epo').textContent    !== '—', 'lab: out-epo preenchido no init');
ok(doc.getElementById('out-calc').textContent   !== '—', 'lab: out-calc preenchido no init');
ok(doc.getElementById('veredito').textContent.length > 1, 'lab: veredito computado (não vazio)');
ok(doc.getElementById('lab-pearl').textContent.length > 1, 'lab: pérola computada (não vazia)');
ok(doc.querySelector('#resposta-svg svg') !== null, 'instrumento: figura da resposta (SVG) presente');
ok(doc.querySelectorAll('.preset').length >= 5, 'lab: botões de cenário (presets) presentes');

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
  var ehSvg = /<svg[\s>]/.test(s) && /<(rect|circle|line|path|text|ellipse|polygon)/.test(s);
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
ok(/renina/i.test(body) && /aparelho justaglomerular/i.test(body), 'conteúdo: renina e o aparelho justaglomerular');
ok(/m[áa]cula densa/i.test(body) && /barorreceptor|press[ãa]o/i.test(body) && /simp[áa]tico/i.test(body), 'conteúdo: os três sinais da renina');
ok(/angiotensina|ang ii/i.test(body) && /eferente/i.test(body), 'conteúdo: Ang II e a eferente (M2)');
ok(/aldosterona/i.test(body) && /(K|pot[áa]ssio)/i.test(body), 'conteúdo: aldosterona troca Na por K/H (M8)');
ok(/ADH|vasopressina/i.test(body), 'conteúdo: ADH / vasopressina (M10)');
ok(/eritropoetina|EPO/i.test(body) && /anemia/i.test(body), 'conteúdo: EPO e a anemia da DRC');
ok(/vitamina d|calcitriol/i.test(body), 'conteúdo: vitamina D ativa (M12)');
ok(/volume circulante efetivo/i.test(body), 'conteúdo: o rim defende o volume circulante efetivo');

// ─── farmacologia: M14 é fisiologia; os fármacos do RAAS são o M18 ────────────
ok(/M18/i.test(body), 'farmacologia: aponta o capstone M18 para os fármacos do RAAS');
// dose = massa solta (ex.: "40 mg"); NÃO conta lab (mEq/L, mmHg, mOsm/kg, mL/min)
ok(!/\b\d+\s?(mg|mcg|µg)\b(?!\/)/.test(body), 'M14 sem doses soltas em massa (a farmacologia dosada é o M18)');

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
