'use strict';
/*
 * FILTRA · M0 — validador jsdom (portão do §6)
 * Confere: estrutura (IDs/abas) · engine ≡ UI · camada interativa · banco do
 * tutor · cromo (kicker/rodapé/backlink/hexápode) · disclaimer educacional.
 * (M0 não tem fármacos; a guarda farmacológica invertida do §8 vale a partir
 *  dos módulos do túbulo — aqui só exigimos o disclaimer educacional.)
 */

var fs = require('fs');
var path = require('path');
var jsdom = require('jsdom');
var JSDOM = jsdom.JSDOM;

var ref = require('./model0.js'); // engine canônico (Node) p/ comparar com a UI

var oks = 0, fail = 0;
function ok(c, m) { if (c) { oks++; } else { fail++; console.error('FALHA: ' + m); } }

var htmlPath = path.join(__dirname, '..', '..', 'filtra0.html');
var html = fs.readFileSync(htmlPath, 'utf8');

// canvas não tem backend no jsdom; o desenho é puramente visual (a física vive no engine).
// Omitimos os avisos "Not implemented" de jsdom — o try/catch do drawDY já os neutraliza.
var vc = new jsdom.VirtualConsole();
vc.sendTo(console, { omitJSDOMErrors: true });

var dom = new JSDOM(html, { runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, virtualConsole: vc });
var win = dom.window, doc = win.document;

// ----- estrutura: abas e IDs essenciais -----
var ids = ['tabs','tab-caso','tab-trilha','tab-instrumento','tab-lab','tab-avaliacao',
  'dy-canvas','in-peso','in-na','in-ureia','in-tipo','in-vol','in-soluto',
  'out-tbw','out-icf','out-ecf','out-tonic','out-osm','out-na','veredito',
  'tutor-q','tutor-opts','tutor-fb','tutor-score'];
ids.forEach(function (id) { ok(doc.getElementById(id) !== null, 'estrutura: #' + id + ' presente'); });

ok(doc.querySelectorAll('#tabs button').length === 5, 'estrutura: 5 abas');
ok(doc.getElementById('dy-canvas').tagName.toLowerCase() === 'canvas', 'instrumento: canvas vivo');

// ----- caso (5 atos, prever-depois-revelar) -----
ok(doc.querySelectorAll('button.act[data-rev]').length >= 5, 'caso: ≥5 atos com revelar');
ok(doc.querySelectorAll('#caso .reveal').length >= 5, 'caso: ≥5 blocos reveláveis');

// ----- trilha socrática (≥9 passos) -----
ok(doc.querySelectorAll('#trilha details').length >= 9, 'trilha: ≥9 passos socráticos');

// ----- engine ≡ UI (o motor manda no pixel) -----
ok(typeof win.compartimentos === 'function', 'UI expõe compartimentos()');
var amostras = [
  { pesoKg: 70, na0: 140, tipo: 'agua_livre', volumeL: 3 },
  { pesoKg: 80, sexo: 'M', na0: 150, tipo: 'hipertonico_ganho', volumeL: 2 },
  { pesoKg: 60, sexo: 'F', na0: 130, tipo: 'ureia', solutoMmol: 700 },
  { pesoKg: 90, na0: 145, glu0: 0, tipo: 'glicose', solutoMmol: 500 },
  { pesoKg: 55, na0: 138, tipo: 'isotonico_ganho', volumeL: 2.5 },
  { tipo: 'manobra_que_nao_existe', volumeL: 'x' }
];
var divergiu = 0;
amostras.forEach(function (a) {
  var u = win.compartimentos(a), n = ref.compartimentos(a);
  if (JSON.stringify(u) !== JSON.stringify(n)) { divergiu++; }
});
ok(divergiu === 0, 'engine ≡ UI: inline idêntico ao model0.js (' + divergiu + ' divergências)');

// ----- tutor: banco ≥16, bem-formado, com explicação -----
var T = win.TUTOR;
ok(Array.isArray(T) && T.length >= 16, 'tutor: banco ≥16 (tem ' + (T ? T.length : 0) + ')');
var mal = 0;
(T || []).forEach(function (it) {
  if (!it || !Array.isArray(it.o) || it.o.length < 2) mal++;
  else if (typeof it.c !== 'number' || it.c < 0 || it.c >= it.o.length) mal++;
  else if (!it.e || String(it.e).length < 3) mal++;
});
ok(mal === 0, 'tutor: itens bem-formados (opções/correta/explicação) — ' + mal + ' inválidos');

// ----- lab/veredito existe e reage -----
ok(doc.getElementById('veredito').textContent.length > 1, 'lab: veredito computado (não vazio)');

// ----- cromo: kicker, hexápode, rodapé, backlink, disclaimer -----
var body = doc.body.textContent;
ok(/FILTRA/.test(doc.querySelector('.kicker') ? doc.querySelector('.kicker').textContent : ''), 'cromo: kicker FILTRA');
ok(doc.querySelector('nav.hex .ativo') !== null, 'cromo: hexápode com braço ativo');
ok(/CRM-SP 151\.318 · Dr\. Matheus M\. Coelho · Limeira/.test(body), 'cromo: rodapé de série');
var back = doc.querySelector('a[href="filtra.html"]');
ok(back !== null, 'cromo: backlink relativo ao índice');
ok(/educacional/i.test(body) && doc.querySelector('.disc') !== null, 'disclaimer educacional presente');

// ----- guarda SaMD invertida (§8): M0 não promete fármaco; não pode haver dose solta -----
ok(!/\b\d+\s?(mg|mcg|µg)\b/.test(body), 'M0 sem doses (a farmacologia entra no túbulo)');

console.log(oks + ' OK · ' + fail + ' falhas');
process.exit(fail > 0 ? 1 : 0);
