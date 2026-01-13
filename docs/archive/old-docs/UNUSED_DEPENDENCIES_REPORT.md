# Unused Dependencies Report

**Generated:** $(date)
**Tool:** depcheck v1.4.7

## Overview

This report identifies unused dependencies that can potentially be removed to reduce bundle size and maintenance overhead.

⚠️ **Important:** Review each item carefully before removing. Some packages may be:
- Used indirectly by other tools (config files, build tools)
- Required by peer dependencies
- Used in scripts or CLI commands
- Planned for future use

## Backend Service (@nt-poc/backend)

### Unused Dependencies (1)
- ❌ **`ml-cart`** - Machine learning CART algorithm library
  - **Status:** Not used in codebase
  - **Action:** Safe to remove
  - **Reason:** Appears to be unused ML library
  - **Command:** `npm uninstall ml-cart --workspace=@nt-poc/backend`

### Unused devDependencies (2)
- ❌ **`@types/jest`** - TypeScript types for Jest
  - **Status:** Not used (using Vitest instead)
  - **Action:** Safe to remove
  - **Reason:** Project uses Vitest, not Jest
  - **Command:** `npm uninstall @types/jest --workspace=@nt-poc/backend`

- ❌ **`ts-jest`** - TypeScript preprocessor for Jest
  - **Status:** Not used (using Vitest instead)
  - **Action:** Safe to remove
  - **Reason:** Project uses Vitest, not Jest
  - **Command:** `npm uninstall ts-jest --workspace=@nt-poc/backend`

### Missing Dependencies (2)
These are used but not declared in package.json:

- ⚠️ **`express-serve-static-core`** - Used in: `./src/types/express.d.ts`
  - **Status:** Usually included as transitive dependency of `express`
  - **Action:** No action needed (provided by express)
  - **Note:** Type declarations use this

- ⚠️ **`bcrypt`** - Used in: `./src/routes/__tests__/auth.test.ts`
  - **Status:** Missing from dependencies
  - **Action:** Add if authentication tests need it
  - **Command:** `npm install bcrypt --save-dev --workspace=@nt-poc/backend`
  - **Note:** Only used in tests

## Frontend Service (@nt-poc/frontend)

### Unused Dependencies (3)

- ⚠️ **`@react-spring/web`** - Animation library for web
  - **Status:** Not detected in codebase
  - **Action:** Review before removing
  - **Reason:** May be used for animations, or @react-spring/three may be sufficient
  - **Note:** Check if any components use this for 2D animations

- ⚠️ **`dexie-react-hooks`** - React hooks for Dexie (IndexedDB)
  - **Status:** Not detected by depcheck
  - **Action:** Review before removing
  - **Reason:** May be imported but not detected, used for offline storage
  - **Note:** Check offline storage implementation

- ⚠️ **`maath`** - Math utilities for 3D graphics
  - **Status:** Not detected in main codebase
  - **Action:** Review before removing
  - **Reason:** May be used in 3D components
  - **Note:** Check ThreeDView and related components

### Unused devDependencies (10)

#### Definitely Unused (False Positives - Keep These)

- ✅ **`@vitest/coverage-v8`** - Coverage reporting for Vitest
  - **Status:** Used by Vitest coverage command
  - **Action:** KEEP - Required for `npm run test:coverage`
  - **Reason:** Used via CLI, not imported directly

- ✅ **`postcss`** - CSS processor
  - **Status:** Required by Vite/Tailwind
  - **Action:** KEEP - Required for Tailwind CSS
  - **Reason:** Build tool dependency

- ✅ **`autoprefixer`** - PostCSS plugin for vendor prefixes
  - **Status:** Used by PostCSS pipeline
  - **Action:** KEEP - Required for CSS processing
  - **Reason:** PostCSS plugin

- ✅ **`tailwindcss`** - CSS framework
  - **Status:** Used throughout the app
  - **Action:** KEEP - Core styling framework
  - **Reason:** Used via directives in CSS, not direct imports

- ✅ **`vite-plugin-pwa`** - PWA plugin for Vite
  - **Status:** Used in Vite config
  - **Action:** KEEP - Required for PWA functionality
  - **Reason:** Vite plugin

- ✅ **`workbox-window`** - Service worker library
  - **Status:** Used for PWA functionality
  - **Action:** KEEP - Required for service worker
  - **Reason:** PWA support

- ✅ **`rollup-plugin-visualizer`** - Bundle size visualization
  - **Status:** Used in analyze script
  - **Action:** KEEP - Useful for bundle analysis
  - **Reason:** Development tool

- ✅ **`axe-core`** - Accessibility testing engine
  - **Status:** Used for accessibility tests
  - **Action:** KEEP - Required for a11y tests
  - **Reason:** Testing dependency

- ✅ **`axe-playwright`** - Axe integration for Playwright
  - **Status:** Used in Playwright tests
  - **Action:** KEEP - Required for accessibility tests
  - **Reason:** Testing dependency

#### Potentially Unused

- ⚠️ **`@eslint/eslintrc`** - ESLint configuration utilities
  - **Status:** May not be needed with flat config
  - **Action:** Review ESLint config
  - **Reason:** Check if using flat config format
  - **Note:** Modern ESLint may not need this

### Missing Dependencies (3)
These are referenced but not declared:

- ⚠️ **`@types/node`** - Used in: `./tsconfig.json`
  - **Status:** Usually provided by workspace
  - **Action:** May want to add explicitly
  - **Command:** `npm install @types/node --save-dev --workspace=@nt-poc/frontend`

- ⚠️ **`three-stdlib`** - Used in: backup files
  - **Status:** Only in backup directory
  - **Action:** No action needed (backup files)
  - **Note:** Ignore backup directories

- ⚠️ **`axios`** - Used in: backup files
  - **Status:** Only in backup directory
  - **Action:** No action needed (backup files)
  - **Note:** Ignore backup directories

## Recommended Actions

### Immediate - Safe to Remove (Backend)

```bash
cd services/backend

# Remove unused ML library
npm uninstall ml-cart

# Remove Jest-related packages (using Vitest)
npm uninstall @types/jest ts-jest

# Optional: Add bcrypt if needed for tests
npm install bcrypt --save-dev
```

**Estimated savings:** ~5MB node_modules, 3 packages

### Review Required (Frontend)

```bash
cd services/frontend

# Check if these are actually used before removing:
# 1. Search for @react-spring/web usage
grep -r "@react-spring/web" src/

# 2. Search for dexie-react-hooks usage
grep -r "dexie-react-hooks" src/

# 3. Search for maath usage
grep -r "maath" src/

# If confirmed unused, remove:
# npm uninstall @react-spring/web dexie-react-hooks maath
```

### Do NOT Remove (Frontend - False Positives)

These are used but not detected by depcheck:
- `@vitest/coverage-v8` - Used by test coverage
- `postcss`, `autoprefixer`, `tailwindcss` - Used by build system
- `vite-plugin-pwa`, `workbox-window` - Used for PWA
- `rollup-plugin-visualizer` - Used by analyze script
- `axe-core`, `axe-playwright` - Used by accessibility tests

## Cleanup Script

```bash
#!/bin/bash
# Clean up confirmed unused dependencies

echo "Removing unused backend dependencies..."
cd services/backend
npm uninstall ml-cart @types/jest ts-jest

echo ""
echo "Backend cleanup complete!"
echo ""
echo "Frontend requires manual review before removing:"
echo "  - @react-spring/web"
echo "  - dexie-react-hooks"
echo "  - maath"
echo ""
echo "Please verify these are not used before removing."
```

## Summary

### Backend
- **Can remove:** 3 packages (ml-cart, @types/jest, ts-jest)
- **Should add:** 1 package (bcrypt - for tests, optional)
- **Estimated savings:** ~5MB

### Frontend
- **Requires review:** 3 packages (@react-spring/web, dexie-react-hooks, maath)
- **False positives:** 10 packages (actually used, keep them)
- **Potential savings:** ~2-3MB (if unused confirmed)

### Total Potential Cleanup
- **Confirmed removable:** 3 packages
- **Review needed:** 3 packages
- **Estimated total savings:** 5-8MB node_modules

## Notes

1. **depcheck limitations:**
   - May not detect dynamic imports
   - May not detect CLI tool usage
   - May not detect configuration file dependencies
   - May not detect peer dependency requirements

2. **Before removing any package:**
   - Search codebase for usage
   - Check package.json scripts
   - Check configuration files
   - Run tests after removal
   - Test build process

3. **After removal:**
   - Run `npm install`
   - Run `npm test`
   - Run `npm run build`
   - Test application functionality

## Next Steps

1. ✅ Review this report
2. ⏳ Remove confirmed unused backend packages
3. ⏳ Verify frontend packages before removal
4. ⏳ Run full test suite
5. ⏳ Update documentation if needed

---

**Generated by:** depcheck + manual analysis
**Last updated:** $(date)
