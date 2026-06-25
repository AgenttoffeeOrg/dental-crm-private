# 🏥 PMS Integration - User Guide

**How to connect your Practice Management Software to the CRM**

---

## 🎯 What This Integration Does

**Automatically syncs data between your PMS and CRM:**

1. **Treatment Plans** → Auto-creates deals
2. **Treatment Acceptance** → Marks deals as won
3. **Payments** → Tracks real revenue and LTV
4. **Patients** → Syncs to CRM contacts

**Result:** Complete patient lifecycle tracking from first contact to treatment to payment!

---

## 🚀 Quick Start (5 Minutes)

### **Step 1: Run Database Migration**

1. Open Supabase Dashboard
2. Go to SQL Editor
3. Paste contents of: `supabase/sql/44_pms_integration.sql`
4. Click "Run"
5. Wait for success message

### **Step 2: Configure Webhooks in Your PMS**

Add these webhook URLs to your PMS system:

**Treatment Proposed:**
```
https://your-domain.com/api/integrations/pms/webhooks/treatment-proposed
```

**Treatment Accepted:**
```
https://your-domain.com/api/integrations/pms/webhooks/treatment-accepted
```

**Treatment Declined:**
```
https://your-domain.com/api/integrations/pms/webhooks/treatment-declined
```

**Payment Received:**
```
https://your-domain.com/api/integrations/pms/webhooks/payment-received
```

**Patient Created/Updated:**
```
https://your-domain.com/api/integrations/pms/webhooks/patient-sync
```

### **Step 3: Configure Settings in CRM**

1. Go to **Settings** → **PMS Integration**
2. Enable auto-create deals
3. Set minimum deal value (e.g., $1,000)
4. Add excluded procedures (e.g., "D1110, D0150" for cleanings/exams)
5. Click **Save**

### **Step 4: Test the Integration**

1. Create a test treatment plan in your PMS
2. Check CRM - a deal should auto-create
3. Accept the treatment in PMS
4. Check CRM - deal should move to "Won"
5. Record a payment in PMS
6. Check CRM - LTV should update

**✅ Done! Your PMS and CRM are now connected!**

---

## 📊 What Gets Synced

### **From PMS → CRM:**

| Data Type | What Syncs | What Happens in CRM |
|-----------|-----------|---------------------|
| **Patients** | Name, email, phone, DOB | Creates/updates Contact |
| **Treatment Plans** | Type, cost, procedures, status | Creates Deal |
| **Treatment Accepted** | Acceptance date, final cost | Marks Deal as "Won" |
| **Treatment Declined** | Decline reason | Marks Deal as "Lost" |
| **Payments** | Amount, method, date | Updates LTV & Actual Revenue |

### **From CRM → PMS** (Optional):

| Data Type | What Syncs | What Happens in PMS |
|-----------|-----------|---------------------|
| **New Leads** | When they book appointment | Creates Patient record |
| **Activities** | Calls, emails, notes | Added to patient chart |

---

## ⚙️ Configuration Options

### **Auto-Create Deals:**

**When:** Treatment plan is proposed in PMS  
**What:** Creates deal in CRM automatically  
**Settings:**
- Minimum value threshold (only create for treatments >$X)
- Excluded procedures (don't create deals for cleanings, exams)
- Pipeline mapping (which pipeline for which treatment type)

**Example:**
```
✅ Create deal for: Crown ($5,000)
✅ Create deal for: Implant ($15,000)
❌ Skip deal for: Cleaning ($150) - below minimum
❌ Skip deal for: Exam ($75) - excluded procedure
```

### **Auto-Close Deals:**

**When:** Treatment is accepted/declined in PMS  
**What:** Moves deal to Won/Lost stage  
**Benefits:**
- No manual updates needed
- Real-time pipeline accuracy
- Automatic win/loss tracking

### **Payment Tracking:**

**When:** Payment recorded in PMS  
**What:** Updates actual revenue and LTV  
**Automatic:**
- Contact LTV = Sum of all payments
- Deal actual revenue = Treatment payments
- Marketing ROI = Real revenue / ad spend

---

## 🔍 How It Works

### **Scenario 1: New Treatment Plan**

```
┌─────────────────────────────────────────┐
│ 1. Doctor proposes crown ($5,000)      │
│    in Dentrix/Open Dental               │
└─────────────────────────────────────────┘
                 ↓ (Webhook)
┌─────────────────────────────────────────┐
│ 2. CRM receives "treatment-proposed"   │
│    webhook                              │
└─────────────────────────────────────────┘
                 ↓ (Auto)
┌─────────────────────────────────────────┐
│ 3. CRM creates deal:                    │
│    "Crown - John Smith"                 │
│    Value: $5,000                        │
│    Stage: "Proposal Sent"               │
│    Source: PMS                          │
└─────────────────────────────────────────┘
```

### **Scenario 2: Treatment Accepted**

```
┌─────────────────────────────────────────┐
│ 1. Patient accepts crown in PMS        │
└─────────────────────────────────────────┘
                 ↓ (Webhook)
┌─────────────────────────────────────────┐
│ 2. CRM receives "treatment-accepted"   │
└─────────────────────────────────────────┘
                 ↓ (Auto)
┌─────────────────────────────────────────┐
│ 3. Deal moves to "Won" stage           │
│    Status: Closed-Won                   │
└─────────────────────────────────────────┘
```

### **Scenario 3: Payment Received**

```
┌─────────────────────────────────────────┐
│ 1. Patient pays $5,000 in PMS          │
└─────────────────────────────────────────┘
                 ↓ (Webhook)
┌─────────────────────────────────────────┐
│ 2. CRM receives "payment-received"     │
└─────────────────────────────────────────┘
                 ↓ (Auto via Triggers)
┌─────────────────────────────────────────┐
│ 3. Contact LTV updates: $5,000         │
│ 4. Deal actual_revenue: $5,000         │
│ 5. Analytics update with real $$$      │
└─────────────────────────────────────────┘
```

---

## 📈 Analytics Impact

### **New Metrics Available:**

1. **Actual vs Estimated Revenue**
   - See how accurate your estimates are
   - Improve future estimates

2. **True Marketing ROI**
   - Real revenue attributed to campaigns
   - Calculate actual CAC and LTV:CAC ratio

3. **Treatment Type Performance**
   - Which treatments are most profitable
   - Acceptance rates by procedure
   - Revenue by treatment category

4. **Real Patient Lifetime Value**
   - Sum of all actual payments
   - Track LTV growth over time
   - Identify high-value patients

---

## 🔧 Troubleshooting

### **Problem: Deals not auto-creating**

**Check:**
1. Is PMS integration enabled in Settings?
2. Is auto-create deals turned on?
3. Does treatment meet minimum value?
4. Is procedure code excluded?
5. Check webhook URL is correct in PMS

**Solution:** Review PMS settings page, check sync logs

### **Problem: LTV not updating**

**Check:**
1. Are payment webhooks being received?
2. Is treatment plan linked to contact?
3. Check payment status (must be "completed")

**Solution:** Check `pms_sync_logs` table for errors

### **Problem: Wrong pipeline selected**

**Check:**
1. Treatment type mapping configuration
2. Default pipeline settings

**Solution:** Configure pipeline mappings in Settings

---

## 📞 Support

### **Check Sync Logs:**
Go to Settings → PMS Integration → View Sync History

Shows:
- All sync operations
- Success/failure status
- Error messages
- Records processed

### **Manual Sync:**
If automatic sync fails, you can trigger manual sync:
1. Settings → PMS Integration
2. Click "Sync Now"
3. Select what to sync (patients, treatments, payments)

---

## 🎯 Best Practices

### **1. Start with Test Data**
- Test with a few patients first
- Verify deals create correctly
- Check LTV updates properly

### **2. Configure Exclusions**
- Exclude routine procedures (cleanings, exams)
- Set appropriate minimum value
- Avoid deal spam

### **3. Monitor Sync Health**
- Check sync logs weekly
- Set up alerts for sync failures
- Review patient matching accuracy

### **4. Train Your Team**
- Show them where PMS data appears
- Explain automatic deal creation
- Demo the treatment analytics

---

## ✅ Quick Reference

### **Webhook Payloads:**

**Treatment Proposed:**
```json
{
  "tenant_id": "uuid",
  "integration_id": "uuid",
  "pms_patient_id": "12345",
  "pms_treatment_id": "TP-789",
  "treatment_type": "Crown",
  "description": "Crown on tooth #14",
  "procedure_codes": ["D2750"],
  "estimated_cost": 5000,
  "provider_name": "Dr. Smith",
  "proposed_at": "2025-10-13T10:00:00Z"
}
```

**Payment Received:**
```json
{
  "tenant_id": "uuid",
  "integration_id": "uuid",
  "pms_payment_id": "PAY-123",
  "pms_treatment_id": "TP-789",
  "amount": 5000,
  "payment_method": "credit_card",
  "payment_date": "2025-10-13",
  "patient_paid": 5000,
  "insurance_paid": 0
}
```

---

**The PMS integration is now live and working!** 🎉

Need help? Check sync logs or contact support.


