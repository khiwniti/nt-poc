# Accessibility Testing Suite

## Overview

Comprehensive accessibility testing infrastructure ensuring WCAG 2.1 AA compliance across the entire application.

## Quick Start

```bash
cd services/frontend

# Install dependencies
npm ci

# Run all accessibility tests (requires dev server)
npm run dev &  # Start dev server
npm run test:a11y

# Run specific test suites
npm run test:a11y:axe              # WCAG compliance
npm run test:a11y:keyboard         # Keyboard navigation
npm run test:a11y:screenreader     # Screen reader support

# Run Lighthouse CI
npm run lighthouse
```

## Test Suites

### 1. Axe-Core Tests (14 tests)
**File**: `e2e/accessibility/axe.spec.ts`

Automated WCAG 2.1 AA compliance testing:
- ✅ Color contrast verification
- ✅ Form label associations
- ✅ Image alt text
- ✅ Heading hierarchy
- ✅ ARIA attribute validation
- ✅ Landmark regions

### 2. Keyboard Navigation (10 tests)
**File**: `e2e/accessibility/keyboard-navigation.spec.ts`

Full keyboard accessibility:
- ✅ Tab navigation
- ✅ Enter/Space activation
- ✅ Escape for modals
- ✅ Arrow key navigation
- ✅ Focus management
- ✅ Shift+Tab reverse navigation

### 3. Screen Reader Support (17 tests)
**File**: `e2e/accessibility/screen-reader.spec.ts`

Screen reader compatibility:
- ✅ ARIA labels and roles
- ✅ Live regions
- ✅ Semantic HTML
- ✅ Accessible names
- ✅ Status announcements
- ✅ Error associations

### 4. Lighthouse CI
**File**: `lighthouserc.cjs`

Performance and accessibility auditing:
- ✅ 90%+ accessibility score requirement
- ✅ Best practices validation
- ✅ SEO checks
- ✅ 6 page audits

## WCAG 2.1 AA Compliance

### Perceivable
- 1.1.1 Non-text Content
- 1.3.1 Info and Relationships
- 1.4.3 Contrast (Minimum)
- 1.4.11 Non-text Contrast

### Operable
- 2.1.1 Keyboard
- 2.1.2 No Keyboard Trap
- 2.4.1 Bypass Blocks
- 2.4.3 Focus Order
- 2.4.7 Focus Visible

### Understandable
- 3.1.1 Language of Page
- 3.2.1 On Focus
- 3.3.1 Error Identification
- 3.3.2 Labels or Instructions

### Robust
- 4.1.2 Name, Role, Value
- 4.1.3 Status Messages

## CI/CD Integration

Tests run automatically on:
- Push to main/develop
- Pull requests
- Pre-merge checks

See `.github/workflows/accessibility.yml`

## Component-Level Testing

Use `a11y-utils.ts` for component tests:

```typescript
import { axe } from '../a11y-utils';
import { render } from '@testing-library/react';

const { container } = render(<MyComponent />);
const results = await axe(container);
expect(results).toHaveNoViolations();
```

## Tools Used

- **axe-core**: Industry-standard accessibility engine
- **@axe-core/playwright**: Playwright integration
- **Lighthouse CI**: Google's accessibility auditor
- **vitest-axe**: Unit test integration

## Accessibility Score

**Target**: ≥90/100
**Current**: Configured and tested

## Resources

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [axe-core Documentation](https://github.com/dequelabs/axe-core)
- [Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci)

## Support

For issues or questions:
1. Check test output for specific violations
2. Review WCAG guidelines
3. Use browser DevTools accessibility inspector
4. Run `npm run lighthouse` for detailed report
