import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { PublicLayout } from './components/PublicLayout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { FullPageSpinner } from './components/ui/Spinner';
import { LoginPage } from './pages/LoginPage';
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
  import('./pages/public/ComingSoonPage').then((m) => ({
    default: m.CursosPage,
  })),
);
const ClientesPublicPage = lazy(() =>
  import('./pages/public/ComingSoonPage').then((m) => ({
    default: m.ClientesPage,
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

const ResetPasswordPage = lazy(() =>
  import('./pages/ResetPasswordPage').then((m) => ({
    default: m.ResetPasswordPage,
  })),
);
const PublicLabelPage = lazy(() =>
  import('./pages/PublicLabelPage').then((m) => ({
    default: m.PublicLabelPage,
  })),
);
const DashboardPage = lazy(() =>
  import('./pages/DashboardPage').then((m) => ({ default: m.DashboardPage })),
);
const ProductsPage = lazy(() =>
  import('./pages/ProductsPage').then((m) => ({ default: m.ProductsPage })),
);
const PrintLabelPage = lazy(() =>
  import('./pages/PrintLabelPage').then((m) => ({
    default: m.PrintLabelPage,
  })),
);
const PhotosPage = lazy(() =>
  import('./pages/PhotosPage').then((m) => ({ default: m.PhotosPage })),
);
const TemperaturePage = lazy(() =>
  import('./pages/TemperaturePage').then((m) => ({
    default: m.TemperaturePage,
  })),
);
const ChecklistsPage = lazy(() =>
  import('./pages/ChecklistsPage').then((m) => ({
    default: m.ChecklistsPage,
  })),
);
const ReportsPage = lazy(() =>
  import('./pages/ReportsPage').then((m) => ({ default: m.ReportsPage })),
);
const RecipesPage = lazy(() =>
  import('./pages/RecipesPage').then((m) => ({ default: m.RecipesPage })),
);
const DocumentsPage = lazy(() =>
  import('./pages/DocumentsPage').then((m) => ({
    default: m.DocumentsPage,
  })),
);
const AuditsPage = lazy(() =>
  import('./pages/AuditsPage').then((m) => ({ default: m.AuditsPage })),
);
const AuditDetailPage = lazy(() =>
  import('./pages/AuditDetailPage').then((m) => ({
    default: m.AuditDetailPage,
  })),
);
const AgendaPage = lazy(() =>
  import('./pages/AgendaPage').then((m) => ({ default: m.AgendaPage })),
);
const PestControlPage = lazy(() =>
  import('./pages/PestControlPage').then((m) => ({
    default: m.PestControlPage,
  })),
);
const NonConformitiesPage = lazy(() =>
  import('./pages/NonConformitiesPage').then((m) => ({
    default: m.NonConformitiesPage,
  })),
);
const ManipulatorsPage = lazy(() =>
  import('./pages/ManipulatorsPage').then((m) => ({
    default: m.ManipulatorsPage,
  })),
);
const CompaniesPage = lazy(() =>
  import('./pages/admin/CompaniesPage').then((m) => ({
    default: m.CompaniesPage,
  })),
);
const UsersPage = lazy(() =>
  import('./pages/admin/UsersPage').then((m) => ({ default: m.UsersPage })),
);
const AuditLogPage = lazy(() =>
  import('./pages/admin/AuditLogPage').then((m) => ({
    default: m.AuditLogPage,
  })),
);
const TrashPage = lazy(() =>
  import('./pages/admin/TrashPage').then((m) => ({ default: m.TrashPage })),
);
const OrganizationsPage = lazy(() =>
  import('./pages/platform/OrganizationsPage').then((m) => ({
    default: m.OrganizationsPage,
  })),
);
const OrganizationDetailPage = lazy(() =>
  import('./pages/platform/OrganizationDetailPage').then((m) => ({
    default: m.OrganizationDetailPage,
  })),
);

export default function App() {
  return (
    <Suspense fallback={<FullPageSpinner />}>
      <Routes>
        {/* Site institucional publico */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/perfil" element={<PerfilPage />} />
          <Route path="/servicos" element={<ServicosPage />} />
          <Route path="/cursos" element={<CursosPublicPage />} />
          <Route path="/clientes" element={<ClientesPublicPage />} />
          <Route path="/novidades" element={<NovidadesPage />} />
          <Route path="/contato" element={<ContatoPage />} />
        </Route>

        {/* Compat: o site antigo usava /sistema para o login */}
        <Route path="/sistema" element={<Navigate to="/login" replace />} />

        <Route path="/login" element={<LoginPage />} />
        <Route path="/redefinir-senha" element={<ResetPasswordPage />} />
        <Route path="/etiqueta/:id" element={<PublicLabelPage />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/painel" element={<DashboardPage />} />
            <Route path="/produtos" element={<ProductsPage />} />
            <Route path="/imprimir" element={<PrintLabelPage />} />
            <Route path="/fotos" element={<PhotosPage />} />
            <Route path="/temperatura" element={<TemperaturePage />} />
            <Route path="/checklists" element={<ChecklistsPage />} />
            <Route path="/relatorios" element={<ReportsPage />} />
            <Route path="/fichas-tecnicas" element={<RecipesPage />} />
            <Route path="/documentos" element={<DocumentsPage />} />
            <Route path="/visitas" element={<AuditsPage />} />
            <Route path="/visitas/:id" element={<AuditDetailPage />} />
            <Route path="/agenda" element={<AgendaPage />} />
            <Route path="/controle-pragas" element={<PestControlPage />} />
            <Route
              path="/nao-conformidades"
              element={<NonConformitiesPage />}
            />
            <Route path="/manipuladores" element={<ManipulatorsPage />} />
          </Route>
        </Route>

        {/* Admin routes (platform_admin AND nutritionist) */}
        <Route element={<ProtectedRoute nutritionistOrAdmin />}>
          <Route element={<Layout />}>
            <Route path="/admin/empresas" element={<CompaniesPage />} />
            <Route path="/admin/usuarios" element={<UsersPage />} />
          </Route>
        </Route>

        {/* Platform admin only */}
        <Route element={<ProtectedRoute masterOnly />}>
          <Route element={<Layout />}>
            <Route path="/admin/trilha" element={<AuditLogPage />} />
            <Route path="/admin/lixeira" element={<TrashPage />} />
            <Route
              path="/platform/organizacoes"
              element={<OrganizationsPage />}
            />
            <Route
              path="/platform/organizacoes/:id"
              element={<OrganizationDetailPage />}
            />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
