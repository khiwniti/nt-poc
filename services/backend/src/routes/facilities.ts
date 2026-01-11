import express, { Response } from 'express';
import { pool } from '../config/database.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import {
  haversineDistance,
  estimateDrivingTime,
  formatDistance,
  formatDuration,
  getDirectionsUrl,
} from '../utils/distance.js';

const router = express.Router();

router.use(authenticate);

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT id, name, location, timezone, total_zones, status, created_at, updated_at
      FROM facilities
      WHERE status = 'active'
      ORDER BY created_at DESC
    `);

    res.json({
      data: result.rows,
      total: result.rowCount || 0,
    });
  } catch (error) {
    console.error('Error fetching facilities:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT id, name, location, timezone, total_zones as "totalZones", status, created_at, updated_at
       FROM facilities WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Facility not found' });
    }

    res.json({ data: result.rows[0] });
  } catch (error) {
    console.error('Error fetching facility:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id/kpis', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const kpisQuery = `
      WITH latest_readings AS (
        SELECT DISTINCT ON (sr.battery_system_id)
          sr.battery_system_id,
          sr.soc,
          sr.soh,
          sr.power,
          bs.capacity
        FROM sensor_readings sr
        JOIN battery_systems bs ON bs.id = sr.battery_system_id
        JOIN zones z ON z.id = bs.zone_id
        WHERE z.facility_id = $1 AND bs.status = 'operational'
        ORDER BY sr.battery_system_id, sr.time DESC
      )
      SELECT
        COALESCE(SUM(capacity), 0) as total_capacity,
        COALESCE(AVG(soc), 0) as avg_soc,
        COALESCE(AVG(soh), 0) as avg_soh,
        COALESCE(SUM(power), 0) as total_power
      FROM latest_readings
    `;

    const alertsQuery = `
      SELECT COUNT(*) as active_alerts
      FROM alerts a
      JOIN battery_systems bs ON bs.id = a.battery_system_id
      JOIN zones z ON z.id = bs.zone_id
      WHERE z.facility_id = $1 AND a.status = 'active'
    `;

    const [kpisResult, alertsResult] = await Promise.all([
      pool.query(kpisQuery, [id]),
      pool.query(alertsQuery, [id]),
    ]);

    const kpis = kpisResult.rows[0];
    const alerts = alertsResult.rows[0];

    res.json({
      data: {
        totalCapacity: parseFloat(kpis.total_capacity),
        averageSoC: parseFloat(kpis.avg_soc),
        averageSoH: parseFloat(kpis.avg_soh),
        totalPower: parseFloat(kpis.total_power),
        activeAlerts: parseInt(alerts.active_alerts),
      },
    });
  } catch (error) {
    console.error('Error fetching facility KPIs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/v1/facilities/nearby/:id
 * Get nearest facilities to a specific facility
 *
 * Query Parameters:
 * - limit: number of results (default: 5, max: 50)
 * - maxDistance: maximum distance in km (default: unlimited)
 * - includeMatrix: include full distance matrix (default: false)
 */
router.get('/nearby/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const limit = Math.min(parseInt((req.query.limit as string) || '5'), 50);
    const maxDistance = req.query.maxDistance
      ? parseFloat(req.query.maxDistance as string)
      : null;
    const includeMatrix = req.query.includeMatrix === 'true';

    // Get origin facility
    const originFacility = await pool.query(
      'SELECT id, name, latitude, longitude FROM facilities WHERE id = $1',
      [id]
    );

    if (originFacility.rows.length === 0) {
      return res.status(404).json({ error: 'Facility not found' });
    }

    const origin = originFacility.rows[0];

    if (!origin.latitude || !origin.longitude) {
      return res.status(400).json({
        error: 'Origin facility does not have valid coordinates',
      });
    }

    // Query nearby facilities using PostGIS ST_Distance
    let query = `
      SELECT
        id,
        name,
        latitude,
        longitude,
        location,
        status,
        total_zones,
        ST_Distance(
          coordinates,
          ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
        ) / 1000 as distance_km
      FROM facilities
      WHERE
        id != $3
        AND latitude IS NOT NULL
        AND longitude IS NOT NULL
        AND coordinates IS NOT NULL
    `;

    const params: any[] = [origin.longitude, origin.latitude, id];
    let paramIndex = 4;

    if (maxDistance !== null) {
      query += ` AND ST_DWithin(
        coordinates,
        ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
        $${paramIndex} * 1000
      )`;
      params.push(maxDistance);
      paramIndex++;
    }

    query += `
      ORDER BY distance_km ASC
      LIMIT $${paramIndex}
    `;
    params.push(limit);

    const result = await pool.query(query, params);

    // Enrich results with travel time and directions
    const nearbyFacilities = result.rows.map((facility) => ({
      id: facility.id,
      name: facility.name,
      location: facility.location,
      status: facility.status,
      totalZones: facility.total_zones,
      coordinates: {
        latitude: parseFloat(facility.latitude),
        longitude: parseFloat(facility.longitude),
      },
      distance: {
        km: Math.round(facility.distance_km * 100) / 100,
        formatted: formatDistance(facility.distance_km),
      },
      travelTime: {
        minutes: estimateDrivingTime(facility.distance_km),
        formatted: formatDuration(estimateDrivingTime(facility.distance_km)),
      },
      directionsUrl: getDirectionsUrl(
        origin.latitude,
        origin.longitude,
        facility.latitude,
        facility.longitude
      ),
    }));

    const response: any = {
      origin: {
        id: origin.id,
        name: origin.name,
        coordinates: {
          latitude: parseFloat(origin.latitude),
          longitude: parseFloat(origin.longitude),
        },
      },
      nearbyFacilities,
      count: nearbyFacilities.length,
    };

    // Include full distance matrix if requested
    if (includeMatrix) {
      const allFacilities = await pool.query(
        `SELECT id, name, latitude, longitude
         FROM facilities
         WHERE latitude IS NOT NULL AND longitude IS NOT NULL`
      );

      const matrix: any[] = [];

      for (const from of allFacilities.rows) {
        for (const to of allFacilities.rows) {
          if (from.id !== to.id) {
            const distance = haversineDistance(
              from.latitude,
              from.longitude,
              to.latitude,
              to.longitude
            );

            matrix.push({
              from: { id: from.id, name: from.name },
              to: { id: to.id, name: to.name },
              distance: {
                km: distance,
                formatted: formatDistance(distance),
              },
              travelTime: {
                minutes: estimateDrivingTime(distance),
                formatted: formatDuration(estimateDrivingTime(distance)),
              },
            });
          }
        }
      }

      response.distanceMatrix = matrix;
    }

    res.json(response);
  } catch (error) {
    console.error('Error fetching nearby facilities:', error);
    res.status(500).json({ error: 'Failed to fetch nearby facilities' });
  }
});

export default router;
