# ProActive7 — Briefing do Projeto

SaaS multi-tenant para nutricionistas (RT) controlarem cozinhas comerciais:
etiquetas de validade térmicas, auditorias RDC, não-conformidades, controle
de pragas, manipuladores (ASO/treinamento), temperaturas de equipamento e
documentos. Frontend React 19 + Tailwind 4 + Vite 6; backend Supabase
(Postgres 17 + Auth + Storage + Edge Functions). Deploy Vercel.

> Slug do Supabase: `glvdiicipblsohdgmqaz`. Domínio público:
> `https://pro-active7.vercel.app`.

## Hierarquia de roles

| Role | Quem | Escopo | Exemplo |
|---|---|---|---|
| `platform_admin` | Dono do SaaS (Lucas) | Global, todas as orgs | Vê tudo, cria orgs, audita |
| `nutritionist` | Nutricionista RT (Ariane) | 1 organização (várias empresas) | Cadastra empresas, define prazos, audita |
| `property` | Gerente da unidade (Rafael) | 1 empresa | Imprime etiquetas, registra temperatura, fecha NCs |
| `master` | **Legado** — tratar como alias de `platform_admin` | — | A consolidar em migration futura |

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

| Par | FK preferencial |
|---|---|
| `profiles ↔ organizations` | `profiles_organization_id_fkey` |
| `companies → organizations → profiles` (owner) | `organizations_owner_profile_fkey` |
| `documents ↔ profiles` | use `created_by_fkey` ou `approved_by_fkey` |
| `non_conformities ↔ profiles` | `opened_by_fkey`, `closed_by_fkey` ou `who_uuid_fkey` |
| `non_conformities ↔ photos` | `evidence_photo_id_fkey` ou `closing_photo_id_fkey` |

### Edge Functions (uso de service role)

`admin-create-user`, `admin-create-organization`, `admin-update-user`,
`admin-delete-user`, `cleanup-photos`, `send-expiry-notifications`.
**Nunca** chamar service role direto do frontend — sempre via Edge Function.

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
- **2FA** para `platform_admin` e `nutritionist` — pendente, prioridade
  alta antes de cadastrar dados reais de cliente pagante.
- **Service role** só em Edge Function, nunca no bundle.
- **Backup:** ativar Point-in-Time Recovery quando subir para Supabase Pro.
- **Rate limit** em RPCs públicas (`get_public_label`) — hoje sem limite.

## Roadmap (pontos futuros)

### Curto prazo (próximas 2–4 semanas)

- [ ] **2FA TOTP** para nutri e admin.
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

Faltam (em ordem de retorno):

1. **Dashboard de SaaS:** MRR, churn, orgs ativas/inativas,
   etiquetas/mês por org, top 10 empresas por uso. Detecta org em risco
   de cancelar (sem login há 14 dias).
2. **Health-check por organização:** compliance médio das empresas da
   nutri, NCs em aberto há +30 dias, ASOs vencendo, RT (nutri) com
   muitos ou poucos clientes.
3. **Painel de cobrança:** plano vigente, próxima fatura, histórico de
   pagamentos, suspender/reativar org por inadimplência (sem deletar).
4. **Impersonate ("entrar como nutri")** com log obrigatório no
   `audit_log` — para suporte. Sem isso, é impossível ajudar a Ariane
   sem ela mandar print.
5. **Push manual para uma org** (ex: "Atualização: novo template RDC
   disponível"). Reusa `push_subscriptions` + Edge Function nova.
6. **Gestão de templates globais:** o admin publica um audit_template
   e ele aparece para todas as nutris como "modelo oficial".
7. **Catálogo seed de produtos** (mesma ideia, mas para a tela de
   produtos): admin mantém catálogo público, nutri clona para sua org.
8. **Banner de manutenção/comunicado** global (string no banco lida
   pelo `AuthContext`).
9. **Estatísticas de uso de feature** (quem usa pest_control vs quem
   só imprime etiqueta) — orienta o roadmap.
10. **Backup on-demand** (exportar dump zipado de uma org específica
    para entrega LGPD ou migração).

## Convenções para a próxima sessão de Claude

- **Não criar arquivos `.md`** (incluindo `README` por feature) sem o
  usuário pedir. O codebase prefere conversar do que documentar.
- Em queries Supabase, **sempre** verificar pares de FK ambíguos antes
  de usar embed aninhado.
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
