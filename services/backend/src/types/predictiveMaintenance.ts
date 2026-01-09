/**
 * Predictive Maintenance Types
 * T140: Implement predictive maintenance model
 */

export type RiskLevel = '7d' | '14d' | '30d' | 'safe';

export interface MaintenanceFeatures {
  sohDelta: number;        // SoH degradation rate (% per day)
  anomalyCount: number;     // Number of anomalies detected
  tempMax: number;          // Maximum temperature (°C)
  voltageMin: number;       // Minimum voltage (V)
}

export interface MaintenancePrediction {
  batterySystemId: string;
  riskLevel: RiskLevel;
  probability7d: number;    // Probability of failure within 7 days
  probability14d: number;   // Probability of failure within 14 days
  probability30d: number;   // Probability of failure within 30 days
  features: MaintenanceFeatures;
  modelVersion: string;
  predictionDate: Date;
}

export interface PredictMaintenanceRequest {
  batterySystemId: string;
  features: MaintenanceFeatures;
}

export interface PredictMaintenanceResponse {
  prediction: MaintenancePrediction;
  rocAuc?: {
    '7d': number;
    '14d': number;
    '30d': number;
  };
}

export interface TrainingData {
  features: MaintenanceFeatures;
  label: RiskLevel;
}

export interface ModelMetrics {
  rocAuc7d: number;
  rocAuc14d: number;
  rocAuc30d: number;
  accuracy: number;
  sampleCount: number;
  modelVersion: string;
  trainedAt: Date;
}
