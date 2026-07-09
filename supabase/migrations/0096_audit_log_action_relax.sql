-- =====================================================================
-- 0096_audit_log_action_relax.sql
--
-- O CHECK original (0036) so aceita action IN ('INSERT','UPDATE','DELETE'),
-- mas varias edge functions gravam acoes OPERACIONAIS no audit_log:
--   - admin-impersonate: 'impersonate' e 'impersonated_by_admin'
--     (transparencia LGPD — a nutri precisa enxergar o acesso de suporte);
--   - admin-export-org:  'export';
--   - admin-push-org:    'push_manual'.
--
-- Como esses inserts NAO checavam o erro, eles vinham falhando em silencio
-- (o CHECK rejeitava a linha) — o audit_log nunca registrava esses eventos.
-- Log de eventos operacionais e append-only e a acao e texto livre por
-- natureza; remover o CHECK desbloqueia o registro sem risco.
-- =====================================================================

alter table public.audit_log
  drop constraint if exists audit_log_action_check;
