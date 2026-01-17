import { faker } from '@faker-js/faker';
import { pool } from '../../config/database.js';

export interface ModelPredictionData {
  id?: number;
  battery_system_id?: string;
  prediction_time?: Date;
  predicted_soc?: number;
  predicted_soh?: number;
  predicted_temperature?: number;
  predicted_power?: number;
  actual_soc?: number;
  actual_soh?: number;
  actual_temperature?: number;
  actual_power?: number;
  model_version?: string;
  prediction_horizon_minutes?: number;
  actual_recorded_at?: Date;
  created_at?: Date;
  updated_at?: Date;
}

export interface ModelPerformanceMetricsData {
  id?: number;
  battery_system_id?: string;
  metric_time?: Date;
  model_version?: string;
  mae_soc?: number;
  mae_soh?: number;
  mae_temperature?: number;
  mae_power?: number;
  rmse_soc?: number;
  rmse_soh?: number;
  rmse_temperature?: number;
  rmse_power?: number;
  r2_soc?: number;
  r2_soh?: number;
  r2_temperature?: number;
  r2_power?: number;
  prediction_count?: number;
  missing_actual_count?: number;
  outlier_count?: number;
  aggregation_period?: string;
  created_at?: Date;
}

export const modelPredictionDefaults = {
  predicted_soc: () => faker.number.float({ min: 0, max: 100, fractionDigits: 2 }),
  predicted_soh: () => faker.number.float({ min: 70, max: 100, fractionDigits: 2 }),
  predicted_temperature: () => faker.number.float({ min: 15, max: 45, fractionDigits: 2 }),
  predicted_power: () => faker.number.float({ min: -100, max: 100, fractionDigits: 2 }),
  actual_soc: () => faker.number.float({ min: 0, max: 100, fractionDigits: 2 }),
  actual_soh: () => faker.number.float({ min: 70, max: 100, fractionDigits: 2 }),
  actual_temperature: () => faker.number.float({ min: 15, max: 45, fractionDigits: 2 }),
  actual_power: () => faker.number.float({ min: -100, max: 100, fractionDigits: 2 }),
  model_version: () => `v${faker.number.int({ min: 1, max: 5 })}.${faker.number.int({ min: 0, max: 9 })}.0`,
  prediction_horizon_minutes: () => faker.helpers.arrayElement([5, 15, 30, 60]),
};

export async function createModelPrediction(overrides: ModelPredictionData = {}): Promise<any> {
  const prediction = {
    battery_system_id: overrides.battery_system_id || `test-bat-${faker.string.uuid()}`,
    prediction_time: overrides.prediction_time || new Date(),
    predicted_soc: overrides.predicted_soc ?? modelPredictionDefaults.predicted_soc(),
    predicted_soh: overrides.predicted_soh ?? modelPredictionDefaults.predicted_soh(),
    predicted_temperature: overrides.predicted_temperature ?? modelPredictionDefaults.predicted_temperature(),
    predicted_power: overrides.predicted_power ?? modelPredictionDefaults.predicted_power(),
    actual_soc: overrides.actual_soc ?? modelPredictionDefaults.actual_soc(),
    actual_soh: overrides.actual_soh ?? modelPredictionDefaults.actual_soh(),
    actual_temperature: overrides.actual_temperature ?? modelPredictionDefaults.actual_temperature(),
    actual_power: overrides.actual_power ?? modelPredictionDefaults.actual_power(),
    model_version: overrides.model_version || modelPredictionDefaults.model_version(),
    prediction_horizon_minutes: overrides.prediction_horizon_minutes ?? modelPredictionDefaults.prediction_horizon_minutes(),
    actual_recorded_at: overrides.actual_recorded_at || new Date(),
    created_at: overrides.created_at || new Date(),
    updated_at: overrides.updated_at || new Date(),
  };

  const result = await pool.query(
    `INSERT INTO model_predictions (battery_system_id, prediction_time, predicted_soc, predicted_soh, predicted_temperature, predicted_power, actual_soc, actual_soh, actual_temperature, actual_power, model_version, prediction_horizon_minutes, actual_recorded_at, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
     RETURNING *`,
    [
      prediction.battery_system_id,
      prediction.prediction_time,
      prediction.predicted_soc,
      prediction.predicted_soh,
      prediction.predicted_temperature,
      prediction.predicted_power,
      prediction.actual_soc,
      prediction.actual_soh,
      prediction.actual_temperature,
      prediction.actual_power,
      prediction.model_version,
      prediction.prediction_horizon_minutes,
      prediction.actual_recorded_at,
      prediction.created_at,
      prediction.updated_at,
    ]
  );

  return result.rows[0];
}

export async function createModelPerformanceMetrics(overrides: ModelPerformanceMetricsData = {}): Promise<any> {
  const metrics = {
    battery_system_id: overrides.battery_system_id || null,
    metric_time: overrides.metric_time || new Date(),
    model_version: overrides.model_version || modelPredictionDefaults.model_version(),
    mae_soc: overrides.mae_soc ?? faker.number.float({ min: 0.1, max: 5, fractionDigits: 4 }),
    mae_soh: overrides.mae_soh ?? faker.number.float({ min: 0.1, max: 3, fractionDigits: 4 }),
    mae_temperature: overrides.mae_temperature ?? faker.number.float({ min: 0.1, max: 2, fractionDigits: 4 }),
    mae_power: overrides.mae_power ?? faker.number.float({ min: 0.1, max: 10, fractionDigits: 4 }),
    rmse_soc: overrides.rmse_soc ?? faker.number.float({ min: 0.1, max: 8, fractionDigits: 4 }),
    rmse_soh: overrides.rmse_soh ?? faker.number.float({ min: 0.1, max: 5, fractionDigits: 4 }),
    rmse_temperature: overrides.rmse_temperature ?? faker.number.float({ min: 0.1, max: 3, fractionDigits: 4 }),
    rmse_power: overrides.rmse_power ?? faker.number.float({ min: 0.1, max: 15, fractionDigits: 4 }),
    r2_soc: overrides.r2_soc ?? faker.number.float({ min: 0.80, max: 0.99, fractionDigits: 6 }),
    r2_soh: overrides.r2_soh ?? faker.number.float({ min: 0.75, max: 0.99, fractionDigits: 6 }),
    r2_temperature: overrides.r2_temperature ?? faker.number.float({ min: 0.70, max: 0.99, fractionDigits: 6 }),
    r2_power: overrides.r2_power ?? faker.number.float({ min: 0.65, max: 0.99, fractionDigits: 6 }),
    prediction_count: overrides.prediction_count ?? faker.number.int({ min: 50, max: 500 }),
    missing_actual_count: overrides.missing_actual_count ?? faker.number.int({ min: 0, max: 10 }),
    outlier_count: overrides.outlier_count ?? faker.number.int({ min: 0, max: 5 }),
    aggregation_period: overrides.aggregation_period || 'hourly',
    created_at: overrides.created_at || new Date(),
  };

  const result = await pool.query(
    `INSERT INTO model_performance_metrics (battery_system_id, metric_time, model_version, mae_soc, mae_soh, mae_temperature, mae_power, rmse_soc, rmse_soh, rmse_temperature, rmse_power, r2_soc, r2_soh, r2_temperature, r2_power, prediction_count, missing_actual_count, outlier_count, aggregation_period, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
     RETURNING *`,
    [
      metrics.battery_system_id,
      metrics.metric_time,
      metrics.model_version,
      metrics.mae_soc,
      metrics.mae_soh,
      metrics.mae_temperature,
      metrics.mae_power,
      metrics.rmse_soc,
      metrics.rmse_soh,
      metrics.rmse_temperature,
      metrics.rmse_power,
      metrics.r2_soc,
      metrics.r2_soh,
      metrics.r2_temperature,
      metrics.r2_power,
      metrics.prediction_count,
      metrics.missing_actual_count,
      metrics.outlier_count,
      metrics.aggregation_period,
      metrics.created_at,
    ]
  );

  return result.rows[0];
}
