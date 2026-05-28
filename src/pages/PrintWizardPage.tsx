import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
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
  Layers,
  X,
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
import {
  isAgentOnline,
  queueDirectPrint,
  subscribePrintJob,
  type PrintAgent,
} from '@/lib/printAgent';

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
  let el = document.getElementById(
    'print-page-style',
  ) as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement('style');
    el.id = 'print-page-style';
    document.head.appendChild(el);
  }
  el.textContent = `@page { size: ${w}mm ${h}mm; margin: 0; }`;
}

type Step = 1 | 2 | 3 | 4 | 5;
type Mode = 'single' | 'batch';

interface BatchItem {
  label_id: string;
  product_id: string;
  quantity: number;
  batch: string;
  supplier: string;
}

const STEP_META: Record<Step, { titleKey: string; icon: typeof HardHat }> = {
  1: { titleKey: 'Manipulador', icon: HardHat },
  2: { titleKey: 'Grupo', icon: Tag },
  3: { titleKey: 'Produto', icon: Package },
  4: { titleKey: 'Informações', icon: Settings2 },
  5: { titleKey: 'Imprimir', icon: Printer },
};

// Resolve a regra de validade de um produto pra modo lote (sem perguntar
// condição ao usuário): usa default_storage_condition; se não houver
// shelf_life pra ela, cai no primeiro disponível.
function resolveBatchRule(product: ProductWithShelfLives) {
  const rules = product.product_shelf_lives;
  return (
    rules.find(
      (r) => r.storage_condition === product.default_storage_condition,
    ) ??
    rules[0] ??
    null
  );
}

export function PrintWizardPage() {
  usePageTitle('Imprimir — modo rápido');
  const { profile } = useAuth();
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
  const [mode, setMode] = useState<Mode>('single');
  const [batchItems, setBatchItems] = useState<BatchItem[]>([]);

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
  }, [
    productId,
    condition,
    manipulationLocal,
    responsible,
    quantity,
    companyId,
  ]);

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

  // Em batch: cada item precisa ter regra de validade + qtd > 0
  const batchValid =
    batchItems.length >= 1 &&
    batchItems.every((it) => {
      const p = products.find((pp) => pp.id === it.product_id);
      if (!p) return false;
      if (it.quantity < 1) return false;
      return resolveBatchRule(p) !== null;
    });
  const totalBatchLabels = batchItems.reduce((s, it) => s + it.quantity, 0);

  const stepValid: Record<Step, boolean> = {
    1: responsible.trim().length > 0,
    2: true, // grupo é opcional (pode pular como "Todos")
    3: mode === 'single' ? Boolean(productId) : batchValid,
    4:
      mode === 'single'
        ? manipValid && rule !== null && quantity >= 1
        : manipValid && batchValid,
    5: mode === 'single' ? canPrint : manipValid && batchValid,
  };

  function handlePrint() {
    if (mode === 'single' && !canPrint) return;
    if (mode === 'batch' && !batchValid) return;
    applyPageStyle(size.w, size.h);
    window.print();
    setConfirmOpen(true);
  }

  async function confirmPrintedSingle() {
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

  async function confirmPrintedBatch() {
    if (!manipDate || !manipValid) return;
    setSavingPrint(true);
    const rows = batchItems
      .map((it) => {
        const product = products.find((p) => p.id === it.product_id);
        if (!product) return null;
        const r = resolveBatchRule(product);
        if (!r) return null;
        const exp = computeExpiry(manipDate, r.validity_value, r.validity_unit);
        return {
          id: it.label_id,
          company_id: companyId,
          product_id: product.id,
          product_name_snapshot: product.name,
          storage_condition: r.storage_condition,
          manipulation_at: manipDate.toISOString(),
          expiry_at: exp.toISOString(),
          responsible_name: responsible.trim(),
          quantity: it.quantity,
          batch: it.batch.trim() || null,
          supplier: it.supplier.trim() || null,
          display_quantity: null,
          allergens: product.allergens ?? [],
          printed_by: profile?.id ?? null,
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);

    const { error } = await supabase.from('label_prints').insert(rows);
    setSavingPrint(false);
    setConfirmOpen(false);
    if (error) {
      toast.error('Falha ao registrar as etiquetas: ' + error.message);
      return;
    }
    toast.success(
      `${rows.length} ${rows.length === 1 ? 'etiqueta' : 'etiquetas'} registradas (${totalBatchLabels} ${totalBatchLabels === 1 ? 'cópia' : 'cópias'}).`,
    );
    void logFeatureEvent('label_batch_printed');
    // reseta o lote mantendo o manipulador
    setBatchItems([]);
    setStep(2);
    setProductId('');
  }

  function confirmPrinted() {
    if (mode === 'single') void confirmPrintedSingle();
    else void confirmPrintedBatch();
  }

  const noCompany = isMaster && companies.length === 0;

  return (
    <div className="mx-auto max-w-2xl">
      {/* Header com progresso */}
      <div className="mb-4">
        <h1 className="text-xl font-semibold text-neutral-800 sm:text-2xl">
          Imprimir etiqueta
        </h1>
        <p className="text-sm text-neutral-500">
          Siga os passos — nenhum campo precisa ser digitado.
        </p>
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
          <p className="text-sm text-neutral-600">
            Nenhuma empresa cadastrada.
          </p>
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
          {step === 3 && mode === 'single' && (
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
              onSwitchToBatch={() => {
                setMode('batch');
                if (productId) {
                  // pré-popula o lote com o produto que estava selecionado
                  setBatchItems([
                    {
                      label_id: crypto.randomUUID(),
                      product_id: productId,
                      quantity: 1,
                      batch: '',
                      supplier: '',
                    },
                  ]);
                  setProductId('');
                }
              }}
            />
          )}
          {step === 3 && mode === 'batch' && (
            <Step3Batch
              products={filteredProducts}
              batchItems={batchItems}
              setBatchItems={setBatchItems}
              search={productSearch}
              setSearch={setProductSearch}
              groupName={
                groupId === 'all'
                  ? 'Todos os grupos'
                  : (groups.find((g) => g.id === groupId)?.name ?? '—')
              }
              onSwitchToSingle={() => {
                setMode('single');
                setBatchItems([]);
              }}
            />
          )}
          {step === 4 && mode === 'single' && selectedProduct && (
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
          {step === 4 && mode === 'batch' && (
            <Step4Batch
              batchItems={batchItems}
              products={products}
              manipulationLocal={manipulationLocal}
              setManipulationLocal={setManipulationLocal}
              sizeId={sizeId}
              setSizeId={setSizeId}
              manipDate={manipDate}
            />
          )}
          {step === 5 && mode === 'single' && (
            <Step5
              labelData={labelData}
              size={size}
              quantity={quantity}
              canPrint={canPrint}
              onPrint={handlePrint}
              companyId={companyId}
              labelId={labelId}
              profileId={profile?.id ?? null}
            />
          )}
          {step === 5 && mode === 'batch' && (
            <Step5Batch
              batchItems={batchItems}
              products={products}
              size={size}
              manipDate={manipDate}
              totalLabels={totalBatchLabels}
              canPrint={batchValid && manipValid}
              onPrint={handlePrint}
              companyName={companyName}
              companyLogoUrl={companyLogoUrl}
              companyCnpj={selectedCompany?.cnpj ?? null}
              companyAddress={selectedCompany?.address ?? null}
              primaryColor={companyPrimaryColor}
              responsible={responsible}
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
                {mode === 'batch' && step === 3 && batchItems.length > 0
                  ? `Avançar (${batchItems.length} ${batchItems.length === 1 ? 'produto' : 'produtos'})`
                  : 'Avançar'}
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
              {mode === 'single'
                ? Array.from({ length: quantity }).map((_, i) => (
                    <div
                      key={i}
                      style={{
                        breakAfter: i < quantity - 1 ? 'page' : 'auto',
                      }}
                    >
                      <LabelPreview
                        data={labelData}
                        widthMm={size.w}
                        heightMm={size.h}
                      />
                    </div>
                  ))
                : (() => {
                    // Pré-calcula o total para saber qual é o último (sem
                    // breakAfter pra não gerar página extra em branco).
                    const total = batchItems.reduce(
                      (s, it) => s + it.quantity,
                      0,
                    );
                    const cells: React.ReactNode[] = [];
                    let printedIdx = 0;
                    if (!manipDate || !manipValid) return cells;
                    batchItems.forEach((it) => {
                      const prod = products.find((p) => p.id === it.product_id);
                      if (!prod) return;
                      const r = resolveBatchRule(prod);
                      if (!r) return;
                      const exp = computeExpiry(
                        manipDate,
                        r.validity_value,
                        r.validity_unit,
                      );
                      const data: LabelData = {
                        companyName,
                        companyLogoUrl,
                        companyCnpj: selectedCompany?.cnpj ?? null,
                        companyAddress: selectedCompany?.address ?? null,
                        primaryColor: companyPrimaryColor,
                        productName: prod.name,
                        storageConditionLabel:
                          STORAGE_CONDITION_LABELS[r.storage_condition],
                        displayQuantity: null,
                        manipulationText: formatDateTime(manipDate),
                        expiryText: formatDateTime(exp),
                        originalExpiryText: null,
                        batch: it.batch.trim() || null,
                        supplier: it.supplier.trim() || null,
                        printId: it.label_id
                          .replace(/-/g, '')
                          .slice(0, 6)
                          .toUpperCase(),
                        allergens: prod.allergens ?? [],
                        qrUrl: `${SITE_URL}/etiqueta/${it.label_id}`,
                        responsibleName: responsible,
                      };
                      for (let i = 0; i < it.quantity; i++) {
                        const isLast = printedIdx === total - 1;
                        cells.push(
                          <div
                            key={`${it.label_id}-${i}`}
                            style={{ breakAfter: isLast ? 'auto' : 'page' }}
                          >
                            <LabelPreview
                              data={data}
                              widthMm={size.w}
                              heightMm={size.h}
                            />
                          </div>,
                        );
                        printedIdx++;
                      }
                    });
                    return cells;
                  })()}
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
        <div className="flex flex-col gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-medium">Nenhum funcionário cadastrado.</p>
          <p className="text-amber-800">
            Para imprimir uma etiqueta, cadastre os manipuladores em Cadastros →
            Funcionários. O nome do responsável é registrado automaticamente ao
            escolher na lista — nada digitado à mão.
          </p>
          <Link to="/manipuladores">
            <Button size="sm">
              <HardHat size={14} />
              Cadastrar funcionários
            </Button>
          </Link>
        </div>
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
                    isSelected
                      ? 'bg-emerald-600 text-white'
                      : 'bg-neutral-100 text-neutral-500'
                  }`}
                >
                  <HardHat size={16} />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-neutral-800">
                    {m.full_name}
                  </p>
                  {m.role && (
                    <p className="truncate text-xs text-neutral-500">
                      {m.role}
                    </p>
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
          Nenhum grupo cadastrado. Vá em Cadastros → Grupos para organizar os
          produtos.
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
  onSwitchToBatch,
}: {
  products: ProductWithShelfLives[];
  productId: string;
  setProductId: (id: string) => void;
  search: string;
  setSearch: (s: string) => void;
  groupName: string;
  onSwitchToBatch: () => void;
}) {
  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-neutral-700">Produto</h2>
        <span className="rounded bg-neutral-100 px-2 py-0.5 text-xs text-neutral-500">
          {groupName}
        </span>
      </div>
      <button
        onClick={onSwitchToBatch}
        className="mb-3 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-100"
      >
        <Layers size={16} />
        Imprimir vários produtos
      </button>
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
                  {isSelected && (
                    <Check size={16} className="text-emerald-600" />
                  )}
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
  rule: {
    storage_condition: StorageCondition;
    validity_value: number;
    validity_unit: string;
  } | null;
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
            Este produto não tem regra de validade cadastrada. Vá em Cadastros →
            Produtos.
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
  companyId,
  labelId,
  profileId,
}: {
  labelData: LabelData;
  size: LabelSize;
  quantity: number;
  canPrint: boolean;
  onPrint: () => void;
  companyId: string;
  labelId: string;
  profileId: string | null;
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
        <DirectPrintBlock
          companyId={companyId}
          labelId={labelId}
          profileId={profileId}
          labelData={labelData}
          widthMm={size.w}
          heightMm={size.h}
          copies={quantity}
          canPrint={canPrint}
        />
        <details className="w-full">
          <summary className="cursor-pointer text-xs text-neutral-500">
            Sem agente? Usar diálogo do navegador
          </summary>
          <div className="mt-3 flex flex-col items-center gap-2">
            <Button
              variant="ghost"
              onClick={onPrint}
              disabled={!canPrint}
              className="w-full sm:w-auto"
            >
              <Printer size={18} />
              Imprimir via diálogo do sistema
            </Button>
            <p className="text-xs text-neutral-400">
              Sai pelo diálogo de impressão do navegador no tamanho exato.
            </p>
          </div>
        </details>
      </div>
    </Card>
  );
}

function DirectPrintBlock({
  companyId,
  labelId,
  profileId,
  labelData,
  widthMm,
  heightMm,
  copies,
  canPrint,
}: {
  companyId: string;
  labelId: string;
  profileId: string | null;
  labelData: LabelData;
  widthMm: number;
  heightMm: number;
  copies: number;
  canPrint: boolean;
}) {
  const [agents, setAgents] = useState<PrintAgent[]>([]);
  const [agentId, setAgentId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<
    'idle' | 'queued' | 'printing' | 'done' | 'error'
  >('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { data } = await supabase
        .from('print_agents')
        .select('*')
        .eq('company_id', companyId)
        .eq('active', true)
        .order('created_at', { ascending: false });
      if (cancelled) return;
      const list = (data as PrintAgent[]) ?? [];
      setAgents(list);
      const online = list.find(isAgentOnline);
      setAgentId(online?.id ?? list[0]?.id ?? '');
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [companyId]);

  const selected = agents.find((a) => a.id === agentId) ?? null;
  const online = selected ? isAgentOnline(selected) : false;

  async function handleDirectPrint() {
    if (!selected) return;
    setSending(true);
    setErrorMsg(null);
    setStatus('queued');
    try {
      const jobId = await queueDirectPrint({
        agent: selected,
        labelData,
        widthMm,
        heightMm,
        copies,
        companyId,
        labelId,
        createdBy: profileId,
      });
      const unsub = subscribePrintJob(jobId, (job) => {
        setStatus(job.status);
        if (job.status === 'error') setErrorMsg(job.error);
        if (job.status === 'done' || job.status === 'error') {
          setSending(false);
          setTimeout(unsub, 100);
          if (job.status === 'done') {
            void logFeatureEvent('label_printed_direct');
            toast.success('Impresso!');
          } else {
            toast.error('Falha: ' + (job.error ?? 'erro'));
          }
        }
      });
      // Timeout de segurança — se o agente não responder em 60s
      setTimeout(() => {
        if (sending) {
          setSending(false);
          setStatus('error');
          setErrorMsg('Agente não respondeu em 60s');
          unsub();
        }
      }, 60_000);
    } catch (e) {
      setSending(false);
      setStatus('error');
      setErrorMsg(String(e));
      toast.error('Erro ao enfileirar: ' + String(e));
    }
  }

  if (loading) {
    return (
      <div className="flex w-full justify-center py-2">
        <Spinner className="h-5 w-5" />
      </div>
    );
  }

  if (agents.length === 0) {
    return (
      <div className="w-full rounded border border-dashed border-neutral-300 bg-neutral-50 p-3 text-xs text-neutral-600">
        Nenhuma impressora térmica cadastrada. Vá em{' '}
        <Link to="/admin/impressoras" className="font-medium text-emerald-700">
          Admin → Impressoras
        </Link>{' '}
        para configurar a impressão direta sem diálogo.
      </div>
    );
  }

  return (
    <div className="w-full space-y-2 rounded border border-emerald-200 bg-emerald-50 p-3">
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="font-semibold uppercase text-emerald-800">
          Impressão direta
        </span>
        <span
          className={
            online
              ? 'inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 font-medium text-emerald-700'
              : 'inline-flex items-center gap-1 rounded-full bg-neutral-200 px-2 py-0.5 font-medium text-neutral-600'
          }
        >
          {online ? 'Online' : 'Offline'}
        </span>
      </div>
      <Select
        value={agentId}
        onChange={(e) => setAgentId(e.target.value)}
        disabled={sending}
      >
        {agents.map((a) => (
          <option key={a.id} value={a.id}>
            {a.name}
            {isAgentOnline(a) ? ' • Online' : ' • Offline'}
          </option>
        ))}
      </Select>
      <Button
        onClick={handleDirectPrint}
        disabled={!canPrint || !selected || !online || sending}
        className="w-full"
      >
        <Printer size={16} />
        {sending
          ? status === 'printing'
            ? 'Imprimindo…'
            : 'Enviando…'
          : `Imprimir direto ${copies > 1 ? `(${copies})` : ''}`}
      </Button>
      {!online && selected && (
        <p className="text-xs text-amber-700">
          Agente offline — abra o programa no PC da cozinha ou use o diálogo
          abaixo.
        </p>
      )}
      {status === 'done' && (
        <p className="text-xs font-medium text-emerald-700">Impresso!</p>
      )}
      {status === 'error' && errorMsg && (
        <p className="text-xs text-red-700">{errorMsg}</p>
      )}
    </div>
  );
}

// ---------------- Sub-componentes do modo lote ----------------

function Step3Batch({
  products,
  batchItems,
  setBatchItems,
  search,
  setSearch,
  groupName,
  onSwitchToSingle,
}: {
  products: ProductWithShelfLives[];
  batchItems: BatchItem[];
  setBatchItems: React.Dispatch<React.SetStateAction<BatchItem[]>>;
  search: string;
  setSearch: (s: string) => void;
  groupName: string;
  onSwitchToSingle: () => void;
}) {
  const itemByProduct = new Map(batchItems.map((it) => [it.product_id, it]));

  function toggle(productId: string) {
    setBatchItems((prev) => {
      const exists = prev.find((it) => it.product_id === productId);
      if (exists) {
        return prev.filter((it) => it.product_id !== productId);
      }
      return [
        ...prev,
        {
          label_id: crypto.randomUUID(),
          product_id: productId,
          quantity: 1,
          batch: '',
          supplier: '',
        },
      ];
    });
  }

  function patch(productId: string, fields: Partial<BatchItem>) {
    setBatchItems((prev) =>
      prev.map((it) =>
        it.product_id === productId ? { ...it, ...fields } : it,
      ),
    );
  }

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-neutral-700">
          Produtos do lote
        </h2>
        <span className="rounded bg-neutral-100 px-2 py-0.5 text-xs text-neutral-500">
          {groupName}
        </span>
      </div>
      <button
        onClick={onSwitchToSingle}
        className="mb-3 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-50"
      >
        <X size={16} />
        Voltar para um produto só
      </button>

      {batchItems.length > 0 && (
        <div className="mb-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
          {batchItems.length}{' '}
          {batchItems.length === 1
            ? 'produto selecionado'
            : 'produtos selecionados'}
        </div>
      )}

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
            const item = itemByProduct.get(p.id);
            const isSelected = Boolean(item);
            const rule = resolveBatchRule(p);
            const hasNoRule = !rule;
            return (
              <li key={p.id} className="py-2">
                <label
                  className={`flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 ${
                    isSelected ? 'bg-emerald-50' : 'hover:bg-neutral-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggle(p.id)}
                    disabled={hasNoRule}
                    className="h-5 w-5 shrink-0 accent-emerald-600 disabled:opacity-50"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-neutral-800">
                      {p.name}
                    </p>
                    {hasNoRule ? (
                      <p className="truncate text-xs text-red-500">
                        Sem regra de validade — cadastre em Produtos
                      </p>
                    ) : (
                      <p className="truncate text-xs text-neutral-500">
                        {STORAGE_CONDITION_LABELS[rule.storage_condition]} ·{' '}
                        {rule.validity_value}{' '}
                        {rule.validity_unit === 'hours' ? 'h' : 'd'}
                        {p.category ? ` · ${p.category}` : ''}
                      </p>
                    )}
                  </div>
                </label>
                {item && (
                  <div className="ml-8 mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <Input
                      id={`qty-${p.id}`}
                      label="Quantidade"
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={(e) =>
                        patch(p.id, {
                          quantity: Math.max(1, Number(e.target.value) || 1),
                        })
                      }
                    />
                    <Input
                      id={`batch-${p.id}`}
                      label="Lote (opcional)"
                      value={item.batch}
                      onChange={(e) => patch(p.id, { batch: e.target.value })}
                      placeholder="Ex.: L-2026-05"
                    />
                    <details className="sm:col-span-2">
                      <summary className="cursor-pointer text-xs text-neutral-500">
                        Fornecedor (opcional)
                      </summary>
                      <div className="mt-2">
                        <Input
                          id={`supplier-${p.id}`}
                          label=""
                          value={item.supplier}
                          onChange={(e) =>
                            patch(p.id, { supplier: e.target.value })
                          }
                        />
                      </div>
                    </details>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

function Step4Batch({
  batchItems,
  products,
  manipulationLocal,
  setManipulationLocal,
  sizeId,
  setSizeId,
  manipDate,
}: {
  batchItems: BatchItem[];
  products: ProductWithShelfLives[];
  manipulationLocal: string;
  setManipulationLocal: (s: string) => void;
  sizeId: string;
  setSizeId: (s: string) => void;
  manipDate: Date | null;
}) {
  return (
    <Card>
      <h2 className="mb-3 text-sm font-semibold text-neutral-700">
        Informações compartilhadas
      </h2>
      <p className="mb-3 text-xs text-neutral-500">
        Manipulação e tamanho valem para todas as etiquetas do lote. Lote e
        fornecedor seguem o que foi informado por produto no passo anterior.
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Input
          id="manip"
          label="Data e hora da manipulação"
          type="datetime-local"
          value={manipulationLocal}
          onChange={(e) => setManipulationLocal(e.target.value)}
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

      <div className="mt-4">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
          Resumo do lote ({batchItems.length}{' '}
          {batchItems.length === 1 ? 'produto' : 'produtos'} ·{' '}
          {batchItems.reduce((s, it) => s + it.quantity, 0)} etiquetas)
        </h3>
        <ul className="divide-y divide-neutral-100 rounded-lg border border-neutral-200">
          {batchItems.map((it) => {
            const prod = products.find((p) => p.id === it.product_id);
            if (!prod || !manipDate) return null;
            const rule = resolveBatchRule(prod);
            const expiry = rule
              ? computeExpiry(
                  manipDate,
                  rule.validity_value,
                  rule.validity_unit,
                )
              : null;
            return (
              <li
                key={it.label_id}
                className="flex items-center justify-between gap-2 px-3 py-2 text-sm"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-neutral-800">
                    {prod.name}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {it.quantity}× · vence{' '}
                    {expiry ? formatDateTime(expiry) : '—'}
                    {it.batch ? ` · lote ${it.batch}` : ''}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </Card>
  );
}

function Step5Batch({
  batchItems,
  products,
  size,
  manipDate,
  totalLabels,
  canPrint,
  onPrint,
  companyName,
  companyLogoUrl,
  companyCnpj,
  companyAddress,
  primaryColor,
  responsible,
}: {
  batchItems: BatchItem[];
  products: ProductWithShelfLives[];
  size: LabelSize;
  manipDate: Date | null;
  totalLabels: number;
  canPrint: boolean;
  onPrint: () => void;
  companyName: string;
  companyLogoUrl: string | null;
  companyCnpj: string | null;
  companyAddress: string | null;
  primaryColor: string | null;
  responsible: string;
}) {
  // Mostra prévia do primeiro item como amostra — com os MESMOS dados
  // que sairão na impressão para a nutri conferir antes.
  const first = batchItems[0];
  const firstProd = first
    ? products.find((p) => p.id === first.product_id)
    : null;
  const firstRule = firstProd ? resolveBatchRule(firstProd) : null;
  const firstExpiry =
    firstProd && firstRule && manipDate
      ? computeExpiry(
          manipDate,
          firstRule.validity_value,
          firstRule.validity_unit,
        )
      : null;

  return (
    <Card>
      <div className="flex flex-col items-center gap-3">
        <p className="text-sm font-medium text-neutral-700">
          Prévia da primeira etiqueta
        </p>
        {firstProd && firstRule && firstExpiry && manipDate && first && (
          <div className="w-full max-w-full overflow-x-auto">
            <div className="mx-auto w-fit">
              <LabelPreview
                data={{
                  companyName,
                  companyLogoUrl,
                  companyCnpj,
                  companyAddress,
                  primaryColor,
                  productName: firstProd.name,
                  storageConditionLabel:
                    STORAGE_CONDITION_LABELS[firstRule.storage_condition],
                  displayQuantity: null,
                  manipulationText: formatDateTime(manipDate),
                  expiryText: formatDateTime(firstExpiry),
                  originalExpiryText: null,
                  batch: first.batch.trim() || null,
                  supplier: first.supplier.trim() || null,
                  printId: first.label_id
                    .replace(/-/g, '')
                    .slice(0, 6)
                    .toUpperCase(),
                  allergens: firstProd.allergens ?? [],
                  qrUrl: `${SITE_URL}/etiqueta/${first.label_id}`,
                  responsibleName: responsible,
                }}
                widthMm={size.w}
                heightMm={size.h}
              />
            </div>
          </div>
        )}
        <div className="text-center text-sm text-neutral-600">
          Vai imprimir <strong>{totalLabels}</strong>{' '}
          {totalLabels === 1 ? 'etiqueta' : 'etiquetas'} de{' '}
          <strong>{batchItems.length}</strong>{' '}
          {batchItems.length === 1 ? 'produto' : 'produtos'} no tamanho{' '}
          {size.label}.
        </div>
        <Button
          onClick={onPrint}
          disabled={!canPrint}
          className="w-full sm:w-auto"
        >
          <Printer size={18} />
          Imprimir {totalLabels} {totalLabels === 1 ? 'etiqueta' : 'etiquetas'}
        </Button>
        <p className="text-xs text-neutral-400">
          Cada produto sai com seu lote, fornecedor e validade próprios.
        </p>
      </div>
    </Card>
  );
}
