# T013: Migration 04 - RULPrediction Entity Acceptance Checklist

**Task**: Create RULPrediction entity for MLOps integration
**Phase**: 1 - Setup (Database)
**Migration**: 04
**Dependencies**: T010 (Sensor entity)

## Implementation Status

### ✅ Migration File Created
- **File**: `services/backend/migrations/004_create_rul_predictions.sql`
- **Status**: Complete

## Acceptance Criteria

### ✅ 1. rul_predictions table created
- [x] Table structure matches specification
- [x] UUID primary key with default gen_random_uuid()
- [x] battery_id references sensors(id)
- [x] facility_id references facilities(id)
- [x] predicted_rul_cycles INTEGER NOT NULL
- [x] confidence_interval JSONB NOT NULL
- [x] confidence_score NUMERIC(3,2) NOT NULL
- [x] model_version VARCHAR(50) NOT NULL
- [x] features JSONB NOT NULL
- [x] timestamp TIMESTAMPTZ with default NOW()
- [x] alert_triggered BOOLEAN with default FALSE
- [x] metadata JSONB (nullable)

### ✅ 2. confidence_score constraint (0-1) enforced
- [x] CHECK constraint: `confidence_score BETWEEN 0 AND 1`
- [x] Proper NUMERIC(3,2) type for precision

### ✅ 3. Indexes for queries created
- [x] idx_rul_battery on battery_id
- [x] idx_rul_facility on facility_id
- [x] idx_rul_timestamp on timestamp DESC (for recent predictions)

### ✅ 4. JSONB fields configured
- [x] confidence_interval JSONB NOT NULL
- [x] features JSONB NOT NULL
- [x] metadata JSONB (optional field)

### ✅ 5. Documentation
- [x] Table comments added
- [x] Column comments for all fields
- [x] Migration header with dependencies

## Schema Verification

```sql
-- Table structure
CREATE TABLE rul_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  battery_id UUID NOT NULL REFERENCES sensors(id),
  facility_id UUID NOT NULL REFERENCES facilities(id),
  predicted_rul_cycles INTEGER NOT NULL,
  confidence_interval JSONB NOT NULL,
  confidence_score NUMERIC(3,2) NOT NULL CHECK (confidence_score BETWEEN 0 AND 1),
  model_version VARCHAR(50) NOT NULL,
  features JSONB NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  alert_triggered BOOLEAN DEFAULT FALSE,
  metadata JSONB
);

-- Indexes
idx_rul_battery: battery_id
idx_rul_facility: facility_id
idx_rul_timestamp: timestamp DESC
```

## Testing Notes

To test this migration:

1. **Prerequisites**: Ensure T010 (sensors table) migration is applied first
2. **Apply migration**: Run the migration against your database
3. **Verify structure**: 
   ```sql
   \d rul_predictions
   ```
4. **Test constraints**:
   ```sql
   -- Should succeed
   INSERT INTO rul_predictions (battery_id, facility_id, predicted_rul_cycles, 
     confidence_interval, confidence_score, model_version, features)
   VALUES ('...', '...', 1000, '{"lower": 900, "upper": 1100}', 0.85, 'v1.0', '{}');
   
   -- Should fail (confidence_score out of range)
   INSERT INTO rul_predictions (battery_id, facility_id, predicted_rul_cycles,
     confidence_interval, confidence_score, model_version, features)
   VALUES ('...', '...', 1000, '{}', 1.5, 'v1.0', '{}');
   ```

## Dependencies

- **T010**: Sensor entity (sensors table must exist)
- **Core tables**: facilities table must exist

## Next Steps

- Apply migration to development database
- Test constraints and indexes
- Verify JSONB field functionality
- Proceed with T014 (next migration)

## Sign-off

- [ ] Database schema validated
- [ ] Constraints tested
- [ ] Indexes verified
- [ ] Documentation reviewed
- [ ] Ready for integration testing

---
**Completed**: 2026-01-11
**Migration File**: `services/backend/migrations/004_create_rul_predictions.sql`
