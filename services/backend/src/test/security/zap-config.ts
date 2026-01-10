/**
 * OWASP ZAP Configuration
 * Defines settings for automated security scanning
 */

export interface ZapConfig {
  apiKey: string;
  targetUrl: string;
  zapHost: string;
  zapPort: number;
  contextName: string;
  excludedUrls: string[];
}

export const getZapConfig = (): ZapConfig => {
  return {
    apiKey: process.env.ZAP_API_KEY || 'changeme',
    targetUrl: process.env.ZAP_TARGET_URL || 'http://localhost:3001',
    zapHost: process.env.ZAP_HOST || 'localhost',
    zapPort: parseInt(process.env.ZAP_PORT || '8080', 10),
    contextName: 'nt-poc-security-scan',
    excludedUrls: [
      // Exclude metrics and health endpoints from active scans
      '.*/metrics.*',
      '.*/health.*',
      '.*/prometheus.*',
    ],
  };
};

export const zapScanPolicies = {
  // Passive scan - safe, always on
  passive: {
    enabled: true,
    scanners: 'all',
  },
  // Active scan - more aggressive, configure carefully
  active: {
    enabled: true,
    policy: 'Default Policy',
    scanners: {
      sqlInjection: true,
      xss: true,
      pathTraversal: true,
      remoteFileInclusion: true,
      serverSideInclude: true,
      scriptActiveScanning: true,
      remoteOSCommandInjection: true,
      externalRedirect: true,
      crlf: true,
      bufferOverflow: true,
      formatString: true,
      integerOverflow: true,
    },
  },
  // Spider scan - crawl the application
  spider: {
    enabled: true,
    maxDepth: 5,
    maxChildren: 10,
    acceptCookies: true,
  },
};

export const authConfig = {
  // Authentication configuration for authenticated scans
  enabled: true,
  type: 'bearer',
  tokenEndpoint: '/api/v1/auth/login',
  // Test credentials should be in environment
  username: process.env.ZAP_TEST_USER || 'security-test@example.com',
  password: process.env.ZAP_TEST_PASSWORD || 'test-password',
};

export const scanTargets = {
  // Define API endpoints to scan
  endpoints: [
    '/api/v1/facilities',
    '/api/v1/sensor-readings',
    '/api/v1/predictions',
    '/api/v1/alerts',
    '/api/v1/model-performance',
    '/api/v1/ml',
    '/api/v1/jobs',
    '/api/v1/explainability',
    '/api/v1/what-if',
    '/api/v1/comparative-analysis',
  ],
  // Define parameters to fuzz
  queryParams: ['id', 'facilityId', 'limit', 'offset', 'sort', 'filter'],
  bodyParams: ['name', 'description', 'threshold', 'severity', 'metadata'],
};
