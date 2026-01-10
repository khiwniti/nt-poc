// Shared API utility functions for k6 tests
import http from 'k6/http';
import { check } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';

// Custom metrics
export const apiResponseTime = new Trend('api_response_time', true);
export const apiErrorRate = new Rate('api_errors');
export const apiRequests = new Counter('api_requests_total');

// Request with automatic metrics collection
export function apiRequest(method, url, body = null, params = {}) {
  const payload = body ? JSON.stringify(body) : null;
  const defaultParams = {
    headers: {
      'Content-Type': 'application/json',
    },
    tags: {
      endpoint: url,
      method: method,
    },
  };

  const mergedParams = { ...defaultParams, ...params };
  
  apiRequests.add(1);
  const response = http.request(method, url, payload, mergedParams);
  
  apiResponseTime.add(response.timings.duration, { endpoint: url });
  apiErrorRate.add(response.status >= 400);
  
  return response;
}

// Common check functions
export function checkStatus(response, expectedStatus = 200) {
  return check(response, {
    [`status is ${expectedStatus}`]: (r) => r.status === expectedStatus,
  });
}

export function checkResponseTime(response, maxMs) {
  return check(response, {
    [`response time < ${maxMs}ms`]: (r) => r.timings.duration < maxMs,
  });
}

export function checkJsonBody(response) {
  return check(response, {
    'response has JSON body': (r) => {
      try {
        JSON.parse(r.body);
        return true;
      } catch {
        return false;
      }
    },
  });
}

export function checkAllSuccessful(response, maxMs = 200) {
  return check(response, {
    'status is 200': (r) => r.status === 200,
    [`response time < ${maxMs}ms`]: (r) => r.timings.duration < maxMs,
    'response has valid JSON': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body !== null;
      } catch {
        return false;
      }
    },
  });
}

// Parse JSON response safely
export function parseJsonResponse(response) {
  try {
    return JSON.parse(response.body);
  } catch (error) {
    console.error(`Failed to parse JSON: ${error}, body: ${response.body}`);
    return null;
  }
}

// Get random item from array
export function randomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}

// Sleep with random jitter (more realistic user behavior)
export function sleepRandom(minMs, maxMs) {
  const duration = minMs + Math.random() * (maxMs - minMs);
  return duration / 1000; // k6 sleep uses seconds
}
