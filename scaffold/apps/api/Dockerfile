# syntax=docker/dockerfile:1.7
# ONE image, THREE runtime roles. This shared backend image carries the API
# (HTTP api), the worker (broker consumer), and the one-shot migrator. They are
# differentiated at RUNTIME by overriding the container command — Compose, Helm,
# and Terraform all pass the same command-override arrays:
#   api     -> node --require ./dist/otel.js dist/main.js   (the default CMD below)
#   worker  -> node --require ./dist/otel.js dist/worker.js
#   migrate -> node dist/migrate.js          (no OTel preload: minimal one-shot)
#
# Building once guarantees the three roles share identical deps and build
# provenance.
#
# Build from the REPO ROOT: compose.yaml sets `context: .` + `dockerfile:
# apps/api/Dockerfile` so the whole monorepo workspace is available to install.
ARG NODE_VERSION=22-alpine

# ---- base: corepack + dumb-init (PID-1 init that reaps zombies, forwards signals)
FROM node:${NODE_VERSION} AS base
RUN corepack enable && apk add --no-cache dumb-init
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
WORKDIR /repo

# ---- build: install everything, build the SHARED package FIRST, then the app,
#      then produce a pruned production bundle.
FROM base AS build
COPY . .
# BuildKit cache mount on the pnpm store keeps installs fast across builds.
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile
# GOTCHA: @app/contracts MUST be built before the app — the app imports its
# compiled dist. Build contracts, then the api.
RUN pnpm --filter @app/contracts build && pnpm --filter @app/api build
# `pnpm deploy` prunes to prod deps + the package's `files` whitelist (dist +
# migrations). pnpm 10 requires --legacy on deploy.
RUN pnpm --filter @app/api --prod --legacy deploy /prod/api

# ---- runner: fresh image, non-root, copy only the pruned bundle ----
FROM node:${NODE_VERSION} AS runner
RUN apk add --no-cache dumb-init
WORKDIR /app
ENV NODE_ENV=production
# Create a NUMERIC uid/gid. Kubernetes rejects runAsNonRoot:true when the image's
# USER is a name rather than a number, so the Helm securityContext pins 1001 to
# match this user.
RUN addgroup -g 1001 nodejs && adduser -u 1001 -G nodejs -S nodejs
COPY --from=build --chown=nodejs:nodejs /prod/api/node_modules ./node_modules
COPY --from=build --chown=nodejs:nodejs /prod/api/dist ./dist
COPY --from=build --chown=nodejs:nodejs /prod/api/drizzle ./drizzle
COPY --from=build --chown=nodejs:nodejs /prod/api/package.json ./package.json
USER nodejs
EXPOSE 3001
ENTRYPOINT ["dumb-init", "--"]
# Default CMD = the primary role (api). Compose/Helm override it for worker/migrate.
CMD ["node", "--require", "./dist/otel.js", "dist/main.js"]
