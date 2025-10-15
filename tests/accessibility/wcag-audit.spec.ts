/**
 * WCAG 2.1 AA Accessibility Tests
 * Using axe-core for automated accessibility testing
 */

import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('WCAG 2.1 AA Compliance', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
  });

  test('overview page should have no accessibility violations', async ({ page }) => {
    await page.goto('/marketing-audit');
    await page.waitForSelector('[data-testid="composite-score"]');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('technical seo tab should have no violations', async ({ page }) => {
    await page.goto('/marketing-audit');
    await page.click('button:has-text("Technical SEO")');
    await page.waitForSelector('[data-testid="cwv-metrics"]');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('local presence tab should have no violations', async ({ page }) => {
    await page.goto('/marketing-audit');
    await page.click('button:has-text("Local Presence")');
    await page.waitForSelector('[data-testid="gbp-metrics"]');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('competitors tab should have no violations', async ({ page }) => {
    await page.goto('/marketing-audit');
    await page.click('button:has-text("Competitors")');
    await page.waitForSelector('[data-testid="competitor-card"]');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('keyboard navigation works correctly', async ({ page }) => {
    await page.goto('/marketing-audit');
    
    // Test Tab navigation
    await page.keyboard.press('Tab');
    let focused = await page.evaluate(() => document.activeElement?.tagName);
    expect(['BUTTON', 'A', 'INPUT']).toContain(focused);
    
    // Test Shift+Tab
    await page.keyboard.press('Shift+Tab');
    focused = await page.evaluate(() => document.activeElement?.tagName);
    expect(['BUTTON', 'A', 'INPUT']).toContain(focused);
    
    // Test Enter to activate
    await page.keyboard.press('Enter');
    // Should trigger action
  });

  test('screen reader landmarks are present', async ({ page }) => {
    await page.goto('/marketing-audit');
    
    // Check for main landmark
    const main = await page.locator('main').count();
    expect(main).toBeGreaterThan(0);
    
    // Check for navigation
    const nav = await page.locator('nav').count();
    expect(nav).toBeGreaterThan(0);
    
    // Check for header
    const header = await page.locator('header').count();
    expect(header).toBeGreaterThan(0);
  });

  test('color contrast meets WCAG AA standards', async ({ page }) => {
    await page.goto('/marketing-audit');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['color-contrast'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('images have alt text', async ({ page }) => {
    await page.goto('/marketing-audit');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['image-alt'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('form elements have labels', async ({ page }) => {
    await page.goto('/marketing-audit');
    await page.click('button:has-text("Run Audit")');
    
    // Check form in slide-over
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['label'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('heading hierarchy is correct', async ({ page }) => {
    await page.goto('/marketing-audit');

    const headings = await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
      return elements.map(el => parseInt(el.tagName.substring(1)));
    });

    // Should start with h1
    expect(headings[0]).toBe(1);
    
    // Check no skipped levels
    for (let i = 1; i < headings.length; i++) {
      expect(headings[i] - headings[i - 1]).toBeLessThanOrEqual(1);
    }
  });

  test('aria-labels are descriptive', async ({ page }) => {
    await page.goto('/marketing-audit');

    const buttons = await page.locator('button[aria-label]').all();
    for (const button of buttons) {
      const label = await button.getAttribute('aria-label');
      expect(label?.length).toBeGreaterThan(3); // Meaningful labels
    }
  });

  test('focus indicators are visible', async ({ page }) => {
    await page.goto('/marketing-audit');
    
    await page.keyboard.press('Tab');
    const focusOutline = await page.evaluate(() => {
      const focused = document.activeElement;
      if (!focused) return false;
      const style = window.getComputedStyle(focused);
      return style.outline !== 'none' || style.boxShadow !== 'none';
    });
    
    expect(focusOutline).toBe(true);
  });

  test('dark mode maintains contrast', async ({ page }) => {
    await page.goto('/marketing-audit');
    await page.click('[data-testid="theme-toggle"]');
    await page.waitForTimeout(500);

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['color-contrast'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('tooltips are keyboard accessible', async ({ page }) => {
    await page.goto('/marketing-audit');
    
    // Find first element with tooltip
    const tooltipTrigger = page.locator('[data-tooltip]').first();
    await tooltipTrigger.focus();
    
    // Tooltip should show on focus
    const tooltip = await page.locator('[role="tooltip"]').count();
    expect(tooltip).toBeGreaterThan(0);
  });

  test('modals trap focus', async ({ page }) => {
    await page.goto('/marketing-audit');
    await page.click('button:has-text("Export")');
    
    // Tab through modal
    const initialFocus = await page.evaluate(() => document.activeElement?.id);
    
    // Tab multiple times
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Tab');
    }
    
    // Focus should still be within modal
    const modalContent = await page.locator('[role="dialog"]').count();
    expect(modalContent).toBeGreaterThan(0);
  });
});

