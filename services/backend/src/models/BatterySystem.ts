export interface BatterySystem {
  id: string;
  zoneId: string;
  name: string;
  model: string;
  manufacturer: string;
  capacity: number; // kWh
  installDate: Date;
  warrantyEndDate: Date;
  status: 'operational' | 'degraded' | 'maintenance' | 'offline';
  metadata: {
    nominalVoltage?: number;
    chemistry?: string;
    cycleCount?: number;
    [key: string]: any;
  };
  createdAt: Date;
  updatedAt: Date;
}
