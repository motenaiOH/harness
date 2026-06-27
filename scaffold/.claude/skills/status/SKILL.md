---
name: status
description: Read-only — responde "onde paramos / qual o próximo passo / há objeção aberta?" lendo current-state, planos abertos e git, sem entrar no new-slice nem mudar nada. Use para retomar contexto.
---

# status — onde paramos? (read-only)

Esta skill responde, **sem alterar nada**, três perguntas: **onde paramos**, **qual o
próximo passo**, e **há objeção/decisão aberta**. É a resposta **barata** para "onde
paramos?" — lê o estado repo-resident e o git e relata. É **read-only por contrato**: não
materializa código, não roda gates, não continua a fatia.

**Compõe, não reinventa — e não substitui o `new-slice`.** O estado da fatia mora em três
lugares (plano, git, `current-state`); esta skill apenas os **lê e sintetiza**. Ela **não**
faz o passo 0 (retomada) do `new-slice` — esse de fato **continua** a fatia. `status` só
**reporta**; quem quer prosseguir invoca o `new-slice` depois.

## Procedimento (read-only — nada é alterado)

### 1. Ler o snapshot de capacidades

Leia `docs/how-to/current-state.md` — o mapa repo-resident de capacidades + follow-ups.
É a foto do que existe e do que está em andamento.

### 2. Varrer os planos por fatia em voo

Varra `docs/superpowers/plans/` procurando planos com **caixas `[ ]` abertas** (a fatia em
voo) e identifique o **primeiro passo aberto** (`[ ]`). Caixas `[x]` já estão feitas — não
as conte como pendência.

### 3. Checar o git

Olhe o estado do git **sem mudar nada**: branch atual, últimos commits e mudanças não
commitadas (trabalho em andamento que ainda não virou commit).

### 4. Reportar (e só reportar)

Sintetize, em poucas linhas:

- **Onde estamos** — capacidade atual (do `current-state`).
- **Fatia em voo** — qual plano tem caixas abertas.
- **Próximo passo** — o primeiro `[ ]` aberto do plano.
- **Objeção / decisão aberta** — qualquer bloqueio, override registrado ou decisão pendente
  (no plano ou no `current-state`).

**Nada é alterado.** Não marque caixas, não commite, não rode build/gates.

### 5. Saber o limite

Esta skill **não** continua a fatia. Para de fato **retomar e prosseguir**, o caminho é o
**passo 0 (retomada) do `new-slice`**, que lê o mesmo estado e continua no primeiro `[ ]`.
`status` é só o diagnóstico barato que antecede essa decisão.

## Saída

Um relatório curto: onde estamos + fatia em voo + próximo passo aberto + objeção/decisão
aberta — explicitando que **nada foi alterado** (read-only).
