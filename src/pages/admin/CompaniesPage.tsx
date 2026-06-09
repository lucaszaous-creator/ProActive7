import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  Plus,
  Pencil,
  Trash2,
  Upload,
  ImageOff,
  Search,
  X,
  ShieldCheck,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { softDelete } from '@/lib/supabaseHelpers';
import { useAuth } from '@/context/AuthContext';
import type { Company } from '@/lib/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ListSkeleton } from '@/components/ui/Skeleton';

interface CompanyRow extends Company {
  organizations: {
    name: string | null;
    owner: { full_name: string | null; email: string | null } | null;
  } | null;
}

export function CompaniesPage() {
  const { profile, subscription, isPlatformAdmin } = useAuth();
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Company | null>(null);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [active, setActive] = useState(true);
  const [logoPath, setLogoPath] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [primaryColor, setPrimaryColor] = useState('');

  const [deleting, setDeleting] = useState<Company | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const [search, setSearch] = useState('');
  const filteredCompanies = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return companies;
    return companies.filter((c) => {
      const haystack = [
        c.name,
        c.cnpj,
        c.phone,
        c.address,
        c.organizations?.name,
        c.organizations?.owner?.full_name,
        c.organizations?.owner?.email,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [companies, search]);

  const activeCompanyCount = useMemo(
    () => companies.filter((c) => c.active).length,
    [companies],
  );
  const companyLimit = subscription?.company_limit ?? null;
  const atLimit =
    !isPlatformAdmin &&
    companyLimit != null &&
    activeCompanyCount >= companyLimit;

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('companies')
      .select(
        '*, organizations(name, owner:profiles!organizations_owner_profile_fkey(full_name, email))',
      )
      .order('name');
    setLoading(false);
    if (error) {
      toast.error('Erro ao carregar empresas: ' + error.message);
      return;
    }
    setCompanies((data as unknown as CompanyRow[] | null) ?? []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function openCreate() {
    setEditing(null);
    setName('');
    setCnpj('');
    setAddress('');
    setPhone('');
    setActive(true);
    setLogoPath(null);
    setPrimaryColor('');
    setModalOpen(true);
  }

  function openEdit(c: Company) {
    setEditing(c);
    setName(c.name);
    setCnpj(c.cnpj ?? '');
    setAddress(c.address ?? '');
    setPhone(c.phone ?? '');
    setActive(c.active);
    setLogoPath(c.logo_path ?? null);
    setPrimaryColor(c.label_settings?.primary_color ?? '');
    setModalOpen(true);
  }

  async function handleLogoUpload(file: File | undefined) {
    if (!file || !editing) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Selecione um arquivo de imagem.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('O logo deve ter no máximo 2 MB.');
      return;
    }
    setUploadingLogo(true);
    const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
    const path = `${editing.id}/logo.${ext}`;
    const { error: upErr } = await supabase.storage
      .from('branding')
      .upload(path, file, { contentType: file.type, upsert: true });
    if (upErr) {
      setUploadingLogo(false);
      toast.error('Erro no upload: ' + upErr.message);
      return;
    }
    const { error: dbErr } = await supabase
      .from('companies')
      .update({ logo_path: path })
      .eq('id', editing.id);
    setUploadingLogo(false);
    if (dbErr) {
      // Remove o arquivo orfao (upsert pode ter sobrescrito o anterior,
      // mas remover devolve o estado anterior do banco — se algum
      // logo antigo apontava para esse path, precisaria de re-upload
      // manual).
      await supabase.storage.from('branding').remove([path]);
      toast.error('Erro ao salvar logo: ' + dbErr.message);
      return;
    }
    setLogoPath(path);
    toast.success('Logo atualizado.');
    void load();
  }

  async function handleLogoRemove() {
    if (!editing || !logoPath) return;
    setUploadingLogo(true);
    // Limpa a referência no banco PRIMEIRO. Só apaga o arquivo se isso der
    // certo — evita logo_path apontando para arquivo inexistente (imagem
    // quebrada) caso o update falhe.
    const { error } = await supabase
      .from('companies')
      .update({ logo_path: null })
      .eq('id', editing.id);
    if (error) {
      setUploadingLogo(false);
      toast.error('Erro ao remover logo: ' + error.message);
      return;
    }
    await supabase.storage.from('branding').remove([logoPath]);
    setUploadingLogo(false);
    setLogoPath(null);
    toast.success('Logo removido.');
    void load();
  }

  async function handleSave() {
    if (!name.trim()) {
      toast.error('Informe o nome da empresa.');
      return;
    }
    setSaving(true);
    const currentSettings = editing?.label_settings ?? {};
    const labelSettings = primaryColor.trim()
      ? { ...currentSettings, primary_color: primaryColor.trim() }
      : (() => {
          const next = { ...currentSettings };
          delete next.primary_color;
          return next;
        })();
    const basePayload = {
      name: name.trim(),
      cnpj: cnpj.trim() || null,
      address: address.trim() || null,
      phone: phone.trim() || null,
      active,
      label_settings: labelSettings,
    };
    const { error } = editing
      ? await supabase
          .from('companies')
          .update(basePayload)
          .eq('id', editing.id)
      : await supabase.from('companies').insert({
          ...basePayload,
          organization_id: profile?.organization_id ?? null,
        });
    setSaving(false);
    if (error) {
      toast.error('Erro ao salvar: ' + error.message);
      return;
    }
    toast.success(editing ? 'Empresa atualizada.' : 'Empresa criada.');
    setModalOpen(false);
    void load();
  }

  async function handleDelete() {
    if (!deleting) return;
    setDeleteBusy(true);
    const err = await softDelete('companies', deleting.id);
    setDeleteBusy(false);
    if (err) {
      toast.error(err);
      return;
    }
    toast.success('Empresa movida para a lixeira (30 dias para restaurar).');
    setDeleting(null);
    void load();
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-neutral-800 sm:text-2xl">
            Empresas
          </h1>
          <p className="text-sm text-neutral-500">
            Propriedades / clientes que usam o sistema.
          </p>
        </div>
        <Button
          onClick={openCreate}
          disabled={
            !isPlatformAdmin &&
            subscription?.company_limit != null &&
            activeCompanyCount >= subscription.company_limit
          }
        >
          <Plus size={18} />
          Nova empresa
        </Button>
      </div>

      {!isPlatformAdmin && companyLimit != null ? (
        <div
          className={`mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm ${
            atLimit
              ? 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200'
              : 'border-neutral-200 bg-neutral-50 text-neutral-600 dark:border-neutral-800 dark:bg-slate-800 dark:text-neutral-300'
          }`}
        >
          <span>
            Empresas do plano: <strong>{activeCompanyCount}</strong> /{' '}
            {companyLimit}
          </span>
          {atLimit ? (
            <span className="text-xs">
              Limite atingido — faça upgrade em Minha assinatura para adicionar
              mais.
            </span>
          ) : null}
        </div>
      ) : null}

      {loading ? (
        <ListSkeleton rows={5} />
      ) : companies.length === 0 ? (
        <Card>
          <p className="text-sm text-neutral-600">
            Nenhuma empresa cadastrada ainda.
          </p>
        </Card>
      ) : (
        <>
          <div className="mb-3 flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2">
            <Search size={16} className="shrink-0 text-neutral-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por empresa, CNPJ, nutricionista ou organização..."
              className="min-w-0 flex-1 bg-transparent text-sm text-neutral-800 outline-none placeholder:text-neutral-400"
            />
            {search ? (
              <button
                type="button"
                onClick={() => setSearch('')}
                aria-label="Limpar busca"
                className="rounded p-1 text-neutral-400 hover:bg-neutral-100"
              >
                <X size={14} />
              </button>
            ) : null}
          </div>
          <Card className="!p-0">
            <div className="w-full overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 text-left text-xs uppercase text-neutral-500">
                    <th className="px-4 py-3">Empresa</th>
                    <th className="px-4 py-3">Nutricionista / Organização</th>
                    <th className="px-4 py-3">CNPJ</th>
                    <th className="px-4 py-3">Telefone</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCompanies.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-8 text-center text-sm text-neutral-500"
                      >
                        Nenhuma empresa encontrada para "{search}".
                      </td>
                    </tr>
                  ) : null}
                  {filteredCompanies.map((c) => (
                    <tr
                      key={c.id}
                      className="border-b border-neutral-100 last:border-0"
                    >
                      <td className="px-4 py-3 font-medium text-neutral-800">
                        {c.name}
                      </td>
                      <td className="px-4 py-3 text-neutral-600">
                        <CompanyOrgLink row={c} />
                      </td>
                      <td className="px-4 py-3 text-neutral-600">
                        {c.cnpj ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-neutral-600">
                        {c.phone ?? '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs ${
                            c.active
                              ? 'bg-neutral-50 text-neutral-700'
                              : 'bg-neutral-100 text-neutral-500'
                          }`}
                        >
                          {c.active ? 'Ativa' : 'Inativa'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => {
                              const url = `${window.location.origin}/selo/${c.id}`;
                              void navigator.clipboard
                                .writeText(url)
                                .then(() =>
                                  toast.success(
                                    'Link do selo público copiado.',
                                  ),
                                )
                                .catch(() => toast.error('Falha ao copiar.'));
                            }}
                            aria-label="Copiar link do selo público"
                            title="Copiar link do selo público de conformidade"
                            className="rounded-lg p-2.5 text-neutral-600 hover:bg-neutral-50"
                          >
                            <ShieldCheck size={16} />
                          </button>
                          <button
                            onClick={() => openEdit(c)}
                            aria-label="Editar"
                            className="rounded-lg p-2.5 text-neutral-500 hover:bg-neutral-100"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            onClick={() => setDeleting(c)}
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
        </>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Editar empresa' : 'Nova empresa'}
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
            id="co-name"
            label="Nome da empresa"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Input
            id="co-cnpj"
            label="CNPJ (opcional)"
            value={cnpj}
            onChange={(e) => setCnpj(e.target.value)}
          />
          <Input
            id="co-address"
            label="Endereço (opcional)"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
          <Input
            id="co-phone"
            label="Telefone (opcional)"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <label className="flex items-center gap-2 text-sm text-neutral-700">
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="h-5 w-5 accent-neutral-600"
            />
            Empresa ativa
          </label>

          {editing ? (
            <div className="border-t border-neutral-200 pt-4">
              <p className="mb-2 text-sm font-medium text-neutral-700">
                Logo da empresa
              </p>
              <div className="flex items-center gap-3">
                <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-lg border border-neutral-200 bg-neutral-50">
                  {logoPath ? (
                    <img
                      src={
                        supabase.storage.from('branding').getPublicUrl(logoPath)
                          .data.publicUrl
                      }
                      alt=""
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <ImageOff className="text-neutral-300" size={24} />
                  )}
                </div>
                <div className="flex flex-col gap-1">
                  <label
                    className={`inline-flex cursor-pointer items-center gap-2 rounded-lg bg-neutral-100 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-200 ${
                      uploadingLogo ? 'pointer-events-none opacity-60' : ''
                    }`}
                  >
                    <Upload size={14} />
                    {logoPath ? 'Trocar logo' : 'Enviar logo'}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={uploadingLogo}
                      onChange={(e) => {
                        void handleLogoUpload(e.target.files?.[0]);
                        e.target.value = '';
                      }}
                    />
                  </label>
                  {logoPath ? (
                    <button
                      type="button"
                      onClick={handleLogoRemove}
                      disabled={uploadingLogo}
                      className="text-xs text-red-600 hover:underline disabled:opacity-50"
                    >
                      Remover
                    </button>
                  ) : null}
                </div>
              </div>
              <p className="mt-2 text-xs text-neutral-400">
                Recomendado: PNG ou SVG com fundo transparente, até 2 MB.
              </p>
            </div>
          ) : (
            <p className="border-t border-neutral-200 pt-3 text-xs text-neutral-400">
              Salve a empresa para enviar um logo personalizado.
            </p>
          )}

          <div className="border-t border-neutral-200 pt-4">
            <p className="mb-2 text-sm font-medium text-neutral-700">
              Cor primária (etiquetas e página pública)
            </p>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={primaryColor || '#262626'}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="h-10 w-12 cursor-pointer rounded border border-neutral-300"
                aria-label="Cor primária"
              />
              <input
                type="text"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                placeholder="#262626"
                className="flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-800 focus:ring-2 focus:ring-neutral-800/20"
              />
              {primaryColor ? (
                <button
                  type="button"
                  onClick={() => setPrimaryColor('')}
                  className="text-xs text-red-600 hover:underline"
                >
                  Limpar
                </button>
              ) : null}
            </div>
            <p className="mt-2 text-xs text-neutral-400">
              Deixe em branco para usar o verde padrão.
            </p>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={deleting !== null}
        title="Excluir empresa"
        message={`Tem certeza que deseja excluir "${deleting?.name}"? Esta ação remove também todos os produtos, etiquetas e fotos vinculados.`}
        confirmLabel="Excluir"
        loading={deleteBusy}
        onConfirm={handleDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}

/**
 * Mostra a quem a empresa pertence:
 *  - linha 1: nome do nutricionista responsavel (owner_user_id da org)
 *  - linha 2: nome da organizacao
 *  - sem org vinculada: aviso amarelo
 */
function CompanyOrgLink({ row }: { row: CompanyRow }) {
  const org = row.organizations;
  if (!org) {
    return (
      <span className="text-xs font-medium text-amber-600">
        Sem organização vinculada
      </span>
    );
  }
  const owner = org.owner;
  const ownerName = owner?.full_name ?? owner?.email ?? null;
  return (
    <div className="leading-tight">
      <div className="font-medium text-neutral-800">
        {ownerName ?? 'Sem nutricionista titular'}
      </div>
      {org.name ? (
        <div className="mt-0.5 text-xs text-neutral-500">{org.name}</div>
      ) : null}
    </div>
  );
}
