import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Instagram, ArrowRight, BookOpen } from 'lucide-react';
import { usePageMeta } from '@/lib/usePageMeta';
import { fetchPublishedArticles, type ArticleSummary } from '@/lib/articlesApi';
import { fetchInstagramPosts } from '@/lib/instagramApi';
import { InstagramFeed } from '@/components/InstagramFeed';

const INSTAGRAM_URL = 'https://www.instagram.com/proactive.7/';
const CARD_HUES = [
  '#A8543A',
  '#6FA68A',
  '#2F5D3F',
  '#D4A857',
  '#6FA68A',
  '#A8543A',
  '#2F5D3F',
  '#D4A857',
  '#6FA68A',
];

export function NovidadesPage() {
  usePageMeta('/novidades');
  return (
    <div>
      <Hero />
      <Articles />
      <Feed />
      <Cta />
    </div>
  );
}

function Articles() {
  const [articles, setArticles] = useState<ArticleSummary[]>([]);
  useEffect(() => {
    let active = true;
    fetchPublishedArticles()
      .then((a) => active && setArticles(a))
      .catch(() => active && setArticles([]));
    return () => {
      active = false;
    };
  }, []);
  if (!articles.length) return null;
  return (
    <section className="mx-auto max-w-6xl px-5 py-16">
      <div className="flex items-center gap-2 text-[#2F5D3F]">
        <BookOpen className="h-5 w-5" />
        <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
          Artigos
        </h2>
      </div>
      <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {articles.map((a) => (
          <Link
            key={a.slug}
            to={`/novidades/${a.slug}`}
            className="group flex flex-col rounded-2xl border border-[#E8F1EA] bg-white p-6 transition hover:border-[#6FA68A]/50 hover:shadow-[0_12px_30px_-15px_rgba(47,93,63,0.20)]"
          >
            <h3 className="text-lg font-semibold leading-snug text-[#1A2A22] group-hover:text-[#2F5D3F]">
              {a.title}
            </h3>
            <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-[#1A2A22]/70">
              {a.description}
            </p>
            <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-[#2F5D3F]">
              Ler artigo
              <ArrowRight className="h-4 w-4" />
            </span>
          </Link>
        ))}
      </div>
    </section>
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
        {CARD_HUES.map((hue, i) => (
          <div
            key={i}
            className="aspect-square rounded-md"
            style={{ background: `${hue}22` }}
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
  const [urls, setUrls] = useState<string[] | null>(null);
  useEffect(() => {
    let active = true;
    fetchInstagramPosts()
      .then((posts) => active && setUrls(posts.map((p) => p.url)))
      .catch(() => active && setUrls([]));
    return () => {
      active = false;
    };
  }, []);

  // Sem posts cadastrados ainda: não mostra a seção (o CTA de seguir
  // continua logo abaixo). Enquanto carrega, também fica oculto.
  if (!urls || urls.length === 0) return null;

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
      <InstagramFeed urls={urls} />
    </section>
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
