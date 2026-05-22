import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { Company, UserRole } from '@/lib/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Spinner } from '@/components/ui/Spinner';

interface ProfileRow {
  id: string;
  full_name: string | null;
  email: string | null;
  role: UserRole;
  active: boolean;
  company_id: string | null;
  companies: { name: string } | null;
}

const ROLE_LABELS: Record<UserRole, string> = {
  master: 'Master',
  property: 'Usuário da empresa',
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function UsersPage() {
  const { profile: callerProfile } = useAuth();
  const [users, setUsers] = useState<ProfileRow[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ProfileRow | null>(null);
  const [saving, setSaving] = useState(false);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('property');
  const [companyId, setCompanyId] = useState('');
  const [active, setActive] = useState(true);

  const [deleting, setDeleting] = useState<ProfileRow | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [usersRes, companiesRes] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, full_name, email, role, active, company_id, companies(name)')
        .order('full_name'),
      supabase.from('companies').select('*').eq('active', true).order('name'),
    ]);
    setLoading(false);
    if (usersRes.error) {
      toast.error('Erro ao carregar usuários: ' + usersRes.error.message);
      return;
    }
    setUsers((usersRes.data as unknown as ProfileRow[] | null) ?? []);
    setCompanies((companiesRes.data as Company[] | null) ?? []);
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
    setCompanyId(companies[0]?.id ?? '');
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
    if (role === 'property' && !companyId) {
      toast.error('Selecione a empresa do usuário.');
      return;
    }

    setSaving(true);
    if (editing) {
      const { error } = await supabase.functions.invoke('admin-update-user', {
        body: {
          user_id: editing.id,
          full_name: fullName.trim(),
          role,
          company_id: role === 'property' ? companyId : null,
          active,
          ...(password.length > 0 ? { password } : {}),
        },
      });
      setSaving(false);
      if (error) {
        toast.error('Erro ao salvar usuário: ' + error.message);
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
          company_id: role === 'property' ? companyId : null,
        },
      });
      setSaving(false);
      if (error) {
        toast.error('Erro ao criar usuário: ' + error.message);
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
      toast.error('Erro ao excluir: ' + error.message);
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
        <div className="flex justify-center py-16">
          <Spinner className="h-8 w-8" />
        </div>
      ) : users.length === 0 ? (
        <Card>
          <p className="text-sm text-neutral-600">
            Nenhum usuário cadastrado ainda.
          </p>
        </Card>
      ) : (
        <Card className="!p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-left text-xs uppercase text-neutral-500">
                  <th className="px-4 py-3">Nome</th>
                  <th className="px-4 py-3">E-mail</th>
                  <th className="px-4 py-3">Perfil</th>
                  <th className="px-4 py-3">Empresa</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Ações</th>
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
                    <td className="px-4 py-3 text-neutral-600">
                      {ROLE_LABELS[u.role]}
                    </td>
                    <td className="px-4 py-3 text-neutral-600">
                      {u.companies?.name ?? (u.role === 'master' ? 'Todas' : '—')}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs ${
                          u.active
                            ? 'bg-emerald-50 text-emerald-700'
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
                          className="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-100"
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
                          className="rounded-lg p-1.5 text-red-500 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
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
            <option value="property">Usuário da empresa</option>
            <option value="master">Master (vê todas as empresas)</option>
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
          {editing && (
            <label className="flex items-center gap-2 text-sm text-neutral-700">
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
                disabled={editing.id === callerProfile?.id}
                className="h-4 w-4 accent-emerald-600"
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
