import { Link } from 'react-router-dom';
import {
  Tag,
  ClipboardCheck,
  Thermometer,
  HardHat,
  Bug,
  FileText,
  ShieldCheck,
  Bell,
  BarChart3,
  ArrowRight,
  Check,
  Leaf,
  Sparkles,
} from 'lucide-react';
import { usePageMeta } from '@/lib/usePageMeta';

export function LandingPage() {
  usePageMeta('/');
  return (
    <>
      <Hero />
      <TrustStrip />
      <Pillars />
      <FeatureLabels />
      <FeatureAudits />
      <FeatureMonitoring />
      <ForNutritionists />
      <HowItWorks />
      <FinalCta />
    </>
  );
}

/* =====================================================================
 * HERO
 * ===================================================================== */
function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* soft glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-gradient-to-b from-[#E8F1EA] via-[#FAFAF7] to-transparent"
      />
      <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-5 pb-16 pt-12 md:grid-cols-[1.05fr_1fr] md:pt-20">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-[#6FA68A]/40 bg-white px-3 py-1 text-xs font-medium text-[#2F5D3F]">
            <Leaf className="h-3.5 w-3.5" />
            Plataforma para consultoria nutricional
          </span>
          <h1 className="mt-5 text-4xl font-semibold leading-[1.08] tracking-tight text-[#1A2A22] md:text-5xl">
            A plataforma da nutricionista que{' '}
            <span className="text-[#2F5D3F]">cuida de restaurantes</span>.
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-[#1A2A22]/70">
            Etiquetas, auditorias, manipuladores e POPs em conformidade com a
            RDC 216 da ANVISA — em um sistema que cabe na rotina do consultório
            e das suas unidades clientes.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              to="/servicos"
              className="inline-flex items-center gap-2 rounded-full bg-[#2F5D3F] px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-[#234731]"
            >
              Conhecer os serviços
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 rounded-full border border-[#2F5D3F]/20 bg-white px-5 py-3 text-sm font-medium text-[#2F5D3F] hover:border-[#2F5D3F]/40"
            >
              Acessar o sistema
            </Link>
          </div>
          <p className="mt-5 text-xs text-[#1A2A22]/50">
            Atendendo Macaé e região desde 2013.
          </p>
        </div>

        <MockupDashboard />
      </div>
    </section>
  );
}

/* =====================================================================
 * TRUST STRIP
 * ===================================================================== */
function TrustStrip() {
  const items = [
    'Conformidade RDC 216',
    'LGPD',
    'Boas práticas ANVISA',
    'PWA — funciona offline',
    'Multi-unidade',
  ];
  return (
    <div className="border-y border-[#E8F1EA] bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-8 gap-y-3 px-5 py-5 text-xs uppercase tracking-wide text-[#1A2A22]/55">
        {items.map((label) => (
          <span key={label} className="flex items-center gap-2">
            <Check className="h-3.5 w-3.5 text-[#6FA68A]" />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

/* =====================================================================
 * PILLARS
 * ===================================================================== */
function Pillars() {
  const pillars = [
    {
      icon: Tag,
      title: 'Etiquetas inteligentes',
      body: 'Validade calculada a partir do produto, com alérgenos e QR code para a página pública do lote.',
    },
    {
      icon: ClipboardCheck,
      title: 'Auditorias e POPs',
      body: 'Checklists configuráveis, fotos no não conforme e relatório que vira plano de ação.',
    },
    {
      icon: BarChart3,
      title: 'Visão multi-unidade',
      body: 'Compliance score por unidade, histórico de visitas e alertas de vencimento centralizados.',
    },
  ];
  return (
    <section id="recursos" className="mx-auto max-w-6xl px-5 py-20">
      <div className="max-w-2xl">
        <span className="text-xs font-medium uppercase tracking-wider text-[#6FA68A]">
          Recursos
        </span>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">
          Tudo que a sua consultoria precisa, em um só lugar.
        </h2>
        <p className="mt-4 text-base leading-relaxed text-[#1A2A22]/70">
          Pensado para serviços de alimentação que precisam comprovar
          conformidade e para nutricionistas que querem digitalizar a
          consultoria.
        </p>
      </div>
      <div className="mt-12 grid gap-5 md:grid-cols-3">
        {pillars.map(({ icon: Icon, title, body }) => (
          <div
            key={title}
            className="group rounded-2xl border border-[#E8F1EA] bg-white p-7 transition hover:border-[#6FA68A]/50 hover:shadow-[0_8px_24px_-12px_rgba(47,93,63,0.18)]"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#E8F1EA] text-[#2F5D3F]">
              <Icon className="h-5 w-5" />
            </div>
            <h3 className="mt-5 text-lg font-semibold text-[#1A2A22]">
              {title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-[#1A2A22]/65">
              {body}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* =====================================================================
 * FEATURE — Etiquetas
 * ===================================================================== */
function FeatureLabels() {
  return (
    <section className="bg-[#E8F1EA]/40">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-20 md:grid-cols-2">
        <MockupLabel />
        <div>
          <FeatureKicker icon={Tag}>Etiquetas RDC 216</FeatureKicker>
          <h3 className="mt-3 text-3xl font-semibold tracking-tight">
            Imprima etiquetas de validade sem planilha.
          </h3>
          <p className="mt-4 text-base leading-relaxed text-[#1A2A22]/70">
            Cadastre o produto uma vez — condição de armazenamento, prazo,
            alérgenos. Na hora da etiqueta, o sistema calcula a validade,
            preenche o lote e gera o QR code que abre a página pública do
            produto para o fiscal ou o cliente.
          </p>
          <FeatureBullets
            items={[
              'Alérgenos destacados conforme RDC 26/2015',
              'Suporte a impressoras térmicas Bluetooth e A4',
              'Histórico completo do que foi etiquetado',
            ]}
          />
        </div>
      </div>
    </section>
  );
}

/* =====================================================================
 * FEATURE — Auditorias
 * ===================================================================== */
function FeatureAudits() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-20">
      <div className="grid items-center gap-12 md:grid-cols-2">
        <div className="md:order-2">
          <MockupAudit />
        </div>
        <div className="md:order-1">
          <FeatureKicker icon={ShieldCheck}>Auditorias técnicas</FeatureKicker>
          <h3 className="mt-3 text-3xl font-semibold tracking-tight">
            A visita técnica vira plano de ação automaticamente.
          </h3>
          <p className="mt-4 text-base leading-relaxed text-[#1A2A22]/70">
            Use o template da RDC 216 ou monte o seu. Tire foto do não conforme,
            classifique a gravidade e o sistema gera o relatório assinado e o
            cronograma de correção para a unidade.
          </p>
          <FeatureBullets
            items={[
              'Templates pré-configurados (RDC 216, POPs, BPF)',
              'Score por área e evolução ao longo do tempo',
              'Não conformidades viram tarefas com responsável e prazo',
            ]}
          />
        </div>
      </div>
    </section>
  );
}

/* =====================================================================
 * FEATURE — Monitoramento + Manipuladores
 * ===================================================================== */
function FeatureMonitoring() {
  return (
    <section className="bg-[#E8F1EA]/40">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-20 md:grid-cols-2">
        <MockupMonitoring />
        <div>
          <FeatureKicker icon={Thermometer}>Operação diária</FeatureKicker>
          <h3 className="mt-3 text-3xl font-semibold tracking-tight">
            Temperatura, manipuladores e pragas — tudo em um lugar.
          </h3>
          <p className="mt-4 text-base leading-relaxed text-[#1A2A22]/70">
            A equipe registra leituras pelo celular, você acompanha do
            consultório. ASO vencendo, treinamento atrasado ou dedetização
            próxima do prazo chegam como notificação antes do problema virar
            autuação.
          </p>
          <FeatureBullets
            items={[
              'Temperatura por equipamento com alerta de desvio',
              'Manipuladores: ASO, NR-7, escala de treinamentos',
              'Controle de pragas e dedetizadora certificada',
              'Documentos da unidade (alvará, CNPJ, laudos)',
            ]}
          />
        </div>
      </div>
    </section>
  );
}

/* =====================================================================
 * FOR NUTRITIONISTS (revenda / multi-org)
 * ===================================================================== */
function ForNutritionists() {
  return (
    <section
      id="nutricionistas"
      className="relative overflow-hidden bg-[#2F5D3F] text-white"
    >
      <div className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full bg-[#6FA68A]/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-[#A8D96A]/15 blur-3xl" />
      <div className="relative mx-auto max-w-6xl px-5 py-20">
        <div className="max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-3 py-1 text-xs font-medium text-white/85">
            <Sparkles className="h-3.5 w-3.5" />
            Para nutricionistas consultoras
          </span>
          <h2 className="mt-5 text-3xl font-semibold leading-tight tracking-tight md:text-4xl">
            Adicione uma nova fonte de receita recorrente à sua consultoria.
          </h2>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-white/80">
            No ProActive7, cada nutricionista tem sua organização privada — com
            seus restaurantes, sua marca, seus usuários. Você cobra do seu
            cliente como achar melhor; a plataforma fica nos bastidores
            entregando o trabalho técnico no automático.
          </p>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {[
            {
              n: '01',
              title: 'Sua carteira, isolada',
              body: 'Cada unidade que você atende fica visível só para você e para a equipe dela.',
            },
            {
              n: '02',
              title: 'Pronto para vender',
              body: 'Você cobra o que faz sentido — a plataforma vem com tudo configurado.',
            },
            {
              n: '03',
              title: 'Marca da consultoria',
              body: 'Etiquetas, página pública e relatórios saem com a identidade da sua unidade.',
            },
          ].map((card) => (
            <div
              key={card.n}
              className="rounded-2xl border border-white/12 bg-white/5 p-6 backdrop-blur"
            >
              <span className="text-xs font-mono text-white/55">{card.n}</span>
              <h4 className="mt-2 text-base font-semibold text-white">
                {card.title}
              </h4>
              <p className="mt-2 text-sm leading-relaxed text-white/75">
                {card.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* =====================================================================
 * HOW IT WORKS
 * ===================================================================== */
function HowItWorks() {
  const steps = [
    {
      n: '1',
      title: 'Cadastro inicial',
      body: 'Criamos sua organização e o acesso de nutricionista. Você convida sua equipe e as unidades atendidas.',
    },
    {
      n: '2',
      title: 'Configuração da unidade',
      body: 'Produtos, manipuladores, equipamentos de temperatura, contratos de dedetização — tudo organizado por restaurante.',
    },
    {
      n: '3',
      title: 'Operação no automático',
      body: 'A equipe da unidade opera no celular, você acompanha do painel e age só quando precisa intervir.',
    },
  ];
  return (
    <section id="como-funciona" className="mx-auto max-w-6xl px-5 py-20">
      <div className="max-w-2xl">
        <span className="text-xs font-medium uppercase tracking-wider text-[#6FA68A]">
          Como funciona
        </span>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">
          Do contrato à operação em três passos.
        </h2>
      </div>
      <ol className="mt-12 grid gap-5 md:grid-cols-3">
        {steps.map(({ n, title, body }) => (
          <li
            key={n}
            className="relative rounded-2xl border border-[#E8F1EA] bg-white p-7"
          >
            <span className="absolute -top-3 left-7 inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#2F5D3F] text-xs font-semibold text-white">
              {n}
            </span>
            <h4 className="mt-3 text-lg font-semibold text-[#1A2A22]">
              {title}
            </h4>
            <p className="mt-2 text-sm leading-relaxed text-[#1A2A22]/65">
              {body}
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}

/* =====================================================================
 * FINAL CTA
 * ===================================================================== */
function FinalCta() {
  return (
    <section className="bg-[#E8F1EA]">
      <div className="mx-auto max-w-6xl px-5 py-20 text-center">
        <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
          Vamos conversar sobre a sua operação?
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-[#1A2A22]/70">
          Conte sobre o seu estabelecimento. A gente avalia o que faz sentido —
          consultoria, treinamentos ou acesso ao sistema.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/contato"
            className="inline-flex items-center gap-2 rounded-full bg-[#2F5D3F] px-6 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-[#234731]"
          >
            Falar com a ProActive7
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 rounded-full border border-[#2F5D3F]/20 bg-white px-6 py-3 text-sm font-medium text-[#2F5D3F] hover:border-[#2F5D3F]/40"
          >
            Acessar o sistema
          </Link>
        </div>
      </div>
    </section>
  );
}

/* =====================================================================
 * FOOTER
 * ===================================================================== */
/* =====================================================================
 * Helpers
 * ===================================================================== */
function FeatureKicker({
  icon: Icon,
  children,
}: {
  icon: typeof Tag;
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-[#E8F1EA] px-3 py-1 text-xs font-medium text-[#2F5D3F]">
      <Icon className="h-3.5 w-3.5" />
      {children}
    </span>
  );
}

function FeatureBullets({ items }: { items: string[] }) {
  return (
    <ul className="mt-6 space-y-3">
      {items.map((it) => (
        <li
          key={it}
          className="flex items-start gap-3 text-sm text-[#1A2A22]/80"
        >
          <span className="mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full bg-[#6FA68A]/20 text-[#2F5D3F]">
            <Check className="h-3 w-3" />
          </span>
          {it}
        </li>
      ))}
    </ul>
  );
}

/* =====================================================================
 * MOCKUPS — desenhados em HTML/CSS para evitar dependencia de imagem
 * ===================================================================== */

function MockWindow({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  return (
    <div className="relative">
      {/* sage glow */}
      <div
        aria-hidden
        className="absolute -inset-x-6 -bottom-6 h-32 rounded-full bg-[#6FA68A]/25 blur-3xl"
      />
      <div className="relative overflow-hidden rounded-2xl border border-[#E8F1EA] bg-white shadow-[0_24px_60px_-24px_rgba(47,93,63,0.28)]">
        <div className="flex items-center gap-2 border-b border-[#E8F1EA] bg-[#FAFAF7] px-4 py-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#E8E0D0]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#E8E0D0]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#E8E0D0]" />
          <span className="ml-3 text-[11px] font-medium text-[#1A2A22]/50">
            {title}
          </span>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

function MockupDashboard() {
  return (
    <MockWindow title="proactive7.app/painel">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-[#6FA68A]">
            Painel da consultoria
          </div>
          <div className="text-base font-semibold text-[#1A2A22]">
            8 unidades · tudo em conformidade
          </div>
        </div>
        <span className="rounded-full bg-[#E8F1EA] px-2.5 py-1 text-[10px] font-medium text-[#2F5D3F]">
          ● Online
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2.5">
        {[
          { k: 'Score médio', v: '94', s: '+3 vs mês anterior' },
          { k: 'Auditorias 14d', v: '06', s: 'Próx: Bistrô Norte' },
          { k: 'Etiquetas hoje', v: '247', s: '5 unidades' },
        ].map((kpi) => (
          <div
            key={kpi.k}
            className="rounded-xl border border-[#E8F1EA] bg-[#FAFAF7] p-3"
          >
            <div className="text-[10px] uppercase tracking-wider text-[#1A2A22]/55">
              {kpi.k}
            </div>
            <div className="mt-1 text-xl font-semibold text-[#2F5D3F]">
              {kpi.v}
            </div>
            <div className="mt-0.5 text-[10px] text-[#1A2A22]/55">{kpi.s}</div>
          </div>
        ))}
      </div>
      <div className="mt-3 rounded-xl border border-[#E8F1EA]">
        <div className="border-b border-[#E8F1EA] px-3 py-2 text-[11px] font-medium text-[#1A2A22]/65">
          Portfólio
        </div>
        {[
          { n: 'Bistrô Norte', s: 96, c: '#6FA68A' },
          { n: 'Hotel Verde', s: 91, c: '#6FA68A' },
          { n: 'Padaria Aurora', s: 78, c: '#D4A857' },
          { n: 'Café Central', s: 88, c: '#6FA68A' },
        ].map((r) => (
          <div
            key={r.n}
            className="flex items-center justify-between border-b border-[#E8F1EA] px-3 py-2 last:border-b-0"
          >
            <div className="flex items-center gap-2">
              <div
                className="h-6 w-6 rounded-md"
                style={{ background: `${r.c}25`, color: r.c }}
              />
              <span className="text-xs text-[#1A2A22]">{r.n}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-20 overflow-hidden rounded-full bg-[#E8F1EA]">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${r.s}%`, background: r.c }}
                />
              </div>
              <span className="w-7 text-right text-[11px] font-semibold text-[#1A2A22]/75">
                {r.s}
              </span>
            </div>
          </div>
        ))}
      </div>
    </MockWindow>
  );
}

function MockupLabel() {
  return (
    <MockWindow title="proactive7.app/imprimir">
      <div className="grid grid-cols-[1fr_180px] gap-4">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-[#6FA68A]">
            Nova etiqueta
          </div>
          <div className="text-base font-semibold text-[#1A2A22]">
            Molho à bolonhesa
          </div>
          <div className="mt-3 space-y-2 text-xs">
            {[
              ['Lote', '20251125-014'],
              ['Manipulado em', '25/11/2025 09:14'],
              ['Validade', '27/11/2025 09:14'],
              ['Armazenamento', 'Refrigerado'],
              ['Responsável', 'Marina S.'],
            ].map(([k, v]) => (
              <div key={k} className="flex items-center justify-between">
                <span className="text-[#1A2A22]/55">{k}</span>
                <span className="font-medium text-[#1A2A22]">{v}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 flex gap-1.5">
            {['glúten', 'leite'].map((a) => (
              <span
                key={a}
                className="rounded-full bg-[#FBE9E0] px-2 py-0.5 text-[10px] font-medium text-[#A8543A]"
              >
                {a}
              </span>
            ))}
          </div>
        </div>
        {/* fake printed label */}
        <div className="flex flex-col rounded-lg border-2 border-dashed border-[#2F5D3F]/25 bg-[#FAFAF7] p-3 text-[10px] leading-tight">
          <div className="text-center text-[#2F5D3F]">
            <div className="text-[9px] uppercase tracking-wider">
              Bistrô Norte
            </div>
            <div className="text-sm font-bold text-[#1A2A22]">
              Molho à bolonhesa
            </div>
          </div>
          <div className="mt-2 border-t border-dashed border-[#2F5D3F]/25 pt-2">
            <div>
              <strong>Validade:</strong> 27/11 09:14
            </div>
            <div>
              <strong>Lote:</strong> 20251125-014
            </div>
            <div>
              <strong>Alérg.:</strong> glúten · leite
            </div>
          </div>
          <div className="mt-auto flex items-end justify-between pt-2">
            <div className="h-12 w-12 rounded bg-[#1A2A22]/85" />
            <div className="text-right text-[9px] text-[#1A2A22]/55">
              <div>RDC 216</div>
              <div>ANVISA</div>
            </div>
          </div>
        </div>
      </div>
    </MockWindow>
  );
}

function MockupAudit() {
  const items = [
    { l: 'Higiene das bancadas', ok: true },
    { l: 'Temperatura câmara fria', ok: true },
    { l: 'POPs disponíveis no setor', ok: false },
    { l: 'Manipuladores com NR-7 em dia', ok: true },
    { l: 'Telas milimétricas íntegras', ok: false },
    { l: 'Sanitizantes registrados', ok: true },
  ];
  return (
    <MockWindow title="proactive7.app/visitas/24">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-[#6FA68A]">
            Auditoria RDC 216
          </div>
          <div className="text-base font-semibold text-[#1A2A22]">
            Bistrô Norte · 25/11
          </div>
        </div>
        <span className="rounded-full bg-[#E8F1EA] px-2.5 py-1 text-[10px] font-medium text-[#2F5D3F]">
          Score 78
        </span>
      </div>
      <div className="space-y-1.5">
        {items.map((it) => (
          <div
            key={it.l}
            className="flex items-center justify-between rounded-lg border border-[#E8F1EA] px-3 py-2"
          >
            <div className="flex items-center gap-2.5">
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-md text-[10px] font-semibold ${
                  it.ok
                    ? 'bg-[#6FA68A]/20 text-[#2F5D3F]'
                    : 'bg-[#FBE9E0] text-[#A8543A]'
                }`}
              >
                {it.ok ? '✓' : '!'}
              </span>
              <span className="text-xs text-[#1A2A22]">{it.l}</span>
            </div>
            {!it.ok && (
              <span className="text-[10px] font-medium text-[#A8543A]">
                Não conforme
              </span>
            )}
          </div>
        ))}
      </div>
      <div className="mt-3 rounded-lg bg-[#E8F1EA]/70 px-3 py-2 text-[11px] text-[#2F5D3F]">
        <strong>2 não conformidades</strong> gerarão tarefas com prazo de 7 dias
        para a unidade.
      </div>
    </MockWindow>
  );
}

function MockupMonitoring() {
  return (
    <MockWindow title="proactive7.app/temperatura">
      <div className="mb-3">
        <div className="text-[11px] uppercase tracking-wider text-[#6FA68A]">
          Operação · hoje
        </div>
        <div className="text-base font-semibold text-[#1A2A22]">
          Bistrô Norte · 25/11
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        {[
          { k: 'Câmara fria 01', v: '4 °C', ok: true, sub: 'Marina · 09:02' },
          { k: 'Freezer 02', v: '-18 °C', ok: true, sub: 'João · 08:55' },
          {
            k: 'Estufa banho-maria',
            v: '62 °C',
            ok: false,
            sub: 'Limite 65°C',
          },
          { k: 'Câmara fria 02', v: '5 °C', ok: true, sub: 'Marina · 09:05' },
        ].map((r) => (
          <div
            key={r.k}
            className={`rounded-xl border p-3 ${
              r.ok
                ? 'border-[#E8F1EA] bg-[#FAFAF7]'
                : 'border-[#F2C9B8] bg-[#FBE9E0]/40'
            }`}
          >
            <div className="text-[10px] uppercase tracking-wider text-[#1A2A22]/55">
              {r.k}
            </div>
            <div
              className={`mt-1 text-xl font-semibold ${
                r.ok ? 'text-[#2F5D3F]' : 'text-[#A8543A]'
              }`}
            >
              {r.v}
            </div>
            <div className="mt-0.5 text-[10px] text-[#1A2A22]/55">{r.sub}</div>
          </div>
        ))}
      </div>
      <div className="mt-3 rounded-lg border border-[#E8F1EA] bg-white">
        <div className="flex items-center justify-between border-b border-[#E8F1EA] px-3 py-2">
          <div className="flex items-center gap-2 text-[11px] font-medium text-[#1A2A22]/70">
            <Bell className="h-3.5 w-3.5 text-[#D4A857]" />
            Alertas
          </div>
          <span className="text-[10px] text-[#1A2A22]/45">2 ativos</span>
        </div>
        {[
          { i: HardHat, t: 'ASO de Marina vence em 7 dias' },
          { i: Bug, t: 'Dedetização — agendar até 30/11' },
          { i: FileText, t: 'Alvará sanitário vence 12/12' },
        ].map((a, idx) => (
          <div
            key={idx}
            className="flex items-center gap-2.5 border-b border-[#E8F1EA] px-3 py-2 last:border-b-0"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#E8F1EA] text-[#2F5D3F]">
              <a.i className="h-3.5 w-3.5" />
            </span>
            <span className="text-xs text-[#1A2A22]/80">{a.t}</span>
          </div>
        ))}
      </div>
    </MockWindow>
  );
}
