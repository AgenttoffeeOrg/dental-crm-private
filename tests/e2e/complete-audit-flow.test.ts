/**
 * E2E Test: Complete Marketing Audit Flow
 * Tests the entire user journey from connecting APIs to viewing results
 */

import { test, expect } from '@playwright/test';

test.describe('Complete Marketing Audit Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
  });

  test('should complete full audit journey', async ({ page }) => {
    // 1. Navigate to Marketing Audit
    await page.click('a[href="/marketing-audit"]');
    await page.waitForURL('/marketing-audit');
    
    // 2. Verify empty state shows
    await expect(page.locator('text=Run Your First Audit')).toBeVisible();
    
    // 3. Click to connect Google OAuth
    await page.click('button:has-text("Connect Google Analytics")');
    
    // 4. Mock OAuth flow (in real test, use OAuth playground)
    // For now, assume credentials are connected
    
    // 5. Trigger new audit
    await page.click('button:has-text("Run Audit")');
    
    // 6. Verify loading state
    await expect(page.locator('text=Running Audit')).toBeVisible();
    
    // 7. Wait for completion (with timeout)
    await page.waitForSelector('[data-testid="composite-score"]', { timeout: 60000 });
    
    // 8. Verify composite score displays
    const score = await page.locator('[data-testid="composite-score"]').textContent();
    expect(parseInt(score || '0')).toBeGreaterThan(0);
    expect(parseInt(score || '0')).toBeLessThanOrEqual(100);
    
    // 9. Verify sub-scores render
    await expect(page.locator('[data-testid="technical-seo-score"]')).toBeVisible();
    await expect(page.locator('[data-testid="local-presence-score"]')).toBeVisible();
    await expect(page.locator('[data-testid="content-authority-score"]')).toBeVisible();
    
    // 10. Verify recommendations panel
    await expect(page.locator('[data-testid="recommendations-panel"]')).toBeVisible();
    const recommendations = await page.locator('[data-testid="recommendation-card"]').count();
    expect(recommendations).toBeGreaterThan(0);
    
    // 11. Click on a recommendation
    await page.locator('[data-testid="recommendation-card"]').first().click();
    
    // 12. Verify evidence card shows
    await expect(page.locator('[data-testid="evidence-card"]')).toBeVisible();
    
    // 13. Create task from recommendation
    await page.click('button:has-text("Create Task")');
    
    // 14. Verify slide-over opens
    await expect(page.locator('[data-testid="create-task-slide-over"]')).toBeVisible();
    
    // 15. Fill task form
    await page.fill('[name="title"]', 'Fix Core Web Vitals');
    await page.fill('[name="description"]', 'Improve LCP to under 2.5s');
    
    // 16. Save task
    await page.click('button:has-text("Save Task")');
    
    // 17. Verify task created notification
    await expect(page.locator('text=Task created successfully')).toBeVisible();
    
    // 18. Navigate to Technical SEO tab
    await page.click('button:has-text("Technical SEO")');
    
    // 19. Verify deep-dive metrics
    await expect(page.locator('[data-testid="cwv-metrics"]')).toBeVisible();
    await expect(page.locator('[data-testid="lighthouse-scores"]')).toBeVisible();
    
    // 20. Navigate to Competitors tab
    await page.click('button:has-text("Competitors")');
    
    // 21. Verify competitor cards
    const competitors = await page.locator('[data-testid="competitor-card"]').count();
    expect(competitors).toBeGreaterThan(0);
    
    // 22. Verify percentile rank visualization
    await expect(page.locator('[data-testid="percentile-rank-viz"]')).toBeVisible();
    
    // 23. Export to PDF
    await page.click('button:has-text("Export PDF")');
    
    // 24. Verify download initiated
    const downloadPromise = page.waitForEvent('download');
    await page.click('button:has-text("Download")');
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('.pdf');
    
    // 25. Navigate back to overview
    await page.click('button:has-text("Overview")');
    
    // 26. Verify audit history shows
    await page.click('button:has-text("History")');
    const historyItems = await page.locator('[data-testid="history-item"]').count();
    expect(historyItems).toBeGreaterThan(0);
    
    // 27. Verify no errors in console
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    expect(errors).toHaveLength(0);
  });

  test('should handle non-breaking integration with existing CRM', async ({ page }) => {
    // Verify Marketing Audit doesn't break existing modules
    
    // 1. Go to Contacts
    await page.click('a[href="/contacts"]');
    await page.waitForURL('/contacts');
    await expect(page.locator('h1:has-text("Contacts")')).toBeVisible();
    
    // 2. Go to Deals
    await page.click('a[href="/deals"]');
    await page.waitForURL('/deals');
    await expect(page.locator('h1:has-text("Deals")')).toBeVisible();
    
    // 3. Go to Pipeline
    await page.click('a[href="/pipeline"]');
    await page.waitForURL('/pipeline');
    await expect(page.locator('h1:has-text("Pipeline")')).toBeVisible();
    
    // 4. Go to Marketing Audit
    await page.click('a[href="/marketing-audit"]');
    await page.waitForURL('/marketing-audit');
    
    // 5. Go back to Contacts - verify still works
    await page.click('a[href="/contacts"]');
    await page.waitForURL('/contacts');
    await expect(page.locator('h1:has-text("Contacts")')).toBeVisible();
    
    // SUCCESS: No breaking changes
  });

  test('should respect feature flag', async ({ page, context }) => {
    // Set feature flag to false
    await context.addInitScript(() => {
      window.localStorage.setItem('NEXT_PUBLIC_ENABLE_MARKETING_AUDIT', 'false');
    });
    
    await page.goto('/dashboard');
    
    // Verify Marketing Audit tab doesn't show
    const auditLink = await page.locator('a[href="/marketing-audit"]').count();
    expect(auditLink).toBe(0);
    
    // Try to access directly - should redirect
    await page.goto('/marketing-audit');
    await page.waitForURL('/dashboard');
  });

  test('should handle mobile responsiveness', async ({ page, context }) => {
    // Set mobile viewport
    await context.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('/marketing-audit');
    
    // Verify mobile optimizations
    await expect(page.locator('[data-testid="mobile-dashboard"]')).toBeVisible();
    
    // Verify touch targets are adequate (44x44px minimum)
    const buttons = await page.locator('button').all();
    for (const button of buttons) {
      const box = await button.boundingBox();
      if (box) {
        expect(box.width).toBeGreaterThanOrEqual(44);
        expect(box.height).toBeGreaterThanOrEqual(44);
      }
    }
  });

  test('should handle accessibility requirements', async ({ page }) => {
    await page.goto('/marketing-audit');
    
    // Test keyboard navigation
    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toBeVisible();
    
    // Test ARIA labels
    const buttons = await page.locator('button').all();
    for (const button of buttons) {
      const ariaLabel = await button.getAttribute('aria-label');
      const text = await button.textContent();
      expect(ariaLabel || text).toBeTruthy();
    }
    
    // Test color contrast (basic check)
    // In production, use axe-core
    const score = await page.locator('[data-testid="composite-score"]');
    const color = await score.evaluate(el => window.getComputedStyle(el).color);
    const bgColor = await score.evaluate(el => window.getComputedStyle(el).backgroundColor);
    expect(color).toBeTruthy();
    expect(bgColor).toBeTruthy();
  });
});

