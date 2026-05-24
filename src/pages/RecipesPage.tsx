import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Printer, ChefHat } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { usePageTitle } from '@/lib/usePageTitle';
import { useAuth } from '@/context/AuthContext';
import { useCompanyScope } from '@/lib/useCompanyScope';
import type { Product, RecipeWithItems } from '@/lib/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Spinner } from '@/components/ui/Spinner';

interface ItemForm {
  product_id: string;
  quantity: string;
  unit: string;
}

function emptyItem(): ItemForm {
  return { product_id: '', quantity: '', unit: 'g' };
}

export function RecipesPage() {
  usePageTitle('Fichas tecnicas');
  const { profile } = useAuth();
  const { isMaster, companies, companyId, setCompanyId, companyName } =
    useCompanyScope();

  const [recipes, setRecipes] = useState<RecipeWithItems[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<RecipeWithItems | null>(null);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [yieldAmount, setYieldAmount] = useState('');
  const [prepTime, setPrepTime] = useState('');
  const [instructions, setInstructions] = useState('');
  const [active, setActive] = useState(true);
  const [items, setItems] = useState<ItemForm[]>([emptyItem()]);

  const [deleting, setDeleting] = useState<RecipeWithItems | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const [printing, setPrinting] = useState<RecipeWithItems | null>(null);

  const load = useCallback(async () => {
    if (!companyId) {
      setRecipes([]);
      setProducts([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const [recRes, prodRes] = await Promise.all([
      supabase
        .from('recipes')
        .select('*, recipe_items(*, product:products(name))')
        .eq('company_id', companyId)
        .order('name'),
      supabase
        .from('products')
        .select(
          'id, company_id, name, category, default_storage_condition, active, allergens, created_by, created_at, updated_at',
        )
        .eq('company_id', companyId)
        .eq('active', true)
        .order('name'),
    ]);
    setLoading(false);
    if (recRes.error) {
      toast.error('Erro ao carregar fichas: ' + recRes.error.message);
      return;
    }
    setRecipes((recRes.data as unknown as RecipeWithItems[] | null) ?? []);
    setProducts((prodRes.data as Product[] | null) ?? []);
  }, [companyId]);

  useEffect(() => {
    void load();
  }, [load]);

  function openCreate() {
    setEditing(null);
    setName('');
    setYieldAmount('');
    setPrepTime('');
    setInstructions('');
    setActive(true);
    setItems([emptyItem()]);
    setModalOpen(true);
  }

  function openEdit(r: RecipeWithItems) {
    setEditing(r);
    setName(r.name);
    setYieldAmount(r.yield_amount ?? '');
    setPrepTime(r.prep_time_minutes?.toString() ?? '');
    setInstructions(r.instructions ?? '');
    setActive(r.active);
    setItems(
      r.recipe_items.length > 0
        ? r.recipe_items
            .slice()
            .sort((a, b) => a.sort_order - b.sort_order)
            .map((i) => ({
              product_id: i.product_id,
              quantity: String(i.quantity),
              unit: i.unit,
            }))
        : [emptyItem()],
    );
    setModalOpen(true);
  }

  async function handleSave() {
    if (!name.trim()) {
      toast.error('Informe o nome da ficha.');
      return;
    }
    const validItems = items.filter((i) => i.product_id && i.quantity.trim());
    if (validItems.length === 0) {
      toast.error('Adicione ao menos um ingrediente.');
      return;
    }
    for (const it of validItems) {
      const q = Number(it.quantity);
      if (!Number.isFinite(q) || q <= 0) {
        toast.error('Quantidades devem ser maiores que zero.');
        return;
      }
    }

    setSaving(true);
    const prepMins = prepTime.trim() ? parseInt(prepTime, 10) : null;
    const payload = {
      name: name.trim(),
      yield_amount: yieldAmount.trim() || null,
      prep_time_minutes:
        prepMins !== null && Number.isFinite(prepMins) ? prepMins : null,
      instructions: instructions.trim() || null,
      active,
    };

    try {
      let recipeId = editing?.id;
      if (editing) {
        const { error } = await supabase
          .from('recipes')
          .update(payload)
          .eq('id', editing.id);
        if (error) throw error;
        // Replace items: simpler than diffing.
        const { error: delErr } = await supabase
          .from('recipe_items')
          .delete()
          .eq('recipe_id', editing.id);
        if (delErr) throw delErr;
      } else {
        const { data, error } = await supabase
          .from('recipes')
          .insert({
            ...payload,
            company_id: companyId,
            created_by: profile?.id ?? null,
          })
          .select('id')
          .single();
        if (error) throw error;
        recipeId = data.id;
      }

      const { error: insErr } = await supabase.from('recipe_items').insert(
        validItems.map((it, i) => ({
          recipe_id: recipeId!,
          product_id: it.product_id,
          quantity: Number(it.quantity),
          unit: it.unit.trim() || 'g',
          sort_order: i,
        })),
      );
      if (insErr) throw insErr;

      toast.success(editing ? 'Ficha atualizada.' : 'Ficha criada.');
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
    const { error } = await supabase
      .from('recipes')
      .delete()
      .eq('id', deleting.id);
    setDeleteBusy(false);
    if (error) {
      toast.error('Erro ao excluir: ' + error.message);
      return;
    }
    toast.success('Ficha excluída.');
    setDeleting(null);
    void load();
  }

  function handlePrintRecipe(r: RecipeWithItems) {
    setPrinting(r);
    // Aguarda o React aplicar o estado antes de chamar window.print.
    setTimeout(() => {
      window.print();
      setPrinting(null);
    }, 50);
  }

  const noCompany = isMaster && companies.length === 0;

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-neutral-800 sm:text-2xl">
            Fichas técnicas
          </h1>
          <p className="text-sm text-neutral-500">
            Padronize preparos com ingredientes e modo de preparo.
          </p>
        </div>
        <Button onClick={openCreate} disabled={!companyId}>
          <Plus size={18} />
          Nova ficha
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
      ) : recipes.length === 0 ? (
        <Card>
          <p className="text-sm text-neutral-600">
            Nenhuma ficha técnica ainda. Crie uma a partir dos produtos
            cadastrados.
          </p>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {recipes.map((r) => (
            <Card key={r.id}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5 text-sm font-semibold text-neutral-800 dark:text-neutral-200">
                    <ChefHat size={14} className="shrink-0 text-emerald-600" />
                    <span className="min-w-0 max-w-full truncate">
                      {r.name}
                    </span>
                    {!r.active ? (
                      <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-xs font-normal text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
                        inativo
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-xs text-neutral-500">
                    {r.recipe_items.length} ingrediente
                    {r.recipe_items.length === 1 ? '' : 's'}
                    {r.yield_amount ? ` · rende ${r.yield_amount}` : ''}
                    {r.prep_time_minutes ? ` · ${r.prep_time_minutes} min` : ''}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    onClick={() => handlePrintRecipe(r)}
                    aria-label="Imprimir"
                    className="rounded-lg p-1.5 text-emerald-600 hover:bg-emerald-50"
                  >
                    <Printer size={16} />
                  </button>
                  <button
                    onClick={() => openEdit(r)}
                    aria-label="Editar"
                    className="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-100"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => setDeleting(r)}
                    aria-label="Excluir"
                    className="rounded-lg p-1.5 text-red-500 hover:bg-red-50"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Editar ficha técnica' : 'Nova ficha técnica'}
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
            id="r-name"
            label="Nome do prato"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              id="r-yield"
              label="Rendimento (opcional)"
              value={yieldAmount}
              onChange={(e) => setYieldAmount(e.target.value)}
              placeholder="Ex.: 4 porções"
            />
            <Input
              id="r-time"
              label="Tempo de preparo em minutos"
              type="number"
              min={0}
              value={prepTime}
              onChange={(e) => setPrepTime(e.target.value)}
            />
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-neutral-700">
              Ingredientes
            </p>
            <div className="flex flex-col gap-2">
              {items.map((it, i) => (
                <div
                  key={i}
                  className="grid grid-cols-[1fr_70px_60px_auto] items-end gap-2"
                >
                  <Select
                    label={i === 0 ? 'Produto' : undefined}
                    value={it.product_id}
                    onChange={(e) =>
                      setItems((prev) =>
                        prev.map((p, idx) =>
                          idx === i ? { ...p, product_id: e.target.value } : p,
                        ),
                      )
                    }
                  >
                    <option value="">Selecione...</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </Select>
                  <Input
                    id={`r-qty-${i}`}
                    label={i === 0 ? 'Qtd' : undefined}
                    type="number"
                    step="0.001"
                    min={0}
                    value={it.quantity}
                    onChange={(e) =>
                      setItems((prev) =>
                        prev.map((p, idx) =>
                          idx === i ? { ...p, quantity: e.target.value } : p,
                        ),
                      )
                    }
                  />
                  <Input
                    id={`r-unit-${i}`}
                    label={i === 0 ? 'Un' : undefined}
                    value={it.unit}
                    onChange={(e) =>
                      setItems((prev) =>
                        prev.map((p, idx) =>
                          idx === i ? { ...p, unit: e.target.value } : p,
                        ),
                      )
                    }
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setItems((prev) => prev.filter((_, idx) => idx !== i))
                    }
                    disabled={items.length === 1}
                    className="mb-1 rounded-lg p-2 text-red-500 hover:bg-red-50 disabled:opacity-30"
                    aria-label="Remover ingrediente"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setItems((prev) => [...prev, emptyItem()])}
                className="self-start rounded-lg bg-neutral-100 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-200"
              >
                + Adicionar ingrediente
              </button>
            </div>
          </div>

          <div>
            <label
              htmlFor="r-instr"
              className="mb-1.5 block text-sm font-medium text-neutral-700"
            >
              Modo de preparo (opcional)
            </label>
            <textarea
              id="r-instr"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              rows={5}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-neutral-700">
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="h-4 w-4 accent-emerald-600"
            />
            Ficha ativa
          </label>
        </div>
      </Modal>

      <ConfirmDialog
        open={deleting !== null}
        title="Excluir ficha"
        message={`Tem certeza que deseja excluir "${deleting?.name}"?`}
        confirmLabel="Excluir"
        loading={deleteBusy}
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
      />

      {/* Area exclusiva de impressao da ficha. */}
      {printing ? (
        <div className="recipe-print-area absolute -left-[9999px] top-0 p-6 text-black">
          <h1 className="mb-1 text-2xl font-bold">{printing.name}</h1>
          <p className="mb-4 text-sm text-neutral-600">{companyName}</p>
          <div className="mb-4 grid grid-cols-2 gap-2 text-sm">
            {printing.yield_amount ? (
              <div>
                <strong>Rendimento:</strong> {printing.yield_amount}
              </div>
            ) : null}
            {printing.prep_time_minutes ? (
              <div>
                <strong>Tempo:</strong> {printing.prep_time_minutes} min
              </div>
            ) : null}
          </div>
          <h2 className="mb-2 text-lg font-semibold">Ingredientes</h2>
          <ul className="mb-4 ml-5 list-disc text-sm">
            {printing.recipe_items
              .slice()
              .sort((a, b) => a.sort_order - b.sort_order)
              .map((i) => (
                <li key={i.id}>
                  {i.quantity} {i.unit} —{' '}
                  {i.product?.name ?? 'Produto removido'}
                </li>
              ))}
          </ul>
          {printing.instructions ? (
            <>
              <h2 className="mb-2 text-lg font-semibold">Modo de preparo</h2>
              <p className="whitespace-pre-wrap text-sm">
                {printing.instructions}
              </p>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
