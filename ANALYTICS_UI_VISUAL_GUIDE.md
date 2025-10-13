# 📐 Analytics UI Visual Guide
## Detailed Design Specifications & Wireframes

**Purpose:** Show exactly what the UI will look like before building

---

## 🎨 Design System

### **Color Palette**

```
Primary Colors:
■ #667eea - Primary (Indigo) - Main brand, primary actions
■ #764ba2 - Secondary (Purple) - Secondary elements
■ #f093fb - Accent (Pink) - Highlights, special elements

Success & Status:
■ #10b981 - Success (Green) - Positive metrics, wins
■ #f59e0b - Warning (Amber) - Warnings, attention needed
■ #ef4444 - Danger (Red) - Negative metrics, risks
■ #3b82f6 - Info (Blue) - Information, neutral highlights

Grays:
■ #111827 - Text Primary (Gray-900)
■ #374151 - Text Secondary (Gray-700)
■ #6b7280 - Text Tertiary (Gray-500)
■ #d1d5db - Border (Gray-300)
■ #f3f4f6 - Background Light (Gray-100)
■ #ffffff - Background White
```

### **Typography**

```
Headings:
H1: 2xl (24px), Bold (700), Gray-900
H2: xl (20px), Bold (700), Gray-900
H3: lg (18px), Semibold (600), Gray-900
H4: base (16px), Semibold (600), Gray-900

Body:
Normal: sm (14px), Regular (400), Gray-700
Small: xs (12px), Regular (400), Gray-500
Label: sm (14px), Medium (500), Gray-700
```

### **Spacing Scale**

```
xs:  4px
sm:  8px
md:  16px
lg:  24px
xl:  32px
2xl: 48px
3xl: 64px
```

---

## 📊 Component Library

### **1. Metric Card**

```
┌────────────────────────────────────┐
│ [Icon]  Metric Name                │ ← Header
│                                    │
│ $127,450                           │ ← Value (Large, Bold)
│                                    │
│ ↗ +12.3% vs last month            │ ← Trend (Color-coded)
│ 45 deals closed                    │ ← Context (Small, Gray)
└────────────────────────────────────┘
```

**Variants:**
- **Positive Trend:** Green ↗ arrow, green percentage
- **Negative Trend:** Red ↘ arrow, red percentage
- **Neutral:** Gray → arrow, gray percentage

**States:**
- **Loading:** Skeleton shimmer animation
- **Error:** Gray with error icon
- **Empty:** Dashed border, "--" value

---

### **2. Data Table**

```
┌──────────────────────────────────────────────────────────────────────┐
│ [🔍 Search...] [Filter ▾] [Columns ▾]              [⬇ Export] [⚙️]  │ ← Toolbar
├──────────────────────────────────────────────────────────────────────┤
│ [☐] Name ↕      Contact    Owner    Stage      Value    Age  Actions│ ← Header (Sticky)
├──────────────────────────────────────────────────────────────────────┤
│ [☐] Deal #1234  John Doe   Sarah    Proposal   $45K     12d  [...] │
│ [☐] Deal #1235  Jane Smith Mike     Negotia.   $32K     8d   [...] │
│ [☐] Deal #1236  Bob Jones  Lisa     Qualified  $28K     23d  [...] │
│ ...                                                                  │
├──────────────────────────────────────────────────────────────────────┤
│ Showing 1-25 of 487 • [< Previous] [1 2 3 ... 20] [Next >]         │ ← Pagination
└──────────────────────────────────────────────────────────────────────┘
```

**Features:**
- Column sorting (click header, shows ↕ ↑ ↓)
- Row hover (subtle background change)
- Row selection (checkboxes)
- Bulk actions bar (appears when rows selected)
- Responsive (horizontal scroll on mobile)

---

### **3. Chart Container**

```
┌────────────────────────────────────────────────────────────────────┐
│ Revenue Trend                                        [📷] [⬇]      │ ← Title + Actions
│ ┌────────────────────────────────────────────────────────────────┐ │
│ │                                                      ◆ 2024     │ │
│ │ 200K ┤                                              ◆ 2023     │ │
│ │      │                                     ◆                   │ │
│ │ 150K ┤                              ◆                          │ │
│ │      │                       ◆                                 │ │
│ │ 100K ┤                ◆                                        │ │
│ │      │         ◆                                               │ │
│ │  50K ┤  ◆                                                      │ │
│ │      └────────────────────────────────────────────────────────│ │
│ │       Jan  Feb  Mar  Apr  May  Jun  Jul  Aug  Sep  Oct  Nov  │ │
│ └────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────┘
```

**Features:**
- Interactive tooltips on hover
- Legend (click to toggle series)
- Download as PNG/SVG
- Zoom/pan (for time-series)

---

## 📄 Page Layouts

### **Executive Dashboard**

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 📊 Analytics & Insights                    [Time: 30d ▾] [Export] [⚙️] │ ← Header
├─────────────────────────────────────────────────────────────────────────┤
│ [Executive] [CRM] [Marketing] [Custom Reports]                          │ ← Tabs
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│ ┌───────────────┐ ┌───────────────┐ ┌───────────────┐ ┌──────────────┐│
│ │ 💰 Revenue    │ │ 🎯 Pipeline   │ │ 👥 Contacts   │ │ 🏆 Win Rate  ││ ← KPI Row
│ │ $456,789      │ │ $2.1M         │ │ 1,234         │ │ 68.5%        ││
│ │ ↗ +12.3%      │ │ ↗ +8.7%       │ │ ↗ +15.2%      │ │ ↗ +2.3%      ││
│ └───────────────┘ └───────────────┘ └───────────────┘ └──────────────┘│
│                                                                          │
│ ┌──────────────────────────────────────────────────────────────────────┐│
│ │ 🤖 AI Insights                                                       ││
│ │                                                                      ││ ← AI Insights
│ │ 📈 OPPORTUNITY: Deal "Smith Dental" has 87% win probability...      ││
│ │ ⚠️  RISK: 5 high-value deals inactive for 14+ days ($127K at risk)  ││
│ │ 💡 TREND: Referral leads closing 2.3x faster than other sources     ││
│ └──────────────────────────────────────────────────────────────────────┘│
│                                                                          │
│ ┌──────────────────────────────────┐ ┌──────────────────────────────┐  │
│ │ Revenue & Activity Trends        │ │ Sales Funnel                 │  │ ← Charts Row 1
│ │ [Line/Area Chart]                │ │ [Funnel Chart]               │  │
│ │                                  │ │                              │  │
│ │                                  │ │                              │  │
│ └──────────────────────────────────┘ └──────────────────────────────┘  │
│                                                                          │
│ ┌──────────────────────────────────┐ ┌──────────────────────────────┐  │
│ │ Lead Source Performance          │ │ Team Leaderboard             │  │ ← Charts Row 2
│ │ [Bar Chart]                      │ │ [Table with Sparklines]      │  │
│ │                                  │ │                              │  │
│ │                                  │ │                              │  │
│ └──────────────────────────────────┘ └──────────────────────────────┘  │
│                                                                          │
│ ┌────────────────────────────────────────────────────────────────────┐ │
│ │ At-Risk Deals (No Activity 30+ Days)                               │ │ ← Full-Width Table
│ │ [Data Table]                                                        │ │
│ └────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

### **CRM Analytics - Table View**

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 📊 CRM Analytics                           [Time: All Time] [Export]    │
├─────────────────────────────────────────────────────────────────────────┤
│ [Overview] [Deals Table] [Performance] [Pipeline] [Forecasting]         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│ 📋 All Deals                                          [+ New Deal]       │
│                                                                          │
│ ┌──────────────────────────────────────────────────────────────────────┐│
│ │ [🔍 Search by name, contact, or value...]                            ││
│ │                                                                      ││
│ │ Filters: [Stage: All ▾] [Owner: All ▾] [Value: Any ▾] [+ More]     ││
│ ├──────────────────────────────────────────────────────────────────────┤│
│ │ Bulk Actions (3 selected): [Assign] [Move Stage] [Delete]           ││
│ └──────────────────────────────────────────────────────────────────────┘│
│                                                                          │
│ ┌──────────────────────────────────────────────────────────────────────┐│
│ │[☐] Deal Name↕   Contact   Owner   Stage     Value↕  Age  Last Act.  ││
│ ├──────────────────────────────────────────────────────────────────────┤│
│ │[☑] Smile Mkover J.Smith   Sarah   Proposal  $45K    12d  2h ago [...││
│ │[☑] Implants     M.Johnson Mike    Negotia.  $32K    8d   1d ago [...││
│ │[☑] Orthodon.    L.Davis   Lisa    Qualified $28K    23d  5d ago [...││
│ │[☐] Crown        T.Wilson  John    Lead      $8K     3d   3h ago [...││
│ │[☐] Whitening    S.Brown   Sarah   Proposal  $2.5K   15d  2d ago [...││
│ │...                                                                   ││
│ ├──────────────────────────────────────────────────────────────────────┤│
│ │ Showing 1-25 of 487 deals  [< Previous] [1 2 3 ... 20] [Next >]    ││
│ └──────────────────────────────────────────────────────────────────────┘│
│                                                                          │
│ Quick Stats: Total Value: $2.1M • Weighted: $1.4M • Avg: $4,329        │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

### **CRM Analytics - Forecasting View**

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 📊 CRM Analytics - Revenue Forecasting                                  │
├─────────────────────────────────────────────────────────────────────────┤
│ [Overview] [Deals Table] [Performance] [Pipeline] [Forecasting]         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│ ┌────────────────────────────────────────────────────────────────────┐  │
│ │ 🎯 Q4 2025 Goal Progress                                           │  │
│ │                                                                    │  │
│ │ Goal: $500,000                                                     │  │
│ │ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 87% │  │
│ │                                                                    │  │
│ │ ✅ Closed-Won:        $312,000 (62.4%)                             │  │
│ │ 📊 Commit (>80%):      $78,000 (15.6%)                             │  │
│ │ 📈 Best Case (50-80%): $45,000 (9.0%)                              │  │
│ │ ⏳ Days Remaining:       23 days                                    │  │
│ │                                                                    │  │
│ │ Forecast: $435,000 (87% of goal)                                  │  │
│ │ Status: ⚠️ On Track but Close                                      │  │
│ │                                                                    │  │
│ │ 💡 Need $88K more. Top opportunities:                              │  │
│ │ 1. Smith Dental - $45K (85% prob) - Close this week              │  │
│ │ 2. Johnson Practice - $32K (75% prob) - Follow up today           │  │
│ │ 3. Williams Implants - $28K (65% prob) - Send proposal            │  │
│ └────────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│ ┌────────────────────────────────────────────────────────────────────┐  │
│ │ 📈 Revenue Forecast - Next 90 Days                                 │  │
│ │                                                                    │  │
│ │ 500K ┤                                      ┌─ Forecast (Best)    │  │
│ │      │                                   ╱─┘                       │  │
│ │ 400K ┤                                ╱─┘                          │  │
│ │      │                             ╱─┘      ← Forecast (Expected) │  │
│ │ 300K ┤                          ╱─┘                                │  │
│ │      │                       ╱─┘                                   │  │
│ │ 200K ┤    Closed ─────────╱─┘                                     │  │
│ │      │                                                             │  │
│ │ 100K ┤                                                             │  │
│ │      └─────────────────────────────────────────────────────────── │  │
│ │       Nov 1    Nov 15    Dec 1    Dec 15    Jan 1    Jan 15      │  │
│ │                                                                    │  │
│ │ [80% Confidence] [95% Confidence] [Show Historical Accuracy]      │  │
│ └────────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│ ┌────────────────────────────────────────────────────────────────────┐  │
│ │ 🎲 Deal Win Probability Analysis                                   │  │
│ │                                                                    │  │
│ │ ┌──────────────────────────────────────────────────────────────┐  │  │
│ │ │ Deal Name        Value  Current % Win Factors         Actions││  │
│ │ ├──────────────────────────────────────────────────────────────┤  │  │
│ │ │ Smith Dental     $45K   ████████░ 85%  ✅ Budget ✅ DM  [→] ││  │
│ │ │ Johnson Practice $32K   ███████░░ 75%  ✅ Need ⚠️ Price [→] ││  │
│ │ │ Williams Impl.   $28K   ██████░░░ 65%  ✅ Time ⚠️ Comp  [→] ││  │
│ │ │ Taylor Ortho.    $22K   ████░░░░░ 45%  ⚠️ Budget ⚠️ DM  [→] ││  │
│ │ │ Brown Family     $18K   ███░░░░░░ 35%  ❌ Ready ⚠️ Comp [→] ││  │
│ │ └──────────────────────────────────────────────────────────────┘  │  │
│ │                                                                    │  │
│ │ Click [→] to see detailed analysis and recommendations            │  │
│ └────────────────────────────────────────────────────────────────────┘  │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

### **Marketing Analytics - Attribution View**

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 📊 Marketing Analytics - Attribution                                    │
├─────────────────────────────────────────────────────────────────────────┤
│ [Overview] [Campaigns] [Channels] [Attribution] [Engagement]            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│ ┌────────────────────────────────────────────────────────────────────┐  │
│ │ 🎯 Multi-Touch Attribution Model                                   │  │
│ │                                                                    │  │
│ │ Model: [Data-Driven (ML) ▾] [Compare Models]                      │  │
│ │                                                                    │  │
│ │              Total Revenue Attributed: $267,450                    │  │
│ │                                                                    │  │
│ │        ┌───────────────────────────────────────────┐              │  │
│ │  40%   │ Email Nurture Campaign                    │ $106,980     │  │
│ │        └───────────────────────────────────────────┘              │  │
│ │        ┌─────────────────────────────┐                            │  │
│ │  25%   │ Google Ads                  │ $66,862                    │  │
│ │        └─────────────────────────────┘                            │  │
│ │        ┌───────────────────────┐                                  │  │
│ │  18%   │ Referral Program      │ $48,141                          │  │
│ │        └───────────────────────┘                                  │  │
│ │        ┌───────────────┐                                          │  │
│ │  12%   │ Social Media  │ $32,094                                  │  │
│ │        └───────────────┘                                          │  │
│ │        ┌─────────┐                                                │  │
│ │   5%   │ Other   │ $13,372                                        │  │
│ │        └─────────┘                                                │  │
│ └────────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│ ┌────────────────────────────────────────────────────────────────────┐  │
│ │ 🗺️  Customer Journey Map (Sankey Diagram)                          │  │
│ │                                                                    │  │
│ │ Google Ads ────────────────────┐                                  │  │
│ │     (1000)  ╲                  │                                  │  │
│ │              ╲                 ├─→ Email ───────────┐             │  │
│ │ Facebook ─────→ Website  ──────┤    (600)  ╲        │             │  │
│ │   (500)         (1500)         │            ╲       ├─→ Won       │  │
│ │                                ├─→ Call ─────────→  │  (250)      │  │
│ │ Referral ──────────────────────┤    (400)           │             │  │
│ │   (300)                        │                    │             │  │
│ │                                └─→ WhatsApp ────────┘             │  │
│ │                                     (500)                          │  │
│ │                                                                    │  │
│ │ Most Common Path: Google → Website → Email → Call → Won (87 deals││  │
│ └────────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│ ┌────────────────────────────────────────────────────────────────────┐  │
│ │ 📊 Attribution Model Comparison                                    │  │
│ │                                                                    │  │
│ │ ┌────────────────────────────────────────────────────────────┐    │  │
│ │ │ Model          Revenue Attributed  Avg Touches  Best For   │    │  │
│ │ ├────────────────────────────────────────────────────────────┤    │  │
│ │ │ First Touch    $180,000           1.0          Awareness   │    │  │
│ │ │ Last Touch     $165,000           1.0          Conversion  │    │  │
│ │ │ Linear         $210,000           3.2          Balanced    │    │  │
│ │ │ Time Decay     $198,000           3.2          Recent      │    │  │
│ │ │ U-Shaped       $225,000           3.2          Awareness+  │    │  │
│ │ │ W-Shaped       $240,000           3.2          Full Funnel │    │  │
│ │ │ Data-Driven⭐   $267,000           3.4          ML-Based    │    │  │
│ │ └────────────────────────────────────────────────────────────┘    │  │
│ │                                                                    │  │
│ │ 💡 Data-Driven model shows 18% more attributed revenue than       │  │
│ │    traditional models by accounting for synergy effects.          │  │
│ └────────────────────────────────────────────────────────────────────┘  │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

### **Cohort Analysis Dashboard**

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 📊 Cohort Analysis - Patient Retention & LTV                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│ Time Period: [Month ▾]  Cohort By: [Acquisition Date ▾]  [Export]      │
│                                                                          │
│ ┌────────────────────────────────────────────────────────────────────┐  │
│ │ 📅 Retention Cohort Table                                          │  │
│ │                                                                    │  │
│ │ Cohort     │ M0   │ M1   │ M2   │ M3   │ M6   │ M12  │ M18  │ M24 ││  │
│ │ ───────────┼──────┼──────┼──────┼──────┼──────┼──────┼──────┼─────││  │
│ │ Jan 2024   │ 100% │ 🟢87%│ 🟢82%│ 🟢78%│ 🟡71%│ 🟡64%│ 🟡58%│ 🔴54│││  │
│ │ Feb 2024   │ 100% │ 🟢89%│ 🟢84%│ 🟢80%│ 🟢73%│ 🟡67%│ 🟡61%│  -  ││  │
│ │ Mar 2024   │ 100% │ 🟢91%│ 🟢86%│ 🟢82%│ 🟢76%│ 🟡69%│  -   │  -  ││  │
│ │ Apr 2024   │ 100% │ 🟢90%│ 🟢85%│ 🟢81%│ 🟢75%│  -   │  -   │  -  ││  │
│ │ May 2024   │ 100% │ 🟢92%│ 🟢87%│ 🟢83%│  -   │  -   │  -   │  -  ││  │
│ │ Jun 2024   │ 100% │ 🟢93%│ 🟢88%│  -   │  -   │  -   │  -   │  -  ││  │
│ │ Jul 2024   │ 100% │ 🟢94%│  -   │  -   │  -   │  -   │  -   │  -  ││  │
│ │ Aug 2024   │ 100% │  -   │  -   │  -   │  -   │  -   │  -   │  -  ││  │
│ │                                                                    │  │
│ │ 🟢 >80% retention  🟡 60-80% retention  🔴 <60% retention           │  │
│ │                                                                    │  │
│ │ 💡 Insight: Retention drops significantly at 12-month mark.       │  │
│ │    Consider launching 12-month anniversary campaign.              │  │
│ └────────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│ ┌──────────────────────────────────┐ ┌──────────────────────────────┐  │
│ │ 💰 LTV by Acquisition Source     │ │ 📈 Revenue Curve by Cohort   │  │
│ │                                  │ │                              │  │
│ │ Referral      $8,450 ████████████│ │ 10K┤              Q1 2024    │  │
│ │ Google Ads    $6,230 █████████   │ │    │          ╱─              │  │
│ │ Facebook      $4,890 ███████     │ │  8K┤       ╱─    Q2 2024     │  │
│ │ Website       $3,120 ████         │ │    │    ╱─    ╱─             │  │
│ │ Walk-in       $2,450 ███          │ │  6K┤ ╱─    ╱─   Q3 2024     │  │
│ │                                  │ │    │    ╱─                   │  │
│ │ Payback Period:                  │ │  4K┤ ╱─                      │  │
│ │ • Referral:    3.2 months        │ │    └────────────────────────│  │
│ │ • Google:      4.8 months        │ │     0  3  6  9  12 15 18 21│  │
│ │ • Facebook:    6.1 months        │ │           Months             │  │
│ │                                  │ │                              │  │
│ │ [View Details]                   │ │ [View All Cohorts]           │  │
│ └──────────────────────────────────┘ └──────────────────────────────┘  │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

### **Custom Report Builder**

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 📊 Custom Report Builder                                   [Save] [Run] │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│ Step 1: Data Source                                                     │
│ ┌────────────────────────────────────────────────────────────────────┐  │
│ │ ( ) Contacts  (•) Deals  ( ) Activities  ( ) Marketing Campaigns   │  │
│ └────────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│ Step 2: Metrics (Drag from left, drop on right)                         │
│ ┌──────────────────────┐   ┌──────────────────────────────────────┐    │
│ │ Available Metrics    │   │ Selected Metrics                     │    │
│ ├──────────────────────┤   ├──────────────────────────────────────┤    │
│ │ □ Count of Deals     │   │ ✓ Sum of Value                       │    │
│ │ □ Sum of Value       │   │ ✓ Average Value                      │    │
│ │ □ Average Value      │   │ ✓ Win Rate %                         │    │
│ │ □ Min Value          │   │                                      │    │
│ │ □ Max Value          │   │                                      │    │
│ │ □ Win Rate %         │   │                                      │    │
│ │ + Custom Metric      │   │                                      │    │
│ └──────────────────────┘   └──────────────────────────────────────┘    │
│                                                                          │
│ Step 3: Group By (Dimensions)                                           │
│ ┌────────────────────────────────────────────────────────────────────┐  │
│ │ [+ Add Dimension]                                                  │  │
│ │ 1. Time (Month) ▾                                                  │  │
│ │ 2. Owner (User) ▾                                                  │  │
│ └────────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│ Step 4: Filters                                                          │
│ ┌────────────────────────────────────────────────────────────────────┐  │
│ │ [+ Add Filter]                                                     │  │
│ │ 1. Stage [is one of] Proposal, Negotiation              [Remove]  │  │
│ │ 2. Created Date [is in the last] 90 days                [Remove]  │  │
│ │ 3. Value [is greater than] $5,000                       [Remove]  │  │
│ └────────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│ Step 5: Visualization                                                    │
│ ┌────────────────────────────────────────────────────────────────────┐  │
│ │ (•) Table  ( ) Bar Chart  ( ) Line Chart  ( ) Pie Chart            │  │
│ │ [Sort by: Sum of Value ▾] [Direction: Descending ▾]                │  │
│ └────────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│ Step 6: Save & Schedule                                                  │
│ ┌────────────────────────────────────────────────────────────────────┐  │
│ │ Report Name: [Deal Performance by Owner & Month                  ]│  │
│ │ Description: [Monthly breakdown of deal value and win rates...   ]│  │
│ │                                                                    │  │
│ │ ☐ Share with team                                                  │  │
│ │ ☐ Schedule delivery   Frequency: [Weekly ▾]  Day: [Monday ▾]     │  │
│ │   Recipients: [sarah@dental.com, mike@dental.com              ]   │  │
│ │   Format: [PDF ▾]                                                  │  │
│ └────────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│                              [Cancel] [Save Draft] [Save & Run Report] │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 🎯 Interaction Patterns

### **Click Behaviors:**

1. **Metric Card Click:** → Opens detailed breakdown modal
2. **Chart Data Point Click:** → Filters table below to that segment
3. **Table Row Click:** → Opens detail view slide-in
4. **Table Header Click:** → Sorts column
5. **Filter Badge Click:** → Removes that filter
6. **"View More" Link:** → Expands section or navigates to full page

### **Hover States:**

1. **Metric Card Hover:** → Subtle shadow lift, cursor pointer
2. **Chart Hover:** → Tooltip with exact values
3. **Table Row Hover:** → Background color change, actions appear
4. **Button Hover:** → Background color change, scale slightly

### **Loading States:**

1. **Initial Load:** → Skeleton loaders matching layout
2. **Filter Change:** → Shimmer effect on affected components only
3. **Export:** → Button shows spinner, text "Exporting..."

### **Empty States:**

1. **No Data:** → Illustration + "No data available" + CTA
2. **No Results:** → "No results match your filters" + Reset filters button
3. **Error:** → Error icon + Message + Retry button

---

## 📱 Responsive Behavior

### **Desktop (>1280px):**
- 2-3 column grid for charts
- Full data tables with all columns
- Side-by-side comparisons

### **Tablet (768px - 1279px):**
- 1-2 column grid for charts
- Horizontal scroll for tables
- Collapsible sidebar filters

### **Mobile (<768px):**
- 1 column stacked layout
- Charts resize to full width
- Tables show key columns only, horizontal scroll
- Filters in bottom sheet modal
- Touch-optimized interactions

---

## ✅ Accessibility

- **Keyboard Navigation:** Tab through all interactive elements
- **Screen Readers:** ARIA labels on all charts and metrics
- **Color Contrast:** WCAG AAA compliance (7:1 ratio)
- **Focus Indicators:** Clear visual focus states
- **Alt Text:** All icons and images have descriptive alt text

---

This guide provides pixel-perfect specifications for every component. Ready to build? 🚀

