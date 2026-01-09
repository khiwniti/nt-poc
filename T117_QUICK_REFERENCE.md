# T117 Quick Reference - AlertRepository

## Files
- `services/backend/src/repositories/AlertRepository.ts` - Repository implementation
- `services/backend/src/repositories/__tests__/AlertRepository.test.ts` - Unit tests (28 tests, all passing)

## Import
```typescript
import alertRepository from './repositories/AlertRepository';
```

## Quick API Reference

### CRUD
```typescript
// Create
const alert = await alertRepository.create({
  battery_system_id: 'battery-123',
  facility_id: 'facility-1',
  type: 'Temperature High',
  severity: 'critical',
  message: 'Temperature exceeds threshold'
});

// Read
const alert = await alertRepository.findById('alert-id');
const { alerts, total } = await alertRepository.find(filters, pagination, sorting);

// Update
await alertRepository.update('alert-id', { status: 'acknowledged' });

// Delete
await alertRepository.delete('alert-id');
```

### Specialized Queries
```typescript
// By facility
const { alerts, total } = await alertRepository.findByFacility('facility-1', filters, pagination);

// By zone
const { alerts, total } = await alertRepository.findByZone('zone-1', filters, pagination);

// By status
const { alerts, total } = await alertRepository.findByStatus('active', filters, pagination);
```

### Filtering
```typescript
const filters = {
  facility_id: 'facility-1',
  zone_id: 'zone-1',
  severity: ['critical', 'high'],        // Array supported
  status: ['active', 'acknowledged'],    // Array supported
  type: 'Temperature High',
  created_after: new Date('2024-01-01'),
  created_before: new Date('2024-12-31')
};
```

### Pagination & Sorting
```typescript
const pagination = { limit: 20, offset: 0 };
const sorting = { sort_by: 'created_at', sort_order: 'DESC' };

const result = await alertRepository.find(filters, pagination, sorting);
```

### Bulk Operations
```typescript
// Acknowledge multiple
await alertRepository.acknowledgeMultiple(['id1', 'id2'], 'user-123');

// Resolve multiple
await alertRepository.resolveMultiple(['id1', 'id2'], 'Fixed');
```

### Transactions
```typescript
await alertRepository.withTransaction(async (client) => {
  await alertRepository.create(input, client);
  await alertRepository.update(id, updates, client);
  // Commits automatically or rolls back on error
});
```

### Statistics
```typescript
const stats = await alertRepository.getStatsBySeverity('facility-1');
// Returns: { info: 5, medium: 10, high: 3, critical: 2 }
```

## Tests
```bash
cd services/backend
npm test -- AlertRepository.test.ts
# ✓ 28 tests passed
```

## Status
✅ All acceptance criteria met
✅ All tests passing (28/28)
✅ Ready for integration
