/**
 * React Hook for Real-Time Sensor Data
 * Fetches and updates sensor data from backend
 */

import { useState, useEffect, useCallback } from 'react';
import { getLatestSensorReading, getMultipleSensorReadings, SensorReading } from '../services/sensorDataService';

const POLLING_INTERVAL_MS = 10000; // 10 seconds

/**
 * Hook to fetch latest sensor reading for a single battery
 */
export const useSensorData = (batterySystemId: string | null, token: string, enabled = true) => {
  const [data, setData] = useState<SensorReading | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    if (!batterySystemId || !token || !enabled) return;

    try {
      setLoading(true);
      setError(null);
      const reading = await getLatestSensorReading(batterySystemId, token);
      setData(reading);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch sensor data'));
      console.error('useSensorData error:', err);
    } finally {
      setLoading(false);
    }
  }, [batterySystemId, token, enabled]);

  useEffect(() => {
    if (!enabled) return;

    // Initial fetch
    fetchData();

    // Poll for updates
    const intervalId = setInterval(fetchData, POLLING_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [fetchData, enabled]);

  return { data, loading, error, refetch: fetchData };
};

/**
 * Hook to fetch sensor data for multiple batteries
 */
export const useMultipleSensorData = (batterySystemIds: string[], token: string, enabled = true) => {
  const [data, setData] = useState<Map<string, SensorReading>>(new Map());
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    if (batterySystemIds.length === 0 || !token || !enabled) return;

    try {
      setLoading(true);
      setError(null);
      const readings = await getMultipleSensorReadings(batterySystemIds, token);
      setData(readings);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch sensor data'));
      console.error('useMultipleSensorData error:', err);
    } finally {
      setLoading(false);
    }
  }, [batterySystemIds, token, enabled]);

  useEffect(() => {
    if (!enabled) return;

    // Initial fetch
    fetchData();

    // Poll for updates
    const intervalId = setInterval(fetchData, POLLING_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [fetchData, enabled]);

  return { data, loading, error, refetch: fetchData };
};

/**
 * Hook to get sensor reading for a specific battery from a map
 */
export const useBatterySensorData = (
  batterySystemId: string | null,
  allReadings: Map<string, SensorReading>
): SensorReading | null => {
  if (!batterySystemId) return null;
  return allReadings.get(batterySystemId) || null;
};
