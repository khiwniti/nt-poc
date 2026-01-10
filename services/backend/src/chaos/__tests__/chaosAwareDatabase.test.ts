import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChaosAwareDatabase } from '../chaosAwareDatabase.js';
import { chaosMonkey } from '../chaosMonkey.js';

vi.mock('../chaosMonkey.js', () => ({
  chaosMonkey: {
    shouldInjectDatabaseFailure: vi.fn(),
  },
}));

vi.mock('../../config/database.js', () => ({
  pool: {
    query: vi.fn(),
  },
}));

describe('ChaosAwareDatabase', () => {
  let db: ChaosAwareDatabase;
  const mockQuery = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    db = new ChaosAwareDatabase();
    const { pool } = require('../../config/database.js');
    pool.query = mockQuery;
  });

  it('should execute query when no chaos is injected', async () => {
    vi.mocked(chaosMonkey.shouldInjectDatabaseFailure).mockReturnValue(false);
    mockQuery.mockResolvedValue({ rows: [{ id: 1 }], rowCount: 1 });

    const result = await db.query('SELECT * FROM test');

    expect(result.rows).toEqual([{ id: 1 }]);
    expect(mockQuery).toHaveBeenCalledWith('SELECT * FROM test', undefined);
  });

  it('should throw error when database failure is injected', async () => {
    vi.mocked(chaosMonkey.shouldInjectDatabaseFailure).mockReturnValue(true);

    await expect(db.query('SELECT * FROM test')).rejects.toThrow(
      'Chaos Monkey: Database connection failure simulated'
    );

    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('should pass parameters to query', async () => {
    vi.mocked(chaosMonkey.shouldInjectDatabaseFailure).mockReturnValue(false);
    mockQuery.mockResolvedValue({ rows: [], rowCount: 0 });

    await db.query('SELECT * FROM test WHERE id = $1', [123]);

    expect(mockQuery).toHaveBeenCalledWith('SELECT * FROM test WHERE id = $1', [123]);
  });
});
