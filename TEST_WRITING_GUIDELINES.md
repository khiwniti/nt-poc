# Test Writing Guidelines

These guidelines aim to keep tests readable, reliable, and cheap to maintain across `services/backend` and `services/frontend`.

## General

- **Write the test you’d want to read at 2am**: explicit setup, clear assertions, minimal noise.
- **Prefer behavior over implementation**: assert outputs and user-observable effects.
- **Keep tests deterministic**: avoid real network calls, random data without overrides, and “sleep” delays.
- **One reason to fail**: each test should validate a single behavior or scenario.

## Naming and Structure

- Use the AAA pattern:
  - **Arrange**: set up data + mocks
  - **Act**: call the API/function or interact with the UI
  - **Assert**: verify outcome
- Name tests as: “does X when Y” and include the *user-visible* intent.
- Prefer `describe()` blocks that match product areas: route/controller/component name.

## Backend (Vitest + Supertest + Postgres)

### When to write what

- **Service/unit test**: when logic can be exercised without DB and without HTTP.
- **Repository test**: when the important behavior is SQL/query correctness.
- **Route/API test**: when validating auth, request/response shape, validation, and integration with DB.

### Recommended patterns

- Prefer `supertest` for API routes, and assert on:
  - HTTP status codes
  - response body structure and key fields
  - auth/authorization behavior
- Use the shared test utilities in `services/backend/src/test/`:
  - factories for creating rows
  - fixtures for cross-table scenarios
  - utils for cleanup and DB lifecycle
- Avoid assuming record ordering unless the API explicitly guarantees it.
- Keep DB setup small: create only what the test needs.

### Database hygiene

- Tests should not depend on state from other tests.
- Use the repo’s cleanup/util helpers (see `services/backend/src/test/README.md`) so data created by one test cannot leak into another.
- If you need deterministic values for assertions, override factory defaults (do not rely on faker randomness).

## Frontend (Vitest + React Testing Library + MSW)

### What to assert

- Prefer assertions based on:
  - **role/name** (`getByRole('button', { name: /save/i })`)
  - **visible text** (`getByText`)
  - **labels** (`getByLabelText`)
- Use `data-testid` only when there is no accessible selector.

### Async behavior

- Prefer `findBy*` for elements that appear after async work.
- Use `waitFor()` only when you need to wait on a condition that isn’t tied to a specific element query.

### Events

- Prefer `userEvent` for realistic interactions (typing, clicking).
- Use `fireEvent` only for low-level event control when `userEvent` isn’t suitable.

### Network mocking

- For components/pages that call APIs, prefer MSW handlers and realistic payloads.
- Keep MSW handlers close to the test case: override in the test when validating error states or edge responses.

## E2E Smoke Tests (Playwright)

- Smoke tests are **critical happy paths only**.
- Avoid deep assertions and extensive data setup; aim for “page loads and core actions work”.
- Prefer Playwright’s built-in waiting behavior (locator assertions) over manual sleeps.
- Keep runtime small; smoke tests should be suitable for running before deployment.

## Visual Regression (Percy)

- Make snapshots stable:
  - hide dynamic content (timestamps, animations)
  - freeze time where appropriate
  - wait for charts/3D scenes to settle before snapshotting
- Name snapshots consistently (page + theme + viewport + state).

## Review Checklist for New/Updated Tests

- Fails for the right reason when the behavior is broken
- Passes consistently across machines/CI
- Has clear Arrange/Act/Assert boundaries
- Does not rely on test order or shared state
- Uses accessible queries (frontend) and stable selectors

