# CLAUDE.md — FILTRA · DIALISA · braço 3 do hexápode de medicina crítica

> Guia operacional canônico deste repositório, para qualquer sessão de agente (Claude Code) que venha a
> construí-lo. Lê-se de cima a baixo: contexto do produto → braços vizinhos → ESTE braço em detalhe →
> rito de construção → padrão de robustez → fronteira clínica. A constituição filosófica completa está em
> `FILTRA.md`; este arquivo é o **mapa de trabalho**.
>
> Regra-zero: **o motor manda no pixel.** Fisiologia → engine puro → teste Node → HTML single-file →
> validação jsdom → índice → CI. Nenhuma etapa pula. 0 falhas ou não entra.

---

## 0. Como usar este arquivo

- **Antes de construir qualquer módulo**, leia §4 (a escada) e §5–§6 (o rito e o padrão de robustez).
- **Ao construir**, espelhe o padrão dos braços já prontos (`Respira`, `Choca`): mesma estrutura de pastas,
  mesmo estilo de engine/teste/validador, mesmo cromo single-file.
- **Toda dose/conduta** vem com unidade e mecanismo, computada pelo motor (ver §8 · escopo farmacológico).
- **Sempre** rode `npm run check` antes de considerar um módulo pronto.

---

## 1. O hexápode de medicina crítica

Seis braços, cada um o eixo de um sistema, cada um um repositório independente, cada um uma máquina
educacional offline de fisiologia causal. O aluno não decora listas; ele decompõe mecanismos.

| # | Braço | Eixo fisiológico | Repo | Estado |
|---|-------|------------------|------|--------|
| 1 | **RESPIRA · VENTILA** | troca gasosa + bomba mecânica de ar | `Respira` | concluído |
| 2 | **PERFUNDE · CHOCA** | transporte de O₂ + falência circulatória (choque) | `Choca` | concluído |
| 3 | **FILTRA · DIALISA** | filtração, meio interno e substituição renal | `Filtra` | **este braço — em construção** |
| 4 | ALIMENTA · DESNUTRE | nutrição, catabolismo e reabilitação metabólica | — | planejado |
| 5 | METABOLIZA · INTOXICA | fígado, metabolismo e toxicologia | — | planejado |
| 6 | CONSCIÊNCIA · COMA | neurocrítico — PPC, PIC, autorregulação | — | planejado |

Tese comum do hexápode:

> **O número resultante (PaO₂, PAM, creatinina, glicemia, GCS) é uma sombra. A fisiologia mora nos termos
> que produziram esse número. Ensinar é forçar a decomposição antes da interpretação.**

Os braços conversam. FILTRA recebe o sangue que PERFUNDE entrega (perfusão renal = DC × pressão); a
síndrome cardiorrenal e a hepatorrenal são pontes vivas; o equilíbrio ácido-base do rim fala com a
ventilação do braço 1; a uremia e os distúrbios eletrolíticos voltam a falar com o coração e a consciência.

---

## 2. Os braços já concluídos (o padrão a espelhar)

### 2.1 Braço 1 · RESPIRA · VENTILA — repo `Respira`

O primeiro braço, concluído. Domínio: fisiologia respiratória e biomecânica ventilatória — troca gasosa,
mecânica pulmonar, a bomba de ar e sua falência. Foi ele que estabeleceu, junto com o Choca, o **rito
canônico**: engine puro → teste → HTML single-file → validador jsdom → índice → CI; caso clínico,
trilha socrática, instrumento computado ao vivo, lab com veredito, tutor gráfico, fronteira SaMD.

> Ao precisar de detalhe do conteúdo do braço 1, consulte o repo `Respira` diretamente — não presuma a
> lista de módulos dele a partir deste arquivo.

### 2.2 Braço 2 · PERFUNDE · CHOCA — repo `Choca` (o modelo de referência mais próximo)

O braço gêmeo de FILTRA e a **referência técnica direta**. Ensina choque como falência da entrega de O₂
(`PAM = DC × RVS`), não como pressão baixa. Escada publicada e validada (`npm run check`, 0 falhas):

```text
Bloco 0 · Fundamentos do transporte
  0  Matemática do transporte      1  Conteúdo de O₂ (CaO₂)      2  A curva como entrega
Bloco I · Os determinantes
  3  Débito cardíaco   4  Interseção de Guyton   5  Guyton aplicado (responsivo ≠ tolerante)
  6  Frank-Starling    7  Pós-carga & alça PV    8  DO₂/VO₂ & supply-dependence
Bloco II · A inversão e a leitura
  9  PAM = DC × RVS   10  Monitorização   11  POCUS & acessos   12  Microcirculação   13  Lactato
Bloco III · Os choques
  14 Hipovolêmico  15 hemorrágico×não-hemorrágico  16 Cardiogênico  17 ventrículo direito
  18 Obstrutivo    19 tamponamento·TEP·pneumotórax 20 Distributivo  21 Séptico  22 anafilático×neurogênico
Bloco IV · Integração e resgate
  23 Choque misto  24 O coração-pulmão  25 Ressuscitação volêmica  26 Choque críptico/compensado
  27 Os 4 perfis·radar  28 Vasopressores & inotrópicos  29 Capstone integrado
Bloco V · Avaliação
  30 Revisão global · exame de domínio · 100 questões
```

Padrões herdados do Choca que ESTE braço repete:
- Engines puros e resilientes (`clampv` contra `NaN`/`null`), com função-mãe + alavancas de mecanismo.
- Pérolas computadas pelo motor (ex.: no Choca, "a mesma PEEP descarrega o VE e esmaga o VD";
  "a CVP engana sob PEEP"; "a PAM mente no choque críptico"). FILTRA terá as suas (ver §4).
- Camada interativa: caso com decisões, "prever-depois-revelar"; e (padrão deste braço) dois blocos de
  questões — ilustrado e textual, 10 cada, dificuldade crescente.
- Validador jsdom que confere engine ≡ UI (e, neste braço, exige dose↔unidade↔mecanismo — ver §8).
- Rodapé de série obrigatório: `CRM-SP 151.318 · Dr. Matheus M. Coelho · Limeira`.

---

## 3. Os braços futuros (planejados)

- **Braço 4 · ALIMENTA · DESNUTRE** — nutrição, catabolismo da doença crítica, reabilitação metabólica.
  Tese provável: *desnutrição crítica não é falta de calorias; é falência do uso do substrato.*
- **Braço 5 · METABOLIZA · INTOXICA** — fígado, metabolismo de fármacos, toxicologia. Tese provável:
  *a intoxicação é farmacologia com o sinal trocado; a insuficiência hepática é a perda da fábrica/filtro.*
- **Braço 6 · CONSCIÊNCIA · COMA** — neurocrítico: PPC = PAM − PIC, autorregulação, herniação, morte encefálica.
  Tese provável: *o cérebro é o órgão que não tolera nem isquemia nem pressão; a perfusão é tudo.*

Estes ainda não têm repositório. Quando nascerem, herdam este mesmo CLAUDE.md adaptado.

---

## 4. ESTE braço · FILTRA · DIALISA

### 4.1 Identidade e teses

O rim é o **defensor do meio interno**: filtra o plasma, reabsorve/secreta seletivamente e regula —
minuto a minuto — volume, eletrólitos, equilíbrio ácido-base e a depuração de escórias. O braço cobre a
fisiologia (FILTRA), a falência (lesão renal aguda), a **farmacologia** que age sobre o néfron e o eixo
endócrino, e a substituição por máquina (DIALISA).

```text
Tese FILTRA   : LRA não é creatinina alta. É a falência da regulação do meio interno
                (volume, eletrólitos, ácido-base, escórias).
Tese FÁRMACO  : cada diurético é uma chave numa fechadura de UM segmento do néfron; a curva
                dose-resposta é fisiologia, não tabela. Anti-hipertensivos e bloqueadores do
                RAAS movem a hemodinâmica glomerular (aferente × eferente).
Tese DIALISA  : a diálise não substitui o rim. Substitui — parcialmente — algumas funções,
                por mecanismos físicos: difusão, convecção, ultrafiltração e adsorção.
```

### 4.2 A inversão causal

**Filtração (o eixo equivalente ao `PAM = DC × RVS` do Choca):**

```text
TFG = Kf · ( P_GC − P_BC − π_GC )
```

A mesma oligúria/creatinina nasce de mecânicas opostas — P_GC↓ (pré-renal), túbulo/Kf lesado (intrínseca),
P_BC↑ (pós-renal/obstrução). **Decompor antes de interpretar.**

**Substituição (o eixo da máquina):**

```text
remoção de SOLUTO  ← difusão (gradiente de concentração) + convecção (arraste por solvente)
remoção de VOLUME  ← ultrafiltração (gradiente de pressão transmembrana, TMP)
```

### 4.3 Espinha quantitativa

```text
TBW = peso · fração(sexo)          ICF ≈ 2/3 TBW   ECF ≈ 1/3 TBW   plasma ≈ 1/4 ECF
tonicidade = Σ osmoles EFETIVOS / TBW            (governa o tamanho da célula)
osmolalidade medida = (efetivos + inefetivos) / TBW   (ureia entra aqui, não na tonicidade)
Na⁺ ≈ tonicidade / 2
TFG = Kf · (P_GC − P_BC − π_GC)    FF = TFG / FPR
C_x = (U_x · V̇) / P_x             FE_Na = (U_Na·P_Cr)/(P_Na·U_Cr)·100
AG = Na⁺ − (Cl⁻ + HCO₃⁻)          pH = 6,1 + log₁₀(HCO₃⁻ / (0,03·PaCO₂))
Kt/V, URR                          dose/adequação de diálise
TMP → ultrafiltração               KoA, sieving → clearance da membrana
efeito = Emax·D / (EC50 + D)       dose-resposta sigmoide; teto; o braking desloca a curva à direita
RAAS: renina → AngII (constrição eferente) → aldosterona (Na⁺↑ / K⁺↓)
dose renal de fármaco ← Vd · ligação proteica · fração renal · clearance (e o que a diálise remove)
```

### 4.4 A escada de módulos — FILTRA (19) + DIALISA (20) + exame

> Numeração canônica: a metade **FILTRA** ocupa **M0–M18** (19 módulos: anatomia funcional → meio interno →
> falência → farmacologia integrada); a metade **DIALISA** ocupa **M19–M38** (20 módulos); o **M39** é o
> exame global de domínio. Cada `filtraN.html` é single-file, com engine puro, teste, validador, caso de 5
> atos, trilha socrática, instrumento vivo, lab com veredito, dois blocos de questões (ilustrado + textual,
> 10 cada), ilustrações de conceito em SVG e disclaimer educacional. O
> "erro cognitivo" entre parênteses é a confusão que o módulo corrige; `[fármaco: …]` marca a farmacologia
> **encadeada no segmento** (estrutura híbrida, §8): a droga é a alavanca daquele segmento, e dois capstones
> (M17–M18) integram tudo.

#### Metade A · FILTRA — anatomia funcional, meio interno e farmacologia (M0–M18, 19 módulos)

```text
Bloco 0 · Fundamentos — a água e a filtração
  M0  Compartimentos do líquido corporal — a célula no oceano        [CONSTRUÍDO ✓]
        (erro: "a célula é isolada"; verdade: tonicidade ≠ osmolalidade medida; a ureia é osmol inefetivo)
  M1  O néfron / forças de Starling glomerulares (aferente×eferente) [CONSTRUÍDO ✓]
        (erro: "oligúria = pouca água"; verdade: P_GC mora entre duas resistências; autorregulação + precipício)
Bloco I · O glomérulo, a hemodinâmica e a medida
  M2  Hemodinâmica renal — 20% do DC, autorregulação miogênica + feedback tubuloglomerular; córtex × medula
        (erro: "o rim recebe pouco fluxo"; verdade: 20% do DC; a medula vive à beira da hipóxia — o parênquima
         e suas lesões isquêmicas)                                   [fármaco: AINEs (aferente), IECA/BRA (eferente)]
  M3  O glomérulo — barreira de filtração, Kf, podócito, proteinúria por mecanismo
        (erro: "proteinúria = rim falhando"; verdade: glomerular × tubular; a barreira de carga e tamanho)
  M4  Clearance — medir a função, e por que a creatinina mente
        (erro: "creatinina = função"; verdade: cinética lenta, massa muscular, secreção tubular)
Bloco II · O túbulo, segmento a segmento (transportador = alavanca, droga = chave)
  M5  TCP — reabsorção isosmótica, Na/glicose (SGLT2), HCO₃/anidrase carbônica, Fanconi
        (erro: "o proximal só reabsorve"; verdade: 65% do Na sai aqui; a alça é prisioneira do proximal)
                                                          [fármaco: acetazolamida, SGLT2i, manitol]
  M6  Alça de Henle — fina descendente × ramo espesso (NKCC2), contracorrente, gradiente corticomedular
        (erro: "a alça concentra urina"; verdade: ela cria o gradiente; o ramo espesso é o motor diluidor)
                                                          [fármaco: diuréticos de alça — furosemida/bumetanida/torasemida, dose-resposta]
  M7  TCD — NCC, manejo de Ca²⁺, o segmento diluidor distal
        (erro: "tudo é igual no túbulo"; verdade: o TCD ajusta fino; NCC e o paradoxo do Ca dos tiazídicos)
                                                          [fármaco: tiazídicos]
  M8  Ducto coletor — célula principal (ENaC/aldosterona) × intercalar (H⁺/HCO₃), ADH/aquaporinas
        (erro: "aldosterona = sódio"; verdade: troca Na por K/H; o ADH abre aquaporinas — duas alavancas)
                                                          [fármaco: poupadores de K (espironolactona/eplerenona, amilorida), vaptanos]
Bloco III · O meio interno (o que o rim defende)
  M9  Sódio e volume — o rim defende o VOLUME circulante efetivo, não a concentração
        (erro: "Na baixo = falta de sal"; verdade: Na é proxy de água; volume e tonicidade são eixos distintos)
  M10 Água livre e o sódio — disnatremias são distúrbios de ÁGUA (ADH/vasopressina, sede, clearance de água livre)
        (erro: "tratar o número Na"; verdade: corrigir a água; a velocidade importa — mielinólise/edema)
  M11 Potássio — secreção distal, aldosterona, shift transcelular; o eletrólito que mata
        (erro: "K total"; verdade: gradiente transcelular × estoque; pH, insulina, β; ECG como mecanismo)
  M12 Cálcio · fósforo · magnésio — o eixo ósseo-mineral (PTH, vitamina D, FGF23)
        (erro: "cálcio sérico = cálcio"; verdade: ionizado, albumina, pH; o triângulo Ca-PO₄-PTH)
  M13 Ácido-base renal — HCO₃⁻ reabsorvido, NH₄⁺, acidez titulável; ânion gap e delta-delta
        (erro: "pH é respiratório"; verdade: o rim regula o HCO₃⁻; AG, delta-delta, ATRs por mecanismo)
Bloco IV · O rim como glândula e a leitura da urina
  M14 RAAS e o eixo endócrino renal — renina→AngII→aldosterona, ADH/vasopressina, eritropoetina, vitamina D
        (erro: "o rim só filtra"; verdade: é glândula — sente pressão/Na/O₂ e responde com hormônios)
  M15 Ureia, creatinina, eGFR e a urina — FE_Na, FE_ureia, sedimento, índices urinários
        (erro: "número isolado"; verdade: a urina conta a história; índices separam pré-renal de NTA)
Bloco V · A falência e a farmacologia integrada (capstones)
  M16 A LRA por mecanismo — KDIGO; pré-renal / intrínseca (NTA·NIA·glomerular) / pós-renal  [capstone fisiológico]
        (erro: "LRA é um diagnóstico"; verdade: é uma sombra com 3 mecanismos; cardiorrenal e hepatorrenal)
  M17 Farmacologia diurética integrada — o néfron inteiro como alvo: dose-resposta, teto, braking,
        resistência, bloqueio sequencial e sinergia (do TCP ao ducto coletor)            [capstone farmacológico 1]
        (erro: "dobrar a dose sempre faz mais xixi"; verdade: há teto e há braking; a sinergia mora na sequência)
  M18 Farmacologia anti-hipertensiva, do RAAS e do eixo endócrino-renal — IECA/BRA/IDR/ARM/sacubitril;
        EPO/ESA, quelantes de P, calcimiméticos, análogos de vit D; ajuste renal de fármacos (Vd, ligação,
        clearance)                                                                       [capstone farmacológico 2]
        (erro: "creatinina subiu, suspenda o IECA"; verdade: a queda da TFG pelo eferente pode ser o efeito esperado)
```

#### Metade B · DIALISA — substituição renal e terapia crítica (M19–M38, 20 módulos)

```text
Bloco VI · Princípios e o circuito
  M19 Princípios físicos do transporte — difusão · convecção · ultrafiltração · adsorção (a base de tudo)
  M20 O circuito extracorpóreo — acesso, bomba, dialisador, fluxos (Qb, Qd), pressões (TMP)
  M21 A membrana e o clearance — KoA, permeabilidade, sieving, backfiltration (high-flux × low-flux)
Bloco VII · Hemodiálise intermitente (HDI)
  M22 A sessão de HDI — gradientes, eficiência × tempo; por que "intermitente" tem custo
  M23 Ultrafiltração e o balanço de volume — peso seco, taxa de UF, refilling plasmático
  M24 Hipotensão intradialítica — o mecanismo (UF > refilling), o stunning miocárdico, a tolerância
  M25 Dose e adequação — Kt/V, URR, clearance; a prescrição de dose (alvo, tempo, fluxos por mecanismo)
  M26 Cinética da ureia — compartimento único × duplo, rebote pós-diálise; o tempo importa
Bloco VIII · Terapias contínuas e alternativas
  M27 Terapias contínuas (TRRC/CRRT) — CVVH (convecção) × CVVHD (difusão) × CVVHDF; por que "contínuo"
  M28 Dose e fluidos na TRRC — efluente mL/kg/h, pré × pós-diluição; a prescrição da dose contínua
  M29 Anticoagulação do circuito — citrato regional (quelação de Ca²⁺) × heparina; protocolos e doses
  M30 Diálise peritoneal — o peritônio como membrana; UF osmótica pela glicose; PET/tipos de transportador
  M31 SLED / híbridas — o meio-termo entre HDI e TRRC; o racional hemodinâmico
Bloco IX · O que a diálise remove — e os perigos
  M32 Depuração de solutos e drogas — peso molecular, ligação proteica, Vd; dosagem de fármacos na diálise
  M33 Remoção de toxinas — intoxicações dialisáveis (lítio, salicilato, metanol, etilenoglicol); indicação e dose
  M34 Síndrome de desequilíbrio dialítico — edema cerebral por osmose reversa; o gradiente que machuca
Bloco X · Indicação, momento e integração
  M35 Indicações de TRS — o AEIOU (acidose, eletrólitos, intoxicação, sobrecarga, uremia) como mapa de conduta
  M36 O momento da substituição — quando iniciar: os gatilhos, precoce × tardio, e o mecanismo que pede suporte
  M37 Síndrome cardiorrenal e a ultrafiltração — coração, rim e volume na falência mútua; diuréticos × UF (ponte com Choca)
  M38 Capstone integrado — LRA grave → escolha de modalidade e prescrição POR MECANISMO → meio interno restaurado
Bloco XI · Avaliação
  M39 Revisão global · exame de domínio · 100 questões (psicométrico, como nos outros braços)
```

Pontes obrigatórias com o Choca: M16/M37 ↔ Choca M16/M23 (cardiogênico, misto); M16 (hepatorrenal) ↔ Choca
M20 (distributivo); M9–M10 (volume) ↔ Choca M4/M5 (Guyton, responsivo≠tolerante) e M25 (ressuscitação volêmica);
M18 (anti-hipertensivos & RAAS) ↔ Choca M28 (vasopressores & inotrópicos) — as duas faces da hemodinâmica.

### 4.5 Estado atual da construção

```text
FEITO  · M0  engine model0.js + test0.node.js (108 OK · fuzz 5000) + filtra0.html (Darrow–Yannet vivo)
             + validate0.js (40 OK) — módulo completo, no rito do §5
HARNESS· package.json (test:0/validate:0/check) · .github/workflows/check.yml · curriculum.json ·
             filtra.html (índice) · FILTRA.md (constituição) · README.md (porta de entrada) · .gitignore
A FAZER· M1 (néfron/Starling): build/m1/model1.js + test1.node.js → filtra1.html + validate1.js → seguir a escada §4.4
```

`npm run check` = `npm test && npm run validate` → **verde** (M0: 108 OK no engine + 40 OK no validador).
Nota: `jsdom` é dependência só de validação; o produto publicado é offline e sem dependências de runtime.

---

## 5. O rito de construção (por módulo, em ordem)

```text
1. build/mN/modelN.js        engine PURO (a fórmula primeiro; nada de UI)
2. build/mN/testN.node.js    bateria de robustez (ver §6) — 0 falhas
3. filtraN.html              single-file: caso(5 atos) · trilha · instrumento vivo · lab · ilustrações de
                             conceito (SVG) · Avaliação com 2 blocos (ilustrado 10 + textual 10)
4. build/mN/validateN.js     portão jsdom: estrutura · engine≡UI · interativo · 2 bancos+ilustração · cromo ·
                             guarda farmacológica (dose↔unidade↔mecanismo)
5. package.json              adicionar test:N e validate:N (e ao agregado test/validate/check)
6. filtra.html               índice: cartão do módulo de "em breve" → "disponível"
7. curriculum.json           manifesto curricular (status do módulo)
8. npm run check             0 falhas ou não entra
```

Ordem inviolável: **engine antes da UI**. Uma UI que contradiz o engine é bug crítico.

---

## 6. O padrão "robustez inigualável" (obrigatório em todo engine + teste)

Este é o diferencial do projeto. Todo `modelN.js` e `testN.node.js` deve cumprir:

### Engine (`modelN.js`)
- Funções **puras**, **determinísticas**, comentadas; uma função-mãe + helpers + **alavancas de mecanismo**.
- `clampv(v,a,b)` resiliente: `Number(v)`; `NaN`/não-número → piso. **Nenhuma entrada propaga `NaN`.**
- Defaults sensatos para todo campo; **não mutar** o objeto de entrada.
- Laços de ponto-fixo (quando houver) **amortecidos** (relaxação) para convergir e não oscilar.
- `module.exports` sob guarda `typeof module!=='undefined'` (roda em Node e inline no HTML).

### Teste (`testN.node.js`) — espelhar a estrutura dos M0/M1 já entregues
```text
1. LINHA DE BASE      valores caem em faixas FISIOLÓGICAS conhecidas
2. IDENTIDADES        relações estruturais que valem SEMPRE (conservação, definições) — tol 1e-7
3. LEIS               monotonicidade: cada termo move a saída no sentido certo (separe os pontos)
4. PÉROLAS            o achado contra-intuitivo do módulo, provado pelo motor
5. DETERMINISMO       mesma entrada → saída idêntica; entrada Object.freeze não lança nem é mutada
6. ROBUSTEZ           sem-arg / null / NaN / strings / absurdos → tudo finito, dentro dos clamps
7. FUZZING            PRNG SEMEADO (mulberry32) ≥ 5000 entradas, 30% "malignas" (NaN/∞/string/±enormes);
                      assert: nenhuma NaN/∞, clamps respeitados, identidades/conservação intactas
8. SAÍDA              "<oks> OK · <falhas> falhas"; process.exit(falhas>0?1:0)
```
Critério: o teste é **determinístico entre execuções** (rode 3×, saída idêntica). Cobertura > aparência.

### HTML (`filtraN.html`)
- Single-file, **offline**, zero CDN/rede, links relativos; engine **inline** (espelho fiel do `modelN.js`).
- Abas: **Caso** (5 atos) · **Trilha** (socrática, ≥9 passos, pistas) · **Instrumento** (canvas computado ao
  vivo) · **Lab** (sliders + veredito + banners) · **Avaliação** (DOIS blocos por módulo — **ilustrado** ≥10,
  cada questão com sua ilustração, e **textual** ≥10; ambos com dificuldade crescente).
- **Ilustração viva (padrão deste braço):** os conceitos ganham ilustrações **inline em SVG** (offline, sem
  rede), **computadas a partir do engine** quando o dado é numérico (mini Darrow–Yannet, barras
  osm×tonicidade, setas de fluxo de água, esquema do néfron/segmento) — nunca imagens importadas. Aumentar
  os elementos ilustrativos é objetivo explícito do FILTRA.
- Camada interativa: caso com decisões + "prever-depois-revelar".
- Disclaimer educacional + nota de honestidade do modelo + rodapé de série + backlink relativo ao índice.

### Validador (`validateN.js`)
- jsdom `runScripts:'dangerously'`; confere IDs estruturais, `engine ≡ UI`, lab/veredito, camada interativa,
  os **dois bancos** (`TUTOR_ILUSTRADO` ≥10 — cada item com ilustração SVG não-vazia — e `TUTOR_TEXTUAL` ≥10),
  que a aba Avaliação **renderize a ilustração** no DOM, e o cromo (kicker/rodapé/pontes). **Guarda
  farmacológica (invertida — ver §8):** nos módulos com fármacos, EXIGE que toda dose traga unidade explícita
  (`mg/mcg/µg/mL·h⁻¹`) ancorada a um mecanismo, que o motor de dose-resposta case com a UI, e que o disclaimer
  educacional esteja presente.

### CI
- `.github/workflows/check.yml` roda `npm run check` em push/PR. Verde é mandatório para mesclar.

---

## 7. Convenções de arquivo, nomenclatura e cromo

```text
filtra.html                índice do braço (com a navegação do hexápode no topo, ver abaixo)
filtraN.html               módulo N, single-file
build/mN/modelN.js         engine puro
build/mN/testN.node.js     teste Node
build/mN/validateN.js      validador jsdom
package.json               scripts test:N / validate:N / test / validate / check
curriculum.json            manifesto curricular legível por máquina (escada + formato do módulo)
FILTRA.md                  constituição do braço (o porquê)
README.md                  porta de entrada do repo (o quê + como rodar)
CLAUDE.md                  este guia (o como)
```

- **Idioma:** português do Brasil, prosa causal e seca, setas quando úteis (↑↓→).
- **Rodapé obrigatório** em todo módulo: `CRM-SP 151.318 · Dr. Matheus M. Coelho · Limeira`.
- **Navegação do hexápode** no topo do índice: pílulas para os braços; o braço atual fica ativo, os sem
  página ainda ficam "em breve" (desabilitados, sem link quebrado) — padrão já usado no índice do Choca.
- **NÃO** versionar `node_modules/` (`.gitignore`).

---

## 8. Fronteira clínica · escopo farmacológico e de conduta (decisão do autor)

> **Mudança constitucional (2026-06).** Diferente dos braços-irmãos `Respira` e `Choca`, que mantêm o
> hard-stop de SaMD (mecanismo sim; dose/alvo/prescrição, não), o **FILTRA · DIALISA abre deliberadamente o
> escopo** para a farmacologia clínica aplicada e a conduta. A decisão é do autor (Dr. Matheus M. Coelho) e
> vale **apenas para este braço** — não retroage aos demais nem ao padrão geral do hexápode.

FILTRA · DIALISA é uma máquina de **raciocínio clínico-fisiológico aplicado**. Continua ensinando o
mecanismo primeiro — mas agora leva o mecanismo até a conduta: o fármaco, a dose, a curva dose-resposta, a
sugestão terapêutica e a prescrição de diálise entram como conteúdo de primeira classe, sempre **computados
pelo motor** e amarrados ao mecanismo que os justifica. O princípio "engine antes da UI" não muda: uma dose
exibida que o motor não computou é bug crítico.

```text
EM ESCOPO (agora permitido e encorajado)        ÂNCORA OBRIGATÓRIA (a forma de fazer)
farmacologia completa dos diuréticos            toda dose traz unidade explícita + faixa + mecanismo
  (alça, tiazídico, poupador de K, anidrase      (nunca um número solto; sempre o "por quê")
   carbônica, osmótico, SGLT2, vaptano):        dose/efeito vêm do engine (dose-resposta), não de tabela fixa
   alvo molecular, PK, PD, dose-resposta,       a UI computada ≡ engine (validador confere)
   teto, resistência, sinergia                  disclaimer educacional + nota de honestidade do modelo
anti-hipertensivos de ação renal + RAAS
  (IECA, BRA, IDR, ARM, sacubitril): doses
  e efeito hemodinâmico glomerular
eixo endócrino-renal farmacológico
  (EPO/ESA, quelantes de P, calcimiméticos,
   análogos de vit D)
ajuste renal de fármacos (Vd, ligação,
  clearance; o que a diálise remove)
prescrição de diálise por mecanismo
  (Kt/V-alvo, tempo, fluxos, dose de TRRC
   mL/kg/h, anticoagulação, gatilho de início)
sugestões de conduta terapêutica
```

Responsabilidade (o que permanece, mesmo com o escopo aberto):
- a ferramenta é **educacional**; não está conectada ao prontuário nem aos monitores de um paciente real e
  não é dispositivo médico certificado. A decisão e a responsabilidade finais são sempre do prescritor.
- mnemônicos clínicos (ex.: **AEIOU** para indicação de TRS) agora podem desaguar em conduta — mas seguem
  ancorados ao mapa de mecanismos que os gera.

Os validadores **invertem a guarda**: em vez de recusar `mg/mcg/µg/mL·h⁻¹` e comandos prescritivos, passam a
**exigir** que toda dose venha com unidade explícita ancorada a um mecanismo e que o motor de dose-resposta
case com a UI. A ausência de dose onde o módulo a promete passa a ser falha.

---

## 9. Para o próximo agente — como pegar e construir o próximo módulo

1. Leia `FILTRA.md` (constituição) e este §4–§6. O **M0 já está completo** (engine + teste + `filtra0.html`
   com o Darrow–Yannet vivo + validador), e serve de molde para os próximos.
2. O próximo módulo é o **M1 — néfron / forças de Starling** (a escada renumerou; ver §4.4): construa a pilha
   inteira no rito do §5 — `build/m1/model1.js` + `test1.node.js` → `filtra1.html` + `build/m1/validate1.js`.
   Instrumento sugerido: curva TFG×PAM com o platô da autorregulação e o precipício pré-renal; o paradoxo do
   eferente (a creatinina sobe porque o IECA *funciona*). **Siga o novo formato** (M0 é o molde): ilustrações
   de conceito em SVG (esquema do néfron/segmento, computado quando numérico) e Avaliação com os **dois
   blocos de 10** (ilustrado + textual).
3. Depois o M2 (hemodinâmica renal — 20% do DC, córtex×medula) e a partir do M5 a farmacologia **encadeada no
   segmento** (§8): a droga é a alavanca daquele túbulo, com dose↔unidade↔mecanismo computados pelo motor.
4. Então siga a escada §4.4, um módulo por vez, sempre fechando com `npm run check` verde.
5. Mantenha o padrão de robustez (§6) em cada novo engine: faixas fisiológicas, identidades, leis,
   determinismo, robustez e **fuzzing semeado ≥ 5000**.

---

## 10. Invariantes do produto (resumo executável)

```text
Offline.                 Nenhum módulo depende de rede.
Single-file por módulo.  O HTML publicado sobrevive sozinho.
Zero dependência runtime.jsdom é só ferramenta de validação.
Sem armazenamento.       Nada de localStorage/telemetria.
Engine antes de UI.      Fórmula validada antes de gráfico.
Física viva.             Gráficos e questões são COMPUTADOS, não imagens.
Ilustração viva.         Conceitos ganham SVG inline; numérico → computado do engine. 2 blocos (ilustrado+textual).
Robustez inigualável.    clamp resiliente + determinismo + fuzzing ≥ 5000 (§6).
Português do Brasil.     Prosa causal, seca, com setas.
Farmacologia viva.       Mecanismo → fármaco → dose/conduta, computados pelo motor (§8).
0 falhas ou não entra.   npm run check é o portão.
```

O alvo final: um sistema em que cada botão obedeça à fisiologia renal, cada fórmula seja testável, cada erro
do aluno revele uma falha conceitual e cada módulo pertença a um mapa causal maior — o mesmo que liga o rim
ao coração, ao pulmão, ao metabolismo e à consciência.
