# Design — Conjunto de agents/skills do harness-model

- **Data:** 2026-06-27
- **Status:** Aprovado (design); aguarda plano de implementação
- **Repo:** `harness-model` (este modelo)
- **Objetivo:** tornar o harness-model *executável* — não só documentado — via uma camada
  de **skills** (procedimentos) e **role-agents** (julgamento independente) que dirige a
  autoria e revisa contra as próprias regras do modelo, sob demanda.

## 1. Decisões travadas (forks do brainstorm)

| Fork | Decisão |
| --- | --- |
| Escopo | **D — conjunto completo** (todos os papéis e skills desenhados; implementação sequenciada). |
| Convocação | **Triagem propõe → humano confirma** (painel sob demanda, não comitê permanente). |
| Forma dos papéis | **Híbrido** — papéis são **subagents** (independência adversarial) + um **checklist-companion** (o "contrato de pensamento"); as **skills** orquestram e os invocam. |

## 2. Taxonomia: 4 primitivas e onde cada uma mora

| Primitiva | Papel |
| --- | --- |
| **Hook** | *enforça* (determinístico) — pre-commit/CI já existentes. |
| **CLAUDE.md** | *contexto sempre-ligado* — princípios/DoD. |
| **Skill** | *orquestra um procedimento* (ex.: `harness:new-slice`). |
| **Role-agent** | *julgamento independente* (subagent + checklist). |

**Onde moram (dois públicos):**

- **Construir o app instanciado** → `scaffold/.claude/{skills,agents}/` — **copiados** com o
  scaffold; versionam com o projeto.
- **Manter o próprio modelo** → `.claude/` do **repo do harness-model** — **não** copiados
  (ex.: `agnosticism-auditor`, e a skill `init`).

**Regras-mãe:**

- Nada de skill/agent que **só repita** o `CLAUDE.md`/checklist (o agente já os carrega). A
  peça precisa *fazer algo* (gerar arquivos, numerar um ADR, rodar uma sequência, trazer
  julgamento independente).
- Skills **compõem** as `superpowers` (`brainstorming`, `writing-plans`,
  `subagent-driven-development`, `verification-before-completion`, `test-driven-development`)
  — não reinventam.
- Papéis **expõem; o humano decide; a decisão fica registrada** (sem override silencioso, sem
  teatro de consenso entre agentes).

## 3. Os 7 papéis (role-agents) + contratos

Cada papel = **decisão que possui · input · artefato que persiste · gatilho · onde mora**.
Forma: subagent + checklist-companion. Todos em `scaffold/.claude/agents/` salvo indicação.

| Papel | Possui (decisão) | Input | Artefato | Gatilho |
| --- | --- | --- | --- | --- |
| **Arquiteto** | forma & NFR: presentations, síncrono×CQRS, extrair-serviço?, orçamentos (latência/escala/consistência) | intenção da fatia + NFRs elicitados | **ADR** de forma/NFR | novo bounded context; mudança de forma; NFR ambíguo |
| **Dados** *(profundidade; par do arquiteto)* | schema/agregado, segurança de migração, índice/query, read-model+consistência, integridade/idempotência, PII/retenção | o agregado/mudança + a decisão de forma | plano schema+migração+índice (ADR se significativo) | novo agregado; migração; read-model; índice/perf; PII |
| **QA** | adequação + rastreabilidade critério→teste; cobertura por risco; qualidade do teste (assere outcome, camada certa) | critérios de aceite + mudança + testes atuais | **mapa de rastreabilidade** + veredito de adequação | qualquer mudança de comportamento (peso ↑ com risco) |
| **Produto** *(condicional ao domínio; só no projeto)* | valor + corte da fatia (vertical, demoável, mínima) + critérios de aceite; desafia gold-plating | intenção/objetivo do humano | definição da fatia + aceite | definição/ambiguidade de fatia ou escopo |
| **SRE/DevSecOps** *(par operacional do arquiteto)* | operacionalizar confiabilidade: SLO/SLI, resiliência (timeout/retry/CB/degradação), rollout/rollback + ordem de migração, capacidade, incidente/runbook; + hardening IaC/pipeline/secrets | NFR confiabilidade/segurança + mudança de deploy/infra | SLOs + revisão de prontidão p/ deploy + runbook (ADR se significativo) | proximidade de produção; mudança de infra/deploy |
| **Pesquisador** *(transversal)* | evidência externa que valida/informa uma decisão (não decide — corrobora); verificação adversarial | pergunta/claim de **qualquer** decisor | **brief com fontes citadas** | uma decisão depende de evidência externa |
| **UI/UX** *(condicional por-presentation)* | UX de presentation **com UI**: fluxo/IA, acessibilidade (WCAG), estados (erro/vazio/loading), responsivo, consistência com design system, verificação de render | a fatia + aceite + a presentation alvo | revisão de UX/acessibilidade + (quando gera) telas; veredito de render | fatia que toca presentation com UI |

**+ agente de manutenção do modelo (fora do scaffold):**

- **`agnosticism-auditor`** (`.claude/` do repo do modelo) — caça acoplamento de stack/forma e
  vazamento de conhecimento de negócio nos templates/skills/docs. Codifica o que foi feito à
  mão durante a construção do modelo. Gatilho: evoluir o próprio modelo.

**Distinções que evitam redundância:**

- **QA × mutação × harness-reviewer:** mutação prova *mecanicamente* que o teste assere; **QA**
  decide *o que* testar (rastreabilidade/risco); **harness-reviewer** revisa o *código de
  produção*. Três coisas distintas.
- **Arquiteto × Dados × SRE:** arquiteto = *largura* (decide o NFR); Dados e SRE = *profundidade*
  (operacionalizam, cada um na sua camada). Fazem par, não competem.
- **Pesquisador** serve todos os decisores (não só Produto). **UI/UX** só ativa quando há
  presentation com UI; num app API/CLI-only nunca acorda.
- **Camadas finas sobre o que já existe:** Pesquisador ∘ `deep-research`; UI/UX ∘
  `frontend-design` + Figma MCP + Playwright MCP. Baixo custo de construção.

> **`harness-reviewer`** (revisor de código contra as regras do modelo: regra de dependência,
> escopo-do-claim, sem vazar id interno, contract-first, CQRS-só-sob-NFR, princípio-primeiro)
> é o **reviewer baseline** que roda junto do QA em toda mudança de código. Vive em
> `scaffold/.claude/agents/`.

## 4. As 6 skills (a máquina que orquestra)

Em `scaffold/.claude/skills/`, **exceto `init`** (no `.claude/` do repo do modelo — é a skill
que *instancia* o modelo; não faz sentido morar dentro do que ela copia).

| Skill | O que orquestra | Compõe | Convoca (via triagem) |
| --- | --- | --- | --- |
| **`new-slice`** *(espinha)* | o ciclo da fatia ponta a ponta | `brainstorming` → `writing-plans` → `subagent-driven-development` → `verification-before-completion` + TDD | a triagem → as lentes do gatilho |
| **`new-module`** *(maior gap)* | materializa as 4 camadas a partir dos READMEs de camada; liga composition root; gera contrato + esqueleto de teste | TDD | Dados (se data-significativo) |
| **`new-presentation`** | scaffolda um novo adapter de borda (CLI/API pública/…) sobre use-cases existentes | — | UI/UX (se tem tela) |
| **`new-adr`** | próximo ADR numerado do template + entra no nav do mkdocs | — | — |
| **`status`** *(read-only)* | responde "onde paramos / próximo passo / há objeção aberta?" lendo `current-state` + plano aberto + git — **sem** entrar no `new-slice` | — | — |
| **`init`** *(repo do modelo)* | bootstrap: copia scaffold, renomeia escopo, **Passo-0** (forma/NFR), purga proveniência, roda o guard anti-vazamento | — | Arquiteto; Pesquisador (se valida ideia) |

**O passo de triagem dentro do `new-slice` (o coração):**

```
new-slice
  └─ 0. RETOMADA: detecta slice em voo (plano com caixas abertas / branch / current-state)
         → retoma de onde parou; senão, começa novo (ver §7)
  └─ 1. TRIAGEM (barata): lê {tipo de mudança × estágio × risco}
         → PROPÕE quais lentes acordar + porquê  →  humano confirma/ajusta
  └─ 2. Produto (se convocado): corta a fatia + critérios de aceite
  └─ 3. Arquiteto (se convocado): forma/NFR → ADR   [Pesquisador se precisa evidência]
  └─ 4. Build: new-module / TDD       [Dados se migração/agregado; UI/UX se tela]
  └─ 5. QA + harness-reviewer: rastreabilidade + revisão de código
  └─ 6. DoD gate (verification-before-completion) → atualiza ADR + current-state
```

Fatia trivial: a triagem propõe "nenhuma lente extra" e vai direto pro build + DoD.

## 5. Matriz de convocação (entregável central)

A triagem lê a fatia em 3 eixos (o que toca × estágio × risco) e propõe lentes. É a **tabela de
regras** que o passo 0 do `new-slice` consome (config legível, versionada no scaffold).

**Por tipo de mudança (gatilho → lente):**

| A fatia… | Acorda |
| --- | --- |
| define valor/escopo novo ou ambíguo | **Produto** |
| muda forma (presentations, síncrono↔CQRS, extrair serviço) ou NFR ambíguo | **Arquiteto** |
| toca schema/agregado, migração, read-model, índice, PII | **Dados** |
| toca uma presentation com UI | **UI/UX** |
| muda comportamento (qualquer código de regra) | **QA + harness-reviewer** *(baseline)* |
| toca infra/deploy | **SRE/DevSecOps** |
| uma decisão depende de evidência externa (mercado/usuário/viabilidade de lib) | **Pesquisador** |
| evolui o próprio modelo (não um projeto) | **agnosticism-auditor** *(repo do modelo)* |

**Modificadores de estágio × risco:**

- **Protótipo/interno** → SRE *off*; Produto/Arquiteto em modo leve (sem ADR formal).
- **Produção/cliente-facing** → SRE *on* por padrão em mudança de infra; QA mais fundo.
- **Risco alto** (segurança, dado sensível, irreversível) → eleva Dados/SRE-DevSecOps **e força ADR**.

**A dose, na prática:**

| Fatia | Lentes que acordam |
| --- | --- |
| corrige texto/rename, sem comportamento | **nenhuma** → build + DoD |
| +1 campo num form web existente | UI/UX + QA + reviewer (3) |
| novo agregado com read-model num serviço em produção | Produto + Arquiteto + Dados + QA + SRE + reviewer (+ Pesquisador se incerto) → **ADR obrigatório** |

**Regra de ouro:** a triagem propõe o **mínimo que cobre o risco**; sub-convocar é o default;
o humano sobe a dose. Sempre é possível adicionar/remover uma lente antes de seguir.

## 6. Fluxo + conflito entre lentes (o "error handling" do painel)

- **Objeção bloqueante** (QA: testes inadequados; SRE: não pronto p/ deploy; Dados: migração
  insegura; reviewer: bug) → **achado bloqueante com fix exigido** que volta pro build; nunca
  silenciosamente sobrescrito. A lente entrega *veredito + o que corrigir*.
- **Duas lentes discordam** (Arquiteto×Produto; UI/UX×Dados) → **trade-off que o humano
  arbitra**. Os agentes **expõem a tensão; não negociam consenso entre si**. Discordância **e**
  resolução ficam registradas (ADR ou spec da fatia).
- **Humano sobrepõe uma lente** → permitido, mas **override + justificativa ficam registrados**
  (ex.: "pulei SRE — protótipo interno, risco X aceito"). Auditável.

**Princípio:** lentes expõem, humano decide, decisões ficam no registro; independência
preservada (uma lente pode constar dissidente mesmo vencida); o escrutínio escala ao risco.

## 7. Orquestração & continuidade

**Não há agente-orquestrador separado: o maestro é o loop principal**, com a *partitura* do
`new-slice`. Um subagent é spawned-faz-retorna-morre; quem persiste pelo slice inteiro e invoca
skills/agents é o **loop principal (a conversa)**. Um orquestrador que guardasse o estado no
próprio contexto seria **ponto único de falha** e violaria o princípio do modelo (*estado mora no
repo; reinício barato*).

A orquestração é **dividida em 3 mecanismos** — não depende da memória de nenhum agente:

| Pergunta | Quem responde | Onde |
| --- | --- | --- |
| onde estamos *agora* (nesta sessão)? | **task list** que o `new-slice` cria/atualiza por passo | memória da sessão |
| onde **paramos** / qual o **próximo passo**? | **checkboxes do plano** + commits + `current-state.md` + ADRs | **repo-resident** (sobrevive a sessões) |
| o fluxo **realmente** rodou (gates)? | **hooks + DoD gate** (`verification-before-completion`) | enforço determinístico |

A *diligência* do maestro **não é confiada — é checada**: o hook bloqueia o commit, o CI bloqueia
o merge. "Onde paramos" não é lembrança de agente — é **ler o plano + git log + `current-state`**.
Compõe `writing-plans` (gera o plano/checkboxes) + `executing-plans`/`subagent-driven-development`
(executa rastreando o progresso).

**Retomada (resume) — `new-slice` é idempotente:** ao ser (re)invocado, ele **primeiro detecta**
se há um slice em voo (plano com caixas abertas / branch do slice / `current-state` "em
andamento") e **retoma de onde parou**, em vez de recomeçar. O **arquivo do plano é a fonte de
verdade do progresso** (checkboxes); o git é a evidência; o `current-state` é o ponteiro legível.
(Análogo ao `resumeFromRunId` do Workflow, para o slice guiado por humano.)

**`harness:status` (skill read-only):** lê `current-state` + plano aberto + git e responde "onde
estamos / qual o próximo passo / há objeção aberta?" **sem** entrar no `new-slice`. Barata; é o
comando para a pergunta "onde paramos?".

## 8. Validação da própria ferramenta

- **Dogfood:** rodar `new-slice`/`new-module` sobre a feature-exemplo (`<feature>`/widget) do
  scaffold e conferir os arquivos gerados + o disparo correto das lentes pela matriz. O domínio
  trivial do scaffold é o *fixture*.
- **Checklist = spec testável** de cada agente: a saída é avaliada contra o checklist-companion.
- **`agnosticism-auditor`** roda sobre os próprios templates/skills para garantir que não vazam
  negócio nem acoplam stack indevidamente.

## 9. Sequência de implementação (mesmo com D = tudo, há dependência)

1. **Backbone:** `new-slice` (com triagem **e retomada**) + a **matriz** (config que a triagem lê)
   + **Arquiteto** + `new-module`.
2. **Baseline:** **QA + harness-reviewer** (toda fatia usa).
3. **Especialistas condicionais:** Dados, SRE/DevSecOps, UI/UX (∘ frontend-design/figma),
   Pesquisador (∘ deep-research), Produto.
4. **Skills restantes:** `status`, `new-presentation`, `new-adr`, `init`.
5. **Manutenção do modelo:** `agnosticism-auditor` (no repo do modelo).

Cada peça é pequena; a ordem garante que a espinha funciona antes de pendurar especialista.

## 10. Onde cada coisa mora (resumo)

| Item | Local |
| --- | --- |
| `new-slice`, `new-module`, `new-presentation`, `new-adr`, `status` | `scaffold/.claude/skills/` (copiadas) |
| `init` | `.claude/` do repo do modelo |
| Arquiteto, Dados, QA, Produto, SRE/DevSecOps, Pesquisador, UI/UX, harness-reviewer | `scaffold/.claude/agents/` (copiados) |
| `agnosticism-auditor` | `.claude/` do repo do modelo |
| Matriz de convocação (config) | `scaffold/.claude/` (lida pela triagem do `new-slice`) |
| Checklists-companion | reusam/estendem `scaffold/checklists/` |

## 11. Fora de escopo (YAGNI)

- Nenhum agente que apenas paráfrase o `CLAUDE.md`/checklist.
- Sem auto-roteamento opaco (a convocação é sempre proposta-e-confirmada).
- Sem consenso automático entre agentes (o humano arbitra trade-offs).
- Analytics/warehouse/ETL **não** entram no papel de Dados (seria outro papel, só se o projeto
  ganhar um plano de relatório).
- UI/UX não tenta ser designer sênior: dono das partes checklist-áveis + sinaliza quando um
  humano designer é necessário.
