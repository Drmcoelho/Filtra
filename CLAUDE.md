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
- **Nunca** introduza dose, alvo terapêutico acionável ou prescrição (ver §8 · SaMD).
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
- Camada interativa: caso com decisões, "prever-depois-revelar", tutor com banco ≥16 e dificuldade crescente.
- Validador jsdom que recusa dose/alvo (guarda SaMD) e confere engine ≡ UI.
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
fisiologia (FILTRA), a falência (lesão renal aguda) e a substituição por máquina (DIALISA).

```text
Tese FILTRA   : LRA não é creatinina alta. É a falência da regulação do meio interno
                (volume, eletrólitos, ácido-base, escórias).
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
```

### 4.4 A escada de módulos — FILTRA (10) + DIALISA (20) + exame

> Numeração canônica: a metade **FILTRA** ocupa **M0–M9** (10 módulos); a metade **DIALISA** ocupa
> **M10–M29** (20 módulos); o **M30** é o exame global de domínio. Cada `filtraN.html` é single-file, com
> engine puro, teste, validador, caso de 5 atos, trilha socrática, instrumento vivo, lab com veredito,
> tutor gráfico e fronteira SaMD. O "erro cognitivo" entre parênteses é a confusão que o módulo corrige.

#### Metade A · FILTRA — filtração e meio interno (M0–M9, 10 módulos)

```text
Bloco 0 · Fundamentos — a água e a filtração
  M0  Compartimentos do líquido corporal — a célula no oceano        [CONSTRUÍDO ✓]
        (erro: "a célula é isolada"; verdade: tonicidade ≠ osmolalidade medida; a ureia é osmol inefetivo)
  M1  O néfron / forças de Starling glomerulares (aferente×eferente) [CONSTRUÍDO ✓]
        (erro: "oligúria = pouca água"; verdade: P_GC mora entre duas resistências; autorregulação + precipício)
  M2  Clearance — medir a função, e por que a creatinina mente
        (erro: "creatinina = função"; verdade: cinética lenta, massa muscular, secreção tubular)
Bloco I · O meio interno (o que o rim defende)
  M3  Sódio e volume — o rim defende o VOLUME circulante efetivo, não a concentração
        (erro: "Na baixo = falta de sal"; verdade: Na é proxy de água; volume e tonicidade são eixos distintos)
  M4  Água livre e o sódio — disnatremias são distúrbios de ÁGUA (ADH, sede, clearance de água livre)
        (erro: "tratar o número Na"; verdade: corrigir a água; a velocidade importa — mielinólise/edema)
  M5  Potássio — secreção distal, aldosterona, shift transcelular; o eletrólito que mata
        (erro: "K total"; verdade: gradiente transcelular × estoque; pH, insulina, β; ECG como mecanismo)
  M6  Cálcio · fósforo · magnésio — o eixo ósseo-mineral (PTH, vitamina D, FGF23)
        (erro: "cálcio sérico = cálcio"; verdade: ionizado, albumina, pH; o triângulo Ca-PO₄-PTH)
  M7  Ácido-base renal — HCO₃⁻ reabsorvido, NH₄⁺, acidez titulável; ânion gap e delta-delta
        (erro: "pH é respiratório"; verdade: o rim regula o HCO₃⁻; AG, delta-delta, ATRs por mecanismo)
Bloco II · A leitura e a falência
  M8  Ureia, creatinina, eGFR e a urina — FE_Na, FE_ureia, sedimento, índices urinários
        (erro: "número isolado"; verdade: a urina conta a história; índices separam pré-renal de NTA)
  M9  A LRA por mecanismo — KDIGO; pré-renal / intrínseca (NTA·NIA·glomerular) / pós-renal  [capstone FILTRA]
        (erro: "LRA é um diagnóstico"; verdade: é uma sombra com 3 mecanismos; cardiorrenal e hepatorrenal)
```

#### Metade B · DIALISA — substituição renal e terapia crítica (M10–M29, 20 módulos)

```text
Bloco III · Princípios e o circuito
  M10 Princípios físicos do transporte — difusão · convecção · ultrafiltração · adsorção (a base de tudo)
  M11 O circuito extracorpóreo — acesso, bomba, dialisador, fluxos (Qb, Qd), pressões (TMP)
  M12 A membrana e o clearance — KoA, permeabilidade, sieving, backfiltration (high-flux × low-flux)
Bloco IV · Hemodiálise intermitente (HDI)
  M13 A sessão de HDI — gradientes, eficiência × tempo; por que "intermitente" tem custo
  M14 Ultrafiltração e o balanço de volume — peso seco, taxa de UF, refilling plasmático
  M15 Hipotensão intradialítica — o mecanismo (UF > refilling), o stunning miocárdico, a tolerância
  M16 Dose e adequação — Kt/V, URR, clearance; o que "suficiente" significa (mecanismo, não alvo prescritivo)
  M17 Cinética da ureia — compartimento único × duplo, rebote pós-diálise; o tempo importa
Bloco V · Terapias contínuas e alternativas
  M18 Terapias contínuas (TRRC/CRRT) — CVVH (convecção) × CVVHD (difusão) × CVVHDF; por que "contínuo"
  M19 Dose e fluidos na TRRC — efluente mL/kg/h, pré × pós-diluição; o mecanismo da dose contínua
  M20 Anticoagulação do circuito — citrato regional (quelação de Ca²⁺) × heparina; mecanismo, não receita
  M21 Diálise peritoneal — o peritônio como membrana; UF osmótica pela glicose; tipos de transportador
  M22 SLED / híbridas — o meio-termo entre HDI e TRRC; o racional hemodinâmico
Bloco VI · O que a diálise remove — e os perigos
  M23 Depuração de solutos e drogas — peso molecular, ligação proteica, Vd; o que sai (e o que não)
  M24 Remoção de toxinas — intoxicações dialisáveis por mecanismo (lítio, salicilato, metanol, etilenoglicol)
  M25 Síndrome de desequilíbrio dialítico — edema cerebral por osmose reversa; o gradiente que machuca
Bloco VII · Indicação, momento e integração
  M26 Indicações de TRS — o AEIOU como MAPA DE MECANISMOS (acidose, eletrólitos, intoxicação, sobrecarga, uremia)
  M27 O momento da substituição — o mecanismo que pede suporte (sem gatilho de ação para caso real)
  M28 Síndrome cardiorrenal e a ultrafiltração — coração, rim e volume na falência mútua (ponte com Choca)
  M29 Capstone integrado — LRA grave → escolha de modalidade POR MECANISMO → meio interno restaurado
Bloco VIII · Avaliação
  M30 Revisão global · exame de domínio · 100 questões (psicométrico, como nos outros braços)
```

Pontes obrigatórias com o Choca: M9/M28 ↔ Choca M16/M23 (cardiogênico, misto); M9 (hepatorrenal) ↔ Choca
M20 (distributivo); M3–M4 (volume) ↔ Choca M4/M5 (Guyton, responsivo≠tolerante) e M25 (ressuscitação volêmica).

### 4.5 Estado atual da construção

```text
FEITO  · M0  build/m0/model0.js + test0.node.js   compartimentos (Darrow–Yannet)   33 OK · fuzz 5000
FEITO  · M1  build/m1/model1.js + test1.node.js   néfron / Starling                39 OK · fuzz 5000
HARNESS· package.json (test:0, test:1, check) · .github/workflows/check.yml · README.md · .gitignore
A FAZER· filtra0.html + validate0.js (instrumento: diagrama de Darrow–Yannet vivo) → depois M1.html → escada
```

`npm run check` atual = `npm test` (engines) → **verde**. Quando os `filtraN.html` + `validateN.js` existirem,
`check` passa a `npm test && npm run validate`, no padrão do Choca.

---

## 5. O rito de construção (por módulo, em ordem)

```text
1. build/mN/modelN.js        engine PURO (a fórmula primeiro; nada de UI)
2. build/mN/testN.node.js    bateria de robustez (ver §6) — 0 falhas
3. filtraN.html              single-file: caso(5 atos) · trilha · instrumento vivo · lab · tutor
4. build/mN/validateN.js     portão jsdom: estrutura · engine≡UI · interativo · cromo · guarda SaMD
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
  vivo) · **Lab** (sliders + veredito + banners) · **Avaliação** (tutor gráfico, banco ≥16, dificuldade crescente).
- Camada interativa: caso com decisões + "prever-depois-revelar".
- Disclaimer SaMD + nota de honestidade do modelo + rodapé de série + backlink relativo ao índice.

### Validador (`validateN.js`)
- jsdom `runScripts:'dangerously'`; confere IDs estruturais, `engine ≡ UI`, lab/veredito, camada interativa,
  banco do tutor, cromo (kicker/rodapé/pontes) e **guarda SaMD** (regex que recusa `mg/mcg/µg/mL·h⁻¹` e
  comandos prescritivos).

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
curriculum.json            manifesto curricular legível por máquina
FILTRA.md                  constituição do braço
CLAUDE.md                  este guia
```

- **Idioma:** português do Brasil, prosa causal e seca, setas quando úteis (↑↓→).
- **Rodapé obrigatório** em todo módulo: `CRM-SP 151.318 · Dr. Matheus M. Coelho · Limeira`.
- **Navegação do hexápode** no topo do índice: pílulas para os braços; o braço atual fica ativo, os sem
  página ainda ficam "em breve" (desabilitados, sem link quebrado) — padrão já usado no índice do Choca.
- **NÃO** versionar `node_modules/` (`.gitignore`).

---

## 8. Fronteira clínica · SaMD (precede utilidade, estética e completude)

FILTRA · DIALISA é **educação fisiológica**. Não é protocolo, calculadora de dose, prescritor de diálise,
ajustador de fármaco para paciente real, nem suporte automatizado à decisão clínica.

```text
PERMITIDO                                   PROIBIDO
mecanismo                                   prescrição de diálise (Kt/V-alvo, tempo, fluxo p/ um paciente)
termo quebrado (P_GC, túbulo, P_BC, água)   dose de fármaco ou ajuste renal de droga p/ caso real
receptor/alavanca → variável                gatilho automatizado de início de TRS p/ paciente real
por que dois quadros têm causas diferentes  alvo individualizado de volume/eletrólito acionável
por que tal modalidade remove X por tal via conduta terapêutica para paciente real
```

Mnemônicos clínicos (ex.: **AEIOU** para indicação de TRS) entram como **mapa de mecanismos**, jamais como
gatilho de ação. Os validadores devem recusar padrões de dose e comandos prescritivos.

---

## 9. Para o próximo agente — como pegar e construir o próximo módulo

1. Leia `FILTRA.md` (constituição) e este §4–§6.
2. O próximo artefato é **`filtra0.html` + `build/m0/validate0.js`** (o engine M0 já existe e está verde).
   Instrumento sugerido: **diagrama de Darrow–Yannet vivo** — o aluno arrasta a manobra (água livre /
   isotônico / hipertônico / suor / ureia) e vê a "banana" (célula) inchar/murchar e o Na⁺ mudar, com a
   pérola da ureia (osm medida sobe, célula não muda) destacada.
3. Depois `filtra1.html + validate1.js` (néfron/Starling: curva TFG×PAM com o platô da autorregulação e o
   precipício pré-renal; o paradoxo do eferente).
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
Robustez inigualável.    clamp resiliente + determinismo + fuzzing ≥ 5000 (§6).
Português do Brasil.     Prosa causal, seca, com setas.
SaMD hard-stop.          Mecanismo sim; dose/alvo/prescrição, não.
0 falhas ou não entra.   npm run check é o portão.
```

O alvo final: um sistema em que cada botão obedeça à fisiologia renal, cada fórmula seja testável, cada erro
do aluno revele uma falha conceitual e cada módulo pertença a um mapa causal maior — o mesmo que liga o rim
ao coração, ao pulmão, ao metabolismo e à consciência.
