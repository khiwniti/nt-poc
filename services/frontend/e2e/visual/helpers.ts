/**
 * Percy Visual Testing Helpers
 * Utilities for consistent visual regression testing
 */

import { Page } from '@playwright/test';

export interface SnapshotOptions {
  widths?: number[];
  minHeight?: number;
  percyCSS?: string;
  scope?: string;
  enableJavaScript?: boolean;
}

/**
 * Wait for page to be fully loaded and stable
 */
export async function waitForPageStable(page: Page, timeout = 2000): Promise<void> {
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(timeout);
}

/**
 * Hide dynamic content that changes between snapshots
 */
export async function hideDynamicContent(page: Page): Promise<void> {
  await page.addStyleTag({
    content: `
      .animation-running,
      .loading-spinner,
      [data-testid="current-time"],
      [data-testid="live-timestamp"],
      .recharts-tooltip,
      .tooltip-visible {
        visibility: hidden !important;
      }
    `,
  });
}

/**
 * Set theme mode for testing
 */
export async function setTheme(page: Page, theme: 'light' | 'dark'): Promise<void> {
  await page.emulateMedia({ colorScheme: theme });
  await page.waitForTimeout(300);
}

/**
 * Standard viewport configurations
 */
export const VIEWPORTS = {
  mobile: { width: 375, height: 812 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1280, height: 1024 },
  largeDesktop: { width: 1920, height: 1080 },
} as const;

/**
 * Standard Percy snapshot widths
 */
export const PERCY_WIDTHS = {
  mobile: [375],
  tablet: [768],
  desktop: [1280],
  all: [375, 768, 1280],
  desktopOnly: [1280, 1920],
} as const;

/**
 * Navigate and wait for a specific page
 */
export async function navigateAndWait(
  page: Page,
  linkText: string,
  options?: { timeout?: number }
): Promise<boolean> {
  const link = page.locator(`a:has-text("${linkText}")`).first();
  
  if (!(await link.isVisible())) {
    return false;
  }
  
  await link.click();
  await page.waitForLoadState('networkidle', { timeout: options?.timeout });
  await page.waitForTimeout(500);
  
  return true;
}

/**
 * Mock API responses for consistent snapshots
 */
export async function mockAPIResponses(page: Page, responses: Record<string, any>): Promise<void> {
  for (const [url, response] of Object.entries(responses)) {
    await page.route(url, (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(response),
      });
    });
  }
}

/**
 * Freeze time for consistent snapshots
 */
export async function freezeTime(page: Page, timestamp?: Date): Promise<void> {
  const time = timestamp || new Date('2024-01-15T12:00:00Z');
  await page.addInitScript(`{
    Date.now = () => ${time.getTime()};
    const OriginalDate = Date;
    Date = class extends OriginalDate {
      constructor(...args) {
        if (args.length === 0) {
          super(${time.getTime()});
        } else {
          super(...args);
        }
      }
    };
  }`);
}

/**
 * Wait for charts to finish rendering
 */
export async function waitForCharts(page: Page): Promise<void> {
  await page.waitForSelector('.recharts-wrapper, [data-testid*="chart"]', {
    timeout: 5000,
  }).catch(() => {});
  await page.waitForTimeout(1000);
}

/**
 * Wait for 3D scene to load
 */
export async function waitFor3DScene(page: Page, timeout = 3000): Promise<void> {
  await page.waitForSelector('canvas', { timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(timeout);
}

/**
 * Scroll element into view before snapshot
 */
export async function scrollIntoView(page: Page, selector: string): Promise<void> {
  const element = page.locator(selector);
  await element.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
}
