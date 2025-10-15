/**
 * Visual Regression Tests for Marketing Audit Dashboard
 * Uses Playwright visual comparison
 */

import { test, expect } from '@playwright/test';

test.describe('Marketing Audit Visual Regression', () => {
  test.beforeEach(async ({ page }) => {
    // Login and seed test data
    await page.goto('/login');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
    
    // Navigate to Marketing Audit
    await page.goto('/marketing-audit');
  });

  test('overview page - light mode', async ({ page }) => {
    await page.waitForSelector('[data-testid="composite-score"]');
    await expect(page).toHaveScreenshot('overview-light.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('overview page - dark mode', async ({ page }) => {
    // Toggle dark mode
    await page.click('[data-testid="theme-toggle"]');
    await page.waitForTimeout(500); // Wait for transition
    
    await expect(page).toHaveScreenshot('overview-dark.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('technical seo tab', async ({ page }) => {
    await page.click('button:has-text("Technical SEO")');
    await page.waitForSelector('[data-testid="cwv-metrics"]');
    
    await expect(page).toHaveScreenshot('technical-seo-tab.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('local presence tab', async ({ page }) => {
    await page.click('button:has-text("Local Presence")');
    await page.waitForSelector('[data-testid="gbp-metrics"]');
    
    await expect(page).toHaveScreenshot('local-presence-tab.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('competitors tab', async ({ page }) => {
    await page.click('button:has-text("Competitors")');
    await page.waitForSelector('[data-testid="competitor-card"]');
    
    await expect(page).toHaveScreenshot('competitors-tab.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('recommendations panel - expanded', async ({ page }) => {
    await page.locator('[data-testid="recommendation-card"]').first().click();
    await page.waitForSelector('[data-testid="evidence-card"]');
    
    await expect(page).toHaveScreenshot('recommendation-expanded.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('empty state', async ({ page, context }) => {
    // Clear all audits to show empty state
    await context.clearCookies();
    await page.goto('/marketing-audit');
    await page.waitForSelector('[data-testid="empty-state"]');
    
    await expect(page).toHaveScreenshot('empty-state.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('loading state', async ({ page }) => {
    // Intercept API to delay response
    await page.route('**/api/marketing-audit/run', route => {
      setTimeout(() => route.continue(), 5000);
    });
    
    await page.click('button:has-text("Run Audit")');
    await page.waitForSelector('[data-testid="loading-state"]');
    
    await expect(page).toHaveScreenshot('loading-state.png', {
      animations: 'disabled',
    });
  });

  test('mobile viewport', async ({ page, context }) => {
    await context.setViewportSize({ width: 375, height: 667 });
    await page.goto('/marketing-audit');
    await page.waitForSelector('[data-testid="composite-score"]');
    
    await expect(page).toHaveScreenshot('mobile-overview.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('tablet viewport', async ({ page, context }) => {
    await context.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/marketing-audit');
    await page.waitForSelector('[data-testid="composite-score"]');
    
    await expect(page).toHaveScreenshot('tablet-overview.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('export modal', async ({ page }) => {
    await page.click('button:has-text("Export")');
    await page.waitForSelector('[data-testid="export-modal"]');
    
    await expect(page).toHaveScreenshot('export-modal.png', {
      animations: 'disabled',
    });
  });

  test('alert banner - critical', async ({ page }) => {
    // Mock critical alert
    await page.route('**/api/marketing-audit/alerts', route => {
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          alerts: [{
            id: '1',
            severity: 'critical',
            title: 'Core Web Vitals Degraded',
            message: 'LCP increased from 2.1s to 4.5s',
          }],
        }),
      });
    });
    
    await page.goto('/marketing-audit');
    await page.waitForSelector('[data-testid="alert-banner"]');
    
    await expect(page).toHaveScreenshot('alert-critical.png', {
      animations: 'disabled',
    });
  });
});

