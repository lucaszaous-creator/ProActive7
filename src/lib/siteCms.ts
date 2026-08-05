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
  /** Chave estável dos clientes semeados pela migration 0104. Null nos criados pela tela. */
  slug?: string | null;
  /** Endereços da mesma marca (ex.: Padaria Panini: Riviera, Cavaleiros, Centro). */
  units?: string[] | null;
}

/**
 * URL pública de uma imagem de cliente/curso.
 *
 * Dois formatos convivem em `logo_path`:
 * - começa com `/` → asset estático servido pelo próprio site
 *   (`/clientes/panini.webp`), usado pelos clientes da carta institucional.
 *   Custo zero: não ocupa Storage.
 * - qualquer outra coisa → objeto no bucket `site-assets`, enviado pela
 *   tela `/platform/clientes`.
 */
export function siteAssetUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith('/')) return path;
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
