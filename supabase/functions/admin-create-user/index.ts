// admin-create-user — cria um usuario (auth + profile) com role e org/company.
// platform_admin pode criar qualquer role. nutritionist pode criar apenas 'property'
// para empresas dentro da sua propria organizacao. Usa a service role key.
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

    // 2. Busca o perfil do chamador para verificar autorizacao.
    const admin = createClient(url, serviceKey);
    const { data: callerProfile } = await admin
      .from('profiles')
      .select('role, organization_id')
      .eq('id', user.id)
      .maybeSingle();

    const callerRole = callerProfile?.role;
    const isPlatformAdmin =
      callerRole === 'platform_admin' || callerRole === 'master';
    const isNutritionist = callerRole === 'nutritionist';

    if (!isPlatformAdmin && !isNutritionist) {
      return json(
        { error: 'Apenas administradores podem criar usuarios' },
        403,
      );
    }

    // 3. Valida o corpo.
    const body = await req.json().catch(() => null);
    const email: string | undefined = body?.email;
    const password: string | undefined = body?.password;
    const fullName: string | null = body?.full_name ?? null;
    const role: string | undefined = body?.role;
    const companyId: string | null = body?.company_id ?? null;
    const organizationId: string | null = body?.organization_id ?? null;

    if (!email || !password || !role) {
      return json({ error: 'Dados incompletos (email, senha, role)' }, 400);
    }

    // Roles validos (mantendo 'master' para compatibilidade retroativa).
    const validRoles = ['platform_admin', 'master', 'nutritionist', 'property'];
    if (!validRoles.includes(role)) {
      return json({ error: 'Role invalido' }, 400);
    }

    // Normaliza 'master' para 'platform_admin' para consistencia no BD.
    const normalizedRole = role === 'master' ? 'platform_admin' : role;

    // 4. Verifica autorizacao especifica por role do chamador.
    if (isNutritionist) {
      if (normalizedRole !== 'property') {
        return json(
          { error: 'Nutricionista so pode criar usuarios da empresa' },
          403,
        );
      }
      // Verifica se o company_id pertence a organizacao do chamador.
      if (!companyId) {
        return json(
          { error: 'company_id e obrigatorio para usuario da empresa' },
          400,
        );
      }
      const { data: company } = await admin
        .from('companies')
        .select('organization_id')
        .eq('id', companyId)
        .maybeSingle();
      if (company?.organization_id !== callerProfile?.organization_id) {
        return json(
          { error: 'Empresa nao pertence a sua organizacao' },
          403,
        );
      }
    }

    // 5. Validacoes de campos obrigatorios por role.
    if (normalizedRole === 'property' && !companyId) {
      return json(
        { error: 'company_id e obrigatorio para usuario da empresa' },
        400,
      );
    }
    if (normalizedRole === 'nutritionist' && !organizationId) {
      return json(
        { error: 'organization_id e obrigatorio para nutricionista' },
        400,
      );
    }

    // 6. Cria o usuario no Auth.
    const { data: created, error: createErr } =
      await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName },
      });
    if (createErr || !created.user) {
      return json(
        { error: createErr?.message ?? 'Falha ao criar usuario' },
        400,
      );
    }

    // 7. Define role, empresa e organizacao no profile.
    // Para 'property', organization_id e sincronizado automaticamente pelo trigger do BD.
    const { error: upsertErr } = await admin.from('profiles').upsert({
      id: created.user.id,
      email,
      full_name: fullName,
      role: normalizedRole,
      company_id: normalizedRole === 'property' ? companyId : null,
      organization_id: normalizedRole === 'nutritionist' ? organizationId : null,
      active: true,
    });
    if (upsertErr) {
      // Desfaz a criacao do usuario para nao deixar conta orfa.
      await admin.auth.admin.deleteUser(created.user.id);
      return json({ error: upsertErr.message }, 400);
    }

    return json({ ok: true, user_id: created.user.id }, 200);
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
