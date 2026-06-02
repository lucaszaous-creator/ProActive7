import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Hash } from 'lucide-react';
import { findArticle, type Article } from '@/content/articles';
import { useDynamicMeta } from '@/lib/usePageMeta';
import { SITE_URL } from '@/lib/usePageTitle';
import { NotFoundPage } from './NotFoundPage';

function buildArticleJsonLd(article: Article, url: string) {
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: article.title,
      description: article.description,
      datePublished: article.date,
      dateModified: article.date,
      inLanguage: 'pt-BR',
      mainEntityOfPage: url,
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
  const article = slug ? findArticle(slug) : undefined;
  const path = `/novidades/${slug ?? ''}`;
  const url = `${SITE_URL}${path}`;

  // Hooks antes de qualquer retorno condicional.
  useDynamicMeta(
    article
      ? {
          title: `${article.title} | ProActive7`,
          description: article.description,
          path,
          jsonLd: buildArticleJsonLd(article, url),
        }
      : null,
  );

  if (!article) return <NotFoundPage />;

  const dateLabel = new Date(`${article.date}T12:00:00`).toLocaleDateString(
    'pt-BR',
    { day: '2-digit', month: 'long', year: 'numeric' },
  );

  return (
    <article className="mx-auto max-w-3xl px-5 py-14">
      <Link
        to="/novidades"
        className="inline-flex items-center gap-2 text-sm font-medium text-[#2F5D3F] hover:underline"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar para Novidades
      </Link>

      <header className="mt-6">
        <h1 className="text-3xl font-semibold leading-tight tracking-tight text-[#1A2A22] md:text-4xl">
          {article.title}
        </h1>
        <p className="mt-3 text-sm text-[#1A2A22]/55">{dateLabel}</p>
      </header>

      <div className="mt-8 space-y-5">
        {article.body.map((block, i) => {
          if (block.type === 'h2') {
            return (
              <h2
                key={i}
                className="pt-2 text-xl font-semibold tracking-tight text-[#1A2A22]"
              >
                {block.text}
              </h2>
            );
          }
          if (block.type === 'ul') {
            return (
              <ul
                key={i}
                className="list-disc space-y-2 pl-5 text-base leading-relaxed text-[#1A2A22]/80"
              >
                {block.items?.map((it, j) => (
                  <li key={j}>{it}</li>
                ))}
              </ul>
            );
          }
          return (
            <p key={i} className="text-base leading-relaxed text-[#1A2A22]/80">
              {block.text}
            </p>
          );
        })}
      </div>

      <div className="mt-10 flex flex-wrap gap-2 border-t border-[#E8F1EA] pt-6">
        {article.tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-full bg-[#E8F1EA] px-3 py-1 text-xs font-medium text-[#2F5D3F]"
          >
            <Hash className="h-3 w-3" />
            {tag}
          </span>
        ))}
      </div>
    </article>
  );
}
