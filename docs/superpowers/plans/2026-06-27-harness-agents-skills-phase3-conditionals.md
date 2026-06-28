# Harness agents/skills — Condicionais (Fase 3) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Entregar os **5 role-agents condicionais** — `data`, `sre-devsecops`, `ui-ux`, `researcher`, `product` — cada um com checklist-companion, e **ligá-los** ao `new-slice`/matriz/README, encerrando a degradação graciosa (todos os papéis passam a existir).

**Architecture:** Role-agents condicionais são subagents (`.claude/agents/<nome>.md`) + checklist-companion (`checklists/<nome>.md`). A triagem só os acorda sob o gatilho da matriz (data=schema/migração; sre-devsecops=infra/produção; ui-ux=presentation com UI; researcher=evidência externa; product=definição de fatia). Dois **compõem skills existentes**: `researcher` ∘ `superpowers:deep-research` (ou WebSearch/WebFetch); `ui-ux` ∘ `frontend-design` + Figma/Playwright MCP (project-dependent). Todos: citam-não-duplicam, project-relative, independência adversarial, zero negócio.

**Tech Stack:** Claude Code subagents (markdown + frontmatter). Fonte: spec `docs/superpowers/specs/2026-06-27-harness-agents-skills-design.md` §3 + backbone/baseline já em `main`.

---

## Como se "testa" (igual às Fases 1-2)
Estrutural (frontmatter/seções) + anti-vazamento (`grep` whole-word; `author`→"thor" falso-positivo) + project-relative (`grep -c 'scaffold/'`=0) + dogfood seca (raciocínio sobre `widget`) + mkdocs `--strict` (raiz+scaffold) PASS.

> **Refs diferidas conhecidas (não-bugs):** `CLAUDE.md`, `checklists/testing-strategy.md`, `checklists/security-defense-in-depth.md`, `checklists/new-vertical-slice.md` ficam na RAIZ do projeto pós-`init` (Fase 4). Agents os referem project-relative com ressalva ("leia o da raiz / se presente").
>
> **Tool-lists** nas frontmatter são defaults da stack-exemplo; MCP (figma/playwright) é project-dependent — o corpo deve dizer "se o projeto as tiver".

---

## File Structure (Fase 3)

| Arquivo | Responsabilidade |
| --- | --- |
| `scaffold/.claude/agents/data.md` + `checklists/data-layer-review.md` | Profundidade da camada de dados (par do arquiteto). |
| `scaffold/.claude/agents/sre-devsecops.md` + `checklists/operational-readiness.md` | Operacionalizar confiabilidade + hardening de entrega. |
| `scaffold/.claude/agents/researcher.md` + `checklists/research-rigor.md` | Evidência externa verificada (transversal). |
| `scaffold/.claude/agents/ui-ux.md` + `checklists/ui-ux-review.md` | UX/acessibilidade de presentation com UI. |
| `scaffold/.claude/agents/product.md` + `checklists/product-slice.md` | Valor + corte da fatia + aceite (facilitador). |
| `new-slice/SKILL.md` + `convocation-matrix.md` + `.claude/README.md` (mod) | Promover as 5 lentes para "existe hoje"; ligar passos 2/3/4. |

---

## Task 1: Agente `data` + companion

**Files:** Create `scaffold/checklists/data-layer-review.md`, `scaffold/.claude/agents/data.md`.

- [ ] **Step 1: Checklist** `scaffold/checklists/data-layer-review.md`:
```markdown
# Camada de dados — checklist do agente data

- [ ] **Modelagem do agregado:** fronteira do agregado correta; invariantes no domínio, não no schema.
- [ ] **Segurança de migração:** sem lock longo de tabela; backward-compatible (expand→migrate→contract); reversível ou com plano de rollback; ordem antes dos workloads (Job/hook).
- [ ] **Índices/query:** os acessos quentes têm índice; sem N+1; paginação; projeção sem `id_*` interno na origem.
- [ ] **Read model/consistência (se CQRS):** o read model não reintroduz dado que a projeção de escrita removeu; defasagem (eventual consistency) é explícita e tolerável.
- [ ] **Integridade/idempotência:** chave de negócio única; idempotência no consumidor (`ON CONFLICT DO NOTHING`) quando assíncrono.
- [ ] **PII/retenção:** dado sensível classificado, cifrado em repouso quando exigido, com retenção definida.
```
- [ ] **Step 2: Agente** `scaffold/.claude/agents/data.md`. Frontmatter:
```markdown
---
name: data
description: Profundidade da camada de dados — schema/agregado, segurança de migração, índice/query, read-model+consistência, integridade/idempotência, PII/retenção. Par do arquiteto. Use quando a fatia toca schema/migração/read-model/índice/PII.
tools: Read, Grep, Glob, Write, Edit
---
```
Corpo (prosa) — pontos obrigatórios: papel = **profundidade da camada de dados**, *par do arquiteto* (o arquiteto decide a forma/NFR; você desenha o **como** do dado); input = o agregado/mudança + a decisão de forma do arquiteto; rode `checklists/data-layer-review.md`; **saída** = um **plano de schema+migração+índice** (e um **ADR** se a decisão de dado for significativa — via `checklists/new-adr.md`/`docs/adr/0000-adr-template.md`); você produz o **plano/ADR**, não a migração final (quem materializa é o build/`new-module`); independência (uma migração insegura é bloqueante); zero negócio; project-relative.
- [ ] **Step 3: Verificação** (frontmatter `data`; conteúdo schema/migração/índice/consistência; `grep -c scaffold/`=0; anti-vazamento; mkdocs PASS).
- [ ] **Step 4: Dogfood seca (report):** dada uma migração que adiciona coluna NOT NULL sem default a uma tabela grande → o agente sinaliza **lock/bloqueante** e propõe expand→backfill→contract.
- [ ] **Step 5: Commit** `feat(agents): data (profundidade da camada de dados)`.

---

## Task 2: Agente `sre-devsecops` + companion

**Files:** Create `scaffold/checklists/operational-readiness.md`, `scaffold/.claude/agents/sre-devsecops.md`.

- [ ] **Step 1: Checklist** `scaffold/checklists/operational-readiness.md`:
```markdown
# Prontidão operacional — checklist do sre-devsecops

- [ ] **SLO/SLI:** objetivos de latência/erro/disponibilidade definidos para a capacidade; medíveis pelas métricas existentes.
- [ ] **Resiliência:** timeouts, retry com backoff, circuit-breaker e degradação graciosa nas dependências voláteis; best-effort nunca trava o boot.
- [ ] **Rollout/rollback:** estratégia (rolling/canary), health/readiness, e **migração ordenada antes** dos workloads; rollback ensaiado.
- [ ] **Capacidade:** limites de recurso (CPU/mem), HPA/PDB onde aplicável.
- [ ] **Incidente/runbook:** runbook mínimo (sintoma→diagnóstico→mitigação) + alertas no que tem SLO.
- [ ] **DevSecOps (hardening da entrega):** ver `checklists/security-defense-in-depth.md` — supply-chain (audit high), secrets fora do cliente/cifrados, securityContext endurecido, IaC sem segredo embutido, least-privilege de deploy.
```
- [ ] **Step 2: Agente** `scaffold/.claude/agents/sre-devsecops.md`. Frontmatter:
```markdown
---
name: sre-devsecops
description: Operacionaliza confiabilidade (SLO/SLI, resiliência, rollout/rollback, capacidade, incidente) e o hardening de entrega (IaC/pipeline/secrets). Par operacional do arquiteto. Use perto de produção ou em mudança de infra/deploy.
tools: Read, Grep, Glob, Write, Edit
---
```
Corpo: papel = **operacionalizar a confiabilidade/segurança-de-entrega**, *par operacional do arquiteto* (ele decide o NFR de confiabilidade; você o torna real e seguro de operar); input = NFR de confiabilidade/segurança + a mudança de deploy/infra; rode `checklists/operational-readiness.md` e cole no checklist de segurança (`checklists/security-defense-in-depth.md`) para o **DevSecOps**; **saída** = SLOs + **revisão de prontidão para deploy** + runbook (ADR se significativo); **ativado por proximidade de produção** (em protótipo/interno, modo mínimo); independência (não-pronto-para-deploy é bloqueante); zero negócio; project-relative.
- [ ] **Step 3: Verificação** (frontmatter; SLO/resiliência/rollout/security; scaffold/=0; anti-vazamento; mkdocs).
- [ ] **Step 4: Dogfood seca:** mudança que adiciona um endpoint sem timeout/observabilidade indo pra produção → sinaliza **não-pronto** (sem SLO, sem timeout/retry, sem runbook).
- [ ] **Step 5: Commit** `feat(agents): sre-devsecops (prontidão operacional + hardening)`.

---

## Task 3: Agente `researcher` + companion

**Files:** Create `scaffold/checklists/research-rigor.md`, `scaffold/.claude/agents/researcher.md`.

- [ ] **Step 1: Checklist** `scaffold/checklists/research-rigor.md`:
```markdown
# Rigor de pesquisa — checklist do researcher

- [ ] **Pergunta enquadrada:** o que precisa ser decidido e qual claim a evidência valida/refuta.
- [ ] **Múltiplas fontes independentes:** não confie numa fonte só; corrobore.
- [ ] **Verificação adversarial:** tente refutar o claim, não só confirmá-lo.
- [ ] **Citação:** cada afirmação tem fonte rastreável (URL/título/data); separe fato de inferência.
- [ ] **Brief acionável:** síntese curta voltada à decisão, não um despejo de busca; declare a confiança e o que ficou incerto.
```
- [ ] **Step 2: Agente** `scaffold/.claude/agents/researcher.md`. Frontmatter:
```markdown
---
name: researcher
description: Reúne EVIDÊNCIA EXTERNA verificada para validar/informar uma decisão (mercado/usuário/viabilidade técnica). Transversal — serve qualquer decisor. Não decide; corrobora. Use quando uma decisão depende de evidência externa.
tools: Read, Grep, Glob, WebSearch, WebFetch
---
```
Corpo: papel = **trazer evidência externa**, **transversal** (serve Produto, Arquiteto, Dados, SRE — não só Produto); você **não decide, corrobora**, com **verificação adversarial** (postura de refutar); **compõe** o rigor da skill `superpowers:deep-research` quando disponível (fan-out + verificação + síntese citada) — senão, WebSearch/WebFetch diretos com o mesmo rigor; rode `checklists/research-rigor.md`; **saída** = um **brief com fontes citadas** (síntese acionável, confiança declarada); zero negócio (não pesquise o domínio específico do projeto a menos que pedido — pesquise a questão genérica); project-relative.
- [ ] **Step 3: Verificação** (frontmatter com WebSearch/WebFetch; conteúdo evidência/adversarial/citação; scaffold/=0; anti-vazamento; mkdocs).
- [ ] **Step 4: Dogfood seca:** Arquiteto pergunta "a lib X é viável para o requisito Y?" → o researcher busca fontes independentes, tenta refutar (issues conhecidos/abandono), e devolve um brief citado com nível de confiança — não um veredito de adoção (a decisão é do Arquiteto).
- [ ] **Step 5: Commit** `feat(agents): researcher (evidência externa verificada, transversal)`.

---

## Task 4: Agente `ui-ux` + companion

**Files:** Create `scaffold/checklists/ui-ux-review.md`, `scaffold/.claude/agents/ui-ux.md`.

- [ ] **Step 1: Checklist** `scaffold/checklists/ui-ux-review.md`:
```markdown
# UX & acessibilidade — checklist do ui-ux

- [ ] **Fluxo/IA:** o caminho do usuário é claro; o menor número de passos para o valor.
- [ ] **Estados:** loading, vazio, erro e sucesso tratados (não só o caminho feliz).
- [ ] **Acessibilidade (WCAG):** contraste, foco visível, navegação por teclado, labels/aria, alvo de toque.
- [ ] **Responsivo:** funciona nos breakpoints alvo; sem overflow/quebra.
- [ ] **Consistência com o design system:** usa tokens/primitivos, não estilos soltos.
- [ ] **Verificação de render:** a tela foi vista renderizada (ex.: Playwright MCP) — não só o código.
```
- [ ] **Step 2: Agente** `scaffold/.claude/agents/ui-ux.md`. Frontmatter:
```markdown
---
name: ui-ux
description: Cuida da experiência de uma presentation COM UI — fluxo/IA, acessibilidade (WCAG), estados (erro/vazio/loading), responsivo, consistência com design system, verificação de render. Use quando a fatia toca uma presentation com UI (não em app API/CLI-only).
tools: Read, Grep, Glob, Write, Edit
---
```
Corpo: papel = **UX de uma presentation com UI**, **par do Produto** (Produto = que valor; você = como o usuário vive); **condicional**: só ativa quando há presentation com UI — em app API/CLI-only, **não atua**; rode `checklists/ui-ux-review.md`; **compõe** (se o projeto as tiver) a skill `frontend-design` para gerar e as MCP `figma`/`playwright` para desenho/verificação de render; **saída** = revisão de UX/acessibilidade + (quando gera) telas + **veredito de render**; **ressalva honesta**: você é dono das partes **checklist-áveis** (acessibilidade/estados/consistência/fluxo) e **sinaliza quando um designer humano é necessário** — não finge ser designer sênior; zero negócio; project-relative.
- [ ] **Step 3: Verificação** (frontmatter; conteúdo acessibilidade/estados/render; scaffold/=0; anti-vazamento; mkdocs).
- [ ] **Step 4: Dogfood seca:** fatia "+form de `<Entity>`" numa presentation web → o ui-ux cobra estados (erro/vazio/loading), acessibilidade (labels/foco/teclado), tokens do design system, e a verificação de render; sinaliza onde um designer humano decide.
- [ ] **Step 5: Commit** `feat(agents): ui-ux (UX/acessibilidade de presentation com UI)`.

---

## Task 5: Agente `product` + companion

**Files:** Create `scaffold/checklists/product-slice.md`, `scaffold/.claude/agents/product.md`.

- [ ] **Step 1: Checklist** `scaffold/checklists/product-slice.md`:
```markdown
# Corte de fatia & aceite — checklist do product

- [ ] **Valor claro:** que problema do usuário esta fatia resolve, e para quem.
- [ ] **Fatia vertical:** atravessa o sistema e é demoável sozinha (não uma camada horizontal).
- [ ] **Menor incremento valioso:** é o mínimo que entrega valor? O que dá pra cortar (anti-gold-plating)?
- [ ] **Critérios de aceite:** observáveis e testáveis (viram os casos do QA).
- [ ] **Facilitador, não oráculo:** a verdade de domínio é do humano — você estrutura e provoca, não inventa requisito.
```
- [ ] **Step 2: Agente** `scaffold/.claude/agents/product.md`. Frontmatter:
```markdown
---
name: product
description: Enquadra valor e corta a fatia (vertical, demoável, mínima) com critérios de aceite; desafia gold-plating. Facilitador, não oráculo (a verdade de domínio é do humano). Use na definição/ambiguidade de uma fatia.
tools: Read, Grep, Glob, Write, Edit
---
```
Corpo: papel = **valor + corte da fatia + aceite**; **facilitador, não oráculo** — você **estrutura e provoca** ("isso é vertical? demoável? é o menor incremento? não é gold-plating?"), **não fabrica** requisito de domínio (o humano é dono da verdade); **compõe** `superpowers:brainstorming` para o corte; rode `checklists/product-slice.md` e `checklists/new-vertical-slice.md`; **saída** = a **definição da fatia + critérios de aceite** (que alimentam o QA); **condicional ao domínio** — só no projeto instanciado; independência (desafia escopo inflado); zero negócio; project-relative.
- [ ] **Step 3: Verificação** (frontmatter; conteúdo valor/fatia/aceite/facilitador; scaffold/=0; anti-vazamento; mkdocs).
- [ ] **Step 4: Dogfood seca:** pedido vago "melhorar a tela de `<Entity>`" → o product faz perguntas de valor, corta a menor fatia vertical demoável, fixa critérios de aceite, e desafia o que não é essencial — sem inventar regra de negócio.
- [ ] **Step 5: Commit** `feat(agents): product (valor + corte de fatia + aceite, facilitador)`.

---

## Task 6: Wiring — promover as 5 lentes + ligar os passos do `new-slice`

**Files:** Modify `scaffold/.claude/skills/new-slice/SKILL.md`, `scaffold/.claude/convocation-matrix.md`, `scaffold/.claude/README.md`.

- [ ] **Step 1: `new-slice`** — LEIA o arquivo. Nos passos 2/3/4, onde Produto/Dados/UI-UX/Pesquisador estavam marcados "(fase futura) → anote pendente", reescreva para **invocar de fato** o agente correspondente quando a triagem o acordar (Produto no passo 2; Pesquisador no passo 3 se evidência; Dados no passo 4 se schema; UI/UX no passo 4 se tela; sre-devsecops no passo 5/6 perto de prod). A seção **"Degradação graciosa"**: agora **todos os papéis existem** — reescreva-a para refletir isso (a degradação vira a regra geral "se um dia faltar uma peça, anote e siga", mas **nenhuma lente está pendente hoje**). Liste como existentes: matriz + `architect`/`qa`/`harness-reviewer`/`data`/`sre-devsecops`/`ui-ux`/`researcher`/`product` + skills.
- [ ] **Step 2: `convocation-matrix.md`** — nota final passa a: **"Todas as lentes da matriz já existem (architect, qa, harness-reviewer, data, sre-devsecops, ui-ux, researcher, product)."**
- [ ] **Step 3: `README.md`** — mover Dados/SRE-DevSecOps/UI-UX/Pesquisador/Produto de "fase futura" para "existe hoje"; só as **skills** restantes (`status`/`new-presentation`/`new-adr`/`init`) seguem fase futura.
- [ ] **Step 4: Verificação:**
```bash
cd C:/project/wk/harness-model
for a in data sre-devsecops ui-ux researcher product; do grep -qi "$a" scaffold/.claude/skills/new-slice/SKILL.md || echo "FALTA $a no new-slice"; done; echo "wire check done"
grep -niE '(data|sre-devsecops|ui-ux|researcher|product)[^\n]*(pendente|fase futura)' scaffold/.claude/skills/new-slice/SKILL.md && echo "AINDA pendente — corrigir" || echo "promovidos OK"
grep -c 'scaffold/' scaffold/.claude/skills/new-slice/SKILL.md scaffold/.claude/convocation-matrix.md scaffold/.claude/README.md
mkdocs build --strict >/dev/null 2>&1 && echo "raiz PASS"; rm -rf site; (cd scaffold && mkdocs build --strict >/dev/null 2>&1 && echo "scaffold PASS"; rm -rf site)
```
Expected: `wire check done` sem FALTA, `promovidos OK`, contagens `scaffold/`=0 (exceto a prosa pré-existente do README), ambos mkdocs PASS.
- [ ] **Step 5: Commit** `feat(skills): liga data/sre/ui-ux/researcher/product ao new-slice (todas as lentes existem)`.

---

## Task 7: Dogfood ponta-a-ponta + não-regressão

- [ ] **Step 1: Dogfood seca (report):** `new-slice` para *"nova capacidade de `<Entity>` lida em altíssimo volume, com tela web, em produção"* → triagem acorda **Produto + Arquiteto + Dados + UI/UX + QA + harness-reviewer + SRE/DevSecOps** (+ Pesquisador se incerto), **ADR obrigatório**; cada passo **invoca o agente real** (nenhum "pendente"); degradação graciosa não dispara.
- [ ] **Step 2: Não-regressão:**
```bash
cd C:/project/wk/harness-model
ls scaffold/.claude/agents/   # architect, harness-reviewer, qa, data, sre-devsecops, ui-ux, researcher, product (8)
mkdocs build --strict >/dev/null 2>&1 && echo "raiz PASS"; rm -rf site; (cd scaffold && mkdocs build --strict >/dev/null 2>&1 && echo "scaffold PASS"; rm -rf site)
grep -rniE '\b(<termos-da-origem>)\b' scaffold/.claude scaffold/checklists/data-layer-review.md scaffold/checklists/operational-readiness.md scaffold/checklists/research-rigor.md scaffold/checklists/ui-ux-review.md scaffold/checklists/product-slice.md || echo "fase sem vazamento"
```
Expected: 8 agents, ambos mkdocs PASS, `fase sem vazamento`.
- [ ] **Step 3:** Se houver ajuste, corrija + commit; senão a fase fecha nos commits das Tasks 1-6.

---

## Self-Review (preenchido)
- **Cobertura (spec §9.3 condicionais):** data ✓ sre-devsecops ✓ ui-ux ✓ researcher ✓ product ✓ + wiring ✓ + dogfood ✓.
- **Composição:** researcher ∘ deep-research/WebSearch; ui-ux ∘ frontend-design/figma/playwright; product ∘ brainstorming — declarados como composição (project-dependent onde MCP).
- **Placeholder scan / nomes:** `data`/`sre-devsecops`/`ui-ux`/`researcher`/`product` consistentes com a matriz (que já os listava) e o README.
- **Fora desta fase:** skills `status`/`new-presentation`/`new-adr`/`init` (F4); `agnosticism-auditor` (F5).

## Próximas fases
- **F4 — Skills restantes:** `status`, `new-presentation`, `new-adr`, `init` (init consolida CLAUDE.md+checklists/+docs/ na raiz da instância).
- **F5 — Manutenção:** `agnosticism-auditor` (no `.claude/` do repo do modelo).
