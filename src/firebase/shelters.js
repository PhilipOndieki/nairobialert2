// File: src/firebase/shelters.js
// Purpose: Firestore helpers for the shelters collection (evacuation shelters)
// Dependencies: firebase/firestore, ./config

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

const COLLECTION = 'shelters';
const sheltersRef = () => collection(db, COLLECTION);

/**
 * Subscribe to all shelters ordered by name.
 * Returns unsubscribe function.
 */
export function subscribeToShelters(onData, onError) {
  const q = query(sheltersRef(), orderBy('name'));
  return onSnapshot(q, (snap) => {
    const shelters = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    onData(shelters);
  }, onError);
}

/**
 * Subscribe to open shelters count (for dashboard + home stats).
 */
export function subscribeToOpenSheltersCount(onCount, onError) {
  const q = query(sheltersRef(), where('is_open', '==', true));
  return onSnapshot(q, (snap) => onCount(snap.size), onError);
}

/**
 * Create a new shelter record.
 */
export async function createShelter(payload) {
  const docRef = await addDoc(sheltersRef(), {
    name:      payload.name,
    address:   payload.address,
    lat:       Number(payload.lat),
    lng:       Number(payload.lng),
    capacity:  Number(payload.capacity),
    occupancy: Number(payload.occupancy) || 0,
    is_open:   Boolean(payload.is_open),
  });
  return docRef.id;
}

/**
 * Update a shelter record.
 */
export async function updateShelter(id, payload) {
  await updateDoc(doc(db, COLLECTION, id), payload);
}

/**
 * Delete a shelter record.
 */
export async function deleteShelter(id) {
  await deleteDoc(doc(db, COLLECTION, id));
}
