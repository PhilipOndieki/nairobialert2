import {
  collection,
  doc,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  writeBatch,
  getDoc,
} from 'firebase/firestore';
import { db } from './config';

const INCIDENTS_COL = 'incidents';
const TEAMS_COL     = 'teams';

const incidentsRef = () => collection(db, INCIDENTS_COL);

// ─────────────────────────────────────────────────────────────────────────────
// Subscriptions
// ─────────────────────────────────────────────────────────────────────────────

export function subscribeToIncidentsByStatus(status, onData, onError) {
  const q = query(
    incidentsRef(),
    where('status', '==', status),
    orderBy('created_at', 'desc'),
  );
  return onSnapshot(q, (snap) => {
    onData(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  }, onError);
}

export function subscribeToOpenIncidents(onData, onError) {
  return subscribeToIncidentsByStatus('open', onData, onError);
}

export function subscribeToAllIncidents(onData, onError) {
  const q = query(incidentsRef(), orderBy('created_at', 'desc'));
  return onSnapshot(q, (snap) => {
    onData(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  }, onError);
}

// ─────────────────────────────────────────────────────────────────────────────
// Public report creation
// ─────────────────────────────────────────────────────────────────────────────

export async function createIncident(payload) {
  const docRef = await addDoc(incidentsRef(), {
    type:              payload.type,
    severity:          payload.severity,
    zone_name:         payload.zone_name,
    description:       payload.description,
    reporter_phone:    payload.reporter_phone || null,
    people_affected:   payload.people_affected ? Number(payload.people_affected) : 0,
    lat:               payload.lat ?? 0,
    lng:               payload.lng ?? 0,
    location_display:  payload.location_display ?? null,
    location_source:   payload.location_source ?? 'unknown',
    source:            'web',
    status:            'pending',
    // Dispatch fields — null until a team is assigned
    dispatched_team_id:   null,
    dispatched_team_name: null,
    dispatched_at:        null,
    created_at:        serverTimestamp(),
    verified_by:       null,
    verified_at:       null,
  });
  return docRef.id;
}

// ─────────────────────────────────────────────────────────────────────────────
// Admin status transitions
// ─────────────────────────────────────────────────────────────────────────────

export async function verifyIncident(id, adminEmail) {
  await updateDoc(doc(db, INCIDENTS_COL, id), {
    status:      'open',
    verified_by: adminEmail,
    verified_at: serverTimestamp(),
  });
}

/**
 * Reject an incident.
 * If a team was dispatched to it, recall the team atomically.
 */
export async function rejectIncident(id, adminEmail) {
  const incidentSnap = await getDoc(doc(db, INCIDENTS_COL, id));
  const incident     = incidentSnap.data();

  const batch = writeBatch(db);

  batch.update(doc(db, INCIDENTS_COL, id), {
    status:      'rejected',
    verified_by: adminEmail,
    verified_at: serverTimestamp(),
  });

  // If a team was assigned, return them to standby
  if (incident?.dispatched_team_id) {
    batch.update(doc(db, TEAMS_COL, incident.dispatched_team_id), {
      status:                    'standby',
      dispatched_to_incident_id: null,
      dispatched_to_zone:        null,
      dispatched_at:             null,
      task:                      '',
    });
  }

  await batch.commit();
}

/**
 * Resolve an incident.
 * Automatically returns any dispatched team to standby.
 */
export async function resolveIncident(id, adminEmail) {
  const incidentSnap = await getDoc(doc(db, INCIDENTS_COL, id));
  const incident     = incidentSnap.data();

  const batch = writeBatch(db);

  batch.update(doc(db, INCIDENTS_COL, id), {
    status:      'resolved',
    verified_by: adminEmail,
    verified_at: serverTimestamp(),
  });

  // Return the dispatched team to standby
  if (incident?.dispatched_team_id) {
    batch.update(doc(db, TEAMS_COL, incident.dispatched_team_id), {
      status:                    'standby',
      dispatched_to_incident_id: null,
      dispatched_to_zone:        null,
      dispatched_at:             null,
      task:                      '',
    });
  }

  await batch.commit();
}

// ─────────────────────────────────────────────────────────────────────────────
// Team dispatch — atomic batch: updates both incident and team in one write
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Dispatch a team to an incident.
 *
 * Atomically:
 *   - Sets incident.dispatched_team_id / name / dispatched_at
 *   - Sets team.status to "enroute"
 *   - Sets team.dispatched_to_incident_id, zone, task, dispatched_at
 *
 * If the team was previously assigned to another incident, that incident's
 * dispatch fields are also cleared in the same batch.
 *
 * @param {string} incidentId
 * @param {object} incident   - full incident document
 * @param {object} team       - full team document (must include team.id)
 * @param {string} adminEmail
 */
export async function dispatchTeamToIncident(incidentId, incident, team, adminEmail) {
  const batch = writeBatch(db);
  const now   = serverTimestamp();

  // 1. Update the incident with dispatch info
  batch.update(doc(db, INCIDENTS_COL, incidentId), {
    dispatched_team_id:   team.id,
    dispatched_team_name: team.name,
    dispatched_at:        now,
  });

  // 2. If the team was already assigned to a different incident, clear that
  if (team.dispatched_to_incident_id && team.dispatched_to_incident_id !== incidentId) {
    batch.update(doc(db, INCIDENTS_COL, team.dispatched_to_incident_id), {
      dispatched_team_id:   null,
      dispatched_team_name: null,
      dispatched_at:        null,
    });
  }

  // 3. Update the team
  batch.update(doc(db, TEAMS_COL, team.id), {
    status:                    'enroute',
    dispatched_to_incident_id: incidentId,
    dispatched_to_zone:        incident.zone_name,
    dispatched_at:             now,
    location:                  incident.zone_name,
    task: `Responding to ${incident.type} — ${incident.zone_name}`,
  });

  await batch.commit();
}

/**
 * Recall a team from an incident (without resolving the incident).
 * Returns team to standby and clears dispatch fields on the incident.
 */
export async function recallTeam(incidentId, teamId) {
  const batch = writeBatch(db);

  batch.update(doc(db, INCIDENTS_COL, incidentId), {
    dispatched_team_id:   null,
    dispatched_team_name: null,
    dispatched_at:        null,
  });

  batch.update(doc(db, TEAMS_COL, teamId), {
    status:                    'standby',
    dispatched_to_incident_id: null,
    dispatched_to_zone:        null,
    dispatched_at:             null,
    task:                      '',
  });

  await batch.commit();
}

/**
 * Mark a dispatched team as arrived / deployed (enroute → deployed).
 */
export async function markTeamDeployed(teamId) {
  await updateDoc(doc(db, TEAMS_COL, teamId), { status: 'deployed' });
}

// ─────────────────────────────────────────────────────────────────────────────
// Stat counters
// ─────────────────────────────────────────────────────────────────────────────

export function subscribeToPendingCount(onCount, onError) {
  const q = query(incidentsRef(), where('status', '==', 'pending'));
  return onSnapshot(q, (snap) => onCount(snap.size), onError);
}

export function subscribeToOpenCount(onCount, onError) {
  const q = query(incidentsRef(), where('status', '==', 'open'));
  return onSnapshot(q, (snap) => onCount(snap.size), onError);
}