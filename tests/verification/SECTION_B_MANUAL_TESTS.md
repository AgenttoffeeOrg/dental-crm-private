# SECTION B: CORE CRM WORKFLOWS - MANUAL TEST GUIDE

**Date:** 2025-10-17  
**Testing Method:** Manual UI + SQL Verification  
**Environment:** http://localhost:3001  
**Prerequisites:** Section A Complete ✅

---

## 🎯 Overview

Section B tests the **core CRM business logic** through actual user workflows.

**Test Approach:**
1. ✅ **Manual UI Testing** - Click through actual workflows
2. ✅ **SQL Verification** - Confirm data was saved correctly
3. ✅ **Relationships** - Verify FK integrity (Contact → Deal → Pipeline)

---

## 📝 Test Checklist

### B1: CONTACTS MODULE ✅

| # | Test Case | Status | Notes |
|---|-----------|--------|-------|
| 1.1 | Create contact via right-slide panel | ⬜ | Dashboard or Contacts page |
| 1.2 | Contact appears in contacts list | ⬜ | Verify after creation |
| 1.3 | Update contact details | ⬜ | Edit existing contact |
| 1.4 | Contact search works | ⬜ | Search by name/email |
| 1.5 | Soft delete contact | ⬜ | Should hide, not hard delete |
| 1.6 | Contact relationships intact | ⬜ | Deals/tasks should remain |

### B2: DEALS MODULE ✅

| # | Test Case | Status | Notes |
|---|-----------|--------|-------|
| 2.1 | Create deal with contact link | ⬜ | Must select contact |
| 2.2 | Deal appears in deals list | ⬜ | Verify after creation |
| 2.3 | Deal shows in contact's deals tab | ⬜ | Relationship works |
| 2.4 | Update deal value | ⬜ | Edit existing deal |
| 2.5 | Deal search works | ⬜ | Search by title |
| 2.6 | Soft delete deal | ⬜ | Should hide, not hard delete |

### B3: PIPELINES MODULE ✅

| # | Test Case | Status | Notes |
|---|-----------|--------|-------|
| 3.1 | View existing pipelines | ⬜ | Navigate to Pipelines |
| 3.2 | Deal cards show in stages | ⬜ | Kanban board view |
| 3.3 | Drag deal to new stage | ⬜ | Stage transition works |
| 3.4 | Stage change persists | ⬜ | Refresh page, verify |
| 3.5 | Deal shows updated stage | ⬜ | Check deal details |
| 3.6 | Pipeline filters work | ⬜ | Filter by stage/owner |

### B4: TASKS MODULE ✅

| # | Test Case | Status | Notes |
|---|-----------|--------|-------|
| 4.1 | Create task via right-slide panel | ⬜ | Dashboard or Tasks page |
| 4.2 | Task appears in tasks list | ⬜ | Verify after creation |
| 4.3 | Link task to contact | ⬜ | Select contact when creating |
| 4.4 | Link task to deal | ⬜ | Select deal when creating |
| 4.5 | Mark task complete | ⬜ | Checkbox or status change |
| 4.6 | Task shows in entity's tasks tab | ⬜ | Contact/Deal → Tasks |

### B5: ACTIVITIES & RELATIONSHIPS ✅

| # | Test Case | Status | Notes |
|---|-----------|--------|-------|
| 5.1 | View contact's activities timeline | ⬜ | Contact detail page |
| 5.2 | View contact's deals | ⬜ | Contact → Deals tab |
| 5.3 | View contact's tasks | ⬜ | Contact → Tasks tab |
| 5.4 | View deal's activities | ⬜ | Deal detail page |
| 5.5 | View deal's tasks | ⬜ | Deal → Tasks tab |
| 5.6 | All relationships show correct data | ⬜ | No orphaned records |

---

## 🧪 DETAILED TEST PROCEDURES

### TEST B1.1: Create Contact via Right-Slide Panel

**Steps:**
1. Navigate to http://localhost:3001/contacts
2. Click **"+ Create Contact"** button (top right)
3. Right-slide panel should open
4. Fill in form:
   - **Full Name:** Test Contact B1
   - **Email:** testb1@example.com
   - **Phone:** +44 123 456 7890 (optional)
5. Click **"Create Contact"**
6. Panel should close
7. Contact should appear in list

**SQL Verification:**
```sql
SELECT 
  id,
  full_name,
  primary_email,
  primary_phone,
  created_at
FROM contacts
WHERE primary_email = 'testb1@example.com'
  AND deleted_at IS NULL
ORDER BY created_at DESC
LIMIT 1;
```

**Expected:**
- ✅ Contact created
- ✅ Email normalized (lowercase)
- ✅ tenant_id set correctly
- ✅ created_at timestamp set

---

### TEST B2.1: Create Deal with Contact Link

**Steps:**
1. Navigate to http://localhost:3001/deals
2. Click **"+ Create Deal"** button
3. Fill in form:
   - **Title:** Test Deal B2
   - **Contact:** Select "Test Contact B1" (from B1.1)
   - **Pipeline:** Select any pipeline
   - **Stage:** Select first stage
   - **Value:** 5000
   - **Currency:** GBP
4. Click **"Create Deal"**
5. Deal should appear in deals list

**SQL Verification:**
```sql
SELECT 
  d.id,
  d.title,
  d.contact_id,
  c.full_name AS contact_name,
  d.pipeline_id,
  p.name AS pipeline_name,
  d.stage_id,
  s.name AS stage_name,
  d.value_estimate_cents,
  d.currency
FROM deals d
JOIN contacts c ON c.id = d.contact_id
JOIN pipelines p ON p.id = d.pipeline_id
JOIN pipeline_stages s ON s.id = d.stage_id
WHERE d.title = 'Test Deal B2'
  AND d.deleted_at IS NULL
ORDER BY d.created_at DESC
LIMIT 1;
```

**Expected:**
- ✅ Deal created
- ✅ contact_id links to correct contact
- ✅ pipeline_id and stage_id set
- ✅ Foreign key relationships valid

---

### TEST B3.3: Drag Deal to New Stage

**Steps:**
1. Navigate to http://localhost:3001/pipeline
2. Locate "Test Deal B2" card
3. Drag card to next stage column
4. Drop card
5. Card should move to new column
6. Refresh page
7. Card should remain in new stage

**SQL Verification:**
```sql
SELECT 
  d.title,
  d.stage_id,
  s.name AS current_stage,
  s.position AS stage_position
FROM deals d
JOIN pipeline_stages s ON s.id = d.stage_id
WHERE d.title = 'Test Deal B2'
  AND d.deleted_at IS NULL;
```

**Expected:**
- ✅ stage_id updated to new stage
- ✅ Change persists after refresh
- ✅ Deal appears in correct column

---

### TEST B4.1: Create Task Linked to Deal

**Steps:**
1. Navigate to http://localhost:3001/tasks
2. Click **"+ Create Task"** button
3. Fill in form:
   - **Title:** Follow up on Test Deal B2
   - **Description:** Call customer
   - **Priority:** High
   - **Type:** Call
   - **Assignee:** Select yourself
   - **Due Date:** Tomorrow
   - **Contact:** Select "Test Contact B1"
   - **Deal:** Select "Test Deal B2"
4. Click **"Create Task"**
5. Task should appear in tasks list

**SQL Verification:**
```sql
SELECT 
  t.id,
  t.title,
  t.priority,
  t.task_type,
  t.status,
  t.contact_id,
  c.full_name AS contact_name,
  t.deal_id,
  d.title AS deal_title,
  t.assignee_user_id,
  u.full_name AS assignee_name,
  t.due_at
FROM tasks t
LEFT JOIN contacts c ON c.id = t.contact_id
LEFT JOIN deals d ON d.id = t.deal_id
LEFT JOIN app_users u ON u.id = t.assignee_user_id
WHERE t.title = 'Follow up on Test Deal B2'
  AND t.deleted_at IS NULL
ORDER BY t.created_at DESC
LIMIT 1;
```

**Expected:**
- ✅ Task created
- ✅ contact_id and deal_id linked
- ✅ assignee_user_id set
- ✅ Relationships valid

---

### TEST B5: Relationship Verification

**Steps:**
1. Navigate to contact detail page for "Test Contact B1"
2. Check **Deals** tab - should show "Test Deal B2"
3. Check **Tasks** tab - should show "Follow up on Test Deal B2"
4. Navigate to deal detail page for "Test Deal B2"
5. Check **Tasks** tab - should show "Follow up on Test Deal B2"

**SQL Verification:**
```sql
-- Verify contact has deals
SELECT 
  'B5.1 - Contact has deals' AS test,
  COUNT(*) AS deal_count,
  CASE WHEN COUNT(*) >= 1 THEN '✅ PASS' ELSE '❌ FAIL' END AS status
FROM deals
WHERE contact_id = (SELECT id FROM contacts WHERE primary_email = 'testb1@example.com')
  AND deleted_at IS NULL;

-- Verify contact has tasks
SELECT 
  'B5.2 - Contact has tasks' AS test,
  COUNT(*) AS task_count,
  CASE WHEN COUNT(*) >= 1 THEN '✅ PASS' ELSE '❌ FAIL' END AS status
FROM tasks
WHERE contact_id = (SELECT id FROM contacts WHERE primary_email = 'testb1@example.com')
  AND deleted_at IS NULL;

-- Verify deal has tasks
SELECT 
  'B5.3 - Deal has tasks' AS test,
  COUNT(*) AS task_count,
  CASE WHEN COUNT(*) >= 1 THEN '✅ PASS' ELSE '❌ FAIL' END AS status
FROM tasks
WHERE deal_id = (SELECT id FROM deals WHERE title = 'Test Deal B2' LIMIT 1)
  AND deleted_at IS NULL;

-- Verify all relationships are same-tenant
SELECT 
  'B5.4 - All entities same tenant' AS test,
  COUNT(DISTINCT tenant_id) AS tenant_count,
  CASE WHEN COUNT(DISTINCT tenant_id) = 1 THEN '✅ PASS' ELSE '❌ FAIL' END AS status
FROM (
  SELECT tenant_id FROM contacts WHERE primary_email = 'testb1@example.com'
  UNION ALL
  SELECT tenant_id FROM deals WHERE title = 'Test Deal B2'
  UNION ALL
  SELECT tenant_id FROM tasks WHERE title = 'Follow up on Test Deal B2'
) sub;
```

**Expected:**
- ✅ All relationships visible in UI
- ✅ All entities belong to same tenant
- ✅ FK integrity maintained

---

## 📊 SQL Verification Suite

Run this **after completing all manual tests** to verify data integrity:

```sql
-- ================================================================
-- SECTION B: COMPREHENSIVE VERIFICATION
-- ================================================================

-- B.1: Count test records created
SELECT 
  'Contacts created' AS entity,
  COUNT(*) AS count
FROM contacts
WHERE primary_email LIKE '%@example.com'
  AND deleted_at IS NULL

UNION ALL

SELECT 
  'Deals created' AS entity,
  COUNT(*) AS count
FROM deals
WHERE title LIKE 'Test Deal%'
  AND deleted_at IS NULL

UNION ALL

SELECT 
  'Tasks created' AS entity,
  COUNT(*) AS count
FROM tasks
WHERE title LIKE '%Test Deal%'
  AND deleted_at IS NULL;

-- B.2: Verify all FKs are valid (no orphans)
SELECT 
  'Deals with invalid contact_id' AS test,
  COUNT(*) AS count,
  CASE WHEN COUNT(*) = 0 THEN '✅ PASS' ELSE '❌ FAIL' END AS status
FROM deals d
LEFT JOIN contacts c ON c.id = d.contact_id
WHERE d.deleted_at IS NULL
  AND c.id IS NULL;

SELECT 
  'Deals with invalid pipeline_id' AS test,
  COUNT(*) AS count,
  CASE WHEN COUNT(*) = 0 THEN '✅ PASS' ELSE '❌ FAIL' END AS status
FROM deals d
LEFT JOIN pipelines p ON p.id = d.pipeline_id
WHERE d.deleted_at IS NULL
  AND p.id IS NULL;

SELECT 
  'Deals with invalid stage_id' AS test,
  COUNT(*) AS count,
  CASE WHEN COUNT(*) = 0 THEN '✅ PASS' ELSE '❌ FAIL' END AS status
FROM deals d
LEFT JOIN pipeline_stages s ON s.id = d.stage_id
WHERE d.deleted_at IS NULL
  AND s.id IS NULL;

SELECT 
  'Tasks with invalid contact_id' AS test,
  COUNT(*) AS count,
  CASE WHEN COUNT(*) = 0 THEN '✅ PASS' ELSE '❌ FAIL' END AS status
FROM tasks t
LEFT JOIN contacts c ON c.id = t.contact_id
WHERE t.deleted_at IS NULL
  AND t.contact_id IS NOT NULL
  AND c.id IS NULL;

-- B.3: Verify tenant isolation (all test data same tenant)
SELECT 
  'All test records same tenant' AS test,
  COUNT(DISTINCT tenant_id) AS tenant_count,
  CASE WHEN COUNT(DISTINCT tenant_id) = 1 THEN '✅ PASS' ELSE '❌ FAIL' END AS status
FROM (
  SELECT tenant_id FROM contacts WHERE primary_email LIKE '%@example.com'
  UNION ALL
  SELECT tenant_id FROM deals WHERE title LIKE 'Test Deal%'
  UNION ALL
  SELECT tenant_id FROM tasks WHERE title LIKE '%Test Deal%'
) sub;
```

---

## 📝 Results Template

Copy this template and fill in as you complete tests:

```markdown
## SECTION B TEST RESULTS

**Tester:** [Your Name]  
**Date:** 2025-10-17  
**Environment:** http://localhost:3001  

### B1: Contacts
- [ ] 1.1 Create contact via right-slide panel - PASS/FAIL
- [ ] 1.2 Contact appears in contacts list - PASS/FAIL
- [ ] 1.3 Update contact details - PASS/FAIL
- [ ] 1.4 Contact search works - PASS/FAIL
- [ ] 1.5 Soft delete contact - PASS/FAIL
- [ ] 1.6 Contact relationships intact - PASS/FAIL

### B2: Deals
- [ ] 2.1 Create deal with contact link - PASS/FAIL
- [ ] 2.2 Deal appears in deals list - PASS/FAIL
- [ ] 2.3 Deal shows in contact's deals tab - PASS/FAIL
- [ ] 2.4 Update deal value - PASS/FAIL
- [ ] 2.5 Deal search works - PASS/FAIL
- [ ] 2.6 Soft delete deal - PASS/FAIL

### B3: Pipelines
- [ ] 3.1 View existing pipelines - PASS/FAIL
- [ ] 3.2 Deal cards show in stages - PASS/FAIL
- [ ] 3.3 Drag deal to new stage - PASS/FAIL
- [ ] 3.4 Stage change persists - PASS/FAIL
- [ ] 3.5 Deal shows updated stage - PASS/FAIL
- [ ] 3.6 Pipeline filters work - PASS/FAIL

### B4: Tasks
- [ ] 4.1 Create task via right-slide panel - PASS/FAIL
- [ ] 4.2 Task appears in tasks list - PASS/FAIL
- [ ] 4.3 Link task to contact - PASS/FAIL
- [ ] 4.4 Link task to deal - PASS/FAIL
- [ ] 4.5 Mark task complete - PASS/FAIL
- [ ] 4.6 Task shows in entity's tasks tab - PASS/FAIL

### B5: Relationships
- [ ] 5.1 View contact's activities timeline - PASS/FAIL
- [ ] 5.2 View contact's deals - PASS/FAIL
- [ ] 5.3 View contact's tasks - PASS/FAIL
- [ ] 5.4 View deal's activities - PASS/FAIL
- [ ] 5.5 View deal's tasks - PASS/FAIL
- [ ] 5.6 All relationships show correct data - PASS/FAIL

### SQL Verification
- [ ] All FKs valid (no orphans) - PASS/FAIL
- [ ] All test data same tenant - PASS/FAIL
- [ ] No cross-tenant leakage - PASS/FAIL

### Issues Found
1. [List any bugs or issues discovered]

### Overall Status
- [ ] Section B COMPLETE
- [ ] Ready for Section C
```

---

## 🚀 Getting Started

1. **Open your app:** http://localhost:3001
2. **Login** with your test account
3. **Start with B1.1:** Create a test contact
4. **Work through checklist** systematically
5. **Run SQL verifications** after each major test
6. **Document results** in the template above

---

## 📎 Related Files

**E2E Test Examples:**
- `/tests/e2e/crm/contacts.spec.ts` - Automated contact tests
- `/tests/e2e/crm/pipelines.spec.ts` - Automated pipeline tests

**SQL Verification:**
- Run queries in Supabase SQL Editor
- Save results to `/tests/verification/results/section_b_results.txt`

---

## ✅ Completion Criteria

Section B is complete when:
- ✅ All 30 test cases executed
- ✅ All SQL verifications pass
- ✅ No orphaned foreign keys
- ✅ All test data belongs to same tenant
- ✅ Results documented

---

**Ready to start? Let me know when you begin or if you have questions!** 🎯



