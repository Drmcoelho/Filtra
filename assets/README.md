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

### M3 — Glomérulo / barreira de filtração
> Tem a prancha autoral `atlas-glomerulo-barreira.png` (hero). Backlog = raster clínico que aprofunda.

| slug | tipo | o que mostra · por que | fonte/licença provável | status |
|---|---|---|---|---|
| lesao-minima-podocitos-me.webp | raster (ME) | apagamento difuso dos processos podais (lesão mínima) · ancora a proteinúria SELETIVA por perda de carga com tamanho intacto | Commons CC-BY-SA | PEDIDO |
| membranosa-spikes-prata.webp | raster (histologia) | espessamento da MBG / "spikes" (GN membranosa) · a barreira de TAMANHO rompida → não-seletiva | Commons CC-BY | PEDIDO |
| cilindros-hematicos-urina.webp | raster (microscopia urina) | cilindros hemáticos dismórficos · separa a proteinúria glomerular/nefrítica da tubular | Commons CC-BY | PEDIDO |

### M4 — Clearance / por que a creatinina mente
| slug | tipo | o que mostra · por que | fonte/licença provável | status |
|---|---|---|---|---|
| ckd-epi-nomograma.svg | svg | nomograma eGFR × creatinina por idade/sexo · concretiza a estimativa e a faixa cega | autoral/computado | PEDIDO |
| sarcopenia-idoso-foto.webp | raster (foto/DEXA) | baixa massa muscular do idoso · ancora "Cr normal com TFG ruim" (a creatinina mente) | Commons CC-BY | PEDIDO |
| cistatina-vs-creatinina.svg | svg | duas hipérboles (Cr × cistatina) vs TFG · por que a cistatina desmascara | autoral/computado | PEDIDO |

### M5 — TCP / SGLT2 / acetazolamida
> Tem a prancha autoral `atlas-tcp.png` (hero). Backlog = raster clínico.

| slug | tipo | o que mostra · por que | fonte/licença provável | status |
|---|---|---|---|---|
| glicosuria-fita-urinaria.webp | raster (foto) | fita reagente positiva para glicose · concretiza a glicosúria (renal × hiperglicêmica) | Commons CC-BY | PEDIDO |
| acidose-tubular-proximal-esquema.svg | svg | ATR tipo 2 (Fanconi): bicarbonatúria com HCO₃ plasmático baixo · aprofunda o capstone ácido-base | autoral | PEDIDO |

### M6 — Alça de Henle / diuréticos de alça
> Tem a prancha autoral `atlas-alca-henle.png` (hero). Backlog = raster clínico.

| slug | tipo | o que mostra · por que | fonte/licença provável | status |
|---|---|---|---|---|
| resistencia-diuretica-curva.svg | svg | curva dose-resposta deslocada à direita (braking/IRC) · quantifica a resistência | autoral/computado | PEDIDO |
| nefrocalcinose-medular-us.webp | raster (US/TC) | nefrocalcinose medular · perda de Ca/Mg pela alça (≠ tiazídico) | Radiopaedia/Commons CC-BY | PEDIDO |

### M7 — TCD / tiazídicos
> Tem a prancha autoral `atlas-tcd.png` (hero). Backlog = raster clínico.

| slug | tipo | o que mostra · por que | fonte/licença provável | status |
|---|---|---|---|---|
| litiase-calcica-tc.webp | raster (TC) | cálculo de cálcio · por que o tiazídico (Ca urinário↓) trata a nefrolitíase | Commons CC-BY | PEDIDO |
| hiponatremia-tiazidica-esquema.svg | svg | mecanismo da hiponatremia da idosa sob tiazídico · o risco distinto da alça | autoral | PEDIDO |

### M8 — Ducto coletor / poupadores / vaptanos
| slug | tipo | o que mostra · por que | fonte/licença provável | status |
|---|---|---|---|---|
| celula-principal-intercalar-histologia.webp | raster (histologia) | célula principal × intercalar no ducto · as duas alavancas (Na/K/H × H⁺/HCO₃) | Commons CC-BY-SA | PEDIDO |
| adenoma-conn-tc.webp | raster (TC) | adenoma adrenal · hiperaldo primário (hipocalemia/alcalose) — ponte M14 | Commons CC-BY | PEDIDO |
| aquaporina2-ducto-esquema.svg | svg | inserção da AQP2 sob ADH × bloqueio pela vaptana · a aquarese | autoral | PEDIDO |

### M9 — Sódio e volume (volume circulante efetivo)
| slug | tipo | o que mostra · por que | fonte/licença provável | status |
|---|---|---|---|---|
| edema-cacifo-foto.webp | raster (foto) | edema com cacifo (godet) · o ECF expandido com volume circulante EFETIVO baixo | Commons CC-BY | PEDIDO |
| ascite-cirrose-us.webp | raster (US/foto) | ascite volumosa · volume efetivo baixo apesar de ECF alto (ponte hepatorrenal) | Commons CC-BY | PEDIDO |

### M10 — Água livre e disnatremias
| slug | tipo | o que mostra · por que | fonte/licença provável | status |
|---|---|---|---|---|
| mielinolise-pontina-rm.webp | raster (RM T2/FLAIR) | hiperintensidade pontina central · a pérola "corrigir hipoNa crônica rápido demais desmieliniza" | Radiopaedia/Commons CC-BY | PEDIDO |
| edema-cerebral-tc.webp | raster (TC) | apagamento de sulcos/edema · o outro lado: hiperNa crônica corrigida rápido / hipoNa aguda | Commons CC-BY | PEDIDO |
| osmostato-adh-sede.svg | svg | limiar de sede × secreção de ADH vs osmolalidade · o controle fino da água livre | autoral/computado | PEDIDO |
| siadh-vs-di-painel.svg | svg | painel U_osm / U_Na / volemia separando SIADH × DI central × nefrogênico | autoral | PEDIDO |

### M12 — Cálcio · fósforo · magnésio
| slug | tipo | o que mostra · por que | fonte/licença provável | status |
|---|---|---|---|---|
| ecg-hipercalcemia-qt.webp | raster (ECG) | QT curto da hipercalcemia (e QT longo da hipocalcemia) · liga o íon ao traçado | Commons CC-BY | PEDIDO |
| osteodistrofia-renal-rx.webp | raster (Rx) | reabsorção subperiosteal / "rugger-jersey spine" · a osteíte fibrosa do hiperPTH 2º | Commons CC-BY | PEDIDO |
| calcifilaxia-pele.webp | raster (foto clínica) | necrose cutânea da calcifilaxia · o desfecho do produto Ca×PO₄ elevado | Commons CC-BY | PEDIDO |
| paratireoide-hiperplasia-histologia.webp | raster (histologia) | hiperplasia das paratireoides · complementa o esquema atual | Commons CC-BY-SA | PEDIDO |

### M14 — RAAS e eixo endócrino renal
| slug | tipo | o que mostra · por que | fonte/licença provável | status |
|---|---|---|---|---|
| estenose-arteria-renal-angio.webp | raster (angio/CTA) | estenose de artéria renal · HAS renovascular e RAAS↑ por hipoperfusão | Commons CC-BY | PEDIDO |
| adenoma-adrenal-conn-tc.webp | raster (TC) | adenoma adrenal · hiperaldo primário (aldo↑, renina↓, ARR↑↑) | Commons CC-BY | PEDIDO |
| aparelho-justaglomerular-histologia.webp | raster (histologia) | células justaglomerulares + mácula densa · o sensor dos 3 sinais da renina | Commons CC-BY-SA | PEDIDO |
| esfregaco-anemia-drc.webp | raster (microscopia) | esfregaço normocítico-normocrômico · o efeito da queda de EPO | Commons CC-BY | PEDIDO |

<!-- ===== continuação do backlog (QA 2026-06, módulos M11–M39) ===== -->

### M11 — Potássio (o eletrólito que mata)
| slug | tipo | o que mostra · por que | fonte/licença provável | status |
|---|---|---|---|---|
| ecg-hipercalemia-progressao.webp | raster (ECG) | T apiculada → PR longo → QRS alargado → onda sinusoidal · o ECG como mecanismo (a pérola raster mais forte do braço) | Commons CC-BY / Life in the Fast Lane CC | PEDIDO |
| ecg-hipocalemia-onda-u.webp | raster (ECG) | onda U / ST deprimido / QT aparente longo da hipoK · o espelho da hiperK | Commons CC-BY | PEDIDO |

### M15 — Ureia/creatinina e a urina
| slug | tipo | o que mostra · por que | fonte/licença provável | status |
|---|---|---|---|---|
| cilindro-granuloso-marrom-lama.webp | raster (microscopia urina) | cilindro granuloso pigmentado (muddy brown) · o achado que sela NTA vs pré-renal | Commons CC-BY | PEDIDO |
| cristal-oxalato-envelope.webp | raster (microscopia urina) | cristal de oxalato de cálcio "envelope" · ancora etilenoglicol (gancho M33) | Commons CC-BY | PEDIDO |
| cilindro-hematico-dismorfico.webp | raster (microscopia urina) | cilindro hemático + hemácias dismórficas · a urina nefrítica (glomerular) | Commons CC-BY | PEDIDO |

### M16 — LRA por mecanismo (KDIGO)
| slug | tipo | o que mostra · por que | fonte/licença provável | status |
|---|---|---|---|---|
| nta-histologia-he.webp | raster (histologia) | epitélio tubular desnudado / cilindros · a NTA "ao microscópio" (Fig. 4 hoje é SVG) | Commons CC-BY-SA | PEDIDO |
| hidronefrose-ultrassom.webp | raster (US) | dilatação pielocalicial · a pós-renal (P_BC↑) concreta | Radiopaedia/Commons CC-BY | PEDIDO |
| nia-eosinofiluria.webp | raster (microscopia urina) | eosinófilos urinários (Hansel) · a NIA por fármaco | Commons CC-BY | PEDIDO |

### M19 — Princípios físicos do transporte
| slug | tipo | o que mostra · por que | fonte/licença provável | status |
|---|---|---|---|---|
| fibra-oca-membrana-mev.webp | raster (MEV) | parede/poros de uma fibra oca · concretiza "a membrana peneira" (Fig. 7) | Commons CC-BY | PEDIDO |
| cartucho-adsorcao-cutaway.webp | raster (foto) | leito de esferas de carvão/adsorvente (hemoperfusão/CytoSorb) · a adsorção real | Commons CC-BY / fabricante PD | PEDIDO |

### M20 — O circuito extracorpóreo
| slug | tipo | o que mostra · por que | fonte/licença provável | status |
|---|---|---|---|---|
| maquina-hd-circuito-montado.webp | raster (foto) | máquina de HD com o circuito sanguíneo montado · o circuito real (Fig. 1) | Commons CC-BY | PEDIDO |
| dialisador-fibra-oca-cutaway.webp | raster (foto) | corte de um dialisador de fibra oca · onde mora o clearance | Commons CC-BY | PEDIDO |
| bomba-rolete-cabecote.webp | raster (foto) | cabeçote da bomba peristáltica/rolete · o Qb gerado | Commons CC-BY | PEDIDO |
| fistula-vs-cateter.webp | raster (foto clínica) | FAV madura × cateter tunelizado · os acessos e suas pressões | Commons CC-BY | PEDIDO |

### M21 — A membrana e o clearance
| slug | tipo | o que mostra · por que | fonte/licença provável | status |
|---|---|---|---|---|
| feixe-fibras-dialisador-mev.webp | raster (MEV/foto) | feixe de fibras / corte do dialisador · KoA = área × permeabilidade | Commons CC-BY | PEDIDO |
| poros-membrana-highflux-mev.webp | raster (MEV) | superfície porosa high-flux × low-flux · o sieving por tamanho | Commons CC-BY | PEDIDO |

### M22 — A sessão de HDI
| slug | tipo | o que mostra · por que | fonte/licença provável | status |
|---|---|---|---|---|
| maquina-hd-monitor-ktv.webp | raster (foto) | tela do monitor com Kt/V/URR/UF · a dose medida ao vivo | Commons CC-BY | PEDIDO |
| linhas-sanguineas-acesso.webp | raster (foto) | linhas arterial/venosa no acesso · gradiente e recirculação | Commons CC-BY | PEDIDO |

### M23 — UF e balanço de volume
| slug | tipo | o que mostra · por que | fonte/licença provável | status |
|---|---|---|---|---|
| critline-rbv-trace.webp | raster (tela/gráfico) | traçado de volume sanguíneo relativo (Crit-Line) · UF > refilling em tempo real | Commons CC-BY / fabricante PD | PEDIDO |
| lung-us-linhas-b.webp | raster (US) | linhas B pulmonares · a sobrecarga que o peso seco persegue | Commons CC-BY | PEDIDO |
| edema-cacifo-foto.webp | raster (foto) | edema com cacifo · o volume a remover | Commons CC-BY | PEDIDO |

### M27 — Terapias contínuas (TRRC)
| slug | tipo | o que mostra · por que | fonte/licença provável | status |
|---|---|---|---|---|
| maquina-crrt-console.webp | raster (foto) | console de TRRC (Prismaflex/multiFiltrate) + hemofiltro + bolsas · o "contínuo" real (Fig. 2) | Commons CC-BY / fabricante PD | PEDIDO |

### M28 — Dose e fluidos na TRRC
| slug | tipo | o que mostra · por que | fonte/licença provável | status |
|---|---|---|---|---|
| crrt-bolsas-efluente-reposicao.webp | raster (foto) | bolsas de efluente e reposição na TRRC · "o efluente É a dose" (mL/kg/h) | Commons CC-BY / fabricante PD | PEDIDO |

### M29 — Anticoagulação do circuito
| slug | tipo | o que mostra · por que | fonte/licença provável | status |
|---|---|---|---|---|
| citrato-regional-setup.webp | raster (foto/esquema-foto) | linha de citrato pré-filtro + cálcio pós-filtro · os dois pontos / os dois cálcios (Fig. 4) | Commons CC-BY / fabricante PD | PEDIDO |

### M30 — Diálise peritoneal
| slug | tipo | o que mostra · por que | fonte/licença provável | status |
|---|---|---|---|---|
| efluente-pd-turvo.webp | raster (foto) | bolsa de efluente peritoneal turvo · a peritonite (diagnóstico visual) | Commons CC-BY | PEDIDO |
| cateter-tenckhoff-exit-site.webp | raster (foto clínica) | cateter de Tenckhoff / orifício de saída · o acesso peritoneal | Commons CC-BY | PEDIDO |

### M33 — Remoção de toxinas
| slug | tipo | o que mostra · por que | fonte/licença provável | status |
|---|---|---|---|---|
| cristais-oxalato-etilenoglicol.webp | raster (microscopia urina) | cristais de oxalato de cálcio · etilenoglicol (HD remove o tóxico E o ácido) | Commons CC-BY | PEDIDO |

### M34 — Síndrome de desequilíbrio dialítico
| slug | tipo | o que mostra · por que | fonte/licença provável | status |
|---|---|---|---|---|
| edema-cerebral-tc-rm.webp | raster (TC/RM FLAIR) | sulcos apagados / substância branca brilhante · o edema do desequilíbrio (Fig. 6 promete a RM) | Radiopaedia/Commons CC-BY | PEDIDO |

### M37 — Síndrome cardiorrenal e a UF
| slug | tipo | o que mostra · por que | fonte/licença provável | status |
|---|---|---|---|---|
| pocus-vci-dilatada.webp | raster (US POCUS) | VCI dilatada sem colapso · a congestão VENOSA (PVC↑) que derruba a TFG | Commons CC-BY | PEDIDO |
| rx-torax-edema-pulmonar.webp | raster (Rx) | congestão/edema pulmonar no Rx · o alvo da descongestão | Commons CC-BY | PEDIDO |
