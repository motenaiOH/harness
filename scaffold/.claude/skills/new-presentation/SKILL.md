---
name: new-presentation
description: Adiciona uma nova presentation (adapter de borda — CLI, API pública, gRPC, GraphQL, consumidor de fila, app web/mobile) sobre use-cases EXISTENTES, sem tocar domain/application. Use ao expor uma capacidade por um novo canal.
---

# new-presentation — novo adapter de borda sobre use-cases existentes

Esta skill **expõe uma capacidade já construída por um novo canal**: adiciona uma
presentation (CLI, API pública, gRPC, GraphQL, consumidor de fila, app web/mobile) **sobre
use-cases que já existem**, sem tocar em `domain` nem em `application`. A regra de negócio
não se duplica — o novo canal apenas a alcança por um protocolo diferente.

**Compõe, não reinventa.** Esta skill **INVOCA** `superpowers:test-driven-development`
(red → green → refactor) para o build; não reescreve TDD. A forma do adapter de borda já
vive no README da camada de presentation do módulo-exemplo — esta skill o **LÊ**, não o
copia. Se o novo canal é uma **decisão de forma**, ela aponta para o agente `architect` (e
o ADR via `new-adr`), não decide sozinha.

> **Stack-exemplo: NestJS (HTTP) é só um exemplo.** O procedimento — adapter fino, traduz
> protocolo ⇄ use-case, escopo pelo contexto autenticado, contract-first, TDD na fronteira
> — vale igual para CLI, gRPC, GraphQL ou um app web/mobile. Só os mecanismos mudam. Anote
> isso no resultado para quem adaptar a outra stack.

## Pré-requisitos (recolher antes de tocar em arquivo)

1. **Tipo de presentation** — qual canal (CLI? API pública? gRPC? GraphQL? consumidor de
   fila? app web/mobile?).
2. **Quais use-cases existentes ela expõe** — a capacidade já materializada que será
   alcançada por este canal. Se o use-case **não existe ainda**, isto não é uma
   presentation: volte para `new-module` / `new-slice` primeiro.

## Procedimento

### 1. Princípio — adapter de borda FINO

A presentation é um adapter **fino** que traduz **protocolo ⇄ `useCase.execute(...)`** e
**nada mais**: **sem regra de negócio** (ela mora em `domain`/`application`). O escopo vem
sempre do **contexto autenticado** (o ator/tenant que o canal autenticou), **nunca do
input do cliente**. Leia o
`apps/api/src/modules/<feature>/presentation/README.md` — ele traz a forma canônica do
adapter de borda (HTTP é só o exemplo; os mesmos princípios valem para os demais canais).

### 2. Materializar o adapter (reusando os mesmos use-cases)

Escolha a forma do canal e materialize-o **reusando os use-cases existentes** via
composition root:

- **Novo protocolo no mesmo app** → subpasta na camada:
  `presentation/http|cli|graphql|...` ao lado do que já existe.
- **Novo deployable** → uma nova app `apps/<presentation>` (ex.: um CLI ou um app web
  separado).

Cada canal **resolve seu próprio trust boundary**: web = proxy same-origin (o Bearer nunca
chega ao browser); CLI / API pública = client-credentials ou API key. O adapter autentica,
deriva o escopo do **contexto autenticado**, chama o use-case e traduz a saída para o
protocolo.

### 3. Convocar a lente certa (se for o caso)

- **Tem UI** (app web/mobile, telas) → **convoque o agente `ui-ux`**.
- **Canal novo significativo** (decisão de forma: novo trust boundary, novo protocolo de
  borda, nova superfície pública) → **convoque o agente `architect`**, que produz um
  **ADR** (use a skill `new-adr` para registrá-lo).

### 4. Contrato — contract-first

Reuse `packages/contracts` para os tipos compartilhados. Se o canal precisa de DTOs de
borda próprios (forma do protocolo), **defina-os antes** da implementação (API First):
classes-espelho do contrato, sem reintroduzir regra de negócio.

### 5. Build — TDD na fronteira da nova presentation

Invoque `superpowers:test-driven-development`: escreva o teste-que-falha **antes** do
adapter (red → green → refactor) e um **e2e na fronteira** do novo canal (a requisição
real entra pelo protocolo e exercita o use-case até a saída). O adapter é fino o bastante
para ser testável diretamente; o e2e prova a fronteira.

## Saída

Reporte: o **canal** materializado, **onde** (subpasta `presentation/...` ou nova
`apps/<presentation>`), **quais use-cases existentes** ele reusa, **como** foi ligado ao
composition root, o **trust boundary** escolhido, e os testes (unidade + e2e de fronteira).
Anote que o conteúdo estampa a **stack-exemplo** e que outra stack adapta o mesmo
procedimento. Se um ADR foi gerado (canal novo) ou a UI foi tratada (`ui-ux`), aponte-os.
