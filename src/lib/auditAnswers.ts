import type {
  AnswerSpec,
  AuditAnswerType,
  AuditItem,
  AuditResponse,
  AuditResult,
} from './types';

/**
 * Tipos de resposta do checklist de vistoria.
 *
 * Até aqui toda pergunta era C/NC/NA. Isso cobre "está conforme?", mas não
 * cobre o que a RT mede no chão da cozinha: a temperatura do freezer, a
 * nota de organização do estoque, o relato de quem recebeu a visita.
 *
 * Tudo vive no JSONB (`items` do modelo, `responses` da visita), então não
 * há migration: modelo antigo sem `answer_type` continua sendo conformidade.
 *
 * Um passo além do que o concorrente faz: em `measure` a RT define a faixa
 * aceitável e o valor fora dela vira NÃO CONFORME sozinho — o valor não é
 * só registrado, ele é julgado, e a NC nasce do mesmo fluxo de sempre.
 */

export const ANSWER_TYPES: AuditAnswerType[] = [
  'conformity',
  'text',
  'scale',
  'measure',
];

export const ANSWER_TYPE_LABEL: Record<AuditAnswerType, string> = {
  conformity: 'Conforme / Não conforme',
  text: 'Texto aberto',
  scale: 'Nota (escala)',
  measure: 'Valor medido',
};

export const ANSWER_TYPE_HINT: Record<AuditAnswerType, string> = {
  conformity: 'Veredito clássico C / NC / N-A. Pontua no score.',
  text: 'Resposta escrita. Documenta, não pontua no score.',
  scale: 'Nota de 0 até o máximo. Pontua proporcional à nota.',
  measure: 'Número com unidade. Fora da faixa vira NC automática.',
};

export const DEFAULT_SCALE_MAX = 5;

export function answerTypeOf(
  item: Pick<AuditItem, 'answer_type'>,
): AuditAnswerType {
  return item.answer_type ?? 'conformity';
}

/** Máximo da escala, sempre >= 1 (evita divisão por zero em modelo torto). */
export function scaleMaxOf(item: Pick<AuditItem, 'scale_max'>): number {
  const max = Number(item.scale_max);
  return Number.isFinite(max) && max >= 1 ? max : DEFAULT_SCALE_MAX;
}

/** A RT definiu faixa aceitável? Sem faixa, o valor é só documental. */
export function hasRange(item: Pick<AuditItem, 'min' | 'max'>): boolean {
  return Number.isFinite(Number(item.min)) || Number.isFinite(Number(item.max));
}

/**
 * Veredito derivado de um valor medido. Sem faixa definida ou sem valor,
 * não inventa veredito — devolve undefined e o item fica pendente.
 */
export function resultForMeasure(
  item: Pick<AuditItem, 'min' | 'max'>,
  value: number | undefined | null,
): AuditResult | undefined {
  if (value == null || !Number.isFinite(value)) return undefined;
  if (!hasRange(item)) return undefined;
  const min = Number(item.min);
  const max = Number(item.max);
  if (Number.isFinite(min) && value < min) return 'NC';
  if (Number.isFinite(max) && value > max) return 'NC';
  return 'C';
}

/** Texto da faixa para exibir ao lado do campo ("entre 0 e 5 °C"). */
export function rangeLabel(
  item: Pick<AuditItem, 'min' | 'max' | 'unit'>,
): string {
  const min = Number(item.min);
  const max = Number(item.max);
  const unit = item.unit ? ` ${item.unit}` : '';
  const hasMin = Number.isFinite(min);
  const hasMax = Number.isFinite(max);
  if (hasMin && hasMax) return `entre ${min} e ${max}${unit}`;
  if (hasMin) return `mínimo ${min}${unit}`;
  if (hasMax) return `máximo ${max}${unit}`;
  return '';
}

/**
 * Peso do item no score: { num, den }. `null` = fora do cálculo.
 *
 * Ficam fora: item marcado N-A, pergunta de texto (documental) e valor
 * medido sem faixa definida — pontuar um número que a RT não classificou
 * seria inventar veredito.
 */
export function scoreWeights(
  item: AuditItem,
  response: AuditResponse | undefined,
): { num: number; den: number } | null {
  if (response?.result === 'NA') return null;
  const weight = Number.isFinite(item.weight) ? item.weight : 1;
  switch (answerTypeOf(item)) {
    case 'text':
      return null;
    case 'scale': {
      const value = Number(response?.value);
      const ratio = Number.isFinite(value)
        ? Math.min(Math.max(value / scaleMaxOf(item), 0), 1)
        : 0;
      return { num: weight * ratio, den: weight };
    }
    case 'measure': {
      if (!hasRange(item)) return null;
      const derived = resultForMeasure(item, Number(response?.value));
      return { num: derived === 'C' ? weight : 0, den: weight };
    }
    default:
      // Sem resposta conta como NC: entra no denominador e não soma.
      return { num: response?.result === 'C' ? weight : 0, den: weight };
  }
}

const RESULT_TEXT: Record<AuditResult, string> = {
  C: 'Conforme',
  NC: 'Não conforme',
  NA: 'N/A',
};

/** Resposta em uma linha, para a tabela do PDF e para leitura rápida. */
export function formatAnswer(
  item: AuditItem,
  response: AuditResponse | undefined,
): string {
  if (response?.result === 'NA') return RESULT_TEXT.NA;
  switch (answerTypeOf(item)) {
    case 'text':
      return response?.text?.trim() || '—';
    case 'scale': {
      const value = Number(response?.value);
      if (!Number.isFinite(value)) return '—';
      return `${value} / ${scaleMaxOf(item)}`;
    }
    case 'measure': {
      const value = Number(response?.value);
      if (!Number.isFinite(value)) return '—';
      const unit = item.unit ? ` ${item.unit}` : '';
      const derived = resultForMeasure(item, value);
      return derived
        ? `${value}${unit} (${RESULT_TEXT[derived]})`
        : `${value}${unit}`;
    }
    default:
      return response?.result ? RESULT_TEXT[response.result] : '—';
  }
}

/**
 * Item que virou não-conformidade. Para `measure` o veredito é derivado do
 * valor, então a NC nasce sem a RT precisar clicar em "NC" também.
 */
export function isNonConforming(
  item: AuditItem,
  response: AuditResponse | undefined,
): boolean {
  if (!response || response.result === 'NA') return false;
  if (answerTypeOf(item) === 'measure' && hasRange(item)) {
    return resultForMeasure(item, Number(response.value)) === 'NC';
  }
  return response.result === 'NC';
}

/** O item já foi respondido? Usado pelo contador de pendências da visita. */
export function isAnswered(
  item: AuditItem,
  response: AuditResponse | undefined,
): boolean {
  if (!response) return false;
  if (response.result === 'NA') return true;
  switch (answerTypeOf(item)) {
    case 'text':
      return Boolean(response.text?.trim());
    case 'scale':
    case 'measure':
      return Number.isFinite(Number(response.value));
    default:
      return Boolean(response.result);
  }
}

// ---------------------------------------------------------------------
// Edição do tipo de resposta (formulário)
// ---------------------------------------------------------------------

/**
 * Rascunho dos campos do tipo de resposta num editor. Números ficam como
 * texto porque o campo vazio precisa significar "não definido", e não zero.
 *
 * Compartilhado pelo editor de modelo de VISTORIA e pelo de ROTINA: é a
 * mesma pergunta feita em contextos diferentes, então não pode virar duas
 * implementações que divergem com o tempo.
 */
export interface AnswerDraft {
  answerType: AuditAnswerType;
  scaleMax: string;
  unit: string;
  min: string;
  max: string;
}

export function emptyAnswerDraft(): AnswerDraft {
  return {
    answerType: 'conformity',
    scaleMax: String(DEFAULT_SCALE_MAX),
    unit: '',
    min: '',
    max: '',
  };
}

export function answerDraftFrom(spec: AnswerSpec): AnswerDraft {
  return {
    answerType: answerTypeOf(spec),
    scaleMax: String(scaleMaxOf(spec)),
    unit: spec.unit ?? '',
    min: spec.min == null ? '' : String(spec.min),
    max: spec.max == null ? '' : String(spec.max),
  };
}

/** Número do formulário; vazio (ou lixo) vira "não definido". */
export function parseAnswerNumber(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed.replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : undefined;
}

/**
 * Só persiste os campos que o tipo escolhido usa — trocar de "valor medido"
 * para "conforme/não conforme" não pode deixar uma faixa órfã no JSONB
 * julgando a resposta por trás.
 */
export function answerSpecFromDraft(draft: AnswerDraft): AnswerSpec {
  switch (draft.answerType) {
    case 'text':
      return { answer_type: 'text' };
    case 'scale':
      return {
        answer_type: 'scale',
        scale_max: parseAnswerNumber(draft.scaleMax) ?? DEFAULT_SCALE_MAX,
      };
    case 'measure': {
      const min = parseAnswerNumber(draft.min);
      const max = parseAnswerNumber(draft.max);
      return {
        answer_type: 'measure',
        ...(draft.unit.trim() ? { unit: draft.unit.trim() } : {}),
        ...(min == null ? {} : { min }),
        ...(max == null ? {} : { max }),
      };
    }
    default:
      // conformidade é o padrão: não grava nada e o modelo fica limpo.
      return {};
  }
}

/** Faixa definida no rascunho (campos ainda em texto). */
export function hasDraftRange(
  draft: Pick<AnswerDraft, 'min' | 'max'>,
): boolean {
  return Boolean(draft.min.trim() || draft.max.trim());
}

/**
 * "Item ok" numa execução de checklist de ROTINA.
 *
 * A rotina não tem veredito C/NC como a vistoria — tem um contador de
 * itens cumpridos. Cada tipo de resposta alimenta esse contador de um
 * jeito, e é melhor ter a regra escrita aqui do que espalhada na tela:
 *
 *  - conformity: o que a pessoa marcou
 *  - measure com faixa: DERIVADO do valor (dentro da faixa = ok)
 *  - measure sem faixa, scale, text: apenas "respondido"
 */
export function checklistItemChecked(
  item: AnswerSpec,
  answer: { checked?: boolean; value?: number; text?: string } | undefined,
): boolean {
  if (!answer) return false;
  switch (answerTypeOf(item)) {
    case 'text':
      return Boolean(answer.text?.trim());
    case 'scale':
      return Number.isFinite(Number(answer.value));
    case 'measure':
      if (!hasRange(item)) return Number.isFinite(Number(answer.value));
      return resultForMeasure(item, Number(answer.value)) === 'C';
    default:
      return Boolean(answer.checked);
  }
}
