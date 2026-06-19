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

## Como ler as seções abaixo (M3–M39)

As seções a seguir são o backlog vivo de **aprofundamentos**. Convenção de prioridade adotada nesta curadoria
(2026-06): os **esquemas/diagramas computáveis** já vivem **inline em SVG** (o produto é single-file de fato),
então o que entra como `PEDIDO` aqui prioriza o **raster que só a curadoria com internet resolve** — fotografia
clínica, histologia, micrografia (óptica/ME/MEV), e imagem médica (RM/TC/US/ECG/Rx). Onde um SVG **mais rigoroso
ou computado do engine** elevaria a aula, o pedido vem marcado `svg` (desenho autoral, não download).

- `[módulo construído]` → o `filtraN.html` já existe no padrão de ouro; estes pedidos **aprofundam** as figuras
  atuais (em geral SVG) com o achado real (lâmina/exame). Ao obter, integrar inline na batida que já existe.
- `[HTML pendente]` → o módulo ainda não foi construído; estes pedidos são a **lista de raster a ter em mãos**
  quando ele entrar no rito do §5, além das 8 imagens-base já catalogadas na `manifest.json`.

---

## Lâminas-síntese autorais (Dr. Matheus M. Coelho, 2026-06) — obra própria, licença livre

Oito **lâminas-síntese** no cromo FILTRA (autorais, fornecidas pelo autor; tratadas como obra própria — sem
exigência de crédito). Cada uma é a aba Conceito inteira de um segmento desenhada como prancha-âncora. Convertidas
de PNG (~2,5 MB) para **webp ~155–205 KB** (1448 px, `sharp`, q82) e integradas **inline** no topo da aba Conceito
como `figure.fviva.lamina`, com legenda que orienta *o que olhar* e remete às `Fig. 1–13` decompostas (não
substituem as figuras computadas/SVG). Caveat do autor: "imperfeitas" — entram como **mapa de visão geral**, não
como figura de precisão de pixel; a decodificação fina segue nas figuras computadas de cada módulo.

| slug | módulo | tema | status |
|---|---|---|---|
| m1/atlas-nefron-visual.webp | M1 | atlas do néfron (rim macro → néfron → segmentos) | INTEGRADO |
| m3/glomerulo-barreira-sintese.webp | M3 | Starling (+10 mmHg) + barreira de 3 camadas | INTEGRADO |
| m5/tcp-sintese.webp | M5 | TCP: NHE3/SGLT2/NaPi-IIa/AC + acetazolamida/SGLT2i/manitol | INTEGRADO |
| m6/alca-henle-sintese.webp | M6 | alça: NKCC2, contracorrente, gradiente 300→1200 | INTEGRADO |
| m8/ducto-coletor-sintese.webp | M8 | ducto: ENaC/aldo, ADH/AQP2, intercalares, poupadores/vaptano | INTEGRADO |
| m7/tcd-sintese.webp | M7 | TCD: NCC, Ca²⁺, tiazídicos (paradoxo do Ca) | OBTIDO (aguarda M7) |
| m14/endocrinologia-renal-sintese.webp | M14 | rim como glândula: RAAS, EPO, vit D, PG, autorregulação | OBTIDO (aguarda M14) |
| m14/jga-raas-sintese.webp | M14 | aparelho justaglomerular + eixo renina-angiotensina-aldosterona | OBTIDO (aguarda M14) |

> Ao construir **M7** e **M14**, integrar as lâminas `OBTIDO` acima como `figure.fviva.lamina` (a regra CSS já
> existe nos módulos integrados — copiar de `filtra1/3/5/6/8.html`) e mudar o status para `INTEGRADO`.

## M3 — O glomérulo / barreira de filtração  [módulo construído]
> Erro que corrige: "proteinúria = rim falhando"; verdade: glomerular × tubular; barreira de **carga** e **tamanho**.
> Hoje as figuras são SVG + `endotelio-fenestrado.png`. Faltam os achados reais que provam a barreira quebrada.

| slug | tipo | o que mostra · por que | fonte/licença provável | status |
|---|---|---|---|---|
| fusao-pedicelos-me-lesao-minima.webp | raster (ME) | apagamento difuso dos pedicelos podocitários em microscopia eletrônica (doença de lesão mínima) · prova visual de que a barreira de **carga** caiu sem dano estrutural — ancora o nefrótico seletivo | Commons CC-BY-SA | PEDIDO |
| imunofluorescencia-glomerular.webp | raster (IF) | imunofluorescência glomerular (depósitos granulares de IgG/C3 × padrão linear) · liga a proteinúria ao **mecanismo imune** e separa nefrótico de nefrítico | Commons CC-BY | PEDIDO |
| gesf-esclerose-pas.webp | raster (histologia PAS/HE) | esclerose segmentar e focal (GESF) · barreira destruída em parte do tufo — o oposto da lesão mínima, proteinúria não-seletiva | Commons CC-BY | PEDIDO |
| crescente-glomerular-hist.webp | raster (histologia) | crescente celular preenchendo a cápsula de Bowman (GN rapidamente progressiva) · ancora o lado **nefrítico** (hematúria/cilindro hemático), P_BC e perda de função | Commons CC-BY | PEDIDO |

## M4 — Clearance / a creatinina mente  [módulo construído]
> Erro que corrige: "creatinina = função"; verdade: cinética lenta, massa muscular, secreção tubular.
> Módulo quase todo SVG/computado. Os aprofundamentos aqui ancoram o número no **corpo real** do paciente.

| slug | tipo | o que mostra · por que | fonte/licença provável | status |
|---|---|---|---|---|
| sarcopenia-tc-l3.webp | raster (TC) | corte axial de TC em L3 com área muscular esquelética medida · concretiza "a creatinina depende da massa" — o idoso sarcopênico tem Cr baixa e eGFR **superestimada** | Radiopaedia/Commons CC-BY | PEDIDO |
| creatinina-tfg-isodifusao.svg | svg (computado) | a hipérbole Cr×TFG com a zona-cega marcada (TFG cai de 120→60 e a Cr mal se move) computada do engine · eleva a figura atual ao rigor de um dado | autoral/computado | PEDIDO |
| musculo-vs-cr-amputado.svg | svg | dois pacientes mesma Cr, massas musculares opostas → TFGs reais opostas · fecha o erro "número isolado" | autoral | PEDIDO |

## M5 — TCP (SGLT2, anidrase carbônica, Fanconi)  [módulo construído]
> Erro que corrige: "o proximal só reabsorve"; verdade: 65% do Na sai aqui; a alça é prisioneira do proximal.
> Farmacologia encadeada (§8): acetazolamida, SGLT2i, manitol. Faltam os achados reais do segmento e da droga.

| slug | tipo | o que mostra · por que | fonte/licença provável | status |
|---|---|---|---|---|
| borda-escova-me-microvilosidades.webp | raster (ME/MEV) | microvilosidades do túbulo proximal em microscopia eletrônica · mostra **por que** 65% da reabsorção mora aqui (área de superfície imensa) | Commons CC-BY-SA | PEDIDO |
| cristais-cistina-fanconi.webp | raster (microscopia) | cristais/achado de cistinose ou Fanconi · ancora "o proximal lesado perde tudo" (glicosúria + fosfatúria + bicarbonatúria + aminoacidúria) | Commons CC-BY | PEDIDO |
| glicosuria-tira-sglt2.webp | raster (foto) | tira reagente com glicosúria sob SGLT2i com glicemia normal · prova clínica do **alvo molecular** do SGLT2 (a chave na fechadura do proximal) | Commons CC-BY/autoral | PEDIDO |

## M6 — Alça de Henle (NKCC2, contracorrente, diuréticos de alça)  [módulo construído]
> Erro que corrige: "a alça concentra a urina"; verdade: ela **cria o gradiente**; o ramo espesso é o motor diluidor.
> Farmacologia: furosemida/bumetanida/torasemida, dose-resposta. Faltam o gradiente real e a ototoxicidade.

| slug | tipo | o que mostra · por que | fonte/licença provável | status |
|---|---|---|---|---|
| gradiente-corticomedular-perfil.svg | svg (computado) | perfil de osmolalidade 300→1200 mOsm do córtex à papila computado do engine, com a seta do NKCC2 · quantifica "a alça cria o gradiente" | autoral/computado | PEDIDO |
| histologia-ramo-espesso-medula.webp | raster (histologia) | corte medular com ramo espesso × ramo fino lado a lado · mostra a parede impermeável à água que dilui (o motor) | Commons CC-BY | PEDIDO |
| nefrocalcinose-alca-us.webp | raster (US/Rx) | nefrocalcinose / hipercalciúria do diurético de alça · ancora o efeito de segmento (de alça **espolia** Ca, ao contrário do tiazídico) | Radiopaedia/Commons CC-BY | PEDIDO |

## M7 — TCD (NCC, manejo de Ca, segmento diluidor distal)  [HTML pendente]
> Erro que corrige: "tudo é igual no túbulo"; verdade: o TCD ajusta fino; NCC e o **paradoxo do Ca** dos tiazídicos.
> Farmacologia: tiazídicos. Base na `manifest.json` (8 SVGs). Raster a obter para a construção:

| slug | tipo | o que mostra · por que | fonte/licença provável | status |
|---|---|---|---|---|
| tubulo-distal-histologia-real.webp | raster (histologia) | TCD em corte (epitélio cuboide, sem borda em escova) contrastado com o proximal · separa visualmente os segmentos | Commons CC-BY | PEDIDO |
| condrocalcinose-tiazidico-rx.webp | raster (Rx) | condrocalcinose / cálculo ausente sob tiazídico · ancora o **paradoxo do cálcio** (tiazídico retém Ca → menos cálculo, mais Ca sérico) | Radiopaedia/Commons CC-BY | PEDIDO |
| gitelman-vs-bartter-esquema.svg | svg | NCC (Gitelman/tiazídico) × NKCC2 (Bartter/de alça) lado a lado com o eletrólito-assinatura · fecha "cada segmento é uma chave" | autoral | PEDIDO |

## M8 — Ducto coletor (ENaC/aldosterona, ADH/aquaporina)  [módulo construído]
> Erro que corrige: "aldosterona = sódio"; verdade: troca Na por K/H; o ADH abre aquaporinas — duas alavancas.
> Farmacologia: espironolactona/eplerenona/amilorida, vaptanos. Faltam os achados reais das duas células.

| slug | tipo | o que mostra · por que | fonte/licença provável | status |
|---|---|---|---|---|
| celulas-principal-intercalar-me.webp | raster (ME/histologia) | célula principal × intercalar em microscopia (a intercalar rica em mitocôndrias/microvilos) · mostra as **duas alavancas** no mesmo segmento | Commons CC-BY-SA | PEDIDO |
| ginecomastia-espironolactona.webp | raster (foto clínica) | ginecomastia por espironolactona · ancora o efeito anti-androgênico do ARM (a chave não é perfeitamente seletiva) | Commons CC-BY | PEDIDO |
| aquaporina2-imuno.webp | raster (imuno-histoquímica) | AQP2 migrando à membrana apical sob ADH · prova molecular de "o ADH abre o canal de água" | Commons CC-BY-SA | PEDIDO |

---

## M9 — Sódio e volume  [HTML pendente]
> Erro: "Na baixo = falta de sal"; verdade: Na é proxy de **água**; volume e tonicidade são eixos distintos.

| slug | tipo | o que mostra · por que | fonte/licença provável | status |
|---|---|---|---|---|
| edema-cacifo-foto.webp | raster (foto clínica) | sinal do cacifo (godet) em edema de membros · liga o **excesso de Na/volume** ao exame físico (ponte Choca/Guyton) | Commons CC-BY | PEDIDO |
| ascite-terceiro-espaco-us.webp | raster (US/foto) | ascite volumosa / terceiro espaço · concretiza "volume circulante efetivo baixo com água corporal total alta" | Radiopaedia/Commons CC-BY | PEDIDO |
| anasarca-paciente.webp | raster (foto clínica) | anasarca · o extremo do balanço de Na positivo — onde o rim "lê" hipovolemia apesar do edema | Commons CC-BY | PEDIDO |

## M10 — Água livre e disnatremias  [HTML pendente]
> Erro: "tratar o número Na"; verdade: corrigir a **água**; a velocidade importa (mielinólise/edema).

| slug | tipo | o que mostra · por que | fonte/licença provável | status |
|---|---|---|---|---|
| mielinolise-pontina-rm-t2.webp | raster (RM) | mielinólise pontina central em T2/FLAIR (lesão "asa de morcego") · ancora "corrigir o Na rápido demais mata devagar" (mesma imagem-âncora do gancho do M0) | Radiopaedia CC-BY-NC?/Commons CC-BY | PEDIDO |
| edema-cerebral-tc-hiponatremia.webp | raster (TC) | edema cerebral difuso / sulcos apagados na hiponatremia aguda · o outro extremo (corrigir rápido **demais devagar** mata aqui) | Radiopaedia/Commons CC-BY | PEDIDO |
| clearance-agua-livre-computado.svg | svg (computado) | eixo água-livre: ADH on/off movendo a osmolalidade urinária e o Na sérico, computado do engine · separa "distúrbio de água" de "distúrbio de sal" | autoral/computado | PEDIDO |

## M11 — Potássio, o eletrólito que mata  [HTML pendente]
> Erro: "K total"; verdade: gradiente transcelular × estoque; pH, insulina, β; **ECG como mecanismo**.

| slug | tipo | o que mostra · por que | fonte/licença provável | status |
|---|---|---|---|---|
| ecg-hipercalemia-progressao.webp | raster (ECG) | série de ECG: T apiculada → PR longo → QRS alargado → onda sinusoidal · o ECG **é** o gradiente de membrana ficando visível (não decorar, ler o mecanismo) | Commons CC-BY/Life in the Fast Lane CC-BY-NC | PEDIDO |
| ecg-hipocalemia-onda-u.webp | raster (ECG) | onda U, ST deprimido, T achatada na hipocalemia · o espelho do gradiente no sentido oposto | Commons CC-BY | PEDIDO |
| hemolise-pseudohipercalemia.webp | raster (foto tubo) | soro hemolisado × normal · ancora a armadilha pré-analítica (K alto que não é do paciente) | Commons CC-BY/autoral | PEDIDO |

## M12 — Cálcio · fósforo · magnésio  [HTML pendente]
> Erro: "cálcio sérico = cálcio"; verdade: ionizado, albumina, pH; o triângulo Ca-PO₄-PTH.

| slug | tipo | o que mostra · por que | fonte/licença provável | status |
|---|---|---|---|---|
| reabsorcao-ossea-hpt-rx.webp | raster (Rx) | reabsorção subperiosteal / "sal e pimenta" no crânio no hiperparatireoidismo · mostra o PTH **agindo no osso** (a ação distante do triângulo) | Radiopaedia/Commons CC-BY | PEDIDO |
| calcificacao-vascular-rx.webp | raster (Rx/TC) | calcificação vascular metastática (produto Ca×PO₄ alto na DRC) · ancora "o fósforo retido mata pelo vaso" | Commons CC-BY | PEDIDO |
| paratireoide-hist-hiperplasia.webp | raster (histologia) | hiperplasia de paratireoide (HPT secundário) · liga a glândula ao eixo ósseo-mineral renal | Commons CC-BY | PEDIDO |

## M13 — Ácido-base renal  [HTML pendente]
> Erro: "pH é respiratório"; verdade: o rim regula o HCO₃⁻; AG, delta-delta, ATRs por mecanismo.

| slug | tipo | o que mostra · por que | fonte/licença provável | status |
|---|---|---|---|---|
| davenport-computado.svg | svg (computado) | diagrama de Davenport (HCO₃⁻ × pH com isóbaras de PaCO₂) com o ponto do paciente plotado do engine · transforma "número de gaso" em **vetor** de distúrbio | autoral/computado | PEDIDO |
| nefrocalcinose-atr1-us.webp | raster (US/Rx) | nefrocalcinose medular da ATR distal (tipo 1) · ancora o mecanismo (não acidifica a urina → cálcio precipita) | Radiopaedia/Commons CC-BY | PEDIDO |
| raquitismo-atr2-rx.webp | raster (Rx) | raquitismo/osteomalácia da ATR proximal (tipo 2, Fanconi) · liga a perda de HCO₃⁻ proximal ao osso | Commons CC-BY | PEDIDO |

## M14 — RAAS e o eixo endócrino renal  [HTML pendente]
> Erro: "o rim só filtra"; verdade: é **glândula** — sente pressão/Na/O₂ e responde com hormônios.

| slug | tipo | o que mostra · por que | fonte/licença provável | status |
|---|---|---|---|---|
| aparelho-justaglomerular-hist.webp | raster (histologia) | mácula densa + células granulares justaglomerulares em corte · mostra o **sensor** físico da glândula renal | Commons CC-BY-SA | PEDIDO |
| eritropoetina-medula-resposta.svg | svg | eixo O₂ renal → EPO → eritropoese (com a anemia da DRC como falha) · ancora "o rim é glândula que sente O₂" | autoral | PEDIDO |
| hiperaldosteronismo-adrenal-tc.webp | raster (TC) | adenoma adrenal (Conn) em TC · liga o RAAS desregulado à hipertensão/hipocalemia (ponte M18) | Radiopaedia/Commons CC-BY | PEDIDO |

## M15 — Ureia, creatinina, eGFR e a urina  [HTML pendente]
> Erro: "número isolado"; verdade: a **urina conta a história**; índices separam pré-renal de NTA.

| slug | tipo | o que mostra · por que | fonte/licença provável | status |
|---|---|---|---|---|
| sedimento-cilindro-granuloso.webp | raster (microscopia urina) | cilindro granuloso pigmentado ("muddy brown") · o achado que **fecha NTA** contra pré-renal | Commons CC-BY | PEDIDO |
| sedimento-cilindro-hematico.webp | raster (microscopia urina) | cilindro hemático e hemácias dismórficas · assinatura **glomerular/nefrítica** | Commons CC-BY | PEDIDO |
| cristais-urina-mosaico.webp | raster (microscopia urina) | mosaico de cristais (ácido úrico, oxalato, estruvita, cistina) · liga o cristal ao distúrbio/cálculo de origem | Commons CC-BY | PEDIDO |
| tira-reagente-leitura.webp | raster (foto) | tira reagente com escala de cor · ancora a triagem (proteína/sangue/leucócito) antes da microscopia | Commons CC-BY/autoral | PEDIDO |

## M16 — A LRA por mecanismo (KDIGO)  [HTML pendente · capstone fisiológico]
> Erro: "LRA é um diagnóstico"; verdade: é uma **sombra com 3 mecanismos**; cardiorrenal e hepatorrenal.

| slug | tipo | o que mostra · por que | fonte/licença provável | status |
|---|---|---|---|---|
| nta-histologia-real.webp | raster (histologia) | necrose tubular aguda (perda de borda em escova, células descamadas no lúmen) · prova a lesão **intrínseca** | Commons CC-BY | PEDIDO |
| nefrite-intersticial-eosinofilos.webp | raster (histologia) | infiltrado intersticial com eosinófilos (NIA medicamentosa) · separa NIA de NTA dentro da "intrínseca" | Commons CC-BY | PEDIDO |
| hidronefrose-us-grau.webp | raster (US) | hidronefrose com dilatação pielocalicial · torna concreto o mecanismo **pós-renal** (P_BC↑) | Radiopaedia/Commons CC-BY | PEDIDO |
| bexigoma-tc-pos-renal.webp | raster (TC/US) | bexiga distendida (retenção) como causa pós-renal reversível · ancora "antes de tudo, descarte obstrução" | Commons CC-BY | PEDIDO |

## M17 — Farmacologia diurética integrada  [HTML pendente · capstone farmacológico 1]
> Erro: "dobrar a dose sempre faz mais xixi"; verdade: há **teto** e há **braking**; a sinergia mora na sequência.

| slug | tipo | o que mostra · por que | fonte/licença provável | status |
|---|---|---|---|---|
| dose-resposta-teto-braking.svg | svg (computado) | curva dose-resposta sigmoide com o teto e o deslocamento à direita (braking/DRC) computados do engine · o coração farmacológico do módulo | autoral/computado | PEDIDO |
| bloqueio-sequencial-nefron.svg | svg | néfron inteiro com os sítios empilhados (acetazolamida→alça→tiazídico→ARM) e a sinergia · mapa da prescrição combinada | autoral | PEDIDO |
| furosemida-bula-foto.webp | raster (foto) | ampola/comprimido de furosemida com a dose impressa · ancora dose↔unidade real (mg / mg·h⁻¹ IV) exigida pela guarda §8 | Commons CC-BY/autoral | PEDIDO |

## M18 — Anti-hipertensivos, RAAS e eixo endócrino-renal  [HTML pendente · capstone farmacológico 2]
> Erro: "creatinina subiu, suspenda o IECA"; verdade: a queda da TFG pelo **eferente** pode ser o efeito esperado.

| slug | tipo | o que mostra · por que | fonte/licença provável | status |
|---|---|---|---|---|
| hemodinamica-eferente-ieca.svg | svg (computado) | glomérulo com a eferente dilatando sob IECA → P_GC↓ → TFG↓ "esperada" computada do engine · desfaz o reflexo de suspender | autoral/computado | PEDIDO |
| estenose-renal-bilateral-angio.webp | raster (angio) | estenose bilateral de artéria renal · ancora a **exceção** (onde o IECA precipita LRA), ponte com o Ato do M1 | Commons CC-BY | PEDIDO |
| angioedema-ieca-foto.webp | raster (foto clínica) | angioedema de lábio/língua por IECA · o efeito adverso de classe que muda a conduta (bradicinina) | Commons CC-BY | PEDIDO |

---

## M19 — Princípios físicos do transporte  [HTML pendente]
> A base de tudo: difusão · convecção · ultrafiltração · adsorção.

| slug | tipo | o que mostra · por que | fonte/licença provável | status |
|---|---|---|---|---|
| difusao-conveccao-computado.svg | svg (computado) | clearance por peso molecular: difusão (cai com PM) × convecção (platô até o sieving) computados do engine · o porquê de cada modalidade | autoral/computado | PEDIDO |
| membrana-dialise-mev.webp | raster (MEV) | poros da membrana de diálise em microscopia eletrônica de varredura · concretiza "tamanho do poro define o que passa" | Commons CC-BY-SA | PEDIDO |

## M20 — O circuito extracorpóreo  [HTML pendente]
> Acesso, bomba, dialisador, fluxos (Qb, Qd), pressões (TMP).

| slug | tipo | o que mostra · por que | fonte/licença provável | status |
|---|---|---|---|---|
| dialisador-corte-fibras.webp | raster (foto/corte) | dialisador capilar cortado mostrando o feixe de fibras ocas · onde sangue e dialisato se cruzam em contracorrente | Commons CC-BY | PEDIDO |
| fistula-av-foto.webp | raster (foto clínica) | fístula arteriovenosa madura no antebraço (frêmito) · o acesso "padrão-ouro" e por quê | Commons CC-BY | PEDIDO |
| cateter-duplo-lumen-foto.webp | raster (foto) | cateter de duplo lúmen · o acesso agudo, com suas pressões arterial/venosa no circuito | Commons CC-BY | PEDIDO |
| maquina-hd-paineis.webp | raster (foto) | painel da máquina de HD com pressões e TMP visíveis · liga o número de tela ao circuito físico | Commons CC-BY | PEDIDO |

## M21 — A membrana e o clearance  [HTML pendente]
> KoA, permeabilidade, sieving, backfiltration (high-flux × low-flux).

| slug | tipo | o que mostra · por que | fonte/licença provável | status |
|---|---|---|---|---|
| fibra-capilar-corte-mev.webp | raster (MEV) | corte transversal de uma fibra oca (parede assimétrica) · mostra a estrutura que define KoA e sieving | Commons CC-BY-SA | PEDIDO |
| sieving-koa-computado.svg | svg (computado) | curva de sieving e o platô de clearance × KoA computados do engine · high-flux × low-flux como dado | autoral/computado | PEDIDO |

## M22 — A sessão de HDI  [HTML pendente]
> Gradientes, eficiência × tempo; por que "intermitente" tem custo.

| slug | tipo | o que mostra · por que | fonte/licença provável | status |
|---|---|---|---|---|
| sessao-hdi-foto.webp | raster (foto clínica) | paciente em sessão de HDI com a máquina · o contexto real de 4h, 3×/semana | Commons CC-BY | PEDIDO |
| eficiencia-tempo-computado.svg | svg (computado) | queda exponencial da ureia na sessão e o "custo da intermitência" (pico-vale) computados do engine | autoral/computado | PEDIDO |

## M23 — Ultrafiltração e o balanço de volume  [HTML pendente]
> Peso seco, taxa de UF, refilling plasmático.

| slug | tipo | o que mostra · por que | fonte/licença provável | status |
|---|---|---|---|---|
| edema-pulmonar-rx-cefalizacao.webp | raster (Rx) | congestão/edema pulmonar com cefalização e linhas B · o alvo da UF (sobrecarga de volume) | Radiopaedia/Commons CC-BY | PEDIDO |
| refilling-uf-computado.svg | svg (computado) | curva de volume sanguíneo relativo: UF × refilling plasmático computados do engine · o mecanismo da hipotensão (M24) | autoral/computado | PEDIDO |
| linhas-b-pulmao-us.webp | raster (US pulmonar) | linhas B no US à beira-leito · método de estimar volume/"peso seco" (ponte Choca/POCUS) | Radiopaedia/Commons CC-BY | PEDIDO |

## M24 — Hipotensão intradialítica  [HTML pendente]
> Mecanismo (UF > refilling), stunning miocárdico, tolerância.

| slug | tipo | o que mostra · por que | fonte/licença provável | status |
|---|---|---|---|---|
| stunning-miocardico-eco.webp | raster (eco) | hipocinesia segmentar transitória pós-UF (myocardial stunning) · prova que a UF agressiva **isquemia o miocárdio** | Commons CC-BY | PEDIDO |
| uf-refilling-cruzamento.svg | svg (computado) | ponto onde a taxa de UF ultrapassa o refilling → queda da PA computada do engine · o mecanismo, não a tabela | autoral/computado | PEDIDO |

## M25 — Dose e adequação (Kt/V, URR)  [HTML pendente]
> A prescrição de dose (alvo, tempo, fluxos) por mecanismo.

| slug | tipo | o que mostra · por que | fonte/licença provável | status |
|---|---|---|---|---|
| ktv-urr-computado.svg | svg (computado) | relação Kt/V ↔ URR e o efeito de tempo×fluxo na dose, computados do engine · a prescrição como mecanismo | autoral/computado | PEDIDO |
| folha-prescricao-hd.webp | raster (foto/documento) | folha/tela de prescrição de HD (tempo, Qb, Qd, UF) · ancora a dose real com unidades | autoral/Commons CC-BY | PEDIDO |

## M26 — Cinética da ureia  [HTML pendente]
> Compartimento único × duplo, rebote pós-diálise; o tempo importa.

| slug | tipo | o que mostra · por que | fonte/licença provável | status |
|---|---|---|---|---|
| rebote-ureia-computado.svg | svg (computado) | curva de ureia com o rebote pós-diálise (modelo duplo) computado do engine · por que a amostra colhida cedo **mente** sobre o Kt/V | autoral/computado | PEDIDO |

## M27 — Terapias contínuas (TRRC/CRRT)  [HTML pendente]
> CVVH (convecção) × CVVHD (difusão) × CVVHDF; por que "contínuo".

| slug | tipo | o que mostra · por que | fonte/licença provável | status |
|---|---|---|---|---|
| crrt-uti-foto.webp | raster (foto clínica) | máquina de CRRT à beira-leito na UTI · o contexto hemodinamicamente instável que pede continuidade | Commons CC-BY | PEDIDO |
| cvvh-cvvhd-cvvhdf-computado.svg | svg (computado) | as três modalidades com setas de convecção/difusão e o clearance por PM computado do engine · escolha por mecanismo | autoral/computado | PEDIDO |

## M28 — Dose e fluidos na TRRC  [HTML pendente]
> Efluente mL/kg/h, pré × pós-diluição; a prescrição da dose contínua.

| slug | tipo | o que mostra · por que | fonte/licença provável | status |
|---|---|---|---|---|
| pre-pos-diluicao-computado.svg | svg (computado) | efeito da pré-diluição (diluindo o sangue → clearance↓) × pós-diluição (fração de filtração↑) computado do engine · a dose real (efluente) | autoral/computado | PEDIDO |
| bolsas-reposicao-crrt.webp | raster (foto) | bolsas de reposição/dialisato de CRRT · ancora o volume de efluente prescrito em mL/kg/h | Commons CC-BY/autoral | PEDIDO |

## M29 — Anticoagulação do circuito  [HTML pendente]
> Citrato regional (quelação de Ca²⁺) × heparina; protocolos e doses.

| slug | tipo | o que mostra · por que | fonte/licença provável | status |
|---|---|---|---|---|
| citrato-quelacao-computado.svg | svg (computado) | citrato quelando Ca²⁺ no circuito (Ca iônico↓ → coagulação parada) e a reposição sistêmica de Ca computadas do engine · anticoagulação **regional** | autoral/computado | PEDIDO |
| filtro-coagulado-foto.webp | raster (foto) | dialisador/filtro coagulado (escurecido) × patente · a falha que a anticoagulação previne | Commons CC-BY/autoral | PEDIDO |

## M30 — Diálise peritoneal  [HTML pendente]
> O peritônio como membrana; UF osmótica pela glicose; PET/tipos de transportador.

| slug | tipo | o que mostra · por que | fonte/licença provável | status |
|---|---|---|---|---|
| cateter-tenckhoff-foto.webp | raster (foto clínica) | cateter de Tenckhoff no abdome · o acesso da DP domiciliar | Commons CC-BY | PEDIDO |
| efluente-turvo-peritonite.webp | raster (foto clínica) | bolsa de efluente turvo (peritonite) × límpido · o sinal-sentinela da complicação | Commons CC-BY | PEDIDO |
| peritonio-mesotelio-hist.webp | raster (histologia) | mesotélio peritoneal e capilares · mostra **por que** o peritônio serve de membrana de troca | Commons CC-BY | PEDIDO |

## M31 — SLED / híbridas  [HTML pendente]
> O meio-termo entre HDI e TRRC; o racional hemodinâmico.

| slug | tipo | o que mostra · por que | fonte/licença provável | status |
|---|---|---|---|---|
| sled-hdi-crrt-computado.svg | svg (computado) | eixo tempo×eficiência×tolerância hemodinâmica posicionando SLED entre HDI e CRRT, computado do engine · por que o meio-termo existe | autoral/computado | PEDIDO |

## M32 — Depuração de solutos e drogas  [HTML pendente]
> Peso molecular, ligação proteica, Vd; dosagem de fármacos na diálise.

| slug | tipo | o que mostra · por que | fonte/licença provável | status |
|---|---|---|---|---|
| dialisabilidade-computado.svg | svg (computado) | mapa PM × ligação proteica × Vd separando o que a diálise remove do que não remove, computado do engine · regra de dose suplementar | autoral/computado | PEDIDO |
| tabela-ajuste-antibiotico.webp | raster (foto/documento) | trecho de referência de ajuste de antimicrobiano na diálise · ancora a dose real (mg pós-HD) | autoral/Commons CC-BY | PEDIDO |

## M33 — Remoção de toxinas  [HTML pendente]
> Intoxicações dialisáveis (lítio, salicilato, metanol, etilenoglicol); indicação e dose.

| slug | tipo | o que mostra · por que | fonte/licença provável | status |
|---|---|---|---|---|
| cristais-oxalato-etilenoglicol.webp | raster (microscopia urina) | cristais de oxalato de cálcio (envelope/agulha) na intoxicação por etilenoglicol · o achado que **confirma** a indicação | Commons CC-BY | PEDIDO |
| gap-osmolar-anionico-computado.svg | svg (computado) | gap osmolar → (metanol/EG metabolizados) → gap aniônico, com o cruzamento no tempo computado do engine · quando dialisar | autoral/computado | PEDIDO |
| fundo-olho-metanol.webp | raster (foto clínica) | edema de disco óptico na intoxicação por metanol · a lesão-alvo que urge a diálise | Commons CC-BY | PEDIDO |

## M34 — Síndrome de desequilíbrio dialítico  [HTML pendente]
> Edema cerebral por osmose reversa; o gradiente que machuca.

| slug | tipo | o que mostra · por que | fonte/licença provável | status |
|---|---|---|---|---|
| edema-cerebral-desequilibrio-tc.webp | raster (TC/RM) | edema cerebral pós-diálise (desequilíbrio) · a complicação da **primeira** diálise rápida em ureia muito alta | Radiopaedia/Commons CC-BY | PEDIDO |
| gradiente-ureia-cerebro-computado.svg | svg (computado) | ureia caindo rápido no sangue e devagar no cérebro → água entra (osmose reversa) computado do engine · por que ir devagar | autoral/computado | PEDIDO |

## M35 — Indicações de TRS (AEIOU)  [HTML pendente]
> O AEIOU como mapa de conduta (Acidose, Eletrólitos, Intoxicação, Sobrecarga, Uremia).

| slug | tipo | o que mostra · por que | fonte/licença provável | status |
|---|---|---|---|---|
| pericardite-uremica-eco.webp | raster (eco/Rx) | derrame pericárdico urêmico / atrito · o "U" que indica diálise urgente (não esperar) | Radiopaedia/Commons CC-BY | PEDIDO |
| edema-pulmonar-sobrecarga-rx.webp | raster (Rx) | edema pulmonar refratário a diurético · o "S" do AEIOU (sobrecarga) | Commons CC-BY | PEDIDO |
| asterixis-uremia-foto.webp | raster (foto/vídeo-still) | asterixis/encefalopatia urêmica · o sinal neurológico do "U" | Commons CC-BY | PEDIDO |

## M36 — O momento da substituição  [HTML pendente]
> Quando iniciar: os gatilhos, precoce × tardio, e o mecanismo que pede suporte.

| slug | tipo | o que mostra · por que | fonte/licença provável | status |
|---|---|---|---|---|
| precoce-vs-tardio-computado.svg | svg (computado) | a janela de decisão (gatilhos do AEIOU × espera por recuperação) computada do engine · por que "mais cedo" não é "melhor" sem mecanismo | autoral/computado | PEDIDO |
| furosemide-stress-test-curva.svg | svg (computado) | resposta diurética ao FST predizendo progressão · gatilho funcional, não só número | autoral/computado | PEDIDO |

## M37 — Síndrome cardiorrenal e a ultrafiltração  [HTML pendente · ponte com Choca]
> Coração, rim e volume na falência mútua; diuréticos × UF.

| slug | tipo | o que mostra · por que | fonte/licença provável | status |
|---|---|---|---|---|
| congestao-venosa-renal-computado.svg | svg (computado) | PVC↑ → pressão venosa renal↑ → P_BC↑ → TFG↓ computado do engine · o cardiorrenal **não é só débito baixo**, é congestão (ponte Choca) | autoral/computado | PEDIDO |
| veia-cava-us-colapso.webp | raster (US) | VCI dilatada sem colapso (congestão) · liga o volume ao rim à beira-leito (ponte Choca/POCUS) | Radiopaedia/Commons CC-BY | PEDIDO |
| congestao-hepatica-doppler.webp | raster (US Doppler) | padrão venoso portal/hepático pulsátil (VExUS) na congestão sistêmica · o órgão-alvo da pressão de enchimento | Radiopaedia/Commons CC-BY | PEDIDO |

## M38 — Capstone integrado  [HTML pendente]
> LRA grave → escolha de modalidade e prescrição por mecanismo → meio interno restaurado.

| slug | tipo | o que mostra · por que | fonte/licença provável | status |
|---|---|---|---|---|
| arvore-modalidade-computado.svg | svg (computado) | árvore de decisão HDI × CRRT × SLED × DP guiada por hemodinâmica/PM-alvo/logística, ramificada do engine · o fechamento integrador | autoral/computado | PEDIDO |

## M39 — Exame global de domínio  [HTML pendente]
> Revisão global · exame de domínio · 100 questões (psicométrico).

| slug | tipo | o que mostra · por que | fonte/licença provável | status |
|---|---|---|---|---|
| mapa-conceitual-renal.svg | svg | mapa conceitual ligando néfron → meio interno → falência → farmacologia → diálise · âncora visual da revisão (reaproveita figuras-chave dos módulos) | autoral | PEDIDO |
| hexapode-mapa-pontes.svg | svg | o hexápode com as pontes vivas FILTRA↔Choca (cardiorrenal, volume, RAAS×vasopressores) destacadas · fecha o braço no mapa maior | autoral | PEDIDO |

---

> **Curadoria:** os `PEDIDO` raster acima dependem do desbloqueio de rede descrito no topo deste arquivo
> (`commons.wikimedia.org`, `upload.wikimedia.org`, `en.wikipedia.org`; opcional `radiopaedia.org`,
> `openi.nlm.nih.gov`). Os `svg` marcados são **autorais/computados** — podem ser desenhados inline sem rede,
> direto no `filtraN.html`, durante a construção do módulo.
