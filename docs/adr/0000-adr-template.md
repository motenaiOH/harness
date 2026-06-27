# ADR-NNNN — &lt;Título curto e imperativo da decisão&gt;

> **Como usar este template.** Copie este arquivo para
> `docs/adr/NNNN-<slug>.md`, atribua o **próximo número sequencial** (gaps são
> OK — números são identificadores estáveis, nunca renumerados nem
> reaproveitados), preencha as seções e abra o PR junto com a mudança que a
> decisão descreve. Formato Michael Nygard: o ADR captura o **porquê** e o
> **trade-off**, não a implementação. Remova este blockquote ao preencher.

- Status: Proposto <!-- Proposto | Aceito | Rejeitado | Substituído por ADR-NNNN -->
- Data: AAAA-MM-DD
<!-- Opcionais, quando aplicável: -->
<!-- - Spec: [docs/...-design.md](../...-design.md) -->
<!-- - Relaciona: [ADR-XXXX](XXXX-....md) -->

## Contexto

Qual é a força que motiva a decisão? O que está em jogo? Descreva o problema,
as restrições (técnicas, de prazo, de plataforma) e as alternativas
consideradas — fatos e necessidades, não a solução ainda. Se houver dado de
medição (latência, custo, vulnerabilidade), cite-o aqui.

## Decisão

A decisão tomada, em voz ativa ("Adotar X", "Mover Y para Z"). Decisões de
**forma arquitetural** são registráveis aqui — por exemplo: "adotar write-path
**assíncrono/CQRS** no contexto X porque o NFR Y (assimetria r/w, escala de
leitura, picos, fan-out) o justifica, aceitando o custo de read-your-writes
eventual"; "definir o **conjunto de presentations** servido pelo core (ex.:
web + API (proxy same-origin) + CLI + API pública)"; "extrair o módulo Z para serviço sob o NFR W".
O default (write síncrono, presentation única, monólito modular) é o ponto de
partida; cada desvio dele é uma decisão que mora num ADR. Quando houver uma
escolha entre opções, use uma tabela:

| Área | Escolha | Motivo |
|---|---|---|
| ... | ... | ... |

Quando a decisão muda um contrato/ambiente, documente o antes/depois:

| Variável / Aspecto | Antes | Depois |
|---|---|---|
| ... | ... | ... |

## Consequências

O que fica mais fácil e o que fica mais difícil depois desta decisão. Inclua o
custo aceito conscientemente (dívida), os follow-ups gerados e o impacto nos
gates do DoD.

<!--
## Supersessão (incluir SOMENTE quando este ADR substitui outro)

### Supersede (parcial|total) do ADR-XXXX

Diga EXATAMENTE qual parte do ADR-XXXX foi substituída e qual permanece válida
(a supersessão pode ser parcial). Termine com:

> Não editar o ADR-XXXX (Aceito) — este ADR é o registro substituto.

E marque, no ADR-XXXX, o Status como "Substituído por ADR-NNNN". (Editar SÓ o
campo Status do ADR anterior é o único toque permitido num ADR aceito; o corpo
permanece intacto.)
-->
