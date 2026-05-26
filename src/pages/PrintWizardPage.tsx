import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Printer,
  Search,
  Tag,
  HardHat,
  Package,
  Settings2,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { usePageTitle, SITE_URL } from '@/lib/usePageTitle';
import { useAuth } from '@/context/AuthContext';
import { useCompanyScope } from '@/lib/useCompanyScope';
import { computeExpiry, formatDateTime, toLocalInputValue } from '@/lib/dates';
import {
  STORAGE_CONDITION_LABELS,
  type Manipulator,
  type ProductGroup,
  type ProductWithShelfLives,
  type StorageCondition,
} from '@/lib/types';
import { LabelPreview, type LabelData } from '@/components/LabelPreview';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Spinner } from '@/components/ui/Spinner';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { logFeatureEvent } from '@/lib/platformMetrics';

interface LabelSize {
  id: string;
  label: string;
  w: number;
  h: number;
}

const LABEL_SIZES: LabelSize[] = [
  { id: '60x60', label: '60 x 60 mm', w: 60, h: 60 },
  { id: '60x40', label: '60 x 40 mm', w: 60, h: 40 },
  { id: '80x60', label: '80 x 60 mm', w: 80, h: 60 },
  { id: '50x30', label: '50 x 30 mm', w: 50, h: 30 },
];

function applyPageStyle(w: number, h: number) {
  let el = document.getElementById('print-page-style') as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement('style');
    el.id = 'print-page-style';
    document.head.appendChild(el);
  }
  el.textContent = `@page { size: ${w}mm ${h}mm; margin: 0; }`;
}

type Step = 1 | 2 | 3 | 4 | 5;

const STEP_META: Record<Step, { titleKey: string; icon: typeof HardHat }> = {
  1: { titleKey: 'Manipulador', icon: HardHat },
  2: { titleKey: 'Grupo', icon: Tag },
  3: { titleKey: 'Produto', icon: Package },
  4: { titleKey: 'Informações', icon: Settings2 },
  5: { titleKey: 'Imprimir', icon: Printer },
};

export function PrintWizardPage() {
  usePageTitle('Imprimir — modo rápido');
  const { profile } = useAuth();
  const navigate = useNavigate();
  const {
    isMaster,
    companies,
    companyId,
    setCompanyId,
    companyName,
    companyLogoUrl,
    companyPrimaryColor,
    selectedCompany,
  } = useCompanyScope();

  const [products, setProducts] = useState<ProductWithShelfLives[]>([]);
  const [groups, setGroups] = useState<ProductGroup[]>([]);
  const [manipulators, setManipulators] = useState<Manipulator[]>([]);
  const [loading, setLoading] = useState(true);

  const [step, setStep] = useState<Step>(1);

  // estado do form
  const [responsible, setResponsible] = useState(profile?.full_name ?? '');
  const [groupId, setGroupId] = useState<string | 'all'>('all');
  const [productId, setProductId] = useState('');
  const [condition, setCondition] = useState<StorageCondition>('refrigerado');
  const [manipulationLocal, setManipulationLocal] = useState(() =>
    toLocalInputValue(new Date()),
  );
  const [quantity, setQuantity] = useState(1);
  const [batch, setBatch] = useState('');
  const [supplier, setSupplier] = useState('');
  const [displayQuantity, setDisplayQuantity] = useState('');
  const [sizeId, setSizeId] = useState(LABEL_SIZES[0].id);
  const [labelId, setLabelId] = useState(() => crypto.randomUUID());
  const [productSearch, setProductSearch] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [savingPrint, setSavingPrint] = useState(false);

  useEffect(() => {
    setLabelId(crypto.randomUUID());
  }, [productId, condition, manipulationLocal, responsible, quantity, companyId]);

  const load = useCallback(async () => {
    if (!companyId) {
      setProducts([]);
      setManipulators([]);
      setGroups([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const [prodRes, manipRes, grpRes] = await Promise.all([
      supabase
        .from('products')
        .select('*, product_shelf_lives(*)')
        .eq('company_id', companyId)
        .eq('active', true)
        .order('name'),
      supabase
        .from('manipulators')
        .select('*')
        .eq('company_id', companyId)
        .eq('active', true)
        .order('full_name'),
      supabase
        .from('product_groups')
        .select('*')
        .eq('active', true)
        .order('sort_order')
        .order('name'),
    ]);
    setLoading(false);
    if (prodRes.error) {
      toast.error('Erro ao carregar produtos: ' + prodRes.error.message);
      return;
    }
    setProducts((prodRes.data as ProductWithShelfLives[] | null) ?? []);
    setManipulators((manipRes.data as Manipulator[] | null) ?? []);
    setGroups((grpRes.data as ProductGroup[] | null) ?? []);
  }, [companyId]);

  useEffect(() => {
    void load();
  }, [load]);

  const selectedProduct = products.find((p) => p.id === productId) ?? null;
  const rules = selectedProduct?.product_shelf_lives ?? [];
  const rule = rules.find((r) => r.storage_condition === condition) ?? null;
  const manipDate = manipulationLocal ? new Date(manipulationLocal) : null;
  const manipValid = manipDate !== null && !Number.isNaN(manipDate.getTime());
  const expiry =
    manipValid && rule
      ? computeExpiry(manipDate, rule.validity_value, rule.validity_unit)
      : null;
  const size = LABEL_SIZES.find((s) => s.id === sizeId) ?? LABEL_SIZES[0];

  const filteredProducts = useMemo(() => {
    let list = products;
    if (groupId !== 'all') {
      list = list.filter((p) => p.group_id === groupId);
    }
    const q = productSearch.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.category ?? '').toLowerCase().includes(q),
      );
    }
    return list;
  }, [products, groupId, productSearch]);

  // Quando seleciona produto, ajusta condição default
  useEffect(() => {
    if (!selectedProduct) return;
    const has = (c: StorageCondition) =>
      rules.some((r) => r.storage_condition === c);
    if (has(selectedProduct.default_storage_condition)) {
      setCondition(selectedProduct.default_storage_condition);
    } else if (rules.length > 0) {
      setCondition(rules[0].storage_condition);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  const labelData: LabelData = {
    companyName,
    companyLogoUrl,
    companyCnpj: selectedCompany?.cnpj ?? null,
    companyAddress: selectedCompany?.address ?? null,
    primaryColor: companyPrimaryColor,
    productName: selectedProduct?.name ?? '',
    storageConditionLabel: STORAGE_CONDITION_LABELS[condition],
    displayQuantity: displayQuantity.trim() || null,
    manipulationText: manipValid ? formatDateTime(manipDate) : '',
    expiryText: expiry ? formatDateTime(expiry) : '',
    originalExpiryText: null,
    batch: batch.trim() || null,
    supplier: supplier.trim() || null,
    printId: labelId.replace(/-/g, '').slice(0, 6).toUpperCase(),
    allergens: selectedProduct?.allergens ?? [],
    qrUrl: `${SITE_URL}/etiqueta/${labelId}`,
    responsibleName: responsible,
  };

  const canPrint =
    Boolean(selectedProduct) &&
    rule !== null &&
    expiry !== null &&
    responsible.trim().length > 0 &&
    quantity >= 1;

  // navegação entre passos
  function next() {
    if (step < 5) setStep((step + 1) as Step);
  }
  function back() {
    if (step > 1) setStep((step - 1) as Step);
  }

  const stepValid: Record<Step, boolean> = {
    1: responsible.trim().length > 0,
    2: true, // grupo é opcional (pode pular como "Todos")
    3: Boolean(productId),
    4: manipValid && rule !== null && quantity >= 1,
    5: canPrint,
  };

  function handlePrint() {
    if (!canPrint) return;
    applyPageStyle(size.w, size.h);
    window.print();
    setConfirmOpen(true);
  }

  async function confirmPrinted() {
    if (!selectedProduct || !rule || !expiry || !manipDate) return;
    setSavingPrint(true);
    const { error } = await supabase.from('label_prints').insert({
      id: labelId,
      company_id: companyId,
      product_id: selectedProduct.id,
      product_name_snapshot: selectedProduct.name,
      storage_condition: condition,
      manipulation_at: manipDate.toISOString(),
      expiry_at: expiry.toISOString(),
      responsible_name: responsible.trim(),
      quantity,
      batch: batch.trim() || null,
      supplier: supplier.trim() || null,
      display_quantity: displayQuantity.trim() || null,
      allergens: selectedProduct.allergens ?? [],
      printed_by: profile?.id ?? null,
    });
    setSavingPrint(false);
    setConfirmOpen(false);
    if (error) {
      toast.error('Falha ao registrar a etiqueta: ' + error.message);
      return;
    }
    toast.success('Etiqueta registrada.');
    void logFeatureEvent('label_printed_wizard');
    // reseta para imprimir outra do mesmo manipulador
    setStep(2);
    setProductId('');
    setBatch('');
    setSupplier('');
    setDisplayQuantity('');
    setLabelId(crypto.randomUUID());
  }

  const noCompany = isMaster && companies.length === 0;

  return (
    <div className="mx-auto max-w-2xl">
      {/* Header com progresso */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-neutral-800 sm:text-2xl">
            Imprimir etiqueta
          </h1>
          <p className="text-sm text-neutral-500">
            Modo rápido — siga os passos.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => navigate('/imprimir')}>
          Modo desktop
        </Button>
      </div>

      {/* Stepper visual */}
      <div className="mb-4 flex items-center gap-1">
        {([1, 2, 3, 4, 5] as Step[]).map((s) => {
          const meta = STEP_META[s];
          const Icon = meta.icon;
          const isActive = s === step;
          const isDone = s < step;
          return (
            <div
              key={s}
              className={`flex flex-1 flex-col items-center gap-1 rounded-lg p-2 text-xs ${
                isActive
                  ? 'bg-emerald-50 text-emerald-700'
                  : isDone
                    ? 'text-emerald-600'
                    : 'text-neutral-400'
              }`}
            >
              {isDone ? <Check size={16} /> : <Icon size={16} />}
              <span className="hidden sm:inline">{meta.titleKey}</span>
            </div>
          );
        })}
      </div>

      {isMaster && companies.length > 0 && (
        <div className="mb-3">
          <Select
            label="Empresa"
            value={companyId}
            onChange={(e) => {
              setCompanyId(e.target.value);
              setProductId('');
            }}
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
          <p className="text-sm text-neutral-600">Nenhuma empresa cadastrada.</p>
        </Card>
      ) : loading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-8 w-8" />
        </div>
      ) : (
        <>
          {step === 1 && (
            <Step1
              manipulators={manipulators}
              responsible={responsible}
              setResponsible={setResponsible}
            />
          )}
          {step === 2 && (
            <Step2
              groups={groups}
              groupId={groupId}
              setGroupId={(id) => {
                setGroupId(id);
                next();
              }}
            />
          )}
          {step === 3 && (
            <Step3
              products={filteredProducts}
              productId={productId}
              setProductId={(id) => {
                setProductId(id);
                next();
              }}
              search={productSearch}
              setSearch={setProductSearch}
              groupName={
                groupId === 'all'
                  ? 'Todos os grupos'
                  : (groups.find((g) => g.id === groupId)?.name ?? '—')
              }
            />
          )}
          {step === 4 && selectedProduct && (
            <Step4
              product={selectedProduct}
              condition={condition}
              setCondition={setCondition}
              manipulationLocal={manipulationLocal}
              setManipulationLocal={setManipulationLocal}
              quantity={quantity}
              setQuantity={setQuantity}
              batch={batch}
              setBatch={setBatch}
              supplier={supplier}
              setSupplier={setSupplier}
              displayQuantity={displayQuantity}
              setDisplayQuantity={setDisplayQuantity}
              sizeId={sizeId}
              setSizeId={setSizeId}
              rule={rule}
              expiry={expiry}
            />
          )}
          {step === 5 && (
            <Step5
              labelData={labelData}
              size={size}
              quantity={quantity}
              canPrint={canPrint}
              onPrint={handlePrint}
            />
          )}

          {/* Navegação inferior */}
          <div className="mt-4 flex justify-between gap-2">
            <Button variant="secondary" onClick={back} disabled={step === 1}>
              <ArrowLeft size={16} />
              Voltar
            </Button>
            {step < 5 && (
              <Button onClick={next} disabled={!stepValid[step]}>
                Avançar
                <ArrowRight size={16} />
              </Button>
            )}
          </div>
        </>
      )}

      {/* Area exclusiva de impressao */}
      {typeof document !== 'undefined'
        ? createPortal(
            <div id="print-label-area">
              {Array.from({ length: quantity }).map((_, i) => (
                <div
                  key={i}
                  style={{ breakAfter: i < quantity - 1 ? 'page' : 'auto' }}
                >
                  <LabelPreview
                    data={labelData}
                    widthMm={size.w}
                    heightMm={size.h}
                  />
                </div>
              ))}
            </div>,
            document.body,
          )
        : null}

      <ConfirmDialog
        open={confirmOpen}
        title="Confirmar impressão"
        message="A etiqueta foi impressa corretamente? Confirme para registrar no histórico."
        confirmLabel="Sim, registrar"
        loading={savingPrint}
        onConfirm={confirmPrinted}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}

// ---------------- Sub-componentes por passo ----------------

function Step1({
  manipulators,
  responsible,
  setResponsible,
}: {
  manipulators: Manipulator[];
  responsible: string;
  setResponsible: (s: string) => void;
}) {
  return (
    <Card>
      <h2 className="mb-3 text-sm font-semibold text-neutral-700">
        Quem está manipulando?
      </h2>
      {manipulators.length === 0 ? (
        <Input
          id="resp"
          label="Responsável"
          value={responsible}
          onChange={(e) => setResponsible(e.target.value)}
          placeholder="Cadastre funcionários em Cadastros → Funcionários"
        />
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {manipulators.map((m) => {
            const isSelected = responsible === m.full_name;
            return (
              <button
                key={m.id}
                onClick={() => setResponsible(m.full_name)}
                className={`flex items-center gap-3 rounded-lg border p-3 text-left transition ${
                  isSelected
                    ? 'border-emerald-500 bg-emerald-50'
                    : 'border-neutral-200 bg-white hover:border-neutral-300'
                }`}
              >
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                    isSelected ? 'bg-emerald-600 text-white' : 'bg-neutral-100 text-neutral-500'
                  }`}
                >
                  <HardHat size={16} />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-neutral-800">
                    {m.full_name}
                  </p>
                  {m.role && (
                    <p className="truncate text-xs text-neutral-500">{m.role}</p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </Card>
  );
}

function Step2({
  groups,
  groupId,
  setGroupId,
}: {
  groups: ProductGroup[];
  groupId: string | 'all';
  setGroupId: (id: string | 'all') => void;
}) {
  return (
    <Card>
      <h2 className="mb-3 text-sm font-semibold text-neutral-700">
        Qual grupo de produto?
      </h2>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <button
          onClick={() => setGroupId('all')}
          className={`flex flex-col items-center gap-2 rounded-lg border p-4 transition ${
            groupId === 'all'
              ? 'border-emerald-500 bg-emerald-50'
              : 'border-neutral-200 bg-white hover:border-neutral-300'
          }`}
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-200 text-neutral-700">
            <Tag size={18} />
          </span>
          <span className="text-sm font-medium text-neutral-800">Todos</span>
        </button>
        {groups.map((g) => {
          const isSelected = groupId === g.id;
          return (
            <button
              key={g.id}
              onClick={() => setGroupId(g.id)}
              className={`flex flex-col items-center gap-2 rounded-lg border p-4 transition ${
                isSelected
                  ? 'border-emerald-500 bg-emerald-50'
                  : 'border-neutral-200 bg-white hover:border-neutral-300'
              }`}
            >
              <span
                className="flex h-10 w-10 items-center justify-center rounded-full text-white"
                style={{ backgroundColor: g.color ?? '#6b7280' }}
              >
                <Tag size={18} />
              </span>
              <span className="text-center text-sm font-medium text-neutral-800">
                {g.name}
              </span>
            </button>
          );
        })}
      </div>
      {groups.length === 0 && (
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
          Nenhum grupo cadastrado. Vá em Cadastros → Grupos para organizar
          os produtos.
        </p>
      )}
    </Card>
  );
}

function Step3({
  products,
  productId,
  setProductId,
  search,
  setSearch,
  groupName,
}: {
  products: ProductWithShelfLives[];
  productId: string;
  setProductId: (id: string) => void;
  search: string;
  setSearch: (s: string) => void;
  groupName: string;
}) {
  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-neutral-700">Produto</h2>
        <span className="rounded bg-neutral-100 px-2 py-0.5 text-xs text-neutral-500">
          {groupName}
        </span>
      </div>
      <div className="relative mb-3">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
        />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar produto"
          className="min-h-[44px] w-full rounded-lg border border-neutral-300 bg-white pl-9 pr-3 text-base outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 sm:text-sm dark:bg-slate-800"
        />
      </div>
      {products.length === 0 ? (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
          Nenhum produto encontrado neste grupo.
        </p>
      ) : (
        <ul className="divide-y divide-neutral-100">
          {products.map((p) => {
            const isSelected = productId === p.id;
            return (
              <li key={p.id}>
                <button
                  onClick={() => setProductId(p.id)}
                  className={`flex w-full items-center gap-3 py-3 text-left transition ${
                    isSelected ? 'bg-emerald-50' : 'hover:bg-neutral-50'
                  }`}
                >
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                      isSelected
                        ? 'bg-emerald-600 text-white'
                        : 'bg-neutral-100 text-neutral-500'
                    }`}
                  >
                    <Package size={16} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-neutral-800">
                      {p.name}
                    </p>
                    {p.category && (
                      <p className="truncate text-xs text-neutral-500">
                        {p.category}
                      </p>
                    )}
                  </div>
                  {isSelected && <Check size={16} className="text-emerald-600" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

function Step4({
  product,
  condition,
  setCondition,
  manipulationLocal,
  setManipulationLocal,
  quantity,
  setQuantity,
  batch,
  setBatch,
  supplier,
  setSupplier,
  displayQuantity,
  setDisplayQuantity,
  sizeId,
  setSizeId,
  rule,
  expiry,
}: {
  product: ProductWithShelfLives;
  condition: StorageCondition;
  setCondition: (c: StorageCondition) => void;
  manipulationLocal: string;
  setManipulationLocal: (s: string) => void;
  quantity: number;
  setQuantity: (n: number) => void;
  batch: string;
  setBatch: (s: string) => void;
  supplier: string;
  setSupplier: (s: string) => void;
  displayQuantity: string;
  setDisplayQuantity: (s: string) => void;
  sizeId: string;
  setSizeId: (s: string) => void;
  rule: { storage_condition: StorageCondition; validity_value: number; validity_unit: string } | null;
  expiry: Date | null;
}) {
  return (
    <Card>
      <div className="mb-3 flex items-center gap-3 rounded-lg bg-neutral-50 p-3">
        <Package size={18} className="text-neutral-500" />
        <div>
          <p className="text-sm font-medium text-neutral-800">{product.name}</p>
          {expiry && (
            <p className="text-xs text-emerald-600">
              Vence {formatDateTime(expiry)}
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <Select
          label="Condição de armazenamento"
          value={condition}
          onChange={(e) => setCondition(e.target.value as StorageCondition)}
          disabled={product.product_shelf_lives.length === 0}
        >
          {product.product_shelf_lives.map((r) => (
            <option key={r.storage_condition} value={r.storage_condition}>
              {STORAGE_CONDITION_LABELS[r.storage_condition]} —{' '}
              {r.validity_value}{' '}
              {r.validity_unit === 'hours' ? 'horas' : 'dias'}
            </option>
          ))}
        </Select>
        {!rule && (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
            Este produto não tem regra de validade cadastrada. Vá em
            Cadastros → Produtos.
          </p>
        )}

        <Input
          id="manip"
          label="Data e hora da manipulação"
          type="datetime-local"
          value={manipulationLocal}
          onChange={(e) => setManipulationLocal(e.target.value)}
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            id="qty"
            label="Quantidade (etiquetas)"
            type="number"
            min={1}
            value={quantity}
            onChange={(e) =>
              setQuantity(Math.max(1, Number(e.target.value) || 1))
            }
          />
          <Select
            label="Tamanho"
            value={sizeId}
            onChange={(e) => setSizeId(e.target.value)}
          >
            {LABEL_SIZES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </Select>
        </div>

        <Input
          id="display-qty"
          label="Quantidade impressa (opcional)"
          value={displayQuantity}
          onChange={(e) => setDisplayQuantity(e.target.value)}
          placeholder='Ex.: "500 g"'
        />

        <details className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
          <summary className="cursor-pointer text-xs font-medium uppercase tracking-wide text-neutral-500">
            Lote / fornecedor (opcional)
          </summary>
          <div className="mt-3 flex flex-col gap-3">
            <Input
              id="batch"
              label="Lote"
              value={batch}
              onChange={(e) => setBatch(e.target.value)}
            />
            <Input
              id="supplier"
              label="Fornecedor / marca"
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
            />
          </div>
        </details>
      </div>
    </Card>
  );
}

function Step5({
  labelData,
  size,
  quantity,
  canPrint,
  onPrint,
}: {
  labelData: LabelData;
  size: LabelSize;
  quantity: number;
  canPrint: boolean;
  onPrint: () => void;
}) {
  return (
    <Card>
      <div className="flex flex-col items-center gap-3">
        <p className="text-sm font-medium text-neutral-700">Prévia</p>
        <div className="w-full max-w-full overflow-x-auto">
          <div className="mx-auto w-fit">
            <LabelPreview data={labelData} widthMm={size.w} heightMm={size.h} />
          </div>
        </div>
        <Button onClick={onPrint} disabled={!canPrint} className="w-full sm:w-auto">
          <Printer size={18} />
          Imprimir {quantity > 1 ? `${quantity} etiquetas` : 'etiqueta'}
        </Button>
        <p className="text-xs text-neutral-400">
          Sai pelo diálogo de impressão do sistema no tamanho exato.
        </p>
      </div>
    </Card>
  );
}
