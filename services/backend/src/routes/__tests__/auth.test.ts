import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../../app';
import { pool } from '../../config/database';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

describe('Authentication & Authorization Integration Tests', () => {
  let adminToken: string;
  let userToken: string;
  let viewerToken: string;
  let userId: string;

  beforeAll(async () => {
    const hashedPassword = await bcrypt.hash('Test123!@#', 10);

    const userResult = await pool.query(
      `
      INSERT INTO users (username, email, password_hash, role, status)
      VALUES 
        ('admin_user', 'admin@test.com', $1, 'admin', 'active'),
        ('regular_user', 'user@test.com', $1, 'user', 'active'),
        ('viewer_user', 'viewer@test.com', $1, 'viewer', 'active')
      RETURNING id
    `,
      [hashedPassword]
    );
    userId = userResult.rows[0].id;

    adminToken = jwt.sign(
      { userId: userResult.rows[0].id, role: 'admin' },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );

    userToken = jwt.sign(
      { userId: userResult.rows[1].id, role: 'user' },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );

    viewerToken = jwt.sign(
      { userId: userResult.rows[2].id, role: 'viewer' },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );
  });

  afterAll(async () => {
    await pool.query("DELETE FROM users WHERE email LIKE '%@test.com'");
  });

  describe('Authentication', () => {
    describe('POST /api/v1/auth/login', () => {
      it('should login with valid credentials', async () => {
        const response = await request(app)
          .post('/api/v1/auth/login')
          .send({
            email: 'admin@test.com',
            password: 'Test123!@#',
          })
          .expect(200);

        expect(response.body.token).toBeDefined();
        expect(response.body.user).toBeDefined();
        expect(response.body.user.email).toBe('admin@test.com');
        expect(response.body.user.role).toBe('admin');
      });

      it('should reject invalid password', async () => {
        const response = await request(app)
          .post('/api/v1/auth/login')
          .send({
            email: 'admin@test.com',
            password: 'WrongPassword',
          })
          .expect(401);

        expect(response.body.error).toBeDefined();
      });

      it('should reject non-existent user', async () => {
        const response = await request(app)
          .post('/api/v1/auth/login')
          .send({
            email: 'nonexistent@test.com',
            password: 'Test123!@#',
          })
          .expect(401);

        expect(response.body.error).toBeDefined();
      });

      it('should validate required fields', async () => {
        const response = await request(app)
          .post('/api/v1/auth/login')
          .send({ email: 'admin@test.com' })
          .expect(400);

        expect(response.body.error).toBeDefined();
      });

      it('should reject inactive users', async () => {
        await pool.query(
          `
          INSERT INTO users (username, email, password_hash, role, status)
          VALUES ('inactive_user', 'inactive@test.com', $1, 'user', 'inactive')
        `,
          [await bcrypt.hash('Test123!@#', 10)]
        );

        const response = await request(app)
          .post('/api/v1/auth/login')
          .send({
            email: 'inactive@test.com',
            password: 'Test123!@#',
          })
          .expect(403);

        expect(response.body.error).toContain('inactive');

        await pool.query('DELETE FROM users WHERE email = $1', ['inactive@test.com']);
      });
    });

    describe('POST /api/v1/auth/register', () => {
      it('should register new user', async () => {
        const response = await request(app)
          .post('/api/v1/auth/register')
          .send({
            username: 'newuser',
            email: 'newuser@test.com',
            password: 'Test123!@#',
            role: 'user',
          })
          .expect(201);

        expect(response.body.user).toBeDefined();
        expect(response.body.user.email).toBe('newuser@test.com');
        expect(response.body.token).toBeDefined();

        await pool.query('DELETE FROM users WHERE email = $1', ['newuser@test.com']);
      });

      it('should reject duplicate email', async () => {
        const response = await request(app)
          .post('/api/v1/auth/register')
          .send({
            username: 'duplicate',
            email: 'admin@test.com',
            password: 'Test123!@#',
          })
          .expect(409);

        expect(response.body.error).toContain('exists');
      });

      it('should validate password strength', async () => {
        const response = await request(app)
          .post('/api/v1/auth/register')
          .send({
            username: 'weakpass',
            email: 'weak@test.com',
            password: '123',
          })
          .expect(400);

        expect(response.body.error).toContain('password');
      });

      it('should validate email format', async () => {
        const response = await request(app)
          .post('/api/v1/auth/register')
          .send({
            username: 'invalidemail',
            email: 'not-an-email',
            password: 'Test123!@#',
          })
          .expect(400);

        expect(response.body.error).toContain('email');
      });
    });

    describe('POST /api/v1/auth/refresh', () => {
      it('should refresh valid token', async () => {
        const response = await request(app)
          .post('/api/v1/auth/refresh')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.token).toBeDefined();
        expect(response.body.token).not.toBe(adminToken);
      });

      it('should reject expired token', async () => {
        const expiredToken = jwt.sign(
          { userId, role: 'admin' },
          process.env.JWT_SECRET || 'test-secret',
          { expiresIn: '-1h' }
        );

        await request(app)
          .post('/api/v1/auth/refresh')
          .set('Authorization', `Bearer ${expiredToken}`)
          .expect(401);
      });

      it('should require authentication', async () => {
        await request(app).post('/api/v1/auth/refresh').expect(401);
      });
    });

    describe('POST /api/v1/auth/logout', () => {
      it('should logout successfully', async () => {
        await request(app)
          .post('/api/v1/auth/logout')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);
      });

      it('should require authentication', async () => {
        await request(app).post('/api/v1/auth/logout').expect(401);
      });
    });

    describe('Token Validation', () => {
      it('should reject invalid token format', async () => {
        await request(app)
          .get('/api/v1/facilities')
          .set('Authorization', 'Bearer invalid-token')
          .expect(401);
      });

      it('should reject missing Bearer prefix', async () => {
        await request(app).get('/api/v1/facilities').set('Authorization', adminToken).expect(401);
      });

      it('should reject token with invalid signature', async () => {
        const invalidToken = jwt.sign({ userId, role: 'admin' }, 'wrong-secret');

        await request(app)
          .get('/api/v1/facilities')
          .set('Authorization', `Bearer ${invalidToken}`)
          .expect(401);
      });
    });
  });

  describe('Authorization', () => {
    describe('Role-Based Access Control', () => {
      it('admin should access all endpoints', async () => {
        await request(app)
          .get('/api/v1/facilities')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        await request(app)
          .post('/api/v1/facilities')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ name: 'Test', location: {}, timezone: 'UTC' })
          .expect(201);
      });

      it('user should access read and limited write endpoints', async () => {
        await request(app)
          .get('/api/v1/facilities')
          .set('Authorization', `Bearer ${userToken}`)
          .expect(200);

        await request(app)
          .get('/api/v1/alerts')
          .set('Authorization', `Bearer ${userToken}`)
          .expect(200);
      });

      it('viewer should only access read endpoints', async () => {
        await request(app)
          .get('/api/v1/facilities')
          .set('Authorization', `Bearer ${viewerToken}`)
          .expect(200);

        await request(app)
          .post('/api/v1/facilities')
          .set('Authorization', `Bearer ${viewerToken}`)
          .send({ name: 'Test', location: {}, timezone: 'UTC' })
          .expect(403);

        await request(app)
          .delete('/api/v1/alerts/test-id')
          .set('Authorization', `Bearer ${viewerToken}`)
          .expect(403);
      });

      it('should enforce admin-only DELETE operations', async () => {
        await request(app)
          .delete('/api/v1/facilities/test-id')
          .set('Authorization', `Bearer ${userToken}`)
          .expect(403);

        await request(app)
          .delete('/api/v1/facilities/test-id')
          .set('Authorization', `Bearer ${viewerToken}`)
          .expect(403);
      });

      it('should enforce admin-only sensitive updates', async () => {
        await request(app)
          .patch('/api/v1/users/test-id')
          .set('Authorization', `Bearer ${userToken}`)
          .send({ role: 'admin' })
          .expect(403);

        await request(app)
          .patch('/api/v1/users/test-id')
          .set('Authorization', `Bearer ${viewerToken}`)
          .send({ role: 'admin' })
          .expect(403);
      });
    });

    describe('Resource Ownership', () => {
      it('should allow users to update own profile', async () => {
        const response = await request(app)
          .get('/api/v1/users/me')
          .set('Authorization', `Bearer ${userToken}`)
          .expect(200);

        const userId = response.body.data.id;

        await request(app)
          .patch(`/api/v1/users/${userId}`)
          .set('Authorization', `Bearer ${userToken}`)
          .send({ username: 'updated_username' })
          .expect(200);
      });

      it('should prevent users from updating other profiles', async () => {
        const response = await request(app)
          .get('/api/v1/users/me')
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        const adminUserId = response.body.data.id;

        await request(app)
          .patch(`/api/v1/users/${adminUserId}`)
          .set('Authorization', `Bearer ${userToken}`)
          .send({ username: 'hacked' })
          .expect(403);
      });
    });

    describe('Scope-Based Authorization', () => {
      it('should respect read scope', async () => {
        const readToken = jwt.sign(
          { userId, role: 'user', scope: ['read'] },
          process.env.JWT_SECRET || 'test-secret'
        );

        await request(app)
          .get('/api/v1/facilities')
          .set('Authorization', `Bearer ${readToken}`)
          .expect(200);

        await request(app)
          .post('/api/v1/facilities')
          .set('Authorization', `Bearer ${readToken}`)
          .send({ name: 'Test', location: {}, timezone: 'UTC' })
          .expect(403);
      });

      it('should respect write scope', async () => {
        const writeToken = jwt.sign(
          { userId, role: 'user', scope: ['read', 'write'] },
          process.env.JWT_SECRET || 'test-secret'
        );

        await request(app)
          .post('/api/v1/facilities')
          .set('Authorization', `Bearer ${writeToken}`)
          .send({ name: 'Test', location: {}, timezone: 'UTC' })
          .expect(201);
      });
    });

    describe('Error Responses', () => {
      it('should return 401 for missing authentication', async () => {
        const response = await request(app).get('/api/v1/facilities').expect(401);

        expect(response.body.error).toBeDefined();
        expect(response.body.error).toContain('authentication');
      });

      it('should return 403 for insufficient permissions', async () => {
        const response = await request(app)
          .delete('/api/v1/facilities/test-id')
          .set('Authorization', `Bearer ${viewerToken}`)
          .expect(403);

        expect(response.body.error).toBeDefined();
        expect(response.body.error).toContain('permission');
      });

      it('should not leak information in auth errors', async () => {
        const response = await request(app)
          .post('/api/v1/auth/login')
          .send({
            email: 'nonexistent@test.com',
            password: 'wrong',
          })
          .expect(401);

        expect(response.body.error).not.toContain('user not found');
        expect(response.body.error).not.toContain('password incorrect');
      });
    });
  });

  describe('Rate Limiting', () => {
    it('should rate limit login attempts', async () => {
      const promises = [];
      for (let i = 0; i < 15; i++) {
        promises.push(
          request(app).post('/api/v1/auth/login').send({
            email: 'admin@test.com',
            password: 'WrongPassword',
          })
        );
      }

      const responses = await Promise.all(promises);
      const rateLimited = responses.some((r) => r.status === 429);
      expect(rateLimited).toBe(true);
    });

    it('should include rate limit headers', async () => {
      const response = await request(app).post('/api/v1/auth/login').send({
        email: 'admin@test.com',
        password: 'Test123!@#',
      });

      expect(response.headers['x-ratelimit-limit']).toBeDefined();
      expect(response.headers['x-ratelimit-remaining']).toBeDefined();
    });
  });
});
