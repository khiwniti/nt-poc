export interface EmailRecipient {
  email: string;
  name?: string;
}

export interface EmailNotificationConfig {
  facilityId: string;
  recipients: EmailRecipient[];
  enabled: boolean;
}

export interface AlertEmailData {
  alertId: string;
  batterySystemId: string;
  zoneId?: string;
  type: string;
  severity: 'critical' | 'warning' | 'info';
  message: string;
  createdAt: number;
  metadata?: Record<string, any>;
  dashboardLink: string;
}

export interface EmailDeliveryStatus {
  alertId: string;
  recipients: string[];
  sentAt: number;
  status: 'sent' | 'failed' | 'pending';
  sendGridMessageId?: string;
  error?: string;
}

export interface EmailRateLimiter {
  alertId: string;
  lastSentAt: number;
}
