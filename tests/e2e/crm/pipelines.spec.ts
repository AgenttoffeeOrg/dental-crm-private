/**
 * E2E TESTS: PIPELINES WORKFLOW
 * ================================================================
 * Section B2: Core CRM - Pipelines Module
 * 
 * Tests:
 * - Create pipeline
 * - Add stages (ordered, unique position)
 * - Set stage probabilities
 * - Move deal across stages
 * - Verify stage automations fire (if set)
 * - Archive pipeline
 * - Pipeline validation (stage ordering, probability ranges)
 * ================================================================
 */

import { test, expect, Page } from '@playwright/test'

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'
const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL || 'admin@dentalone.test'
const TEST_USER_PASSWORD = process.env.TEST_USER_PASSWORD || 'TestPassword123!'

const testPipeline = {
  name: 'Test Treatment Pipeline',
  description: 'E2E test pipeline for verification',
  stages: [
    { name: 'Initial Consultation', probability: 10, position: 0 },
    { name: 'Treatment Plan Created', probability: 30, position: 1 },
    { name: 'Approved by Patient', probability: 60, position: 2 },
    { name: 'Treatment In Progress', probability: 90, position: 3 },
    { name: 'Treatment Complete', probability: 100, position: 4 }
  ]
}

async function login(page: Page) {
  await page.goto(`${BASE_URL}/login`)
  await page.fill('input[name="email"]', TEST_USER_EMAIL)
  await page.fill('input[name="password"]', TEST_USER_PASSWORD)
  await page.click('button[type="submit"]')
  await page.waitForURL(`${BASE_URL}/dashboard`)
}

test.describe('Pipelines Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('B2.1: Create pipeline', async ({ page }) => {
    // GIVEN: User navigates to pipelines
    await page.goto(`${BASE_URL}/settings/pipeline`)
    
    // WHEN: User clicks "New Pipeline"
    await page.click('button:has-text("New Pipeline")')
    
    // THEN: Create pipeline dialog opens
    await expect(page.locator('[role="dialog"]')).toBeVisible()
    await expect(page.locator('h2:has-text("Create Pipeline")')).toBeVisible()
    
    // WHEN: User fills pipeline details
    await page.fill('input[name="name"]', testPipeline.name)
    await page.fill('textarea[name="description"]', testPipeline.description)
    await page.click('button:has-text("Create")')
    
    // THEN: Pipeline is created
    await page.waitForSelector(`.toast:has-text("Pipeline created")`)
    await expect(page.locator(`text=${testPipeline.name}`)).toBeVisible()
  })

  test('B2.2: Add stages (ordered, unique position)', async ({ page }) => {
    // GIVEN: A pipeline exists
    await page.goto(`${BASE_URL}/settings/pipeline`)
    await page.click('button:has-text("New Pipeline")')
    await page.fill('input[name="name"]', testPipeline.name)
    await page.click('button:has-text("Create")')
    
    // WHEN: User adds stages one by one
    await page.click(`text=${testPipeline.name}`)
    
    for (const stage of testPipeline.stages) {
      await page.click('button:has-text("Add Stage")')
      await page.fill('input[name="stage_name"]', stage.name)
      await page.fill('input[name="probability"]', stage.probability.toString())
      await page.click('button:has-text("Save Stage")')
      
      // THEN: Stage appears in correct position
      await expect(page.locator(`[data-stage-position="${stage.position}"]`)).toContainText(stage.name)
    }
    
    // THEN: All stages are displayed in order
    const stageElements = await page.locator('[data-testid="pipeline-stage"]').all()
    expect(stageElements.length).toBe(testPipeline.stages.length)
    
    // THEN: Stage positions are sequential (0, 1, 2, 3, 4)
    for (let i = 0; i < stageElements.length; i++) {
      const position = await stageElements[i].getAttribute('data-stage-position')
      expect(position).toBe(i.toString())
    }
  })

  test('B2.3: Set stage probabilities', async ({ page }) => {
    // GIVEN: Pipeline with stages exists
    await page.goto(`${BASE_URL}/settings/pipeline`)
    
    // Navigate to existing pipeline or create new one
    await page.click('button:has-text("New Pipeline")')
    await page.fill('input[name="name"]', testPipeline.name + ' Probability Test')
    await page.click('button:has-text("Create")')
    await page.click(`text=${testPipeline.name} Probability Test`)
    
    // WHEN: User sets probability for each stage
    for (const stage of testPipeline.stages) {
      await page.click('button:has-text("Add Stage")')
      await page.fill('input[name="stage_name"]', stage.name)
      await page.fill('input[name="probability"]', stage.probability.toString())
      await page.click('button:has-text("Save Stage")')
    }
    
    // THEN: Probabilities are saved correctly
    for (const stage of testPipeline.stages) {
      const stageCard = page.locator(`[data-testid="stage-${stage.position}"]`)
      await expect(stageCard).toContainText(`${stage.probability}%`)
    }
    
    // THEN: Probabilities are in ascending order
    const probabilities: number[] = []
    for (let i = 0; i < testPipeline.stages.length; i++) {
      const stageCard = page.locator(`[data-testid="stage-${i}"]`)
      const text = await stageCard.textContent()
      const match = text?.match(/(\d+)%/)
      if (match) probabilities.push(parseInt(match[1]))
    }
    
    // Verify ascending order
    for (let i = 1; i < probabilities.length; i++) {
      expect(probabilities[i]).toBeGreaterThanOrEqual(probabilities[i - 1])
    }
  })

  test('B2.4: Move deal across stages', async ({ page }) => {
    // GIVEN: Pipeline with stages and a deal exists
    await page.goto(`${BASE_URL}/settings/pipeline`)
    await page.click('button:has-text("New Pipeline")')
    await page.fill('input[name="name"]', 'Deal Movement Test Pipeline')
    await page.click('button:has-text("Create")')
    await page.click('text=Deal Movement Test Pipeline')
    
    // Add stages
    for (const stage of testPipeline.stages.slice(0, 3)) { // First 3 stages only
      await page.click('button:has-text("Add Stage")')
      await page.fill('input[name="stage_name"]', stage.name)
      await page.click('button:has-text("Save Stage")')
    }
    
    // Create a deal in this pipeline
    await page.goto(`${BASE_URL}/deals`)
    await page.click('button:has-text("New Deal")')
    await page.fill('input[name="title"]', 'Test Deal for Stage Movement')
    await page.selectOption('select[name="pipeline"]', { label: 'Deal Movement Test Pipeline' })
    await page.click('button:has-text("Save Deal")')
    
    // WHEN: User moves deal to next stage
    await page.goto(`${BASE_URL}/pipeline`)
    await page.click('text=Deal Movement Test Pipeline')
    
    // Drag deal to next stage (or use stage dropdown)
    const dealCard = page.locator('text=Test Deal for Stage Movement')
    await dealCard.click()
    await page.click('button:has-text("Move to Next Stage")')
    
    // THEN: Deal moves to correct stage
    await expect(page.locator('[data-stage="1"]')).toContainText('Test Deal for Stage Movement')
    
    // THEN: Activity log records the stage change
    await dealCard.click()
    await expect(page.locator('[data-testid="activity-log"]')).toContainText('moved to')
    await expect(page.locator('[data-testid="activity-log"]')).toContainText(testPipeline.stages[1].name)
  })

  test('B2.5: Verify stage automations fire (if set)', async ({ page }) => {
    // GIVEN: Pipeline with stage that has automation rule
    await page.goto(`${BASE_URL}/settings/pipeline`)
    await page.click('button:has-text("New Pipeline")')
    await page.fill('input[name="name"]', 'Automation Test Pipeline')
    await page.click('button:has-text("Create")')
    await page.click('text=Automation Test Pipeline')
    
    // Add first stage
    await page.click('button:has-text("Add Stage")')
    await page.fill('input[name="stage_name"]', 'New Lead')
    await page.click('button:has-text("Save Stage")')
    
    // Add automation to this stage
    await page.click('[data-testid="stage-0"] button:has-text("Automations")')
    await page.click('button:has-text("Add Automation")')
    await page.selectOption('select[name="automation"]', { label: 'Create Follow-up Task' })
    await page.click('button:has-text("Enable")')
    
    // Create deal in this pipeline
    await page.goto(`${BASE_URL}/deals`)
    await page.click('button:has-text("New Deal")')
    await page.fill('input[name="title"]', 'Deal to Trigger Automation')
    await page.selectOption('select[name="pipeline"]', { label: 'Automation Test Pipeline' })
    await page.click('button:has-text("Save Deal")')
    
    // WHEN: Deal is created (enters first stage)
    // THEN: Automation should fire and create task
    await page.goto(`${BASE_URL}/tasks`)
    
    // Check if automation-created task exists
    await expect(page.locator('text=Follow-up')).toBeVisible({ timeout: 10000 })
    
    // THEN: Task is linked to the deal
    await page.click('text=Follow-up')
    await expect(page.locator('[data-testid="task-linked-deal"]')).toContainText('Deal to Trigger Automation')
  })

  test('B2.6: Archive pipeline', async ({ page }) => {
    // GIVEN: A pipeline exists with no active deals
    await page.goto(`${BASE_URL}/settings/pipeline`)
    await page.click('button:has-text("New Pipeline")')
    await page.fill('input[name="name"]', 'Pipeline to Archive')
    await page.click('button:has-text("Create")')
    
    // WHEN: User archives the pipeline
    await page.click('text=Pipeline to Archive')
    await page.click('button:has-text("Archive Pipeline")')
    
    // THEN: Confirmation dialog appears
    await expect(page.locator('[role="dialog"]')).toBeVisible()
    await expect(page.locator('text=Archive this pipeline')).toBeVisible()
    
    // WHEN: User confirms
    await page.click('button:has-text("Confirm Archive")')
    
    // THEN: Pipeline is archived (not deleted, just hidden)
    await page.goto(`${BASE_URL}/settings/pipeline`)
    await expect(page.locator('text=Pipeline to Archive')).not.toBeVisible()
    
    // THEN: Can view archived pipelines
    await page.click('button:has-text("Show Archived")')
    await expect(page.locator('text=Pipeline to Archive')).toBeVisible()
    await expect(page.locator('[data-testid="archived-badge"]')).toBeVisible()
  })

  test('B2.7: Pipeline validation - stage ordering', async ({ page }) => {
    // GIVEN: Pipeline with stages exists
    await page.goto(`${BASE_URL}/settings/pipeline`)
    await page.click('button:has-text("New Pipeline")')
    await page.fill('input[name="name"]', 'Validation Test Pipeline')
    await page.click('button:has-text("Create")')
    await page.click('text=Validation Test Pipeline')
    
    // Add stages
    await page.click('button:has-text("Add Stage")')
    await page.fill('input[name="stage_name"]', 'Stage 1')
    await page.click('button:has-text("Save Stage")')
    
    await page.click('button:has-text("Add Stage")')
    await page.fill('input[name="stage_name"]', 'Stage 2')
    await page.click('button:has-text("Save Stage")')
    
    // WHEN: User tries to reorder stages
    // Drag stage 2 to position 0
    const stage2 = page.locator('[data-stage-position="1"]')
    const stage1 = page.locator('[data-stage-position="0"]')
    
    await stage2.dragTo(stage1)
    
    // THEN: Stages reorder correctly
    await expect(page.locator('[data-stage-position="0"]')).toContainText('Stage 2')
    await expect(page.locator('[data-stage-position="1"]')).toContainText('Stage 1')
    
    // THEN: Position numbers are updated automatically
    const newStage1Pos = await page.locator('[data-testid="stage-0"]').getAttribute('data-stage-position')
    const newStage2Pos = await page.locator('[data-testid="stage-1"]').getAttribute('data-stage-position')
    
    expect(newStage1Pos).toBe('0')
    expect(newStage2Pos).toBe('1')
  })

  test('B2.8: Pipeline validation - probability ranges', async ({ page }) => {
    // GIVEN: User is creating a stage
    await page.goto(`${BASE_URL}/settings/pipeline`)
    await page.click('button:has-text("New Pipeline")')
    await page.fill('input[name="name"]', 'Probability Validation Test')
    await page.click('button:has-text("Create")')
    await page.click('text=Probability Validation Test')
    await page.click('button:has-text("Add Stage")')
    
    // WHEN: User enters invalid probability (< 0)
    await page.fill('input[name="stage_name"]', 'Invalid Stage Negative')
    await page.fill('input[name="probability"]', '-10')
    await page.click('button:has-text("Save Stage")')
    
    // THEN: Validation error appears
    await expect(page.locator('.error-message')).toContainText('Probability must be between 0 and 100')
    
    // WHEN: User enters invalid probability (> 100)
    await page.fill('input[name="probability"]', '150')
    await page.click('button:has-text("Save Stage")')
    
    // THEN: Validation error appears
    await expect(page.locator('.error-message')).toContainText('Probability must be between 0 and 100')
    
    // WHEN: User enters valid probability
    await page.fill('input[name="probability"]', '50')
    await page.click('button:has-text("Save Stage")')
    
    // THEN: Stage is saved successfully
    await expect(page.locator('.toast:has-text("Stage created")')).toBeVisible()
  })

  test('B2.9: Cannot delete pipeline with active deals', async ({ page }) => {
    // GIVEN: Pipeline with active deals exists
    await page.goto(`${BASE_URL}/settings/pipeline`)
    await page.click('button:has-text("New Pipeline")')
    await page.fill('input[name="name"]', 'Pipeline with Deals')
    await page.click('button:has-text("Create")')
    await page.click('text=Pipeline with Deals')
    
    // Add a stage
    await page.click('button:has-text("Add Stage")')
    await page.fill('input[name="stage_name"]', 'New')
    await page.click('button:has-text("Save Stage")')
    
    // Create a deal in this pipeline
    await page.goto(`${BASE_URL}/deals`)
    await page.click('button:has-text("New Deal")')
    await page.fill('input[name="title"]', 'Active Deal')
    await page.selectOption('select[name="pipeline"]', { label: 'Pipeline with Deals' })
    await page.click('button:has-text("Save Deal")')
    
    // WHEN: User tries to delete pipeline
    await page.goto(`${BASE_URL}/settings/pipeline`)
    await page.click('text=Pipeline with Deals')
    await page.click('button:has-text("Delete Pipeline")')
    
    // THEN: Error message appears
    await expect(page.locator('.error-message')).toContainText('Cannot delete pipeline with active deals')
    
    // THEN: Suggestion to archive instead
    await expect(page.locator('text=archive this pipeline instead')).toBeVisible()
  })

  test('B2.10: Pipeline clone functionality', async ({ page }) => {
    // GIVEN: A pipeline with stages exists
    await page.goto(`${BASE_URL}/settings/pipeline`)
    await page.click('button:has-text("New Pipeline")')
    await page.fill('input[name="name"]', 'Original Pipeline')
    await page.click('button:has-text("Create")')
    await page.click('text=Original Pipeline')
    
    // Add stages
    for (const stage of testPipeline.stages.slice(0, 3)) {
      await page.click('button:has-text("Add Stage")')
      await page.fill('input[name="stage_name"]', stage.name)
      await page.fill('input[name="probability"]', stage.probability.toString())
      await page.click('button:has-text("Save Stage")')
    }
    
    // WHEN: User clones the pipeline
    await page.goto(`${BASE_URL}/settings/pipeline`)
    await page.click('text=Original Pipeline')
    await page.click('button:has-text("Clone Pipeline")')
    
    // THEN: Clone dialog appears
    await expect(page.locator('[role="dialog"]')).toBeVisible()
    await page.fill('input[name="new_pipeline_name"]', 'Cloned Pipeline')
    await page.click('button:has-text("Clone")')
    
    // THEN: New pipeline created with same stages
    await page.goto(`${BASE_URL}/settings/pipeline`)
    await expect(page.locator('text=Cloned Pipeline')).toBeVisible()
    
    // THEN: Stages are identical
    await page.click('text=Cloned Pipeline')
    for (const stage of testPipeline.stages.slice(0, 3)) {
      await expect(page.locator(`text=${stage.name}`)).toBeVisible()
    }
  })
})

test.afterAll(async () => {
  console.log('✅ Pipelines workflow tests complete')
})



