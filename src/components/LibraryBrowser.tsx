import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Globe, Copy } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Spinner } from './ui/Spinner';

type LibraryKind = 'audit' | 'checklist' | 'product';

interface LibraryRow {
  id: string;
  name: string;
  details?: string;
}

interface LibraryBrowserProps {
  open: boolean;
  onClose: () => void;
  kind: LibraryKind;
  companyId: string | null;
  onCloned: () => void;
}

const CONFIG: Record<
  LibraryKind,
  {
    table: string;
    flag: string;
    rpc: string;
    title: string;
  }
> = {
  audit: {
    table: 'audit_templates',
    flag: 'is_global',
    rpc: 'clone_audit_template',
    title: 'Modelos oficiais de auditoria',
  },
  checklist: {
    table: 'checklist_templates',
    flag: 'is_global',
    rpc: 'clone_checklist_template',
    title: 'Modelos oficiais de checklist',
  },
  product: {
    table: 'products',
    flag: 'is_seed',
    rpc: 'clone_seed_product',
    title: 'Catálogo seed de produtos',
  },
};

export function LibraryBrowser({
  open,
  onClose,
  kind,
  companyId,
  onCloned,
}: LibraryBrowserProps) {
  const cfg = CONFIG[kind];
  const [rows, setRows] = useState<LibraryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [cloning, setCloning] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    const select =
      kind === 'product'
        ? 'id, name, category, default_storage_condition'
        : kind === 'checklist'
          ? 'id, name, frequency'
          : 'id, name';
    void supabase
      .from(cfg.table)
      .select(select)
      .eq(cfg.flag, true)
      .order('name')
      .then(({ data, error }) => {
        setLoading(false);
        if (error) {
          toast.error('Erro: ' + error.message);
          return;
        }
        const list = (
          (data ?? []) as unknown as Array<Record<string, unknown>>
        ).map((d) => ({
          id: d.id as string,
          name: d.name as string,
          details:
            kind === 'product'
              ? [d.category, d.default_storage_condition]
                  .filter(Boolean)
                  .join(' · ')
              : kind === 'checklist'
                ? (d.frequency as string)
                : undefined,
        }));
        setRows(list);
      });
  }, [open, kind, cfg.table, cfg.flag]);

  async function handleClone(row: LibraryRow) {
    if (!companyId) {
      toast.error('Selecione uma empresa antes.');
      return;
    }
    setCloning(row.id);
    const params =
      kind === 'audit'
        ? { p_template_id: row.id, p_company_id: companyId }
        : kind === 'checklist'
          ? { p_template_id: row.id, p_company_id: companyId }
          : { p_product_id: row.id, p_company_id: companyId };
    const { error } = await supabase.rpc(cfg.rpc, params);
    setCloning(null);
    if (error) {
      toast.error('Erro ao clonar: ' + error.message);
      return;
    }
    toast.success(`"${row.name}" copiado para sua empresa.`);
    onCloned();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={cfg.title}
      footer={
        <Button variant="secondary" onClick={onClose}>
          Fechar
        </Button>
      }
    >
      <div className="space-y-2">
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          <Globe size={11} className="mr-1 inline" />
          Modelos publicados pela plataforma. Clique em "Usar como modelo" para
          criar uma cópia editável dentro da sua empresa.
        </p>
        {loading ? (
          <div className="flex justify-center py-6">
            <Spinner />
          </div>
        ) : rows.length === 0 ? (
          <p className="py-4 text-center text-sm text-neutral-500 dark:text-neutral-400">
            Nenhum modelo oficial publicado nesta categoria ainda.
          </p>
        ) : (
          <div className="max-h-96 space-y-1 overflow-y-auto">
            {rows.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-neutral-200 px-3 py-2 dark:border-neutral-700"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{r.name}</p>
                  {r.details ? (
                    <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">
                      {r.details}
                    </p>
                  ) : null}
                </div>
                <button
                  onClick={() => void handleClone(r)}
                  disabled={cloning === r.id || !companyId}
                  className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-neutral-900 px-2 py-1 text-xs text-white hover:bg-neutral-800 disabled:opacity-50"
                >
                  <Copy size={11} />
                  {cloning === r.id ? '...' : 'Usar como modelo'}
                </button>
              </div>
            ))}
          </div>
        )}
        {!companyId ? (
          <p className="text-xs text-amber-600">
            Selecione uma empresa antes de clonar.
          </p>
        ) : null}
      </div>
    </Modal>
  );
}
