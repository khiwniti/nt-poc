export interface HealthResponse {
  status: string;
  services?: Record<string, unknown>;
}

export interface RulPredictionRequest {
  batterySystemId: string;
  features: {
    sohDelta: number;
    anomalyCount: number;
    tempMax: number;
    voltageMin: number;
  };
}

export interface RulPredictionResponse {
  prediction: Record<string, unknown>;
  rocAuc?: {
    '7d': number;
    '14d': number;
    '30d': number;
  };
}

export interface SensorReadingSample {
  time: string;
  voltage: number;
  current: number;
  temperature: number;
  soc: number;
  soh: number;
  power: number;
}

export interface SensorIngestionPayload {
  batterySystemId: string;
  readings: SensorReadingSample[];
}

export interface LatestSensorReadingResponse {
  data: SensorReadingSample & { batterySystemId: string };
}

export class BackendClient {
  private readonly defaultHeaders = {
    'X-Test-Run-Id': process.env.HARNESS_RUN_ID ?? 'local-run',
    Authorization: `Bearer ${process.env.BACKEND_JWT ?? 'test-token'}`,
  };

  constructor(private readonly baseUrl = process.env.BACKEND_BASE_URL ?? 'http://localhost:3000') {}

  private withTimeout(init: RequestInit = {}, timeoutMs = 10_000): {
    request: RequestInit;
    clear: () => void;
  } {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    return {
      request: {
        ...init,
        headers: {
          ...this.defaultHeaders,
          ...(init.headers ?? {}),
        },
        signal: controller.signal,
      },
      clear: () => clearTimeout(timeout),
    };
  }

  async getHealth(): Promise<HealthResponse> {
    const { request, clear } = this.withTimeout({ headers: this.defaultHeaders });

    try {
      const response = await fetch(`${this.baseUrl}/api/health`, request);
      if (!response.ok) {
        throw new Error(`Health endpoint returned ${response.status}`);
      }
      return (await response.json()) as HealthResponse;
    } finally {
      clear();
    }
  }

  async requestRulPrediction(payload: RulPredictionRequest): Promise<RulPredictionResponse> {
    const { request, clear } = this.withTimeout(
      {
        method: 'POST',
        headers: {
          ...this.defaultHeaders,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      },
      15_000
    );

    try {
      const response = await fetch(`${this.baseUrl}/api/v1/ml/predict-maintenance`, request);
      if (!response.ok) {
        throw new Error(`predict-maintenance failed with ${response.status}`);
      }
      return (await response.json()) as RulPredictionResponse;
    } finally {
      clear();
    }
  }

  async ingestSensorReadings(payload: SensorIngestionPayload): Promise<void> {
    const { request, clear } = this.withTimeout({
      method: 'POST',
      headers: {
        ...this.defaultHeaders,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    try {
      const response = await fetch(`${this.baseUrl}/api/v1/sensor-readings/ingest`, request);
      if (!response.ok) {
        throw new Error(`sensor ingestion failed with ${response.status}`);
      }
    } finally {
      clear();
    }
  }

  async getLatestSensorReading(batterySystemId: string): Promise<LatestSensorReadingResponse> {
    const { request, clear } = this.withTimeout({ headers: this.defaultHeaders });

    try {
      const response = await fetch(
        `${this.baseUrl}/api/v1/sensor-readings/latest?batterySystemId=${encodeURIComponent(batterySystemId)}`,
        request
      );

      if (!response.ok) {
        throw new Error(`latest sensor readings failed with ${response.status}`);
      }

      return (await response.json()) as LatestSensorReadingResponse;
    } finally {
      clear();
    }
  }
}
