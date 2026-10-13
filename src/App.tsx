import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { PublicLayout } from './components/PublicLayout';
import { FullPageSpinner } from './components/ui/Spinner';
import { LandingPage } from './pages/LandingPage';

const PerfilPage = lazy(() =>
  import('./pages/public/PerfilPage').then((m) => ({ default: m.PerfilPage })),
);
const ServicosPage = lazy(() =>
  import('./pages/public/ServicosPage').then((m) => ({
    default: m.ServicosPage,
  })),
);
const CursosPublicPage = lazy(() =>
  import('./pages/public/CursosPublicPage').then((m) => ({
    default: m.CursosPublicPage,
  })),
);
const ClientesPublicPage = lazy(() =>
  import('./pages/public/ClientesPublicPage').then((m) => ({
    default: m.ClientesPublicPage,
  })),
);
const NovidadesPage = lazy(() =>
  import('./pages/public/NovidadesPage').then((m) => ({
    default: m.NovidadesPage,
  })),
);
const ContatoPage = lazy(() =>
  import('./pages/public/ContatoPage').then((m) => ({
    default: m.ContatoPage,
  })),
);
const NotFoundPage = lazy(() =>
  import('./pages/public/NotFoundPage').then((m) => ({
    default: m.NotFoundPage,
  })),
);
const ArticlePage = lazy(() =>
  import('./pages/public/ArticlePage').then((m) => ({
    default: m.ArticlePage,
  })),
);
export default function App() {
  return (
    <Suspense fallback={<FullPageSpinner />}>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/perfil" element={<PerfilPage />} />
          <Route path="/servicos" element={<ServicosPage />} />
          <Route path="/cursos" element={<CursosPublicPage />} />
          <Route path="/clientes" element={<ClientesPublicPage />} />
          <Route path="/novidades" element={<NovidadesPage />} />
          <Route path="/novidades/:slug" element={<ArticlePage />} />
          <Route path="/contato" element={<ContatoPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
