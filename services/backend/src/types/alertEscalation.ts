export enum AlertSeverity {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low'
}

export enum AlertType {
  TEMPERATURE = 'temperature',
  VOLTAGE = 'voltage',
  SOC = 'soc',
  RUL = 'rul',
  CONNECTIVITY = 'connectivity'
}

export enum AlertStatus {
  ACTIVE = 'active',
  ACKNOWLEDGED = 'acknowledged',
  RESOLVED = 'resolved'
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
  createdAt: Date;
  acknowledgedAt?: Date;
  resolvedAt?: Date;
  acknowledgedBy?: string;
  metadata?: Record<string, any>;
  resolutionNotes?: string;
}

export interface EscalationEvent {
  id: string;
  alertId: string;
  fromSeverity: AlertSeverity;
  toSeverity: AlertSeverity;
  escalatedAt: Date;
  reason: string;
  autoEscalated: boolean;
  notificationSent: boolean;
  notificationSentAt?: Date;
}

export interface EscalationRule {
  id: string;
  facilityId: string;
  lowToMediumMinutes: number;
  mediumToHighMinutes: number;
  highToCriticalMinutes: number;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
  config?: Record<string, any>;
}

export interface EscalationCandidate {
  alert: Alert;
  targetSeverity: AlertSeverity;
  minutesSinceCreated: number;
  rule: EscalationRule;
}

export interface EscalationJobMetrics {
  startTime: Date;
  endTime?: Date;
  alertsChecked: number;
  alertsEscalated: number;
  notificationsSent: number;
  errors: number;
  lastError?: string;
}
