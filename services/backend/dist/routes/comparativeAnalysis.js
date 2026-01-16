import express from 'express';
import { pool } from '../config/database';
import { authenticate } from '../middleware/auth';
const router = express.Router();
router.use(authenticate);
/**
 * GET /api/v1/comparative-analysis/rul-comparison
 * Compare predicted RUL vs actual lifespan
 */
router.get('/rul-comparison', async (req, res) => {
    try {
        const { facilityId, startDate, endDate, batteryType } = req.query;
        let query = `
      WITH predictions AS (
        SELECT
          p.battery_system_id,
          p.predicted_rul,
          p.prediction_date,
          p.confidence_score,
          bs.battery_type,
          bs.installation_date,
          bs.decommission_date,
          CASE
            WHEN bs.decommission_date IS NOT NULL
            THEN EXTRACT(EPOCH FROM (bs.decommission_date - bs.installation_date)) / 86400
            ELSE NULL
          END as actual_lifespan_days,
          f.name as facility_name,
          z.name as zone_name
        FROM ml_predictions p
        JOIN battery_systems bs ON bs.id = p.battery_system_id
        JOIN zones z ON z.id = bs.zone_id
        JOIN facilities f ON f.id = z.facility_id
        WHERE p.prediction_type = 'rul'
    `;
        const params = [];
        let paramIndex = 1;
        if (facilityId) {
            query += ` AND f.id = $${paramIndex++}`;
            params.push(facilityId);
        }
        if (startDate) {
            query += ` AND p.prediction_date >= $${paramIndex++}::timestamptz`;
            params.push(startDate);
        }
        if (endDate) {
            query += ` AND p.prediction_date <= $${paramIndex++}::timestamptz`;
            params.push(endDate);
        }
        if (batteryType) {
            query += ` AND bs.battery_type = $${paramIndex++}`;
            params.push(batteryType);
        }
        query += `
      )
      SELECT
        battery_system_id as "batterySystemId",
        predicted_rul as "predictedRul",
        actual_lifespan_days as "actualLifespan",
        ABS(predicted_rul - COALESCE(actual_lifespan_days, 0)) as "absoluteError",
        CASE
          WHEN actual_lifespan_days IS NOT NULL
          THEN ABS((predicted_rul - actual_lifespan_days) / NULLIF(actual_lifespan_days, 0) * 100)
          ELSE NULL
        END as "percentageError",
        confidence_score as "confidenceScore",
        battery_type as "batteryType",
        facility_name as "facilityName",
        zone_name as "zoneName",
        prediction_date as "predictionDate",
        decommission_date as "decommissionDate"
      FROM predictions
      ORDER BY prediction_date DESC
    `;
        const result = await pool.query(query, params);
        res.json({
            data: result.rows,
            total: result.rowCount || 0,
        });
    }
    catch (error) {
        console.error('Error fetching RUL comparison:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
/**
 * GET /api/v1/comparative-analysis/anomaly-comparison
 * Compare anomaly predictions vs actual failures
 */
router.get('/anomaly-comparison', async (req, res) => {
    try {
        const { facilityId, startDate, endDate, batteryType } = req.query;
        let query = `
      WITH anomaly_predictions AS (
        SELECT
          p.battery_system_id,
          p.prediction_date,
          p.predicted_value as anomaly_detected,
          p.confidence_score,
          bs.battery_type,
          f.name as facility_name,
          z.name as zone_name
        FROM ml_predictions p
        JOIN battery_systems bs ON bs.id = p.battery_system_id
        JOIN zones z ON z.id = bs.zone_id
        JOIN facilities f ON f.id = z.facility_id
        WHERE p.prediction_type = 'anomaly'
    `;
        const params = [];
        let paramIndex = 1;
        if (facilityId) {
            query += ` AND f.id = $${paramIndex++}`;
            params.push(facilityId);
        }
        if (startDate) {
            query += ` AND p.prediction_date >= $${paramIndex++}::timestamptz`;
            params.push(startDate);
        }
        if (endDate) {
            query += ` AND p.prediction_date <= $${paramIndex++}::timestamptz`;
            params.push(endDate);
        }
        if (batteryType) {
            query += ` AND bs.battery_type = $${paramIndex++}`;
            params.push(batteryType);
        }
        query += `
      ),
      actual_failures AS (
        SELECT
          a.battery_system_id,
          a.created_at as failure_time,
          a.severity,
          a.alert_type
        FROM alerts a
        WHERE a.severity IN ('critical', 'high')
          AND a.status = 'resolved'
      )
      SELECT
        ap.battery_system_id as "batterySystemId",
        ap.prediction_date as "predictionDate",
        ap.anomaly_detected as "anomalyDetected",
        ap.confidence_score as "confidenceScore",
        ap.battery_type as "batteryType",
        ap.facility_name as "facilityName",
        ap.zone_name as "zoneName",
        CASE
          WHEN af.battery_system_id IS NOT NULL THEN true
          ELSE false
        END as "actualFailure",
        af.failure_time as "failureTime",
        af.severity,
        af.alert_type as "alertType",
        CASE
          WHEN ap.anomaly_detected = true AND af.battery_system_id IS NOT NULL THEN 'true_positive'
          WHEN ap.anomaly_detected = true AND af.battery_system_id IS NULL THEN 'false_positive'
          WHEN ap.anomaly_detected = false AND af.battery_system_id IS NOT NULL THEN 'false_negative'
          ELSE 'true_negative'
        END as "predictionType"
      FROM anomaly_predictions ap
      LEFT JOIN actual_failures af
        ON af.battery_system_id = ap.battery_system_id
        AND af.failure_time >= ap.prediction_date
        AND af.failure_time <= ap.prediction_date + INTERVAL '7 days'
      ORDER BY ap.prediction_date DESC
    `;
        const result = await pool.query(query, params);
        res.json({
            data: result.rows,
            total: result.rowCount || 0,
        });
    }
    catch (error) {
        console.error('Error fetching anomaly comparison:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
/**
 * GET /api/v1/comparative-analysis/accuracy-metrics
 * Get accuracy metrics by battery type
 */
router.get('/accuracy-metrics', async (req, res) => {
    try {
        const { facilityId, startDate, endDate } = req.query;
        let query = `
      WITH rul_accuracy AS (
        SELECT
          bs.battery_type,
          COUNT(*) as prediction_count,
          AVG(ABS(p.predicted_rul - EXTRACT(EPOCH FROM (bs.decommission_date - bs.installation_date)) / 86400)) as mae,
          SQRT(AVG(POWER(p.predicted_rul - EXTRACT(EPOCH FROM (bs.decommission_date - bs.installation_date)) / 86400, 2))) as rmse,
          AVG(p.confidence_score) as avg_confidence
        FROM ml_predictions p
        JOIN battery_systems bs ON bs.id = p.battery_system_id
        JOIN zones z ON z.id = bs.zone_id
        JOIN facilities f ON f.id = z.facility_id
        WHERE p.prediction_type = 'rul'
          AND bs.decommission_date IS NOT NULL
    `;
        const params = [];
        let paramIndex = 1;
        if (facilityId) {
            query += ` AND f.id = $${paramIndex++}`;
            params.push(facilityId);
        }
        if (startDate) {
            query += ` AND p.prediction_date >= $${paramIndex++}::timestamptz`;
            params.push(startDate);
        }
        if (endDate) {
            query += ` AND p.prediction_date <= $${paramIndex++}::timestamptz`;
            params.push(endDate);
        }
        query += `
        GROUP BY bs.battery_type
      ),
      anomaly_accuracy AS (
        SELECT
          bs.battery_type,
          COUNT(CASE WHEN p.predicted_value = true AND a.id IS NOT NULL THEN 1 END) as true_positives,
          COUNT(CASE WHEN p.predicted_value = true AND a.id IS NULL THEN 1 END) as false_positives,
          COUNT(CASE WHEN p.predicted_value = false AND a.id IS NOT NULL THEN 1 END) as false_negatives,
          COUNT(CASE WHEN p.predicted_value = false AND a.id IS NULL THEN 1 END) as true_negatives
        FROM ml_predictions p
        JOIN battery_systems bs ON bs.id = p.battery_system_id
        JOIN zones z ON z.id = bs.zone_id
        JOIN facilities f ON f.id = z.facility_id
        LEFT JOIN alerts a
          ON a.battery_system_id = p.battery_system_id
          AND a.created_at >= p.prediction_date
          AND a.created_at <= p.prediction_date + INTERVAL '7 days'
          AND a.severity IN ('critical', 'high')
        WHERE p.prediction_type = 'anomaly'
    `;
        if (facilityId) {
            query += ` AND f.id = $${params.length + 1}`;
            params.push(facilityId);
        }
        if (startDate) {
            query += ` AND p.prediction_date >= $${params.length + 1}::timestamptz`;
            params.push(startDate);
        }
        if (endDate) {
            query += ` AND p.prediction_date <= $${params.length + 1}::timestamptz`;
            params.push(endDate);
        }
        query += `
        GROUP BY bs.battery_type
      )
      SELECT
        COALESCE(ra.battery_type, aa.battery_type) as "batteryType",
        COALESCE(ra.prediction_count, 0) as "rulPredictionCount",
        COALESCE(ra.mae, 0) as "rulMae",
        COALESCE(ra.rmse, 0) as "rulRmse",
        COALESCE(ra.avg_confidence, 0) as "rulAvgConfidence",
        COALESCE(aa.true_positives, 0) as "anomalyTruePositives",
        COALESCE(aa.false_positives, 0) as "anomalyFalsePositives",
        COALESCE(aa.false_negatives, 0) as "anomalyFalseNegatives",
        COALESCE(aa.true_negatives, 0) as "anomalyTrueNegatives",
        CASE
          WHEN (aa.true_positives + aa.false_positives) > 0
          THEN aa.true_positives::float / (aa.true_positives + aa.false_positives)
          ELSE 0
        END as "anomalyPrecision",
        CASE
          WHEN (aa.true_positives + aa.false_negatives) > 0
          THEN aa.true_positives::float / (aa.true_positives + aa.false_negatives)
          ELSE 0
        END as "anomalyRecall",
        CASE
          WHEN (aa.true_positives + aa.true_negatives + aa.false_positives + aa.false_negatives) > 0
          THEN (aa.true_positives + aa.true_negatives)::float / (aa.true_positives + aa.true_negatives + aa.false_positives + aa.false_negatives)
          ELSE 0
        END as "anomalyAccuracy"
      FROM rul_accuracy ra
      FULL OUTER JOIN anomaly_accuracy aa ON ra.battery_type = aa.battery_type
      ORDER BY "batteryType"
    `;
        const result = await pool.query(query, params);
        res.json({
            data: result.rows,
            total: result.rowCount || 0,
        });
    }
    catch (error) {
        console.error('Error fetching accuracy metrics:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
/**
 * GET /api/v1/comparative-analysis/error-distribution
 * Get error distribution for histogram
 */
router.get('/error-distribution', async (req, res) => {
    try {
        const { facilityId, startDate, endDate, batteryType } = req.query;
        let query = `
      SELECT
        ABS(p.predicted_rul - EXTRACT(EPOCH FROM (bs.decommission_date - bs.installation_date)) / 86400) as error_magnitude,
        bs.battery_type as "batteryType",
        p.confidence_score as "confidenceScore",
        f.name as "facilityName"
      FROM ml_predictions p
      JOIN battery_systems bs ON bs.id = p.battery_system_id
      JOIN zones z ON z.id = bs.zone_id
      JOIN facilities f ON f.id = z.facility_id
      WHERE p.prediction_type = 'rul'
        AND bs.decommission_date IS NOT NULL
    `;
        const params = [];
        let paramIndex = 1;
        if (facilityId) {
            query += ` AND f.id = $${paramIndex++}`;
            params.push(facilityId);
        }
        if (startDate) {
            query += ` AND p.prediction_date >= $${paramIndex++}::timestamptz`;
            params.push(startDate);
        }
        if (endDate) {
            query += ` AND p.prediction_date <= $${paramIndex++}::timestamptz`;
            params.push(endDate);
        }
        if (batteryType) {
            query += ` AND bs.battery_type = $${paramIndex++}`;
            params.push(batteryType);
        }
        query += ` ORDER BY error_magnitude`;
        const result = await pool.query(query, params);
        res.json({
            data: result.rows,
            total: result.rowCount || 0,
        });
    }
    catch (error) {
        console.error('Error fetching error distribution:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
/**
 * GET /api/v1/comparative-analysis/root-cause
 * Analyze root causes for poor predictions
 */
router.get('/root-cause', async (req, res) => {
    try {
        const { facilityId, startDate, endDate, errorThreshold = 30 } = req.query;
        let query = `
      WITH poor_predictions AS (
        SELECT
          p.battery_system_id,
          p.predicted_rul,
          EXTRACT(EPOCH FROM (bs.decommission_date - bs.installation_date)) / 86400 as actual_lifespan,
          ABS(p.predicted_rul - EXTRACT(EPOCH FROM (bs.decommission_date - bs.installation_date)) / 86400) as error,
          p.confidence_score,
          bs.battery_type,
          bs.capacity,
          f.name as facility_name,
          z.name as zone_name,
          z.environment_conditions
        FROM ml_predictions p
        JOIN battery_systems bs ON bs.id = p.battery_system_id
        JOIN zones z ON z.id = bs.zone_id
        JOIN facilities f ON f.id = z.facility_id
        WHERE p.prediction_type = 'rul'
          AND bs.decommission_date IS NOT NULL
          AND ABS(p.predicted_rul - EXTRACT(EPOCH FROM (bs.decommission_date - bs.installation_date)) / 86400) > $1
    `;
        const params = [errorThreshold];
        let paramIndex = 2;
        if (facilityId) {
            query += ` AND f.id = $${paramIndex++}`;
            params.push(facilityId);
        }
        if (startDate) {
            query += ` AND p.prediction_date >= $${paramIndex++}::timestamptz`;
            params.push(startDate);
        }
        if (endDate) {
            query += ` AND p.prediction_date <= $${paramIndex++}::timestamptz`;
            params.push(endDate);
        }
        query += `
      )
      SELECT
        battery_type as "batteryType",
        COUNT(*) as "poorPredictionCount",
        AVG(error) as "avgError",
        AVG(confidence_score) as "avgConfidence",
        AVG(capacity) as "avgCapacity",
        ARRAY_AGG(DISTINCT environment_conditions) as "environmentConditions",
        ARRAY_AGG(DISTINCT facility_name) as "facilities",
        CASE
          WHEN AVG(confidence_score) < 0.7 THEN 'Low model confidence'
          WHEN COUNT(DISTINCT environment_conditions) > 2 THEN 'Variable environment conditions'
          WHEN AVG(error) > 50 THEN 'Significant deviation from training data'
          ELSE 'Other factors'
        END as "primaryRootCause"
      FROM poor_predictions
      GROUP BY battery_type
      ORDER BY "poorPredictionCount" DESC
    `;
        const result = await pool.query(query, params);
        res.json({
            data: result.rows,
            total: result.rowCount || 0,
        });
    }
    catch (error) {
        console.error('Error fetching root cause analysis:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
/**
 * GET /api/v1/comparative-analysis/export
 * Export accuracy report as CSV
 */
router.get('/export', async (req, res) => {
    try {
        const { facilityId, startDate, endDate } = req.query;
        // Get all data for export
        const [rulComparison, anomalyComparison, accuracyMetrics, rootCause] = await Promise.all([
            pool.query(`
        SELECT
          bs.id as battery_system_id,
          p.predicted_rul,
          EXTRACT(EPOCH FROM (bs.decommission_date - bs.installation_date)) / 86400 as actual_lifespan,
          ABS(p.predicted_rul - EXTRACT(EPOCH FROM (bs.decommission_date - bs.installation_date)) / 86400) as absolute_error,
          p.confidence_score,
          bs.battery_type,
          f.name as facility_name,
          p.prediction_date
        FROM ml_predictions p
        JOIN battery_systems bs ON bs.id = p.battery_system_id
        JOIN zones z ON z.id = bs.zone_id
        JOIN facilities f ON f.id = z.facility_id
        WHERE p.prediction_type = 'rul'
          AND bs.decommission_date IS NOT NULL
        ${facilityId ? 'AND f.id = $1' : ''}
        ORDER BY p.prediction_date DESC
      `, facilityId ? [facilityId] : []),
            pool.query(`
        SELECT
          bs.battery_type,
          COUNT(*) as total_predictions,
          SUM(CASE WHEN p.predicted_value = true AND a.id IS NOT NULL THEN 1 ELSE 0 END) as true_positives,
          SUM(CASE WHEN p.predicted_value = true AND a.id IS NULL THEN 1 ELSE 0 END) as false_positives,
          SUM(CASE WHEN p.predicted_value = false AND a.id IS NOT NULL THEN 1 ELSE 0 END) as false_negatives
        FROM ml_predictions p
        JOIN battery_systems bs ON bs.id = p.battery_system_id
        LEFT JOIN alerts a
          ON a.battery_system_id = p.battery_system_id
          AND a.created_at >= p.prediction_date
          AND a.created_at <= p.prediction_date + INTERVAL '7 days'
        WHERE p.prediction_type = 'anomaly'
        GROUP BY bs.battery_type
      `, []),
            pool.query(`SELECT * FROM (SELECT 1 as dummy) dummy LIMIT 0`, []),
            pool.query(`SELECT * FROM (SELECT 1 as dummy) dummy LIMIT 0`, [])
        ]);
        // Generate CSV content
        let csvContent = 'Comparative Analysis Report\n\n';
        csvContent += 'RUL Predictions vs Actual Lifespan\n';
        csvContent += 'Battery System ID,Predicted RUL (days),Actual Lifespan (days),Absolute Error (days),Confidence Score,Battery Type,Facility,Prediction Date\n';
        rulComparison.rows.forEach(row => {
            csvContent += `${row.battery_system_id},${row.predicted_rul},${row.actual_lifespan},${row.absolute_error},${row.confidence_score},${row.battery_type},${row.facility_name},${row.prediction_date}\n`;
        });
        csvContent += '\n\nAnomaly Detection Metrics by Battery Type\n';
        csvContent += 'Battery Type,Total Predictions,True Positives,False Positives,False Negatives,Precision,Recall\n';
        anomalyComparison.rows.forEach(row => {
            const precision = row.true_positives / (row.true_positives + row.false_positives) || 0;
            const recall = row.true_positives / (row.true_positives + row.false_negatives) || 0;
            csvContent += `${row.battery_type},${row.total_predictions},${row.true_positives},${row.false_positives},${row.false_negatives},${precision.toFixed(3)},${recall.toFixed(3)}\n`;
        });
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="comparative_analysis_${new Date().toISOString().split('T')[0]}.csv"`);
        res.send(csvContent);
    }
    catch (error) {
        console.error('Error exporting report:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
export default router;
