import { supabase } from './supabase';

export interface SystemStats {
  orgsTotal: number;
  companiesActive: number;
  usersActive: number;
  labelsPrinted7d: number;
  receivings7d: number;
  stockMovements7d: number;
}

export type IssueLevel = 'error' | 'warn' | 'info';

export interface SystemIssue {
  key: string;
  level: IssueLevel;
  title: string;
  count: number;
  fixHref?: string;
  examples?: { label: string; href?: string }[];
}

export interface RecentEvent {
  id: string;
  table: string;
  op: string;
  actor: string | null;
  at: string;
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export async function fetchSystemStats(): Promise<SystemStats> {
  const since = new Date(Date.now() - SEVEN_DAYS_MS).toISOString();
  const [orgs, comps, users, labels, recs, mov] = await Promise.all([
    supabase
      .from('organizations')
      .select('*', { count: 'exact', head: true })
      .is('deleted_at', null),
    supabase
      .from('companies')
      .select('*', { count: 'exact', head: true })
      .eq('active', true)
      .is('deleted_at', null),
    supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('active', true),
    supabase
      .from('label_prints')
      .select('*', { count: 'exact', head: true })
      .gte('printed_at', since),
    supabase
      .from('receivings')
      .select('*', { count: 'exact', head: true })
      .gte('received_at', since),
    supabase
      .from('stock_movements')
      .select('*', { count: 'exact', head: true })
      .gte('moved_at', since),
  ]);

  return {
    orgsTotal: orgs.count ?? 0,
    companiesActive: comps.count ?? 0,
    usersActive: users.count ?? 0,
    labelsPrinted7d: labels.count ?? 0,
    receivings7d: recs.count ?? 0,
    stockMovements7d: mov.count ?? 0,
  };
}

export async function fetchSystemIssues(): Promise<SystemIssue[]> {
  const issues: SystemIssue[] = [];

  // 1) Organizações sem dono (owner_user_id null)
  const { data: orgsNoOwner } = await supabase
    .from('organizations')
    .select('id, name')
    .is('owner_user_id', null)
    .is('deleted_at', null)
    .limit(20);
  if (orgsNoOwner && orgsNoOwner.length > 0) {
    issues.push({
      key: 'orgs_no_owner',
      level: 'warn',
      title: 'Organizações sem dono atribuído',
      count: orgsNoOwner.length,
      fixHref: '/platform/organizacoes',
      examples: orgsNoOwner.slice(0, 3).map((o) => ({
        label: o.name as string,
        href: `/platform/organizacoes/${o.id}`,
      })),
    });
  }

  // 2) Empresas ativas sem nenhuma nutri RT na organização
  const { data: companies } = await supabase
    .from('companies')
    .select('id, name, organization_id')
    .eq('active', true)
    .is('deleted_at', null);
  if (companies && companies.length > 0) {
    const orgIds = Array.from(
      new Set(
        companies
          .map((c) => c.organization_id)
          .filter((id): id is string => id !== null && id !== undefined),
      ),
    );
    if (orgIds.length > 0) {
      const { data: nutris } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('role', 'nutritionist')
        .eq('active', true)
        .in('organization_id', orgIds);
      const orgsWithNutri = new Set(
        (nutris ?? [])
          .map((n) => n.organization_id)
          .filter((id): id is string => id !== null && id !== undefined),
      );
      const orphans = companies.filter(
        (c) =>
          c.organization_id && !orgsWithNutri.has(c.organization_id as string),
      );
      if (orphans.length > 0) {
        issues.push({
          key: 'companies_no_nutri',
          level: 'warn',
          title: 'Empresas sem nutricionista responsável',
          count: orphans.length,
          fixHref: '/admin/usuarios',
          examples: orphans
            .slice(0, 3)
            .map((c) => ({ label: c.name as string })),
        });
      }
    }
  }

  // 3) Usuários property ativos sem company_id
  const { data: orphanUsers } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .eq('role', 'property')
    .eq('active', true)
    .is('company_id', null)
    .limit(20);
  if (orphanUsers && orphanUsers.length > 0) {
    issues.push({
      key: 'users_no_company',
      level: 'error',
      title: 'Usuários sem empresa atribuída',
      count: orphanUsers.length,
      fixHref: '/admin/usuarios',
      examples: orphanUsers
        .slice(0, 3)
        .map((u) => ({ label: (u.full_name ?? u.email) as string })),
    });
  }

  // 4) Manipuladores ativos com ASO vencido ou sem ASO.
  // expires_at é DATE ('YYYY-MM-DD'); compara contra a data de hoje
  // como string no mesmo formato pra evitar falso positivo no dia.
  const { data: mans } = await supabase
    .from('manipulators')
    .select('id, full_name, company_id, asos:manipulator_asos(expires_at)')
    .eq('active', true);
  if (mans && mans.length > 0) {
    type Row = {
      id: string;
      full_name: string;
      asos: { expires_at: string }[] | null;
    };
    const today = new Date().toISOString().slice(0, 10);
    const problem = (mans as unknown as Row[]).filter((m) => {
      const asos = m.asos ?? [];
      if (asos.length === 0) return true;
      const latest = asos
        .map((a) => a.expires_at)
        .sort()
        .at(-1);
      return !latest || latest < today;
    });
    if (problem.length > 0) {
      issues.push({
        key: 'manipulators_aso_problem',
        level: 'error',
        title: 'Manipuladores sem ASO válido',
        count: problem.length,
        fixHref: '/manipuladores',
        examples: problem.slice(0, 3).map((m) => ({ label: m.full_name })),
      });
    }
  }

  // 5) Itens na lixeira aguardando expurgo (deletados há +30d ainda presentes).
  // Se uma das tabelas falhar, ignora e segue com as outras — não vale
  // matar o diagnóstico inteiro por causa de um esquema divergente.
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const trashTables = ['companies', 'products', 'manipulators', 'documents'];
  let trashOld = 0;
  for (const t of trashTables) {
    const { count, error } = await supabase
      .from(t)
      .select('id', { count: 'exact', head: true })
      .not('deleted_at', 'is', null)
      .lt('deleted_at', cutoff);
    if (!error) trashOld += count ?? 0;
  }
  if (trashOld > 0) {
    issues.push({
      key: 'trash_old',
      level: 'info',
      title: 'Itens na lixeira há +30 dias',
      count: trashOld,
      fixHref: '/admin/lixeira',
    });
  }

  return issues;
}

export async function fetchRecentEvents(limit = 10): Promise<RecentEvent[]> {
  const { data, error } = await supabase
    .from('audit_log')
    .select('id, table_name, action, user_email, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  type Row = {
    id: string;
    table_name: string;
    action: string;
    user_email: string | null;
    created_at: string;
  };
  return ((data as unknown as Row[] | null) ?? []).map((r) => ({
    id: r.id,
    table: r.table_name,
    op: r.action,
    actor: r.user_email,
    at: r.created_at,
  }));
}
