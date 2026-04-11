import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';

// All values must be set in .env (see .env.example)
const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
};

const app  = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db   = getFirestore(app);

// Enable offline persistence via IndexedDB.
// This means reports submitted on poor/no connectivity queue locally
// and sync to Firestore automatically when the connection returns.
// Critical for users in Mathare, Kibera, Mukuru on 2G networks.
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === 'failed-precondition') {
    // Multiple tabs open — persistence can only be enabled in one tab at a time.
    // Non-fatal: app continues working, just without offline queuing in this tab.
    console.warn('[NairobiAlert] Firestore offline persistence unavailable: multiple tabs open.');
  } else if (err.code === 'unimplemented') {
    // Browser does not support IndexedDB (very old browsers, some privacy modes).
    // Non-fatal: app continues working online-only.
    console.warn('[NairobiAlert] Firestore offline persistence not supported in this browser.');
  } else {
    console.error('[NairobiAlert] Firestore persistence error:', err);
  }
});

export default app;