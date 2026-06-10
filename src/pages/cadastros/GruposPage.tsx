import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  Plus,
  Pencil,
  Trash2,
  Tag,
  Tags,
  Package,
  PackageX,
  Crown,
  Download,
  Search,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { usePageTitle } from '@/lib/usePageTitle';
import { useAuth } from '@/context/AuthContext';
import { downloadCsv } from '@/lib/csv';
import type { ProductGroup } from '@/lib/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { DonutChart, StatCard } from '@/components/ui/charts';

const DEFAULT_COLORS = [
  '#ef4444',
  '#f59e0b',
  '#737373',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
  '#6b7280',
];

export function GruposPage() {
  usePageTitle('Grupos de produtos');
  const { profile, isPlatformAdmin, isNutritionist } = useAuth();
  const canEdit = isPlatformAdmin || isNutritionist;
  const [groups, setGroups] = useState<ProductGroup[]>([]);
  const [counts, setCounts] = useState<Map<string, number>>(new Map());
  const [ungrouped, setUngrouped] = useState(0);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ProductGroup | null>(null);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [color, setColor] = useState(DEFAULT_COLORS[0]);
  const [sortOrder, setSortOrder] = useState('0');
  const [active, setActive] = useState(true);

  const [deleting, setDeleting] = useState<ProductGroup | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('product_groups')
      .select('*')
      .order('sort_order')
      .order('name');
    setLoading(false);
    if (error) {
      toast.error('Erro ao carregar grupos: ' + error.message);
      return;
    }
    setGroups((data as ProductGroup[] | null) ?? []);

    // Contagem de produtos ativos por grupo (RLS limita ao escopo do usuário).
    const { data: prods } = await supabase
      .from('products')
      .select('id, group_id')
      .eq('active', true)
      .limit(10000);
    const tally = new Map<string, number>();
    let withoutGroup = 0;
    for (const p of (prods as { id: string; group_id: string | null }[] | null) ??
      []) {
      if (p.group_id) tally.set(p.group_id, (tally.get(p.group_id) ?? 0) + 1);
      else withoutGroup += 1;
    }
    setCounts(tally);
    setUngrouped(withoutGroup);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function openCreate() {
    setEditing(null);
    setName('');
    setColor(DEFAULT_COLORS[0]);
    setSortOrder('0');
    setActive(true);
    setModalOpen(true);
  }

  function openEdit(g: ProductGroup) {
    setEditing(g);
    setName(g.name);
    setColor(g.color ?? DEFAULT_COLORS[0]);
    setSortOrder(String(g.sort_order));
    setActive(g.active);
    setModalOpen(true);
  }

  async function handleSave() {
    if (!name.trim()) {
      toast.error('Informe o nome do grupo.');
      return;
    }
    if (!profile?.organization_id && !editing) {
      toast.error('Você precisa estar vinculado a uma organização.');
      return;
    }
    setSaving(true);
    const payload = {
      name: name.trim(),
      color,
      sort_order: Number(sortOrder) || 0,
      active,
    };
    const { error } = editing
      ? await supabase
          .from('product_groups')
          .update(payload)
          .eq('id', editing.id)
      : await supabase
          .from('product_groups')
          .insert({ ...payload, organization_id: profile!.organization_id });
    setSaving(false);
    if (error) {
      toast.error('Erro ao salvar: ' + error.message);
      return;
    }
    toast.success(editing ? 'Grupo atualizado.' : 'Grupo criado.');
    setModalOpen(false);
    void load();
  }

  async function handleDelete() {
    if (!deleting) return;
    const { error } = await supabase
      .from('product_groups')
      .delete()
      .eq('id', deleting.id);
    if (error) {
      toast.error('Erro ao excluir: ' + error.message);
      setDeleting(null);
      return;
    }
    toast.success('Grupo excluído.');
    setDeleting(null);
    void load();
  }

  const classified = useMemo(
    () => Array.from(counts.values()).reduce((s, n) => s + n, 0),
    [counts],
  );

  const biggest = useMemo(() => {
    let best: { name: string; count: number } | null = null;
    for (const g of groups) {
      const count = counts.get(g.id) ?? 0;
      if (count > 0 && (!best || count > best.count)) {
        best = { name: g.name, count };
      }
    }
    return best;
  }, [groups, counts]);

  const donutItems = useMemo(
    () =>
      groups
        .map((g) => ({ label: g.name, value: counts.get(g.id) ?? 0 }))
        .filter((i) => i.value > 0),
    [groups, counts],
  );

  const filteredGroups = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter((g) => g.name.toLowerCase().includes(q));
  }, [groups, search]);

  function exportCsv() {
    downloadCsv(
      'grupos-de-produtos',
      ['Grupo', 'Produtos'],
      groups.map((g) => [g.name, counts.get(g.id) ?? 0]),
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Grupos de produtos"
        subtitle="Categorias usadas no cadastro de produtos e na hora de imprimir etiqueta. Ex.: Carnes, Pescados, Vegetais."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={exportCsv}
              disabled={groups.length === 0}
            >
              <Download size={15} />
              Exportar CSV
            </Button>
            {canEdit && (
              <Button onClick={openCreate}>
                <Plus size={18} />
                Novo grupo
              </Button>
            )}
          </div>
        }
      />

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-8 w-8" />
        </div>
      ) : groups.length === 0 ? (
        <EmptyState
          icon={Tags}
          title="Nenhum grupo cadastrado"
          description='Grupos organizam o catálogo e aceleram a impressão de etiquetas. Comece criando "Carnes", "Pescados", "Vegetais"…'
          action={
            canEdit ? (
              <Button onClick={openCreate}>
                <Plus size={18} />
                Criar primeiro grupo
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="flex flex-col gap-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              icon={<Tags size={17} />}
              label="Total de grupos"
              value={groups.length}
              hint={
                groups.some((g) => !g.active)
                  ? `${groups.filter((g) => !g.active).length} inativo(s)`
                  : undefined
              }
              tone="teal"
            />
            <StatCard
              icon={<Package size={17} />}
              label="Produtos classificados"
              value={classified.toLocaleString('pt-BR')}
              tone="blue"
            />
            <StatCard
              icon={<PackageX size={17} />}
              label="Produtos sem grupo"
              value={ungrouped.toLocaleString('pt-BR')}
              hint={ungrouped > 0 ? 'classifique em Produtos' : undefined}
              tone={ungrouped > 0 ? 'amber' : 'emerald'}
            />
            <StatCard
              icon={<Crown size={17} />}
              label="Maior grupo"
              value={
                biggest ? biggest.count.toLocaleString('pt-BR') : '—'
              }
              hint={biggest ? biggest.name : 'nenhum produto vinculado'}
              tone="neutral"
            />
          </div>

          {donutItems.length > 0 && (
            <Card>
              <h2 className="mb-3 text-sm font-semibold text-neutral-700 dark:text-neutral-200">
                Distribuição de produtos por grupo
              </h2>
              <DonutChart
                items={donutItems}
                centerLabel="produtos"
                maxSlices={8}
              />
            </Card>
          )}

          {groups.length > 6 && (
            <div className="relative max-w-xs">
              <Search
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 dark:text-neutral-500"
              />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar grupo…"
                aria-label="Buscar grupo"
                className="w-full rounded-lg border border-neutral-200 bg-white py-2 pl-9 pr-3 text-sm text-neutral-800 placeholder:text-neutral-400 focus:border-neutral-400 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:placeholder:text-neutral-500 dark:focus:border-neutral-500"
              />
            </div>
          )}

          {filteredGroups.length === 0 ? (
            <Card>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                Nenhum grupo encontrado para "{search.trim()}".
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filteredGroups.map((g) => {
                const count = counts.get(g.id) ?? 0;
                return (
              <div
                key={g.id}
                className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white p-4 transition hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700"
              >
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white"
                  style={{ backgroundColor: g.color ?? '#6b7280' }}
                >
                  <Tag size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 truncate text-sm font-medium text-neutral-800 dark:text-neutral-100">
                    {g.name}
                    {!g.active && (
                      <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-normal text-neutral-500 dark:text-neutral-400 dark:bg-neutral-800">
                        inativo
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
                    <span
                      className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold tabular-nums ${
                        count > 0
                          ? 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200'
                          : 'bg-neutral-50 text-neutral-400 dark:bg-neutral-800/60 dark:text-neutral-500'
                      }`}
                    >
                      <Package size={11} />
                      {count} produto{count === 1 ? '' : 's'}
                    </span>
                    · ordem {g.sort_order}
                  </p>
                </div>
                {canEdit && (
                  <div className="flex shrink-0 gap-1">
                    <button
                      onClick={() => openEdit(g)}
                      aria-label="Editar"
                      title="Editar"
                      className="rounded-lg p-2 text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => setDeleting(g)}
                      aria-label="Excluir"
                      title="Excluir"
                      className="rounded-lg p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Editar grupo' : 'Novo grupo'}
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
            id="grp-name"
            label="Nome"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex.: Carnes"
          />
          <div>
            <p className="mb-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Cor
            </p>
            <div className="flex flex-wrap gap-2">
              {DEFAULT_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`h-9 w-9 rounded-lg ring-2 transition ${
                    color === c
                      ? 'ring-neutral-900 dark:ring-neutral-100'
                      : 'ring-transparent hover:ring-neutral-300'
                  }`}
                  style={{ backgroundColor: c }}
                  aria-label={c}
                />
              ))}
            </div>
          </div>
          <Input
            id="grp-order"
            label="Ordem de exibição"
            type="number"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
          />
          <label className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300">
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="h-5 w-5 accent-neutral-600"
            />
            Grupo ativo
          </label>
        </div>
      </Modal>

      <ConfirmDialog
        open={deleting !== null}
        title="Excluir grupo"
        message={`Excluir "${deleting?.name ?? ''}"? Produtos vinculados ficam sem grupo.`}
        confirmLabel="Excluir"
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
