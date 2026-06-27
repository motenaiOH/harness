# Definition of Done — checklist por tarefa/PR

Cole isto num PR ou issue. Uma tarefa só está **pronta** quando **todos** os itens
marcam. Regra de ouro: **evidência antes de afirmação** — rode o comando e cole a
saída; não afirme "passa/corrigido" sem executar. Se um item não puder ser cumprido,
**pare e explique o porquê** antes de seguir (o processo é condição, não sugestão).

> Substitua os placeholders ao adotar: `<App>` (nome do app), `@app/*` (scope do
> monorepo), `<Feature>`/`<Entity>`/`<Presentation>` (conceitos de domínio/borda), e os
> limiares (cobertura/mutação) conforme o **risco** do projeto — os números abaixo são
> ponto de partida calibrável, não lei.

## 1. Artefatos compartilhados buildam antes dos consumidores

- [ ] **Princípio:** todo artefato compartilhado (pacote de contratos/SDK) é buildado
      **antes** de quem o consome — consumidor importa o artefato compilado, não a fonte
      (ex.: `pnpm build` com o pacote de contratos primeiro).
- [ ] Quando a mudança toca imagem/infra: build da imagem verde (ex.: `docker compose build`).
- [ ] Cole a saída final (exit 0) abaixo.

## 2. Testes na camada certa

- [ ] **Análise estática com warning = erro** — tipo e lint não toleram warning
      (ex.: `tsc --noEmit` + `eslint --max-warnings 0`; em outras stacks `mypy`/`ruff`/`go vet`).
- [ ] **Teste de unidade + property** das regras de negócio (ex.: Vitest + fast-check).
- [ ] **Teste de integração** quando a mudança toca acesso a dados / contrato / schema
      externo (ex.: Testcontainers).
- [ ] **Teste e2e** quando a mudança toca o fluxo ponta a ponta na presentation que serve
      (ex.: Playwright para UI; sessão/curl real para CLI/API).
- [ ] **Eval SÓ se** a mudança toca uma etapa não-determinística / LLM (sem isso, não há
      eval a rodar).
- [ ] **Toda mudança de comportamento vem com teste** na camada certa.
- [ ] **Bug corrigido = teste de regressão** que falha antes do fix e passa depois.
- [ ] **Mudança que toca >1 presentation** (web/CLI/API/mobile/integração) → evidência de
      teste/spot-check **em CADA presentation afetada** (o mesmo core, bordas distintas).
- [ ] **Se a feature tem lado de leitura separado** (read model / CQRS) → o teste cobre
      **comando E consulta**, com a consulta como cidadã de 1ª classe (consistência
      eventual via polling, nunca síncrona pós-comando).

## 3. Cobertura ≥ alvo do projeto (sugestão: 80%) nas regras de negócio

- [ ] Cobertura verde no escopo das regras de negócio (`domain` + `application`), **não no
      repo inteiro** — cobrir o repo é um número enganoso; o gate mira regra de negócio
      (ex.: `pnpm --filter @app/<api> test:cov`). **Calibre o alvo ao risco** do projeto.

## 4. Mutação ≥ alvo (sugestão: 90%) nas regras de negócio (CI)

- [ ] Score de mutação ≥ break threshold no escopo de negócio (`domain` + `application` +
      cripto). Cobertura prova que a linha **rodou**; mutação prova que o teste **assere**.
      Os dois são exigidos (ex.: Stryker). **Calibre o alvo ao risco.**
- [ ] Mutantes equivalentes (inmatáveis por definição) documentados, não caçados a 100%.

## 5. Auditoria de dependências limpa

- [ ] **Princípio:** sem vulnerabilidade **high/critical** nas dependências
      (ex.: `pnpm audit --audit-level high`; em outras stacks `cargo audit`/`pip-audit`/`govulncheck`).
- [ ] `moderate`/`low` registrados; advisory high+ sem correção viável → **ADR antes de seguir**.

## 6. Contrato fresco (versionado, diffável, offline == runtime)

- [ ] Mudou o comportamento de uma borda → **contrato atualizado primeiro**, qualquer que
      seja a forma:
      - **REST/HTTP:** snapshot OpenAPI regenerado + diff verde, com decorators explícitos
        em todo input (ex.: `openapi:generate && git diff --exit-code`; `@ApiQuery`/`@ApiParam`).
      - **gRPC / GraphQL:** `.proto` / SDL **versionado** + diff de schema verde.
      - **Eventos:** schema de evento **versionado** (campo `version` + routing key).
- [ ] **Princípio comum:** o contrato é versionado, diffável e o doc gerado **offline bate
      com o runtime** (sem isso, o gate de drift não pega divergência).

## 7. Docs/ADR acompanham a mudança

- [ ] `docs/` (Diátaxis) atualizado **junto** com a mudança.
- [ ] Decisão arquitetural → **novo ADR** (nunca edite um ADR aceito; crie substituto).
- [ ] Anotações Swagger presentes em toda rota nova/alterada.

## 8. Continuidade (sem gate automático — não esqueça)

- [ ] `docs/how-to/current-state.md` reflete o estado real + follow-ups.
- [ ] Memória do agente atualizada **na mesma iteração** (espelha o current-state).

---

### Mapa gate → onde roda

| Gate | pre-commit | pre-push | CI |
| --- | --- | --- | --- |
| lint-staged (prettier) | ✓ | | |
| build de artefatos compartilhados → typecheck → lint → test → eval (se houver) | ✓ | | ✓ |
| cobertura ≥ alvo (sugestão 80%) | | ✓ | ✓ |
| audit high | | ✓ | ✓ |
| drift de contrato (snapshot/diff) | | ✓ | ✓ |
| mutação ≥ alvo (sugestão 90%) | | | ✓ (lento) |
| integração (Testcontainers) | | | ✓ (Docker) |
| e2e (Playwright) | | | ✓ (Docker) |

Bypass local `--no-verify` é de **emergência**: os hooks são bypassáveis, o **CI é a
fonte da verdade** e re-enforça tudo (defense in depth).
