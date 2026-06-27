# Nova fatia vertical — checklist

Uma **fatia vertical** atravessa o sistema inteiro (uma presentation [UI / CLI / API /
integração] → API → orquestração → dado → contrato de saída) e é **demoável, testável e
deployável por si só**. Nunca fatie por camada horizontal ("todos os readers, depois
todas as tools") — isso destrói a propriedade de cada incremento ser entregável ponta a
ponta. **Demoável** = exercitável ponta a ponta **na presentation que serve** (UI no
browser; CLI/API por sessão/curl real).

> Placeholders: `<App>`, `<Feature>`, `<Entity>`, `<Presentation>`. Substitua ao adotar.

## Princípios da fatia

- [ ] A fatia é **genuinamente vertical** (atravessa o sistema) e demoável sozinha na
      presentation que serve.
- [ ] **Determinístico primeiro:** o caminho crítico funciona **sem LLM**; IA/LLM entra
      atrás de um port (adapter) numa fatia posterior e só "explica/organiza", nunca "decide".
- [ ] Se for a primeira fatia (S0), é um **walking skeleton**: prova o loop ponta a ponta
      com o contrato de saída real, sem introduzir ainda as abstrações que virão depois.

## Ciclo em 5 fases (cada uma com artefato versionado)

- [ ] **Brainstorm** — decisões registradas.
- [ ] **Spec de design** em `docs/specs/AAAA-MM-DD-<slice>-design.md` (objetivo,
      decisões, mudanças de contrato, testes do DoD, fora de escopo, riscos).
- [ ] **Plano executável** em `docs/plans/AAAA-MM-DD-<slice>.md` (sub-skill obrigatória,
      goal, link spec+ADR, sequencing rationale, tarefas em checkbox com Steps que nomeiam
      arquivo + gate + commit Conventional).
- [ ] **Execução** (subagent-driven), Step a Step.
- [ ] **ADR** em `docs/adr/NNNN-*.md` para cada decisão arquitetural.

## Sequenciamento de mudança breaking

- [ ] Task aditiva primeiro (verde sozinha).
- [ ] **Princípio:** a fronteira breaking atravessa **todos os lados** (contrato + backend
      + lado assíncrono, se houver + cada presentation afetada) **num único commit verde** —
      landar camadas parciais quebra tudo. Onde o gate de tipos é abrangente (ex.: monorepo
      TS), o typecheck pega a quebra parcial; sem isso, garanta a atomicidade por outro meio.
- [ ] Task final só de docs/ADR/continuidade.

## Definition of Done da fatia

- [ ] Todos os gates do [definition-of-done.md](./definition-of-done.md) verdes (cole evidência).
- [ ] **Spot-check real na presentation que serve** ao fim: UI renderizada via browser;
      CLI/API via sessão/curl real (vários bugs — saída embrulhada em markdown, binding de
      fila errado — só a verificação real pega, não os testes automatizados).
- [ ] Verificação pesada (docker/e2e/mutação) rodada **em background**, não escondida
      num subagente síncrono (trava a sessão).

## Continuidade (reentrada barata)

- [ ] `docs/how-to/current-state.md`: nova seção append-only no topo com "o que mudou",
      invariantes preservadas, gates rodados com evidência.
- [ ] Seção **"Follow-ups — PRÓXIMA SESSÃO COMEÇA AQUI"** atualizada, ordenada por valor.
- [ ] Memória do agente atualizada na **mesma** iteração (espelha o current-state).

### Commit/PR

- [ ] Mensagens em **Conventional Commits** (alimentam changelog/semver/release).
- [ ] Trabalho em `feat/*`, PR com status checks verdes antes do merge (branch `main`
      protegida **quando a plataforma permite** — branch protection é platform-gated).
