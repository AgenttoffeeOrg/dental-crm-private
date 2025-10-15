/**
 * Non-Regression Tests
 * 
 * Verify that Marketing Audit module doesn't break existing CRM functionality.
 * Critical: Existing features must continue working perfectly.
 */

import { test, expect } from '@playwright/test';

test.describe('Non-Regression - Existing CRM Features', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('input[type="email"]', 'test@dentalcrm.com');
    await page.fill('input[type="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
  });
  
  test('Dashboard still loads correctly', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Verify dashboard loads
    await expect(page).toHaveTitle(/Dashboard/i);
    
    // Verify no JavaScript errors
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    
    await page.waitForTimeout(2000);
    expect(errors).toHaveLength(0);
  });
  
  test('Contacts module still works', async ({ page }) => {
    await page.goto('/contacts');
    
    // Verify contacts page loads
    await expect(page.locator('h1')).toContainText(/contacts/i);
    
    // Verify can create contact
    const createButton = page.locator('button:has-text("New Contact")');
    if (await createButton.isVisible()) {
      await createButton.click();
      await expect(page.locator('text=Create Contact')).toBeVisible();
    }
  });
  
  test('Deals module still works', async ({ page }) => {
    await page.goto('/deals');
    
    // Verify deals page loads
    await expect(page.locator('h1')).toContainText(/deals/i);
    
    // Verify pipeline view works
    const pipelineView = page.locator('[data-testid="pipeline-view"]');
    if (await pipelineView.count() > 0) {
      await expect(pipelineView).toBeVisible();
    }
  });
  
  test('Tasks module still works', async ({ page }) => {
    await page.goto('/tasks');
    
    // Verify tasks page loads
    await expect(page.locator('h1')).toContainText(/tasks/i);
  });
  
  test('Campaign manager still works', async ({ page }) => {
    await page.goto('/campaigns');
    
    // Verify campaigns page loads
    await expect(page).toHaveURL(/\/campaigns/);
  });
  
  test('Settings still works', async ({ page }) => {
    await page.goto('/settings');
    
    // Verify settings page loads
    await expect(page).toHaveURL(/\/settings/);
  });
  
  test('Navigation sidebar includes Marketing Audit', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Verify Marketing Audit appears in sidebar
    const auditLink = page.locator('a[href="/marketing-audit"]');
    await expect(auditLink).toBeVisible();
    
    // Verify has badge
    await expect(auditLink.locator('text=New')).toBeVisible();
  });
  
  test('Marketing Audit can be accessed without breaking navigation', async ({ page }) => {
    // Go to Marketing Audit
    await page.goto('/marketing-audit');
    await expect(page).toHaveURL('/marketing-audit');
    
    // Go back to dashboard
    await page.goto('/dashboard');
    await expect(page).toHaveURL('/dashboard');
    
    // Verify navigation still works
    await page.click('a[href="/contacts"]');
    await expect(page).toHaveURL('/contacts');
  });
  
  test('Task creation from recommendation integrates with existing tasks', async ({ page }) => {
    await page.goto('/marketing-audit');
    
    // If recommendations exist, try creating task
    const createTaskBtn = page.locator('button:has-text("Create Task")').first();
    if (await createTaskBtn.count() > 0) {
      await createTaskBtn.click();
      
      // Verify success message
      await expect(page.locator('text=Task created')).toBeVisible({ timeout: 5000 });
      
      // Verify task appears in tasks list
      await page.goto('/tasks');
      // Should have at least one task
      const tasks = page.locator('[data-testid="task-item"]');
      expect(await tasks.count()).toBeGreaterThan(0);
    }
  });
  
  test('No console errors on any page', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    
    const pages = [
      '/dashboard',
      '/contacts',
      '/deals',
      '/tasks',
      '/marketing-audit',
      '/settings',
    ];
    
    for (const url of pages) {
      await page.goto(url);
      await page.waitForTimeout(1000);
    }
    
    // Filter out expected warnings
    const criticalErrors = errors.filter(e => 
      !e.includes('Warning') && 
      !e.includes('DevTools')
    );
    
    expect(criticalErrors).toHaveLength(0);
  });
});

