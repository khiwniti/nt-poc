export interface RULPrediction {
  id: string;
  batterySystemId: string;
  predictedRUL: number; // in days
  confidence: number; // 0-1 range
  predictionDate: Date | string;
  modelVersion: string;
  features: Record<string, unknown>;
  createdAt: Date | string;
}

export interface RULPredictionResponse {
  data: RULPrediction | RULPrediction[];
  total?: number;
}
