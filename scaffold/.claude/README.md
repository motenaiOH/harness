# `.claude/` — a camada de processo (skills + agents + matriz)

> Esta pasta é **copiada para a raiz do projeto** na instanciação do harness. Por isso
> tudo aqui se refere a caminhos **project-relative** (`.claude/...`, `docs/...`,
> `apps/...`) — **sem** o prefixo `scaffold/`, que só existe no repositório-modelo.

O que mora em `.claude/` é a **espinha do processo**, não do código: os **procedimentos**
que o loop principal executa, os **papéis** de julgamento independente que ele convoca, e
as **regras de triagem** que decidem quem é convocado. É **business-stripped** — usa só
placeholders (`<App>`, `<Feature>`, `<Entity>`, `<Tenant>`, `<Presentation>`); nenhum
termo de domínio.

## O que tem dentro

```
.claude/
├── README.md                 ← este arquivo
├── convocation-matrix.md     ← regras da TRIAGEM (gatilho → lente)
├── agents/                   ← julgamento independente (subagents)
│   ├── architect.md
│   ├── qa.md
│   ├── harness-reviewer.md
│   ├── data.md
│   ├── sre-devsecops.md
│   ├── ui-ux.md
│   ├── researcher.md
│   └── product.md
└── skills/                   ← procedimentos que o loop principal executa
    ├── new-slice/SKILL.md
    └── new-module/SKILL.md
```

- **`skills/`** — **procedimentos** que **o loop principal** executa como passos. Não são
  agentes; são roteiros. `new-slice` **orquestra** uma fatia vertical ponta a ponta
  (retomada → triagem → lentes → build → DoD → ADR/current-state) e `new-module`
  **materializa** as 4 camadas de um bounded context a partir dos READMEs de camada.
- **`agents/`** — **papéis** de julgamento independente, rodados como **subagents**. Têm
  contexto próprio e empurram contra gold-plating; um subagent **não** auto-carrega o
  `CLAUDE.md`, então cada agente lê a fonte autoritativa no início do trabalho. Hoje
  existem **os 8**: o `architect` (decide **forma** e **NFR**, produz um ADR), o `qa`
  (rastreabilidade critério↔teste + adequação), o `harness-reviewer` (revisão de código),
  o `data` (schema/migração/read-model/PII), o `sre-devsecops` (prontidão de
  infra/deploy/segurança), o `ui-ux` (presentation com UI), o `researcher` (evidência
  externa) e o `product` (corte de fatia + critérios de aceite).
- **`convocation-matrix.md`** — as **regras da triagem**: o mapa *gatilho da fatia → lente
  a acordar* + os modificadores de estágio × risco. A skill `new-slice` **lê** a matriz na
  triagem; não a duplica. Mudou a matriz → a triagem muda junto, sem editar a skill.

## O maestro é o loop principal — não há agente-orquestrador

Não existe um "agente que coordena". **Quem executa as skills (o loop principal) é o
maestro.** Ele convoca **lentes** como subagents e **skills** como passos, mas a
coordenação é dele. Isso importa porque o **estado** de uma fatia não vive na cabeça de um
orquestrador; ele é **repo-resident**, em quatro lugares:

1. **Task-list da sessão** — o progresso vivo do passo atual (efêmero, morre com a sessão).
2. **Plano + git** — o plano em `docs/superpowers/plans/` (caixas `[ ]`/`[x]`) e o git
   (branch da fatia, commits). **Fonte de verdade do progresso**; sobrevive a reinícios.
3. **`docs/how-to/current-state.md`** — o mapa de capacidades + follow-ups (reinício barato).
4. **Hooks / DoD** — a garantia mecânica (gates do `CLAUDE.md`) de que "pronto" é pronto.

Como o estado é repo-resident, **qualquer sessão nova reconstrói onde parou** sem depender
da memória da sessão anterior — é o que torna a **retomada** (passo 0 do `new-slice`)
possível.

## O que existe HOJE × o que chega nas fases futuras

Esta camada é construída de forma incremental. O **backbone** já está de pé; o resto é
anotado como pendente pela triagem e **nunca trava** a fatia (degradação graciosa).

**Existe hoje (backbone + todas as lentes):**

- a **matriz** de convocação (`convocation-matrix.md`);
- o agente **`architect`** (`agents/architect.md`);
- os **agentes baseline** **`qa`** (rastreabilidade critério↔teste) e
  **`harness-reviewer`** (revisão de código), acordados pela matriz em qualquer mudança de
  comportamento e invocados pelo passo 5 do `new-slice`;
- os **agentes condicionais** — **`data`** (schema/agregado/migração/read-model/PII),
  **`sre-devsecops`** (infra/deploy/prontidão/segurança), **`ui-ux`** (presentation com UI),
  **`researcher`** (evidência externa) e **`product`** (escopo/valor novo) —, acordados pelos
  gatilhos específicos da matriz e invocados pelos passos 2/3/4/5 do `new-slice`;
- as skills **`new-slice`** e **`new-module`** (`skills/`).

**Chega nas fases futuras:**

- **Skills restantes** — `status` (snapshot do estado), `new-presentation` (adicionar uma
  borda sobre o core), `new-adr` (conduzir um ADR) e `init` (instanciar o harness num projeto).

> A matriz lista **todas as 7 lentes** (Produto, Arquiteto, Dados, UI/UX, QA,
> SRE/DevSecOps, Pesquisador) e **todas já existem** como agentes (`architect`, `qa`,
> `harness-reviewer`, `data`, `sre-devsecops`, `ui-ux`, `researcher`, `product`). A triagem
> as conhece ao ler a tabela e cada passo invoca o agente real. O **princípio** da
> degradação graciosa segue valendo: se uma peça faltar (ex.: as skills ainda não criadas),
> vira nota explícita no plano e o cuidado manual cobre o essencial **sem travar**.

## Como isto se encaixa

`new-slice` é a **espinha do processo** e `new-module` a **materialização do código**; o
`architect` é o **dono da decisão de forma**; a matriz é a **regra de quem entra**. A
postura canônica (síncrono por default, CQRS só sob NFR, múltiplas presentations sobre um
core, monólito modular) **não vive aqui** — mora no `CLAUDE.md` da raiz e em
`docs/explanation/architecture.md`. Os procedimentos **apontam** para lá; não a reescrevem.
