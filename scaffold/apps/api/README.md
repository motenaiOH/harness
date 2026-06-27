# @app/api

> **The API is the shared core** — a modular-monolith that can serve **N
> presentations** (web, mobile, CLI, a public API, integrations). It does **not**
> imply a single frontend; `web` is one presentation among the possible many.

Authenticated API in **NestJS** (clean architecture / DDD / modular monolith).

**Two write-path variants — pick by NFR (this scaffold shows the second as an
example, not as a mandate):**

- **Direct write (DEFAULT):** the use-case validates → persists via the repository
  → returns, all in the same request. No queue, no worker. Use this unless a
  concrete NFR forces otherwise.
- **Synchronous reply + asynchronous persistence (CQRS-lite):** the variant
  illustrated below. The API validates the JWT, caches, publishes an event to
  RabbitMQ and replies immediately; persistence happens asynchronously in the
  **worker**. Adopt this **only** under a concrete NFR (write spikes, decoupling
  latency from the write, fan-out, tolerance to store unavailability) recorded in
  an ADR. Cost: a broker, idempotency, and eventual read-your-writes.

What the scaffold demonstrates below is the CQRS-lite variant: on the write path
the API **does not persist** — persistence is asynchronous, in the **worker**
(same image, different entrypoint). When no NFR justifies it, use direct write
instead (the use-case persists in its own request, with no queue/worker).

> Monorepo setup, full stack and the end-to-end flow live in the root README and
> `docs/`. The mandatory guidelines (TDD, API First, Definition of Done,
> coverage ≥ 80%) live in the root `CLAUDE.md`. Here, only what is specific to
> the API.

## Layers (clean architecture)

Per feature module under `src/modules/<feature>` — here, the generic `feature`:

```
domain/         entities, value objects, ports — no framework
application/    use-cases depending only on injected ports
infrastructure/ adapters (Drizzle, RabbitMQ, Redis, clock, uuid)
presentation/   HTTP controllers + DTOs
feature.module.ts   composition root: binds ports -> adapters
```

Dependencies point **inward**; the domain imports no framework. New business
logic goes in `domain`/`application`, **never** in the controller. Use-cases are
plain classes (no Nest DI) — unit-testable by direct construction; see
`send-event.use-case.spec.ts`.

## Three entrypoints, one image

The same image runs three ways (see `Dockerfile` and `compose.yaml`):

| Entrypoint | Role |
|---|---|
| `dist/main.js` | HTTP API (NestJS) |
| `dist/worker.js` | **CQRS-lite variant only** — standalone RabbitMQ consumer (amqp-connection-manager + pg, no Nest) → idempotent insert into Postgres. In the direct-write default there is no worker. |
| `dist/migrate.js` | one-shot migration (Drizzle), ordered before the workloads |

## Commands

All from the repo root. **Build `@app/contracts` first** (see its README).

```bash
pnpm --filter @app/api dev          # API with watch (nest start --watch)
pnpm --filter @app/api worker:dev   # worker with watch (tsx)
pnpm --filter @app/api build        # nest build -> dist

pnpm --filter @app/api test         # unit + property (vitest)
pnpm --filter @app/api test:cov     # + coverage threshold (build breaks < 80%)
pnpm --filter @app/api test:int     # integration (Testcontainers — needs Docker)

pnpm --filter @app/api db:generate  # drizzle-kit generate (commit apps/api/drizzle/)
pnpm --filter @app/api db:migrate   # apply migrations
```

Swagger (API First): with the stack up, <http://localhost:3001/docs> and `/docs-json`.

## API-specific gotchas

- **Validation is Zod, not class-validator.** There is no global `ValidationPipe`.
  Apply `ZodValidationPipe` to the specific `@Body()` — **never** via `@UsePipes`
  (it would also run against `@CurrentUser`).
- **RabbitMQ DI:** `@golevelup/nestjs-rabbitmq` v6 is not global. `AmqpConnection`
  is exposed by a `@Global() MessagingModule` re-exporting `RabbitMQModule`. Don't
  import `RabbitMQModule.forRoot*` directly in feature modules.
- **Swagger required:** every endpoint annotated (`@ApiTags`, `@ApiBody`,
  `@ApiOkResponse`, `@ApiBearerAuth`); every `@Query()`/`@Param()` has an explicit
  Swagger decorator (offline doc must equal runtime doc or the drift gate breaks).
- **OTel is best-effort** (`src/otel.ts`, preloaded via `--require`): swallows errors
  and no-ops when `OTEL_EXPORTER_OTLP_ENDPOINT` is empty. Never let it break boot.
- **Config validated by zod at boot** (`src/config/env.schema.ts`): invalid env
  fails fast.

## Auth (Architecture A)

The API **verifies** a short-lived HS256 JWT signed by the web app with the shared
secret `AUTH_API_SECRET` (`src/auth/jwt.strategy.ts`, pinned `iss`/`aud`/`HS256`).
The Bearer is attached server-side by the web proxy — it never reaches the browser.
The `tenant` claim is the scope used everywhere downstream — derived from the
authenticated session, never from request input.
