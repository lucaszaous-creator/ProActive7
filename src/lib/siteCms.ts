import { supabase } from './supabase';

export interface SiteCourse {
  id: string;
  title: string;
  summary: string | null;
  description: string | null;
  duration: string | null;
  level: string | null;
  price_label: string | null;
  image_path: string | null;
  cta_url: string | null;
  active: boolean;
  sort_order: number;
  created_at?: string;
}

export interface SiteClient {
  id: string;
  name: string;
  logo_path: string | null;
  segment: string | null;
  city: string | null;
  testimonial: string | null;
  website_url: string | null;
  active: boolean;
  sort_order: number;
  created_at?: string;
}

/** URL pública de um asset do bucket site-assets (cursos/clientes). */
export function siteAssetUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  return supabase.storage.from('site-assets').getPublicUrl(path).data.publicUrl;
}

/** Cursos ativos para a página pública, ordenados. */
export async function fetchPublicCourses(): Promise<SiteCourse[]> {
  const { data, error } = await supabase
    .from('site_courses')
    .select('*')
    .eq('active', true)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as SiteCourse[];
}

/** Clientes ativos para a página pública, ordenados. */
export async function fetchPublicClients(): Promise<SiteClient[]> {
  const { data, error } = await supabase
    .from('site_clients')
    .select('*')
    .eq('active', true)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as SiteClient[];
}
