import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  GraduationCap,
  Clock,
  Users,
  Tag,
  ArrowRight,
  MessageCircle,
} from 'lucide-react';
import { usePageMeta } from '@/lib/usePageMeta';
import { Reveal } from '@/components/public/Reveal';
import { Spotlight } from '@/components/public/Spotlight';
import {
  fetchPublicCourses,
  siteAssetUrl,
  type SiteCourse,
} from '@/lib/siteCms';

export function CursosPublicPage() {
  usePageMeta('/cursos');
  const [courses, setCourses] = useState<SiteCourse[] | null>(null);

  useEffect(() => {
    fetchPublicCourses()
      .then(setCourses)
      .catch(() => setCourses([]));
  }, []);

  return (
    <div>
      {/* Hero */}
      <Spotlight className="fx-spotlight-ink fx-grain fx-grain-soft relative isolate overflow-hidden border-b border-[#e5e5e5] bg-white text-[#171717]">
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-[radial-gradient(70%_55%_at_50%_25%,#ffffff_0%,#fcfcfb_55%,#f0f0ee_100%)]"
        />
        <div aria-hidden className="fx-grid-ink absolute inset-0 -z-10" />
        <div className="relative z-[2] mx-auto max-w-6xl px-5 py-20 text-center md:py-24">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#171717]/12 bg-white px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-[#171717]/65 shadow-sm">
            <GraduationCap className="h-3.5 w-3.5" />
            Cursos e treinamentos
          </span>
          <h1 className="fx-shimmer-ink mx-auto mt-6 max-w-3xl text-3xl font-semibold leading-[1.1] tracking-tight md:text-5xl">
            Capacitação em segurança alimentar
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-[#171717]/70">
            Treinamentos práticos em boas práticas de manipulação, conduzidos
            pela responsável técnica — para equipes que servem comida com
            segurança todos os dias.
          </p>
        </div>
      </Spotlight>

      {/* Lista */}
      <section className="mx-auto max-w-6xl px-5 py-16">
        {courses === null ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="fx-skeleton h-72 rounded-2xl"
                aria-hidden
              />
            ))}
          </div>
        ) : courses.length === 0 ? (
          <div className="mx-auto max-w-md rounded-3xl border border-dashed border-[#e5e5e5] bg-white px-6 py-16 text-center">
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#e5e5e5]">
              <GraduationCap className="fx-float h-7 w-7 text-[#525252]" />
            </span>
            <h2 className="mt-5 text-lg font-semibold text-[#1A2A22]">
              Novos cursos em breve
            </h2>
            <p className="mt-2 text-sm text-[#1A2A22]/65">
              Estamos preparando a próxima turma. Fale com a gente para ser
              avisado e levar o treinamento à sua equipe.
            </p>
            <Link
              to="/contato"
              className="fx-sheen mt-6 inline-flex items-center gap-2 rounded-full bg-[#262626] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#404040]"
            >
              <MessageCircle className="h-4 w-4" />
              Quero ser avisado
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {courses.map((c, i) => {
              const img = siteAssetUrl(c.image_path);
              return (
                <Reveal key={c.id} delay={i * 80}>
                  <article className="fx-lift group flex h-full flex-col overflow-hidden rounded-2xl border border-[#e5e5e5] bg-white shadow-[0_20px_50px_-35px_rgba(0,0,0,0.3)]">
                    <div className="relative aspect-[16/10] overflow-hidden bg-[#e5e5e5]">
                      {img ? (
                        <img
                          src={img}
                          alt={c.title}
                          loading="lazy"
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#f0f0ee] to-[#e0e0dd]">
                          <GraduationCap className="h-10 w-10 text-[#737373]" />
                        </div>
                      )}
                    </div>
                    <div className="flex flex-1 flex-col p-5">
                      <h3 className="text-lg font-semibold tracking-tight text-[#1A2A22]">
                        {c.title}
                      </h3>
                      {c.summary ? (
                        <p className="mt-1.5 text-sm font-medium text-[#525252]">
                          {c.summary}
                        </p>
                      ) : null}
                      {c.description ? (
                        <p className="mt-3 text-sm leading-relaxed text-[#1A2A22]/70">
                          {c.description}
                        </p>
                      ) : null}

                      <div className="mt-4 flex flex-wrap gap-2">
                        {c.duration ? (
                          <Badge icon={Clock}>{c.duration}</Badge>
                        ) : null}
                        {c.level ? <Badge icon={Users}>{c.level}</Badge> : null}
                        {c.price_label ? (
                          <Badge icon={Tag}>{c.price_label}</Badge>
                        ) : null}
                      </div>

                      <div className="mt-5 flex-1" />
                      {c.cta_url ? (
                        <a
                          href={c.cta_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="fx-sheen inline-flex items-center justify-center gap-2 rounded-full bg-[#262626] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#404040]"
                        >
                          Quero me inscrever
                          <ArrowRight className="h-4 w-4" />
                        </a>
                      ) : (
                        <Link
                          to="/contato"
                          className="inline-flex items-center justify-center gap-2 rounded-full border border-[#e5e5e5] px-4 py-2.5 text-sm font-medium text-[#262626] transition hover:bg-[#fafafa]"
                        >
                          Saber mais
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      )}
                    </div>
                  </article>
                </Reveal>
              );
            })}
          </div>
        )}
      </section>

      {/* CTA final */}
      <section className="mx-auto max-w-6xl px-5 pb-20">
        <div className="rounded-3xl border border-[#e5e5e5] bg-[#fafafa] px-6 py-12 text-center">
          <h2 className="text-2xl font-semibold tracking-tight text-[#1A2A22]">
            Treinamento in-company para sua equipe
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-base leading-relaxed text-[#1A2A22]/70">
            Levamos a capacitação até a sua cozinha, adequada à realidade da sua
            operação e às exigências da ANVISA.
          </p>
          <Link
            to="/contato"
            className="fx-sheen mt-6 inline-flex items-center gap-2 rounded-full bg-[#262626] px-6 py-3 text-sm font-medium text-white transition hover:bg-[#404040]"
          >
            <MessageCircle className="h-4 w-4" />
            Falar com nossa Equipe
          </Link>
        </div>
      </section>
    </div>
  );
}

function Badge({
  icon: Icon,
  children,
}: {
  icon: typeof Clock;
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[#e5e5e5] bg-[#fafafa] px-3 py-1 text-xs font-medium text-[#1A2A22]/75">
      <Icon className="h-3.5 w-3.5 text-[#525252]" />
      {children}
    </span>
  );
}
