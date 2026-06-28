# Harness agents/skills — Baseline (Fase 2) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar os dois role-agents **baseline** — **`qa`** (adequação de teste + rastreabilidade) e **`harness-reviewer`** (revisão de código contra as regras do harness) — e **ligá-los** ao passo 5 do `new-slice`, promovendo-os de "fase futura" para "existe hoje".

**Architecture:** Role-agents são subagents (`.claude/agents/<nome>.md`) com **independência adversarial** + um **checklist-companion** (`checklists/<nome>.md`). São o **baseline** da matriz: a triagem os acorda em **qualquer mudança de comportamento**. QA audita *o que/se* os testes garantem (distinto da mutação mecânica e dos hooks que *rodam*); harness-reviewer revisa o *código de produção* contra a regra de dependência, escopo-do-claim, sem-vazar-id, contract-first, CQRS-só-sob-NFR. Ambos **citam o `CLAUDE.md`**, não o duplicam; caminhos **project-relative**.

**Tech Stack:** Claude Code subagents (markdown + frontmatter YAML). Sem código de runtime. Fonte da verdade: a spec `docs/superpowers/specs/2026-06-27-harness-agents-skills-design.md` (§3, baseline) + o backbone já em `main`.

---

## Como se "testa" (igual à Fase 1)

1. **Estrutural** — `grep` confirma frontmatter (`name`/`description`/`tools`) e seções.
2. **Anti-vazamento** — `grep -rniE '<termos-da-origem>'` retorna vazio (`author`→"thor" é falso-positivo; filtre).
3. **Project-relative** — `grep -c 'scaffold/' <arquivo>` = 0.
4. **Dogfood seca** — raciocinar o que o agente FARIA sobre a feature-exemplo `widget` (não dá pra invocar ao vivo mid-sessão).
5. **Não-regressão** — `mkdocs build --strict` (raiz + scaffold) PASS.

---

## File Structure (Fase 2)

| Arquivo | Responsabilidade |
| --- | --- |
| `scaffold/.claude/agents/harness-reviewer.md` | Subagent revisor de código contra as regras do harness (read-only). |
| `scaffold/checklists/harness-code-review.md` | Checklist-companion do reviewer (regra de dependência, escopo, id-leak, contrato, CQRS, validação). |
| `scaffold/.claude/agents/qa.md` | Subagent de adequação de teste + rastreabilidade critério→teste. |
| `scaffold/checklists/qa-test-adequacy.md` | Checklist-companion do QA (rastreabilidade, cobertura por risco, qualidade do teste). |
| `scaffold/.claude/skills/new-slice/SKILL.md` (mod) | Passo 5 passa a invocar qa + harness-reviewer; degradação remove os dois da lista "fase futura". |
| `scaffold/.claude/convocation-matrix.md` (mod) | Nota: agora existem Arquiteto + QA + harness-reviewer (não só Arquiteto). |
| `scaffold/.claude/README.md` (mod) | Move qa + harness-reviewer de "fase futura" para "existe hoje". |

---

## Task 1: Agente `harness-reviewer` + checklist-companion

**Files:**
- Create: `scaffold/checklists/harness-code-review.md`
- Create: `scaffold/.claude/agents/harness-reviewer.md`

- [ ] **Step 1: Escrever o checklist-companion**

`scaffold/checklists/harness-code-review.md` — itens `[ ]` acionáveis, princípio-primeiro, que **distilam** as regras do harness (apontando para o `CLAUDE.md` para o detalhe, não reescrevendo):

```markdown
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
```

- [ ] **Step 2: Escrever o agente**

`scaffold/.claude/agents/harness-reviewer.md`. Frontmatter EXATO:

```markdown
---
name: harness-reviewer
description: Revisa CÓDIGO DE PRODUÇÃO contra as regras do harness (regra de dependência, escopo-do-claim, sem-vazar-id, contract-first, CQRS-só-sob-NFR, validação na borda). Use em qualquer mudança de comportamento, junto do QA.
tools: Read, Grep, Glob
---
```

Corpo (prosa) — pontos obrigatórios:
- Papel: revisor de código **independente**; você **lê e julga, não edita** (tools read-only).
- **Fonte das regras:** leia o `CLAUDE.md` (Diretrizes + Gotchas) como autoritativo — NÃO reescreva as regras aqui; rode o checklist `checklists/harness-code-review.md`.
- O que revisar: os itens do checklist (regra de dependência, ports, escopo-do-claim, id-leak, contract-first, validação, CQRS-sob-NFR, princípio-primeiro).
- **Saída:** achados em **Critical / Important / Minor** com `arquivo:linha`; um **veredito** (aprovado / mudanças requeridas). Achado bloqueante (Critical/Important) → volta pro build.
- **Independência:** não "aprove por gentileza"; um achado real é um achado. Não negocie; o humano arbitra.
- Zero negócio; placeholders `<App>/<Feature>/<Entity>/<Tenant>/<Presentation>`. Caminhos project-relative.

- [ ] **Step 3: Verificação**

```bash
cd C:/project/wk/harness-model
grep -qE '^name: harness-reviewer' scaffold/.claude/agents/harness-reviewer.md && grep -qE '^tools: Read, Grep, Glob' scaffold/.claude/agents/harness-reviewer.md && echo "frontmatter OK (read-only)"
grep -qiE 'regra de depend|escopo|contract-first|CQRS' scaffold/.claude/agents/harness-reviewer.md && echo "regras OK"
grep -qi 'CLAUDE.md' scaffold/.claude/agents/harness-reviewer.md && echo "cita CLAUDE.md OK"
grep -c 'scaffold/' scaffold/.claude/agents/harness-reviewer.md   # 0
grep -rniE '<termos-da-origem>' scaffold/.claude/agents/harness-reviewer.md scaffold/checklists/harness-code-review.md || echo "sem vazamento"
mkdocs build --strict >/dev/null 2>&1 && echo "mkdocs PASS" || echo FAIL; rm -rf site
```
Expected: `frontmatter OK (read-only)`, `regras OK`, `cita CLAUDE.md OK`, `0`, `sem vazamento`, `mkdocs PASS`.

- [ ] **Step 4: Dogfood seca (no report)**

Dado um controller que lê `tenant` de um `@Query()` do usuário (em vez do claim) e um DTO que expõe `idPedido`: o reviewer deve sinalizar **Critical** (escopo do input → IDOR; id interno vazando), citar `arquivo:linha`, e **reprovar** — sem editar o código.

- [ ] **Step 5: Commit**

```bash
cd C:/project/wk/harness-model
git add scaffold/checklists/harness-code-review.md scaffold/.claude/agents/harness-reviewer.md
git commit -m "feat(agents): harness-reviewer (revisão de código contra as regras do harness)"
```

---

## Task 2: Agente `qa` + checklist-companion

**Files:**
- Create: `scaffold/checklists/qa-test-adequacy.md`
- Create: `scaffold/.claude/agents/qa.md`

- [ ] **Step 1: Escrever o checklist-companion**

`scaffold/checklists/qa-test-adequacy.md` — itens `[ ]`, focando o que é DISTINTO da mutação/hooks (aponta para `checklists/testing-strategy.md` para a pirâmide, não a reescreve):

```markdown
# Adequação de teste & rastreabilidade — checklist do QA

> A pirâmide e os runners vivem em `checklists/testing-strategy.md`. Aqui é o que o QA
> julga ALÉM do mecânico: o teste garante o que PRECISA ser garantido?

- [ ] **Rastreabilidade:** cada critério de aceite da fatia mapeia para ≥1 teste concreto (critério → arquivo:teste).
- [ ] **Cobertura por risco:** os caminhos perigosos/edge cases/invariantes de segurança da fatia têm teste (não só o caminho feliz).
- [ ] **Assere OUTCOME, não implementação:** o teste falharia se o comportamento quebrasse — não só se a estrutura interna mudasse; sem tautologia, sem asserção só de mock.
- [ ] **Camada certa:** unidade para regra de domínio; integração para borda de dado/contrato; e2e para o fluxo da presentation; eval só se houver etapa não-determinística.
- [ ] **Lado de leitura (se CQRS):** se há read model, a leitura é testada como cidadã de 1ª classe (consistência eventual via polling).
- [ ] **Distinto da mutação:** a mutação prova que o teste assere; o QA decide SE testamos as coisas certas (rastreabilidade/risco) — os dois são exigidos.
```

- [ ] **Step 2: Escrever o agente**

`scaffold/.claude/agents/qa.md`. Frontmatter EXATO:

```markdown
---
name: qa
description: Audita a ADEQUAÇÃO dos testes e a rastreabilidade critério→teste de uma fatia — cobertura por risco e qualidade do teste (assere outcome, camada certa). Distinto da mutação (mecânica) e dos hooks (rodam). Use em qualquer mudança de comportamento, junto do harness-reviewer.
tools: Read, Grep, Glob
---
```

Corpo (prosa) — pontos obrigatórios:
- Papel: você audita **se os testes garantem o que precisa ser garantido** — você **não roda** os testes (os hooks rodam) e **não é a mutação** (Stryker prova mecanicamente que o teste assere; você decide *o que* testar).
- **Input:** os critérios de aceite da fatia + a mudança + os testes existentes.
- Rode o checklist `checklists/qa-test-adequacy.md`; a pirâmide/runners estão em `checklists/testing-strategy.md` (cite, não reescreva).
- **Saída:** um **mapa de rastreabilidade** (critério → arquivo:teste) + um **veredito de adequação** + as **lacunas** (o que falta testar). Lacuna bloqueante → volta pro build.
- **Independência:** recuse "pronto" sem evidência rastreada; uma lacuna real é uma lacuna. O humano arbitra.
- Zero negócio; placeholders. Caminhos project-relative.

- [ ] **Step 3: Verificação**

```bash
cd C:/project/wk/harness-model
grep -qE '^name: qa' scaffold/.claude/agents/qa.md && echo "frontmatter OK"
grep -qiE 'rastreabilidade|adequa|mutação' scaffold/.claude/agents/qa.md && echo "conteúdo OK"
grep -qiE 'não roda|hooks rodam|testing-strategy' scaffold/.claude/agents/qa.md && echo "distinções OK"
grep -c 'scaffold/' scaffold/.claude/agents/qa.md   # 0
grep -rniE '<termos-da-origem>' scaffold/.claude/agents/qa.md scaffold/checklists/qa-test-adequacy.md || echo "sem vazamento"
mkdocs build --strict >/dev/null 2>&1 && echo "mkdocs PASS" || echo FAIL; rm -rf site
```
Expected: `frontmatter OK`, `conteúdo OK`, `distinções OK`, `0`, `sem vazamento`, `mkdocs PASS`.

- [ ] **Step 4: Dogfood seca (no report)**

Dada uma fatia com critério "rejeitar `<Entity>` com nome vazio" mas cujo único teste afirma `expect(repo.save).toHaveBeenCalled()`: o QA deve apontar **lacuna** (critério sem teste de outcome; asserção só de mock), mapear o que falta (um teste que assere a rejeição), e **reprovar a adequação**.

- [ ] **Step 5: Commit**

```bash
cd C:/project/wk/harness-model
git add scaffold/checklists/qa-test-adequacy.md scaffold/.claude/agents/qa.md
git commit -m "feat(agents): qa (adequação de teste + rastreabilidade)"
```

---

## Task 3: Ligar qa + harness-reviewer ao `new-slice` + promover na matriz/README

**Files:**
- Modify: `scaffold/.claude/skills/new-slice/SKILL.md`
- Modify: `scaffold/.claude/convocation-matrix.md`
- Modify: `scaffold/.claude/README.md`

- [ ] **Step 1: Wire no `new-slice` (passo 5 + degradação)**

No `scaffold/.claude/skills/new-slice/SKILL.md`:
- **Passo 5** — reescrever de "fase futura / anote pendente" para: invocar o agente **`qa`** (rastreabilidade + adequação) e o agente **`harness-reviewer`** (revisão de código); achado bloqueante de qualquer um → volta pro passo 4 (build).
- **Seção "Degradação graciosa (fase atual)"** — REMOVER `qa` e `harness-reviewer` da lista de inexistentes; atualizar a frase "existem de fato apenas: matriz + architect + new-module" para incluir `qa` e `harness-reviewer`. As demais (Produto, Dados, SRE/DevSecOps, UI/UX, Pesquisador) permanecem fase futura.

- [ ] **Step 2: Promover na matriz**

Em `scaffold/.claude/convocation-matrix.md`, a nota final (que dizia "só o Arquiteto existe de fato") passa a: **"Arquiteto, QA e harness-reviewer já existem; as demais (Produto, Dados, UI/UX, SRE/DevSecOps, Pesquisador) são fase futura."**

- [ ] **Step 3: Promover no README**

Em `scaffold/.claude/README.md`, mover **QA** e **harness-reviewer** da lista "fase futura" para "existe hoje".

- [ ] **Step 4: Verificação**

```bash
cd C:/project/wk/harness-model
grep -qiE 'invoque.*qa|agente .qa.|harness-reviewer' scaffold/.claude/skills/new-slice/SKILL.md && echo "wire OK"
grep -qi 'qa' scaffold/.claude/convocation-matrix.md && grep -qi 'harness-reviewer' scaffold/.claude/convocation-matrix.md && echo "matriz OK"
# qa + harness-reviewer NÃO devem mais aparecer como "fase futura" no new-slice:
grep -nE 'pendente.*(qa|harness-reviewer)|(qa|harness-reviewer).*fase futura' scaffold/.claude/skills/new-slice/SKILL.md && echo "AINDA pendente (corrigir)" || echo "promovidos OK"
mkdocs build --strict >/dev/null 2>&1 && echo "mkdocs raiz PASS" || echo FAIL; rm -rf site
(cd scaffold && mkdocs build --strict >/dev/null 2>&1 && echo "mkdocs scaffold PASS" || echo FAIL; rm -rf site)
```
Expected: `wire OK`, `matriz OK`, `promovidos OK`, ambos `mkdocs ... PASS`.

- [ ] **Step 5: Commit**

```bash
cd C:/project/wk/harness-model
git add scaffold/.claude/skills/new-slice/SKILL.md scaffold/.claude/convocation-matrix.md scaffold/.claude/README.md
git commit -m "feat(skills): liga qa + harness-reviewer ao new-slice (baseline existe)"
```

---

## Task 4: Dogfood ponta-a-ponta da fase + não-regressão

**Files:** (nenhum novo; é a validação da fase)

- [ ] **Step 1: Dogfood seca ponta-a-ponta (no report)**

Trace `new-slice` para uma fatia *"+1 campo `<x>` no use-case de `<Entity>` (muda comportamento), em protótipo interno"*:
Expected: triagem (pela matriz) acorda **QA + harness-reviewer** (baseline "muda comportamento"); **NÃO** acorda SRE (protótipo); passo 4 build via `new-module`/TDD; **passo 5 invoca `qa` (rastreabilidade do novo campo) + `harness-reviewer` (regra de dependência/validação)**; achados bloqueantes voltariam pro build; passo 6 DoD. Sem inventar negócio; sem lentes baseline marcadas como "pendentes" (elas existem agora).

- [ ] **Step 2: Não-regressão + coerência global da fase**

```bash
cd C:/project/wk/harness-model
mkdocs build --strict >/dev/null 2>&1 && echo "raiz PASS"; rm -rf site
(cd scaffold && mkdocs build --strict >/dev/null 2>&1 && echo "scaffold PASS"; rm -rf site)
ls scaffold/.claude/agents/   # esperado: architect.md, harness-reviewer.md, qa.md
grep -rniE '\b(<termos-da-origem>)\b' scaffold/.claude scaffold/checklists/harness-code-review.md scaffold/checklists/qa-test-adequacy.md || echo "fase sem vazamento"
```
Expected: `raiz PASS`, `scaffold PASS`, os 3 agents listados, `fase sem vazamento`.

- [ ] **Step 3: Commit (se houver ajuste) ou nota**

Se o dogfood revelar um ajuste, corrija e commit; senão, a fase está fechada nos commits das Tasks 1-3.

---

## Self-Review (preenchido)

**1. Cobertura da spec (Fase 2 / Seção 9 item 2 = baseline):**
- `harness-reviewer` (+ companion) → Task 1 ✓
- `qa` (+ companion) → Task 2 ✓
- Wire no `new-slice` passo 5 + promoção matriz/README → Task 3 ✓
- Dogfood + não-regressão → Task 4 ✓
- **Fora desta fase:** Dados/SRE/UI-UX/Pesquisador/Produto (F3); status/new-presentation/new-adr/init (F4); agnosticism-auditor (F5).

**2. Placeholder scan:** sem TBD/TODO; cada task tem conteúdo concreto + verificação executável.

**3. Consistência de nomes:** `qa`, `harness-reviewer` (agents); `checklists/qa-test-adequacy.md`, `checklists/harness-code-review.md`; usados idênticos entre tasks e coerentes com o que `new-slice`/matriz/README já citavam (eram "fase futura", agora "existe").

---

## Próximas fases (planos-irmãos)

- **Fase 3 — Condicionais:** `data`, `sre-devsecops`, `ui-ux` (∘ frontend-design/figma), `researcher` (∘ deep-research), `product`.
- **Fase 4 — Skills restantes:** `status`, `new-presentation`, `new-adr`, `init`.
- **Fase 5 — Manutenção:** `agnosticism-auditor` (no `.claude/` do repo do modelo).
