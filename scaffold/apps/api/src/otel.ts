/**
 * OpenTelemetry bootstrap. Preloaded BEFORE Nest (and before the worker) via:
 *   node --require ./dist/otel.js dist/main.js
 *
 * Preloading is what makes producer->broker->consumer trace context propagate
 * for free: the amqplib auto-instrumentation injects/extracts the trace context
 * only because it patches the library before the app imports it. A worker
 * started without `--require ./dist/otel.js` gets an orphaned consumer span.
 *
 * Best-effort BY DESIGN: any failure (e.g. no collector reachable) is logged and
 * swallowed, and the whole SDK is a no-op when OTEL_EXPORTER_OTLP_ENDPOINT is
 * empty — observability must never take the application down or gate startup.
 */
import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";
import { PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";
import { resourceFromAttributes } from "@opentelemetry/resources";
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from "@opentelemetry/semantic-conventions";

const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
const serviceName = process.env.OTEL_SERVICE_NAME ?? "app-api";

let sdk: NodeSDK | undefined;

if (endpoint) {
  try {
    sdk = new NodeSDK({
      resource: resourceFromAttributes({
        [ATTR_SERVICE_NAME]: serviceName,
        [ATTR_SERVICE_VERSION]: "0.1.0",
      }),
      traceExporter: new OTLPTraceExporter({ url: `${endpoint}/v1/traces` }),
      metricReader: new PeriodicExportingMetricReader({
        exporter: new OTLPMetricExporter({ url: `${endpoint}/v1/metrics` }),
        exportIntervalMillis: 10_000,
      }),
      instrumentations: [
        getNodeAutoInstrumentations({
          "@opentelemetry/instrumentation-fs": { enabled: false },
        }),
      ],
    });
    sdk.start();
    console.log(`[otel] tracing enabled for ${serviceName} -> ${endpoint}`);
  } catch (err) {
    console.warn("[otel] disabled (init failed):", (err as Error).message);
  }
} else {
  console.log("[otel] disabled (no OTEL_EXPORTER_OTLP_ENDPOINT set)");
}

/**
 * Flush and shut down the OTel SDK (best-effort; never rejects).
 *
 * Called BY THE PROCESS OWNER (the worker shutdown sequence, or main.ts's
 * SIGTERM handler) — NOT self-registered here. A single shutdown owner per
 * process avoids two SIGTERM handlers racing to call process.exit() and
 * truncating in-flight work.
 */
export async function shutdownOtel(): Promise<void> {
  if (!sdk) return;
  try {
    await sdk.shutdown();
  } catch {
    /* best-effort — never let telemetry block the exit */
  }
}
