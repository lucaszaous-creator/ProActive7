import { Link } from 'react-router-dom';
import {
  Leaf,
  ArrowRight,
  GraduationCap,
  Utensils,
  Thermometer,
  Bug,
  ClipboardCheck,
  HandPlatter,
  Sparkles,
  Users,
  Building2,
  Award,
  MessageCircle,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { usePageMeta } from '@/lib/usePageMeta';
import { Carousel } from '@/components/public/Carousel';

const CURSOS: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: HandPlatter,
    title: 'Boas práticas de manipulação',
    body: 'Higiene pessoal, contaminação cruzada e fluxo de produção — o treinamento base exigido pela RDC 216.',
  },
  {
    icon: Thermometer,
    title: 'Controle de temperatura',
    body: 'Recebimento, armazenamento, cocção e resfriamento dentro das faixas seguras, com registro correto.',
  },
  {
    icon: Utensils,
    title: 'Higienização de ambientes',
    body: 'Procedimentos de limpeza e sanitização de superfícies, utensílios e equipamentos.',
  },
  {
    icon: Bug,
    title: 'Controle integrado de pragas',
    body: 'Prevenção, monitoramento e boas práticas para manter a operação livre de pragas.',
  },
  {
    icon: ClipboardCheck,
    title: 'Preparação para auditorias',
    body: 'O que a vigilância sanitária avalia e como manter a documentação e a rotina sempre prontas.',
  },
  {
    icon: GraduationCap,
    title: 'Capacitação de gestores',
    body: 'Liderança em segurança alimentar: como cobrar, registrar e manter a equipe engajada.',
  },
];

const FORMATOS: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: Building2,
    title: 'In-company',
    body: 'Levamos o treinamento até a sua cozinha, com exemplos do seu próprio dia a dia.',
  },
  {
    icon: Users,
    title: 'Turmas fechadas',
    body: 'Capacitação para grupos de manipuladores ou gestores, com material e certificado.',
  },
  {
    icon: Award,
    title: 'Certificação',
    body: 'Emissão de certificado de participação para comprovar a capacitação da equipe.',
  },
];

export function CursosPage() {
  usePageMeta('/cursos');
  return (
    <div>
      <Hero />
      <Catalogo />
      <Formatos />
      <CTA />
    </div>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-[#E8F1EA] bg-gradient-to-b from-[#E8F1EA] to-[#FAFAF7]">
      <div className="mx-auto max-w-6xl px-5 py-16 text-center md:py-20">
        <span className="inline-flex items-center gap-2 rounded-full border border-[#6FA68A]/40 bg-white px-3 py-1 text-xs font-medium text-[#2F5D3F]">
          <Leaf className="h-3.5 w-3.5" />
          Cursos e treinamentos
        </span>
        <h1 className="mx-auto mt-4 max-w-3xl text-3xl font-semibold leading-[1.15] tracking-tight md:text-4xl">
          Capacitação técnica para quem manipula alimentos.
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-[#1A2A22]/70">
          Treinamentos práticos sobre boas práticas, segurança alimentar e
          legislação — para manipuladores e gestores da sua operação.
        </p>
      </div>
    </section>
  );
}

function Catalogo() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-16">
      <div className="mb-8 text-center">
        <span className="text-xs font-medium uppercase tracking-wider text-[#6FA68A]">
          Temas
        </span>
        <h2 className="mx-auto mt-2 max-w-xl text-2xl font-semibold tracking-tight text-[#1A2A22] md:text-3xl">
          Treinamentos que cabem na rotina da cozinha.
        </h2>
      </div>
      <Carousel ariaLabel="Temas de treinamento">
        {CURSOS.map(({ icon: Icon, title, body }) => (
          <article
            key={title}
            className="group h-full rounded-2xl border border-[#E8F1EA] bg-white p-6 transition hover:border-[#6FA68A]/50 hover:shadow-[0_12px_30px_-15px_rgba(47,93,63,0.20)]"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#E8F1EA] text-[#2F5D3F]">
              <Icon className="h-5 w-5" />
            </div>
            <h3 className="mt-4 text-base font-semibold text-[#1A2A22]">
              {title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-[#1A2A22]/65">
              {body}
            </p>
          </article>
        ))}
      </Carousel>
    </section>
  );
}

function Formatos() {
  return (
    <section className="bg-[#F2F7F3] py-16">
      <div className="mx-auto max-w-6xl px-5">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-medium uppercase tracking-wider text-[#6FA68A]">
            Como entregamos
          </span>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[#1A2A22] md:text-3xl">
            No formato que faz sentido para a sua equipe.
          </h2>
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {FORMATOS.map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="rounded-2xl border border-[#E8F1EA] bg-white p-7"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#E8F1EA] text-[#2F5D3F]">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-[#1A2A22]">
                {title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[#1A2A22]/65">
                {body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section className="relative isolate overflow-hidden bg-[#2F5D3F] text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute -left-32 -bottom-32 h-80 w-80 rounded-full bg-[#A8D96A]/15 blur-3xl"
      />
      <div className="relative mx-auto max-w-3xl px-5 py-16 text-center md:py-20">
        <Sparkles className="mx-auto h-9 w-9 text-[#A8D96A]" />
        <h2 className="mt-4 text-2xl font-semibold tracking-tight md:text-3xl">
          Quer capacitar a sua equipe?
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-base leading-relaxed text-white/85">
          Monte uma turma in-company ou fechada. A gente adapta o conteúdo ao
          seu segmento e à realidade da sua cozinha.
        </p>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/contato"
            className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-medium text-[#2F5D3F] transition hover:bg-white/95"
          >
            <MessageCircle className="h-4 w-4" />
            Solicitar um treinamento
          </Link>
          <Link
            to="/servicos"
            className="inline-flex items-center gap-2 rounded-full border border-white/30 px-6 py-3 text-sm font-medium text-white transition hover:border-white/60"
          >
            Ver todos os serviços
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
