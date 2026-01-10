// k6 Endurance Test (Soak Test) - Long-running stability
// Tests for memory leaks, resource exhaustion, and degradation over time
import http from 'k6/http';
import { sleep, check } from 'k6';
import { Trend, Rate } from 'k6/metrics';
import { config } from '../config.js';
import { apiRequest, checkAllSuccessful, randomItem } from '../utils/api.js';

// Custom metrics
const memoryLeakIndicator = new Trend('memory_leak_indicator');
const performanceDegradation = new Rate('performance_degradation');

export const options = {
  stages: [
    { duration: '5m', target: 200 },  // Ramp-up
    { duration: '2h', target: 200 },  // Sustained load for 2 hours
    { duration: '5m', target: 0 },    // Ramp-down
  ],
  thresholds: {
    'http_req_duration': [
      'p(95)<250',  // Slightly relaxed for long duration
      'p(99)<500',
    ],
    'http_req_failed': ['rate<0.01'],
    'performance_degradation': ['rate<0.05'], // Less than 5% degradation
  },
};

let baselineResponseTime = null;
let iteration = 0;

export default function () {
  const baseURL = config.baseURL;
  iteration++;

  // Cycle through various endpoints
  const endpoints = [
    { path: '/api/v1/facilities', threshold: 200 },
    { path: '/api/v1/predictions?limit=50', threshold: 300 },
    { path: '/api/v1/alerts?limit=20', threshold: 200 },
    { path: '/api/v1/sensor-readings?limit=100', threshold: 300 },
  ];

  const endpoint = endpoints[iteration % endpoints.length];
  const res = apiRequest('GET', `${baseURL}${endpoint.path}`);
  
  checkAllSuccessful(res, endpoint.threshold);

  // Track performance degradation over time
  if (baselineResponseTime === null && res.timings.duration > 0) {
    baselineResponseTime = res.timings.duration;
  } else if (baselineResponseTime !== null) {
    const currentTime = res.timings.duration;
    const degradation = currentTime > baselineResponseTime * 1.5; // 50% slower
    performanceDegradation.add(degradation);
    
    // Memory leak indicator: response time increasing over time
    memoryLeakIndicator.add(currentTime - baselineResponseTime);
  }

  sleep(1);

  // Periodic health check
  if (iteration % 10 === 0) {
    const healthRes = apiRequest('GET', `${baseURL}/api/v1/health`);
    check(healthRes, {
      'health check passing': (r) => r.status === 200,
      'health check fast': (r) => r.timings.duration < 100,
    });
  }

  sleep(2);
}

export function handleSummary(data) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  
  const summary = {
    timestamp: timestamp,
    test_type: 'endurance',
    duration: '2h',
    target_vus: 200,
    metrics: {
      http_req_duration_p50: data.metrics.http_req_duration?.values['p(50)'],
      http_req_duration_p95: data.metrics.http_req_duration?.values['p(95)'],
      http_req_duration_p99: data.metrics.http_req_duration?.values['p(99)'],
      http_req_failed_rate: data.metrics.http_req_failed?.values.rate,
      performance_degradation_rate: data.metrics.performance_degradation?.values.rate,
      memory_leak_indicator_trend: data.metrics.memory_leak_indicator?.values.avg,
      total_requests: data.metrics.http_reqs?.values.count,
    },
    stability_analysis: {
      stable_performance: data.metrics.performance_degradation?.values.rate < 0.05,
      no_memory_leak: data.metrics.memory_leak_indicator?.values.avg < 100, // Less than 100ms drift
      meets_sla: data.metrics.http_req_duration?.values['p(95)'] < 250,
      error_rate_acceptable: data.metrics.http_req_failed?.values.rate < 0.01,
    },
  };
  
  return {
    [`../results/endurance-test-${timestamp}.json`]: JSON.stringify(summary, null, 2),
    'stdout': JSON.stringify(summary, null, 2),
  };
}
