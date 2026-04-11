import { useState, useEffect } from 'react';
import { subscribeToTeams, createTeam, updateTeam, deleteTeam } from '../../firebase/teams';
import { recallTeam, markTeamDeployed } from '../../firebase/incidents';
import StatusBadge from '../../components/StatusBadge';

const TEAM_STATUSES = ['standby', 'deployed', 'enroute'];

const INITIAL_FORM = {
  code: '', name: '', organisation: '', members: '',
  status: 'standby', location: '', task: '',
};

// ─────────────────────────────────────────────────────────────────────────────
// Team Form Modal
// ─────────────────────────────────────────────────────────────────────────────

function TeamForm({ initial, onSave, onCancel, saving }) {
  const [form, setForm]     = useState(initial ? {
    code:         initial.code,
    name:         initial.name,
    organisation: initial.organisation,
    members:      String(initial.members),
    status:       initial.status,
    location:     initial.location,
    task:         initial.task,
  } : INITIAL_FORM);
  const [errors, setErrs]   = useState({});

  function set(k, v) {
    setForm((p) => ({ ...p, [k]: v }));
    if (errors[k]) setErrs((p) => ({ ...p, [k]: undefined }));
  }

  function validate() {
    const e = {};
    if (!form.code.trim())         e.code         = 'Required';
    if (!form.name.trim())         e.name         = 'Required';
    if (!form.organisation.trim()) e.organisation = 'Required';
    if (!form.members || isNaN(Number(form.members))) e.members = 'Must be a number';
    if (!form.location.trim())     e.location     = 'Required';
    return e;
  }

  function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrs(errs); return; }
    onSave({ ...form, members: Number(form.members) });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" aria-modal="true" role="dialog">
      <div className="absolute inset-0 bg-text/40 backdrop-blur-sm" onClick={onCancel} aria-hidden="true" />
      <div className="relative bg-white border border-border rounded-radius-lg shadow-lg w-full max-w-md overflow-y-auto max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h2 className="font-display text-lg text-text leading-none">
              {initial ? 'Edit Team' : 'Add Team'}
            </h2>
            <p className="font-mono text-xs text-text-dim mt-0.5">
              Response team record
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="p-1.5 rounded-radius text-text-mid hover:text-text hover:bg-bg transition-colors duration-150"
            aria-label="Close"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="px-5 py-5 space-y-4">
          {[
            { key: 'code',         label: 'Team Code',        placeholder: 'e.g. RT-01' },
            { key: 'name',         label: 'Team Name',        placeholder: 'e.g. Rapid Response Alpha' },
            { key: 'organisation', label: 'Organisation',     placeholder: 'e.g. Kenya Red Cross' },
            { key: 'location',     label: 'Current Location', placeholder: 'e.g. Mathare North' },
            { key: 'task',         label: 'Current Task',     placeholder: 'e.g. Flood rescue operations' },
          ].map(({ key, label, placeholder }) => (
            <div key={key}>
              <label className="block font-body font-medium text-sm text-text mb-1.5">{label}</label>
              <input
                type="text"
                value={form[key]}
                onChange={(e) => set(key, e.target.value)}
                placeholder={placeholder}
                className={`w-full font-body text-sm bg-bg border rounded-radius px-3 py-2.5 text-text focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent transition-colors duration-150 ${
                  errors[key] ? 'border-red' : 'border-border hover:border-border-dark'
                }`}
              />
              {errors[key] && <p className="mt-1 font-body text-xs text-red">{errors[key]}</p>}
            </div>
          ))}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-body font-medium text-sm text-text mb-1.5">Members</label>
              <input
                type="number"
                min="1"
                value={form.members}
                onChange={(e) => set('members', e.target.value)}
                className={`w-full font-body text-sm bg-bg border rounded-radius px-3 py-2.5 text-text focus:outline-none focus:ring-2 focus:ring-teal ${
                  errors.members ? 'border-red' : 'border-border hover:border-border-dark'
                }`}
              />
              {errors.members && <p className="mt-1 font-body text-xs text-red">{errors.members}</p>}
            </div>
            <div>
              <label className="block font-body font-medium text-sm text-text mb-1.5">Status</label>
              <select
                value={form.status}
                onChange={(e) => set('status', e.target.value)}
                className="w-full font-body text-sm bg-bg border border-border hover:border-border-dark rounded-radius px-3 py-2.5 text-text focus:outline-none focus:ring-2 focus:ring-teal transition-colors duration-150"
              >
                {TEAM_STATUSES.map((s) => (
                  <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 font-body font-medium text-sm text-text-mid border border-border rounded-radius py-2.5 hover:bg-bg transition-colors duration-150"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 font-body font-semibold text-sm bg-teal text-white rounded-radius py-2.5 hover:bg-teal-dark disabled:opacity-60 transition-colors duration-150 shadow-sm"
            >
              {saving ? 'Saving…' : initial ? 'Save Changes' : 'Add Team'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Team row — expands to show dispatch context
// ─────────────────────────────────────────────────────────────────────────────

function TeamRow({ team, onEdit, onDelete, onRecall, onMarkDeployed, busy }) {
  const isDispatched = Boolean(team.dispatched_to_incident_id);

  return (
    <tr className="border-b border-border hover:bg-teal-light/10 transition-colors duration-100">

      {/* Code */}
      <td className="px-3 py-3 font-mono text-xs text-text">{team.code}</td>

      {/* Name */}
      <td className="px-3 py-3">
        <p className="font-body text-xs font-medium text-text">{team.name}</p>
        <p className="font-mono text-xs text-text-dim">{team.organisation}</p>
      </td>

      {/* Members */}
      <td className="px-3 py-3 font-mono text-xs text-text-mid">{team.members}</td>

      {/* Status */}
      <td className="px-3 py-3">
        <div className="flex items-center gap-1.5">
          {/* Live pulse for en-route */}
          {team.status === 'enroute' && (
            <span className="relative flex h-2 w-2 flex-shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal opacity-60" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-teal" />
            </span>
          )}
          <StatusBadge variant="team" value={team.status} />
        </div>
      </td>

      {/* Dispatch context — what they're responding to */}
      <td className="px-3 py-3 hidden md:table-cell">
        {isDispatched ? (
          <div className="space-y-0.5">
            <p className="font-body text-xs text-teal font-medium leading-none">
              Responding to:
            </p>
            <p className="font-mono text-xs text-text-dim truncate max-w-[160px]">
              {team.dispatched_to_zone ?? team.location}
            </p>
          </div>
        ) : (
          <p className="font-body text-xs text-text-mid">{team.location || '—'}</p>
        )}
      </td>

      {/* Task */}
      <td className="px-3 py-3 hidden lg:table-cell">
        <p className="font-body text-xs text-text-mid max-w-[180px] truncate">
          {team.task || '—'}
        </p>
      </td>

      {/* Actions */}
      <td className="px-3 py-3">
        <div className="flex gap-1.5 flex-wrap">
          {/* Mark arrived — enroute only */}
          {team.status === 'enroute' && (
            <button
              type="button"
              disabled={!!busy}
              onClick={() => onMarkDeployed(team.id)}
              className="font-body text-xs font-semibold px-2.5 py-1 rounded bg-green-light text-green border border-green/20 hover:bg-green hover:text-white disabled:opacity-50 transition-colors duration-150 whitespace-nowrap"
            >
              Mark Arrived
            </button>
          )}

          {/* Recall — dispatched teams only */}
          {isDispatched && (
            <button
              type="button"
              disabled={!!busy}
              onClick={() => onRecall(team.dispatched_to_incident_id, team.id)}
              className="font-body text-xs font-semibold px-2.5 py-1 rounded bg-amber-light text-amber border border-amber/20 hover:bg-amber hover:text-white disabled:opacity-50 transition-colors duration-150"
            >
              Recall
            </button>
          )}

          <button
            type="button"
            onClick={() => onEdit(team)}
            className="font-body text-xs px-2 py-1 rounded border border-border text-text-mid hover:border-teal hover:text-teal transition-colors duration-150"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => onDelete(team)}
            disabled={isDispatched}
            title={isDispatched ? 'Recall team before deleting' : ''}
            className="font-body text-xs px-2 py-1 rounded border border-border text-text-mid hover:border-red hover:text-red disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-150"
          >
            Delete
          </button>
        </div>
      </td>
    </tr>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default function AdminTeams() {
  const [teams, setTeams]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]     = useState(null);
  const [saving, setSaving]   = useState(false);
  const [busy, setBusy]       = useState(null);
  const [toast, setToast]     = useState(null);

  useEffect(() => {
    const unsub = subscribeToTeams(
      (data) => { setTeams(data); setLoading(false); },
      (err)  => { console.error(err); setLoading(false); },
    );
    return unsub;
  }, []);

  function showToast(msg, type = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  async function handleSave(formData) {
    setSaving(true);
    try {
      if (modal === 'create') {
        await createTeam(formData);
        showToast('Team created.');
      } else {
        await updateTeam(modal.id, formData);
        showToast('Team updated.');
      }
      setModal(null);
    } catch (err) {
      console.error(err);
      showToast('Error: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(team) {
    if (team.dispatched_to_incident_id) {
      showToast('Recall the team from their current incident before deleting.', 'error');
      return;
    }
    if (!confirm(`Delete team "${team.name}"? This cannot be undone.`)) return;
    try {
      await deleteTeam(team.id);
      showToast('Team deleted.');
    } catch (err) {
      console.error(err);
      showToast('Error: ' + err.message, 'error');
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

  // Summary counts for the header
  const standbyCount  = teams.filter((t) => t.status === 'standby').length;
  const enrouteCount  = teams.filter((t) => t.status === 'enroute').length;
  const deployedCount = teams.filter((t) => t.status === 'deployed').length;

  return (
    <div className="space-y-5">

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-display-md text-text">Teams</h1>
          <p className="font-body text-sm text-text-mid mt-0.5">
            Manage response team assignments and dispatch status.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setModal('create')}
          className="font-body font-semibold text-sm bg-teal text-white px-4 py-2 rounded-radius hover:bg-teal-dark transition-colors duration-150 shadow-sm"
        >
          + Add Team
        </button>
      </div>

      {/* Status summary pills */}
      {!loading && teams.length > 0 && (
        <div className="flex gap-3 flex-wrap">
          {[
            { label: 'On Standby',  count: standbyCount,  color: 'bg-border text-text-mid border-border-dark' },
            { label: 'En Route',    count: enrouteCount,  color: 'bg-amber-light text-amber border-amber/20' },
            { label: 'Deployed',    count: deployedCount, color: 'bg-teal-light text-teal border-teal/20' },
          ].map(({ label, count, color }) => (
            <div
              key={label}
              className={`inline-flex items-center gap-2 font-body text-xs font-medium px-3 py-1.5 rounded-full border ${color}`}
            >
              <span className="font-display text-base leading-none">{count}</span>
              {label}
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      <div className="bg-white border border-border rounded-radius-lg shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-12 text-center">
            <div className="w-6 h-6 border-2 border-teal border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : teams.length === 0 ? (
          <div className="py-12 text-center">
            <p className="font-body text-sm text-text-mid mb-1">No teams configured</p>
            <p className="font-body text-xs text-text-dim">Add a team to enable dispatch from the Incidents page</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]" aria-label="Teams table">
              <thead className="bg-bg border-b border-border">
                <tr>
                  {[
                    { label: 'Code',       cls: '' },
                    { label: 'Name',       cls: '' },
                    { label: 'Members',    cls: '' },
                    { label: 'Status',     cls: '' },
                    { label: 'Responding To / Location', cls: 'hidden md:table-cell' },
                    { label: 'Task',       cls: 'hidden lg:table-cell' },
                    { label: '',           cls: '' },
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
                {teams.map((team) => (
                  <TeamRow
                    key={team.id}
                    team={team}
                    onEdit={setModal}
                    onDelete={handleDelete}
                    onRecall={handleRecall}
                    onMarkDeployed={handleMarkDeployed}
                    busy={busy}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit modal */}
      {modal && (
        <TeamForm
          initial={modal === 'create' ? null : modal}
          onSave={handleSave}
          onCancel={() => setModal(null)}
          saving={saving}
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