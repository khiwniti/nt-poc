/**
 * Chaos Testing Configuration
 */

export const config = {
  // Service endpoints
  services: {
    backend: process.env.BACKEND_URL || 'http://localhost:3000',
    backendProxy: process.env.BACKEND_PROXY_URL || 'http://localhost:3001',
    toxiproxy: process.env.TOXIPROXY_URL || 'http://localhost:8474',
    postgres: process.env.POSTGRES_HOST || 'localhost',
    postgresPort: parseInt(process.env.POSTGRES_PORT || '5432', 10),
    redis: process.env.REDIS_URL || 'redis://localhost:6379',
  },

  // Test timeouts
  timeouts: {
    healthCheck: 5000,
    recovery: 30000,
    serviceRestart: 60000,
    networkLatency: 10000,
  },

  // Chaos scenarios
  scenarios: {
    serviceFailure: {
      enabled: true,
      duration: 30000, // 30 seconds
      targets: ['backend'],
    },
    networkLatency: {
      enabled: true,
      latencyMs: 1000,
      jitterMs: 500,
      duration: 60000, // 1 minute
    },
    databaseFailure: {
      enabled: true,
      duration: 20000, // 20 seconds
      connectionTimeout: 5000,
    },
    redisFailure: {
      enabled: true,
      duration: 15000, // 15 seconds
    },
  },

  // SLA thresholds
  sla: {
    maxErrorRate: 0.05, // 5%
    maxLatencyP95: 2000, // 2 seconds
    minSuccessRate: 0.95, // 95%
  },

  // Test data
  testData: {
    validToken: process.env.TEST_JWT_TOKEN || 'test-token',
    testBatteryId: 'BAT001',
    testFacilityId: 'FAC001',
  },
};

export default config;
