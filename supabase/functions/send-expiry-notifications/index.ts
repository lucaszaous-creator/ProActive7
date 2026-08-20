// send-expiry-notifications — roda 1x/dia (pg_cron).
// Identifica etiquetas vencendo nas proximas 24h por empresa e envia
// um push para cada usuario inscrito da empresa correspondente.
//
// Desde a 0108 tambem dispara os LEMBRETES DA AGENDA. Esse bloco fala com
// pessoa, nao com empresa: o aviso vai para quem criou o compromisso, que
// e quem tem de aparecer. Por isso ele roda antes e independente do resto.
//
// Autorizacao: header x-cron-secret eh comparado contra o valor
// guardado em supabase_vault (entrada 'cron_secret_expiry'). A
// validacao roda dentro do banco via RPC verify_cron_secret — o
// valor nunca atravessa a fronteira do banco.
import { createClient } from 'jsr:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

function ok(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  const url = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const admin = createClient(url, serviceKey);

  const provided = req.headers.get('x-cron-secret') ?? '';
  const { data: authorized, error: authErr } = await admin.rpc(
    'verify_cron_secret',
    { p_name: 'cron_secret_expiry', p_provided: provided },
  );
  if (authErr || !authorized) {
    return ok({ error: 'Forbidden' }, 403);
  }

  // VAPID keys vem do supabase_vault via RPC get_vapid_keys.
  const { data: vapidRows, error: vapidErr } = await admin.rpc('get_vapid_keys');
  const vapid = (vapidRows as Array<{
    vapid_public: string | null;
    vapid_private: string | null;
    vapid_subject: string | null;
  }> | null)?.[0];
  if (vapidErr || !vapid?.vapid_public || !vapid?.vapid_private) {
    return ok(
      {
        error:
          'VAPID keys ausentes no vault. Cadastre via vault.create_secret().',
      },
      500,
    );
  }
  webpush.setVapidDetails(
    vapid.vapid_subject ?? 'mailto:no-reply@proactive7.com.br',
    vapid.vapid_public,
    vapid.vapid_private,
  );

  // ---------- Lembretes da agenda (migration 0108) ----------
  // Como o cron e diario, a granularidade do lembrete e o DIA: "3 dias
  // antes" avisa na primeira execucao daquele dia. Para lembrete por hora
  // basta agendar o cron de hora em hora — o filtro abaixo continua valendo
  // porque `reminded_at` da a idempotencia.
  // Dia no fuso de Brasilia, nao em UTC. A Edge roda em UTC: um
  // compromisso das 18h de Sao Paulo ja e "amanha" em UTC, entao o
  // lembrete "no dia" sairia DEPOIS do compromisso. 'en-CA' devolve
  // YYYY-MM-DD, que e o formato que a comparacao abaixo espera.
  const ymd = (d: Date) =>
    d.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });

  let agendaSent = 0;
  const agendaReminded: string[] = [];
  {
    // Janela curta: lembrete so existe entre 30 dias antes e o proprio dia.
    const fromIso = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const toIso = new Date(Date.now() + 31 * 24 * 60 * 60 * 1000).toISOString();
    const { data: agendaRows } = await admin
      .from('agenda_events')
      .select('id, title, starts_at, remind_days_before, created_by')
      .not('remind_days_before', 'is', null)
      .is('reminded_at', null)
      .is('done_at', null)
      .gte('starts_at', fromIso)
      .lte('starts_at', toIso);

    const todayYmd = ymd(new Date());
    const due = ((agendaRows ?? []) as Array<{
      id: string;
      title: string;
      starts_at: string;
      remind_days_before: number;
      created_by: string | null;
    }>).filter((r) => {
      if (!r.created_by) return false;
      const d = new Date(r.starts_at);
      d.setDate(d.getDate() - r.remind_days_before);
      return ymd(d) <= todayYmd;
    });

    if (due.length > 0) {
      const byUser = new Map<string, typeof due>();
      for (const r of due) {
        const list = byUser.get(r.created_by!) ?? [];
        list.push(r);
        byUser.set(r.created_by!, list);
      }

      const { data: agendaSubs } = await admin
        .from('push_subscriptions')
        .select('endpoint, keys, user_id')
        .in('user_id', [...byUser.keys()]);

      await Promise.all(
        ((agendaSubs ?? []) as Array<{
          endpoint: string;
          keys: { p256dh: string; auth: string };
          user_id: string;
        }>).map(async (sub) => {
          const list = byUser.get(sub.user_id) ?? [];
          if (list.length === 0) return;
          const first = list[0];
          const body =
            list.length === 1
              ? `${first.title} — ${new Date(first.starts_at).toLocaleDateString('pt-BR')}`
              : `${list.length} compromissos chegando. O proximo: ${first.title}.`;
          try {
            await webpush.sendNotification(
              { endpoint: sub.endpoint, keys: sub.keys },
              JSON.stringify({
                title: 'Lembrete da agenda',
                body,
                url: '/agenda',
              }),
            );
            agendaSent++;
          } catch (_e) {
            // Endpoint morto e limpo no bloco geral mais abaixo.
          }
        }),
      );

      // Marca todos os vencidos, inclusive os de quem nao tem inscricao de
      // push: senao a mesma linha seria reprocessada todo dia para sempre.
      agendaReminded.push(...due.map((r) => r.id));
      if (agendaReminded.length > 0) {
        await admin
          .from('agenda_events')
          .update({ reminded_at: new Date().toISOString() })
          .in('id', agendaReminded);
      }
    }
  }

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

  // Nao-conformidades vencidas ou vencendo em 24h.
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowDate = tomorrow.toISOString().slice(0, 10);
  const { data: ncRows } = await admin
    .from('non_conformities')
    .select('company_id, when_due, status')
    .in('status', ['open', 'in_progress'])
    .not('when_due', 'is', null)
    .lte('when_due', tomorrowDate);

  const ncCountsByCompany = new Map<string, number>();
  for (const r of ncRows ?? []) {
    ncCountsByCompany.set(
      r.company_id,
      (ncCountsByCompany.get(r.company_id) ?? 0) + 1,
    );
  }

  // ASOs de manipuladores vencendo em <= 30 dias ou ja vencidos.
  // Apenas o ASO mais recente de cada manipulador ativo deve contar.
  const in30 = new Date();
  in30.setDate(in30.getDate() + 30);
  const in30Date = in30.toISOString().slice(0, 10);
  const { data: asoRows } = await admin
    .from('manipulators')
    .select(
      'company_id, active, manipulator_asos(expires_at)',
    )
    .eq('active', true);

  const asoCountsByCompany = new Map<string, number>();
  for (const m of (asoRows ?? []) as Array<{
    company_id: string;
    manipulator_asos: { expires_at: string }[] | null;
  }>) {
    const asos = m.manipulator_asos ?? [];
    if (asos.length === 0) {
      // sem ASO sequer: conta como crítico
      asoCountsByCompany.set(
        m.company_id,
        (asoCountsByCompany.get(m.company_id) ?? 0) + 1,
      );
      continue;
    }
    const latest = asos
      .map((a) => a.expires_at)
      .sort()
      .pop()!;
    if (latest <= in30Date) {
      asoCountsByCompany.set(
        m.company_id,
        (asoCountsByCompany.get(m.company_id) ?? 0) + 1,
      );
    }
  }

  // Controle de pragas com next_due_at em <= 30 dias ou ja vencido.
  const { data: pestRows } = await admin
    .from('pest_control_services')
    .select('company_id, next_due_at')
    .not('next_due_at', 'is', null)
    .lte('next_due_at', in30Date);

  // Conta apenas o servico mais recente por empresa (proximo a vencer).
  const pestLatestByCompany = new Map<string, string>();
  for (const r of (pestRows ?? []) as Array<{
    company_id: string;
    next_due_at: string;
  }>) {
    const cur = pestLatestByCompany.get(r.company_id);
    if (!cur || r.next_due_at > cur) {
      pestLatestByCompany.set(r.company_id, r.next_due_at);
    }
  }
  const pestCountsByCompany = new Map<string, number>();
  for (const [companyId, due] of pestLatestByCompany) {
    if (due <= in30Date) {
      pestCountsByCompany.set(companyId, 1);
    }
  }

  if (
    countsByCompany.size === 0 &&
    ncCountsByCompany.size === 0 &&
    asoCountsByCompany.size === 0 &&
    pestCountsByCompany.size === 0
  ) {
    return ok({
      ok: true,
      sent: agendaSent,
      agenda_reminders: agendaReminded.length,
      message:
        agendaSent > 0
          ? 'Somente lembretes de agenda hoje.'
          : 'Nada a notificar hoje.',
    });
  }

  const companyIds = [
    ...new Set([
      ...countsByCompany.keys(),
      ...ncCountsByCompany.keys(),
      ...asoCountsByCompany.keys(),
      ...pestCountsByCompany.keys(),
    ]),
  ];

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
      const isMaster = s.profiles?.role === 'master';
      const labelCount = isMaster
        ? [...countsByCompany.values()].reduce((a, b) => a + b, 0)
        : (countsByCompany.get(s.profiles?.company_id ?? '') ?? 0);
      const ncCount = isMaster
        ? [...ncCountsByCompany.values()].reduce((a, b) => a + b, 0)
        : (ncCountsByCompany.get(s.profiles?.company_id ?? '') ?? 0);
      const asoCount = isMaster
        ? [...asoCountsByCompany.values()].reduce((a, b) => a + b, 0)
        : (asoCountsByCompany.get(s.profiles?.company_id ?? '') ?? 0);
      const pestCount = isMaster
        ? [...pestCountsByCompany.values()].reduce((a, b) => a + b, 0)
        : (pestCountsByCompany.get(s.profiles?.company_id ?? '') ?? 0);
      if (
        labelCount === 0 &&
        ncCount === 0 &&
        asoCount === 0 &&
        pestCount === 0
      )
        return;

      const parts: string[] = [];
      if (labelCount > 0) {
        parts.push(
          labelCount === 1
            ? '1 etiqueta vence nas proximas 24h'
            : `${labelCount} etiquetas vencem nas proximas 24h`,
        );
      }
      if (ncCount > 0) {
        parts.push(
          ncCount === 1
            ? '1 nao-conformidade com prazo vencendo'
            : `${ncCount} nao-conformidades com prazo vencendo`,
        );
      }
      if (asoCount > 0) {
        parts.push(
          asoCount === 1
            ? '1 manipulador com ASO vencendo/vencido'
            : `${asoCount} manipuladores com ASO vencendo/vencido`,
        );
      }
      if (pestCount > 0) {
        parts.push(
          pestCount === 1
            ? '1 empresa com controle de pragas a renovar'
            : `${pestCount} empresas com controle de pragas a renovar`,
        );
      }

      const url =
        pestCount > 0
          ? '/controle-pragas'
          : asoCount > 0
            ? '/manipuladores'
            : ncCount > 0
              ? '/nao-conformidades'
              : '/';

      const payload = JSON.stringify({
        title:
          ncCount > 0 || asoCount > 0
            ? 'Alerta de compliance'
            : 'Etiquetas vencendo',
        body: parts.join(' - ') + '.',
        url,
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

  return ok({
    ok: true,
    sent: sent + agendaSent,
    failed,
    agenda_reminders: agendaReminded.length,
    removed_expired: expired.length,
  });
});
