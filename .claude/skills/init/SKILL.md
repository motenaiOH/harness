---
name: init
description: Bootstrap de um projeto novo a partir deste modelo — copia o scaffold + a metodologia, renomeia escopo/módulo, roda o Passo-0 (forma/NFR) e purga proveniência. Roda a partir do repo do modelo. NÃO é copiada para o projeto.
---

# init — instanciar o modelo num projeto novo

> **Esta skill é do repo do MODELO e NÃO é copiada para o projeto.** Ela é a única skill
> assim: vive em `.claude/skills/init/SKILL.md` na raiz do modelo e roda **a partir** daqui
> para **gerar** um projeto novo. Por ser quem copia, ela **menciona** `scaffold/`,
> `CLAUDE.md` e `checklists/` como **ORIGENS** — isso é correto, e a regra geral "não
> referencie `scaffold/` no texto das skills" **não se aplica a esta skill**.

Esta skill **instancia** o harness: parte do repo do modelo e produz um projeto novo já
montado — a **espinha** (scaffold), a **metodologia** (CLAUDE.md + checklists da raiz) e os
**agents/skills** —, renomeia escopo e módulo para os reais, roda o **Passo-0** (decisão de
forma/NFR → primeiro ADR) e **purga a proveniência** do modelo. O resultado é um projeto
que já nasce com o pyramid de testes, os gates do DoD e o processo de fatia funcionando.

**Origens (o que ela COPIA) vs o que NÃO copia — leia antes de mexer em arquivo:**

- **Espinha** = `scaffold/*` do modelo → raiz do projeto novo (configs, `.claude/`
  [agents + skills + matriz], `apps/`, `packages/`, `docs/` **seed**, `checklists/`
  companions, compose, CI, etc.).
- **Metodologia** = `CLAUDE.md` (raiz do modelo) + `checklists/*` de metodologia (raiz do
  modelo) → raiz do projeto, **mesclando** com os companions já vindos de
  `scaffold/checklists/`.
- **NÃO copie o docs do modelo** (o diretório `docs/` da raiz) — ele é sobre o **modelo**;
  o projeto usa o `docs/` **seed** que veio do scaffold.
- **NÃO copie o .claude do modelo** (o diretório `.claude/` da raiz) — `init` e o
  `agnosticism-auditor` são **manutenção do modelo**, não pertencem ao projeto. O projeto
  recebe o `.claude/` que vem de `scaffold/` (agents + skills de processo + matriz).

## Pré-requisitos (recolher antes de qualquer cópia)

1. O **diretório do projeto novo** (destino vazio ou recém-criado).
2. O **escopo** da org para o monorepo (ex.: `@suaorg`), que substitui `@app/*`.
3. O **nome do primeiro bounded context** (substitui o módulo `feature/`).
4. A **`<Entity>`** real do primeiro contexto (substitui `<entity>`/`widget`/`<name>`).

## Procedimento

### 1. Copiar a espinha (scaffold → raiz do projeto)

Copie **todo** `scaffold/*` para a **raiz do projeto novo**. Isso traz as configs do
monorepo, o `.claude/` de processo (agents + skills + `convocation-matrix.md`), `apps/`,
`packages/`, o `docs/` **seed**, os companions em `checklists/`, compose, CI e demais
andaimes. É a espinha — o esqueleto que os passos seguintes preenchem.

### 2. Copiar a metodologia (raiz do modelo → raiz do projeto)

A metodologia mora na **raiz do modelo**, **não** em `scaffold/`. Copie para a raiz do
projeto, **mesclando** com os companions que já vieram de `scaffold/checklists/`:

- `CLAUDE.md` (as diretrizes obrigatórias: TDD, API First, Doc First, DoD, cobertura);
- os `checklists/*` de **metodologia**: `definition-of-done`, `new-vertical-slice`,
  `new-module`, `new-adr`, `testing-strategy`, `security-defense-in-depth` e
  `aprendizados`.

**Não** sobrescreva os companions; **mescle**. E reafirme as exclusões do passo anterior:
**não** copie o `docs/` do modelo (use o seed do scaffold) nem o `.claude/` do modelo (use o
de scaffold).

### 3. Renomear o escopo do monorepo

Troque `@app/*` → `@suaorg/*` em `package.json`, `pnpm-workspace.yaml`, nos `tsconfig` e em
todos os imports que referenciam os pacotes internos. O escopo precisa ser consistente para
o workspace resolver os pacotes compilados.

### 4. Renomear o módulo (primeiro bounded context)

Renomeie o módulo `feature/` para o **primeiro bounded context** real, e substitua os
placeholders da entidade — `<entity>` / `widget` / `<name>` — pela **`<Entity>`** real, em
pastas, arquivos, tipos, contratos e testes. Preserve a **linguagem ubíqua**: o termo
escolhido é o mesmo em código, contrato, docs, Swagger e mensagens de evento.

### 5. Passo-0 — decidir a forma (NFR) → primeiro ADR

Antes de evoluir comportamento, fixe a **forma** do projeto: **invoque o agente
`architect`** para as decisões de forma (quais presentations expor; síncrono vs CQRS;
extrair-serviço ou monólito modular; quais NFRs mandam). O resultado vira o **primeiro
ADR**, criado via a skill **`new-adr`**. Não decida forma no loop principal quando há dono
para isso.

### 6. Purgar a proveniência do modelo

Remova os comentários de **proveniência** que só fazem sentido no modelo: instruções do tipo
"Replace the @app/* scope…", cabeçalhos `SPINE (illustrative)`, notas de "Status do
scaffold" e qualquer referência que aponte de volta para o modelo. Andaime esquecido no
código de produção é dívida e confunde quem entra depois.

### 7. Guard anti-vazamento

Rode o grep da seção **"Guard anti-vazamento"** de `checklists/aprendizados.md` (já copiado
no passo 2). Ele confirma duas coisas: **(a)** que nenhum termo do **modelo/origem** ficou
no repo; e **(b)** que nenhum placeholder `<App>` / `<Feature>` / `<Entity>` sobrou onde já
deveria ser o nome real (escopo, módulo, entidade). Resíduo encontrado → volte ao passo
correspondente e purgue antes de seguir.

### 8. Validar (gates do DoD)

Prove que o projeto bootstrapado roda — evidência, não afirmação:

- `pnpm install` (instala o husky via script `prepare` — o enforço local nasce aqui);
- `pnpm --filter @suaorg/contracts build` (o artefato compartilhado builda **antes** dos
  consumidores);
- `mkdocs build --strict` (docs seed sem link quebrado / página fora do nav);
- e os demais **gates do DoD** do `CLAUDE.md` (typecheck, lint, test, cobertura, audit)
  conforme o que o bootstrap tocou.

## Saída

Reporte: o **diretório** do projeto criado; o **escopo** e o **módulo/`<Entity>`** aplicados;
a confirmação de que o `docs/` e o `.claude/` do **modelo** **não** foram copiados (só o
scaffold + a metodologia da raiz); o **primeiro ADR** gerado no Passo-0; o resultado do
**guard anti-vazamento**; e a **evidência** dos gates de validação. O entregável é um projeto
bootstrapado com o harness completo — espinha + metodologia + agents/skills — e o
`docs/how-to/current-state.md` inicial preenchido.
