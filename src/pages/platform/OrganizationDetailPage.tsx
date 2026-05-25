import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Organization, Company } from '@/lib/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
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
  const [loading, setLoading] = useState(true);
  const [togglingStatus, setTogglingStatus] = useState(false);

  useEffect(() => {
    if (!id) return;

    async function fetchAll() {
      setLoading(true);
      const [orgRes, companiesRes, usersRes] = await Promise.all([
        supabase
          .from('organizations')
          .select('*')
          .eq('id', id!)
          .maybeSingle(),
        supabase
          .from('companies')
          .select('*')
          .eq('organization_id', id!)
          .is('deleted_at', null)
          .order('name'),
        supabase
          .from('profiles')
          .select('id, full_name, email, role, active, company_id, companies(name)')
          .eq('organization_id', id!)
          .order('full_name'),
      ]);
      setLoading(false);

      if (orgRes.error) {
        toast.error('Erro ao carregar organização: ' + orgRes.error.message);
        return;
      }
      setOrg((orgRes.data as Organization | null) ?? null);

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
      newStatus === 'active' ? 'Organização reativada.' : 'Organização suspensa.',
    );
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
          {org.status === 'active' ? 'Suspender organização' : 'Reativar organização'}
        </Button>
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
