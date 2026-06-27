# Camada de dados — checklist do agente data

- [ ] **Modelagem do agregado:** fronteira do agregado correta; invariantes no domínio, não no schema.
- [ ] **Segurança de migração:** sem lock longo de tabela; backward-compatible (expand→migrate→contract); reversível ou com plano de rollback; ordem antes dos workloads (Job/hook).
- [ ] **Índices/query:** os acessos quentes têm índice; sem N+1; paginação; projeção sem `id_*` interno na origem.
- [ ] **Read model/consistência (se CQRS):** o read model não reintroduz dado que a projeção de escrita removeu; defasagem (eventual consistency) é explícita e tolerável.
- [ ] **Integridade/idempotência:** chave de negócio única; idempotência no consumidor (`ON CONFLICT DO NOTHING`) quando assíncrono.
- [ ] **PII/retenção:** dado sensível classificado, cifrado em repouso quando exigido, com retenção definida.
