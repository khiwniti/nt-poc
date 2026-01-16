import axios from 'axios';
import { buildCacheKey, getCachedData, setCachedData } from './mapCache';
import logger from '../config/logger';

const MAPBOX_API_BASE = 'https://api.mapbox.com';
const WEATHER_API_BASE = process.env.WEATHER_API_URL || 'https://api.openweathermap.org/data/2.5';

export interface GeocodingResult {
  address: string;
  latitude: number;
  longitude: number;
  placeName: string;
  relevance: number;
}

export interface WeatherData {
  temperature: number;
  humidity: number;
  windSpeed: number;
  description: string;
  icon: string;
  timestamp: number;
}

export interface DistanceResult {
  distanceKm: number;
  durationMinutes: number;
}

export const geocodeAddress = async (address: string): Promise<GeocodingResult | null> => {
  const cacheKey = buildCacheKey('geocoding', { address });

  const cached = await getCachedData<GeocodingResult>('geocoding', cacheKey);
  if (cached) {
    logger.info('geocoding_cache_hit', { address });
    return cached;
  }

  const mapboxToken = process.env.MAPBOX_ACCESS_TOKEN;
  if (!mapboxToken) {
    logger.warn('mapbox_token_missing');
    return null;
  }

  try {
    const response = await axios.get(
      `${MAPBOX_API_BASE}/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json`,
      {
        params: {
          access_token: mapboxToken,
          limit: 1,
        },
        timeout: 5000,
      }
    );

    if (response.data.features && response.data.features.length > 0) {
      const feature = response.data.features[0];
      const result: GeocodingResult = {
        address,
        latitude: feature.center[1],
        longitude: feature.center[0],
        placeName: feature.place_name,
        relevance: feature.relevance,
      };

      await setCachedData('geocoding', cacheKey, result);
      logger.info('geocoding_success', { address, cached: false });
      return result;
    }

    logger.warn('geocoding_no_results', { address });
    return null;
  } catch (error) {
    logger.error('geocoding_error', { address, error });
    return null;
  }
};

export const reverseGeocode = async (
  latitude: number,
  longitude: number
): Promise<GeocodingResult | null> => {
  const cacheKey = buildCacheKey('geocoding', { latitude, longitude });

  const cached = await getCachedData<GeocodingResult>('geocoding', cacheKey);
  if (cached) {
    logger.info('reverse_geocoding_cache_hit', { latitude, longitude });
    return cached;
  }

  const mapboxToken = process.env.MAPBOX_ACCESS_TOKEN;
  if (!mapboxToken) {
    logger.warn('mapbox_token_missing');
    return null;
  }

  try {
    const response = await axios.get(
      `${MAPBOX_API_BASE}/geocoding/v5/mapbox.places/${longitude},${latitude}.json`,
      {
        params: {
          access_token: mapboxToken,
          limit: 1,
        },
        timeout: 5000,
      }
    );

    if (response.data.features && response.data.features.length > 0) {
      const feature = response.data.features[0];
      const result: GeocodingResult = {
        address: feature.place_name,
        latitude,
        longitude,
        placeName: feature.place_name,
        relevance: feature.relevance,
      };

      await setCachedData('geocoding', cacheKey, result);
      logger.info('reverse_geocoding_success', { latitude, longitude, cached: false });
      return result;
    }

    logger.warn('reverse_geocoding_no_results', { latitude, longitude });
    return null;
  } catch (error) {
    logger.error('reverse_geocoding_error', { latitude, longitude, error });
    return null;
  }
};

export const getWeatherData = async (
  latitude: number,
  longitude: number
): Promise<WeatherData | null> => {
  const cacheKey = buildCacheKey('weather', { latitude, longitude });

  const cached = await getCachedData<WeatherData>('weather', cacheKey);
  if (cached) {
    logger.info('weather_cache_hit', { latitude, longitude });
    return cached;
  }

  const weatherApiKey = process.env.WEATHER_API_KEY;
  if (!weatherApiKey) {
    logger.warn('weather_api_key_missing');
    return null;
  }

  try {
    const response = await axios.get(`${WEATHER_API_BASE}/weather`, {
      params: {
        lat: latitude,
        lon: longitude,
        appid: weatherApiKey,
        units: 'metric',
      },
      timeout: 5000,
    });

    const data = response.data;
    const result: WeatherData = {
      temperature: data.main.temp,
      humidity: data.main.humidity,
      windSpeed: data.wind.speed,
      description: data.weather[0].description,
      icon: data.weather[0].icon,
      timestamp: Date.now(),
    };

    await setCachedData('weather', cacheKey, result);
    logger.info('weather_success', { latitude, longitude, cached: false });
    return result;
  } catch (error) {
    logger.error('weather_error', { latitude, longitude, error });
    return null;
  }
};

export const calculateDistance = async (
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number },
  profile: 'driving' | 'walking' | 'cycling' = 'driving'
): Promise<DistanceResult | null> => {
  const cacheKey = buildCacheKey('distance', { from, to, profile });

  const cached = await getCachedData<DistanceResult>('distance', cacheKey);
  if (cached) {
    logger.info('distance_cache_hit', { from, to, profile });
    return cached;
  }

  const mapboxToken = process.env.MAPBOX_ACCESS_TOKEN;
  if (!mapboxToken) {
    logger.warn('mapbox_token_missing');
    return null;
  }

  try {
    const coordinates = `${from.longitude},${from.latitude};${to.longitude},${to.latitude}`;
    const response = await axios.get(
      `${MAPBOX_API_BASE}/directions/v5/mapbox/${profile}/${coordinates}`,
      {
        params: {
          access_token: mapboxToken,
          geometries: 'geojson',
        },
        timeout: 5000,
      }
    );

    if (response.data.routes && response.data.routes.length > 0) {
      const route = response.data.routes[0];
      const result: DistanceResult = {
        distanceKm: route.distance / 1000,
        durationMinutes: route.duration / 60,
      };

      await setCachedData('distance', cacheKey, result);
      logger.info('distance_calculation_success', { from, to, profile, cached: false });
      return result;
    }

    logger.warn('distance_calculation_no_route', { from, to, profile });
    return null;
  } catch (error) {
    logger.error('distance_calculation_error', { from, to, profile, error });
    return null;
  }
};

export const getMapTileUrl = (
  z: number,
  x: number,
  y: number,
  style: string = 'streets-v11'
): string => {
  const mapboxToken = process.env.MAPBOX_ACCESS_TOKEN;
  if (!mapboxToken) {
    return '';
  }
  return `${MAPBOX_API_BASE}/styles/v1/mapbox/${style}/tiles/${z}/${x}/${y}?access_token=${mapboxToken}`;
};
