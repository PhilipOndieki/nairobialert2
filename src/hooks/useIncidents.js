// File: src/hooks/useIncidents.js
// Purpose: Real-time Firestore listener hook for incidents — handles loading, error, cleanup
// Dependencies: react, ../firebase/incidents

import { useEffect, useState } from 'react';
import {
  subscribeToOpenIncidents,
  subscribeToAllIncidents,
  subscribeToIncidentsByStatus,
  subscribeToPendingCount,
  subscribeToOpenCount,
} from '../firebase/incidents';

/**
 * useOpenIncidents — subscribes to approved (status == 'open') incidents.
 * Used on the public map and home stats.
 */
export function useOpenIncidents() {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);

  useEffect(() => {
    setLoading(true);
    const unsub = subscribeToOpenIncidents(
      (data) => { setIncidents(data); setLoading(false); },
      (err)  => { console.error(err); setError(err.message); setLoading(false); },
    );
    return unsub; // cleanup: unsubscribe on unmount
  }, []);

  return { incidents, loading, error };
}

/**
 * useAllIncidents — subscribes to all incidents regardless of status.
 * Used in the admin dashboard and incidents management page.
 */
export function useAllIncidents() {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);

  useEffect(() => {
    setLoading(true);
    const unsub = subscribeToAllIncidents(
      (data) => { setIncidents(data); setLoading(false); },
      (err)  => { console.error(err); setError(err.message); setLoading(false); },
    );
    return unsub;
  }, []);

  return { incidents, loading, error };
}

/**
 * useIncidentsByStatus — subscribes to a specific status bucket.
 * Used in admin incident filter tabs.
 */
export function useIncidentsByStatus(status) {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);

  useEffect(() => {
    setLoading(true);
    const unsub = subscribeToIncidentsByStatus(
      status,
      (data) => { setIncidents(data); setLoading(false); },
      (err)  => { console.error(err); setError(err.message); setLoading(false); },
    );
    return unsub;
  }, [status]);

  return { incidents, loading, error };
}

/**
 * useIncidentCounts — subscribes to live pending + open counts for stat cards.
 */
export function useIncidentCounts() {
  const [pendingCount, setPendingCount] = useState(0);
  const [openCount, setOpenCount]       = useState(0);
  const [loading, setLoading]           = useState(true);

  useEffect(() => {
    let pendingDone = false;
    let openDone    = false;

    const checkDone = () => {
      if (pendingDone && openDone) setLoading(false);
    };

    const unsubPending = subscribeToPendingCount((n) => {
      setPendingCount(n);
      pendingDone = true;
      checkDone();
    }, console.error);

    const unsubOpen = subscribeToOpenCount((n) => {
      setOpenCount(n);
      openDone = true;
      checkDone();
    }, console.error);

    return () => { unsubPending(); unsubOpen(); };
  }, []);

  return { pendingCount, openCount, loading };
}
