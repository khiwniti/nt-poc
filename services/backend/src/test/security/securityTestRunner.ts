/**
 * Security Test Runner
 * Orchestrates OWASP ZAP scans and generates reports
 */

import { ZapClient } from './zapClient.js';
import { getZapConfig, zapScanPolicies } from './zap-config.js';
import type { Alert } from './zapClient.js';
import * as fs from 'fs';
import * as path from 'path';

export interface ScanOptions {
  runSpider?: boolean;
  runActiveScan?: boolean;
  generateReport?: boolean;
  outputDir?: string;
}

export interface ScanResults {
  totalAlerts: number;
  highRiskAlerts: Alert[];
  mediumRiskAlerts: Alert[];
  lowRiskAlerts: Alert[];
  summary: Record<string, number>;
  reportPath?: string;
}

export class SecurityTestRunner {
  private zap: ZapClient;
  private config: ReturnType<typeof getZapConfig>;

  constructor() {
    this.config = getZapConfig();
    this.zap = new ZapClient(this.config);
  }

  async initialize(): Promise<void> {
    const isAvailable = await this.zap.isAvailable();
    if (!isAvailable) {
      throw new Error(
        `ZAP is not available at ${this.config.zapHost}:${this.config.zapPort}. ` +
        'Start ZAP with: docker run -p 8080:8080 -d zaproxy/zap-stable zap.sh -daemon -host 0.0.0.0 -port 8080 -config api.key=changeme'
      );
    }

    // Create scanning context
    await this.zap.createContext();

    // Include target URL
    const targetPattern = this.config.targetUrl.replace(/https?:\/\//, '') + '.*';
    await this.zap.includeInContext(targetPattern);

    // Exclude unwanted URLs
    for (const excludePattern of this.config.excludedUrls) {
      await this.zap.excludeFromContext(excludePattern);
    }
  }

  async runScan(options: ScanOptions = {}): Promise<ScanResults> {
    const {
      runSpider = true,
      runActiveScan = true,
      generateReport = true,
      outputDir = './security-reports',
    } = options;

    console.log('🔒 Starting security scan...');
    console.log(`Target: ${this.config.targetUrl}`);

    // Initial access
    await this.zap.accessUrl(this.config.targetUrl);
    console.log('✓ Accessed target URL');

    // Spider scan
    if (runSpider && zapScanPolicies.spider.enabled) {
      console.log('🕷️  Starting spider scan...');
      const spiderId = await this.zap.spiderScan(
        this.config.targetUrl,
        zapScanPolicies.spider.maxChildren
      );
      await this.waitForSpider(spiderId);
      console.log('✓ Spider scan complete');
    }

    // Wait for passive scan
    console.log('🔍 Running passive scan...');
    await this.zap.waitForPassiveScan();
    console.log('✓ Passive scan complete');

    // Active scan
    if (runActiveScan && zapScanPolicies.active.enabled) {
      console.log('⚡ Starting active scan...');
      const scanId = await this.zap.activeScan(this.config.targetUrl);
      await this.waitForActiveScan(scanId);
      console.log('✓ Active scan complete');
    }

    // Collect results
    console.log('📊 Collecting results...');
    const alerts = await this.zap.getAlerts(this.config.targetUrl);
    const summary = await this.zap.getAlertsSummary();

    const results: ScanResults = {
      totalAlerts: alerts.length,
      highRiskAlerts: alerts.filter((a) => a.risk === 'High'),
      mediumRiskAlerts: alerts.filter((a) => a.risk === 'Medium'),
      lowRiskAlerts: alerts.filter((a) => a.risk === 'Low'),
      summary,
    };

    // Generate reports
    if (generateReport) {
      results.reportPath = await this.generateReports(alerts, outputDir);
    }

    this.printSummary(results);

    return results;
  }

  private async waitForSpider(scanId: string): Promise<void> {
    let progress = 0;
    while (progress < 100) {
      progress = await this.zap.getSpiderStatus(scanId);
      process.stdout.write(`\r  Progress: ${progress}%`);
      await this.delay(1000);
    }
    console.log();
  }

  private async waitForActiveScan(scanId: string): Promise<void> {
    let progress = 0;
    while (progress < 100) {
      progress = await this.zap.getActiveScanStatus(scanId);
      process.stdout.write(`\r  Progress: ${progress}%`);
      await this.delay(2000);
    }
    console.log();
  }

  private async generateReports(
    alerts: Alert[],
    outputDir: string
  ): Promise<string> {
    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const baseFilename = `security-scan-${timestamp}`;

    // Generate HTML report
    const htmlReport = await this.zap.generateHtmlReport();
    const htmlPath = path.join(outputDir, `${baseFilename}.html`);
    fs.writeFileSync(htmlPath, htmlReport);

    // Generate JSON report
    const jsonReport = await this.zap.generateJsonReport();
    const jsonPath = path.join(outputDir, `${baseFilename}.json`);
    fs.writeFileSync(jsonPath, jsonReport);

    // Generate markdown summary
    const mdReport = this.generateMarkdownSummary(alerts);
    const mdPath = path.join(outputDir, `${baseFilename}.md`);
    fs.writeFileSync(mdPath, mdReport);

    console.log(`\n📄 Reports generated:`);
    console.log(`  - ${htmlPath}`);
    console.log(`  - ${jsonPath}`);
    console.log(`  - ${mdPath}`);

    return outputDir;
  }

  private generateMarkdownSummary(alerts: Alert[]): string {
    const high = alerts.filter((a) => a.risk === 'High');
    const medium = alerts.filter((a) => a.risk === 'Medium');
    const low = alerts.filter((a) => a.risk === 'Low');
    const info = alerts.filter((a) => a.risk === 'Informational');

    let md = '# Security Scan Report\n\n';
    md += `**Date**: ${new Date().toISOString()}\n\n`;
    md += `**Target**: ${this.config.targetUrl}\n\n`;
    md += '## Summary\n\n';
    md += `- 🔴 High Risk: ${high.length}\n`;
    md += `- 🟠 Medium Risk: ${medium.length}\n`;
    md += `- 🟡 Low Risk: ${low.length}\n`;
    md += `- ℹ️ Informational: ${info.length}\n\n`;

    if (high.length > 0) {
      md += '## 🔴 High Risk Alerts\n\n';
      high.forEach((alert) => {
        md += `### ${alert.alert}\n\n`;
        md += `- **URL**: ${alert.url}\n`;
        md += `- **Confidence**: ${alert.confidence}\n`;
        md += `- **Description**: ${alert.description}\n`;
        md += `- **Solution**: ${alert.solution}\n`;
        if (alert.cweid) md += `- **CWE ID**: ${alert.cweid}\n`;
        if (alert.evidence) md += `- **Evidence**: \`${alert.evidence}\`\n`;
        md += '\n';
      });
    }

    if (medium.length > 0) {
      md += '## 🟠 Medium Risk Alerts\n\n';
      medium.forEach((alert) => {
        md += `### ${alert.alert}\n\n`;
        md += `- **URL**: ${alert.url}\n`;
        md += `- **Description**: ${alert.description}\n\n`;
      });
    }

    return md;
  }

  private printSummary(results: ScanResults): void {
    console.log('\n' + '='.repeat(60));
    console.log('SECURITY SCAN SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total Alerts: ${results.totalAlerts}`);
    console.log(`  🔴 High Risk: ${results.highRiskAlerts.length}`);
    console.log(`  🟠 Medium Risk: ${results.mediumRiskAlerts.length}`);
    console.log(`  🟡 Low Risk: ${results.lowRiskAlerts.length}`);
    console.log('='.repeat(60) + '\n');
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
