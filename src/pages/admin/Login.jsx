// File: src/pages/admin/Login.jsx
// Purpose: Admin login page — Firebase email/password auth, redirects to dashboard on success
// Dependencies: react, react-router-dom, ../../hooks/useAuth

import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export default function AdminLogin() {
  const { user, loading, login, error: authError } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();
  const from      = location.state?.from?.pathname ?? '/admin/dashboard';

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [busy,     setBusy]     = useState(false);
  const [error,    setError]    = useState(null);

  // If already logged in, redirect immediately
  useEffect(() => {
    if (!loading && user) {
      navigate(from, { replace: true });
    }
  }, [user, loading, navigate, from]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await login(email.trim(), password);
      navigate(from, { replace: true });
    } catch {
      // error is set in useAuth hook; mirror it locally for display
      setError(null); // will be populated by authError watch below
    } finally {
      setBusy(false);
    }
  }

  // Sync auth hook error into local display error
  useEffect(() => {
    if (authError) setError(authError);
  }, [authError]);

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-teal border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center px-4">
      {/* Card */}
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-4">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
              <rect width="32" height="32" rx="8" fill="#0a7e6e" />
              <path d="M8 20 Q10 16 12 20 Q14 24 16 20 Q18 16 20 20 Q22 24 24 20" stroke="white" strokeWidth="2.5" strokeLinecap="round" fill="none" />
              <circle cx="16" cy="12" r="3" fill="white" />
              <path d="M16 9 L16 6" stroke="white" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <span className="font-display text-xl text-text">NairobiAlert</span>
          </Link>
          <h1 className="font-display text-display-md text-text">Admin Login</h1>
          <p className="font-body text-sm text-text-mid mt-1">Authorised personnel only</p>
        </div>

        <form
          onSubmit={handleSubmit}
          noValidate
          className="bg-white border border-border rounded-radius-lg shadow-md p-6 space-y-4"
          aria-label="Admin login form"
        >
          {/* Error */}
          {error && (
            <div
              className="bg-red-light border border-red/20 rounded-radius px-3 py-2.5 font-body text-sm text-red"
              role="alert"
            >
              {error}
            </div>
          )}

          {/* Email */}
          <div>
            <label htmlFor="email" className="block font-body font-medium text-sm text-text mb-1.5">
              Email address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
              disabled={busy}
              placeholder="admin@nairobialert.co.ke"
              className="w-full font-body text-sm bg-bg border border-border rounded-radius px-3 py-2.5 text-text placeholder-text-dim focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent transition-colors duration-150 disabled:opacity-60"
            />
          </div>

          {/* Password */}
          <div>
            <label htmlFor="password" className="block font-body font-medium text-sm text-text mb-1.5">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              disabled={busy}
              placeholder="••••••••"
              className="w-full font-body text-sm bg-bg border border-border rounded-radius px-3 py-2.5 text-text placeholder-text-dim focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent transition-colors duration-150 disabled:opacity-60"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={busy || !email || !password}
            className="w-full font-body font-semibold text-sm bg-teal text-white py-2.5 rounded-radius hover:bg-teal-dark focus:outline-none focus:ring-2 focus:ring-teal focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-150"
          >
            {busy ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Signing in…
              </span>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        {/* Back link */}
        <div className="text-center mt-4">
          <Link to="/" className="font-body text-xs text-text-dim hover:text-teal transition-colors duration-150">
            ← Back to public site
          </Link>
        </div>
      </div>
    </div>
  );
}
