/**
 * OWASP ZAP Integration Test
 * End-to-end security scan using OWASP ZAP
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { SecurityTestRunner } from '../securityTestRunner.js';
import { getZapConfig } from '../zap-config.js';

describe('OWASP ZAP Security Scan', () => {
  let runner: SecurityTestRunner;
  const config = getZapConfig();

  beforeAll(async () => {
    runner = new SecurityTestRunner();
    
    // Skip tests if ZAP is not running
    try {
      await runner.initialize();
    } catch (error) {
      console.warn('⚠️  OWASP ZAP is not running. Skipping integration tests.');
      console.warn('   Start ZAP with: npm run security:zap:start');
      return;
    }
  }, 30000);

  it('should run passive security scan', async () => {
    try {
      const results = await runner.runScan({
        runSpider: false,
        runActiveScan: false,
        generateReport: true,
        outputDir: './security-reports',
      });

      expect(results).toBeDefined();
      expect(results.totalAlerts).toBeGreaterThanOrEqual(0);
      
      // Log summary
      console.log(`\nPassive Scan Results:`);
      console.log(`  Total Alerts: ${results.totalAlerts}`);
      console.log(`  High Risk: ${results.highRiskAlerts.length}`);
      console.log(`  Medium Risk: ${results.mediumRiskAlerts.length}`);
      console.log(`  Low Risk: ${results.lowRiskAlerts.length}`);

      // Fail if high-risk vulnerabilities are found
      if (results.highRiskAlerts.length > 0) {
        console.error('\n🔴 High-risk vulnerabilities detected:');
        results.highRiskAlerts.forEach((alert) => {
          console.error(`  - ${alert.alert} at ${alert.url}`);
        });
      }

      expect(results.highRiskAlerts.length).toBe(0);
    } catch (error) {
      if (error instanceof Error && error.message.includes('not available')) {
        console.warn('Skipping test - ZAP not available');
        return;
      }
      throw error;
    }
  }, 120000);

  it('should run spider scan', async () => {
    try {
      const results = await runner.runScan({
        runSpider: true,
        runActiveScan: false,
        generateReport: false,
      });

      expect(results).toBeDefined();
      expect(results.totalAlerts).toBeGreaterThanOrEqual(0);
      
      console.log(`\nSpider Scan Results:`);
      console.log(`  Total Alerts: ${results.totalAlerts}`);
      console.log(`  High Risk: ${results.highRiskAlerts.length}`);
    } catch (error) {
      if (error instanceof Error && error.message.includes('not available')) {
        console.warn('Skipping test - ZAP not available');
        return;
      }
      throw error;
    }
  }, 180000);

  it('should run full active scan', async () => {
    try {
      const results = await runner.runScan({
        runSpider: true,
        runActiveScan: true,
        generateReport: true,
        outputDir: './security-reports',
      });

      expect(results).toBeDefined();
      expect(results.totalAlerts).toBeGreaterThanOrEqual(0);
      
      console.log(`\nActive Scan Results:`);
      console.log(`  Total Alerts: ${results.totalAlerts}`);
      console.log(`  High Risk: ${results.highRiskAlerts.length}`);
      console.log(`  Medium Risk: ${results.mediumRiskAlerts.length}`);
      console.log(`  Low Risk: ${results.lowRiskAlerts.length}`);

      // Fail if critical vulnerabilities are found
      if (results.highRiskAlerts.length > 0) {
        console.error('\n🔴 High-risk vulnerabilities detected:');
        results.highRiskAlerts.forEach((alert) => {
          console.error(`  - ${alert.alert}`);
          console.error(`    URL: ${alert.url}`);
          console.error(`    Description: ${alert.description}`);
          console.error(`    Solution: ${alert.solution}\n`);
        });
      }

      expect(results.highRiskAlerts.length).toBe(0);
      expect(results.mediumRiskAlerts.length).toBeLessThan(5);
    } catch (error) {
      if (error instanceof Error && error.message.includes('not available')) {
        console.warn('Skipping test - ZAP not available');
        return;
      }
      throw error;
    }
  }, 600000); // 10 minutes for full scan
});
