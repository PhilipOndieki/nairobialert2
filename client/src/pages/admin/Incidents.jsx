import { useState, useEffect } from 'react';
import { useAllIncidents } from '../../hooks/useIncidents';
import { useAuth } from '../../hooks/useAuth';
import {
  verifyIncident,
  rejectIncident,
  resolveIncident,
  dispatchTeamToIncident,
  recallTeam,
  markTeamDeployed,
} from '../../firebase/incidents';
import { subscribeToTeams } from '../../firebase/teams';
import StatusBadge from '../../components/StatusBadge';
import { MapContainer, TileLayer, CircleMarker } from 'react-leaflet';

const STATUS_TABS = ['pending', 'open', 'rejected', 'resolved'];

function formatTime(ts) {
  if (!ts?.toDate) return '—';
  return ts.toDate().toLocaleString('en-KE', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function timeAgo(ts) {
  if (!ts?.toDate) return '—';
  const diff = Math.floor((Date.now() - ts.toDate().getTime()) / 1000);
  if (diff < 60)    return `${diff}s ago`;
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Dispatch Team Modal
// ─────────────────────────────────────────────────────────────────────────────

function DispatchModal({ incident, teams, onDispatch, onClose, busy }) {
  const [selectedTeamId, setSelectedTeamId] = useState('');

  const availableTeams = teams.filter((t) => t.status === 'standby');
  const busyTeams      = teams.filter((t) => t.status !== 'standby');

  const selectedTeam = teams.find((t) => t.id === selectedTeamId);

  function handleConfirm() {
    if (!selectedTeam) return;
    onDispatch(selectedTeam);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      role="dialog"
      aria-modal="true"
      aria-label="Dispatch team"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-text/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative bg-white border border-border rounded-radius-lg shadow-lg w-full max-w-md overflow-y-auto max-h-[90vh]">

        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-border">
          <div>
            <h2 className="font-display text-lg text-text leading-none">Dispatch a Team</h2>
            <p className="font-mono text-xs text-text-dim mt-1">
              {incident.type} — {incident.zone_name}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-radius text-text-mid hover:text-text hover:bg-bg transition-colors duration-150"
            aria-label="Close"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="px-5 py-4 space-y-5">

          {/* Incident summary */}
          <div className="bg-bg border border-border rounded-radius px-3 py-3 space-y-1.5">
            <div className="flex items-center gap-2">
              <StatusBadge variant="severity" value={incident.severity} />
              <span className="font-body font-semibold text-xs text-text">
                {incident.type} — {incident.zone_name}
              </span>
            </div>
            <p className="font-body text-xs text-text-mid leading-relaxed line-clamp-2">
              {incident.description}
            </p>
            {incident.people_affected > 0 && (
              <p className="font-mono text-xs text-text-dim">
                {incident.people_affected} people affected
              </p>
            )}
          </div>

          {/* Available teams */}
          <div>
            <p className="font-body font-medium text-sm text-text mb-2">
              Select a team
              <span className="font-normal text-text-dim ml-1.5 text-xs">
                ({availableTeams.length} available)
              </span>
            </p>

            {availableTeams.length === 0 ? (
              <div className="bg-amber-light border border-amber/20 rounded-radius px-3 py-3">
                <p className="font-body text-sm font-medium text-amber mb-1">
                  No teams on standby
                </p>
                <p className="font-body text-xs text-text-mid">
                  All teams are currently deployed or en route.
                  Recall a team first, or wait for one to become available.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {availableTeams.map((team) => (
                  <label
                    key={team.id}
                    className={`flex items-start gap-3 p-3 border-2 rounded-radius cursor-pointer transition-all duration-150 ${
                      selectedTeamId === team.id
                        ? 'border-teal bg-teal-light'
                        : 'border-border bg-white hover:border-border-dark'
                    }`}
                  >
                    <input
                      type="radio"
                      name="team"
                      value={team.id}
                      checked={selectedTeamId === team.id}
                      onChange={() => setSelectedTeamId(team.id)}
                      className="mt-0.5 flex-shrink-0 text-teal focus:ring-teal"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-body font-semibold text-sm text-text">
                          {team.name}
                        </span>
                        <span className="font-mono text-xs text-text-dim">
                          {team.code}
                        </span>
                        <StatusBadge variant="team" value={team.status} />
                      </div>
                      <p className="font-body text-xs text-text-mid mt-0.5">
                        {team.organisation} · {team.members} members
                      </p>
                      {team.location && (
                        <p className="font-mono text-xs text-text-dim mt-0.5 truncate">
                          Currently at: {team.location}
                        </p>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Busy teams — collapsed, informational only */}
          {busyTeams.length > 0 && (
            <details className="group">
              <summary className="font-body text-xs text-text-dim cursor-pointer select-none hover:text-text transition-colors duration-150 list-none flex items-center gap-1">
                <svg className="w-3 h-3 transition-transform duration-150 group-open:rotate-90" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
                {busyTeams.length} team{busyTeams.length !== 1 ? 's' : ''} currently deployed or en route
              </summary>
              <div className="mt-2 space-y-1.5 pl-4">
                {busyTeams.map((team) => (
                  <div key={team.id} className="flex items-center gap-2 py-1.5 border-b border-border last:border-0">
                    <StatusBadge variant="team" value={team.status} />
                    <span className="font-body text-xs text-text-mid">{team.name}</span>
                    {team.dispatched_to_zone && (
                      <span className="font-mono text-xs text-text-dim truncate">
                        → {team.dispatched_to_zone}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </details>
          )}

          {/* What happens on dispatch — transparency for the admin */}
          {selectedTeam && (
            <div className="bg-teal-light border border-teal/20 rounded-radius px-3 py-2.5 space-y-1">
              <p className="font-body font-semibold text-xs text-teal">On dispatch:</p>
              <ul className="space-y-0.5">
                {[
                  `${selectedTeam.name} status → En Route`,
                  `Team task set to: "${incident.type} — ${incident.zone_name}"`,
                  `Team location updated to: ${incident.zone_name}`,
                  'Team marker appears on public map',
                  'Incident shows dispatched team name',
                ].map((line) => (
                  <li key={line} className="flex items-start gap-1.5">
                    <svg className="w-3 h-3 text-teal flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="font-body text-xs text-text-mid">{line}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 font-body font-medium text-sm text-text-mid border border-border rounded-radius py-2.5 hover:bg-bg transition-colors duration-150"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!selectedTeamId || busy || availableTeams.length === 0}
              className="flex-1 flex items-center justify-center gap-2 font-body font-semibold text-sm bg-teal text-white rounded-radius py-2.5 hover:bg-teal-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150 shadow-sm"
            >
              {busy ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Dispatching…
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                  </svg>
                  Dispatch {selectedTeam?.name ?? 'Team'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Dispatch status strip — shown inside expanded incident row when dispatched
// ─────────────────────────────────────────────────────────────────────────────

function DispatchStrip({ incident, teams, onRecall, onMarkDeployed, busy }) {
  const team = teams.find((t) => t.id === incident.dispatched_team_id);

  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3 bg-teal-light border-t border-teal/20">
      <div className="flex items-center gap-3">
        {/* Animated pulse for en-route */}
        {team?.status === 'enroute' && (
          <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal opacity-60" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-teal" />
          </span>
        )}
        {team?.status === 'deployed' && (
          <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green" />
          </span>
        )}

        <div>
          <p className="font-body font-semibold text-xs text-teal-dark leading-none">
            {incident.dispatched_team_name ?? 'Team'} dispatched
          </p>
          <p className="font-mono text-xs text-text-dim mt-0.5">
            {team
              ? `${team.organisation} · ${team.members} members`
              : 'Loading team data…'}
            {incident.dispatched_at && ` · ${timeAgo(incident.dispatched_at)}`}
          </p>
        </div>

        <StatusBadge variant="team" value={team?.status ?? 'enroute'} />
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Mark as arrived (enroute → deployed) */}
        {team?.status === 'enroute' && (
          <button
            type="button"
            disabled={busy}
            onClick={() => onMarkDeployed(team.id)}
            className="font-body text-xs font-semibold px-2.5 py-1 rounded bg-green-light text-green border border-green/20 hover:bg-green hover:text-white disabled:opacity-50 transition-colors duration-150"
          >
            {busy ? '…' : 'Mark Arrived'}
          </button>
        )}

        {/* Recall without resolving */}
        <button
          type="button"
          disabled={busy}
          onClick={() => onRecall(incident.id, incident.dispatched_team_id)}
          className="font-body text-xs font-semibold px-2.5 py-1 rounded bg-white text-text-mid border border-border hover:border-red hover:text-red disabled:opacity-50 transition-colors duration-150"
        >
          {busy ? '…' : 'Recall Team'}
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Location Panel
// ─────────────────────────────────────────────────────────────────────────────

function LocationPanel({ incident }) {
  const hasCoords = incident.lat && incident.lat !== 0 && incident.lng && incident.lng !== 0;

  if (!hasCoords) {
    return (
      <div className="px-4 py-3 bg-amber-light border-t border-amber/20">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-amber flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
          </svg>
          <p className="font-body text-xs text-amber">
            No location data. Zone: <span className="font-medium">{incident.zone_name}</span>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-4 bg-bg border-t border-border">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="overflow-hidden rounded-radius border border-border shadow-sm" style={{ height: '180px' }}>
          <MapContainer
            center={[incident.lat, incident.lng]}
            zoom={15}
            style={{ height: '100%', width: '100%' }}
            zoomControl={false}
            dragging={false}
            scrollWheelZoom={false}
            doubleClickZoom={false}
            touchZoom={false}
            attributionControl={false}
          >
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
              subdomains="abcd"
              maxZoom={20}
            />
            <CircleMarker
              center={[incident.lat, incident.lng]}
              radius={10}
              pathOptions={{ color: '#0a7e6e', fillColor: '#0a7e6e', fillOpacity: 0.75, weight: 2 }}
            />
          </MapContainer>
        </div>

        <div className="space-y-3 flex flex-col justify-center">
          <div>
            <p className="font-mono text-xs text-text-dim uppercase tracking-wider mb-1">Address</p>
            <p className="font-body text-sm text-text leading-relaxed">
              {incident.location_display ?? 'Address not captured'}
            </p>
          </div>
          <div>
            <p className="font-mono text-xs text-text-dim uppercase tracking-wider mb-1">Coordinates</p>
            <p className="font-mono text-sm text-text">
              {incident.lat?.toFixed(6)}, {incident.lng?.toFixed(6)}
            </p>
          </div>
          <div>
            <p className="font-mono text-xs text-text-dim uppercase tracking-wider mb-1">Source</p>
            <span className={`inline-flex items-center gap-1.5 font-mono text-xs px-2.5 py-1 rounded-full border ${
              incident.location_source === 'gps'
                ? 'bg-teal-light text-teal border-teal/20'
                : 'bg-amber-light text-amber border-amber/20'
            }`}>
              {incident.location_source === 'gps' ? 'GPS — High accuracy' : 'Zone centre — Lower accuracy'}
            </span>
          </div>
          <a
            href={`https://www.google.com/maps?q=${incident.lat},${incident.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 font-body text-xs font-medium text-teal hover:text-teal-dark transition-colors duration-150"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
              <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
            </svg>
            Open in Google Maps
          </a>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Action buttons
// ─────────────────────────────────────────────────────────────────────────────

function ActionButtons({ incident, onVerify, onReject, onResolve, onDispatch, busy }) {
  const id = incident.id;

  if (incident.status === 'pending') {
    return (
      <div className="flex gap-1.5">
        <button
          type="button"
          disabled={!!busy}
          onClick={() => onVerify(incident)}
          className="font-body text-xs font-semibold px-2.5 py-1 rounded bg-teal text-white hover:bg-teal-dark disabled:opacity-50 transition-colors duration-150"
        >
          {busy === id + 'v' ? '…' : 'Verify'}
        </button>
        <button
          type="button"
          disabled={!!busy}
          onClick={() => onReject(incident)}
          className="font-body text-xs font-semibold px-2.5 py-1 rounded bg-red-light text-red border border-red/20 hover:bg-red hover:text-white disabled:opacity-50 transition-colors duration-150"
        >
          {busy === id + 'r' ? '…' : 'Reject'}
        </button>
      </div>
    );
  }

  if (incident.status === 'open') {
    return (
      <div className="flex flex-col gap-1.5">
        {/* Dispatch — only if no team assigned yet */}
        {!incident.dispatched_team_id && (
          <button
            type="button"
            disabled={!!busy}
            onClick={() => onDispatch(incident)}
            className="font-body text-xs font-semibold px-2.5 py-1 rounded bg-teal text-white hover:bg-teal-dark disabled:opacity-50 transition-colors duration-150 whitespace-nowrap"
          >
            Dispatch Team
          </button>
        )}
        {/* Team dispatched indicator */}
        {incident.dispatched_team_id && (
          <span className="font-mono text-xs text-teal bg-teal-light border border-teal/20 px-2 py-0.5 rounded-full whitespace-nowrap">
            Team assigned
          </span>
        )}
        <button
          type="button"
          disabled={!!busy}
          onClick={() => onResolve(incident)}
          className="font-body text-xs font-semibold px-2.5 py-1 rounded bg-green-light text-green border border-green/20 hover:bg-green hover:text-white disabled:opacity-50 transition-colors duration-150"
        >
          {busy === id + 'x' ? '…' : 'Resolve'}
        </button>
      </div>
    );
  }

  return <span className="font-mono text-xs text-text-dim">—</span>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Incidents table
// ─────────────────────────────────────────────────────────────────────────────

function IncidentsTable({ incidents, teams, onVerify, onReject, onResolve, onDispatch, onRecall, onMarkDeployed, busy }) {
  const [expandedId, setExpandedId] = useState(null);

  return incidents.length === 0 ? (
    <div className="py-12 text-center">
      <p className="font-body text-sm text-text-mid">No incidents in this category</p>
    </div>
  ) : (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[700px]" aria-label="Incidents table">
        <thead className="bg-bg border-b border-border">
          <tr>
            {[
              { label: 'Type / Zone',   cls: '' },
              { label: 'Severity',      cls: '' },
              { label: 'Status',        cls: '' },
              { label: 'Team',          cls: 'hidden md:table-cell' },
              { label: 'Description',   cls: 'hidden lg:table-cell' },
              { label: 'Location',      cls: 'hidden xl:table-cell' },
              { label: 'Reported',      cls: 'hidden md:table-cell' },
              { label: 'Actions',       cls: '' },
            ].map(({ label, cls }) => (
              <th
                key={label}
                className={`px-3 py-2 text-left font-mono text-xs text-text-dim uppercase tracking-wider whitespace-nowrap ${cls}`}
              >
                {label}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {incidents.map((inc) => (
            <>
              <tr
                key={inc.id}
                onClick={() => setExpandedId((p) => (p === inc.id ? null : inc.id))}
                className={`border-b border-border transition-colors duration-100 cursor-pointer ${
                  expandedId === inc.id ? 'bg-teal-light/20' : 'hover:bg-teal-light/10'
                }`}
              >
                {/* Type / Zone */}
                <td className="px-3 py-3">
                  <p className="font-body text-xs font-medium text-text capitalize">{inc.type}</p>
                  <p className="font-mono text-xs text-text-dim">{inc.zone_name}</p>
                </td>

                {/* Severity */}
                <td className="px-3 py-3">
                  <StatusBadge variant="severity" value={inc.severity} />
                </td>

                {/* Status */}
                <td className="px-3 py-3">
                  <StatusBadge variant="status" value={inc.status} />
                </td>

                {/* Team column */}
                <td className="px-3 py-3 hidden md:table-cell">
                  {inc.dispatched_team_id ? (
                    <div className="flex items-center gap-1.5">
                      <span className="relative flex h-2 w-2 flex-shrink-0">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal opacity-60" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-teal" />
                      </span>
                      <span className="font-body text-xs text-teal font-medium truncate max-w-[110px]">
                        {inc.dispatched_team_name}
                      </span>
                    </div>
                  ) : (
                    <span className="font-mono text-xs text-text-dim">—</span>
                  )}
                </td>

                {/* Description */}
                <td className="px-3 py-3 hidden lg:table-cell max-w-xs">
                  <p className="font-body text-xs text-text-mid line-clamp-2">{inc.description}</p>
                </td>

                {/* Location */}
                <td className="px-3 py-3 hidden xl:table-cell">
                  {inc.lat && inc.lat !== 0 ? (
                    <div className="space-y-0.5">
                      <p className="font-body text-xs text-text-mid line-clamp-1 max-w-[140px]">
                        {inc.location_display ?? 'Address not captured'}
                      </p>
                      <p className="font-mono text-xs text-text-dim">
                        [{inc.lat?.toFixed(4)}, {inc.lng?.toFixed(4)}]
                      </p>
                    </div>
                  ) : (
                    <span className="font-mono text-xs text-text-dim">No GPS</span>
                  )}
                </td>

                {/* Reported */}
                <td className="px-3 py-3 hidden md:table-cell font-mono text-xs text-text-dim whitespace-nowrap">
                  {formatTime(inc.created_at)}
                </td>

                {/* Actions — stop propagation to prevent row expand toggle */}
                <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                  <ActionButtons
                    incident={inc}
                    onVerify={onVerify}
                    onReject={onReject}
                    onResolve={onResolve}
                    onDispatch={onDispatch}
                    busy={busy}
                  />
                </td>
              </tr>

              {/* Expanded panels */}
              {expandedId === inc.id && (
                <tr key={`${inc.id}-expanded`}>
                  <td colSpan={8} className="p-0">
                    {/* Dispatch strip — shown when team is assigned */}
                    {inc.dispatched_team_id && (
                      <DispatchStrip
                        incident={inc}
                        teams={teams}
                        onRecall={onRecall}
                        onMarkDeployed={onMarkDeployed}
                        busy={!!busy}
                      />
                    )}
                    {/* Location panel */}
                    <LocationPanel incident={inc} />
                  </td>
                </tr>
              )}
            </>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default function AdminIncidents() {
  const { incidents, loading }       = useAllIncidents();
  const { user }                     = useAuth();
  const [teams, setTeams]            = useState([]);
  const [activeTab, setTab]          = useState('pending');
  const [busy, setBusy]              = useState(null);
  const [toast, setToast]            = useState(null);
  const [dispatchTarget, setDispatchTarget] = useState(null); // incident to dispatch a team to

  // Subscribe to all teams for the dispatch modal and table team column
  useEffect(() => {
    const unsub = subscribeToTeams(setTeams, console.error);
    return unsub;
  }, []);

  function showToast(msg, type = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  // ── Status transitions ────────────────────────────────────────────────

  async function handleVerify(incident) {
    setBusy(incident.id + 'v');
    try {
      await verifyIncident(incident.id, user.email);
      showToast('Incident verified — now live on the public map.');
    } catch (err) {
      console.error(err);
      showToast('Error: ' + err.message, 'error');
    } finally {
      setBusy(null);
    }
  }

  async function handleReject(incident) {
    setBusy(incident.id + 'r');
    try {
      await rejectIncident(incident.id, user.email);
      showToast('Incident rejected.' + (incident.dispatched_team_id ? ' Dispatched team recalled.' : ''));
    } catch (err) {
      console.error(err);
      showToast('Error: ' + err.message, 'error');
    } finally {
      setBusy(null);
    }
  }

  async function handleResolve(incident) {
    setBusy(incident.id + 'x');
    try {
      await resolveIncident(incident.id, user.email);
      showToast('Incident resolved.' + (incident.dispatched_team_id ? ' Team returned to standby.' : ''));
    } catch (err) {
      console.error(err);
      showToast('Error: ' + err.message, 'error');
    } finally {
      setBusy(null);
    }
  }

  // ── Dispatch flow ────────────────────────────────────────────────────

  function handleOpenDispatch(incident) {
    setDispatchTarget(incident);
  }

  async function handleConfirmDispatch(team) {
    if (!dispatchTarget) return;
    setBusy('dispatch');
    try {
      await dispatchTeamToIncident(dispatchTarget.id, dispatchTarget, team, user.email);
      showToast(`${team.name} dispatched to ${dispatchTarget.zone_name}.`);
      setDispatchTarget(null);
    } catch (err) {
      console.error(err);
      showToast('Dispatch failed: ' + err.message, 'error');
    } finally {
      setBusy(null);
    }
  }

  async function handleRecall(incidentId, teamId) {
    setBusy('recall-' + teamId);
    try {
      await recallTeam(incidentId, teamId);
      showToast('Team recalled and returned to standby.');
    } catch (err) {
      console.error(err);
      showToast('Recall failed: ' + err.message, 'error');
    } finally {
      setBusy(null);
    }
  }

  async function handleMarkDeployed(teamId) {
    setBusy('deploy-' + teamId);
    try {
      await markTeamDeployed(teamId);
      showToast('Team marked as on-site and deployed.');
    } catch (err) {
      console.error(err);
      showToast('Error: ' + err.message, 'error');
    } finally {
      setBusy(null);
    }
  }

  // ── Derived data ─────────────────────────────────────────────────────

  const filtered = incidents.filter((i) => i.status === activeTab);
  const counts   = STATUS_TABS.reduce((acc, s) => {
    acc[s] = incidents.filter((i) => i.status === s).length;
    return acc;
  }, {});

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-display-md text-text">Incidents</h1>
        <p className="font-body text-sm text-text-mid mt-0.5">
          Verify reports, dispatch teams, and track incident resolution.
        </p>
      </div>

      <div className="bg-white border border-border rounded-radius-lg shadow-sm overflow-hidden">
        {/* Status tabs */}
        <div className="flex border-b border-border overflow-x-auto">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setTab(tab)}
              className={`flex items-center gap-2 px-4 py-3 font-body font-medium text-sm whitespace-nowrap transition-colors duration-150 ${
                activeTab === tab
                  ? 'text-teal border-b-2 border-teal bg-teal-light/30'
                  : 'text-text-mid hover:text-text hover:bg-bg'
              }`}
            >
              <span className="capitalize">{tab}</span>
              <span className={`font-mono text-xs px-1.5 py-0.5 rounded-full ${
                activeTab === tab ? 'bg-teal text-white' : 'bg-border text-text-dim'
              }`}>
                {loading ? '…' : counts[tab]}
              </span>
            </button>
          ))}
        </div>

        {loading ? (
          <div className="py-12 text-center">
            <div className="w-6 h-6 border-2 border-teal border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : (
          <IncidentsTable
            incidents={filtered}
            teams={teams}
            onVerify={handleVerify}
            onReject={handleReject}
            onResolve={handleResolve}
            onDispatch={handleOpenDispatch}
            onRecall={handleRecall}
            onMarkDeployed={handleMarkDeployed}
            busy={busy}
          />
        )}
      </div>

      {/* Dispatch modal */}
      {dispatchTarget && (
        <DispatchModal
          incident={dispatchTarget}
          teams={teams}
          onDispatch={handleConfirmDispatch}
          onClose={() => setDispatchTarget(null)}
          busy={busy === 'dispatch'}
        />
      )}

      {/* Toast */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-radius shadow-lg font-body text-sm font-medium ${
            toast.type === 'error' ? 'bg-red text-white' : 'bg-teal text-white'
          }`}
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}