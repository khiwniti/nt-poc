/**
 * OWASP ZAP API Client
 * Wrapper for interacting with ZAP's REST API
 */

import axios, { AxiosInstance } from 'axios';
import type { ZapConfig } from './zap-config.js';

export interface ScanResult {
  scanId: string;
  progress: number;
  status: string;
}

export interface Alert {
  id: string;
  alert: string;
  risk: 'High' | 'Medium' | 'Low' | 'Informational';
  confidence: 'High' | 'Medium' | 'Low';
  url: string;
  description: string;
  solution: string;
  evidence?: string;
  cweid?: string;
  wascid?: string;
}

export class ZapClient {
  private client: AxiosInstance;
  private config: ZapConfig;

  constructor(config: ZapConfig) {
    this.config = config;
    this.client = axios.create({
      baseURL: `http://${config.zapHost}:${config.zapPort}`,
      params: {
        apikey: config.apiKey,
      },
    });
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await this.client.get('/JSON/core/view/version/');
      return response.status === 200;
    } catch {
      return false;
    }
  }

  async createContext(): Promise<void> {
    await this.client.get('/JSON/context/action/newContext/', {
      params: {
        contextName: this.config.contextName,
      },
    });
  }

  async includeInContext(regex: string): Promise<void> {
    await this.client.get('/JSON/context/action/includeInContext/', {
      params: {
        contextName: this.config.contextName,
        regex,
      },
    });
  }

  async excludeFromContext(regex: string): Promise<void> {
    await this.client.get('/JSON/context/action/excludeFromContext/', {
      params: {
        contextName: this.config.contextName,
        regex,
      },
    });
  }

  async accessUrl(url: string): Promise<void> {
    await this.client.get('/JSON/core/action/accessUrl/', {
      params: { url },
    });
  }

  async spiderScan(url: string, maxChildren?: number): Promise<string> {
    const response = await this.client.get('/JSON/spider/action/scan/', {
      params: {
        url,
        maxChildren,
        contextName: this.config.contextName,
      },
    });
    return response.data.scan;
  }

  async getSpiderStatus(scanId: string): Promise<number> {
    const response = await this.client.get('/JSON/spider/view/status/', {
      params: { scanId },
    });
    return parseInt(response.data.status, 10);
  }

  async activeScan(url: string): Promise<string> {
    const response = await this.client.get('/JSON/ascan/action/scan/', {
      params: {
        url,
        contextName: this.config.contextName,
        recurse: true,
      },
    });
    return response.data.scan;
  }

  async getActiveScanStatus(scanId: string): Promise<number> {
    const response = await this.client.get('/JSON/ascan/view/status/', {
      params: { scanId },
    });
    return parseInt(response.data.status, 10);
  }

  async getAlerts(baseUrl?: string, risk?: string): Promise<Alert[]> {
    const response = await this.client.get('/JSON/core/view/alerts/', {
      params: {
        baseurl: baseUrl,
        risk,
      },
    });
    return response.data.alerts || [];
  }

  async getAlertsSummary(): Promise<Record<string, number>> {
    const response = await this.client.get('/JSON/core/view/alertsSummary/', {
      params: {
        baseurl: this.config.targetUrl,
      },
    });
    return response.data;
  }

  async generateHtmlReport(): Promise<string> {
    const response = await this.client.get('/OTHER/core/other/htmlreport/');
    return response.data;
  }

  async generateJsonReport(): Promise<string> {
    const response = await this.client.get('/JSON/core/view/alerts/');
    return JSON.stringify(response.data, null, 2);
  }

  async shutdown(): Promise<void> {
    try {
      await this.client.get('/JSON/core/action/shutdown/');
    } catch {
      // Ignore errors on shutdown
    }
  }

  async waitForPassiveScan(): Promise<void> {
    let recordsToScan = 1;
    while (recordsToScan > 0) {
      const response = await this.client.get(
        '/JSON/pscan/view/recordsToScan/'
      );
      recordsToScan = parseInt(response.data.recordsToScan, 10);
      if (recordsToScan > 0) {
        await this.delay(1000);
      }
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
