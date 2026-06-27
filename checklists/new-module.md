# Novo módulo (feature) — checklist

Cada feature é um **bounded context** fatiado em quatro camadas concêntricas com
dependências apontando **para dentro**:

```
domain  →  application  →  infrastructure  →  presentation
(entities,   (use-cases,     (adapters:        (bordas: HTTP/CLI/
 VOs, ports)  guardrails)     DB/broker/cache)   gRPC/GraphQL/fila)
```

> Placeholders: `<App>`, `@app/*`, `<Feature>`, `<Entity>`, `<Presentation>`. Substitua
> ao adotar. Um **composition root** (ex.: `*.module.ts`) é o único lugar que liga
> ports → adapters. **Monólito modular por default**: a feature é um bounded context
> dentro do monólito; extrair serviço só com razão concreta (NFR), registrada em ADR.

## domain (sem framework)

- [ ] Entidades / value objects são **classes puras** (zero import de framework).
- [ ] Invariantes validadas no construtor do VO (ex.: tamanho, formato, limites).
- [ ] **Ports = contrato abstrato** declarado no domínio: o tipo abstrato que o
      application depende e a infra implementa (ex.: classe abstrata como token de DI no
      NestJS; em outras stacks, interface/protocol/trait).
- [ ] Linguagem ubíqua: os termos batem com contrato/docs/eventos (sem sinônimos).

## application (depende só de ports injetados)

- [ ] Use-cases são **classes simples** construídas por injeção direta (testáveis sem
      bootstrap de framework).
- [ ] **Caminho de escrita — escolha explícita do modelo:**
      - **(A) Fluxo simples (PADRÃO):** valida → executa → **PERSISTE** → retorna. O
        comando faz seu efeito de forma síncrona e responde com o resultado já consistente.
        **É o default**; use-o salvo NFR concreto que justifique o contrário.
      - **(B) CQRS / assíncrono (opt-in, SÓ sob NFR + ADR):** valida → gera id de
        identidade → publica evento → **retorna imediatamente** (não persiste no banco de
        domínio); a persistência roda async num **consumidor idempotente** que alimenta um
        **read model**. **CQRS/assíncrono é opt-in**, é uma VARIANTE — só sob NFR concreto
        (latência/throughput/desacoplamento) registrado em ADR, não por reflexo.
- [ ] Guardrails de saída (se aplicável) na camada application: never-throws, never-mutates.

## infrastructure (adapters)

- [ ] Repositório implementa o port do domínio; o `select` **projeta só campos públicos**
      (allowlist na origem — id interno nunca cruza a fronteira).
- [ ] Mapper traduz linha do banco ↔ entidade.
- [ ] **Se o módulo publica/consome mensagens** (variante assíncrona): adapter de broker
      (publisher) recebe routing key como argumento; consumidor é idempotente.
- [ ] **Observabilidade best-effort**: recorder de métrica com fallback **no-op** quando o
      exporter não está configurado — nunca quebra o startup (ex.: OTel).

## presentation (uma ou mais bordas: HTTP / CLI / gRPC / GraphQL / fila)

> **Princípio:** presentation é UMA borda de entrada; HTTP é só um exemplo. O **mesmo**
> `domain`/`application` serve várias presentations — **duplique esta seção por
> presentation** (uma para a UI, uma para o CLI, uma para a API pública…), **nunca** a
> regra de negócio dentro do domain.

- [ ] **Adapter fino, sem regra de negócio:** a borda só traduz entrada/saída e delega ao
      use-case (ex.: controller HTTP, comando de CLI, resolver GraphQL, handler de fila).
- [ ] **Validação na borda, escopada ao input** daquela presentation — não global (rodaria
      contra params injetados como o usuário atual). Ex.: `ZodValidationPipe` no `@Body()`
      específico, nunca via `@UsePipes`.
- [ ] **Se a presentation é uma API, o contrato é anotado** para gerar o doc/schema
      versionado (ex.: Swagger `@ApiTags`/`@ApiOkResponse` + decorator explícito em todo
      `@Query()`/`@Param()`). CLI/UI internas não precisam de OpenAPI.
- [ ] Tipo de resposta espelha o tipo do contrato (drift detectado em compile-time).

## composition root (ex.: `<feature>.module.ts`)

- [ ] **Um composition root** liga cada port ao seu adapter via providers
      (ex.: `{ provide: Port, useClass: Adapter }`) — a fiação ports→adapters mora **só** aqui.
- [ ] **Se usa mensageria:** não importa o módulo do broker direto na feature — consome a
      conexão exposta por um módulo global (ex.: `@Global() MessagingModule` re-exporta o
      `RabbitMQModule`).

## Testes (pirâmide)

- [ ] Unit/property nos use-cases e VOs (`*.spec.ts` / `*.prop.test.ts`).
- [ ] Boundary explícito além da property (ex.: exatamente N passa, N+1 falha com a
      mensagem literal) para matar mutantes de fronteira.
- [ ] Integração no repositório real, se tocar dado (ex.: Testcontainers).
- [ ] e2e na presentation que serve a feature, se ela aparece no fluxo ponta a ponta —
      **uma suíte por presentation** (e2e de UI não substitui teste de API/CLI).
- [ ] **Se há read model (variante CQRS):** a leitura é testada como cidadã de 1ª classe
      (consistência eventual via polling, não síncrona pós-comando).
- [ ] Cobertura e mutação no escopo domain+application **acima do alvo do projeto**
      (sugestão: 80% / 90%; calibre ao risco).

## Contrato & docs

- [ ] Contrato (DTOs/eventos) definido **antes** da implementação, versionado e diffável
      (ex.: zod em `packages/contracts` com type via `z.infer`).
- [ ] Snapshot/schema do contrato regenerado e diff verde (OpenAPI para REST; `.proto`/SDL
      para gRPC/GraphQL; schema de evento versionado para fila).
- [ ] `docs/` + ADR (se houve decisão — incl. a escolha de CQRS/extração de serviço) +
      `current-state.md` atualizados.
