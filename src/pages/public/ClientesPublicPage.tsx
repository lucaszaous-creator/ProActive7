import { Link } from 'react-router-dom';
import {
  Building2,
  Quote,
  MapPin,
  ExternalLink,
  MessageCircle,
  Hotel,
  GraduationCap,
  Factory,
  Croissant,
  Pizza,
  UtensilsCrossed,
  ShoppingCart,
  Leaf,
  PartyPopper,
  type LucideIcon,
} from 'lucide-react';
import { usePageMeta } from '@/lib/usePageMeta';
import { Reveal } from '@/components/public/Reveal';
import { Spotlight } from '@/components/public/Spotlight';
import { CLIENT_ROSTER, type DisplayClient } from '@/lib/clientRoster';
import { useSiteClients } from '@/lib/useSiteClients';
import { siteAssetUrl, type SiteClient } from '@/lib/siteCms';

/**
 * Ícone por segmento. A chave é o rótulo salvo em `site_clients.segment`,
 * derivado do próprio roster para os dois nunca saírem de sincronia. Um
 * segmento novo, criado pela nutri, cai no ícone genérico.
 */
const ICON_BY_KEY: Record<string, LucideIcon> = {
  hoteis: Hotel,
  escolas: GraduationCap,
  fabricas: Factory,
  padarias: Croissant,
  pizzarias: Pizza,
  restaurantes: UtensilsCrossed,
  mercados: ShoppingCart,
  saudavel: Leaf,
  buffet: PartyPopper,
};
const ICON_BY_LABEL = new Map<string, LucideIcon>(
  CLIENT_ROSTER.map((s) => [s.label, ICON_BY_KEY[s.key] ?? Building2]),
);

export function ClientesPublicPage() {
  usePageMeta('/clientes');
  const { groups, totals, testimonials } = useSiteClients();

  return (
    <div>
      <Hero />
      <Numeros
        brands={totals.brands}
        units={totals.units}
        segments={totals.segments}
      />

      {groups.map((g, i) => (
        <SegmentBlock
          key={g.label ?? '__sem_segmento__'}
          icon={g.label ? (ICON_BY_LABEL.get(g.label) ?? Building2) : Building2}
          label={g.label ?? 'Também acompanhamos'}
          clients={g.clients}
          alt={i % 2 === 1}
        />
      ))}

      {testimonials.length > 0 ? <Depoimentos clients={testimonials} /> : null}

      <CtaClientes />
    </div>
  );
}

function Hero() {
  return (
    <Spotlight className="fx-spotlight-ink fx-grain fx-grain-soft relative isolate overflow-hidden border-b border-[#e5e5e5] bg-white text-[#171717]">
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-[radial-gradient(70%_55%_at_50%_25%,#ffffff_0%,#fcfcfb_55%,#f0f0ee_100%)]"
      />
      <div aria-hidden className="fx-grid-ink absolute inset-0 -z-10" />
      <div className="relative z-[2] mx-auto max-w-6xl px-5 py-20 text-center md:py-24">
        <span className="inline-flex items-center gap-2 rounded-full border border-[#171717]/12 bg-white px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-[#171717]/65 shadow-sm">
          <Building2 className="h-3.5 w-3.5" />
          Quem confia na ProActive7
        </span>
        <h1 className="fx-shimmer-ink mx-auto mt-6 max-w-3xl text-3xl font-semibold leading-[1.1] tracking-tight md:text-5xl">
          Empresas que confiam no nosso trabalho
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-[#171717]/70">
          Hotéis, fábricas, escolas, padarias, pizzarias, mercados e buffets —
          operações de Macaé e região que contam com a nossa responsabilidade
          técnica para servir comida com segurança.
        </p>
      </div>
    </Spotlight>
  );
}

function Numeros({
  brands,
  units,
  segments,
}: {
  brands: number;
  units: number;
  segments: number;
}) {
  const stats = [
    { value: `${brands}`, label: 'marcas atendidas' },
    { value: `${units}`, label: 'unidades acompanhadas' },
    { value: `${segments}`, label: 'segmentos diferentes' },
    { value: '12+', label: 'anos de operação' },
  ];
  return (
    <section className="border-b border-[#e5e5e5] bg-white">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 px-5 py-12 md:grid-cols-4">
        {stats.map((s, i) => (
          <Reveal key={s.label} delay={i * 80}>
            <div className="text-center">
              <span
                aria-hidden
                className="mx-auto mb-3 block h-1 w-8 rounded-full bg-[#171717]"
              />
              <p className="text-3xl font-semibold tracking-tight text-[#171717] md:text-4xl">
                {s.value}
              </p>
              <p className="mt-1.5 text-xs uppercase tracking-wider text-[#737373]">
                {s.label}
              </p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/**
 * LogoCard — cartão de uma marca. O logo é `object-contain` com altura
 * limitada: as artes vieram da apresentação em resoluções bem diferentes
 * (algumas com 80px de altura), então nunca ampliamos além do confortável.
 * Sem logo, cai no monograma da inicial — nada de espaço vazio.
 */
function LogoCard({ client }: { client: DisplayClient }) {
  const inner = (
    <div className="fx-lift flex h-full flex-col items-center justify-start gap-3 rounded-2xl border border-[#e5e5e5] bg-white p-5 text-center">
      <div className="flex h-16 w-full items-center justify-center">
        {client.logo ? (
          <img
            src={client.logo}
            alt={client.name}
            loading="lazy"
            decoding="async"
            className="max-h-16 max-w-[86%] object-contain"
          />
        ) : (
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f0f0ee] text-lg font-semibold text-[#525252]">
            {client.name.charAt(0)}
          </span>
        )}
      </div>
      <p className="text-xs font-medium leading-snug text-[#1A2A22]/75">
        {client.name}
      </p>
      {client.units.length > 0 ? (
        <p className="mt-auto text-[11px] leading-snug text-[#171717]/50">
          {client.units.length} unidades · {client.units.join(' · ')}
        </p>
      ) : client.city ? (
        <p className="mt-auto text-[11px] leading-snug text-[#171717]/50">
          {client.city}
        </p>
      ) : null}
    </div>
  );
  if (!client.websiteUrl) return inner;
  return (
    <a
      href={client.websiteUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="block h-full"
    >
      {inner}
    </a>
  );
}

function SegmentBlock({
  icon: Icon,
  label,
  clients,
  alt,
}: {
  icon: LucideIcon;
  label: string;
  clients: DisplayClient[];
  alt: boolean;
}) {
  return (
    <section className={alt ? 'bg-[#f4f4f2]' : 'bg-[#fafafa]'}>
      <div className="mx-auto max-w-6xl px-5 py-12">
        <Reveal>
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[#e5e5e5] bg-white text-[#262626]">
              <Icon className="h-5 w-5" />
            </span>
            <h2 className="text-lg font-semibold tracking-tight text-[#171717] md:text-xl">
              {label}
            </h2>
            <span className="ml-auto text-xs uppercase tracking-wider text-[#737373]">
              {clients.length} {clients.length === 1 ? 'marca' : 'marcas'}
            </span>
          </div>
        </Reveal>

        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {clients.map((c, i) => (
            <Reveal key={c.key} delay={i * 45}>
              <LogoCard client={c} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function Depoimentos({ clients }: { clients: SiteClient[] }) {
  return (
    <section className="border-t border-[#e5e5e5] bg-[#fafafa]">
      <div className="mx-auto max-w-6xl px-5 py-16">
        <h2 className="text-center text-2xl font-semibold tracking-tight text-[#1A2A22]">
          O que dizem sobre o nosso trabalho
        </h2>
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          {clients.map((c, i) => {
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
                            {[c.segment, c.city].filter(Boolean).join(' · ')}
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
    </section>
  );
}

function CtaClientes() {
  return (
    <section className="border-t border-[#e5e5e5] bg-white">
      <div className="mx-auto max-w-6xl px-5 py-16">
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
            Falar com nossa Equipe
          </Link>
        </div>
      </div>
    </section>
  );
}
