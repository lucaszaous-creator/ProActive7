import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Search, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { extractInvokeError } from '@/lib/edgeFunction';
import type { Company, Organization, UserRole } from '@/lib/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ListSkeleton } from '@/components/ui/Skeleton';

interface ProfileRow {
  id: string;
  full_name: string | null;
  email: string | null;
  role: UserRole;
  active: boolean;
  company_id: string | null;
  organization_id: string | null;
  companies: {
    name: string;
    organizations: { name: string | null } | null;
  } | null;
  organizations: { name: string | null } | null;
}

const ROLE_LABELS: Record<UserRole, string> = {
  master: 'Master (legado)',
  platform_admin: 'Administrador da plataforma',
  nutritionist: 'Nutricionista',
  property_manager: 'Gerente da empresa',
  property: 'Usuário da empresa',
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function UsersPage() {
  const {
    profile: callerProfile,
    isPlatformAdmin,
    isNutritionist,
    isPropertyManager,
  } = useAuth();

  // Available roles based on caller's own role.
  // - platform_admin pode criar qualquer papel
  // - nutritionist cria gerente OU usuário da empresa
  // - property_manager só cria usuário da empresa (cozinha)
  const availableRoles: UserRole[] = isPlatformAdmin
    ? ['platform_admin', 'nutritionist', 'property_manager', 'property']
    : isNutritionist
      ? ['property_manager', 'property']
      : ['property'];
  const [users, setUsers] = useState<ProfileRow[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ProfileRow | null>(null);
  const [saving, setSaving] = useState(false);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('property');
  const [companyId, setCompanyId] = useState('');
  const [organizationId, setOrganizationId] = useState('');
  const [active, setActive] = useState(true);

  const [deleting, setDeleting] = useState<ProfileRow | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const [search, setSearch] = useState('');
  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => {
      const haystack = [
        u.full_name,
        u.email,
        ROLE_LABELS[u.role],
        u.companies?.name,
        u.companies?.organizations?.name,
        u.organizations?.name,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [users, search]);

  const load = useCallback(async () => {
    setLoading(true);
    const [usersRes, companiesRes, orgsRes] = await Promise.all([
      supabase
        .from('profiles')
        .select(
          'id, full_name, email, role, active, company_id, organization_id, ' +
            'companies(name, organizations(name)), organizations!profiles_organization_id_fkey(name)',
        )
        .order('full_name'),
      supabase.from('companies').select('*').eq('active', true).order('name'),
      supabase
        .from('organizations')
        .select('*')
        .is('deleted_at', null)
        .order('name'),
    ]);
    setLoading(false);
    if (usersRes.error) {
      toast.error('Erro ao carregar usuários: ' + usersRes.error.message);
      return;
    }
    setUsers((usersRes.data as unknown as ProfileRow[] | null) ?? []);
    setCompanies((companiesRes.data as Company[] | null) ?? []);
    setOrganizations((orgsRes.data as Organization[] | null) ?? []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function openCreate() {
    setEditing(null);
    setFullName('');
    setEmail('');
    setPassword('');
    setRole('property');
    // Manager só vê a própria empresa nesta lista (RLS); preenche
    // automaticamente para não exigir clique.
    setCompanyId(
      isPropertyManager
        ? (callerProfile?.company_id ?? '')
        : (companies[0]?.id ?? ''),
    );
    setOrganizationId(organizations[0]?.id ?? '');
    setActive(true);
    setModalOpen(true);
  }

  function openEdit(u: ProfileRow) {
    setEditing(u);
    setFullName(u.full_name ?? '');
    setEmail(u.email ?? '');
    setPassword('');
    setRole(u.role);
    setCompanyId(u.company_id ?? '');
    setOrganizationId(u.organization_id ?? '');
    setActive(u.active);
    setModalOpen(true);
  }

  async function handleSave() {
    if (!fullName.trim()) {
      toast.error('Informe o nome.');
      return;
    }
    if (!editing) {
      if (!email.trim()) {
        toast.error('Informe o e-mail.');
        return;
      }
      if (!EMAIL_RE.test(email.trim())) {
        toast.error('Informe um e-mail válido.');
        return;
      }
      if (password.length < 6) {
        toast.error('A senha deve ter ao menos 6 caracteres.');
        return;
      }
    } else if (password.length > 0 && password.length < 6) {
      toast.error('A nova senha deve ter ao menos 6 caracteres.');
      return;
    }
    const needsCompany = role === 'property' || role === 'property_manager';
    if (needsCompany && !companyId) {
      toast.error('Selecione a empresa do usuário.');
      return;
    }
    if (role === 'nutritionist' && !organizationId) {
      toast.error('Selecione a organização do nutricionista.');
      return;
    }
    if (role === 'nutritionist' && !isPlatformAdmin) {
      toast.error(
        'Apenas administradores da plataforma podem criar nutricionistas.',
      );
      return;
    }
    if (isPropertyManager && role !== 'property') {
      toast.error('Gerente da empresa só pode criar usuários da empresa.');
      return;
    }

    setSaving(true);
    if (editing) {
      const { error } = await supabase.functions.invoke('admin-update-user', {
        body: {
          user_id: editing.id,
          full_name: fullName.trim(),
          role,
          company_id: needsCompany ? companyId : null,
          organization_id: role === 'nutritionist' ? organizationId : null,
          active,
          ...(password.length > 0 ? { password } : {}),
        },
      });
      setSaving(false);
      if (error) {
        const msg = await extractInvokeError(error);
        toast.error('Erro ao salvar usuário: ' + msg);
        return;
      }
      toast.success('Usuário atualizado.');
    } else {
      const { error } = await supabase.functions.invoke('admin-create-user', {
        body: {
          email: email.trim(),
          password,
          full_name: fullName.trim(),
          role,
          company_id: needsCompany ? companyId : null,
          organization_id: role === 'nutritionist' ? organizationId : null,
        },
      });
      setSaving(false);
      if (error) {
        const msg = await extractInvokeError(error);
        toast.error('Erro ao criar usuário: ' + msg);
        return;
      }
      toast.success('Usuário criado.');
    }
    setModalOpen(false);
    void load();
  }

  async function handleDelete() {
    if (!deleting) return;
    setDeleteBusy(true);
    const { error } = await supabase.functions.invoke('admin-delete-user', {
      body: { user_id: deleting.id },
    });
    setDeleteBusy(false);
    if (error) {
      const msg = await extractInvokeError(error);
      toast.error('Erro ao excluir: ' + msg);
      return;
    }
    toast.success('Usuário excluído.');
    setDeleting(null);
    void load();
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-neutral-800 sm:text-2xl">
            Usuários
          </h1>
          <p className="text-sm text-neutral-500">
            Acessos das empresas e do administrador.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus size={18} />
          Novo usuário
        </Button>
      </div>

      {loading ? (
        <ListSkeleton rows={5} />
      ) : users.length === 0 ? (
        <Card>
          <p className="text-sm text-neutral-600">
            Nenhum usuário cadastrado ainda.
          </p>
        </Card>
      ) : (
        <>
          <div className="mb-3 flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2">
            <Search size={16} className="shrink-0 text-neutral-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome, e-mail, empresa ou organização..."
              className="min-w-0 flex-1 bg-transparent text-sm text-neutral-800 outline-none placeholder:text-neutral-400"
            />
            {search ? (
              <button
                type="button"
                onClick={() => setSearch('')}
                aria-label="Limpar busca"
                className="rounded p-1 text-neutral-400 hover:bg-neutral-100"
              >
                <X size={14} />
              </button>
            ) : null}
          </div>
          <Card className="!p-0">
            <div className="w-full overflow-x-auto">
              <table className="w-full min-w-[680px] text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 text-left text-xs uppercase text-neutral-500">
                    <th className="px-4 py-3">Nome</th>
                    <th className="px-4 py-3">E-mail</th>
                    <th className="px-4 py-3">Perfil</th>
                    <th className="px-4 py-3">Vínculo</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-8 text-center text-sm text-neutral-500"
                      >
                        Nenhum usuário encontrado para "{search}".
                      </td>
                    </tr>
                  ) : null}
                  {filteredUsers.map((u) => (
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
                      <td className="px-4 py-3 text-neutral-600">
                        {ROLE_LABELS[u.role]}
                      </td>
                      <td className="px-4 py-3 text-neutral-600">
                        <UserLink user={u} />
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs ${
                            u.active
                              ? 'bg-neutral-50 text-neutral-700'
                              : 'bg-neutral-100 text-neutral-500'
                          }`}
                        >
                          {u.active ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => openEdit(u)}
                            aria-label="Editar"
                            className="rounded-lg p-2.5 text-neutral-500 hover:bg-neutral-100"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            onClick={() => setDeleting(u)}
                            aria-label="Excluir"
                            disabled={u.id === callerProfile?.id}
                            title={
                              u.id === callerProfile?.id
                                ? 'Você não pode excluir o próprio usuário'
                                : 'Excluir'
                            }
                            className="rounded-lg p-2.5 text-red-500 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Editar usuário' : 'Novo usuário'}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setModalOpen(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button onClick={handleSave} loading={saving}>
              {editing ? 'Salvar' : 'Criar usuário'}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Input
            id="u-name"
            label="Nome completo"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
          <Input
            id="u-email"
            label="E-mail"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={editing !== null}
            autoComplete="off"
          />
          <Input
            id="u-pass"
            label={editing ? 'Nova senha (opcional)' : 'Senha inicial'}
            type="text"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={
              editing
                ? 'Deixe em branco para manter a senha atual'
                : 'Mínimo 6 caracteres'
            }
            autoComplete="off"
          />
          <Select
            id="u-role"
            label="Perfil de acesso"
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
          >
            {availableRoles.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </Select>
          {role === 'property' && (
            <Select
              id="u-company"
              label="Empresa"
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
            >
              <option value="">Selecione...</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          )}
          {role === 'nutritionist' && (
            <Select
              id="u-org"
              label="Organização"
              value={organizationId}
              onChange={(e) => setOrganizationId(e.target.value)}
            >
              <option value="">Selecione...</option>
              {organizations.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </Select>
          )}
          {editing && (
            <label className="flex items-center gap-2 text-sm text-neutral-700">
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
                disabled={editing.id === callerProfile?.id}
                className="h-5 w-5 accent-neutral-600"
              />
              Usuário ativo
              {editing.id === callerProfile?.id && (
                <span className="text-xs text-neutral-400">
                  (não é possível desativar a si mesmo)
                </span>
              )}
            </label>
          )}
        </div>
      </Modal>

      <ConfirmDialog
        open={deleting !== null}
        title="Excluir usuário"
        message={`Tem certeza que deseja excluir "${
          deleting?.full_name ?? deleting?.email
        }"? Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        loading={deleteBusy}
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}

/**
 * Mostra o vinculo do usuario:
 *  - property:        "Empresa X" + sub-linha "Org Y"
 *  - nutritionist:    "Org Y"     + sub-linha "Nutricionista responsavel"
 *  - platform_admin:  "Plataforma" + sub-linha "Org da plataforma"
 */
function UserLink({ user }: { user: ProfileRow }) {
  if (user.role === 'property') {
    const empresa = user.companies?.name ?? '—';
    const org =
      user.companies?.organizations?.name ?? user.organizations?.name ?? null;
    return (
      <div className="leading-tight">
        <div className="font-medium text-neutral-800">{empresa}</div>
        {org ? (
          <div className="mt-0.5 text-xs text-neutral-500">Org · {org}</div>
        ) : (
          <div className="mt-0.5 text-xs text-amber-600">
            Sem organização vinculada
          </div>
        )}
      </div>
    );
  }
  if (user.role === 'nutritionist') {
    const org = user.organizations?.name ?? '—';
    return (
      <div className="leading-tight">
        <div className="font-medium text-neutral-800">{org}</div>
        <div className="mt-0.5 text-xs text-neutral-500">
          Nutricionista responsável
        </div>
      </div>
    );
  }
  // platform_admin / master
  return (
    <div className="leading-tight">
      <div className="font-medium text-neutral-800">Plataforma</div>
      {user.organizations?.name ? (
        <div className="mt-0.5 text-xs text-neutral-500">
          {user.organizations.name}
        </div>
      ) : null}
    </div>
  );
}
