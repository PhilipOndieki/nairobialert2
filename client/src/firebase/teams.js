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
const teamsRef = () => collection(db, COLLECTION);

/**
 * Subscribe to all teams ordered by name.
 * Returns unsubscribe function.
 */
export function subscribeToTeams(onData, onError) {
  const q = query(teamsRef(), orderBy('name'));
  return onSnapshot(q, (snap) => {
    const teams = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    onData(teams);
  }, onError);
}

/**
 * Subscribe to deployed teams count (for dashboard stats).
 */
export function subscribeToDeployedCount(onCount, onError) {
  const q = query(teamsRef(), where('status', '==', 'deployed'));
  return onSnapshot(q, (snap) => onCount(snap.size), onError);
}

/**
 * Create a new team record.
 */
export async function createTeam(payload) {
  const docRef = await addDoc(teamsRef(), {
    code:          payload.code,
    name:          payload.name,
    organisation:  payload.organisation,
    members:       Number(payload.members),
    status:        payload.status || 'standby',
    location:      payload.location,
    task:          payload.task,
  });
  return docRef.id;
}

/**
 * Update a team record.
 */
export async function updateTeam(id, payload) {
  await updateDoc(doc(db, COLLECTION, id), payload);
}

/**
 * Delete a team record.
 */
export async function deleteTeam(id) {
  await deleteDoc(doc(db, COLLECTION, id));
}
