# Observability

Two deliberately different scenarios. Telemetry is **best-effort by
construction**: every OTel path is wrapped so a collector outage never propagates
to the business flow, and the SDK is only instantiated when
`OTEL_EXPORTER_OTLP_ENDPOINT` is set. Absent endpoint (incl. empty string) means
"observability off" — CI/keyless runs need no change and no mocks.

## Dev — all-in-one (`otel-lgtm`)

`compose.observability.yaml` runs the **`grafana/otel-lgtm`** image, which packs
Grafana + Tempo + Loki + Prometheus + an OTLP collector into a single container.
It is the local default:

```bash
docker compose -f compose.yaml -f compose.observability.yaml \
  --profile observability up -d --wait
# Grafana: http://localhost:3030
```

The apps export OTLP to `http://otel-lgtm:4318` (the overlay sets
`OTEL_EXPORTER_OTLP_ENDPOINT` on the same services). What flows:

- **Traces** → Tempo (HTTP/Express/pg/amqp auto-instrumentation + worker spans).
- **Metrics** → Prometheus. The `NodeSDK` exports metrics from the OTLP endpoint.
  Domain metrics come through a `MetricsPort` in the application layer (no OTel
  import there) with an `OtelMetricsRecorder` adapter in infrastructure.
- **Logs** → Loki. `apps/api/src/otel.ts` bridges `stdout`/`stderr` to OTLP log
  records with trace correlation.

### Metric cardinality is a contract

Metric attributes are ONLY low-cardinality, enumerable dimensions (e.g. an
operation name, an outcome, a result kind). NEVER add per-request, per-user, or
per-tenant ids as labels — that explodes the Prometheus time-series count. The
tenant/identity that scopes a query comes from the verified JWT claim and stays
out of the metric labels.

### Naming gotcha (OTel → Prometheus)

Instrument names use dots (`app.feature.duration_ms`); the exporter converts to
underscores and appends suffixes (`_total`, `_bucket`). Do NOT set `unit: 'ms'`
on a histogram whose name already ends in `_ms` — the exporter would append
`_milliseconds` (`app_feature_duration_ms_milliseconds`) and break the dashboard
`_bucket` queries. The name carries the unit, not the `unit` field.

### Provisioned dashboards (dashboard-as-code)

- `grafana/dashboards/app-domain.json` — RED of HTTP (rate/latency per route),
  span metrics per service, Node event-loop, logs (Loki), traces (Tempo), and the
  low-cardinality domain metrics.
- `grafana/provisioning/dashboards/app.yaml` — the file-based provider that loads
  the dashboard above; mounted next to otel-lgtm's built-ins by the overlay.

## Prod — split collector (reference, **not** mounted in dev)

A production topology has separate services (a dedicated collector →
Tempo/Loki/Prometheus). Files such as `prometheus.yml`, `tempo.yaml`,
`loki-config.yaml`, and `grafana/provisioning/datasources/datasources.yaml` are
**reference templates** — no compose mounts them today; they point at hosts
(`prometheus:9090`, `tempo:3200`, `loki:3100`) that do not exist in the dev stack.
They are executable documentation of the destination, not active config.

When materializing prod, mount these into their respective services.
