export interface ScenarioParameters {
  temperature: number; // Celsius
  loadPercentage: number; // 0-100
  cycleFrequency: number; // cycles per day
}

export interface ScenarioComparison {
  current: ScenarioPrediction;
  simulated: ScenarioPrediction;
  delta: {
    rul: number; // difference in days
    rulPercentage: number; // percentage change
    healthScore: number; // difference in health score
    healthScorePercentage: number; // percentage change
  };
}

export interface ScenarioPrediction {
  rul: number; // days
  healthScore: number; // 0-100
  confidence: number; // 0-1
  parameters: ScenarioParameters;
}

export interface SavedScenario {
  id: string;
  name: string;
  description?: string;
  parameters: ScenarioParameters;
  prediction: ScenarioPrediction;
  createdAt: Date | string;
}
