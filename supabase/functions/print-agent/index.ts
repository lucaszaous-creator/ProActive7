// print-agent — endpoint do agente local de impressão (estilo PrintNode).
// O agente roda no PC da cozinha e se autentica por um TOKEN (gerado uma
// vez na tela de impressoras). Usa service role aqui dentro, nunca expõe
// nada sensível ao agente. Três ações:
//   action=poll            -> devolve jobs 'queued' (marca 'printing') + a
//                             impressora atribuida ao agente { host, port }
//   action=ack             -> agente confirma resultado (done|error) de um job
//   action=heartbeat       -> atualiza last_seen_at (Online/Offline na UI)
//   action=report_printers -> agente reporta as impressoras que achou na
//                             rede; a web mostra num popup pra escolher
import { createClient } from 'jsr:@supabase/supabase-js@2';

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

    // Autentica o agente pelo hash do token
    const tokenHash = await sha256Hex(token);
    const { data: agent } = await admin
      .from('print_agents')
      .select('id, company_id, active, printer_host, printer_port')
      .eq('token_hash', tokenHash)
      .maybeSingle();

    if (!agent || !agent.active) return json({ error: 'Agente invalido' }, 401);

    // Heartbeat em toda chamada (mantém Online)
    await admin
      .from('print_agents')
      .update({ last_seen_at: new Date().toISOString() })
      .eq('id', agent.id);

    if (action === 'heartbeat') {
      return json({ ok: true }, 200);
    }

    if (action === 'report_printers') {
      const printers = Array.isArray(body?.printers) ? body.printers : [];
      await admin
        .from('print_agents')
        .update({
          discovered: printers,
          discovered_at: new Date().toISOString(),
        })
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
        .eq('agent_id', agent.id);
      return json({ ok: true }, 200);
    }

    // action=poll: pega jobs na fila e marca como 'printing' (claim)
    const { data: jobs } = await admin
      .from('print_jobs')
      .select('id, zpl, copies')
      .eq('agent_id', agent.id)
      .eq('status', 'queued')
      .order('created_at', { ascending: true })
      .limit(10);

    const claimed = jobs ?? [];
    if (claimed.length > 0) {
      await admin
        .from('print_jobs')
        .update({ status: 'printing', updated_at: new Date().toISOString() })
        .in(
          'id',
          claimed.map((j) => j.id),
        );
    }

    return json(
      {
        ok: true,
        jobs: claimed,
        printer: { host: agent.printer_host, port: agent.printer_port },
      },
      200,
    );
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
