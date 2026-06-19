'use strict';
/*
 * FILTRA · M5 — validador jsdom (portão do §6)
 * Confere: estrutura (IDs/abas) · engine ≡ UI (proximal, tituloGlicose, doseResposta,
 * glicoseTitulacaoLayout, doseRespostaLayout) · a curva de titulação pintada no canvas
 * ≡ glicoseTitulacaoLayout() ponto-a-ponto · camada interativa · os dois bancos do tutor
 * (ilustrado c/ SVG + textual) · cromo · disclaimer.
 *
 * Guarda farmacológica INVERTIDA (§8 — o PIVÔ do M5): em vez de PROIBIR doses, EXIGE que
 * toda classe de fármaco do segmento apareça com dose+unidade explícitas ancorada ao nome
 * (acetazolamida ~ mg; dapagliflozina/empagliflozina ~ mg; manitol ~ g/kg|g), e que a
 * dose-resposta do motor (efeito = Emax·D/(EC50+D)) case com um valor renderizado na UI.
 */

var fs   = require('fs');
var path = require('path');
var jsdom = require('jsdom');
var JSDOM = jsdom.JSDOM;

var ref      = require('./model5.js');           // engine canônico (Node)
var imgGuard = require('../lib/img-guard.js');    // guarda offline compartilhada

var oks = 0, fail = 0;
function ok(c, m) { if (c) { oks++; } else { fail++; console.error('FALHA: ' + m); } }

var htmlPath = path.join(__dirname, '..', '..', 'filtra5.html');
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
  'titulacao-canvas','dose-svg',
  'in-glic','in-tfg','in-acz','in-sglt2','in-manitol','in-fanconi',
  'out-filt','out-reab','out-glicuria','out-tmlim','out-fracna','out-fracdist','out-natr',
  'out-braking','out-bicarb','out-hco3','out-efeitos','out-fanconi','out-regime',
  'veredito','instr-pearl','lab-pearl','fig-caso',
  'tutor-q','tutor-opts','tutor-fb','tutor-score','tutor-total','tutor-fig',
  'draw-na65','draw-sglt2','draw-hco3','draw-fanconi','draw-dose'
];
ids.forEach(function (id) { ok(doc.getElementById(id) !== null, 'estrutura: #' + id + ' presente'); });

ok(doc.querySelectorAll('#tabs button').length === 6, 'estrutura: 6 abas');
ok(doc.getElementById('titulacao-canvas').tagName.toLowerCase() === 'canvas', 'instrumento: canvas titulacao-canvas');

// ─── aba CONCEITO: ≥5 SVGs + fórmula dose-resposta + 65%/Tm/limiar ──────────
ok(doc.querySelectorAll('#tab-conceito svg').length >= 5,
  'Conceito: ≥5 desenhos esquemáticos (Na65, titulação, HCO3, Fanconi, dose-resposta)');

var conc = doc.getElementById('tab-conceito').textContent;
ok(/efeito\s*=\s*Emax\s*·\s*D\s*\/\s*\(\s*EC50\s*\+\s*D\s*\)/.test(conc),
  'Conceito: fórmula da dose-resposta efeito = Emax·D/(EC50+D) exposta');
ok(/65%/.test(conc) && /Na/.test(conc), 'Conceito: 65% do Na⁺ no proximal');
ok(/Tm/.test(conc) && /limiar/i.test(conc), 'Conceito: Tm e limiar da titulação da glicose');
ok(/prisioneira do proximal/i.test(conc), 'Conceito: "a alça é prisioneira do proximal"');
ok(/anidrase carbônica/i.test(conc) && /bicarbonat/i.test(conc), 'Conceito: anidrase carbônica e bicarbonatúria');
ok(/SGLT2/i.test(conc) && /glicosúria|glicosuria/i.test(conc), 'Conceito: SGLT2 e glicosúria');
ok(/Fanconi/i.test(conc) && /plasma normal/i.test(conc), 'Conceito: Fanconi com plasma normal');
ok(/isosmótica|isosmotica/i.test(conc), 'Conceito: reabsorção isosmótica');

// ─── caso (5 atos, prever-depois-revelar) ────────────────────────────────────
ok(doc.querySelectorAll('button.act[data-rev]').length >= 5, 'caso: ≥5 atos com revelar');
ok(doc.querySelectorAll('#caso .reveal').length >= 5,        'caso: ≥5 blocos reveláveis');
ok(doc.querySelector('#fig-caso svg') !== null,              'Caso: ilustração SVG presente (#fig-caso)');

// ─── trilha socrática (≥9 passos) ────────────────────────────────────────────
ok(doc.querySelectorAll('#trilha details').length >= 9, 'trilha: ≥9 passos socráticos');

// ─── engine ≡ UI: proximal inline ≡ model5.js ────────────────────────────────
ok(typeof win.proximal === 'function', 'UI expõe proximal()');
var amostras = [
  { },
  { glicemia: 300 },
  { glicemia: 100, sglt2: 10 },
  { glicemia: 100, acz: 500 },
  { glicemia: 100, manitol: 1 },
  { glicemia: 100, fanconi: true },
  { glicemia: null, TFG: NaN, acz: 'x', sglt2: undefined, manitol: 'y', fanconi: 'lixo' } // sujeira
];
var divP = 0;
amostras.forEach(function (a) {
  if (JSON.stringify(win.proximal(a)) !== JSON.stringify(ref.proximal(a))) divP++;
});
ok(divP === 0, 'engine ≡ UI: proximal inline idêntica ao model5.js (' + divP + ' divergências)');

// ─── engine ≡ UI: doseResposta, tituloGlicose, layouts ───────────────────────
ok(typeof win.doseResposta === 'function', 'UI expõe doseResposta()');
ok(typeof win.tituloGlicose === 'function', 'UI expõe tituloGlicose()');
ok(typeof win.glicoseTitulacaoLayout === 'function', 'UI expõe glicoseTitulacaoLayout()');
ok(typeof win.doseRespostaLayout === 'function', 'UI expõe doseRespostaLayout()');

var divDR = 0, divTit = 0, divLayG = 0, divLayD = 0;
[[0,250,0.8],[250,250,0.8],[500,250,0.8],[5,5,0.55],[10,5,0.55],[1e9,250,0.8]].forEach(function (p) {
  if (Math.abs(win.doseResposta(p[0],p[1],p[2]) - ref.doseResposta(p[0],p[1],p[2])) > 1e-12) divDR++;
});
[[100,120,375,200],[300,120,375,200],[100,120,238,127],[500,90,375,200]].forEach(function (p) {
  if (JSON.stringify(win.tituloGlicose(p[0],p[1],p[2],p[3])) !== JSON.stringify(ref.tituloGlicose(p[0],p[1],p[2],p[3]))) divTit++;
});
amostras.forEach(function (a) {
  if (JSON.stringify(win.glicoseTitulacaoLayout(a, 900, 320)) !== JSON.stringify(ref.glicoseTitulacaoLayout(a, 900, 320))) divLayG++;
});
[[5,0.55,25,300,180,10],[250,0.8,1000,320,180,500]].forEach(function (p) {
  if (JSON.stringify(win.doseRespostaLayout(p[0],p[1],p[2],p[3],p[4],p[5])) !== JSON.stringify(ref.doseRespostaLayout(p[0],p[1],p[2],p[3],p[4],p[5]))) divLayD++;
});
ok(divDR  === 0, 'doseResposta ≡ UI (' + divDR + ' divergências)');
ok(divTit === 0, 'tituloGlicose ≡ UI (' + divTit + ' divergências)');
ok(divLayG === 0, 'glicoseTitulacaoLayout ≡ UI (' + divLayG + ' divergências)');
ok(divLayD === 0, 'doseRespostaLayout ≡ UI (' + divLayD + ' divergências)');

// ─── o canvas DESENHOU a curva de titulação (motor manda no pixel) ────────────
var canvasEl = doc.getElementById('titulacao-canvas');
var rec = canvasEl.getContext('2d');
ok(rec && Array.isArray(rec.__paths), 'canvas: contexto exercido (gravador ativo)');

// estado inicial dos controles do lab: glicemia=100, TFG=120, sem droga, sem Fanconi
var initState = { glicemia: 100, TFG: 120, acz: 0, sglt2: 0, manitol: 0, fanconi: false };
var Lref = ref.glicoseTitulacaoLayout(initState, canvasEl.width, canvasEl.height);

// acha a subpath cujo primeiro ponto bate com exc[0] (a polilinha da excreção/glicosúria)
function achaPolilinha(pts) {
  var found = null;
  (rec.__paths || []).forEach(function (p) {
    if (p.length === pts.length && p[0]
        && Math.abs(p[0].x - pts[0].x) < 1e-4 && Math.abs(p[0].y - pts[0].y) < 1e-4) {
      // confere ponto-a-ponto
      var good = true;
      for (var i = 0; i < pts.length; i++) {
        if (Math.abs(p[i].x - pts[i].x) > 1e-6 || Math.abs(p[i].y - pts[i].y) > 1e-6) { good = false; break; }
      }
      if (good) found = p;
    }
  });
  return found;
}
var excPath = achaPolilinha(Lref.exc);
ok(excPath !== null, 'canvas: polilinha da EXCRETADA pintada == glicoseTitulacaoLayout (' + Lref.exc.length + ' pontos)');
var filtPath = achaPolilinha(Lref.filt);
ok(filtPath !== null, 'canvas: polilinha da FILTRADA pintada == layout');
var reabPath = achaPolilinha(Lref.reab);
ok(reabPath !== null, 'canvas: polilinha da REABSORVIDA pintada == layout');

// rótulos da titulação
var allTexts = (rec.__texts || []).join(' ');
ok(allTexts.indexOf('glicemia') >= 0, 'canvas: rótulo glicemia presente');
ok(allTexts.indexOf('Tm') >= 0, 'canvas: rótulo Tm presente');
ok(allTexts.indexOf('limiar') >= 0, 'canvas: rótulo limiar presente');
ok(allTexts.indexOf('excretada') >= 0, 'canvas: legenda da excretada presente');
var fills = (rec.__rects || []).filter(function (q) { return q.op === 'fill'; });
ok(fills.length >= 3, 'canvas: marcadores de legenda (3 cores) pintados');

// ─── aba Lab: saídas preenchidas no init ─────────────────────────────────────
ok(doc.getElementById('out-filt').textContent     !== '—', 'lab: out-filt preenchido no init');
ok(doc.getElementById('out-glicuria').textContent !== '—', 'lab: out-glicuria preenchido no init');
ok(doc.getElementById('out-fracna').textContent   !== '—', 'lab: out-fracna preenchido no init');
ok(doc.getElementById('out-hco3').textContent     !== '—', 'lab: out-hco3 preenchido no init');
ok(doc.getElementById('out-efeitos').textContent  !== '—', 'lab: out-efeitos (dose-resposta) preenchido no init');
ok(doc.getElementById('veredito').textContent.length > 1, 'lab: veredito computado (não vazio)');
ok(doc.getElementById('lab-pearl').textContent.length > 1, 'lab: pérola computada (não vazia)');
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
ok(/65%/.test(body) && /Na/.test(body), 'conteúdo: 65% do Na⁺ no proximal');
ok(/prisioneira do proximal/i.test(body), 'conteúdo: a alça é prisioneira do proximal');
ok(/SGLT2/.test(body) && /glicosúria|glicosuria/i.test(body), 'conteúdo: SGLT2 e glicosúria');
ok(/Tm/.test(body) && /limiar/i.test(body) && /splay/i.test(body), 'conteúdo: Tm, limiar e splay da titulação');
ok(/anidrase carbônica/i.test(body) && /NHE3/.test(body), 'conteúdo: anidrase carbônica e NHE3');
ok(/Fanconi/i.test(body) && /(aminoácido|aminoacido|fosfato)/i.test(body), 'conteúdo: Fanconi (perdas múltiplas)');
ok(/feedback tubuloglomerular|nefroprote/i.test(body), 'conteúdo: SGLT2i restaura o TGF (nefroproteção)');
ok(/braking|teto/i.test(body), 'conteúdo: braking/teto da inibição proximal');

// ─── guarda farmacológica INVERTIDA (§8 — o PIVÔ): EXIGIR doses com unidade ───
// cada classe de fármaco do segmento deve trazer dose+unidade explícita ancorada ao nome.
ok(/acetazolamida[^.]{0,40}?\d+\s*[–-]?\s*\d*\s*mg/i.test(body) || /acetazolamida[\s\S]{0,60}?\d+\s*mg/i.test(body),
  'farmacologia (PIVÔ): acetazolamida com dose em mg ancorada ao nome');
ok(/dapagliflozina[\s\S]{0,40}?\d+\s*mg/i.test(body), 'farmacologia (PIVÔ): dapagliflozina com dose em mg');
ok(/empagliflozina[\s\S]{0,40}?\d+\s*[–-]?\s*\d*\s*mg/i.test(body), 'farmacologia (PIVÔ): empagliflozina com dose em mg');
ok(/manitol[\s\S]{0,40}?\d+(?:[.,]\d+)?\s*[–-]?\s*\d*(?:[.,]\d+)?\s*g\/kg/i.test(body), 'farmacologia (PIVÔ): manitol com dose em g/kg');
// o disclaimer educacional deve permanecer (a guarda EXIGE dose mas mantém o aviso)
ok(/dispositivo médico|responsabilidade/i.test(body), 'farmacologia (PIVÔ): disclaimer/responsabilidade do prescritor presente');

// a dose-resposta do MOTOR deve casar com um valor RENDERIZADO na UI (efeito = Emax·D/(EC50+D))
// no init o instrumento desenha doseFig({sglt2:10}); o ponto renderiza fmt(efeito,2) = 0.61
var efeitoUI = ref.doseResposta(10, ref.CONST.SGLT2_EC50, ref.CONST.SGLT2_EMAX);
var efeitoStr = (Math.round(efeitoUI * 100) / 100).toFixed(2);   // ex.: "0.61"
// o Conceito renderiza doseFig({sglt2:10}) em #draw-dose; o ponto mostra fmt(efeito,2)
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
