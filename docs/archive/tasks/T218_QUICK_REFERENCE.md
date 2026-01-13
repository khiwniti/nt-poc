# T218: Visual Regression Testing - Quick Reference

## Quick Start

```bash
# Install (already done)
npm install --save-dev @percy/playwright @percy/cli

# Run locally without Percy
npm run test:visual:local

# Run with Percy
export PERCY_TOKEN=your_token
npm run test:visual
```

## Test Files

| File | Purpose | Snapshots |
|------|---------|-----------|
| `dashboard.percy.ts` | Dashboard pages | 4 |
| `components.percy.ts` | Key UI components | 7+ |
| `themes.percy.ts` | Light/dark themes | 6 |
| `responsive.percy.ts` | Responsive layouts | 8 |
| `interactions.percy.ts` | UI interaction states | 8 |

## Viewports

- **Mobile**: 375px (iPhone)
- **Tablet**: 768px (iPad)
- **Desktop**: 1280px
- **Large**: 1920px

## Common Commands

```bash
# Local development
npm run test:visual:local

# With Percy integration
npm run test:visual

# Specific test
npx playwright test e2e/visual/dashboard.percy.ts

# Debug mode
npx playwright test e2e/visual --debug

# UI mode
npx playwright test e2e/visual --ui
```

## Helper Functions

```typescript
import {
  waitForPageStable,
  hideDynamicContent,
  setTheme,
  navigateAndWait,
  mockAPIResponses,
  freezeTime,
  waitForCharts,
  waitFor3DScene,
  VIEWPORTS,
  PERCY_WIDTHS,
} from './helpers';

// Usage example
await waitForPageStable(page);
await hideDynamicContent(page);
await setTheme(page, 'dark');
await percySnapshot(page, 'Dashboard - Dark', {
  widths: PERCY_WIDTHS.all
});
```

## Percy Configuration

**Files:**
- `.percy.yml` - Main config
- `percy.config.js` - JS config
- `.env.percy.example` - Environment template

**Key Settings:**
- Widths: [375, 768, 1280]
- Min Height: 1024px
- Network Idle: 750ms
- JavaScript: Enabled

## CI/CD Workflow

**Trigger:** PR to main/develop, frontend changes  
**Workflow:** `.github/workflows/visual-regression.yml`  
**Secret Required:** `PERCY_TOKEN`

**Process:**
1. Install dependencies
2. Build frontend
3. Run Percy visual tests
4. Upload artifacts
5. Comment on PR

## Percy Dashboard

**URL Pattern:** `https://percy.io/[org]/[project]`

**Review Actions:**
- ✅ Approve - Accept changes
- ❌ Reject - Mark as bug
- 💬 Comment - Discuss
- 🔄 Request changes - Block merge

## Troubleshooting

### Flaky Snapshots
```typescript
// Increase waits
await page.waitForTimeout(1000);

// Hide dynamic content
await hideDynamicContent(page);

// Freeze time
await freezeTime(page);
```

### Missing Token
```bash
echo $PERCY_TOKEN  # Should not be empty
export PERCY_TOKEN=your_token_here
```

### Build Errors
- Check GitHub Actions logs
- Verify PERCY_TOKEN secret exists
- Ensure Playwright browsers installed
- Check Percy dashboard for errors

## File Structure

```
services/frontend/
├── .percy.yml
├── percy.config.js
├── .env.percy.example
├── PERCY_SETUP.md
├── e2e/visual/
│   ├── README.md
│   ├── helpers.ts
│   ├── dashboard.percy.ts
│   ├── components.percy.ts
│   ├── themes.percy.ts
│   ├── responsive.percy.ts
│   └── interactions.percy.ts
└── .github/workflows/
    └── visual-regression.yml
```

## Best Practices

1. **Name clearly**: `Component - Viewport - State`
2. **Wait for stability**: Use `waitForPageStable()`
3. **Hide dynamic content**: Use `hideDynamicContent()`
4. **Mock APIs**: Use `mockAPIResponses()`
5. **Freeze time**: Use `freezeTime()`

## Coverage Summary

- ✅ 30+ visual snapshots
- ✅ 5 major pages
- ✅ 7+ components
- ✅ 2 themes (light/dark)
- ✅ 4 viewports
- ✅ 8+ interaction states

## Documentation

- **Visual Testing**: `e2e/visual/README.md`
- **Setup Guide**: `PERCY_SETUP.md`
- **Acceptance**: `T218_ACCEPTANCE_CHECKLIST.md`
- **Implementation**: `T218_IMPLEMENTATION_COMPLETE.md`

## Resources

- [Percy Docs](https://docs.percy.io)
- [Playwright Docs](https://playwright.dev)
- [Percy Playwright SDK](https://docs.percy.io/docs/playwright)

---

**Task**: T218 - Visual Regression Testing  
**Status**: ✅ Complete  
**Last Updated**: 2026-01-09
