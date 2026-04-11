/**
 * Color maps for each variant type.
 * All classes must be full strings (no dynamic interpolation) for Tailwind purging.
 */
const SEVERITY_CLASSES = {
  critical: 'bg-red-light text-red border border-red/20',
  warning:  'bg-amber-light text-amber border border-amber/20',
  info:     'bg-teal-light text-teal border border-teal/20',
};

const STATUS_CLASSES = {
  pending:  'bg-amber-light text-amber border border-amber/20',
  open:     'bg-teal-light text-teal border border-teal/20',
  rejected: 'bg-red-light text-red border border-red/20',
  resolved: 'bg-green-light text-green border border-green/20',
};

const RISK_CLASSES = {
  critical: 'bg-red-light text-red border border-red/20',
  warning:  'bg-amber-light text-amber border border-amber/20',
  watch:    'bg-teal-light text-teal border border-teal/20',
  safe:     'bg-green-light text-green border border-green/20',
};

const TEAM_STATUS_CLASSES = {
  standby:  'bg-border text-text-mid border border-border-dark',
  deployed: 'bg-teal-light text-teal border border-teal/20',
  enroute:  'bg-amber-light text-amber border border-amber/20',
};

/**
 * StatusBadge
 *
 * @param {'severity'|'status'|'risk'|'team'} variant - which color map to use
 * @param {string} value - the key within the chosen color map
 * @param {string} [className] - extra Tailwind classes
 */
export default function StatusBadge({ variant = 'status', value, className = '' }) {
  const maps = {
    severity: SEVERITY_CLASSES,
    status:   STATUS_CLASSES,
    risk:     RISK_CLASSES,
    team:     TEAM_STATUS_CLASSES,
  };
  const colorClass = maps[variant]?.[value] ?? 'bg-border text-text-mid border border-border-dark';
  const label = value ? value.charAt(0).toUpperCase() + value.slice(1) : '—';

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full font-mono text-xs font-medium tracking-wide ${colorClass} ${className}`}
    >
      {label}
    </span>
  );
}
