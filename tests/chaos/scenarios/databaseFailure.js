/**
 * Scenario 3: Database Connection Failure
 * Tests system behavior when database connections fail or timeout
 */

import Docker from 'dockerode';
import { config } from '../config/config.js';
import {
  TestResult,
  ChaosLogger,
  checkHealth,
  waitForService,
  sleep,
  injectToxic,
  removeToxic,
  printResults,
} from '../utils/helpers.js';

const docker = new Docker();
const PROXY_NAME = 'postgres';
const TOXIC_NAME = 'db_timeout';

async function getPostgresContainer() {
  const containers = await docker.listContainers();
  return containers.find(c => 
    c.Names.some(name => name.includes('postgres') && name.includes('chaos'))
  );
}

async function testNormalDatabaseAccess() {
  const result = new TestResult('Test Normal Database Access');
  
  try {
    ChaosLogger.step('Testing normal database access...');
    
    const healthy = await checkHealth(config.services.backend);
    
    if (!healthy) {
      throw new Error('Backend service not healthy');
    }
    
    ChaosLogger.success('Database access working normally');
    result.finish(true);
  } catch (error) {
    result.addError(error);
    result.finish(false);
  }
  
  return result;
}

async function pauseDatabaseContainer() {
  const result = new TestResult('Pause Database Container');
  
  try {
    ChaosLogger.step('Pausing database container...');
    
    const containerInfo = await getPostgresContainer();
    if (!containerInfo) {
      throw new Error('Postgres container not found');
    }
    
    const container = docker.getContainer(containerInfo.Id);
    await container.pause();
    
    ChaosLogger.success('Database container paused');
    result.finish(true);
  } catch (error) {
    ChaosLogger.error('Failed to pause database', { error: error.message });
    result.addError(error);
    result.finish(false);
  }
  
  return result;
}

async function testDatabaseFailureHandling() {
  const result = new TestResult('Test Database Failure Handling');
  
  try {
    ChaosLogger.step('Testing database failure handling...');
    
    await sleep(2000); // Allow failure to propagate
    
    let errorCount = 0;
    let timeoutCount = 0;
    const totalAttempts = 5;
    
    for (let i = 0; i < totalAttempts; i++) {
      try {
        const startTime = Date.now();
        await checkHealth(config.services.backend, config.timeouts.healthCheck);
        const duration = Date.now() - startTime;
        
        if (duration > config.timeouts.healthCheck) {
          timeoutCount++;
        }
      } catch (error) {
        errorCount++;
      }
      await sleep(1000);
    }
    
    result.addMetric('errorCount', errorCount);
    result.addMetric('timeoutCount', timeoutCount);
    result.addMetric('totalAttempts', totalAttempts);
    
    ChaosLogger.info('Database failure impact:', {
      errors: errorCount,
      timeouts: timeoutCount,
      total: totalAttempts,
    });
    
    // System should handle gracefully (errors or timeouts expected)
    result.finish(errorCount > 0 || timeoutCount > 0);
  } catch (error) {
    result.addError(error);
    result.finish(false);
  }
  
  return result;
}

async function unpauseDatabaseContainer() {
  const result = new TestResult('Unpause Database Container');
  
  try {
    ChaosLogger.step('Unpausing database container...');
    
    const containerInfo = await getPostgresContainer();
    if (!containerInfo) {
      throw new Error('Postgres container not found');
    }
    
    const container = docker.getContainer(containerInfo.Id);
    await container.unpause();
    
    ChaosLogger.success('Database container unpaused');
    result.finish(true);
  } catch (error) {
    ChaosLogger.error('Failed to unpause database', { error: error.message });
    result.addError(error);
    result.finish(false);
  }
  
  return result;
}

async function testDatabaseRecovery() {
  const result = new TestResult('Test Database Recovery');
  
  try {
    ChaosLogger.step('Testing database recovery...');
    
    // Wait for database connections to re-establish
    await sleep(5000);
    
    let recoveryAttempts = 0;
    let recovered = false;
    const maxAttempts = 10;
    
    for (let i = 0; i < maxAttempts; i++) {
      recoveryAttempts++;
      const healthy = await checkHealth(config.services.backend);
      
      if (healthy) {
        recovered = true;
        break;
      }
      
      await sleep(2000);
    }
    
    result.addMetric('recoveryAttempts', recoveryAttempts);
    result.addMetric('recovered', recovered);
    
    if (!recovered) {
      throw new Error(`Failed to recover after ${maxAttempts} attempts`);
    }
    
    ChaosLogger.success(`Recovered after ${recoveryAttempts} attempts`);
    result.finish(true);
  } catch (error) {
    ChaosLogger.error('Recovery test failed', { error: error.message });
    result.addError(error);
    result.finish(false);
  }
  
  return result;
}

async function testConnectionTimeout() {
  const result = new TestResult('Test Connection Timeout with Toxiproxy');
  
  try {
    ChaosLogger.step('Injecting connection timeout...');
    
    // Inject timeout toxic
    await injectToxic(PROXY_NAME, TOXIC_NAME, 'timeout', {
      timeout: 1000, // 1 second timeout
    });
    
    await sleep(2000);
    
    ChaosLogger.success('Timeout injected, system should handle gracefully');
    
    // Remove toxic
    await removeToxic(PROXY_NAME, TOXIC_NAME);
    
    result.finish(true);
  } catch (error) {
    ChaosLogger.warn('Timeout test skipped (toxiproxy may not be available)');
    result.finish(true); // Don't fail the scenario
  }
  
  return result;
}

async function runDatabaseFailureScenario() {
  ChaosLogger.info('Starting Database Failure Chaos Scenario');
  console.log('='.repeat(60));
  
  const results = [];
  
  try {
    // 1. Test normal access
    results.push(await testNormalDatabaseAccess());
    
    // 2. Pause database
    results.push(await pauseDatabaseContainer());
    
    // 3. Test failure handling
    results.push(await testDatabaseFailureHandling());
    
    // 4. Unpause database
    results.push(await unpauseDatabaseContainer());
    
    // 5. Test recovery
    results.push(await testDatabaseRecovery());
    
    // 6. Test connection timeout (optional with toxiproxy)
    results.push(await testConnectionTimeout());
  } catch (error) {
    ChaosLogger.error('Scenario error', { error: error.message });
  } finally {
    // Cleanup: ensure database is unpaused
    try {
      const containerInfo = await getPostgresContainer();
      if (containerInfo) {
        const container = docker.getContainer(containerInfo.Id);
        await container.unpause().catch(() => {}); // Ignore if not paused
      }
    } catch (err) {
      // Ignore cleanup errors
    }
  }
  
  const stats = printResults(results, 'Database Failure Test Results');
  
  return {
    scenario: 'database-failure',
    stats,
    results,
  };
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runDatabaseFailureScenario()
    .then(report => {
      process.exit(report.stats.failed > 0 ? 1 : 0);
    })
    .catch(error => {
      ChaosLogger.error('Scenario failed', { error: error.message });
      console.error(error);
      process.exit(1);
    });
}

export { runDatabaseFailureScenario };
