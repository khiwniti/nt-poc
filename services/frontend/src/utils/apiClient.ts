/**
 * Production-Ready API Client
 * Features:
 * - Automatic retry with exponential backoff
 * - Circuit breaker pattern
 * - Request deduplication
 * - Token refresh
 * - Error tracking with Sentry
 * - Request timeout handling
 */

import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import axiosRetry from 'axios-retry';
import * as Sentry from '@sentry/react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Circuit breaker state
class CircuitBreaker {
  private failures = 0;
  private readonly threshold = 5; // Open circuit after 5 failures
  private readonly resetTimeout = 60000; // Reset after 1 minute
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  private nextAttemptTime = 0;

  public async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() < this.nextAttemptTime) {
        throw new Error('Circuit breaker is OPEN. Service temporarily unavailable.');
      }
      // Try half-open state
      this.state = 'half-open';
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.failures = 0;
    this.state = 'closed';
  }

  private onFailure() {
    this.failures++;
    if (this.failures >= this.threshold) {
      this.state = 'open';
      this.nextAttemptTime = Date.now() + this.resetTimeout;
      console.error('Circuit breaker opened due to repeated failures');
      Sentry.captureMessage('API Circuit breaker opened', 'warning');
    }
  }

  public getState() {
    return this.state;
  }
}

// Request deduplication cache
class RequestDeduplicator {
  private pending = new Map<string, Promise<unknown>>();

  public deduplicate<T>(key: string, fn: () => Promise<T>): Promise<T> {
    if (this.pending.has(key)) {
      return this.pending.get(key)! as Promise<T>;
    }

    const promise = fn().finally(() => {
      this.pending.delete(key);
    });

    this.pending.set(key, promise);
    return promise;
  }
}

// Create singleton instances
const circuitBreaker = new CircuitBreaker();
const deduplicator = new RequestDeduplicator();

/**
 * Create production-ready API client
 */
export function createApiClient(): AxiosInstance {
  const client = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000, // 30 second timeout
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Configure automatic retry with exponential backoff
  axiosRetry(client, {
    retries: 3,
    retryDelay: axiosRetry.exponentialDelay,
    retryCondition: (error: AxiosError) => {
      // Retry on network errors or 5xx server errors
      return (
        axiosRetry.isNetworkOrIdempotentRequestError(error) ||
        (error.response?.status !== undefined && error.response.status >= 500)
      );
    },
    onRetry: (retryCount, error, requestConfig) => {
      console.warn(`Retrying request (attempt ${retryCount}):`, {
        url: requestConfig.url,
        method: requestConfig.method,
        error: error.message,
      });
    },
  });

  // Request interceptor: Add auth token
  client.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      const token = localStorage.getItem('auth_token');
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      // Add request ID for tracing
      const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      if (config.headers) {
        config.headers['X-Request-ID'] = requestId;
      }

      return config;
    },
    (error) => {
      Sentry.captureException(error);
      return Promise.reject(error);
    }
  );

  // Response interceptor: Handle errors and token refresh
  client.interceptors.response.use(
    (response) => {
      // Success response
      return response;
    },
    async (error: AxiosError) => {
      const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

      // Handle 401 Unauthorized - try to refresh token
      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;

        try {
          // Attempt token refresh
          const refreshToken = localStorage.getItem('refresh_token');
          if (refreshToken) {
            const response = await axios.post(`${API_BASE_URL}/api/v1/auth/refresh`, {
              refreshToken,
            });

            const { token } = response.data;
            localStorage.setItem('auth_token', token);

            // Retry original request with new token
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return client(originalRequest);
          }
        } catch (refreshError) {
          // Refresh failed - redirect to login
          localStorage.removeItem('auth_token');
          localStorage.removeItem('refresh_token');
          window.location.href = '/login';
          return Promise.reject(refreshError);
        }
      }

      // Handle rate limiting (429)
      if (error.response?.status === 429) {
        const retryAfter = error.response.headers['retry-after'];
        const message = `Rate limit exceeded. Please try again in ${retryAfter || 'a few'} seconds.`;

        Sentry.captureMessage(message, 'warning');

        // Create user-friendly error
        const enhancedError = new Error(message);
        (
          enhancedError as unknown as { isRateLimitError: boolean; retryAfter?: string }
        ).isRateLimitError = true;
        (
          enhancedError as unknown as { isRateLimitError: boolean; retryAfter?: string }
        ).retryAfter = retryAfter;
        return Promise.reject(enhancedError);
      }

      // Track errors in Sentry
      if (error.response && error.response.status >= 500) {
        Sentry.captureException(error, {
          extra: {
            url: originalRequest.url,
            method: originalRequest.method,
            status: error.response.status,
            data: error.response.data,
          },
        });
      }

      // Create user-friendly error message
      const responseData = error.response?.data as { message?: string } | undefined;
      const errorMessage = responseData?.message || error.message || 'An unexpected error occurred';

      const enhancedError = new Error(errorMessage);
      (
        enhancedError as unknown as { originalError: unknown; status?: number; data?: unknown }
      ).originalError = error;
      (
        enhancedError as unknown as { originalError: unknown; status?: number; data?: unknown }
      ).status = error.response?.status;
      (
        enhancedError as unknown as { originalError: unknown; status?: number; data?: unknown }
      ).data = error.response?.data;

      return Promise.reject(enhancedError);
    }
  );

  return client;
}

/**
 * Make API request with circuit breaker and deduplication
 */
export async function makeRequest<T>(
  client: AxiosInstance,
  requestFn: () => Promise<T>,
  options: {
    deduplicate?: boolean;
    deduplicationKey?: string;
    skipCircuitBreaker?: boolean;
  } = {}
): Promise<T> {
  const { deduplicate = false, deduplicationKey, skipCircuitBreaker = false } = options;

  const executeFn = async () => {
    if (deduplicate && deduplicationKey) {
      return deduplicator.deduplicate(deduplicationKey, requestFn);
    }
    return requestFn();
  };

  if (skipCircuitBreaker) {
    return executeFn();
  }

  return circuitBreaker.execute(executeFn);
}

/**
 * Get circuit breaker state for monitoring
 */
export function getCircuitBreakerState() {
  return circuitBreaker.getState();
}

// Create and export default client instance
export const apiClient = createApiClient();
export default apiClient;
