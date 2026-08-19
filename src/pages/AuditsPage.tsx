import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ClipboardCheck,
  ClipboardList,
  Plus,
  CalendarDays,
  CheckCircle2,
  Clock,
  XCircle,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { usePageTitle } from '@/lib/usePageTitle';
import { useAuth } from '@/context/AuthContext';
import { useCompanyScope } from '@/lib/useCompanyScope';
import { formatDateTime } from '@/lib/dates';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { ListSkeleton } from '@/components/ui/Skeleton';
import { PageHeader } from '@/components/ui/PageHeader';
import { cacheNotice, readThrough } from '@/lib/offlineCache';
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
    bg: 'bg-blue-100 text-blue-700',
  },
  in_progress: {
    icon: Clock,
    bg: 'bg-amber-100 text-amber-700',
  },
  completed: {
    icon: CheckCircle2,
    bg: 'bg-neutral-100 text-neutral-700',
  },
  cancelled: {
    icon: XCircle,
    bg: 'bg-neutral-200 text-neutral-600',
  },
};

export function AuditsPage() {
  usePageTitle('Visitas tecnicas');
  const navigate = useNavigate();
  const { isMaster, profile } = useAuth();
  const { companies, companyId } = useCompanyScope();

  const [audits, setAudits] = useState<
    (Audit & { company: { name: string } | null })[]
  >([]);
  const [templates, setTemplates] = useState<AuditTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  /** Aviso de "isto é uma cópia local" quando a rede não respondeu. */
  const [offlineNotice, setOfflineNotice] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<AuditStatus | 'all'>('all');

  const [modalOpen, setModalOpen] = useState(false);
  const [newCompanyId, setNewCompanyId] = useState('');
  const [newTemplateId, setNewTemplateId] = useState('');
  const [newScheduledAt, setNewScheduledAt] = useState('');
  const [newRecurrence, setNewRecurrence] = useState('0');
  const [saving, setSaving] = useState(false);

  // Modelos desativados (0102) continuam existindo para as visitas que já
  // os usaram, mas não podem ser escolhidos numa visita nova.
  const selectableTemplates = templates.filter((t) => t.active !== false);

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase
      .from('audits')
      .select('*, company:companies(name)')
      .order('scheduled_at', { ascending: false });
    if (!isMaster && companyId) q = q.eq('company_id', companyId);
    if (statusFilter !== 'all') q = q.eq('status', statusFilter);
    // Chave inclui os filtros: a lista filtrada guardada é a que volta
    // quando a rede cai com o mesmo filtro na tela.
    const { data, error, fromCache, cachedAt } = await readThrough(
      `audits:${isMaster ? 'all' : companyId}:${statusFilter}`,
      () => q,
    );
    setLoading(false);
    setOfflineNotice(fromCache ? cacheNotice(cachedAt) : null);
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
    if (selectableTemplates.length === 0) {
      toast.error(
        'Nenhum modelo de visita ativo. Crie um em "Modelos de visita".',
      );
      return;
    }
    setNewCompanyId(isMaster ? (companies[0]?.id ?? '') : (companyId ?? ''));
    setNewTemplateId(selectableTemplates[0]?.id ?? '');
    setNewScheduledAt(new Date().toISOString().slice(0, 16));
    setNewRecurrence('0');
    setModalOpen(true);
  }

  async function handleSchedule() {
    if (!newCompanyId || !newTemplateId || !newScheduledAt) {
      toast.error('Preencha todos os campos.');
      return;
    }
    setSaving(true);
    const recurrenceMonths = Number(newRecurrence);
    const { error } = await supabase.from('audits').insert({
      company_id: newCompanyId,
      template_id: newTemplateId,
      scheduled_at: new Date(newScheduledAt).toISOString(),
      auditor_id: profile?.id,
      status: 'scheduled' as AuditStatus,
      recurrence_months: recurrenceMonths > 0 ? recurrenceMonths : null,
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
      <PageHeader
        title="Visitas técnicas"
        subtitle={
          <>
            Inspeções sanitárias da RT.{' '}
            <span
              title="RDC 216/2004 — Regulamento Técnico de Boas Práticas para Serviços de Alimentação (cozinhas, restaurantes, lanchonetes etc.).
RDC 275/2002 — Regulamento Técnico de Procedimentos Operacionais Padronizados (POPs) e Lista de Verificação aplicada a indústrias/estabelecimentos produtores."
              className="cursor-help underline decoration-dotted underline-offset-2"
            >
              RDC 216 + RDC 275
            </span>
            .
          </>
        }
        actions={
          isMaster ? (
            <>
              <Button
                variant="secondary"
                onClick={() => navigate('/visitas/modelos')}
              >
                <ClipboardList size={16} />
                Modelos
              </Button>
              <Button variant="secondary" onClick={openSchedule}>
                <CalendarDays size={16} />
                Agendar visita
              </Button>
              {/* Fluxo guiado: empresa → checklist → avaliar, sem agendar. */}
              <Button onClick={() => navigate('/vistorias/nova')}>
                <Plus size={18} />
                Iniciar vistoria
              </Button>
            </>
          ) : null
        }
      />

      {offlineNotice ? (
        <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
          {offlineNotice}
        </p>
      ) : null}

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
        <ListSkeleton rows={5} />
      ) : audits.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <ClipboardCheck size={32} className="text-neutral-300" />
            <p className="text-sm text-neutral-600">Nenhuma visita ainda.</p>
            {isMaster && selectableTemplates.length === 0 ? (
              <Button
                variant="secondary"
                onClick={() => navigate('/visitas/modelos')}
              >
                <ClipboardList size={16} />
                Criar o modelo da visita
              </Button>
            ) : null}
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
                className="block rounded-xl border border-neutral-200 bg-white p-4 transition hover:border-neutral-300 hover:shadow-sm sm:p-5"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-neutral-800">
                      {a.company?.name ?? companyMap.get(a.company_id) ?? ''}
                    </p>
                    <p className="text-xs text-neutral-500">
                      Agendada{' '}
                      {a.scheduled_at
                        ? formatDateTime(a.scheduled_at)
                        : 'sem data'}
                      {a.completed_at
                        ? ` - Finalizada ${formatDateTime(a.completed_at)}`
                        : ''}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {a.score != null ? (
                      <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-sm font-semibold text-neutral-700">
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
            {selectableTemplates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
                {t.company_id
                  ? ` (só ${companyMap.get(t.company_id) ?? 'uma empresa'})`
                  : t.is_global
                    ? ' (modelo oficial)'
                    : ''}
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
          <Select
            id="new-recurrence"
            label="Repetir"
            value={newRecurrence}
            onChange={(e) => setNewRecurrence(e.target.value)}
          >
            <option value="0">Sem repeticao (visita unica)</option>
            <option value="1">Mensalmente</option>
            <option value="2">Bimestralmente</option>
            <option value="3">Trimestralmente</option>
            <option value="6">Semestralmente</option>
            <option value="12">Anualmente</option>
          </Select>
          <p className="text-xs text-neutral-500">
            Visitas recorrentes geram automaticamente a proxima ao serem
            finalizadas.
          </p>
        </div>
      </Modal>
    </div>
  );
}
