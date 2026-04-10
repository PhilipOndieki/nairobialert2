// File: src/pages/Report.jsx
// Purpose: Public incident report form — writes to Firestore with status 'pending', no auth required
// Dependencies: react, ../firebase/incidents, ../firebase/zones, ../hooks/useZones

import { useState, useId } from 'react';
import { createIncident } from '../firebase/incidents';
import { useZones } from '../hooks/useZones';

/* ── Constants ───────────────────────────────────────────────────────────── */
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
  _honeypot:       '', // never submitted to Firestore
};

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

/* ── Severity selector ───────────────────────────────────────────────────── */
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

/* ── Main Form ───────────────────────────────────────────────────────────── */
export default function ReportPage() {
  const { zones, loading: zonesLoading } = useZones();
  const [form, setForm]                  = useState(INITIAL_FORM);
  const [errors, setErrors]              = useState({});
  const [submitting, setSubmitting]      = useState(false);
  const [submitError, setSubmitError]    = useState(null);
  const [successId, setSuccessId]        = useState(null);
  const formId = useId();

  function setField(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: undefined }));
  }

  function validate() {
    const e = {};
    if (!form.type)        e.type        = 'Please select an incident type.';
    if (!form.severity)    e.severity    = 'Please select a severity level.';
    if (!form.zone_name)   e.zone_name   = 'Please select the affected zone.';
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

    // Honeypot: if filled, silently discard (bot protection)
    if (form._honeypot) return;

    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      // Focus first error field
      const first = document.getElementById(`${formId}-${Object.keys(errs)[0]}`);
      first?.focus();
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    try {
      const id = await createIncident({
        type:            form.type,
        severity:        form.severity,
        zone_name:       form.zone_name,
        description:     form.description.trim(),
        reporter_phone:  form.reporter_phone.trim() || null,
        people_affected: form.people_affected ? Number(form.people_affected) : 0,
        lat:             0,
        lng:             0,
      });
      setSuccessId(id);
    } catch (err) {
      console.error(err);
      setSubmitError('Failed to submit report. Please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (successId) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
        <div className="bg-white border border-border rounded-radius-lg shadow-md">
          <SuccessState incidentId={successId} onReset={() => { setSuccessId(null); setForm(INITIAL_FORM); }} />
        </div>
      </div>
    );
  }

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
        {/* Honeypot — hidden from real users, bots fill it */}
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

        {/* Incident Type */}
        <div>
          <Label htmlFor={`${formId}-type`} required>Incident Type</Label>
          <select
            id={`${formId}-type`}
            value={form.type}
            onChange={(e) => setField('type', e.target.value)}
            className={`w-full font-body text-sm bg-bg border rounded-radius px-3 py-2.5 text-text focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent transition-colors duration-150 ${
              errors.type ? 'border-red' : 'border-border hover:border-border-dark'
            }`}
            aria-describedby={errors.type ? `${formId}-type-error` : undefined}
            aria-invalid={!!errors.type}
          >
            <option value="">Select incident type…</option>
            {INCIDENT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          <FieldError message={errors.type} />
        </div>

        {/* Severity */}
        <SeveritySelector
          value={form.severity}
          onChange={(v) => setField('severity', v)}
          error={errors.severity}
        />

        {/* Zone */}
        <div>
          <Label htmlFor={`${formId}-zone_name`} required>Affected Zone / Area</Label>
          <select
            id={`${formId}-zone_name`}
            value={form.zone_name}
            onChange={(e) => setField('zone_name', e.target.value)}
            disabled={zonesLoading}
            className={`w-full font-body text-sm bg-bg border rounded-radius px-3 py-2.5 text-text focus:outline-none focus:ring-2 focus:ring-teal focus:border-transparent transition-colors duration-150 disabled:opacity-60 ${
              errors.zone_name ? 'border-red' : 'border-border hover:border-border-dark'
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
          <FieldError message={errors.zone_name} />
        </div>

        {/* Description */}
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

        {/* Optional fields */}
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

        {/* Submit error */}
        {submitError && (
          <div className="bg-red-light border border-red/20 rounded-radius px-4 py-3 font-body text-sm text-red" role="alert">
            {submitError}
          </div>
        )}

        {/* Submit */}
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

      {/* SMS/USSD alternative */}
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
