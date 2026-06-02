import { Link } from 'react-router-dom';
import {
  GraduationCap,
  Stethoscope,
  ClipboardCheck,
  Utensils,
  ChefHat,
  Stamp,
  Tag,
  BookOpen,
  ArrowRight,
} from 'lucide-react';
import { Plus } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { usePageMeta } from '@/lib/usePageMeta';
import seoConfig from '@/lib/seo.config.json';

const FAQ = (seoConfig.pages['/servicos'].faq ?? []) as {
  q: string;
  a: string;
}[];

interface Servico {
  icon: LucideIcon;
  title: string;
  body: string;
}

const SERVICOS: Servico[] = [
  {
    icon: GraduationCap,
    title: 'Treinamentos',
    body: 'Promovemos, com qualidade, uma maneira diferente de levar conhecimento técnico até os manipuladores de alimentos da sua operação.',
  },
  {
    icon: Stethoscope,
    title: 'Assessoria técnica periódica',
    body: 'Visitas e acompanhamento regulares garantem que as boas práticas de manipulação de alimentos estejam corretamente implantadas e aplicadas conforme a necessidade do seu estabelecimento.',
  },
  {
    icon: ClipboardCheck,
    title: 'Auditoria técnica pontual',
    body: 'Através das auditorias técnicas avaliamos se o estabelecimento está apto a produzir/fornecer produtos alimentícios com qualidade e segurança alimentar — auxiliando na regularização junto à legislação da ANVISA.',
  },
  {
    icon: Utensils,
    title: 'Responsabilidade técnica / PAT',
    body: 'O PAT (Programa de Alimentação do Trabalhador) é uma iniciativa do governo para proporcionar mais qualidade na alimentação de trabalhadores. Auxiliamos na implantação e manutenção do programa na sua empresa.',
  },
  {
    icon: ChefHat,
    title: 'Cardápios e fichas técnicas',
    body: 'Criação, implementação e revisão de cardápios e fichas técnicas de cada preparação do seu estabelecimento — com padronização e custo calculado.',
  },
  {
    icon: Stamp,
    title: 'CMVS — Cadastro Municipal de Vigilância em Saúde',
    body: 'Auxiliamos na obtenção do CMVS do seu estabelecimento, conduzindo o processo de documentação e atendendo às exigências municipais.',
  },
  {
    icon: Tag,
    title: 'Informação nutricional',
    body: 'Todos os alimentos fabricados e embalados para venda devem ter rótulo nutricional elaborado e assinado por nutricionista especializada — nossa equipe entrega isso para você dentro da legislação vigente.',
  },
  {
    icon: BookOpen,
    title: 'Manuais de Boas Práticas e POPs',
    body: 'Manual de boas práticas personalizado, respeitando as peculiaridades do seu ramo e negócio. Os POPs (Procedimentos Operacionais Padronizados) orientam o manipulador no dia a dia da operação.',
  },
];

export function ServicosPage() {
  usePageMeta('/servicos');
  return (
    <div>
      <Hero />
      <Grid />
      <Faq />
      <CTA />
    </div>
  );
}

function Faq() {
  if (!FAQ.length) return null;
  return (
    <section className="border-t border-[#E8F1EA] bg-white">
      <div className="mx-auto max-w-3xl px-5 py-16">
        <div className="text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#6FA68A]/40 bg-white px-3 py-1 text-xs font-medium text-[#2F5D3F]">
            Perguntas frequentes
          </span>
          <h2 className="mt-4 text-2xl font-semibold tracking-tight md:text-3xl">
            Dúvidas comuns sobre consultoria e ANVISA
          </h2>
        </div>
        <div className="mt-8 divide-y divide-[#E8F1EA] overflow-hidden rounded-2xl border border-[#E8F1EA]">
          {FAQ.map(({ q, a }) => (
            <details key={q} className="group bg-white open:bg-[#FAFAF7]">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-5 text-left text-base font-medium text-[#1A2A22] [&::-webkit-details-marker]:hidden">
                {q}
                <Plus className="h-5 w-5 shrink-0 text-[#2F5D3F] transition-transform group-open:rotate-45" />
              </summary>
              <p className="px-6 pb-5 text-sm leading-relaxed text-[#1A2A22]/70">
                {a}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-[#E8F1EA] bg-gradient-to-b from-[#E8F1EA] to-[#FAFAF7]">
      <div className="mx-auto max-w-6xl px-5 py-16 text-center md:py-20">
        <span className="inline-flex items-center gap-2 rounded-full border border-[#6FA68A]/40 bg-white px-3 py-1 text-xs font-medium text-[#2F5D3F]">
          Nossos serviços
        </span>
        <h1 className="mx-auto mt-4 max-w-3xl text-3xl font-semibold leading-[1.15] tracking-tight md:text-4xl">
          O que entregamos para a sua operação.
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-[#1A2A22]/70">
          Listamos abaixo os serviços oferecidos e alguns detalhes — todos
          alinhados às legislações federais, estaduais e municipais vigentes.
        </p>
      </div>
    </section>
  );
}

function Grid() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-16">
      <div className="grid gap-5 md:grid-cols-2">
        {SERVICOS.map(({ icon: Icon, title, body }, idx) => (
          <article
            key={title}
            className="group relative overflow-hidden rounded-2xl border border-[#E8F1EA] bg-white p-7 transition hover:border-[#6FA68A]/50 hover:shadow-[0_12px_30px_-15px_rgba(47,93,63,0.20)]"
          >
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#E8F1EA] text-[#2F5D3F]">
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#6FA68A]">
                  {String(idx + 1).padStart(2, '0')}
                </span>
                <h3 className="mt-0.5 text-base font-semibold leading-snug text-[#1A2A22]">
                  {title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-[#1A2A22]/70">
                  {body}
                </p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section className="bg-[#E8F1EA]/60">
      <div className="mx-auto max-w-3xl px-5 py-16 text-center">
        <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
          Quer conversar sobre o que faz sentido para o seu negócio?
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-base leading-relaxed text-[#1A2A22]/70">
          Cada operação tem um ritmo. A gente avalia o que sua unidade precisa e
          monta o pacote certo.
        </p>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/contato"
            className="inline-flex items-center gap-2 rounded-full bg-[#2F5D3F] px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-[#234731]"
          >
            Falar com a ProActive7
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            to="/perfil"
            className="inline-flex items-center gap-2 rounded-full border border-[#2F5D3F]/20 bg-white px-5 py-3 text-sm font-medium text-[#2F5D3F] hover:border-[#2F5D3F]/40"
          >
            Conhecer a empresa
          </Link>
        </div>
      </div>
    </section>
  );
}
