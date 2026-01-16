import express from 'express';
import { pool } from '../config/database';
import { authenticate } from '../middleware/auth';
import { ModelPerformanceService } from '../services/modelPerformance';
const router = express.Router();
router.use(authenticate);
/**
 * GET /api/v1/model-performance/metrics
 * Get aggregated performance metrics
 */
router.get('/metrics', async (req, res) => {
    try {
        const { batterySystemId, startTime, endTime, modelVersion = 'v1.0', aggregationPeriod = 'daily' } = req.query;
        if (!batterySystemId || !startTime || !endTime) {
            return res.status(400).json({
                error: 'batterySystemId, startTime, and endTime parameters are required'
            });
        }
        const start = new Date(startTime);
        const end = new Date(endTime);
        // Fetch from database if already calculated
        const existingResult = await pool.query(`SELECT
        metric_time,
        mae_soc, mae_soh, mae_temperature, mae_power,
        rmse_soc, rmse_soh, rmse_temperature, rmse_power,
        r2_soc, r2_soh, r2_temperature, r2_power,
        prediction_count, missing_actual_count, outlier_count
       FROM model_performance_metrics
       WHERE battery_system_id = $1
         AND model_version = $2
         AND metric_time >= $3
         AND metric_time <= $4
         AND aggregation_period = $5
       ORDER BY metric_time DESC`, [batterySystemId, modelVersion, start, end, aggregationPeriod]);
        if (existingResult.rows.length > 0) {
            return res.json({
                data: existingResult.rows,
                source: 'cached'
            });
        }
        // Calculate metrics if not in database
        const metrics = await ModelPerformanceService.calculatePerformanceMetrics(batterySystemId, start, end, modelVersion, aggregationPeriod);
        // Store calculated metrics
        await pool.query(`INSERT INTO model_performance_metrics
        (battery_system_id, metric_time, model_version, aggregation_period,
         mae_soc, mae_soh, mae_temperature, mae_power,
         rmse_soc, rmse_soh, rmse_temperature, rmse_power,
         r2_soc, r2_soh, r2_temperature, r2_power,
         prediction_count, missing_actual_count)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)`, [
            batterySystemId,
            end,
            modelVersion,
            aggregationPeriod,
            metrics.mae.soc,
            metrics.mae.soh,
            metrics.mae.temperature,
            metrics.mae.power,
            metrics.rmse.soc,
            metrics.rmse.soh,
            metrics.rmse.temperature,
            metrics.rmse.power,
            metrics.r2.soc,
            metrics.r2.soh,
            metrics.r2.temperature,
            metrics.r2.power,
            metrics.predictionCount,
            metrics.missingActualCount
        ]);
        res.json({
            data: [{ metric_time: end, ...metrics }],
            source: 'calculated'
        });
    }
    catch (error) {
        console.error('Error fetching performance metrics:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
/**
 * GET /api/v1/model-performance/drift
 * Get drift detection results
 */
router.get('/drift', async (req, res) => {
    try {
        const { batterySystemId, baselineStart, baselineEnd, comparisonStart, comparisonEnd, modelVersion = 'v1.0', threshold = '0.2' } = req.query;
        if (!batterySystemId || !baselineStart || !baselineEnd || !comparisonStart || !comparisonEnd) {
            return res.status(400).json({
                error: 'batterySystemId, baselineStart, baselineEnd, comparisonStart, and comparisonEnd are required'
            });
        }
        const driftResult = await ModelPerformanceService.detectDrift(batterySystemId, new Date(baselineStart), new Date(baselineEnd), new Date(comparisonStart), new Date(comparisonEnd), modelVersion, parseFloat(threshold));
        // Store drift metrics
        await pool.query(`INSERT INTO model_drift_metrics
        (battery_system_id, metric_time, model_version,
         voltage_drift_score, current_drift_score, temperature_drift_score, soc_drift_score,
         overall_drift_score, drift_detected,
         baseline_start, baseline_end, comparison_start, comparison_end)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`, [
            batterySystemId,
            new Date(),
            modelVersion,
            driftResult.driftScores.voltage,
            driftResult.driftScores.current,
            driftResult.driftScores.temperature,
            driftResult.driftScores.soc,
            driftResult.overallDriftScore,
            driftResult.driftDetected,
            baselineStart,
            baselineEnd,
            comparisonStart,
            comparisonEnd
        ]);
        res.json({ data: driftResult });
    }
    catch (error) {
        console.error('Error detecting drift:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
/**
 * GET /api/v1/model-performance/data-quality
 * Get data quality metrics
 */
router.get('/data-quality', async (req, res) => {
    try {
        const { batterySystemId, startTime, endTime, aggregationPeriod = 'daily' } = req.query;
        if (!batterySystemId || !startTime || !endTime) {
            return res.status(400).json({
                error: 'batterySystemId, startTime, and endTime parameters are required'
            });
        }
        const start = new Date(startTime);
        const end = new Date(endTime);
        // Check for existing data
        const existingResult = await pool.query(`SELECT
        metric_time,
        missing_voltage_count, missing_current_count, missing_temperature_count,
        missing_soc_count, missing_soh_count, total_records,
        voltage_outlier_count, current_outlier_count, temperature_outlier_count, soc_outlier_count,
        voltage_range_violations, current_range_violations, temperature_range_violations, soc_range_violations,
        max_time_gap_seconds
       FROM data_quality_metrics
       WHERE battery_system_id = $1
         AND metric_time >= $2
         AND metric_time <= $3
         AND aggregation_period = $4
       ORDER BY metric_time DESC`, [batterySystemId, start, end, aggregationPeriod]);
        if (existingResult.rows.length > 0) {
            return res.json({
                data: existingResult.rows,
                source: 'cached'
            });
        }
        const qualityMetrics = await ModelPerformanceService.calculateDataQualityMetrics(batterySystemId, start, end, aggregationPeriod);
        // Store metrics
        await pool.query(`INSERT INTO data_quality_metrics
        (battery_system_id, metric_time, aggregation_period,
         missing_voltage_count, missing_current_count, missing_temperature_count,
         missing_soc_count, missing_soh_count, total_records,
         voltage_outlier_count, current_outlier_count, temperature_outlier_count, soc_outlier_count,
         voltage_range_violations, current_range_violations, temperature_range_violations, soc_range_violations,
         max_time_gap_seconds)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)`, [
            batterySystemId,
            end,
            aggregationPeriod,
            qualityMetrics.missingCounts.voltage,
            qualityMetrics.missingCounts.current,
            qualityMetrics.missingCounts.temperature,
            qualityMetrics.missingCounts.soc,
            qualityMetrics.missingCounts.soh,
            qualityMetrics.totalRecords,
            qualityMetrics.outlierCounts.voltage,
            qualityMetrics.outlierCounts.current,
            qualityMetrics.outlierCounts.temperature,
            qualityMetrics.outlierCounts.soc,
            qualityMetrics.rangeViolations.voltage,
            qualityMetrics.rangeViolations.current,
            qualityMetrics.rangeViolations.temperature,
            qualityMetrics.rangeViolations.soc,
            qualityMetrics.maxTimeGapSeconds
        ]);
        res.json({
            data: [{ metric_time: end, ...qualityMetrics }],
            source: 'calculated'
        });
    }
    catch (error) {
        console.error('Error calculating data quality metrics:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
/**
 * GET /api/v1/model-performance/health-score
 * Get overall model health score
 */
router.get('/health-score', async (req, res) => {
    try {
        const { batterySystemId, startTime, endTime, modelVersion = 'v1.0' } = req.query;
        if (!batterySystemId || !startTime || !endTime) {
            return res.status(400).json({
                error: 'batterySystemId, startTime, and endTime parameters are required'
            });
        }
        const start = new Date(startTime);
        const end = new Date(endTime);
        // Check for recent health score
        const existingResult = await pool.query(`SELECT
        score_time, accuracy_score, drift_score, data_quality_score,
        overall_health_score, health_status
       FROM model_health_scores
       WHERE battery_system_id = $1
         AND model_version = $2
         AND score_time >= $3
       ORDER BY score_time DESC
       LIMIT 1`, [batterySystemId, modelVersion, start]);
        if (existingResult.rows.length > 0) {
            return res.json({
                data: existingResult.rows[0],
                source: 'cached'
            });
        }
        // Calculate all required metrics
        const accuracyMetrics = await ModelPerformanceService.calculatePerformanceMetrics(batterySystemId, start, end, modelVersion, 'daily');
        const driftResult = await ModelPerformanceService.detectDrift(batterySystemId, new Date(start.getTime() - 7 * 24 * 60 * 60 * 1000), // 1 week before
        start, start, end, modelVersion);
        const dataQuality = await ModelPerformanceService.calculateDataQualityMetrics(batterySystemId, start, end, 'daily');
        const healthScore = ModelPerformanceService.calculateHealthScore(accuracyMetrics, driftResult.overallDriftScore, dataQuality);
        // Store health score
        await pool.query(`INSERT INTO model_health_scores
        (battery_system_id, score_time, model_version,
         accuracy_score, drift_score, data_quality_score,
         overall_health_score, health_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`, [
            batterySystemId,
            end,
            modelVersion,
            healthScore.accuracyScore,
            healthScore.driftScore,
            healthScore.dataQualityScore,
            healthScore.overallHealthScore,
            healthScore.healthStatus
        ]);
        // Check and create alerts
        await ModelPerformanceService.checkAndCreateAlerts(batterySystemId, modelVersion, healthScore, accuracyMetrics, driftResult.driftDetected, driftResult.overallDriftScore);
        res.json({
            data: { score_time: end, ...healthScore },
            source: 'calculated'
        });
    }
    catch (error) {
        console.error('Error calculating health score:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
/**
 * GET /api/v1/model-performance/alerts
 * Get model health alerts
 */
router.get('/alerts', async (req, res) => {
    try {
        const { batterySystemId, resolved = 'false', limit = '50' } = req.query;
        if (!batterySystemId) {
            return res.status(400).json({
                error: 'batterySystemId parameter is required'
            });
        }
        const isResolved = resolved === 'true';
        const result = await pool.query(`SELECT
        id, battery_system_id, alert_time, model_version,
        alert_type, severity, message,
        metric_name, metric_value, threshold_value,
        acknowledged, acknowledged_at, acknowledged_by,
        resolved, resolved_at, created_at
       FROM model_health_alerts
       WHERE battery_system_id = $1
         AND resolved = $2
       ORDER BY alert_time DESC
       LIMIT $3`, [batterySystemId, isResolved, parseInt(limit)]);
        res.json({
            data: result.rows,
            total: result.rowCount || 0
        });
    }
    catch (error) {
        console.error('Error fetching alerts:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
/**
 * PATCH /api/v1/model-performance/alerts/:id/acknowledge
 * Acknowledge an alert
 */
router.patch('/alerts/:id/acknowledge', async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?.userId || 'system';
        await pool.query(`UPDATE model_health_alerts
       SET acknowledged = true,
           acknowledged_at = NOW(),
           acknowledged_by = $1
       WHERE id = $2`, [userId, id]);
        res.json({ message: 'Alert acknowledged successfully' });
    }
    catch (error) {
        console.error('Error acknowledging alert:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
/**
 * PATCH /api/v1/model-performance/alerts/:id/resolve
 * Resolve an alert
 */
router.patch('/alerts/:id/resolve', async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query(`UPDATE model_health_alerts
       SET resolved = true,
           resolved_at = NOW()
       WHERE id = $1`, [id]);
        res.json({ message: 'Alert resolved successfully' });
    }
    catch (error) {
        console.error('Error resolving alert:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
/**
 * GET /api/v1/model-performance/history
 * Get historical performance data for charts
 */
router.get('/history', async (req, res) => {
    try {
        const { batterySystemId, metricType, startTime, endTime, modelVersion = 'v1.0' } = req.query;
        if (!batterySystemId || !metricType || !startTime || !endTime) {
            return res.status(400).json({
                error: 'batterySystemId, metricType, startTime, and endTime are required'
            });
        }
        let query;
        let tableName;
        switch (metricType) {
            case 'accuracy':
                query = `
          SELECT metric_time, mae_soc, mae_soh, mae_temperature, mae_power,
                 rmse_soc, rmse_soh, rmse_temperature, rmse_power,
                 r2_soc, r2_soh, r2_temperature, r2_power
          FROM model_performance_metrics
          WHERE battery_system_id = $1
            AND model_version = $2
            AND metric_time >= $3
            AND metric_time <= $4
          ORDER BY metric_time ASC
        `;
                break;
            case 'drift':
                query = `
          SELECT metric_time, voltage_drift_score, current_drift_score,
                 temperature_drift_score, soc_drift_score, overall_drift_score
          FROM model_drift_metrics
          WHERE battery_system_id = $1
            AND model_version = $2
            AND metric_time >= $3
            AND metric_time <= $4
          ORDER BY metric_time ASC
        `;
                break;
            case 'health':
                query = `
          SELECT score_time, accuracy_score, drift_score, data_quality_score,
                 overall_health_score, health_status
          FROM model_health_scores
          WHERE battery_system_id = $1
            AND model_version = $2
            AND score_time >= $3
            AND score_time <= $4
          ORDER BY score_time ASC
        `;
                break;
            default:
                return res.status(400).json({
                    error: 'Invalid metricType. Must be one of: accuracy, drift, health'
                });
        }
        const result = await pool.query(query, [
            batterySystemId,
            modelVersion,
            startTime,
            endTime
        ]);
        res.json({
            data: result.rows,
            total: result.rowCount || 0
        });
    }
    catch (error) {
        console.error('Error fetching historical data:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
export default router;
