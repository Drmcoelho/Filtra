# FILTRA · DIALISA — a constituição

> A constituição filosófica do braço 3 do hexápode de medicina crítica. O `CLAUDE.md` é o mapa de
> trabalho (como construir); **este** arquivo é o porquê. Quando os dois discordarem sobre o espírito,
> manda este; quando discordarem sobre o procedimento, manda o `CLAUDE.md`.

---

## I. O órgão

O rim não é um filtro. É o **defensor do meio interno** — o órgão que, minuto a minuto, decide quanta água
fica, quanto sódio sai, qual o pH do sangue e o que vira urina. Recebe **20% do débito cardíaco** para
filtrar ~180 L/dia e devolver ~178,5 L: a extravagância da filtração existe para que a regulação seja fina.
A medula vive à beira da hipóxia justamente porque concentra; essa vulnerabilidade é a porta da necrose
tubular aguda.

Por isso a tese-mãe do braço:

> **A creatinina alta é uma sombra. A lesão renal aguda é a falência da regulação do meio interno —
> volume, eletrólitos, ácido-base, escórias. Decompor antes de interpretar.**

E o eixo causal, gêmeo do `PAM = DC × RVS` do Choca:

```
TFG = Kf · ( P_GC − P_BC − π_GC )
```

A mesma oligúria nasce de mecânicas opostas: `P_GC↓` (pré-renal), túbulo/`Kf` lesado (intrínseca), `P_BC↑`
(pós-renal). O número é idêntico; o mecanismo, não. Ensinar é forçar a decomposição.

---

## II. As quatro decomposições

1. **A filtração** mora entre duas resistências (aferente × eferente). A autorregulação é um platô — e tem
   um precipício. AINEs fecham a aferente; IECA/BRA relaxam a eferente. O paradoxo do eferente (a
   creatinina sobe porque a droga *funciona*) é um dos pilares do braço.
2. **O túbulo** é uma sequência de segmentos, cada um com seu transportador. Cada diurético é uma chave
   numa fechadura de **um** segmento: anidrase carbônica e SGLT2 no TCP, NKCC2 na alça, NCC no TCD,
   ENaC/receptor mineralocorticoide no ducto coletor. Aprender o segmento é aprender a droga.
3. **O meio interno** tem eixos independentes que o aluno confunde: volume ≠ tonicidade; sódio é proxy de
   água, não de sal; potássio total ≠ gradiente transcelular; cálcio sérico ≠ cálcio ionizado. A
   tonicidade (osmoles **efetivos**) governa o tamanho da célula; a osmolalidade medida inclui a ureia,
   que é inefetiva e **não move água**.
4. **A máquina** (diálise) não substitui o rim — substitui, parcialmente, algumas funções por física pura:
   difusão e convecção tiram soluto, ultrafiltração tira volume, adsorção captura o que gruda.

---

## III. A escolha do braço FILTRA · DIALISA — a fronteira aberta

Os braços-irmãos `Respira` e `Choca` adotam um hard-stop de SaMD: ensinam o mecanismo e param antes da
dose. **Este braço escolhe diferente**, por decisão explícita do autor.

> **FILTRA · DIALISA leva o mecanismo até a conduta.** Farmacologia completa dos diuréticos,
> anti-hipertensivos de ação renal, bloqueio do RAAS, o eixo endócrino-renal (EPO, vitamina D), ajuste
> renal de fármacos e prescrição de diálise entram como **conteúdo de primeira classe** — doses, faixas,
> curvas dose-resposta e sugestões de conduta inclusas.

A fronteira não desaparece; ela **muda de lugar**. O que protege o aluno não é mais a ausência da dose — é
a **forma** da dose:

- nenhuma dose solta: toda dose carrega **unidade + faixa + mecanismo** (o "por quê");
- nenhuma dose de tabela: o efeito vem do **motor** (dose-resposta computada), e a UI exibida é igual ao
  engine — o validador confere;
- a ferramenta é **educacional**: não está ligada ao prontuário nem aos monitores de um paciente real, não
  é dispositivo médico certificado, e a decisão final é sempre do prescritor.

Essa decisão vale **só para este braço** e não retroage ao hexápode. (Detalhe operacional: `CLAUDE.md` §8.)

---

## IV. O método — robustez como ética

O diferencial do projeto é técnico antes de ser estético. Cada módulo nasce de um **engine puro**: funções
determinísticas, `clampv` resiliente (nenhuma entrada propaga `NaN`), defaults sensatos, sem mutar a
entrada. Cada engine é provado por uma **bateria** — faixas fisiológicas, identidades de conservação, leis
de monotonicidade, as **pérolas** contra-intuitivas, determinismo e **fuzzing semeado ≥ 5000** com 30% de
entradas malignas. Só então a fisiologia ganha pixel: o gráfico é **computado**, não desenhado; a questão é
**gerada**, não decorada. *O motor manda no pixel.*

Invariantes inegociáveis: offline, single-file por módulo, zero dependência de runtime, sem armazenamento,
engine antes da UI, física viva, português do Brasil, e o portão `npm run check` — **0 falhas ou não entra**.

---

## V. O mapa maior

FILTRA não é uma ilha. Recebe o sangue que o Choca entrega (perfusão renal = DC × pressão); a síndrome
cardiorrenal e a hepatorrenal são pontes vivas; o ácido-base renal conversa com a ventilação do Respira; a
uremia e os distúrbios de potássio voltam a falar com o coração e com a consciência. O alvo final é um
sistema em que cada botão obedeça à fisiologia renal e cada módulo pertença a um mapa causal que liga o rim
ao coração, ao pulmão, ao metabolismo e ao cérebro.

---

`CRM-SP 151.318 · Dr. Matheus M. Coelho · Limeira`
