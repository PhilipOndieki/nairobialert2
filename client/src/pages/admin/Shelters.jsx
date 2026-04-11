import { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, CircleMarker } from 'react-leaflet';
import { subscribeToShelters, createShelter, updateShelter, deleteShelter } from '../../firebase/shelters';

// ── Nairobi bounding box — rejects clearly wrong coordinates ─────────────
const NAIROBI_BOUNDS = { minLat: -1.5, maxLat: -0.9, minLng: 36.5, maxLng: 37.1 };

function isWithinNairobi(lat, lng) {
  return (
    lat >= NAIROBI_BOUNDS.minLat &&
    lat <= NAIROBI_BOUNDS.maxLat &&
    lng >= NAIROBI_BOUNDS.minLng &&
    lng <= NAIROBI_BOUNDS.maxLng
  );
}

// ── Nominatim reverse geocode ────────────────────────────────────────────
async function reverseGeocode(lat, lng) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16&addressdetails=1`;
  const res = await fetch(url, {
    headers: {
      'Accept-Language': 'en',
      'User-Agent': 'NairobiAlert/1.0 (shelter-admin)',
    },
  });
  if (!res.ok) throw new Error(`Nominatim error ${res.status}`);
  const data = await res.json();
  return data.display_name ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

// ── Icons ────────────────────────────────────────────────────────────────
function IconPin({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
    </svg>
  );
}

function IconRefresh({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
    </svg>
  );
}

// ── Occupancy bar ─────────────────────────────────────────────────────────
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

// ── GPS Location Detector ─────────────────────────────────────────────────
// Self-contained: handles detecting, reverse geocoding, preview map, errors.
// Calls onResolved({ lat, lng, address }) when a valid location is confirmed.
// Calls onClear() when reset.
function GPSLocationDetector({ onResolved, onClear, existingLat, existingLng, existingAddress }) {
  const [detecting,   setDetecting]   = useState(false);
  const [gpsError,    setGpsError]    = useState(null);
  const [location,    setLocation]    = useState(
    // Initialise from existing shelter data when editing
    existingLat && existingLng
      ? { lat: existingLat, lng: existingLng, address: existingAddress || '' }
      : null
  );

  const handleDetect = useCallback(() => {
    if (!navigator.geolocation) {
      setGpsError('GPS is not available on this device. Please use a phone or laptop with location enabled.');
      return;
    }

    setDetecting(true);
    setGpsError(null);
    setLocation(null);
    onClear();

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude: lat, longitude: lng } = position.coords;

        // Validate within Nairobi bounds
        if (!isWithinNairobi(lat, lng)) {
          setGpsError(
            `Detected location (${lat.toFixed(4)}, ${lng.toFixed(4)}) is outside Nairobi. ` +
            'Make sure location services are on and you are on site.'
          );
          setDetecting(false);
          return;
        }

        try {
          const address = await reverseGeocode(lat, lng);
          const resolved = { lat, lng, address };
          setLocation(resolved);
          onResolved(resolved);
        } catch {
          // Geocoding failed — coordinates still valid, address left blank
          const resolved = { lat, lng, address: '' };
          setLocation(resolved);
          onResolved(resolved);
        } finally {
          setDetecting(false);
        }
      },
      (err) => {
        setDetecting(false);
        if (err.code === err.PERMISSION_DENIED) {
          setGpsError('Location permission denied. Please allow location access in your browser settings and try again.');
        } else if (err.code === err.TIMEOUT) {
          setGpsError('Location detection timed out. Make sure you are outdoors or near a window and try again.');
        } else {
          setGpsError('Could not detect location. Check that GPS is enabled on your device.');
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }, [onResolved, onClear]);

  const handleReset = useCallback(() => {
    setLocation(null);
    setGpsError(null);
    onClear();
  }, [onClear]);

  // ── Confirmed location state ─────────────────────────────────────────
  if (location) {
    return (
      <div className="space-y-2">
        {/* Map preview */}
        <div
          className="overflow-hidden rounded-radius border border-teal/30 shadow-sm"
          style={{ height: '200px' }}
        >
          <MapContainer
            center={[location.lat, location.lng]}
            zoom={17}
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
              center={[location.lat, location.lng]}
              radius={12}
              pathOptions={{
                color: '#1a7a4a',
                fillColor: '#1a7a4a',
                fillOpacity: 0.8,
                weight: 2,
              }}
            />
          </MapContainer>
        </div>

        {/* Coordinates + address */}
        <div className="bg-teal-light border border-teal/20 rounded-radius px-3 py-2.5 space-y-1">
          <div className="flex items-center gap-1.5">
            <IconPin size={13} />
            <span className="font-mono text-xs font-medium text-teal">Location confirmed</span>
          </div>
          {location.address && (
            <p className="font-body text-xs text-text leading-relaxed line-clamp-2">
              {location.address}
            </p>
          )}
          <p className="font-mono text-xs text-text-dim">
            {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
          </p>
        </div>

        {/* Re-detect button */}
        <button
          type="button"
          onClick={handleReset}
          className="inline-flex items-center gap-1.5 font-body text-xs font-medium text-text-mid hover:text-teal transition-colors duration-150"
        >
          <IconRefresh size={13} />
          Re-detect location
        </button>
      </div>
    );
  }

  // ── Detection / idle state ───────────────────────────────────────────
  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleDetect}
        disabled={detecting}
        className="w-full flex items-center justify-center gap-2.5 bg-teal text-white font-body font-semibold text-sm py-3 px-4 rounded-radius hover:bg-teal-dark focus:outline-none focus:ring-2 focus:ring-teal focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-150 shadow-sm"
      >
        {detecting ? (
          <>
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin flex-shrink-0" />
            Detecting location…
          </>
        ) : (
          <>
            <IconPin size={16} />
            Use My Current Location
          </>
        )}
      </button>

      {/* Instructional note */}
      <p className="font-body text-xs text-text-dim leading-relaxed">
        Stand at or inside the shelter and tap the button above. Your GPS coordinates will be pinned on the map.
      </p>

      {/* GPS error */}
      {gpsError && (
        <div
          className="bg-red-light border border-red/20 rounded-radius px-3 py-2.5"
          role="alert"
        >
          <p className="font-body text-xs text-red leading-relaxed">{gpsError}</p>
        </div>
      )}
    </div>
  );
}

// ── Shelter Form Modal ────────────────────────────────────────────────────
const INITIAL_FORM = {
  name: '', address: '', capacity: '', occupancy: '0', is_open: true,
};

function ShelterForm({ initial, onSave, onCancel, saving }) {
  const [form,     setForm]     = useState({
    name:      initial?.name      ?? '',
    address:   initial?.address   ?? '',
    capacity:  initial?.capacity  ? String(initial.capacity)  : '',
    occupancy: initial?.occupancy ? String(initial.occupancy) : '0',
    is_open:   initial?.is_open   ?? true,
  });
  const [coords,   setCoords]   = useState(
    initial?.lat && initial?.lng
      ? { lat: initial.lat, lng: initial.lng }
      : null
  );
  const [errors,   setErrs]     = useState({});

  function set(k, v) {
    setForm((p) => ({ ...p, [k]: v }));
    if (errors[k]) setErrs((p) => ({ ...p, [k]: undefined }));
  }

  const handleLocationResolved = useCallback(({ lat, lng, address }) => {
    setCoords({ lat, lng });
    // Auto-fill address only if admin hasn't typed one yet
    if (!form.address.trim()) {
      setForm((p) => ({ ...p, address }));
    }
    setErrs((p) => ({ ...p, location: undefined }));
  }, [form.address]);

  const handleLocationClear = useCallback(() => {
    setCoords(null);
  }, []);

  function validate() {
    const e = {};
    if (!form.name.trim())    e.name    = 'Shelter name is required.';
    if (!form.address.trim()) e.address = 'Street address is required.';
    if (!coords)              e.location = 'Please detect the shelter location using GPS.';
    if (!form.capacity || isNaN(Number(form.capacity)) || Number(form.capacity) < 1)
      e.capacity = 'Capacity must be a positive number.';
    return e;
  }

  function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrs(errs); return; }
    onSave({
      name:      form.name.trim(),
      address:   form.address.trim(),
      lat:       coords.lat,
      lng:       coords.lng,
      capacity:  Number(form.capacity),
      occupancy: Number(form.occupancy) || 0,
      is_open:   Boolean(form.is_open),
    });
  }

  const isEdit = Boolean(initial);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      aria-modal="true"
      role="dialog"
      aria-label={isEdit ? 'Edit shelter' : 'Add shelter'}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-text/40 backdrop-blur-sm"
        onClick={onCancel}
        aria-hidden="true"
      />

      {/* Modal card */}
      <div className="relative bg-white border border-border rounded-radius-lg shadow-lg w-full max-w-md overflow-y-auto max-h-[92vh]">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 bg-white border-b border-border">
          <div>
            <h2 className="font-display text-lg text-text leading-none">
              {isEdit ? 'Edit Shelter' : 'Add Shelter'}
            </h2>
            <p className="font-mono text-xs text-text-dim mt-0.5">
              {isEdit ? 'Update shelter details' : 'Stand on-site for accurate GPS'}
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

        <form onSubmit={handleSubmit} noValidate className="px-5 py-5 space-y-5">

          {/* ── GPS Location ─────────────────────────────────────────── */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="font-body font-medium text-sm text-text">
                Shelter Location
                <span className="text-red ml-0.5" aria-hidden="true">*</span>
              </label>
              {coords && (
                <span className="font-mono text-xs text-green bg-green-light border border-green/20 px-2 py-0.5 rounded-full">
                  GPS confirmed
                </span>
              )}
            </div>

            <GPSLocationDetector
              onResolved={handleLocationResolved}
              onClear={handleLocationClear}
              existingLat={initial?.lat}
              existingLng={initial?.lng}
              existingAddress={initial?.address}
            />

            {errors.location && (
              <p className="mt-1.5 font-body text-xs text-red" role="alert">
                {errors.location}
              </p>
            )}
          </div>

          {/* ── Shelter Name ──────────────────────────────────────────── */}
          <div>
            <label className="block font-body font-medium text-sm text-text mb-1.5">
              Shelter Name
              <span className="text-red ml-0.5" aria-hidden="true">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="e.g. Mathare Primary School Hall"
              className={`w-full font-body text-sm bg-bg border rounded-radius px-3 py-2.5 text-text placeholder-text-dim focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent transition-colors duration-150 ${
                errors.name ? 'border-red' : 'border-border hover:border-border-dark'
              }`}
            />
            {errors.name && <p className="mt-1 font-body text-xs text-red">{errors.name}</p>}
          </div>

          {/* ── Street Address ────────────────────────────────────────── */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-body font-medium text-sm text-text">
                Street Address
                <span className="text-red ml-0.5" aria-hidden="true">*</span>
              </label>
              {coords && !form.address && (
                <span className="font-mono text-xs text-text-dim">Auto-filled from GPS</span>
              )}
            </div>
            <input
              type="text"
              value={form.address}
              onChange={(e) => set('address', e.target.value)}
              placeholder="e.g. Off Juja Road, Mathare North"
              className={`w-full font-body text-sm bg-bg border rounded-radius px-3 py-2.5 text-text placeholder-text-dim focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent transition-colors duration-150 ${
                errors.address ? 'border-red' : 'border-border hover:border-border-dark'
              }`}
            />
            <p className="mt-1 font-body text-xs text-text-dim">
              GPS auto-fills this field. Edit if the detected address is imprecise.
            </p>
            {errors.address && <p className="mt-0.5 font-body text-xs text-red">{errors.address}</p>}
          </div>

          {/* ── Capacity + Occupancy ──────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-body font-medium text-sm text-text mb-1.5">
                Capacity
                <span className="text-red ml-0.5" aria-hidden="true">*</span>
              </label>
              <input
                type="number"
                min="1"
                value={form.capacity}
                onChange={(e) => set('capacity', e.target.value)}
                placeholder="e.g. 300"
                className={`w-full font-body text-sm bg-bg border rounded-radius px-3 py-2.5 text-text placeholder-text-dim focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent transition-colors duration-150 ${
                  errors.capacity ? 'border-red' : 'border-border hover:border-border-dark'
                }`}
              />
              {errors.capacity && <p className="mt-1 font-body text-xs text-red">{errors.capacity}</p>}
            </div>

            <div>
              <label className="block font-body font-medium text-sm text-text mb-1.5">
                Current Occupancy
              </label>
              <input
                type="number"
                min="0"
                value={form.occupancy}
                onChange={(e) => set('occupancy', e.target.value)}
                placeholder="0"
                className="w-full font-body text-sm bg-bg border border-border hover:border-border-dark rounded-radius px-3 py-2.5 text-text placeholder-text-dim focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent transition-colors duration-150"
              />
            </div>
          </div>

          {/* ── Open toggle ───────────────────────────────────────────── */}
          <label className="flex items-center gap-3 cursor-pointer p-3 rounded-radius border border-border hover:border-teal hover:bg-teal-light/30 transition-all duration-150">
            <input
              type="checkbox"
              checked={form.is_open}
              onChange={(e) => set('is_open', e.target.checked)}
              className="w-4 h-4 rounded border-border text-teal focus:ring-teal"
            />
            <div>
              <p className="font-body font-medium text-sm text-text leading-none">
                Shelter is open
              </p>
              <p className="font-body text-xs text-text-dim mt-0.5">
                Tick when actively accepting evacuees
              </p>
            </div>
          </label>

          {/* ── Actions ───────────────────────────────────────────────── */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 font-body font-medium text-sm text-text-mid border border-border rounded-radius py-2.5 hover:bg-bg hover:text-text transition-colors duration-150"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 font-body font-semibold text-sm bg-teal text-white rounded-radius py-2.5 hover:bg-teal-dark disabled:opacity-60 disabled:cursor-not-allowed transition-colors duration-150 shadow-sm"
            >
              {saving ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving…
                </span>
              ) : (
                isEdit ? 'Save Changes' : 'Add Shelter'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────
export default function AdminShelters() {
  const [shelters, setShelters] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [modal,    setModal]    = useState(null); // null | 'create' | shelter object
  const [saving,   setSaving]   = useState(false);
  const [toast,    setToast]    = useState(null);

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
        showToast('Shelter added and now visible on the public map.');
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
    if (!confirm(`Delete "${shelter.name}"? This will remove it from the public map immediately.`)) return;
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
      showToast(shelter.is_open ? 'Shelter closed.' : 'Shelter opened.');
    } catch (err) {
      console.error(err);
      showToast('Error: ' + err.message, 'error');
    }
  }

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-display-md text-text">Shelters</h1>
          <p className="font-body text-sm text-text-mid mt-0.5">
            Manage evacuation shelters. Stand on-site when adding a new location.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setModal('create')}
          className="font-body font-semibold text-sm bg-teal text-white px-4 py-2 rounded-radius hover:bg-teal-dark transition-colors duration-150 shadow-sm"
        >
          + Add Shelter
        </button>
      </div>

      {/* GPS guidance banner */}
      <div className="flex items-start gap-3 bg-teal-light border border-teal/20 rounded-radius px-4 py-3">
        <IconPin size={16} />
        <div>
          <p className="font-body font-semibold text-sm text-teal leading-none mb-0.5">
            On-site GPS required
          </p>
          <p className="font-body text-xs text-text-mid leading-relaxed">
            When adding a shelter, physically go to the location first. The "Use My Current Location"
            button will pin your exact GPS coordinates. Do not add shelters remotely — inaccurate
            pins will misdirect evacuees.
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-border rounded-radius-lg shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-12 text-center">
            <div className="w-6 h-6 border-2 border-teal border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : shelters.length === 0 ? (
          <div className="py-12 text-center">
            <div className="w-12 h-12 bg-teal-light rounded-full flex items-center justify-center mx-auto mb-3">
              <IconPin size={20} />
            </div>
            <p className="font-body font-medium text-sm text-text-mid mb-1">No shelters configured</p>
            <p className="font-body text-xs text-text-dim mb-4">
              Go to a shelter location and tap "Add Shelter" to pin it on the map.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]" aria-label="Shelters table">
              <thead className="bg-bg border-b border-border">
                <tr>
                  {['Name', 'Address', 'Coordinates', 'Capacity', 'Occupancy', 'Status', ''].map((h) => (
                    <th
                      key={h}
                      className="px-3 py-2 text-left font-mono text-xs text-text-dim uppercase tracking-wider whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {shelters.map((shelter) => (
                  <tr
                    key={shelter.id}
                    className="border-b border-border hover:bg-teal-light/10 transition-colors duration-100"
                  >
                    <td className="px-3 py-3 font-body text-xs font-medium text-text">
                      {shelter.name}
                    </td>
                    <td className="px-3 py-3 font-body text-xs text-text-mid max-w-[160px] truncate">
                      {shelter.address}
                    </td>
                    {/* Coordinates — shows GPS badge if valid, warning if missing */}
                    <td className="px-3 py-3">
                      {shelter.lat && shelter.lng ? (
                        <div className="space-y-0.5">
                          <span className="inline-flex items-center gap-1 font-mono text-xs bg-teal-light text-teal border border-teal/20 px-1.5 py-0.5 rounded-full">
                            <IconPin size={10} />
                            GPS
                          </span>
                          <p className="font-mono text-xs text-text-dim">
                            {Number(shelter.lat).toFixed(4)}, {Number(shelter.lng).toFixed(4)}
                          </p>
                        </div>
                      ) : (
                        <span className="font-mono text-xs text-red bg-red-light border border-red/20 px-1.5 py-0.5 rounded-full">
                          No location
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 font-mono text-xs text-text-mid">
                      {shelter.capacity}
                    </td>
                    <td className="px-3 py-3 min-w-[130px]">
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
                        <button
                          type="button"
                          onClick={() => setModal(shelter)}
                          className="font-body text-xs px-2 py-1 rounded border border-border text-text-mid hover:border-teal hover:text-teal transition-colors duration-150"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(shelter)}
                          className="font-body text-xs px-2 py-1 rounded border border-border text-text-mid hover:border-red hover:text-red transition-colors duration-150"
                        >
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
        <div
          role="status"
          aria-live="polite"
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-radius shadow-lg font-body text-sm font-medium transition-all ${
            toast.type === 'error' ? 'bg-red text-white' : 'bg-teal text-white'
          }`}
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}