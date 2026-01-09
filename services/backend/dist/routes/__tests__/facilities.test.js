import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../app';
import { pool } from '../../config/database';
import jwt from 'jsonwebtoken';
const generateToken = () => {
    return jwt.sign({ userId: 'user-123', role: 'admin' }, process.env.JWT_SECRET || 'test-secret');
};
describe('Facilities API', () => {
    let authToken;
    beforeAll(async () => {
        authToken = generateToken();
        // Seed test data
        await pool.query(`
      INSERT INTO facilities (id, name, location, timezone, total_zones, status)
      VALUES 
        ('fac-001', 'Test Facility 1', '{"lat": 13.7563, "lng": 100.5018, "address": "Bangkok"}', 'Asia/Bangkok', 10, 'active'),
        ('fac-002', 'Test Facility 2', '{"lat": 13.7563, "lng": 100.5018, "address": "Bangkok"}', 'Asia/Bangkok', 5, 'active')
    `);
    });
    afterAll(async () => {
        await pool.query('DELETE FROM facilities WHERE id LIKE \'fac-%\'');
        await pool.end();
    });
    describe('GET /api/v1/facilities', () => {
        it('returns list of facilities', async () => {
            const response = await request(app)
                .get('/api/v1/facilities')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);
            expect(response.body.data).toBeInstanceOf(Array);
            expect(response.body.total).toBeGreaterThanOrEqual(2);
            expect(response.body.data[0]).toHaveProperty('id');
            expect(response.body.data[0]).toHaveProperty('name');
        });
        it('requires authentication', async () => {
            await request(app)
                .get('/api/v1/facilities')
                .expect(401);
        });
        it('rejects invalid token', async () => {
            await request(app)
                .get('/api/v1/facilities')
                .set('Authorization', 'Bearer invalid-token')
                .expect(403);
        });
    });
    describe('GET /api/v1/facilities/:id', () => {
        it('returns facility details', async () => {
            const response = await request(app)
                .get('/api/v1/facilities/fac-001')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);
            expect(response.body.data.id).toBe('fac-001');
            expect(response.body.data.name).toBe('Test Facility 1');
            expect(response.body.data.totalZones).toBe(10);
        });
        it('returns 404 for non-existent facility', async () => {
            await request(app)
                .get('/api/v1/facilities/non-existent')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(404);
        });
    });
    describe('GET /api/v1/facilities/:id/kpis', () => {
        beforeEach(async () => {
            // Seed battery systems and readings
            await pool.query(`
        INSERT INTO zones (id, facility_id, name, type)
        VALUES ('zone-001', 'fac-001', 'Test Zone', 'room')
        ON CONFLICT (id) DO NOTHING
      `);
            await pool.query(`
        INSERT INTO battery_systems (id, zone_id, name, capacity, status)
        VALUES ('bat-001', 'zone-001', 'Test Battery', 100.0, 'operational')
        ON CONFLICT (id) DO NOTHING
      `);
            await pool.query(`
        INSERT INTO sensor_readings (time, battery_system_id, voltage, current, temperature, soc, soh, power)
        VALUES (NOW(), 'bat-001', 48.5, 10.2, 25.5, 78.5, 94.2, 494.7)
      `);
        });
        it('returns calculated KPIs', async () => {
            const response = await request(app)
                .get('/api/v1/facilities/fac-001/kpis')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);
            expect(response.body.data).toHaveProperty('totalCapacity');
            expect(response.body.data).toHaveProperty('averageSoC');
            expect(response.body.data).toHaveProperty('averageSoH');
            expect(response.body.data).toHaveProperty('totalPower');
            expect(response.body.data).toHaveProperty('activeAlerts');
            expect(response.body.data.totalCapacity).toBeGreaterThan(0);
            expect(response.body.data.averageSoC).toBeGreaterThanOrEqual(0);
            expect(response.body.data.averageSoC).toBeLessThanOrEqual(100);
        });
    });
});
