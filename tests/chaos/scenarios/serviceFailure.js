/**
 * Scenario 1: Service Failure Simulation
 * Tests system behavior when backend service crashes or becomes unavailable
 */

import Docker from 'dockerode';
import { config } from '../config/config.js';
import {
  TestResult,
  ChaosLogger,
  checkHealth,
  waitForService,
  measureLatency,
  sleep,
  printResults,
} from '../utils/helpers.js';

const docker = new Docker();

async function getBackendContainer() {
  const containers = await docker.listContainers();
  return containers.find(c => 
    c.Names.some(name => name.includes('backend') && name.includes('chaos'))
  );
}

async function stopBackendService() {
  const result = new TestResult('Stop Backend Service');
  
  try {
    ChaosLogger.step('Stopping backend service...');
    const containerInfo = await getBackendContainer();
    
    if (!containerInfo) {
      throw new Error('Backend container not found');
    }
    
    const container = docker.getContainer(containerInfo.Id);
    await container.stop();
    
    ChaosLogger.success('Backend service stopped');
    
    // Verify service is down
    await sleep(2000);
    const isDown = !(await checkHealth(config.services.backend));
    
    if (!isDown) {
      throw new Error('Service still responding after stop');
    }
    
    result.finish(true);
  } catch (error) {
    ChaosLogger.error('Failed to stop backend', { error: error.message });
    result.addError(error);
    result.finish(false);
  }
  
  return result;
}

async function testSystemDuringFailure() {
  const result = new TestResult('Test System During Failure');
  
  try {
    ChaosLogger.step('Testing system behavior during service failure...');
    
    // Attempt multiple requests
    let failedRequests = 0;
    const totalRequests = 10;
    
    for (let i = 0; i < totalRequests; i++) {
      const healthy = await checkHealth(config.services.backend, 2000);
      if (!healthy) failedRequests++;
      await sleep(500);
    }
    
    const failureRate = failedRequests / totalRequests;
    result.addMetric('failureRate', `${(failureRate * 100).toFixed(1)}%`);
    result.addMetric('failedRequests', failedRequests);
    result.addMetric('totalRequests', totalRequests);
    
    ChaosLogger.info(`Failure rate: ${(failureRate * 100).toFixed(1)}%`);
    
    // Should fail as service is down
    result.finish(failureRate > 0.8); // Expect >80% failure when service is down
  } catch (error) {
    result.addError(error);
    result.finish(false);
  }
  
  return result;
}

async function startBackendService() {
  const result = new TestResult('Start Backend Service');
  
  try {
    ChaosLogger.step('Starting backend service...');
    const containerInfo = await getBackendContainer();
    
    if (!containerInfo) {
      throw new Error('Backend container not found');
    }
    
    const container = docker.getContainer(containerInfo.Id);
    await container.start();
    
    ChaosLogger.success('Backend service started');
    result.finish(true);
  } catch (error) {
    ChaosLogger.error('Failed to start backend', { error: error.message });
    result.addError(error);
    result.finish(false);
  }
  
  return result;
}

async function testServiceRecovery() {
  const result = new TestResult('Test Service Recovery');
  
  try {
    ChaosLogger.step('Testing service recovery...');
    
    const recovered = await waitForService(
      config.services.backend,
      30,
      2000
    );
    
    if (!recovered) {
      throw new Error('Service failed to recover within timeout');
    }
    
    // Measure post-recovery latency
    await sleep(5000); // Allow service to stabilize
    const latency = await measureLatency(config.services.backend);
    
    result.addMetric('avgLatency', `${latency.avg}ms`);
    result.addMetric('p95Latency', `${latency.p95}ms`);
    result.addMetric('successRate', `${(latency.successRate * 100).toFixed(1)}%`);
    
    const meetsThreshold = latency.successRate >= config.sla.minSuccessRate;
    
    ChaosLogger.info('Recovery metrics:', {
      avgLatency: `${latency.avg}ms`,
      p95Latency: `${latency.p95}ms`,
      successRate: `${(latency.successRate * 100).toFixed(1)}%`,
    });
    
    result.finish(meetsThreshold);
  } catch (error) {
    ChaosLogger.error('Recovery test failed', { error: error.message });
    result.addError(error);
    result.finish(false);
  }
  
  return result;
}

async function runServiceFailureScenario() {
  ChaosLogger.info('Starting Service Failure Chaos Scenario');
  console.log('='.repeat(60));
  
  const results = [];
  
  // 1. Stop the backend service
  results.push(await stopBackendService());
  
  // 2. Test system during failure
  results.push(await testSystemDuringFailure());
  
  // 3. Start the backend service
  results.push(await startBackendService());
  
  // 4. Test recovery
  results.push(await testServiceRecovery());
  
  const stats = printResults(results, 'Service Failure Test Results');
  
  return {
    scenario: 'service-failure',
    stats,
    results,
  };
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runServiceFailureScenario()
    .then(report => {
      process.exit(report.stats.failed > 0 ? 1 : 0);
    })
    .catch(error => {
      ChaosLogger.error('Scenario failed', { error: error.message });
      console.error(error);
      process.exit(1);
    });
}

export { runServiceFailureScenario };
