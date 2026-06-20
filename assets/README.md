# assets/ — imagens raster open source (guia único)

> **Documento único da pasta `assets/`** (funde os antigos `README.md` + `INSTRUCOES.md` + `OnDemand.md`,
> consolidação 2026-06). Cobre: (1) o que mora aqui e as regras, (2) a estrutura, (3) o **pipeline de
> curadoria** para um LLM com internet, (4) o **backlog sob demanda** de imagens adicionais. A autoridade
> sobre o padrão visual é o `CLAUDE.md §6–§7` ("figura viva"); este arquivo é o operacional dos arquivos.

Fotos e figuras **raster** open source (histologia, micrografias, fotos reais, exames de imagem) vivem aqui —
a parte "capricho visual" que não é vetorial. Os **SVG esquemáticos/computados ficam inline** no próprio
`filtraN.html` (single-file de fato); só o raster mora nesta pasta.

## 1. Regras (decisão do autor, 2026-06)

- **Offline sempre.** Nada de URL remota. Os módulos referenciam por caminho relativo: `assets/mN/<slug>.<ext>`.
  Nunca `http(s)://…` num `<img>` — a guarda `build/lib/img-guard.js` recusa e o `npm run check` falha.
- **SVG inline × raster aqui.** O conceito é numérico/computável (gráfico, diagrama do engine)? → **SVG inline**.
  É uma foto do mundo real (lâmina, micrografia, TC/RM, equipamento)? → **raster** nesta pasta.
- **Crédito é OPCIONAL** (alinhado ao `CLAUDE.md §6`): `CREDITS.md` fica a cargo da curadoria; o validador
  **não** o exige — só garante o offline. Quando creditar, use **uma linha por arquivo** em `../CREDITS.md`
  (arquivo · descrição · fonte · autor · licença).
- **Licença:** apenas **CC0 / Domínio Público / CC BY / CC BY-SA**. Evite **NC/ND** e "todos os direitos
  reservados". Para CC BY-SA, lembre que derivados herdam a licença. Confirme a licença na página de CADA
  arquivo (variam no mesmo site).
- **Formato:** **SVG** se a fonte for vetorial; **WebP** para raster (foto/histologia/micrografia/RM); **PNG**
  só como fallback (transparência lossless); evite **JPG** salvo se a fonte só existir assim.
- **Otimize:** largura máx ~1200 px, compressão razoável, sem metadados desnecessários; repositório leve.
- **Idioma:** descrições/alt/legendas em **português do Brasil** (a integração usa isso depois).

## 2. Estrutura

- `m0/ … m39/` — uma pasta por módulo. As imagens vão em `assets/mN/<slug>.<ext>`.
- `manifest.json` — a **lista de imagens desejadas por módulo** (slug · descrição · tipo), legível por máquina.
  São M0–M39, **≥8 imagens por módulo (320 no total)**. **Estado atual: 25 de 320 baixadas** — a maioria dos
  módulos ainda depende de uma sessão com rede (ver §3).
- `../CREDITS.md` — atribuição (opcional) de cada arquivo.

## 3. Pipeline de curadoria (para um LLM COM internet)

A sessão de build roda **sem internet**. Quem tiver navegação/download/git executa este pipeline e entrega só
os arquivos (a integração ao HTML e a publicação são feitas depois, "conforme encaixe").

**O que entregar**
1. Para **cada item** de `manifest.json`, baixe 1 imagem boa e salve em `assets/<dir>/<slug>.<ext>` (formato
   conforme §1). Cubra o máximo possível; **M0 é prioridade** (já publicado). Imagens boas além das listadas
   são bem-vindas (mesmo padrão de nome).
2. Se quiser creditar, acrescente uma linha em `../CREDITS.md`.
3. Não precisa tocar nos `filtraN.html`.

**Fontes recomendadas** (priorize PD/CC0): Wikimedia Commons / Wikipedia (filtre por licença); NIH/NLM (NCI
Visuals Online, PHIL, **PMC Open Access**, NIDDK); **Servier Medical Art / SMART** (CC BY) e
**BodyParts3D/Anatomography** (CC BY-SA) para anatomia/esquemas; histologia/micrografia aberta no Commons.

**Fluxo git:** branch a partir de `claude/review-claude-md-tcte19` (ex.: `assets/open-source-fotos`); commit
dos arquivos em `assets/mN/`; abra um PR listando fonte/licença por imagem; **não faça merge** (a integração é
da outra IA). Sem permissão de git, devolva um `.zip`/lista dos arquivos.

**Pronto quando:** cada `slug` tem um arquivo em `assets/<dir>/` (ou um `.MISSING.txt` justificado); nenhuma
URL remota; tudo local e otimizado; o repositório continua offline.

## 4. Backlog sob demanda (imagens ADICIONAIS)

A `manifest.json` lista as 8 imagens-base de cada módulo (o mínimo). Esta seção é o **backlog vivo** de imagens
**adicionais** — mais diversas/profundas — que um agente descobre serem necessárias ao construir/revisar um
módulo (padrão "figura viva", `CLAUDE.md §6`): quando "uma imagem mais específica elevaria a aula de *bom* para
*excelente*", **não invente nem deixe passar** — registre aqui.

**Ciclo de vida:** `PEDIDO` → `OBTIDO` → `INTEGRADO` (ou `RECUSADO` com motivo). Quem constrói (sem internet)
abre o `PEDIDO`; quem cura (com internet, §3) baixa e marca `OBTIDO`; quem integra (sem internet) insere inline
como `<figure class="fviva">` com legenda que ensina + `Fig. N`, roda `npm run check` e marca `INTEGRADO`.

**Template:** `| <slug>.<ext> | <tipo> | o que mostra · por que (batida do Conceito) | licença/fonte provável | PEDIDO |`

### ⚠️ Estado da curadoria — bloqueio de rede (2026-06)

Numa sessão de agente, **o egresso de rede bloqueia o Wikimedia**: `commons.wikimedia.org`,
`upload.wikimedia.org` e `en.wikipedia.org` retornam **HTTP 403** (fora da allowlist) via `curl` e WebFetch. Só
`github.com` está liberado; o WebSearch retorna links mas não baixa binários. **Para destravar**, adicione à
allowlist de egresso (ver https://code.claude.com/docs/en/claude-code-on-the-web):

```
commons.wikimedia.org
upload.wikimedia.org
en.wikipedia.org
```
(opcional, imagens clínicas: `radiopaedia.org`, `openi.nlm.nih.gov`)

### M0 — Compartimentos + fluidoterapia
| slug | tipo | o que mostra · por que | fonte/licença provável | status |
|---|---|---|---|---|
| mielinolise-pontina-rm.webp | raster (RM) | mielinólise osmótica em T2/FLAIR · ancora "corrigir Na rápido demais mata devagar" (batida 6, gancho M10) | Radiopaedia/Commons CC-BY | PEDIDO |
| darrow-yannet-classico.svg | svg | painéis ganho/perda água×sal no diagrama clássico · reforça o instrumento vivo | autoral/Commons | PEDIDO |
| osmol-gap-alcoois.svg | svg | gap osmolar com metanol/etilenoglicol · aprofunda "osm medida × tonicidade" rumo ao M33 | autoral | PEDIDO |
| sinais-desidratacao-turgor.webp | raster (foto) | turgor/mucosas · liga o número ao exame físico do volume (ponte Choca) | Commons CC-BY | PEDIDO |

### M1 — Néfron / forças de Starling
| slug | tipo | o que mostra · por que | fonte/licença provável | status |
|---|---|---|---|---|
| podocito-microscopia-eletronica.webp | raster (ME) | processos podais e fendas em ME · aprofunda a barreira (gancho M3) | Commons CC-BY-SA | PEDIDO |
| hidronefrose-ultrassom.webp | raster (US) | dilatação pielocalicial · concretiza o Ato 6 (pós-renal, P_BC↑) | Radiopaedia/Commons CC-BY | PEDIDO |
| curva-pressao-fluxo-autorregulacao.svg | svg | tracing pressão×fluxo com platô medido · eleva a Fig. 7 ao rigor de dado real | autoral | PEDIDO |
| estenose-arteria-renal-angio.webp | raster (angio) | estenose de artéria renal · ancora a exceção do Ato 7 (rim único + IECA) | Commons CC-BY | PEDIDO |

### M2 — Hemodinâmica renal
| slug | tipo | o que mostra · por que | fonte/licença provável | status |
|---|---|---|---|---|
| nta-cilindros-granulosos.webp | raster (microscopia urina) | cilindros granulosos (muddy brown) · liga a hipóxia medular (Fig. 4) à NTA | Commons CC-BY | PEDIDO |
| gradiente-po2-cortico-medular.svg | svg | perfil de pO₂ do córtex à papila · quantifica a Fig. 4 a partir do engine | autoral/computado | PEDIDO |
| nefropatia-por-contraste-esquema.svg | svg | mecanismo da NCI (vasoconstrição medular + toxicidade tubular) · aprofunda o gancho do contraste | autoral | PEDIDO |
| vasa-recta-shunt-o2.svg | svg | shunt contracorrente de O₂ na vasa recta · detalha a Fig. 5 | autoral/computado | PEDIDO |
| cortex-medula-histologia.webp | raster | corte real córtex × medula · a `cortex-medula.png` atual é o Gray's de INERVAÇÃO (mal rotulado) | Commons CC-BY | PEDIDO |

> **Próximos módulos (M3+):** ao construir cada módulo novo, abra aqui a seção `### MN — <título>` **antes** de
> fechar o módulo, listando as imagens-base que faltarem na `manifest.json` e os aprofundamentos que a aula
> pedir. Um módulo só é "excelente" quando as figuras acompanham a profundidade do texto.
