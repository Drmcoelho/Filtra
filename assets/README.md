# assets/

Fotos e figuras **raster** open source (histologia, micrografias, fotos reais) vivem aqui — a parte
"capricho visual" que não é vetorial. Convenção do braço (decisão do autor, 2026-06):

- **Offline sempre.** Nada de URL remota. Os módulos referenciam por caminho relativo: `assets/arquivo.webp`.
  Nunca `http(s)://…` num `<img>` (o validador recusa).
- **SVG continua inline.** Desenhos esquemáticos e figuras computadas do engine ficam embutidos no próprio
  `filtraN.html` (single-file de fato). Só o raster mora aqui.
- **Crédito não é exigido (decisão do autor, 2026-06).** O validador **não** cobra `CREDITS.md`; ele só garante
  o *offline* (nenhum `<img>` remoto). `../CREDITS.md` é um **livro-razão opcional**, a cargo da curadoria.
- **Licença preferida:** CC0 / domínio público / **obra própria** (sem qualquer obrigação de atribuição). CC-BY/
  CC-BY-SA são aceitos, mas aí a atribuição é exigência **da licença** (não do projeto). Evitar NC/ND.
- **Otimize:** prefira `.webp`/`.svg`; comprima; mantenha o repositório leve.

## Estrutura
- `m0/ … m39/` — uma pasta por módulo. As imagens vão em `assets/mN/<slug>.webp`.
- `manifest.json` — a **lista de imagens desejadas por módulo** (slug · descrição · tipo). Legível por
  máquina; usada pelo curador e pela integração posterior.
- `OnDemand.md` — o **backlog vivo de imagens adicionais** (mais diversas/profundas) que um agente descobre
  serem necessárias enquanto constrói/revisa um módulo. Ciclo `PEDIDO → OBTIDO → INTEGRADO`.
- `INSTRUCOES.md` — o **documento-mestre** para o LLM com internet curar/baixar/creditar tudo de uma vez.
- `../CREDITS.md` — atribuição (fonte · autor · licença) de cada arquivo.

> Esta sessão de build roda **sem internet** (rede bloqueada), então os arquivos open source são adicionados
> numa sessão com rede (ver `INSTRUCOES.md`) ou fornecidos pelo autor. O pipeline já está pronto: depois que
> as imagens chegarem nas pastas, a integração ao HTML e a publicação no Pages são feitas "conforme encaixe".
