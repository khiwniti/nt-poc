/**
 * Scenario 5: System Recovery Validation
 * Comprehensive test of system recovery capabilities
 */

import { config } from '../config/config.js';
import {
  TestResult,
  ChaosLogger,
  checkHealth,
  measureLatency,
  sleep,
  printResults,
} from '../utils/helpers.js';

async function testHealthEndpoint() {
  const result = new TestResult('Validate Health Endpoint');
  
  try {
    ChaosLogger.step('Testing health endpoint...');
    
    const healthy = await checkHealth(config.services.backend);
    
    if (!healthy) {
      throw new Error('Health endpoint not responding');
    }
    
    ChaosLogger.success('Health endpoint is functional');
    result.finish(true);
  } catch (error) {
    result.addError(error);
    result.finish(false);
  }
  
  return result;
}

async function testResponseTimes() {
  const result = new TestResult('Validate Response Times');
  
  try {
    ChaosLogger.step('Measuring response times...');
    
    const latency = await measureLatency(config.services.backend, '/health', 30);
    
    result.addMetric('avgLatency', `${latency.avg}ms`);
    result.addMetric('p95Latency', `${latency.p95}ms`);
    result.addMetric('p99Latency', `${latency.p99}ms`);
    result.addMetric('successRate', `${(latency.successRate * 100).toFixed(1)}%`);
    
    ChaosLogger.info('Response time metrics:', {
      avg: `${latency.avg}ms`,
      p95: `${latency.p95}ms`,
      p99: `${latency.p99}ms`,
      successRate: `${(latency.successRate * 100).toFixed(1)}%`,
    });
    
    // Validate against SLA
    const meetsLatencySLA = latency.p95 <= config.sla.maxLatencyP95;
    const meetsSuccessSLA = latency.successRate >= config.sla.minSuccessRate;
    
    if (!meetsLatencySLA) {
      ChaosLogger.warn(`P95 latency (${latency.p95}ms) exceeds SLA (${config.sla.maxLatencyP95}ms)`);
    }
    
    if (!meetsSuccessSLA) {
      ChaosLogger.warn(`Success rate (${(latency.successRate * 100).toFixed(1)}%) below SLA (${(config.sla.minSuccessRate * 100)}%)`);
    }
    
    result.finish(meetsLatencySLA && meetsSuccessSLA);
  } catch (error) {
    result.addError(error);
    result.finish(false);
  }
  
  return result;
}

async function testErrorRate() {
  const result = new TestResult('Validate Error Rate');
  
  try {
    ChaosLogger.step('Testing error rate...');
    
    let errorCount = 0;
    let successCount = 0;
    const totalRequests = 50;
    
    for (let i = 0; i < totalRequests; i++) {
      try {
        const healthy = await checkHealth(config.services.backend, 5000);
        if (healthy) {
          successCount++;
        } else {
          errorCount++;
        }
      } catch (error) {
        errorCount++;
      }
      await sleep(100);
    }
    
    const errorRate = errorCount / totalRequests;
    
    result.addMetric('errorCount', errorCount);
    result.addMetric('successCount', successCount);
    result.addMetric('errorRate', `${(errorRate * 100).toFixed(2)}%`);
    
    ChaosLogger.info('Error rate metrics:', {
      errors: errorCount,
      successes: successCount,
      errorRate: `${(errorRate * 100).toFixed(2)}%`,
    });
    
    // Validate against SLA
    const meetsErrorSLA = errorRate <= config.sla.maxErrorRate;
    
    if (!meetsErrorSLA) {
      ChaosLogger.warn(`Error rate (${(errorRate * 100).toFixed(2)}%) exceeds SLA (${(config.sla.maxErrorRate * 100)}%)`);
    }
    
    result.finish(meetsErrorSLA);
  } catch (error) {
    result.addError(error);
    result.finish(false);
  }
  
  return result;
}

async function testSystemStability() {
  const result = new TestResult('Validate System Stability');
  
  try {
    ChaosLogger.step('Testing system stability over time...');
    
    const samples = 20;
    const interval = 2000; // 2 seconds
    let stableCount = 0;
    
    for (let i = 0; i < samples; i++) {
      const healthy = await checkHealth(config.services.backend);
      if (healthy) stableCount++;
      await sleep(interval);
    }
    
    const stabilityRate = stableCount / samples;
    
    result.addMetric('stableCount', stableCount);
    result.addMetric('totalSamples', samples);
    result.addMetric('stabilityRate', `${(stabilityRate * 100).toFixed(1)}%`);
    result.addMetric('testDuration', `${(samples * interval) / 1000}s`);
    
    ChaosLogger.info('Stability metrics:', {
      stable: stableCount,
      total: samples,
      stabilityRate: `${(stabilityRate * 100).toFixed(1)}%`,
    });
    
    // System should be stable (>95% uptime)
    const isStable = stabilityRate >= 0.95;
    
    result.finish(isStable);
  } catch (error) {
    result.addError(error);
    result.finish(false);
  }
  
  return result;
}

async function testResourceRecovery() {
  const result = new TestResult('Validate Resource Recovery');
  
  try {
    ChaosLogger.step('Testing resource recovery...');
    
    // Make rapid requests to test resource handling
    const promises = [];
    for (let i = 0; i < 100; i++) {
      promises.push(
        checkHealth(config.services.backend, 5000).catch(() => false)
      );
    }
    
    const results = await Promise.all(promises);
    const successCount = results.filter(r => r === true).length;
    const successRate = successCount / results.length;
    
    result.addMetric('totalRequests', results.length);
    result.addMetric('successCount', successCount);
    result.addMetric('successRate', `${(successRate * 100).toFixed(1)}%`);
    
    ChaosLogger.info('Resource handling:', {
      total: results.length,
      successful: successCount,
      successRate: `${(successRate * 100).toFixed(1)}%`,
    });
    
    // Should handle load without exhausting resources
    const handlesLoad = successRate >= 0.90;
    
    result.finish(handlesLoad);
  } catch (error) {
    result.addError(error);
    result.finish(false);
  }
  
  return result;
}

async function runRecoveryValidationScenario() {
  ChaosLogger.info('Starting System Recovery Validation Scenario');
  console.log('='.repeat(60));
  
  const results = [];
  
  // 1. Health endpoint
  results.push(await testHealthEndpoint());
  
  // 2. Response times
  results.push(await testResponseTimes());
  
  // 3. Error rate
  results.push(await testErrorRate());
  
  // 4. System stability
  results.push(await testSystemStability());
  
  // 5. Resource recovery
  results.push(await testResourceRecovery());
  
  const stats = printResults(results, 'System Recovery Validation Results');
  
  return {
    scenario: 'recovery-validation',
    stats,
    results,
  };
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runRecoveryValidationScenario()
    .then(report => {
      process.exit(report.stats.failed > 0 ? 1 : 0);
    })
    .catch(error => {
      ChaosLogger.error('Scenario failed', { error: error.message });
      console.error(error);
      process.exit(1);
    });
}

export { runRecoveryValidationScenario };
