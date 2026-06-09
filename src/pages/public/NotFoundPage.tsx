import { Link } from 'react-router-dom';
import { Leaf, ArrowRight, Home, Compass } from 'lucide-react';
import { usePageMeta } from '@/lib/usePageMeta';

export function NotFoundPage() {
  usePageMeta('/404');
  return (
    <section className="mx-auto flex max-w-2xl flex-col items-center px-5 py-24 text-center">
      <span className="inline-flex items-center gap-2 rounded-full border border-[#737373]/40 bg-white px-3 py-1 text-xs font-medium text-[#262626]">
        <Leaf className="h-3.5 w-3.5" />
        Erro 404
      </span>
      <h1 className="mt-5 text-4xl font-semibold tracking-tight text-[#171717] md:text-5xl">
        Página não encontrada
      </h1>
      <p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-[#171717]/70">
        O endereço que você acessou não existe ou foi movido. Use os atalhos
        abaixo para continuar navegando.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          to="/"
          className="inline-flex items-center gap-2 rounded-full bg-[#262626] px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-[#404040]"
        >
          <Home className="h-4 w-4" />
          Ir para a página inicial
        </Link>
        <Link
          to="/servicos"
          className="inline-flex items-center gap-2 rounded-full border border-[#262626]/20 bg-white px-5 py-3 text-sm font-medium text-[#262626] hover:border-[#262626]/40"
        >
          <Compass className="h-4 w-4" />
          Ver serviços
        </Link>
        <Link
          to="/contato"
          className="inline-flex items-center gap-2 rounded-full border border-[#262626]/20 bg-white px-5 py-3 text-sm font-medium text-[#262626] hover:border-[#262626]/40"
        >
          Falar com a equipe
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}
