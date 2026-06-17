# INSTRUÇÕES — curar imagens open source para TODOS os módulos do FILTRA · DIALISA

Para um LLM **com acesso à internet e a ferramentas** (navegação, download, git). Outra IA construiu o
projeto e deixou este pipeline pronto. Sua missão: **baixar, otimizar, creditar e depositar** imagens raster
open source nas pastas certas, para TODOS os módulos. Quem integra ao HTML e publica no Pages é a outra IA —
você só entrega os arquivos na pasta e o crédito.

## O que entregar
1. Para **cada item** de `assets/manifest.json`, baixe 1 imagem boa e salve em
   `assets/<dir>/<slug>.webp` (ex.: `assets/m0/membrana-na-k-atpase.webp`). Prefira `.webp`; `.svg` quando
   a fonte for vetorial; `.png/.jpg` só se necessário.
2. Para **cada arquivo**, acrescente UMA linha em `/CREDITS.md` (tabela): arquivo, descrição, URL da fonte,
   autor, licença (com versão).
3. Não precisa tocar nos `filtraN.html` — a integração e a renderização no Pages são feitas depois, "conforme
   encaixe". Apenas deixe os arquivos e os créditos prontos.

## Regras inegociáveis
- **OFFLINE / local:** só arquivos na pasta. Nada de hotlink/URL remota — o produto roda sem internet.
- **Licença:** apenas **CC0 / Domínio Público / CC BY / CC BY-SA**. PROIBIDO NC, ND, "todos os direitos
  reservados" ou licença não verificável. **Confirme a licença na página da fonte de CADA arquivo** (variam
  no mesmo site). Para CC BY-SA, registre que derivados herdam a licença.
- **Crédito sempre:** sem linha no `CREDITS.md`, a imagem não vale.
- **Otimize:** largura máx ~1200 px, compressão razoável, repo leve. Remova metadados desnecessários.
- **Conteúdo:** legendas/alt em **português do Brasil** (a integração usa isso depois).
- **Precisão clínica:** prefira figuras corretas e rotuladas; descarte imagens enganosas. Se um item não
  tiver licença aceitável, deixe um arquivo `assets/<dir>/<slug>.MISSING.txt` explicando o porquê e siga.

## Fontes recomendadas (priorize PD/CC0)
- **Wikimedia Commons** / Wikipedia (filtre por licença).
- **NIH/NLM:** NCI Visuals Online, PHIL (Public Health Image Library), **PMC Open Access** (figuras CC de
  artigos), NIDDK image library.
- **Servier Medical Art / SMART** (CC BY) — excelente para anatomia/esquemas; **BodyParts3D/Anatomography**
  (CC BY-SA).
- Histologia/micrografia aberta no Commons (busque "kidney histology", "podocyte TEM" etc.).

## A lista por módulo
Está em `assets/manifest.json` (campo `modulos[].imagens[]`: `slug`, `descricao`, `tipo`). São M0–M39
(metade FILTRA M0–M18, metade DIALISA M19–M38, exame M39). Cubra o máximo possível; o M0 é prioridade
(módulo já publicado).

## Fluxo git
1. Crie um branch a partir de `claude/review-claude-md-tcte19` (ex.: `assets/open-source-fotos`).
2. Commit dos arquivos em `assets/mN/` + `CREDITS.md` preenchido.
3. Abra um **Pull Request** listando, por imagem, a fonte e a licença. **Não faça merge** — a revisão e a
   integração ao HTML são feitas pela outra IA.
   - Se você não tiver permissão de git, devolva um `.zip`/lista dos arquivos + as linhas do `CREDITS.md`.

## Definição de pronto
- Cada `slug` do manifesto tem um arquivo em `assets/<dir>/` **ou** um `.MISSING.txt` justificado.
- Todo arquivo de imagem tem licença aceitável e linha no `CREDITS.md`.
- Nenhuma URL remota; tudo local e otimizado. O repositório continua funcionando offline.
