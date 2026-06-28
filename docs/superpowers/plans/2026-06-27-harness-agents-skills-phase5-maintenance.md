# Harness agents/skills — Manutenção (Fase 5) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`).

**Goal:** Entregar o `agnosticism-auditor` — o agente de **manutenção do MODELO** (no `.claude/agents/` do repo do modelo, **não** copiado) que caça vazamento de negócio + acoplamento de stack/forma ao evoluir o harness-model. Fecha a camada de agents/skills.

**Architecture:** O `agnosticism-auditor` vive em `.claude/agents/agnosticism-auditor.md` na RAIZ do repo do modelo (não em `scaffold/`, não copiado pelo `init`). É read-only. Codifica o "teste de agnosticismo" (que fizemos com 4 auditores ad-hoc) + o grep anti-vazamento. Seu input é o **diff de uma evolução do modelo**; seu output são achados.

**Tech Stack:** Claude Code subagent (markdown). Fonte: spec §3 (o "+ agente de manutenção do modelo") + as Fases 1-4 já em `main`.

---

## Como se "testa"
Estrutural (frontmatter/seções) + o agente VIVE no modelo (não em scaffold, não copiado) + zero-vazamento no próprio arquivo + mkdocs `--strict` PASS + dogfood seca (raciocínio sobre um diff que introduz acoplamento).

> Nota: este agente **legitimamente NOMEIA** os termos de negócio da origem (os termos da origem) porque seu trabalho é caçá-los — então a verificação anti-vazamento DELE confirma que ele os lista numa **lista de termos-proibidos**, não que os usa como conteúdo de negócio. (A verificação whole-word vai casar; trate como esperado e use uma checagem manual: os termos só aparecem na rubrica "FORBIDDEN", não em prosa de domínio.)

---

## File Structure (Fase 5)

| Arquivo | Local | Responsabilidade |
| --- | --- | --- |
| `.claude/agents/agnosticism-auditor.md` | **repo do modelo** | Auditor de agnosticismo (vazamento + acoplamento de stack/forma). |
| `README.md` (mod, top-level do modelo) | repo do modelo | Nota "Evoluindo este modelo" apontando para o auditor. |

---

## Task 1: Agente `agnosticism-auditor` (+ nota no README do modelo)

**Files:** Create `.claude/agents/agnosticism-auditor.md`; Modify `README.md` (top-level do modelo).

- [ ] **Step 1: Criar o agente** `.claude/agents/agnosticism-auditor.md`. Frontmatter:
```markdown
---
name: agnosticism-auditor
description: Audita o PRÓPRIO harness-model ao evoluí-lo — caça vazamento de negócio (termos da origem) e acoplamento de stack/forma apresentado como universal. Manutenção do modelo; NÃO roda em projetos instanciados (vive no repo do modelo, não é copiado). Use sobre o diff de uma mudança no modelo.
tools: Read, Grep, Glob
---
```
Corpo (prosa) — deve conter, com sua rubrica INLINE (não há companion copiável; a rubrica vive aqui):
- **Natureza:** você é manutenção do MODELO. Você roda sobre o **diff de uma evolução do harness-model**, não num projeto instanciado. Você vive em `.claude/agents/` do repo do modelo e **não é copiado** pelo `init`.
- **Você lê e julga, não edita** (read-only). Saída = achados **Critical/Important/Minor** com `arquivo:linha` + veredito.
- **Rubrica 1 — Vazamento de negócio:** procure (grep recursivo, case-insensitive) os termos da ORIGEM: `mik`, `thor`, `cfop`, `payable`, `titulo`, `tesouraria`, `faturamento`, `nota fiscal`, `91959`, persona/agente de negócio. Cada ocorrência que carregue domínio (e não seja exemplo neutro tipo `widget`) é um achado. **Cuidado com falso-positivo:** `author` contém "thor" por substring — ignore; conte só ocorrências reais. Também: comentários de proveniência não purgados.
- **Rubrica 2 — Acoplamento de STACK como universal:** specifics (NestJS/Next/Postgres/RabbitMQ/Drizzle/Vitest/Stryker/Playwright/MkDocs) apresentados como **a** verdade em vez de **exemplo marcado** ("(ex.: ...)"). Checklist princípio-primeiro violado? Threshold (80/90) como lei em vez de "alvo calibrável"?
- **Rubrica 3 — Acoplamento de FORMA como universal:** presentation **única** assumida (em vez de múltiplas)? CQRS/assíncrono **imposto como default** (em vez de condicional-por-NFR + ADR)? Monólito modular **sem** o "extrair serviço só com razão concreta"? IA/LLM como **princípio universal** (em vez de condicional "se a app tem LLM")? Invariante de auth derivado do input em vez do claim?
- **Não-bugs (NÃO sinalize):** refs project-relative diferidas (`CLAUDE.md`, `checklists/*`, `docs/...`) que resolvem pós-`init`; o `init` legitimamente mencionar `scaffold/` (ele copia o scaffold); um identificador de domínio do projeto não é vazamento por si só.
- **Independência:** um acoplamento/vazamento real é um achado mesmo que inconveniente; o humano arbitra.

- [ ] **Step 2: Nota no README do modelo** — em `README.md` (top-level), adicionar uma nota curta "Evoluindo este modelo" (ou similar) dizendo: ao alterar o modelo, rode o agente `agnosticism-auditor` sobre o diff para garantir que nada de negócio vazou e que specifics de stack/forma seguem marcados como exemplo/condicional. (Edição cirúrgica; o README top-level NÃO é copiado pelo `init`, então é o lugar certo.)

- [ ] **Step 3: Verificação:**
```bash
cd C:/project/wk/harness-model
test -f .claude/agents/agnosticism-auditor.md && echo "agente no repo do modelo OK"
grep -qE '^name: agnosticism-auditor' .claude/agents/agnosticism-auditor.md && grep -qE '^tools: Read, Grep, Glob' .claude/agents/agnosticism-auditor.md && echo "frontmatter OK (read-only)"
grep -qiE 'vazamento|acoplamento|stack|forma|não é copiado|manutenção do modelo' .claude/agents/agnosticism-auditor.md && echo "rubricas OK"
grep -qiE 'agnosticism-auditor' README.md && echo "README aponta OK"
mkdocs build --strict >/dev/null 2>&1 && echo "mkdocs PASS" || echo FAIL; rm -rf site
```
Expected: `agente no repo do modelo OK`, `frontmatter OK (read-only)`, `rubricas OK`, `README aponta OK`, `mkdocs PASS`.

- [ ] **Step 4: Dogfood seca (no report):** dado um diff que (a) adiciona um exemplo com "payables" numa doc, (b) reescreve um princípio dizendo "o write-path é assíncrono" (sem condicional NFR), e (c) põe "rode vitest" como obrigação: o auditor sinaliza **3 achados** — vazamento (a), acoplamento de forma/CQRS-imposto (b), acoplamento de stack/threshold (c) — com `arquivo:linha`, sem editar.

- [ ] **Step 5: Commit:**
```bash
cd C:/project/wk/harness-model
git add .claude/agents/agnosticism-auditor.md README.md
git commit -m "feat(agents): agnosticism-auditor (manutenção do modelo — vazamento + acoplamento)"
```

---

## Task 2: Dogfood + não-regressão + fechamento da camada

- [ ] **Step 1: Não-regressão + inventário final:**
```bash
cd C:/project/wk/harness-model
echo "agents copiados (8):"; ls scaffold/.claude/agents/
echo "skills copiadas (5):"; ls scaffold/.claude/skills/
echo "do modelo (não copiados):"; ls .claude/skills/ .claude/agents/
mkdocs build --strict >/dev/null 2>&1 && echo "raiz PASS"; rm -rf site; (cd scaffold && mkdocs build --strict >/dev/null 2>&1 && echo "scaffold PASS"; rm -rf site)
```
Expected: 8 agents + 5 skills no scaffold; `init` + `agnosticism-auditor` no `.claude/` do modelo; ambos mkdocs PASS.

- [ ] **Step 2: Dogfood seca (report):** a camada inteira — `init` cria o projeto (copia tudo menos manutenção); dentro dele `new-slice` orquestra triagem→lentes→build(new-module|new-presentation)→QA/reviewer→DoD→new-adr; `status` responde "onde paramos"; e, de volta no MODELO, `agnosticism-auditor` guarda a evolução do próprio modelo. Confirme que manutenção (init+auditor) ≠ por-projeto, e que a camada está completa.

- [ ] **Step 3:** Ajuste+commit se necessário; senão a fase fecha na Task 1.

---

## Self-Review (preenchido)
- **Cobertura (spec §3 "+ agente de manutenção"):** agnosticism-auditor ✓ + README aponta ✓ + dogfood ✓.
- **Onde mora:** `.claude/agents/` do REPO DO MODELO — não copiado pelo `init` (init só copia `scaffold/.claude`). Distinção respeitada.
- **Exceção dos termos:** o agente NOMEIA os termos de negócio numa lista FORBIDDEN (é o trabalho dele caçá-los) — não é vazamento; verificar manualmente que só aparecem na rubrica.
- **Camada completa:** com esta fase, todas as peças da spec existem.
