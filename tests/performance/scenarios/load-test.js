// k6 Load Test - Multiple concurrent user scenarios
// Tests system behavior under sustained load (100, 500, 1000 concurrent users)
import http from 'k6/http';
import { sleep, check } from 'k6';
import { Rate, Trend } from 'k6/metrics';
import { config } from '../config.js';
import { 
  apiRequest, 
  checkAllSuccessful, 
  parseJsonResponse, 
  randomItem,
  sleepRandom 
} from '../utils/api.js';

// Custom metrics
const apiP95ResponseTime = new Trend('api_p95_response_time');
const realtimeLatency = new Trend('realtime_latency');

// Get scenario from environment or default to 'light'
const scenario = __ENV.SCENARIO || 'light';
const scenarioConfig = config.scenarios[scenario] || config.scenarios.light;

export const options = {
  stages: [
    { duration: '1m', target: Math.floor(scenarioConfig.vus * 0.2) }, // Ramp-up to 20%
    { duration: '2m', target: scenarioConfig.vus }, // Ramp-up to target
    { duration: scenarioConfig.duration, target: scenarioConfig.vus }, // Stay at target
    { duration: '1m', target: 0 }, // Ramp-down
  ],
  thresholds: {
    'http_req_duration': [`p(95)<${config.thresholds.api.p95}`],
    'http_req_duration{endpoint:/api/v1/facilities}': ['p(95)<200'],
    'http_req_duration{endpoint:/api/v1/predictions}': ['p(95)<300'],
    'http_req_duration{endpoint:/api/v1/alerts}': ['p(95)<200'],
    'http_req_failed': [`rate<${config.thresholds.errorRate.max}`],
    'api_p95_response_time': ['p(95)<200'],
    'realtime_latency': ['p(95)<2000'],
  },
};

export default function () {
  const baseURL = config.baseURL;

  // Scenario 1: Dashboard load (most common user action)
  const facilitiesRes = apiRequest('GET', `${baseURL}/api/v1/facilities`);
  checkAllSuccessful(facilitiesRes, 200);
  
  const facilities = parseJsonResponse(facilitiesRes);
  if (facilities && facilities.length > 0) {
    const facilityId = randomItem(facilities).id;
    
    // Get facility details
    const facilityRes = apiRequest('GET', `${baseURL}/api/v1/facilities/${facilityId}`);
    checkAllSuccessful(facilityRes, 200);
    
    apiP95ResponseTime.add(facilityRes.timings.duration);
  }
  
  sleep(sleepRandom(1000, 3000));

  // Scenario 2: Predictions dashboard
  const predictionsRes = apiRequest('GET', `${baseURL}/api/v1/predictions?limit=50`);
  checkAllSuccessful(predictionsRes, 300);
  apiP95ResponseTime.add(predictionsRes.timings.duration);
  
  sleep(sleepRandom(500, 2000));

  // Scenario 3: Alerts monitoring
  const alertsRes = apiRequest('GET', `${baseURL}/api/v1/alerts?limit=20`);
  checkAllSuccessful(alertsRes, 200);
  apiP95ResponseTime.add(alertsRes.timings.duration);
  
  sleep(sleepRandom(1000, 2000));

  // Scenario 4: Real-time sensor data
  const sensorRes = apiRequest('GET', `${baseURL}/api/v1/sensor-readings?limit=100`);
  check(sensorRes, {
    'sensor data status is 200': (r) => r.status === 200,
    'real-time latency < 2s': (r) => r.timings.duration < 2000,
  });
  realtimeLatency.add(sensorRes.timings.duration);
  
  sleep(sleepRandom(2000, 5000));

  // Scenario 5: Health check (monitoring)
  const healthRes = apiRequest('GET', `${baseURL}/api/v1/health`);
  check(healthRes, {
    'health check status is 200': (r) => r.status === 200,
    'health check < 100ms': (r) => r.timings.duration < 100,
  });

  sleep(sleepRandom(1000, 3000));
}

export function handleSummary(data) {
  const scenario = __ENV.SCENARIO || 'light';
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  
  return {
    [`../results/load-test-${scenario}-${timestamp}.json`]: JSON.stringify(data, null, 2),
    'stdout': JSON.stringify({
      scenario: scenario,
      metrics: {
        http_req_duration_p95: data.metrics.http_req_duration?.values['p(95)'],
        http_req_duration_p99: data.metrics.http_req_duration?.values['p(99)'],
        http_req_failed_rate: data.metrics.http_req_failed?.values.rate,
        checks_passing_rate: data.metrics.checks?.values.rate,
      },
      thresholds_passed: Object.keys(data.metrics)
        .filter(key => data.metrics[key].thresholds)
        .every(key => 
          Object.values(data.metrics[key].thresholds)
            .every(t => t.ok)
        ),
    }, null, 2),
  };
}
