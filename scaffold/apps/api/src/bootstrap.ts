import { INestApplication, VersioningType } from "@nestjs/common";

/**
 * App configuration SHARED by main.ts (runtime) and the offline OpenAPI doc
 * builder used by the contract drift gate. Putting versioning/CORS/shutdown here
 * (and ONLY here) guarantees the generated doc reflects the same routing the
 * server actually serves — "offline == runtime" parity.
 *
 * NOTE: anything that needs app.init() / mutates HTTP responses (e.g. helmet)
 * must stay in main.ts, NOT here, or the offline builder would diverge.
 */
export function configureApp(app: INestApplication): void {
  // URI versioning: every route is under /v1 (defaultVersion). Health is
  // VERSION_NEUTRAL so the Docker healthcheck hits an unversioned path.
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: "1" });

  // CORS allowlist — NEVER a wildcard (a denylist always forgets something).
  // Bootstrap reads process.env directly because it runs before/around Nest's
  // ConfigModule initialisation.
  const origins = (process.env.CORS_ORIGIN ?? "http://localhost:3000")
    .split(",")
    .map((o) => o.trim());
  app.enableCors({ origin: origins, credentials: true });

  app.enableShutdownHooks();
}
