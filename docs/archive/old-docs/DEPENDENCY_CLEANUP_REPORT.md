# Dependency Cleanup Report

**Generated:** $(date)

## Executive Summary

This report provides a comprehensive analysis of the project dependencies and recommendations for cleanup, updates, and optimization.

## 🔍 Analysis Results

### Node.js Dependencies

#### Security Issues Found
- **10 vulnerabilities** detected (4 low, 6 moderate)
  - `esbuild` (<= 0.24.2): Moderate - CSRF vulnerability in development server
  - `tmp` (<= 0.2.3): Low - Arbitrary file/directory write via symbolic link
  - Related packages: `vite`, `vitest`, `@vitest/ui`, `@vitest/coverage-v8`, `@lhci/cli`, `inquirer`

#### Deprecated Packages
The following packages have deprecation warnings:
- `inflight@1.0.6` - Memory leak issues (use `lru-cache` instead)
- `lodash.omit@4.5.0` - Use destructuring assignment syntax
- `rimraf@2.7.1` & `rimraf@3.0.2` - Update to v4+
- `supertest@6.3.4` - Update to v7.1.3+
- `@fortawesome/react-fontawesome@0.2.2` - Update to v3.1.1+
- `whatwg-encoding@3.1.1` - Use `@exodus/bytes` instead
- `glob@7.2.3` & `glob@8.1.0` - Update to v9+
- `sourcemap-codec@1.4.8` - Use `@jridgewell/sourcemap-codec`
- `source-map@0.8.0-beta.0` - Beta version
- `node-domexception@1.0.0` - Use platform native DOMException
- `superagent@8.1.2` - Update to v10.2.2+
- `three-mesh-bvh@0.7.8` - Three.js version incompatibility
- `graphql@14.7.0` - No longer supported

#### Major Version Updates Available

**High Priority (Security & Performance):**
- `vite`: 5.4.21 → 7.3.1 (Major update, includes security fixes)
- `vitest`: 1.6.1 → 4.0.17 (Major update)
- `@vitest/coverage-v8`: 1.6.1 → 4.0.17
- `@vitest/ui`: 1.6.1 → 4.0.17
- `express`: 4.22.1 → 5.2.1 (Major update)
- `supertest`: 6.3.4 → 7.2.2 (Security fix)

**React Ecosystem:**
- `react`: 18.3.1 → 19.2.3 (Major update)
- `react-dom`: 18.3.1 → 19.2.3
- `@types/react`: 18.3.27 → 19.2.8
- `@types/react-dom`: 18.3.7 → 19.2.3
- `@testing-library/react`: 14.3.1 → 16.3.1

**React Three Fiber Ecosystem:**
- `@react-three/fiber`: 8.18.0 → 9.5.0 (Major update)
- `@react-three/drei`: 9.122.0 → 10.7.7 (Major update)

**Other Notable Updates:**
- `react-router-dom`: 6.30.3 → 7.12.0 (Major update)
- `@sentry/react`: 8.55.0 → 10.33.0 (Major update)
- `jsdom`: 23.2.0 → 27.4.0 (Major update)
- `zustand`: 4.5.7 → 5.0.10 (Major update)
- `@pact-foundation/pact`: 13.2.0 → 16.0.4 (Major update)

**Minor Updates (Low Risk):**
- `concurrently`: 8.2.2 → 9.2.1
- `dotenv`: 16.6.1 → 17.2.3
- `typescript-eslint`: 8.52.0 → 8.53.0
- `@sentry/node`: 10.32.1 → 10.33.0
- `@sentry/profiling-node`: 10.32.1 → 10.33.0
- `postcss`: 8.4.49 → 8.5.6

### Python Dependencies

#### ML Service (`services/ml/requirements.txt`)
**Issues:**
- Duplicate TensorFlow/Keras entries (lines 10-11 and commented lines 23-26)
- Uses flexible version constraints (`>=`) which can lead to inconsistent builds
- Missing pinned versions for reproducibility

**Recommendations:**
- Remove duplicate entries
- Use pinned versions or version ranges with upper bounds
- Consider using a lock file approach (pip-tools, poetry)

#### MLOps Service (`services/mlops/requirements.txt`)
**Status:** ✅ Good
- Uses pinned versions
- Well-organized dependencies
- Clear separation of concerns

**Potential Updates:**
- `fastapi`: 0.109.0 (check for updates)
- `tensorflow`: 2.15.0 (check for updates)
- Other dependencies may have security patches

#### Simulator Service (`services/simulator/requirements.txt`)
**Status:** ✅ Good
- Uses pinned versions
- Consistent with MLOps service
- Minimal dependencies

## 📋 Recommendations

### Immediate Actions (High Priority)

1. **Fix Security Vulnerabilities**
   ```bash
   # Update vite and vitest to fix moderate vulnerabilities
   cd services/frontend
   npm install vite@latest vitest@latest @vitest/coverage-v8@latest @vitest/ui@latest
   ```

2. **Update Deprecated Packages**
   ```bash
   # Update supertest in backend
   cd services/backend
   npm install supertest@latest
   ```

3. **Clean ML Service Requirements**
   - Remove duplicate TensorFlow/Keras entries
   - Add version upper bounds for stability

### Medium Priority Actions

4. **Update Testing Infrastructure**
   - Update to Vitest v4 (requires testing for compatibility)
   - Update Vite to v7 (breaking changes - test thoroughly)

5. **Consider React 19 Migration**
   - React 19 has significant changes
   - Review migration guide: https://react.dev/blog/2024/04/25/react-19
   - Test thoroughly before upgrading

6. **Update Backend Framework**
   - Express v5 has breaking changes
   - Review migration guide before upgrading

### Low Priority Actions

7. **Update Minor Versions**
   - Safe to update typescript-eslint, postcss, dotenv, concurrently

8. **Optimize Python Dependencies**
   - Consider using `pip-tools` for better dependency management
   - Add `requirements-dev.txt` for development dependencies
   - Create `requirements.lock` for reproducible builds

9. **Workspace Optimization**
   - Consider hoisting common dependencies to root workspace
   - Reduce duplication between services

## 🛠️ Cleanup Scripts

### Complete Cleanup Script
```bash
# From project root
npm run clean
npm install
npm audit fix
```

### Python Environment Cleanup
```bash
# Clean Python cache and virtual environments
find . -type d -name "__pycache__" -exec rm -rf {} +
find . -type d -name ".pytest_cache" -exec rm -rf {} +
find . -type d -name "*.egg-info" -exec rm -rf {} +
find . -type d -name "venv" -exec rm -rf {} +
find . -type d -name ".venv" -exec rm -rf {} +
```

## 📊 Dependency Statistics

### Node.js Packages
- **Total packages:** 1,733
- **Workspaces:** 2 (backend, frontend)
- **Vulnerabilities:** 10 (4 low, 6 moderate)
- **Outdated packages:** 33+ major versions available

### Python Packages
- **ML Service:** ~15 direct dependencies
- **MLOps Service:** 18 direct dependencies
- **Simulator Service:** 13 direct dependencies

## 🔄 Suggested Update Strategy

### Phase 1: Security & Critical Updates (Week 1)
1. Fix security vulnerabilities
2. Update deprecated packages
3. Clean Python dependencies
4. Run full test suite

### Phase 2: Testing Infrastructure (Week 2)
1. Update Vitest to v4
2. Update Vite to v7
3. Test all existing tests
4. Update test configurations

### Phase 3: Framework Updates (Week 3-4)
1. Update React to v19 (optional)
2. Update Express to v5 (optional)
3. Update other major frameworks
4. Extensive integration testing

### Phase 4: Optimization (Week 5)
1. Optimize workspace dependencies
2. Implement Python lock files
3. Remove unused dependencies
4. Update documentation

## 📝 Notes

- All major version updates should be tested in a separate branch
- Breaking changes should be reviewed carefully
- Keep CI/CD pipeline updated with dependency changes
- Consider adding `dependabot` or `renovate` for automated dependency updates

## Next Steps

1. Review and approve this report
2. Create tickets for each phase
3. Set up dependency update automation
4. Establish dependency update policy
