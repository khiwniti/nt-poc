import { pool } from '../config/database.js';
import { chaosMonkey } from '../chaos/chaosMonkey.js';
import type { QueryResult, QueryResultRow } from 'pg';

export class ChaosAwareDatabase {
  async query<R extends QueryResultRow = any>(
    text: string,
    params?: any[]
  ): Promise<QueryResult<R>> {
    if (chaosMonkey.shouldInjectDatabaseFailure()) {
      throw new Error('Chaos Monkey: Database connection failure simulated');
    }

    return pool.query(text, params);
  }
}

export const chaosAwareDb = new ChaosAwareDatabase();
