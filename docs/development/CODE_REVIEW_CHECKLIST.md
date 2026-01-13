# Code Review Checklist

Use this as a reviewer/author checklist for PRs in this repo.

## Correctness

- [ ] Change matches the stated requirements and edge cases are considered
- [ ] Error handling is explicit (user-facing + logs) and does not leak secrets
- [ ] Backward compatibility considered (API responses, migrations, configs)
- [ ] No accidental behavior changes in unrelated areas

## Tests

- [ ] Appropriate tests added/updated at the right level (unit/integration/e2e)
- [ ] Tests are deterministic (no flaky sleeps, stable selectors, controlled time)
- [ ] Backend tests don’t rely on shared DB state between test cases
- [ ] Frontend tests use accessible queries (`getByRole`, `getByLabelText`, etc.)
- [ ] If UI changes: visual regression expectations are reviewed (Percy)

## Code Quality

- [ ] Naming and structure are clear (easy to maintain, minimal duplication)
- [ ] No dead code, debug logs, or commented-out blocks left behind
- [ ] Public APIs/types are documented where needed

## Security & Privacy

- [ ] AuthN/AuthZ changes reviewed carefully (routes, roles, tokens)
- [ ] Inputs validated and unsafe operations avoided (SQL injection, SSRF, etc.)
- [ ] Secrets are not committed (tokens/keys in code or docs)

## Performance & Reliability

- [ ] Hot paths are not accidentally slowed down (tight loops, large payloads)
- [ ] Jobs/schedulers are safe to rerun and won’t spam external systems
- [ ] Timeouts/retries are reasonable and don’t hide failures

## Operational Readiness

- [ ] Deployment impact understood (migrations, env vars, backward compatibility)
- [ ] Runbook/docs updated if behavior or procedures changed
- [ ] Monitoring/health endpoints remain accurate and useful

