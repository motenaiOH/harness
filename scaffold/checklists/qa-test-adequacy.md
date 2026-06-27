# Adequação de teste & rastreabilidade — checklist do QA

> A pirâmide e os runners vivem em `checklists/testing-strategy.md`. Aqui é o que o QA
> julga ALÉM do mecânico: o teste garante o que PRECISA ser garantido?

- [ ] **Rastreabilidade:** cada critério de aceite da fatia mapeia para ≥1 teste concreto (critério → arquivo:teste).
- [ ] **Cobertura por risco:** os caminhos perigosos/edge cases/invariantes de segurança da fatia têm teste (não só o caminho feliz).
- [ ] **Assere OUTCOME, não implementação:** o teste falharia se o comportamento quebrasse — não só se a estrutura interna mudasse; sem tautologia, sem asserção só de mock.
- [ ] **Camada certa:** unidade para regra de domínio; integração para borda de dado/contrato; e2e para o fluxo da presentation; eval só se houver etapa não-determinística.
- [ ] **Lado de leitura (se CQRS):** se há read model, a leitura é testada como cidadã de 1ª classe (consistência eventual via polling).
- [ ] **Distinto da mutação:** a mutação prova que o teste assere; o QA decide SE testamos as coisas certas (rastreabilidade/risco) — os dois são exigidos.
