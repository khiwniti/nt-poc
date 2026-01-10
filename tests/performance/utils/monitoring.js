// Resource Utilization Monitoring Script
// Monitors system resources during k6 tests
import http from 'k6/http';
import { check } from 'k6';
import { Trend, Gauge } from 'k6/metrics';
import { config } from '../config.js';

// Resource metrics
const cpuUsage = new Gauge('cpu_usage_percent');
const memoryUsage = new Gauge('memory_usage_percent');
const activeConnections = new Gauge('active_connections');
const responseTime = new Trend('response_time_ms');

export function monitorResources(baseURL) {
  // Monitor via metrics endpoint
  const metricsRes = http.get(`${baseURL}/metrics`, {
    tags: { endpoint: 'metrics' },
  });

  if (metricsRes.status === 200 || metricsRes.status === 401) {
    // Parse Prometheus metrics (basic parsing)
    const body = metricsRes.body;
    
    // Extract CPU usage if available
    const cpuMatch = body.match(/process_cpu_percent{.*?}\s+(\d+\.?\d*)/);
    if (cpuMatch) {
      cpuUsage.add(parseFloat(cpuMatch[1]));
    }
    
    // Extract memory usage if available
    const memMatch = body.match(/nodejs_heap_size_used_bytes{.*?}\s+(\d+)/);
    if (memMatch) {
      const heapUsed = parseInt(memMatch[1]);
      memoryUsage.add(heapUsed / (1024 * 1024)); // Convert to MB
    }
    
    // Extract active connections
    const connMatch = body.match(/http_requests_in_flight{.*?}\s+(\d+)/);
    if (connMatch) {
      activeConnections.add(parseInt(connMatch[1]));
    }
  }

  // Monitor health endpoint for response time
  const healthRes = http.get(`${baseURL}/api/v1/health`);
  if (healthRes.status === 200) {
    responseTime.add(healthRes.timings.duration);
  }

  return {
    metricsAvailable: metricsRes.status === 200,
    healthy: healthRes.status === 200,
  };
}

export function checkResourceThresholds(cpuPercent, memoryMB) {
  return check({ cpu: cpuPercent, memory: memoryMB }, {
    'CPU usage < 80%': (r) => r.cpu < 80,
    'Memory usage < 1GB': (r) => r.memory < 1024,
  });
}
