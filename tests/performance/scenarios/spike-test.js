// k6 Spike Test - Sudden traffic surge
// Tests system behavior during sudden traffic spikes
import http from 'k6/http';
import { sleep, check } from 'k6';
import { Rate, Trend } from 'k6/metrics';
import { config } from '../config.js';
import { apiRequest, checkAllSuccessful } from '../utils/api.js';

// Custom metrics
const spikeRecoveryTime = new Trend('spike_recovery_time');
const spikeDegradation = new Rate('spike_degradation');

export const options = {
  stages: [
    { duration: '1m', target: 100 },   // Normal load
    { duration: '10s', target: 2000 }, // Sudden spike
    { duration: '3m', target: 2000 },  // Sustained spike
    { duration: '10s', target: 100 },  // Drop back
    { duration: '2m', target: 100 },   // Recovery period
    { duration: '30s', target: 0 },    // Ramp-down
  ],
  thresholds: {
    'http_req_duration': ['p(95)<1000'], // Relaxed during spike
    'http_req_failed': ['rate<0.05'], // Allow 5% errors
    'spike_degradation': ['rate<0.2'], // Less than 20% degraded responses
  },
};

export default function () {
  const baseURL = config.baseURL;
  const startTime = Date.now();

  // Test critical user flows during spike
  const facilitiesRes = apiRequest('GET', `${baseURL}/api/v1/facilities`);
  const isDegraded = facilitiesRes.timings.duration > 500;
  spikeDegradation.add(isDegraded);
  
  check(facilitiesRes, {
    'facilities available during spike': (r) => r.status === 200,
    'facilities responsive': (r) => r.timings.duration < 1000,
  });

  sleep(0.5);

  const predictionsRes = apiRequest('GET', `${baseURL}/api/v1/predictions?limit=10`);
  check(predictionsRes, {
    'predictions available during spike': (r) => r.status === 200,
  });

  const totalTime = Date.now() - startTime;
  spikeRecoveryTime.add(totalTime);

  sleep(1);
}

export function handleSummary(data) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  
  const summary = {
    timestamp: timestamp,
    test_type: 'spike',
    spike_config: {
      baseline_vus: 100,
      spike_vus: 2000,
      spike_duration: '3m10s',
    },
    metrics: {
      http_req_duration_p95: data.metrics.http_req_duration?.values['p(95)'],
      http_req_duration_max: data.metrics.http_req_duration?.values.max,
      http_req_failed_rate: data.metrics.http_req_failed?.values.rate,
      spike_degradation_rate: data.metrics.spike_degradation?.values.rate,
      avg_recovery_time: data.metrics.spike_recovery_time?.values.avg,
    },
    analysis: {
      system_resilient: data.metrics.http_req_failed?.values.rate < 0.05,
      auto_scaling_effective: data.metrics.spike_degradation?.values.rate < 0.2,
    },
  };
  
  return {
    [`../results/spike-test-${timestamp}.json`]: JSON.stringify(summary, null, 2),
    'stdout': JSON.stringify(summary, null, 2),
  };
}
