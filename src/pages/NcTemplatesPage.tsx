import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertOctagon,
  ArrowLeft,
  Copy,
  Eye,
  EyeOff,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { usePageTitle } from '@/lib/usePageTitle';
import {
  NC_SEVERITY_LABELS,
  type NcSeverity,
  type NcTemplate,
} from '@/lib/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { ListSkeleton } from '@/components/ui/Skeleton';
import { PageHeader } from '@/components/ui/PageHeader';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

const SEVERITIES: NcSeverity[] = ['low', 'medium', 'high', 'critical'];

const SEVERITY_COLOR: Record<NcSeverity, string> = {
  low: 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300',
  medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-200',
  high: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-200',
  critical: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200',
};

interface Form {
  name: string;
  category: string;
  severity: NcSeverity;
  description: string;
  what: string;
  why: string;
  where_loc: string;
  how: string;
  how_much: string;
  default_due_days: string;
}

const emptyForm: Form = {
  name: '',
  category: '',
  severity: 'medium',
  description: '',
  what: '',
  why: '',
  where_loc: '',
  how: '',
  how_much: '',
  default_due_days: '30',
};

export function NcTemplatesPage() {
  usePageTitle('Modelos de NC');

  const [rows, setRows] = useState<NcTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<NcTemplate | null>(null);
  const [form, setForm] = useState<Form>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<NcTemplate | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('nc_templates')
      .select('*')
      .order('name')
      .limit(300);
    setLoading(false);
    if (error) {
      toast.error('Erro ao carregar modelos: ' + error.message);
      return;
    }
    setRows((data as NcTemplate[] | null) ?? []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) if (r.category) set.add(r.category);
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [rows]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(t: NcTemplate) {
    setEditing(t);
    setForm({
      name: t.name,
      category: t.category ?? '',
      severity: t.severity,
      description: t.description,
      what: t.what ?? '',
      why: t.why ?? '',
      where_loc: t.where_loc ?? '',
      how: t.how ?? '',
      how_much: t.how_much != null ? String(t.how_much) : '',
      default_due_days: String(t.default_due_days),
    });
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim()) {
      toast.error('Dê um nome ao modelo.');
      return;
    }
    if (!form.description.trim()) {
      toast.error('Informe a descrição que vai para a NC.');
      return;
    }
    const days = Number(form.default_due_days);
    if (!Number.isInteger(days) || days < 1 || days > 365) {
      toast.error('O prazo padrão deve ser um número de 1 a 365 dias.');
      return;
    }
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      category: form.category.trim() || null,
      severity: form.severity,
      description: form.description.trim(),
      what: form.what.trim() || null,
      why: form.why.trim() || null,
      where_loc: form.where_loc.trim() || null,
      how: form.how.trim() || null,
      how_much: form.how_much.trim() !== '' ? Number(form.how_much) : null,
      default_due_days: days,
    };
    const { error } = editing
      ? await supabase.from('nc_templates').update(payload).eq('id', editing.id)
      : await supabase.from('nc_templates').insert(payload);
    setSaving(false);
    if (error) {
      toast.error('Erro ao salvar: ' + error.message);
      return;
    }
    toast.success(editing ? 'Modelo atualizado.' : 'Modelo criado.');
    setModalOpen(false);
    void load();
  }

  async function handleDuplicate(t: NcTemplate) {
    setBusyId(t.id);
    const { error } = await supabase.from('nc_templates').insert({
      name: `${t.name} (cópia)`,
      category: t.category,
      severity: t.severity,
      description: t.description,
      what: t.what,
      why: t.why,
      where_loc: t.where_loc,
      how: t.how,
      how_much: t.how_much,
      default_due_days: t.default_due_days,
    });
    setBusyId(null);
    if (error) {
      toast.error('Erro ao duplicar: ' + error.message);
      return;
    }
    toast.success('Modelo duplicado.');
    void load();
  }

  async function handleToggleActive(t: NcTemplate) {
    setBusyId(t.id);
    const { error } = await supabase
      .from('nc_templates')
      .update({ active: !t.active })
      .eq('id', t.id);
    setBusyId(null);
    if (error) {
      toast.error('Erro ao atualizar: ' + error.message);
      return;
    }
    toast.success(t.active ? 'Modelo desativado.' : 'Modelo reativado.');
    void load();
  }

  async function handleDelete() {
    if (!deleting) return;
    setDeleteBusy(true);
    const { data, error } = await supabase
      .from('nc_templates')
      .delete()
      .eq('id', deleting.id)
      .select('id');
    setDeleteBusy(false);
    if (error) {
      // Trigger da 0103 bloqueia se algum modelo de visita usa este plano.
      toast.error(error.message);
      return;
    }
    if (!data || data.length === 0) {
      toast.error('Você não tem permissão para excluir este modelo.');
      return;
    }
    toast.success('Modelo excluído.');
    setDeleting(null);
    void load();
  }

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        to="/nao-conformidades"
        className="mb-2 inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-700 dark:text-neutral-400"
      >
        <ArrowLeft size={14} />
        Não-conformidades
      </Link>

      <PageHeader
        title="Modelos de NC"
        subtitle="Problemas que se repetem, com o plano de ação 5W2H pronto. Ao abrir uma NC — na mão ou automaticamente pela visita — o plano já vem preenchido."
        actions={
          <Button onClick={openCreate}>
            <Plus size={18} />
            Novo modelo
          </Button>
        }
      />

      {loading ? (
        <ListSkeleton rows={4} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={AlertOctagon}
          title="Nenhum modelo de NC ainda"
          description="Cadastre os problemas que você mais encontra em campo. Da próxima vez, a NC nasce com causa, ação e prazo já preenchidos."
          action={
            <Button onClick={openCreate}>
              <Plus size={18} />
              Criar o primeiro modelo
            </Button>
          }
        />
      ) : (
        <Card className="!p-0">
          <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {rows.map((t) => {
              const busy = busyId === t.id;
              return (
                <li
                  key={t.id}
                  className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-neutral-800 dark:text-neutral-100">
                      <span className="truncate">{t.name}</span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${SEVERITY_COLOR[t.severity]}`}
                      >
                        {NC_SEVERITY_LABELS[t.severity]}
                      </span>
                      {!t.active ? (
                        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-950/40 dark:text-amber-200">
                          Desativado
                        </span>
                      ) : null}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-neutral-500 dark:text-neutral-400">
                      {t.category ? `${t.category} · ` : ''}prazo{' '}
                      {t.default_due_days} dias
                      {t.what ? ` · ${t.what}` : ''}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button
                      onClick={() => void handleDuplicate(t)}
                      disabled={busy}
                      aria-label="Duplicar"
                      title="Duplicar"
                      className="rounded-lg p-2 text-neutral-500 hover:bg-neutral-100 disabled:opacity-50 dark:text-neutral-400 dark:hover:bg-neutral-800"
                    >
                      <Copy size={15} />
                    </button>
                    <button
                      onClick={() => openEdit(t)}
                      aria-label="Editar"
                      title="Editar"
                      className="rounded-lg p-2 text-neutral-500 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={() => void handleToggleActive(t)}
                      disabled={busy}
                      aria-label={t.active ? 'Desativar' : 'Reativar'}
                      title={
                        t.active
                          ? 'Desativar — some das listas de escolha, histórico preservado'
                          : 'Reativar'
                      }
                      className="rounded-lg p-2 text-neutral-500 hover:bg-neutral-100 disabled:opacity-50 dark:text-neutral-400 dark:hover:bg-neutral-800"
                    >
                      {t.active ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                    <button
                      onClick={() => setDeleting(t)}
                      aria-label="Excluir"
                      title="Excluir"
                      className="rounded-lg p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Editar modelo de NC' : 'Novo modelo de NC'}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setModalOpen(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button onClick={() => void handleSave()} loading={saving}>
              Salvar
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Input
            id="nct-name"
            label="Nome do modelo"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Ex.: Manipulador sem touca"
          />

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label
                htmlFor="nct-category"
                className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-300"
              >
                Categoria
              </label>
              <input
                id="nct-category"
                list="nct-categories"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                placeholder="Ex.: Manipuladores"
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-800 dark:border-neutral-700 dark:bg-neutral-800"
              />
              <datalist id="nct-categories">
                {categories.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
            <Select
              id="nct-severity"
              label="Gravidade"
              value={form.severity}
              onChange={(e) =>
                setForm({ ...form, severity: e.target.value as NcSeverity })
              }
            >
              {SEVERITIES.map((s) => (
                <option key={s} value={s}>
                  {NC_SEVERITY_LABELS[s]}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label
              htmlFor="nct-description"
              className="mb-1 block text-xs font-medium text-neutral-600 dark:text-neutral-300"
            >
              Descrição da não-conformidade
            </label>
            <textarea
              id="nct-description"
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              rows={2}
              placeholder="O texto que aparece na NC aberta a partir deste modelo."
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-800 dark:border-neutral-700 dark:bg-neutral-800"
            />
          </div>

          <div className="rounded-lg border border-neutral-200 p-3 dark:border-neutral-700">
            <p className="mb-3 text-sm font-medium text-neutral-700 dark:text-neutral-200">
              Plano de ação padrão (5W2H)
            </p>
            <div className="flex flex-col gap-3">
              <Input
                id="nct-what"
                label="O quê — a ação corretiva"
                value={form.what}
                onChange={(e) => setForm({ ...form, what: e.target.value })}
              />
              <Input
                id="nct-why"
                label="Por quê — a causa provável"
                value={form.why}
                onChange={(e) => setForm({ ...form, why: e.target.value })}
              />
              <Input
                id="nct-where"
                label="Onde"
                value={form.where_loc}
                onChange={(e) =>
                  setForm({ ...form, where_loc: e.target.value })
                }
              />
              <Input
                id="nct-how"
                label="Como"
                value={form.how}
                onChange={(e) => setForm({ ...form, how: e.target.value })}
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  id="nct-days"
                  label="Prazo padrão (dias)"
                  type="number"
                  min={1}
                  max={365}
                  value={form.default_due_days}
                  onChange={(e) =>
                    setForm({ ...form, default_due_days: e.target.value })
                  }
                />
                <Input
                  id="nct-cost"
                  label="Quanto custa (opcional)"
                  type="number"
                  step="0.01"
                  value={form.how_much}
                  onChange={(e) =>
                    setForm({ ...form, how_much: e.target.value })
                  }
                />
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                O prazo é contado a partir do dia em que a NC for aberta. O
                responsável (&quot;quem&quot;) não entra no modelo — muda a cada
                empresa e é escolhido na hora.
              </p>
            </div>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={deleting !== null}
        title="Excluir modelo de NC"
        message={`Excluir "${deleting?.name ?? ''}"? As NCs já abertas continuam como estão. Modelos vinculados a um modelo de visita não podem ser excluídos — desative-o.`}
        confirmLabel="Excluir"
        loading={deleteBusy}
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
