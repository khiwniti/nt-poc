import { describe, it, expect, beforeAll, vi } from 'vitest';
import request from 'supertest';
import type { Response as SupertestResponse } from 'supertest';
import jwt from 'jsonwebtoken';

vi.mock('../../config/database.js', () => {
  return {
    pool: {
      query: vi.fn(async (text: string) => {
        if (text.includes('FROM battery_systems') && text.includes('facility_id')) {
          return { rows: [{ id: 'bat-1' }, { id: 'bat-2' }] };
        }

        return {
          rows: [
            {
              soh_delta: -0.02,
              anomaly_count: 1,
              temp_max: 30,
              voltage_min: 3.5,
            },
          ],
        };
      }),
    },
  };
});

import { app } from '../../app.js';
import { initializeModel } from '../../ml/predictiveMaintenanceModel.js';

const generateToken = () => {
  return jwt.sign({ userId: 'user-123', role: 'admin' }, process.env.JWT_SECRET || 'test-secret');
};

describe('ML Batch Prediction API', () => {
  let authToken: string;

  beforeAll(async () => {
    authToken = generateToken();
    await initializeModel();
  });

  it('accepts an array of battery IDs and returns all predictions', async () => {
    const response = await request(app)
      .post('/api/v1/ml/predict-batch')
      .set('Authorization', `Bearer ${authToken}`)
      .send(['bat-a', 'bat-b']);

    expect(response.status).toBe(200);
    expect(response.body.predictions).toHaveLength(2);
    expect(response.body.total).toBe(2);
    expect(response.body.predictions[0]).toHaveProperty('batterySystemId');
    expect(response.body.predictions[0]).toHaveProperty('prediction');
  });

  it('enforces max 100 batteries per request', async () => {
    const ids = Array.from({ length: 101 }, (_, i) => `bat-${i}`);
    const response = await request(app)
      .post('/api/v1/ml/predict-batch')
      .set('Authorization', `Bearer ${authToken}`)
      .send(ids);

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('max');
  });

  it('supports facilityId to predict across a facility', async () => {
    const response = await request(app)
      .post('/api/v1/ml/predict-batch')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ facilityId: 'fac-1' });

    expect(response.status).toBe(200);
    expect(response.body.predictions).toHaveLength(2);
    expect(response.body.predictions.map((p: any) => p.batterySystemId)).toEqual([
      'bat-1',
      'bat-2',
    ]);
  });

  it('returns 202 + jobId for large batches and allows polling results', async () => {
    const ids = Array.from({ length: 30 }, (_, i) => `bat-${i}`);
    const start = await request(app)
      .post('/api/v1/ml/predict-batch')
      .set('Authorization', `Bearer ${authToken}`)
      .send(ids);

    expect(start.status).toBe(202);
    expect(start.body).toHaveProperty('jobId');

    const jobId = start.body.jobId as string;

    let finalResponse: SupertestResponse | null = null;
    for (let attempt = 0; attempt < 10; attempt++) {
      const poll = await request(app)
        .get(`/api/v1/ml/predict-batch/${jobId}`)
        .set('Authorization', `Bearer ${authToken}`);

      if (poll.status === 200) {
        finalResponse = poll;
        break;
      }

      await new Promise((r) => setTimeout(r, 5));
    }

    expect(finalResponse).not.toBeNull();
    expect(finalResponse!.body.status).toBe('completed');
    expect(finalResponse!.body.predictions).toHaveLength(30);
  });
});
