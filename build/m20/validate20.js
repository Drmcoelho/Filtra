'use strict';
/*
 * FILTRA · M20 — validador jsdom (portão do §6)
 * estrutura · engine ≡ UI (circuito, clearanceDialisador, tmpNecessaria, ufDeTMP, clearanceCurveLayout) ·
 * a curva clearance×Qb pintada no canvas ≡ clearanceCurveLayout() · caso ≥8 · trilha ≥13 ·
 * dois bancos (ilustrado SVG/raster + textual) · figura viva ≥8 · cromo · disclaimer.
 * M20 prescreve FLUXOS/pressões (mL/min, mmHg, mL/h) — a guarda PROÍBE doses de MASSA soltas (mg/mcg/µg).
 */
var fs = require('fs');
var path = require('path');
var jsdom = require('jsdom');
var JSDOM = jsdom.JSDOM;

var ref = require('./model20.js');
var imgGuard = require('../lib/img-guard.js');

var oks = 0, fail = 0;
function ok(c, m) { if (c) { oks++; } else { fail++; console.error('FALHA: ' + m); } }

var htmlPath = path.join(__dirname, '..', '..', 'filtra20.html');
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

// estrutura
var ids = [
  'tabs', 'tab-conceito', 'tab-caso', 'tab-trilha', 'tab-instrumento', 'tab-lab', 'tab-avaliacao',
  'clr-canvas', 'in-qb', 'in-qd', 'in-koa', 'in-acesso', 'in-quf', 'in-kuf', 'in-dist',
  'out-qbe', 'out-teto', 'out-kdial', 'out-kef', 'out-recirc', 'out-part', 'out-pven', 'out-tmp', 'out-uf',
  'veredito', 'instr-pearl', 'lab-pearl', 'fig-caso',
  'tutor-q', 'tutor-opts', 'tutor-fb', 'tutor-score', 'tutor-total', 'tutor-fig',
  'draw-circuito', 'draw-acesso', 'draw-clearance', 'draw-tmp'
];
ids.forEach(function (id) { ok(doc.getElementById(id) !== null, 'estrutura: #' + id + ' presente'); });
ok(doc.querySelectorAll('#tabs button').length === 6, 'estrutura: 6 abas');
ok(doc.getElementById('clr-canvas').tagName.toLowerCase() === 'canvas', 'instrumento: canvas clr-canvas');

// Conceito
ok(doc.querySelectorAll('#tab-conceito svg').length >= 3, 'Conceito: ≥3 desenhos computados');
var conc = doc.getElementById('tab-conceito').textContent;
ok(/contracorrente/i.test(conc), 'Conceito: contracorrente');
ok(/Qb_efetivo|Qb efetivo|min\(/i.test(conc), 'Conceito: acesso limita (Qb_efetivo)');
ok(/blood-flow-limited|satura/i.test(conc), 'Conceito: clearance saturante');
ok(/Q_uf\s*=\s*Kuf\s*·\s*TMP|UF\s*=\s*Kuf\s*·\s*TMP|Kuf\s*·\s*TMP/i.test(conc), 'Conceito: fórmula UF = Kuf·TMP');
ok(/clearance|K\s*=\s*Qb/i.test(conc), 'Conceito: fórmula do clearance');
ok(/recircula/i.test(conc), 'Conceito: recirculação');
ok(/homeostas/i.test(conc), 'Conceito: homeostasia como conceito-fio');

// caso ≥8 + trilha ≥13
ok(doc.querySelectorAll('button.act[data-rev]').length >= 8, 'caso: ≥8 atos');
ok(doc.querySelectorAll('#caso .reveal').length >= 8, 'caso: ≥8 reveláveis');
ok(doc.querySelector('#fig-caso svg') !== null, 'Caso: ilustração SVG');
ok(doc.querySelectorAll('#trilha details').length >= 13, 'trilha: ≥13 passos');

// engine ≡ UI
ok(typeof win.circuito === 'function', 'UI expõe circuito()');
ok(typeof win.clearanceDialisador === 'function', 'UI expõe clearanceDialisador()');
ok(typeof win.tmpNecessaria === 'function', 'UI expõe tmpNecessaria()');
ok(typeof win.ufDeTMP === 'function', 'UI expõe ufDeTMP()');
ok(typeof win.clearanceCurveLayout === 'function', 'UI expõe clearanceCurveLayout()');
var amostras = [
  {}, { Qb: 400, acesso: 0.35 }, { Qb: 500, acesso: 0.3 }, { Qd: 800, KoA: 1000 },
  { Quf: 2500, Kuf: 15 }, { distAgulhas: 0.1 }, { Qb: 200, Qd: 300 }, { Qb: null, acesso: 'x', Quf: -5 }
];
var divC = 0;
amostras.forEach(function (a) { if (JSON.stringify(win.circuito(a)) !== JSON.stringify(ref.circuito(a))) divC++; });
ok(divC === 0, 'engine ≡ UI: circuito inline idêntico ao model20.js (' + divC + ' divergências)');
var divK = 0;
[[300, 500, 600], [200, 800, 1000], [420, 500, 600], [350, 350, 700]].forEach(function (t) {
  if (Math.abs(win.clearanceDialisador(t[0], t[1], t[2]) - ref.clearanceDialisador(t[0], t[1], t[2])) > 1e-9) divK++;
});
ok(divK === 0, 'clearanceDialisador ≡ UI (' + divK + ' divergências)');
ok(Math.abs(win.tmpNecessaria(1500, 30) - ref.tmpNecessaria(1500, 30)) < 1e-9, 'tmpNecessaria ≡ UI');
ok(Math.abs(win.ufDeTMP(50, 30) - ref.ufDeTMP(50, 30)) < 1e-9, 'ufDeTMP ≡ UI');
var divL = 0;
amostras.forEach(function (a) { if (JSON.stringify(win.clearanceCurveLayout(a, 900, 360)) !== JSON.stringify(ref.clearanceCurveLayout(a, 900, 360))) divL++; });
ok(divL === 0, 'clearanceCurveLayout ≡ UI (' + divL + ' divergências)');

// canvas curva == clearanceCurveLayout(engine)
var canvasEl = doc.getElementById('clr-canvas');
var rec = canvasEl.getContext('2d');
ok(rec && Array.isArray(rec.__paths), 'canvas: contexto exercido');
var initState = { Qb: 300, Qd: 500, KoA: 600, Kuf: 30, Quf: 800, acesso: 1, distAgulhas: 1 };
var Lref = ref.clearanceCurveLayout(initState, canvasEl.width, canvasEl.height);
var curvePath = null;
(rec.__paths || []).forEach(function (p) { if (p.length === Lref.pts.length && p[0] && Math.abs(p[0].y - Lref.pts[0].y) < 1e-4) curvePath = p; });
ok(curvePath !== null, 'canvas: polilinha da curva pintada (' + Lref.pts.length + ' pontos)');
var pintaOk = true;
if (curvePath) { for (var i = 0; i < Lref.pts.length; i++) { var pp = curvePath[i]; if (Math.abs(pp.x - Lref.pts[i].x) > 1e-6 || Math.abs(pp.y - Lref.pts[i].y) > 1e-6) { pintaOk = false; break; } } }
ok(pintaOk, 'canvas: cada ponto da curva == clearanceCurveLayout(engine) (tol 1e-6)');
ok((rec.__rects || []).filter(function (q) { return q.op === 'fill'; }).length >= 1, 'canvas: marcador pintado');

// Lab init
ok(doc.getElementById('out-kdial').textContent !== '—', 'lab: out-kdial preenchido no init');
ok(doc.getElementById('out-tmp').textContent !== '—', 'lab: out-tmp preenchido no init');
ok(doc.getElementById('out-part').textContent !== '—', 'lab: out-part preenchido no init');
ok(doc.getElementById('veredito').textContent.length > 1, 'lab: veredito computado');
ok(doc.getElementById('lab-pearl').textContent.length > 1, 'lab: pérola computada');
ok(doc.querySelectorAll('.presets button[data-preset]').length >= 4, 'lab: ≥4 presets');

// tutor
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

// cromo
var body = doc.body.textContent;
ok(/FILTRA/.test(doc.querySelector('.kicker') ? doc.querySelector('.kicker').textContent : ''), 'cromo: kicker');
ok(doc.querySelector('nav.hex .ativo') !== null, 'cromo: hexápode ativo');
ok(/CRM-SP 151\.318 · Dr\. Matheus M\. Coelho · Limeira/.test(body), 'cromo: rodapé');
ok(doc.querySelector('a[href="dialisa.html"]') !== null || doc.querySelector('a[href="filtra.html"]') !== null, 'cromo: backlink');
ok(/educacional/i.test(body) && doc.querySelector('.disc') !== null, 'disclaimer educacional');

// guarda prescritiva invertida — diálise prescreve FLUXOS/pressões, NÃO doses de massa.
// mL/min, mmHg, mL/h são livres; mg/mcg/µg SOLTOS (não seguidos de /) são proibidos.
ok(!/\b\d+\s?(mg|mcg|µg)\b(?!\/)/.test(body), 'guarda: sem doses de MASSA soltas (mg/mcg/µg) — diálise prescreve fluxos/pressões');
ok(/mL\/min|mmHg|mL\/h/.test(body), 'guarda: prescrição em fluxos/pressões (mL/min · mmHg · mL/h)');

// offline + figura viva
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
