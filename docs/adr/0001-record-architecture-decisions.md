# ADR-0001 — Registrar decisões de arquitetura

- Status: Aceito
- Data: 2025-01-01 <!-- data de exemplo — use `date` na adoção real no seu projeto -->

## Contexto

Precisamos de um registro **leve, versionado e consultável** das decisões
técnicas do harness, seguindo a abordagem *Doc as Code*: a decisão mora no
repositório, versiona junto com o código e acompanha a mudança no mesmo PR — não
é um artefato posterior que apodrece num wiki. Sem um log de decisões, o
*porquê* de cada escolha se perde, e a próxima pessoa (ou agente) re-debate o que
já foi resolvido.

## Decisão

Adotar **ADRs** (Architecture Decision Records) em `docs/adr/`, no formato de
**Michael Nygard**, numerados sequencialmente e publicados via MkDocs Material.

- Cada ADR tem três seções obrigatórias — **Contexto**, **Decisão**,
  **Consequências** — mais o cabeçalho **Status** / **Data**.
- O modelo a copiar é [`0000-adr-template.md`](0000-adr-template.md).
- A numeração é um **identificador permanente**: gaps são tolerados (um ADR
  ausente é OK) e nada é renumerado, porque links e referências cruzadas apontam
  para o número.
- Toda decisão arquitetural relevante gera um ADR — incluindo decisões de
  **processo** (ex.: adotar branch protection) e de **stack**.

## Consequências

- As decisões ficam rastreáveis no histórico do repositório e navegáveis no site
  de docs.
- **Imutabilidade do ADR aceito:** nunca edite o corpo de um ADR com Status
  "Aceito". Mudou a decisão? Crie um **ADR substituto** que referencia e
  *supersede* (total ou parcialmente) o anterior, e marca o anterior como
  "Substituído por ADR-NNNN". O histórico de decisões é *append-only*. O único
  toque permitido num ADR aceito é atualizar seu campo **Status** para apontar
  ao substituto.
- O gate `mkdocs build --strict` no CI transforma "ADR fora do `nav`" ou "link
  quebrado entre ADRs" em falha de build — documentação podre não passa pelo
  merge.
- A supersessão pode ser **parcial**: um ADR novo pode substituir só uma parte
  de um ADR antigo (ex.: trocar o mecanismo de credenciais) e deixar o resto
  (ex.: a regra de isolamento) intacto e ainda vigente.
