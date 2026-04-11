// File: src/pages/Map.jsx
// Purpose: Live interactive map page with real-time incident markers, shelter markers,
//          sidebar, and filters
// Dependencies: react, react-leaflet, leaflet, ../hooks/useIncidents, ../hooks/useAuth,
//               ../firebase/shelters, ../firebase/teams, ../components/IncidentCard,
//               ../components/StatusBadge

import { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useOpenIncidents } from '../hooks/useIncidents';
import { useAuth } from '../hooks/useAuth';
import { subscribeToTeams } from '../firebase/teams';
import { subscribeToShelters } from '../firebase/shelters';
import { useLocation } from 'react-router-dom';
import IncidentCard from '../components/IncidentCard';
import StatusBadge from '../components/StatusBadge';

/* ── Constants ───────────────────────────────────────────────────────────── */
const NAIROBI_CENTER = [-1.2921, 36.8219];
const DEFAULT_ZOOM   = 12;

const SEVERITY_COLORS = {
  critical: '#c0392b',
  warning:  '#d4780a',
  info:     '#0a7e6e',
};

const FILTER_OPTIONS = ['All', 'Floods', 'Shelters', 'Teams'];

const TYPE_TO_FILTER = {
  flood:     'Floods',
  landslide: 'Floods',
  blocked:   'Floods',
  rescue:    'Floods',
  shelter:   'Shelters',
  other:     'All',
};

/* ── FlyTo helper — moves map programmatically ───────────────────────────── */
function FlyToController({ target }) {
  const map = useMap();
  useEffect(() => {
    if (target) {
      map.flyTo([target.lat, target.lng], 15, { duration: 0.8 });
    }
  }, [map, target]);
  return null;
}

/* ── Incident marker ─────────────────────────────────────────────────────── */
function IncidentMarker({ incident, onClick }) {
  const color  = SEVERITY_COLORS[incident.severity] ?? SEVERITY_COLORS.info;
  const radius = incident.severity === 'critical' ? 14 : incident.severity === 'warning' ? 11 : 9;

  return (
    <CircleMarker
      center={[incident.lat, incident.lng]}
      radius={radius}
      pathOptions={{
        color,
        fillColor: color,
        fillOpacity: 0.7,
        weight: 2,
      }}
      eventHandlers={{ click: () => onClick(incident) }}
    >
      <Popup>
        <div className="font-body text-xs min-w-[180px]">
          <p className="font-semibold text-text mb-1">{incident.type} — {incident.zone_name}</p>
          <p className="text-text-mid leading-snug">{incident.description}</p>
          <div className="flex gap-1 mt-2 flex-wrap">
            <StatusBadge variant="severity" value={incident.severity} />
            {incident.people_affected > 0 && (
              <span className="font-mono text-xs text-text-dim">
                {incident.people_affected} affected
              </span>
            )}
          </div>
        </div>
      </Popup>
    </CircleMarker>
  );
}

/* ── Shelter marker ──────────────────────────────────────────────────────── */
function ShelterMarker({ shelter }) {
  const pct = shelter.capacity
    ? Math.min(100, Math.round((shelter.occupancy / shelter.capacity) * 100))
    : 0;

  return (
    <CircleMarker
      center={[shelter.lat, shelter.lng]}
      radius={10}
      pathOptions={{
        color:       '#1a7a4a',
        fillColor:   '#1a7a4a',
        fillOpacity: 0.8,
        weight:      2,
      }}
    >
      <Popup>
        <div className="font-body text-xs min-w-[200px]">
          {/* Header */}
          <div className="flex items-center gap-1.5 mb-2">
            <svg className="w-3.5 h-3.5 text-green flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
            </svg>
            <p className="font-semibold text-text">{shelter.name}</p>
          </div>

          {/* Address */}
          <p className="text-text-mid leading-snug mb-2">{shelter.address}</p>

          {/* Occupancy bar */}
          <div className="mb-2">
            <div className="flex justify-between mb-1">
              <span className="font-mono text-xs text-text-dim">Occupancy</span>
              <span className="font-mono text-xs text-text-dim">
                {shelter.occupancy} / {shelter.capacity} ({pct}%)
              </span>
            </div>
            <div className="h-1.5 bg-border rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  pct >= 90 ? 'bg-red' : pct >= 70 ? 'bg-amber' : 'bg-green'
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>

          {/* Status */}
          <div className="flex items-center justify-between">
            <span className={`font-mono text-xs px-2 py-0.5 rounded-full border ${
              shelter.is_open
                ? 'bg-green-light text-green border-green/20'
                : 'bg-border text-text-dim border-border-dark'
            }`}>
              {shelter.is_open ? 'Open' : 'Closed'}
            </span>

            {/* Directions link */}
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${shelter.lat},${shelter.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-body text-xs font-medium text-teal hover:text-teal-dark transition-colors duration-150"
            >
              <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
              </svg>
              Get Directions
            </a>
          </div>
        </div>
      </Popup>
    </CircleMarker>
  );
}

/* ── Sidebar Tabs ────────────────────────────────────────────────────────── */
function SidebarContent({ incidents, shelters, teams, activeTab, setActiveTab, onSelectIncident, teamsLoading }) {
  return (
    <div className="flex flex-col h-full">
      {/* Tab headers */}
      <div className="flex border-b border-border flex-shrink-0">
        {['Incidents', 'Shelters', 'Teams'].map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2.5 font-body font-medium text-xs transition-colors duration-150 ${
              activeTab === tab
                ? 'text-teal border-b-2 border-teal bg-teal-light/50'
                : 'text-text-mid hover:text-text hover:bg-bg'
            }`}
          >
            {tab}
            {tab === 'Incidents' && incidents.length > 0 && (
              <span className="ml-1.5 font-mono text-xs bg-teal text-white px-1.5 py-0.5 rounded-full">
                {incidents.length}
              </span>
            )}
            {tab === 'Shelters' && shelters.length > 0 && (
              <span className="ml-1.5 font-mono text-xs bg-green text-white px-1.5 py-0.5 rounded-full">
                {shelters.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin">

        {/* ── Incidents tab ── */}
        {activeTab === 'Incidents' && (
          <>
            {incidents.length === 0 && (
              <div className="text-center py-8">
                <p className="font-body text-sm text-text-mid">No active incidents</p>
                <p className="font-mono text-xs text-text-dim mt-1">
                  Verified reports will appear here
                </p>
              </div>
            )}
            {incidents.map((incident) => (
              <IncidentCard
                key={incident.id}
                incident={incident}
                compact
                onClick={() => onSelectIncident(incident)}
              />
            ))}
          </>
        )}

        {/* ── Shelters tab ── */}
        {activeTab === 'Shelters' && (
          <>
            {shelters.length === 0 && (
              <div className="text-center py-8">
                <p className="font-body text-sm text-text-mid">No open shelters</p>
                <p className="font-mono text-xs text-text-dim mt-1">
                  Shelters activated by admin will appear here
                </p>
              </div>
            )}
            {shelters.map((shelter) => {
              const pct = shelter.capacity
                ? Math.min(100, Math.round((shelter.occupancy / shelter.capacity) * 100))
                : 0;
              return (
                <div key={shelter.id} className="bg-white border border-border rounded-radius p-3 shadow-sm">
                  {/* Name + status */}
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <p className="font-body font-semibold text-xs text-text truncate">{shelter.name}</p>
                    <span className="font-mono text-xs px-1.5 py-0.5 rounded-full bg-green-light text-green border border-green/20 flex-shrink-0">
                      Open
                    </span>
                  </div>

                  {/* Address */}
                  <p className="font-mono text-xs text-text-dim truncate mb-2">{shelter.address}</p>

                  {/* Occupancy bar */}
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="font-mono text-xs text-text-dim">Occupancy</span>
                      <span className="font-mono text-xs text-text-dim">{shelter.occupancy}/{shelter.capacity}</span>
                    </div>
                    <div className="h-1.5 bg-border rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          pct >= 90 ? 'bg-red' : pct >= 70 ? 'bg-amber' : 'bg-green'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  {/* Directions */}
                  {shelter.lat && shelter.lng && (
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${shelter.lat},${shelter.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-body text-xs font-medium text-teal hover:text-teal-dark mt-2 transition-colors duration-150"
                    >
                      <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                      </svg>
                      Get Directions
                    </a>
                  )}
                </div>
              );
            })}
          </>
        )}

        {/* ── Teams tab ── */}
        {activeTab === 'Teams' && (
          <>
            {teamsLoading && (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="bg-white border border-border rounded-radius p-3 animate-pulse">
                    <div className="h-3 w-24 bg-border rounded mb-1" />
                    <div className="h-3 w-36 bg-border rounded" />
                  </div>
                ))}
              </div>
            )}
            {!teamsLoading && teams.length === 0 && (
              <div className="text-center py-8">
                <p className="font-body text-sm text-text-mid">No teams assigned</p>
              </div>
            )}
            {!teamsLoading && teams.map((team) => (
              <div key={team.id} className="bg-white border border-border rounded-radius p-3 shadow-sm">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-body font-semibold text-xs text-text">{team.name}</span>
                  <StatusBadge variant="team" value={team.status} />
                </div>
                <p className="font-mono text-xs text-text-dim truncate">{team.location}</p>
                {team.task && (
                  <p className="font-body text-xs text-text-mid mt-1 truncate">{team.task}</p>
                )}
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

/* ── Map Legend ──────────────────────────────────────────────────────────── */
function MapLegend() {
  return (
    <div className="absolute bottom-8 left-4 z-20 bg-white/95 border border-border rounded-radius shadow-md px-3 py-2.5 space-y-1.5">
      <p className="font-mono text-xs text-text-dim uppercase tracking-wider mb-1">Legend</p>
      {[
        { color: '#c0392b', label: 'Critical Incident' },
        { color: '#d4780a', label: 'Warning Incident' },
        { color: '#0a7e6e', label: 'Info Incident' },
        { color: '#1a7a4a', label: 'Open Shelter' },
      ].map(({ color, label }) => (
        <div key={label} className="flex items-center gap-2">
          <span
            className="w-3 h-3 rounded-full flex-shrink-0 border-2"
            style={{ backgroundColor: color, borderColor: color }}
          />
          <span className="font-body text-xs text-text-mid">{label}</span>
        </div>
      ))}
    </div>
  );
}

/* ── Main Map Page ───────────────────────────────────────────────────────── */
export default function MapPage() {
  const location                           = useLocation();
  const { incidents, loading: incLoading } = useOpenIncidents();
  const { user }                           = useAuth();
  const [teams, setTeams]                  = useState([]);
  const [shelters, setShelters]            = useState([]);
  const [teamsLoading, setTeamsLoading]    = useState(true);
  const [activeFilter, setActiveFilter]    = useState('All');
  const [activeTab, setActiveTab]          = useState('Incidents');
  const [flyTarget, setFlyTarget]          = useState(null);
  const [sidebarOpen, setSidebarOpen]      = useState(true);

  // Subscribe to teams
  useEffect(() => {
    const unsub = subscribeToTeams(
      (data) => { setTeams(data); setTeamsLoading(false); },
      (err)  => { console.error(err); setTeamsLoading(false); },
    );
    return unsub;
  }, []);

  // Subscribe to open shelters only
  useEffect(() => {
    const unsub = subscribeToShelters(
      (data) => setShelters(data.filter((s) => s.is_open)),
      (err)  => console.error(err),
    );
    return unsub;
  }, []);

  // Fly to incident if navigated from home page
  useEffect(() => {
    if (!location.state?.incidentId || incidents.length === 0) return;
    const target = incidents.find((i) => i.id === location.state.incidentId);
    if (target?.lat && target?.lng) {
      setFlyTarget({ lat: target.lat, lng: target.lng });
    }
  }, [location.state?.incidentId, incidents]);

  const filteredIncidents = incidents.filter((inc) => {
    if (activeFilter === 'All') return true;
    if (activeFilter === 'Shelters') return false; // shelters shown via separate layer
    return TYPE_TO_FILTER[inc.type] === activeFilter;
  });

  // When filter is Shelters, switch sidebar tab automatically
  useEffect(() => {
    if (activeFilter === 'Shelters') setActiveTab('Shelters');
    if (activeFilter === 'Teams')    setActiveTab('Teams');
    if (activeFilter === 'Floods')   setActiveTab('Incidents');
  }, [activeFilter]);

  const handleSelectIncident = useCallback((incident) => {
    if (incident.lat && incident.lng) {
      setFlyTarget({ lat: incident.lat, lng: incident.lng });
    }
  }, []);

  // Decide which shelters to show on map based on filter
  const showSheltersOnMap = activeFilter === 'All' || activeFilter === 'Shelters';

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 56px)' }}>
      {/* Filter bar */}
      <div className="bg-white border-b border-border px-4 py-2 flex items-center gap-2 flex-wrap z-10 flex-shrink-0">
        <span className="font-mono text-xs text-text-dim mr-1">Filter:</span>
        {FILTER_OPTIONS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setActiveFilter(f)}
            className={`font-mono text-xs px-3 py-1 rounded-full border transition-colors duration-150 ${
              activeFilter === f
                ? 'bg-teal text-white border-teal'
                : 'bg-white text-text-mid border-border hover:border-teal hover:text-teal'
            }`}
          >
            {f}
          </button>
        ))}

        <div className="ml-auto flex items-center gap-2">
          {user && (
            <span className="font-mono text-xs bg-red-light text-red border border-red/20 px-2 py-1 rounded-radius">
              Admin Mode
            </span>
          )}
          <button
            type="button"
            onClick={() => setSidebarOpen((o) => !o)}
            className="font-mono text-xs px-2 py-1 rounded border border-border text-text-mid hover:text-text hover:border-teal transition-colors duration-150"
            aria-label={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
          >
            {sidebarOpen ? '→ Hide panel' : '← Show panel'}
          </button>
        </div>
      </div>

      {/* Map + sidebar */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Map */}
        <div className="flex-1 relative">
          {incLoading && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-bg/80 pointer-events-none">
              <div className="flex flex-col items-center gap-2">
                <div className="w-8 h-8 border-2 border-teal border-t-transparent rounded-full animate-spin" />
                <p className="font-mono text-xs text-text-dim">Loading map data…</p>
              </div>
            </div>
          )}

          {!incLoading && filteredIncidents.length === 0 && activeFilter !== 'Shelters' && (
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
              <div className="bg-white/95 border border-border rounded-radius px-4 py-2 shadow-md text-center">
                <p className="font-body text-sm text-text-mid">
                  No active incidents on map
                </p>
                <p className="font-mono text-xs text-text-dim mt-0.5">
                  Reports appear after admin verification
                </p>
              </div>
            </div>
          )}

          <MapContainer
            center={NAIROBI_CENTER}
            zoom={DEFAULT_ZOOM}
            style={{ height: '100%', width: '100%' }}
            zoomControl={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
              url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
              subdomains="abcd"
              maxZoom={20}
            />

            {/* Incident markers */}
            {filteredIncidents.map((incident) => (
              incident.lat && incident.lng ? (
                <IncidentMarker
                  key={incident.id}
                  incident={incident}
                  onClick={handleSelectIncident}
                />
              ) : null
            ))}

            {/* Shelter markers — shown on All and Shelters filter */}
            {showSheltersOnMap && shelters.map((shelter) => (
              shelter.lat && shelter.lng ? (
                <ShelterMarker key={shelter.id} shelter={shelter} />
              ) : null
            ))}

            {/* Fly-to controller */}
            <FlyToController target={flyTarget} />
          </MapContainer>

          {/* Map Legend */}
          <MapLegend />
        </div>

        {/* Sidebar */}
        {sidebarOpen && (
          <aside className="w-72 flex-shrink-0 bg-white border-l border-border flex flex-col overflow-hidden">
            <SidebarContent
              incidents={filteredIncidents}
              shelters={shelters}
              teams={teams}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              onSelectIncident={handleSelectIncident}
              teamsLoading={teamsLoading}
            />
          </aside>
        )}
      </div>
    </div>
  );
}