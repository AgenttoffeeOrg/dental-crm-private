# Type Changes & Fallback Logic Documentation

## Overview
This document details all type extensions and intelligence calculation logic for the premium pipeline redesign.

---

## Type Extensions

### 1. Deal Intelligence Types (`src/types/deal-intelligence.ts`)

#### New Enums
```typescript
type DealHealth = 'Excellent' | 'Good' | 'At Risk' | 'Stalled'
type ActionUrgency = 'info' | 'warning' | 'critical'
```

#### Core Intelligence Interfaces
```typescript
interface DealProbability {
  percentage: number       // 0-100
  isManual: boolean       // true if user-set, false if derived
  source: 'stage' | 'manual' | 'ml'
}

interface DealHealthInfo {
  status: DealHealth
  daysSinceUpdate: number
  lastActivityDate: Date | null
  color: 'green' | 'amber' | 'red'
}

interface DealNextAction {
  label: string              // e.g., "Follow-up call"
  dueDate: Date
  isOverdue: boolean
  daysUntil: number          // Negative if overdue
  urgency: ActionUrgency
  taskId?: string
}

interface DealIntelligence {
  probability: DealProbability | null
  health: DealHealthInfo
  nextAction: DealNextAction | null
}
```

#### Extended Deal Type
```typescript
interface DealWithIntelligence extends DealWithRelations {
  intelligence: DealIntelligence   // Always present
  metadata: {
    age: number                     // Days since created
    daysInStage: number            // Days in current stage
    callsCount: number             // Number of call activities
    notesCount: number             // Number of note activities
    lastFollowUp: Date | null      // Most recent activity
    practiceName: string | null    // Location name
  }
}
```

**Non-breaking:** Extends existing `DealWithRelations`, doesn't modify it.

---

## Fallback Logic

### 1. Probability Calculation

**Function:** `calculateProbability(params: ProbabilityParams): DealProbability`

**Algorithm:**
```typescript
// Linear interpolation based on stage position
const stageIndex = sortedStages.findIndex(s => s.id === currentStageId)
const percentage = 10 + (stageIndex / (totalStages - 1)) * 80

// Result: First stage = 10%, Last stage = 90%
```

**Fallbacks:**
- If stage not found → 10%
- If no stages exist → 10%
- Always between 10-90% (never 0% or 100%)

**Example:**
```typescript
Pipeline with 5 stages:
  Stage 0 (Lead)         → 10%
  Stage 1 (Consultation) → 30%
  Stage 2 (Proposal)     → 50%
  Stage 3 (Negotiation)  → 70%
  Stage 4 (Closed Won)   → 90%
```

**Future:** Can be overridden by:
- Manual user input (stored in DB)
- ML model predictions (API call)

---

### 2. Health Calculation

**Function:** `calculateHealth(params: HealthParams): DealHealthInfo`

**Algorithm:**
```typescript
const daysSinceUpdate = Math.floor(
  (now - lastActivityDate) / (1000 * 60 * 60 * 24)
)

if (daysSinceUpdate <= 2)  → 'Excellent' (green)
if (daysSinceUpdate <= 4)  → 'Good' (green)
if (daysSinceUpdate <= 7)  → 'At Risk' (amber)
else                       → 'Stalled' (red)
```

**Thresholds (configurable):**
```typescript
export const HEALTH_THRESHOLDS = {
  EXCELLENT: 2,   // 0-2 days
  GOOD: 4,        // 3-4 days
  AT_RISK: 7,     // 5-7 days
  // 8+ days = Stalled
}
```

**Data Source Priority:**
1. `lastActivityDate` from activities array (most recent)
2. Fallback to `deal.updated_at` if no activities
3. Compare against current time

**Activities Considered:**
- Calls, notes, emails, meetings
- Sorted by `created_at` desc
- Filters out null/undefined timestamps

---

### 3. Next Action Calculation

**Function:** `calculateNextAction(params: NextActionParams): DealNextAction | null`

**Algorithm:**
```typescript
// 1. Filter to incomplete tasks with due dates
const openTasks = tasks.filter(t => 
  t.status !== 'completed' && 
  t.status !== 'cancelled' &&
  t.due_date !== null
)

// 2. Sort by due_date (earliest first)
const sortedTasks = openTasks.sort((a, b) => 
  new Date(a.due_date) - new Date(b.due_date)
)

// 3. Take first task
const nextTask = sortedTasks[0]

// 4. Calculate days until due
const daysUntil = Math.floor((dueDate - now) / (1000 * 60 * 60 * 24))

// 5. Determine urgency
const urgency = getUrgencyLevel(daysUntil)
```

**Urgency Thresholds:**
```typescript
export const URGENCY_THRESHOLDS = {
  CRITICAL: 0,    // Overdue or due today → red
  WARNING: 2,     // Due within 2 days → amber
  // 3+ days → blue (info)
}
```

**Fallbacks:**
- If no tasks → `null` (Next Action not shown)
- If tasks but no due dates → `null`
- If all tasks completed/cancelled → `null`

**Display Format:**
```typescript
daysUntil = -3  → "Overdue 3d" (red)
daysUntil = 0   → "Due today" (red)
daysUntil = 1   → "Due in 1d" (amber)
daysUntil = 5   → "Due in 5d" (blue)
daysUntil = 10  → "Due in 1w" (blue)
```

---

### 4. Metadata Calculation

**Functions:** Multiple utility functions

#### Age (Days Since Created)
```typescript
function calculateAge(createdAt: Date): number {
  return Math.floor((now - createdAt) / (1000 * 60 * 60 * 24))
}
```

#### Days in Stage
```typescript
function calculateDaysInStage(updatedAt: Date): number {
  // TODO: Use stage_changed_at if available
  // Currently approximates with updated_at
  return Math.floor((now - updatedAt) / (1000 * 60 * 60 * 24))
}
```

#### Activity Counts
```typescript
function countActivitiesByType(activities: Activity[], type: string): number {
  return activities.filter(a => a.type === type).length
}

// Usage:
callsCount = countActivitiesByType(activities, 'call')
notesCount = countActivitiesByType(activities, 'note')
```

#### Practice Name
```typescript
// From location_id lookup
const practiceName = locationMap.get(deal.location_id) || null
```

---

## Main Enhancer Function

**Function:** `enhanceDealWithIntelligence()`

```typescript
export function enhanceDealWithIntelligence(
  deal: DealWithRelations,
  stages: PipelineStage[],
  locationName: string | null = null
): DealWithIntelligence {
  // 1. Calculate probability
  const probability = calculateProbability({
    stages,
    currentStageId: deal.stage_id
  })
  
  // 2. Calculate health
  const lastActivityDate = getMostRecentActivityDate(deal.activities)
  const health = calculateHealth({
    updatedAt: new Date(deal.updated_at),
    lastActivityDate
  })
  
  // 3. Calculate next action
  const nextAction = calculateNextAction({
    tasks: deal.tasks || [],
    currentDate: new Date()
  })
  
  // 4. Build intelligence object
  const intelligence: DealIntelligence = {
    probability,
    health,
    nextAction
  }
  
  // 5. Calculate metadata
  const metadata = {
    age: calculateAge(deal.created_at),
    daysInStage: calculateDaysInStage(deal.updated_at),
    callsCount: countActivitiesByType(deal.activities, 'call'),
    notesCount: countActivitiesByType(deal.activities, 'note'),
    lastFollowUp: lastActivityDate,
    practiceName: locationName
  }
  
  return {
    ...deal,
    intelligence,
    metadata
  }
}
```

**Performance:** Wrapped in `useMemo` in component to prevent recalculation on every render.

---

## Color Mappings

### Probability Colors
```typescript
percentage >= 70  → #22C55E (green) "High"
percentage >= 40  → #3B82F6 (blue) "Medium"
percentage < 40   → #EF4444 (red) "Low"
```

### Health Colors
```typescript
'Excellent' → bg-green-50, text-green-700, border-green-200, icon: 🟢
'Good'      → bg-green-50, text-green-600, border-green-200, icon: ✓
'At Risk'   → bg-amber-50, text-amber-700, border-amber-200, icon: ⚠️
'Stalled'   → bg-red-50, text-red-700, border-red-200, icon: 🔴
```

### Urgency Colors
```typescript
'info'     → bg-blue-50, text-blue-700, border-blue-200
'warning'  → bg-amber-50, text-amber-700, border-amber-200
'critical' → bg-red-50, text-red-700, border-red-200
```

---

## Safe Defaults

### Missing Data Handling
```typescript
// No activities
health.lastActivityDate = null
health.status = calculateHealth({ updatedAt: deal.updated_at, lastActivityDate: null })

// No tasks
intelligence.nextAction = null  // Component gracefully hides Next Action pill

// No owner
metadata shows no owner avatar

// No location
metadata.practiceName = null  // Component hides location icon

// No treatment tags
formatTreatmentTags([]) → "General"
```

### Type Guards
```typescript
function hasIntelligence(deal): deal is DealWithIntelligence {
  return 'intelligence' in deal
}

function hasNextAction(intelligence): intelligence is ... {
  return intelligence.nextAction !== null
}
```

---

## Database Schema (No Changes Required!)

**Existing fields used:**
- `deals.created_at` → age
- `deals.updated_at` → health, days in stage
- `deals.stage_id` → probability
- `deals.location_id` → practice name
- `deals.treatment_tags` → service/treatment
- `deals.value_estimate_cents` → money display
- `deals.owner_user_id` → owner avatar
- `activities[]` → calls/notes count, last follow-up, health
- `tasks[]` → next action
- `contact` → contact info
- `owner` → owner info

**Future optional additions:**
- `deals.stage_changed_at` → more accurate days in stage
- `deals.manual_probability` → override stage-based calculation
- `deals.ml_probability` → ML model prediction

---

## Testing Scenarios

### Test with Missing Data
```typescript
// Deal with no activities
deal.activities = []
→ health = based on updated_at
→ callsCount = 0, notesCount = 0
→ lastFollowUp = null

// Deal with no tasks
deal.tasks = []
→ nextAction = null (pill hidden)

// Deal with completed tasks only
deal.tasks = [{ status: 'completed', ... }]
→ nextAction = null

// Deal with tasks but no due dates
deal.tasks = [{ status: 'pending', due_date: null }]
→ nextAction = null
```

### Test Edge Cases
```typescript
// Single-stage pipeline
stages = [{ name: 'All', position: 0 }]
→ probability = 10% (avoids division by zero)

// Deal in unknown stage
currentStageId = 'nonexistent'
→ probability = 10% (safe default)

// Negative days (future date bug)
daysSinceUpdate = -5
→ health = 'Excellent' (Math.floor handles negatives)

// Task due in past
daysUntil = -10
→ isOverdue = true, urgency = 'critical', display = "Overdue 10d"
```

---

## Summary

✅ **Zero database changes**  
✅ **All fallbacks safe and tested**  
✅ **Graceful degradation for missing data**  
✅ **Type-safe with TypeScript**  
✅ **Performance-optimized with useMemo**  
✅ **Future-proof for ML/manual overrides**

All intelligence is computed client-side using existing deal data. No backend changes required.


