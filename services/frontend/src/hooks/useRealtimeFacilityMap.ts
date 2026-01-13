// @ts-nocheck
import { useState, useEffect } from 'react';
import { useAlertStream } from './useAlertStream';
import { FacilityHealthStatus } from '../types';
import { facilityApi, FacilityWithHealth } from '../api/facilities';

interface UseRealtimeFacilityMapReturn {
  facilities: FacilityWithHealth[];
  healthMap: Map<string, FacilityHealthStatus>;
  loading: boolean;
  error: string | null;
  connectionState: any;
}

/**
 * useRealtimeFacilityMap - Hook for real-time facility map with SSE updates
 *
 * - Fetches initial facility data with health status
 * - Subscribes to real-time alert stream via SSE
 * - Updates facility health when new alerts arrive
 * - Maintains health map for quick lookups
 *
 * @returns Facilities data, health map, loading/error states, and SSE connection state
 */
export function useRealtimeFacilityMap(): UseRealtimeFacilityMapReturn {
  const [facilities, setFacilities] = useState<FacilityWithHealth[]>([]);
  const [healthMap, setHealthMap] = useState<Map<string, FacilityHealthStatus>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Subscribe to real-time alerts
  const { connectionState, alert: newAlert } = useAlertStream({
    enabled: true,
    onAlert: (alert) => {
      // Alert received, will trigger recalculation in useEffect
      console.log('New alert received:', alert);
    }
  });

  // Fetch initial facility data with health
  useEffect(() => {
    async function loadFacilities() {
      try {
        setLoading(true);
        const result = await facilityApi.getMapData();
        const facilitiesData: FacilityWithHealth[] = result.data || [];

        setFacilities(facilitiesData);

        // Initialize health map
        const initialHealth = new Map<string, FacilityHealthStatus>();
        facilitiesData.forEach((f: FacilityWithHealth) => {
          if (f.health) {
            initialHealth.set(f.id, f.health);
          }
        });
        setHealthMap(initialHealth);

        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load facility data');
        console.error('Error loading facilities:', err);
      } finally {
        setLoading(false);
      }
    }

    loadFacilities();
  }, []);

  // Update health when new alert arrives
  useEffect(() => {
    if (!newAlert || !newAlert.facilityId) return;

    // Fetch updated facility health for the affected facility
    async function refreshFacilityHealth() {
      try {
        const result = await facilityApi.getMapData();
        const updatedFacilities: FacilityWithHealth[] = result.data || [];

        // Update health map for affected facility
        const updatedHealth = new Map(healthMap);
        const updatedFacility = updatedFacilities.find((f: FacilityWithHealth) => f.id === newAlert.facilityId);

        if (updatedFacility?.health) {
          updatedHealth.set(updatedFacility.id, updatedFacility.health);
          setHealthMap(updatedHealth);

          // Also update the facilities array
          setFacilities(prevFacilities =>
            prevFacilities.map(f =>
              f.id === updatedFacility.id
                ? { ...f, health: updatedFacility.health }
                : f
            )
          );
        }
      } catch (err) {
        console.error('Failed to refresh facility health:', err);
      }
    }

    refreshFacilityHealth();
  }, [newAlert]);

  return {
    facilities,
    healthMap,
    loading,
    error,
    connectionState
  };
}
