# Decisão de forma & NFR (Passo-0) — checklist do Arquiteto

- [ ] Quais **presentations** servem esta capacidade? (web/mobile/CLI/API pública/integração) — cada uma é um adapter de borda.
- [ ] **Síncrono por default.** Há um NFR concreto (assimetria r/w, escala de leitura, picos, desacoplamento, fan-out) que justifique CQRS/assíncrono? Se não → escrita direta.
- [ ] Se CQRS: o custo (broker, idempotência, read-your-writes eventual) é aceitável e está registrado em ADR?
- [ ] **Monólito modular por default.** Há razão concreta (escala/isolamento/ownership/ciclo de release) para extrair um serviço? Se não → módulo no mesmo deploy.
- [ ] Orçamentos NFR explícitos: latência alvo, escala, consistência, disponibilidade.
- [ ] A decisão virou **ADR** (formato Nygard) quando afeta forma/estrutura?
