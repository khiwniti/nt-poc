export interface BatteryHealthSummary {
  totalBatteries: number;
  avgHealthScore: number | null;
  atRiskCount: number;
  healthyCount: number;
  warningCount: number;
}

export interface HealthDistribution {
  bucket: string;
  bucket_midpoint: number;
  count: number;
}

export interface AtRiskBattery {
  id: string;
  name: string;
  zone: string;
  capacity_kwh: number;
  health_score: number;
  last_reading: string;
}

export interface HealthTrendPoint {
  date: string;
  avg_health_score: number;
}

export interface ZoneHealthStats {
  zone: string;
  battery_count: number;
  avg_health_score: number;
  min_health_score: number;
  max_health_score: number;
  at_risk_count: number;
}
