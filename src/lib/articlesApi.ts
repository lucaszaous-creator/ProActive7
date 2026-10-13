import { supabase } from '@/lib/supabase';

/** Resumo público (listagem em /novidades). */
export interface ArticleSummary {
  slug: string;
  title: string;
  description: string;
  tags: string[];
  cover_image: string | null;
  published_at: string;
}

/** Artigo público completo (página do artigo). */
export interface ArticleFull extends ArticleSummary {
  body: string;
}

// ---- Público (RPC SECURITY DEFINER, só publicados) -------------------

export async function fetchPublishedArticles(): Promise<ArticleSummary[]> {
  const { data, error } = await supabase.rpc('public_articles');
  if (error) throw error;
  return (data ?? []) as ArticleSummary[];
}

export async function fetchPublicArticle(
  slug: string,
): Promise<ArticleFull | null> {
  const { data, error } = await supabase.rpc('public_article', {
    p_slug: slug,
  });
  if (error) throw error;
  const rows = (data ?? []) as ArticleFull[];
  return rows[0] ?? null;
}
