import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  Building2,
  ClipboardCheck,
  FileText,
  HardHat,
  Package,
  RotateCcw,
  Trash2,
  Trash,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { usePageTitle } from '@/lib/usePageTitle';
import { formatDateTime } from '@/lib/dates';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { ListSkeleton } from '@/components/ui/Skeleton';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import {
  hardDelete,
  restoreSoftDeleted,
  type SoftDeleteTable,
} from '@/lib/supabaseHelpers';

interface DeletedRow {
  table: SoftDeleteTable;
  id: string;
  label: string;
  deleted_at: string;
}

const TABLE_META: Record<
  SoftDeleteTable,
  { label: string; icon: LucideIcon; nameField: string }
> = {
  companies: { label: 'Empresa', icon: Building2, nameField: 'name' },
  products: { label: 'Produto', icon: Package, nameField: 'name' },
  audits: {
    label: 'Visita técnica',
    icon: ClipboardCheck,
    nameField: 'scheduled_at',
  },
  manipulators: {
    label: 'Manipulador',
    icon: HardHat,
    nameField: 'full_name',
  },
  documents: { label: 'Documento', icon: FileText, nameField: 'title' },
};

const TABLES: SoftDeleteTable[] = [
  'companies',
  'products',
  'audits',
  'manipulators',
  'documents',
];

export function TrashPage() {
  usePageTitle('Lixeira');
  const [rows, setRows] = useState<DeletedRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState<string | null>(null);
  const [confirmHard, setConfirmHard] = useState<DeletedRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const results: DeletedRow[] = [];
    for (const table of TABLES) {
      const meta = TABLE_META[table];
      const { data, error } = await supabase
        .from(table)
        .select(`id, deleted_at, ${meta.nameField}`)
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false })
        .limit(100);
      if (error) {
        toast.error(`${meta.label}: ${error.message}`);
        continue;
      }
      for (const r of (data as unknown as Record<string, unknown>[] | null) ??
        []) {
        results.push({
          table,
          id: r.id as string,
          deleted_at: r.deleted_at as string,
          label: String(r[meta.nameField] ?? r.id),
        });
      }
    }
    results.sort((a, b) => b.deleted_at.localeCompare(a.deleted_at));
    setLoading(false);
    setRows(results);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleRestore(row: DeletedRow) {
    setWorking(row.id);
    const err = await restoreSoftDeleted(row.table, row.id);
    setWorking(null);
    if (err) {
      toast.error(err);
      return;
    }
    toast.success('Item restaurado.');
    void load();
  }

  async function handleHardDelete() {
    if (!confirmHard) return;
    setWorking(confirmHard.id);
    const err = await hardDelete(confirmHard.table, confirmHard.id);
    setWorking(null);
    setConfirmHard(null);
    if (err) {
      toast.error(err);
      return;
    }
    toast.success('Excluído permanentemente.');
    void load();
  }

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title={
          <span className="flex items-center gap-2">
            <Trash size={22} />
            Lixeira
          </span>
        }
        subtitle={
          <>
            Itens excluídos ficam aqui por <strong>30 dias</strong> antes de
            serem apagados definitivamente. Restaure ou apague de vez.
          </>
        }
      />

      {loading ? (
        <ListSkeleton rows={5} />
      ) : rows.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <Trash
              size={32}
              className="text-neutral-300 dark:text-neutral-600"
            />
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Lixeira vazia.
            </p>
          </div>
        </Card>
      ) : (
        <Card className="!p-0">
          <ul className="flex flex-col divide-y divide-neutral-100 dark:divide-neutral-800">
            {rows.map((r) => {
              const meta = TABLE_META[r.table];
              const Icon = meta.icon;
              const busy = working === r.id;
              return (
                <li
                  key={`${r.table}-${r.id}`}
                  className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <Icon
                      size={18}
                      className="mt-0.5 shrink-0 text-neutral-400 dark:text-neutral-500"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-neutral-800 dark:text-neutral-200">
                        {meta.label} · {r.label}
                      </p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">
                        Excluído {formatDateTime(r.deleted_at)}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      onClick={() => void handleRestore(r)}
                      disabled={busy}
                      className="inline-flex items-center gap-1 rounded-lg border border-neutral-300 px-3 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-950"
                    >
                      <RotateCcw size={14} />
                      Restaurar
                    </button>
                    <button
                      onClick={() => setConfirmHard(r)}
                      disabled={busy}
                      className="inline-flex items-center gap-1 rounded-lg border border-red-300 px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-700 dark:text-red-300 dark:hover:bg-red-950"
                    >
                      <Trash2 size={14} />
                      Excluir definitivo
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      <ConfirmDialog
        open={confirmHard !== null}
        title="Excluir definitivamente"
        message={`Esta ação é IRREVERSÍVEL. "${confirmHard?.label ?? ''}" e todos os dados vinculados serão apagados para sempre. Continuar?`}
        confirmLabel="Apagar para sempre"
        onConfirm={handleHardDelete}
        onCancel={() => setConfirmHard(null)}
      />
    </div>
  );
}
