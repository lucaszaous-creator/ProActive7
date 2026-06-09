import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Globe, EyeOff } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { usePageTitle } from '@/lib/usePageTitle';

type Tab = 'audit' | 'checklist' | 'products';

interface Row {
  id: string;
  name: string;
  company_id: string | null;
  is_flag: boolean;
}

export function PlatformLibraryPage() {
  usePageTitle('Biblioteca global');
  const [tab, setTab] = useState<Tab>('audit');
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);

  const flagColumn = tab === 'products' ? 'is_seed' : 'is_global';
  const table =
    tab === 'audit'
      ? 'audit_templates'
      : tab === 'checklist'
        ? 'checklist_templates'
        : 'products';

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from(table)
      .select(`id, name, company_id, ${flagColumn}`)
      .order('name');
    setLoading(false);
    if (error) {
      toast.error('Erro ao carregar: ' + error.message);
      return;
    }
    const mapped = ((data ?? []) as Array<Record<string, unknown>>).map(
      (d) => ({
        id: d.id as string,
        name: d.name as string,
        company_id: d.company_id as string | null,
        is_flag: Boolean(d[flagColumn]),
      }),
    );
    setRows(mapped);
  }, [table, flagColumn]);

  useEffect(() => {
    void load();
  }, [load]);

  async function toggleFlag(row: Row) {
    setToggling(row.id);
    const update: Record<string, unknown> = { [flagColumn]: !row.is_flag };
    if (!row.is_flag) {
      // Ao marcar como global/seed, remove company_id (passa a ser do
      // catálogo da plataforma).
      update.company_id = null;
    }
    const { error } = await supabase
      .from(table)
      .update(update)
      .eq('id', row.id);
    setToggling(null);
    if (error) {
      toast.error('Erro ao atualizar: ' + error.message);
      return;
    }
    toast.success(
      !row.is_flag
        ? 'Publicado no catálogo global.'
        : 'Removido do catálogo global.',
    );
    void load();
  }

  const globalCount = rows.filter((r) => r.is_flag).length;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-neutral-800 dark:text-neutral-100">
          Biblioteca global
        </h1>
        <p className="text-sm text-neutral-500">
          Templates e produtos publicados aqui ficam disponíveis para todas as
          organizações clonarem como modelo oficial.
        </p>
      </div>

      <div className="flex gap-1 overflow-x-auto">
        {[
          { id: 'audit' as Tab, label: 'Auditorias' },
          { id: 'checklist' as Tab, label: 'Checklists' },
          { id: 'products' as Tab, label: 'Produtos' },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition ${
              tab === t.id
                ? 'bg-neutral-900 text-white'
                : 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex min-h-[200px] items-center justify-center">
          <Spinner />
        </div>
      ) : (
        <Card>
          <p className="mb-3 text-xs text-neutral-500">
            {globalCount} de {rows.length} marcados como{' '}
            {tab === 'products' ? 'seed' : 'global'}.
          </p>
          {rows.length === 0 ? (
            <p className="text-sm text-neutral-500">
              Nenhum item nesta categoria.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 text-left text-xs uppercase tracking-wide text-neutral-500 dark:border-neutral-700">
                    <th className="py-2">Nome</th>
                    <th className="py-2">Origem</th>
                    <th className="py-2 text-right">Status</th>
                    <th className="py-2 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr
                      key={r.id}
                      className="border-b border-neutral-100 dark:border-neutral-800"
                    >
                      <td className="py-2 font-medium">{r.name}</td>
                      <td className="py-2 text-neutral-500">
                        {r.company_id ? 'Org' : 'Plataforma'}
                      </td>
                      <td className="py-2 text-right">
                        {r.is_flag ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-neutral-50 px-2 py-0.5 text-xs font-medium text-neutral-700 dark:bg-neutral-950 dark:text-neutral-300">
                            <Globe size={10} />
                            Global
                          </span>
                        ) : (
                          <span className="text-xs text-neutral-500">—</span>
                        )}
                      </td>
                      <td className="py-2 text-right">
                        <button
                          onClick={() => void toggleFlag(r)}
                          disabled={toggling === r.id}
                          className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs disabled:opacity-50 ${
                            r.is_flag
                              ? 'border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900'
                              : 'border-neutral-200 text-neutral-700 hover:bg-neutral-50 dark:border-neutral-900'
                          }`}
                        >
                          {r.is_flag ? (
                            <>
                              <EyeOff size={12} />
                              Despublicar
                            </>
                          ) : (
                            <>
                              <Globe size={12} />
                              Publicar global
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      <Card className="bg-blue-50 dark:bg-blue-950">
        <p className="text-xs text-blue-800 dark:text-blue-200">
          <strong>Como funciona:</strong> ao publicar um item como global, ele
          fica visível para todas as organizações como leitura. As nutris vêem
          esses itens com a tag "Modelo oficial" e podem clonar para a empresa
          delas via o botão "Usar como modelo". O original não é modificado.
        </p>
      </Card>
    </div>
  );
}
