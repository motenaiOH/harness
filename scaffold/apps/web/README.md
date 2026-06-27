# @app/web

> **`apps/web` is ONE presentation over the API.** Others — say `apps/mobile`,
> `apps/cli`, or a public-API client — would be **sibling apps** consuming the
> **same API**, each resolving its own trust boundary. The web app is the
> *reference* edge, not the only possible one.

Frontend in **Next.js 15 (App Router) + Auth.js v5**. This app is intentionally a
**thin presentation**: it logs the user in, keeps the session, and acts as an
**authenticated server-side proxy** to the API. The Bearer token is attached
**server-side** and **never reaches the browser**, and the app holds **no domain
logic** — every meaningful operation is a call through to the API.

> Monorepo setup, full stack and the end-to-end flow live in the
> [root README](../../../README.md) and [`docs/`](../../../docs/index.md). The
> mandatory development guidelines (TDD, API-first, doc-first) are in the root
> [`CLAUDE.md`](../../../CLAUDE.md). This README only covers what is specific to web.

## Why web is just a stub here

The reference harness keeps the business surface in the API (clean architecture,
ports & adapters). The web app exists to prove the **trust boundary**: a
browser-facing session secret on one side, a shared HS256 API secret on the other,
and a server-side proxy that bridges them so no privileged credential is ever
exposed to client JavaScript. Everything below is the *receipt* for that boundary,
not a place to grow features.

## Key paths

| Path | Role |
|---|---|
| `src/auth.ts`, `src/auth.config.ts` | Auth.js configuration (session, callbacks) |
| `src/lib/api-token.ts` | mints the short-lived HS256 **API JWT** (inside the `jwt` callback) that the API verifies |
| `src/app/api/proxy/[...path]/route.ts` | proxy route that attaches `Authorization: Bearer …` **server-side** and forwards to the API |
| `src/middleware.ts` | protects the authenticated routes |

## Auth ("Architecture A" — two secrets, do not conflate)

Defense in depth: the browser-facing secret and the service-to-service secret are
deliberately **different keys** so that a leak of one cannot forge the other.

- `AUTH_SECRET` — encrypts the Auth.js session cookie (browser-facing).
- `AUTH_API_SECRET` — a **shared HS256 secret** between web and the API. The web app
  mints a short-lived API JWT (`src/lib/api-token.ts`) that the API verifies with a
  pinned `iss`/`aud` and `HS256`. **The Bearer never reaches the browser** — it is
  attached by the proxy route `src/app/api/proxy/[...path]/route.ts` on the server.

The identity/scope claim carried by that API JWT comes from the **authenticated
context**, never from user input — the API re-derives the scope from the verified
claim. See the auth-flow explainer linked from the root docs.

## Commands

All from the repo root. **Build `@app/contracts` first** (the web imports its
compiled `dist` for the shared DTOs — and, in async mode, events — see that
package's README).

```bash
pnpm --filter @app/web dev         # next dev on :3000 (use this locally — see gotcha below)
pnpm --filter @app/web build       # next build
pnpm --filter @app/web typecheck
pnpm --filter @app/web lint
```

The E2E tests (Playwright) live at the repo root (`e2e/`) and drive the app via
`BASE_URL` with the stack running — see the root README.

## Web-specific gotchas

- **Windows:** the build with `output:'standalone'` fails at the symlink
  trace-copy step **without Developer Mode** enabled. Compilation itself passes —
  use `next dev` locally. The Docker (Linux) build produces the standalone bundle
  normally.
- Imports `@app/contracts` **compiled** (`dist`) for the DTOs/events — build the
  contracts package before building/running web.
