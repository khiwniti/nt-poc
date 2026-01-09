import { pool } from '../config/database.js';

// Statistical calculation utilities
export class ModelPerformanceService {
  /**
   * Calculate Mean Absolute Error (MAE)
   */
  static calculateMAE(predicted: number[], actual: number[]): number {
    if (predicted.length !== actual.length || predicted.length === 0) {
      throw new Error('Arrays must be non-empty and of equal length');
    }

    const sum = predicted.reduce((acc, pred, i) => {
      return acc + Math.abs(pred - actual[i]);
    }, 0);

    return sum / predicted.length;
  }

  /**
   * Calculate Root Mean Square Error (RMSE)
   */
  static calculateRMSE(predicted: number[], actual: number[]): number {
    if (predicted.length !== actual.length || predicted.length === 0) {
      throw new Error('Arrays must be non-empty and of equal length');
    }

    const sumSquares = predicted.reduce((acc, pred, i) => {
      const error = pred - actual[i];
      return acc + (error * error);
    }, 0);

    return Math.sqrt(sumSquares / predicted.length);
  }

  /**
   * Calculate R-squared (coefficient of determination)
   */
  static calculateR2(predicted: number[], actual: number[]): number {
    if (predicted.length !== actual.length || predicted.length === 0) {
      throw new Error('Arrays must be non-empty and of equal length');
    }

    const mean = actual.reduce((sum, val) => sum + val, 0) / actual.length;

    const ssTotal = actual.reduce((sum, val) => {
      const diff = val - mean;
      return sum + (diff * diff);
    }, 0);

    const ssResidual = predicted.reduce((sum, pred, i) => {
      const diff = actual[i] - pred;
      return sum + (diff * diff);
    }, 0);

    if (ssTotal === 0) return 0;

    return 1 - (ssResidual / ssTotal);
  }

  /**
   * Calculate Kolmogorov-Smirnov test statistic for drift detection
   */
  static calculateKSStatistic(baseline: number[], comparison: number[]): number {
    if (baseline.length === 0 || comparison.length === 0) {
      throw new Error('Arrays must be non-empty');
    }

    // Sort both arrays
    const sortedBaseline = [...baseline].sort((a, b) => a - b);
    const sortedComparison = [...comparison].sort((a, b) => a - b);

    // Combine and get unique values
    const allValues = [...new Set([...sortedBaseline, ...sortedComparison])].sort((a, b) => a - b);

    let maxDiff = 0;

    for (const value of allValues) {
      // Calculate empirical CDF for baseline
      const cdfBaseline = sortedBaseline.filter(v => v <= value).length / sortedBaseline.length;

      // Calculate empirical CDF for comparison
      const cdfComparison = sortedComparison.filter(v => v <= value).length / sortedComparison.length;

      const diff = Math.abs(cdfBaseline - cdfComparison);
      maxDiff = Math.max(maxDiff, diff);
    }

    return maxDiff;
  }

  /**
   * Calculate aggregated performance metrics for a given time period
   */
  static async calculatePerformanceMetrics(
    batterySystemId: string,
    startTime: Date,
    endTime: Date,
    modelVersion: string,
    aggregationPeriod: 'hourly' | 'daily' | 'weekly'
  ): Promise<{
    mae: { soc: number; soh: number; temperature: number; power: number };
    rmse: { soc: number; soh: number; temperature: number; power: number };
    r2: { soc: number; soh: number; temperature: number; power: number };
    predictionCount: number;
    missingActualCount: number;
  }> {
    // Fetch predictions with actuals
    const result = await pool.query(
      `SELECT
        predicted_soc, actual_soc,
        predicted_soh, actual_soh,
        predicted_temperature, actual_temperature,
        predicted_power, actual_power
       FROM model_predictions
       WHERE battery_system_id = $1
         AND model_version = $2
         AND prediction_time >= $3
         AND prediction_time <= $4
         AND actual_soc IS NOT NULL`,
      [batterySystemId, modelVersion, startTime, endTime]
    );

    const predictions = result.rows;

    if (predictions.length === 0) {
      throw new Error('No predictions with actuals found for the specified period');
    }

    // Count missing actuals
    const missingResult = await pool.query(
      `SELECT COUNT(*) as missing_count
       FROM model_predictions
       WHERE battery_system_id = $1
         AND model_version = $2
         AND prediction_time >= $3
         AND prediction_time <= $4
         AND actual_soc IS NULL`,
      [batterySystemId, modelVersion, startTime, endTime]
    );

    const missingActualCount = parseInt(missingResult.rows[0].missing_count);

    // Extract arrays for each metric
    const socPredicted = predictions.map(p => parseFloat(p.predicted_soc));
    const socActual = predictions.map(p => parseFloat(p.actual_soc));

    const sohPredicted = predictions.map(p => parseFloat(p.predicted_soh));
    const sohActual = predictions.map(p => parseFloat(p.actual_soh));

    const tempPredicted = predictions.map(p => parseFloat(p.predicted_temperature));
    const tempActual = predictions.map(p => parseFloat(p.actual_temperature));

    const powerPredicted = predictions.map(p => parseFloat(p.predicted_power));
    const powerActual = predictions.map(p => parseFloat(p.actual_power));

    return {
      mae: {
        soc: this.calculateMAE(socPredicted, socActual),
        soh: this.calculateMAE(sohPredicted, sohActual),
        temperature: this.calculateMAE(tempPredicted, tempActual),
        power: this.calculateMAE(powerPredicted, powerActual),
      },
      rmse: {
        soc: this.calculateRMSE(socPredicted, socActual),
        soh: this.calculateRMSE(sohPredicted, sohActual),
        temperature: this.calculateRMSE(tempPredicted, tempActual),
        power: this.calculateRMSE(powerPredicted, powerActual),
      },
      r2: {
        soc: this.calculateR2(socPredicted, socActual),
        soh: this.calculateR2(sohPredicted, sohActual),
        temperature: this.calculateR2(tempPredicted, tempActual),
        power: this.calculateR2(powerPredicted, powerActual),
      },
      predictionCount: predictions.length,
      missingActualCount,
    };
  }

  /**
   * Detect drift by comparing feature distributions
   */
  static async detectDrift(
    batterySystemId: string,
    baselineStart: Date,
    baselineEnd: Date,
    comparisonStart: Date,
    comparisonEnd: Date,
    modelVersion: string,
    driftThreshold: number = 0.2
  ): Promise<{
    driftScores: {
      voltage: number;
      current: number;
      temperature: number;
      soc: number;
    };
    overallDriftScore: number;
    driftDetected: boolean;
  }> {
    // Fetch baseline data
    const baselineResult = await pool.query(
      `SELECT voltage, current, temperature, soc
       FROM sensor_readings
       WHERE battery_system_id = $1
         AND time >= $2
         AND time <= $3
       ORDER BY time`,
      [batterySystemId, baselineStart, baselineEnd]
    );

    // Fetch comparison data
    const comparisonResult = await pool.query(
      `SELECT voltage, current, temperature, soc
       FROM sensor_readings
       WHERE battery_system_id = $1
         AND time >= $2
         AND time <= $3
       ORDER BY time`,
      [batterySystemId, comparisonStart, comparisonEnd]
    );

    if (baselineResult.rows.length === 0 || comparisonResult.rows.length === 0) {
      throw new Error('Insufficient data for drift detection');
    }

    const baseline = baselineResult.rows;
    const comparison = comparisonResult.rows;

    // Calculate KS statistic for each feature
    const voltageDrift = this.calculateKSStatistic(
      baseline.map(r => parseFloat(r.voltage)),
      comparison.map(r => parseFloat(r.voltage))
    );

    const currentDrift = this.calculateKSStatistic(
      baseline.map(r => parseFloat(r.current)),
      comparison.map(r => parseFloat(r.current))
    );

    const temperatureDrift = this.calculateKSStatistic(
      baseline.map(r => parseFloat(r.temperature)),
      comparison.map(r => parseFloat(r.temperature))
    );

    const socDrift = this.calculateKSStatistic(
      baseline.map(r => parseFloat(r.soc)),
      comparison.map(r => parseFloat(r.soc))
    );

    // Calculate overall drift score (max of all features)
    const overallDriftScore = Math.max(voltageDrift, currentDrift, temperatureDrift, socDrift);

    return {
      driftScores: {
        voltage: voltageDrift,
        current: currentDrift,
        temperature: temperatureDrift,
        soc: socDrift,
      },
      overallDriftScore,
      driftDetected: overallDriftScore > driftThreshold,
    };
  }

  /**
   * Calculate data quality metrics
   */
  static async calculateDataQualityMetrics(
    batterySystemId: string,
    startTime: Date,
    endTime: Date,
    aggregationPeriod: 'hourly' | 'daily' | 'weekly'
  ): Promise<{
    totalRecords: number;
    missingCounts: {
      voltage: number;
      current: number;
      temperature: number;
      soc: number;
      soh: number;
    };
    outlierCounts: {
      voltage: number;
      current: number;
      temperature: number;
      soc: number;
    };
    rangeViolations: {
      voltage: number;
      current: number;
      temperature: number;
      soc: number;
    };
    maxTimeGapSeconds: number;
  }> {
    // Fetch data for the period
    const dataResult = await pool.query(
      `SELECT
        voltage, current, temperature, soc, soh, time,
        EXTRACT(EPOCH FROM (time - LAG(time) OVER (ORDER BY time))) as time_gap
       FROM sensor_readings
       WHERE battery_system_id = $1
         AND time >= $2
         AND time <= $3
       ORDER BY time`,
      [batterySystemId, startTime, endTime]
    );

    const records = dataResult.rows;
    const totalRecords = records.length;

    if (totalRecords === 0) {
      throw new Error('No data found for the specified period');
    }

    // Count missing values
    const missingCounts = {
      voltage: records.filter(r => r.voltage === null).length,
      current: records.filter(r => r.current === null).length,
      temperature: records.filter(r => r.temperature === null).length,
      soc: records.filter(r => r.soc === null).length,
      soh: records.filter(r => r.soh === null).length,
    };

    // Calculate statistics for outlier detection (3 standard deviations)
    const calculateStats = (values: number[]) => {
      const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
      const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
      const stdDev = Math.sqrt(variance);
      return { mean, stdDev };
    };

    const voltageValues = records.filter(r => r.voltage !== null).map(r => parseFloat(r.voltage));
    const currentValues = records.filter(r => r.current !== null).map(r => parseFloat(r.current));
    const tempValues = records.filter(r => r.temperature !== null).map(r => parseFloat(r.temperature));
    const socValues = records.filter(r => r.soc !== null).map(r => parseFloat(r.soc));

    const voltageStats = calculateStats(voltageValues);
    const currentStats = calculateStats(currentValues);
    const tempStats = calculateStats(tempValues);
    const socStats = calculateStats(socValues);

    // Count outliers (beyond 3 standard deviations)
    const outlierCounts = {
      voltage: voltageValues.filter(v => Math.abs(v - voltageStats.mean) > 3 * voltageStats.stdDev).length,
      current: currentValues.filter(v => Math.abs(v - currentStats.mean) > 3 * currentStats.stdDev).length,
      temperature: tempValues.filter(v => Math.abs(v - tempStats.mean) > 3 * tempStats.stdDev).length,
      soc: socValues.filter(v => Math.abs(v - socStats.mean) > 3 * socStats.stdDev).length,
    };

    // Count range violations (domain-specific valid ranges)
    const rangeViolations = {
      voltage: voltageValues.filter(v => v < 0 || v > 1000).length, // 0-1000V typical range
      current: currentValues.filter(v => Math.abs(v) > 1000).length, // ±1000A typical range
      temperature: tempValues.filter(v => v < -40 || v > 85).length, // -40 to 85°C typical range
      soc: socValues.filter(v => v < 0 || v > 100).length, // 0-100% range
    };

    // Calculate max time gap
    const timeGaps = records
      .map(r => r.time_gap)
      .filter(gap => gap !== null)
      .map(gap => parseFloat(gap));

    const maxTimeGapSeconds = timeGaps.length > 0 ? Math.max(...timeGaps) : 0;

    return {
      totalRecords,
      missingCounts,
      outlierCounts,
      rangeViolations,
      maxTimeGapSeconds,
    };
  }

  /**
   * Calculate overall model health score
   */
  static calculateHealthScore(
    accuracyMetrics: { mae: any; rmse: any; r2: any },
    driftScore: number,
    dataQualityMetrics: any
  ): {
    accuracyScore: number;
    driftScore: number;
    dataQualityScore: number;
    overallHealthScore: number;
    healthStatus: string;
  } {
    // Accuracy score (based on R² values, 0-100 scale)
    const avgR2 = (
      accuracyMetrics.r2.soc +
      accuracyMetrics.r2.soh +
      accuracyMetrics.r2.temperature +
      accuracyMetrics.r2.power
    ) / 4;
    const accuracyScore = Math.max(0, Math.min(100, avgR2 * 100));

    // Drift score (inverse of drift statistic, 0-100 scale)
    const driftHealthScore = Math.max(0, Math.min(100, (1 - driftScore) * 100));

    // Data quality score
    const totalRecords = dataQualityMetrics.totalRecords;
    const totalMissing = Object.values(dataQualityMetrics.missingCounts).reduce((sum: number, count: any) => sum + count, 0);
    const totalOutliers = Object.values(dataQualityMetrics.outlierCounts).reduce((sum: number, count: any) => sum + count, 0);
    const totalViolations = Object.values(dataQualityMetrics.rangeViolations).reduce((sum: number, count: any) => sum + count, 0);

    const missingRate = totalMissing / (totalRecords * 5); // 5 metrics
    const outlierRate = totalOutliers / (totalRecords * 4); // 4 metrics
    const violationRate = totalViolations / (totalRecords * 4); // 4 metrics

    const dataQualityScore = Math.max(0, Math.min(100,
      (1 - missingRate - outlierRate - violationRate) * 100
    ));

    // Overall health score (weighted average)
    const overallHealthScore = (
      accuracyScore * 0.5 +
      driftHealthScore * 0.3 +
      dataQualityScore * 0.2
    );

    // Determine health status
    let healthStatus: string;
    if (overallHealthScore >= 90) healthStatus = 'excellent';
    else if (overallHealthScore >= 75) healthStatus = 'good';
    else if (overallHealthScore >= 60) healthStatus = 'fair';
    else if (overallHealthScore >= 40) healthStatus = 'poor';
    else healthStatus = 'critical';

    return {
      accuracyScore,
      driftScore: driftHealthScore,
      dataQualityScore,
      overallHealthScore,
      healthStatus,
    };
  }

  /**
   * Check for model degradation and create alerts
   */
  static async checkAndCreateAlerts(
    batterySystemId: string,
    modelVersion: string,
    healthScore: any,
    accuracyMetrics: any,
    driftDetected: boolean,
    driftScore: number
  ): Promise<void> {
    const alerts: Array<{
      type: string;
      severity: string;
      message: string;
      metricName: string;
      metricValue: number;
      thresholdValue: number;
    }> = [];

    // Check accuracy degradation
    if (healthScore.accuracyScore < 60) {
      alerts.push({
        type: 'accuracy_degradation',
        severity: healthScore.accuracyScore < 40 ? 'critical' : 'high',
        message: `Model accuracy has degraded to ${healthScore.accuracyScore.toFixed(2)}%`,
        metricName: 'accuracy_score',
        metricValue: healthScore.accuracyScore,
        thresholdValue: 60,
      });
    }

    // Check R² values
    Object.entries(accuracyMetrics.r2).forEach(([metric, value]: [string, any]) => {
      if (value < 0.7) {
        alerts.push({
          type: 'accuracy_degradation',
          severity: value < 0.5 ? 'high' : 'medium',
          message: `R² for ${metric} is low: ${value.toFixed(4)}`,
          metricName: `r2_${metric}`,
          metricValue: value,
          thresholdValue: 0.7,
        });
      }
    });

    // Check drift detection
    if (driftDetected) {
      alerts.push({
        type: 'drift_detected',
        severity: driftScore > 0.4 ? 'critical' : 'high',
        message: `Significant data drift detected with score: ${driftScore.toFixed(4)}`,
        metricName: 'overall_drift_score',
        metricValue: driftScore,
        thresholdValue: 0.2,
      });
    }

    // Check data quality
    if (healthScore.dataQualityScore < 70) {
      alerts.push({
        type: 'data_quality_issue',
        severity: healthScore.dataQualityScore < 50 ? 'high' : 'medium',
        message: `Data quality has degraded to ${healthScore.dataQualityScore.toFixed(2)}%`,
        metricName: 'data_quality_score',
        metricValue: healthScore.dataQualityScore,
        thresholdValue: 70,
      });
    }

    // Insert alerts into database
    for (const alert of alerts) {
      await pool.query(
        `INSERT INTO model_health_alerts
          (battery_system_id, model_version, alert_type, severity, message,
           metric_name, metric_value, threshold_value)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          batterySystemId,
          modelVersion,
          alert.type,
          alert.severity,
          alert.message,
          alert.metricName,
          alert.metricValue,
          alert.thresholdValue,
        ]
      );
    }
  }
}

export default ModelPerformanceService;
