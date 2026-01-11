import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { authenticateAPIKey } from '../../middleware/apiKey.js';
import internalRouter from '../internal.js';

describe('Internal endpoints API key auth', () => {
  const app = express();
  app.use('/internal', authenticateAPIKey, internalRouter);

  const originalEnv = {
    MLOPS_API_KEY: process.env.MLOPS_API_KEY,
    SIMULATOR_API_KEY: process.env.SIMULATOR_API_KEY,
    FRONTEND_API_KEY: process.env.FRONTEND_API_KEY,
  };

  beforeEach(() => {
    process.env.MLOPS_API_KEY = 'mlops_secret_key_abc123';
    process.env.SIMULATOR_API_KEY = 'sim_secret_key_xyz789';
    process.env.FRONTEND_API_KEY = 'frontend_secret_key_def456';
  });

  afterEach(() => {
    process.env.MLOPS_API_KEY = originalEnv.MLOPS_API_KEY;
    process.env.SIMULATOR_API_KEY = originalEnv.SIMULATOR_API_KEY;
    process.env.FRONTEND_API_KEY = originalEnv.FRONTEND_API_KEY;
  });

  it('returns 401 when x-api-key is missing', async () => {
    const response = await request(app).get('/internal/health').expect(401);
    expect(response.body).toEqual({ error: 'Invalid API key' });
  });

  it('returns 401 when x-api-key is invalid', async () => {
    const response = await request(app)
      .get('/internal/health')
      .set('x-api-key', 'nope')
      .expect(401);
    expect(response.body).toEqual({ error: 'Invalid API key' });
  });

  it('allows request when x-api-key is valid', async () => {
    const response = await request(app)
      .get('/internal/health')
      .set('x-api-key', 'mlops_secret_key_abc123')
      .expect(200);
    expect(response.body.status).toBe('ok');
  });
});
