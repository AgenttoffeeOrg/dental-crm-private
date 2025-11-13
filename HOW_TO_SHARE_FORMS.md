# 📋 How to Share Forms - Quick Guide

The share modal is now working! Here's how to get your form URL to embed in your dummy website.

## ✅ Step-by-Step Instructions

### Step 1: Create or Edit a Form

1. Go to **Forms** in your CRM
2. Click **"Create Form"** or click **Edit** on an existing form
3. Add your form fields (Name, Email, Phone, etc.)
4. Configure form settings

### Step 2: Publish Your Form

1. In the form editor, go to the **"Settings"** tab (or scroll down)
2. Find the **"Publishing"** section
3. **Toggle ON** "Publish Form"
4. **Enter a URL slug** (e.g., `appointment-request`, `contact-us`, `new-patient`)
   - This will be your form's public URL: `/f/your-slug`
   - Use lowercase, no spaces (use hyphens)

### Step 3: Save the Form

1. Click **"Save"** or **"Update Form"**
2. Make sure the form status is set to **"Active"** (not Draft)

### Step 4: Get Your Form URL/Embed Code

1. Go back to the Forms list
2. Click the **Share button** (📤 icon) on your form card
   - OR click the **three dots menu** → **"Share & Embed"**
3. The **Share Modal** will open with:
   - **Hosted Link** - Direct URL to your form
   - **iframe Code** - Embed code for your website
   - **Script Code** - JavaScript embed
   - **Static HTML** - Downloadable HTML file
   - **QR Code** - For print materials

### Step 5: Copy the URL/Code

**For your dummy website, use the iframe code:**

```html
<iframe
  src="https://YOUR-CRM-DOMAIN.com/f/YOUR-FORM-SLUG"
  width="100%"
  height="600"
  frameborder="0"
  style="border: none;"
>
</iframe>
```

**Or use the Hosted Link directly:**

```
https://YOUR-CRM-DOMAIN.com/f/YOUR-FORM-SLUG
```

## 🔧 Troubleshooting

### "Share modal coming soon!" still showing?

- **Refresh your browser** (the code was just updated)
- Make sure you're clicking the Share button, not Analytics

### Form not showing when I visit the URL?

- Check that `is_published = true` in form settings
- Check that `status = 'active'` (not 'draft')
- Verify the `public_url_slug` is set
- Make sure the slug matches the URL you're visiting

### Form URL not working?

- Check your CRM domain is correct
- Make sure the form route exists: `/f/[slug]`
- Check browser console for errors

### Can't find "Publish Form" toggle?

- It's in the form editor → Settings tab → Publishing section
- Scroll down in the form editor if you don't see it

## 📝 Quick Checklist

- [ ] Form created/edited
- [ ] Form status = "Active"
- [ ] "Publish Form" toggle = ON
- [ ] `public_url_slug` set (e.g., "appointment-request")
- [ ] Form saved
- [ ] Share button clicked
- [ ] URL/code copied
- [ ] Added to dummy website

## 🎯 Example

**Form Name:** "New Patient Appointment Request"
**Slug:** `appointment-request`
**Published:** ✅ Yes
**Status:** Active

**Your form URL will be:**

```
https://your-crm-domain.com/f/appointment-request
```

**Embed code for website:**

```html
<iframe
  src="https://your-crm-domain.com/f/appointment-request"
  width="100%"
  height="600"
  frameborder="0"
>
</iframe>
```

---

**That's it!** Now you can embed your form in the dummy practice website at `dentalcrmtest.com`! 🎉
