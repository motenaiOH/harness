# Estado atual e próximos passos — &lt;App&gt;

> **Estilo Diátaxis — how-to (gabarito).** Este é o **template** do documento de
> continuidade repo-resident. Copie-o para `docs/how-to/current-state.md` e
> mantenha-o vivo: ao fim de **cada fatia**, adicione uma seção e atualize os
> follow-ups. É o ponto de **reinício barato** — qualquer sessão (humana ou
> agente) lê isto + o git log e retoma sem perder contexto.
>
> **Regra de ouro:** a iteração só está "pronta" quando ESTE documento **e** a
> memória do agente refletem o estado real (gates rodados, evidência colada).
> Se virar aspiracional, apodrece e mente em semanas. Atualize **na mesma
> iteração** da mudança — nunca depois.

---

> **Cabeçalho vivo (edite a cada iteração).**
>
> **Versão:** &lt;0.1.0&gt; · **Última atualização:** &lt;AAAA-MM-DD&gt; ·
> **Branch:** `<feat/...>`
>
> **Presentations ativas:** &lt;ex.: web + API (proxy same-origin, HTTP); CLI; API pública — liste as
> bordas que servem o core&gt;.
>
> **Fluxo de escrita:** &lt;síncrono (valida→persiste→responde) | assíncrono
> (CQRS/write-behind, ADR-NNNN, NFR: …)&gt;.
>
> **Resumo de uma linha do estado:** &lt;o loop ponta-a-ponta funciona; fatias
> S0..Sx entregues; LLM ainda não plugado&gt;.

---

## Como ler este documento

1. Leia o **cabeçalho vivo** acima para o estado declarado.
2. **Cruze com o git log e com a seção mais recente abaixo** — o cabeçalho pode
   estar defasado em relação às seções novas. Em conflito, a seção mais recente +
   o git log ganham.
3. Vá direto para **Follow-ups (PRÓXIMA SESSÃO COMEÇA AQUI)** para o ponto de
   entrada ordenado por valor.

---

## Follow-ups (PRÓXIMA SESSÃO COMEÇA AQUI)

> Ordenado por valor. O topo é o próximo trabalho. Mova itens daqui para uma
> seção de fatia quando concluídos.

- [ ] &lt;Próximo item de maior valor — descrição curta + por que importa&gt;
- [ ] &lt;Item seguinte&gt;
- [ ] &lt;Dívida técnica conhecida / risco rastreado (cite o ADR se houver)&gt;
- [ ] &lt;Follow-up de plataforma/infra bloqueado por dependência externa&gt;

---

## Fatias concluídas (append-only — mais recente no topo)

> Cada fatia vira uma seção. Não reescreva fatias antigas; adicione no topo.

### &lt;Sx&gt; — &lt;Título da fatia&gt; — DONE &lt;AAAA-MM-DD&gt;

**ADR:** ADR-NNNN (`../adr/NNNN-<slug>.md`) — &lt;Aceito AAAA-MM-DD&gt;.
**Branch:** `<feat/...>` · **Spec:** &lt;link, se houver&gt;.

**O que mudou**

- &lt;Mudança 1 — arquivo/módulo afetado e comportamento novo&gt;.
- &lt;Mudança 2&gt;.

**Invariantes preservadas**

- &lt;Ex.: keyless/CI inalterados; contrato externo intacto; escopo do JWT&gt;.

**Gates rodados (evidência, não afirmação)**

| Gate | Comando | Resultado |
|---|---|---|
| typecheck | `pnpm typecheck` | &lt;✓&gt; |
| lint | `pnpm lint` | &lt;✓ (0 warnings)&gt; |
| unit/property | `pnpm test` | &lt;✓ N testes&gt; |
| integração | `pnpm test:int` | &lt;✓&gt; |
| e2e | `pnpm test:e2e` | &lt;✓&gt; |
| cobertura | `pnpm --filter @app/api test:cov` | &lt;✓ ≥ 80%&gt; |
| mutação | `pnpm --filter @app/api mutation` | &lt;✓ ≥ 90%&gt; |
| audit | `pnpm audit --audit-level high` | &lt;✓ sem high/critical&gt; |
| docs | `mkdocs build --strict` | &lt;✓&gt; |
| OpenAPI drift | `openapi:generate` + `git diff --exit-code` | &lt;✓ sem drift&gt; |

**Verificação manual** (obrigatória em fatias que tocam web)

- &lt;UI renderizada verificada via &lt;ferramenta&gt;; print/observação&gt;.

---

### &lt;S0&gt; — Walking skeleton — DONE &lt;AAAA-MM-DD&gt;

**O que mudou:** loop ponta-a-ponta com o contrato de saída real, sem ainda
introduzir abstrações (registry/LLM). Prova o caminho crítico determinístico.

**Gates:** &lt;cole a evidência&gt;.

---

## Mapa de capacidades (snapshot)

> Visão rápida do que existe hoje. Atualize quando uma fatia adicionar uma
> capacidade transversal.

> Marque como N/A as capacidades que **não** se aplicam à sua forma (Passo 0):
> as anotadas "se variante assíncrona" só valem com write async; "se presentation
> web + API (proxy same-origin)" só com essa borda; "se há worker" só quando existe o 2º entrypoint.

| Capacidade | Estado | Onde |
|---|---|---|
| Write-path síncrono (valida→persiste→responde) | &lt;✓ | N/A se variante assíncrona&gt; | `modules/<feature>` (use-case) |
| Write async + persistência no worker *(se variante assíncrona)* | &lt;✓ | N/A&gt; | `modules/<feature>`, `worker.ts` |
| Auth dois segredos, Bearer server-side *(se presentation web + API (proxy same-origin))* | &lt;✓ | N/A&gt; | `web/lib/api-token.ts`, `api/auth/*` |
| Contrato fonte única (zod + OpenAPI snapshot) | &lt;✓&gt; | `packages/contracts`, `openapi.json` |
| Uma imagem, três comandos *(se há worker)* | &lt;✓ | dois comandos se síncrono&gt; | `Dockerfile`, `compose.yaml` |
| Observabilidade best-effort | &lt;✓&gt; | `otel.ts` |
| Enforço em 3 camadas | &lt;parcial: branch protection pendente&gt; | `.husky/*`, `ci.yml` |
| Camada agents/skills (new-slice/new-module/architect/matriz) | &lt;ativa — backbone; QA/reviewer + condicionais em fases futuras&gt; | `.claude/` |
| LLM atrás de port | &lt;não plugado&gt; | — |

---

## Riscos e dívidas conhecidas

- &lt;Risco 1 — descrição + ADR/follow-up associado&gt;.
- &lt;Ex.: branch protection decidida mas bloqueada por limitação de plataforma —
  é item aberto real, não afirmação de que `main` está protegida&gt;.
- &lt;Ex.: o gate de eval precisa ser redesenhado para não-determinismo no momento
  em que um LLM real for plugado atrás do port&gt;.
