export interface ScenarioParameters {
  temperature: number; // Celsius
  loadPercentage: number; // 0-100
  cycleFrequency: number; // cycles per day
}

export interface ScenarioPrediction {
  rul: number; // days
  healthScore: number; // 0-100
  confidence: number; // 0-1
  parameters: ScenarioParameters;
}

export interface ScenarioComparison {
  current: ScenarioPrediction;
  simulated: ScenarioPrediction;
  delta: {
    rul: number;
    rulPercentage: number;
    healthScore: number;
    healthScorePercentage: number;
  };
}

export interface SavedScenario {
  id: string;
  batterySystemId: string;
  name: string;
  description?: string;
  parameters: ScenarioParameters;
  prediction: ScenarioPrediction;
  createdAt: Date;
}

export interface SavedScenarioRow {
  id: string;
  battery_system_id: string;
  name: string;
  description: string | null;
  parameters: ScenarioParameters;
  prediction: ScenarioPrediction;
  created_at: Date;
}
