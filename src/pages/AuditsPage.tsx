import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ClipboardCheck,
  Plus,
  CalendarDays,
  CheckCircle2,
  Clock,
  XCircle,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useCompanyScope } from '@/lib/useCompanyScope';
import { formatDateTime } from '@/lib/dates';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import type { Audit, AuditStatus, AuditTemplate, Company } from '@/lib/types';

const STATUS_LABELS: Record<AuditStatus, string> = {
  scheduled: 'Agendada',
  in_progress: 'Em andamento',
  completed: 'Concluida',
  cancelled: 'Cancelada',
};

const STATUS_STYLE: Record<AuditStatus, { icon: typeof Clock; bg: string }> = {
  scheduled: {
    icon: CalendarDays,
    bg: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200',
  },
  in_progress: {
    icon: Clock,
    bg: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-200',
  },
  completed: {
    icon: CheckCircle2,
    bg: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-200',
  },
  cancelled: {
    icon: XCircle,
    bg: 'bg-neutral-200 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400',
  },
};

export function AuditsPage() {
  const { isMaster, profile } = useAuth();
  const { companies, companyId } = useCompanyScope();

  const [audits, setAudits] = useState<
    (Audit & { company: { name: string } | null })[]
  >([]);
  const [templates, setTemplates] = useState<AuditTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<AuditStatus | 'all'>('all');

  const [modalOpen, setModalOpen] = useState(false);
  const [newCompanyId, setNewCompanyId] = useState('');
  const [newTemplateId, setNewTemplateId] = useState('');
  const [newScheduledAt, setNewScheduledAt] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase
      .from('audits')
      .select('*, company:companies(name)')
      .order('scheduled_at', { ascending: false });
    if (!isMaster && companyId) q = q.eq('company_id', companyId);
    if (statusFilter !== 'all') q = q.eq('status', statusFilter);
    const { data, error } = await q;
    setLoading(false);
    if (error) {
      toast.error('Erro ao carregar visitas: ' + error.message);
      return;
    }
    setAudits(
      (data as unknown as (Audit & { company: { name: string } | null })[]) ??
        [],
    );
  }, [isMaster, companyId, statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    supabase
      .from('audit_templates')
      .select('*')
      .order('name')
      .then(({ data, error }) => {
        if (error) {
          toast.error('Erro ao carregar templates: ' + error.message);
          return;
        }
        setTemplates((data as AuditTemplate[] | null) ?? []);
      });
  }, []);

  function openSchedule() {
    setNewCompanyId(isMaster ? (companies[0]?.id ?? '') : (companyId ?? ''));
    setNewTemplateId(templates[0]?.id ?? '');
    setNewScheduledAt(new Date().toISOString().slice(0, 16));
    setModalOpen(true);
  }

  async function handleSchedule() {
    if (!newCompanyId || !newTemplateId || !newScheduledAt) {
      toast.error('Preencha todos os campos.');
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('audits').insert({
      company_id: newCompanyId,
      template_id: newTemplateId,
      scheduled_at: new Date(newScheduledAt).toISOString(),
      auditor_id: profile?.id,
      status: 'scheduled' as AuditStatus,
    });
    setSaving(false);
    if (error) {
      toast.error('Erro ao agendar: ' + error.message);
      return;
    }
    toast.success('Visita agendada.');
    setModalOpen(false);
    void load();
  }

  const companyMap = new Map(companies.map((c: Company) => [c.id, c.name]));

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-neutral-800 dark:text-neutral-100 sm:text-2xl">
            Visitas tecnicas
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Inspecoes sanitarias da RT baseadas em RDC 216/2004.
          </p>
        </div>
        {isMaster ? (
          <Button onClick={openSchedule}>
            <Plus size={18} />
            Agendar visita
          </Button>
        ) : null}
      </div>

      <div className="mb-4">
        <Select
          id="status-filter"
          label="Status"
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value as AuditStatus | 'all')
          }
        >
          <option value="all">Todos</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-8 w-8" />
        </div>
      ) : audits.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <ClipboardCheck
              size={32}
              className="text-neutral-300 dark:text-neutral-600"
            />
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Nenhuma visita ainda.
            </p>
          </div>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {audits.map((a) => {
            const style = STATUS_STYLE[a.status];
            const Icon = style.icon;
            return (
              <Link
                key={a.id}
                to={`/visitas/${a.id}`}
                className="block rounded-xl border border-neutral-200 bg-white p-4 transition hover:border-emerald-300 hover:shadow-sm dark:border-neutral-800 dark:bg-slate-900 dark:hover:border-emerald-700 sm:p-5"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
                      {a.company?.name ?? companyMap.get(a.company_id) ?? ''}
                    </p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      Agendada{' '}
                      {a.scheduled_at
                        ? formatDateTime(a.scheduled_at)
                        : 'sem data'}
                      {a.completed_at
                        ? ` - Finalizada ${formatDateTime(a.completed_at)}`
                        : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {a.score != null ? (
                      <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-sm font-semibold text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                        {a.score.toFixed(1)}%
                      </span>
                    ) : null}
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${style.bg}`}
                    >
                      <Icon size={12} />
                      {STATUS_LABELS[a.status]}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Agendar visita"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setModalOpen(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button onClick={handleSchedule} loading={saving}>
              Agendar
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          {isMaster ? (
            <Select
              id="new-company"
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
          <Select
            id="new-template"
            label="Modelo"
            value={newTemplateId}
            onChange={(e) => setNewTemplateId(e.target.value)}
          >
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </Select>
          <Input
            id="new-when"
            label="Data e hora"
            type="datetime-local"
            value={newScheduledAt}
            onChange={(e) => setNewScheduledAt(e.target.value)}
          />
        </div>
      </Modal>
    </div>
  );
}
