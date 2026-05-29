// WebUsbRelay — quando uma impressora USB já foi pareada (via botão
// "Conectar via USB" em Cadastros → Impressoras), este componente vira o
// relay primário: pega print_jobs da fila e envia o ZPL direto via WebUSB.
// 100% silencioso (sem prompt) e grátis (sem QZ Tray).
import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import {
  getPairedPrinter,
  printRawViaUsb,
} from '@/lib/webUsbPrint';

interface JobRow {
  id: string;
  company_id: string;
  agent_id: string;
  zpl: string;
  copies: number;
  status: string;
}

export function WebUsbRelay() {
  const { profile } = useAuth();
  const companyId = profile?.company_id ?? null;
  const orgId = profile?.organization_id ?? null;
  const processing = useRef<Set<string>>(new Set());
  // Mantém a impressora pareada em memória pra cada job não re-parear.
  const printerRef = useRef<Awaited<ReturnType<typeof getPairedPrinter>>>(null);

  // Ao montar, tenta recuperar impressora já autorizada (sem prompt).
  useEffect(() => {
    if (!profile) return;
    void getPairedPrinter().then((p) => {
      printerRef.current = p;
      if (p) {
        // eslint-disable-next-line no-console
        console.log('[webusb] impressora pareada disponível, relay ativo');
      }
    });
  }, [profile]);

  useEffect(() => {
    if (!profile) return;
    const channel = supabase
      .channel(`webusb_relay_${companyId ?? orgId ?? 'all'}`)
      .on(
        'postgres_changes',
        companyId
          ? {
              event: 'INSERT',
              schema: 'public',
              table: 'print_jobs',
              filter: `company_id=eq.${companyId}`,
            }
          : { event: 'INSERT', schema: 'public', table: 'print_jobs' },
        async (payload) => {
          const job = payload.new as JobRow;
          if (job.status !== 'queued') return;
          // Só age se temos impressora WebUSB pareada localmente.
          if (!printerRef.current) return;
          if (processing.current.has(job.id)) return;
          processing.current.add(job.id);
          try {
            await handleJob(job, printerRef.current);
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

async function handleJob(
  job: JobRow,
  printer: NonNullable<Awaited<ReturnType<typeof getPairedPrinter>>>,
) {
  // Claim atômico
  const { data: claimed, error: claimErr } = await supabase
    .from('print_jobs')
    .update({ status: 'printing', updated_at: new Date().toISOString() })
    .eq('id', job.id)
    .eq('status', 'queued')
    .select('id');
  if (claimErr || !claimed || claimed.length === 0) return;

  try {
    const copies = job.copies || 1;
    for (let i = 0; i < copies; i++) {
      // eslint-disable-next-line no-await-in-loop
      await printRawViaUsb(printer, job.zpl);
    }
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
