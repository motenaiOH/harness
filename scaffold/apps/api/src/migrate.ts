/**
 * Migration entrypoint — the THIRD runtime role of this image. Applies Drizzle
 * migrations from ./drizzle, then exits. Run as a ONE-SHOT before the API/worker:
 *   node dist/migrate.js
 *
 * In Compose this is a `restart: no` service that API/worker depend on with
 * `service_completed_successfully` (not `healthy`) — forgetting that condition
 * lets the workloads boot against a non-existent schema. In Helm it is a
 * pre-install/pre-upgrade Job hook ordered before the Deployments.
 */
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { config as loadEnv } from "dotenv";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

for (const p of [".env", resolve(process.cwd(), "../../.env")]) {
  if (existsSync(p)) loadEnv({ path: p });
}

async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is required to migrate");

  const pool = new Pool({ connectionString });
  const db = drizzle(pool);
  // In the prod image the migrations sit next to dist; in dev they sit at the
  // package root. Resolve both so the same binary works in either layout.
  const migrationsFolder = existsSync(resolve(process.cwd(), "drizzle"))
    ? resolve(process.cwd(), "drizzle")
    : resolve(__dirname, "../drizzle");

  console.log(`[migrate] applying migrations from ${migrationsFolder}`);
  await migrate(db, { migrationsFolder });
  await pool.end();
  console.log("[migrate] done");
}

main().catch((err) => {
  console.error("[migrate] failed:", err);
  process.exit(1);
});
