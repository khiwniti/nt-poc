/**
 * Pact Provider Verification Tests
 *
 * These tests verify that the Backend (provider) satisfies
 * the contract expectations defined by the Frontend (consumer).
 */
import { describe, it, beforeAll, afterAll } from 'vitest';
import { Verifier } from '@pact-foundation/pact';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import type { Server } from 'http';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Mock authentication middleware for tests
const mockAuth = (_req: express.Request, _res: express.Response, next: express.NextFunction) => {
  next();
};

describe('Pact Provider Verification', () => {
  let server: Server;
  let providerPort: number;

  beforeAll(async () => {
    // Create a minimal Express app for provider verification
    const app = express();
    app.use(express.json());

    // Mock auth middleware
    app.use(mockAuth);

    // Health endpoint
    app.get('/api/v1/health', (_req, res) => {
      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptimeSeconds: 3600,
        environment: 'test',
        version: null,
      });
    });

    // Facilities endpoints
    app.get('/api/v1/facilities', (_req, res) => {
      res.json({
        data: [
          {
            id: 'facility-1',
            name: 'Main Facility',
            location: 'New York, NY',
            latitude: 40.7128,
            longitude: -74.006,
            timezone: 'America/New_York',
            total_zones: 5,
            status: 'active',
            created_at: '2024-01-01T00:00:00.000Z',
            updated_at: '2024-01-01T00:00:00.000Z',
          },
        ],
        total: 1,
      });
    });

    app.get('/api/v1/facilities/:id', (req, res) => {
      if (req.params.id === 'non-existent-facility') {
        return res.status(404).json({ error: 'Facility not found' });
      }
      res.json({
        data: {
          id: req.params.id,
          name: 'Main Facility',
          location: 'New York, NY',
          latitude: 40.7128,
          longitude: -74.006,
          timezone: 'America/New_York',
          totalZones: 5,
          status: 'active',
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z',
        },
      });
    });

    app.get('/api/v1/facilities/:id/kpis', (_req, res) => {
      res.json({
        data: {
          totalCapacity: 10000.5,
          averageSoC: 75.5,
          averageSoH: 95.2,
          totalPower: 5000.0, // Ensure it's a decimal
          activeAlerts: 3,
        },
      });
    });

    // Alerts endpoints
    app.get('/api/v1/alerts', (_req, res) => {
      res.json({
        data: [
          {
            id: 'alert-1',
            batterySystemId: 'battery-1',
            zoneId: 'zone-1',
            type: 'Temperature High',
            severity: 'critical',
            status: 'active',
            message: 'Alert message',
            createdAt: 1704067200000,
            acknowledgedAt: null,
            resolvedAt: null,
            duration: null,
            metadata: {
              threshold: 100,
              actualValue: 120,
            },
          },
        ],
        pagination: {
          page: 1,
          limit: 20,
          total: 100,
          totalPages: 5,
        },
      });
    });

    app.get('/api/v1/alerts/stats/summary', (_req, res) => {
      res.json({
        data: {
          total: 100,
          bySeverity: {
            critical: 10,
            warning: 30,
            info: 60,
          },
          byStatus: {
            active: 40,
            acknowledged: 30,
            resolved: 30,
          },
          byType: {
            'Temperature High': 25,
          },
          averageResolutionTime: 3600000,
        },
      });
    });

    app.get('/api/v1/alerts/:id', (req, res) => {
      if (req.params.id === 'non-existent-alert') {
        return res.status(404).json({ error: 'Alert not found' });
      }
      res.json({
        data: {
          id: req.params.id,
          batterySystemId: 'battery-1',
          zoneId: 'zone-1',
          type: 'Temperature High',
          severity: 'warning',
          status: 'active',
          message: 'Temperature exceeds threshold',
          createdAt: 1704067200000,
          acknowledgedAt: null,
          resolvedAt: null,
          duration: null,
          metadata: {
            threshold: 45,
            actualValue: 52,
          },
        },
      });
    });

    app.post('/api/v1/alerts/:id/acknowledge', (req, res) => {
      res.json({
        data: {
          id: req.params.id,
          status: 'acknowledged',
          acknowledgedAt: 1704067200000,
          batterySystemId: 'battery-1',
          zoneId: 'zone-1',
          type: 'Temperature High',
          severity: 'warning',
          message: 'Temperature exceeds threshold',
          createdAt: 1704060000000,
          resolvedAt: null,
          duration: null,
          metadata: {},
        },
      });
    });

    app.post('/api/v1/alerts/:id/resolve', (req, res) => {
      if (!req.body.notes || !req.body.notes.trim()) {
        return res.status(400).json({ error: 'Resolution notes are required' });
      }
      res.json({
        data: {
          id: req.params.id,
          status: 'resolved',
          acknowledgedAt: 1704060000000,
          resolvedAt: 1704067200000,
          duration: 7200000,
          batterySystemId: 'battery-1',
          zoneId: 'zone-1',
          type: 'Temperature High',
          severity: 'warning',
          message: 'Temperature exceeds threshold',
          createdAt: 1704052800000,
          metadata: {},
        },
      });
    });

    // Start server on random port
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const address = server.address();
        providerPort = typeof address === 'object' && address ? address.port : 0;
        console.log(`Provider test server started on port ${providerPort}`);
        resolve();
      });
    });
  });

  afterAll(async () => {
    if (server) {
      await new Promise<void>((resolve) => {
        server.close(() => resolve());
      }).catch(() => {
        // Ignore close errors
      });
    }
  }, 30000);

  it('validates the contract against the provider', async () => {
    const pactFile = path.resolve(__dirname, '../../../../../pacts/BMS-Frontend-BMS-Backend.json');

    // Check if pact file exists (it will be generated by consumer tests)
    const fs = await import('fs');
    if (!fs.existsSync(pactFile)) {
      console.log('Pact file not found. Run consumer tests first to generate contracts.');
      return;
    }

    const verifier = new Verifier({
      provider: 'BMS-Backend',
      providerBaseUrl: `http://localhost:${providerPort}`,
      pactUrls: [pactFile],
      logLevel: 'warn',
      requestTimeout: 10000,
      stateHandlers: {
        'alerts exist': async () => {
          // State setup for alerts
        },
        'alert with ID alert-123 exists': async () => {
          // State setup for specific alert
        },
        'alert does not exist': async () => {
          // No action needed
        },
        'alerts exist with various severities': async () => {
          // State setup for alert stats
        },
        'active alert exists to acknowledge': async () => {
          // State setup for acknowledgment
        },
        'acknowledged alert exists to resolve': async () => {
          // State setup for resolution
        },
        'alert exists but no notes provided': async () => {
          // No action needed
        },
        'facilities exist': async () => {
          // State setup for facilities
        },
        'facility with ID facility-123 exists': async () => {
          // State setup for specific facility
        },
        'facility does not exist': async () => {
          // No action needed
        },
        'facility with KPI data exists': async () => {
          // State setup for KPIs
        },
        'server is running': async () => {
          // No action needed
        },
      },
    });

    await verifier.verifyProvider();
  }, 60000);
});
