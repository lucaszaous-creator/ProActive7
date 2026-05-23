import type { StorageCondition, ValidityUnit } from './types';

export interface ParsedProductRow {
  name: string;
  category: string | null;
  default_storage_condition: StorageCondition;
  active: boolean;
  shelf: {
    condition: StorageCondition;
    value: number;
    unit: ValidityUnit;
  }[];
}

export interface CsvValidationResult {
  rows: ParsedProductRow[];
  errors: { line: number; message: string }[];
}

const CONDITIONS: StorageCondition[] = ['ambiente', 'refrigerado', 'congelado'];

function parseCondition(raw: string): StorageCondition | null {
  const v = raw.trim().toLowerCase();
  return (CONDITIONS as string[]).includes(v) ? (v as StorageCondition) : null;
}

function parseUnit(raw: string): ValidityUnit | null {
  const v = raw.trim().toLowerCase();
  if (v === 'dias' || v === 'days' || v === 'dia') return 'days';
  if (v === 'horas' || v === 'hours' || v === 'hora') return 'hours';
  return null;
}

function parseBool(raw: string | undefined): boolean {
  if (!raw) return true;
  const v = raw.trim().toLowerCase();
  return !['nao', 'não', 'false', '0', 'inativo'].includes(v);
}

export function validateCsvRows(
  rows: Record<string, string>[],
): CsvValidationResult {
  const errors: CsvValidationResult['errors'] = [];
  const valid: ParsedProductRow[] = [];

  rows.forEach((row, idx) => {
    const line = idx + 2; // header + 1-based
    const name = (row.nome ?? '').trim();
    if (!name) {
      errors.push({ line, message: 'Coluna "nome" é obrigatória' });
      return;
    }
    const cond = parseCondition(row.condicao_padrao ?? '');
    if (!cond) {
      errors.push({
        line,
        message: 'condicao_padrao deve ser ambiente, refrigerado ou congelado',
      });
      return;
    }
    const shelf: ParsedProductRow['shelf'] = [];
    let invalid = false;
    for (const c of CONDITIONS) {
      const valRaw = (row[`validade_${c}`] ?? '').trim();
      const unitRaw = (row[`unidade_${c}`] ?? '').trim();
      if (!valRaw && !unitRaw) continue;
      const num = Number(valRaw);
      if (!Number.isFinite(num) || num <= 0) {
        errors.push({
          line,
          message: `validade_${c} deve ser um número maior que zero`,
        });
        invalid = true;
        break;
      }
      const unit = parseUnit(unitRaw || 'dias');
      if (!unit) {
        errors.push({ line, message: `unidade_${c} deve ser dias ou horas` });
        invalid = true;
        break;
      }
      shelf.push({ condition: c, value: Math.round(num), unit });
    }
    if (invalid) return;
    valid.push({
      name,
      category: (row.categoria ?? '').trim() || null,
      default_storage_condition: cond,
      active: parseBool(row.ativo),
      shelf,
    });
  });

  return { rows: valid, errors };
}
