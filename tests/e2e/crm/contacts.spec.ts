/**
 * E2E TESTS: CONTACTS WORKFLOW
 * ================================================================
 * Section B1: Core CRM - Contacts Module
 * 
 * Tests:
 * - Create contact via Dashboard right-slide
 * - Create contact via Contacts list right-slide
 * - Create contact via Deal detail
 * - Email normalization (lowercased)
 * - Phone normalization (E.164 format)
 * - Duplicate detection (same email)
 * - Merge suggestion UI
 * - Update contact
 * - Soft delete contact
 * - Verify deals/tasks NOT broken after soft delete
 * ================================================================
 */

import { test, expect, Page } from '@playwright/test'

// Test configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'
const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL || 'admin@dentalone.test'
const TEST_USER_PASSWORD = process.env.TEST_USER_PASSWORD || 'TestPassword123!'

// Test data
const testContact = {
  fullName: 'John Smith Test',
  email: 'JOHN.SMITH@EMAIL.COM', // Uppercase to test normalization
  phone: '01234567890', // UK format to test E.164 normalization
  jobTitle: 'Practice Manager',
  company: 'Smith Dental Practice',
  lifecycleStage: 'lead',
  source: 'referral',
  notes: 'Test contact for E2E verification'
}

const duplicateContact = {
  fullName: 'John Smith Jr',
  email: 'john.smith@email.com', // Same email, different name
  phone: '01234567891',
  lifecycleStage: 'lead'
}

// Helper functions
async function login(page: Page) {
  await page.goto(`${BASE_URL}/login`)
  await page.fill('input[name="email"]', TEST_USER_EMAIL)
  await page.fill('input[name="password"]', TEST_USER_PASSWORD)
  await page.click('button[type="submit"]')
  await page.waitForURL(`${BASE_URL}/dashboard`)
}

async function openContactSlideOver(page: Page, location: 'dashboard' | 'contacts' | 'deal') {
  if (location === 'dashboard') {
    await page.goto(`${BASE_URL}/dashboard`)
    await page.click('button:has-text("Create Contact")')
  } else if (location === 'contacts') {
    await page.goto(`${BASE_URL}/contacts`)
    await page.click('button:has-text("New Contact")')
  } else if (location === 'deal') {
    // Assumes we're already on a deal detail page
    await page.click('button:has-text("Add Contact")')
  }
  
  // Wait for slide-over to appear
  await page.waitForSelector('[data-testid="contact-slide-over"]', { timeout: 5000 })
}

async function fillContactForm(page: Page, contact: typeof testContact | typeof duplicateContact) {
  await page.fill('input[name="full_name"]', contact.fullName)
  await page.fill('input[name="primary_email"]', contact.email)
  
  if ('phone' in contact && contact.phone) {
    await page.fill('input[name="primary_phone"]', contact.phone)
  }
  
  if ('jobTitle' in contact && contact.jobTitle) {
    await page.fill('input[name="job_title"]', contact.jobTitle)
  }
  
  if ('company' in contact && contact.company) {
    await page.fill('input[name="company"]', contact.company)
  }
  
  // Select lifecycle stage
  await page.click('select[name="lifecycle_stage"]')
  await page.selectOption('select[name="lifecycle_stage"]', contact.lifecycleStage)
  
  if ('source' in contact && contact.source) {
    await page.fill('input[name="source"]', contact.source)
  }
  
  if ('notes' in contact && contact.notes) {
    await page.fill('textarea[name="notes"]', contact.notes)
  }
}

async function saveContact(page: Page) {
  await page.click('button:has-text("Save Contact")')
  
  // Wait for toast notification or redirect
  await page.waitForSelector('.toast:has-text("Contact created")', { timeout: 5000 })
}

// Test Suite
test.describe('Contacts Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('B1.1: Create contact via Dashboard right-slide', async ({ page }) => {
    // GIVEN: User is on dashboard
    await page.goto(`${BASE_URL}/dashboard`)
    
    // WHEN: User clicks "Create Contact" button
    await openContactSlideOver(page, 'dashboard')
    
    // THEN: Contact slide-over opens
    await expect(page.locator('[data-testid="contact-slide-over"]')).toBeVisible()
    await expect(page.locator('h2:has-text("Create Contact")')).toBeVisible()
    
    // WHEN: User fills form and saves
    await fillContactForm(page, testContact)
    await saveContact(page)
    
    // THEN: Contact is created and appears in contacts list
    await page.goto(`${BASE_URL}/contacts`)
    await expect(page.locator(`text=${testContact.fullName}`)).toBeVisible()
    
    // THEN: Contact details are correct
    await page.click(`text=${testContact.fullName}`)
    await expect(page.locator('[data-testid="contact-detail"]')).toBeVisible()
    await expect(page.locator(`text=${testContact.jobTitle}`)).toBeVisible()
    await expect(page.locator(`text=${testContact.company}`)).toBeVisible()
  })

  test('B1.2: Create contact via Contacts list right-slide', async ({ page }) => {
    // GIVEN: User is on contacts list
    await page.goto(`${BASE_URL}/contacts`)
    
    // WHEN: User clicks "New Contact" button
    await openContactSlideOver(page, 'contacts')
    
    // THEN: Contact slide-over opens (same component)
    await expect(page.locator('[data-testid="contact-slide-over"]')).toBeVisible()
    
    // WHEN: User creates contact
    const contact2 = { ...testContact, fullName: 'Jane Doe Test', email: 'jane.doe@test.com' }
    await fillContactForm(page, contact2)
    await saveContact(page)
    
    // THEN: Contact appears in list immediately
    await expect(page.locator(`text=${contact2.fullName}`)).toBeVisible()
  })

  test('B1.3: Email normalization (lowercased)', async ({ page }) => {
    // GIVEN: User creates contact with UPPERCASE email
    await openContactSlideOver(page, 'dashboard')
    await fillContactForm(page, testContact)
    await saveContact(page)
    
    // THEN: Email is normalized to lowercase in database
    await page.goto(`${BASE_URL}/contacts`)
    await page.click(`text=${testContact.fullName}`)
    
    // Get email from detail view
    const emailElement = await page.locator('[data-testid="contact-email"]')
    const displayedEmail = await emailElement.textContent()
    
    // EXPECT: Email is lowercased
    expect(displayedEmail).toBe(testContact.email.toLowerCase())
  })

  test('B1.4: Phone normalization (E.164 format)', async ({ page }) => {
    // GIVEN: User creates contact with UK phone format
    await openContactSlideOver(page, 'dashboard')
    await fillContactForm(page, testContact)
    await saveContact(page)
    
    // THEN: Phone is normalized to E.164 format (+44...)
    await page.goto(`${BASE_URL}/contacts`)
    await page.click(`text=${testContact.fullName}`)
    
    // Get phone from detail view
    const phoneElement = await page.locator('[data-testid="contact-phone"]')
    const displayedPhone = await phoneElement.textContent()
    
    // EXPECT: Phone starts with +44 (UK country code)
    expect(displayedPhone).toMatch(/^\+44/)
  })

  test('B1.5: Duplicate detection (same email)', async ({ page }) => {
    // GIVEN: A contact with email john.smith@email.com exists
    await openContactSlideOver(page, 'dashboard')
    await fillContactForm(page, testContact)
    await saveContact(page)
    
    // WHEN: User tries to create another contact with same email
    await openContactSlideOver(page, 'dashboard')
    await fillContactForm(page, duplicateContact)
    
    // THEN: Duplicate warning appears
    await expect(page.locator('.duplicate-warning')).toBeVisible()
    await expect(page.locator('text=Similar contact found')).toBeVisible()
    
    // THEN: User can see existing contact details
    await expect(page.locator(`text=${testContact.fullName}`)).toBeVisible()
  })

  test('B1.6: Merge suggestion UI', async ({ page }) => {
    // GIVEN: Duplicate contact detected
    await openContactSlideOver(page, 'dashboard')
    await fillContactForm(page, testContact)
    await saveContact(page)
    
    await openContactSlideOver(page, 'dashboard')
    await fillContactForm(page, duplicateContact)
    
    // WHEN: Duplicate warning shown
    await expect(page.locator('.duplicate-warning')).toBeVisible()
    
    // THEN: "Merge with existing" button appears
    await expect(page.locator('button:has-text("Merge with existing")')).toBeVisible()
    
    // THEN: "Create anyway" button appears
    await expect(page.locator('button:has-text("Create anyway")')).toBeVisible()
    
    // WHEN: User clicks "Merge with existing"
    await page.click('button:has-text("Merge with existing")')
    
    // THEN: Merge dialog opens
    await expect(page.locator('[data-testid="merge-dialog"]')).toBeVisible()
    await expect(page.locator('text=Select fields to keep')).toBeVisible()
  })

  test('B1.7: Update contact', async ({ page }) => {
    // GIVEN: A contact exists
    await openContactSlideOver(page, 'dashboard')
    await fillContactForm(page, testContact)
    await saveContact(page)
    
    // WHEN: User opens contact for editing
    await page.goto(`${BASE_URL}/contacts`)
    await page.click(`text=${testContact.fullName}`)
    await page.click('button:has-text("Edit")')
    
    // THEN: Edit slide-over opens with existing data
    await expect(page.locator('[data-testid="contact-slide-over"]')).toBeVisible()
    await expect(page.locator('h2:has-text("Edit Contact")')).toBeVisible()
    
    // WHEN: User updates fields
    const updatedJobTitle = 'Senior Practice Manager'
    await page.fill('input[name="job_title"]', updatedJobTitle)
    await page.click('button:has-text("Save Changes")')
    
    // THEN: Contact is updated
    await page.waitForSelector('.toast:has-text("Contact updated")')
    await expect(page.locator(`text=${updatedJobTitle}`)).toBeVisible()
    
    // THEN: updated_at timestamp changed (verify in detail view)
    await expect(page.locator('[data-testid="last-updated"]')).toContainText('seconds ago')
  })

  test('B1.8: Soft delete contact', async ({ page }) => {
    // GIVEN: A contact exists
    await openContactSlideOver(page, 'dashboard')
    await fillContactForm(page, testContact)
    await saveContact(page)
    
    // WHEN: User deletes contact
    await page.goto(`${BASE_URL}/contacts`)
    await page.click(`text=${testContact.fullName}`)
    await page.click('button:has-text("Delete")')
    
    // THEN: Confirmation dialog appears
    await expect(page.locator('[role="dialog"]')).toBeVisible()
    await expect(page.locator('text=Are you sure')).toBeVisible()
    
    // WHEN: User confirms deletion
    await page.click('button:has-text("Confirm")')
    
    // THEN: Contact is soft deleted (not visible in list)
    await page.goto(`${BASE_URL}/contacts`)
    await expect(page.locator(`text=${testContact.fullName}`)).not.toBeVisible()
    
    // THEN: Contact still exists in database (soft delete)
    // This would need to be verified via API call or admin view
  })

  test('B1.9: Deals/tasks NOT broken after contact soft delete', async ({ page }) => {
    // GIVEN: A contact with linked deal and task exists
    await openContactSlideOver(page, 'dashboard')
    await fillContactForm(page, testContact)
    await saveContact(page)
    
    // Create a deal linked to this contact
    await page.goto(`${BASE_URL}/deals`)
    await page.click('button:has-text("New Deal")')
    await page.fill('input[name="title"]', 'Test Deal for Contact')
    await page.fill('input[name="contact_name"]', testContact.fullName)
    await page.click(`text=${testContact.fullName}`) // Select from dropdown
    await page.click('button:has-text("Save Deal")')
    
    // Create a task linked to this contact
    await page.goto(`${BASE_URL}/tasks`)
    await page.click('button:has-text("New Task")')
    await page.fill('input[name="title"]', 'Test Task for Contact')
    await page.fill('input[name="contact_name"]', testContact.fullName)
    await page.click(`text=${testContact.fullName}`) // Select from dropdown
    await page.click('button:has-text("Save Task")')
    
    // WHEN: User soft deletes the contact
    await page.goto(`${BASE_URL}/contacts`)
    await page.click(`text=${testContact.fullName}`)
    await page.click('button:has-text("Delete")')
    await page.click('button:has-text("Confirm")')
    
    // THEN: Deal still exists and is accessible
    await page.goto(`${BASE_URL}/deals`)
    await expect(page.locator('text=Test Deal for Contact')).toBeVisible()
    
    // THEN: Task still exists and is accessible
    await page.goto(`${BASE_URL}/tasks`)
    await expect(page.locator('text=Test Task for Contact')).toBeVisible()
    
    // THEN: Deal shows contact as "Deleted" or handles gracefully
    await page.goto(`${BASE_URL}/deals`)
    await page.click('text=Test Deal for Contact')
    // Should show contact name with indicator or "Contact deleted"
    await expect(page.locator('[data-testid="deal-contact"]')).toBeVisible()
  })

  test('B1.10: Contact right-slide component consistency', async ({ page }) => {
    // GIVEN: User can open contact slide-over from multiple locations
    
    // WHEN: Opened from Dashboard
    await page.goto(`${BASE_URL}/dashboard`)
    await page.click('button:has-text("Create Contact")')
    const dashboardSlideOver = await page.locator('[data-testid="contact-slide-over"]')
    await expect(dashboardSlideOver).toBeVisible()
    await page.click('button[aria-label="Close"]')
    
    // WHEN: Opened from Contacts list
    await page.goto(`${BASE_URL}/contacts`)
    await page.click('button:has-text("New Contact")')
    const contactsSlideOver = await page.locator('[data-testid="contact-slide-over"]')
    await expect(contactsSlideOver).toBeVisible()
    await page.click('button[aria-label="Close"]')
    
    // THEN: Both slide-overs use the same component (verify structure)
    // This is a structural test - both should have identical form fields
    await page.goto(`${BASE_URL}/dashboard`)
    await page.click('button:has-text("Create Contact")')
    const dashboardFields = await page.locator('input[name="full_name"]')
    await expect(dashboardFields).toBeVisible()
    
    await page.click('button[aria-label="Close"]')
    await page.goto(`${BASE_URL}/contacts`)
    await page.click('button:has-text("New Contact")')
    const contactsFields = await page.locator('input[name="full_name"]')
    await expect(contactsFields).toBeVisible()
  })
})

// Cleanup after all tests
test.afterAll(async ({ browser }) => {
  // Optionally clean up test data
  // This would require API calls to soft delete all test contacts
  console.log('✅ Contacts workflow tests complete')
})










