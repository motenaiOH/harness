# deploy — Helm chart `<app>` (RECIPE / REFERENCE — chart NOT included)

> **This folder is a RECIPE, not a working chart.** The scaffold ships this
> README only — the actual Helm chart, kind smoke harness, and CI wiring do **not**
> come with the scaffold. Everything below describes the SHAPE to materialize for
> YOUR project; nothing here is runnable until you create the files. Record the
> deploy decisions for your project in a NEW ADR (copy `docs/adr/0000-adr-template.md`)
> and keep `docs/how-to/current-state.md` updated as you build the chart out.

## What to materialize (checklist)

None of the paths below exist yet in the scaffold — create them when you stand up
deploy for your project:

- [ ] `deploy/k8s/<app>-secrets.template.yaml` — Secret template (placeholder values + gen hints)
- [ ] `deploy/helm/<app>/Chart.yaml` — appVersion doubles as the default image tag
- [ ] `deploy/helm/<app>/values.yaml` — safe defaults (secret.create=false, ingress/HPA/PDB off)
- [ ] `deploy/helm/<app>/values-dev.yaml` — dev overrides (1 replica)
- [ ] `deploy/helm/<app>/values-stg.yaml` — stg overrides (2 replicas)
- [ ] `deploy/helm/<app>/values-prd.yaml` — prd overrides (ingress + HPA + PDB on, 3 replicas)
- [ ] `deploy/helm/<app>/values-kind.yaml` — kind smoke overrides (local images, in-chart secret)
- [ ] `deploy/helm/<app>/templates/` — workloads, services, ingress, hpa, pdb, migrate Job
- [ ] `deploy/helm/<app>/templates/_helpers.tpl` — shared image-ref + securityContext named templates
- [ ] `deploy/kind/kind-deps.yaml` — ephemeral Postgres + Redis + RabbitMQ for smoke
- [ ] `deploy/kind/smoke.sh` — end-to-end kind smoke script
- [ ] a new ADR recording the deploy decisions (copy the ADR template)
- [ ] (optional) a CI workflow (e.g. `.github/workflows/helm.yml`) running the validation ladder

## Target structure (once materialized)

```
deploy/
  k8s/
    <app>-secrets.template.yaml — Secret template (placeholder values + gen hints)
  helm/<app>/                    — the chart
    Chart.yaml                   — appVersion doubles as the default image tag
    values.yaml                  — safe defaults (secret.create=false, ingress/HPA/PDB off)
    values-dev.yaml              — dev overrides (1 replica)
    values-stg.yaml              — stg overrides (2 replicas)
    values-prd.yaml              — prd overrides (ingress + HPA + PDB on, 3 replicas)
    values-kind.yaml             — kind smoke overrides (local images, in-chart secret)
    templates/                   — workloads, services, ingress, hpa, pdb, migrate Job
  kind/
    kind-deps.yaml               — ephemeral Postgres + Redis + RabbitMQ for smoke
    smoke.sh                     — end-to-end kind smoke script
```

The rest of this document is the **design intent** for each of those pieces — the
WHY behind the chart so the implementation does not drift.

## Core model

**One image, three commands.** The same backend image runs the api, the worker,
and the one-shot migrator — differentiated only by the container `command:` array
(the exact arrays Compose and Terraform also use).

**Schema-before-workload, enforced.** The migration runs as a Helm
`pre-install,pre-upgrade` **Job hook** with `hook-weight: -5` so the schema is
applied before any workload starts. Supporting ConfigMap/ServiceAccount use
weight `-10` so they exist before the migrate hook runs. `backoffLimit` aborts a
failed migration instead of corrupting the schema; failed Jobs are retained for
log access.

**Reference the Secret, don't create it.** Non-secret env lives in a ConfigMap;
connection strings and keys live in a Secret the chart **references by name**
(`envFrom.secretRef`) rather than creates (`secret.create=false` by default). Your
platform provisioning (e.g. Terraform from a Key Vault/secret manager) creates it
out-of-band. If any required key is absent, pods fail with
`CreateContainerConfigError` — the chart references but does not validate it.

**Safe defaults; risk is opt-in per environment.** `ingress`/`hpa`/`pdb`/
`secret.create` default to disabled in `values.yaml`; only the env values file
that needs them turns them on (e.g. `values-prd.yaml`). The base chart is harmless
to render anywhere.

**Hardening centralized.** Pod + container `securityContext` (runAsNonRoot,
numeric runAsUser/runAsGroup = `1001` matching the image UID, drop ALL caps,
allowPrivilegeEscalation:false, seccompProfile:RuntimeDefault) is defined ONCE in
`_helpers.tpl` named templates and included by every workload, so hardening can't
drift between deployments.

## Required Secret keys

The referenced Secret MUST contain:

| Key                   | Description                                                  |
| --------------------- | ------------------------------------------------------------ |
| `DATABASE_URL`        | `postgres://user:pass@host:5432/<db>?sslmode=require`        |
| `REDIS_URL`           | `rediss://user:pass@host:6380` (TLS)                         |
| `RABBITMQ_URI`        | `amqp://user:pass@broker:5672` (see broker note below)       |
| `AUTH_SECRET`         | Session-cookie encryption key (>= 32 chars)                 |
| `AUTH_API_SECRET`     | Shared HS256 secret between web and the API (>= 44 chars base64) |
| `SETTINGS_SECRET_KEY` | AES-256-GCM key for the settings vault, base64 (>= 44 chars) |
| `LLM_API_KEY`         | Optional — absent/empty = deterministic fallback (no LLM)    |

## Cluster prerequisites (real env)

1. **Namespace** exists (or `helm upgrade --install --create-namespace`).
2. **Secret pre-provisioned** with every key above.
3. **ingress-nginx + cert-manager** present when ingress is enabled (the chart
   uses `ingressClassName: nginx` + a cert-manager cluster-issuer annotation; the
   TLS secret name is derived from the host: dots→dashes + `-tls`).

## Deploy

```bash
helm upgrade --install <app> ./deploy/helm/<app> \
  -n <namespace> \
  -f deploy/helm/<app>/values-<env>.yaml \
  --wait --timeout 5m
```

## Validation ladder (validate without a cluster, then prove with a throwaway one)

```bash
# Cheap, every PR (wire this into a CI workflow you create, e.g.
# .github/workflows/helm.yml — it is NOT provided by the scaffold):
helm lint ./deploy/helm/<app>
helm template ./deploy/helm/<app> -f deploy/helm/<app>/values-prd.yaml \
  | kubeconform -strict -ignore-missing-schemas

# End-to-end confidence on an ephemeral cluster:
bash deploy/kind/smoke.sh
```

`smoke.sh` builds both images, `kind load`s them under the exact `repo:tag` the
image-ref helper renders (kind values use empty registry + `pullPolicy: Never`),
applies ephemeral deps, installs the chart, then asserts the migrate Job
completed and all rollouts are ready and `GET /health` returns 200 — with an EXIT
trap that tears the cluster down. Because `hook-delete-policy:hook-succeeded` may
already have removed the migrate Job, the script treats "not found" as success.

## Broker note (cross-cloud follow-up)

The worker speaks **AMQP 0-9-1** (RabbitMQ). Some managed brokers (e.g. Azure
Service Bus) speak AMQP 1.0 and are **not** wire-compatible — the worker would
`CrashLoopBackOff` there until a broker decision (in-cluster RabbitMQ vs. a
cloud-broker adapter) is made. The chart stays broker-agnostic (`RABBITMQ_URI`
from the Secret); treat the broker as an explicit env-breaking dependency, not an
afterthought.

## Probe strategy per workload shape

- **api** (HTTP): `httpGet` readiness + liveness on a version-neutral `/health`.
- **worker** (headless, no port/Service): `exec` liveness (`pgrep -f dist/worker.js`).
- **web** (frontend): `tcpSocket` until it grows a real health route.
