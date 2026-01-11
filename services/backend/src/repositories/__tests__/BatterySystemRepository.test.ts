import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BatterySystemRepository } from '../BatterySystemRepository';

describe('BatterySystemRepository', () => {
  let mockPool: any;
  let repository: BatterySystemRepository;

  beforeEach(() => {
    mockPool = {
      query: vi.fn(),
    } as any;

    repository = new BatterySystemRepository(mockPool);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('findByZoneId', () => {
    it('should find battery systems by zone ID and map correctly', async () => {
      const mockRows = [{
        id: '123',
        zone_id: 'zone-1',
        name: 'Battery 1',
        model: 'Model X',
        manufacturer: 'Tesla',
        capacity_kwh: '100.5',
        installed_date: new Date('2023-01-01'),
        warranty_end_date: new Date('2033-01-01'),
        status: 'operational',
        metadata: { chemistry: 'LFP' },
        created_at: new Date(),
        updated_at: new Date()
      }];

      mockPool.query.mockResolvedValue({ rows: mockRows } as any);

      const result = await repository.findByZoneId('zone-1');

      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT * FROM battery_systems WHERE zone_id = $1',
        ['zone-1']
      );
      
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('123');
      expect(result[0].zoneId).toBe('zone-1');
      expect(result[0].capacity).toBe(100.5); // Check number conversion
      expect(result[0].status).toBe('operational');
    });
  });

  describe('findById', () => {
      it('should return null if not found', async () => {
          mockPool.query.mockResolvedValue({ rows: [] } as any);
          const result = await repository.findById('999');
          expect(result).toBeNull();
      });

      it('should return mapped object if found', async () => {
        const mockRow = {
            id: '123',
            zone_id: 'zone-1',
            name: 'Battery 1',
            model: 'Model X',
            manufacturer: 'Tesla',
            capacity_kwh: '100.0',
            installed_date: new Date(),
            warranty_end_date: new Date(),
            status: 'operational',
            metadata: {},
            created_at: new Date(),
            updated_at: new Date()
        };
        mockPool.query.mockResolvedValue({ rows: [mockRow] } as any);
        
        const result = await repository.findById('123');
        expect(result).not.toBeNull();
        expect(result?.id).toBe('123');
      });
  });

  describe('updateStatus', () => {
      it('should update status', async () => {
          mockPool.query.mockResolvedValue({} as any);
          await repository.updateStatus('123', 'degraded');
          
          expect(mockPool.query).toHaveBeenCalledWith(
              expect.stringContaining('UPDATE battery_systems SET status = $1'),
              ['degraded', '123']
          );
      });
  });
});
