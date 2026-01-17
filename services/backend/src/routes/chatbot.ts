import express, { Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { pool } from '../config/database.js';
import { logger } from '../observability/logger';

const router = express.Router();

router.use(authenticate);

/**
 * GET /api/v1/chatbot/context
 * Get comprehensive context for RAG chatbot including:
 * - Recent alerts
 * - Battery system status
 * - Recent sensor readings
 * - RUL predictions
 * - System statistics
 */
router.get('/context', async (req: AuthRequest, res: Response) => {
  try {
    const { facilityId, batterySystemId, limit = 10 } = req.query;
    const limitNum = parseInt(limit as string);

    // Fetch recent alerts
    let alertsQuery = `
      SELECT
        id,
        facility_id,
        battery_system_id,
        type,
        severity,
        message,
        status,
        created_at,
        acknowledged_at,
        resolved_at,
        metadata
      FROM alerts
      WHERE 1=1
    `;
    const alertsParams: any[] = [];

    if (facilityId) {
      alertsParams.push(facilityId);
      alertsQuery += ` AND facility_id = $${alertsParams.length}`;
    }
    if (batterySystemId) {
      alertsParams.push(batterySystemId);
      alertsQuery += ` AND battery_system_id = $${alertsParams.length}`;
    }

    alertsParams.push(limitNum);
    alertsQuery += ` ORDER BY created_at DESC LIMIT $${alertsParams.length}`;

    const alertsResult = await pool.query(alertsQuery, alertsParams);

    // Fetch battery systems with latest sensor data
    let batteriesQuery = `
      SELECT
        bs.id,
        bs.name,
        bs.facility_id,
        bs.status,
        bs.capacity_kwh,
        bs.current_soh,
        bs.installation_date,
        f.name as facility_name,
        f.location,
        sr.time as last_reading_time,
        sr.voltage,
        sr.current,
        sr.temperature,
        sr.soc,
        sr.soh,
        sr.power
      FROM battery_systems bs
      LEFT JOIN facilities f ON bs.facility_id = f.id
      LEFT JOIN LATERAL (
        SELECT * FROM sensor_readings
        WHERE battery_system_id = bs.id
        ORDER BY time DESC
        LIMIT 1
      ) sr ON true
      WHERE 1=1
    `;
    const batteriesParams: any[] = [];

    if (facilityId) {
      batteriesParams.push(facilityId);
      batteriesQuery += ` AND bs.facility_id = $${batteriesParams.length}`;
    }
    if (batterySystemId) {
      batteriesParams.push(batterySystemId);
      batteriesQuery += ` AND bs.id = $${batteriesParams.length}`;
    }

    batteriesParams.push(limitNum);
    batteriesQuery += ` ORDER BY bs.id LIMIT $${batteriesParams.length}`;

    const batteriesResult = await pool.query(batteriesQuery, batteriesParams);

    // Fetch recent RUL predictions
    let predictionsQuery = `
      SELECT
        rp.id,
        rp.battery_system_id,
        rp.predicted_rul,
        rp.confidence,
        rp.prediction_date,
        rp.model_version,
        rp.features,
        bs.name as battery_name
      FROM rul_predictions rp
      JOIN battery_systems bs ON rp.battery_system_id = bs.id
      WHERE 1=1
    `;
    const predictionsParams: any[] = [];

    if (facilityId) {
      predictionsParams.push(facilityId);
      predictionsQuery += ` AND bs.facility_id = $${predictionsParams.length}`;
    }
    if (batterySystemId) {
      predictionsParams.push(batterySystemId);
      predictionsQuery += ` AND rp.battery_system_id = $${predictionsParams.length}`;
    }

    predictionsParams.push(limitNum);
    predictionsQuery += ` ORDER BY rp.prediction_date DESC LIMIT $${predictionsParams.length}`;

    const predictionsResult = await pool.query(predictionsQuery, predictionsParams);

    // Calculate system statistics
    const statsQuery = `
      SELECT
        COUNT(DISTINCT bs.id) as total_batteries,
        COUNT(DISTINCT f.id) as total_facilities,
        COUNT(CASE WHEN a.severity = 'critical' AND a.status = 'active' THEN 1 END) as critical_alerts,
        COUNT(CASE WHEN a.severity = 'warning' AND a.status = 'active' THEN 1 END) as warning_alerts,
        COUNT(CASE WHEN a.status = 'active' THEN 1 END) as active_alerts,
        AVG(bs.current_soh) as avg_soh,
        COUNT(CASE WHEN bs.status = 'active' THEN 1 END) as active_batteries
      FROM battery_systems bs
      LEFT JOIN facilities f ON bs.facility_id = f.id
      LEFT JOIN alerts a ON bs.id = a.battery_system_id
    `;

    const statsResult = await pool.query(statsQuery);

    // Prepare context response
    const context = {
      alerts: alertsResult.rows.map(row => ({
        id: row.id,
        facilityId: row.facility_id,
        batterySystemId: row.battery_system_id,
        type: row.type,
        severity: row.severity,
        message: row.message,
        status: row.status,
        createdAt: row.created_at,
        acknowledgedAt: row.acknowledged_at,
        resolvedAt: row.resolved_at,
        metadata: row.metadata,
      })),
      batteries: batteriesResult.rows.map(row => ({
        id: row.id,
        name: row.name,
        facilityId: row.facility_id,
        facilityName: row.facility_name,
        status: row.status,
        capacityKwh: row.capacity_kwh,
        currentSoh: row.current_soh,
        installationDate: row.installation_date,
        location: row.location,
        lastReading: row.last_reading_time ? {
          time: row.last_reading_time,
          voltage: row.voltage,
          current: row.current,
          temperature: row.temperature,
          soc: row.soc,
          soh: row.soh,
          power: row.power,
        } : null,
      })),
      predictions: predictionsResult.rows.map(row => ({
        id: row.id,
        batterySystemId: row.battery_system_id,
        batteryName: row.battery_name,
        predictedRul: row.predicted_rul,
        confidence: row.confidence,
        predictionDate: row.prediction_date,
        modelVersion: row.model_version,
        features: row.features,
      })),
      statistics: {
        totalBatteries: parseInt(statsResult.rows[0]?.total_batteries || '0'),
        totalFacilities: parseInt(statsResult.rows[0]?.total_facilities || '0'),
        criticalAlerts: parseInt(statsResult.rows[0]?.critical_alerts || '0'),
        warningAlerts: parseInt(statsResult.rows[0]?.warning_alerts || '0'),
        activeAlerts: parseInt(statsResult.rows[0]?.active_alerts || '0'),
        averageSoh: parseFloat(statsResult.rows[0]?.avg_soh || '0'),
        activeBatteries: parseInt(statsResult.rows[0]?.active_batteries || '0'),
      },
      timestamp: new Date().toISOString(),
    };

    logger.info('chatbot_context_fetched', {
      alertsCount: context.alerts.length,
      batteriesCount: context.batteries.length,
      predictionsCount: context.predictions.length,
    });

    res.json({ data: context });
  } catch (error) {
    logger.error('chatbot_context_fetch_failed', { error });
    res.status(500).json({ error: 'Failed to fetch chatbot context' });
  }
});

/**
 * POST /api/v1/chatbot/search
 * Search for specific information (alerts, batteries, predictions)
 */
router.post('/search', async (req: AuthRequest, res: Response) => {
  try {
    const { query, type, limit = 5 } = req.body;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'query is required' });
    }

    const limitNum = parseInt(limit as string);
    const searchTerm = `%${query}%`;
    let results: any = {};

    // Search based on type
    if (!type || type === 'alerts') {
      const alertsResult = await pool.query(
        `SELECT
          id, battery_system_id, type, severity, message, status, created_at
        FROM alerts
        WHERE message ILIKE $1 OR type ILIKE $1
        ORDER BY created_at DESC
        LIMIT $2`,
        [searchTerm, limitNum]
      );
      results.alerts = alertsResult.rows;
    }

    if (!type || type === 'batteries') {
      const batteriesResult = await pool.query(
        `SELECT
          bs.id, bs.name, bs.status, bs.current_soh, f.name as facility_name
        FROM battery_systems bs
        LEFT JOIN facilities f ON bs.facility_id = f.id
        WHERE bs.name ILIKE $1 OR f.name ILIKE $1
        LIMIT $2`,
        [searchTerm, limitNum]
      );
      results.batteries = batteriesResult.rows;
    }

    if (!type || type === 'facilities') {
      const facilitiesResult = await pool.query(
        `SELECT
          id, name, location, type, status
        FROM facilities
        WHERE name ILIKE $1 OR location ILIKE $1
        LIMIT $2`,
        [searchTerm, limitNum]
      );
      results.facilities = facilitiesResult.rows;
    }

    logger.info('chatbot_search_completed', { query, type, resultsCount: Object.keys(results).length });

    res.json({ data: results });
  } catch (error) {
    logger.error('chatbot_search_failed', { error });
    res.status(500).json({ error: 'Search failed' });
  }
});

/**
 * GET /api/v1/chatbot/summary
 * Get a quick summary for chatbot initial context
 */
router.get('/summary', async (req: AuthRequest, res: Response) => {
  try {
    const summaryQuery = `
      SELECT
        (SELECT COUNT(*) FROM facilities WHERE status = 'active') as active_facilities,
        (SELECT COUNT(*) FROM battery_systems WHERE status = 'active') as active_batteries,
        (SELECT COUNT(*) FROM alerts WHERE status = 'active' AND severity = 'critical') as critical_alerts,
        (SELECT COUNT(*) FROM alerts WHERE status = 'active' AND severity = 'warning') as warning_alerts,
        (SELECT AVG(current_soh) FROM battery_systems WHERE status = 'active') as avg_battery_health,
        (SELECT COUNT(*) FROM rul_predictions WHERE prediction_date > NOW() - INTERVAL '24 hours') as recent_predictions
    `;

    const result = await pool.query(summaryQuery);
    const summary = result.rows[0];

    res.json({
      data: {
        activeFacilities: parseInt(summary.active_facilities || '0'),
        activeBatteries: parseInt(summary.active_batteries || '0'),
        criticalAlerts: parseInt(summary.critical_alerts || '0'),
        warningAlerts: parseInt(summary.warning_alerts || '0'),
        averageBatteryHealth: parseFloat(summary.avg_battery_health || '0').toFixed(1),
        recentPredictions: parseInt(summary.recent_predictions || '0'),
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('chatbot_summary_failed', { error });
    res.status(500).json({ error: 'Failed to fetch summary' });
  }
});

export default router;
