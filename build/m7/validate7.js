'use strict';
/*
 * FILTRA · M7 — validador jsdom (portão do §6)
 * Confere: estrutura (IDs/abas) · engine ≡ UI (distal, doseResposta, eficaciaTFG,
 * duasCurvasLayout, doseRespostaLayout) · as DUAS curvas pintadas no canvas
 * ≡ duasCurvasLayout() ponto-a-ponto · camada interativa · os dois bancos do tutor
 * (ilustrado c/ SVG + textual) · cromo · disclaimer.
 *
 * Guarda farmacológica INVERTIDA (§8 — o PIVÔ tiazídico): em vez de PROIBIR doses, EXIGE que
 * cada tiazídico do segmento apareça com dose+unidade explícitas ancorada ao nome
 * (hidroclorotiazida ~ mg; clortalidona ~ mg; indapamida ~ mg), e que a dose-resposta do motor
 * (efeito = Emax·D/(EC50+D)) case com um valor renderizado na UI.
 */

var fs   = require('fs');
var path = require('path');
var jsdom = require('jsdom');
var JSDOM = jsdom.JSDOM;

var ref      = require('./model7.js');           // engine canônico (Node)
var imgGuard = require('../lib/img-guard.js');    // guarda offline compartilhada

var oks = 0, fail = 0;
function ok(c, m) { if (c) { oks++; } else { fail++; console.error('FALHA: ' + m); } }

var htmlPath = path.join(__dirname, '..', '..', 'filtra7.html');
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
  'curvas-canvas','dose-svg',
  'in-hctz','in-ctd','in-indap','in-tfg','in-ca','in-alca',
  'out-bloq','out-fracna','out-natr','out-caurin','out-quedaca','out-naserico','out-ftfg',
  'out-efeitos','out-hipercalc','out-riscohipo','out-regime',
  'veredito','instr-pearl','lab-pearl','fig-caso',
  'tutor-q','tutor-opts','tutor-fb','tutor-score','tutor-total','tutor-fig',
  'draw-ncc','draw-ca','draw-diluidor','draw-tfg','draw-dose'
];
ids.forEach(function (id) { ok(doc.getElementById(id) !== null, 'estrutura: #' + id + ' presente'); });

ok(doc.querySelectorAll('#tabs button').length === 6, 'estrutura: 6 abas');
ok(doc.getElementById('curvas-canvas').tagName.toLowerCase() === 'canvas', 'instrumento: canvas curvas-canvas');

// ─── aba CONCEITO: ≥5 SVGs + fórmula dose-resposta + 5%/paradoxo/diluidor ─────
ok(doc.querySelectorAll('#tab-conceito svg').length >= 5,
  'Conceito: ≥5 desenhos esquemáticos (NCC, paradoxo Ca, diluidor, TFG, dose-resposta)');

var conc = doc.getElementById('tab-conceito').textContent;
ok(/efeito\s*=\s*Emax\s*·\s*D\s*\/\s*\(\s*EC50\s*\+\s*D\s*\)/.test(conc),
  'Conceito: fórmula da dose-resposta efeito = Emax·D/(EC50+D) exposta');
ok(/5%/.test(conc) && /Na/.test(conc), 'Conceito: ~5% do Na⁺ pelo NCC');
ok(/NCC/.test(conc), 'Conceito: o NCC do TCD');
ok(/paradoxo/i.test(conc) && /(Ca²⁺|cálcio|calcio)/i.test(conc), 'Conceito: o paradoxo do Ca²⁺');
ok(/diluidor/i.test(conc) && /hiponatremia/i.test(conc), 'Conceito: segmento diluidor e hiponatremia');
ok(/tiazídic|tiazidic/i.test(conc) && /modesto/i.test(conc), 'Conceito: tiazídico diurético modesto');
ok(/TFG\s*<?\s*30|TFG.{0,8}30/i.test(conc), 'Conceito: ineficácia em TFG<30');
ok(/não é tudo igual|nao é tudo igual|não é tudo igual no túbulo/i.test(conc), 'Conceito: "não é tudo igual no túbulo"');

// ─── caso (5 atos, prever-depois-revelar) ────────────────────────────────────
ok(doc.querySelectorAll('button.act[data-rev]').length >= 5, 'caso: ≥5 atos com revelar');
ok(doc.querySelectorAll('#caso .reveal').length >= 5,        'caso: ≥5 blocos reveláveis');
ok(doc.querySelector('#fig-caso svg') !== null,              'Caso: ilustração SVG presente (#fig-caso)');

// ─── trilha socrática (≥9 passos) ────────────────────────────────────────────
ok(doc.querySelectorAll('#trilha details').length >= 9, 'trilha: ≥9 passos socráticos');

// ─── engine ≡ UI: distal inline ≡ model7.js ──────────────────────────────────
ok(typeof win.distal === 'function', 'UI expõe distal()');
var amostras = [
  { },
  { hctz: 50 },
  { ctd: 25 },
  { indap: 2.5 },
  { hctz: 50, caUrinBasal: 400 },
  { hctz: 50, TFG: 25 },
  { hctz: 50, alca: true },
  { TFG: null, hctz: 'x', ctd: undefined, indap: 'y', caUrinBasal: NaN, alca: 'lixo' } // sujeira
];
var divP = 0;
amostras.forEach(function (a) {
  if (JSON.stringify(win.distal(a)) !== JSON.stringify(ref.distal(a))) divP++;
});
ok(divP === 0, 'engine ≡ UI: distal inline idêntica ao model7.js (' + divP + ' divergências)');

// ─── engine ≡ UI: doseResposta, eficaciaTFG, layouts ─────────────────────────
ok(typeof win.doseResposta === 'function', 'UI expõe doseResposta()');
ok(typeof win.eficaciaTFG === 'function', 'UI expõe eficaciaTFG()');
ok(typeof win.duasCurvasLayout === 'function', 'UI expõe duasCurvasLayout()');
ok(typeof win.doseRespostaLayout === 'function', 'UI expõe doseRespostaLayout()');

var divDR = 0, divTFG = 0, divLayC = 0, divLayD = 0;
[[0,25,0.85],[25,25,0.85],[50,25,0.85],[12.5,12.5,0.95],[2.5,1.5,0.9],[1e9,25,0.85]].forEach(function (p) {
  if (Math.abs(win.doseResposta(p[0],p[1],p[2]) - ref.doseResposta(p[0],p[1],p[2])) > 1e-12) divDR++;
});
[10,20,30,45,120,200].forEach(function (t) {
  if (Math.abs(win.eficaciaTFG(t) - ref.eficaciaTFG(t)) > 1e-12) divTFG++;
});
amostras.forEach(function (a) {
  if (JSON.stringify(win.duasCurvasLayout(a, 900, 320)) !== JSON.stringify(ref.duasCurvasLayout(a, 900, 320))) divLayC++;
});
[[25,0.85,100,300,180,25],[12.5,0.95,50,320,180,25]].forEach(function (p) {
  if (JSON.stringify(win.doseRespostaLayout(p[0],p[1],p[2],p[3],p[4],p[5])) !== JSON.stringify(ref.doseRespostaLayout(p[0],p[1],p[2],p[3],p[4],p[5]))) divLayD++;
});
ok(divDR  === 0, 'doseResposta ≡ UI (' + divDR + ' divergências)');
ok(divTFG === 0, 'eficaciaTFG ≡ UI (' + divTFG + ' divergências)');
ok(divLayC === 0, 'duasCurvasLayout ≡ UI (' + divLayC + ' divergências)');
ok(divLayD === 0, 'doseRespostaLayout ≡ UI (' + divLayD + ' divergências)');

// ─── o canvas DESENHOU as DUAS curvas (motor manda no pixel) ──────────────────
var canvasEl = doc.getElementById('curvas-canvas');
var rec = canvasEl.getContext('2d');
ok(rec && Array.isArray(rec.__paths), 'canvas: contexto exercido (gravador ativo)');

// estado inicial dos controles do lab: hctz=25, ctd=0, indap=0, TFG=120, ca=200, sem alça
var initState = { hctz: 25, ctd: 0, indap: 0, TFG: 120, caUrinBasal: 200, alca: false };
var Lref = ref.duasCurvasLayout(initState, canvasEl.width, canvasEl.height);

// acha a subpath cujo primeiro ponto bate com pts[0] e confere ponto-a-ponto (tol 1e-6)
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
var natrPath = achaPolilinha(Lref.natr);
ok(natrPath !== null, 'canvas: polilinha da NATRIURESE pintada == duasCurvasLayout (' + Lref.natr.length + ' pontos)');
var caPath = achaPolilinha(Lref.ca);
ok(caPath !== null, 'canvas: polilinha do Ca URINÁRIO pintada == layout');

// rótulos / legenda do canvas
var allTexts = (rec.__texts || []).join(' ');
ok(allTexts.indexOf('natriurese') >= 0, 'canvas: legenda da natriurese presente');
ok(allTexts.indexOf('Ca urinário') >= 0, 'canvas: legenda do Ca urinário presente');
ok(allTexts.indexOf('hidroclorotiazida') >= 0, 'canvas: rótulo do eixo (dose hidroclorotiazida) presente');
var fills = (rec.__rects || []).filter(function (q) { return q.op === 'fill'; });
ok(fills.length >= 2, 'canvas: marcadores de legenda (2 cores) pintados');

// ─── aba Lab: saídas preenchidas no init ─────────────────────────────────────
ok(doc.getElementById('out-bloq').textContent     !== '—', 'lab: out-bloq preenchido no init');
ok(doc.getElementById('out-natr').textContent     !== '—', 'lab: out-natr preenchido no init');
ok(doc.getElementById('out-caurin').textContent   !== '—', 'lab: out-caurin preenchido no init');
ok(doc.getElementById('out-naserico').textContent !== '—', 'lab: out-naserico preenchido no init');
ok(doc.getElementById('out-efeitos').textContent  !== '—', 'lab: out-efeitos (dose-resposta) preenchido no init');
ok(doc.getElementById('veredito').textContent.length > 1, 'lab: veredito computado (não vazio)');
ok(doc.getElementById('lab-pearl').textContent.length > 1, 'lab: pérola computada (não vazia)');
ok(doc.querySelector('#dose-svg svg') !== null, 'instrumento: figura da dose-resposta (SVG) presente');
ok(doc.querySelectorAll('button.act[data-preset]').length >= 4, 'lab: botões de cenário (presets) presentes');

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
ok(/módulo M7/.test(doc.querySelector('.kicker') ? doc.querySelector('.kicker').textContent : ''), 'cromo: kicker módulo M7');
ok(doc.querySelector('nav.hex .ativo') !== null, 'cromo: hexápode com braço ativo');
ok(/CRM-SP 151\.318 · Dr\. Matheus M\. Coelho · Limeira/.test(body), 'cromo: rodapé de série');
ok(doc.querySelector('a[href="filtra.html"]') !== null, 'cromo: backlink relativo ao índice');
ok(/educacional/i.test(body) && doc.querySelector('.disc') !== null, 'disclaimer educacional presente');
ok(/honestidade do modelo/i.test(body) || /nota de honestidade/i.test(body), 'disclaimer: nota de honestidade do modelo presente');

// ─── conteúdo fisiológico: os mecanismos-chave ────────────────────────────────
ok(/5%/.test(body) && /NCC/.test(body), 'conteúdo: NCC reabsorve ~5% do Na⁺');
ok(/não é tudo igual|nao é tudo igual/i.test(body), 'conteúdo: "não é tudo igual no túbulo"');
ok(/paradoxo/i.test(body) && /(hipocalci|Ca urinário|ca urinario)/i.test(body), 'conteúdo: paradoxo do Ca (hipocalciúria)');
ok(/NCX|Na\/Ca|Na-Ca|troca basolateral/i.test(body), 'conteúdo: NCX basolateral (mecanismo do paradoxo)');
ok(/diluidor/i.test(body) && /hiponatremia/i.test(body), 'conteúdo: segmento diluidor e hiponatremia');
ok(/hipercalcemia/i.test(body), 'conteúdo: hipercalcemia (efeito adverso espelho)');
ok(/sequencial/i.test(body) && /(alça|alca)/i.test(body), 'conteúdo: bloqueio sequencial alça+tiazida');
ok(/modesto|teto/i.test(body), 'conteúdo: diurético modesto / teto baixo');
ok(/litíase|litiase|hipercalciúria|hipercalciuria/i.test(body), 'conteúdo: litíase/hipercalciúria tratada');

// ─── guarda farmacológica INVERTIDA (§8 — o PIVÔ): EXIGIR doses com unidade ───
// cada tiazídico do segmento deve trazer dose+unidade explícita ancorada ao nome.
ok(/hidroclorotiazida[\s\S]{0,40}?\d+\s*[–-]?\s*\d*\s*mg/i.test(body),
  'farmacologia (PIVÔ): hidroclorotiazida com dose em mg ancorada ao nome');
ok(/clortalidona[\s\S]{0,40}?\d+(?:[.,]\d+)?\s*[–-]?\s*\d*(?:[.,]\d+)?\s*mg/i.test(body),
  'farmacologia (PIVÔ): clortalidona com dose em mg');
ok(/indapamida[\s\S]{0,40}?\d+(?:[.,]\d+)?\s*[–-]?\s*\d*(?:[.,]\d+)?\s*mg/i.test(body),
  'farmacologia (PIVÔ): indapamida com dose em mg');
// a dose deve estar ancorada ao MECANISMO do segmento (NCC)
ok(/NCC/.test(body), 'farmacologia (PIVÔ): dose ancorada ao mecanismo (bloqueio do NCC)');
// o disclaimer educacional deve permanecer (a guarda EXIGE dose mas mantém o aviso)
ok(/dispositivo médico|responsabilidade/i.test(body), 'farmacologia (PIVÔ): disclaimer/responsabilidade do prescritor presente');

// a dose-resposta do MOTOR deve casar com um valor RENDERIZADO na UI (efeito = Emax·D/(EC50+D))
// no init o instrumento desenha doseFig({hctz:25}); o ponto renderiza fmt(efeito,2)
var efeitoUI = ref.doseResposta(25, ref.CONST.HCTZ_EC50, ref.CONST.HCTZ_EMAX);
var efeitoStr = (Math.round(efeitoUI * 100) / 100).toFixed(2);   // ex.: "0.43"
var doseSvgTxt = doc.getElementById('draw-dose') ? doc.getElementById('draw-dose').textContent : '';
ok(doseSvgTxt.indexOf(efeitoStr) >= 0,
  'farmacologia (PIVÔ): a dose-resposta do motor (efeito ' + efeitoStr + ') aparece renderizada na UI');
// e o out-efeitos do lab deve casar com o motor (no init hctz=25 → eHctz ≈ 0.43; CTD/IND = 0)
var eHctzInit = ref.distal(initState).eHctz;
var eHctzStr = (Math.round(eHctzInit * 100) / 100).toFixed(2);
ok(new RegExp(eHctzStr + '\\s*·\\s*0\\.00\\s*·\\s*0\\.00').test(doc.getElementById('out-efeitos').textContent),
  'farmacologia (PIVÔ): out-efeitos do lab computa a dose-resposta (init eHctz ' + eHctzStr + ')');

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
