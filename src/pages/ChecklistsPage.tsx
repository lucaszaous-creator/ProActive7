import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, ClipboardCheck, Play } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { usePageTitle } from '@/lib/usePageTitle';
import { useAuth } from '@/context/AuthContext';
import { useCompanyScope } from '@/lib/useCompanyScope';
import { formatDateTime } from '@/lib/dates';
import {
  CHECKLIST_FREQUENCY_LABELS,
  type ChecklistFrequency,
  type ChecklistItem,
  type ChecklistRun,
  type ChecklistRunItem,
  type ChecklistTemplate,
} from '@/lib/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Spinner } from '@/components/ui/Spinner';

const FREQUENCIES: ChecklistFrequency[] = ['daily', 'weekly', 'monthly'];

const DEFAULT_TEMPLATES: {
  name: string;
  frequency: ChecklistFrequency;
  items: string[];
}[] = [
  {
    name: 'Limpeza do final do expediente',
    frequency: 'daily',
    items: [
      'Bancadas higienizadas',
      'Piso lavado',
      'Lixo retirado',
      'Equipamentos desligados',
    ],
  },
  {
    name: 'Recepção de mercadoria',
    frequency: 'daily',
    items: [
      'Embalagens íntegras',
      'Validade conferida',
      'Temperatura adequada na chegada',
      'Quantidade conferida com nota fiscal',
    ],
  },
  {
    name: 'Higienização semanal de geladeira',
    frequency: 'weekly',
    items: [
      'Geladeira esvaziada',
      'Prateleiras lavadas',
      'Borrachas higienizadas',
      'Produtos reorganizados (FIFO)',
    ],
  },
];

interface RunWithTemplate extends ChecklistRun {
  checklist_templates: { name: string } | null;
}

export function ChecklistsPage() {
  usePageTitle('Checklists');
  const { profile } = useAuth();
  const { isMaster, companies, companyId, setCompanyId } = useCompanyScope();

  const [templates, setTemplates] = useState<ChecklistTemplate[]>([]);
  const [recentRuns, setRecentRuns] = useState<RunWithTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ChecklistTemplate | null>(null);
  const [saving, setSaving] = useState(false);
  const [tplName, setTplName] = useState('');
  const [tplFreq, setTplFreq] = useState<ChecklistFrequency>('daily');
  const [tplItems, setTplItems] = useState<string[]>(['']);
  const [tplActive, setTplActive] = useState(true);

  const [deleting, setDeleting] = useState<ChecklistTemplate | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  // Run em andamento
  const [runOpen, setRunOpen] = useState(false);
  const [runTemplate, setRunTemplate] = useState<ChecklistTemplate | null>(
    null,
  );
  const [runChecks, setRunChecks] = useState<Record<string, boolean>>({});
  const [runNotes, setRunNotes] = useState('');
  const [runSaving, setRunSaving] = useState(false);

  const load = useCallback(async () => {
    if (!companyId) {
      setTemplates([]);
      setRecentRuns([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const tplRes = await supabase
      .from('checklist_templates')
      .select('*')
      .eq('company_id', companyId)
      .order('name');
    if (tplRes.error) {
      setLoading(false);
      toast.error('Erro ao carregar templates: ' + tplRes.error.message);
      return;
    }
    const tpls = (tplRes.data as ChecklistTemplate[] | null) ?? [];
    setTemplates(tpls);

    const tplIds = tpls.map((t) => t.id);
    if (tplIds.length > 0) {
      const runRes = await supabase
        .from('checklist_runs')
        .select('*, checklist_templates(name)')
        .in('template_id', tplIds)
        .order('ran_at', { ascending: false })
        .limit(10);
      if (!runRes.error) {
        setRecentRuns((runRes.data as RunWithTemplate[] | null) ?? []);
      }
    } else {
      setRecentRuns([]);
    }
    setLoading(false);
  }, [companyId]);

  useEffect(() => {
    void load();
  }, [load]);

  function openCreate() {
    setEditing(null);
    setTplName('');
    setTplFreq('daily');
    setTplItems(['']);
    setTplActive(true);
    setModalOpen(true);
  }

  function openEdit(t: ChecklistTemplate) {
    setEditing(t);
    setTplName(t.name);
    setTplFreq(t.frequency);
    setTplItems(t.items.length > 0 ? t.items.map((i) => i.text) : ['']);
    setTplActive(t.active);
    setModalOpen(true);
  }

  async function handleSave() {
    if (!tplName.trim()) {
      toast.error('Informe o nome do checklist.');
      return;
    }
    const items: ChecklistItem[] = tplItems
      .map((t) => t.trim())
      .filter(Boolean)
      .map((text) => ({ id: crypto.randomUUID(), text }));
    if (items.length === 0) {
      toast.error('Adicione ao menos um item.');
      return;
    }
    setSaving(true);
    const payload = {
      name: tplName.trim(),
      frequency: tplFreq,
      items,
      active: tplActive,
    };
    const { error } = editing
      ? await supabase
          .from('checklist_templates')
          .update(payload)
          .eq('id', editing.id)
      : await supabase.from('checklist_templates').insert({
          ...payload,
          company_id: companyId,
          created_by: profile?.id ?? null,
        });
    setSaving(false);
    if (error) {
      toast.error('Erro ao salvar: ' + error.message);
      return;
    }
    toast.success(editing ? 'Template atualizado.' : 'Template criado.');
    setModalOpen(false);
    void load();
  }

  async function handleDelete() {
    if (!deleting) return;
    setDeleteBusy(true);
    const { error } = await supabase
      .from('checklist_templates')
      .delete()
      .eq('id', deleting.id);
    setDeleteBusy(false);
    if (error) {
      toast.error('Erro ao excluir: ' + error.message);
      return;
    }
    toast.success('Template excluído.');
    setDeleting(null);
    void load();
  }

  async function seedDefaults() {
    if (!companyId) return;
    setSaving(true);
    const rows = DEFAULT_TEMPLATES.map((t) => ({
      company_id: companyId,
      name: t.name,
      frequency: t.frequency,
      items: t.items.map((text) => ({ id: crypto.randomUUID(), text })),
      active: true,
      created_by: profile?.id ?? null,
    }));
    const { error } = await supabase.from('checklist_templates').insert(rows);
    setSaving(false);
    if (error) {
      toast.error('Erro ao criar templates: ' + error.message);
      return;
    }
    toast.success('Templates padrão adicionados.');
    void load();
  }

  function openRun(t: ChecklistTemplate) {
    setRunTemplate(t);
    setRunChecks(Object.fromEntries(t.items.map((i) => [i.id, false])));
    setRunNotes('');
    setRunOpen(true);
  }

  async function handleRunSave() {
    if (!runTemplate) return;
    setRunSaving(true);
    const items: ChecklistRunItem[] = runTemplate.items.map((i) => ({
      id: i.id,
      checked: runChecks[i.id] ?? false,
    }));
    const { error } = await supabase.from('checklist_runs').insert({
      template_id: runTemplate.id,
      ran_by: profile?.id ?? null,
      items,
      notes: runNotes.trim() || null,
    });
    setRunSaving(false);
    if (error) {
      toast.error('Erro ao registrar: ' + error.message);
      return;
    }
    toast.success('Checklist registrado.');
    setRunOpen(false);
    void load();
  }

  const noCompany = isMaster && companies.length === 0;

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-neutral-800 sm:text-2xl">
            Checklists
          </h1>
          <p className="text-sm text-neutral-500">
            Procedimentos operacionais com histórico de execução.
          </p>
        </div>
        <Button onClick={openCreate} disabled={!companyId}>
          <Plus size={18} />
          Novo template
        </Button>
      </div>

      {isMaster && companies.length > 0 && (
        <div className="mb-4 max-w-xs">
          <Select
            label="Empresa"
            value={companyId}
            onChange={(e) => setCompanyId(e.target.value)}
          >
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
      )}

      {noCompany ? (
        <Card>
          <p className="text-sm text-neutral-600">
            Nenhuma empresa cadastrada. Crie uma empresa para começar.
          </p>
        </Card>
      ) : loading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-8 w-8" />
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
          <Card>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-neutral-700">
                Templates
              </h2>
              {templates.length === 0 ? (
                <button
                  onClick={seedDefaults}
                  className="text-xs text-emerald-700 hover:underline"
                >
                  Adicionar padrões
                </button>
              ) : null}
            </div>
            {templates.length === 0 ? (
              <p className="text-sm text-neutral-500">
                Nenhum template ainda. Crie um do zero ou use os padrões.
              </p>
            ) : (
              <ul className="divide-y divide-neutral-100">
                {templates.map((t) => (
                  <li
                    key={t.id}
                    className="flex items-center justify-between gap-2 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-neutral-800">
                        {t.name}
                      </p>
                      <p className="text-xs text-neutral-500">
                        {CHECKLIST_FREQUENCY_LABELS[t.frequency]} ·{' '}
                        {t.items.length} itens
                        {!t.active ? ' · inativo' : ''}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      {t.active ? (
                        <button
                          onClick={() => openRun(t)}
                          aria-label="Executar"
                          className="rounded-lg p-2.5 text-emerald-600 hover:bg-emerald-50"
                        >
                          <Play size={16} />
                        </button>
                      ) : null}
                      <button
                        onClick={() => openEdit(t)}
                        aria-label="Editar"
                        className="rounded-lg p-2.5 text-neutral-500 hover:bg-neutral-100"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => setDeleting(t)}
                        aria-label="Excluir"
                        className="rounded-lg p-2.5 text-red-500 hover:bg-red-50"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <h2 className="mb-3 text-sm font-semibold text-neutral-700">
              Últimas execuções
            </h2>
            {recentRuns.length === 0 ? (
              <p className="text-sm text-neutral-500">
                Nenhuma execução ainda.
              </p>
            ) : (
              <ul className="divide-y divide-neutral-100">
                {recentRuns.map((r) => {
                  const done = r.items.filter((i) => i.checked).length;
                  return (
                    <li key={r.id} className="flex items-center gap-3 py-2">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                        <ClipboardCheck size={16} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-neutral-800">
                          {r.checklist_templates?.name ?? 'Template removido'}
                        </p>
                        <p className="text-xs text-neutral-500">
                          {formatDateTime(r.ran_at)} · {done}/{r.items.length}{' '}
                          itens
                          {r.notes ? ` · ${r.notes}` : ''}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Editar template' : 'Novo template'}
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
          <Input
            id="tpl-name"
            label="Nome do checklist"
            value={tplName}
            onChange={(e) => setTplName(e.target.value)}
          />
          <Select
            id="tpl-freq"
            label="Frequência"
            value={tplFreq}
            onChange={(e) => setTplFreq(e.target.value as ChecklistFrequency)}
          >
            {FREQUENCIES.map((f) => (
              <option key={f} value={f}>
                {CHECKLIST_FREQUENCY_LABELS[f]}
              </option>
            ))}
          </Select>

          <div>
            <p className="mb-2 text-sm font-medium text-neutral-700">Itens</p>
            <div className="flex flex-col gap-2">
              {tplItems.map((it, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    type="text"
                    value={it}
                    onChange={(e) =>
                      setTplItems((prev) =>
                        prev.map((p, idx) => (idx === i ? e.target.value : p)),
                      )
                    }
                    placeholder="Ex.: Bancada higienizada"
                    className="flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setTplItems((prev) => prev.filter((_, idx) => idx !== i))
                    }
                    disabled={tplItems.length === 1}
                    className="rounded-lg p-2 text-red-500 hover:bg-red-50 disabled:opacity-30"
                    aria-label="Remover item"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setTplItems((prev) => [...prev, ''])}
                className="self-start rounded-lg bg-neutral-100 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-200"
              >
                + Adicionar item
              </button>
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-neutral-700">
            <input
              type="checkbox"
              checked={tplActive}
              onChange={(e) => setTplActive(e.target.checked)}
              className="h-5 w-5 accent-emerald-600"
            />
            Template ativo
          </label>
        </div>
      </Modal>

      <Modal
        open={runOpen}
        onClose={() => setRunOpen(false)}
        title={runTemplate ? `Executar: ${runTemplate.name}` : ''}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setRunOpen(false)}
              disabled={runSaving}
            >
              Cancelar
            </Button>
            <Button onClick={handleRunSave} loading={runSaving}>
              Salvar execução
            </Button>
          </>
        }
      >
        {runTemplate ? (
          <div className="flex flex-col gap-3">
            <ul className="space-y-2">
              {runTemplate.items.map((i) => (
                <li key={i.id}>
                  <label className="flex items-start gap-2 text-sm text-neutral-700">
                    <input
                      type="checkbox"
                      checked={runChecks[i.id] ?? false}
                      onChange={(e) =>
                        setRunChecks((prev) => ({
                          ...prev,
                          [i.id]: e.target.checked,
                        }))
                      }
                      className="mt-0.5 h-5 w-5 accent-emerald-600"
                    />
                    {i.text}
                  </label>
                </li>
              ))}
            </ul>
            <Input
              id="run-notes"
              label="Observações (opcional)"
              value={runNotes}
              onChange={(e) => setRunNotes(e.target.value)}
            />
          </div>
        ) : null}
      </Modal>

      <ConfirmDialog
        open={deleting !== null}
        title="Excluir template"
        message={`Tem certeza que deseja excluir "${deleting?.name}"? O histórico de execuções também será removido.`}
        confirmLabel="Excluir"
        loading={deleteBusy}
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
