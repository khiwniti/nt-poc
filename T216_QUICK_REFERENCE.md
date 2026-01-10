# T216 Quick Reference: Accessibility Testing

## Quick Commands

```bash
# Run all accessibility tests
npm run test:a11y

# Run accessibility tests (Chromium only - faster)
npm run test:a11y:chromium

# Run Lighthouse audit
npm run lighthouse

# Run component accessibility tests
npm test -- accessibility
```

## Test Files

- `e2e/accessibility.spec.ts` - WCAG 2.1 AA compliance tests
- `e2e/keyboard-navigation.spec.ts` - Keyboard interaction tests
- `e2e/screen-reader.spec.ts` - Screen reader compatibility tests
- `src/__tests__/accessibility.test.tsx` - Component-level template

## Configuration

- `lighthouserc.js` - Lighthouse CI config (min score: 90)
- `.github/workflows/accessibility.yml` - CI/CD workflow

## Key Checks

### axe-core (Automated)
- ✅ WCAG 2.0 Level A & AA
- ✅ WCAG 2.1 Level A & AA
- ✅ Color contrast
- ✅ ARIA usage
- ✅ Form labels
- ✅ Button names
- ✅ Image alt text

### Keyboard Navigation
- ✅ Tab order logical
- ✅ All interactive elements reachable
- ✅ Focus visible
- ✅ Enter/Space activates buttons
- ✅ Escape closes modals
- ✅ No keyboard traps
- ✅ Focus trap in modals

### Screen Reader
- ✅ Proper heading hierarchy
- ✅ ARIA landmarks
- ✅ Descriptive labels
- ✅ Alt text on images
- ✅ Form labels
- ✅ Link text meaningful
- ✅ Page titles
- ✅ Language attribute

### Lighthouse Scores
- 🎯 Accessibility: **90+** (enforced)
- ⚠️ Best Practices: 85+ (warning)
- ⚠️ SEO: 90+ (warning)
- ⚠️ Performance: 75+ (warning)

## Common Fixes

### Button missing accessible name
```tsx
// ❌ Bad
<button onClick={close}>×</button>

// ✅ Good
<button onClick={close} aria-label="Close">×</button>
```

### Image missing alt text
```tsx
// ❌ Bad
<img src="logo.png" />

// ✅ Good
<img src="logo.png" alt="Company logo" />
<img src="decoration.png" alt="" role="presentation" />
```

### Input missing label
```tsx
// ❌ Bad
<input type="email" />

// ✅ Good
<label htmlFor="email">Email</label>
<input id="email" type="email" />
```

### Low color contrast
```tsx
// ❌ Bad (2.8:1 ratio)
<p style={{ color: '#888', background: '#fff' }}>Text</p>

// ✅ Good (4.5:1+ ratio)
<p style={{ color: '#595959', background: '#fff' }}>Text</p>
```

## Testing a Component

```tsx
import { render } from '@testing-library/react';
import { axe } from './__tests__/axe-helper';

it('should have no a11y violations', async () => {
  const { container } = render(<MyComponent />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

## CI/CD

Runs on PR/push to main/develop when frontend files change:
1. Builds frontend
2. Runs axe tests (Playwright)
3. Runs Lighthouse CI
4. Uploads artifacts
5. Comments on PR

## Artifacts

- `lighthouse-results/` - Lighthouse HTML reports
- `accessibility-test-results/` - Playwright reports

## Resources

- WCAG 2.1: https://www.w3.org/WAI/WCAG21/quickref/
- axe-core: https://github.com/dequelabs/axe-core
- WebAIM: https://webaim.org/resources/

## Score Target

**90+ accessibility score** (Lighthouse)
