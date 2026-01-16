/**
 * Alert Escalation Scheduled Job
 * T131: US3 - Background job that checks and escalates unacknowledged alerts
 *
 * Features:
 * - Runs every 5 minutes (configurable)
 * - Checks all unacknowledged active alerts
 * - Escalates based on configured rules
 * - Sends notifications on escalation
 * - Tracks job execution metrics
 */
import * as cron from 'node-cron';
import alertEscalationService from './alertEscalationService';
import { logger } from '../observability/logger';
export class AlertEscalationJob {
    task = null;
    isRunning = false;
    lastRun = null;
    lastMetrics = null;
    cronExpression;
    constructor(intervalMinutes = 5) {
        // Run every N minutes
        this.cronExpression = `*/${intervalMinutes} * * * *`;
    }
    /**
     * Start the scheduled job
     */
    start() {
        if (this.task) {
            logger.info('alert_escalation_job_already_running');
            return;
        }
        logger.info('alert_escalation_job_starting', { cronExpression: this.cronExpression });
        this.task = cron.schedule(this.cronExpression, async () => {
            await this.runJob();
        });
        logger.info('alert_escalation_job_started');
    }
    /**
     * Stop the scheduled job
     */
    stop() {
        if (this.task) {
            this.task.stop();
            this.task = null;
            logger.info('alert_escalation_job_stopped');
        }
    }
    /**
     * Run the escalation job
     */
    async runJob() {
        if (this.isRunning) {
            logger.info('alert_escalation_job_skipped_previous_still_running');
            return;
        }
        this.isRunning = true;
        const metrics = {
            startTime: new Date(),
            alertsChecked: 0,
            alertsEscalated: 0,
            notificationsSent: 0,
            errors: 0,
        };
        try {
            logger.info('alert_escalation_job_run_started', { startTime: metrics.startTime.toISOString() });
            const result = await alertEscalationService.processEscalations();
            metrics.alertsChecked = result.checked;
            metrics.alertsEscalated = result.escalated;
            metrics.notificationsSent = result.notified;
            metrics.errors = result.errors.length;
            if (result.errors.length > 0) {
                metrics.lastError = result.errors[0];
            }
            logger.info('alert_escalation_job_run_completed', {
                checked: result.checked,
                escalated: result.escalated,
                notified: result.notified,
                errors: result.errors.length,
            });
        }
        catch (error) {
            metrics.errors = 1;
            metrics.lastError =
                error instanceof Error ? error.message : 'Unknown error';
            logger.error('alert_escalation_job_failed', { error });
        }
        finally {
            metrics.endTime = new Date();
            this.lastMetrics = metrics;
            this.lastRun = new Date();
            this.isRunning = false;
        }
    }
    /**
     * Manually trigger the job (for testing/admin purposes)
     */
    async triggerManually() {
        if (this.isRunning) {
            throw new Error('Job is already running');
        }
        await this.runJob();
    }
    /**
     * Get job status
     */
    getStatus() {
        return {
            isRunning: this.isRunning,
            lastRun: this.lastRun,
            metrics: this.lastMetrics,
        };
    }
}
// Singleton instance
let jobInstance = null;
export function startEscalationJob(intervalMinutes = 5) {
    if (jobInstance) {
        logger.info('alert_escalation_job_instance_already_exists');
        return;
    }
    jobInstance = new AlertEscalationJob(intervalMinutes);
    jobInstance.start();
}
export function stopEscalationJob() {
    if (jobInstance) {
        jobInstance.stop();
        jobInstance = null;
    }
}
export function getEscalationJob() {
    if (!jobInstance) {
        throw new Error('Alert escalation job not started');
    }
    return jobInstance;
}
