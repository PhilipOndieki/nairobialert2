import { useState, useEffect } from 'react';
import { useAllIncidents, useIncidentCounts } from '../../hooks/useIncidents';
import { useAuth } from '../../hooks/useAuth';
import { verifyIncident, rejectIncident } from '../../firebase/incidents';
import { subscribeToOpenSheltersCount } from '../../firebase/shelters';
import { subscribeToDeployedCount } from '../../firebase/teams';
import StatusBadge from '../../components/StatusBadge';

/* Stat Card */
function StatCard({ label, value, loading, accent }) {
  const accentMap = {
    amber: 'border-l-amber',
    teal:  'border-l-teal',
    green: 'border-l-green',
    red:   'border-l-red',
  };
  return (
    <div className={`bg-white border border-border border-l-4 ${accentMap[accent] ?? 'border-l-teal'} rounded-radius p-4 shadow-sm`}>
      <p className="font-mono text-xs text-text-dim uppercase tracking-wider mb-2">{label}</p>
      {loading ? (
        <div className="h-8 w-16 bg-border rounded animate-pulse" />
      ) : (
        <p className="font-display text-3xl text-text leading-none">{value}</p>
      )}
    </div>
  );
}

/* ── Pending Incident Row ────────────────────────────────────────────────── */
function PendingRow({ incident, onVerify, onReject, busy }) {
  const time = incident.created_at?.toDate
    ? incident.created_at.toDate().toLocaleString('en-KE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
    : '—';

  return (
    <tr className="border-b border-border hover:bg-teal-light/20 transition-colors duration-100">
      <td className="px-4 py-3">
        <p className="font-body text-xs font-medium text-text">{incident.type}</p>
        <p className="font-mono text-xs text-text-dim truncate max-w-[120px]">{incident.zone_name}</p>
      </td>
      <td className="px-4 py-3 hidden sm:table-cell">
        <StatusBadge variant="severity" value={incident.severity} />
      </td>
      <td className="px-4 py-3 hidden md:table-cell max-w-xs">
        <p className="font-body text-xs text-text-mid line-clamp-2">{incident.description}</p>
      </td>
      <td className="px-4 py-3 hidden lg:table-cell">
        <p className="font-mono text-xs text-text-dim">{time}</p>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={busy === incident.id}
            onClick={() => onVerify(incident)}
            className="font-body text-xs font-semibold px-2.5 py-1 rounded bg-teal text-white hover:bg-teal-dark disabled:opacity-50 transition-colors duration-150"
          >
            {busy === incident.id + 'verify' ? '…' : 'Verify'}
          </button>
          <button
            type="button"
            disabled={busy === incident.id}
            onClick={() => onReject(incident)}
            className="font-body text-xs font-semibold px-2.5 py-1 rounded bg-red-light text-red border border-red/20 hover:bg-red hover:text-white disabled:opacity-50 transition-colors duration-150"
          >
            {busy === incident.id + 'reject' ? '…' : 'Reject'}
          </button>
        </div>
      </td>
    </tr>
  );
}

/* ── Dashboard Page ──────────────────────────────────────────────────────── */
export default function Dashboard() {
  const { user }                           = useAuth();
  const { incidents, loading: incLoading } = useAllIncidents();
  const { pendingCount, openCount }        = useIncidentCounts();
  const [openShelters, setOpenShelters]    = useState(0);
  const [teamsDeployed, setTeamsDeployed]  = useState(0);
  const [statsLoading, setStatsLoading]    = useState(true);
  const [busy, setBusy]                    = useState(null); // incident id + action
  const [toast, setToast]                  = useState(null);

  useEffect(() => {
    let done = 0;
    const check = () => { if (++done === 2) setStatsLoading(false); };
    const unsubShelters = subscribeToOpenSheltersCount((n) => { setOpenShelters(n); check(); }, console.error);
    const unsubTeams    = subscribeToDeployedCount((n)    => { setTeamsDeployed(n); check(); }, console.error);
    return () => { unsubShelters(); unsubTeams(); };
  }, []);

  function showToast(msg, type = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  async function handleVerify(incident) {
    setBusy(incident.id + 'verify');
    try {
      await verifyIncident(incident.id, user.email);
      showToast(`Incident verified — now live on map.`);
    } catch (err) {
      console.error(err);
      showToast('Failed to verify incident. Please try again.', 'error');
    } finally {
      setBusy(null);
    }
  }

  async function handleReject(incident) {
    setBusy(incident.id + 'reject');
    try {
      await rejectIncident(incident.id, user.email);
      showToast('Incident rejected.');
    } catch (err) {
      console.error(err);
      showToast('Failed to reject incident. Please try again.', 'error');
    } finally {
      setBusy(null);
    }
  }

  const pendingIncidents = incidents.filter((i) => i.status === 'pending');

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="font-display text-display-md text-text">Dashboard</h1>
        <p className="font-body text-sm text-text-mid mt-0.5">
          Welcome back, <span className="font-medium text-text">{user?.email}</span>
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Pending Review" value={pendingCount} loading={incLoading} accent="amber" />
        <StatCard label="Active Incidents" value={openCount}   loading={incLoading} accent="red" />
        <StatCard label="Teams Deployed"  value={teamsDeployed} loading={statsLoading} accent="teal" />
        <StatCard label="Open Shelters"   value={openShelters}  loading={statsLoading} accent="green" />
      </div>

      {/* Pending incidents table */}
      <div className="bg-white border border-border rounded-radius-lg shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="font-body font-semibold text-sm text-text">Pending Verification</h2>
          {pendingCount > 0 && (
            <span className="font-mono text-xs bg-amber-light text-amber border border-amber/20 px-2 py-0.5 rounded-full">
              {pendingCount} awaiting
            </span>
          )}
        </div>

        {incLoading && (
          <div className="p-8 text-center">
            <div className="w-6 h-6 border-2 border-teal border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        )}

        {!incLoading && pendingIncidents.length === 0 && (
          <div className="p-8 text-center">
            <svg className="w-8 h-8 text-border-dark mx-auto mb-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
            </svg>
            <p className="font-body text-sm text-text-mid">All clear — no pending incidents</p>
          </div>
        )}

        {!incLoading && pendingIncidents.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[500px]" aria-label="Pending incidents">
              <thead className="bg-bg border-b border-border">
                <tr>
                  {['Incident', 'Severity', 'Description', 'Reported', 'Actions'].map((h) => (
                    <th
                      key={h}
                      className={`px-4 py-2 text-left font-mono text-xs text-text-dim uppercase tracking-wider ${
                        h === 'Description' ? 'hidden md:table-cell' :
                        h === 'Severity'    ? 'hidden sm:table-cell' :
                        h === 'Reported'    ? 'hidden lg:table-cell' : ''
                      }`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pendingIncidents.map((incident) => (
                  <PendingRow
                    key={incident.id}
                    incident={incident}
                    onVerify={handleVerify}
                    onReject={handleReject}
                    busy={busy}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Toast notification */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-radius shadow-lg font-body text-sm font-medium ${
            toast.type === 'error'
              ? 'bg-red text-white'
              : 'bg-teal text-white'
          }`}
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}
