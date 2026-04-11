import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  orderBy,
  query,
  where,
} from 'firebase/firestore';
import { db } from './config';

const COLLECTION = 'teams';
const teamsRef   = () => collection(db, COLLECTION);

// ─────────────────────────────────────────────────────────────────────────────
// Subscriptions
// ─────────────────────────────────────────────────────────────────────────────

export function subscribeToTeams(onData, onError) {
  const q = query(teamsRef(), orderBy('name'));
  return onSnapshot(q, (snap) => {
    onData(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  }, onError);
}

/**
 * Subscribe to teams that are available for dispatch (status: standby).
 * Used by the Dispatch modal to show only assignable teams.
 */
export function subscribeToAvailableTeams(onData, onError) {
  const q = query(teamsRef(), where('status', '==', 'standby'), orderBy('name'));
  return onSnapshot(q, (snap) => {
    onData(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  }, onError);
}

export function subscribeToDeployedCount(onCount, onError) {
  const q = query(
    teamsRef(),
    where('status', 'in', ['deployed', 'enroute']),
  );
  return onSnapshot(q, (snap) => onCount(snap.size), onError);
}

// ─────────────────────────────────────────────────────────────────────────────
// CRUD
// ─────────────────────────────────────────────────────────────────────────────

export async function createTeam(payload) {
  const docRef = await addDoc(teamsRef(), {
    code:                      payload.code,
    name:                      payload.name,
    organisation:              payload.organisation,
    members:                   Number(payload.members),
    status:                    payload.status || 'standby',
    location:                  payload.location,
    task:                      payload.task,
    // Dispatch tracking fields — null until dispatched
    dispatched_to_incident_id: null,
    dispatched_to_zone:        null,
    dispatched_at:             null,
  });
  return docRef.id;
}

export async function updateTeam(id, payload) {
  await updateDoc(doc(db, COLLECTION, id), payload);
}

export async function deleteTeam(id) {
  await deleteDoc(doc(db, COLLECTION, id));
}