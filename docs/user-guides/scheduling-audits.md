# Scheduling Audits - User Guide

## Overview

Schedule marketing audits to run automatically weekly or monthly. Get consistent insights without manual work.

**User Experience:** Set once, forget it, receive reports automatically.

---

## Quick Start: Schedule Your First Audit

### Step 1: Navigate to Marketing Audit

Click **Marketing Audit** in the sidebar.

### Step 2: Open Schedule Settings

Click the **Settings** gear icon → **Schedule Audits**

### Step 3: Create Schedule

1. **Frequency:** Choose Weekly or Monthly
2. **Day/Time:** Pick when to run (e.g., "Every Monday at 9am")
3. **Email Report:** Toggle ON to receive email when complete
4. **Click "Save Schedule"**

✅ Done! Your audits will now run automatically.

---

## Schedule Options

### Frequency

**Weekly:**
- Runs every 7 days
- Best for: Active practices, heavy marketing efforts
- Cost: ~$0.10/week in API costs

**Monthly:**
- Runs every 30 days
- Best for: Most practices, stable online presence
- Cost: ~$0.10/month in API costs

**Custom (Enterprise):**
- Pick specific days/times
- Run conditionally (e.g., only if score drops)

---

## Email Reports

### What's Included:

✅ Current score + trend (up/down)  
✅ Top 5 recommendations  
✅ Competitor changes  
✅ Critical alerts  
✅ Direct link to full report  

### Who Gets Emails:

- Practice Owner (always)
- Marketing Manager (if assigned)
- Custom recipients (add in settings)

**Example Email Subject:**
> Marketing Audit Complete: Score 78.5 (+2.3) 📈

---

## Viewing Scheduled Audits

### Upcoming Audits

Go to **Marketing Audit** → **Schedule** to see:

- Next audit date/time
- Frequency
- Last run date
- Status (active/paused)

### Past Audits

View history in **History** tab:

- List of all audits
- Scores over time
- Click any to view details

---

## Managing Your Schedule

### Pause Schedule

1. Go to **Schedule** settings
2. Toggle "Active" to OFF
3. Click "Save"

**Result:** No audits will run until you re-enable.

### Edit Schedule

1. Go to **Schedule** settings
2. Change frequency or time
3. Click "Save"

**Next audit will use new schedule.**

### Delete Schedule

1. Go to **Schedule** settings
2. Click "Delete Schedule"
3. Confirm

**Audits stop permanently. Manual audits still work.**

---

## Best Practices

### For Most Practices:

**Recommended:** Monthly schedule, Monday mornings

**Why:**
- SEO changes take time (weeks to months)
- Reduces API costs
- Consistent monthly reporting

### For Active Marketing Campaigns:

**Recommended:** Weekly schedule

**Why:**
- See impact of campaigns quickly
- Catch issues faster
- More competitor data

### For New Practices:

**Recommended:** Weekly for 2 months, then monthly

**Why:**
- Initial improvements happen quickly
- After foundation is solid, monthly is sufficient

---

## Alerts & Notifications

### When You'll Be Notified:

📧 **Email:**
- Audit completed
- Score dropped >5 points
- New critical issue detected

🔔 **In-App:**
- Audit started
- Audit completed
- Recommendation dismissed

⚠️ **Urgent:**
- Website down
- Google Business Profile suspended
- Large ranking drop

---

## Cost & Quota

### API Costs

Each audit uses:
- Google PageSpeed: Free (limited quota)
- Search Console: Free (OAuth)
- GA4: Free (OAuth)
- Places API: ~$0.017 per audit

**Total:** ~$0.02-0.10 per audit depending on enabled features.

### Rate Limits

- **Per Practice:** 10 audits/day max
- **Google APIs:** Shared quota across all practices
- **Scheduled audits:** Don't count toward manual limit

---

## Troubleshooting

### Scheduled Audit Didn't Run

**Possible Reasons:**
1. Schedule was paused
2. API quota exceeded
3. Practice domain missing

**Solution:** Check **Schedule** settings, verify domain is set.

### No Email Received

**Possible Reasons:**
1. Email toggle is OFF
2. Email in spam folder
3. Email address incorrect

**Solution:** Check spam, verify email in profile settings.

### Audit Fails Repeatedly

**Possible Reasons:**
1. Website is down
2. OAuth expired
3. API key invalid

**Solution:** Test manually, check API credentials.

---

## FAQ

### Q: Can I run manual audits if I have a schedule?
**A:** Yes! Schedule doesn't prevent manual audits.

### Q: Do scheduled audits use my API quota?
**A:** Yes, same quota as manual audits.

### Q: Can I schedule for different times on different days?
**A:** Not in Phase 1. Enterprise plan supports custom schedules.

### Q: What if my website is down when audit runs?
**A:** Audit will fail gracefully and send alert. Try again in 24 hours automatically.

### Q: Can I get Slack notifications instead of email?
**A:** Coming in Phase 2! Email only for now.

### Q: Do audits run on weekends?
**A:** Yes, if scheduled. But Monday mornings are recommended for business reporting.

---

## Advanced: Conditional Scheduling (Enterprise)

**Phase 3 Feature:**

Run audits automatically when:
- Score drops >5 points
- Competitor rank changes
- New competitor appears
- Website changes detected
- Marketing campaign starts

---

**Need Help?** Contact support or see [Troubleshooting Guide](/docs/troubleshooting)

