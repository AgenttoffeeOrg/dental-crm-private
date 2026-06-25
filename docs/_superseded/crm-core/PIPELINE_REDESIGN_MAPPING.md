# CRM Pipeline Redesign - Field Mapping & Implementation Plan

## 📋 Codebase Audit Results

### Current Implementation Analysis

#### Deal Type Structure
```typescript
// From src/types/database.ts
interface Deal {
  id: string
  tenant_id: string
  contact_id: string
  pipeline_id: string
  stage_id: string
  title: string
  value_estimate_cents: number  // ✅ Matches spec "amount"
  currency: string
  treatment_tags: string[]       // ✅ Maps to "service/treatment"
  owner_user_id?: string         // ✅ Maps to "assignee"
  location_id?: string           // ✅ Matches spec "practice"
  created_at: string
  updated_at: string
  // MISSING: probability, health, next_action
}

interface DealWithRelations extends Deal {
  contact: Contact
  stage: PipelineStage
  owner?: AppUser
  activities?: Activity[]
  tasks?: Task[]
}
```

#### DnD Library
- **Library:** `@dnd-kit/core` + `@dnd-kit/sortable` ✅
- **Current Implementation:** `useSortable` hook in `DealCard`
- **Drag Handle:** Entire card via `{...listeners}` on Card root ✅
- **Context:** `DndContext` in `pipeline-board.tsx`

### Field Mapping: Spec → Our Codebase

| Spec Requirement | Our Field | Status | Notes |
|---|---|---|---|
| **service/treatment** | `treatment_tags` | ✅ EXISTS | Array of treatment categories |
| **patient/case title** | `title` + `contact.full_name` | ✅ EXISTS | Compound display |
| **amount** | `value_estimate_cents` | ✅ EXISTS | Stored in cents, display in £ |
| **age** | `created_at` → computed | ✅ DERIVED | Calculate days from `created_at` |
| **assignee** | `owner_user_id` → `owner.full_name` | ✅ EXISTS | Via join |
| **practice** | `location_id` → location name | ✅ EXISTS | Need to join locations |
| **calls** | `activities` count (type=call) | ✅ DERIVED | Filter activities array |
| **notes** | `activities` count (type=note) | ✅ DERIVED | Filter activities array |
| **last follow-up** | `updated_at` or latest activity | ✅ DERIVED | Max activity timestamp |
| **Probability** | — | ❌ MISSING | **NEED TO ADD** |
| **Health** | — | ❌ MISSING | **NEED TO ADD** |
| **Next Action** | `tasks` (first incomplete) | ⚠️ PARTIAL | Tasks exist, need mapping |

### Intelligence Fields - Implementation Strategy

#### 1. Probability (0-100%)
**Fallback Logic:**
```typescript
function deriveProbability(deal: DealWithRelations, stages: PipelineStage[]): number {
  // Find stage position in pipeline
  const stagePosition = stages.find(s => s.id === deal.stage_id)?.position ?? 0
  const totalStages = stages.length
  
  // Linear mapping: position 0 = 10%, last position = 90%
  return Math.round(10 + (stagePosition / (totalStages - 1 || 1)) * 80)
}
```

**Display:** Mini ring chart SVG (36x36px) with percentage

#### 2. Health Status
**Calculation:**
```typescript
type HealthStatus = 'Excellent' | 'Good' | 'At Risk' | 'Stalled'

function deriveHealth(deal: DealWithRelations): HealthStatus {
  const daysSinceUpdate = getDaysSince(deal.updated_at)
  
  if (daysSinceUpdate <= 2) return 'Excellent'
  if (daysSinceUpdate <= 4) return 'Good'
  if (daysSinceUpdate <= 7) return 'At Risk'
  return 'Stalled'
}
```

**Display:** Pill with icon and color (green/amber/red)

#### 3. Next Action
**Mapping:**
```typescript
interface NextAction {
  label: string          // e.g., "Follow-up call"
  dueDate: Date | null
  isOverdue: boolean
  daysUntil: number      // negative if overdue
}

function deriveNextAction(deal: DealWithRelations): NextAction | null {
  // Find nearest incomplete task with due_date
  const openTasks = deal.tasks?.filter(t => t.status !== 'completed') ?? []
  if (openTasks.length === 0) return null
  
  const nextTask = openTasks.sort((a, b) => 
    new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
  )[0]
  
  const now = new Date()
  const due = new Date(nextTask.due_date)
  const daysUntil = Math.floor((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  
  return {
    label: nextTask.title,
    dueDate: due,
    isOverdue: daysUntil < 0,
    daysUntil
  }
}
```

**Display:** Pill with action text and due date (color: info/amber/red based on urgency)

### Meta Row - Data Sources

| Display | Source | Computation |
|---|---|---|
| **Assignee Avatar** | `owner.full_name` | Initials from name |
| **Practice** | `location_id` → location name | Join locations table |
| **Calls Count** | `activities` | `filter(a => a.type === 'call').length` |
| **Notes Count** | `activities` | `filter(a => a.type === 'note').length` |
| **Last Follow-up** | `activities` | `max(a => a.created_at)` formatted as "2d ago" |

## 🎨 Design Tokens Extension

### Add to tailwind.config.ts

```typescript
theme: {
  extend: {
    colors: {
      'brand-navy': {
        DEFAULT: '#0D1E40',
        50: '#E8ECF4',
        100: '#D1D9E9',
        500: '#1E3A5F',
        600: '#172E4D',
        700: '#0D1E40',
        800: '#0A1730',
        900: '#060F20',
      },
      'health': {
        excellent: '#22C55E',
        good: '#22C55E',
        risk: '#F59E0B',
        stalled: '#EF4444',
      },
    },
    boxShadow: {
      'card-base': '0 2px 12px rgba(0, 0, 0, 0.06)',
      'card-hover': '0 6px 20px rgba(0, 0, 0, 0.10)',
      'card-drag': '0 12px 32px rgba(0, 0, 0, 0.15)',
    },
  },
}
```

## 📦 New Component Structure

### Components to Create
1. `src/components/pipeline/deal-intelligence/ProbabilityRing.tsx`
2. `src/components/pipeline/deal-intelligence/HealthPill.tsx`
3. `src/components/pipeline/deal-intelligence/NextActionPill.tsx`
4. `src/components/pipeline/DealCardPremium.tsx` (new redesigned card)
5. `src/components/pipeline/PipelineColumnPremium.tsx` (updated column)
6. `src/components/pipeline/PipelineSummaryBar.tsx` (new summary bar)
7. `src/lib/intelligence/deal-intelligence.ts` (intelligence calculation utils)

### Components to Update
1. `src/components/pipeline/pipeline-board.tsx` - Add summary bar, update styling
2. `src/components/pipeline/pipeline-unified-header.tsx` - Already updated with premium button

## 🔄 Migration Strategy (Zero Regression)

### Phase 1: Add Intelligence Layer (Non-Breaking)
- Add new intelligence calculation utilities
- Extend types with optional intelligence fields
- Build new UI components in isolation

### Phase 2: Create Premium Components (Parallel)
- Build `DealCardPremium` alongside existing `DealCard`
- Build `PipelineColumnPremium` alongside existing column
- Use feature flag or separate route for testing

### Phase 3: Swap Implementation (Atomic)
- Replace `DealCard` import with `DealCardPremium`
- Replace column component
- Add summary bar to board
- Single commit, easy rollback

### Phase 4: Cleanup
- Remove old components
- Remove feature flag if used

## ✅ Checklist Before Implementation

- [x] DnD library identified: `@dnd-kit`
- [x] Field mapping complete
- [x] Intelligence derivation logic defined
- [x] Design tokens planned
- [x] Component structure defined
- [x] Zero-regression strategy confirmed

## 🚀 Implementation Order

1. **Create intelligence utilities** (`deal-intelligence.ts`)
2. **Create UI sub-components** (Ring, Pills)
3. **Build `DealCardPremium`** with full intelligence
4. **Update `PipelineColumnPremium`** with sticky header
5. **Add `PipelineSummaryBar`** to board
6. **Implement Compact Mode** toggle
7. **Apply premium styling** to filters/board
8. **Test & verify** no regressions
9. **Document & screenshot**

## 📝 Notes for Implementation

- Keep all existing filters, search, sort intact
- Preserve analytics hooks (no removal of tracking calls)
- Maintain RLS policies (all queries use proper tenant filtering)
- Keep drag-drop behavior identical
- Ensure keyboard navigation still works
- Test with/without intelligence data (graceful degradation)

## 🎯 Success Criteria

✅ Board shows summary bar with total deals, projected value, conversion rate  
✅ Columns have sticky headers with stage name, total value, deal count  
✅ Cards show intelligence row (Probability + Health + Next Action)  
✅ Cards show meta row (assignee, practice, calls, notes, last follow-up)  
✅ Entire card is draggable with premium hover/drag states  
✅ Compact mode toggle works and persists  
✅ No functional regressions (filters, search, sort, navigation all work)  
✅ Premium deep-navy/white aesthetic applied throughout  
✅ 60fps drag performance maintained  
✅ Accessibility preserved (keyboard nav, screen readers)  


