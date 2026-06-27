# @app/web — `src` layout

This is a **stub** of the web app's source tree. The point of the harness is the
**channel/proxy boundary**, not a feature-rich frontend, so only the load-bearing
files are scaffolded here. Add real UI under `src/app/` as vertical slices grow.

## What lives where

```
src/
├── auth.ts                # Auth.js entrypoint (handlers, signIn/signOut, auth())
├── auth.config.ts         # session strategy + callbacks (jwt/session) — edge-safe
├── middleware.ts          # gate: redirects unauthenticated requests
├── lib/
│   └── api-token.ts       # mints the short-lived HS256 API JWT for the API
└── app/
    ├── (protected)/       # authenticated routes (your <Feature> UI goes here)
    └── api/
        └── proxy/
            └── [...path]/
                └── route.ts   # server-side proxy: attaches Bearer, forwards to the API
```

## The one rule that matters here

**The browser never sees a privileged credential.** Two distinct secrets enforce
this (see the app README, "Architecture A"):

1. The Auth.js session cookie is encrypted with `AUTH_SECRET` (browser-facing).
2. A separate **API JWT** is minted in `lib/api-token.ts` with the shared
   `AUTH_API_SECRET` and attached **only inside** `app/api/proxy/[...path]/route.ts`,
   which runs on the server. Client components call **relative** `/api/proxy/...`
   paths; they never hold the Bearer and never call the API directly.

The scope/identity claim in that API JWT is taken from the **authenticated
session**, never from request input — the API re-verifies it. Keep all calls to the
API flowing through the proxy route so this boundary holds for every request.

> **Another presentation that needs the same boundary** (e.g. a mobile app with
> its own server-side proxy) replicates this `lib/api-token.ts` + proxy-route
> pattern in its sibling app. The **API secret is shared with the API**; the
> **session is per-channel** (each presentation owns its own session secret).

## Adding UI

When a slice needs a screen, add a route under `app/(protected)/<feature>/` and
fetch data via the relative `/api/proxy/...` proxy. Shared request/response shapes
come from `@app/contracts` (the compiled dist) — never hand-roll a DTO type that
already exists in contracts; that is the single source of truth shared with the API.

> General setup, the end-to-end flow and the development guidelines live in the
> [root README](../../../../README.md) and [`CLAUDE.md`](../../../../CLAUDE.md).
> This file documents only the `src` layout of the web stub.
