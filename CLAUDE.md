# CLAUDE.md

Este arquivo guia o Claude Code (claude.ai/code) ao trabalhar neste repositório. É o
**"system prompt do projeto"**: o agente o carrega **sempre**, antes de qualquer
tarefa. Mantenha-o transversal e curto — regra que vale só para um app vai no
`apps/<app>/CLAUDE.md` (ver "Documentação por escopo").

> Este é o `CLAUDE.md` **do modelo de harness** — genérico e *business-stripped*. Ao
> instanciar num projeto real, substitua os placeholders: **`<App>`** (escopo
> `@app/*`), **`<Feature>`** (módulo de feature), **`<Entity>`** (entidade do domínio,
> ex.: "widgets"), e os termos da sua **linguagem ubíqua**. Os limiares de gate
> (cobertura, mutação) vêm com defaults sugeridos — calibre sem re-derivar.

## O que é

Um **harness de referência**: uma **API monólito-modular autenticada** servida a **uma
ou mais presentations** (web, mobile, CLI, API pública, integrações) → (opcional, sob
NFR) um broker de mensagens → um worker que persiste no banco, mais cache,
observabilidade (OTel → stack de métricas/traces/logs), Docker Compose, deploy K8s
(Helm), CI e a pirâmide completa de testes. O exemplo concreto materializa **UMA**
presentation (web + proxy same-origin) como ilustração — não como o único canal. O loop
ponta a ponta é real e validado; a **lógica de negócio é deliberadamente trivial** no
esqueleto (a feature ecoa/transforma a entrada) — o valor está na *receita*, não no
domínio.

Convenção: **documentação em português, código/identificadores em inglês.**

## Diretrizes de desenvolvimento (OBRIGATÓRIAS)

Estas diretrizes são **condição para qualquer mudança**. Não são opcionais — se uma
delas não puder ser cumprida, **pare e explique o porquê antes de seguir**. (Processo
é normativo, não aspiracional: o que é "decidido mas não enforçado" é pulado sob
pressão.)

- **TDD (red → green → refactor):** escreva/atualize o teste que falha **antes** do
  código de produção. Nada de "testes depois". Bug corrigido = teste de regressão na
  camada certa. Use a skill `superpowers:test-driven-development`.
- **API First:** defina o **contrato antes** da implementação. O contrato vive em
  `packages/contracts` (eventos + DTOs **zod**, com o tipo derivado via `z.infer`) e
  no OpenAPI da API. Mudou comportamento de rota/evento → **atualize o contrato
  primeiro**, depois implemente.
- **Doc First / Doc as Code:** decisões e uso são documentados **junto** com a
  mudança, em `docs/` (Diátaxis) e como **ADR** em `docs/adr/` para decisões
  arquiteturais. **Nunca edite um ADR aceito** — crie um substituto que marca o
  anterior como "Substituído". A doc mora **junto** do que descreve e **linka** em vez
  de copiar (duplicação apodrece e vira mentira em semanas).
- **Swagger / OpenAPI:** todo endpoint é anotado (`@ApiTags`, `@ApiBody`,
  `@ApiOkResponse`, `@ApiBearerAuth`). Todo `@Query()`/`@Param()` exige decorator
  explícito (`@ApiQuery`/`@ApiProperty`/`type:`): o gate de drift compara o doc gerado
  **offline** com o snapshot commitado `apps/api/openapi.json` — sem decorator,
  offline ≠ runtime e o CI quebra. Rota nova sem doc de Swagger = **incompleta**.
- **Arquitetura (clean arch / DDD / monólito modular):** respeite as camadas
  (`domain → application → infrastructure → presentation`); dependências apontam
  **para dentro**; o domínio **não importa framework**; ligue ports→adapters só no
  composition root (`*.module.ts`). Lógica nova de negócio entra no `domain`/
  `application`, **não** no controller. Use-cases são classes simples (sem DI do
  framework) — testáveis por construção direta. A camada `presentation` é **uma borda**
  (HTTP é só um exemplo — CLI/gRPC/GraphQL/consumidor-de-fila são outras): um adapter
  fino que traduz protocolo ⇄ use-case; o **core não conhece o canal**.
- **Fluxo simples por default; CQRS/assíncrono só sob NFR (+ ADR):** o write-path
  **padrão** é direto e síncrono (use-case valida → persiste no repositório →
  responde). Separar write-path de persist-path (evento durável → worker idempotente →
  read model) é **CQRS/write-behind** — adote **somente** quando um requisito
  **não-funcional** concreto justificar (assimetria leitura/escrita, escala de leitura,
  picos de escrita, desacoplamento temporal, fan-out), com o custo (broker,
  idempotência, read-your-writes eventual) registrado em **ADR**.
- **Monólito modular por default:** bounded contexts são módulos no **mesmo deploy**;
  extrair um serviço próprio exige **razão concreta** (NFR de escala/isolamento/
  ownership/ciclo de release), **nunca estética**.
- **Linguagem ubíqua:** os termos do domínio (ex.: `<Entity>`, `conversation`,
  `authorId`, `received`, …) são **os mesmos** em código, testes, docs, Swagger e
  mensagens de evento. **Não introduza sinônimos** para o mesmo conceito (ex.: o ator
  que envia é sempre `authorId` — nunca `senderId`/`userId`).
- **Evidência antes de afirmação:** nunca declare "pronto/passa/corrigido" sem **rodar
  o comando-gate e colar a saída** (skill `superpowers:verification-before-completion`).
  Fatias que tocam a UI terminam com **verificação manual do render**.

### Definition of Done (toda tarefa)

Uma tarefa só está "pronta" quando **todos** os itens abaixo passam — rode-os e cole a
**evidência**, não afirme sem executar:

1. **Sempre buildar:** `pnpm build` e, quando tocar imagem/infra, `docker compose
   build` verdes.
2. **Sempre executar os testes:** `pnpm typecheck && pnpm lint && pnpm test`; e
   `pnpm test:int`, `pnpm test:e2e`, `pnpm eval` quando a mudança os afetar.
3. **Sempre atualizar/adicionar testes:** toda mudança de comportamento vem com teste
   na camada certa (unidade/propriedade/integração/E2E/eval). Bug corrigido = teste de
   regressão.
4. **Sempre atualizar a documentação:** `docs/`, ADRs e anotações Swagger acompanham a
   mudança.
5. **Cobertura ≥ 80% nas regras de negócio:** camadas `domain` + `application`
   (`pnpm --filter @app/api test:cov` aplica o threshold; o build quebra abaixo de
   80%). **O `include` do vitest é restrito a essas camadas** — cobrir o repo inteiro a
   80% é outra coisa; o gate mira regra de negócio.
6. **Mutação ≥ 90% nas regras de negócio:** `pnpm --filter @app/api mutation`
   (Stryker, escopo `domain`+`application`+`common/crypto`; `break: 90`). **Cobertura
   prova que a linha rodou; mutação prova que o teste assertou** — os dois são
   exigidos. Roda no CI (lento), não no pre-commit.
7. **Sempre auditar dependências:** `pnpm audit --audit-level high` sem
   vulnerabilidades **high/critical** (gate do CI no estágio `static`). Corrija
   subindo o pacote e revalide a pirâmide. `moderate`/`low` não bloqueiam mas são
   registradas; advisory `high+` sem correção viável exige **ADR antes** de seguir
   (política *corrigir-e-travar*: remedie o existente e só então ative/aperte o gate).
8. **Manter a continuidade do projeto:** ao fim de cada iteração, atualize a **memória
   do agente** **e** `docs/how-to/current-state.md` (mapa repo-resident de capacidades
   + follow-ups). Uma iteração só está "pronta" quando os **dois** refletem o estado
   real. Garante reinício barato a qualquer momento. (Este é o único item sem gate
   automático — não esqueça.)

### Enforço em três camadas (não depende de memória)

O DoD é enforçado por **automação**, não pela disciplina de quem commita —
**defense in depth**: três camadas independentes onde um skip rápido nunca enfraquece
o contrato.

**Camada 1 — git hooks locais (Husky, feedback rápido).** Instalados no `pnpm install`
via script `prepare`; otimizados por custo de feedback:

- **pre-commit:** `lint-staged` (prettier nos arquivos staged) → `build @app/contracts`
  → `typecheck` → `lint` → `test` → `eval`. (lint-staged faz **só formatação**, não
  ESLint — o ESLint é gate separado em `pnpm lint`.)
- **commit-msg:** `commitlint` (**Conventional Commits** obrigatório — alimenta
  changelog/semver/release).
- **pre-push:** `test:cov` (≥ 80%) + `audit --audit-level high` + `openapi:generate`
  seguido de `git diff --exit-code apps/api/openapi.json` (impede snapshot de OpenAPI
  desatualizado de chegar ao CI).
- **lint:** `--max-warnings 0` (warning quebra o build — gate binário).

**Camada 2 — CI estagiado (a fonte da verdade, não-contornável).** DAG com
dependências (`needs`): `commitlint || static` (audit + lint + typecheck +
unidade/propriedade) → `mutation` + `integration` (Testcontainers, paralelos) →
`e2e` (Playwright vs o stack). O que precisa de Docker/é lento (integração, e2e,
mutação) fica **só** no CI. O bypass local `--no-verify` existe para emergência e
**nunca contorna o CI**.

**Camada 3 — proteção de branch.** Trabalhe em `feat/*`, abra PR, aguarde os status
checks (static/mutation/integration/e2e + commitlint) e revisão antes do merge. Sem
commits diretos na default. (Ressalva: ativar proteção de branch pode ser
*platform-gated* em certos planos — registre como follow-up se ainda aberto, não
assuma que está protegida só porque foi decidido.)

### Documentação por escopo (critério de evolução)

A documentação mora **junto** do que descreve e **não se repete**. Cada nível
**linka** o outro em vez de copiar.

- **Raiz** (`README.md`, `CLAUDE.md`, `docs/`) = o que é **transversal** ao repo:
  setup geral, stack, fluxo ponta a ponta, e as diretrizes/políticas acima. Vale para
  todos os apps.
- **README por app/pacote** = só o que é **específico daquele alvo**: como rodar/
  testar só ele, gotchas locais, papel dos entrypoints. README de app **linka** o raiz
  para o que é geral; não recopia. (Prioridade: o README de `packages/contracts`, que
  guarda a regra do *build-first* e o porquê do `composite:false`.) Cada **presentation**
  é um app com seu próprio README — `apps/web`, e (quando existirem) `apps/mobile`,
  `apps/cli`, `apps/public-api` são apps-irmãs sobre a **mesma** API, cada uma um
  **adapter de borda**; o **core não conhece o canal**, então o que muda por presentation
  (fluxo de credencial, formato de I/O) mora no README dela, não no raiz.
- **`CLAUDE.md` por app** = criar **só quando houver regra que vale ali e não no
  resto**. O Claude Code mescla `CLAUDE.md` hierarquicamente: o raiz aplica ao repo
  todo e um `apps/<app>/CLAUDE.md` é carregado **adicionalmente**. Não duplique
  política do repo (TDD/DoD/cobertura) num app.

**Sinal de evolução (aja sobre ele):** quando uma seção do `CLAUDE.md`/README raiz
passar a servir **só um app**, **mova-a** para `apps/<app>/CLAUDE.md` (ou o README do
app) e deixe no raiz apenas o transversal.

## Meta-processo: fatias verticais

Construa por **fatias verticais**, nunca por camadas horizontais. Cada incremento
atravessa o sistema inteiro (uma presentation — UI/CLI/API → API → orquestração → dado →
contrato de saída) e é **demoável, testável e deployável por si só**. Fatiar por camada (todos os readers,
depois todas as tools…) destrói essa propriedade — é anti-padrão.

Ciclo de cada fatia (5 fases, cada uma com artefato versionado):

1. **Brainstorm** → decisões (skill `superpowers:brainstorming`).
2. **Spec de design** → `docs/superpowers/specs/AAAA-MM-DD-<slice>-design.md`
   (objetivo, decisões, mudanças de contrato, testes do DoD, fora-de-escopo, riscos).
3. **Plano executável** → `docs/superpowers/plans/…` (sub-skill obrigatória, goal,
   link spec+ADR, *sequencing rationale*, tarefas em checkbox com Steps que nomeiam
   arquivo + código + comando-gate + resultado esperado + mensagem de commit).
4. **Execução** subagent-driven (skill `superpowers:subagent-driven-development`).
5. **ADR** → `docs/adr/NNNN-*.md` (formato Nygard).

**Dependências voláteis atrás de um port; caminho crítico determinístico.**
Dependências externas/não-determinísticas/caras (serviços de terceiros, relógio, rede
— e, *se a app tiver*, um LLM) ficam atrás de um port; o caminho crítico funciona e é
testável **sem elas** (CI keyless, reproduzível, grátis). **Se houver IA/LLM**, ele
entra atrás desse port numa fatia posterior e só **explica/organiza**, nunca **decide**.
A primeira fatia (S0) é um *walking skeleton*: prova o loop ponta a ponta com o contrato
de saída real, sem ainda introduzir as abstrações que virão.

**Mudança breaking num monorepo é atômica.** Como o `typecheck` abrange todos os
pacotes, a fatia breaking atravessa contrato + backend + worker + web num **único
commit verde**; separe explicitamente a Task aditiva (verde sozinha) da Task breaking
e da Task final só de docs/ADR/continuidade.

**Verificação pesada (docker/e2e/mutação) roda em background**, não escondida e
síncrona num subagente — senão trava a sessão.

## Architecture

> ⚠️ Esta seção descreve a **INSTÂNCIA-EXEMPLO** (NestJS + Next + broker + Postgres). O
> **universal** está nas *Diretrizes* acima; os caminhos `apps/api/*.module.ts`, o par
> HS256/proxy e o **worker assíncrono** são **exemplos marcados**, **não invariantes**.
> Trocar a topologia (mais presentations; write síncrono sem broker) **mantém** os
> princípios.

### Request flow (presentation web, persistência assíncrona)

Este é o fluxo **da presentation web com a variante de persistência assíncrona**:

`login → web minta token HS256 → proxy /api/proxy/[...path] anexa Bearer server-side →
a API JwtAuthGuard valida + extrai escopo (<Tenant>) do claim → use-case publica evento
no broker → retorna a resposta na hora → worker consome o evento → insert idempotente
no Postgres → GET lê de volta.`

Na variante assíncrona a API **não persiste no write-path** — a persistência é no
worker; o trace context propaga web → api → worker. **Duas dimensões variam:**

- **Presentation:** uma presentation **programática** (mobile/CLI/API pública) troca
  cookie + proxy server-side por **auth de cliente** (client-credentials / API key); o
  resto do fluxo (a API valida o token e deriva o escopo do claim) é idêntico.
- **Sync vs. async:** **sem um NFR que justifique** o assíncrono, o write-path persiste
  **SÍNCRONO** — o use-case valida → persiste no repositório → responde, **sem broker
  nem worker**. O async (acima) é **CQRS/write-behind**, adotado só sob NFR + ADR.

### Auth = "Arquitetura A" (dois segredos, não conflate)

Isto descreve o fluxo de credencial **da presentation web**. O **invariante** (válido
para **toda** presentation) é só: **o core verifica um token assinado e deriva o escopo
do claim, NUNCA do input**. Cada presentation traz **seu próprio fluxo de credencial** —
cookie + proxy server-side na web (abaixo); **client-credentials / API key** em clientes
programáticos (mobile/CLI/API pública). O par de segredos a seguir é específico da web:

- `AUTH_SECRET` cifra o cookie de sessão (browser-facing).
- `AUTH_API_SECRET` é um **segredo HS256 compartilhado** entre web e a API. O web minta
  um JWT de API curto (`apps/web/src/lib/api-token.ts`) que a API verifica
  (`apps/api/src/auth/jwt.strategy.ts`, com `iss`/`aud`/`HS256` pinados). **O Bearer
  nunca chega ao browser** — é anexado server-side pelo proxy
  `apps/web/src/app/api/proxy/[...path]/route.ts`. Se algum código de cliente precisar do
  token, o design está errado.

### Defense in depth (governança)

- **Fail-closed por allowlist:** tabelas/colunas/funções permitidas e origens CORS são
  allowlists explícitas (denylist sempre esquece algo). **Escopo sempre do contexto
  autenticado** (`input.tenant` do claim verificado), **nunca do input** do usuário.
- **Ids internos nunca cruzam a fronteira:** projeção por allowlist **na origem** (o
  `select` do repositório só mapeia campos públicos) + um **validador de saída** em
  camada-3 que redige por padrão de nome como rede de segurança.
- **Acesso a dado externo** roda em transação `READ ONLY` + `statement_timeout` +
  `ROLLBACK` sempre — camadas redundantes ao guard lógico, não substitutas.
- **Cross-cutting é best-effort:** validador de saída, auditoria e telemetria **nunca**
  quebram o caminho principal (try/catch que devolve a entrada intacta ou no-op).
- **Cofre cifrado** para settings/segredos com AEAD (AES-256-GCM): IV aleatório, auth
  tag verificada, chave de 32 bytes validada no boot (falha rápido se inválida).

### API clean architecture (`apps/api/src/modules/<feature>`)

Quatro camadas por módulo: `domain` (entities, value objects, ports — sem framework) →
`application` (use-cases dependendo só de ports injetados) → `infrastructure`
(adapters: persistência, publisher do broker, cache, clock, uuid) → `presentation`
(controllers HTTP + DTOs). `<feature>.module.ts` é o composition root ligando
ports→adapters.

### Worker = mesma imagem, segundo entrypoint (variante assíncrona)

Só existe quando se adota o write-path assíncrono (CQRS/write-behind sob NFR + ADR).
`apps/api/src/worker.ts` é um consumer Node standalone (sem o framework HTTP),
compartilhando a imagem da API. O Compose roda a imagem de três formas:
`dist/main.js` (api), `dist/worker.js` (worker), `dist/migrate.js` (migração one-shot,
ordenada **antes** dos workloads). As mesmas *command arrays* fluem por Compose, Helm e
Terraform. O contrato de topologia (exchange/queue/routing keys/shape do evento) vive
em `packages/contracts`.

### Cross-cutting

- **OTel** (`apps/api/src/otel.ts`, pré-carregado via `--require`) é best-effort:
  engole todos os erros e vira no-op quando o endpoint OTLP está vazio. **Nunca** deixa
  quebrar o boot.
- **Config** validada por zod no boot (`apps/api/src/config/env.schema.ts`); env
  inválida falha rápido.
- **Contracts** buildam para CommonJS `dist`; backend e frontend consomem o output
  compilado.

## Gotchas (da stack-exemplo: NestJS/Next/pnpm — custam tempo real, mantenha intactos)

1. **`@app/contracts` precisa ser buildado antes de api/web.** O `tsconfig` fixa
   `incremental:false`/`composite:false` de propósito — com `--incremental`, `tsc`
   escreve `tsconfig.tsbuildinfo` *fora* de `dist` e pula o emit após o `dist` ser
   limpo. O `.dockerignore` exclui `**/*.tsbuildinfo`.
2. **Headers de segurança (helmet) só no entrypoint de runtime**, fora da config
   compartilhada — senão o builder offline de OpenAPI diverge do runtime e o gate de
   drift quebra. CSP do helmet pode precisar ficar desligada para o Swagger UI:
   documente o trade-off, não copie cego.
3. **Ordem dos guards globais importa:** rate-limit → autenticação → autorização
   (o guard de role depende de `request.user` já populado).
4. **Guard de query externa é por AST, nunca regex:** allowlist caminhada no AST é a
   única postura fail-closed; um denylist de strings perigosas sempre vaza (CTEs,
   subselects, comentários).
5. **Validação é Zod, não class-validator.** Sem `ValidationPipe` global; aplique o
   `ZodValidationPipe` ao `@Body()` específico — nunca via `@UsePipes`.
6. **Windows:** o build `output:'standalone'` do Next falha no symlink sem Developer
   Mode; use `next dev` local. O build Docker (Linux) gera standalone normal.

## CI (da stack-exemplo)

`.github/workflows/ci.yml` roda estagiado: `static` (audit + lint + typecheck +
unidade/propriedade) → `mutation` (Stryker) + `integration` (Testcontainers) → `e2e`
(Playwright vs o stack). O `audit --audit-level high` roda logo após o install. O
`mutation` quebra abaixo de **90%** (escopo nas regras de negócio). `docs.yml` builda
MkDocs `--strict` (link quebrado ou página fora do nav quebra o build). `release.yml`
usa release-please (Conventional Commits → Release PR com CHANGELOG + bump).

**Gates de contrato:**

- **Versionamento de API:** todas as rotas sob `/v1`; `/health` é `VERSION_NEUTRAL`.
- **Drift de OpenAPI:** `apps/api/openapi.json` é o contrato commitado; o teste offline
  o compara por deep-equal contra o snapshot — qualquer drift falha `pnpm test:int`. A
  fidelidade em runtime é checada por e2e (`/docs-json` == snapshot).
- **Versionamento de evento:** o evento em `packages/contracts` carrega `version: 1`
  como tipo literal — garantia em compile-time compartilhada por produtor, worker e
  web. Evolução aditiva mantém a routing key; mudança breaking sobe routing key +
  `version`.

> Detalhe vivo do estado: [`docs/how-to/current-state.md`](docs/how-to/current-state.md).
> Decisões: ADRs em [`docs/adr/`](docs/adr/0001-record-architecture-decisions.md).
