/**
 * Prometheus Metrics Configuration
 * Custom metrics for application monitoring
 */

import client from 'prom-client';

// Enable default metrics (CPU, memory, event loop, etc.)
const register = new client.Registry();
client.collectDefaultMetrics({ register });

// Custom metrics

// HTTP request duration
export const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5],
  registers: [register],
});

// HTTP request total
export const httpRequestTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

// Error rate
export const errorRate = new client.Counter({
  name: 'application_errors_total',
  help: 'Total number of application errors',
  labelNames: ['error_type', 'route'],
  registers: [register],
});

// Prediction metrics
export const predictionDuration = new client.Histogram({
  name: 'prediction_duration_seconds',
  help: 'Duration of ML predictions in seconds',
  labelNames: ['model_type'],
  buckets: [0.1, 0.5, 1, 2, 5, 10],
  registers: [register],
});

export const predictionTotal = new client.Counter({
  name: 'predictions_total',
  help: 'Total number of predictions made',
  labelNames: ['model_type', 'status'],
  registers: [register],
});

// Alert metrics
export const alertsGenerated = new client.Counter({
  name: 'alerts_generated_total',
  help: 'Total number of alerts generated',
  labelNames: ['severity', 'alert_type'],
  registers: [register],
});

// Database query metrics
export const dbQueryDuration = new client.Histogram({
  name: 'db_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['operation', 'table'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2],
  registers: [register],
});

// Active connections
export const activeConnections = new client.Gauge({
  name: 'active_connections',
  help: 'Number of active connections',
  labelNames: ['type'],
  registers: [register],
});

// Job execution metrics
export const jobExecutionDuration = new client.Histogram({
  name: 'job_execution_duration_seconds',
  help: 'Duration of scheduled job execution in seconds',
  labelNames: ['job_name'],
  buckets: [1, 5, 10, 30, 60, 120],
  registers: [register],
});

export const jobExecutionTotal = new client.Counter({
  name: 'job_executions_total',
  help: 'Total number of job executions',
  labelNames: ['job_name', 'status'],
  registers: [register],
});

// Report caching metrics
export const reportCacheHitsTotal = new client.Counter({
  name: 'report_cache_hits_total',
  help: 'Total report cache hits',
  labelNames: ['report_type', 'format'],
  registers: [register],
});

export const reportCacheMissesTotal = new client.Counter({
  name: 'report_cache_misses_total',
  help: 'Total report cache misses',
  labelNames: ['report_type', 'format'],
  registers: [register],
});

export const reportCacheSetsTotal = new client.Counter({
  name: 'report_cache_sets_total',
  help: 'Total report cache sets',
  labelNames: ['report_type', 'format'],
  registers: [register],
});

export const reportCacheErrorsTotal = new client.Counter({
  name: 'report_cache_errors_total',
  help: 'Total report cache errors',
  labelNames: ['report_type', 'format'],
  registers: [register],
});

export const reportCacheHitRate = new client.Gauge({
  name: 'report_cache_hit_rate',
  help: 'In-process report cache hit rate (hits/(hits+misses))',
  labelNames: ['report_type', 'format'],
  registers: [register],
});

// Export the registry
export { register };
