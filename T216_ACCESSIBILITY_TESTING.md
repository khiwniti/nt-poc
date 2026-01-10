# Accessibility Testing - T216

## Overview

This implementation provides comprehensive accessibility testing for the NT-POC frontend application, ensuring WCAG 2.1 AA compliance using industry-standard tools.

## Implementation Details

### 1. Tools & Libraries

#### axe-core Integration
- **@axe-core/playwright**: Accessibility testing in E2E tests
- **vitest-axe**: Accessibility testing in unit/component tests
- Automatically detects WCAG violations in rendered components

#### Lighthouse CI
- **@lhci/cli**: Automated Lighthouse audits in CI/CD
- Targets 90+ accessibility score
- Configured for desktop and mobile viewports

### 2. Test Coverage

#### E2E Accessibility Tests (`e2e/accessibility.spec.ts`)
Tests all major pages for WCAG 2.1 AA compliance:
- Dashboard (`/`)
- Assets page (`/assets`)
- Alerts page (`/alerts`)
- Comparative Analysis (`/comparative-analysis`)
- AI Insights (`/ai-insights`)
- What-If Scenarios (`/what-if`)
- Reports page (`/reports`)
- Settings page (`/settings`)

**Rules checked:**
- WCAG 2.0 Level A & AA
- WCAG 2.1 Level A & AA

#### Keyboard Navigation Tests (`e2e/keyboard-navigation.spec.ts`)
Validates keyboard accessibility:
- ✅ Tab navigation through interactive elements
- ✅ Shift+Tab backward navigation
- ✅ Enter/Space key activation
- ✅ Escape key to close modals
- ✅ Focus trap in modal dialogs
- ✅ Arrow key navigation in lists/menus
- ✅ Visible focus indicators
- ✅ No keyboard traps outside modals

#### Screen Reader Compatibility Tests (`e2e/screen-reader.spec.ts`)
Ensures screen reader compatibility:
- ✅ Proper page titles
- ✅ Heading hierarchy (h1-h6)
- ✅ ARIA landmarks (main, navigation)
- ✅ Descriptive button labels
- ✅ Alt text for images
- ✅ Form labels
- ✅ Link text accessibility
- ✅ ARIA roles for custom elements
- ✅ ARIA live regions
- ✅ Table structures with headers
- ✅ ARIA expanded states
- ✅ Skip links
- ✅ Language attributes

#### Component-Level Tests (`src/__tests__/accessibility.test.tsx`)
Template for testing individual components with axe-core:
- Button accessible names
- Image alt text
- Form input labels
- Link accessibility
- Color contrast (WCAG AA)

### 3. Running Tests

#### Local Development

```bash
cd services/frontend

# Run all accessibility tests
npm run test:a11y

# Run accessibility tests on Chromium only (faster)
npm run test:a11y:chromium

# Run Lighthouse audit
npm run lighthouse

# Run just Lighthouse collection
npm run lighthouse:collect

# Run just Lighthouse assertions
npm run lighthouse:assert

# Run component accessibility tests
npm test -- accessibility
```

#### In CI/CD

Accessibility tests run automatically on:
- Pull requests to `main` or `develop`
- Pushes to `main` or `develop`
- Only when frontend files change

See `.github/workflows/accessibility.yml`

### 4. Configuration Files

#### `lighthouserc.js`
Lighthouse CI configuration:
- Tests 8 core pages
- 3 runs per page for consistency
- Minimum scores:
  - **Accessibility: 90+** (enforced with error)
  - Best Practices: 85+ (warning)
  - SEO: 90+ (warning)
  - Performance: 75+ (warning)

#### `playwright.config.ts`
Already configured with:
- Multiple browsers (Chromium, Firefox, WebKit)
- Mobile viewports (Pixel 5, iPhone 12)
- Screenshot on failure
- Trace on first retry

### 5. WCAG 2.1 AA Compliance

Our tests verify compliance with:

**Perceivable**
- Text alternatives (alt text)
- Color contrast ratios
- Proper heading hierarchy
- Meaningful link text

**Operable**
- Keyboard accessible
- No keyboard traps
- Skip links
- Focus visible
- Focus order

**Understandable**
- Language of page
- Labels and instructions
- Error identification
- Consistent navigation

**Robust**
- Valid HTML/ARIA
- ARIA roles and properties
- Compatible with assistive technologies

### 6. Accessibility Score Target

**Target: 90+ (exceeds requirement)**

Current Lighthouse configuration enforces:
- Minimum accessibility score: 90/100
- Fails CI if score drops below 90
- Tests run on every PR affecting frontend

### 7. Best Practices

#### When Writing Components

1. **Always provide accessible names:**
   ```tsx
   // Good
   <button aria-label="Close dialog">×</button>
   <button>Submit Form</button>
   
   // Bad
   <button>×</button>
   ```

2. **Use semantic HTML:**
   ```tsx
   // Good
   <nav><a href="/home">Home</a></nav>
   <main><h1>Dashboard</h1></main>
   
   // Bad
   <div onClick={...}>Home</div>
   <div><span>Dashboard</span></div>
   ```

3. **Add alt text to images:**
   ```tsx
   // Good
   <img src="logo.png" alt="Company logo" />
   <img src="decoration.png" alt="" role="presentation" />
   
   // Bad
   <img src="logo.png" />
   ```

4. **Label form inputs:**
   ```tsx
   // Good
   <label htmlFor="email">Email:</label>
   <input id="email" type="email" />
   
   // Or
   <input type="email" aria-label="Email address" />
   
   // Bad
   <input type="email" />
   ```

5. **Test your component:**
   ```tsx
   import { render } from '@testing-library/react';
   import { axe } from './__tests__/axe-helper';
   
   it('should not have accessibility violations', async () => {
     const { container } = render(<MyComponent />);
     const results = await axe(container);
     expect(results).toHaveNoViolations();
   });
   ```

#### When Testing

1. **Run accessibility tests during development:**
   ```bash
   npm run test:a11y:chromium
   ```

2. **Fix violations immediately:**
   - Review axe-core violation reports
   - Check element locations in test output
   - Fix in component code
   - Re-run tests to verify

3. **Test keyboard navigation manually:**
   - Navigate entire page using only Tab/Shift+Tab
   - Activate controls with Enter/Space
   - Close modals with Escape
   - Verify visible focus indicators

4. **Test with screen readers (recommended):**
   - macOS: VoiceOver (Cmd+F5)
   - Windows: NVDA or JAWS
   - Verify all content is announced properly

### 8. CI/CD Integration

The accessibility workflow:
1. Installs dependencies
2. Builds the frontend
3. Starts dev server
4. Runs axe accessibility tests
5. Runs Lighthouse CI audits
6. Uploads results as artifacts
7. Comments on PR with summary

**Artifacts generated:**
- `lighthouse-results/` - Lighthouse HTML reports
- `accessibility-test-results/` - Playwright test reports

### 9. Troubleshooting

#### Test Failures

**"Expected no violations but got X"**
1. Check the violation details in test output
2. Note the affected element(s)
3. Review WCAG rule documentation
4. Fix the violation in component code

**"Color contrast too low"**
1. Check text/background color combinations
2. Use a contrast checker tool
3. Ensure ratio is at least 4.5:1 for normal text, 3:1 for large text

**"Button missing accessible name"**
1. Add visible text content to button
2. Or add `aria-label` attribute
3. Or use `aria-labelledby` to reference another element

**"Form input missing label"**
1. Add a `<label>` element with matching `htmlFor` and input `id`
2. Or add `aria-label` to the input
3. Or use `aria-labelledby` to reference a label element

#### Lighthouse Failures

**"Failed to load page"**
- Ensure dev server is running on port 5173
- Check firewall/network settings
- Verify build succeeds

**"Score too low"**
1. Review the Lighthouse HTML report (in artifacts)
2. Focus on failing audits
3. Prioritize accessibility fixes
4. Re-run tests locally before pushing

### 10. Future Enhancements

Potential additions:
- [ ] Automated color contrast testing for all color combinations
- [ ] Touch target size validation (mobile)
- [ ] Voice control testing
- [ ] Screen reader integration tests (e.g., with @guidepup)
- [ ] Accessibility regression tracking over time
- [ ] Custom axe rules for project-specific requirements

### 11. Resources

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [axe-core Documentation](https://github.com/dequelabs/axe-core)
- [Lighthouse Accessibility Scoring](https://web.dev/accessibility-scoring/)
- [MDN Accessibility Guide](https://developer.mozilla.org/en-US/docs/Web/Accessibility)
- [WebAIM Resources](https://webaim.org/resources/)

## Acceptance Criteria Verification

- [x] **axe-core integration in tests**: Implemented in Playwright and Vitest
- [x] **Lighthouse CI integration**: Configured with lighthouserc.js
- [x] **WCAG 2.1 AA compliance verification**: All major pages tested
- [x] **Keyboard navigation tests**: Comprehensive suite covering all keyboard interactions
- [x] **Screen reader compatibility tests**: Validates ARIA, semantics, and structure
- [x] **Accessibility score: >90**: Enforced in Lighthouse CI configuration

## Summary

T216 implementation provides enterprise-grade accessibility testing infrastructure ensuring the NT-POC application is usable by all users, including those with disabilities. The combination of automated axe-core testing, comprehensive keyboard navigation validation, screen reader compatibility checks, and Lighthouse CI audits provides continuous monitoring of accessibility standards compliance.
