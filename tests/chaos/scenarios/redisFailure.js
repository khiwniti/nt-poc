/**
 * Scenario 4: Redis Unavailability
 * Tests system behavior when Redis cache is unavailable
 */

import Docker from 'dockerode';
import { config } from '../config/config.js';
import {
  TestResult,
  ChaosLogger,
  checkHealth,
  sleep,
  printResults,
} from '../utils/helpers.js';

const docker = new Docker();

async function getRedisContainer() {
  const containers = await docker.listContainers();
  return containers.find(c => 
    c.Names.some(name => name.includes('redis') && name.includes('chaos'))
  );
}

async function testSystemWithRedis() {
  const result = new TestResult('Test System With Redis Available');
  
  try {
    ChaosLogger.step('Testing system with Redis available...');
    
    const healthy = await checkHealth(config.services.backend);
    
    if (!healthy) {
      throw new Error('Backend service not healthy');
    }
    
    ChaosLogger.success('System working normally with Redis');
    result.finish(true);
  } catch (error) {
    result.addError(error);
    result.finish(false);
  }
  
  return result;
}

async function stopRedisContainer() {
  const result = new TestResult('Stop Redis Container');
  
  try {
    ChaosLogger.step('Stopping Redis container...');
    
    const containerInfo = await getRedisContainer();
    if (!containerInfo) {
      throw new Error('Redis container not found');
    }
    
    const container = docker.getContainer(containerInfo.Id);
    await container.stop();
    
    ChaosLogger.success('Redis container stopped');
    result.finish(true);
  } catch (error) {
    ChaosLogger.error('Failed to stop Redis', { error: error.message });
    result.addError(error);
    result.finish(false);
  }
  
  return result;
}

async function testSystemWithoutRedis() {
  const result = new TestResult('Test System Without Redis');
  
  try {
    ChaosLogger.step('Testing system without Redis...');
    
    await sleep(2000); // Allow Redis failure to propagate
    
    // System should still work, potentially with degraded performance
    let successCount = 0;
    let failCount = 0;
    const totalAttempts = 10;
    
    for (let i = 0; i < totalAttempts; i++) {
      const healthy = await checkHealth(config.services.backend, 5000);
      if (healthy) {
        successCount++;
      } else {
        failCount++;
      }
      await sleep(500);
    }
    
    const successRate = successCount / totalAttempts;
    
    result.addMetric('successCount', successCount);
    result.addMetric('failCount', failCount);
    result.addMetric('successRate', `${(successRate * 100).toFixed(1)}%`);
    
    ChaosLogger.info('System behavior without Redis:', {
      successCount,
      failCount,
      successRate: `${(successRate * 100).toFixed(1)}%`,
    });
    
    // System should still be mostly functional (graceful degradation)
    // Accept at least 70% success rate as Redis should not be critical
    const isResilient = successRate >= 0.7;
    
    if (isResilient) {
      ChaosLogger.success('System demonstrates graceful degradation without Redis');
    } else {
      ChaosLogger.warn('System may be too dependent on Redis');
    }
    
    result.finish(isResilient);
  } catch (error) {
    result.addError(error);
    result.finish(false);
  }
  
  return result;
}

async function startRedisContainer() {
  const result = new TestResult('Start Redis Container');
  
  try {
    ChaosLogger.step('Starting Redis container...');
    
    const containerInfo = await getRedisContainer();
    if (!containerInfo) {
      throw new Error('Redis container not found');
    }
    
    const container = docker.getContainer(containerInfo.Id);
    await container.start();
    
    ChaosLogger.success('Redis container started');
    
    // Wait for Redis to be ready
    await sleep(3000);
    
    result.finish(true);
  } catch (error) {
    ChaosLogger.error('Failed to start Redis', { error: error.message });
    result.addError(error);
    result.finish(false);
  }
  
  return result;
}

async function testSystemRecovery() {
  const result = new TestResult('Test System Recovery After Redis Restart');
  
  try {
    ChaosLogger.step('Testing system recovery...');
    
    // Allow reconnection time
    await sleep(5000);
    
    let successCount = 0;
    const totalAttempts = 10;
    
    for (let i = 0; i < totalAttempts; i++) {
      const healthy = await checkHealth(config.services.backend);
      if (healthy) successCount++;
      await sleep(500);
    }
    
    const successRate = successCount / totalAttempts;
    
    result.addMetric('successCount', successCount);
    result.addMetric('successRate', `${(successRate * 100).toFixed(1)}%`);
    
    ChaosLogger.info('Recovery metrics:', {
      successCount,
      successRate: `${(successRate * 100).toFixed(1)}%`,
    });
    
    // Should return to normal operation
    const hasRecovered = successRate >= 0.95;
    
    result.finish(hasRecovered);
  } catch (error) {
    result.addError(error);
    result.finish(false);
  }
  
  return result;
}

async function testRedisReconnection() {
  const result = new TestResult('Test Redis Reconnection Logic');
  
  try {
    ChaosLogger.step('Testing Redis reconnection...');
    
    // Stop Redis temporarily
    const containerInfo = await getRedisContainer();
    if (!containerInfo) {
      throw new Error('Redis container not found');
    }
    
    const container = docker.getContainer(containerInfo.Id);
    await container.pause();
    
    await sleep(2000);
    
    // Unpause Redis
    await container.unpause();
    
    await sleep(3000);
    
    // System should reconnect automatically
    const healthy = await checkHealth(config.services.backend);
    
    result.addMetric('reconnected', healthy);
    
    if (healthy) {
      ChaosLogger.success('System successfully reconnected to Redis');
    } else {
      ChaosLogger.warn('System may have issues with Redis reconnection');
    }
    
    result.finish(healthy);
  } catch (error) {
    ChaosLogger.error('Reconnection test failed', { error: error.message });
    result.addError(error);
    result.finish(false);
  }
  
  return result;
}

async function runRedisFailureScenario() {
  ChaosLogger.info('Starting Redis Unavailability Chaos Scenario');
  console.log('='.repeat(60));
  
  const results = [];
  
  try {
    // 1. Test with Redis available
    results.push(await testSystemWithRedis());
    
    // 2. Stop Redis
    results.push(await stopRedisContainer());
    
    // 3. Test without Redis (graceful degradation)
    results.push(await testSystemWithoutRedis());
    
    // 4. Start Redis
    results.push(await startRedisContainer());
    
    // 5. Test recovery
    results.push(await testSystemRecovery());
    
    // 6. Test reconnection logic
    results.push(await testRedisReconnection());
  } catch (error) {
    ChaosLogger.error('Scenario error', { error: error.message });
  } finally {
    // Cleanup: ensure Redis is running
    try {
      const containerInfo = await getRedisContainer();
      if (containerInfo) {
        const container = docker.getContainer(containerInfo.Id);
        await container.start().catch(() => {}); // Ignore if already running
        await container.unpause().catch(() => {}); // Ignore if not paused
      }
    } catch (err) {
      // Ignore cleanup errors
    }
  }
  
  const stats = printResults(results, 'Redis Unavailability Test Results');
  
  return {
    scenario: 'redis-failure',
    stats,
    results,
  };
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runRedisFailureScenario()
    .then(report => {
      process.exit(report.stats.failed > 0 ? 1 : 0);
    })
    .catch(error => {
      ChaosLogger.error('Scenario failed', { error: error.message });
      console.error(error);
      process.exit(1);
    });
}

export { runRedisFailureScenario };
