import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  Bug,
  Plus,
  Pencil,
  Trash2,
  Upload,
  FileText as FileTextIcon,
  Building2,
  Calendar,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { checkDeleteResult } from '@/lib/supabaseHelpers';
import { usePageTitle } from '@/lib/usePageTitle';
import { useAuth } from '@/context/AuthContext';
import { useCompanyScope } from '@/lib/useCompanyScope';
import { formatDate } from '@/lib/dates';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { PageHeader } from '@/components/ui/PageHeader';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ListSkeleton } from '@/components/ui/Skeleton';
import type {
  PestControlProvider,
  PestControlService,
  PestServiceType,
} from '@/lib/types';
import { PEST_SERVICE_TYPE_LABELS } from '@/lib/types';
import {
  PEST_STATUS_COLOR,
  PEST_STATUS_LABELS,
  pestStatusFromList,
} from '@/lib/pestStatus';

type Tab = 'services' | 'providers';

interface ProviderForm {
  name: string;
  cnpj: string;
  license_number: string;
  phone: string;
  email: string;
  notes: string;
  active: boolean;
}

const emptyProvider: ProviderForm = {
  name: '',
  cnpj: '',
  license_number: '',
  phone: '',
  email: '',
  notes: '',
  active: true,
};

interface ServiceForm {
  provider_id: string;
  service_type: PestServiceType;
  performed_at: string;
  next_due_at: string;
  products_used: string;
  responsible_technician: string;
  notes: string;
}

function emptyServiceForm(): ServiceForm {
  const today = new Date().toISOString().slice(0, 10);
  const next = new Date();
  next.setMonth(next.getMonth() + 3);
  return {
    provider_id: '',
    service_type: 'desinsetizacao',
    performed_at: today,
    next_due_at: next.toISOString().slice(0, 10),
    products_used: '',
    responsible_technician: '',
    notes: '',
  };
}

export function PestControlPage() {
  usePageTitle('Controle de pragas');
  const { isMaster } = useAuth();
  const { companies, companyId, setCompanyId } = useCompanyScope();

  const [tab, setTab] = useState<Tab>('services');

  const [services, setServices] = useState<PestControlService[]>([]);
  const [providers, setProviders] = useState<PestControlProvider[]>([]);
  const [loading, setLoading] = useState(true);

  // Provider modal
  const [provModalOpen, setProvModalOpen] = useState(false);
  const [editingProv, setEditingProv] = useState<PestControlProvider | null>(
    null,
  );
  const [provForm, setProvForm] = useState<ProviderForm>(emptyProvider);
  const [provSaving, setProvSaving] = useState(false);
  const [deletingProv, setDeletingProv] = useState<PestControlProvider | null>(
    null,
  );

  // Service modal
  const [svcModalOpen, setSvcModalOpen] = useState(false);
  const [editingSvc, setEditingSvc] = useState<PestControlService | null>(null);
  const [svcForm, setSvcForm] = useState<ServiceForm>(emptyServiceForm());
  const [svcFile, setSvcFile] = useState<File | null>(null);
  const [svcSaving, setSvcSaving] = useState(false);
  const [deletingSvc, setDeletingSvc] = useState<PestControlService | null>(
    null,
  );

  const load = useCallback(async () => {
    if (!companyId) {
      setServices([]);
      setProviders([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const [svcRes, provRes] = await Promise.all([
      supabase
        .from('pest_control_services')
        .select('*')
        .eq('company_id', companyId)
        .order('performed_at', { ascending: false }),
      supabase
        .from('pest_control_providers')
        .select('*')
        .eq('company_id', companyId)
        .order('name'),
    ]);
    setLoading(false);
    if (svcRes.error) {
      toast.error('Erro ao carregar serviços: ' + svcRes.error.message);
      return;
    }
    if (provRes.error) {
      toast.error('Erro ao carregar fornecedores: ' + provRes.error.message);
      return;
    }
    setServices((svcRes.data as PestControlService[] | null) ?? []);
    setProviders((provRes.data as PestControlProvider[] | null) ?? []);
  }, [companyId]);

  useEffect(() => {
    void load();
  }, [load]);

  const overallStatus = useMemo(() => pestStatusFromList(services), [services]);

  const providerById = useMemo(
    () => new Map(providers.map((p) => [p.id, p])),
    [providers],
  );

  // --- Providers
  function openCreateProvider() {
    setEditingProv(null);
    setProvForm(emptyProvider);
    setProvModalOpen(true);
  }

  function openEditProvider(p: PestControlProvider) {
    setEditingProv(p);
    setProvForm({
      name: p.name,
      cnpj: p.cnpj ?? '',
      license_number: p.license_number ?? '',
      phone: p.phone ?? '',
      email: p.email ?? '',
      notes: p.notes ?? '',
      active: p.active,
    });
    setProvModalOpen(true);
  }

  async function handleSaveProvider() {
    if (!companyId) return;
    if (!provForm.name.trim()) {
      toast.error('Informe o nome.');
      return;
    }
    setProvSaving(true);
    const payload = {
      company_id: companyId,
      name: provForm.name.trim(),
      cnpj: provForm.cnpj.trim() || null,
      license_number: provForm.license_number.trim() || null,
      phone: provForm.phone.trim() || null,
      email: provForm.email.trim() || null,
      notes: provForm.notes.trim() || null,
      active: provForm.active,
    };
    const { error } = editingProv
      ? await supabase
          .from('pest_control_providers')
          .update(payload)
          .eq('id', editingProv.id)
      : await supabase.from('pest_control_providers').insert(payload);
    setProvSaving(false);
    if (error) {
      toast.error('Erro ao salvar: ' + error.message);
      return;
    }
    toast.success(
      editingProv ? 'Fornecedor atualizado.' : 'Fornecedor criado.',
    );
    setProvModalOpen(false);
    void load();
  }

  async function handleDeleteProvider() {
    if (!deletingProv) return;
    const result = await supabase
      .from('pest_control_providers')
      .delete()
      .eq('id', deletingProv.id)
      .select('id');
    const err = checkDeleteResult(result);
    if (err) {
      toast.error(err);
      return;
    }
    toast.success('Fornecedor excluído.');
    setDeletingProv(null);
    void load();
  }

  // --- Services
  function openCreateService() {
    setEditingSvc(null);
    const form = emptyServiceForm();
    form.provider_id = providers[0]?.id ?? '';
    setSvcForm(form);
    setSvcFile(null);
    setSvcModalOpen(true);
  }

  function openEditService(s: PestControlService) {
    setEditingSvc(s);
    setSvcForm({
      provider_id: s.provider_id ?? '',
      service_type: s.service_type,
      performed_at: s.performed_at,
      next_due_at: s.next_due_at ?? '',
      products_used: s.products_used ?? '',
      responsible_technician: s.responsible_technician ?? '',
      notes: s.notes ?? '',
    });
    setSvcFile(null);
    setSvcModalOpen(true);
  }

  async function handleSaveService() {
    if (!companyId) return;
    if (!svcForm.performed_at) {
      toast.error('Informe a data do serviço.');
      return;
    }
    setSvcSaving(true);

    let certPath: string | null | undefined = undefined;
    if (svcFile) {
      const ext = svcFile.name.split('.').pop()?.toLowerCase() ?? 'pdf';
      const path = `${companyId}/pest_${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('pest-docs')
        .upload(path, svcFile, {
          contentType: svcFile.type || 'application/octet-stream',
        });
      if (upErr) {
        setSvcSaving(false);
        toast.error('Erro no upload: ' + upErr.message);
        return;
      }
      certPath = path;
    }

    const payload = {
      company_id: companyId,
      provider_id: svcForm.provider_id || null,
      service_type: svcForm.service_type,
      performed_at: svcForm.performed_at,
      next_due_at: svcForm.next_due_at || null,
      products_used: svcForm.products_used.trim() || null,
      responsible_technician: svcForm.responsible_technician.trim() || null,
      notes: svcForm.notes.trim() || null,
      ...(certPath !== undefined ? { certificate_path: certPath } : {}),
    };

    const { error } = editingSvc
      ? await supabase
          .from('pest_control_services')
          .update(payload)
          .eq('id', editingSvc.id)
      : await supabase.from('pest_control_services').insert(payload);
    setSvcSaving(false);
    if (error) {
      // Cleanup arquivo orfao se foi feito upload novo.
      if (typeof certPath === 'string') {
        await supabase.storage.from('pest-docs').remove([certPath]);
      }
      toast.error('Erro ao salvar: ' + error.message);
      return;
    }
    toast.success(editingSvc ? 'Serviço atualizado.' : 'Serviço registrado.');
    setSvcModalOpen(false);
    void load();
  }

  async function handleDeleteService() {
    if (!deletingSvc) return;
    const result = await supabase
      .from('pest_control_services')
      .delete()
      .eq('id', deletingSvc.id)
      .select('id');
    const err = checkDeleteResult(result);
    if (err) {
      toast.error(err);
      return;
    }
    toast.success('Serviço excluído.');
    setDeletingSvc(null);
    void load();
  }

  async function openSignedFile(path: string) {
    const { data, error } = await supabase.storage
      .from('pest-docs')
      .createSignedUrl(path, 60);
    if (error || !data) {
      toast.error('Erro ao abrir arquivo: ' + (error?.message ?? ''));
      return;
    }
    window.open(data.signedUrl, '_blank', 'noopener');
  }

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Controle de pragas"
        subtitle="Controle integrado (RDC 216 art. 4.4) — fornecedor licenciado, aplicações e comprovantes."
      />

      {isMaster && companies.length > 0 ? (
        <div className="mb-4">
          <Select
            id="company-scope"
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
      ) : null}

      {/* Status atual */}
      {services.length > 0 || providers.length > 0 ? (
        <Card className="mb-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Status geral
              </p>
              <span
                className={`mt-1 inline-block rounded-full px-3 py-1 text-sm font-medium ${PEST_STATUS_COLOR[overallStatus.status]}`}
              >
                {PEST_STATUS_LABELS[overallStatus.status]}
                {overallStatus.latest?.next_due_at
                  ? ` — vence ${formatDate(overallStatus.latest.next_due_at)}`
                  : ''}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center sm:text-right">
              <div>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Serviços
                </p>
                <p className="text-lg font-semibold text-neutral-800 dark:text-neutral-100">
                  {services.length}
                </p>
              </div>
              <div>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Fornecedores
                </p>
                <p className="text-lg font-semibold text-neutral-800 dark:text-neutral-100">
                  {providers.filter((p) => p.active).length}
                </p>
              </div>
              <div>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Último serviço
                </p>
                <p className="truncate text-lg font-semibold text-neutral-800 dark:text-neutral-100">
                  {overallStatus.latest
                    ? formatDate(overallStatus.latest.performed_at)
                    : '—'}
                </p>
              </div>
            </div>
          </div>
        </Card>
      ) : null}

      {/* Tabs */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-lg border border-neutral-200 bg-white p-1 dark:border-neutral-800 dark:bg-slate-900">
          <button
            onClick={() => setTab('services')}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
              tab === 'services'
                ? 'bg-neutral-50 text-neutral-700 dark:bg-neutral-950 dark:text-neutral-400'
                : 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800'
            }`}
          >
            Serviços
          </button>
          <button
            onClick={() => setTab('providers')}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
              tab === 'providers'
                ? 'bg-neutral-50 text-neutral-700 dark:bg-neutral-950 dark:text-neutral-400'
                : 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800'
            }`}
          >
            Fornecedores
          </button>
        </div>
        {tab === 'services' ? (
          <Button
            onClick={openCreateService}
            disabled={!companyId || providers.length === 0}
          >
            <Plus size={18} />
            Novo serviço
          </Button>
        ) : (
          <Button onClick={openCreateProvider} disabled={!companyId}>
            <Plus size={18} />
            Novo fornecedor
          </Button>
        )}
      </div>

      {isMaster && companies.length === 0 ? (
        <Card>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Nenhuma empresa cadastrada. Crie uma empresa em{' '}
            <a
              href="/admin/empresas"
              className="font-medium text-neutral-700 hover:underline dark:text-neutral-400"
            >
              Empresas
            </a>{' '}
            para começar.
          </p>
        </Card>
      ) : loading ? (
        <ListSkeleton rows={5} />
      ) : tab === 'services' ? (
        services.length === 0 ? (
          <Card>
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <Bug
                size={32}
                className="text-neutral-300 dark:text-neutral-600"
              />
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                {providers.length === 0
                  ? 'Cadastre um fornecedor antes de registrar um serviço.'
                  : 'Nenhum serviço registrado.'}
              </p>
            </div>
          </Card>
        ) : (
          <div className="flex flex-col gap-3">
            {services.map((s) => {
              const provider = s.provider_id
                ? providerById.get(s.provider_id)
                : null;
              return (
                <Card key={s.id}>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <h2 className="min-w-0 max-w-full truncate text-sm font-semibold text-neutral-800 dark:text-neutral-200">
                          {PEST_SERVICE_TYPE_LABELS[s.service_type]}
                        </h2>
                        {provider ? (
                          <span className="inline-flex items-center gap-1 whitespace-nowrap text-xs text-neutral-500 dark:text-neutral-400">
                            <Building2 size={12} />
                            <span className="truncate">{provider.name}</span>
                          </span>
                        ) : null}
                      </div>
                      <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-600 dark:text-neutral-400">
                        <span className="inline-flex items-center gap-1 whitespace-nowrap">
                          <Calendar size={12} />
                          Realizado {formatDate(s.performed_at)}
                        </span>
                        {s.next_due_at ? (
                          <span className="inline-flex items-center gap-1 whitespace-nowrap">
                            Próximo: {formatDate(s.next_due_at)}
                          </span>
                        ) : null}
                        {s.responsible_technician ? (
                          <span className="truncate">
                            Resp.: {s.responsible_technician}
                          </span>
                        ) : null}
                      </p>
                      {s.products_used ? (
                        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-500">
                          Produtos: {s.products_used}
                        </p>
                      ) : null}
                      {s.certificate_path ? (
                        <button
                          type="button"
                          onClick={() =>
                            void openSignedFile(s.certificate_path!)
                          }
                          className="mt-2 inline-flex items-center gap-1 text-xs text-neutral-700 hover:underline dark:text-neutral-400"
                        >
                          <FileTextIcon size={12} />
                          Abrir documento da empresa
                        </button>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      <button
                        onClick={() => openEditService(s)}
                        aria-label="Editar"
                        className="rounded-lg p-2.5 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => setDeletingSvc(s)}
                        aria-label="Excluir"
                        className="rounded-lg p-2.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )
      ) : providers.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <Building2
              size={32}
              className="text-neutral-300 dark:text-neutral-600"
            />
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Nenhum fornecedor cadastrado.
            </p>
          </div>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {providers.map((p) => (
            <Card key={p.id}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <h2 className="min-w-0 max-w-full truncate text-sm font-semibold text-neutral-800 dark:text-neutral-200">
                      {p.name}
                    </h2>
                    {!p.active ? (
                      <span className="rounded-full bg-neutral-200 px-2 py-0.5 text-xs text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
                        Inativo
                      </span>
                    ) : null}
                  </div>
                  <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-600 dark:text-neutral-400">
                    {p.cnpj ? (
                      <span className="whitespace-nowrap">CNPJ {p.cnpj}</span>
                    ) : null}
                    {p.license_number ? (
                      <span className="whitespace-nowrap">
                        Licença {p.license_number}
                      </span>
                    ) : null}
                    {p.phone ? (
                      <span className="whitespace-nowrap">Tel {p.phone}</span>
                    ) : null}
                    {p.email ? (
                      <span className="truncate">{p.email}</span>
                    ) : null}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <button
                    onClick={() => openEditProvider(p)}
                    aria-label="Editar"
                    className="rounded-lg p-2.5 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => setDeletingProv(p)}
                    aria-label="Excluir"
                    className="rounded-lg p-2.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Provider Modal */}
      <Modal
        open={provModalOpen}
        onClose={() => setProvModalOpen(false)}
        title={editingProv ? 'Editar fornecedor' : 'Novo fornecedor'}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setProvModalOpen(false)}
              disabled={provSaving}
            >
              Cancelar
            </Button>
            <Button onClick={handleSaveProvider} loading={provSaving}>
              Salvar
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <Input
            id="p-name"
            label="Razão social / Nome"
            value={provForm.name}
            onChange={(e) => setProvForm({ ...provForm, name: e.target.value })}
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              id="p-cnpj"
              label="CNPJ"
              value={provForm.cnpj}
              onChange={(e) =>
                setProvForm({ ...provForm, cnpj: e.target.value })
              }
            />
            <Input
              id="p-license"
              label="Alvará / Licença sanitária"
              value={provForm.license_number}
              onChange={(e) =>
                setProvForm({ ...provForm, license_number: e.target.value })
              }
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              id="p-phone"
              label="Telefone"
              value={provForm.phone}
              onChange={(e) =>
                setProvForm({ ...provForm, phone: e.target.value })
              }
            />
            <Input
              id="p-email"
              label="E-mail"
              type="email"
              value={provForm.email}
              onChange={(e) =>
                setProvForm({ ...provForm, email: e.target.value })
              }
            />
          </div>
          <Input
            id="p-notes"
            label="Observações"
            value={provForm.notes}
            onChange={(e) =>
              setProvForm({ ...provForm, notes: e.target.value })
            }
          />
          <label className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300">
            <input
              type="checkbox"
              checked={provForm.active}
              onChange={(e) =>
                setProvForm({ ...provForm, active: e.target.checked })
              }
              className="h-5 w-5 accent-neutral-600"
            />
            Ativo
          </label>
        </div>
      </Modal>

      {/* Service Modal */}
      <Modal
        open={svcModalOpen}
        onClose={() => setSvcModalOpen(false)}
        title={editingSvc ? 'Editar serviço' : 'Novo serviço'}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setSvcModalOpen(false)}
              disabled={svcSaving}
            >
              Cancelar
            </Button>
            <Button onClick={handleSaveService} loading={svcSaving}>
              Salvar
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <Select
            id="s-provider"
            label="Fornecedor"
            value={svcForm.provider_id}
            onChange={(e) =>
              setSvcForm({ ...svcForm, provider_id: e.target.value })
            }
          >
            <option value="">— sem fornecedor —</option>
            {providers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
          <Select
            id="s-type"
            label="Tipo de serviço"
            value={svcForm.service_type}
            onChange={(e) =>
              setSvcForm({
                ...svcForm,
                service_type: e.target.value as PestServiceType,
              })
            }
          >
            {Object.entries(PEST_SERVICE_TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </Select>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              id="s-performed"
              label="Data do serviço"
              type="date"
              value={svcForm.performed_at}
              onChange={(e) =>
                setSvcForm({ ...svcForm, performed_at: e.target.value })
              }
            />
            <Input
              id="s-next"
              label="Próximo serviço"
              type="date"
              value={svcForm.next_due_at}
              onChange={(e) =>
                setSvcForm({ ...svcForm, next_due_at: e.target.value })
              }
            />
          </div>
          <Input
            id="s-tech"
            label="Técnico responsável"
            value={svcForm.responsible_technician}
            onChange={(e) =>
              setSvcForm({
                ...svcForm,
                responsible_technician: e.target.value,
              })
            }
          />
          <Input
            id="s-products"
            label="Produtos / princípio ativo"
            value={svcForm.products_used}
            onChange={(e) =>
              setSvcForm({ ...svcForm, products_used: e.target.value })
            }
          />
          <Input
            id="s-notes"
            label="Observações"
            value={svcForm.notes}
            onChange={(e) => setSvcForm({ ...svcForm, notes: e.target.value })}
          />
          <div>
            <p className="mb-1 text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Documento entregue pela empresa contratada{' '}
              {editingSvc ? '(substituir)' : ''}
            </p>
            <p className="mb-2 text-xs text-neutral-500">
              PDF ou foto do certificado/laudo/comprovante de aplicação que a
              empresa de controle de pragas deve entregar após cada serviço.
            </p>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-neutral-100 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700">
              <Upload size={14} />
              {svcFile ? svcFile.name : 'Selecionar arquivo'}
              <input
                type="file"
                accept="application/pdf,image/*"
                className="hidden"
                onChange={(e) => setSvcFile(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={deletingProv !== null}
        title="Excluir fornecedor"
        message={`Excluir ${deletingProv?.name}? Os serviços vinculados permanecem (sem fornecedor).`}
        confirmLabel="Excluir"
        onConfirm={handleDeleteProvider}
        onCancel={() => setDeletingProv(null)}
      />

      <ConfirmDialog
        open={deletingSvc !== null}
        title="Excluir serviço"
        message="Excluir este serviço do histórico?"
        confirmLabel="Excluir"
        onConfirm={handleDeleteService}
        onCancel={() => setDeletingSvc(null)}
      />
    </div>
  );
}
