// admin-export-org — exporta TODOS os dados de uma organizacao para
// CSVs concatenados num JSON unico. O frontend pode salvar como
// "backup-<org>-<data>.json". Util para portabilidade LGPD.
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

// Tabelas que pertencem direta ou indiretamente a uma org
const TABLES_BY_ORG = ['profiles'];
const TABLES_BY_COMPANY = [
  'products',
  'product_shelf_lives',
  'recipes',
  'recipe_items',
  'label_prints',
  'photos',
  'manipulators',
  'manipulator_asos',
  'manipulator_trainings',
  'audit_templates',
  'audits',
  'checklist_templates',
  'checklist_runs',
  'documents',
  'document_versions',
  'equipment',
  'temperature_logs',
  'non_conformities',
  'pest_control_providers',
  'pest_control_services',
];

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
    const { data: caller } = await admin
      .from('profiles').select('role').eq('id', user.id).maybeSingle();
    if (caller?.role !== 'platform_admin' && caller?.role !== 'master') {
      return json({ error: 'Apenas platform_admin' }, 403);
    }

    const body = await req.json().catch(() => null);
    const orgId: string | undefined = body?.organization_id;
    if (!orgId) return json({ error: 'organization_id obrigatorio' }, 400);

    const { data: org } = await admin
      .from('organizations').select('*').eq('id', orgId).maybeSingle();
    if (!org) return json({ error: 'Org nao encontrada' }, 404);

    const { data: companies } = await admin
      .from('companies').select('*').eq('organization_id', orgId);
    const companyIds = (companies ?? []).map((c) => c.id);

    const dump: Record<string, unknown> = {
      meta: {
        organization_id: orgId,
        organization_name: org.name,
        exported_at: new Date().toISOString(),
        exported_by: user.email,
      },
      organization: org,
      companies: companies ?? [],
    };

    for (const t of TABLES_BY_ORG) {
      const { data } = await admin.from(t).select('*').eq('organization_id', orgId);
      dump[t] = data ?? [];
    }

    for (const t of TABLES_BY_COMPANY) {
      if (companyIds.length === 0) {
        dump[t] = [];
        continue;
      }
      const { data } = await admin.from(t).select('*').in('company_id', companyIds);
      dump[t] = data ?? [];
    }

    await admin.from('audit_log').insert({
      table_name: 'organizations',
      row_id: orgId,
      action: 'export',
      user_id: user.id,
      new_data: { table_count: TABLES_BY_ORG.length + TABLES_BY_COMPANY.length + 2 },
    });

    return json({ ok: true, dump }, 200);
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
