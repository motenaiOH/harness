# Harness agents/skills — Skills restantes (Fase 4) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`).

**Goal:** Entregar as 4 skills restantes — `new-adr`, `new-presentation`, `status` (em `scaffold/.claude/skills/`, copiadas) e `init` (em `.claude/skills/` do **repo do modelo**, que instancia o modelo) — e promovê-las para "existe hoje".

**Architecture:** Skills = `.claude/skills/<nome>/SKILL.md` (frontmatter `name`/`description` + corpo procedimento). `new-adr`/`new-presentation`/`status` são **por-projeto** (copiadas com o scaffold). `init` é **do modelo** (roda a partir do repo do modelo para criar um projeto novo; não é copiada). Skills **compõem** as superpowers e referenciam artefatos **project-relative**.

**Tech Stack:** Claude Code skills (markdown). Fonte: spec §4 + as fases 1-3 já em `main`.

---

## Como se "testa" (igual às fases anteriores)
Estrutural (frontmatter/seções) + anti-vazamento (`grep` whole-word) + project-relative (`grep -c 'scaffold/'`=0 — **exceto `init`**, que VIVE no repo do modelo e LEGITIMAMENTE manipula `scaffold/`, pois é a skill que o copia) + dogfood seca + mkdocs `--strict` PASS.

> **`init` é a exceção da regra project-relative:** ela roda no repo do MODELO e seu trabalho É copiar `scaffold/*` + a metodologia para um projeto novo. Logo ela MENCIONA `scaffold/`, `CLAUDE.md` (raiz do modelo), `checklists/` etc. como ORIGENS. Isso é correto.

---

## File Structure (Fase 4)

| Arquivo | Local | Responsabilidade |
| --- | --- | --- |
| `scaffold/.claude/skills/new-adr/SKILL.md` | copiada | Próximo ADR numerado do template + nav do mkdocs. |
| `scaffold/.claude/skills/new-presentation/SKILL.md` | copiada | Novo adapter de borda sobre use-cases existentes. |
| `scaffold/.claude/skills/status/SKILL.md` | copiada | Read-only: onde paramos / próximo passo / objeção aberta. |
| `.claude/skills/init/SKILL.md` | **repo do modelo** | Bootstrap de um projeto novo a partir do modelo. |
| `scaffold/.claude/skills/new-slice/SKILL.md` + `.claude/README.md` (mod) | — | Promover as skills; mencionar new-presentation no build. |

---

## Task 1: Skill `new-adr`

**Files:** Create `scaffold/.claude/skills/new-adr/SKILL.md`.

- [ ] **Step 1:** Frontmatter:
```markdown
---
name: new-adr
description: Cria o próximo ADR numerado a partir do template e o adiciona ao nav do mkdocs. Use para registrar uma decisão arquitetural (forma/NFR, dado, deploy, etc.).
---
```
Corpo — procedimento (compõe `checklists/new-adr.md`; NÃO reescreve o formato):
1. Descobrir o **próximo número** sequencial varrendo `docs/adr/` (maior `NNNN` + 1, 4 dígitos).
2. Copiar `docs/adr/0000-adr-template.md` → `docs/adr/NNNN-<slug>.md` (slug curto kebab do título).
3. Preencher no formato **Nygard**: contexto + decisão (voz ativa) + consequência; Status (Proposto/Aceito) + data.
4. Adicionar a página ao **nav do mkdocs** (`mkdocs.yml`, seção ADRs) para o gate `mkdocs build --strict` não quebrar.
5. **Imutabilidade:** um ADR aceito **nunca** é editado — para mudar, crie um ADR substituto que marca o anterior como "Substituído".
6. Rode `checklists/new-adr.md`.

- [ ] **Step 2: Verificação:**
```bash
cd C:/project/wk/harness-model
grep -qE '^name: new-adr' scaffold/.claude/skills/new-adr/SKILL.md && echo "frontmatter OK"
grep -qiE 'próximo número|0000-adr-template|nav do mkdocs|imutab|Nygard' scaffold/.claude/skills/new-adr/SKILL.md && echo "passos OK"
grep -c 'scaffold/' scaffold/.claude/skills/new-adr/SKILL.md   # 0
grep -rniE 'mik|thor|cfop|payable|titulo|tesouraria|faturamento' scaffold/.claude/skills/new-adr/SKILL.md || echo "sem vazamento"
mkdocs build --strict >/dev/null 2>&1 && echo "mkdocs PASS" || echo FAIL; rm -rf site
```
Expected: `frontmatter OK`, `passos OK`, `0`, `sem vazamento`, `mkdocs PASS`.
- [ ] **Step 3: Dogfood seca (report):** "registrar decisão de adotar CQRS no contexto X" → a skill acha o próximo NNNN, copia o template, preenche Nygard, adiciona ao nav, e lembra a imutabilidade.
- [ ] **Step 4: Commit** `feat(skills): new-adr (próximo ADR numerado + nav)`.

---

## Task 2: Skill `new-presentation`

**Files:** Create `scaffold/.claude/skills/new-presentation/SKILL.md`.

- [ ] **Step 1:** Frontmatter:
```markdown
---
name: new-presentation
description: Adiciona uma nova presentation (adapter de borda — CLI, API pública, gRPC, GraphQL, consumidor de fila, app web/mobile) sobre use-cases EXISTENTES, sem tocar domain/application. Use ao expor uma capacidade por um novo canal.
---
```
Corpo — procedimento (compõe `superpowers:test-driven-development`):
1. **Pré:** o tipo de presentation (HTTP/CLI/gRPC/GraphQL/fila/web/mobile) e **quais use-cases** ela expõe.
2. **Princípio:** uma presentation é um **adapter de borda fino** que traduz protocolo ⇄ `useCase.execute(...)`; **não** contém regra de negócio; o escopo vem do **contexto autenticado**, nunca do input. Leia `apps/api/src/modules/<feature>/presentation/README.md` (edge adapters; HTTP é um exemplo).
3. **Materializar o adapter** sob a presentation alvo: ou uma subpasta na presentation do módulo (`presentation/http|cli|graphql/`), ou uma nova app irmã (`apps/<presentation>`) — cada uma resolve seu próprio trust boundary (ex.: web = proxy same-origin; CLI/API = client-credentials/API key). Reusa os **mesmos use-cases** via composition root.
4. **Se a presentation tem UI** → convoque o agente `ui-ux`. **Se é um novo canal significativo** (decisão de forma) → convoque o `architect` (ADR via `new-adr`).
5. **Contrato:** reusa os DTOs de `packages/contracts`; adicione DTOs específicos da borda se necessário (contract-first, antes).
6. **TDD** (compõe a skill) + e2e na fronteira da nova presentation.
7. **Marca de stack:** o adapter gerado estampa a stack-exemplo; outra stack adapta o mesmo procedimento.

- [ ] **Step 2: Verificação:**
```bash
cd C:/project/wk/harness-model
grep -qE '^name: new-presentation' scaffold/.claude/skills/new-presentation/SKILL.md && echo "frontmatter OK"
grep -qiE 'adapter de borda|use-cases existentes|escopo.*autenticado|ui-ux|test-driven' scaffold/.claude/skills/new-presentation/SKILL.md && echo "passos OK"
grep -c 'scaffold/' scaffold/.claude/skills/new-presentation/SKILL.md   # 0
grep -rniE 'mik|thor|cfop|payable|titulo|tesouraria|faturamento' scaffold/.claude/skills/new-presentation/SKILL.md || echo "sem vazamento"
mkdocs build --strict >/dev/null 2>&1 && echo "mkdocs PASS" || echo FAIL; rm -rf site
```
Expected: `frontmatter OK`, `passos OK`, `0`, `sem vazamento`, `mkdocs PASS`.
- [ ] **Step 3: Dogfood seca (report):** "expor o use-case de `<Entity>` por uma API pública" → a skill cria um adapter HTTP fino (auth por API key), reusa o use-case e o contrato, faz TDD + e2e da borda, **sem** tocar domain/application; convoca `architect` se for um canal novo.
- [ ] **Step 4: Commit** `feat(skills): new-presentation (novo adapter de borda sobre use-cases)`.

---

## Task 3: Skill `status`

**Files:** Create `scaffold/.claude/skills/status/SKILL.md`.

- [ ] **Step 1:** Frontmatter:
```markdown
---
name: status
description: Read-only — responde "onde paramos / qual o próximo passo / há objeção aberta?" lendo current-state, planos abertos e git, sem entrar no new-slice nem mudar nada. Use para retomar contexto.
---
```
Corpo — procedimento (read-only; NÃO altera nada):
1. Ler `docs/how-to/current-state.md` (o snapshot repo-resident de capacidades + follow-ups).
2. Varrer `docs/superpowers/plans/` por **planos com caixas `[ ]` abertas** (fatia em voo) e identificar o primeiro passo aberto.
3. Checar o **git**: branch atual, últimos commits, mudanças não commitadas.
4. **Reportar:** onde estamos (capacidades), a fatia em voo (se houver) e **o próximo passo**, e qualquer **objeção/decisão aberta** registrada. Nada é alterado — é só leitura.
5. Esta skill é a resposta barata para "onde paramos?" — não substitui o passo 0 (retomada) do `new-slice`, que de fato **continua** a fatia.

- [ ] **Step 2: Verificação:**
```bash
cd C:/project/wk/harness-model
grep -qE '^name: status' scaffold/.claude/skills/status/SKILL.md && echo "frontmatter OK"
grep -qiE 'read-only|current-state|caixas|próximo passo|não altera' scaffold/.claude/skills/status/SKILL.md && echo "passos OK"
grep -c 'scaffold/' scaffold/.claude/skills/status/SKILL.md   # 0
grep -rniE 'mik|thor|cfop|payable|titulo|tesouraria|faturamento' scaffold/.claude/skills/status/SKILL.md || echo "sem vazamento"
mkdocs build --strict >/dev/null 2>&1 && echo "mkdocs PASS" || echo FAIL; rm -rf site
```
Expected: `frontmatter OK`, `passos OK`, `0`, `sem vazamento`, `mkdocs PASS`.
- [ ] **Step 3: Dogfood seca (report):** numa sessão nova, `status` lê current-state + um plano com 2 caixas abertas + git → reporta "fatia X em voo, próximo passo = caixa N, sem objeção aberta", sem tocar em nada.
- [ ] **Step 4: Commit** `feat(skills): status (read-only — onde paramos)`.

---

## Task 4: Skill `init` (no repo do MODELO)

**Files:** Create `.claude/skills/init/SKILL.md` (cria o diretório `.claude/skills/init/` na RAIZ do repo do modelo — **não** em `scaffold/`).

- [ ] **Step 1:** Frontmatter:
```markdown
---
name: init
description: Bootstrap de um projeto novo a partir deste modelo — copia o scaffold + a metodologia, renomeia escopo/módulo, roda o Passo-0 (forma/NFR) e purga proveniência. Roda a partir do repo do modelo. NÃO é copiada para o projeto.
---
```
Corpo — procedimento. **Esta skill vive no repo do modelo e copia para um projeto novo** — por isso ela manipula `scaffold/` (origem) legitimamente:
1. **Pré:** o **diretório do projeto novo**; o **escopo** da org (ex.: `@suaorg`); o **nome do primeiro bounded context** e a **`<Entity>`**.
2. **Copiar a espinha:** todo o conteúdo de `scaffold/*` (do modelo) → **raiz do projeto novo** (configs, `.claude/` [agents+skills+matriz], `apps/`, `packages/`, `docs/` seed, `checklists/` companions, compose, CI, etc.).
3. **Copiar a metodologia** (mora na RAIZ do modelo, não em `scaffold/`) → raiz do projeto: `CLAUDE.md` e `checklists/*` (os de metodologia: definition-of-done, new-vertical-slice, new-module, new-adr, testing-strategy, security-defense-in-depth, aprendizados) — **mesclando** com os companions já vindos de `scaffold/checklists/`. **NÃO** copie o `docs/` do modelo (é sobre o modelo) — o projeto usa o `docs/` seed do scaffold; **NÃO** copie o `.claude/` do modelo (init/agnosticism-auditor são manutenção do modelo).
4. **Renomear escopo:** `@app/*` → `@suaorg/*` em `package.json`/`pnpm-workspace.yaml`/`tsconfig`/imports.
5. **Renomear o módulo:** `feature/` → o primeiro bounded context; `<entity>`/`widget`/`<name>` → a `<Entity>` real.
6. **Passo-0 (forma/NFR):** invoque o agente `architect` para as decisões de forma (quais presentations; síncrono vs CQRS; extrair-serviço?) → **primeiro ADR** (via `new-adr`).
7. **Purgar proveniência:** remova comentários de proveniência ("Replace the @app/* scope…", cabeçalhos SPINE) que não fazem sentido no projeto.
8. **Guard anti-vazamento:** rode o grep de `checklists/aprendizados.md` (seção "Guard anti-vazamento") para confirmar que nenhum termo do modelo/origem ficou; e que nenhum placeholder `<App>/<Feature>/<Entity>` ficou por renomear onde deveria ser real.
9. **Validar:** `pnpm install` (instala husky via `prepare`), `pnpm --filter @suaorg/contracts build`, `mkdocs build --strict`, e os gates do DoD.
10. **Saída:** um projeto bootstrapado com o harness completo (espinha + metodologia + agents/skills); o `current-state.md` inicial preenchido.

- [ ] **Step 2: Verificação** (init VIVE no modelo — `scaffold/` é esperado no texto):
```bash
cd C:/project/wk/harness-model
grep -qE '^name: init' .claude/skills/init/SKILL.md && echo "frontmatter OK"
grep -qiE 'copiar.*scaffold|CLAUDE.md|checklists|Passo-0|architect|proveniência|guard anti-vazamento' .claude/skills/init/SKILL.md && echo "passos OK"
grep -qiE 'NÃO.*copie.*docs do modelo|NÃO.*\.claude do modelo|init/agnosticism' .claude/skills/init/SKILL.md && echo "exclusões OK"
grep -rniE 'mik|thor|cfop|payable|titulo|tesouraria|faturamento' .claude/skills/init/SKILL.md || echo "sem vazamento"
mkdocs build --strict >/dev/null 2>&1 && echo "mkdocs PASS" || echo FAIL; rm -rf site
```
Expected: `frontmatter OK`, `passos OK`, `exclusões OK`, `sem vazamento`, `mkdocs PASS`.
- [ ] **Step 3: Dogfood seca (report):** `init` para um projeto `acme` (`@acme`, módulo `billing`, `<Entity>`=invoice) → copia scaffold + CLAUDE.md + checklists, renomeia `@app`→`@acme` e `feature`→`billing`/`widget`→`invoice`, roda o Passo-0 (architect→ADR), purga proveniência, roda o guard, valida os gates. Resultado: projeto `acme` com o harness completo. (Trace; não execute a cópia real.)
- [ ] **Step 4: Commit** `feat(skills): init (bootstrap de projeto a partir do modelo)`.

---

## Task 5: Wiring — promover as skills + mencionar new-presentation

**Files:** Modify `scaffold/.claude/README.md`, `scaffold/.claude/skills/new-slice/SKILL.md`.

- [ ] **Step 1: `.claude/README.md`** — mover `status`/`new-presentation`/`new-adr` de "fase futura" para "existe hoje" (skills). Mencionar que **`init` existe no repo do modelo** (não no `.claude/` copiado). Após isso, **nenhuma skill por-projeto fica pendente**; só o `agnosticism-auditor` (F5, manutenção do modelo) é fase futura.
- [ ] **Step 2: `new-slice/SKILL.md`** — no passo 4 (Build), mencionar que para **adicionar uma presentation** usa-se a skill `new-presentation` (ao lado de `new-module` para um módulo). Na seção "Degradação graciosa (princípio)", remover `status`/`new-presentation`/`new-adr` da lista do que "poderia faltar" (existem); manter o **princípio** geral.
- [ ] **Step 3: Verificação:**
```bash
cd C:/project/wk/harness-model
grep -qi 'new-presentation' scaffold/.claude/skills/new-slice/SKILL.md && echo "new-presentation no build OK"
grep -niE '(status|new-presentation|new-adr)[^\n]*(pendente|fase futura)|(pendente|fase futura)[^\n]*(status|new-presentation|new-adr)' scaffold/.claude/skills/new-slice/SKILL.md && echo "AINDA pendente — corrigir" || echo "promovidas OK"
grep -c 'scaffold/' scaffold/.claude/README.md scaffold/.claude/skills/new-slice/SKILL.md
mkdocs build --strict >/dev/null 2>&1 && echo "raiz PASS"; rm -rf site; (cd scaffold && mkdocs build --strict >/dev/null 2>&1 && echo "scaffold PASS"; rm -rf site)
```
Expected: `new-presentation no build OK`, `promovidas OK`, contagens `scaffold/`=0 (exceto a prosa pré-existente do README), ambos mkdocs PASS.
- [ ] **Step 4: Commit** `feat(skills): promove status/new-presentation/new-adr; init no repo do modelo`.

---

## Task 6: Dogfood ponta-a-ponta + não-regressão

- [ ] **Step 1: Dogfood seca (report):** as 4 skills compõem o ciclo — `init` cria o projeto; dentro dele, `new-slice` orquestra (e usa `new-module`/`new-presentation` no build e `new-adr` para registrar decisões); `status` responde "onde paramos". Confirme que nenhuma referência circular quebra e que `init` (modelo) ≠ skills por-projeto.
- [ ] **Step 2: Não-regressão:**
```bash
cd C:/project/wk/harness-model
echo "skills por-projeto:"; ls scaffold/.claude/skills/   # new-module, new-slice, new-adr, new-presentation, status
echo "skill do modelo:"; ls .claude/skills/   # init
mkdocs build --strict >/dev/null 2>&1 && echo "raiz PASS"; rm -rf site; (cd scaffold && mkdocs build --strict >/dev/null 2>&1 && echo "scaffold PASS"; rm -rf site)
grep -rniE '\b(mik|thor|cfop|payable|tesouraria|faturamento)\b' scaffold/.claude .claude/skills/init/SKILL.md || echo "fase sem vazamento"
```
Expected: 5 skills por-projeto, `init` no modelo, ambos mkdocs PASS, `fase sem vazamento`.
- [ ] **Step 3:** Ajuste+commit se necessário; senão a fase fecha nas Tasks 1-5.

---

## Self-Review (preenchido)
- **Cobertura (spec §9.4):** new-adr ✓ new-presentation ✓ status ✓ init ✓ + wiring ✓ + dogfood ✓.
- **Onde moram:** new-adr/new-presentation/status em `scaffold/.claude/skills/` (copiadas); **`init` em `.claude/skills/` do repo do modelo** (não copiada) — distinção respeitada.
- **`init` é a exceção project-relative:** manipula `scaffold/` legitimamente (é quem o copia).
- **Fora desta fase:** `agnosticism-auditor` (F5, no `.claude/` do repo do modelo).

## Próxima fase
- **F5 — Manutenção:** `agnosticism-auditor` (`.claude/agents/` do repo do modelo) — caça acoplamento de stack/forma + vazamento de negócio ao evoluir o próprio modelo.
