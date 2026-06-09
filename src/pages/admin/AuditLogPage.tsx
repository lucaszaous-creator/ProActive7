import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  Activity,
  Building2,
  ClipboardCheck,
  FileText,
  HardHat,
  Package,
  AlertOctagon,
  Plus,
  Pencil,
  Trash2,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { usePageTitle } from '@/lib/usePageTitle';
import { formatDateTime } from '@/lib/dates';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Spinner } from '@/components/ui/Spinner';

interface AuditLogRow {
  id: string;
  table_name: string;
  row_id: string | null;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  user_id: string | null;
  user_email: string | null;
  created_at: string;
}

const TABLE_LABELS: Record<string, { label: string; icon: LucideIcon }> = {
  products: { label: 'Produto', icon: Package },
  audits: { label: 'Visita técnica', icon: ClipboardCheck },
  non_conformities: { label: 'Não-conformidade', icon: AlertOctagon },
  manipulator_asos: { label: 'ASO', icon: HardHat },
  documents: { label: 'Documento', icon: FileText },
  companies: { label: 'Empresa', icon: Building2 },
};

const ACTION_LABEL: Record<AuditLogRow['action'], string> = {
  INSERT: 'Criado',
  UPDATE: 'Alterado',
  DELETE: 'Excluído',
};

const ACTION_COLOR: Record<AuditLogRow['action'], string> = {
  INSERT:
    'bg-neutral-100 text-neutral-700 dark:bg-neutral-950 dark:text-neutral-300',
  UPDATE: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  DELETE: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
};

const ACTION_ICON: Record<AuditLogRow['action'], LucideIcon> = {
  INSERT: Plus,
  UPDATE: Pencil,
  DELETE: Trash2,
};

function describeChange(row: AuditLogRow): string {
  const data = row.new_data ?? row.old_data;
  if (!data) return '';
  // tenta achar um campo "nome" identificador
  const nameKey = [
    'name',
    'full_name',
    'title',
    'product_name_snapshot',
    'description',
  ].find((k) => typeof data[k] === 'string');
  return nameKey
    ? String(data[nameKey])
    : `id ${row.row_id?.slice(0, 8) ?? ''}`;
}

export function AuditLogPage() {
  usePageTitle('Trilha de auditoria');
  const [rows, setRows] = useState<AuditLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableFilter, setTableFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase
      .from('audit_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);
    if (tableFilter !== 'all') q = q.eq('table_name', tableFilter);
    const { data, error } = await q;
    setLoading(false);
    if (error) {
      toast.error('Erro ao carregar trilha: ' + error.message);
      return;
    }
    setRows((data as AuditLogRow[] | null) ?? []);
  }, [tableFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.trim().toLowerCase();
    return rows.filter(
      (r) =>
        (r.user_email && r.user_email.toLowerCase().includes(q)) ||
        describeChange(r).toLowerCase().includes(q),
    );
  }, [rows, search]);

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Trilha de auditoria"
        subtitle="Quem alterou o quê e quando. Últimas 500 mudanças nas tabelas críticas para fiscalização sanitária."
      />

      <Card className="mb-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Select
            label="Tipo"
            value={tableFilter}
            onChange={(e) => setTableFilter(e.target.value)}
          >
            <option value="all">Todos</option>
            {Object.entries(TABLE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </Select>
          <Input
            label="Buscar (email / descrição)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Ex.: ariane@..., Filet Mignon"
          />
        </div>
      </Card>

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-8 w-8" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <Activity
              size={32}
              className="text-neutral-300 dark:text-neutral-600"
            />
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Nenhuma alteração registrada.
            </p>
          </div>
        </Card>
      ) : (
        <Card className="!p-0">
          <ul className="flex flex-col divide-y divide-neutral-100 dark:divide-neutral-800">
            {filtered.map((r) => {
              const meta = TABLE_LABELS[r.table_name];
              const Icon = meta?.icon ?? Activity;
              const ActionIcon = ACTION_ICON[r.action];
              return (
                <li key={r.id} className="flex items-start gap-3 px-4 py-3">
                  <Icon
                    size={18}
                    className="mt-0.5 shrink-0 text-neutral-400 dark:text-neutral-500"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${ACTION_COLOR[r.action]}`}
                      >
                        <ActionIcon size={10} />
                        {ACTION_LABEL[r.action]}
                      </span>
                      <span className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
                        {meta?.label ?? r.table_name}
                      </span>
                      <span className="truncate text-sm text-neutral-600 dark:text-neutral-400">
                        — {describeChange(r)}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                      {formatDateTime(r.created_at)} ·{' '}
                      {r.user_email ?? 'sistema'}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}
