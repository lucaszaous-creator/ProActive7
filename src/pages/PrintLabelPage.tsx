import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Printer, Bluetooth, BluetoothOff } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useCompanyScope } from '@/lib/useCompanyScope';
import { computeExpiry, formatDateTime, toLocalInputValue } from '@/lib/dates';
import {
  STORAGE_CONDITION_LABELS,
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
import { buildLabelEscPos } from '@/lib/escpos';
import {
  isBluetoothSupported,
  pairPrinter,
  getConnectedName,
  printBytes,
} from '@/lib/bluetoothPrinter';

interface LabelPrintInsert {
  id: string;
  company_id: string;
  product_id: string;
  product_name_snapshot: string;
  storage_condition: StorageCondition;
  manipulation_at: string;
  expiry_at: string;
  responsible_name: string;
  quantity: number;
  printed_by: string | null;
}

interface LabelSize {
  id: string;
  label: string;
  w: number;
  h: number;
}

const LABEL_SIZES: LabelSize[] = [
  { id: '40x60', label: '40 x 60 mm', w: 40, h: 60 },
  { id: '60x40', label: '60 x 40 mm', w: 60, h: 40 },
  { id: '50x30', label: '50 x 30 mm', w: 50, h: 30 },
  { id: '33x22', label: '33 x 22 mm', w: 33, h: 22 },
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

export function PrintLabelPage() {
  const { profile } = useAuth();
  const {
    isMaster,
    companies,
    companyId,
    setCompanyId,
    companyName,
    companyLogoUrl,
  } = useCompanyScope();

  const [products, setProducts] = useState<ProductWithShelfLives[]>([]);
  const [loading, setLoading] = useState(true);

  const [productId, setProductId] = useState('');
  const [condition, setCondition] = useState<StorageCondition>('refrigerado');
  const [manipulationLocal, setManipulationLocal] = useState(() =>
    toLocalInputValue(new Date()),
  );
  const [responsible, setResponsible] = useState(profile?.full_name ?? '');
  const [quantity, setQuantity] = useState(1);
  const [sizeId, setSizeId] = useState(LABEL_SIZES[0].id);
  const [labelId, setLabelId] = useState(() => crypto.randomUUID());
  const [confirmPrint, setConfirmPrint] = useState<LabelPrintInsert | null>(
    null,
  );
  const [savingPrint, setSavingPrint] = useState(false);

  const [outputMode, setOutputMode] = useState<'system' | 'bluetooth'>(
    'system',
  );
  const [printerName, setPrinterName] = useState<string | null>(() =>
    getConnectedName(),
  );
  const [pairing, setPairing] = useState(false);
  const btSupported = isBluetoothSupported();

  // Regera o id sempre que algum campo da etiqueta muda, garantindo que o
  // QR impresso aponte para o registro que sera criado.
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

  useEffect(() => {
    if (!companyId) {
      setProducts([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    supabase
      .from('products')
      .select('*, product_shelf_lives(*)')
      .eq('company_id', companyId)
      .eq('active', true)
      .order('name')
      .then(({ data, error }) => {
        setLoading(false);
        if (error) {
          toast.error('Erro ao carregar produtos: ' + error.message);
          return;
        }
        setProducts((data as ProductWithShelfLives[] | null) ?? []);
      });
  }, [companyId]);

  const selectedProduct = products.find((p) => p.id === productId) ?? null;
  const rules = selectedProduct?.product_shelf_lives ?? [];

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

  const rule = rules.find((r) => r.storage_condition === condition) ?? null;
  const manipDate = manipulationLocal ? new Date(manipulationLocal) : null;
  const manipValid = manipDate !== null && !Number.isNaN(manipDate.getTime());
  const expiry =
    manipValid && rule
      ? computeExpiry(manipDate, rule.validity_value, rule.validity_unit)
      : null;

  const size = LABEL_SIZES.find((s) => s.id === sizeId) ?? LABEL_SIZES[0];

  const labelData: LabelData = {
    companyName,
    companyLogoUrl,
    productName: selectedProduct?.name ?? '',
    storageConditionLabel: STORAGE_CONDITION_LABELS[condition],
    manipulationText: manipValid ? formatDateTime(manipDate) : '',
    expiryText: expiry ? formatDateTime(expiry) : '',
    qrUrl:
      typeof window !== 'undefined'
        ? `${window.location.origin}/etiqueta/${labelId}`
        : `/etiqueta/${labelId}`,
    responsibleName: responsible,
  };

  const canPrint =
    Boolean(selectedProduct) &&
    rule !== null &&
    expiry !== null &&
    responsible.trim().length > 0 &&
    quantity >= 1;

  async function handlePrint() {
    if (!canPrint || !selectedProduct || !rule || !expiry || !manipDate) {
      toast.error('Preencha produto, condição, data e responsável.');
      return;
    }
    const insertPayload: LabelPrintInsert = {
      id: labelId,
      company_id: companyId,
      product_id: selectedProduct.id,
      product_name_snapshot: selectedProduct.name,
      storage_condition: condition,
      manipulation_at: manipDate.toISOString(),
      expiry_at: expiry.toISOString(),
      responsible_name: responsible.trim(),
      quantity,
      printed_by: profile?.id ?? null,
    };

    if (outputMode === 'bluetooth') {
      if (!printerName) {
        toast.error('Pareie uma impressora Bluetooth primeiro.');
        return;
      }
      try {
        const bytes = buildLabelEscPos({
          companyName,
          productName: selectedProduct.name,
          storageConditionLabel: STORAGE_CONDITION_LABELS[condition],
          manipulationText: formatDateTime(manipDate),
          expiryText: formatDateTime(expiry),
          responsibleName: responsible.trim(),
          qrUrl: labelData.qrUrl,
        });
        for (let i = 0; i < quantity; i++) {
          await printBytes(bytes);
        }
      } catch (e) {
        toast.error('Falha ao imprimir: ' + (e as Error).message);
        return;
      }
    } else {
      applyPageStyle(size.w, size.h);
      window.print();
    }

    setConfirmPrint(insertPayload);
  }

  async function handlePair() {
    setPairing(true);
    try {
      const name = await pairPrinter();
      setPrinterName(name);
      toast.success(`Impressora pareada: ${name}`);
    } catch (e) {
      const msg = (e as Error).message;
      // Cancelar o seletor do navegador nao e um erro real.
      if (!/cancell?ed|user/i.test(msg)) toast.error('Erro: ' + msg);
    } finally {
      setPairing(false);
    }
  }

  async function confirmPrinted() {
    if (!confirmPrint) return;
    setSavingPrint(true);
    const { error } = await supabase.from('label_prints').insert(confirmPrint);
    setSavingPrint(false);
    setConfirmPrint(null);
    if (error) {
      toast.error('Falha ao registrar a etiqueta: ' + error.message);
      return;
    }
    toast.success('Etiqueta registrada no histórico.');
  }

  const noCompany = isMaster && companies.length === 0;

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-5">
        <h1 className="text-xl font-semibold text-neutral-800 sm:text-2xl">
          Imprimir Etiqueta
        </h1>
        <p className="text-sm text-neutral-500">
          A etiqueta sai no tamanho exato pela impressora térmica.
        </p>
      </div>

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
        <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
          <Card>
            <div className="flex flex-col gap-4">
              {isMaster && companies.length > 0 && (
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
              )}

              <Select
                label="Produto"
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
              >
                <option value="">Selecione um produto</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>

              {selectedProduct && rules.length === 0 && (
                <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
                  Este produto não tem regras de validade. Cadastre em Produtos.
                </p>
              )}

              <Select
                label="Condição de armazenamento"
                value={condition}
                onChange={(e) =>
                  setCondition(e.target.value as StorageCondition)
                }
                disabled={rules.length === 0}
              >
                {rules.map((r) => (
                  <option key={r.storage_condition} value={r.storage_condition}>
                    {STORAGE_CONDITION_LABELS[r.storage_condition]} —{' '}
                    {r.validity_value}{' '}
                    {r.validity_unit === 'hours' ? 'horas' : 'dias'}
                  </option>
                ))}
              </Select>

              <Input
                id="manip"
                label="Data e hora da manipulação / abertura"
                type="datetime-local"
                value={manipulationLocal}
                onChange={(e) => setManipulationLocal(e.target.value)}
              />

              <Input
                id="resp"
                label="Responsável"
                value={responsible}
                onChange={(e) => setResponsible(e.target.value)}
                placeholder="Nome de quem manipulou"
              />

              <div className="grid grid-cols-2 gap-3">
                <Input
                  id="qty"
                  label="Quantidade"
                  type="number"
                  min={1}
                  value={quantity}
                  onChange={(e) =>
                    setQuantity(Math.max(1, Number(e.target.value) || 1))
                  }
                />
                <Select
                  label="Tamanho da etiqueta"
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

              <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500">
                  Saída
                </p>
                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="output"
                      checked={outputMode === 'system'}
                      onChange={() => setOutputMode('system')}
                      className="accent-emerald-600"
                    />
                    Impressora do sistema (diálogo)
                  </label>
                  <label
                    className={`flex items-center gap-2 text-sm ${
                      btSupported ? '' : 'opacity-60'
                    }`}
                  >
                    <input
                      type="radio"
                      name="output"
                      checked={outputMode === 'bluetooth'}
                      onChange={() => setOutputMode('bluetooth')}
                      disabled={!btSupported}
                      className="accent-emerald-600"
                    />
                    Bluetooth térmica
                  </label>
                </div>

                {outputMode === 'bluetooth' && btSupported ? (
                  <div className="mt-3 flex items-center justify-between gap-2 text-xs">
                    <span className="flex items-center gap-1 text-neutral-600">
                      {printerName ? (
                        <>
                          <Bluetooth size={14} className="text-emerald-600" />
                          {printerName}
                        </>
                      ) : (
                        <>
                          <BluetoothOff size={14} />
                          Nenhuma impressora pareada
                        </>
                      )}
                    </span>
                    <button
                      type="button"
                      onClick={handlePair}
                      disabled={pairing}
                      className="rounded bg-neutral-200 px-2 py-1 text-xs font-medium hover:bg-neutral-300 disabled:opacity-60"
                    >
                      {pairing
                        ? 'Pareando...'
                        : printerName
                          ? 'Trocar'
                          : 'Parear'}
                    </button>
                  </div>
                ) : null}

                {!btSupported ? (
                  <p className="mt-2 text-xs text-neutral-400">
                    Bluetooth disponível apenas em Chrome/Edge (Android e
                    desktop). Suporta impressoras BLE genéricas (58/80mm); para
                    Elgin/Bematech use o modo do sistema.
                  </p>
                ) : null}
              </div>

              <Button onClick={handlePrint} disabled={!canPrint}>
                <Printer size={18} />
                Imprimir {quantity > 1 ? `${quantity} etiquetas` : 'etiqueta'}
              </Button>
              <p className="text-xs text-neutral-400">
                Configure o driver da impressora uma vez: papel no tamanho da
                etiqueta, margens zero e escala 100%.
              </p>
            </div>
          </Card>

          <Card className="flex flex-col items-center gap-3">
            <p className="text-sm font-medium text-neutral-700">Prévia</p>
            <LabelPreview data={labelData} widthMm={size.w} heightMm={size.h} />
            {expiry && (
              <p className="text-xs text-neutral-500">
                Validade calculada: {formatDateTime(expiry)}
              </p>
            )}
          </Card>
        </div>
      )}

      {/* Área exclusiva de impressão: fora da tela, revelada pelo @media print */}
      <div id="print-label-area" className="absolute -left-[9999px] top-0">
        {Array.from({ length: quantity }).map((_, i) => (
          <div
            key={i}
            style={{ breakAfter: i < quantity - 1 ? 'page' : 'auto' }}
          >
            <LabelPreview data={labelData} widthMm={size.w} heightMm={size.h} />
          </div>
        ))}
      </div>

      <ConfirmDialog
        open={confirmPrint !== null}
        title="Confirmar impressão"
        message="A etiqueta foi impressa corretamente? Confirme para registrar no histórico."
        confirmLabel="Sim, registrar"
        loading={savingPrint}
        onConfirm={confirmPrinted}
        onCancel={() => setConfirmPrint(null)}
      />
    </div>
  );
}
