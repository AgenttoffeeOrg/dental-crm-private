/**
 * E2E Test: Complete User Journey
 * 
 * Tests the full user experience from login to task creation.
 */

import { test, expect } from '@playwright/test';

test.describe('Marketing Audit - Complete User Journey', () => {
  test.beforeEach(async ({ page }) => {
    // Login as test user
    await page.goto('/login');
    await page.fill('input[type="email"]', 'test@dentalcrm.com');
    await page.fill('input[type="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');
    
    // Wait for dashboard
    await page.waitForURL('/dashboard');
  });
  
  test('Complete audit workflow', async ({ page }) => {
    // 1. Navigate to Marketing Audit
    await page.click('a[href="/marketing-audit"]');
    await page.waitForURL('/marketing-audit');
    
    // 2. Verify empty state (first time user)
    const emptyState = page.locator('text=Run Your First Audit');
    if (await emptyState.isVisible()) {
      // Click to run first audit
      await emptyState.click();
    } else {
      // Click run audit button
      await page.click('button:has-text("Run New Audit")');
    }
    
    // 3. Wait for audit to complete (max 5 minutes)
    await page.waitForSelector('text=Audit Complete', { timeout: 300000 });
    
    // 4. Verify scores are displayed
    const compositeScore = page.locator('[data-testid="composite-score"]');
    await expect(compositeScore).toBeVisible();
    
    const scoreText = await compositeScore.textContent();
    const score = parseFloat(scoreText || '0');
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
    
    // 5. Verify sub-scores exist
    await expect(page.locator('text=Technical SEO')).toBeVisible();
    await expect(page.locator('text=Local Presence')).toBeVisible();
    await expect(page.locator('text=Content & Authority')).toBeVisible();
    
    // 6. Verify recommendations are shown
    const recommendations = page.locator('[data-testid="recommendation-card"]');
    const recCount = await recommendations.count();
    expect(recCount).toBeGreaterThan(0);
    
    // 7. Expand first recommendation
    await recommendations.first().click();
    
    // 8. Verify action steps are visible
    await expect(page.locator('text=How to Fix')).toBeVisible();
    
    // 9. Create task from recommendation
    await page.click('button:has-text("Create Task")');
    
    // 10. Verify task creation success
    await expect(page.locator('text=Task created successfully')).toBeVisible({ timeout: 5000 });
    
    // 11. View competitors tab
    await page.click('button:has-text("Competitors")');
    await expect(page.locator('[data-testid="competitor-card"]')).toBeVisible();
    
    // 12. Check competitor count
    const competitors = page.locator('[data-testid="competitor-card"]');
    const compCount = await competitors.count();
    expect(compCount).toBeGreaterThan(0);
  });
  
  test('Schedule automated audit', async ({ page }) => {
    // Navigate to Marketing Audit
    await page.goto('/marketing-audit');
    
    // Open schedule modal
    await page.click('button:has-text("Schedule Audits")');
    
    // Fill schedule form
    await page.selectOption('select[name="frequency"]', 'monthly');
    await page.selectOption('select[name="day"]', '1');
    await page.selectOption('select[name="hour"]', '9');
    
    // Enable email reports
    await page.check('input[name="email_report"]');
    
    // Save schedule
    await page.click('button:has-text("Create Schedule")');
    
    // Verify success
    await expect(page.locator('text=Schedule created successfully')).toBeVisible();
  });
  
  test('Export audit as PDF', async ({ page }) => {
    // Navigate to Marketing Audit
    await page.goto('/marketing-audit');
    
    // Wait for audit to load
    await page.waitForSelector('[data-testid="composite-score"]');
    
    // Open export modal
    await page.click('button:has-text("Export PDF")');
    
    // Configure export
    await page.check('input[name="include_evidence"]');
    await page.check('input[name="include_competitors"]');
    
    // Start download
    const downloadPromise = page.waitForEvent('download');
    await page.click('button:has-text("Generate PDF")');
    const download = await downloadPromise;
    
    // Verify filename
    expect(download.suggestedFilename()).toMatch(/marketing-audit.*\.pdf/);
  });
  
  test('Mobile responsive', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE
    
    // Navigate to Marketing Audit
    await page.goto('/marketing-audit');
    
    // Verify mobile dashboard loads
    await expect(page.locator('[data-testid="mobile-dashboard"]')).toBeVisible();
    
    // Verify touch targets are large enough (44px minimum)
    const buttons = page.locator('button');
    const firstButton = buttons.first();
    const box = await firstButton.boundingBox();
    
    if (box) {
      expect(box.height).toBeGreaterThanOrEqual(44);
    }
  });
  
  test('Dark mode support', async ({ page }) => {
    // Enable dark mode
    await page.emulateMedia({ colorScheme: 'dark' });
    
    // Navigate to Marketing Audit
    await page.goto('/marketing-audit');
    
    // Verify dark mode classes are applied
    const body = page.locator('body');
    await expect(body).toHaveClass(/dark/);
    
    // Verify content is visible (not white text on white bg)
    const scoreCard = page.locator('[data-testid="composite-score-card"]');
    const bgColor = await scoreCard.evaluate(el => 
      window.getComputedStyle(el).backgroundColor
    );
    
    // Should be dark background
    expect(bgColor).toMatch(/rgb\(31, 41, 55\)|rgb\(55, 65, 81\)/); // gray-800 or gray-700
  });
});

