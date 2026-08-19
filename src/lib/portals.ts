import {
  Boxes,
  CalendarRange,
  ClipboardCheck,
  Printer,
  ShieldCheck,
  Stethoscope,
  Tag,
  type LucideIcon,
} from 'lucide-react';

/**
 * Split de portais (pedido da Ariane): a empresa entra no programa de
 * etiquetas, a nutricionista no sistema de checklists/rotinas. Tudo aqui é
 * apresentação — o acesso real é decidido pelo role (RLS + ProtectedRoute).
 */
export type PortalKey = 'cliente' | 'nutricionista';

export const PORTAL_ICONS: Record<PortalKey, LucideIcon> = {
  cliente: Printer,
  nutricionista: Stethoscope,
};

/** Bullets de cada portal — fonte única para /acessar e /login/:portal. */
export const PORTAL_FEATURES: Record<
  PortalKey,
  { icon: LucideIcon; label: string }[]
> = {
  cliente: [
    { icon: Tag, label: 'Etiquetas de validade em segundos' },
    { icon: Boxes, label: 'Validades, produção e estoque' },
    { icon: ClipboardCheck, label: 'Rotina diária da cozinha' },
  ],
  nutricionista: [
    { icon: ClipboardCheck, label: 'Checklists e rotinas técnicas' },
    { icon: ShieldCheck, label: 'Auditorias com plano de ação' },
    { icon: CalendarRange, label: 'Agenda e carteira de empresas' },
  ],
};

/** Destino pós-login: nutri sem empresa ativa cai na carteira de empresas. */
export function postLoginDest(
  isNutritionist: boolean,
  companyId: string | null | undefined,
): string {
  return isNutritionist && !companyId ? '/admin/empresas' : '/painel';
}

/**
 * Portal escolhido no login, gravado no submit e lido pelo Layout depois
 * que o profile carrega (o LoginPage desmonta antes disso — o redirect
 * acontece assim que a sessão existe, com o profile ainda carregando).
 */
const LOGIN_PORTAL_KEY = 'pa7.loginPortal';

export function rememberLoginPortal(portal: PortalKey) {
  try {
    sessionStorage.setItem(LOGIN_PORTAL_KEY, portal);
  } catch {
    /* noop — sem storage, só perde o aviso de portal trocado */
  }
}

/** Lê e consome (remove) o portal escolhido no login. */
export function takeLoginPortal(): PortalKey | null {
  try {
    const v = sessionStorage.getItem(LOGIN_PORTAL_KEY);
    sessionStorage.removeItem(LOGIN_PORTAL_KEY);
    return v === 'cliente' || v === 'nutricionista' ? v : null;
  } catch {
    return null;
  }
}
