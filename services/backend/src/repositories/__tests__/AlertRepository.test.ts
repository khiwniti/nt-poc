import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Pool, PoolClient } from 'pg';
import AlertRepository, {
  Alert,
  CreateAlertInput,
  UpdateAlertInput,
  AlertFilters,
} from '../AlertRepository.js';

describe('AlertRepository', () => {
  let mockPool: any;
  let mockClient: any;
  let repository: any;

  beforeEach(() => {
    mockClient = {
      query: vi.fn(),
      release: vi.fn(),
    } as any;

    mockPool = {
      query: vi.fn(),
      connect: vi.fn().mockResolvedValue(mockClient),
    } as any;

    // Create repository instance with mock pool
    repository = new (AlertRepository.constructor as any)(mockPool);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new alert', async () => {
      const input: CreateAlertInput = {
        battery_system_id: 'battery-123',
        zone_id: 'zone-1',
        facility_id: 'facility-1',
        type: 'Temperature High',
        severity: 'critical',
        message: 'Temperature exceeds threshold',
        metadata: { threshold: 60, actual: 75 },
      };

      const mockAlert: Alert = {
        id: 'alert-uuid',
        ...input,
        status: 'active',
        created_at: new Date(),
      };

      mockPool.query.mockResolvedValue({ rows: [mockAlert] } as any);

      const result = await repository.create(input);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO alerts'),
        expect.arrayContaining([
          input.battery_system_id,
          input.zone_id,
          input.facility_id,
          input.type,
          input.severity,
          input.message,
          JSON.stringify(input.metadata),
        ])
      );
      expect(result).toEqual(mockAlert);
    });

    it('should create alert without optional fields', async () => {
      const input: CreateAlertInput = {
        battery_system_id: 'battery-123',
        type: 'Voltage Anomaly',
        severity: 'medium',
        message: 'Voltage fluctuation detected',
      };

      const mockAlert: Alert = {
        id: 'alert-uuid',
        ...input,
        status: 'active',
        created_at: new Date(),
      };

      mockPool.query.mockResolvedValue({ rows: [mockAlert] } as any);

      const result = await repository.create(input);

      expect(result).toEqual(mockAlert);
    });

    it('should use provided client for transaction', async () => {
      const input: CreateAlertInput = {
        battery_system_id: 'battery-123',
        type: 'SoC Critical',
        severity: 'high',
        message: 'State of charge is critical',
      };

      const mockAlert: Alert = {
        id: 'alert-uuid',
        ...input,
        status: 'active',
        created_at: new Date(),
      };

      mockClient.query.mockResolvedValue({ rows: [mockAlert] } as any);

      const result = await repository.create(input, mockClient);

      expect(mockClient.query).toHaveBeenCalled();
      expect(mockPool.query).not.toHaveBeenCalled();
      expect(result).toEqual(mockAlert);
    });
  });

  describe('findById', () => {
    it('should find alert by ID', async () => {
      const mockAlert: Alert = {
        id: 'alert-123',
        battery_system_id: 'battery-1',
        type: 'Temperature High',
        severity: 'critical',
        status: 'active',
        message: 'Critical temperature',
        created_at: new Date(),
      };

      mockPool.query.mockResolvedValue({ rows: [mockAlert] } as any);

      const result = await repository.findById('alert-123');

      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT * FROM alerts WHERE id = $1',
        ['alert-123']
      );
      expect(result).toEqual(mockAlert);
    });

    it('should return null if alert not found', async () => {
      mockPool.query.mockResolvedValue({ rows: [] } as any);

      const result = await repository.findById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('findByFacility', () => {
    it('should find alerts by facility ID', async () => {
      const mockAlerts = [
        {
          id: 'alert-1',
          facility_id: 'facility-1',
          battery_system_id: 'battery-1',
          type: 'Temperature High',
          severity: 'critical',
          status: 'active',
          message: 'Alert 1',
          created_at: new Date(),
        },
      ];

      mockPool.query
        .mockResolvedValueOnce({ rows: [{ total: '1' }] } as any)
        .mockResolvedValueOnce({ rows: mockAlerts } as any);

      const result = await repository.findByFacility('facility-1');

      expect(result.alerts).toEqual(mockAlerts);
      expect(result.total).toBe(1);
    });
  });

  describe('findByZone', () => {
    it('should find alerts by zone ID', async () => {
      const mockAlerts = [
        {
          id: 'alert-1',
          zone_id: 'zone-1',
          battery_system_id: 'battery-1',
          type: 'Voltage Anomaly',
          severity: 'medium',
          status: 'active',
          message: 'Alert 1',
          created_at: new Date(),
        },
      ];

      mockPool.query
        .mockResolvedValueOnce({ rows: [{ total: '1' }] } as any)
        .mockResolvedValueOnce({ rows: mockAlerts } as any);

      const result = await repository.findByZone('zone-1');

      expect(result.alerts).toEqual(mockAlerts);
      expect(result.total).toBe(1);
    });
  });

  describe('findByStatus', () => {
    it('should find alerts by status', async () => {
      const mockAlerts = [
        {
          id: 'alert-1',
          battery_system_id: 'battery-1',
          type: 'Temperature High',
          severity: 'critical',
          status: 'active',
          message: 'Active alert',
          created_at: new Date(),
        },
      ];

      mockPool.query
        .mockResolvedValueOnce({ rows: [{ total: '1' }] } as any)
        .mockResolvedValueOnce({ rows: mockAlerts } as any);

      const result = await repository.findByStatus('active');

      expect(result.alerts).toEqual(mockAlerts);
      expect(result.total).toBe(1);
    });
  });

  describe('find', () => {
    it('should find alerts with no filters', async () => {
      const mockAlerts = [
        {
          id: 'alert-1',
          battery_system_id: 'battery-1',
          type: 'Temperature High',
          severity: 'critical',
          status: 'active',
          message: 'Alert 1',
          created_at: new Date(),
        },
      ];

      mockPool.query
        .mockResolvedValueOnce({ rows: [{ total: '1' }] } as any)
        .mockResolvedValueOnce({ rows: mockAlerts } as any);

      const result = await repository.find();

      expect(result.alerts).toEqual(mockAlerts);
      expect(result.total).toBe(1);
    });

    it('should find alerts with filters', async () => {
      const filters: AlertFilters = {
        facility_id: 'facility-1',
        severity: 'critical',
        status: 'active',
      };

      mockPool.query
        .mockResolvedValueOnce({ rows: [{ total: '2' }] } as any)
        .mockResolvedValueOnce({ rows: [] } as any);

      const result = await repository.find(filters);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE'),
        expect.arrayContaining(['facility-1', 'critical', 'active', 50, 0])
      );
      expect(result.total).toBe(2);
    });

    it('should support array filters', async () => {
      const filters: AlertFilters = {
        severity: ['critical', 'high'],
        status: ['active', 'acknowledged'],
      };

      mockPool.query
        .mockResolvedValueOnce({ rows: [{ total: '5' }] } as any)
        .mockResolvedValueOnce({ rows: [] } as any);

      await repository.find(filters);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('severity = ANY'),
        expect.arrayContaining([['critical', 'high'], ['active', 'acknowledged']])
      );
    });

    it('should support pagination', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ total: '100' }] } as any)
        .mockResolvedValueOnce({ rows: [] } as any);

      await repository.find(undefined, { limit: 20, offset: 40 });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT'),
        expect.arrayContaining([20, 40])
      );
    });

    it('should support sorting', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ total: '10' }] } as any)
        .mockResolvedValueOnce({ rows: [] } as any);

      await repository.find(undefined, undefined, {
        sort_by: 'severity',
        sort_order: 'ASC',
      });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY severity ASC'),
        expect.any(Array)
      );
    });

    it('should support date range filters', async () => {
      const createdAfter = new Date('2024-01-01');
      const createdBefore = new Date('2024-12-31');

      mockPool.query
        .mockResolvedValueOnce({ rows: [{ total: '3' }] } as any)
        .mockResolvedValueOnce({ rows: [] } as any);

      await repository.find({ created_after: createdAfter, created_before: createdBefore });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('created_at >='),
        expect.arrayContaining([createdAfter, createdBefore])
      );
    });
  });

  describe('update', () => {
    it('should update alert fields', async () => {
      const updates: UpdateAlertInput = {
        status: 'acknowledged',
        acknowledged_by: 'user-123',
        acknowledged_at: new Date(),
      };

      const mockUpdatedAlert: Alert = {
        id: 'alert-1',
        battery_system_id: 'battery-1',
        type: 'Temperature High',
        severity: 'critical',
        status: 'acknowledged',
        message: 'Alert',
        created_at: new Date(),
        acknowledged_by: 'user-123',
        acknowledged_at: updates.acknowledged_at,
      };

      mockPool.query.mockResolvedValue({ rows: [mockUpdatedAlert] } as any);

      const result = await repository.update('alert-1', updates);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE alerts'),
        expect.arrayContaining(['acknowledged', 'user-123', updates.acknowledged_at, 'alert-1'])
      );
      expect(result).toEqual(mockUpdatedAlert);
    });

    it('should return current alert if no updates provided', async () => {
      const mockAlert: Alert = {
        id: 'alert-1',
        battery_system_id: 'battery-1',
        type: 'Temperature High',
        severity: 'critical',
        status: 'active',
        message: 'Alert',
        created_at: new Date(),
      };

      mockPool.query.mockResolvedValue({ rows: [mockAlert] } as any);

      const result = await repository.update('alert-1', {});

      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT * FROM alerts WHERE id = $1',
        ['alert-1']
      );
      expect(result).toEqual(mockAlert);
    });

    it('should return null if alert not found', async () => {
      mockPool.query.mockResolvedValue({ rows: [] } as any);

      const result = await repository.update('non-existent', { status: 'resolved' });

      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('should delete alert by ID', async () => {
      mockPool.query.mockResolvedValue({ rowCount: 1 } as any);

      const result = await repository.delete('alert-1');

      expect(mockPool.query).toHaveBeenCalledWith(
        'DELETE FROM alerts WHERE id = $1',
        ['alert-1']
      );
      expect(result).toBe(true);
    });

    it('should return false if alert not found', async () => {
      mockPool.query.mockResolvedValue({ rowCount: 0 } as any);

      const result = await repository.delete('non-existent');

      expect(result).toBe(false);
    });
  });

  describe('acknowledgeMultiple', () => {
    it('should acknowledge multiple alerts', async () => {
      const alertIds = ['alert-1', 'alert-2', 'alert-3'];
      const acknowledgedBy = 'user-123';

      const mockAcknowledgedAlerts = alertIds.map((id) => ({
        id,
        battery_system_id: 'battery-1',
        type: 'Temperature High',
        severity: 'critical',
        status: 'acknowledged',
        message: 'Alert',
        created_at: new Date(),
        acknowledged_by: acknowledgedBy,
        acknowledged_at: new Date(),
      }));

      mockPool.query.mockResolvedValue({ rows: mockAcknowledgedAlerts } as any);

      const result = await repository.acknowledgeMultiple(alertIds, acknowledgedBy);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("status = 'acknowledged'"),
        [acknowledgedBy, alertIds]
      );
      expect(result).toEqual(mockAcknowledgedAlerts);
      expect(result).toHaveLength(3);
    });

    it('should only acknowledge active alerts', async () => {
      mockPool.query.mockResolvedValue({ rows: [] } as any);

      await repository.acknowledgeMultiple(['alert-1'], 'user-123');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("WHERE id = ANY($2) AND status = 'active'"),
        expect.any(Array)
      );
    });
  });

  describe('resolveMultiple', () => {
    it('should resolve multiple alerts', async () => {
      const alertIds = ['alert-1', 'alert-2'];
      const resolutionNotes = 'Issue fixed';

      const mockResolvedAlerts = alertIds.map((id) => ({
        id,
        battery_system_id: 'battery-1',
        type: 'Temperature High',
        severity: 'critical',
        status: 'resolved',
        message: 'Alert',
        created_at: new Date(),
        resolved_at: new Date(),
        resolution_notes: resolutionNotes,
      }));

      mockPool.query.mockResolvedValue({ rows: mockResolvedAlerts } as any);

      const result = await repository.resolveMultiple(alertIds, resolutionNotes);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining("status = 'resolved'"),
        [resolutionNotes, alertIds]
      );
      expect(result).toEqual(mockResolvedAlerts);
    });

    it('should resolve alerts without notes', async () => {
      mockPool.query.mockResolvedValue({ rows: [] } as any);

      await repository.resolveMultiple(['alert-1']);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.anything(),
        [null, ['alert-1']]
      );
    });
  });

  describe('getStatsBySeverity', () => {
    it('should return statistics by severity', async () => {
      const mockStats = [
        { severity: 'critical', count: '5' },
        { severity: 'high', count: '10' },
        { severity: 'medium', count: '15' },
      ];

      mockPool.query.mockResolvedValue({ rows: mockStats } as any);

      const result = await repository.getStatsBySeverity('facility-1');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('GROUP BY severity'),
        ['facility-1']
      );
      expect(result).toEqual({
        info: 0,
        medium: 15,
        high: 10,
        critical: 5,
      });
    });

    it('should return zero counts for missing severities', async () => {
      mockPool.query.mockResolvedValue({ rows: [] } as any);

      const result = await repository.getStatsBySeverity('facility-1');

      expect(result).toEqual({
        info: 0,
        medium: 0,
        high: 0,
        critical: 0,
      });
    });
  });

  describe('withTransaction', () => {
    it('should execute callback within transaction', async () => {
      const callback = vi.fn().mockResolvedValue('success');

      mockClient.query.mockResolvedValue({} as any);

      const result = await repository.withTransaction(callback);

      expect(mockPool.connect).toHaveBeenCalled();
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(callback).toHaveBeenCalledWith(mockClient);
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
      expect(result).toBe('success');
    });

    it('should rollback on error', async () => {
      const error = new Error('Transaction failed');
      const callback = vi.fn().mockRejectedValue(error);

      mockClient.query.mockResolvedValue({} as any);

      await expect(repository.withTransaction(callback)).rejects.toThrow('Transaction failed');

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should release client even if rollback fails', async () => {
      const callback = vi.fn().mockRejectedValue(new Error('Callback error'));
      
      mockClient.query
        .mockResolvedValueOnce({} as any) // BEGIN
        .mockRejectedValueOnce(new Error('Rollback error')); // ROLLBACK

      await expect(repository.withTransaction(callback)).rejects.toThrow();

      expect(mockClient.release).toHaveBeenCalled();
    });
  });
});
