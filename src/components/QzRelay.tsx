// QzRelay — quando o app está aberto numa aba do PC ligado à impressora
// (com QZ Tray rodando), esta aba age como relay: subscreve a fila de
// print_jobs do Supabase em tempo real e envia ao QZ Tray local. Isso
// permite imprimir do celular/tablet (que não enxerga o localhost do PC).
import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { connectQz, isQzConnected, printZpl } from '@/lib/qzTray';

interface JobRow {
  id: string;
  company_id: string;
  agent_id: string;
  zpl: string;
  copies: number;
  status: string;
}

export function QzRelay() {
  const { profile } = useAuth();
  const companyId = profile?.company_id ?? null;
  const orgId = profile?.organization_id ?? null;
  const processing = useRef<Set<string>>(new Set());

  // Tenta conectar no QZ Tray local em background.
  useEffect(() => {
    if (!profile) return;
    if (isQzConnected()) return;
    connectQz().catch(() => {
      /* sem QZ neste PC — apenas não vira relay */
    });
  }, [profile]);

  useEffect(() => {
    if (!profile) return;
    // Filtro: property vê só própria empresa; nutri/admin veem todas as
    // empresas que enxergam pelo RLS. O filtro do Realtime aceita só uma
    // expressão, então: property usa company_id=eq.X; nutri sem filtro
    // (o RLS no banco bloqueia o resto).
    const channel = supabase
      .channel(`qz_relay_${companyId ?? orgId ?? 'all'}`)
      .on(
        'postgres_changes',
        companyId
          ? {
              event: 'INSERT',
              schema: 'public',
              table: 'print_jobs',
              filter: `company_id=eq.${companyId}`,
            }
          : {
              event: 'INSERT',
              schema: 'public',
              table: 'print_jobs',
            },
        async (payload) => {
          const job = payload.new as JobRow;
          if (job.status !== 'queued') return;
          if (processing.current.has(job.id)) return;
          processing.current.add(job.id);
          try {
            await handleJob(job);
          } finally {
            processing.current.delete(job.id);
          }
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [profile, companyId, orgId]);

  return null;
}

async function handleJob(job: JobRow) {
  // Só age se o QZ Tray local estiver CONECTADO de fato. Se não estiver,
  // deixa pro BrowserPrintRelay assumir (caminho fallback). NUNCA tenta
  // claim antes de saber que vai conseguir imprimir.
  if (!isQzConnected()) return;

  // Claim atômico: marca como 'printing' SE ainda estiver 'queued'.
  const { data: claimed, error: claimErr } = await supabase
    .from('print_jobs')
    .update({ status: 'printing', updated_at: new Date().toISOString() })
    .eq('id', job.id)
    .eq('status', 'queued')
    .select('id');
  if (claimErr || !claimed || claimed.length === 0) return;

  // Busca o nome da impressora no Windows.
  const { data: agent } = await supabase
    .from('print_agents')
    .select('printer_name')
    .eq('id', job.agent_id)
    .single();

  const printerName = (agent as { printer_name?: string } | null)?.printer_name;
  if (!printerName) {
    await supabase
      .from('print_jobs')
      .update({
        status: 'error',
        error: 'Impressora sem nome do Windows cadastrado.',
        updated_at: new Date().toISOString(),
      })
      .eq('id', job.id);
    return;
  }

  try {
    await printZpl(printerName, job.zpl, job.copies || 1);
    await supabase
      .from('print_jobs')
      .update({
        status: 'done',
        printed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', job.id);
  } catch (e) {
    await supabase
      .from('print_jobs')
      .update({
        status: 'error',
        error: (e as Error)?.message ?? String(e),
        updated_at: new Date().toISOString(),
      })
      .eq('id', job.id);
  }
}
