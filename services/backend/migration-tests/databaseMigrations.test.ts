import { describe, it, expect } from 'vitest';
import knexFactory, { type Knex } from 'knex';
import pg from 'pg';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import * as coreMigration from '../migrations/20240101000000_create_core_tables';
import * as rulMigration from '../migrations/20240102000000_create_rul_predictions';
import * as modelPerformanceMigration from '../migrations/20240103000000_create_model_performance_tables';

type MigrationModule = {
  up: (knex: Knex) => Promise<void>;
  down: (knex: Knex) => Promise<void>;
};

type Migration = {
  name: string;
  module: MigrationModule;
  sourcePath: string;
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const migrationsDir = path.resolve(__dirname, '../migrations');

const migrations: Migration[] = [
  {
    name: '20240101000000_create_core_tables.ts',
    module: coreMigration,
    sourcePath: path.join(migrationsDir, '20240101000000_create_core_tables.ts'),
  },
  {
    name: '20240102000000_create_rul_predictions.ts',
    module: rulMigration,
    sourcePath: path.join(migrationsDir, '20240102000000_create_rul_predictions.ts'),
  },
  {
    name: '20240103000000_create_model_performance_tables.ts',
    module: modelPerformanceMigration,
    sourcePath: path.join(migrationsDir, '20240103000000_create_model_performance_tables.ts'),
  },
];

type ConnectionConfig = {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
};

function connectionConfig(): ConnectionConfig {
  return {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'battery_management_test',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
  };
}

async function canConnectToPostgres(): Promise<boolean> {
  const client = new pg.Client(connectionConfig());
  try {
    await client.connect();
    await client.query('SELECT 1');
    return true;
  } catch {
    return false;
  } finally {
    await client.end().catch(() => undefined);
  }
}

async function withAdminClient<T>(fn: (client: pg.Client) => Promise<T>): Promise<T> {
  const client = new pg.Client(connectionConfig());
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end().catch(() => undefined);
  }
}

function createKnexForSchema(schemaName: string): Knex {
  return knexFactory({
    client: 'pg',
    connection: connectionConfig(),
    searchPath: [schemaName, 'public'],
    pool: { min: 0, max: 4 },
  });
}

async function withIsolatedSchema<T>(fn: (knex: Knex, schemaName: string) => Promise<T>): Promise<T> {
  const schemaName = `migration_test_${crypto.randomUUID().replaceAll('-', '')}`;

  await withAdminClient(async (client) => {
    await client.query('CREATE EXTENSION IF NOT EXISTS pgcrypto');
    await client.query(`CREATE SCHEMA "${schemaName}"`);
  });

  const knex = createKnexForSchema(schemaName);
  try {
    return await fn(knex, schemaName);
  } finally {
    await knex.destroy().catch(() => undefined);
    await withAdminClient((client) => client.query(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE`));
  }
}

async function listTables(knex: Knex, schemaName: string): Promise<string[]> {
  const result = await knex.raw(
    `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = ?
      ORDER BY table_name
    `,
    [schemaName]
  );

  return result.rows.map((row: { table_name: string }) => row.table_name);
}

async function applyMigrations(knex: Knex, upToIndexInclusive: number): Promise<void> {
  for (const migration of migrations.slice(0, upToIndexInclusive + 1)) {
    await migration.module.up(knex);
  }
}

async function rollbackMigrations(knex: Knex, downFromIndexInclusive: number): Promise<void> {
  const reversed = migrations.slice(0, downFromIndexInclusive + 1).slice().reverse();
  for (const migration of reversed) {
    await migration.module.down(knex);
  }
}

function planUsesIndex(planNode: unknown): boolean {
  if (!planNode || typeof planNode !== 'object') return false;
  const node = planNode as Record<string, unknown>;
  const nodeType = node['Node Type'];
  if (typeof nodeType === 'string' && nodeType.toLowerCase().includes('index')) return true;

  const subPlans = node.Plans;
  if (!Array.isArray(subPlans)) return false;
  return subPlans.some(planUsesIndex);
}

function extractUpSection(source: string): string {
  const upStart = source.indexOf('export async function up');
  if (upStart === -1) return '';
  const downStart = source.indexOf('export async function down');
  if (downStart === -1) return source.slice(upStart);
  return source.slice(upStart, downStart);
}

const shouldRun = await canConnectToPostgres();
const describeDb = shouldRun ? describe : describe.skip;

describeDb('Database migrations', () => {
  it(
    'supports full apply and rollback',
    async () => {
      await withIsolatedSchema(async (knex, schemaName) => {
        await applyMigrations(knex, migrations.length - 1);

        const tablesAfterUp = await listTables(knex, schemaName);
        for (const expected of [
          'alerts',
          'battery_systems',
          'data_quality_metrics',
          'facilities',
          'model_drift_metrics',
          'model_health_alerts',
          'model_health_scores',
          'model_performance_metrics',
          'model_predictions',
          'rul_predictions',
          'sensor_readings',
        ]) {
          expect(tablesAfterUp).toContain(expected);
        }

        await rollbackMigrations(knex, migrations.length - 1);

        const tablesAfterDown = await listTables(knex, schemaName);
        expect(tablesAfterDown).toEqual([]);

        await applyMigrations(knex, migrations.length - 1);
        const tablesAfterSecondUp = await listTables(knex, schemaName);
        expect(tablesAfterSecondUp).toEqual(tablesAfterUp);
      });
    },
    120_000
  );

  it(
    'preserves existing core data across additive migrations (backward compatibility)',
    async () => {
      await withIsolatedSchema(async (knex, schemaName) => {
        await applyMigrations(knex, 0);

        const facilityId = crypto.randomUUID();
        const batteryId = crypto.randomUUID();

        await knex('facilities').insert({
          id: facilityId,
          name: 'Compat Facility',
          location: 'Bangkok',
          timezone: 'Asia/Bangkok',
          total_zones: 1,
          status: 'active',
        });

        await knex('battery_systems').insert({
          id: batteryId,
          facility_id: facilityId,
          name: 'Compat Battery',
          zone: 'A1',
          capacity_kwh: 100,
          status: 'online',
        });

        await applyMigrations(knex, migrations.length - 1);

        const facility = await knex('facilities').where({ id: facilityId }).first();
        const battery = await knex('battery_systems').where({ id: batteryId }).first();
        expect(facility).toBeTruthy();
        expect(battery).toBeTruthy();

        await modelPerformanceMigration.down(knex);

        const tables = await listTables(knex, schemaName);
        expect(tables).toContain('facilities');
        expect(tables).toContain('battery_systems');
        expect(tables).toContain('rul_predictions');
        expect(tables).not.toContain('model_predictions');

        const facilityAfterRollback = await knex('facilities').where({ id: facilityId }).first();
        expect(facilityAfterRollback).toBeTruthy();

        await modelPerformanceMigration.up(knex);
        const tablesAfterReapply = await listTables(knex, schemaName);
        expect(tablesAfterReapply).toContain('model_predictions');
      });
    },
    120_000
  );

  it(
    'enforces referential integrity and CHECK constraints',
    async () => {
      await withIsolatedSchema(async (knex) => {
        await applyMigrations(knex, migrations.length - 1);

        const facilityId = crypto.randomUUID();
        const batteryId = crypto.randomUUID();
        const alertId = crypto.randomUUID();
        const predictionId = crypto.randomUUID();

        await knex('facilities').insert({
          id: facilityId,
          name: 'Integrity Facility',
          location: 'Bangkok',
          timezone: 'Asia/Bangkok',
          total_zones: 1,
          status: 'active',
        });

        await knex('battery_systems').insert({
          id: batteryId,
          facility_id: facilityId,
          name: 'Integrity Battery',
          zone: 'A1',
          capacity_kwh: 100,
          status: 'online',
        });

        await knex('sensor_readings').insert({
          battery_system_id: batteryId,
          time: new Date(),
          voltage: 48.5,
          current: 10.2,
          temperature: 25.5,
          soc: 78.5,
          soh: 94.2,
          power: 494.7,
        });

        await knex('alerts').insert({
          id: alertId,
          battery_system_id: batteryId,
          severity: 'high',
          type: 'voltage',
          message: 'Test alert',
          metadata: { threshold: 50 },
        });

        await knex('rul_predictions').insert({
          id: predictionId,
          battery_system_id: batteryId,
          predicted_rul: 30,
          confidence: 0.9,
          model_version: 'test-v1',
          features: { temperature: 25.5 },
        });

        await expect(
          knex('rul_predictions').insert({
            id: crypto.randomUUID(),
            battery_system_id: batteryId,
            predicted_rul: 0,
            confidence: 0.9,
            model_version: 'test-v1',
            features: {},
          })
        ).rejects.toThrow();

        await expect(
          knex('rul_predictions').insert({
            id: crypto.randomUUID(),
            battery_system_id: batteryId,
            predicted_rul: 10,
            confidence: 1.5,
            model_version: 'test-v1',
            features: {},
          })
        ).rejects.toThrow();

        await knex('facilities').where({ id: facilityId }).del();

        const counts = await Promise.all([
          knex('battery_systems').count({ count: '*' }),
          knex('sensor_readings').count({ count: '*' }),
          knex('alerts').count({ count: '*' }),
          knex('rul_predictions').count({ count: '*' }),
        ]);

        for (const countResult of counts) {
          const value = (countResult[0] as { count: string }).count;
          expect(Number(value)).toBe(0);
        }
      });
    },
    120_000
  );

  it(
    'handles production-like sensor_readings volumes with indexed query plans (performance)',
    async () => {
      const sensorRows = parseInt(process.env.MIGRATION_TEST_SENSOR_ROWS || '50000');
      const maxQueryMs = parseInt(process.env.MIGRATION_TEST_MAX_QUERY_MS || '2000');

      await withIsolatedSchema(async (knex) => {
        await applyMigrations(knex, 0);

        const facilityId = crypto.randomUUID();
        const batteryId = crypto.randomUUID();

        await knex('facilities').insert({
          id: facilityId,
          name: 'Perf Facility',
          location: 'Bangkok',
          timezone: 'Asia/Bangkok',
          total_zones: 1,
          status: 'active',
        });

        await knex('battery_systems').insert({
          id: batteryId,
          facility_id: facilityId,
          name: 'Perf Battery',
          zone: 'A1',
          capacity_kwh: 100,
          status: 'online',
        });

        await knex.raw(
          `
            INSERT INTO sensor_readings (battery_system_id, time, voltage, current, temperature, soc, soh, power)
            SELECT ?, NOW() - (gs || ' minutes')::interval, 48.5, 10.2, 25.5, 78.5, 94.2, 494.7
            FROM generate_series(1, ?) gs
          `,
          [batteryId, sensorRows]
        );

        const explainResult = await knex.raw(
          'EXPLAIN (ANALYZE, FORMAT JSON) SELECT * FROM sensor_readings WHERE battery_system_id = ? ORDER BY time DESC LIMIT 100',
          [batteryId]
        );

        const planJson = explainResult.rows[0]['QUERY PLAN'][0] as Record<string, unknown>;
        const rootPlan = planJson.Plan;
        const executionTime = planJson['Execution Time'];

        expect(planUsesIndex(rootPlan)).toBe(true);
        expect(typeof executionTime).toBe('number');
        expect(executionTime as number).toBeLessThan(maxQueryMs);
      });
    },
    300_000
  );

  it('avoids destructive operations in migration up() (zero-downtime safety)', async () => {
    const sourceByMigration = await Promise.all(
      migrations.map(async (migration) => ({
        name: migration.name,
        source: await fs.readFile(migration.sourcePath, 'utf8'),
      }))
    );

    for (const { name, source } of sourceByMigration) {
      const upSection = extractUpSection(source);
      expect(upSection).not.toMatch(/\bdropTable\b/i);
      expect(upSection).not.toMatch(/\bdropColumn\b/i);
      expect(upSection).not.toMatch(/\bTRUNCATE\b/i);
      expect(upSection).not.toMatch(/\bALTER TABLE\b\s+.+\bDROP\b/i);
      expect(upSection).not.toMatch(/\bDROP\s+TABLE\b/i);
      expect(upSection).not.toMatch(/\bDROP\s+COLUMN\b/i);
      expect(name).toBeTruthy();
    }
  });
});
