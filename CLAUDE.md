# ProActive7 — Site institucional

A pedido da cliente, este repositório publica apenas o site da empresa.
Não adicionar login, portais, painéis, impressão, PWA ou outros módulos do
sistema ao site.

## Stack e conteúdo

- React 19, TypeScript, Vite 6, Tailwind CSS 4 e React Router.
- Textos visíveis em português do Brasil.
- Preservar a identidade visual, contatos e páginas institucionais.
- Clientes, cursos e artigos publicados: leitura pública do Supabase.
- Não montar AuthProvider nem persistir/renovar sessões ou processar callbacks de login.
- Nunca expor credenciais privilegiadas no frontend.
- Conteúdo SEO centralizado em `src/lib/seo.config.json`.

## Histórico

O sistema anterior está no histórico Git. `supabase/` guarda as migrations
e funções existentes; elas não são executadas pelo build do site.
Não apagar dados ou alterar o backend como parte de mudanças institucionais.

## Validação e deploy

Executar typecheck, lint, format, test e build.
Merge em `main` inicia o deploy automático na Vercel.
Manter `public/sw.js` publicado: é a atualização que desativa o PWA anterior.
