import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { toast } from 'sonner';
import { supabase } from './supabase';
import { useAuth } from '@/context/AuthContext';
import {
  getCompanyScope,
  loadCompanies,
  setActiveCompany,
  subscribeCompanyScope,
} from './companyScopeStore';

/**
 * Resolve a empresa ATIVA do aplicativo — uma por vez, a mesma em todas as
 * telas (ver lib/companyScopeStore).
 *
 * - property / property_manager: fixado na própria empresa.
 * - platform_admin: escolhe entre todas.
 * - nutritionist: escolhe entre as da própria organização (a RLS filtra).
 *
 * A API de saída é a mesma de antes de o escopo virar compartilhado, para
 * que as 30 páginas que dependem deste hook não precisassem mudar.
 */
export function useCompanyScope() {
  const { profile, isMaster, isPlatformAdmin, isNutritionist } = useAuth();
  const { companies, companyId, loading, stale } = useSyncExternalStore(
    subscribeCompanyScope,
    getCompanyScope,
    getCompanyScope,
  );

  // Platform_admin ve todas; nutritionist recebe apenas as da propria org via RLS.
  const showAllCompanies = isPlatformAdmin || isNutritionist;

  useEffect(() => {
    void loadCompanies(showAllCompanies, profile?.company_id).catch((e) => {
      toast.error('Erro ao carregar empresas: ' + (e as Error).message);
    });
    // `stale` entra na dependência para a lista recarregar quando alguém
    // cria ou remove empresa (ver invalidateCompanies).
  }, [showAllCompanies, profile?.company_id, stale]);

  const selectedCompany = useMemo(
    () => companies.find((c) => c.id === companyId) ?? null,
    [companies, companyId],
  );

  const companyName = selectedCompany?.name ?? '';
  const companyLogoUrl = selectedCompany?.logo_path
    ? supabase.storage.from('branding').getPublicUrl(selectedCompany.logo_path)
        .data.publicUrl
    : null;
  const companyPrimaryColor =
    selectedCompany?.label_settings?.primary_color ?? null;

  return {
    isMaster,
    isPlatformAdmin,
    isNutritionist,
    showAllCompanies,
    companies,
    companyId,
    /** Troca a empresa ativa do app inteiro, não só desta tela. */
    setCompanyId: setActiveCompany,
    companiesLoading: loading,
    companyName,
    companyLogoUrl,
    companyPrimaryColor,
    selectedCompany,
  };
}
