import { Pool } from 'pg';
import { pool } from '../config/database.js';
import type { BatterySystem } from '../models/BatterySystem.js';

export class BatterySystemRepository {
  private pool: Pool;

  constructor(poolInstance: Pool = pool) {
    this.pool = poolInstance;
  }

  private mapRowToModel(row: any): BatterySystem {
    return {
      id: row.id,
      zoneId: row.zone_id,
      name: row.name,
      model: row.model,
      manufacturer: row.manufacturer,
      capacity: typeof row.capacity_kwh === 'string' ? parseFloat(row.capacity_kwh) : row.capacity_kwh,
      installDate: row.installed_date,
      warrantyEndDate: row.warranty_end_date,
      status: row.status,
      metadata: row.metadata || {},
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async findByZoneId(zoneId: string): Promise<BatterySystem[]> {
    const result = await this.pool.query(
      'SELECT * FROM battery_systems WHERE zone_id = $1',
      [zoneId]
    );
    return result.rows.map(this.mapRowToModel);
  }
  
  async findById(id: string): Promise<BatterySystem | null> {
    const result = await this.pool.query(
      'SELECT * FROM battery_systems WHERE id = $1',
      [id]
    );
    return result.rows.length ? this.mapRowToModel(result.rows[0]) : null;
  }
  
  async updateStatus(id: string, status: BatterySystem['status']): Promise<void> {
    await this.pool.query(
      'UPDATE battery_systems SET status = $1, updated_at = NOW() WHERE id = $2',
      [status, id]
    );
  }
}

