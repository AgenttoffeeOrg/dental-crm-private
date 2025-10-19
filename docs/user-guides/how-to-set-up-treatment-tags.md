# 📘 User Guide: How to Set Up Treatment Tags

**Version:** 1.0.0  
**Last Updated:** October 19, 2025  
**Audience:** Practice Administrators, Office Managers  

---

## 🎯 Overview

Treatment Tags are the foundation of the Universal Treatment Tag Routing System. They allow you to categorize and automatically route deals based on the type of dental treatment being discussed. This guide will walk you through setting up your treatment tags from scratch.

---

## 📋 Table of Contents

1. [What Are Treatment Tags?](#what-are-treatment-tags)
2. [Before You Begin](#before-you-begin)
3. [Step-by-Step Setup](#step-by-step-setup)
4. [Best Practices](#best-practices)
5. [Common Examples](#common-examples)
6. [Troubleshooting](#troubleshooting)

---

## What Are Treatment Tags?

**Treatment Tags** are labels that identify the type of dental procedure or service being discussed with a patient. They help your CRM automatically route deals to the correct pipeline, ensuring the right team member handles each type of case.

### Examples:
- `dental_implant` - For implant cases
- `crown` - For crown procedures
- `whitening` - For teeth whitening
- `orthodontics` - For braces/Invisalign
- `emergency` - For urgent cases

### How They Work:
1. **You create tags** that represent your services
2. **You add keywords** that help identify each service
3. **System matches** deals to tags based on these keywords
4. **Deals route automatically** to the right pipeline

---

## Before You Begin

### Prerequisites:
- ✅ Admin or Super Admin access
- ✅ List of your practice's main services
- ✅ Understanding of your current pipelines
- ✅ 15-20 minutes of uninterrupted time

### What You'll Need:
1. **Service List:** What treatments do you offer?
2. **Common Terms:** How do patients describe these treatments?
3. **Color Preferences:** What colors represent each service? (optional)
4. **Icons:** Which emoji represents each service? (optional)

---

## Step-by-Step Setup

### Step 1: Access Treatment Tags Settings

1. **Log in** to your CRM
2. Click **Settings** (gear icon) in the sidebar
3. Navigate to **Treatment Routing** section
4. Click **Treatment Tags** tab

You'll see the Treatment Tags dashboard.

---

### Step 2: Create Your First Tag

#### Click "Create New Tag" Button

You'll see a form with the following fields:

**Required Fields:**

1. **Tag Name**
   - Use lowercase with underscores
   - Example: `dental_implant`
   - **Why:** Consistent naming for system integration
   - **Tip:** Keep it short and descriptive

2. **Display Name**
   - How it appears in the UI
   - Example: "Dental Implant"
   - **Why:** User-friendly display
   - **Tip:** Use proper capitalization

3. **Keywords** (at least 3 recommended)
   - Words/phrases that identify this treatment
   - Example: `implant, dental implant, implants, tooth replacement`
   - **Why:** Helps AI match patient inquiries
   - **Tip:** Include common misspellings and variations

**Optional Fields:**

4. **Color**
   - Visual identifier (hex code or color picker)
   - Example: `#3B82F6` (blue)
   - **Default:** Blue if not specified

5. **Icon**
   - Emoji that represents the treatment
   - Example: 🦷 for dental procedures
   - **Default:** 🦷 if not specified

6. **Description**
   - Internal notes about this tag
   - Example: "For all implant-related inquiries including consultations, procedures, and follow-ups"

7. **Location** (if multi-location practice)
   - Assign to specific location or "All Locations"
   - **Default:** All Locations

#### Example: Creating "Dental Implant" Tag

```
Tag Name: dental_implant
Display Name: Dental Implant
Keywords: implant, dental implant, implants, tooth implant, 
          implant surgery, implant placement, missing tooth, 
          tooth replacement, all-on-4, all-on-6
Color: #3B82F6 (Blue)
Icon: 🦷
Description: All implant-related cases including consultations, 
             procedures, bone grafts, and follow-ups
Location: All Locations
Active: ✓ Yes
```

#### Click "Save Tag"

---

### Step 3: Add Keywords to Your Tag

**Keywords are crucial** - they're how the system identifies treatments from patient conversations.

#### How to Add Great Keywords:

1. **Think Like a Patient**
   - How would they describe this treatment?
   - "I need a fake tooth" → Add "fake tooth" keyword
   - "My tooth broke" → Add "broken tooth" keyword

2. **Include Variations**
   - Plural forms: "implant" AND "implants"
   - With/without "dental": "implant" AND "dental implant"
   - Abbreviations: "Invisalign" AND "Invisalign braces"

3. **Add Common Misspellings**
   - "implant" AND "implent"
   - "orthodontics" AND "orthodontist"

4. **Use Multi-Word Phrases**
   - "all-on-4"
   - "bone graft"
   - "root canal"

#### Keyword Best Practices:

✅ **Do:**
- Add 5-10 keywords per tag
- Include both technical and patient-friendly terms
- Test keywords by searching for them
- Update based on missed matches

❌ **Don't:**
- Use overly generic words ("tooth", "dental")
- Include special characters (system auto-removes them)
- Make keywords too long (3-4 words max)
- Duplicate keywords across tags (creates confusion)

---

### Step 4: Set Tag Priority (Optional)

If you have multiple tags that might match the same inquiry, use priorities:

- **Priority 1:** Highest - Routes here first
- **Priority 2:** Medium - Routes here if Priority 1 doesn't match
- **Priority 3+:** Lower priorities

**Example Scenario:**
- Patient says: "I need a crown for my implant"
- Matches both "crown" and "dental_implant" tags
- If "dental_implant" has Priority 1, deal routes there
- This is correct because implants are typically higher value

---

### Step 5: Test Your Tag

After creating a tag, **test it immediately**:

1. Go to **Create New Deal**
2. Type a deal title that should match your tag
   - Example: "Patient needs dental implants"
3. Check if the tag appears in suggestions
4. See which pipeline is recommended

If the tag doesn't match, **adjust your keywords** and test again.

---

### Step 6: Create Additional Tags

Repeat Steps 2-5 for each of your main services.

#### Recommended Starter Set (10 tags):

1. **High-Value Procedures**
   - `dental_implant` - Implants
   - `full_arch` - Full arch reconstruction
   - `smile_makeover` - Cosmetic smile makeovers
   - `all_on_4` - All-on-4/6 procedures

2. **Common Procedures**
   - `crown` - Crowns and bridges
   - `root_canal` - Root canal therapy
   - `extraction` - Tooth extractions

3. **Cosmetic**
   - `whitening` - Teeth whitening
   - `veneers` - Veneers

4. **Orthodontics**
   - `orthodontics` - Braces, Invisalign

5. **Emergency**
   - `emergency` - Urgent care

6. **General**
   - `general_dental` - Checkups, cleanings

---

### Step 7: Activate Your Tags

Once you've created your tags:

1. Review the list
2. Ensure each tag has:
   - ✓ Clear name
   - ✓ 5+ keywords
   - ✓ Color assigned
   - ✓ Active checkbox checked
3. Click **Save All Changes**

Your tags are now live and ready to route deals!

---

## Best Practices

### Naming Conventions

✅ **Good Tag Names:**
- `dental_implant`
- `teeth_whitening`
- `emergency_care`
- `orthodontic_treatment`

❌ **Bad Tag Names:**
- `Dental Implant` (use underscores, not spaces)
- `implants!!!` (no special characters)
- `service1` (not descriptive)
- `DentalImplant` (use lowercase)

---

### Keyword Strategy

**Start Broad, Then Refine:**

1. **Week 1:** Start with obvious keywords
2. **Week 2:** Review missed matches in analytics
3. **Week 3:** Add keywords based on common phrases
4. **Ongoing:** Continuously improve based on data

**Example Evolution:**

**Initial Keywords:**
```
implant, dental implant, implants
```

**After 2 weeks (reviewing analytics):**
```
implant, dental implant, implants, tooth implant, 
implant surgery, missing tooth, fake tooth, 
permanent tooth, tooth replacement, all-on-4, all-on-6
```

---

### Organization Tips

**Group Related Tags:**

Use prefixes for organization:
- `implant_single` - Single tooth implant
- `implant_multiple` - Multiple implants
- `implant_full_arch` - Full arch

Or use categories:
- `cosmetic_whitening`
- `cosmetic_veneers`
- `cosmetic_bonding`

---

### Multi-Location Practices

If you have multiple locations:

**Option 1: Location-Specific Tags**
```
Location A:
- ortho_braces_downtown
- ortho_invisalign_downtown

Location B:
- ortho_braces_suburb
- ortho_invisalign_suburb
```

**Option 2: Shared Tags** (Recommended)
```
All Locations:
- orthodontics
- dental_implant
- whitening

(Pipeline mappings differ by location)
```

---

## Common Examples

### Example 1: Dental Implant Practice

**Tag Setup:**
```
Tag: dental_implant
Display: Dental Implant
Keywords: implant, implants, dental implant, tooth implant, 
          implant surgery, missing tooth, tooth replacement, 
          permanent tooth, fake tooth, artificial tooth, 
          all-on-4, all-on-6, full arch implant
Color: #3B82F6 (Blue)
Icon: 🦷
Priority: 1 (High Value)
```

---

### Example 2: Cosmetic Dentistry

**Tag Setup:**
```
Tag: veneers
Display: Veneers
Keywords: veneer, veneers, porcelain veneers, smile makeover, 
          cosmetic veneers, teeth veneers, veneer consultation
Color: #8B5CF6 (Purple)
Icon: ✨
Priority: 2 (Medium-High Value)
```

---

### Example 3: Emergency Care

**Tag Setup:**
```
Tag: emergency
Display: Emergency
Keywords: emergency, urgent, pain, severe pain, toothache, 
          broken tooth, knocked out tooth, dental emergency, 
          same day, asap, help, bleeding, swelling
Color: #EF4444 (Red)
Icon: 🚨
Priority: 1 (Highest - needs immediate attention)
```

---

### Example 4: General Dentistry

**Tag Setup:**
```
Tag: general_dental
Display: General Dentistry
Keywords: checkup, cleaning, exam, hygiene, routine, 
          preventive, maintenance, dental exam, 
          teeth cleaning, six month checkup
Color: #10B981 (Green)
Icon: 🦷
Priority: 3 (Standard)
```

---

## Troubleshooting

### Problem: Tag Not Matching Deals

**Possible Causes:**
1. Keywords don't match patient language
2. Tag is inactive
3. Deal text doesn't contain any keywords

**Solutions:**
1. Review your keywords - are they too technical?
2. Check the "Active" checkbox is enabled
3. Add more keyword variations
4. Test with exact phrases patients use

---

### Problem: Wrong Tag Matching

**Possible Causes:**
1. Keywords too generic
2. Multiple tags with overlapping keywords
3. Priority not set correctly

**Solutions:**
1. Make keywords more specific
2. Review all tags for keyword conflicts
3. Adjust priorities so higher-value treatments route first
4. Use multi-word phrases instead of single words

---

### Problem: Too Many Tags

**Symptom:** System is slow, confusing to manage

**Solution:**
1. Consolidate similar tags
2. Use broader categories
3. Archive unused tags
4. Aim for 10-20 active tags maximum

---

### Problem: Tags Not Syncing Across Team

**Possible Causes:**
1. Browser cache issue
2. Permissions issue
3. Changes not saved

**Solutions:**
1. Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
2. Check user has correct permissions
3. Click "Save All Changes" button
4. Contact support if issue persists

---

## Next Steps

After setting up your tags:

1. ✅ **Map Tags to Pipelines** → See [Tag-to-Pipeline Mapping Guide](#)
2. ✅ **Review Analytics** → See [Routing Analytics Guide](#)
3. ✅ **Train Your Team** → Share this guide
4. ✅ **Monitor & Improve** → Check weekly for missed matches

---

## Need Help?

- 📧 **Email:** support@dentalcrm.com
- 💬 **Live Chat:** Click chat icon in bottom right
- 📚 **Knowledge Base:** help.dentalcrm.com
- 📞 **Phone:** 1-800-DENTAL-CRM

---

## Appendix: Tag Template

Use this template when creating new tags:

```
Tag Name: _______________
Display Name: _______________
Keywords: _______________, _______________, _______________
Color: #_______________ (or use color picker)
Icon: _______________
Description: _______________________________________________
Location: All Locations / Specific Location
Priority: 1 (High) / 2 (Medium) / 3 (Low)
Active: ✓ Yes / ☐ No
```

---

**💡 Pro Tip:** Start with 5-10 tags that cover 80% of your cases. You can always add more later as you identify patterns.

**🎯 Goal:** Automatic routing for 90%+ of your deals within 30 days of setup.

---

*Last Updated: October 19, 2025*  
*Version: 1.0.0*  
*© 2025 Dental CRM. All rights reserved.*

