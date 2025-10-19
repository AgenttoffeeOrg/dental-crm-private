# 📘 User Guide: Understanding Routing Analytics

**Version:** 1.0.0  
**Last Updated:** October 19, 2025  
**Audience:** Practice Administrators, Office Managers, Team Leaders  

---

## 🎯 Overview

Routing Analytics provides deep insights into how your Universal Treatment Tag Routing System is performing. This guide will help you understand the metrics, identify issues, and optimize your routing strategy for maximum efficiency.

---

## 📋 Table of Contents

1. [Why Analytics Matter](#why-analytics-matter)
2. [Accessing the Dashboard](#accessing-the-dashboard)
3. [Key Metrics Explained](#key-metrics-explained)
4. [Understanding Charts & Graphs](#understanding-charts--graphs)
5. [Routing Logs](#routing-logs)
6. [Common Patterns](#common-patterns)
7. [Optimization Strategies](#optimization-strategies)
8. [Troubleshooting](#troubleshooting)

---

## Why Analytics Matter

### The Big Picture

Your routing system processes hundreds or thousands of deals. Analytics help you:

✅ **Verify** the system is working correctly  
✅ **Identify** patterns and opportunities  
✅ **Optimize** for better conversion rates  
✅ **Train** team members more effectively  
✅ **Prove ROI** of automation  

### What You Can Learn

- Which treatments generate most leads
- How accurate your routing is
- Which tags need better keywords
- Pipeline bottlenecks
- Team performance by treatment type
- Time saved through automation

---

## Accessing the Dashboard

### Step 1: Navigate to Analytics

1. **Log in** to your CRM
2. Click **Settings** (gear icon)
3. Navigate to **Treatment Routing**
4. Click **Routing Analytics** tab

### Step 2: Select Date Range

Default: Last 30 days  
Options: Last 7 days, 30 days, 90 days, Custom range

**Tip:** Start with 30 days for meaningful trends

### Step 3: Apply Filters (Optional)

Filter by:
- **Location** (multi-location practices)
- **Pipeline** (specific pipeline performance)
- **Treatment Tag** (specific tag analysis)
- **Routing Method** (user override, tag mapping, AI, unsorted)
- **User** (who created the deal)

---

## Key Metrics Explained

### 1. Total Deals Routed

**What It Is:**
Total number of deals processed by the routing system in the selected period.

**Good Baseline:**
- Small practice: 50-100/month
- Medium practice: 100-500/month
- Large practice/DSO: 500+/month

**What to Watch:**
- Sudden drops → Check form submissions, integrations
- Steady growth → Good marketing efforts

---

### 2. Routing Accuracy

**What It Is:**
Percentage of deals that routed correctly without manual intervention.

**Formula:**
```
Routing Accuracy = (Correctly Routed / Total Routed) × 100
```

**Target Goals:**
- 🟢 **90%+** → Excellent (world-class)
- 🟡 **75-89%** → Good (room for improvement)
- 🟠 **60-74%** → Fair (needs optimization)
- 🔴 **<60%** → Poor (immediate action needed)

**How to Improve:**
- Add more keywords to tags
- Create mappings for unmapped tags
- Review and fix mis-routed deals
- Train team on proper tag usage

---

### 3. Routing Methods Breakdown

**What It Shows:**
How deals are being routed across 4 methods:

#### Method 1: User Override (Manual)
- **Definition:** User manually selected pipeline
- **Typical Range:** 10-20% of total deals
- **What It Means:**
  - 🟢 <20% → Good automation
  - 🔴 >40% → Tags not matching, needs work

#### Method 2: Tag Mapping
- **Definition:** Explicit tag matched to pipeline mapping
- **Typical Range:** 50-70% of total deals
- **What It Means:**
  - 🟢 >50% → Strong tag coverage
  - 🔴 <30% → Need more mappings

#### Method 3: AI Keyword Matching
- **Definition:** AI found treatment keywords in deal text
- **Typical Range:** 10-30% of total deals
- **What It Means:**
  - 🟢 10-30% → Good safety net
  - 🔴 >40% → Tags not comprehensive enough

#### Method 4: Unsorted Fallback
- **Definition:** No tags matched, went to default pipeline
- **Typical Range:** 5-15% of total deals
- **What It Means:**
  - 🟢 <10% → Excellent coverage
  - 🟠 10-20% → Some gaps
  - 🔴 >20% → Major gaps in tag coverage

**Ideal Distribution:**
```
🎯 Tag Mapping: 60%
🎯 User Override: 15%
🎯 AI Keyword: 20%
🎯 Unsorted: 5%
```

---

### 4. Average Routing Time

**What It Is:**
Time from deal creation to pipeline assignment.

**Target Goals:**
- 🟢 **<2 seconds** → Excellent (instant)
- 🟡 **2-5 seconds** → Good
- 🔴 **>5 seconds** → Slow (check system)

**What Affects It:**
- Number of tags to check
- Complexity of keywords
- System load
- Database performance

---

### 5. Top Treatment Tags

**What It Shows:**
Which tags are used most frequently.

**Example:**
```
1. general_dental: 245 deals (35%)
2. dental_implant: 142 deals (20%)
3. crown: 98 deals (14%)
4. emergency: 67 deals (9%)
5. whitening: 56 deals (8%)
...
```

**How to Use This:**
- **High volume tags:** Ensure they're mapped correctly
- **Growing tags:** Consider dedicated pipeline
- **Declining tags:** Review marketing efforts
- **Missing tags:** Create tags for common inquiries

---

### 6. Pipeline Distribution

**What It Shows:**
Which pipelines receive the most deals via routing.

**Example:**
```
High-Value Procedures: 187 deals (26%)
General Inquiries: 231 deals (32%)
Emergency Care: 89 deals (12%)
Unsorted: 67 deals (9%)
...
```

**What to Watch:**
- **Balanced distribution** → Good tag coverage
- **Too many in Unsorted** → Need better tags/mappings
- **One pipeline overloaded** → Consider splitting
- **Unused pipelines** → Remove or re-map

---

### 7. Confidence Score Distribution

**What It Is:**
How confident the AI is in its routing decisions.

**Confidence Ranges:**
- **90-100%:** High confidence (exact tag match)
- **70-89%:** Medium confidence (keyword match)
- **50-69%:** Low confidence (fuzzy match)
- **0-49%:** Very low (fallback routing)

**Target:**
🟢 **80%+ of deals with >70% confidence**

**How to Improve:**
- Add more specific keywords
- Create tags for common patterns
- Review low-confidence deals for insights

---

## Understanding Charts & Graphs

### Chart 1: Routing Trends Over Time (Line Chart)

**What It Shows:**
Daily/weekly trend of routed deals.

**How to Read:**
- **X-axis:** Date
- **Y-axis:** Number of deals
- **Lines:** Different routing methods

**Look For:**
- 📈 **Steady growth:** Good marketing momentum
- 📉 **Sudden drops:** Check for issues
- 🎯 **Predictable patterns:** Optimize staffing
- 🔄 **Day-of-week patterns:** Adjust marketing schedule

**Example Insights:**
```
Monday/Tuesday: Highest volume (weekend inquiries)
Wednesday/Thursday: Moderate volume
Friday: Lower volume
Weekend: Minimal volume
```

---

### Chart 2: Routing Method Breakdown (Pie Chart)

**What It Shows:**
Proportion of each routing method.

**Ideal Chart:**
```
🟦 Tag Mapping (60%)
🟩 User Override (15%)
🟨 AI Keyword (20%)
🟥 Unsorted (5%)
```

**Red Flags:**
- Unsorted slice too large (>20%)
- User Override too large (>40%)
- Tag Mapping too small (<40%)

---

### Chart 3: Top 10 Treatment Tags (Bar Chart)

**What It Shows:**
Most frequently used tags, ranked.

**How to Use:**
1. **Identify top performers:** Ensure they're optimized
2. **Notice trends:** Growing vs. declining tags
3. **Spot opportunities:** Create dedicated pipelines for top tags
4. **Find gaps:** Common inquiries without tags

---

### Chart 4: Confidence Score Histogram

**What It Shows:**
Distribution of confidence scores across all routed deals.

**Ideal Distribution:**
- Majority of deals with 80-100% confidence
- Small tail of lower confidence deals

**Concerning Pattern:**
- Bimodal distribution (two peaks)
- Large cluster at 0% (too many unsorted)
- No high-confidence deals (tagging system not working)

---

### Chart 5: Pipeline Performance Heatmap

**What It Shows:**
Which pipelines receive which tags (intensity = volume).

**How to Read:**
- Rows: Treatment Tags
- Columns: Pipelines
- Color: Number of deals (darker = more)

**Look For:**
- **Clear diagonal:** Good 1-to-1 mapping
- **Scattered pattern:** Inconsistent routing
- **Empty columns:** Unused pipelines
- **Empty rows:** Unmapped tags

---

## Routing Logs

### What Are Routing Logs?

A detailed record of **every** routing decision, including:
- Deal ID and title
- Treatment tags identified
- Routing method used
- Target pipeline and stage
- Confidence score
- Timestamp
- User who created deal
- Why this route was chosen

### Accessing Logs

In Routing Analytics dashboard:
1. Scroll to **"Routing Logs"** section
2. Use filters: Date, Tag, Pipeline, Method
3. Use search: Find specific deals
4. Click any log entry for full details

### Log Columns Explained

| Column | Description | Example |
|--------|-------------|---------|
| **Timestamp** | When routing occurred | 2025-10-19 10:45:23 |
| **Deal** | Deal title | "Patient needs implants" |
| **Tags** | Identified tags | dental_implant, bone_graft |
| **Method** | How it routed | Tag Mapping |
| **Pipeline** | Where it went | High-Value Procedures |
| **Stage** | Specific stage | Consultation |
| **Confidence** | System confidence | 95% |
| **User** | Who created | Sarah Johnson |
| **Reason** | Why this route | "Matched tag: dental_implant" |

### Using Logs for Troubleshooting

**Scenario 1: Find Mis-Routed Deals**
1. Filter by Pipeline: "Unsorted"
2. Review "Reason" column
3. Identify patterns
4. Add keywords or create mappings

**Scenario 2: Audit High-Value Deals**
1. Filter by Tag: "dental_implant"
2. Verify all went to correct pipeline
3. Check confidence scores
4. Review any exceptions

**Scenario 3: Team Performance**
1. Filter by User: specific team member
2. Check manual override rate
3. Identify training opportunities

---

## Common Patterns

### Pattern 1: Monday Morning Spike

**What You'll See:**
- 📈 High volume Monday AM
- 🔽 Lower volume rest of week

**Why It Happens:**
- Weekend inquiries accumulate
- People research dentists on weekends
- Submit forms Monday morning

**How to Respond:**
- Schedule more staff Monday AM
- Set up auto-responders for weekends
- Prioritize Monday follow-ups

---

### Pattern 2: Seasonal Fluctuations

**What You'll See:**
- 📈 High volume: Jan (insurance reset), May-Jun (wedding season)
- 🔽 Low volume: Nov-Dec (holidays), Jul-Aug (vacations)

**How to Respond:**
- Adjust marketing spend seasonally
- Plan team vacations during low periods
- Ramp up capacity before high seasons

---

### Pattern 3: Tag Growth Trajectory

**What You'll See:**
- New tag starts low
- Gradually increases over 4-8 weeks
- Stabilizes at steady volume

**Why It Happens:**
- Marketing campaigns take time to ramp
- SEO improvements kick in
- Word-of-mouth builds

**How to Track:**
- Monitor new tag performance weekly
- Compare to campaign launch dates
- Measure ROI of marketing efforts

---

### Pattern 4: Unsorted Spike

**What You'll See:**
- Sudden increase in Unsorted pipeline
- 📈 From 5% to 25% overnight

**Common Causes:**
1. **New marketing campaign** with unexpected language
2. **Integration broke** (PMS, form)
3. **Tags accidentally deactivated**
4. **Keywords too narrow**

**How to Fix:**
1. Review recent Unsorted deals
2. Identify common phrases
3. Add keywords or create new tags
4. Monitor for return to baseline

---

## Optimization Strategies

### Strategy 1: The 80/20 Rule

**Principle:**
80% of your deals come from 20% of your tags.

**Action Plan:**
1. Identify top 20% of tags (by volume)
2. Optimize these tags first:
   - Add more keywords
   - Refine mappings
   - Ensure correct pipeline
   - Monitor confidence scores
3. Result: Massive improvement with minimal effort

---

### Strategy 2: Weekly Review Ritual

**When:** Every Monday morning, 15 minutes

**What to Check:**
1. **Total deals last week** (trending up/down?)
2. **Routing accuracy** (above 85%?)
3. **Top 5 tags** (any changes?)
4. **Unsorted deals** (any patterns?)
5. **Action items** (what needs fixing?)

---

### Strategy 3: Monthly Deep Dive

**When:** First of each month, 1 hour

**What to Do:**
1. **Compare to last month:** Key metrics
2. **Identify trends:** Growing/declining tags
3. **Review mappings:** Any need updating?
4. **Check integrations:** All working?
5. **Team training:** Any gaps identified?
6. **Plan improvements:** What to optimize next?

---

### Strategy 4: Confidence Score Optimization

**Goal:** Get 90%+ of deals above 80% confidence

**How:**
1. **Filter logs:** Confidence <80%
2. **Review reasons:** Why low confidence?
3. **Add keywords:** Make matches more explicit
4. **Create mappings:** If tags exist but unmapped
5. **Test:** Verify improvements

---

### Strategy 5: A/B Testing Keywords

**Test:** Which keywords improve routing?

**Method:**
1. **Week 1:** Current keywords
2. **Week 2:** Add 3 new keywords to tag
3. **Week 3:** Compare routing accuracy
4. **Week 4:** Keep improvements, remove ineffective ones

**Example:**
```
Tag: dental_implant
Original keywords: implant, dental implant
Test keywords: tooth replacement, missing tooth, permanent tooth
Result: +15% routing accuracy improvement
```

---

## Troubleshooting

### Issue: Routing Accuracy Below 75%

**Symptoms:**
- Too many manual overrides
- Deals in wrong pipelines
- Team complaints

**Diagnosis Steps:**
1. Check routing logs for patterns
2. Identify most common mis-routes
3. Review tag keywords
4. Check pipeline mappings

**Solutions:**
1. Add missing keywords
2. Create new tags for common patterns
3. Map unmapped tags
4. Train team on tag usage

---

### Issue: Too Many Deals in Unsorted (>20%)

**Symptoms:**
- Manual sorting required daily
- Lost opportunities
- Team overwhelmed

**Diagnosis:**
1. Review Unsorted deals for common phrases
2. Check if tags exist but aren't mapped
3. Verify tag keywords are comprehensive

**Solutions:**
1. Create tags for top 5 Unsorted patterns
2. Add keywords to existing tags
3. Map all active tags to pipelines
4. Set up weekly Unsorted review

---

### Issue: Low Confidence Scores

**Symptoms:**
- Average confidence <70%
- Uncertain routing decisions
- Inconsistent results

**Diagnosis:**
1. Filter logs by low confidence
2. Read "Reason" for each
3. Identify keyword gaps

**Solutions:**
1. Add more specific keywords
2. Use multi-word phrases
3. Include patient language (not just technical terms)
4. Test with sample text

---

### Issue: One Pipeline Overloaded

**Symptoms:**
- 60%+ deals in one pipeline
- Team can't keep up
- Bottleneck in workflow

**Solutions:**
1. **Split pipeline** by sub-category
   - Example: "High-Value" → "Implants" + "Cosmetic"
2. **Adjust mappings** to distribute load
3. **Add team members** to overloaded pipeline
4. **Review stage duration** for bottlenecks

---

## Analytics Best Practices

### 1. Set Baseline Metrics

**Week 1:** Establish baseline
- Total deals routed
- Routing accuracy
- Method breakdown
- Top tags

**Future:** Compare against baseline to measure improvement

---

### 2. Create Weekly Reports

**Share with team:**
- Total deals routed this week
- Routing accuracy (goal: >85%)
- Top 5 treatment tags
- Any issues identified
- Action items for next week

---

### 3. Celebrate Wins

**When accuracy improves:**
- Share the improvement with team
- Recognize who helped
- Document what worked
- Apply same strategy to other areas

---

### 4. Use Data for Training

**Show team members:**
- Their individual routing accuracy
- Common mistakes
- Best practices from top performers
- Impact of proper tagging

---

### 5. Connect to Revenue

**Calculate:**
```
Routing Automation Value = 
  (Deals Routed Automatically × Time Saved × Hourly Rate)

Example:
500 deals/month × 2 min saved × $25/hr ÷ 60 = $417/month
= $5,000/year saved
```

---

## Appendix: Quick Reference

### Key Metrics Targets

| Metric | Target | Action Threshold |
|--------|--------|------------------|
| Routing Accuracy | >90% | <75% |
| Unsorted % | <10% | >20% |
| Avg Confidence | >80% | <70% |
| Tag Mapping % | >50% | <40% |
| Routing Time | <2s | >5s |

### Routing Method Targets

| Method | Target % | Action Threshold |
|--------|----------|------------------|
| Tag Mapping | 50-70% | <40% |
| User Override | 10-20% | >40% |
| AI Keyword | 10-30% | >40% |
| Unsorted | 5-15% | >20% |

---

## Need Help?

- 📧 **Email:** support@dentalcrm.com
- 💬 **Live Chat:** Click chat icon in bottom right
- 📚 **Knowledge Base:** help.dentalcrm.com
- 📞 **Phone:** 1-800-DENTAL-CRM

---

**💡 Pro Tip:** Schedule a recurring calendar reminder for your weekly analytics review. Consistency is key to optimization.

**🎯 Goal:** Achieve and maintain 90%+ routing accuracy within 60 days of system launch.

---

*Last Updated: October 19, 2025*  
*Version: 1.0.0*  
*© 2025 Dental CRM. All rights reserved.*

