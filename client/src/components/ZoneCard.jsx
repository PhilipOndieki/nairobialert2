import StatusBadge from './StatusBadge';

const RISK_ICONS = {
  critical: (
    <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
    </svg>
  ),
  warning: (
    <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
    </svg>
  ),
  watch: (
    <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
      <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
    </svg>
  ),
  safe: (
    <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
    </svg>
  ),
};

const RISK_ACCENT = {
  critical: 'border-l-red',
  warning:  'border-l-amber',
  watch:    'border-l-teal',
  safe:     'border-l-green',
};

const RISK_ICON_COLOR = {
  critical: 'text-red',
  warning:  'text-amber',
  watch:    'text-teal',
  safe:     'text-green',
};

/**
 * ZoneCard — displays zone name, risk level, and population.
 *
 * @param {object} zone - zone document from Firestore
 */
export default function ZoneCard({ zone }) {
  const accentClass    = RISK_ACCENT[zone.risk_level]    ?? 'border-l-border-dark';
  const iconColorClass = RISK_ICON_COLOR[zone.risk_level] ?? 'text-text-mid';

  return (
    <div
      className={`bg-white border border-border border-l-4 ${accentClass} rounded-radius p-4 shadow-sm hover:shadow-md transition-shadow duration-150`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`flex-shrink-0 ${iconColorClass}`}>
            {RISK_ICONS[zone.risk_level]}
          </span>
          <h3 className="font-body font-semibold text-text text-sm leading-snug truncate">
            {zone.name}
          </h3>
        </div>
        <StatusBadge variant="risk" value={zone.risk_level} className="flex-shrink-0" />
      </div>

      {zone.population && (
        <p className="mt-2 font-mono text-xs text-text-dim">
          Pop. {zone.population}
        </p>
      )}
    </div>
  );
}
