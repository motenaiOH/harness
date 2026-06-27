# Prontidão operacional — checklist do sre-devsecops

- [ ] **SLO/SLI:** objetivos de latência/erro/disponibilidade definidos para a capacidade; medíveis pelas métricas existentes.
- [ ] **Resiliência:** timeouts, retry com backoff, circuit-breaker e degradação graciosa nas dependências voláteis; best-effort nunca trava o boot.
- [ ] **Rollout/rollback:** estratégia (rolling/canary), health/readiness, e **migração ordenada antes** dos workloads; rollback ensaiado.
- [ ] **Capacidade:** limites de recurso (CPU/mem), HPA/PDB onde aplicável.
- [ ] **Incidente/runbook:** runbook mínimo (sintoma→diagnóstico→mitigação) + alertas no que tem SLO.
- [ ] **DevSecOps (hardening da entrega):** ver `checklists/security-defense-in-depth.md` — supply-chain (audit high), secrets fora do cliente/cifrados, securityContext endurecido, IaC sem segredo embutido, least-privilege de deploy.
