# assets/OnDemand.md — pedidos de imagem sob demanda (backlog vivo)

> **O que é.** A `manifest.json` lista as **8 imagens-base** de cada módulo (o mínimo). Este arquivo é o
> **backlog de imagens ADICIONAIS** — mais diversas e mais profundas — que um agente descobre serem
> necessárias **enquanto constrói ou revisa** um módulo, mas que ainda não existem em `assets/mN/`.
>
> A regra de ouro do braço: as figuras devem estar à altura do conteúdo (padrão **"figura viva"**, ver
> `CLAUDE.md §6`). Quando o agente julgar que "aqui uma imagem mais específica/profunda elevaria a aula de
> *bom* para *excelente*", ele **não inventa nem deixa passar**: registra o pedido aqui.

---

## ⚠️ Estado da curadoria — bloqueio de rede (2026-06)

Tentativa de curar as imagens abaixo numa sessão de agente: **o egresso de rede deste ambiente bloqueia o
Wikimedia.** `commons.wikimedia.org`, `upload.wikimedia.org` e `en.wikipedia.org` retornam **HTTP 403 (host
fora da allowlist)** — tanto via `curl` quanto via WebFetch. Só `github.com` está liberado. A ferramenta
**WebSearch funciona** (retorna links), mas não permite baixar binários nem abrir as páginas de licença.

**Para destravar a curadoria**, adicione estes hosts à allowlist de egresso do ambiente
(ver https://code.claude.com/docs/en/claude-code-on-the-web — configuração de rede):

```
commons.wikimedia.org
upload.wikimedia.org
en.wikipedia.org
```
(opcional, para imagens clínicas: `radiopaedia.org`, `openi.nlm.nih.gov`)

Com isso liberado, o agente consegue: (1) baixar os arquivos `PEDIDO` abaixo para `assets/mN/`, (2) ler a
página do arquivo no Commons para preencher autor/licença, (3) integrar inline e marcar `INTEGRADO`. Sem
isso, a curadoria fica pendente.

## Como funciona (ciclo de vida)

1. **Quem constrói/revisa** (sem internet) adiciona uma linha na tabela do módulo, com status `PEDIDO`.
   - Descreva **o que a imagem mostra** e **por que** (qual erro cognitivo corrige, qual batida do Conceito
     ela serve). Sugira `slug`, `tipo` (`svg` esquemático · `png/jpg/webp` raster) e a fonte provável.
2. **Quem cura com internet** (ver `assets/INSTRUCOES.md`) baixa/gera, salva em `assets/mN/<slug>.<ext>`,
   credita em `../CREDITS.md` e muda o status para `OBTIDO`.
3. **Quem integra** (de volta sem internet) insere a figura **inline** na batida certa do `filtraN.html`,
   como `<figure class="fviva">` com **legenda que ensina** e referência cruzada `Fig. N`, roda
   `npm run check` e muda o status para `INTEGRADO`.

Status: `PEDIDO` → `OBTIDO` → `INTEGRADO` (ou `RECUSADO` com motivo, ex.: licença incompatível).

## Regras (herdadas de `assets/README.md` e `CLAUDE.md §7`)

- **Offline sempre.** Caminho relativo `assets/mN/<slug>.<ext>`; nunca URL remota (a guarda `img-guard.js` recusa).
- **SVG esquemático fica inline** no HTML quando for desenho/figura computada; só **raster** (foto, micrografia,
  TC/RM, histologia) mora em `assets/`. Em dúvida: o conceito é numérico/computável? → SVG inline do engine.
  É uma foto do mundo real (lâmina, exame, equipamento)? → raster aqui.
- **Licença:** CC0/domínio público preferido; CC-BY/CC-BY-SA aceitos **com atribuição** em `../CREDITS.md`.
  Evitar NC/ND incompatíveis. Sem licença clara → `RECUSADO`.
- **Otimize:** `.webp`/`.svg`, comprimido; mantenha o repo leve.
- **Acessibilidade:** todo pedido deve permitir um `alt` descritivo e uma legenda ≥30 caracteres que *ensina*
  (não um rótulo). Isso é exigido pelo validador.

## Template de pedido

```text
| <slug>.<ext> | <tipo> | o que mostra · por que (batida do Conceito que serve) | <licença/fonte provável> | PEDIDO |
```

---

## M0 — Compartimentos + fluidoterapia
| slug | tipo | o que mostra · por que | fonte/licença provável | status |
|---|---|---|---|---|
| mielinolise-pontina-rm.webp | raster (RM) | mielinólise osmótica em T2/FLAIR · ancora o "corrigir Na rápido demais mata devagar" (batida 6, e gancho M10) | Radiopaedia/Commons CC-BY | PEDIDO |
| darrow-yannet-classico.svg | svg | painéis ganho/perda água×sal no diagrama clássico · reforça o instrumento vivo com a convenção canônica | autoral/Commons | PEDIDO |
| osmol-gap-alcoois.svg | svg | gap osmolar com metanol/etilenoglicol · aprofunda "osm medida × tonicidade" rumo ao M33 (toxicologia dialisável) | autoral | PEDIDO |
| sinais-desidratacao-turgor.webp | raster (foto) | turgor/mucosas · liga o número ao exame físico do volume (ponte Choca) | Commons CC-BY | PEDIDO |

## M1 — Néfron / forças de Starling
| slug | tipo | o que mostra · por que | fonte/licença provável | status |
|---|---|---|---|---|
| podocito-microscopia-eletronica.webp | raster (ME) | processos podais e fendas de filtração em ME · aprofunda a barreira de filtração (Fig. 5 hoje é só histologia óptica; gancho M3) | Commons CC-BY-SA | PEDIDO |
| hidronefrose-ultrassom.webp | raster (US) | dilatação pielocalicial · torna concreto o Ato 6 (pós-renal, P_BC↑) | Radiopaedia/Commons CC-BY | PEDIDO |
| curva-pressao-fluxo-autorregulacao.svg | svg | tracing pressão×fluxo com platô medido (não estilizado) · eleva a Fig. 7 ao rigor de um dado real | autoral | PEDIDO |
| estenose-arteria-renal-angio.webp | raster (angio) | estenose de artéria renal · ancora a exceção do Ato 7 (rim único/estenose bilateral + IECA) | Commons CC-BY | PEDIDO |

## M2 — Hemodinâmica renal
| slug | tipo | o que mostra · por que | fonte/licença provável | status |
|---|---|---|---|---|
| nta-cilindros-granulosos.webp | raster (microscopia urina) | cilindros granulosos pigmentados (muddy brown) · liga a hipóxia medular (Fig. 4) ao achado de NTA | Commons CC-BY | PEDIDO |
| gradiente-po2-cortico-medular.svg | svg | perfil de pO₂ do córtex à papila · quantifica a Fig. 4 ("medula no fio da navalha") a partir do engine | autoral/computado | PEDIDO |
| nefropatia-por-contraste-esquema.svg | svg | mecanismo da NCI (vasoconstrição medular + toxicidade tubular) · aprofunda o gancho do contraste | autoral | PEDIDO |
| vasa-recta-shunt-o2.svg | svg | shunt contracorrente de O₂ na vasa recta com setas de difusão · detalha a Fig. 5 (por que concentrar custa hipóxia) | autoral/computado | PEDIDO |
| cortex-medula-histologia.webp | raster | corte real córtex (glomérulos) × medula (alças/ductos), ou esquema dedicado · a `cortex-medula.png` atual é o Gray's de INERVAÇÃO (mal rotulado), não a histologia | Commons CC-BY | PEDIDO |

---

## Próximos módulos (M3+)
Ao construir cada módulo novo, abra aqui a sua seção `## MN — <título>` **antes** de fechar o módulo: liste as
imagens-base que faltarem na `manifest.json` e os aprofundamentos que a aula pedir. Um módulo só é "excelente"
quando as figuras acompanham a profundidade do texto.
