import { Link } from 'react-router-dom';
import { Leaf, ArrowRight, Construction } from 'lucide-react';
import { usePageMeta } from '@/lib/usePageMeta';

interface ComingSoonProps {
  badge: string;
  title: string;
  subtitle: string;
  /** Texto curto exibido no cartão central. */
  message?: string;
  /** Rota registrada em seo.config.json (ex.: '/cursos'). */
  seoPath: string;
}

export function ComingSoonPage({
  badge,
  title,
  subtitle,
  message,
  seoPath,
}: ComingSoonProps) {
  usePageMeta(seoPath);
  return (
    <div>
      <section className="relative overflow-hidden border-b border-[#e5e5e5] bg-gradient-to-b from-[#e5e5e5] to-[#fafafa]">
        <div className="mx-auto max-w-6xl px-5 py-16 text-center md:py-20">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#737373]/40 bg-white px-3 py-1 text-xs font-medium text-[#262626]">
            <Leaf className="h-3.5 w-3.5" />
            {badge}
          </span>
          <h1 className="mx-auto mt-4 max-w-3xl text-3xl font-semibold leading-[1.15] tracking-tight md:text-4xl">
            {title}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-[#171717]/70">
            {subtitle}
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-5 py-16">
        <div className="relative overflow-hidden rounded-3xl border border-[#e5e5e5] bg-white p-10 text-center shadow-[0_24px_60px_-30px_rgba(0,0,0,0.20)]">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[#737373]/15 blur-3xl"
          />
          <div className="relative">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#e5e5e5] text-[#262626]">
              <Construction className="h-6 w-6" />
            </div>
            <h2 className="mt-5 text-xl font-semibold text-[#171717]">
              Página em atualização
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-[#171717]/65">
              {message ??
                'Esta seção está sendo preparada. Em breve você verá aqui as novidades.'}
            </p>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
              <Link
                to="/contato"
                className="inline-flex items-center gap-2 rounded-full bg-[#262626] px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-[#404040]"
              >
                Falar com a equipe
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/servicos"
                className="inline-flex items-center gap-2 rounded-full border border-[#262626]/20 bg-white px-5 py-2.5 text-sm font-medium text-[#262626] hover:border-[#262626]/40"
              >
                Ver serviços
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export function CursosPage() {
  return (
    <ComingSoonPage
      seoPath="/cursos"
      badge="Cursos e treinamentos"
      title="Treinamentos para manipuladores e gestores."
      subtitle="Capacitação técnica, palestras e cursos práticos sobre boas práticas, segurança alimentar e legislação."
      message="A agenda de cursos está sendo atualizada. Entre em contato para conhecer treinamentos in-company e turmas fechadas."
    />
  );
}

export function ClientesPage() {
  return (
    <ComingSoonPage
      seoPath="/clientes"
      badge="Quem confia"
      title="Estabelecimentos que confiam no nosso trabalho."
      subtitle="Indústrias, restaurantes, hotéis, padarias, mercados, escolas, hortifrutis e operações on-shore e off-shore."
      message="A vitrine de clientes está sendo atualizada. Em breve você verá quem caminha com a ProActive7."
    />
  );
}
