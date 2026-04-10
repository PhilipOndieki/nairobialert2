// File: src/layouts/AdminLayout.jsx
// Purpose: Sidebar layout for all authenticated admin pages with navigation and logout
// Dependencies: react, react-router-dom, ../hooks/useAuth

import { useState } from 'react';
import { NavLink, Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const NAV_ITEMS = [
  {
    to:    '/admin/dashboard',
    label: 'Dashboard',
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
        <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
      </svg>
    ),
  },
  {
    to:    '/admin/incidents',
    label: 'Incidents',
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
      </svg>
    ),
  },
  {
    to:    '/admin/teams',
    label: 'Teams',
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
        <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
      </svg>
    ),
  },
  {
    to:    '/admin/shelters',
    label: 'Shelters',
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
        <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
      </svg>
    ),
  },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  async function handleLogout() {
    await logout();
    navigate('/admin/login');
  }

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className="px-4 py-4 border-b border-border">
        <Link to="/" className="flex items-center gap-2">
          <svg width="24" height="24" viewBox="0 0 32 32" fill="none">
            <rect width="32" height="32" rx="8" fill="#0a7e6e" />
            <path d="M8 20 Q10 16 12 20 Q14 24 16 20 Q18 16 20 20 Q22 24 24 20" stroke="white" strokeWidth="2.5" strokeLinecap="round" fill="none" />
            <circle cx="16" cy="12" r="3" fill="white" />
            <path d="M16 9 L16 6" stroke="white" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <div>
            <p className="font-display text-sm text-text leading-none">NairobiAlert</p>
            <p className="font-mono text-xs text-text-dim leading-none mt-0.5">Admin</p>
          </div>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1" aria-label="Admin navigation">
        {NAV_ITEMS.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-radius text-sm font-body font-medium transition-colors duration-150 ${
                isActive
                  ? 'bg-teal-light text-teal'
                  : 'text-text-mid hover:bg-bg hover:text-text'
              }`
            }
          >
            {icon}
            {label}
          </NavLink>
        ))}
      </nav>

      {/* User + Logout */}
      <div className="px-3 py-4 border-t border-border">
        <p className="font-mono text-xs text-text-dim truncate mb-2 px-1">
          {user?.email}
        </p>
        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-radius text-sm font-body font-medium text-text-mid hover:bg-red-light hover:text-red transition-colors duration-150"
        >
          <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M3 3a1 1 0 011 1v12a1 1 0 11-2 0V4a1 1 0 011-1zm7.707 3.293a1 1 0 010 1.414L9.414 9H17a1 1 0 110 2H9.414l1.293 1.293a1 1 0 01-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          Logout
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen flex bg-bg">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:flex-col w-56 bg-white border-r border-border flex-shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-text/40"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
          <aside className="relative z-10 flex flex-col w-56 bg-white border-r border-border">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar */}
        <div className="lg:hidden flex items-center gap-3 px-4 h-14 bg-white border-b border-border">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="flex items-center justify-center w-9 h-9 rounded-radius text-text-mid hover:text-text hover:bg-teal-light transition-colors duration-150"
            aria-label="Open sidebar"
          >
            <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
            </svg>
          </button>
          <span className="font-display text-sm text-text">Admin Panel</span>
        </div>

        <main className="flex-1 p-4 sm:p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
