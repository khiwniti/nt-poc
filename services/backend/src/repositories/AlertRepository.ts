import { Pool, PoolClient } from 'pg';
import { pool } from '../config/database';

export interface Alert {
  id: string;
  battery_system_id: string;
  zone_id?: string;
  facility_id?: string;
  type: string;
  severity: 'info' | 'medium' | 'high' | 'critical';
  status: 'active' | 'acknowledged' | 'resolved';
  message: string;
  created_at: Date;
  acknowledged_at?: Date;
  resolved_at?: Date;
  metadata?: Record<string, any>;
  acknowledged_by?: string;
  resolution_notes?: string;
}

export interface CreateAlertInput {
  battery_system_id: string;
  zone_id?: string;
  facility_id?: string;
  type: string;
  severity: 'info' | 'medium' | 'high' | 'critical';
  message: string;
  metadata?: Record<string, any>;
}

export interface UpdateAlertInput {
  status?: 'active' | 'acknowledged' | 'resolved';
  acknowledged_by?: string;
  resolution_notes?: string;
  acknowledged_at?: Date;
  resolved_at?: Date;
}

export interface AlertFilters {
  facility_id?: string;
  zone_id?: string;
  battery_system_id?: string;
  severity?: string | string[];
  type?: string | string[];
  status?: string | string[];
  created_after?: Date;
  created_before?: Date;
}

export interface PaginationOptions {
  limit?: number;
  offset?: number;
}

export interface SortOptions {
  sort_by?: 'created_at' | 'severity' | 'updated_at';
  sort_order?: 'ASC' | 'DESC';
}

export interface AlertQueryResult {
  alerts: Alert[];
  total: number;
}

class AlertRepository {
  private pool: Pool;

  constructor(poolInstance: Pool = pool) {
    this.pool = poolInstance;
  }

  /**
   * Create a new alert
   */
  async create(input: CreateAlertInput, client?: PoolClient): Promise<Alert> {
    const executor = client || this.pool;
    
    const query = `
      INSERT INTO alerts (
        battery_system_id, zone_id, facility_id, type, severity, message, metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const values = [
      input.battery_system_id,
      input.zone_id || null,
      input.facility_id || null,
      input.type,
      input.severity,
      input.message,
      input.metadata ? JSON.stringify(input.metadata) : null,
    ];

    const result = await executor.query(query, values);
    return result.rows[0];
  }

  /**
   * Find alert by ID
   */
  async findById(id: string, client?: PoolClient): Promise<Alert | null> {
    const executor = client || this.pool;
    
    const query = 'SELECT * FROM alerts WHERE id = $1';
    const result = await executor.query(query, [id]);
    
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  /**
   * Find alerts by facility with optional filters, pagination, and sorting
   */
  async findByFacility(
    facilityId: string,
    filters?: Omit<AlertFilters, 'facility_id'>,
    pagination?: PaginationOptions,
    sorting?: SortOptions
  ): Promise<AlertQueryResult> {
    return this.find({ ...filters, facility_id: facilityId }, pagination, sorting);
  }

  /**
   * Find alerts by zone with optional filters, pagination, and sorting
   */
  async findByZone(
    zoneId: string,
    filters?: Omit<AlertFilters, 'zone_id'>,
    pagination?: PaginationOptions,
    sorting?: SortOptions
  ): Promise<AlertQueryResult> {
    return this.find({ ...filters, zone_id: zoneId }, pagination, sorting);
  }

  /**
   * Find alerts by status with optional filters, pagination, and sorting
   */
  async findByStatus(
    status: 'active' | 'acknowledged' | 'resolved',
    filters?: Omit<AlertFilters, 'status'>,
    pagination?: PaginationOptions,
    sorting?: SortOptions
  ): Promise<AlertQueryResult> {
    return this.find({ ...filters, status }, pagination, sorting);
  }

  /**
   * Find alerts with comprehensive filtering, pagination, and sorting
   */
  async find(
    filters?: AlertFilters,
    pagination?: PaginationOptions,
    sorting?: SortOptions,
    client?: PoolClient
  ): Promise<AlertQueryResult> {
    const executor = client || this.pool;
    
    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    // Build WHERE conditions
    if (filters) {
      if (filters.facility_id) {
        conditions.push(`facility_id = $${paramIndex++}`);
        values.push(filters.facility_id);
      }

      if (filters.zone_id) {
        conditions.push(`zone_id = $${paramIndex++}`);
        values.push(filters.zone_id);
      }

      if (filters.battery_system_id) {
        conditions.push(`battery_system_id = $${paramIndex++}`);
        values.push(filters.battery_system_id);
      }

      if (filters.severity) {
        if (Array.isArray(filters.severity)) {
          conditions.push(`severity = ANY($${paramIndex++})`);
          values.push(filters.severity);
        } else {
          conditions.push(`severity = $${paramIndex++}`);
          values.push(filters.severity);
        }
      }

      if (filters.type) {
        if (Array.isArray(filters.type)) {
          conditions.push(`type = ANY($${paramIndex++})`);
          values.push(filters.type);
        } else {
          conditions.push(`type = $${paramIndex++}`);
          values.push(filters.type);
        }
      }

      if (filters.status) {
        if (Array.isArray(filters.status)) {
          conditions.push(`status = ANY($${paramIndex++})`);
          values.push(filters.status);
        } else {
          conditions.push(`status = $${paramIndex++}`);
          values.push(filters.status);
        }
      }

      if (filters.created_after) {
        conditions.push(`created_at >= $${paramIndex++}`);
        values.push(filters.created_after);
      }

      if (filters.created_before) {
        conditions.push(`created_at <= $${paramIndex++}`);
        values.push(filters.created_before);
      }
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Build ORDER BY clause
    const sortBy = sorting?.sort_by || 'created_at';
    const sortOrder = sorting?.sort_order || 'DESC';
    const orderClause = `ORDER BY ${sortBy} ${sortOrder}`;

    // Build pagination
    const limit = pagination?.limit || 50;
    const offset = pagination?.offset || 0;
    const paginationClause = `LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    values.push(limit, offset);

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM alerts
      ${whereClause}
    `;
    const countResult = await executor.query(countQuery, values.slice(0, -2));
    const total = parseInt(countResult.rows[0].total, 10);

    // Get alerts
    const alertsQuery = `
      SELECT *
      FROM alerts
      ${whereClause}
      ${orderClause}
      ${paginationClause}
    `;
    const alertsResult = await executor.query(alertsQuery, values);

    return {
      alerts: alertsResult.rows,
      total,
    };
  }

  /**
   * Update an alert
   */
  async update(
    id: string,
    updates: UpdateAlertInput,
    client?: PoolClient
  ): Promise<Alert | null> {
    const executor = client || this.pool;
    
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.status !== undefined) {
      fields.push(`status = $${paramIndex++}`);
      values.push(updates.status);
    }

    if (updates.acknowledged_by !== undefined) {
      fields.push(`acknowledged_by = $${paramIndex++}`);
      values.push(updates.acknowledged_by);
    }

    if (updates.resolution_notes !== undefined) {
      fields.push(`resolution_notes = $${paramIndex++}`);
      values.push(updates.resolution_notes);
    }

    if (updates.acknowledged_at !== undefined) {
      fields.push(`acknowledged_at = $${paramIndex++}`);
      values.push(updates.acknowledged_at);
    }

    if (updates.resolved_at !== undefined) {
      fields.push(`resolved_at = $${paramIndex++}`);
      values.push(updates.resolved_at);
    }

    if (fields.length === 0) {
      return this.findById(id, client);
    }

    values.push(id);

    const query = `
      UPDATE alerts
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await executor.query(query, values);
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  /**
   * Delete an alert
   */
  async delete(id: string, client?: PoolClient): Promise<boolean> {
    const executor = client || this.pool;
    
    const query = 'DELETE FROM alerts WHERE id = $1';
    const result = await executor.query(query, [id]);
    
    return (result.rowCount || 0) > 0;
  }

  /**
   * Acknowledge multiple alerts in a transaction
   */
  async acknowledgeMultiple(
    alertIds: string[],
    acknowledgedBy: string,
    client?: PoolClient
  ): Promise<Alert[]> {
    const executor = client || this.pool;
    
    const query = `
      UPDATE alerts
      SET 
        status = 'acknowledged',
        acknowledged_by = $1,
        acknowledged_at = NOW()
      WHERE id = ANY($2) AND status = 'active'
      RETURNING *
    `;

    const result = await executor.query(query, [acknowledgedBy, alertIds]);
    return result.rows;
  }

  /**
   * Resolve multiple alerts in a transaction
   */
  async resolveMultiple(
    alertIds: string[],
    resolutionNotes?: string,
    client?: PoolClient
  ): Promise<Alert[]> {
    const executor = client || this.pool;
    
    const query = `
      UPDATE alerts
      SET 
        status = 'resolved',
        resolved_at = NOW(),
        resolution_notes = COALESCE($1, resolution_notes)
      WHERE id = ANY($2) AND status IN ('active', 'acknowledged')
      RETURNING *
    `;

    const result = await executor.query(query, [resolutionNotes || null, alertIds]);
    return result.rows;
  }

  /**
   * Get alert statistics by severity for a facility
   */
  async getStatsBySeverity(facilityId: string, client?: PoolClient): Promise<Record<string, number>> {
    const executor = client || this.pool;
    
    const query = `
      SELECT severity, COUNT(*) as count
      FROM alerts
      WHERE facility_id = $1 AND status = 'active'
      GROUP BY severity
    `;

    const result = await executor.query(query, [facilityId]);
    
    const stats: Record<string, number> = {
      info: 0,
      medium: 0,
      high: 0,
      critical: 0,
    };

    result.rows.forEach(row => {
      stats[row.severity] = parseInt(row.count, 10);
    });

    return stats;
  }

  /**
   * Execute a function within a transaction
   */
  async withTransaction<T>(
    callback: (client: PoolClient) => Promise<T>
  ): Promise<T> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

export default new AlertRepository();
