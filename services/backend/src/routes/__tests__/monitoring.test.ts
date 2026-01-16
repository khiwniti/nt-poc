import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../../app';

describe('Monitoring endpoints', () => {
  it('GET /api/v1/health returns ok', async () => {
    const response = await request(app).get('/api/v1/health').expect(200);
    expect(response.body.status).toBe('ok');
    expect(typeof response.body.uptimeSeconds).toBe('number');
  });

  it('GET /metrics returns Prometheus text', async () => {
    await request(app).get('/api/v1/health').expect(200);
    const response = await request(app).get('/metrics').expect(200);
    expect(String(response.headers['content-type'])).toContain('text/plain');
    expect(response.text).toContain('http_requests_total');
  });

  it('GET /api/v1/monitoring/stats returns process stats', async () => {
    const response = await request(app).get('/api/v1/monitoring/stats').expect(200);
    expect(response.body.data).toBeTruthy();
    expect(typeof response.body.data.uptimeSeconds).toBe('number');
  });
});
