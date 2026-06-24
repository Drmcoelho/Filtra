# FILTRA·DIALISA — Relatório de QA (revisão global dos 40 módulos)

> Varredura read-only de conteúdo (Conceito/Caso/Trilha/Avaliação, bancos de questões,
> legendas, pontes e gabaritos) sobre M0–M39, em 5 frentes paralelas, **com verificação
> dos achados concretos contra o código** (vários "achados" de revisor foram falsos
> positivos e estão marcados como tal). Data: 2026-06.

## Veredito geral
- **Zero erros clínicos graves** e **zero gabaritos errados** em todo o braço — incluindo
  os 100 itens do exame M39 e toda a farmacologia de doses (M5–M8, M17, M18, M32) com
  unidade+mecanismo ancorados (§8).
- Estrutura (§6) sem bandeiras: caso ≥5, trilha ≥9, figura viva ≥8 em todos; `npm run check` verde.
- Os achados são: (A) bugs de consistência objetivos, (B) calibração clínica para decisão do
  autor, (C) cosméticos de legenda, (D) lacuna sistêmica de **raster** (29/40 módulos só com SVG).

---

## A. Bugs de consistência — objetivos e verificados
| # | Módulo | Achado (verificado no código) | Sugestão |
|---|---|---|---|
| A1 | M19/20/22/26/32/34 | **backlink para `filtra.html`** enquanto os outros 15 DIALISA vão para `dialisa.html`; os 6 validadores fixavam `filtra.html` | **CORRIGIDO neste PR** — backlink → `dialisa.html`; validadores → checagem flexível (padrão M38) |
| A2 | M1 | a legenda da **Fig.6 ensina `P_GC ~55 · π 30 · NFP ~10`**, mas o Lab "Normal ≈" e o engine usam **`P_GC 60 · π 28 · NFP 17`** — o mesmo glomérulo "normal" com dois números | escolher UM conjunto canônico e alinhar legenda + coluna do Lab + defaults do engine (decisão clínica do autor) |
| A3 | M5 | **manitol**: engine `unidade:'g (bolus)', faixa:[12,100]`, mas a prosa diz **`0,25–1 g/kg`** | alinhar a unidade exibida ao que o motor computa (g/kg → engine por peso, ou prosa → g) |
| A4 | M5 | **acetazolamida**: prosa diz `250–500 mg/dia`, engine `faixa:[250,1000]` (o Lab sobe a 1000) | capar a faixa do engine em 500, ou marcar 500–1000 como supraterapêutico |
| A5 | M29 | **heparina sem unidade de dose** (só slider 0→1), enquanto o título promete "protocolos e doses" e o citrato tem mmol/L e mmol/h | adicionar bólus + infusão de HNF em unidades·kg⁻¹·h⁻¹ ancoradas ao alvo de TTPa |
| A6 | M22 | `oscilacaoGrande = urrPct > 70` dispara o alerta "GRANDE BALANÇO" **no próprio alvo de adequação** (URR≈70%) | subir o limiar (ex.: >80%) ou reformular o alerta |

### Falsos positivos (revisor errou — confirmado no código)
- **M16** "Textual com 11 itens": na verdade **12** (rótulo "(12)" correto).
- **M23** "backlink `dialisa.html` quebrado": `dialisa.html` **existe** (é o índice do antebraço).

---

## B. Calibração clínica — decisão do autor (não alterado)
- **M5** — manitol modelado como Emax saturável (`ec50:30`); diurese osmótica é ~linear na
  faixa terapêutica. O "há teto, dobrar rende pouco" vale para SGLT2i, não para o osmótico.
- **M6** — torasemida `ec50:7.5` ≈ 2,7× furosemida; equivalência aceita ~2× (20 mg ≈ 40 mg).
  E falta a **biodisponibilidade VO/IV ~50%** da furosemida no Caso que depende dela.
- **M21** — backfiltration atribuída a "Qd alto"; o motor real é a queda de pressão axial no
  sangue. β2-microglobulina com sieving ~0,95 no high-flux (real ~0,5–0,7).
- **M16** — KDIGO estágio 3 por creatinina `≥4,0` enunciado como absoluto (deveria ser no
  contexto de LRA, com a alta aguda).
- **M20** — o Caso ensina obstrução venosa (dobra/coágulo) como mecanismo, mas o engine não
  tem alavanca para isso (P_venosa só varia com Qb/acesso).
- **M34** — osmoles idiogênicos apresentados como causa do efluxo lento de ureia (o motor
  primário é o transporte lento pela BHE).
- **M36** — sem IDEAL-ICU nem o achado do STARRT-AKI (mais dependência de diálise no braço
  acelerado aos 90 dias).
- **M37** — UF apresentada como resgate sem o caveat do **CARRESS-HF** (UF não superior à
  terapia farmacológica escalonada; mais eventos renais).
- **M34/M39** — "osmose reversa" como nome do desequilíbrio (metáfora; o M34 sinaliza, o M39
  enuncia como fato).

---

## C. Cosméticos de legenda
- **M8** Fig.8, **M5** Fig.9: não decodificam ①②③④ / conflundem reabsorver × regenerar HCO₃.
- **M10** Fig.7: "(Fig. 7)" auto-referente dentro da própria legenda.
- **M17** Fig.13: slug `furosemida-estrutura.svg` usado para "equivalências de potência" (slug × conteúdo).
- **M21** Fig.7: slug `...poros` com legenda de "contracorrente" (slug × conteúdo).
- **M3** Caso Ato 5: membranosa como protótipo de proteinúria **não-seletiva** (GESF é o exemplo limpo).

---

## D. Figura viva — lacuna de raster (worklist em `assets/README.md §4`)
29/40 módulos usam só SVG autoral; os 11 com raster real são o padrão-ouro (M0–M7, M11, M17, M39).
Os PEDIDOs de maior valor pedagógico foram registrados em `assets/README.md §4` (M11–M39),
destacando: **ECG de hiper/hipocalemia (M11)**, **sedimento urinário / cilindros / cristais
(M15/M16/M33)**, **histologia de NTA (M16)**, **máquina de HD e dialisador (M20/M22)**,
**membrana high×low-flux MEV (M19/M21)**, **console de TRRC e bolsas (M27/M28)**, **citrato
regional (M29)**, **efluente PD turvo / Tenckhoff (M30)**, **edema cerebral TC/RM (M34)**,
**POCUS de VCI / Rx de edema pulmonar (M37)**. O download depende de sessão com egress de rede
(o Wikimedia está bloqueado pela política do proxy nesta sessão).

---

## Aplicado neste PR
- **A1** — os 6 backlinks DIALISA → `dialisa.html` + validadores alinhados à checagem flexível.
- **D** — 30 novos PEDIDOs de raster em `assets/README.md §4` (M11–M39).
- Este relatório.

Os itens **A2–A6** (consistência que toca conteúdo/engine) e **B** (calibração clínica) ficam
para decisão do autor — nenhum foi alterado, para não mexer em número clínico sem aval.
