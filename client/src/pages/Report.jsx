import { useState, useEffect, useCallback, useId } from 'react';
import { MapContainer, TileLayer, CircleMarker } from 'react-leaflet';
import { createIncident } from '../firebase/incidents';
import { useZones } from '../hooks/useZones';

/* Constants ───────────────────────────────────────────────────────────── */
const INCIDENT_TYPES = [
  { value: 'flood',     label: 'Flooding / Water Overflow' },
  { value: 'landslide', label: 'Landslide / Mudslide' },
  { value: 'blocked',   label: 'Road Blocked / Inaccessible' },
  { value: 'rescue',    label: 'Rescue Needed' },
  { value: 'shelter',   label: 'Shelter Request' },
  { value: 'other',     label: 'Other Emergency' },
];

const SEVERITY_OPTIONS = [
  {
    value: 'critical',
    label: 'Critical',
    desc:  'Life-threatening, immediate response needed',
    color: 'border-red bg-red-light text-red',
    check: 'ring-red',
  },
  {
    value: 'warning',
    label: 'Warning',
    desc:  'Serious situation, response required soon',
    color: 'border-amber bg-amber-light text-amber',
    check: 'ring-amber',
  },
  {
    value: 'info',
    label: 'Info',
    desc:  'Developing situation, monitoring needed',
    color: 'border-teal bg-teal-light text-teal',
    check: 'ring-teal',
  },
];

const INITIAL_FORM = {
  type:            '',
  severity:        '',
  zone_name:       '',
  description:     '',
  reporter_phone:  '',
  people_affected: '',
  _honeypot:       '',
};

// GPS options — high accuracy, 10s timeout, accept cached position up to 1min old
const GEO_OPTIONS = {
  enableHighAccuracy: true,
  timeout:            10000,
  maximumAge:         60000,
};

const NOMINATIM_HEADERS = {
  'Accept-Language': 'en',
  'User-Agent':      'NairobiAlert/1.0 (flood-response-system)',
};

/* ── Haversine Distance (km) ─────────────────────────────────────────────── */
// Pure function — no deps, no packages. Standard haversine formula.
function haversineKm(lat1, lng1, lat2, lng2) {
  const R    = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) *
    Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/* ── Find Nearest Zone ───────────────────────────────────────────────────── */
function findNearestZone(lat, lng, zones) {
  if (!zones || zones.length === 0) return null;
  let nearest  = null;
  let minDist  = Infinity;
  for (const zone of zones) {
    if (!zone.lat || !zone.lng) continue;
    const dist = haversineKm(lat, lng, zone.lat, zone.lng);
    if (dist < minDist) {
      minDist = dist;
      nearest = zone;
    }
  }
  if (!nearest) return null;
  return {
    zone:     nearest,
    distanceKm: minDist,
    label:    `Matched: ${nearest.name} (~${minDist < 1 ? `${Math.round(minDist * 1000)}m` : `${minDist.toFixed(1)}km`})`,
  };
}

/* ── Nominatim Reverse Geocode ───────────────────────────────────────────── */
async function reverseGeocode(lat, lng) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16&addressdetails=1`;
  const res = await fetch(url, { headers: NOMINATIM_HEADERS });
  if (!res.ok) throw new Error(`Nominatim responded ${res.status}`);
  const data = await res.json();
  return data.display_name ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

/* ── Field components ────────────────────────────────────────────────────── */
function Label({ htmlFor, children, required }) {
  return (
    <label htmlFor={htmlFor} className="block font-body font-medium text-sm text-text mb-1.5">
      {children}
      {required && <span className="text-red ml-0.5" aria-hidden="true">*</span>}
    </label>
  );
}

function FieldError({ message }) {
  if (!message) return null;
  return <p className="mt-1 font-body text-xs text-red">{message}</p>;
}

/* ── Severity Selector ───────────────────────────────────────────────────── */
function SeveritySelector({ value, onChange, error }) {
  return (
    <div>
      <p className="font-body font-medium text-sm text-text mb-1.5">
        Severity <span className="text-red" aria-hidden="true">*</span>
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3" role="radiogroup" aria-label="Severity">
        {SEVERITY_OPTIONS.map((opt) => (
          <label
            key={opt.value}
            className={`relative flex flex-col gap-1 p-3 border-2 rounded-radius cursor-pointer transition-all duration-150 ${
              value === opt.value
                ? `${opt.color} border-current ring-2 ${opt.check} ring-offset-1`
                : 'border-border bg-white text-text-mid hover:border-border-dark'
            }`}
          >
            <input
              type="radio"
              name="severity"
              value={opt.value}
              checked={value === opt.value}
              onChange={() => onChange(opt.value)}
              className="sr-only"
            />
            <span className="font-body font-semibold text-sm">{opt.label}</span>
            <span className="font-body text-xs leading-snug opacity-80">{opt.desc}</span>
          </label>
        ))}
      </div>
      <FieldError message={error} />
    </div>
  );
}

/* ── GPS Detect Button ───────────────────────────────────────────────────── */
function DetectButton({ onClick, detecting }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={detecting}
      className="w-full flex items-center justify-center gap-2.5 bg-teal text-white font-body font-semibold text-sm py-3 px-4 rounded-radius hover:bg-teal-dark focus:outline-none focus:ring-2 focus:ring-teal focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-150 shadow-sm"
      aria-label="Detect my current location using GPS"
    >
      {detecting ? (
        <>
          <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin flex-shrink-0" />
          Detecting location…
        </>
      ) : (
        <>
          {/* Location pin icon */}
          <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
          </svg>
          Detect My Location
        </>
      )}
    </button>
  );
}

/* ── Location Preview Map ────────────────────────────────────────────────── */
function LocationPreviewMap({ lat, lng }) {
  // Leaflet CSS already imported globally in src/index.css — do not re-import.
  return (
    <MapContainer
      center={[lat, lng]}
      zoom={15}
      style={{ height: '200px', width: '100%', borderRadius: '10px' }}
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
        center={[lat, lng]}
        radius={10}
        pathOptions={{
          color:       '#0a7e6e',
          fillColor:   '#0a7e6e',
          fillOpacity: 0.75,
          weight:      2,
        }}
      />
    </MapContainer>
  );
}

/* ── Location Section ────────────────────────────────────────────────────── */
// Encapsulates all three location tiers and their state.
// Calls onResolved({ lat, lng, zone_name }) when location is confirmed.
function LocationSection({ zones, zonesLoading, onResolved, error }) {
  // gpsSupported: null = unknown, true/false after mount check
  const [gpsSupported,  setGpsSupported]  = useState(null);
  const [detecting,     setDetecting]     = useState(false);
  const [gpsError,      setGpsError]      = useState(null);

  // Resolved location state
  const [resolved,      setResolved]      = useState(null);
  // { lat, lng, displayName, matchLabel, usingFallback }

  // Zone dropdown state — used both as auto-match display and manual override
  const [selectedZone,  setSelectedZone]  = useState('');
  const [usingFallback, setUsingFallback] = useState(false);

  // Check GPS support on mount — silent, no side effects
  useEffect(() => {
    setGpsSupported('geolocation' in navigator);
  }, []);

  // Propagate resolved location up to parent form on every change
  useEffect(() => {
    if (resolved) {
      onResolved({
        lat:       resolved.lat,
        lng:       resolved.lng,
        zone_name: selectedZone,
      });
    } else if (usingFallback && selectedZone) {
      // Zone fallback: find the zone object to get its coordinates
      const zone = zones.find((z) => z.name === selectedZone);
      if (zone) {
        onResolved({
          lat:       zone.lat ?? 0,
          lng:       zone.lng ?? 0,
          zone_name: selectedZone,
        });
      }
    } else {
      onResolved(null);
    }
  }, [resolved, selectedZone, usingFallback, zones, onResolved]);

  const handleDetect = useCallback(() => {
    if (!navigator.geolocation) return;
    setDetecting(true);
    setGpsError(null);
    setResolved(null);
    setUsingFallback(false);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude: lat, longitude: lng } = position.coords;
        try {
          const displayName = await reverseGeocode(lat, lng);
          const match       = findNearestZone(lat, lng, zones);
          const matchedZone = match?.zone?.name ?? '';

          setResolved({
            lat,
            lng,
            displayName,
            matchLabel:    match?.label ?? null,
            usingFallback: false,
          });
          setSelectedZone(matchedZone);
        } catch {
          // Reverse geocode failed — still have valid coordinates, just no address text
          const match = findNearestZone(lat, lng, zones);
          setResolved({
            lat,
            lng,
            displayName:   `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
            matchLabel:    match?.label ?? null,
            usingFallback: false,
          });
          setSelectedZone(match?.zone?.name ?? '');
        } finally {
          setDetecting(false);
        }
      },
      (err) => {
        setDetecting(false);
        if (err.code === err.PERMISSION_DENIED) {
          setGpsError('Location access denied. Please select your zone manually below.');
        } else if (err.code === err.TIMEOUT) {
          setGpsError('Location detection timed out. Please select your zone manually below.');
        } else {
          setGpsError('Could not detect location. Select your zone below.');
        }
        setUsingFallback(true);
      },
      GEO_OPTIONS,
    );
  }, [zones]);

  const handleReset = useCallback(() => {
    setResolved(null);
    setGpsError(null);
    setSelectedZone('');
    setUsingFallback(false);
    setDetecting(false);
  }, []);

  const handleZoneChange = useCallback((zoneName) => {
    setSelectedZone(zoneName);
    if (!resolved) {
      // Pure fallback path — mark as fallback so parent gets zone coordinates
      setUsingFallback(true);
    }
  }, [resolved]);

  // ── Resolved state — show map preview ──────────────────────────────────
  if (resolved) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="font-body font-medium text-sm text-text">
            Location <span className="text-red" aria-hidden="true">*</span>
          </p>
          <button
            type="button"
            onClick={handleReset}
            className="font-body text-xs text-teal hover:text-teal-dark font-medium transition-colors duration-150"
          >
            Change Location
          </button>
        </div>

        {/* Map preview */}
        <div className="overflow-hidden rounded-radius border border-border shadow-sm">
          <LocationPreviewMap lat={resolved.lat} lng={resolved.lng} />
        </div>

        {/* Address + coordinates */}
        <div className="bg-teal-light border border-teal/20 rounded-radius px-3 py-2.5 space-y-1">
          <p className="font-body text-xs text-text leading-relaxed line-clamp-2">
            {resolved.displayName}
          </p>
          <p className="font-mono text-xs text-text-dim">
            [{resolved.lat.toFixed(5)}, {resolved.lng.toFixed(5)}]
          </p>
          {resolved.matchLabel && (
            <p className="font-mono text-xs text-teal font-medium">
              {resolved.matchLabel}
            </p>
          )}
        </div>

        {/* Zone override dropdown — still editable after GPS match */}
        <div>
          <Label htmlFor="zone-override">Zone (auto-matched — override if needed)</Label>
          <select
            id="zone-override"
            value={selectedZone}
            onChange={(e) => setSelectedZone(e.target.value)}
            disabled={zonesLoading}
            className="w-full font-body text-sm bg-bg border border-border rounded-radius px-3 py-2.5 text-text focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent transition-colors duration-150 disabled:opacity-60"
          >
            <option value="">
              {zonesLoading ? 'Loading zones…' : 'Select zone…'}
            </option>
            {zones.map((z) => (
              <option key={z.id} value={z.name}>{z.name}</option>
            ))}
            <option value="Other / Unknown">Other / Unknown</option>
          </select>
        </div>

        {error && <FieldError message={error} />}
      </div>
    );
  }

  // ── Detection / initial state — show detect button + fallback ──────────
  return (
    <div className="space-y-3">
      <p className="font-body font-medium text-sm text-text">
        Location <span className="text-red" aria-hidden="true">*</span>
      </p>

      {/* Detect button — only render if GPS is supported */}
      {gpsSupported !== false && (
        <DetectButton onClick={handleDetect} detecting={detecting} />
      )}

      {/* GPS not supported at all */}
      {gpsSupported === false && (
        <div className="bg-amber-light border border-amber/20 rounded-radius px-3 py-2.5">
          <p className="font-body text-xs text-amber">
            GPS not available on this device. Please select your zone below.
          </p>
        </div>
      )}

      {/* GPS error or denied */}
      {gpsError && (
        <div className="bg-amber-light border border-amber/20 rounded-radius px-3 py-2.5" role="alert">
          <p className="font-body text-xs text-amber leading-relaxed">{gpsError}</p>
        </div>
      )}

      {/* Divider — only when GPS is available */}
      {gpsSupported !== false && (
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-border" />
          <span className="font-mono text-xs text-text-dim">or select manually</span>
          <div className="flex-1 h-px bg-border" />
        </div>
      )}

      {/* Fallback accuracy warning — show when GPS was denied or unsupported */}
      {(usingFallback || gpsSupported === false) && (
        <div className="bg-amber-light border border-amber/20 rounded-radius px-3 py-2">
          <p className="font-mono text-xs text-amber">
            Using zone centre as location — lower accuracy
          </p>
        </div>
      )}

      {/* Zone dropdown — always present as fallback */}
      <div>
        <Label htmlFor="zone-fallback">Select your zone</Label>
        <select
          id="zone-fallback"
          value={selectedZone}
          onChange={(e) => handleZoneChange(e.target.value)}
          disabled={zonesLoading}
          className={`w-full font-body text-sm bg-bg border rounded-radius px-3 py-2.5 text-text focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent transition-colors duration-150 disabled:opacity-60 ${
            error ? 'border-red' : 'border-border hover:border-border-dark'
          }`}
        >
          <option value="">
            {zonesLoading ? 'Loading zones…' : zones.length === 0 ? 'No zones configured' : 'Select zone…'}
          </option>
          {zones.map((z) => (
            <option key={z.id} value={z.name}>{z.name}</option>
          ))}
          <option value="Other / Unknown">Other / Unknown</option>
        </select>
        {error && <FieldError message={error} />}
      </div>
    </div>
  );
}

/* ── Success State ───────────────────────────────────────────────────────── */
function SuccessState({ incidentId, onReset }) {
  return (
    <div className="text-center py-12 px-4">
      <div className="inline-flex items-center justify-center w-16 h-16 bg-green-light rounded-full mb-4">
        <svg className="w-8 h-8 text-green" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
        </svg>
      </div>
      <h2 className="font-display text-display-md text-text mb-2">Report Received</h2>
      <p className="font-body text-text-mid text-sm mb-4 leading-relaxed max-w-sm mx-auto">
        Your incident has been submitted and is awaiting verification by our admin team.
        Once approved, it will appear on the live map.
      </p>
      <div className="inline-flex items-center gap-2 bg-teal-light border border-teal/20 rounded-radius px-4 py-2 mb-6">
        <span className="font-mono text-xs text-text-dim">Reference ID:</span>
        <span className="font-mono text-xs font-medium text-teal">{incidentId}</span>
      </div>
      <div>
        <button
          type="button"
          onClick={onReset}
          className="font-body font-semibold text-sm text-teal hover:text-teal-dark transition-colors duration-150"
        >
          Submit another report →
        </button>
      </div>
    </div>
  );
}

/* ── Main Report Page ────────────────────────────────────────────────────── */
export default function ReportPage() {
  const { zones, loading: zonesLoading } = useZones();
  const [form, setForm]                  = useState(INITIAL_FORM);
  const [errors, setErrors]              = useState({});
  const [submitting, setSubmitting]      = useState(false);
  const [submitError, setSubmitError]    = useState(null);
  const [successId, setSuccessId]        = useState(null);

  // Resolved location from LocationSection: { lat, lng, zone_name } | null
  const [resolvedLocation, setResolvedLocation] = useState(null);

  const formId = useId();

  function setField(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: undefined }));
  }

  // Called by LocationSection whenever location state changes
  const handleLocationResolved = useCallback((location) => {
    setResolvedLocation(location);
    // Sync zone_name into form state so validation sees it
    if (location?.zone_name) {
      setForm((prev) => ({ ...prev, zone_name: location.zone_name }));
    } else {
      setForm((prev) => ({ ...prev, zone_name: '' }));
    }
    // Clear location error on resolution
    if (location) {
      setErrors((prev) => ({ ...prev, location: undefined, zone_name: undefined }));
    }
  }, []);

  function validate() {
    const e = {};
    if (!form.type || form.type.trim().length < 3)
    e.type = 'Please select or describe an incident type.';
    if (!form.severity)
      e.severity = 'Please select a severity level.';
    // Location: either GPS resolved OR zone manually selected
    if (!resolvedLocation && !form.zone_name)
      e.location = 'Please provide your location — use GPS or select a zone.';
    if (!form.description || form.description.trim().length < 10)
      e.description = 'Please provide at least 10 characters of description.';
    if (form.reporter_phone && !/^[+\d\s\-()]{7,15}$/.test(form.reporter_phone))
      e.reporter_phone = 'Enter a valid phone number.';
    if (form.people_affected && isNaN(Number(form.people_affected)))
      e.people_affected = 'Must be a number.';
    return e;
  }

  async function handleSubmit(e) {
    e.preventDefault();

    // Honeypot — silently discard bot submissions
    if (form._honeypot) return;

    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      const firstKey  = Object.keys(errs)[0];
      const firstEl   = document.getElementById(`${formId}-${firstKey}`);
      firstEl?.focus();
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      const id = await createIncident({
        type:            form.type,
        severity:        form.severity,
        zone_name:       resolvedLocation?.zone_name || form.zone_name,
        description:     form.description.trim(),
        reporter_phone:  form.reporter_phone.trim() || null,
        people_affected: form.people_affected ? Number(form.people_affected) : 0,
        // Use GPS coordinates if resolved, otherwise zone center, otherwise 0
        lat:             resolvedLocation?.lat ?? 0,
        lng:             resolvedLocation?.lng ?? 0,
        location_display: resolvedLocation?.displayName ?? null,
        location_source:  resolvedLocation?.lat ? 'gps' : 'zone',
      });
      setSuccessId(id);
    } catch (err) {
      console.error('[NairobiAlert] Report submission error:', err);
      setSubmitError('Failed to submit report. Please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  }

  function handleReset() {
    setSuccessId(null);
    setForm(INITIAL_FORM);
    setErrors({});
    setResolvedLocation(null);
    setSubmitError(null);
  }

  // ── Success screen ──────────────────────────────────────────────────────
  if (successId) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
        <div className="bg-white border border-border rounded-radius-lg shadow-md">
          <SuccessState incidentId={successId} onReset={handleReset} />
        </div>
      </div>
    );
  }

  // ── Main form ───────────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
      {/* Header */}
      <div className="mb-8">
        <p className="font-mono text-xs text-text-dim uppercase tracking-widest mb-2">Public Report</p>
        <h1 className="font-display text-display-lg text-text mb-2">Report an Incident</h1>
        <p className="font-body text-text-mid text-sm leading-relaxed">
          All reports are reviewed by our team before appearing on the public map.
          No account required.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        noValidate
        aria-label="Incident report form"
        className="bg-white border border-border rounded-radius-lg shadow-sm p-6 sm:p-8 space-y-6"
      >
        {/* Honeypot — visually hidden, never submitted */}
        <div aria-hidden="true" className="absolute opacity-0 pointer-events-none h-0 overflow-hidden">
          <label htmlFor={`${formId}-_honeypot`}>Leave this empty</label>
          <input
            id={`${formId}-_honeypot`}
            type="text"
            name="_honeypot"
            tabIndex={-1}
            autoComplete="off"
            value={form._honeypot}
            onChange={(e) => setField('_honeypot', e.target.value)}
          />
        </div>

        {/* ── Incident Type ─────────────────────────────────────────────── */}
        <div>
          <Label htmlFor={`${formId}-type`} required>Incident Type</Label>
          <select
            id={`${formId}-type`}
            value={INCIDENT_TYPES.some((t) => t.value === form.type) ? form.type : form.type ? 'custom' : ''}
            onChange={(e) => {
              if (e.target.value === 'custom') {
                setField('type', '');
              } else {
                setField('type', e.target.value);
              }
            }}
            className={`w-full font-body text-sm bg-bg border rounded-radius px-3 py-2.5 text-text focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent transition-colors duration-150 ${
              errors.type ? 'border-red' : 'border-border hover:border-border-dark'
            }`}
            aria-invalid={!!errors.type}
          >
            <option value="">Select incident type…</option>
            {INCIDENT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
            <option value="custom">Other — type your own</option>
          </select>

          {/* Custom type input — shown when "Other — type your own" is selected */}
          {(!INCIDENT_TYPES.some((t) => t.value === form.type) && form.type !== '') || 
          (!INCIDENT_TYPES.some((t) => t.value === form.type) && 
            document.getElementById(`${formId}-type`)?.value === 'custom') ? (
            <input
              type="text"
              placeholder="Describe the incident type…"
              value={form.type}
              onChange={(e) => setField('type', e.target.value)}
              className={`mt-2 w-full font-body text-sm bg-bg border rounded-radius px-3 py-2.5 text-text placeholder-text-dim focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent transition-colors duration-150 ${
                errors.type ? 'border-red' : 'border-border hover:border-border-dark'
              }`}
            />
          ) : null}

          <FieldError message={errors.type} />
        </div>     
        {/* ── Severity ──────────────────────────────────────────────────── */}
        <SeveritySelector
          value={form.severity}
          onChange={(v) => setField('severity', v)}
          error={errors.severity}
        />

        {/* ── Location — three-tier resolver ────────────────────────────── */}
        <LocationSection
          zones={zones}
          zonesLoading={zonesLoading}
          onResolved={handleLocationResolved}
          error={errors.location || errors.zone_name}
        />

        {/* ── Description ───────────────────────────────────────────────── */}
        <div>
          <Label htmlFor={`${formId}-description`} required>Description</Label>
          <textarea
            id={`${formId}-description`}
            rows={4}
            value={form.description}
            onChange={(e) => setField('description', e.target.value)}
            placeholder="Describe what you see — water level, road conditions, number of people affected, urgent needs…"
            className={`w-full font-body text-sm bg-bg border rounded-radius px-3 py-2.5 text-text placeholder-text-dim focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent transition-colors duration-150 resize-y min-h-[96px] ${
              errors.description ? 'border-red' : 'border-border hover:border-border-dark'
            }`}
            aria-invalid={!!errors.description}
          />
          <div className="flex justify-between">
            <FieldError message={errors.description} />
            <span className="font-mono text-xs text-text-dim mt-1 ml-auto">
              {form.description.length} chars
            </span>
          </div>
        </div>

        {/* ── Optional fields ───────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor={`${formId}-reporter_phone`}>Your Phone (optional)</Label>
            <input
              id={`${formId}-reporter_phone`}
              type="tel"
              value={form.reporter_phone}
              onChange={(e) => setField('reporter_phone', e.target.value)}
              placeholder="+254 700 000 000"
              autoComplete="tel"
              className={`w-full font-body text-sm bg-bg border rounded-radius px-3 py-2.5 text-text placeholder-text-dim focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent transition-colors duration-150 ${
                errors.reporter_phone ? 'border-red' : 'border-border hover:border-border-dark'
              }`}
            />
            <FieldError message={errors.reporter_phone} />
          </div>

          <div>
            <Label htmlFor={`${formId}-people_affected`}>People Affected (optional)</Label>
            <input
              id={`${formId}-people_affected`}
              type="number"
              min="0"
              value={form.people_affected}
              onChange={(e) => setField('people_affected', e.target.value)}
              placeholder="Estimated number"
              className={`w-full font-body text-sm bg-bg border rounded-radius px-3 py-2.5 text-text placeholder-text-dim focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent transition-colors duration-150 ${
                errors.people_affected ? 'border-red' : 'border-border hover:border-border-dark'
              }`}
            />
            <FieldError message={errors.people_affected} />
          </div>
        </div>

        {/* ── Submit error ──────────────────────────────────────────────── */}
        {submitError && (
          <div
            className="bg-red-light border border-red/20 rounded-radius px-4 py-3 font-body text-sm text-red"
            role="alert"
          >
            {submitError}
          </div>
        )}

        {/* ── Submit ────────────────────────────────────────────────────── */}
        <button
          type="submit"
          disabled={submitting}
          className="w-full font-body font-semibold text-sm bg-teal text-white py-3 rounded-radius hover:bg-teal-dark focus:outline-none focus:ring-2 focus:ring-teal focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-150 shadow-sm"
        >
          {submitting ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Submitting…
            </span>
          ) : (
            'Submit Report'
          )}
        </button>

        <p className="font-body text-xs text-text-dim text-center">
          Reports are reviewed before publishing. For emergencies call{' '}
          <span className="font-mono font-medium text-text">999</span> or{' '}
          <span className="font-mono font-medium text-text">112</span>.
        </p>
      </form>

      {/* SMS/USSD fallback for no-internet users */}
      <div className="mt-6 bg-teal-light border border-teal/20 rounded-radius p-4">
        <p className="font-body font-semibold text-sm text-teal mb-1">No internet access?</p>
        <p className="font-body text-xs text-text-mid leading-relaxed">
          Dial <span className="font-mono font-medium text-text">*384#</span> on any phone, or SMS{' '}
          <span className="font-mono font-medium text-text">FLOOD [Location] [Details]</span> to{' '}
          <span className="font-mono font-medium text-text">22384</span>.
        </p>
      </div>
    </div>
  );
}