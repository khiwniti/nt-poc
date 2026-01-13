# T131: Alert Escalation System - Quick Reference

## 🚀 Start the System
```bash
cd services/backend
npm run dev
```
The escalation job starts automatically and runs every 5 minutes.

## 📊 Key Endpoints

### Configure Escalation Rules
```bash
# Set custom rules for a facility
curl -X POST http://localhost:3000/api/v1/alerts/escalation/rules \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "facilityId": "facility-1",
    "infoToMediumMinutes": 90,
    "mediumToHighMinutes": 45,
    "highToCriticalMinutes": 20,
    "enabled": true
  }'
```

### Get Current Rules
```bash
curl http://localhost:3000/api/v1/alerts/escalation/rules/facility-1 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Check Job Status
```bash
curl http://localhost:3000/api/v1/alerts/escalation/job-status \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Manually Trigger Escalation
```bash
curl -X POST http://localhost:3000/api/v1/alerts/escalation/trigger \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### View Escalation History
```bash
curl http://localhost:3000/api/v1/alerts/{alertId}/escalation-history \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 🔧 Configuration

### Environment Variables
```bash
# .env file
ESCALATION_JOB_INTERVAL_MINUTES=5  # Check every 5 minutes
```

### Default Escalation Times
- **Info → Medium**: 120 minutes (2 hours)
- **Medium → High**: 60 minutes (1 hour)
- **High → Critical**: 30 minutes

## 🗄️ Database Setup
```bash
# Run migration
psql -d battery_management -f migrations/002_create_alerts_and_escalation.sql
```

## 🧪 Run Tests
```bash
# All escalation tests
npm test -- alertEscalation

# Service tests only
npm test -- alertEscalationService.test

# Job tests only
npm test -- alertEscalationJob.test

# API tests only
npm test -- routes/__tests__/alertEscalation.test
```

## 📝 Create Test Alert
```sql
-- Insert a high-severity alert that will escalate in 30 minutes
INSERT INTO alerts (
  battery_system_id, 
  facility_id, 
  type, 
  severity, 
  status, 
  message,
  created_at
) VALUES (
  'battery-test-1',
  'default',
  'Temperature Critical',
  'high',
  'active',
  'Temperature exceeds safe threshold',
  NOW() - INTERVAL '31 minutes'  -- Already past escalation time
);
```

## 🔍 Check Escalation Status
```sql
-- View recent escalations
SELECT 
  a.id,
  a.battery_system_id,
  a.severity,
  e.from_severity,
  e.to_severity,
  e.escalated_at,
  e.notification_sent
FROM alerts a
JOIN alert_escalation_events e ON a.id = e.alert_id
ORDER BY e.escalated_at DESC
LIMIT 10;
```

## ⚡ Quick Troubleshooting

### Job Not Running?
Check logs for "Alert escalation job started successfully"

### No Alerts Escalating?
1. Ensure alerts are unacknowledged: `acknowledged_at IS NULL`
2. Check alert age vs. escalation timeframe
3. Verify escalation rules are enabled

### Notifications Not Sending?
1. Check email configuration in EmailNotificationService
2. Verify facility has recipients configured
3. Check SENDGRID_API_KEY is set

## 📈 Monitor Job Performance
```typescript
// Job status response shows:
{
  "alertsChecked": 5,      // How many alerts evaluated
  "alertsEscalated": 2,    // How many were escalated
  "notificationsSent": 2,  // How many emails sent
  "errors": 0,             // Any errors encountered
  "durationMs": 2000       // How long job took
}
```

## 🎯 Common Use Cases

### Disable Escalation for a Facility
```bash
curl -X POST http://localhost:3000/api/v1/alerts/escalation/rules \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"facilityId": "facility-1", "enabled": false}'
```

### Fast-Track Escalation (Testing)
```bash
# Set to 1 minute escalation
curl -X POST http://localhost:3000/api/v1/alerts/escalation/rules \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "facilityId": "test-facility",
    "highToCriticalMinutes": 1,
    "mediumToHighMinutes": 1,
    "infoToMediumMinutes": 1,
    "enabled": true
  }'
```

### Audit Escalations
```sql
SELECT 
  e.escalated_at,
  a.battery_system_id,
  a.facility_id,
  e.from_severity || ' → ' || e.to_severity as escalation,
  e.notification_sent,
  e.reason
FROM alert_escalation_events e
JOIN alerts a ON e.alert_id = a.id
WHERE e.escalated_at > NOW() - INTERVAL '24 hours'
ORDER BY e.escalated_at DESC;
```

## 📚 Architecture

```
┌─────────────────────────────────────────┐
│     AlertEscalationJob (every 5min)     │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│     AlertEscalationService              │
│  • findEscalationCandidates()           │
│  • escalateAlert()                      │
│  • sendEscalationNotification()         │
└────────────────┬────────────────────────┘
                 │
      ┌──────────┴──────────┐
      ▼                     ▼
┌───────────┐      ┌──────────────────┐
│ Database  │      │ Email Service    │
│  • alerts │      │  • SendGrid API  │
│  • events │      └──────────────────┘
└───────────┘
```

## ✅ Verify Installation
```bash
# 1. Check migration applied
psql -d battery_management -c "SELECT COUNT(*) FROM escalation_rules;"

# 2. Check job is running
curl http://localhost:3000/api/v1/alerts/escalation/job-status \
  -H "Authorization: Bearer YOUR_TOKEN"

# 3. Create test alert and trigger job
curl -X POST http://localhost:3000/api/v1/alerts/escalation/trigger \
  -H "Authorization: Bearer YOUR_TOKEN"
```
