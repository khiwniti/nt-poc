/**
 * Pact Consumer Tests - Health API
 *
 * These tests define the contract expectations for the Health API
 * from the consumer (Frontend) perspective.
 */
import { describe, it, expect } from 'vitest';
import { MatchersV3 } from '@pact-foundation/pact';
import { createPact } from './pact.config';
import fetch from 'node-fetch';

const { like, integer, string, regex } = MatchersV3;

describe('Health API Consumer Contract Tests', () => {
  const pact = createPact();

  describe('GET /api/v1/health', () => {
    it('returns health status', async () => {
      await pact
        .addInteraction()
        .given('server is running')
        .uponReceiving('a request to check health status')
        .withRequest('GET', '/api/v1/health')
        .willRespondWith(200, (builder) => {
          builder.headers({ 'Content-Type': 'application/json' });
          builder.jsonBody({
            status: string('ok'),
            timestamp: regex(
              '\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}.\\d{3}Z',
              '2024-01-01T00:00:00.000Z'
            ),
            uptimeSeconds: integer(3600),
            environment: regex('development|production|test', 'development'),
            version: like(null),
          });
        })
        .executeTest(async (mockServer) => {
          const response = await fetch(`${mockServer.url}/api/v1/health`);

          expect(response.status).toBe(200);
          const data = await response.json();
          expect(data.status).toBe('ok');
          expect(data).toHaveProperty('timestamp');
          expect(data).toHaveProperty('uptimeSeconds');
        });
    });
  });
});
