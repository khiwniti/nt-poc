# Dependency Management Quick Reference

## 🚀 Quick Start

```bash
# Full cleanup and reinstall
./cleanup-dependencies.sh

# Find unused dependencies
./analyze-unused-deps.sh

# Manual cleanup
npm run clean
npm install
```

## 📦 Common Commands

### Package Management
```bash
# Install dependencies
npm install

# Update a specific package
npm install <package>@latest --workspace=<workspace-name>

# Check for outdated packages
npm outdated

# Check for security issues
npm audit

# Fix security issues (non-breaking)
npm audit fix

# Fix all issues (may include breaking changes)
npm audit fix --force
```

### Workspace Commands
```bash
# Run command in all workspaces
npm run test --workspaces

# Run command in specific workspace
npm run dev --workspace=@nt-poc/frontend
npm run build --workspace=@nt-poc/backend

# Install package in specific workspace
npm install <package> --workspace=@nt-poc/frontend
```

### Python Dependencies
```bash
# Install Python dependencies (from each service directory)
cd services/ml && pip install -r requirements.txt
cd services/mlops && pip install -r requirements.txt
cd services/simulator && pip install -r requirements.txt

# Generate lock file with pip-tools
pip install pip-tools
pip-compile requirements.txt
pip-sync requirements.txt
```

## 🔍 Checking Dependency Health

### 1. Security Audit
```bash
npm audit                    # See all vulnerabilities
npm audit --json            # JSON format
npm audit --audit-level=high # Only high severity
```

### 2. Find Outdated Packages
```bash
npm outdated                # Show all outdated packages
npm outdated --json         # JSON format
npm outdated --workspace=@nt-poc/frontend  # Specific workspace
```

### 3. Analyze Unused Dependencies
```bash
./analyze-unused-deps.sh    # Use provided script
# OR manually
cd services/frontend && npx depcheck
cd services/backend && npx depcheck
```

### 4. Check Package Sizes
```bash
npm run analyze --workspace=@nt-poc/frontend  # Frontend bundle analysis
```

## 🧹 Cleaning Up

### Full Cleanup
```bash
./cleanup-dependencies.sh   # Automated script
```

### Manual Cleanup Steps
```bash
# 1. Remove node_modules
npm run clean

# 2. Remove Python cache
find services -type d -name "__pycache__" -exec rm -rf {} +
find services -type d -name ".pytest_cache" -exec rm -rf {} +
find services -type d -name "*.egg-info" -exec rm -rf {} +

# 3. Remove build artifacts
rm -rf services/*/dist

# 4. Remove test coverage
find . -type d -name "coverage" -exec rm -rf {} +

# 5. Reinstall
npm install
```

## 🔄 Updating Dependencies

### Safe Updates (Patch & Minor)
```bash
# Update all packages to latest within semver range
npm update --workspaces

# Update specific package
npm update <package> --workspace=<workspace-name>
```

### Major Updates (Requires Testing)
```bash
# Update to latest major version
npm install <package>@latest --workspace=<workspace-name>

# Example: Update React
cd services/frontend
npm install react@latest react-dom@latest

# Always test after major updates!
npm test
npm run build
```

### Bulk Updates
```bash
# Update all dev dependencies
npm update --save-dev --workspaces

# Update all dependencies
npm update --workspaces
```

## 📊 Dependency Reports

### Generate Reports
```bash
# List all installed packages
npm list --all > installed-packages.txt

# List only production dependencies
npm list --prod

# List dependencies for specific package
npm list <package-name>

# Show dependency tree
npm list --depth=1
```

### Analyze Bundle Size
```bash
cd services/frontend
npm run analyze    # Opens visualizer
```

## 🔐 Security Best Practices

### Regular Audits
```bash
# Run weekly
npm audit
npm audit fix

# Check for known vulnerabilities in Python packages
cd services/ml && pip install safety
safety check -r requirements.txt
```

### Update Strategy
1. **Weekly:** Check for security updates
   ```bash
   npm audit
   ```

2. **Monthly:** Update patch versions
   ```bash
   npm update --workspaces
   ```

3. **Quarterly:** Review and plan major updates
   ```bash
   npm outdated
   ```

## 🐍 Python Dependency Management

### Using pip-tools (Recommended)
```bash
# Install pip-tools
pip install pip-tools

# Generate lock file
cd services/ml
pip-compile requirements.txt -o requirements.lock
pip-sync requirements.lock

# Update dependencies
pip-compile --upgrade requirements.txt
```

### Check for Vulnerabilities
```bash
# Install safety
pip install safety

# Check each service
cd services/ml && safety check -r requirements.txt
cd services/mlops && safety check -r requirements.txt
cd services/simulator && safety check -r requirements.txt
```

### Update Python Packages
```bash
# Show outdated packages
pip list --outdated

# Update specific package
pip install --upgrade <package>

# Regenerate requirements (if using pip-tools)
pip-compile --upgrade requirements.txt
```

## 🎯 Troubleshooting

### Issue: npm install fails
```bash
# Clear npm cache
npm cache clean --force

# Remove package-lock and reinstall
rm package-lock.json
rm -rf node_modules
npm install
```

### Issue: Dependency conflicts
```bash
# View dependency tree
npm list <package-name>

# Force resolutions (use with caution)
npm install --force

# Use legacy peer deps
npm install --legacy-peer-deps
```

### Issue: Python dependency conflicts
```bash
# Create fresh virtual environment
python -m venv venv
source venv/bin/activate  # or `venv\Scripts\activate` on Windows
pip install -r requirements.txt

# Check for conflicts
pip check
```

### Issue: Build fails after update
```bash
# 1. Check TypeScript errors
npm run typecheck --workspaces

# 2. Check for breaking changes
# Review package CHANGELOG.md

# 3. Clear build cache
rm -rf services/*/dist
npm run build

# 4. Revert if needed
git checkout package.json package-lock.json
npm install
```

## 📝 Pre-commit Checklist

Before committing dependency changes:
- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes  
- [ ] `npm test` passes
- [ ] `npm run build` succeeds
- [ ] Manual testing completed
- [ ] Updated CHANGELOG.md (if applicable)
- [ ] Reviewed breaking changes
- [ ] Updated documentation

## 🔗 Useful Links

- [npm CLI Documentation](https://docs.npmjs.com/cli/)
- [npm Workspaces](https://docs.npmjs.com/cli/v8/using-npm/workspaces)
- [pip-tools Documentation](https://pip-tools.readthedocs.io/)
- [Semantic Versioning](https://semver.org/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)

## 📞 Getting Help

1. Check detailed report: `DEPENDENCY_CLEANUP_REPORT.md`
2. Review summary: `DEPENDENCY_CLEANUP_SUMMARY.md`
3. Check npm logs: `npm-debug.log`
4. Search package changelog: `npm view <package> versions --json`
