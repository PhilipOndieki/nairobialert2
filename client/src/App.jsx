import { lazy, Suspense } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import ProtectedRoute from './components/ProtectedRoute';
import PublicLayout from './layouts/PublicLayout';
import AdminLayout from './layouts/AdminLayout';

/* ── Lazy-loaded page components ─────────────────────────────────────────── */
// React.lazy + Suspense: code-split every page for optimal initial load
const Home       = lazy(() => import('./pages/Home'));
const MapPage    = lazy(() => import('./pages/Map'));
const Report     = lazy(() => import('./pages/Report'));
const About      = lazy(() => import('./pages/About'));
const AdminLogin = lazy(() => import('./pages/admin/Login'));
const Dashboard  = lazy(() => import('./pages/admin/Dashboard'));
const Incidents  = lazy(() => import('./pages/admin/Incidents'));
const Teams      = lazy(() => import('./pages/admin/Teams'));
const Shelters   = lazy(() => import('./pages/admin/Shelters'));

/* ── Page loading fallback ───────────────────────────────────────────────── */
function PageLoader() {
  return (
    <div className="min-h-[40vh] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-teal border-t-transparent rounded-full animate-spin" />
        <p className="font-mono text-xs text-text-dim">Loading…</p>
      </div>
    </div>
  );
}

/* ── 404 Not Found ───────────────────────────────────────────────────────── */
function NotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
      <p className="font-mono text-6xl text-border-dark mb-4">404</p>
      <h1 className="font-display text-display-md text-text mb-2">Page Not Found</h1>
      <p className="font-body text-text-mid text-sm mb-6">
        The page you're looking for doesn't exist.
      </p>
      <a href="/" className="font-body font-semibold text-sm text-teal hover:text-teal-dark transition-colors duration-150">
        ← Back to Home
      </a>
    </div>
  );
}

/* Router ──────────────────────────────────────────────────────────────── */
const router = createBrowserRouter([
  // ── Public routes
  {
    element: <PublicLayout />,
    children: [
      {
        path: '/',
        element: (
          <Suspense fallback={<PageLoader />}>
            <Home />
          </Suspense>
        ),
      },
      {
        path: '/map',
        element: (
          <Suspense fallback={<PageLoader />}>
            <MapPage />
          </Suspense>
        ),
      },
      {
        path: '/report',
        element: (
          <Suspense fallback={<PageLoader />}>
            <Report />
          </Suspense>
        ),
      },
      {
        path: '/about',
        element: (
          <Suspense fallback={<PageLoader />}>
            <About />
          </Suspense>
        ),
      },
      {
        path: '*',
        element: <NotFound />,
      },
    ],
  },

  // ── Admin login (no layout wrapper — standalone centered card)
  {
    path: '/admin/login',
    element: (
      <Suspense fallback={<PageLoader />}>
        <AdminLogin />
      </Suspense>
    ),
  },

  // ── Protected admin routes
  {
    element: (
      <ProtectedRoute>
        <AdminLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        path: '/admin/dashboard',
        element: (
          <Suspense fallback={<PageLoader />}>
            <Dashboard />
          </Suspense>
        ),
      },
      {
        path: '/admin/incidents',
        element: (
          <Suspense fallback={<PageLoader />}>
            <Incidents />
          </Suspense>
        ),
      },
      {
        path: '/admin/teams',
        element: (
          <Suspense fallback={<PageLoader />}>
            <Teams />
          </Suspense>
        ),
      },
      {
        path: '/admin/shelters',
        element: (
          <Suspense fallback={<PageLoader />}>
            <Shelters />
          </Suspense>
        ),
      },
    ],
  },
]);

/* App root ────────────────────────────────────────────────────────────── */
export default function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
}
