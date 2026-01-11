import { useEffect, useRef, useCallback } from 'react';
import { useDashboardStore } from '../stores/dashboardStore';

interface UseDashboardRefreshOptions {
  facilityId: string | undefined;
  interval?: number; // milliseconds
  enabled?: boolean;
}

export const useDashboardRefresh = ({
  facilityId,
  interval = 30000, // 30 seconds default
  enabled = true,
}: UseDashboardRefreshOptions) => {
  const { fetchDashboard } = useDashboardStore();
  const intervalRef = useRef<number | null>(null);
  
  const refresh = useCallback(async () => {
    if (!facilityId || !enabled) return;
    
    try {
      await fetchDashboard(facilityId);
    } catch (error) {
      console.error('Dashboard refresh failed:', error);
    }
  }, [facilityId, enabled, fetchDashboard]);
  
  useEffect(() => {
    if (!enabled || !facilityId) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }
    
    // Initial fetch
    refresh();
    
    // Set up interval
    intervalRef.current = window.setInterval(refresh, interval);
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [facilityId, interval, enabled, refresh]);
  
  return { refresh };
};
