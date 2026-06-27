# Harness Model

Um **modelo reutilizável** (blueprint + scaffold copiável) para montar uma aplicação
de referência completa: uma **API monólito-modular autenticada** servida a **uma ou
mais presentations** (web, mobile, CLI, API pública, integrações) → (opcional, sob NFR)
um **broker de mensagens** → um **worker** que persiste no banco, mais **cache**,
**observabilidade** (OpenTelemetry → stack de métricas/traces/logs), **Docker Compose**,
**deploy K8s (Helm)**, **CI/CD** e a **pirâmide completa de testes** (unidade,
propriedade, integração, E2E, eval). O exemplo concreto materializa **UMA** presentation
(web + proxy same-origin) como ilustração — não como o único canal possível.

Este repositório **não é a aplicação** — é a *receita de como construí-la*. Ele
captura a **metodologia** (em [`CLAUDE.md`](CLAUDE.md) e [`docs/`](docs/index.md)) e
um **scaffold copiável** (em [`scaffold/`](scaffold/)) cujos arquivos são versões
genéricas, *business-stripped*, dos artefatos reais de um harness em produção. Toda
referência de negócio foi substituída por placeholders neutros: **`<App>`** (escopo
`@app/*`), **`<Feature>`** (o módulo de feature — análogo a um "chat"/"módulo" no
original), **`<Entity>`** (a entidade do domínio, ex.: "widgets") e um **`<Tenant>`**
abstrato apenas onde o isolamento por contexto importa para o processo.

> O coração do modelo é o **processo**, não o stack **nem a forma**. Tanto o stack
> (Next.js + NestJS + RabbitMQ + Postgres + Redis + OTel) **quanto a topologia** do
> exemplo (uma presentation web com proxy; write-path assíncrono via broker+worker;
> um único deploy) são apenas **um recorte concreto** que prova os princípios. Troque
> qualquer peça — adicione presentations (mobile/CLI/API pública), persista **síncrono**
> sem broker quando não há NFR que justifique o assíncrono, ou mantenha tudo num
> monólito modular — e os princípios continuam valendo.

## Para que serve

- **Bootstrapar um projeto novo** com defense-in-depth, contract-first, clean
  architecture e uma Definition of Done **enforçada por automação** desde o commit 1
  — em vez de descobrir esses gates tarde, sob pressão.
- **Padronizar como um agente de IA (Claude Code) constrói** software: instruções
  hierárquicas (`CLAUDE.md`), log de decisões consultável (ADRs), documento de
  continuidade (`current-state.md`) e entrega por **fatias verticais**.
- **Servir de referência** de como cada peça se encaixa: o `scaffold/` espelha a
  estrutura de um repo real (mesmos nomes de arquivo), então o mapeamento é imediato.
  É uma **espinha + receita** — não um app que builda out-of-the-box; ver
  *Status do scaffold* abaixo.

## Os princípios (resumo)

O detalhe vive em [`CLAUDE.md`](CLAUDE.md) e [`docs/explanation/`](docs/explanation/architecture.md).
Em uma frase cada:

1. **Defense in depth sobre ponto único de confiança.** Todo gate da DoD roda em
   três camadas independentes — git hooks locais (Husky, feedback rápido,
   contornável com `--no-verify`), um **DAG de CI estagiado** (a fonte da verdade,
   não-contornável) e proteção de branch. Um skip local nunca enfraquece o contrato
   porque o CI re-enforça tudo. O mesmo empilhamento vale para segurança (allowlist
   na origem + transação `READ ONLY` + `statement_timeout`) e para contratos (gate
   de drift offline + gate de fidelidade em runtime).
2. **Processo é normativo, não aspiracional.** TDD (red→green→refactor), API-first,
   doc-first e linguagem ubíqua são **condição** de qualquer mudança — se uma não
   puder ser cumprida, **pare e explique o porquê** antes de seguir.
3. **Evidência antes de afirmação.** Nada está "pronto/passa/corrigido" até o
   comando-gate rodar e a saída ser colada. Fatias que tocam a UI terminam com uma
   verificação manual do render. Cobertura prova que a linha rodou; **mutação** prova
   que o teste assertou — os dois gates são exigidos.
4. **Contract-first, fonte única da verdade.** Todo DTO e evento é um schema `zod`
   com o tipo TypeScript derivado via `z.infer` (tipo e validação nunca divergem),
   num pacote `contracts` *framework-free* consumido por todos os lados. O OpenAPI
   gerado é um snapshot commitado guardado por um gate de drift offline-vs-runtime.
5. **Doc-as-code (Diátaxis) + ADRs imutáveis.** A doc mora no repo e versiona junto
   do código. ADRs (formato Nygard, numerados) capturam o *porquê*; um ADR aceito
   **nunca é editado** — cria-se um substituto. `mkdocs build --strict` é gate de CI.
6. **Clean architecture como monólito modular.** Cada feature é um bounded context
   em quatro camadas concêntricas (`domain → application → infrastructure →
   presentation`), dependências apontando **para dentro**; o domínio não importa
   framework; o `*.module.ts` é o único composition root. **Monólito por padrão:**
   bounded contexts são módulos no **mesmo deploy**; extrair um serviço próprio exige
   **razão concreta** (NFR de escala/isolamento/ownership/ciclo de release), **nunca
   estética**. A camada `presentation` é **uma borda** (HTTP é só um exemplo — CLI/
   gRPC/GraphQL/consumidor-de-fila são outras): cada presentation é um adapter de borda
   **fino** que traduz protocolo ⇄ use-case e não é o core.
7. **Síncrono por default; CQRS/assíncrono só sob NFR (+ ADR).** O write-path
   **padrão** é direto e síncrono: o use-case valida → persiste no repositório →
   responde. **Separar** write-path de persist-path (publicar um evento durável →
   worker idempotente → read model) é **CQRS/write-behind** — adote **somente** quando
   um requisito **não-funcional** concreto justificar (assimetria leitura/escrita,
   escala de leitura, picos de escrita, desacoplamento temporal, fan-out). O custo é
   real (broker, idempotência, read-your-writes eventual) e **toda adoção vira ADR**. A
   variante assíncrona (endpoint publica evento → worker faz `INSERT … ON CONFLICT DO
   NOTHING` idempotente chaveado pelo id do produtor) é **um exemplo** dessa escolha,
   não "o jeito".
8. **Uma imagem, três papéis.** O backend é buildado **uma vez** e diferenciado em
   runtime pelo *override do comando* (api / worker / migrate one-shot). As mesmas
   *command arrays* fluem por Compose, Helm e Terraform.
9. **Dependências voláteis atrás de um port; caminho crítico determinístico.**
   Dependências externas, não-determinísticas ou caras (serviços de terceiros,
   relógio, rede — e, *se houver*, um LLM) ficam **atrás de um port**; o caminho
   crítico funciona e é testável **sem elas** (determinístico, reproduzível — CI
   keyless e grátis). Adapters são **best-effort** com fallback/degradação graciosa
   (no-op quando desligados) e **nunca travam o boot**. **Se a app tem IA/LLM**, ele
   entra atrás desse port numa fatia posterior e só *explica/organiza*, **nunca decide**.
10. **Fail-closed por allowlist; escopo sempre do contexto autenticado.** Tabelas/
    colunas/funções e origens CORS permitidas são allowlists explícitas (denylist
    sempre esquece algo); o `<Tenant>`/identidade que escopa uma query vem do claim
    JWT verificado, **nunca** do input do usuário; ids internos nunca cruzam a
    fronteira.
11. **Fatias verticais com continuidade barata.** Cada incremento atravessa o sistema
    inteiro (uma presentation — UI/CLI/API → API → orquestração → dado → contrato de saída) e é demoável/
    testável/deployável por si só. Cada fatia roda o ciclo brainstorm → spec → plano →
    execução por subagent → ADR, e atualiza um `current-state.md` repo-resident.
12. **Múltiplas presentations sobre um core.** A app é uma **API monólito-modular**
    servida a **uma ou mais** presentations (web, mobile, CLI, API pública,
    integrações); cada uma é um **adapter de borda fino** (traduz protocolo ⇄ use-case),
    **não** o core. A API é o **core compartilhado** servido a essas presentations — não
    pressupõe um único canal. O
    **invariante de auth** é único: o core **verifica um token assinado e deriva o escopo
    do claim, NUNCA do input**; cada presentation traz **seu próprio fluxo de credencial**
    (cookie + proxy server-side na web; client-credentials / API key em clientes
    programáticos). O exemplo materializa só a presentation web — `apps/mobile`,
    `apps/cli`, `apps/public-api` seriam apps-irmãs sobre a **mesma** API.

## Estrutura deste modelo

```
harness-model/
├── README.md            # este arquivo: o que é + como replicar
├── CLAUDE.md            # a metodologia genérica (diretrizes + DoD + enforço)
├── mkdocs.yml           # os docs do PRÓPRIO modelo buildam com `mkdocs build --strict`
├── docs/                # docs DO MODELO (Diátaxis + 2 ADRs-semente)
│   ├── index.md
│   ├── adr/             # 0000 template + 0001 record-architecture-decisions
│   ├── tutorials/       # getting-started
│   ├── how-to/          # replicate-this-harness + current-state.template
│   └── explanation/     # architecture + sync-and-async-flow
├── checklists/          # DoD, nova fatia, novo módulo, novo ADR, testes, segurança
└── scaffold/            # a ESPINHA copiável (ver "Status do scaffold" abaixo)
    ├── package.json · turbo.json · pnpm-workspace.yaml · tsconfig.json
    ├── commitlint.config.cjs · .prettierrc · .lintstagedrc.json · .gitignore · .dockerignore · .env.example
    ├── compose.yaml · compose.observability.yaml · mkdocs.yml · playwright.config.ts
    ├── release-please-config.json · .release-please-manifest.json
    ├── .husky/             # pre-commit · commit-msg · pre-push (gates locais)
    ├── .github/workflows/  # ci · docs · release
    ├── packages/
    │   ├── tsconfig/       # base + variantes nestjs/nextjs/node/library
    │   ├── eslint-config/  # flat config (base + ./node)
    │   └── contracts/      # zod DTOs + eventos versionados (tipo via z.infer)
    ├── docs/               # seed Diátaxis p/ o mkdocs do projeto novo passar --strict
    ├── observability/      # provisioning Grafana (datasources + dashboards) — exemplo
    ├── deploy/helm/        # RECEITA do chart (README; o chart você materializa)
    └── apps/
        ├── api/            # NestJS: a API (entrypoints main/migrate/otel/bootstrap +
        │                   #   worker [variante assíncrona]), config zod, e o módulo
        │                   #   feature/ em 4 camadas (espinha)
        └── web/            # UMA presentation (proxy same-origin) — a materializar.
                            #   apps/mobile · apps/cli · apps/public-api seriam
                            #   apps-irmãs sobre a MESMA API (cada uma um adapter de borda)
```

- **`docs/`** = a documentação **do modelo em si** (explica o método). Os 2 ADRs aqui
  só semeiam o *formato* — o `docs/adr/` real é do projeto que consome o modelo.
- **`scaffold/`** = a espinha copiável de um repo real. Nomes de arquivo reais
  (`otel.ts`, `bootstrap.ts`, `migrate.ts`, `worker.ts`, `env.schema.ts`, a árvore de
  4 camadas) mantêm o mapeamento com o harness funcional.

## Status do scaffold: espinha + receita (leia antes de copiar)

O `scaffold/` **não** é um app que builda out-of-the-box — é uma **espinha copiável**
(toda a *cola* de monorepo, gates e configs, prontos) **mais uma receita** (os
arquivos-folha de domínio e infra que você materializa seguindo os `README.md` de
camada e os checklists). Distinção explícita:

- **Entregue — copie e use como está:** configs de raiz (`package.json`, `turbo.json`,
  `tsconfig` + variantes, `eslint-config`, `commitlint`, `.husky/*`, `.lintstagedrc`,
  `.dockerignore`, `.env.example`), workflows `ci/docs/release`, `compose*.yaml`, os
  `Dockerfile` de api e web, o provisioning de observabilidade, o pacote `contracts`
  (zod + `z.infer`), os **entrypoints** da API (`main/migrate/otel/bootstrap` +
  `worker` — este último a **variante assíncrona**) + `env.schema`, a seed de `docs/`
  (mkdocs `--strict` passa) e os checklists.
- **Receita — materialize seguindo os READMEs de camada (NÃO buildam como copiados):**
  os arquivos-folha do módulo `feature/` (entidade, value objects, ports, use-cases,
  adapters, controller — os blocos de código vivem nos `README.md` de cada camada,
  para você criar como `<entity>.entity.ts`, `<name>.use-case.ts`, …), o **Helm chart**
  (`deploy/helm/` traz a receita, não o chart) e o **interior do `apps/web`**. Por isso
  `feature.module.ts`/`app.module.ts` importam folhas que você cria — são a **espinha
  ilustrativa**, não código compilável intocado.

> Consequência: `pnpm build`/`docker compose up` ficam verdes **depois** que você
> materializa as folhas. Os gates do DoD valem para o *seu* código — o scaffold os
> deixa prontos para rodar, não pré-satisfeitos. O guia
> [`docs/how-to/replicate-this-harness.md`](docs/how-to/replicate-this-harness.md)
> mapeia, arquivo a arquivo, o que **copiar** vs **criar**.

## Como replicar num projeto novo (passo a passo)

Guia detalhado: [`docs/how-to/replicate-this-harness.md`](docs/how-to/replicate-this-harness.md).
Resumo:

1. **Copie a espinha.** Leve `scaffold/*` para a raiz do repo novo e **purgue
   comentários de proveniência**. Renomeie o escopo `@app/*` para o seu (`@suaorg/*`)
   em `package.json`/`pnpm-workspace.yaml`/`tsconfig`. Renomeie o módulo `feature/`
   para o seu primeiro bounded context e **materialize as folhas de domínio** seguindo
   os `README.md` de cada camada (nomeando-as `<entity>.entity.ts`, `<name>.use-case.ts`,
   …) — ver *Status do scaffold*.

2. **Adote o `CLAUDE.md`.** Copie [`CLAUDE.md`](CLAUDE.md) para a raiz; preencha os
   placeholders de comandos e limiares (cobertura **≥ 80%** nas regras de negócio,
   mutação **≥ 90%**), os termos da sua linguagem ubíqua e os gotchas locais. Esse é
   o "system prompt do projeto" que o agente carrega sempre.

3. **Ligue o enforço local.** `pnpm install` instala o Husky via script `prepare`
   (zero passo manual). Confirme que `pre-commit` (lint-staged → build contracts →
   typecheck → lint → test → eval), `commit-msg` (commitlint) e `pre-push` (cobertura
   + audit + drift de OpenAPI) rodam.

4. **Suba o stack.**
   ```bash
   cp .env.example .env          # preencha os segredos (use `openssl rand -base64 32`)
   pnpm install
   pnpm --filter @app/contracts build   # SEMPRE primeiro: api/web importam o dist
   docker compose up -d --wait
   ```

5. **Configure o CI como fonte da verdade.** Ative os workflows em
   `.github/workflows/` (estágios `static → mutation + integration → e2e`). O CI
   re-enforça **tudo** que os hooks locais checam, mais o que precisa de Docker.
   Configure **proteção de branch** na default (veja a ressalva em
   [`checklists/aprendizados.md`](checklists/aprendizados.md): é *platform-gated*).

6. **Trabalhe por fatias verticais.** Para cada incremento, siga
   [`checklists/new-vertical-slice.md`](checklists/new-vertical-slice.md): brainstorm
   → spec → plano executável → execução por subagent → ADR, fechando pelo DoD em
   [`checklists/definition-of-done.md`](checklists/definition-of-done.md) e
   atualizando `docs/how-to/current-state.md` na **mesma** iteração.

## Comandos (exemplo, ajuste ao seu scaffold)

Monorepo Turborepo + pnpm (Node 22). Da raiz:

```bash
pnpm install
pnpm --filter @app/contracts build   # build-first obrigatório (ver Gotchas)

pnpm typecheck            # tsc --noEmit em todos os pacotes
pnpm lint                 # eslint (--max-warnings 0; warning quebra o build)
pnpm test                 # vitest: unidade + propriedade
pnpm test:int             # integração via Testcontainers (precisa de Docker)
pnpm test:e2e             # Playwright (precisa do stack no ar)
pnpm eval                 # eval do caminho crítico
pnpm audit --audit-level high           # gate de dependências (high/critical)
pnpm --filter @app/api mutation         # mutação (Stryker, score >= 90)
pnpm --filter @app/api openapi:generate # regenera o snapshot do OpenAPI (gate de drift)
```

> Os gates rodam sozinhos via **git hooks (Husky)** e são re-enforçados no **CI**.
> Bypass de emergência (`--no-verify`) **nunca** contorna o CI. Ver [`CLAUDE.md`](CLAUDE.md)
> e [`checklists/definition-of-done.md`](checklists/definition-of-done.md).

## Gotchas que custam tempo (do scaffold-exemplo: NestJS/Next/pnpm — mantenha intactos)

1. **`@app/contracts` precisa ser buildado antes de api/web.** O `tsconfig` do pacote
   fixa `incremental:false`/`composite:false` de propósito — com `--incremental` o
   `tsc` escreve `tsconfig.tsbuildinfo` *fora* de `dist` e depois pula o emit após o
   `dist` ser limpo. O `.dockerignore` também exclui `**/*.tsbuildinfo` para um
   buildinfo velho não envenenar a imagem.
2. **Headers de segurança (helmet) ficam só no entrypoint de runtime**, fora da função
   de config compartilhada — senão o builder offline de OpenAPI (que chama a config
   sem `app.init()`) diverge do runtime e o gate de drift quebra.
3. **DI do broker:** o módulo de mensageria é exposto via um `@Global()` module que
   re-exporta o módulo do broker. Não importe o `forRoot*` direto em feature modules.
4. **Validação é Zod, não class-validator.** Não há `ValidationPipe` global; aplique o
   `ZodValidationPipe` ao `@Body()` específico — nunca via `@UsePipes`.
5. **Windows:** o build `output:'standalone'` do Next falha no passo de symlink sem
   Developer Mode; use `next dev` local. O build Docker (Linux) gera standalone normal.
6. **Protocolo do broker entre nuvens:** ao trocar o broker no deploy (ex.: AMQP
   0-9-1 ↔ outro), variáveis de conexão e semântica de entrega mudam — trate como
   risco de ambiente, não detalhe trivial (ver `scaffold/deploy/README.md`).

---

> Decisões de método: ADRs em [`docs/adr/`](docs/adr/0001-record-architecture-decisions.md).
> Para entender *por que* cada peça existe, comece por
> [`docs/explanation/architecture.md`](docs/explanation/architecture.md).
