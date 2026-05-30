// admin-update-user — edita perfil, ativa/desativa e redefine senha de um
// usuario. platform_admin/master gerenciam qualquer um; nutritionist só
// gerencia usuarios `property` (ou a si mesmo) da propria organizacao.
// verify_jwt:true no platform (o gateway valida o JWT); a funcao tambem
// trata OPTIONS e re-checa a auth/role internamente.
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

const BAN_FOREVER = '876000h';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return json({ error: 'Método não permitido' }, 405);
  }

  try {
    const url = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader) {
      return json({ error: 'Não autenticado' }, 401);
    }
    const callerClient = createClient(url, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: userErr,
    } = await callerClient.auth.getUser();
    if (userErr || !user) {
      return json({ error: 'Não autenticado' }, 401);
    }

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
        { error: 'Apenas administradores podem editar usuários' },
        403,
      );
    }

    const body = await req.json().catch(() => null);
    const userId: string | undefined = body?.user_id;
    const fullName: string | undefined = body?.full_name;
    const role: string | undefined = body?.role;
    const companyId: string | null | undefined = body?.company_id;
    const organizationId: string | null | undefined = body?.organization_id;
    const active: boolean | undefined = body?.active;
    const password: string | undefined = body?.password;

    if (!userId) return json({ error: 'user_id é obrigatório' }, 400);

    const validRoles = ['master', 'platform_admin', 'nutritionist', 'property'];
    if (role !== undefined && !validRoles.includes(role)) {
      return json({ error: 'Role inválido' }, 400);
    }
    const normalizedRole = role === 'master' ? 'platform_admin' : role;

    if (normalizedRole === 'property' && companyId === null) {
      return json(
        { error: 'company_id é obrigatório para usuário da empresa' },
        400,
      );
    }
    if (normalizedRole === 'nutritionist' && organizationId === null) {
      return json(
        { error: 'organization_id é obrigatório para nutricionista' },
        400,
      );
    }
    if (password !== undefined && password.length < 6) {
      return json({ error: 'A senha deve ter ao menos 6 caracteres' }, 400);
    }

    if (isNutritionist) {
      if (normalizedRole !== undefined && normalizedRole !== 'property') {
        return json(
          { error: 'Nutricionista só pode editar usuários da empresa' },
          403,
        );
      }
      const { data: targetProfile } = await admin
        .from('profiles')
        .select('organization_id, role')
        .eq('id', userId)
        .maybeSingle();
      if (
        !targetProfile ||
        targetProfile.organization_id !== callerProfile?.organization_id
      ) {
        return json(
          { error: 'Usuário não pertence à sua organização' },
          403,
        );
      }
      // Nutri só gerencia usuarios `property` da org — ou a si mesma.
      // Bloqueia editar/resetar senha de outra nutri ou admin da org.
      if (targetProfile.role !== 'property' && userId !== user.id) {
        return json(
          { error: 'Nutricionista só pode gerenciar usuários da empresa' },
          403,
        );
      }
      if (companyId) {
        const { data: company } = await admin
          .from('companies')
          .select('organization_id')
          .eq('id', companyId)
          .maybeSingle();
        if (company?.organization_id !== callerProfile?.organization_id) {
          return json(
            { error: 'Empresa não pertence à sua organização' },
            403,
          );
        }
      }
    }

    const authUpdate: Record<string, unknown> = {};
    if (password !== undefined) authUpdate.password = password;
    if (active !== undefined) {
      authUpdate.ban_duration = active ? 'none' : BAN_FOREVER;
    }
    if (Object.keys(authUpdate).length > 0) {
      const { error: authErr } = await admin.auth.admin.updateUserById(
        userId,
        authUpdate,
      );
      if (authErr) return json({ error: authErr.message }, 400);
    }

    const profileUpdate: Record<string, unknown> = {};
    if (fullName !== undefined) profileUpdate.full_name = fullName;
    if (normalizedRole !== undefined) profileUpdate.role = normalizedRole;
    if (normalizedRole === 'platform_admin') profileUpdate.company_id = null;
    else if (companyId !== undefined) profileUpdate.company_id = companyId;
    if (normalizedRole === 'nutritionist' && organizationId !== undefined) {
      profileUpdate.organization_id = organizationId;
    }
    if (active !== undefined) profileUpdate.active = active;

    if (Object.keys(profileUpdate).length > 0) {
      const { error: upErr } = await admin
        .from('profiles')
        .update(profileUpdate)
        .eq('id', userId);
      if (upErr) return json({ error: upErr.message }, 400);
    }

    return json({ ok: true }, 200);
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
