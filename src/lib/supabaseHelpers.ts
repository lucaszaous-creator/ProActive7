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
