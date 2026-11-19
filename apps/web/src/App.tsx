import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router'

const LoginPage = lazy(() =>
  import('./pages/AuthPages').then((module) => ({ default: module.LoginPage })),
)
const RegisterPage = lazy(() =>
  import('./pages/AuthPages').then((module) => ({ default: module.RegisterPage })),
)
const ProtectedAccountRoute = lazy(() =>
  import('./pages/AuthPages').then((module) => ({ default: module.ProtectedRoute })),
)

const DesignSystemPage = lazy(() =>
  import('./pages/DesignSystemPage').then((module) => ({ default: module.DesignSystemPage })),
)
const HomePage = lazy(() =>
  import('./pages/HomePage').then((module) => ({ default: module.HomePage })),
)
const PropertySearchPage = lazy(() =>
  import('./pages/PropertySearchPage').then((module) => ({ default: module.PropertySearchPage })),
)
const PropertyDetailsPage = lazy(() =>
  import('./pages/PropertyDetailsPage').then((module) => ({ default: module.PropertyDetailsPage })),
)
const NotFoundPage = lazy(() =>
  import('./pages/NotFoundPage').then((module) => ({ default: module.NotFoundPage })),
)
const ProtectedAdvertiserRoute = lazy(() =>
  import('./pages/AdvertiserPages').then((module) => ({
    default: module.ProtectedAdvertiserRoute,
  })),
)
const AdvertiserLayout = lazy(() =>
  import('./pages/AdvertiserPages').then((module) => ({ default: module.AdvertiserLayout })),
)
const AdvertiserDashboardPage = lazy(() =>
  import('./pages/AdvertiserPages').then((module) => ({ default: module.AdvertiserDashboardPage })),
)
const AdvertiserPropertiesPage = lazy(() =>
  import('./pages/AdvertiserPages').then((module) => ({
    default: module.AdvertiserPropertiesPage,
  })),
)
const AdvertiserPropertyFormPage = lazy(() =>
  import('./pages/AdvertiserPages').then((module) => ({
    default: module.AdvertiserPropertyFormPage,
  })),
)
const AdvertiserVerificationPage = lazy(() =>
  import('./pages/AdvertiserPages').then((module) => ({
    default: module.AdvertiserVerificationPage,
  })),
)
const ProtectedAdminRoute = lazy(() =>
  import('./pages/AdminPages').then((module) => ({ default: module.ProtectedAdminRoute })),
)
const AdminLayout = lazy(() =>
  import('./pages/AdminPages').then((module) => ({ default: module.AdminLayout })),
)
const AdminDashboardPage = lazy(() =>
  import('./pages/AdminPages').then((module) => ({ default: module.AdminDashboardPage })),
)
const AdminPropertiesPage = lazy(() =>
  import('./pages/AdminPages').then((module) => ({ default: module.AdminPropertiesPage })),
)
const AdminVerificationPage = lazy(() =>
  import('./pages/AdminPages').then((module) => ({ default: module.AdminVerificationPage })),
)
const AdminReportsPage = lazy(() =>
  import('./pages/AdminPages').then((module) => ({ default: module.AdminReportsPage })),
)
const AdminUsersPage = lazy(() =>
  import('./pages/AdminPages').then((module) => ({ default: module.AdminUsersPage })),
)
const AdminAuditPage = lazy(() =>
  import('./pages/AdminPages').then((module) => ({ default: module.AdminAuditPage })),
)

export default function App() {
  return (
    <Suspense
      fallback={
        <div className="route-fallback" role="status">
          A preparar a pré-visualização…
        </div>
      }
    >
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/pesquisa" element={<PropertySearchPage />} />
        <Route path="/imoveis/:slug" element={<PropertyDetailsPage />} />
        <Route path="/design-system" element={<DesignSystemPage />} />
        <Route path="/entrar" element={<LoginPage />} />
        <Route path="/registar" element={<RegisterPage />} />
        <Route path="/conta" element={<ProtectedAccountRoute />} />
        <Route element={<ProtectedAdvertiserRoute />}>
          <Route path="/anunciante" element={<AdvertiserLayout />}>
            <Route index element={<AdvertiserDashboardPage />} />
            <Route path="imoveis" element={<AdvertiserPropertiesPage />} />
            <Route path="imoveis/novo" element={<AdvertiserPropertyFormPage />} />
            <Route path="imoveis/:propertyId/editar" element={<AdvertiserPropertyFormPage />} />
            <Route path="verificacao" element={<AdvertiserVerificationPage />} />
          </Route>
        </Route>
        <Route element={<ProtectedAdminRoute />}>
          <Route path="/administracao" element={<AdminLayout />}>
            <Route index element={<AdminDashboardPage />} />
            <Route path="imoveis" element={<AdminPropertiesPage />} />
            <Route path="verificacao" element={<AdminVerificationPage />} />
            <Route path="denuncias" element={<AdminReportsPage />} />
            <Route path="utilizadores" element={<AdminUsersPage />} />
            <Route path="auditoria" element={<AdminAuditPage />} />
          </Route>
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  )
}
