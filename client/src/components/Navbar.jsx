import { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';

const NAV_LINKS = [
  { to: '/',       label: 'Home' },
  { to: '/map',    label: 'Live Map' },
  { to: '/report', label: 'Report' },
  { to: '/about',  label: 'About' },
];

function LogoMark() {
  return (
    <svg width="28" height="28" viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="#0a7e6e" />
      <path
        d="M8 20 Q10 16 12 20 Q14 24 16 20 Q18 16 20 20 Q22 24 24 20"
        stroke="white" strokeWidth="2.5" strokeLinecap="round" fill="none"
      />
      <circle cx="16" cy="12" r="3" fill="white" />
      <path d="M16 9 L16 6" stroke="white" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function NavItem({ to, label, onClick }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        `font-body font-medium text-sm transition-colors duration-150 ${
          isActive
            ? 'text-teal'
            : 'text-text-mid hover:text-text'
        }`
      }
    >
      {label}
    </NavLink>
  );
}

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-border shadow-sm">
      <nav
        className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between"
        aria-label="Main navigation"
      >
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 group" aria-label="NairobiAlert home">
          <LogoMark />
          <span className="font-display text-lg text-text leading-none tracking-tight">
            NairobiAlert
          </span>
        </Link>

        {/* Desktop links */}
        <div className="hidden sm:flex items-center gap-6">
          {NAV_LINKS.map((l) => (
            <NavItem key={l.to} {...l} />
          ))}
          <Link
            to="/report"
            className="font-body font-semibold text-sm bg-teal text-white px-4 py-1.5 rounded-radius hover:bg-teal-dark transition-colors duration-150"
          >
            Report Now
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          type="button"
          className="sm:hidden flex items-center justify-center w-9 h-9 rounded-radius text-text-mid hover:text-text hover:bg-teal-light transition-colors duration-150"
          onClick={() => setMenuOpen((o) => !o)}
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
        >
          {menuOpen ? (
            <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
            </svg>
          )}
        </button>
      </nav>

      {/* Mobile menu */}
      {menuOpen && (
        <div
          id="mobile-menu"
          className="sm:hidden bg-white border-t border-border px-4 py-3 flex flex-col gap-3"
        >
          {NAV_LINKS.map((l) => (
            <NavItem key={l.to} {...l} onClick={() => setMenuOpen(false)} />
          ))}
          <Link
            to="/report"
            onClick={() => setMenuOpen(false)}
            className="font-body font-semibold text-sm bg-teal text-white px-4 py-2 rounded-radius text-center hover:bg-teal-dark transition-colors duration-150"
          >
            Report Now
          </Link>
        </div>
      )}
    </header>
  );
}
