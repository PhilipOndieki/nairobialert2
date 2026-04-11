// File: src/pages/Map.jsx
// Purpose: Live interactive map page with real-time incident markers, sidebar, and filters
// Dependencies: react, react-leaflet, leaflet, ../hooks/useIncidents, ../hooks/useAuth,
//               ../firebase/shelters, ../firebase/teams, ../components/IncidentCard, ../components/StatusBadge

import { useState, useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useOpenIncidents } from '../hooks/useIncidents';
import { useAuth } from '../hooks/useAuth';
import { subscribeToTeams } from '../firebase/teams';
import IncidentCard from '../components/IncidentCard';
import StatusBadge from '../components/StatusBadge';
import { useLocation } from 'react-router-dom';


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

/* ── Sidebar Tabs ────────────────────────────────────────────────────────── */
function SidebarContent({ incidents, teams, activeTab, setActiveTab, onSelectIncident, teamsLoading }) {
  return (
    <div className="flex flex-col h-full">
      {/* Tab headers */}
      <div className="flex border-b border-border flex-shrink-0">
        {['Incidents', 'Teams'].map((tab) => (
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
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin">
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

/* ── Main Map Page ───────────────────────────────────────────────────────── */
export default function MapPage() {
  const location = useLocation();
  const { incidents, loading: incLoading } = useOpenIncidents();
  const { user }                           = useAuth();
  const [teams, setTeams]                  = useState([]);
  const [teamsLoading, setTeamsLoading]    = useState(true);
  const [activeFilter, setActiveFilter]    = useState('All');
  const [activeTab, setActiveTab]          = useState('Incidents');
  const [flyTarget, setFlyTarget]          = useState(null);
  const [sidebarOpen, setSidebarOpen]      = useState(true);

  useEffect(() => {
    if (!location.state?.incidentId || incidents.length === 0) return;
    const target = incidents.find((i) => i.id === location.state.incidentId);
    if (target?.lat && target?.lng) {
      setFlyTarget({ lat: target.lat, lng: target.lng });
    }
  }, [location.state?.incidentId, incidents]);

  useEffect(() => {
    const unsub = subscribeToTeams(
      (data) => { setTeams(data); setTeamsLoading(false); },
      (err)  => { console.error(err); setTeamsLoading(false); },
    );
    return unsub;
  }, []);

  const filteredIncidents = incidents.filter((inc) => {
    if (activeFilter === 'All') return true;
    return TYPE_TO_FILTER[inc.type] === activeFilter;
  });

  const handleSelectIncident = useCallback((incident) => {
    if (incident.lat && incident.lng) {
      setFlyTarget({ lat: incident.lat, lng: incident.lng });
    }
  }, []);

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
          {/* Broadcast Alert — admin only */}
          {user && (
            <span className="font-mono text-xs bg-red-light text-red border border-red/20 px-2 py-1 rounded-radius">
              Admin Mode
            </span>
          )}
          {/* Toggle sidebar button */}
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
                <p className="font-mono text-xs text-text-dim">Loading incidents…</p>
              </div>
            </div>
          )}

          {!incLoading && filteredIncidents.length === 0 && (
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
            {/* CartoDB Positron light tile — same as original system */}
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

            {/* Fly-to controller */}
            <FlyToController target={flyTarget} />
          </MapContainer>
        </div>

        {/* Slim sidebar */}
        {sidebarOpen && (
          <aside className="w-72 flex-shrink-0 bg-white border-l border-border flex flex-col overflow-hidden">
            <SidebarContent
              incidents={filteredIncidents}
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
