// File: src/firebase/zones.js
// Purpose: Firestore helpers for the zones collection (risk level areas)
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
} from 'firebase/firestore';
import { db } from './config';

const COLLECTION = 'zones';
const zonesRef = () => collection(db, COLLECTION);

/**
 * Subscribe to all zones ordered by name.
 * Returns unsubscribe function.
 */
export function subscribeToZones(onData, onError) {
  const q = query(zonesRef(), orderBy('name'));
  return onSnapshot(q, (snap) => {
    const zones = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    onData(zones);
  }, onError);
}

/**
 * Create a new zone (admin only).
 */
export async function createZone(payload) {
  const docRef = await addDoc(zonesRef(), {
    name:       payload.name,
    lat:        Number(payload.lat),
    lng:        Number(payload.lng),
    radius:     Number(payload.radius),
    risk_level: payload.risk_level,
    population: payload.population,
  });
  return docRef.id;
}

/**
 * Update an existing zone.
 */
export async function updateZone(id, payload) {
  await updateDoc(doc(db, COLLECTION, id), payload);
}

/**
 * Delete a zone.
 */
export async function deleteZone(id) {
  await deleteDoc(doc(db, COLLECTION, id));
}
