import crypto from 'node:crypto';
import { pool } from '../config/database.js';
import { getModel, initializeModel } from '../ml/predictiveMaintenanceModel';
import type { MaintenanceFeatures, MaintenancePrediction } from '../types/predictiveMaintenance';

export const MAX_BATTERIES_PER_REQUEST = 100;
export const DEFAULT_PREDICT_BATCH_CONCURRENCY = 8;
export const DEFAULT_ASYNC_THRESHOLD = 25;

export type BatchPredictionStatus = 'queued' | 'running' | 'completed' | 'failed';

export type BatchPredictionItem = {
  batterySystemId: string;
  prediction?: MaintenancePrediction;
  error?: string;
};

export type BatchPredictionResult = {
  total: number;
  successful: number;
  failed: number;
  predictions: BatchPredictionItem[];
};

type BatchPredictionJobRecord = {
  jobId: string;
  status: BatchPredictionStatus;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  total: number;
  successful: number;
  failed: number;
  predictions?: BatchPredictionItem[];
  error?: string;
};

const batchJobs = new Map<string, BatchPredictionJobRecord>();

function dedupePreserveOrder(ids: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const id of ids) {
    if (seen.has(id)) continue;
    seen.add(id);
    result.push(id);
  }
  return result;
}

export function normalizeBatterySystemIds(input: unknown): string[] | null {
  if (!Array.isArray(input)) return null;
  const ids: string[] = [];
  for (const item of input) {
    if (typeof item !== 'string') return null;
    const trimmed = item.trim();
    if (!trimmed) return null;
    ids.push(trimmed);
  }
  return dedupePreserveOrder(ids);
}

export async function getFacilityBatterySystemIds(facilityId: string): Promise<string[]> {
  const result = await pool.query<{ id: string }>(
    `
      SELECT id
      FROM battery_systems
      WHERE facility_id = $1
      ORDER BY id
      LIMIT $2
    `,
    [facilityId, MAX_BATTERIES_PER_REQUEST + 1]
  );

  if (result.rows.length > MAX_BATTERIES_PER_REQUEST) {
    throw new Error(`facilityId exceeds max ${MAX_BATTERIES_PER_REQUEST} batteries/request`);
  }

  return result.rows.map((row) => row.id);
}

async function extractMaintenanceFeatures(batterySystemId: string): Promise<MaintenanceFeatures> {
  const result = await pool.query<{
    soh_delta: number | string | null;
    anomaly_count: number | string | null;
    temp_max: number | string | null;
    voltage_min: number | string | null;
  }>(
    `
      WITH last_two AS (
        SELECT
          soh::float8 AS soh,
          time,
          ROW_NUMBER() OVER (ORDER BY time DESC) AS rn
        FROM sensor_readings
        WHERE battery_system_id = $1 AND soh IS NOT NULL
        ORDER BY time DESC
        LIMIT 2
      ),
      soh_pair AS (
        SELECT
          MAX(CASE WHEN rn = 1 THEN soh END) AS soh1,
          MAX(CASE WHEN rn = 2 THEN soh END) AS soh2,
          MAX(CASE WHEN rn = 1 THEN time END) AS t1,
          MAX(CASE WHEN rn = 2 THEN time END) AS t2
        FROM last_two
      ),
      window_stats AS (
        SELECT
          (
            SELECT COUNT(*)::int
            FROM sensor_readings
            WHERE battery_system_id = $1
              AND time > NOW() - INTERVAL '24 hours'
              AND (
                (temperature IS NOT NULL AND temperature > 60)
                OR (voltage IS NOT NULL AND voltage < 3.0)
                OR (current IS NOT NULL AND current > 100)
              )
          ) AS anomaly_count,
          (
            SELECT MAX(temperature)::float8
            FROM sensor_readings
            WHERE battery_system_id = $1
              AND time > NOW() - INTERVAL '24 hours'
              AND temperature IS NOT NULL
          ) AS temp_max,
          (
            SELECT MIN(voltage)::float8
            FROM sensor_readings
            WHERE battery_system_id = $1
              AND time > NOW() - INTERVAL '24 hours'
              AND voltage IS NOT NULL
          ) AS voltage_min
      )
      SELECT
        COALESCE(
          (soh1 - soh2) / NULLIF(EXTRACT(EPOCH FROM (t1 - t2)) / 86400.0, 0),
          -0.01
        ) AS soh_delta,
        COALESCE(window_stats.anomaly_count, 0) AS anomaly_count,
        COALESCE(window_stats.temp_max, 25) AS temp_max,
        COALESCE(window_stats.voltage_min, 3.7) AS voltage_min
      FROM soh_pair, window_stats
    `,
    [batterySystemId]
  );

  const row = result.rows[0];
  return {
    sohDelta: Number(row?.soh_delta ?? -0.01),
    anomalyCount: Number(row?.anomaly_count ?? 0),
    tempMax: Number(row?.temp_max ?? 25),
    voltageMin: Number(row?.voltage_min ?? 3.7),
  };
}

async function mapWithConcurrency<T, U>(
  items: T[],
  concurrency: number,
  mapper: (item: T, index: number) => Promise<U>
): Promise<U[]> {
  const maxConcurrency = Math.max(1, Math.floor(concurrency));
  const results = new Array<U>(items.length);
  let nextIndex = 0;

  const workers = Array.from({ length: Math.min(maxConcurrency, items.length) }, async () => {
    while (true) {
      const index = nextIndex++;
      if (index >= items.length) return;
      results[index] = await mapper(items[index], index);
    }
  });

  await Promise.all(workers);
  return results;
}

async function ensureModelReady(): Promise<void> {
  const model = getModel();
  if (!model.isTrained()) {
    await initializeModel();
  }
}

export async function runBatchPrediction(
  batterySystemIds: string[],
  options: { concurrency?: number } = {}
): Promise<BatchPredictionResult> {
  if (batterySystemIds.length > MAX_BATTERIES_PER_REQUEST) {
    throw new Error(`max ${MAX_BATTERIES_PER_REQUEST} batteries/request`);
  }

  await ensureModelReady();
  const model = getModel();

  const concurrency = options.concurrency ?? DEFAULT_PREDICT_BATCH_CONCURRENCY;
  const predictions = await mapWithConcurrency(
    batterySystemIds,
    concurrency,
    async (batterySystemId) => {
      try {
        const features = await extractMaintenanceFeatures(batterySystemId);
        const prediction = await model.predict(batterySystemId, features);
        return { batterySystemId, prediction };
      } catch (error) {
        return {
          batterySystemId,
          error: error instanceof Error ? error.message : 'Failed to predict',
        };
      }
    }
  );

  const successful = predictions.filter((p) => p.prediction).length;
  const failed = predictions.length - successful;

  return {
    total: predictions.length,
    successful,
    failed,
    predictions,
  };
}

export function createBatchPredictionJob(batterySystemIds: string[]): BatchPredictionJobRecord {
  const jobId = crypto.randomUUID();
  const record: BatchPredictionJobRecord = {
    jobId,
    status: 'queued',
    createdAt: new Date(),
    total: batterySystemIds.length,
    successful: 0,
    failed: 0,
  };
  batchJobs.set(jobId, record);
  return record;
}

export function getBatchPredictionJob(jobId: string): BatchPredictionJobRecord | null {
  return batchJobs.get(jobId) || null;
}

export function startBatchPredictionJob(
  jobId: string,
  batterySystemIds: string[],
  options: { concurrency?: number } = {}
): void {
  const record = batchJobs.get(jobId);
  if (!record) return;
  if (record.status !== 'queued') return;

  record.status = 'running';
  record.startedAt = new Date();

  setImmediate(() => {
    runBatchPrediction(batterySystemIds, options)
      .then((result) => {
        record.status = 'completed';
        record.completedAt = new Date();
        record.predictions = result.predictions;
        record.successful = result.successful;
        record.failed = result.failed;
      })
      .catch((error) => {
        record.status = 'failed';
        record.completedAt = new Date();
        record.error = error instanceof Error ? error.message : 'Job failed';
      });
  });
}
