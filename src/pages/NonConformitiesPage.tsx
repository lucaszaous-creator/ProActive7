import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { AlertTriangle, Plus, Pencil, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { usePageTitle } from '@/lib/usePageTitle';
import { useAuth } from '@/context/AuthContext';
import { useCompanyScope } from '@/lib/useCompanyScope';
import { formatDate } from '@/lib/dates';
import { logFeatureEvent } from '@/lib/platformMetrics';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import type { NcSeverity, NcStatus, NonConformity } from '@/lib/types';
import { NC_SEVERITY_LABELS, NC_STATUS_LABELS } from '@/lib/types';

const SEVERITY_COLOR: Record<NcSeverity, string> = {
  low: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200',
  medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-200',
  high: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-200',
  critical: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200',
};

const STATUS_COLOR: Record<NcStatus, string> = {
  open: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200',
  in_progress:
    'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-200',
  closed:
    'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-200',
  cancelled:
    'bg-neutral-200 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400',
};

type Row = NonConformity & { company: { name: string } | null };

interface Form {
  description: string;
  category: string;
  severity: NcSeverity;
  status: NcStatus;
  what: string;
  why: string;
  where_loc: string;
  when_due: string;
  how: string;
  how_much: string;
  closing_note: string;
}

const emptyForm: Form = {
  description: '',
  category: '',
  severity: 'medium',
  status: 'open',
  what: '',
  why: '',
  where_loc: '',
  when_due: '',
  how: '',
  how_much: '',
  closing_note: '',
};

export function NonConformitiesPage() {
  usePageTitle('Nao-conformidades');
  const { isMaster, profile } = useAuth();
  const { companies, companyId } = useCompanyScope();

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const [statusFilter, setStatusFilter] = useState<NcStatus | 'all'>('open');
  const [severityFilter, setSeverityFilter] = useState<NcSeverity | 'all'>(
    'all',
  );
  const [showOverdueOnly, setShowOverdueOnly] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<NonConformity | null>(null);
  const [form, setForm] = useState<Form>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [newCompanyId, setNewCompanyId] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase
      .from('non_conformities')
      .select('*, company:companies(name)')
      .order('opened_at', { ascending: false });
    if (!isMaster && companyId) q = q.eq('company_id', companyId);
    if (statusFilter !== 'all') q = q.eq('status', statusFilter);
    if (severityFilter !== 'all') q = q.eq('severity', severityFilter);
    const { data, error } = await q;
    setLoading(false);
    if (error) {
      toast.error('Erro ao carregar nao-conformidades: ' + error.message);
      return;
    }
    setRows((data as unknown as Row[]) ?? []);
  }, [isMaster, companyId, statusFilter, severityFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const today = new Date().toISOString().slice(0, 10);
  const filtered = useMemo(() => {
    if (!showOverdueOnly) return rows;
    return rows.filter(
      (r) =>
        r.when_due &&
        r.when_due < today &&
        (r.status === 'open' || r.status === 'in_progress'),
    );
  }, [rows, showOverdueOnly, today]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setNewCompanyId(companyId ?? companies[0]?.id ?? '');
    setModalOpen(true);
  }

  function openEdit(nc: NonConformity) {
    setEditing(nc);
    setForm({
      description: nc.description,
      category: nc.category ?? '',
      severity: nc.severity,
      status: nc.status,
      what: nc.what ?? '',
      why: nc.why ?? '',
      where_loc: nc.where_loc ?? '',
      when_due: nc.when_due ?? '',
      how: nc.how ?? '',
      how_much: nc.how_much != null ? String(nc.how_much) : '',
      closing_note: nc.closing_note ?? '',
    });
    setNewCompanyId(nc.company_id);
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.description.trim()) {
      toast.error('Informe a descricao.');
      return;
    }
    setSaving(true);
    const payload = {
      company_id: newCompanyId || companyId,
      description: form.description.trim(),
      category: form.category.trim() || null,
      severity: form.severity,
      status: form.status,
      what: form.what.trim() || null,
      why: form.why.trim() || null,
      where_loc: form.where_loc.trim() || null,
      when_due: form.when_due || null,
      how: form.how.trim() || null,
      how_much: form.how_much.trim() !== '' ? Number(form.how_much) : null,
      closing_note: form.closing_note.trim() || null,
    };
    let error;
    if (editing) {
      const closed_at =
        form.status === 'closed' && editing.status !== 'closed'
          ? new Date().toISOString()
          : editing.closed_at;
      const closed_by =
        form.status === 'closed' && editing.status !== 'closed'
          ? profile?.id
          : editing.closed_by;
      ({ error } = await supabase
        .from('non_conformities')
        .update({ ...payload, closed_at, closed_by })
        .eq('id', editing.id));
    } else {
      ({ error } = await supabase.from('non_conformities').insert({
        ...payload,
        opened_by: profile?.id,
        source: 'manual',
      }));
    }
    setSaving(false);
    if (error) {
      toast.error('Erro ao salvar: ' + error.message);
      return;
    }
    toast.success(editing ? 'NC atualizada.' : 'NC criada.');
    if (!editing) void logFeatureEvent('nc_opened');
    setModalOpen(false);
    void load();
  }

  async function handleQuickClose(nc: NonConformity) {
    const { error } = await supabase
      .from('non_conformities')
      .update({
        status: 'closed',
        closed_at: new Date().toISOString(),
        closed_by: profile?.id,
      })
      .eq('id', nc.id);
    if (error) {
      toast.error('Erro: ' + error.message);
      return;
    }
    toast.success('NC fechada.');
    void load();
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-neutral-800 dark:text-neutral-100 sm:text-2xl">
            Nao-conformidades
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Plano de acao 5W2H para corrigir desvios encontrados.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus size={18} />
          Nova NC
        </Button>
      </div>

      <Card className="mb-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Select
            id="status"
            label="Status"
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as NcStatus | 'all')
            }
          >
            <option value="all">Todos</option>
            {Object.entries(NC_STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </Select>
          <Select
            id="severity"
            label="Severidade"
            value={severityFilter}
            onChange={(e) =>
              setSeverityFilter(e.target.value as NcSeverity | 'all')
            }
          >
            <option value="all">Todas</option>
            {Object.entries(NC_SEVERITY_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </Select>
          <label className="flex items-center gap-2 self-end pb-1 text-sm text-neutral-700 dark:text-neutral-300">
            <input
              type="checkbox"
              checked={showOverdueOnly}
              onChange={(e) => setShowOverdueOnly(e.target.checked)}
              className="h-5 w-5 accent-red-600"
            />
            So vencidas
          </label>
        </div>
      </Card>

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-8 w-8" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <AlertTriangle
              size={32}
              className="text-neutral-300 dark:text-neutral-600"
            />
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Nenhuma nao-conformidade encontrada.
            </p>
          </div>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((nc) => {
            const isOverdue =
              nc.when_due &&
              nc.when_due < today &&
              (nc.status === 'open' || nc.status === 'in_progress');
            return (
              <Card key={nc.id}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${SEVERITY_COLOR[nc.severity]}`}
                      >
                        {NC_SEVERITY_LABELS[nc.severity]}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[nc.status]}`}
                      >
                        {NC_STATUS_LABELS[nc.status]}
                      </span>
                      {isMaster ? (
                        <span className="text-xs text-neutral-500 dark:text-neutral-400">
                          {nc.company?.name}
                        </span>
                      ) : null}
                      {nc.category ? (
                        <span className="text-xs text-neutral-500 dark:text-neutral-400">
                          {nc.category}
                        </span>
                      ) : null}
                    </div>
                    <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
                      {nc.description}
                    </p>
                    <p
                      className={`mt-1 text-xs ${
                        isOverdue
                          ? 'font-semibold text-red-600 dark:text-red-400'
                          : 'text-neutral-500 dark:text-neutral-400'
                      }`}
                    >
                      Prazo:{' '}
                      {nc.when_due ? formatDate(nc.when_due) : 'sem prazo'}
                      {isOverdue ? ' (vencida)' : ''}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button
                      onClick={() => openEdit(nc)}
                      aria-label="Editar"
                      className="rounded-lg p-2.5 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                    >
                      <Pencil size={16} />
                    </button>
                    {nc.status !== 'closed' && nc.status !== 'cancelled' ? (
                      <button
                        onClick={() => void handleQuickClose(nc)}
                        aria-label="Fechar NC"
                        className="rounded-lg p-2.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950"
                      >
                        <CheckCircle2 size={16} />
                      </button>
                    ) : null}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Editar NC' : 'Nova nao-conformidade'}
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
        <div className="flex flex-col gap-3">
          {isMaster && !editing ? (
            <Select
              id="nc-company"
              label="Empresa"
              value={newCompanyId}
              onChange={(e) => setNewCompanyId(e.target.value)}
            >
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          ) : null}
          <Input
            id="nc-desc"
            label="Descricao da nao-conformidade"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              id="nc-cat"
              label="Categoria"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            />
            <Select
              id="nc-sev"
              label="Severidade"
              value={form.severity}
              onChange={(e) =>
                setForm({ ...form, severity: e.target.value as NcSeverity })
              }
            >
              {Object.entries(NC_SEVERITY_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
          </div>

          <p className="mt-2 border-t border-neutral-200 pt-3 text-sm font-semibold text-neutral-700 dark:border-neutral-700 dark:text-neutral-300">
            Plano de acao 5W2H
          </p>
          <Input
            id="nc-what"
            label="O que (What)"
            value={form.what}
            onChange={(e) => setForm({ ...form, what: e.target.value })}
          />
          <Input
            id="nc-why"
            label="Por que (Why)"
            value={form.why}
            onChange={(e) => setForm({ ...form, why: e.target.value })}
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              id="nc-where"
              label="Onde (Where)"
              value={form.where_loc}
              onChange={(e) => setForm({ ...form, where_loc: e.target.value })}
            />
            <Input
              id="nc-when"
              label="Prazo (When)"
              type="date"
              value={form.when_due}
              onChange={(e) => setForm({ ...form, when_due: e.target.value })}
            />
          </div>
          <Input
            id="nc-how"
            label="Como (How)"
            value={form.how}
            onChange={(e) => setForm({ ...form, how: e.target.value })}
          />
          <Input
            id="nc-howmuch"
            label="Quanto custa (How much, R$)"
            type="number"
            step="0.01"
            value={form.how_much}
            onChange={(e) => setForm({ ...form, how_much: e.target.value })}
          />

          {editing ? (
            <>
              <Select
                id="nc-status"
                label="Status"
                value={form.status}
                onChange={(e) =>
                  setForm({ ...form, status: e.target.value as NcStatus })
                }
              >
                {Object.entries(NC_STATUS_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </Select>
              <Input
                id="nc-close"
                label="Nota de fechamento"
                value={form.closing_note}
                onChange={(e) =>
                  setForm({ ...form, closing_note: e.target.value })
                }
              />
            </>
          ) : null}
        </div>
      </Modal>
    </div>
  );
}
