import { Droplet, Heart, Scale, Leaf, Compass, Eye, Gem } from 'lucide-react';
import { usePageMeta } from '@/lib/usePageMeta';

export function PerfilPage() {
  usePageMeta('/perfil');
  return (
    <div>
      <Hero />
      <QuemSomos />
      <NossaHistoria />
      <Pilares />
      <Politica />
    </div>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-[#E8F1EA] bg-gradient-to-b from-[#E8F1EA] to-[#FAFAF7]">
      <div className="mx-auto max-w-6xl px-5 py-16 text-center md:py-20">
        <span className="inline-flex items-center gap-2 rounded-full border border-[#6FA68A]/40 bg-white px-3 py-1 text-xs font-medium text-[#2F5D3F]">
          <Leaf className="h-3.5 w-3.5" />
          Quem somos
        </span>
        <h1 className="mx-auto mt-4 max-w-3xl text-3xl font-semibold leading-[1.15] tracking-tight md:text-4xl">
          Boa alimentação, bem-estar e saúde —{' '}
          <span className="text-[#2F5D3F]">na sua operação</span>.
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-[#1A2A22]/70">
          Uma consultoria construída em Macaé desde 2013 — dedicada à segurança
          alimentar de quem alimenta gente todos os dias.
        </p>
      </div>
    </section>
  );
}

function QuemSomos() {
  return (
    <section className="mx-auto max-w-5xl px-5 py-16">
      <span className="text-xs font-medium uppercase tracking-wider text-[#6FA68A]">
        Sobre a empresa
      </span>
      <h2 className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">
        Da PERSONAL DIET à PROACTIVE7.
      </h2>
      <div className="mt-6 space-y-5 text-base leading-relaxed text-[#1A2A22]/75">
        <p>
          Começamos como{' '}
          <strong className="text-[#2F5D3F]">PERSONAL DIET</strong> e hoje somos
          a <strong className="text-[#2F5D3F]">PROACTIVE7</strong> — uma empresa
          especializada em assessoria e consultoria em segurança alimentar que
          reúne profissionais capacitados, experiência, ética, responsabilidade,
          comprometimento, transparência, atitude e respeito para oferecer o
          melhor serviço aos seus clientes.
        </p>
        <p>
          Nossa metodologia consiste em{' '}
          <em>observar, planejar, capacitar e conscientizar</em> a fim de
          auditar e avaliar um real parâmetro de evolução dos estabelecimentos
          em relação às legislações federais, estaduais e municipais vigentes —
          e à qualidade dos produtos oferecidos.
        </p>
        <p className="rounded-2xl border border-[#E8F1EA] bg-white p-5 text-[#1A2A22]/85">
          <strong className="text-[#2F5D3F]">Atendemos estabelecimentos</strong>{' '}
          comerciais com seguimento em alimentação on-shore ou off-shore como:
          indústrias, fábricas, restaurantes, lanchonetes, padarias,
          mercados/supermercados, creches/escolas, hortifrutis e hotelaria.
        </p>
      </div>
    </section>
  );
}

function NossaHistoria() {
  return (
    <section className="bg-[#E8F1EA]/40">
      <div className="mx-auto max-w-5xl px-5 py-16">
        <span className="text-xs font-medium uppercase tracking-wider text-[#6FA68A]">
          Nossa história
        </span>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">
          Mais de uma década consolidando segurança alimentar em Macaé.
        </h2>
        <div className="mt-6 space-y-5 text-base leading-relaxed text-[#1A2A22]/75">
          <p>
            A <strong className="text-[#2F5D3F]">PERSONAL DIET</strong> foi
            criada em 2013 e em 2020 nasceu a{' '}
            <strong className="text-[#2F5D3F]">PROACTIVE7</strong>, fundada pela
            nutricionista <strong>Ariane Madureira</strong> na cidade de Macaé.
            A partir da realização de cursos de especialização, pós-graduação e
            MBA — que somados já contabilizam mais de 12 anos de experiência —
            observou-se a necessidade dos estabelecimentos possuírem orientações
            técnicas para atender suas demandas na área de alimentação e
            nutrição.
          </p>
          <p>
            Essas demandas envolvem as legislações impostas pelo Ministério da
            Saúde — Agência Nacional de Vigilância Sanitária (ANVISA) — e
            legislações de âmbito municipal, estadual e federal que direcionam
            os estabelecimentos que manipulam ou fabricam alimentos a se
            adequarem às normas de Boas Práticas de Produção de Alimentos.
          </p>
          <p>
            Mais do que conformidade, atendemos a cobrança direta dos clientes
            que buscam melhor qualidade nos produtos consumidos — levando em
            consideração a diversidade da cidade em acolher público local e
            estrangeiro.
          </p>
        </div>
      </div>
    </section>
  );
}

/**
 * Pilares institucionais — Missão, Visão e Valores (resgatados do site
 * antigo). Seção full-bleed (largura total no desktop) com fundo verde +
 * aurora e cartões de vidro fosco. No mobile/tablet os cartões empilham.
 */
function Pilares() {
  const valores = [
    'Ética',
    'Profissionalismo',
    'Comprometimento',
    'Transparência',
    'Qualidade',
    'Competência',
    'Atitude',
    'Responsabilidade',
    'Respeito',
    'Trabalho em equipe',
  ];
  return (
    <section className="relative left-1/2 w-screen -translate-x-1/2 overflow-hidden bg-[#173a27] py-16 text-white md:py-20">
      {/* Aurora de fundo */}
      <div aria-hidden="true" className="absolute inset-0 -z-10 overflow-hidden">
        <div className="animate-aurora absolute -left-24 -top-24 h-[28rem] w-[28rem] rounded-full bg-[#3C7350]/45 blur-[120px]" />
        <div className="animate-aurora absolute right-[-6rem] top-1/3 h-[26rem] w-[26rem] rounded-full bg-[#6FA68A]/35 blur-[130px] [animation-delay:-7s]" />
        <div className="animate-aurora absolute bottom-[-8rem] left-1/3 h-[24rem] w-[24rem] rounded-full bg-[#A8D96A]/20 blur-[120px] [animation-delay:-14s]" />
      </div>

      <div className="mx-auto max-w-6xl px-5">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-medium uppercase tracking-wider text-[#A8D96A]">
            Quem nos move
          </span>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">
            Missão, Visão e Valores
          </h2>
        </div>

        <div className="mt-12 grid gap-5 lg:grid-cols-3 lg:items-stretch">
          {/* Missão */}
          <article className="flex flex-col rounded-3xl border border-white/15 bg-white/10 p-7 backdrop-blur-xl">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/20 bg-white/15 text-[#A8D96A]">
              <Compass className="h-6 w-6" />
            </div>
            <h3 className="mt-5 text-xl font-semibold tracking-tight">Missão</h3>
            <p className="mt-3 text-sm leading-relaxed text-white/85">
              Atuar como prestadora de serviços em assessoria e consultoria em
              fornecimento de alimentação e nutrição com qualidade e foco do
              cliente, diferenciada pela{' '}
              <strong className="text-white">atitude pró-ativa</strong> e
              parceria com as empresas de forma comprometida.
            </p>
          </article>

          {/* Visão */}
          <article className="flex flex-col rounded-3xl border border-white/15 bg-white/10 p-7 backdrop-blur-xl">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/20 bg-white/15 text-[#A8D96A]">
              <Eye className="h-6 w-6" />
            </div>
            <h3 className="mt-5 text-xl font-semibold tracking-tight">Visão</h3>
            <p className="mt-3 text-sm leading-relaxed text-white/85">
              Atingir níveis de excelência na prestação de serviços aos clientes
              através da segurança e qualidade nutricional, agregando valor aos
              serviços e colaboradores, com atendimento de qualidade e confiança.
            </p>
          </article>

          {/* Valores */}
          <article className="flex flex-col rounded-3xl border border-white/15 bg-white/10 p-7 backdrop-blur-xl">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/20 bg-white/15 text-[#A8D96A]">
              <Gem className="h-6 w-6" />
            </div>
            <h3 className="mt-5 text-xl font-semibold tracking-tight">Valores</h3>
            <ul className="mt-4 flex flex-wrap gap-2">
              {valores.map((v) => (
                <li
                  key={v}
                  className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-white/90"
                >
                  {v}
                </li>
              ))}
            </ul>
          </article>
        </div>
      </div>
    </section>
  );
}

function Politica() {
  const pillars = [
    {
      icon: Droplet,
      title: 'Qualidade e prontidão',
      body: 'Nos serviços prestados, com técnica e agilidade.',
    },
    {
      icon: Heart,
      title: 'Capacitação humana',
      body: 'Investimento contínuo em pessoas e treinamento.',
    },
    {
      icon: Scale,
      title: 'Comprometimento ético',
      body: 'Transparência, responsabilidade e respeito.',
    },
    {
      icon: Leaf,
      title: 'Saúde e meio ambiente',
      body: 'Práticas que respeitam o entorno e o consumidor.',
    },
  ];
  return (
    <section className="mx-auto max-w-6xl px-5 py-16">
      <div className="mx-auto max-w-2xl text-center">
        <span className="text-xs font-medium uppercase tracking-wider text-[#6FA68A]">
          Política de qualidade
        </span>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">
          Quatro pilares que guiam cada projeto.
        </h2>
      </div>
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {pillars.map(({ icon: Icon, title, body }) => (
          <div
            key={title}
            className="rounded-2xl border border-[#E8F1EA] bg-white p-6 text-center transition hover:border-[#6FA68A]/50 hover:shadow-[0_8px_24px_-12px_rgba(47,93,63,0.18)]"
          >
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#E8F1EA] text-[#2F5D3F]">
              <Icon className="h-5 w-5" />
            </div>
            <h3 className="mt-4 text-sm font-semibold text-[#1A2A22]">
              {title}
            </h3>
            <p className="mt-1.5 text-xs leading-relaxed text-[#1A2A22]/65">
              {body}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
