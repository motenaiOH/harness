---
name: new-adr
description: Cria o próximo ADR numerado a partir do template e o adiciona ao nav do mkdocs. Use para registrar uma decisão arquitetural (forma/NFR, dado, deploy, etc.).
---

# new-adr — registrar uma decisão arquitetural (ADR numerado)

Esta skill cria o **próximo ADR** (Architecture Decision Record, formato Nygard) a partir
do template, no formato imutável do harness, e o liga ao nav do site de docs para o gate
estrito não quebrar. ADR = **log de decisão**: captura o PORQUÊ e o trade-off de uma
decisão arquitetural — escrito **junto** com a mudança que ele decide (doc-as-code).

**Compõe, não reinventa.** O formato, as seções fixas, a regra de imutabilidade e o DoD do
ADR já vivem no checklist `checklists/new-adr.md`. Esta skill **NÃO os reescreve** — ela os
**executa**: descobre o número, copia o template, preenche em Nygard e roda o checklist como
gate final. Se a forma da decisão estiver em dúvida, ela é produto do agente `architect`,
não desta skill.

## Pré-requisitos (recolher antes de tocar em arquivo)

1. **A decisão** — uma frase no presente do indicativo ("Adotar X"), com o contexto/forças.
2. **Um `<slug>`** curto em kebab-case para o nome do arquivo (ex.: `adotar-cqrs`).
3. Se a decisão ainda não está madura (NFR ambíguo, risco de forma), **não invente**:
   convoque o agente `architect` primeiro — ele decide a forma e devolve o conteúdo.

## Procedimento

### 1. Descobrir o próximo número sequencial

Varra `docs/adr/` e tome o **maior `NNNN`** dos arquivos existentes; o próximo é
`maior + 1`, sempre com **4 dígitos** (ex.: último é `0011` → o novo é `0012`). O
`0000-adr-template.md` conta como `0000`, mas é template, não decisão — não o sobrescreva.

### 2. Copiar o template

Copie `docs/adr/0000-adr-template.md` → `docs/adr/NNNN-<slug>.md`. Parta sempre do
template — ele já traz as seções fixas na ordem certa.

### 3. Preencher no formato Nygard

Edite o novo arquivo seguindo o template e o `checklists/new-adr.md`:

- **Título**: `# ADR-NNNN — <decisão em uma frase>`.
- **Status**: `Proposto` ou `Aceito` (mais a data, `AAAA-MM-DD`).
- **Contexto**: o problema e as forças em jogo — **sem a solução ainda**.
- **Decisão**: o que foi decidido, **em voz ativa / presente do indicativo** ("Adotar X").
- **Consequências**: o que melhora **e** o que passa a exigir cuidado (o trade-off honesto).

Use a **linguagem ubíqua** — os mesmos termos do código/contrato/docs; não introduza
sinônimos.

### 4. Adicionar ao nav do site de docs

Inclua a página nova na seção de ADRs do `mkdocs.yml` (ex.:
`- ADR-NNNN <título>: adr/NNNN-<slug>.md`). **Sem isso o `mkdocs build --strict` quebra**
(página fora do nav / link órfão) — é o gate que garante que o ADR está acessível. Em
outra stack de docs, o equivalente é o modo estrito do Docusaurus/Antora.

### 5. Imutabilidade (regra inegociável)

Um ADR **Aceito nunca é editado**. Mudou de rumo → crie um **ADR substituto** novo (volte
ao passo 1). A **única** edição permitida no antigo é o ponteiro de status:
`Substituído por ADR-MMMM`. Não reabra a decisão no lugar — registre a nova.

### 6. Rodar o checklist como gate

Percorra `checklists/new-adr.md` e confirme cada caixa (estrutura, imutabilidade,
numeração/link, nav). Commite o ADR **junto** com a mudança de código/contrato que ele
decide — não depois.

## Saída

Reporte: o **número escolhido** (e como foi descoberto), o **arquivo criado**
(`docs/adr/NNNN-<slug>.md`), a **linha adicionada ao nav** do `mkdocs.yml`, e a confirmação
de que `mkdocs build --strict` passa. Se foi um substituto, aponte qual ADR foi marcado
como "Substituído".
