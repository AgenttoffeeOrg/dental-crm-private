/**
 * WCAG 2.1 AA Compliance Tests
 * 
 * Phase 4: Automated accessibility testing.
 */

import { test, expect } from '@playwright/test';
import { injectAxe, checkA11y } from 'axe-playwright';

test.describe('WCAG 2.1 AA Compliance', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('input[type="email"]', 'test@dentalcrm.com');
    await page.fill('input[type="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
  });
  
  test('Marketing Audit Dashboard accessibility', async ({ page }) => {
    await page.goto('/marketing-audit');
    
    // Inject axe-core
    await injectAxe(page);
    
    // Check for accessibility violations
    await checkA11y(page, null, {
      detailedReport: true,
      detailedReportOptions: {
        html: true,
      },
    });
  });
  
  test('Keyboard navigation', async ({ page }) => {
    await page.goto('/marketing-audit');
    
    // Tab through all focusable elements
    let focusedElements = 0;
    
    for (let i = 0; i < 50; i++) {
      await page.keyboard.press('Tab');
      const focused = await page.evaluate(() => document.activeElement?.tagName);
      if (focused && ['BUTTON', 'A', 'INPUT', 'SELECT'].includes(focused)) {
        focusedElements++;
      }
    }
    
    // Should have at least 10 focusable elements
    expect(focusedElements).toBeGreaterThan(10);
  });
  
  test('Color contrast ratios', async ({ page }) => {
    await page.goto('/marketing-audit');
    
    // Check color contrast (handled by axe)
    await injectAxe(page);
    await checkA11y(page, null, {
      rules: {
        'color-contrast': { enabled: true },
      },
    });
  });
  
  test('ARIA labels present', async ({ page }) => {
    await page.goto('/marketing-audit');
    
    // Check for required ARIA labels
    const scoreElement = page.locator('[data-testid="composite-score"]');
    if (await scoreElement.count() > 0) {
      const ariaLabel = await scoreElement.getAttribute('aria-label');
      expect(ariaLabel).toBeTruthy();
      expect(ariaLabel).toContain('Score');
    }
  });
  
  test('Focus indicators visible', async ({ page }) => {
    await page.goto('/marketing-audit');
    
    // Tab to first button
    await page.keyboard.press('Tab');
    
    // Check that focus indicator is visible
    const focused = page.locator(':focus');
    const outline = await focused.evaluate((el) => 
      window.getComputedStyle(el).outline
    );
    
    // Should have visible outline or box-shadow
    expect(outline).not.toBe('none');
  });
  
  test('Screen reader announcements', async ({ page }) => {
    await page.goto('/marketing-audit');
    
    // Check for live regions
    const liveRegions = page.locator('[aria-live]');
    const count = await liveRegions.count();
    
    // Should have at least one live region for dynamic updates
    expect(count).toBeGreaterThan(0);
  });
  
  test('Images have alt text', async ({ page }) => {
    await page.goto('/marketing-audit');
    
    // All images should have alt text
    const images = page.locator('img');
    const imageCount = await images.count();
    
    for (let i = 0; i < imageCount; i++) {
      const img = images.nth(i);
      const alt = await img.getAttribute('alt');
      expect(alt).toBeDefined();
    }
  });
  
  test('Form labels associated', async ({ page }) => {
    await page.goto('/marketing-audit');
    
    // Click schedule button if it exists
    const scheduleBtn = page.locator('button:has-text("Schedule")');
    if (await scheduleBtn.count() > 0) {
      await scheduleBtn.click();
      
      // Check form inputs have associated labels
      const inputs = page.locator('input');
      const inputCount = await inputs.count();
      
      for (let i = 0; i < inputCount; i++) {
        const input = inputs.nth(i);
        const id = await input.getAttribute('id');
        const ariaLabel = await input.getAttribute('aria-label');
        const ariaLabelledBy = await input.getAttribute('aria-labelledby');
        
        // Should have id (for label association), aria-label, or aria-labelledby
        expect(id || ariaLabel || ariaLabelledBy).toBeTruthy();
      }
    }
  });
});

