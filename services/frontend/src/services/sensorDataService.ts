/**
 * Sensor Data API Service
 * Fetches real sensor data from backend/TimescaleDB
 */

import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export interface SensorReading {
  batterySystemId: string;
  time: string;
  voltage: number;
  current: number;
  temperature: number;
  soc: number;
  soh: number;
  power: number;
}

export interface TimeSeriesData {
  data: SensorReading[];
  total: number;
  interval: 'raw' | 'hourly';
}

/**
 * Get latest sensor reading for a battery system
 */
export const getLatestSensorReading = async (
  batterySystemId: string,
  token: string
): Promise<SensorReading | null> => {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/api/v1/sensor-readings/latest`,
      {
        params: { batterySystemId },
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    
    return response.data.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 404) {
        // No data found - return null
        return null;
      }
      console.error('Failed to fetch sensor reading:', error.message);
    }
    throw error;
  }
};

/**
 * Get time series sensor data for a battery system
 */
export const getSensorTimeSeries = async (
  batterySystemId: string,
  startTime: string,
  endTime: string,
  token: string,
  interval: 'raw' | 'hourly' = 'raw'
): Promise<TimeSeriesData> => {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/api/v1/sensor-readings/timeseries`,
      {
        params: {
          batterySystemId,
          startTime,
          endTime,
          interval,
        },
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    
    return response.data;
  } catch (error) {
    console.error('Failed to fetch sensor timeseries:', error);
    throw error;
  }
};

/**
 * Get latest readings for multiple battery systems
 */
export const getMultipleSensorReadings = async (
  batterySystemIds: string[],
  token: string
): Promise<Map<string, SensorReading>> => {
  const readingsMap = new Map<string, SensorReading>();
  
  // Fetch all readings in parallel
  const promises = batterySystemIds.map(async (id) => {
    try {
      const reading = await getLatestSensorReading(id, token);
      if (reading) {
        readingsMap.set(id, reading);
      }
    } catch (error) {
      console.warn(`Failed to fetch reading for ${id}:`, error);
    }
  });
  
  await Promise.all(promises);
  return readingsMap;
};

/**
 * Convert sensor reading to battery metrics format
 * Used to replace mock data in constants
 */
export const sensorReadingToBatteryMetrics = (reading: SensorReading | null) => {
  if (!reading) {
    // Return default/unknown values
    return {
      powerUsage: 0,
      temperature: 0,
      soc: 0,
      soh: 0,
      voltage: 0,
      current: 0,
    };
  }
  
  return {
    powerUsage: Math.abs(reading.power), // Convert to positive for display
    temperature: reading.temperature,
    soc: reading.soc,
    soh: reading.soh,
    voltage: reading.voltage,
    current: reading.current,
  };
};
