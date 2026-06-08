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
  body: string;
  /** Se preenchido, vira link "Saiba mais" no final do card. */
  cta?: { to: string; label: string };
}

const SERVICOS: Servico[] = [
  {
    icon: GraduationCap,
    title: 'Treinamentos',
    body: 'Promovemos, com qualidade, uma maneira diferente de levar conhecimento técnico até os manipuladores de alimentos da sua operação.',
  },
  {
    icon: Stethoscope,
    title: 'Assessoria técnica periódica',
    body: 'Visitas e acompanhamento regulares garantem que as boas práticas de manipulação de alimentos estejam corretamente implantadas e aplicadas conforme a necessidade do seu estabelecimento.',
  },
  {
    icon: ClipboardCheck,
    title: 'Auditoria técnica pontual',
    body: 'Através das auditorias técnicas avaliamos se o estabelecimento está apto a produzir/fornecer produtos alimentícios com qualidade e segurança alimentar — auxiliando na regularização junto à legislação da ANVISA.',
  },
  {
    icon: Utensils,
    title: 'Responsabilidade técnica / PAT',
    body: 'O PAT (Programa de Alimentação do Trabalhador) é uma iniciativa do governo para proporcionar mais qualidade na alimentação de trabalhadores. Auxiliamos na implantação e manutenção do programa na sua empresa.',
  },
  {
    icon: ChefHat,
    title: 'Cardápios e fichas técnicas',
    body: 'Criação, implementação e revisão de cardápios e fichas técnicas de cada preparação do seu estabelecimento — com padronização e custo calculado.',
  },
  {
    icon: Stamp,
    title: 'CMVS — Cadastro Municipal de Vigilância em Saúde',
    body: 'Auxiliamos na obtenção do CMVS do seu estabelecimento, conduzindo o processo de documentação e atendendo às exigências municipais.',
  },
  {
    icon: Tag,
    title: 'Informação nutricional',
    body: 'Todos os alimentos fabricados e embalados para venda devem ter rótulo nutricional elaborado e assinado por nutricionista especializada — nossa equipe entrega isso para você dentro da legislação vigente.',
  },
  {
    icon: BookOpen,
    title: 'Manuais de Boas Práticas e POPs',
    body: 'Manual de boas práticas personalizado, respeitando as peculiaridades do seu ramo e negócio. Os POPs (Procedimentos Operacionais Padronizados) orientam o manipulador no dia a dia da operação.',
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
      <Grid />
      <SistemaBanner />
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
    <section className="border-t border-[#E8F1EA] bg-white">
      <div className="mx-auto max-w-3xl px-5 py-16">
        <div className="text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#6FA68A]/40 bg-white px-3 py-1 text-xs font-medium text-[#2F5D3F]">
            Perguntas frequentes
          </span>
          <h2 className="mt-4 text-2xl font-semibold tracking-tight md:text-3xl">
            Dúvidas comuns sobre consultoria e ANVISA
          </h2>
        </div>
        <div className="mt-8 divide-y divide-[#E8F1EA] overflow-hidden rounded-2xl border border-[#E8F1EA]">
          {FAQ.map(({ q, a }) => (
            <details key={q} className="group bg-white open:bg-[#FAFAF7]">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-5 text-left text-base font-medium text-[#1A2A22] [&::-webkit-details-marker]:hidden">
                {q}
                <Plus className="h-5 w-5 shrink-0 text-[#2F5D3F] transition-transform group-open:rotate-45" />
              </summary>
              <p className="px-6 pb-5 text-sm leading-relaxed text-[#1A2A22]/70">
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
    <section className="relative overflow-hidden border-b border-[#E8F1EA] bg-gradient-to-b from-[#E8F1EA] to-[#FAFAF7]">
      <div className="mx-auto max-w-6xl px-5 py-16 text-center md:py-20">
        <span className="inline-flex items-center gap-2 rounded-full border border-[#6FA68A]/40 bg-white px-3 py-1 text-xs font-medium text-[#2F5D3F]">
          Nossos serviços
        </span>
        <h1 className="mx-auto mt-4 max-w-3xl text-3xl font-semibold leading-[1.15] tracking-tight md:text-4xl">
          O que entregamos para a sua operação.
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-[#1A2A22]/70">
          Listamos abaixo os serviços oferecidos e alguns detalhes — todos
          alinhados às legislações federais, estaduais e municipais vigentes.
        </p>
      </div>
    </section>
  );
}

function Grid() {
  return (
    <section className="mx-auto max-w-6xl px-5 pb-4 pt-16">
      <div className="mb-8">
        <span className="text-xs font-medium uppercase tracking-wider text-[#6FA68A]">
          O que fazemos
        </span>
        <h2 className="mt-2 max-w-xl text-2xl font-semibold tracking-tight text-[#1A2A22] md:text-3xl">
          Consultoria técnica do início à fiscalização.
        </h2>
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        {SERVICOS.map(({ icon: Icon, title, body, cta }, idx) => (
          <article
            key={title}
            className="group relative overflow-hidden rounded-2xl border border-[#E8F1EA] bg-white p-7 transition hover:border-[#6FA68A]/50 hover:shadow-[0_12px_30px_-15px_rgba(47,93,63,0.20)]"
          >
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#E8F1EA] text-[#2F5D3F]">
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#6FA68A]">
                  {String(idx + 1).padStart(2, '0')}
                </span>
                <h3 className="mt-0.5 text-base font-semibold leading-snug text-[#1A2A22]">
                  {title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-[#1A2A22]/70">
                  {body}
                </p>
                {cta ? (
                  <Link
                    to={cta.to}
                    className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-[#2F5D3F] hover:underline"
                  >
                    {cta.label}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                ) : null}
              </div>
            </div>
          </article>
        ))}
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
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#234731] via-[#2F5D3F] to-[#3C7350] p-8 text-white shadow-[0_24px_60px_-25px_rgba(47,93,63,0.55)] md:p-12">
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
              className="mt-7 inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-medium text-[#2F5D3F] shadow-sm transition hover:bg-[#E8F1EA]"
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
    <section className="bg-[#FAFAF7] py-16">
      <div className="mx-auto max-w-6xl px-5">
        <div className="mb-8">
          <span className="text-xs font-medium uppercase tracking-wider text-[#6FA68A]">
            Quem atendemos
          </span>
          <h2 className="mt-2 max-w-xl text-2xl font-semibold tracking-tight text-[#1A2A22] md:text-3xl">
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
              className="flex h-full flex-col gap-3 rounded-3xl border border-[#E8F1EA] bg-white p-6"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#E8F1EA] text-[#2F5D3F]">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-[#1A2A22]">
                  {label}
                </h3>
                <p className="mt-1 text-xs text-[#1A2A22]/60">{sub}</p>
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
    <section className="border-t border-[#E8F1EA] bg-white py-16">
      <div className="mx-auto max-w-6xl px-5">
        <div className="text-center">
          <span className="text-xs font-medium uppercase tracking-wider text-[#6FA68A]">
            Quem confia
          </span>
          <h2 className="mx-auto mt-2 max-w-xl text-2xl font-semibold tracking-tight text-[#1A2A22] md:text-3xl">
            O que os clientes dizem.
          </h2>
        </div>
        <div className="mt-8">
          <Carousel ariaLabel="Depoimentos de clientes">
            {items.map((d, i) => (
              <article
                key={i}
                className="relative h-full rounded-3xl border border-[#E8F1EA] bg-[#FAFAF7] p-7"
              >
                <Quote className="h-7 w-7 text-[#6FA68A]/55" />
                <p className="mt-3 text-sm leading-relaxed text-[#1A2A22]/85">
                  "{d.quote}"
                </p>
                <p className="mt-5 text-xs font-medium uppercase tracking-wider text-[#2F5D3F]">
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
    <section className="bg-[#E8F1EA]/60">
      <div className="mx-auto max-w-3xl px-5 py-16 text-center">
        <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
          Quer conversar sobre o que faz sentido para o seu negócio?
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-base leading-relaxed text-[#1A2A22]/70">
          Cada operação tem um ritmo. A gente avalia o que sua unidade precisa e
          monta o pacote certo.
        </p>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/contato"
            className="inline-flex items-center gap-2 rounded-full bg-[#2F5D3F] px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-[#234731]"
          >
            Falar com a ProActive7
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            to="/perfil"
            className="inline-flex items-center gap-2 rounded-full border border-[#2F5D3F]/20 bg-white px-5 py-3 text-sm font-medium text-[#2F5D3F] hover:border-[#2F5D3F]/40"
          >
            Conhecer a empresa
          </Link>
        </div>
      </div>
    </section>
  );
}
