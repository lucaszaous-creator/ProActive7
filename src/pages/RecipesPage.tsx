import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  ChefHat,
  ChevronDown,
  ChevronUp,
  Copy,
  Eye,
  EyeOff,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { usePageTitle } from '@/lib/usePageTitle';
import { useCompanyScope } from '@/lib/useCompanyScope';
import type { Product, RecipeWithItems } from '@/lib/types';
import {
  costPerPortionCents,
  formatBRL,
  grossQuantity,
  hasIncompleteCost,
  parseBRLToCents,
  perCapita,
  totalCostCents,
} from '@/lib/recipeCost';
import { moveInArray } from '@/lib/auditTemplateSections';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { ListSkeleton } from '@/components/ui/Skeleton';
import { PageHeader } from '@/components/ui/PageHeader';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

/** Unidades usadas na ficha — lista fechada (nada de digitar unidade). */
const UNITS = ['g', 'kg', 'ml', 'L', 'un'];

interface DraftItem {
  key: string;
  productId: string;
  quantity: string;
  unit: string;
  /** Fator de correção como texto, para não brigar com a vírgula. */
  fc: string;
  /** Custo digitado em reais; convertido para centavos ao salvar. */
  cost: string;
}

function emptyItem(): DraftItem {
  return {
    key: crypto.randomUUID(),
    productId: '',
    quantity: '',
    unit: 'g',
    fc: '1',
    cost: '',
  };
}

/** Aceita "1,25" e "1.25" nos campos numéricos livres. */
function parseDecimal(input: string): number | null {
  const raw = input.trim().replace(',', '.');
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export function RecipesPage() {
  usePageTitle('Fichas técnicas');
  const { companyId, isMaster, companies, setCompanyId } = useCompanyScope();

  const [recipes, setRecipes] = useState<RecipeWithItems[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [portions, setPortions] = useState('');
  const [portionGrams, setPortionGrams] = useState('');
  const [prepTime, setPrepTime] = useState('');
  const [instructions, setInstructions] = useState('');
  const [items, setItems] = useState<DraftItem[]>([emptyItem()]);

  const [deleting, setDeleting] = useState<RecipeWithItems | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!companyId) {
      setRecipes([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const [recipesRes, productsRes] = await Promise.all([
      supabase
        .from('recipes')
        .select('*, recipe_items(*, product:products(name))')
        .eq('company_id', companyId)
        .order('name')
        .limit(300),
      supabase
        .from('products')
        .select('*')
        .eq('company_id', companyId)
        .eq('active', true)
        .order('name')
        .limit(500),
    ]);
    setLoading(false);
    if (recipesRes.error) {
      toast.error('Erro ao carregar fichas: ' + recipesRes.error.message);
      return;
    }
    const rows = (recipesRes.data as RecipeWithItems[] | null) ?? [];
    // O embed não garante ordem dos itens; a ficha tem ordem de preparo.
    for (const r of rows) {
      r.recipe_items = (r.recipe_items ?? []).sort(
        (a, b) => a.sort_order - b.sort_order,
      );
    }
    setRecipes(rows);
    setProducts((productsRes.data as Product[] | null) ?? []);
  }, [companyId]);

  useEffect(() => {
    void load();
  }, [load]);

  const productName = useCallback(
    (id: string) =>
      products.find((p) => p.id === id)?.name ?? 'produto removido',
    [products],
  );

  function openCreate() {
    setEditingId(null);
    setName('');
    setPortions('');
    setPortionGrams('');
    setPrepTime('');
    setInstructions('');
    setItems([emptyItem()]);
    setModalOpen(true);
  }

  function openEdit(r: RecipeWithItems) {
    setEditingId(r.id);
    setName(r.name);
    setPortions(r.yield_portions != null ? String(r.yield_portions) : '');
    setPortionGrams(r.portion_grams != null ? String(r.portion_grams) : '');
    setPrepTime(r.prep_time_minutes != null ? String(r.prep_time_minutes) : '');
    setInstructions(r.instructions ?? '');
    setItems(
      (r.recipe_items ?? []).length > 0
        ? r.recipe_items.map((i) => ({
            key: i.id,
            productId: i.product_id,
            quantity: String(i.quantity),
            unit: i.unit,
            fc: String(i.correction_factor ?? 1),
            cost: i.cost_cents != null ? (i.cost_cents / 100).toFixed(2) : '',
          }))
        : [emptyItem()],
    );
    setModalOpen(true);
  }

  async function handleSave() {
    if (!companyId) {
      toast.error('Selecione uma empresa.');
      return;
    }
    if (!name.trim()) {
      toast.error('Dê um nome à ficha técnica.');
      return;
    }
    const filled = items.filter((i) => i.productId);
    if (filled.length === 0) {
      toast.error('Adicione ao menos um ingrediente.');
      return;
    }
    for (const i of filled) {
      const q = parseDecimal(i.quantity);
      if (q == null || q <= 0) {
        toast.error(
          `Informe a quantidade de "${productName(i.productId)}" (maior que zero).`,
        );
        return;
      }
      const fc = parseDecimal(i.fc);
      if (fc == null || fc <= 0) {
        toast.error(
          `Fator de correção inválido em "${productName(i.productId)}".`,
        );
        return;
      }
      if (i.cost.trim() && parseBRLToCents(i.cost) == null) {
        toast.error(`Custo inválido em "${productName(i.productId)}".`);
        return;
      }
    }
    const dupes = filled
      .map((i) => i.productId)
      .filter((id, idx, arr) => arr.indexOf(id) !== idx);
    if (dupes.length > 0) {
      toast.error(
        `"${productName(dupes[0])}" está repetido — some as quantidades numa linha só.`,
      );
      return;
    }

    setSaving(true);
    const payload = {
      company_id: companyId,
      name: name.trim(),
      yield_portions: portions.trim() ? Number(portions) : null,
      portion_grams: parseDecimal(portionGrams),
      prep_time_minutes: prepTime.trim() ? Number(prepTime) : null,
      instructions: instructions.trim() || null,
    };

    let recipeId = editingId;
    if (editingId) {
      const { error } = await supabase
        .from('recipes')
        .update(payload)
        .eq('id', editingId);
      if (error) {
        setSaving(false);
        toast.error('Erro ao salvar: ' + error.message);
        return;
      }
      // Regrava os itens: a ficha é editada como um bloco só.
      const { error: delErr } = await supabase
        .from('recipe_items')
        .delete()
        .eq('recipe_id', editingId);
      if (delErr) {
        setSaving(false);
        toast.error('Erro ao atualizar ingredientes: ' + delErr.message);
        return;
      }
    } else {
      const { data, error } = await supabase
        .from('recipes')
        .insert({ ...payload, active: true })
        .select('id')
        .single();
      if (error || !data) {
        setSaving(false);
        toast.error('Erro ao criar ficha: ' + (error?.message ?? ''));
        return;
      }
      recipeId = data.id;
    }

    const { error: itemsErr } = await supabase.from('recipe_items').insert(
      filled.map((i, idx) => ({
        recipe_id: recipeId,
        product_id: i.productId,
        quantity: parseDecimal(i.quantity),
        unit: i.unit,
        correction_factor: parseDecimal(i.fc) ?? 1,
        cost_cents: i.cost.trim() ? parseBRLToCents(i.cost) : null,
        sort_order: idx,
      })),
    );
    setSaving(false);
    if (itemsErr) {
      toast.error('Erro ao salvar ingredientes: ' + itemsErr.message);
      return;
    }
    toast.success(editingId ? 'Ficha atualizada.' : 'Ficha criada.');
    setModalOpen(false);
    void load();
  }

  async function handleToggleActive(r: RecipeWithItems) {
    setBusyId(r.id);
    const { error } = await supabase
      .from('recipes')
      .update({ active: !r.active })
      .eq('id', r.id);
    setBusyId(null);
    if (error) {
      toast.error('Erro ao atualizar: ' + error.message);
      return;
    }
    void load();
  }

  async function handleDuplicate(r: RecipeWithItems) {
    setBusyId(r.id);
    const { data, error } = await supabase
      .from('recipes')
      .insert({
        company_id: r.company_id,
        name: `${r.name} (cópia)`,
        yield_portions: r.yield_portions,
        portion_grams: r.portion_grams,
        prep_time_minutes: r.prep_time_minutes,
        instructions: r.instructions,
        active: true,
      })
      .select('id')
      .single();
    if (error || !data) {
      setBusyId(null);
      toast.error('Erro ao duplicar: ' + (error?.message ?? ''));
      return;
    }
    if ((r.recipe_items ?? []).length > 0) {
      const { error: itErr } = await supabase.from('recipe_items').insert(
        r.recipe_items.map((i, idx) => ({
          recipe_id: data.id,
          product_id: i.product_id,
          quantity: i.quantity,
          unit: i.unit,
          correction_factor: i.correction_factor ?? 1,
          cost_cents: i.cost_cents,
          sort_order: idx,
        })),
      );
      if (itErr) {
        setBusyId(null);
        toast.error(
          'Ficha copiada, mas os ingredientes falharam: ' + itErr.message,
        );
        void load();
        return;
      }
    }
    setBusyId(null);
    toast.success('Ficha duplicada.');
    void load();
  }

  async function handleDelete() {
    if (!deleting) return;
    setDeleteBusy(true);
    const { data, error } = await supabase
      .from('recipes')
      .delete()
      .eq('id', deleting.id)
      .select('id');
    setDeleteBusy(false);
    if (error) {
      toast.error('Erro ao excluir: ' + error.message);
      return;
    }
    if (!data || data.length === 0) {
      toast.error('Você não tem permissão para excluir esta ficha.');
      return;
    }
    toast.success('Ficha excluída.');
    setDeleting(null);
    void load();
  }

  /** Prévia de custo enquanto a nutri digita, no rodapé do editor. */
  const draftCost = useMemo(() => {
    const costables = items
      .filter((i) => i.productId)
      .map((i) => ({
        quantity: parseDecimal(i.quantity) ?? 0,
        correction_factor: parseDecimal(i.fc) ?? 1,
        cost_cents: i.cost.trim() ? parseBRLToCents(i.cost) : null,
      }));
    const p = portions.trim() ? Number(portions) : null;
    return {
      total: totalCostCents(costables),
      perPortion: costPerPortionCents(costables, p),
      incomplete: hasIncompleteCost(costables),
    };
  }, [items, portions]);

  if (isMaster && !companyId) {
    return (
      <div className="mx-auto max-w-4xl">
        <PageHeader
          title="Fichas técnicas"
          subtitle="Padronize o preparo: ingredientes, rendimento, per capita e custo por porção."
        />
        <Card>
          <p className="mb-3 text-sm text-neutral-600 dark:text-neutral-300">
            Selecione a empresa cuja ficha você quer montar.
          </p>
          <Select
            id="ficha-empresa"
            label="Empresa"
            value=""
            onChange={(e) => setCompanyId(e.target.value)}
          >
            <option value="">Selecione…</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Fichas técnicas"
        subtitle="Padronize o preparo: ingredientes, fator de correção, rendimento, per capita e custo por porção."
        actions={
          <Button onClick={openCreate} disabled={products.length === 0}>
            <Plus size={18} />
            Nova ficha
          </Button>
        }
      />

      {products.length === 0 && !loading ? (
        <Card className="mb-4 border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40">
          <p className="text-sm text-amber-800 dark:text-amber-200">
            Esta empresa ainda não tem produtos cadastrados. A ficha técnica
            monta os ingredientes a partir do cadastro de produtos — cadastre os
            produtos primeiro.
          </p>
        </Card>
      ) : null}

      {loading ? (
        <ListSkeleton rows={4} />
      ) : recipes.length === 0 ? (
        <EmptyState
          icon={ChefHat}
          title="Nenhuma ficha técnica ainda"
          description="A ficha padroniza o preparo e mostra quanto custa cada porção — é o documento que sustenta a padronização na cozinha."
          action={
            products.length > 0 ? (
              <Button onClick={openCreate}>
                <Plus size={18} />
                Criar a primeira ficha
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="flex flex-col gap-3">
          {recipes.map((r) => {
            const open = expanded === r.id;
            const total = totalCostCents(r.recipe_items ?? []);
            const perPortion = costPerPortionCents(
              r.recipe_items ?? [],
              r.yield_portions,
            );
            const incomplete = hasIncompleteCost(r.recipe_items ?? []);
            const busy = busyId === r.id;
            return (
              <Card key={r.id}>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <button
                    type="button"
                    onClick={() => setExpanded(open ? null : r.id)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-neutral-800 dark:text-neutral-100">
                      {r.name}
                      {!r.active ? (
                        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-950/40 dark:text-amber-200">
                          Inativa
                        </span>
                      ) : null}
                    </p>
                    <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                      {(r.recipe_items ?? []).length} ingrediente
                      {(r.recipe_items ?? []).length === 1 ? '' : 's'}
                      {r.yield_portions
                        ? ` · rende ${r.yield_portions} porç${r.yield_portions === 1 ? 'ão' : 'ões'}`
                        : ''}
                      {r.prep_time_minutes
                        ? ` · ${r.prep_time_minutes} min`
                        : ''}
                    </p>
                  </button>
                  <div className="flex shrink-0 flex-wrap items-center gap-1">
                    <div className="mr-2 text-right">
                      <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">
                        {perPortion != null
                          ? `${formatBRL(perPortion)}/porção`
                          : formatBRL(total)}
                      </p>
                      {incomplete ? (
                        <p className="text-[10px] text-amber-600 dark:text-amber-300">
                          custo incompleto
                        </p>
                      ) : null}
                    </div>
                    <button
                      onClick={() => setExpanded(open ? null : r.id)}
                      aria-label={open ? 'Recolher' : 'Ver ingredientes'}
                      className="rounded-lg p-2 text-neutral-500 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
                    >
                      {open ? (
                        <ChevronUp size={15} />
                      ) : (
                        <ChevronDown size={15} />
                      )}
                    </button>
                    <button
                      onClick={() => void handleDuplicate(r)}
                      disabled={busy}
                      aria-label="Duplicar"
                      title="Duplicar ficha"
                      className="rounded-lg p-2 text-neutral-500 hover:bg-neutral-100 disabled:opacity-50 dark:text-neutral-400 dark:hover:bg-neutral-800"
                    >
                      <Copy size={15} />
                    </button>
                    <button
                      onClick={() => openEdit(r)}
                      aria-label="Editar"
                      className="rounded-lg p-2 text-neutral-500 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={() => void handleToggleActive(r)}
                      disabled={busy}
                      aria-label={r.active ? 'Desativar' : 'Reativar'}
                      title={r.active ? 'Desativar ficha' : 'Reativar ficha'}
                      className="rounded-lg p-2 text-neutral-500 hover:bg-neutral-100 disabled:opacity-50 dark:text-neutral-400 dark:hover:bg-neutral-800"
                    >
                      {r.active ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                    <button
                      onClick={() => setDeleting(r)}
                      aria-label="Excluir"
                      className="rounded-lg p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                {open ? (
                  <div className="mt-3 border-t border-neutral-100 pt-3 dark:border-neutral-800">
                    <div className="w-full overflow-x-auto">
                      <table className="w-full min-w-[520px] text-xs">
                        <thead>
                          <tr className="text-left text-neutral-500 dark:text-neutral-400">
                            <th className="py-1 pr-2">Ingrediente</th>
                            <th className="py-1 pr-2">Líquido</th>
                            <th
                              className="py-1 pr-2"
                              title="Peso bruto a comprar (quantidade × fator de correção)"
                            >
                              Bruto
                            </th>
                            <th className="py-1 pr-2">Per capita</th>
                            <th className="py-1 pr-2 text-right">Custo</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(r.recipe_items ?? []).map((i) => {
                            const pc = perCapita(i, r.yield_portions);
                            return (
                              <tr
                                key={i.id}
                                className="border-t border-neutral-100 dark:border-neutral-800"
                              >
                                <td className="py-1.5 pr-2 text-neutral-800 dark:text-neutral-200">
                                  {i.product?.name ?? productName(i.product_id)}
                                </td>
                                <td className="py-1.5 pr-2 text-neutral-600 dark:text-neutral-300">
                                  {i.quantity} {i.unit}
                                </td>
                                <td className="py-1.5 pr-2 text-neutral-600 dark:text-neutral-300">
                                  {grossQuantity(i).toFixed(
                                    Number.isInteger(grossQuantity(i)) ? 0 : 2,
                                  )}{' '}
                                  {i.unit}
                                </td>
                                <td className="py-1.5 pr-2 text-neutral-600 dark:text-neutral-300">
                                  {pc != null
                                    ? `${pc.toFixed(pc < 10 ? 1 : 0)} ${i.unit}`
                                    : '—'}
                                </td>
                                <td className="py-1.5 pr-2 text-right text-neutral-600 dark:text-neutral-300">
                                  {formatBRL(i.cost_cents)}
                                </td>
                              </tr>
                            );
                          })}
                          <tr className="border-t border-neutral-200 font-semibold dark:border-neutral-700">
                            <td className="py-1.5 pr-2" colSpan={4}>
                              Total
                            </td>
                            <td className="py-1.5 pr-2 text-right">
                              {formatBRL(total)}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    {r.instructions ? (
                      <div className="mt-3">
                        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                          Modo de preparo
                        </p>
                        <p className="whitespace-pre-wrap text-sm text-neutral-700 dark:text-neutral-300">
                          {r.instructions}
                        </p>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Editar ficha técnica' : 'Nova ficha técnica'}
        wide
        footer={
          <>
            <span className="mr-auto self-center text-xs text-neutral-500 dark:text-neutral-400">
              Total {formatBRL(draftCost.total)}
              {draftCost.perPortion != null
                ? ` · ${formatBRL(draftCost.perPortion)}/porção`
                : ''}
              {draftCost.incomplete ? ' · custo incompleto' : ''}
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
            id="ficha-nome"
            label="Nome do prato"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex.: Arroz à grega"
          />
          <div className="grid gap-3 sm:grid-cols-3">
            <Input
              id="ficha-porcoes"
              label="Rende (porções)"
              type="number"
              min={1}
              value={portions}
              onChange={(e) => setPortions(e.target.value)}
              placeholder="Ex.: 50"
            />
            <Input
              id="ficha-porcao-g"
              label="Peso da porção (g)"
              value={portionGrams}
              onChange={(e) => setPortionGrams(e.target.value)}
              placeholder="Ex.: 120"
            />
            <Input
              id="ficha-tempo"
              label="Tempo de preparo (min)"
              type="number"
              min={0}
              value={prepTime}
              onChange={(e) => setPrepTime(e.target.value)}
              placeholder="Ex.: 45"
            />
          </div>

          <div>
            <div className="mb-2 flex items-baseline justify-between gap-2">
              <p className="text-sm font-medium text-neutral-700 dark:text-neutral-200">
                Ingredientes
              </p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                FC = peso bruto ÷ líquido. Custo é o desta ficha.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              {items.map((it, i) => (
                <div
                  key={it.key}
                  className="rounded-lg border border-neutral-200 p-2.5 dark:border-neutral-700"
                >
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                      {i + 1}
                    </span>
                    <div className="flex gap-0.5">
                      <button
                        type="button"
                        onClick={() =>
                          setItems((prev) => moveInArray(prev, i, i - 1))
                        }
                        disabled={i === 0}
                        aria-label="Mover para cima"
                        className="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-100 disabled:opacity-30 dark:text-neutral-400 dark:hover:bg-neutral-800"
                      >
                        <ChevronUp size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setItems((prev) => moveInArray(prev, i, i + 1))
                        }
                        disabled={i === items.length - 1}
                        aria-label="Mover para baixo"
                        className="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-100 disabled:opacity-30 dark:text-neutral-400 dark:hover:bg-neutral-800"
                      >
                        <ChevronDown size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setItems((prev) =>
                            prev.length > 1
                              ? prev.filter((_, idx) => idx !== i)
                              : prev,
                          )
                        }
                        disabled={items.length === 1}
                        aria-label="Remover ingrediente"
                        className="rounded-lg p-1.5 text-red-500 hover:bg-red-50 disabled:opacity-30 dark:hover:bg-red-950/40"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-[2fr_1fr_1fr_1fr_1.2fr]">
                    {/* Produto vem do cadastro — nada de digitar nome. */}
                    <select
                      value={it.productId}
                      onChange={(e) =>
                        setItems((prev) =>
                          prev.map((p, idx) =>
                            idx === i ? { ...p, productId: e.target.value } : p,
                          ),
                        )
                      }
                      className="rounded-lg border border-neutral-300 px-2 py-2 text-sm outline-none focus:border-neutral-800 dark:border-neutral-700 dark:bg-neutral-800"
                    >
                      <option value="">Ingrediente…</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={it.quantity}
                      onChange={(e) =>
                        setItems((prev) =>
                          prev.map((p, idx) =>
                            idx === i ? { ...p, quantity: e.target.value } : p,
                          ),
                        )
                      }
                      placeholder="Qtd."
                      className="rounded-lg border border-neutral-300 px-2 py-2 text-sm outline-none focus:border-neutral-800 dark:border-neutral-700 dark:bg-neutral-800"
                    />
                    <select
                      value={it.unit}
                      onChange={(e) =>
                        setItems((prev) =>
                          prev.map((p, idx) =>
                            idx === i ? { ...p, unit: e.target.value } : p,
                          ),
                        )
                      }
                      className="rounded-lg border border-neutral-300 px-2 py-2 text-sm outline-none focus:border-neutral-800 dark:border-neutral-700 dark:bg-neutral-800"
                    >
                      {UNITS.map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={it.fc}
                      onChange={(e) =>
                        setItems((prev) =>
                          prev.map((p, idx) =>
                            idx === i ? { ...p, fc: e.target.value } : p,
                          ),
                        )
                      }
                      title="Fator de correção: peso bruto ÷ peso líquido"
                      placeholder="FC"
                      className="rounded-lg border border-neutral-300 px-2 py-2 text-sm outline-none focus:border-neutral-800 dark:border-neutral-700 dark:bg-neutral-800"
                    />
                    <input
                      type="text"
                      inputMode="decimal"
                      value={it.cost}
                      onChange={(e) =>
                        setItems((prev) =>
                          prev.map((p, idx) =>
                            idx === i ? { ...p, cost: e.target.value } : p,
                          ),
                        )
                      }
                      placeholder="Custo R$"
                      className="rounded-lg border border-neutral-300 px-2 py-2 text-sm outline-none focus:border-neutral-800 dark:border-neutral-700 dark:bg-neutral-800"
                    />
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setItems((prev) => [...prev, emptyItem()])}
                className="self-start rounded-lg bg-neutral-100 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-200"
              >
                + Adicionar ingrediente
              </button>
            </div>
          </div>

          <div>
            <label
              htmlFor="ficha-preparo"
              className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-200"
            >
              Modo de preparo
            </label>
            <textarea
              id="ficha-preparo"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              rows={5}
              placeholder="Passo a passo do preparo, temperatura e ponto..."
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-800 focus:ring-2 focus:ring-neutral-800/20 dark:border-neutral-700 dark:bg-neutral-800"
            />
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={deleting !== null}
        title="Excluir ficha técnica"
        message={`Excluir "${deleting?.name ?? ''}"? Os ingredientes vinculados também serão removidos.`}
        confirmLabel="Excluir"
        loading={deleteBusy}
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
