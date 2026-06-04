import { Link } from 'react-router-dom';
import {
  Leaf,
  ArrowRight,
  Hotel,
  Factory,
  Utensils,
  School,
  Croissant,
  ShoppingBasket,
  Apple,
  Building2,
  ShieldCheck,
  HeartHandshake,
  Repeat,
  Quote,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { usePageMeta } from '@/lib/usePageMeta';
import { Carousel } from '@/components/public/Carousel';

const SEGMENTOS: { icon: LucideIcon; label: string; sub: string }[] = [
  { icon: Hotel, label: 'Hotelaria', sub: 'On-shore e off-shore' },
  { icon: Factory, label: 'Indústrias', sub: 'Cozinhas industriais e PAT' },
  { icon: Utensils, label: 'Restaurantes', sub: 'À la carte e self-service' },
  { icon: School, label: 'Escolas e creches', sub: 'Merenda escolar' },
  { icon: Croissant, label: 'Padarias', sub: 'Produção e atendimento' },
  { icon: ShoppingBasket, label: 'Mercados', sub: 'Setor frio, FLV e padaria' },
  { icon: Apple, label: 'Hortifrutis', sub: 'Manipulação e validade' },
  { icon: Building2, label: 'Lanchonetes', sub: 'Fast food e quiosques' },
];

const DEPOIMENTOS = [
  {
    quote:
      'A Ariane traz para a cozinha o que a fiscalização espera ver. Em duas visitas, o restaurante saiu do papel para a prática.',
    author: 'Gerente de cozinha · Macaé',
  },
  {
    quote:
      'O olhar técnico mudou nosso processo de manipulação. Hoje temos POPs vivos, não só impressos na parede.',
    author: 'Nutricionista parceira',
  },
  {
    quote:
      'Profissional ética, comprometida e pró-ativa. A ProActive7 é hoje parte da nossa operação.',
    author: 'Diretor · Hotelaria off-shore',
  },
  {
    quote:
      'Conseguimos o CMVS sem dor de cabeça. Cuidaram da papelada e treinaram a equipe ao mesmo tempo.',
    author: 'Padaria · Imbetiba',
  },
  {
    quote:
      'A consultoria virou rotina: a equipe sabe exatamente o que fazer antes de cada visita da vigilância.',
    author: 'Supervisor · Indústria de alimentos',
  },
];

const MOTIVOS: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: ShieldCheck,
    title: 'Conformidade de verdade',
    body: 'Não é só papel na parede — é a operação rodando como a ANVISA exige, do recebimento ao descarte.',
  },
  {
    icon: HeartHandshake,
    title: 'Parceria comprometida',
    body: 'A ProActive7 entra como parte do time. Atitude pró-ativa, presença e resposta rápida.',
  },
  {
    icon: Repeat,
    title: 'Acompanhamento contínuo',
    body: 'Visitas periódicas, treinamentos recorrentes e revisão de documentos — segurança alimentar é processo, não evento.',
  },
];

export function ClientesPage() {
  usePageMeta('/clientes');
  return (
    <div>
      <Hero />
      <Segmentos />
      <Motivos />
      <Depoimentos />
      <CTA />
    </div>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-[#E8F1EA] bg-gradient-to-b from-[#E8F1EA] to-[#FAFAF7]">
      <div className="mx-auto max-w-6xl px-5 py-16 text-center md:py-20">
        <span className="inline-flex items-center gap-2 rounded-full border border-[#6FA68A]/40 bg-white px-3 py-1 text-xs font-medium text-[#2F5D3F]">
          <Leaf className="h-3.5 w-3.5" />
          Quem confia
        </span>
        <h1 className="mx-auto mt-4 max-w-3xl text-3xl font-semibold leading-[1.15] tracking-tight md:text-4xl">
          Estabelecimentos que confiam no nosso trabalho.
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-[#1A2A22]/70">
          Indústrias, restaurantes, hotéis, padarias, mercados, escolas,
          hortifrutis e operações on-shore e off-shore — em Macaé e região.
        </p>
      </div>
    </section>
  );
}

function Segmentos() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-16">
      <div className="mb-8">
        <span className="text-xs font-medium uppercase tracking-wider text-[#6FA68A]">
          Onde atuamos
        </span>
        <h2 className="mt-2 max-w-xl text-2xl font-semibold tracking-tight text-[#1A2A22] md:text-3xl">
          Segmentos atendidos pela ProActive7.
        </h2>
      </div>
      <Carousel
        ariaLabel="Segmentos atendidos"
        slideBasis="basis-[70%] sm:basis-1/2 lg:basis-1/4"
      >
        {SEGMENTOS.map(({ icon: Icon, label, sub }) => (
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
    </section>
  );
}

function Motivos() {
  return (
    <section className="bg-[#F2F7F3] py-16">
      <div className="mx-auto max-w-6xl px-5">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-medium uppercase tracking-wider text-[#6FA68A]">
            Por que confiam
          </span>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[#1A2A22] md:text-3xl">
            Mais que conformidade — tranquilidade na operação.
          </h2>
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {MOTIVOS.map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="rounded-2xl border border-[#E8F1EA] bg-white p-7"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#E8F1EA] text-[#2F5D3F]">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-[#1A2A22]">
                {title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[#1A2A22]/65">
                {body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Depoimentos() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-16">
      <div className="mb-8 text-center">
        <span className="text-xs font-medium uppercase tracking-wider text-[#6FA68A]">
          Depoimentos
        </span>
        <h2 className="mx-auto mt-2 max-w-xl text-2xl font-semibold tracking-tight text-[#1A2A22] md:text-3xl">
          O que dizem sobre o nosso trabalho.
        </h2>
      </div>
      <Carousel ariaLabel="Depoimentos de clientes">
        {DEPOIMENTOS.map((d, i) => (
          <article
            key={i}
            className="relative h-full rounded-3xl border border-[#E8F1EA] bg-white p-8 shadow-[0_18px_40px_-25px_rgba(47,93,63,0.18)]"
          >
            <Quote className="h-7 w-7 text-[#6FA68A]/55" />
            <p className="mt-4 text-base leading-relaxed text-[#1A2A22]/85">
              "{d.quote}"
            </p>
            <p className="mt-6 text-xs font-medium uppercase tracking-wider text-[#2F5D3F]">
              {d.author}
            </p>
          </article>
        ))}
      </Carousel>
    </section>
  );
}

function CTA() {
  return (
    <section className="relative isolate overflow-hidden bg-[#2F5D3F] text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-32 -top-32 h-80 w-80 rounded-full bg-[#6FA68A]/25 blur-3xl"
      />
      <div className="relative mx-auto max-w-3xl px-5 py-16 text-center md:py-20">
        <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
          Quer fazer parte de quem opera com segurança?
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-base leading-relaxed text-white/85">
          Converse com a ProActive7 e descubra o que a sua operação precisa
          para ficar em conformidade.
        </p>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/contato"
            className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-medium text-[#2F5D3F] transition hover:bg-white/95"
          >
            Falar com a ProActive7
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            to="/servicos"
            className="inline-flex items-center gap-2 rounded-full border border-white/30 px-6 py-3 text-sm font-medium text-white transition hover:border-white/60"
          >
            Ver serviços
          </Link>
        </div>
      </div>
    </section>
  );
}
