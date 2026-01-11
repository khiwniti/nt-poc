/**
 * Utility functions for chaos testing
 */

import axios from 'axios';
import chalk from 'chalk';
import { config } from '../config/config.js';

export class TestResult {
  constructor(name) {
    this.name = name;
    this.startTime = Date.now();
    this.endTime = null;
    this.passed = false;
    this.errors = [];
    this.metrics = {};
  }

  finish(passed = true) {
    this.endTime = Date.now();
    this.passed = passed;
    this.duration = this.endTime - this.startTime;
  }

  addError(error) {
    this.errors.push({
      timestamp: Date.now(),
      message: error.message || String(error),
      stack: error.stack,
    });
  }

  addMetric(key, value) {
    this.metrics[key] = value;
  }
}

export class ChaosLogger {
  static info(message, data = {}) {
    console.log(chalk.blue('ℹ'), message, data);
  }

  static success(message, data = {}) {
    console.log(chalk.green('✓'), message, data);
  }

  static error(message, data = {}) {
    console.log(chalk.red('✗'), message, data);
  }

  static warn(message, data = {}) {
    console.log(chalk.yellow('⚠'), message, data);
  }

  static step(message) {
    console.log(chalk.cyan('→'), message);
  }
}

export async function checkHealth(url, timeout = 5000) {
  try {
    const response = await axios.get(`${url}/health`, { timeout });
    return response.status === 200;
  } catch (error) {
    return false;
  }
}

export async function waitForService(url, maxAttempts = 30, delayMs = 1000) {
  ChaosLogger.step(`Waiting for service: ${url}`);
  
  for (let i = 0; i < maxAttempts; i++) {
    const healthy = await checkHealth(url);
    if (healthy) {
      ChaosLogger.success(`Service is healthy after ${i + 1} attempts`);
      return true;
    }
    await sleep(delayMs);
  }
  
  ChaosLogger.error(`Service failed to become healthy after ${maxAttempts} attempts`);
  return false;
}

export async function measureLatency(url, endpoint = '/health', samples = 10) {
  const latencies = [];
  
  for (let i = 0; i < samples; i++) {
    const start = Date.now();
    try {
      await axios.get(`${url}${endpoint}`, { timeout: 10000 });
      const latency = Date.now() - start;
      latencies.push(latency);
    } catch (error) {
      latencies.push(-1); // Failed request
    }
    await sleep(100);
  }
  
  const validLatencies = latencies.filter(l => l > 0);
  if (validLatencies.length === 0) {
    return { avg: -1, p95: -1, p99: -1, successRate: 0 };
  }
  
  validLatencies.sort((a, b) => a - b);
  const avg = validLatencies.reduce((sum, l) => sum + l, 0) / validLatencies.length;
  const p95Index = Math.floor(validLatencies.length * 0.95);
  const p99Index = Math.floor(validLatencies.length * 0.99);
  
  return {
    avg: Math.round(avg),
    p95: validLatencies[p95Index] || validLatencies[validLatencies.length - 1],
    p99: validLatencies[p99Index] || validLatencies[validLatencies.length - 1],
    successRate: validLatencies.length / samples,
  };
}

export async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function injectToxic(proxyName, toxicName, toxicType, attributes) {
  try {
    const response = await axios.post(
      `${config.services.toxiproxy}/proxies/${proxyName}/toxics`,
      {
        name: toxicName,
        type: toxicType,
        attributes,
      }
    );
    return response.data;
  } catch (error) {
    throw new Error(`Failed to inject toxic: ${error.message}`);
  }
}

export async function removeToxic(proxyName, toxicName) {
  try {
    await axios.delete(
      `${config.services.toxiproxy}/proxies/${proxyName}/toxics/${toxicName}`
    );
  } catch (error) {
    throw new Error(`Failed to remove toxic: ${error.message}`);
  }
}

export async function runWithTimeout(fn, timeoutMs, timeoutMessage = 'Operation timed out') {
  return Promise.race([
    fn(),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs)
    ),
  ]);
}

export function calculateStats(results) {
  const total = results.length;
  const passed = results.filter(r => r.passed).length;
  const failed = total - passed;
  const successRate = total > 0 ? passed / total : 0;
  
  return {
    total,
    passed,
    failed,
    successRate,
    passRate: `${(successRate * 100).toFixed(1)}%`,
  };
}

export function printResults(results, title = 'Test Results') {
  console.log('\n' + chalk.bold('='.repeat(60)));
  console.log(chalk.bold(title));
  console.log(chalk.bold('='.repeat(60)));
  
  const stats = calculateStats(results);
  
  results.forEach(result => {
    const icon = result.passed ? chalk.green('✓') : chalk.red('✗');
    const duration = result.duration ? `(${result.duration}ms)` : '';
    console.log(`${icon} ${result.name} ${duration}`);
    
    if (result.errors.length > 0) {
      result.errors.forEach(error => {
        console.log(chalk.red(`  Error: ${error.message}`));
      });
    }
    
    if (Object.keys(result.metrics).length > 0) {
      console.log(chalk.gray('  Metrics:'), result.metrics);
    }
  });
  
  console.log('\n' + chalk.bold('Summary:'));
  console.log(`  Total: ${stats.total}`);
  console.log(`  Passed: ${chalk.green(stats.passed)}`);
  console.log(`  Failed: ${chalk.red(stats.failed)}`);
  console.log(`  Success Rate: ${stats.successRate >= 0.95 ? chalk.green(stats.passRate) : chalk.red(stats.passRate)}`);
  console.log('='.repeat(60) + '\n');
  
  return stats;
}
