# domain/ — the innermost layer

The business core of the `<Feature>` bounded context. **Framework-free**: no
`@nestjs/*`, no ORM, no zod-for-HTTP, no Redis/AMQP. You should be able to
`grep -r "@nestjs" domain/` and get **zero** hits. Dependencies point inward —
`domain` knows nothing about `application`, `infrastructure` or `presentation`.

> The domain is identical regardless of 1 or N presentations and of synchronous
> or asynchronous persistence — those are outer-layer choices.

## What goes here

| Folder | Role | Example |
|---|---|---|
| `entities/` | Aggregate roots — identity + invariants. Private constructor + static `create()` factory; props immutable; behavior exposed via getters/methods. | `Widget` (an `id`, `name`, `status`, `createdAt`). |
| `value-objects/` | Immutable values that validate their invariants **on creation** (`VO.create(raw)` throws if invalid). | `WidgetName` (non-empty, ≤ 80 chars). |
| `ports/` | Outbound contracts the domain needs, as **abstract classes** (so they double as DI tokens). Implemented by `infrastructure/`. | `WidgetRepository` (`save`, `listRecent`). |

## Why these shapes

- **Validation here is a DOMAIN RULE, not transport validation.** A value object
  throwing on an empty name is an invariant. HTTP/wire validation (zod) lives in
  `presentation`, applied narrowly to the request body — never a global pipe.
- **Ports are `abstract class`, not `interface`.** Interfaces vanish at runtime
  and cannot be a DI token; an abstract class is simultaneously the type
  contract and the injection token used in `provide`.
- **New business logic enters here (or in `application`), never in a
  controller.** The controller only adapts HTTP ⇄ use-case.

## Minimal example — `Widget` entity

```ts
// domain/entities/__entity__.entity.ts  (rename to widget.entity.ts)
import { WidgetName } from "../value-objects/__name__.vo";

export interface WidgetProps {
  id: string;
  tenant: string; // scope — set from the authenticated context upstream
  name: WidgetName;
  status: "active";
  createdAt: Date;
}

export class Widget {
  private constructor(private readonly props: WidgetProps) {}

  /** The only way to build a Widget — keeps invariants in one place. */
  static create(props: WidgetProps): Widget {
    return new Widget(props);
  }

  get id(): string { return this.props.id; }
  get tenant(): string { return this.props.tenant; }
  get name(): string { return this.props.name.value; }
  get status(): string { return this.props.status; }
  get createdAt(): Date { return this.props.createdAt; }
}
```

```ts
// domain/value-objects/__name__.vo.ts  (rename to widget-name.vo.ts)
export class WidgetName {
  private constructor(public readonly value: string) {}

  static create(raw: string): WidgetName {
    const trimmed = (raw ?? "").trim();
    if (trimmed.length === 0) throw new Error("widget name must not be empty");
    if (trimmed.length > 80) throw new Error("widget name must be ≤ 80 chars");
    return new WidgetName(trimmed);
  }
}
```

```ts
// domain/ports/__name__.repository.port.ts  (rename to widget.repository.port.ts)
import { Widget } from "../entities/__entity__.entity";

/** Outbound port for widget persistence. Implemented by an infrastructure
 *  adapter (Drizzle/Postgres). Used as a DI token via this abstract class. */
export abstract class WidgetRepository {
  abstract save(widget: Widget): Promise<void>;
  abstract listRecent(tenant: string, limit: number): Promise<Widget[]>;
}
```
