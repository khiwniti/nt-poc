interface MLOpsHealthResponse {
  status: string;
  version?: string;
  uptimeSeconds?: number;
}

interface MLOpsPredictionRequest {
  batterySystemId: string;
  features: Record<string, number>;
}

interface MLOpsPredictionResponse {
  prediction: Record<string, unknown>;
}

export class MLOpsClient {
  private readonly baseUrl: string;
  private readonly defaultHeaders = {
    'X-Test-Run-Id': process.env.HARNESS_RUN_ID ?? 'local-run',
  };

  constructor(baseUrl = process.env.MLOPS_BASE_URL ?? 'http://localhost:8000') {
    this.baseUrl = baseUrl;
  }

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

  async getHealth(): Promise<MLOpsHealthResponse> {
    const { request, clear } = this.withTimeout();
    try {
      const response = await fetch(`${this.baseUrl}/health`, request);
      if (!response.ok) {
        throw new Error(`MLOps health returned ${response.status}`);
      }
      return (await response.json()) as MLOpsHealthResponse;
    } finally {
      clear();
    }
  }

  async predictRul(payload: MLOpsPredictionRequest): Promise<MLOpsPredictionResponse> {
    const { request, clear } = this.withTimeout({
      method: 'POST',
      headers: {
        ...this.defaultHeaders,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    try {
      const response = await fetch(`${this.baseUrl}/ml/predict-rul`, request);
      if (!response.ok) {
        throw new Error(`MLOps predict-rul returned ${response.status}`);
      }
      return (await response.json()) as MLOpsPredictionResponse;
    } finally {
      clear();
    }
  }

  async detectAnomaly(features: Record<string, number>): Promise<any> {
    const { request, clear } = this.withTimeout({
      method: 'POST',
      headers: {
        ...this.defaultHeaders,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ features }),
    });

    try {
      const response = await fetch(`${this.baseUrl}/ml/detect-anomaly`, request);
      if (!response.ok) {
        throw new Error(`MLOps detect-anomaly returned ${response.status}`);
      }
      return await response.json();
    } finally {
      clear();
    }
  }
}
