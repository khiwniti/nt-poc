import express, { Response } from 'express';
import { pool } from '../config/database.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { facilityHealthService } from '../services/facilityHealthService.js';
import { alertRealtimeService } from '../services/alertRealtimeService.js';
import { geocodingService } from '../services/geocodingService.js';

const router = express.Router();

router.use(authenticate);

// GET /map - Optimized endpoint for map view with health status
router.get('/map', async (req: AuthRequest, res: Response) => {
  try {
    // Fetch all facilities (exclude inactive by default for map)
    const facilitiesResult = await pool.query(`
      SELECT id, name, location, latitude, longitude, status, timezone, total_zones as "totalZones"
      FROM facilities
      ORDER BY name ASC
    `);

    const facilities = facilitiesResult.rows;

    // Get recent alerts from alertRealtimeService cache
    const recentAlerts = alertRealtimeService.getRecentAlerts();

    // Calculate health for all facilities
    const healthMap = facilityHealthService.calculateBulkHealth(facilities, recentAlerts);

    // Combine facility data with health status
    const mapData = facilities.map((facility: any) => ({
      ...facility,
      health: healthMap.get(facility.id)
    }));

    res.json({
      data: mapData,
      total: mapData.length
    });
  } catch (error) {
    console.error('Failed to fetch map data:', error);
    res.status(500).json({ error: 'Failed to fetch map data' });
  }
});


router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT id, name, location, latitude, longitude, address, city, country, 
             timezone, total_zones, status, created_at, updated_at
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
      `SELECT id, name, location, latitude, longitude, address, city, country,
              timezone, total_zones as "totalZones", status, created_at, updated_at
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

// Geocode an address
router.post('/geocode', async (req: AuthRequest, res: Response) => {
  try {
    const { address } = req.body;
    
    if (!address) {
      return res.status(400).json({ error: 'Address is required' });
    }

    const result = await geocodingService.geocode(address);
    
    if (!result) {
      return res.status(404).json({ error: 'Address not found' });
    }

    res.json({ data: result });
  } catch (error) {
    console.error('Error geocoding address:', error);
    res.status(500).json({ error: 'Failed to geocode address' });
  }
});

// Reverse geocode coordinates
router.post('/reverse-geocode', async (req: AuthRequest, res: Response) => {
  try {
    const { latitude, longitude } = req.body;
    
    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({ error: 'Latitude and longitude are required' });
    }

    const result = await geocodingService.reverseGeocode(latitude, longitude);
    
    if (!result) {
      return res.status(404).json({ error: 'Location not found' });
    }

    res.json({ data: result });
  } catch (error) {
    console.error('Error reverse geocoding:', error);
    res.status(500).json({ error: 'Failed to reverse geocode coordinates' });
  }
});

// Update facility with geolocation data
router.patch('/:id/geolocation', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { latitude, longitude, address, city, country } = req.body;

    // Validate at least one field is provided
    if (!latitude && !longitude && !address && !city && !country) {
      return res.status(400).json({ error: 'At least one geolocation field is required' });
    }

    // Build dynamic update query
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (latitude !== undefined) {
      updates.push(`latitude = $${paramIndex++}`);
      values.push(latitude);
    }
    if (longitude !== undefined) {
      updates.push(`longitude = $${paramIndex++}`);
      values.push(longitude);
    }
    if (address !== undefined) {
      updates.push(`address = $${paramIndex++}`);
      values.push(address);
    }
    if (city !== undefined) {
      updates.push(`city = $${paramIndex++}`);
      values.push(city);
    }
    if (country !== undefined) {
      updates.push(`country = $${paramIndex++}`);
      values.push(country);
    }
    
    updates.push(`updated_at = $${paramIndex++}`);
    values.push(new Date());
    values.push(id);

    const query = `
      UPDATE facilities 
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, name, location, timezone, total_zones as "totalZones", status,
                latitude, longitude, address, city, country,
                created_at, updated_at
    `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Facility not found' });
    }

    res.json({ data: result.rows[0] });
  } catch (error) {
    console.error('Error updating facility geolocation:', error);
    res.status(500).json({ error: 'Failed to update facility geolocation' });
  }
});

export default router;
