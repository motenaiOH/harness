/**
 * SPINE (illustrative) — NOT copy-and-compile.
 *
 * This composition root imports LEAF files (entity, value objects, ports,
 * use-cases, adapters, controller, the cross-cutting infra modules) that the
 * adopter MATERIALIZES from each layer's `README.md`. As copied it will NOT
 * typecheck until those leaves exist — it shows the wiring shape, not finished
 * code. Keep placeholders neutral (<Feature>/<Entity> = widget). See the root
 * README "Status do scaffold" and `docs/how-to/replicate-this-harness.md` for
 * the copy-vs-create map.
 */
import { Module } from "@nestjs/common";
import {
  DRIZZLE,
  type Database,
} from "../../infrastructure/database/drizzle/drizzle.module";
// Application ports (DI tokens = abstract classes).
import { ClockPort } from "./application/ports/clock.port";
import { IdGeneratorPort } from "./application/ports/id-generator.port";
import { MetricsPort } from "./application/ports/metrics.port";
// CQRS-lite (variant B) ports — only needed when the async write-path is active.
// import { CachePort } from "./application/ports/cache.port";
// import { EventPublisherPort } from "./application/ports/event-publisher.port";
// Domain port.
import { WidgetRepository } from "./domain/ports/widget.repository.port";
// Use-cases (plain classes — instantiated via useFactory, NOT decorated).
import { ExecuteFeatureUseCase } from "./application/use-cases/execute-feature/execute-feature.use-case";
import { ListWidgetsUseCase } from "./application/use-cases/list-widgets/list-widgets.use-case";
// Guardrail.
import { OutputPolicyValidator } from "./application/guardrails/output-policy-validator";
// Infrastructure adapters (each `extends` its port).
import { SystemClock } from "./infrastructure/adapters/system-clock";
import { UuidGenerator } from "./infrastructure/adapters/uuid-generator";
import { DrizzleWidgetRepository } from "./infrastructure/persistence/widget.repository";
// CQRS-lite (variant B) adapters — only needed when the async write-path is active.
// import { RedisCacheAdapter } from "./infrastructure/cache/redis-cache.adapter";
// import { RabbitMqEventPublisher } from "./infrastructure/messaging/rabbitmq.publisher";
import { OtelMetricsRecorder } from "./infrastructure/observability/otel-metrics-recorder";
// Presentation.
import { FeatureController } from "./presentation/http/feature.controller";

/**
 * Composition root for the <Feature> bounded context — the SINGLE place that
 * knows concrete adapters. Binds domain/application ports to their
 * infrastructure adapters (ports & adapters / clean architecture). No layer
 * self-wires; all `provide`/`useClass`/`useFactory` live here.
 *
 * Two binding styles:
 *  - `{ provide: Port, useClass: Adapter }` for adapters (the adapter is
 *    @Injectable and Nest constructs it, resolving its own ctor deps).
 *  - `{ provide: UseCase, inject: [...ports], useFactory: (...) => new UseCase }`
 *    for PURE use-cases — Nest resolves the ports, the use-case stays Nest-
 *    agnostic and remains unit-testable by direct `new UseCase(...)`.
 *
 * Multiple instances of one adapter type? Use a distinct STRING token in
 * `provide` (e.g. "WidgetToolVariantB") — two `useClass` of the same class
 * would collide on the same token.
 */
@Module({
  controllers: [FeatureController],
  exports: [ExecuteFeatureUseCase],
  providers: [
    // ── Use-cases (pure → useFactory) ─────────────────────────────────────────
    // Direct-write mode — variante A (escrita direta), the DEFAULT and síncrono
    // posture: ExecuteFeatureUseCase is wired with the REPOSITORY (and only the
    // ports the direct form needs), WITHOUT EventPublisherPort/CachePort — the
    // use-case persists IN the request and there is no worker. Matches the typical
    // ADR of an instance (synchronous by default).
    {
      provide: ExecuteFeatureUseCase,
      inject: [WidgetRepository, ClockPort, IdGeneratorPort],
      useFactory: (
        repo: WidgetRepository,
        clock: ClockPort,
        ids: IdGeneratorPort,
      ) => new ExecuteFeatureUseCase(repo, clock, ids),
    },
    // CQRS-lite variant (B) — ALTERNATIVE, comentado: the use-case publishes an
    // event and a worker persists. Descomente (e os imports/bindings de
    // EventPublisherPort/CachePort acima e abaixo) quando um NFR concreto
    // justificar — picos de escrita, desacoplar latência, fan-out; ver o ADR e o
    // passo de write-path da skill new-module. Custo: broker, idempotência,
    // read-your-writes eventual.
    // {
    //   provide: ExecuteFeatureUseCase,
    //   inject: [EventPublisherPort, CachePort, ClockPort, IdGeneratorPort],
    //   useFactory: (
    //     publisher: EventPublisherPort,
    //     cache: CachePort,
    //     clock: ClockPort,
    //     ids: IdGeneratorPort,
    //   ) => new ExecuteFeatureUseCase(publisher, cache, clock, ids),
    // },
    {
      provide: ListWidgetsUseCase,
      inject: [WidgetRepository],
      useFactory: (repo: WidgetRepository) => new ListWidgetsUseCase(repo),
    },

    // ── Ports → adapters (useClass) ───────────────────────────────────────────
    { provide: WidgetRepository, useClass: DrizzleWidgetRepository },
    { provide: ClockPort, useClass: SystemClock },
    { provide: IdGeneratorPort, useClass: UuidGenerator },
    // CQRS-lite (variant B) bindings — descomente junto com a variante B acima.
    // { provide: EventPublisherPort, useClass: RabbitMqEventPublisher },
    // { provide: CachePort, useClass: RedisCacheAdapter },

    // ── Metrics: best-effort, choose recorder per environment ─────────────────
    // OtelMetricsRecorder no-ops when telemetry is off (see otel.ts), so it is
    // safe as the default. Swap to a NoopMetricsRecorder in tests if desired.
    {
      provide: MetricsPort,
      inject: [DRIZZLE],
      useFactory: (_db: Database) => new OtelMetricsRecorder(),
    },

    // ── Layer-3 output guardrail (pure) ───────────────────────────────────────
    { provide: OutputPolicyValidator, useClass: OutputPolicyValidator },
  ],
})
export class FeatureModule {}
