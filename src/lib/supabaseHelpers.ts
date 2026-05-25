import { supabase } from './supabase';

/**
 * Para um DELETE com .select('id'), confirma que ao menos uma linha
 * foi afetada. Quando RLS bloqueia, o Supabase retorna data=[] e
 * error=null silenciosamente — esse helper transforma esse caso em
 * um erro explicito.
 *
 * Uso:
 *   const { data, error } = await supabase.from('t').delete().eq('id', x).select('id');
 *   const err = checkDeleteResult({ data, error });
 *   if (err) { toast.error(err); return; }
 */
export interface DeleteResult {
  data: unknown[] | null;
  error: { message: string } | null;
}

export function checkDeleteResult(r: DeleteResult): string | null {
  if (r.error) return r.error.message;
  if (!r.data || r.data.length === 0) {
    return 'Você não tem permissão para excluir este item.';
  }
  return null;
}

/**
 * Tabelas que suportam soft-delete (deleted_at). DELETE pela UI
 * vai marcar deleted_at = now() em vez de remover. Restauravel via
 * /admin/lixeira por 30 dias; depois disso, cron limpa fisicamente.
 */
export type SoftDeleteTable =
  | 'companies'
  | 'products'
  | 'audits'
  | 'manipulators'
  | 'documents';

/**
 * Marca uma row como deletada. Equivalente a um DELETE para o
 * usuario, mas mantem auditoria e permite restaurar.
 */
export async function softDelete(
  table: SoftDeleteTable,
  id: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from(table)
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .is('deleted_at', null)
    .select('id');
  if (error) return error.message;
  if (!data || data.length === 0) {
    return 'Você não tem permissão para excluir este item.';
  }
  return null;
}

/** Restaura uma row deletada (limpa o deleted_at). Apenas master. */
export async function restoreSoftDeleted(
  table: SoftDeleteTable,
  id: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from(table)
    .update({ deleted_at: null })
    .eq('id', id)
    .not('deleted_at', 'is', null)
    .select('id');
  if (error) return error.message;
  if (!data || data.length === 0) {
    return 'Não foi possível restaurar.';
  }
  return null;
}

/** Excluir definitivo (master, na lixeira). Hard delete real. */
export async function hardDelete(
  table: SoftDeleteTable,
  id: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from(table)
    .delete()
    .eq('id', id)
    .select('id');
  if (error) return error.message;
  if (!data || data.length === 0) {
    return 'Sem permissão para excluir definitivamente.';
  }
  return null;
}
