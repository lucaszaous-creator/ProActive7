// instagram-sync — DESATIVADA.
// Tentativa de sincronizar posts do Instagram sem a Graph API (scraping do
// endpoint público web_profile_info). Testado em produção: o Instagram
// responde 401 com require_login=true para requisições de servidor/datacenter,
// então o scraping não é viável a partir da nossa infra (e viola os termos).
// Mantida inerte (410). O feed do /novidades usa os posts cadastrados
// manualmente no painel. Para automação confiável, usar a Instagram Graph API.
Deno.serve(() =>
  new Response(
    JSON.stringify({
      disabled: true,
      reason: 'instagram_requires_login_from_server',
    }),
    { status: 410, headers: { 'Content-Type': 'application/json' } },
  ),
);
