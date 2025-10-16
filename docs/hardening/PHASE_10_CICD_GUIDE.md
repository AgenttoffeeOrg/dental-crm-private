# PHASE 10: CI/CD & Preview Environments Guide
**Date:** October 16, 2025  
**Status:** Implementation Guide  
**Priority:** P1

---

## 1. Migration Safety Guards

### 1.1 Create Migration Linter

```typescript
// scripts/lint-migrations.ts
import fs from 'fs'
import path from 'path'

const DANGEROUS_PATTERNS = [
  { pattern: /DROP\s+TABLE(?!\s+IF\s+EXISTS)/i, message: 'Use DROP TABLE IF EXISTS' },
  { pattern: /ALTER\s+TABLE\s+\w+\s+DROP\s+COLUMN/i, message: 'Column drops require ALLOW_DANGEROUS=true' },
  { pattern: /TRUNCATE\s+TABLE/i, message: 'TRUNCATE requires ALLOW_DANGEROUS=true' },
  { pattern: /DELETE\s+FROM\s+\w+\s+WHERE/i, message: 'Mass deletes require review' },
]

export function lintMigration(filePath: string): { errors: string[]; warnings: string[] } {
  const content = fs.readFileSync(filePath, 'utf-8')
  const errors: string[] = []
  const warnings: string[] = []

  for (const { pattern, message } of DANGEROUS_PATTERNS) {
    if (pattern.test(content)) {
      if (process.env.ALLOW_DANGEROUS === 'true') {
        warnings.push(message)
      } else {
        errors.push(message)
      }
    }
  }

  return { errors, warnings }
}

// Run on all migrations
const migrationsDir = path.join(__dirname, '../supabase/migrations')
const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql'))

let hasErrors = false
for (const file of files) {
  const { errors, warnings } = lintMigration(path.join(migrationsDir, file))
  
  if (errors.length > 0) {
    console.error(`❌ ${file}: ${errors.join(', ')}`)
    hasErrors = true
  }
  
  if (warnings.length > 0) {
    console.warn(`⚠️  ${file}: ${warnings.join(', ')}`)
  }
}

process.exit(hasErrors ? 1 : 0)
```

### 1.2 Add to CI Pipeline

```yaml
# .github/workflows/ci.yml
name: CI

on: [pull_request]

jobs:
  lint-migrations:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npm run lint:migrations
      # Fails if dangerous migrations without ALLOW_DANGEROUS=true
```

---

## 2. Preview Environments

### 2.1 Create Seed Script

```typescript
// scripts/seed/seed.ts
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function seed() {
  console.log('🌱 Seeding preview environment...')

  // Tenant A: CRM Only
  const tenantA = await createTenant('Demo Dental Practice A', 'demo-a', 'starter')
  await enableFeature(tenantA.id, 'crm_base')
  await seedContacts(tenantA.id, 50)
  await seedDeals(tenantA.id, 20)

  // Tenant B: CRM + Automations
  const tenantB = await createTenant('Demo Dental Practice B', 'demo-b', 'professional')
  await enableFeature(tenantB.id, 'crm_base')
  await enableFeature(tenantB.id, 'automations')
  await seedContacts(tenantB.id, 100)
  await seedDeals(tenantB.id, 50)
  await seedAutomations(tenantB.id, 5)

  // Tenant C: CRM + Marketing (+ nested add-ons)
  const tenantC = await createTenant('Demo Dental Practice C', 'demo-c', 'enterprise')
  await enableFeature(tenantC.id, 'crm_base')
  await enableFeature(tenantC.id, 'marketing')
  await enableFeature(tenantC.id, 'marketing_ab_testing')
  await enableFeature(tenantC.id, 'marketing_social')
  await seedContacts(tenantC.id, 200)
  await seedDeals(tenantC.id, 100)
  await seedMarketingCampaigns(tenantC.id, 10)

  console.log('✅ Seeding complete!')
}

async function createTenant(name: string, slug: string, tier: string) {
  const { data, error } = await supabase
    .from('tenants')
    .insert({ name, slug, tier })
    .select()
    .single()

  if (error) throw error
  return data
}

async function enableFeature(tenantId: string, featureCode: string) {
  const { data: feature } = await supabase
    .from('features')
    .select('id')
    .eq('code', featureCode)
    .single()

  if (!feature) {
    console.warn(`Feature ${featureCode} not found`)
    return
  }

  await supabase.from('tenant_entitlements').insert({
    tenant_id: tenantId,
    feature_id: feature.id,
    is_enabled: true,
  })
}

// Run seed
seed().catch(console.error)
```

### 2.2 GitHub Actions for Preview

```yaml
# .github/workflows/preview.yml
name: Preview Environment

on:
  pull_request:
    types: [opened, synchronize]

jobs:
  deploy-preview:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          
      - name: Create preview DB
        run: |
          # Create ephemeral Supabase project
          npx supabase db branch create pr-${{ github.event.pull_request.number }}
          
      - name: Run migrations
        run: |
          npx supabase db push --branch pr-${{ github.event.pull_request.number }}
          
      - name: Seed data
        run: |
          npm run seed:preview
          
      - name: Comment PR with preview URL
        uses: actions/github-script@v6
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: '🚀 Preview deployed!\n\n**URL:** https://preview-pr-${{ github.event.pull_request.number }}.vercel.app\n\n**Test Accounts:**\n- Tenant A (CRM only): demo-a@test.com\n- Tenant B (CRM + Automations): demo-b@test.com\n- Tenant C (CRM + Marketing): demo-c@test.com\n\nPassword: `Demo1234!`'
            })
```

---

## 3. Smoke Tests

```typescript
// __tests__/smoke/preview.test.ts
import { test, expect } from '@playwright/test'

test.describe('Preview Environment Smoke Tests', () => {
  test('Tenant A: CRM only', async ({ page }) => {
    await page.goto(process.env.PREVIEW_URL!)
    await page.fill('[name=email]', 'demo-a@test.com')
    await page.fill('[name=password]', 'Demo1234!')
    await page.click('button[type=submit]')
    
    // Should see CRM features
    await expect(page.locator('text=Contacts')).toBeVisible()
    await expect(page.locator('text=Deals')).toBeVisible()
    
    // Should NOT see Marketing
    await expect(page.locator('text=Marketing')).not.toBeVisible()
  })

  test('Tenant B: CRM + Automations', async ({ page }) => {
    // ... test automations access
  })

  test('Tenant C: CRM + Marketing', async ({ page }) => {
    // ... test marketing access
  })
})
```

---

**Implementation Checklist:**
- [ ] Create migration linter script
- [ ] Add lint:migrations to package.json
- [ ] Add GitHub Actions for migration safety
- [ ] Create seed script with 3 tenant scenarios
- [ ] Set up preview environment workflow
- [ ] Add smoke tests for preview deployments
- [ ] Document preview URL patterns

**Estimated Effort:** 2 days

