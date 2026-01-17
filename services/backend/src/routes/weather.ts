import express, { Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { pool } from '../config/database.js';
import {
  getCurrentWeather,
  getWeatherForecast,
  getHistoricalWeather,
} from '../services/weatherService';

const router = express.Router();

router.use(authenticate);

/**
 * GET /weather/current
 * Get current weather for a location
 */
router.get('/current', async (req: AuthRequest, res: Response) => {
  try {
    const latitude = parseFloat(req.query.latitude as string);
    const longitude = parseFloat(req.query.longitude as string);

    if (isNaN(latitude) || isNaN(longitude)) {
      return res.status(400).json({ error: 'Valid latitude and longitude are required' });
    }

    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return res.status(400).json({ error: 'Invalid coordinates' });
    }

    const weather = await getCurrentWeather(latitude, longitude);

    if (!weather) {
      return res.status(503).json({ error: 'Weather data not available' });
    }

    res.json({ data: weather });
  } catch (error) {
    console.error('Error fetching current weather:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /weather/forecast
 * Get 7-day weather forecast
 */
router.get('/forecast', async (req: AuthRequest, res: Response) => {
  try {
    const latitude = parseFloat(req.query.latitude as string);
    const longitude = parseFloat(req.query.longitude as string);

    if (isNaN(latitude) || isNaN(longitude)) {
      return res.status(400).json({ error: 'Valid latitude and longitude are required' });
    }

    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return res.status(400).json({ error: 'Invalid coordinates' });
    }

    const forecast = await getWeatherForecast(latitude, longitude);

    if (!forecast) {
      return res.status(503).json({ error: 'Weather forecast not available' });
    }

    res.json({ data: forecast });
  } catch (error) {
    console.error('Error fetching weather forecast:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /weather/facility/:id
 * Get current weather for a specific facility
 */
router.get('/facility/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const facilityResult = await pool.query(
      'SELECT latitude, longitude, name FROM facilities WHERE id = $1',
      [id]
    );

    if (facilityResult.rows.length === 0) {
      return res.status(404).json({ error: 'Facility not found' });
    }

    const facility = facilityResult.rows[0];

    if (!facility.latitude || !facility.longitude) {
      return res.status(400).json({ error: 'Facility does not have location coordinates' });
    }

    const weather = await getCurrentWeather(facility.latitude, facility.longitude);

    if (!weather) {
      return res.status(503).json({ error: 'Weather data not available' });
    }

    res.json({
      data: {
        facilityId: id,
        facilityName: facility.name,
        weather,
      },
    });
  } catch (error) {
    console.error('Error fetching facility weather:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /weather/facilities
 * Get current weather for all facilities
 */
router.get('/facilities', async (req: AuthRequest, res: Response) => {
  try {
    const facilitiesResult = await pool.query(
      'SELECT id, name, latitude, longitude FROM facilities WHERE status = $1 AND latitude IS NOT NULL AND longitude IS NOT NULL',
      ['active']
    );

    const weatherPromises = facilitiesResult.rows.map(async (facility) => {
      const weather = await getCurrentWeather(facility.latitude, facility.longitude);
      return {
        facilityId: facility.id,
        facilityName: facility.name,
        latitude: facility.latitude,
        longitude: facility.longitude,
        weather,
      };
    });

    const weatherData = await Promise.all(weatherPromises);

    res.json({ data: weatherData });
  } catch (error) {
    console.error('Error fetching facilities weather:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /weather/forecast/facility/:id
 * Get 7-day forecast for a specific facility
 */
router.get('/forecast/facility/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const facilityResult = await pool.query(
      'SELECT latitude, longitude, name FROM facilities WHERE id = $1',
      [id]
    );

    if (facilityResult.rows.length === 0) {
      return res.status(404).json({ error: 'Facility not found' });
    }

    const facility = facilityResult.rows[0];

    if (!facility.latitude || !facility.longitude) {
      return res.status(400).json({ error: 'Facility does not have location coordinates' });
    }

    const forecast = await getWeatherForecast(facility.latitude, facility.longitude);

    if (!forecast) {
      return res.status(503).json({ error: 'Weather forecast not available' });
    }

    res.json({
      data: {
        facilityId: id,
        facilityName: facility.name,
        forecast,
      },
    });
  } catch (error) {
    console.error('Error fetching facility forecast:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /weather/correlation/facility/:id
 * Get weather correlation analysis for a facility
 */
router.get('/correlation/facility/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const days = parseInt(req.query.days as string) || 30;

    if (days < 1 || days > 90) {
      return res.status(400).json({ error: 'Days must be between 1 and 90' });
    }

    const facilityResult = await pool.query(
      'SELECT latitude, longitude, name FROM facilities WHERE id = $1',
      [id]
    );

    if (facilityResult.rows.length === 0) {
      return res.status(404).json({ error: 'Facility not found' });
    }

    const facility = facilityResult.rows[0];

    if (!facility.latitude || !facility.longitude) {
      return res.status(400).json({ error: 'Facility does not have location coordinates' });
    }

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const historicalWeather = await getHistoricalWeather(
      facility.latitude,
      facility.longitude,
      startDate,
      endDate
    );

    if (!historicalWeather) {
      return res.status(503).json({ error: 'Historical weather data not available' });
    }

    // Get battery performance data for the same period
    const performanceResult = await pool.query(
      `
      SELECT 
        DATE(sr.time) as date,
        AVG(sr.soc) as avg_soc,
        AVG(sr.soh) as avg_soh,
        COUNT(DISTINCT a.id) as alert_count
      FROM sensor_readings sr
      JOIN battery_systems bs ON bs.id = sr.battery_system_id
      JOIN zones z ON z.id = bs.zone_id
      LEFT JOIN alerts a ON a.battery_system_id = bs.id 
        AND DATE(a.created_at) = DATE(sr.time)
        AND a.status = 'active'
      WHERE z.facility_id = $1 
        AND sr.time >= $2 
        AND sr.time <= $3
      GROUP BY DATE(sr.time)
      ORDER BY date
      `,
      [id, startDate, endDate]
    );

    // Merge weather and performance data
    const correlationData = historicalWeather.map((weather) => {
      const performance = performanceResult.rows.find((p) => p.date === weather.date);
      return {
        date: weather.date,
        temperature: weather.temperature,
        humidity: weather.humidity,
        avgSoC: performance ? parseFloat(performance.avg_soc) : null,
        avgSoH: performance ? parseFloat(performance.avg_soh) : null,
        alertCount: performance ? parseInt(performance.alert_count) : 0,
      };
    });

    // Calculate correlation coefficients
    const validData = correlationData.filter((d) => d.avgSoC !== null && d.avgSoH !== null);
    
    const correlation = {
      temperatureVsSoC: calculateCorrelation(
        validData.map((d) => d.temperature),
        validData.map((d) => d.avgSoC!)
      ),
      temperatureVsSoH: calculateCorrelation(
        validData.map((d) => d.temperature),
        validData.map((d) => d.avgSoH!)
      ),
      temperatureVsAlerts: calculateCorrelation(
        validData.map((d) => d.temperature),
        validData.map((d) => d.alertCount)
      ),
    };

    res.json({
      data: {
        facilityId: id,
        facilityName: facility.name,
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        correlationData,
        correlation,
      },
    });
  } catch (error) {
    console.error('Error fetching weather correlation:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Calculate Pearson correlation coefficient
 */
function calculateCorrelation(x: number[], y: number[]): number {
  if (x.length !== y.length || x.length === 0) return 0;

  const n = x.length;
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
  const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
  const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);

  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

  if (denominator === 0) return 0;
  return numerator / denominator;
}

export default router;
