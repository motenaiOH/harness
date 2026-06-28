# Correções do dogfood — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`).

**Goal:** Corrigir os ~17 achados dos dois dogfoods (instanciar `init` + rodar `new-slice` em `@acme/billing/invoice`), tornando o modelo de fato instanciável-e-coerente. Escopo: **estruturais + clareza** (decisão do usuário). Infra transversal: **por receita** (scaffold magro + passo "materialize primeiro" com esqueletos), não stubs.

**Architecture:** Correções em prosa/config do harness-model: a skill `init` (raiz do modelo), as skills `new-module`/`new-slice` + o `feature.module.ts` + um novo README de infra transversal (no scaffold), e os READMEs de camada. Sem mudar a stack.

---

## Decisões de design (fixadas para os fixes)
1. **Convenção de placeholder:** nomes de ARQUIVO usam `__entity__`/`__name__` (FS-safe); PROSA usa `<App>`/`<Feature>`/`<Entity>`/`<name>`/`<Tenant>`/`<Presentation>`. Documentar explícito e alinhar a tabela de rename.
2. **Write-path default = variante A (escrita direta):** `feature.module.ts` cabeia a variante A ATIVA; variante B (CQRS-lite) fica como bloco COMENTADO alternativo. (Hoje está invertido — viola "síncrono por default".)
3. **Infra transversal por receita:** um `scaffold/apps/api/src/SHARED-INFRA.README.md` lista os módulos compartilhados (auth, database/drizzle, cache/redis, messaging, health, common/zod-validation.pipe) com esqueletos; `new-module`/`init` ganham o passo "materialize a infra transversal (1ª fatia)".

---

## Como se "testa"
Estrutural (grep) + zero-vazamento + mkdocs `--strict` (raiz+scaffold) + dogfood seca (raciocínio) — igual às fases anteriores.

---

## Task 1: Skill `init` — renames seguros, `<App>`, purga, fallback, current-state

**Files:** Modify `.claude/skills/init/SKILL.md` (raiz do modelo).

- [ ] **Step 1:** LEIA `.claude/skills/init/SKILL.md`. Aplique (achados init #1,2,3,4,5,7,8,9):
  - **#2 `<App>` como 5º pré-requisito** (nome do app/projeto). Adicionar passo de rename `<App>` → valor em `mkdocs.yml` (`site_name`), `.env.example`, `package.json` `"name"`, headers, docs seed.
  - **#1 Dois eixos de rename, com casing:** explicitar que são DOIS renames independentes — (a) **contexto** `Feature`/`feature`/`FEATURE`/`Features` → o bounded context (ex.: `Billing`/`billing`/`BILLING`/`Billings`); (b) **entidade** `Widget`/`widget`/`<entity>`/`<name>` → a `<Entity>` (ex.: `Invoice`/`invoice`). Dar a regra de casing (PascalCase/lowercase/UPPER/plural) para cada.
  - **#3 Rename por palavra-inteira/identificador, revisar cada hit:** avisar que `feature`/`widget` aparecem como SUBSTRING de identificadores/keywords não-relacionados (ex.: a chave `features:` do MkDocs Material) — NÃO faça substituição global cega; revise cada ocorrência.
  - **#5 Híbridos pós-rename:** depois de renomear a palavra-interna, varra por `<Billing>`-style (placeholders com `<>` que sobraram do `<Feature>`) e por `<App>`/`<Feature>`/`<Entity>` literais; resolva-os.
  - **#4 Purga enumera os alvos:** dar o grep para achar a proveniência (cabeçalhos SPINE, "Status do scaffold", comentários "Replace the @app… ") e citar onde costumam estar (`app.module.ts`, `main.ts`, `worker.ts`, `<feature>.module.ts`, `package.json "//"`). Declarar que a proveniência em `checklists/aprendizados.md` (que ENSINA a purga) NÃO é purgada (o guard a exclui).
  - **#7 Colisão no merge:** se um nome de arquivo de `checklists/` (metodologia) colidir com um companion do scaffold, o do scaffold (companion) vence; não sobrescreva sem avisar.
  - **#8 Fallback do Passo-0:** declarar que, se o agente `architect` não puder ser invocado (ex.: rodando o init fora de uma sessão com ele registrado), o procedimento é seguir `checklists/architecture-form-decision.md` à mão e escrever o ADR — anotando isso.
  - **#9 Preencher current-state:** tornar "preencher `docs/how-to/current-state.md` inicial" um passo NUMERADO (não só na Saída).
- [ ] **Step 2: Verificação:**
```bash
cd C:/project/wk/harness-model
grep -qiE '<App>.*pré-requisito|<App>.*nome do' .claude/skills/init/SKILL.md && echo "App pre-req OK"
grep -qiE 'dois.*rename|dois eixos|contexto.*entidade' .claude/skills/init/SKILL.md && echo "dois eixos OK"
grep -qiE 'palavra-inteira|identificador|substring|features:' .claude/skills/init/SKILL.md && echo "whole-word OK"
grep -qiE 'architecture-form-decision.*à mão|fallback|se.*architect.*não' .claude/skills/init/SKILL.md && echo "fallback OK"
grep -qiE 'current-state.*passo|preench.*current-state' .claude/skills/init/SKILL.md && echo "current-state OK"
mkdocs build --strict >/dev/null 2>&1 && echo "mkdocs PASS" || echo FAIL; rm -rf site
```
- [ ] **Step 3: Commit** `fix(skills): init — renames seguros, <App> pré-req, purga, fallback, current-state`.

---

## Task 2: Infra transversal por receita (SHARED-INFRA README + passo no new-module/init)

**Files:** Create `scaffold/apps/api/src/SHARED-INFRA.README.md`; Modify `scaffold/.claude/skills/new-module/SKILL.md`, `scaffold/apps/api/src/app.module.ts`, `.claude/skills/init/SKILL.md`.

- [ ] **Step 1:** Criar `scaffold/apps/api/src/SHARED-INFRA.README.md` — lista os módulos transversais que a espinha importa mas não acompanham as folhas de feature, com **esqueletos** (stack-exemplo NestJS) para materializar **na 1ª fatia**:
  - `auth/` — `jwt-auth.guard.ts`, `current-user.decorator.ts`, `authenticated-user.ts`, `auth.module.ts` (escopo do claim verificado, nunca do input).
  - `infrastructure/database/drizzle/drizzle.module.ts` (token `DRIZZLE`/`Database`).
  - `infrastructure/cache/redis.module.ts`.
  - `infrastructure/messaging/messaging.module.ts` (`@Global()`, expõe a conexão do broker).
  - `modules/health/health.module.ts` (+ controller `/health` VERSION_NEUTRAL).
  - `common/zod-validation.pipe.ts`.
  Deixar claro: **materialize só os que a sua 1ª fatia exige** (ex.: read-only não precisa de messaging).
- [ ] **Step 2:** `new-module/SKILL.md` — adicionar, antes de "materializar as folhas", o passo **"0. Infra transversal (1ª fatia): se os imports compartilhados ainda não existem, materialize-os por `apps/api/src/SHARED-INFRA.README.md`"**. `init/SKILL.md` — mencionar que a 1ª fatia materializa a infra transversal.
- [ ] **Step 3:** `app.module.ts` — no cabeçalho (SPINE), adicionar nota apontando para `SHARED-INFRA.README.md` ("os módulos importados abaixo são materializados na 1ª fatia por esse README").
- [ ] **Step 4: Verificação:**
```bash
cd C:/project/wk/harness-model
test -f scaffold/apps/api/src/SHARED-INFRA.README.md && echo "infra README OK"
grep -qiE 'auth|drizzle|redis|messaging|health|zod-validation' scaffold/apps/api/src/SHARED-INFRA.README.md && echo "lista OK"
grep -qiE 'SHARED-INFRA|infra transversal' scaffold/.claude/skills/new-module/SKILL.md && echo "new-module aponta OK"
grep -qiE 'SHARED-INFRA|infra transversal' scaffold/apps/api/src/app.module.ts && echo "app.module aponta OK"
grep -rniE '<termos-da-origem>' scaffold/apps/api/src/SHARED-INFRA.README.md || echo "sem vazamento"
mkdocs build --strict >/dev/null 2>&1 && echo "mkdocs PASS" || echo FAIL; rm -rf site
```
- [ ] **Step 5: Commit** `fix(scaffold): infra transversal por receita (SHARED-INFRA + passo no new-module)`.

---

## Task 3: Convenção de placeholder + write-path default variante A

**Files:** Modify `scaffold/.claude/skills/new-module/SKILL.md`, os 4 READMEs de camada em `scaffold/apps/api/src/modules/feature/{domain,application,infrastructure,presentation}/README.md`, e `scaffold/apps/api/src/modules/feature/feature.module.ts`.

- [ ] **Step 1: Convenção de placeholder (flow #8/#2):** em `new-module/SKILL.md`, declarar a convenção (arquivos = `__entity__`/`__name__` FS-safe; prosa = `<Entity>`/`<name>`) e alinhar a tabela de rename para cobrir AMBAS. Varrer os 4 READMEs de camada e garantir que usam a convenção declarada de forma consistente (não misturar `<name>` e `__name__` sem explicar). Esclarecer a ambiguidade de rota (flow #2): o exemplo de read do README é UM exemplo; a fatia pode ter seu próprio endpoint/DTO.
- [ ] **Step 2: Write-path default = variante A (flow #3):** em `feature.module.ts`, **inverter o default** — a variante A (escrita direta: use-case com o repositório, sem `EventPublisherPort`/`CachePort`) fica ATIVA; a variante B (CQRS-lite) vira o bloco COMENTADO alternativo. Preserve o cabeçalho SPINE. Alinhe com a postura "síncrono por default" e com o que o ADR de uma instância tipicamente escolhe.
- [ ] **Step 3: Verificação:**
```bash
cd C:/project/wk/harness-model
grep -qiE '__entity__|__name__' scaffold/.claude/skills/new-module/SKILL.md && grep -qiE 'arquivo|filename|FS-safe|prosa' scaffold/.claude/skills/new-module/SKILL.md && echo "convenção OK"
grep -qiE 'escrita direta|variante A|direct' scaffold/apps/api/src/modules/feature/feature.module.ts && echo "variante A presente"
# a variante B deve estar COMENTADA (não ativa):
grep -nE 'EventPublisherPort|CachePort' scaffold/apps/api/src/modules/feature/feature.module.ts | head
grep -c 'scaffold/' scaffold/.claude/skills/new-module/SKILL.md   # 0
mkdocs build --strict >/dev/null 2>&1 && echo "mkdocs PASS" || echo FAIL; rm -rf site
```
- [ ] **Step 4: Commit** `fix(scaffold): convenção de placeholder + write-path default variante A`.

---

## Task 4: `new-slice` — module×presentation, degradação, plans/, dry-run

**Files:** Modify `scaffold/.claude/skills/new-slice/SKILL.md`; Modify `.claude/skills/init/SKILL.md` (criar `docs/superpowers/plans/`).

- [ ] **Step 1:** Em `new-slice/SKILL.md`:
  - **#4:** passo 4 (build) — esclarecer que uma fatia pode usar `new-module` **E** `new-presentation` (1ª fatia faz os dois); não são exclusivos.
  - **#5 Degradação honesta:** a afirmação "todos os agentes existem" vale numa sessão real aberta no projeto (os agents de `.claude/agents/` são registrados). Mas declarar o **fallback explícito**: se um agente não puder ser invocado, atue pelo checklist-companion dele e anote — a degradação graciosa cobre isso. (Suaviza o "nada por-projeto falta".)
  - **#7 Postura dry-run:** no passo 6 (DoD), reconhecer um modo "scaffolding/dry-run" para a 1ª fatia/exploração (materializar estrutura sem build verde), DESDE QUE registrado como follow-up no current-state — o gate normal (`verification-before-completion`) volta a valer na fatia seguinte.
- [ ] **Step 2:** `init/SKILL.md` (#6): no bootstrap, **criar `docs/superpowers/plans/`** (com um `.gitkeep` ou um README) — o `new-slice` passo 0/6 o trata como fonte de verdade.
- [ ] **Step 3: Verificação:**
```bash
cd C:/project/wk/harness-model
grep -qiE 'new-module.*new-presentation|ambos|não.*exclusiv' scaffold/.claude/skills/new-slice/SKILL.md && echo "module+presentation OK"
grep -qiE 'fallback|atue pelo checklist|não puder ser invocado' scaffold/.claude/skills/new-slice/SKILL.md && echo "degradação honesta OK"
grep -qiE 'dry-run|scaffolding|sem build verde' scaffold/.claude/skills/new-slice/SKILL.md && echo "dry-run OK"
grep -qiE 'superpowers/plans|plans/' .claude/skills/init/SKILL.md && echo "init cria plans OK"
grep -c 'scaffold/' scaffold/.claude/skills/new-slice/SKILL.md   # 0
mkdocs build --strict >/dev/null 2>&1 && echo "raiz PASS"; rm -rf site; (cd scaffold && mkdocs build --strict >/dev/null 2>&1 && echo "scaffold PASS"; rm -rf site)
```
- [ ] **Step 4: Commit** `fix(skills): new-slice — module×presentation, degradação honesta, dry-run, plans/`.

---

## Task 5: Não-regressão + final review + finish

- [ ] **Step 1: Não-regressão:**
```bash
cd C:/project/wk/harness-model
mkdocs build --strict >/dev/null 2>&1 && echo "raiz PASS"; rm -rf site; (cd scaffold && mkdocs build --strict >/dev/null 2>&1 && echo "scaffold PASS"; rm -rf site)
grep -rniE '\b(<termos-da-origem>)\b' scaffold/.claude scaffold/apps/api/src/SHARED-INFRA.README.md .claude/skills/init/SKILL.md | grep -v agnosticism-auditor || echo "sem vazamento"
```
- [ ] **Step 2:** Final review independente sobre `main..HEAD` (cobre os 17 achados? algum fix introduziu incoerência? project-relative/zero-negócio mantidos?).
- [ ] **Step 3:** Merge em `main` + push (`finishing-a-development-branch` → opção merge + `git push`).

---

## Mapa achado → fix (cobertura)
- init #1 dois eixos → T1 · #2 `<App>` → T1 · #3 whole-word → T1 · #4 purga → T1 · #5 híbridos → T1 · #7 merge → T1 · #8 fallback → T1 · #9 current-state → T1
- flow #1 infra transversal → T2 · #2 rota → T3 · #3 variante A → T3 · #4 module×presentation → T4 · #5 degradação → T4 · #6 plans/ → T4 · #7 dry-run → T4 · #8 placeholder → T3
