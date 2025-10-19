# 📘 User Guide: How to Map Tags to Pipelines

**Version:** 1.0.0  
**Last Updated:** October 19, 2025  
**Audience:** Practice Administrators, Office Managers  

---

## 🎯 Overview

Pipeline Mapping connects your Treatment Tags to specific sales pipelines, enabling automatic deal routing. When a deal is created with certain treatment tags, the system automatically places it in the correct pipeline and stage. This guide shows you how to set up these mappings.

---

## 📋 Table of Contents

1. [What is Pipeline Mapping?](#what-is-pipeline-mapping)
2. [Before You Begin](#before-you-begin)
3. [Step-by-Step Mapping](#step-by-step-mapping)
4. [Advanced Strategies](#advanced-strategies)
5. [Best Practices](#best-practices)
6. [Common Scenarios](#common-scenarios)
7. [Troubleshooting](#troubleshooting)

---

## What is Pipeline Mapping?

**Pipeline Mapping** creates rules that determine where deals should go based on their treatment tags.

### Simple Example:
```
Treatment Tag: dental_implant
    ↓
Maps To: High-Value Procedures Pipeline
    ↓
Stage: Consultation
```

### How It Works:
1. **Patient inquiry comes in:** "I need dental implants"
2. **System identifies tag:** `dental_implant`
3. **Looks up mapping:** `dental_implant` → High-Value Pipeline
4. **Creates deal automatically** in that pipeline
5. **Team member gets notified** to follow up

---

## Before You Begin

### Prerequisites:
- ✅ Treatment Tags already created (see [Tag Setup Guide](./how-to-set-up-treatment-tags.md))
- ✅ Pipelines and stages already configured
- ✅ Understanding of your sales process
- ✅ Admin or Super Admin access

### What You'll Need:
1. **List of your tags** (from Treatment Tags settings)
2. **List of your pipelines** (from Pipeline settings)
3. **Routing strategy** (which tags go where)
4. **20-30 minutes** of focused time

---

## Step-by-Step Mapping

### Step 1: Access Pipeline Mapping Settings

1. **Log in** to your CRM
2. Click **Settings** (gear icon)
3. Navigate to **Treatment Routing**
4. Click **Pipeline Mapping** tab

You'll see the Pipeline Mapping dashboard.

---

### Step 2: Review Your Unmapped Tags

The dashboard shows:
- **Mapped Tags:** Already connected to pipelines (green badges)
- **Unmapped Tags:** Not yet connected (red badges with ⚠️ warning)

**Priority:** Map all high-value treatment tags first.

---

### Step 3: Create Your First Mapping

#### Click "Create New Mapping" Button

You'll see a form with the following fields:

**Required Fields:**

1. **Treatment Tag**
   - Select from dropdown
   - Shows all active tags
   - Example: `dental_implant`

2. **Target Pipeline**
   - Select which pipeline to route deals to
   - Example: "High-Value Procedures"
   - **Tip:** Choose pipelines that match treatment value

3. **Target Stage**
   - Select which stage within the pipeline
   - Example: "Consultation Scheduled"
   - **Default:** First stage of selected pipeline
   - **Tip:** Choose based on how the deal was captured

**Optional Fields:**

4. **Priority**
   - If tag matches multiple mappings, which takes precedence
   - Range: 1 (highest) to 10 (lowest)
   - **Default:** 5 (medium)
   - **When to use:** When tags can route to multiple pipelines

5. **Location** (multi-location practices)
   - Apply mapping to specific location or all
   - **Default:** All Locations
   - **When to use:** Different locations have different processes

6. **Conditions** (Advanced)
   - Additional rules for routing
   - Example: "Only if estimated value > $5,000"
   - **Optional:** Leave blank for basic mapping

7. **Notes**
   - Internal documentation
   - Example: "All implant cases go to Dr. Smith's pipeline"

#### Example: Mapping Dental Implants

```
Treatment Tag: dental_implant
Target Pipeline: High-Value Procedures
Target Stage: Consultation Scheduled
Priority: 1 (High)
Location: All Locations
Conditions: None
Notes: High-value cases requiring specialist consultation
Active: ✓ Yes
```

#### Click "Save Mapping"

---

### Step 4: Map Remaining High-Value Tags

Continue mapping your most important tags first:

**Priority Order:**
1. **High-value procedures** (implants, full arch, smile makeovers)
2. **Time-sensitive cases** (emergencies, pain cases)
3. **Common procedures** (crowns, root canals)
4. **General inquiries** (checkups, cleanings)

---

### Step 5: Configure the "Unsorted" Pipeline

The **Unsorted Pipeline** is where deals go when:
- No treatment tags are identified
- Tags exist but aren't mapped to any pipeline
- Routing system is uncertain

#### Setting Up Unsorted Pipeline:

1. In Pipeline Mapping settings, find **"Unsorted Pipeline Configuration"**
2. Select your default pipeline (usually "General Inquiries" or "Unsorted")
3. Select default stage (usually "New" or "To Review")
4. Click **Save**

**Why This Matters:**
- Ensures NO deals are lost
- Creates a safety net for unclear inquiries
- Allows manual review and re-routing

---

### Step 6: Test Your Mappings

After creating mappings, **test them immediately**:

#### Test Method 1: Create Test Deal
1. Go to **Create New Deal**
2. Enter a title matching your tag
   - Example: "Patient interested in dental implants"
3. Watch the "Suggested Pipeline" indicator
4. Verify it suggests your mapped pipeline
5. Create the deal
6. Check it appears in the correct pipeline

#### Test Method 2: Form Submission
1. Create a test marketing form
2. Include treatment tags field
3. Submit form with specific tags
4. Verify deal routes correctly

#### Test Method 3: Routing Preview
1. In Pipeline Mapping settings
2. Click **"Preview Routing"** button
3. Enter sample deal text
4. See which pipeline it would route to

---

### Step 7: Monitor & Adjust

After activating your mappings:

1. **Check routing logs** daily for first week
2. **Review analytics** weekly
3. **Identify patterns** in mis-routed deals
4. **Adjust mappings** as needed
5. **Update keywords** if tags aren't matching

---

## Advanced Strategies

### Strategy 1: Value-Based Routing

Route based on treatment value:

**High-Value Pipeline** (>$3,000)
- `dental_implant` → Priority 1
- `full_arch` → Priority 1
- `smile_makeover` → Priority 1
- `all_on_4` → Priority 1

**Medium-Value Pipeline** ($500-$3,000)
- `crown` → Priority 2
- `veneers` → Priority 2
- `root_canal` → Priority 2

**Standard Pipeline** (<$500)
- `whitening` → Priority 3
- `general_dental` → Priority 3

---

### Strategy 2: Specialist Routing

Route to different pipelines based on specialist:

**Dr. Smith (Implant Specialist)**
- `dental_implant` → Dr. Smith Pipeline
- `bone_graft` → Dr. Smith Pipeline
- `full_arch` → Dr. Smith Pipeline

**Dr. Jones (General Dentist)**
- `crown` → Dr. Jones Pipeline
- `filling` → Dr. Jones Pipeline
- `extraction` → Dr. Jones Pipeline

**Dr. Lee (Orthodontist)**
- `orthodontics` → Dr. Lee Pipeline
- `invisalign` → Dr. Lee Pipeline
- `braces` → Dr. Lee Pipeline

---

### Strategy 3: Urgency-Based Routing

Route based on how quickly patient needs to be seen:

**Emergency Pipeline** (Same Day)
- `emergency` → Priority 1
- `pain` → Priority 1
- `broken_tooth` → Priority 1

**Urgent Pipeline** (Within 48 Hours)
- `infection` → Priority 2
- `lost_filling` → Priority 2

**Standard Pipeline** (Within 2 Weeks)
- `general_dental` → Priority 3
- `whitening` → Priority 3

---

### Strategy 4: Multi-Tag Routing

When deals have multiple tags, use priorities:

**Scenario:** Patient says "I need a crown for my implant"
- Matches: `crown` AND `dental_implant`

**Priority Setup:**
- `dental_implant` → High-Value Pipeline, Priority 1
- `crown` → Standard Pipeline, Priority 2

**Result:** Routes to High-Value Pipeline (higher priority wins)

**Why:** Implant cases are higher value and need specialist attention, even if crown is mentioned.

---

### Strategy 5: Location-Specific Routing

For multi-location practices:

**Downtown Office** (Specialists available)
- `dental_implant` → Downtown High-Value Pipeline
- `root_canal` → Downtown Specialist Pipeline

**Suburban Office** (General dentistry)
- `dental_implant` → Refer to Downtown (or separate pipeline)
- `root_canal` → Suburban General Pipeline
- `whitening` → Suburban Cosmetic Pipeline

---

## Best Practices

### 1. Start Simple, Add Complexity Later

**Week 1:** Basic mappings
```
dental_implant → High-Value Pipeline
crown → Standard Pipeline
emergency → Emergency Pipeline
general_dental → General Pipeline
```

**Month 2:** Add specialist routing, priorities, conditions

---

### 2. Map High-Value First

Always ensure your most valuable treatments route correctly:
1. Implants
2. Full arch procedures
3. Smile makeovers
4. Orthodontics
5. Everything else

---

### 3. Use Descriptive Pipeline Names

✅ **Good Names:**
- "High-Value Implant Cases"
- "Dr. Smith - Specialist Referrals"
- "Emergency Same-Day"
- "General Inquiries - To Sort"

❌ **Bad Names:**
- "Pipeline 1"
- "Misc"
- "Other"
- "Bob's Stuff"

---

### 4. Keep Priority System Consistent

**Recommended Priority Scale:**
- **Priority 1:** Emergencies and high-value (>$5,000)
- **Priority 2:** Specialist procedures ($1,000-$5,000)
- **Priority 3:** Standard procedures ($500-$1,000)
- **Priority 4+:** General inquiries (<$500)

---

### 5. Document Your Mapping Logic

Add notes to each mapping explaining WHY:

```
Tag: dental_implant
Pipeline: High-Value Procedures
Notes: "All implant cases need Dr. Smith consultation 
       first. Average value $4,500. Follow up within 
       24 hours per practice policy."
```

This helps when:
- Training new staff
- Adjusting mappings later
- Understanding routing decisions

---

### 6. Review Analytics Monthly

Check **Routing Analytics** dashboard:
- Which tags route most frequently?
- What's the routing success rate?
- Are deals getting stuck in Unsorted?
- Which mappings need adjustment?

---

### 7. Handle Multiple Locations Carefully

**If locations share some treatments:**
```
Tag: general_dental
Location: All Locations
Pipeline: General Inquiries (each location has own)
```

**If locations have different capabilities:**
```
Tag: dental_implant
Location: Downtown → Downtown Implant Pipeline
Location: Suburban → Refer to Downtown Pipeline
```

---

## Common Scenarios

### Scenario 1: Simple Single-Specialty Practice

**Practice:** General dentistry, no specialists

**Mapping Strategy:**
```
ALL TAGS → Single "New Patients" Pipeline
  - emergency → Stage: "Urgent - Schedule ASAP"
  - general_dental → Stage: "New Patient Inquiry"
  - all others → Stage: "New Patient Inquiry"
```

**Why This Works:** Simple practice, one team, no need for complex routing.

---

### Scenario 2: Multi-Specialty Practice

**Practice:** General dentistry + implant specialist + orthodontist

**Mapping Strategy:**
```
High-Value Tags:
  - dental_implant → "Dr. Smith Implants" Pipeline
  - full_arch → "Dr. Smith Implants" Pipeline
  - bone_graft → "Dr. Smith Implants" Pipeline

Orthodontic Tags:
  - orthodontics → "Dr. Lee Ortho" Pipeline
  - invisalign → "Dr. Lee Ortho" Pipeline
  - braces → "Dr. Lee Ortho" Pipeline

General Tags:
  - crown → "General Dentistry" Pipeline
  - filling → "General Dentistry" Pipeline
  - whitening → "General Dentistry" Pipeline

Emergency Tags:
  - emergency → "Emergency Care" Pipeline (all docs)
```

---

### Scenario 3: High-Volume Practice with Triage

**Practice:** 100+ leads/month, need to triage by value

**Mapping Strategy:**
```
Tier 1 ($5,000+):
  - dental_implant → "Tier 1 - VIP" Pipeline
  - full_arch → "Tier 1 - VIP" Pipeline
  - smile_makeover → "Tier 1 - VIP" Pipeline
  → Assigned to senior consultants

Tier 2 ($1,000-$5,000):
  - crown → "Tier 2 - Standard" Pipeline
  - veneers → "Tier 2 - Standard" Pipeline
  - root_canal → "Tier 2 - Standard" Pipeline
  → Assigned to patient coordinators

Tier 3 (<$1,000):
  - whitening → "Tier 3 - Basic" Pipeline
  - cleaning → "Tier 3 - Basic" Pipeline
  → Automated follow-up sequences
```

---

### Scenario 4: DSO with Multiple Locations

**Organization:** 5 locations, centralized coordination

**Mapping Strategy:**
```
LOCATION-SPECIFIC:
Each location has own pipelines for:
  - "Location A - New Patients"
  - "Location B - New Patients"
  etc.

CENTRALIZED:
High-value cases route to central team:
  - dental_implant → "DSO High-Value Pipeline"
  - full_arch → "DSO High-Value Pipeline"
  → Central team assigns to appropriate location
```

---

## Troubleshooting

### Problem: Deals Routing to Wrong Pipeline

**Symptoms:**
- Implant cases in general pipeline
- General inquiries in specialist pipeline

**Possible Causes:**
1. Priorities set incorrectly
2. Multiple mappings conflicting
3. Tags matching wrong keywords

**Solutions:**
1. Review all mappings for the tag
2. Adjust priorities (1 = highest)
3. Check tag keywords for overlaps
4. Use routing preview tool to test

---

### Problem: Too Many Deals in "Unsorted"

**Symptoms:**
- 30%+ of deals in Unsorted pipeline
- Manual re-routing required daily

**Possible Causes:**
1. Tags not matching common inquiries
2. Mappings not created for all tags
3. Keywords too specific

**Solutions:**
1. Review Unsorted deals for patterns
2. Add keywords to existing tags
3. Create new tags for common patterns
4. Map ALL active tags to pipelines

---

### Problem: Deals with Multiple Tags

**Symptoms:**
- Unclear which pipeline should win
- Inconsistent routing

**Solution: Use Priority System**
```
Example:
- Patient mentions "crown" and "implant"
- If implant has Priority 1, routes there
- If equal priority, first match wins
```

**Best Practice:** Always set priorities based on:
1. Treatment value (higher value = higher priority)
2. Specialist requirements
3. Urgency

---

### Problem: Location-Specific Routing Not Working

**Symptoms:**
- All locations' deals going to one pipeline
- Location filter ignored

**Possible Causes:**
1. Mapping set to "All Locations"
2. Deal doesn't have location set
3. User doesn't have location assigned

**Solutions:**
1. Create location-specific mappings
2. Ensure deals inherit location from contact
3. Verify user profiles have correct location

---

### Problem: Mappings Not Saving

**Symptoms:**
- Click save but changes don't persist
- Mappings disappear after refresh

**Possible Causes:**
1. Browser cache issue
2. Permissions issue
3. Database connection error

**Solutions:**
1. Hard refresh (Ctrl+Shift+R)
2. Check user has "Manage Routing" permission
3. Check browser console for errors
4. Contact support if persists

---

## Mapping Checklist

Before going live, verify:

- [ ] All high-value tags mapped
- [ ] Emergency tag mapped to urgent pipeline
- [ ] Unsorted pipeline configured
- [ ] Priorities set logically
- [ ] Location filters applied (if needed)
- [ ] All mappings tested with sample deals
- [ ] Team trained on new routing logic
- [ ] Analytics dashboard reviewed
- [ ] Documentation updated with mapping decisions

---

## Next Steps

After setting up your mappings:

1. ✅ **Monitor Routing Analytics** → See [Analytics Guide](#)
2. ✅ **Train Your Team** → Share this guide
3. ✅ **Review Weekly** → Check for mis-routed deals
4. ✅ **Optimize** → Adjust based on data

---

## Need Help?

- 📧 **Email:** support@dentalcrm.com
- 💬 **Live Chat:** Click chat icon in bottom right
- 📚 **Knowledge Base:** help.dentalcrm.com
- 📞 **Phone:** 1-800-DENTAL-CRM

---

## Appendix: Mapping Template

Use this template when planning mappings:

```
TREATMENT TAG: _______________
  ↓
TARGET PIPELINE: _______________
  ↓
TARGET STAGE: _______________

Priority: _____ (1-10)
Location: All / Specific: _______________
Conditions: _______________
Active: Yes / No
Notes: _______________________________________________
```

---

**💡 Pro Tip:** Create a visual flowchart of your routing logic and share it with your team. This makes it easy to understand at a glance.

**🎯 Goal:** 90%+ automatic routing accuracy within 30 days of mapping setup.

---

*Last Updated: October 19, 2025*  
*Version: 1.0.0*  
*© 2025 Dental CRM. All rights reserved.*

