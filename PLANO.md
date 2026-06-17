# PLANO.md — FILTRA · DIALISA · dossiê de design por módulo (M1–M39)

> **O que é este arquivo.** O `CLAUDE.md` é o *mapa operacional* (como construir); o `curriculum.json` é o
> *manifesto legível por máquina* (status de cada módulo). **Este arquivo é o projeto de cada módulo** — a
> ficha que o agente lê antes de abrir `build/mN/modelN.js`, para construir sem re-decidir nada. Um módulo só
> entra em construção quando sua ficha aqui está fechada; a ficha é o contrato, o `npm run check` é o portão.
>
> **Como ler.** Cada ficha segue o **molde canônico** abaixo, fixado pelo exemplar **M1** (§ Bloco 0). A
> ordem dos campos é inviolável; o M0 já construído é a prova viva de que o molde fecha. O conteúdo clínico
> (doses, faixas, condutas) é **educacional** e será revisado pelo autor (Dr. Matheus M. Coelho); segue o
> escopo farmacológico aberto do `CLAUDE.md §8` — toda dose com unidade + mecanismo, computada pelo motor.

---

## 0. O molde canônico de uma ficha de módulo

Cada `### Mx · Título` traz, nesta ordem:

```text
Tese & inversão     a frase causal do módulo; a inversão (o número é sombra; o mecanismo é a causa)
Erro → verdade      a confusão cognitiva que o módulo corrige (o "erro" do §4.4) → a verdade
Engine modelN.js    fórmula-mãe · entradas (estado) · saídas · alavancas de mecanismo · invariantes a testar
Pérolas             2–3 achados contra-intuitivos, cada um PROVÁVEL pelo motor (viram asserts no teste)
Instrumento vivo    o gráfico/canvas computado ao vivo a partir do engine (o "manda no pixel")
Ilustração SVG      os conceitos em SVG inline, computados do engine quando numéricos (§ padrão FILTRA)
Fármaco encadeado   [quando houver] alvo molecular · PK/PD · dose↔unidade↔mecanismo · dose-resposta (Emax/EC50) · teto/braking
Caso (5 atos)       o arco clínico de prever-depois-revelar, em uma linha por ato
Pontes              ligações com o Choca e com outros módulos do FILTRA (o hexápode conversa)
Avaliação           SEMENTES + gabarito robusto (o banco completo 10+10 nasce na construção, §6):
                      · Socrática   — 2–3 passos-chave da trilha (≥9 no produto), Q→A
                      · Revisão     — 2–3 questões teóricas, Q→gabarito
                      · Chave de ouro — 1–2 questões integradoras de fechamento, Q→gabarito robusto
```

**Convenção de gabarito (robustez do conteúdo, espelha o §6 do engine):** a resposta certa vem com o
*porquê mecanístico*, e — quando a questão tem distratores — cada distrator vem com a *razão de estar errado*
(o erro conceitual que ele captura). Gabarito que só diz "letra C" é proibido: o gabarito ensina.

**Nomenclatura herdada (§7 do CLAUDE.md):** `build/mN/modelN.js` · `testN.node.js` · `validateN.js` ·
`filtraN.html`. Rodapé obrigatório em todo módulo: `CRM-SP 151.318 · Dr. Matheus M. Coelho · Limeira`.

---

## Metade A · FILTRA — anatomia funcional, meio interno e farmacologia (M1–M18)

### Bloco 0 · Fundamentos — a água e a filtração

> M0 (compartimentos / Darrow–Yannet) já está **construído** — engine `139 OK · fuzz 5000`, validador
> `54 OK`. Serve de prova do molde. A ficha abaixo (M1) é o **padrão-ouro** que todas as outras espelham.

### M1 · O néfron / forças de Starling glomerulares (aferente × eferente)

**Tese & inversão.** A oligúria não é "pouca água": é a queda da **pressão de filtração**. A TFG nasce de um
saldo de forças de Starling no capilar glomerular, e a `P_GC` mora **entre duas resistências** — a arteríola
aferente e a eferente. A mesma TFG↓ pode vir de mecânicas opostas (aferente fecha × eferente abre). Decompor
antes de interpretar.

**Erro → verdade.** *Erro:* "oligúria = falta de volume, dê soro." *Verdade:* `P_GC` é regulada por dois
tônus arteriolares independentes; a autorregulação é um **platô** (miogênico + feedback tubuloglomerular), não
uma reta — e abaixo do joelho há um **precipício** pré-renal. A creatinina pode subir porque o IECA *funciona*.

**Engine `model1.js`.**
- **Fórmula-mãe:** `TFG = Kf · (P_GC − P_BC − π_GC)`, com `P_GC` derivada do circuito resistivo:
  `P_GC ≈ P_art − (fluxo · R_A)`, e o fluxo limitado a jusante por `R_E`. Modelar `P_GC` como função
  crescente de `R_E` e decrescente de `R_A`; `FPR = ΔP / (R_A + R_E)`; `FF = TFG / FPR`.
- **Entradas (estado):** `PAM` (mmHg), `R_A` (tônus aferente, relativo), `R_E` (tônus eferente, relativo),
  `Kf` (mL·min⁻¹·mmHg⁻¹), `piGC` (π oncótica, mmHg), `P_BC` (pressão de Bowman, mmHg).
- **Saídas:** `P_GC`, `TFG`, `FPR`, `FF`, `flag` de regime (platô autorregulado × precipício pré-renal ×
  congestão pós-renal por `P_BC↑`).
- **Alavanca de autorregulação:** laço de ponto-fixo **amortecido** (relaxação, §6) que ajusta `R_A` para
  manter `P_GC` ~constante enquanto `PAM ∈ [~80, ~180]`; fora da faixa, `R_A` satura e a `P_GC` segue a `PAM`.
- **Invariantes a testar (§6):** `TFG ≥ 0` sempre; `FF ∈ (0, 1)`; ∂TFG/∂R_A < 0 e ∂TFG/∂R_E > 0 na zona
  fisiológica (até o eferente extremo); `P_BC↑ → TFG↓` (definição); no platô, ΔTFG/ΔPAM ≈ 0; abaixo do joelho,
  ΔTFG/ΔPAM ≫ 0. Conservação: `FF = TFG/FPR` idêntica em todos os pontos (tol 1e-7).

**Pérolas (prováveis pelo motor).**
1. **O paradoxo do eferente:** dilatar a eferente (IECA/BRA) **baixa** a `P_GC` e a TFG → a creatinina sobe;
   essa queda é o *efeito hemodinâmico esperado*, não necessariamente lesão. O motor mostra TFG↓ com fluxo
   plasmático ↑ (FF↓).
2. **Autorregulação é platô, não reta:** a mesma ΔPAM de 20 mmHg quase não move a TFG no platô e a despenca no
   precipício — duas derivadas opostas no mesmo gráfico.
3. **A tríplice ameaça hemodinâmica:** AINE (fecha aferente) + IECA (abre eferente) + depleção (↓P_art)
   colapsam a `P_GC` por três vias somadas — o motor soma os três e mostra o precipício.

**Instrumento vivo.** Curva **TFG × PAM**: o platô autorregulado (joelhos em ~80 e ~180 mmHg) e o precipício à
esquerda, redesenhada ao vivo conforme `R_A`/`R_E`/`Kf`. Sobreposto, o esquema do glomérulo com as duas
arteríolas cujos calibres (largura computada) mudam com o tônus, e a `P_GC` como barra entre elas.

**Ilustração SVG.** Glomérulo esquemático inline: aferente e eferente como tubos de largura ∝ (1/R); seta de
fluxo; barra de `P_GC` entre as duas; o saldo de Starling como três flechas (`P_GC` empurra, `P_BC` e `π_GC`
resistem) cujo comprimento vem do engine. Mini-curva TFG×PAM como sparkline computada.

**Fármaco encadeado.** *Prévia* (o detalhe vem no M2): **AINE** → bloqueia PG vasodilatadoras → constrição
**aferente** → `P_GC↓`; **IECA/BRA** → menos AngII → dilatação **eferente** → `P_GC↓`. Aqui sem dose ainda
(M1 é hemodinâmica pura); a dose↔mecanismo entra no M2. Disclaimer educacional presente.

**Caso (5 atos).** (1) Idoso, ICC, em IECA + AINE por lombalgia, agora oligúrico; creatinina 1,1→2,3.
(2) *Prever:* pré-renal por volume? (3) *Revelar:* é hemodinâmico — eferente aberta + aferente fechada, não
depleção. (4) Conduta: suspender o AINE (devolve a aferente); reavaliar o IECA pelo contexto (a queda pode ser
esperada). (5) Síntese: a creatinina contou a `P_GC`, não a volemia.

**Pontes.** Choca M4/M5 (Guyton: pressão de perfusão a montante; responsivo≠tolerante) → a `P_art` que chega
ao glomérulo. FILTRA M2 (hemodinâmica renal, AINE/IECA com dose), M15 (FE_Na separa pré-renal de NTA), M16
(LRA por mecanismo — a `P_GC↓` é a via pré-renal), M18 (o paradoxo do IECA na conduta).

**Avaliação — sementes + gabarito.**
- **Socrática (passos-chave).**
  - *Q:* Se eu fecho só a aferente, o que acontece com fluxo, `P_GC` e TFG? → *A:* fluxo↓, `P_GC↓`, TFG↓ (a
    aferente é "a torneira de entrada": estrangula tudo a jusante).
  - *Q:* Se eu fecho só a eferente, e agora? → *A:* fluxo↓, mas `P_GC↑` (represa a montante) → TFG **mantida ou
    ↑**, FF↑. É como a AngII protege a TFG na hipoperfusão.
  - *Q:* Então por que dilatar a eferente (IECA) faz a creatinina subir? → *A:* tira a represa → `P_GC↓` → TFG↓;
    é o efeito esperado, não dano — a menos que haja estenose bilateral/rim único (aí o precipício).
- **Revisão (teórica).**
  - *Q:* Em que faixa de PAM a autorregulação mantém a TFG, e por que ela falha abaixo dela? → *Gabarito:*
    ~80–180 mmHg; abaixo, a aferente já está maximamente dilatada (não há mais como cair `R_A`), então `P_GC` e
    TFG passam a seguir a PAM linearmente — o precipício pré-renal.
  - *Q:* Defina FF e diga o que sobe a FF. → *Gabarito:* `FF = TFG/FPR`; sobe quando a eferente fecha (TFG
    preservada com FPR↓) — daí o aumento da fração de filtração na hipoperfusão e o ↑ da π peritubular.
- **Chave de ouro (integradora).**
  - *Q:* Paciente em IECA tem creatinina subindo 25% em 4 dias após iniciar a droga, sem hipercalemia nem
    oligúria. Manter ou suspender? Justifique pelo mecanismo. → *Gabarito robusto:* **manter e monitorar** —
    uma alta de até ~30% sem hipercalemia reflete a queda hemodinâmica esperada da `P_GC` pela dilatação
    eferente, marcador de que a droga age no eixo certo (nefroproteção a longo prazo). *Suspender* seria o
    reflexo errado ("creatinina subiu, tire o IECA"): só se a alta for >30%, houver hipercalemia, ou suspeita
    de estenose de artéria renal bilateral (aí a TFG dependia da constrição eferente da AngII e o precipício é
    real). *Distrator "dar soro":* não corrige um problema que não é de volume; pode congestionar a ICC.

---

### Bloco I · O glomérulo, a hemodinâmica e a medida

### M2 · Hemodinâmica renal — 20% do DC, autorregulação miogênica + feedback tubuloglomerular; córtex × medula

**Tese & inversão.** O rim não recebe "pouco fluxo": recebe **~20% do débito cardíaco** para um órgão de
~300 g — é o tecido mais regado do corpo por grama. Mas esse luxo não é para nutrição; é para **filtrar**. O
córtex fica com quase todo o fluxo; a **medula** sobra com ~5–10% e vive **à beira da hipóxia** — a `PO₂`
medular ronda 10–20 mmHg porque a contracorrente vascular (vasa recta) que cria o gradiente osmótico também
**curto-circuita o O₂**. A inversão: o número "fluxo renal alto" é sombra; a medula isquêmica é a causa da
NTA. Decompor antes de interpretar.

**Erro → verdade.** *Erro:* "o rim recebe pouco fluxo, por isso lesa fácil." *Verdade:* recebe 20% do DC; o
que lesa é a **distribuição** — a medula trabalha (transporte ativo do NKCC2) com `PO₂` baixíssima, e
qualquer queda de fluxo ou aumento de demanda a empurra para a necrose tubular. A autorregulação que protege
a TFG é **dupla** (miogênico rápido + feedback tubuloglomerular lento), e os fármacos vasoativos agem em
**arteríolas opostas** — eis a dose↔mecanismo que o M1 só prenunciou.

**Engine `model2.js`.**
- **Fórmula-mãe:** `FPR = ΔP / (R_A + R_E)` e `TFG = Kf·(P_GC − P_BC − π_GC)` (herda o M1), agora com
  `FSR = FPR / (1 − Hct)` (fluxo sanguíneo renal) e `fração_DC = FSR / DC`. Distribuição:
  `Q_cortex = f_c · FSR`, `Q_medula = (1 − f_c) · FSR`; `PO₂_medula = O₂_entregue − O₂_consumido(NKCC2)`,
  com o consumo ∝ carga de Na reabsorvida no ramo espesso.
- **Entradas (estado):** `DC` (L·min⁻¹), `PAM` (mmHg), `Hct`, `R_A`, `R_E` (tônus relativos), `Kf`, `P_BC`,
  `piGC`, e as **alavancas de fármaco**: `dose_AINE`, `dose_IECA` (ou `dose_BRA`).
- **Saídas:** `FPR`, `FSR`, `fração_DC` (alvo ~0,20), `TFG`, `FF`, `Q_cortex`, `Q_medula`, `PO₂_medula`,
  `flag` de regime (autorregulado × precipício × **risco de NTA medular** quando `PO₂_medula < limiar`).
- **Alavancas de mecanismo:** o **miogênico** responde à `PAM` (estira→contrai `R_A`); o **feedback
  tubuloglomerular (FTG)** lê o NaCl na mácula densa (TFG↑ → mais NaCl distal → adenosina → `R_A↑`,
  freio negativo). Os dois mantêm `P_GC` no platô [~80–180 mmHg]. O **AINE** sobe `R_A` (tira PG
  vasodilatadora); o **IECA/BRA** baixa `R_E` (tira AngII). A demanda medular sobe com a carga de Na.
- **Invariantes a testar (§6):** `fração_DC ∈ [~0,17; ~0,23]` na linha de base; `PO₂_medula < PO₂_cortex`
  sempre (a medula é o elo fraco); ∂`R_A`/∂`dose_AINE` > 0; ∂`R_E`/∂`dose_IECA` < 0; no platô
  ΔTFG/ΔPAM ≈ 0; furosemida (prévia do M6) **reduz** consumo medular → `PO₂_medula↑` (paradoxo
  protetor). Conservação: `FF = TFG/FPR` (tol 1e-7); `Q_cortex + Q_medula = FSR`.

**Pérolas (prováveis pelo motor).**
1. **A medula é o elo fraco:** com FSR alto e `PO₂` global normal, a `PO₂_medula` já está em ~15 mmHg — o
   motor mostra que basta uma queda modesta de fluxo (ou ↑ da demanda de Na) para cruzar o limiar de NTA.
2. **AINE e IECA atacam arteríolas opostas, mesmo efeito na TFG:** o motor fecha a aferente (AINE) ou abre a
   eferente (IECA) e a TFG cai pelas duas vias — mas a **FF** se move em sentidos opostos (AINE: FF~↔;
   IECA: FF↓), assinatura mecanística que separa os dois.
3. **O FTG é um freio, não um acelerador:** subir a TFG aumenta o NaCl na mácula densa e **contrai** a
   aferente para baixá-la de volta — o motor mostra o ponto-fixo amortecido convergindo, não disparando.

**Instrumento vivo.** Painel de distribuição: barra do **DC** com a fatia de 20% indo ao rim, e dentro dela
a divisão **córtex × medula** (larguras computadas). Ao lado, termômetro de `PO₂_medula` que muda de verde→
vermelho conforme cruza o limiar de NTA. Curva TFG×PAM (herdada do M1) com sobreposição dos dois freios
(miogênico × FTG) e setas de dose de AINE/IECA empurrando cada arteríola ao vivo.

**Ilustração SVG.** Esquema cortiço-medular inline: o glomérulo no córtex, a alça mergulhando na medula, a
**vasa recta** em grampo (contracorrente) com o O₂ curto-circuitando entre o ramo descendente e ascendente
(setas computadas). Aferente e eferente como tubos de largura ∝ (1/R), recoloridos pelas doses. Mini-barra
`PO₂_cortex` vs `PO₂_medula` computada do engine.

**Fármaco encadeado.**
- **AINEs (ibuprofeno, cetoprofeno, diclofenaco)** — *alvo:* COX-1/COX-2 → ↓ prostaglandinas (PGE₂, PGI₂)
  vasodilatadoras da **aferente**. *PK/PD:* início rápido (1–2 h), efeito renal proporcional à inibição de
  COX. *Dose↔mecanismo (educacional, computada pelo motor):* ibuprofeno **400–800 mg VO a cada 8 h**
  (teto ~3200 mg·dia⁻¹) → quanto maior a dose, maior `R_A` → `P_GC↓` → TFG↓; o efeito é mínimo no rim bem
  perfundido (PG basais baixas) e **grande** no rim PG-dependente (ICC, cirrose, depleção). Curva
  dose-resposta sigmoide com `Emax` na constrição aferente e `EC50` na faixa terapêutica; há **teto** —
  acima dele, mais dose só soma toxicidade.
- **IECA (enalapril, captopril, lisinopril) / BRA (losartana, valsartana)** — *alvo:* IECA bloqueia a ECA
  (↓ formação de AngII); BRA bloqueia o receptor AT₁ → ↓ tônus da **eferente**. *PK/PD:* captopril rápido
  (1 h), enalapril/lisinopril prolongados (24 h). *Dose↔mecanismo (educacional, computada pelo motor):*
  enalapril **5–20 mg VO 1–2×·dia⁻¹** (teto prático ~40 mg·dia⁻¹); losartana **50–100 mg VO·dia⁻¹** →
  `R_E↓` → `P_GC↓` → TFG↓ com **FF↓** (assinatura oposta ao AINE). Dose-resposta com `Emax`/`EC50` no
  relaxamento eferente; teto na proteção glomerular, além do qual domina o risco de hipercalemia/precipício.
  *Disclaimer educacional presente; nenhuma dose é prescrição — é a curva computada pelo motor.*

**Caso (5 atos).** (1) Cirrótico, ascite, em diurético, recebe diclofenaco por dor — débito urinário despenca,
creatinina 1,0→2,1. (2) *Prever:* hepatorrenal? Depleção? (3) *Revelar:* o motor mostra a aferente fechada
pelo AINE num rim **PG-dependente** (a vasodilatação prostaglandínica era o que segurava a `P_GC`); a medula
já estava no limiar. (4) Conduta: **suspender o AINE** (devolve a aferente), restaurar volume efetivo; evitar
nefrotóxico somado. (5) Síntese: 20% do DC não protegeram a medula — a PG era o fiador da filtração.

**Pontes.** Choca M4/M5 (Guyton: a `P_art` e o `DC` que chegam ao rim; responsivo≠tolerante) e Choca M16/M21
(cardiogênico/séptico baixam a fração renal do DC). FILTRA M1 (as duas arteríolas — aqui ganham dose), M5–M6
(o consumo de O₂ medular é do NKCC2; a furosemida o reduz), M16 (a NTA medular é a via **intrínseca** da LRA),
M18 (a conduta do IECA: a queda da TFG pode ser o efeito esperado).

**Avaliação — sementes + gabarito.**
- **Socrática (passos-chave).**
  - *Q:* Se o rim recebe 20% do DC, por que ele isquemia tão fácil? → *A:* porque o fluxo é **mal
    distribuído** — o córtex fica com quase tudo e a medula com ~5–10%, trabalhando com `PO₂` ~15 mmHg; o
    fluxo total alto não protege o tecido que mais consome O₂.
  - *Q:* AINE e IECA baixam a TFG; como distingo um do outro pelo motor? → *A:* pela **FF**: o AINE fecha a
    aferente (FF ~estável ou ↑ leve); o IECA abre a eferente (FF↓, com fluxo plasmático preservado).
  - *Q:* A furosemida, que "estressa" o rim, pode **proteger** a medula? → *A:* sim — ela bloqueia o NKCC2,
    reduz o transporte ativo e o **consumo de O₂** medular, subindo a `PO₂` local (efeito do motor).
- **Revisão (teórica).**
  - *Q:* Diferencie o componente **miogênico** do **feedback tubuloglomerular** na autorregulação. →
    *Gabarito:* o miogênico é rápido e responde ao **estiramento** da parede arteriolar pela pressão
    (PAM↑ → `R_A↑`); o FTG é mais lento e responde ao **NaCl** detectado pela mácula densa (TFG↑ → mais NaCl
    distal → adenosina → `R_A↑`). Ambos defendem a `P_GC` no platô, por sinais físicos diferentes.
  - *Q:* Por que a medula renal é especialmente vulnerável à NTA isquêmica? → *Gabarito:* recebe pouco fluxo,
    a vasa recta em contracorrente **curto-circuita o O₂**, e o ramo espesso ascendente consome muito O₂ no
    transporte ativo do NKCC2 — entrega baixa somada a demanda alta deixa a `PO₂` ~10–20 mmHg, à beira da
    necrose.
- **Chave de ouro (integradora).**
  - *Q:* Idoso desidratado, ICC compensada por IECA, recebe AINE por lombalgia. Explique pelo motor por que
    essa **tríade** é nefrotóxica e qual a conduta. → *Gabarito robusto:* as três forças somam-se sobre a
    `P_GC`: a **depleção** baixa a `P_art` (↓ entrada), o **AINE** fecha a aferente (tira a PG que segurava o
    fluxo num rim PG-dependente), o **IECA** abre a eferente (tira a represa da AngII) — o motor mostra a
    `P_GC` colapsar pelas três vias e a `PO₂_medula` cruzar o limiar de NTA. Conduta: **suspender o AINE**
    primeiro (devolve a aferente e a PG), corrigir volume; o IECA é reavaliado pelo contexto (sua queda de
    TFG pode ser esperada e nefroprotetora a longo prazo). *Distrator "suspender o IECA e manter o AINE":*
    inverte a prioridade — o AINE é o agressor agudo evitável; o IECA tem benefício crônico. *Distrator "só
    dar soro":* trata uma perna do tripé e ignora as outras duas, que continuam fechando a `P_GC`.

---

### M3 · O glomérulo — barreira de filtração (carga e tamanho), Kf, podócito, proteinúria por mecanismo

**Tese & inversão.** Proteína na urina não é "rim falhando" genérico: é a **assinatura de qual filtro
rompeu**. A barreira glomerular peneira por **tamanho** (endotélio fenestrado → membrana basal → fendas dos
podócitos) e por **carga** (a barreira é aniônica e **repele** a albumina, também aniônica). Perder a carga
(lesão mínima) deixa passar albumina sem buraco nenhum no tamanho; perder a estrutura (membrana/podócito)
abre o tamanho. A inversão: o número "proteinúria" é sombra; **qual camada cedeu** é a causa. Decompor antes
de interpretar.

**Erro → verdade.** *Erro:* "proteinúria = o rim está falhando, é tudo igual." *Verdade:* há **proteinúria
glomerular** (barreira rota → albumina/perda seletiva ou não) **× tubular** (proteínas pequenas que o túbulo
deixou de reabsorver) **× por overflow** (excesso plasmático, ex.: cadeias leves). O tipo e a seletividade
dizem o mecanismo; o **Kf** (produto permeabilidade × área) é o que muda a capacidade de filtrar, não só a
pressão.

**Engine `model3.js`.**
- **Fórmula-mãe:** `TFG = Kf · P_líq` (herda M1/M2), com `Kf = k · S` (permeabilidade × área de superfície
  do podócito). Filtração de uma proteína: `sieving(x) = f(raio_x / raio_poro, carga_x · carga_barreira)`;
  excreção `U_prot = sieving · P_prot · TFG − reabsorção_tubular`. A **seletividade** = razão
  clearance(IgG)/clearance(albumina).
- **Entradas (estado):** `Kf` (mL·min⁻¹·mmHg⁻¹), `raio_poro` (nm, ∝ integridade de tamanho), `carga_barreira`
  (densidade aniônica relativa, ∝ integridade de carga), `P_alb`, `P_IgG` (plasmáticas), `reabs_tubular`
  (capacidade tubular relativa), `P_líq` (saldo de Starling).
- **Saídas:** `TFG`, `sieving_alb`, `sieving_IgG`, `U_albumina`, `proteinúria_total`, `índice_seletividade`,
  `flag` de padrão (lesão de **carga** × lesão de **tamanho** × **tubular** × **overflow**).
- **Alavancas de mecanismo:** baixar `carga_barreira` (doença de lesão mínima) → `sieving_alb↑` **sem** mexer
  no `raio_poro` → albuminúria seletiva. Abrir `raio_poro` (GESF/membranosa) → IgG passa também → seletividade
  cai. Baixar `reabs_tubular` → proteínas pequenas escapam (padrão tubular). Baixar `Kf` → TFG↓ sem
  necessariamente proteinúria (o filtro filtra menos, não vaza mais).
- **Invariantes a testar (§6):** `0 ≤ sieving ≤ 1` para toda proteína; `sieving_IgG ≤ sieving_alb` (a maior
  passa menos) sempre; ∂`U_albumina`/∂`carga_barreira` < 0 (perder carga vaza albumina); ∂`U_albumina`/
  ∂`raio_poro` > 0; lesão **pura de carga** → seletividade alta (IgG ainda barrada); lesão de **tamanho** →
  seletividade baixa; ∂`TFG`/∂`Kf` > 0. Conservação: `proteinúria_total = Σ sieving·P·TFG − reabs` (tol 1e-7).

**Pérolas (prováveis pelo motor).**
1. **Vazar sem buraco:** o motor zera a perda só de **carga** (raio do poro intacto) e a albumina dispara
   enquanto a IgG fica barrada → albuminúria **seletiva** sem alteração de tamanho. É a lesão mínima.
2. **Kf não é pressão:** baixar `Kf` derruba a TFG **sem** aumentar a proteinúria — o motor separa "filtrar
   menos" (área/permeabilidade) de "vazar mais" (barreira rota); confundir os dois é o erro clássico.
3. **A seletividade conta a profundidade:** quando o `raio_poro` abre, a razão clearance(IgG)/clearance(alb)
   sobe — o motor mostra a perda da seletividade como marcador de dano **estrutural**, não funcional.

**Instrumento vivo.** A barreira em três camadas (endotélio fenestrado · membrana basal · fendas dos
podócitos) desenhada ao vivo: os **pés dos podócitos** se apagam (effacement) quando a carga/estrutura cai, e
partículas de albumina (vermelhas, aniônicas) e IgG (azuis, maiores) tentam atravessar — a fração que passa é
**computada pelo sieving** do engine. Barra de seletividade e medidor de albuminúria ao lado.

**Ilustração SVG.** Corte da membrana inline com as três camadas; cargas negativas (−) na lâmina como pontos
cuja densidade vem de `carga_barreira`; poros cujo diâmetro = `raio_poro` computado. Setas de proteínas
passando/repelidas em quantidade proporcional ao `sieving`. Mini-barras `sieving_alb` vs `sieving_IgG`.

**Caso (5 atos).** (1) Criança, edema súbito, proteinúria maciça, sem hematúria, sem HAS. (2) *Prever:* buraco
no glomérulo? (3) *Revelar:* o motor mostra `raio_poro` intacto e `carga_barreira` colapsada → albuminúria
**seletiva** (IgG barrada) = lesão mínima, perda de carga sem dano estrutural. (4) Conduta: o padrão seletivo
e a clínica orientam (córtico-responsivo, educacional). (5) Síntese: a proteína contou **qual camada** cedeu,
não "o rim falhou".

**Pontes.** FILTRA M1/M2 (o mesmo saldo de Starling e o `Kf` que aqui ganham a barreira de carga/tamanho),
M4 (a creatinina mede TFG; a proteinúria mede a **barreira** — eixos distintos), M15 (sedimento e índices: a
proteinúria seletiva × não-seletiva entra na leitura da urina), M16 (a via **glomerular** da LRA intrínseca).
Choca M12 (microcirculação: a barreira glomerular é um leito capilar especializado).

**Avaliação — sementes + gabarito.**
- **Socrática (passos-chave).**
  - *Q:* Por que a albumina é filtrada tão pouco se cabe no poro pelo tamanho? → *A:* porque a barreira é
    **aniônica** e a albumina também — a repulsão de **carga** a barra antes do tamanho importar.
  - *Q:* Se eu perco só a carga, a IgG passa? → *A:* não — a IgG é grande e ainda é barrada pelo **tamanho**;
    por isso a proteinúria fica **seletiva** (albumina sim, IgG não).
  - *Q:* O que a queda de seletividade indica? → *A:* que o **tamanho** do poro abriu (dano estrutural à
    membrana/podócito), não só a carga — proteinúria não-seletiva, lesão mais profunda.
- **Revisão (teórica).**
  - *Q:* Diferencie proteinúria **glomerular**, **tubular** e por **overflow** pelo mecanismo. → *Gabarito:*
    glomerular = a barreira deixou passar (carga e/ou tamanho), tipicamente albumina; tubular = proteínas
    **pequenas** que normalmente seriam reabsorvidas escapam porque o túbulo lesou; overflow = excesso
    **plasmático** de uma proteína (ex.: cadeias leves) satura a reabsorção — o glomérulo e o túbulo estão
    íntegros, sobra carga.
  - *Q:* O que é `Kf` e por que cair o `Kf` não é o mesmo que vazar proteína? → *Gabarito:* `Kf` =
    permeabilidade × área da barreira; controla **quanto** se filtra (TFG), não **o que** vaza. Reduzir área
    (perda de podócitos/capilares) derruba a TFG; vazar proteína é a **seletividade** da barreira rompendo —
    eixos independentes.
- **Chave de ouro (integradora).**
  - *Q:* Dois pacientes com a mesma proteinúria de 24 h: um com índice de seletividade alto (só albumina),
    outro baixo (albumina + IgG). O que o motor diz sobre a lesão de cada um e por que importa? → *Gabarito
    robusto:* o de **alta seletividade** perdeu a **carga** com o tamanho do poro preservado (a IgG segue
    barrada) → padrão de lesão mínima, dano funcional reversível típico. O de **baixa seletividade** abriu o
    **tamanho** do poro (IgG passa) → dano **estrutural** da membrana/podócito (GESF/membranosa), de pior
    prognóstico. Importa porque a **mesma massa** de proteína esconde mecanismos opostos; tratar pelo número
    ignora qual camada cedeu. *Distrator "ambos são iguais, é a mesma proteinúria":* confunde quantidade com
    mecanismo — o erro que o módulo corrige. *Distrator "é só Kf baixo":* `Kf` muda a TFG, não a seletividade;
    não explica o vazamento.

---

### M4 · Clearance — medir a função; por que a creatinina mente

**Tese & inversão.** A creatinina é um **medidor mentiroso** da TFG, e mente por mecanismo, não por acaso.
Clearance é o volume de plasma **depurado** de uma substância por minuto: `C_x = (U_x · V̇) / P_x`. O
marcador ideal é **livremente filtrado, não reabsorvido, não secretado, produção constante** — a **inulina** é
esse padrão-ouro. A creatinina chega perto, mas é **secretada** pelo túbulo (superestima a TFG), depende da
**massa muscular** (produção variável) e tem **cinética lenta** (demora a refletir uma queda aguda). A
inversão: o número "creatinina normal" é sombra; a TFG real pode já ter despencado. Decompor antes de
interpretar.

**Erro → verdade.** *Erro:* "creatinina normal = rim normal; creatinina é a função." *Verdade:* a creatinina
é função **inversa, lenta e enviesada** da TFG. Pela cinética, uma TFG que cai pela metade leva **dias** para
estabilizar a creatinina no novo platô — no início da LRA a creatinina **mente para baixo**. Pela massa
muscular, um idoso sarcopênico tem creatinina "normal" com TFG ruim. Pela secreção tubular, o clearance de
creatinina **superestima** a TFG real (medida pela inulina). A **cistatina C** contorna o viés muscular.

**Engine `model4.js`.**
- **Fórmula-mãe:** `C_x = (U_x · V̇) / P_x`; no regime estável `TFG_real ≈ produção / P_marcador` para um
  marcador filtrado puro. Para a creatinina: `C_Cr = TFG + secreção_tubular` (logo `C_Cr > TFG`). Cinética
  **não-estável:** `dP_Cr/dt = (produção − TFG·P_Cr) / Vd` — equação de aproximação ao novo platô, com
  constante de tempo `τ ∝ Vd/TFG` (quanto pior a TFG, **mais lenta** a subida).
- **Entradas (estado):** `TFG_verdadeira` (mL·min⁻¹), `produção_Cr` (∝ massa muscular), `secreção_frac`
  (fração secretada), `Vd`, `tempo` (para a transitória), e marcadores alternativos `produção_cistatinaC`,
  `inulina` (secreção/reabsorção = 0).
- **Saídas:** `P_Cr_estável`, `P_Cr(t)` (transitória), `C_Cr` (clearance medido), `TFG_inulina` (verdade),
  `eGFR_estimada`, `viés = C_Cr − TFG`, `flag` (estável × **transitório enganoso** × sarcopenia mascarando ×
  secreção superestimando).
- **Alavancas de mecanismo:** subir `secreção_frac` → `C_Cr` afasta-se da TFG para cima; baixar
  `produção_Cr` (sarcopenia) → `P_Cr` cai e a creatinina "parece" boa com TFG ruim; cair `TFG_verdadeira`
  agudamente → `P_Cr(t)` sobe **devagar** (τ longa) → janela em que a creatinina mente para baixo. Trimetoprim/
  cimetidina bloqueiam a secreção → `C_Cr` aproxima-se da TFG (sobe a creatinina **sem** lesar).
- **Invariantes a testar (§6):** `C_Cr ≥ TFG_inulina` sempre (secreção ≥ 0); `C_inulina = TFG` (marcador
  ideal, tol 1e-7); no degrau de TFG↓, `P_Cr(t)` é **monótona crescente** e satura no novo `P_Cr_estável`;
  τ aumenta quando TFG cai (∂τ/∂TFG < 0); ∂`P_Cr_estável`/∂`produção_Cr` > 0 e ∂`P_Cr_estável`/∂`TFG` < 0;
  cistatina C **independe** de `produção_Cr` muscular. Conservação: `C_x·P_x = U_x·V̇` (definição, tol 1e-7).

**Pérolas (prováveis pelo motor).**
1. **A creatinina mente para baixo no início da LRA:** o motor dá um degrau de TFG de 100→40 mL·min⁻¹ e mostra
   a `P_Cr` subindo por **dias** — no dia 1 ela ainda parece quase normal embora a TFG já tenha caído 60%.
2. **Sarcopenia esconde a doença:** baixar a `produção_Cr` mantém a `P_Cr` "normal" com TFG ruim — o motor
   mostra dois pacientes com a mesma creatinina e TFGs muito diferentes (a cistatina C os separa).
3. **A secreção infla o clearance:** o `C_Cr` fica sistematicamente **acima** da `TFG_inulina`; bloquear a
   secreção (cimetidina) sobe a creatinina **sem** piorar a TFG — alta de creatinina que não é lesão.

**Instrumento vivo.** Duas curvas no tempo: o **degrau de TFG** (queda instantânea, em azul) contra a
**resposta lenta da `P_Cr`** (em vermelho, com τ computada) — o aluno vê a defasagem que faz a creatinina
mentir. Ao lado, três barras de "TFG estimada" — por creatinina (com secreção), por cistatina C, por inulina
(verdade) — com o **viés** entre elas computado ao vivo conforme massa muscular e secreção.

**Ilustração SVG.** Néfron com a creatinina sendo **filtrada** (seta no glomérulo) **e secretada** (seta extra
no túbulo proximal) — as duas setas somam o `C_Cr`, computadas do engine; a inulina aparece só com a seta da
filtração. Sparkline da `P_Cr(t)` defasada do degrau de TFG. Barra de massa muscular ligada à produção.

**Fármaco encadeado.** *Nota mecanística (educacional, computada pelo motor):* **trimetoprim** e
**cimetidina** bloqueiam a **secreção tubular** de creatinina → o `C_Cr` cai em direção à TFG real e a
creatinina sérica **sobe sem lesão renal** (pseudo-elevação). O motor mostra `TFG_inulina` inalterada com
`P_Cr↑` — distingue "creatinina subiu" de "rim piorou". Sem prescrição de dose aqui (o foco é a medida);
disclaimer educacional presente.

**Caso (5 atos).** (1) Pós-operatório, débito urinário caindo há 12 h, creatinina ainda 1,0. (2) *Prever:* rim
ok porque a creatinina está normal? (3) *Revelar:* o motor mostra a TFG já em 40 mL·min⁻¹, mas a `P_Cr` ainda
na subida lenta (τ longa) — a creatinina **mente para baixo**; a oligúria é o sinal precoce. (4) Conduta:
agir pela tendência (débito urinário + contexto), não esperar a creatinina "alcançar" a lesão. (5) Síntese: a
creatinina é um relógio atrasado; a TFG real já mudou.

**Pontes.** FILTRA M1/M2 (a TFG que estamos tentando medir; a queda hemodinâmica que a creatinina reflete com
atraso), M3 (a creatinina mede **função/TFG**; a proteinúria mede a **barreira** — eixos diferentes), M15
(eGFR, FE_Na, FE_ureia — a urina completa a história que a creatinina sozinha conta mal), M16 (KDIGO usa
creatinina **e** débito urinário justamente porque a creatinina atrasa). Choca M13 (lactato: outro marcador
com cinética própria — número é sombra do mecanismo).

**Avaliação — sementes + gabarito.**
- **Socrática (passos-chave).**
  - *Q:* O que é clearance, em uma frase física? → *A:* o volume de plasma **completamente depurado** da
    substância por minuto, `C_x = U_x·V̇/P_x` — não é uma concentração, é um volume virtual por tempo.
  - *Q:* Por que a inulina é o padrão-ouro e a creatinina não? → *A:* a inulina é filtrada e **nem reabsorvida
    nem secretada**, com produção controlada → `C_inulina = TFG` exata; a creatinina é **secretada** (infla o
    clearance) e depende da **massa muscular** (produção variável).
  - *Q:* Por que a creatinina demora a subir na LRA aguda? → *A:* cinética — ela se acumula com constante de
    tempo `τ ∝ Vd/TFG`; com TFG baixa, τ é **longa**, então leva dias para atingir o novo platô; no início ela
    subestima a queda.
- **Revisão (teórica).**
  - *Q:* Em que três situações a creatinina **mente** sobre a TFG, e em que direção? → *Gabarito:* (1)
    **LRA aguda** — mente **para baixo** (cinética lenta, ainda não acumulou); (2) **sarcopenia/idoso** —
    parece **normal** com TFG ruim (baixa produção muscular); (3) **secreção tubular** — o clearance de
    creatinina **superestima** a TFG real (e drogas que bloqueiam a secreção sobem a creatinina sem lesão).
  - *Q:* Quando a cistatina C é preferível à creatinina? → *Gabarito:* quando a **massa muscular** distorce a
    produção de creatinina (sarcopenia, caquexia, amputados, atletas) — a cistatina C é produzida por
    **todas as células nucleadas**, independente do músculo, então estima a TFG sem o viés muscular.
- **Chave de ouro (integradora).**
  - *Q:* Paciente recebe trimetoprim e a creatinina sobe de 1,0 para 1,3 em 3 dias, sem oligúria, sem queda do
    débito urinário. Houve lesão renal? Justifique pelo motor. → *Gabarito robusto:* **provavelmente não** —
    o trimetoprim bloqueia a **secreção tubular** de creatinina; o motor mostra a `TFG_inulina` inalterada com
    o `C_Cr` caindo em direção à TFG real e a `P_Cr` subindo por isso (pseudo-elevação). É "a creatinina
    subiu" **sem** "o rim piorou" — confirma-se com débito urinário preservado e, se preciso, cistatina C
    normal. *Distrator "é LRA, suspenda tudo e dê soro":* reflexo de tratar o número; aqui não há queda de TFG
    nem oligúria, e a alta é farmacológica e previsível. *Distrator "a creatinina nunca mente, é nefrotoxicidade
    direta":* ignora a secreção tubular — exatamente o mecanismo que o módulo ensina. A confirmação real vem de
    olhar a **tendência funcional** (débito urinário, cistatina C), não a creatinina isolada.

---

### Bloco II · O túbulo, segmento a segmento (transportador = alavanca, droga = chave)

### M5 · TCP — reabsorção isosmótica, Na/glicose (SGLT2), HCO₃/anidrase carbônica, Fanconi

**Tese & inversão.** O túbulo contorcido proximal não "começa a reabsorver": ele **define o piso de tudo**.
Reabsorve **~65% do Na⁺ filtrado** de forma **isosmótica** (água acompanha o soluto, a osmolalidade do
fluido tubular quase não muda), e é aqui que se ancoram a glicose (SGLT2), o bicarbonato (anidrase carbônica)
e o fosfato. A inversão: **a alça é prisioneira do proximal**. O que o proximal entrega rio abaixo é o que os
segmentos distais — e os diuréticos que agem neles — têm para trabalhar. Mexer no proximal desloca a carga
para todo o néfron a jusante.

**Erro → verdade.** *Erro:* "o proximal só reabsorve, é um segmento passivo de volume." *Verdade:* o proximal
é o **maior reabsortor e o ponto de alavanca de carga** — 65% do Na⁺, ~90% do HCO₃⁻, ~100% da glicose e dos
aminoácidos saem aqui, de modo isosmótico e acoplado à Na⁺/K⁺-ATPase basolateral. Bloqueá-lo (acetazolamida,
SGLT2i, manitol) produz diurese fraca **mas** carrega o distal e reescreve o ácido-base e a glicosúria.

**Engine `model5.js`.**
- **Fórmula-mãe:** balanço de massa segmentar. `Na_reab_TCP = f_prox · Na_filtrado`, com `f_prox≈0,65`
  modulável; saída isosmótica → `H₂O_reab = Na_reab / [Na]_tubular` (osmolalidade ~constante). HCO₃⁻:
  `HCO₃_reab = V_CA · [HCO₃]/(Km+[HCO₃])` (anidrase carbônica como Michaelis–Menten). Glicose:
  `Gli_reab = min(carga, Tm_glicose)`, `Tm` deslocável por SGLT2 (limiar ~180 mg/dL, saturação ~375 mg/min).
- **Entradas (estado):** `Na_filtrado` (mEq/min via TFG·[Na]), `f_prox` (fração reabsorvida), `[HCO₃]p`,
  `V_CA` (atividade da anidrase carbônica, %), `glicemia` (mg/dL), `Tm_glicose`, `dose` dos fármacos.
- **Saídas:** `Na_entregue_à_alça` (mEq/min), `HCO₃_excretado`, `glicosúria` (g/dia), osmolalidade tubular,
  `flag` (Fanconi = perda global proximal: glicosúria + bicarbonatúria + fosfatúria + aminoacidúria com
  glicemia normal).
- **Alavancas de mecanismo:** `acetazolamida ↓V_CA` → bicarbonatúria; `SGLT2i ↓Tm_glicose` → glicosúria com
  natriurese leve; `manitol` (osmol não reabsorvível) → ↑osmolalidade tubular → retém água por osmose.
- **Invariantes a testar (§6):** conservação de massa (filtrado = reabsorvido + entregue, tol 1e-7);
  `f_prox↑ → Na_entregue_à_alça↓` (monótono); isosmolalidade: osm tubular ≈ plasmática enquanto não há manitol;
  `V_CA↓ → HCO₃_excretado↑`; glicosúria = 0 enquanto carga < Tm; manitol → osm tubular > plasma. Tudo finito.

**Pérolas (prováveis pelo motor).**
1. **A alça é prisioneira do proximal:** ↑`f_prox` em 10% pode cortar pela metade o Na⁺ entregue à alça — e a
   furosemida só faz xixi com o Na⁺ que **chega** ao ramo espesso. O motor mostra o teto do diurético de alça
   caindo quando o proximal "rouba" antes.
2. **Acetazolamida é diurético fraco e auto-limitado:** ao espremer HCO₃⁻ para a urina, induz **acidose
   metabólica** que apaga seu próprio substrato → o motor mostra a curva de natriurese decaindo em ~3 dias.
3. **SGLT2i: a glicosúria carrega Na⁺ junto:** ao bloquear o cotransporte Na⁺/glicose, há natriurese discreta
   e **restauração do feedback tubuloglomerular** (mais Na⁺ na mácula densa → constrição aferente → P_GC↓) —
   a queda "funcional" da TFG no início, igual ao paradoxo do M1, agora por outra via.

**Instrumento vivo.** Barra segmentar do néfron mostrando, ao vivo, **quanto Na⁺ sai em cada segmento** com o
proximal dominando; ao arrastar `f_prox`, a barra entregue à alça encolhe/cresce e a eficácia computada de um
diurético de alça hipotético sobe/desce. Sobreposta, a curva glicose-reabsorvida × glicemia com o joelho do
`Tm` (limiar e saturação), deslocada à esquerda quando entra SGLT2i.

**Ilustração SVG.** Célula do TCP inline: Na⁺/K⁺-ATPase basolateral (a bomba que paga a conta), SGLT2 e
trocador Na⁺/H⁺ apical, anidrase carbônica (CA II intracelular + CA IV na borda em escova) convertendo
HCO₃⁻↔CO₂. Setas de fluxo de comprimento ∝ fluxo computado. Barra "osmolalidade tubular constante" provando a
isosmose; quando há manitol, a barra sobe e a água fica retida (seta de água reduzida).

**Fármaco encadeado.**
- **Acetazolamida** — *alvo:* anidrase carbônica (CA II/IV) no TCP; *segmento:* ~bloqueia a reabsorção de
  ~⅓ do HCO₃⁻ proximal, mas o resgate distal limita a natriurese (diurético fraco). *Dose educacional:*
  250–500 mg VO/IV cada 6–24 h (glaucoma, alcalose metabólica, mal das alturas). *PD:* `efeito = Emax·D/(EC50+D)`
  com **teto baixo** e **autossupressão** pela acidose que ele cria. *Resistência:* a própria acidose
  metabólica apaga o substrato → tolerância em dias.
- **SGLT2i (dapagliflozina/empagliflozina)** — *alvo:* cotransportador SGLT2 (borda em escova do S1/S2);
  *mecanismo:* glicosúria + natriurese leve + restauração do feedback tubuloglomerular → nefro/cardioproteção.
  *Dose educacional:* dapagliflozina 10 mg VO 1×/dia; empagliflozina 10–25 mg VO 1×/dia. *PD:* efeito de
  glicosúria satura (Emax) acima do limiar; benefício renal é independente da glicemia (mecanismo
  hemodinâmico). *Nota:* queda funcional transitória da TFG ao iniciar — esperada, não lesão.
- **Manitol** — *alvo:* nenhum receptor; é **osmol não reabsorvível** filtrado livremente → retém água no
  túbulo (diurese osmótica). *Dose educacional:* 0,25–1 g/kg IV em bolus (edema cerebral, ↑PIC). *PD:* efeito
  ∝ carga osmótica filtrada; **risco:** expande o ECF antes de diurir (cuidado na ICC) e pode causar
  hiponatremia translocacional. Disclaimer educacional presente; toda dose com unidade + mecanismo, computada
  pelo motor.

**Caso (5 atos).** (1) Mulher, glaucoma, em acetazolamida crônica, agora com bicarbonato 16 e Cl⁻ alto.
(2) *Prever:* perda renal de HCO₃⁻? (3) *Revelar:* acidose metabólica hiperclorêmica por bloqueio da anidrase
carbônica — e a diurese já não responde (autossupressão). (4) Conduta: reconhecer o teto/tolerância; reavaliar
indicação; o segmento "cansou". (5) Síntese: o proximal cobrou o preço — natriurese fraca, ácido-base
reescrito.

**Pontes.** M6 (o Na⁺ que a alça recebe é o que o proximal **não** pegou — prisioneiro do proximal); M13
(ácido-base renal: HCO₃⁻ reabsorvido, a acidose da acetazolamida); M2 (SGLT2i e o feedback tubuloglomerular,
o paradoxo aferente); M17 (bloqueio sequencial do néfron — o proximal é o primeiro andar). Choca M4/M5 (o
volume entregue depende do que chega).

**Avaliação — sementes + gabarito.**
- **Socrática (passos-chave).**
  - *Q:* Por que a acetazolamida é um diurético **fraco**? → *A:* bloqueia só o proximal; os segmentos a
    jusante reabsorvem o Na⁺ "extra" que chega — o resgate distal limita a natriurese e a acidose que ela cria
    apaga o substrato.
  - *Q:* Se eu aumento a reabsorção proximal, o diurético de alça fica mais forte ou mais fraco? → *A:* mais
    **fraco** — chega menos Na⁺ ao ramo espesso, e o de alça só trabalha o Na⁺ que chega (a alça é prisioneira
    do proximal).
- **Revisão (teórica).**
  - *Q:* O que é a tríade da síndrome de Fanconi e o que a glicemia revela? → *Gabarito:* perda proximal
    global — glicosúria + bicarbonatúria + fosfatúria + aminoacidúria — com **glicemia normal** (a glicosúria
    é tubular, não por hiperglicemia); separa defeito do transportador de excesso de carga.
  - *Q:* Por que a reabsorção proximal é **isosmótica**? → *Gabarito:* o Na⁺ (e solutos acoplados) saem com
    água em proporção fixa via aquaporina-1 abundante; a osmolalidade do fluido tubular permanece ≈ plasmática
    ao fim do TCP.
- **Chave de ouro (integradora).**
  - *Q:* Paciente com glicemia 140 mg/dL apresenta glicosúria 3+. Hiperglicemia descontrolada ou outra coisa?
    Justifique pelo mecanismo. → *Gabarito robusto:* **glicosúria com Tm reduzido** — abaixo do limiar de
    ~180 mg/dL não haveria glicosúria por hiperglicemia; logo é SGLT2i em uso (Tm farmacologicamente deslocado)
    ou tubulopatia proximal (Fanconi). *Distrator "diabetes mal controlado":* contradiz o limiar — 140 mg/dL
    não satura o Tm normal. *Distrator "erro de laboratório":* ignora o mecanismo de transporte; o achado é
    fisiologicamente coerente com SGLT2.

---

### M6 · Alça de Henle — fina descendente × ramo espesso (NKCC2), contracorrente, gradiente corticomedular

**Tese & inversão.** A alça de Henle **não concentra a urina** — ela **constrói o gradiente** que torna a
concentração possível. O ramo espesso ascendente (NKCC2) é o **motor diluidor**: reabsorve Na⁺/K⁺/2Cl⁻ sem
água (é impermeável à água), deixando o fluido tubular hipotônico e bombeando solutos para o interstício
medular. A multiplicação por contracorrente faz esse gradiente corticomedular (~300 no córtex → ~1200 mOsm/kg
na papila). A inversão: a urina concentrada do ducto coletor é uma **sombra** do gradiente que a alça criou —
e o diurético de alça apaga o motor que o sustenta.

**Erro → verdade.** *Erro:* "a alça concentra a urina." *Verdade:* o **ramo espesso dilui** (tira soluto sem
água) e **alimenta o gradiente medular**; a concentração final acontece no ducto coletor sob ADH. Bloquear o
NKCC2 (furosemida) é o diurético **mais potente** porque ataca ~25% do Na⁺ filtrado **e** dissipa o gradiente,
abolindo a capacidade de concentrar **e** de diluir.

**Engine `model6.js`.**
- **Fórmula-mãe:** transporte do ramo espesso `J_NKCC2 = Vmax·D_local/(Km+D_local)` (Michaelis–Menten do
  cotransportador), com o gradiente corticomedular gerado por multiplicação por contracorrente:
  `Osm_papila = Osm_cortex · (1 + k·atividade_NKCC2)`. Diurético de alça: `atividade_NKCC2_efetiva =
  basal·(1 − Emax·D/(EC50+D))`, com **resposta limiar** (precisa atingir concentração luminal mínima → curva
  íngreme/“tudo ou nada” acima do limiar).
- **Entradas (estado):** `Na_entregue` (do M5), `Vmax_NKCC2`, `Km`, `dose_loop` (mg), `albumina`/secreção
  tubular (a droga age **do lado luminal**, depende de secreção pelo OAT), `TFG` (modula entrega à alça).
- **Saídas:** `Na_reab_alça`, `Na_entregue_ao_TCD`, `Osm_papila` (gradiente), `clearance_H₂O_livre`,
  `flag` (diluição máxima vs gradiente abolido vs braking).
- **Alavancas de mecanismo:** dose-resposta com **teto** (acima do EC efetivo, dobrar a dose não faz mais — o
  transportador já está saturadamente bloqueado); **limiar** de secreção (hipoalbuminemia/DRC empurram a curva
  à direita — precisa de mais dose para o mesmo efeito luminal); **braking** (a natriurese aguda ativa
  RAAS + hipertrofia distal → a curva desloca à direita nos dias seguintes).
- **Invariantes a testar (§6):** `dose_loop↑ → Na_entregue_ao_TCD↑` até o **teto**, depois platô (∂/∂D→0 acima
  do EC efetivo); `dose_loop↑ → Osm_papila↓` (gradiente dissipa); `Na_entregue↑ (do M5) → efeito_loop↑`
  (substrato); conservação de massa; `clearance_H₂O_livre` muda de sinal coerentemente. Tudo finito, clamps OK.

**Pérolas (prováveis pelo motor).**
1. **Teto, não rampa:** abaixo do limiar de secreção, **nenhuma** natriurese (dose "perdida"); acima dele, a
   resposta é íngreme; e além do EC efetivo, **dobrar a dose não faz mais xixi** — é o teto. O motor desenha a
   curva sigmoide com platô.
2. **O de alça apaga os dois extremos:** ao matar o ramo espesso, abole a **concentração** (sem gradiente) e a
   **diluição** (sem o motor diluidor) → urina iso-osmótica. O motor mostra `Osm_papila` desabando.
3. **Braking desloca a curva à direita:** a mesma dose que diuriu forte no dia 1 diuri menos no dia 4 (RAAS +
   hipertrofia distal reabsorvem o Na⁺ entregue) — a curva inteira anda para a direita, não some.

**Instrumento vivo.** Curva **natriurese × dose** (log-dose) com **limiar** à esquerda, subida íngreme, e
**teto** à direita; ao lado, o eixo corticomedular como gradiente de cor (300→1200 mOsm/kg) que **achata** ao
vivo conforme a dose de furosemida sobe. Um botão "braking (dia 4)" desloca a curva inteira à direita.

**Ilustração SVG.** Alça em U inline: ramo fino descendente (permeável à água, setas de água saindo) × ramo
espesso ascendente (impermeável à água, NKCC2 apical bombeando Na⁺/K⁺/2Cl⁻, ROMK reciclando K⁺, voltagem
luminal positiva empurrando Ca²⁺/Mg²⁺ paracelular). Gradiente medular como degradê computado; setas de
comprimento ∝ fluxo do engine.

**Fármaco encadeado.**
- **Furosemida** — *alvo:* NKCC2 (lado **luminal**, secretado pelo OAT no TCP); *segmento:* ramo espesso,
  ~25% do Na⁺ filtrado → **diurético de teto alto** (o mais potente). *Dose educacional:* 20–40 mg IV/VO
  inicial, titulável; biodisponibilidade oral errática (~50%, 10–100%). *PD:* curva sigmoide com **limiar**
  (secreção) e **teto**; na DRC/ICC o limiar sobe → precisa de mais dose para chegar ao lúmen. *Braking:*
  resposta cai com o uso → estratégia é **mais frequente**, não só mais alto.
- **Bumetanida** — *alvo:* mesmo NKCC2; **~40× mais potente em mg** (1 mg bumetanida ≈ 40 mg furosemida);
  biodisponibilidade oral ~80–100% (mais previsível). *Dose educacional:* 0,5–1 mg IV/VO. Mesmo teto
  fisiológico — a potência muda a **dose**, não o **efeito máximo** alcançável.
- **Torasemida** — *alvo:* NKCC2; ~2× a furosemida (20 mg torasemida ≈ 40 mg furosemida); meia-vida mais longa,
  biodisponibilidade ~80–90% e efeito anti-fibrótico/antialdosterona adicional. *Dose educacional:* 10–20 mg
  VO. *Equivalências de potência (educacional, computadas pelo motor):* **40 mg furosemida VO ≈ 20 mg
  furosemida IV ≈ 1 mg bumetanida ≈ 20 mg torasemida.** Disclaimer educacional; dose↔unidade↔mecanismo do motor.

**Caso (5 atos).** (1) ICC descompensada, edema, furosemida 40 mg VO sem resposta. (2) *Prever:* aumentar a
dose oral resolve? (3) *Revelar:* o problema é o **limiar** — biodisponibilidade oral e congestão intestinal
não levam a droga ao lúmen; o teto não foi atingido por falta de **entrega**, não de potência. (4) Conduta:
mudar para IV (e dose mais frequente), garantir que a curva atinja o limiar; considerar bloqueio sequencial se
houver braking. (5) Síntese: dose certa é a que **chega** ao NKCC2; potência é mg, teto é fisiologia.

**Pontes.** M5 (a alça é prisioneira do proximal — o Na⁺ que chega é o que sobra); M7 (bloqueio sequencial:
furosemida + tiazídico atacam dois segmentos); M9/M10 (gradiente medular ↔ capacidade de concentrar/diluir, as
disnatremias); M17 (capstone diurético: teto, braking, resistência, sinergia); M37 (UF × diurético na
cardiorrenal). Choca M25 (ressuscitação volêmica — o avesso da depleção que o de alça pode causar).

**Avaliação — sementes + gabarito.**
- **Socrática (passos-chave).**
  - *Q:* A alça concentra ou dilui a urina? → *A:* o ramo espesso **dilui** (tira soluto sem água) e com isso
    **constrói o gradiente medular**; a concentração final é no ducto coletor sob ADH.
  - *Q:* Por que dobrar a furosemida às vezes não faz nada? → *A:* ou está **abaixo do limiar** (não chega ao
    lúmen — dose perdida) ou já está **no teto** (NKCC2 saturadamente bloqueado) — em ambos a derivada
    ∂efeito/∂dose é ~0.
- **Revisão (teórica).**
  - *Q:* Por que o diurético de alça é o mais potente? → *Gabarito:* ataca ~25% do Na⁺ filtrado **e** dissipa
    o gradiente corticomedular, abolindo concentração e diluição; teto fisiológico alto.
  - *Q:* O que muda entre furosemida, bumetanida e torasemida — potência ou efeito máximo? → *Gabarito:* a
    **potência** (mg para o mesmo efeito) e a farmacocinética (biodisponibilidade/meia-vida); o **efeito
    máximo** (teto) é o mesmo NKCC2 — 1 mg bumetanida ≈ 40 mg furosemida ≈ 20 mg torasemida.
- **Chave de ouro (integradora).**
  - *Q:* Paciente em furosemida 80 mg VO 2×/dia há 1 semana diuri cada vez menos. Aumentar a dose ou mudar a
    estratégia? Justifique. → *Gabarito robusto:* **mudar a estratégia (mais frequente + bloqueio sequencial),
    não só subir a dose** — o platô é **braking** (RAAS + hipertrofia distal reabsorvem o Na⁺ entregue), e a
    curva já está deslocada à direita; subir além do teto não acrescenta natriurese. *Distrator "dobrar a
    dose":* ignora o teto — acima do EC efetivo a derivada é nula. *Distrator "suspender o diurético":*
    abandona o controle de volume na ICC; o problema é tática de entrega, não a droga.

---

### M7 · TCD — NCC, manejo de Ca²⁺, o segmento diluidor distal

**Tese & inversão.** O túbulo contorcido distal é o **ajuste fino**: reabsorve só ~5–7% do Na⁺ filtrado, via
cotransportador Na⁺/Cl⁻ (**NCC**, sensível aos tiazídicos), e é **impermeável à água** (segmento diluidor
distal — afina ainda mais a urina já diluída pela alça). A inversão clássica: o tiazídico, ao bloquear o NCC,
**perde Na⁺ mas retém Ca²⁺** — o **paradoxo do cálcio**. A célula, depletada de Na⁺ intracelular, acelera o
trocador basolateral Na⁺/Ca²⁺ e o TRPV5 apical → reabsorve **mais** cálcio. Por isso tiazídico trata
hipercalciúria/litíase, e diurético de alça (que **perde** Ca²⁺) faz o oposto.

**Erro → verdade.** *Erro:* "todo segmento do túbulo é igual; diurético é diurético." *Verdade:* o TCD é
**distinto** — NCC, não NKCC2; ajuste fino, não bombeamento grosso; e o **cálcio anda no sentido oposto** do
de alça. Tiazídico **retém** Ca²⁺ (paradoxo: antilitíase); de alça **perde** Ca²⁺ (uso na hipercalcemia). O
sódio do tiazídico é fraco — mas seu efeito **anti-hipertensivo** persiste por vasodilatação além da natriurese.

**Engine `model7.js`.**
- **Fórmula-mãe:** `J_NCC = Vmax·D_local/(Km+D_local)`, ~5–7% do Na⁺ filtrado. Tiazídico:
  `J_NCC_efetivo = basal·(1 − Emax·D/(EC50+D))` com **teto baixo** (segmento pequeno). Cálcio acoplado
  inversamente: `Ca_reab = Ca_basal·(1 + α·(1 − Na_intracelular))` → bloquear NCC ↓Na intracelular ↑Ca_reab
  (o paradoxo). Dependência da TFG: `efeito_tiazida ∝ TFG/(TFG+k)` → **some** quando TFG < ~30 mL/min.
- **Entradas (estado):** `Na_entregue` (do M6), `Vmax_NCC`, `dose_tiazida` (mg), `TFG` (mL/min), `Ca_filtrado`.
- **Saídas:** `Na_reab_TCD`, `Na_entregue_ao_ducto`, `Ca_excretado` (cai com tiazida, sobe com de alça),
  `flag` (natriurese leve · paradoxo do Ca ativo · perda de efeito por TFG baixa).
- **Alavancas de mecanismo:** dose-resposta com **teto baixo** (segmento reabsorve pouco → natriurese máxima
  modesta); **perda de eficácia em TFG baixa** (precisa ser filtrado/secretado e chegar ao NCC); paradoxo do
  Ca²⁺ ativo proporcional ao bloqueio.
- **Invariantes a testar (§6):** `dose_tiazida↑ → Ca_excretado↓` (paradoxo, monótono); `dose_tiazida↑ →
  Na_entregue_ao_ducto↑` até **teto baixo**; `TFG↓ → efeito_tiazida↓` (some abaixo de ~30); contraste de sinal
  com o M6 (de alça: Ca_excretado↑); conservação de massa. Tudo finito.

**Pérolas (prováveis pelo motor).**
1. **Paradoxo do cálcio:** o motor mostra Na⁺ excretado **subindo** e Ca²⁺ excretado **descendo** com a mesma
   dose de tiazídico — direções opostas no mesmo gráfico (base do uso na nefrolitíase cálcica e na osteoporose).
2. **Tiazídico morre na DRC:** abaixo de TFG ~30 mL/min o efeito natriurético despenca (entrega ao NCC cai) —
   o motor apaga a curva; daí trocar por (ou somar a) diurético de alça na DRC avançada.
3. **O Na⁺ é fraco, mas a pressão cai:** a natriurese máxima do tiazídico é pequena (teto baixo), mas o efeito
   anti-hipertensivo persiste (vasodilatação por ↓Na vascular e ↓RVP a longo prazo) — efeito > natriurese.

**Instrumento vivo.** Gráfico de **duas curvas espelhadas vs dose de tiazídico**: Na⁺ excretado **sobe**
(teto baixo) e Ca²⁺ excretado **desce** (paradoxo) — computadas ao vivo. Um slider de TFG mostra a curva de
natriurese **encolhendo** até sumir abaixo de ~30 mL/min. Comparação lado a lado com a seta de Ca²⁺ do M6
(de alça) apontando para cima.

**Ilustração SVG.** Célula do TCD inline: NCC apical (Na⁺/Cl⁻), Na⁺/K⁺-ATPase e trocador Na⁺/Ca²⁺ (NCX)
basolaterais, canal TRPV5 apical de Ca²⁺ e calbindina intracelular. Setas de Na⁺ e Ca²⁺ em **sentidos
opostos** quando o tiazídico bloqueia o NCC (comprimento ∝ engine). Tag "impermeável à água = diluidor distal".

**Fármaco encadeado.**
- **Hidroclorotiazida (HCTZ)** — *alvo:* NCC (lado luminal); *segmento:* TCD, ~5–7% do Na⁺ → **diurético de
  teto baixo**. *Dose educacional:* 12,5–25 mg VO 1×/dia (HAS); até 50 mg (edema). *PD:* curva sigmoide com
  teto modesto; meia-vida curta (~6–15 h); **perde efeito em TFG < ~30 mL/min**. *Efeito-alvo:* anti-HAS
  (vasodilatação) > natriurese; *adverso mecanístico:* hipocalemia, hiponatremia, hipercalcemia (paradoxo),
  hiperuricemia, hiperglicemia.
- **Clortalidona** — *alvo:* mesmo NCC; **mais potente e meia-vida muito mais longa** (~40–60 h) → controle
  pressórico mais estável/24 h. *Dose educacional:* 12,5–25 mg VO 1×/dia. Mesmo paradoxo do Ca²⁺; maior risco
  de hipocalemia pela ação prolongada. *Equivalência educacional:* clortalidona ~1,5–2× HCTZ em mg para efeito
  anti-HAS.
- *Encadeamento ao M8:* a natriurese do tiazídico **entrega Na⁺ ao ducto coletor**, que sob aldosterona troca
  Na⁺ por **K⁺/H⁺** → daí a hipocalemia e a alcalose; combinar com poupador de K⁺ (M8) corrige por mecanismo.
  Disclaimer educacional presente; dose↔unidade↔mecanismo computados pelo motor.

**Caso (5 atos).** (1) Paciente com litíase cálcica de repetição e hipercalciúria; pressão limítrofe.
(2) *Prever:* qual diurético reduz a recorrência de cálculo? (3) *Revelar:* **tiazídico** — o paradoxo do Ca²⁺
reduz a calciúria (e ainda trata a HAS); de alça faria o oposto (↑calciúria). (4) Conduta: HCTZ 25 mg/dia,
vigiar K⁺/Na⁺. (5) Síntese: o segmento manda no íon — TCD retém Ca²⁺, alça perde Ca²⁺.

**Pontes.** M6 (contraste do Ca²⁺: de alça perde, tiazídico retém; bloqueio sequencial); M8 (a natriurese do
tiazídico vira hipocalemia no ducto — o poupador de K⁺ fecha a conta); M12 (Ca/PO₄/Mg — o paradoxo do cálcio,
litíase, osso); M11 (hipocalemia tiazídica); M17 (capstone diurético — sinergia sequencial). Choca M28
(anti-hipertensivos — o tiazídico como base da HAS).

**Avaliação — sementes + gabarito.**
- **Socrática (passos-chave).**
  - *Q:* O tiazídico faz o cálcio urinário subir ou descer, e por quê? → *A:* **descer** — bloquear o NCC
    depleta o Na⁺ intracelular, acelera o trocador Na⁺/Ca²⁺ basolateral e o TRPV5 apical → reabsorve **mais**
    Ca²⁺ (o paradoxo).
  - *Q:* Por que o tiazídico "para de funcionar" na DRC avançada? → *A:* o efeito depende da entrega ao NCC;
    com TFG < ~30 mL/min chega pouco fármaco/Na⁺ ao TCD → a curva de natriurese despenca.
- **Revisão (teórica).**
  - *Q:* Compare o manejo de Ca²⁺ entre diurético de alça e tiazídico e dê o uso clínico de cada direção. →
    *Gabarito:* de alça → **calciúria↑** (uso na hipercalcemia); tiazídico → **calciúria↓** (uso na litíase
    cálcica/osteoporose). Direções opostas porque agem em segmentos com manejo de Ca²⁺ distinto.
  - *Q:* Por que o efeito anti-hipertensivo do tiazídico supera sua natriurese? → *Gabarito:* a natriurese tem
    teto baixo (segmento pequeno), mas há **vasodilatação/↓RVP** a longo prazo — o efeito pressórico persiste
    além do balanço de Na⁺.
- **Chave de ouro (integradora).**
  - *Q:* Paciente em HCTZ desenvolve K⁺ 3,0 e Na⁺ 128. Como o mecanismo do TCD explica os dois, e qual o ajuste
    racional? → *Gabarito robusto:* o tiazídico **entrega mais Na⁺ ao ducto coletor**, onde a aldosterona troca
    Na⁺ por **K⁺/H⁺** → hipocalemia/alcalose; e ao bloquear o **diluidor distal** prejudica a excreção de água
    livre → **hiponatremia** (potencializada se houver ADH/sede). *Ajuste:* reduzir dose e/ou **somar poupador
    de K⁺** (M8 — corrige a troca distal por mecanismo). *Distrator "repor só KCl":* trata o número, não a
    troca distal que o causa. *Distrator "trocar por de alça":* perderia o paradoxo do Ca²⁺ e a indolência
    natriurética desejada na HAS leve.

---

### M8 · Ducto coletor — célula principal (ENaC/aldosterona) × intercalar (H⁺/HCO₃), ADH/aquaporinas

**Tese & inversão.** O ducto coletor é o **andar das decisões finais** — pouca quantidade, máximo ajuste. A
**célula principal** reabsorve Na⁺ pelo canal **ENaC** (sob aldosterona) e, por essa reabsorção
eletrogênica, **secreta K⁺** (ROMK); e abre **aquaporina-2** sob **ADH** para reabsorver água. A **célula
intercalar** acerta o ácido-base (secreta H⁺ ou HCO₃⁻). A inversão central: **aldosterona não é "sódio" — é
troca de Na⁺ por K⁺/H⁺**; e o **ADH** é uma alavanca **independente** (água, não sódio). Duas alavancas
distintas: uma move volume/K⁺ (aldosterona), outra move **água livre** (ADH). Confundi-las é confundir
disnatremia com disvolemia.

**Erro → verdade.** *Erro:* "aldosterona = retém sódio." *Verdade:* o ENaC reabsorve Na⁺ **trocando** por K⁺
e H⁺ — por isso hiperaldosteronismo dá **hipocalemia + alcalose**, e os poupadores de K⁺ retêm K⁺ ao bloquear
exatamente essa troca. E **ADH ≠ aldosterona:** o ADH abre aquaporinas (água), governando a tonicidade
(disnatremia), não o volume — daí os vaptanos tratarem hiponatremia, não edema de sódio.

**Engine `model8.js`.**
- **Fórmula-mãe:** célula principal — `Na_reab_ENaC = g_ENaC·(aldosterona)·driving`, e **secreção de K⁺
  acoplada** ao fluxo e à voltagem: `K_secretado = f(Na_entregue, fluxo, aldosterona, [K]p)`. Água:
  `H₂O_reab = AQP2(ADH)·(gradiente medular do M6)` → osmolalidade urinária final. Intercalar:
  `H⁺_secretado = h(aldosterona, estado ácido-base)`.
- **Entradas (estado):** `Na_entregue` (do M7), `aldosterona` (relativa), `ADH` (relativo), `[K]plasma`,
  `gradiente_medular` (do M6), `dose` (espironolactona/amilorida/vaptano).
- **Saídas:** `Na_excretado_final`, `K_excretado`, `H⁺/HCO₃` urinário, `Osm_urina` (governada por ADH ×
  gradiente), `flag` (poupador de K⁺ ativo · vaptano = aquarese · SIADH · diabetes insípido).
- **Alavancas de mecanismo:** **espironolactona/eplerenona** ↓aldosterona-efeito → ↓ENaC → **retém K⁺**, leve
  natriurese; **amilorida** bloqueia ENaC diretamente (independe de aldosterona) → mesmo efeito poupador;
  **vaptano** bloqueia receptor V2 → ↓AQP2 → **aquarese** (perde água livre, Na⁺ sobe) sem natriurese.
- **Invariantes a testar (§6):** `aldosterona↑ → Na_reab↑ e K_excretado↑` (a troca); poupador de K⁺ →
  `K_excretado↓` (monótono na dose); **duas alavancas independentes**: variar `ADH` muda `Osm_urina` **sem**
  mudar `K_excretado` apreciavelmente, e variar `aldosterona` muda `K_excretado` **sem** depender de `ADH`;
  vaptano → `Osm_urina↓` e `Na_plasma↑` sem natriurese. Conservação; tudo finito.

**Pérolas (prováveis pelo motor).**
1. **Aldosterona troca Na⁺ por K⁺/H⁺:** o motor mostra que mais aldosterona retém Na⁺ **e** despeja K⁺ e H⁺ →
   hipocalemia + alcalose metabólica; bloqueá-la inverte os três de uma vez (a base do uso na ICC e na cirrose).
2. **Duas alavancas ortogonais:** mexer no **ADH** move a osmolalidade urinária (água) **sem** mover o K⁺;
   mexer na **aldosterona** move o K⁺ (sódio/troca) **sem** depender do ADH — o motor prova a independência
   (água ≠ sódio; tonicidade ≠ volume).
3. **Vaptano é aquarese, não natriurese:** o motor mostra Na⁺ plasmático **subindo** por perda de **água
   livre** (sem perder Na⁺ na urina) — ferramenta da hiponatremia euvolêmica (SIADH), não do edema.

**Instrumento vivo.** Painel de **duas alavancas independentes**: slider de **aldosterona** move barras de
Na⁺-retido e K⁺-excretado (acopladas); slider de **ADH** move a **osmolalidade urinária** (de ~50 a ~1200
mOsm/kg, limitada pelo gradiente do M6) **sem** mexer no K⁺. Botões "espironolactona", "amilorida" e "vaptano"
mostram, ao vivo, qual alavanca cada droga puxa.

**Ilustração SVG.** Ducto coletor inline com **duas células**: principal (ENaC apical, ROMK secretando K⁺,
Na⁺/K⁺-ATPase basolateral, AQP2 apical inserida pelo ADH) e intercalar (H⁺-ATPase, trocador Cl⁻/HCO₃⁻). Setas
de Na⁺↓, K⁺↑ e água (comprimento ∝ engine). Receptor V2 e mineralocorticoide marcados; a droga "tampando" o
canal/receptor correspondente.

**Fármaco encadeado.**
- **Espironolactona** — *alvo:* receptor mineralocorticoide (antagonista competitivo da aldosterona);
  *segmento:* célula principal → ↓ENaC → **retém K⁺**, natriurese leve. *Dose educacional:* 25–50 mg VO 1×/dia
  (ICC/HAS resistente); 100–400 mg/dia (ascite cirrótica). *PD:* início lento (dias — efeito genômico);
  *adverso mecanístico:* hipercalemia, ginecomastia (atividade antiandrogênica).
- **Eplerenona** — *alvo:* mesmo receptor, **mais seletivo** (menos ginecomastia). *Dose educacional:*
  25–50 mg VO 1×/dia. Mesmo risco de hipercalemia.
- **Amilorida** — *alvo:* **bloqueia o ENaC diretamente** (independe da aldosterona) → poupa K⁺ por outra via.
  *Dose educacional:* 5–10 mg VO 1×/dia. Útil quando a troca distal é o problema (ex.: hipocalemia por
  tiazídico — encadeamento com o M7).
- **Vaptanos (tolvaptano)** — *alvo:* **antagonista do receptor V2** → ↓AQP2 → **aquarese** (perde água livre,
  ↑Na⁺ plasmático) sem natriurese. *Dose educacional:* tolvaptano 15 mg VO 1×/dia, titulável (hiponatremia
  euvolêmica/SIADH); **correção não pode ser rápida** (risco de mielinólise — ver M10). Disclaimer educacional;
  dose↔unidade↔mecanismo computados pelo motor.

**Caso (5 atos).** (1) Cirrótico com ascite e K⁺ 3,2 em furosemida isolada. (2) *Prever:* só aumentar a
furosemida resolve? (3) *Revelar:* o hiperaldosteronismo da cirrose **troca Na⁺ por K⁺** no ducto — a
furosemida que entrega mais Na⁺ distal **piora** a hipocalemia; falta bloquear a troca. (4) Conduta:
**espironolactona** (a base na ascite) ± furosemida na proporção ~100:40 mg — corrige K⁺ e mobiliza ascite por
mecanismo. (5) Síntese: aldosterona não era "sódio", era a troca; o poupador fecha a conta.

**Pontes.** M7 (a natriurese do tiazídico vira hipocalemia aqui — o poupador de K⁺ corrige); M9/M10 (ADH e
água livre — disnatremias, vaptanos, velocidade de correção); M11 (potássio — a troca distal é o eixo); M13
(célula intercalar e o ácido-base, ATR distal); M14 (RAAS — a aldosterona como hormônio); M16 (cardiorrenal e
hepatorrenal — o hiperaldosteronismo secundário). Choca M28 (ARM na ICC — a ponte da hemodinâmica).

**Avaliação — sementes + gabarito.**
- **Socrática (passos-chave).**
  - *Q:* Por que o hiperaldosteronismo causa **hipocalemia e alcalose**, não só retenção de Na⁺? → *A:* o ENaC
    reabsorve Na⁺ de forma eletrogênica → a luz fica negativa → **secreta K⁺ e H⁺** em troca; aldosterona é
    **troca**, não só sódio.
  - *Q:* O vaptano faz o paciente perder sódio ou água? → *A:* **água livre** (aquarese) — bloqueia o V2,
    fecha as aquaporinas; o Na⁺ plasmático **sobe** sem natriurese (trata SIADH, não edema).
- **Revisão (teórica).**
  - *Q:* Diferencie as duas alavancas do ducto coletor e o que cada uma trata. → *Gabarito:* **aldosterona/ENaC**
    move Na⁺/K⁺/H⁺ (volume e potássio — ARM/amilorida); **ADH/AQP2** move água livre (tonicidade/disnatremia —
    vaptano). Eixos independentes: água ≠ sódio.
  - *Q:* Por que amilorida poupa K⁺ mesmo sem antagonizar a aldosterona? → *Gabarito:* bloqueia o **ENaC
    diretamente** → sem reabsorção eletrogênica de Na⁺, a luz não fica negativa → cessa o estímulo à secreção
    de K⁺; independe do receptor mineralocorticoide.
- **Chave de ouro (integradora).**
  - *Q:* Paciente em tiazídico + furosemida evolui com K⁺ 2,9 e alcalose. Qual droga **adicionar** e por qual
    mecanismo, em vez de só repor KCl? → *Gabarito robusto:* **somar um poupador de K⁺ (espironolactona ou
    amilorida)** — o problema é a **troca distal**: os diuréticos a montante entregam mais Na⁺ ao ducto, e a
    aldosterona troca esse Na⁺ por K⁺/H⁺ (hipocalemia + alcalose); bloquear o ENaC/receptor corrige a **causa**.
    *Distrator "repor só KCl":* trata o número sem fechar a torneira de perda — recidiva. *Distrator "suspender
    todos os diuréticos":* sacrifica o controle de volume; a correção mecanística é o bloqueio sequencial
    completo (do TCP ao ducto — M17). *Distrator "dar bicarbonato":* piora a alcalose já presente.

---

### Bloco III · O meio interno (o que o rim defende)

### M9 · Sódio e volume — o rim defende o VOLUME circulante efetivo, não a concentração

**Tese & inversão.** O rim não defende a *concentração* de sódio: defende o **volume circulante efetivo**
(VCE) — o enchimento que os barorreceptores sentem. O Na⁺ é **proxy de água**: onde o sódio vai, a água o
segue. Volume e tonicidade são **dois eixos ortogonais** — o corpo regula volume pelo *conteúdo total* de
Na⁺ (via aldosterona/RAAS/SNS/peptídeos natriuréticos) e regula tonicidade pela *água livre* (via ADH/sede,
M10). O número [Na⁺] no soro **não diz volume**: um hiponatrêmico pode estar hipervolêmico (ICC), euvolêmico
(SIADH) ou hipovolêmico (perdas) — três volumes, um único número. Decompor os dois eixos antes de interpretar.

**Erro → verdade.** *Erro:* "Na baixo = falta de sal, reponha sódio." *Verdade:* o [Na⁺] mede **água**, não
sal; o estoque de sódio mede **volume**. Repor NaCl num hiponatrêmico hipervolêmico (ICC) **piora** a
congestão. A defesa do VCE pode até *sacrificar* a tonicidade: na ICC o VCE↓ liga o ADH não-osmótico, retém
água livre e dilui o Na⁺ — a hiponatremia é o **preço pago** pela tentativa de defender o volume.

**Engine `model9.js`.**
- **Fórmula-mãe:** dois eixos desacoplados. **Volume:** `VCE ∝ Na⁺_total_corporal` (estoque); o balanço de
  Na⁺ é `ΔNa_total = ingestão − excreção`, com `excreção_Na = f(VCE)` via ganho do RAAS/aldosterona (VCE↓ →
  reabsorção↑ → FE_Na↓). **Tonicidade:** `[Na⁺] ≈ tonicidade/2 = (Na_total + K_total) / TBW` (Edelman) — o
  número de concentração é estoque de cátion dividido por **água**, não por volume de Na⁺.
- **Entradas (estado):** `Na_total` (mEq), `TBW` (L), `K_total` (mEq), `ingestaoNa` (mEq·d⁻¹), `ganhoRAAS`
  (sensibilidade do eixo ao VCE), `estadoVCE` (depletado × euvolêmico × sobrecarregado).
- **Saídas:** `VCE` (relativo), `[Na⁺]` (mEq·L⁻¹), `FE_Na` (%), `Na_urinario` (mEq·L⁻¹), `flag` de quadrante
  (volume↑↓ × tonicidade↑↓ — os quatro combos: hipo/hiper-volêmico × hipo/hiper/normo-natrêmico).
- **Alavanca do VCE:** laço de ponto-fixo **amortecido** (§6): VCE abaixo do set-point → aldosterona↑ →
  reabsorção distal de Na↑ → FE_Na↓ (→ <1%) → Na_urinário↓; VCE acima → peptídeos natriuréticos → FE_Na↑.
- **Invariantes a testar (§6):** os dois eixos são **independentes** — variar `TBW` move `[Na⁺]` sem mover
  `VCE` a Na_total fixo; variar `Na_total` move `VCE`/`FE_Na` sem mover `[Na⁺]` a TBW proporcional. Identidade
  de Edelman `[Na⁺]·TBW = Na_total+K_total` (tol 1e-7). `FE_Na ∈ (0,100)`; ∂FE_Na/∂VCE < 0 na zona de avidez;
  conservação de Na⁺ no balanço (entra − sai = Δestoque).

**Pérolas (prováveis pelo motor).**
1. **Um número, três volumes:** o motor produz o mesmo `[Na⁺]=125` com VCE depletado, euvolêmico e
   sobrecarregado — a concentração é **cega ao volume**. A urina (FE_Na, Na_urinário) é que separa.
2. **A defesa do volume sacrifica a tonicidade:** baixar o VCE liga o ADH não-osmótico; o motor mostra
   `[Na⁺]↓` *causado* pela tentativa de salvar o volume — a hiponatremia como sintoma de hipoperfusão.
3. **Avidez de sódio = VCE baixo, não rim doente:** FE_Na <1% com oligúria é o rim **funcionando** (retém Na
   para encher o tanque), não falhando — a mesma assinatura do pré-renal (ponte M15/M16).

**Instrumento vivo.** **Plano cartesiano dos dois eixos:** eixo-x = VCE (volume), eixo-y = tonicidade/[Na⁺].
O paciente é um ponto que se move nos quatro quadrantes conforme `Na_total` (desliza horizontal) e `TBW`
(desliza vertical) — ao vivo. Ao lado, barra de FE_Na que despenca quando o VCE cai (a avidez de sódio).

**Ilustração SVG.** Inline: dois tanques lado a lado — o **tanque de volume** (nível ∝ VCE, com a torneira da
aldosterona regulando a saída de Na⁺) e o **balde de concentração** (sal dissolvido em água, [Na⁺] = grãos/
água). Setas mostram que despejar água pura no balde **dilui** sem mexer no tanque. Quadrante 2×2 computado
realça onde o paciente está. FE_Na como medidor radial computado do engine.

**Caso (5 atos).** (1) Mulher, 70 a, ICC NYHA III, edema de membros, [Na⁺] 126, ortopneia. (2) *Prever:*
falta sódio — repor NaCl? (3) *Revelar:* hipervolêmica com VCE **baixo** (o coração não enche a árvore
arterial) → ADH não-osmótico dilui; sobra sódio total (edema), falta água-livre clearada. (4) Conduta
(educacional): restrição de água livre, otimizar o débito/descongestão; **não** repor NaCl (pioraria a
congestão). (5) Síntese: o [Na⁺] mediu a água; o edema mediu o sódio; o VCE explicou os dois.

**Pontes.** Choca M4/M5 (Guyton: o VCE é o retorno venoso que enche a curva; responsivo≠tolerante) e Choca
M25 (ressuscitação volêmica — repor volume é repor VCE, não [Na⁺]). FILTRA M10 (o eixo da água livre que
fecha a hiponatremia), M14 (RAAS/aldosterona como a alavanca do VCE), M15 (FE_Na separa avidez de NTA), M16
(cardiorrenal: VCE baixo com volume total alto), M37 (UF vs diurético na congestão).

**Avaliação — sementes + gabarito.**
- **Socrática (passos-chave).**
  - *Q:* O que o [Na⁺] sérico mede — sódio ou água? → *A:* **água**: é estoque de cátion ÷ TBW (Edelman). Um
    [Na⁺] baixo é quase sempre excesso de água, não falta de sal.
  - *Q:* Como o rim mede o "volume" que ele defende? → *A:* não mede volume total; mede o **VCE** — o
    enchimento arterial percebido pelos barorreceptores (carótida, aferente, átrio). Por isso a ICC, cheia de
    edema, sente VCE *baixo*.
  - *Q:* Por que FE_Na <1% num paciente edemaciado? → *A:* o VCE está baixo → aldosterona retém Na avidamente;
    o rim enche o compartimento arterial às custas de mais edema intersticial.
- **Revisão (teórica).**
  - *Q:* Separe os reguladores dos dois eixos. → *Gabarito:* **volume/VCE** ← Na⁺ total, via
    RAAS/aldosterona, SNS, peptídeos natriuréticos (sensores de pressão/estiramento). **Tonicidade/[Na⁺]** ←
    água livre, via ADH e sede (osmorreceptores hipotalâmicos). Eixos distintos com sensores distintos.
  - *Q:* Por que repor NaCl piora a hiponatremia da ICC? → *Gabarito:* o problema não é falta de sódio (há
    excesso, daí o edema), é excesso de água retida pelo ADH não-osmótico; adicionar NaCl adiciona volume
    isotônico → mais congestão, sem corrigir a água-livre em excesso.
- **Chave de ouro (integradora).**
  - *Q:* Três pacientes, todos com [Na⁺] 124: (A) vômitos e desidratado, FE_Na 0,3%; (B) ICC edemaciado,
    FE_Na 0,4%; (C) pós-operatório euvolêmico, urina concentrada, FE_Na 1,5%. Mesmo número — condutas
    iguais? → *Gabarito robusto:* **não** — o número é cego ao volume. (A) **hipovolêmico**: VCE baixo real →
    repor volume isotônico corrige o ADH de depleção. (B) **hipervolêmico** (VCE baixo funcional): restringir
    água, descongestionar — repor sal pioraria. (C) **euvolêmico** (SIADH): restrição de água ± vaptano. *O
    erro comum* ("[Na⁺] 124 → dar NaCl 3% em todos") trata o número, não o eixo: salvaria só o sintomático
    grave e afundaria o congesto. O VCE e a urina (FE_Na, Na_urinário) é que comandam a conduta.

---

### M10 · Água livre e o sódio — disnatremias são distúrbios de ÁGUA

**Tese & inversão.** Disnatremia é **distúrbio de água**, não de sódio. O [Na⁺] sobe ou desce porque a
**água livre** entrou ou saiu do balanço — governada por **ADH/vasopressina** (a torneira da reabsorção de
água no ducto coletor) e pela **sede** (a entrada). A hiponatremia é água a mais; a hipernatremia é água a
menos (quase sempre com sede bloqueada ou acesso negado à água). E há um segundo eixo, **temporal**: a
**velocidade** de correção importa tanto quanto o alvo — corrigir rápido demais machuca o cérebro adaptado
(mielinólise pontina × edema cerebral). O número é a sombra; a água e o tempo são a causa.

**Erro → verdade.** *Erro:* "tratar o número Na" — empurrar [Na⁺] de volta ao normal o mais rápido possível.
*Verdade:* corrige-se a **água** (clearance de água livre), e a **velocidade** é uma variável clínica de
primeira classe: o cérebro cronicamente hiponatrêmico expulsou osmoles para não inchar; subir o Na⁺ rápido
**encolhe** os neurônios → **mielinólise/desmielinização osmótica**. O cronicamente hipernatrêmico fez o
oposto (osmoles idiogênicos); baixar rápido → **edema cerebral**. Limite-alvo educacional: **≤ 8–10
mEq·L⁻¹ por 24 h** (mais conservador, ~6–8, em alto risco) — ancorado ao mecanismo da readaptação osmótica.

**Engine `model10.js`.**
- **Fórmula-mãe:** **clearance de água livre** e a **regra de Adrogué–Madias**.
  `C_H2O_eletrólitos = V̇ · (1 − (U_Na+U_K)/P_Na)` (água livre que o rim gera/retém). Para correção:
  `Δ[Na⁺] por litro infundido = (Na_infusato − Na_sérico) / (TBW + 1)`. Tonicidade governada por ADH:
  `reabsorção de água ∝ ADH` (aquaporinas-2), `[Na⁺] ≈ (Na_total+K_total)/TBW`.
- **Entradas (estado):** `Na_serico` (mEq·L⁻¹), `TBW` (L), `ADH` (nível, 0–alto), `aguaIngerida` (L·d⁻¹),
  `perdaInsensivel` (L·d⁻¹), `infusato` (tipo: NaCl 3% / 0,9% / 0,45% / SG5% / livre VO), `volumeInfusato`
  (L), `cronicidade` (aguda <48 h × crônica ≥48 h).
- **Saídas:** `[Na⁺]` resultante, `C_H2O` (mL·h⁻¹, + = excretando água livre, − = retendo), `Δ[Na⁺]_previsto`
  (mEq·L⁻¹ por litro e por 24 h), `flag_velocidade` (seguro × rápido-demais → risco de mielinólise/edema),
  `osmolalidade_urinaria` (proxy do ADH agindo).
- **Alavanca de ADH/sede:** ADH alto → U_osm↑, C_H2O negativo (retém água, dilui); ADH suprimido → C_H2O
  positivo (aquarese, concentra). A sede adiciona água livre pela boca (entrada independente do rim).
- **Invariantes a testar (§6):** Adrogué–Madias coerente com Edelman (infundir 1 L isotônico em normonatrêmico
  → Δ[Na⁺]≈0; tol 1e-7). NaCl 3% sempre **sobe** [Na⁺]; SG5% sempre **desce**; 0,9% em hipernatrêmico desce
  devagar. `flag_velocidade` dispara quando |Δ[Na⁺]/24h| > limite. C_H2O com sinal correto: ADH alto → C_H2O
  ≤ 0. Monotonicidade: ∂[Na⁺]/∂ADH < 0 (mais ADH → mais água retida → dilui), a estoque de Na fixo.

**Pérolas (prováveis pelo motor).**
1. **O mesmo litro, efeitos opostos:** 1 L de SG5% **dilui**; 1 L de NaCl 3% **concentra**; 1 L de NaCl 0,9%
   em hiponatrêmico com U_osm muito alta pode até **piorar** o Na⁺ (o rim retém a água e excreta o sal) — o
   motor mostra o paradoxo do "soro fisiológico que afunda o sódio".
2. **A velocidade é a toxina, não o alvo:** dois pacientes chegam ao mesmo [Na⁺] final; o que subiu >10/24 h
   dispara o `flag` de mielinólise. O dano mora na **derivada**, não no valor.
3. **Sobrecorreção por aquarese súbita:** tratar a causa do ADH (repor volume → ADH despenca → aquarese
   maciça) faz o [Na⁺] disparar sozinho; o motor prevê o overshoot mesmo sem infundir Na — daí a água livre
   "de resgate" (SG5%/dDAVP) como freio (educacional).

**Instrumento vivo.** **Régua temporal do [Na⁺]:** linha do tempo de 24–48 h com a trajetória de [Na⁺]
computada por Adrogué–Madias conforme o infusato escolhido; uma **faixa-segura** sombreada (≤8–10/24 h) e
zonas vermelhas acima/abaixo. Trocar o tipo de fluido redesenha a inclinação ao vivo; o canvas acende o
alerta quando a curva fura a faixa.

**Ilustração SVG.** Inline: **neurônio adaptado** — célula crônica com osmoles idiogênicos desenhados dentro;
ao subir o Na⁺ rápido, a água sai e a célula **murcha** (mielinólise); ao baixar rápido na hipernatremia, a
célula **incha** (edema). Tamanho da célula ∝ tonicidade computada. Ao lado, medidor de C_H2O (seta para
"reter" × "excretar" água) e barra de U_osm como leitura do ADH.

**Fármaco encadeado (escopo aberto, §8 — educacional).** **dDAVP (desmopressina)** — agonista V2 → aquaporina-
2↑ → **retém água livre** → freia/reverte a sobrecorreção; uso "proativo" para travar a subida do Na⁺ (dose
educacional, ex.: ~1–2 µg IV/SC, titulada ao Δ[Na⁺]/h pelo motor). **Tolvaptan/conivaptan (vaptanos)** —
antagonista V2 → aquarese → **sobe** [Na⁺] na hiponatremia euvolêmica/hipervolêmica (dose educacional, ex.:
tolvaptan 15 mg VO, com a ressalva do limite de velocidade — o próprio vaptano pode sobrecorrigir). **NaCl 3%**
(513 mEq·L⁻¹) na hiponatremia grave sintomática: bolus educacional ~100–150 mL para subir ~2–3 mEq·L⁻¹ e
ceder a convulsão, depois recalcular pelo motor. Toda dose ↔ unidade ↔ mecanismo, computada pela
Adrogué–Madias do engine. Disclaimer educacional presente.

**Caso (5 atos).** (1) Homem, 60 a, etilista, [Na⁺] 108 há ~5 dias, confuso mas sem convulsão. (2) *Prever:*
correr NaCl 3% até normalizar? (3) *Revelar:* é **crônico** — o cérebro já se adaptou; normalizar rápido =
mielinólise. (4) Conduta (educacional): alvo **≤ 8 mEq·L⁻¹ nas 24 h**; se houver convulsão, bolus pequeno de
NaCl 3% só para ceder; vigiar aquarese (ao repor volume/tiamina o ADH cai e o Na⁺ sobe sozinho) — dDAVP de
resgate se a curva acelerar. (5) Síntese: o inimigo não era o número 108, era a **velocidade** da subida.

**Pontes.** FILTRA M8 (ADH/aquaporinas — a alavanca molecular da água), M9 (volume × tonicidade — o eixo
gêmeo), M14 (vasopressina como hormônio), M34 DIALISA (síndrome de desequilíbrio: edema cerebral por osmose
reversa — a mesma física da velocidade). Choca M25 (ressuscitação: o tipo de fluido define o Δ[Na⁺]).

**Avaliação — sementes + gabarito.**
- **Socrática (passos-chave).**
  - *Q:* Hiponatremia é problema de sódio ou de água? → *A:* de **água** (água em excesso relativo ao
    soluto); o sódio total pode estar normal, alto (ICC) ou baixo (perdas).
  - *Q:* Por que não normalizar o [Na⁺] depressa numa hiponatremia crônica? → *A:* o cérebro expulsou osmoles
    para sobreviver à diluição; subir o Na⁺ rápido o **desidrata** → desmielinização osmótica (mielinólise
    pontina). A adaptação é a armadilha.
  - *Q:* Qual o alvo de velocidade? → *A:* educacionalmente **≤ 8–10 mEq·L⁻¹ por 24 h** (≤6–8 em alto risco:
    etilista, desnutrido, hepatopata, [Na⁺] muito baixo).
- **Revisão (teórica).**
  - *Q:* O que é clearance de água livre e como o ADH o move? → *Gabarito:* é o volume de água "pura"
    virtualmente adicionado/removido da urina: `C_H2O = V̇·(1−U_osm/P_osm)`. ADH alto → U_osm alta → C_H2O
    **negativo** (rim retém água, dilui o plasma); ADH suprimido → aquarese → C_H2O positivo.
  - *Q:* Por que NaCl 0,9% pode piorar a hiponatremia no SIADH? → *Gabarito:* com U_osm fixa e alta (ADH
    ligado), o rim excreta o sal do soro e **retém a água** — sobra água livre → [Na⁺] cai. Adrogué–Madias
    prevê o Δ negativo.
- **Chave de ouro (integradora).**
  - *Q:* [Na⁺] 110 crônico; após repor volume e tiamina, em 6 h o Na⁺ pulou para 122 (+12) sozinho. O que
    aconteceu e o que fazer? → *Gabarito robusto:* o gatilho do ADH (depleção/álcool) sumiu → **aquarese
    abrupta** → autocorreção rápida que **furou o limite** (+12 já em 6 h). Conduta: **reintroduzir água
    livre** (SG5% IV) e/ou **dDAVP** para *frear* a subida e até reabaixar para a trajetória ≤8/24 h —
    evitando mielinólise. *Erro comum* ("ótimo, o Na subiu, deixe assim"): celebra o número e ignora a
    derivada perigosa; a meta é a *inclinação* segura, não o valor instantâneo.

---

### M11 · Potássio — o eletrólito que mata

**Tese & inversão.** O potássio sérico mede um **gradiente**, não um estoque. 98% do K⁺ é **intracelular**; o
que o ECG e o miócito "veem" é a razão K_intra/K_extra, que governa o potencial de membrana. Por isso o K⁺
sérico tem **dois eixos**: o **shift transcelular** (rápido — insulina, β-adrenérgico, pH movem K⁺ para
dentro/fora da célula em minutos) e o **estoque total** (lento — balanço renal, dias). A secreção distal de
K⁺ (célula principal, ENaC/aldosterona) é a torneira lenta. O número alto pode ser **estoque alto** *ou* só
**shift para fora** (acidose, lise) com estoque normal — e o tratamento difere. É "o eletrólito que mata":
mata pelo gradiente, no coração, em minutos.

**Erro → verdade.** *Erro:* "K⁺ total — corrija o número." *Verdade:* o sérico é **gradiente**, não estoque:
um cetoacidótico pode ter K⁺ sérico "normal" com déficit corporal **enorme** (o shift mascara). E a
hipercalemia que ameaça é a do **ECG**, não a do laboratório: a conduta de emergência ataca o **gradiente de
membrana** (cálcio estabiliza) antes de mexer no estoque. pH, insulina e β são as alavancas rápidas; a
aldosterona e o rim, as lentas.

**Engine `model11.js`.**
- **Fórmula-mãe:** dois compartimentos. `K_serico = f(K_total, shift)`, com
  `shift = g(pH, insulina, β, osmolalidade)` — cada Δ0,1 de pH move ~0,3–0,6 mEq·L⁻¹ no sentido inverso
  (acidose → K⁺ sai); insulina e β **empurram** K⁺ para dentro (Na/K-ATPase). Secreção renal:
  `excrecao_K ∝ aldosterona · fluxo_distal · [Na_distal]` (ENaC gera o gradiente luminal). ECG como leitura
  do gradiente: `efeito_membrana = h(K_serico)` → onda T apiculada → P alarga/some → QRS alarga → senoidal.
- **Entradas (estado):** `K_total` (estoque, relativo), `pH`, `insulina` (nível), `beta` (tônus/agonista),
  `aldosterona`, `fluxo_distal`, `TFG`, `osmolalidade`, `K_serico` medido.
- **Saídas:** `K_serico` previsto, `shift` (mEq movido), `excrecao_K` (mEq·d⁻¹), `estagio_ECG` (normal → T
  apiculada → bloqueio → QRS largo → senoidal → parada), `deficit_ou_excesso_estoque` (decompõe sérico em
  shift vs estoque).
- **Alavancas de mecanismo:** acidose → K⁺↑ sérico (shift externo) sem mudar estoque; insulina+glicose → K⁺↓
  sérico (shift interno); β2-agonista → K⁺↓; aldosterona↑ → excreção↑ → estoque↓; TFG↓/oligúria → excreção↓
  → estoque↑ (a hipercalemia da LRA).
- **Invariantes a testar (§6):** decomposição conserva — `K_serico` reconstrói de `K_total` + `shift`
  (tol 1e-7). Monotonicidade: ∂K_serico/∂pH < 0 (acidose sobe K); ∂K_serico/∂insulina < 0; ∂excrecao/∂aldo
  > 0; ∂estagio_ECG/∂K_serico ≥ 0 (monótono). Insulina move **sérico** sem mover **estoque** (separação dos
  eixos). `K_serico` clampado a faixa fisiológica; ECG nunca "pula" estágio sem passar pelos intermediários.

**Pérolas (prováveis pelo motor).**
1. **O potássio "normal" enganoso:** na cetoacidose, o shift externo (acidose + falta de insulina + hiperosm)
   mascara um déficit corporal grande; o motor mostra K_serico ~4,5 com K_total despencando — ao dar insulina,
   o K⁺ **desaba**. Tratar o estoque antes que o sérico avise.
2. **Cálcio não baixa o potássio — e salva mesmo assim:** o gluconato de cálcio **não move K⁺**; ele
   restaura o **gradiente de membrana** (antagoniza o efeito do K⁺ no potencial de repouso) → o ECG melhora
   com o K⁺ ainda alto. O motor separa "estabilizar membrana" de "baixar K⁺".
3. **O ECG é o relógio, não o laboratório:** a mesma [K⁺]=7 dá ECG diferente conforme a **velocidade** de
   instalação e o cálcio/pH acompanhantes; o motor mostra que o estágio do ECG (não o número) comanda a
   urgência.

**Instrumento vivo.** **Tira de ECG computada:** uma derivação desenhada ao vivo cuja morfologia (T,
intervalo PR, largura do QRS) é função de `K_serico` do engine — desliza de normal → T apiculada → P some →
QRS alarga → onda senoidal conforme o slider de K⁺. Ao lado, **barra de decomposição** mostrando quanto do
sérico é estoque × shift, recalculada quando se mexe em pH/insulina/β.

**Ilustração SVG.** Inline: **célula com a Na/K-ATPase** bombeando K⁺ para dentro; setas de shift
(insulina/β/pH) com espessura ∝ efeito computado; o gradiente K_intra/K_extra como duas colunas cujos níveis
vêm do engine. Mini-tira de ECG sparkline computada. Esquema do néfron distal: ENaC reabsorve Na (gera o
lúmen negativo) → K⁺ secretado — largura das setas ∝ aldosterona/fluxo.

**Fármaco encadeado (escopo aberto, §8 — educacional, condutas de hipercalemia ancoradas ao mecanismo).**
- **Gluconato de cálcio 10% ~10 mL IV** (3–5 min) → **estabiliza a membrana** (não baixa K⁺); início em
  minutos, dura ~30–60 min; repetir se ECG não melhora. Mecanismo: restaura o limiar do potencial de ação.
- **Insulina regular ~10 U IV + glicose** (25 g, se não hiperglicêmico) → **shift interno** via Na/K-ATPase;
  baixa ~0,5–1,2 mEq·L⁻¹ em ~15–30 min; **monitorar hipoglicemia** (computada pelo motor).
- **β2-agonista (salbutamol ~10–20 mg nebulizado)** → shift interno, **aditivo** à insulina.
- **Bicarbonato** → só útil se acidose (corrige o shift externo do pH); fraco isolado.
- **Removedores de estoque:** diurético de alça (se TFG/volume permitem), resinas/ligantes intestinais
  (patiromer, ciclossilicato de zircônio) e, na refratária/oligúrica, **diálise** (a única que remove
  rápido o *estoque*, ponte M35 AEIOU). Toda dose ↔ unidade ↔ mecanismo, computada; disclaimer educacional.

**Caso (5 atos).** (1) Homem, 65 a, LRA oligúrica, K⁺ 7,2; ECG com T apiculada e QRS alargando. (2) *Prever:*
dar insulina+glicose e esperar? (3) *Revelar:* o ECG já mudou → a **membrana** está em risco **agora**;
shift leva minutos e não basta sozinho. (4) Conduta (educacional, em sequência mecanística): **cálcio**
primeiro (estabiliza a membrana, compra tempo) → **insulina+glicose ± salbutamol** (shift) → **remover
estoque** (diurético se responde; **diálise** se oligúrico/refratário). (5) Síntese: cálcio salvou a
membrana, o shift comprou minutos, só a diálise tirou o estoque.

**Pontes.** FILTRA M8 (ENaC/aldosterona — a torneira distal do K⁺; poupadores de K⁺), M13 (pH ↔ K⁺: acidose
e o shift), M16 (LRA oligúrica → hipercalemia), M35 DIALISA (o "E" de eletrólitos no AEIOU). Choca M28
(β-agonistas/catecolaminas também movem K⁺ — a face hemodinâmica do shift) e Choca (arritmia como falência
elétrica).

**Avaliação — sementes + gabarito.**
- **Socrática (passos-chave).**
  - *Q:* O K⁺ sérico mede estoque ou gradiente? → *A:* **gradiente** (98% é intracelular); por isso shift e
    estoque são eixos separados.
  - *Q:* Acidose faz o quê com o K⁺ sérico, e muda o estoque? → *A:* **sobe** o sérico (H⁺ entra na célula,
    K⁺ sai — shift externo) **sem** mudar o estoque corporal.
  - *Q:* Por que o cálcio é o primeiro passo na hipercalemia com ECG alterado, se não baixa o K⁺? → *A:*
    porque o que mata é o **efeito de membrana**; o cálcio restaura o gradiente do potencial de ação
    **imediatamente**, enquanto as outras medidas (shift, remoção) levam minutos a horas.
- **Revisão (teórica).**
  - *Q:* Ordene as condutas da hipercalemia grave por **mecanismo** e tempo de ação. → *Gabarito:* (1)
    **estabilizar membrana** — cálcio (minutos, não muda K⁺); (2) **shift interno** — insulina+glicose,
    β2-agonista, bicarbonato se acidose (15–30 min, K⁺ volta depois); (3) **remover estoque** — diurético,
    ligantes intestinais, **diálise** (horas/definitivo). Tempo crescente, alvos distintos.
  - *Q:* Por que o K⁺ "normal" da cetoacidose engana? → *Gabarito:* acidose + insulinopenia + hiperosmolar-
    idade jogam K⁺ para **fora** da célula → o sérico parece normal/alto enquanto o estoque corporal está
    **muito baixo**; ao corrigir com insulina, o K⁺ desaba — daí repor K⁺ precocemente.
- **Chave de ouro (integradora).**
  - *Q:* Dois pacientes com K⁺ 6,8: (A) DRC oligúrica, ECG com QRS largo; (B) cetoacidose diabética, ECG
    normal, glicemia 480. Mesmo número — mesma conduta? → *Gabarito robusto:* **não**. (A) é **estoque alto**
    com membrana em risco → cálcio JÁ + shift + **remoção (diálise)**, pois o rim não excreta. (B) é **shift
    externo** mascarando déficit total → o tratamento é **insulina+volume** (que vão **derrubar** o K⁺) com
    **reposição de K⁺** assim que urinar e o sérico cair; dar removedores de estoque em (B) causaria
    hipocalemia perigosa. *Erro comum* ("K⁺ 6,8 → resina/diálise nos dois"): ignora que em (B) o estoque é
    baixo e o número vai despencar sozinho com o tratamento da causa.

---

### M12 · Cálcio · fósforo · magnésio — o eixo ósseo-mineral

**Tese & inversão.** O cálcio sérico total **não é** o cálcio que importa: o que atua na célula, no nervo e no
miócito é o **cálcio ionizado**, e ele depende de **albumina** (carregador) e de **pH** (compete pelos sítios
de ligação). O eixo ósseo-mineral é um **triângulo regulado** — Ca²⁺, PO₄³⁻ e PTH —, com a **vitamina D** (o
rim faz a 1,25-OH ativa) e o **FGF23** (o hormônio do fósforo) fechando as alças. O rim é o nó central: ativa
a vitamina D, responde ao PTH (reabsorve Ca, excreta PO₄) e, quando falha, **desmonta o triângulo** (a doença
mineral-óssea da DRC). O número "cálcio total" é sombra de três variáveis; decompor antes de interpretar.

**Erro → verdade.** *Erro:* "cálcio sérico = cálcio do paciente." *Verdade:* mede o **total** (ligado +
ionizado); na hipoalbuminemia o total cai mas o **ionizado** pode estar normal (pseudo-hipocalcemia) — corrige-
se pela albumina ou, melhor, **mede-se o ionizado**. E o pH **desloca**: alcalose → mais Ca²⁺ liga à albumina
→ **ionizado↓** → tetania (a mesma "tetania da hiperventilação" com cálcio total normal). O número engana por
dois carregadores.

**Engine `model12.js`.**
- **Fórmula-mãe:** **cálcio corrigido/ionizado** + o **triângulo do PTH**.
  `Ca_corrigido = Ca_total + 0,8·(4,0 − albumina)`; `Ca_ionizado = h(Ca_total, albumina, pH)` — alcalose
  (pH↑) → ionizado↓. Eixo regulador: `PTH = f(Ca_ionizado↓, PO₄↑, vitD↓)` (PTH sobe quando Ca cai, PO₄ sobe,
  ou vitamina D cai); `PTH → Ca↑ (osso+rim+vitD) e PO₄↓ (fosfatúria)`; `FGF23 = f(PO₄↑) → PO₄↓ e vitD↓`.
- **Entradas (estado):** `Ca_total` (mg·dL⁻¹), `albumina` (g·dL⁻¹), `pH`, `PO4` (mg·dL⁻¹), `PTH` (pg·mL⁻¹),
  `vitD` (1,25-OH, nível), `TFG` (para a DMO-DRC), `Mg` (mg·dL⁻¹).
- **Saídas:** `Ca_corrigido`, `Ca_ionizado`, `produto_Ca×PO4` (risco de calcificação), `set_do_triangulo`
  (hiperPTH primário × secundário × terciário × hipoPTH), `flag_DMO_DRC`, leitura de Mg (e seu efeito
  paradoxal no PTH).
- **Alavancas de mecanismo:** alcalose → ionizado↓ (tetania) com total fixo; albumina↓ → total↓ com ionizado
  ~normal; TFG↓ → fosfato retido (PO₄↑) + vitD ativa↓ → Ca↓ → **PTH↑** (hiperparatireoidismo secundário);
  **Mg muito baixo** → **bloqueia a secreção de PTH** → hipocalcemia *refratária* até repor Mg.
- **Invariantes a testar (§6):** `Ca_corrigido` = `Ca_total` quando albumina = 4,0 (tol 1e-7); ∂ionizado/∂pH
  < 0 (alcalose baixa o ionizado); ∂PTH/∂Ca_ionizado < 0; ∂PTH/∂PO4 > 0; ∂PO4/∂TFG < 0 (TFG cai → PO₄ sobe).
  Triângulo consistente: hiperPTH 2º exige TFG↓ + PO₄↑ + vitD↓ + Ca↓/normal. Mg→0 deve **derrubar** PTH
  (não subir). Tudo finito sob entradas absurdas.

**Pérolas (prováveis pelo motor).**
1. **A tetania de cálcio normal:** hiperventilar (alcalose respiratória) com `Ca_total` inalterado **baixa o
   ionizado** → parestesia/tetania. O motor mostra sintoma sem o número total mudar — o pH é o terceiro eixo.
2. **A hipocalcemia que só o magnésio cura:** com `Mg` muito baixo, repor cálcio **não resolve** — o motor
   mantém o PTH suprimido (Mg é cofator da secreção de PTH); só repor Mg destrava a alça.
3. **O triângulo da DRC se inverte:** TFG↓ retém PO₄ e mata a vitD ativa → PTH sobe (secundário); cronicamente
   a paratireoide autonomiza (terciário) → agora **Ca também sobe** com PTH alto — o motor mostra o set
   migrando de 2º para 3º.

**Instrumento vivo.** **O triângulo Ca–PO₄–PTH ao vivo:** três vértices ligados por setas; mexer um (slider de
PO₄, de TFG, de vitD) recalcula os outros pelo engine e re-renderiza as setas (espessura ∝ magnitude do
efeito). Sobreposta, a **barra de cálcio decomposta** (total = ionizado + ligado-à-albumina), que muda de
partição quando se desliza o pH — mostrando ionizado cair na alcalose sem o total mexer.

**Ilustração SVG.** Inline: barra de cálcio dividida em **ionizado** (ativo) × **ligado à albumina** ×
**complexado**, com a fração ionizada ∝ engine e o pH como uma seta que empurra Ca²⁺ para a albumina na
alcalose. Triângulo Ca–PO₄–PTH como diagrama com vértices dimensionados pelo engine. Néfron: PTH reabsorvendo
Ca no TCD e barrando PO₄ no TCP (setas computadas). Mini-medidor do produto Ca×PO₄.

**Fármaco encadeado (escopo aberto, §8 — educacional; detalhe pleno no M18/DIALISA).** **Gluconato de cálcio**
na hipocalcemia sintomática (tetania/laringoespasmo): bolus educacional ~1–2 g IV, titulado ao ionizado e ao
QT — **antes**, checar e repor **Mg** se baixo (senão refratário). **Análogos de vitamina D** (calcitriol/
paricalcitol) → ativam a absorção de Ca e **suprimem PTH** (hiperPTH 2º). **Quelantes de fósforo** (à
refeição) → baixam PO₄ (sevelâmer, carbonato de cálcio). **Calcimiméticos** (cinacalcete) → sensibilizam o
receptor de Ca da paratireoide → **PTH↓** sem subir Ca. Toda dose ↔ unidade ↔ mecanismo, computada;
disclaimer educacional.

**Caso (5 atos).** (1) Mulher, 40 a, ansiosa, hiperventilando, parestesia perioral e espasmo carpal; `Ca_total`
8,9 (normal-baixo), albumina normal. (2) *Prever:* hipocalcemia verdadeira, repor cálcio EV? (3) *Revelar:*
**alcalose respiratória** → Ca²⁺ ligou-se à albumina → **ionizado↓** com total quase normal; é tetania por
pH, não por estoque. (4) Conduta (educacional): tratar a hiperventilação (reduzir a alcalose) reverte;
cálcio EV só se grave/refratário; medir o **ionizado**. (5) Síntese: o total mentiu; o pH moveu o ionizado.

**Pontes.** FILTRA M7 (TCD — manejo de Ca²⁺; o paradoxo do cálcio dos tiazídicos), M13 (pH ↔ ionizado: a
alcalose e a tetania), M14 (vitamina D ativada pelo rim — o rim como glândula), M16/DRC (DMO-DRC), M18
(quelantes, calcimiméticos, análogos de vitD na conduta). Choca (Ca²⁺ ionizado e contratilidade/coagulação;
a hipocalcemia do citrato — ponte com M29 DIALISA).

**Avaliação — sementes + gabarito.**
- **Socrática (passos-chave).**
  - *Q:* Qual fração do cálcio é biologicamente ativa, e do que ela depende? → *A:* o **ionizado** (~50%);
    depende da **albumina** (carregador) e do **pH** (alcalose desloca Ca²⁺ para a albumina → ionizado↓).
  - *Q:* PTH sobe em resposta a quê? → *A:* Ca ionizado↓, PO₄↑, vitamina D↓; ele então sobe o Ca (osso, rim,
    ativação de vitD) e baixa o PO₄ (fosfatúria).
  - *Q:* Por que uma hipocalcemia pode ser "refratária" ao cálcio? → *A:* **hipomagnesemia** — o Mg é cofator
    da secreção de PTH; sem repor Mg, o PTH fica suprimido e o Ca não sobe.
- **Revisão (teórica).**
  - *Q:* Descreva o triângulo da DRC (hiperPTH secundário). → *Gabarito:* TFG↓ → **PO₄ retido** + **1,25-vitD
    ativa↓** → **Ca↓** → estímulo crônico → **PTH↑** (e FGF23↑). Cronicamente a paratireoide autonomiza →
    **terciário** (PTH alto com Ca agora alto). É o eixo desmontado pela falência renal.
  - *Q:* Como corrigir o cálcio pela albumina, e por que medir o ionizado é melhor? → *Gabarito:*
    `Ca_corrigido = Ca_total + 0,8·(4 − albumina)`; é uma estimativa — em distúrbios ácido-base e estados
    críticos a fórmula erra, então o **ionizado medido** é o padrão.
- **Chave de ouro (integradora).**
  - *Q:* Paciente crítico, `Ca_total` 7,2, albumina 2,2, alcalótico (pH 7,52), com espasmos. Calcule o
    raciocínio e conduza. → *Gabarito robusto:* a hipoalbuminemia **derruba o total** (corrigido ≈ 7,2 +
    0,8·1,8 ≈ 8,6) — parte é pseudo-hipocalcemia; **mas** a alcalose **baixa o ionizado de verdade** → os
    espasmos são reais. Conduta: **medir o ionizado** (não confiar só na correção), tratar a causa da
    alcalose, repor cálcio EV se ionizado baixo/sintomático — e **checar Mg** antes (refratariedade). *Erro
    comum* ("Ca total 7,2 → repor cálcio em bolus já"): ignora a albumina (superestima o déficit de estoque) e
    o pH (subestima o componente real do ionizado); o ionizado é quem decide.

---

### M13 · Ácido-base renal — o rim que fabrica o bicarbonato

**Tese & inversão.** O pulmão **expira** o ácido volátil (CO₂) em minutos; o rim **regenera a base**
(HCO₃⁻) em horas a dias — e é ele que fecha o balanço de H⁺ fixo. O rim faz três coisas: **reabsorve** o
HCO₃⁻ filtrado (quase todo no TCP, via anidrase carbônica), **excreta** H⁺ tamponado por NH₄⁺ (a alça
principal, regulável) e por **acidez titulável** (fosfato), regenerando bicarbonato novo. Quando o rim falha
nessas tarefas, surgem as **acidoses tubulares renais (ATR)** — cada uma um defeito **mecanístico** de um
segmento. E a leitura do distúrbio não é o pH: é o **ânion gap** e o **delta-delta**, que revelam distúrbios
**ocultos** mesmo com pH normal. O número é sombra; o mecanismo (qual segmento, qual tampão) é a causa.

**Erro → verdade.** *Erro:* "pH é coisa do pulmão / um distúrbio por vez." *Verdade:* o rim **regula o
HCO₃⁻** (a alça metabólica) e pode haver **distúrbios triplos** escondidos num pH "normal" — só o **AG** e o
**delta-delta** os desmascaram. E "acidose metabólica" não é diagnóstico: é AG-alto (ácido adicionado) ou
AG-normal/hiperclorêmica (HCO₃⁻ perdido — diarreia ou **ATR**), e cada ATR (tipo 1/2/4) é uma falha de um
segmento e tem K⁺ característico. Decompor antes de tratar.

**Engine `model13.js`.**
- **Fórmula-mãe:** **Henderson–Hasselbalch** + **ânion gap** + **delta-delta**.
  `pH = 6,1 + log₁₀(HCO₃⁻ / (0,03·PaCO₂))`; `AG = Na⁺ − (Cl⁻ + HCO₃⁻)` (corrigido pela albumina:
  `AG_corr = AG + 2,5·(4 − albumina)`); `ΔAG/ΔHCO₃ = (AG − 12)/(24 − HCO₃)` (delta-delta);
  compensação esperada (ex.: Winter `PaCO₂ = 1,5·HCO₃ + 8 ± 2`). Excreção renal de H⁺ via NH₄⁺ + acidez
  titulável; gap urinário `UAG = U_Na + U_K − U_Cl` (proxy de NH₄⁺).
- **Entradas (estado):** `Na`, `Cl`, `HCO3`, `PaCO2`, `albumina`, `K`, `pH` (ou derivado), `UAG`/amônio
  urinário, `segmento_ATR` (proximal/distal/hipoaldo — para o modo didático).
- **Saídas:** `pH`, `AG`, `AG_corr`, `classe` (metabólica AG-alto × AG-normal × respiratória),
  `delta_delta` (revela distúrbio misto: <1 some acidose AG-normal; >2 some alcalose metabólica),
  `compensacao` (adequada × distúrbio respiratório associado), `tipo_ATR` (1/2/4 por padrão de K⁺ e UAG).
- **Alavancas de mecanismo:** adicionar ácido (lactato, cetona) → AG↑, HCO₃↓; perder HCO₃ (diarreia/TCP) →
  AG-normal, Cl↑; defeito distal (ATR1) → não acidifica a urina, K⁺↓; defeito proximal (ATR2) → desperdiça
  HCO₃, K⁺↓; hipoaldo (ATR4) → K⁺**↑**, amoniogênese↓.
- **Invariantes a testar (§6):** Henderson–Hasselbalch reversível (pH↔HCO₃↔PaCO₂ coerentes, tol 1e-7);
  `AG` ≥ 0; ∂HCO₃/∂(ácido adicionado) < 0; delta-delta detecta o misto montado de propósito; Winter prevê
  PaCO₂ na metabólica pura; ATR4 sempre dá K⁺ alto (assinatura), ATR1/2 dão K⁺ baixo. Robustez: albumina
  baixa **mascara** AG (testar a correção). Tudo finito sob entradas absurdas.

**Pérolas (prováveis pelo motor).**
1. **O pH normal mentiroso:** o motor monta um caso com pH 7,40 e HCO₃ 24 que, pelo **AG alto** + **delta-
   delta**, esconde uma acidose metabólica AG-alto **mais** uma alcalose metabólica — duas forças que se
   cancelam no número e se delatam no gap. O pH não viu; o AG viu.
2. **A ATR pelo potássio:** ATR tipo 1 e 2 cursam com **hipocalemia**; a tipo 4 (hipoaldosteronismo) com
   **hipercalemia** — o motor usa o K⁺ para apontar o segmento, invertendo a intuição "acidose → K⁺ alto".
3. **A albumina esconde o gap:** num hipoalbuminêmico, um AG "normal" pode ser na verdade **alto**; o motor
   mostra o AG corrigido desmascarando a acidose orgânica oculta.

**Instrumento vivo.** **Diagrama de barras ácido-base ao vivo:** colunas de Na / (Cl + HCO₃) / AG
recalculadas em tempo real; o **delta-delta** como um ponteiro numa régua (zona "acidose AG-normal
associada" × "puro" × "alcalose metabólica associada"). Sliders de Na/Cl/HCO₃/PaCO₂ redesenham as barras e o
ponto no **nomograma ácido-base** (HCO₃ × PaCO₂) com as faixas de compensação esperadas sombreadas.

**Ilustração SVG.** Inline: néfron ácido-base — **TCP** reabsorvendo HCO₃ (anidrase carbônica desenhada),
**ducto coletor** célula-α secretando H⁺ e regenerando HCO₃ via **NH₄⁺/acidez titulável** (setas ∝ excreção
computada). Barra do ânion gap dividida em ânions medidos × não-medidos. Régua do delta-delta computada.
Mini-tabela visual das ATRs (segmento iluminado × K⁺ ↑/↓ × UAG) destacando o tipo selecionado.

**Caso (5 atos).** (1) Mulher, 35 a, DM1, vômitos há 2 dias; pH 7,38, HCO₃ 22, Na 140, Cl 95, K 3,1,
cetonúria. (2) *Prever:* "pH quase normal, acidose leve, está compensando." (3) *Revelar:* AG = 140−(95+22) =
23 (**alto** → cetoacidose), mas HCO₃ só 22 → delta-delta `(23−12)/(24−22)=5,5` → há **alcalose metabólica
associada** (os vômitos) mascarando a cetoacidose; o pH "normal" escondeu **dois** distúrbios. (4) Conduta
(educacional): tratar a CAD (insulina/volume/K⁺ — atenção ao K⁺ 3,1, M11), repor K⁺ antes da insulina; a
alcalose dos vômitos corrige com volume/Cl. (5) Síntese: o número viu paz; o AG e o delta-delta viram guerra.

**Pontes.** FILTRA M5 (TCP/anidrase carbônica — reabsorção de HCO₃; ATR2; acetazolamida), M8 (ducto coletor:
célula-α H⁺, célula-β HCO₃; ATR1), M11 (K⁺ ↔ pH e a assinatura de K⁺ das ATRs), M14 (aldosterona →
ATR4/hipoaldo), M16 (acidose da uremia). **Braço 1 RESPIRA** (a compensação respiratória — Winter; o pulmão e
o rim negociam o pH). M35 DIALISA (o "A" de acidose no AEIOU).

**Avaliação — sementes + gabarito.**
- **Socrática (passos-chave).**
  - *Q:* Quem regula o HCO₃⁻ e quem regula o CO₂? → *A:* o **rim** regenera/reabsorve o **HCO₃⁻** (horas-dias);
    o **pulmão** ajusta o **CO₂/PaCO₂** (minutos). Os dois fixam o pH juntos.
  - *Q:* O que o ânion gap distingue? → *A:* acidose metabólica de **AG alto** (ácido **adicionado** —
    lactato, cetona, toxinas) × **AG normal/hiperclorêmica** (HCO₃ **perdido** — diarreia ou ATR).
  - *Q:* Por que checar o delta-delta se o AG já está alto? → *A:* para revelar distúrbios **mistos**: um
    delta-delta <1 indica uma acidose AG-normal *adicional*; >2 indica alcalose metabólica *associada* — o
    pH/HCO₃ sozinhos não veem.
- **Revisão (teórica).**
  - *Q:* Diferencie as ATR 1, 2 e 4 por mecanismo, segmento e potássio. → *Gabarito:* **ATR1 (distal)** =
    ducto coletor não secreta H⁺ → urina não acidifica (pH>5,5), **K⁺ baixo**, risco de nefrolitíase. **ATR2
    (proximal)** = TCP não reabsorve HCO₃ → bicarbonatúria até o novo limiar, **K⁺ baixo**, (Fanconi). **ATR4
    (hipoaldosteronismo)** = aldosterona baixa/resistência → **K⁺ alto**, amoniogênese↓ → acidose. O K⁺ é a
    pista que separa.
  - *Q:* Como a albumina afeta o AG e por que corrigir? → *Gabarito:* a albumina é o principal ânion não
    medido; hipoalbuminemia **baixa o AG basal** (~2,5 por g·dL⁻¹), podendo mascarar uma acidose orgânica;
    `AG_corr = AG + 2,5·(4 − albumina)` desmascara.
- **Chave de ouro (integradora).**
  - *Q:* Paciente: Na 138, Cl 108, HCO₃ 16, albumina 2,0, PaCO₂ 30, pH 7,35. Quantos distúrbios há e qual a
    leitura completa? → *Gabarito robusto:* AG = 138−(108+16) = **14** (parece quase normal), mas
    **AG_corr** = 14 + 2,5·(4−2) = **19** → acidose metabólica de **AG alto** real (mascarada pela
    hipoalbuminemia). Delta-delta `(19−12)/(24−16)=0,9` (~1) → componente de **AG-normal** também presente
    (mista). Compensação Winter: esperado PaCO₂ ≈ 1,5·16+8 = **32 ± 2** → o PaCO₂ 30 está adequado (sem
    distúrbio respiratório). Leitura: **acidose mista (AG-alto + AG-normal), com hipoalbuminemia que escondeu
    o gap, respiratoriamente compensada**. *Erro comum* ("AG 14, normal, só HCO₃ baixo → acidose hipoclorêmica
    simples"): não corrigiu pela albumina (perdeu a acidose orgânica) nem rodou o delta-delta (perdeu o
    componente misto). O gap corrigido e o delta-delta são quem leem a verdade.

---

### Bloco IV · O rim como glândula e a leitura da urina

### M14 · RAAS e o eixo endócrino renal — renina → AngII → aldosterona, ADH, EPO, vitamina D

**Tese & inversão.** O rim não só filtra: ele **sente** e **responde**. É uma glândula que mede pressão de
perfusão (aparelho justaglomerular), carga de Na⁺ na mácula densa e tensão de O₂ no interstício, e devolve
hormônios que reescrevem a hemodinâmica, o volume e até a hematopoiese. A inversão: a "renina alta" não é um
número de laboratório — é o rim **gritando que percebe pouca pressão/pouco Na⁺**. O hormônio é a sombra; o
sensor é a causa.

**Erro → verdade.** *Erro:* "o rim só filtra o sangue." *Verdade:* o rim é **órgão endócrino** — sente
pressão/Na⁺/O₂ e responde com renina→AngII→aldosterona (volume e tônus eferente), ADH/vasopressina (água
livre), eritropoetina (massa eritrocitária) e calcitriol (1α-hidroxilase: o eixo ósseo-mineral). Cada sensor
fecha uma alça de retroalimentação distinta; confundir os sensores é confundir as doenças.

**Engine `model14.js`.**
- **Fórmula-mãe:** três alças de feedback acopladas e amortecidas. (1) **Renina** ∝ f(↓P_perfusão, ↓Na⁺ na
  mácula densa, ↑tônus simpático-β1) → `AngII = k·renina` → constrição **eferente** (`R_E↑`, ecoa o M1) +
  estímulo de aldosterona. (2) **Aldosterona** ∝ f(AngII, ↑K⁺) → ENaC↑ (reabsorve Na⁺, secreta K⁺/H⁺, ecoa
  M8/M11). (3) **ADH** ∝ f(↑osmolalidade efetiva, ↓volume circulante efetivo) → aquaporinas↑ → clearance de
  água livre↓ (ecoa M10). Paralelas: `EPO = Emax·O₂deficit/(EC50+O₂deficit)` (sensor de hipóxia cortical);
  `calcitriol` ∝ PTH·(1/FGF23) (ecoa M12).
- **Entradas (estado):** `P_perfusao` (mmHg), `Na_macula` (proxy de carga distal), `K` (mEq·L⁻¹),
  `osmEf` (mOsm·kg⁻¹), `volEfetivo` (%), `O2_renal` (proxy), `simpatico` (relativo), `FGF23`, `PTH`.
- **Saídas:** `renina`, `AngII`, `aldosterona`, `ADH`, `EPO`, `calcitriol`, `R_E_efetivo`, `clearAguaLivre`,
  `flag` de eixo dominante (volume × tonicidade × hipóxia × ósseo-mineral).
- **Alavanca de mecanismo:** laço de ponto-fixo **amortecido** (relaxação, §6) — AngII fecha a eferente,
  sobe a P_GC, restaura carga de Na⁺ na mácula densa, **desliga** a renina (alça negativa); a saturação
  evita oscilação.
- **Invariantes a testar (§6):** ↓P_perfusao → renina↑ → AngII↑ → aldosterona↑ (cadeia monotônica);
  ↑osmEf → ADH↑ → clearAguaLivre↓; ↓O2_renal → EPO↑ (sigmoide, com teto); ↑K → aldosterona↑ **independente**
  de AngII (a via do K é direta); todos os hormônios ≥ 0 e finitos; estado estacionário único e
  determinístico (tol 1e-7).

**Pérolas (prováveis pelo motor).**
1. **Dois gatilhos, um hormônio — sentidos opostos no K⁺:** aldosterona sobe por **AngII** (volume baixo) ou
   por **K⁺ alto** diretamente. O motor mostra que hipercalemia eleva aldosterona **mesmo com renina baixa** —
   é por isso que o hipoaldosteronismo hiporreninêmico (diabético) retém K⁺ apesar da volemia.
2. **ADH não sabe a diferença entre sede e choque:** osmolalidade↑ e volume circulante↓ **somam** no estímulo
   ao ADH; no hipovolêmico, o ADH dispara mesmo com osmolalidade baixa → hiponatremia "apropriada". O motor
   separa os dois drives e mostra a soma.
3. **A anemia da DRC é endócrina, não ferropriva:** o motor faz a EPO despencar quando o parênquima cortical
   (sensor de O₂) some — anemia normocítica com ferro normal. Repor ferro sem EPO não fecha a alça.

**Instrumento vivo.** Painel de **quatro mostradores acoplados** (renina→AngII→aldosterona / ADH / EPO /
calcitriol), cada agulha computada ao vivo. Ao baixar `P_perfusao`, vê-se a cascata RAAS acender em cadeia e a
eferente fechar (a P_GC sobe no mini-glomérulo do M1). Sliders independentes de osmolalidade e volume mostram
o ADH respondendo à **soma** dos dois drives.

**Ilustração SVG.** O rim-glândula inline: três sensores (barostato justaglomerular, mácula densa, sensor de
O₂ cortical) como ícones cuja intensidade (cor/preenchimento) vem do engine; setas hormonais saindo do rim
para o vaso (AngII→eferente), para o coletor (aldosterona→ENaC, ADH→aquaporina) e para a medula óssea
(EPO→hemácia). Comprimento das setas ∝ nível do hormônio computado.

**Fármaco encadeado.** *Prévia integradora (a dose plena vem no M18):* **IECA** (ex.: enalapril
**5–20 mg VO 12/12h**, educacional) bloqueia a conversão AngI→AngII → eferente abre → P_GC↓; **BRA**
(losartana **50–100 mg/dia**) bloqueia o receptor AT₁; **inibidor direto de renina** (alisquireno
**150–300 mg/dia**) corta no topo da cascata; **ARM** (espironolactona **25–50 mg/dia**) bloqueia o receptor
de aldosterona no coletor. **ESA** (epoetina alfa, **dose por kg SC/IV**, educacional) substitui a EPO
endógena que o rim doente não fabrica. Cada dose ancorada ao sensor que o fármaco curto-circuita; o motor
de dose-resposta (Emax/EC50) computa o efeito. Disclaimer educacional presente.

**Caso (5 atos).** (1) Homem, DRC estágio 4, anêmico (Hb 8,5; ferritina normal), PA limítrofe, K⁺ 5,6.
(2) *Prever:* anemia ferropriva? hiperaldosteronismo? (3) *Revelar:* anemia por **déficit de EPO** (sensor
cortical perdido) + hipoaldo hiporreninêmico (renina e aldo baixas → retém K⁺). (4) Conduta: ESA + alvo de
ferro; cautela com IECA pela cinética do K⁺. (5) Síntese: a falência **endócrina** do rim explica anemia e
K⁺ que a "filtração" sozinha não explicaria.

**Pontes.** M1 (AngII fecha a eferente → P_GC) · M8/M11 (aldosterona → ENaC, troca Na⁺/K⁺) · M10 (ADH e
água livre) · M12 (calcitriol, PTH, FGF23) · M18 (a farmacologia plena do RAAS e dos ESA). Choca M28
(vasopressores: AngII e vasopressina são os mesmos eixos vistos pela hemodinâmica sistêmica) · Choca M4/M5
(o volume circulante efetivo que o RAAS defende é o retorno venoso de Guyton).

**Avaliação — sementes + gabarito.**
- **Socrática (passos-chave).**
  - *Q:* O que a mácula densa mede e o que ela faz quando a carga de Na⁺ que chega cai? → *A:* mede o NaCl no
    fluido distal; carga↓ → libera renina (e dilata a aferente via TGF) → restaura TFG. É o sensor que
    acopla túbulo e glomérulo.
  - *Q:* Por que o hipovolêmico pode ter hiponatremia "apropriada"? → *A:* o drive de **volume** do ADH vence
    o drive osmótico → retém água livre apesar da osmolalidade baixa. O ADH defende volume antes de tonicidade.
- **Revisão (teórica).**
  - *Q:* Cite as duas vias independentes que elevam a aldosterona. → *Gabarito:* (1) AngII (eixo
    renina→volume) e (2) K⁺ sérico alto agindo **direto** na zona glomerulosa. Por isso hipercalemia eleva
    aldo mesmo com renina suprimida.
  - *Q:* Por que a anemia da DRC é normocítica e não responde só a ferro? → *Gabarito:* é **carência de EPO**
    (sensor de O₂ cortical destruído), não falta de substrato; sem ESA, repor ferro não fecha a alça.
- **Chave de ouro (integradora).**
  - *Q:* Diabético com TFG 35, K⁺ 5,8, renina e aldosterona **baixas**, PA controlada. Explique o K⁺ alto pelo
    eixo endócrino e diga o risco de iniciar um IECA. → *Gabarito robusto:* **hipoaldosteronismo
    hiporreninêmico** — o rim diabético não libera renina (lesão do aparelho justaglomerular), aldo cai, o
    coletor secreta menos K⁺ → hipercalemia com volemia normal. Iniciar IECA **fecha ainda mais** a via
    AngII→aldo → risco de hipercalemia perigosa: monitorar K⁺ e creatinina, considerar diurético de alça ou
    poupar a dose. *Distrator "é ferropriva/dieta":* ignora que a aldo baixa é o motor do K⁺. *Distrator
    "hiperaldo":* contradiz a aldo medida baixa — seria K⁺ baixo, não alto.

---

### M15 · Ureia, creatinina, eGFR e a urina — FE_Na, FE_ureia, sedimento, índices urinários

**Tese & inversão.** Um número isolado não diagnostica nada; a **urina conta a história**. A creatinina diz
*quanto* a TFG caiu (mal e tarde); os índices urinários dizem *por quê* — se o túbulo está **vivo e ávido**
(pré-renal, reabsorvendo Na⁺ com fome) ou **morto e leaky** (NTA, deixando o Na⁺ escapar). A inversão: a
mesma creatinina 3,0 é pré-renal num paciente e NTA noutro; a FE_Na decide, não o valor da creatinina.

**Erro → verdade.** *Erro:* "creatinina 3, é insuficiência renal — trate o número." *Verdade:* a creatinina é
um **marcador lento e enviesado** (massa muscular, secreção tubular, cinética de acúmulo); a história está na
**urina** — `FE_Na`, `FE_ureia`, osmolalidade urinária e o **sedimento** separam pré-renal de NTA antes de
qualquer dosagem seriada. A urina é o laudo em tempo real que a creatinina ainda não escreveu.

**Engine `model15.js`.**
- **Fórmula-mãe:** clearance e frações de excreção. `C_x = (U_x · V̇)/P_x`;
  `FE_Na = (U_Na·P_Cr)/(P_Na·U_Cr)·100`; `FE_ureia = (U_ur·P_Cr)/(P_ur·U_Cr)·100`. eGFR por um estimador
  tipo CKD-EPI (creatinina, idade, sexo) com a ressalva de cinética não-estacionária. Sedimento como
  classificador discreto (cilindros hialinos × granulosos pigmentados × hemáticos × leucocitários).
- **Entradas (estado):** `P_Cr`, `U_Cr`, `P_Na`, `U_Na`, `P_ureia`, `U_ureia`, `V̇` (fluxo urinário),
  `idade`, `sexo`, `massaMuscular` (proxy), `usoDiuretico` (booleano), `tipoSedimento`.
- **Saídas:** `FE_Na`, `FE_ureia`, `osmU`, `eGFR`, `relacao_ureia_Cr`, `flag` de padrão (pré-renal ávido ×
  NTA × pós-renal × glomerular/nefrítico), e um **selo de confiabilidade** quando a cinética é instável.
- **Alavanca de mecanismo:** o "knob" `usoDiuretico` — quando ligado, FE_Na **perde** validade (o diurético
  força natriurese) e o motor desvia o veredito para **FE_ureia** (a ureia independe da alça/tiazídico).
- **Invariantes a testar (§6):** `FE_Na < 1%` ↔ flag pré-renal; `FE_Na > 2%` ↔ flag NTA (na zona típica);
  sob diurético, o motor **rebaixa** a confiança da FE_Na e usa FE_ureia (`<35%` pré-renal); eGFR↓ monotônico
  com P_Cr↑; relação ureia/Cr↑ na pré-renal (reabsorção passiva de ureia acompanha o Na⁺/água); todos os
  índices finitos e ≥ 0; cilindro granuloso pigmentado → flag NTA (identidade clínica).

**Pérolas (prováveis pelo motor).**
1. **A creatinina mente nos dois sentidos:** numa lise muscular ela superestima o dano; no idoso sarcopênico
   ela **esconde** uma TFG já baixa (creatinina "normal" com eGFR ruim). O motor mostra a mesma TFG gerando
   creatininas diferentes por massa muscular.
2. **FE_Na quebra sob diurético — FE_ureia não:** o motor mostra um pré-renal com FE_Na falsamente alta (>1%)
   por furosemida, e a FE_ureia revelando a verdade (<35%). O índice certo depende da droga em uso.
3. **Cinética importa: a creatinina de hoje é a TFG de ontem.** Numa LRA aguda, a creatinina ainda está
   subindo enquanto a TFG real já desabou; o eGZFR de equilíbrio **superestima** a função. O motor sinaliza
   "não-estacionário, eGFR não confiável".

**Instrumento vivo.** **Mesa de índices**: ao mover U_Na, U_Cr, P_Cr e o fluxo, a FE_Na e a FE_ureia se
recomputam e a agulha de veredito desliza entre PRÉ-RENAL ↔ NTA. Um botão "ligar diurético" reposiciona a
agulha e acende o aviso de que a FE_Na caducou. Painel lateral mostra o sedimento escolhido e o que ele
implica.

**Ilustração SVG.** Quatro lâminas de **sedimento** desenhadas inline (cilindros hialinos, granulosos
pigmentados "muddy brown", hemáticos dismórficos, leucocitários) — vetoriais, computadas como ícones
selecionáveis. Barras comparativas FE_Na × FE_ureia com a linha de corte (1% / 35%) e a posição atual vinda
do engine. Sparkline da creatinina subindo "atrasada" em relação à TFG real.

**Fármaco encadeado.** Aqui o fármaco entra como **confundidor diagnóstico**, não como alvo: **furosemida**
(qualquer dose) invalida a FE_Na ao forçar natriurese — o motor reconhece o uso e migra o veredito para
FE_ureia. Lição: antes de ler a urina, pergunte qual diurético o paciente recebeu. Disclaimer educacional
presente.

**Caso (5 atos).** (1) Idoso desidratado, vinha em furosemida, oligúrico; creatinina 1,0→2,8, FE_Na 2,1%.
(2) *Prever:* FE_Na > 2% = NTA? (3) *Revelar:* a furosemida inflou a FE_Na; a **FE_ureia 22%** + sedimento
hialino + ureia/Cr alta dizem **pré-renal**. (4) Conduta: prova de volume (não diálise); reavaliar diurético.
(5) Síntese: a urina contou pré-renal; ler a FE_Na crua teria mandado o paciente para o caminho errado.

**Pontes.** M1 (pré-renal = P_GC↓; o túbulo ávido reabsorve Na⁺) · M4 (por que a creatinina mente: cinética,
secreção, massa) · M5/M6 (de onde vem a reabsorção ávida de Na⁺ e ureia) · M16 (estes índices são a
ferramenta que distingue os mecanismos da LRA). Choca M13 (lactato como marcador "sombra" — mesma lógica de
não confundir o número com o mecanismo) · Choca M5 (responsivo ≠ tolerante: a prova de volume só ajuda o
pré-renal).

**Avaliação — sementes + gabarito.**
- **Socrática (passos-chave).**
  - *Q:* Por que a FE_Na é baixa na pré-renal? → *A:* o túbulo está vivo e **com fome de Na⁺** (aldo + ávido
    por volume) → reabsorve quase tudo → pouco Na⁺ na urina. Túbulo vivo = FE_Na baixa.
  - *Q:* Quando você troca FE_Na por FE_ureia, e por quê? → *A:* quando o paciente usa diurético — a droga
    força Na⁺ na urina e infla a FE_Na; a ureia é reabsorvida no proximal, fora do alvo do diurético, então
    a FE_ureia mantém a leitura.
- **Revisão (teórica).**
  - *Q:* Dê dois motivos para a creatinina **subestimar** a gravidade renal. → *Gabarito:* (1) cinética
    não-estacionária (ainda acumulando: a creatinina de hoje reflete a TFG de ontem); (2) baixa massa
    muscular (idoso/sarcopênico produz pouca creatinina → valor "normal" com TFG ruim).
  - *Q:* O que o cilindro granuloso pigmentado ("muddy brown") indica? → *Gabarito:* **NTA** — restos de
    células tubulares descamadas; é o sedimento que separa NTA do sedimento limpo da pré-renal.
- **Chave de ouro (integradora).**
  - *Q:* Creatinina 3,2, FE_Na 0,4%, FE_ureia 28%, sedimento hialino, sem diurético. Pré-renal ou NTA? E se
    descobrirmos que ele tomou furosemida ontem, muda algo? → *Gabarito robusto:* **pré-renal** — FE_Na < 1%,
    FE_ureia < 35%, sedimento limpo, túbulo ávido. A furosemida recente **reforça usar a FE_ureia** (que segue
    baixa, confirmando pré-renal) e desvaloriza a FE_Na — mas aqui ambos já concordam. *Distrator "NTA pela
    creatinina alta":* a magnitude da creatinina não define mecanismo; os índices, sim. *Distrator "pós-renal":*
    exigiria evidência de obstrução (P_BC↑, hidronefrose), ausente aqui.

---

### Bloco V · A falência e a farmacologia integrada (capstones)

### M16 · A LRA por mecanismo [capstone fisiológico] — KDIGO; pré-renal / intrínseca / pós-renal

**Tese & inversão.** "LRA" não é um diagnóstico: é uma **sombra** projetada por três mecânicas que não se
parecem em nada. A mesma oligúria e a mesma creatinina nascem de (1) **P_GC↓** (pré-renal: o glomérulo não
filtra porque a pressão caiu), (2) **parênquima lesado** (intrínseca: NTA, NIA, glomerular — o filtro/túbulo
está quebrado) ou (3) **P_BC↑** (pós-renal: a urina não escoa e a contrapressão estrangula a filtração). A
inversão capital deste braço: **decompor o mecanismo antes de interpretar o número** — porque a conduta de um
mecanismo é o veneno do outro (volume salva o pré-renal e afoga o cardiorrenal).

**Erro → verdade.** *Erro:* "LRA é uma doença; o tratamento é diálise/soro." *Verdade:* LRA é uma
**síndrome de três mecanismos** estadiada pelo KDIGO (creatinina × débito urinário), e cada via tem uma
fisiologia, um conjunto de índices urinários e uma conduta **opostos**. Cardiorrenal e hepatorrenal são
pontes vivas: o rim cai porque o **coração** (congestão venosa, baixo DC) ou o **fígado** (vasodilatação
esplâncnica → vasoconstrição renal) falharam — o rim é vítima, não réu.

**Engine `model16.js`.**
- **Fórmula-mãe:** unifica os engines anteriores. A TFG vem do M1 — `TFG = Kf·(P_GC − P_BC − π_GC)` — e a
  **estadiagem KDIGO** vem de `ΔCr` (relativa e absoluta) e do débito urinário (`mL·kg⁻¹·h⁻¹` por janela de
  tempo). Um **classificador de mecanismo** lê os índices do M15 (`FE_Na`, `FE_ureia`, sedimento, osmU,
  ureia/Cr) e o contexto hemodinâmico (P_art, P_BC, Kf) para atribuir a via dominante e estimar a
  **reversibilidade**.
- **Entradas (estado):** `P_art`, `R_A`, `R_E` (do M1), `P_BC` (obstrução), `Kf` (lesão glomerular),
  `Cr_basal`, `Cr_atual`, `debitoUrinario`, `peso`, `tempo_h`, `FE_Na`, `FE_ureia`, `tipoSedimento`,
  `DC` (ponte Choca), `pressaoVenosa` (congestão), `vasodilatacaoEsplancnica` (ponte hepatorrenal).
- **Saídas:** `TFG`, `estagioKDIGO` (1/2/3), `mecanismo` (pré-renal × NTA × NIA × glomerular × pós-renal ×
  cardiorrenal × hepatorrenal), `reversibilidade` (alta na pré-renal/pós-renal precoce, baixa na NTA
  estabelecida), `condutaPorMecanismo`, `flag` de "responde a volume × NÃO responde a volume".
- **Alavanca de mecanismo:** um seletor que percorre as três mecânicas mantendo a **mesma creatinina** de
  saída — o motor mostra três caminhos diferentes para o mesmo número, com índices e condutas divergentes.
- **Invariantes a testar (§6):** mesma creatinina alcançável por P_GC↓ **ou** P_BC↑ **ou** Kf↓ (degeneração
  de mecanismo para o mesmo número — a pérola central, provada); estadiagem KDIGO monotônica em ΔCr e em
  oligúria; pré-renal → FE_Na<1% & reversibilidade alta; NTA → FE_Na>2% & reversibilidade baixa; pós-renal →
  P_BC↑ & TFG restaura ao **desobstruir** (P_BC→normal); cardiorrenal → conduta **descongestão**, não volume
  (flag "não responde a volume"); todos os valores finitos; veredito determinístico (tol 1e-7).

**Pérolas (prováveis pelo motor).**
1. **Um número, três fisiologias:** o motor produz creatinina 3,0 por aferente fechada (pré-renal),
   por túbulo necrótico (NTA) e por obstrução (pós-renal) — e as condutas são **antagônicas**. Ler o número
   sem o mecanismo é apostar às cegas.
2. **Cardiorrenal não tem sede:** a LRA do ICC descompensado vem de **congestão venosa** (P_BC e pressão
   intrarrenal↑) + baixo DC, não de hipovolemia. O motor mostra que dar volume **piora** a TFG (sobe a
   pressão venosa renal) — o oposto do pré-renal verdadeiro. A conduta é **descongestionar** (diurético/UF).
3. **Hepatorrenal é vasoconstrição funcional, não dano estrutural:** rim histologicamente normal, FE_Na
   baixíssima (<0,1%), sedimento limpo — a vasodilatação esplâncnica rouba volume circulante efetivo e o
   RAAS estrangula a aferente renal. O motor mostra TFG que se restauraria com **vasoconstritor esplâncnico +
   albumina**, não com soro fisiológico isolado.

**Instrumento vivo.** **Trifurcação da LRA**: um único mostrador de creatinina/débito urinário, e três
"trilhos" de mecanismo (pré-renal · intrínseca · pós-renal) que o usuário percorre vendo P_GC, P_BC, Kf,
índices urinários e a **conduta** mudarem — enquanto a creatinina-sombra fica parada. Sub-painéis
cardiorrenal e hepatorrenal acoplam o DC e a pressão venosa (Choca) ao glomérulo.

**Ilustração SVG.** O **diagrama de três portas** inline: o glomérulo do M1 com três "lesões" acendíveis —
aferente fechada (pré-renal, à entrada), túbulo escuro (NTA, no meio), ureter pinçado (pós-renal, na saída) —
cada uma computando a mesma TFG-sombra por caminho distinto. Mini-barras de FE_Na/FE_ureia e o estágio KDIGO
como semáforo (1/2/3) vindos do engine.

**Fármaco encadeado.** A LRA reorganiza a farmacologia: **suspender nefrotóxicos** (AINE → devolve a
aferente; contraste; aminoglicosídeos) é a primeira "dose". No **cardiorrenal**, furosemida em bólus/infusão
(ex.: **40–80 mg IV**, titulada à diurese, educacional) **descongestiona** — aqui o diurético é terapia, não
veneno. No **hepatorrenal**, **terlipressina + albumina** (vasoconstrição esplâncnica + expansão oncótica,
doses educacionais) restauram o volume circulante efetivo. Cada escolha amarrada ao mecanismo que a justifica;
o motor computa o efeito esperado na TFG. Disclaimer educacional presente.

**Caso (5 atos).** (1) Mulher com ICC FE 25%, dispneica, edemaciada, oligúrica; creatinina 1,2→2,4,
FE_Na 0,3%, pressão venosa↑. (2) *Prever:* FE_Na baixa = pré-renal → dar volume? (3) *Revelar:*
**cardiorrenal** — a FE_Na é baixa porque o RAAS está ávido, mas o problema é **congestão venosa**, não
depleção; volume pioraria. (4) Conduta: descongestionar (furosemida IV titulada / UF se refratário), otimizar
DC. (5) Síntese: a FE_Na baixa não autoriza volume quando o mecanismo é congestão — o coração é a causa.

**Pontes.** M1 (as três mecânicas da TFG — P_GC, P_BC, Kf) · M15 (os índices que separam as vias) · M9/M10
(volume × tonicidade na conduta) · M17 (a farmacologia diurética que descongestiona o cardiorrenal) ·
M37 (síndrome cardiorrenal e UF — o desenlace na DIALISA). Choca M16 (cardiogênico ↔ cardiorrenal: o mesmo
DC baixo visto pelos dois braços) · Choca M20 (distributivo/cirrose ↔ hepatorrenal: vasodilatação
esplâncnica) · Choca M25 (ressuscitação volêmica: quando o volume cura e quando afoga).

**Avaliação — sementes + gabarito.**
- **Socrática (passos-chave).**
  - *Q:* A mesma creatinina 3,0 pode vir de quantas mecânicas? Quais? → *A:* três — P_GC↓ (pré-renal),
    parênquima lesado (intrínseca: NTA/NIA/glomerular) e P_BC↑ (pós-renal). O número não distingue; os índices
    e o contexto, sim.
  - *Q:* Por que dar volume pode **piorar** uma LRA com FE_Na baixa? → *A:* se for **cardiorrenal**, a FE_Na
    é baixa por RAAS ávido, mas o motor é a **congestão venosa**; volume sobe a pressão venosa renal e
    derruba mais a TFG. FE_Na baixa não é sinônimo de "precisa de soro".
- **Revisão (teórica).**
  - *Q:* Resuma o KDIGO. → *Gabarito:* estadia LRA por **creatinina** (↑≥0,3 mg/dL em 48h, ou ↑≥1,5× o basal
    em 7 dias) **e/ou débito urinário** (<0,5 mL·kg⁻¹·h⁻¹ por janelas crescentes); estágios 1–3 pela
    magnitude e duração. É gravidade, não mecanismo — o mecanismo vem dos índices.
  - *Q:* Por que a hepatorrenal tem FE_Na quase zero com rim "normal"? → *Gabarito:* é **vasoconstrição renal
    funcional** — a vasodilatação esplâncnica derruba o volume circulante efetivo, o RAAS fecha a aferente e o
    túbulo reabsorve Na⁺ avidamente; a histologia é preservada, então não é NTA.
- **Chave de ouro (integradora).**
  - *Q:* Cirrótico com ascite, creatinina 1,0→2,6 em 5 dias, FE_Na 0,2%, sedimento limpo, sem choque, sem
    nefrotóxico, sem resposta a 2 dias de albumina. Mecanismo e conduta por mecanismo? → *Gabarito robusto:*
    **síndrome hepatorrenal** (vasoconstrição renal funcional sobre vasodilatação esplâncnica) — FE_Na
    baixíssima, sedimento limpo, ausência de outras causas e **não-resposta à expansão** definem o diagnóstico.
    Conduta: **vasoconstritor esplâncnico (terlipressina) + albumina** para restaurar o volume circulante
    efetivo; TRS/transplante como ponte. *Distrator "NTA, faça diálise já":* o sedimento limpo e a FE_Na
    contradizem NTA. *Distrator "pré-renal, só dê mais volume":* já não respondeu à albumina e não há
    depleção verdadeira — falta o vasoconstritor que ataca o mecanismo esplâncnico.

---

### M17 · Farmacologia diurética integrada [capstone farmacológico 1] — o néfron inteiro como alvo

**Tese & inversão.** Cada diurético é **uma chave numa fechadura de UM segmento** do néfron (M5–M8); este
capstone monta o néfron inteiro e mostra que a diurese real não é "quanto da droga", e sim **onde ela age,
contra o que o néfron reage**. A inversão: dobrar a dose nem sempre faz mais xixi — há um **teto** (toda a
massa da droga já bloqueia o transportador) e há o **braking** (o néfron retém Na⁺ a jusante e contra-ataca).
A potência não mora na dose; mora na **sequência** dos bloqueios.

**Erro → verdade.** *Erro:* "não fez xixi? dobre a furosemida." *Verdade:* a curva dose-resposta é
**sigmoide com teto** (`efeito = Emax·D/(EC50+D)`), e a **resistência diurética** desloca a curva à direita
(braking, hipertrofia do néfron distal, hipoalbuminemia, baixa entrega ao túbulo). A saída não é "mais dose
no mesmo ponto" — é **bloqueio sequencial** de outro segmento, onde a **sinergia mora na sequência** (alça +
tiazídico + poupador de K).

**Engine `model17.js`.**
- **Fórmula-mãe:** o néfron como **cascata de quatro filtros em série**. Cada segmento reabsorve uma fração
  do Na⁺ que recebe; cada droga reduz essa fração no seu segmento via `bloqueio = Emax·D/(EC50+D)` (sigmoide,
  com **teto**). O Na⁺ que escapa de um segmento vira **carga de entrada** do próximo — por isso bloquear o
  proximal sem bloquear o distal "vaza" (o distal recaptura). A **natriurese final** é o Na⁺ que sobrevive a
  toda a série; o **braking** sobe o EC50 efetivo dos segmentos distais ao longo do tempo.
- **Entradas (estado):** dose de cada classe — `acetazolamida` (TCP), `furosemida/bumetanida/torasemida`
  (alça, NKCC2), `hidroclorotiazida/clortalidona` (TCD, NCC), `espironolactona/amilorida` (coletor, ENaC);
  `tempo` (para o braking), `albumina` (entrega da droga), `TFG` (entrega ao túbulo), `hipertrofiaDistal`.
- **Saídas:** `natriurese` (mEq), `diurese` (mL), `fração bloqueada por segmento`, `posicao_na_curva`
  (sublimiar × íngreme × teto), `indice_braking`, `indice_resistencia`, `flag` de sinergia ativa.
- **Alavanca de mecanismo:** o **bloqueio sequencial** — ativar tiazídico **sobre** a alça move o sistema do
  teto da alça para um novo patamar (a sinergia), enquanto dobrar só a alça no teto não move nada. O motor
  contrasta as duas estratégias lado a lado.
- **Invariantes a testar (§6):** dose-resposta monotônica **com saturação** (∂efeito/∂D→0 no teto);
  bloqueio sequencial > soma ingênua só **a jusante** (a sinergia exige a ordem certa); braking reduz a
  natriurese ao longo do `tempo` para dose fixa (curva desloca à direita); hipoalbuminemia/↓TFG sobem o
  EC50 efetivo (resistência); equivalências de potência respeitadas (bumetanida ≫ furosemida por mg); Na⁺
  excretado ≤ Na⁺ filtrado (conservação); tudo finito e determinístico (tol 1e-7).

**Pérolas (prováveis pelo motor).**
1. **O teto é real:** no platô da sigmoide, dobrar a furosemida quase não muda a natriurese — o motor mostra
   a curva achatando. A jogada certa é **atingir o limiar** (a curva da alça é íngreme: abaixo do EC50 quase
   nada sai; é tudo-ou-nada de dose **única** eficaz, não de dose somada).
2. **A sinergia mora na sequência:** bloquear a alça **libera** Na⁺ para o TCD, que **hipertrofia** e
   recaptura (braking). Adicionar **tiazídico** fecha justamente esse escape distal → natriurese desproporcional
   à soma. O motor mostra alça-sozinha no teto vs. alça+tiazídico saltando de patamar (bloqueio sequencial).
3. **Resistência ≠ dose insuficiente:** o motor reproduz um paciente no teto da alça que **não responde** —
   não por pouca dose, mas por braking + hipoalbuminemia (a droga nem chega ao lúmen). Subir a dose é inútil;
   trocar de segmento (ou usar infusão contínua) é o caminho.

**Instrumento vivo.** **Néfron em cascata**: quatro segmentos em série, cada um uma "comporta" cuja abertura
(fração de Na⁺ que passa) é computada pela dose da sua droga. Sliders de dose por classe; a natriurese final
sai no fim do tubo. Um botão "tempo" liga o braking e mostra a comporta distal se **estreitando** (recaptura).
Modo "comparar": alça-sozinha-no-teto vs. alça+tiazídico, com as duas natriureses lado a lado.

**Ilustração SVG.** O néfron desenrolado inline (TCP→alça→TCD→coletor), cada segmento com sua droga-chave e
uma **curva sigmoide** própria (dose×bloqueio) cujo ponto operante (sublimiar/íngreme/teto) vem do engine.
Setas de Na⁺ "vazando" de um segmento para o próximo, com largura ∝ carga computada. Barra de braking que
cresce com o tempo deslocando a curva distal à direita.

**Fármaco encadeado (o coração deste capstone).**
- **Acetazolamida** (TCP, anidrase carbônica) — **250–500 mg/dia VO/IV**; natriurese fraca, perde HCO₃⁻
  (acidose), útil na alcalose metabólica do diurético. Teto baixo.
- **Diuréticos de alça** (NKCC2, ramo espesso) — **furosemida 20–80 mg IV** (teto ~160–200 mg na DRC),
  **bumetanida 1 mg ≈ furosemida 40 mg** (equivalência), **torasemida** (melhor biodisponibilidade VO).
  Curva **íngreme**: atingir o limiar > somar dose; na resistência, **infusão contínua** mantém o lúmen acima
  do EC50.
- **Tiazídicos** (TCD, NCC) — **hidroclorotiazida 25–50 mg/dia**, **clortalidona** (meia-vida longa),
  **metolazona** (age mesmo com TFG baixa) — o parceiro do **bloqueio sequencial** que fecha o escape distal.
- **Poupadores de K** (coletor) — **espironolactona 25–100 mg/dia** / **eplerenona** (ARM), **amilorida**
  (ENaC) — natriurese leve, mas **poupam K⁺** e fecham o último escape; controlam o braking aldosterônico.
Todas as doses **educacionais**, ancoradas ao transportador-alvo; o efeito vem do motor de dose-resposta
(Emax/EC50), nunca de tabela fixa. Disclaimer educacional presente.

**Caso (5 atos).** (1) ICC, edema refratário, já em furosemida 80 mg IV 12/12h, diurese pífia, albumina 2,4.
(2) *Prever:* dobrar a furosemida? (3) *Revelar:* está **no teto** com **braking** + hipoalbuminemia — mais
dose no mesmo ponto não move a curva. (4) Conduta: **infusão contínua** de alça (mantém o limiar) +
**bloqueio sequencial** com tiazídico (metolazona/HCTZ) antes da dose, monitorando K⁺/Na⁺. (5) Síntese: a
diurese saltou pela **sequência**, não pela dose — o néfron foi bloqueado em série.

**Pontes.** M5 (acetazolamida/SGLT2/manitol — o proximal) · M6 (alça/NKCC2 — a curva íngreme) · M7
(tiazídico/NCC — o parceiro sinérgico) · M8 (poupadores/ENaC — o último escape) · M16 (a descongestão do
cardiorrenal usa exatamente esta farmacologia) · M37 (diuréticos × ultrafiltração na DIALISA). Choca M25/M28
(volume e drogas vasoativas — a outra alça do manejo hemodinâmico que conversa com a diurese).

**Avaliação — sementes + gabarito.**
- **Socrática (passos-chave).**
  - *Q:* Por que dobrar a furosemida no teto quase não muda a diurese? → *A:* a curva é **sigmoide com teto** —
    no platô a droga já satura o NKCC2; mais massa não bloqueia mais transportador. O ganho está em **atingir
    o limiar** (a fase íngreme), não em ultrapassá-lo.
  - *Q:* Por que a alça + tiazídico rende mais que a soma esperada? → *A:* a alça empurra Na⁺ ao TCD, que
    **hipertrofia e recaptura** (braking); o tiazídico bloqueia exatamente esse escape distal → **bloqueio
    sequencial**. A sinergia mora na sequência dos segmentos.
- **Revisão (teórica).**
  - *Q:* Defina resistência diurética e cite três causas mecanísticas. → *Gabarito:* resposta natriurética
    abaixo do esperado para a dose; causas: (1) **braking** (retenção compensatória de Na⁺ distal e hipertrofia
    do néfron), (2) **baixa entrega da droga** (hipoalbuminemia, ↓TFG — não chega ao lúmen), (3) **proteinúria**
    que liga o diurético no lúmen. A curva desloca à direita.
  - *Q:* Equivalência: bumetanida 1 mg ≈ quê de furosemida? → *Gabarito:* ≈ **40 mg de furosemida**
    (bumetanida é ~40× mais potente por mg; biodisponibilidade VO mais confiável). Equivalência ≠ teto: cada
    uma tem seu platô.
- **Chave de ouro (integradora).**
  - *Q:* Edema refratário, furosemida 160 mg IV/dia sem resposta, albumina 2,2, K⁺ 3,3. Próximo passo por
    mecanismo e o cuidado obrigatório? → *Gabarito robusto:* já **no teto** com **braking** + entrega ruim →
    não subir mais a dose no mesmo ponto. Mudar a **estratégia**: infusão contínua de alça (mantém o lúmen
    acima do EC50) + **bloqueio sequencial** com tiazídico (fecha o escape distal) — a sinergia da sequência.
    **Cuidado:** o bloqueio sequencial **espolia K⁺/Mg²⁺ agressivamente** (já 3,3) → repor K⁺, vigiar
    arritmia, considerar associar poupador de K. *Distrator "dobrar a furosemida":* inútil no teto. *Distrator
    "suspender tudo, é resistência":* abandona a descongestão que o paciente precisa; o problema é a estratégia,
    não a indicação.

---

### M18 · Anti-hipertensivos, RAAS e eixo endócrino-renal [capstone farmacológico 2]

**Tese & inversão.** Os fármacos que movem o RAAS não tratam só "a pressão": eles reescrevem a **hemodinâmica
glomerular** — a aferente e a eferente do M1 — e o **eixo endócrino-renal** do M14. A inversão central: quando
um IECA é iniciado e a creatinina sobe um pouco, isso costuma ser **prova de que a droga funciona** (dilatou a
eferente, baixou a P_GC de forma protetora), não sinal de dano. "Creatinina subiu, suspenda o IECA" é o
**reflexo errado** que este capstone existe para desarmar.

**Erro → verdade.** *Erro:* "creatinina subiu após o IECA → o rim está piorando → suspenda." *Verdade:* uma
alta de **até ~30%** sem hipercalemia, estável, reflete a **queda hemodinâmica esperada** da P_GC pela
dilatação eferente — marcador de nefroproteção a longo prazo. Suspender só se a alta for >30%, houver
hipercalemia perigosa, ou houver **estenose bilateral de artéria renal** (aí a TFG **dependia** da constrição
eferente da AngII e a queda vira precipício). A mesma droga: nefroprotetora na regra, perigosa na exceção.

**Engine `model18.js`.**
- **Fórmula-mãe:** acopla o glomérulo do M1 ao eixo do M14. Cada droga move uma resistência arteriolar ou um
  hormônio: `IECA/BRA/IDR` ↓AngII → **eferente abre** (`R_E↓`) → `P_GC↓` → TFG↓ (esperado), FF↓, e ↓aldo →
  K⁺↑; `ARM` bloqueia o coletor (K⁺↑, natriurese leve); `sacubitril` (com BRA, ARNI) potencia peptídeos
  natriuréticos (vasodilatação + natriurese). Em paralelo, o **eixo ósseo-mineral/anemia**: `ESA`
  (EPO exógena → Hb↑), `quelantes de P` (↓absorção intestinal de fosfato), `calcimiméticos` (↓PTH),
  `análogos de vit D` (↑Ca²⁺/↓PTH, ecoa M12). E o **ajuste renal de dose**:
  `dose_ajustada = f(Vd, ligacaoProteica, fracaoRenal, clearance, removidoPelaDialise)`.
- **Entradas (estado):** classe e dose do anti-hipertensivo; `estenoseRenal` (uni/bilateral), `K_basal`,
  `Cr_basal`, `TFG`, `volemia`; para o ajuste: `Vd`, `ligacaoProteica`, `fracaoRenal`, `clearance`,
  `dialisavel`; para o eixo endócrino: `Hb`, `PTH`, `fosfato`, `Ca`.
- **Saídas:** `ΔP_GC`, `ΔTFG`, `ΔCr_esperada` (%), `ΔK`, `FF`, `flag` de "alta esperada × alta perigosa ×
  estenose oculta"; `dose_renal_ajustada`; `Hb/PTH/fosfato` resultantes; `flag` de fármaco que **a diálise
  remove** (re-dose pós-sessão).
- **Alavanca de mecanismo:** o seletor **estenose bilateral on/off** — com a estenose, o motor mostra a
  mesma dose de IECA virando precipício (a TFG dependia da AngII na eferente); sem ela, a mesma dose dá a
  alta benigna ~20%. A exceção que prova a regra, computada.
- **Invariantes a testar (§6):** IECA/BRA → P_GC↓ & FF↓ & K⁺↑ (cadeia monotônica); alta de Cr ≤ ~30% sem
  estenose → flag "esperada/manter"; com estenose bilateral → ΔTFG ≫ (precipício, flag "suspender");
  `dose_ajustada ↓` monotônica com `fracaoRenal↑` e `clearance↓`; fármaco dialisável → re-dose pós-diálise
  (identidade); ESA → Hb↑ com teto (não ultrapassar alvo); tudo finito e determinístico (tol 1e-7).

**Pérolas (prováveis pelo motor).**
1. **A creatinina que sobe porque a droga acertou:** o motor mostra IECA → eferente↓ → P_GC↓ → Cr↑ ~20% **com
   fluxo plasmático preservado** (FF↓). É o efeito hemodinâmico **alvo** (nefroproteção), não dano —
   distinguido da NTA (onde a FF não cai e o sedimento suja).
2. **A mesma droga, dois destinos, decididos pela anatomia:** com estenose **bilateral**, a TFG dependia da
   constrição eferente da AngII; o IECA a remove e a TFG **despenca**. O motor coloca o mesmo enalapril dando
   nefroproteção num rim e precipício no outro — a diferença é a estenose, não a dose.
3. **A dose certa depende do que o rim e a máquina removem:** o motor mostra que um fármaco **hidrofílico,
   pouco ligado a proteína, de fração renal alta** acumula na DRC (precisa ↓dose) e é **removido pela
   diálise** (precisa re-dose pós-sessão) — enquanto um lipofílico muito ligado quase não muda. Ajustar pela
   farmacocinética, não pela suposição.

**Instrumento vivo.** **Glomérulo farmacológico**: o esquema do M1 com duas válvulas (aferente · eferente);
ao titular IECA/BRA/IDR, a eferente abre e a P_GC e a TFG caem ao vivo, com a `ΔCr esperada` em %. Um
interruptor "estenose bilateral" transforma a curva benigna em precipício. Ao lado, a **calculadora de
ajuste renal**: Vd, ligação, fração renal e clearance entram, a dose ajustada e o "re-dosar pós-diálise"
saem — tudo computado.

**Ilustração SVG.** Glomérulo inline com as duas arteríolas (largura ∝ 1/R) e a P_GC entre elas; o IECA
"abrindo" a eferente em animação computada (calibre↑ → P_GC↓). Barra de `ΔCr esperada` com a zona verde
(≤30%) e a vermelha (>30% / estenose). Mini-painel do eixo endócrino: Hb, PTH e fosfato como barras movidas
por ESA/calcimimético/quelante. Esquema de ajuste de dose com Vd e fração renal como blocos proporcionais.

**Fármaco encadeado (o coração deste capstone).**
- **IECA** — **enalapril 5–20 mg 12/12h**, **captopril**, **ramipril 2,5–10 mg/dia**: ↓AngII → eferente abre.
- **BRA** — **losartana 50–100 mg/dia**, **valsartana**: bloqueio AT₁, mesmo efeito glomerular, menos tosse.
- **Inibidor direto de renina (IDR)** — **alisquireno 150–300 mg/dia**: corta no topo da cascata.
- **ARNI (sacubitril/valsartana)** — potencia peptídeos natriuréticos; **não combinar com IECA** (angioedema).
- **ARM** — **espironolactona 25–50 mg/dia**, **eplerenona**: anti-aldosterona; vigiar K⁺.
- **Eixo endócrino-renal:** **ESA** (epoetina, dose por kg SC/IV — alvo de Hb conservador, **não** normalizar),
  **quelantes de fósforo** (sevelâmer, carbonato de cálcio — às refeições), **calcimiméticos** (cinacalcete →
  ↓PTH), **análogos de vit D** (calcitriol/paricalcitol → ↑Ca²⁺/↓PTH).
- **Ajuste renal:** dose ← `Vd · ligação proteica · fração renal · clearance` (+ o que a diálise remove).
Doses **educacionais**, cada uma ancorada ao mecanismo; efeito computado pelo motor. Disclaimer presente.

**Caso (5 atos).** (1) Diabético, DRC estágio 3, proteinúria, inicia enalapril; em 1 semana creatinina
1,4→1,7 (+21%), K⁺ 4,9, sem oligúria. (2) *Prever:* o rim piorou — suspender? (3) *Revelar:* alta **esperada**
(<30%, K⁺ tolerável) pela dilatação eferente — a droga age no eixo certo (nefroproteção/antiproteinúrico).
(4) Conduta: **manter e monitorar** Cr/K⁺; só recuar se >30%, hipercalemia, ou suspeita de estenose bilateral.
(5) Síntese: a creatinina contou a P_GC caindo de propósito — recuar seria abrir mão da nefroproteção.

**Pontes.** M1 (o paradoxo do eferente — a base hemodinâmica) · M14 (RAAS e eixo endócrino — os hormônios que
estes fármacos curto-circuitam) · M12 (Ca/PO₄/PTH — quelantes, calcimiméticos, vit D) · M16 (quando a alta de
Cr é a LRA verdadeira × o efeito esperado) · M32 (DIALISA: o que a máquina remove → ajuste e re-dose).
Choca M28 (vasopressores & inotrópicos — a face sistêmica do mesmo RAAS/AngII; as duas faces da hemodinâmica).

**Avaliação — sementes + gabarito.**
- **Socrática (passos-chave).**
  - *Q:* Por que o IECA **baixa** a TFG e sobe a creatinina? → *A:* ↓AngII → **eferente dilata** → represa
    glomerular cai → P_GC↓ → TFG↓ → Cr↑. É hemodinâmico e **esperado**; a FF cai junto (fluxo plasmático
    preservado), o que o separa do dano tubular.
  - *Q:* Em quem essa mesma dilatação eferente vira catástrofe? → *A:* na **estenose bilateral de artéria
    renal** (ou rim único estenótico) — ali a TFG **dependia** da constrição eferente da AngII; remover a
    AngII derruba a P_GC ao chão (precipício). A anatomia decide se a droga protege ou destrói.
- **Revisão (teórica).**
  - *Q:* Que magnitude de alta de creatinina após IECA/BRA autoriza **manter** a droga, e com que vigilância?
    → *Gabarito:* até **~30%** de alta, estável, **sem hipercalemia** → manter e monitorar Cr e K⁺; é o efeito
    hemodinâmico esperado. Acima disso, ou com K⁺ perigoso, ou suspeita de estenose → reavaliar/suspender.
  - *Q:* Quais parâmetros decidem o ajuste renal de um fármaco e qual cenário exige **re-dose pós-diálise**? →
    *Gabarito:* `Vd`, **ligação proteica**, **fração renal** de eliminação e **clearance**; fármaco
    hidrofílico, pouco ligado a proteína e de baixo peso molecular é **removido pela diálise** → re-dosar
    após a sessão para repor o que a máquina retirou.
- **Chave de ouro (integradora).**
  - *Q:* Hipertenso com sopro abdominal, função renal limítrofe, inicia IECA e em 4 dias a creatinina sobe
    **45%** com oligúria incipiente. Conduta e mecanismo? Contraste com o caso de alta de 20%. → *Gabarito
    robusto:* alta >30% + oligúria + sopro = forte suspeita de **estenose bilateral de artéria renal** — a TFG
    dependia da constrição eferente da AngII; o IECA a removeu e a P_GC despencou (**precipício**). Conduta:
    **suspender o IECA**, restaurar a função, investigar a estenose (não é nefroproteção, é dependência
    hemodinâmica). **Contraste:** a alta de ~20% sem estenose, estável e sem hipercalemia, é o efeito
    **esperado** e manda **manter**. *Distrator "manter, toda alta de Cr no IECA é esperada":* ignora o teto
    de 30%, a oligúria e a estenose — aqui é dano funcional real. *Distrator "é NTA, dialise":* a FF cairia e
    o quadro reverte ao suspender a droga; não há sedimento de NTA — é hemodinâmico e reversível.

---

## Metade B · DIALISA — substituição renal e terapia crítica (M19–M39)

> A metade A construiu o rim. A metade B constrói a **máquina** que o substitui — parcialmente, por física,
> nunca por mágica. A inversão da máquina (§4.2 do `CLAUDE.md`) é o eixo de toda esta metade: **SOLUTO** sai
> por difusão (gradiente de concentração) + convecção (arraste por solvente); **VOLUME** sai por
> ultrafiltração (gradiente de pressão transmembrana, TMP). Dois mecanismos físicos independentes, dois botões
> separados. Tudo o que se prescreve — `Qb`, `Qd`, taxa de UF, `Kt/V`-alvo, tempo — é **dose computada pelo
> motor com unidade explícita**, ancorada ao mecanismo que a justifica (§8). Conteúdo educacional; revisão do
> autor.

### Bloco VI · Princípios e o circuito

### M19 · Princípios físicos do transporte — difusão · convecção · ultrafiltração · adsorção

**Tese & inversão.** A diálise não "limpa o sangue": ela move massa e água por **quatro físicas distintas**, e
cada uma tem sua própria alavanca. O clearance que aparece no relatório é uma sombra; a causa mora em qual
física o gerou. Difusão depende do gradiente de concentração; convecção, do fluxo de solvente; ultrafiltração,
da pressão transmembrana; adsorção, da afinidade pela membrana. Separar as quatro **antes** de prescrever.

**Erro → verdade.** *Erro:* "aumentar a diálise tira mais de tudo." *Verdade:* aumentar o **fluxo de dialisato**
sobe a difusão (mantém o gradiente alto), mas não move volume; aumentar a **TMP** sobe a ultrafiltração (água),
e a convecção que ela arrasta carrega moléculas médias — mas pouco move a ureia pequena, já governada pela
difusão. Botões diferentes, solutos diferentes.

**Engine `model19.js`.**
- **Fórmula-mãe:** clearance difusivo `J_dif = K0A_eff · (C_b − C_d)` saturando com os fluxos (a forma de
  clearance do dialisador, `K = Qb·(1−e^x)/(1−(Qb/Qd)·e^x)` com `x = K0A·(1/Qb − 1/Qd)`); fluxo convectivo
  `J_conv = Q_uf · S · C_b` (S = coeficiente de sieving ∈ [0,1]); volume removido `V̇_uf = K_uf · TMP`.
- **Entradas (estado):** `Qb` (mL·min⁻¹, fluxo de sangue), `Qd` (mL·min⁻¹, fluxo de dialisato),
  `C_b` (mmol·L⁻¹, concentração no sangue), `C_d` (mmol·L⁻¹, no dialisato — em geral 0 p/ ureia),
  `TMP` (mmHg), `K_uf` (mL·h⁻¹·mmHg⁻¹, coef. de ultrafiltração da membrana), `K0A` (mL·min⁻¹), `S`, `MW`
  (peso molecular, Da — proxy do regime difusão↔convecção).
- **Saídas:** `K_dif`, `J_conv`, `V̇_uf` (mL·h⁻¹), `clearance_total`, e **fração** difusiva × convectiva
  (quanto de cada física no total) + flag do regime dominante por `MW`.
- **Alavancas de mecanismo:** `Qd↑→K_dif↑` (mantém gradiente); `TMP↑→V̇_uf↑` (mais convecção; satura no
  flux máximo da membrana); `MW↑→` peso desloca o domínio de difusão para convecção (pequenas difundem,
  médias convectam); `S↓` (proteína grande) → membrana retém o soluto (sieving baixo).
- **Invariantes a testar (§6):** `V̇_uf ≥ 0` e `= 0` se `TMP ≤ 0`; `S ∈ [0,1]`; `K_dif` monótona ↑ em `Qb`,
  `Qd`, `K0A` e ↑ em `(C_b − C_d)`; `J_conv ∝ Q_uf · S · C_b` (identidade, tol 1e-7);
  fração_dif + fração_conv = 1 (conservação); difusão→0 quando o gradiente `(C_b−C_d)→0` ainda que o fluxo
  exista. Sem `NaN`/∞ sob fuzzing ≥ 5000.

**Pérolas (prováveis pelo motor).**
1. **Gradiente, não fluxo, manda na difusão:** com `C_b = C_d` o clearance difusivo é zero por mais sangue que
   passe — o dialisato em contracorrente existe para *manter o gradiente máximo*, não para "lavar".
2. **A molécula média só sai por arraste:** suba a TMP e a convecção carrega a β2-microglobulina que a difusão
   ignorava; abaixe a TMP e ela fica — o motor mostra a fração convectiva crescer com `MW`.
3. **Adsorção é finita:** a membrana satura — o clearance por adsorção cai a zero quando os sítios enchem (não
   é renovável dentro da sessão), ao contrário da difusão, que dura enquanto durar o gradiente.

**Instrumento vivo.** Painel **"quatro físicas"**: quatro barras computadas (difusão, convecção,
ultrafiltração, adsorção) que sobem/descem ao mover `Qb`/`Qd`/`TMP`/`MW`; sobreposta, a **rosca difusivo×
convectivo** mostrando a fração de cada um no clearance total, redesenhada ao vivo. O usuário vê o domínio
migrar de difusão→convecção ao arrastar `MW` da ureia (60 Da) à β2-microglobulina (~11.800 Da).

**Ilustração SVG.** Corte da membrana inline: poros como canais; setas de **difusão** (moléculas pequenas
descendo o gradiente, comprimento ∝ `C_b−C_d`), seta de **convecção** (água arrastando solutos, largura ∝
`V̇_uf`), seta de **ultrafiltração** (pressão empurrando água, ∝ `TMP`) e pontos de **adsorção** grudados na
parede (saturáveis). Mini-barras computadas ao lado de cada seta.

**Fármaco / prescrição encadeada.** Sem droga: aqui a "alavanca" é a **prescrição física**. Já se ancora a
unidade: `Qd` em mL·min⁻¹ governa difusão; `TMP` em mmHg governa ultrafiltração; a escolha membrana (alto×
baixo fluxo, `K_uf` em mL·h⁻¹·mmHg⁻¹) define quanto da convecção é possível. Educacional; o detalhe de cada
botão vem nos M20–M28. Disclaimer presente.

**Caso (5 atos).** (1) Dois pacientes, mesmo clearance de ureia no relatório, vereditos clínicos opostos.
(2) *Prever:* a diálise "foi igual" para os dois? (3) *Revelar:* um removeu ureia por difusão pura (molécula
pequena), o outro precisava limpar molécula média e só a convecção (TMP alta, membrana high-flux) o fez — mesmo
número de ureia, β2 diferente. (4) Conduta: para soluto médio, prescrever modalidade convectiva/high-flux, não
"mais tempo de difusão". (5) Síntese: o relatório dá um número; a física dá a causa.

**Pontes.** M20 (onde cada física vira um botão do circuito), M21 (a membrana que fixa `S`, `K0A`, `K_uf`),
M27 (CVVH convecção × CVVHD difusão — a escolha da física na TRRC), M33 (remoção de toxinas: o `MW` e a ligação
proteica decidem se a diálise alcança a molécula).

**Avaliação — sementes + gabarito.**
- **Socrática (passos-chave).**
  - *Q:* Por que o dialisato corre em **contracorrente** ao sangue? → *A:* para manter o gradiente de
    concentração máximo ao longo de todo o capilar; em paralelo, sangue e dialisato equilibrariam no meio e a
    difusão pararia na segunda metade.
  - *Q:* Subi a TMP e a ureia quase não mudou; o que mudou? → *A:* a **água** (ultrafiltração) e as moléculas
    **médias** (convecção). A ureia já estava no teto difusivo — TMP move volume, não o soluto pequeno.
- **Revisão (teórica).**
  - *Q:* Defina convecção e diga de que ela depende. → *Gabarito:* arraste de soluto pelo solvente
    ultrafiltrado; `J_conv = Q_uf · S · C_b` — depende da **taxa de UF** e do **sieving** (S), não do
    gradiente de concentração; é a via das moléculas médias.
  - *Q:* Por que a adsorção não é uma fonte estável de clearance? → *Gabarito:* os sítios da membrana saturam;
    uma vez ocupados, o clearance por adsorção cai a zero dentro da sessão — é capacidade finita, não fluxo.
- **Chave de ouro (integradora).**
  - *Q:* Você quer aumentar a remoção de β2-microglobulina (≈11.800 Da) numa sessão. Aumentar `Qb`, aumentar
    `Qd`, ou aumentar a convecção (UF + high-flux)? Justifique. → *Gabarito robusto:* **aumentar a convecção**
    (UF/TMP com membrana high-flux): moléculas médias quase não difundem (poro pequeno demais p/ o gradiente
    valer), só saem **arrastadas pelo solvente**. *Aumentar `Qb`/`Qd`* sobe o clearance **difusivo** — ótimo p/
    ureia, quase inútil p/ β2. *Distrator "mais tempo de difusão":* prolonga a remoção de soluto pequeno, não
    alcança o médio; a física certa é convecção, não duração.

---

### M20 · O circuito extracorpóreo — acesso, bomba, dialisador, fluxos e pressões

**Tese & inversão.** A diálise é um **circuito de pressões**, não uma caixa-preta. O sangue sai por um acesso,
uma bomba o empurra (`Qb`), atravessa o dialisador contra o dialisato (`Qd`) e volta; em cada ponto há uma
pressão (arterial pré-bomba, venosa de retorno, transmembrana) que **conta o que está acontecendo**. O alarme
não é um defeito do aparelho: é o circuito relatando física. Ler a pressão antes de silenciar o alarme.

**Erro → verdade.** *Erro:* "pressão venosa alta = trombo no acesso, sempre." *Verdade:* a pressão venosa
mede a **resistência ao retorno** (agulha estreita, dobra, coágulo no cata-bolhas, posição); a **arterial
pré-bomba** negativa demais denuncia acesso que **não entrega** o `Qb` pedido (sucção de parede). Cada pressão
aponta um segmento do circuito — decompor o circuito, não trocar tudo.

**Engine `model20.js`.**
- **Fórmula-mãe:** `Qb_efetivo = min(Qb_pedido, Qb_que_o_acesso_entrega(P_art))`; perda de carga
  `ΔP = Q · R` em cada segmento; `TMP = (P_sangue_média − P_dialisato) ≈ (P_ven + P_art_dial)/2 − P_d`;
  fração de recirculação `R% = (sistêmica − arterial)/(sistêmica − venosa)` quando agulhas próximas.
- **Entradas (estado):** `Qb` (mL·min⁻¹, pedido), `Qd` (mL·min⁻¹), `R_acesso` (resistência do acesso, relativa),
  `R_venoso` (retorno), `Q_uf` (mL·h⁻¹, taxa de UF prescrita), `K_uf` (mL·h⁻¹·mmHg⁻¹), `dist_agulhas`
  (proxy de recirculação).
- **Saídas:** `P_art` (mmHg, pré-bomba, negativa), `P_ven` (mmHg, retorno, positiva), `TMP` (mmHg),
  `Qb_efetivo` (mL·min⁻¹), `recirculacao` (%), flags (sucção arterial · retorno obstruído · TMP excessiva).
- **Alavancas de mecanismo:** `Qb↑→P_art mais negativa` (mais sucção; satura/alarma se acesso pobre);
  `R_venoso↑→P_ven↑`; `Q_uf↑→TMP↑` (preciso de mais pressão p/ tirar mais água); agulhas próximas →
  recirculação↑ → **clearance efetivo↓** (sangue já limpo volta à agulha arterial).
- **Invariantes a testar (§6):** `P_art < 0 < P_ven` na faixa fisiológica; `Qb_efetivo ≤ Qb_pedido`;
  `TMP` monótona ↑ em `Q_uf`; `recirculacao ∈ [0,100]%` e `→0` quando agulhas distantes; `TMP = Q_uf/K_uf`
  identidade (tol 1e-7); sob acesso ruim, `Qb_efetivo` cai mesmo com `Qb_pedido↑`. Sem `NaN`/∞ no fuzz ≥ 5000.

**Pérolas (prováveis pelo motor).**
1. **A recirculação rouba a dose:** agulhas próximas devolvem sangue já dialisado à entrada → o clearance
   *medido no corpo* despenca mesmo com `Qb` e `Qd` "perfeitos" no display. O motor mostra Kt/V efetivo < Kt/V
   prescrito só pela recirculação.
2. **Pedir `Qb` que o acesso não dá não acelera nada:** acima do que o acesso entrega, subir o pedido só torna
   a `P_art` mais negativa (sucção, alarme, hemólise) — o `Qb_efetivo` não sobe. O gargalo é o acesso.
3. **TMP é só a conta da UF:** querer tirar muito volume em pouco tempo exige TMP alta; a membrana tem teto —
   passar dele não tira mais água, só arrisca a integridade. UF é prescrição de pressão.

**Instrumento vivo.** **Esquema do circuito** vivo: acesso → bomba (`Qb`) → dialisador (contracorrente `Qd`) →
retorno, com **três manômetros computados** (arterial, venoso, TMP) que se movem ao vivo. Ao apertar o acesso
(`R_acesso↑`), o manômetro arterial mergulha e a barra `Qb_efetivo` descola do `Qb_pedido`. Um medidor de
**recirculação** acende conforme a distância das agulhas.

**Ilustração SVG.** Linha do circuito inline: tubo arterial (azul, pressão negativa → barra para baixo), bomba
de roletes (rotação ∝ `Qb`), dialisador em corte com sangue×dialisato em contracorrente, tubo venoso
(vermelho, pressão positiva → barra para cima). Setas de recirculação curtas entre as agulhas quando próximas.
Comprimentos das barras de pressão computados do engine.

**Fármaco / prescrição encadeada.** A prescrição aqui é **física do circuito**, com unidades: `Qb` típico de
HDI 250–400 mL·min⁻¹ (educacional); `Qd` ~500 mL·min⁻¹; UF prescrita em mL·h⁻¹ → o motor devolve a TMP
necessária em mmHg. Citrato/heparina (anticoagulação do circuito) é prévia do M29 — aqui só se nomeia que o
circuito **coagula** e precisa de manejo. Disclaimer presente.

**Caso (5 atos).** (1) Sessão alarma "pressão venosa alta" repetidamente; equipe quer trocar o cateter.
(2) *Prever:* trombose do acesso? (3) *Revelar:* o ramo **venoso** estava dobrado distal ao cata-bolhas — `P_ven`
alta = resistência ao **retorno**, não problema do acesso arterial; `P_art` estava normal. (4) Conduta:
desfazer a dobra/reposicionar; só investigar o acesso se a `P_art` (sucção) for o sinal. (5) Síntese: cada
manômetro nomeia um segmento — a pressão é o diagnóstico.

**Pontes.** M19 (as físicas que o circuito materializa em botões), M21 (o dialisador/membrana detalhado),
M25 (como `Qb`/`Qd`/tempo viram dose — Kt/V), M29 (anticoagulação do circuito), M27 (o circuito contínuo da
TRRC e suas pressões).

**Avaliação — sementes + gabarito.**
- **Socrática (passos-chave).**
  - *Q:* A `P_art` pré-bomba está muito negativa e alarma; o que isso diz? → *A:* o acesso **não entrega** o
    `Qb` pedido — a bomba está "sugando parede". Reduzir `Qb` ou corrigir o acesso; subir o pedido piora.
  - *Q:* Coloquei as agulhas a 2 cm uma da outra e o Kt/V veio baixo apesar de fluxos ótimos. Por quê? →
    *A:* **recirculação** — sangue recém-dialisado volta pela agulha arterial; o dialisador trabalha sobre
    sangue já limpo. Afastar as agulhas restaura o clearance efetivo.
- **Revisão (teórica).**
  - *Q:* O que a TMP representa e como ela se relaciona com a UF? → *Gabarito:* gradiente de pressão através da
    membrana; `Q_uf = K_uf · TMP`. Para tirar mais volume na mesma membrana, precisa-se de mais TMP — há teto.
  - *Q:* Diferencie o significado de `P_art` (pré-bomba) e `P_ven`. → *Gabarito:* `P_art` mede a capacidade do
    acesso de **entregar** sangue (negativa; muito negativa = sucção/acesso pobre); `P_ven` mede a resistência
    ao **retorno** (positiva; alta = obstrução do ramo venoso/agulha/coágulo).
- **Chave de ouro (integradora).**
  - *Q:* Kt/V prescrito 1,4 mas o entregue medido foi 1,0, com `Qb`/`Qd`/tempo conforme prescrito no display.
    Onde foi a dose? → *Gabarito robusto:* a causa mais provável é **recirculação do acesso** (agulhas próximas
    ou acesso disfuncional) — o display mostra fluxos no circuito, não o que de fato passa **uma vez** pelo
    dialisador; sangue limpo recirculando derruba o clearance corpóreo. *Distrator "membrana saturou":* a
    membrana não satura para ureia (difusão é renovável); *distrator "aumentar Qb":* se o acesso é o gargalo,
    subir o pedido só agrava a sucção sem subir o `Qb_efetivo`. Corrigir o acesso/posição das agulhas.

---

### M21 · A membrana e o clearance — KoA, permeabilidade, sieving, backfiltration

**Tese & inversão.** O dialisador tem um **teto**: por mais sangue e dialisato que se passe, o clearance de um
soluto satura no `KoA` da membrana para aquela molécula. O número de clearance não vem só dos fluxos — vem do
**casamento entre poro e molécula**. `KoA` governa a difusão; o coeficiente de **sieving** (S) governa a
convecção; o tamanho do poro (high-flux × low-flux) decide quais moléculas existem para a máquina. Conhecer a
membrana antes de culpar os fluxos.

**Erro → verdade.** *Erro:* "dobrar `Qb` dobra o clearance." *Verdade:* o clearance difusivo satura — perto do
`KoA`, subir `Qb` rende cada vez menos (rendimento decrescente). E há a **backfiltration**: em membranas
high-flux, na saída do dialisador o dialisato pode estar a **maior pressão** que o sangue e atravessar de volta
— se o dialisato não for ultrapuro, isso é uma porta de pirógenos.

**Engine `model21.js`.**
- **Fórmula-mãe:** clearance do dialisador `K = Qb · (1 − e^x)/(1 − (Qb/Qd)·e^x)`, com
  `x = KoA·(1/Qb − 1/Qd)` (forma clássica, contracorrente); convectivo `K_conv = S · Q_uf`; perfil de pressão
  ao longo da fibra define o ponto onde `P_dialisato > P_sangue` → **backfiltration** (volume entrando).
- **Entradas (estado):** `KoA` (mL·min⁻¹, p/ o soluto), `Qb` (mL·min⁻¹), `Qd` (mL·min⁻¹), `S` (sieving ∈[0,1]),
  `Q_uf` (mL·h⁻¹), `tipo_membrana` (low-flux × high-flux → faixa de `K_uf` e `S` p/ moléculas médias),
  `MW` (Da).
- **Saídas:** `K` (mL·min⁻¹, difusivo), `K_conv` (mL·min⁻¹), `K_total`, fração de saturação `K/KoA`,
  ponto/volume de **backfiltration**, flag low×high-flux.
- **Alavancas de mecanismo:** `KoA↑→K↑` (com saturação); `Qb↑→K↑` **com rendimento decrescente** perto do
  `KoA`; `S↑→K_conv↑` (membrana mais aberta); high-flux → `K_uf` e `S` de médias ↑ e risco de backfiltration↑;
  `MW↑→S↓` (poro corta a molécula grande).
- **Invariantes a testar (§6):** `0 ≤ K ≤ KoA` e `K ≤ Qb` (não se depura mais do que entra);
  `∂K/∂Qb > 0` mas **côncava** (rendimento decrescente, segunda diferença < 0); `S ∈ [0,1]`, `S↓` com `MW↑`;
  backfiltration = 0 em low-flux (`K_uf` baixo); `K_conv = S·Q_uf` identidade (tol 1e-7). Fuzz ≥ 5000 sem
  `NaN`/∞.

**Pérolas (prováveis pelo motor).**
1. **O teto do `KoA`:** dois pacientes com `Qb` muito diferentes podem ter clearance quase igual se ambos já
   estão no platô do `KoA` — o gargalo é a membrana, não a bomba. O motor mostra a curva `K×Qb` achatando.
2. **High-flux não é "sempre mais limpo":** ganha nas moléculas médias (S alto, convecção), mas abre a porta da
   **backfiltration** — exige dialisato ultrapuro; com água ruim, o ganho vira risco de pirógeno.
3. **Sieving é o filtro de tamanho:** a albumina (S≈0) não passa nem por convecção máxima; o que define o que
   sai não é só a TMP, é o `S` daquela molécula naquela membrana.

**Instrumento vivo.** Curva **clearance × `Qb`** desenhada ao vivo, com o **platô do `KoA`** explícito (o ponto
onde subir o fluxo para de render) e uma segunda curva para o soluto médio (governada por `S` e `Q_uf`). Toggle
**low-flux × high-flux** redesenha ambas e acende, em high-flux, a zona de **backfiltration** ao longo da fibra.

**Ilustração SVG.** Corte da fibra capilar inline: poros desenhados em escala (low-flux = poros pequenos;
high-flux = poros grandes); moléculas de tamanhos diferentes (ureia pequena passa; β2 média passa só em
high-flux; albumina grande barrada) com `S` anotado. Perfil de pressão sangue×dialisato ao longo da fibra, com
a região de cruzamento (backfiltration) sombreada — posição computada do engine.

**Fármaco / prescrição encadeada.** Prescrição = **escolha da membrana**, com unidade: `KoA` (mL·min⁻¹) p/
ureia define o teto difusivo; `K_uf` (mL·h⁻¹·mmHg⁻¹) classifica low×high-flux; escolher high-flux p/ remover
moléculas médias **exige** dialisato ultrapuro (mecanismo: evitar backfiltration de pirógenos). Educacional.
Disclaimer presente.

**Caso (5 atos).** (1) Quer-se subir a dose: prescreve-se `Qb` 300→400 mL·min⁻¹, mas o Kt/V mal muda.
(2) *Prever:* erro de medida? (3) *Revelar:* a membrana já operava perto do `KoA` — o clearance estava no
**platô**; mais `Qb` rende quase nada. (4) Conduta: para subir dose, **trocar a membrana (KoA maior)** ou
**aumentar tempo**, não insistir no fluxo. (5) Síntese: o teto é da membrana; o fluxo só importa enquanto não o
tocou.

**Pontes.** M19 (as físicas que a membrana realiza), M20 (o circuito que alimenta a membrana com `Qb`/`Qd`),
M25 (KoA e fluxos entram no Kt/V), M27/M28 (membranas e dose na TRRC), M30 (na DP a "membrana" é o peritônio —
outro `S`, outro KoA).

**Avaliação — sementes + gabarito.**
- **Socrática (passos-chave).**
  - *Q:* Por que dobrar `Qb` perto do `KoA` quase não sobe o clearance? → *A:* o clearance satura no `KoA` da
    membrana; perto do teto há **rendimento decrescente** — o gargalo passou a ser a transferência pela
    membrana, não a oferta de sangue.
  - *Q:* O que é backfiltration e por que ela importa? → *A:* na saída do dialisador high-flux, o dialisato
    pode ficar a pressão maior que o sangue e entrar de volta; se a água não for ultrapura, carrega pirógenos
    para o paciente. É o preço do poro grande.
- **Revisão (teórica).**
  - *Q:* Defina o coeficiente de sieving. → *Gabarito:* `S = C_ultrafiltrado/C_plasma` para um soluto; ∈[0,1];
    S=1 passa livre na convecção, S=0 é totalmente retido (ex.: albumina). É o filtro de **tamanho** da
    convecção.
  - *Q:* O que diferencia membrana high-flux de low-flux? → *Gabarito:* poro maior → `K_uf` alto e `S` de
    moléculas médias alto (remove β2-microglobulina por convecção), ao custo de risco de backfiltration → exige
    dialisato ultrapuro.
- **Chave de ouro (integradora).**
  - *Q:* Paciente em HD crônica com β2-microglobulina alta e amiloidose. A equipe quer "dialisar mais". Subir
    `Qb`/`Qd` ou trocar a estratégia? → *Gabarito robusto:* a remoção de β2 (média, S≈0,7 só em high-flux) é
    **convectiva** e dependente da **membrana high-flux** — subir `Qb`/`Qd` melhora a **difusão** (ureia),
    quase nada a β2. Trocar para **membrana high-flux com componente convectivo** (e dialisato ultrapuro p/
    evitar backfiltration) é o mecanismo certo. *Distrator "mais tempo":* ajuda a difusão de soluto pequeno,
    pouco move a média sem o poro grande. *Distrator "mais `Qb`":* sem a membrana adequada, esbarra no `KoA` e
    no S baixo.

---

### Bloco VII · Hemodiálise intermitente (HDI)

### M22 · A sessão de HDI — gradientes, eficiência × tempo; por que "intermitente" tem custo

**Tese & inversão.** A HDI é eficiente **porque** é breve e intensa — e isso é também o seu custo. Concentra a
remoção de soluto e de volume em 3–4 h, com gradientes altíssimos; o corpo, porém, não se reequilibra na mesma
velocidade. A "limpeza" do sangue não é a limpeza do **corpo**: o intersticial e o intracelular ficam para
trás. O número de pós-sessão é uma sombra do plasma, não do organismo. Pensar em compartimentos, não em "sair
limpo".

**Erro → verdade.** *Erro:* "ureia caiu 75%, paciente está limpo." *Verdade:* a queda é do **compartimento
sangue**; o pico de remoção esgota o gradiente plasmático rápido, mas a ureia dos tecidos ainda **reflui**
(rebote) após a sessão. Eficiência alta em pouco tempo cria **desequilíbrio entre compartimentos** — a origem
da síndrome de desequilíbrio (M34) e do rebote (M26).

**Engine `model22.js`.**
- **Fórmula-mãe:** decaimento de soluto durante a sessão `C(t) = C0 · e^(−K·t/V)` (compartimento sangue),
  com a remoção total `= ∫ K·(C_b − C_d) dt`; eficiência instantânea cai à medida que `C_b` cai (o gradiente
  encolhe). Tempo `t` (min) e clearance `K` (mL·min⁻¹) entram como o produto `K·t`.
- **Entradas (estado):** `C0` (mmol·L⁻¹, ureia inicial), `K` (mL·min⁻¹), `t` (min), `V` (L, volume de
  distribuição da ureia ≈ TBW), `Qb`/`Qd` (resumidos em `K`).
- **Saídas:** `C_final` plasmático, **URR** (%), `Kt/V` (single-pool), curva `C(t)`, "eficiência marginal" por
  minuto (queda por minuto, decrescente).
- **Alavancas de mecanismo:** `t↑→` mais remoção, mas **com rendimento decrescente** (gradiente cai →
  exponencial achata); `K↑→` queda mais rápida no início; `V↑→` mesma dose remove fração menor (Kt/**V**);
  intensidade alta concentra a remoção cedo (desequilíbrio↑).
- **Invariantes a testar (§6):** `C(t)` monótona decrescente, convexa (exponencial); `URR ∈ [0,100]%`;
  `Kt/V > 0`; `URR` e `Kt/V` ligados (`Kt/V ≈ −ln(1−URR)` aprox., tol coerente); dobrar `t` **não** dobra a
  remoção (rendimento decrescente — segunda diferença < 0); `V↑→Kt/V↓` p/ mesmo `K·t`. Fuzz ≥ 5000 sem `NaN`/∞.

**Pérolas (prováveis pelo motor).**
1. **Eficiência se autoexaure:** os primeiros minutos removem muito (gradiente máximo), os últimos quase nada —
   o motor mostra a curva achatando; "mais tempo" rende cada vez menos por minuto.
2. **Limpar o sangue ≠ limpar o corpo:** o single-pool superestima a depuração real — o tecido não acompanha,
   e o que parece removido volta (rebote, M26). O número pós-sessão é otimista.
3. **Intensidade tem preço:** a mesma dose entregue mais rápido (K alto, t curto) gera gradiente
   intercompartimental maior → mais risco de desequilíbrio/hipotensão; mais lento e mais longo é mais gentil.

**Instrumento vivo.** Curva **`C(t)` da sessão** ao vivo: a exponencial de queda da ureia, com `URR` e `Kt/V`
computados no canto e atualizados ao mover `K`, `t`, `V`. Uma barra de **"remoção por minuto"** mostra a
eficiência marginal despencar ao longo da sessão — o aluno vê o rendimento decrescente em tempo real.

**Ilustração SVG.** Dois compartimentos inline (sangue × tecido) com a ureia como pontos: a sessão drena o
sangue rápido (pontos somem), o tecido drena devagar (setas lentas de refluxo). Sparkline de `C(t)` computada;
barra de URR preenchendo. O gap entre os dois compartimentos (computado) prenuncia o rebote.

**Fármaco / prescrição encadeada.** Prescrição de sessão com unidades: alvo `Kt/V ≥ 1,2` por sessão / `URR ≥
65%` (educacional); `t` típico 240 min, `K` resultante de `Qb`/`Qd`/membrana. O motor entrega o `Kt/V` a partir
de `K·t/V` — "dose por mecanismo", não tabela. Disclaimer presente.

**Caso (5 atos).** (1) Sessão encurtada de 4 h para 2,5 h por agenda; `Qb` aumentado p/ "compensar".
(2) *Prever:* compensou? (3) *Revelar:* o tempo curto cortou a remoção dos compartimentos lentos e ampliou o
gradiente intercompartimental — Kt/V plasmático "ok", mas rebote maior e mais sintomas. (4) Conduta: privilegiar
**tempo** sobre intensidade quando há instabilidade; intensidade não substitui duração. (5) Síntese:
intermitente cobra o preço de comprimir o tempo.

**Pontes.** M21 (`K` vem da membrana/fluxos), M25 (Kt/V e URR como dose-alvo), M26 (a cinética que explica o
rebote), M34 (desequilíbrio dialítico — o custo da intensidade), M27 (a alternativa contínua que dilui o tempo).

**Avaliação — sementes + gabarito.**
- **Socrática (passos-chave).**
  - *Q:* Por que os últimos 30 min de uma sessão removem menos que os primeiros 30? → *A:* o gradiente
    `C_b − C_d` caiu — a difusão é proporcional a ele; remoção é exponencial, não linear no tempo.
  - *Q:* O Kt/V plasmático ficou ótimo mas o paciente está urêmico de novo amanhã; o que o número não viu? →
    *A:* o single-pool mede só o **sangue**; o tecido não foi depurado na mesma medida e a ureia **reflui** —
    o rebote (M26) desfaz parte da queda aparente.
- **Revisão (teórica).**
  - *Q:* Por que "intermitente" é menos fisiológico que o rim contínuo? → *Gabarito:* o rim trabalha 24 h com
    gradientes baixos e estáveis; a HDI comprime a remoção em horas com gradientes altos → oscilações de
    volume/osmolalidade que o corpo não amortece (hipotensão, desequilíbrio).
  - *Q:* Defina URR e relacione com Kt/V. → *Gabarito:* `URR = (1 − C_final/C0)·100%`; `Kt/V ≈ −ln(1−URR)`
    (single-pool, sem gerar/UF) — duas medidas da mesma queda fracionária de ureia.
- **Chave de ouro (integradora).**
  - *Q:* Para um paciente hemodinamicamente instável que precisa da mesma dose de diálise, você aumenta a
    **intensidade** (K alto, tempo curto) ou prolonga o **tempo** (K menor, tempo longo)? → *Gabarito robusto:*
    **prolongar o tempo** com menor intensidade: a mesma `K·t` removida devagar gera gradientes
    intercompartimentais menores → menos hipotensão e desequilíbrio; é o racional que leva a SLED/TRRC (M27,
    M31). *Distrator "mais intenso compensa":* entrega Kt/V plasmático igual, mas concentra o estresse osmótico
    e de volume — pior tolerância. A dose é a mesma; o **mecanismo do tempo** é o que protege.

---

### M23 · Ultrafiltração e o balanço de volume — peso seco, taxa de UF, refilling plasmático

**Tese & inversão.** Tirar volume na diálise não é tirar do sangue: é tirar do **plasma**, na esperança de que
o intersticial **reabasteça** (refilling) o plasma na mesma velocidade. A taxa de UF que o paciente tolera é
governada pela velocidade de refilling, não pela meta de peso. Ultrafiltrar rápido demais esvazia o plasma
antes do interstício repor → hipotensão. O "peso seco" é um alvo, mas a **taxa** é o mecanismo.

**Erro → verdade.** *Erro:* "ele ganhou 4 kg, tire 4 kg em 4 h." *Verdade:* o que importa é a **taxa de UF**
relativa ao refilling — `mL·kg⁻¹·h⁻¹`. Acima de ~10–13 mL·kg⁻¹·h⁻¹ (educacional), a UF supera o refilling e o
volume plasmático despenca, mesmo com muito líquido ainda no interstício. O total a tirar é uma coisa; a
**velocidade** é outra — e é a velocidade que derruba a pressão.

**Engine `model23.js`.**
- **Fórmula-mãe:** `ΔPV/Δt = −UF_rate + Refill_rate`, com `Refill_rate = k_refill · (V_interstício − V_eq)`
  (proporcional ao excesso intersticial); volume plasmático relativo `PV%(t)` integrado ao longo da sessão;
  `UF_rate_norm = UF_total/(peso · t)` em mL·kg⁻¹·h⁻¹.
- **Entradas (estado):** `UF_total` (mL = peso atual − peso seco), `t` (h), `peso` (kg), `k_refill`
  (constante de refilling, ∝ hidratação intersticial/oncótica), `V_intersticial0` (excesso inicial).
- **Saídas:** `UF_rate` (mL·h⁻¹), `UF_rate_norm` (mL·kg⁻¹·h⁻¹), `PV%` ao longo do tempo (queda do volume
  plasmático), nadir de `PV%`, flag (UF > refilling → zona de hipotensão).
- **Alavancas de mecanismo:** `UF_rate↑→` queda de `PV%`↑ (se exceder refilling); `t↑→UF_rate↓` (mesmo total,
  mais gentil); `k_refill↑→` plasma reabastece e tolera UF maior; chegar perto do peso seco esvazia o
  interstício → refilling↓ → as últimas alíquotas são as mais perigosas.
- **Invariantes a testar (§6):** `UF_rate = UF_total/t` (identidade, tol 1e-7); `UF_rate_norm =
  UF_rate/peso`; `PV%` decrescente quando `UF_rate > Refill_rate`, estável quando iguais;
  prolongar `t` reduz o nadir de `PV%` (mais gentil); `k_refill↑→` nadir menos profundo. Fuzz ≥ 5000 sem
  `NaN`/∞; UF=0 → `PV%` constante.

**Pérolas (prováveis pelo motor).**
1. **A taxa mata, não o total:** 3 L em 4 h pode ser tranquilo e 3 L em 2 h pode colapsar a pressão — mesmo
   total, taxas diferentes, nadir de `PV%` diferente. O motor separa total de velocidade.
2. **O fim da sessão é o mais perigoso:** perto do peso seco o interstício esvaziou → `k_refill` efetivo cai →
   a mesma `UF_rate` agora derruba o plasma. O motor mostra o nadir migrando para o fim.
3. **Refilling é oncótico:** hipoalbuminemia → menos pressão oncótica → refilling lento → intolerância à UF
   mesmo com sobrecarga franca. O número da balança não prevê a tolerância; o `k_refill` prevê.

**Instrumento vivo.** Gráfico **`PV%` × tempo** ao vivo: a UF puxa o plasma para baixo, o refilling o sustenta;
mover `UF_rate`/`t`/`k_refill` redesenha a curva e mostra o **nadir** e se cruza a linha vermelha de hipotensão.
Um mostrador de `UF_rate_norm` em mL·kg⁻¹·h⁻¹ muda de cor ao passar do limiar de segurança.

**Ilustração SVG.** Três compartimentos inline (intersticial → plasma → máquina): seta de **UF** saindo do
plasma (largura ∝ `UF_rate`) e seta de **refilling** entrando do interstício (largura ∝ `Refill_rate`). Quando
UF > refilling, o reservatório "plasma" esvazia visivelmente (nível computado). Barra de `UF_rate_norm` com
faixa segura/perigo.

**Fármaco / prescrição encadeada.** Prescrição de UF com unidades, por mecanismo: `UF_total` (mL) = peso − peso
seco; `UF_rate` (mL·h⁻¹) = total/tempo; **limiar educacional** ~10–13 mL·kg⁻¹·h⁻¹ acima do qual o refilling não
acompanha. Conduta computada: se o normalizado passa o limiar, o motor sugere **prolongar o tempo** ou **UF
isolada/sequencial**, não "tirar mais rápido". Disclaimer presente.

**Caso (5 atos).** (1) Ganho interdialítico de 4,5 kg; prescreve-se tirar tudo em 3 h. (2) *Prever:* tolera?
(3) *Revelar:* `UF_rate_norm` ≈ 20 mL·kg⁻¹·h⁻¹ — muito acima do refilling; o plasma despenca, hipotensão no
3º hora. (4) Conduta: estender para 4–5 h, ou UF sequencial, reduzindo `UF_rate_norm`; reavaliar o peso seco e
o ganho interdialítico (sal/água). (5) Síntese: o volume a tirar era real; a **velocidade** foi o erro.

**Pontes.** Choca M4/M5 (Guyton; responsivo≠tolerante — o plasma esvaziado é pré-carga caindo) e M25 de Choca
(ressuscitação volêmica é o inverso da UF), M24 (a hipotensão que a UF rápida gera), M37 (síndrome cardiorrenal:
diurético × UF no balanço de volume), M9/M10 (volume e água — o que se está removendo).

**Avaliação — sementes + gabarito.**
- **Socrática (passos-chave).**
  - *Q:* De onde a UF tira água diretamente, e de onde ela **precisa** que venha? → *A:* tira do **plasma**;
    precisa que o **interstício** reabasteça (refilling) na mesma taxa, senão o volume plasmático cai.
  - *Q:* Por que as últimas alíquotas perto do peso seco são as mais arriscadas? → *A:* o interstício já
    esvaziou → o refilling efetivo cai → a mesma `UF_rate` agora derruba o plasma (nadir no fim).
- **Revisão (teórica).**
  - *Q:* Por que a `UF_rate` se normaliza por peso (mL·kg⁻¹·h⁻¹)? → *Gabarito:* a tolerância depende do volume
    plasmático, que escala com o tamanho do paciente; normalizar permite um limiar comparável (~10–13
    mL·kg⁻¹·h⁻¹, educacional) acima do qual a UF supera o refilling.
  - *Q:* Por que hipoalbuminemia piora a tolerância à UF? → *Gabarito:* menos pressão oncótica plasmática →
    refilling intersticial→plasma mais lento → o plasma esvazia mesmo com sobrecarga; o `k_refill` cai.
- **Chave de ouro (integradora).**
  - *Q:* Paciente com 5 kg de sobrecarga, hipoalbuminêmico, instável. Tirar os 5 kg numa sessão de 4 h?
    → *Gabarito robusto:* **não** numa única sessão rápida — `UF_rate_norm` seria alto e o **refilling lento**
    (albumina baixa) não acompanharia → hipotensão e stunning (M24). Mecanismo: fracionar a UF em mais sessões/
    prolongar o tempo, manter `UF_rate_norm` na faixa segura; tratar a causa do ganho (sal/água). *Distrator
    "dar albumina e tirar tudo":* corrige parcialmente o oncótico, mas não justifica taxa alta; *distrator
    "tirar rápido e repor soro se cair":* repor o que se está tentando remover é contraproducente. A velocidade
    é a variável de segurança.

---

### M24 · Hipotensão intradialítica — UF > refilling, stunning miocárdico, tolerância

**Tese & inversão.** A queda de pressão na diálise é, na maioria, **hipovolemia aguda induzida**: a UF esvaziou
o plasma mais rápido que o refilling. Mas há uma segunda mão, traiçoeira: a própria isquemia da UF rápida causa
**stunning miocárdico** — o coração, momentaneamente atordoado, perde força e fecha o ciclo
hipotensão→isquemia→pior contração. A pressão que cai é a sombra; a causa é o **descompasso volume × bomba**.
Decompor: é pré-carga (volume) ou é bomba (stunning)?

**Erro → verdade.** *Erro:* "caiu a pressão, infunda soro e siga." *Verdade:* repor volume desfaz a UF — às
vezes necessário, mas é tratar o sintoma; a correção mecanística é **baixar a `UF_rate`** (devolver tempo ao
refilling) e proteger o miocárdio. E a hipotensão repetida **acumula dano**: o stunning vira fibrose, a
tolerância cai a cada sessão. Não é só o episódio — é o ciclo.

**Engine `model24.js`.**
- **Fórmula-mãe:** `PAM ≈ DC · RVS` (herda Choca), com `DC = FC · VS` e `VS` caindo com `PV%` (pré-carga) **e**
  com o **stunning** (`contratilidade = f(isquemia acumulada)`); `PV%` vem do balanço UF×refilling (M23).
  Loop: UF↑→PV%↓→VS↓→PAM↓→perfusão coronária↓→stunning↑→VS↓ (amortecido, §6).
- **Entradas (estado):** `UF_rate` (mL·h⁻¹), `k_refill`, `RVS` (tônus; resposta autonômica), `FC`, reserva
  contrátil basal, `tempo_sessão`, `temperatura_dialisato` (proxy de vasoconstrição/tolerância).
- **Saídas:** `PV%`, `VS`, `DC`, `PAM` (mmHg) ao longo da sessão, índice de **stunning** (queda de
  contratilidade), flag (hipotensão por pré-carga × por bomba × mista).
- **Alavancas de mecanismo:** `UF_rate↑→PV%↓→PAM↓`; `RVS↓` (autonomia ruim, neuropatia, comida na sessão →
  vasodilatação esplâncnica) → PAM↓; dialisato frio → `RVS↑` → mais tolerância; stunning acumula a cada
  episódio (reserva↓).
- **Invariantes a testar (§6):** `PAM = DC·RVS` (identidade, tol 1e-7); `PAM↓` monótona com `UF_rate↑` (além
  do refilling); dialisato frio (`RVS↑`) eleva a PAM no nadir; reduzir `UF_rate` eleva o nadir de PAM;
  stunning monótono com episódios de hipoperfusão. Fuzz ≥ 5000 sem `NaN`/∞; loop converge (amortecido).

**Pérolas (prováveis pelo motor).**
1. **Soro trata o sintoma, taxa trata a causa:** infundir volume sobe a PAM mas desfaz a UF (o paciente sai
   ainda congesto); baixar a `UF_rate` sobe o nadir **sem** repor o volume — o motor mostra os dois caminhos.
2. **O frio é vasopressor de graça:** dialisato a 35–35,5 °C ↑ RVS e protege a PAM sem custo de volume — uma
   alavanca de `RVS`, não de pré-carga. O motor separa as duas.
3. **A hipotensão se alimenta:** cada episódio atordoa o miocárdio → reserva contrátil cai → a próxima queda
   vem mais fácil. Tolerância não é fixa: é consumida pelo próprio ciclo (ponte com o choque cardiogênico).

**Instrumento vivo.** Painel **`PAM` × tempo de sessão** com decomposição `PAM = DC × RVS` ao vivo: ao subir a
`UF_rate`, `PV%` e `VS` caem e a PAM mergulha; o aluno testa as três condutas (↓UF, dialisato frio, soro) e vê
qual sobe a PAM **por qual mecanismo**. Um medidor de **stunning** acumula a cada episódio simulado.

**Ilustração SVG.** Coração + reservatório de plasma inline: o plasma esvazia (UF), o VS encolhe (pré-carga
baixa), o miocárdio "pisca" atordoado (stunning) com contratilidade computada. Setas de RVS (vasoconstrição
pelo frio) estreitando os vasos. Barra `PAM = DC × RVS` decomposta nos três fatores.

**Fármaco / prescrição encadeada.** Conduta por mecanismo, com unidades: reduzir `UF_rate` (mL·h⁻¹) abaixo do
limiar de refilling; **dialisato frio** 35–35,5 °C (mecanismo: ↑RVS); reavaliar **peso seco** (talvez alto
demais é o erro oposto, mas aqui baixo demais); evitar refeição intradialítica (vasodilatação esplâncnica). Bolus
de salina só como resgate sintomático, nomeado como tal. Educacional; disclaimer presente.

**Caso (5 atos).** (1) Paciente hipotenso na 3ª hora toda sessão; protocolo é "bolus de soro e continuar".
(2) *Prever:* hipovolemia simples? (3) *Revelar:* `UF_rate_norm` alto + dialisato quente + refeição na sessão;
e ecocardio mostra **stunning** segmentar nos episódios. (4) Conduta: baixar `UF_rate` (estender tempo),
dialisato frio, suspender refeição; reavaliar peso seco — o soro era só band-aid. (5) Síntese: a PAM caiu por
volume **e** por bomba; tratar a taxa quebra o ciclo.

**Pontes.** **Choca M16** (choque cardiogênico — a bomba que falha; o stunning é cardiogênico transitório),
**Choca M14/M25** (hipovolêmico e ressuscitação volêmica — a UF é hipovolemia iatrogênica controlada),
**Choca M28** (vasopressores/inotrópicos — aqui o "vasopressor" é o frio do dialisato), M23 (a UF×refilling que
gera o nadir), M37 (cardiorrenal — coração e volume na falência mútua).

**Avaliação — sementes + gabarito.**
- **Socrática (passos-chave).**
  - *Q:* `PAM = DC × RVS`. Na hipotensão intradialítica clássica, qual termo caiu primeiro e por quê? → *A:* o
    **DC**, via **VS** — a UF esvaziou o plasma (pré-carga↓) mais rápido que o refilling. RVS pode até subir
    compensatória; se a autonomia falha, cai também.
  - *Q:* Por que dar soro "resolve" mas é a conduta errada como rotina? → *A:* repõe a pré-carga e sobe a PAM,
    mas **desfaz a UF** — o paciente sai congesto; a causa (taxa de UF > refilling) fica intocada.
- **Revisão (teórica).**
  - *Q:* O que é stunning miocárdico na diálise e por que importa entre sessões? → *Gabarito:* atordoamento
    isquêmico transitório do miocárdio pela hipoperfusão da UF; repetido, acumula fibrose e **reduz a reserva
    contrátil** → menos tolerância a cada sessão. É dano cumulativo, não só o episódio.
  - *Q:* Por que dialisato mais frio melhora a tolerância? → *Gabarito:* ↑ tônus simpático/RVS (vasoconstrição)
    → sustenta a PAM sem repor volume; é uma alavanca de **RVS**, complementar a baixar a UF (alavanca de
    pré-carga).
- **Chave de ouro (integradora).**
  - *Q:* Paciente com hipotensão intradialítica recorrente apesar de "peso seco correto". Liste a sequência de
    condutas por mecanismo e diga o que NÃO fazer. → *Gabarito robusto:* (1) **baixar a `UF_rate`** estendendo
    o tempo (devolve refilling — ataca a causa); (2) **dialisato frio** (↑RVS); (3) suspender refeição
    intradialítica (evita vasodilatação esplâncnica); (4) reavaliar peso seco e ganho interdialítico. **Não
    fazer:** transformar bolus de soro em rotina (desfaz a UF, perpetua a congestão) nem subir a intensidade p/
    "terminar logo" (piora o nadir e o stunning). Ponte com Choca: é hipovolemia iatrogênica + componente
    cardiogênico (stunning) — tratar pré-carga e bomba, não mascarar a PAM.

---

### M25 · Dose e adequação — Kt/V, URR, clearance; a prescrição de dose por mecanismo

**Tese & inversão.** A "dose" de diálise não é horas nem sessões: é **`Kt/V`** — clearance (`K`) × tempo (`t`)
sobre o volume de distribuição (`V`). O alvo é uma fração de depuração, não um relógio. Prescrever dose é
escolher os termos que produzem o `Kt/V`-alvo: `K` (via `Qb`, `Qd`, membrana/`KoA`), `t` (tempo) e respeitar o
`V` (que é do paciente). O número final é a sombra; os três termos são a prescrição.

**Erro → verdade.** *Erro:* "3 sessões por semana já é a dose." *Verdade:* frequência ≠ dose; a dose é `Kt/V`
**por sessão** (alvo ~1,2–1,4 single-pool, educacional) e `stdKt/V` semanal. Um `V` grande (paciente grande)
**dilui** a mesma `K·t` → precisa de mais `K·t` para o mesmo `Kt/V`. E o `Kt/V` **entregue** difere do prescrito
por recirculação (M20), rebote (M26) e tempo real efetivo.

**Engine `model25.js`.**
- **Fórmula-mãe:** `Kt/V = K · t / V`; `URR = 1 − e^(−Kt/V)` (aprox. single-pool sem UF/geração); versão com UF
  e geração (Daugirdas 2ª geração) como correção; `stdKt/V` semanal a partir de `Kt/V` × frequência.
- **Entradas (estado):** `K` (mL·min⁻¹, do dialisador/fluxos), `t` (min), `V` (L ≈ TBW), `freq` (sessões/sem),
  `UF` (L removida), `geração_ureia` (proxy de catabolismo).
- **Saídas:** `Kt/V` (single-pool), `eKt/V` (equilibrado, desconta rebote — ponte M26), `URR` (%),
  `stdKt/V` semanal, e a **decomposição** de qual termo está limitando o alvo.
- **Alavancas de mecanismo:** `K↑` (mais `Qb`/`Qd`/`KoA`) → Kt/V↑ (até o teto do `KoA`, M21); `t↑→`Kt/V↑
  (linear, sem teto de membrana — por isso tempo "ganha" quando o fluxo já saturou); `V↑→`Kt/V↓ (mesma `K·t`
  rende menos); `freq↑→stdKt/V↑` e rebote menor.
- **Invariantes a testar (§6):** `Kt/V = K·t/V` (identidade, tol 1e-7); `URR = 1 − e^(−Kt/V)`
  (consistência); `eKt/V ≤ Kt/V` (rebote sempre desconta); `Kt/V↑` monótono em `K` e `t`, ↓ em `V`;
  `stdKt/V` ↑ com `freq`. Fuzz ≥ 5000 sem `NaN`/∞.

**Pérolas (prováveis pelo motor).**
1. **Quando o `KoA` saturou, só o tempo paga:** perto do teto da membrana, subir `K` não move o `Kt/V`, mas
   subir `t` move (linear). O motor mostra `t` como a alavanca sem teto.
2. **O `V` é um divisor escondido:** dois pacientes, mesma máquina e tempo, Kt/V diferentes porque um é maior
   (V maior dilui a dose). A dose adequada é **personalizada pelo `V`**, não universal.
3. **O entregue < o prescrito:** recirculação (M20) e rebote (M26) fazem o `eKt/V` cair abaixo do `Kt/V` do
   papel — prescrever no limite do alvo entrega abaixo do alvo. Há que prescrever com margem.

**Instrumento vivo.** Painel de **prescrição**: sliders `K` (via Qb/Qd/membrana), `t`, e `V` fixo do paciente;
o `Kt/V`, `URR`, `eKt/V` e `stdKt/V` computados ao vivo, com uma **linha de alvo** (1,2–1,4) que acende verde/
vermelho. O aluno vê o `K` saturar (teto do KoA) e o `t` continuar subindo o Kt/V — a lição do M22/M21 em forma
de dose.

**Ilustração SVG.** Equação `Kt/V` viva inline: três blocos (`K`, `t`, `V`) cujo tamanho é o valor; o produto
`K·t` como área, dividido pelo `V` como caixa. Barra de `URR` preenchendo conforme `Kt/V`. Marca do alvo e do
**entregue** (com o desconto do rebote) lado a lado, computados.

**Fármaco / prescrição encadeada.** **A prescrição é o conteúdo.** Com unidades e mecanismo: alvo single-pool
`Kt/V ≥ 1,2` (ou `URR ≥ 65%`), `stdKt/V` semanal ≥ 2,1 (educacional); `Qb` 300–400 mL·min⁻¹ e `Qd` ~500
mL·min⁻¹ definem `K`; `t` ~240 min/sessão, `freq` 3×/sem. O motor entrega o `Kt/V` resultante e sugere **qual
termo mover** para atingir o alvo (subir `t` se o `K` saturou). Educacional; disclaimer presente.

**Caso (5 atos).** (1) Paciente grande (V alto) entrega `Kt/V` 0,9 apesar de fluxos máximos. (2) *Prever:*
máquina com defeito? (3) *Revelar:* o `K` já está no teto do `KoA` e o `V` grande dilui a dose — o `K·t` é
insuficiente para aquele `V`. (4) Conduta: **prolongar o tempo** (alavanca sem teto) ou aumentar a **frequência**
/ trocar p/ membrana de `KoA` maior — não insistir em `Qb`. (5) Síntese: a dose é `Kt/V`; o `V` do paciente
mandou subir o `t`.

**Pontes.** M21 (o `KoA` que põe teto no `K`), M22 (a sessão e o URR), M26 (o rebote que separa `eKt/V` de
`Kt/V`), M28 (dose na TRRC é efluente mL·kg⁻¹·h⁻¹, outra métrica de dose), M20 (recirculação que reduz o
entregue).

**Avaliação — sementes + gabarito.**
- **Socrática (passos-chave).**
  - *Q:* O `Kt/V` veio baixo e o `K` já está no teto do `KoA`. Que termo ainda move o `Kt/V`? → *A:* o **tempo
    (`t`)** — entra linearmente e não tem teto de membrana; (ou aumentar `freq`/trocar a membrana). Subir `Qb`
    não rende mais.
  - *Q:* Por que dois pacientes na mesma máquina/tempo têm `Kt/V` diferentes? → *A:* o **`V`** (volume de
    distribuição ≈ TBW) é o divisor — o maior dilui a mesma `K·t`; a dose adequada é personalizada pelo `V`.
- **Revisão (teórica).**
  - *Q:* Defina `Kt/V` e diga por que é "dose" e não "tempo". → *Gabarito:* `K·t/V` = fração do volume de
    distribuição depurada; integra clearance **e** tempo **e** tamanho do paciente — o relógio sozinho ignora
    `K` e `V`.
  - *Q:* Por que o `eKt/V` (equilibrado) é menor que o single-pool? → *Gabarito:* desconta o **rebote**
    pós-diálise (a ureia que reflui dos tecidos, M26); o single-pool mede o plasma no fim, otimista.
- **Chave de ouro (integradora).**
  - *Q:* Prescreva, por mecanismo, a dose para um paciente de `V` grande que vinha sub-dialisado, sabendo que o
    `Qb` máximo do acesso já está atingido. → *Gabarito robusto:* como o `K` está limitado (acesso + teto do
    `KoA`), a alavanca é o **tempo** (estender `t`) e/ou a **frequência** (mais sessões → `stdKt/V`↑ e menos
    rebote), e considerar membrana de **`KoA` maior**. Alvo `Kt/V` ≥ 1,2/sessão computado pelo motor, prescrito
    **com margem** para o entregue < prescrito (recirculação/rebote). *Distrator "subir `Qb`":* o acesso e o
    `KoA` já saturaram — não move o Kt/V. *Distrator "mais frequência só":* ajuda, mas se o `V` é grande e o
    tempo curto, cada sessão ainda fica curta — combinar tempo + frequência.

---

### M26 · Cinética da ureia — compartimento único × duplo, rebote pós-diálise; o tempo importa

**Tese & inversão.** A ureia não vive só no sangue: ela ocupa **toda a água corporal**, mas a máquina só
acessa o sangue **diretamente**. O modelo de **compartimento único** finge que o corpo é um balde homogêneo; o
de **duplo compartimento** reconhece que o tecido entrega ureia ao sangue com atraso. Por isso, ao fim da
sessão, a ureia plasmática **sobe de novo** (rebote): o tecido, que ficou para trás, reequilibra. O `Kt/V` do
fim da sessão é uma sombra otimista; o `eKt/V` (30–60 min depois) é a verdade.

**Erro → verdade.** *Erro:* "meço a ureia ao desligar a máquina e tenho a dose." *Verdade:* a ureia medida no
desligamento é o **nadir plasmático**; minutos depois o rebote a eleva 10–20% (educacional) porque o
compartimento lento devolve soluto. Medir cedo demais **superestima** a dose entregue. O **tempo** entre o fim
da sessão e a coleta importa — e a intensidade da sessão amplia o rebote.

**Engine `model26.js`.**
- **Fórmula-mãe:** dois compartimentos com troca intercompartimental `k_c`: durante a sessão a máquina drena o
  compartimento sangue (`dC1/dt = −K·C1/V1 + k_c·(C2−C1)`), o tecido (`dC2/dt = k_c·(C1−C2)`); **pós-sessão**
  (`K=0`) os dois reequilibram → `C1` sobe (rebote). `eKt/V` calculado da ureia reequilibrada.
- **Entradas (estado):** `C0`, `K` (mL·min⁻¹), `t` (min), `V1`/`V2` (compartimentos), `k_c` (taxa de troca
  intercompartimental), `tempo_coleta_pós` (min).
- **Saídas:** curva `C1(t)` durante e após a sessão, **nadir** plasmático, `C1` reequilibrada, **rebote** (%),
  `spKt/V` × `eKt/V`, "tempo para reequilíbrio".
- **Alavancas de mecanismo:** `K↑`/`t↓` (sessão intensa) → gradiente sangue↔tecido maior → **rebote maior**;
  `k_c↑` (boa perfusão tecidual) → rebote rápido e menor descompasso; coletar a ureia cedo → superestima a dose;
  sessão lenta/longa (TRRC, M27) → quase sem rebote.
- **Invariantes a testar (§6):** conservação de massa de ureia (entra geração, sai clearance; tol 1e-7);
  `C1` rebota para cima após `K=0` quando `C2 > C1` (sempre, se houve descompasso); `eKt/V ≤ spKt/V`;
  rebote↑ com intensidade (`K·t` concentrado); rebote→0 quando sessão muito lenta (`k_c·t` grande). Fuzz ≥ 5000
  sem `NaN`/∞.

**Pérolas (prováveis pelo motor).**
1. **O rebote pune a pressa:** quanto mais intensa a sessão (K alto, t curto), maior o gradiente sangue↔tecido
   no fim → maior o rebote → maior a diferença entre `spKt/V` (otimista) e `eKt/V` (real). A pressa cobra.
2. **Coletar cedo mente:** a mesma sessão "rende" um `Kt/V` maior se a ureia for coletada no desligamento que
   30 min depois — o motor mostra os dois números e o erro de medir no nadir.
3. **O contínuo quase não rebota:** TRRC/diálise lenta mantém sangue e tecido quase em equilíbrio o tempo todo
   → o `eKt/V ≈ spKt/V`; é o single-pool que falha quando a remoção é rápida, não a cinética.

**Instrumento vivo.** Curva **ureia × tempo** que continua **após** o fim da sessão: a queda durante a diálise,
o nadir no desligamento, e o **rebote** subindo nos 30–60 min seguintes. Mover `K`/`t`/`k_c` muda a profundidade
do nadir e a altura do rebote; o `spKt/V` (no nadir) e o `eKt/V` (no platô reequilibrado) aparecem lado a lado,
computados.

**Ilustração SVG.** Dois reservatórios inline (sangue `V1` pequeno, tecido `V2` grande) ligados por um cano
estreito (`k_c`): durante a sessão o sangue esvazia rápido e fica abaixo do tecido; ao desligar, o tecido
"escorre" de volta pelo cano e reenche o sangue (rebote). Níveis e seta de refluxo computados; sparkline de
`C1(t)` com a marca do nadir e do reequilíbrio.

**Fármaco / prescrição encadeada.** Implicação prática com unidades: **coletar a ureia pós-diálise no momento
certo** — método "slow-flow/stop" ou esperar ~30 min — para medir o `eKt/V` real, não o nadir. Prescrição que
reconhece o rebote: mirar `eKt/V` (não só `spKt/V`) e preferir **mais tempo/frequência** quando o rebote é alto.
Educacional; disclaimer presente.

**Caso (5 atos).** (1) Laboratório colhe a ureia "ao desligar a máquina"; `spKt/V` 1,4, mas o paciente está
urêmico. (2) *Prever:* erro de laboratório? (3) *Revelar:* a coleta foi no **nadir**; o `eKt/V` real
(reequilibrado) era 1,1 — o rebote de uma sessão intensa enganou a medida. (4) Conduta: padronizar a coleta
pós-rebote; mirar `eKt/V`; considerar sessões um pouco mais longas (menos rebote). (5) Síntese: a dose real é a
reequilibrada; medir no nadir é medir a sombra.

**Pontes.** M22 (a eficiência da sessão e o desequilíbrio que o rebote materializa), M25 (`spKt/V` × `eKt/V` na
dose entregue), M34 (síndrome de desequilíbrio — o mesmo descompasso intercompartimental, mas osmótico, no
cérebro), M27 (TRRC quase sem rebote — o contínuo como solução cinética).

**Avaliação — sementes + gabarito.**
- **Socrática (passos-chave).**
  - *Q:* Por que a ureia plasmática **sobe** depois que a máquina desliga? → *A:* durante a sessão o sangue foi
    depurado mais rápido que o tecido conseguiu repor; com `K=0`, o tecido (compartimento lento) devolve ureia
    ao sangue → **rebote**.
  - *Q:* Em que situação o `eKt/V` ≈ `spKt/V` (quase sem rebote)? → *A:* quando a remoção é **lenta** (TRRC,
    sessão longa) — sangue e tecido ficam quase equilibrados o tempo todo; o single-pool só falha na pressa.
- **Revisão (teórica).**
  - *Q:* Diferencie compartimento único × duplo na cinética da ureia. → *Gabarito:* único = corpo homogêneo
    (ureia some uniformemente); duplo = sangue (acessível) + tecido (atraso via `k_c`); o duplo explica o
    rebote e o `eKt/V` < `spKt/V`.
  - *Q:* Por que sessões mais intensas têm rebote maior? → *Gabarito:* removem o sangue mais rápido que o `k_c`
    repõe → maior gradiente sangue↔tecido no fim → mais soluto reflui ao reequilibrar.
- **Chave de ouro (integradora).**
  - *Q:* Dois protocolos entregam o mesmo `spKt/V` 1,4: A = sessão curta e intensa; B = sessão longa e gentil.
    Qual entrega mais dose **real** e por quê? → *Gabarito robusto:* **B (longa/gentil)** entrega mais
    `eKt/V` — o rebote de A é maior (gradiente intercompartimental alto no fim), então seu `spKt/V` superestima
    mais a dose real; B mantém sangue≈tecido, rebote menor, `eKt/V ≈ spKt/V`. *Distrator "A, porque é mais
    eficiente":* eficiência plasmática alta é justamente o que gera o descompasso e o rebote — o número do
    nadir mente. Ponte: é o mesmo princípio do M22 (intensidade tem custo) e do M34 (descompasso = risco).

---

### Bloco VIII · Terapias contínuas e alternativas

### M27 · Terapias contínuas (TRRC/CRRT) — CVVH × CVVHD × CVVHDF

**Tese & inversão.** "Contínuo" não é só "mais devagar": é trocar **eficiência por estabilidade
hemodinâmica**. A mesma massa de soluto/volume removida em 24 h, em vez de 4 h, despenca a taxa instantânea de
remoção — e é a *taxa*, não a *dose total*, que derruba a pressão. A modalidade (convecção × difusão) escolhe
**qual soluto** sai melhor; o regime contínuo escolhe **a que ritmo** o meio interno volta. Decompor o "como
remove" antes de "quanto remove".

**Erro → verdade.** *Erro:* "TRRC é diálise para quem não pode ir à HDI — só mais lenta." *Verdade:* o ganho é
fisiológico — remoção lenta e constante respeita o **refilling plasmático** e evita o despencar de pressão da
sessão intermitente; e CVVH (convecção) × CVVHD (difusão) × CVVHDF (ambas) não são sinônimos: convecção arrasta
**moléculas médias** pelo solvente, difusão depura **pequenas** pelo gradiente.

**Engine `model27.js`.**
- **Fórmula-mãe:** clearance por mecanismo somado — `K_total = K_difusivo + K_convectivo`, com
  `K_difusivo ≈ Q_d · (gradiente efetivo)` saturando em `Q_b` para soluto pequeno, e
  `K_convectivo = Q_uf · S` (S = coeficiente de sieving da membrana, 0–1, ≈1 para moléculas pequenas, <1 para
  médias). Estabilidade modelada como taxa instantânea `ṁ = K · C / Δt`: para a mesma dose, `Δt↑` (contínuo) →
  `ṁ↓`.
- **Entradas (estado):** `modo` (CVVH/CVVHD/CVVHDF), `Q_b` (mL·min⁻¹, sangue), `Q_d` (mL·min⁻¹, dialisato),
  `Q_uf` (mL·min⁻¹, ultrafiltrado/efluente convectivo), `PM_soluto` (Da, proxy do sieving), `C` (concentração).
- **Saídas:** `K_difusivo`, `K_convectivo`, `K_total` (mL·min⁻¹), `clearance_pequena` × `clearance_media`,
  `ṁ_instantânea`, `flag` de regime (limitado por fluxo × limitado por membrana).
- **Alavanca de mecanismo:** ao subir `PM_soluto`, o `S` da difusão cai rápido e o da convecção devagar → o
  motor mostra a convecção **assumindo** a depuração de moléculas médias. Ao subir `Q_d`, sobe só a difusiva.
- **Invariantes a testar (§6):** `K_total ≥ max(K_difusivo, K_convectivo)`; difusão de molécula pequena ≥
  difusão de média (∂K_dif/∂PM < 0); convecção menos sensível ao PM que difusão (|∂K_conv/∂PM| < |∂K_dif/∂PM|);
  para dose total fixa, `ṁ` decrescente em `Δt` (a prova da estabilidade); `K_convectivo = 0` quando `Q_uf = 0`.

**Pérolas (prováveis pelo motor).**
1. **A estabilidade é matemática, não mágica:** a mesma remoção de 3 L em 24 h dá taxa instantânea ~8× menor
   que em 3 h — o motor mostra a queda de pressão estimada caindo junto.
2. **Convecção carrega o que a difusão deixa para trás:** subindo o PM do soluto, `K_difusivo` despenca e
   `K_convectivo` quase não se move — a CVVH ganha da CVVHD na molécula média.
3. **CVVHDF não é "o dobro":** difusão e convecção competem pela mesma membrana e sangue; o motor mostra o
   `K_total` somando **sublinearmente**, não 1+1.

**Instrumento vivo.** Painel **clearance × PM do soluto**: duas curvas (difusiva e convectiva) que se cruzam na
faixa das moléculas médias, redesenhadas ao vivo com `Q_b`/`Q_d`/`Q_uf`. Ao lado, o **taquímetro de
estabilidade**: a mesma dose total deslizando de 3 h → 24 h e a taxa instantânea (∝ risco de hipotensão)
despencando.

**Ilustração SVG.** Circuito esquemático inline: sangue (Q_b) entrando no dialisador; setas **contracorrente**
do dialisato (Q_d) para a difusão; seta transversal de **arraste por solvente** (Q_uf) para a convecção;
larguras das setas ∝ fluxo computado. Três cartões (CVVH / CVVHD / CVVHDF) acendendo o mecanismo ativo.

**Fármaco/prescrição encadeada.** *Prescrição por mecanismo (educacional):* a escolha de modalidade é uma
prescrição. CVVHD prioriza difusão (pequenas: ureia, K⁺); CVVH prioriza convecção (médias). Doses de fluxo
(`Q_b` ~150–250 mL·min⁻¹; `Q_d`/`Q_uf` em mL·kg⁻¹·h⁻¹) detalhadas no **M28**. Conteúdo educacional — a
prescrição final é do médico assistente.

**Caso (5 atos).** (1) Séptico, NA em alta dose, LRA oligúrica, lactato 6, instável. (2) *Prever:* HDI resolve
rápido? (3) *Revelar:* HDI removeria volume/soluto em 4 h → taxa instantânea alta → colapso de pressão sobre o
choque. (4) Conduta: **TRRC contínua** (estabilidade), modalidade conforme alvo (CVVHDF para cobrir pequenas +
médias). (5) Síntese: o que salvou foi o *ritmo*, não a *quantidade*.

**Pontes.** Choca M16/M20/M23 (choque cardiogênico/distributivo/misto — o paciente instável que pede o regime
contínuo). FILTRA M19 (os mecanismos físicos — difusão/convecção/UF), M22–M24 (HDI e a hipotensão
intradialítica que o contínuo evita), M28 (a dose contínua em mL·kg⁻¹·h⁻¹), M31 (SLED — o meio-termo).

**Avaliação — sementes + gabarito.**
- **Socrática (passos-chave).**
  - *Q:* Por que a TRRC é mais estável que a HDI se a dose total pode ser igual? → *A:* a estabilidade vem da
    **taxa instantânea**, não da dose: diluir a mesma remoção em 24 h respeita o refilling plasmático e não
    ultrapassa a velocidade de reabastecimento do plasma.
  - *Q:* Quero depurar uma molécula média — CVVH ou CVVHD? → *A:* **CVVH** (convecção): o arraste por solvente
    tem sieving alto para médias, enquanto a difusão depende do gradiente e cai com o PM.
- **Revisão (teórica).**
  - *Q:* Diferencie o mecanismo de remoção de soluto em CVVH e CVVHD. → *Gabarito:* CVVH = **convecção** (soluto
    arrastado pelo ultrafiltrado, `K = Q_uf · S`); CVVHD = **difusão** (soluto desce o gradiente para o
    dialisato, depende de `Q_d` e do gradiente). CVVHDF soma as duas, sublinearmente.
- **Chave de ouro (integradora).**
  - *Q:* Dois pacientes com a mesma LRA: um estável, um em choque. Por que o regime contínuo só "ganha" no
    segundo? Justifique pelo mecanismo. → *Gabarito robusto:* o ganho do contínuo é **hemodinâmico** (taxa
    instantânea baixa → não excede o refilling → não despenca a pressão); no estável, o refilling acompanha a
    HDI e a eficiência maior da intermitente é vantagem. *Distrator "TRRC depura melhor":* falso — por hora,
    depura *menos*; ganha em 24 h pela continuidade. *Distrator "é questão de custo":* o eixo é fisiológico, não
    logístico.

---

### M28 · Dose e fluidos na TRRC — efluente mL/kg/h, pré × pós-diluição

**Tese & inversão.** A "dose" da TRRC não é o tempo nem o fluxo de sangue: é o **efluente normalizado pelo
peso** (mL·kg⁻¹·h⁻¹). E a dose *prescrita* não é a dose *entregue* — interrupções e, sobretudo, a **pré-diluição**
(diluir o sangue *antes* do filtro) **derrubam o clearance efetivo** porque caem a concentração que chega à
membrana. Decompor "dose alvo" de "dose efetiva" antes de prescrever.

**Erro → verdade.** *Erro:* "subi o fluxo de sangue, logo dialisei mais." *Verdade:* o `Q_b` carrega o circuito,
mas a dose é o **efluente** (`Q_efluente / peso`); e a **pré-diluição**, embora proteja o filtro da coagulação,
**dilui o soluto** antes do dialisador → o clearance entregue cai por um fator de diluição. Alvo educacional
**~20–25 mL·kg⁻¹·h⁻¹**: subir além disso não melhora desfecho e remove demais (drogas, fosfato).

**Engine `model28.js`.**
- **Fórmula-mãe:** `dose = Q_efluente(mL·h⁻¹) / peso(kg)` → mL·kg⁻¹·h⁻¹. Clearance efetivo com correção de
  pré-diluição: `K_efetivo = K_bruto · [Q_b / (Q_b + Q_predil)]` (a fração de diluição). Em pós-diluição,
  fator = 1 (sem diluição do soluto), mas a fração de filtração no filtro limita `Q_uf` (risco de coagulação).
- **Entradas (estado):** `peso` (kg), `Q_efluente` (mL·h⁻¹), `fração_predil` (0–1 do reposição que vai pré),
  `Q_b` (mL·min⁻¹), `FF_filtro` (fração de filtração).
- **Saídas:** `dose_prescrita`, `dose_efetiva` (mL·kg⁻¹·h⁻¹), `fator_predil`, `FF_filtro`, `flag` (subdose <20 ·
  faixa-alvo 20–25 · sobredose >25 · FF excessiva >~20–25% = risco de coágulo).
- **Alavanca de mecanismo:** mover `fração_predil` de 0→1 faz a `dose_efetiva` cair pelo fator de diluição,
  *enquanto* a `FF_filtro` melhora (filtro mais protegido) — o motor mostra o **trade-off** explícito.
- **Invariantes a testar (§6):** `dose_efetiva ≤ dose_prescrita` sempre (pré-diluição nunca aumenta clearance);
  pós-diluição → fator = 1 → `dose_efetiva = dose_prescrita` (descontadas paradas); ∂dose/∂Q_efluente > 0;
  ∂dose/∂peso < 0; `FF_filtro` sobe quando `Q_uf` sobe a `Q_b` fixo (definição).

**Pérolas (prováveis pelo motor).**
1. **A pré-diluição é um imposto sobre a dose:** repor 100% pré-filtro pode cortar ~30–40% do clearance — o
   motor mostra a `dose_efetiva` de 25 caindo para ~16 mL·kg⁻¹·h⁻¹.
2. **Mais dose não é melhor:** acima de ~25 mL·kg⁻¹·h⁻¹ o motor não melhora desfecho e **remove demais** —
   acende o alerta de subdosagem de antibiótico e de hipofosfatemia.
3. **Prescrito ≠ entregue:** descontar paradas (troca de filtro, exames, coágulo) faz a dose real cair ~10–25%;
   por isso se **prescreve acima do alvo** para *entregar* no alvo.

**Instrumento vivo.** **Régua de dose**: barra deslizante de `Q_efluente`/peso com a zona-alvo 20–25 marcada;
ao acionar a pré-diluição, a barra "prescrita" projeta sua sombra menor "efetiva". Medidor de **FF do filtro**
com a zona de risco de coagulação (>~25%) em vermelho — o trade-off pré × pós em um só painel.

**Ilustração SVG.** Filtro com dois pontos de reposição: **pré** (antes da membrana, seta que dilui o sangue
que entra — soluto mais pálido) × **pós** (depois, sangue concentrado na membrana). Larguras e "palidez"
computadas do `fração_predil`. Barra de efluente normalizada com a faixa-alvo destacada.

**Fármaco/prescrição encadeada.** *Prescrição por mecanismo (educacional):* alvo de efluente **20–25
mL·kg⁻¹·h⁻¹** (ancorado a "não há ganho de desfecho acima disso, e há perda de fármaco/fosfato"); escolha
**pré × pós-diluição** ancorada ao trade-off coagulação × clearance; lembrete de **reposição de fosfato** e de
**redosar antibióticos** quando a dose é alta (ponte M32). Conteúdo educacional — prescrição final do
assistente.

**Caso (5 atos).** (1) 70 kg, CVVHDF, prescrito 1750 mL·h⁻¹ efluente, 100% pré-diluição; ureia não cai como
esperado. (2) *Prever:* aumentar o efluente? (3) *Revelar:* a pré-diluição cortou o clearance — dose efetiva
real ~16, não 25. (4) Conduta: migrar parte da reposição para **pós-diluição** (vigiando a FF do filtro) ou
subir o efluente para compensar o fator de diluição. (5) Síntese: a dose entregue é que dialisa, não a
prescrita.

**Pontes.** FILTRA M21 (a membrana, sieving e backfiltration que sustentam o clearance), M27 (a modalidade que
define como o efluente depura), M25 (Kt/V — a outra língua de "dose", na HDI), M29 (anticoagulação — o outro
motivo da pré-diluição), M32 (a dose alta que rouba antibiótico). Choca M25 (balanço de volume na
ressuscitação).

**Avaliação — sementes + gabarito.**
- **Socrática (passos-chave).**
  - *Q:* Qual é a "dose" da TRRC? → *A:* o **efluente normalizado pelo peso** (mL·kg⁻¹·h⁻¹), não o fluxo de
    sangue nem o tempo — porque é o efluente que carrega o soluto removido.
  - *Q:* Por que a pré-diluição derruba o clearance? → *A:* ela **dilui o soluto** no sangue antes do filtro →
    a concentração que cruza a membrana cai → menos soluto removido por mL de efluente.
- **Revisão (teórica).**
  - *Q:* Por que prescrever acima do alvo de 20–25 mL·kg⁻¹·h⁻¹? → *Gabarito:* porque a **dose entregue < dose
    prescrita** por interrupções (troca de filtro, coágulo, exames); prescreve-se ~25–30 para *entregar* ~20–25.
    Não é para depurar mais — é para compensar as paradas.
- **Chave de ouro (integradora).**
  - *Q:* Paciente em TRRC com dose efluente alta desenvolve hipofosfatemia e infecção não controlada apesar do
    antibiótico. Conecte os dois pelo mecanismo. → *Gabarito robusto:* a **dose alta remove demais** — fosfato
    (hipofosfatemia) e o **antibiótico hidrossolúvel de baixo Vd/baixa ligação** (subdose → falha terapêutica);
    conduta: repor fosfato e **redosar/ajustar o antibiótico ao clearance da TRRC** (M32). *Distrator "subir a
    dose":* pioraria ambos. *Distrator "trocar o antibiótico":* o problema é a *dose removida*, não a escolha.

---

### M29 · Anticoagulação do circuito — citrato regional × heparina

**Tese & inversão.** O circuito extracorpóreo **coagula** porque o sangue toca superfície não-endotelial; a
anticoagulação é para o *circuito*, não para o paciente. O **citrato regional** é a inversão elegante: ele
anticoagula **só dentro do circuito** ao **quelar o cálcio iônico** (o Ca²⁺ é cofator da cascata) — e devolve a
coagulação ao paciente repondo cálcio na volta. A heparina, ao contrário, anticoagula **o paciente inteiro**.
Decompor "onde anticoagula" antes de escolher.

**Erro → verdade.** *Erro:* "anticoagulação do circuito = deixar o paciente anticoagulado." *Verdade:* o
**citrato é regional** — quela Ca²⁺ no circuito (Ca iônico do circuito → alvo ~0,25–0,35 mmol·L⁻¹), e a
**reposição de cálcio** na linha de retorno restaura o Ca iônico **sistêmico** (alvo ~1,0–1,2 mmol·L⁻¹); o
paciente *não* fica anticoagulado. Monitora-se **dois cálcios**: o do circuito (baixo, de propósito) × o
sistêmico (normal).

**Engine `model29.js`.**
- **Fórmula-mãe:** Ca iônico do circuito como função decrescente da dose de citrato:
  `Ca_circuito = Ca_entrada · f(−[citrato])`, com a quelação saturando; e o **balanço sistêmico de cálcio**:
  `Ca_sistêmico = Ca_paciente + reposição − citrato_perdido_no_efluente − citrato_que_retorna`. Acúmulo de
  citrato (fígado não metaboliza) modelado por `razão Ca_total/Ca_iônico↑` → sinal de toxicidade.
- **Entradas (estado):** `dose_citrato` (mmol·L⁻¹ de sangue), `Q_b`, `reposição_Ca` (mmol·h⁻¹),
  `função_hepática` (clearance de citrato), `Ca_paciente_basal`.
- **Saídas:** `Ca_iônico_circuito`, `Ca_iônico_sistêmico`, `razão Ca_total/iônico`, `flag` (anticoagulação
  adequada do circuito · acúmulo de citrato/toxicidade · hipo/hipercalcemia sistêmica).
- **Alavanca de mecanismo:** subir `dose_citrato` → `Ca_circuito↓` (melhor anticoagulação) mas, se o fígado não
  metaboliza, `razão Ca_total/iônico↑` (acúmulo → acidose/hipocalcemia iônica sistêmica). O motor separa os
  dois cálcios.
- **Invariantes a testar (§6):** `Ca_iônico_circuito < Ca_iônico_sistêmico` sempre (o regional funciona);
  ∂Ca_circuito/∂citrato < 0; reposição de Ca move só o sistêmico (∂Ca_sistêmico/∂reposição > 0, ∂Ca_circuito/∂
  reposição ≈ 0); função hepática↓ → `razão Ca_total/iônico↑` (acúmulo); heparina move TTPa sistêmico, não o Ca.

**Pérolas (prováveis pelo motor).**
1. **Dois cálcios, propósitos opostos:** o motor exibe o Ca do circuito **baixo de propósito** (~0,3) e o
   sistêmico **normal** (~1,1) ao mesmo tempo — a essência do "regional".
2. **A armadilha do citrato:** fígado em falência **não metaboliza o citrato** → ele se acumula e quela Ca
   sistêmico → `Ca total↑` mas `Ca iônico↓` e acidose; o motor faz a `razão Ca_total/iônico` disparar (sinal de
   toxicidade), não o Ca total isolado.
3. **Heparina é o oposto geográfico:** o motor mostra o TTPa sistêmico subindo (risco de sangrar o paciente)
   sem proteção "regional" — daí o citrato ser preferido em quem sangra.

**Instrumento vivo.** **Dois mostradores de cálcio** lado a lado: circuito (zona-alvo 0,25–0,35) × sistêmico
(zona-alvo 1,0–1,2), ambos computados ao vivo com a dose de citrato e a reposição. Um terceiro medidor — a
**razão Ca_total/Ca_iônico** — com a zona de alarme de acúmulo de citrato, acionado ao baixar a função
hepática.

**Ilustração SVG.** Circuito com dois pontos: **pré-filtro** (gota de citrato quelando os Ca²⁺ — íons "presos"
desenhados) e **linha de retorno** (gota de gluconato/cloreto de cálcio repondo). Cores dos dois cálcios
computadas. Ao lado, comparação esquemática heparina (anticoagula o corpo inteiro — paciente sombreado) ×
citrato (só o circuito sombreado).

**Fármaco/prescrição encadeada.** *Prescrição por mecanismo (educacional):*
- **Citrato regional:** dose ~**2,5–3 mmol·L⁻¹ de sangue**, titulada ao **Ca iônico do circuito ~0,25–0,35
  mmol·L⁻¹**; **reposição de cálcio** (gluconato/cloreto) titulada ao **Ca iônico sistêmico ~1,0–1,2 mmol·L⁻¹**;
  vigiar **acúmulo de citrato** (razão Ca_total/iônico >~2,5 → reduzir/suspender), sobretudo na falência
  hepática. Mecanismo: quelação de Ca²⁺, cofator da cascata.
- **Heparina:** ~**bolus 1000–2000 UI + infusão titulada ao TTPa/ACT** (anticoagulação **sistêmica** —
  evitar em quem sangra). Conteúdo educacional — protocolo e prescrição finais do serviço/assistente.

**Caso (5 atos).** (1) Cirrótico em TRRC com citrato; piora a acidose, Ca total sobe mas Ca iônico cai,
parestesias. (2) *Prever:* repor mais cálcio? (3) *Revelar:* **acúmulo de citrato** (fígado não metaboliza) —
a razão Ca_total/iônico disparou. (4) Conduta: **reduzir/suspender o citrato**, trocar de estratégia
(heparina se sem sangramento, ou sem anticoagulação com mais pré-diluição); repor Ca conforme o iônico. (5)
Síntese: o sinal não era o Ca total — era a *razão* que denuncia o citrato preso.

**Pontes.** FILTRA M12 (cálcio iônico × total, albumina, pH — a base que o citrato manipula), M13 (acidose do
acúmulo de citrato), M16 (hepatorrenal — o fígado que não metaboliza), M28 (pré-diluição também protege o
circuito). Choca (o paciente que sangra × o que coagula — a escolha hemodinâmica do anticoagulante).

**Avaliação — sementes + gabarito.**
- **Socrática (passos-chave).**
  - *Q:* Por que o citrato anticoagula só o circuito? → *A:* ele **quela o Ca²⁺ iônico** (cofator da cascata)
    dentro do circuito; ao repor cálcio na volta, o Ca iônico sistêmico volta ao normal → o paciente não
    anticoagula.
  - *Q:* Quais dois cálcios eu monitoro e quais os alvos? → *A:* o **do circuito** (baixo de propósito, ~0,25–
    0,35 mmol·L⁻¹) e o **sistêmico** (normal, ~1,0–1,2 mmol·L⁻¹).
- **Revisão (teórica).**
  - *Q:* Como se manifesta a toxicidade do citrato e por quê? → *Gabarito:* **acúmulo** quando o fígado não o
    metaboliza → quela Ca sistêmico: **Ca total↑, Ca iônico↓, acidose**, e a **razão Ca_total/iônico↑** (>~2,5)
    é o marcador — não o Ca total isolado, que confunde.
- **Chave de ouro (integradora).**
  - *Q:* Quando preferir citrato a heparina, e quando o citrato vira o problema? Justifique pelo mecanismo. →
    *Gabarito robusto:* **citrato** é preferido por ser **regional** (não anticoagula o paciente → menos
    sangramento, melhor sobrevida do filtro); vira problema na **falência hepática** (não metaboliza → acúmulo →
    hipocalcemia iônica + acidose). *Distrator "heparina é sempre mais segura":* não — anticoagula o paciente
    inteiro. *Distrator "repor mais cálcio resolve o acúmulo":* não — trata o sintoma; a causa é o citrato, que
    deve ser reduzido.

---

### M30 · Diálise peritoneal — o peritônio como membrana

**Tese & inversão.** Na DP, a "máquina" é o **próprio paciente**: o peritônio é a membrana, os capilares
mesentéricos são o "sangue", e o **gradiente osmótico da glicose** do dialisato puxa a água (UF) e o soluto
difunde. A inversão: a **UF não vem de pressão (TMP), vem de osmose** — a glicose hipertônica suga água; e a
mesma glicose que ultrafiltra é também **reabsorvida**, então a UF **decai ao longo da permanência** (a glicose
se dissipa). Decompor "como ultrafiltra a DP" antes de prescrever a concentração.

**Erro → verdade.** *Erro:* "DP ultrafiltra como a HD, só que pela barriga." *Verdade:* a HD ultrafiltra por
**pressão (TMP)**; a DP por **osmose da glicose** — e por isso a UF da DP é **autolimitada**: à medida que a
glicose é absorvida, o gradiente cai e a UF estanca (ou se inverte). O **PET** classifica o transporte
peritoneal (alto × baixo) e decide o esquema.

**Engine `model30.js`.**
- **Fórmula-mãe:** UF osmótica como `UF(t) = Lp·A·σ·Δπ_glicose(t)`, com `Δπ_glicose(t)` **decaindo** por
  absorção: `Δπ(t) = Δπ₀ · e^(−t/τ)`, onde `τ` é menor (decai rápido) no **transportador alto** (absorve glicose
  depressa). Clearance de soluto por difusão proporcional ao **D/P** (dialisato/plasma) que **sobe** com o
  tempo, mais rápido no transportador alto.
- **Entradas (estado):** `conc_glicose` (1,5% / 2,5% / 4,25%), `tempo_permanência` (h), `tipo_transportador`
  (alto/médio/baixo, via PET), `volume_infundido` (L).
- **Saídas:** `UF(t)` (curva), `UF_líquida` ao fim da permanência, `D/P_creatinina`, `flag` (UF positiva ·
  **UF negativa/reabsorção** no transportador alto com permanência longa · clearance adequado).
- **Alavanca de mecanismo:** transportador **alto** → soluto depura bem (D/P alto) **mas** absorve glicose
  rápido → UF despenca e pode **inverter** em permanências longas. O motor mostra o paradoxo "bom para soluto,
  ruim para água".
- **Invariantes a testar (§6):** `UF(t)` decrescente após o pico (∂Δπ/∂t < 0 por absorção); `UF` maior com
  glicose 4,25% que 1,5% (∂UF/∂conc > 0); transportador alto → `τ` menor → UF cai mais rápido e D/P sobe mais
  rápido; permanência muito longa no alto → `UF_líquida` pode ser **negativa** (reabsorção).

**Pérolas (prováveis pelo motor).**
1. **A UF da DP é autolimitada:** o motor mostra a UF subindo, pico, e **caindo** conforme a glicose é absorvida
   — ao contrário da HD, onde a UF segue enquanto houver TMP.
2. **O transportador alto é uma faca de dois gumes:** depura soluto excelente (D/P alto) mas **reabsorve a
   glicose** rápido → UF mínima ou negativa em permanência longa → precisa de permanências **curtas** (APD).
3. **Mais glicose, mais UF — e mais absorção de glicose:** o motor mostra a 4,25% ultrafiltrando mais, ao custo
   de carga glicêmica/calórica (ponte metabólica).

**Instrumento vivo.** **Curva UF × tempo de permanência** para cada concentração (1,5 / 2,5 / 4,25%), com o pico
e o declínio computados; sobreposta, a curva **D/P creatinina × tempo** do transportador escolhido. Deslizar o
tipo de transportador de baixo→alto mostra a UF "encolhendo" e o D/P "subindo" ao vivo — o trade-off.

**Ilustração SVG.** Cavidade peritoneal esquemática: parede com capilares; **moléculas de glicose** no dialisato
puxando setas de **água** (osmose) para dentro da cavidade; setas de **soluto** (ureia/creatinina) difundindo
para fora. Densidade das setas e tamanho do "lago" de UF computados de `UF(t)`. Glicose "desaparecendo" ao longo
do tempo (absorção).

**Fármaco/prescrição encadeada.** *Prescrição por mecanismo (educacional):* escolher **concentração de glicose**
pela UF desejada (1,5% UF baixa → 4,25% UF alta, ao custo glicêmico); **tempo de permanência** ancorado ao PET
(transportador **alto** → permanências **curtas/APD** para não perder a UF; **baixo** → permanências **longas**
para dar tempo à difusão); alternativa osmótica **icodextrina** para permanência longa (UF sustentada por
poliglucose não absorvida). Conteúdo educacional.

**Caso (5 atos).** (1) Paciente em DP, transportador **alto** no PET, permanências longas noturnas, ganhando
peso/edema apesar da DP. (2) *Prever:* aumentar a glicose? (3) *Revelar:* no alto transportador, a permanência
longa **absorve a glicose** → UF cai a quase zero (até reabsorve). (4) Conduta: **encurtar as permanências**
(APD com trocas rápidas) e/ou **icodextrina** na permanência longa. (5) Síntese: o problema não era pouca
glicose — era *tempo demais* para um peritônio que absorve rápido.

**Pontes.** FILTRA M0/M9 (tonicidade e o volume que a osmose move), M19 (UF e difusão como mecanismos físicos —
aqui pela membrana viva), M21 (a membrana e seu sieving — o peritônio é a membrana), M27 (DP contínua × TRRC
contínua — mecanismos distintos de continuidade). Braço 4 (carga calórica da glicose absorvida).

**Avaliação — sementes + gabarito.**
- **Socrática (passos-chave).**
  - *Q:* O que ultrafiltra na DP, já que não há bomba/TMP? → *A:* a **osmose da glicose** hipertônica do
    dialisato puxa água através do peritônio.
  - *Q:* Por que a UF da DP cai ao longo da permanência? → *A:* a glicose é **absorvida** → o gradiente osmótico
    se dissipa → a UF decai (e pode inverter).
- **Revisão (teórica).**
  - *Q:* O que o PET classifica e como isso muda a prescrição? → *Gabarito:* classifica o **transporte
    peritoneal** (alto × baixo). **Alto:** depura soluto rápido mas absorve glicose rápido → UF baixa →
    permanências **curtas**. **Baixo:** difusão lenta → permanências **longas** para depurar.
- **Chave de ouro (integradora).**
  - *Q:* Transportador alto com má UF apesar de glicose a 4,25% e permanências longas — explique e corrija pelo
    mecanismo. → *Gabarito robusto:* o alto transportador **absorve a glicose rápido** → o gradiente osmótico
    desaparece na permanência longa → UF mínima/negativa; corrigir com **permanências curtas (APD)** e/ou
    **icodextrina** (não absorvível, UF sustentada). *Distrator "subir para 4,25% resolve":* já está a 4,25% — o
    problema é o *tempo*, não a concentração. *Distrator "trocar para HD imediatamente":* prematuro; ajustar o
    esquema primeiro.

---

### M31 · SLED / híbridas — o meio-termo entre HDI e TRRC

**Tese & inversão.** A SLED (diálise lenta estendida) não é uma terceira física — é a **mesma HDI desacelerada
e alongada** (fluxos baixos, ~6–12 h). A inversão: ela compra a **estabilidade hemodinâmica** da TRRC (taxa
instantânea baixa) **sem** o custo da TRRC (anticoagulação 24 h, imobilização, custo) — e ainda dá **janelas
livres** (o paciente sai do circuito parte do dia). Decompor "o que define a estabilidade" (a taxa, não a
máquina) mostra por que o meio-termo existe.

**Erro → verdade.** *Erro:* "ou HDI (rápida) ou TRRC (contínua) — não há meio-termo útil." *Verdade:* a
estabilidade é função da **taxa instantânea** de remoção (UF/h, soluto/h); baixar os **fluxos e estender o
tempo** dá uma taxa intermediária — tolerável para muitos instáveis — com a praticidade da HDI. SLED é o ponto
do meio na reta tempo × eficiência.

**Engine `model31.js`.**
- **Fórmula-mãe:** taxa instantânea `ṁ = dose_total / tempo_sessão`; estabilidade hemodinâmica ∝ `1/ṁ`
  comparada ao **refilling plasmático**. Posiciona HDI (3–4 h), SLED (6–12 h) e TRRC (24 h) na **mesma reta**:
  mesma remoção alvo, taxa decrescente com o tempo → risco de hipotensão decrescente, "tempo livre" do circuito
  crescente até a TRRC (zero).
- **Entradas (estado):** `dose_total` (volume/soluto a remover), `tempo_sessão` (h), `Q_b`/`Q_d` (baixos na
  SLED), `refilling` (mL·min⁻¹, capacidade do paciente).
- **Saídas:** `ṁ_UF`, `ṁ_soluto`, `risco_hipotensão` (quando `ṁ_UF > refilling`), `horas_livres`/dia, `flag`
  (perfil HDI · perfil SLED · perfil TRRC).
- **Alavanca de mecanismo:** deslizar `tempo_sessão` de 3 → 24 h **move o paciente na reta**: a taxa cai, o
  risco de hipotensão cai, as horas livres caem. SLED é a posição intermediária — o motor a marca.
- **Invariantes a testar (§6):** para `dose_total` fixa, `ṁ` decrescente em `tempo_sessão` (∂ṁ/∂t < 0);
  `risco_hipotensão` cresce quando `ṁ_UF > refilling`; SLED com `ṁ` entre HDI e TRRC (ordenação estrita);
  `horas_livres` decrescentes de HDI → TRRC (TRRC ≈ 0).

**Pérolas (prováveis pelo motor).**
1. **A estabilidade mora na taxa, não na sigla:** o motor mostra SLED e TRRC com **risco de hipotensão
   parecido** quando a taxa instantânea é igual — a "continuidade" não é mágica, é a taxa baixa.
2. **SLED devolve o dia:** ao contrário da TRRC (24 h presa), a SLED dá **horas livres** para mobilização,
   exames, procedimentos — o motor contabiliza as horas-livres como vantagem.
3. **O mesmo alvo, três caminhos:** a mesma remoção de volume/ureia é alcançável por HDI, SLED ou TRRC — muda a
   *taxa* e o *custo*, não o destino; o motor sobrepõe as três trajetórias chegando ao mesmo ponto.

**Instrumento vivo.** **Reta tempo × taxa instantânea** com três marcadores (HDI · SLED · TRRC) deslizáveis; ao
arrastar `tempo_sessão`, o marcador anda e mostram-se ao vivo o risco de hipotensão e as horas-livres. Linha do
`refilling` como limiar: cruzá-la acende o alarme de hipotensão intradialítica.

**Ilustração SVG.** Eixo horizontal de tempo (3 h → 24 h) com três "barras de sessão" de altura ∝ taxa
instantânea (HDI alta e curta · SLED média e longa · TRRC baixa e contínua); a área de cada barra (= dose total)
**igual** nas três — a igualdade visual da dose com taxas diferentes, computada do engine.

**Fármaco/prescrição encadeada.** *Prescrição por mecanismo (educacional):* SLED tipicamente **6–12 h**,
**Q_b ~200 mL·min⁻¹**, **Q_d ~100–300 mL·min⁻¹** (baixos para reduzir a taxa); anticoagulação **mínima ou
nenhuma** (sessão mais curta que a TRRC → menos exposição); ajuste de fármacos **intermediário** entre HDI e
TRRC (ponte M32). Indicação ancorada ao mecanismo: **instável, mas sem necessidade de 24 h** de suporte.
Conteúdo educacional.

**Caso (5 atos).** (1) Paciente saindo do choque, ainda lábil, mas melhorando; em TRRC há 3 dias, agora
mobilizável. (2) *Prever:* manter TRRC por segurança? (3) *Revelar:* a labilidade já tolera taxa intermediária;
a TRRC prende 24 h e atrapalha reabilitação/exames. (4) Conduta: **transição para SLED** (6–10 h noturnas),
liberando o dia. (5) Síntese: escolher a *taxa* tolerável e recuperar o *tempo* — o meio-termo serve a este
paciente.

**Pontes.** FILTRA M22–M24 (HDI e a hipotensão intradialítica — o extremo rápido), M27/M28 (TRRC — o extremo
contínuo e sua dose), M23 (refilling/peso seco — o limiar que define a taxa tolerável). Choca M16/M23 (a
transição do choque para a estabilidade que permite acelerar a diálise).

**Avaliação — sementes + gabarito.**
- **Socrática (passos-chave).**
  - *Q:* O que torna a SLED mais estável que a HDI? → *A:* **fluxos baixos + tempo estendido** → **taxa
    instantânea menor** de UF/soluto → respeita o refilling → menos hipotensão.
  - *Q:* O que a SLED ganha sobre a TRRC? → *A:* **horas livres** (não prende 24 h), **menos/sem
    anticoagulação**, menor custo — pela praticidade da HDI com a estabilidade da TRRC.
- **Revisão (teórica).**
  - *Q:* Posicione HDI, SLED e TRRC no eixo tempo × eficiência e diga o que muda. → *Gabarito:* HDI (curta, alta
    eficiência, alta taxa, instável); TRRC (24 h, baixa taxa, estável, presa); **SLED no meio** (6–12 h, taxa
    intermediária). Muda a **taxa instantânea** (e o custo/anticoagulação), não a dose-alvo total.
- **Chave de ouro (integradora).**
  - *Q:* Por que a SLED pode ser tão estável quanto a TRRC sem ser contínua? Justifique pelo mecanismo. →
    *Gabarito robusto:* porque a estabilidade depende da **taxa instantânea de remoção** comparada ao
    **refilling**, não da continuidade em si; fluxos baixos por 8–12 h dão uma taxa que o refilling acompanha.
    *Distrator "só a TRRC é estável":* falso — confunde continuidade com baixa taxa. *Distrator "SLED é só HDI
    mais barata":* o ganho central é hemodinâmico, não de custo.

---

### Bloco IX · O que a diálise remove — e os perigos

### M32 · Depuração de solutos e drogas — PM, ligação proteica, Vd

**Tese & inversão.** A diálise **não remove "o que está no corpo"** — remove **o que está livre no plasma e cabe
na membrana**. Três propriedades decidem: **peso molecular** (cabe na membrana?), **ligação proteica** (a fração
ligada não passa) e **volume de distribuição** (Vd alto = a droga mora nos tecidos, não no plasma → a diálise
"raspa" só uma fração ínfima). Decompor a molécula antes de assumir que a diálise a tira. A diálise pode
**subdosar um antibiótico** ou **deixar uma toxina intocada** — pelo mesmo trio.

**Erro → verdade.** *Erro:* "está no sangue do paciente, a diálise tira." *Verdade:* a diálise remove a fração
**livre** (não a ligada à albumina) de moléculas **pequenas** (PM baixo) com **Vd baixo** (concentradas no
plasma). Vancomicina, aminoglicosídeos hidrossolúveis de baixo Vd **são** removidos (e precisam de **redose**);
uma droga muito ligada ou de Vd enorme **não** é — dialisar não a "limpa".

**Engine `model32.js`.**
- **Fórmula-mãe:** clearance dialítico efetivo de uma droga `K_droga ≈ K_membrana · f_livre · g(PM) · h(Vd)`,
  com `f_livre = 1 − ligação_proteica`, `g(PM)` caindo com o PM (sieving), e a **fração removível do corpo**
  `≈ K_droga·t / (Vd·peso)` — pequena quando o Vd é grande. Necessidade de redose se a fração removida por
  sessão exceder um limiar.
- **Entradas (estado):** `PM` (Da), `ligação_proteica` (0–1), `Vd` (L·kg⁻¹), `K_membrana`, `t_sessão`,
  `peso`.
- **Saídas:** `f_livre`, `K_droga`, `fração_removida_por_sessão`, `flag` (removível → **redosar** · não-removível
  → não redosar), recomendação educacional de redose pós-diálise.
- **Alavanca de mecanismo:** subir `ligação_proteica` → `f_livre↓` → menos removida; subir `Vd` → fração do
  corpo removida↓ (a droga está nos tecidos); subir `PM` → sieving↓. O motor mostra cada eixo separando o
  "removível" do "intocável".
- **Invariantes a testar (§6):** `K_droga ≤ K_membrana` sempre (a ligação só reduz); ∂removida/∂ligação < 0;
  ∂removida/∂Vd < 0; ∂removida/∂PM < 0 (na faixa relevante da membrana); droga 100% ligada → removida ≈ 0;
  high-flux remove PM maiores que low-flux (ponte M21).

**Pérolas (prováveis pelo motor).**
1. **A diálise rouba o antibiótico:** vancomicina (Vd baixo, ligação moderada, hidrossolúvel) é removida — o
   motor mostra a fração removida por sessão pedindo **redose pós-HD**; esquecer = subdose = falha + resistência.
2. **Vd enorme = diálise inútil:** uma droga com Vd de 20 L·kg⁻¹ tem quase tudo no tecido; o motor mostra a
   fração do corpo removida ínfima — dialisar "para limpar" é ilusão (relevante na toxicologia, M33).
3. **A ligação proteica é o filtro invisível:** duas drogas de mesmo PM, uma 10% ligada e outra 95% ligada — o
   motor mostra a primeira removida ~10× mais; só a fração livre cruza a membrana.

**Instrumento vivo.** **Cubo de removibilidade** (3 eixos: PM × ligação × Vd) com a droga como ponto colorido —
verde (removível, redosar) → vermelho (intocável); arrastar cada propriedade move o ponto e atualiza a
**fração removida por sessão** e a recomendação de redose, ao vivo.

**Ilustração SVG.** Membrana com poros: moléculas **pequenas e livres** passando (setas verdes), **grandes** ou
**ligadas à albumina** barradas (a albumina desenhada "segurando" a droga). Ao lado, dois compartimentos
**plasma × tecido** com a droga distribuída ∝ Vd — mostrando quão pouco está acessível quando o Vd é alto.
Tamanhos/cores computados do engine.

**Fármaco/prescrição encadeada.** *Prescrição por mecanismo (educacional):* regra de **redose** — drogas
**hidrossolúveis, PM baixo, Vd baixo, baixa ligação** (ex.: muitos β-lactâmicos, vancomicina, aminoglicosídeos)
**são removidas** → **redosar após a HD** ou ajustar à dose contínua da TRRC (alvo de dose pode ser **maior** na
TRRC de alto efluente — ponte M28). Drogas **muito ligadas ou de Vd alto** não precisam de suplemento pós-HD.
Doses específicas conforme referência de ajuste renal; conteúdo educacional.

**Caso (5 atos).** (1) HD intermitente diária, infecção por Gram-negativo, vancomicina dosada de manhã —
sessão à tarde; nível subterapêutico recorrente. (2) *Prever:* a bactéria é resistente? (3) *Revelar:* a **HD
remove a vancomicina** (Vd baixo, hidrossolúvel) → o nível cai pós-sessão. (4) Conduta: **redosar a vancomicina
após a HD** (e dosar nível), não trocar o antibiótico. (5) Síntese: não era resistência — era a diálise
roubando a droga.

**Pontes.** FILTRA M21 (sieving/high-flux × low-flux — o que a membrana deixa passar), M28 (dose da TRRC e a
perda de fármaco no efluente), M33 (a mesma física aplicada às toxinas — quando "removível" é o objetivo),
M0/M9 (Vd e os compartimentos de água). Braço 5 (metaboliza/intoxica — PK das drogas).

**Avaliação — sementes + gabarito.**
- **Socrática (passos-chave).**
  - *Q:* Quais três propriedades decidem se uma droga é dialisável? → *A:* **PM baixo** (cabe na membrana),
    **baixa ligação proteica** (fração livre passa) e **Vd baixo** (concentrada no plasma, acessível).
  - *Q:* Por que Vd alto torna a diálise quase inútil para aquela droga? → *A:* a droga está nos **tecidos**, não
    no plasma; a diálise só vê o plasma → remove uma fração mínima do total corporal.
- **Revisão (teórica).**
  - *Q:* Por que redosar a vancomicina após a HD? → *Gabarito:* ela é **removida** (Vd baixo, hidrossolúvel,
    ligação moderada) → o nível cai na sessão → manter a dose pré-HD deixaria o paciente **subterapêutico**
    (falha + resistência). Redose pós-HD recompõe o nível.
- **Chave de ouro (integradora).**
  - *Q:* Dois antibióticos no mesmo paciente em HD: um precisa de redose pós-sessão, o outro não. Como decidir
    pelo mecanismo? → *Gabarito robusto:* comparar **PM, ligação proteica e Vd**: o de **baixo PM, baixa ligação,
    baixo Vd** é removido → **redosar**; o de **alta ligação ou Vd alto** quase não sai → **não redosar**.
    *Distrator "redosar os dois por segurança":* superdosaria o intocável (toxicidade). *Distrator "a HD não
    afeta antibióticos":* falso — afeta os dialisáveis seletivamente.

---

### M33 · Remoção de toxinas — intoxicações dialisáveis

**Tese & inversão.** A diálise vira **antídoto físico** quando a toxina obedece ao mesmo trio do M32: **baixo
PM, baixa ligação proteica, baixo Vd** — e, idealmente, **clearance endógeno baixo** (o corpo não a elimina
sozinho). A inversão: não se dialisa "a intoxicação" — dialisa-se a **molécula certa**. Lítio, salicilato,
metanol, etilenoglicol **cabem**; uma toxina lipofílica de Vd enorme (ex.: muitos antidepressivos) **não cabe**,
e dialisar é teatro. Decompor a toxina antes de indicar a máquina.

**Erro → verdade.** *Erro:* "intoxicação grave → diálise." *Verdade:* só as toxinas **pequenas, livres, de Vd
baixo** saem; lítio (PM 7, Vd ~0,7 L·kg⁻¹, **zero ligação**) é o caso-escola; metanol/etilenoglicol saem **e**
removem os metabólitos ácidos; salicilato sai e a diálise **corrige a acidose** junto. Toxina lipofílica de Vd
alto: a diálise não a alcança.

**Engine `model33.js`.**
- **Fórmula-mãe:** mesma `K_droga` do M32 aplicada à toxina, mais o **balanço com o clearance endógeno**:
  `benefício_diálise ∝ K_diálise / (K_diálise + K_endógeno)` e a **fração removível** `∝ 1/Vd`. "Dialisável" =
  PM baixo **e** ligação baixa **e** Vd baixo **e** (endógeno baixo **ou** gravidade que exige aceleração).
- **Entradas (estado):** `toxina` (lítio/salicilato/metanol/etilenoglicol/lipofílica-Vd-alto), `PM`, `ligação`,
  `Vd`, `K_endógeno`, `gravidade` (nível, acidose, órgão-alvo).
- **Saídas:** `K_diálise`, `fração_removível`, `ganho_sobre_endógeno`, `flag` (**dialisável + indicado** ·
  dialisável mas sem indicação · **não-dialisável**), modalidade sugerida (HD intermitente de alto fluxo, em
  geral).
- **Alavanca de mecanismo:** trocar a toxina recarrega PM/ligação/Vd e o motor reclassifica; subir a
  **gravidade** (acidose grave, nível tóxico, lesão de órgão) **move a indicação** mesmo quando o endógeno
  removeria devagar — a diálise **acelera**.
- **Invariantes a testar (§6):** lítio/salicilato/metanol/etilenoglicol → `dialisável = true`; lipofílica de Vd
  alto → `dialisável = false`; ∂removível/∂Vd < 0; ∂removível/∂ligação < 0; `ganho_sobre_endógeno` cresce quando
  `K_endógeno↓`; gravidade↑ desloca o flag para "indicado" sem alterar a física da removibilidade.

**Pérolas (prováveis pelo motor).**
1. **O lítio é o caso perfeito:** PM minúsculo, **zero ligação**, Vd baixo, clearance endógeno renal (que cai na
   própria intoxicação) — o motor o marca como **altamente dialisável**; HD intermitente de alto fluxo o
   despenca (com cuidado para o **rebote** do compartimento intracelular).
2. **Dialisar dois pássaros:** em metanol/etilenoglicol e salicilato, a diálise remove a **toxina E** corrige a
   **acidose metabólica** simultaneamente — o motor soma os dois benefícios.
3. **Vd alto engana:** o motor mostra a toxina lipofílica de Vd 10–20 L·kg⁻¹ com fração removível ínfima —
   "dialisar para limpar" não funciona; reconhecer poupa um procedimento inútil.

**Instrumento vivo.** **Triagem de dialisabilidade**: selecionar a toxina acende os três eixos (PM/ligação/Vd)
computados e o veredito (dialisável × não) com a **fração removível** e o **ganho sobre o clearance endógeno**.
Sobreposto, o nível da toxina caindo na sessão (e o **rebote** pós-diálise do lítio, computado).

**Ilustração SVG.** Quatro toxinas como cartões (lítio · salicilato · metanol · etilenoglicol) "passando" pela
membrana (verdes, pequenas, livres) × uma toxina lipofílica grande/ligada barrada (vermelha). Barra de **acidose
corrigindo** junto à remoção do salicilato/álcoois tóxicos. Tamanhos/cores computados.

**Fármaco/prescrição encadeada.** *Prescrição por mecanismo (educacional):* indicação de **HD intermitente de
alto fluxo** para lítio (nível tóxico + sintomas/IRA), salicilato (nível alto, acidose, alteração de SNC),
metanol/etilenoglicol (acidose com AG↑, gap osmolar; **junto** do antídoto **fomepizol/etanol** que bloqueia a
álcool-desidrogenase, e da diálise que remove a toxina **e** o metabólito); vigiar **rebote** (lítio sai do
intracelular devagar → repetir sessão). Conteúdo educacional — toxicologia e prescrição finais do serviço.

**Caso (5 atos).** (1) Intoxicação por etilenoglicol: acidose com AG alto, gap osmolar, IRA, cristais. (2)
*Prever:* só o antídoto basta? (3) *Revelar:* o antídoto (fomepizol) **trava a produção** do ácido, mas a toxina
e os metabólitos já presentes precisam **sair** — Vd baixo, PM baixo, sem ligação = **dialisável**. (4) Conduta:
**HD** (remove toxina + metabólitos + corrige acidose) **+ fomepizol**. (5) Síntese: dialisar a molécula certa é
um antídoto físico — e ainda conserta o ácido-base.

**Pontes.** FILTRA M13 (acidose com AG↑, delta-delta, gap osmolar — o que metanol/etilenoglicol/salicilato
fazem), M32 (o trio PM/ligação/Vd que classifica a removibilidade), M35 (o "I" de **Intoxicação** no AEIOU —
indicação de TRS), M0 (Vd e os compartimentos). Braço 5 (toxicologia e o metabolismo das toxinas).

**Avaliação — sementes + gabarito.**
- **Socrática (passos-chave).**
  - *Q:* Que propriedades tornam uma toxina dialisável? → *A:* **baixo PM, baixa ligação proteica, baixo Vd**
    (concentrada no plasma) e, idealmente, **clearance endógeno baixo** (o corpo não a tira sozinho).
  - *Q:* Por que o lítio é o exemplo perfeito? → *A:* PM 7 Da, **zero ligação**, Vd ~0,7 L·kg⁻¹ → altamente
    dialisável; mas cuidado com o **rebote** do compartimento intracelular.
- **Revisão (teórica).**
  - *Q:* Por que a diálise ajuda duplamente em metanol/etilenoglicol e salicilato? → *Gabarito:* remove **a
    toxina/metabólitos** (pequenos, livres, Vd baixo) **e corrige a acidose metabólica** (repõe HCO₃⁻ /retira o
    ácido) — dois alvos no mesmo procedimento.
- **Chave de ouro (integradora).**
  - *Q:* Duas intoxicações graves; uma indica diálise, a outra não. Decida pelo mecanismo. → *Gabarito robusto:*
    aplicar PM/ligação/Vd (+ endógeno + gravidade): a de **baixo PM/baixa ligação/baixo Vd** (lítio, salicilato,
    álcoois tóxicos) é **dialisável e indicada** se grave; a **lipofílica de Vd alto** (mora no tecido) **não** —
    dialisar não a alcança. *Distrator "gravidade indica diálise por si":* gravidade move a *indicação* só se a
    física permitir a remoção. *Distrator "antídoto dispensa diálise":* o antídoto bloqueia a produção; a toxina
    já formada ainda precisa sair.

---

### M34 · Síndrome de desequilíbrio dialítico — edema cerebral por osmose reversa

**Tese & inversão.** O perigo da **primeira diálise muito eficiente** não é tirar a ureia — é tirá-la **rápido
demais do sangue**. A ureia cai no plasma em minutos, mas no **cérebro** ela sai devagar (a barreira a retém);
nasce um **gradiente osmótico sangue × cérebro invertido** → a água entra no cérebro por osmose → **edema
cerebral**. A inversão central: o sintoma neurológico não vem da uremia — vem da **correção rápida demais**
dela. Decompor "a velocidade" antes de celebrar a eficiência.

**Erro → verdade.** *Erro:* "quanto mais ureia eu tirar na primeira sessão, melhor." *Verdade:* na primeira
diálise de um paciente **muito urêmico**, uma remoção **agressiva** despenca a ureia plasmática enquanto a
cerebral persiste → o cérebro fica **hiperosmolar relativo** → **osmose reversa** (água para o cérebro) →
cefaleia, náusea, convulsão, coma. Previne-se **freando** a sessão (curta, fluxos baixos, ureia-alvo modesta).

**Engine `model34.js`.**
- **Fórmula-mãe:** dois compartimentos de ureia — plasma e cérebro — com a plasmática caindo por
  `K_t/V` da sessão e a cerebral por uma constante de equilíbrio **lenta** (`τ_cérebro` grande):
  `gradiente(t) = U_cérebro(t) − U_plasma(t)`; o **fluxo de água para o cérebro** ∝ gradiente → `edema(t)`.
  Quanto mais agressiva a sessão (↑clearance, ↓tempo), maior o gradiente transitório.
- **Entradas (estado):** `U_inicial` (ureia muito alta vs moderada), `clearance_sessão`, `tempo_sessão`,
  `τ_cérebro` (lentidão do equilíbrio cerebral).
- **Saídas:** `U_plasma(t)`, `U_cérebro(t)`, `gradiente(t)`, `edema_cerebral_estimado`, `flag` (sessão segura ·
  **risco de desequilíbrio** quando o gradiente pico excede um limiar).
- **Alavanca de mecanismo:** subir `clearance_sessão` ou baixar `tempo_sessão` → `U_plasma` despenca → gradiente
  pico↑ → edema↑. Estender o tempo / baixar fluxo **achata** a queda → gradiente pequeno → seguro. O motor mostra
  a prevenção como **geometria da curva**.
- **Invariantes a testar (§6):** `gradiente` cresce com `U_inicial` e com a agressividade (∂gradiente/∂clearance
  > 0, ∂gradiente/∂tempo < 0); `U_cérebro` atrasa `U_plasma` (defasagem por `τ_cérebro`); sessão lenta/curta-alvo
  → gradiente abaixo do limiar; ureia inicial moderada → risco baixo qualquer que seja a sessão.

**Pérolas (prováveis pelo motor).**
1. **A eficiência é o perigo:** o motor mostra que **quanto melhor** a primeira sessão remove ureia, **maior** o
   gradiente sangue×cérebro e o edema — o oposto da intuição "mais é melhor".
2. **O cérebro está sempre atrasado:** as duas curvas de ureia (plasma rápida × cérebro lenta) se descolam; a
   área entre elas **é** o risco — o motor a pinta.
3. **Prevenir é frear, não acelerar:** sessão **curta, fluxos baixos, ureia-alvo modesta** mantém o gradiente
   pequeno; o motor mostra a curva achatada sem pico — segurança por desenho.

**Instrumento vivo.** **Duas curvas de ureia sobrepostas** (plasma × cérebro) ao longo da sessão, com a **área
do gradiente** sombreada (= risco de edema); deslizar `clearance`/`tempo` infla ou achata a área ao vivo. Um
medidor de **edema cerebral estimado** com a zona de alarme cruzando o limiar.

**Ilustração SVG.** Vaso × cérebro separados pela barreira: setas de **ureia saindo do sangue rápido** (plasma
limpando) e **presa no cérebro**; o gradiente desenhado puxa **água para o cérebro** (osmose reversa) → o
cérebro "incha" (contorno computado de `edema(t)`). Cenário seguro (curvas juntas, sem inchaço) × perigoso
(curvas descoladas, inchaço) lado a lado.

**Fármaco/prescrição encadeada.** *Prescrição por mecanismo (educacional):* na **primeira diálise do muito
urêmico**, prescrever **sessão curta** (~**2 h**), **fluxos baixos** (`Q_b` reduzido, dialisador pequeno),
**redução modesta da ureia (URR-alvo baixo)**, considerar **manitol/elevar o Na do dialisato** para sustentar a
osmolalidade plasmática e **anular o gradiente** (osmose reversa neutralizada pela osmose adicionada). Conteúdo
educacional — prescrição final do assistente.

**Caso (5 atos).** (1) Ureia 250 mg·dL⁻¹, primeira HD, dialisada agressivamente 4 h alto fluxo; ao fim,
cefaleia, vômito, confusão, convulsão. (2) *Prever:* uremia piorando? (3) *Revelar:* **síndrome de
desequilíbrio** — a ureia plasmática despencou, a cerebral não → osmose reversa → **edema cerebral**. (4)
Conduta: as próximas sessões **curtas, fluxos baixos, redução modesta**, ± manitol/Na do dialisato. (5)
Síntese: o dano veio da *velocidade* da correção, não da doença — frear é tratar.

**Pontes.** FILTRA M0/M9/M10 (osmose, tonicidade e a água que segue o gradiente — a mesma física da mielinólise
ao corrigir o Na rápido demais), M22/M25 (a sessão de HDI e o Kt/V — a eficiência que aqui é o perigo), M26
(cinética da ureia e o rebote — os compartimentos), M34↔M10 (a regra-mãe: **corrigir devagar o que se acumulou
devagar**). Braço 6 (edema cerebral e PIC — o cérebro que não tolera pressão).

**Avaliação — sementes + gabarito.**
- **Socrática (passos-chave).**
  - *Q:* Por que a primeira diálise muito eficiente causa edema cerebral? → *A:* a ureia **plasmática despenca**
    mas a **cerebral fica para trás** (sai devagar) → gradiente osmótico sangue×cérebro invertido → **água entra
    no cérebro** (osmose reversa).
  - *Q:* Como prevenir pelo mecanismo? → *A:* **frear** a sessão — curta, fluxos baixos, redução **modesta** da
    ureia — para manter o gradiente pequeno; ± manitol/Na do dialisato para sustentar a osmolalidade plasmática.
- **Revisão (teórica).**
  - *Q:* Que pacientes estão em maior risco e por quê? → *Gabarito:* os **muito urêmicos** em **primeira(s)
    sessão(ões)**: ureia inicial altíssima → maior gradiente possível quando o plasma é limpo depressa; o
    cérebro, lento, não acompanha.
- **Chave de ouro (integradora).**
  - *Q:* Por que "tirar mais ureia" pode piorar o paciente, e como isso ecoa a correção do sódio? → *Gabarito
    robusto:* remover ureia **rápido demais** cria o gradiente sangue×cérebro → **osmose reversa → edema**; é a
    mesma lei da disnatremia (M10): **corrigir devagar o que se acumulou devagar** (lá, evitar mielinólise/edema;
    aqui, o desequilíbrio). *Distrator "uremia residual é o problema":* não — o problema é a *velocidade*, não a
    ureia que sobrou. *Distrator "edema = excesso de volume removido":* é **osmótico** (água para o cérebro), não
    de balanço de volume.

---

### Bloco X · Indicação, momento e integração

### M35 · Indicações de TRS — o AEIOU como mapa de conduta

**Tese & inversão.** A indicação de diálise não é "creatinina ou ureia altas": é a **falência de uma função
do meio interno que a máquina pode substituir por um mecanismo físico**. O `AEIOU` (Acidose · Eletrólitos ·
Intoxicação · Overload/sobrecarga · Uremia) não é uma lista a decorar — é um **mapa de cinco mecanismos**,
cada letra ligada à física que a diálise oferece (difusão, convecção, ultrafiltração, adsorção). O número é
sombra; a pergunta certa é *qual função falhou, e a máquina remove esse problema por qual mecanismo?*

**Erro → verdade.** *Erro:* "ureia > X ou creatinina > Y → dialise." *Verdade:* o gatilho é **refratariedade
ao tratamento conservador + risco de órgão-alvo**, não um corte numérico. A acidose dialisa porque o
`HCO₃⁻` se repõe por difusão; a hipercalemia refratária dialisa porque o K⁺ tem baixo PM e é depurado
rápido; a sobrecarga dialisa porque a UF remove **volume** por TMP (não por concentração); a uremia dialisa
quando vira **sintoma** (pericardite, encefalopatia, sangramento), não quando é só um número.

**Engine `model35.js`.**
- **Fórmula-mãe:** um **escore de indicação por mecanismo** — `urgência = max sobre as 5 letras de
  severidade_letra · refratariedade_letra`, cada letra com seu próprio sub-modelo:
  `A` = `f(pH, HCO₃⁻, PaCO₂)` via `pH = 6,1 + log₁₀(HCO₃⁻/(0,03·PaCO₂))` (M13); `E` = `g(K⁺, ECG/membrana,
  refratariedade ao tratamento clínico)` (M11); `I` = `h(toxina, dialisabilidade = PM·ligação·Vd)` (M33);
  `O` = `j(balanço hídrico acumulado, congestão, resposta a diurético)` (M23/M37); `U` = `k(sintomas urêmicos
  ≠ número)` (M15).
- **Entradas (estado):** `pH`, `HCO₃⁻`, `PaCO₂`, `K⁺` (mEq·L⁻¹), `refratario_K` (bool/grau),
  `toxina` (categórica) com `PM`/`ligacao`/`Vd`, `balanco_ml` (acumulado), `resposta_diuretico` (0–1),
  `uremia_sintoma` (pericardite/encefalo/sangramento, grau), `Cr`/`ureia` (contexto, **não** gatilho isolado).
- **Saídas:** `score_A..U`, `letra_dominante`, `urgencia` (eletiva × urgente × emergencial),
  `mecanismo_fisico` recomendado (difusão p/ A,E,U; UF p/ O; ± adsorção/convecção p/ I), `flag` "número alto
  isolado **não** indica".
- **Alavancas de mecanismo:** refratariedade (subir/baixar resposta ao tratamento conservador desloca o score),
  dialisabilidade da toxina (PM↑/ligação↑/Vd↑ → `I` cai), sintoma urêmico (liga `U` independentemente do número).
- **Invariantes a testar (§6):** ureia/Cr altas **com** todas as letras controladas → `urgencia = eletiva`
  (número não dispara sozinho); hipercalemia refratária com ECG alargado → `E` emergencial; toxina com
  `Vd` enorme e alta ligação proteica → `I` baixo (não dialisável) mesmo se grave; `urgencia` monotônica
  crescente em cada severidade; `letra_dominante = argmax` consistente; tudo finito sob fuzz.

**Pérolas (prováveis pelo motor).**
1. **O número não dispara:** ureia 200 mg·dL⁻¹ **assintomática** com `A/E/O` controlados → score baixo; a
   mesma ureia com pericardite urêmica → emergência. O motor separa número de sintoma.
2. **Nem toda intoxicação é dialisável:** dois venenos igualmente graves, um com `Vd` baixo/baixa ligação
   (lítio) e outro com `Vd` enorme/alta ligação → só o primeiro acende `I`. A física manda, não a gravidade.
3. **A sobrecarga refratária é gatilho próprio:** com diurético sem resposta (`resposta_diuretico→0`), `O`
   sobe sozinho mesmo com K⁺ e pH normais — porque o problema é **volume**, removível por UF, não por difusão.

**Instrumento vivo.** Um **radar/painel AEIOU** de 5 raios computado ao vivo: cada raio é o score de uma
letra; o raio dominante pisca e nomeia o **mecanismo físico** que o resolve. Sliders de pH, K⁺, balanço,
toxina e sintoma redesenham o radar e movem o veredito (eletiva→urgente→emergencial) em tempo real.

**Ilustração SVG.** Pentágono AEIOU inline, cada vértice com ícone do mecanismo (difusão = setas de
gradiente; UF = seta de pressão TMP; adsorção = membrana captando). Comprimento de cada raio ∝ score do
engine; barra-veredito embaixo muda de cor (verde eletiva → âmbar urgente → vermelho emergencial).

**Fármaco encadeado [conduta por mecanismo].** Antes de dialisar, o motor mostra o **degrau conservador** que
a diálise só substitui se falhar — todos educacionais, com unidade e mecanismo computados:
- **Hipercalemia (E):** gluconato de cálcio **1 g IV** (estabiliza membrana, não baixa K⁺); insulina regular
  **10 U IV** + glicose **25 g** (shift transcelular, M11); β₂ inalatório; furosemida se diurese presente.
  *Refratário/anúrico/ECG alargado → diálise (difusão remove o estoque).*
- **Acidose (A):** bicarbonato **1–2 mEq·kg⁻¹ IV** como ponte; se a causa não cede e o pH cai → diálise
  repõe `HCO₃⁻` por difusão sem sobrecarga de Na⁺/volume.
- **Sobrecarga (O):** furosemida **bolus + infusão** titulada à diurese; sem resposta → **UF** (mecanismo de
  pressão, M23). Disclaimer educacional presente; doses computadas, não tabela fixa.

**Caso (5 atos).** (1) LRA oligúrica, K⁺ 6,9 mEq·L⁻¹ com onda T apiculada, pH 7,18, balanço +4 L, ureia 180.
(2) *Prever:* "ureia 180 → dialise agora"? (3) *Revelar:* o gatilho **não** é a ureia — é `E` (hipercalemia
com membrana instável) + `A` (acidose) + `O` (congestão); três letras acesas. (4) Conduta: cálcio +
insulina/glicose **enquanto** se prepara a máquina; se refratário, diálise por difusão (K⁺/HCO₃⁻) + UF
(volume). (5) Síntese: AEIOU é mapa de mecanismos — cada letra escolheu sua física.

**Pontes.** M11 (K⁺ e ECG → letra E), M13 (ácido-base → letra A), M23/M37 (sobrecarga → letra O, UF),
M33 (intoxicações dialisáveis → letra I, dialisabilidade), M15 (uremia sintoma ≠ número → letra U),
M36 (a letra acesa também responde *quando* iniciar), M19 (qual mecanismo físico cada letra invoca).
Choca M4/M5 (a congestão de `O` dialoga com o volume responsivo≠tolerante) e M25 (ressuscitação que virou
sobrecarga).

**Avaliação — sementes + gabarito.**
- **Socrática (passos-chave).**
  - *Q:* Ureia 200, paciente comendo, sem pericardite, K⁺/pH/volume normais — dialisar? → *A:* **não**; o
    número isolado não é gatilho (`U` exige sintoma urêmico, não cifra). Conservador + observar.
  - *Q:* Por que a hipercalemia entra no AEIOU mas o cálcio IV não "trata" o K⁺? → *A:* o cálcio estabiliza a
    **membrana** (ganha tempo, M11), não remove K⁺; só shift e depuração (diálise) tiram o estoque.
  - *Q:* Sobrecarga refratária com K⁺ e pH normais — qual mecanismo a máquina usa? → *A:* **UF** (gradiente
    de pressão TMP) — o problema é volume, não soluto; difusão não resolveria.
- **Revisão (teórica).**
  - *Q:* Soletre o AEIOU e ligue cada letra ao mecanismo físico que a resolve. → *Gabarito:* A=acidose→difusão
    (repõe HCO₃⁻); E=eletrólitos/K⁺→difusão (baixo PM, depura rápido); I=intoxicação→difusão/convecção/adsorção
    conforme PM·ligação·Vd; O=overload/volume→ultrafiltração (TMP); U=uremia **sintomática**→difusão (depura
    escórias). O fio condutor: cada letra é uma função do meio interno + a física que a substitui.
  - *Q:* Por que "creatinina > X" é critério ruim de diálise? → *Gabarito:* Cr reflete massa muscular, cinética
    lenta e secreção tubular (M4/M15); é marcador de TFG, não de toxicidade tratável — o gatilho é
    refratariedade funcional + risco de órgão, não o nível.
- **Chave de ouro (integradora).**
  - *Q:* Dois pacientes intoxicados, igualmente graves: lítio (PM ~7, sem ligação proteica, `Vd` ~0,7 L·kg⁻¹)
    e amitriptilina (alta ligação, `Vd` ~15 L·kg⁻¹). Qual a diálise resgata, e por quê? → *Gabarito robusto:*
    **lítio** — baixo PM, livre no plasma e `Vd` pequeno fazem do compartimento sanguíneo o reservatório
    principal, então a difusão remove fração relevante (letra I acende). A *amitriptilina* tem `Vd` enorme
    (mora nos tecidos) e alta ligação proteica: a diálise depura só o plasma e o tecido **re-equilibra** —
    remoção desprezível (I **não** acende; trata-se com suporte/alcalinização). *Distrator "ambas, são
    graves":* confunde gravidade com **dialisabilidade** — a física (PM·ligação·Vd, M33) decide, não a
    severidade. Educacional.

---

### M36 · O momento da substituição — quando iniciar, por mecanismo

**Tese & inversão.** "Quando iniciar a diálise" não se resolve por dogma (precoce × tardio), e sim por
**mecanismo**: inicia-se quando uma função do meio interno está falhando de forma **refratária e de risco**, e
se espera quando o rim ainda pode recuperar e o dano da máquina (acesso, hipotensão, depleção de nutrientes)
supera o ganho. O número (Cr, ureia, dias de oligúria) é sombra; a causa é a **trajetória da refratariedade**.

**Erro → verdade.** *Erro:* "começar cedo é sempre melhor" ou "esperar sempre é melhor". *Verdade:* os
grandes ensaios de *timing* convergem porque a pergunta certa não é tempo, é **gatilho**: na ausência de uma
emergência AEIOU (M35), iniciar mais cedo **não** salva e expõe a riscos; na presença dela, esperar mata. O
"timing" é uma função do mecanismo que pede suporte, não do relógio.

**Engine `model36.js`.**
- **Fórmula-mãe:** `decisao = iniciar` se `gatilho_emergencial(AEIOU) = verdadeiro` **ou**
  `trajetoria_refrataria > limiar` apesar de tratamento conservador máximo; caso contrário `esperar` enquanto
  `prob_recuperacao` e `reserva` justificarem. Modelar `risco_esperar` (acúmulo de A/E/O/U no tempo) ×
  `risco_iniciar` (acesso, hipotensão intradialítica M24, perda de recuperação, depleção) → recomenda o ponto
  onde `risco_esperar > risco_iniciar`.
- **Entradas (estado):** série temporal de `K⁺`/`pH`/`HCO₃⁻`/`balanco_ml`/`uremia_sintoma`, `resposta_conservadora`
  (0–1), `tendencia` (melhora × estável × piora), `oliguria_h`, `prob_recuperacao` (etiologia: pré-renal
  reversível × NTA × obstrutiva resolvida), `comorbidade_hemodinamica` (risco de hipotensão).
- **Saídas:** `decisao` (esperar × iniciar agora × iniciar se piorar), `gatilho_dominante`, `janela`
  (tempo estimado até cruzar o limiar), `flag` "número estável ≠ indicação".
- **Alavancas de mecanismo:** subir `resposta_conservadora` adia; piorar `tendencia` antecipa; `prob_recuperacao`
  alta (pré-renal corrigível) puxa para esperar; emergência AEIOU sobrepõe tudo (inicia já).
- **Invariantes a testar (§6):** com AEIOU emergencial → `iniciar agora` **sempre** (sobrepõe trajetória);
  sem emergência + tendência de melhora → `esperar` mesmo com ureia/Cr altas; `risco_iniciar` monotônico em
  `comorbidade_hemodinamica`; `janela` encurta monotonicamente com piora; nenhuma entrada (incl. série vazia/
  NaN) lança ou gera decisão indefinida.

**Pérolas (prováveis pelo motor).**
1. **Cedo não é melhor por si:** com todas as letras AEIOU controladas e tendência estável, antecipar a
   diálise só adiciona `risco_iniciar` (acesso, hipotensão) sem reduzir `risco_esperar` → o motor recomenda
   esperar mesmo com números "feios".
2. **A trajetória vence o nível:** dois pacientes com a mesma Cr — um subindo rápido sem resposta, outro em
   platô respondendo — recebem decisões **opostas**; a derivada importa mais que o ponto.
3. **A emergência ignora o relógio:** uma única letra emergencial (K⁺ refratário, edema pulmonar sem resposta)
   zera o debate de timing — o motor pula direto para "iniciar agora", independentemente dos dias de oligúria.

**Instrumento vivo.** **Gráfico de trajetórias cruzadas:** `risco_esperar(t)` subindo e `risco_iniciar`
(quase) constante; o ponto de cruzamento é o "momento". Sliders de resposta conservadora e tendência movem a
curva de espera; um toggle "emergência AEIOU" colapsa a janela para *agora*. Linha do tempo de K⁺/pH/balanço
sobreposta, computada.

**Ilustração SVG.** Duas curvas inline (espera × iniciar) com o ponto de interseção marcado e rotulado
"janela"; um semáforo de decisão (esperar = verde, iniciar-se-piorar = âmbar, iniciar-já = vermelho) cuja cor
vem do engine; mini-sparkline da tendência de cada letra AEIOU.

**Fármaco encadeado [conduta por mecanismo].** O "esperar" é **ativo**: maximizar o conservador antes de
cruzar o limiar — furosemida titulada à diurese (UF fisiológica enquanto houver néfron respondendo),
bicarbonato de ponte na acidose, manejo de K⁺ (M11/M35) — tudo educacional, dose↔mecanismo do motor. Quando o
conservador satura (resposta→0), o motor mostra a curva de espera ultrapassando a de iniciar: aí a máquina
entra. Nada de dose "fixa": a dose computa a partir da resposta.

**Caso (5 atos).** (1) NTA pós-isquêmica, dia 3 de oligúria, Cr 4,5 e subindo, mas K⁺ 4,8, pH 7,33, balanço
neutro, hemodinâmica frágil. (2) *Prever:* "3 dias de oligúria + Cr 4,5 → começar"? (3) *Revelar:* sem
gatilho AEIOU emergencial e com risco alto de hipotensão intradialítica, o motor recomenda **esperar e
vigiar**; o número não é emergência. (4) Conduta: otimizar volume/conservador, reavaliar a cada turno; iniciar
**se** uma letra cruzar o limiar (K⁺↑ refratário, congestão sem resposta). (5) Síntese: o momento é o
cruzamento das curvas de risco, não o calendário.

**Pontes.** M35 (a letra acesa é o gatilho que sobrepõe o timing), M24 (hipotensão intradialítica = parte do
`risco_iniciar`), M16 (etiologia da LRA → `prob_recuperacao`: pré-renal reversível espera, NTA estabelecida
talvez não), M37 (na cardiorrenal o gatilho costuma ser `O`), M27/M31 (a modalidade — TRRC/SLED — muda o
`risco_iniciar` em quem é instável). Choca M5 (responsivo≠tolerante: dar mais volume vira sobrecarga e
antecipa o gatilho `O`).

**Avaliação — sementes + gabarito.**
- **Socrática (passos-chave).**
  - *Q:* Mesma Cr 4,5: um subindo 1,0/dia sem resposta, outro em platô respondendo a diurético. Decisão? → *A:*
    **opostas** — o que sobe sem resposta caminha para o gatilho (preparar/iniciar); o que faz platô espera. A
    derivada manda.
  - *Q:* O que torna "esperar" perigoso de repente? → *A:* o `risco_esperar` cruzar o `risco_iniciar` — uma
    letra AEIOU vira refratária/emergencial; aí a espera passa a acumular dano de órgão.
  - *Q:* Por que iniciar cedo sem gatilho pode piorar? → *A:* adiciona riscos da máquina (acesso, hipotensão
    intradialítica M24, depleção, possível atraso da recuperação do rim) sem remover um problema que ainda não
    existe.
- **Revisão (teórica).**
  - *Q:* Como tratar a controvérsia precoce × tardio por mecanismo, não por dogma? → *Gabarito:* substituir
    "quantos dias/que Cr" por "há gatilho AEIOU refratário?". Sem ele, a evidência mostra que antecipar não
    melhora desfecho e adiciona risco; com ele, esperar lesa órgão. O timing é variável dependente do
    mecanismo, não independente.
  - *Q:* Cite dois fatores que puxam para **esperar** e dois que puxam para **iniciar**. → *Gabarito:* esperar:
    alta `prob_recuperacao` (pré-renal corrigível, obstrução resolvida) e resposta conservadora preservada;
    iniciar: gatilho AEIOU refratário e trajetória de piora sem resposta. Hemodinâmica frágil **aumenta**
    `risco_iniciar` (não impede, mas pede modalidade contínua, M27).
- **Chave de ouro (integradora).**
  - *Q:* Dois pacientes idênticos em Cr/ureia. A: anúrico, edema pulmonar refratário a furosemida em dose máxima,
    SpO₂ caindo. B: diurese mantida, gases e K⁺ normais, melhorando. Quando dialisar cada um? → *Gabarito
    robusto:* **A agora** — gatilho `O` (sobrecarga) emergencial e refratário: o mecanismo que pede suporte é a
    **UF** (remoção de volume por TMP), e esperar troca pulmão por relógio. **B: esperar** — nenhum gatilho,
    trajetória de melhora, `prob_recuperacao` alta; iniciar só somaria `risco_iniciar`. *Distrator "ambos,
    mesma Cr":* o erro central do módulo — o nível é igual, o **mecanismo** (e a derivada) é oposto. Educacional.

---

### M37 · Síndrome cardiorrenal e a ultrafiltração — coração, rim e volume na falência mútua

**Tese & inversão.** Na síndrome cardiorrenal a oligúria **não** é "rim seco": é, com frequência, **rim
congesto**. O determinante esquecido da TFG é a pressão **a jusante** — a `P_BC`/pressão venosa renal sobe com
a congestão sistêmica e **fecha** o gradiente de filtração `(P_GC − P_BC − π_GC)`. O número (Cr subindo sob
diurético) é sombra; a causa é a **pressão venosa renal elevada**, não a hipovolemia. Tratar como "pré-renal e
dar volume" piora os dois órgãos.

**Erro → verdade.** *Erro:* "Cr subiu na ICC descompensada → estou secando demais → reduza o diurético / dê
soro." *Verdade:* na congestão, é a **pressão venosa** que estrangula a filtração; descongestionar (diurético
eficaz ou **UF**) costuma **melhorar** a função renal. Mas o caminho importa: diurético resistente (braking,
M17) e UF agressiva (hipotensão intradialítica, M24) têm armadilhas opostas.

**Engine `model37.js`.**
- **Fórmula-mãe:** acopla a filtração de M1 à hemodinâmica venosa: `TFG = Kf·(P_GC − P_BC − π_GC)` com
  `P_BC = h(PVC, pressão venosa renal)` crescente na congestão, e `P_GC = j(PAM, DC, R_A, R_E)` (M1). A
  **descongestão** reduz `P_BC` → `(P_GC − P_BC)` reabre → TFG↑. Compara duas rotas: diurético
  (`efeito = Emax·D/(EC50+D)` deslocada por braking/resistência, M17) × **UF** (remoção de volume por TMP, taxa
  vs. `refilling` plasmático, M23).
- **Entradas (estado):** `PVC`/`pressao_venosa_renal`, `PAM`, `DC` (ponte Choca), `congestao` (grau),
  `dose_diuretico` (mg), `resistencia_diuretico` (0–1), `taxa_UF` (mL·h⁻¹), `refilling` (mL·h⁻¹),
  `volume_intravascular`.
- **Saídas:** `P_BC`, `P_GC`, `TFG`, `delta_TFG` por rota, `risco_hipotensao` (se `taxa_UF > refilling`),
  `recomendacao` (diurético otimizado × UF × ambos), `flag` "congesto ≠ seco".
- **Alavancas de mecanismo:** congestão↑ → `P_BC↑` → TFG↓ (a inversão central); descongestão por qualquer rota
  → `P_BC↓` → TFG↑; `taxa_UF > refilling` → intravascular↓ → hipotensão e **piora** pré-renal (a UF mal
  dosada vira o erro oposto).
- **Invariantes a testar (§6):** `∂TFG/∂P_BC < 0` (congestão fecha o gradiente); descongestão controlada →
  TFG↑ (a pérola); `taxa_UF > refilling` → queda de volume e `risco_hipotensao` acende (a janela de Starling
  da M23); diurético com `resistencia→1` → curva de Emax achatada/deslocada (braking); identidade
  `TFG = Kf·(P_GC−P_BC−π_GC)` exata (tol 1e-7); tudo finito sob fuzz.

**Pérolas (prováveis pelo motor).**
1. **Descongestionar melhora a Cr:** o motor mostra TFG **subindo** ao baixar a `P_BC` (UF ou diurético
   eficaz) — o oposto da intuição "estou secando o rim". O inimigo era a pressão venosa, não a falta de volume.
2. **A UF tem janela:** remover acima do `refilling` esvazia o intravascular → hipotensão → pré-renal
   iatrogênica; o ganho da descongestão **inverte** se a taxa exceder o refill (ponte M23/M24).
3. **Resistência diurética não é "dose baixa demais" só:** o braking (M17) desloca a curva à direita; subir a
   dose tem teto — às vezes a UF (mecanismo físico, não farmacológico) é a saída quando o néfron não responde.

**Instrumento vivo.** Painel de **três pressões** (PAM/`P_GC`, `P_BC`/venosa, `π_GC`) com a TFG = saldo,
redesenhado ao vivo; ao lado, duas rotas de descongestão (curva dose-resposta do diurético com braking × a
reta da UF com a **janela de refilling** marcada). Mover congestão e taxa de UF mostra a TFG subir e, se a UF
ultrapassa o refill, despencar por hipotensão.

**Ilustração SVG.** Glomérulo de M1 com a seta `P_BC` **engrossada** pela congestão fechando o gradiente; ao
descongestionar, a seta encolhe e o saldo de filtração reabre (comprimentos do engine). Barra de UF com zona
verde (≤ refilling) e zona vermelha (> refilling). Coração-rim-volume como triângulo de falência mútua.

**Fármaco encadeado [conduta por mecanismo].** Educacional, dose↔unidade↔mecanismo do motor:
- **Diurético de alça** (furosemida) IV em **bolus + infusão contínua** titulada à diurese; na resistência,
  **bloqueio sequencial** com tiazídico (metolazona/clortalidona) somando o segmento distal (M17) — o motor
  mostra a curva somada vencer o braking.
- **UF (mecanismo físico)** quando o néfron não responde: prescrever **taxa de UF (mL·h⁻¹)** ancorada ao
  `refilling` estimado — alvo de remoção de **volume** por TMP, **não** de soluto; o motor acende
  `risco_hipotensao` se a taxa exceder o refill (M23/M24). Disclaimer presente.

**Caso (5 atos).** (1) ICC FE reduzida, descompensada, edema franco, PVC alta, Cr 1,3→2,1 sob furosemida.
(2) *Prever:* "secou demais → corte o diurético, dê volume"? (3) *Revelar:* é **congestão** — `P_BC↑` fecha a
filtração; o rim está afogado, não seco. (4) Conduta: descongestionar — otimizar diurético (bolus+infusão ±
bloqueio sequencial); se resistente, **UF** dosada ao refilling; reavaliar a Cr (deve **melhorar** com a
descongestão). (5) Síntese: a Cr contou a pressão venosa renal, não a volemia.

**Pontes.** **Choca M16 (cardiogênico)** — o DC baixo que alimenta a congestão a montante; **Choca M23 (choque
misto)** — quando cardiorrenal coexiste com distributivo/hipovolêmico e a leitura de volume engana; M1 (a
`P_BC` como termo de Starling), M23 (UF × refilling, peso seco), M24 (hipotensão intradialítica), M17
(resistência diurética/braking/sinergia), M9–M10 (volume circulante efetivo vs. água). Choca M5
(responsivo≠tolerante: dar volume na congestão é o erro espelhado).

**Avaliação — sementes + gabarito.**
- **Socrática (passos-chave).**
  - *Q:* Por que a Cr sobe na ICC congesta apesar de o paciente estar **cheio** de líquido? → *A:* a `P_BC`/
    pressão venosa renal sobe e **fecha** o gradiente `(P_GC − P_BC − π_GC)`; é congestão a jusante, não
    hipovolemia a montante.
  - *Q:* O que descongestionar faz com a TFG, e por quê? → *A:* baixa `P_BC` → reabre o gradiente → TFG↑; por
    isso descongestão eficaz **melhora** a função renal.
  - *Q:* Quando a UF, que ajuda, passa a piorar o rim? → *A:* quando `taxa_UF > refilling` → intravascular cai
    → hipotensão → pré-renal iatrogênica (a janela de Starling, M23).
- **Revisão (teórica).**
  - *Q:* Diferencie "rim seco" de "rim congesto" pelo termo de Starling dominante. → *Gabarito:* seco = `P_GC↓`
    por hipovolemia/hipoperfusão (M1, baixa `P_art`); congesto = `P_BC↑` por pressão venosa renal alta — saldo
    de filtração fechado pela jusante, não pela montante. Conduta oposta: o primeiro tolera volume, o segundo
    pede descongestão.
  - *Q:* Por que dobrar a furosemida nem sempre resolve a cardiorrenal? → *Gabarito:* braking e resistência
    (M17) deslocam/achatam a curva dose-resposta (teto); a entrega distal de Na⁺ readapta. Saídas: bloqueio
    sequencial (somar segmento) ou UF (mecanismo físico que não depende da resposta do néfron).
- **Chave de ouro (integradora).**
  - *Q:* ICC descompensada, edema maciço, PVC 18, Cr subindo sob furosemida; o plantonista quer **suspender o
    diurético e dar 1 L de soro** "porque secou o rim". Certo ou errado, por mecanismo? E qual a alternativa se
    o diurético falhar? → *Gabarito robusto:* **errado** — a TFG caiu por `P_BC↑` (congestão), não por volume;
    dar soro **eleva** a pressão venosa renal e fecha **mais** o gradiente, piorando coração e rim juntos (o
    erro espelha Choca M5, responsivo≠tolerante). O certo é **descongestionar**: otimizar o diurético
    (bolus+infusão ± bloqueio sequencial, M17) e, se resistente, **UF** dosada ao `refilling` (M23) — remoção
    de **volume** por TMP, vigiando hipotensão intradialítica (M24). *Distrator "UF agressiva já":* tirar acima
    do refill inverte o ganho (pré-renal iatrogênica). A regra: baixar `P_BC` sem esvaziar o intravascular.
    Educacional.

---

### M38 · Capstone integrado — da LRA grave à máquina certa, por mecanismo

**Tese & inversão.** O fechamento do braço: **LRA grave → escolher a modalidade e prescrever por mecanismo →
meio interno restaurado.** A escolha HDI × TRRC × SLED × DP **não** é preferência de serviço: é o **casamento**
entre o mecanismo da LRA (FILTRA) e a física da máquina (DIALISA). O meio interno restaurado é a sombra; a
causa é uma cadeia de decisões mecanísticas — *qual função falhou → qual física a substitui → qual modalidade
entrega essa física com a hemodinâmica que o paciente tolera → qual dose/anticoagulação.*

**Erro → verdade.** *Erro:* "LRA dialítica → ligue a hemodiálise." *Verdade:* a **estabilidade hemodinâmica**
e a **função-alvo** escolhem a modalidade. Instável + edema cerebral/risco de desequilíbrio → **contínua**
(remoção lenta, M27/M34); estável + necessidade de depuração rápida (K⁺ emergencial) → **HDI**; meio-termo →
**SLED** (M31); peritônio disponível/sem acesso vascular → **DP** (M30). Errar a modalidade é trocar o
mecanismo certo pela máquina errada.

**Engine `model38.js`.**
- **Fórmula-mãe:** uma **árvore de decisão computada** que integra os engines anteriores:
  (1) `mecanismo_LRA` (M16: pré-renal × intrínseca/NTA·NIA·glomerular × pós-renal) →
  (2) `gatilho_AEIOU` (M35) e `momento` (M36) →
  (3) `modalidade = f(estabilidade_hemodinamica, necessidade_depuracao, risco_desequilibrio, acesso)` →
  (4) **prescrição por mecanismo**: HDI = `Kt/V`-alvo, tempo, `Qb`/`Qd`, UF; TRRC = efluente
  **mL·kg⁻¹·h⁻¹**, pré × pós-diluição, anticoagulação (citrato × heparina); SLED = híbrido; DP = trocas/glicose.
  Saída final: `meio_interno_projetado` (K⁺, HCO₃⁻, balanço, ureia/`URR`) **antes × depois**.
- **Entradas (estado):** o estado renal (M16), gases/`K⁺`/balanço (M35), hemodinâmica (`PAM`/`DC`/`risco_hipotensao`,
  Choca), `risco_desequilibrio` (ureia muito alta, neuro, M34), `acesso` disponível, `peso`, alvos de dose.
- **Saídas:** `modalidade` recomendada + **porquê mecanístico**, `prescricao` (com unidades), `meio_interno
  pré→pós`, `riscos` (hipotensão M24, desequilíbrio M34, perda de fármaco M32), `flag` se a modalidade
  escolhida contradiz a hemodinâmica.
- **Alavancas de mecanismo:** instabilidade↑ → empurra de HDI para SLED/TRRC (remoção mais lenta, melhor
  tolerância); ureia altíssima/neuro → favorece contínua/dose gradual (evita desequilíbrio, M34); função-alvo
  "volume" → prioriza UF/convecção; "soluto pequeno emergencial" → difusão rápida.
- **Invariantes a testar (§6):** instável + alto risco de desequilíbrio → **nunca** "HDI rápida de alta
  eficiência" (acende `flag`); a dose computada bate com `Kt/V`/efluente alvo (identidade, tol 1e-7);
  `meio_interno pós` move-se no sentido da função substituída (K⁺↓ com difusão, volume↓ com UF); citrato →
  quelação de Ca²⁺ no circuito sem anticoagular o paciente (M29); coerência: a modalidade recomendada nunca
  viola a hemodinâmica de entrada; tudo finito sob fuzz ≥5000.

**Pérolas (prováveis pelo motor).**
1. **A mesma LRA, duas máquinas:** o **mecanismo** da LRA é igual, mas mudar só a **estabilidade hemodinâmica**
   troca a modalidade recomendada (HDI↔TRRC) — a física segue a tolerância do paciente, não o diagnóstico.
2. **Rápido demais machuca:** em ureia altíssima, a HDI de alta eficiência dispara `risco_desequilibrio`
   (edema cerebral por osmose reversa, M34) — o motor prefere remoção **gradual** (contínua/dose fracionada).
   Mais clearance não é melhor clearance.
3. **A modalidade certa pode remover o fármaco:** TRRC de alto efluente depura antibiótico (M32) → a
   prescrição de diálise **obriga** reajuste de dose do fármaco; ignorar isso vira subdose oculta. As duas
   prescrições (máquina e droga) são acopladas.

**Instrumento vivo.** Um **fluxo decisório vivo**: o usuário define mecanismo da LRA + hemodinâmica + função-
alvo + acesso, e o motor **acende o ramo** (HDI/TRRC/SLED/DP) explicando o porquê; ao lado, dois mostradores
do **meio interno pré → pós** (K⁺, HCO₃⁻, balanço, ureia/URR) computados pela dose prescrita, e um painel de
riscos que pisca se a escolha contradiz a hemodinâmica.

**Ilustração SVG.** Árvore de decisão inline com o ramo escolhido destacado (cor/espessura do engine); ao
lado, barras **antes × depois** do meio interno (alturas computadas), o circuito da modalidade ativa (HDI =
difusão Qb/Qd; TRRC = convecção/efluente; DP = peritônio/glicose) e um semáforo de risco de desequilíbrio
(M34) ligado à taxa de remoção.

**Fármaco encadeado [prescrição por mecanismo].** O capstone **prescreve a máquina** e **reajusta a droga**,
tudo educacional e computado:
- **TRRC:** efluente-alvo **20–25 mL·kg⁻¹·h⁻¹** (convecção CVVH × difusão CVVHD × CVVHDF), pré × pós-diluição;
  **anticoagulação por citrato regional** (quela Ca²⁺ no circuito; repor cálcio sistêmico) × heparina (M29).
- **HDI:** `Kt/V`-alvo (p.ex. ~1,2/sessão), tempo, `Qb`/`Qd`, UF dosada ao peso seco/refilling (M23/M25).
- **Reajuste de fármaco (M32):** antibiótico depurado pela modalidade → **redosar** pela fração removida
  (PM·ligação·`Vd` + clearance da máquina), com unidade e mecanismo. Disclaimer + nota de honestidade do modelo.

**Caso (5 atos).** (1) Sepse → NTA, anúrico, K⁺ 6,8 refratário, pH 7,15, balanço +6 L, em noradrenalina, PAM
65, ureia 210, sonolento. (2) *Prever:* "ligar a HDI de alta eficiência agora"? (3) *Revelar:* mecanismo = NTA
intrínseca; gatilhos AEIOU = E+A+O; **instável** (vasopressor) e ureia altíssima com neuro → HDI rápida
arrisca hipotensão (M24) **e** desequilíbrio (M34). (4) Conduta: **TRRC** — remoção lenta e contínua; efluente
~25 mL·kg⁻¹·h⁻¹, citrato regional; UF dosada à tolerância; **reajustar o antibiótico** pela depuração da
máquina (M32). (5) Síntese: a mesma LRA pediria HDI se ele estivesse estável — a **hemodinâmica e o cérebro**
escolheram a máquina; o meio interno (K⁺, HCO₃⁻, volume) restaura-se no ritmo que o paciente tolera.

**Pontes.** Amarra o braço inteiro: M16 (mecanismo da LRA) + M35 (AEIOU) + M36 (momento) + M19/M27
(física e contínua) + M23/M24 (UF, hipotensão) + M28/M29 (dose e anticoagulação da TRRC) + M32 (depuração de
fármaco) + M34 (desequilíbrio) + M37 (cardiorrenal/UF). **Choca M16 (cardiogênico)** e **M23 (misto)** — a
hemodinâmica que escolhe a modalidade; **Choca M28 (vasopressores)** — o paciente em droga vasoativa pede
contínua; **Choca M25 (ressuscitação)** — o volume que virou sobrecarga e agora sai por UF.

**Avaliação — sementes + gabarito.**
- **Socrática (passos-chave).**
  - *Q:* Mesma NTA, mesmo K⁺ — um estável, outro em noradrenalina. Modalidade de cada? → *A:* estável → **HDI**
    (depuração rápida, tolera o gradiente); instável → **TRRC/SLED** (remoção lenta, melhor tolerância
    hemodinâmica, M24/M31). A física segue a tolerância.
  - *Q:* Ureia 250 + sonolência — por que não HDI de alta eficiência? → *A:* queda osmótica rápida → água entra
    no neurônio → **desequilíbrio dialítico** (edema cerebral, M34). Remoção gradual (contínua/dose fracionada).
  - *Q:* Iniciei TRRC de alto efluente; o que devo reanalisar na prescrição **do antibiótico**? → *A:* a
    **dose** — a máquina depura o fármaco (M32); manter a dose pré-diálise subdosaria. Redosar pela fração
    removida.
- **Revisão (teórica).**
  - *Q:* Liste os quatro determinantes que escolhem a modalidade e o mecanismo de cada um. → *Gabarito:*
    (1) estabilidade hemodinâmica (instável → contínua, remoção lenta tolerável, M24); (2) necessidade de
    depuração rápida (K⁺ emergencial → HDI/difusão); (3) risco de desequilíbrio (ureia altíssima/neuro →
    gradual, M34); (4) acesso/recursos (sem acesso vascular ou peritônio íntegro → DP, M30). A modalidade é o
    casamento função-alvo × física × tolerância.
  - *Q:* Por que citrato regional, e não só heparina, na TRRC? → *Gabarito:* o citrato **quela o Ca²⁺ no
    circuito** (anticoagulação **regional**, repondo cálcio ao paciente, M29) — anticoagula a máquina sem
    anticoagular o doente; útil no risco hemorrágico. Heparina anticoagula sistemicamente.
- **Chave de ouro (integradora — fechamento do braço).**
  - *Q:* Sepse → NTA, anúrico, K⁺ 6,8 refratário, pH 7,15, +6 L, em noradrenalina (PAM 65), ureia 210,
    sonolento. Construa a cadeia completa: mecanismo da LRA → gatilho → momento → modalidade → prescrição por
    mecanismo → meio interno esperado. → *Gabarito robusto:* **Mecanismo (M16):** NTA intrínseca (intrarrenal),
    não pré-renal pura — volume não corrige. **Gatilho (M35):** E (hipercalemia refratária com membrana) + A
    (acidose) + O (sobrecarga +6 L) acesos → **iniciar agora** (M36: emergência sobrepõe o timing). **Modalidade
    (M38):** **TRRC** — instável em vasopressor (HDI rápida → hipotensão, M24/Choca M28) **e** ureia altíssima
    com neuro (HDI de alta eficiência → desequilíbrio, M34); a remoção contínua casa com a hemodinâmica frágil.
    **Prescrição (educacional):** efluente ~25 mL·kg⁻¹·h⁻¹ (convecção+difusão), citrato regional (M29), UF
    dosada à tolerância/refilling (M23) priorizando **volume** (gatilho O); **reajustar o antibiótico** pela
    depuração da máquina (M32). **Meio interno esperado:** K⁺ e HCO₃⁻ corrigem gradualmente por difusão; volume
    cai por UF sem hipotensão; ureia desce **devagar** (evita M34). *Distrator "HDI de alta eficiência já,
    rápido é melhor":* dispara hipotensão (instável) **e** desequilíbrio cerebral (ureia/neuro) — mais clearance
    não é melhor clearance. *Distrator "dar volume, deve estar pré-renal":* é NTA + sobrecarga; volume piora O e
    a congestão (M37/Choca M5). Educacional.

---

### Bloco XI · Avaliação

### M39 · Revisão global · exame de domínio · 100 questões

**Tese & inversão.** O exame não mede memória de fatos isolados: mede se o aluno **decompõe antes de
interpretar** — em todo o braço. Cada questão é uma sombra (um número, uma conduta, uma escolha de máquina) e
a resposta certa é o **mecanismo** que a produziu. O exame é psicométrico (como nos braços-irmãos do
hexápode): dificuldade calibrada, distratores que capturam erros conceituais nomeados, gabarito que **ensina**.
A inversão final do braço: *o domínio é poder reconstruir a cadeia causal do meio interno — da força de
Starling à prescrição de diálise — sob qualquer disfarce.*

**Erro → verdade.** *Erro:* "exame = 100 fatos avulsos para reconhecer." *Verdade:* exame = 100
**decomposições**, cada uma testando se o aluno separou o número do mecanismo; um distrator escolhido é um
erro conceitual diagnosticado, não um deslize.

**Engine `model39.js` (motor de exame).**
- **Fórmula-mãe:** um **gerador/avaliador psicométrico** sobre o banco. Cada item carrega `{bloco, dificuldade
  (1–3), tipo (ilustrado×textual), mecanismo_alvo, distratores[] com erro_capturado, gabarito_com_porque}`. O
  motor (1) **monta a prova** por uma matriz de especificação (blueprint) que fixa a distribuição por
  bloco/dificuldade/tipo; (2) **avalia** respostas; (3) emite um **mapa de domínio por mecanismo** (não só
  nota): onde o aluno errou, qual erro conceitual nomeado caiu.
- **Entradas (estado):** `banco` (itens com metadados), `blueprint` (cotas por bloco/dificuldade/tipo),
  `respostas`, `semente` (PRNG mulberry32 para amostragem **determinística**).
- **Saídas:** `prova` (100 itens conforme blueprint), `nota`, `mapa_por_bloco`, `mapa_por_mecanismo`,
  `erros_conceituais_acionados` (lista nomeada), `flag` se o blueprint não fecha as cotas.
- **Alavancas de mecanismo:** mudar a `semente` reamostra **sem** quebrar o blueprint (cotas invariantes);
  subir a dificuldade-alvo desloca a amostra para itens nível 3 mantendo a cobertura de blocos.
- **Invariantes a testar (§6):** a prova montada **sempre** cumpre o blueprint (Σ cotas = 100; nenhum bloco
  zerado; mix ilustrado≥/textual≥ respeitado); cada item tem gabarito **com porquê** e **todo** distrator tem
  `erro_capturado` não-vazio (a regra do §0 vira assert); a chave única e sem ambiguidade (uma só correta);
  reexecução com a mesma semente → prova idêntica (determinismo); nenhum metadado NaN/ausente sob fuzz;
  cobertura: todo bloco I–X aparece e toda **ponte** com o Choca tem ≥1 item.

**Arquitetura do exame (a matriz de especificação).**
- **100 itens = 50 ilustrados (cada um com sua SVG computada do engine) + 50 textuais** — espelhando os dois
  bancos de cada módulo.
- **Distribuição por blocos** (proporcional ao peso curricular; soma 100):

  ```text
  Bloco 0  Fundamentos (água/filtração, M0–M1)              ~8
  Bloco I  Glomérulo/hemodinâmica/medida (M2–M4)            ~10
  Bloco II Túbulo segmento a segmento + diuréticos (M5–M8)  ~14
  Bloco III Meio interno: Na/água/K/Ca-P-Mg/ácido-base (M9–M13) ~16
  Bloco IV RAAS/endócrino + urina/índices (M14–M15)          ~8
  Bloco V  LRA + farmacologia integrada (M16–M18)            ~12
  Bloco VI–VIII DIALISA: princípios/circuito/HDI/contínuas (M19–M31) ~16
  Bloco IX–X  O que remove/perigos + indicação/momento/integração (M32–M38) ~16
  ```
- **Distribuição por dificuldade:** ~40% nível 1 (reconhecer o mecanismo), ~40% nível 2 (aplicar/decompor),
  ~20% nível 3 (integrar/ponte — multi-módulo, costuma cruzar com o Choca).
- **Pontes obrigatórias** (≥1 item cada, nível 2–3): cardiorrenal M16/M37 ↔ Choca M16/M23; hepatorrenal M16 ↔
  Choca M20; volume M9–M10 ↔ Choca M4/M5/M25; anti-HAS/RAAS M18 ↔ Choca M28.
- **Gabarito robustíssimo como padrão (§0):** toda resposta com o *porquê mecanístico*; **todo** distrator com
  o *erro conceitual que captura*. Item sem isso não entra no banco (o validador recusa).

**Pérolas (prováveis pelo motor).**
1. **A semente não afrouxa o rigor:** trocar a semente reembaralha os itens mas **mantém** as cotas do
   blueprint — duas provas diferentes, mesma cobertura de domínio. O motor prova a invariância.
2. **Distrator é diagnóstico:** o relatório não diz só "errou 12"; diz **quais erros conceituais** acendeu
   (ex.: "tratou o número Na em vez da água", "creatinina = função", "deu volume na congestão") — o gabarito
   vira mapa de remediação.
3. **A integração é o teto:** os itens nível 3 quase sempre cruzam o Choca (volume, cardiogênico, RAAS×
   vasopressores) — o domínio do rim só fecha quando conversa com o coração.

**Instrumento vivo.** Um **simulador de prova**: monta os 100 itens pelo blueprint (semente visível),
apresenta ilustrados com SVG computada e textuais; ao final, um **radar de domínio por bloco** + a lista de
**erros conceituais acionados** (computados das respostas), não só a nota — espelho do "manda no pixel".

**Ilustração SVG.** Cada item ilustrado traz sua figura inline computada do engine do módulo de origem (mini
Darrow–Yannet, curva TFG×PAM, saldo de Starling, radar AEIOU, curva dose-resposta com braking, janela de
refilling). O relatório final é um **radar de blocos** (eixos = blocos I–X, raio = % acerto) desenhado do
resultado.

**Caso (5 atos).** (1) "Prova de domínio" — 100 itens, semente fixa. (2) *Prever:* o aluno estima onde
errará. (3) *Revelar:* o radar mostra o bloco fraco e os erros conceituais nomeados. (4) Conduta: o motor
**remedia** — aponta os módulos de origem dos erros (ex.: errou ponte cardiorrenal → revisar M37 + Choca M16).
(5) Síntese: o domínio é a cadeia causal reconstruída sob disfarce.

**Pontes.** Todos os módulos M0–M38 (o exame é o agregador) e as pontes explícitas com o Choca (M16/M37,
M9–M10, M18). O relatório de domínio referencia o módulo de origem de cada erro — o exame é o mapa causal do
braço inteiro.

**Avaliação — sementes + gabarito (questões-semente exemplares, cobrindo as pontes do braço).**
- **Socrática (do próprio exame — como o motor monta).**
  - *Q:* Por que a semente PRNG não pode mudar a cobertura de blocos? → *A:* o blueprint fixa cotas
    **antes** da amostragem; a semente só escolhe **quais** itens dentro de cada cota — cobertura invariante,
    prova determinística.
  - *Q:* O que torna um distrator válido neste exame? → *A:* ele captura um **erro conceitual nomeado** (não é
    "claramente absurdo"); o gabarito explica o porquê do erro — distrator sem erro mapeado é recusado.
- **Revisão (questões-semente, gabarito robusto).**
  - **Semente 1 — ponte cardiorrenal (nível 3, ilustrado: glomérulo com `P_BC`).** *Q:* ICC descompensada,
    edema, PVC 18, Cr 1,3→2,1 sob furosemida. A conduta mais correta é: (A) suspender o diurético e infundir
    1 L de cristaloide; (B) descongestionar — otimizar o diurético e, se resistente, ultrafiltração dosada ao
    refilling; (C) iniciar HDI de alta eficiência imediata; (D) reduzir o diurético e observar. → *Gabarito:*
    **(B)**. *Porquê:* a Cr subiu por **`P_BC↑`** (congestão/pressão venosa renal) fechando o gradiente de
    Starling (M37/M1); descongestionar **reabre** a filtração e melhora a Cr; se o néfron não responde (braking,
    M17), a UF remove **volume** por TMP, vigiando a janela de refilling (M23/M24). *(A) errado:* dar volume
    **eleva** a pressão venosa renal e piora os dois órgãos — o erro "rim congesto confundido com rim seco"
    (espelha Choca M5, responsivo≠tolerante). *(C) errado:* sem gatilho emergencial e com risco hemodinâmico, a
    HDI rápida só adiciona risco (M36/M24). *(D) errado:* subtratar a congestão perpetua o `P_BC↑`. Educacional.
  - **Semente 2 — ponte volume (nível 2, textual).** *Q:* Pós-ressuscitação volêmica ampla por sepse (Choca
    M25), agora anasarca, oligúrico, PVC alta, furosemida sem resposta. O mecanismo dominante da oligúria e a
    saída são: → *Gabarito:* **congestão/sobrecarga (letra O do AEIOU, M35)** com `P_BC↑` e resistência
    diurética (M17); saída = **UF** (remoção de volume por TMP) se o diurético falhar (M23/M37). *Porquê:* o
    volume que ressuscitou virou sobrecarga (responsivo≠tolerante, Choca M5); o problema é **volume**, removível
    por pressão, não por mais soluto. *Distrator "é pré-renal, repor volume":* inverte o mecanismo — daria mais
    congestão. *Distrator "ureia ainda baixa, não dialisa":* o gatilho é O (volume), não U (uremia) — número de
    ureia não governa a sobrecarga. Educacional.
  - **Semente 3 — ponte RAAS × hemodinâmica (nível 2, textual).** *Q:* Paciente inicia IECA; em 4 dias a Cr
    sobe 25%, sem hipercalemia, diurese mantida. Conduta correta e mecanismo: → *Gabarito:* **manter e
    monitorar**; a alta ≤~30% sem hipercalemia reflete a **queda hemodinâmica esperada da `P_GC`** pela
    dilatação **eferente** (menos AngII, M1/M18) — sinal de que a droga age no eixo certo. *Distrator "suspender,
    a creatinina subiu":* o reflexo errado do módulo (M18) — só se >30%, hipercalemia, ou suspeita de estenose
    bilateral (aí a TFG dependia da constrição eferente; precipício real). *Distrator "dar volume":* não há
    problema de volume; pode congestionar. *Ponte:* a face renal de Choca M28 (RAAS × vasopressores, as duas
    hemodinâmicas). Educacional.
- **Chave de ouro (questão-semente integradora — nível 3, ilustrada com árvore de decisão).**
  - **Semente 4 — escolha de modalidade (capstone M38).** *Q:* NTA séptica, anúrico, K⁺ 6,8 refratário, pH
    7,15, +6 L, noradrenalina (PAM 65), ureia 210, sonolento. A melhor modalidade e por quê: (A) HDI de alta
    eficiência imediata; (B) TRRC com efluente ~25 mL·kg⁻¹·h⁻¹ e citrato regional; (C) diálise peritoneal; (D)
    só otimizar diurético e aguardar. → *Gabarito robusto:* **(B)**. *Porquê:* mecanismo = NTA intrínseca (M16,
    volume não corrige); gatilhos AEIOU E+A+O acesos → iniciar já (M35/M36); **instável** em vasopressor (HDI →
    hipotensão, M24/Choca M28) **e** ureia altíssima com neuro (HDI rápida → desequilíbrio dialítico, M34) →
    **remoção contínua** casa com a hemodinâmica e protege o cérebro; citrato anticoagula o **circuito** sem o
    doente (M29); reajustar o antibiótico pela depuração da máquina (M32). *(A) errado:* dispara hipotensão **e**
    desequilíbrio — "mais clearance é melhor" é o erro nuclear (M34/M24). *(C) errado:* DP é lenta demais para
    K⁺ emergencial e exige peritônio/tempo (M30) — função-alvo não casa. *(D) errado:* anúrico com gatilho
    emergencial; o diurético não tem néfron respondendo — esperar lesa órgão (M36). Educacional.

---
