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
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { usePageTitle } from '@/lib/usePageTitle';
import { useCompanyScope } from '@/lib/useCompanyScope';
import { formatDate, formatDateTime } from '@/lib/dates';
import { calculateComplianceScore } from '@/lib/complianceScore';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';

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
            .select('id, scheduled_at, completed_at, status, score, template:audit_templates(name)')
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
        <p className="text-sm text-neutral-600">Selecione uma empresa primeiro.</p>
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

      <article className="space-y-4 bg-white p-4 sm:p-6 print:p-0 print:text-[10pt]">
        {/* Cabeçalho */}
        <section className="border-b border-neutral-300 pb-3">
          <h2 className="text-lg font-bold text-neutral-800">
            {company?.name ?? selectedCompany?.name ?? 'Empresa'}
          </h2>
          <dl className="mt-1 grid grid-cols-1 gap-x-4 gap-y-0.5 text-xs text-neutral-600 sm:grid-cols-2">
            {company?.cnpj && (
              <div>
                <dt className="inline font-medium">CNPJ: </dt>
                <dd className="inline">{company.cnpj}</dd>
              </div>
            )}
            {company?.phone && (
              <div>
                <dt className="inline font-medium">Telefone: </dt>
                <dd className="inline">{company.phone}</dd>
              </div>
            )}
            {company?.address && (
              <div className="sm:col-span-2">
                <dt className="inline font-medium">Endereço: </dt>
                <dd className="inline">{company.address}</dd>
              </div>
            )}
            <div className="sm:col-span-2">
              <dt className="inline font-medium">Emitido em: </dt>
              <dd className="inline">{formatDateTime(new Date())}</dd>
            </div>
          </dl>
        </section>

        {/* Score */}
        {score && (
          <section>
            <h3 className="text-sm font-semibold uppercase text-neutral-700">
              Score de Conformidade
            </h3>
            <div className="mt-2 flex items-end gap-4">
              <span className="text-4xl font-bold text-neutral-900">
                {Math.round(score.total)}
              </span>
              <span className="pb-1 text-xs text-neutral-500">de 100</span>
            </div>
            <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs text-neutral-600 sm:grid-cols-4">
              <ScoreLine label="NCs" value={`${score.ncPart}/25`} />
              <ScoreLine label="Checklists" value={`${score.checklistPart}/20`} />
              <ScoreLine label="Visita técnica" value={`${score.auditPart}/20`} />
              <ScoreLine label="Temperatura" value={`${score.tempPart}/10`} />
              <ScoreLine label="Documentos" value={`${score.docsPart}/10`} />
              <ScoreLine
                label="Manipuladores"
                value={`${score.manipulatorsPart}/10`}
              />
              <ScoreLine label="Pragas" value={`${score.pestPart}/5`} />
            </dl>
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
                    aso && new Date(aso.expires_at).getTime() < Date.now();
                  return (
                    <tr key={m.id} className="border-b border-neutral-100">
                      <td className="px-1 py-1">{m.name}</td>
                      <td className="px-1 py-1">{m.role ?? '—'}</td>
                      <td className={`px-1 py-1 ${expired ? 'text-red-700' : ''}`}>
                        {aso ? formatDate(new Date(aso.expires_at)) : 'SEM ASO'}
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
            <p className="mt-1 text-xs text-emerald-700">Nenhuma NC em aberto.</p>
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
                    <td className="px-1 py-1">{formatDate(new Date(n.opened_at))}</td>
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
                    <td className="px-1 py-1 text-right">
                      {a.score ?? '—'}
                    </td>
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

        <footer className="border-t border-neutral-300 pt-2 text-center text-[10px] text-neutral-400">
          Dossiê gerado automaticamente pelo ProActive7 · Os dados refletem o
          estado dos registros no momento da emissão.
        </footer>
      </article>
    </div>
  );
}

function ScoreLine({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="inline font-medium">{label}: </dt>
      <dd className="inline">{value}</dd>
    </div>
  );
}
