# Harness agents/skills — Backbone (Fase 1) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar o *backbone* da camada de agents/skills do harness-model — a matriz de convocação, o agente **Arquiteto**, e as skills **`new-module`** e **`new-slice`** (com triagem + retomada) — provados por dogfood sobre a feature-exemplo `widget`.

**Architecture:** Skills (markdown em `.claude/skills/<nome>/SKILL.md`) são *procedimentos* que o loop principal executa; role-agents (markdown em `.claude/agents/<nome>.md`) trazem *julgamento independente*; ambos para o app instanciado vivem em `scaffold/.claude/` (copiados com o scaffold). As skills **compõem** as `superpowers`; nada repete o `CLAUDE.md`/checklists. Sem agente-orquestrador: o maestro é o loop principal; estado em task-list/plano+git+current-state/hooks.

**Tech Stack:** Claude Code skills + subagents (markdown + frontmatter YAML). Sem código de runtime — os artefatos são prosa/config. Fonte da verdade: a spec `docs/superpowers/specs/2026-06-27-harness-agents-skills-design.md`.

---

## Como se "testa" um artefato de prosa/config (lê antes das tasks)

Não há unit test tradicional. A verificação de **cada** task é a combinação:

1. **Estrutural** — `grep` confirma frontmatter (`name`/`description`) e as seções obrigatórias.
2. **Anti-vazamento** — `git grep -niE '<termos-da-origem>|nota fiscal' <arquivos>` retorna **vazio** (placeholders `<App>/<Feature>/<Entity>/<Tenant>/<Presentation>` apenas; `author`→"thor" é falso-positivo conhecido — filtre).
3. **Dogfood** — invocar o artefato sobre a feature-exemplo `widget` numa sessão de rascunho e conferir o comportamento descrito em "Expected".
4. **Não-regressão de docs** — `mkdocs build --strict` (raiz + scaffold) continua **PASS** (os arquivos novos ficam fora de `docs_dir`, então não devem afetar — confirme).

> **Premissa explícita (decisão do plano):** os *checklist-companion* dos agents ficam em
> `scaffold/checklists/` (copiados junto com os agents). Os checklists de metodologia já
> existentes em `checklists/` (nível do modelo) permanecem; consolidá-los/copiá-los na
> instância é problema da skill `init` (Fase 4), **fora desta fase**.

---

## File Structure (Fase 1)

| Arquivo | Responsabilidade |
| --- | --- |
| `scaffold/.claude/convocation-matrix.md` | A tabela de regras gatilho→lente + modificadores que a triagem lê. |
| `scaffold/.claude/agents/architect.md` | Subagent Arquiteto: decisão de forma/NFR → ADR. |
| `scaffold/checklists/architecture-form-decision.md` | Checklist-companion do Arquiteto (Passo-0: presentations, síncrono×CQRS, extrair-serviço?, orçamentos NFR). |
| `scaffold/.claude/skills/new-module/SKILL.md` | Skill que materializa as 4 camadas a partir dos READMEs de camada. |
| `scaffold/.claude/skills/new-slice/SKILL.md` | Skill espinha: retomada → triagem → lentes → build → QA/reviewer → DoD. |
| `scaffold/.claude/README.md` | Explica o que é `.claude/` no scaffold (copiado), e que agents baseline (QA/reviewer) chegam na Fase 2. |

---

## Task 1: Matriz de convocação (config)

**Files:**
- Create: `scaffold/.claude/convocation-matrix.md`

- [ ] **Step 1: Criar o arquivo da matriz**

Conteúdo: cabeçalho curto + a tabela "gatilho → lente" + os modificadores estágio×risco + a regra de ouro, **copiados da Seção 5 da spec** (fonte única). Estrutura mínima obrigatória:

```markdown
# Matriz de convocação

> Lida pela TRIAGEM do `new-slice`. A triagem propõe o MÍNIMO que cobre o risco;
> o humano confirma/ajusta. Sub-convocar é o default.

## Gatilho → lente
| A fatia… | Acorda |
| --- | --- |
| define valor/escopo novo ou ambíguo | Produto |
| muda forma (presentations, síncrono↔CQRS, extrair serviço) ou NFR ambíguo | Arquiteto |
| toca schema/agregado, migração, read-model, índice, PII | Dados |
| toca uma presentation com UI | UI/UX |
| muda comportamento (qualquer código de regra) | QA + harness-reviewer (baseline) |
| toca infra/deploy | SRE/DevSecOps |
| decisão depende de evidência externa | Pesquisador |

## Modificadores estágio × risco
- Protótipo/interno → SRE off; Produto/Arquiteto em modo leve (sem ADR formal).
- Produção/cliente-facing → SRE on em mudança de infra; QA mais fundo.
- Risco alto (segurança/dado sensível/irreversível) → eleva Dados/SRE e FORÇA ADR.

## Dose (exemplos)
| Fatia | Lentes |
| --- | --- |
| rename/texto, sem comportamento | nenhuma → build + DoD |
| +1 campo num form web | UI/UX + QA + reviewer |
| novo agregado + read-model em produção | Produto + Arquiteto + Dados + QA + SRE + reviewer + ADR |
```

> Nota: lista todas as 7 lentes mesmo que só Arquiteto exista na Fase 1 — as demais entram nas Fases 2-3 e a triagem já as conhecerá.

- [ ] **Step 2: Verificação estrutural + anti-vazamento**

Run:
```bash
cd C:/project/wk/harness-model
grep -qE '## Gatilho → lente' scaffold/.claude/convocation-matrix.md && grep -qE '## Modificadores' scaffold/.claude/convocation-matrix.md && echo "estrutura OK"
git grep -niE '<termos-da-origem>' -- scaffold/.claude/convocation-matrix.md || echo "sem vazamento"
```
Expected: `estrutura OK` e `sem vazamento`.

- [ ] **Step 3: Commit**

```bash
git add scaffold/.claude/convocation-matrix.md
git commit -m "feat(claude): matriz de convocação (config da triagem)"
```

---

## Task 2: Agente Arquiteto + checklist-companion

**Files:**
- Create: `scaffold/checklists/architecture-form-decision.md`
- Create: `scaffold/.claude/agents/architect.md`

- [ ] **Step 1: Escrever o checklist-companion (Passo-0)**

`scaffold/checklists/architecture-form-decision.md` — itens acionáveis `[ ]` derivados da postura do modelo (CLAUDE.md/architecture.md), princípio-primeiro:

```markdown
# Decisão de forma & NFR (Passo-0) — checklist do Arquiteto

- [ ] Quais **presentations** servem esta capacidade? (web/mobile/CLI/API pública/integração) — cada uma é um adapter de borda.
- [ ] **Síncrono por default.** Há um NFR concreto (assimetria r/w, escala de leitura, picos, desacoplamento, fan-out) que justifique CQRS/assíncrono? Se não → escrita direta.
- [ ] Se CQRS: o custo (broker, idempotência, read-your-writes eventual) é aceitável e está registrado em ADR?
- [ ] **Monólito modular por default.** Há razão concreta (escala/isolamento/ownership/ciclo de release) para extrair um serviço? Se não → módulo no mesmo deploy.
- [ ] Orçamentos NFR explícitos: latência alvo, escala, consistência, disponibilidade.
- [ ] A decisão virou **ADR** (formato Nygard) quando afeta forma/estrutura?
```

- [ ] **Step 2: Escrever o agente Arquiteto**

`scaffold/.claude/agents/architect.md` com frontmatter + corpo. Frontmatter:

```markdown
---
name: architect
description: Decide a FORMA e os NFRs de uma fatia/capacidade — presentations, síncrono×CQRS, extrair-serviço, orçamentos — e produz um ADR. Use quando a mudança afeta forma/estrutura ou o NFR é ambíguo.
tools: Read, Grep, Glob, Write, Edit
---
```

Corpo (system prompt) — pontos obrigatórios:
- Papel: você é o Arquiteto. Você **possui a decisão de forma/NFR**; não escreve o código de negócio.
- **Interrogue o humano pelos NFRs** (não invente): rode o checklist `scaffold/checklists/architecture-form-decision.md`.
- Postura canônica (cite, não reinvente): síncrono por default; CQRS/assíncrono só sob NFR; múltiplas presentations sobre um core; monólito modular por default; extrair serviço só com razão concreta.
- **Output:** um **ADR** (formato Nygard) com contexto + decisão + consequência + a tensão registrada se houver. Use a skill `new-adr` se disponível, senão crie `docs/adr/NNNN-*.md`.
- **Independência:** empurre contra gold-plating e complexidade prematura; se discordar do Produto, **exponha a tensão** — não negocie consenso; o humano arbitra.
- Zero conhecimento de negócio; placeholders `<App>/<Feature>/<Entity>/<Tenant>/<Presentation>`.

- [ ] **Step 3: Verificação estrutural + anti-vazamento**

Run:
```bash
cd C:/project/wk/harness-model
grep -qE '^name: architect' scaffold/.claude/agents/architect.md && grep -qE '^description:' scaffold/.claude/agents/architect.md && echo "frontmatter OK"
git grep -niE '<termos-da-origem>' -- scaffold/.claude/agents/architect.md scaffold/checklists/architecture-form-decision.md || echo "sem vazamento"
```
Expected: `frontmatter OK` e `sem vazamento`.

- [ ] **Step 4: Dogfood**

Numa sessão de rascunho, invoque o agente `architect` com: *"Preciso adicionar consulta de `<Entity>` que é lida 100× mais do que escrita, num serviço em produção. Que forma?"*
Expected: o agente **faz perguntas de NFR** (escala de leitura? consistência tolerável?), recomenda avaliar **read model/CQRS** *com* o custo explícito, e **produz um rascunho de ADR** — não pula direto pra implementação nem inventa domínio.

- [ ] **Step 5: Commit**

```bash
git add scaffold/checklists/architecture-form-decision.md scaffold/.claude/agents/architect.md
git commit -m "feat(agents): arquiteto (decisão de forma/NFR → ADR) + checklist Passo-0"
```

---

## Task 3: Skill `new-module`

**Files:**
- Create: `scaffold/.claude/skills/new-module/SKILL.md`

- [ ] **Step 1: Escrever a skill**

Frontmatter:
```markdown
---
name: new-module
description: Materializa um bounded context nas 4 camadas (domain→application→infrastructure→presentation) a partir dos READMEs de camada do scaffold, ligando o composition root e gerando contrato + esqueleto de teste. Use ao criar um módulo/feature novo.
---
```

Corpo — procedimento obrigatório (princípio-primeiro; compõe TDD; NÃO repete os READMEs, os LÊ):
1. **Pré:** receber o nome do bounded context (substitui `<feature>`) e a `<Entity>`.
2. **Ler os 4 READMEs de camada** em `apps/api/src/modules/feature/{domain,application,infrastructure,presentation}/README.md` — eles contêm os blocos de código a materializar.
3. **Escolher o write-path** (síncrono default vs CQRS-lite) — se a decisão de forma exigir, **convocar Dados** (Fase 3) e/ou pedir a decisão do `architect`.
4. **Materializar as folhas** seguindo os READMEs, renomeando `<feature>`→nome real e `<entity>`/`<name>`→`<Entity>` real: entidade/VO no `domain`, use-case + port no `application`, adapter no `infrastructure`, controller + DTO no `presentation`, e o contrato em `packages/contracts`.
5. **Ligar o composition root** (`<feature>.module.ts`): `{ provide: Port, useClass: Adapter }`.
6. **TDD:** para cada use-case, o teste-que-falha **antes** (skill `superpowers:test-driven-development`).
7. **Marcar a stack:** o conteúdo gerado **stampa a stack-exemplo (NestJS)** — anote isso; outra stack adapta o mesmo procedimento.
8. **Saída:** lista de arquivos criados + onde o composition root foi ligado.

- [ ] **Step 2: Verificação estrutural + anti-vazamento**

Run:
```bash
cd C:/project/wk/harness-model
grep -qE '^name: new-module' scaffold/.claude/skills/new-module/SKILL.md && echo "frontmatter OK"
grep -qiE 'READMEs de camada|domain.*application.*infrastructure.*presentation|composition root' scaffold/.claude/skills/new-module/SKILL.md && echo "passos-chave OK"
git grep -niE '<termos-da-origem>' -- scaffold/.claude/skills/new-module/SKILL.md || echo "sem vazamento"
```
Expected: `frontmatter OK`, `passos-chave OK`, `sem vazamento`.

- [ ] **Step 3: Dogfood**

Numa sessão de rascunho na raiz do modelo, invoque `new-module` para um módulo `catalog` com `<Entity>`=`widget`.
Expected: a skill **lê os 4 READMEs**, propõe os arquivos das 4 camadas (`widget.entity.ts`, `<name>.use-case.ts`, port, adapter, controller, DTO, contrato), liga o composition root, e **escreve o teste antes** — coerente com os READMEs, sem inventar domínio. (Não precisa compilar — o scaffold é espinha; o critério é "gerou as folhas certas seguindo os READMEs".)

- [ ] **Step 4: Commit**

```bash
git add scaffold/.claude/skills/new-module/SKILL.md
git commit -m "feat(skills): new-module materializa as 4 camadas a partir dos READMEs"
```

---

## Task 4: Skill `new-slice` (espinha, com triagem + retomada)

**Files:**
- Create: `scaffold/.claude/skills/new-slice/SKILL.md`

- [ ] **Step 1: Escrever a skill**

Frontmatter:
```markdown
---
name: new-slice
description: Orquestra uma fatia vertical ponta a ponta — retomada → triagem (propõe lentes) → lentes convocadas → build → QA/reviewer → DoD → ADR/current-state. Use para qualquer incremento de comportamento.
---
```

Corpo — o procedimento da Seção 4 da spec (compõe `brainstorming`/`writing-plans`/`subagent-driven-development`/`verification-before-completion`/TDD; NÃO os reinventa):

- **0. RETOMADA (idempotente):** detectar slice em voo — procurar plano com caixas abertas em `docs/superpowers/plans/`, branch de slice, ou `current-state` "em andamento". Se houver → **retomar de onde parou** (o plano é a fonte de verdade do progresso). Senão → começar novo.
- **1. TRIAGEM:** ler `scaffold/.claude/convocation-matrix.md`; classificar a mudança (tipo × estágio × risco); **PROPOR** as lentes + o porquê; **o humano confirma/ajusta**. Sub-convocar é o default.
- **2. Produto** (se convocado): cortar a fatia + critérios de aceite.
- **3. Arquiteto** (se convocado): invocar o agente `architect` → ADR. [Pesquisador se a decisão precisa de evidência.]
- **4. Build:** invocar `new-module`/TDD. [Dados se migração/agregado; UI/UX se tela — Fase 3.]
- **5. QA + harness-reviewer** (Fase 2): rastreabilidade + revisão de código.
- **6. DoD gate:** `superpowers:verification-before-completion` → rodar os gates e colar evidência → atualizar ADR + `docs/how-to/current-state.md`.
- **Conflito:** objeção bloqueante volta pro build; tensão entre lentes → humano arbitra e a decisão fica registrada; override do humano fica registrado.
- **Degradação graciosa:** lentes da Fase 2-3 ainda não existem → a skill anota "lente X pendente (fase futura)" e segue, sem travar.

- [ ] **Step 2: Verificação estrutural + anti-vazamento**

Run:
```bash
cd C:/project/wk/harness-model
grep -qE '^name: new-slice' scaffold/.claude/skills/new-slice/SKILL.md && echo "frontmatter OK"
grep -qiE 'RETOMADA|TRIAGEM|convocation-matrix|verification-before-completion|current-state' scaffold/.claude/skills/new-slice/SKILL.md && echo "passos-chave OK"
git grep -niE '<termos-da-origem>' -- scaffold/.claude/skills/new-slice/SKILL.md || echo "sem vazamento"
```
Expected: `frontmatter OK`, `passos-chave OK`, `sem vazamento`.

- [ ] **Step 3: Dogfood — fatia trivial**

Invoque `new-slice` com *"corrigir um texto de label, sem mudança de comportamento"*.
Expected: a triagem **propõe "nenhuma lente extra"** e vai direto pro build + DoD.

- [ ] **Step 4: Dogfood — fatia que muda forma**

Invoque `new-slice` com *"adicionar uma nova capacidade de `<Entity>` lida em altíssimo volume num serviço em produção"*.
Expected: a triagem **propõe Arquiteto (forma/NFR) + Dados + QA + reviewer + SRE** e marca **ADR obrigatório**; convoca o agente `architect`; as lentes ainda inexistentes (Fase 2-3) são anotadas como "pendentes", sem travar.

- [ ] **Step 5: Commit**

```bash
git add scaffold/.claude/skills/new-slice/SKILL.md
git commit -m "feat(skills): new-slice (espinha) com triagem + retomada idempotente"
```

---

## Task 5: README do `.claude/` + dogfood ponta-a-ponta + não-regressão

**Files:**
- Create: `scaffold/.claude/README.md`
- Modify: `docs/how-to/current-state.template.md` (anotar a camada de agents/skills como capacidade)

- [ ] **Step 1: Escrever `scaffold/.claude/README.md`**

Conteúdo: o que é `scaffold/.claude/` (copiado pro projeto na instanciação); que contém `skills/` (procedimentos), `agents/` (julgamento) e `convocation-matrix.md` (regras da triagem); que os agents **baseline** (QA, harness-reviewer) e os **condicionais** (Dados/SRE/UI-UX/Pesquisador/Produto) chegam nas Fases 2-3; e que o maestro é o **loop principal**, não um agente. Zero negócio.

- [ ] **Step 2: Anotar a capacidade no template de current-state**

Em `docs/how-to/current-state.template.md`, adicionar uma linha no mapa de capacidades:
`| Camada agents/skills (new-slice/new-module/arquiteto/matriz) | <ativa na Fase 1> | — |`

- [ ] **Step 3: Dogfood ponta-a-ponta (o teste da fase)**

Numa sessão de rascunho, rode `new-slice` para *"criar o módulo `catalog` (`<Entity>`=widget) com escrita direta síncrona"*:
Expected, em ordem: (a) retomada não acha slice em voo → novo; (b) triagem propõe **Arquiteto** (forma) + QA/reviewer (anotados pendentes da Fase 2); (c) `architect` confirma "síncrono direto, sem CQRS" e gera ADR; (d) `new-module` materializa as 4 camadas do `catalog` a partir dos READMEs; (e) DoD gate anota os gates a rodar e atualiza current-state. **Sem inventar negócio; sem travar nas lentes ausentes.**

- [ ] **Step 4: Não-regressão de docs + anti-vazamento global da fase**

Run:
```bash
cd C:/project/wk/harness-model
mkdocs build --strict >/dev/null 2>&1 && echo "mkdocs raiz PASS" || echo "FAIL"; rm -rf site
(cd scaffold && mkdocs build --strict >/dev/null 2>&1 && echo "mkdocs scaffold PASS" || echo FAIL; rm -rf site)
git grep -niE '\b(<termos-da-origem>)\b' -- scaffold/.claude scaffold/checklists/architecture-form-decision.md || echo "fase sem vazamento"
```
Expected: `mkdocs raiz PASS`, `mkdocs scaffold PASS`, `fase sem vazamento`.

- [ ] **Step 5: Commit**

```bash
git add scaffold/.claude/README.md docs/how-to/current-state.template.md
git commit -m "docs(claude): README do scaffold/.claude + capacidade no current-state"
```

---

## Self-Review (preenchido)

**1. Cobertura da spec (Fase 1 / Seção 9 item 1 = backbone):**
- Matriz de convocação → Task 1 ✓
- Arquiteto (+ companion) → Task 2 ✓
- `new-module` → Task 3 ✓
- `new-slice` (triagem + retomada) → Task 4 ✓
- Orquestração sem agente-orquestrador / estado repo-resident → refletido no corpo do `new-slice` (passos 0 e 6) + README (Task 5) ✓
- Dogfood sobre `widget` (validação, spec §8) → Tasks 2/3/4/5 ✓
- **Fora desta fase (planos-irmãos):** QA + harness-reviewer (Fase 2); Dados/SRE/UI-UX/Pesquisador/Produto (Fase 3); `status`/`new-presentation`/`new-adr`/`init` (Fase 4); `agnosticism-auditor` (Fase 5). A triagem do `new-slice` já **referencia** essas lentes e **degrada graciosamente** enquanto não existem.

**2. Placeholder scan:** sem TBD/TODO; cada task tem conteúdo concreto + verificação executável.

**3. Consistência de nomes:** `architect` (agente), `new-module`/`new-slice` (skills), `convocation-matrix.md`, `<feature>`/`<Entity>` (placeholders) — usados de forma idêntica entre tasks.

---

## Próximas fases (planos-irmãos — escrever após dogfood do backbone)

- **Fase 2 — Baseline:** agents `qa` + `harness-reviewer` (+ wiring no passo 5 do `new-slice`).
- **Fase 3 — Condicionais:** `data`, `sre-devsecops`, `ui-ux` (∘ frontend-design/figma), `researcher` (∘ deep-research), `product`.
- **Fase 4 — Skills restantes:** `status` (read-only), `new-presentation`, `new-adr`, `init` (no `.claude/` do repo do modelo; decide a consolidação de `checklists/` na instância).
- **Fase 5 — Manutenção:** `agnosticism-auditor` (no `.claude/` do repo do modelo).
