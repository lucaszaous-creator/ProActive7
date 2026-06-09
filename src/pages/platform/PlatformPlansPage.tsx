import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Pencil, CreditCard } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { usePageTitle } from '@/lib/usePageTitle';
import { MODULES } from '@/lib/modules';
import type { Plan } from '@/lib/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { ListSkeleton } from '@/components/ui/Skeleton';
import { PageHeader } from '@/components/ui/PageHeader';

export function PlatformPlansPage() {
  usePageTitle('Planos');
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Plan | null>(null);
  const [saving, setSaving] = useState(false);

  const [key, setKey] = useState('');
  const [name, setName] = useState('');
  const [companyLimit, setCompanyLimit] = useState('');
  const [priceCents, setPriceCents] = useState('0');
  const [sortOrder, setSortOrder] = useState('0');
  const [active, setActive] = useState(true);
  const [modules, setModules] = useState<string[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('plans')
      .select('*')
      .order('sort_order');
    setLoading(false);
    if (error) {
      toast.error('Erro ao carregar planos: ' + error.message);
      return;
    }
    setPlans((data as Plan[] | null) ?? []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function openCreate() {
    setEditing(null);
    setKey('');
    setName('');
    setCompanyLimit('');
    setPriceCents('0');
    setSortOrder(String(plans.length));
    setActive(true);
    setModules([]);
    setModalOpen(true);
  }

  function openEdit(p: Plan) {
    setEditing(p);
    setKey(p.key);
    setName(p.name);
    setCompanyLimit(p.company_limit === null ? '' : String(p.company_limit));
    setPriceCents(String(p.price_cents));
    setSortOrder(String(p.sort_order));
    setActive(p.active);
    setModules(p.allowed_modules ?? []);
    setModalOpen(true);
  }

  async function handleSave() {
    if (!key.trim() || !name.trim()) {
      toast.error('Informe a chave e o nome do plano.');
      return;
    }
    setSaving(true);
    const payload = {
      key: key.trim(),
      name: name.trim(),
      company_limit: companyLimit.trim() === '' ? null : Number(companyLimit),
      price_cents: Number(priceCents) || 0,
      sort_order: Number(sortOrder) || 0,
      active,
      allowed_modules: modules,
    };
    const { error } = editing
      ? await supabase.from('plans').update(payload).eq('key', editing.key)
      : await supabase.from('plans').insert(payload);
    setSaving(false);
    if (error) {
      toast.error('Erro ao salvar: ' + error.message);
      return;
    }
    toast.success(editing ? 'Plano atualizado.' : 'Plano criado.');
    setModalOpen(false);
    void load();
  }

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Planos"
        subtitle="Catálogo de planos: limite de empresas e módulos liberados. A cobrança é controlada manualmente (sem gateway)."
        actions={
          <Button onClick={openCreate}>
            <Plus size={18} />
            Novo plano
          </Button>
        }
      />

      {loading ? (
        <ListSkeleton rows={4} />
      ) : plans.length === 0 ? (
        <Card>
          <p className="text-sm text-neutral-600 dark:text-neutral-300">
            Nenhum plano cadastrado.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((p) => (
            <div
              key={p.key}
              className="flex flex-col gap-2 rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-slate-900"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <CreditCard size={16} className="text-neutral-600" />
                    <p className="truncate font-medium text-neutral-800 dark:text-neutral-100">
                      {p.name}
                    </p>
                  </div>
                  <p className="text-xs text-neutral-400">{p.key}</p>
                </div>
                <button
                  onClick={() => openEdit(p)}
                  aria-label="Editar"
                  title="Editar"
                  className="rounded-lg p-2 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-slate-800"
                >
                  <Pencil size={16} />
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5 text-xs">
                <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-neutral-600 dark:bg-slate-800 dark:text-neutral-300">
                  {p.company_limit === null
                    ? 'Empresas: ilimitado'
                    : `Empresas: ${p.company_limit}`}
                </span>
                <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-neutral-600 dark:bg-slate-800 dark:text-neutral-300">
                  {(p.allowed_modules ?? []).length} módulos
                </span>
                {!p.active && (
                  <span className="rounded-full bg-amber-50 px-2 py-0.5 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                    inativo
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? `Editar plano: ${editing.name}` : 'Novo plano'}
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
              Salvar
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <Input
              id="plan-key"
              label="Chave (sem espaços)"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="ex.: profissional"
              disabled={!!editing}
            />
            <Input
              id="plan-name"
              label="Nome"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ex.: Profissional"
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Input
              id="plan-limit"
              label="Limite de empresas"
              type="number"
              min={0}
              value={companyLimit}
              onChange={(e) => setCompanyLimit(e.target.value)}
              placeholder="vazio = ∞"
            />
            <Input
              id="plan-price"
              label="Preço (centavos)"
              type="number"
              min={0}
              value={priceCents}
              onChange={(e) => setPriceCents(e.target.value)}
            />
            <Input
              id="plan-order"
              label="Ordem"
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
            />
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Módulos liberados
            </p>
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {MODULES.map((m) => {
                const checked = modules.includes(m.key);
                return (
                  <label
                    key={m.key}
                    className="flex items-start gap-2 text-sm text-neutral-700 dark:text-neutral-300"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) =>
                        setModules((prev) =>
                          e.target.checked
                            ? [...prev, m.key]
                            : prev.filter((k) => k !== m.key),
                        )
                      }
                      className="mt-0.5 h-4 w-4 accent-neutral-600"
                    />
                    {m.label}
                  </label>
                );
              })}
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300">
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="h-5 w-5 accent-neutral-600"
            />
            Plano ativo
          </label>
        </div>
      </Modal>
    </div>
  );
}
