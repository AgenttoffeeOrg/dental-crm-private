# Adding Custom Scorers

## Developer Guide

This guide shows how to add new scoring categories or customize existing ones.

---

## Example: Adding a "Social Media Presence" Scorer

### Step 1: Define Metrics Type

```typescript
// src/lib/marketing-audit/types/index.ts

export interface SocialMediaMetrics {
  facebook: {
    page_exists: boolean;
    followers: number;
    post_frequency: number; // posts per month
    engagement_rate: number; // percentage
  };
  instagram: {
    profile_exists: boolean;
    followers: number;
    post_frequency: number;
    engagement_rate: number;
  };
  twitter: {
    profile_exists: boolean;
    followers: number;
    tweet_frequency: number;
  };
  social_score: number; // 0-100
}

// Add to AllMetrics
export interface AllMetrics {
  // ...existing...
  social: SocialMediaMetrics;
}
```

### Step 2: Create Scorer Class

```typescript
// src/lib/marketing-audit/scoring/social-scorer.ts

import { BaseScorer } from './base-scorer';
import type { SocialMediaMetrics, Recommendation } from '../types';

export class SocialScorer extends BaseScorer {
  calculateScore(metrics: SocialMediaMetrics): number {
    let score = 0;
    
    // Facebook presence (30 points)
    score += metrics.facebook.page_exists ? 10 : 0;
    score += Math.min((metrics.facebook.followers / 1000) * 10, 10);
    score += Math.min((metrics.facebook.post_frequency / 20) * 10, 10);
    
    // Instagram presence (30 points)
    score += metrics.instagram.profile_exists ? 10 : 0;
    score += Math.min((metrics.instagram.followers / 1000) * 10, 10);
    score += Math.min((metrics.instagram.post_frequency / 20) * 10, 10);
    
    // Twitter presence (20 points)
    score += metrics.twitter.profile_exists ? 10 : 0;
    score += Math.min((metrics.twitter.followers / 500) * 10, 10);
    
    // Overall engagement (20 points)
    const avgEngagement = (metrics.facebook.engagement_rate + metrics.instagram.engagement_rate) / 2;
    score += (avgEngagement / 5) * 20; // 5% engagement = perfect score
    
    return Math.min(score, 100);
  }
  
  getDefaultWeights(): Record<string, number> {
    return {
      facebook: 0.30,
      instagram: 0.30,
      twitter: 0.20,
      engagement: 0.20,
    };
  }
  
  generateRecommendations(metrics: SocialMediaMetrics, score: number): Recommendation[] {
    const recs: Partial<Recommendation>[] = [];
    
    // Facebook page recommendation
    if (!metrics.facebook.page_exists) {
      recs.push({
        category: 'social_media',
        title: 'Create Facebook Business Page',
        description: 'No Facebook page detected. 70% of dental patients use Facebook to find practices.',
        impact: 'high',
        effort: 'low',
        confidence: 'high',
        estimated_hours: 2,
        current_value: 0,
        target_value: 1,
        action_steps: [
          'Create Facebook Business Page',
          'Add complete business information',
          'Upload 10+ photos',
          'Post introduction and services',
          'Enable messaging',
        ],
        evidence: [this.createEvidence('facebook_page_exists', 'manual', false)],
      });
    }
    
    // ... more recommendations
    
    recs.forEach(rec => {
      rec.priority_score = this.calculatePriority(rec as any);
    });
    
    return recs.sort((a, b) => (b.priority_score || 0) - (a.priority_score || 0)) as Recommendation[];
  }
}
```

### Step 3: Update Composite Scorer

```typescript
// src/lib/marketing-audit/scoring/composite-scorer.ts

getDefaultWeights(): Record<string, number> {
  return {
    technical: 0.20,  // Reduced from 0.25
    local: 0.25,      // Reduced from 0.30
    content: 0.15,    // Reduced from 0.20
    analytics: 0.15,  // Kept same
    conversion: 0.10, // Kept same
    social: 0.15,     // NEW
  };
}
```

### Step 4: Update Orchestrator

```typescript
// src/lib/marketing-audit/orchestrator.ts

import { SocialScorer } from './scoring/social-scorer';

export class AuditOrchestrator {
  private scorers = {
    // ...existing scorers...
    social: new SocialScorer(),
  };
  
  private async calculateScores(metrics: AllMetrics): Promise<Scores> {
    return {
      // ...existing scores...
      social: this.scorers.social.calculateScore(metrics.social),
      composite: this.scorers.composite.calculateCompositeScore({
        technical,
        local,
        content,
        analytics,
        conversion,
        social, // Add to composite
      }),
    };
  }
  
  private async generateRecommendations(metrics: AllMetrics, scores: Scores) {
    const allRecs = [
      // ...existing...
      ...this.scorers.social.generateRecommendations(metrics.social, scores.social),
    ];
    
    return allRecs.sort((a, b) => b.priority_score - a.priority_score).slice(0, 20);
  }
}
```

### Step 5: Create UI Component

```typescript
// src/components/marketing-audit/social-media/social-media-tab.tsx

export function SocialMediaTab({ metrics, score, recommendations }) {
  return (
    <div>
      <h2>Social Media Presence</h2>
      <ScoreBadge score={score} />
      {/* Display metrics */}
      {/* Show recommendations */}
    </div>
  );
}
```

### Step 6: Add to Sub-Scores Grid

```typescript
// src/components/marketing-audit/dashboard/sub-scores-grid.tsx

const scores = [
  // ...existing scores...
  {
    category: 'social',
    label: 'Social Media',
    score: audit.social_score || 0,
    weight: '15%',
    icon: Share2,
    description: 'Facebook, Instagram, Twitter presence',
    color: 'pink',
  },
];
```

### Step 7: Add Database Column

```sql
-- Add to marketing_audit_runs table
ALTER TABLE marketing_audit_runs 
ADD COLUMN social_score DECIMAL(5,2) CHECK (social_score BETWEEN 0 AND 100);
```

### Step 8: Write Tests

```typescript
// src/lib/marketing-audit/__tests__/social-scorer.test.ts

describe('SocialScorer', () => {
  it('should score social presence correctly', () => {
    // Test implementation
  });
});
```

---

## Scorer Interface

All scorers must implement:

```typescript
export abstract class BaseScorer {
  // Calculate 0-100 score
  abstract calculateScore(metrics: any): number;
  
  // Return default weights for components
  abstract getDefaultWeights(): Record<string, number>;
  
  // Generate recommendations
  abstract generateRecommendations(metrics: any, score: number): Recommendation[];
}
```

---

## Scoring Best Practices

### 1. **Use Weighted Components**
Break score into logical sub-components with weights.

```typescript
score += (metric1 / threshold1) * weight1;
score += (metric2 / threshold2) * weight2;
```

### 2. **Normalize to 0-100**
Always return score between 0 and 100.

```typescript
return Math.min(Math.round(score * 10) / 10, 100);
```

### 3. **Handle Missing Data**
Gracefully handle undefined/null values.

```typescript
const value = metrics.optional_field !== undefined 
  ? (metrics.optional_field / 100) * 20 
  : 10; // Default to 50% if no data
```

### 4. **Use Helper Functions**
Leverage normalize() and inverseNormalize().

```typescript
// Higher is better
score += this.normalize(backlinks, 0, 100) * 0.4;

// Lower is better (e.g., load time)
score += this.inverseNormalize(loadTime, 1.0, 5.0) * 0.3;
```

---

## Recommendation Templates

### Good Recommendation Structure:

```typescript
{
  category: 'social_media',
  title: 'Create Instagram Business Profile',
  description: 'Clear explanation of current state and target state',
  impact: 'high',           // Business value
  effort: 'low',            // Time required
  confidence: 'high',       // How certain we are
  estimated_hours: 2,       // Realistic estimate
  current_value: 0,         // Quantified current state
  target_value: 1,          // Quantified goal
  action_steps: [           // Specific, actionable steps
    'Step 1: Do this',
    'Step 2: Then this',
    'Step 3: Finally this',
  ],
  evidence: [               // Link to source data
    { metric: 'instagram_exists', source: 'manual', value: false }
  ],
}
```

### Recommendation Guidelines:

- **Specific:** "Add Instagram Business Profile" not "Improve social media"
- **Actionable:** Step-by-step instructions
- **Measurable:** Current vs target values
- **Realistic:** Achievable estimated hours
- **Prioritized:** Calculated priority score

---

## Testing Your Scorer

### Unit Test Template:

```typescript
describe('MyScorer', () => {
  let scorer: MyScorer;
  
  beforeEach(() => {
    scorer = new MyScorer();
  });
  
  it('should return 100 for perfect metrics', () => {
    const perfect = { /* perfect metrics */ };
    expect(scorer.calculateScore(perfect)).toBe(100);
  });
  
  it('should return 0 for empty metrics', () => {
    const empty = { /* all zeros */ };
    expect(scorer.calculateScore(empty)).toBe(0);
  });
  
  it('should generate recommendations for issues', () => {
    const metrics = { /* metrics with issues */ };
    const recs = scorer.generateRecommendations(metrics, 50);
    expect(recs.length).toBeGreaterThan(0);
  });
});
```

---

## Updating Composite Weights

When adding a new scorer, rebalance weights so they sum to 1.0:

**Before (5 scorers):**
```
Technical:  0.25
Local:      0.30
Content:    0.20
Analytics:  0.15
Conversion: 0.10
────────────────
Total:      1.00
```

**After (6 scorers):**
```
Technical:  0.20 (-0.05)
Local:      0.25 (-0.05)
Content:    0.15 (-0.05)
Analytics:  0.15 (same)
Conversion: 0.10 (same)
Social:     0.15 (NEW)
────────────────
Total:      1.00
```

Adjust based on importance for your industry.

---

## Advanced: Conditional Scoring

Some metrics might only apply to certain practice types:

```typescript
calculateScore(metrics: Metrics, practiceType?: string): number {
  let score = 0;
  
  // Base scoring (applies to all)
  score += this.scoreBasicMetrics(metrics);
  
  // Conditional scoring
  if (practiceType === 'orthodontist') {
    score += this.scoreOrthoSpecific(metrics);
  } else if (practiceType === 'cosmetic') {
    score += this.scoreCosmeticSpecific(metrics);
  }
  
  return Math.min(score, 100);
}
```

---

**Questions?** See `architecture.md` or contact development team.

