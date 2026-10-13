import { createElement } from 'react';
import { renderToPipeableStream } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { Writable } from 'node:stream';
import { describe, expect, it } from 'vitest';
import App from './App';

function renderRoute(path: string): Promise<string> {
  return new Promise((resolve, reject) => {
    let html = '';
    const output = new Writable({
      write(chunk, _encoding, callback) {
        html += chunk.toString();
        callback();
      },
    });
    output.on('finish', () => resolve(html));
    output.on('error', reject);
    const stream = renderToPipeableStream(
      createElement(
        MemoryRouter,
        { initialEntries: [path] },
        createElement(App),
      ),
      {
        onAllReady() {
          stream.pipe(output);
        },
        onShellError: reject,
        onError: reject,
      },
    );
  });
}

describe('site institucional', () => {
  it.each([
    '/',
    '/perfil',
    '/servicos',
    '/cursos',
    '/clientes',
    '/novidades',
    '/contato',
  ])('mantém a página %s e a navegação sem acesso ao sistema', async (path) => {
    const html = await renderRoute(path);
    expect(html).toContain('<h1');
    expect(html).not.toContain('Página não encontrada');
    expect(html).not.toMatch(/href="\/(?:login|acessar|painel|sistema)/);
    expect(html).not.toMatch(
      /Acessar sistema|Acesso ao sistema|Sistema próprio incluso|Conhecer a plataforma/,
    );
    expect(html).toContain('mailto:contato@proactive7.com.br');
    expect(html).toContain('https://wa.me/5522997662669');
  });

  it.each([
    '/acessar',
    '/login',
    '/login/cliente',
    '/login/nutricionista',
    '/redefinir-senha',
    '/painel',
    '/produtos',
    '/imprimir',
    '/imprimir/novo',
    '/fotos',
    '/temperatura',
    '/checklists',
    '/relatorios',
    '/documentos',
    '/ajuda',
    '/visitas',
    '/visitas/exemplo',
    '/visitas/modelos',
    '/vistorias/nova',
    '/agenda',
    '/controle-pragas',
    '/nao-conformidades',
    '/nao-conformidades/modelos',
    '/manipuladores',
    '/recebimentos',
    '/recebimentos/novo',
    '/recebimentos/exemplo',
    '/rastreabilidade',
    '/dossie',
    '/estoque',
    '/estoque/movimentacoes',
    '/validades',
    '/producao',
    '/contagem',
    '/controlados',
    '/fichas',
    '/fornecedores',
    '/cadastros/grupos',
    '/admin/empresas',
    '/admin/usuarios',
    '/admin/novidades',
    '/admin/assinatura',
    '/admin/hardware',
    '/admin/impressoras',
    '/admin/trilha',
    '/admin/lixeira',
    '/platform/centro',
    '/platform/dashboard',
    '/platform/comunicados',
    '/platform/biblioteca',
    '/platform/organizacoes',
    '/platform/organizacoes/exemplo',
    '/platform/planos',
    '/platform/cursos',
    '/platform/clientes',
    '/etiqueta/exemplo',
    '/selo/exemplo',
    '/pagina-inexistente',
  ])('não disponibiliza o antigo módulo em %s', async (path) => {
    const html = await renderRoute(path);
    expect(html).toContain('Página não encontrada');
    expect(html).not.toContain('type="password"');
    expect(html).not.toMatch(/href="\/(?:login|acessar|painel)/);
  });
});
