# FILTRA · DIALISA

> Braço 3 do **hexápode de medicina crítica** — uma máquina educacional **offline** de fisiologia renal
> causal e farmacologia clínica aplicada. Filtração, meio interno e substituição renal, do compartimento de
> água à prescrição de diálise. *O motor manda no pixel.*

`CRM-SP 151.318 · Dr. Matheus M. Coelho · Limeira`

---

## O que é

Um conjunto de módulos `filtraN.html` **single-file**, que rodam sem rede e sem dependências de runtime.
Cada módulo ensina um mecanismo renal decompondo-o: o número (creatinina, Na⁺, TFG) é uma sombra; a
fisiologia mora nos termos que o produziram. O aluno não decora listas — ele move as alavancas e vê a
consequência computada ao vivo.

Eixo causal do braço (gêmeo do `PAM = DC × RVS` do Choca):

```
TFG = Kf · ( P_GC − P_BC − π_GC )
```

A mesma oligúria nasce de mecânicas opostas — pré-renal (P_GC↓), intrínseca (túbulo/Kf), pós-renal (P_BC↑).
**Decompor antes de interpretar.**

## Escopo (decisão do autor — só para este braço)

Diferente dos braços-irmãos `Respira` e `Choca` (que param antes da dose), o FILTRA · DIALISA **abre o
escopo** para a farmacologia clínica aplicada: diuréticos, anti-hipertensivos de ação renal, bloqueio do
RAAS, eixo endócrino-renal (EPO, vitamina D), ajuste renal de fármacos e prescrição de diálise — com doses,
faixas e curvas dose-resposta. A proteção muda de lugar: nenhuma dose é solta, toda dose carrega **unidade +
faixa + mecanismo** e é **computada pelo motor**. Ferramenta **educacional**; não é dispositivo médico, não
está ligada a paciente real, e a decisão final é sempre do prescritor. (Detalhes: `CLAUDE.md` §8.)

## Formato de cada módulo

Single-file, offline, com:

- **Caso** — 5 atos, "prever-depois-revelar";
- **Trilha** — socrática, ≥9 passos;
- **Instrumento** — gráfico **computado ao vivo** (canvas), com a geometria vinda do engine;
- **Lab** — sliders + veredito;
- **Ilustração viva** — conceitos em **SVG inline**, computados do engine quando o dado é numérico
  (mini Darrow–Yannet, barras osm×tonicidade, setas de fluxo de água, esquema do néfron/segmento);
- **Avaliação** — **dois blocos**: ilustrado (10, cada questão com sua ilustração) e textual (10).

E o engine por trás obedece ao padrão de **robustez inigualável**: funções puras, `clampv` resiliente
(nenhum `NaN`), identidades de conservação, leis de monotonicidade, as **pérolas** contra-intuitivas,
determinismo e **fuzzing semeado ≥ 5000**.

## Como rodar

```bash
npm install      # instala jsdom (dependência só de validação)
npm run check    # engine (testes Node) + validador (jsdom) — 0 falhas ou não entra
```

Para ver um módulo, abra o `.html` direto no navegador (ex.: `filtra0.html`) ou comece pelo índice
`filtra.html`. Nada precisa de servidor.

| script | o que faz |
|---|---|
| `npm test` | roda os testes de engine (`testN.node.js`) |
| `npm run validate` | roda os validadores jsdom (`validateN.js`) |
| `npm run check` | `test` + `validate` (o portão do CI) |

## Estrutura

```
filtra.html              índice do braço (navegação do hexápode)
filtraN.html             módulo N, single-file
build/mN/modelN.js       engine puro
build/mN/testN.node.js   bateria de robustez (Node)
build/mN/validateN.js    validador jsdom (engine ≡ UI, dois bancos, cromo, dose↔mecanismo)
curriculum.json          manifesto curricular (escada + formato)
FILTRA.md                a constituição (o porquê)
CLAUDE.md                o mapa de trabalho (o como)
```

## Estado

| módulo | tema | estado |
|---|---|---|
| **M0** | Compartimentos do líquido corporal (Darrow–Yannet) | **disponível** |
| M1–M18 | FILTRA: néfron → meio interno → farmacologia integrada | planejados |
| M19–M38 | DIALISA: substituição renal e terapia crítica | planejados |
| M39 | exame global de domínio | planejado |

A escada completa (40 módulos) está em `curriculum.json` e detalhada em `CLAUDE.md` §4.4.

## Documentação

- **`FILTRA.md`** — a constituição filosófica (teses, fronteira, método).
- **`CLAUDE.md`** — o guia operacional canônico (a escada, o rito, o padrão de robustez, a fronteira clínica).

---

*Aviso: conteúdo educacional de fisiologia e farmacologia renal. Não substitui julgamento clínico nem se
conecta a um paciente real.*
