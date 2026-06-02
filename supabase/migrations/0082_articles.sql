-- =====================================================================
-- 0082_articles.sql — CMS de artigos do site público (/novidades)
-- A nutricionista RT e o platform_admin criam/editam/publicam artigos
-- pelo painel. O site público (anônimo) lê apenas os PUBLICADOS via RPC
-- SECURITY DEFINER (mesma postura de public_plans: não expomos a tabela
-- direto ao anon). Corpo em Markdown.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.articles (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          text NOT NULL UNIQUE,
  title         text NOT NULL,
  description   text NOT NULL DEFAULT '',
  body          text NOT NULL DEFAULT '',           -- Markdown
  tags          text[] NOT NULL DEFAULT '{}',
  cover_image   text,                                -- URL opcional (OG)
  published     boolean NOT NULL DEFAULT false,
  published_at  timestamptz,
  author_id     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_articles_published
  ON public.articles (published, published_at DESC);

ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;

-- Leitura/escrita pelo painel: platform_admin e nutricionista RT.
-- (anon NÃO tem policy → não lê a tabela direto; usa as RPCs abaixo.)
CREATE POLICY articles_admin_read
  ON public.articles FOR SELECT
  USING (public.is_platform_admin() OR public.is_nutritionist());

CREATE POLICY articles_admin_write
  ON public.articles FOR ALL
  USING (public.is_platform_admin() OR public.is_nutritionist())
  WITH CHECK (public.is_platform_admin() OR public.is_nutritionist());

-- mantém updated_at em dia
CREATE OR REPLACE FUNCTION public.articles_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_articles_touch ON public.articles;
CREATE TRIGGER trg_articles_touch
  BEFORE UPDATE ON public.articles
  FOR EACH ROW EXECUTE FUNCTION public.articles_touch_updated_at();

-- ---------------------------------------------------------------------
-- RPCs públicas (somente publicados, sem PII)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.public_articles()
RETURNS TABLE (
  slug          text,
  title         text,
  description   text,
  tags          text[],
  cover_image   text,
  published_at  timestamptz
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT slug, title, description, tags, cover_image,
         COALESCE(published_at, created_at) AS published_at
    FROM public.articles
   WHERE published = true
   ORDER BY COALESCE(published_at, created_at) DESC;
$$;

CREATE OR REPLACE FUNCTION public.public_article(p_slug text)
RETURNS TABLE (
  slug          text,
  title         text,
  description   text,
  body          text,
  tags          text[],
  cover_image   text,
  published_at  timestamptz
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT slug, title, description, body, tags, cover_image,
         COALESCE(published_at, created_at) AS published_at
    FROM public.articles
   WHERE published = true AND slug = p_slug
   LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.public_articles() FROM public;
REVOKE ALL ON FUNCTION public.public_article(text) FROM public;
GRANT EXECUTE ON FUNCTION public.public_articles() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.public_article(text) TO anon, authenticated;

-- ---------------------------------------------------------------------
-- Seed: 3 rascunhos (published=false) como exemplos para a RT editar.
-- ---------------------------------------------------------------------
INSERT INTO public.articles (slug, title, description, tags, published, body)
VALUES
(
  'rdc-216-guia-basico',
  'RDC 216 da ANVISA: o guia básico para serviços de alimentação',
  'O que é a RDC 216, a quem se aplica e quais documentos e rotinas ela exige de restaurantes, cozinhas e similares.',
  ARRAY['ANVISA','RDC 216','Boas Práticas'],
  false,
  E'A RDC nº 216/2004 da ANVISA é o regulamento técnico de Boas Práticas para serviços de alimentação em todo o Brasil. Ela vale para restaurantes, lanchonetes, padarias, cozinhas industriais, hotéis, escolas, hortifrútis e qualquer estabelecimento que prepare, armazene ou forneça alimentos prontos para o consumo.\n\n## O que a RDC 216 exige, na prática\n\nA resolução organiza a operação em torno de dois documentos centrais e de rotinas de controle: o Manual de Boas Práticas e os Procedimentos Operacionais Padronizados (POPs).\n\n- **Manual de Boas Práticas:** descreve as práticas de higiene e manipulação do estabelecimento.\n- **POPs:** higienização de instalações e equipamentos, controle de pragas, higienização do reservatório de água e higiene e saúde dos manipuladores.\n- **Controle de temperatura** dos alimentos no preparo, armazenamento e distribuição.\n- **Identificação** dos alimentos preparados com data de manipulação e prazo de validade.\n- **Capacitação periódica** da equipe em boas práticas.\n\n## Por que isso importa para o seu negócio\n\nMais do que atender a uma exigência legal, as Boas Práticas reduzem o risco de doenças transmitidas por alimentos, protegem a reputação do estabelecimento e dão previsibilidade à operação. A responsabilidade técnica de uma nutricionista (RT) é o que dá sustentação a tudo isso.'
),
(
  'etiqueta-de-validade-o-que-nao-pode-faltar',
  'Etiqueta de validade: o que não pode faltar e por que importa',
  'A etiqueta de validade é uma exigência das Boas Práticas. Veja quais informações ela precisa ter e como evitar erros na cozinha.',
  ARRAY['Etiquetas','Validade','Boas Práticas'],
  false,
  E'Todo alimento manipulado e armazenado em um serviço de alimentação precisa ser identificado. A etiqueta de validade mostra, de forma clara, quando o produto foi preparado e até quando pode ser usado com segurança.\n\n## O que a etiqueta precisa informar\n\n- Nome do produto ou preparação.\n- Data de manipulação (quando foi preparado ou aberto).\n- Prazo de validade definido segundo critérios técnicos.\n- Responsável, quando aplicável à rotina do estabelecimento.\n\nOs prazos não devem ser "chutados": seguem critérios técnicos definidos pela nutricionista responsável, considerando o tipo de alimento, o armazenamento e a temperatura.\n\n## O erro mais comum: depender da memória\n\nA maior parte dos problemas com validade vem de processos frágeis — etiqueta ilegível, data esquecida, prazo aplicado de cabeça. Por isso o princípio é simples: o manipulador não digita nem decora nada. O produto e o prazo vêm de cadastros prontos e a etiqueta é gerada automaticamente.'
),
(
  'treinamento-de-manipuladores-a-base-da-seguranca',
  'Treinamento de manipuladores: a base da segurança alimentar',
  'A maior parte dos riscos em uma cozinha começa nas pessoas e nos processos. Entenda por que a capacitação contínua é o investimento de maior retorno.',
  ARRAY['Manipuladores','Treinamento','Boas Práticas'],
  false,
  E'A segurança alimentar acontece, no fim das contas, nas mãos de quem manipula o alimento. Por isso a RDC 216 trata a capacitação dos manipuladores como item obrigatório.\n\n## O que um bom treinamento cobre\n\n- Higiene pessoal e higienização correta das mãos.\n- Prevenção de contaminação cruzada entre alimentos crus e prontos.\n- Controle de temperatura no recebimento, armazenamento e preparo.\n- Uso correto de etiquetas, prazos e rotação de estoque (PVPS).\n- Higienização de superfícies, utensílios e equipamentos.\n\n## Treinamento é rotina, não evento único\n\nUma equipe muda, esquece e se acomoda. A capacitação precisa ser periódica e prática, com reforço no chão da cozinha. O papel da nutricionista RT é transformar a norma em hábito — e o retorno é direto: menos não conformidades, menos desperdício e menos risco legal.'
)
ON CONFLICT (slug) DO NOTHING;
