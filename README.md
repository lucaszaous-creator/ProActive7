# ProActive7 — Site institucional

Site da empresa de consultoria nutricional e segurança alimentar ProActive7.
Páginas: início, perfil, serviços, cursos, clientes, novidades/artigos e contato.

## Desenvolvimento

Node.js 22 e npm:

```bash
npm ci
npm run dev
npm run typecheck
npm run lint
npm run format
npm test
npm run build
```

O build gera o site em `dist/`, com metadados por página e sitemap.
O deploy na Vercel é atualizado pela branch `main`.

## Conteúdo institucional

Clientes, cursos e artigos publicados continuam sendo lidos do Supabase,
com as variáveis públicas `VITE_SUPABASE_URL` e
`VITE_SUPABASE_ANON_KEY`. O cliente público não persiste sessão, não renova tokens
e não processa links de autenticação. Não há login ou painel de edição neste site.
O contato continua disponível por WhatsApp e e-mail.

## Remoção do sistema

As telas, rotas e dependências do sistema operacional foram retiradas do
frontend. Links antigos para login, painéis, etiquetas, selos e demais
módulos mostram a página de conteúdo não encontrado. A antiga página
`/sistema` redireciona permanentemente para `/servicos`.

`public/sw.js` desativa o service worker anterior, remove seu precache e
atualiza as abas controladas. Deve continuar publicado para atender
instalações antigas; o site não oferece instalação de PWA nem novas operações offline.

Uma rotina transitória tenta enviar registros que já estavam na fila offline,
somente com a sessão existente validada pelo servidor e somente para o autor
da escrita. Não há login, nova captura de dados ou sincronização contínua.
Pendências de outras contas, sessões inválidas e escritas rejeitadas continuam
preservadas no navegador, com aviso para contatar a equipe sem limpar os dados.
Abas concorrentes são coordenadas com Web Locks; sem esse recurso, a fila é
preservada para recuperação manual. Os rascunhos locais também permanecem intactos.

O histórico Git preserva a implementação anterior. Os arquivos de
`supabase/` permanecem como histórico do backend e não fazem parte do
build do site. Esta mudança não apaga contas, registros ou arquivos do banco,
nem desativa serviços externos. Qualquer migração ou encerramento desse
backend deve ser tratado separadamente.
