import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Instagram,
  ArrowRight,
  BookOpen,
  ShieldCheck,
  Bug,
  Thermometer,
  Tag,
  ClipboardCheck,
  GraduationCap,
} from 'lucide-react';
import { usePageMeta } from '@/lib/usePageMeta';
import { fetchPublishedArticles, type ArticleSummary } from '@/lib/articlesApi';
import { ElfsightWidget } from '@/components/public/ElfsightWidget';
import { Reveal } from '@/components/public/Reveal';

const INSTAGRAM_URL = 'https://www.instagram.com/proactive.7/';

// UUID do widget configurado no painel do Elfsight (Instagram Feed).
// Default = widget @proactive.7; pode ser sobrescrito por env var.
// Sem nenhum dos dois, exibimos o fallback "Feed em breve".
const ELFSIGHT_INSTAGRAM_APP_ID =
  import.meta.env.VITE_ELFSIGHT_INSTAGRAM_APP_ID ||
  'f1cf91c7-c7dc-4219-90c6-d5eb4b6f5ac9';

export function NovidadesPage() {
  usePageMeta('/novidades');
  return (
    <div>
      <Hero />
      <Temas />
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
      <div className="flex items-center gap-2 text-[#262626]">
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
            className="group flex flex-col rounded-2xl border border-[#e5e5e5] bg-white p-6 transition hover:border-[#737373]/50 hover:shadow-[0_12px_30px_-15px_rgba(0,0,0,0.20)]"
          >
            <h3 className="text-lg font-semibold leading-snug text-[#171717] group-hover:text-[#262626]">
              {a.title}
            </h3>
            <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-[#171717]/70">
              {a.description}
            </p>
            <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-[#262626]">
              Ler artigo
              <ArrowRight className="h-4 w-4" />
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

/**
 * Temas recorrentes do conteúdo — dá ao visitante uma noção do que
 * encontra (mesmo antes de haver muitos posts/artigos) e mostra domínio
 * técnico. Preenche o espaço entre o hero e os artigos.
 */
function Temas() {
  const temas = [
    {
      icon: ShieldCheck,
      title: 'Boas práticas (RDC 216)',
      body: 'O que a fiscalização espera ver na manipulação de alimentos.',
    },
    {
      icon: Thermometer,
      title: 'Controle de temperatura',
      body: 'Cadeia de frio, cocção e o registro que comprova segurança.',
    },
    {
      icon: Bug,
      title: 'Controle de pragas',
      body: 'Prevenção, monitoramento e documentação exigida.',
    },
    {
      icon: Tag,
      title: 'Etiquetagem e validade',
      body: 'Datas, lotes e rastreabilidade sem erro na cozinha.',
    },
    {
      icon: ClipboardCheck,
      title: 'Auditorias e não-conformidades',
      body: 'Como avaliar e corrigir o que sai da conformidade.',
    },
    {
      icon: GraduationCap,
      title: 'Treinamento de equipe',
      body: 'Capacitar manipuladores e criar cultura de segurança.',
    },
  ];
  return (
    <section className="mx-auto max-w-6xl px-5 py-16">
      <Reveal>
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-medium uppercase tracking-wider text-[#737373]">
            O que abordamos
          </span>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[#171717] md:text-3xl">
            Temas que ajudam a sua operação no dia a dia.
          </h2>
        </div>
      </Reveal>
      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {temas.map(({ icon: Icon, title, body }, i) => (
          <Reveal key={title} delay={(i % 3) * 90}>
            <div className="group flex h-full gap-4 rounded-2xl border border-[#e5e5e5] bg-white p-6 transition hover:border-[#737373]/50 hover:shadow-[0_12px_30px_-15px_rgba(0,0,0,0.20)]">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#e5e5e5] text-[#262626]">
                <Icon className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-sm font-semibold text-[#171717]">{title}</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-[#171717]/65">
                  {body}
                </p>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-[#e5e5e5] bg-gradient-to-b from-[#e5e5e5] to-[#fafafa]">
      <div className="mx-auto max-w-6xl px-5 py-16 md:py-20">
        <div className="grid items-center gap-8 md:grid-cols-[1.2fr_1fr]">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-[#737373]/40 bg-white px-3 py-1 text-xs font-medium text-[#262626]">
              <Instagram className="h-3.5 w-3.5" />
              Novidades
            </span>
            <h1 className="mt-4 text-3xl font-semibold leading-[1.15] tracking-tight md:text-4xl">
              Conteúdo prático para quem opera no{' '}
              <span className="text-[#262626]">food service</span>.
            </h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-[#171717]/70">
              Dicas, alertas e bastidores da rotina de segurança alimentar.
              Acompanhe nossas publicações no Instagram{' '}
              <a
                href={INSTAGRAM_URL}
                target="_blank"
                rel="noreferrer"
                className="font-medium text-[#262626] hover:underline"
              >
                @proactive.7
              </a>
              .
            </p>
            <a
              href={INSTAGRAM_URL}
              target="_blank"
              rel="noreferrer"
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#262626] px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-[#404040]"
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
  const tiles = [
    { icon: ShieldCheck, grad: 'from-[#262626] to-[#525252]' },
    { icon: Thermometer, grad: 'from-[#525252] to-[#737373]' },
    { icon: Tag, grad: 'from-[#404040] to-[#262626]' },
    { icon: Bug, grad: 'from-[#737373] to-[#525252]' },
    { icon: ClipboardCheck, grad: 'from-[#262626] to-[#171717]' },
    { icon: GraduationCap, grad: 'from-[#525252] to-[#262626]' },
  ];
  return (
    <a
      href={INSTAGRAM_URL}
      target="_blank"
      rel="noreferrer"
      className="group relative block overflow-hidden rounded-3xl border border-[#e5e5e5] bg-white p-7 shadow-[0_24px_60px_-30px_rgba(0,0,0,0.25)] transition hover:shadow-[0_24px_60px_-15px_rgba(0,0,0,0.30)]"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[#737373]/15 blur-3xl"
      />
      <div className="relative flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#A8543A] via-[#D4A857] to-[#737373] text-white shadow-sm">
          <Instagram className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="text-base font-semibold leading-tight text-[#171717]">
            @proactive.7
          </div>
          <div className="text-[11px] font-medium text-[#171717]/50">
            Perfil oficial · Macaé / RJ
          </div>
        </div>
        <span className="ml-auto rounded-full bg-[#262626] px-3 py-1.5 text-xs font-medium text-white">
          Seguir
        </span>
      </div>

      {/* Grade temática (gradiente da marca + ícone) — substitui os
          quadrados vazios por algo intencional. O feed ao vivo aparece
          logo abaixo, na seção "Publicações recentes". */}
      <div className="relative mt-6 grid grid-cols-3 gap-2">
        {tiles.map(({ icon: Icon, grad }, i) => (
          <div
            key={i}
            className={`flex aspect-square items-center justify-center rounded-xl bg-gradient-to-br ${grad} text-white/90 shadow-sm transition group-hover:scale-[1.03]`}
          >
            <Icon className="h-6 w-6" />
          </div>
        ))}
      </div>

      <div className="relative mt-5 flex items-center gap-1.5 text-xs font-medium text-[#262626]">
        Ver o feed ao vivo
        <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
      </div>
    </a>
  );
}

function Feed() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-16">
      <div className="mb-8 flex items-end justify-between gap-3">
        <div>
          <span className="text-xs font-medium uppercase tracking-wider text-[#737373]">
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
          className="hidden items-center gap-1.5 rounded-full border border-[#262626]/20 bg-white px-4 py-2 text-xs font-medium text-[#262626] transition hover:border-[#262626]/40 sm:inline-flex"
        >
          Ver todos
          <ArrowRight className="h-3.5 w-3.5" />
        </a>
      </div>

      <ElfsightWidget
        appId={ELFSIGHT_INSTAGRAM_APP_ID}
        fallback={<FeedFallback />}
        className="overflow-hidden rounded-3xl"
      />
    </section>
  );
}

/**
 * Mostrado quando o widget do Elfsight ainda não está configurado
 * (VITE_ELFSIGHT_INSTAGRAM_APP_ID vazio). Mantém a página apresentável
 * em vez de um espaço em branco.
 */
function FeedFallback() {
  return (
    <div className="flex flex-col items-center gap-4 rounded-3xl border border-dashed border-[#e5e5e5] bg-white px-6 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#A8543A] via-[#D4A857] to-[#737373] text-white">
        <Instagram className="h-5 w-5" />
      </div>
      <div>
        <p className="text-base font-semibold text-[#171717]">
          Feed do Instagram em breve.
        </p>
        <p className="mt-1 max-w-md text-sm text-[#171717]/65">
          Enquanto isso, acompanhe nossas publicações direto no perfil.
        </p>
      </div>
      <a
        href={INSTAGRAM_URL}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-2 rounded-full bg-[#262626] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#404040]"
      >
        Abrir @proactive.7
        <ArrowRight className="h-4 w-4" />
      </a>
    </div>
  );
}

function Cta() {
  return (
    <section className="bg-[#e5e5e5]/60">
      <div className="mx-auto max-w-3xl px-5 py-16 text-center">
        <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
          Receba conteúdo direto do nosso dia a dia.
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-base leading-relaxed text-[#171717]/70">
          Siga a ProActive7 no Instagram para acompanhar dicas, alertas e
          materiais práticos sobre segurança alimentar.
        </p>
        <a
          href={INSTAGRAM_URL}
          target="_blank"
          rel="noreferrer"
          className="mt-7 inline-flex items-center gap-2 rounded-full bg-[#262626] px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-[#404040]"
        >
          @proactive.7
          <Instagram className="h-4 w-4" />
        </a>
      </div>
    </section>
  );
}
