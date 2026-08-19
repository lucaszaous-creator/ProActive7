import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowLeft,
  BookOpen,
  ChevronDown,
  ChevronRight,
  ChevronUp,
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
  type AuditAnswerType,
  type AuditTemplate,
  type NcTemplate,
} from '@/lib/types';
import {
  ANSWER_TYPES,
  ANSWER_TYPE_HINT,
  ANSWER_TYPE_LABEL,
} from '@/lib/auditAnswers';
import {
  emptyItem,
  emptySection,
  findDuplicateSectionName,
  itemsToSections,
  moveInArray,
  sectionsToItems,
  type DraftItem,
  type DraftSection,
} from '@/lib/auditTemplateSections';
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

/** Faixa definida no rascunho do editor (campos ainda em texto). */
function hasDraftRange(item: DraftItem): boolean {
  return Boolean(item.min.trim() || item.max.trim());
}

export function AuditTemplatesPage() {
  usePageTitle('Modelos de vistoria');
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
  const [sections, setSections] = useState<DraftSection[]>([emptySection()]);

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
    setSections([emptySection()]);
    setModalOpen(true);
  }

  function openEdit(t: AuditTemplate) {
    setEditing(t);
    setName(t.name);
    setScope(t.company_id ? 'company' : 'organization');
    setScopeCompanyId(t.company_id ?? companies[0]?.id ?? '');
    setSections(itemsToSections(t.items ?? []));
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
    const cleaned = sectionsToItems(sections);
    if (cleaned.length === 0) {
      toast.error('Adicione ao menos uma pergunta.');
      return;
    }
    // Duas seções com o mesmo nome (ou ambas sem nome → "Geral") viram uma
    // só ao salvar — bloqueia para não juntar as perguntas em silêncio.
    const duplicated = findDuplicateSectionName(sections);
    if (duplicated) {
      toast.error(
        `Há mais de uma seção chamada "${duplicated}" — renomeie uma delas para não juntar as perguntas.`,
      );
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

  /* ------------------------------------------------------------------
   * Operações do editor modular (tudo em rascunho — só persiste no Salvar)
   * ---------------------------------------------------------------- */

  function patchSection(key: string, patch: Partial<DraftSection>) {
    setSections((prev) =>
      prev.map((s) => (s.key === key ? { ...s, ...patch } : s)),
    );
  }

  function patchItem(
    sectionKey: string,
    itemId: string,
    patch: Partial<DraftItem>,
  ) {
    setSections((prev) =>
      prev.map((s) =>
        s.key === sectionKey
          ? {
              ...s,
              items: s.items.map((i) =>
                i.id === itemId ? { ...i, ...patch } : i,
              ),
            }
          : s,
      ),
    );
  }

  function moveSection(index: number, delta: -1 | 1) {
    setSections((prev) => moveInArray(prev, index, index + delta));
  }

  function duplicateSection(index: number) {
    setSections((prev) => {
      const src = prev[index];
      // IDs novos: o id do item é a chave da resposta na visita — uma
      // pergunta duplicada precisa contar como pergunta nova.
      const copy: DraftSection = {
        key: crypto.randomUUID(),
        name: src.name ? `${src.name} (cópia)` : '',
        collapsed: false,
        items: src.items.map((i) => ({ ...i, id: crypto.randomUUID() })),
      };
      const next = [...prev];
      next.splice(index + 1, 0, copy);
      return next;
    });
  }

  function removeSection(key: string) {
    setSections((prev) => {
      const next = prev.filter((s) => s.key !== key);
      return next.length > 0 ? next : [emptySection()];
    });
  }

  function moveItem(sectionKey: string, index: number, delta: -1 | 1) {
    setSections((prev) =>
      prev.map((s) =>
        s.key === sectionKey
          ? { ...s, items: moveInArray(s.items, index, index + delta) }
          : s,
      ),
    );
  }

  function addItem(sectionKey: string) {
    setSections((prev) =>
      prev.map((s) =>
        s.key === sectionKey ? { ...s, items: [...s.items, emptyItem()] } : s,
      ),
    );
  }

  function removeItem(sectionKey: string, itemId: string) {
    setSections((prev) =>
      prev.map((s) =>
        s.key === sectionKey
          ? {
              ...s,
              items:
                s.items.length > 1
                  ? s.items.filter((i) => i.id !== itemId)
                  : s.items,
            }
          : s,
      ),
    );
  }

  // Conta só o que vai ser persistido: perguntas com texto e seções que
  // tenham ao menos uma pergunta válida (as vazias caem no salvar).
  const { totalQuestions, validSections } = useMemo(() => {
    let questions = 0;
    let secs = 0;
    for (const s of sections) {
      const valid = s.items.filter((i) => i.text.trim()).length;
      questions += valid;
      if (valid > 0) secs += 1;
    }
    return { totalQuestions: questions, validSections: secs };
  }, [sections]);

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
          <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-neutral-800">
            <span className="truncate">{t.name}</span>
            {kind === 'global' ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-600">
                <Globe size={10} />
                Modelo oficial
              </span>
            ) : kind === 'organization' ? (
              <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-600">
                Toda a organização
              </span>
            ) : (
              <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-600">
                Só {companyName(t.company_id)}
              </span>
            )}
            {!t.active ? (
              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                Desativado
              </span>
            ) : null}
          </p>
          <p className="mt-0.5 text-xs text-neutral-500">
            {(t.items ?? []).length} perguntas · {categories.size}{' '}
            {categories.size === 1 ? 'seção' : 'seções'}
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
            className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 px-2.5 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-50 disabled:opacity-50"
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
                className="rounded-lg p-2 text-neutral-500 hover:bg-neutral-100"
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
                className="rounded-lg p-2 text-neutral-500 hover:bg-neutral-100 disabled:opacity-50"
              >
                {t.active ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
              <button
                onClick={() => setDeleting(t)}
                aria-label="Excluir"
                title="Excluir"
                className="rounded-lg p-2 text-red-500 hover:bg-red-50"
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
        className="mb-2 inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-700"
      >
        <ArrowLeft size={14} />
        Visitas técnicas
      </Link>

      <PageHeader
        title="Modelos de vistoria"
        subtitle="Monte o checklist da sua vistoria em seções: renomeie, reordene e duplique módulos conforme a sua rotina. Um modelo da organização vale para todas as empresas."
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
          title="Nenhum modelo de vistoria ainda"
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
            <h2 className="mb-1 text-sm font-semibold text-neutral-700">
              Meus modelos
            </h2>
            {mine.length === 0 ? (
              <p className="py-2 text-sm text-neutral-500">
                Nenhum modelo próprio ainda. Copie um oficial abaixo ou crie do
                zero.
              </p>
            ) : (
              <ul className="divide-y divide-neutral-100">
                {mine.map(renderRow)}
              </ul>
            )}
          </Card>

          {official.length > 0 ? (
            <Card>
              <h2 className="mb-1 text-sm font-semibold text-neutral-700">
                Modelos oficiais da plataforma
              </h2>
              <p className="mb-1 text-xs text-neutral-500">
                Somente leitura. Use "Usar como modelo" para ter uma cópia
                editável na sua organização.
              </p>
              <ul className="divide-y divide-neutral-100">
                {official.map(renderRow)}
              </ul>
            </Card>
          ) : null}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Editar modelo' : 'Novo modelo de vistoria'}
        wide
        footer={
          <>
            <span className="mr-auto self-center text-xs text-neutral-500">
              {totalQuestions}{' '}
              {totalQuestions === 1 ? 'pergunta válida' : 'perguntas válidas'}{' '}
              em {validSections} {validSections === 1 ? 'seção' : 'seções'}
            </span>
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
            placeholder="Ex.: Vistoria mensal — RDC 216"
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
              <p className="text-sm font-medium text-neutral-700">
                Seções do checklist
              </p>
              <p className="text-xs text-neutral-500">
                O peso define o score e a gravidade da NC.
              </p>
            </div>

            <datalist id="tpl-categories">
              {categorySuggestions.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>

            <div className="flex flex-col gap-3">
              {sections.map((section, si) => (
                <div
                  key={section.key}
                  className="overflow-hidden rounded-xl border border-neutral-200"
                >
                  {/* Cabeçalho da seção: nome + controles do módulo */}
                  <div className="flex items-center gap-1.5 border-b border-neutral-200 bg-neutral-50 px-2 py-2">
                    <button
                      type="button"
                      onClick={() =>
                        patchSection(section.key, {
                          collapsed: !section.collapsed,
                        })
                      }
                      aria-label={
                        section.collapsed ? 'Expandir seção' : 'Recolher seção'
                      }
                      className="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-200"
                    >
                      {section.collapsed ? (
                        <ChevronRight size={15} />
                      ) : (
                        <ChevronDown size={15} />
                      )}
                    </button>
                    <input
                      type="text"
                      list="tpl-categories"
                      value={section.name}
                      onChange={(e) =>
                        patchSection(section.key, { name: e.target.value })
                      }
                      placeholder={`Seção ${si + 1} (ex.: Manipuladores)`}
                      className="min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-2 py-1.5 text-sm font-medium outline-none focus:border-neutral-400 focus:bg-white"
                    />
                    <span className="hidden shrink-0 text-[11px] text-neutral-400 sm:inline">
                      {section.items.length}{' '}
                      {section.items.length === 1 ? 'pergunta' : 'perguntas'}
                    </span>
                    <button
                      type="button"
                      onClick={() => moveSection(si, -1)}
                      disabled={si === 0}
                      aria-label="Mover seção para cima"
                      title="Mover seção para cima"
                      className="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-200 disabled:opacity-30"
                    >
                      <ChevronUp size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveSection(si, 1)}
                      disabled={si === sections.length - 1}
                      aria-label="Mover seção para baixo"
                      title="Mover seção para baixo"
                      className="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-200 disabled:opacity-30"
                    >
                      <ChevronDown size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => duplicateSection(si)}
                      aria-label="Duplicar seção"
                      title="Duplicar seção (perguntas viram cópias novas)"
                      className="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-200"
                    >
                      <Copy size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeSection(section.key)}
                      aria-label="Excluir seção"
                      title="Excluir seção e suas perguntas"
                      className="rounded-lg p-1.5 text-red-500 hover:bg-red-50"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  {!section.collapsed ? (
                    <div className="flex flex-col gap-3 p-3">
                      {section.items.map((it, ii) => (
                        <div
                          key={it.id}
                          className="rounded-lg border border-neutral-200 p-3"
                        >
                          <div className="mb-2 flex items-center justify-between gap-2">
                            <span className="text-xs font-medium text-neutral-500">
                              Pergunta {ii + 1}
                            </span>
                            <div className="flex gap-0.5">
                              <button
                                type="button"
                                onClick={() => moveItem(section.key, ii, -1)}
                                disabled={ii === 0}
                                aria-label="Mover pergunta para cima"
                                className="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-100 disabled:opacity-30"
                              >
                                <ChevronUp size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => moveItem(section.key, ii, 1)}
                                disabled={ii === section.items.length - 1}
                                aria-label="Mover pergunta para baixo"
                                className="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-100 disabled:opacity-30"
                              >
                                <ChevronDown size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => removeItem(section.key, it.id)}
                                disabled={section.items.length === 1}
                                aria-label="Remover pergunta"
                                className="rounded-lg p-1.5 text-red-500 hover:bg-red-50 disabled:opacity-30"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                          <div className="flex flex-col gap-2">
                            <textarea
                              value={it.text}
                              onChange={(e) =>
                                patchItem(section.key, it.id, {
                                  text: e.target.value,
                                })
                              }
                              rows={2}
                              placeholder="O que será verificado (ex.: Manipuladores usam uniforme completo e limpo)"
                              className="rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-800 focus:ring-2 focus:ring-neutral-800/20"
                            />
                            <div className="grid gap-2 sm:grid-cols-2">
                              <select
                                value={it.weight}
                                onChange={(e) =>
                                  patchItem(section.key, it.id, {
                                    weight: Number(e.target.value),
                                  })
                                }
                                className="rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-800"
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
                                  patchItem(section.key, it.id, {
                                    legal_ref: e.target.value,
                                  })
                                }
                                placeholder="Base legal (ex.: RDC 216 item 4.6.1)"
                                className="rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-800"
                              />
                            </div>

                            {/* Como a RT responde esta pergunta na visita.
                                Vive no JSONB do modelo — ver lib/auditAnswers. */}
                            <div className="grid gap-2 sm:grid-cols-2">
                              <select
                                value={it.answerType}
                                onChange={(e) =>
                                  patchItem(section.key, it.id, {
                                    answerType: e.target
                                      .value as AuditAnswerType,
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
                                  patchItem(section.key, it.id, {
                                    scaleMax: e.target.value,
                                  })
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
                                    patchItem(section.key, it.id, {
                                      unit: e.target.value,
                                    })
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
                                    patchItem(section.key, it.id, {
                                      min: e.target.value,
                                    })
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
                                    patchItem(section.key, it.id, {
                                      max: e.target.value,
                                    })
                                  }
                                  placeholder="Máximo aceitável"
                                  aria-label="Valor máximo aceitável"
                                  className="rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-800"
                                />
                              </div>
                            ) : null}

                            {it.answerType === 'measure' &&
                            !hasDraftRange(it) ? (
                              <p className="text-xs text-amber-600">
                                Sem faixa definida, o valor fica só registrado:
                                não pontua no score nem abre não-conformidade.
                              </p>
                            ) : null}

                            {/* Plano de ação padrão: quando este item for
                                reprovado na visita, a NC nasce preenchida com
                                este modelo em vez de só o texto da pergunta.
                                Só faz sentido em pergunta que pode reprovar. */}
                            {it.answerType === 'conformity' ||
                            it.answerType === 'measure' ? (
                              <select
                                value={it.ncTemplateId}
                                onChange={(e) =>
                                  patchItem(section.key, it.id, {
                                    ncTemplateId: e.target.value,
                                  })
                                }
                                className="rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-800"
                              >
                                <option value="">
                                  Se reprovado: abrir NC só com o texto da
                                  pergunta
                                </option>
                                {ncTemplates.map((n) => (
                                  <option key={n.id} value={n.id}>
                                    Se reprovado: {n.name} (prazo{' '}
                                    {n.default_due_days}d)
                                  </option>
                                ))}
                              </select>
                            ) : null}
                          </div>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => addItem(section.key)}
                        className="self-start rounded-lg bg-neutral-100 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-200"
                      >
                        + Adicionar pergunta
                      </button>
                    </div>
                  ) : null}
                </div>
              ))}

              <button
                type="button"
                onClick={() => setSections((prev) => [...prev, emptySection()])}
                className="self-start rounded-lg border border-dashed border-neutral-300 px-3 py-2 text-xs font-medium text-neutral-600 hover:border-neutral-500 hover:bg-neutral-50"
              >
                + Adicionar seção
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
