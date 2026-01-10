import { configureAxe, toHaveNoViolations } from 'vitest-axe';
import { expect } from 'vitest';

expect.extend(toHaveNoViolations);

export const axe = configureAxe({
  rules: {
    // Enable WCAG 2.1 AA rules
    'color-contrast': { enabled: true },
    region: { enabled: true },
  },
});

export const a11yConfig = {
  wcag2aa: {
    runOnly: {
      type: 'tag' as const,
      values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'],
    },
  },
  wcag2a: {
    runOnly: {
      type: 'tag' as const,
      values: ['wcag2a', 'wcag21a'],
    },
  },
  bestPractice: {
    runOnly: {
      type: 'tag' as const,
      values: ['best-practice'],
    },
  },
};

export const getAccessibilityViolations = (results: any) => {
  return results.violations.map((violation: any) => ({
    id: violation.id,
    impact: violation.impact,
    description: violation.description,
    nodes: violation.nodes.length,
    helpUrl: violation.helpUrl,
  }));
};

export const checkA11y = async (container: HTMLElement, config = a11yConfig.wcag2aa) => {
  const results = await axe(container, config);
  return results;
};
