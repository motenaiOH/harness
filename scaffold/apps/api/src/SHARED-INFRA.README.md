# SHARED-INFRA — infra transversal por receita (materialize na 1ª fatia)

> **Materialize só os que a SUA 1ª fatia exige.** Este arquivo NÃO é código pronto:
> é a **receita** dos módulos transversais que a espinha (`app.module.ts`,
> `<feature>.module.ts`, `presentation/`) **importa**, mas que **não acompanham as
> folhas de uma feature** — porque são compartilhados por TODOS os bounded contexts,
> não por um. A **primeira** fatia do projeto os materializa; as fatias seguintes
> apenas os reusam.
>
> A 1ª fatia raramente precisa de todos. Materialize por demanda dos imports que ELA
> faz: uma fatia **read-only síncrona** (variante A do write-path) não usa `messaging/`
> nem `cache/`; uma fatia que não toca banco ainda assim precisa de `health/` e
> `zod-validation.pipe` para o controller compilar e o healthcheck do Docker subir.

> **Stack-exemplo: NestJS + Drizzle + RabbitMQ/Redis.** Todos os esqueletos abaixo
> **estampam essa stack** (decorators `@nestjs/*`, tokens de DI, `extends Port`). Em
> outra stack o **papel** de cada módulo é o mesmo (guard de identidade, cliente de
> banco/cache, conexão do broker, endpoint de saúde, validação na borda) — só os
> mecanismos mudam. Adapte, não copie cego.

## Por que isto é "por receita" e não stubs prontos

Stubs reais espalhados pelo scaffold apodrecem: ou viram dependências fantasmas que o
build arrasta, ou divergem do que a fatia realmente precisa. A receita mantém o
scaffold **magro** e força a decisão consciente ("esta fatia precisa de broker?") no
momento certo — a 1ª fatia. Cada esqueleto abaixo é **mínimo e coerente** com os
imports que a espinha já faz; copie o que a fatia exige, ajuste e siga.

## Princípio transversal (vale para TODOS os módulos abaixo)

**O escopo (identidade/`<Tenant>`) vem SEMPRE do claim verificado do JWT, NUNCA do
input da request.** O guard popula `request.user`; o `@CurrentUser` o expõe; o
controller passa `user.tenant`/`user.id` ao use-case. Um campo `tenant` vindo do body
é um vetor de elevação de privilégio — ignore-o.

---

## 1. `auth/` — guard de identidade + principal autenticado

A espinha (`app.module.ts`) registra `JwtAuthGuard` como `APP_GUARD` e o controller
injeta o principal via `@CurrentUser`. Materialize os cinco arquivos (incluindo
`common/public.decorator.ts`, que o guard usa para liberar `/health`):

```ts
// auth/authenticated-user.ts
// O principal verificado. Forma do claim que o resto do app consome — o escopo
// (<Tenant>) e a identidade moram AQUI, derivados do token, nunca do input.
export interface AuthenticatedUser {
  id: string;
  tenant: string;
  roles?: string[];
}
```

```ts
// auth/current-user.decorator.ts
// Expõe request.user (populado pelo guard) ao controller. NUNCA leia identidade
// do body — só deste decorator.
import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import type { AuthenticatedUser } from "./authenticated-user";

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    const request = ctx.switchToHttp().getRequest();
    return request.user as AuthenticatedUser;
  },
);
```

```ts
// common/public.decorator.ts
// Marca uma rota/handler como público (sem Bearer). O JwtAuthGuard global lê esta
// metadata via Reflector e pula a verificação. Usado em /health (o healthcheck do
// Docker não carrega token).
import { SetMetadata } from "@nestjs/common";

export const IS_PUBLIC_KEY = "isPublic";
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
```

```ts
// auth/jwt-auth.guard.ts
// Guard global (APP_GUARD). Verifica o Bearer, fixa iss/aud/alg, e popula
// request.user com o AuthenticatedUser derivado dos claims VERIFICADOS. Rotas
// marcadas @Public() (ex.: /health) são liberadas via Reflector.
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import type { AuthenticatedUser } from "./authenticated-user";
import { IS_PUBLIC_KEY } from "../common/public.decorator";

// The standard HTTP bearer credential header (Node lowercases header names).
const BEARER_HEADER = "authorization";

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // @Public() routes (e.g. /health) skip auth entirely — checked on both the
    // handler and the controller class so a class-level @Public() also applies.
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const header: string | undefined = request.headers?.[BEARER_HEADER];
    const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
    if (!token) throw new UnauthorizedException();

    try {
      // Pin algorithm/issuer/audience — never accept "alg: none" or an unbounded token.
      // Env names match config/env.schema.ts (the source of truth): JWT_ISSUER / JWT_AUDIENCE.
      const claims = await this.jwt.verifyAsync(token, {
        algorithms: ["HS256"],
        issuer: process.env.JWT_ISSUER,
        audience: process.env.JWT_AUDIENCE,
      });
      // Escopo vem do claim verificado, nunca do input.
      const user: AuthenticatedUser = {
        id: String(claims.sub),
        tenant: String(claims.tenant),
        roles: claims.roles,
      };
      request.user = user;
      return true;
    } catch {
      throw new UnauthorizedException();
    }
  }
}
```

```ts
// auth/auth.module.ts
// Registra o JwtService que o guard usa. O guard em si é registrado como
// APP_GUARD no app.module.ts (ordem: throttler antes de auth). O `Reflector` que o
// guard injeta vem do Nest core — não precisa ser provido aqui.
// AUTH_API_SECRET é o segredo HS256 compartilhado com o web (ver config/env.schema.ts).
import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { JwtAuthGuard } from "./jwt-auth.guard";

@Module({
  imports: [JwtModule.register({ secret: process.env.AUTH_API_SECRET })],
  providers: [JwtAuthGuard],
  exports: [JwtModule, JwtAuthGuard],
})
export class AuthModule {}
```

---

## 2. `infrastructure/database/drizzle/drizzle.module.ts` — token `DRIZZLE`/`Database`

`<feature>.module.ts` e os repositórios injetam `@Inject(DRIZZLE)` e tipam o cliente
como `Database`. Materialize o módulo que provê esse token (pool/cliente). É
`@Global()` para que qualquer feature o injete sem reimportar.

```ts
// infrastructure/database/drizzle/drizzle.module.ts
import { Global, Module } from "@nestjs/common";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

// O token de DI e o TIPO do cliente — ambos importados pelos adapters de persistência.
export const DRIZZLE = Symbol("DRIZZLE");
export type Database = ReturnType<typeof drizzle>;

@Global()
@Module({
  providers: [
    {
      provide: DRIZZLE,
      useFactory: (): Database => {
        const pool = new Pool({ connectionString: process.env.DATABASE_URL });
        return drizzle(pool);
      },
    },
  ],
  exports: [DRIZZLE],
})
export class DrizzleModule {}
```

---

## 3. `infrastructure/cache/redis.module.ts` — `CachePort`/cliente Redis

**Opcional.** Só se a fatia declarar `CachePort` (write-path B, ou caching explícito).
Provê o cliente e/ou o adapter que `<feature>.module.ts` liga a `CachePort`.

```ts
// infrastructure/cache/redis.module.ts
import { Global, Module } from "@nestjs/common";
import { createClient, type RedisClientType } from "redis";

export const REDIS = Symbol("REDIS");

@Global()
@Module({
  providers: [
    {
      provide: REDIS,
      useFactory: async (): Promise<RedisClientType> => {
        const client: RedisClientType = createClient({ url: process.env.REDIS_URL });
        await client.connect();
        return client;
      },
    },
  ],
  exports: [REDIS],
})
export class RedisModule {}
```

> O **adapter** que `extends CachePort` (ex.: `RedisCacheAdapter`) vive na feature,
> em `infrastructure/cache/` do módulo, e injeta `@Inject(REDIS)`. O `CachePort`
> (abstract class) vive em `application/ports/` da feature — veja o
> `infrastructure/README.md` e o `application/README.md` da feature.

---

## 4. `infrastructure/messaging/messaging.module.ts` — `@Global()` com a conexão do broker

**Só write-path assíncrono (variante B).** Uma fatia read-only síncrona NÃO precisa
disto. Expõe a conexão do broker como `@Global()` e **re-exporta** o módulo do broker,
para que feature modules **NÃO** importem `forRoot*` direto (importar `forRoot*` numa
feature reconfigura a conexão e quebra a injeção).

```ts
// infrastructure/messaging/messaging.module.ts
import { Global, Module } from "@nestjs/common";
import { RabbitMQModule } from "@golevelup/nestjs-rabbitmq";
import { FEATURE_EXCHANGE } from "@app/contracts";

@Global()
@Module({
  imports: [
    RabbitMQModule.forRoot({
      uri: process.env.RABBITMQ_URI!,
      exchanges: [{ name: FEATURE_EXCHANGE, type: "topic" }],
      connectionInitOptions: { wait: true },
    }),
  ],
  // Re-exporta para que as features injetem AmqpConnection SEM reimportar forRoot*.
  exports: [RabbitMQModule],
})
export class MessagingModule {}
```

> O publisher (`extends EventPublisherPort`) vive na feature
> (`infrastructure/messaging/rabbitmq.publisher.ts`) e injeta `AmqpConnection` — veja
> o esqueleto no `infrastructure/README.md` da feature. O nome do exchange e a forma
> do evento moram em `packages/contracts` (contrato único entre produtor, consumidor
> e web).

---

## 5. `modules/health/health.module.ts` — `/health` VERSION_NEUTRAL

A espinha importa `HealthModule`. O healthcheck do Docker bate num caminho **sem
versão** — por isso o controller é `VERSION_NEUTRAL` (a app inteira está sob `/v1`,
mas `/health` fica fora). Esta é normalmente das **primeiras** coisas a materializar:
sem ela o `docker compose up --wait` nunca fica `healthy`.

```ts
// modules/health/health.controller.ts
import { Controller, Get, VERSION_NEUTRAL } from "@nestjs/common";
import { ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { Public } from "../../common/public.decorator";

@ApiTags("health")
@Public() // libera do JwtAuthGuard global — o healthcheck do Docker não carrega Bearer.
@Controller({ path: "health", version: VERSION_NEUTRAL })
export class HealthController {
  @Get()
  @ApiOkResponse({ description: "Liveness probe" })
  check(): { status: "ok" } {
    return { status: "ok" };
  }
}
```

```ts
// modules/health/health.module.ts
import { Module } from "@nestjs/common";
import { HealthController } from "./health.controller";

@Module({ controllers: [HealthController] })
export class HealthModule {}
```

> O `JwtAuthGuard` é global; `/health` precisa ser **público**, senão o guard
> devolve 401 e o `docker compose up --wait` nunca fica `healthy`. Marque o
> controller com `@Public()` (decorator da seção 1, em `common/public.decorator.ts`;
> o guard checa essa metadata via `Reflector`). O healthcheck não carrega Bearer.

---

## 6. `common/zod-validation.pipe.ts` — validação por `@Body()` específico

A validação é **Zod**, aplicada **por `@Body()`** — NUNCA como `ValidationPipe` global
nem via `@UsePipes` (rodaria também contra params injetados como `@CurrentUser`,
quebrando-os). Bind explícito: `@Body(new ZodValidationPipe(Schema))`.

```ts
// common/zod-validation.pipe.ts
import { BadRequestException, PipeTransform } from "@nestjs/common";
import type { ZodSchema } from "zod";

export class ZodValidationPipe<T> implements PipeTransform {
  constructor(private readonly schema: ZodSchema<T>) {}

  transform(value: unknown): T {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new BadRequestException(result.error.issues);
    }
    return result.data;
  }
}
```

> Uso no controller (veja o `presentation/README.md` da feature):
> `@Body(new ZodValidationPipe(<Feature>Schema)) dto: <Feature>Request`. O schema zod
> mora em `packages/contracts` (API First: contrato antes da implementação).

---

## 7. `swagger.ts` — `buildOpenApiDocument(app)` (OBRIGATÓRIO, sempre)

Diferente dos demais, **este não é opcional**: `main.ts` **sempre** importa
`./swagger` (`buildOpenApiDocument`) — independe da fatia ser síncrona ou assíncrona.
Sem materializar este leaf o typecheck quebra logo de cara (import inexistente). Monta
o `DocumentBuilder`/`SwaggerModule` e exporta o builder usado tanto pelo runtime (em
`main.ts`) quanto pelo gate de drift offline (que chama `configureApp` + este builder
sem subir conexões — por isso ele NÃO faz `app.init()` nem aplica helmet).

```ts
// swagger.ts
import type { INestApplication } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule, type OpenAPIObject } from "@nestjs/swagger";

// Builder compartilhado por runtime (main.ts) e pelo gate de drift offline. Mantenha-o
// PURO (sem app.init()/helmet) para que offline == runtime.
export function buildOpenApiDocument(app: INestApplication): OpenAPIObject {
  const config = new DocumentBuilder()
    .setTitle("app-api")
    .setDescription("HTTP contract for the API BFF")
    .setVersion("1.0")
    .addBearerAuth()
    .build();
  return SwaggerModule.createDocument(app, config);
}
```

> O snapshot `openapi.json` (gate de drift) é gerado por `pnpm openapi:generate`, que
> reusa este mesmo builder offline. Todo `@Query()`/`@Param()` precisa de decorator
> Swagger explícito para offline == runtime.

---

## 8. `worker.ts` + `worker/*` — SÓ na variante assíncrona (write-path B)

`worker.ts` e suas folhas (`worker/db`, `worker/persist.handler`) são o **segundo
runtime role** do image e existem **apenas** no write-path assíncrono. Numa fatia/
instância **síncrona** (read-only ou write inline) eles não se aplicam: **remova
`worker.ts` (e `worker/*`)** ou deixe-o como stub sem os imports de `./worker/*` —
senão o typecheck falha em folhas inexistentes (`./worker/db`, `./worker/persist.handler`).
Na variante assíncrona, materialize-os junto com `messaging/` (seção 4) e `cache/`
(seção 3, se houver caching no write-path).

---

## Checklist de materialização (1ª fatia)

1. Liste os imports transversais que a SUA 1ª fatia realmente faz (cheque o
   `app.module.ts` e o `<feature>.module.ts` da fatia).
2. Para cada um, copie o esqueleto correspondente acima e ajuste à stack/contrato.
3. **Sempre** materialize `swagger.ts` (seção 7) — `main.ts` o importa em qualquer
   variante. Numa fatia **síncrona**, remova/stube `worker.ts` (seção 8).
4. **Pule** os que a fatia não usa: read-only síncrona não materializa `messaging/`
   nem `cache/`.
5. Garanta que o token/símbolo bate com o que os adapters importam (`DRIZZLE`,
   `CachePort`, `@CurrentUser`, `AuthenticatedUser`, `ZodValidationPipe`, `IS_PUBLIC_KEY`).
6. Build verde antes de seguir para as folhas da feature.
