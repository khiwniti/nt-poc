export interface SensorReading {
  id?: number;
  batterySystemId: string;
  time: number;
  voltage?: number;
  current?: number;
  temperature?: number;
  [key: string]: unknown;
}

export enum AlertSeverity {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

export enum AlertType {
  TEMPERATURE = 'temperature',
  VOLTAGE = 'voltage',
  SOC = 'soc',
  RUL = 'rul',
  CONNECTIVITY = 'connectivity',
}

export enum AlertStatus {
  ACTIVE = 'active',
  ACKNOWLEDGED = 'acknowledged',
  RESOLVED = 'resolved',
}

export interface Alert {
  id: string;
  facilityId: string;
  zoneId: string;
  batterySystemId: string;
  severity: AlertSeverity;
  type: AlertType;
  message: string;
  status: AlertStatus;
  createdAt: number;
  acknowledgedAt?: number;
  resolvedAt?: number;
  acknowledgedBy?: string;
  duration?: number;
  // Legacy compatibility
  branchId?: string;
  title?: string;
  timestamp?: Date;
  read?: boolean;
  category?: 'equipment' | 'energy' | 'security';
}

export interface Facility {
  id: string;
  name: string;
  location: string;
  latitude: number;
  longitude: number;
  timezone: string;
  status: 'active' | 'inactive' | 'maintenance';
  totalZones: number;
  // Legacy compatibility
  lat?: number;
  lng?: number;
  region?: string;
  coordinates?: { x: number; y: number };
  metrics?: any;
}

export interface FacilityHealthStatus {
  facilityId: string;
  status: 'healthy' | 'warning' | 'critical' | 'offline';
  activeAlertCount: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  infoCount: number;
}

// Re-export all types from facility-manager for new UI components
export * from './facility-manager';
