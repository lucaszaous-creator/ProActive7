import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { ArrowLeft, Hash } from 'lucide-react';
import { fetchPublicArticle, type ArticleFull } from '@/lib/articlesApi';
import { useDynamicMeta } from '@/lib/usePageMeta';
import { SITE_URL } from '@/lib/usePageTitle';
import { Spinner } from '@/components/ui/Spinner';
import { NotFoundPage } from './NotFoundPage';

function buildArticleJsonLd(article: ArticleFull, url: string) {
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: article.title,
      description: article.description,
      datePublished: article.published_at,
      dateModified: article.published_at,
      inLanguage: 'pt-BR',
      mainEntityOfPage: url,
      image: article.cover_image ?? undefined,
      author: { '@id': `${SITE_URL}/#ariane` },
      publisher: { '@id': `${SITE_URL}/#organization` },
      keywords: article.tags.join(', '),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Início',
          item: `${SITE_URL}/`,
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'Novidades',
          item: `${SITE_URL}/novidades`,
        },
        { '@type': 'ListItem', position: 3, name: article.title, item: url },
      ],
    },
  ];
}

export function ArticlePage() {
  const { slug } = useParams<{ slug: string }>();
  const [article, setArticle] = useState<ArticleFull | null>(null);
  const [loading, setLoading] = useState(true);
  const path = `/novidades/${slug ?? ''}`;
  const url = `${SITE_URL}${path}`;

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchPublicArticle(slug ?? '')
      .then((a) => active && setArticle(a))
      .catch(() => active && setArticle(null))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [slug]);

  useDynamicMeta(
    article
      ? {
          title: `${article.title} | ProActive7`,
          description: article.description,
          path,
          image: article.cover_image ?? undefined,
          jsonLd: buildArticleJsonLd(article, url),
        }
      : null,
  );

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (!article) return <NotFoundPage />;

  const dateLabel = new Date(article.published_at).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  return (
    <article className="mx-auto max-w-3xl px-5 py-14">
      <Link
        to="/novidades"
        className="inline-flex items-center gap-2 text-sm font-medium text-[#262626] hover:underline"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar para Novidades
      </Link>

      <header className="mt-6">
        <h1 className="text-3xl font-semibold leading-tight tracking-tight text-[#171717] md:text-4xl">
          {article.title}
        </h1>
        <p className="mt-3 text-sm text-[#171717]/55">{dateLabel}</p>
      </header>

      <div className="mt-8 space-y-5 text-base leading-relaxed text-[#171717]/80">
        <ReactMarkdown
          components={{
            h2: ({ children }) => (
              <h2 className="pt-2 text-xl font-semibold tracking-tight text-[#171717]">
                {children}
              </h2>
            ),
            h3: ({ children }) => (
              <h3 className="pt-1 text-lg font-semibold text-[#171717]">
                {children}
              </h3>
            ),
            p: ({ children }) => <p>{children}</p>,
            ul: ({ children }) => (
              <ul className="list-disc space-y-2 pl-5">{children}</ul>
            ),
            ol: ({ children }) => (
              <ol className="list-decimal space-y-2 pl-5">{children}</ol>
            ),
            li: ({ children }) => <li>{children}</li>,
            strong: ({ children }) => (
              <strong className="font-semibold text-[#171717]">
                {children}
              </strong>
            ),
            a: ({ href, children }) => {
              // Defesa em profundidade contra javascript:/data: URIs.
              const safe = href && /^(https?:|mailto:|\/)/i.test(href);
              if (!safe) return <span>{children}</span>;
              return (
                <a
                  href={href}
                  className="text-[#262626] underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {children}
                </a>
              );
            },
          }}
        >
          {article.body}
        </ReactMarkdown>
      </div>

      {article.tags.length > 0 && (
        <div className="mt-10 flex flex-wrap gap-2 border-t border-[#e5e5e5] pt-6">
          {article.tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 rounded-full bg-[#e5e5e5] px-3 py-1 text-xs font-medium text-[#262626]"
            >
              <Hash className="h-3 w-3" />
              {tag}
            </span>
          ))}
        </div>
      )}
    </article>
  );
}
