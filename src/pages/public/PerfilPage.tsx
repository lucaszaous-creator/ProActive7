import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Droplet,
  Heart,
  Scale,
  Leaf,
  Compass,
  Eye,
  Gem,
  Calendar,
  MapPin,
  Anchor,
  GraduationCap,
  BadgeCheck,
  ArrowRight,
  MessageCircle,
} from 'lucide-react';
import { usePageMeta } from '@/lib/usePageMeta';
import { Reveal } from '@/components/public/Reveal';

export function PerfilPage() {
  usePageMeta('/perfil');
  return (
    <div>
      <Hero />
      <QuemSomos />
      <NossaHistoria />
      <Fundadora />
      <Pilares />
      <Politica />
      <CtaPerfil />
    </div>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-[#e5e5e5] bg-gradient-to-b from-[#e5e5e5] to-[#fafafa]">
      <div className="mx-auto max-w-6xl px-5 py-16 text-center md:py-20">
        <span className="inline-flex items-center gap-2 rounded-full border border-[#737373]/40 bg-white px-3 py-1 text-xs font-medium text-[#262626]">
          <Leaf className="h-3.5 w-3.5" />
          Quem somos
        </span>
        <h1 className="mx-auto mt-4 max-w-3xl text-3xl font-semibold leading-[1.15] tracking-tight md:text-4xl">
          Boa alimentação, bem-estar e saúde —{' '}
          <span className="text-[#262626]">na sua operação</span>.
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-[#171717]/70">
          Uma consultoria construída em Macaé desde 2013 — dedicada à segurança
          alimentar de quem alimenta gente todos os dias.
        </p>
      </div>
    </section>
  );
}

function QuemSomos() {
  const fatos = [
    { icon: Calendar, label: 'Desde', value: '2013' },
    { icon: MapPin, label: 'Sede', value: 'Macaé / RJ' },
    { icon: BadgeCheck, label: 'RT', value: 'Nutricionista no CRN' },
    { icon: Anchor, label: 'Atuação', value: 'On & off-shore' },
  ];
  return (
    <section className="mx-auto max-w-6xl px-5 py-16">
      <div className="grid gap-10 lg:grid-cols-[1.3fr_1fr] lg:items-start">
        <Reveal>
          <div>
            <span className="text-xs font-medium uppercase tracking-wider text-[#737373]">
              Sobre a empresa
            </span>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">
              Da PERSONAL DIET à PROACTIVE7.
            </h2>
            <div className="mt-6 space-y-5 text-base leading-relaxed text-[#171717]/75">
              <p>
                Começamos como{' '}
                <strong className="text-[#262626]">PERSONAL DIET</strong> e hoje
                somos a{' '}
                <strong className="text-[#262626]">PROACTIVE7</strong> — uma
                empresa especializada em assessoria e consultoria em segurança
                alimentar que reúne profissionais capacitados, experiência,
                ética, responsabilidade, comprometimento, transparência, atitude
                e respeito para oferecer o melhor serviço aos seus clientes.
              </p>
              <p>
                Nossa metodologia consiste em{' '}
                <em>observar, planejar, capacitar e conscientizar</em> a fim de
                auditar e avaliar um real parâmetro de evolução dos
                estabelecimentos em relação às legislações federais, estaduais e
                municipais vigentes — e à qualidade dos produtos oferecidos.
              </p>
              <p className="rounded-2xl border border-[#e5e5e5] bg-white p-5 text-[#171717]/85">
                <strong className="text-[#262626]">
                  Atendemos estabelecimentos
                </strong>{' '}
                comerciais com seguimento em alimentação on-shore ou off-shore
                como: indústrias, fábricas, restaurantes, lanchonetes, padarias,
                mercados/supermercados, creches/escolas, hortifrutis e hotelaria.
              </p>
            </div>
          </div>
        </Reveal>

        <Reveal delay={120}>
          <aside className="rounded-3xl border border-[#e5e5e5] bg-gradient-to-br from-[#fafafa] to-white p-7 shadow-[0_20px_50px_-30px_rgba(0,0,0,0.25)]">
            <h3 className="text-xs font-medium uppercase tracking-wider text-[#737373]">
              A empresa em resumo
            </h3>
            <dl className="mt-5 space-y-4">
              {fatos.map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#e5e5e5] text-[#262626]">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div>
                    <dt className="text-[11px] font-medium uppercase tracking-wider text-[#171717]/50">
                      {label}
                    </dt>
                    <dd className="text-sm font-semibold text-[#171717]">
                      {value}
                    </dd>
                  </div>
                </div>
              ))}
            </dl>
            <Link
              to="/servicos"
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#262626] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#404040]"
            >
              Ver nossos serviços
              <ArrowRight className="h-4 w-4" />
            </Link>
          </aside>
        </Reveal>
      </div>
    </section>
  );
}

function NossaHistoria() {
  const marcos = [
    {
      year: '2013',
      title: 'Nasce a PERSONAL DIET',
      body: 'O começo da jornada em Macaé, levando orientação técnica em alimentação e nutrição para estabelecimentos da região.',
    },
    {
      year: '2020',
      title: 'Surge a PROACTIVE7',
      body: 'Fundada pela nutricionista Ariane Madureira, a empresa evolui para assessoria e consultoria completa em segurança alimentar, com método próprio.',
    },
    {
      year: 'Hoje',
      title: '+12 anos de experiência',
      body: 'Atendemos restaurantes, indústrias, hotelaria on/off-shore, escolas e mercados — adequando cada operação à ANVISA e às legislações federal, estadual e municipal.',
    },
  ];
  return (
    <section className="bg-[#e5e5e5]/40">
      <div className="mx-auto max-w-6xl px-5 py-16">
        <Reveal>
          <div className="max-w-2xl">
            <span className="text-xs font-medium uppercase tracking-wider text-[#737373]">
              Nossa história
            </span>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">
              Mais de uma década consolidando segurança alimentar em Macaé.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-[#171717]/70">
              Da cobrança crescente por qualidade na alimentação à exigência das
              normas de Boas Práticas — acompanhamos essa evolução de perto,
              atendendo público local e estrangeiro.
            </p>
          </div>
        </Reveal>

        <ol className="mt-12 grid gap-6 md:grid-cols-3">
          {marcos.map(({ year, title, body }, i) => (
            <Reveal key={year} delay={i * 110}>
              <li className="relative h-full rounded-2xl border border-[#e5e5e5] bg-white p-6">
                {/* conector horizontal no desktop */}
                {i < marcos.length - 1 && (
                  <span
                    aria-hidden
                    className="pointer-events-none absolute right-[-15px] top-12 hidden h-px w-8 bg-[#737373]/40 md:block"
                  />
                )}
                <span className="inline-flex items-center rounded-full bg-[#262626] px-3 py-1 text-sm font-semibold text-white">
                  {year}
                </span>
                <h3 className="mt-4 text-base font-semibold text-[#171717]">
                  {title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[#171717]/70">
                  {body}
                </p>
              </li>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}

/**
 * FundadoraAvatar — foto real da Ariane com fallback automático para o
 * monograma "AM" caso o arquivo não exista (ou falhe ao carregar). Assim a
 * página nunca quebra: basta soltar a foto em `public/equipe/ariane.jpg`
 * que ela entra; sem a foto, mantém o monograma de custo zero.
 */
function FundadoraAvatar() {
  const [erro, setErro] = useState(false);
  const base =
    'mx-auto h-32 w-32 shrink-0 rounded-3xl shadow-lg ring-4 ring-[#e5e5e5] md:mx-0';
  if (erro) {
    return (
      <div
        className={`${base} flex items-center justify-center bg-gradient-to-br from-[#262626] to-[#171717] text-4xl font-semibold tracking-tight text-white`}
      >
        AM
      </div>
    );
  }
  return (
    <img
      src="/equipe/ariane.jpg"
      alt="Ariane Madureira, nutricionista e responsável técnica da ProActive7"
      width={128}
      height={128}
      loading="lazy"
      onError={() => setErro(true)}
      className={`${base} object-cover`}
    />
  );
}

/**
 * Fundadora — destaca a Ariane (RT registrada no CRN) como principal ativo
 * de confiança numa página institucional. Fatos reaproveitados do texto já
 * existente — sem inventar credenciais.
 */
function Fundadora() {
  const formacao = [
    'Especialização',
    'Pós-graduação',
    'MBA',
    '+12 anos de experiência',
  ];
  return (
    <section className="mx-auto max-w-6xl px-5 py-16">
      <Reveal>
        <div className="grid gap-8 overflow-hidden rounded-3xl border border-[#e5e5e5] bg-white p-7 shadow-[0_24px_60px_-35px_rgba(0,0,0,0.3)] md:grid-cols-[auto_1fr] md:items-center md:p-10">
          <FundadoraAvatar />

          <div>
            <span className="text-xs font-medium uppercase tracking-wider text-[#737373]">
              Responsável técnica
            </span>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[#171717] md:text-3xl">
              Ariane Madureira
            </h2>
            <p className="mt-1 flex flex-wrap items-center gap-2 text-sm font-medium text-[#262626]">
              <BadgeCheck className="h-4 w-4" />
              Nutricionista · Fundadora da ProActive7
            </p>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-[#171717]/75">
              Responsável técnica registrada no CRN, Ariane é quem assina e
              responde por cada cozinha que a ProActive7 acompanha. São mais de
              uma década traduzindo a legislação sanitária em rotina possível:
              ela audita no local, capacita as equipes e conduz cada unidade até
              a conformidade virar cultura — não um documento esquecido na
              gaveta.
            </p>
            <p className="mt-3 max-w-2xl text-base leading-relaxed text-[#171717]/75">
              É o nome — e a assinatura — por trás da tranquilidade de quem
              recebe a fiscalização sem surpresas. Quando a ProActive7 garante
              uma cozinha em ordem, é a experiência da Ariane que está em jogo.
            </p>
            <ul className="mt-5 flex flex-wrap gap-2">
              {formacao.map((f) => (
                <li
                  key={f}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#e5e5e5] bg-[#fafafa] px-3 py-1 text-xs font-medium text-[#171717]/75"
                >
                  <GraduationCap className="h-3.5 w-3.5 text-[#262626]" />
                  {f}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Reveal>
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
        <div className="animate-aurora absolute -left-24 -top-24 h-[28rem] w-[28rem] rounded-full bg-[#525252]/45 blur-[120px]" />
        <div className="animate-aurora absolute right-[-6rem] top-1/3 h-[26rem] w-[26rem] rounded-full bg-[#737373]/35 blur-[130px] [animation-delay:-7s]" />
        <div className="animate-aurora absolute bottom-[-8rem] left-1/3 h-[24rem] w-[24rem] rounded-full bg-[#a3a3a3]/20 blur-[120px] [animation-delay:-14s]" />
      </div>

      <div className="mx-auto max-w-6xl px-5">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-medium uppercase tracking-wider text-[#a3a3a3]">
            Quem nos move
          </span>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">
            Missão, Visão e Valores
          </h2>
        </div>

        <div className="mt-12 grid gap-5 lg:grid-cols-3 lg:items-stretch">
          {/* Missão */}
          <article className="flex flex-col rounded-3xl border border-white/15 bg-white/10 p-7 backdrop-blur-xl">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/20 bg-white/15 text-[#a3a3a3]">
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
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/20 bg-white/15 text-[#a3a3a3]">
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
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/20 bg-white/15 text-[#a3a3a3]">
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
      <Reveal>
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-xs font-medium uppercase tracking-wider text-[#737373]">
            Política de qualidade
          </span>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">
            Quatro pilares que guiam cada projeto.
          </h2>
        </div>
      </Reveal>
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {pillars.map(({ icon: Icon, title, body }, i) => (
          <Reveal key={title} delay={i * 90}>
            <div className="h-full rounded-2xl border border-[#e5e5e5] bg-white p-6 text-center transition hover:border-[#737373]/50 hover:shadow-[0_8px_24px_-12px_rgba(0,0,0,0.18)]">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e5e5e5] text-[#262626]">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-sm font-semibold text-[#171717]">
                {title}
              </h3>
              <p className="mt-1.5 text-xs leading-relaxed text-[#171717]/65">
                {body}
              </p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* CTA final — fecha a página convidando ao contato (faltava). */
function CtaPerfil() {
  return (
    <section className="relative isolate overflow-hidden bg-[#262626] text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-32 -top-32 h-80 w-80 rounded-full bg-[#737373]/25 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 -left-32 h-80 w-80 rounded-full bg-[#a3a3a3]/15 blur-3xl"
      />
      <div className="relative mx-auto max-w-3xl px-5 py-20 text-center md:py-24">
        <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
          Vamos cuidar da segurança alimentar da sua operação?
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-white/85">
          Converse com a Ariane e descubra o que sua unidade precisa para estar
          em conformidade — sem compromisso.
        </p>
        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/contato"
            className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-medium text-[#262626] transition hover:bg-white/95"
          >
            <MessageCircle className="h-4 w-4" />
            Falar com a ProActive7
          </Link>
          <Link
            to="/servicos"
            className="inline-flex items-center gap-2 rounded-full border border-white/30 px-6 py-3 text-sm font-medium text-white transition hover:border-white/60"
          >
            Ver serviços
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
