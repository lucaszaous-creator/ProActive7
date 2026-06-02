// admin-impersonate — gera um magic link de login para um usuario alvo,
// permitindo que o platform_admin entre como ele para fazer suporte.
// Cada uso e registrado no audit_log via insert direto.
//
// LGPD (CLAUDE.md §2.1): a organizacao do alvo precisa ter autorizado o
// acesso de suporte (organizations.allow_impersonation = true). Sem opt-in,
// e bloqueado com 403. So a nutri (RT) liga/desliga esse consentimento.
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
      .select('role, full_name')
      .eq('id', user.id)
      .maybeSingle();

    const isPlatformAdmin =
      callerProfile?.role === 'platform_admin' || callerProfile?.role === 'master';
    if (!isPlatformAdmin) {
      return json({ error: 'Apenas platform_admin' }, 403);
    }

    const body = await req.json().catch(() => null);
    const targetUserId: string | undefined = body?.target_user_id;
    if (!targetUserId) return json({ error: 'target_user_id obrigatorio' }, 400);
    if (targetUserId === user.id) {
      return json({ error: 'Voce nao pode entrar como voce mesmo' }, 400);
    }

    // ----- Trava de consentimento LGPD -----
    // A org do alvo precisa ter autorizado o acesso de suporte.
    const { data: targetProfile } = await admin
      .from('profiles')
      .select('organization_id')
      .eq('id', targetUserId)
      .maybeSingle();
    const orgId: string | null = targetProfile?.organization_id ?? null;
    if (!orgId) {
      return json({ error: 'Usuario alvo sem organizacao' }, 400);
    }
    const { data: org } = await admin
      .from('organizations')
      .select('allow_impersonation')
      .eq('id', orgId)
      .maybeSingle();
    if (!org?.allow_impersonation) {
      return json(
        {
          error:
            'A organizacao nao autorizou o acesso de suporte. Peca a nutricionista para habilitar em Minha assinatura > Acesso de suporte.',
        },
        403,
      );
    }

    // Busca email do alvo
    const { data: target, error: targetErr } =
      await admin.auth.admin.getUserById(targetUserId);
    if (targetErr || !target?.user?.email) {
      return json({ error: 'Usuario alvo nao encontrado' }, 404);
    }

    // Gera magic link
    const redirectTo = body?.redirect_to ?? 'https://pro-active7.vercel.app/painel';
    const { data: link, error: linkErr } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email: target.user.email,
      options: { redirectTo },
    });
    if (linkErr || !link?.properties?.action_link) {
      return json({ error: linkErr?.message ?? 'Falha ao gerar link' }, 500);
    }

    // Registra no audit_log (inclui a org do alvo para rastreabilidade)
    await admin.from('audit_log').insert({
      table_name: 'auth',
      row_id: targetUserId,
      action: 'impersonate',
      user_id: user.id,
      new_data: {
        actor_name: callerProfile?.full_name,
        target_email: target.user.email,
        target_organization_id: orgId,
      },
    });

    return json({ ok: true, action_link: link.properties.action_link }, 200);
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
