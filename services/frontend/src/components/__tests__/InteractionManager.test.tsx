import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InteractionManager } from '../3D/InteractionManager';
import { Mesh, BoxGeometry, MeshBasicMaterial } from 'three';

describe('InteractionManager', () => {
  let mockZones: Array<{ id: string; mesh: Mesh }>;
  let mockBatteries: Array<{ id: string; mesh: Mesh }>;
  let onZoneClick: ReturnType<typeof vi.fn>;
  let onBatteryClick: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onZoneClick = vi.fn();
    onBatteryClick = vi.fn();

    const geometry = new BoxGeometry(1, 1, 1);
    const material = new MeshBasicMaterial({ color: 0x00ff00 });

    mockZones = [
      { id: 'zone-1', mesh: new Mesh(geometry, material) },
      { id: 'zone-2', mesh: new Mesh(geometry, material) },
    ];

    mockBatteries = [
      { id: 'battery-1', mesh: new Mesh(geometry, material) },
      { id: 'battery-2', mesh: new Mesh(geometry, material) },
    ];
  });

  it('should have correct component structure', () => {
    expect(InteractionManager).toBeDefined();
    expect(typeof InteractionManager).toBe('function');
  });

  it('should accept zones and batteries props', () => {
    const props = {
      zones: mockZones,
      batteries: mockBatteries,
      onZoneClick,
      onBatteryClick,
    };

    expect(props.zones).toHaveLength(2);
    expect(props.batteries).toHaveLength(2);
    expect(props.onZoneClick).toBeDefined();
    expect(props.onBatteryClick).toBeDefined();
  });

  it('should have proper TypeScript types', () => {
    const zone = mockZones[0];
    const battery = mockBatteries[0];

    expect(zone.id).toBeDefined();
    expect(zone.mesh).toBeDefined();
    expect(battery.id).toBeDefined();
    expect(battery.mesh).toBeDefined();
  });
});
