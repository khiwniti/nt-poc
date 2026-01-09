import { faker } from '@faker-js/faker';
import { pool } from '../../config/database';

export interface AlertData {
  id?: string;
  battery_system_id?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  type?: string;
  message?: string;
  metadata?: Record<string, any>;
  acknowledged?: boolean;
  acknowledged_at?: Date;
  acknowledged_by?: string;
  resolved?: boolean;
  resolved_at?: Date;
  created_at?: Date;
}

export const alertDefaults = {
  severity: () => faker.helpers.arrayElement(['low', 'medium', 'high', 'critical'] as const),
  type: () => faker.helpers.arrayElement(['temperature', 'voltage', 'current', 'soc', 'soh', 'power']),
  message: () => faker.lorem.sentence(),
  metadata: () => ({
    threshold: faker.number.float({ min: 0, max: 100, fractionDigits: 2 }),
    actual: faker.number.float({ min: 0, max: 100, fractionDigits: 2 }),
  }),
  acknowledged: () => faker.datatype.boolean(),
  resolved: () => faker.datatype.boolean(),
};

export async function createAlert(overrides: AlertData = {}): Promise<any> {
  const alert = {
    id: overrides.id || `test-alert-${faker.string.uuid()}`,
    battery_system_id: overrides.battery_system_id || `test-bat-${faker.string.uuid()}`,
    severity: overrides.severity || alertDefaults.severity(),
    type: overrides.type || alertDefaults.type(),
    message: overrides.message || alertDefaults.message(),
    metadata: overrides.metadata || alertDefaults.metadata(),
    acknowledged: overrides.acknowledged ?? false,
    acknowledged_at: overrides.acknowledged_at || null,
    acknowledged_by: overrides.acknowledged_by || null,
    resolved: overrides.resolved ?? false,
    resolved_at: overrides.resolved_at || null,
    created_at: overrides.created_at || new Date(),
  };

  const result = await pool.query(
    `INSERT INTO alerts (id, battery_system_id, severity, type, message, metadata, acknowledged, acknowledged_at, acknowledged_by, resolved, resolved_at, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     RETURNING *`,
    [
      alert.id,
      alert.battery_system_id,
      alert.severity,
      alert.type,
      alert.message,
      JSON.stringify(alert.metadata),
      alert.acknowledged,
      alert.acknowledged_at,
      alert.acknowledged_by,
      alert.resolved,
      alert.resolved_at,
      alert.created_at,
    ]
  );

  return result.rows[0];
}

export function buildAlert(overrides: AlertData = {}): AlertData {
  return {
    id: overrides.id || `test-alert-${faker.string.uuid()}`,
    battery_system_id: overrides.battery_system_id || `test-bat-${faker.string.uuid()}`,
    severity: overrides.severity || alertDefaults.severity(),
    type: overrides.type || alertDefaults.type(),
    message: overrides.message || alertDefaults.message(),
    metadata: overrides.metadata || alertDefaults.metadata(),
    acknowledged: overrides.acknowledged ?? false,
    acknowledged_at: overrides.acknowledged_at || null,
    acknowledged_by: overrides.acknowledged_by || null,
    resolved: overrides.resolved ?? false,
    resolved_at: overrides.resolved_at || null,
    created_at: overrides.created_at || new Date(),
  };
}

export async function createManyAlerts(count: number, overrides: AlertData = {}): Promise<any[]> {
  const alerts = [];
  for (let i = 0; i < count; i++) {
    alerts.push(await createAlert(overrides));
  }
  return alerts;
}
