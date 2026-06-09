import { useState } from 'react';
import { toast } from 'sonner';
import Papa from 'papaparse';
import { Upload } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { validateCsvRows, type CsvValidationResult } from '@/lib/productsCsv';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';

interface ProductCsvImportProps {
  open: boolean;
  onClose: () => void;
  companyId: string;
  createdBy: string | null;
  onImported: () => void;
}

export function ProductCsvImport({
  open,
  onClose,
  companyId,
  createdBy,
  onImported,
}: ProductCsvImportProps) {
  const [parsed, setParsed] = useState<CsvValidationResult | null>(null);
  const [importing, setImporting] = useState(false);

  function handleFile(file: File | undefined) {
    if (!file) return;
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim().toLowerCase(),
      complete: (res) => {
        setParsed(validateCsvRows(res.data));
      },
      error: (err) => {
        toast.error('Erro ao ler CSV: ' + err.message);
      },
    });
  }

  async function handleImport() {
    if (!parsed || parsed.rows.length === 0) return;
    setImporting(true);
    let inserted = 0;
    let failed = 0;
    for (const row of parsed.rows) {
      const { data: prod, error: prodErr } = await supabase
        .from('products')
        .insert({
          company_id: companyId,
          name: row.name,
          category: row.category,
          default_storage_condition: row.default_storage_condition,
          active: row.active,
          created_by: createdBy,
        })
        .select('id')
        .single();
      if (prodErr || !prod) {
        failed++;
        continue;
      }
      if (row.shelf.length > 0) {
        const { error: shelfErr } = await supabase
          .from('product_shelf_lives')
          .insert(
            row.shelf.map((s) => ({
              product_id: prod.id,
              storage_condition: s.condition,
              validity_value: s.value,
              validity_unit: s.unit,
            })),
          );
        if (shelfErr) failed++;
        else inserted++;
      } else {
        inserted++;
      }
    }
    setImporting(false);
    setParsed(null);
    if (failed > 0) {
      toast.error(
        `Importação concluída com erros: ${inserted} ok, ${failed} falhas.`,
      );
    } else {
      toast.success(`${inserted} produtos importados.`);
    }
    onImported();
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        setParsed(null);
        onClose();
      }}
      title="Importar produtos via CSV"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={importing}>
            Cancelar
          </Button>
          <Button
            onClick={handleImport}
            disabled={!parsed || parsed.rows.length === 0}
            loading={importing}
          >
            Importar {parsed ? `${parsed.rows.length} produtos` : ''}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div>
          <p className="mb-2 text-sm text-neutral-700">
            Formato esperado (1ª linha = cabeçalho):
          </p>
          <code className="block overflow-x-auto rounded-lg bg-neutral-100 p-2 text-xs">
            nome,categoria,condicao_padrao,validade_ambiente,unidade_ambiente,
            validade_refrigerado,unidade_refrigerado,validade_congelado,unidade_congelado,ativo
          </code>
          <p className="mt-2 text-xs text-neutral-500">
            condicao_padrao: ambiente | refrigerado | congelado. unidade_*: dias
            | horas. Campos de validade vazios são ignorados.
          </p>
        </div>

        <label className="inline-flex cursor-pointer items-center justify-center gap-2 self-start rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800">
          <Upload size={16} />
          Escolher arquivo CSV
          <input
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              handleFile(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
        </label>

        {parsed ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700">
                {parsed.rows.length} válidos
              </span>
              {parsed.errors.length > 0 ? (
                <span className="rounded-full bg-red-50 px-2 py-0.5 text-red-700">
                  {parsed.errors.length} com erro
                </span>
              ) : null}
            </div>

            {parsed.errors.length > 0 ? (
              <div className="max-h-32 overflow-y-auto rounded-lg border border-red-200 bg-red-50 p-2 text-xs">
                {parsed.errors.map((e, i) => (
                  <div key={i} className="text-red-700">
                    Linha {e.line}: {e.message}
                  </div>
                ))}
              </div>
            ) : null}

            {parsed.rows.length > 0 ? (
              <div className="max-h-48 overflow-auto rounded-lg border border-neutral-200">
                <table className="w-full min-w-[480px] text-xs">
                  <thead className="bg-neutral-50 text-left">
                    <tr>
                      <th className="px-2 py-1">Nome</th>
                      <th className="px-2 py-1">Categoria</th>
                      <th className="px-2 py-1">Condição</th>
                      <th className="px-2 py-1">Regras</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsed.rows.map((r, i) => (
                      <tr key={i} className="border-t border-neutral-100">
                        <td className="px-2 py-1">{r.name}</td>
                        <td className="px-2 py-1 text-neutral-500">
                          {r.category ?? '—'}
                        </td>
                        <td className="px-2 py-1 text-neutral-500">
                          {r.default_storage_condition}
                        </td>
                        <td className="px-2 py-1 text-neutral-500">
                          {r.shelf.length === 0
                            ? '—'
                            : r.shelf
                                .map(
                                  (s) =>
                                    `${s.condition}: ${s.value}${
                                      s.unit === 'hours' ? 'h' : 'd'
                                    }`,
                                )
                                .join(' · ')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
