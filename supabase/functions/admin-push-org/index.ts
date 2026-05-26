// admin-push-org — envia notificacao push manual para todos os
// usuarios de uma organizacao (ou para uma empresa especifica).
import { createClient } from 'jsr:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Metodo nao permitido' }, 405);

  try {
    const url = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const authHeader = req.headers.get('Authorization') ?? '';
    const callerClient = createClient(url, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await callerClient.auth.getUser();
    if (userErr || !user) return json({ error: 'Nao autenticado' }, 401);

    const admin = createClient(url, serviceKey);
    const { data: callerProfile } = await admin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();
    if (callerProfile?.role !== 'platform_admin' && callerProfile?.role !== 'master') {
      return json({ error: 'Apenas platform_admin' }, 403);
    }

    const body = await req.json().catch(() => null);
    const orgId: string | undefined = body?.organization_id;
    const title: string | undefined = body?.title;
    const message: string | undefined = body?.body;
    if (!orgId || !title || !message) {
      return json({ error: 'organization_id, title e body sao obrigatorios' }, 400);
    }

    // VAPID
    const { data: vapidRows } = await admin.rpc('get_vapid_keys');
    const vapid = (vapidRows as Array<{
      vapid_public: string | null;
      vapid_private: string | null;
      vapid_subject: string | null;
    }> | null)?.[0];
    if (!vapid?.vapid_public || !vapid?.vapid_private) {
      return json({ error: 'VAPID keys ausentes no vault' }, 500);
    }
    webpush.setVapidDetails(
      vapid.vapid_subject ?? 'mailto:no-reply@proactive7.com.br',
      vapid.vapid_public,
      vapid.vapid_private,
    );

    // Busca todas as subscriptions de usuarios da org
    const { data: profiles } = await admin
      .from('profiles')
      .select('id')
      .eq('organization_id', orgId);
    const userIds = (profiles ?? []).map((p) => p.id);
    if (userIds.length === 0) return json({ ok: true, sent: 0 }, 200);

    const { data: subs } = await admin
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .in('user_id', userIds);

    const payload = JSON.stringify({ title, body: message });
    let sent = 0;
    let failed = 0;
    for (const s of subs ?? []) {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload,
        );
        sent += 1;
      } catch {
        failed += 1;
      }
    }

    // Log
    await admin.from('audit_log').insert({
      table_name: 'platform_announcements',
      row_id: orgId,
      action: 'push_manual',
      user_id: user.id,
      new_data: { title, body: message, sent, failed },
    });

    return json({ ok: true, sent, failed }, 200);
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
