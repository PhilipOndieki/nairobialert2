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
  Timestamp,
} from 'firebase/firestore';
import { db } from './config';

const COLLECTION = 'incidents';
const incidentsRef = () => collection(db, COLLECTION);

/**
 * Subscribe to all incidents with a given status.
 * Returns an unsubscribe function for cleanup in useEffect.
 *
 * @param {string} status - 'pending' | 'open' | 'rejected' | 'resolved'
 * @param {function} onData - called with incident array on every update
 * @param {function} onError - called with Error on failure
 * @returns {function} unsubscribe
 */
export function subscribeToIncidentsByStatus(status, onData, onError) {
  const q = query(
    incidentsRef(),
    where('status', '==', status),
    orderBy('created_at', 'desc'),
  );
  return onSnapshot(q, (snap) => {
    const incidents = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    onData(incidents);
  }, onError);
}

/**
 * Subscribe to open incidents only (used on public map).
 */
export function subscribeToOpenIncidents(onData, onError) {
  return subscribeToIncidentsByStatus('open', onData, onError);
}

/**
 * Subscribe to all statuses simultaneously (admin view).
 * Merges all results and calls onData with the full list.
 */
export function subscribeToAllIncidents(onData, onError) {
  const q = query(incidentsRef(), orderBy('created_at', 'desc'));
  return onSnapshot(q, (snap) => {
    const incidents = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    onData(incidents);
  }, onError);
}

/**
 * Public report submission — status always starts as 'pending'.
 * Honeypot field is stripped server-side via security rules; we simply
 * never write it into the real payload.
 *
 * @param {object} payload - form data from the Report page
 * @returns {Promise<string>} the new document ID
 */
export async function createIncident(payload) {
  const docRef = await addDoc(incidentsRef(), {
    type:             payload.type,
    severity:         payload.severity,
    zone_name:        payload.zone_name,
    description:      payload.description,
    reporter_phone:   payload.reporter_phone || null,
    people_affected:  payload.people_affected ? Number(payload.people_affected) : 0,
    lat:              payload.lat ?? 0,
    lng:              payload.lng ?? 0,
    location_display: payload.location_display ?? null,
    location_source:  payload.location_source ?? 'unknown',
    source:           'web',
    status:           'pending',
    created_at:       serverTimestamp(),
    verified_by:      null,
    verified_at:      null,
  });
  return docRef.id;
}

/**
 * Verify (approve) an incident — sets status to 'open'.
 *
 * @param {string} id - incident document ID
 * @param {string} adminEmail - email of the admin performing the action
 */
export async function verifyIncident(id, adminEmail) {
  await updateDoc(doc(db, COLLECTION, id), {
    status:      'open',
    verified_by: adminEmail,
    verified_at: serverTimestamp(),
  });
}

/**
 * Reject an incident — sets status to 'rejected'.
 */
export async function rejectIncident(id, adminEmail) {
  await updateDoc(doc(db, COLLECTION, id), {
    status:      'rejected',
    verified_by: adminEmail,
    verified_at: serverTimestamp(),
  });
}

/**
 * Resolve an incident — sets status to 'resolved'.
 */
export async function resolveIncident(id, adminEmail) {
  await updateDoc(doc(db, COLLECTION, id), {
    status:      'resolved',
    verified_by: adminEmail,
    verified_at: serverTimestamp(),
  });
}

/**
 * Helpers for stat counters.
 */
export function subscribeToPendingCount(onCount, onError) {
  const q = query(incidentsRef(), where('status', '==', 'pending'));
  return onSnapshot(q, (snap) => onCount(snap.size), onError);
}

export function subscribeToOpenCount(onCount, onError) {
  const q = query(incidentsRef(), where('status', '==', 'open'));
  return onSnapshot(q, (snap) => onCount(snap.size), onError);
}
