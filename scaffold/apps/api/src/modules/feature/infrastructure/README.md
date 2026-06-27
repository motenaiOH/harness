# infrastructure/ — adapters (the outward edge)

Implements the ports declared in `domain/` and `application/` against real
technology: Postgres (Drizzle), RabbitMQ, Redis, the system clock, a UUID
generator, OTel metrics. This is the ONLY layer allowed to import ORMs, broker
clients and SDKs. It depends on `domain`/`application` (inward) — never the
reverse.

## What goes here

| Folder | Role | Example |
|---|---|---|
| `persistence/` | A repository adapter implementing the domain port, plus a **mapper** that translates DB row ⇄ aggregate at the boundary. | `DrizzleWidgetRepository`, `widget.mapper.ts`. |
| `messaging/` | **Async mode only (variant B).** The event-publisher adapter (RabbitMQ): `persistent: true`, `messageId` header, `contentType: application/json`. In the direct-write default there is no `EventPublisherPort`, so no `messaging/`. | `RabbitMqEventPublisher`. |
| `cache/` | **Optional.** The cache-port adapter (Redis). | `RedisCacheAdapter`. |
| `adapters/` | Trivial adapters for application ports (clock, uuid). | `SystemClock`, `UuidGenerator`. |
| `observability/` | The metrics-port recorder (OTel) + a no-op variant for tests. | `OtelMetricsRecorder`. |

> **Which adapters exist depends on which ports the inner layers declared.** In
> the direct-write mode there is no `EventPublisherPort`, so there is no
> `messaging/`; add an adapter here only when an inner layer declares the port it
> implements.

## Rules that keep the inversion intact

- **An adapter `extends` (not `implements`) its abstract-class port** and must
  call `super()` in its constructor — forgetting `super()` breaks at runtime.
- **A mapper is mandatory at the persistence boundary.** Never return the raw
  ORM row from a repository: reconstruct the aggregate via `Entity.create(...)`.
  Without the mapper, the ORM row type leaks up into `application` and breaks the
  dependency rule.
- **Allowlist projection at the source.** The repository `select` maps **only
  public fields** — internal PKs never cross the boundary. (A layer-3 output
  validator redacts id-shaped fields as a safety net; allowlist-at-source +
  redact-at-output = two independent layers for the same invariant.)

## Minimal example — repository + mapper

```ts
// infrastructure/persistence/__name__.repository.ts  (widget.repository.ts)
import { Injectable } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { DRIZZLE, type Database } from "../../../../infrastructure/database/drizzle/drizzle.module";
import { Inject } from "@nestjs/common";
import { Widget } from "../../domain/entities/__entity__.entity";
import { WidgetRepository } from "../../domain/ports/__name__.repository.port";
import { widgets } from "./schema";
import { toDomain } from "./__name__.mapper";

@Injectable()
export class DrizzleWidgetRepository extends WidgetRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {
    super(); // required — adapter extends the abstract port
  }

  async save(widget: Widget): Promise<void> {
    await this.db
      .insert(widgets)
      .values({
        id: widget.id, tenant: widget.tenant, name: widget.name,
        status: "active", createdAt: widget.createdAt,
      })
      .onConflictDoNothing({ target: widgets.id }); // idempotent
  }

  async listRecent(tenant: string, limit: number): Promise<Widget[]> {
    // Allowlist projection: select only public columns, scoped by tenant.
    const rows = await this.db
      .select({
        id: widgets.id, tenant: widgets.tenant,
        name: widgets.name, status: widgets.status, createdAt: widgets.createdAt,
      })
      .from(widgets)
      .where(eq(widgets.tenant, tenant))
      .limit(limit);
    return rows.map(toDomain);
  }
}
```

```ts
// infrastructure/persistence/__name__.mapper.ts  (widget.mapper.ts)
import { Widget } from "../../domain/entities/__entity__.entity";
import { WidgetName } from "../../domain/value-objects/__name__.vo";

type WidgetRow = {
  id: string; tenant: string; name: string;
  status: string; createdAt: Date;
};

/** Boundary mapper: DB row -> aggregate. Stops rows leaking into application. */
export function toDomain(row: WidgetRow): Widget {
  return Widget.create({
    id: row.id, tenant: row.tenant,
    name: WidgetName.create(row.name),
    status: "active", createdAt: row.createdAt,
  });
}
```

```ts
// infrastructure/messaging/rabbitmq.publisher.ts
import { Injectable } from "@nestjs/common";
import { AmqpConnection } from "@golevelup/nestjs-rabbitmq";
import { FEATURE_EXCHANGE, type FeatureExecutedEvent } from "@app/contracts";
import { EventPublisherPort } from "../../application/ports/event-publisher.port";

@Injectable()
export class RabbitMqEventPublisher extends EventPublisherPort {
  constructor(private readonly amqp: AmqpConnection) { super(); }

  async publishFeatureExecuted(event: FeatureExecutedEvent, routingKey: string): Promise<void> {
    await this.amqp.publish(FEATURE_EXCHANGE, routingKey, event, {
      persistent: true,            // survive broker restart
      messageId: event.messageId,  // = the producer-owned idempotency key
      contentType: "application/json",
    });
  }
}
```

```ts
// infrastructure/adapters/system-clock.ts — the infra side of a port/adapter pair
import { Injectable } from "@nestjs/common";
import { ClockPort } from "../../application/ports/clock.port";

@Injectable()
export class SystemClock extends ClockPort {
  now(): Date { return new Date(); }
}
```
