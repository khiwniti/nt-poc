# T116: Quick Reference

## Alert Data Model

### Location
- **Backend**: `services/backend/src/types/alertEscalation.ts`
- **Frontend**: `services/frontend/src/types/index.ts`

### Enums

```typescript
// Severity (4 levels)
AlertSeverity.CRITICAL | HIGH | MEDIUM | LOW

// Type (5 types)
AlertType.TEMPERATURE | VOLTAGE | SOC | RUL | CONNECTIVITY

// Status (3 states)
AlertStatus.ACTIVE | ACKNOWLEDGED | RESOLVED
```

### Alert Interface

```typescript
interface Alert {
  // Identifiers
  id: string
  facilityId: string
  zoneId: string
  batterySystemId: string
  
  // Classification
  severity: AlertSeverity
  type: AlertType
  status: AlertStatus
  message: string
  
  // Timestamps
  createdAt: Date | number
  acknowledgedAt?: Date | number
  resolvedAt?: Date | number
  
  // User tracking
  acknowledgedBy?: string
}
```

### Usage

```typescript
// Backend
import { Alert, AlertSeverity, AlertType, AlertStatus } from '../types/alertEscalation';

// Frontend
import { Alert, AlertSeverity, AlertType, AlertStatus } from '../types';
// OR
import { Alert } from '../api/alerts';
```

### Files Modified
- `services/backend/src/types/alertEscalation.ts`
- `services/frontend/src/types/index.ts`
- `services/frontend/src/api/alerts.ts`
- `services/frontend/src/stores/alertFilterStore.ts`
