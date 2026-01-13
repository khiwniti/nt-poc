# T009 Quick Reference Guide

## What Was Created

### New Migration Files (2)
1. `migrations/20260111_1400_update_alerts_schema.ts` - Updates alerts table to T116 spec
2. `migrations/20260111_1410_create_alert_escalation_tables.ts` - Adds escalation system

### Total Migrations: 7
- 5 existing migrations (core tables, RUL, MLOps, reports)
- 2 new migrations (alert schema update + escalation tables)

## Quick Commands

```bash
cd services/backend

# Check migration status
npm run migrate:status

# Apply new migrations (requires database running)
npm run migrate

# Rollback if needed
npm run migrate:rollback

# Create new migration
npm run migrate:make migration_name
```

## Alert Schema Changes (Migration 6)

### Added Columns
- `facility_id` VARCHAR(255) - Facility association
- `zone_id` VARCHAR(255) - Zone-level tracking
- `status` ENUM ['active', 'acknowledged', 'resolved'] - Lifecycle status
- `resolution_notes` TEXT - Resolution documentation

### Removed Columns
- `acknowledged` BOOLEAN → migrated to `status` enum
- `resolved` BOOLEAN → migrated to `status` enum

### Updated Columns
- `severity` ENUM: 'low' → 'info' (now 'info', 'medium', 'high', 'critical')

## New Tables (Migration 7)

### alert_escalation_events
Tracks severity escalation history
- Columns: id, alert_id, from_severity, to_severity, escalated_at, reason, auto_escalated, notification_sent, notification_sent_at
- Indexes: alert_id + escalated_at, escalated_at

### escalation_rules
Facility-specific escalation configuration
- Columns: id, facility_id, info_to_medium_minutes, medium_to_high_minutes, high_to_critical_minutes, enabled, created_at, updated_at, config
- Default rule: 120/60/30 minutes for 'default' facility
- Indexes: facility_id, enabled + facility_id

## Testing Checklist

### Prerequisites
- [ ] PostgreSQL installed and running
- [ ] Database `battery_management` created
- [ ] Environment variables configured (`.env`)

### Verification Steps
```bash
# 1. Check migrations are recognized
npm run migrate:status
# Should show migrations 6 and 7 as pending

# 2. Apply migrations
npm run migrate
# Should succeed with no errors

# 3. Verify in PostgreSQL
psql -d battery_management -c "\d alerts"
# Should show new columns: facility_id, zone_id, status, resolution_notes

psql -d battery_management -c "\d alert_escalation_events"
# Should show table structure

psql -d battery_management -c "\d escalation_rules"
# Should show table structure

psql -d battery_management -c "SELECT * FROM escalation_rules;"
# Should return 1 row with default rule

# 4. Test rollback
npm run migrate:rollback  # Rollback migration 7
npm run migrate:rollback  # Rollback migration 6

# 5. Re-apply
npm run migrate
```

## Schema Quick Reference

### Alerts Table (After Migration 6)
```typescript
{
  id: uuid,
  battery_system_id: uuid FK,
  facility_id: string,        // NEW
  zone_id: string,            // NEW
  severity: 'info' | 'medium' | 'high' | 'critical',  // UPDATED
  type: string,
  message: text,
  status: 'active' | 'acknowledged' | 'resolved',  // NEW
  metadata: jsonb,
  acknowledged_at: timestamptz,
  acknowledged_by: string,
  resolved_at: timestamptz,
  resolution_notes: text,     // NEW
  created_at: timestamptz
}
```

### Alert Escalation Events
```typescript
{
  id: uuid,
  alert_id: uuid FK → alerts,
  from_severity: string,
  to_severity: string,
  escalated_at: timestamptz,
  reason: text,
  auto_escalated: boolean,
  notification_sent: boolean,
  notification_sent_at: timestamptz
}
```

### Escalation Rules
```typescript
{
  id: uuid,
  facility_id: string UNIQUE,
  info_to_medium_minutes: integer (default 120),
  medium_to_high_minutes: integer (default 60),
  high_to_critical_minutes: integer (default 30),
  enabled: boolean (default true),
  created_at: timestamptz,
  updated_at: timestamptz,
  config: jsonb
}
```

## Data Migration

### Boolean → Status Conversion
Migration 6 automatically converts existing data:
- `resolved = true` → `status = 'resolved'`
- `acknowledged = true` AND `resolved = false` → `status = 'acknowledged'`
- Both false → `status = 'active'`

### Rollback
Rollback reverses the conversion:
- `status = 'resolved'` → `resolved = true, acknowledged = true`
- `status = 'acknowledged'` → `acknowledged = true, resolved = false`
- `status = 'active'` → `acknowledged = false, resolved = false`

## Common Issues

### Issue: tsx command not found
**Solution**: Run `npm install` first to install dependencies

### Issue: Database connection failed
**Solution**: Check `.env` configuration:
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=battery_management
DB_USER=postgres
DB_PASSWORD=postgres
```

### Issue: Migration fails with enum error
**Solution**: This is normal on first run. The migration handles enum type creation and updates.

### Issue: Foreign key constraint violation
**Solution**: Ensure migration order is correct. Migrations run in timestamp order automatically.

## Integration with T116

### TypeScript Types Match Database Schema
```typescript
// services/backend/src/types/alertEscalation.ts

enum AlertStatus {
  ACTIVE = 'active',           // ✓ Matches DB
  ACKNOWLEDGED = 'acknowledged', // ✓ Matches DB
  RESOLVED = 'resolved'         // ✓ Matches DB
}

enum AlertSeverity {
  LOW = 'info',      // ✓ Mapped: TypeScript 'low' → DB 'info'
  MEDIUM = 'medium', // ✓ Matches DB
  HIGH = 'high',     // ✓ Matches DB
  CRITICAL = 'critical' // ✓ Matches DB
}

interface Alert {
  id: string;
  facilityId: string;           // ✓ DB: facility_id
  zoneId: string;               // ✓ DB: zone_id
  batterySystemId: string;      // ✓ DB: battery_system_id
  severity: AlertSeverity;      // ✓ Matches DB enum
  type: AlertType;
  message: string;
  status: AlertStatus;          // ✓ Matches DB enum
  createdAt: Date;
  acknowledgedAt?: Date;
  resolvedAt?: Date;
  acknowledgedBy?: string;
  metadata?: Record<string, any>;
  resolutionNotes?: string;     // ✓ DB: resolution_notes
}
```

## Documentation

- **Full Guide**: `services/backend/MIGRATIONS.md`
- **Implementation Summary**: `T009_IMPLEMENTATION_COMPLETE.md`
- **This Quick Reference**: `T009_QUICK_REFERENCE.md`

## Next Tasks

After T009 is complete:
- **T010**: Implement Alert API endpoints (CRUD operations)
- **T011**: Implement alert escalation service
- **T012**: Frontend Alert dashboard integration

---

**Quick Links**:
- [T116 Alert Data Model](./T116_IMPLEMENTATION_COMPLETE.md)
- [Full Migration Guide](./services/backend/MIGRATIONS.md)
- [Backend README](./services/backend/README.md)
