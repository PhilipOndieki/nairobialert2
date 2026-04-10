// File: src/pages/admin/Incidents.jsx
// Purpose: Admin incidents management — filter tabs, full table, verify/reject/resolve actions
// Dependencies: react, ../../hooks/useIncidents, ../../hooks/useAuth,
//               ../../firebase/incidents, ../../components/StatusBadge

import { useState } from 'react';
import { useAllIncidents } from '../../hooks/useIncidents';
import { useAuth } from '../../hooks/useAuth';
import { verifyIncident, rejectIncident, resolveIncident } from '../../firebase/incidents';
import StatusBadge from '../../components/StatusBadge';

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

/* ── Incidents Table ─────────────────────────────────────────────────────── */
function IncidentsTable({ incidents, onVerify, onReject, onResolve, busy }) {
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
            {['Type', 'Zone', 'Severity', 'Status', 'Description', 'People', 'Source', 'Reported', 'Actions'].map((h) => (
              <th
                key={h}
                className={`px-3 py-2 text-left font-mono text-xs text-text-dim uppercase tracking-wider whitespace-nowrap ${
                  h === 'Description' ? 'hidden lg:table-cell' :
                  h === 'People'      ? 'hidden xl:table-cell' :
                  h === 'Source'      ? 'hidden xl:table-cell' :
                  h === 'Reported'    ? 'hidden md:table-cell' : ''
                }`}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {incidents.map((inc) => (
            <tr key={inc.id} className="border-b border-border hover:bg-teal-light/10 transition-colors duration-100">
              <td className="px-3 py-3 font-body text-xs font-medium text-text capitalize">{inc.type}</td>
              <td className="px-3 py-3 font-body text-xs text-text-mid whitespace-nowrap">{inc.zone_name}</td>
              <td className="px-3 py-3">
                <StatusBadge variant="severity" value={inc.severity} />
              </td>
              <td className="px-3 py-3">
                <StatusBadge variant="status" value={inc.status} />
              </td>
              <td className="px-3 py-3 hidden lg:table-cell max-w-xs">
                <p className="font-body text-xs text-text-mid line-clamp-2">{inc.description}</p>
              </td>
              <td className="px-3 py-3 hidden xl:table-cell font-mono text-xs text-text-mid">
                {inc.people_affected || '—'}
              </td>
              <td className="px-3 py-3 hidden xl:table-cell">
                <span className="font-mono text-xs text-text-dim uppercase">{inc.source}</span>
              </td>
              <td className="px-3 py-3 hidden md:table-cell font-mono text-xs text-text-dim whitespace-nowrap">
                {formatTime(inc.created_at)}
              </td>
              <td className="px-3 py-3">
                <ActionButtons
                  incident={inc}
                  onVerify={onVerify}
                  onReject={onReject}
                  onResolve={onResolve}
                  busy={busy}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── Page ────────────────────────────────────────────────────────────────── */
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
