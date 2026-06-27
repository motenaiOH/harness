# application/ — use-cases & application ports

Orchestrates the domain to fulfil one user intent per use-case. Depends only on
`domain` + its own `application/ports`. **No framework, no decorators.** A
use-case is a plain class with its dependencies injected through the constructor
— so it is unit-testable by direct construction (`new UseCase(fakeA, fakeB)`),
no `TestingModule`, no Docker.

## What goes here

| Folder | Role | Example |
|---|---|---|
| `use-cases/<name>/` | One class per intent, plus its sibling `*.spec.ts`. `execute(input): Promise<Result>`; `Input`/`Result` are interfaces local to the file. | `ExecuteFeatureUseCase`. |
| `ports/` | Dependencies the use-cases need, as **abstract classes** (Clock, Cache, EventPublisher, IdGenerator, Metrics). These are the orchestrator's deps — distinct from `domain/ports` (the business-core contracts). | `ClockPort`, `EventPublisherPort`. |
| `guardrails/` | Pure cross-cutting policy (e.g. an output validator). Best-effort: never throws, never mutates. | `OutputPolicyValidator`. |

> **Two kinds of port, kept apart:** `domain/ports` are contracts of the
> business core (e.g. `WidgetRepository`); `application/ports` are the
> orchestrator's dependencies (Clock/Cache/Publisher). A domain port does not
> depend on application infrastructure.

## Two write-path variants — choose by NFR

The write path has **two shapes**. Pick by NFR, not by taste. The scaffold
illustrates variant (B), but (A) is the **default** you should reach for first.

### (A) Direct write — DEFAULT

The use-case validates, persists through the repository, and returns — all in the
same request. **No queue, no worker, no cache-TTL.** Use this unless a concrete NFR
forces otherwise.

```ts
// application/use-cases/execute-feature/execute-feature.use-case.ts (direct-write)
export class ExecuteFeatureUseCase {
  constructor(private readonly repo: WidgetRepository) {}

  async execute(input: ExecuteFeatureInput): Promise<ExecuteFeatureResult> {
    const name = WidgetName.create(input.body);          // domain invariant
    const widget = Widget.create({                        // build the aggregate
      id: input.id, tenant: input.tenant, name, status: "active", createdAt: new Date(),
    });
    await this.repo.save(widget);                         // persist IN THIS request
    return { id: widget.id, tenant: widget.tenant };      // read-your-writes is immediate
  }
}
```

### (B) Synchronous reply + asynchronous persistence (CQRS-lite)

The variant shown in the rest of this document: the use-case does only cheap work,
publishes an event, and returns; a worker persists idempotently into a read model.
Adopt it **only when an NFR justifies it** — write spikes, decoupling latency from
the write, fan-out, tolerance to store unavailability. Cost: a broker, idempotency,
and eventual read-your-writes (the reader may not see the write immediately).

## The CQRS-lite write path — one variant (B), adopt under NFR

`ExecuteFeatureUseCase.execute()` does ONLY cheap, fast work and **never touches
the domain database** — persistence is asynchronous, in the worker:

1. validate input via a value object;
2. generate the identity id (the PRODUCER owns the id — `IdGeneratorPort`);
3. read the time via `ClockPort` (deterministic in tests);
4. build the structured `FeatureResult` envelope;
5. cache the last result (TTL) for fast follow-ups;
6. build the typed `FeatureExecutedEvent`;
7. `publisher.publishFeatureExecuted(event, ROUTING_KEYS.featureExecutedV1)`;
8. return immediately.

That same generated id becomes the AMQP `messageId` header and the worker's
`ON CONFLICT (id) DO NOTHING` target — which is what makes at-least-once
delivery safe.

## Minimal example — use-case + spec

```ts
// application/use-cases/execute-feature/execute-feature.use-case.ts
import { type FeatureExecutedEvent, type FeatureResult, ROUTING_KEYS } from "@app/contracts";
import { WidgetName } from "../../../domain/value-objects/__name__.vo";
import { CachePort } from "../../ports/cache.port";
import { ClockPort } from "../../ports/clock.port";
import { EventPublisherPort } from "../../ports/event-publisher.port";
import { IdGeneratorPort } from "../../ports/id-generator.port";

export interface ExecuteFeatureInput {
  authorId: string;
  body: string;
  conversationId?: string;
  tenant: string; // from the authenticated context, never request input
}
export interface ExecuteFeatureResult {
  messageId: string;
  conversationId: string;
  result: FeatureResult;
  sentAt: string;
}

export class ExecuteFeatureUseCase {
  constructor(
    private readonly publisher: EventPublisherPort,
    private readonly cache: CachePort,
    private readonly clock: ClockPort,
    private readonly ids: IdGeneratorPort,
  ) {}

  async execute(input: ExecuteFeatureInput): Promise<ExecuteFeatureResult> {
    const name = WidgetName.create(input.body); // domain invariant
    const messageId = this.ids.generate();       // producer owns the id
    const conversationId = input.conversationId ?? this.ids.generate();
    const sentAt = this.clock.now().toISOString();

    const result: FeatureResult = {
      version: 1, intent: "echo", confidence: "high", outcome: "success",
      summary: `accepted: ${name.value}`, data: [{ name: name.value }],
      citations: [], policy: { allowed: true, redactedFields: [], reason: null },
    };

    const event: FeatureExecutedEvent = {
      version: 1, messageId, conversationId,
      authorId: input.authorId, tenantId: input.tenant,
      body: name.value, result, sentAt,
    };
    await this.cache.set(`feature:last:${input.authorId}`, event, 300);
    await this.publisher.publishFeatureExecuted(event, ROUTING_KEYS.featureExecutedV1);

    return { messageId, conversationId, result, sentAt }; // returns WITHOUT persisting
  }
}
```

```ts
// application/use-cases/execute-feature/execute-feature.use-case.spec.ts
import { describe, expect, it, vi } from "vitest";
import { ROUTING_KEYS } from "@app/contracts";
import { ExecuteFeatureUseCase } from "./execute-feature.use-case";

const makeDeps = () => {
  let n = 0;
  return {
    publisher: { publishFeatureExecuted: vi.fn().mockResolvedValue(undefined) },
    cache: { get: vi.fn(), set: vi.fn().mockResolvedValue(undefined), del: vi.fn() },
    clock: { now: () => new Date("2026-01-01T00:00:00.000Z") },
    ids: { generate: () => `id-${++n}` },
  };
};

describe("ExecuteFeatureUseCase", () => {
  it("publishes a v1 event on the v1 routing key and returns without persisting", async () => {
    const d = makeDeps();
    // No TestingModule, no Docker — pure construction.
    const useCase = new ExecuteFeatureUseCase(d.publisher, d.cache, d.clock, d.ids);

    const out = await useCase.execute({ authorId: "u1", body: "hello", tenant: "t1" });

    expect(out.messageId).toBe("id-1");
    expect(out.sentAt).toBe("2026-01-01T00:00:00.000Z");
    const [event, key] = d.publisher.publishFeatureExecuted.mock.calls[0];
    expect(event).toMatchObject({ version: 1, tenantId: "t1", body: "hello" });
    expect(key).toBe(ROUTING_KEYS.featureExecutedV1);
  });

  it("rejects an empty body (domain invariant)", async () => {
    const d = makeDeps();
    const useCase = new ExecuteFeatureUseCase(d.publisher, d.cache, d.clock, d.ids);
    await expect(useCase.execute({ authorId: "u", body: "   ", tenant: "t1" })).rejects.toThrow(/empty/);
    expect(d.publisher.publishFeatureExecuted).not.toHaveBeenCalled();
  });
});
```

```ts
// application/ports/clock.port.ts  — canonical port-as-abstract-class
export abstract class ClockPort {
  abstract now(): Date;
}
```
