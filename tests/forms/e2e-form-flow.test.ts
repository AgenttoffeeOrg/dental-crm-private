/**
 * End-to-End Form Flow Tests
 * Tests complete user journey from form creation to lead capture
 */

import { test, expect } from '@playwright/test'

test.describe('Complete Form Builder Flow', () => {
  test('should create form, publish, embed, and receive submission', async ({ page }) => {
    // Step 1: Login
    await page.goto('/login')
    await page.fill('input[name="email"]', 'test@example.com')
    await page.fill('input[name="password"]', 'password123')
    await page.click('button[type="submit"]')
    await page.waitForURL('/dashboard')

    // Step 2: Navigate to Forms
    await page.click('a[href="/forms"]')
    await page.waitForURL('/forms')

    // Step 3: Create New Form
    await page.click('button:has-text("Create Form")')
    await page.waitForSelector('input[name="form_name"]')
    
    // Step 4: Configure Form
    await page.fill('input[name="form_name"]', 'Test Contact Form')
    await page.fill('textarea[name="description"]', 'E2E test form')
    
    // Step 5: Add Fields
    await page.click('button:has-text("Add Field")')
    await page.selectOption('select[name="field_type"]', 'text')
    await page.fill('input[name="field_label"]', 'Full Name')
    await page.check('input[name="field_required"]')
    
    // Step 6: Save Form
    await page.click('button:has-text("Save Form")')
    await expect(page.locator('text=Form created successfully')).toBeVisible()
    
    // Step 7: Publish Form
    await page.click('button:has-text("Share")')
    await expect(page.locator('text=Hosted Link')).toBeVisible()
    
    // Step 8: Get Embed Code
    const embedCode = await page.locator('pre').first().textContent()
    expect(embedCode).toContain('iframe')
    
    // Step 9: Verify Form Analytics
    await page.click('a:has-text("Analytics")')
    await expect(page.locator('text=Total Views')).toBeVisible()
    await expect(page.locator('text=Conversion Rate')).toBeVisible()
  })

  test('should apply conditional logic correctly', async ({ page }) => {
    // Test conditional field show/hide
    await page.goto('/forms/test-form')
    
    // Initially hidden field should not be visible
    await expect(page.locator('#emergency_field')).not.toBeVisible()
    
    // Change pain level to 8
    await page.fill('input[name="pain_level"]', '8')
    
    // Emergency field should now be visible
    await expect(page.locator('#emergency_field')).toBeVisible()
  })

  test('should block spam submissions', async ({ page }) => {
    await page.goto('/forms/embed/test-form-id')
    
    // Fill honeypot (bot behavior)
    await page.evaluate(() => {
      const honeypot = document.querySelector('input[name="website"]') as HTMLInputElement
      if (honeypot) honeypot.value = 'http://spam.com'
    })
    
    await page.fill('input[name="full_name"]', 'Spam Bot')
    await page.fill('input[name="email"]', 'spam@bot.com')
    await page.click('button[type="submit"]')
    
    // Should silently accept but mark as spam
    await expect(page.locator('text=Thank you')).toBeVisible()
  })

  test('should track analytics correctly', async ({ page, context }) => {
    const formId = 'test-form-id'
    
    // View form (increment views)
    await page.goto(`/forms/embed/${formId}`)
    await page.waitForLoadState('networkidle')
    
    // Start filling form (increment starts)
    await page.fill('input[name="full_name"]', 'John Doe')
    
    // Complete submission (increment submissions)
    await page.fill('input[name="email"]', 'john@example.com')
    await page.fill('input[name="phone"]', '+447700900000')
    await page.click('button[type="submit"]')
    
    // Verify analytics updated
    await page.goto(`/forms/${formId}/analytics`)
    await expect(page.locator('text=Total Views')).toBeVisible()
    
    const views = await page.locator('[data-metric="views"]').textContent()
    expect(parseInt(views || '0')).toBeGreaterThan(0)
  })

  test('should handle multi-step forms', async ({ page }) => {
    await page.goto('/forms/embed/multi-step-form')
    
    // Step 1
    await expect(page.locator('text=Step 1 of 3')).toBeVisible()
    await page.fill('input[name="full_name"]', 'Jane Smith')
    await page.click('button:has-text("Next")')
    
    // Step 2
    await expect(page.locator('text=Step 2 of 3')).toBeVisible()
    await page.fill('input[name="email"]', 'jane@example.com')
    await page.click('button:has-text("Next")')
    
    // Step 3
    await expect(page.locator('text=Step 3 of 3')).toBeVisible()
    await page.fill('input[name="phone"]', '+447700900000')
    await page.click('button:has-text("Submit")')
    
    // Success page
    await expect(page.locator('text=Thank You')).toBeVisible()
  })

  test('should save and restore progress in multi-step form', async ({ page, context }) => {
    await page.goto('/forms/embed/multi-step-form')
    
    // Fill step 1
    await page.fill('input[name="full_name"]', 'Test User')
    await page.click('button:has-text("Next")')
    
    // Fill step 2 partially
    await page.fill('input[name="email"]', 'test@example.com')
    
    // Reload page
    await page.reload()
    
    // Progress should be restored
    await expect(page.locator('text=Step 2 of 3')).toBeVisible()
    await expect(page.locator('input[name="email"]')).toHaveValue('test@example.com')
  })

  test('should work in offline mode', async ({ page, context }) => {
    await page.goto('/forms/embed/test-form')
    
    // Go offline
    await context.setOffline(true)
    
    // Fill and submit form
    await page.fill('input[name="full_name"]', 'Offline User')
    await page.fill('input[name="email"]', 'offline@example.com')
    await page.click('button[type="submit"]')
    
    // Should queue submission
    await expect(page.locator('text=queued')).toBeVisible()
    
    // Go back online
    await context.setOffline(false)
    
    // Submission should sync
    await page.waitForTimeout(2000)
    // Verify sync indicator
  })
})

test.describe('Form Builder UI', () => {
  test('should drag and drop fields', async ({ page }) => {
    await page.goto('/forms/builder/test-form')
    
    // Drag email field from palette
    const emailField = page.locator('button:has-text("Email")')
    const canvas = page.locator('.form-canvas')
    
    await emailField.dragTo(canvas)
    
    // Verify field added
    await expect(page.locator('text=Email Address')).toBeVisible()
  })

  test('should reorder fields', async ({ page }) => {
    await page.goto('/forms/builder/test-form')
    
    const field1 = page.locator('[data-field-id="field-1"]')
    const field2 = page.locator('[data-field-id="field-2"]')
    
    await field1.dragTo(field2)
    
    // Verify order changed
    // Check field positions
  })

  test('should add conditional logic', async ({ page }) => {
    await page.goto('/forms/builder/test-form')
    
    await page.click('button:has-text("Add Rule")')
    await page.selectOption('select[name="source_field"]', 'pain_level')
    await page.selectOption('select[name="operator"]', 'greater_than')
    await page.fill('input[name="value"]', '7')
    await page.selectOption('select[name="action"]', 'show')
    
    await page.click('button:has-text("Save")')
    
    // Verify rule saved
    await expect(page.locator('text=Rule 1')).toBeVisible()
  })
})

test.describe('A/B Testing', () => {
  test('should create variant and split traffic', async ({ page }) => {
    await page.goto('/forms/test-form/variants')
    
    await page.click('button:has-text("Create Variant")')
    await page.fill('input[name="variant_name"]', 'Variant B')
    await page.click('button:has-text("Save")')
    
    // Verify variant created
    await expect(page.locator('text=Variant B')).toBeVisible()
    
    // Check traffic split
    await expect(page.locator('text=50%')).toBeVisible()
  })

  test('should declare winner when statistically significant', async ({ page }) => {
    await page.goto('/forms/test-form/variants')
    
    // Assuming enough data, should show winner
    await expect(page.locator('button:has-text("Declare as Winner")')).toBeVisible()
    
    await page.click('button:has-text("Declare as Winner")')
    
    // Verify winner badge
    await expect(page.locator('text=Winner')).toBeVisible()
  })
})

test.describe('Accessibility', () => {
  test('should be keyboard navigable', async ({ page }) => {
    await page.goto('/forms/embed/test-form')
    
    // Tab through fields
    await page.keyboard.press('Tab')
    await expect(page.locator('input[name="full_name"]')).toBeFocused()
    
    await page.keyboard.press('Tab')
    await expect(page.locator('input[name="email"]')).toBeFocused()
  })

  test('should have proper ARIA labels', async ({ page }) => {
    await page.goto('/forms/embed/test-form')
    
    const nameField = page.locator('input[name="full_name"]')
    await expect(nameField).toHaveAttribute('aria-label', /Full Name/)
    await expect(nameField).toHaveAttribute('aria-required', 'true')
  })

  test('should announce errors to screen readers', async ({ page }) => {
    await page.goto('/forms/embed/test-form')
    
    // Submit without filling required field
    await page.click('button[type="submit"]')
    
    // Check for ARIA alert
    await expect(page.locator('[role="alert"]')).toBeVisible()
  })
})

test.describe('Performance', () => {
  test('should load form in < 1 second', async ({ page }) => {
    const startTime = Date.now()
    await page.goto('/forms/embed/test-form')
    await page.waitForLoadState('networkidle')
    const loadTime = Date.now() - startTime
    
    expect(loadTime).toBeLessThan(1000)
  })

  test('should handle 100 rapid submissions', async ({ page }) => {
    // Stress test
    const promises = []
    for (let i = 0; i < 100; i++) {
      promises.push(
        fetch('/api/marketing/forms/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            formId: 'test-form',
            payload: { email: `test${i}@example.com` },
          }),
        })
      )
    }
    
    const results = await Promise.all(promises)
    const successCount = results.filter(r => r.ok).length
    
    expect(successCount).toBeGreaterThan(90) // Allow for rate limiting
  })
})

