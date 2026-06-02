// Dossiê ANVISA / "Modo visita fiscal"
//
// Página que agrega TUDO que importa numa visita fiscal: dados da
// empresa, score atual, ASOs dos manipuladores, NCs abertas, últimas
// auditorias, documentos publicados, leituras de temperatura recentes,
// últimos serviços de pragas. Estilizada para impressão (Ctrl+P → Salvar
// como PDF — sem lib paga).
//
// Acesso: usuário autenticado da empresa (nutri/admin/property).
import { useCallback, useEffect, useState } from 'react';
import { Printer } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import {
  usePageTitle,
  BRAND_NAME,
  BRAND_TAGLINE,
  SITE_URL,
} from '@/lib/usePageTitle';
import { useCompanyScope } from '@/lib/useCompanyScope';
import { formatDate, formatDateTime } from '@/lib/dates';
import { calculateComplianceScore } from '@/lib/complianceScore';
import { scoreTier, tierLabel, tierHex, PRINT_HEX } from '@/lib/printTheme';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';

/** Estilo de impressão premium do dossiê (eleva todas as seções/tabelas). */
const DOSSIE_STYLES = `
.dossie-doc { color: ${PRINT_HEX.body}; }
.dossie-doc h3 {
  font-size: 10.5px; font-weight: 700; letter-spacing: .06em;
  text-transform: uppercase; color: ${PRINT_HEX.brandDark};
  padding-bottom: 4px; margin-bottom: 6px;
  border-bottom: 1.5px solid ${PRINT_HEX.hair};
}
.dossie-doc table { width: 100%; border-collapse: collapse; }
.dossie-doc thead tr { background: ${PRINT_HEX.brandDeep}; }
.dossie-doc thead th {
  color: #fff; font-size: 9px; font-weight: 700; text-transform: uppercase;
  letter-spacing: .03em; text-align: left; padding: 5px 6px;
}
.dossie-doc tbody td {
  font-size: 9.5px; padding: 4px 6px; color: ${PRINT_HEX.body};
  border-bottom: 1px solid ${PRINT_HEX.hair};
}
.dossie-doc tbody tr:nth-child(even) { background: #f8fafc; }
.dossie-doc section { break-inside: avoid; }
@media print {
  .dossie-doc thead tr { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}
`;

interface Company {
  name: string;
  cnpj: string | null;
  address: string | null;
  phone: string | null;
}
interface ComplianceRow {
  nc_total_30d: number;
  nc_overdue_30d: number;
  nc_open_now: number;
  checklists_ran_30d: number;
  checklists_planned_30d: number;
  has_audit_last_90d: boolean;
  last_audit_at: string | null;
  next_audit_at: string | null;
  temp_readings_7d: number;
  temp_out_of_range_7d: number;
  docs_published: number;
  docs_pending: number;
  manipulators_active: number;
  manipulators_aso_ok: number;
  manipulators_aso_expired: number;
  manipulators_aso_missing: number;
  has_pest_service_active: boolean;
  has_pest_service_registered: boolean;
  last_pest_at: string | null;
  next_pest_due_at: string | null;
}
interface ManipRow {
  id: string;
  name: string;
  role: string | null;
  active: boolean;
}
interface AsoRow {
  manipulator_id: string;
  expires_at: string;
  doctor_name: string | null;
}
interface NcRow {
  id: string;
  title: string;
  severity: string;
  opened_at: string;
  status: string;
}
interface AuditRow {
  id: string;
  scheduled_at: string | null;
  completed_at: string | null;
  status: string;
  score: number | null;
  template: { name: string } | null;
}
interface DocRow {
  id: string;
  title: string;
  type: string;
  status: string;
  version: number | null;
}

export function DossiePage() {
  usePageTitle('Dossiê de Conformidade');
  const { companyId, selectedCompany } = useCompanyScope();
  const [emittedAt] = useState(() => new Date());
  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState<Company | null>(null);
  const [compliance, setCompliance] = useState<ComplianceRow | null>(null);
  const [manips, setManips] = useState<ManipRow[]>([]);
  const [asos, setAsos] = useState<AsoRow[]>([]);
  const [ncs, setNcs] = useState<NcRow[]>([]);
  const [audits, setAudits] = useState<AuditRow[]>([]);
  const [docs, setDocs] = useState<DocRow[]>([]);

  const load = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const [coRes, cpRes, mRes, asoRes, ncRes, auRes, docRes] =
        await Promise.all([
          supabase
            .from('companies')
            .select('name, cnpj, address, phone')
            .eq('id', companyId)
            .maybeSingle(),
          supabase
            .from('company_compliance_v')
            .select('*')
            .eq('company_id', companyId)
            .maybeSingle(),
          supabase
            .from('manipulators')
            .select('id, name, role, active')
            .eq('company_id', companyId)
            .eq('active', true)
            .order('name'),
          supabase
            .from('manipulator_asos')
            .select('manipulator_id, expires_at, doctor_name')
            .order('expires_at', { ascending: false }),
          supabase
            .from('non_conformities')
            .select('id, title, severity, opened_at, status')
            .eq('company_id', companyId)
            .eq('status', 'open')
            .order('opened_at', { ascending: false })
            .limit(50),
          supabase
            .from('audits')
            .select(
              'id, scheduled_at, completed_at, status, score, template:audit_templates(name)',
            )
            .eq('company_id', companyId)
            .order('completed_at', { ascending: false, nullsFirst: false })
            .limit(10),
          supabase
            .from('documents')
            .select('id, title, type, status, version')
            .eq('company_id', companyId)
            .eq('status', 'published')
            .order('title'),
        ]);
      setCompany(coRes.data as Company | null);
      setCompliance(cpRes.data as ComplianceRow | null);
      setManips((mRes.data as ManipRow[]) ?? []);
      setAsos((asoRes.data as AsoRow[]) ?? []);
      setNcs((ncRes.data as NcRow[]) ?? []);
      setAudits((auRes.data as unknown as AuditRow[]) ?? []);
      setDocs((docRes.data as DocRow[]) ?? []);
    } catch (e) {
      toast.error('Erro ao carregar: ' + ((e as Error)?.message ?? String(e)));
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    void load();
  }, [load]);

  // Ativa CSS @media print do dossie: imprime so o conteudo, sem nav.
  useEffect(() => {
    document.body.classList.add('dossie-print');
    return () => document.body.classList.remove('dossie-print');
  }, []);

  if (!companyId) {
    return (
      <Card>
        <p className="text-sm text-neutral-600">
          Selecione uma empresa primeiro.
        </p>
      </Card>
    );
  }
  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  const score = compliance
    ? calculateComplianceScore({
        ncTotal30d: compliance.nc_total_30d ?? 0,
        ncOverdue30d: compliance.nc_overdue_30d ?? 0,
        checklistsPlanned30d: compliance.checklists_planned_30d ?? 0,
        checklistsRan30d: compliance.checklists_ran_30d ?? 0,
        hasAuditLast90d: !!compliance.has_audit_last_90d,
        tempReadings7d: compliance.temp_readings_7d ?? 0,
        tempOutOfRange7d: compliance.temp_out_of_range_7d ?? 0,
        publishedDocs: compliance.docs_published ?? 0,
        manipulatorsActive: compliance.manipulators_active ?? 0,
        manipulatorsAsoOk: compliance.manipulators_aso_ok ?? 0,
        hasPestServiceActive: !!compliance.has_pest_service_active,
        hasPestServiceRegistered: !!compliance.has_pest_service_registered,
      })
    : null;

  // ASOs do manipulador mais recente
  const asoByManip = new Map<string, AsoRow>();
  for (const a of asos) {
    if (!asoByManip.has(a.manipulator_id)) asoByManip.set(a.manipulator_id, a);
  }
  const emittedMs = emittedAt.getTime();

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 print:hidden">
        <div>
          <h1 className="text-xl font-semibold text-neutral-800 sm:text-2xl">
            Dossiê de Conformidade
          </h1>
          <p className="text-sm text-neutral-500">
            Tudo o que o fiscal precisa em uma página. Para salvar como PDF:
            clique em imprimir e escolha “Salvar como PDF”.
          </p>
        </div>
        <Button onClick={() => window.print()}>
          <Printer size={16} /> Imprimir / Salvar PDF
        </Button>
      </div>

      <style>{DOSSIE_STYLES}</style>
      <article className="dossie-doc space-y-5 overflow-hidden rounded-2xl border border-neutral-200 bg-white print:rounded-none print:border-0">
        {/* Faixa da marca */}
        <div
          className="flex items-center justify-between gap-3 px-5 py-3 text-white sm:px-7"
          style={{
            background: PRINT_HEX.brandDeep,
            WebkitPrintColorAdjust: 'exact',
            printColorAdjust: 'exact',
          }}
        >
          <div>
            <p className="text-base font-bold leading-none">{BRAND_NAME}</p>
            <p
              className="mt-1 text-[9px] font-medium uppercase tracking-wider"
              style={{ color: '#a7f3d0' }}
            >
              {BRAND_TAGLINE}
            </p>
          </div>
          <div className="text-right">
            <p
              className="text-[9px] font-semibold uppercase tracking-wider"
              style={{ color: '#a7f3d0' }}
            >
              Dossiê de Conformidade
            </p>
            <p className="text-[10px]" style={{ color: '#d1fae5' }}>
              RDC 216 · ANVISA
            </p>
          </div>
        </div>

        <div className="space-y-5 px-5 pb-5 sm:px-7 sm:pb-7">
          {/* Cabeçalho da empresa */}
          <section className="flex items-start justify-between gap-4 border-b border-neutral-200 pb-4">
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-neutral-900">
                {company?.name ?? selectedCompany?.name ?? 'Empresa'}
              </h2>
              <p className="mt-1 text-xs text-neutral-500">
                {[
                  company?.cnpj ? `CNPJ ${company.cnpj}` : '',
                  company?.phone ? `Tel ${company.phone}` : '',
                ]
                  .filter(Boolean)
                  .join('  ·  ')}
              </p>
              {company?.address && (
                <p className="text-xs text-neutral-500">{company.address}</p>
              )}
              <p className="mt-1 text-[11px] text-neutral-400">
                Emitido em {formatDateTime(emittedAt)}
              </p>
            </div>
            {/* QR verificável → selo público */}
            <div className="shrink-0 text-center">
              <div className="rounded-lg border border-neutral-200 p-1">
                <QRCodeSVG
                  value={`${SITE_URL}/selo/${companyId}`}
                  size={64}
                  level="M"
                />
              </div>
              <p className="mt-1 text-[8px] uppercase tracking-wide text-neutral-400">
                Verificar
              </p>
            </div>
          </section>

          {/* Hero de score */}
          {score &&
            (() => {
              const t = scoreTier(score.total);
              const c = tierHex(t);
              return (
                <section
                  className="flex items-center justify-between gap-4 rounded-xl border p-4"
                  style={{
                    borderColor: c.fg,
                    background: c.bg,
                    WebkitPrintColorAdjust: 'exact',
                    printColorAdjust: 'exact',
                  }}
                >
                  <div className="flex items-end gap-3">
                    <span
                      className="text-5xl font-black leading-none"
                      style={{ color: c.fg }}
                    >
                      {Math.round(score.total)}
                    </span>
                    <div className="pb-1">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                        Score de Conformidade
                      </p>
                      <p className="text-xs text-neutral-500">de 100 pontos</p>
                    </div>
                  </div>
                  <span
                    className="rounded-full px-4 py-1.5 text-sm font-bold text-white"
                    style={{
                      background: c.fg,
                      WebkitPrintColorAdjust: 'exact',
                      printColorAdjust: 'exact',
                    }}
                  >
                    {tierLabel(t)}
                  </span>
                </section>
              );
            })()}

          {/* Breakdown do score */}
          {score && (
            <section>
              <h3>Composição do score</h3>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <ScoreLine
                  label="Não-conformidades"
                  value={`${score.ncPart}/25`}
                />
                <ScoreLine
                  label="Checklists"
                  value={`${score.checklistPart}/20`}
                />
                <ScoreLine
                  label="Visita técnica"
                  value={`${score.auditPart}/20`}
                />
                <ScoreLine label="Temperatura" value={`${score.tempPart}/10`} />
                <ScoreLine label="Documentos" value={`${score.docsPart}/10`} />
                <ScoreLine
                  label="Manipuladores"
                  value={`${score.manipulatorsPart}/10`}
                />
                <ScoreLine
                  label="Controle de pragas"
                  value={`${score.pestPart}/5`}
                />
              </div>
            </section>
          )}

          {/* Manipuladores e ASOs */}
          <section>
            <h3 className="text-sm font-semibold uppercase text-neutral-700">
              Manipuladores ({manips.length}) e ASOs
            </h3>
            {manips.length === 0 ? (
              <p className="mt-1 text-xs text-neutral-500">
                Nenhum manipulador ativo cadastrado.
              </p>
            ) : (
              <table className="mt-2 w-full text-xs">
                <thead className="border-b border-neutral-300 text-neutral-500">
                  <tr>
                    <th className="px-1 py-1 text-left">Nome</th>
                    <th className="px-1 py-1 text-left">Função</th>
                    <th className="px-1 py-1 text-left">Validade ASO</th>
                    <th className="px-1 py-1 text-left">Médico</th>
                  </tr>
                </thead>
                <tbody>
                  {manips.map((m) => {
                    const aso = asoByManip.get(m.id);
                    const expired =
                      aso && new Date(aso.expires_at).getTime() < emittedMs;
                    return (
                      <tr key={m.id} className="border-b border-neutral-100">
                        <td className="px-1 py-1">{m.name}</td>
                        <td className="px-1 py-1">{m.role ?? '—'}</td>
                        <td
                          className={`px-1 py-1 ${expired ? 'text-red-700' : ''}`}
                        >
                          {aso
                            ? formatDate(new Date(aso.expires_at))
                            : 'SEM ASO'}
                          {expired ? ' (vencido)' : ''}
                        </td>
                        <td className="px-1 py-1">{aso?.doctor_name ?? '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </section>

          {/* Não-conformidades abertas */}
          <section>
            <h3 className="text-sm font-semibold uppercase text-neutral-700">
              Não-conformidades em aberto ({ncs.length})
            </h3>
            {ncs.length === 0 ? (
              <p className="mt-1 text-xs text-emerald-700">
                Nenhuma NC em aberto.
              </p>
            ) : (
              <table className="mt-2 w-full text-xs">
                <thead className="border-b border-neutral-300 text-neutral-500">
                  <tr>
                    <th className="px-1 py-1 text-left">Aberta em</th>
                    <th className="px-1 py-1 text-left">Severidade</th>
                    <th className="px-1 py-1 text-left">Descrição</th>
                  </tr>
                </thead>
                <tbody>
                  {ncs.map((n) => (
                    <tr key={n.id} className="border-b border-neutral-100">
                      <td className="px-1 py-1">
                        {formatDate(new Date(n.opened_at))}
                      </td>
                      <td className="px-1 py-1">{n.severity}</td>
                      <td className="px-1 py-1">{n.title}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          {/* Visitas técnicas */}
          <section>
            <h3 className="text-sm font-semibold uppercase text-neutral-700">
              Últimas visitas técnicas ({audits.length})
            </h3>
            {audits.length === 0 ? (
              <p className="mt-1 text-xs text-neutral-500">
                Nenhuma visita técnica registrada.
              </p>
            ) : (
              <table className="mt-2 w-full text-xs">
                <thead className="border-b border-neutral-300 text-neutral-500">
                  <tr>
                    <th className="px-1 py-1 text-left">Modelo</th>
                    <th className="px-1 py-1 text-left">Status</th>
                    <th className="px-1 py-1 text-left">Concluída</th>
                    <th className="px-1 py-1 text-right">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {audits.map((a) => (
                    <tr key={a.id} className="border-b border-neutral-100">
                      <td className="px-1 py-1">{a.template?.name ?? '—'}</td>
                      <td className="px-1 py-1">{a.status}</td>
                      <td className="px-1 py-1">
                        {a.completed_at
                          ? formatDateTime(new Date(a.completed_at))
                          : '—'}
                      </td>
                      <td className="px-1 py-1 text-right">{a.score ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          {/* Documentos publicados */}
          <section>
            <h3 className="text-sm font-semibold uppercase text-neutral-700">
              Documentos publicados ({docs.length})
            </h3>
            {docs.length === 0 ? (
              <p className="mt-1 text-xs text-amber-700">
                Nenhum documento publicado.
              </p>
            ) : (
              <ul className="mt-2 grid grid-cols-1 gap-x-4 gap-y-0.5 text-xs text-neutral-700 sm:grid-cols-2">
                {docs.map((d) => (
                  <li key={d.id}>
                    <b>[{d.type}]</b> {d.title}
                    {d.version ? ` · v${d.version}` : ''}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Temperatura */}
          {compliance && (
            <section>
              <h3 className="text-sm font-semibold uppercase text-neutral-700">
                Temperatura (últimos 7 dias)
              </h3>
              <p className="mt-1 text-xs text-neutral-600">
                {compliance.temp_readings_7d ?? 0} leituras ·{' '}
                {compliance.temp_out_of_range_7d ?? 0} fora da faixa
              </p>
            </section>
          )}

          {/* Pragas */}
          {compliance && (
            <section>
              <h3 className="text-sm font-semibold uppercase text-neutral-700">
                Controle de pragas
              </h3>
              <p className="mt-1 text-xs text-neutral-600">
                {compliance.has_pest_service_active
                  ? 'Serviço ativo'
                  : compliance.has_pest_service_registered
                    ? 'Sem serviço ativo (registrado mas vencido)'
                    : 'Nenhum serviço registrado'}
                {compliance.last_pest_at
                  ? ` · último em ${formatDate(new Date(compliance.last_pest_at))}`
                  : ''}
                {compliance.next_pest_due_at
                  ? ` · próximo em ${formatDate(new Date(compliance.next_pest_due_at))}`
                  : ''}
              </p>
            </section>
          )}

          <footer className="flex items-center justify-between gap-2 border-t border-neutral-200 pt-3 text-[10px] text-neutral-400">
            <span>
              <b style={{ color: PRINT_HEX.brandDark }}>{BRAND_NAME}</b> ·{' '}
              {BRAND_TAGLINE}
            </span>
            <span>
              Gerado automaticamente — reflete os registros na emissão.
            </span>
          </footer>
        </div>
      </article>
    </div>
  );
}

function ScoreLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2">
      <p className="text-[9px] font-medium uppercase tracking-wide text-neutral-400">
        {label}
      </p>
      <p className="text-sm font-bold text-neutral-800">{value}</p>
    </div>
  );
}
