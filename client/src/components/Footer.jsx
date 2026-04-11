// File: src/components/Footer.jsx
// Change: Removed local useState and DonationModal render.
//         Now receives onDonate prop from PublicLayout.

import { Link } from 'react-router-dom';

export default function Footer({ onDonate }) {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-white border-t border-border mt-auto">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mb-6">
          {/* Brand */}
          <div>
            <p className="font-display text-base text-text mb-1">NairobiAlert</p>
            <p className="font-body text-xs text-text-dim leading-relaxed">
              Real-time flood crisis response coordination for Nairobi, Kenya.
            </p>
            <button
              type="button"
              onClick={onDonate}
              className="mt-3 inline-flex items-center gap-1.5 font-body font-semibold text-xs bg-teal text-white px-3 py-1.5 rounded-radius hover:bg-teal-dark transition-colors duration-150"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
              Support this project
            </button>
          </div>

          {/* Quick links */}
          <div>
            <p className="font-body font-semibold text-xs text-text-mid uppercase tracking-widest mb-2">
              Quick Links
            </p>
            <ul className="space-y-1">
              {[
                { to: '/',       label: 'Home' },
                { to: '/map',    label: 'Live Map' },
                { to: '/report', label: 'Report Incident' },
                { to: '/about',  label: 'About' },
              ].map(({ to, label }) => (
                <li key={to}>
                  <Link
                    to={to}
                    className="font-body text-xs text-text-mid hover:text-teal transition-colors duration-150"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Emergency */}
          <div>
            <p className="font-body font-semibold text-xs text-text-mid uppercase tracking-widest mb-2">
              Emergency Contacts
            </p>
            <ul className="space-y-1">
              <li className="font-mono text-xs text-text-mid">
                Kenya Red Cross: <span className="text-text">1199</span>
              </li>
              <li className="font-mono text-xs text-text-mid">
                Police Emergency: <span className="text-text">999 / 112</span>
              </li>
              <li className="font-mono text-xs text-text-mid">
                USSD Report: <span className="text-text">*384#</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-border pt-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="font-mono text-xs text-text-dim">
            © {year} NairobiAlert. For emergency use.
          </p>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={onDonate}
              className="font-mono text-xs text-teal hover:text-teal-dark transition-colors duration-150"
            >
              Donate
            </button>
            <Link
              to="/admin/login"
              className="font-mono text-xs text-text-dim hover:text-teal transition-colors duration-150"
              aria-label="Admin login"
            >
              Admin
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}