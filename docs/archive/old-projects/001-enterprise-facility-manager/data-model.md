# Data Model: Enterprise Facility Manager

**Feature**: Complete migration and modernization of Facility 3D Manager UI
**Created**: 2026-01-08
**Status**: Phase 1 Design (Microservices Architecture)

This document defines the entity model for the microservices-based facility monitoring system with ML-powered predictions and LINE OA integration.

---

## Entity Overview

The system manages **11 core entities** across 5 microservices:

### Core Entities (8)
1. **Facility** - Physical facility locations with 3D visualization data
2. **Zone** - Subdivisions within facilities (equipment areas, zones)
3. **Sensor** - IoT sensors monitoring facility metrics
4. **Alert** - System-generated notifications for anomalies
5. **Report** - ISO-compliant compliance reports
6. **User** - System users with role-based access
7. **Region** - Geographic grouping of facilities

### New Entities for Microservices (4)
8. **SensorReading** - Time-series sensor data (TimescaleDB hypertable)
9. **RULPrediction** - ML predictions of battery remaining useful life
10. **LINEMessage** - Bidirectional LINE OA messages (notifications + chatbot)
11. **LINEUser** - LINE account profiles linked to system users

---

## Entity Relationships

```
Region
  ↓ 1:N
Facility ←─── User (created_by, managed_by)
  ↓ 1:N         ↓ 1:N
Zone          Alert
  ↓ 1:N         ↓ 1:N
Sensor ──────→ LINEMessage
  ↓ 1:N         ↑ N:1
SensorReading   LINEUser ←── User (linked account)
  ↓ 1:1
RULPrediction
```

---

## 1. Facility

**Description**: Physical facility location with geospatial data, operational status, and 3D visualization metadata.

### Schema

```typescript
interface Facility {
  // Identity
  id: string; // UUID primary key
  name: string; // "Bangkok Data Center 1"
  code: string; // Unique facility code "BKK-DC-01"

  // Location & Geography
  regionId: string; // FK → Region
  address: {
    street: string;
    city: string;
    province: string;
    postalCode: string;
    country: string; // Default: "Thailand"
  };
  coordinates: {
    latitude: number; // -90 to 90
    longitude: number; // -180 to 180
  };

  // Operational
  status: 'operational' | 'maintenance' | 'offline' | 'critical';
  capacityKW: number; // Total power capacity
  certifications: string[]; // ["ISO-27001", "ISO-50001"]

  // Timestamps
  createdAt: Date;
  updatedAt: Date;

  // Metadata
  metadata?: Record<string, any>; // Custom facility-specific data
}
```

### Relationships
- `regionId` → Region (Many-to-One)
- `zones` ← Zone (One-to-Many)
- `sensors` ← Sensor (One-to-Many)
- `alerts` ← Alert (One-to-Many)

### Indexes
- PRIMARY KEY (`id`)
- UNIQUE INDEX (`code`)
- INDEX (`regionId`, `status`)
- INDEX (`status`)

### Business Rules
- Facility `status` auto-calculates from zone statuses (critical if any zone critical)
- Cannot delete facility with active alerts
- Coordinates must be valid GPS coordinates

---

## 2. Zone

**Description**: Logical or physical subdivision within a facility for 3D visualization and monitoring.

### Schema

```typescript
interface Zone {
  // Identity
  id: string; // UUID primary key
  facilityId: string; // FK → Facility (required)
  name: string; // "Rack A-12"
  type: 'server_rack' | 'battery_bank' | 'hvac_unit' | 'storage' | 'production_line' | 'other';

  // 3D Visualization
  position: {
    x: number; // 3D X coordinate
    y: number; // 3D Y coordinate
    z: number; // 3D Z coordinate
  };
  dimensions: {
    width: number; // meters
    height: number; // meters
    depth: number; // meters
  };

  // Monitoring
  status: 'normal' | 'warning' | 'critical' | 'offline';
  colorCode: string; // Hex color derived from status
  temperatureThresholds?: {
    warning: number; // °C
    critical: number; // °C
  };

  // Timestamps
  createdAt: Date;
  updatedAt: Date;

  // Metadata
  metadata?: Record<string, any>;
}
```

### Relationships
- `facilityId` → Facility (Many-to-One)
- `sensors` ← Sensor (One-to-Many)
- `alerts` ← Alert (One-to-Many)

### Indexes
- PRIMARY KEY (`id`)
- INDEX (`facilityId`, `status`)
- INDEX (`status`)

### Business Rules
- Zone `status` auto-calculates from latest sensor readings
- Color mapping: `normal` (green), `warning` (yellow), `critical` (red), `offline` (gray)
- Cannot delete zone with active sensors

---

## 3. Sensor

**Description**: Physical or virtual sensor monitoring environmental conditions or equipment health.

### Schema

```typescript
interface Sensor {
  // Identity
  id: string; // UUID primary key
  facilityId: string; // FK → Facility (required)
  zoneId?: string; // FK → Zone (nullable for facility-wide sensors)
  name: string; // "Temp Sensor Rack-A12"

  // Sensor Type
  type: 'temperature' | 'humidity' | 'voltage' | 'current' | 'battery_health' | 'power' | 'airflow' | 'motion';
  unit: string; // "°C", "V", "%", "kW"

  // Operational
  status: 'active' | 'inactive' | 'error' | 'maintenance';
  thresholds: {
    warningMin?: number;
    warningMax?: number;
    criticalMin?: number;
    criticalMax?: number;
  };
  samplingIntervalSeconds: number; // Default: 60

  // Latest Reading
  lastReadingAt?: Date;
  lastReadingValue?: number;
  calibrationDate?: Date;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;

  // Metadata
  metadata?: Record<string, any>;
}
```

### Relationships
- `facilityId` → Facility (Many-to-One)
- `zoneId` → Zone (Many-to-One, nullable)
- `readings` ← SensorReading (One-to-Many)
- `rulPredictions` ← RULPrediction (One-to-Many, if type = battery_health)

### Indexes
- PRIMARY KEY (`id`)
- INDEX (`facilityId`, `type`)
- INDEX (`zoneId`)
- INDEX (`status`)
- INDEX (`type`)

### Business Rules
- Sensor marked `error` if no reading for 2× `samplingIntervalSeconds`
- Battery health sensors auto-linked to RUL prediction pipeline
- Threshold violations trigger alert generation

---

## 4. SensorReading (NEW - TimescaleDB Hypertable)

**Description**: Time-series data point from a sensor. **Stored in TimescaleDB hypertable** for efficient time-series queries.

### Schema

```typescript
interface SensorReading {
  // Identity
  id: string; // UUID primary key
  sensorId: string; // FK → Sensor (required)
  facilityId: string; // Denormalized for query performance

  // Reading Data
  timestamp: Date; // Primary partitioning key
  value: number; // Sensor measurement value
  unit: string; // Denormalized from Sensor
  status: 'normal' | 'warning' | 'critical'; // Calculated from thresholds

  // Metadata
  metadata?: Record<string, any>; // Additional context (e.g., anomaly flags)
}
```

### Relationships
- `sensorId` → Sensor (Many-to-One)
- `facilityId` → Facility (Many-to-One, denormalized)

### Indexes (TimescaleDB Hypertable)
- PRIMARY KEY (`id`, `timestamp`) - Composite key for hypertable
- INDEX (`timestamp`) DESC - Time-based queries
- INDEX (`sensorId`, `timestamp`) DESC - Sensor history queries
- INDEX (`facilityId`, `timestamp`) DESC - Facility-wide analytics
- INDEX (`status`) - Alert generation queries

### Business Rules
- **Retention Policy**: Raw data retained 90 days, then aggregated to hourly/daily
- **Partitioning**: TimescaleDB auto-partitions by time (1-week chunks)
- Status calculated at insertion: compare `value` against sensor thresholds
- Anomaly readings (>3 std deviations) flagged in metadata

### TimescaleDB Configuration

```sql
-- Create hypertable
SELECT create_hypertable('sensor_readings', 'timestamp',
  chunk_time_interval => INTERVAL '1 week'
);

-- Retention policy (auto-delete raw data older than 90 days)
SELECT add_retention_policy('sensor_readings', INTERVAL '90 days');

-- Continuous aggregate (hourly averages)
CREATE MATERIALIZED VIEW sensor_readings_hourly
WITH (timescaledb.continuous) AS
SELECT
  time_bucket('1 hour', timestamp) AS hour,
  sensor_id,
  facility_id,
  AVG(value) AS avg_value,
  MIN(value) AS min_value,
  MAX(value) AS max_value,
  COUNT(*) AS reading_count
FROM sensor_readings
GROUP BY hour, sensor_id, facility_id;

-- Refresh policy (update every hour)
SELECT add_continuous_aggregate_policy('sensor_readings_hourly',
  start_offset => INTERVAL '3 hours',
  end_offset => INTERVAL '1 hour',
  schedule_interval => INTERVAL '1 hour'
);
```

---

## 5. RULPrediction (NEW - MLOps Integration)

**Description**: Machine learning prediction of battery Remaining Useful Life from MLOps service.

### Schema

```typescript
interface RULPrediction {
  // Identity
  id: string; // UUID primary key
  batteryId: string; // FK → Sensor (type: battery_health, required)
  facilityId: string; // Denormalized for query performance

  // Prediction Results
  predictedRULCycles: number; // Predicted remaining charge/discharge cycles
  confidenceInterval: {
    lower: number; // 15th percentile
    upper: number; // 85th percentile
  };
  confidenceScore: number; // 0-1 (model confidence)

  // ML Model Metadata
  modelVersion: string; // e.g., "v2.1.3" from MLflow
  features: Record<string, number>; // 19 engineered features used

  // Timestamps
  timestamp: Date; // Prediction timestamp
  createdAt: Date;

  // Alert Tracking
  alertTriggered: boolean; // Whether this prediction triggered an alert

  // Metadata
  metadata?: {
    inferenceTimeMs?: number;
    driftScore?: number; // PSI value
    [key: string]: any;
  };
}
```

### Relationships
- `batteryId` → Sensor (Many-to-One, type: battery_health)
- `facilityId` → Facility (Many-to-One, denormalized)

### Indexes
- PRIMARY KEY (`id`)
- INDEX (`batteryId`, `timestamp`) DESC
- INDEX (`facilityId`)
- INDEX (`confidenceScore`)
- INDEX (`alertTriggered`)

### Business Rules
- Predictions generated every 6 hours for batteries with ≥100 historical cycles
- Alert triggered if `predictedRULCycles` < 50 AND `confidenceScore` > 0.7
- Low confidence predictions (<0.5) trigger manual review flag
- Model drift detection (PSI > 0.2) triggers automated retraining

### MLflow Integration

```python
# Prediction request from Backend → MLOps service
POST /api/v1/predict/rul
{
  "battery_id": "sensor-uuid-123",
  "features": {
    "cycle_count": 450,
    "voltage_mean": 3.7,
    "voltage_std": 0.15,
    # ... 16 more features
  }
}

# MLOps response → Backend stores as RULPrediction entity
{
  "battery_id": "sensor-uuid-123",
  "predicted_rul_cycles": 120,
  "confidence_interval": [102, 138],
  "confidence_score": 0.85,
  "model_version": "v2.1.3",
  "inference_time_ms": 345
}
```

---

## 6. Alert

**Description**: System-generated or user-reported alert for anomalies, threshold violations, or critical events.

### Schema

```typescript
interface Alert {
  // Identity
  id: string; // UUID primary key
  facilityId: string; // FK → Facility (required)
  zoneId?: string; // FK → Zone (nullable)
  sensorId?: string; // FK → Sensor (nullable)

  // Alert Classification
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'new' | 'acknowledged' | 'in_progress' | 'resolved' | 'false_positive';
  type: 'threshold_violation' | 'sensor_offline' | 'rul_prediction' | 'manual' | 'anomaly_detection';

  // Alert Content
  title: string; // Max 100 chars
  description: string; // Detailed description
  triggerValue?: number; // Value that triggered alert
  threshold?: number; // Threshold exceeded

  // Lifecycle Tracking
  acknowledgedBy?: string; // FK → User
  acknowledgedAt?: Date;
  resolvedBy?: string; // FK → User
  resolvedAt?: Date;
  resolutionNotes?: string;

  // Notification Tracking
  notificationsSent?: Array<{
    channel: 'line' | 'email' | 'sms';
    userId: string;
    sentAt: Date;
    status: 'sent' | 'delivered' | 'failed';
  }>;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;

  // Metadata
  metadata?: Record<string, any>;
}
```

### Relationships
- `facilityId` → Facility (Many-to-One)
- `zoneId` → Zone (Many-to-One, nullable)
- `sensorId` → Sensor (Many-to-One, nullable)
- `acknowledgedBy` → User (Many-to-One, nullable)
- `resolvedBy` → User (Many-to-One, nullable)
- `lineMessages` ← LINEMessage (One-to-Many)

### Indexes
- PRIMARY KEY (`id`)
- INDEX (`facilityId`, `status`)
- INDEX (`severity`, `status`)
- INDEX (`status`)
- INDEX (`createdAt`) DESC

### Business Rules
- `critical` alerts auto-send LINE notifications to subscribed users
- Alert auto-resolves if condition clears for >15 minutes
- Cannot delete alerts; mark as `false_positive` with justification
- Escalation: `new` → `acknowledged` (5 min) → `in_progress` (30 min) → `resolved`

---

## 7. LINEMessage (NEW - LINE OA Integration)

**Description**: Bidirectional message between system and user via LINE Official Account.

### Schema

```typescript
interface LINEMessage {
  // Identity
  id: string; // UUID primary key
  lineUserId: string; // LINE Platform user ID (required, indexed)
  internalUserId?: string; // FK → User (nullable, linked account)

  // Message Context
  facilityId?: string; // FK → Facility (nullable, for facility queries)
  alertId?: string; // FK → Alert (nullable, for alert notifications)

  // Message Classification
  direction: 'inbound' | 'outbound'; // user→system or system→user
  messageType: 'notification' | 'user_query' | 'bot_response' | 'greeting' | 'system_message';

  // Message Content
  content: string; // Text content (required)
  flexMessageJson?: Record<string, any>; // LINE Flex Message structure (for rich notifications)
  replyToMessageId?: string; // FK → LINEMessage (conversation threading)

  // Delivery Tracking
  timestamp: Date; // Message timestamp
  deliveryStatus: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  failureReason?: string; // Delivery failure reason

  // Timestamps
  createdAt: Date;

  // Metadata
  metadata?: {
    intentClassification?: string;
    confidenceScore?: number;
    [key: string]: any;
  };
}
```

### Relationships
- `lineUserId` → LINEUser (Many-to-One)
- `internalUserId` → User (Many-to-One, nullable)
- `facilityId` → Facility (Many-to-One, nullable)
- `alertId` → Alert (Many-to-One, nullable)
- `replyToMessageId` → LINEMessage (Many-to-One, self-referential)

### Indexes
- PRIMARY KEY (`id`)
- INDEX (`lineUserId`, `timestamp`) DESC
- INDEX (`direction`)
- INDEX (`alertId`)
- INDEX (`replyToMessageId`)

### Business Rules
- `outbound` messages respect LINE API rate limits (500 messages/hour/user)
- Failed delivery triggers email fallback after 3 retry attempts
- Conversation threads maintained for 24 hours for context
- User queries auto-routed to Gemini AI via backend proxy
- Message retention: 90 days, then archived for compliance (3 years)

### LINE Webhook Integration

```typescript
// LINE Platform → Backend webhook
POST /api/line/webhook
{
  "events": [{
    "type": "message",
    "replyToken": "abc123...",
    "source": { "userId": "U1234567..." },
    "message": { "type": "text", "text": "What's the status of BKK-DC-01?" }
  }]
}

// Backend response → Store as LINEMessage (inbound)
// Backend → Gemini AI → Generate response
// Backend → LINE API → Send response
// Backend → Store response as LINEMessage (outbound)
```

---

## 8. LINEUser (NEW - LINE OA Integration)

**Description**: User profile linked to LINE Official Account for notifications and chatbot.

### Schema

```typescript
interface LINEUser {
  // Identity
  lineUserId: string; // PRIMARY KEY (LINE Platform user ID)
  internalUserId?: string; // FK → User (nullable, linked account)

  // LINE Profile
  displayName: string; // User's LINE display name
  pictureUrl?: string; // Profile picture URL
  statusMessage?: string; // LINE status message
  language: string; // ISO 639-1 code (default: "th")

  // Account Linking
  linkingStatus: 'linked' | 'unlinked' | 'pending_verification';
  linkingCode?: string; // Temporary code for account linking (expires 1 hour)
  linkedAt?: Date;

  // Notification Preferences
  preferences: {
    notificationsEnabled: boolean; // Default: true
    severityThreshold: 'low' | 'medium' | 'high' | 'critical'; // Default: "medium"
    facilities?: string[]; // Subscribed facility IDs (empty = all)
    quietHours?: {
      enabled: boolean;
      startTime: string; // "HH:MM" format
      endTime: string; // "HH:MM" format
      timezone: string; // IANA timezone
    };
  };

  // Activity Tracking
  lastInteractionAt?: Date;
  isBlocked: boolean; // User blocked the bot (default: false)

  // Timestamps
  createdAt: Date;
  updatedAt: Date;

  // Metadata
  metadata?: Record<string, any>;
}
```

### Relationships
- `internalUserId` → User (Many-to-One, nullable)
- `messages` ← LINEMessage (One-to-Many)

### Indexes
- PRIMARY KEY (`lineUserId`)
- UNIQUE INDEX (`linkingCode`)
- INDEX (`internalUserId`)
- INDEX (`linkingStatus`)

### Business Rules
- Account linking: user sends linking code via LINE chat within 1 hour
- Unlinked users can chat but won't receive facility-specific notifications
- User preferences override global notification settings
- `quietHours` respected for non-critical alerts only (`critical` always delivered)
- Blocked users auto-unsubscribed; reactivation requires user action

### Account Linking Flow

```typescript
// Step 1: User requests linking in web app
POST /api/line/link
Response: { "linking_code": "ABC123", "expires_in": 3600 }

// Step 2: User sends code to LINE chatbot
LINE User → Bot: "ABC123"

// Step 3: Backend verifies and links accounts
Backend verifies code → Updates LINEUser.internalUserId → Status: linked

// Step 4: Confirmation
Bot → LINE User: "Account linked! You'll now receive facility alerts."
```

---

## 9. Region

**Description**: Geographic region grouping facilities for geospatial filtering.

### Schema

```typescript
interface Region {
  // Identity
  id: string; // UUID primary key
  name: string; // "Northern Thailand"
  code: string; // "NTH" (unique)
  country: string; // Default: "Thailand"

  // Geographic Bounds
  boundingBox?: {
    northWest: { latitude: number; longitude: number };
    southEast: { latitude: number; longitude: number };
  };

  // Visualization
  color: string; // Hex color for map display

  // Timestamps
  createdAt: Date;
  updatedAt: Date;

  // Metadata
  metadata?: Record<string, any>;
}
```

### Relationships
- `facilities` ← Facility (One-to-Many)

### Indexes
- PRIMARY KEY (`id`)
- UNIQUE INDEX (`code`)
- UNIQUE INDEX (`name`)

### Business Rules
- Cannot delete region with associated facilities
- Bounding box auto-calculates from facility coordinates if not set

---

## 10. Report

**Description**: Generated compliance report for ISO certifications or operational analysis.

### Schema

```typescript
interface Report {
  // Identity
  id: string; // UUID primary key

  // Report Type
  type: 'iso_27001' | 'iso_22301' | 'iso_50001' | 'custom' | 'operational_summary';
  format: 'pdf' | 'excel' | 'json';
  status: 'generating' | 'completed' | 'failed';

  // Content
  title: string;
  description?: string;
  timeRange: {
    startDate: Date;
    endDate: Date;
  };
  filters?: {
    facilityIds?: string[];
    regionIds?: string[];
    severities?: string[];
  };

  // Versioning
  version: string; // Semantic versioning

  // File Management
  fileUrl?: string; // Cloud storage URL
  fileSize?: number; // Bytes
  expiresAt?: Date; // Default: 90 days

  // Audit
  generatedBy: string; // FK → User

  // Timestamps
  createdAt: Date;
  updatedAt: Date;

  // Metadata
  metadata?: Record<string, any>;
}
```

### Relationships
- `generatedBy` → User (Many-to-One)

### Indexes
- PRIMARY KEY (`id`)
- INDEX (`type`, `status`)
- INDEX (`generatedBy`)
- INDEX (`createdAt`) DESC

### Business Rules
- Report generation queued and processed asynchronously
- Report files auto-deleted after `expiresAt`
- Version increments for regenerated reports with same parameters
- Cannot generate report for time range with <80% sensor uptime

---

## 11. User

**Description**: System user with authentication and role-based access control.

### Schema

```typescript
interface User {
  // Identity
  id: string; // UUID primary key
  email: string; // Unique
  passwordHash: string; // bcrypt hashed

  // Profile
  firstName: string;
  lastName: string;
  role: 'admin' | 'operator' | 'viewer' | 'analyst';
  permissions: string[]; // ["facilities:read", "alerts:acknowledge"]

  // Account Status
  status: 'active' | 'inactive' | 'suspended';
  lastLoginAt?: Date;
  failedLoginAttempts: number; // Default: 0
  lockedUntil?: Date; // Account lockout expiration

  // Preferences
  preferences: {
    language: string; // Default: "th"
    theme: 'light' | 'dark' | 'auto'; // Default: "light"
    timezone: string; // Default: "Asia/Bangkok"
    notificationEmail: boolean; // Default: true
  };

  // Timestamps
  createdAt: Date;
  updatedAt: Date;

  // Metadata
  metadata?: Record<string, any>;
}
```

### Relationships
- `lineUser` ← LINEUser (One-to-One, nullable)
- `acknowledgedAlerts` ← Alert (One-to-Many via `acknowledgedBy`)
- `resolvedAlerts` ← Alert (One-to-Many via `resolvedBy`)
- `generatedReports` ← Report (One-to-Many)

### Indexes
- PRIMARY KEY (`id`)
- UNIQUE INDEX (`email`)
- INDEX (`role`)
- INDEX (`status`)

### Business Rules
- Account locked for 15 minutes after 5 failed login attempts
- Password requirements: 12+ chars, uppercase, lowercase, number, special char
- Email verification required before activation
- `admin` role required for user management
- Session expiration: 12 hours (refresh token: 30 days)

---

## Database Schema Summary

### Database Services

**Primary Database**: PostgreSQL 16 + TimescaleDB extension (Railway managed)

**Databases**:
- `facility_manager_production` - Primary application database
- `mlflow_production` - MLflow model registry (separate database for MLOps service)

### Migration Strategy

**Tool**: Alembic (Python) or Knex (Node.js) - to be determined after backend framework decision

**Required Migrations**:
1. `20260108_1400_create_core_entities` - Facility, Zone, Sensor, Region, User
2. `20260108_1410_create_timescaledb_hypertable` - SensorReading (TimescaleDB)
3. `20260108_1420_create_alert_system` - Alert with notification tracking
4. `20260108_1430_create_rul_prediction` - RULPrediction for MLOps
5. `20260108_1440_create_line_integration` - LINEUser, LINEMessage
6. `20260108_1450_create_reporting` - Report entity
7. `20260108_1500_create_indexes_optimizations` - Performance indexes

---

## Data Retention & Archival

| Entity | Retention | Archival Strategy |
|--------|-----------|-------------------|
| **SensorReading** | 90 days (raw) | Aggregate to hourly/daily, retain 1 year |
| **Alert** | 1 year | Archive to cold storage, metadata 3 years |
| **LINEMessage** | 90 days | Archive for compliance, retain 3 years |
| **RULPrediction** | 1 year | Archive, retain latest 5 predictions/battery |
| **Report** | 90 days (file) | Delete file, retain metadata indefinitely |
| **User** | Indefinite | Soft-delete after 2 years inactivity |

---

## API Endpoints (Derived from Entities)

### RESTful APIs

**Facilities**: `GET /api/v1/facilities`, `GET /api/v1/facilities/:id`, `POST`, `PUT`, `DELETE`
**Zones**: `GET /api/v1/facilities/:facilityId/zones`, `GET /api/v1/zones/:id`
**Sensors**: `GET /api/v1/facilities/:facilityId/sensors`, `GET /api/v1/sensors/:id`
**Alerts**: `GET /api/v1/alerts`, `POST /api/v1/alerts/:id/acknowledge`, `POST /api/v1/alerts/:id/resolve`
**SensorReadings**: `GET /api/v1/sensors/:sensorId/readings?start=&end=&aggregation=`
**RULPredictions**: `POST /api/v1/predictions/rul`, `GET /api/v1/sensors/:sensorId/rul`
**LINEMessages**: `POST /api/line/webhook` (LINE webhook), `GET /api/v1/line/messages`
**LINEUsers**: `GET /api/v1/line/users/:lineUserId`, `POST /api/v1/line/link`
**Reports**: `GET /api/v1/reports`, `POST /api/v1/reports/generate`, `GET /api/v1/reports/:id/download`
**Regions**: `GET /api/v1/regions`
**Users**: `GET /api/v1/users`, `POST /api/v1/auth/login`, `POST /api/v1/auth/logout`

### Server-Sent Events (SSE)

**Real-Time Sensor Stream**: `GET /api/v1/facilities/:facilityId/stream`
- Events: `sensor_update`, `alert_created`, `alert_updated`, `rul_prediction_updated`

**Alert Stream**: `GET /api/v1/alerts/stream`
- Events: `new_alert`, `alert_acknowledged`, `alert_resolved`

---

## Next Steps

1. ✅ Data model defined (11 entities, 4 new for microservices)
2. → Generate API contracts (`contracts/backend-api.yaml`, `contracts/mlops-api.yaml`, etc.)
3. → Generate database migration scripts
4. → Update `quickstart.md` with microservices setup
5. → Generate `tasks.md` for implementation
