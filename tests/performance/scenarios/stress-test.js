// k6 Stress Test - Push system beyond normal capacity
// Gradually increases load to find breaking point
import http from 'k6/http';
import { sleep, check } from 'k6';
import { Rate, Counter } from 'k6/metrics';
import { config } from '../config.js';
import { apiRequest, checkStatus, parseJsonResponse } from '../utils/api.js';

// Custom metrics
const stressErrors = new Counter('stress_errors');
const stressRequests = new Counter('stress_requests');

export const options = {
  stages: [
    { duration: '2m', target: 100 },   // Warm-up
    { duration: '5m', target: 500 },   // Ramp to normal load
    { duration: '5m', target: 1000 },  // Push to high load
    { duration: '5m', target: 2000 },  // Stress level
    { duration: '5m', target: 3000 },  // Breaking point
    { duration: '2m', target: 0 },     // Recovery
  ],
  thresholds: {
    'http_req_duration': ['p(95)<500', 'p(99)<1000'], // Relaxed thresholds
    'http_req_failed': ['rate<0.1'], // Allow 10% errors under stress
    'stress_errors': ['count<1000'], // Max 1000 errors total
  },
};

export default function () {
  const baseURL = config.baseURL;
  
  stressRequests.add(1);

  // Critical endpoint: facilities list
  const facilitiesRes = apiRequest('GET', `${baseURL}/api/v1/facilities`);
  if (!checkStatus(facilitiesRes, 200)) {
    stressErrors.add(1);
  }

  sleep(0.5);

  // Critical endpoint: predictions
  const predictionsRes = apiRequest('GET', `${baseURL}/api/v1/predictions?limit=20`);
  if (!checkStatus(predictionsRes, 200)) {
    stressErrors.add(1);
  }

  sleep(0.5);

  // Critical endpoint: alerts
  const alertsRes = apiRequest('GET', `${baseURL}/api/v1/alerts?limit=10`);
  if (!checkStatus(alertsRes, 200)) {
    stressErrors.add(1);
  }

  sleep(1);
}

export function handleSummary(data) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  
  const summary = {
    timestamp: timestamp,
    test_type: 'stress',
    max_vus: 3000,
    metrics: {
      http_req_duration_p95: data.metrics.http_req_duration?.values['p(95)'],
      http_req_duration_p99: data.metrics.http_req_duration?.values['p(99)'],
      http_req_duration_max: data.metrics.http_req_duration?.values.max,
      http_req_failed_rate: data.metrics.http_req_failed?.values.rate,
      total_requests: data.metrics.http_reqs?.values.count,
      stress_errors: data.metrics.stress_errors?.values.count,
    },
    analysis: {
      breaking_point_reached: data.metrics.http_req_failed?.values.rate > 0.1,
      degradation_detected: data.metrics.http_req_duration?.values['p(95)'] > 500,
    },
  };
  
  return {
    [`../results/stress-test-${timestamp}.json`]: JSON.stringify(summary, null, 2),
    'stdout': JSON.stringify(summary, null, 2),
  };
}
