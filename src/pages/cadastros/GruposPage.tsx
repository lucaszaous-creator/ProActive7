import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Tag } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { usePageTitle } from '@/lib/usePageTitle';
import { useAuth } from '@/context/AuthContext';
import type { ProductGroup } from '@/lib/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

const DEFAULT_COLORS = [
  '#ef4444',
  '#f59e0b',
  '#10b981',
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

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-neutral-800 sm:text-2xl">
            Grupos de produtos
          </h1>
          <p className="text-sm text-neutral-500">
            Categorias usadas no cadastro de produtos e na hora de imprimir
            etiqueta. Ex.: Carnes, Pescados, Vegetais.
          </p>
        </div>
        {canEdit && (
          <Button onClick={openCreate}>
            <Plus size={18} />
            Novo grupo
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-8 w-8" />
        </div>
      ) : groups.length === 0 ? (
        <Card>
          <p className="text-sm text-neutral-500">
            Nenhum grupo cadastrado. Comece criando "Carnes", "Pescados",
            "Vegetais", etc.
          </p>
        </Card>
      ) : (
        <Card>
          <ul className="divide-y divide-neutral-100">
            {groups.map((g) => (
              <li key={g.id} className="flex items-center gap-3 py-3">
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white"
                  style={{ backgroundColor: g.color ?? '#6b7280' }}
                >
                  <Tag size={16} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-neutral-800">
                    {g.name}
                    {!g.active && (
                      <span className="ml-2 rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-normal text-neutral-500">
                        inativo
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-neutral-500">
                    Ordem {g.sort_order}
                  </p>
                </div>
                {canEdit && (
                  <>
                    <button
                      onClick={() => openEdit(g)}
                      aria-label="Editar"
                      className="rounded-lg p-2.5 text-neutral-500 hover:bg-neutral-100"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => setDeleting(g)}
                      aria-label="Excluir"
                      className="rounded-lg p-2.5 text-red-500 hover:bg-red-50"
                    >
                      <Trash2 size={16} />
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>
        </Card>
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
            <p className="mb-2 text-sm font-medium text-neutral-700">Cor</p>
            <div className="flex flex-wrap gap-2">
              {DEFAULT_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`h-9 w-9 rounded-lg ring-2 transition ${
                    color === c
                      ? 'ring-neutral-900'
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
          <label className="flex items-center gap-2 text-sm text-neutral-700">
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="h-5 w-5 accent-emerald-600"
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
