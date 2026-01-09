# Percy Visual Regression Testing

This directory contains visual regression tests using Percy for automated UI snapshot comparison.

## Overview

Percy integration captures visual snapshots of the application and detects visual changes across:
- Multiple viewports (mobile, tablet, desktop)
- Different themes (light/dark mode)
- Various component states
- User interactions

## Running Tests

### Local Development (without Percy)
```bash
npm run test:visual:local
```

### With Percy Integration
```bash
# Set Percy token
export PERCY_TOKEN=your_percy_token

# Run visual tests
npm run test:visual

# Or run for specific browser only
npm run percy:snapshot
```

## Test Organization

### Test Files

- **dashboard.percy.ts** - Dashboard page snapshots across viewports
- **components.percy.ts** - Key component snapshots (alerts, charts, 3D view, etc.)
- **themes.percy.ts** - Light/dark theme variations
- **responsive.percy.ts** - Responsive design testing
- **interactions.percy.ts** - User interaction states (hover, modals, errors)

### Helpers

- **helpers.ts** - Utility functions for consistent snapshot testing

## Configuration

### Percy Configuration (.percy.yml)
- Defines snapshot widths (mobile, tablet, desktop)
- Sets network idle timeout
- Configures allowed hostnames

### Percy Config (percy.config.js)
- JavaScript-based configuration
- Custom Percy CSS to hide dynamic content
- Viewport settings

## Viewports Tested

- **Mobile**: 375px (iPhone)
- **Tablet**: 768px (iPad)
- **Desktop**: 1280px
- **Large Desktop**: 1920px (optional)

## Best Practices

### 1. Hide Dynamic Content
Use the helper to hide elements that change between snapshots:
```typescript
import { hideDynamicContent } from './helpers';
await hideDynamicContent(page);
```

### 2. Wait for Stability
Always wait for the page to be stable before taking snapshots:
```typescript
import { waitForPageStable } from './helpers';
await waitForPageStable(page);
```

### 3. Mock API Responses
For consistent snapshots, mock API responses:
```typescript
import { mockAPIResponses } from './helpers';
await mockAPIResponses(page, {
  '**/api/sensors': mockSensorData,
});
```

### 4. Freeze Time
Prevent timestamp-related differences:
```typescript
import { freezeTime } from './helpers';
await freezeTime(page);
```

### 5. Name Snapshots Clearly
Use descriptive names that indicate what's being tested:
```typescript
await percySnapshot(page, 'Dashboard - Mobile - Dark Theme');
```

## CI/CD Integration

The visual regression workflow runs automatically on:
- Pull requests to `main` or `develop`
- Pushes to `main`
- Only when frontend files change

### GitHub Actions Workflow
See `.github/workflows/visual-regression.yml`

### Required Secrets
- `PERCY_TOKEN` - Percy.io API token

## Reviewing Visual Changes

1. **Pull Request Comments**: Percy bot comments on PRs with build links
2. **Percy Dashboard**: Review visual diffs at https://percy.io
3. **Approve/Reject**: Approve expected changes or reject bugs
4. **Build Status**: Percy updates PR status checks

## Snapshot Strategy

### What to Snapshot

✅ **DO snapshot:**
- Critical user journeys
- Component variations
- Theme variations
- Responsive layouts
- Error states
- Empty states

❌ **DON'T snapshot:**
- Rapidly changing data
- Real-time animations
- Third-party embedded content
- Non-deterministic content

### Snapshot Frequency

- **Critical pages**: All viewports + themes
- **Components**: Representative viewports
- **Modals/Overlays**: Desktop + mobile
- **Charts**: Desktop (unless responsive)

## Troubleshooting

### Flaky Snapshots
- Increase wait times in helpers
- Add more specific waits for animations
- Mock dynamic data sources
- Hide elements with `percyCSS`

### Missing Snapshots
- Check Percy token is set
- Verify network connectivity
- Check build logs for errors

### Large Diffs
- Ensure dynamic content is hidden
- Verify API mocks are working
- Check for animation completion
- Freeze time for timestamp-dependent content

## Percy Dashboard

### Viewing Builds
- **URL Format**: `https://percy.io/[org]/[project]`
- **Build Details**: Click any build to see snapshots
- **Diff Viewer**: Interactive comparison tool

### Managing Baselines
- **Approve**: Set new baseline for approved changes
- **Reject**: Mark as bug, requires fix
- **Comment**: Discuss changes with team

## Integration with Playwright

Percy integrates seamlessly with existing Playwright tests:
```typescript
import { test } from '@playwright/test';
import percySnapshot from '@percy/playwright';

test('my visual test', async ({ page }) => {
  await page.goto('/');
  await percySnapshot(page, 'Page Name');
});
```

## Resources

- [Percy Documentation](https://docs.percy.io)
- [Percy Playwright SDK](https://docs.percy.io/docs/playwright)
- [Visual Testing Best Practices](https://docs.percy.io/docs/best-practices)
