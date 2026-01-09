# Visual Regression Testing with Percy

## Setup Guide

### 1. Percy Account Setup

1. **Create Percy Account**
   - Visit https://percy.io
   - Sign up with GitHub account
   - Create new project: `nt-poc-frontend`

2. **Get Percy Token**
   - Go to Project Settings
   - Copy the `PERCY_TOKEN`
   - Add to GitHub Secrets: `Settings > Secrets > Actions`

3. **Project Configuration**
   - Percy auto-detects project from `.percy.yml`
   - Verify configuration in Percy dashboard

### 2. Local Development Setup

```bash
# Install dependencies (already done)
cd services/frontend
npm install

# Copy Percy environment template
cp .env.percy.example .env.percy

# Add your Percy token
echo "PERCY_TOKEN=your_token_here" >> .env.percy

# Load environment variables
source .env.percy

# Run visual tests locally (without Percy)
npm run test:visual:local

# Run with Percy integration
npm run test:visual
```

### 3. GitHub Actions Setup

The workflow is already configured in `.github/workflows/visual-regression.yml`

**Required Repository Secrets:**
- `PERCY_TOKEN` - Your Percy API token

**Optional Repository Variables:**
- `PERCY_ORG` - Your Percy organization name
- `PERCY_PROJECT` - Project name (default: nt-poc-frontend)

### 4. PR Workflow Integration

When a PR is created:
1. Visual regression workflow runs automatically
2. Percy captures snapshots
3. Percy compares with baseline (main branch)
4. Bot comments on PR with visual diff link
5. Review changes in Percy dashboard
6. Approve or request changes

### 5. Baseline Management

**Initial Baseline:**
```bash
# First run on main branch creates baseline
git checkout main
npm run test:visual
# Approve all snapshots in Percy dashboard
```

**Updating Baseline:**
- Merge approved PRs to main
- Percy auto-updates baseline
- Or manually approve in Percy dashboard

## Visual Test Coverage

### Pages Tested
- ✅ Dashboard (all viewports)
- ✅ Alerts page
- ✅ 3D View
- ✅ AI Insights
- ✅ Comparative Analysis
- ✅ Reports page

### Components Tested
- ✅ Alert Stats Dashboard
- ✅ RUL Trend Chart
- ✅ Loading Skeleton
- ✅ Offline Banner
- ✅ Navigation
- ✅ Modals
- ✅ Filter panels

### Viewports Tested
- 📱 Mobile (375px) - iPhone
- 📱 Tablet (768px) - iPad
- 🖥️ Desktop (1280px)
- 🖥️ Large Desktop (1920px)

### Themes Tested
- ☀️ Light mode
- 🌙 Dark mode

### States Tested
- Default states
- Hover states
- Error states
- Empty states
- Loading states
- Offline states

## Commands Reference

```bash
# Run all visual tests with Percy
npm run test:visual

# Run visual tests locally (no Percy)
npm run test:visual:local

# Run only Chromium visual tests with Percy
npm run percy:snapshot

# Run specific test file
npx percy exec -- npx playwright test e2e/visual/dashboard.percy.ts

# Debug mode
npx playwright test e2e/visual --debug

# UI mode
npx playwright test e2e/visual --ui
```

## Percy Dashboard Features

### Build Overview
- Total snapshots
- Changed snapshots
- New snapshots
- Removed snapshots

### Snapshot Comparison
- Side-by-side view
- Diff overlay
- Diff slider
- Multi-viewport view

### Review Actions
- **Approve**: Accept changes as new baseline
- **Reject**: Mark as regression
- **Comment**: Discuss with team
- **Request changes**: Block PR merge

### Filters
- Filter by status (changed, new, removed)
- Filter by browser
- Filter by viewport width

## Best Practices

### 1. Naming Convention
```typescript
// Pattern: [Component/Page] - [Viewport] - [State]
await percySnapshot(page, 'Dashboard - Mobile - Dark Theme');
await percySnapshot(page, 'Alert Modal - Desktop - Error State');
```

### 2. Minimize Flakiness
```typescript
// Wait for stability
await page.waitForLoadState('networkidle');
await page.waitForTimeout(500);

// Hide dynamic content
await hideDynamicContent(page);

// Freeze time
await freezeTime(page);
```

### 3. Scope Snapshots
```typescript
// Full page
await percySnapshot(page, 'Full Dashboard');

// Specific component (future feature)
await percySnapshot(page, 'Alert Component', {
  scope: '[data-testid="alert-component"]'
});
```

### 4. Performance
- Use `test.describe.configure({ mode: 'parallel' })`
- Limit snapshots to critical paths
- Use responsive widths efficiently
- Skip redundant viewport tests

## Troubleshooting

### Percy Not Running
```bash
# Check token
echo $PERCY_TOKEN

# Verify Percy CLI
npx percy --version

# Test connection
npx percy exec -- echo "test"
```

### Flaky Snapshots
- Increase timeouts in `helpers.ts`
- Add more specific waits
- Check for animations completion
- Mock API responses

### Build Failures
- Check GitHub Actions logs
- Verify PERCY_TOKEN secret
- Check Percy dashboard for errors
- Ensure Playwright browsers installed

### Large Diffs
- Review recent code changes
- Check if dynamic content leaked
- Verify theme/viewport consistency
- Update baseline if intentional

## Metrics and Monitoring

### Track in Percy Dashboard
- Build success rate
- Average snapshot count
- Common failure patterns
- Review approval time

### GitHub Integration
- PR status checks
- Auto-comments with build links
- Build notifications

## Support and Resources

- **Percy Docs**: https://docs.percy.io
- **Playwright Docs**: https://playwright.dev
- **Percy Support**: support@percy.io
- **Project Issues**: Create GitHub issue

## Migration Notes

If migrating from other visual testing tools:
1. Export existing baselines
2. Review snapshot naming
3. Update CI/CD integration
4. Train team on Percy workflow
5. Establish review process
