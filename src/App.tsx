import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { FullPageSpinner } from './components/ui/Spinner';
import { LoginPage } from './pages/LoginPage';

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
const CompaniesPage = lazy(() =>
  import('./pages/admin/CompaniesPage').then((m) => ({
    default: m.CompaniesPage,
  })),
);
const UsersPage = lazy(() =>
  import('./pages/admin/UsersPage').then((m) => ({ default: m.UsersPage })),
);

export default function App() {
  return (
    <Suspense fallback={<FullPageSpinner />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/redefinir-senha" element={<ResetPasswordPage />} />
        <Route path="/etiqueta/:id" element={<PublicLabelPage />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/produtos" element={<ProductsPage />} />
            <Route path="/imprimir" element={<PrintLabelPage />} />
            <Route path="/fotos" element={<PhotosPage />} />
            <Route path="/temperatura" element={<TemperaturePage />} />
            <Route path="/checklists" element={<ChecklistsPage />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute masterOnly />}>
          <Route element={<Layout />}>
            <Route path="/admin/empresas" element={<CompaniesPage />} />
            <Route path="/admin/usuarios" element={<UsersPage />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
