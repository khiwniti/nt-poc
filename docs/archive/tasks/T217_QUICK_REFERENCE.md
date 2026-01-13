# T217: Code Quality Tools - Quick Reference

## Commands

### Frontend
```bash
cd services/frontend

# Linting
npm run lint          # Check for issues
npm run lint:fix      # Auto-fix issues

# Formatting
npm run format        # Format code
npm run format:check  # Check formatting

# Type checking
npm run typecheck     # Check TypeScript types

# All checks
npm run quality       # Run all quality checks
```

### Backend
```bash
cd services/backend

# Same commands as frontend
npm run lint
npm run lint:fix
npm run format
npm run format:check
npm run typecheck
npm run quality
```

## Pre-commit Hooks
Automatically runs on `git commit`:
- ESLint with auto-fix on changed files
- Prettier on changed files

To bypass (not recommended):
```bash
git commit --no-verify -m "message"
```

## CI/CD
Quality checks run automatically on:
- Pull requests to main/develop
- Pushes to main/develop

Checks performed:
1. TypeScript type check
2. ESLint
3. Prettier format check
4. Unit tests

## Configuration Files

### ESLint
- Frontend: `services/frontend/eslint.config.js`
- Backend: `services/backend/eslint.config.js`

### Prettier
- Frontend: `services/frontend/.prettierrc.json`
- Backend: `services/backend/.prettierrc.json`

### Husky
- Hooks: `.husky/`
- Pre-commit: `.husky/pre-commit`

### lint-staged
- Config in `package.json` of each service

## Common Issues

### "Cannot find project" errors
- ESLint needs TypeScript project config
- Config files and e2e tests are ignored

### Pre-commit hook not running
```bash
# Set git hooks path
git config core.hooksPath .husky

# Make hook executable
chmod +x .husky/pre-commit
```

### Too many linting errors
```bash
# Fix automatically where possible
npm run lint:fix

# Format code
npm run format
```

## Current Status
- ESLint: Working, ~74 issues in frontend, ~219 in backend (mostly warnings)
- Prettier: Working, formatting needed on existing files
- TypeScript: Strict mode enabled, some existing errors
- Husky: Configured and active
- CI: Workflow created and ready

## Quick Start
```bash
# Install dependencies (already done)
cd services/frontend && npm ci
cd ../backend && npm ci

# Run quality checks
cd services/frontend && npm run quality
cd ../backend && npm run quality

# Fix issues
cd services/frontend && npm run lint:fix && npm run format
cd ../backend && npm run lint:fix && npm run format

# Commit will now run pre-commit hooks automatically
git add .
git commit -m "Your message"
```
