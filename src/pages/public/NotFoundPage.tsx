import { Link } from 'react-router-dom';
import { Leaf, ArrowRight, Home, Compass } from 'lucide-react';
import { usePageMeta } from '@/lib/usePageMeta';

export function NotFoundPage() {
  usePageMeta('/404');
  return (
    <section className="mx-auto flex max-w-2xl flex-col items-center px-5 py-24 text-center">
      <span className="inline-flex items-center gap-2 rounded-full border border-[#6FA68A]/40 bg-white px-3 py-1 text-xs font-medium text-[#2F5D3F]">
        <Leaf className="h-3.5 w-3.5" />
        Erro 404
      </span>
      <h1 className="mt-5 text-4xl font-semibold tracking-tight text-[#1A2A22] md:text-5xl">
        Página não encontrada
      </h1>
      <p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-[#1A2A22]/70">
        O endereço que você acessou não existe ou foi movido. Use os atalhos
        abaixo para continuar navegando.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          to="/"
          className="inline-flex items-center gap-2 rounded-full bg-[#2F5D3F] px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-[#234731]"
        >
          <Home className="h-4 w-4" />
          Ir para a página inicial
        </Link>
        <Link
          to="/servicos"
          className="inline-flex items-center gap-2 rounded-full border border-[#2F5D3F]/20 bg-white px-5 py-3 text-sm font-medium text-[#2F5D3F] hover:border-[#2F5D3F]/40"
        >
          <Compass className="h-4 w-4" />
          Ver serviços
        </Link>
        <Link
          to="/contato"
          className="inline-flex items-center gap-2 rounded-full border border-[#2F5D3F]/20 bg-white px-5 py-3 text-sm font-medium text-[#2F5D3F] hover:border-[#2F5D3F]/40"
        >
          Falar com a equipe
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}
