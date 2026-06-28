---
name: new-module
description: Materializa um bounded context nas 4 camadas (domain→application→infrastructure→presentation) a partir dos READMEs de camada do scaffold, ligando o composition root e gerando contrato + esqueleto de teste. Use ao criar um módulo/feature novo.
---

# new-module — materializar um bounded context nas 4 camadas

Esta skill **transforma a espinha em folhas**: pega o módulo-exemplo `feature/` (que
existe como esqueleto + READMEs por camada) e materializa um bounded context **novo e
real** seguindo a clean architecture do harness (`domain → application → infrastructure →
presentation`, dependências apontando para dentro, ports↔adapters ligados só no
composition root).

**Princípio antes da receita.** Os READMEs de cada camada já contêm os blocos de código
a materializar e o *porquê* de cada forma. Esta skill **não os repete** — ela os **LÊ** e
orquestra a renomeação/ligação. Da mesma forma, ela **não reescreve TDD**: ela **compõe**
a skill `superpowers:test-driven-development`. Se a *forma* do write-path estiver em dúvida,
ela aponta para o `CLAUDE.md` e o agente `architect` — não decide por conta própria.

> **Stack-exemplo: NestJS + Drizzle + RabbitMQ/Redis.** Todo o conteúdo gerado por este
> procedimento **estampa essa stack** (decorators `@nestjs/*`, `extends Port`, `@ApiX`).
> Em outra stack, **o procedimento é o mesmo** (4 camadas, ports como contrato, adapter
> na borda, contrato antes da implementação), apenas os mecanismos mudam. Anote isso no
> resultado para quem adaptar.

## Pré-requisitos (recolher antes de tocar em arquivo)

1. **Nome do bounded context** — substitui `<feature>` em caminhos e nomes (ex.: `catalog`).
2. **`<Entity>`** — o agregado raiz, substitui `<entity>`/`<name>`/`widget` (ex.: `widget`).
3. Se faltar qualquer um, **pergunte** — não invente domínio.

## Procedimento

### 1. Ler os 4 READMEs de camada (fonte de verdade dos blocos)

Leia, nesta ordem, os READMEs do módulo-exemplo — eles trazem os blocos de código
canônicos e as regras que mantêm a inversão de dependência:

- `apps/api/src/modules/feature/domain/README.md`
- `apps/api/src/modules/feature/application/README.md`
- `apps/api/src/modules/feature/infrastructure/README.md`
- `apps/api/src/modules/feature/presentation/README.md`

Não copie o texto deles para cá: **siga-os**. Eles são a referência viva.

### 2. Escolher o write-path (decisão de forma)

O `application/README.md` apresenta dois caminhos:

- **(A) Escrita direta — DEFAULT:** o use-case valida, persiste pelo repositório e
  retorna na mesma request. Sem broker, sem worker. **Escolha este primeiro.**
- **(B) Resposta síncrona + persistência assíncrona (CQRS-lite):** só sob um NFR concreto
  (picos de escrita, desacoplar latência, fan-out). Custo: broker, idempotência,
  read-your-writes eventual.

Se a decisão exigir (NFR ambíguo, risco de forma), **não decida sozinho**: convoque o
agente `architect` (que produz um ADR) e, quando a fase de papéis existir, o papel
**Dados** para schema/agregado/read-model. A postura síncrono×CQRS mora no `CLAUDE.md` —
aponte para lá, não a reescreva aqui.

### 2b. Infra transversal (1ª fatia): materializar os imports compartilhados

Se os imports compartilhados que a espinha faz (`auth/`, `infrastructure/database/drizzle`,
`infrastructure/cache/redis`, `infrastructure/messaging`, `modules/health`,
`common/zod-validation.pipe`) **ainda não existem no projeto**, materialize-os por
`apps/api/src/SHARED-INFRA.README.md` — **só os que ESTA fatia exige**. Eles não vêm
prontos no scaffold (são por receita) e são compartilhados por todos os bounded
contexts, então a 1ª fatia os cria e as seguintes apenas reusam. Uma fatia read-only
síncrona (write-path A) não precisa de `messaging/` nem `cache/`; pule-os. Sem esse
passo, a espinha importa módulos inexistentes e a fatia **não builda**.

### 3. Materializar as folhas (renomeando, seguindo os READMEs)

Para cada camada, crie os arquivos descritos no README correspondente, renomeando os
placeholders: `<feature>` → nome real, `<entity>`/`<name>`/`widget` → `<Entity>` real.

- **`domain`** — `entities/<entity>.entity.ts` (agregado: construtor privado + `create()`),
  `value-objects/<name>.vo.ts` (invariante na criação), `ports/<name>.repository.port.ts`
  (port como `abstract class`, nunca `interface`).
- **`application`** — `use-cases/<name>/<name>.use-case.ts` (classe pura, deps por
  construtor) + os `ports/` que ele exigir (Clock/Cache/Publisher/IdGenerator — só os
  necessários ao write-path escolhido).
- **`infrastructure`** — o adapter do repositório (`extends` o port, chama `super()`) +
  **mapper** obrigatório na borda de persistência (linha row→agregado), e os adapters dos
  ports de aplicação que existirem. Projeção allowlist no `select` (sem PK interna).
- **`presentation`** — `http/<name>.controller.ts` (fino: valida `@Body()` com
  `ZodValidationPipe`, escopo via `@CurrentUser`, sem lógica de negócio; todo
  `@Query()`/`@Param()` com decorator Swagger explícito) + `http/dtos/` (classes-espelho
  `@ApiProperty` que `implements` o tipo do contrato).
- **Contrato** — em `packages/contracts` defina **antes** o esqueleto que o use-case,
  o worker (se variante B) e a presentation importam (DTOs zod + eventos/routing keys).
  **API First:** o contrato vem antes da implementação.

### 4. Ligar o composition root

No `<feature>.module.ts`: bind de cada port ao seu adapter
(`{ provide: Port, useClass: Adapter }`) e dos use-cases puros via
`{ provide: UseCase, inject: [...ports], useFactory: (...) => new UseCase(...) }`.
**Esse é o ÚNICO lugar** que conhece adapters concretos — nenhuma camada se auto-liga.

### 5. TDD — o teste-que-falha ANTES (compõe outra skill)

Para **cada** use-case, invoque `superpowers:test-driven-development` e escreva o
`*.spec.ts` que falha **antes** do código de produção (red → green → refactor). O
`application/README.md` mostra que o use-case é testável por construção direta
(`new UseCase(fakeA, fakeB)`) — sem `TestingModule`, sem Docker.

### 6. Saída

Reporte: a **lista de arquivos criados** (por camada + contrato) e **onde o composition
root foi ligado** (quais `provide`/`useClass`/`useFactory` foram adicionados ao
`<feature>.module.ts`). Anote explicitamente que o conteúdo gerado estampa a
**stack-exemplo (NestJS)** e que outra stack adapta o mesmo procedimento.
