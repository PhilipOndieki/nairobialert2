import { useState } from 'react';
import { useAllIncidents } from '../../hooks/useIncidents';
import { useAuth } from '../../hooks/useAuth';
import { verifyIncident, rejectIncident, resolveIncident } from '../../firebase/incidents';
import StatusBadge from '../../components/StatusBadge';
import { MapContainer, TileLayer, CircleMarker } from 'react-leaflet';

const STATUS_TABS = ['pending', 'open', 'rejected', 'resolved'];

function formatTime(ts) {
  if (!ts?.toDate) return '—';
  return ts.toDate().toLocaleString('en-KE', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

/* ── Action buttons per status ───────────────────────────────────────────── */
function ActionButtons({ incident, onVerify, onReject, onResolve, busy }) {
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
      <button
        type="button"
        disabled={!!busy}
        onClick={() => onResolve(incident)}
        className="font-body text-xs font-semibold px-2.5 py-1 rounded bg-green-light text-green border border-green/20 hover:bg-green hover:text-white disabled:opacity-50 transition-colors duration-150"
      >
        {busy === id + 'x' ? '…' : 'Resolve'}
      </button>
    );
  }
  return <span className="font-mono text-xs text-text-dim">—</span>;
}

/* ── Incident Location Panel ─────────────────────────────────────────────── */
// Shown when admin expands a row — mini map + address details
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
            No location data captured for this report. Zone: <span className="font-medium">{incident.zone_name}</span>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-4 bg-bg border-t border-border">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Mini map */}
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
              pathOptions={{
                color:       '#0a7e6e',
                fillColor:   '#0a7e6e',
                fillOpacity: 0.75,
                weight:      2,
              }}
            />
          </MapContainer>
        </div>

        {/* Location details */}
        <div className="space-y-3 flex flex-col justify-center">
          {/* Address */}
          <div>
            <p className="font-mono text-xs text-text-dim uppercase tracking-wider mb-1">
              Address
            </p>
            <p className="font-body text-sm text-text leading-relaxed">
              {incident.location_display ?? 'Address not captured'}
            </p>
          </div>

          {/* Coordinates */}
          <div>
            <p className="font-mono text-xs text-text-dim uppercase tracking-wider mb-1">
              Coordinates
            </p>
            <p className="font-mono text-sm text-text">
              {incident.lat?.toFixed(6)}, {incident.lng?.toFixed(6)}
            </p>
          </div>

          {/* Location source badge */}
          <div>
            <p className="font-mono text-xs text-text-dim uppercase tracking-wider mb-1">
              Location Source
            </p>
            <span className={`inline-flex items-center gap-1.5 font-mono text-xs px-2.5 py-1 rounded-full border ${
              incident.location_source === 'gps'
                ? 'bg-teal-light text-teal border-teal/20'
                : incident.location_source === 'zone'
                ? 'bg-amber-light text-amber border-amber/20'
                : 'bg-border text-text-dim border-border-dark'
            }`}>
              {incident.location_source === 'gps' && (
                <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                </svg>
              )}
              {incident.location_source === 'gps'
                ? 'GPS — High accuracy'
                : incident.location_source === 'zone'
                ? 'Zone centre — Lower accuracy'
                : 'Unknown source'}
            </span>
          </div>

          {/* Open in Google Maps */}
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

/* ── Incidents Table ─────────────────────────────────────────────────────── */
function IncidentsTable({ incidents, onVerify, onReject, onResolve, busy }) {
  // Track which row is expanded to show location panel
  const [expandedId, setExpandedId] = useState(null);

  function toggleExpand(id) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  if (incidents.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="font-body text-sm text-text-mid">No incidents in this category</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px]" aria-label="Incidents table">
        <thead className="bg-bg border-b border-border">
          <tr>
            {[
              { label: 'Type',        className: '' },
              { label: 'Zone',        className: '' },
              { label: 'Severity',    className: '' },
              { label: 'Status',      className: '' },
              { label: 'Description', className: 'hidden lg:table-cell' },
              { label: 'Location',    className: 'hidden md:table-cell' },
              { label: 'People',      className: 'hidden xl:table-cell' },
              { label: 'Source',      className: 'hidden xl:table-cell' },
              { label: 'Reported',    className: 'hidden md:table-cell' },
              { label: 'Actions',     className: '' },
            ].map(({ label, className }) => (
              <th
                key={label}
                className={`px-3 py-2 text-left font-mono text-xs text-text-dim uppercase tracking-wider whitespace-nowrap ${className}`}
              >
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {incidents.map((inc) => (
            <>
              {/* ── Main row ─────────────────────────────────────────────── */}
              <tr
                key={inc.id}
                className={`border-b border-border transition-colors duration-100 cursor-pointer ${
                  expandedId === inc.id
                    ? 'bg-teal-light/20'
                    : 'hover:bg-teal-light/10'
                }`}
                onClick={() => toggleExpand(inc.id)}
              >
                {/* Type */}
                <td className="px-3 py-3 font-body text-xs font-medium text-text capitalize">
                  {inc.type}
                </td>

                {/* Zone + location source badge */}
                <td className="px-3 py-3">
                  <p className="font-body text-xs text-text-mid whitespace-nowrap">
                    {inc.zone_name}
                  </p>
                  {inc.location_source && (
                    <span className={`font-mono text-xs px-1.5 py-0.5 rounded-full ${
                      inc.location_source === 'gps'
                        ? 'bg-teal-light text-teal'
                        : 'bg-amber-light text-amber'
                    }`}>
                      {inc.location_source === 'gps' ? 'GPS' : 'Zone'}
                    </span>
                  )}
                </td>

                {/* Severity */}
                <td className="px-3 py-3">
                  <StatusBadge variant="severity" value={inc.severity} />
                </td>

                {/* Status */}
                <td className="px-3 py-3">
                  <StatusBadge variant="status" value={inc.status} />
                </td>

                {/* Description */}
                <td className="px-3 py-3 hidden lg:table-cell max-w-xs">
                  <p className="font-body text-xs text-text-mid line-clamp-2">
                    {inc.description}
                  </p>
                </td>

                {/* Location — coordinates + address snippet */}
                <td className="px-3 py-3 hidden md:table-cell">
                  {inc.lat && inc.lat !== 0 ? (
                    <div className="space-y-0.5">
                      <p className="font-body text-xs text-text-mid line-clamp-1 max-w-[160px]">
                        {inc.location_display ?? 'Address not captured'}
                      </p>
                      <p className="font-mono text-xs text-text-dim">
                        [{inc.lat?.toFixed(4)}, {inc.lng?.toFixed(4)}]
                      </p>
                    </div>
                  ) : (
                    <span className="font-mono text-xs text-text-dim">No location</span>
                  )}
                </td>

                {/* People affected */}
                <td className="px-3 py-3 hidden xl:table-cell font-mono text-xs text-text-mid">
                  {inc.people_affected || '—'}
                </td>

                {/* Source */}
                <td className="px-3 py-3 hidden xl:table-cell">
                  <span className="font-mono text-xs text-text-dim uppercase">
                    {inc.source}
                  </span>
                </td>

                {/* Reported time */}
                <td className="px-3 py-3 hidden md:table-cell font-mono text-xs text-text-dim whitespace-nowrap">
                  {formatTime(inc.created_at)}
                </td>

                {/* Actions — stop propagation so click doesn't toggle expand */}
                <td
                  className="px-3 py-3"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ActionButtons
                    incident={inc}
                    onVerify={onVerify}
                    onReject={onReject}
                    onResolve={onResolve}
                    busy={busy}
                  />
                </td>
              </tr>

              {/* ── Expanded location panel ───────────────────────────────── */}
              {expandedId === inc.id && (
                <tr key={`${inc.id}-expanded`}>
                  <td colSpan={10} className="p-0">
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

/* Page */
export default function AdminIncidents() {
  const { incidents, loading } = useAllIncidents();
  const { user }              = useAuth();
  const [activeTab, setTab]   = useState('pending');
  const [busy, setBusy]       = useState(null);
  const [toast, setToast]     = useState(null);

  function showToast(msg, type = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  async function handleVerify(incident) {
    setBusy(incident.id + 'v');
    try {
      await verifyIncident(incident.id, user.email);
      showToast('Incident verified and published to map.');
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
      showToast('Incident rejected.');
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
      showToast('Incident marked as resolved.');
    } catch (err) {
      console.error(err);
      showToast('Error: ' + err.message, 'error');
    } finally {
      setBusy(null);
    }
  }

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
          Manage all reported incidents across all status stages.
        </p>
      </div>

      <div className="bg-white border border-border rounded-radius-lg shadow-sm overflow-hidden">
        {/* Filter tabs */}
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
            onVerify={handleVerify}
            onReject={handleReject}
            onResolve={handleResolve}
            busy={busy}
          />
        )}
      </div>

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
