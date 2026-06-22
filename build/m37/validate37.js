'use strict';
/*
 * FILTRA · M37 — validador jsdom (portão do §6) — Síndrome cardiorrenal e a UF
 * estrutura · engine ≡ UI (cardiorrenal, congestaoLayout, perfusaoRenal, tfgDePerfusao,
 * respostaDiuretico, ultrafiltracaoMecanica) · a curva pintada no canvas ≡ congestaoLayout()
 * (tol 1e-6) · caso ≥5 atos · trilha ≥9 · dois bancos (ilustrado SVG/raster + textual) ·
 * figura viva ≥8 · cromo · disclaimer.
 * ROBUSTEZ EXTRA: recomputa ≥260 entradas MALIGNAS e confirma engine≡UI finito em todas.
 * Guarda farmacológica §8 (invertida): módulo DIALISA — sem dose de massa SOLTA (mg/mcg/µg);
 * mEq/L, mL/h, L/min, mmHg, mL/min são livres; doses de diurético em mg/h ou mg·dia⁻¹ (com "/").
 */
var fs = require('fs');
var path = require('path');
var jsdom = require('jsdom');
var JSDOM = jsdom.JSDOM;

var ref = require('./model37.js');
var imgGuard = require('../lib/img-guard.js');

var oks = 0, fail = 0;
function ok(c, m) { if (c) { oks++; } else { fail++; console.error('FALHA: ' + m); } }
function fin(x) { return typeof x === 'number' && isFinite(x); }

var htmlPath = path.join(__dirname, '..', '..', 'filtra37.html');
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

// ---------- estrutura ----------
var ids = [
  'tabs', 'tab-conceito', 'tab-caso', 'tab-trilha', 'tab-instrumento', 'tab-lab', 'tab-avaliacao',
  'cardiorrenal-canvas',
  'in-dc', 'in-pvc', 'in-pam', 'in-doseDiuretico', 'in-resistencia', 'in-volume', 'in-refilling', 'in-ufRate',
  'out-perf', 'out-tfg', 'out-causa', 'out-natriurese', 'out-conduta', 'out-descong',
  'veredito', 'instr-pearl', 'lab-pearl', 'fig-caso',
  'tutor-q', 'tutor-opts', 'tutor-fb', 'tutor-score', 'tutor-total', 'tutor-fig',
  'draw-eixo', 'draw-congestao', 'draw-curva', 'draw-alvo'
];
ids.forEach(function (id) { ok(doc.getElementById(id) !== null, 'estrutura: #' + id + ' presente'); });
ok(doc.querySelectorAll('#tabs button').length === 6, 'estrutura: 6 abas');
ok(doc.getElementById('cardiorrenal-canvas').tagName.toLowerCase() === 'canvas', 'instrumento: canvas cardiorrenal-canvas');

// ---------- Conceito ----------
ok(doc.querySelectorAll('#tab-conceito svg').length >= 5, 'Conceito: ≥5 desenhos computados');
var conc = doc.getElementById('tab-conceito').textContent;
ok(/cardiorrenal/i.test(conc), 'Conceito: síndrome cardiorrenal');
ok(/congest/i.test(conc), 'Conceito: congestão venosa');
ok(/PAM\s*[−-]\s*PVC/.test(conc) || /PAM − PVC/.test(conc), 'Conceito: perfusão ≈ PAM − PVC');
ok(/resist/i.test(conc), 'Conceito: resistência ao diurético');
ok(/ultrafiltra/i.test(conc) || /\bUF\b/.test(conc), 'Conceito: ultrafiltração mecânica');
ok(/refilling/i.test(conc), 'Conceito: UF × refilling');
ok(/descongest/i.test(conc), 'Conceito: descongestão como alvo');
ok(/PAM\s*=\s*DC\s*×\s*RVS/i.test(doc.body.textContent) || /Choca/i.test(doc.body.textContent), 'Conceito: ponte com Choca (PAM = DC × RVS)');
ok(/homeostas/i.test(doc.body.textContent), 'Conceito: homeostasia como conceito-fio');

// ---------- caso ≥5 + trilha ≥9 ----------
ok(doc.querySelectorAll('button.act[data-rev]').length >= 5, 'caso: ≥5 atos');
ok(doc.querySelectorAll('#caso .reveal').length >= 5, 'caso: ≥5 reveláveis');
ok(doc.querySelector('#fig-caso svg') !== null, 'Caso: ilustração SVG');
ok(doc.querySelectorAll('#trilha details').length >= 9, 'trilha: ≥9 passos');

// ---------- engine ≡ UI ----------
ok(typeof win.cardiorrenal === 'function', 'UI expõe cardiorrenal()');
ok(typeof win.congestaoLayout === 'function', 'UI expõe congestaoLayout()');
ok(typeof win.perfusaoRenal === 'function' && typeof win.tfgDePerfusao === 'function', 'UI expõe perfusaoRenal()/tfgDePerfusao()');
ok(typeof win.respostaDiuretico === 'function' && typeof win.ultrafiltracaoMecanica === 'function', 'UI expõe respostaDiuretico()/ultrafiltracaoMecanica()');
var amostras = [
  {}, { dc: 4.2, pvc: 20, pam: 80, doseDiuretico: 1.5, resistencia: 0.3, volume: 8 },
  { dc: 2.5, pvc: 6, pam: 58 }, { dc: 4, pvc: 16, pam: 75, doseDiuretico: 3, resistencia: 0.65, volume: 9 },
  { resistencia: 0.85, dc: 3.8, pvc: 18, doseDiuretico: 3.5, volume: 11, ufRate: 300, refilling: 350 },
  { pvc: 24, dc: 5, pam: 80 }, { dc: 5.5, pvc: 5, pam: 85, doseDiuretico: 1, resistencia: 0.1 },
  { dc: null, pvc: 'x', pam: -2, doseDiuretico: 1e9, resistencia: NaN, volume: -5, refilling: Infinity, ufRate: 1e300 }
];
var divC = 0;
amostras.forEach(function (a) { if (JSON.stringify(win.cardiorrenal(a)) !== JSON.stringify(ref.cardiorrenal(a))) divC++; });
ok(divC === 0, 'engine ≡ UI: cardiorrenal inline idêntico ao model37.js (' + divC + ' divergências)');
var divP = 0;
[[5, 6, 80], [4.2, 20, 80], [2.5, 6, 58], [3, 24, 65]].forEach(function (t) { if (JSON.stringify(win.perfusaoRenal({ dc: t[0], pvc: t[1], pam: t[2] })) !== JSON.stringify(ref.perfusaoRenal({ dc: t[0], pvc: t[1], pam: t[2] }))) divP++; });
ok(divP === 0, 'perfusaoRenal ≡ UI (' + divP + ' divergências)');
var divD = 0;
[[2, 75, 0.3], [1, 60, 0.8], [4, 75, 0.4], [0.5, 40, 0]].forEach(function (t) { if (JSON.stringify(win.respostaDiuretico({ doseDiuretico: t[0], perfusao: t[1], resistencia: t[2] })) !== JSON.stringify(ref.respostaDiuretico({ doseDiuretico: t[0], perfusao: t[1], resistencia: t[2] }))) divD++; });
ok(divD === 0, 'respostaDiuretico ≡ UI (' + divD + ' divergências)');
var divL = 0;
amostras.forEach(function (a) {
  if (JSON.stringify(win.congestaoLayout(a, 900, 360)) !== JSON.stringify(ref.congestaoLayout(a, 900, 360))) divL++;
  var ad = {}; for (var k in a) ad[k] = a[k]; ad.modo = 'diuretico';
  if (JSON.stringify(win.congestaoLayout(ad, 900, 360)) !== JSON.stringify(ref.congestaoLayout(ad, 900, 360))) divL++;
});
ok(divL === 0, 'congestaoLayout ≡ UI (ambos os modos) (' + divL + ' divergências)');

// ---------- ROBUSTEZ EXTRA: ≥260 entradas malignas → engine≡UI finito em TODAS ----------
(function () {
  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  var rnd = mulberry32(0x37C0DE), N = 280, div = 0, naoFin = 0;
  var MAL = [NaN, Infinity, -Infinity, 1e300, -1e300, '5', 'x', '', null, undefined, {}, [], true];
  function v() { if (rnd() < 0.55) return MAL[(rnd() * MAL.length) | 0]; return (rnd() - 0.25) * 600; }
  for (var i = 0; i < N; i++) {
    var inp = { dc: v(), pvc: v(), pam: v(), doseDiuretico: v(), resistencia: v(), volume: v(), refilling: v(), ufRate: v() };
    var a = win.cardiorrenal(inp), b = ref.cardiorrenal(inp);
    if (JSON.stringify(a) !== JSON.stringify(b)) div++;
    if (!fin(a.perfEfetiva) || !fin(a.tfg) || !fin(a.natriurese) || !fin(a.ufEfetiva) || !fin(a.tfgPos) || !fin(a.ganhoTFG) || !fin(a.volResidual)) naoFin++;
    if (['diuretico', 'UF'].indexOf(a.conduta) < 0) naoFin++;
    if (i % 2 === 0) inp.modo = 'diuretico';
    var L = win.congestaoLayout(inp, 900, 360);
    if (!fin(L.current.x) || !fin(L.current.y)) naoFin++;
  }
  ok(div === 0, 'robustez extra: ' + N + ' malignas engine≡UI (' + div + ' divergências)');
  ok(naoFin === 0, 'robustez extra: ' + N + ' malignas → saídas finitas/classificadas (' + naoFin + ' inválidas)');
})();

// ---------- canvas curva == congestaoLayout(engine) — estado inicial dos sliders, modo congestão ----------
function slv(id) { return +doc.getElementById(id).value; }
var initState = {
  dc: slv('in-dc'), pvc: slv('in-pvc'), pam: slv('in-pam'), doseDiuretico: slv('in-doseDiuretico'),
  resistencia: slv('in-resistencia'), volume: slv('in-volume'), refilling: slv('in-refilling'), ufRate: slv('in-ufRate'),
  modo: 'congestao'
};
var canvasEl = doc.getElementById('cardiorrenal-canvas');
var rec = canvasEl.getContext('2d');
ok(rec && Array.isArray(rec.__paths), 'canvas: contexto exercido');
var Lref = ref.congestaoLayout(initState, canvasEl.width, canvasEl.height);
function acharPoli(ref0) {
  var found = null;
  (rec.__paths || []).forEach(function (p) {
    if (p.length === ref0.length && p[0] && Math.abs(p[0].y - ref0[0].y) < 1e-4 && Math.abs(p[0].x - ref0[0].x) < 1e-4) found = p;
  });
  return found;
}
var curvaPath = acharPoli(Lref.pts);
ok(curvaPath !== null, 'canvas: polilinha TFG×PVC pintada (' + Lref.pts.length + ' pontos)');
var pintaOk = true;
if (curvaPath) { for (var i = 0; i < Lref.pts.length; i++) { var pp = curvaPath[i]; if (Math.abs(pp.x - Lref.pts[i].x) > 1e-6 || Math.abs(pp.y - Lref.pts[i].y) > 1e-6) { pintaOk = false; break; } } }
ok(pintaOk, 'canvas: cada ponto da curva == congestaoLayout(engine) (tol 1e-6)');
ok((rec.__rects || []).filter(function (q) { return q.op === 'fill'; }).length >= 1, 'canvas: marcador de operação pintado');

// ---------- Lab init ----------
ok(doc.getElementById('out-perf').textContent !== '—' && doc.getElementById('out-perf').textContent.length > 1, 'lab: out-perf preenchido no init');
ok(doc.getElementById('out-tfg').textContent.length > 1, 'lab: out-tfg preenchido no init');
ok(doc.getElementById('out-conduta').textContent.length > 1, 'lab: out-conduta preenchido no init');
ok(doc.getElementById('veredito').textContent.length > 1, 'lab: veredito computado');
ok(doc.getElementById('lab-pearl').textContent.length > 1, 'lab: pérola computada');
ok(doc.querySelectorAll('.presets button[data-preset]').length >= 4, 'lab: ≥4 presets');

// ---------- tutor ----------
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

// ---------- cromo ----------
var body = doc.body.textContent;
ok(/FILTRA/.test(doc.querySelector('.kicker') ? doc.querySelector('.kicker').textContent : ''), 'cromo: kicker');
ok(/M37/.test(doc.querySelector('.kicker') ? doc.querySelector('.kicker').textContent : ''), 'cromo: kicker M37');
ok(doc.querySelector('nav.hex .ativo') !== null, 'cromo: hexápode ativo');
ok(/FILTRA/.test(doc.querySelector('nav.hex .ativo') ? doc.querySelector('nav.hex .ativo').textContent : ''), 'cromo: FILTRA ativo');
ok(/CRM-SP 151\.318 · Dr\. Matheus M\. Coelho · Limeira/.test(body), 'cromo: rodapé');
ok(doc.querySelector('a[href="dialisa.html"]') !== null || doc.querySelector('a[href="filtra.html"]') !== null, 'cromo: backlink');
ok(/educacional/i.test(body) && doc.querySelector('.disc') !== null, 'disclaimer educacional');

// ---------- guarda farmacológica invertida §8 ----------
ok(!/\b\d+\s?(mg|mcg|µg)\b(?!\/)/.test(body), 'guarda §8: nenhuma dose de massa solta (mg/mcg/µg)');
ok(/mEq\/L/.test(body) || /mmHg/.test(body), 'guarda §8: unidades do meio interno/hemodinâmica presentes');
ok(/mL\/h/.test(body) && /mL\/min/.test(body), 'guarda §8: doses/fluxos por mecanismo (mL/h, mL/min)');

// ---------- offline + figura viva ----------
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
