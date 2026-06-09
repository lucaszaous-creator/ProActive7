// Selo público de conformidade — /selo/:companyId
//
// Página pública (sem login) que mostra ao consumidor o score de
// segurança alimentar da empresa. Foco em transparência: o
// estabelecimento publica o QR na porta e o consumidor verifica
// independentemente. Backend: RPC get_company_seal (anon).
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { formatDateTime } from '@/lib/dates';
import { FullPageSpinner } from '@/components/ui/Spinner';
import { BRAND_NAME, BRAND_TAGLINE, usePageTitle } from '@/lib/usePageTitle';

interface Seal {
  company_name: string;
  compliance_score: number;
  last_audit_at: string | null;
  audits_12m: number;
  asos_valid_pct: number | null;
  generated_at: string;
}

type Tier = 'green' | 'amber' | 'red';
function tier(score: number): Tier {
  if (score >= 85) return 'green';
  if (score >= 70) return 'amber';
  return 'red';
}
function tierLabel(t: Tier): string {
  return t === 'green' ? 'EXCELENTE' : t === 'amber' ? 'BOM' : 'EM ATENÇÃO';
}
function tierClasses(t: Tier): string {
  if (t === 'green') return 'bg-neutral-500 text-white';
  if (t === 'amber') return 'bg-amber-500 text-white';
  return 'bg-red-500 text-white';
}

export function PublicSealPage() {
  const { id } = useParams<{ id: string }>();
  usePageTitle('Selo de Conformidade');
  const [data, setData] = useState<Seal | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;
    void (async () => {
      const { data: rows, error } = await supabase.rpc('get_company_seal', {
        p_company_id: id,
      });
      setLoading(false);
      if (error || !rows || rows.length === 0 || !rows[0]?.company_name) {
        setNotFound(true);
        return;
      }
      setData(rows[0] as Seal);
    })();
  }, [id]);

  if (loading) return <FullPageSpinner />;

  if (notFound || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50 p-6">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-semibold text-neutral-800">
            Selo não encontrado
          </h1>
          <p className="mt-2 text-sm text-neutral-500">
            O estabelecimento pode ter desativado o selo ou o link está
            incorreto.
          </p>
        </div>
      </div>
    );
  }

  const t = tier(data.compliance_score);
  const tCls = tierClasses(t);

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-50 to-neutral-100 p-4">
      <div className="mx-auto max-w-md space-y-4 py-6">
        <header className="text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
            {BRAND_NAME} · {BRAND_TAGLINE}
          </p>
          <h1 className="mt-1 text-lg font-bold text-neutral-800 sm:text-xl">
            {data.company_name}
          </h1>
          <p className="mt-0.5 text-xs text-neutral-500">
            Selo de Conformidade · Segurança Alimentar
          </p>
        </header>

        {/* Score grande */}
        <div className={`rounded-2xl p-8 text-center shadow-lg ${tCls}`}>
          <div className="text-7xl font-black tracking-tight">
            {data.compliance_score}
          </div>
          <div className="mt-1 text-xs font-medium uppercase opacity-90">
            de 100 pontos
          </div>
          <div className="mt-4 inline-block rounded-full bg-white/20 px-4 py-1.5 text-sm font-semibold uppercase">
            {tierLabel(t)}
          </div>
        </div>

        {/* Detalhes */}
        <div className="space-y-2 rounded-2xl bg-white p-4 shadow-sm">
          <Row
            label="Última visita técnica"
            value={
              data.last_audit_at
                ? formatDateTime(new Date(data.last_audit_at))
                : 'Sem registro'
            }
          />
          <Row
            label="Visitas nos últimos 12 meses"
            value={String(data.audits_12m)}
          />
          <Row
            label="Manipuladores com ASO válido"
            value={
              data.asos_valid_pct === null ? '—' : `${data.asos_valid_pct}%`
            }
          />
        </div>

        {/* Explicação do score */}
        <div className="rounded-2xl bg-white p-4 text-xs text-neutral-600 shadow-sm">
          <h2 className="text-sm font-semibold text-neutral-800">
            Como calculamos
          </h2>
          <p className="mt-2 leading-relaxed">
            O score 0–100 mede a aderência às boas práticas da{' '}
            <b>RDC 216/ANVISA</b> com base em: não-conformidades em aberto,
            cumprimento de checklists, visitas técnicas, monitoramento de
            temperatura, documentos publicados, ASOs dos manipuladores e
            controle de pragas.
          </p>
          <p className="mt-2 leading-relaxed">
            <b>{BRAND_NAME}</b> não tem vínculo comercial com o estabelecimento
            avaliado. O selo é gerado automaticamente a partir dos registros
            operacionais da empresa.
          </p>
        </div>

        <p className="text-center text-[11px] text-neutral-400">
          Gerado em {formatDateTime(new Date(data.generated_at))}
        </p>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2 py-1.5">
      <span className="text-xs text-neutral-500">{label}</span>
      <span className="text-sm font-medium text-neutral-800">{value}</span>
    </div>
  );
}
