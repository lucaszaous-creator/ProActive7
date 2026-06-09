import { useState, type FormEvent } from 'react';
import {
  MapPin,
  Mail,
  Phone,
  MessageCircle,
  Instagram,
  Facebook,
  Leaf,
  Send,
  Clock,
  ClipboardCheck,
  Handshake,
  ShieldCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import { usePageMeta } from '@/lib/usePageMeta';
import { Reveal } from '@/components/public/Reveal';

const WHATSAPP_URL = 'https://wa.me/5522997662669';
const MAPS_QUERY =
  'Rua Dr. Luiz Belegard, 407, Imbetiba, Macaé - RJ';

export function ContatoPage() {
  usePageMeta('/contato');
  return (
    <div>
      <Hero />
      <ContatoGrid />
      <ComoAtendemos />
      <Mapa />
    </div>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-[#e5e5e5] bg-gradient-to-b from-[#e5e5e5] to-[#fafafa]">
      <div className="mx-auto max-w-6xl px-5 py-16 text-center md:py-20">
        <span className="inline-flex items-center gap-2 rounded-full border border-[#737373]/40 bg-white px-3 py-1 text-xs font-medium text-[#262626]">
          <Leaf className="h-3.5 w-3.5" />
          Fale com a gente
        </span>
        <h1 className="mx-auto mt-4 max-w-3xl text-3xl font-semibold leading-[1.15] tracking-tight md:text-4xl">
          Bora conversar sobre a sua{' '}
          <span className="text-[#262626]">operação</span>?
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-[#171717]/70">
          Conte um pouco sobre o seu estabelecimento. A gente retorna pelo
          melhor canal para você.
        </p>
      </div>
    </section>
  );
}

function ContatoGrid() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-16">
      <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr]">
        <Reveal>
          <ContactCard />
        </Reveal>
        <Reveal delay={120}>
          <ContatoForm />
        </Reveal>
      </div>
    </section>
  );
}

/**
 * Como funciona o atendimento — reduz a fricção de "e agora?" e passa
 * confiança de que existe um processo (e que a primeira conversa é sem
 * compromisso). Preenche o espaço entre o formulário e o mapa.
 */
function ComoAtendemos() {
  const passos = [
    {
      icon: MessageCircle,
      title: 'Você fala com a gente',
      body: 'Pelo WhatsApp, e-mail ou formulário. Conte o segmento e o tamanho da sua operação.',
    },
    {
      icon: ClipboardCheck,
      title: 'Diagnóstico inicial',
      body: 'Entendemos o momento do seu estabelecimento e o que a legislação exige no seu caso.',
    },
    {
      icon: Handshake,
      title: 'Proposta sob medida',
      body: 'Você recebe um plano de consultoria com escopo e prazos claros — sem compromisso.',
    },
  ];
  return (
    <section className="bg-[#fafafa] py-16">
      <div className="mx-auto max-w-6xl px-5">
        <Reveal>
          <div className="mx-auto max-w-2xl text-center">
            <span className="text-xs font-medium uppercase tracking-wider text-[#737373]">
              Como atendemos
            </span>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[#171717] md:text-3xl">
              Da primeira mensagem à proposta — simples assim.
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-[#171717]/65">
              A primeira conversa é sempre sem compromisso. A gente só avança
              quando faz sentido para a sua operação.
            </p>
          </div>
        </Reveal>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {passos.map(({ icon: Icon, title, body }, i) => (
            <Reveal key={title} delay={i * 110}>
              <div className="relative h-full rounded-2xl border border-[#e5e5e5] bg-white p-6">
                <div className="flex items-center justify-between">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#262626] text-white">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="font-mono text-2xl font-bold text-[#e5e5e5]">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                </div>
                <h3 className="mt-4 text-base font-semibold text-[#171717]">
                  {title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[#171717]/70">
                  {body}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/**
 * Mapa do escritório (Google Maps embed — sem chave/API, custo zero).
 * Dá prova de existência física (confiança) e preenche o fim da página.
 */
function Mapa() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-16">
      <Reveal>
        <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr] lg:items-stretch">
          <div className="flex flex-col justify-center rounded-3xl border border-[#e5e5e5] bg-white p-7">
            <span className="text-xs font-medium uppercase tracking-wider text-[#737373]">
              Onde estamos
            </span>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[#171717]">
              Escritório em Imbetiba, Macaé.
            </h2>
            <p className="mt-3 flex items-start gap-2 text-sm leading-relaxed text-[#171717]/70">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#262626]" />
              Rua Dr. Luiz Belegard, 407 — sala 704 · Imbetiba · Macaé / RJ
            </p>
            <p className="mt-2 flex items-center gap-2 text-sm text-[#171717]/70">
              <ShieldCheck className="h-4 w-4 shrink-0 text-[#262626]" />
              Atendimento in-loco em toda a região mediante agendamento.
            </p>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                MAPS_QUERY,
              )}`}
              target="_blank"
              rel="noreferrer"
              className="mt-6 inline-flex w-fit items-center gap-2 rounded-full bg-[#262626] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#404040]"
            >
              Abrir no Google Maps
              <MapPin className="h-4 w-4" />
            </a>
          </div>
          <div className="overflow-hidden rounded-3xl border border-[#e5e5e5] shadow-[0_24px_60px_-30px_rgba(0,0,0,0.25)]">
            <iframe
              title="Mapa do escritório da ProActive7 em Macaé"
              src={`https://www.google.com/maps?q=${encodeURIComponent(
                MAPS_QUERY,
              )}&output=embed`}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="h-72 w-full lg:h-full lg:min-h-[22rem]"
            />
          </div>
        </div>
      </Reveal>
    </section>
  );
}

function ContactCard() {
  return (
    <aside className="flex flex-col gap-5">
      <InfoBlock
        icon={MapPin}
        label="Endereço"
        primary="Rua Dr. Luiz Belegard, 407 — sala 704"
        secondary="Imbetiba · Macaé — RJ"
      />
      <InfoBlock
        icon={Mail}
        label="E-mail"
        primary="contato@proactive7.com.br"
        href="mailto:contato@proactive7.com.br"
      />
      <InfoBlock
        icon={Phone}
        label="WhatsApp"
        primary="(22) 99766-2669"
        href={WHATSAPP_URL}
        external
      />
      <InfoBlock
        icon={Clock}
        label="Horário de atendimento"
        primary="Segunda a sexta · 08h às 18h"
        secondary="Atendimentos in-loco mediante agendamento"
      />

      <div className="rounded-2xl border border-[#e5e5e5] bg-white p-6">
        <h3 className="text-xs font-medium uppercase tracking-wider text-[#171717]/50">
          Acompanhe nas redes
        </h3>
        <div className="mt-3 flex flex-wrap gap-2">
          <SocialPill
            icon={Instagram}
            href="https://www.instagram.com/proactive.7/"
            label="@proactive.7"
          />
          <SocialPill
            icon={Facebook}
            href="https://www.facebook.com/proactive7"
            label="Facebook"
          />
          <SocialPill
            icon={MessageCircle}
            href={WHATSAPP_URL}
            label="WhatsApp"
          />
        </div>
      </div>
    </aside>
  );
}

function InfoBlock({
  icon: Icon,
  label,
  primary,
  secondary,
  href,
  external,
}: {
  icon: typeof MapPin;
  label: string;
  primary: string;
  secondary?: string;
  href?: string;
  external?: boolean;
}) {
  const body = (
    <div className="flex gap-4">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#e5e5e5] text-[#262626]">
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <div className="text-xs font-medium uppercase tracking-wider text-[#171717]/50">
          {label}
        </div>
        <div className="mt-1 text-sm font-medium text-[#171717]">{primary}</div>
        {secondary ? (
          <div className="mt-0.5 text-xs text-[#171717]/60">{secondary}</div>
        ) : null}
      </div>
    </div>
  );
  const cls =
    'block rounded-2xl border border-[#e5e5e5] bg-white p-6 transition hover:border-[#737373]/50';
  return href ? (
    <a
      href={href}
      target={external ? '_blank' : undefined}
      rel={external ? 'noreferrer' : undefined}
      className={cls}
    >
      {body}
    </a>
  ) : (
    <div className={cls}>{body}</div>
  );
}

function SocialPill({
  icon: Icon,
  href,
  label,
}: {
  icon: typeof Instagram;
  href: string;
  label: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-2 rounded-full border border-[#e5e5e5] bg-[#fafafa] px-3 py-1.5 text-xs font-medium text-[#171717]/75 transition hover:border-[#737373]/50 hover:text-[#262626]"
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </a>
  );
}

function ContatoForm() {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!nome.trim() || !email.trim() || !mensagem.trim()) {
      toast.error('Preencha nome, e-mail e mensagem.');
      return;
    }
    setSubmitting(true);
    // Abre WhatsApp pre-preenchido como fallback enquanto nao temos backend de form.
    const text = encodeURIComponent(
      `Olá, sou ${nome}.\n\nE-mail: ${email}\nTelefone: ${telefone || '—'}\n\n${mensagem}`,
    );
    window.open(`${WHATSAPP_URL}?text=${text}`, '_blank');
    setSubmitting(false);
    toast.success(
      'Abrimos o WhatsApp com sua mensagem — finalize o envio por lá.',
    );
    setNome('');
    setEmail('');
    setTelefone('');
    setMensagem('');
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-[#e5e5e5] bg-white p-7 shadow-[0_24px_60px_-30px_rgba(0,0,0,0.20)]"
    >
      <h2 className="text-lg font-semibold tracking-tight text-[#171717]">
        Envie uma mensagem
      </h2>
      <p className="mt-1 text-sm text-[#171717]/60">
        Respondemos pelo canal de sua preferência.
      </p>

      <div className="mt-6 space-y-4">
        <Field
          id="nome"
          label="Nome"
          value={nome}
          onChange={setNome}
          placeholder="Seu nome completo"
          required
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            id="email"
            label="E-mail"
            type="email"
            value={email}
            onChange={setEmail}
            placeholder="voce@email.com"
            required
          />
          <Field
            id="telefone"
            label="Telefone"
            value={telefone}
            onChange={setTelefone}
            placeholder="(22) 9 9999-9999"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="mensagem"
            className="text-xs font-medium uppercase tracking-wider text-[#171717]/55"
          >
            Mensagem
          </label>
          <textarea
            id="mensagem"
            rows={5}
            required
            value={mensagem}
            onChange={(e) => setMensagem(e.target.value)}
            placeholder="Conte sobre seu estabelecimento e como podemos ajudar..."
            className="rounded-xl border border-[#e5e5e5] bg-[#fafafa] px-3.5 py-2.5 text-sm text-[#171717] outline-none transition placeholder:text-[#171717]/35 focus:border-[#737373] focus:bg-white focus:ring-2 focus:ring-[#737373]/25"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#262626] px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-[#404040] disabled:opacity-60"
      >
        Enviar pelo WhatsApp
        <Send className="h-4 w-4" />
      </button>
      <p className="mt-3 text-center text-[11px] text-[#171717]/50">
        A mensagem abre o WhatsApp com seus dados — finalize o envio por lá.
      </p>
    </form>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  placeholder,
  required,
  type = 'text',
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  type?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={id}
        className="text-xs font-medium uppercase tracking-wider text-[#171717]/55"
      >
        {label}
      </label>
      <input
        id={id}
        type={type}
        required={required}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-xl border border-[#e5e5e5] bg-[#fafafa] px-3.5 py-2.5 text-sm text-[#171717] outline-none transition placeholder:text-[#171717]/35 focus:border-[#737373] focus:bg-white focus:ring-2 focus:ring-[#737373]/25"
      />
    </div>
  );
}
