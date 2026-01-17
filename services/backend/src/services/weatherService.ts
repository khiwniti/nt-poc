import axios from 'axios';
import { buildCacheKey, getCachedData, setCachedData } from './mapCache.js';
import logger from '../config/logger.js';

const WEATHER_API_BASE = process.env.WEATHER_API_URL || 'https://api.openweathermap.org/data/2.5';
const WEATHER_API_KEY = process.env.WEATHER_API_KEY;

// Temperature thresholds for alerts (Celsius)
const EXTREME_HEAT_THRESHOLD = 40;
const EXTREME_COLD_THRESHOLD = -20;
const HIGH_HEAT_THRESHOLD = 35;
const LOW_COLD_THRESHOLD = -10;

export interface CurrentWeather {
  temperature: number;
  feelsLike: number;
  humidity: number;
  pressure: number;
  windSpeed: number;
  windDirection: number;
  description: string;
  icon: string;
  timestamp: number;
  alerts?: WeatherAlert[];
}

export interface WeatherForecast {
  date: string;
  temperature: {
    min: number;
    max: number;
    day: number;
    night: number;
  };
  humidity: number;
  windSpeed: number;
  description: string;
  icon: string;
  pop: number; // Probability of precipitation
}

export interface WeatherAlert {
  severity: 'extreme' | 'high' | 'moderate';
  type: 'heat' | 'cold';
  message: string;
  temperature: number;
}

export interface HistoricalWeatherData {
  date: string;
  temperature: number;
  humidity: number;
  description: string;
}

export interface WeatherCorrelation {
  date: string;
  temperature: number;
  avgSoC: number;
  avgSoH: number;
  alertCount: number;
  correlation: {
    temperatureVsSoC: number;
    temperatureVsSoH: number;
    temperatureVsAlerts: number;
  };
}

/**
 * Get current weather data for a location
 */
export const getCurrentWeather = async (
  latitude: number,
  longitude: number
): Promise<CurrentWeather | null> => {
  const cacheKey = buildCacheKey('weather_current', { latitude, longitude });

  // Cache for 10 minutes
  const cached = await getCachedData<CurrentWeather>('weather_current', cacheKey);
  if (cached) {
    logger.info('weather_current_cache_hit', { latitude, longitude });
    return cached;
  }

  if (!WEATHER_API_KEY) {
    logger.warn('weather_api_key_missing');
    return null;
  }

  try {
    const response = await axios.get(`${WEATHER_API_BASE}/weather`, {
      params: {
        lat: latitude,
        lon: longitude,
        appid: WEATHER_API_KEY,
        units: 'metric',
      },
      timeout: 5000,
    });

    const data = response.data;
    const temperature = data.main.temp;
    
    const result: CurrentWeather = {
      temperature,
      feelsLike: data.main.feels_like,
      humidity: data.main.humidity,
      pressure: data.main.pressure,
      windSpeed: data.wind.speed,
      windDirection: data.wind.deg,
      description: data.weather[0].description,
      icon: data.weather[0].icon,
      timestamp: Date.now(),
      alerts: generateWeatherAlerts(temperature),
    };

    await setCachedData('weather_current', cacheKey, result, 600); // 10 min cache
    logger.info('weather_current_success', { latitude, longitude, cached: false });
    return result;
  } catch (error) {
    logger.error('weather_current_error', { latitude, longitude, error });
    return null;
  }
};

/**
 * Get 7-day weather forecast
 */
export const getWeatherForecast = async (
  latitude: number,
  longitude: number
): Promise<WeatherForecast[] | null> => {
  const cacheKey = buildCacheKey('weather_forecast', { latitude, longitude });

  // Cache for 1 hour
  const cached = await getCachedData<WeatherForecast[]>('weather_forecast', cacheKey);
  if (cached) {
    logger.info('weather_forecast_cache_hit', { latitude, longitude });
    return cached;
  }

  if (!WEATHER_API_KEY) {
    logger.warn('weather_api_key_missing');
    return null;
  }

  try {
    const response = await axios.get(`${WEATHER_API_BASE}/forecast/daily`, {
      params: {
        lat: latitude,
        lon: longitude,
        appid: WEATHER_API_KEY,
        units: 'metric',
        cnt: 7, // 7 days
      },
      timeout: 5000,
    });

    const forecasts: WeatherForecast[] = response.data.list.map((day: any) => ({
      date: new Date(day.dt * 1000).toISOString().split('T')[0],
      temperature: {
        min: day.temp.min,
        max: day.temp.max,
        day: day.temp.day,
        night: day.temp.night,
      },
      humidity: day.humidity,
      windSpeed: day.speed,
      description: day.weather[0].description,
      icon: day.weather[0].icon,
      pop: day.pop || 0,
    }));

    await setCachedData('weather_forecast', cacheKey, forecasts, 3600); // 1 hour cache
    logger.info('weather_forecast_success', { latitude, longitude, cached: false });
    return forecasts;
  } catch (error) {
    logger.error('weather_forecast_error', { latitude, longitude, error });
    return null;
  }
};

/**
 * Generate weather alerts based on temperature thresholds
 */
function generateWeatherAlerts(temperature: number): WeatherAlert[] {
  const alerts: WeatherAlert[] = [];

  if (temperature >= EXTREME_HEAT_THRESHOLD) {
    alerts.push({
      severity: 'extreme',
      type: 'heat',
      message: `Extreme heat warning: ${temperature}°C. Battery systems may be at risk.`,
      temperature,
    });
  } else if (temperature >= HIGH_HEAT_THRESHOLD) {
    alerts.push({
      severity: 'high',
      type: 'heat',
      message: `High temperature alert: ${temperature}°C. Monitor battery cooling systems.`,
      temperature,
    });
  }

  if (temperature <= EXTREME_COLD_THRESHOLD) {
    alerts.push({
      severity: 'extreme',
      type: 'cold',
      message: `Extreme cold warning: ${temperature}°C. Battery systems may be at risk.`,
      temperature,
    });
  } else if (temperature <= LOW_COLD_THRESHOLD) {
    alerts.push({
      severity: 'high',
      type: 'cold',
      message: `Low temperature alert: ${temperature}°C. Monitor battery heating systems.`,
      temperature,
    });
  }

  return alerts;
}

/**
 * Get historical weather data for correlation analysis
 */
export const getHistoricalWeather = async (
  latitude: number,
  longitude: number,
  startDate: Date,
  endDate: Date
): Promise<HistoricalWeatherData[] | null> => {
  const cacheKey = buildCacheKey('weather_historical', {
    latitude,
    longitude,
    start: startDate.toISOString(),
    end: endDate.toISOString(),
  });

  const cached = await getCachedData<HistoricalWeatherData[]>('weather_historical', cacheKey);
  if (cached) {
    logger.info('weather_historical_cache_hit', { latitude, longitude });
    return cached;
  }

  if (!WEATHER_API_KEY) {
    logger.warn('weather_api_key_missing');
    return null;
  }

  try {
    const historicalData: HistoricalWeatherData[] = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const timestamp = Math.floor(currentDate.getTime() / 1000);
      
      try {
        const response = await axios.get(`${WEATHER_API_BASE}/onecall/timemachine`, {
          params: {
            lat: latitude,
            lon: longitude,
            dt: timestamp,
            appid: WEATHER_API_KEY,
            units: 'metric',
          },
          timeout: 5000,
        });

        if (response.data.current) {
          historicalData.push({
            date: currentDate.toISOString().split('T')[0],
            temperature: response.data.current.temp,
            humidity: response.data.current.humidity,
            description: response.data.current.weather[0].description,
          });
        }
      } catch (error) {
        logger.warn('historical_weather_day_error', { date: currentDate.toISOString(), error });
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    await setCachedData('weather_historical', cacheKey, historicalData, 86400); // 24 hour cache
    logger.info('weather_historical_success', { latitude, longitude, cached: false });
    return historicalData;
  } catch (error) {
    logger.error('weather_historical_error', { latitude, longitude, error });
    return null;
  }
};
