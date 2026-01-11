/**
 * Pact Consumer Tests - Alerts API
 *
 * These tests define the contract expectations for the Alerts API
 * from the consumer (Frontend) perspective.
 */
import { describe, it, expect } from 'vitest';
import { MatchersV3 } from '@pact-foundation/pact';
import { createPact } from './pact.config';
import fetch from 'node-fetch';

const { eachLike, like, integer, string, regex } = MatchersV3;

describe('Alerts API Consumer Contract Tests', () => {
  const pact = createPact();

  describe('GET /api/v1/alerts', () => {
    it('returns a list of alerts with pagination', async () => {
      await pact
        .addInteraction()
        .given('alerts exist')
        .uponReceiving('a request to get alerts list')
        .withRequest('GET', '/api/v1/alerts', (builder) => {
          builder.headers({
            Authorization: like('Bearer test-token'),
          });
          builder.query({
            page: '1',
            limit: '20',
          });
        })
        .willRespondWith(200, (builder) => {
          builder.headers({ 'Content-Type': 'application/json' });
          builder.jsonBody({
            data: eachLike({
              id: string('alert-1'),
              batterySystemId: string('battery-1'),
              zoneId: string('zone-1'),
              type: string('Temperature High'),
              severity: regex('critical|warning|info', 'critical'),
              status: regex('active|acknowledged|resolved', 'active'),
              message: string('Alert message'),
              createdAt: integer(1704067200000),
              acknowledgedAt: like(null),
              resolvedAt: like(null),
              duration: like(null),
              metadata: like({
                threshold: integer(100),
                actualValue: integer(120),
              }),
            }),
            pagination: {
              page: integer(1),
              limit: integer(20),
              total: integer(100),
              totalPages: integer(5),
            },
          });
        })
        .executeTest(async (mockServer) => {
          const response = await fetch(`${mockServer.url}/api/v1/alerts?page=1&limit=20`, {
            headers: {
              Authorization: 'Bearer test-token',
            },
          });

          expect(response.status).toBe(200);
          const data = await response.json();
          expect(data).toHaveProperty('data');
          expect(data).toHaveProperty('pagination');
          expect(Array.isArray(data.data)).toBe(true);
        });
    });
  });

  describe('GET /api/v1/alerts/:id', () => {
    it('returns a single alert by ID', async () => {
      const alertId = 'alert-123';

      await pact
        .addInteraction()
        .given('alert with ID alert-123 exists')
        .uponReceiving('a request to get a single alert')
        .withRequest('GET', `/api/v1/alerts/${alertId}`, (builder) => {
          builder.headers({
            Authorization: like('Bearer test-token'),
          });
        })
        .willRespondWith(200, (builder) => {
          builder.headers({ 'Content-Type': 'application/json' });
          builder.jsonBody({
            data: {
              id: string('alert-123'),
              batterySystemId: string('battery-1'),
              zoneId: string('zone-1'),
              type: string('Temperature High'),
              severity: regex('critical|warning|info', 'warning'),
              status: regex('active|acknowledged|resolved', 'active'),
              message: string('Temperature exceeds threshold'),
              createdAt: integer(1704067200000),
              acknowledgedAt: like(null),
              resolvedAt: like(null),
              duration: like(null),
              metadata: like({
                threshold: integer(45),
                actualValue: integer(52),
              }),
            },
          });
        })
        .executeTest(async (mockServer) => {
          const response = await fetch(`${mockServer.url}/api/v1/alerts/${alertId}`, {
            headers: {
              Authorization: 'Bearer test-token',
            },
          });

          expect(response.status).toBe(200);
          const data = await response.json();
          expect(data.data.id).toBe('alert-123');
        });
    });

    it('returns 404 for non-existent alert', async () => {
      const alertId = 'non-existent-alert';

      await pact
        .addInteraction()
        .given('alert does not exist')
        .uponReceiving('a request for a non-existent alert')
        .withRequest('GET', `/api/v1/alerts/${alertId}`, (builder) => {
          builder.headers({
            Authorization: like('Bearer test-token'),
          });
        })
        .willRespondWith(404, (builder) => {
          builder.headers({ 'Content-Type': 'application/json' });
          builder.jsonBody({
            error: string('Alert not found'),
          });
        })
        .executeTest(async (mockServer) => {
          const response = await fetch(`${mockServer.url}/api/v1/alerts/${alertId}`, {
            headers: {
              Authorization: 'Bearer test-token',
            },
          });

          expect(response.status).toBe(404);
        });
    });
  });

  describe('GET /api/v1/alerts/stats/summary', () => {
    it('returns alert statistics', async () => {
      await pact
        .addInteraction()
        .given('alerts exist with various severities')
        .uponReceiving('a request to get alert statistics')
        .withRequest('GET', '/api/v1/alerts/stats/summary', (builder) => {
          builder.headers({
            Authorization: like('Bearer test-token'),
          });
        })
        .willRespondWith(200, (builder) => {
          builder.headers({ 'Content-Type': 'application/json' });
          builder.jsonBody({
            data: {
              total: integer(100),
              bySeverity: {
                critical: integer(10),
                warning: integer(30),
                info: integer(60),
              },
              byStatus: {
                active: integer(40),
                acknowledged: integer(30),
                resolved: integer(30),
              },
              byType: like({
                'Temperature High': integer(25),
              }),
              averageResolutionTime: integer(3600000),
            },
          });
        })
        .executeTest(async (mockServer) => {
          const response = await fetch(`${mockServer.url}/api/v1/alerts/stats/summary`, {
            headers: {
              Authorization: 'Bearer test-token',
            },
          });

          expect(response.status).toBe(200);
          const data = await response.json();
          expect(data.data).toHaveProperty('total');
          expect(data.data).toHaveProperty('bySeverity');
          expect(data.data).toHaveProperty('byStatus');
        });
    });
  });

  describe('POST /api/v1/alerts/:id/acknowledge', () => {
    it('acknowledges an alert', async () => {
      const alertId = 'alert-to-acknowledge';

      await pact
        .addInteraction()
        .given('active alert exists to acknowledge')
        .uponReceiving('a request to acknowledge an alert')
        .withRequest('POST', `/api/v1/alerts/${alertId}/acknowledge`, (builder) => {
          builder.headers({
            Authorization: like('Bearer test-token'),
            'Content-Type': 'application/json',
          });
        })
        .willRespondWith(200, (builder) => {
          builder.headers({ 'Content-Type': 'application/json' });
          builder.jsonBody({
            data: {
              id: string(alertId),
              status: string('acknowledged'),
              acknowledgedAt: integer(1704067200000),
              batterySystemId: string('battery-1'),
              zoneId: string('zone-1'),
              type: string('Temperature High'),
              severity: regex('critical|warning|info', 'warning'),
              message: string('Temperature exceeds threshold'),
              createdAt: integer(1704060000000),
              resolvedAt: like(null),
              duration: like(null),
              metadata: like({}),
            },
          });
        })
        .executeTest(async (mockServer) => {
          const response = await fetch(`${mockServer.url}/api/v1/alerts/${alertId}/acknowledge`, {
            method: 'POST',
            headers: {
              Authorization: 'Bearer test-token',
              'Content-Type': 'application/json',
            },
          });

          expect(response.status).toBe(200);
          const data = await response.json();
          expect(data.data.status).toBe('acknowledged');
        });
    });
  });

  describe('POST /api/v1/alerts/:id/resolve', () => {
    it('resolves an alert with notes', async () => {
      const alertId = 'alert-to-resolve';

      await pact
        .addInteraction()
        .given('acknowledged alert exists to resolve')
        .uponReceiving('a request to resolve an alert')
        .withRequest('POST', `/api/v1/alerts/${alertId}/resolve`, (builder) => {
          builder.headers({
            Authorization: like('Bearer test-token'),
            'Content-Type': 'application/json',
          });
          builder.jsonBody({
            notes: string('Issue resolved after maintenance'),
          });
        })
        .willRespondWith(200, (builder) => {
          builder.headers({ 'Content-Type': 'application/json' });
          builder.jsonBody({
            data: {
              id: string(alertId),
              status: string('resolved'),
              acknowledgedAt: integer(1704060000000),
              resolvedAt: integer(1704067200000),
              duration: integer(7200000),
              batterySystemId: string('battery-1'),
              zoneId: string('zone-1'),
              type: string('Temperature High'),
              severity: regex('critical|warning|info', 'warning'),
              message: string('Temperature exceeds threshold'),
              createdAt: integer(1704052800000),
              metadata: like({}),
            },
          });
        })
        .executeTest(async (mockServer) => {
          const response = await fetch(`${mockServer.url}/api/v1/alerts/${alertId}/resolve`, {
            method: 'POST',
            headers: {
              Authorization: 'Bearer test-token',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              notes: 'Issue resolved after maintenance',
            }),
          });

          expect(response.status).toBe(200);
          const data = await response.json();
          expect(data.data.status).toBe('resolved');
        });
    });

    it('returns 400 when notes are missing', async () => {
      const alertId = 'alert-missing-notes';

      await pact
        .addInteraction()
        .given('alert exists but no notes provided')
        .uponReceiving('a request to resolve an alert without notes')
        .withRequest('POST', `/api/v1/alerts/${alertId}/resolve`, (builder) => {
          builder.headers({
            Authorization: like('Bearer test-token'),
            'Content-Type': 'application/json',
          });
          builder.jsonBody({});
        })
        .willRespondWith(400, (builder) => {
          builder.headers({ 'Content-Type': 'application/json' });
          builder.jsonBody({
            error: string('Resolution notes are required'),
          });
        })
        .executeTest(async (mockServer) => {
          const response = await fetch(`${mockServer.url}/api/v1/alerts/${alertId}/resolve`, {
            method: 'POST',
            headers: {
              Authorization: 'Bearer test-token',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({}),
          });

          expect(response.status).toBe(400);
        });
    });
  });
});
