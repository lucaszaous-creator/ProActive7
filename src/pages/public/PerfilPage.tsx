import { Droplet, Heart, Scale, Leaf, Compass } from 'lucide-react';
import { usePageTitle } from '@/lib/usePageTitle';

export function PerfilPage() {
  usePageTitle('Perfil — ProActive7');
  return (
    <div>
      <Hero />
      <QuemSomos />
      <NossaHistoria />
      <Missao />
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

function Missao() {
  return (
    <section className="relative overflow-hidden bg-[#2F5D3F] text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-32 -top-32 h-80 w-80 rounded-full bg-[#6FA68A]/25 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 -left-32 h-80 w-80 rounded-full bg-[#A8D96A]/15 blur-3xl"
      />
      <div className="relative mx-auto max-w-4xl px-5 py-16 text-center md:py-20">
        <Compass className="mx-auto h-10 w-10 text-[#A8D96A]" />
        <h2 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">
          Missão
        </h2>
        <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-white/85 md:text-lg">
          Atuar como prestadora de serviços em assessoria e consultoria em
          fornecimento de alimentação e nutrição com qualidade e foco do
          cliente, diferenciada pela{' '}
          <strong className="text-white">atitude pró-ativa</strong> e parceria
          com as empresas de forma comprometida.
        </p>
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
