import express, { Response } from 'express';
import { pool } from '../config/database.js';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = express.Router();

router.use(authenticate);

/**
 * GET /api/v1/battery-health/facility/:facilityId/summary
 * Get facility-wide health score summary
 */
router.get('/facility/:facilityId/summary', async (req: AuthRequest, res: Response) => {
  try {
    const { facilityId } = req.params;

    // Get latest SOH for all batteries in facility (health score is based on SOH)
    const result = await pool.query(`
      WITH latest_readings AS (
        SELECT DISTINCT ON (bs.id)
          bs.id,
          bs.name,
          bs.zone,
          sr.soh as health_score,
          sr.time
        FROM battery_systems bs
        LEFT JOIN sensor_readings sr ON bs.id = sr.battery_system_id
        WHERE bs.facility_id = $1
          AND bs.status != 'offline'
          AND sr.soh IS NOT NULL
        ORDER BY bs.id, sr.time DESC
      )
      SELECT
        COUNT(*) as total_batteries,
        ROUND(AVG(health_score)::numeric, 2) as avg_health_score,
        COUNT(*) FILTER (WHERE health_score < 70) as at_risk_count,
        COUNT(*) FILTER (WHERE health_score >= 90) as healthy_count,
        COUNT(*) FILTER (WHERE health_score >= 70 AND health_score < 90) as warning_count
      FROM latest_readings
    `, [facilityId]);

    if (!result.rows[0] || result.rows[0].total_batteries === '0') {
      return res.json({
        totalBatteries: 0,
        avgHealthScore: null,
        atRiskCount: 0,
        healthyCount: 0,
        warningCount: 0
      });
    }

    const summary = result.rows[0];
    res.json({
      totalBatteries: parseInt(summary.total_batteries),
      avgHealthScore: parseFloat(summary.avg_health_score),
      atRiskCount: parseInt(summary.at_risk_count),
      healthyCount: parseInt(summary.healthy_count),
      warningCount: parseInt(summary.warning_count)
    });
  } catch (error) {
    console.error('Error fetching health summary:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/v1/battery-health/facility/:facilityId/distribution
 * Get health score distribution histogram data
 */
router.get('/facility/:facilityId/distribution', async (req: AuthRequest, res: Response) => {
  try {
    const { facilityId } = req.params;

    const result = await pool.query(`
      WITH latest_readings AS (
        SELECT DISTINCT ON (bs.id)
          bs.id,
          sr.soh as health_score
        FROM battery_systems bs
        LEFT JOIN sensor_readings sr ON bs.id = sr.battery_system_id
        WHERE bs.facility_id = $1
          AND bs.status != 'offline'
          AND sr.soh IS NOT NULL
        ORDER BY bs.id, sr.time DESC
      ),
      score_buckets AS (
        SELECT
          CASE
            WHEN health_score >= 90 THEN '90-100'
            WHEN health_score >= 80 THEN '80-89'
            WHEN health_score >= 70 THEN '70-79'
            WHEN health_score >= 60 THEN '60-69'
            WHEN health_score >= 50 THEN '50-59'
            ELSE '<50'
          END as bucket,
          CASE
            WHEN health_score >= 90 THEN 95
            WHEN health_score >= 80 THEN 85
            WHEN health_score >= 70 THEN 75
            WHEN health_score >= 60 THEN 65
            WHEN health_score >= 50 THEN 55
            ELSE 45
          END as bucket_midpoint
        FROM latest_readings
      )
      SELECT
        bucket,
        bucket_midpoint,
        COUNT(*) as count
      FROM score_buckets
      GROUP BY bucket, bucket_midpoint
      ORDER BY bucket_midpoint DESC
    `, [facilityId]);

    res.json({ data: result.rows });
  } catch (error) {
    console.error('Error fetching health distribution:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/v1/battery-health/facility/:facilityId/at-risk
 * Get list of batteries with health score < 70
 */
router.get('/facility/:facilityId/at-risk', async (req: AuthRequest, res: Response) => {
  try {
    const { facilityId } = req.params;
    const threshold = parseInt(req.query.threshold as string) || 70;

    const result = await pool.query(`
      WITH latest_readings AS (
        SELECT DISTINCT ON (bs.id)
          bs.id,
          bs.name,
          bs.zone,
          bs.capacity_kwh,
          sr.soh as health_score,
          sr.time as last_reading
        FROM battery_systems bs
        LEFT JOIN sensor_readings sr ON bs.id = sr.battery_system_id
        WHERE bs.facility_id = $1
          AND bs.status != 'offline'
          AND sr.soh IS NOT NULL
        ORDER BY bs.id, sr.time DESC
      )
      SELECT
        id,
        name,
        zone,
        capacity_kwh,
        ROUND(health_score::numeric, 2) as health_score,
        last_reading
      FROM latest_readings
      WHERE health_score < $2
      ORDER BY health_score ASC, name ASC
    `, [facilityId, threshold]);

    res.json({
      data: result.rows,
      total: result.rowCount || 0,
      threshold
    });
  } catch (error) {
    console.error('Error fetching at-risk batteries:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/v1/battery-health/facility/:facilityId/trend
 * Get 30-day rolling average health score trend
 */
router.get('/facility/:facilityId/trend', async (req: AuthRequest, res: Response) => {
  try {
    const { facilityId } = req.params;
    const days = parseInt(req.query.days as string) || 30;

    const result = await pool.query(`
      WITH daily_scores AS (
        SELECT
          DATE(sr.time) as date,
          AVG(sr.soh) as avg_score
        FROM sensor_readings sr
        INNER JOIN battery_systems bs ON sr.battery_system_id = bs.id
        WHERE bs.facility_id = $1
          AND sr.time >= NOW() - INTERVAL '${days} days'
          AND sr.soh IS NOT NULL
        GROUP BY DATE(sr.time)
        ORDER BY DATE(sr.time)
      )
      SELECT
        date,
        ROUND(avg_score::numeric, 2) as avg_health_score
      FROM daily_scores
      ORDER BY date ASC
    `, [facilityId]);

    res.json({ data: result.rows });
  } catch (error) {
    console.error('Error fetching health trend:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/v1/battery-health/facility/:facilityId/by-zone
 * Get zone-level health aggregation
 */
router.get('/facility/:facilityId/by-zone', async (req: AuthRequest, res: Response) => {
  try {
    const { facilityId } = req.params;

    const result = await pool.query(`
      WITH latest_readings AS (
        SELECT DISTINCT ON (bs.id)
          bs.id,
          bs.zone,
          sr.soh as health_score
        FROM battery_systems bs
        LEFT JOIN sensor_readings sr ON bs.id = sr.battery_system_id
        WHERE bs.facility_id = $1
          AND bs.status != 'offline'
          AND sr.soh IS NOT NULL
        ORDER BY bs.id, sr.time DESC
      )
      SELECT
        zone,
        COUNT(*) as battery_count,
        ROUND(AVG(health_score)::numeric, 2) as avg_health_score,
        ROUND(MIN(health_score)::numeric, 2) as min_health_score,
        ROUND(MAX(health_score)::numeric, 2) as max_health_score,
        COUNT(*) FILTER (WHERE health_score < 70) as at_risk_count
      FROM latest_readings
      WHERE zone IS NOT NULL
      GROUP BY zone
      ORDER BY avg_health_score ASC
    `, [facilityId]);

    res.json({
      data: result.rows,
      total: result.rowCount || 0
    });
  } catch (error) {
    console.error('Error fetching zone health:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/v1/battery-health/facility/:facilityId/export
 * Export health report as CSV
 */
router.get('/facility/:facilityId/export', async (req: AuthRequest, res: Response) => {
  try {
    const { facilityId } = req.params;

    const result = await pool.query(`
      WITH latest_readings AS (
        SELECT DISTINCT ON (bs.id)
          bs.id,
          bs.name,
          bs.zone,
          bs.capacity_kwh,
          bs.status,
          sr.soh as health_score,
          sr.soc,
          sr.temperature,
          sr.voltage,
          sr.time as last_reading
        FROM battery_systems bs
        LEFT JOIN sensor_readings sr ON bs.id = sr.battery_system_id
        WHERE bs.facility_id = $1
        ORDER BY bs.id, sr.time DESC
      ),
      facility_info AS (
        SELECT name, location FROM facilities WHERE id = $1
      )
      SELECT
        lr.id as "Battery ID",
        lr.name as "Battery Name",
        lr.zone as "Zone",
        lr.capacity_kwh as "Capacity (kWh)",
        lr.status as "Status",
        COALESCE(ROUND(lr.health_score::numeric, 2), 0) as "Health Score",
        COALESCE(ROUND(lr.soc::numeric, 2), 0) as "SOC (%)",
        COALESCE(ROUND(lr.temperature::numeric, 2), 0) as "Temperature (°C)",
        COALESCE(ROUND(lr.voltage::numeric, 2), 0) as "Voltage (V)",
        COALESCE(lr.last_reading::text, 'N/A') as "Last Reading",
        fi.name as "Facility",
        fi.location as "Location"
      FROM latest_readings lr
      CROSS JOIN facility_info fi
      ORDER BY lr.zone, lr.name
    `, [facilityId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No data found for export' });
    }

    // Convert to CSV
    const headers = Object.keys(result.rows[0]);
    const csv = [
      headers.join(','),
      ...result.rows.map(row =>
        headers.map(h => {
          const val = row[h];
          const strVal = val === null || val === undefined ? '' : String(val);
          // Escape quotes and wrap in quotes if contains comma
          return strVal.includes(',') ? `"${strVal.replace(/"/g, '""')}"` : strVal;
        }).join(',')
      )
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="battery-health-report-${facilityId}-${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csv);
  } catch (error) {
    console.error('Error exporting health report:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
