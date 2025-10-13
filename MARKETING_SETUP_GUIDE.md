# 🚀 MARKETING MODULE - SETUP GUIDE

**Quick setup to activate the Marketing module**

---

## ⚡ QUICK START (5 Minutes)

### Step 1: Run Database Migrations

Open Supabase SQL Editor and run these 5 files **in order**:

```sql
-- File 1: Core tables (audiences, segments, templates)
supabase/sql/20_marketing_core_tables.sql

-- File 2: Campaigns & tracking
supabase/sql/21_marketing_campaigns.sql

-- File 3: Automation journeys
supabase/sql/22_marketing_automation.sql

-- File 4: Forms & landing pages
supabase/sql/23_marketing_forms.sql

-- File 5: Collaboration & AI
supabase/sql/24_marketing_collaboration.sql
```

### Step 2: Access the Module

1. Open your app: `http://localhost:3001`
2. Click **"Marketing"** in the left sidebar
3. You'll see the Marketing Dashboard!

### Step 3: Test It Out

1. **Create an Audience**
   - Go to Audiences & Segments
   - Click "New Audience"
   - Add a segment filter (e.g., "marketing_consent = true")
   - Save

2. **Build a Template**
   - Go to Email Templates
   - Click "New Template"
   - Drag blocks to build your email
   - Add merge tags like `{{contact.first_name}}`
   - Save

3. **Create a Campaign**
   - Go to Campaigns
   - Click "New Campaign"
   - Follow the 5-step wizard
   - Save as draft

4. **View Reports**
   - Go to Reports & Analytics
   - See the dashboard (will populate with data)

---

## 🔧 PROVIDER SETUP (Optional)

To actually send emails/SMS, configure providers:

### SendGrid (Email)
```typescript
// In marketing_settings table:
UPDATE marketing_settings SET
  mail_provider = 'sendgrid',
  mail_provider_api_key = 'YOUR_SENDGRID_API_KEY',
  mail_default_from_email = 'hello@yourpractice.com',
  mail_default_from_name = 'Your Practice Name'
WHERE tenant_id = 'YOUR_TENANT_ID';
```

### Twilio (SMS)
```typescript
// Enable SMS + add credentials:
UPDATE marketing_settings SET
  enable_sms = true,
  sms_provider = 'twilio',
  sms_provider_api_key = 'YOUR_TWILIO_AUTH_TOKEN',
  sms_provider_phone_number = '+1234567890'
WHERE tenant_id = 'YOUR_TENANT_ID';
```

Without provider setup, campaigns will log to database but won't actually send.

---

## 📋 VERIFICATION CHECKLIST

- [ ] All 5 SQL migrations run successfully
- [ ] "Marketing" appears in left sidebar
- [ ] Marketing Dashboard loads
- [ ] Can create an audience
- [ ] Can build an email template
- [ ] Can create a campaign (draft)
- [ ] Can build a journey
- [ ] Reports page loads

If all checked ✅ - You're good to go!

---

## 🎯 WHAT YOU CAN DO NOW

### Without Provider Setup:
- ✅ Create audiences & segments
- ✅ Build email templates
- ✅ Design campaigns
- ✅ Build automation journeys
- ✅ Create forms
- ✅ View UI & test workflows

### With Provider Setup:
- ✅ Send actual emails
- ✅ Send actual SMS
- ✅ Track opens/clicks
- ✅ Receive bounce notifications
- ✅ Full campaign analytics

---

## 💡 TIPS

1. **Start Small:** Create 1 audience, 1 template, 1 campaign
2. **Test First:** Use test contacts before production
3. **Check Consent:** Filter for `marketing_consent = true`
4. **Use Merge Tags:** Personalize with `{{contact.first_name}}`
5. **Monitor Reports:** Check analytics after each send

---

## 🆘 TROUBLESHOOTING

### "Marketing" not in sidebar?
- Refresh browser (Cmd+R)
- Check `dashboard-layout.tsx` was updated

### Can't create audience?
- Run `20_marketing_core_tables.sql` migration
- Check Supabase logs for errors

### Template builder not working?
- Run all 5 migrations
- Check browser console for errors

### Campaigns won't send?
- Add provider API keys in `marketing_settings`
- Check provider status in Settings

---

## 📖 FULL DOCS

- **Master Plan:** `MARKETING_MODULE_MASTER_PLAN.md`
- **Task Breakdown:** `MARKETING_MODULE_TASKS.md`
- **Completion Report:** `MARKETING_MODULE_COMPLETE.md`

---

**You're all set! The Marketing module is ready to use! 🎉**

Click "Marketing" in your sidebar and start building campaigns!

