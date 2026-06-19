'use strict';
/*
 * FILTRA · M8 — validador jsdom (portão do §6)
 * Confere: estrutura (IDs/abas) · engine ≡ UI (ductoColetor, doseResposta,
 * kSecrecaoLayout, doseRespostaLayout) · a curva de secreção de K⁺ pintada no canvas
 * ≡ kSecrecaoLayout() ponto-a-ponto · camada interativa · os dois bancos do tutor
 * (ilustrado c/ SVG + textual) · cromo · disclaimer.
 *
 * Guarda farmacológica INVERTIDA (§8): em vez de PROIBIR doses, EXIGE que toda classe
 * de fármaco do segmento apareça com dose+unidade explícitas ancorada ao nome
 * (espironolactona ~ mg; eplerenona ~ mg; amilorida ~ mg; tolvaptana ~ mg), e que a
 * dose-resposta do motor (efeito = Emax·D/(EC50+D)) case com um valor renderizado na UI.
 */

var fs   = require('fs');
var path = require('path');
var jsdom = require('jsdom');
var JSDOM = jsdom.JSDOM;

var ref      = require('./model8.js');           // engine canônico (Node)
var imgGuard = require('../lib/img-guard.js');    // guarda offline compartilhada

var oks = 0, fail = 0;
function ok(c, m) { if (c) { oks++; } else { fail++; console.error('FALHA: ' + m); } }

var htmlPath = path.join(__dirname, '..', '..', 'filtra8.html');
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
  'ksec-canvas','dose-svg',
  'in-aldo','in-adh','in-spiro','in-eple','in-amil','in-tolva','in-ieca','in-liddle',
  'out-enac','out-fracna','out-ksec','out-k','out-hco3','out-osmu','out-cal','out-na',
  'out-natr','out-efeitos','out-regime',
  'veredito','instr-pearl','lab-pearl','fig-caso',
  'tutor-q','tutor-opts','tutor-fb','tutor-score','tutor-total','tutor-fig',
  'draw-principal','draw-aldo','draw-intercalar','draw-adh','draw-dose'
];
ids.forEach(function (id) { ok(doc.getElementById(id) !== null, 'estrutura: #' + id + ' presente'); });

ok(doc.querySelectorAll('#tabs button').length === 6, 'estrutura: 6 abas');
ok(doc.getElementById('ksec-canvas').tagName.toLowerCase() === 'canvas', 'instrumento: canvas ksec-canvas');

// ─── aba CONCEITO: ≥5 SVGs + fórmula dose-resposta + mecanismos-chave ────────
ok(doc.querySelectorAll('#tab-conceito svg').length >= 5,
  'Conceito: ≥5 desenhos esquemáticos (principal, aldo, intercalar, ADH, dose-resposta)');

var conc = doc.getElementById('tab-conceito').textContent;
ok(/efeito\s*=\s*Emax\s*·\s*D\s*\/\s*\(\s*EC50\s*\+\s*D\s*\)/.test(conc),
  'Conceito: fórmula da dose-resposta efeito = Emax·D/(EC50+D) exposta');
ok(/ENaC/.test(conc) && /aldosterona/i.test(conc), 'Conceito: ENaC e aldosterona');
ok(/TROCA/.test(conc) && /K/.test(conc) && /H/.test(conc), 'Conceito: a aldosterona TROCA Na por K/H');
ok(/2[–-]3%/.test(conc) || /2.3%/.test(conc), 'Conceito: o ducto maneja ~2–3% do Na⁺ (ajuste fino)');
ok(/aquaporina/i.test(conc) && /água livre/i.test(conc), 'Conceito: ADH/aquaporina e a água livre');
ok(/intercalar/i.test(conc) && /HCO/.test(conc), 'Conceito: célula intercalar e o ácido-base');
ok(/V2/.test(conc) && /tolvaptana/i.test(conc), 'Conceito: V2 e a tolvaptana');
ok(/hipocalemia/i.test(conc) && /alcalose/i.test(conc), 'Conceito: hiperaldo → hipocalemia + alcalose');

// ─── caso (5 atos, prever-depois-revelar) ────────────────────────────────────
ok(doc.querySelectorAll('button.act[data-rev]').length >= 5, 'caso: ≥5 atos com revelar');
ok(doc.querySelectorAll('#caso .reveal').length >= 5,        'caso: ≥5 blocos reveláveis');
ok(doc.querySelector('#fig-caso svg') !== null,              'Caso: ilustração SVG presente (#fig-caso)');

// ─── trilha socrática (≥9 passos) ────────────────────────────────────────────
ok(doc.querySelectorAll('#trilha details').length >= 9, 'trilha: ≥9 passos socráticos');

// ─── engine ≡ UI: ductoColetor inline ≡ model8.js ────────────────────────────
ok(typeof win.ductoColetor === 'function', 'UI expõe ductoColetor()');
var amostras = [
  { },
  { aldo: 2.5 },
  { aldo: 0.2 },
  { espiro: 50 },
  { amilorida: 10 },
  { eplerenona: 50 },
  { adh: 3, tolvaptana: 30 },
  { adh: 2 },
  { espiro: 50, ieca: true },
  { liddle: true },
  { liddle: true, amilorida: 10 },
  { aldo: null, adh: NaN, espiro: 'x', tolvaptana: undefined, ieca: 'lixo', liddle: 'lixo' } // sujeira
];
var divP = 0;
amostras.forEach(function (a) {
  if (JSON.stringify(win.ductoColetor(a)) !== JSON.stringify(ref.ductoColetor(a))) divP++;
});
ok(divP === 0, 'engine ≡ UI: ductoColetor inline idêntica ao model8.js (' + divP + ' divergências)');

// ─── engine ≡ UI: doseResposta, layouts ──────────────────────────────────────
ok(typeof win.doseResposta === 'function', 'UI expõe doseResposta()');
ok(typeof win.kSecrecaoLayout === 'function', 'UI expõe kSecrecaoLayout()');
ok(typeof win.doseRespostaLayout === 'function', 'UI expõe doseRespostaLayout()');

var divDR = 0, divLayK = 0, divLayD = 0;
[[0,50,0.85],[50,50,0.85],[100,50,0.85],[5,5,0.80],[15,15,0.90],[1e9,50,0.85]].forEach(function (p) {
  if (Math.abs(win.doseResposta(p[0],p[1],p[2]) - ref.doseResposta(p[0],p[1],p[2])) > 1e-12) divDR++;
});
amostras.forEach(function (a) {
  if (JSON.stringify(win.kSecrecaoLayout(a, 900, 320)) !== JSON.stringify(ref.kSecrecaoLayout(a, 900, 320))) divLayK++;
});
[[50,0.85,100,320,180,50],[15,0.90,60,320,180,30]].forEach(function (p) {
  if (JSON.stringify(win.doseRespostaLayout(p[0],p[1],p[2],p[3],p[4],p[5])) !== JSON.stringify(ref.doseRespostaLayout(p[0],p[1],p[2],p[3],p[4],p[5]))) divLayD++;
});
ok(divDR  === 0, 'doseResposta ≡ UI (' + divDR + ' divergências)');
ok(divLayK === 0, 'kSecrecaoLayout ≡ UI (' + divLayK + ' divergências)');
ok(divLayD === 0, 'doseRespostaLayout ≡ UI (' + divLayD + ' divergências)');

// ─── o canvas DESENHOU a curva de secreção de K (motor manda no pixel) ────────
var canvasEl = doc.getElementById('ksec-canvas');
var rec = canvasEl.getContext('2d');
ok(rec && Array.isArray(rec.__paths), 'canvas: contexto exercido (gravador ativo)');

// estado inicial dos controles do lab: aldo=1, adh=1, sem droga, sem ieca/liddle
var initState = { aldo: 1, adh: 1, espiro: 0, eplerenona: 0, amilorida: 0, tolvaptana: 0, ieca: false, liddle: false };
var Lref = ref.kSecrecaoLayout(initState, canvasEl.width, canvasEl.height);

// acha a subpath cujo primeiro ponto bate com o array (a polilinha buscada)
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
var comPath = achaPolilinha(Lref.comBloco);
ok(comPath !== null, 'canvas: polilinha COM poupador pintada == kSecrecaoLayout (' + Lref.comBloco.length + ' pontos)');
var semPath = achaPolilinha(Lref.semBloco);
ok(semPath !== null, 'canvas: polilinha SEM bloqueio pintada == layout');

// rótulos do instrumento
var allTexts = (rec.__texts || []).join(' ');
ok(allTexts.indexOf('aldosterona') >= 0, 'canvas: rótulo aldosterona presente');
ok(allTexts.indexOf('K') >= 0, 'canvas: rótulo de K⁺ presente');
ok(allTexts.indexOf('sem bloqueio') >= 0, 'canvas: legenda "sem bloqueio" presente');
ok(allTexts.indexOf('com poupador') >= 0, 'canvas: legenda "com poupador" presente');
var fills = (rec.__rects || []).filter(function (q) { return q.op === 'fill'; });
ok(fills.length >= 3, 'canvas: marcadores de legenda (3 cores) pintados');

// ─── aba Lab: saídas preenchidas no init ─────────────────────────────────────
ok(doc.getElementById('out-enac').textContent !== '—', 'lab: out-enac preenchido no init');
ok(doc.getElementById('out-ksec').textContent !== '—', 'lab: out-ksec preenchido no init');
ok(doc.getElementById('out-k').textContent    !== '—', 'lab: out-k preenchido no init');
ok(doc.getElementById('out-na').textContent   !== '—', 'lab: out-na preenchido no init');
ok(doc.getElementById('out-efeitos').textContent !== '—', 'lab: out-efeitos (dose-resposta) preenchido no init');
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
ok(/ENaC/.test(body) && /voltagem|eletronegativa/i.test(body), 'conteúdo: ENaC gera a voltagem luminal');
ok(/TROCA/.test(body) && /aldosterona/i.test(body), 'conteúdo: a aldosterona TROCA Na por K/H');
ok(/hipocalemia/i.test(body) && /alcalose/i.test(body), 'conteúdo: hiperaldo → hipocalemia + alcalose');
ok(/aquaporina/i.test(body) && /V2/.test(body), 'conteúdo: ADH → V2 → aquaporina-2');
ok(/água livre/i.test(body) && /aquarese/i.test(body), 'conteúdo: aquarese e água livre (tolvaptana)');
ok(/intercalar/i.test(body) && /(acidez titulável|NH₄|regenera)/i.test(body), 'conteúdo: célula intercalar (ácido-base)');
ok(/hipercalemia/i.test(body) && /IECA|BRA/.test(body), 'conteúdo: poupador + IECA → hipercalemia');
ok(/Liddle/i.test(body) && /amilorida/i.test(body), 'conteúdo: Liddle vs amilorida');
ok(/ajuste fino/i.test(body), 'conteúdo: o ducto como ajuste fino');

// ─── guarda farmacológica INVERTIDA (§8): EXIGIR doses com unidade ───────────
// cada classe de fármaco do segmento deve trazer dose+unidade explícita ancorada ao nome.
ok(/espironolactona[\s\S]{0,40}?\d+\s*[–-]?\s*\d*\s*mg/i.test(body),
  'farmacologia (§8): espironolactona com dose em mg ancorada ao nome');
ok(/eplerenona[\s\S]{0,40}?\d+\s*[–-]?\s*\d*\s*mg/i.test(body),
  'farmacologia (§8): eplerenona com dose em mg');
ok(/amilorida[\s\S]{0,40}?\d+\s*[–-]?\s*\d*\s*mg/i.test(body),
  'farmacologia (§8): amilorida com dose em mg');
ok(/tolvaptana[\s\S]{0,40}?\d+\s*[–-]?\s*\d*\s*mg/i.test(body),
  'farmacologia (§8): tolvaptana com dose em mg');
// o disclaimer educacional deve permanecer (a guarda EXIGE dose mas mantém o aviso)
ok(/dispositivo médico|responsabilidade/i.test(body), 'farmacologia (§8): disclaimer/responsabilidade do prescritor presente');

// a dose-resposta do MOTOR deve casar com um valor RENDERIZADO na UI (efeito = Emax·D/(EC50+D))
// no init o Conceito desenha doseFig({espiro:50}) em #draw-dose; o ponto mostra fmt(efeito,2) = 0.42
var efeitoUI = ref.doseResposta(50, ref.CONST.SPIRO_EC50, ref.CONST.SPIRO_EMAX);
var efeitoStr = (Math.round(efeitoUI * 100) / 100).toFixed(2);   // ex.: "0.42"
var doseSvgTxt = doc.getElementById('draw-dose') ? doc.getElementById('draw-dose').textContent : '';
ok(doseSvgTxt.indexOf(efeitoStr) >= 0,
  'farmacologia (§8): a dose-resposta do motor (efeito ' + efeitoStr + ') aparece renderizada na UI');
// e o out-efeitos do lab deve casar com o motor (no init todas as doses = 0 → "0.00 · 0.00 · 0.00 · 0.00")
ok(/0\.00\s*·\s*0\.00\s*·\s*0\.00\s*·\s*0\.00/.test(doc.getElementById('out-efeitos').textContent),
  'farmacologia (§8): out-efeitos do lab computa a dose-resposta (init = 0)');

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
