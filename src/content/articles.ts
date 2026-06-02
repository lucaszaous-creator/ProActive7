// Artigos do /novidades. RASCUNHOS para revisão da RT (Ariane) antes de ir
// ao ar: enquanto `published: false`, o artigo NÃO é listado nem acessível
// por URL (a rota responde 404). Para publicar, basta mudar para `true`.
//
// Conteúdo educativo/geral sobre boas práticas e legislação. A revisão
// técnica da nutricionista RT é obrigatória antes de publicar (CLAUDE.md §2).

export interface ArticleBlock {
  type: 'p' | 'h2' | 'ul';
  text?: string;
  items?: string[];
}

export interface Article {
  slug: string;
  title: string;
  /** Meta description (≤ ~160 caracteres). */
  description: string;
  /** Data ISO (YYYY-MM-DD) usada em datePublished e no sitemap. */
  date: string;
  tags: string[];
  /** Enquanto false, não aparece no site nem por URL direta. */
  published: boolean;
  body: ArticleBlock[];
}

export const ARTICLES: Article[] = [
  {
    slug: 'rdc-216-guia-basico',
    title: 'RDC 216 da ANVISA: o guia básico para serviços de alimentação',
    description:
      'O que é a RDC 216, a quem se aplica e quais documentos e rotinas ela exige de restaurantes, cozinhas e similares. Um guia introdutório.',
    date: '2026-06-02',
    tags: ['ANVISA', 'RDC 216', 'Boas Práticas'],
    published: false,
    body: [
      {
        type: 'p',
        text: 'A RDC nº 216/2004 da ANVISA é o regulamento técnico de Boas Práticas para serviços de alimentação em todo o Brasil. Ela vale para restaurantes, lanchonetes, padarias, cozinhas industriais, hotéis, escolas, hortifrútis e qualquer estabelecimento que prepare, armazene ou forneça alimentos prontos para o consumo.',
      },
      {
        type: 'h2',
        text: 'O que a RDC 216 exige, na prática',
      },
      {
        type: 'p',
        text: 'A resolução organiza a operação em torno de dois documentos centrais e de rotinas de controle. Os documentos são o Manual de Boas Práticas e os Procedimentos Operacionais Padronizados (POPs), que descrevem como cada tarefa crítica deve ser feita.',
      },
      {
        type: 'ul',
        items: [
          'Manual de Boas Práticas: descreve as práticas de higiene e manipulação do estabelecimento.',
          'POPs: higienização de instalações e equipamentos, controle de pragas, higienização do reservatório de água e higiene e saúde dos manipuladores.',
          'Controle de temperatura dos alimentos ao longo do preparo, armazenamento e distribuição.',
          'Identificação dos alimentos preparados com data de manipulação e prazo de validade.',
          'Capacitação periódica da equipe em boas práticas de manipulação.',
        ],
      },
      {
        type: 'h2',
        text: 'Por que isso importa para o seu negócio',
      },
      {
        type: 'p',
        text: 'Mais do que atender a uma exigência legal, as Boas Práticas reduzem o risco de doenças transmitidas por alimentos, protegem a reputação do estabelecimento e dão previsibilidade à operação. A fiscalização sanitária pode visitar a qualquer momento — e quem mantém a rotina em dia não precisa correr.',
      },
      {
        type: 'p',
        text: 'A responsabilidade técnica de uma nutricionista (RT) é o que dá sustentação a tudo isso: é ela quem adapta os documentos à realidade do seu estabelecimento, treina a equipe e acompanha os indicadores ao longo do tempo.',
      },
    ],
  },
  {
    slug: 'etiqueta-de-validade-o-que-nao-pode-faltar',
    title: 'Etiqueta de validade: o que não pode faltar e por que importa',
    description:
      'A etiqueta de validade é uma exigência das Boas Práticas. Veja quais informações ela precisa ter e como evitar erros no dia a dia da cozinha.',
    date: '2026-06-02',
    tags: ['Etiquetas', 'Validade', 'Boas Práticas'],
    published: false,
    body: [
      {
        type: 'p',
        text: 'Todo alimento manipulado e armazenado em um serviço de alimentação precisa ser identificado. A etiqueta de validade é o registro que mostra, de forma clara, quando o produto foi preparado e até quando pode ser usado com segurança.',
      },
      {
        type: 'h2',
        text: 'O que a etiqueta precisa informar',
      },
      {
        type: 'ul',
        items: [
          'Nome do produto ou preparação.',
          'Data de manipulação (quando foi preparado ou aberto).',
          'Prazo de validade definido segundo critérios técnicos.',
          'Responsável, quando aplicável à rotina do estabelecimento.',
        ],
      },
      {
        type: 'p',
        text: 'Os prazos de validade não devem ser “chutados”: eles seguem critérios técnicos definidos pela nutricionista responsável, considerando o tipo de alimento, a forma de armazenamento e a temperatura.',
      },
      {
        type: 'h2',
        text: 'O erro mais comum: depender da memória',
      },
      {
        type: 'p',
        text: 'A maior parte dos problemas com validade não vem de má intenção, e sim de processos frágeis: etiqueta escrita à mão de forma ilegível, data esquecida, prazo aplicado de cabeça. Quando a informação depende da memória de quem está na correria da cozinha, o erro é questão de tempo.',
      },
      {
        type: 'p',
        text: 'Por isso o princípio é simples: o manipulador não deve digitar nem decorar nada. O produto, o grupo e o prazo vêm de cadastros prontos, e a etiqueta é gerada automaticamente. Erro de digitação deixa de ser “falha do funcionário” e vira algo que o processo evita.',
      },
    ],
  },
  {
    slug: 'treinamento-de-manipuladores-a-base-da-seguranca',
    title: 'Treinamento de manipuladores: a base da segurança alimentar',
    description:
      'A maior parte dos riscos em uma cozinha começa nas pessoas e nos processos. Entenda por que a capacitação contínua é o investimento de maior retorno.',
    date: '2026-06-02',
    tags: ['Manipuladores', 'Treinamento', 'Boas Práticas'],
    published: false,
    body: [
      {
        type: 'p',
        text: 'Equipamentos e documentos são importantes, mas a segurança alimentar acontece, no fim das contas, nas mãos de quem manipula o alimento. Por isso a RDC 216 trata a capacitação dos manipuladores como item obrigatório — e não como um “extra”.',
      },
      {
        type: 'h2',
        text: 'O que um bom treinamento cobre',
      },
      {
        type: 'ul',
        items: [
          'Higiene pessoal e higienização correta das mãos.',
          'Prevenção de contaminação cruzada entre alimentos crus e prontos.',
          'Controle de temperatura no recebimento, armazenamento e preparo.',
          'Uso correto de etiquetas, prazos e rotação de estoque (PVPS).',
          'Higienização de superfícies, utensílios e equipamentos.',
        ],
      },
      {
        type: 'h2',
        text: 'Treinamento é rotina, não evento único',
      },
      {
        type: 'p',
        text: 'Uma equipe muda, esquece e se acomoda. Por isso a capacitação precisa ser periódica e prática, com reforço no chão da cozinha. O papel da nutricionista RT é justamente transformar a norma em hábito — adaptando a linguagem à realidade da equipe e acompanhando se o que foi ensinado está sendo aplicado.',
      },
      {
        type: 'p',
        text: 'O retorno é direto: menos não conformidades, menos desperdício, menos risco legal e uma operação que não trava quando a fiscalização aparece.',
      },
    ],
  },
];

/** Apenas artigos publicados, mais novos primeiro. */
export const publishedArticles = (): Article[] =>
  ARTICLES.filter((a) => a.published).sort((a, b) =>
    b.date.localeCompare(a.date),
  );

export const findArticle = (slug: string): Article | undefined =>
  ARTICLES.find((a) => a.slug === slug && a.published);
