# ⚡ Quick Start Guide

Get your dummy practice website live on **dentalcrmtest.com** in 5 minutes!

## 🎯 What You Need

1. ✅ Domain: `dentalcrmtest.com` (you have this)
2. ✅ CRM form URL (get from your CRM)
3. ✅ 5 minutes

## 🚀 3-Step Setup

### Step 1: Get Your Form URL (2 min)

1. Open your CRM
2. Go to **Forms** → Select/Create a form
3. Click **Publish** or **Share**
4. Copy the form URL (looks like: `https://your-crm.com/f/form-slug`)

### Step 2: Update index.html (1 min)

1. Open `index.html`
2. Find line ~150 (form section)
3. Replace the placeholder with:

```html
<iframe 
    src="YOUR-FORM-URL-HERE" 
    width="100%" 
    height="600" 
    frameborder="0" 
    style="border: none;">
</iframe>
```

### Step 3: Deploy (2 min)

**Easiest option - Vercel:**

```bash
cd public/dummy-practice-website
npm install -g vercel
vercel --prod
```

Then:
1. Go to https://vercel.com/dashboard
2. Click your project → **Settings** → **Domains**
3. Add `dentalcrmtest.com`
4. Update DNS at your domain registrar (CNAME to `cname.vercel-dns.com`)

**Done!** 🎉

## 📋 Checklist

- [ ] Form URL copied from CRM
- [ ] Form URL added to `index.html`
- [ ] Website deployed to hosting
- [ ] Domain `dentalcrmtest.com` connected
- [ ] DNS configured
- [ ] Tested form submission

## 🆘 Quick Troubleshooting

**Form not showing?**
- Check form URL is correct
- Make sure form is published in CRM

**Domain not working?**
- Wait 5 min - 2 hours for DNS
- Check DNS records are correct

**Need more help?**
- See `README.md` for detailed instructions
- See `../FORM_HOSTING_GUIDE.md` for complete guide

---

**Total Cost:** $0/month (completely free!)





