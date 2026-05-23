import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { supabase } from './supabase';
import { useAuth } from '@/context/AuthContext';
import type { Company } from './types';

/**
 * Resolve a empresa "ativa" para uma pagina.
 * - Usuario property: fixado na propria empresa.
 * - Usuario master: pode escolher entre todas as empresas.
 */
export function useCompanyScope() {
  const { profile, isMaster } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyId, setCompanyId] = useState<string>(profile?.company_id ?? '');

  useEffect(() => {
    if (isMaster) {
      supabase
        .from('companies')
        .select('*')
        .eq('active', true)
        .order('name')
        .then(({ data, error }) => {
          if (error) {
            toast.error('Erro ao carregar empresas: ' + error.message);
            return;
          }
          const list = (data as Company[] | null) ?? [];
          setCompanies(list);
          setCompanyId((prev) => prev || list[0]?.id || '');
        });
    } else if (profile?.company_id) {
      supabase
        .from('companies')
        .select('*')
        .eq('id', profile.company_id)
        .then(({ data, error }) => {
          if (error) {
            toast.error('Erro ao carregar empresa: ' + error.message);
            return;
          }
          setCompanies((data as Company[] | null) ?? []);
        });
    }
  }, [isMaster, profile?.company_id]);

  const selectedCompany = companies.find((c) => c.id === companyId) ?? null;
  const companyName = selectedCompany?.name ?? '';
  const companyLogoUrl = selectedCompany?.logo_path
    ? supabase.storage.from('branding').getPublicUrl(selectedCompany.logo_path)
        .data.publicUrl
    : null;
  const companyPrimaryColor =
    selectedCompany?.label_settings?.primary_color ?? null;

  return {
    isMaster,
    companies,
    companyId,
    setCompanyId,
    companyName,
    companyLogoUrl,
    companyPrimaryColor,
    selectedCompany,
  };
}
