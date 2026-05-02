# 🔍 SonarCloud Reliability Issues Report

**Generated:** ${new Date().toLocaleString()}
**Total Reliability Issues:** 598 (135 Bugs + Code Smells)
**Reliability Grade:** D

---

## 📊 Summary

### By Severity
- 🔴 **Critical:** 4 issues
- 🟠 **Major:** 58 issues  
- 🟡 **Minor:** 38 issues
- **Total Bugs:** 135

### Top Issue Types

1. **typescript:S1082** - 38 issues
   - Empty blocks or unnecessary code

2. **typescript:S6440** - 33 issues
   - React Hooks called conditionally

3. **typescript:S6544** - 4 issues
   - (Details being fetched...)

4. **typescript:S2871** - 4 issues
   - (Details being fetched...)

---

## 🔴 Critical Issues (4)

Fetching details...

---

## 🟠 Major Issues (58)

### Top Major Issues:

1. **React Hooks Called Conditionally (33 issues)**
   - **Rule:** `typescript:S6440`
   - **Files Affected:** 
     - `src/app/tasks/page.tsx` (lines 81-89, 97)
   - **Issue:** React Hooks must be called in the same order every render
   - **Fix:** Move hooks outside conditional blocks

2. **Empty Blocks (38 issues)**
   - **Rule:** `typescript:S1082`
   - **Issue:** Empty catch blocks or unnecessary code blocks
   - **Fix:** Add error handling or remove empty blocks

3. **Reduce() Without Initial Value (2+ issues)**
   - **Rule:** `typescript:S6959`
   - **Files:** 
     - `src/lib/integrations/migration-helper.ts` (line 65)
     - `src/components/contacts/contact-detail-view.tsx` (line 274)
   - **Fix:** Add initial value to reduce() calls

---

## 📋 Detailed Issue List

Fetching full details...

---

## 🎯 Priority Fixes

### 1. Fix React Hooks (CRITICAL - 33 issues)
**File:** `src/app/tasks/page.tsx`

**Problem:** Hooks called conditionally (lines 81-89, 97)

**Fix:** Move all hooks to top of component, outside any conditionals

### 2. Fix Empty Blocks (38 issues)
**Rule:** `typescript:S1082`

**Fix:** Add proper error handling or remove unnecessary blocks

### 3. Fix Reduce() Calls (2+ issues)
**Files:** 
- `src/lib/integrations/migration-helper.ts:65`
- `src/components/contacts/contact-detail-view.tsx:274`

**Fix:** Add initial value parameter to reduce()

---

## 🔗 View Full Details

- **SonarCloud Dashboard:** https://sonarcloud.io/project/issues?id=AgenttoffeeOrg_dental-crm-private&resolved=false&types=BUG
- **API Data:** `architecture-reports/sonarcloud-all-issues.json`

---

**Note:** Full details are being fetched. Check back in a moment for complete report.



