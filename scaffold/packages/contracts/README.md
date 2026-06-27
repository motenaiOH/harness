# @app/contracts

**Single source of truth** for the contract between the apps. Two conceptually
distinct parts:

- **(a) DTOs (zod) — ALWAYS needed.** The request/response shapes shared by **every
  presentation** (web/mobile/CLI/public API) and the API itself. Present in both
  write-path variants.
- **(b) Event topology + the versioned event — async mode ONLY (variant B).** The
  messaging topology and the versioned event payload exist only when the API
  publishes to a worker. In the **direct-write default**, `events.ts` does not exist.

It is consumed **compiled** (`dist`, CommonJS) by the API (and, in async mode, the
worker) and by every presentation (e.g. the web app, Next.js).

> Monorepo setup, full stack and the end-to-end flow live in the root README.
> This document only covers what is specific to `@app/contracts`.

## What lives here

| File | Content |
|---|---|
| `src/events.ts` | **Async mode only (variant B).** AMQP topology (`FEATURE_EXCHANGE`, `FEATURE_QUEUE`, `FEATURE_DLX`/`FEATURE_DLQ`, `ROUTING_KEYS`, `FEATURE_BINDING_PATTERN`) + the versioned `FeatureExecutedEvent`. Absent in the direct-write default. |
| `src/dtos.ts` | **Always present.** Route DTOs (`ExecuteFeatureSchema`, `ExecuteFeatureResponseSchema`, `FeatureItemSchema`), the structured-output envelope (`FeatureResultSchema`), generic pagination, and the API-token claims. |
| `src/index.ts` | Barrel — re-exports everything above. |

Imported by every presentation (web/mobile/CLI), by the API, and — in async mode —
by the worker; nobody redeclares a DTO, exchange name, routing key or event shape
on its own.

## Commands

```bash
pnpm --filter @app/contracts build       # tsc -> dist (CommonJS + .d.ts)
pnpm --filter @app/contracts dev          # tsc --watch
pnpm --filter @app/contracts typecheck    # tsc --noEmit
```

## ⚠️ Build **before** api/web

api and web import the compiled `dist` of this package — not the `.ts`. So:

```bash
pnpm --filter @app/contracts build   # ALWAYS first, before building/running api or web
```

Forgetting this produces "module not found" errors or stale types in consumers.
`turbo`'s `dependsOn: ["^build"]` enforces the order for graph tasks, but an
ad-hoc `tsc --noEmit` / `next dev` will fail if dist is missing.

### Why `composite:false` / `incremental:false` in `tsconfig.json`

It is **intentional** (do not "optimize" by turning incremental on). With
`--incremental`, `tsc` writes `tsconfig.tsbuildinfo` **outside** `dist`; once
`dist` is cleared, `tsc` thinks it already emitted and **skips emission** —
leaving an empty `dist` that breaks api/web in a hard-to-diagnose way. The root
`.dockerignore` also excludes `**/*.tsbuildinfo` so a stale buildinfo cannot
poison the Docker image.

## When you change the contract (API First)

Changed a route or event? The contract changes **here first**, then the code:

1. Edit the schema/event in `src/`.
2. `pnpm --filter @app/contracts build` (else consumers see the old contract).
3. Update producer (`apps/api`), consumer (`apps/api` worker) and web for the new shape.
4. Reflect the change in the API Swagger and the docs (`docs/`).

**Event versioning:** additive change keeps the routing key and adds optional
fields only; a breaking change bumps the `version` literal AND the routing-key
segment, and you confirm the `#` binding still covers it.

The ubiquitous language (`<Feature>`, `conversation`, `authorId`, …) is the same
in code, tests, docs and event messages — do not introduce synonyms.
