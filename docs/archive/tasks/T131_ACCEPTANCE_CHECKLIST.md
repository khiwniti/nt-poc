# T131: Alert Escalation System - Acceptance Checklist

## Prerequisites
- [ ] PostgreSQL database is running
- [ ] Database migrations have been applied
- [ ] Backend server is running
- [ ] Email notification service is configured (optional for testing)

## Setup Instructions

### 1. Database Setup
```bash
# Create database (if not exists)
createdb battery_management

# Run migrations
psql -d battery_management -f services/backend/migrations/001_create_rul_predictions.sql
psql -d battery_management -f services/backend/migrations/001_create_model_performance_tables.sql
psql -d battery_management -f services/backend/migrations/002_create_alerts_and_escalation.sql
```

### 2. Start Backend Server
```bash
cd services/backend
npm install
npm run dev
```

## Acceptance Tests

### ✅ AC1: Background job checking unacknowledged alerts

**Test Steps:**
1. Check that escalation job starts automatically
2. Verify job runs every 5 minutes

**Expected Results:**
- [ ] Console shows: "Starting alert escalation job (interval: 5 minutes)"
- [ ] Console shows: "Alert escalation job started successfully"

**Verification:**
```bash
# Check job status
curl http://localhost:3000/api/v1/alerts/escalation/job-status \
  -H "Authorization: Bearer test-token"

# Should return:
# {
#   "data": {
#     "isRunning": false,
#     "lastRun": null or timestamp,
#     "metrics": {...}
#   }
# }
```

**Status:** [ ] PASS [ ] FAIL

---

### ✅ AC2: Escalate high→critical after 30 minutes

**Test Steps:**
1. Create a high-severity alert that is 31 minutes old
2. Trigger escalation job manually
3. Verify alert was escalated to critical

**SQL Setup:**
```sql
-- Create a high-severity alert from 31 minutes ago
INSERT INTO alerts (
  battery_system_id, 
  facility_id, 
  type, 
  severity, 
  status, 
  message,
  created_at
) VALUES (
  'battery-test-high',
  'default',
  'Temperature Critical',
  'high',
  'active',
  'Temperature exceeds safe threshold',
  NOW() - INTERVAL '31 minutes'
) RETURNING id;
```

**API Call:**
```bash
# Trigger escalation job
curl -X POST http://localhost:3000/api/v1/alerts/escalation/trigger \
  -H "Authorization: Bearer test-token"

# Wait 2 seconds, then check job status
sleep 2
curl http://localhost:3000/api/v1/alerts/escalation/job-status \
  -H "Authorization: Bearer test-token"
```

**Verification:**
```sql
-- Check alert was escalated
SELECT 
  id, 
  battery_system_id, 
  severity, 
  created_at
FROM alerts 
WHERE battery_system_id = 'battery-test-high';

-- Should show severity = 'critical'

-- Check escalation event was created
SELECT 
  from_severity,
  to_severity,
  reason,
  escalated_at
FROM alert_escalation_events
WHERE alert_id IN (
  SELECT id FROM alerts WHERE battery_system_id = 'battery-test-high'
);

-- Should show from_severity = 'high', to_severity = 'critical'
```

**Expected Results:**
- [ ] Alert severity changed from 'high' to 'critical'
- [ ] Escalation event created with correct severity transition
- [ ] Job metrics show: alertsChecked >= 1, alertsEscalated >= 1
- [ ] Escalation reason mentions "30 minutes without acknowledgement"

**Status:** [ ] PASS [ ] FAIL

---

### ✅ AC3: Escalate medium→high after 1 hour

**Test Steps:**
1. Create a medium-severity alert that is 61 minutes old
2. Trigger escalation job
3. Verify alert was escalated to high

**SQL Setup:**
```sql
-- Create a medium-severity alert from 61 minutes ago
INSERT INTO alerts (
  battery_system_id, 
  facility_id, 
  type, 
  severity, 
  status, 
  message,
  created_at
) VALUES (
  'battery-test-medium',
  'default',
  'Voltage Anomaly',
  'medium',
  'active',
  'Voltage reading outside normal range',
  NOW() - INTERVAL '61 minutes'
) RETURNING id;
```

**API Call:**
```bash
curl -X POST http://localhost:3000/api/v1/alerts/escalation/trigger \
  -H "Authorization: Bearer test-token"
```

**Verification:**
```sql
SELECT severity FROM alerts WHERE battery_system_id = 'battery-test-medium';
-- Should return 'high'

SELECT from_severity, to_severity FROM alert_escalation_events
WHERE alert_id IN (SELECT id FROM alerts WHERE battery_system_id = 'battery-test-medium');
-- Should show from_severity = 'medium', to_severity = 'high'
```

**Expected Results:**
- [ ] Alert severity changed from 'medium' to 'high'
- [ ] Escalation event created
- [ ] Escalation reason mentions "60 minutes" threshold

**Status:** [ ] PASS [ ] FAIL

---

### ✅ AC4: Send escalation notifications

**Test Steps:**
1. Configure email recipients for a facility
2. Create an alert eligible for escalation
3. Trigger escalation
4. Verify notification was attempted

**Setup:**
```bash
# Configure email notifications
curl -X POST http://localhost:3000/api/v1/alerts/email/configure \
  -H "Authorization: Bearer test-token" \
  -H "Content-Type: application/json" \
  -d '{
    "facilityId": "default",
    "recipients": [
      {
        "email": "test@example.com",
        "name": "Test User"
      }
    ],
    "enabled": true
  }'
```

**Create Test Alert:**
```sql
INSERT INTO alerts (
  battery_system_id, 
  facility_id, 
  type, 
  severity, 
  status, 
  message,
  created_at
) VALUES (
  'battery-notify-test',
  'default',
  'Critical Alert',
  'high',
  'active',
  'Test notification',
  NOW() - INTERVAL '31 minutes'
) RETURNING id;
```

**Trigger Escalation:**
```bash
curl -X POST http://localhost:3000/api/v1/alerts/escalation/trigger \
  -H "Authorization: Bearer test-token"
```

**Verification:**
```sql
SELECT 
  notification_sent,
  notification_sent_at
FROM alert_escalation_events
WHERE alert_id IN (
  SELECT id FROM alerts WHERE battery_system_id = 'battery-notify-test'
);
```

**Expected Results:**
- [ ] Job metrics show: notificationsSent >= 1 (if SENDGRID_API_KEY configured)
- [ ] Escalation event has notification_sent = true OR false (if email not configured)
- [ ] Email contains escalation details (if received)
- [ ] Email subject includes "ESCALATED"
- [ ] Email message mentions original and new severity

**Status:** [ ] PASS [ ] FAIL

---

### ✅ AC5: Log escalation events

**Test Steps:**
1. Escalate multiple alerts
2. Query escalation history
3. Verify complete audit trail

**API Call:**
```bash
# Get escalation history for an alert
curl http://localhost:3000/api/v1/alerts/{ALERT_ID}/escalation-history \
  -H "Authorization: Bearer test-token"
```

**SQL Verification:**
```sql
-- View all escalation events
SELECT 
  a.battery_system_id,
  a.type,
  e.from_severity,
  e.to_severity,
  e.escalated_at,
  e.reason,
  e.auto_escalated,
  e.notification_sent
FROM alert_escalation_events e
JOIN alerts a ON e.alert_id = a.id
ORDER BY e.escalated_at DESC
LIMIT 10;
```

**Expected Results:**
- [ ] Each escalation has a corresponding event record
- [ ] Events contain: alert_id, from_severity, to_severity, escalated_at, reason
- [ ] auto_escalated flag is set to true
- [ ] Escalation history API returns events in descending order
- [ ] All timestamps are recorded correctly

**Status:** [ ] PASS [ ] FAIL

---

### ✅ AC6: Configurable escalation rules per facility

**Test Steps:**
1. Create custom escalation rules for a facility
2. Retrieve rules via API
3. Update rules
4. Verify alerts escalate according to custom rules

**Create Custom Rules:**
```bash
curl -X POST http://localhost:3000/api/v1/alerts/escalation/rules \
  -H "Authorization: Bearer test-token" \
  -H "Content-Type: application/json" \
  -d '{
    "facilityId": "custom-facility",
    "infoToMediumMinutes": 90,
    "mediumToHighMinutes": 45,
    "highToCriticalMinutes": 15,
    "enabled": true
  }'
```

**Retrieve Rules:**
```bash
curl http://localhost:3000/api/v1/alerts/escalation/rules/custom-facility \
  -H "Authorization: Bearer test-token"
```

**Test Custom Timeframe:**
```sql
-- Create alert with custom facility that should escalate after 15 minutes
INSERT INTO alerts (
  battery_system_id, 
  facility_id, 
  type, 
  severity, 
  status, 
  message,
  created_at
) VALUES (
  'battery-custom-facility',
  'custom-facility',
  'Temperature High',
  'high',
  'active',
  'Custom facility test',
  NOW() - INTERVAL '16 minutes'  -- Just past the 15-minute threshold
);
```

**Trigger and Verify:**
```bash
curl -X POST http://localhost:3000/api/v1/alerts/escalation/trigger \
  -H "Authorization: Bearer test-token"
```

```sql
SELECT severity FROM alerts WHERE battery_system_id = 'battery-custom-facility';
-- Should be 'critical' (escalated after 15 minutes per custom rule)
```

**Expected Results:**
- [ ] Custom rules are created successfully
- [ ] GET endpoint returns correct custom rules
- [ ] Alert escalates after 15 minutes (custom rule), not 30 (default)
- [ ] Rules can be updated via POST with same facilityId
- [ ] Facilities without custom rules use default rules

**Status:** [ ] PASS [ ] FAIL

---

## Additional Validation Tests

### Edge Cases

#### Test: Acknowledged alerts should NOT escalate
```sql
INSERT INTO alerts (
  battery_system_id, facility_id, type, severity, status, message, created_at, acknowledged_at
) VALUES (
  'battery-ack-test', 'default', 'Test', 'high', 'acknowledged', 'Test', NOW() - INTERVAL '60 minutes', NOW()
);
```
**Expected:** Alert remains 'high' after escalation job runs.
**Status:** [ ] PASS [ ] FAIL

#### Test: Critical alerts should NOT escalate further
```sql
INSERT INTO alerts (
  battery_system_id, facility_id, type, severity, status, message, created_at
) VALUES (
  'battery-crit-test', 'default', 'Test', 'critical', 'active', 'Test', NOW() - INTERVAL '60 minutes'
);
```
**Expected:** Alert remains 'critical', no escalation event created.
**Status:** [ ] PASS [ ] FAIL

#### Test: Recently created alerts should NOT escalate
```sql
INSERT INTO alerts (
  battery_system_id, facility_id, type, severity, status, message, created_at
) VALUES (
  'battery-recent-test', 'default', 'Test', 'high', 'active', 'Test', NOW() - INTERVAL '5 minutes'
);
```
**Expected:** Alert remains 'high' (not yet 30 minutes old).
**Status:** [ ] PASS [ ] FAIL

---

## Performance Tests

### Test: Job handles large volume of alerts
```sql
-- Create 100 alerts eligible for escalation
INSERT INTO alerts (battery_system_id, facility_id, type, severity, status, message, created_at)
SELECT 
  'battery-load-' || generate_series,
  'default',
  'Load Test',
  'high',
  'active',
  'Load test alert',
  NOW() - INTERVAL '31 minutes'
FROM generate_series(1, 100);
```

**Trigger and Check:**
```bash
curl -X POST http://localhost:3000/api/v1/alerts/escalation/trigger \
  -H "Authorization: Bearer test-token"

# Check job metrics
curl http://localhost:3000/api/v1/alerts/escalation/job-status \
  -H "Authorization: Bearer test-token"
```

**Expected Results:**
- [ ] Job completes in < 10 seconds
- [ ] All 100 alerts escalated successfully
- [ ] Job metrics show: alertsChecked = 100, alertsEscalated = 100, errors = 0

**Status:** [ ] PASS [ ] FAIL

---

## Final Acceptance

### All Acceptance Criteria Met
- [ ] AC1: Background job checking unacknowledged alerts - PASS
- [ ] AC2: Escalate high→critical after 30min - PASS
- [ ] AC3: Escalate medium→high after 1 hour - PASS
- [ ] AC4: Send escalation notifications - PASS
- [ ] AC5: Log escalation events - PASS
- [ ] AC6: Configurable escalation rules per facility - PASS

### Code Quality
- [ ] All TypeScript code compiles without errors
- [ ] No linting errors
- [ ] Comprehensive test coverage (with proper database setup)
- [ ] Documentation complete

### Deployment Ready
- [ ] Migration scripts tested
- [ ] Environment variables documented
- [ ] Quick reference guide available
- [ ] Error handling is robust

## Sign-off

**Tested By:** ___________________________  
**Date:** ___________________________  
**Overall Status:** [ ] APPROVED [ ] NEEDS REVISION  
**Notes:**
