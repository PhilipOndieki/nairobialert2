import { Link } from 'react-router-dom';

export default function Footer() {
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
          {/* Admin link — intentionally small and unobtrusive */}
          <Link
            to="/admin/login"
            className="font-mono text-xs text-text-dim hover:text-teal transition-colors duration-150"
            aria-label="Admin login"
          >
            Admin
          </Link>
        </div>
      </div>
    </footer>
  );
}
