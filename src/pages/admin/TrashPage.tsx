import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Briefcase,
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
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { PageHeader } from '@/components/ui/PageHeader';
import { ListSkeleton } from '@/components/ui/Skeleton';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import {
  hardDelete,
  hardDeleteOrganization,
  restoreOrganization,
  restoreSoftDeleted,
  type SoftDeleteTable,
} from '@/lib/supabaseHelpers';

/**
 * `organizations` nao e uma SoftDeleteTable comum: restaurar e excluir
 * passam por RPC/Edge Function porque envolvem cascade nas empresas,
 * arquivos do Storage e contas do Auth (migration 0101).
 */
type TrashTable = SoftDeleteTable | 'organizations';

interface DeletedRow {
  table: TrashTable;
  id: string;
  label: string;
  deleted_at: string;
}

const TABLE_META: Record<
  TrashTable,
  { label: string; icon: LucideIcon; nameField: string }
> = {
  organizations: { label: 'Organização', icon: Briefcase, nameField: 'name' },
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

const TABLES: TrashTable[] = [
  'organizations',
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
  const [orgToPurge, setOrgToPurge] = useState<DeletedRow | null>(null);
  const [orgConfirmName, setOrgConfirmName] = useState('');
  const [purging, setPurging] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const results: DeletedRow[] = [];
    // Empresas derrubadas junto com a org nao aparecem soltas na lista:
    // elas voltam (ou somem) com a organizacao, que e a unidade aqui.
    // `organizations` vem primeiro em TABLES, entao o Set ja esta cheio
    // quando chegamos em `companies`.
    const deletedOrgIds = new Set<string>();
    for (const table of TABLES) {
      const meta = TABLE_META[table];
      const columns =
        table === 'companies'
          ? `id, deleted_at, ${meta.nameField}, organization_id`
          : `id, deleted_at, ${meta.nameField}`;
      const { data, error } = await supabase
        .from(table)
        .select(columns)
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false })
        .limit(100);
      if (error) {
        toast.error(`${meta.label}: ${error.message}`);
        continue;
      }
      for (const r of (data as unknown as Record<string, unknown>[] | null) ??
        []) {
        if (table === 'organizations') deletedOrgIds.add(r.id as string);
        if (
          table === 'companies' &&
          deletedOrgIds.has(r.organization_id as string)
        ) {
          continue;
        }
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
    const err =
      row.table === 'organizations'
        ? await restoreOrganization(row.id)
        : await restoreSoftDeleted(row.table, row.id);
    setWorking(null);
    if (err) {
      toast.error(err);
      return;
    }
    toast.success(
      row.table === 'organizations'
        ? 'Organização restaurada (ainda suspensa) com as empresas dela.'
        : 'Item restaurado.',
    );
    void load();
  }

  async function handleHardDelete() {
    if (!confirmHard) return;
    setWorking(confirmHard.id);
    const err = await hardDelete(
      confirmHard.table as SoftDeleteTable,
      confirmHard.id,
    );
    setWorking(null);
    setConfirmHard(null);
    if (err) {
      toast.error(err);
      return;
    }
    toast.success('Excluído permanentemente.');
    void load();
  }

  async function handlePurgeOrganization() {
    if (!orgToPurge) return;
    setPurging(true);
    const { error, result } = await hardDeleteOrganization(
      orgToPurge.id,
      orgConfirmName,
    );
    setPurging(false);
    if (error) {
      toast.error(error);
      return;
    }
    setOrgToPurge(null);
    setOrgConfirmName('');
    toast.success(
      `Organização apagada: ${result?.companies_removed ?? 0} empresa(s), ` +
        `${result?.users_removed ?? 0} usuário(s) e ${result?.files_removed ?? 0} arquivo(s).`,
    );
    if (result?.storage_errors?.length) {
      toast.warning(
        `Alguns arquivos não puderam ser removidos do Storage: ${result.storage_errors.join('; ')}`,
      );
    }
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
            serem apagados definitivamente. Restaure ou apague de vez.{' '}
            <strong>Organizações</strong> não são apagadas por prazo: elas ficam
            aqui até você excluir definitivamente (o que apaga também arquivos e
            contas de acesso).
          </>
        }
      />

      {loading ? (
        <ListSkeleton rows={5} />
      ) : rows.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <Trash size={32} className="text-neutral-300" />
            <p className="text-sm text-neutral-600">Lixeira vazia.</p>
          </div>
        </Card>
      ) : (
        <Card className="!p-0">
          <ul className="flex flex-col divide-y divide-neutral-100">
            {rows.map((r) => {
              const meta = TABLE_META[r.table];
              const Icon = meta.icon;
              const busy = working === r.id;
              const isOrg = r.table === 'organizations';
              return (
                <li
                  key={`${r.table}-${r.id}`}
                  className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <Icon
                      size={18}
                      className="mt-0.5 shrink-0 text-neutral-400"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-neutral-800">
                        {meta.label} · {r.label}
                      </p>
                      <p className="text-xs text-neutral-500">
                        Excluído {formatDateTime(r.deleted_at)}
                        {isOrg ? (
                          <>
                            {' · '}
                            <Link
                              to={`/platform/organizacoes/${r.id}`}
                              className="underline underline-offset-2"
                            >
                              ver dados / fazer backup
                            </Link>
                          </>
                        ) : null}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      onClick={() => void handleRestore(r)}
                      disabled={busy}
                      className="inline-flex items-center gap-1 rounded-lg border border-neutral-300 px-3 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
                    >
                      <RotateCcw size={14} />
                      Restaurar
                    </button>
                    <button
                      onClick={() => {
                        if (isOrg) {
                          setOrgConfirmName('');
                          setOrgToPurge(r);
                        } else {
                          setConfirmHard(r);
                        }
                      }}
                      disabled={busy}
                      className="inline-flex items-center gap-1 rounded-lg border border-red-300 px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
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

      {/* Organizacao: confirmacao por digitacao do nome. E a unica acao do
          sistema que apaga contas de acesso e arquivos de uma vez. */}
      <Modal
        open={orgToPurge !== null}
        onClose={() => setOrgToPurge(null)}
        title="Excluir organização definitivamente"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setOrgToPurge(null)}
              disabled={purging}
            >
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={() => void handlePurgeOrganization()}
              loading={purging}
              disabled={orgConfirmName.trim() !== (orgToPurge?.label ?? '')}
            >
              Apagar para sempre
            </Button>
          </>
        }
      >
        <div className="space-y-3 text-sm text-neutral-600">
          <p>
            Esta ação é <strong>IRREVERSÍVEL</strong> e apaga, de uma vez:
          </p>
          <ul className="list-disc space-y-1 pl-5 text-xs">
            <li>
              todas as empresas da organização e os dados delas (produtos,
              etiquetas, visitas, não-conformidades, temperaturas, estoque);
            </li>
            <li>
              os arquivos no Storage: fotos, ASOs e certificados dos
              manipuladores, comprovantes de dedetização, documentos e logos;
            </li>
            <li>
              as contas de acesso (login) de todos os usuários da organização.
            </li>
          </ul>
          <p className="text-xs">
            A trilha de auditoria do que foi apagado permanece registrada. Se
            você ainda vai precisar desses dados,{' '}
            <Link
              to={`/platform/organizacoes/${orgToPurge?.id ?? ''}`}
              className="underline underline-offset-2"
            >
              faça o backup JSON antes
            </Link>
            .
          </p>
          <Input
            id="org-purge-confirm"
            label={`Digite o nome da organização para confirmar: ${orgToPurge?.label ?? ''}`}
            value={orgConfirmName}
            onChange={(e) => setOrgConfirmName(e.target.value)}
            autoComplete="off"
          />
        </div>
      </Modal>
    </div>
  );
}
