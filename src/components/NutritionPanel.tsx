import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Pencil, TriangleAlert } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import {
  buildLabel,
  dailyValuePercent,
  formatNutrient,
  formatPercent,
  NUTRIENT_LABEL,
  NUTRIENT_ORDER,
  NUTRIENT_UNIT,
  SOURCE_LABEL,
  type NutrientKey,
  type NutritionItem,
} from '@/lib/nutrition';
import type {
  NutritionSource,
  ProductNutrition,
  RecipeWithItems,
} from '@/lib/types';

/**
 * Tabela nutricional da preparação (RDC 429/2020 + IN 75/2020).
 *
 * O cálculo vive em lib/nutrition (puro e testado); aqui é só busca,
 * exibição e o formulário de composição do ingrediente.
 *
 * A composição é do PRODUTO, não da ficha — o mesmo arroz vale para todas
 * as preparações. Mas o formulário abre daqui porque é aqui que a falta
 * aparece: a RT descobre o buraco montando o rótulo, não navegando pelo
 * cadastro.
 */

const SOURCES: NutritionSource[] = ['taco', 'rotulo', 'ibge', 'usda', 'manual'];

type Draft = Record<NutrientKey, string> & {
  source: NutritionSource;
  sourceNote: string;
};

function emptyDraft(existing?: ProductNutrition | null): Draft {
  const draft = {
    source: existing?.source ?? 'taco',
    sourceNote: existing?.source_note ?? '',
  } as Draft;
  for (const key of NUTRIENT_ORDER) {
    const value = existing?.[key];
    draft[key] = value == null ? '' : String(value);
  }
  return draft;
}

/** Aceita "1,25" e "1.25"; vazio vira null (≠ zero). */
function parseNumber(input: string): number | null {
  const raw = input.trim().replace(',', '.');
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export function NutritionPanel({ recipe }: { recipe: RecipeWithItems }) {
  const [nutrition, setNutrition] = useState<Map<string, ProductNutrition>>(
    new Map(),
  );
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<{
    productId: string;
    productName: string;
  } | null>(null);
  const [draft, setDraft] = useState<Draft>(() => emptyDraft());
  const [saving, setSaving] = useState(false);

  const productIds = useMemo(
    () => [...new Set((recipe.recipe_items ?? []).map((i) => i.product_id))],
    [recipe.recipe_items],
  );

  const load = useCallback(async () => {
    if (productIds.length === 0) {
      setNutrition(new Map());
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('product_nutrition')
      .select('*')
      .in('product_id', productIds);
    setLoading(false);
    if (error) {
      toast.error('Erro ao carregar composição: ' + error.message);
      return;
    }
    setNutrition(
      new Map(
        ((data as ProductNutrition[] | null) ?? []).map((n) => [
          n.product_id,
          n,
        ]),
      ),
    );
  }, [productIds]);

  useEffect(() => {
    void load();
  }, [load]);

  const items: NutritionItem[] = useMemo(
    () =>
      (recipe.recipe_items ?? []).map((i) => ({
        productId: i.product_id,
        productName: i.product?.name ?? 'Ingrediente',
        quantity: Number(i.quantity),
        unit: i.unit,
        nutrition: nutrition.get(i.product_id) ?? null,
      })),
    [recipe.recipe_items, nutrition],
  );

  const label = useMemo(
    () => buildLabel(items, recipe.portion_grams),
    [items, recipe.portion_grams],
  );

  /** Fontes usadas, para o rodapé — a RT precisa defender cada número. */
  const sources = useMemo(() => {
    const set = new Set<string>();
    for (const i of items) {
      const n = nutrition.get(i.productId);
      if (n) set.add(SOURCE_LABEL[n.source] ?? n.source);
    }
    return [...set];
  }, [items, nutrition]);

  function openEditor(productId: string, productName: string) {
    setDraft(emptyDraft(nutrition.get(productId)));
    setEditing({ productId, productName });
  }

  async function saveNutrition() {
    if (!editing) return;
    setSaving(true);
    const payload: Record<string, unknown> = {
      product_id: editing.productId,
      source: draft.source,
      source_note: draft.sourceNote.trim() || null,
    };
    for (const key of NUTRIENT_ORDER) {
      payload[key] = parseNumber(draft[key]);
    }
    const { error } = await supabase
      .from('product_nutrition')
      .upsert(payload, { onConflict: 'product_id' });
    setSaving(false);
    if (error) {
      toast.error('Erro ao salvar: ' + error.message);
      return;
    }
    toast.success('Composição salva.');
    setEditing(null);
    void load();
  }

  if (loading) {
    return (
      <div className="flex justify-center py-6">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="mt-4 border-t border-neutral-100 pt-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-neutral-700">
          Tabela nutricional
        </h3>
        <span className="text-xs text-neutral-500">
          {label.portionGrams
            ? `Porção de ${label.portionGrams} g`
            : 'Informe o peso da porção na ficha para declarar a coluna por porção'}
        </span>
      </div>

      {/* O que falta vem ANTES da tabela: sem isso a pessoa lê os números
          como se estivessem completos. */}
      {label.missing.length > 0 ? (
        <div className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
          <p className="mb-1 flex items-center gap-1 font-medium">
            <TriangleAlert size={13} />
            Cálculo incompleto — {label.missing.length} ingrediente(s) fora da
            conta
          </p>
          <ul className="flex flex-col gap-1">
            {label.missing.map((m) => {
              const item = items.find((i) => i.productName === m.productName);
              return (
                <li
                  key={m.productName}
                  className="flex flex-wrap items-center gap-2"
                >
                  <span>
                    {m.productName} —{' '}
                    {m.reason === 'unidade'
                      ? 'quantidade em unidade avulsa não converte para gramas'
                      : 'sem composição informada'}
                  </span>
                  {m.reason === 'sem-dados' && item ? (
                    <button
                      type="button"
                      onClick={() => openEditor(item.productId, m.productName)}
                      className="inline-flex items-center gap-1 rounded border border-current px-1.5 py-0.5 font-medium"
                    >
                      <Pencil size={10} /> Informar
                    </button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {label.per100g ? (
        <>
          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[440px] text-xs">
              <thead>
                <tr className="text-left text-neutral-500">
                  <th className="py-1 pr-2">Nutriente</th>
                  <th className="py-1 pr-2 text-right">100 g</th>
                  <th className="py-1 pr-2 text-right">Porção</th>
                  <th
                    className="py-1 pr-2 text-right"
                    title="% dos valores diários com base em dieta de 2.000 kcal"
                  >
                    %VD*
                  </th>
                </tr>
              </thead>
              <tbody>
                {NUTRIENT_ORDER.map((key) => {
                  const per100 = label.per100g?.[key];
                  const perPortion = label.perPortion?.[key];
                  // %VD é declarado sobre a PORÇÃO (IN 75). Sem porção
                  // declarada a coluna fica vazia em vez de usar 100 g.
                  const vd = dailyValuePercent(key, perPortion ?? null);
                  return (
                    <tr key={key} className="border-t border-neutral-100">
                      <td className="py-1.5 pr-2 text-neutral-800">
                        {NUTRIENT_LABEL[key]}
                      </td>
                      <td className="py-1.5 pr-2 text-right text-neutral-600">
                        {formatNutrient(key, per100)}
                      </td>
                      <td className="py-1.5 pr-2 text-right text-neutral-600">
                        {label.perPortion
                          ? formatNutrient(key, perPortion)
                          : '—'}
                      </td>
                      <td className="py-1.5 pr-2 text-right text-neutral-600">
                        {formatPercent(vd)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-neutral-500">
            *Percentual de valores diários com base em uma dieta de 2.000 kcal.
            Seus valores diários podem ser maiores ou menores dependendo de suas
            necessidades energéticas. Cálculo sobre{' '}
            {Math.round(label.gramsCounted)} g de ingredientes com composição
            informada
            {sources.length > 0 ? ` · Fonte: ${sources.join(', ')}` : ''}.
            Valores calculados não substituem análise laboratorial — a
            responsabilidade técnica pela declaração é da RT.
          </p>
        </>
      ) : (
        <p className="py-3 text-center text-xs text-neutral-500">
          Nenhum ingrediente tem composição informada ainda.
        </p>
      )}

      {/* Lista para completar/corrigir mesmo quando já está tudo preenchido. */}
      <div className="mt-3 flex flex-wrap gap-1">
        {items.map((i) => {
          const has = nutrition.has(i.productId);
          return (
            <button
              key={i.productId}
              type="button"
              onClick={() => openEditor(i.productId, i.productName)}
              className={`rounded-full border px-2 py-0.5 text-[11px] ${
                has
                  ? 'border-neutral-200 text-neutral-600'
                  : 'border-amber-300 text-amber-700'
              }`}
            >
              {i.productName}
              {has ? '' : ' (sem dados)'}
            </button>
          );
        })}
      </div>

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={`Composição — ${editing?.productName ?? ''}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(null)}>
              Cancelar
            </Button>
            <Button onClick={() => void saveNutrition()} disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <p className="rounded-lg bg-neutral-50 px-3 py-2 text-xs text-neutral-600">
            Valores por <strong>100 g de parte comestível</strong> — o mesmo
            denominador da TACO e do rótulo do fornecedor, então dá para copiar
            sem converter. Campo em branco significa{' '}
            <strong>não informado</strong>, que é diferente de zero.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {NUTRIENT_ORDER.map((key) => (
              <Input
                key={key}
                id={`nut-${key}`}
                label={`${NUTRIENT_LABEL[key]} (${NUTRIENT_UNIT[key]})`}
                inputMode="decimal"
                value={draft[key]}
                onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
              />
            ))}
          </div>
          <Select
            id="nut-source"
            label="Origem do dado"
            value={draft.source}
            onChange={(e) =>
              setDraft({ ...draft, source: e.target.value as NutritionSource })
            }
          >
            {SOURCES.map((s) => (
              <option key={s} value={s}>
                {SOURCE_LABEL[s]}
              </option>
            ))}
          </Select>
          <Input
            id="nut-note"
            label="Referência (opcional)"
            value={draft.sourceNote}
            onChange={(e) => setDraft({ ...draft, sourceNote: e.target.value })}
            placeholder="Ex.: TACO 4ª ed., código 63 — ou lote/rótulo do fornecedor"
          />
        </div>
      </Modal>
    </div>
  );
}
