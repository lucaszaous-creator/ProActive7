// cleanup-employee-docs — retencao LGPD de documentos de saude (ASO).
//
// ASO (Atestado de Saude Ocupacional) e dado pessoal SENSIVEL (saude). O
// arquivo vive no bucket privado `employee-docs`; hoje nunca expira. Esta
// function remove os arquivos + linhas de ASO cujo `expires_at` esta alem
// do periodo de retencao — dado de saude vencido ha muito tempo nao tem
// mais valor de compliance e nao deve ser retido (LGPD, minimizacao).
//
// NAO toca ASOs validos nem recem-vencidos. O periodo e conservador
// (RETENTION_DAYS) e deve ser confirmado pela RT antes de agendar o cron.
//
// Autorizacao: header x-cleanup-secret == CLEANUP_SECRET (mesmo padrao do
// cleanup-photos).
import { createClient } from 'jsr:@supabase/supabase-js@2';

// 3 anos apos o vencimento. Ajustavel; validar com a RT (Ariane) antes de
// agendar a limpeza automatica.
const RETENTION_DAYS = 365 * 3;
const BUCKET = 'employee-docs';

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  const secret = Deno.env.get('CLEANUP_SECRET');
  if (!secret || req.headers.get('x-cleanup-secret') !== secret) {
    return json({ error: 'Nao autorizado' }, 401);
  }

  try {
    const url = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const admin = createClient(url, serviceKey);

    // expires_at e DATE; comparamos com a data de corte (YYYY-MM-DD).
    const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);

    const { data: oldAsos, error: selErr } = await admin
      .from('manipulator_asos')
      .select('id, file_path')
      .lt('expires_at', cutoff);
    if (selErr) return json({ error: selErr.message }, 500);

    const rows = oldAsos ?? [];
    if (rows.length === 0) return json({ deleted: 0 }, 200);

    // Remove os arquivos do Storage (so os que tem file_path).
    const paths = rows
      .map((r) => r.file_path as string | null)
      .filter((p): p is string => typeof p === 'string' && p.length > 0);
    if (paths.length > 0) {
      const { error: rmErr } = await admin.storage.from(BUCKET).remove(paths);
      if (rmErr) {
        return json({ error: 'Falha no Storage: ' + rmErr.message }, 500);
      }
    }

    // Remove as linhas de ASO.
    const ids = rows.map((r) => r.id as string);
    const { error: delErr } = await admin
      .from('manipulator_asos')
      .delete()
      .in('id', ids);
    if (delErr) return json({ error: delErr.message }, 500);

    return json({ deleted: rows.length, files_removed: paths.length }, 200);
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
