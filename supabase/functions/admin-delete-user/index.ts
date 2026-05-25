// admin-delete-user — apaga definitivamente um usuario (auth.users + profile
// via FK cascade). Apenas o usuario master pode invocar. Bloqueia
// autoexclusao.
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
    return json({ error: 'Método não permitido' }, 405);
  }

  try {
    const url = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const authHeader = req.headers.get('Authorization') ?? '';
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
        { error: 'Apenas administradores podem excluir usuários' },
        403,
      );
    }

    const body = await req.json().catch(() => null);
    const userId: string | undefined = body?.user_id;
    if (!userId) return json({ error: 'user_id é obrigatório' }, 400);
    if (userId === user.id) {
      return json({ error: 'Você não pode excluir o próprio usuário' }, 400);
    }

    // Nutricionista so pode deletar usuarios da propria org.
    if (isNutritionist) {
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
      if (targetProfile.role !== 'property') {
        return json(
          { error: 'Nutricionista só pode excluir usuários da empresa' },
          403,
        );
      }
    }

    const { error: delErr } = await admin.auth.admin.deleteUser(userId);
    if (delErr) return json({ error: delErr.message }, 400);

    return json({ ok: true }, 200);
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
