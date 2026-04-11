import { useEffect, useState } from 'react';
import { subscribeToZones } from '../firebase/zones';

/**
 * useZones — real-time subscription to all zone documents.
 * Handles loading and error states; unsubscribes on unmount.
 */
export function useZones() {
  const [zones, setZones]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    setLoading(true);
    const unsub = subscribeToZones(
      (data) => { setZones(data); setLoading(false); },
      (err)  => { console.error(err); setError(err.message); setLoading(false); },
    );
    return unsub; // cleanup: unsubscribe on unmount
  }, []);

  return { zones, loading, error };
}

/**
 * useZonesAtRiskCount — derived count of zones with critical or warning risk level.
 * Used on home page stats bar.
 */
export function useZonesAtRiskCount() {
  const { zones, loading } = useZones();
  const count = zones.filter(
    (z) => z.risk_level === 'critical' || z.risk_level === 'warning',
  ).length;
  return { count, loading };
}
