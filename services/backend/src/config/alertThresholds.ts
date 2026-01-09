/**
 * Alert Thresholds Configuration
 * Defines thresholds for monitoring alerts
 */

export const ALERT_THRESHOLDS = {
  // HTTP error rates
  http: {
    errorRate: {
      warning: 0.05, // 5% error rate
      critical: 0.10, // 10% error rate
    },
    responseTime: {
      warning: 2000, // 2 seconds
      critical: 5000, // 5 seconds
    },
  },

  // Prediction performance
  prediction: {
    errorRate: {
      warning: 0.02, // 2% error rate
      critical: 0.05, // 5% error rate
    },
    responseTime: {
      warning: 5000, // 5 seconds
      critical: 10000, // 10 seconds
    },
  },

  // Database performance
  database: {
    queryTime: {
      warning: 1000, // 1 second
      critical: 2000, // 2 seconds
    },
    connectionPool: {
      warning: 80, // 80% of pool used
      critical: 95, // 95% of pool used
    },
  },

  // System resources
  system: {
    memoryUsage: {
      warning: 80, // 80% memory usage
      critical: 90, // 90% memory usage
    },
    cpuUsage: {
      warning: 70, // 70% CPU usage
      critical: 85, // 85% CPU usage
    },
  },

  // Job execution
  job: {
    executionTime: {
      prediction: {
        warning: 60000, // 1 minute
        critical: 120000, // 2 minutes
      },
      escalation: {
        warning: 30000, // 30 seconds
        critical: 60000, // 1 minute
      },
    },
    failureRate: {
      warning: 0.05, // 5% failure rate
      critical: 0.10, // 10% failure rate
    },
  },

  // Alert system
  alerts: {
    generationRate: {
      warning: 100, // 100 alerts per hour
      critical: 500, // 500 alerts per hour
    },
    criticalAlertsRate: {
      warning: 10, // 10 critical alerts per hour
      critical: 50, // 50 critical alerts per hour
    },
  },
};

export default ALERT_THRESHOLDS;
