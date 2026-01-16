/**
 * Alert Escalation Service
 * T131: US3 - Auto-escalates unacknowledged alerts based on configured rules
 *
 * Features:
 * - Escalates high→critical after 30 minutes (default)
 * - Escalates medium→high after 1 hour (default)
 * - Escalates info→medium after 2 hours (default)
 * - Configurable escalation rules per facility
 * - Sends notifications on escalation
 * - Logs all escalation events
 */
import { pool } from '../config/database';
import emailNotificationService from './emailNotificationService';
import { logger } from '../observability/logger';
import { AlertSeverity, } from '../types/alertEscalation';
export class AlertEscalationService {
    static instance;
    constructor() { }
    static getInstance() {
        if (!AlertEscalationService.instance) {
            AlertEscalationService.instance = new AlertEscalationService();
        }
        return AlertEscalationService.instance;
    }
    /**
     * Get escalation rules for a facility
     */
    async getEscalationRule(facilityId) {
        const client = await pool.connect();
        try {
            const result = await client.query(`SELECT 
          id, 
          facility_id as "facilityId",
          info_to_medium_minutes as "infoToMediumMinutes",
          medium_to_high_minutes as "mediumToHighMinutes",
          high_to_critical_minutes as "highToCriticalMinutes",
          enabled,
          created_at as "createdAt",
          updated_at as "updatedAt",
          config
        FROM escalation_rules 
        WHERE facility_id = $1 AND enabled = true`, [facilityId]);
            if (result.rows.length === 0) {
                // Fall back to default rule
                const defaultResult = await client.query(`SELECT 
            id, 
            facility_id as "facilityId",
            info_to_medium_minutes as "infoToMediumMinutes",
            medium_to_high_minutes as "mediumToHighMinutes",
            high_to_critical_minutes as "highToCriticalMinutes",
            enabled,
            created_at as "createdAt",
            updated_at as "updatedAt",
            config
          FROM escalation_rules 
          WHERE facility_id = 'default' AND enabled = true`);
                return defaultResult.rows.length > 0 ? defaultResult.rows[0] : null;
            }
            return result.rows[0];
        }
        finally {
            client.release();
        }
    }
    /**
     * Get the next severity level for escalation
     */
    getNextSeverity(currentSeverity) {
        const escalationPath = {
            [AlertSeverity.LOW]: AlertSeverity.MEDIUM,
            [AlertSeverity.MEDIUM]: AlertSeverity.HIGH,
            [AlertSeverity.HIGH]: AlertSeverity.CRITICAL,
            [AlertSeverity.CRITICAL]: null, // Cannot escalate beyond critical
        };
        return escalationPath[currentSeverity];
    }
    /**
     * Get escalation timeframe for a severity level
     */
    getEscalationMinutes(severity, rule) {
        const timeframes = {
            [AlertSeverity.LOW]: rule.lowToMediumMinutes,
            [AlertSeverity.MEDIUM]: rule.mediumToHighMinutes,
            [AlertSeverity.HIGH]: rule.highToCriticalMinutes,
            [AlertSeverity.CRITICAL]: null, // No escalation from critical
        };
        return timeframes[severity];
    }
    /**
     * Find alerts eligible for escalation
     */
    async findEscalationCandidates() {
        const client = await pool.connect();
        try {
            // Get all unacknowledged active alerts
            const alertsResult = await client.query(`SELECT 
          id,
          battery_system_id as "batterySystemId",
          zone_id as "zoneId",
          facility_id as "facilityId",
          type,
          severity,
          status,
          message,
          created_at as "createdAt",
          acknowledged_at as "acknowledgedAt",
          resolved_at as "resolvedAt",
          metadata,
          acknowledged_by as "acknowledgedBy",
          resolution_notes as "resolutionNotes"
        FROM alerts
        WHERE status = 'active' 
          AND acknowledged_at IS NULL
          AND severity != 'critical'
        ORDER BY created_at ASC`);
            const candidates = [];
            const now = new Date();
            for (const alert of alertsResult.rows) {
                // Get escalation rule for facility (or default)
                const facilityId = alert.facilityId || 'default';
                const rule = await this.getEscalationRule(facilityId);
                if (!rule)
                    continue;
                const nextSeverity = this.getNextSeverity(alert.severity);
                if (!nextSeverity)
                    continue;
                const escalationMinutes = this.getEscalationMinutes(alert.severity, rule);
                if (escalationMinutes === null)
                    continue;
                // Calculate time elapsed since alert creation
                const minutesSinceCreated = (now.getTime() - new Date(alert.createdAt).getTime()) / (1000 * 60);
                // Check if alert is eligible for escalation
                if (minutesSinceCreated >= escalationMinutes) {
                    candidates.push({
                        alert,
                        targetSeverity: nextSeverity,
                        minutesSinceCreated,
                        rule,
                    });
                }
            }
            return candidates;
        }
        finally {
            client.release();
        }
    }
    /**
     * Escalate an alert to a higher severity
     */
    async escalateAlert(alertId, toSeverity, reason) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            // Get current alert
            const alertResult = await client.query(`SELECT 
          id,
          battery_system_id as "batterySystemId",
          zone_id as "zoneId",
          facility_id as "facilityId",
          type,
          severity,
          status,
          message,
          created_at as "createdAt",
          metadata
        FROM alerts WHERE id = $1`, [alertId]);
            if (alertResult.rows.length === 0) {
                throw new Error(`Alert ${alertId} not found`);
            }
            const alert = alertResult.rows[0];
            const fromSeverity = alert.severity;
            // Update alert severity
            await client.query(`UPDATE alerts 
         SET severity = $1, metadata = jsonb_set(
           COALESCE(metadata, '{}'::jsonb),
           '{escalated}',
           'true'::jsonb
         )
         WHERE id = $2`, [toSeverity, alertId]);
            // Create escalation event
            const eventResult = await client.query(`INSERT INTO alert_escalation_events (
          alert_id, from_severity, to_severity, reason, auto_escalated
        )
        VALUES ($1, $2, $3, $4, true)
        RETURNING 
          id,
          alert_id as "alertId",
          from_severity as "fromSeverity",
          to_severity as "toSeverity",
          escalated_at as "escalatedAt",
          reason,
          auto_escalated as "autoEscalated",
          notification_sent as "notificationSent",
          notification_sent_at as "notificationSentAt"`, [alertId, fromSeverity, toSeverity, reason]);
            await client.query('COMMIT');
            logger.info('alert_escalated', {
                alertId,
                fromSeverity,
                toSeverity,
                reason,
            });
            return eventResult.rows[0];
        }
        catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
        finally {
            client.release();
        }
    }
    /**
     * Map alert severity to email severity
     */
    mapAlertSeverityToEmailSeverity(severity) {
        const severityMap = {
            [AlertSeverity.CRITICAL]: 'critical',
            [AlertSeverity.HIGH]: 'critical',
            [AlertSeverity.MEDIUM]: 'warning',
            [AlertSeverity.LOW]: 'info',
        };
        return severityMap[severity];
    }
    /**
     * Send escalation notification
     */
    async sendEscalationNotification(alert, escalationEvent) {
        try {
            const facilityId = alert.facilityId || 'default';
            const dashboardBaseUrl = process.env.DASHBOARD_BASE_URL || 'http://localhost:3001';
            const alertData = {
                alertId: alert.id,
                batterySystemId: alert.batterySystemId,
                zoneId: alert.zoneId,
                type: `ESCALATED: ${alert.type}`,
                severity: this.mapAlertSeverityToEmailSeverity(alert.severity),
                message: `${alert.message}\n\n⚠️ This alert has been escalated from ${escalationEvent.fromSeverity.toUpperCase()} to ${escalationEvent.toSeverity.toUpperCase()} due to no acknowledgement.`,
                createdAt: alert.createdAt.getTime(),
                metadata: {
                    ...alert.metadata,
                    originalSeverity: escalationEvent.fromSeverity,
                    escalatedAt: escalationEvent.escalatedAt.toISOString(),
                    escalationReason: escalationEvent.reason,
                },
                dashboardLink: `${dashboardBaseUrl}/alerts/${alert.id}`,
            };
            // Send email notification
            const deliveryStatus = await emailNotificationService.sendAlertNotification(facilityId, alertData);
            // Update escalation event with notification status
            if (deliveryStatus.status === 'sent') {
                const client = await pool.connect();
                try {
                    await client.query(`UPDATE alert_escalation_events 
             SET notification_sent = true, notification_sent_at = NOW()
             WHERE id = $1`, [escalationEvent.id]);
                }
                finally {
                    client.release();
                }
                return true;
            }
            return false;
        }
        catch (error) {
            logger.error('alert_escalation_notification_failed', { alertId: alert.id, error });
            return false;
        }
    }
    /**
     * Process all escalation candidates
     */
    async processEscalations() {
        const errors = [];
        let escalated = 0;
        let notified = 0;
        try {
            const candidates = await this.findEscalationCandidates();
            logger.info('alert_escalation_candidates_found', { count: candidates.length });
            for (const candidate of candidates) {
                try {
                    // Escalate the alert
                    const event = await this.escalateAlert(candidate.alert.id, candidate.targetSeverity, `Auto-escalated after ${Math.floor(candidate.minutesSinceCreated)} minutes without acknowledgement`);
                    escalated++;
                    // Update alert object with new severity for notification
                    candidate.alert.severity = candidate.targetSeverity;
                    // Send notification
                    const sent = await this.sendEscalationNotification(candidate.alert, event);
                    if (sent) {
                        notified++;
                    }
                }
                catch (error) {
                    const errorMsg = `Failed to escalate alert ${candidate.alert.id}: ${error instanceof Error ? error.message : String(error)}`;
                    logger.error('alert_escalation_candidate_failed', { error: errorMsg });
                    errors.push(errorMsg);
                }
            }
            return {
                checked: candidates.length,
                escalated,
                notified,
                errors,
            };
        }
        catch (error) {
            const errorMsg = `Failed to process escalations: ${error instanceof Error ? error.message : String(error)}`;
            logger.error('alert_escalation_processing_failed', { error: errorMsg });
            errors.push(errorMsg);
            return { checked: 0, escalated: 0, notified: 0, errors };
        }
    }
    /**
     * Get escalation history for an alert
     */
    async getEscalationHistory(alertId) {
        const client = await pool.connect();
        try {
            const result = await client.query(`SELECT 
          id,
          alert_id as "alertId",
          from_severity as "fromSeverity",
          to_severity as "toSeverity",
          escalated_at as "escalatedAt",
          reason,
          auto_escalated as "autoEscalated",
          notification_sent as "notificationSent",
          notification_sent_at as "notificationSentAt"
        FROM alert_escalation_events
        WHERE alert_id = $1
        ORDER BY escalated_at DESC`, [alertId]);
            return result.rows;
        }
        finally {
            client.release();
        }
    }
    /**
     * Create or update escalation rule for a facility
     */
    async upsertEscalationRule(facilityId, infoToMediumMinutes, mediumToHighMinutes, highToCriticalMinutes, enabled = true) {
        const client = await pool.connect();
        try {
            const result = await client.query(`INSERT INTO escalation_rules (
          facility_id, 
          info_to_medium_minutes, 
          medium_to_high_minutes, 
          high_to_critical_minutes, 
          enabled,
          updated_at
        )
        VALUES ($1, $2, $3, $4, $5, NOW())
        ON CONFLICT (facility_id) 
        DO UPDATE SET
          info_to_medium_minutes = EXCLUDED.info_to_medium_minutes,
          medium_to_high_minutes = EXCLUDED.medium_to_high_minutes,
          high_to_critical_minutes = EXCLUDED.high_to_critical_minutes,
          enabled = EXCLUDED.enabled,
          updated_at = NOW()
        RETURNING 
          id,
          facility_id as "facilityId",
          info_to_medium_minutes as "infoToMediumMinutes",
          medium_to_high_minutes as "mediumToHighMinutes",
          high_to_critical_minutes as "highToCriticalMinutes",
          enabled,
          created_at as "createdAt",
          updated_at as "updatedAt",
          config`, [facilityId, infoToMediumMinutes, mediumToHighMinutes, highToCriticalMinutes, enabled]);
            return result.rows[0];
        }
        finally {
            client.release();
        }
    }
}
export default AlertEscalationService.getInstance();
