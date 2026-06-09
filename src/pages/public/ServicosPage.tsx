import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  GraduationCap,
  Stethoscope,
  ClipboardCheck,
  Utensils,
  ChefHat,
  Stamp,
  Tag,
  BookOpen,
  ArrowRight,
  Laptop2,
  Hotel,
  ShoppingBasket,
  Factory,
  School,
  Building2,
  Croissant,
  Apple,
  Quote,
  Thermometer,
  Bug,
  ShieldCheck,
  Sparkles,
  Search,
  Wrench,
  CalendarCheck,
  BadgeCheck,
} from 'lucide-react';
import { Plus } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { usePageMeta } from '@/lib/usePageMeta';
import { Carousel } from '@/components/public/Carousel';
import seoConfig from '@/lib/seo.config.json';

const FAQ = (seoConfig.pages['/servicos'].faq ?? []) as {
  q: string;
  a: string;
}[];

interface Servico {
  icon: LucideIcon;
  title: string;
  /** Pílula curta de categoria, exibida no banner do showcase. */
  tag: string;
  body: string;
  /** Resultado concreto entregue ao cliente — reforça o valor. */
  entrega: string;
  /** Se preenchido, vira link "Saiba mais" no final do card. */
  cta?: { to: string; label: string };
}

const SERVICOS: Servico[] = [
  {
    icon: GraduationCap,
    title: 'Treinamentos',
    tag: 'Capacitação da equipe',
    body: 'Promovemos, com qualidade, uma maneira diferente de levar conhecimento técnico até os manipuladores de alimentos da sua operação.',
    entrega: 'Equipe treinada e registro de capacitação para a fiscalização.',
  },
  {
    icon: Stethoscope,
    title: 'Assessoria técnica periódica',
    tag: 'Acompanhamento contínuo',
    body: 'Visitas e acompanhamento regulares garantem que as boas práticas de manipulação de alimentos estejam corretamente implantadas e aplicadas conforme a necessidade do seu estabelecimento.',
    entrega: 'Visitas recorrentes com relatório técnico a cada acompanhamento.',
  },
  {
    icon: ClipboardCheck,
    title: 'Auditoria técnica pontual',
    tag: 'Diagnóstico ANVISA',
    body: 'Através das auditorias técnicas avaliamos se o estabelecimento está apto a produzir/fornecer produtos alimentícios com qualidade e segurança alimentar — auxiliando na regularização junto à legislação da ANVISA.',
    entrega: 'Laudo de conformidade e plano de ação para regularização.',
  },
  {
    icon: Utensils,
    title: 'Responsabilidade técnica / PAT',
    tag: 'RT e PAT',
    body: 'O PAT (Programa de Alimentação do Trabalhador) é uma iniciativa do governo para proporcionar mais qualidade na alimentação de trabalhadores. Auxiliamos na implantação e manutenção do programa na sua empresa.',
    entrega: 'RT assinada e PAT implantado conforme a legislação.',
  },
  {
    icon: ChefHat,
    title: 'Cardápios e fichas técnicas',
    tag: 'Padronização',
    body: 'Criação, implementação e revisão de cardápios e fichas técnicas de cada preparação do seu estabelecimento — com padronização e custo calculado.',
    entrega: 'Fichas técnicas com custo por porção e cardápio padronizado.',
  },
  {
    icon: Stamp,
    title: 'CMVS — Cadastro Municipal de Vigilância em Saúde',
    tag: 'Licenciamento',
    body: 'Auxiliamos na obtenção do CMVS do seu estabelecimento, conduzindo o processo de documentação e atendendo às exigências municipais.',
    entrega: 'CMVS emitido com a documentação municipal em dia.',
  },
  {
    icon: Tag,
    title: 'Informação nutricional',
    tag: 'Rotulagem',
    body: 'Todos os alimentos fabricados e embalados para venda devem ter rótulo nutricional elaborado e assinado por nutricionista especializada — nossa equipe entrega isso para você dentro da legislação vigente.',
    entrega: 'Rótulo nutricional assinado, pronto para a embalagem.',
  },
  {
    icon: BookOpen,
    title: 'Manuais de Boas Práticas e POPs',
    tag: 'Documentação',
    body: 'Manual de boas práticas personalizado, respeitando as peculiaridades do seu ramo e negócio. Os POPs (Procedimentos Operacionais Padronizados) orientam o manipulador no dia a dia da operação.',
    entrega: 'Manual de Boas Práticas e POPs personalizados para a sua operação.',
  },
];

/**
 * Destaque do sistema próprio — sai do grid de serviços e vira banner
 * full-width. Além de dar protagonismo ao diferencial da ProActive7,
 * resolve o número ímpar de serviços (8 cards = grid 2×4 sem órfão).
 */
const SISTEMA_HIGHLIGHTS: { icon: LucideIcon; label: string }[] = [
  { icon: Tag, label: 'Etiquetas RDC 216' },
  { icon: ClipboardCheck, label: 'Auditorias e checklists' },
  { icon: Thermometer, label: 'Temperaturas de equipamentos' },
  { icon: Bug, label: 'Controle de pragas' },
  { icon: ShieldCheck, label: 'ASOs e treinamentos' },
  { icon: BookOpen, label: 'POPs e documentos' },
];

export function ServicosPage() {
  usePageMeta('/servicos');
  return (
    <div>
      <Hero />
      <ServiceShowcase />
      <SistemaBanner />
      <ComoFunciona />
      <Segmentos />
      <Depoimentos />
      <Faq />
      <CTA />
    </div>
  );
}

function Faq() {
  if (!FAQ.length) return null;
  return (
    <section className="border-t border-[#e5e5e5] bg-white">
      <div className="mx-auto max-w-3xl px-5 py-16">
        <div className="text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#737373]/40 bg-white px-3 py-1 text-xs font-medium text-[#262626]">
            Perguntas frequentes
          </span>
          <h2 className="mt-4 text-2xl font-semibold tracking-tight md:text-3xl">
            Dúvidas comuns sobre consultoria e ANVISA
          </h2>
        </div>
        <div className="mt-8 divide-y divide-[#e5e5e5] overflow-hidden rounded-2xl border border-[#e5e5e5]">
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

function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-[#e5e5e5] bg-gradient-to-b from-[#e5e5e5] to-[#fafafa]">
      <div className="mx-auto max-w-6xl px-5 py-16 text-center md:py-20">
        <span className="inline-flex items-center gap-2 rounded-full border border-[#737373]/40 bg-white px-3 py-1 text-xs font-medium text-[#262626]">
          Nossos serviços
        </span>
        <h1 className="mx-auto mt-4 max-w-3xl text-3xl font-semibold leading-[1.15] tracking-tight md:text-4xl">
          O que entregamos para a sua operação.
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-[#171717]/70">
          Listamos abaixo os serviços oferecidos e alguns detalhes — todos
          alinhados às legislações federais, estaduais e municipais vigentes.
        </p>
      </div>
    </section>
  );
}

/**
 * Showcase interativo dos serviços ("modo galeria") em liquid glass.
 * Seção full-bleed (largura total no desktop) com fundo aurora — blobs
 * coloridos desfocados em movimento — e painéis de vidro fosco
 * (backdrop-blur) por cima. A lista à esquerda controla um painel-banner
 * que se transforma ao passar o mouse / focar / tocar. Cada serviço ganha
 * tratamento de banner. No mobile/tablet a lista empilha e o banner
 * aparece abaixo (toque seleciona, já que não há hover). Acessível:
 * botões reais + aria-pressed.
 */
function ServiceShowcase() {
  const [active, setActive] = useState(0);
  const current = SERVICOS[active];
  const CurrentIcon = current.icon;
  const num = String(active + 1).padStart(2, '0');

  return (
    <section className="relative left-1/2 w-screen -translate-x-1/2 overflow-hidden py-16 md:py-20">
      {/* Fundo aurora (liquid glass backdrop) */}
      <div className="absolute inset-0 -z-10 bg-[#0d1f15]" />
      <div aria-hidden="true" className="absolute inset-0 -z-10 overflow-hidden">
        <div className="animate-aurora absolute -left-24 -top-24 h-[30rem] w-[30rem] rounded-full bg-[#525252]/45 blur-[120px]" />
        <div className="animate-aurora absolute right-[-6rem] top-1/4 h-[28rem] w-[28rem] rounded-full bg-[#737373]/35 blur-[130px] [animation-delay:-7s]" />
        <div className="animate-aurora absolute bottom-[-8rem] left-1/3 h-[26rem] w-[26rem] rounded-full bg-[#1f6f5c]/40 blur-[120px] [animation-delay:-14s]" />
        {/* véu sutil para uniformizar o contraste do texto */}
        <div className="absolute inset-0 bg-[#0d1f15]/30" />
      </div>

      <div className="mx-auto max-w-6xl px-5">
        <div className="mb-8">
          <span className="text-xs font-medium uppercase tracking-wider text-[#9FD3B5]">
            O que fazemos
          </span>
          <h2 className="mt-2 max-w-xl text-2xl font-semibold tracking-tight text-white md:text-3xl">
            Consultoria técnica do início à fiscalização.
          </h2>
          <p className="mt-3 max-w-xl text-sm text-white/60">
            Passe o mouse (ou toque) em cada serviço para ver o que entregamos.
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
          {/* Lista — galeria de serviços (vidro) */}
          <ul className="flex flex-col gap-2.5">
            {SERVICOS.map((s, i) => {
              const Icon = s.icon;
              const isActive = i === active;
              return (
                <li key={s.title}>
                  <button
                    type="button"
                    onMouseEnter={() => setActive(i)}
                    onFocus={() => setActive(i)}
                    onClick={() => setActive(i)}
                    aria-pressed={isActive}
                    className={`group flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left text-white backdrop-blur-md transition ${
                      isActive
                        ? 'border-white/30 bg-white/15 shadow-[0_12px_30px_-14px_rgba(0,0,0,0.5)]'
                        : 'border-white/10 bg-white/5 hover:border-white/25 hover:bg-white/10'
                    }`}
                  >
                    <span
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition ${
                        isActive
                          ? 'border-white/30 bg-white/20 text-white'
                          : 'border-white/10 bg-white/10 text-[#BFE3CC]'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span
                        className={`block font-mono text-[10px] uppercase tracking-wider ${
                          isActive ? 'text-white/60' : 'text-[#9FD3B5]/70'
                        }`}
                      >
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <span className="block truncate text-sm font-semibold leading-snug">
                        {s.title}
                      </span>
                    </span>
                    <ArrowRight
                      className={`h-4 w-4 shrink-0 transition-all ${
                        isActive
                          ? 'translate-x-0 opacity-100'
                          : '-translate-x-1 opacity-0 group-hover:translate-x-0 group-hover:opacity-60'
                      }`}
                    />
                  </button>
                </li>
              );
            })}
          </ul>

          {/* Banner de vidro que se transforma */}
          <div className="relative min-h-[20rem] overflow-hidden rounded-3xl border border-white/15 bg-white/10 p-8 shadow-[0_24px_70px_-30px_rgba(0,0,0,0.7)] backdrop-blur-2xl md:p-10">
            {/* brilho superior do vidro */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />
            <span
              className="pointer-events-none absolute right-6 top-2 select-none font-mono text-[7rem] font-bold leading-none text-white/10"
              aria-hidden="true"
            >
              {num}
            </span>

            {/* key={active} remonta o bloco → dispara a animação a cada troca */}
            <div
              key={active}
              className="animate-service-reveal relative flex h-full flex-col text-white"
            >
              <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/25 bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur-sm">
                <Sparkles className="h-3.5 w-3.5" />
                {current.tag}
              </span>
              <div className="mt-6 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/20 bg-white/15 text-white">
                <CurrentIcon className="h-7 w-7" />
              </div>
              <h3 className="mt-5 text-2xl font-semibold tracking-tight">
                {current.title}
              </h3>
              <p className="mt-3 max-w-lg text-sm leading-relaxed text-white/80 md:text-base">
                {current.body}
              </p>
              <div className="mt-auto flex items-start gap-2.5 pt-6">
                <BadgeCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#BFE3CC]" />
                <p className="text-sm font-medium text-white">
                  {current.entrega}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * Banner full-width do sistema próprio. Destaca o diferencial da
 * ProActive7 (tecnologia inclusa na consultoria) e equilibra o grid
 * de serviços, que fica par sem este card.
 */
function SistemaBanner() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-12">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#404040] via-[#262626] to-[#525252] p-8 text-white shadow-[0_24px_60px_-25px_rgba(0,0,0,0.55)] md:p-12">
        {/* círculos decorativos */}
        <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute -bottom-24 -left-12 h-56 w-56 rounded-full bg-white/5" />

        <div className="relative grid gap-10 md:grid-cols-[1.3fr_1fr] md:items-center">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-medium backdrop-blur-sm">
              <Sparkles className="h-3.5 w-3.5" />
              Exclusivo · incluso na consultoria
            </span>
            <h2 className="mt-4 flex items-center gap-3 text-2xl font-semibold tracking-tight md:text-3xl">
              <Laptop2 className="h-7 w-7 shrink-0 text-[#BFE3CC]" />
              Sistema ProActive7
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/85 md:text-base">
              Plataforma própria que digitaliza toda a operação — a Ariane
              entrega gratuitamente junto à consultoria. Registre tudo pelo
              celular e tenha a documentação pronta para a fiscalização a
              qualquer momento.
            </p>
            <Link
              to="/sistema"
              className="mt-7 inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-medium text-[#262626] shadow-sm transition hover:bg-[#e5e5e5]"
            >
              Conhecer a plataforma
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-1">
            {SISTEMA_HIGHLIGHTS.map(({ icon: Icon, label }) => (
              <li
                key={label}
                className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-medium backdrop-blur-sm"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/15 text-[#BFE3CC]">
                  <Icon className="h-4 w-4" />
                </span>
                {label}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

/**
 * Seção "Como trabalhamos" — linha do tempo do processo de consultoria.
 * Enriquece a página explicando o método (não inventa métrica; descreve
 * o fluxo real: diagnóstico → implantação → acompanhamento → pronto).
 */
function ComoFunciona() {
  const passos: { icon: LucideIcon; step: string; title: string; body: string }[] =
    [
      {
        icon: Search,
        step: '01',
        title: 'Diagnóstico',
        body: 'Auditoria inicial da sua operação para mapear o que já está conforme e o que precisa de ajuste.',
      },
      {
        icon: Wrench,
        step: '02',
        title: 'Implantação',
        body: 'Manuais, POPs, fichas técnicas e treinamento da equipe — colocamos as boas práticas para rodar de fato.',
      },
      {
        icon: CalendarCheck,
        step: '03',
        title: 'Acompanhamento',
        body: 'Visitas periódicas e o sistema ProActive7 mantêm tudo registrado e atualizado no dia a dia.',
      },
      {
        icon: BadgeCheck,
        step: '04',
        title: 'Pronto para a fiscalização',
        body: 'Documentação assinada pela RT e operação em conformidade com a ANVISA, a qualquer momento.',
      },
    ];
  return (
    <section className="border-t border-[#e5e5e5] bg-white py-16">
      <div className="mx-auto max-w-6xl px-5">
        <div className="mb-10">
          <span className="text-xs font-medium uppercase tracking-wider text-[#737373]">
            Como trabalhamos
          </span>
          <h2 className="mt-2 max-w-xl text-2xl font-semibold tracking-tight text-[#171717] md:text-3xl">
            Do diagnóstico à fiscalização — sem improviso.
          </h2>
        </div>

        <ol className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {passos.map(({ icon: Icon, step, title, body }, i) => (
            <li
              key={step}
              className="relative rounded-2xl border border-[#e5e5e5] bg-[#fafafa] p-6"
            >
              {/* conector entre cards no desktop */}
              {i < passos.length - 1 && (
                <span
                  className="pointer-events-none absolute right-[-14px] top-10 hidden h-px w-7 bg-[#737373]/40 lg:block"
                  aria-hidden="true"
                />
              )}
              <div className="flex items-center justify-between">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#262626] text-white">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="font-mono text-2xl font-bold text-[#e5e5e5]">
                  {step}
                </span>
              </div>
              <h3 className="mt-4 text-base font-semibold text-[#171717]">
                {title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[#171717]/70">
                {body}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/**
 * Carrossel horizontal de segmentos atendidos. Snap-x para virar
 * "swipe friendly" no mobile e mostrar visualmente o leque da ProActive7
 * sem precisar de banco de fotos (custo zero).
 */
function Segmentos() {
  const items: { icon: LucideIcon; label: string; sub: string }[] = [
    { icon: Hotel, label: 'Hotelaria', sub: 'On-shore e off-shore' },
    { icon: Factory, label: 'Indústrias', sub: 'Cozinhas industriais e PAT' },
    { icon: Utensils, label: 'Restaurantes', sub: 'À la carte e self-service' },
    { icon: School, label: 'Escolas e creches', sub: 'Merenda escolar' },
    { icon: Croissant, label: 'Padarias', sub: 'Produção e atendimento' },
    {
      icon: ShoppingBasket,
      label: 'Mercados',
      sub: 'Setor frio, FLV e padaria interna',
    },
    { icon: Apple, label: 'Hortifrutis', sub: 'Manipulação e validade' },
    {
      icon: Building2,
      label: 'Lanchonetes',
      sub: 'Fast food e quiosques',
    },
  ];
  return (
    <section className="bg-[#fafafa] py-16">
      <div className="mx-auto max-w-6xl px-5">
        <div className="mb-8">
          <span className="text-xs font-medium uppercase tracking-wider text-[#737373]">
            Quem atendemos
          </span>
          <h2 className="mt-2 max-w-xl text-2xl font-semibold tracking-tight text-[#171717] md:text-3xl">
            Segmentos com necessidades distintas — mesma exigência técnica.
          </h2>
        </div>

        <Carousel
          ariaLabel="Segmentos atendidos"
          slideBasis="basis-[70%] sm:basis-1/2 lg:basis-1/4"
        >
          {items.map(({ icon: Icon, label, sub }) => (
            <article
              key={label}
              className="flex h-full flex-col gap-3 rounded-3xl border border-[#e5e5e5] bg-white p-6"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e5e5e5] text-[#262626]">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-[#171717]">
                  {label}
                </h3>
                <p className="mt-1 text-xs text-[#171717]/60">{sub}</p>
              </div>
            </article>
          ))}
        </Carousel>
      </div>
    </section>
  );
}

/**
 * Carrossel de depoimentos — reforça confiança. Mesmo padrão visual da
 * landing pra manter coerência (snap-x scroll, custo zero).
 */
function Depoimentos() {
  const items = [
    {
      quote:
        'A Ariane traz para a cozinha o que a fiscalização espera ver. Em duas visitas, o restaurante saiu do papel para a prática.',
      author: 'Gerente de cozinha · Macaé',
    },
    {
      quote:
        'O olhar técnico mudou nosso processo. Hoje temos POPs vivos, não só impressos na parede.',
      author: 'Nutricionista parceira',
    },
    {
      quote:
        'Profissional ética e pró-ativa. A ProActive7 é hoje parte da nossa operação.',
      author: 'Diretor · Hotelaria off-shore',
    },
    {
      quote:
        'Conseguimos o CMVS sem dor de cabeça. Cuidaram da papelada e treinaram a equipe ao mesmo tempo.',
      author: 'Padaria · Imbetiba',
    },
  ];
  return (
    <section className="border-t border-[#e5e5e5] bg-white py-16">
      <div className="mx-auto max-w-6xl px-5">
        <div className="text-center">
          <span className="text-xs font-medium uppercase tracking-wider text-[#737373]">
            Quem confia
          </span>
          <h2 className="mx-auto mt-2 max-w-xl text-2xl font-semibold tracking-tight text-[#171717] md:text-3xl">
            O que os clientes dizem.
          </h2>
        </div>
        <div className="mt-8">
          <Carousel ariaLabel="Depoimentos de clientes">
            {items.map((d, i) => (
              <article
                key={i}
                className="relative h-full rounded-3xl border border-[#e5e5e5] bg-[#fafafa] p-7"
              >
                <Quote className="h-7 w-7 text-[#737373]/55" />
                <p className="mt-3 text-sm leading-relaxed text-[#171717]/85">
                  "{d.quote}"
                </p>
                <p className="mt-5 text-xs font-medium uppercase tracking-wider text-[#262626]">
                  {d.author}
                </p>
              </article>
            ))}
          </Carousel>
        </div>
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section className="bg-[#e5e5e5]/60">
      <div className="mx-auto max-w-3xl px-5 py-16 text-center">
        <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
          Quer conversar sobre o que faz sentido para o seu negócio?
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-base leading-relaxed text-[#171717]/70">
          Cada operação tem um ritmo. A gente avalia o que sua unidade precisa e
          monta o pacote certo.
        </p>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/contato"
            className="inline-flex items-center gap-2 rounded-full bg-[#262626] px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-[#404040]"
          >
            Falar com a ProActive7
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            to="/perfil"
            className="inline-flex items-center gap-2 rounded-full border border-[#262626]/20 bg-white px-5 py-3 text-sm font-medium text-[#262626] hover:border-[#262626]/40"
          >
            Conhecer a empresa
          </Link>
        </div>
      </div>
    </section>
  );
}
