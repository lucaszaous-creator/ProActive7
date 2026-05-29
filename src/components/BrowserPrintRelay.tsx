// BrowserPrintRelay — quando o app está aberto numa aba do PC ligado à
// impressora (Chrome com `--kiosk-printing`), esta aba age como relay:
// escuta a fila print_jobs em tempo real, renderiza a etiqueta em HTML/CSS
// no portal de impressão e chama window.print(). Em modo kiosk-printing
// o Chrome imprime SILENCIOSAMENTE pra impressora padrão do Windows,
// sem prompt e sem precisar do QZ Tray.
//
// Para isso funcionar:
//   1. Chrome aberto com --kiosk-printing (o configurar-pc.bat já cria
//      o atalho com essa flag)
//   2. A impressora térmica configurada como PADRÃO no Windows
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { formatDateTime } from '@/lib/dates';
import { formatAllergenList } from '@/lib/allergens';
import { isQzConnected } from '@/lib/qzTray';
import { LabelPreview, type LabelData } from './LabelPreview';

const SITE_URL =
  typeof window !== 'undefined' && window.location.origin
    ? window.location.origin
    : 'https://proactive7.com.br';

interface JobRow {
  id: string;
  company_id: string;
  agent_id: string;
  label_id: string | null;
  copies: number;
  status: string;
}

interface PrintingState {
  data: LabelData;
  widthMm: number;
  heightMm: number;
  copies: number;
}

function applyPageStyle(widthMm: number, heightMm: number): void {
  let style = document.getElementById('proactive7-page-style') as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement('style');
    style.id = 'proactive7-page-style';
    document.head.appendChild(style);
  }
  style.textContent = `@page { size: ${widthMm}mm ${heightMm}mm; margin: 0; }`;
}

export function BrowserPrintRelay() {
  const { profile } = useAuth();
  const companyId = profile?.company_id ?? null;
  const [printing, setPrinting] = useState<PrintingState | null>(null);
  const processing = useRef<Set<string>>(new Set());
  const printResolvers = useRef<Map<string, () => void>>(new Map());

  // Quando a impressão termina (afterprint), libera os jobs aguardando.
  useEffect(() => {
    const onAfter = () => {
      printResolvers.current.forEach((r) => r());
      printResolvers.current.clear();
      setPrinting(null);
    };
    window.addEventListener('afterprint', onAfter);
    return () => window.removeEventListener('afterprint', onAfter);
  }, []);

  const handleJob = useCallback(
    async (job: JobRow) => {
      if (job.status !== 'queued') return;
      if (!job.label_id) {
        // Sem label_id não dá pra renderizar HTML — não somos o relay.
        return;
      }
      // Se o QZ Tray esta conectado, deixa o QzRelay tratar (multi-tenant
      // correto: ele mira impressora especifica por nome do cadastro).
      // BrowserPrintRelay so age como fallback quando nao ha QZ Tray.
      if (isQzConnected()) return;

      // Claim atômico
      const { data: claimed, error: claimErr } = await supabase
        .from('print_jobs')
        .update({ status: 'printing', updated_at: new Date().toISOString() })
        .eq('id', job.id)
        .eq('status', 'queued')
        .select('id');
      if (claimErr || !claimed || claimed.length === 0) return;

      try {
        // Busca dados da etiqueta, empresa e impressora cadastrada
        const [labelRes, agentRes] = await Promise.all([
          supabase
            .from('label_prints')
            .select('*, companies(name, cnpj, address, label_settings, logo_path)')
            .eq('id', job.label_id)
            .single(),
          supabase
            .from('print_agents')
            .select('label_width_mm, label_height_mm')
            .eq('id', job.agent_id)
            .single(),
        ]);
        if (labelRes.error) throw labelRes.error;
        if (agentRes.error) throw agentRes.error;

        const lp = labelRes.data as Record<string, unknown>;
        const ag = agentRes.data as Record<string, unknown>;
        const company = (lp.companies ?? {}) as Record<string, unknown>;
        const logoPath = company.logo_path as string | null | undefined;
        const logoUrl = logoPath
          ? supabase.storage.from('branding').getPublicUrl(logoPath).data.publicUrl
          : null;
        const settings = (company.label_settings ?? {}) as Record<string, unknown>;

        const labelData: LabelData = {
          companyName: (company.name as string) ?? '',
          companyLogoUrl: logoUrl,
          companyCnpj: (company.cnpj as string) ?? null,
          companyAddress: (company.address as string) ?? null,
          primaryColor: (settings.primary_color as string) ?? null,
          productName: (lp.product_name_snapshot as string) ?? '',
          storageConditionLabel: (lp.storage_condition as string) ?? '',
          displayQuantity: (lp.display_quantity as string) ?? null,
          manipulationText: formatDateTime(new Date(lp.manipulation_at as string)),
          expiryText: formatDateTime(new Date(lp.expiry_at as string)),
          responsibleName: (lp.responsible_name as string) ?? '',
          batch: (lp.batch as string) ?? null,
          supplier: (lp.supplier as string) ?? null,
          allergens: ((lp.allergens as string[]) ?? []).map(String),
          printId: (lp.id as string).replace(/-/g, '').slice(0, 6).toUpperCase(),
          qrUrl: `${SITE_URL}/etiqueta/${lp.id as string}`,
        };
        // Garante consistência caso allergens venha de outro formato
        labelData.allergens = formatAllergenList(labelData.allergens ?? []) as unknown as string[];

        const widthMm = (ag.label_width_mm as number) ?? 40;
        const heightMm = (ag.label_height_mm as number) ?? 40;
        const copies = job.copies || 1;

        // Renderiza N cópias no portal e dispara window.print() uma vez.
        applyPageStyle(widthMm, heightMm);
        document.body.classList.add('relay-printing');
        await new Promise<void>((resolve) => {
          printResolvers.current.set(job.id, resolve);
          setPrinting({ data: labelData, widthMm, heightMm, copies });
          // Próximo frame, dispara o print
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              try {
                window.print();
              } catch {
                resolve();
              }
            });
          });
        });
        document.body.classList.remove('relay-printing');

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
    },
    [],
  );

  useEffect(() => {
    if (!profile) return;
    const channel = supabase
      .channel(`browser_print_relay_${companyId ?? 'all'}`)
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
  }, [profile, companyId, handleJob]);

  if (!printing || typeof document === 'undefined') return null;

  return createPortal(
    <div id="relay-print-area">
      {Array.from({ length: printing.copies }).map((_, i) => (
        <div
          key={i}
          style={{ breakAfter: i < printing.copies - 1 ? 'page' : 'auto' }}
        >
          <LabelPreview
            data={printing.data}
            widthMm={printing.widthMm}
            heightMm={printing.heightMm}
          />
        </div>
      ))}
    </div>,
    document.body,
  );
}
