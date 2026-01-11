/**
 * Pact Consumer Tests - Facilities API
 *
 * These tests define the contract expectations for the Facilities API
 * from the consumer (Frontend) perspective.
 */
import { describe, it, expect } from 'vitest';
import { MatchersV3 } from '@pact-foundation/pact';
import { createPact } from './pact.config';
import fetch from 'node-fetch';

const { eachLike, like, integer, string, regex, decimal } = MatchersV3;

describe('Facilities API Consumer Contract Tests', () => {
  const pact = createPact();

  describe('GET /api/v1/facilities', () => {
    it('returns a list of facilities', async () => {
      await pact
        .addInteraction()
        .given('facilities exist')
        .uponReceiving('a request to get facilities list')
        .withRequest('GET', '/api/v1/facilities', (builder) => {
          builder.headers({
            Authorization: like('Bearer test-token'),
          });
        })
        .willRespondWith(200, (builder) => {
          builder.headers({ 'Content-Type': 'application/json' });
          builder.jsonBody({
            data: eachLike({
              id: string('facility-1'),
              name: string('Main Facility'),
              location: string('New York, NY'),
              latitude: decimal(40.7128),
              longitude: decimal(-74.006),
              timezone: string('America/New_York'),
              total_zones: integer(5),
              status: regex('active|inactive', 'active'),
              created_at: string('2024-01-01T00:00:00.000Z'),
              updated_at: string('2024-01-01T00:00:00.000Z'),
            }),
            total: integer(1),
          });
        })
        .executeTest(async (mockServer) => {
          const response = await fetch(`${mockServer.url}/api/v1/facilities`, {
            headers: {
              Authorization: 'Bearer test-token',
            },
          });

          expect(response.status).toBe(200);
          const data = await response.json();
          expect(data).toHaveProperty('data');
          expect(data).toHaveProperty('total');
          expect(Array.isArray(data.data)).toBe(true);
        });
    });
  });

  describe('GET /api/v1/facilities/:id', () => {
    it('returns a single facility by ID', async () => {
      const facilityId = 'facility-123';

      await pact
        .addInteraction()
        .given('facility with ID facility-123 exists')
        .uponReceiving('a request to get a single facility')
        .withRequest('GET', `/api/v1/facilities/${facilityId}`, (builder) => {
          builder.headers({
            Authorization: like('Bearer test-token'),
          });
        })
        .willRespondWith(200, (builder) => {
          builder.headers({ 'Content-Type': 'application/json' });
          builder.jsonBody({
            data: {
              id: string('facility-123'),
              name: string('Main Facility'),
              location: string('New York, NY'),
              latitude: decimal(40.7128),
              longitude: decimal(-74.006),
              timezone: string('America/New_York'),
              totalZones: integer(5),
              status: regex('active|inactive', 'active'),
              created_at: string('2024-01-01T00:00:00.000Z'),
              updated_at: string('2024-01-01T00:00:00.000Z'),
            },
          });
        })
        .executeTest(async (mockServer) => {
          const response = await fetch(`${mockServer.url}/api/v1/facilities/${facilityId}`, {
            headers: {
              Authorization: 'Bearer test-token',
            },
          });

          expect(response.status).toBe(200);
          const data = await response.json();
          expect(data.data.id).toBe('facility-123');
        });
    });

    it('returns 404 for non-existent facility', async () => {
      const facilityId = 'non-existent-facility';

      await pact
        .addInteraction()
        .given('facility does not exist')
        .uponReceiving('a request for a non-existent facility')
        .withRequest('GET', `/api/v1/facilities/${facilityId}`, (builder) => {
          builder.headers({
            Authorization: like('Bearer test-token'),
          });
        })
        .willRespondWith(404, (builder) => {
          builder.headers({ 'Content-Type': 'application/json' });
          builder.jsonBody({
            error: string('Facility not found'),
          });
        })
        .executeTest(async (mockServer) => {
          const response = await fetch(`${mockServer.url}/api/v1/facilities/${facilityId}`, {
            headers: {
              Authorization: 'Bearer test-token',
            },
          });

          expect(response.status).toBe(404);
        });
    });
  });

  describe('GET /api/v1/facilities/:id/kpis', () => {
    it('returns facility KPIs', async () => {
      const facilityId = 'facility-123';

      await pact
        .addInteraction()
        .given('facility with KPI data exists')
        .uponReceiving('a request to get facility KPIs')
        .withRequest('GET', `/api/v1/facilities/${facilityId}/kpis`, (builder) => {
          builder.headers({
            Authorization: like('Bearer test-token'),
          });
        })
        .willRespondWith(200, (builder) => {
          builder.headers({ 'Content-Type': 'application/json' });
          builder.jsonBody({
            data: {
              totalCapacity: decimal(10000.5),
              averageSoC: decimal(75.5),
              averageSoH: decimal(95.2),
              totalPower: like(5000.0), // Can be integer or decimal
              activeAlerts: integer(3),
            },
          });
        })
        .executeTest(async (mockServer) => {
          const response = await fetch(`${mockServer.url}/api/v1/facilities/${facilityId}/kpis`, {
            headers: {
              Authorization: 'Bearer test-token',
            },
          });

          expect(response.status).toBe(200);
          const data = await response.json();
          expect(data.data).toHaveProperty('totalCapacity');
          expect(data.data).toHaveProperty('averageSoC');
          expect(data.data).toHaveProperty('averageSoH');
          expect(data.data).toHaveProperty('totalPower');
          expect(data.data).toHaveProperty('activeAlerts');
        });
    });
  });
});
