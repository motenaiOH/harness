# presentation/ — edge adapters (HTTP shown)

> **`presentation/` is ONE edge over the core — here, HTTP.** The same
> `application` use-case can be driven by other edges: a CLI, a GraphQL resolver,
> a gRPC service, a queue consumer, or a public-API SDK. Each is a **thin
> adapter** that translates protocol ⇄ `useCase.execute(...)`. The rules below
> (validate at the edge, scope from the authenticated context, no business logic)
> hold for **any** edge — not just HTTP. When more than one edge exists, keep them
> apart by convention: `presentation/http/`, `presentation/cli/`,
> `presentation/graphql/`, etc.

The outermost layer. **Thin** controllers that adapt HTTP ⇄ use-case: validate
the request body, extract identity from the authenticated context, call
`useCase.execute(...)`, and return a DTO. **No business logic here** — if you are
tempted to add a branch with a domain decision, it belongs in
`application`/`domain`.

## What goes here

| Folder / file | Role |
|---|---|
| `http/__name__.controller.ts` | The controller (`<name>` → real entity name). Routes are under `/v1` (URI versioning set in `bootstrap.ts`). Every endpoint is Swagger-annotated. |
| `http/dtos/` | `@ApiProperty` mirror classes that feed Swagger metadata, plus the contract zod schemas the `ZodValidationPipe` validates against. |

## The rules that keep the contract honest

- **Validation is Zod, applied per-`@Body()`.** Bind `new ZodValidationPipe(Schema)`
  to the specific body param — **never** a global `ValidationPipe` or `@UsePipes`,
  which would also run the schema against injected params like `@CurrentUser`.
- **Scope from the authenticated context.** The `tenant`/`authorId` come from the
  verified JWT principal (`@CurrentUser`), never from a request field.
- **Every `@Query()`/`@Param()` needs an explicit Swagger decorator**
  (`@ApiQuery`/`@ApiParam` with `type:`). Without it the OFFLINE-generated OpenAPI
  doc differs from the runtime doc and the drift gate fails — Nest cannot infer
  query/param metadata reliably.
- **The `@ApiProperty` DTO classes exist ONLY to feed Swagger.** Runtime
  validation is the zod pipe; a `implements <ContractType>` on the DTO class
  gives a compile-time check that the Swagger DTO has not drifted from the zod
  contract.

## Minimal example — controller

```ts
// presentation/http/__name__.controller.ts  (feature.controller.ts)
import { Body, Controller, Get, Post, Query } from "@nestjs/common";
import {
  ApiBearerAuth, ApiBody, ApiOkResponse, ApiQuery, ApiTags,
} from "@nestjs/swagger";
import { ExecuteFeatureSchema, type ExecuteFeatureRequest } from "@app/contracts";
import { CurrentUser } from "../../../../auth/current-user.decorator";
import type { AuthenticatedUser } from "../../../../auth/authenticated-user";
import { ZodValidationPipe } from "../../../../common/zod-validation.pipe";
import { ExecuteFeatureUseCase } from "../../application/use-cases/execute-feature/execute-feature.use-case";
import { ListWidgetsUseCase } from "../../application/use-cases/list-widgets/list-widgets.use-case";
import {
  ExecuteFeatureResponseDto, WidgetItemDto,
} from "./dtos/__name__.response.dto";

@ApiTags("feature")
@ApiBearerAuth()
@Controller("feature") // -> /v1/feature (URI versioning is global)
export class FeatureController {
  constructor(
    private readonly executeFeature: ExecuteFeatureUseCase,
    private readonly listWidgets: ListWidgetsUseCase,
  ) {}

  @Post()
  @ApiBody({ type: ExecuteFeatureResponseDto })
  @ApiOkResponse({ type: ExecuteFeatureResponseDto })
  async execute(
    // Pipe bound to THIS body only — never global.
    @Body(new ZodValidationPipe(ExecuteFeatureSchema)) dto: ExecuteFeatureRequest,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ExecuteFeatureResponseDto> {
    // Scope comes from the authenticated user, not the request body.
    return this.executeFeature.execute({
      authorId: user.id,
      body: dto.body,
      conversationId: dto.conversationId,
      tenant: user.tenant,
    });
  }

  @Get("items")
  @ApiOkResponse({ type: [WidgetItemDto] })
  @ApiQuery({ name: "limit", required: false, type: String, description: "Max items (default 20)" })
  async items(
    @CurrentUser() user: AuthenticatedUser,
    @Query("limit") limit?: string, // explicit @ApiQuery above → offline==runtime doc
  ): Promise<WidgetItemDto[]> {
    const parsed = Number.parseInt(limit ?? "20", 10);
    return this.listWidgets.execute(user.tenant, Number.isFinite(parsed) ? parsed : 20);
  }
}
```

```ts
// presentation/http/dtos/__name__.response.dto.ts  (feature.response.dto.ts)
import { ApiProperty } from "@nestjs/swagger";
import type { FeatureItem } from "@app/contracts";

/** Mirror class for Swagger. `implements FeatureItem` makes the build FAIL if
 *  the Swagger DTO drifts from the zod contract. Decorators feed Swagger; the
 *  contract type enforces fidelity. (No runtime validation here — that is the
 *  zod pipe on the body and the worker's Schema.parse().) */
export class WidgetItemDto implements FeatureItem {
  @ApiProperty({ format: "uuid" }) id!: string;
  @ApiProperty({ format: "uuid" }) conversationId!: string;
  @ApiProperty() authorId!: string;
  @ApiProperty() body!: string;
  @ApiProperty({ type: Object }) result!: FeatureItem["result"];
  @ApiProperty() createdAt!: string;
}

export class ExecuteFeatureResponseDto {
  @ApiProperty({ format: "uuid" }) messageId!: string;
  @ApiProperty({ format: "uuid" }) conversationId!: string;
  @ApiProperty({ type: Object }) result!: FeatureItem["result"];
  @ApiProperty() sentAt!: string;
}
```
