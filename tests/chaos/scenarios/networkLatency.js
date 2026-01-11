/**
 * Scenario 2: Network Latency Injection
 * Tests system behavior under high network latency conditions
 */

import axios from 'axios';
import { config } from '../config/config.js';
import {
  TestResult,
  ChaosLogger,
  measureLatency,
  sleep,
  injectToxic,
  removeToxic,
  printResults,
} from '../utils/helpers.js';

const PROXY_NAME = 'backend';
const TOXIC_NAME = 'latency_test';

async function measureBaselineLatency() {
  const result = new TestResult('Measure Baseline Latency');
  
  try {
    ChaosLogger.step('Measuring baseline latency...');
    
    const latency = await measureLatency(config.services.backend, '/health', 20);
    
    result.addMetric('avgLatency', `${latency.avg}ms`);
    result.addMetric('p95Latency', `${latency.p95}ms`);
    result.addMetric('successRate', `${(latency.successRate * 100).toFixed(1)}%`);
    
    ChaosLogger.info('Baseline latency:', {
      avg: `${latency.avg}ms`,
      p95: `${latency.p95}ms`,
      successRate: `${(latency.successRate * 100).toFixed(1)}%`,
    });
    
    result.finish(true);
  } catch (error) {
    result.addError(error);
    result.finish(false);
  }
  
  return result;
}

async function injectNetworkLatency() {
  const result = new TestResult('Inject Network Latency');
  
  try {
    ChaosLogger.step('Injecting network latency...');
    
    await injectToxic(PROXY_NAME, TOXIC_NAME, 'latency', {
      latency: config.scenarios.networkLatency.latencyMs,
      jitter: config.scenarios.networkLatency.jitterMs,
    });
    
    ChaosLogger.success(`Injected ${config.scenarios.networkLatency.latencyMs}ms ±${config.scenarios.networkLatency.jitterMs}ms latency`);
    result.finish(true);
  } catch (error) {
    ChaosLogger.error('Failed to inject latency', { error: error.message });
    result.addError(error);
    result.finish(false);
  }
  
  return result;
}

async function testSystemUnderLatency() {
  const result = new TestResult('Test System Under Latency');
  
  try {
    ChaosLogger.step('Testing system under latency...');
    
    await sleep(2000); // Allow latency to stabilize
    
    const latency = await measureLatency(config.services.backendProxy, '/health', 20);
    
    result.addMetric('avgLatency', `${latency.avg}ms`);
    result.addMetric('p95Latency', `${latency.p95}ms`);
    result.addMetric('successRate', `${(latency.successRate * 100).toFixed(1)}%`);
    
    ChaosLogger.info('Latency under stress:', {
      avg: `${latency.avg}ms`,
      p95: `${latency.p95}ms`,
      successRate: `${(latency.successRate * 100).toFixed(1)}%`,
    });
    
    // System should still respond but with higher latency
    const isResilient = latency.successRate >= 0.9 && latency.avg > 500;
    
    if (!isResilient) {
      ChaosLogger.warn('System may not be handling latency as expected');
    }
    
    result.finish(isResilient);
  } catch (error) {
    result.addError(error);
    result.finish(false);
  }
  
  return result;
}

async function removeNetworkLatency() {
  const result = new TestResult('Remove Network Latency');
  
  try {
    ChaosLogger.step('Removing network latency...');
    
    await removeToxic(PROXY_NAME, TOXIC_NAME);
    
    ChaosLogger.success('Latency removed');
    result.finish(true);
  } catch (error) {
    ChaosLogger.error('Failed to remove latency', { error: error.message });
    result.addError(error);
    result.finish(false);
  }
  
  return result;
}

async function verifyRecovery() {
  const result = new TestResult('Verify Latency Recovery');
  
  try {
    ChaosLogger.step('Verifying latency recovery...');
    
    await sleep(2000); // Allow network to stabilize
    
    const latency = await measureLatency(config.services.backend, '/health', 20);
    
    result.addMetric('avgLatency', `${latency.avg}ms`);
    result.addMetric('p95Latency', `${latency.p95}ms`);
    result.addMetric('successRate', `${(latency.successRate * 100).toFixed(1)}%`);
    
    ChaosLogger.info('Recovery latency:', {
      avg: `${latency.avg}ms`,
      p95: `${latency.p95}ms`,
      successRate: `${(latency.successRate * 100).toFixed(1)}%`,
    });
    
    // Should return to baseline levels
    const hasRecovered = latency.avg < 500 && latency.successRate >= 0.95;
    
    result.finish(hasRecovered);
  } catch (error) {
    result.addError(error);
    result.finish(false);
  }
  
  return result;
}

async function runNetworkLatencyScenario() {
  ChaosLogger.info('Starting Network Latency Chaos Scenario');
  console.log('='.repeat(60));
  
  const results = [];
  
  try {
    // 1. Measure baseline
    results.push(await measureBaselineLatency());
    
    // 2. Inject latency
    results.push(await injectNetworkLatency());
    
    // 3. Test under latency
    results.push(await testSystemUnderLatency());
    
    // 4. Remove latency
    results.push(await removeNetworkLatency());
    
    // 5. Verify recovery
    results.push(await verifyRecovery());
  } catch (error) {
    ChaosLogger.error('Scenario error', { error: error.message });
  } finally {
    // Cleanup: ensure toxic is removed
    try {
      await removeToxic(PROXY_NAME, TOXIC_NAME);
    } catch (err) {
      // Ignore if already removed
    }
  }
  
  const stats = printResults(results, 'Network Latency Test Results');
  
  return {
    scenario: 'network-latency',
    stats,
    results,
  };
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runNetworkLatencyScenario()
    .then(report => {
      process.exit(report.stats.failed > 0 ? 1 : 0);
    })
    .catch(error => {
      ChaosLogger.error('Scenario failed', { error: error.message });
      console.error(error);
      process.exit(1);
    });
}

export { runNetworkLatencyScenario };
