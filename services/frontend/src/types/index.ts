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
