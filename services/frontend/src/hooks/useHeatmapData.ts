import { useState, useEffect, useCallback } from 'react';
import type { HeatmapMetric } from '../components/HeatmapOverlay';

interface HeatmapDataPoint {
  position: [number, number, number];
  value: number;
}

interface SensorData {
  id: string;
  position: [number, number, number];
  temperature?: number;
  voltage?: number;
  soc?: number;
  soh?: number;
}

interface UseHeatmapDataOptions {
  metric: HeatmapMetric;
  facilityId?: string;
  updateInterval?: number;
}

interface UseHeatmapDataResult {
  data: HeatmapDataPoint[];
  isLoading: boolean;
  error: Error | null;
  minValue: number;
  maxValue: number;
  refresh: () => void;
}

const generateMockSensorData = (count: number = 20): SensorData[] => {
  const data: SensorData[] = [];
  
  for (let i = 0; i < count; i++) {
    const x = (Math.random() - 0.5) * 10;
    const y = Math.random() * 5;
    const z = (Math.random() - 0.5) * 10;
    
    data.push({
      id: `sensor-${i}`,
      position: [x, y, z],
      temperature: 15 + Math.random() * 20,
      voltage: 3.0 + Math.random() * 1.2,
      soc: 40 + Math.random() * 60,
      soh: 70 + Math.random() * 30,
    });
  }
  
  return data;
};

export function useHeatmapData({
  metric,
  facilityId: _facilityId,
  updateInterval = 5000,
}: UseHeatmapDataOptions): UseHeatmapDataResult {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [sensorData, setSensorData] = useState<SensorData[]>([]);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // TODO: Replace with actual API call
      // const response = await fetch(`/api/facilities/${facilityId}/sensors`);
      // const sensors = await response.json();
      
      const mockData = generateMockSensorData();
      setSensorData(mockData);
      
      setIsLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch heatmap data'));
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // Initial load
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchData();

    // Periodic updates
    const interval = setInterval(() => {
      setSensorData(prev => prev.map(sensor => ({
        ...sensor,
        temperature: sensor.temperature! + (Math.random() - 0.5) * 2,
        voltage: sensor.voltage! + (Math.random() - 0.5) * 0.1,
        soc: Math.max(0, Math.min(100, sensor.soc! + (Math.random() - 0.5) * 5)),
        soh: Math.max(0, Math.min(100, sensor.soh! + (Math.random() - 0.5) * 1)),
      })));
    }, updateInterval);

    return () => clearInterval(interval);
  }, [fetchData, updateInterval]);

  const processedData = sensorData
    .map(sensor => ({
      position: sensor.position,
      value: sensor[metric] ?? 0,
    }))
    .filter(d => d.value > 0);

  const values = processedData.map(d => d.value);
  const minValue = values.length > 0 ? Math.min(...values) : 0;
  const maxValue = values.length > 0 ? Math.max(...values) : 1;

  return {
    data: processedData,
    isLoading,
    error,
    minValue,
    maxValue,
    refresh: fetchData,
  };
}
