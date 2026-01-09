# Quick Reference: Dashboard Integration Tests

## Running Tests

```bash
# Single integration test file
cd services/frontend
npm test -- Dashboard.integration.test.tsx

# All tests with coverage
npm run test:coverage -- --run

# Watch mode (auto-rerun on changes)
npm test

# Interactive UI
npx vitest --ui
```

## Test Status

```
✅ renders dashboard with static data
⏸️ loads and displays dashboard data from API (ready to enable)
⏸️ handles API errors gracefully (ready to enable)  
⏸️ refreshes data on interval (ready to enable)
```

## Enabling Skipped Tests

When Dashboard implements API integration, enable tests by:

```typescript
// Change from:
it.skip('test name', async () => { ... });

// To:
it('test name', async () => { ... });

// Then uncomment the test code inside
```

## Adding New Tests

```typescript
it('your test description', async () => {
  // 1. Setup (optional MSW handlers)
  server.use(
    http.get('/api/endpoint', () => {
      return HttpResponse.json({ data: mockData });
    })
  );

  // 2. Render component
  render(
    <BrowserRouter>
      <Dashboard />
    </BrowserRouter>
  );

  // 3. Wait for async operations
  await waitFor(() => {
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });

  // 4. Assert results
  expect(screen.getByRole('button')).toBeEnabled();
});
```

## Useful Queries

```typescript
// Text content
screen.getByText('Exact text')
screen.getByText(/regex pattern/i)

// Roles
screen.getByRole('button', { name: 'Submit' })
screen.getByRole('heading', { level: 2 })

// Test IDs (add data-testid="xyz" to JSX)
screen.getByTestId('custom-element')

// Labels
screen.getByLabelText('Username')
```

## MSW Mock Patterns

```typescript
// Success response
http.get('/api/endpoint', () => {
  return HttpResponse.json({ data: mockData });
})

// Error response  
http.get('/api/endpoint', () => {
  return HttpResponse.json({ error: 'Message' }, { status: 500 });
})

// Delayed response
http.get('/api/endpoint', async () => {
  await delay(2000);
  return HttpResponse.json({ data: mockData });
})

// Network error
http.get('/api/endpoint', () => {
  return HttpResponse.error();
})
```

## Coverage Reports

Coverage is automatically generated in `services/frontend/coverage/`:
- `index.html` - Interactive HTML report
- `coverage-final.json` - JSON data
- Console output - Text summary

Open in browser:
```bash
open services/frontend/coverage/index.html
```

## Common Issues

### Test Timeout
```typescript
// Increase timeout for slow operations
it('slow test', async () => {
  // ...
}, 10000); // 10 second timeout
```

### Fake Timers Not Advancing
```typescript
// Use vi.runAllTimers() instead of advanceTimersByTime
vi.runAllTimers();
```

### MSW Handler Not Matching
```typescript
// Check URL exactly matches
// MSW is case-sensitive and path must be exact
http.get('/api/v1/exact/path', handler)
```

## Files Structure

```
services/frontend/src/__tests__/
├── setup.ts                          # Global setup
└── Dashboard.integration.test.tsx    # Dashboard tests

Add more test files:
├── YourComponent.integration.test.tsx
└── AnotherComponent.test.tsx
```

## Best Practices

1. ✅ Test user behavior, not implementation
2. ✅ Use meaningful assertions (toBeInTheDocument, toBeVisible)
3. ✅ Wait for async operations with waitFor
4. ✅ Clean up resources (MSW auto-cleans in afterEach)
5. ✅ Keep tests isolated and independent
6. ✅ Name tests clearly: "it does X when Y"

## Dependencies

```json
{
  "@testing-library/react": "^14.1.2",
  "@testing-library/jest-dom": "^6.9.1",
  "msw": "^2.12.7",
  "vitest": "^1.6.1",
  "@vitest/ui": "^1.6.1"
}
```

## Documentation

- Full docs: `services/frontend/T067_DASHBOARD_INTEGRATION_TESTS.md`
- Vitest: https://vitest.dev/
- RTL: https://testing-library.com/react
- MSW: https://mswjs.io/
