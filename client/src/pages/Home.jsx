// File: src/pages/Home.jsx
// Purpose: Public home page with hero, live stats bar, zone risk cards, and USSD info
// Dependencies: react, react-router-dom, ../hooks/useIncidents, ../hooks/useZones,
//               ../firebase/shelters, ../components/ZoneCard

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useOpenIncidents, useIncidentCounts } from '../hooks/useIncidents';
import { subscribeToOpenSheltersCount } from '../firebase/shelters';

/* ── Live Stats Bar ──────────────────────────────────────────────────────── */
function StatItem({ value, label, loading }) {
  return (
    <div className="flex flex-col items-center gap-0.5 px-6 py-3">
      {loading ? (
        <div className="w-10 h-7 bg-white/20 rounded animate-pulse" />
      ) : (
        <span className="font-display text-display-md text-white leading-none">
          {value}
        </span>
      )}
      <span className="font-mono text-xs text-teal-mid uppercase tracking-wider">
        {label}
      </span>
    </div>
  );
}

function LiveStatsBar() {
  const { openCount, pendingCount, loading: incLoading } = useIncidentCounts();
  const [openShelters, setOpenShelters]                   = useState(0);
  const [sheltersLoading, setSheltersLoading]             = useState(true);

  useEffect(() => {
    const unsub = subscribeToOpenSheltersCount((n) => {
      setOpenShelters(n);
      setSheltersLoading(false);
    }, console.error);
    return unsub;
  }, []);

  return (
    <div className="bg-teal-dark/90 backdrop-blur-sm">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex flex-wrap justify-center divide-x divide-white/20">
          <StatItem value={openCount}    label="Active Incidents" loading={incLoading} />
          <StatItem value={openShelters} label="Open Shelters"    loading={sheltersLoading} />
          <StatItem value={pendingCount} label="Awaiting Review"  loading={incLoading} />
        </div>
      </div>
    </div>
  );
}

/* ── Hero Section ────────────────────────────────────────────────────────── */
function Hero() {
  return (
    <section className="relative flex flex-col min-h-[90vh]" aria-label="Hero">
      {/* Background: dark teal gradient — no external image dependency */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(160deg, #075c50 0%, #0a7e6e 40%, #0d9e8a 70%, #075c50 100%)',
        }}
        aria-hidden="true"
      />
      {/* Subtle wave texture overlay */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='20' viewBox='0 0 100 20'%3E%3Cpath d='M0 10 Q12.5 0 25 10 Q37.5 20 50 10 Q62.5 0 75 10 Q87.5 20 100 10' stroke='white' stroke-width='1' fill='none'/%3E%3C/svg%3E")`,
          backgroundSize: '100px 20px',
          backgroundRepeat: 'repeat',
        }}
        aria-hidden="true"
      />

      {/* Content */}
      <div className="relative flex-1 flex flex-col justify-center items-center text-center px-4 sm:px-6 py-16">
        {/* Logo mark */}
        <div className="mb-6">
          <svg width="56" height="56" viewBox="0 0 32 32" fill="none" aria-hidden="true">
            <rect width="32" height="32" rx="8" fill="rgba(255,255,255,0.15)" />
            <path d="M8 20 Q10 16 12 20 Q14 24 16 20 Q18 16 20 20 Q22 24 24 20" stroke="white" strokeWidth="2.5" strokeLinecap="round" fill="none" />
            <circle cx="16" cy="12" r="3" fill="white" />
            <path d="M16 9 L16 6" stroke="white" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>

        <p className="font-mono text-xs text-teal-mid uppercase tracking-[0.2em] mb-4">
          Real-Time Crisis Response
        </p>

        <h1 className="font-display text-display-xl text-white leading-none tracking-tight mb-4 max-w-2xl">
          Nairobi<br />
          <em className="not-italic text-teal-mid">Alert</em>
        </h1>

        <p className="font-body text-lg text-white/80 max-w-xl leading-relaxed mb-8">
          Coordinating flood emergency response across Nairobi in real time.
          Report incidents, track affected zones, and find open shelters.
        </p>

        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            to="/map"
            className="font-body font-semibold text-sm bg-white text-teal px-6 py-3 rounded-radius hover:bg-teal-light transition-colors duration-150 shadow-md"
          >
            View Live Map
          </Link>
          <Link
            to="/report"
            className="font-body font-semibold text-sm bg-transparent text-white border-2 border-white/50 px-6 py-3 rounded-radius hover:bg-white/10 hover:border-white transition-colors duration-150"
          >
            Report Incident
          </Link>
        </div>

        {/* Live indicator */}
        <div className="flex items-center gap-2 mt-8">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
          </span>
          <span className="font-mono text-xs text-white/60">Live data</span>
        </div>
      </div>

      {/* Stats bar sits at the bottom of the hero */}
      <LiveStatsBar />
    </section>
  );
}

/* ── Latest Incident Section ──────────────────────────────────────────────────────── */
function LatestIncidentsSection() {
  const { incidents, loading } = useOpenIncidents();
  const latest = incidents.slice(0, 5);

  function timeAgo(timestamp) {
    if (!timestamp?.toDate) return '—';
    const diff = Math.floor((Date.now() - timestamp.toDate().getTime()) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  }

  const TYPE_LABELS = {
    flood: 'Flood', landslide: 'Landslide', blocked: 'Road Blocked',
    rescue: 'Rescue Needed', shelter: 'Shelter Request', other: 'Other',
  };

  const SEVERITY_COLORS = {
    critical: 'bg-red-light text-red border-red/20',
    warning:  'bg-amber-light text-amber border-amber/20',
    info:     'bg-teal-light text-teal border-teal/20',
  };

  return (
    <section className="py-12 px-4 sm:px-6 max-w-6xl mx-auto w-full" aria-labelledby="incidents-heading">
      <div className="flex items-baseline justify-between mb-6">
        <div>
          <h2 id="incidents-heading" className="font-display text-display-md text-text">
            Latest Incidents
          </h2>
          <p className="font-body text-sm text-text-mid mt-1">
            5 most recent verified reports
          </p>
        </div>
        <a
          href="/map"
          className="font-body text-sm text-teal hover:text-teal-dark font-medium transition-colors duration-150"
        >
          View all on map →
        </a>
      </div>

      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white border border-border rounded-radius p-4 animate-pulse">
              <div className="flex items-center justify-between">
                <div className="h-4 w-40 bg-border rounded" />
                <div className="h-5 w-16 bg-border rounded-full" />
              </div>
              <div className="h-3 w-24 bg-border rounded mt-2" />
            </div>
          ))}
        </div>
      )}

      {!loading && latest.length === 0 && (
        <div className="text-center py-12 bg-white border border-border rounded-radius-lg">
          <svg className="w-10 h-10 text-border-dark mx-auto mb-3" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
          </svg>
          <p className="font-display text-lg text-text-mid mb-1">No active incidents</p>
          <p className="font-body text-sm text-text-dim mb-4">Stay alert. If you see flooding, report it.</p>
          <a
            href="/report"
            className="inline-block font-body font-semibold text-sm text-teal hover:text-teal-dark transition-colors duration-150"
          >
            Report an incident →
          </a>
        </div>
      )}

      {!loading && latest.length > 0 && (
        <div className="space-y-3">
          {latest.map((incident) => (
            <Link to="/map" state={{ incidentId: incident.id }} key={incident.id} className="block bg-white border border-border rounded-radius p-4 shadow-sm hover:shadow-md hover:border-teal transition-all duration-150">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-body font-semibold text-sm text-text truncate">
                    {TYPE_LABELS[incident.type] ?? incident.type}
                    <span className="text-text-dim font-normal"> — {incident.zone_name}</span>
                  </p>
                  <p className="font-mono text-xs text-text-dim mt-0.5">
                    {timeAgo(incident.created_at)}
                  </p>
                </div>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full font-mono text-xs font-medium border flex-shrink-0 ${SEVERITY_COLORS[incident.severity] ?? ''}`}>
                  {incident.severity}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

/* ── USSD / SMS Info Section ─────────────────────────────────────────────── */
function UssdSection() {
  return (
    <section className="bg-teal-light py-12 px-4 sm:px-6" aria-labelledby="ussd-heading">
      <div className="max-w-4xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div>
            <p className="font-mono text-xs text-teal uppercase tracking-widest mb-2">
              No Smartphone? No Problem.
            </p>
            <h2 id="ussd-heading" className="font-display text-display-md text-text mb-3">
              Report via USSD or SMS
            </h2>
            <p className="font-body text-text-mid text-sm leading-relaxed">
              NairobiAlert works on any mobile phone. Use our USSD code or send an
              SMS to report flooding in your area — no internet required.
            </p>
            {/* Architecture note: SMS/USSD gateway integration point.
                In production this connects to Africa's Talking or Twilio API
                which writes incoming messages as Firestore incidents with source: 'sms' | 'ussd' */}
          </div>

          <div className="flex flex-col gap-4">
            {/* USSD */}
            <div className="bg-white border border-border rounded-radius p-4 shadow-sm">
              <p className="font-mono text-xs text-text-dim uppercase tracking-wider mb-1">
                USSD (Any Phone)
              </p>
              <p className="font-display text-2xl text-teal">*384#</p>
              <p className="font-body text-xs text-text-mid mt-1">
                Dial and follow the prompts to report or check alerts
              </p>
            </div>

            {/* SMS */}
            <div className="bg-white border border-border rounded-radius p-4 shadow-sm">
              <p className="font-mono text-xs text-text-dim uppercase tracking-wider mb-1">
                SMS Shortcode
              </p>
              <p className="font-display text-2xl text-teal">22384</p>
              <p className="font-body text-xs text-text-mid mt-1">
                Text <span className="font-mono font-medium">FLOOD [Location] [Description]</span> to report
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Page ────────────────────────────────────────────────────────────────── */
export default function Home() {
  return (
    <>
      <Hero />
      <LatestIncidentsSection />
      <UssdSection />
    </>
  );
}
