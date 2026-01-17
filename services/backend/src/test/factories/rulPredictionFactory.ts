import { faker } from '@faker-js/faker';
import { pool } from '../../config/database.js';

export interface RulPredictionData {
  id?: string;
  battery_system_id?: string;
  predicted_rul?: number;
  confidence?: number;
  prediction_date?: Date;
  model_version?: string;
  features?: Record<string, any>;
  created_at?: Date;
}

export const rulPredictionDefaults = {
  predicted_rul: () => faker.number.int({ min: 1, max: 730 }),
  confidence: () => faker.number.float({ min: 0.5, max: 0.99, fractionDigits: 2 }),
  model_version: () => `v${faker.number.int({ min: 1, max: 5 })}.${faker.number.int({ min: 0, max: 9 })}.0`,
  features: () => ({
    avg_temperature: faker.number.float({ min: 20, max: 40, fractionDigits: 2 }),
    avg_soc: faker.number.float({ min: 20, max: 95, fractionDigits: 2 }),
    avg_soh: faker.number.float({ min: 75, max: 100, fractionDigits: 2 }),
    cycle_count: faker.number.int({ min: 100, max: 5000 }),
    age_days: faker.number.int({ min: 30, max: 730 }),
  }),
};

export async function createRulPrediction(overrides: RulPredictionData = {}): Promise<any> {
  const prediction = {
    id: overrides.id || `test-rul-${faker.string.uuid()}`,
    battery_system_id: overrides.battery_system_id || `test-bat-${faker.string.uuid()}`,
    predicted_rul: overrides.predicted_rul ?? rulPredictionDefaults.predicted_rul(),
    confidence: overrides.confidence ?? rulPredictionDefaults.confidence(),
    prediction_date: overrides.prediction_date || new Date(),
    model_version: overrides.model_version || rulPredictionDefaults.model_version(),
    features: overrides.features || rulPredictionDefaults.features(),
    created_at: overrides.created_at || new Date(),
  };

  const result = await pool.query(
    `INSERT INTO rul_predictions (id, battery_system_id, predicted_rul, confidence, prediction_date, model_version, features, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      prediction.id,
      prediction.battery_system_id,
      prediction.predicted_rul,
      prediction.confidence,
      prediction.prediction_date,
      prediction.model_version,
      JSON.stringify(prediction.features),
      prediction.created_at,
    ]
  );

  return result.rows[0];
}

export function buildRulPrediction(overrides: RulPredictionData = {}): RulPredictionData {
  return {
    id: overrides.id || `test-rul-${faker.string.uuid()}`,
    battery_system_id: overrides.battery_system_id || `test-bat-${faker.string.uuid()}`,
    predicted_rul: overrides.predicted_rul ?? rulPredictionDefaults.predicted_rul(),
    confidence: overrides.confidence ?? rulPredictionDefaults.confidence(),
    prediction_date: overrides.prediction_date || new Date(),
    model_version: overrides.model_version || rulPredictionDefaults.model_version(),
    features: overrides.features || rulPredictionDefaults.features(),
    created_at: overrides.created_at || new Date(),
  };
}

export async function createManyRulPredictions(count: number, overrides: RulPredictionData = {}): Promise<any[]> {
  const predictions = [];
  for (let i = 0; i < count; i++) {
    predictions.push(await createRulPrediction(overrides));
  }
  return predictions;
}
