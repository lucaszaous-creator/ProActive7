import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Plus, Pencil, Eye, Building2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Organization, Plan } from '@/lib/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { ListSkeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function OrganizationsPage() {
  const navigate = useNavigate();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Organization | null>(null);
  const [saving, setSaving] = useState(false);

  // Org fields
  const [name, setName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [status, setStatus] = useState<'active' | 'suspended'>('active');

  // Create-only: nutritionist account
  const [nutritionistEmail, setNutritionistEmail] = useState('');
  const [nutritionistPassword, setNutritionistPassword] = useState('');
  const [nutritionistName, setNutritionistName] = useState('');

  // Create-only: plano contratado + vigência
  const [plans, setPlans] = useState<Plan[]>([]);
  const [planKey, setPlanKey] = useState('');
  const [trialEndsAt, setTrialEndsAt] = useState('');
  const [planRenewsAt, setPlanRenewsAt] = useState('');

  useEffect(() => {
    void supabase
      .from('plans')
      .select('*')
      .eq('active', true)
      .order('sort_order')
      .then(({ data }) => setPlans((data as Plan[] | null) ?? []));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .is('deleted_at', null)
      .order('name');
    setLoading(false);
    if (error) {
      toast.error('Erro ao carregar organizações: ' + error.message);
      return;
    }
    setOrganizations((data as Organization[] | null) ?? []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function openCreate() {
    setEditing(null);
    setName('');
    setContactEmail('');
    setContactPhone('');
    setStatus('active');
    setNutritionistEmail('');
    setNutritionistPassword('');
    setNutritionistName('');
    setPlanKey('');
    setTrialEndsAt('');
    setPlanRenewsAt('');
    setModalOpen(true);
  }

  function openEdit(org: Organization) {
    setEditing(org);
    setName(org.name);
    setContactEmail(org.contact_email ?? '');
    setContactPhone(org.contact_phone ?? '');
    setStatus(org.status);
    setModalOpen(true);
  }

  async function handleSave() {
    if (!name.trim()) {
      toast.error('Informe o nome da organização.');
      return;
    }

    if (!editing) {
      // Create: validate nutritionist fields
      if (!nutritionistEmail.trim()) {
        toast.error('Informe o e-mail do nutricionista.');
        return;
      }
      if (!EMAIL_RE.test(nutritionistEmail.trim())) {
        toast.error('Informe um e-mail válido para o nutricionista.');
        return;
      }
      if (nutritionistPassword.length < 8) {
        toast.error('A senha do nutricionista deve ter ao menos 8 caracteres.');
        return;
      }
    }

    setSaving(true);

    if (editing) {
      // Update existing org
      const { error } = await supabase
        .from('organizations')
        .update({
          name: name.trim(),
          contact_email: contactEmail.trim() || null,
          contact_phone: contactPhone.trim() || null,
          status,
        })
        .eq('id', editing.id);
      setSaving(false);
      if (error) {
        toast.error('Erro ao atualizar organização: ' + error.message);
        return;
      }
      toast.success('Organização atualizada.');
    } else {
      // Create new org + nutritionist user via edge function
      const { error } = await supabase.functions.invoke(
        'admin-create-organization',
        {
          body: {
            org_name: name.trim(),
            contact_email: contactEmail.trim() || null,
            contact_phone: contactPhone.trim() || null,
            nutritionist_email: nutritionistEmail.trim(),
            nutritionist_password: nutritionistPassword,
            nutritionist_name: nutritionistName.trim() || null,
            plan_key: planKey || null,
            trial_ends_at: trialEndsAt || null,
            plan_renews_at: planRenewsAt || null,
          },
        },
      );
      setSaving(false);
      if (error) {
        toast.error('Erro ao criar organização: ' + error.message);
        return;
      }
      toast.success('Organização criada com sucesso.');
    }

    setModalOpen(false);
    void load();
  }

  async function handleToggleStatus(org: Organization) {
    const newStatus = org.status === 'active' ? 'suspended' : 'active';
    const { error } = await supabase
      .from('organizations')
      .update({ status: newStatus })
      .eq('id', org.id);
    if (error) {
      toast.error('Erro ao atualizar status: ' + error.message);
      return;
    }
    toast.success(
      newStatus === 'active'
        ? 'Organização reativada.'
        : 'Organização suspensa.',
    );
    void load();
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-neutral-800 sm:text-2xl">
            Organizações
          </h1>
          <p className="text-sm text-neutral-500">
            Organizações de nutricionistas que gerenciam empresas.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus size={18} />
          Nova organização
        </Button>
      </div>

      {loading ? (
        <ListSkeleton rows={5} />
      ) : organizations.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="Nenhuma organização cadastrada ainda"
          description="Crie a primeira organização para começar a operar a plataforma."
        />
      ) : (
        <Card className="!p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-left text-xs uppercase text-neutral-500">
                  <th className="px-4 py-3">Organização</th>
                  <th className="px-4 py-3">E-mail de contato</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Criada em</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {organizations.map((org) => (
                  <tr
                    key={org.id}
                    className="border-b border-neutral-100 last:border-0"
                  >
                    <td className="px-4 py-3 font-medium text-neutral-800">
                      {org.name}
                    </td>
                    <td className="px-4 py-3 text-neutral-600">
                      {org.contact_email ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          org.status === 'active'
                            ? 'bg-neutral-50 text-neutral-700'
                            : 'bg-red-50 text-red-700'
                        }`}
                      >
                        {org.status === 'active' ? 'Ativa' : 'Suspensa'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-neutral-600">
                      {new Date(org.created_at).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() =>
                            navigate(`/platform/organizacoes/${org.id}`)
                          }
                          aria-label="Ver detalhes"
                          title="Ver detalhes"
                          className="rounded-lg p-2.5 text-neutral-500 hover:bg-neutral-100"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => openEdit(org)}
                          aria-label="Editar"
                          title="Editar"
                          className="rounded-lg p-2.5 text-neutral-500 hover:bg-neutral-100"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => void handleToggleStatus(org)}
                          aria-label={
                            org.status === 'active' ? 'Suspender' : 'Reativar'
                          }
                          title={
                            org.status === 'active' ? 'Suspender' : 'Reativar'
                          }
                          className={`rounded-lg px-2.5 py-1.5 text-xs font-medium ${
                            org.status === 'active'
                              ? 'text-red-600 hover:bg-red-50'
                              : 'text-neutral-600 hover:bg-neutral-50'
                          }`}
                        >
                          {org.status === 'active' ? 'Suspender' : 'Reativar'}
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
        title={editing ? 'Editar organização' : 'Nova organização'}
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
              {editing ? 'Salvar' : 'Criar organização'}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Input
            id="org-name"
            label="Nome da organização"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Input
            id="org-email"
            label="E-mail de contato (opcional)"
            type="email"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
          />
          <Input
            id="org-phone"
            label="Telefone de contato (opcional)"
            value={contactPhone}
            onChange={(e) => setContactPhone(e.target.value)}
          />
          <Select
            id="org-status"
            label="Status"
            value={status}
            onChange={(e) =>
              setStatus(e.target.value as 'active' | 'suspended')
            }
          >
            <option value="active">Ativa</option>
            <option value="suspended">Suspensa</option>
          </Select>

          {!editing && (
            <div className="flex flex-col gap-4 border-t border-neutral-200 pt-4">
              <p className="text-sm font-medium text-neutral-700">
                Conta do nutricionista (responsável pela organização)
              </p>
              <Input
                id="org-nutritionist-email"
                label="E-mail do nutricionista"
                type="email"
                value={nutritionistEmail}
                onChange={(e) => setNutritionistEmail(e.target.value)}
                autoComplete="off"
              />
              <Input
                id="org-nutritionist-password"
                label="Senha inicial (mín. 8 caracteres)"
                type="text"
                value={nutritionistPassword}
                onChange={(e) => setNutritionistPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                autoComplete="off"
              />
              <Input
                id="org-nutritionist-name"
                label="Nome do nutricionista (opcional)"
                value={nutritionistName}
                onChange={(e) => setNutritionistName(e.target.value)}
              />
            </div>
          )}

          {!editing && (
            <div className="flex flex-col gap-4 border-t border-neutral-200 pt-4">
              <p className="text-sm font-medium text-neutral-700">
                Plano contratado
              </p>
              <Select
                id="org-plan"
                label="Plano"
                value={planKey}
                onChange={(e) => setPlanKey(e.target.value)}
              >
                <option value="">Sem plano (define depois)</option>
                {plans.map((p) => (
                  <option key={p.key} value={p.key}>
                    {p.name}
                    {p.company_limit === null
                      ? ' · empresas ilimitadas'
                      : ` · até ${p.company_limit} empresa${p.company_limit === 1 ? '' : 's'}`}
                  </option>
                ))}
              </Select>
              {!planKey && (
                <p className="-mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
                  Sem plano, a nutricionista verá apenas os módulos básicos até
                  você atribuir um plano na tela da organização.
                </p>
              )}
              <div className="grid grid-cols-2 gap-3">
                <Input
                  id="org-trial"
                  label="Fim do trial (opcional)"
                  type="date"
                  value={trialEndsAt}
                  onChange={(e) => setTrialEndsAt(e.target.value)}
                />
                <Input
                  id="org-renews"
                  label="Renovação (opcional)"
                  type="date"
                  value={planRenewsAt}
                  onChange={(e) => setPlanRenewsAt(e.target.value)}
                />
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
