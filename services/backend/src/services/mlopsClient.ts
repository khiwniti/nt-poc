/**
 * MLOps Service Client
 * Production-ready client for ML model predictions with:
 * - Retry logic with exponential backoff
 * - Circuit breaker pattern
 * - Comprehensive error handling
 * - Metrics and logging
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import { logger } from '../observability/logger';

const MLOPS_SERVICE_URL = process.env.MLOPS_SERVICE_URL || 'http://localhost:8001';
const REQUEST_TIMEOUT_MS = parseInt(process.env.MLOPS_TIMEOUT_MS || '30000'); // 30s
const MAX_RETRIES = parseInt(process.env.MLOPS_MAX_RETRIES || '3');
const RETRY_DELAY_MS = parseInt(process.env.MLOPS_RETRY_DELAY_MS || '1000');

// Circuit breaker state
interface CircuitBreakerState {
  failures: number;
  lastFailureTime: number | null;
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
}

const circuitBreaker: CircuitBreakerState = {
  failures: 0,
  lastFailureTime: null,
  state: 'CLOSED',
};

const CIRCUIT_BREAKER_THRESHOLD = 5; // Open circuit after 5 failures
const CIRCUIT_BREAKER_TIMEOUT_MS = 60000; // 1 minute before trying again

export interface RULPredictionRequest {
  battery_system_id: string;
  sequence: number[][]; // Array of [soc, soh, temp, voltage, cycle_count]
}

export interface RULPredictionResponse {
  predicted_rul: number;
  confidence: number;
  model_version: string;
  features_used: string[];
  battery_system_id: string;
}

export interface BatchRULPredictionRequest {
  battery_system_ids?: string[];
  sequences: number[][][]; // Batch of sequences
}

export interface BatchRULPredictionResponse {
  predicted_rul: number[];
  confidence: number[];
  model_version: string;
  features_used: string[];
  battery_system_ids?: string[];
}

class MLOpsClient {
  private client: AxiosInstance;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private isHealthy: boolean = false;

  constructor() {
    this.client = axios.create({
      baseURL: MLOPS_SERVICE_URL,
      timeout: REQUEST_TIMEOUT_MS,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Start health check monitoring
    this.startHealthCheckMonitoring();
  }

  /**
   * Check circuit breaker state
   */
  private checkCircuitBreaker(): void {
    if (circuitBreaker.state === 'OPEN') {
      const timeSinceLastFailure = Date.now() - (circuitBreaker.lastFailureTime || 0);

      if (timeSinceLastFailure > CIRCUIT_BREAKER_TIMEOUT_MS) {
        logger.info('mlops_circuit_breaker_half_open');
        circuitBreaker.state = 'HALF_OPEN';
        circuitBreaker.failures = 0;
      } else {
        throw new Error('Circuit breaker is OPEN - MLOps service unavailable');
      }
    }
  }

  /**
   * Record circuit breaker success
   */
  private recordSuccess(): void {
    if (circuitBreaker.state === 'HALF_OPEN') {
      logger.info('mlops_circuit_breaker_closed');
      circuitBreaker.state = 'CLOSED';
    }
    circuitBreaker.failures = 0;
  }

  /**
   * Record circuit breaker failure
   */
  private recordFailure(): void {
    circuitBreaker.failures++;
    circuitBreaker.lastFailureTime = Date.now();

    if (circuitBreaker.failures >= CIRCUIT_BREAKER_THRESHOLD) {
      logger.error('mlops_circuit_breaker_opened', {
        failures: circuitBreaker.failures,
      });
      circuitBreaker.state = 'OPEN';
    }
  }

  /**
   * Retry logic with exponential backoff
   */
  private async retryWithBackoff<T>(
    operation: () => Promise<T>,
    retries: number = MAX_RETRIES
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        this.checkCircuitBreaker();
        const result = await operation();
        this.recordSuccess();
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Don't retry on circuit breaker open or client errors (4xx)
        if (lastError.message.includes('Circuit breaker') ||
            (axios.isAxiosError(error) && error.response && error.response.status < 500)) {
          throw lastError;
        }

        if (attempt < retries) {
          const delay = RETRY_DELAY_MS * Math.pow(2, attempt); // Exponential backoff
          logger.warn('mlops_request_retry', {
            attempt: attempt + 1,
            maxRetries: retries,
            delayMs: delay,
            error: lastError.message,
          });
          await this.delay(delay);
        } else {
          this.recordFailure();
        }
      }
    }

    throw lastError || new Error('MLOps request failed after retries');
  }

  /**
   * Delay utility
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get('/health', { timeout: 5000 });
      this.isHealthy = response.status === 200;
      return this.isHealthy;
    } catch (error) {
      this.isHealthy = false;
      return false;
    }
  }

  /**
   * Start periodic health check monitoring
   */
  private startHealthCheckMonitoring(): void {
    // Check every 30 seconds
    this.healthCheckInterval = setInterval(async () => {
      const healthy = await this.healthCheck();
      if (!healthy) {
        logger.warn('mlops_service_unhealthy', { url: MLOPS_SERVICE_URL });
      }
    }, 30000);

    // Initial health check
    this.healthCheck().then(healthy => {
      logger.info('mlops_initial_health_check', { healthy, url: MLOPS_SERVICE_URL });
    });
  }

  /**
   * Stop health check monitoring
   */
  stopHealthCheckMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  /**
   * Get service health status
   */
  getHealthStatus(): boolean {
    return this.isHealthy;
  }

  /**
   * Predict RUL for a single battery system
   */
  async predictRUL(request: RULPredictionRequest): Promise<RULPredictionResponse> {
    logger.debug('mlops_predict_rul_request', {
      batterySystemId: request.battery_system_id,
      sequenceLength: request.sequence.length,
    });

    const response = await this.retryWithBackoff(async () => {
      return await this.client.post<RULPredictionResponse>('/ml/predict-rul', request);
    });

    logger.info('mlops_predict_rul_success', {
      batterySystemId: request.battery_system_id,
      predictedRul: response.data.predicted_rul,
      confidence: response.data.confidence,
    });

    return response.data;
  }

  /**
   * Batch predict RUL for multiple battery systems
   */
  async predictRULBatch(request: BatchRULPredictionRequest): Promise<BatchRULPredictionResponse> {
    logger.debug('mlops_predict_rul_batch_request', {
      batchSize: request.sequences.length,
    });

    const response = await this.retryWithBackoff(async () => {
      return await this.client.post<BatchRULPredictionResponse>('/ml/predict-rul/batch', request);
    });

    logger.info('mlops_predict_rul_batch_success', {
      batchSize: response.data.predicted_rul.length,
    });

    return response.data;
  }

  /**
   * Get model information
   */
  async getModelInfo(): Promise<any> {
    const response = await this.retryWithBackoff(async () => {
      return await this.client.get('/ml/model-info');
    });

    return response.data;
  }

  /**
   * Graceful shutdown
   */
  shutdown(): void {
    this.stopHealthCheckMonitoring();
    logger.info('mlops_client_shutdown');
  }
}

// Singleton instance
let clientInstance: MLOpsClient | null = null;

/**
 * Get MLOps client instance
 */
export function getMLOpsClient(): MLOpsClient {
  if (!clientInstance) {
    clientInstance = new MLOpsClient();
  }
  return clientInstance;
}

/**
 * Shutdown MLOps client
 */
export function shutdownMLOpsClient(): void {
  if (clientInstance) {
    clientInstance.shutdown();
    clientInstance = null;
  }
}

export default getMLOpsClient;
