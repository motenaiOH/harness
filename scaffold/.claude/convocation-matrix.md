# Matriz de convocação

> Lida pela TRIAGEM do `new-slice`. A triagem propõe o MÍNIMO que cobre o risco;
> o humano confirma/ajusta. Sub-convocar é o default.

## Gatilho → lente
| A fatia… | Acorda |
| --- | --- |
| define valor/escopo novo ou ambíguo | Produto |
| muda forma (presentations, síncrono↔CQRS, extrair serviço) ou NFR ambíguo | Arquiteto |
| toca schema/agregado, migração, read-model, índice, PII | Dados |
| toca uma presentation com UI | UI/UX |
| muda comportamento (qualquer código de regra) | QA + harness-reviewer (baseline) |
| toca infra/deploy | SRE/DevSecOps |
| decisão depende de evidência externa | Pesquisador |

## Modificadores estágio × risco
- Protótipo/interno → SRE off; Produto/Arquiteto em modo leve (sem ADR formal).
- Produção/cliente-facing → SRE on em mudança de infra; QA mais fundo.
- Risco alto (segurança/dado sensível/irreversível) → eleva Dados/SRE e FORÇA ADR.

## Dose (exemplos)
| Fatia | Lentes |
| --- | --- |
| rename/texto, sem comportamento | nenhuma → build + DoD |
| +1 campo num form web | UI/UX + QA + reviewer |
| novo agregado + read-model em produção | Produto + Arquiteto + Dados + QA + SRE + reviewer + ADR |

> Nota: a matriz lista todas as 7 lentes (Produto, Arquiteto, Dados, UI/UX, QA,
> SRE/DevSecOps, Pesquisador). **Arquiteto, QA e harness-reviewer já existem; as demais
> (Produto, Dados, UI/UX, SRE/DevSecOps, Pesquisador) são fase futura.** A triagem já as
> conhece ao ler esta tabela.
