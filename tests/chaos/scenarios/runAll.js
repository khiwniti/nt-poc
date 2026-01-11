/**
 * Run All Chaos Testing Scenarios
 * Orchestrates all chaos experiments and generates comprehensive report
 */

import { runServiceFailureScenario } from './serviceFailure.js';
import { runNetworkLatencyScenario } from './networkLatency.js';
import { runDatabaseFailureScenario } from './databaseFailure.js';
import { runRedisFailureScenario } from './redisFailure.js';
import { runRecoveryValidationScenario } from './recoveryValidation.js';
import { ChaosLogger, calculateStats, sleep } from '../utils/helpers.js';
import chalk from 'chalk';

const scenarios = [
  {
    name: 'Service Failure',
    fn: runServiceFailureScenario,
    enabled: true,
  },
  {
    name: 'Network Latency',
    fn: runNetworkLatencyScenario,
    enabled: true,
  },
  {
    name: 'Database Failure',
    fn: runDatabaseFailureScenario,
    enabled: true,
  },
  {
    name: 'Redis Unavailability',
    fn: runRedisFailureScenario,
    enabled: true,
  },
  {
    name: 'Recovery Validation',
    fn: runRecoveryValidationScenario,
    enabled: true,
  },
];

function printHeader() {
  console.log('\n');
  console.log(chalk.bold.cyan('╔════════════════════════════════════════════════════════════╗'));
  console.log(chalk.bold.cyan('║         CHAOS TESTING SUITE - RESILIENCE VALIDATION        ║'));
  console.log(chalk.bold.cyan('╚════════════════════════════════════════════════════════════╝'));
  console.log('\n');
}

function printScenarioSummary(reports) {
  console.log('\n');
  console.log(chalk.bold('═'.repeat(60)));
  console.log(chalk.bold.cyan('CHAOS TESTING SUMMARY'));
  console.log(chalk.bold('═'.repeat(60)));
  
  reports.forEach(report => {
    const icon = report.stats.failed === 0 ? chalk.green('✓') : chalk.red('✗');
    const status = report.stats.failed === 0 ? chalk.green('PASSED') : chalk.red('FAILED');
    
    console.log(`\n${icon} ${chalk.bold(report.scenario.toUpperCase())}: ${status}`);
    console.log(`  Tests: ${report.stats.total} | Passed: ${chalk.green(report.stats.passed)} | Failed: ${chalk.red(report.stats.failed)}`);
    console.log(`  Success Rate: ${report.stats.successRate >= 0.95 ? chalk.green(report.stats.passRate) : chalk.red(report.stats.passRate)}`);
  });
  
  console.log('\n' + chalk.bold('═'.repeat(60)));
  
  // Overall statistics
  const totalTests = reports.reduce((sum, r) => sum + r.stats.total, 0);
  const totalPassed = reports.reduce((sum, r) => sum + r.stats.passed, 0);
  const totalFailed = reports.reduce((sum, r) => sum + r.stats.failed, 0);
  const overallSuccessRate = totalTests > 0 ? totalPassed / totalTests : 0;
  
  console.log(chalk.bold('\nOVERALL RESULTS:'));
  console.log(`  Total Scenarios: ${reports.length}`);
  console.log(`  Total Tests: ${totalTests}`);
  console.log(`  Passed: ${chalk.green(totalPassed)}`);
  console.log(`  Failed: ${chalk.red(totalFailed)}`);
  console.log(`  Success Rate: ${overallSuccessRate >= 0.95 ? chalk.green(`${(overallSuccessRate * 100).toFixed(1)}%`) : chalk.red(`${(overallSuccessRate * 100).toFixed(1)}%`)}`);
  
  console.log('\n' + chalk.bold('═'.repeat(60)) + '\n');
  
  return {
    totalScenarios: reports.length,
    totalTests,
    totalPassed,
    totalFailed,
    overallSuccessRate,
    scenariosPassed: reports.filter(r => r.stats.failed === 0).length,
    scenariosFailed: reports.filter(r => r.stats.failed > 0).length,
  };
}

async function runAllScenarios() {
  printHeader();
  
  ChaosLogger.info('Starting chaos testing suite...');
  ChaosLogger.info(`Running ${scenarios.filter(s => s.enabled).length} scenarios`);
  
  const reports = [];
  const startTime = Date.now();
  
  for (const scenario of scenarios) {
    if (!scenario.enabled) {
      ChaosLogger.warn(`Skipping disabled scenario: ${scenario.name}`);
      continue;
    }
    
    try {
      ChaosLogger.info(`\n${'='.repeat(60)}`);
      ChaosLogger.info(`Starting scenario: ${scenario.name}`);
      ChaosLogger.info('='.repeat(60));
      
      const report = await scenario.fn();
      reports.push(report);
      
      // Cool down period between scenarios
      if (scenarios.indexOf(scenario) < scenarios.length - 1) {
        ChaosLogger.info('Cooling down before next scenario...');
        await sleep(5000);
      }
    } catch (error) {
      ChaosLogger.error(`Scenario ${scenario.name} failed with error`, {
        error: error.message,
        stack: error.stack,
      });
      
      reports.push({
        scenario: scenario.name.toLowerCase().replace(/\s+/g, '-'),
        stats: {
          total: 1,
          passed: 0,
          failed: 1,
          successRate: 0,
          passRate: '0%',
        },
        results: [],
        error: error.message,
      });
    }
  }
  
  const duration = Date.now() - startTime;
  const summary = printScenarioSummary(reports);
  
  ChaosLogger.info(`\nChaos testing completed in ${(duration / 1000).toFixed(1)}s`);
  
  // Generate report file
  const reportData = {
    timestamp: new Date().toISOString(),
    duration: `${(duration / 1000).toFixed(1)}s`,
    summary,
    reports,
  };
  
  // Save report
  await import('fs').then(fs => {
    fs.promises.writeFile(
      'chaos-test-report.json',
      JSON.stringify(reportData, null, 2)
    ).then(() => {
      ChaosLogger.success('Report saved to chaos-test-report.json');
    }).catch(err => {
      ChaosLogger.error('Failed to save report', { error: err.message });
    });
  });
  
  return {
    success: summary.scenariosFailed === 0 && summary.overallSuccessRate >= 0.95,
    summary,
    reports,
  };
}

// Run all scenarios
runAllScenarios()
  .then(result => {
    if (result.success) {
      console.log(chalk.bold.green('\n✓ ALL CHAOS TESTS PASSED\n'));
      process.exit(0);
    } else {
      console.log(chalk.bold.red('\n✗ CHAOS TESTS FAILED\n'));
      process.exit(1);
    }
  })
  .catch(error => {
    ChaosLogger.error('Fatal error running chaos tests', {
      error: error.message,
      stack: error.stack,
    });
    console.error(error);
    process.exit(1);
  });
