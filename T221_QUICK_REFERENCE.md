# T221: CI/CD Quick Reference

## GitHub Actions Workflow

**File:** `.github/workflows/ci.yml`

### Triggers
- Pull requests to `main` or `develop`
- Direct pushes to `main` or `develop`

### Jobs (runs in parallel)

1. **Lint and Type Check** - TypeScript validation
2. **Backend Tests** - Unit tests + coverage + PostgreSQL
3. **Frontend Tests** - Unit tests + coverage
4. **Build Verification** - Production builds
5. **CI Status Check** - Aggregates all results

### Run Time
- ~5-8 minutes total (parallel execution)

## Required Secrets

```bash
CODECOV_TOKEN  # Optional - from codecov.io
```

## Enable Branch Protection

Settings → Branches → Add rule for `main`:

**Required status checks:**
- Lint and Type Check
- Backend Tests
- Frontend Tests
- Build Verification
- CI Status Check

## Local Commands

```bash
# Type check
cd services/backend && npx tsc --noEmit
cd services/frontend && npx tsc --noEmit

# Test with coverage
cd services/backend && npm run test:coverage
cd services/frontend && npm run test:coverage

# Build
cd services/backend && npm run build
cd services/frontend && npm run build
```

## Coverage

- **Target:** 70% for project and patches
- **Threshold:** 5% drop allowed
- **Reports:** Posted as PR comments
- **Config:** `codecov.yml`

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Type errors | Run `npx tsc --noEmit` locally |
| Test failures | Check test logs in job output |
| Build failures | Review build artifacts |
| Coverage drop | Check new code coverage |
| DB connection | Verify PostgreSQL service |

## Files

```
.github/workflows/ci.yml    - Main CI workflow
codecov.yml                 - Coverage configuration
```

## Next Steps

1. Add `CODECOV_TOKEN` secret (optional)
2. Enable branch protection on `main`
3. Test by opening a PR
4. Monitor workflow runs in Actions tab
