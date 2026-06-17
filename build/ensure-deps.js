'use strict';
/*
 * FILTRA — guarda de dependências de validação.
 * O produto publicado é offline e sem dependências de runtime; o `jsdom` existe
 * SÓ para o portão de validação (validateN.js). Num clone fresco, sem
 * `npm install`, o validador explodiria num stack trace feio de MODULE_NOT_FOUND.
 * Este guarda roda como `prevalidate` e troca isso por uma linha clara e acionável.
 * 0 falhas ou não entra — mas a falha tem que ensinar o próximo passo.
 */
try {
  require.resolve('jsdom');
} catch (e) {
  console.error(
    '\n[FILTRA] O validador precisa do "jsdom" (dependência só de validação).\n' +
    '         Rode  npm install  antes de  npm run check.\n' +
    '         (o produto publicado segue offline e sem dependências de runtime.)\n'
  );
  process.exit(1);
}
