# assets/

Fotos e figuras **raster** open source (histologia, micrografias, fotos reais) vivem aqui — a parte
"capricho visual" que não é vetorial. Convenção do braço (decisão do autor, 2026-06):

- **Offline sempre.** Nada de URL remota. Os módulos referenciam por caminho relativo: `assets/arquivo.webp`.
  Nunca `http(s)://…` num `<img>` (o validador recusa).
- **SVG continua inline.** Desenhos esquemáticos e figuras computadas do engine ficam embutidos no próprio
  `filtraN.html` (single-file de fato). Só o raster mora aqui.
- **Toda imagem precisa de crédito.** Cada arquivo desta pasta tem uma linha em `../CREDITS.md` com fonte,
  autor e licença. Sem crédito, não entra.
- **Licença preferida:** CC0 / domínio público (sem obrigação de atribuição) — mas atribuímos mesmo assim.
  CC-BY é aceito desde que o crédito esteja em `CREDITS.md`. Evitar NC/ND que conflitem com o uso.
- **Otimize:** prefira `.webp`/`.svg`; comprima; mantenha o repositório leve.

## Estrutura
- `m0/ … m39/` — uma pasta por módulo. As imagens vão em `assets/mN/<slug>.webp`.
- `manifest.json` — a **lista de imagens desejadas por módulo** (slug · descrição · tipo). Legível por
  máquina; usada pelo curador e pela integração posterior.
- `INSTRUCOES.md` — o **documento-mestre** para o LLM com internet curar/baixar/creditar tudo de uma vez.
- `../CREDITS.md` — atribuição (fonte · autor · licença) de cada arquivo.

> Esta sessão de build roda **sem internet** (rede bloqueada), então os arquivos open source são adicionados
> numa sessão com rede (ver `INSTRUCOES.md`) ou fornecidos pelo autor. O pipeline já está pronto: depois que
> as imagens chegarem nas pastas, a integração ao HTML e a publicação no Pages são feitas "conforme encaixe".
