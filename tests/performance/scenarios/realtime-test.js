// k6 Real-time Latency Test - WebSocket and SSE performance
// Tests real-time data streaming and latency requirements (<2s)
import http from 'k6/http';
import { sleep, check } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';
import { config } from '../config.js';
import { apiRequest, checkResponseTime } from '../utils/api.js';

// Custom metrics
const realtimeLatency = new Trend('realtime_latency');
const realtimeErrors = new Rate('realtime_errors');
const realtimeRequests = new Counter('realtime_requests');

export const options = {
  stages: [
    { duration: '1m', target: 50 },
    { duration: '5m', target: 200 },
    { duration: '1m', target: 0 },
  ],
  thresholds: {
    'realtime_latency': [
      'p(95)<2000', // 95% of real-time requests < 2s
      'p(99)<3000', // 99% of real-time requests < 3s
    ],
    'http_req_duration{endpoint:stream}': ['p(95)<2000'],
    'realtime_errors': ['rate<0.01'], // Less than 1% errors
  },
};

export default function () {
  const baseURL = config.baseURL;
  
  realtimeRequests.add(1);
  const startTime = Date.now();

  // Test 1: Sensor readings stream (most frequent real-time data)
  const sensorRes = apiRequest('GET', `${baseURL}/api/v1/sensor-readings?limit=100&realtime=true`);
  const sensorLatency = Date.now() - startTime;
  
  const sensorSuccess = check(sensorRes, {
    'sensor stream status is 200': (r) => r.status === 200,
    'sensor stream latency < 2s': (r) => sensorLatency < 2000,
    'sensor stream has data': (r) => r.body && r.body.length > 0,
  });
  
  realtimeLatency.add(sensorLatency);
  realtimeErrors.add(!sensorSuccess);

  sleep(1);

  // Test 2: SSE stream endpoint
  const streamStart = Date.now();
  const streamRes = apiRequest('GET', `${baseURL}/api/v1/stream`, null, {
    tags: { endpoint: 'stream' },
  });
  const streamLatency = Date.now() - streamStart;
  
  const streamSuccess = check(streamRes, {
    'stream connection established': (r) => r.status === 200,
    'stream latency < 2s': (r) => streamLatency < 2000,
  });
  
  realtimeLatency.add(streamLatency);
  realtimeErrors.add(!streamSuccess);

  sleep(2);

  // Test 3: Alert updates (real-time notifications)
  const alertStart = Date.now();
  const alertRes = apiRequest('GET', `${baseURL}/api/v1/alerts?status=active&limit=20`);
  const alertLatency = Date.now() - alertStart;
  
  const alertSuccess = check(alertRes, {
    'alert updates status is 200': (r) => r.status === 200,
    'alert updates latency < 2s': (r) => alertLatency < 2000,
  });
  
  realtimeLatency.add(alertLatency);
  realtimeErrors.add(!alertSuccess);

  sleep(3);

  // Test 4: Predictions updates
  const predStart = Date.now();
  const predRes = apiRequest('GET', `${baseURL}/api/v1/predictions?latest=true&limit=50`);
  const predLatency = Date.now() - predStart;
  
  const predSuccess = check(predRes, {
    'prediction updates status is 200': (r) => r.status === 200,
    'prediction updates latency < 2s': (r) => predLatency < 2000,
  });
  
  realtimeLatency.add(predLatency);
  realtimeErrors.add(!predSuccess);

  sleep(2);
}

export function handleSummary(data) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  
  const summary = {
    timestamp: timestamp,
    test_type: 'realtime',
    metrics: {
      realtime_latency_p50: data.metrics.realtime_latency?.values['p(50)'],
      realtime_latency_p95: data.metrics.realtime_latency?.values['p(95)'],
      realtime_latency_p99: data.metrics.realtime_latency?.values['p(99)'],
      realtime_latency_max: data.metrics.realtime_latency?.values.max,
      realtime_error_rate: data.metrics.realtime_errors?.values.rate,
      total_realtime_requests: data.metrics.realtime_requests?.values.count,
    },
    sla_compliance: {
      p95_under_2s: data.metrics.realtime_latency?.values['p(95)'] < 2000,
      p99_under_3s: data.metrics.realtime_latency?.values['p(99)'] < 3000,
      error_rate_acceptable: data.metrics.realtime_errors?.values.rate < 0.01,
    },
  };
  
  return {
    [`../results/realtime-test-${timestamp}.json`]: JSON.stringify(summary, null, 2),
    'stdout': JSON.stringify(summary, null, 2),
  };
}
