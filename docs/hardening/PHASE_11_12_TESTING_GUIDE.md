# PHASE 11-12: Testing & Final Polish Guide
**Date:** October 16, 2025  
**Status:** Implementation Guide  
**Priority:** P0 (Testing), P1 (Polish)

---

## PHASE 11: QA Matrix & Red Team Tests

### 11.1 E2E Test Suite Structure

```typescript
// __tests__/e2e/tenant-isolation.test.ts
import { test, expect } from '@playwright/test'

test.describe('Tenant Isolation Tests', () => {
  test('User cannot see other tenant data', async ({ page, context }) => {
    // Login as Tenant A
    await loginAs(page, 'tenant-a@test.com', 'password')
    await page.goto('/contacts')
    const contactsA = await page.locator('[data-testid=contact-row]').count()
    
    // Switch to Tenant B
    await page.click('[data-testid=user-menu]')
    await page.click('text=Sign Out')
    await loginAs(page, 'tenant-b@test.com', 'password')
    await page.goto('/contacts')
    const contactsB = await page.locator('[data-testid=contact-row]').count()
    
    // Verify different data
    expect(contactsA).not.toBe(contactsB)
    
    // Verify no cross-contamination
    // (This requires seeded data with known identifiers)
  })

  test('API rejects cross-tenant requests', async ({ request }) => {
    const token = await getAuthToken('tenant-a@test.com')
    const tenantBContactId = await getTenantBContactId()
    
    // Try to access Tenant B's contact with Tenant A's token
    const response = await request.get(`/api/contacts/${tenantBContactId}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    
    expect(response.status()).toBe(404) // RLS hides it, returns 404 not 403
  })
})
```

### 11.2 Red Team Security Tests

```typescript
// __tests__/security/red-team.test.ts
import { test, expect } from '@playwright/test'

test.describe('Red Team: Entitlement Bypass Attempts', () => {
  test('Cannot bypass entitlement via direct API call', async ({ request }) => {
    const token = await getAuthToken('basic-user@test.com') // No marketing entitlement
    
    // Try to create marketing campaign
    const response = await request.post('/api/marketing/campaigns', {
      headers: { Authorization: `Bearer ${token}` },
      data: { name: 'Test Campaign', ... }
    })
    
    expect(response.status()).toBe(403)
    expect(await response.json()).toMatchObject({
      error: expect.stringContaining('marketing')
    })
  })

  test('Cannot bypass quota via concurrent requests', async ({ request }) => {
    const token = await getAuthToken('limited-user@test.com') // quota_limit = 10
    
    // Send 20 concurrent requests
    const promises = Array.from({ length: 20 }, () =>
      request.post('/api/marketing/send', {
        headers: { Authorization: `Bearer ${token}` },
        data: { ... }
      })
    )
    
    const results = await Promise.all(promises.map(p => p.catch(e => e)))
    
    // At least 10 should fail with quota exceeded
    const failed = results.filter(r => r.status() === 402 || r.status() === 429)
    expect(failed.length).toBeGreaterThanOrEqual(10)
  })

  test('Cannot modify tenant_id after creation', async ({ request }) => {
    const token = await getAuthToken('admin@tenant-a.com')
    const contact = await createContact(token, { full_name: 'Test' })
    
    // Try to update tenant_id
    const response = await request.patch(`/api/contacts/${contact.id}`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { tenant_id: 'different-tenant-uuid' }
    })
    
    expect(response.status()).toBe(500) // DB constraint violation
    expect(await response.text()).toContain('Cannot change tenant_id')
  })

  test('Cannot link contact to deal from different tenant', async ({ request }) => {
    const tokenA = await getAuthToken('admin@tenant-a.com')
    const tokenB = await getAuthToken('admin@tenant-b.com')
    
    const contactA = await createContact(tokenA, { full_name: 'Contact A' })
    
    // Try to create deal in Tenant B with Contact A
    const response = await request.post('/api/deals', {
      headers: { Authorization: `Bearer ${tokenB}` },
      data: {
        title: 'Cross-tenant deal',
        contact_id: contactA.id, // From Tenant A
        ...
      }
    })
    
    expect(response.status()).toBe(500) // CHECK constraint violation
    expect(await response.text()).toContain('same_tenant')
  })
})
```

### 11.3 Click-Path QA Matrix

| Flow | Role | Steps | Expected Result | Automated Test |
|------|------|-------|-----------------|----------------|
| Create Contact (Dashboard) | Admin | 1. Dashboard → "New Contact"<br/>2. Fill form in right-slide<br/>3. Save | Contact created, appears in list | ✅ `contact-crud.test.ts` |
| Create Task (Dashboard) | Staff | 1. Dashboard → "New Task"<br/>2. Fill form<br/>3. Save | Task created, assigned user notified | ✅ `task-crud.test.ts` |
| Marketing Campaign (No Entitlement) | Manager | 1. Try /marketing | 403 or locked UI | ✅ `entitlement.test.ts` |
| Marketing Automation (No Marketing) | Admin | 1. Automations → Marketing tab | Tab hidden/locked | ✅ `automations.test.ts` |
| DSR Export | Owner | 1. Settings → Privacy<br/>2. Request export | JSON/CSV download | ✅ `dsr.test.ts` |
| Webhook Idempotency | System | 1. POST webhook 3× same event_id | Only 1 side-effect | ✅ `webhook.test.ts` |
| Contact Merge | Admin | 1. Identify duplicate<br/>2. Merge | All records moved | ✅ `merge.test.ts` |
| Quota Exceeded | User | 1. Use feature until quota hit | Clear error + upgrade CTA | ✅ `quota.test.ts` |

---

## PHASE 12: Final Polish

### 12.1 Onboarding Checklist Component

```typescript
// src/components/onboarding/checklist.tsx
'use client'

import { useState, useEffect } from 'react'
import { CheckCircleIcon } from '@heroicons/react/24/solid'
import { CircleIcon } from '@heroicons/react/24/outline'

const ONBOARDING_STEPS = [
  { id: 'profile', label: 'Complete your profile', action: '/settings/profile' },
  { id: 'contacts', label: 'Import or create your first contact', action: '/contacts' },
  { id: 'pipeline', label: 'Set up your sales pipeline', action: '/pipeline' },
  { id: 'integrations', label: 'Connect your email', action: '/integrations' },
  { id: 'marketing', label: 'Explore Marketing add-on', action: '/settings/billing?upgrade=marketing' },
]

export function OnboardingChecklist() {
  const [completed, setCompleted] = useState<string[]>([])

  useEffect(() => {
    // Load from localStorage or API
    const saved = localStorage.getItem('onboarding_completed')
    if (saved) setCompleted(JSON.parse(saved))
  }, [])

  const progress = (completed.length / ONBOARDING_STEPS.length) * 100

  return (
    <Card>
      <CardHeader>
        <CardTitle>Get Started</CardTitle>
        <CardDescription>
          {completed.length} of {ONBOARDING_STEPS.length} steps completed
        </CardDescription>
        <Progress value={progress} className="mt-2" />
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {ONBOARDING_STEPS.map(step => (
            <li key={step.id} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {completed.includes(step.id) ? (
                  <CheckCircleIcon className="h-5 w-5 text-green-600" />
                ) : (
                  <CircleIcon className="h-5 w-5 text-gray-300" />
                )}
                <span className={completed.includes(step.id) ? 'text-gray-500 line-through' : 'text-gray-900'}>
                  {step.label}
                </span>
              </div>
              {!completed.includes(step.id) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.location.href = step.action}
                >
                  Start
                </Button>
              )}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
```

### 12.2 Demo Mode Toggle

```typescript
// src/components/admin/demo-mode-toggle.tsx
'use client'

export function DemoModeToggle() {
  const [isDemoMode, setIsDemoMode] = useState(false)

  const toggleDemoMode = async () => {
    await supabase
      .from('tenants')
      .update({ settings: { demo_mode: !isDemoMode } })
      .eq('id', tenantId)
    
    setIsDemoMode(!isDemoMode)
    
    if (!isDemoMode) {
      // Populate with demo data
      await seedDemoData()
    }
  }

  return (
    <Switch
      checked={isDemoMode}
      onCheckedChange={toggleDemoMode}
      label="Demo Mode"
    />
  )
}
```

---

## Implementation Checklist

### Phase 11: Testing
- [ ] Create E2E test suite (Playwright/Cypress)
- [ ] Implement tenant isolation tests
- [ ] Implement entitlement bypass tests
- [ ] Implement quota enforcement tests
- [ ] Implement webhook idempotency tests
- [ ] Implement FK constraint tests
- [ ] Implement RLS policy tests
- [ ] Set up CI to run tests on every PR
- [ ] Achieve > 80% critical path coverage

### Phase 12: Polish
- [ ] Create onboarding checklist component
- [ ] Implement demo mode toggle
- [ ] Create sample datasets for demo mode
- [ ] Align pricing page with entitlements
- [ ] Add in-app help/tooltips
- [ ] Create keyboard shortcut reference (Cmd+K → help)
- [ ] Add empty states for all modules
- [ ] Implement "Quick Actions" command palette

---

**Estimated Effort:**  
- Phase 11: 3 days  
- Phase 12: 2 days  

**Total: 1 week**

