import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Search, FileUp } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { checkDeleteResult } from '@/lib/supabaseHelpers';
import { usePageTitle } from '@/lib/usePageTitle';
import { useAuth } from '@/context/AuthContext';
import { useCompanyScope } from '@/lib/useCompanyScope';
import {
  STORAGE_CONDITION_LABELS,
  VALIDITY_UNIT_LABELS,
  type ProductShelfLife,
  type ProductWithShelfLives,
  type StorageCondition,
  type ValidityUnit,
} from '@/lib/types';
import { ALLERGENS } from '@/lib/allergens';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Spinner } from '@/components/ui/Spinner';
import { ProductCsvImport } from '@/components/ProductCsvImport';

const CONDITIONS: StorageCondition[] = ['ambiente', 'refrigerado', 'congelado'];

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

function shelfSummary(rows: ProductShelfLife[]): string {
  if (rows.length === 0) return 'Sem regras de validade';
  return rows
    .map(
      (r) =>
        `${STORAGE_CONDITION_LABELS[r.storage_condition]}: ${r.validity_value} ${VALIDITY_UNIT_LABELS[r.validity_unit]}`,
    )
    .join(' · ');
}

export function ProductsPage() {
  usePageTitle('Produtos');
  const { profile } = useAuth();
  const { isMaster, companies, companyId, setCompanyId } = useCompanyScope();

  const [products, setProducts] = useState<ProductWithShelfLives[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ProductWithShelfLives | null>(null);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [defaultCondition, setDefaultCondition] =
    useState<StorageCondition>('refrigerado');
  const [active, setActive] = useState(true);
  const [allergens, setAllergens] = useState<string[]>([]);
  const [shelf, setShelf] = useState<ShelfFormMap>(emptyShelfMap());

  const [deleting, setDeleting] = useState<ProductWithShelfLives | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const [search, setSearch] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [csvOpen, setCsvOpen] = useState(false);

  const load = useCallback(async () => {
    if (!companyId) {
      setProducts([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('products')
      .select('*, product_shelf_lives(*)')
      .eq('company_id', companyId)
      .order('name');
    setLoading(false);
    if (error) {
      toast.error('Erro ao carregar produtos: ' + error.message);
      return;
    }
    setProducts((data as ProductWithShelfLives[] | null) ?? []);
  }, [companyId]);

  useEffect(() => {
    void load();
  }, [load]);

  function openCreate() {
    setEditing(null);
    setName('');
    setCategory('');
    setDefaultCondition('refrigerado');
    setActive(true);
    setAllergens([]);
    setShelf(emptyShelfMap());
    setModalOpen(true);
  }

  function openEdit(p: ProductWithShelfLives) {
    setEditing(p);
    setName(p.name);
    setCategory(p.category ?? '');
    setDefaultCondition(p.default_storage_condition);
    setActive(p.active);
    setAllergens(p.allergens ?? []);
    setShelf(shelfMapFrom(p.product_shelf_lives ?? []));
    setModalOpen(true);
  }

  async function handleSave() {
    if (!name.trim()) {
      toast.error('Informe o nome do produto.');
      return;
    }
    if (!companyId) {
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
            default_storage_condition: defaultCondition,
            active,
            allergens,
          })
          .eq('id', editing.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('products')
          .insert({
            company_id: companyId,
            name: name.trim(),
            category: category.trim() || null,
            default_storage_condition: defaultCondition,
            active,
            allergens,
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
    const result = await supabase
      .from('products')
      .delete()
      .eq('id', deleting.id)
      .select('id');
    setDeleteBusy(false);
    const err = checkDeleteResult(result);
    if (err) {
      toast.error(err);
      return;
    }
    toast.success('Produto excluído.');
    setDeleting(null);
    void load();
  }

  const noCompany = isMaster && companies.length === 0;

  const searchTerm = search.trim().toLowerCase();
  const filtered = products.filter((p) => {
    if (!showInactive && !p.active) return false;
    if (!searchTerm) return true;
    return (
      p.name.toLowerCase().includes(searchTerm) ||
      (p.category ?? '').toLowerCase().includes(searchTerm)
    );
  });

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-neutral-800 sm:text-2xl">
            Produtos
          </h1>
          <p className="text-sm text-neutral-500">
            Cadastro de produtos e regras de validade.
          </p>
        </div>
        <div className="flex gap-2">
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
        </div>
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
            Nenhuma empresa cadastrada. Crie uma empresa em Empresas para
            começar.
          </p>
        </Card>
      ) : loading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-8 w-8" />
        </div>
      ) : products.length === 0 ? (
        <Card>
          <p className="text-sm text-neutral-600">
            Nenhum produto cadastrado ainda.
          </p>
        </Card>
      ) : (
        <>
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
                className="w-full rounded-lg border border-neutral-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-neutral-700">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
                className="h-5 w-5 accent-emerald-600"
              />
              Mostrar inativos
            </label>
          </div>
        </>
      )}
      {!noCompany && !loading && products.length > 0 && (
        <Card className="!p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-left text-xs uppercase text-neutral-500">
                  <th className="px-4 py-3">Produto</th>
                  <th className="px-4 py-3">Categoria</th>
                  <th className="px-4 py-3">Regras de validade</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-8 text-center text-sm text-neutral-500"
                    >
                      Nenhum produto corresponde ao filtro.
                    </td>
                  </tr>
                ) : null}
                {filtered.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b border-neutral-100 last:border-0"
                  >
                    <td className="px-4 py-3 font-medium text-neutral-800">
                      {p.name}
                    </td>
                    <td className="px-4 py-3 text-neutral-600">
                      {p.category ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-neutral-600">
                      {shelfSummary(p.product_shelf_lives ?? [])}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs ${
                          p.active
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-neutral-100 text-neutral-500'
                        }`}
                      >
                        {p.active ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => openEdit(p)}
                          aria-label="Editar"
                          className="rounded-lg p-2.5 text-neutral-500 hover:bg-neutral-100"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => setDeleting(p)}
                          aria-label="Excluir"
                          className="rounded-lg p-2.5 text-red-500 hover:bg-red-50"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
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
            label="Categoria (opcional)"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Ex.: Molhos"
          />
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
            <p className="mb-2 text-sm font-medium text-neutral-700">
              Validade após manipulação / abertura
            </p>
            <div className="flex flex-col gap-2">
              {CONDITIONS.map((c) => (
                <div
                  key={c}
                  className="grid grid-cols-[1fr_auto_auto] items-center gap-2"
                >
                  <span className="text-sm text-neutral-600">
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
                    className="w-20 rounded-lg border border-neutral-300 px-2 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
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
                    className="rounded-lg border border-neutral-300 bg-white px-2 py-2 text-sm outline-none focus:border-emerald-500"
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
            <p className="mb-2 text-sm font-medium text-neutral-700">
              Alergênicos (RDC 26/2015)
            </p>
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
              {ALLERGENS.map((a) => {
                const checked = allergens.includes(a.key);
                return (
                  <label
                    key={a.key}
                    className="flex items-start gap-1.5 text-xs text-neutral-700"
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
                      className="mt-0.5 h-3.5 w-3.5 accent-emerald-600"
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

          <label className="flex items-center gap-2 text-sm text-neutral-700">
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="h-5 w-5 accent-emerald-600"
            />
            Produto ativo
          </label>
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
