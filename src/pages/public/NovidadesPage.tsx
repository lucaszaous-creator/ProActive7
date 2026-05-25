import { Instagram, ArrowRight, Hash } from 'lucide-react';
import { usePageTitle } from '@/lib/usePageTitle';

interface Post {
  title: string;
  body: string;
  tags: string[];
  date: string;
  hue: string; // accent color for the card top
}

const POSTS: Post[] = [
  {
    title: 'Um erro comum na cozinha que pode contaminar alimentos sem ninguém perceber',
    body: 'Muitos problemas não acontecem por grandes falhas. Acontecem por pequenos hábitos repetidos todos os dias — exatamente nos detalhes que parecem "simples". É por isso que processo, treinamento e organização fazem tanta diferença na operação.',
    tags: ['SegurançaAlimentar', 'FoodServiceBrasil', 'BoasPraticas'],
    date: '4 dias atrás',
    hue: '#A8543A',
  },
  {
    title: 'O maior erro de muitos negócios de alimentação',
    body: 'É achar que o problema está no alimento — quando muitas vezes está no processo. Na maioria das vezes, os riscos começam muito antes do alimento chegar ao cliente: falta de padrão, fluxo errado, equipe sem orientação.',
    tags: ['SegurançaAlimentar', 'GestãoDeRestaurantes'],
    date: '6 dias atrás',
    hue: '#6FA68A',
  },
  {
    title: 'O cliente vê o prato. A qualidade começa muito antes dele',
    body: 'No setor de alimentação, excelência não acontece no improviso. Qualidade se constrói nos bastidores — em padrões, treinamentos e disciplina operacional.',
    tags: ['QualidadeAlimentar', 'FoodService'],
    date: '13 de maio',
    hue: '#2F5D3F',
  },
  {
    title: 'Seu negócio está pronto para uma fiscalização?',
    body: 'Faça esse checklist. Muitos negócios só percebem falhas nos processos quando a fiscalização chega. Mas segurança alimentar não deve funcionar no modo "correção" — ela precisa fazer parte da rotina operacional.',
    tags: ['SegurançaAlimentar', 'Checklist'],
    date: '11 de maio',
    hue: '#D4A857',
  },
  {
    title: 'Quando a organização transforma um negócio',
    body: 'Na prática, a diferença entre um negócio desorganizado e um estruturado está nos processos. Quando há padronização, a operação ganha fluidez, a equipe trabalha com mais segurança e o negócio se torna mais eficiente.',
    tags: ['Organização', 'GestãoDeRestaurantes'],
    date: '5 de maio',
    hue: '#6FA68A',
  },
  {
    title: 'Contaminação cruzada: o erro silencioso na sua cozinha',
    body: 'A contaminação cruzada acontece quando microrganismos são transferidos de um alimento, superfície ou utensílio para outro — geralmente sem percepção. Usar a mesma tábua para alimentos crus e prontos, não higienizar corretamente os utensílios e armazenar alimentos de forma inadequada são erros comuns.',
    tags: ['ContaminaçãoCruzada', 'BoasPraticas'],
    date: '4 de maio',
    hue: '#A8543A',
  },
];

const INSTAGRAM_URL = 'https://www.instagram.com/proactive.7/';

export function NovidadesPage() {
  usePageTitle('Novidades — ProActive7');
  return (
    <div>
      <Hero />
      <Feed />
      <Cta />
    </div>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-[#E8F1EA] bg-gradient-to-b from-[#E8F1EA] to-[#FAFAF7]">
      <div className="mx-auto max-w-6xl px-5 py-16 md:py-20">
        <div className="grid items-center gap-8 md:grid-cols-[1.2fr_1fr]">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-[#6FA68A]/40 bg-white px-3 py-1 text-xs font-medium text-[#2F5D3F]">
              <Instagram className="h-3.5 w-3.5" />
              Novidades
            </span>
            <h1 className="mt-4 text-3xl font-semibold leading-[1.15] tracking-tight md:text-4xl">
              Conteúdo prático para quem opera no{' '}
              <span className="text-[#2F5D3F]">food service</span>.
            </h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-[#1A2A22]/70">
              Dicas, alertas e bastidores da rotina de segurança alimentar.
              Acompanhe nossas publicações no Instagram{' '}
              <a
                href={INSTAGRAM_URL}
                target="_blank"
                rel="noreferrer"
                className="font-medium text-[#2F5D3F] hover:underline"
              >
                @proactive.7
              </a>
              .
            </p>
            <a
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noreferrer"
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#2F5D3F] px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-[#234731]"
            >
              Seguir no Instagram
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>
          <InstagramCard />
        </div>
      </div>
    </section>
  );
}

function InstagramCard() {
  return (
    <a
      href={INSTAGRAM_URL}
      target="_blank"
      rel="noreferrer"
      className="group relative block overflow-hidden rounded-3xl border border-[#E8F1EA] bg-white p-7 shadow-[0_24px_60px_-30px_rgba(47,93,63,0.25)] transition hover:shadow-[0_24px_60px_-15px_rgba(47,93,63,0.30)]"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[#6FA68A]/15 blur-3xl"
      />
      <div className="relative flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#A8543A] via-[#D4A857] to-[#6FA68A] text-white shadow-sm">
          <Instagram className="h-5 w-5" />
        </div>
        <div>
          <div className="text-[11px] font-medium uppercase tracking-wider text-[#1A2A22]/50">
            Instagram
          </div>
          <div className="text-base font-semibold text-[#1A2A22]">
            @proactive.7
          </div>
        </div>
      </div>
      <div className="relative mt-6 grid grid-cols-3 gap-1.5">
        {POSTS.slice(0, 9).map((p, i) => (
          <div
            key={i}
            className="aspect-square rounded-md"
            style={{ background: `${p.hue}22` }}
          />
        ))}
      </div>
      <div className="relative mt-5 text-xs text-[#1A2A22]/55">
        Toque para abrir o perfil →
      </div>
    </a>
  );
}

function Feed() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-16">
      <div className="mb-8 flex items-end justify-between gap-3">
        <div>
          <span className="text-xs font-medium uppercase tracking-wider text-[#6FA68A]">
            Publicações recentes
          </span>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">
            Últimos posts do nosso feed.
          </h2>
        </div>
        <a
          href={INSTAGRAM_URL}
          target="_blank"
          rel="noreferrer"
          className="hidden items-center gap-1.5 rounded-full border border-[#2F5D3F]/20 bg-white px-4 py-2 text-xs font-medium text-[#2F5D3F] transition hover:border-[#2F5D3F]/40 sm:inline-flex"
        >
          Ver todos
          <ArrowRight className="h-3.5 w-3.5" />
        </a>
      </div>
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {POSTS.map((p, idx) => (
          <PostCard key={idx} post={p} />
        ))}
      </div>
    </section>
  );
}

function PostCard({ post }: { post: Post }) {
  return (
    <a
      href={INSTAGRAM_URL}
      target="_blank"
      rel="noreferrer"
      className="group flex flex-col overflow-hidden rounded-2xl border border-[#E8F1EA] bg-white transition hover:border-[#6FA68A]/50 hover:shadow-[0_12px_30px_-15px_rgba(47,93,63,0.20)]"
    >
      <div
        className="relative h-44 overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${post.hue}25 0%, ${post.hue}10 100%)`,
        }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.6),transparent_60%)]"
        />
        <div className="absolute inset-0 flex items-center justify-center px-6 text-center">
          <p
            className="text-base font-semibold leading-snug tracking-tight"
            style={{ color: post.hue }}
          >
            {post.title}
          </p>
        </div>
        <span className="absolute right-3 top-3 inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/85 text-[#1A2A22]/55 backdrop-blur">
          <Instagram className="h-3.5 w-3.5" />
        </span>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <p className="line-clamp-3 text-sm leading-relaxed text-[#1A2A22]/70">
          {post.body}
        </p>
        <div className="mt-4 flex flex-wrap gap-1.5">
          {post.tags.slice(0, 3).map((t) => (
            <span
              key={t}
              className="inline-flex items-center gap-0.5 rounded-full bg-[#E8F1EA] px-2 py-0.5 text-[10px] font-medium text-[#2F5D3F]"
            >
              <Hash className="h-2.5 w-2.5" />
              {t}
            </span>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-between border-t border-[#E8F1EA] pt-3 text-[11px] text-[#1A2A22]/45">
          <span>{post.date}</span>
          <span className="text-[#2F5D3F] group-hover:underline">
            Ver no Instagram
          </span>
        </div>
      </div>
    </a>
  );
}

function Cta() {
  return (
    <section className="bg-[#E8F1EA]/60">
      <div className="mx-auto max-w-3xl px-5 py-16 text-center">
        <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
          Receba conteúdo direto do nosso dia a dia.
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-base leading-relaxed text-[#1A2A22]/70">
          Siga a ProActive7 no Instagram para acompanhar dicas, alertas e
          materiais práticos sobre segurança alimentar.
        </p>
        <a
          href={INSTAGRAM_URL}
          target="_blank"
          rel="noreferrer"
          className="mt-7 inline-flex items-center gap-2 rounded-full bg-[#2F5D3F] px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-[#234731]"
        >
          @proactive.7
          <Instagram className="h-4 w-4" />
        </a>
      </div>
    </section>
  );
}
