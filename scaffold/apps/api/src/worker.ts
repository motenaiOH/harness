/**
 * SPINE (illustrative) — NOT copy-and-compile. Imports LEAF files the adopter
 * materializes from the layer `README.md`s (`./worker/db`,
 * `./worker/persist.handler`). As copied it will NOT typecheck until those
 * leaves exist. See the root README "Status do scaffold" and
 * `docs/how-to/replicate-this-harness.md`.
 */
/**
 * Standalone RabbitMQ worker — the SECOND runtime role of this image (no Nest).
 * Runs:  node --require ./dist/otel.js dist/worker.js
 *
 * Consumes feature.# from the durable topic exchange and persists each event to
 * Postgres IDEMPOTENTLY (INSERT ... ON CONFLICT DO NOTHING on the producer-
 * generated id). At-least-once delivery is safe because dedup is in the
 * consumer, never the broker. Permanent failures are dead-lettered WITHOUT
 * requeue (no poison-message loop).
 *
 * Shutdown sequence (single owner — otel.ts does NOT self-register signals):
 *   1. Stop accepting new deliveries (cancel the consumer)
 *   2. Await all in-flight handler promises (hard timeout)
 *   3. Close the AMQP channel wrapper
 *   4. Close the AMQP connection
 *   5. Close the Postgres pool
 *   6. Flush + shut down the OTel SDK
 *   7. process.exit(0)
 */
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { config as loadEnv } from "dotenv";
import amqp from "amqp-connection-manager";
import type { ConfirmChannel, ConsumeMessage } from "amqplib";
import {
  FEATURE_BINDING_PATTERN,
  FEATURE_DLQ,
  FEATURE_DLX,
  FEATURE_EXCHANGE,
  FEATURE_QUEUE,
  FeatureExecutedEventSchema,
} from "@app/contracts";
import { ZodError } from "zod";
import { createWorkerDb } from "./worker/db";
import { handleFeatureExecuted } from "./worker/persist.handler";
import { shutdownOtel } from "./otel";

// Load .env from the worker dir or the monorepo root (dev convenience).
for (const p of [".env", resolve(process.cwd(), "../../.env")]) {
  if (existsSync(p)) loadEnv({ path: p });
}

const RABBITMQ_URI = process.env.RABBITMQ_URI;
const DATABASE_URL = process.env.DATABASE_URL;
if (!RABBITMQ_URI || !DATABASE_URL) {
  throw new Error("worker requires RABBITMQ_URI and DATABASE_URL");
}

const { db, pool } = createWorkerDb(DATABASE_URL);
const connection = amqp.connect([RABBITMQ_URI]); // auto-reconnecting manager

connection.on("connect", () => console.log("[worker] connected to RabbitMQ"));
connection.on("disconnect", (e) =>
  console.warn("[worker] disconnected from RabbitMQ:", e?.err?.message),
);

// ── In-flight tracking ────────────────────────────────────────────────────────
// Each handler promise is registered here so shutdown can drain them gracefully
// before closing connections — without this, SIGTERM would drop in-flight work.
const inFlight = new Set<Promise<void>>();

// Consumer tag captured from channel.consume() so we can cancel it on shutdown.
let consumerTag: string | undefined;

// createChannel({setup}) declares the WHOLE topology idempotently on connect,
// so a reconnect re-runs the setup (assert/bind are idempotent).
const channelWrapper = connection.createChannel({
  json: false,
  setup: async (channel: ConfirmChannel) => {
    await channel.assertExchange(FEATURE_EXCHANGE, "topic", { durable: true });
    await channel.assertExchange(FEATURE_DLX, "topic", { durable: true });
    await channel.assertQueue(FEATURE_QUEUE, {
      durable: true,
      deadLetterExchange: FEATURE_DLX, // poison/failed msgs route to the DLX
    });
    await channel.assertQueue(FEATURE_DLQ, { durable: true });
    await channel.bindQueue(FEATURE_QUEUE, FEATURE_EXCHANGE, FEATURE_BINDING_PATTERN);
    await channel.bindQueue(FEATURE_DLQ, FEATURE_DLX, "#");
    await channel.prefetch(10);
    const { consumerTag: tag } = await channel.consume(
      FEATURE_QUEUE,
      (msg) => void onMessage(msg),
      { noAck: false }, // explicit ack/nack
    );
    consumerTag = tag;
    console.log(
      `[worker] consuming ${FEATURE_QUEUE} (pattern ${FEATURE_BINDING_PATTERN})`,
    );
  },
});

async function onMessage(msg: ConsumeMessage | null): Promise<void> {
  if (!msg) return;

  const promise = (async () => {
    try {
      // Defensive validation at the boundary: re-parse with the SAME zod schema
      // the producer used, BEFORE touching the DB. Rejects poison messages.
      const event = FeatureExecutedEventSchema.parse(
        JSON.parse(msg.content.toString()),
      );
      await handleFeatureExecuted(db, event);
      channelWrapper.ack(msg);
      console.log(`[worker] persisted message ${event.messageId}`);
    } catch (err) {
      // nack(msg, allUpTo=false, requeue=false): requeue=true would loop a
      // poison message forever — always dead-letter without requeue.
      if (err instanceof ZodError) {
        const issues = err.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("; ");
        console.error(`[worker] invalid event, dead-lettering: ${issues}`);
      } else {
        console.error(
          "[worker] handler failed, dead-lettering:",
          (err as Error).message,
        );
      }
      channelWrapper.nack(msg, false, false);
    }
  })();

  inFlight.add(promise);
  promise.finally(() => inFlight.delete(promise));
}

channelWrapper.waitForConnect().then(() => console.log("[worker] ready"));

// ── Shutdown ──────────────────────────────────────────────────────────────────
const DRAIN_TIMEOUT_MS = 10_000;

async function shutdown(signal: string): Promise<void> {
  console.log(`[worker] ${signal} received, shutting down...`);

  // 1. Stop accepting new deliveries.
  try {
    if (consumerTag) {
      await channelWrapper.cancelAll();
      console.log("[worker] consumer cancelled");
    }
  } catch (err) {
    console.warn("[worker] could not cancel consumer:", (err as Error).message);
  }

  // 2. Drain in-flight handlers (with hard timeout).
  if (inFlight.size > 0) {
    console.log(`[worker] draining ${inFlight.size} in-flight message(s)...`);
    const drain = Promise.allSettled([...inFlight]);
    const timeout = new Promise<void>((res) =>
      setTimeout(() => res(), DRAIN_TIMEOUT_MS),
    );
    await Promise.race([drain, timeout]);
    console.log("[worker] drain complete");
  }

  // 3-5. Close resources.
  try {
    await channelWrapper.close();
  } catch (err) {
    console.warn("[worker] channel close error:", (err as Error).message);
  }
  try {
    await connection.close();
  } catch (err) {
    console.warn("[worker] connection close error:", (err as Error).message);
  }
  try {
    await pool.end();
  } catch (err) {
    console.warn("[worker] pool close error:", (err as Error).message);
  }

  // 6. Flush OTel (best-effort).
  await shutdownOtel();

  // 7. Exit cleanly.
  process.exit(0);
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
