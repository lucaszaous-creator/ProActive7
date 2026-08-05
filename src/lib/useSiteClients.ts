import { useEffect, useState } from 'react';
import {
  groupsFromRoster,
  groupsFromRows,
  totalsOf,
  type DisplayGroup,
  type RosterTotals,
} from './clientRoster';
import { fetchPublicClients, siteAssetUrl, type SiteClient } from './siteCms';

export interface SiteClientsState {
  groups: DisplayGroup[];
  totals: RosterTotals;
  /** Linhas do banco com depoimento preenchido. */
  testimonials: SiteClient[];
  /** 'seed' enquanto o banco não respondeu (ou respondeu vazio). */
  source: 'seed' | 'db';
}

const SEED_GROUPS = groupsFromRoster();
const SEED: SiteClientsState = {
  groups: SEED_GROUPS,
  totals: totalsOf(SEED_GROUPS),
  testimonials: [],
  source: 'seed',
};

/**
 * Clientes exibidos no site público.
 *
 * A fonte de verdade é a tabela `site_clients` — é lá que a nutri edita,
 * reordena e remove pela tela `/platform/clientes`. Enquanto a resposta não
 * chega (ou se ela vier vazia/com erro), vale a carta da apresentação
 * embutida no bundle: a página nunca aparece vazia para o visitante, que é
 * o pior resultado possível numa página de prova social.
 */
export function useSiteClients(): SiteClientsState {
  const [state, setState] = useState<SiteClientsState>(SEED);

  useEffect(() => {
    let alive = true;
    fetchPublicClients()
      .then((rows) => {
        if (!alive || rows.length === 0) return;
        const groups = groupsFromRows(rows, siteAssetUrl);
        setState({
          groups,
          totals: totalsOf(groups),
          testimonials: rows.filter((r) => r.testimonial),
          source: 'db',
        });
      })
      .catch(() => {
        /* mantém a semente */
      });
    return () => {
      alive = false;
    };
  }, []);

  return state;
}
