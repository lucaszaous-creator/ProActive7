// print-agent — endpoint do relay local (PowerShell, modo invisivel).
//   action=poll            -> jobs 'queued' da empresa + printer_name +
//                             latest_version (pra auto-update)
//   action=ack             -> confirma resultado (done|error)
//   action=heartbeat       -> last_seen_at + relay_version
//   action=report_printers -> impressoras detectadas
//   action=log             -> grava em relay_logs (erros centralizados)
import { createClient } from 'jsr:@supabase/supabase-js@2';

// Versao mais recente do relay.ps1 publicada. O relay compara com a sua
// e baixa de novo se estiver desatualizado.
const LATEST_RELAY_VERSION = '2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Metodo nao permitido' }, 405);

  try {
    const url = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const admin = createClient(url, serviceKey);

    const body = await req.json().catch(() => null);
    const token: string | undefined = body?.token;
    const action: string = body?.action ?? 'poll';
    if (!token) return json({ error: 'token obrigatorio' }, 400);

    const tokenHash = await sha256Hex(token);
    const { data: agent } = await admin
      .from('print_agents')
      .select('id, company_id, active, printer_name, printer_host, printer_port')
      .eq('token_hash', tokenHash)
      .maybeSingle();

    if (!agent || !agent.active) return json({ error: 'Agente invalido' }, 401);

    // Heartbeat + versao do relay em toda chamada
    const patch: Record<string, unknown> = { last_seen_at: new Date().toISOString() };
    if (typeof body?.version === 'string') patch.relay_version = body.version;
    await admin.from('print_agents').update(patch).eq('id', agent.id);

    if (action === 'heartbeat') {
      return json({ ok: true, latest_version: LATEST_RELAY_VERSION }, 200);
    }

    if (action === 'log') {
      const level = ['info', 'warn', 'error'].includes(body?.level) ? body.level : 'info';
      const message = String(body?.message ?? '').slice(0, 2000);
      if (message) {
        await admin.from('relay_logs').insert({
          agent_id: agent.id,
          company_id: agent.company_id,
          level,
          message,
        });
      }
      return json({ ok: true }, 200);
    }

    if (action === 'report_printers') {
      const printers = Array.isArray(body?.printers) ? body.printers : [];
      await admin
        .from('print_agents')
        .update({ discovered: printers, discovered_at: new Date().toISOString() })
        .eq('id', agent.id);
      return json({ ok: true }, 200);
    }

    if (action === 'ack') {
      const jobId: string | undefined = body?.job_id;
      const status: string = body?.status === 'error' ? 'error' : 'done';
      const errorMsg: string | null = body?.error ?? null;
      if (!jobId) return json({ error: 'job_id obrigatorio' }, 400);
      await admin
        .from('print_jobs')
        .update({
          status,
          error: errorMsg,
          updated_at: new Date().toISOString(),
          printed_at: status === 'done' ? new Date().toISOString() : null,
        })
        .eq('id', jobId)
        .eq('company_id', agent.company_id);
      return json({ ok: true }, 200);
    }

    // action=poll: jobs queued de QUALQUER agente da MESMA empresa
    const { data: jobs } = await admin
      .from('print_jobs')
      .select('id, zpl, copies, agent_id')
      .eq('company_id', agent.company_id)
      .eq('status', 'queued')
      .order('created_at', { ascending: true })
      .limit(10);

    const claimed = jobs ?? [];
    if (claimed.length > 0) {
      await admin
        .from('print_jobs')
        .update({ status: 'printing', updated_at: new Date().toISOString() })
        .in('id', claimed.map((j) => j.id));
    }

    return json(
      {
        ok: true,
        jobs: claimed,
        latest_version: LATEST_RELAY_VERSION,
        printer: {
          name: agent.printer_name,
          host: agent.printer_host,
          port: agent.printer_port,
        },
      },
      200,
    );
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
