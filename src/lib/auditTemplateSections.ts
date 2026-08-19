import {
  DEFAULT_SCALE_MAX,
  answerDraftFrom,
  answerSpecFromDraft,
} from './auditAnswers';
import type { AuditAnswerType, AuditItem } from './types';

/**
 * Editor modular do checklist de vistoria (AuditTemplatesPage): a nutri
 * monta o modelo em seções — renomeia, reordena, duplica e recolhe. No
 * banco a seção continua sendo o campo `category` de cada item; a ordem
 * do array `items` (JSONB) preserva a ordem das seções e das perguntas,
 * porque a visita (AuditDetailPage) agrupa por categoria na ordem do array.
 */

export interface DraftItem {
  id: string;
  text: string;
  weight: number;
  legal_ref: string;
  ncTemplateId: string;
  /** Tipo de resposta da pergunta (JSONB — ver lib/auditAnswers). */
  answerType: AuditAnswerType;
  /** Campos numéricos ficam como texto no rascunho: vazio = não definido. */
  scaleMax: string;
  unit: string;
  min: string;
  max: string;
}

export interface DraftSection {
  key: string;
  name: string;
  collapsed: boolean;
  items: DraftItem[];
}

export function emptyItem(): DraftItem {
  return {
    id: crypto.randomUUID(),
    text: '',
    weight: 1,
    legal_ref: '',
    ncTemplateId: '',
    answerType: 'conformity',
    scaleMax: String(DEFAULT_SCALE_MAX),
    unit: '',
    min: '',
    max: '',
  };
}

export function emptySection(name = ''): DraftSection {
  return {
    key: crypto.randomUUID(),
    name,
    collapsed: false,
    items: [emptyItem()],
  };
}

/** Agrupa os itens salvos em seções, na ordem de primeira aparição. */
export function itemsToSections(items: AuditItem[]): DraftSection[] {
  const map = new Map<string, DraftSection>();
  for (const it of items) {
    const cat = it.category ?? 'Geral';
    let section = map.get(cat);
    if (!section) {
      section = {
        key: crypto.randomUUID(),
        name: cat,
        collapsed: false,
        items: [],
      };
      map.set(cat, section);
    }
    section.items.push({
      id: it.id,
      text: it.text ?? '',
      weight: it.weight ?? 1,
      legal_ref: it.legal_ref ?? '',
      ncTemplateId: it.nc_template_id ?? '',
      ...answerDraftFrom(it),
    });
  }
  const sections = Array.from(map.values());
  return sections.length > 0 ? sections : [emptySection()];
}

/**
 * Achata as seções de volta para o array `items` persistido (JSONB).
 * Perguntas sem texto e (por consequência) seções vazias caem fora.
 */
export function sectionsToItems(sections: DraftSection[]): AuditItem[] {
  return sections.flatMap((s) =>
    s.items
      .filter((i) => i.text.trim())
      .map((i) => ({
        id: i.id,
        category: s.name.trim() || 'Geral',
        text: i.text.trim(),
        weight: i.weight,
        ...(i.legal_ref.trim() ? { legal_ref: i.legal_ref.trim() } : {}),
        ...(i.ncTemplateId ? { nc_template_id: i.ncTemplateId } : {}),
        ...answerSpecFromDraft(i),
      })),
  );
}

/**
 * Nome efetivo duplicado entre seções que serão persistidas — duas seções
 * com o mesmo nome viram uma só ao recarregar; o salvar bloqueia esse caso.
 */
export function findDuplicateSectionName(
  sections: DraftSection[],
): string | null {
  const names = sections
    .filter((s) => s.items.some((i) => i.text.trim()))
    .map((s) => s.name.trim() || 'Geral');
  return names.find((n, idx) => names.indexOf(n) !== idx) ?? null;
}

/** Move um elemento dentro do array; fora dos limites devolve o original. */
export function moveInArray<T>(arr: T[], from: number, to: number): T[] {
  if (to < 0 || to >= arr.length) return arr;
  const next = [...arr];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}
