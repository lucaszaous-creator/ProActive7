import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, Quote, MapPin, ExternalLink, MessageCircle } from 'lucide-react';
import { usePageMeta } from '@/lib/usePageMeta';
import { Reveal } from '@/components/public/Reveal';
import { Spotlight } from '@/components/public/Spotlight';
import { fetchPublicClients, siteAssetUrl, type SiteClient } from '@/lib/siteCms';

export function ClientesPublicPage() {
  usePageMeta('/clientes');
  const [clients, setClients] = useState<SiteClient[] | null>(null);

  useEffect(() => {
    fetchPublicClients()
      .then(setClients)
      .catch(() => setClients([]));
  }, []);

  const withTestimonial = (clients ?? []).filter((c) => c.testimonial);

  return (
    <div>
      {/* Hero */}
      <Spotlight className="fx-grain relative isolate overflow-hidden bg-[#111111] text-white">
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-[radial-gradient(60%_45%_at_50%_25%,#1f1f1f_0%,#111111_60%,#050505_100%)]"
        />
        <div aria-hidden className="fx-grid absolute inset-0 -z-10" />
        <div className="relative z-[2] mx-auto max-w-6xl px-5 py-20 text-center md:py-24">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-white/75 backdrop-blur">
            <Building2 className="h-3.5 w-3.5" />
            Quem confia na ProActive7
          </span>
          <h1 className="fx-shimmer mx-auto mt-6 max-w-3xl text-3xl font-semibold leading-[1.1] tracking-tight md:text-5xl">
            Cozinhas que servimos
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-white/75">
            Restaurantes, indústrias, hotelaria e serviços de alimentação que
            contam com a nossa responsabilidade técnica para operar em
            conformidade.
          </p>
        </div>
      </Spotlight>

      {/* Mural de logos */}
      <section className="mx-auto max-w-6xl px-5 py-16">
        {clients === null ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="fx-skeleton h-28 rounded-2xl" aria-hidden />
            ))}
          </div>
        ) : clients.length === 0 ? (
          <div className="mx-auto max-w-md rounded-3xl border border-dashed border-[#e5e5e5] bg-white px-6 py-16 text-center">
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#e5e5e5]">
              <Building2 className="fx-float h-7 w-7 text-[#525252]" />
            </span>
            <h2 className="mt-5 text-lg font-semibold text-[#1A2A22]">
              Em breve, nossos cases
            </h2>
            <p className="mt-2 text-sm text-[#1A2A22]/65">
              Estamos reunindo as histórias das cozinhas que acompanhamos. Quer
              ser uma delas?
            </p>
            <Link
              to="/contato"
              className="fx-sheen mt-6 inline-flex items-center gap-2 rounded-full bg-[#262626] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#404040]"
            >
              <MessageCircle className="h-4 w-4" />
              Falar com a Ariane
            </Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {clients.map((c, i) => {
                const logo = siteAssetUrl(c.logo_path);
                const inner = (
                  <div className="fx-lift flex h-28 flex-col items-center justify-center gap-2 rounded-2xl border border-[#e5e5e5] bg-white p-4 text-center">
                    {logo ? (
                      <img
                        src={logo}
                        alt={c.name}
                        loading="lazy"
                        className="max-h-12 max-w-[80%] object-contain"
                      />
                    ) : (
                      <Building2 className="h-7 w-7 text-[#9ca3af]" />
                    )}
                    <span className="line-clamp-1 text-xs font-medium text-[#1A2A22]/70">
                      {c.name}
                    </span>
                  </div>
                );
                return (
                  <Reveal key={c.id} delay={i * 50}>
                    {c.website_url ? (
                      <a
                        href={c.website_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block"
                      >
                        {inner}
                      </a>
                    ) : (
                      inner
                    )}
                  </Reveal>
                );
              })}
            </div>

            {/* Depoimentos */}
            {withTestimonial.length > 0 ? (
              <div className="mt-16">
                <h2 className="text-center text-2xl font-semibold tracking-tight text-[#1A2A22]">
                  O que dizem sobre o nosso trabalho
                </h2>
                <div className="mt-8 grid gap-6 md:grid-cols-2">
                  {withTestimonial.map((c, i) => {
                    const logo = siteAssetUrl(c.logo_path);
                    return (
                      <Reveal key={c.id} delay={i * 80}>
                        <figure className="fx-lift flex h-full flex-col rounded-2xl border border-[#e5e5e5] bg-white p-6 shadow-[0_20px_50px_-35px_rgba(0,0,0,0.3)]">
                          <Quote className="h-7 w-7 text-[#d4d4d4]" />
                          <blockquote className="mt-3 flex-1 text-base leading-relaxed text-[#1A2A22]/80">
                            “{c.testimonial}”
                          </blockquote>
                          <figcaption className="mt-5 flex items-center gap-3 border-t border-[#e5e5e5] pt-4">
                            <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[#e5e5e5] bg-white p-1">
                              {logo ? (
                                <img
                                  src={logo}
                                  alt=""
                                  className="h-full w-full object-contain"
                                />
                              ) : (
                                <Building2 className="h-5 w-5 text-[#9ca3af]" />
                              )}
                            </span>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-[#1A2A22]">
                                {c.name}
                              </p>
                              <p className="flex items-center gap-1 truncate text-xs text-[#1A2A22]/60">
                                {c.city ? (
                                  <>
                                    <MapPin className="h-3 w-3" />
                                    {[c.segment, c.city]
                                      .filter(Boolean)
                                      .join(' · ')}
                                  </>
                                ) : (
                                  c.segment
                                )}
                              </p>
                            </div>
                            {c.website_url ? (
                              <a
                                href={c.website_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="ml-auto text-[#525252] hover:text-[#262626]"
                                aria-label={`Visitar ${c.name}`}
                              >
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            ) : null}
                          </figcaption>
                        </figure>
                      </Reveal>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </>
        )}
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-5 pb-20">
        <div className="rounded-3xl border border-[#e5e5e5] bg-[#fafafa] px-6 py-12 text-center">
          <h2 className="text-2xl font-semibold tracking-tight text-[#1A2A22]">
            Sua cozinha pode ser a próxima
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-base leading-relaxed text-[#1A2A22]/70">
            Junte-se às operações que dormem tranquilas sabendo que estão em dia
            com a ANVISA.
          </p>
          <Link
            to="/contato"
            className="fx-sheen mt-6 inline-flex items-center gap-2 rounded-full bg-[#262626] px-6 py-3 text-sm font-medium text-white transition hover:bg-[#404040]"
          >
            <MessageCircle className="h-4 w-4" />
            Falar com a Ariane
          </Link>
        </div>
      </section>
    </div>
  );
}
