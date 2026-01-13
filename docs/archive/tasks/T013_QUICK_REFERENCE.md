# T013: RUL Predictions Migration - Quick Reference

## Summary
Created Migration 04 for RULPrediction entity to support MLOps integration with battery health predictions.

## Files Created
- `services/backend/migrations/004_create_rul_predictions.sql` - Main migration file
- `T013_ACCEPTANCE_CHECKLIST.md` - Detailed acceptance criteria and testing notes

## Schema Overview

### Table: rul_predictions
```sql
id                     UUID PRIMARY KEY
battery_id            UUID NOT NULL → sensors(id)
facility_id           UUID NOT NULL → facilities(id)
predicted_rul_cycles  INTEGER NOT NULL
confidence_interval   JSONB NOT NULL
confidence_score      NUMERIC(3,2) NOT NULL (0-1)
model_version         VARCHAR(50) NOT NULL
features              JSONB NOT NULL
timestamp             TIMESTAMPTZ DEFAULT NOW()
alert_triggered       BOOLEAN DEFAULT FALSE
metadata              JSONB
```

### Indexes
- `idx_rul_battery` on battery_id
- `idx_rul_facility` on facility_id  
- `idx_rul_timestamp` on timestamp DESC

### Constraints
- confidence_score CHECK (0 ≤ value ≤ 1)
- Foreign keys to sensors and facilities tables

## Key Features
✅ MLOps-ready schema for RUL predictions
✅ JSONB support for confidence intervals and features
✅ Optimized indexes for common queries
✅ Data validation constraints
✅ Comprehensive documentation

## Dependencies
- **T010**: Sensor entity (sensors table)
- **Core**: facilities table from core migrations

## Usage Example
```sql
INSERT INTO rul_predictions (
  battery_id, 
  facility_id, 
  predicted_rul_cycles,
  confidence_interval,
  confidence_score,
  model_version,
  features
) VALUES (
  '...',
  '...',
  1000,
  '{"lower": 900, "upper": 1100}',
  0.85,
  'lstm-v1.0',
  '{"soc": 95.5, "temperature": 25.3, "cycles": 450}'
);
```

## Next Steps
1. Apply migration to development database
2. Test constraint validation
3. Verify index performance
4. Integrate with MLOps API
5. Proceed to T014
