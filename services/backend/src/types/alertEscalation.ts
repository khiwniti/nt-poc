export type AlertSeverity = 'info' | 'medium' | 'high' | 'critical';
export type AlertStatus = 'active' | 'acknowledged' | 'resolved';

export interface Alert {
  id: string;
  batterySystemId: string;
  zoneId?: string;
  facilityId?: string;
  type: string;
  severity: AlertSeverity;
  status: AlertStatus;
  message: string;
  createdAt: Date;
  acknowledgedAt?: Date;
  resolvedAt?: Date;
  metadata?: Record<string, any>;
  acknowledgedBy?: string;
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
  infoToMediumMinutes: number;
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
