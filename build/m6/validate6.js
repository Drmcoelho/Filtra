'use strict';
/*
 * FILTRA · M6 — validador jsdom (portão do §6)
 * Confere: estrutura (IDs/abas) · engine ≡ UI (alca, doseResposta, gradienteLayout,
 * doseRespostaLayout) · a curva do gradiente pintada no canvas ≡ gradienteLayout()
 * ponto-a-ponto · camada interativa · os dois bancos do tutor (ilustrado c/ SVG +
 * textual) · cromo · disclaimer.
 *
 * Guarda farmacológica INVERTIDA (§8): em vez de PROIBIR doses, EXIGE que cada diurético
 * de alça apareça com dose+unidade explícitas ancorada ao nome (furosemida ~ mg;
 * bumetanida ~ mg; torasemida ~ mg), e que a dose-resposta do motor (efeito = Emax·D/
 * (EC50+D)) case com um valor renderizado na UI.
 */

var fs   = require('fs');
var path = require('path');
var jsdom = require('jsdom');
var JSDOM = jsdom.JSDOM;

var ref      = require('./model6.js');           // engine canônico (Node)
var imgGuard = require('../lib/img-guard.js');    // guarda offline compartilhada

var oks = 0, fail = 0;
function ok(c, m) { if (c) { oks++; } else { fail++; console.error('FALHA: ' + m); } }

var htmlPath = path.join(__dirname, '..', '..', 'filtra6.html');
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
  'gradiente-canvas','dose-svg',
  'in-furo','in-bume','in-tora','in-tfg','in-via','in-resist',
  'out-bloq','out-furoeff','out-natr','out-papila','out-grad','out-natal','out-camg',
  'out-agua','out-ec50','out-efeitos','out-ativa','out-regime',
  'veredito','instr-pearl','lab-pearl','fig-caso',
  'tutor-q','tutor-opts','tutor-fb','tutor-score','tutor-total','tutor-fig',
  'draw-ramos','draw-nkcc2','draw-grad','draw-dose','draw-dose2'
];
ids.forEach(function (id) { ok(doc.getElementById(id) !== null, 'estrutura: #' + id + ' presente'); });

ok(doc.querySelectorAll('#tabs button').length === 6, 'estrutura: 6 abas');
ok(doc.getElementById('gradiente-canvas').tagName.toLowerCase() === 'canvas', 'instrumento: canvas gradiente-canvas');

// ─── aba CONCEITO: ≥5 SVGs + fórmula dose-resposta + conceitos-chave ─────────
ok(doc.querySelectorAll('#tab-conceito svg').length >= 5,
  'Conceito: ≥5 desenhos esquemáticos (ramos, NKCC2, gradiente, dose-resposta ×2)');

var conc = doc.getElementById('tab-conceito').textContent;
ok(/efeito\s*=\s*Emax\s*·\s*D\s*\/\s*\(\s*EC50\s*\+\s*D\s*\)/.test(conc),
  'Conceito: fórmula da dose-resposta efeito = Emax·D/(EC50+D) exposta');
ok(/NKCC2/.test(conc), 'Conceito: NKCC2 (alvo do ramo espesso)');
ok(/cria o gradiente|cria.{0,4}o gradiente/i.test(conc), 'Conceito: a alça CRIA o gradiente (não concentra)');
ok(/motor diluidor/i.test(conc), 'Conceito: o TAL é o motor diluidor');
ok(/contracorrente/i.test(conc), 'Conceito: multiplicador/trocador de contracorrente');
ok(/1200/.test(conc) && /300/.test(conc), 'Conceito: gradiente 300 (córtex) → 1200 (papila)');
ok(/(Ca|cálcio|calcio)/i.test(conc) && /(Mg|magnésio|magnesio)/i.test(conc) && /paracelular/i.test(conc), 'Conceito: Ca²⁺/Mg²⁺ paracelular');
ok(/impermeável à água|impermeavel à agua|impermeável a água/i.test(conc), 'Conceito: TAL impermeável à água');

// ─── caso (5 atos, prever-depois-revelar) ────────────────────────────────────
ok(doc.querySelectorAll('button.act[data-rev]').length >= 5, 'caso: ≥5 atos com revelar');
ok(doc.querySelectorAll('#caso .reveal').length >= 5,        'caso: ≥5 blocos reveláveis');
ok(doc.querySelector('#fig-caso svg') !== null,              'Caso: ilustração SVG presente (#fig-caso)');

// ─── trilha socrática (≥9 passos) ────────────────────────────────────────────
ok(doc.querySelectorAll('#trilha details').length >= 9, 'trilha: ≥9 passos socráticos');

// ─── engine ≡ UI: alca inline ≡ model6.js ────────────────────────────────────
ok(typeof win.alca === 'function', 'UI expõe alca()');
var amostras = [
  { },
  { furo: 40, via: 'iv' },
  { furo: 40, via: 'vo' },
  { furo: 200, via: 'iv', resistencia: 1 },
  { bume: 1, via: 'iv' },
  { tora: 20, via: 'iv' },
  { TFG: null, furo: NaN, bume: 'x', tora: undefined, via: 'lixo', resistencia: 'y' } // sujeira
];
var divP = 0;
amostras.forEach(function (a) {
  if (JSON.stringify(win.alca(a)) !== JSON.stringify(ref.alca(a))) divP++;
});
ok(divP === 0, 'engine ≡ UI: alca inline idêntica ao model6.js (' + divP + ' divergências)');

// ─── engine ≡ UI: doseResposta, layouts ──────────────────────────────────────
ok(typeof win.doseResposta === 'function', 'UI expõe doseResposta()');
ok(typeof win.gradienteLayout === 'function', 'UI expõe gradienteLayout()');
ok(typeof win.doseRespostaLayout === 'function', 'UI expõe doseRespostaLayout()');

var divDR = 0, divLayG = 0, divLayD = 0;
[[0,25,0.92],[25,25,0.92],[200,25,0.92],[0.7,0.7,0.92],[1,0.7,0.92],[1e9,25,0.92]].forEach(function (p) {
  if (Math.abs(win.doseResposta(p[0],p[1],p[2]) - ref.doseResposta(p[0],p[1],p[2])) > 1e-12) divDR++;
});
amostras.forEach(function (a) {
  if (JSON.stringify(win.gradienteLayout(a, 900, 320)) !== JSON.stringify(ref.gradienteLayout(a, 900, 320))) divLayG++;
});
[[25,0.92,200,320,180,40,150],[0.7,0.92,4,300,180,1,0]].forEach(function (p) {
  if (JSON.stringify(win.doseRespostaLayout(p[0],p[1],p[2],p[3],p[4],p[5],p[6])) !== JSON.stringify(ref.doseRespostaLayout(p[0],p[1],p[2],p[3],p[4],p[5],p[6]))) divLayD++;
});
ok(divDR  === 0, 'doseResposta ≡ UI (' + divDR + ' divergências)');
ok(divLayG === 0, 'gradienteLayout ≡ UI (' + divLayG + ' divergências)');
ok(divLayD === 0, 'doseRespostaLayout ≡ UI (' + divLayD + ' divergências)');

// ─── o canvas DESENHOU a curva do gradiente (motor manda no pixel) ────────────
var canvasEl = doc.getElementById('gradiente-canvas');
var rec = canvasEl.getContext('2d');
ok(rec && Array.isArray(rec.__paths), 'canvas: contexto exercido (gravador ativo)');

// estado inicial dos controles do lab: sem droga, TFG=120, IV, sem resistência
var initState = { TFG: 120, furo: 0, bume: 0, tora: 0, via: 'iv', resistencia: 0 };
var Lref = ref.gradienteLayout(initState, canvasEl.width, canvasEl.height);

// acha a subpath cujo primeiro ponto bate com pts[0] (a polilinha do gradiente)
function achaPolilinha(pts) {
  var found = null;
  (rec.__paths || []).forEach(function (p) {
    if (p.length === pts.length && p[0]
        && Math.abs(p[0].x - pts[0].x) < 1e-4 && Math.abs(p[0].y - pts[0].y) < 1e-4) {
      var good = true;
      for (var i = 0; i < pts.length; i++) {
        if (Math.abs(p[i].x - pts[i].x) > 1e-6 || Math.abs(p[i].y - pts[i].y) > 1e-6) { good = false; break; }
      }
      if (good) found = p;
    }
  });
  return found;
}
var gradPath = achaPolilinha(Lref.pts);
ok(gradPath !== null, 'canvas: polilinha do GRADIENTE pintada == gradienteLayout (' + Lref.pts.length + ' pontos)');

// rótulos do gradiente
var allTexts = (rec.__texts || []).join(' ');
ok(allTexts.indexOf('osmolalidade') >= 0, 'canvas: rótulo osmolalidade presente');
ok(allTexts.indexOf('córtex') >= 0, 'canvas: rótulo córtex presente');
ok(allTexts.indexOf('papila') >= 0, 'canvas: rótulo papila presente');
var fills = (rec.__rects || []).filter(function (q) { return q.op === 'fill'; });
ok(fills.length >= 3, 'canvas: marcadores de legenda (3 cores) pintados');

// ─── aba Lab: saídas preenchidas no init ─────────────────────────────────────
ok(doc.getElementById('out-bloq').textContent   !== '—', 'lab: out-bloq preenchido no init');
ok(doc.getElementById('out-papila').textContent !== '—', 'lab: out-papila preenchido no init');
ok(doc.getElementById('out-grad').textContent   !== '—', 'lab: out-grad preenchido no init');
ok(doc.getElementById('out-camg').textContent   !== '—', 'lab: out-camg preenchido no init');
ok(doc.getElementById('out-efeitos').textContent!== '—', 'lab: out-efeitos (dose-resposta) preenchido no init');
ok(doc.getElementById('veredito').textContent.length > 1, 'lab: veredito computado (não vazio)');
ok(doc.getElementById('lab-pearl').textContent.length > 1, 'lab: pérola computada (não vazia)');
ok(doc.querySelectorAll('button.act[data-preset]').length >= 5, 'lab: ≥5 presets de cenário');
ok(doc.querySelector('#dose-svg svg') !== null, 'instrumento: figura da dose-resposta (SVG) presente');

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
ok(/cria o gradiente|CRIA o gradiente/i.test(body), 'conteúdo: a alça CRIA o gradiente corticomedular');
ok(/motor diluidor/i.test(body), 'conteúdo: o TAL é o motor diluidor');
ok(/NKCC2/.test(body) && /Na.{0,3}K.{0,3}2Cl|Na-K-2Cl/i.test(body), 'conteúdo: NKCC2 (Na-K-2Cl)');
ok(/contracorrente/i.test(body) && /1200/.test(body), 'conteúdo: multiplicador de contracorrente (1200 mOsm)');
ok(/vasa recta/i.test(body), 'conteúdo: vasa recta (trocador de contracorrente)');
ok(/teto alto/i.test(body), 'conteúdo: diuréticos de alça de teto alto');
ok(/braking|resistência diurética|resistencia diuretica/i.test(body), 'conteúdo: braking/resistência diurética');
ok(/ototo/i.test(body), 'conteúdo: ototoxicidade em bolus rápido');
ok(/tiazídico|tiazidico/i.test(body) && /(perde|calciúria|calciuria)/i.test(body), 'conteúdo: perde Ca/Mg ≠ tiazídico');

// ─── guarda farmacológica INVERTIDA (§8): EXIGIR doses com unidade ───────────
// cada diurético de alça deve trazer dose+unidade explícita ancorada ao nome.
ok(/furosemida[\s\S]{0,60}?\d+\s*[–-]?\s*\d*\s*mg/i.test(body), 'farmacologia (PIVÔ): furosemida com dose em mg ancorada ao nome');
ok(/bumetanida[\s\S]{0,50}?\d+(?:[.,]\d+)?\s*[–-]?\s*\d*(?:[.,]\d+)?\s*mg/i.test(body), 'farmacologia (PIVÔ): bumetanida com dose em mg');
ok(/torasemida[\s\S]{0,50}?\d+\s*[–-]?\s*\d*\s*mg/i.test(body), 'farmacologia (PIVÔ): torasemida com dose em mg');
// dose ancorada ao mecanismo (NKCC2)
ok(/NKCC2/.test(body) && /furosemida/i.test(body), 'farmacologia (PIVÔ): dose ancorada ao mecanismo (NKCC2)');
// o disclaimer educacional deve permanecer
ok(/dispositivo médico|responsabilidade/i.test(body), 'farmacologia (PIVÔ): disclaimer/responsabilidade do prescritor presente');

// a dose-resposta do MOTOR deve casar com um valor RENDERIZADO na UI (efeito = Emax·D/(EC50+D))
// no init o instrumento desenha doseFig({furo:40}); o ponto renderiza fmt(efeito,2)
var efeitoUI = ref.doseResposta(40, ref.CONST.FURO_EC50, ref.CONST.FURO_EMAX);
var efeitoStr = (Math.round(efeitoUI * 100) / 100).toFixed(2);   // ex.: "0.57"
var doseSvgTxt = doc.getElementById('draw-dose') ? doc.getElementById('draw-dose').textContent : '';
ok(doseSvgTxt.indexOf(efeitoStr) >= 0,
  'farmacologia (PIVÔ): a dose-resposta do motor (efeito ' + efeitoStr + ') aparece renderizada na UI');
// e o out-efeitos do lab deve casar com o motor (no init todas as doses = 0 → "0.00 · 0.00 · 0.00")
ok(/0\.00\s*·\s*0\.00\s*·\s*0\.00/.test(doc.getElementById('out-efeitos').textContent),
  'farmacologia (PIVÔ): out-efeitos do lab computa a dose-resposta (init = 0)');

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
