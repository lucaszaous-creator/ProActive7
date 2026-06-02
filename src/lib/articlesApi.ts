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

/** Linha completa para o painel (inclui rascunhos). */
export interface AdminArticle {
  id: string;
  slug: string;
  title: string;
  description: string;
  body: string;
  tags: string[];
  cover_image: string | null;
  published: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ArticleInput {
  id?: string;
  slug: string;
  title: string;
  description: string;
  body: string;
  tags: string[];
  cover_image: string | null;
  published: boolean;
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

// ---- Painel (tabela direta, gated por RLS: admin/nutricionista) ------

export async function adminListArticles(): Promise<AdminArticle[]> {
  const { data, error } = await supabase
    .from('articles')
    .select('*')
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as AdminArticle[];
}

export async function saveArticle(input: ArticleInput): Promise<void> {
  const base = {
    slug: input.slug,
    title: input.title,
    description: input.description,
    body: input.body,
    tags: input.tags,
    cover_image: input.cover_image,
    published: input.published,
  };

  if (input.id) {
    // published_at é definido na PRIMEIRA publicação e nunca mais é apagado
    // (despublicar não zera a data; republicar preserva a data original).
    const { data: existing } = await supabase
      .from('articles')
      .select('published_at')
      .eq('id', input.id)
      .single();
    const published_at =
      existing?.published_at ??
      (input.published ? new Date().toISOString() : null);
    const { error } = await supabase
      .from('articles')
      .update({ ...base, published_at })
      .eq('id', input.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from('articles').insert({
      ...base,
      published_at: input.published ? new Date().toISOString() : null,
    });
    if (error) throw error;
  }
}

export async function deleteArticle(id: string): Promise<void> {
  const { error } = await supabase.from('articles').delete().eq('id', id);
  if (error) throw error;
}

/** Gera um slug a partir do título (sem acento, minúsculo, com hífens). */
export function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80);
}
