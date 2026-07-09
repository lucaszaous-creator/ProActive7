import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { toast } from 'sonner';
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  FileUp,
  Layers,
  ShieldAlert,
  AlertTriangle,
  PackageSearch,
  Package,
  CalendarCheck,
  CalendarX2,
  FolderTree,
  Download,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { softDelete } from '@/lib/supabaseHelpers';
import { usePageTitle } from '@/lib/usePageTitle';
import { useAuth } from '@/context/AuthContext';
import { useCompanyScope } from '@/lib/useCompanyScope';
import {
  LABEL_SIZE_LABELS,
  STORAGE_CONDITION_LABELS,
  VALIDITY_UNIT_LABELS,
  type LabelSizeId,
  type ProductShelfLife,
  type ProductWithShelfLives,
  type StorageCondition,
  type ValidityUnit,
} from '@/lib/types';
import { ALLERGENS } from '@/lib/allergens';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ListSkeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge } from '@/components/ui/Badge';
import { StatCard } from '@/components/ui/charts';
import { downloadCsv } from '@/lib/csv';
import { ProductCsvImport } from '@/components/ProductCsvImport';
import { LibraryBrowser } from '@/components/LibraryBrowser';
import { BookOpen } from 'lucide-react';

const CONDITIONS: StorageCondition[] = ['ambiente', 'refrigerado', 'congelado'];

const CONDITION_PILL: Record<StorageCondition, string> = {
  ambiente: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  refrigerado: 'bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300',
  congelado:
    'bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300',
};

interface GroupOption {
  id: string;
  name: string;
  color: string | null;
}

const GROUP_ALL = 'all';
const GROUP_NONE = 'none';

type QuickFilter = 'all' | 'no_shelf' | 'no_group';

function hasShelfLife(p: ProductWithShelfLives): boolean {
  return (p.product_shelf_lives?.length ?? 0) > 0;
}

function QuickFilterChip({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
        active
          ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900'
          : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700'
      }`}
    >
      {label}{' '}
      <span
        className={`tabular-nums text-xs ${
          active
            ? 'text-neutral-300 dark:text-neutral-600'
            : 'text-neutral-400 dark:text-neutral-500'
        }`}
      >
        {count}
      </span>
    </button>
  );
}

interface ShelfForm {
  value: string;
  unit: ValidityUnit;
}
type ShelfFormMap = Record<StorageCondition, ShelfForm>;

function emptyShelfMap(): ShelfFormMap {
  return {
    ambiente: { value: '', unit: 'days' },
    refrigerado: { value: '', unit: 'days' },
    congelado: { value: '', unit: 'days' },
  };
}

function shelfMapFrom(rows: ProductShelfLife[]): ShelfFormMap {
  const map = emptyShelfMap();
  for (const r of rows) {
    map[r.storage_condition] = {
      value: String(r.validity_value),
      unit: r.validity_unit,
    };
  }
  return map;
}

function GroupChip({
  label,
  count,
  color,
  active,
  onClick,
  icon,
}: {
  label: string;
  count: number;
  color?: string | null;
  active: boolean;
  onClick: () => void;
  icon?: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition ${
        active
          ? 'border-neutral-500 bg-neutral-50 font-medium text-neutral-700 dark:border-neutral-600 dark:bg-neutral-800/60 dark:text-neutral-300'
          : 'border-neutral-300 text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800'
      }`}
    >
      {icon ?? (
        <span
          className="h-2.5 w-2.5 rounded-full"
          style={{ backgroundColor: color ?? '#a3a3a3' }}
        />
      )}
      <span>{label}</span>
      <span
        className={`text-xs ${active ? 'text-neutral-600 dark:text-neutral-400' : 'text-neutral-400'}`}
      >
        {count}
      </span>
    </button>
  );
}

function ProductCard({
  product,
  group,
  onEdit,
  onDelete,
}: {
  product: ProductWithShelfLives;
  group?: GroupOption;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const rules = product.product_shelf_lives ?? [];
  const allergenCount = product.allergens?.length ?? 0;
  return (
    <div className="flex flex-col gap-2.5 rounded-xl border border-neutral-200 bg-white p-4 transition hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate font-medium text-neutral-800 dark:text-neutral-100">
            {product.name}
          </h3>
          {product.category ? (
            <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">
              {product.category}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 gap-1">
          <button
            onClick={onEdit}
            aria-label="Editar"
            title="Editar"
            className="rounded-lg p-2 text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
          >
            <Pencil size={16} />
          </button>
          <button
            onClick={onDelete}
            aria-label="Excluir"
            title="Excluir"
            className="rounded-lg p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {group ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: group.color ?? '#a3a3a3' }}
            />
            {group.name}
          </span>
        ) : null}
        {product.is_seed ? (
          <span className="rounded-full bg-neutral-50 px-2 py-0.5 text-[10px] font-medium text-neutral-700 dark:bg-neutral-800/60 dark:text-neutral-300">
            Seed
          </span>
        ) : null}
        {product.is_controlled ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-950 dark:text-amber-300">
            <ShieldAlert size={11} /> Controlado
          </span>
        ) : null}
        {!product.active ? (
          <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-500 dark:text-neutral-400 dark:bg-neutral-800">
            Inativo
          </span>
        ) : null}
      </div>

      <div className="mt-auto flex flex-wrap gap-1.5 pt-1">
        {rules.length === 0 ? (
          <Badge variant="warning" icon={AlertTriangle}>
            Sem validade
          </Badge>
        ) : (
          CONDITIONS.filter((c) =>
            rules.some((r) => r.storage_condition === c),
          ).map((c) => {
            const r = rules.find((x) => x.storage_condition === c)!;
            return (
              <span
                key={c}
                className={`rounded-md px-2 py-0.5 text-xs font-medium ${CONDITION_PILL[c]}`}
              >
                {STORAGE_CONDITION_LABELS[c]}: {r.validity_value}{' '}
                {VALIDITY_UNIT_LABELS[r.validity_unit]}
              </span>
            );
          })
        )}
      </div>

      {allergenCount > 0 ? (
        <p className="flex items-center gap-1 text-xs text-neutral-500 dark:text-neutral-400">
          <AlertTriangle size={12} className="text-amber-500" />
          Contém {allergenCount} alérgeno{allergenCount > 1 ? 's' : ''}
        </p>
      ) : null}
    </div>
  );
}

export function ProductsPage() {
  usePageTitle('Produtos');
  const { profile, isPlatformAdmin } = useAuth();
  const { isMaster, companies, companyId, setCompanyId } = useCompanyScope();

  const [products, setProducts] = useState<ProductWithShelfLives[]>([]);
  const [groups, setGroups] = useState<GroupOption[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ProductWithShelfLives | null>(null);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [groupId, setGroupId] = useState<string>('');
  const [isControlled, setIsControlled] = useState(false);
  const [defaultCondition, setDefaultCondition] =
    useState<StorageCondition>('refrigerado');
  const [active, setActive] = useState(true);
  const [allergens, setAllergens] = useState<string[]>([]);
  const [isSeed, setIsSeed] = useState(false);
  const [defaultLabelSize, setDefaultLabelSize] = useState<LabelSizeId | ''>(
    '',
  );
  const [shelf, setShelf] = useState<ShelfFormMap>(emptyShelfMap());

  const [deleting, setDeleting] = useState<ProductWithShelfLives | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const [search, setSearch] = useState('');
  const [groupFilter, setGroupFilter] = useState<string>(GROUP_ALL);
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('all');
  const [showInactive, setShowInactive] = useState(false);
  const [csvOpen, setCsvOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);

  const load = useCallback(async () => {
    if (!companyId) {
      setProducts([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const q = supabase.from('products').select('*, product_shelf_lives(*)');
    const { data, error } = await (isPlatformAdmin
      ? q.or(`company_id.eq.${companyId},is_seed.eq.true`).order('name')
      : q.eq('company_id', companyId).order('name'));
    setLoading(false);
    if (error) {
      toast.error('Erro ao carregar produtos: ' + error.message);
      return;
    }
    setProducts((data as ProductWithShelfLives[] | null) ?? []);
  }, [companyId, isPlatformAdmin]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    supabase
      .from('product_groups')
      .select('id, name, color')
      .eq('active', true)
      .order('sort_order')
      .order('name')
      .then(({ data }) => setGroups((data as GroupOption[] | null) ?? []));
  }, []);

  function openCreate() {
    setEditing(null);
    setName('');
    setCategory('');
    setGroupId('');
    setIsControlled(false);
    setDefaultCondition('refrigerado');
    setActive(true);
    setAllergens([]);
    setIsSeed(false);
    setDefaultLabelSize('');
    setShelf(emptyShelfMap());
    setModalOpen(true);
  }

  function openEdit(p: ProductWithShelfLives) {
    setEditing(p);
    setName(p.name);
    setCategory(p.category ?? '');
    setGroupId(p.group_id ?? '');
    setIsControlled(p.is_controlled ?? false);
    setDefaultCondition(p.default_storage_condition);
    setActive(p.active);
    setAllergens(p.allergens ?? []);
    setIsSeed(p.is_seed ?? false);
    setDefaultLabelSize(p.default_label_size ?? '');
    setShelf(shelfMapFrom(p.product_shelf_lives ?? []));
    setModalOpen(true);
  }

  async function handleSave() {
    if (!name.trim()) {
      toast.error('Informe o nome do produto.');
      return;
    }
    const makeSeed = isPlatformAdmin && isSeed;
    if (!companyId && !makeSeed) {
      toast.error('Selecione uma empresa.');
      return;
    }
    const invalidConds = CONDITIONS.filter((c) => {
      const raw = shelf[c].value.trim();
      if (!raw) return false;
      const num = Number(raw);
      return !Number.isFinite(num) || num <= 0;
    });
    if (invalidConds.length > 0) {
      toast.error(
        'Informe um valor de validade maior que zero ou deixe em branco a condição que não se aplica.',
      );
      return;
    }
    setSaving(true);
    try {
      let productId = editing?.id;
      if (editing) {
        const { error } = await supabase
          .from('products')
          .update({
            name: name.trim(),
            category: category.trim() || null,
            group_id: groupId || null,
            is_controlled: isControlled,
            default_storage_condition: defaultCondition,
            default_label_size: defaultLabelSize || null,
            active,
            allergens,
            ...(isPlatformAdmin
              ? { is_seed: isSeed, company_id: makeSeed ? null : companyId }
              : {}),
          })
          .eq('id', editing.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('products')
          .insert({
            company_id: makeSeed ? null : companyId,
            name: name.trim(),
            category: category.trim() || null,
            group_id: groupId || null,
            is_controlled: isControlled,
            default_storage_condition: defaultCondition,
            default_label_size: defaultLabelSize || null,
            active,
            allergens,
            ...(isPlatformAdmin ? { is_seed: isSeed } : {}),
            created_by: profile?.id ?? null,
          })
          .select('id')
          .single();
        if (error) throw error;
        productId = data.id;
      }

      for (const cond of CONDITIONS) {
        const raw = shelf[cond].value.trim();
        const num = Number(raw);
        if (raw && Number.isFinite(num) && num > 0) {
          const { error } = await supabase.from('product_shelf_lives').upsert(
            {
              product_id: productId,
              storage_condition: cond,
              validity_value: Math.round(num),
              validity_unit: shelf[cond].unit,
            },
            { onConflict: 'product_id,storage_condition' },
          );
          if (error) throw error;
        } else if (productId) {
          const { error } = await supabase
            .from('product_shelf_lives')
            .delete()
            .eq('product_id', productId)
            .eq('storage_condition', cond);
          if (error) throw error;
        }
      }

      toast.success(editing ? 'Produto atualizado.' : 'Produto criado.');
      setModalOpen(false);
      void load();
    } catch (e) {
      toast.error('Erro ao salvar: ' + (e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleting) return;
    setDeleteBusy(true);
    const err = await softDelete('products', deleting.id);
    setDeleteBusy(false);
    if (err) {
      toast.error(err);
      return;
    }
    toast.success('Produto movido para a lixeira.');
    setDeleting(null);
    void load();
  }

  const noCompany = isMaster && companies.length === 0;

  const groupMap = useMemo(() => {
    const m = new Map<string, GroupOption>();
    for (const g of groups) m.set(g.id, g);
    return m;
  }, [groups]);

  const searchTerm = search.trim().toLowerCase();

  // KPIs do catálogo (sobre tudo que foi carregado, antes dos filtros).
  const kpis = useMemo(() => {
    const total = products.length;
    const withShelf = products.filter(hasShelfLife).length;
    const groupsInUse = new Set(
      products.filter((p) => p.group_id).map((p) => p.group_id as string),
    ).size;
    return {
      total,
      withShelf,
      withoutShelf: total - withShelf,
      groupsInUse,
    };
  }, [products]);

  // Busca + status (sem os filtros de grupo/rápido) — base para contar.
  const baseFiltered = useMemo(
    () =>
      products.filter((p) => {
        if (!showInactive && !p.active) return false;
        if (!searchTerm) return true;
        return (
          p.name.toLowerCase().includes(searchTerm) ||
          (p.category ?? '').toLowerCase().includes(searchTerm)
        );
      }),
    [products, showInactive, searchTerm],
  );

  const quickCounts = useMemo(
    () => ({
      all: baseFiltered.length,
      noShelf: baseFiltered.filter((p) => !hasShelfLife(p)).length,
      noGroup: baseFiltered.filter((p) => !p.group_id).length,
    }),
    [baseFiltered],
  );

  const quickFiltered = useMemo(() => {
    if (quickFilter === 'no_shelf')
      return baseFiltered.filter((p) => !hasShelfLife(p));
    if (quickFilter === 'no_group')
      return baseFiltered.filter((p) => !p.group_id);
    return baseFiltered;
  }, [baseFiltered, quickFilter]);

  const groupCounts = useMemo(() => {
    const counts = new Map<string, number>();
    let none = 0;
    for (const p of quickFiltered) {
      if (p.group_id) counts.set(p.group_id, (counts.get(p.group_id) ?? 0) + 1);
      else none += 1;
    }
    return { counts, none, all: quickFiltered.length };
  }, [quickFiltered]);

  const filtered = useMemo(() => {
    if (groupFilter === GROUP_ALL) return quickFiltered;
    if (groupFilter === GROUP_NONE)
      return quickFiltered.filter((p) => !p.group_id);
    return quickFiltered.filter((p) => p.group_id === groupFilter);
  }, [quickFiltered, groupFilter]);

  function exportCsv() {
    downloadCsv(
      'produtos',
      ['Produto', 'Grupo', 'Prazos cadastrados'],
      products.map((p) => [
        p.name,
        p.group_id ? (groupMap.get(p.group_id)?.name ?? '') : '',
        (p.product_shelf_lives ?? [])
          .map(
            (r) =>
              `${STORAGE_CONDITION_LABELS[r.storage_condition]}: ${r.validity_value} ${VALIDITY_UNIT_LABELS[r.validity_unit]}`,
          )
          .join(' | '),
      ]),
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Produtos"
        subtitle="Cadastro de produtos e regras de validade."
        actions={
          <>
            <Button
              variant="secondary"
              onClick={exportCsv}
              disabled={products.length === 0}
            >
              <Download size={18} />
              Exportar CSV
            </Button>
            <Button
              variant="secondary"
              onClick={() => setLibraryOpen(true)}
              disabled={!companyId}
            >
              <BookOpen size={18} />
              Biblioteca
            </Button>
            <Button
              variant="secondary"
              onClick={() => setCsvOpen(true)}
              disabled={!companyId}
            >
              <FileUp size={18} />
              Importar CSV
            </Button>
            <Button onClick={openCreate} disabled={!companyId}>
              <Plus size={18} />
              Novo produto
            </Button>
          </>
        }
      />

      <LibraryBrowser
        open={libraryOpen}
        onClose={() => setLibraryOpen(false)}
        kind="product"
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
          <p className="text-sm text-neutral-600 dark:text-neutral-300">
            Nenhuma empresa cadastrada. Crie uma empresa em Empresas para
            começar.
          </p>
        </Card>
      ) : loading ? (
        <ListSkeleton rows={6} />
      ) : products.length === 0 ? (
        <EmptyState
          icon={PackageSearch}
          title="Nenhum produto cadastrado ainda"
          description="Cadastre seus produtos para gerar etiquetas de validade automaticamente, com os prazos da RDC 216."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button onClick={openCreate} disabled={!companyId}>
                <Plus size={18} />
                Novo produto
              </Button>
              <Button
                variant="secondary"
                onClick={() => setLibraryOpen(true)}
                disabled={!companyId}
              >
                <BookOpen size={18} />
                Clonar da biblioteca
              </Button>
            </div>
          }
        />
      ) : (
        <>
          {/* KPIs do catálogo */}
          <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              icon={<Package size={17} />}
              label="Total de produtos"
              value={kpis.total.toLocaleString('pt-BR')}
              tone="teal"
            />
            <StatCard
              icon={<CalendarCheck size={17} />}
              label="Com validade cadastrada"
              value={kpis.withShelf.toLocaleString('pt-BR')}
              tone="emerald"
              hint={
                kpis.total > 0
                  ? `${Math.round((kpis.withShelf / kpis.total) * 100)}% do catálogo`
                  : undefined
              }
            />
            <StatCard
              icon={<CalendarX2 size={17} />}
              label="Sem validade"
              value={kpis.withoutShelf.toLocaleString('pt-BR')}
              tone={kpis.withoutShelf > 0 ? 'amber' : 'neutral'}
              hint={
                kpis.withoutShelf > 0
                  ? 'etiqueta sem prazo automático'
                  : undefined
              }
            />
            <StatCard
              icon={<FolderTree size={17} />}
              label="Grupos em uso"
              value={kpis.groupsInUse.toLocaleString('pt-BR')}
              tone="blue"
            />
          </div>

          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative max-w-xs flex-1">
              <Search
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
              />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nome ou categoria"
                className="w-full rounded-lg border border-neutral-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-neutral-800 focus:ring-2 focus:ring-neutral-800/20 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
                className="h-5 w-5 accent-neutral-600"
              />
              Mostrar inativos
            </label>
          </div>

          {/* Filtros rápidos — pendências de cadastro */}
          <div className="mb-3 flex flex-wrap gap-2">
            <QuickFilterChip
              label="Todos"
              count={quickCounts.all}
              active={quickFilter === 'all'}
              onClick={() => setQuickFilter('all')}
            />
            <QuickFilterChip
              label="Sem validade"
              count={quickCounts.noShelf}
              active={quickFilter === 'no_shelf'}
              onClick={() => setQuickFilter('no_shelf')}
            />
            <QuickFilterChip
              label="Sem grupo"
              count={quickCounts.noGroup}
              active={quickFilter === 'no_group'}
              onClick={() => setQuickFilter('no_group')}
            />
          </div>

          {/* Filtro por grupo — chips coloridos para localizar rápido */}
          {groups.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-2">
              <GroupChip
                label="Todos"
                count={groupCounts.all}
                active={groupFilter === GROUP_ALL}
                onClick={() => setGroupFilter(GROUP_ALL)}
                icon={<Layers size={14} />}
              />
              {groups.map((g) => {
                const count = groupCounts.counts.get(g.id) ?? 0;
                return (
                  <GroupChip
                    key={g.id}
                    label={g.name}
                    count={count}
                    color={g.color}
                    active={groupFilter === g.id}
                    onClick={() => setGroupFilter(g.id)}
                  />
                );
              })}
              {groupCounts.none > 0 && (
                <GroupChip
                  label="Sem grupo"
                  count={groupCounts.none}
                  active={groupFilter === GROUP_NONE}
                  onClick={() => setGroupFilter(GROUP_NONE)}
                />
              )}
            </div>
          )}

          {/* Grid de cards responsivo */}
          {filtered.length === 0 ? (
            <Card>
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <PackageSearch size={28} className="text-neutral-400" />
                <p className="text-sm text-neutral-600 dark:text-neutral-300">
                  Nenhum produto corresponde ao filtro.
                </p>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((p) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  group={p.group_id ? groupMap.get(p.group_id) : undefined}
                  onEdit={() => openEdit(p)}
                  onDelete={() => setDeleting(p)}
                />
              ))}
            </div>
          )}
        </>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Editar produto' : 'Novo produto'}
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
            id="prod-name"
            label="Nome do produto"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex.: Molho de tomate"
          />
          <Input
            id="prod-cat"
            label="Categoria (texto livre, opcional)"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Ex.: Molhos"
          />
          <Select
            id="prod-group"
            label="Grupo"
            value={groupId}
            onChange={(e) => setGroupId(e.target.value)}
          >
            <option value="">Sem grupo</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </Select>
          <label className="flex items-start gap-2 rounded-lg border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/40 p-3 text-sm text-amber-900 dark:text-amber-200">
            <input
              type="checkbox"
              checked={isControlled}
              onChange={(e) => setIsControlled(e.target.checked)}
              className="mt-0.5 h-5 w-5 accent-amber-600"
            />
            <span>
              Produto controlado (saneante, químico, ou outro item que exige
              rastreio especial)
            </span>
          </label>
          <Select
            id="prod-cond"
            label="Condição padrão de armazenamento"
            value={defaultCondition}
            onChange={(e) =>
              setDefaultCondition(e.target.value as StorageCondition)
            }
          >
            {CONDITIONS.map((c) => (
              <option key={c} value={c}>
                {STORAGE_CONDITION_LABELS[c]}
              </option>
            ))}
          </Select>

          <div>
            <Select
              id="prod-label-size"
              label="Tamanho padrão da etiqueta"
              value={defaultLabelSize}
              onChange={(e) =>
                setDefaultLabelSize(e.target.value as LabelSizeId | '')
              }
            >
              <option value="">Padrão do sistema (60 × 60 mm)</option>
              {Object.entries(LABEL_SIZE_LABELS).map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </Select>
            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
              Aplicado automaticamente no wizard de impressão — o cozinheiro não
              escolhe.
            </p>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-neutral-700 dark:text-neutral-200">
              Validade após manipulação / abertura
            </p>
            <div className="flex flex-col gap-2">
              {CONDITIONS.map((c) => (
                <div
                  key={c}
                  className="grid grid-cols-[1fr_auto_auto] items-center gap-2"
                >
                  <span className="text-sm text-neutral-600 dark:text-neutral-300">
                    {STORAGE_CONDITION_LABELS[c]}
                  </span>
                  <input
                    type="number"
                    min={0}
                    inputMode="numeric"
                    placeholder="—"
                    value={shelf[c].value}
                    onChange={(e) =>
                      setShelf((prev) => ({
                        ...prev,
                        [c]: { ...prev[c], value: e.target.value },
                      }))
                    }
                    className="w-20 rounded-lg border border-neutral-300 dark:border-neutral-700 px-2 py-2 text-sm outline-none focus:border-neutral-800 focus:ring-2 focus:ring-neutral-800/20"
                  />
                  <select
                    value={shelf[c].unit}
                    onChange={(e) =>
                      setShelf((prev) => ({
                        ...prev,
                        [c]: {
                          ...prev[c],
                          unit: e.target.value as ValidityUnit,
                        },
                      }))
                    }
                    className="rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white px-2 py-2 text-sm outline-none focus:border-neutral-800"
                  >
                    <option value="days">dias</option>
                    <option value="hours">horas</option>
                  </select>
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs text-neutral-400">
              Deixe em branco a condição que não se aplica ao produto.
            </p>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-neutral-700 dark:text-neutral-200">
              Alergênicos (RDC 26/2015)
            </p>
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
              {ALLERGENS.map((a) => {
                const checked = allergens.includes(a.key);
                return (
                  <label
                    key={a.key}
                    className="flex items-start gap-1.5 text-xs text-neutral-700 dark:text-neutral-200"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) =>
                        setAllergens((prev) =>
                          e.target.checked
                            ? [...prev, a.key]
                            : prev.filter((k) => k !== a.key),
                        )
                      }
                      className="mt-0.5 h-3.5 w-3.5 accent-neutral-600"
                    />
                    {a.label}
                  </label>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-neutral-400">
              Selecione tudo que o produto contém. Os marcados aparecem na
              etiqueta como "Contém: ...".
            </p>
          </div>

          <label className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-200">
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="h-5 w-5 accent-neutral-600"
            />
            Produto ativo
          </label>

          {isPlatformAdmin ? (
            <label className="flex items-start gap-2 rounded-lg border border-neutral-200 bg-neutral-50 p-2 text-sm dark:border-neutral-900 dark:bg-neutral-800/60">
              <input
                type="checkbox"
                checked={isSeed}
                onChange={(e) => setIsSeed(e.target.checked)}
                className="mt-0.5 h-5 w-5 accent-neutral-600"
              />
              <span>
                <span className="font-medium text-neutral-700 dark:text-neutral-300">
                  Publicar no catálogo seed
                </span>
                <span className="block text-xs text-neutral-600 dark:text-neutral-400">
                  Visível para todas as orgs. Elas podem clonar com os prazos.
                </span>
              </span>
            </label>
          ) : null}
        </div>
      </Modal>

      <ConfirmDialog
        open={deleting !== null}
        title="Excluir produto"
        message={`Tem certeza que deseja excluir "${deleting?.name}"? As regras de validade também serão removidas.`}
        confirmLabel="Excluir"
        loading={deleteBusy}
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
      />

      {companyId ? (
        <ProductCsvImport
          open={csvOpen}
          onClose={() => setCsvOpen(false)}
          companyId={companyId}
          createdBy={profile?.id ?? null}
          onImported={() => void load()}
        />
      ) : null}
    </div>
  );
}
