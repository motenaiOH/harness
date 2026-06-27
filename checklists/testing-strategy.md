# Estratégia de testes — checklist

Pirâmide de **5 níveis**, cada um com seu próprio config/runner, rodando **no lugar mais
barato que ainda dá sinal**. Dois gates ortogonais: cobertura prova que a linha **rodou**;
mutação prova que o teste **assere**.

> Placeholders: `<App>`, `@app/*`, `<Feature>`, `<Entity>`, `<Presentation>`. Substitua ao adotar.

## Escolha do nível (decisão por tipo de mudança)

- [ ] Regra de negócio (domain/application) → **unit + property** (+ mutação).
- [ ] Acesso a dados / repositório / schema externo → **integração** (ex.: Testcontainers).
- [ ] Fluxo ponta a ponta na presentation que serve → **e2e** (ex.: Playwright para UI;
      sessão/curl real para CLI/API).
- [ ] Comportamento de uma etapa não-determinística / LLM → **eval** (SÓ se existir tal etapa).
- [ ] Drift de contrato → **contract test** (offline + runtime), por forma de contrato:
      OpenAPI (REST), `.proto`/SDL (gRPC/GraphQL), schema de evento (fila).

## Cada nível tem seu próprio config/runner (não só por nome de arquivo)

Cada nível roda com config/runner próprio, isolando velocidade, paralelismo e escopo de
cobertura (ex.: na stack de referência com Vitest):

- [ ] `vitest.config.ts` — unit+property (`*.spec.ts`, `*.prop.test.ts`); rápido;
      coverage com `include` **restrito a domain+application** e thresholds no alvo do
      projeto (sugestão 80%, calibrável ao risco).
- [ ] `vitest.integration.config.ts` — `*.int.test.ts`/`*.contract.test.ts`;
      **`fileParallelism: false`**, `hookTimeout` ~120s, `testTimeout` ~60s (containers são lentos/serializados).
- [ ] `vitest.eval.config.ts` — `*.eval.test.ts`; `retry: 0` (só se houver pipeline não-determinístico).
- [ ] `stryker.conf.json` — mutate só domain+application+cripto; `break` no alvo (sugestão
      90, calibrável); `coverageAnalysis: perTest`; **plugin do runner declarado
      explicitamente** (auto-discovery não resolve no pnpm isolado).
- [ ] `playwright.config.ts` — `testDir ./e2e/tests`, `BASE_URL` por env, `retries: 2` em
      CI, trace on-first-retry; **sem bloco `webServer`** (roda contra stack já no ar).

## e2e/contract por presentation

- [ ] **Cada presentation (web / CLI / API / mobile) tem sua própria suíte e2e/contract na
      sua fronteira.** O e2e de UI **não** substitui o teste da API pública ou do CLI — são
      bordas diferentes do mesmo core, cada uma exercitada onde é consumida.

## Property-based (agnóstico de ferramenta, ex.: fast-check)

- [ ] Seed fixo + `numRuns` alto para invariantes (trim, limites).
- [ ] **Casos de boundary explícitos** além da property (a property sozinha não cobre
      `>= N` vs `> N` — precisa de N passa / N+1 falha com a string literal de erro).

## Integração (Testcontainers)

- [ ] `beforeAll` sobe o container (ex.: `postgres:17-alpine`) e aplica **as mesmas
      migrations da app**.
- [ ] Exercita o **repositório real** (isolamento por escopo, idempotência, round-trip JSONB).
- [ ] `afterAll` faz `pool.end()` + `container.stop()`.

## Contract tests (na stage de integração, mas sem Docker para o drift)

- [ ] Drift do contrato da API, **por forma**: constrói o doc/schema **offline** (sem abrir
      conexões, stub dos providers) e deep-equals contra o snapshot/SDL/`.proto` commitado
      (REST→OpenAPI; GraphQL→SDL; gRPC→`.proto`; eventos→schema versionado).
- [ ] Conformidade de schema externo: aplica DDL structure-only num container e valida que
      cada tabela/coluna mapeada existe.
- [ ] Runtime-fidelity (e2e): o contrato servido ao vivo == snapshot commitado.

## Eval — só se houver pipeline não-determinístico / LLM (harness de dois modos)

- [ ] **Keyless (gate duro no CI):** LLM noop → fallback determinístico → graders puros passam.
- [ ] **Keyed (opt-in, fora do CI):** LLM real + LLM-as-judge com threshold suave;
      **auto-skip** sem API key (nenhuma chamada de rede no CI).
- [ ] Builder espelha o composition root de produção, trocando **só** adapters de dados por fakes.
- [ ] Graders são funções puras com seus próprios `*.spec.ts`.

## Onde cada gate roda

- [ ] **pre-commit** (barato, sem infra): lint-staged → build contracts → typecheck →
      lint → test (unit+property) → eval determinístico.
- [ ] **pre-push** (pesado, determinístico, sem Docker): cobertura ≥ alvo → audit → drift de contrato.
- [ ] **CI** (precisa Docker / é lento): integração + e2e + mutação.

## Dois gates, ambos exigidos

- [ ] Cobertura (linha rodou) **e** mutação (teste assere), **ambas no alvo do projeto**
      (sugestão 80% / 90%, calibrável ao risco). 100% de cobertura passa com asserções
      vazias — só a mutação pega "cobre mas não assere".
- [ ] Mutação escopada às regras de negócio (o runner de mutação só roda unit; mutar
      infra/presentation geraria survivors falsos).
- [ ] **Lado de leitura / caminho assíncrono (variante CQRS):** a projeção/read model é
      testada como cidadã de 1ª classe — consistência eventual asserida com polling
      (ex.: `expect.poll()`), **nunca** síncrona após o comando (senão é racey).
