---
name: new-slice
description: Orquestra uma fatia vertical ponta a ponta — retomada → triagem (propõe lentes) → lentes convocadas → build → QA/reviewer → DoD → ADR/current-state. Use para qualquer incremento de comportamento.
---

# new-slice — orquestrar uma fatia vertical ponta a ponta

Esta skill conduz **um incremento de comportamento** do início ao fim: detecta o que já
está em voo, **propõe** quais lentes a fatia precisa (e por quê), convoca-as, leva ao
build via TDD, passa pelo DoD com evidência e fecha em ADR + `current-state`. É a
**espinha do processo**, não do código — quem materializa o código é a skill `new-module`.

**Compõe, não reinventa.** Esta skill **INVOCA** as superpowers e não reescreve o que elas
fazem: `superpowers:brainstorming` (cortar a fatia), `superpowers:writing-plans` (registrar
o plano), `superpowers:subagent-driven-development` (executar tarefas independentes),
`superpowers:test-driven-development` (build) e `superpowers:verification-before-completion`
(DoD). As **regras de quem convocar** moram em `.claude/convocation-matrix.md` — a triagem
**LÊ** a matriz, não a duplica. A **decisão de forma** mora no agente `architect`. A
**materialização das 4 camadas** mora na skill `new-module`. Esta skill só **orquestra**.

## Não há agente-orquestrador — o maestro é o loop principal

Não existe um "agente que coordena". **Quem executa esta skill (o loop principal) é o
maestro.** Ele convoca lentes como **subagents** e skills como passos, mas a coordenação é
dele. Isso importa porque o **ESTADO da fatia mora em três lugares**, e é o que torna a
**retomada** possível:

1. **Task-list da sessão** — o progresso vivo do passo atual (efêmero, morre com a sessão).
2. **Repo-resident** — o **plano** em `docs/superpowers/plans/` (caixas `[ ]`/`[x]`), o
   **git** (branch da fatia, commits) e `docs/how-to/current-state.md`. **Esta é a fonte de
   verdade do progresso** e sobrevive a reinícios.
3. **Hooks / DoD** — a garantia mecânica (gates do `CLAUDE.md`) de que "pronto" é pronto.

Como o estado (2) é repo-resident, qualquer sessão nova pode **reconstruir onde parou** sem
depender da memória da sessão anterior. É por isso que o passo 0 abaixo existe.

## Procedimento

### 0. RETOMADA (idempotente) — antes de qualquer coisa

Detecte se já há uma fatia **em voo** antes de começar uma nova. Procure, nesta ordem:

- um **plano com caixas abertas** (`[ ]`) em `docs/superpowers/plans/`;
- uma **branch de slice** ativa (trabalho não mergeado);
- `docs/how-to/current-state.md` marcando algo **"em andamento"**.

Se encontrar → **retome de onde parou**: o **plano é a fonte de verdade do progresso**, leia
as caixas e continue no primeiro `[ ]` aberto (não recomece nem refaça caixas `[x]`).
Se **não** encontrar → comece uma fatia nova no passo 1. Este passo é **idempotente**:
rodar a skill de novo na mesma fatia **continua**, não duplica.

### 1. TRIAGEM — propor as lentes (o humano confirma)

Leia `.claude/convocation-matrix.md` e **classifique a mudança** segundo ela:
**tipo** (texto/rename × +campo × nova forma) × **estágio** (protótipo/interno ×
produção/cliente-facing) × **risco** (baixo × alto: segurança/dado sensível/irreversível).

A partir da matriz, **PROPONHA** o conjunto **mínimo** de lentes que cobre o risco — e
**explique o porquê** de cada uma (qual gatilho da matriz a acordou). **O humano
confirma ou ajusta.** Sub-convocar (delegar a um subagent/lente) é o **default**; não
absorva no loop principal um trabalho que tem dono.

> A triagem **lê** a matriz; **não** copia as regras para cá. Se a matriz mudar, a triagem
> muda junto sem editar esta skill.

### 2. Produto (se convocado) — cortar a fatia

Se a matriz acordou **Produto**, **invoque o agente `product`**: ele **corta a fatia
vertical** (o menor incremento ponta a ponta que entrega valor) e fixa os **critérios de
aceite**, compondo `superpowers:brainstorming` no processo. Registre o resultado no plano
(`superpowers:writing-plans`).

### 3. Arquiteto (se convocado) — decidir a forma → ADR

Se a matriz acordou **Arquiteto** (muda forma, síncrono↔CQRS, extrair serviço, NFR
ambíguo, ou risco alto que **força ADR**), **invoque o agente `architect`**. Ele
interroga os NFRs, decide a forma e produz um **ADR**. Não decida forma no loop principal
quando há dono para isso.

> Se a decisão depender de **evidência externa**, a matriz acorda também o **Pesquisador**:
> **invoque o agente `researcher`**, que levanta a evidência e devolve as fontes para
> embasar a decisão de forma.

### 4. Build — materializar via TDD

Invoque a skill **`new-module`** (que por sua vez compõe
`superpowers:test-driven-development`: red → green → refactor, teste-que-falha **antes** do
código). Para fatias com várias tarefas independentes, orquestre com
`superpowers:subagent-driven-development`.

> Se a fatia **toca schema/agregado/migração/read-model**, a matriz acorda **Dados**:
> **invoque o agente `data`** (modelagem, migração segura, read-model, índices/PII). Se
> **toca uma presentation com UI**, acorda **UI/UX**: **invoque o agente `ui-ux`**. Ambos
> rodam como subagents com contexto próprio e devolvem ao build.

### 5. QA + harness-reviewer — rastreabilidade + revisão

Se a triagem os acordou (baseline em qualquer mudança de comportamento), **invoque o
agente `qa`** — que confere a **rastreabilidade** (critério de aceite ↔ teste) e a
**adequação** da cobertura — e o **agente `harness-reviewer`** — que faz a **revisão de
código**. Ambos rodam como subagents com contexto próprio.

**Achado bloqueante de qualquer um → volta pro passo 4 (build):** uma **lacuna de
adequação** apontada pelo QA, ou um achado **Critical/Important** do harness-reviewer,
reabre o build (passo 4); refaça e revalide aqui antes de seguir ao DoD.

> Se a fatia **toca infra/deploy** ou vai **perto de produção/cliente-facing**, a matriz
> acorda o **SRE/DevSecOps**: **invoque o agente `sre-devsecops`** — par operacional do
> arquiteto — para a **revisão de prontidão** (deploy, rollback, observabilidade,
> segredos, postura de segurança). Ela entra **antes/junto** do DoD; achado bloqueante
> reabre o build como os demais.

### 6. DoD gate — evidência, depois ADR + current-state

Invoque `superpowers:verification-before-completion`: **rode os gates** do `CLAUDE.md`
(build, typecheck, lint, testes, cobertura, audit conforme a mudança) e **cole a
evidência** — não afirme "passou" sem a saída do comando. Só então:

- finalize o **ADR** (se o Arquiteto foi convocado);
- atualize `docs/how-to/current-state.md` (capacidade + follow-ups);
- marque as caixas do plano em `docs/superpowers/plans/` como `[x]`.

A fatia só está **pronta** quando os três acima refletem o estado real.

## Conflito entre lentes

- **Objeção bloqueante** (ex.: reviewer/QA reprova) → **volta pro build** (passo 4); refaz
  e revalida no DoD.
- **Tensão entre lentes** (ex.: Arquiteto quer CQRS, Produto quer prazo) → **o humano
  arbitra** e a **decisão fica registrada** (no ADR e/ou no plano).
- **Override do humano** sobre uma proposta da triagem → **fica registrado** (no plano),
  para que a retomada e a auditoria saibam que foi uma escolha consciente.

## Degradação graciosa (princípio)

**Hoje TODAS as lentes (papéis) da matriz existem.** Existem de fato: a **matriz**
(`.claude/convocation-matrix.md`), os **8 agentes** — **`architect`**, **`qa`**,
**`harness-reviewer`**, **`data`**, **`sre-devsecops`**, **`ui-ux`**, **`researcher`** e
**`product`** — e a skill **`new-module`**. Nenhuma lente fica pendente: a triagem acorda
o papel e o passo correspondente **invoca o agente real**.

O **princípio** da degradação graciosa segue valendo como regra geral: se um dia uma peça
**faltar** — por exemplo as **skills ainda não criadas** (`status`, `new-presentation`,
`new-adr`, `init`) —, **anote a pendência no plano e SIGA — sem travar**. A ausência de
uma peça **nunca** bloqueia a fatia; ela vira uma nota explícita e o cuidado manual cobre o
essencial até a peça nascer.
