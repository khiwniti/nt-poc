// k6 Performance Test Configuration

export const config = {
  // Base URL for API endpoints
  baseURL: __ENV.BASE_URL || 'http://localhost:3000',
  
  // Performance thresholds (SLA requirements)
  thresholds: {
    api: {
      // API response time: p95 < 200ms
      p95: 200,
      // API response time: p99 < 500ms  
      p99: 500,
      // Max response time: < 2s
      max: 2000,
    },
    realtime: {
      // Real-time data latency: < 2s
      max: 2000,
    },
    errorRate: {
      // Error rate: < 1%
      max: 0.01,
    },
  },

  // Load test scenarios
  scenarios: {
    light: {
      vus: 100,
      duration: '5m',
      description: '100 concurrent users for 5 minutes',
    },
    medium: {
      vus: 500,
      duration: '10m',
      description: '500 concurrent users for 10 minutes',
    },
    heavy: {
      vus: 1000,
      duration: '15m',
      description: '1000 concurrent users for 15 minutes',
    },
  },

  // Test data
  testData: {
    facilities: ['FAC001', 'FAC002', 'FAC003'],
    batteries: ['BAT001', 'BAT002', 'BAT003', 'BAT004', 'BAT005'],
  },
};

export default config;
