import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Truck } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { usePageTitle } from '@/lib/usePageTitle';
import { useAuth } from '@/context/AuthContext';
import type { Supplier } from '@/lib/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

export function SuppliersPage() {
  usePageTitle('Fornecedores');
  const { profile } = useAuth();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [active, setActive] = useState(true);

  const [deleting, setDeleting] = useState<Supplier | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .order('name');
    setLoading(false);
    if (error) {
      toast.error('Erro ao carregar fornecedores: ' + error.message);
      return;
    }
    setSuppliers((data as Supplier[] | null) ?? []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function openCreate() {
    setEditing(null);
    setName('');
    setCnpj('');
    setEmail('');
    setPhone('');
    setNotes('');
    setActive(true);
    setModalOpen(true);
  }

  function openEdit(s: Supplier) {
    setEditing(s);
    setName(s.name);
    setCnpj(s.cnpj ?? '');
    setEmail(s.email ?? '');
    setPhone(s.phone ?? '');
    setNotes(s.notes ?? '');
    setActive(s.active);
    setModalOpen(true);
  }

  async function handleSave() {
    if (!name.trim()) {
      toast.error('Informe o nome do fornecedor.');
      return;
    }
    if (!profile?.organization_id && !editing) {
      toast.error('Você precisa estar vinculado a uma organização.');
      return;
    }
    setSaving(true);
    const payload = {
      name: name.trim(),
      cnpj: cnpj.trim() || null,
      email: email.trim() || null,
      phone: phone.trim() || null,
      notes: notes.trim() || null,
      active,
    };
    const { error } = editing
      ? await supabase.from('suppliers').update(payload).eq('id', editing.id)
      : await supabase
          .from('suppliers')
          .insert({ ...payload, organization_id: profile!.organization_id });
    setSaving(false);
    if (error) {
      toast.error('Erro ao salvar: ' + error.message);
      return;
    }
    toast.success(editing ? 'Fornecedor atualizado.' : 'Fornecedor criado.');
    setModalOpen(false);
    void load();
  }

  async function handleDelete() {
    if (!deleting) return;
    const { error } = await supabase
      .from('suppliers')
      .delete()
      .eq('id', deleting.id);
    if (error) {
      // FK restrict pode bloquear se houver receivings vinculados
      toast.error(
        'Erro ao excluir: ' +
          (/violates foreign key/i.test(error.message)
            ? 'Há recebimentos vinculados a este fornecedor. Inative-o em vez de excluir.'
            : error.message),
      );
      setDeleting(null);
      return;
    }
    toast.success('Fornecedor excluído.');
    setDeleting(null);
    void load();
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-neutral-800 sm:text-2xl">
            Fornecedores
          </h1>
          <p className="text-sm text-neutral-500">
            Cadastro central dos fornecedores que entregam mercadoria nas
            cozinhas.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus size={18} />
          Novo fornecedor
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-8 w-8" />
        </div>
      ) : suppliers.length === 0 ? (
        <Card>
          <p className="text-sm text-neutral-500">
            Nenhum fornecedor cadastrado ainda.
          </p>
        </Card>
      ) : (
        <Card>
          <ul className="divide-y divide-neutral-100">
            {suppliers.map((s) => (
              <li key={s.id} className="flex items-center gap-3 py-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-neutral-50 text-neutral-600">
                  <Truck size={16} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-neutral-800">
                    {s.name}
                    {!s.active && (
                      <span className="ml-2 rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-normal text-neutral-500">
                        inativo
                      </span>
                    )}
                  </p>
                  <p className="truncate text-xs text-neutral-500">
                    {[s.cnpj, s.phone, s.email].filter(Boolean).join(' · ') ||
                      '—'}
                  </p>
                </div>
                <button
                  onClick={() => openEdit(s)}
                  aria-label="Editar"
                  className="rounded-lg p-2.5 text-neutral-500 hover:bg-neutral-100"
                >
                  <Pencil size={16} />
                </button>
                <button
                  onClick={() => setDeleting(s)}
                  aria-label="Excluir"
                  className="rounded-lg p-2.5 text-red-500 hover:bg-red-50"
                >
                  <Trash2 size={16} />
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Editar fornecedor' : 'Novo fornecedor'}
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
            id="sup-name"
            label="Nome / Razão social"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex.: Hortifruti Central LTDA"
          />
          <Input
            id="sup-cnpj"
            label="CNPJ (opcional)"
            value={cnpj}
            onChange={(e) => setCnpj(e.target.value)}
            placeholder="00.000.000/0000-00"
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              id="sup-phone"
              label="Telefone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <Input
              id="sup-email"
              label="E-mail"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <Input
            id="sup-notes"
            label="Observações"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <label className="flex items-center gap-2 text-sm text-neutral-700">
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="h-5 w-5 accent-neutral-600"
            />
            Fornecedor ativo
          </label>
        </div>
      </Modal>

      <ConfirmDialog
        open={deleting !== null}
        title="Excluir fornecedor"
        message={`Excluir "${deleting?.name ?? ''}"? Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
