// File: src/components/ProtectedRoute.jsx
// Purpose: Route guard — redirects unauthenticated users to /admin/login
// Dependencies: react, react-router-dom, ../hooks/useAuth

import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

/**
 * ProtectedRoute — wraps admin routes that require authentication.
 * Preserves the attempted URL so the user returns after login.
 *
 * Usage:
 *   <Route element={<ProtectedRoute />}>
 *     <Route path="/admin/dashboard" element={<Dashboard />} />
 *   </Route>
 */
export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  // While auth state is resolving, render nothing to avoid flash
  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-teal border-t-transparent rounded-full animate-spin" />
          <p className="font-mono text-xs text-text-dim">Verifying access…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    // Pass the current location so Login can redirect back after auth
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  return children;
}
