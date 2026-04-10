// File: src/components/IncidentCard.jsx
// Purpose: Card component for displaying a single incident with severity, zone, and description
// Dependencies: react, ./StatusBadge

import StatusBadge from './StatusBadge';

const TYPE_LABELS = {
  flood:     'Flood',
  landslide: 'Landslide',
  blocked:   'Road Blocked',
  rescue:    'Rescue Needed',
  shelter:   'Shelter Request',
  other:     'Other',
};

/**
 * Format a Firestore Timestamp or Date to a readable string.
 */
function formatTime(timestamp) {
  if (!timestamp) return '—';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleString('en-KE', {
    day:    'numeric',
    month:  'short',
    hour:   '2-digit',
    minute: '2-digit',
  });
}

/**
 * IncidentCard — used in sidebar list and admin tables.
 *
 * @param {object}   incident - incident document from Firestore
 * @param {function} [onClick] - optional click handler (e.g., map flyTo)
 * @param {boolean}  [compact] - renders a slimmer layout for list views
 */
export default function IncidentCard({ incident, onClick, compact = false }) {
  const typeLabel = TYPE_LABELS[incident.type] ?? incident.type;

  if (compact) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="w-full text-left bg-white border border-border rounded-radius p-3 shadow-sm hover:border-teal hover:shadow-md transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-teal focus:ring-offset-1"
      >
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="font-body font-semibold text-xs text-text truncate">
            {typeLabel} — {incident.zone_name}
          </span>
          <StatusBadge variant="severity" value={incident.severity} />
        </div>
        <p className="font-mono text-xs text-text-dim truncate">
          {formatTime(incident.created_at)}
        </p>
      </button>
    );
  }

  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === 'Enter' && onClick() : undefined}
      className={`bg-white border border-border rounded-radius p-4 shadow-sm ${onClick ? 'hover:border-teal hover:shadow-md cursor-pointer focus:outline-none focus:ring-2 focus:ring-teal' : ''} transition-all duration-150`}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="min-w-0">
          <h3 className="font-body font-semibold text-sm text-text leading-snug">
            {typeLabel}
          </h3>
          <p className="font-mono text-xs text-text-dim mt-0.5">{incident.zone_name}</p>
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <StatusBadge variant="severity" value={incident.severity} />
          <StatusBadge variant="status"   value={incident.status} />
        </div>
      </div>

      <p className="font-body text-xs text-text-mid leading-relaxed line-clamp-2">
        {incident.description}
      </p>

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
        <span className="font-mono text-xs text-text-dim">{formatTime(incident.created_at)}</span>
        {incident.people_affected > 0 && (
          <span className="font-mono text-xs text-text-mid">
            {incident.people_affected} affected
          </span>
        )}
      </div>
    </div>
  );
}
