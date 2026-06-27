# Replicar este harness num projeto novo

> **Estilo Diátaxis — how-to.** Guia orientado a tarefa para quem vai dar
> *bootstrap* num novo sistema a partir deste modelo. Cada passo nomeia o
> arquivo a criar/editar e o **gate** que deve passar antes de avançar. Não é
> explicação (veja [Arquitetura](../explanation/architecture.md)) nem tutorial.
>
> **Exemplo trabalhado.** Vamos chamar o produto de `<App>`, com um bounded
> context `<Feature>` que cria `<Entity>s`. Onde aparecer `@app/...`, troque pelo
> escopo do seu monorepo.

---

## O scaffold é espinha + receita: copie vs crie

Antes de qualquer passo, internalize o **Status do scaffold** do `README.md`
raiz: o `scaffold/` **não builda out-of-the-box**. Ele entrega toda a *cola* de
monorepo, gates e entrypoints prontos para **copiar**, e deixa os arquivos-folha
de domínio/infra como **receita** que você **cria** seguindo os `README.md` de
cada camada. Cada passo abaixo marca, arquivo a arquivo, qual é qual:

- **[copie do scaffold]** — o arquivo **existe** em `scaffold/`; leve como está e
  purgue os comentários de proveniência.
- **[crie você]** — o arquivo **não existe** no scaffold; o bloco de código que o
  materializa vive no `README.md` da camada (ou no snippet citado). A espinha
  (`feature.module.ts`, `app.module.ts`, `main.ts`, `worker.ts`) **importa** essas
  folhas, então só typecheca **depois** que você as cria.

### Mapa rápido — Entregue (copie) vs Receita (crie)

| Entregue — **copie do scaffold** | Receita — **crie você** (bloco no README da camada) |
|---|---|
| `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `tsconfig.json` | folhas de `domain/` (`<entity>.entity.ts`, `<name>.vo.ts`, ports) |
| `packages/tsconfig/*`, `packages/eslint-config/*` | folhas de `application/` (use-cases, ports, guardrails) |
| `packages/contracts/*` (zod + `z.infer`) | adapters de `infrastructure/` (persistence, messaging, cache, observability) |
| entrypoints da API: `main.ts`, `worker.ts`, `bootstrap.ts`, `migrate.ts`, `otel.ts` | controller + DTOs de `presentation/http/*` |
| `config/env.schema.ts` | `apps/api/src/swagger.ts` |
| `compose.yaml`, `compose.observability.yaml`, `Dockerfile` (api/web) | `apps/api/src/auth/*` (`jwt.strategy.ts`, `jwt-auth.guard.ts`, `auth.module.ts`) |
| `.husky/*`, `commitlint.config.cjs`, `.lintstagedrc.json` | `apps/api/src/modules/health/*` |
| `.github/workflows/{ci,docs,release,helm}.yml` | `infrastructure/messaging/messaging.module.ts` (@Global) |
| `playwright.config.ts`, `e2e/tests/smoke.spec.ts` | `infrastructure/database/drizzle/drizzle.module.ts` |
| `.gitignore`, `.dockerignore`, `.env.example` | `infrastructure/cache/redis.module.ts` |
| `mkdocs.yml` + seed de `docs/` | `common/zod-validation.pipe.ts` |
| `observability/` (provisioning Grafana) | `worker/db.ts`, `worker/persist.handler.ts` |
| `deploy/helm/README.md` (a **receita** do chart) | `apps/api/vitest.config.ts`, `vitest.integration.config.ts`, `vitest.eval.config.ts` |
| os checklists e ADRs-semente | `apps/api/stryker.conf.json` |
| | `apps/api/scripts/generate-openapi.ts` + `apps/api/openapi.json` (snapshot) |
| | interior de `apps/web/src` (proxy route + `lib/api-token.ts`) |
| | o **chart** Helm em si (a partir de `deploy/helm/README.md`) |

> **Consequência para os gates.** `pnpm build`, `pnpm test*`, `mkdocs build
> --strict` e o gate de drift de OpenAPI só ficam verdes **depois** que você
> materializa as folhas que cada um exercita. Por isso, abaixo, todo gate que
> depende de arquivo a criar é redigido como *"após materializar as folhas, rode
> `<gate>`"*. O scaffold deixa os gates **prontos para rodar**, não
> **pré-satisfeitos**.

---

## Antes de começar

Leia primeiro, em ordem:

1. [Arquitetura](../explanation/architecture.md) — as 4 camadas, o composition
   root, **multi-presentation** e síncrono-vs-assíncrono.
2. [Escrita síncrona — e o opt-in assíncrono](../explanation/sync-and-async-flow.md)
   — write síncrono default vs. variante assíncrona (worker).
3. [ADR-0001](../adr/0001-record-architecture-decisions.md) — como registrar decisões.

---

## Invariantes universais (não negocie)

> Estas regras são a alma do harness e valem **em qualquer forma** que você
> escolher no Passo 0. Os gates do DoD existem para enforçá-las.

- **Contract-first:** todo DTO/evento é um schema **zod** com o tipo derivado por
  `z.infer`, num pacote `@app/contracts` **sem framework**, importado por todos
  os lados. Mudou rota/evento → o contrato muda **aqui primeiro**.
- **Build dos contratos antes de tudo:** api/web importam o `dist` compilado de
  `@app/contracts`, não o `.ts`. `composite:false`/`incremental:false` é
  **intencional** nesse pacote (ver gotcha no fim).
- **Domínio sem framework:** zero imports de `@nestjs/*` em `domain/`
  (verificável por grep).
- **Ports são `abstract class`** (token de DI + contrato), nunca `interface`.
- **Wiring só no composition root** (`<feature>.module.ts`).
- **Escopo vem do claim do token assinado verificado pelo core**, nunca do input
  do usuário — independentemente de qual presentation recebeu a requisição.
- **Dependências voláteis atrás de um port:** o caminho crítico funciona e é testável
  sem dependência externa/não-determinística (serviço de terceiros, relógio, rede —
  e, *se houver*, um LLM); o LLM, se existir, entra atrás do port depois.
- **Evidência antes de afirmação:** nada está "pronto" sem rodar o gate e colar a
  saída.

### Invariantes da variante assíncrona (só se você escolher CQRS no Passo 0)

> Aplicáveis **apenas** se o write-path for assíncrono (publica evento → worker).
> No default síncrono elas não existem — o use-case persiste direto.

- **Identidade nasce no produtor** (id gerado no use-case, vira PK + header AMQP
  + alvo do `ON CONFLICT`).
- **Idempotência no consumidor** (`INSERT ... ON CONFLICT DO NOTHING`), nunca no
  broker.

---

## Passo 0 — Escolha sua forma (decisões de NFR)

Antes de copiar/criar qualquer arquivo, decida — e **registre em ADR** — a forma
do seu sistema. O scaffold demonstra **uma** forma (web + API (proxy same-origin), assíncrona); ela é
um exemplo, não a verdade.

- **Presentation(s) alvo.** Quais bordas o core vai servir? Web + API (proxy same-origin, como o
  scaffold), e/ou CLI, API pública, mobile, consumidor de fila, webhook. Cada uma
  é um adapter de borda fino sobre o **mesmo** use-case; cada uma tem seu próprio
  fluxo de credencial (o core sempre verifica token assinado + escopo do claim).
  Declare o conjunto escolhido — vira a linha "Presentations ativas" do
  `current-state.md`.
- **Síncrono vs. assíncrono (CQRS).** O write padrão é **síncrono**
  (`valida → persiste → responde`). Só adote a **variante assíncrona** sob um
  **gatilho de NFR concreto** (assimetria r/w, escala de leitura, picos,
  desacoplamento da disponibilidade do banco, fan-out). O custo (broker +
  idempotência + read-your-writes eventual) **vira ADR** — ver
  [Escrita síncrona — e o opt-in assíncrono](../explanation/sync-and-async-flow.md).
  No default síncrono, **pule** os passos marcados `[opcional — variante
  assíncrona]` (Passos 4, 5 e a parte de worker do 7).

**Gate:** um ADR de forma aceito (presentations + síncrono/assíncrono + NFR
justificador), antes do Passo 1.

---

## Passo 1 — Monorepo + workspace

**Arquivos [copie do scaffold]:** `package.json`, `pnpm-workspace.yaml`,
`turbo.json`, `tsconfig.json`, `packages/tsconfig/*`, `packages/eslint-config/*`.

Leve a espinha de monorepo (Turborepo + pnpm, Node 22) e renomeie o escopo
`@app/*` para o seu. O tsconfig e o ESLint já vêm centralizados em
`packages/tsconfig` e `packages/eslint-config`, estendidos pelos apps.

**Gate:** `pnpm install` verde.

## Passo 2 — Pacote de contratos (fonte única)

**Arquivos [copie do scaffold, depois adapte ao seu domínio]:**
`packages/contracts/src/*`, `packages/contracts/tsconfig.json` (com
`composite:false`/`incremental:false`), `packages/contracts/README.md`.

O pacote de contratos vem pronto como **espinha** com os schemas neutros
(`<Feature>` DTO, topologia + evento). **Edite** os schemas para o seu domínio:
em zod, defina o(s) DTO(s) da rota e a topologia + evento (exchange/queue/
DLX/DLQ, routing keys, binding pattern `#`, schema com `version: z.literal(1)`).
Derive os tipos por `z.infer`.

**Gate:** `pnpm --filter @app/contracts build` produz `dist` não-vazio.

## Passo 3 — API: módulo de feature em 4 camadas

**Espinha [copie do scaffold]:** `apps/api/src/modules/<feature>/<feature>.module.ts`
(composition root, **ilustrativo** — importa folhas que você cria) e os
`README.md` de cada camada (`domain/`, `application/`, `infrastructure/`,
`presentation/`), que **contêm os blocos de código** a materializar.

**Folhas [crie você — blocos nos README de camada]:** use o checklist
`checklists/new-module.md` do scaffold. Ordem (ports antes de adapters):

1. `domain/entities/<entity>.entity.ts` — factory `create` + construtor privado.
2. `domain/value-objects/<name>.vo.ts` — invariante em `create`.
3. `domain/ports/<name>.repository.port.ts` — `abstract class`.
4. `application/ports/{clock,event-publisher,...}.port.ts` — `abstract class`.
5. `application/use-cases/<name>/<name>.use-case.ts` — **classe pura**, ports por
   construtor, método `execute(input)`. **Escreva o spec que falha antes** (TDD):
   instancie com fakes via `new`. **No default síncrono** o use-case **persiste**
   e responde:

   ```ts
   // application/use-cases/create-<entity>/create-<entity>.use-case.ts (DEFAULT síncrono)
   export class CreateEntityUseCase {
     constructor(
       private readonly repo: EntityRepositoryPort, // abstract class
       private readonly clock: ClockPort,
       private readonly ids: IdGeneratorPort,
     ) {}

     async execute(input: CreateEntityInput): Promise<EntityDto> {
       const entity = Entity.create({
         id: this.ids.next(),
         content: MessageContent.create(input.content), // value object valida
         createdAt: this.clock.now(),
       });
       await this.repo.save(entity); // persiste na mesma requisição
       return toDto(entity); // read-your-writes imediato
     }
   }
   ```

   **Só na variante assíncrona** (Passo 0 = CQRS) o use-case troca `repo.save`
   por `eventPublisher.publish(...)` e a persistência migra para o worker
   (Passo 4). O scaffold ilustra a variante publicadora; o esqueleto acima é o
   default.
6. `infrastructure/persistence/<name>.{repository,mapper}.ts` — `extends` o port;
   mapper traduz row↔agregado na fronteira.
7. `infrastructure/messaging/rabbitmq.publisher.ts` — `extends` o port de
   publicação (`persistent: true` + `messageId` header).
8. `presentation/http/<name>.controller.ts` — controller fino + DTOs + anotações
   Swagger; `ZodValidationPipe` **pontual** no `@Body` (nunca global).
9. revise `<feature>.module.ts` (a espinha copiada) — `provide/useClass` +
   `useFactory+inject` apontando para as folhas que você acabou de criar.

**Gate:** após materializar as folhas, rode
`pnpm --filter @app/api exec vitest run <use-case>.spec.ts` + `pnpm typecheck`.

## Passo 4 — Worker (2º entrypoint) + migrate (3º) [opcional — variante assíncrona]

> **Pule no default síncrono.** Este passo só existe se o Passo 0 escolheu CQRS.
> O `migrate` (3º entrypoint) você mantém em qualquer forma — é só o worker que é
> condicional. Sem worker, a persistência já acontece no use-case (Passo 3).

**Espinha [copie do scaffold]:** `apps/api/src/worker.ts` (loop de consumo,
**ilustrativo** — importa `./worker/db` e `./worker/persist.handler`) e
`apps/api/src/migrate.ts` (one-shot, completo).

**Folhas [crie você — blocos no README de `infrastructure/`]:**

- `apps/api/src/worker/db.ts` — `createWorkerDb(url)` (pool pg + drizzle).
- `apps/api/src/worker/persist.handler.ts` — `INSERT ... ON CONFLICT (id) DO
  NOTHING`, timestamp do evento.
- `apps/api/src/worker/routing-binding.spec.ts` — matcher de topic-exchange em
  JS puro provando que o binding casa **todas** as routing keys (teste de
  coerência sem broker).

> A espinha `worker.ts` já traz a topologia idempotente, `prefetch`, `consume`
> `noAck:false`, tracking de in-flight e shutdown com **drain** — você só
> materializa as duas folhas (`db`, `persist.handler`) que ela importa.

**Gate:** após criar as folhas, rode
`pnpm --filter @app/api exec vitest run routing-binding.spec.ts`.

## Passo 5 — Messaging module @Global (gotcha de DI) [opcional — variante assíncrona]

> **Pule no default síncrono.** Sem broker não há conexão a expor; o use-case
> persiste direto pelo repositório.

**Arquivo [crie você — bloco no README de `infrastructure/`]:**
`apps/api/src/infrastructure/messaging/messaging.module.ts`.

Envolva `RabbitMQModule.forRootAsync` num `@Global() MessagingModule` que
**re-exporta** — senão a conexão não é injetável nos feature modules. A espinha
`app.module.ts` já **importa** esse módulo (junto de `DrizzleModule` e
`RedisModule`, também a criar a partir do mesmo README).

**Gate:** após materializar os módulos de infra, rode `pnpm build`.

## Passo 6 — Auth "Arquitetura A" (dois segredos) [exemplo: presentation web + API (proxy same-origin)]

> **Específico da borda web + API (proxy same-origin).** O fluxo de dois segredos abaixo é o **fluxo de
> credencial desta presentation**. A invariante universal é outra: o **core
> verifica um token assinado e autoriza pelo escopo do claim**. Outras bordas
> trocam só o fluxo de credencial — **alternativas:** CLI/job (token de serviço),
> API pública/integração (API key trocada por token assinado), webhook
> (assinatura HMAC do emissor), consumidor de fila (claim no envelope). Em todas,
> o guard/verificação no core e o uso do escopo do claim permanecem iguais.

**Arquivos [crie você]:**

- `apps/web/src/lib/api-token.ts` e
  `apps/web/src/app/api/<app>/[...path]/route.ts` — blocos no
  `apps/web/src/README.md` do scaffold.
- `apps/api/src/auth/{jwt.strategy,jwt-auth.guard,auth.module}.ts` — blocos no
  README da API / camada de infraestrutura.

Regras (a espinha `app.module.ts` já registra o `JwtAuthGuard` como `APP_GUARD`):

- `AUTH_SECRET` cifra o cookie de sessão (browser-facing).
- `AUTH_API_SECRET` é um **HS256 compartilhado** entre web e a API. O web cunha um JWT de
  API curto no callback `jwt` do Auth.js; o proxy same-origin anexa o Bearer
  **server-side**; a API valida (`iss`/`aud`/`HS256` pinados). **O Bearer nunca
  chega ao browser.**

**Gate:** após criar `auth/*` e o interior de `apps/web/src`, rode
`pnpm typecheck` + o e2e de login.

## Passo 7 — Uma imagem, três comandos (Docker + Compose)

**Arquivos [copie do scaffold]:** `apps/api/Dockerfile` (CMD default =
`dist/main.js`), `apps/web/Dockerfile`, `compose.yaml`,
`compose.observability.yaml`, `.dockerignore` (exclui `**/*.tsbuildinfo`).

Compose roda a mesma imagem como `api` e `migrate` (one-shot, `restart:no`);
**na variante assíncrona** acrescenta o 3º comando `worker`. api (e worker, se
houver) dependem de `migrate` `service_completed_successfully` e do Postgres
`healthy`.

> **[opcional — variante assíncrona]** O serviço `worker` (`node dist/worker.js`)
> só entra se o Passo 0 escolheu CQRS. No default síncrono são **dois** comandos
> (`api` + `migrate`).

> **Gotcha.** O Docker usa `pnpm --filter ... --prod --legacy deploy` (pnpm 10
> exige `--legacy`); o `package.json` da api lista `"files": ["dist","drizzle"]`.

**Gate:** após materializar as folhas da API/web, rode
`docker compose up -d --build --wait` (sobe tudo); o loop do
[tutorial](../tutorials/getting-started.md) funciona.

## Passo 8 — Config + observabilidade (best-effort)

**Arquivos [copie do scaffold]:** `apps/api/src/config/env.schema.ts`,
`apps/api/src/otel.ts` (pré-carregado via `--require`).

Os dois entrypoints vêm prontos: a config valida env por zod no boot (falha
rápido) e o OTel é no-op quando o endpoint OTLP está vazio, **nunca derrubando o
boot**. **Adicione** ao `env.schema.ts` as variáveis do seu domínio.

**Gate:** após a API compilar, rode `pnpm build` + um boot local sem endpoint
OTLP (não pode quebrar).

## Passo 9 — Pirâmide de testes + gate de drift de OpenAPI

**Arquivos [crie você — load-bearing para os gates rodarem]:**

- `apps/api/vitest.config.ts` — unidade + propriedade (com o `include` de
  cobertura **narrow**: só `domain` + `application`).
- `apps/api/vitest.integration.config.ts` — Testcontainers.
- `apps/api/vitest.eval.config.ts` — o eval do caminho crítico.
- `apps/api/stryker.conf.json` — mutação restrita às regras de negócio (score
  ≥ 90, break threshold).
- `apps/api/scripts/generate-openapi.ts` — gera o doc **offline** (sem abrir
  conexões), via `apps/api/src/swagger.ts` (também a criar).
- `apps/api/src/swagger.ts` — `buildOpenApiDocument(app)` (a espinha `main.ts` já
  o **importa**).
- `apps/api/openapi.json` — o **snapshot commitado**, gerado pelo script acima.
- `apps/api/test/integration/openapi.contract.test.ts` — deep-equal offline vs.
  snapshot.

**Espinha [copie do scaffold]:** `playwright.config.ts` (sem `webServer`; alvo
por `BASE_URL`) e `e2e/tests/smoke.spec.ts` (smoke domain-free). Adicione seus
specs reais em `e2e/tests/`.

Gere o OpenAPI offline e commite o snapshot; o teste de integração faz
deep-equal contra ele. Todo `@Query()`/`@Param()` precisa de decorator Swagger
explícito (offline == runtime).

**Gate:** após materializar os configs e o snapshot, rode `pnpm test`,
`pnpm test:int`, `pnpm test:e2e`, `pnpm --filter @app/api mutation` (≥ 90%) e
`pnpm --filter @app/api test:cov` (≥ 80%).

## Passo 10 — Enforço em três camadas (hooks + CI + branch protection)

**Arquivos [copie do scaffold]:** `.husky/{pre-commit,commit-msg,pre-push}`,
`.github/workflows/{ci,docs,release,helm}.yml`, `commitlint.config.cjs`,
`.lintstagedrc.json`.

- **pre-commit:** lint-staged → build contracts → typecheck → lint → test → eval.
- **commit-msg:** commitlint (Conventional Commits).
- **pre-push:** test:cov (≥ limiar) + audit (`--audit-level high`) +
  regenera OpenAPI e falha se houver drift.
- **CI estagiado:** static (audit+lint+typecheck+unit) → mutation+integration →
  e2e. Docs: `mkdocs build --strict`. Release: release-please.

> **Defesa em profundidade.** Os hooks dão feedback rápido e são *bypassáveis*
> (`--no-verify`); o CI re-enforça tudo e é a verdade incontornável; a branch
> protection fecha o cerco. O skip local nunca enfraquece o contrato.
>
> **Anti-vazamento.** Adicione ao estágio `static` o grep-gate de
> `checklists/aprendizados.md` (seção "Guard anti-vazamento de negócio"): ele
> falha se termos do seu domínio de origem reaparecerem ao instanciar.

**Gate:** após os hooks rodarem sobre o seu código materializado, abra um PR com
todos os status checks verdes.

## Passo 11 — Docs + ADR + continuidade

**Arquivos:** `mkdocs.yml` (nav explícito por quadrante Diátaxis) **[copie do
scaffold e ajuste o nav]**; `docs/...` [seed copiável]; `docs/adr/NNNN-*.md`
[crie por decisão]; `docs/how-to/current-state.md` [crie a partir do gabarito].

Toda decisão arquitetural vira ADR (nunca edite um aceito → crie substituto).
Ao fim da fatia, atualize o `current-state.md` (gabarito em
[current-state.template.md](current-state.template.md)) **e** a memória do agente.

**Gate:** após adicionar cada página ao nav, rode `mkdocs build --strict` (falha
em link/nav quebrado).

---

## Tabela de referência rápida

| Passo | Arquivo-chave | Copie/Crie | Gate |
|---|---|---|---|
| 0 Forma (NFR) | ADR de forma | crie | ADR aceito (presentations + sync/async) |
| 1 Monorepo | `pnpm-workspace.yaml` | copie | `pnpm install` |
| 2 Contratos | `packages/contracts/src/*` | copie + adapte | `build` → `dist` não-vazio |
| 3 API feature | folhas das 4 camadas | crie (espinha copiada) | use-case spec + `typecheck` |
| 4 Worker/migrate *(async)* | `worker/db.ts`, `worker/persist.handler.ts` | crie (espinha copiada) | binding spec |
| 5 Messaging @Global *(async)* | `messaging.module.ts` | crie | `build` |
| 6 Auth *(ex.: web + API (proxy same-origin))* | `auth/*`, `api-token.ts`, `route.ts` | crie | e2e login |
| 7 Imagem 2–3 comandos | `Dockerfile`, `compose.yaml` | copie | `compose up --wait` |
| 8 Config/OTel | `env.schema.ts`, `otel.ts` | copie + adapte | boot sem OTLP |
| 9 Pirâmide | `vitest*.config.ts`, `stryker.conf.json`, `openapi.json` | crie | test/int/e2e/mutation/cov |
| 10 Enforço | `.husky/*`, `ci.yml` | copie | PR status checks |
| 11 Docs/ADR | `mkdocs.yml`, `current-state.md` | copie + crie | `mkdocs build --strict` |

## Gotcha que custa tempo: contratos com `composite:false`

`packages/contracts/tsconfig.json` força `incremental:false`/`composite:false`
**de propósito**. Com `--incremental`, o `tsc` grava `tsconfig.tsbuildinfo`
**fora** do `dist`; depois que o `dist` é limpo, o `tsc` acha que já emitiu e
**pula a emissão** — `dist` vazio quebra api/web de forma difícil de
diagnosticar. O `.dockerignore` também exclui `**/*.tsbuildinfo`.
