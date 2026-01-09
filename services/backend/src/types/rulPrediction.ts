/**
 * RUL (Remaining Useful Life) Prediction data model
 */
export interface RULPrediction {
  id: string;
  batterySystemId: string;
  predictedRUL: number; // in days
  confidence: number; // 0-1 range
  predictionDate: Date;
  modelVersion: string;
  features: Record<string, unknown>; // JSON object with model features
  createdAt: Date;
}

/**
 * Database row representation (snake_case)
 */
export interface RULPredictionRow {
  id: string;
  battery_system_id: string;
  predicted_rul: number;
  confidence: number;
  prediction_date: Date;
  model_version: string;
  features: Record<string, unknown>;
  created_at: Date;
}

/**
 * Create RUL Prediction request payload
 */
export interface CreateRULPredictionRequest {
  batterySystemId: string;
  predictedRUL: number;
  confidence: number;
  modelVersion: string;
  features: Record<string, unknown>;
}

/**
 * API response wrapper
 */
export interface RULPredictionResponse {
  data: RULPrediction | RULPrediction[];
  total?: number;
}
