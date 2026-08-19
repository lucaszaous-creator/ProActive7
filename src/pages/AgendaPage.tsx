import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Bell,
  Check,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  CalendarClock,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { usePageTitle } from '@/lib/usePageTitle';
import { useAuth } from '@/context/AuthContext';
import { useCompanyScope } from '@/lib/useCompanyScope';
import { formatDate } from '@/lib/dates';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { PageHeader } from '@/components/ui/PageHeader';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import {
  isoDate,
  monthGrid,
  MONTH_NAMES_PT,
  WEEKDAY_NAMES_PT,
  WEEKDAY_NAMES_PT_LONG,
} from '@/lib/calendar';
import {
  eventToItem,
  isoFromLocalInput,
  localInputFromIso,
  KIND_LABEL,
  KINDS,
  REMINDER_OPTIONS,
  sortItems,
  visitToItem,
  type CalendarItem,
  type VisitLike,
} from '@/lib/agendaEvents';
import type { AgendaEvent, AgendaEventKind, AuditStatus } from '@/lib/types';

interface AuditEvent extends VisitLike {
  company_id: string;
  completed_at: string | null;
}

const STATUS_LABEL_SHORT: Record<AuditStatus, string> = {
  scheduled: 'Agendada',
  in_progress: 'Em curso',
  completed: 'Concluida',
  cancelled: 'Cancelada',
};

interface DraftEvent {
  id: string | null;
  title: string;
  kind: AgendaEventKind;
  companyId: string;
  startsAt: string;
  endsAt: string;
  allDay: boolean;
  remind: string;
  description: string;
}

function emptyDraft(day?: string): DraftEvent {
  // Compromisso novo nasce às 9h do dia clicado (ou de hoje): a RT quase
  // nunca marca visita de madrugada, e 00:00 obrigaria a corrigir a hora.
  const base = day ? new Date(`${day}T09:00`) : new Date();
  if (!day) base.setHours(base.getHours() + 1, 0, 0, 0);
  return {
    id: null,
    title: '',
    kind: 'meeting',
    companyId: '',
    startsAt: localInputFromIso(base.toISOString()),
    endsAt: '',
    allDay: false,
    remind: '1',
    description: '',
  };
}

function draftFromEvent(e: AgendaEvent): DraftEvent {
  return {
    id: e.id,
    title: e.title,
    kind: e.kind,
    companyId: e.company_id ?? '',
    startsAt: localInputFromIso(e.starts_at),
    endsAt: localInputFromIso(e.ends_at),
    allDay: e.all_day,
    remind: e.remind_days_before == null ? '' : String(e.remind_days_before),
    description: e.description ?? '',
  };
}

export function AgendaPage() {
  usePageTitle('Agenda');
  const { isMaster, isNutritionist, isPlatformAdmin } = useAuth();
  const { companies } = useCompanyScope();
  const today = useMemo(() => new Date(), []);
  const [cursor, setCursor] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1),
  );
  const [visits, setVisits] = useState<AuditEvent[]>([]);
  const [events, setEvents] = useState<AgendaEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<DraftEvent | null>(null);
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<AgendaEvent | null>(null);

  // /agenda fica sob o ProtectedRoute genérico (o padrão do projeto: rota
  // acessível por link direto). Quem não é RT enxerga a agenda vazia pela
  // RLS — então nem oferecemos as ações de escrita, que só dariam erro.
  const canEdit = isNutritionist || isPlatformAdmin;

  const companyNames = useMemo(
    () => new Map(companies.map((c) => [c.id, c.name])),
    [companies],
  );

  const load = useCallback(async () => {
    setLoading(true);
    const start = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const end = new Date(cursor.getFullYear(), cursor.getMonth() + 2, 0);
    // Janela: do inicio do mes ate o fim do proximo (6 linhas da grade
    // podem cobrir ate ~5 dias do mes seguinte).
    const [visitRes, eventRes] = await Promise.all([
      supabase
        .from('audits')
        .select(
          'id, company_id, scheduled_at, completed_at, status, company:companies(name)',
        )
        .gte('scheduled_at', start.toISOString())
        .lte('scheduled_at', end.toISOString())
        .order('scheduled_at'),
      supabase
        .from('agenda_events')
        .select('*')
        .gte('starts_at', start.toISOString())
        .lte('starts_at', end.toISOString())
        .order('starts_at'),
    ]);
    setLoading(false);
    if (visitRes.error) {
      toast.error('Erro ao carregar visitas: ' + visitRes.error.message);
    } else {
      setVisits((visitRes.data as unknown as AuditEvent[] | null) ?? []);
    }
    if (eventRes.error) {
      toast.error('Erro ao carregar compromissos: ' + eventRes.error.message);
    } else {
      setEvents((eventRes.data as AgendaEvent[] | null) ?? []);
    }
  }, [cursor]);

  useEffect(() => {
    void load();
  }, [load]);

  const grid = useMemo(
    () => monthGrid(cursor.getFullYear(), cursor.getMonth(), today),
    [cursor, today],
  );

  const eventById = useMemo(
    () => new Map(events.map((e) => [e.id, e])),
    [events],
  );

  /** As duas fontes no mesmo calendário (ver lib/agendaEvents). */
  const items = useMemo(
    () =>
      sortItems([
        ...visits.map(visitToItem),
        ...events.map((e) =>
          eventToItem(
            e,
            e.company_id ? companyNames.get(e.company_id) : undefined,
          ),
        ),
      ]),
    [visits, events, companyNames],
  );

  const itemsByDate = useMemo(() => {
    const map = new Map<string, CalendarItem[]>();
    for (const it of items) {
      const iso = isoDate(new Date(it.at));
      const arr = map.get(iso) ?? [];
      arr.push(it);
      map.set(iso, arr);
    }
    return map;
  }, [items]);

  const upcoming = useMemo(() => {
    const todayIso = isoDate(today);
    return items
      .filter((it) => isoDate(new Date(it.at)) >= todayIso && !it.muted)
      .slice(0, 20);
  }, [items, today]);

  function prevMonth() {
    setCursor((c) => new Date(c.getFullYear(), c.getMonth() - 1, 1));
  }
  function nextMonth() {
    setCursor((c) => new Date(c.getFullYear(), c.getMonth() + 1, 1));
  }
  function goToday() {
    setCursor(new Date(today.getFullYear(), today.getMonth(), 1));
  }

  async function saveDraft() {
    if (!draft) return;
    const title = draft.title.trim();
    if (!title) {
      toast.error('Dê um título ao compromisso.');
      return;
    }
    const startsAt = isoFromLocalInput(draft.startsAt);
    if (!startsAt) {
      toast.error('Informe a data e a hora.');
      return;
    }
    const endsAt = isoFromLocalInput(draft.endsAt);
    if (endsAt && endsAt < startsAt) {
      toast.error('O término não pode ser antes do início.');
      return;
    }
    setSaving(true);
    const payload = {
      title,
      kind: draft.kind,
      company_id: draft.companyId || null,
      starts_at: startsAt,
      ends_at: endsAt,
      all_day: draft.allDay,
      remind_days_before: draft.remind === '' ? null : Number(draft.remind),
      description: draft.description.trim() || null,
    };
    const { error } = draft.id
      ? await supabase.from('agenda_events').update(payload).eq('id', draft.id)
      : await supabase.from('agenda_events').insert(payload);
    setSaving(false);
    if (error) {
      toast.error('Erro ao salvar: ' + error.message);
      return;
    }
    toast.success(draft.id ? 'Compromisso atualizado.' : 'Compromisso criado.');
    setDraft(null);
    void load();
  }

  async function toggleDone(e: AgendaEvent) {
    const { error } = await supabase
      .from('agenda_events')
      .update({ done_at: e.done_at ? null : new Date().toISOString() })
      .eq('id', e.id);
    if (error) {
      toast.error('Erro ao atualizar: ' + error.message);
      return;
    }
    void load();
  }

  async function confirmDelete() {
    if (!toDelete) return;
    const { error } = await supabase
      .from('agenda_events')
      .delete()
      .eq('id', toDelete.id);
    setToDelete(null);
    if (error) {
      toast.error('Erro ao excluir: ' + error.message);
      return;
    }
    toast.success('Compromisso excluído.');
    void load();
  }

  /** Ações de um item: visita abre a página; compromisso edita aqui. */
  function ItemActions({ item }: { item: CalendarItem }) {
    const e = item.source === 'event' ? eventById.get(item.key.slice(6)) : null;
    if (!e || !canEdit) return null;
    return (
      <div className="flex shrink-0 gap-0.5">
        <button
          type="button"
          onClick={() => void toggleDone(e)}
          aria-label={e.done_at ? 'Reabrir compromisso' : 'Marcar como feito'}
          className={`rounded-lg p-1.5 hover:bg-neutral-100 ${
            e.done_at ? 'text-green-600' : 'text-neutral-500'
          }`}
        >
          <Check size={14} />
        </button>
        <button
          type="button"
          onClick={() => setDraft(draftFromEvent(e))}
          aria-label="Editar compromisso"
          className="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-100"
        >
          <Pencil size={14} />
        </button>
        <button
          type="button"
          onClick={() => setToDelete(e)}
          aria-label="Excluir compromisso"
          className="rounded-lg p-1.5 text-red-500 hover:bg-red-50"
        >
          <Trash2 size={14} />
        </button>
      </div>
    );
  }

  function ItemLabel({ item }: { item: CalendarItem }) {
    const body = (
      <>
        <span
          className={`h-2 w-2 shrink-0 rounded-full ${item.dotClass}`}
          aria-hidden
        />
        <span className="min-w-0 flex-1">
          <span
            className={`block truncate text-neutral-800 ${
              item.muted ? 'line-through opacity-60' : ''
            }`}
          >
            {item.title}
          </span>
          <span className="block truncate text-[11px] text-neutral-500">
            {item.subtitle}
          </span>
        </span>
        <span className="shrink-0 text-neutral-500">
          {item.allDay
            ? 'dia todo'
            : new Date(item.at).toLocaleTimeString('pt-BR', {
                hour: '2-digit',
                minute: '2-digit',
              })}
        </span>
      </>
    );
    return item.href ? (
      <Link
        to={item.href}
        className="flex flex-1 items-center gap-2 rounded-lg bg-neutral-50 px-2 py-1.5 text-xs hover:bg-neutral-100"
      >
        {body}
      </Link>
    ) : (
      <span className="flex flex-1 items-center gap-2 rounded-lg bg-neutral-50 px-2 py-1.5 text-xs">
        {body}
      </span>
    );
  }

  const monthHasItems = grid.some(
    (d) => d.inMonth && (itemsByDate.get(d.iso)?.length ?? 0) > 0,
  );

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Agenda"
        subtitle="Visitas técnicas e compromissos da consultoria."
        actions={
          <>
            {canEdit ? (
              <Button size="sm" onClick={() => setDraft(emptyDraft())}>
                <Plus size={16} /> Novo compromisso
              </Button>
            ) : null}
            <Button variant="secondary" size="sm" onClick={prevMonth}>
              <ChevronLeft size={16} />
            </Button>
            <Button variant="secondary" size="sm" onClick={goToday}>
              Hoje
            </Button>
            <Button variant="secondary" size="sm" onClick={nextMonth}>
              <ChevronRight size={16} />
            </Button>
          </>
        }
      />

      <Card className="mb-4">
        <h2 className="mb-3 text-base font-semibold text-neutral-700">
          {MONTH_NAMES_PT[cursor.getMonth()]} {cursor.getFullYear()}
        </h2>

        {/* MOBILE: lista compacta. DESKTOP (md+): grade mensal. */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Spinner className="h-8 w-8" />
          </div>
        ) : (
          <>
            <div className="md:hidden">
              {grid
                .filter(
                  (d) => d.inMonth && (itemsByDate.get(d.iso)?.length ?? 0) > 0,
                )
                .map((d) => {
                  const list = itemsByDate.get(d.iso) ?? [];
                  return (
                    <div
                      key={d.iso}
                      className="border-b border-neutral-100 py-2 last:border-0"
                    >
                      <p className="mb-1 text-xs font-medium text-neutral-500">
                        {WEEKDAY_NAMES_PT_LONG[d.date.getDay()]}, {d.day}
                        {d.isToday ? ' (hoje)' : ''}
                      </p>
                      <ul className="flex flex-col gap-1">
                        {list.map((it) => (
                          <li key={it.key} className="flex items-center gap-1">
                            <ItemLabel item={it} />
                            <ItemActions item={it} />
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              {!monthHasItems ? (
                <p className="py-8 text-center text-sm text-neutral-500">
                  Nada agendado neste mês.
                </p>
              ) : null}
            </div>

            <div className="hidden md:block">
              <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-neutral-500">
                {WEEKDAY_NAMES_PT.map((w, i) => (
                  <div key={`${w}-${i}`} className="py-1">
                    {w}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {grid.map((d) => {
                  const list = itemsByDate.get(d.iso) ?? [];
                  return (
                    <div
                      key={d.iso}
                      className={`group flex min-h-[5.5rem] flex-col gap-1 rounded-lg border p-1 text-xs ${
                        d.inMonth
                          ? 'border-neutral-200 bg-white'
                          : 'border-transparent bg-neutral-50 text-neutral-400'
                      } ${d.isToday ? 'ring-2 ring-neutral-900' : ''}`}
                    >
                      <div className="flex items-center justify-between">
                        {/* Clicar no dia já abre o compromisso naquela data:
                            um clique a menos que abrir o modal e corrigir. */}
                        {d.inMonth && canEdit ? (
                          <button
                            type="button"
                            onClick={() => setDraft(emptyDraft(d.iso))}
                            aria-label={`Novo compromisso em ${d.day}`}
                            className="rounded p-0.5 text-neutral-400 opacity-0 transition group-hover:opacity-100 hover:bg-neutral-100 hover:text-neutral-700"
                          >
                            <Plus size={12} />
                          </button>
                        ) : (
                          <span />
                        )}
                        <span className="text-[10px] font-semibold">
                          {d.day}
                        </span>
                      </div>
                      {list.slice(0, 3).map((it) =>
                        it.href ? (
                          <Link
                            key={it.key}
                            to={it.href}
                            title={`${it.title} — ${it.subtitle}`}
                            className="flex items-center gap-1 truncate rounded bg-neutral-100 px-1 py-0.5 text-[10px] text-neutral-700 hover:bg-neutral-200"
                          >
                            <span
                              className={`h-1.5 w-1.5 shrink-0 rounded-full ${it.dotClass}`}
                            />
                            <span
                              className={`truncate ${it.muted ? 'line-through opacity-60' : ''}`}
                            >
                              {it.title}
                            </span>
                          </Link>
                        ) : (
                          <button
                            key={it.key}
                            type="button"
                            title={`${it.title} — ${it.subtitle}`}
                            onClick={() => {
                              const e = eventById.get(it.key.slice(6));
                              if (e && canEdit) setDraft(draftFromEvent(e));
                            }}
                            className="flex items-center gap-1 truncate rounded bg-neutral-100 px-1 py-0.5 text-left text-[10px] text-neutral-700 hover:bg-neutral-200"
                          >
                            <span
                              className={`h-1.5 w-1.5 shrink-0 rounded-full ${it.dotClass}`}
                            />
                            <span
                              className={`truncate ${it.muted ? 'line-through opacity-60' : ''}`}
                            >
                              {it.title}
                            </span>
                          </button>
                        ),
                      )}
                      {list.length > 3 ? (
                        <span className="text-[10px] text-neutral-500">
                          +{list.length - 3} mais
                        </span>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </Card>

      {upcoming.length > 0 ? (
        <Card>
          <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-neutral-700">
            <CalendarClock size={18} />
            Próximos {isMaster ? '(carteira completa)' : ''}
          </h2>
          <ul className="flex flex-col divide-y divide-neutral-100">
            {upcoming.map((it) => {
              const e =
                it.source === 'event' ? eventById.get(it.key.slice(6)) : null;
              const visit =
                it.source === 'visit'
                  ? visits.find((v) => `visit:${v.id}` === it.key)
                  : null;
              const row = (
                <>
                  <span
                    className={`h-2 w-2 shrink-0 rounded-full ${it.dotClass}`}
                    aria-hidden
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-neutral-800">
                      {it.title}
                    </p>
                    <p className="flex flex-wrap items-center gap-x-2 text-xs text-neutral-500">
                      <span>
                        <CalendarDays size={10} className="mr-1 inline" />
                        {formatDate(it.at)}
                      </span>
                      <span>{it.subtitle}</span>
                      {visit ? (
                        <span>{STATUS_LABEL_SHORT[visit.status]}</span>
                      ) : null}
                      {e?.remind_days_before != null ? (
                        <span className="inline-flex items-center gap-1">
                          <Bell size={10} />
                          {REMINDER_OPTIONS.find(
                            (o) => o.value === String(e.remind_days_before),
                          )?.label ?? 'com lembrete'}
                        </span>
                      ) : null}
                    </p>
                  </div>
                </>
              );
              return (
                <li
                  key={it.key}
                  className="flex items-center gap-2 py-2 text-sm"
                >
                  {it.href ? (
                    <Link
                      to={it.href}
                      className="flex min-w-0 flex-1 items-center gap-3 hover:opacity-80"
                    >
                      {row}
                    </Link>
                  ) : (
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      {row}
                    </div>
                  )}
                  <ItemActions item={it} />
                </li>
              );
            })}
          </ul>
        </Card>
      ) : null}

      <Modal
        open={draft !== null}
        onClose={() => setDraft(null)}
        title={draft?.id ? 'Editar compromisso' : 'Novo compromisso'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setDraft(null)}>
              Cancelar
            </Button>
            <Button onClick={() => void saveDraft()} disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </>
        }
      >
        {draft ? (
          <div className="flex flex-col gap-3">
            <Input
              id="agenda-title"
              label="Título"
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              placeholder="Ex.: Reunião de resultados com a gerência"
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <Select
                id="agenda-kind"
                label="Tipo"
                value={draft.kind}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    kind: e.target.value as AgendaEventKind,
                  })
                }
              >
                {KINDS.map((k) => (
                  <option key={k} value={k}>
                    {KIND_LABEL[k]}
                  </option>
                ))}
              </Select>
              <Select
                id="agenda-company"
                label="Empresa (opcional)"
                value={draft.companyId}
                onChange={(e) =>
                  setDraft({ ...draft, companyId: e.target.value })
                }
              >
                <option value="">Sem empresa (interno)</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                id="agenda-start"
                type="datetime-local"
                label="Início"
                value={draft.startsAt}
                onChange={(e) =>
                  setDraft({ ...draft, startsAt: e.target.value })
                }
              />
              <Input
                id="agenda-end"
                type="datetime-local"
                label="Término (opcional)"
                value={draft.endsAt}
                onChange={(e) => setDraft({ ...draft, endsAt: e.target.value })}
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-neutral-700">
              <input
                type="checkbox"
                checked={draft.allDay}
                onChange={(e) =>
                  setDraft({ ...draft, allDay: e.target.checked })
                }
                className="h-4 w-4 rounded border-neutral-300"
              />
              Dia inteiro
            </label>
            <Select
              id="agenda-remind"
              label="Lembrete"
              value={draft.remind}
              onChange={(e) => setDraft({ ...draft, remind: e.target.value })}
            >
              {REMINDER_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
            <p className="-mt-1 text-xs text-neutral-500">
              O aviso chega por notificação no dia do lembrete, junto com o
              resumo diário. Ative as notificações no seu perfil para recebê-lo.
            </p>
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="agenda-desc"
                className="text-sm font-medium text-neutral-700"
              >
                Anotações (opcional)
              </label>
              <textarea
                id="agenda-desc"
                value={draft.description}
                onChange={(e) =>
                  setDraft({ ...draft, description: e.target.value })
                }
                rows={3}
                className="rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-800"
              />
            </div>
          </div>
        ) : null}
      </Modal>

      <ConfirmDialog
        open={toDelete !== null}
        title="Excluir compromisso"
        message={`Excluir "${toDelete?.title ?? ''}" da agenda?`}
        confirmLabel="Excluir"
        onConfirm={() => void confirmDelete()}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
