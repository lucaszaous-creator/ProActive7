import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { PublicLayout } from './components/PublicLayout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { FullPageSpinner } from './components/ui/Spinner';
import { LoginPage } from './pages/LoginPage';
import { LandingPage } from './pages/LandingPage';
import { AccessPortalPage } from './pages/AccessPortalPage';

const PerfilPage = lazy(() =>
  import('./pages/public/PerfilPage').then((m) => ({ default: m.PerfilPage })),
);
const ServicosPage = lazy(() =>
  import('./pages/public/ServicosPage').then((m) => ({
    default: m.ServicosPage,
  })),
);
const SistemaPage = lazy(() =>
  import('./pages/public/SistemaPage').then((m) => ({
    default: m.SistemaPage,
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
const ArticlesAdminPage = lazy(() =>
  import('./pages/admin/ArticlesAdminPage').then((m) => ({
    default: m.ArticlesAdminPage,
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
const PublicSealPage = lazy(() =>
  import('./pages/PublicSealPage').then((m) => ({
    default: m.PublicSealPage,
  })),
);
const DashboardPage = lazy(() =>
  import('./pages/DashboardPage').then((m) => ({ default: m.DashboardPage })),
);
const ProductsPage = lazy(() =>
  import('./pages/ProductsPage').then((m) => ({ default: m.ProductsPage })),
);
const PrintWizardPage = lazy(() =>
  import('./pages/PrintWizardPage').then((m) => ({
    default: m.PrintWizardPage,
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
const DocumentsPage = lazy(() =>
  import('./pages/DocumentsPage').then((m) => ({
    default: m.DocumentsPage,
  })),
);
const HelpPage = lazy(() =>
  import('./pages/HelpPage').then((m) => ({ default: m.HelpPage })),
);
const AuditsPage = lazy(() =>
  import('./pages/AuditsPage').then((m) => ({ default: m.AuditsPage })),
);
const NcTemplatesPage = lazy(() =>
  import('./pages/NcTemplatesPage').then((m) => ({
    default: m.NcTemplatesPage,
  })),
);
const AuditTemplatesPage = lazy(() =>
  import('./pages/AuditTemplatesPage').then((m) => ({
    default: m.AuditTemplatesPage,
  })),
);
const AuditDetailPage = lazy(() =>
  import('./pages/AuditDetailPage').then((m) => ({
    default: m.AuditDetailPage,
  })),
);
const NewInspectionPage = lazy(() =>
  import('./pages/NewInspectionPage').then((m) => ({
    default: m.NewInspectionPage,
  })),
);
const RecipesPage = lazy(() =>
  import('./pages/RecipesPage').then((m) => ({ default: m.RecipesPage })),
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
const SuppliersPage = lazy(() =>
  import('./pages/SuppliersPage').then((m) => ({
    default: m.SuppliersPage,
  })),
);
const RastreabilidadePage = lazy(() =>
  import('./pages/RastreabilidadePage').then((m) => ({
    default: m.RastreabilidadePage,
  })),
);
const DossiePage = lazy(() =>
  import('./pages/DossiePage').then((m) => ({
    default: m.DossiePage,
  })),
);
const RecebimentosPage = lazy(() =>
  import('./pages/RecebimentosPage').then((m) => ({
    default: m.RecebimentosPage,
  })),
);
const RecebimentoFormPage = lazy(() =>
  import('./pages/RecebimentoFormPage').then((m) => ({
    default: m.RecebimentoFormPage,
  })),
);
const RecebimentoDetailPage = lazy(() =>
  import('./pages/RecebimentoDetailPage').then((m) => ({
    default: m.RecebimentoDetailPage,
  })),
);
const EstoquePage = lazy(() =>
  import('./pages/EstoquePage').then((m) => ({ default: m.EstoquePage })),
);
const EstoqueMovimentacoesPage = lazy(() =>
  import('./pages/EstoqueMovimentacoesPage').then((m) => ({
    default: m.EstoqueMovimentacoesPage,
  })),
);
const ValidadesPage = lazy(() =>
  import('./pages/ValidadesPage').then((m) => ({ default: m.ValidadesPage })),
);
const ProducaoPage = lazy(() =>
  import('./pages/ProducaoPage').then((m) => ({ default: m.ProducaoPage })),
);
const ContagemPage = lazy(() =>
  import('./pages/ContagemPage').then((m) => ({ default: m.ContagemPage })),
);
const ControladosPage = lazy(() =>
  import('./pages/ControladosPage').then((m) => ({
    default: m.ControladosPage,
  })),
);
const GruposPage = lazy(() =>
  import('./pages/cadastros/GruposPage').then((m) => ({
    default: m.GruposPage,
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
const HardwarePage = lazy(() =>
  import('./pages/admin/HardwarePage').then((m) => ({
    default: m.HardwarePage,
  })),
);
const PrintersPage = lazy(() =>
  import('./pages/admin/PrintersPage').then((m) => ({
    default: m.PrintersPage,
  })),
);
const AuditLogPage = lazy(() =>
  import('./pages/admin/AuditLogPage').then((m) => ({
    default: m.AuditLogPage,
  })),
);
const TrashPage = lazy(() =>
  import('./pages/admin/TrashPage').then((m) => ({ default: m.TrashPage })),
);
const PlatformDashboardPage = lazy(() =>
  import('./pages/platform/PlatformDashboardPage').then((m) => ({
    default: m.PlatformDashboardPage,
  })),
);
const AnnouncementsPage = lazy(() =>
  import('./pages/platform/AnnouncementsPage').then((m) => ({
    default: m.AnnouncementsPage,
  })),
);
const PlatformLibraryPage = lazy(() =>
  import('./pages/platform/PlatformLibraryPage').then((m) => ({
    default: m.PlatformLibraryPage,
  })),
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
const PlatformPlansPage = lazy(() =>
  import('./pages/platform/PlatformPlansPage').then((m) => ({
    default: m.PlatformPlansPage,
  })),
);
const SiteCoursesPage = lazy(() =>
  import('./pages/platform/SiteCoursesPage').then((m) => ({
    default: m.SiteCoursesPage,
  })),
);
const SiteClientsPage = lazy(() =>
  import('./pages/platform/SiteClientsPage').then((m) => ({
    default: m.SiteClientsPage,
  })),
);
const SubscriptionPage = lazy(() =>
  import('./pages/SubscriptionPage').then((m) => ({
    default: m.SubscriptionPage,
  })),
);
const PlatformControlPage = lazy(() =>
  import('./pages/platform/PlatformControlPage').then((m) => ({
    default: m.PlatformControlPage,
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
          <Route path="/sistema" element={<SistemaPage />} />
          <Route path="/cursos" element={<CursosPublicPage />} />
          <Route path="/clientes" element={<ClientesPublicPage />} />
          <Route path="/novidades" element={<NovidadesPage />} />
          <Route path="/novidades/:slug" element={<ArticlePage />} />
          <Route path="/contato" element={<ContatoPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>

        {/* Split de portais (pedido da Ariane): /acessar escolhe entre
            "Sou cliente" (programa de etiquetas) e "Sou nutricionista"
            (checklists/rotinas). /login sem portal segue como fallback
            genérico para bookmarks e para o redirect do ProtectedRoute. */}
        <Route path="/acessar" element={<AccessPortalPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/login/:portal" element={<LoginPage />} />
        <Route path="/redefinir-senha" element={<ResetPasswordPage />} />
        <Route path="/etiqueta/:id" element={<PublicLabelPage />} />
        <Route path="/selo/:id" element={<PublicSealPage />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/painel" element={<DashboardPage />} />
            <Route path="/produtos" element={<ProductsPage />} />
            {/* Fluxo único de etiquetas: o wizard. A rota legada
                /imprimir foi aposentada (decisão da cliente). Mantemos
                o redirect pra não quebrar bookmarks/atalhos. */}
            <Route
              path="/imprimir"
              element={<Navigate to="/imprimir/novo" replace />}
            />
            <Route path="/imprimir/novo" element={<PrintWizardPage />} />
            <Route path="/fotos" element={<PhotosPage />} />
            <Route path="/temperatura" element={<TemperaturePage />} />
            <Route path="/checklists" element={<ChecklistsPage />} />
            <Route path="/relatorios" element={<ReportsPage />} />
            <Route path="/documentos" element={<DocumentsPage />} />
            <Route path="/ajuda" element={<HelpPage />} />
            <Route path="/visitas" element={<AuditsPage />} />
            <Route path="/visitas/:id" element={<AuditDetailPage />} />
            <Route path="/agenda" element={<AgendaPage />} />
            <Route path="/controle-pragas" element={<PestControlPage />} />
            <Route
              path="/nao-conformidades"
              element={<NonConformitiesPage />}
            />
            <Route path="/manipuladores" element={<ManipulatorsPage />} />
            <Route path="/recebimentos" element={<RecebimentosPage />} />
            <Route path="/rastreabilidade" element={<RastreabilidadePage />} />
            <Route path="/dossie" element={<DossiePage />} />
            <Route
              path="/recebimentos/novo"
              element={<RecebimentoFormPage />}
            />
            <Route
              path="/recebimentos/:id"
              element={<RecebimentoDetailPage />}
            />
            <Route path="/estoque" element={<EstoquePage />} />
            <Route
              path="/estoque/movimentacoes"
              element={<EstoqueMovimentacoesPage />}
            />
            <Route path="/validades" element={<ValidadesPage />} />
            <Route path="/producao" element={<ProducaoPage />} />
            <Route path="/contagem" element={<ContagemPage />} />
            <Route path="/controlados" element={<ControladosPage />} />
          </Route>
        </Route>

        {/* Admin routes (platform_admin AND nutritionist) */}
        <Route element={<ProtectedRoute nutritionistOrAdmin />}>
          <Route element={<Layout />}>
            <Route path="/admin/empresas" element={<CompaniesPage />} />
            {/* Modelo de visita é roteiro técnico: só nutri e platform_admin
                criam. A rota estática vence /visitas/:id no ranking do
                React Router, independente da ordem de declaração. */}
            <Route path="/visitas/modelos" element={<AuditTemplatesPage />} />
            {/* Fluxo guiado: empresa → checklist → avaliar (só RT/admin). */}
            <Route path="/vistorias/nova" element={<NewInspectionPage />} />
            {/* Ficha técnica é entregável da RT: ela padroniza o preparo. */}
            <Route path="/fichas" element={<RecipesPage />} />
            <Route
              path="/nao-conformidades/modelos"
              element={<NcTemplatesPage />}
            />
            <Route path="/admin/novidades" element={<ArticlesAdminPage />} />
            <Route path="/admin/assinatura" element={<SubscriptionPage />} />
            <Route path="/admin/hardware" element={<HardwarePage />} />
          </Route>
        </Route>

        {/* Gestão de usuários: property_manager também acessa (cria/
            edita os usuários `property` da própria empresa). */}
        <Route element={<ProtectedRoute canManageUsersOnly />}>
          <Route element={<Layout />}>
            <Route path="/admin/usuarios" element={<UsersPage />} />
          </Route>
        </Route>

        {/* Cadastros acessíveis a property também (UI gateia escrita por role) */}
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/fornecedores" element={<SuppliersPage />} />
            <Route path="/cadastros/grupos" element={<GruposPage />} />
            <Route path="/admin/impressoras" element={<PrintersPage />} />
          </Route>
        </Route>

        {/* Platform admin only */}
        <Route element={<ProtectedRoute masterOnly />}>
          <Route element={<Layout />}>
            <Route path="/admin/trilha" element={<AuditLogPage />} />
            <Route path="/admin/lixeira" element={<TrashPage />} />
            <Route path="/platform/centro" element={<PlatformControlPage />} />
            <Route
              path="/platform/dashboard"
              element={<PlatformDashboardPage />}
            />
            <Route
              path="/platform/comunicados"
              element={<AnnouncementsPage />}
            />
            <Route
              path="/platform/biblioteca"
              element={<PlatformLibraryPage />}
            />
            <Route
              path="/platform/organizacoes"
              element={<OrganizationsPage />}
            />
            <Route
              path="/platform/organizacoes/:id"
              element={<OrganizationDetailPage />}
            />
            <Route path="/platform/planos" element={<PlatformPlansPage />} />
            <Route path="/platform/cursos" element={<SiteCoursesPage />} />
            <Route path="/platform/clientes" element={<SiteClientsPage />} />
          </Route>
        </Route>
      </Routes>
    </Suspense>
  );
}
