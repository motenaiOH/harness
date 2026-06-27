# Novo ADR — checklist

ADR = **Architecture Decision Record** (formato Nygard). É um **log de decisão
imutável**: captura o PORQUÊ e o trade-off de uma decisão arquitetural. Vive em
`docs/adr/NNNN-<titulo>.md`, numerado sequencialmente.

> Doc-as-code: o ADR é escrito **junto** com a mudança, na mesma alteração — não depois.

## Quando criar um ADR

- [ ] A mudança envolve uma **decisão arquitetural** (escolha de padrão, trade-off,
      política de gate, allowlist vs denylist, dois-segredos, broker, versionamento…).
- [ ] Uma **exceção a um gate** precisa ser registrada (ex.: advisory high+ sem correção
      viável → ADR **antes** de seguir).

## Estrutura (seções fixas)

- [ ] **Título**: `# ADR-NNNN — <decisão em uma frase>`.
- [ ] **Status**: Proposto / Aceito / Substituído por ADR-MMMM / Rejeitado.
- [ ] **Data**: AAAA-MM-DD.
- [ ] **Contexto**: o problema e as forças em jogo (sem a solução ainda).
- [ ] **Decisão**: o que foi decidido, no presente do indicativo ("Adotar X").
- [ ] **Consequências**: o que melhora **e** o que piora / passa a exigir cuidado.
- [ ] **Follow-ups adiados** (opcional): itens conscientemente deixados para depois,
      para não se perderem.

## Imutabilidade (regra inegociável)

- [ ] **Não editar** um ADR aceito. Mudou de rumo → criar um **ADR substituto** novo.
- [ ] O ADR substituto marca o anterior; o anterior recebe status
      "Substituído por ADR-MMMM" (única edição permitida: o ponteiro de status).

## Numeração e link

- [ ] Número sequencial seguinte ao último ADR existente.
- [ ] Linkado a partir da spec/plano da fatia e do `current-state.md` quando relevante.
- [ ] Linguagem ubíqua: usa os mesmos termos de domínio do código/contrato/docs.

## DoD do ADR

- [ ] Arquivo criado em `docs/adr/NNNN-<slug>.md` e **adicionado à navegação do site de docs**.
- [ ] **Princípio:** o build estrito do site de docs falha em link quebrado / página fora
      do nav, garantindo que o ADR está acessível (ex.: `mkdocs build --strict`; em outras
      stacks, o modo estrito do Docusaurus / Antora).
- [ ] Commitado **junto** com a mudança de código/contrato que ele decide.
