import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  ChevronDown,
  ChevronUp,
  Plus,
  Pencil,
  Trash2,
  ClipboardCheck,
  Play,
  BookOpen,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { checkDeleteResult } from '@/lib/supabaseHelpers';
import { usePageTitle } from '@/lib/usePageTitle';
import { useAuth } from '@/context/AuthContext';
import { useCompanyScope } from '@/lib/useCompanyScope';
import { formatDateTime } from '@/lib/dates';
import { moveInArray } from '@/lib/auditTemplateSections';
import {
  ANSWER_TYPES,
  ANSWER_TYPE_HINT,
  ANSWER_TYPE_LABEL,
  answerDraftFrom,
  answerSpecFromDraft,
  answerTypeOf,
  checklistItemChecked,
  emptyAnswerDraft,
  hasDraftRange,
  rangeLabel,
  resultForMeasure,
  scaleMaxOf,
  type AnswerDraft,
} from '@/lib/auditAnswers';
import { isNetworkError, queueWrite } from '@/lib/offlineSync';
import { cacheNotice, readThrough } from '@/lib/offlineCache';
import { logFeatureEvent } from '@/lib/platformMetrics';
import {
  CHECKLIST_FREQUENCY_LABELS,
  type AuditAnswerType,
  type ChecklistFrequency,
  type ChecklistItem,
  type ChecklistRun,
  type ChecklistRunItem,
  type ChecklistTemplate,
} from '@/lib/types';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { PhotoAttacher } from '@/components/PhotoAttacher';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Spinner } from '@/components/ui/Spinner';
import { LibraryBrowser } from '@/components/LibraryBrowser';

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

/**
 * Item do modelo de rotina em edição. Carrega o `id` REAL do item salvo:
 * antes o editor recriava todos os ids ao salvar, e o histórico de
 * execuções (`checklist_runs.items[].id`) perdia o vínculo com a pergunta.
 */
interface DraftChecklistItem extends AnswerDraft {
  id: string;
  text: string;
}

function emptyChecklistItem(): DraftChecklistItem {
  return { id: crypto.randomUUID(), text: '', ...emptyAnswerDraft() };
}

export function ChecklistsPage() {
  usePageTitle('Checklists');
  const { profile, isPlatformAdmin } = useAuth();
  const { isMaster, companies, companyId, setCompanyId } = useCompanyScope();

  const [templates, setTemplates] = useState<ChecklistTemplate[]>([]);
  const [recentRuns, setRecentRuns] = useState<RunWithTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  /** Aviso de "isto é uma cópia local" quando a rede não respondeu. */
  const [offlineNotice, setOfflineNotice] = useState<string | null>(null);
  /**
   * Texto cru do campo de valor medido, por item. Mesmo motivo da tela de
   * vistoria: "-", "12," e "12." são estados válidos no meio da digitação
   * e viram NaN. Sem isto, "máx. -12 °C" só podia ser registrado como 12.
   */
  const [rawMeasure, setRawMeasure] = useState<Record<string, string>>({});

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ChecklistTemplate | null>(null);
  const [saving, setSaving] = useState(false);
  const [tplName, setTplName] = useState('');
  const [tplFreq, setTplFreq] = useState<ChecklistFrequency>('daily');
  const [tplItems, setTplItems] = useState<DraftChecklistItem[]>([
    emptyChecklistItem(),
  ]);
  const [tplActive, setTplActive] = useState(true);

  const [deleting, setDeleting] = useState<ChecklistTemplate | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  // Run em andamento
  const [runOpen, setRunOpen] = useState(false);
  const [runTemplate, setRunTemplate] = useState<ChecklistTemplate | null>(
    null,
  );
  /** Resposta de cada item da execução, por tipo (ver lib/auditAnswers). */
  const [runChecks, setRunChecks] = useState<
    Record<string, { checked?: boolean; value?: number; text?: string }>
  >({});
  const [runNotes, setRunNotes] = useState('');
  const [runPhotoId, setRunPhotoId] = useState<string | null>(null);
  const [runSaving, setRunSaving] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [tplIsGlobal, setTplIsGlobal] = useState(false);

  const load = useCallback(async () => {
    if (!companyId) {
      setTemplates([]);
      setRecentRuns([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    // Admin enxerga também os globais (sem company_id) na lista
    const tplQuery = supabase.from('checklist_templates').select('*');
    // Sem os modelos em cache a cozinha abriria o app offline e veria
    // "nenhum checklist" — que é exatamente quando ela precisa deles.
    const tplRes = await readThrough<ChecklistTemplate[]>(
      `checklist_templates:${companyId}:${isPlatformAdmin ? 'admin' : 'own'}`,
      () =>
        isPlatformAdmin
          ? tplQuery
              .or(`company_id.eq.${companyId},is_global.eq.true`)
              .order('name')
          : tplQuery.eq('company_id', companyId).order('name'),
    );
    setOfflineNotice(tplRes.fromCache ? cacheNotice(tplRes.cachedAt) : null);
    if (tplRes.error) {
      setLoading(false);
      toast.error('Erro ao carregar templates: ' + tplRes.error.message);
      return;
    }
    const tpls = tplRes.data ?? [];
    setTemplates(tpls);

    const tplIds = tpls.map((t) => t.id);
    if (tplIds.length > 0) {
      const runRes = await readThrough<RunWithTemplate[]>(
        `checklist_runs:${companyId}`,
        () =>
          supabase
            .from('checklist_runs')
            .select('*, checklist_templates(name)')
            .in('template_id', tplIds)
            .order('ran_at', { ascending: false })
            .limit(10),
      );
      if (!runRes.error) {
        setRecentRuns(runRes.data ?? []);
      }
    } else {
      setRecentRuns([]);
    }
    setLoading(false);
  }, [companyId, isPlatformAdmin]);

  useEffect(() => {
    void load();
  }, [load]);

  function patchTplItem(index: number, patch: Partial<DraftChecklistItem>) {
    setTplItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    );
  }

  function openCreate() {
    setEditing(null);
    setTplName('');
    setTplFreq('daily');
    setTplItems([emptyChecklistItem()]);
    setTplActive(true);
    setTplIsGlobal(false);
    setModalOpen(true);
  }

  function openEdit(t: ChecklistTemplate) {
    setEditing(t);
    setTplName(t.name);
    setTplFreq(t.frequency);
    setTplItems(
      t.items.length > 0
        ? t.items.map((i) => ({
            id: i.id,
            text: i.text,
            ...answerDraftFrom(i),
          }))
        : [emptyChecklistItem()],
    );
    setTplActive(t.active);
    setTplIsGlobal(t.is_global ?? false);
    setModalOpen(true);
  }

  async function handleSave() {
    if (!tplName.trim()) {
      toast.error('Informe o nome do checklist.');
      return;
    }
    // Preserva o id de cada item: regenerá-los quebrava o vínculo do
    // histórico de execuções com a pergunta que foi respondida.
    const items: ChecklistItem[] = tplItems
      .filter((i) => i.text.trim())
      .map((i) => ({
        id: i.id,
        text: i.text.trim(),
        ...answerSpecFromDraft(i),
      }));
    if (items.length === 0) {
      toast.error('Adicione ao menos um item.');
      return;
    }
    setSaving(true);
    const makeGlobal = isPlatformAdmin && tplIsGlobal;
    const payload = {
      name: tplName.trim(),
      frequency: tplFreq,
      items,
      active: tplActive,
      ...(isPlatformAdmin ? { is_global: tplIsGlobal } : {}),
    };
    const { error } = editing
      ? await supabase
          .from('checklist_templates')
          .update({
            ...payload,
            ...(isPlatformAdmin && tplIsGlobal ? { company_id: null } : {}),
          })
          .eq('id', editing.id)
      : await supabase.from('checklist_templates').insert({
          ...payload,
          company_id: makeGlobal ? null : companyId,
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
    const result = await supabase
      .from('checklist_templates')
      .delete()
      .eq('id', deleting.id)
      .select('id');
    setDeleteBusy(false);
    const err = checkDeleteResult(result);
    if (err) {
      toast.error(err);
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

  function patchRunAnswer(
    itemId: string,
    patch: { checked?: boolean; value?: number; text?: string },
  ) {
    setRunChecks((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], ...patch },
    }));
  }

  function openRun(t: ChecklistTemplate) {
    setRunTemplate(t);
    setRunChecks(Object.fromEntries(t.items.map((i) => [i.id, {}])));
    setRawMeasure({});
    setRunNotes('');
    setRunPhotoId(null);
    setRunOpen(true);
  }

  async function handleRunSave() {
    if (!runTemplate) return;
    setRunSaving(true);
    // `checked` é derivado do tipo de resposta: num item de temperatura,
    // quem decide se está ok é o número medido, não um clique.
    const items: ChecklistRunItem[] = runTemplate.items.map((i) => {
      const answer = runChecks[i.id] ?? {};
      return {
        id: i.id,
        checked: checklistItemChecked(i, answer),
        ...(answer.value == null ? {} : { value: answer.value }),
        ...(answer.text?.trim() ? { text: answer.text.trim() } : {}),
      };
    });
    const payload = {
      template_id: runTemplate.id,
      ran_by: profile?.id ?? null,
      items,
      notes: runNotes.trim() || null,
      photo_id: runPhotoId,
    };

    // A rotina é preenchida no chão da cozinha, que é justamente onde o
    // sinal cai. Sem conexão, guarda no aparelho e sobe sozinho depois
    // (mesma fila da vistoria — ver lib/offlineSync).
    const queueIt = async () => {
      await queueWrite({
        table: 'checklist_runs',
        op: 'insert',
        match: {},
        payload,
        label: `Checklist: ${runTemplate.name}`,
      });
      setRunSaving(false);
      toast.success(
        'Sem conexão: registrado neste aparelho. Envia sozinho quando o sinal voltar.',
      );
      setRunOpen(false);
    };

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      await queueIt();
      return;
    }

    const { error } = await supabase.from('checklist_runs').insert(payload);
    setRunSaving(false);
    if (error) {
      if (isNetworkError(error)) {
        await queueIt();
        return;
      }
      toast.error('Erro ao registrar: ' + error.message);
      return;
    }
    toast.success('Checklist registrado.');
    void logFeatureEvent('checklist_run');
    setRunOpen(false);
    void load();
  }

  const noCompany = isMaster && companies.length === 0;

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Checklists"
        subtitle="Procedimentos operacionais com histórico de execução."
        actions={
          <>
            <Button
              variant="secondary"
              onClick={() => setLibraryOpen(true)}
              disabled={!companyId}
            >
              <BookOpen size={16} />
              Biblioteca
            </Button>
            <Button onClick={openCreate} disabled={!companyId}>
              <Plus size={18} />
              Novo template
            </Button>
          </>
        }
      />

      {offlineNotice ? (
        <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
          {offlineNotice}
        </p>
      ) : null}

      <LibraryBrowser
        open={libraryOpen}
        onClose={() => setLibraryOpen(false)}
        kind="checklist"
        companyId={companyId}
        onCloned={() => void load()}
      />

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
                  className="text-xs text-neutral-700 hover:underline"
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
                        {t.is_global ? (
                          <span className="ml-2 inline-block rounded-full bg-neutral-50 px-2 py-0.5 text-[10px] font-medium text-neutral-700">
                            Modelo oficial
                          </span>
                        ) : null}
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
                          className="rounded-lg p-2.5 text-neutral-600 hover:bg-neutral-50"
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
                  // Valores medidos vão para o histórico: é o que a RT quer
                  // ver sem abrir nada ("que temperatura deu a câmara ontem").
                  // Isto só funciona porque o id do item é preservado ao
                  // editar o modelo — ver o comentário em handleSave.
                  const tpl = templates.find((t) => t.id === r.template_id);
                  const measures = (tpl?.items ?? []).flatMap((item) => {
                    if (answerTypeOf(item) !== 'measure') return [];
                    const answer = r.items.find((ri) => ri.id === item.id);
                    if (answer?.value == null) return [];
                    const outOfRange =
                      resultForMeasure(item, answer.value) === 'NC';
                    return [
                      {
                        key: item.id,
                        label: `${item.text}: ${answer.value}${
                          item.unit ? ` ${item.unit}` : ''
                        }`,
                        outOfRange,
                      },
                    ];
                  });
                  return (
                    <li key={r.id} className="flex items-center gap-3 py-2">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-neutral-50 text-neutral-600">
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
                        {measures.length > 0 ? (
                          <p className="mt-0.5 flex flex-wrap gap-x-2 gap-y-1 text-xs">
                            {measures.map((m) => (
                              <span
                                key={m.key}
                                className={
                                  m.outOfRange
                                    ? 'rounded bg-red-50 px-1.5 py-0.5 font-medium text-red-700'
                                    : 'text-neutral-500'
                                }
                              >
                                {m.label}
                              </span>
                            ))}
                          </p>
                        ) : null}
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
                <div
                  key={it.id}
                  className="flex flex-col gap-2 rounded-lg border border-neutral-100 p-2"
                >
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={it.text}
                      onChange={(e) =>
                        patchTplItem(i, { text: e.target.value })
                      }
                      placeholder="Ex.: Bancada higienizada"
                      className="flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-800 focus:ring-2 focus:ring-neutral-800/20"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setTplItems((prev) => moveInArray(prev, i, i - 1))
                      }
                      disabled={i === 0}
                      className="rounded-lg p-2 text-neutral-500 hover:bg-neutral-100 disabled:opacity-30"
                      aria-label="Mover item para cima"
                    >
                      <ChevronUp size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setTplItems((prev) => moveInArray(prev, i, i + 1))
                      }
                      disabled={i === tplItems.length - 1}
                      className="rounded-lg p-2 text-neutral-500 hover:bg-neutral-100 disabled:opacity-30"
                      aria-label="Mover item para baixo"
                    >
                      <ChevronDown size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setTplItems((prev) =>
                          prev.filter((_, idx) => idx !== i),
                        )
                      }
                      disabled={tplItems.length === 1}
                      className="rounded-lg p-2 text-red-500 hover:bg-red-50 disabled:opacity-30"
                      aria-label="Remover item"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  {/* Mesmo tipo de resposta da vistoria (lib/auditAnswers):
                      é a mesma pergunta em outro contexto, então não vira
                      uma segunda implementação. O que a cozinha mais usa é
                      "valor medido" — temperatura de câmara com faixa. */}
                  <div className="grid gap-2 sm:grid-cols-2">
                    <select
                      value={it.answerType}
                      onChange={(e) =>
                        patchTplItem(i, {
                          answerType: e.target.value as AuditAnswerType,
                        })
                      }
                      aria-label="Tipo de resposta"
                      className="rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-800"
                    >
                      {ANSWER_TYPES.map((t) => (
                        <option key={t} value={t}>
                          Resposta: {ANSWER_TYPE_LABEL[t]}
                        </option>
                      ))}
                    </select>
                    <p className="self-center text-xs text-neutral-500">
                      {ANSWER_TYPE_HINT[it.answerType]}
                    </p>
                  </div>

                  {it.answerType === 'scale' ? (
                    <input
                      type="number"
                      min={1}
                      value={it.scaleMax}
                      onChange={(e) =>
                        patchTplItem(i, { scaleMax: e.target.value })
                      }
                      placeholder="Nota máxima (ex.: 5)"
                      aria-label="Nota máxima da escala"
                      className="rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-800"
                    />
                  ) : null}

                  {it.answerType === 'measure' ? (
                    <div className="grid gap-2 sm:grid-cols-3">
                      <input
                        type="text"
                        value={it.unit}
                        onChange={(e) =>
                          patchTplItem(i, { unit: e.target.value })
                        }
                        placeholder="Unidade (ex.: °C)"
                        aria-label="Unidade da medida"
                        className="rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-800"
                      />
                      <input
                        type="text"
                        inputMode="decimal"
                        value={it.min}
                        onChange={(e) =>
                          patchTplItem(i, { min: e.target.value })
                        }
                        placeholder="Mínimo aceitável"
                        aria-label="Valor mínimo aceitável"
                        className="rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-800"
                      />
                      <input
                        type="text"
                        inputMode="decimal"
                        value={it.max}
                        onChange={(e) =>
                          patchTplItem(i, { max: e.target.value })
                        }
                        placeholder="Máximo aceitável"
                        aria-label="Valor máximo aceitável"
                        className="rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-800"
                      />
                    </div>
                  ) : null}

                  {it.answerType === 'measure' && !hasDraftRange(it) ? (
                    <p className="text-xs text-amber-600">
                      Sem faixa definida, o valor fica só registrado: não marca
                      o item como fora do padrão.
                    </p>
                  ) : null}
                </div>
              ))}
              <button
                type="button"
                onClick={() =>
                  setTplItems((prev) => [...prev, emptyChecklistItem()])
                }
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
              className="h-5 w-5 accent-neutral-600"
            />
            Template ativo
          </label>

          {isPlatformAdmin ? (
            <label className="flex items-start gap-2 rounded-lg border border-neutral-200 bg-neutral-50 p-2 text-sm">
              <input
                type="checkbox"
                checked={tplIsGlobal}
                onChange={(e) => setTplIsGlobal(e.target.checked)}
                className="mt-0.5 h-5 w-5 accent-neutral-600"
              />
              <span>
                <span className="font-medium text-neutral-700">
                  Publicar como modelo oficial
                </span>
                <span className="block text-xs text-neutral-600">
                  Visível para todas as orgs como leitura. Elas podem clonar.
                </span>
              </span>
            </label>
          ) : null}
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
                  {answerTypeOf(i) === 'conformity' ? (
                    <label className="flex items-start gap-2 text-sm text-neutral-700">
                      <input
                        type="checkbox"
                        checked={runChecks[i.id]?.checked ?? false}
                        onChange={(e) =>
                          patchRunAnswer(i.id, { checked: e.target.checked })
                        }
                        className="mt-0.5 h-5 w-5 accent-neutral-600"
                      />
                      {i.text}
                    </label>
                  ) : (
                    <div className="flex flex-col gap-1.5">
                      <p className="text-sm text-neutral-700">{i.text}</p>

                      {answerTypeOf(i) === 'text' ? (
                        <textarea
                          value={runChecks[i.id]?.text ?? ''}
                          onChange={(e) =>
                            patchRunAnswer(i.id, { text: e.target.value })
                          }
                          rows={2}
                          aria-label={`Resposta: ${i.text}`}
                          placeholder="Resposta..."
                          className="w-full rounded-lg border border-neutral-300 px-2 py-1.5 text-sm outline-none focus:border-neutral-800"
                        />
                      ) : null}

                      {answerTypeOf(i) === 'scale' ? (
                        <div className="flex flex-wrap gap-1">
                          {Array.from(
                            { length: scaleMaxOf(i) + 1 },
                            (_, n) => n,
                          ).map((n) => (
                            <button
                              key={n}
                              type="button"
                              onClick={() => patchRunAnswer(i.id, { value: n })}
                              aria-pressed={runChecks[i.id]?.value === n}
                              className={`h-11 w-11 rounded-lg border text-sm font-semibold transition ${
                                runChecks[i.id]?.value === n
                                  ? 'border-neutral-800 bg-neutral-800 text-white'
                                  : 'border-neutral-300 text-neutral-600 hover:bg-neutral-50'
                              }`}
                            >
                              {n}
                            </button>
                          ))}
                        </div>
                      ) : null}

                      {answerTypeOf(i) === 'measure' ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <input
                            type="text"
                            inputMode="decimal"
                            value={
                              rawMeasure[i.id] ??
                              (runChecks[i.id]?.value == null
                                ? ''
                                : String(runChecks[i.id]?.value))
                            }
                            onChange={(e) => {
                              const raw = e.target.value;
                              setRawMeasure((prev) => ({
                                ...prev,
                                [i.id]: raw,
                              }));
                              const parsed = Number(raw.replace(',', '.'));
                              patchRunAnswer(i.id, {
                                value:
                                  raw.trim() && Number.isFinite(parsed)
                                    ? parsed
                                    : undefined,
                              });
                            }}
                            aria-label={`Valor medido: ${i.text}`}
                            placeholder="Valor"
                            className="h-11 w-28 rounded-lg border border-neutral-300 px-2 text-sm outline-none focus:border-neutral-800"
                          />
                          {i.unit ? (
                            <span className="text-sm text-neutral-500">
                              {i.unit}
                            </span>
                          ) : null}
                          {rangeLabel(i) ? (
                            <span className="text-xs text-neutral-500">
                              Aceitável: {rangeLabel(i)}
                            </span>
                          ) : null}
                          {/* Fora da faixa a cozinha vê na hora, e o item
                              não conta como cumprido — o número manda. */}
                          {resultForMeasure(i, runChecks[i.id]?.value) ===
                          'NC' ? (
                            <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                              Fora do padrão
                            </span>
                          ) : null}
                          {resultForMeasure(i, runChecks[i.id]?.value) ===
                          'C' ? (
                            <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
                              Dentro do padrão
                            </span>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  )}
                </li>
              ))}
            </ul>
            <Input
              id="run-notes"
              label="Observações (opcional)"
              value={runNotes}
              onChange={(e) => setRunNotes(e.target.value)}
            />
            <PhotoAttacher
              companyId={companyId || null}
              photoId={runPhotoId}
              onChange={setRunPhotoId}
              label="Foto (opcional)"
              description="Anexe uma foto do que foi verificado (ex.: bancada limpa, equipamento sanitizado)."
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
