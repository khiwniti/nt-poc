import { beforeEach, afterEach, afterAll } from 'vitest';
import { pool } from '../../config/database.js';
import { cleanupTestData } from './cleanup.js';

export async function setupTestEnvironment(): Promise<void> {
  await cleanupTestData();
}

export async function teardownTestEnvironment(): Promise<void> {
  await cleanupTestData();
}

export function useTestDatabase() {
  beforeEach(async () => {
    await setupTestEnvironment();
  });

  afterEach(async () => {
    await teardownTestEnvironment();
  });

  afterAll(async () => {
    await pool.end();
  });
}

export async function withTestTransaction<T>(
  callback: (client: any) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('ROLLBACK');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
