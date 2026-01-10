# T118: Alert Rule Engine - Quick Reference

## Quick Start

### 1. Create a New Alert Rule
```bash
curl -X POST http://localhost:3000/api/v1/alert-rules \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "facilityId": "facility-123",
    "name": "Critical Temperature Alert",
    "description": "Alert when temperature exceeds safe limits",
    "ruleType": "temperature",
    "operator": ">",
    "thresholdValue": 50.0,
    "severity": "critical",
    "enabled": true,
    "debounceMinutes": 5
  }'
```

### 2. List Rules for a Facility
```bash
curl http://localhost:3000/api/v1/alert-rules?facilityId=facility-123 \
  -H "Authorization: Bearer $TOKEN"
```

### 3. Check Job Status
```bash
curl http://localhost:3000/api/v1/alert-rules/job/status \
  -H "Authorization: Bearer $TOKEN"
```

### 4. Manually Trigger Evaluation
```bash
curl -X POST http://localhost:3000/api/v1/alert-rules/job/trigger \
  -H "Authorization: Bearer $TOKEN"
```

## Rule Types and Default Thresholds

| Rule Type | Threshold | Operator | Severity | Description |
|-----------|-----------|----------|----------|-------------|
| `temperature` | 45.0°C | `>` | high | High temperature alert |
| `voltage` | 2.5V | `<` | critical | Low voltage alert |
| `soc` | 20.0% | `<` | medium | Low state of charge |
| `soh` | 70.0% | `<` | critical | Low state of health |
| `rul` | 30.0 days | `<` | high | Low remaining useful life |

## API Endpoints

### Rule Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/alert-rules?facilityId={id}` | List rules |
| GET | `/api/v1/alert-rules/:id` | Get rule details |
| POST | `/api/v1/alert-rules` | Create rule |
| PATCH | `/api/v1/alert-rules/:id` | Update rule |
| DELETE | `/api/v1/alert-rules/:id` | Delete rule |

### Monitoring

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/alert-rules/:id/audit-log` | Get evaluation history |
| GET | `/api/v1/alert-rules/violations/:batteryId` | Get active violations |
| GET | `/api/v1/alert-rules/job/status` | Get job metrics |
| POST | `/api/v1/alert-rules/job/trigger` | Manual evaluation |

## Rule Configuration Options

### Rule Types
- `temperature` - Battery temperature (°C)
- `voltage` - Battery voltage (V)
- `soc` - State of Charge (%)
- `soh` - State of Health (%)
- `rul` - Remaining Useful Life (days)

### Operators
- `>` - Greater than
- `>=` - Greater than or equal
- `<` - Less than
- `<=` - Less than or equal
- `==` - Equal to
- `!=` - Not equal to

### Severity Levels
- `info` - Informational
- `medium` - Medium priority
- `high` - High priority
- `critical` - Critical priority

## Debouncing

**Purpose**: Prevent alert spam from fluctuating sensor readings

**How it works**:
1. First violation creates a violation record
2. Timer starts (default: 5 minutes)
3. Additional violations update the count
4. Alert generated only after debounce period
5. Violation auto-resolves when reading normalizes

**Configuration**:
- Set `debounceMinutes` when creating/updating rules
- Range: 0-60 minutes (0 = immediate alert)
- Default: 5 minutes

## Job Operation

**Schedule**: Runs every 5 minutes (configurable)

**Process**:
1. Query all active battery systems
2. Get latest sensor readings (last 10 minutes)
3. Get latest RUL predictions (last 24 hours)
4. Evaluate all enabled rules
5. Track violations and generate alerts
6. Log all evaluations to audit log

**Environment Variable**:
```bash
RULE_EVALUATION_JOB_INTERVAL_MINUTES=5
```

## Common Operations

### Update a Rule Threshold
```bash
curl -X PATCH http://localhost:3000/api/v1/alert-rules/{ruleId} \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"thresholdValue": 55.0}'
```

### Disable a Rule
```bash
curl -X PATCH http://localhost:3000/api/v1/alert-rules/{ruleId} \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"enabled": false}'
```

### Get Audit Log (last 100 evaluations)
```bash
curl "http://localhost:3000/api/v1/alert-rules/{ruleId}/audit-log?limit=100" \
  -H "Authorization: Bearer $TOKEN"
```

### Check Active Violations for a Battery
```bash
curl http://localhost:3000/api/v1/alert-rules/violations/{batterySystemId} \
  -H "Authorization: Bearer $TOKEN"
```

## Database Queries

### View All Rules
```sql
SELECT * FROM alert_rules WHERE enabled = true ORDER BY facility_id, rule_type;
```

### View Active Violations
```sql
SELECT v.*, r.name as rule_name, r.rule_type 
FROM alert_rule_violations v
JOIN alert_rules r ON v.rule_id = r.id
WHERE v.resolved = false
ORDER BY v.first_violation_at DESC;
```

### Audit Log for a Battery
```sql
SELECT * FROM alert_rule_audit_log
WHERE battery_system_id = 'battery-123'
ORDER BY evaluated_at DESC
LIMIT 100;
```

### Rule Effectiveness
```sql
SELECT 
  r.name,
  r.rule_type,
  COUNT(*) as evaluations,
  SUM(CASE WHEN a.rule_matched THEN 1 ELSE 0 END) as matches,
  SUM(CASE WHEN a.action_taken = 'alert_created' THEN 1 ELSE 0 END) as alerts_generated
FROM alert_rules r
LEFT JOIN alert_rule_audit_log a ON r.id = a.rule_id
WHERE a.evaluated_at > NOW() - INTERVAL '7 days'
GROUP BY r.id, r.name, r.rule_type;
```

## Troubleshooting

### No Alerts Being Generated

1. **Check job status**:
   ```bash
   curl http://localhost:3000/api/v1/alert-rules/job/status -H "Authorization: Bearer $TOKEN"
   ```

2. **Verify rules are enabled**:
   ```sql
   SELECT * FROM alert_rules WHERE enabled = true;
   ```

3. **Check for violations**:
   ```sql
   SELECT * FROM alert_rule_violations WHERE resolved = false;
   ```

4. **Review audit log**:
   ```sql
   SELECT * FROM alert_rule_audit_log ORDER BY evaluated_at DESC LIMIT 20;
   ```

### Too Many Alerts

1. **Increase debounce window**:
   ```bash
   curl -X PATCH http://localhost:3000/api/v1/alert-rules/{ruleId} \
     -H "Authorization: Bearer $TOKEN" \
     -d '{"debounceMinutes": 10}'
   ```

2. **Adjust threshold**:
   ```bash
   curl -X PATCH http://localhost:3000/api/v1/alert-rules/{ruleId} \
     -H "Authorization: Bearer $TOKEN" \
     -d '{"thresholdValue": 55.0}'
   ```

3. **Disable noisy rules temporarily**:
   ```bash
   curl -X PATCH http://localhost:3000/api/v1/alert-rules/{ruleId} \
     -H "Authorization: Bearer $TOKEN" \
     -d '{"enabled": false}'
   ```

### Performance Issues

1. **Check job metrics**:
   - Look at `batteriesChecked`, `sensorsEvaluated`, `rulEvaluated`
   - Review `durationMs` and `errors`

2. **Review database indexes**:
   ```sql
   SELECT * FROM pg_indexes WHERE tablename IN ('alert_rules', 'alert_rule_violations', 'alert_rule_audit_log');
   ```

3. **Adjust job interval** (if needed):
   ```bash
   export RULE_EVALUATION_JOB_INTERVAL_MINUTES=10
   ```

## Integration with Other Systems

### With Alert Escalation (T131)
- Rule-generated alerts automatically participate in escalation
- Escalation rules configured per facility apply
- Default: high→critical after 30 minutes

### With Email Notifications (T227)
- Alerts trigger email notifications if configured
- Includes rule context in email
- Respects facility notification settings

### With Sensor Readings
- Job automatically queries latest readings
- Works with real-time sensor streams
- Handles missing data gracefully

### With RUL Predictions (T137)
- Evaluates RUL-specific rules
- Uses latest predictions (within 24 hours)
- Separate evaluation from sensor rules

## Best Practices

1. **Start Conservative**: Begin with higher thresholds, then tighten based on data
2. **Use Debouncing**: Always set appropriate debounce windows (5-10 minutes typical)
3. **Monitor Job Status**: Regularly check job metrics for errors
4. **Review Audit Logs**: Use audit logs to tune rule effectiveness
5. **Test Before Production**: Create test rules first, verify behavior
6. **Document Custom Rules**: Add clear descriptions for facility-specific rules
7. **Regular Review**: Periodically review and adjust thresholds based on operational experience

## Quick Reference Card

```
CREATE RULE:    POST   /api/v1/alert-rules
LIST RULES:     GET    /api/v1/alert-rules?facilityId={id}
GET RULE:       GET    /api/v1/alert-rules/:id
UPDATE RULE:    PATCH  /api/v1/alert-rules/:id
DELETE RULE:    DELETE /api/v1/alert-rules/:id
AUDIT LOG:      GET    /api/v1/alert-rules/:id/audit-log
VIOLATIONS:     GET    /api/v1/alert-rules/violations/:batteryId
JOB STATUS:     GET    /api/v1/alert-rules/job/status
TRIGGER JOB:    POST   /api/v1/alert-rules/job/trigger

Default Debounce: 5 minutes
Default Job Interval: 5 minutes
Sensor Lookback: 10 minutes
RUL Lookback: 24 hours
```
