# &lt;App&gt; harness — modelo

> **O que é isto.** Um *harness* de referência, business-stripped: a receita de
> COMO construir um sistema ponta-a-ponta — não o que ele faz. O domínio é um
> placeholder (`<Feature>` opera sobre `<Entity>`, ex.: "widgets"). Troque os
> placeholders pelo seu domínio; a estrutura, os gates e os contratos
> permanecem.

A forma de referência: um **frontend** (Next.js + Auth.js) conversa com uma
**API autenticada** (NestJS, clean architecture), que publica um **evento
durável** num broker (RabbitMQ), consumido por um **worker** (mesma imagem,
outro entrypoint) que persiste no **Postgres**. Inclui cache (Redis),
observabilidade (OpenTelemetry → Grafana LGTM), Docker Compose, Helm,
e a pirâmide completa de testes — toda governada por um Definition of Done
enforçado em três camadas (git hooks → CI → branch protection).

## Mapa rápido (Diátaxis)

Cada documento declara seu quadrante e não mistura os modos. Use a coluna
"Quando ler" para escolher.

| Quadrante | Documento | Quando ler |
|---|---|---|
| **Tutorial** (aprender) | [Começando](tutorials/getting-started.md) | Primeira vez — subir tudo com um comando e ver o loop funcionar |
| **How-to** (resolver tarefa) | [Replicar este harness](how-to/replicate-this-harness.md) | Bootstrap de um novo projeto a partir deste modelo |
| **How-to** (continuidade) | [Estado atual (gabarito)](how-to/current-state.template.md) | Manter o doc de continuidade vivo ao fim de cada fatia |
| **Explanation** (entender o porquê) | [Arquitetura](explanation/architecture.md) | Entender as 4 camadas, ports & adapters, monólito modular |
| **Explanation** (entender o porquê) | [Escrita síncrona e opt-in assíncrono](explanation/sync-and-async-flow.md) | Entender o write síncrono default e quando (sob NFR) virar CQRS/assíncrono |
| **ADR** (registro de decisão) | [Template de ADR](adr/0000-adr-template.md) · [Registrar decisões](adr/0001-record-architecture-decisions.md) | Toda decisão arquitetural vira um ADR imutável |

## Stack (forma de referência)

> A **forma** abaixo — uma única presentation (web) e o write-path na variante
> assíncrona — é uma **escolha** de demonstração, não uma verdade. O core serve
> N presentations (web/mobile/CLI/API/integração) e o write padrão é síncrono;
> async é opt-in sob NFR (ver Princípios e
> [Arquitetura](explanation/architecture.md)).

| Camada | Tecnologia (substituível) |
|---|---|
| Presentation (exemplo: web) | Next.js (App Router) + Auth.js — uma das N bordas possíveis |
| API | NestJS (DDD / clean arch / monólito modular) |
| Mensageria | Broker AMQP — exchange tópico durável (RabbitMQ) |
| Worker | Node standalone (reconexão gerenciada) |
| Persistência | Postgres + Drizzle ORM |
| Cache | Redis |
| Observabilidade | OTel → Grafana / Tempo / Loki / Prometheus |
| Monorepo | Turborepo + pnpm |

## Princípios (a alma do modelo)

1. **Defesa em profundidade** — cada gate do DoD roda em três camadas
   independentes: git hooks (rápido, *bypassável* com `--no-verify`), CI
   estagiado (a verdade incontornável) e branch protection. O skip local nunca
   enfraquece o contrato porque o CI re-enforça tudo.
2. **Processo é normativo, não aspiracional** — TDD (red→green→refactor),
   API-first, Doc-first e linguagem ubíqua são *condição* de qualquer mudança.
3. **Evidência antes de afirmação** — nada está "pronto/passa/corrigido" sem
   rodar o comando-gate e colar a saída. Cobertura prova que a linha rodou;
   mutação prova que o teste de fato afirma comportamento.
4. **Contract-first, fonte única** — todo DTO/evento é um schema zod com o tipo
   derivado por `z.infer`; vive num pacote sem framework consumido por todos os
   lados. O OpenAPI gerado é snapshot commitado, guardado por gate de drift.
5. **Clean architecture como monólito modular** — cada feature é um bounded
   context fatiado em 4 camadas concêntricas; dependências apontam para dentro.
   Extrair um módulo para serviço é decisão de NFR, registrada em ADR — nunca
   estética.
6. **Múltiplas presentations sobre um core** — o monólito-modular é servido a
   **uma ou mais** bordas (web/mobile/CLI/API pública/integrações); cada
   presentation é um adapter de borda fino que reusa o **mesmo** use-case. A
   auth é invariante: o core verifica um token assinado e autoriza pelo **escopo
   do claim**, nunca pelo input; cada borda tem seu fluxo de credencial.
7. **Escrita síncrona por default; assíncrona (CQRS) só sob NFR** — o write
   padrão `valida → persiste → responde` na mesma requisição. Separar
   write-path de persist-path (publica evento → worker idempotente `INSERT ... ON
   CONFLICT DO NOTHING` → read model) é **CQRS/write-behind**, adotado **só sob
   um NFR concreto** (assimetria r/w, escala de leitura, picos, desacoplamento,
   fan-out) e registrado em ADR. É uma variante, não "o jeito".
8. **Uma imagem, três papéis** *(na variante assíncrona)* — `api` / `worker` /
   `migrate` diferenciados em runtime pelo command do container.
9. **Determinístico primeiro, IA/LLM depois** — o caminho crítico funciona sem
   LLM; o LLM entra atrás de um port numa fatia posterior e só "explica", nunca
   "decide".
10. **Fail-closed por allowlist** — o que é permitido é explícito; o
    tenant/identidade que escopa uma consulta vem do JWT verificado, nunca do
    input do usuário.
11. **Fatias verticais com continuidade barata** — cada incremento atravessa o
    sistema inteiro e termina atualizando o `current-state.md` + a memória do
    agente.
