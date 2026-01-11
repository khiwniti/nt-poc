import { useState, useEffect } from 'react';
import type { FacilityWeather, WeatherForecast, WeatherCorrelation } from '../types/weather';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

interface UseWeatherResult {
  loading: boolean;
  error: string | null;
  facilitiesWeather: FacilityWeather[];
  refreshWeather: () => Promise<void>;
}

export function useWeather(): UseWeatherResult {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [facilitiesWeather, setFacilitiesWeather] = useState<FacilityWeather[]>([]);

  const fetchWeather = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/weather/facilities`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch weather data');
      }

      const result = await response.json();
      setFacilitiesWeather(result.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWeather();

    // Refresh weather every 10 minutes
    const interval = setInterval(fetchWeather, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return {
    loading,
    error,
    facilitiesWeather,
    refreshWeather: fetchWeather,
  };
}

interface UseFacilityWeatherResult {
  loading: boolean;
  error: string | null;
  weather: FacilityWeather | null;
  forecast: WeatherForecast[] | null;
  correlation: WeatherCorrelation | null;
  refreshWeather: () => Promise<void>;
  refreshForecast: () => Promise<void>;
  refreshCorrelation: (days?: number) => Promise<void>;
}

export function useFacilityWeather(facilityId: string | null): UseFacilityWeatherResult {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [weather, setWeather] = useState<FacilityWeather | null>(null);
  const [forecast, setForecast] = useState<WeatherForecast[] | null>(null);
  const [correlation, setCorrelation] = useState<WeatherCorrelation | null>(null);

  const fetchWeather = async () => {
    if (!facilityId) return;

    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/weather/facility/${facilityId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch weather data');
      }

      const result = await response.json();
      setWeather(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const fetchForecast = async () => {
    if (!facilityId) return;

    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/weather/forecast/facility/${facilityId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch forecast data');
      }

      const result = await response.json();
      setForecast(result.data.forecast);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const fetchCorrelation = async (days: number = 30) => {
    if (!facilityId) return;

    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('token');
      const response = await fetch(
        `${API_BASE}/weather/correlation/facility/${facilityId}?days=${days}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch correlation data');
      }

      const result = await response.json();
      setCorrelation(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (facilityId) {
      fetchWeather();
      fetchForecast();
    }
  }, [facilityId]);

  return {
    loading,
    error,
    weather,
    forecast,
    correlation,
    refreshWeather: fetchWeather,
    refreshForecast: fetchForecast,
    refreshCorrelation: fetchCorrelation,
  };
}
