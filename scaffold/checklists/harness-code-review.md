# Revisão de código do harness — checklist do harness-reviewer

- [ ] **Regra de dependência:** o `domain` NÃO importa framework (ex.: `grep -rn '@nestjs' domain/` = vazio); dependências apontam para dentro (domain ← application ← infrastructure/presentation).
- [ ] **Ports são contrato abstrato** (ex.: `abstract class` como token de DI), nunca `interface`; wiring port→adapter SÓ no composition root (`*.module.ts`).
- [ ] **Escopo do contexto autenticado, nunca do input:** o `<Tenant>`/identidade que escopa uma query vem do claim verificado, não de parâmetro do usuário.
- [ ] **Sem vazar id interno:** Views/DTOs sem `id_*` (projeção na origem); o validador de saída cobre campos novos.
- [ ] **Contract-first:** mudança de rota/evento veio com o contrato (`packages/contracts` zod + snapshot OpenAPI) atualizado ANTES; sem drift.
- [ ] **Validação na borda escopada:** `ZodValidationPipe` no `@Body()` específico, nunca global; todo `@Query()`/`@Param()` com decorator Swagger explícito.
- [ ] **CQRS só sob NFR:** se a mudança introduz evento/worker/read-model, há um ADR com o NFR que justifica? (default é síncrono direto.)
- [ ] **Princípio-primeiro / sem over-build:** a mudança é o menor incremento que resolve; nada de gold-plating.
- [ ] **Best-effort não trava o boot:** telemetria/observabilidade com fallback no-op.
