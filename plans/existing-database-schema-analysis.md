# Existing Database Schema Analysis - NT-POC Battery Management System

**Document Purpose**: Comprehensive analysis of the existing database schema for designing 3D battery monitoring with sensor simulation and MLOps support.

**Date**: 2026-01-17  
**Status**: ✅ Research Complete - Ready for Schema Design

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Database Configuration](#database-configuration)
3. [Core Schema Structure](#core-schema-structure)
4. [Detailed Table Analysis](#detailed-table-analysis)
5. [Migration Patterns & Conventions](#migration-patterns--conventions)
6. [Seed Data Structure](#seed-data-structure)
7. [Gaps for 3D Monitoring & Sensor Simulation](#gaps-for-3d-monitoring--sensor-simulation)
8. [Recommendations for New Schema Design](#recommendations-for-new-schema-design)

---

## Executive Summary

### Current State

The NT-POC database uses **PostgreSQL** with **Knex.js** migrations and has a well-established **3-tier hierarchical structure**:

```
facilities (3 in seed data)
    ↓
zones (5 in seed data)
    ↓
battery_systems (5 in seed data)
    ↓
sensor_readings (120 in seed data - 24 readings per battery)
```

### Key Findings

✅ **Strengths**:
- Clean 3-tier hierarchy already in place
- Comprehensive MLOps infrastructure (model performance tracking, drift detection)
- Alert management with escalation rules
- Geospatial support (latitude/longitude on facilities)
- Time-series data handling for sensor readings
- Extensive facility management system (leases, work orders, assets, inventory)

⚠️ **Gaps for 3D Monitoring**:
- No 3D position data (x, y, z coordinates) in battery_systems
- No rack/cabinet physical layout information
- No sensor-specific metadata for simulation (sensor types, ranges, noise profiles)
- No visual representation data (colors, shapes for 3D rendering)

⚠️ **Gaps for Sensor Simulation**:
- No sensor simulation configuration tables
- No sensor type definitions or characteristics
- No simulation profiles (normal, degraded, failure scenarios)
- No synthetic data generation parameters

### Migration Quality

**Status**: ✅ **Migrations are properly structured** (after recent fixes documented in [database-schema-fix-strategy.md](./database-schema-fix-strategy.md))

- TypeScript-based migrations using Knex.js
- Proper rollback implementations
- Idempotent migration patterns (check before create)
- Well-indexed for query performance

---

## Database Configuration

### Connection Details

**File**: [`services/backend/src/config/knex.ts`](../services/backend/src/config/knex.ts:1)

```typescript
{
  client: 'pg',  // PostgreSQL
  connection: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'battery_management',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    ssl: dbSslEnabled ? { rejectUnauthorized: false } : undefined
  }
}
```

### Migration Configuration

**File**: [`services/backend/knexfile.ts`](../services/backend/knexfile.ts:1)

```typescript
migrations: {
  directory: './migrations',
  extension: 'ts',  // TypeScript migrations
  tableName: 'knex_migrations'
},
seeds: {
  directory: './seeds',
  extension: 'ts'
}
```

### Database Type

- **Primary**: PostgreSQL 14+
- **Extensions Considered**: TimescaleDB (hypertable support found in migration files)
- **ORM/Query Builder**: Knex.js v3.x
- **Migration Tool**: Knex CLI

---

## Core Schema Structure

### Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         FACILITIES                               │
│  - id (UUID PK)                                                  │
│  - name, location, timezone                                      │
│  - latitude, longitude (geospatial)                             │
│  - region, lat, lng (additional geospatial)                     │
│  - metrics (JSONB) - power, temp, humidity, PUE                 │
│  - status: active|inactive|maintenance                          │
└──────────────────┬──────────────────────────────────────────────┘
                   │ 1:N
                   ↓
┌─────────────────────────────────────────────────────────────────┐
│                           ZONES                                  │
│  - id (UUID PK)                                                  │
│  - facility_id (UUID FK → facilities.id)                        │
│  - name, location                                               │
│  - status: active|inactive|maintenance                          │
└──────────────────┬──────────────────────────────────────────────┘
                   │ 1:N
                   ↓
┌─────────────────────────────────────────────────────────────────┐
│                      BATTERY_SYSTEMS                             │
│  - id (UUID PK)                                                  │
│  - zone_id (UUID FK → zones.id)                                 │
│  - serial_number, model, manufacturer                           │
│  - capacity_kwh, voltage_v                                      │
│  - health_score (0-100)                                         │
│  - status: active|inactive|maintenance|offline                  │
│  - installation_date, warranty_end_date                         │
│  - metadata (JSONB)                                             │
└──────────────────┬──────────────────────────────────────────────┘
                   │ 1:N
                   ↓
┌─────────────────────────────────────────────────────────────────┐
│                      SENSOR_READINGS                             │
│  - id (SERIAL PK)                                               │
│  - battery_system_id (UUID FK → battery_systems.id)            │
│  - time (TIMESTAMPTZ)                                           │
│  - voltage, current, temperature                                │
│  - soc (state of charge), soh (state of health)                │
│  - power                                                        │
└─────────────────────────────────────────────────────────────────┘
```

### Supporting Tables

**Alerts & Escalation**:
- `alerts` - Battery system alerts with severity, status, escalation
- `alert_escalation_events` - History of alert severity escalations
- `escalation_rules` - Facility-specific escalation timeframes

**ML & Predictions**:
- `rul_predictions` - Remaining Useful Life predictions
- `model_predictions` - ML model prediction tracking
- `model_performance_metrics` - Accuracy metrics (MAE, RMSE, R²)
- `model_drift_metrics` - Feature drift detection
- `data_quality_metrics` - Data completeness and outlier tracking
- `model_health_alerts` - ML model health monitoring
- `model_health_scores` - Overall model health scores

**Facility Management**:
- `lease_contracts` - Tenant lease management
- `work_orders` - Maintenance work orders
- `asset_lifecycle` - Asset tracking (HVAC, electrical, etc.)
- `predictive_assets` - Predictive maintenance for assets
- `report_documents` - ISO-compliant reports
- `spare_parts` - Inventory management
- `suppliers` - Supplier management
- `purchase_orders` - Purchase order tracking
- `user_settings` - User preferences and notifications

**Report Analytics**:
- `report_annotations` - Report comments and reviews
- `report_annotation_comments` - Thread-style comments
- `report_analytics_events` - Usage tracking (views, downloads)
- `report_analytics_summary` - Aggregated analytics

---

## Detailed Table Analysis

### 1. facilities

**Migration**: [`20240101000000_create_core_tables.ts`](../services/backend/migrations/20240101000000_create_core_tables.ts:4)

**Schema**:
```sql
CREATE TABLE facilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  location VARCHAR(255) NOT NULL,
  timezone VARCHAR(100) NOT NULL DEFAULT 'UTC',
  total_zones INTEGER NOT NULL DEFAULT 0,
  status VARCHAR CHECK (status IN ('active', 'inactive', 'maintenance')) NOT NULL DEFAULT 'active',
  
  -- Geospatial (added in 20240105000000)
  latitude DECIMAL(10,7),
  longitude DECIMAL(10,7),
  address VARCHAR(500),
  city VARCHAR(255),
  country VARCHAR(255),
  
  -- Facility Management (added in 20260114000000)
  region VARCHAR,
  lat DECIMAL(10,8),      -- Note: duplicate with latitude (different precision)
  lng DECIMAL(11,8),      -- Note: duplicate with longitude (different precision)
  metrics JSONB,          -- powerUsage, temperature, humidity, serverLoad, pue, occupancy
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ON facilities(status);
CREATE INDEX ON facilities(created_at);
CREATE INDEX ON facilities(latitude, longitude);
CREATE INDEX ON facilities(city);
CREATE INDEX ON facilities(country);
CREATE INDEX ON facilities(region);
```

**Current Columns**:
- **Core**: id, name, location, timezone, total_zones, status
- **Geospatial**: latitude, longitude, lat, lng, address, city, country, region
- **Metrics**: metrics (JSONB) - power usage, environmental data
- **Audit**: created_at, updated_at

**Gaps for 3D**:
- ❌ No facility floor plan or building layout metadata
- ❌ No 3D building model references

---

### 2. zones

**Migration**: [`20240101000001_create_zones_table.ts`](../services/backend/migrations/20240101000001_create_zones_table.ts:4)

**Schema**:
```sql
CREATE TABLE zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  location VARCHAR(255),
  status VARCHAR CHECK (status IN ('active', 'inactive', 'maintenance')) NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ON zones(facility_id, status);
CREATE INDEX ON zones(created_at);
```

**Current Columns**:
- **Core**: id, facility_id, name, location, status
- **Audit**: created_at, updated_at

**Gaps for 3D**:
- ❌ No zone floor/level information
- ❌ No zone boundary coordinates (for 2D/3D floor plans)
- ❌ No zone capacity or dimensions

---

### 3. battery_systems

**Migrations**: 
- Initial: [`20240101000002_create_battery_systems_and_readings.ts`](../services/backend/migrations/20240101000002_create_battery_systems_and_readings.ts:4)
- Update: [`20260111000000_update_battery_systems_schema.ts`](../services/backend/migrations/20260111000000_update_battery_systems_schema.ts:3)

**Schema**:
```sql
CREATE TABLE battery_systems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id UUID NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
  
  -- Hardware details
  serial_number VARCHAR(100) UNIQUE,
  model VARCHAR(100),
  manufacturer VARCHAR(100),
  capacity_kwh DECIMAL(10,2) NOT NULL,
  voltage_v DECIMAL(8,2),
  
  -- Health & status
  health_score INTEGER DEFAULT 100,
  status VARCHAR CHECK (status IN ('active', 'inactive', 'maintenance', 'offline')) NOT NULL DEFAULT 'active',
  
  -- Lifecycle
  installation_date TIMESTAMPTZ,
  warranty_end_date TIMESTAMPTZ,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ON battery_systems(zone_id, status);
CREATE INDEX ON battery_systems(created_at);
```

**Current Columns**:
- **Identity**: id, zone_id, serial_number
- **Hardware**: model, manufacturer, capacity_kwh, voltage_v
- **Health**: health_score, status
- **Lifecycle**: installation_date, warranty_end_date
- **Flexible**: metadata (JSONB)
- **Audit**: created_at, updated_at

**Gaps for 3D Monitoring**:
- ❌ **No 3D position**: x, y, z coordinates
- ❌ **No rack/cabinet info**: rack_id, position_in_rack
- ❌ **No physical dimensions**: width, height, depth
- ❌ **No visual data**: color, icon, 3D model reference
- ❌ **No orientation**: rotation angles for 3D placement

**Gaps for Sensor Simulation**:
- ❌ No simulation mode flag
- ❌ No sensor configuration metadata
- ❌ No baseline operating parameters for simulation

---

### 4. sensor_readings

**Migration**: [`20240101000002_create_battery_systems_and_readings.ts`](../services/backend/migrations/20240101000002_create_battery_systems_and_readings.ts:30)

**Schema**:
```sql
CREATE TABLE sensor_readings (
  id SERIAL PRIMARY KEY,
  battery_system_id UUID NOT NULL REFERENCES battery_systems(id) ON DELETE CASCADE,
  time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Sensor values
  voltage DECIMAL(10,4),
  current DECIMAL(10,4),
  temperature DECIMAL(6,2),
  soc DECIMAL(5,2),  -- State of Charge (%)
  soh DECIMAL(5,2),  -- State of Health (%)
  power DECIMAL(10,2),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ON sensor_readings(battery_system_id, time);
CREATE INDEX ON sensor_readings(time);
```

**TimescaleDB Note**: Migration file [`20260112000000_t011_create_sensor_readings_hypertable.ts.skip`](../services/backend/migrations/) suggests TimescaleDB hypertable support was considered but skipped.

**Current Columns**:
- **Reference**: battery_system_id
- **Timestamp**: time, created_at
- **Electrical**: voltage, current, power
- **Thermal**: temperature
- **State**: soc (state of charge), soh (state of health)

**Gaps for Sensor Simulation**:
- ❌ No sensor_type field (which sensor generated this reading)
- ❌ No simulation metadata (is_simulated, scenario_id)
- ❌ No sensor quality indicators (confidence, error_margin)
- ❌ No multi-sensor support (only aggregate readings per battery)

---

### 5. alerts

**Migrations**: 
- Initial: [`20240101000002_create_battery_systems_and_readings.ts`](../services/backend/migrations/20240101000002_create_battery_systems_and_readings.ts:53)
- Update: [`20260111_1400_update_alerts_schema.ts`](../services/backend/migrations/20260111_1400_update_alerts_schema.ts:3)

**Schema**:
```sql
CREATE TABLE alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  battery_system_id UUID NOT NULL REFERENCES battery_systems(id) ON DELETE CASCADE,
  facility_id VARCHAR(255),
  zone_id VARCHAR(255),
  
  -- Alert details
  severity VARCHAR CHECK (severity IN ('info', 'medium', 'high', 'critical')) NOT NULL,
  type VARCHAR(100) NOT NULL,
  message TEXT NOT NULL,
  status VARCHAR CHECK (status IN ('active', 'acknowledged', 'resolved')) NOT NULL DEFAULT 'active',
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  
  -- Acknowledgement
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by VARCHAR(255),
  
  -- Resolution
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ON alerts(battery_system_id, created_at);
CREATE INDEX ON alerts(facility_id, created_at);
CREATE INDEX ON alerts(status, severity, created_at);
CREATE INDEX ON alerts(zone_id, created_at);
```

**Alert Escalation System**:
- `alert_escalation_events` - Tracks severity escalations over time
- `escalation_rules` - Per-facility escalation timeframes (info→medium: 120min, medium→high: 60min, high→critical: 30min)

---

### 6. rul_predictions (Remaining Useful Life)

**Migration**: [`20240102000000_create_rul_predictions.ts`](../services/backend/migrations/20240102000000_create_rul_predictions.ts:3)

**Schema**:
```sql
CREATE TABLE rul_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  battery_system_id UUID NOT NULL REFERENCES battery_systems(id) ON DELETE CASCADE,
  
  predicted_rul INTEGER NOT NULL CHECK (predicted_rul > 0),  -- Days
  confidence DECIMAL(3,2) NOT NULL CHECK (confidence BETWEEN 0 AND 1),
  prediction_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  model_version VARCHAR(50) NOT NULL,
  features JSONB NOT NULL DEFAULT '{}',
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ON rul_predictions(battery_system_id);
CREATE INDEX ON rul_predictions(prediction_date);
CREATE INDEX ON rul_predictions(battery_system_id, prediction_date);
CREATE INDEX ON rul_predictions(created_at);

-- Data retention: 90 days (cleanup function created)
CREATE FUNCTION cleanup_old_rul_predictions() ...
```

**MLOps Integration**: Well-integrated with model versioning and feature tracking.

---

### 7. Model Performance Tables

**Migration**: [`20240103000000_create_model_performance_tables.ts`](../services/backend/migrations/20240103000000_create_model_performance_tables.ts:3)

**Tables Created**:

1. **model_predictions** - Prediction vs actual tracking
2. **model_performance_metrics** - MAE, RMSE, R² scores
3. **model_drift_metrics** - Feature distribution drift detection
4. **data_quality_metrics** - Missing values, outliers, range violations
5. **model_health_alerts** - Automated alerts for model degradation
6. **model_health_scores** - Overall model health (accuracy, drift, data quality)

**Key Features**:
- ✅ Comprehensive MLOps observability
- ✅ Per-battery_system and aggregate metrics
- ✅ Time-series performance tracking
- ✅ Automated health monitoring

---

### 8. Facility Management System

**Migration**: [`20260114000000_add_facility_management_system.ts`](../services/backend/migrations/20260114000000_add_facility_management_system.ts:3)

**Tables Created**:

1. **lease_contracts** - Tenant management
2. **work_orders** - Maintenance tracking
3. **asset_lifecycle** - Asset health (HVAC, electrical, etc.)
4. **predictive_assets** - Predictive maintenance for assets
5. **report_documents** - ISO-compliant reports (ISO-27001, ISO-22301, ISO-50001)
6. **spare_parts** - Inventory with min/max stock levels
7. **suppliers** - Supplier management
8. **purchase_orders** - Procurement tracking
9. **user_settings** - User preferences (theme, notifications)

**Note**: This is a comprehensive facility management layer beyond battery monitoring.

---

## Migration Patterns & Conventions

### Naming Convention

**Format**: `YYYYMMDDHHMMSS_descriptive_name.ts`

**Examples**:
- `20240101000000_create_core_tables.ts` - Core tables (facilities, battery_systems)
- `20240101000001_create_zones_table.ts` - Zones table (3-tier hierarchy)
- `20240101000002_create_battery_systems_and_readings.ts` - Battery systems + sensors
- `20240102000000_create_rul_predictions.ts` - ML predictions table
- `20260111_1400_update_alerts_schema.ts` - Alert schema updates

**Pattern**: Chronological ordering ensures proper dependency resolution.

### Migration Structure

**Standard Pattern** (from [`20240101000001_create_zones_table.ts`](../services/backend/migrations/20240101000001_create_zones_table.ts)):

```typescript
import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Check if table exists (idempotent pattern)
  const zonesExists = await knex.schema.hasTable('zones');
  if (!zonesExists) {
    await knex.schema.createTable('zones', (table) => {
      // Primary key
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      
      // Foreign keys with CASCADE
      table.uuid('facility_id').notNullable()
        .references('id').inTable('facilities').onDelete('CASCADE');
      
      // Data columns
      table.string('name', 255).notNullable();
      table.string('location', 255);
      
      // Status enum
      table.enum('status', ['active', 'inactive', 'maintenance'])
        .notNullable().defaultTo('active');
      
      // Timestamps
      table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
      table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
      
      // Indexes
      table.index(['facility_id', 'status']);
      table.index('created_at');
    });
    
    console.log('✅ Created zones table');
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('zones');
  console.log('✅ Dropped zones table');
}
```

### Key Patterns

1. **Idempotency**: Always check `hasTable()` / `hasColumn()` before creating
2. **UUID Primary Keys**: `gen_random_uuid()` for distributed systems
3. **Foreign Key Cascades**: `ON DELETE CASCADE` for referential integrity
4. **Timezone-aware Timestamps**: `{ useTz: true }`
5. **Status Enums**: Consistent status values across tables
6. **Composite Indexes**: Optimize for common query patterns
7. **Console Logging**: Migration progress feedback
8. **Rollback Support**: Always implement `down()` function

### Indexing Strategy

**Common Patterns**:
- **Foreign Keys**: Index all FK columns for JOIN performance
- **Timestamps**: Index `created_at` for time-series queries
- **Status Fields**: Index for filtering active/inactive records
- **Composite Indexes**: `(fk_id, created_at)` for paginated queries
- **Partial Indexes**: Filter indexes on WHERE conditions (e.g., unacknowledged alerts)

**Example** (from [`002_create_alerts_and_escalation.sql`](../services/backend/migrations/002_create_alerts_and_escalation.sql:83)):
```sql
-- Partial index for performance on active alerts
CREATE INDEX idx_alerts_unacknowledged 
  ON alerts(severity, created_at, status) 
  WHERE status = 'active' AND acknowledged_at IS NULL;
```

---

## Seed Data Structure

**File**: [`services/backend/seeds/001_initial_data.ts`](../services/backend/seeds/001_initial_data.ts:1)

### Data Hierarchy

```
3 Facilities
├─ North Campus Data Center (New York)
│  ├─ Zone 1 (North Wing) → Battery System BAT-001-2023 (PowerMax 500, 95% health)
│  └─ Zone 2 (South Wing) → Battery System BAT-002-2023 (PowerMax 750, 97% health)
├─ South Campus Manufacturing (Los Angeles)
│  ├─ Zone 1 (Production Floor) → Battery System BAT-003-2023 (PowerMax 1000, 92% health)
│  └─ Zone 3 (Storage Area) → Battery System BAT-004-2023 (PowerMax 850, 88% health, MAINTENANCE)
└─ East Campus Research Lab (Chicago, MAINTENANCE)
   └─ Zone 1 (Lab Area, MAINTENANCE) → Battery System BAT-005-2023 (PowerMax 600, 75% health, OFFLINE)
```

### Seed Data Counts

- **Facilities**: 3 (all with geospatial coordinates)
- **Zones**: 5 (distributed across facilities)
- **Battery Systems**: 5 (various models and health states)
- **Sensor Readings**: 120 (24 readings per battery system, last 24 hours)
- **RUL Predictions**: 5 (one per battery system)
- **Alerts**: 2 (temperature_high, soc_low)

### Sample Facility

```typescript
{
  id: '11111111-1111-1111-1111-111111111111',
  name: 'North Campus Data Center',
  location: 'Building A, Floor 2',
  timezone: 'America/New_York',
  total_zones: 4,
  status: 'active',
  latitude: 40.7128,
  longitude: -74.0060,
  address: '350 5th Ave, New York, NY 10118',
  city: 'New York',
  country: 'United States'
}
```

### Sample Battery System

```typescript
{
  id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  zone_id: 'a1111111-1111-1111-1111-111111111111',
  serial_number: 'BAT-001-2023',
  model: 'PowerMax 500',
  manufacturer: 'EnergyTech',
  capacity_kwh: 500.00,
  voltage_v: 400.00,
  status: 'active',
  health_score: 95,
  installation_date: '2023-01-15'
}
```

### Sample Sensor Reading Generation

```typescript
// Generated for last 24 hours (hourly)
for (let i = 0; i < 24; i++) {
  const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000);
  sensorReadings.push({
    battery_system_id: battery.id,
    time: timestamp,
    voltage: 400 + Math.random() * 20,
    current: 50 + Math.random() * 10,
    temperature: 25 + Math.random() * 5,
    soc: Math.max(0, Math.min(100, 80 - (i * 2) + Math.random() * 5)),
    soh: 95 + Math.random() * 3,
    power: (voltage * current / 1000)
  });
}
```

---

## Gaps for 3D Monitoring & Sensor Simulation

### Gap Analysis

#### 1. 3D Positioning & Layout

**Missing Tables/Columns**:

```sql
-- ❌ NOT PRESENT: 3D position data in battery_systems
ALTER TABLE battery_systems ADD COLUMN position_x DECIMAL(10,4);
ALTER TABLE battery_systems ADD COLUMN position_y DECIMAL(10,4);
ALTER TABLE battery_systems ADD COLUMN position_z DECIMAL(10,4);
ALTER TABLE battery_systems ADD COLUMN rotation_x DECIMAL(6,2);  -- degrees
ALTER TABLE battery_systems ADD COLUMN rotation_y DECIMAL(6,2);
ALTER TABLE battery_systems ADD COLUMN rotation_z DECIMAL(6,2);

-- ❌ NOT PRESENT: Physical layout metadata
ALTER TABLE battery_systems ADD COLUMN rack_id VARCHAR(100);
ALTER TABLE battery_systems ADD COLUMN cabinet_id VARCHAR(100);
ALTER TABLE battery_systems ADD COLUMN position_in_rack INTEGER;
ALTER TABLE battery_systems ADD COLUMN width_cm DECIMAL(6,2);
ALTER TABLE battery_systems ADD COLUMN height_cm DECIMAL(6,2);
ALTER TABLE battery_systems ADD COLUMN depth_cm DECIMAL(6,2);

-- ❌ NOT PRESENT: Visual representation
ALTER TABLE battery_systems ADD COLUMN display_color VARCHAR(7);  -- hex color
ALTER TABLE battery_systems ADD COLUMN icon_name VARCHAR(100);
ALTER TABLE battery_systems ADD COLUMN model_3d_url TEXT;
```

**Impact**: Cannot render batteries in 3D space without position data.

#### 2. Sensor Simulation Configuration

**Missing Tables**:

```sql
-- ❌ NOT PRESENT: Sensor type definitions
CREATE TABLE sensor_types (
  id UUID PRIMARY KEY,
  name VARCHAR(100) NOT NULL,  -- 'voltage', 'current', 'temperature', etc.
  unit VARCHAR(20) NOT NULL,   -- 'V', 'A', 'degC'
  min_value DECIMAL(10,4),
  max_value DECIMAL(10,4),
  normal_range_min DECIMAL(10,4),
  normal_range_max DECIMAL(10,4),
  precision_digits INTEGER,
  sampling_rate_hz DECIMAL(8,2)
);

-- ❌ NOT PRESENT: Sensor instances (multiple sensors per battery)
CREATE TABLE sensors (
  id UUID PRIMARY KEY,
  battery_system_id UUID REFERENCES battery_systems(id),
  sensor_type_id UUID REFERENCES sensor_types(id),
  sensor_label VARCHAR(100),  -- 'Voltage Sensor 1', 'Temp Sensor A'
  is_simulated BOOLEAN DEFAULT false,
  position_x DECIMAL(10,4),   -- Position on battery
  position_y DECIMAL(10,4),
  position_z DECIMAL(10,4),
  status VARCHAR(20),          -- 'active', 'faulty', 'offline'
  calibration_date DATE,
  metadata JSONB
);

-- ❌ NOT PRESENT: Simulation profiles/scenarios
CREATE TABLE simulation_scenarios (
  id UUID PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  scenario_type VARCHAR(50),   -- 'normal', 'degraded', 'failure', 'stress_test'
  duration_minutes INTEGER,
  parameters JSONB,             -- Scenario-specific parameters
  created_by VARCHAR(255),
  created_at TIMESTAMPTZ
);

-- ❌ NOT PRESENT: Simulation configuration per battery
CREATE TABLE battery_simulation_config (
  id UUID PRIMARY KEY,
  battery_system_id UUID REFERENCES battery_systems(id),
  scenario_id UUID REFERENCES simulation_scenarios(id),
  is_active BOOLEAN DEFAULT false,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  noise_level DECIMAL(5,2),     -- Percentage noise (0-100)
  drift_rate DECIMAL(8,4),      -- Sensor drift per hour
  failure_probability DECIMAL(5,4),  -- 0-1
  config JSONB
);
```

**Impact**: Cannot simulate realistic sensor data without sensor metadata and simulation parameters.

#### 3. Multi-Sensor Support

**Current**: `sensor_readings` table has only aggregate readings per battery.

**Missing**: Individual sensor readings tracking:

```sql
-- ❌ NOT PRESENT: Per-sensor readings (instead of aggregate)
ALTER TABLE sensor_readings ADD COLUMN sensor_id UUID REFERENCES sensors(id);
ALTER TABLE sensor_readings ADD COLUMN is_simulated BOOLEAN DEFAULT false;
ALTER TABLE sensor_readings ADD COLUMN simulation_scenario_id UUID;
ALTER TABLE sensor_readings ADD COLUMN quality_score DECIMAL(5,2);  -- 0-100
ALTER TABLE sensor_readings ADD COLUMN anomaly_detected BOOLEAN DEFAULT false;
```

**Impact**: Cannot track individual sensor health or simulate sensor-specific failures.

#### 4. Zone Layout Metadata

**Missing**:

```sql
-- ❌ NOT PRESENT: Zone floor plan data
ALTER TABLE zones ADD COLUMN floor_level INTEGER;
ALTER TABLE zones ADD COLUMN floor_plan_url TEXT;
ALTER TABLE zones ADD COLUMN boundary_coordinates JSONB;  -- Polygon for 2D/3D
ALTER TABLE zones ADD COLUMN max_capacity INTEGER;        -- Max batteries
ALTER TABLE zones ADD COLUMN current_capacity INTEGER;
ALTER TABLE zones ADD COLUMN dimensions_length_m DECIMAL(8,2);
ALTER TABLE zones ADD COLUMN dimensions_width_m DECIMAL(8,2);
ALTER TABLE zones ADD COLUMN dimensions_height_m DECIMAL(8,2);
```

**Impact**: Cannot render zone boundaries or validate battery placement.

#### 5. Real-time Heatmap Support

**Current**: Sensor readings are stored but no pre-computed aggregates for heatmaps.

**Missing**:

```sql
-- ❌ NOT PRESENT: Spatial aggregates for heatmap generation
CREATE TABLE zone_thermal_snapshots (
  id UUID PRIMARY KEY,
  zone_id UUID REFERENCES zones(id),
  snapshot_time TIMESTAMPTZ NOT NULL,
  grid_resolution INTEGER,   -- Grid size (e.g., 10x10)
  temperature_grid JSONB,    -- 2D array of temperature values
  battery_positions JSONB,   -- Array of {battery_id, x, y, temp}
  avg_temperature DECIMAL(6,2),
  max_temperature DECIMAL(6,2),
  min_temperature DECIMAL(6,2)
);
```

**Impact**: Heatmaps must be computed on-demand from raw sensor data (slower).

---

## Recommendations for New Schema Design

### Phase 1: 3D Positioning & Layout (High Priority)

**Goal**: Enable 3D visualization of battery systems in zones.

**New Migrations Required**:

1. **Add 3D position columns to `battery_systems`**:
   ```sql
   ALTER TABLE battery_systems 
     ADD COLUMN position_x DECIMAL(10,4),
     ADD COLUMN position_y DECIMAL(10,4),
     ADD COLUMN position_z DECIMAL(10,4),
     ADD COLUMN rotation_yaw DECIMAL(6,2),    -- Y-axis rotation (0-360)
     ADD COLUMN rotation_pitch DECIMAL(6,2),  -- X-axis rotation
     ADD COLUMN rotation_roll DECIMAL(6,2),   -- Z-axis rotation
     ADD COLUMN rack_id VARCHAR(100),
     ADD COLUMN position_in_rack INTEGER,
     ADD COLUMN width_cm DECIMAL(6,2) DEFAULT 60,
     ADD COLUMN height_cm DECIMAL(6,2) DEFAULT 180,
     ADD COLUMN depth_cm DECIMAL(6,2) DEFAULT 80,
     ADD COLUMN display_color VARCHAR(7) DEFAULT '#3B82F6',
     ADD COLUMN model_3d_reference VARCHAR(100);
   
   CREATE INDEX ON battery_systems(rack_id);
   ```

2. **Add zone layout metadata**:
   ```sql
   ALTER TABLE zones
     ADD COLUMN floor_level INTEGER DEFAULT 0,
     ADD COLUMN dimensions_length_m DECIMAL(8,2),
     ADD COLUMN dimensions_width_m DECIMAL(8,2),
     ADD COLUMN dimensions_height_m DECIMAL(8,2),
     ADD COLUMN max_battery_capacity INTEGER,
     ADD COLUMN floor_plan_image_url TEXT,
     ADD COLUMN boundary_polygon JSONB;
   ```

3. **Create racks/cabinets table** (optional, for organization):
   ```sql
   CREATE TABLE battery_racks (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     zone_id UUID NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
     rack_label VARCHAR(100) NOT NULL,
     position_x DECIMAL(10,4) NOT NULL,
     position_y DECIMAL(10,4) NOT NULL,
     position_z DECIMAL(10,4) DEFAULT 0,
     max_slots INTEGER DEFAULT 10,
     slot_height_cm DECIMAL(6,2) DEFAULT 18,
     status VARCHAR(20) DEFAULT 'active',
     created_at TIMESTAMPTZ DEFAULT NOW()
   );
   
   CREATE INDEX ON battery_racks(zone_id);
   ```

**Update Seed Data**: Add position coordinates to 5 battery systems.

---

### Phase 2: Sensor Simulation Infrastructure (High Priority)

**Goal**: Enable realistic sensor data simulation for testing and demos.

**New Tables Required**:

1. **`sensor_types`** - Define sensor characteristics
2. **`sensors`** - Individual sensor instances per battery
3. **`simulation_scenarios`** - Predefined scenarios (normal, degraded, failure)
4. **`battery_simulation_config`** - Active simulation settings per battery
5. **`simulation_event_log`** - Audit log of simulation events

**Migration Example**:

```typescript
// 20260118000000_create_sensor_simulation_tables.ts
export async function up(knex: Knex): Promise<void> {
  // 1. Sensor Types
  await knex.schema.createTable('sensor_types', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('name', 100).notNullable().unique();  // 'voltage', 'current', 'temperature'
    table.string('unit', 20).notNullable();            // 'V', 'A', 'degC'
    table.decimal('min_value', 10, 4);
    table.decimal('max_value', 10, 4);
    table.decimal('normal_range_min', 10, 4);
    table.decimal('normal_range_max', 10, 4);
    table.integer('precision_digits').defaultTo(2);
    table.decimal('sampling_rate_hz', 8, 2).defaultTo(1.0);
    table.jsonb('metadata').defaultTo('{}');
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
  });
  
  // 2. Sensors (individual sensor instances)
  await knex.schema.createTable('sensors', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('battery_system_id').notNullable()
      .references('id').inTable('battery_systems').onDelete('CASCADE');
    table.uuid('sensor_type_id').notNullable()
      .references('id').inTable('sensor_types').onDelete('RESTRICT');
    table.string('label', 100);  // 'Voltage Sensor 1'
    table.boolean('is_simulated').defaultTo(false);
    table.decimal('position_x', 10, 4);
    table.decimal('position_y', 10, 4);
    table.decimal('position_z', 10, 4);
    table.enum('status', ['active', 'faulty', 'offline', 'calibrating'])
      .defaultTo('active');
    table.date('calibration_date');
    table.jsonb('metadata').defaultTo('{}');
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    
    table.index(['battery_system_id']);
    table.index(['sensor_type_id']);
    table.index(['is_simulated']);
  });
  
  // 3. Simulation Scenarios
  await knex.schema.createTable('simulation_scenarios', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('name', 200).notNullable();
    table.text('description');
    table.enum('scenario_type', [
      'normal', 'degraded', 'failure', 'stress_test', 'recovery'
    ]).notNullable();
    table.integer('duration_minutes');
    table.jsonb('parameters').notNullable().defaultTo('{}');
    table.string('created_by', 255);
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    
    table.index(['scenario_type']);
  });
  
  // 4. Battery Simulation Config
  await knex.schema.createTable('battery_simulation_config', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('battery_system_id').notNullable().unique()
      .references('id').inTable('battery_systems').onDelete('CASCADE');
    table.uuid('scenario_id')
      .references('id').inTable('simulation_scenarios').onDelete('SET NULL');
    table.boolean('is_active').defaultTo(false);
    table.timestamp('start_time', { useTz: true });
    table.timestamp('end_time', { useTz: true });
    table.decimal('noise_level', 5, 2).defaultTo(5.0);  // 5% noise
    table.decimal('drift_rate', 8, 4).defaultTo(0.0);   // Per hour
    table.decimal('failure_probability', 5, 4).defaultTo(0.0);
    table.jsonb('config').defaultTo('{}');
    table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now());
    
    table.index(['is_active']);
  });
  
  // 5. Simulation Event Log
  await knex.schema.createTable('simulation_event_log', (table) => {
    table.increments('id').primary();
    table.uuid('battery_system_id').notNullable()
      .references('id').inTable('battery_systems').onDelete('CASCADE');
    table.uuid('scenario_id')
      .references('id').inTable('simulation_scenarios').onDelete('SET NULL');
    table.string('event_type', 50).notNullable();  // 'start', 'stop', 'parameter_change'
    table.text('description');
    table.jsonb('event_data').defaultTo('{}');
    table.timestamp('event_time', { useTz: true }).defaultTo(knex.fn.now());
    
    table.index(['battery_system_id', 'event_time']);
    table.index(['event_type']);
  });
}
```

**Seed Simulation Data**:

```typescript
// Seed sensor types
await knex('sensor_types').insert([
  {
    name: 'voltage',
    unit: 'V',
    min_value: 300,
    max_value: 500,
    normal_range_min: 380,
    normal_range_max: 420,
    sampling_rate_hz: 1.0
  },
  {
    name: 'current',
    unit: 'A',
    min_value: 0,
    max_value: 100,
    normal_range_min: 40,
    normal_range_max: 60,
    sampling_rate_hz: 1.0
  },
  {
    name: 'temperature',
    unit: 'degC',
    min_value: 0,
    max_value: 80,
    normal_range_min: 20,
    normal_range_max: 35,
    sampling_rate_hz: 0.1  // Every 10 seconds
  }
]);

// Seed simulation scenarios
await knex('simulation_scenarios').insert([
  {
    name: 'Normal Operation',
    description: 'Typical battery operation with minimal variations',
    scenario_type: 'normal',
    duration_minutes: null,  // Indefinite
    parameters: JSON.stringify({
      voltage_variation: 2,    // ±2V
      current_variation: 5,    // ±5A
      temp_variation: 1        // ±1°C
    })
  },
  {
    name: 'Battery Degradation',
    description: 'Gradual capacity loss and increased internal resistance',
    scenario_type: 'degraded',
    duration_minutes: 1440,  // 24 hours
    parameters: JSON.stringify({
      soh_decrease_rate: 0.1,  // 0.1% per hour
      voltage_drop_rate: 0.5,  // 0.5V per hour
      temp_increase_rate: 0.2  // 0.2°C per hour
    })
  },
  {
    name: 'Thermal Runaway',
    description: 'Critical overheating scenario',
    scenario_type: 'failure',
    duration_minutes: 60,
    parameters: JSON.stringify({
      temp_spike_rate: 5,      // 5°C per minute
      voltage_collapse_threshold: 350,
      alert_trigger: 'critical'
    })
  }
]);
```

---

### Phase 3: MLOps Enhancements for Simulation (Medium Priority)

**Goal**: Track model performance on simulated vs real data.

**Enhancements**:

```sql
-- Add simulation tracking to model_predictions
ALTER TABLE model_predictions 
  ADD COLUMN is_simulated_data BOOLEAN DEFAULT false,
  ADD COLUMN simulation_scenario_id UUID REFERENCES simulation_scenarios(id);

-- Add simulation context to model_performance_metrics
ALTER TABLE model_performance_metrics
  ADD COLUMN data_source VARCHAR(20) DEFAULT 'real',  -- 'real', 'simulated', 'mixed'
  ADD COLUMN simulation_scenario_id UUID;
```

---

### Phase 4: Real-time Heatmap Optimization (Low Priority)

**Goal**: Pre-compute spatial aggregates for faster heatmap rendering.

**New Table**:

```sql
CREATE TABLE zone_thermal_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id UUID NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
  snapshot_time TIMESTAMPTZ NOT NULL,
  grid_resolution INTEGER DEFAULT 10,  -- 10x10 grid
  temperature_grid JSONB NOT NULL,     -- 2D array: [[20.5, 21.0, ...], ...]
  battery_positions JSONB,             -- [{id, x, y, temp}, ...]
  avg_temperature DECIMAL(6,2),
  max_temperature DECIMAL(6,2),
  min_temperature DECIMAL(6,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX ON zone_thermal_snapshots(zone_id, snapshot_time DESC);

-- Auto-cleanup old snapshots (retain 7 days)
CREATE FUNCTION cleanup_old_thermal_snapshots() ...
```

---

### Phase 5: Advanced Features (Future)

1. **Historical Playback**: Time-travel through sensor data
2. **Battery Grouping**: Logical groups beyond zones (by model, age, etc.)
3. **Maintenance Schedules**: Predictive maintenance calendar
4. **Energy Flow**: Track energy in/out for batteries
5. **Multi-site Comparison**: Cross-facility analytics

---

## Summary: Database Readiness for 3D Battery Monitoring

### ✅ What's Already Available

1. **Solid 3-tier hierarchy**: facilities → zones → battery_systems
2. **Time-series sensor data**: voltage, current, temperature, SOC, SOH, power
3. **Comprehensive MLOps**: model performance, drift detection, health monitoring
4. **Alert system**: Multi-level severity with escalation rules
5. **Geospatial support**: Facility-level lat/lng coordinates
6. **Well-structured migrations**: TypeScript, idempotent, indexed
7. **Quality seed data**: 3 facilities, 5 zones, 5 batteries, 120 readings

### ⚠️ What Needs to Be Added

1. **3D positioning** (x, y, z coordinates for batteries)
2. **Physical layout** (rack IDs, dimensions, orientation)
3. **Sensor simulation infrastructure** (sensor types, scenarios, config)
4. **Multi-sensor support** (individual sensors per battery)
5. **Zone spatial metadata** (floor plans, boundaries, capacity)
6. **Visual rendering data** (colors, icons, 3D models)

### 📊 Implementation Priority

| Priority | Feature | Effort | Impact |
|----------|---------|--------|--------|
| 🔴 High | 3D Position Columns | Low (1 migration) | Critical for 3D viz |
| 🔴 High | Sensor Simulation Tables | Medium (5 tables) | Critical for demo |
| 🟡 Medium | Zone Layout Metadata | Low (1 migration) | Important for context |
| 🟡 Medium | Rack/Cabinet Organization | Low (1 table) | Nice to have |
| 🟢 Low | Heatmap Pre-computation | Medium (1 table + jobs) | Performance optimization |
| 🟢 Low | Advanced Features | High | Future enhancements |

---

## Next Steps

1. **Review this analysis** with the development team
2. **Prioritize features** based on 3D monitoring MVP requirements
3. **Design new migrations** for Phase 1 (3D positioning) and Phase 2 (sensor simulation)
4. **Update seed data** to include 3D coordinates and simulation scenarios
5. **Implement backend services** to leverage new schema for 3D rendering

---

**Document Version**: 1.0  
**Created**: 2026-01-17  
**Author**: Database Schema Research  
**Status**: ✅ Complete - Ready for Schema Design Phase
