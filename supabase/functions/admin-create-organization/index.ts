// admin-create-organization — cria uma organizacao + usuario nutricionista proprietario.
// Apenas platform_admin pode invocar. Usa a service role key.
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

/** Gera slug a partir de um nome: minusculas, espacos -> hifen, remove especiais. */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // remove acentos
    .replace(/[^a-z0-9\s-]/g, '')   // remove caracteres especiais
    .trim()
    .replace(/\s+/g, '-');           // espacos para hifen
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return json({ error: 'Metodo nao permitido' }, 405);
  }

  try {
    const url = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // 1. Identifica o chamador a partir do JWT enviado.
    const authHeader = req.headers.get('Authorization') ?? '';
    const callerClient = createClient(url, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: userErr,
    } = await callerClient.auth.getUser();
    if (userErr || !user) {
      return json({ error: 'Nao autenticado' }, 401);
    }

    // 2. Confirma que o chamador e platform_admin.
    const admin = createClient(url, serviceKey);
    const { data: callerProfile } = await admin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    const callerRole = callerProfile?.role;
    if (callerRole !== 'platform_admin' && callerRole !== 'master') {
      return json(
        { error: 'Apenas platform_admin pode criar organizacoes' },
        403,
      );
    }

    // 3. Valida o corpo.
    const body = await req.json().catch(() => null);
    const orgName: string | undefined = body?.org_name;
    const orgSlugInput: string | undefined = body?.org_slug;
    const contactEmail: string | null = body?.contact_email ?? null;
    const contactPhone: string | null = body?.contact_phone ?? null;
    const nutritionistEmail: string | undefined = body?.nutritionist_email;
    const nutritionistPassword: string | undefined = body?.nutritionist_password;
    const nutritionistName: string | null = body?.nutritionist_name ?? null;
    const planKey: string | null = body?.plan_key ?? null;
    const trialEndsAt: string | null = body?.trial_ends_at ?? null;
    const planRenewsAt: string | null = body?.plan_renews_at ?? null;

    if (!orgName || !nutritionistEmail || !nutritionistPassword) {
      return json(
        {
          error:
            'Dados incompletos (org_name, nutritionist_email, nutritionist_password)',
        },
        400,
      );
    }

    // 4. Gera slug automaticamente se nao fornecido.
    const orgSlug = orgSlugInput ? orgSlugInput : slugify(orgName);

    // 4b. Confere se o slug ja esta em uso (mensagem amigavel).
    const { data: existing } = await admin
      .from('organizations')
      .select('id, deleted_at')
      .eq('slug', orgSlug)
      .maybeSingle();
    if (existing) {
      return json(
        {
          error: existing.deleted_at
            ? `Slug "${orgSlug}" pertence a uma organização que está na lixeira. Restaure-a, exclua definitivamente, ou informe um org_slug diferente.`
            : `Slug "${orgSlug}" já existe. Informe um org_slug diferente.`,
        },
        400,
      );
    }

    // 5. Cria a organizacao (sem owner_user_id ainda).
    const { data: newOrg, error: orgErr } = await admin
      .from('organizations')
      .insert({
        name: orgName,
        slug: orgSlug,
        status: 'active',
        contact_email: contactEmail,
        contact_phone: contactPhone,
        plan_key: planKey,
        trial_ends_at: trialEndsAt,
        plan_renews_at: planRenewsAt,
      })
      .select('id')
      .single();

    if (orgErr || !newOrg) {
      return json(
        { error: orgErr?.message ?? 'Falha ao criar organizacao' },
        400,
      );
    }

    const organizationId: string = newOrg.id;
    let nutritionistUserId: string | null = null;

    try {
      // 6. Cria o usuario nutricionista no Auth.
      const { data: created, error: createErr } =
        await admin.auth.admin.createUser({
          email: nutritionistEmail,
          password: nutritionistPassword,
          email_confirm: true,
          user_metadata: { full_name: nutritionistName },
        });
      if (createErr || !created.user) {
        throw new Error(createErr?.message ?? 'Falha ao criar usuario nutricionista');
      }

      nutritionistUserId = created.user.id;

      // 7. Cria o perfil do nutricionista.
      const { error: upsertErr } = await admin.from('profiles').upsert({
        id: nutritionistUserId,
        email: nutritionistEmail,
        full_name: nutritionistName,
        role: 'nutritionist',
        organization_id: organizationId,
        company_id: null,
        active: true,
      });
      if (upsertErr) {
        throw new Error(upsertErr.message);
      }

      // 8. Atualiza a organizacao com o owner_user_id.
      const { error: updateErr } = await admin
        .from('organizations')
        .update({ owner_user_id: nutritionistUserId })
        .eq('id', organizationId);
      if (updateErr) {
        throw new Error(updateErr.message);
      }
    } catch (innerErr) {
      // 9. Rollback: remove usuario auth e organizacao para evitar orfaos.
      if (nutritionistUserId) {
        await admin.auth.admin.deleteUser(nutritionistUserId);
      }
      await admin.from('organizations').delete().eq('id', organizationId);
      return json({ error: String(innerErr) }, 400);
    }

    return json(
      {
        ok: true,
        organization_id: organizationId,
        nutritionist_user_id: nutritionistUserId,
      },
      200,
    );
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
