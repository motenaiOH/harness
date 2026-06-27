# Defesa em profundidade & governança — checklist

Trate cada confiança como **revogável**. Empilhe controles **independentes**: furar uma
camada não pode virar incidente. Este checklist tem duas zonas:

1. **Núcleo universal** — vale para **qualquer** aplicação. Use sempre.
2. **Módulos condicionais** — marcados `[SE ...]`. Inclua só os que a sua forma de app
   exige; pule o resto sem culpa (e sem fingir que "não fez segurança").

> Placeholders: `<App>`, `<Entity>`, `<Tenant>` (cliente/escopo), `<Presentation>`
> (web, mobile, CLI, API pública, integração). Substitua ao adotar.
>
> **Postura de arquitetura do harness:** múltiplas *presentations* possíveis sobre uma
> **API monólito modular**; cada presentation é um adapter de borda, não o core. As
> regras de auth/escopo abaixo valem **por presentation** mas o enforcement mora no
> **core** (uma vez), nunca duplicado em cada borda.

---

## Núcleo universal (qualquer app)

### Autenticação, sessão & identidade

- [ ] Token/credencial **pinado**: algoritmo, `iss`/`aud` e **expiração** obrigatórios;
      rejeita token malformado ou com claim de escopo ausente/vazio. (Simétrico vs.
      assimétrico — RS256/ES256/OIDC vs. HS256 — é **escolha por contexto**; registre em ADR.)
- [ ] Senha/segredo de usuário: **hash forte e lento** (argon2id/bcrypt/scrypt), nunca
      reversível; **equalize o timing de login** para não vazar existência de usuário.
- [ ] **Segredo nunca chega ao cliente.** Se código de browser/app precisa do segredo
      cru, o design está errado — anexe server-side.
- [ ] Sessão: expira, **rotaciona na mudança de privilégio**, invalida no logout.

### Autorização

- [ ] AuthZ em **cada** request; **default-deny** (rota pública é exceção explícita, ex.:
      health-check).
- [ ] **AuthZ de objeto (IDOR/BOLA):** valide que o ator pode acessar **aquele** recurso,
      não só a rota/coleção. O escopo (`<Tenant>`/owner) vem **sempre do contexto
      autenticado, NUNCA do input** ("o tenant vem do token, never the question").
- [ ] **Least privilege:** papéis/escopos mínimos; segrega leitura de escrita quando o
      risco diverge.

### Entrada (não confie em nada que cruza a fronteira)

- [ ] Valide **todo** input no boundary (schema/tipo/range) — fail-closed; dado inválido
      não entra no domínio.
- [ ] Trate **injeção conforme o sink**: SQL (parametrizado/ORM), NoSQL, comando/shell,
      LDAP, template (SSTI), deserialização, path-traversal.
- [ ] **SSRF:** requisição de saída derivada de input do usuário passa por **allowlist**
      de host/esquema; não siga redirect para rede interna/metadata (169.254.169.254…).

### Saída (rede de segurança)

- [ ] **Output encoding contextual** contra XSS; **CSP** no entrypoint de runtime.
- [ ] **Validador de política** varre o envelope de resposta e **dropa/redige** o que não
      devia sair (ids internos, segredos, PII). **never-throws / never-mutates** (best-effort,
      retorna input intacto em erro); padrões **calibrados contra falso-positivo** (âncoras
      de palavra). Campo novo de saída → **coberto** pelo validador.
- [ ] Erro **não vaza** stack/estrutura interna; embrulhe em erro **tipado limpo**.

### Allowlist > denylist (fail-closed)

- [ ] Recursos/origens/hosts/comandos permitidos são **allowlist explícita** (denylist
      sempre esquece algo). **CORS por allowlist** (origem listada, jamais `*`).

### Transporte & segredos em repouso

- [ ] **TLS** em trânsito (HSTS). Segredos cifrados em repouso com **AEAD** (ex.:
      AES-256-GCM: IV aleatório por operação, auth tag verificada, chave validada no boot);
      **rotação** prevista.
- [ ] Credenciais/keys comparadas por **digest (sha256+)**; valor cru **nunca** logado/persistido.

### CSRF

- [ ] Mutação autenticada por **cookie de sessão** protegida (SameSite + token anti-CSRF)
      — ou use **Bearer/header** que o browser não envia automaticamente.

### Observabilidade segura & best-effort transversal

- [ ] Validador de saída, **auditoria** e telemetria **nunca derrubam o request**
      (try/catch → input/no-op); pareie com **métrica/log do caminho de falha** para não
      mascarar bug silenciosamente.
- [ ] Trilha de auditoria **sem PII/valores retornados**: grava outcome + contexto + um
      **hash determinístico** de filtros normalizados; leitura **read-only** para auditores.
- [ ] Logs sem segredo/PII; correlação por id, não por dado sensível.

### Dependências & supply chain

- [ ] Gate de **audit (high/critical)** no CI + pin de versões (detalhe no DoD/CI). Advisory
      sem fix viável → exceção **documentada em ADR** antes de seguir.

---

## Módulos condicionais (inclua só se a condição valer)

### `[SE banco relacional acessado por query dinâmica / text-to-SQL]`

- [ ] Guard por **AST, não regex**: exige 1 statement, **SELECT-only** (rejeita
      DML/DDL/SET/CALL em qualquer nó, incl. CTE/subselect), valida contra **allowlist** de
      tabela/coluna, injeta/cap `LIMIT`, e **re-emite o SQL a partir do AST validado**
      (nunca passa a string crua adiante).
- [ ] **Corpus adversarial** provando que o guard rejeita os ataques conhecidos.
- [ ] **Transação read-only redundante:** `BEGIN; SET TRANSACTION READ ONLY;
      SET LOCAL statement_timeout='Xms'; <sql>; ROLLBACK` (**sempre rollback**); **row-cap**
      em memória; erro do driver embrulhado tipado.
- [ ] READ ONLY é **redundante, não substituto** do guard (não impede ler tabela proibida
      nem query cara) — guard + READ ONLY + timeout + row-cap coexistem.

### `[SE há ids/handles internos que não podem vazar]`

- [ ] **Projeção no repositório** (o `select` mapeia só campos públicos), **nunca** no
      tool/handler. View/DTO sem id interno.
- [ ] Validador de saída **dropa chaves** `/_id$/`, `/^id[A-Z]/` e **redige ids no texto**
      — rede de segurança sobre a projeção da origem.

### `[SE topologia presentation + API com proxy de borda]`

- [ ] **Dois segredos não-conflatados:** um cifra a sessão (browser), outro assina o token
      de API (`<Presentation>`↔API).
- [ ] Token de API **cunhado e anexado server-side** por um **proxy same-origin**; o
      browser só tem o cookie de sessão. Proxy propaga **trace-context** (`traceparent`).

### `[SE você gerencia segredos/credenciais de terceiros dentro da app]`

- [ ] Cofre **AES-256-GCM** (AEAD) por registro; chave de **32 bytes validada no boot**
      (falha rápido se ≠ 32).
- [ ] **Integration keys** comparadas por digest **sha256**; valor cru nunca logado/persistido.

### `[SE multi-tenant]`

- [ ] `<Tenant>` **sempre** do claim verificado; **impossível** alcançar outro tenant
      (pool/escopo por tenant resolvido no core). **Teste de isolamento cross-tenant** explícito.

### `[SE framework com guards globais (ex.: NestJS APP_GUARD)]`

- [ ] Guards empilhados **na ordem**: **rate-limit → autenticação → autorização por papel**
      (a autorização depende de `request.user` já populado). `@Public()` isenta rotas explícitas.
- [ ] **Helmet/headers só no entrypoint de runtime** (fora da config compartilhada de
      OpenAPI), senão o builder offline diverge do runtime e o **gate de drift** quebra. CSP
      do Swagger UI: trade-off **documentado em ADR** se reabilitar.

### `[SE há leitura de alto volume / read models separados (CQRS — só onde NFR justifica)]`

- [ ] Read model **não** reintroduz dado sensível que a projeção de escrita removeu (a
      allowlist vale **dos dois lados**).
- [ ] Permissão de **leitura** é checada de forma independente da de escrita (least
      privilege entre os lados do CQRS).
- [ ] Defasagem do read model (se assíncrono) **não** vaza dado de um escopo para outro
      durante a propagação.

---

> **Como usar:** copie o **núcleo universal** inteiro para todo projeto. Depois percorra
> os `[SE ...]` e inclua os que casam com a sua forma de app. O que sobrar dos
> condicionais, **remova** do checklist do projeto (não deixe item morto). Decisões
> opinativas (algoritmo de JWT, reabilitar CSP do Swagger, adotar CQRS num módulo) viram
> **ADR**.
