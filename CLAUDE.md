# ProActive7 — Briefing do Projeto

SaaS multi-tenant para nutricionistas (RT) controlarem cozinhas comerciais:
etiquetas de validade térmicas, auditorias RDC, não-conformidades, controle
de pragas, manipuladores (ASO/treinamento), temperaturas de equipamento e
documentos. Frontend React 19 + Tailwind 4 + Vite 6; backend Supabase
(Postgres 17 + Auth + Storage + Edge Functions). Deploy Vercel.

> Slug do Supabase: `glvdiicipblsohdgmqaz`. Domínio público:
> `https://pro-active7.vercel.app`.

## Hierarquia de roles

| Role             | Quem                                               | Escopo                          | Exemplo                                            |
| ---------------- | -------------------------------------------------- | ------------------------------- | -------------------------------------------------- |
| `platform_admin` | Dono do SaaS (Lucas)                               | Global, todas as orgs           | Vê tudo, cria orgs, audita                         |
| `nutritionist`   | Nutricionista RT (Ariane)                          | 1 organização (várias empresas) | Cadastra empresas, define prazos, audita           |
| `property`       | Gerente da unidade (Rafael)                        | 1 empresa                       | Imprime etiquetas, registra temperatura, fecha NCs |
| `master`         | **Legado** — tratar como alias de `platform_admin` | —                               | A consolidar em migration futura                   |

A nutri é a Responsável Técnica perante a ANVISA — **nenhuma automação
substitui o aval dela**. Layouts de etiqueta, prazos de validade, planos de
ação para NCs: tudo precisa passar pela nutri.

## Stack e padrões

- **Frontend:** `src/pages/` por rota, `src/components/` reutilizáveis,
  `src/lib/` para queries e domínio (`dashboardQueries.ts`,
  `useCompanyScope.ts`, `complianceScore.ts`, `escpos.ts`,
  `bluetoothPrinter.ts`).
- **Multi-tenancy:** sempre via `useCompanyScope()` ou filtro explícito por
  `organization_id` / `company_id`. RLS no banco é a defesa final.
- **Estado:** sem Redux; React Context (`AuthContext`) + `useState` local.
- **Estilo:** Tailwind 4. Português PT-BR nos textos visíveis, inglês no
  código.
- **Print:** etiquetas saem pelo diálogo de impressão do navegador
  (`@page`). ESC/POS via Web Bluetooth existe em `lib/bluetoothPrinter.ts`
  mas só para impressoras BLE 58/80 mm (não impressoras de mesa).

### Pares de FK ambíguos no schema (PostgREST)

Embeds aninhados nestes pares **exigem** sintaxe `!nome_do_fkey`:

| Par                                            | FK preferencial                                       |
| ---------------------------------------------- | ----------------------------------------------------- |
| `profiles ↔ organizations`                     | `profiles_organization_id_fkey`                       |
| `companies → organizations → profiles` (owner) | `organizations_owner_profile_fkey`                    |
| `documents ↔ profiles`                         | use `created_by_fkey` ou `approved_by_fkey`           |
| `non_conformities ↔ profiles`                  | `opened_by_fkey`, `closed_by_fkey` ou `who_uuid_fkey` |
| `non_conformities ↔ photos`                    | `evidence_photo_id_fkey` ou `closing_photo_id_fkey`   |

### Edge Functions (uso de service role)

`admin-create-user`, `admin-create-organization`, `admin-update-user`,
`admin-delete-user`, `cleanup-photos`, `send-expiry-notifications`.
**Nunca** chamar service role direto do frontend — sempre via Edge Function.

## Princípio de UX: zero digitação na cozinha

O cliente (Ariane) é explícita sobre isso: **o manipulador no chão da
cozinha não digita nada**. Toda informação que entra em uma etiqueta,
recebimento, contagem ou baixa de produção é **escolhida de lista** —
nunca digitada à mão. O nome do manipulador, o produto, o grupo, a
unidade, o fornecedor: tudo vem de cadastros pré-feitos pela nutri ou
pelo gerente.

Implicações práticas para qualquer feature nova:

- **Form de impressão**: o wizard `/imprimir/novo` é o único fluxo
  exposto no menu. O legado `/imprimir` (com `<input>` texto livre)
  fica acessível só por deeplink, **não** pelo menu.
- **Sem manipuladores → bloquear**: se `manipulators` está vazio, não
  oferecer um `<input>` para digitar o nome. Mostrar mensagem clara
  ("Cadastre funcionários em Cadastros → Funcionários") com CTA para
  a página de cadastro. Padrão a seguir em qualquer outra entidade
  pré-requisito (produtos, grupos, fornecedores).
- **Autocálculo > entrada manual**: validade vem de
  `product_shelf_lives`; data de manipulação default é "agora"; lote
  pode ser opcional ou auto-gerado (`L-YYYY-MM-DD-XX`) quando o
  cliente não tem padrão próprio.
- **Selecionar > digitar**: sempre que houver duas opções no design,
  preferir `<Select>` ou cards selecionáveis a `<Input>` livre.
- **Erros de digitação são bugs do produto**, não erro do operador.
  Se aparecer um campo onde o cozinheiro tem que digitar fornecedor,
  produto, manipulador: refatore para virar select com cadastro
  prévio.

## Ética

1. **LGPD primeiro.** ASO de manipulador inclui dado de saúde (sensível).
   Fotos podem capturar rosto. Manter retenção curta (`photos` autoexclui em
   30 dias via `cleanup-photos`); estender este padrão para qualquer dado
   novo. Não usar dados de cliente para treinar modelo sem opt-in explícito.
2. **A nutri é a RT.** Não automatizar decisão técnica (ex: "esta NC pode
   ser fechada"). A IA sugere; a nutri assina.
3. **Não esconder score ruim.** Se uma empresa está com compliance baixo, o
   dashboard mostra como está. Não inventar métrica positiva para vender.
4. **Transparência de IA.** Se algum dia adicionarmos sugestão automática
   (ex: predizer NC), deixar claro que é sugestão e mostrar a base.
5. **Conformidade ANVISA.** Layout da etiqueta segue RDC 216/275/259.
   Mudança em campo obrigatório (validade, lote, responsável) requer
   validação da nutri antes de subir.
6. **Não vender dados agregados** (média de NCs por região, etc.) sem
   anonimização forte e consentimento das orgs.

## Restrições financeiras (importante para escolhas de stack)

O projeto é **100% gratuito** no momento — não há caixa para pagar
serviços de terceiros. Toda nova feature precisa rodar dentro do que
já está pago/contratado:

- **Supabase (free tier)** + **Vercel (free tier)** apenas.
- **Sem APIs pagas**: WhatsApp Business API, Twilio, SendGrid, Stripe,
  Asaas, OpenAI, Anthropic, AWS, etc. são proibidos por enquanto.
- **Sem code signing** (~US$ 500/ano) → por isso a impressão usa
  PowerShell em Tarefa Agendada em vez de `.exe` assinado.
- **Sem certificado público (QZ Tray Enterprise, PrintNode)** → o relay
  é nosso `relay.ps1`.
- **Sem hardware (IoT, sensores BLE/Wi-Fi)** que dependa de gateway
  pago. Bluetooth direto do navegador (já existe em
  `lib/bluetoothPrinter.ts`) tudo bem porque é grátis.
- **Sem libs de pagamento** (jspdf é OK porque é open source, mas
  preferir CSS print quando possível).

Quando for sugerir feature, **diga claramente se o custo é zero** ou se
exige algo pago — neste segundo caso, ofereça alternativa free ou
adicione ao roadmap "para quando houver caixa".

## Segurança

- **RLS sempre.** Toda tabela nova nasce com `enable row level security` +
  políticas por `organization_id`. Migration de exemplo:
  `0043_rls_organizations.sql`.
- **Soft delete + audit log** para tabelas críticas (já em `audit_log` via
  trigger `log_changes()` — migrations 0036, 0037).
- **Segredos no Vault.** `CLEANUP_SECRET`, `CRON_SECRET` ficam no Supabase
  Vault, nunca no repo. `.env.example` lista apenas chaves públicas
  (`VITE_SUPABASE_ANON_KEY`).
- **Senha:** habilitar **Leaked Password Protection** no Supabase Auth
  (advisor reporta como WARN hoje).
- **Service role** só em Edge Function, nunca no bundle.
- **Backup:** ativar Point-in-Time Recovery quando subir para Supabase Pro.
- **Rate limit** em RPCs públicas (`get_public_label`) — hoje sem limite.

## Roadmap (pontos futuros)

### Curto prazo (próximas 2–4 semanas)

- [ ] **Habilitar Leaked Password Protection** no painel Supabase.
- [ ] **Consolidar role `master` em `platform_admin`** (migration + limpeza
      de checks `isMaster()` no frontend).
- [ ] **Wizard de onboarding** quando nutri cria a primeira empresa:
      sugere produtos comuns (com prazos da RDC 216), cria checklist
      padrão, marca primeira visita técnica.
- [ ] **Importação CSV de manipuladores** (hoje só produtos têm CSV em
      `ProductCsvImport.tsx`).
- [ ] **Lembrete automático de ASO vencendo** (push notification +
      e-mail) — reusar `send-expiry-notifications` como template.
- [ ] **Documentar pares de FK ambíguos** no README do `supabase/`.

### Features propostas — review pré-lançamento (2026-06-01)

Priorizadas por retorno × custo (tudo abaixo é **custo zero**, free tier,
salvo onde indicado). Ordem de execução sugerida:

1. [ ] **Relatório de conformidade em PDF (assinável pela RT)** — entregável
   mensal por empresa: score, NCs abertas/fechadas, temperaturas fora de
   faixa, ASOs vencendo, com espaço para assinatura da nutri. CSS print ou
   `jspdf`. É o documento que justifica o honorário da RT perante ANVISA /
   cliente. **Maior prioridade pós-lançamento.**
2. [ ] **Histórico do compliance score (série temporal)** — tabela
   `compliance_snapshots` + cron (template `send-expiry-notifications`).
   Mostra a curva real subindo/caindo (§3 "não esconder score ruim").
3. [ ] **Lembrete de ASO vencendo** — subir de "curto prazo" para
   prioridade: ASO vencido = NC imediata + risco legal pro cliente. Web
   Push (já existe) + e-mail.
4. [ ] **Alerta de churn/inatividade para o admin** — "orgs sem etiqueta há
   14d" / "nutri sem login há 30d". Reusa `feature_events` + `last_login_at`
   da view de métricas. Retenção mais barata pra SaaS de 1 pessoa.
5. [ ] **Wizard de onboarding na 1ª empresa** — puxa catálogo seed +
   templates globais (itens #6/#7 já prontos) automaticamente. Evita
   produto vazio = churn no dia 1.

**NÃO construir no MVP** (prematuro): cobrança/planos, white-label,
marketplace de templates, app do fiscal, IA de causa-raiz. Validar uso e
renovação antes.

**Vale pagar quando houver caixa:** notificação por **WhatsApp** (a cozinha
vive no Zap; taxa de leitura > push). WhatsApp Business API é pago →
roadmap "para quando houver caixa", fora do MVP.

### Pendências do review de lançamento (bloqueante/alto)

- [ ] **Impersonate sem consentimento + magic link reutilizável** —
   ✅ **parcialmente resolvido**: trava de consentimento implementada
   (coluna `allow_impersonation` na org, migration `0078`, default OFF +
   checagem server-side na Edge `admin-impersonate` + dupla linha no
   `audit_log` visível pra nutri). ⏳ Falta só a *sessão curta* (o magic
   link herda o JWT expiry global — reduzir no painel Auth ou emitir
   token próprio de 15 min).
- [ ] **`admin-export-org` não exporta arquivos do Storage** (ASO, fotos,
   branding) — ✅ tooltip corrigido (deixa claro que Storage não vai no
   JSON). ⏳ Incluir os arquivos no export fica como melhoria.
- [x] **`audit_log` ausente em `profiles`** — adicionar trigger `log_changes()`
   (mudança de `role`/`organization_id` é a mais sensível em multi-tenant).
   ✅ **Resolvido** (migration `0087`, trigger `trg_profiles_audit`).
- [x] **`fetchFeatureUsage` agrega no cliente sem `.limit`** —
   ✅ **Resolvido** (migration `0080`, RPC `feature_usage_30d`; frontend
   usa `supabase.rpc`).

### Review pré-produção 2026-07-20 (correções aplicadas)

- [x] **CRÍTICO — escrita cross-tenant via policies de seed/global
   (0052)**: `products_seed_insert/update`, `audit_templates_global_*` e
   `checklist_templates_global_*` tinham ramo `OR is_seed/is_global =
   false`; como policies permissivas combinam com OR, qualquer
   autenticado podia inserir/alterar produtos e templates de QUALQUER
   org. ✅ Corrigido na migration `0098` (policies passam a cobrir só o
   caso global/seed + platform_admin).
- [x] **`documents_update` permitia property reatribuir `company_id`**
   (WITH CHECK do ramo property era só `status <> 'published'`). ✅
   Corrigido na `0098`.
- [x] **Bucket `pest-docs` sem ramo de nutricionista** (nutri tomava RLS
   error ao anexar comprovante de dedetização). ✅ Corrigido na `0098`.
- [x] **Drift da `company_compliance_v` (stub 0039)** — corpo real só
   existia no banco, sem garantia versionada de `security_invoker`. ✅
   Recriada deterministicamente na `0099` (invoker + filtros de
   soft-delete + grant só a authenticated).
- ⚠️ **As migrations `0098`/`0099` precisam ser APLICADAS no banco de
   produção** (o deploy automático do Vercel não roda migrations). Sem
   isso a brecha da 0052 continua viva em produção.

### Pendências para a reunião 2026-06-03 (decisão do Lucas/Ariane)

Itens deixados em aberto de propósito, a decidir na apresentação do projeto
para a Ariane:

- [ ] **Autor do site (CMS de artigos)** — a escrita em `articles` está trancada
   em `platform_admin OR is_site_author` (flag no `profiles`, default `false`).
   Hoje **só o platform_admin publica**. Quando a conta da Ariane for criada,
   definir `is_site_author = true` nela (via SQL/admin). Avaliar também
   **esconder o menu "Artigos do site"** dos nutricionistas-clientes (hoje eles
   veem o item mas a RLS nega — precisa expor a flag no `AuthContext`).
- [ ] **LGPD — selo público expõe dado de saúde** — `get_company_seal()` está
   concedida a `anon` e retorna `asos_valid_pct` (% de ASOs válidos = dado de
   saúde). Decidir remover esse campo do acesso anônimo (ou exigir login no
   `/selo/:id`). Requer aval da RT.
- [ ] **SEO de marca (ações fora do código)** — buscar "proactive7" no Google
   ainda não traz o site. Pendências do Lucas: criar **Google Business Profile**
   (maior alavanca, mata a confusão com o livro "7 Hábitos"), **Solicitar
   indexação** da home/serviços/perfil no Search Console, e **colocar o link
   `proactive7.com.br` na bio do @proactive.7**. Código já entregue: meta por
   página, JSON-LD (com `alternateName`), sitemap, performance.

### Médio prazo (1–3 meses)

- [ ] **Cobrança / planos** (Asaas ou Stripe BR). Plano por nº de
      empresas ativas + nº de etiquetas/mês.
- [ ] **White-label por organização**: logo, cor primária e domínio
      próprio (ex: `etiqueta.nutriarianne.com.br`).
- [ ] **Biblioteca pública de produtos + prazos** mantida pelo
      `platform_admin` — nutri puxa para sua org via "clonar".
- [ ] **Catálogo de checklists ANVISA** prontos (RDC 216, RDC 275,
      RDC 259) com versionamento.
- [ ] **PWA offline-first** para `property` registrar temperatura sem
      sinal (sync quando voltar).
- [ ] **Web Serial / WebUSB** para impressão crua ZPL/ESC-POS sem
      diálogo (resolve a limitação documentada no README).
- [ ] **Exportação LGPD** ("baixar meus dados" + "deletar minha conta")
      por usuário.

### Longo prazo (3–12 meses)

- [ ] **Treinamento integrado** (NR-35, Boas Práticas) com emissão de
      certificado e vinculação ao manipulador.
- [ ] **App nativo do fiscal** (escaneia QR e valida etiqueta offline).
- [ ] **Integração com balança/termômetro Bluetooth** (peso + temp.
      automáticos na hora da etiqueta).
- [ ] **Marketplace de templates** (nutri vende checklists customizados
      para outras nutris).
- [ ] **Sugestão de IA** para causa-raiz de NC recorrente (com
      transparência: "baseado em N casos similares").
- [ ] **API pública** para integração com ERPs de restaurante.

## Funções específicas para `platform_admin` (proprietário)

Hoje o admin tem: criar/editar orgs, ver trilha de auditoria, lixeira,
criar empresas e usuários, gerenciar hardware recomendado.

Status atualizado:

1. ✅ **Dashboard de SaaS** — `/platform/dashboard` (3 abas)
2. ✅ **Health-check por organização** — aba "Saúde das orgs"
3. ✅ **Controle de assinatura (interno, sem gateway)** — migration `0077`:
   tabela `plans` (key, company_limit, allowed_modules[], price_cents) +
   `plan_key`/`trial_ends_at`/`plan_renews_at` em `organizations` + guard
   `guard_organizations_update()` (nutri não altera plano/status) + RPC
   `my_subscription()`. Front: `/platform/planos` (CRUD), controles na
   `OrganizationDetailPage`, `/admin/assinatura` (autosserviço da nutri),
   gating de módulos via `src/lib/modules.ts` + `SubscriptionGate` +
   `AuthContext.hasModule/subscriptionActive`. Cobrança real (gateway BR)
   fica para quando houver caixa. ⏳ falta enforcement automático do limite
   de empresas (hoje só exibe "acima do limite").
4. ✅ **Impersonate** — Edge `admin-impersonate` + botão "Entrar como" na lista de usuários da org
5. ✅ **Push manual para uma org** — Edge `admin-push-org` + botão "Notificar" na OrganizationDetailPage
6. ✅ **Templates globais** — `/platform/biblioteca` para publicar; botão "Biblioteca" em `ChecklistsPage` e `AuditsPage` para clonar
7. ✅ **Catálogo seed** — mesma página + botão "Biblioteca" em `ProductsPage`
8. ✅ **Banner global** — `/platform/comunicados` + `AnnouncementBanner` no Layout
9. ✅ **Estatísticas de uso** — tabela `feature_events` + RPC `log_feature_event` + aba "Uso de features"
10. ✅ **Backup on-demand** — Edge `admin-export-org` + botão "Backup" na OrganizationDetailPage

### Ordem de execução proposta

Ordem por **dependência técnica × valor imediato**. Cada item lista:
arquivos novos esperados, tabelas/RPCs no banco, e bloqueios.

#### Fase 1 — Visibilidade (sem cobrar, sem editar dado de terceiros)

**1.1 Dashboard de SaaS** (item #1)

- Rota: `/platform/dashboard` (já existe `OrganizationsPage`; adicionar
  como página separada protegida por `masterOnly`).
- Arquivos: `src/pages/platform/PlatformDashboardPage.tsx` +
  `src/lib/platformMetrics.ts` (queries agregadas).
- Banco: criar view `platform_metrics_v` que retorna por org:
  `org_id, label_count_30d, audit_count_30d, last_login_at, company_count,
nc_open_count`. Migration nova `0049_platform_metrics_v.sql` — apenas
  SELECT, RLS exige `is_platform_admin()`.
- Sem dependência externa. Comecar por aqui.

**1.2 Health-check por organização** (item #2)

- Mesma rota, **uma aba** na PlatformDashboardPage ("Saúde das orgs").
- Reusa `company_compliance_v` (já existe) somando por
  `organization_id`. Cards: compliance médio, NCs >30d em aberto, ASOs
  vencendo em 30d, total de manipuladores/empresas.
- Reusa `dashboardQueries.ts` como modelo de query.

**1.3 Estatísticas de uso de feature** (item #9)

- Adiciona uma aba na PlatformDashboardPage ("Uso").
- Banco: nova tabela `feature_events` (`org_id, feature_key, user_id,
occurred_at`) + função `log_feature_event(text)` chamada do frontend
  em pontos-chave (impressão de etiqueta, abertura de auditoria,
  registro de temp, etc.). Migration `0050_feature_events.sql`.
- Sem isso, qualquer decisão de roadmap é chute.

#### Fase 2 — Operação / suporte

**2.1 Impersonate** (item #4)

- **Pré-requisito** para suportar a Ariane sem pedir print.
- Edge Function nova: `admin-impersonate` retorna um JWT de curta
  duração (15 min) assinado para o `user_id` alvo. Service role + JWT
  do caller checado contra `is_platform_admin()`.
- Frontend: `src/lib/impersonate.ts` (salva token, exibe banner laranja
  "Vendo como X — sair"), botão na `OrganizationDetailPage`.
- `audit_log` registra `event='impersonate_start'` com `actor` e `target`.
- Cuidado LGPD: a nutri precisa **consentir** uma vez (toggle em
  preferências). Sem opt-in, impersonate é bloqueado.

**2.2 Banner global** (item #8)

- Banco: nova tabela `platform_announcements`
  (`id, message, severity, starts_at, ends_at, active`).
- `AuthContext` lê o anúncio ativo via RPC e expõe `announcement` no
  contexto. `src/components/AnnouncementBanner.tsx` renderiza acima do
  `Layout`. Página de gestão: `/platform/comunicados`.

**2.3 Push manual para uma org** (item #5)

- Edge Function nova `admin-push-org`: aceita `org_id + title + body`,
  busca `push_subscriptions` da org e dispara via Web Push (reusa lib
  já presente em `send-expiry-notifications`).
- UI: modal "Notificar org" na `OrganizationDetailPage`.

#### Fase 3 — Conteúdo curado

**3.1 Gestão de templates globais** (item #6)

- Adicionar coluna `is_global boolean default false` em `audit_templates`
  e `checklist_templates`. RLS: globais visíveis para todas as orgs
  como **leitura**; só `platform_admin` cria/edita global.
- Frontend: badge "Modelo oficial" + botão "Clonar para minha org" que
  duplica o template removendo `is_global`.

**3.2 Catálogo seed de produtos** (item #7)

- Mesma ideia da 3.1 aplicada a `products` + `product_shelf_lives`.
- Coluna `is_seed boolean default false`. Tela `/platform/catalogo`.

#### Fase 4 — Comercial / continuidade

**4.1 Painel de cobrança** (item #3)

- Decisão pendente: **Asaas** (BR-friendly, PIX, boleto) vs **Stripe**.
- Banco: tabela `subscriptions` (`org_id, plan, status, current_period_end,
external_id`). Webhook do gateway atualiza.
- UI: `/platform/cobranca` (lista + ação suspender/reativar).
- **Não excluir org** por inadimplência — só `status='suspended'`.

**4.2 Backup on-demand** (item #10)

- Edge Function `admin-export-org`: gera ZIP com CSVs de todas as
  tabelas filtradas por `organization_id` + arquivos do storage
  (`branding/`, `employee-docs/`, `pest-docs/` da org).
- Storage temporário em bucket `exports/` com retenção de 7 dias
  (cleanup function).
- Indispensável para **direito de portabilidade LGPD**.

### Pulos de fase / bloqueios

- **2FA descartado** — decisão do produto. Aceitar o risco e mitigar
  com senha forte (Leaked Password Protection no Supabase) e e-mail de
  alerta em login novo (futuro).
- Web Serial / impressão crua **não bloqueia nada** desta seção; rodar
  em paralelo se sobrar tempo.
- Toda página nova de `/platform/*` deve estar protegida por
  `masterOnly` em `src/App.tsx`. Toda página de `/admin/*` (escopo
  org) por `nutritionistOrAdmin`.

## Review de segurança & dívida técnica (2026-05-29)

Review profundo do projeto. Itens com ✅ já foram resolvidos nesta
sessão; os demais ficam como pendência priorizada.

### Resolvido

- ✅ **Vazamento cross-tenant da view `platform_org_metrics_v`**: estava
  com acesso (SELECT+DML) para `anon` e `authenticated`, expondo métricas
  de todas as orgs (inclusive `auth.users`). Trancado em
  `0071_platform_metrics_lockdown.sql` — acesso só via RPC
  `platform_org_metrics()` (SECURITY DEFINER, gated por
  `is_platform_admin()`). Frontend usa `supabase.rpc(...)`.
- ✅ **Injeção cross-tenant em `print_jobs`**: INSERT não amarrava
  `agent_id` à empresa do job. Corrigido em
  `0070_print_jobs_agent_company_bind.sql`.
- ✅ **Drift repo↔produção**: migrations `0067`/`0068`/`0069` e a Edge
  `print-agent` v4 só existiam no banco. Reconstruídos como arquivo.

### Resolvido — pentest externo (role `anon`)

Pentest simulando atacante anônimo (`SET ROLE anon` = o que o PostgREST
faz sem JWT). RLS segurou todos os SELECT/INSERT/UPDATE/DELETE; storage
privado, `auth.users` e Realtime OK. Buracos encontrados e fechados:

- ✅ **`cleanup_soft_deleted()` callable por anon** (DELETA dados):
  `REVOKE EXECUTE` em `0073_pentest_hardening.sql`.
- ✅ **`log_feature_event('x')` por anon** (spam/DoS da `feature_events`):
  função reescrita p/ no-op quando `auth.uid()` é null; `REVOKE` de anon.
- ✅ **`rls_auto_enable`/`log_changes`/`sync_profile_org_from_company`**
  (trigger/event functions expostas em `/rpc`): `REVOKE EXECUTE`. `0073`.
- ✅ **`get_public_label` vazava PII** (CNPJ, endereço, telefone, nome do
  responsável): `0074_public_label_remove_pii.sql` removeu os campos e
  consertou o drift. `PublicLabelPage` não renderiza mais PII.
- ✅ **`sign-qz` (oráculo de assinatura aberto)**: redeploy inerte (sem
  chave, responde 410, `verify_jwt:true`). Deletar no painel quando der.
- ✅ **`admin-update-user`**: redeploy `verify_jwt:true`; nutri agora só
  gerencia `property` (ou self) — antes resetava senha de outra nutri.

### Pendente — exige decisão de produto

- [ ] **Impersonate sem trava de consentimento (LGPD)**: o CLAUDE.md §2.1
  exige que a nutri consinta uma vez ("sem opt-in, bloqueado"), mas
  `admin-impersonate` não checa nada. Falta: coluna de consentimento na
  org (default OFF) + checagem server-side + toggle numa tela que a nutri
  acesse (não existe "preferências da org" pra nutri hoje — decidir a UX).

### Pendente — dívida técnica / hardening

- [ ] **`sign-qz` Edge Function**: já neutralizada (inerte, 410), mas
  ainda existe no painel. **Deletar** quando conveniente.
- [ ] **Retenção LGPD**: `manipulator_asos` (dado de saúde) e bucket
  `employee-docs` (ASOs) **sem expiração**. Estender o padrão de 30 dias
  das `photos`/`cleanup-photos`.
- [x] **Sem `audit_log` em `profiles`** — ✅ resolvido (migration `0087`).
- [x] **`get_public_label` sem rate limit** (anon) — ✅ resolvido
  (migration `0094`, `enforce_rate_limit` por IP em `get_public_label` e
  `get_company_seal`).
- [x] **Funções trigger/internas executáveis por anon/authenticated** —
  ✅ resolvido (migration `0073`, `REVOKE EXECUTE`).
- [x] **Agregação client-side sem `.limit`** — ✅ resolvido
  (`label_report` na `0076` + `feature_usage_30d` na `0080`).
- [x] **Deleções no Storage ignoram erro** — ✅ resolvido (todos os
  `.remove()` checam `error` e avisam/`console.warn`).
- [x] **Realtime/timer vazam no wizard** — ✅ resolvido
  (`directCleanupRef` + cleanup no unmount do `DirectPrintBlock`).
- [x] **`PrintLabelPage` legado (`/imprimir`)** — ✅ resolvido: a rota
  agora redireciona (`Navigate`) para `/imprimir/novo`.
- [ ] **`master` legado** ainda referenciado em migrations/checks —
  consolidar em `platform_admin` (já estava no roadmap).
- [ ] **FKs sem índice** em `print_jobs`/`print_agents`
  (`created_by`, `label_id`) e índices não usados (`relay_logs`) —
  avaliar quando houver volume.

## Convenções para a próxima sessão de Claude
- Em queries Supabase, **sempre** verificar pares de FK ambíguos antes
  de usar embed aninhado.
- **Não criar arquivos `.md`** (incluindo `README` por feature) sem o
  usuário pedir. O codebase prefere conversar do que documentar.
- Para operação que precisa de service role: criar/usar Edge Function,
  nunca chave no frontend.
- Migrations numeradas sequencialmente em `supabase/migrations/NNNN_*`.
- Antes de zerar dados em produção, listar contagens + pedir confirmação
  por `AskUserQuestion` (referência: o "zerar banco" foi feito assim).
- Deploy é automático: merge em `main` → Vercel deploya em ~1 min.
- Para etiquetas: validar visualmente em todos os 4 presets
  (33×22, 50×30, 60×40, 80×60) — eles têm regras de `compact` diferentes
  em `LabelPreview.tsx`.

## Arquivos-chave para começar a entender

- `README.md` — visão geral, setup, limitações.
- `src/App.tsx` — todas as rotas e roles que as protegem.
- `src/lib/types.ts` — definições de role e enums.
- `src/lib/useCompanyScope.ts` — scope de empresa atual.
- `src/lib/complianceScore.ts` — fórmula do score.
- `src/components/LabelPreview.tsx` — renderização da etiqueta.
- `supabase/migrations/0043_rls_organizations.sql` — modelo de RLS
  multi-tenant que toda tabela nova deve seguir.
- `supabase/functions/admin-create-user/index.ts` — modelo de Edge
  Function com service role + JWT.
