/**
 * Battery Systems Routes
 * Handles battery system data retrieval with pagination and filtering
 */

import { Router, Response } from 'express';
import type { AuthRequest } from '../middleware/auth.js';
import { pool } from '../config/database.js';
import logger from '../config/logger.js';

const router = Router();

/**
 * GET /api/v1/battery-systems/fleet/summary
 * Get fleet-wide summary statistics
 * NOTE: This must come BEFORE /:id route to avoid "fleet" being treated as an ID
 */
router.get('/fleet/summary', async (req: AuthRequest, res: Response) => {
  try {
    const summaryQuery = `
      WITH battery_stats AS (
        SELECT 
          COUNT(*) as total_batteries,
          COUNT(DISTINCT facility_id) as total_facilities,
          COUNT(DISTINCT zone_id) as total_strings,
          SUM(capacity_kwh) as total_capacity_kwh,
          COUNT(*) FILTER (WHERE status = 'operational') as operational_count,
          COUNT(*) FILTER (WHERE status = 'maintenance') as maintenance_count,
          COUNT(*) FILTER (WHERE status = 'fault') as fault_count
        FROM battery_systems
      ),
      sensor_stats AS (
        SELECT 
          AVG(sr.soc) as avg_soc,
          AVG(sr.soh) as avg_soh,
          COUNT(DISTINCT bs.id) FILTER (
            WHERE sr.soh < 80 OR sr.temperature > 45
          ) as critical_batteries
        FROM battery_systems bs
        LEFT JOIN LATERAL (
          SELECT soc, soh, temperature
          FROM sensor_readings
          WHERE battery_system_id = bs.id
          ORDER BY time DESC
          LIMIT 1
        ) sr ON true
      ),
      facility_stats AS (
        SELECT 
          f.id as facility_id,
          f.name as facility_name,
          COUNT(bs.id) as total_batteries,
          COUNT(*) FILTER (WHERE bs.status = 'operational') as operational_count,
          COUNT(*) FILTER (WHERE bs.status = 'maintenance') as maintenance_count,
          COUNT(*) FILTER (WHERE bs.status = 'fault') as fault_count,
          AVG(sr.soc) as average_soc,
          AVG(sr.soh) as average_soh,
          AVG(sr.temperature) as average_temperature,
          SUM(bs.capacity_kwh) as total_capacity_kwh,
          COUNT(DISTINCT bs.id) FILTER (
            WHERE sr.soh < 80 OR sr.temperature > 45
          ) as critical_batteries
        FROM facilities f
        LEFT JOIN battery_systems bs ON bs.facility_id = f.id
        LEFT JOIN LATERAL (
          SELECT soc, soh, temperature
          FROM sensor_readings
          WHERE battery_system_id = bs.id
          ORDER BY time DESC
          LIMIT 1
        ) sr ON true
        GROUP BY f.id, f.name
      )
      SELECT 
        bs.total_batteries,
        bs.total_facilities,
        bs.total_strings,
        bs.total_capacity_kwh,
        bs.operational_count,
        bs.maintenance_count,
        bs.fault_count,
        ss.critical_batteries,
        COALESCE(ss.avg_soc, 0) as average_soc,
        COALESCE(ss.avg_soh, 0) as average_soh,
        (
          SELECT json_agg(
            json_build_object(
              'facilityId', facility_id,
              'facilityName', facility_name,
              'totalBatteries', total_batteries,
              'operationalCount', operational_count,
              'maintenanceCount', maintenance_count,
              'faultCount', fault_count,
              'averageSoC', COALESCE(average_soc, 0),
              'averageSoH', COALESCE(average_soh, 0),
              'averageTemperature', COALESCE(average_temperature, 0),
              'totalCapacityKwh', COALESCE(total_capacity_kwh, 0),
              'criticalBatteries', critical_batteries
            )
          )
          FROM facility_stats
        ) as facilities
      FROM battery_stats bs
      CROSS JOIN sensor_stats ss
    `;

    const result = await pool.query(summaryQuery);

    if (result.rows.length === 0) {
      return res.json({
        data: {
          totalBatteries: 0,
          totalFacilities: 0,
          totalStrings: 0,
          totalCapacityKwh: 0,
          operationalCount: 0,
          maintenanceCount: 0,
          faultCount: 0,
          criticalBatteries: 0,
          averageSoC: 0,
          averageSoH: 0,
          facilities: [],
        },
      });
    }

    const data = result.rows[0];
    res.json({
      data: {
        totalBatteries: parseInt(data.total_batteries) || 0,
        totalFacilities: parseInt(data.total_facilities) || 0,
        totalStrings: parseInt(data.total_strings) || 0,
        totalCapacityKwh: parseFloat(data.total_capacity_kwh) || 0,
        operationalCount: parseInt(data.operational_count) || 0,
        maintenanceCount: parseInt(data.maintenance_count) || 0,
        faultCount: parseInt(data.fault_count) || 0,
        criticalBatteries: parseInt(data.critical_batteries) || 0,
        averageSoC: parseFloat(data.average_soc) || 0,
        averageSoH: parseFloat(data.average_soh) || 0,
        facilities: data.facilities || [],
      },
    });
  } catch (error) {
    logger.error('fleet_summary_error', { error });
    res.status(500).json({ error: 'Failed to fetch fleet summary' });
  }
});

/**
 * GET /api/v1/battery-systems/facility/:facilityId/stats
 * Get statistics for a specific facility
 * NOTE: This must come BEFORE /:id route
 */
router.get('/facility/:facilityId/stats', async (req: AuthRequest, res: Response) => {
  try {
    const { facilityId } = req.params;

    const query = `
      SELECT 
        f.id as facility_id,
        f.name as facility_name,
        COUNT(bs.id) as total_batteries,
        COUNT(*) FILTER (WHERE bs.status = 'operational') as operational_count,
        COUNT(*) FILTER (WHERE bs.status = 'maintenance') as maintenance_count,
        COUNT(*) FILTER (WHERE bs.status = 'fault') as fault_count,
        AVG(sr.soc) as average_soc,
        AVG(sr.soh) as average_soh,
        AVG(sr.temperature) as average_temperature,
        SUM(bs.capacity_kwh) as total_capacity_kwh,
        COUNT(DISTINCT bs.id) FILTER (
          WHERE sr.soh < 80 OR sr.temperature > 45
        ) as critical_batteries
      FROM facilities f
      LEFT JOIN battery_systems bs ON bs.facility_id = f.id
      LEFT JOIN LATERAL (
        SELECT soc, soh, temperature
        FROM sensor_readings
        WHERE battery_system_id = bs.id
        ORDER BY time DESC
        LIMIT 1
      ) sr ON true
      WHERE f.id = $1
      GROUP BY f.id, f.name
    `;

    const result = await pool.query(query, [facilityId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Facility not found' });
    }

    const data = result.rows[0];
    res.json({
      data: {
        facilityId: data.facility_id,
        facilityName: data.facility_name,
        totalBatteries: parseInt(data.total_batteries) || 0,
        operationalCount: parseInt(data.operational_count) || 0,
        maintenanceCount: parseInt(data.maintenance_count) || 0,
        faultCount: parseInt(data.fault_count) || 0,
        averageSoC: parseFloat(data.average_soc) || 0,
        averageSoH: parseFloat(data.average_soh) || 0,
        averageTemperature: parseFloat(data.average_temperature) || 0,
        totalCapacityKwh: parseFloat(data.total_capacity_kwh) || 0,
        criticalBatteries: parseInt(data.critical_batteries) || 0,
      },
    });
  } catch (error) {
    logger.error('facility_stats_error', { error, facilityId: req.params.facilityId });
    res.status(500).json({ error: 'Failed to fetch facility stats' });
  }
});

/**
 * GET /api/v1/battery-systems/search
 * Search batteries by serial number or model
 * NOTE: This must come BEFORE /:id route
 */
router.get('/search', async (req: AuthRequest, res: Response) => {
  try {
    const query = req.query.q as string;
    const limit = parseInt(req.query.limit as string) || 20;

    if (!query) {
      return res.status(400).json({ error: 'Query parameter "q" is required' });
    }

    const searchQuery = `
      SELECT 
        bs.id,
        bs.serial_number,
        bs.model,
        bs.manufacturer,
        bs.capacity_kwh,
        bs.status,
        bs.zone_id,
        bs.facility_id,
        bs.installation_date,
        z.name as zone_name,
        f.name as facility_name
      FROM battery_systems bs
      LEFT JOIN zones z ON z.id = bs.zone_id
      LEFT JOIN facilities f ON f.id = bs.facility_id
      WHERE 
        bs.serial_number ILIKE $1 
        OR bs.model ILIKE $1
        OR bs.manufacturer ILIKE $1
      ORDER BY bs.serial_number
      LIMIT $2
    `;

    const result = await pool.query(searchQuery, [`%${query}%`, limit]);

    res.json({ data: result.rows });
  } catch (error) {
    logger.error('battery_search_error', { error, query: req.query.q });
    res.status(500).json({ error: 'Failed to search batteries' });
  }
});

/**
 * GET /api/v1/battery-systems
 * Get paginated list of battery systems with optional filtering
 */
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    const facilityId = req.query.facilityId as string;
    const zoneId = req.query.zoneId as string;
    const status = req.query.status as string;
    const sortBy = (req.query.sortBy as string) || 'id';
    const sortOrder = (req.query.sortOrder as string) || 'asc';

    const offset = (page - 1) * pageSize;

    // Build WHERE clause
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (facilityId) {
      conditions.push(`bs.facility_id = $${paramIndex++}`);
      params.push(facilityId);
    }

    if (zoneId) {
      conditions.push(`bs.zone_id = $${paramIndex++}`);
      params.push(zoneId);
    }

    if (status) {
      conditions.push(`bs.status = $${paramIndex++}`);
      params.push(status);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get total count
    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM battery_systems bs ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].total);

    // Get paginated data with latest metrics
    const query = `
      SELECT 
        bs.id,
        bs.serial_number,
        bs.model,
        bs.manufacturer,
        bs.capacity_kwh,
        bs.status,
        bs.zone_id,
        bs.facility_id,
        bs.installation_date,
        bs.last_maintenance_date,
        bs.position_x,
        bs.position_y,
        bs.position_z,
        bs.rotation_pitch,
        bs.rotation_yaw,
        bs.rotation_roll,
        bs.width_m,
        bs.height_m,
        bs.depth_m,
        bs.display_color,
        z.name as zone_name,
        f.name as facility_name,
        sr.voltage,
        sr.current,
        sr.temperature,
        sr.soc,
        sr.soh,
        sr.power,
        sr.time as last_reading_time,
        p.rul_days,
        p.confidence as rul_confidence,
        p.prediction_date as rul_prediction_time
      FROM battery_systems bs
      LEFT JOIN zones z ON z.id = bs.zone_id
      LEFT JOIN facilities f ON f.id = bs.facility_id
      LEFT JOIN LATERAL (
        SELECT voltage, current, temperature, soc, soh, power, time
        FROM sensor_readings
        WHERE battery_system_id = bs.id
        ORDER BY time DESC
        LIMIT 1
      ) sr ON true
      LEFT JOIN LATERAL (
        SELECT rul_days, confidence, prediction_date
        FROM rul_predictions
        WHERE battery_system_id = bs.id
        ORDER BY prediction_date DESC
        LIMIT 1
      ) p ON true
      ${whereClause}
      ORDER BY ${sortBy} ${sortOrder}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    params.push(pageSize, offset);

    const result = await pool.query(query, params);

    const totalPages = Math.ceil(total / pageSize);

    res.json({
      data: result.rows,
      total,
      page,
      pageSize,
      totalPages,
    });
  } catch (error) {
    logger.error('battery_systems_list_error', { error });
    res.status(500).json({ error: 'Failed to fetch battery systems' });
  }
});

/**
 * GET /api/v1/battery-systems/:id
 * Get single battery system by ID with latest metrics
 */
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT 
        bs.id,
        bs.serial_number,
        bs.model,
        bs.manufacturer,
        bs.capacity_kwh,
        bs.status,
        bs.zone_id,
        bs.facility_id,
        bs.installation_date,
        bs.last_maintenance_date,
        bs.position_x,
        bs.position_y,
        bs.position_z,
        bs.rotation_pitch,
        bs.rotation_yaw,
        bs.rotation_roll,
        bs.width_m,
        bs.height_m,
        bs.depth_m,
        bs.display_color,
        z.name as zone_name,
        f.name as facility_name,
        sr.voltage,
        sr.current,
        sr.temperature,
        sr.soc,
        sr.soh,
        sr.power,
        sr.time as last_reading_time,
        p.rul_days,
        p.confidence as rul_confidence,
        p.prediction_date as rul_prediction_time
      FROM battery_systems bs
      LEFT JOIN zones z ON z.id = bs.zone_id
      LEFT JOIN facilities f ON f.id = bs.facility_id
      LEFT JOIN LATERAL (
        SELECT voltage, current, temperature, soc, soh, power, time
        FROM sensor_readings
        WHERE battery_system_id = bs.id
        ORDER BY time DESC
        LIMIT 1
      ) sr ON true
      LEFT JOIN LATERAL (
        SELECT rul_days, confidence, prediction_date
        FROM rul_predictions
        WHERE battery_system_id = bs.id
        ORDER BY prediction_date DESC
        LIMIT 1
      ) p ON true
      WHERE bs.id = $1
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Battery system not found' });
    }

    res.json({ data: result.rows[0] });
  } catch (error) {
    logger.error('battery_system_get_error', { error, id: req.params.id });
    res.status(500).json({ error: 'Failed to fetch battery system' });
  }
});

export default router;
