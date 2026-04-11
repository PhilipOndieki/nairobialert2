import { useState, useEffect } from 'react';
import { subscribeToTeams, createTeam, updateTeam, deleteTeam } from '../../firebase/teams';
import StatusBadge from '../../components/StatusBadge';

const TEAM_STATUSES = ['standby', 'deployed', 'enroute'];

const INITIAL_FORM = {
  code: '', name: '', organisation: '', members: '', status: 'standby', location: '', task: '',
};

/* ── Team Form Modal ─────────────────────────────────────────────────────── */
function TeamForm({ initial, onSave, onCancel, saving }) {
  const [form, setForm] = useState(initial ?? INITIAL_FORM);
  const [errors, setErrs] = useState({});

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
      <div className="absolute inset-0 bg-text/40" onClick={onCancel} aria-hidden="true" />
      <div className="relative bg-white border border-border rounded-radius-lg shadow-lg w-full max-w-md p-6 space-y-4 overflow-y-auto max-h-[90vh]">
        <h2 className="font-display text-lg text-text">
          {initial ? 'Edit Team' : 'Add Team'}
        </h2>

        <form onSubmit={handleSubmit} noValidate className="space-y-3">
          {[
            { key: 'code', label: 'Team Code', placeholder: 'e.g. RT-01' },
            { key: 'name', label: 'Team Name', placeholder: 'e.g. Rapid Response Alpha' },
            { key: 'organisation', label: 'Organisation', placeholder: 'e.g. Kenya Red Cross' },
            { key: 'location', label: 'Current Location', placeholder: 'e.g. Mathare North' },
            { key: 'task', label: 'Current Task', placeholder: 'e.g. Flood rescue operations' },
          ].map(({ key, label, placeholder }) => (
            <div key={key}>
              <label className="block font-body font-medium text-xs text-text mb-1">{label}</label>
              <input
                type="text"
                value={form[key]}
                onChange={(e) => set(key, e.target.value)}
                placeholder={placeholder}
                className={`w-full font-body text-sm bg-bg border rounded-radius px-3 py-2 text-text focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent ${errors[key] ? 'border-red' : 'border-border'}`}
              />
              {errors[key] && <p className="font-body text-xs text-red mt-0.5">{errors[key]}</p>}
            </div>
          ))}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-body font-medium text-xs text-text mb-1">Members</label>
              <input
                type="number" min="1"
                value={form.members}
                onChange={(e) => set('members', e.target.value)}
                className={`w-full font-body text-sm bg-bg border rounded-radius px-3 py-2 text-text focus:outline-none focus:ring-2 focus:ring-teal ${errors.members ? 'border-red' : 'border-border'}`}
              />
              {errors.members && <p className="font-body text-xs text-red mt-0.5">{errors.members}</p>}
            </div>
            <div>
              <label className="block font-body font-medium text-xs text-text mb-1">Status</label>
              <select
                value={form.status}
                onChange={(e) => set('status', e.target.value)}
                className="w-full font-body text-sm bg-bg border border-border rounded-radius px-3 py-2 text-text focus:outline-none focus:ring-2 focus:ring-teal"
              >
                {TEAM_STATUSES.map((s) => (
                  <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onCancel} className="flex-1 font-body text-sm font-medium text-text-mid border border-border rounded-radius py-2 hover:bg-bg transition-colors duration-150">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="flex-1 font-body text-sm font-semibold bg-teal text-white rounded-radius py-2 hover:bg-teal-dark disabled:opacity-60 transition-colors duration-150">
              {saving ? 'Saving…' : 'Save Team'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* Page */
export default function AdminTeams() {
  const [teams, setTeams]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]     = useState(null); // null | 'create' | team object
  const [saving, setSaving]   = useState(false);
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
    if (!confirm(`Delete team "${team.name}"? This cannot be undone.`)) return;
    try {
      await deleteTeam(team.id);
      showToast('Team deleted.');
    } catch (err) {
      console.error(err);
      showToast('Error: ' + err.message, 'error');
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-display-md text-text">Teams</h1>
          <p className="font-body text-sm text-text-mid mt-0.5">Manage response team assignments</p>
        </div>
        <button
          type="button"
          onClick={() => setModal('create')}
          className="font-body font-semibold text-sm bg-teal text-white px-4 py-2 rounded-radius hover:bg-teal-dark transition-colors duration-150 shadow-sm"
        >
          + Add Team
        </button>
      </div>

      <div className="bg-white border border-border rounded-radius-lg shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-12 text-center">
            <div className="w-6 h-6 border-2 border-teal border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : teams.length === 0 ? (
          <div className="py-12 text-center">
            <p className="font-body text-sm text-text-mid mb-1">No teams configured</p>
            <p className="font-body text-xs text-text-dim">Add a team to track response assignments</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]" aria-label="Teams table">
              <thead className="bg-bg border-b border-border">
                <tr>
                  {['Code', 'Name', 'Organisation', 'Members', 'Status', 'Location', 'Task', ''].map((h) => (
                    <th key={h} className="px-3 py-2 text-left font-mono text-xs text-text-dim uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {teams.map((team) => (
                  <tr key={team.id} className="border-b border-border hover:bg-teal-light/10 transition-colors duration-100">
                    <td className="px-3 py-3 font-mono text-xs text-text">{team.code}</td>
                    <td className="px-3 py-3 font-body text-xs font-medium text-text">{team.name}</td>
                    <td className="px-3 py-3 font-body text-xs text-text-mid">{team.organisation}</td>
                    <td className="px-3 py-3 font-mono text-xs text-text-mid">{team.members}</td>
                    <td className="px-3 py-3"><StatusBadge variant="team" value={team.status} /></td>
                    <td className="px-3 py-3 font-body text-xs text-text-mid max-w-[120px] truncate">{team.location}</td>
                    <td className="px-3 py-3 font-body text-xs text-text-mid max-w-[160px] truncate">{team.task}</td>
                    <td className="px-3 py-3">
                      <div className="flex gap-1.5">
                        <button type="button" onClick={() => setModal(team)} className="font-body text-xs px-2 py-1 rounded border border-border text-text-mid hover:border-teal hover:text-teal transition-colors duration-150">
                          Edit
                        </button>
                        <button type="button" onClick={() => handleDelete(team)} className="font-body text-xs px-2 py-1 rounded border border-border text-text-mid hover:border-red hover:text-red transition-colors duration-150">
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
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
        <div role="status" aria-live="polite" className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-radius shadow-lg font-body text-sm font-medium ${toast.type === 'error' ? 'bg-red text-white' : 'bg-teal text-white'}`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
