import {
  Printer,
  Tag,
  Download,
  Smartphone,
  XCircle,
  CheckCircle2,
  ExternalLink,
  AlertTriangle,
  ShoppingCart,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { usePageTitle } from '@/lib/usePageTitle';

const ELGIN_DRIVER_URL =
  'https://www.elgin.com.br/Produtos/Automacao/impressoras-de-etiquetas/impressora-de-etiqueta-l42dt';

interface BuyLink {
  label: string;
  url: string;
}

const ELGIN_L42DT_BUY_LINKS: BuyLink[] = [
  { label: 'Elgin (loja oficial)', url: 'https://loja.elgin.com.br/impressora-de-etiquetas-termica-elgin-direta-l42dt/p' },
  { label: 'Kabum', url: 'https://www.kabum.com.br/produto/481286/impressora-termica-direta-de-etiquetas-elgin-l42dt-203dpi-usb-serial-nao-usa-ribon' },
  { label: 'Sobraltec', url: 'https://www.sobraltec.com.br/20212' },
];

const PIMACO_LABELS_URL =
  'https://www.pimaco.com.br/produto/Etiqueta-Adesiva-Termica-Tr6040-60x40-Pct-Com-4-Rolos-Com-512-Etiquetas-Pimaco/33287';
const ILABEL_URL =
  'https://loja.ilabel.com.br/etiqueta-60x40mm-termica-adesiva-para-impressora-termica-direta';

export function HardwarePage() {
  usePageTitle('Hardware recomendado');
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Header />
      <PrimaryPrinter />
      <Labels />
      <Install />
      <MobileAlternative />
      <DontBuy />
    </div>
  );
}

/* ----- Header ----- */

function Header() {
  return (
    <div className="rounded-2xl border border-[#E8F1EA] bg-gradient-to-br from-[#E8F1EA] to-[#FAFAF7] p-6 sm:p-8">
      <div className="flex items-start gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-[#2F5D3F] shadow-sm">
          <Printer className="h-6 w-6" />
        </span>
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight text-[#1A2A22] sm:text-2xl">
            Hardware recomendado
          </h1>
          <p className="mt-1 text-sm leading-relaxed text-[#1A2A22]/70 sm:text-base">
            Combinação de impressora + etiquetas que funciona ponta a ponta no
            ProActive7 — testada para etiquetas de validade em produtos
            <span className="text-[#2F5D3F]"> congelados, refrigerados</span> e em
            câmara fria com condensação.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ----- Card: impressora primária ----- */

function PrimaryPrinter() {
  return (
    <Section
      icon={Printer}
      eyebrow="Impressora · estação fixa de cozinha"
      title="Elgin L42-DT (térmica direta)"
      subtitle="Recomendação principal — cobre todos os tamanhos de etiqueta do sistema, sai logo da empresa e QR code via diálogo de impressão do sistema."
      accentBadge="≈ R$ 859"
    >
      <SpecsTable
        rows={[
          ['Tecnologia', 'Térmica direta (sem ribbon)'],
          ['Largura de impressão', '108 mm — cabe os 4 tamanhos do sistema'],
          ['Resolução', '203 dpi'],
          ['Velocidade', '5 polegadas/seg (~127 mm/s)'],
          ['Conexão', 'USB + Serial (não tem Ethernet nesta versão)'],
          ['Linguagens', 'EPL, ZPL, TSPL, ESC/POS'],
          [
            'Sensor de etiqueta',
            'Gap + black mark (posiciona etiqueta pré-cortada)',
          ],
          ['Software incluso', 'Bartender Ultra Lite + Direct Print'],
        ]}
      />

      <Compatibility
        items={[
          [true, 'Fluxo "Diálogo do sistema" → logo + QR saem na etiqueta'],
          [true, 'Todos os 4 presets de tamanho do sistema (60×40, 80×60, 50×30, 33×22 mm)'],
          [true, 'Sem ribbon — operação mais simples na cozinha'],
          [false, 'Sem Ethernet — precisa de PC ou tablet conectado por USB'],
          [false, 'Sem Bluetooth — irrelevante (USB é melhor pro nosso fluxo)'],
        ]}
      />

      <BuyButtons label="Onde comprar" links={ELGIN_L42DT_BUY_LINKS} />
    </Section>
  );
}

/* ----- Card: etiquetas ----- */

function Labels() {
  return (
    <Section
      icon={Tag}
      eyebrow="Consumível · rolo de etiquetas"
      title="Rolo PP térmico direto · 60 × 40 mm · adesivo all-temp"
      subtitle="O segredo do cold-chain é o consumível — não a impressora. Polipropileno (PP) com cola all-temp adere de −40 °C a +70 °C sem soltar em câmara fria e sem borrar com condensação."
      accentBadge="≈ R$ 90 - 140 / 1000 un"
    >
      <SpecsTable
        rows={[
          ['Substrato', 'Polipropileno (PP) — não absorve umidade'],
          ['Adesivo', 'All-temp ou freezer grade — aplica de −10 °C, mantém de −40 a +70 °C'],
          ['Formato', 'Die-cut (pré-cortada) com gap entre etiquetas'],
          ['Tamanho', '60 × 40 mm (default do sistema)'],
          ['Tipo de impressão', 'Térmica direta (sem ribbon)'],
        ]}
      />

      <div className="rounded-xl border border-[#F2C9B8] bg-[#FBE9E0]/40 p-4">
        <div className="flex gap-3">
          <AlertTriangle className="h-5 w-5 shrink-0 text-[#A8543A]" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[#A8543A]">
              Não aceite "papel couché" do vendedor
            </p>
            <p className="mt-1 text-sm text-[#1A2A22]/75">
              O vendedor padrão tenta empurrar o rolo barato de papel couché.
              <strong> Não serve no frio</strong> — vai descolar e borrar. Peça
              explicitamente <strong>"PP + adesivo all-temp/freezer"</strong>.
            </p>
          </div>
        </div>
      </div>

      <BuyButtons
        label="Fornecedores conhecidos"
        links={[
          { label: 'Pimaco TR6040', url: PIMACO_LABELS_URL },
          { label: 'iLabel', url: ILABEL_URL },
          { label: 'MX Etiquetas', url: 'https://www.mxetiquetas.com.br/' },
          { label: 'Korber', url: 'https://www.korber.com.br/' },
        ]}
      />
    </Section>
  );
}

/* ----- Card: instalação ----- */

function Install() {
  return (
    <Section
      icon={Download}
      eyebrow="Setup · 3 passos"
      title="Como instalar"
      subtitle="Do desembalar à primeira etiqueta em ~10 minutos."
    >
      <ol className="space-y-3">
        {[
          {
            n: '1',
            title: 'Baixar e instalar o driver Elgin L42-DT',
            body: 'No site oficial da Elgin, na página do produto, baixe o driver para Windows e o software Direct Print. Instale ambos.',
            cta: { label: 'Página oficial L42-DT', url: ELGIN_DRIVER_URL },
          },
          {
            n: '2',
            title: 'Conectar a impressora no PC',
            body: 'Cabo USB direto no PC ou tablet da estação. Ligue na tomada (110/220 V). O Windows reconhece automaticamente.',
          },
          {
            n: '3',
            title: 'Imprimir uma etiqueta de teste',
            body: 'Entre no ProActive7, vá em "Imprimir etiqueta", escolha um produto, selecione tamanho 60×40 mm e clique em "Imprimir". A primeira impressão abre o diálogo do sistema — escolha a Elgin L42-DT como impressora e marque "tamanho personalizado" se pedir.',
          },
        ].map((step) => (
          <li
            key={step.n}
            className="relative rounded-xl border border-[#E8F1EA] bg-white p-4 pl-12"
          >
            <span className="absolute left-4 top-4 inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#2F5D3F] text-xs font-semibold text-white">
              {step.n}
            </span>
            <h4 className="text-sm font-semibold text-[#1A2A22]">
              {step.title}
            </h4>
            <p className="mt-1 text-sm leading-relaxed text-[#1A2A22]/70">
              {step.body}
            </p>
            {step.cta ? (
              <a
                href={step.cta.url}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-[#2F5D3F] hover:underline"
              >
                {step.cta.label}
                <ExternalLink className="h-3 w-3" />
              </a>
            ) : null}
          </li>
        ))}
      </ol>
    </Section>
  );
}

/* ----- Card: alternativa móvel ----- */

function MobileAlternative() {
  return (
    <Section
      icon={Smartphone}
      eyebrow="Alternativa · manipulador móvel"
      title="Phomemo M220 — Bluetooth de cintura"
      subtitle="Quando o manipulador precisa imprimir em movimento (salão, câmara fria, despensa), o caminho Bluetooth é viável. Mas tem trade-off."
      accentBadge="≈ R$ 400"
    >
      <SpecsTable
        rows={[
          ['Conexão', 'Bluetooth (sem cabo)'],
          ['Largura máxima', '75 mm (cobre 60×40, 50×30, 33×22)'],
          ['Bateria', 'Aprox. 1 dia de uso intenso'],
          ['Compatibilidade', 'Web Bluetooth (Chrome/Edge no Android)'],
        ]}
      />

      <div className="rounded-xl border border-[#F2C9B8] bg-[#FBE9E0]/40 p-4">
        <div className="flex gap-3">
          <AlertTriangle className="h-5 w-5 shrink-0 text-[#A8543A]" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[#A8543A]">
              Limitação do fluxo Bluetooth no ProActive7
            </p>
            <p className="mt-1 text-sm text-[#1A2A22]/75">
              Pelo protocolo ESC/POS sobre BT, a etiqueta sai <strong>só com texto</strong> — sem o logo da
              empresa e sem o QR code. Para etiquetas com logo + QR, use a Elgin L42-DT via USB.
            </p>
          </div>
        </div>
      </div>
    </Section>
  );
}

/* ----- Card: o que não comprar ----- */

function DontBuy() {
  const items = [
    {
      label: 'Papel térmico comum de cupom',
      reason: 'Cola descola no frio. Tinta apaga com condensação. Não serve.',
    },
    {
      label: 'Adesivo "permanente" comum (não freezer grade)',
      reason: 'A cola endurece a frio e a etiqueta cai. Sempre peça all-temp.',
    },
    {
      label: 'App-Tech 320B',
      reason: 'Largura máxima de 80 mm — não imprime o preset 80×60 do sistema. Boa pros outros, mas limita.',
    },
    {
      label: 'Brother QL-820NW',
      reason: 'Usa rolos DK proprietários da Brother — tamanhos não batem com os 4 presets do sistema.',
    },
    {
      label: 'Impressora de cupom Epson TM-T20X',
      reason: 'É de receita/comanda, papel sem adesivo. Não cola em embalagem.',
    },
  ];
  return (
    <Section
      icon={XCircle}
      eyebrow="Atenção"
      title="O que NÃO comprar"
      subtitle="Erros frequentes que fazem a operação falhar logo no primeiro mês."
    >
      <ul className="space-y-2">
        {items.map((it) => (
          <li
            key={it.label}
            className="flex gap-3 rounded-xl border border-[#E8F1EA] bg-white p-4"
          >
            <XCircle className="h-5 w-5 shrink-0 text-[#A8543A]" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[#1A2A22]">
                {it.label}
              </p>
              <p className="mt-0.5 text-sm text-[#1A2A22]/65">{it.reason}</p>
            </div>
          </li>
        ))}
      </ul>
    </Section>
  );
}

/* ============================================================
 * Helpers de layout
 * ============================================================ */

function Section({
  icon: Icon,
  eyebrow,
  title,
  subtitle,
  accentBadge,
  children,
}: {
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  subtitle?: string;
  accentBadge?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-[#E8F1EA] bg-white p-5 shadow-[0_8px_24px_-16px_rgba(47,93,63,0.18)] sm:p-7">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#E8F1EA] text-[#2F5D3F]">
            <Icon className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-wider text-[#6FA68A]">
              {eyebrow}
            </p>
            <h2 className="mt-0.5 text-base font-semibold leading-tight text-[#1A2A22] sm:text-lg">
              {title}
            </h2>
            {subtitle ? (
              <p className="mt-1 text-sm leading-relaxed text-[#1A2A22]/65">
                {subtitle}
              </p>
            ) : null}
          </div>
        </div>
        {accentBadge ? (
          <span className="self-start rounded-full bg-[#2F5D3F] px-3 py-1 text-xs font-medium text-white sm:self-auto">
            {accentBadge}
          </span>
        ) : null}
      </div>

      <div className="space-y-4">{children}</div>
    </section>
  );
}

function SpecsTable({ rows }: { rows: [string, string][] }) {
  return (
    <dl className="grid gap-x-6 gap-y-2 rounded-xl border border-[#E8F1EA] bg-[#FAFAF7] p-4 text-sm sm:grid-cols-[max-content_1fr]">
      {rows.map(([k, v]) => (
        <div
          key={k}
          className="contents sm:[&>dt]:py-1 sm:[&>dd]:py-1"
        >
          <dt className="font-medium text-[#1A2A22]/55">{k}</dt>
          <dd className="text-[#1A2A22]">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

function Compatibility({ items }: { items: [boolean, string][] }) {
  return (
    <ul className="space-y-1.5">
      {items.map(([ok, text]) => (
        <li
          key={text}
          className="flex items-start gap-2 text-sm text-[#1A2A22]/80"
        >
          {ok ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#2F5D3F]" />
          ) : (
            <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#A8543A]" />
          )}
          <span>{text}</span>
        </li>
      ))}
    </ul>
  );
}

function BuyButtons({ label, links }: { label: string; links: BuyLink[] }) {
  return (
    <div>
      <p className="mb-2 text-xs font-medium uppercase tracking-wider text-[#1A2A22]/50">
        {label}
      </p>
      <div className="flex flex-wrap gap-2">
        {links.map((l) => (
          <a
            key={l.url}
            href={l.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full border border-[#2F5D3F]/20 bg-white px-4 py-2 text-xs font-medium text-[#2F5D3F] transition hover:border-[#2F5D3F]/40 hover:bg-[#E8F1EA]"
          >
            <ShoppingCart className="h-3.5 w-3.5" />
            {l.label}
            <ExternalLink className="h-3 w-3" />
          </a>
        ))}
      </div>
    </div>
  );
}
