import { z } from "zod";

/**
 * Validated environment schema. Boot FAILS FAST if anything is missing/invalid
 * (used by ConfigModule.forRoot({ validate: validateEnv })). Validating config
 * at the edge means the rest of the app can trust process.env.
 */
export const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(3001),
  // Comma-separated allowlist of CORS origins (read by bootstrap.ts) — never "*".
  CORS_ORIGIN: z.string().default("http://localhost:3000"),

  // Core infra.
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  RABBITMQ_URI: z.string().min(1),

  // Architecture A — shared HS256 secret with the web app. 32 bytes base64
  // (~44 chars). The web mints a short-lived API JWT; the API verifies it
  // (pinned iss/aud/HS256). Distinct from the session-cookie secret — do not
  // conflate the two roles.
  AUTH_API_SECRET: z.string().min(44),
  JWT_ISSUER: z.string().default("app-web"),
  JWT_AUDIENCE: z.string().default("app-api"),

  // 32-byte key, base64-encoded (~44 chars), used by the AES-256-GCM cipher to
  // encrypt/decrypt sensitive settings/secrets stored at rest (the "vault").
  SETTINGS_SECRET_KEY: z.string().min(44),

  // Rate limiting — configurable so e2e/dev stacks can raise the limit without
  // changing the secure production default (100 req / 60 s window).
  THROTTLE_TTL: z.coerce.number().int().positive().default(60000),
  THROTTLE_LIMIT: z.coerce.number().int().positive().default(100),
  // Strict brute-force ceiling for the login route, separate from the global
  // limit so credential-stuffing is throttled harder than ordinary traffic.
  THROTTLE_LOGIN_LIMIT: z.coerce.number().int().positive().default(5),

  // Telemetry. Empty string (telemetry disabled) is treated as "not set" so the
  // OTel SDK no-ops cleanly. Best-effort: an absent endpoint never fails boot.
  OTEL_EXPORTER_OTLP_ENDPOINT: z.preprocess(
    (v) => (v === "" ? undefined : v),
    z.string().url().optional(),
  ),

  // AI / LLM (optional, deterministic-first). The critical path works WITHOUT an
  // LLM; the gateway no-ops into a deterministic fallback when no key/provider is
  // set. Empty strings are treated as "not set" so keyless CI stays clean.
  LLM_PROVIDER: z
    .preprocess(
      (v) => (v === "" ? undefined : v),
      z.enum(["none", "openai", "anthropic"]).optional(),
    ),
  LLM_API_KEY: z.preprocess(
    (v) => (v === "" ? undefined : v),
    z.string().optional(),
  ),
  LLM_MODEL: z.preprocess(
    (v) => (v === "" ? undefined : v),
    z.string().optional(),
  ),
  LLM_MAX_TOKENS: z.coerce.number().int().positive().default(256),
  LLM_TIMEOUT_MS: z.coerce.number().int().positive().default(10000),
});

export type Env = z.infer<typeof envSchema>;

/** Used by ConfigModule.forRoot({ validate }). Throws on invalid env. */
export function validateEnv(config: Record<string, unknown>): Env {
  const parsed = envSchema.safeParse(config);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  return parsed.data;
}
