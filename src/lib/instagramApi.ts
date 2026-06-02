import { supabase } from '@/lib/supabase';

export interface InstagramPost {
  id: string;
  url: string;
  sort_order: number;
}

export interface AdminInstagramPost extends InstagramPost {
  active: boolean;
  created_at: string;
}

/** Posts ativos para o site público (RPC SECURITY DEFINER). */
export async function fetchInstagramPosts(): Promise<InstagramPost[]> {
  const { data, error } = await supabase.rpc('public_instagram_posts');
  if (error) throw error;
  return (data ?? []) as InstagramPost[];
}

/** Lista completa para o painel (inclui inativos). */
export async function adminListInstagramPosts(): Promise<AdminInstagramPost[]> {
  const { data, error } = await supabase
    .from('instagram_posts')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as AdminInstagramPost[];
}

export async function addInstagramPost(
  url: string,
  sortOrder: number,
): Promise<void> {
  const { error } = await supabase
    .from('instagram_posts')
    .insert({ url: url.trim(), sort_order: sortOrder });
  if (error) throw error;
}

export async function setInstagramPostActive(
  id: string,
  active: boolean,
): Promise<void> {
  const { error } = await supabase
    .from('instagram_posts')
    .update({ active })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteInstagramPost(id: string): Promise<void> {
  const { error } = await supabase
    .from('instagram_posts')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

/** Normaliza o link para o formato que o embed do Instagram espera. */
export function normalizeInstagramUrl(raw: string): string | null {
  const m = raw.trim().match(/instagram\.com\/(p|reel|tv)\/([^/?#]+)/i);
  if (!m) return null;
  return `https://www.instagram.com/${m[1]}/${m[2]}/`;
}
