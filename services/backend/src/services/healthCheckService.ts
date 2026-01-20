import db from '../config/knex.js';
import { getRedisClient } from '../config/redis.js';
import { getMLOpsClient } from './mlopsClient.js';
import { logger } from '../config/logger.js';
import axios from 'axios';

export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  checks: {
    database: CheckStatus;
    redis: CheckStatus;
    mlops: CheckStatus;
    simulator: CheckStatus;
  };
}

interface CheckStatus {
  status: 'up' | 'down' | 'degraded';
  responseTime?: number;
  message?: string;
  details?: Record<string, unknown>;
}

/**
 * Performs comprehensive health checks on all service dependencies
 */
export async function performHealthCheck(): Promise<HealthCheckResult> {
  const startTime = Date.now();

  // Run all checks in parallel
  const [databaseCheck, redisCheck, mlopsCheck, simulatorCheck] = await Promise.allSettled([
    checkDatabase(),
    checkRedis(),
    checkMLOps(),
    checkSimulator(),
  ]);

  // Extract results
  const checks = {
    database: databaseCheck.status === 'fulfilled' ? databaseCheck.value : createFailedCheck('Database check failed'),
    redis: redisCheck.status === 'fulfilled' ? redisCheck.value : createFailedCheck('Redis check failed'),
    mlops: mlopsCheck.status === 'fulfilled' ? mlopsCheck.value : createFailedCheck('MLOps check failed'),
    simulator:
      simulatorCheck.status === 'fulfilled' ? simulatorCheck.value : createFailedCheck('Simulator check failed'),
  };

  // Determine overall status
  const allUp = Object.values(checks).every((check) => check.status === 'up');
  const anyDown = Object.values(checks).some((check) => check.status === 'down');

  let status: 'healthy' | 'degraded' | 'unhealthy';
  if (allUp) {
    status = 'healthy';
  } else if (anyDown) {
    status = 'unhealthy';
  } else {
    status = 'degraded';
  }

  const result: HealthCheckResult = {
    status,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks,
  };

  logger.info('Health check completed', {
    status,
    duration: Date.now() - startTime,
    checks: Object.entries(checks).map(([name, check]) => ({ name, status: check.status })),
  });

  return result;
}

/**
 * Checks database connectivity and performance
 */
async function checkDatabase(): Promise<CheckStatus> {
  const start = Date.now();

  try {
    // Simple query to verify connection
    await db.raw('SELECT 1 as health_check');

    // Get connection pool stats
    const pool = (db.client as { pool?: { numUsed: () => number; numFree: () => number; size: number } }).pool;
    const poolStats = pool
      ? {
          used: pool.numUsed(),
          free: pool.numFree(),
          size: pool.size,
        }
      : undefined;

    const responseTime = Date.now() - start;

    return {
      status: responseTime < 100 ? 'up' : 'degraded',
      responseTime,
      message: 'Database connection successful',
      details: poolStats,
    };
  } catch (error) {
    logger.error('Database health check failed', { error });
    return {
      status: 'down',
      responseTime: Date.now() - start,
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Checks Redis connectivity and performance
 */
async function checkRedis(): Promise<CheckStatus> {
  const start = Date.now();

  try {
    const redisClient = getRedisClient();
    if (!redisClient) {
      return {
        status: 'degraded',
        message: 'Redis not configured (running in degraded mode)',
      };
    }

    // Ping Redis
    const pong = await redisClient.ping();
    const responseTime = Date.now() - start;

    if (pong !== 'PONG') {
      throw new Error('Unexpected Redis ping response');
    }

    return {
      status: responseTime < 50 ? 'up' : 'degraded',
      responseTime,
      message: 'Redis connection successful',
    };
  } catch (error) {
    logger.error('Redis health check failed', { error });
    return {
      status: 'down',
      responseTime: Date.now() - start,
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Checks MLOps service availability
 */
async function checkMLOps(): Promise<CheckStatus> {
  const start = Date.now();

  try {
    const mlopsClient = getMLOpsClient();
    const isHealthy = await mlopsClient.healthCheck();
    const responseTime = Date.now() - start;

    if (!isHealthy) {
      return {
        status: 'down',
        responseTime,
        message: 'MLOps service is unavailable',
      };
    }

    return {
      status: responseTime < 500 ? 'up' : 'degraded',
      responseTime,
      message: 'MLOps service is available',
    };
  } catch (error) {
    logger.error('MLOps health check failed', { error });
    return {
      status: 'down',
      responseTime: Date.now() - start,
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Checks Simulator service availability
 */
async function checkSimulator(): Promise<CheckStatus> {
  const start = Date.now();

  const simulatorUrl = process.env.SIMULATOR_URL || 'http://localhost:8001';

  try {
    const response = await axios.get(`${simulatorUrl}/api/health`, {
      timeout: 5000,
    });

    const responseTime = Date.now() - start;

    return {
      status: response.status === 200 ? 'up' : 'degraded',
      responseTime,
      message: 'Simulator service is available',
      details: response.data,
    };
  } catch (error) {
    logger.warn('Simulator health check failed', { error });
    // Simulator is optional, so we return degraded instead of down
    return {
      status: 'degraded',
      responseTime: Date.now() - start,
      message: 'Simulator service unavailable (optional)',
    };
  }
}

/**
 * Creates a failed check status
 */
function createFailedCheck(message: string): CheckStatus {
  return {
    status: 'down',
    message,
  };
}

/**
 * Simple liveness check (for K8s liveness probe)
 */
export async function checkLiveness(): Promise<boolean> {
  return true; // If we can execute this, the process is alive
}

/**
 * Readiness check (for K8s readiness probe)
 * Only returns true if critical dependencies are available
 */
export async function checkReadiness(): Promise<boolean> {
  try {
    // Check only critical dependencies for readiness
    const databaseCheck = await checkDatabase();

    // Service is ready if database is up
    return databaseCheck.status === 'up';
  } catch (error) {
    logger.error('Readiness check failed', { error });
    return false;
  }
}
