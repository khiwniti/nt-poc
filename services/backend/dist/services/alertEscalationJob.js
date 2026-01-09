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
import alertEscalationService from './alertEscalationService.js';
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
            console.log('Alert escalation job is already running');
            return;
        }
        console.log(`Starting alert escalation job with interval: ${this.cronExpression}`);
        this.task = cron.schedule(this.cronExpression, async () => {
            await this.runJob();
        });
        console.log('Alert escalation job started successfully');
    }
    /**
     * Stop the scheduled job
     */
    stop() {
        if (this.task) {
            this.task.stop();
            this.task = null;
            console.log('Alert escalation job stopped');
        }
    }
    /**
     * Run the escalation job
     */
    async runJob() {
        if (this.isRunning) {
            console.log('Alert escalation job is already running, skipping this iteration');
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
            console.log('Starting alert escalation job...');
            const result = await alertEscalationService.processEscalations();
            metrics.alertsChecked = result.checked;
            metrics.alertsEscalated = result.escalated;
            metrics.notificationsSent = result.notified;
            metrics.errors = result.errors.length;
            if (result.errors.length > 0) {
                metrics.lastError = result.errors[0];
            }
            console.log(`Alert escalation job completed: checked=${result.checked}, escalated=${result.escalated}, notified=${result.notified}, errors=${result.errors.length}`);
        }
        catch (error) {
            metrics.errors = 1;
            metrics.lastError =
                error instanceof Error ? error.message : 'Unknown error';
            console.error('Alert escalation job failed:', error);
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
        console.log('Alert escalation job already exists');
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
