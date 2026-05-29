// Helpers para impressão direta via agente local (estilo PrintNode).
// O frontend gera o ZPL com src/lib/zpl.ts e enfileira na tabela
// public.print_jobs; o agente em agent/print-agent.mjs faz o polling
// e manda pra impressora. O status do job chega de volta em tempo real
// pela publication supabase_realtime (subscribePrintJob).
import { supabase } from './supabase';
import { buildLabelZpl } from './zpl';
import type { LabelData } from '@/components/LabelPreview';

/** Impressora encontrada pelo agente na varredura da rede. */
export interface DiscoveredPrinter {
  host: string;
  port: number;
  name?: string;
}

export interface PrintAgent {
  id: string;
  company_id: string;
  name: string;
  computer_name: string | null;
  /** Nome da impressora instalada no Windows (via QZ Tray). */
  printer_name: string | null;
  printer_host: string | null;
  printer_port: number;
  label_width_mm: number;
  label_height_mm: number;
  dpi: number;
  active: boolean;
  last_seen_at: string | null;
  relay_version: string | null;
  discovered: DiscoveredPrinter[];
  discovered_at: string | null;
  created_at: string;
}

export interface RelayLog {
  id: string;
  agent_id: string;
  company_id: string;
  level: 'info' | 'warn' | 'error';
  message: string;
  created_at: string;
}

/** Define qual impressora detectada o agente deve usar. */
export async function setAgentPrinter(
  agentId: string,
  printer: DiscoveredPrinter,
): Promise<void> {
  const { error } = await supabase
    .from('print_agents')
    .update({ printer_host: printer.host, printer_port: printer.port })
    .eq('id', agentId);
  if (error) throw error;
}

export interface PrintJob {
  id: string;
  company_id: string;
  agent_id: string;
  label_id: string | null;
  status: 'queued' | 'printing' | 'done' | 'error';
  error: string | null;
  copies: number;
  created_at: string;
  printed_at: string | null;
}

/** Online se reportou heartbeat nos últimos 60s. */
export function isAgentOnline(agent: Pick<PrintAgent, 'last_seen_at'>): boolean {
  if (!agent.last_seen_at) return false;
  const last = new Date(agent.last_seen_at).getTime();
  return Date.now() - last < 60_000;
}

/** Gera um token aleatório (mostrado uma única vez na criação do agente). */
export function generateAgentToken(): string {
  const buf = new Uint8Array(24);
  crypto.getRandomValues(buf);
  return Array.from(buf)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** SHA-256 em hex — usar para armazenar token_hash no banco. */
export async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export interface DirectPrintInput {
  agent: PrintAgent;
  labelData: LabelData;
  widthMm: number;
  heightMm: number;
  copies: number;
  companyId: string;
  labelId?: string | null;
  createdBy?: string | null;
}

/** Enfileira um job para o agente imprimir e devolve o id do job. */
export async function queueDirectPrint(
  input: DirectPrintInput,
): Promise<string> {
  const zpl = buildLabelZpl(input.labelData, {
    widthMm: input.widthMm,
    heightMm: input.heightMm,
    dpi: input.agent.dpi,
    copies: input.copies,
  });
  // Só preenche label_id se a linha JÁ existir em label_prints (FK exige).
  // No fluxo de impressão direta a label_prints geralmente ainda não foi
  // criada (só é criada na confirmação do diálogo do navegador).
  let labelId: string | null = null;
  if (input.labelId) {
    const { data: exists } = await supabase
      .from('label_prints')
      .select('id')
      .eq('id', input.labelId)
      .maybeSingle();
    labelId = exists ? input.labelId : null;
  }
  const { data, error } = await supabase
    .from('print_jobs')
    .insert({
      company_id: input.companyId,
      agent_id: input.agent.id,
      label_id: labelId,
      zpl,
      copies: input.copies,
      created_by: input.createdBy ?? null,
    })
    .select('id')
    .single();
  if (error) throw error;
  return data.id as string;
}

/** Assina mudanças de um job e devolve uma função de unsubscribe. */
export function subscribePrintJob(
  jobId: string,
  onUpdate: (job: PrintJob) => void,
): () => void {
  const channel = supabase
    .channel(`print_job_${jobId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'print_jobs',
        filter: `id=eq.${jobId}`,
      },
      (payload) => onUpdate(payload.new as PrintJob),
    )
    .subscribe();
  return () => {
    void supabase.removeChannel(channel);
  };
}
