import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, LogIn, Send, Download } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Organization, Company, Plan } from '@/lib/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';

interface OrgProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string;
  active: boolean;
  company_id: string | null;
  companies: { name: string } | null;
}

export function OrganizationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [org, setOrg] = useState<Organization | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [users, setUsers] = useState<OrgProfile[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [savingPlan, setSavingPlan] = useState(false);
  const [loading, setLoading] = useState(true);
  const [togglingStatus, setTogglingStatus] = useState(false);
  const [impersonating, setImpersonating] = useState<string | null>(null);
  const [pushOpen, setPushOpen] = useState(false);
  const [pushTitle, setPushTitle] = useState('');
  const [pushBody, setPushBody] = useState('');
  const [pushing, setPushing] = useState(false);
  const [exporting, setExporting] = useState(false);

  async function handleExport() {
    if (!org) return;
    setExporting(true);
    const { data, error } = await supabase.functions.invoke(
      'admin-export-org',
      {
        body: { organization_id: org.id },
      },
    );
    setExporting(false);
    if (error || !data?.dump) {
      toast.error(
        'Erro ao exportar: ' + (error?.message ?? data?.error ?? '?'),
      );
      return;
    }
    const blob = new Blob([JSON.stringify(data.dump, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup-${org.slug ?? org.id.slice(0, 8)}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Backup exportado.');
  }

  async function handleImpersonate(targetId: string, targetName: string) {
    setImpersonating(targetId);
    const { data, error } = await supabase.functions.invoke(
      'admin-impersonate',
      {
        body: { target_user_id: targetId },
      },
    );
    setImpersonating(null);
    if (error || !data?.action_link) {
      toast.error('Erro: ' + (error?.message ?? data?.error ?? 'desconhecido'));
      return;
    }
    toast.success(`Abrindo sessão como ${targetName}...`);
    window.open(data.action_link, '_blank');
  }

  async function handlePush() {
    if (!org) return;
    if (!pushTitle.trim() || !pushBody.trim()) {
      toast.error('Preencha título e mensagem.');
      return;
    }
    setPushing(true);
    const { data, error } = await supabase.functions.invoke('admin-push-org', {
      body: {
        organization_id: org.id,
        title: pushTitle.trim(),
        body: pushBody.trim(),
      },
    });
    setPushing(false);
    if (error) {
      toast.error('Erro: ' + error.message);
      return;
    }
    toast.success(`Push enviado para ${data?.sent ?? 0} dispositivos.`);
    setPushOpen(false);
    setPushTitle('');
    setPushBody('');
  }

  useEffect(() => {
    if (!id) return;

    async function fetchAll() {
      setLoading(true);
      const [orgRes, companiesRes, usersRes, plansRes] = await Promise.all([
        supabase.from('organizations').select('*').eq('id', id!).maybeSingle(),
        supabase
          .from('companies')
          .select('*')
          .eq('organization_id', id!)
          .is('deleted_at', null)
          .order('name'),
        supabase
          .from('profiles')
          .select(
            'id, full_name, email, role, active, company_id, companies(name)',
          )
          .eq('organization_id', id!)
          .order('full_name'),
        supabase.from('plans').select('*').order('sort_order'),
      ]);
      setLoading(false);

      if (orgRes.error) {
        toast.error('Erro ao carregar organização: ' + orgRes.error.message);
        return;
      }
      setOrg((orgRes.data as Organization | null) ?? null);
      setPlans((plansRes.data as Plan[] | null) ?? []);

      if (companiesRes.error) {
        toast.error('Erro ao carregar empresas: ' + companiesRes.error.message);
      } else {
        setCompanies((companiesRes.data as Company[] | null) ?? []);
      }

      if (usersRes.error) {
        toast.error('Erro ao carregar usuários: ' + usersRes.error.message);
      } else {
        setUsers((usersRes.data as unknown as OrgProfile[] | null) ?? []);
      }
    }

    void fetchAll();
  }, [id]);

  async function handleToggleStatus() {
    if (!org) return;
    const newStatus = org.status === 'active' ? 'suspended' : 'active';
    setTogglingStatus(true);
    const { error } = await supabase
      .from('organizations')
      .update({ status: newStatus })
      .eq('id', org.id);
    setTogglingStatus(false);
    if (error) {
      toast.error('Erro ao atualizar status: ' + error.message);
      return;
    }
    setOrg({ ...org, status: newStatus });
    toast.success(
      newStatus === 'active'
        ? 'Organização reativada.'
        : 'Organização suspensa.',
    );
  }

  async function handleChangePlan(planKey: string) {
    if (!org) return;
    setSavingPlan(true);
    const { error } = await supabase
      .from('organizations')
      .update({ plan_key: planKey || null })
      .eq('id', org.id);
    setSavingPlan(false);
    if (error) {
      toast.error('Erro ao atualizar plano: ' + error.message);
      return;
    }
    setOrg({ ...org, plan_key: planKey || null });
    toast.success('Plano atualizado.');
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (!org) {
    return (
      <div className="mx-auto max-w-4xl">
        <p className="text-sm text-neutral-600">Organização não encontrada.</p>
        <Button
          variant="secondary"
          className="mt-4"
          onClick={() => navigate('/platform/organizacoes')}
        >
          <ArrowLeft size={16} />
          Voltar
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <button
            onClick={() => navigate('/platform/organizacoes')}
            className="mb-2 flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-700"
          >
            <ArrowLeft size={14} />
            Organizações
          </button>
          <h1 className="text-xl font-semibold text-neutral-800 sm:text-2xl">
            {org.name}
          </h1>
          <span
            className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
              org.status === 'active'
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-red-50 text-red-700'
            }`}
          >
            {org.status === 'active' ? 'Ativa' : 'Suspensa'}
          </span>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setPushOpen(true)}>
            <Send size={14} /> Notificar
          </Button>
          <Button
            variant="secondary"
            onClick={() => void handleExport()}
            loading={exporting}
            title="Backup LGPD: exporta tudo da org em JSON"
          >
            <Download size={14} /> Backup
          </Button>
          <Button
            variant="secondary"
            onClick={() => void handleToggleStatus()}
            loading={togglingStatus}
            className={
              org.status === 'active'
                ? 'border-red-200 text-red-600 hover:bg-red-50'
                : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
            }
          >
            {org.status === 'active' ? 'Suspender' : 'Reativar'}
          </Button>
        </div>
      </div>

      {/* Org info */}
      <Card>
        <h2 className="mb-3 text-base font-semibold text-neutral-800">
          Informações
        </h2>
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium uppercase text-neutral-500">
              Slug
            </dt>
            <dd className="mt-0.5 text-sm text-neutral-800">
              {org.slug ?? '—'}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase text-neutral-500">
              E-mail de contato
            </dt>
            <dd className="mt-0.5 text-sm text-neutral-800">
              {org.contact_email ?? '—'}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase text-neutral-500">
              Telefone de contato
            </dt>
            <dd className="mt-0.5 text-sm text-neutral-800">
              {org.contact_phone ?? '—'}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase text-neutral-500">
              Criada em
            </dt>
            <dd className="mt-0.5 text-sm text-neutral-800">
              {new Date(org.created_at).toLocaleDateString('pt-BR')}
            </dd>
          </div>
        </dl>
      </Card>

      {/* Assinatura */}
      {(() => {
        const currentPlan = plans.find((p) => p.key === org.plan_key) ?? null;
        const activeCompanies = companies.filter((c) => c.active).length;
        const limit = currentPlan?.company_limit ?? null;
        const overLimit = limit !== null && activeCompanies > limit;
        return (
          <Card>
            <h2 className="mb-3 text-base font-semibold text-neutral-800 dark:text-neutral-100">
              Assinatura
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <Select
                  label="Plano"
                  value={org.plan_key ?? ''}
                  onChange={(e) => void handleChangePlan(e.target.value)}
                  disabled={savingPlan}
                >
                  <option value="">Sem plano</option>
                  {plans.map((p) => (
                    <option key={p.key} value={p.key}>
                      {p.name}
                    </option>
                  ))}
                </Select>
                {currentPlan && (
                  <p className="mt-1 text-xs text-neutral-500">
                    {currentPlan.allowed_modules.length} módulos liberados.
                  </p>
                )}
              </div>
              <div className="flex flex-col justify-center rounded-lg bg-neutral-50 px-3 py-2 dark:bg-slate-800">
                <p className="text-xs font-medium uppercase text-neutral-500">
                  Empresas ativas
                </p>
                <p className="text-sm text-neutral-800 dark:text-neutral-100">
                  {activeCompanies}
                  {limit !== null ? ` / ${limit}` : ' / ilimitado'}
                  {overLimit && (
                    <span className="ml-2 text-xs font-medium text-amber-600 dark:text-amber-400">
                      acima do limite
                    </span>
                  )}
                </p>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2 text-xs">
              <span className="font-medium uppercase text-neutral-500">
                Acesso de suporte (impersonate):
              </span>
              <span
                className={`rounded-full px-2 py-0.5 font-medium ${
                  org.allow_impersonation
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                    : 'bg-neutral-100 text-neutral-500 dark:bg-slate-800'
                }`}
              >
                {org.allow_impersonation ? 'Autorizado pela nutri' : 'Não autorizado'}
              </span>
            </div>
          </Card>
        );
      })()}

      {/* Companies */}
      <div>
        <h2 className="mb-3 text-base font-semibold text-neutral-800">
          Empresas ({companies.length})
        </h2>
        {companies.length === 0 ? (
          <Card>
            <p className="text-sm text-neutral-600">
              Nenhuma empresa nesta organização.
            </p>
          </Card>
        ) : (
          <Card className="!p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px] text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 text-left text-xs uppercase text-neutral-500">
                    <th className="px-4 py-3">Empresa</th>
                    <th className="px-4 py-3">CNPJ</th>
                    <th className="px-4 py-3">Telefone</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {companies.map((c) => (
                    <tr
                      key={c.id}
                      className="border-b border-neutral-100 last:border-0"
                    >
                      <td className="px-4 py-3 font-medium text-neutral-800">
                        {c.name}
                      </td>
                      <td className="px-4 py-3 text-neutral-600">
                        {c.cnpj ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-neutral-600">
                        {c.phone ?? '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            c.active
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-neutral-100 text-neutral-500'
                          }`}
                        >
                          {c.active ? 'Ativa' : 'Inativa'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>

      {/* Users */}
      <div>
        <h2 className="mb-3 text-base font-semibold text-neutral-800">
          Usuários ({users.length})
        </h2>
        {users.length === 0 ? (
          <Card>
            <p className="text-sm text-neutral-600">
              Nenhum usuário nesta organização.
            </p>
          </Card>
        ) : (
          <Card className="!p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 text-left text-xs uppercase text-neutral-500">
                    <th className="px-4 py-3">Nome</th>
                    <th className="px-4 py-3">E-mail</th>
                    <th className="px-4 py-3">Perfil</th>
                    <th className="px-4 py-3">Empresa</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr
                      key={u.id}
                      className="border-b border-neutral-100 last:border-0"
                    >
                      <td className="px-4 py-3 font-medium text-neutral-800">
                        {u.full_name ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-neutral-600">
                        {u.email ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-neutral-600 capitalize">
                        {u.role === 'nutritionist'
                          ? 'Nutricionista'
                          : u.role === 'property'
                            ? 'Usuário da empresa'
                            : u.role}
                      </td>
                      <td className="px-4 py-3 text-neutral-600">
                        {u.companies?.name ?? '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            u.active
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-neutral-100 text-neutral-500'
                          }`}
                        >
                          {u.active ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() =>
                            void handleImpersonate(
                              u.id,
                              u.full_name ?? u.email ?? 'usuário',
                            )
                          }
                          disabled={
                            impersonating === u.id ||
                            !u.active ||
                            !org.allow_impersonation
                          }
                          className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 px-2 py-1 text-xs text-neutral-600 hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
                          title={
                            org.allow_impersonation
                              ? 'Abrir sessão como este usuário'
                              : 'A organização não autorizou o acesso de suporte (LGPD). A nutri precisa habilitar em Minha assinatura.'
                          }
                        >
                          <LogIn size={12} />
                          {impersonating === u.id ? '...' : 'Entrar como'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>

      <Modal
        open={pushOpen}
        onClose={() => setPushOpen(false)}
        title={`Notificar ${org.name}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setPushOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => void handlePush()} loading={pushing}>
              Enviar
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Input
            label="Título"
            value={pushTitle}
            onChange={(e) => setPushTitle(e.target.value)}
            maxLength={60}
          />
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-600">
              Mensagem
            </label>
            <textarea
              value={pushBody}
              onChange={(e) => setPushBody(e.target.value)}
              rows={3}
              maxLength={240}
              className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none dark:border-neutral-700 dark:bg-slate-800"
            />
          </div>
          <p className="text-xs text-neutral-500">
            Será enviado para todos os dispositivos com push habilitado nos
            usuários desta organização.
          </p>
        </div>
      </Modal>
    </div>
  );
}
