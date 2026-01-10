import {
  EmailRecipient,
  EmailNotificationConfig,
  AlertEmailData,
  EmailDeliveryStatus,
  EmailRateLimiter,
} from '../types/emailNotification.js';
import { logger } from '../observability/logger.js';

/**
 * Email Notification Service for Critical Alerts
 * Integrates with SendGrid to send email notifications
 */
export class EmailNotificationService {
  private static instance: EmailNotificationService;
  private sendGridApiKey: string;
  private sendGridApiUrl = 'https://api.sendgrid.com/v3/mail/send';
  private fromEmail: string;
  private fromName: string;
  private dashboardBaseUrl: string;

  // In-memory storage for rate limiting and delivery tracking
  // In production, this should be stored in Redis or database
  private rateLimitCache: Map<string, EmailRateLimiter> = new Map();
  private deliveryStatusCache: Map<string, EmailDeliveryStatus> = new Map();

  // Facility email configuration storage
  private facilityConfigs: Map<string, EmailNotificationConfig> = new Map();

  private constructor() {
    this.sendGridApiKey = process.env.SENDGRID_API_KEY || '';
    this.fromEmail = process.env.EMAIL_FROM || 'alerts@battery-management.com';
    this.fromName = process.env.EMAIL_FROM_NAME || 'Battery Management System';
    this.dashboardBaseUrl = process.env.DASHBOARD_BASE_URL || 'http://localhost:3001';

    if (!this.sendGridApiKey) {
      logger.warn('sendgrid_api_key_not_configured_email_disabled');
    }
  }

  static getInstance(): EmailNotificationService {
    if (!EmailNotificationService.instance) {
      EmailNotificationService.instance = new EmailNotificationService();
    }
    return EmailNotificationService.instance;
  }

  /**
   * Configure email recipients for a facility
   */
  configureFacility(config: EmailNotificationConfig): void {
    this.facilityConfigs.set(config.facilityId, config);
  }

  /**
   * Get facility email configuration
   */
  getFacilityConfig(facilityId: string): EmailNotificationConfig | undefined {
    return this.facilityConfigs.get(facilityId);
  }

  /**
   * Check if email can be sent (rate limiting: max 1 email per alert)
   */
  private canSendEmail(alertId: string): boolean {
    const rateLimitEntry = this.rateLimitCache.get(alertId);
    if (rateLimitEntry) {
      // Already sent email for this alert
      return false;
    }
    return true;
  }

  /**
   * Record email sent for rate limiting
   */
  private recordEmailSent(alertId: string): void {
    this.rateLimitCache.set(alertId, {
      alertId,
      lastSentAt: Date.now(),
    });
  }

  /**
   * Generate email HTML content
   */
  private generateEmailHtml(alertData: AlertEmailData): string {
    const severityColor = {
      critical: '#dc2626',
      warning: '#f59e0b',
      info: '#3b82f6',
    }[alertData.severity];

    const severityBadge = {
      critical: '🚨 CRITICAL',
      warning: '⚠️ WARNING',
      info: 'ℹ️ INFO',
    }[alertData.severity];

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Battery Alert Notification</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background-color: ${severityColor}; padding: 20px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px;">${severityBadge}</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 30px;">
              <h2 style="margin: 0 0 20px 0; color: #111827; font-size: 20px;">${alertData.type}</h2>
              
              <p style="margin: 0 0 20px 0; color: #374151; font-size: 16px; line-height: 1.5;">
                ${alertData.message}
              </p>
              
              <!-- Alert Details -->
              <table width="100%" cellpadding="8" cellspacing="0" style="background-color: #f9fafb; border-radius: 6px; margin-bottom: 20px;">
                <tr>
                  <td style="color: #6b7280; font-size: 14px; padding: 8px 12px;"><strong>Alert ID:</strong></td>
                  <td style="color: #111827; font-size: 14px; padding: 8px 12px;">${alertData.alertId}</td>
                </tr>
                <tr>
                  <td style="color: #6b7280; font-size: 14px; padding: 8px 12px;"><strong>Battery System:</strong></td>
                  <td style="color: #111827; font-size: 14px; padding: 8px 12px;">${alertData.batterySystemId}</td>
                </tr>
                ${alertData.zoneId ? `
                <tr>
                  <td style="color: #6b7280; font-size: 14px; padding: 8px 12px;"><strong>Zone:</strong></td>
                  <td style="color: #111827; font-size: 14px; padding: 8px 12px;">${alertData.zoneId}</td>
                </tr>
                ` : ''}
                <tr>
                  <td style="color: #6b7280; font-size: 14px; padding: 8px 12px;"><strong>Time:</strong></td>
                  <td style="color: #111827; font-size: 14px; padding: 8px 12px;">${new Date(alertData.createdAt).toLocaleString()}</td>
                </tr>
              </table>
              
              ${alertData.metadata && Object.keys(alertData.metadata).length > 0 ? `
              <!-- Metadata -->
              <div style="margin-bottom: 20px;">
                <h3 style="margin: 0 0 10px 0; color: #111827; font-size: 16px;">Additional Details</h3>
                <table width="100%" cellpadding="6" cellspacing="0" style="background-color: #f9fafb; border-radius: 6px;">
                  ${Object.entries(alertData.metadata).map(([key, value]) => `
                  <tr>
                    <td style="color: #6b7280; font-size: 13px; padding: 6px 12px;"><strong>${key}:</strong></td>
                    <td style="color: #111827; font-size: 13px; padding: 6px 12px;">${value}</td>
                  </tr>
                  `).join('')}
                </table>
              </div>
              ` : ''}
              
              <!-- Call to Action -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 30px;">
                <tr>
                  <td align="center">
                    <a href="${alertData.dashboardLink}" style="display: inline-block; padding: 12px 30px; background-color: ${severityColor}; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold;">
                      View Alert in Dashboard
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #6b7280; font-size: 12px;">
                This is an automated alert from Battery Management System.<br>
                Please do not reply to this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();
  }

  /**
   * Generate plain text email content
   */
  private generateEmailText(alertData: AlertEmailData): string {
    const severityLabel = {
      critical: '🚨 CRITICAL ALERT',
      warning: '⚠️ WARNING ALERT',
      info: 'ℹ️ INFO ALERT',
    }[alertData.severity];

    let text = `${severityLabel}\n\n`;
    text += `${alertData.type}\n`;
    text += `${'-'.repeat(50)}\n\n`;
    text += `${alertData.message}\n\n`;
    text += `Alert Details:\n`;
    text += `- Alert ID: ${alertData.alertId}\n`;
    text += `- Battery System: ${alertData.batterySystemId}\n`;
    if (alertData.zoneId) {
      text += `- Zone: ${alertData.zoneId}\n`;
    }
    text += `- Time: ${new Date(alertData.createdAt).toLocaleString()}\n`;

    if (alertData.metadata && Object.keys(alertData.metadata).length > 0) {
      text += `\nAdditional Details:\n`;
      Object.entries(alertData.metadata).forEach(([key, value]) => {
        text += `- ${key}: ${value}\n`;
      });
    }

    text += `\nView in Dashboard: ${alertData.dashboardLink}\n\n`;
    text += `---\n`;
    text += `This is an automated alert from Battery Management System.\n`;
    text += `Please do not reply to this email.\n`;

    return text;
  }

  /**
   * Send email notification for critical alert
   */
  async sendAlertNotification(
    facilityId: string,
    alertData: AlertEmailData
  ): Promise<EmailDeliveryStatus> {
    // Check if SendGrid is configured
    if (!this.sendGridApiKey) {
      const status: EmailDeliveryStatus = {
        alertId: alertData.alertId,
        recipients: [],
        sentAt: Date.now(),
        status: 'failed',
        error: 'SendGrid API key not configured',
      };
      this.deliveryStatusCache.set(alertData.alertId, status);
      return status;
    }

    // Get facility configuration
    const facilityConfig = this.getFacilityConfig(facilityId);
    if (!facilityConfig || !facilityConfig.enabled) {
      const status: EmailDeliveryStatus = {
        alertId: alertData.alertId,
        recipients: [],
        sentAt: Date.now(),
        status: 'failed',
        error: 'Email notifications not enabled for facility',
      };
      this.deliveryStatusCache.set(alertData.alertId, status);
      return status;
    }

    if (facilityConfig.recipients.length === 0) {
      const status: EmailDeliveryStatus = {
        alertId: alertData.alertId,
        recipients: [],
        sentAt: Date.now(),
        status: 'failed',
        error: 'No recipients configured for facility',
      };
      this.deliveryStatusCache.set(alertData.alertId, status);
      return status;
    }

    // Check rate limiting (max 1 email per alert)
    if (!this.canSendEmail(alertData.alertId)) {
      const existingStatus = this.deliveryStatusCache.get(alertData.alertId);
      if (existingStatus) {
        return existingStatus;
      }
      
      const status: EmailDeliveryStatus = {
        alertId: alertData.alertId,
        recipients: facilityConfig.recipients.map(r => r.email),
        sentAt: Date.now(),
        status: 'failed',
        error: 'Rate limit exceeded: Email already sent for this alert',
      };
      this.deliveryStatusCache.set(alertData.alertId, status);
      return status;
    }

    // Generate email content
    const htmlContent = this.generateEmailHtml(alertData);
    const textContent = this.generateEmailText(alertData);

    // Prepare SendGrid API request
    const personalizations = facilityConfig.recipients.map(recipient => ({
      to: [
        {
          email: recipient.email,
          name: recipient.name || recipient.email,
        },
      ],
    }));

    const sendGridPayload = {
      personalizations,
      from: {
        email: this.fromEmail,
        name: this.fromName,
      },
      subject: `[${alertData.severity.toUpperCase()}] ${alertData.type} - ${alertData.batterySystemId}`,
      content: [
        {
          type: 'text/plain',
          value: textContent,
        },
        {
          type: 'text/html',
          value: htmlContent,
        },
      ],
    };

    try {
      // Send email via SendGrid
      const response = await fetch(this.sendGridApiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.sendGridApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sendGridPayload),
      });

      if (response.ok || response.status === 202) {
        // SendGrid returns 202 Accepted for successful requests
        const messageId = response.headers.get('x-message-id') || undefined;
        
        const status: EmailDeliveryStatus = {
          alertId: alertData.alertId,
          recipients: facilityConfig.recipients.map(r => r.email),
          sentAt: Date.now(),
          status: 'sent',
          sendGridMessageId: messageId,
        };

        // Record successful send
        this.recordEmailSent(alertData.alertId);
        this.deliveryStatusCache.set(alertData.alertId, status);

        return status;
      } else {
        const errorText = await response.text();
        const status: EmailDeliveryStatus = {
          alertId: alertData.alertId,
          recipients: facilityConfig.recipients.map(r => r.email),
          sentAt: Date.now(),
          status: 'failed',
          error: `SendGrid API error: ${response.status} - ${errorText}`,
        };
        this.deliveryStatusCache.set(alertData.alertId, status);
        return status;
      }
    } catch (error) {
      const status: EmailDeliveryStatus = {
        alertId: alertData.alertId,
        recipients: facilityConfig.recipients.map(r => r.email),
        sentAt: Date.now(),
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      this.deliveryStatusCache.set(alertData.alertId, status);
      return status;
    }
  }

  /**
   * Get email delivery status for an alert
   */
  getDeliveryStatus(alertId: string): EmailDeliveryStatus | undefined {
    return this.deliveryStatusCache.get(alertId);
  }

  /**
   * Get all facility configurations
   */
  getAllFacilityConfigs(): EmailNotificationConfig[] {
    return Array.from(this.facilityConfigs.values());
  }

  /**
   * Clear rate limit cache (for testing)
   */
  clearRateLimitCache(): void {
    this.rateLimitCache.clear();
  }

  /**
   * Clear delivery status cache (for testing)
   */
  clearDeliveryStatusCache(): void {
    this.deliveryStatusCache.clear();
  }

  /**
   * Clear all facility configurations (for testing)
   */
  clearFacilityConfigs(): void {
    this.facilityConfigs.clear();
  }

  /**
   * Reinitialize API key (for testing)
   */
  reinitializeApiKey(): void {
    this.sendGridApiKey = process.env.SENDGRID_API_KEY || '';
    this.fromEmail = process.env.EMAIL_FROM || 'alerts@battery-management.com';
    this.fromName = process.env.EMAIL_FROM_NAME || 'Battery Management System';
    this.dashboardBaseUrl = process.env.DASHBOARD_BASE_URL || 'http://localhost:3001';
  }
}

export default EmailNotificationService.getInstance();
