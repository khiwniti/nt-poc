import { describe, it, expect, beforeAll } from 'vitest';
import { BackendClient } from '../shared/clients/backendClient';
import { HarnessContext } from '../shared/harnessContext';

const ctx = new HarnessContext({ profile: 'core' });
const backendClient = new BackendClient();

beforeAll(async () => {
  await ctx.up();
});

describe('API health integration', () => {
  it('returns healthy status and service map', async () => {
    const response = await backendClient.getHealth();
    expect(response.status).toBe('ok');
    expect(response.services).toBeDefined();
  });
});
