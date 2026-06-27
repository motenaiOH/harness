/**
 * SPINE (illustrative) — NOT copy-and-compile.
 *
 * Imports LEAF modules the adopter materializes from the layer `README.md`s:
 * `auth/*`, `health/*`, the cross-cutting `infrastructure/{cache,database,
 * messaging}` modules and the feature module's inner files. As copied it will
 * NOT typecheck until those leaves exist — it shows how the bounded contexts
 * join into one deploy, not finished code. See the root README "Status do
 * scaffold" and `docs/how-to/replicate-this-harness.md`.
 */
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { AuthModule } from "./auth/auth.module";
import { JwtAuthGuard } from "./auth/jwt-auth.guard";
import { validateEnv } from "./config/env.schema";
import { RedisModule } from "./infrastructure/cache/redis.module";
import { DrizzleModule } from "./infrastructure/database/drizzle/drizzle.module";
import { MessagingModule } from "./infrastructure/messaging/messaging.module";
import { HealthModule } from "./modules/health/health.module";
import { FeatureModule } from "./modules/feature/feature.module";

// ThrottlerModule is configured before Nest DI is available, so we read from
// process.env directly. validateEnv() has already coerced and validated these
// at boot, so the same defaults apply when the vars are absent.
const throttleTtl = Number(process.env.THROTTLE_TTL) || 60000;
const throttleLimit = Number(process.env.THROTTLE_LIMIT) || 100;

/**
 * Composition of the modular monolith: each feature is a bounded context
 * imported as its own module; this is where the contexts join into ONE deploy.
 *
 * Default = a modular monolith in a single deploy. Extracting a bounded context
 * into its own service requires a concrete reason (scale, isolation, ownership) —
 * not "because microservice". Until then, modules talk in-process.
 *
 * Global guards are stacked via APP_GUARD in ORDER — rate-limit (Throttler)
 * runs before authentication (JwtAuthGuard). The order matters: authz guards
 * (a RolesGuard, in a fuller app) depend on request.user being populated first.
 */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    ThrottlerModule.forRoot([{ ttl: throttleTtl, limit: throttleLimit }]),
    // Cross-cutting infra (each is @Global and re-exports its provider so
    // feature modules inject them without re-importing forRoot*).
    MessagingModule,
    DrizzleModule,
    RedisModule,
    AuthModule,
    // Feature bounded contexts.
    HealthModule,
    FeatureModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule {}
