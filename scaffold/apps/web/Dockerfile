# syntax=docker/dockerfile:1.7
# Next.js standalone output, built from the monorepo root. Requires
# `output: 'standalone'` in apps/web/next.config — the build then emits a minimal
# self-contained server bundle (server.js + pruned node_modules) preserving the
# monorepo layout, which is what the runner stage copies below.
#
# Build from the REPO ROOT: compose.yaml sets `context: .` + `dockerfile:
# apps/web/Dockerfile` so the whole monorepo workspace is available to install.
ARG NODE_VERSION=22-alpine

# ---- base ----
FROM node:${NODE_VERSION} AS base
RUN corepack enable
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /repo

# ---- build ----
FROM base AS build
COPY . .
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile
# GOTCHA: @app/contracts MUST be built before the web app — it imports the
# compiled dist (shared event/DTO contracts).
RUN pnpm --filter @app/contracts build
RUN pnpm --filter @app/web build

# ---- runner: fresh image, non-root, copy only the standalone bundle ----
FROM node:${NODE_VERSION} AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
RUN addgroup -g 1001 nodejs && adduser -u 1001 -G nodejs -S nextjs
# standalone bundles a minimal node_modules + server.js (monorepo layout preserved)
COPY --from=build --chown=nextjs:nodejs /repo/apps/web/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=build --chown=nextjs:nodejs /repo/apps/web/public ./apps/web/public
USER nextjs
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
