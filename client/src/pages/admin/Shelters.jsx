import { useState, useEffect } from 'react';
import { subscribeToShelters, createShelter, updateShelter, deleteShelter } from '../../firebase/shelters';

const INITIAL_FORM = {
  name: '', address: '', lat: '', lng: '', capacity: '', occupancy: '0', is_open: true,
};

/* ── Occupancy bar ───────────────────────────────────────────────────────── */
function OccupancyBar({ occupancy, capacity }) {
  if (!capacity) return null;
  const pct = Math.min(100, Math.round((occupancy / capacity) * 100));
  const color = pct >= 90 ? 'bg-red' : pct >= 70 ? 'bg-amber' : 'bg-green';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="font-mono text-xs text-text-dim w-8 text-right">{pct}%</span>
    </div>
  );
}

/* ── Shelter Form Modal ──────────────────────────────────────────────────── */
function ShelterForm({ initial, onSave, onCancel, saving }) {
  const [form, setForm] = useState(initial ?? INITIAL_FORM);
  const [errors, setErrs] = useState({});

  function set(k, v) {
    setForm((p) => ({ ...p, [k]: v }));
    if (errors[k]) setErrs((p) => ({ ...p, [k]: undefined }));
  }

  function validate() {
    const e = {};
    if (!form.name.trim())    e.name    = 'Required';
    if (!form.address.trim()) e.address = 'Required';
    if (!form.capacity || isNaN(Number(form.capacity)) || Number(form.capacity) < 1)
      e.capacity = 'Must be a positive number';
    if (form.lat && isNaN(Number(form.lat))) e.lat = 'Must be a number';
    if (form.lng && isNaN(Number(form.lng))) e.lng = 'Must be a number';
    return e;
  }

  function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrs(errs); return; }
    onSave({
      ...form,
      lat:       Number(form.lat)       || 0,
      lng:       Number(form.lng)       || 0,
      capacity:  Number(form.capacity),
      occupancy: Number(form.occupancy) || 0,
      is_open:   Boolean(form.is_open),
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" aria-modal="true" role="dialog">
      <div className="absolute inset-0 bg-text/40" onClick={onCancel} aria-hidden="true" />
      <div className="relative bg-white border border-border rounded-radius-lg shadow-lg w-full max-w-md p-6 space-y-4 overflow-y-auto max-h-[90vh]">
        <h2 className="font-display text-lg text-text">{initial ? 'Edit Shelter' : 'Add Shelter'}</h2>

        <form onSubmit={handleSubmit} noValidate className="space-y-3">
          {[
            { key: 'name',    label: 'Shelter Name',    placeholder: 'e.g. Mathare Primary School' },
            { key: 'address', label: 'Street Address',  placeholder: 'e.g. Off Juja Rd, Mathare' },
          ].map(({ key, label, placeholder }) => (
            <div key={key}>
              <label className="block font-body font-medium text-xs text-text mb-1">{label}</label>
              <input
                type="text"
                value={form[key]}
                onChange={(e) => set(key, e.target.value)}
                placeholder={placeholder}
                className={`w-full font-body text-sm bg-bg border rounded-radius px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent ${errors[key] ? 'border-red' : 'border-border'}`}
              />
              {errors[key] && <p className="font-body text-xs text-red mt-0.5">{errors[key]}</p>}
            </div>
          ))}

          <div className="grid grid-cols-2 gap-3">
            {[
              { key: 'lat', label: 'Latitude',  placeholder: '-1.2854' },
              { key: 'lng', label: 'Longitude', placeholder: '36.8512' },
            ].map(({ key, label, placeholder }) => (
              <div key={key}>
                <label className="block font-body font-medium text-xs text-text mb-1">{label}</label>
                <input
                  type="number" step="any"
                  value={form[key]}
                  onChange={(e) => set(key, e.target.value)}
                  placeholder={placeholder}
                  className={`w-full font-body text-sm bg-bg border rounded-radius px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal ${errors[key] ? 'border-red' : 'border-border'}`}
                />
                {errors[key] && <p className="font-body text-xs text-red mt-0.5">{errors[key]}</p>}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-body font-medium text-xs text-text mb-1">Capacity</label>
              <input
                type="number" min="1"
                value={form.capacity}
                onChange={(e) => set('capacity', e.target.value)}
                className={`w-full font-body text-sm bg-bg border rounded-radius px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal ${errors.capacity ? 'border-red' : 'border-border'}`}
              />
              {errors.capacity && <p className="font-body text-xs text-red mt-0.5">{errors.capacity}</p>}
            </div>
            <div>
              <label className="block font-body font-medium text-xs text-text mb-1">Current Occupancy</label>
              <input
                type="number" min="0"
                value={form.occupancy}
                onChange={(e) => set('occupancy', e.target.value)}
                className="w-full font-body text-sm bg-bg border border-border rounded-radius px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_open}
              onChange={(e) => set('is_open', e.target.checked)}
              className="w-4 h-4 rounded border-border text-teal focus:ring-teal"
            />
            <span className="font-body text-sm text-text">Shelter is open / accepting people</span>
          </label>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onCancel} className="flex-1 font-body text-sm font-medium text-text-mid border border-border rounded-radius py-2 hover:bg-bg transition-colors duration-150">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="flex-1 font-body text-sm font-semibold bg-teal text-white rounded-radius py-2 hover:bg-teal-dark disabled:opacity-60 transition-colors duration-150">
              {saving ? 'Saving…' : 'Save Shelter'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* Page */
export default function AdminShelters() {
  const [shelters, setShelters] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [modal, setModal]       = useState(null);
  const [saving, setSaving]     = useState(false);
  const [toast, setToast]       = useState(null);

  useEffect(() => {
    const unsub = subscribeToShelters(
      (data) => { setShelters(data); setLoading(false); },
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
        await createShelter(formData);
        showToast('Shelter created.');
      } else {
        await updateShelter(modal.id, formData);
        showToast('Shelter updated.');
      }
      setModal(null);
    } catch (err) {
      console.error(err);
      showToast('Error: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(shelter) {
    if (!confirm(`Delete shelter "${shelter.name}"? This cannot be undone.`)) return;
    try {
      await deleteShelter(shelter.id);
      showToast('Shelter deleted.');
    } catch (err) {
      console.error(err);
      showToast('Error: ' + err.message, 'error');
    }
  }

  async function toggleOpen(shelter) {
    try {
      await updateShelter(shelter.id, { is_open: !shelter.is_open });
    } catch (err) {
      console.error(err);
      showToast('Error: ' + err.message, 'error');
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-display-md text-text">Shelters</h1>
          <p className="font-body text-sm text-text-mid mt-0.5">Manage evacuation shelter records and occupancy</p>
        </div>
        <button
          type="button"
          onClick={() => setModal('create')}
          className="font-body font-semibold text-sm bg-teal text-white px-4 py-2 rounded-radius hover:bg-teal-dark transition-colors duration-150 shadow-sm"
        >
          + Add Shelter
        </button>
      </div>

      <div className="bg-white border border-border rounded-radius-lg shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-12 text-center">
            <div className="w-6 h-6 border-2 border-teal border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : shelters.length === 0 ? (
          <div className="py-12 text-center">
            <p className="font-body text-sm text-text-mid mb-1">No shelters configured</p>
            <p className="font-body text-xs text-text-dim">Add shelters to display on the public map</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]" aria-label="Shelters table">
              <thead className="bg-bg border-b border-border">
                <tr>
                  {['Name', 'Address', 'Capacity', 'Occupancy', 'Status', ''].map((h) => (
                    <th key={h} className="px-3 py-2 text-left font-mono text-xs text-text-dim uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {shelters.map((shelter) => (
                  <tr key={shelter.id} className="border-b border-border hover:bg-teal-light/10 transition-colors duration-100">
                    <td className="px-3 py-3 font-body text-xs font-medium text-text">{shelter.name}</td>
                    <td className="px-3 py-3 font-body text-xs text-text-mid max-w-[160px] truncate">{shelter.address}</td>
                    <td className="px-3 py-3 font-mono text-xs text-text-mid">{shelter.capacity}</td>
                    <td className="px-3 py-3 min-w-[120px]">
                      <p className="font-mono text-xs text-text-mid mb-1">
                        {shelter.occupancy} / {shelter.capacity}
                      </p>
                      <OccupancyBar occupancy={shelter.occupancy} capacity={shelter.capacity} />
                    </td>
                    <td className="px-3 py-3">
                      <button
                        type="button"
                        onClick={() => toggleOpen(shelter)}
                        className={`font-mono text-xs px-2 py-0.5 rounded-full border transition-colors duration-150 ${
                          shelter.is_open
                            ? 'bg-green-light text-green border-green/20 hover:bg-green hover:text-white'
                            : 'bg-border text-text-dim border-border-dark hover:bg-text-dim hover:text-white'
                        }`}
                      >
                        {shelter.is_open ? 'Open' : 'Closed'}
                      </button>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex gap-1.5">
                        <button type="button" onClick={() => setModal(shelter)} className="font-body text-xs px-2 py-1 rounded border border-border text-text-mid hover:border-teal hover:text-teal transition-colors duration-150">
                          Edit
                        </button>
                        <button type="button" onClick={() => handleDelete(shelter)} className="font-body text-xs px-2 py-1 rounded border border-border text-text-mid hover:border-red hover:text-red transition-colors duration-150">
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
        <ShelterForm
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
