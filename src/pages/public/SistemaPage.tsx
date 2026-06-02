import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Printer,
  ShieldCheck,
  AlertOctagon,
  Thermometer,
  HardHat,
  Bug,
  Boxes,
  FileText,
  BarChart3,
  Building2,
  Check,
  Sparkles,
  QrCode,
  Tag,
  Clock,
  TrendingUp,
  MessageCircle,
  SlidersHorizontal,
  ChefHat,
  PenLine,
  Lock,
  Bluetooth,
  Globe,
  ClipboardCheck,
  HelpCircle,
  ChevronDown,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { usePageTitle } from '@/lib/usePageTitle';
import { MODULE_LABEL } from '@/lib/modules';

const GREEN = '#2F5D3F';

interface PublicPlan {
  key: string;
  name: string;
  company_limit: number | null;
  allowed_modules: string[];
  price_cents: number;
  sort_order: number;
}

// Reveal-on-scroll leve (IntersectionObserver, sem libs). Anima só
// opacity/transform — GPU-friendly, roda liso no celular.
function Reveal({
  children,
  delay = 0,
  className = '',
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`transition-all duration-700 ease-out ${
        shown ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
      } ${className}`}
    >
      {children}
    </div>
  );
}

const FEATURES: { icon: typeof Printer; title: string; desc: string }[] = [
  {
    icon: Printer,
    title: 'Etiquetas térmicas',
    desc: 'Validade calculada automaticamente pela RDC. Zero digitação na cozinha — tudo escolhido de lista.',
  },
  {
    icon: ShieldCheck,
    title: 'Auditorias RDC',
    desc: 'Checklists 216/275/259 com score de conformidade e relatório assinável pela nutricionista.',
  },
  {
    icon: AlertOctagon,
    title: 'Não-conformidades',
    desc: 'Abra, trate e feche NCs com prazo, responsável e evidência fotográfica.',
  },
  {
    icon: Thermometer,
    title: 'Temperatura',
    desc: 'Registro de equipamentos com alerta automático quando sai da faixa segura.',
  },
  {
    icon: HardHat,
    title: 'Manipuladores & ASO',
    desc: 'Controle de exames e treinamentos, com lembrete de ASO vencendo antes da multa.',
  },
  {
    icon: Bug,
    title: 'Controle de pragas',
    desc: 'Histórico de dedetização e MIP, com vencimento de contrato no radar.',
  },
  {
    icon: Boxes,
    title: 'Estoque & recebimento',
    desc: 'Recebimento, contagem, produção e rastreabilidade de lote em um clique.',
  },
  {
    icon: FileText,
    title: 'Dossiê & relatórios',
    desc: 'Dossiê ANVISA pronto para a fiscalização e relatórios gerenciais em PDF.',
  },
  {
    icon: Building2,
    title: 'Multi-empresa',
    desc: 'A nutricionista gerencia várias cozinhas em uma só conta, com escopo isolado.',
  },
];

const STATS = [
  { value: '4', label: 'presets de etiqueta' },
  { value: '0', label: 'digitação na cozinha' },
  { value: '30s', label: 'para emitir uma etiqueta' },
  { value: '100%', label: 'conforme RDC 216' },
];

const STEPS: { icon: typeof Printer; title: string; desc: string }[] = [
  {
    icon: SlidersHorizontal,
    title: 'A nutricionista configura',
    desc: 'Cadastra empresas, produtos com prazos da RDC, equipe e checklists. Uma vez só — depois é manutenção leve.',
  },
  {
    icon: ChefHat,
    title: 'A cozinha opera sem digitar',
    desc: 'Imprime etiquetas, registra temperatura e recebimento escolhendo de listas prontas. Erro de digitação deixa de existir.',
  },
  {
    icon: PenLine,
    title: 'A RT acompanha e assina',
    desc: 'Score de conformidade em tempo real, não-conformidades no radar e relatório em PDF assinável para a ANVISA.',
  },
];

const PERSONAS: {
  icon: typeof Printer;
  role: string;
  who: string;
  points: string[];
}[] = [
  {
    icon: ShieldCheck,
    role: 'Nutricionista (RT)',
    who: 'Responsável técnica',
    points: [
      'Visão de carteira com várias cozinhas',
      'Define prazos de validade e checklists',
      'Assina relatórios e planos de ação',
    ],
  },
  {
    icon: ChefHat,
    role: 'Gerente da unidade',
    who: 'No chão da cozinha',
    points: [
      'Imprime etiquetas em segundos',
      'Registra temperatura e recebimento',
      'Trata e fecha não-conformidades',
    ],
  },
  {
    icon: Building2,
    role: 'Rede / multi-unidade',
    who: 'Visão consolidada',
    points: [
      'Compara o score entre cozinhas',
      'Escopo isolado por empresa',
      'Relatórios gerenciais num lugar só',
    ],
  },
];

const PRINTING: { icon: typeof Printer; title: string; desc: string }[] = [
  {
    icon: Printer,
    title: 'Impressão térmica direta',
    desc: 'Um agente leve no PC imprime sem o operador digitar nada — etiqueta sai com um clique.',
  },
  {
    icon: Tag,
    title: '4 tamanhos de etiqueta',
    desc: 'Presets de 33×22 a 80×60 mm, prontos para os rolos térmicos mais comuns.',
  },
  {
    icon: Bluetooth,
    title: 'Bluetooth e navegador',
    desc: 'Impressoras térmicas ZPL (Elgin, Zebra) e mini-impressoras Bluetooth 58/80 mm.',
  },
  {
    icon: QrCode,
    title: 'QR rastreável',
    desc: 'Cada etiqueta carrega um QR com verificação pública de validade e lote.',
  },
];

const COMPLIANCE: { icon: typeof Printer; title: string; desc: string }[] = [
  {
    icon: ClipboardCheck,
    title: 'RDC 216 / 275 / 259',
    desc: 'Checklists e layout de etiqueta seguem as resoluções da ANVISA, com score por empresa.',
  },
  {
    icon: Lock,
    title: 'LGPD por padrão',
    desc: 'Fotos com retenção curta (30 dias) e dados de saúde do manipulador protegidos.',
  },
  {
    icon: Building2,
    title: 'Isolamento multi-tenant',
    desc: 'Cada organização vê apenas os próprios dados — segurança garantida no banco (RLS).',
  },
  {
    icon: FileText,
    title: 'Trilha de auditoria',
    desc: 'Mudanças críticas ficam registradas e o dossiê sai pronto para a fiscalização.',
  },
];

const FAQ: { q: string; a: string }[] = [
  {
    q: 'Preciso de internet na cozinha?',
    a: 'Sim, o sistema é web e roda no navegador do celular, tablet ou PC. A impressão de etiquetas usa um agente leve instalado no computador, que conversa com a impressora térmica local.',
  },
  {
    q: 'Funciona com a minha impressora?',
    a: 'Sim para impressoras térmicas que falam ZPL (Elgin, Zebra e compatíveis) e para mini-impressoras Bluetooth de 58/80 mm. Também dá para imprimir pelo diálogo do navegador em impressoras comuns.',
  },
  {
    q: 'O sistema decide sozinho se uma NC pode ser fechada?',
    a: 'Não. A automação organiza e sugere, mas a decisão técnica é sempre da nutricionista responsável técnica. A RT é quem assina — nenhuma automação substitui isso.',
  },
  {
    q: 'Meus dados estão seguros?',
    a: 'Cada organização enxerga apenas os próprios dados, com isolamento garantido no banco. Fotos têm retenção curta e dados sensíveis seguem a LGPD.',
  },
  {
    q: 'O operador precisa digitar alguma coisa?',
    a: 'Não. Produto, grupo, manipulador, fornecedor e validade vêm de cadastros prontos — tudo é escolhido de lista. Zero digitação no chão da cozinha.',
  },
  {
    q: 'Quanto custa?',
    a: 'Veja os planos logo abaixo. Para redes com várias unidades, fale com a gente para um plano sob medida.',
  },
];

function priceLabel(cents: number): { value: string; suffix: string } {
  if (!cents) return { value: 'Sob consulta', suffix: '' };
  return {
    value: `R$ ${(cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
    suffix: '/mês',
  };
}

export function SistemaPage() {
  usePageTitle('Sistema');
  const [plans, setPlans] = useState<PublicPlan[]>([]);

  useEffect(() => {
    void supabase
      .rpc('public_plans')
      .then(({ data }) => setPlans((data as PublicPlan[] | null) ?? []));
  }, []);

  return (
    <div className="overflow-hidden">
      <style>{`
        @keyframes pa7-float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
        @keyframes pa7-pulse { 0%,100%{opacity:.5} 50%{opacity:1} }
      `}</style>

      {/* HERO */}
      <section className="relative">
        <div className="absolute inset-0 bg-gradient-to-b from-[#234731] via-[#2F5D3F] to-[#3A7350]" />
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 20%, #fff 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />
        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-5 py-16 md:grid-cols-2 md:py-24">
          <div className="text-white">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/12 px-3 py-1 text-xs font-medium text-white/90 ring-1 ring-white/20">
              <Sparkles className="h-3.5 w-3.5" />
              Segurança alimentar sem papelada
            </span>
            <h1 className="mt-5 text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl">
              A cozinha em conformidade,{' '}
              <span className="text-[#BBE7C6]">no piloto automático</span>
            </h1>
            <p className="mt-5 max-w-md text-base leading-relaxed text-white/85">
              Etiquetas de validade, auditorias RDC, temperatura, ASO e dossiê
              ANVISA — tudo num sistema feito para a nutricionista responsável
              técnica e sua equipe de cozinha.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/login"
                className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-[#2F5D3F] shadow-lg transition hover:-translate-y-0.5 hover:bg-[#E8F1EA]"
              >
                Acessar sistema <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="#planos"
                className="inline-flex items-center gap-2 rounded-full bg-white/10 px-6 py-3 text-sm font-semibold text-white ring-1 ring-white/25 transition hover:bg-white/15"
              >
                Ver planos
              </a>
            </div>
          </div>

          {/* Mock do painel flutuante */}
          <div className="relative" style={{ animation: 'pa7-float 6s ease-in-out infinite' }}>
            <MockDashboard />
          </div>
        </div>

        {/* Faixa de stats */}
        <div className="relative border-t border-white/10 bg-black/10">
          <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-5 py-6 md:grid-cols-4">
            {STATS.map((s) => (
              <div key={s.label} className="text-center text-white">
                <p className="text-2xl font-bold sm:text-3xl">{s.value}</p>
                <p className="text-xs text-white/70">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FUNCIONALIDADES */}
      <section className="mx-auto max-w-6xl px-5 py-20">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-[#1A2A22]">
            Tudo que a RDC exige, num lugar só
          </h2>
          <p className="mt-3 text-[#1A2A22]/65">
            Nove módulos que trabalham juntos para manter a cozinha auditável
            o ano inteiro.
          </p>
        </Reveal>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            return (
              <Reveal key={f.title} delay={(i % 3) * 80}>
                <div className="group h-full rounded-2xl border border-[#E8F1EA] bg-white p-6 transition hover:-translate-y-1 hover:border-[#BBE7C6] hover:shadow-lg hover:shadow-[#2F5D3F]/5">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#E8F1EA] text-[#2F5D3F] transition group-hover:bg-[#2F5D3F] group-hover:text-white">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-4 font-semibold text-[#1A2A22]">
                    {f.title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-[#1A2A22]/65">
                    {f.desc}
                  </p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* COMO FUNCIONA */}
      <section className="border-y border-[#E8F1EA] bg-white py-20">
        <div className="mx-auto max-w-6xl px-5">
          <Reveal className="mx-auto max-w-2xl text-center">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#2F5D3F]">
              Como funciona
            </span>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-[#1A2A22]">
              Três passos, do cadastro à assinatura
            </h2>
            <p className="mt-3 text-[#1A2A22]/65">
              Configura uma vez, a cozinha opera no automático e a RT mantém
              tudo auditável.
            </p>
          </Reveal>

          <div className="relative mt-14 grid gap-8 md:grid-cols-3">
            <div className="absolute left-0 right-0 top-7 hidden h-px bg-gradient-to-r from-transparent via-[#BBE7C6] to-transparent md:block" />
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              return (
                <Reveal key={s.title} delay={i * 110} className="relative">
                  <div className="flex flex-col items-center text-center">
                    <span className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-[#2F5D3F] text-white shadow-lg shadow-[#2F5D3F]/20">
                      <Icon className="h-6 w-6" />
                      <span className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-[#BBE7C6] text-xs font-bold text-[#234731] ring-2 ring-white">
                        {i + 1}
                      </span>
                    </span>
                    <h3 className="mt-5 font-semibold text-[#1A2A22]">
                      {s.title}
                    </h3>
                    <p className="mt-2 max-w-xs text-sm leading-relaxed text-[#1A2A22]/65">
                      {s.desc}
                    </p>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* TELAS DO SISTEMA */}
      <section className="bg-[#F2F7F3] py-20">
        <div className="mx-auto max-w-6xl px-5">
          <Reveal className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-[#1A2A22]">
              Bonito de usar, fácil de operar
            </h2>
            <p className="mt-3 text-[#1A2A22]/65">
              Da gestão da nutricionista ao chão da cozinha — telas pensadas
              para cada papel. (Dados ilustrativos.)
            </p>
          </Reveal>

          <div className="mt-12 grid items-center gap-8 lg:grid-cols-2">
            <Reveal>
              <MockDashboard wide />
            </Reveal>
            <Reveal delay={120} className="grid gap-6 sm:grid-cols-2 lg:grid-cols-1">
              <MockLabel />
              <MockUsage />
            </Reveal>
          </div>
        </div>
      </section>

      {/* PARA CADA PAPEL */}
      <section className="mx-auto max-w-6xl px-5 py-20">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#2F5D3F]">
            Feito para cada papel
          </span>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-[#1A2A22]">
            Da gestão técnica ao chão da cozinha
          </h2>
          <p className="mt-3 text-[#1A2A22]/65">
            Cada pessoa vê só o que precisa, com a permissão certa.
          </p>
        </Reveal>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {PERSONAS.map((p, i) => {
            const Icon = p.icon;
            return (
              <Reveal key={p.role} delay={i * 90}>
                <div className="flex h-full flex-col rounded-2xl border border-[#E8F1EA] bg-white p-6 transition hover:-translate-y-1 hover:shadow-lg hover:shadow-[#2F5D3F]/5">
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#E8F1EA] text-[#2F5D3F]">
                      <Icon className="h-5 w-5" />
                    </span>
                    <div>
                      <h3 className="font-semibold leading-tight text-[#1A2A22]">
                        {p.role}
                      </h3>
                      <p className="text-xs text-[#1A2A22]/55">{p.who}</p>
                    </div>
                  </div>
                  <ul className="mt-5 space-y-2.5 text-sm">
                    {p.points.map((pt) => (
                      <li key={pt} className="flex items-start gap-2">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#2F5D3F]" />
                        <span className="text-[#1A2A22]/75">{pt}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* IMPRESSÃO */}
      <section className="bg-[#F2F7F3] py-20">
        <div className="mx-auto max-w-6xl px-5">
          <div className="grid items-center gap-12 lg:grid-cols-[1fr_1.1fr]">
            <Reveal>
              <span className="text-xs font-semibold uppercase tracking-wider text-[#2F5D3F]">
                Impressão sem complicação
              </span>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-[#1A2A22]">
                A etiqueta certa, num clique
              </h2>
              <p className="mt-3 text-[#1A2A22]/65">
                Validade calculada pela RDC, layout conforme a ANVISA e nada
                para o operador digitar. Compatível com a impressora que a
                cozinha já tem.
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                {['ZPL · Elgin / Zebra', 'Bluetooth 58/80 mm', 'Diálogo do navegador'].map(
                  (t) => (
                    <span
                      key={t}
                      className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-[#234731] ring-1 ring-[#BBE7C6]"
                    >
                      <Globe className="h-3.5 w-3.5" /> {t}
                    </span>
                  ),
                )}
              </div>
            </Reveal>

            <div className="grid gap-4 sm:grid-cols-2">
              {PRINTING.map((f, i) => {
                const Icon = f.icon;
                return (
                  <Reveal key={f.title} delay={(i % 2) * 90}>
                    <div className="h-full rounded-2xl border border-[#E8F1EA] bg-white p-5">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E8F1EA] text-[#2F5D3F]">
                        <Icon className="h-5 w-5" />
                      </span>
                      <h3 className="mt-3 text-sm font-semibold text-[#1A2A22]">
                        {f.title}
                      </h3>
                      <p className="mt-1 text-xs leading-relaxed text-[#1A2A22]/65">
                        {f.desc}
                      </p>
                    </div>
                  </Reveal>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* CONFORMIDADE & SEGURANÇA */}
      <section className="mx-auto max-w-6xl px-5 py-20">
        <Reveal className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#2F5D3F]">
            Conformidade & segurança
          </span>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-[#1A2A22]">
            Pronto para a fiscalização — e para a LGPD
          </h2>
          <p className="mt-3 text-[#1A2A22]/65">
            Não esconde score ruim, não decide pela RT e protege os dados de
            quem está na cozinha.
          </p>
        </Reveal>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {COMPLIANCE.map((f, i) => {
            const Icon = f.icon;
            return (
              <Reveal key={f.title} delay={(i % 4) * 70}>
                <div className="flex h-full flex-col rounded-2xl bg-[#234731] p-6 text-white">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-[#BBE7C6] ring-1 ring-white/15">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-4 font-semibold">{f.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-white/70">
                    {f.desc}
                  </p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* PLANOS */}
      <section id="planos" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-20">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-[#1A2A22]">
            Planos que crescem com você
          </h2>
          <p className="mt-3 text-[#1A2A22]/65">
            Comece pequeno e libere módulos conforme a operação cresce.
          </p>
        </Reveal>

        {plans.length === 0 ? (
          <p className="mt-12 text-center text-sm text-[#1A2A22]/50">
            Carregando planos…
          </p>
        ) : (
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {plans.map((p, i) => {
              const featured = p.key === 'profissional' || (plans.length === 3 && i === 1);
              const price = priceLabel(p.price_cents);
              const mods = p.allowed_modules
                .map((k) => MODULE_LABEL[k])
                .filter(Boolean);
              return (
                <Reveal key={p.key} delay={i * 90}>
                  <div
                    className={`relative flex h-full flex-col rounded-3xl border p-7 transition hover:-translate-y-1 ${
                      featured
                        ? 'border-transparent bg-[#2F5D3F] text-white shadow-xl shadow-[#2F5D3F]/20'
                        : 'border-[#E8F1EA] bg-white text-[#1A2A22] hover:shadow-lg'
                    }`}
                  >
                    {featured && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#BBE7C6] px-3 py-1 text-xs font-semibold text-[#234731]">
                        Mais escolhido
                      </span>
                    )}
                    <h3 className="text-lg font-semibold">{p.name}</h3>
                    <div className="mt-3 flex items-end gap-1">
                      <span className="text-3xl font-bold">{price.value}</span>
                      {price.suffix && (
                        <span
                          className={`pb-1 text-sm ${featured ? 'text-white/70' : 'text-[#1A2A22]/55'}`}
                        >
                          {price.suffix}
                        </span>
                      )}
                    </div>
                    <p
                      className={`mt-2 text-sm ${featured ? 'text-white/75' : 'text-[#1A2A22]/60'}`}
                    >
                      {p.company_limit === null
                        ? 'Empresas ilimitadas'
                        : `Até ${p.company_limit} empresa${p.company_limit === 1 ? '' : 's'}`}
                    </p>

                    <ul className="mt-5 flex-1 space-y-2.5 text-sm">
                      <PlanLine featured={featured}>
                        Etiquetas, produtos e equipe (base)
                      </PlanLine>
                      {mods.map((m) => (
                        <PlanLine key={m} featured={featured}>
                          {m}
                        </PlanLine>
                      ))}
                    </ul>

                    <Link
                      to="/login"
                      className={`mt-7 inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition ${
                        featured
                          ? 'bg-white text-[#2F5D3F] hover:bg-[#E8F1EA]'
                          : 'bg-[#2F5D3F] text-white hover:bg-[#234731]'
                      }`}
                    >
                      Começar agora <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </Reveal>
              );
            })}
          </div>
        )}
        <p className="mt-6 text-center text-xs text-[#1A2A22]/45">
          Valores e módulos sincronizados em tempo real com o painel. Fale com a
          gente para um plano sob medida.
        </p>
      </section>

      {/* FAQ */}
      <section className="bg-[#F2F7F3] py-20">
        <div className="mx-auto max-w-3xl px-5">
          <Reveal className="text-center">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#2F5D3F]">
              <HelpCircle className="h-4 w-4" /> Perguntas frequentes
            </span>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-[#1A2A22]">
              Ainda na dúvida?
            </h2>
          </Reveal>

          <div className="mt-10 space-y-3">
            {FAQ.map((item, i) => (
              <Reveal key={item.q} delay={(i % 3) * 60}>
                <FaqItem q={item.q} a={item.a} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="px-5 pb-20">
        <div className="relative mx-auto max-w-5xl overflow-hidden rounded-3xl bg-[#2F5D3F] px-6 py-14 text-center text-white sm:px-12">
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage:
                'radial-gradient(circle at 80% 30%, #fff 1px, transparent 1px)',
              backgroundSize: '24px 24px',
            }}
          />
          <div className="relative">
            <h2 className="text-3xl font-bold tracking-tight">
              Pronto para deixar a cozinha em ordem?
            </h2>
            <p className="mx-auto mt-3 max-w-md text-white/80">
              Acesse o sistema ou fale com a nossa equipe pelo WhatsApp para uma
              demonstração.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link
                to="/login"
                className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-[#2F5D3F] transition hover:-translate-y-0.5 hover:bg-[#E8F1EA]"
              >
                Acessar sistema <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="https://wa.me/5522997662669"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-white/10 px-6 py-3 text-sm font-semibold text-white ring-1 ring-white/25 transition hover:bg-white/15"
              >
                <MessageCircle className="h-4 w-4" /> Falar no WhatsApp
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function PlanLine({
  children,
  featured,
}: {
  children: ReactNode;
  featured: boolean;
}) {
  return (
    <li className="flex items-start gap-2">
      <Check
        className={`mt-0.5 h-4 w-4 shrink-0 ${featured ? 'text-[#BBE7C6]' : 'text-[#2F5D3F]'}`}
      />
      <span className={featured ? 'text-white/90' : 'text-[#1A2A22]/75'}>
        {children}
      </span>
    </li>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="overflow-hidden rounded-2xl border border-[#E8F1EA] bg-white">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
      >
        <span className="text-sm font-semibold text-[#1A2A22]">{q}</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-[#2F5D3F] transition-transform duration-300 ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>
      <div
        className={`grid transition-all duration-300 ease-out ${
          open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="overflow-hidden">
          <p className="px-5 pb-4 text-sm leading-relaxed text-[#1A2A22]/70">
            {a}
          </p>
        </div>
      </div>
    </div>
  );
}

/* ---------- Mockups com dados fake ---------- */

function BrowserChrome({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-2xl shadow-[#234731]/15">
      <div className="flex items-center gap-1.5 border-b border-neutral-100 bg-neutral-50 px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-[#FF5F57]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#FEBC2E]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#28C840]" />
        <span className="ml-3 truncate rounded-md bg-white px-2 py-0.5 text-[10px] text-neutral-400 ring-1 ring-neutral-200">
          app.proactive7.com.br/painel
        </span>
      </div>
      {children}
    </div>
  );
}

function DonutScore({ score }: { score: number }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  const off = c * (1 - score / 100);
  return (
    <svg viewBox="0 0 64 64" className="h-16 w-16">
      <circle cx="32" cy="32" r={r} fill="none" stroke="#E8F1EA" strokeWidth="7" />
      <circle
        cx="32"
        cy="32"
        r={r}
        fill="none"
        stroke={GREEN}
        strokeWidth="7"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={off}
        transform="rotate(-90 32 32)"
      />
      <text
        x="32"
        y="36"
        textAnchor="middle"
        fontSize="15"
        fontWeight="700"
        fill={GREEN}
      >
        {score}
      </text>
    </svg>
  );
}

const FAKE_COMPANIES = [
  { name: 'Cozinha Central', score: 92, tier: 'green' as const },
  { name: 'Restaurante Maré', score: 74, tier: 'amber' as const },
  { name: 'Plataforma P-58', score: 58, tier: 'red' as const },
];

const TIER_CHIP: Record<'green' | 'amber' | 'red', string> = {
  green: 'bg-emerald-50 text-emerald-700',
  amber: 'bg-amber-50 text-amber-700',
  red: 'bg-red-50 text-red-700',
};

function MockDashboard({ wide = false }: { wide?: boolean }) {
  return (
    <BrowserChrome>
      <div className="p-4 sm:p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] text-neutral-400">Bom dia, Ariane 👋</p>
            <p className="text-sm font-semibold text-neutral-800">
              Carteira · 3 empresas
            </p>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-medium text-emerald-700">
            <TrendingUp className="h-3 w-3" /> +6% no mês
          </span>
        </div>

        <div className="mt-4 grid grid-cols-4 gap-2">
          {[
            { l: 'Score médio', v: '75' },
            { l: 'NCs abertas', v: '4' },
            { l: 'ASO vencendo', v: '2' },
            { l: 'Etiquetas 30d', v: '1.2k' },
          ].map((k) => (
            <div
              key={k.l}
              className="rounded-lg bg-neutral-50 p-2 text-center ring-1 ring-neutral-100"
            >
              <p className="text-sm font-bold text-neutral-800">{k.v}</p>
              <p className="text-[9px] leading-tight text-neutral-400">{k.l}</p>
            </div>
          ))}
        </div>

        <div className={`mt-4 grid gap-4 ${wide ? 'sm:grid-cols-[auto_1fr]' : ''}`}>
          <div className="flex items-center gap-3 rounded-xl bg-[#F2F7F3] p-3">
            <DonutScore score={75} />
            <div>
              <p className="text-xs font-semibold text-neutral-700">
                Conformidade
              </p>
              <p className="text-[10px] text-neutral-400">média da carteira</p>
            </div>
          </div>

          <div className="space-y-1.5">
            {FAKE_COMPANIES.map((c) => (
              <div
                key={c.name}
                className="flex items-center justify-between rounded-lg border border-neutral-100 px-3 py-2"
              >
                <span className="text-xs font-medium text-neutral-700">
                  {c.name}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${TIER_CHIP[c.tier]}`}
                >
                  {c.score}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </BrowserChrome>
  );
}

function MockLabel() {
  return (
    <div className="rounded-2xl border border-[#E8F1EA] bg-white p-5 shadow-sm">
      <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-[#2F5D3F]">
        <Tag className="h-3.5 w-3.5" /> Etiqueta térmica
      </p>
      <div className="rounded-xl border-2 border-dashed border-neutral-200 p-3">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] uppercase text-neutral-400">Produto</p>
            <p className="text-sm font-bold text-neutral-800">
              Molho de tomate
            </p>
          </div>
          <div className="grid grid-cols-4 gap-0.5">
            {Array.from({ length: 16 }).map((_, i) => (
              <span
                key={i}
                className={`h-2 w-2 ${i % 3 === 0 ? 'bg-neutral-800' : 'bg-neutral-300'}`}
              />
            ))}
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
          <div className="flex items-center gap-1 text-neutral-600">
            <Clock className="h-3 w-3" /> Manip.: 02/06 14:00
          </div>
          <div className="flex items-center gap-1 font-semibold text-[#2F5D3F]">
            <Clock className="h-3 w-3" /> Val.: 09/06 14:00
          </div>
          <div className="text-neutral-500">Lote: L-2026-06-02</div>
          <div className="text-neutral-500">Refrigerado</div>
        </div>
        <div className="mt-2 rounded bg-amber-50 px-2 py-1 text-[10px] text-amber-700">
          Contém: glúten
        </div>
      </div>
      <p className="mt-3 flex items-center gap-1 text-[10px] text-neutral-400">
        <QrCode className="h-3 w-3" /> QR rastreável em cada etiqueta
      </p>
    </div>
  );
}

const BARS = [40, 65, 52, 80, 72, 95, 60];
function MockUsage() {
  return (
    <div className="rounded-2xl border border-[#E8F1EA] bg-white p-5 shadow-sm">
      <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-[#2F5D3F]">
        <BarChart3 className="h-3.5 w-3.5" /> Etiquetas por dia
      </p>
      <p className="mb-4 text-[11px] text-neutral-400">últimos 7 dias</p>
      <div className="flex h-24 items-end gap-2">
        {BARS.map((h, i) => (
          <div
            key={i}
            className="flex-1 rounded-t bg-gradient-to-t from-[#2F5D3F] to-[#5FA875]"
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
    </div>
  );
}
