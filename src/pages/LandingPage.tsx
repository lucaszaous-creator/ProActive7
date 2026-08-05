import { Link } from 'react-router-dom';
import {
  ArrowRight,
  GraduationCap,
  Stethoscope,
  ClipboardCheck,
  Utensils,
  ChefHat,
  Stamp,
  Tag,
  BookOpen,
  ShieldCheck,
  Heart,
  Leaf,
  Award,
  MapPin,
  MessageCircle,
  Quote,
  Eye,
  ClipboardList,
  Lightbulb,
  BadgeCheck,
  Users,
  Laptop2,
  Plus,
} from 'lucide-react';
import { usePageMeta } from '@/lib/usePageMeta';
import seoConfig from '@/lib/seo.config.json';
import {
  ROSTER_FLAT,
  ROSTER_BRAND_COUNT,
  ROSTER_UNIT_COUNT,
  ROSTER_SEGMENT_COUNT,
} from '@/lib/clientRoster';
import { Carousel } from '@/components/public/Carousel';
import { Reveal } from '@/components/public/Reveal';
import { Spotlight } from '@/components/public/Spotlight';

/** FAQ da home — mesma fonte (seo.config.json) que alimenta o FAQPage do
 *  schema, garantindo que o texto visível seja idêntico ao structured data. */
const FAQ = (seoConfig.pages['/'].faq ?? []) as { q: string; a: string }[];

/**
 * Página inicial — sobre a EMPRESA ProActive7 (consultoria nutricional
 * e segurança alimentar). NÃO sobre o sistema/plataforma. O sistema é
 * apenas mais um dos serviços oferecidos e tem sua própria página em
 * /sistema (acessível também por dentro de /servicos).
 *
 * Pedido explícito da cliente (Ariane): "página principal como
 * empresa/CNPJ; o sistema fica à parte".
 */
export function LandingPage() {
  usePageMeta('/');
  return (
    <>
      <Hero />
      <PillarsStrip />
      <Sobre />
      <Metodo />
      <Numeros />
      <MuralClientes />
      <ServicosResumo />
      <Diferenciais />
      <Depoimentos />
      <Atuacao />
      <Faq />
      <FinalCta />
    </>
  );
}

/* =====================================================================
 * FAQ — perguntas frequentes (visível + alimenta o FAQPage do schema).
 * Define a marca ("O que é a ProActive7?") para combater a confusão com
 * o livro "7 Hábitos" e dar conteúdo citável a mecanismos de IA.
 * ===================================================================== */
function Faq() {
  if (!FAQ.length) return null;
  return (
    <section className="border-t border-[#e5e5e5] bg-white">
      <div className="mx-auto max-w-3xl px-5 py-20">
        <Reveal>
          <div className="text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#737373]/40 bg-white px-3 py-1 text-xs font-medium text-[#262626]">
              Perguntas frequentes
            </span>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-[#171717] md:text-4xl">
              Tudo sobre a ProActive7
            </h2>
            <p className="mt-3 text-base leading-relaxed text-[#171717]/65">
              O que é a ProActive7, onde atende e quem assina a responsabilidade
              técnica pela sua operação.
            </p>
          </div>
        </Reveal>
        <div className="mt-10 divide-y divide-[#e5e5e5] overflow-hidden rounded-2xl border border-[#e5e5e5]">
          {FAQ.map(({ q, a }) => (
            <details key={q} className="group bg-white open:bg-[#fafafa]">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-5 text-left text-base font-medium text-[#171717] [&::-webkit-details-marker]:hidden">
                {q}
                <Plus className="h-5 w-5 shrink-0 text-[#262626] transition-transform group-open:rotate-45" />
              </summary>
              <p className="px-6 pb-5 text-sm leading-relaxed text-[#171717]/70">
                {a}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

/* =====================================================================
 * HERO — cozinha, escuro, tagline
 * ===================================================================== */
function Hero() {
  return (
    <Spotlight className="fx-spotlight-ink fx-grain fx-grain-soft relative isolate overflow-hidden bg-white text-[#171717]">
      {/* Luz ambiente: branco puro no centro que esfria para as bordas —
          o hero respira sem precisar de laje escura. */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-[radial-gradient(70%_55%_at_50%_28%,#ffffff_0%,#fcfcfb_55%,#f0f0ee_100%)]"
      />
      {/* Grade técnica mascarada — profundidade discreta no fundo. */}
      <div aria-hidden className="fx-grid-ink absolute inset-0 -z-10" />
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(250,250,250,0)_70%,#fafafa_100%)]"
      />
      {/* "Linhas glitch" sutis que ecoam o logotipo enviado */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-1/3 -z-10 flex flex-col gap-3 opacity-10"
      >
        <span className="block h-px w-2/3 bg-[#171717]" />
        <span className="ml-[20%] block h-px w-1/3 bg-[#171717]" />
        <span className="ml-[55%] block h-px w-1/4 bg-[#171717]" />
        <span className="ml-[10%] mt-4 block h-px w-1/2 bg-[#171717]" />
      </div>

      <div className="relative z-[2] mx-auto flex max-w-6xl flex-col items-center px-5 py-28 text-center md:py-36">
        <span className="inline-flex items-center gap-2 rounded-full border border-[#171717]/12 bg-white px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-[#171717]/65 shadow-sm">
          <Leaf className="h-3.5 w-3.5" />
          Consultoria nutricional · Macaé / RJ · desde 2013
        </span>

        <h1 className="fx-shimmer-ink mt-7 text-4xl font-semibold leading-[1.05] tracking-tight md:text-6xl">
          ProActive7
        </h1>

        <p className="mt-4 text-base font-light uppercase tracking-[0.4em] text-[#171717]/55 md:text-lg">
          Boa alimentação, bem-estar e saúde
        </p>

        <p className="mt-7 max-w-2xl text-base leading-relaxed text-[#171717]/70 md:text-lg">
          Assessoria e consultoria em segurança alimentar para estabelecimentos
          comerciais <em>on-shore</em> e <em>off-shore</em> — restaurantes,
          indústrias, hotéis, escolas, padarias e mercados. Responsabilidade
          técnica perante a ANVISA com quem entende do dia a dia da sua
          operação.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/servicos"
            className="fx-sheen inline-flex items-center gap-2 rounded-full bg-[#171717] px-6 py-3 text-sm font-medium text-white shadow-[0_12px_30px_-12px_rgba(0,0,0,0.45)] transition hover:bg-[#333333]"
          >
            Conhecer nossos serviços
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            to="/contato"
            className="inline-flex items-center gap-2 rounded-full border border-[#171717]/20 bg-white/70 px-6 py-3 text-sm font-medium text-[#171717] transition hover:border-[#171717]/50"
          >
            <MessageCircle className="h-4 w-4" />
            Falar com nossa Equipe
          </Link>
        </div>
      </div>
    </Spotlight>
  );
}

/* =====================================================================
 * PILLARS — política de qualidade em fila
 * ===================================================================== */
function PillarsStrip() {
  const items = [
    { icon: ShieldCheck, label: 'Conformidade ANVISA' },
    { icon: Award, label: 'RT registrada no CRN' },
    { icon: Heart, label: 'Atitude pró-ativa' },
    { icon: Leaf, label: 'Boas práticas e meio ambiente' },
  ];
  return (
    <div className="border-y border-[#e5e5e5] bg-white">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-4 px-5 py-6 md:grid-cols-4">
        {items.map(({ icon: Icon, label }) => (
          <div
            key={label}
            className="flex items-center justify-center gap-2 text-xs font-medium text-[#171717]/70"
          >
            <Icon className="h-4 w-4 text-[#262626]" />
            <span>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* =====================================================================
 * SOBRE — quem somos (resumido, com link para /perfil)
 * ===================================================================== */
function Sobre() {
  return (
    <section className="mx-auto max-w-5xl px-5 py-20">
      <div className="grid items-center gap-12 md:grid-cols-[1fr_1.1fr]">
        <Reveal className="order-2 md:order-1">
          <span className="text-xs font-medium uppercase tracking-wider text-[#737373]">
            Quem somos
          </span>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-[#171717] md:text-4xl">
            Uma empresa de Macaé que <em>cuida</em> de quem alimenta gente.
          </h2>
          <div className="mt-6 space-y-4 text-base leading-relaxed text-[#171717]/75">
            <p>
              Nascemos como <strong>PERSONAL DIET</strong> em 2013 e em 2020
              passamos a ser{' '}
              <strong className="text-[#262626]">ProActive 7</strong>, fundada
              pela nutricionista <strong>Ariane Madureira</strong>. Mais de uma
              década entregando consultoria técnica em segurança alimentar, com
              método próprio:{' '}
              <em>observar, planejar, capacitar e conscientizar</em>.
            </p>
            <p>
              Atendemos restaurantes, indústrias, hotéis, escolas, padarias,
              hortifrutis e mercados em todo o Brasil e também no exterior, de
              forma presencial e online — adequando a operação às legislações
              federais, estaduais e municipais vigentes.
            </p>
          </div>
          <Link
            to="/perfil"
            className="mt-7 inline-flex items-center gap-2 rounded-full border border-[#262626]/20 bg-white px-5 py-2.5 text-sm font-medium text-[#262626] hover:border-[#262626]/40"
          >
            Nossa história completa
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Reveal>

        {/* Card "estampa" com a missão da empresa — substitui o mockup
            de produto, fica fiel ao tom de empresa, não de software. */}
        <Reveal delay={120} className="relative order-1 md:order-2">
          <div className="relative overflow-hidden rounded-3xl border border-[#e5e5e5] bg-white p-8 shadow-[0_25px_60px_-35px_rgba(0,0,0,0.25)] md:p-10">
            <span
              aria-hidden
              className="absolute inset-y-0 left-0 w-1 bg-[#171717]"
            />
            <Quote className="h-8 w-8 text-[#d4d4d4]" />
            <p className="mt-4 text-lg font-light italic leading-relaxed text-[#171717]/85">
              Atuar como prestadora de serviços em assessoria e consultoria em
              fornecimento de alimentação e nutrição com qualidade e foco no
              cliente — diferenciada pela{' '}
              <strong className="not-italic text-[#171717]">
                atitude pró-ativa
              </strong>{' '}
              e parceria comprometida com as empresas.
            </p>
            <div className="mt-6 border-t border-[#e5e5e5] pt-4 text-xs uppercase tracking-[0.18em] text-[#737373]">
              Nossa missão
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* =====================================================================
 * MÉTODO — observar, planejar, capacitar, conscientizar
 * ===================================================================== */
function Metodo() {
  const etapas = [
    {
      icon: Eye,
      title: 'Observar',
      body: 'Auditamos a operação como ela realmente é — fluxo, estrutura e rotina da equipe.',
    },
    {
      icon: ClipboardList,
      title: 'Planejar',
      body: 'Montamos um plano de ação priorizado, alinhado à RDC 216 e às exigências locais.',
    },
    {
      icon: GraduationCap,
      title: 'Capacitar',
      body: 'Treinamos os manipuladores e implantamos POPs que funcionam no dia a dia.',
    },
    {
      icon: Lightbulb,
      title: 'Conscientizar',
      body: 'Criamos cultura de segurança alimentar que se mantém entre uma visita e outra.',
    },
  ];
  return (
    <section className="bg-[#fafafa] py-20">
      <div className="mx-auto max-w-6xl px-5">
        <Reveal>
          <div className="mx-auto max-w-2xl text-center">
            <span className="text-xs font-medium uppercase tracking-wider text-[#737373]">
              Nosso método
            </span>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-[#171717] md:text-4xl">
              Um jeito próprio de transformar a cozinha.
            </h2>
            <p className="mt-3 text-base leading-relaxed text-[#171717]/65">
              Quatro etapas que levam o estabelecimento do papel à prática — e
              mantêm a conformidade viva ao longo do tempo.
            </p>
          </div>
        </Reveal>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {etapas.map(({ icon: Icon, title, body }, i) => (
            <Reveal key={title} delay={i * 100}>
              <div className="relative h-full rounded-2xl border border-[#e5e5e5] bg-white p-6">
                {i < etapas.length - 1 && (
                  <span
                    aria-hidden
                    className="pointer-events-none absolute right-[-14px] top-9 hidden h-px w-7 bg-[#737373]/40 lg:block"
                  />
                )}
                <div className="flex items-center justify-between">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e5e5e5] text-[#262626]">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="font-mono text-2xl font-bold text-[#e5e5e5]">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                </div>
                <h3 className="mt-4 text-base font-semibold text-[#171717]">
                  {title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[#171717]/70">
                  {body}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* =====================================================================
 * NÚMEROS — 12 anos, etc.
 * ===================================================================== */
function Numeros() {
  /* Números verificáveis: o total de unidades sai da carta de clientes
     (clientRoster.ts), não de estimativa — CLAUDE.md §3 "não inventar
     métrica positiva". Se a Ariane confirmar um histórico maior, é só
     trocar aqui. */
  const stats = [
    { value: '12+', label: 'anos de operação' },
    { value: `${ROSTER_UNIT_COUNT}`, label: 'unidades atendidas' },
    { value: 'RDC 216', label: 'conformidade ANVISA' },
    { value: 'On & off-shore', label: 'cozinhas atendidas' },
  ];
  return (
    <section className="border-y border-[#e5e5e5] bg-white py-16">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 px-5 md:grid-cols-4">
        {stats.map((s, i) => (
          <Reveal key={s.label} delay={i * 90}>
            <div className="text-center">
              <span
                aria-hidden
                className="mx-auto mb-4 block h-1 w-8 rounded-full bg-[#171717]"
              />
              <p className="text-3xl font-semibold tracking-tight text-[#171717] md:text-4xl">
                {s.value}
              </p>
              <p className="mt-2 text-xs uppercase tracking-wider text-[#737373]">
                {s.label}
              </p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* =====================================================================
 * MURAL DE CLIENTES — prova social direto da carta de clientes da
 * apresentação institucional. Marcas reais, sem logo inventado; quem quiser
 * a lista completa por segmento vai para /clientes.
 * ===================================================================== */
function MuralClientes() {
  /* Marcas com arte disponível, na ordem da apresentação. */
  const marcas = ROSTER_FLAT.filter((c) => c.hasLogo !== false);
  return (
    <section className="border-b border-[#e5e5e5] bg-[#fafafa] py-16">
      <div className="mx-auto max-w-6xl px-5">
        <Reveal>
          <div className="text-center">
            <span className="text-xs font-medium uppercase tracking-wider text-[#737373]">
              Quem confia no nosso trabalho
            </span>
            <h2 className="mx-auto mt-2 max-w-2xl text-3xl font-semibold tracking-tight text-[#171717] md:text-4xl">
              {ROSTER_UNIT_COUNT} unidades já servem com a nossa assinatura
              técnica.
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-base text-[#171717]/65">
              Hotéis, fábricas, escolas, padarias, pizzarias, mercados e buffets
              de Macaé e região — {ROSTER_BRAND_COUNT} marcas em{' '}
              {ROSTER_SEGMENT_COUNT} segmentos.
            </p>
          </div>
        </Reveal>

        <ul className="mt-10 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7">
          {marcas.map((c, i) => (
            <li
              key={c.slug}
              className="flex h-20 items-center justify-center rounded-2xl border border-[#e5e5e5] bg-white p-3"
              style={{ animationDelay: `${i * 20}ms` }}
            >
              <img
                src={`/clientes/${c.slug}.webp`}
                alt={c.name}
                title={c.name}
                loading="lazy"
                decoding="async"
                className="max-h-12 max-w-full object-contain opacity-80 transition hover:opacity-100"
              />
            </li>
          ))}
        </ul>

        <div className="mt-8 text-center">
          <Link
            to="/clientes"
            className="inline-flex items-center gap-2 rounded-full border border-[#171717]/20 bg-white px-5 py-2.5 text-sm font-medium text-[#171717] transition hover:border-[#171717]/50"
          >
            Ver a carta de clientes completa
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

/* =====================================================================
 * SERVIÇOS — resumo visual + CTA para /servicos
 * ===================================================================== */
function ServicosResumo() {
  const items = [
    {
      icon: GraduationCap,
      title: 'Treinamentos',
      body: 'Capacitação técnica dos manipuladores da sua operação.',
    },
    {
      icon: Stethoscope,
      title: 'Assessoria técnica',
      body: 'Visitas regulares e acompanhamento das boas práticas.',
    },
    {
      icon: ClipboardCheck,
      title: 'Auditorias',
      body: 'Avaliação pontual e regularização junto à ANVISA.',
    },
    {
      icon: Utensils,
      title: 'Responsabilidade técnica / PAT',
      body: 'Implantação e manutenção do PAT na sua empresa.',
    },
    {
      icon: ChefHat,
      title: 'Cardápios e fichas técnicas',
      body: 'Padronização, custo calculado e revisão periódica.',
    },
    {
      icon: Stamp,
      title: 'CMVS',
      body: 'Cadastro Municipal de Vigilância em Saúde.',
    },
    {
      icon: Tag,
      title: 'Rotulagem Nutricional conforme legislação atual',
      body: 'Rótulo nutricional assinado por especialista.',
    },
    {
      icon: BookOpen,
      title: 'Manuais e POPs',
      body: 'Manual de boas práticas e POPs personalizados.',
    },
  ];
  return (
    <section className="mx-auto max-w-6xl px-5 py-20">
      <Reveal>
        <div className="text-center">
          <span className="text-xs font-medium uppercase tracking-wider text-[#737373]">
            O que entregamos
          </span>
          <h2 className="mx-auto mt-2 max-w-2xl text-3xl font-semibold tracking-tight text-[#171717] md:text-4xl">
            Consultoria que cabe na rotina do seu estabelecimento.
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-base text-[#171717]/65">
            Cada empresa tem um ritmo. Montamos o pacote certo para sua unidade
            — do treinamento da equipe à entrega de manuais assinados.
          </p>
        </div>
      </Reveal>

      <div className="mt-12">
        <Carousel ariaLabel="Serviços oferecidos">
          {items.map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="group h-full rounded-2xl border border-[#e5e5e5] bg-white p-6 transition hover:border-[#737373]/50 hover:shadow-[0_12px_30px_-15px_rgba(0,0,0,0.20)]"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#e5e5e5] text-[#262626]">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-sm font-semibold text-[#171717]">
                {title}
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-[#171717]/65">
                {body}
              </p>
            </div>
          ))}
        </Carousel>
      </div>

      <div className="mt-10 text-center">
        <Link
          to="/servicos"
          className="inline-flex items-center gap-2 rounded-full bg-[#262626] px-6 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-[#404040]"
        >
          Ver todos os serviços em detalhe
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}

/* =====================================================================
 * DIFERENCIAIS — por que a ProActive7
 * ===================================================================== */
function Diferenciais() {
  const items = [
    {
      icon: BadgeCheck,
      title: 'Responsabilidade técnica de verdade',
      body: 'Nutricionista RT registrada no CRN assina pela sua operação perante a ANVISA — não é só relatório, é responsabilidade assumida.',
    },
    {
      icon: Laptop2,
      title: 'Sistema próprio incluso',
      body: 'A plataforma ProActive7 (etiquetas RDC 216, auditorias, temperaturas, ASOs e POPs) entra junto com a consultoria, sem custo extra.',
    },
    {
      icon: Users,
      title: 'On-shore e off-shore',
      body: 'Experiência com cozinhas de plataforma, indústria, hotelaria e food service — a exigência técnica é a mesma, o contexto a gente conhece.',
    },
    {
      icon: Heart,
      title: 'Atitude pró-ativa',
      body: 'Antecipamos o problema antes da fiscalização chegar. Acompanhamento próximo, sem espera e sem improviso.',
    },
  ];
  return (
    <section className="relative isolate overflow-hidden border-y border-[#e5e5e5] bg-white py-20">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-40 top-0 h-96 w-96 rounded-full bg-[#efefed] blur-[120px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-40 bottom-0 h-96 w-96 rounded-full bg-[#f0f0ee] blur-[120px]"
      />
      <div className="relative mx-auto max-w-6xl px-5">
        <Reveal>
          <div className="mx-auto max-w-2xl text-center">
            <span className="text-xs font-medium uppercase tracking-wider text-[#737373]">
              Por que a ProActive7
            </span>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-[#171717] md:text-4xl">
              Consultoria que assume a responsabilidade com você.
            </h2>
          </div>
        </Reveal>
        <div className="mt-12 grid gap-5 sm:grid-cols-2">
          {items.map(({ icon: Icon, title, body }, i) => (
            <Reveal key={title} delay={i * 90}>
              <div className="fx-lift flex h-full gap-4 rounded-3xl border border-[#e5e5e5] bg-[#fafafa] p-7 transition hover:border-[#c9c9c6] hover:bg-white">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#e5e5e5] bg-white text-[#262626]">
                  <Icon className="h-6 w-6" />
                </span>
                <div>
                  <h3 className="text-lg font-semibold tracking-tight text-[#171717]">
                    {title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#171717]/70">
                    {body}
                  </p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* =====================================================================
 * DEPOIMENTOS — carrossel simples (scroll-snap, sem deps)
 * ===================================================================== */
function Depoimentos() {
  const items = [
    {
      quote:
        'A Ariane traz para a cozinha o que a fiscalização espera ver. Em duas visitas, o restaurante saiu do papel para a prática.',
      author: 'Gerente de cozinha · Macaé',
    },
    {
      quote:
        'O olhar técnico dela mudou nosso processo de manipulação. Hoje temos POPs vivos, não só impressos na parede.',
      author: 'Nutricionista parceira',
    },
    {
      quote:
        'Profissional ética, comprometida e pró-ativa. A ProActive7 é hoje parte da nossa operação.',
      author: 'Diretor · Hotelaria off-shore',
    },
    {
      quote:
        'Conseguimos o CMVS sem dor de cabeça. Eles cuidaram da papelada e da equipe ao mesmo tempo.',
      author: 'Padaria · Imbetiba',
    },
  ];
  return (
    <section className="bg-[#fafafa] py-20">
      <div className="mx-auto max-w-6xl px-5">
        <Reveal>
          <div className="mb-10">
            <span className="text-xs font-medium uppercase tracking-wider text-[#737373]">
              Quem confia
            </span>
            <h2 className="mt-2 max-w-xl text-3xl font-semibold tracking-tight text-[#171717] md:text-4xl">
              Histórias reais de quem entrega comida com segurança.
            </h2>
          </div>
        </Reveal>

        <Carousel ariaLabel="Depoimentos de clientes">
          {items.map((d, i) => (
            <article
              key={i}
              className="relative h-full rounded-3xl border border-[#e5e5e5] bg-white p-8 shadow-[0_18px_40px_-25px_rgba(0,0,0,0.18)]"
            >
              <Quote className="h-7 w-7 text-[#737373]/55" />
              <p className="mt-4 text-base leading-relaxed text-[#171717]/85">
                "{d.quote}"
              </p>
              <p className="mt-6 text-xs font-medium uppercase tracking-wider text-[#262626]">
                {d.author}
              </p>
            </article>
          ))}
        </Carousel>
      </div>
    </section>
  );
}

/* =====================================================================
 * ATUAÇÃO — onde atendemos
 * ===================================================================== */
function Atuacao() {
  /* Segmentos que realmente atendemos hoje — espelham a carta de clientes
     da apresentação institucional (ver src/lib/clientRoster.ts). */
  const segmentos = [
    'Hotéis e apart hotéis',
    'Indústrias e fábricas',
    'Restaurantes e bistrôs',
    'Escolas e creches',
    'Hamburguerias e pizzarias',
    'Padarias e confeitarias',
    'Mercados e supermercados',
    'Hortifrutis e minimercados',
    'Cafés',
    'Buffet e eventos',
  ];
  return (
    <section className="mx-auto max-w-6xl px-5 py-20">
      <div className="grid items-start gap-12 md:grid-cols-[1fr_1fr]">
        <Reveal>
          <div>
            <span className="text-xs font-medium uppercase tracking-wider text-[#737373]">
              Atuação
            </span>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-[#171717] md:text-4xl">
              Macaé, região dos Lagos e plataformas off-shore.
            </h2>
            <p className="mt-5 text-base leading-relaxed text-[#171717]/70">
              Atendemos estabelecimentos comerciais de variados segmentos —
              sempre alinhados ao Ministério da Saúde, ANVISA e à legislação
              municipal de cada operação.
            </p>
            <div className="mt-7 flex items-center gap-2 text-sm font-medium text-[#262626]">
              <MapPin className="h-4 w-4" />
              Rua Dr. Luiz Bellegard, 407 — sala 704 · Imbetiba · Macaé / RJ
            </div>
          </div>
        </Reveal>
        <Reveal delay={120}>
          <ul className="grid grid-cols-2 gap-2.5 text-sm">
            {segmentos.map((s) => (
              <li
                key={s}
                className="rounded-xl border border-[#e5e5e5] bg-white px-4 py-3 text-[#171717]/80"
              >
                {s}
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}

/* =====================================================================
 * CTA FINAL — sem nada de "acessar sistema"; é página da empresa
 * ===================================================================== */
function FinalCta() {
  return (
    <section className="relative isolate overflow-hidden border-t border-[#e5e5e5] bg-white">
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-[radial-gradient(60%_70%_at_50%_0%,#ffffff_0%,#fbfbfa_60%,#f2f2f0_100%)]"
      />
      <div aria-hidden className="fx-grid-ink absolute inset-0 -z-10" />
      <Reveal className="relative mx-auto max-w-3xl px-5 py-20 text-center md:py-24">
        <h2 className="text-3xl font-semibold tracking-tight text-[#171717] md:text-4xl">
          Pronto para conversar sobre a sua operação?
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-[#171717]/70">
          A gente avalia o que sua unidade precisa e monta o pacote certo —
          consultoria, treinamento, RT, POPs e tudo que a ANVISA exige.
        </p>
        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/contato"
            className="fx-sheen inline-flex items-center gap-2 rounded-full bg-[#171717] px-6 py-3 text-sm font-medium text-white shadow-[0_12px_30px_-12px_rgba(0,0,0,0.45)] transition hover:bg-[#333333]"
          >
            Falar com a ProActive7
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            to="/servicos"
            className="inline-flex items-center gap-2 rounded-full border border-[#171717]/20 bg-white px-6 py-3 text-sm font-medium text-[#171717] transition hover:border-[#171717]/50"
          >
            Ver serviços oferecidos
          </Link>
        </div>
      </Reveal>
    </section>
  );
}
