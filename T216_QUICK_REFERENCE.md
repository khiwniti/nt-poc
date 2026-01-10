# T216: Accessibility Testing - Quick Reference

## Run Tests

```bash
cd services/frontend

# All accessibility tests
npm run test:a11y

# Specific test types
npm run test:a11y:axe              # WCAG 2.1 AA violations
npm run test:a11y:keyboard         # Keyboard navigation
npm run test:a11y:screenreader     # Screen reader compatibility

# Lighthouse CI
npm run lighthouse                  # Full accessibility audit
```

## Test Files

- `e2e/accessibility/axe.spec.ts` - Axe-core automated checks
- `e2e/accessibility/keyboard-navigation.spec.ts` - Keyboard tests
- `e2e/accessibility/screen-reader.spec.ts` - Screen reader tests
- `lighthouserc.js` - Lighthouse CI config

## Key Features

✅ **axe-core**: Automated WCAG 2.1 AA testing
✅ **Keyboard Navigation**: Tab, Enter, Escape, Arrow keys
✅ **Screen Reader**: ARIA labels, roles, live regions
✅ **Lighthouse CI**: 90%+ accessibility score requirement

## WCAG 2.1 AA Coverage

- Color contrast ≥4.5:1
- All images have alt text
- Forms have proper labels
- Keyboard accessible
- ARIA attributes valid
- Heading hierarchy correct
- Focus indicators visible

## Quick Checks

```bash
# Component-level a11y
npm run test -- AlertList.a11y

# Full E2E suite (requires dev server)
npm run test:e2e e2e/accessibility
```

## CI/CD Integration

Tests run automatically on:
- Pull requests
- Pre-merge checks
- Release builds

Target: **Accessibility Score ≥ 90%**
