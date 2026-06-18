'use strict';
/*
 * FILTRA — guarda offline de imagens (compartilhada por todos os validadores).
 * O produto é OFFLINE: todo raster mora em assets/mN/<slug>.webp e é referenciado
 * por CAMINHO RELATIVO. Nenhum <img> pode apontar para URL remota (hotlink), senão
 * o módulo quebra sem internet.
 *
 * Decisão do autor (2026-06): SEM exigência de crédito — o crédito (CREDITS.md) é
 * opcional e fica a cargo da curadoria; o validador NÃO o exige. Esta guarda cuida
 * apenas da garantia offline.
 *
 * remoteImgs(doc) → array dos src remotos encontrados (vazio = tudo local/ok).
 *   Sinaliza: protocolo-relativo (//host/…) e qualquer esquema (http://, https://,
 *   ftp://, etc.). Caminhos relativos (assets/m1/x.webp) e data: URIs passam.
 */
function remoteImgs(doc) {
  var out = [];
  if (!doc || typeof doc.querySelectorAll !== 'function') return out;
  var imgs = doc.querySelectorAll('img');
  for (var i = 0; i < imgs.length; i++) {
    var s = (imgs[i].getAttribute('src') || '').trim();
    if (/^\/\//.test(s) || /^[a-z][a-z0-9+.-]*:\/\//i.test(s)) out.push(s);
  }
  return out;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { remoteImgs: remoteImgs };
}
