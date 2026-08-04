import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowLeft,
  BookOpen,
  Copy,
  EyeOff,
  Eye,
  Globe,
  Pencil,
  Plus,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { usePageTitle } from '@/lib/usePageTitle';
import { useAuth } from '@/context/AuthContext';
import { useCompanyScope } from '@/lib/useCompanyScope';
import {
  auditTemplateScope,
  type AuditItem,
  type AuditTemplate,
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
import { LibraryBrowser } from '@/components/LibraryBrowser';

/**
 * Categorias da RDC 216/2004 — servem de sugestao (datalist) na hora de
 * montar o modelo. Nao sao obrigatorias: a nutri escreve a categoria que
 * quiser. Sao as secoes do proprio regulamento, na ordem dele.
 */
const RDC216_CATEGORIES = [
  'Edificação, instalações, equipamentos, móveis e utensílios',
  'Higienização de instalações, equipamentos e utensílios',
  'Controle integrado de vetores e pragas urbanas',
  'Abastecimento de água',
  'Manejo de resíduos',
  'Manipuladores',
  'Matérias-primas, ingredientes e embalagens',
  'Preparação do alimento',
  'Armazenamento e transporte do alimento preparado',
  'Exposição ao consumo do alimento preparado',
  'Documentação e registro',
];

/**
 * Peso do item. Alimenta o score (auditScore.ts) e a severidade da NC
 * aberta automaticamente ao reprovar (AuditDetailPage): >=3 vira alta,
 * >=2 media, senao baixa.
 */
const WEIGHTS = [
  { value: 1, label: '1 — Recomendável' },
  { value: 2, label: '2 — Necessário' },
  { value: 3, label: '3 — Imprescindível' },
];

type ScopeChoice = 'organization' | 'company';

interface DraftItem {
  id: string;
  category: string;
  text: string;
  weight: number;
  legal_ref: string;
  ncTemplateId: string;
}

function toDraft(item: AuditItem): DraftItem {
  return {
    id: item.id,
    category: item.category ?? '',
    text: item.text ?? '',
    weight: item.weight ?? 1,
    legal_ref: item.legal_ref ?? '',
    ncTemplateId: item.nc_template_id ?? '',
  };
}

function emptyDraft(category = ''): DraftItem {
  return {
    id: crypto.randomUUID(),
    category,
    text: '',
    weight: 1,
    legal_ref: '',
    ncTemplateId: '',
  };
}

export function AuditTemplatesPage() {
  usePageTitle('Modelos de visita');
  const { isPlatformAdmin } = useAuth();
  const { companies, companyId } = useCompanyScope();

  const [templates, setTemplates] = useState<AuditTemplate[]>([]);
  /** Planos de ação disponíveis para vincular a um item reprovado (0103). */
  const [ncTemplates, setNcTemplates] = useState<NcTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [libraryOpen, setLibraryOpen] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AuditTemplate | null>(null);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [scope, setScope] = useState<ScopeChoice>('organization');
  const [scopeCompanyId, setScopeCompanyId] = useState('');
  const [items, setItems] = useState<DraftItem[]>([emptyDraft()]);

  const [deleting, setDeleting] = useState<AuditTemplate | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('audit_templates')
      .select('*')
      .order('name')
      .limit(200);
    setLoading(false);
    if (error) {
      toast.error('Erro ao carregar modelos: ' + error.message);
      return;
    }
    setTemplates((data as AuditTemplate[] | null) ?? []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void supabase
      .from('nc_templates')
      .select('*')
      .eq('active', true)
      .order('name')
      .limit(300)
      .then(({ data }) => setNcTemplates((data as NcTemplate[] | null) ?? []));
  }, []);

  const companyName = useCallback(
    (id: string | null) =>
      companies.find((c) => c.id === id)?.name ?? 'empresa removida',
    [companies],
  );

  // Categorias que já existem nos modelos da org entram nas sugestões,
  // para a nutri não redigitar (nem divergir) o nome de uma seção.
  const categorySuggestions = useMemo(() => {
    const set = new Set<string>(RDC216_CATEGORIES);
    for (const t of templates) {
      for (const i of t.items ?? []) if (i.category) set.add(i.category);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [templates]);

  const { mine, official } = useMemo(() => {
    const m: AuditTemplate[] = [];
    const o: AuditTemplate[] = [];
    for (const t of templates) (t.is_global ? o : m).push(t);
    return { mine: m, official: o };
  }, [templates]);

  function openCreate() {
    setEditing(null);
    setName('');
    setScope('organization');
    setScopeCompanyId(companyId || companies[0]?.id || '');
    setItems([emptyDraft()]);
    setModalOpen(true);
  }

  function openEdit(t: AuditTemplate) {
    setEditing(t);
    setName(t.name);
    setScope(t.company_id ? 'company' : 'organization');
    setScopeCompanyId(t.company_id ?? companies[0]?.id ?? '');
    setItems(
      (t.items ?? []).length > 0 ? t.items.map(toDraft) : [emptyDraft()],
    );
    setModalOpen(true);
  }

  /** Cria uma cópia editável — de um modelo oficial ou de um da própria org. */
  async function handleDuplicate(t: AuditTemplate) {
    setBusyId(t.id);
    if (t.is_global) {
      const { error } = await supabase.rpc('clone_audit_template_to_org', {
        p_template_id: t.id,
      });
      setBusyId(null);
      if (error) {
        toast.error('Erro ao copiar: ' + error.message);
        return;
      }
      toast.success(`"${t.name}" copiado para a sua organização.`);
      void load();
      return;
    }
    const { error } = await supabase.from('audit_templates').insert({
      name: `${t.name} (cópia)`,
      items: t.items ?? [],
      company_id: t.company_id,
      organization_id: t.organization_id,
      is_global: false,
      active: true,
    });
    setBusyId(null);
    if (error) {
      toast.error('Erro ao duplicar: ' + error.message);
      return;
    }
    toast.success('Modelo duplicado.');
    void load();
  }

  async function handleToggleActive(t: AuditTemplate) {
    setBusyId(t.id);
    const { error } = await supabase
      .from('audit_templates')
      .update({ active: !t.active })
      .eq('id', t.id);
    setBusyId(null);
    if (error) {
      toast.error('Erro ao atualizar: ' + error.message);
      return;
    }
    toast.success(
      t.active
        ? 'Modelo desativado — não aparece mais ao agendar visita.'
        : 'Modelo reativado.',
    );
    void load();
  }

  async function handleSave() {
    if (!name.trim()) {
      toast.error('Dê um nome ao modelo.');
      return;
    }
    const cleaned: AuditItem[] = items
      .filter((i) => i.text.trim())
      .map((i) => ({
        id: i.id,
        category: i.category.trim() || 'Geral',
        text: i.text.trim(),
        weight: i.weight,
        ...(i.legal_ref.trim() ? { legal_ref: i.legal_ref.trim() } : {}),
        ...(i.ncTemplateId ? { nc_template_id: i.ncTemplateId } : {}),
      }));
    if (cleaned.length === 0) {
      toast.error('Adicione ao menos uma pergunta.');
      return;
    }
    if (scope === 'company' && !scopeCompanyId) {
      toast.error('Selecione a empresa do modelo.');
      return;
    }

    setSaving(true);
    const payload = {
      name: name.trim(),
      items: cleaned,
      company_id: scope === 'company' ? scopeCompanyId : null,
    };
    const { error } = editing
      ? await supabase
          .from('audit_templates')
          .update(payload)
          .eq('id', editing.id)
      : await supabase.from('audit_templates').insert({
          ...payload,
          is_global: false,
          active: true,
        });
    setSaving(false);
    if (error) {
      toast.error('Erro ao salvar: ' + error.message);
      return;
    }
    toast.success(editing ? 'Modelo atualizado.' : 'Modelo criado.');
    setModalOpen(false);
    void load();
  }

  async function handleDelete() {
    if (!deleting) return;
    setDeleteBusy(true);
    const { data, error } = await supabase
      .from('audit_templates')
      .delete()
      .eq('id', deleting.id)
      .select('id');
    setDeleteBusy(false);
    if (error) {
      // O trigger da 0102 bloqueia exclusão de modelo já usado em visita.
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

  function renderRow(t: AuditTemplate) {
    const kind = auditTemplateScope(t);
    const busy = busyId === t.id;
    const categories = new Set((t.items ?? []).map((i) => i.category));
    const canEdit = !t.is_global || isPlatformAdmin;
    return (
      <li
        key={t.id}
        className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-neutral-800 dark:text-neutral-100">
            <span className="truncate">{t.name}</span>
            {kind === 'global' ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                <Globe size={10} />
                Modelo oficial
              </span>
            ) : kind === 'organization' ? (
              <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                Toda a organização
              </span>
            ) : (
              <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                Só {companyName(t.company_id)}
              </span>
            )}
            {!t.active ? (
              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-950/40 dark:text-amber-200">
                Desativado
              </span>
            ) : null}
          </p>
          <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
            {(t.items ?? []).length} perguntas · {categories.size}{' '}
            {categories.size === 1 ? 'categoria' : 'categorias'}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-1">
          <button
            onClick={() => void handleDuplicate(t)}
            disabled={busy}
            title={
              t.is_global
                ? 'Criar uma cópia editável na sua organização'
                : 'Duplicar modelo'
            }
            className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 px-2.5 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
          >
            <Copy size={13} />
            {t.is_global ? 'Usar como modelo' : 'Duplicar'}
          </button>
          {canEdit ? (
            <>
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
                    ? 'Desativar — some do seletor ao agendar, histórico preservado'
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
            </>
          ) : null}
        </div>
      </li>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        to="/visitas"
        className="mb-2 inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-700 dark:text-neutral-400"
      >
        <ArrowLeft size={14} />
        Visitas técnicas
      </Link>

      <PageHeader
        title="Modelos de visita"
        subtitle="O roteiro que a equipe segue na inspeção: categorias, perguntas e peso de cada item. Um modelo da organização vale para todas as empresas."
        actions={
          <>
            <Button variant="secondary" onClick={() => setLibraryOpen(true)}>
              <BookOpen size={16} />
              Biblioteca
            </Button>
            <Button onClick={openCreate}>
              <Plus size={18} />
              Novo modelo
            </Button>
          </>
        }
      />

      <LibraryBrowser
        open={libraryOpen}
        onClose={() => setLibraryOpen(false)}
        kind="audit"
        companyId={companyId}
        onCloned={() => void load()}
      />

      {loading ? (
        <ListSkeleton rows={4} />
      ) : templates.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title="Nenhum modelo de visita ainda"
          description="Crie o roteiro da sua inspeção do zero ou comece a partir de um modelo oficial da biblioteca."
          action={
            <Button onClick={openCreate}>
              <Plus size={18} />
              Criar o primeiro modelo
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-4">
          <Card>
            <h2 className="mb-1 text-sm font-semibold text-neutral-700 dark:text-neutral-200">
              Meus modelos
            </h2>
            {mine.length === 0 ? (
              <p className="py-2 text-sm text-neutral-500 dark:text-neutral-400">
                Nenhum modelo próprio ainda. Copie um oficial abaixo ou crie do
                zero.
              </p>
            ) : (
              <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {mine.map(renderRow)}
              </ul>
            )}
          </Card>

          {official.length > 0 ? (
            <Card>
              <h2 className="mb-1 text-sm font-semibold text-neutral-700 dark:text-neutral-200">
                Modelos oficiais da plataforma
              </h2>
              <p className="mb-1 text-xs text-neutral-500 dark:text-neutral-400">
                Somente leitura. Use "Usar como modelo" para ter uma cópia
                editável na sua organização.
              </p>
              <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {official.map(renderRow)}
              </ul>
            </Card>
          ) : null}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Editar modelo' : 'Novo modelo de visita'}
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
            id="tpl-name"
            label="Nome do modelo"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex.: Visita técnica mensal — RDC 216"
          />

          {/* Modelo oficial da plataforma não tem dono — o escopo dele é
              fixo, então o seletor não aparece (o trigger da 0102 ignoraria
              a escolha de qualquer forma). */}
          <div
            className={
              editing?.is_global ? 'hidden' : 'grid gap-3 sm:grid-cols-2'
            }
          >
            <Select
              id="tpl-scope"
              label="Vale para"
              value={scope}
              onChange={(e) => setScope(e.target.value as ScopeChoice)}
            >
              <option value="organization">
                Todas as empresas da organização
              </option>
              <option value="company">Uma empresa específica</option>
            </Select>
            {scope === 'company' ? (
              <Select
                id="tpl-company"
                label="Empresa"
                value={scopeCompanyId}
                onChange={(e) => setScopeCompanyId(e.target.value)}
              >
                <option value="">Selecione…</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            ) : null}
          </div>

          <div>
            <div className="mb-2 flex items-baseline justify-between gap-2">
              <p className="text-sm font-medium text-neutral-700 dark:text-neutral-200">
                Perguntas
              </p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                O peso define o score e a gravidade da NC.
              </p>
            </div>

            <datalist id="tpl-categories">
              {categorySuggestions.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>

            <div className="flex flex-col gap-3">
              {items.map((it, i) => (
                <div
                  key={it.id}
                  className="rounded-lg border border-neutral-200 p-3 dark:border-neutral-700"
                >
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                      Item {i + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setItems((prev) => prev.filter((_, idx) => idx !== i))
                      }
                      disabled={items.length === 1}
                      aria-label="Remover pergunta"
                      className="rounded-lg p-1.5 text-red-500 hover:bg-red-50 disabled:opacity-30 dark:hover:bg-red-950/40"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                  <div className="flex flex-col gap-2">
                    <input
                      type="text"
                      list="tpl-categories"
                      value={it.category}
                      onChange={(e) =>
                        setItems((prev) =>
                          prev.map((p, idx) =>
                            idx === i ? { ...p, category: e.target.value } : p,
                          ),
                        )
                      }
                      placeholder="Categoria (ex.: Manipuladores)"
                      className="rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-800 focus:ring-2 focus:ring-neutral-800/20 dark:border-neutral-700 dark:bg-neutral-800"
                    />
                    <textarea
                      value={it.text}
                      onChange={(e) =>
                        setItems((prev) =>
                          prev.map((p, idx) =>
                            idx === i ? { ...p, text: e.target.value } : p,
                          ),
                        )
                      }
                      rows={2}
                      placeholder="O que será verificado (ex.: Manipuladores usam uniforme completo e limpo)"
                      className="rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-800 focus:ring-2 focus:ring-neutral-800/20 dark:border-neutral-700 dark:bg-neutral-800"
                    />
                    <div className="grid gap-2 sm:grid-cols-2">
                      <select
                        value={it.weight}
                        onChange={(e) =>
                          setItems((prev) =>
                            prev.map((p, idx) =>
                              idx === i
                                ? { ...p, weight: Number(e.target.value) }
                                : p,
                            ),
                          )
                        }
                        className="rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-800 dark:border-neutral-700 dark:bg-neutral-800"
                      >
                        {WEIGHTS.map((w) => (
                          <option key={w.value} value={w.value}>
                            Peso {w.label}
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        value={it.legal_ref}
                        onChange={(e) =>
                          setItems((prev) =>
                            prev.map((p, idx) =>
                              idx === i
                                ? { ...p, legal_ref: e.target.value }
                                : p,
                            ),
                          )
                        }
                        placeholder="Base legal (ex.: RDC 216 item 4.6.1)"
                        className="rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-800 dark:border-neutral-700 dark:bg-neutral-800"
                      />
                    </div>

                    {/* Plano de ação padrão: quando este item for reprovado
                        na visita, a NC nasce preenchida com este modelo em
                        vez de virar só o texto da pergunta. */}
                    <select
                      value={it.ncTemplateId}
                      onChange={(e) =>
                        setItems((prev) =>
                          prev.map((p, idx) =>
                            idx === i
                              ? { ...p, ncTemplateId: e.target.value }
                              : p,
                          ),
                        )
                      }
                      className="rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-800 dark:border-neutral-700 dark:bg-neutral-800"
                    >
                      <option value="">
                        Se reprovado: abrir NC só com o texto da pergunta
                      </option>
                      {ncTemplates.map((n) => (
                        <option key={n.id} value={n.id}>
                          Se reprovado: {n.name} (prazo {n.default_due_days}d)
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={() =>
                  setItems((prev) => [
                    ...prev,
                    // Herda a categoria do último item: montar uma seção
                    // inteira sem redigitar o nome dela a cada pergunta.
                    emptyDraft(prev[prev.length - 1]?.category ?? ''),
                  ])
                }
                className="self-start rounded-lg bg-neutral-100 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-200"
              >
                + Adicionar pergunta
              </button>
            </div>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={deleting !== null}
        title="Excluir modelo"
        message={`Excluir "${deleting?.name ?? ''}"? Modelos já usados em visitas não podem ser excluídos — nesse caso, desative-o.`}
        confirmLabel="Excluir"
        loading={deleteBusy}
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
