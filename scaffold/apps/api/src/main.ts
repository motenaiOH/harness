/**
 * SPINE (illustrative) — NOT copy-and-compile. Imports LEAF files the adopter
 * materializes from the layer `README.md`s (`./swagger`, `./app.module` and the
 * modules it pulls in). As copied it will NOT typecheck until those leaves
 * exist. See the root README "Status do scaffold" and
 * `docs/how-to/replicate-this-harness.md`.
 */
/**
 * API entrypoint (one of three runtime roles for this single image):
 *   node --require ./dist/otel.js dist/main.js
 *
 * The HTTP write path does NO inline persistence — it publishes an event and
 * returns; the worker (dist/worker.js) persists asynchronously.
 */
import "reflect-metadata";
import { Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { SwaggerModule } from "@nestjs/swagger";
import helmet from "helmet";
import { AppModule } from "./app.module";
import { configureApp } from "./bootstrap";
import { buildOpenApiDocument } from "./swagger";
import type { Env } from "./config/env.schema";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: false });
  const config = app.get(ConfigService<Env, true>);

  // Request validation is per-route via ZodValidationPipe (zod contracts) — no
  // global ValidationPipe, so it never runs against injected params (@CurrentUser).
  configureApp(app);

  // Security headers — applied in main.ts ONLY, not in configureApp(), so the
  // offline OpenAPI doc builder (which calls configureApp without app.init())
  // is not affected and the generated contract matches runtime exactly.
  // CSP is intentionally disabled so the Swagger UI at /docs keeps working;
  // re-enabling it requires whitelisting the docs assets — document the trade-off.
  app.use(helmet({ contentSecurityPolicy: false }));

  SwaggerModule.setup("docs", app, buildOpenApiDocument(app));

  const port = config.get("PORT", { infer: true });
  await app.listen(port, "0.0.0.0");
  Logger.log(
    `app-api listening on http://0.0.0.0:${port} (docs at /docs)`,
    "Bootstrap",
  );
}

void bootstrap();
