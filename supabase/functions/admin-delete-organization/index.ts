// admin-delete-organization — exclusao DEFINITIVA de uma organizacao.
//
// Existe como Edge Function (e nao como RPC) porque a exclusao completa
// precisa de service role em tres frentes que o PostgREST nao alcanca:
//
//   1. Storage: fotos, ASOs, comprovantes de dedetizacao, documentos da
//      empresa, assinaturas e logos ficam em buckets por company_id.
//      Nenhum deles some por cascade do banco.
//   2. Auth: apagar o `profiles` nao apaga o `auth.users` — o usuario
//      continuaria conseguindo logar (numa org que nao existe mais).
//      E `profiles.company_id` e ON DELETE RESTRICT, entao os usuarios
//      TEM que sair antes das empresas.
//   3. `companies.organization_id` e ON DELETE SET NULL: apagar a org
//      direto deixaria as empresas orfas e vivas, com todos os dados.
//
// Ordem: usuarios (Auth) -> empresas + org (RPC transacional) -> Storage.
// O Storage vem por ultimo de proposito: se o banco falhar no meio, a org
// continua na lixeira e da para tentar de novo — arquivo apagado nao volta.
//
// Trava de seguranca: a org precisa estar NA LIXEIRA (deleted_at) e o
// chamador precisa digitar o nome exato dela. Nao existe caminho de
// exclusao definitiva em um clique.
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

// Buckets cujo primeiro nivel de pasta e o company_id.
const COMPANY_BUCKETS = [
  'photos',
  'employee-docs',
  'pest-docs',
  'company-docs',
  'signatures',
  'branding',
];

type Admin = ReturnType<typeof createClient>;

/**
 * Lista recursivamente os arquivos sob um prefixo (a API do Storage nao
 * tem listagem recursiva: entradas com `id === null` sao "pastas").
 * Profundidade limitada — hoje todos os uploads sao `<company_id>/arquivo`.
 */
async function listAll(
  admin: Admin,
  bucket: string,
  prefix: string,
  depth = 0,
): Promise<string[]> {
  if (depth > 3) return [];
  const paths: string[] = [];
  const pageSize = 100;
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await admin.storage
      .from(bucket)
      .list(prefix, { limit: pageSize, offset });
    if (error || !data || data.length === 0) break;
    for (const entry of data) {
      const full = `${prefix}/${entry.name}`;
      // Entradas sem `id` sao pastas (a API nao marca de outro jeito).
      if (!entry.id) {
        paths.push(...(await listAll(admin, bucket, full, depth + 1)));
      } else {
        paths.push(full);
      }
    }
    if (data.length < pageSize) break;
  }
  return paths;
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

    // ----- 1. Quem esta chamando -----
    const authHeader = req.headers.get('Authorization') ?? '';
    const callerClient = createClient(url, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: userErr,
    } = await callerClient.auth.getUser();
    if (userErr || !user) return json({ error: 'Nao autenticado' }, 401);

    const admin = createClient(url, serviceKey);
    const { data: caller } = await admin
      .from('profiles')
      .select('role, organization_id')
      .eq('id', user.id)
      .maybeSingle();
    if (caller?.role !== 'platform_admin' && caller?.role !== 'master') {
      return json(
        { error: 'Apenas o administrador da plataforma pode excluir organizacoes' },
        403,
      );
    }

    const body = await req.json().catch(() => null);
    const orgId: string | undefined = body?.organization_id;
    const confirmName: string = String(body?.confirm_name ?? '');
    if (!orgId) return json({ error: 'organization_id obrigatorio' }, 400);

    // ----- 2. Travas -----
    const { data: org } = await admin
      .from('organizations')
      .select('*')
      .eq('id', orgId)
      .maybeSingle();
    if (!org) return json({ error: 'Organizacao nao encontrada' }, 404);

    if (!org.deleted_at) {
      return json(
        {
          error:
            'Mova a organizacao para a lixeira antes de excluir definitivamente.',
        },
        409,
      );
    }
    if (confirmName.trim() !== String(org.name).trim()) {
      return json(
        { error: 'O nome digitado nao confere com o nome da organizacao.' },
        400,
      );
    }
    if (caller.organization_id === orgId) {
      return json(
        { error: 'Voce nao pode excluir a organizacao a que pertence' },
        403,
      );
    }

    // ----- 3. Inventario -----
    const { data: companies } = await admin
      .from('companies')
      .select('id, name')
      .eq('organization_id', orgId);
    const companyIds = (companies ?? []).map((c) => c.id as string);

    // Usuarios da org: por organization_id e, por seguranca, tambem os
    // ligados a uma empresa dela (caso algum profile tenha ficado com
    // organization_id dessincronizado).
    const { data: byOrg } = await admin
      .from('profiles')
      .select('id, role, email')
      .eq('organization_id', orgId);
    let byCompany: Record<string, unknown>[] = [];
    if (companyIds.length > 0) {
      const { data } = await admin
        .from('profiles')
        .select('id, role, email')
        .in('company_id', companyIds);
      byCompany = (data ?? []) as Record<string, unknown>[];
    }

    const profileMap = new Map<string, { role: string; email: string | null }>();
    for (const p of [
      ...((byOrg ?? []) as Record<string, unknown>[]),
      ...byCompany,
    ]) {
      profileMap.set(p.id as string, {
        role: p.role as string,
        email: (p.email as string | null) ?? null,
      });
    }
    profileMap.delete(user.id); // nunca apagar o proprio chamador

    for (const [, p] of profileMap) {
      if (p.role === 'platform_admin' || p.role === 'master') {
        return json(
          {
            error:
              'A organizacao contem um administrador da plataforma. Mova-o para outra organizacao antes de excluir.',
          },
          409,
        );
      }
    }

    // ----- 4. Auth: apaga os usuarios (profiles cascateia) -----
    // Tem que vir antes das empresas: profiles.company_id e ON DELETE
    // RESTRICT, entao usuario vivo trava o DELETE da empresa.
    let usersRemoved = 0;
    const userErrors: string[] = [];
    for (const [id, p] of profileMap) {
      const { error } = await admin.auth.admin.deleteUser(id);
      if (error) userErrors.push(`${p.email ?? id}: ${error.message}`);
      else usersRemoved += 1;
    }
    if (userErrors.length > 0) {
      return json(
        {
          error:
            'Falha ao excluir usuarios da organizacao: ' + userErrors.join('; '),
          users_removed: usersRemoved,
        },
        500,
      );
    }

    // ----- 5. Banco: empresas + org numa transacao so (RPC da 0101) -----
    // Cada empresa cascateia produtos, etiquetas, fotos, NCs, ASOs,
    // temperaturas, documentos, estoque. Se falhar, nada do banco e
    // apagado e a org continua na lixeira para nova tentativa — por isso
    // o Storage so e limpo depois: arquivo apagado nao volta.
    const { error: purgeErr } = await admin.rpc('purge_organization_db', {
      p_id: orgId,
    });
    if (purgeErr) {
      return json(
        {
          error: 'Falha ao excluir os dados da organizacao: ' + purgeErr.message,
          users_removed: usersRemoved,
        },
        500,
      );
    }

    // ----- 6. Storage (por ultimo; erro aqui nao desfaz o resto) -----
    let filesRemoved = 0;
    const storageErrors: string[] = [];
    for (const bucket of COMPANY_BUCKETS) {
      for (const companyId of companyIds) {
        const paths = await listAll(admin, bucket, companyId);
        for (let i = 0; i < paths.length; i += 100) {
          const chunk = paths.slice(i, i + 100);
          const { error } = await admin.storage.from(bucket).remove(chunk);
          if (error) storageErrors.push(`${bucket}: ${error.message}`);
          else filesRemoved += chunk.length;
        }
      }
    }
    if (org.logo_path) {
      const { error } = await admin.storage
        .from('branding')
        .remove([org.logo_path as string]);
      if (error) storageErrors.push(`branding: ${error.message}`);
      else filesRemoved += 1;
    }

    // ----- 7. Trilha (fica no audit_log; a linha da org ja nao existe) -----
    await admin.from('audit_log').insert({
      table_name: 'organizations',
      row_id: orgId,
      action: 'hard_delete',
      old_data: org,
      new_data: {
        companies_removed: companyIds.length,
        company_names: (companies ?? []).map((c) => c.name),
        users_removed: usersRemoved,
        files_removed: filesRemoved,
        storage_errors: storageErrors,
      },
      user_id: user.id,
      user_email: user.email,
    });

    return json(
      {
        ok: true,
        companies_removed: companyIds.length,
        users_removed: usersRemoved,
        files_removed: filesRemoved,
        storage_errors: storageErrors,
      },
      200,
    );
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
