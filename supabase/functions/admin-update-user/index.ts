// admin-update-user — edita perfil, ativa/desativa e redefine senha de um
// usuario. Apenas o usuario master pode invocar. Usa a service role key.
//
// Ativar/desativar usa o ban_duration do Supabase Auth para bloquear login
// (a coluna profiles.active sozinha nao bloqueia a sessao).
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

// ~100 anos, suficiente para banir indefinidamente.
const BAN_FOREVER = '876000h';

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

    // 1. Identifica o chamador.
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

    // 2. Confirma master.
    const admin = createClient(url, serviceKey);
    const { data: callerProfile } = await admin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();
    if (callerProfile?.role !== 'master') {
      return json(
        { error: 'Apenas o usuário master pode editar usuários' },
        403,
      );
    }

    // 3. Valida o corpo.
    const body = await req.json().catch(() => null);
    const userId: string | undefined = body?.user_id;
    const fullName: string | undefined = body?.full_name;
    const role: string | undefined = body?.role;
    const companyId: string | null | undefined = body?.company_id;
    const active: boolean | undefined = body?.active;
    const password: string | undefined = body?.password;

    if (!userId) return json({ error: 'user_id é obrigatório' }, 400);
    if (role !== undefined && role !== 'master' && role !== 'property') {
      return json({ error: 'Role inválido' }, 400);
    }
    if (role === 'property' && !companyId) {
      return json(
        { error: 'company_id é obrigatório para usuário da empresa' },
        400,
      );
    }
    if (password !== undefined && password.length < 6) {
      return json({ error: 'A senha deve ter ao menos 6 caracteres' }, 400);
    }

    // 4. Atualizacoes em auth.users (senha / banimento).
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

    // 5. Atualizacoes em profiles.
    const profileUpdate: Record<string, unknown> = {};
    if (fullName !== undefined) profileUpdate.full_name = fullName;
    if (role !== undefined) profileUpdate.role = role;
    if (role === 'master') profileUpdate.company_id = null;
    else if (companyId !== undefined) profileUpdate.company_id = companyId;
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
