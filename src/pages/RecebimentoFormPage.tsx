import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Plus, Trash2, ArrowLeft, ImagePlus } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { usePageTitle } from '@/lib/usePageTitle';
import { useAuth } from '@/context/AuthContext';
import { useCompanyScope } from '@/lib/useCompanyScope';
import { toLocalInputValue, computeExpiry } from '@/lib/dates';
import {
  RECEIVING_UNITS,
  STORAGE_CONDITION_LABELS,
  type ProductWithShelfLives,
  type ReceivingUnit,
  type StorageCondition,
  type Supplier,
} from '@/lib/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';

interface ItemDraft {
  key: string;
  product_id: string;
  batch: string;
  quantity: string;
  unit: ReceivingUnit;
  temp_at_arrival: string;
  manufacturing_date: string;
  expiry_date: string;
  storage_condition: StorageCondition | '';
  rejected: boolean;
  rejection_reason: string;
}

function emptyItem(): ItemDraft {
  return {
    key: crypto.randomUUID(),
    product_id: '',
    batch: '',
    quantity: '',
    unit: 'kg',
    temp_at_arrival: '',
    manufacturing_date: '',
    expiry_date: '',
    storage_condition: '',
    rejected: false,
    rejection_reason: '',
  };
}

const MAX_PHOTO = 10 * 1024 * 1024;

export function RecebimentoFormPage() {
  usePageTitle('Novo recebimento');
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { isMaster, companies, companyId, setCompanyId } = useCompanyScope();

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<ProductWithShelfLives[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [supplierId, setSupplierId] = useState('');
  const [invoiceNf, setInvoiceNf] = useState('');
  const [receivedLocal, setReceivedLocal] = useState(() =>
    toLocalInputValue(new Date()),
  );
  const [notes, setNotes] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  const [items, setItems] = useState<ItemDraft[]>([emptyItem()]);

  const [newSupOpen, setNewSupOpen] = useState(false);
  const [newSupName, setNewSupName] = useState('');
  const [newSupCnpj, setNewSupCnpj] = useState('');
  const [newSupSaving, setNewSupSaving] = useState(false);

  const load = useCallback(async () => {
    if (!companyId) {
      setProducts([]);
      setSuppliers([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const [supRes, prodRes] = await Promise.all([
      supabase.from('suppliers').select('*').eq('active', true).order('name'),
      supabase
        .from('products')
        .select('*, product_shelf_lives(*)')
        .eq('company_id', companyId)
        .eq('active', true)
        .order('name'),
    ]);
    setLoading(false);
    if (supRes.error) {
      toast.error('Erro ao carregar fornecedores: ' + supRes.error.message);
    }
    if (prodRes.error) {
      toast.error('Erro ao carregar produtos: ' + prodRes.error.message);
      return;
    }
    setSuppliers((supRes.data as Supplier[] | null) ?? []);
    setProducts((prodRes.data as ProductWithShelfLives[] | null) ?? []);
  }, [companyId]);

  useEffect(() => {
    void load();
  }, [load]);

  function updateItem(key: string, patch: Partial<ItemDraft>) {
    setItems((prev) =>
      prev.map((it) => (it.key === key ? { ...it, ...patch } : it)),
    );
  }

  function handleProductChange(itemKey: string, productId: string) {
    const product = products.find((p) => p.id === productId);
    if (!product) {
      updateItem(itemKey, { product_id: productId });
      return;
    }
    const cond = product.default_storage_condition;
    updateItem(itemKey, {
      product_id: productId,
      storage_condition: cond,
    });
    // Auto-cálculo da validade quando já existe data de fabricação
    autoComputeExpiry(itemKey, product, cond, undefined);
  }

  function autoComputeExpiry(
    itemKey: string,
    product: ProductWithShelfLives,
    cond: StorageCondition,
    manufactureOverride: string | undefined,
  ) {
    setItems((prev) =>
      prev.map((it) => {
        if (it.key !== itemKey) return it;
        const rule = product.product_shelf_lives.find(
          (r) => r.storage_condition === cond,
        );
        const manufactureStr = manufactureOverride ?? it.manufacturing_date;
        if (!rule || !manufactureStr) return it;
        const base = new Date(manufactureStr + 'T00:00:00');
        if (Number.isNaN(base.getTime())) return it;
        const exp = computeExpiry(
          base,
          rule.validity_value,
          rule.validity_unit,
        );
        const y = exp.getFullYear();
        const m = String(exp.getMonth() + 1).padStart(2, '0');
        const d = String(exp.getDate()).padStart(2, '0');
        return { ...it, expiry_date: `${y}-${m}-${d}` };
      }),
    );
  }

  function handleManufactureChange(itemKey: string, value: string) {
    const item = items.find((i) => i.key === itemKey);
    if (!item) return;
    const product = products.find((p) => p.id === item.product_id);
    if (product && item.storage_condition) {
      updateItem(itemKey, { manufacturing_date: value });
      autoComputeExpiry(
        itemKey,
        product,
        item.storage_condition as StorageCondition,
        value,
      );
    } else {
      updateItem(itemKey, { manufacturing_date: value });
    }
  }

  function handleStorageChange(itemKey: string, value: string) {
    const item = items.find((i) => i.key === itemKey);
    if (!item) return;
    const product = products.find((p) => p.id === item.product_id);
    const cond = value as StorageCondition;
    updateItem(itemKey, { storage_condition: cond });
    if (product) {
      autoComputeExpiry(itemKey, product, cond, undefined);
    }
  }

  function handlePhotoChange(file: File | null) {
    if (file && !file.type.startsWith('image/')) {
      toast.error('Selecione um arquivo de imagem.');
      return;
    }
    if (file && file.size > MAX_PHOTO) {
      toast.error('A imagem deve ter no máximo 10 MB.');
      return;
    }
    setPhotoFile(file);
  }

  async function handleNewSupplier() {
    if (!newSupName.trim()) {
      toast.error('Informe o nome.');
      return;
    }
    if (!profile?.organization_id) {
      toast.error('Você precisa estar vinculado a uma organização.');
      return;
    }
    setNewSupSaving(true);
    const { data, error } = await supabase
      .from('suppliers')
      .insert({
        name: newSupName.trim(),
        cnpj: newSupCnpj.trim() || null,
        organization_id: profile.organization_id,
      })
      .select()
      .single();
    setNewSupSaving(false);
    if (error) {
      toast.error('Erro ao criar fornecedor: ' + error.message);
      return;
    }
    const sup = data as Supplier;
    setSuppliers((prev) =>
      [...prev, sup].sort((a, b) => a.name.localeCompare(b.name)),
    );
    setSupplierId(sup.id);
    setNewSupOpen(false);
    setNewSupName('');
    setNewSupCnpj('');
  }

  async function uploadPhoto(): Promise<string | null> {
    if (!photoFile || !companyId) return null;
    const ext = photoFile.name.split('.').pop()?.toLowerCase() || 'jpg';
    const path = `${companyId}/${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from('photos')
      .upload(path, photoFile, { contentType: photoFile.type });
    if (upErr) throw upErr;
    const { data, error: insErr } = await supabase
      .from('photos')
      .insert({
        company_id: companyId,
        storage_path: path,
        original_name: photoFile.name,
        description: 'Recebimento — NF',
        uploaded_by: profile?.id ?? null,
      })
      .select('id')
      .single();
    if (insErr) throw insErr;
    return (data as { id: string }).id;
  }

  async function handleSave() {
    if (!companyId) {
      toast.error('Selecione uma empresa.');
      return;
    }
    const valid = items.filter((i) => i.product_id && i.batch && i.quantity);
    if (valid.length === 0) {
      toast.error('Adicione pelo menos um item válido (produto, lote, qtd).');
      return;
    }
    const receivedDate = new Date(receivedLocal);
    if (Number.isNaN(receivedDate.getTime())) {
      toast.error('Data de recebimento inválida.');
      return;
    }
    setSaving(true);
    try {
      const photoId = photoFile ? await uploadPhoto() : null;
      const { data: rec, error: recErr } = await supabase
        .from('receivings')
        .insert({
          company_id: companyId,
          supplier_id: supplierId || null,
          invoice_nf: invoiceNf.trim() || null,
          received_at: receivedDate.toISOString(),
          received_by: profile?.id ?? null,
          notes: notes.trim() || null,
          photo_id: photoId,
        })
        .select('id')
        .single();
      if (recErr) throw recErr;

      const itemsPayload = valid.map((it) => ({
        receiving_id: (rec as { id: string }).id,
        product_id: it.product_id,
        batch: it.batch.trim(),
        quantity: Number(it.quantity),
        unit: it.unit,
        temp_at_arrival: it.temp_at_arrival ? Number(it.temp_at_arrival) : null,
        manufacturing_date: it.manufacturing_date || null,
        expiry_date: it.expiry_date || null,
        storage_condition: it.storage_condition || null,
        rejected: it.rejected,
        rejection_reason: it.rejected
          ? it.rejection_reason.trim() || null
          : null,
      }));
      const { error: itemsErr } = await supabase
        .from('receiving_items')
        .insert(itemsPayload);
      if (itemsErr) throw itemsErr;

      toast.success('Recebimento registrado.');
      navigate(`/recebimentos/${(rec as { id: string }).id}`);
    } catch (e) {
      toast.error('Erro ao salvar: ' + (e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const noCompany = isMaster && companies.length === 0;

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-4">
        <Button variant="ghost" onClick={() => navigate('/recebimentos')}>
          <ArrowLeft size={18} />
          Voltar
        </Button>
      </div>
      <PageHeader
        title="Novo recebimento"
        subtitle="Registre a mercadoria que entrou: fornecedor, NF, itens, lote e temperatura."
      />

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
        <div className="flex flex-col gap-4">
          <Card>
            <h2 className="mb-3 text-sm font-semibold text-neutral-700">
              Cabeçalho
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {isMaster && companies.length > 0 && (
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
              )}
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <Select
                    label="Fornecedor"
                    value={supplierId}
                    onChange={(e) => setSupplierId(e.target.value)}
                  >
                    <option value="">Selecione...</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </Select>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setNewSupOpen(true)}
                >
                  Novo
                </Button>
              </div>
              <Input
                id="nf"
                label="Nota fiscal (opcional)"
                value={invoiceNf}
                onChange={(e) => setInvoiceNf(e.target.value)}
              />
              <Input
                id="received-at"
                label="Data e hora do recebimento"
                type="datetime-local"
                value={receivedLocal}
                onChange={(e) => setReceivedLocal(e.target.value)}
              />
              <Input
                id="notes"
                label="Observações"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
              <label className="flex flex-col gap-1.5 text-sm font-medium text-neutral-700">
                Foto da NF / mercadoria (opcional)
                <span className="flex items-center gap-2">
                  <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-50">
                    <ImagePlus size={14} />
                    {photoFile ? 'Trocar' : 'Anexar'}
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={(e) =>
                        handlePhotoChange(e.target.files?.[0] ?? null)
                      }
                    />
                  </label>
                  {photoFile && (
                    <span className="truncate text-xs text-neutral-500">
                      {photoFile.name}
                    </span>
                  )}
                </span>
              </label>
            </div>
          </Card>

          <Card>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-neutral-700">Itens</h2>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setItems((prev) => [...prev, emptyItem()])}
              >
                <Plus size={14} />
                Adicionar item
              </Button>
            </div>

            {products.length === 0 && (
              <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
                Esta empresa não tem produtos cadastrados. Cadastre em Produtos
                antes de registrar o recebimento.
              </p>
            )}

            <div className="flex flex-col gap-4">
              {items.map((it, idx) => {
                const product = products.find((p) => p.id === it.product_id);
                const hasRule = product?.product_shelf_lives.some(
                  (r) => r.storage_condition === it.storage_condition,
                );
                return (
                  <div
                    key={it.key}
                    className="rounded-lg border border-neutral-200 p-3"
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                        Item {idx + 1}
                      </span>
                      {items.length > 1 && (
                        <button
                          onClick={() =>
                            setItems((prev) =>
                              prev.filter((p) => p.key !== it.key),
                            )
                          }
                          className="rounded p-1 text-red-500 hover:bg-red-50"
                          aria-label="Remover item"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Select
                        label="Produto"
                        value={it.product_id}
                        onChange={(e) =>
                          handleProductChange(it.key, e.target.value)
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
                        id={`batch-${it.key}`}
                        label="Lote"
                        value={it.batch}
                        onChange={(e) =>
                          updateItem(it.key, { batch: e.target.value })
                        }
                        placeholder="Ex.: L-2026-05"
                      />
                      <div className="grid grid-cols-[1fr_auto] gap-2">
                        <Input
                          id={`qty-${it.key}`}
                          label="Quantidade"
                          type="number"
                          step="0.001"
                          min="0"
                          value={it.quantity}
                          onChange={(e) =>
                            updateItem(it.key, { quantity: e.target.value })
                          }
                        />
                        <Select
                          label="Un."
                          value={it.unit}
                          onChange={(e) =>
                            updateItem(it.key, {
                              unit: e.target.value as ReceivingUnit,
                            })
                          }
                        >
                          {RECEIVING_UNITS.map((u) => (
                            <option key={u} value={u}>
                              {u}
                            </option>
                          ))}
                        </Select>
                      </div>
                      <Input
                        id={`temp-${it.key}`}
                        label="Temperatura na chegada (°C)"
                        type="number"
                        step="0.1"
                        value={it.temp_at_arrival}
                        onChange={(e) =>
                          updateItem(it.key, {
                            temp_at_arrival: e.target.value,
                          })
                        }
                      />
                      <Select
                        label="Armazenamento"
                        value={it.storage_condition}
                        onChange={(e) =>
                          handleStorageChange(it.key, e.target.value)
                        }
                      >
                        <option value="">—</option>
                        {(
                          [
                            'ambiente',
                            'refrigerado',
                            'congelado',
                          ] as StorageCondition[]
                        ).map((c) => (
                          <option key={c} value={c}>
                            {STORAGE_CONDITION_LABELS[c]}
                          </option>
                        ))}
                      </Select>
                      <Input
                        id={`mfg-${it.key}`}
                        label="Fabricação"
                        type="date"
                        value={it.manufacturing_date}
                        onChange={(e) =>
                          handleManufactureChange(it.key, e.target.value)
                        }
                      />
                      <Input
                        id={`exp-${it.key}`}
                        label={
                          'Validade' + (product && hasRule ? ' (auto)' : '')
                        }
                        type="date"
                        value={it.expiry_date}
                        onChange={(e) =>
                          updateItem(it.key, { expiry_date: e.target.value })
                        }
                      />
                    </div>
                    <label className="mt-3 flex items-center gap-2 text-sm text-neutral-700">
                      <input
                        type="checkbox"
                        checked={it.rejected}
                        onChange={(e) =>
                          updateItem(it.key, { rejected: e.target.checked })
                        }
                        className="h-5 w-5 accent-red-600"
                      />
                      Rejeitar este item (não entra no estoque)
                    </label>
                    {it.rejected && (
                      <div className="mt-2">
                        <Input
                          id={`reason-${it.key}`}
                          label="Motivo da rejeição"
                          value={it.rejection_reason}
                          onChange={(e) =>
                            updateItem(it.key, {
                              rejection_reason: e.target.value,
                            })
                          }
                          placeholder="Ex.: Temperatura fora do limite, embalagem violada"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>

          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => navigate('/recebimentos')}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button onClick={handleSave} loading={saving}>
              Salvar recebimento
            </Button>
          </div>
        </div>
      )}

      <Modal
        open={newSupOpen}
        onClose={() => setNewSupOpen(false)}
        title="Novo fornecedor"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setNewSupOpen(false)}
              disabled={newSupSaving}
            >
              Cancelar
            </Button>
            <Button onClick={handleNewSupplier} loading={newSupSaving}>
              Criar
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <Input
            id="newsup-name"
            label="Nome / Razão social"
            value={newSupName}
            onChange={(e) => setNewSupName(e.target.value)}
          />
          <Input
            id="newsup-cnpj"
            label="CNPJ (opcional)"
            value={newSupCnpj}
            onChange={(e) => setNewSupCnpj(e.target.value)}
          />
        </div>
      </Modal>
    </div>
  );
}
