# T131: Alert Escalation System - Implementation Complete ✅

## Overview
Implemented a comprehensive alert escalation system that automatically escalates unacknowledged alerts based on configurable rules per facility.

## Features Implemented

### ✅ Background Job Checking Unacknowledged Alerts
- **Service**: `AlertEscalationJob` runs every 5 minutes (configurable)
- **Location**: `services/backend/src/services/alertEscalationJob.ts`
- Checks all active, unacknowledged alerts
- Uses node-cron for scheduled execution
- Tracks job execution metrics (alerts checked, escalated, notifications sent, errors)
- Supports manual triggering for testing/admin purposes

### ✅ Escalation Rules
- **Default Rules**:
  - High → Critical: 30 minutes
  - Medium → High: 60 minutes (1 hour)
  - Info → Medium: 120 minutes (2 hours)
- **Configurable per Facility**: Each facility can override default rules
- **Location**: `services/backend/src/services/alertEscalationService.ts`

### ✅ Automatic Escalation
- Escalates based on time since alert creation
- Only escalates unacknowledged, active alerts
- Cannot escalate beyond critical severity
- Updates alert severity in database
- Creates escalation event record with full audit trail

### ✅ Escalation Notifications
- Sends email notifications when alerts are escalated
- Integrates with existing EmailNotificationService
- Enhanced email content showing original severity and escalation reason
- Tracks notification delivery status
- Respects facility email configuration

### ✅ Escalation Event Logging
- Complete audit trail in `alert_escalation_events` table
- Tracks: from/to severity, timestamp, reason, notification status
- Query escalation history for any alert
- Auto-escalated flag for filtering

### ✅ Configurable Rules Per Facility
- API endpoints for managing facility-specific rules
- Update timeframes for each escalation level
- Enable/disable escalation per facility
- Falls back to default rules if no custom rules exist

## Database Schema

### Tables Created (Migration: `002_create_alerts_and_escalation.sql`)

1. **alerts**
   - Core alert information
   - Severity levels: info, medium, high, critical
   - Status: active, acknowledged, resolved
   - Timestamps for creation, acknowledgement, resolution

2. **alert_escalation_events**
   - Complete escalation history
   - Links to alerts via foreign key
   - Tracks notification delivery

3. **escalation_rules**
   - Facility-specific configuration
   - Timeframes for each escalation level
   - Enable/disable flag per facility

### Indexes
- Optimized for finding unacknowledged alerts
- Efficient querying by facility, severity, status
- Fast escalation history lookups

## API Endpoints

### Escalation Rules Management
```typescript
POST   /api/v1/alerts/escalation/rules
GET    /api/v1/alerts/escalation/rules/:facilityId
```

### Escalation History
```typescript
GET    /api/v1/alerts/:id/escalation-history
```

### Job Management
```typescript
GET    /api/v1/alerts/escalation/job-status
POST   /api/v1/alerts/escalation/trigger
```

## Configuration

### Environment Variables
```bash
# Alert escalation job interval (default: 5 minutes)
ESCALATION_JOB_INTERVAL_MINUTES=5
```

### Default Escalation Timeframes
- Info → Medium: 120 minutes
- Medium → High: 60 minutes
- High → Critical: 30 minutes

## Testing

### Test Files Created
1. **Service Tests**: `src/services/__tests__/alertEscalationService.test.ts`
   - Escalation rule management
   - Finding escalation candidates
   - Escalating alerts
   - Processing bulk escalations
   - Escalation history

2. **Job Tests**: `src/services/__tests__/alertEscalationJob.test.ts`
   - Job lifecycle (start, stop)
   - Manual triggering
   - Status reporting
   - Job execution with real alerts

3. **API Tests**: `src/routes/__tests__/alertEscalation.test.ts`
   - Rule configuration endpoints
   - Escalation history retrieval
   - Job status and triggering

### Running Tests
```bash
cd services/backend
npm test -- alertEscalation
```

## Usage Examples

### Configure Facility Escalation Rules
```typescript
POST /api/v1/alerts/escalation/rules
{
  "facilityId": "facility-123",
  "infoToMediumMinutes": 90,
  "mediumToHighMinutes": 45,
  "highToCriticalMinutes": 20,
  "enabled": true
}
```

### Get Escalation History
```typescript
GET /api/v1/alerts/{alertId}/escalation-history

Response:
{
  "data": [
    {
      "id": "event-123",
      "alertId": "alert-456",
      "fromSeverity": "high",
      "toSeverity": "critical",
      "escalatedAt": "2024-01-09T12:00:00Z",
      "reason": "Auto-escalated after 30 minutes without acknowledgement",
      "autoEscalated": true,
      "notificationSent": true,
      "notificationSentAt": "2024-01-09T12:00:05Z"
    }
  ]
}
```

### Manually Trigger Escalation Job
```typescript
POST /api/v1/alerts/escalation/trigger

Response:
{
  "success": true,
  "message": "Escalation job triggered successfully",
  "data": {
    "triggeredAt": "2024-01-09T12:00:00Z"
  }
}
```

### Check Job Status
```typescript
GET /api/v1/alerts/escalation/job-status

Response:
{
  "data": {
    "isRunning": false,
    "lastRun": "2024-01-09T11:55:00Z",
    "metrics": {
      "startTime": "2024-01-09T11:55:00Z",
      "endTime": "2024-01-09T11:55:02Z",
      "durationMs": 2000,
      "alertsChecked": 5,
      "alertsEscalated": 2,
      "notificationsSent": 2,
      "errors": 0,
      "lastError": null
    }
  }
}
```

## Implementation Details

### Escalation Logic Flow
1. Job runs every 5 minutes
2. Queries all active, unacknowledged alerts
3. For each alert:
   - Gets facility escalation rules (or default)
   - Calculates time since creation
   - Checks if eligible for escalation
   - If eligible: escalates and creates event
4. Sends escalation notifications
5. Updates job metrics

### Performance Considerations
- Indexed queries for efficient alert lookup
- Batch processing of escalations
- Async notification sending
- Job execution metrics for monitoring

### Error Handling
- Individual alert escalation failures don't stop batch processing
- All errors logged and tracked in metrics
- Transactional updates for data consistency
- Graceful degradation if email service unavailable

## Integration Points

### With Email Notification Service
- Reuses existing email infrastructure
- Enhanced email templates for escalations
- Respects facility notification preferences
- Tracks delivery status

### With Alert Management
- Works with existing alert schema
- Updates severity in-place
- Maintains alert status independently
- Preserves original alert data

## Future Enhancements (Not Required for US3)
- Dashboard UI for managing escalation rules
- Alert escalation analytics and reporting
- Webhooks for escalation events
- SMS/push notifications for escalations
- Escalation rate limiting per facility
- Custom escalation paths per alert type

## Acceptance Criteria Status

- ✅ Background job checking unacknowledged alerts
- ✅ Escalate high→critical after 30min
- ✅ Escalate medium→high after 1 hour  
- ✅ Send escalation notifications
- ✅ Log escalation events
- ✅ Configurable escalation rules per facility

## Files Modified/Created

### New Files
- `migrations/002_create_alerts_and_escalation.sql`
- `src/types/alertEscalation.ts`
- `src/services/alertEscalationService.ts`
- `src/services/alertEscalationJob.ts`
- `src/services/__tests__/alertEscalationService.test.ts`
- `src/services/__tests__/alertEscalationJob.test.ts`
- `src/routes/__tests__/alertEscalation.test.ts`

### Modified Files
- `src/index.ts` - Added escalation job startup
- `src/routes/alerts.ts` - Added escalation API endpoints
- `.env.example` - Added ESCALATION_JOB_INTERVAL_MINUTES

## Summary
A complete alert escalation system that meets all acceptance criteria, with comprehensive testing, documentation, and production-ready code. The system is configurable, scalable, and integrates seamlessly with existing infrastructure.
