# Aprendizados & gotchas (generalizados)

Lições que custaram tempo real, destiladas em regras. Sem domínio — só o "porquê"
mecânico, copiável para qualquer projeto que adote este harness.

> Placeholders: `@app/*` (scope), `<App>`, `<Feature>`. Substitua ao adotar.

## Build & monorepo

- [ ] **Princípio: artefatos compartilhados buildam ANTES dos consumidores** (consumidor
      importa o artefato compilado, não a fonte). Todo hook e job de CI builda o pacote de
      contratos antes de typecheck/lint/test (ex.: `pnpm build --filter @app/contracts`).
      Pular isso faz os consumidores falharem ao resolver tipos.
- [ ] **Build do artefato compartilhado tem de emitir de forma determinística.** No
      tsconfig dos contratos, `composite:false` + `incremental:false` são de propósito:
      com `--incremental`, o `tsc` escreve `tsbuildinfo` **fora** de `dist` e depois pula o
      emit após `dist` ser limpo → `dist` vazio. O `.dockerignore` também exclui
      `**/*.tsbuildinfo` para um buildinfo velho não envenenar a imagem.
- [ ] **Princípio: install reprodutível com lockfile congelado** — lockfile defasado
      **falha** o build em vez de resolver versões novas silenciosamente
      (ex.: `pnpm install --frozen-lockfile`).
- [ ] **Princípio: o instalador de hooks roda no lifecycle do `install`** (ex.: script
      `prepare: "husky"` no package.json). Sem esse script (ou com lifecycle scripts
      desligados) os hooks **somem silenciosamente** — o enforço local desaparece sem aviso.

## Gates & enforço

- [ ] **Hooks locais são bypassáveis (`--no-verify`); o CI é a fonte da verdade.** Um
      template que entrega só os hooks deixa o DoD burlável. Os dois andam juntos.
- [ ] **Princípio: análise estática com warning = erro** — warning quebra o build (gate
      binário, sem limite frouxo). Ex.: `eslint --max-warnings 0`.
- [ ] **lint-staged faz só `prettier --write`, não ESLint** — de propósito: não há config
      flat de ESLint na raiz e rodar ESLint por arquivo staged fragilizaria a resolução de
      config. ESLint é gate separado em `pnpm lint`. Não funda os dois.
- [ ] **`pnpm audit` pode falhar SEM mudança de código** quando surge um CVE novo numa
      dep existente — intencional, força triagem. Consulta a rede: pode quebrar offline
      (use `--no-verify` local; CI cobre). Advisory high+ sem fix viável → ADR antes de seguir.
- [ ] **Cobertura ≠ mutação.** 100% de cobertura passa com asserções vazias; só a mutação
      pega "cobre mas não assere". Mantenha os dois gates.
- [ ] **Mutação só roda testes unit** (o vitest-runner não roda integração/e2e) → mutar
      infra/presentation gera survivors falsos. Restrinja o `mutate` às regras de negócio.
- [ ] **Mutantes equivalentes são inmatáveis** (ex.: `cipher.update(x,'utf8')` →
      `cipher.update(x,'')` produz bytes idênticos). Aceite ~99% com break threshold no
      alvo do projeto (sugestão 90, calibrável ao risco), não cace 100%.
- [ ] **Property test com seed fixo não cobre boundary exato** (`>= N` vs `> N` sobrevive
      à property). Adicione casos exatos (N passa / N+1 falha com a string literal).
- [ ] **O threshold de cobertura tem escopo NARROW** (só domain+application). Replicar o
      gate sem restringir o `include` dá um número enganoso que não mira regra de negócio.

## Contratos & API

- [ ] **Todo `@Query()`/`@Param()` precisa de decorator Swagger explícito**, senão o doc
      gerado offline difere do runtime e o gate de drift quebra (o Nest não infere
      metadata de query/param de forma confiável).
- [ ] **O builder offline de OpenAPI avalia o `validate()` do ConfigModule no momento da
      decoração `@Module()`** → os stubs de env precisam ser setados **antes** do
      `import()` dinâmico do AppModule (não top-level import).
- [ ] **Princípio: validação escopada ao input da presentation, não global** — um pipe
      global rodaria contra TODOS os params (incl. o usuário atual injetado). Bind a
      validação só no body daquela borda (ex.: `ZodValidationPipe` no `@Body()`, nunca
      `ValidationPipe` global / `@UsePipes`).
- [ ] **Validação é zod, não class-validator** — as classes `@ApiProperty` existem SÓ para
      alimentar o Swagger; o runtime valida pelo zod pipe no body.
- [ ] **pre-push regenera o snapshot e roda `git diff --exit-code`** — existe para um
      snapshot velho nunca chegar ao CI. Snapshot editado à mão ou esquecido falha aqui.
- [ ] **Topic binding por aridade**: `feature.event.*` casa **exatamente uma** palavra; uma
      routing key de 4 segmentos (`feature.event.received.v2`) **nunca é entregue** (POST
      sucede, nada persiste). Use `#` (zero-or-more) e um spec de coerência binding↔routing-keys.

## RabbitMQ / DI

- [ ] **Princípio: dependência de mensageria exposta via módulo global, não importada na
      feature.** A conexão do broker é exposta por um módulo global que re-exporta o módulo
      do broker; módulos de feature consomem-na, não importam o `forRoot*` direto (ex.: com
      `@golevelup/nestjs-rabbitmq` v6 — que não é global —, um `@Global() MessagingModule`
      re-exporta `RabbitMQModule`).

## Docs & ADR

- [ ] **Princípio: build estrito do site de docs quebra em link quebrado / página fora do
      nav** — adicione a página ao nav ao criar (ex.: `mkdocs build --strict`; em outras
      stacks, o modo estrito do Docusaurus / Antora).
- [ ] **ADR aceito é imutável** — editar destrói a rastreabilidade; crie um substituto.
- [ ] **Documentação duplicada apodrece.** Linke, nunca copie; **mova** a seção para o
      nível certo quando ela passa a servir só um app.

## Processo com IA

- [ ] **Continuidade não tem gate automático.** A iteração só está "pronta" quando
      `current-state.md` E a memória do agente refletem o real. Se vira aspiracional,
      mente em semanas.
- [ ] **Evidência antes de afirmação.** Vários bugs (saída embrulhada em markdown, binding
      de fila errado) só foram pegos pelo spot-check real / verificação da UI, não pelos
      testes. Fatia web termina com verificação manual da UI renderizada.
- [ ] **Verificação pesada (docker/e2e/mutação) em background**, não escondida num
      subagente síncrono (trava a sessão).
- [ ] **Mudança breaking parcial não compila** no monorepo (typecheck abrange tudo) —
      atravesse contrato+backend+worker+web num único commit verde.

## Deploy & infra

- [ ] **Uma imagem, três papéis** (api/worker/migrate) diferenciados por override do
      command. Migrations são um Job one-shot ordenado antes dos workloads (compose
      `service_completed_successfully`; Helm pre-install/pre-upgrade hook).
- [ ] **Telemetria é best-effort por construção** (no-op quando o endpoint OTLP está
      vazio) — nunca deixe quebrar o startup.
- [ ] **Protocolo de broker entre nuvens é env-breaking** (AMQP 0-9-1 vs 1.0): trate a
      troca de broker como follow-up explícito, não como detalhe de config.

## Follow-ups abertos do template (não assuma resolvido)

- [ ] **Branch protection** na branch default foi **decidida mas é platform-gated**
      (GitHub free + repo privado retorna 403). Não assuma que `main` está protegida só
      porque o ADR existe — exige repo público ou plano pago.
- [ ] **release-please** precisa do toggle do repo "Allow GitHub Actions to create and
      approve pull requests" além das permissões do workflow, senão erra.
- [ ] **O gate de eval é determinístico hoje** (valida o loop com fallback). Ao plugar um
      LLM real, precisa ser **redesenhado para não-determinismo** — copiar o gate às cegas
      dá falsa segurança.

## Guard anti-vazamento de negócio

Este modelo é **business-stripped** de propósito (placeholders `<App>`/`<Feature>`/
`<Entity>`). Ao instanciar num projeto novo, o risco é o **caminho inverso**: termos do
SEU domínio de origem (nomes de tabelas reais, entidades, regras, siglas internas)
voltarem a vazar para o scaffold copiado. Duas salvaguardas baratas:

- [ ] **(a) Grep-gate que falha se termos proibidos reaparecerem.** Rode local e como step
      de CI (antes do build). **Cada projeto define sua própria lista** — os termos abaixo
      são só forma; troque-os pelos nomes reais que você NÃO quer ver no repo
      (entidades/siglas/produtos da sua origem). `git grep -niE` casa por palavra,
      case-insensitive; sair com `1` quando há match falha o job:

      ```bash
      # ci-guard-no-leak.sh — falha se qualquer termo de negócio da origem aparecer.
      # Defina FORBIDDEN com os SEUS termos (regex alternada, NÃO use exemplos reais aqui).
      FORBIDDEN='termo-um|termo-dois|sigla-interna|nome-de-produto'
      if git grep -niE "$FORBIDDEN" -- . ':!checklists/aprendizados.md'; then
        echo "ERRO: termo de negócio da origem vazou para o scaffold/repo. Purgue antes de seguir." >&2
        exit 1
      fi
      echo "OK: nenhum termo proibido encontrado."
      ```

      Exclua deste guard o próprio arquivo onde a lista é definida (`:!...`) para a
      definição não casar a si mesma. Adote o mesmo step no `static` do `ci.yml`.
- [ ] **(b) Purgue comentários de proveniência ao copiar o scaffold.** Cabeçalhos
      "SPINE (illustrative)…", notas de "Status do scaffold", referências a `<App>`/
      `<Feature>`/`<Entity>` e qualquer comentário que aponte de volta para o modelo são
      andaime — depois de materializar as folhas e renomear o bounded context, **remova-os**
      (o grep-gate de (a) ajuda a achar resíduos). Comentário de proveniência esquecido no
      código de produção é dívida e confunde quem entra depois.
