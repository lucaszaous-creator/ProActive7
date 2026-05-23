// send-expiry-notifications — roda 1x/dia (pg_cron).
// Identifica etiquetas vencendo nas proximas 24h por empresa e envia
// um push para cada usuario inscrito da empresa correspondente.
//
// Autorizacao: header x-cron-secret deve bater com CRON_SECRET
// (verify_jwt e false; mesma estrategia da cleanup-photos).
import { createClient } from 'jsr:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

function ok(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  const expectedSecret = Deno.env.get('CRON_SECRET');
  if (
    expectedSecret &&
    req.headers.get('x-cron-secret') !== expectedSecret
  ) {
    return ok({ error: 'Forbidden' }, 403);
  }

  const url = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const vapidPublic = Deno.env.get('VAPID_PUBLIC_KEY')!;
  const vapidPrivate = Deno.env.get('VAPID_PRIVATE_KEY')!;
  const vapidSubject = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:no-reply@etiqueta.app';

  webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);

  const admin = createClient(url, serviceKey);

  const nowIso = new Date().toISOString();
  const in24hIso = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  // Conta etiquetas vencendo nas proximas 24h por empresa.
  const { data: rows, error: rowsErr } = await admin
    .from('label_prints')
    .select('company_id')
    .gte('expiry_at', nowIso)
    .lt('expiry_at', in24hIso);
  if (rowsErr) return ok({ error: rowsErr.message }, 500);

  const countsByCompany = new Map<string, number>();
  for (const r of rows ?? []) {
    countsByCompany.set(
      r.company_id,
      (countsByCompany.get(r.company_id) ?? 0) + 1,
    );
  }
  if (countsByCompany.size === 0) {
    return ok({ ok: true, sent: 0, message: 'Nada vencendo nas proximas 24h.' });
  }

  const companyIds = [...countsByCompany.keys()];

  // Inscritos de cada empresa: profiles -> push_subscriptions.
  const { data: subs, error: subsErr } = await admin
    .from('push_subscriptions')
    .select('endpoint, keys, user_id, profiles!inner(company_id, role)')
    .in('profiles.company_id', companyIds);
  if (subsErr) return ok({ error: subsErr.message }, 500);

  type SubRow = {
    endpoint: string;
    keys: { p256dh: string; auth: string };
    profiles: { company_id: string; role: string } | null;
  };

  // Master tambem recebe (cobre todas as empresas).
  const { data: masters } = await admin
    .from('push_subscriptions')
    .select('endpoint, keys, profiles!inner(company_id, role)')
    .eq('profiles.role', 'master');

  const allSubs: SubRow[] = [
    ...(((subs as unknown as SubRow[]) ?? [])),
    ...(((masters as unknown as SubRow[]) ?? [])),
  ];

  let sent = 0;
  let failed = 0;
  const expired: string[] = [];

  await Promise.all(
    allSubs.map(async (s) => {
      const count =
        s.profiles?.role === 'master'
          ? [...countsByCompany.values()].reduce((a, b) => a + b, 0)
          : (countsByCompany.get(s.profiles?.company_id ?? '') ?? 0);
      if (count === 0) return;

      const payload = JSON.stringify({
        title: 'Etiquetas vencendo',
        body:
          count === 1
            ? '1 etiqueta vence nas próximas 24h.'
            : `${count} etiquetas vencem nas próximas 24h.`,
        url: '/',
      });

      try {
        await webpush.sendNotification(
          {
            endpoint: s.endpoint,
            keys: s.keys,
          },
          payload,
        );
        sent++;
      } catch (e) {
        failed++;
        const err = e as { statusCode?: number };
        // 404/410 = subscription expired, remove
        if (err.statusCode === 404 || err.statusCode === 410) {
          expired.push(s.endpoint);
        }
      }
    }),
  );

  if (expired.length > 0) {
    await admin.from('push_subscriptions').delete().in('endpoint', expired);
  }

  return ok({ ok: true, sent, failed, removed_expired: expired.length });
});
