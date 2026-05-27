/**
 * supabase.functions.invoke esconde a mensagem real quando a função
 * retorna não-2xx — só dá "Edge Function returned a non-2xx status code".
 * Este helper extrai o `error` do corpo JSON quando possível.
 */
export async function extractInvokeError(error: unknown): Promise<string> {
  if (!error) return 'Erro desconhecido';
  if (error instanceof Error) {
    const ctx = (error as { context?: Response }).context;
    if (ctx && typeof ctx.json === 'function') {
      try {
        const body = await ctx.clone().json();
        if (body && typeof body.error === 'string') return body.error;
        if (body && typeof body.message === 'string') return body.message;
      } catch {
        // corpo não é JSON; tenta texto puro
        try {
          const txt = await ctx.clone().text();
          if (txt && txt.length < 500) return txt;
        } catch {
          /* ignora */
        }
      }
    }
    return error.message;
  }
  return String(error);
}
