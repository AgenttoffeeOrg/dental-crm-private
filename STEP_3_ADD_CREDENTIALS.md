# 🎯 STEP 3: ADD YOUR CREDENTIALS

## ✅ **I ADDED THE TEMPLATE!**

Your `.env.local` file now has the Google credentials section!

---

## 🔧 **WHAT YOU NEED TO DO:**

### **1. Open** `.env.local` file in your editor

### **2. Find** these lines at the bottom:

```bash
GOOGLE_API_KEY=AIzaSyBR-BNaVJC5y10PFVL3h64RpNBoet3WlN8

GOOGLE_CLIENT_ID=YOUR_CLIENT_ID_HERE
GOOGLE_CLIENT_SECRET=YOUR_CLIENT_SECRET_HERE
```

### **3. Replace** `YOUR_CLIENT_ID_HERE` with your actual Client ID

Example - Change from:
```bash
GOOGLE_CLIENT_ID=YOUR_CLIENT_ID_HERE
```

To:
```bash
GOOGLE_CLIENT_ID=123456789-abc123.apps.googleusercontent.com
```

### **4. Replace** `YOUR_CLIENT_SECRET_HERE` with your actual Client Secret

Example - Change from:
```bash
GOOGLE_CLIENT_SECRET=YOUR_CLIENT_SECRET_HERE
```

To:
```bash
GOOGLE_CLIENT_SECRET=GOCSPX-xyz789abc
```

### **5. Save** the file (Cmd+S or Ctrl+S)

---

## ✅ **FINAL .ENV.LOCAL SHOULD LOOK LIKE:**

```bash
# ... your existing variables ...

NEXT_PUBLIC_ENABLE_MARKETING_AUDIT=true

# ============================================
# GOOGLE CLOUD API CREDENTIALS
# ============================================

# Google API Key (for PageSpeed Insights, Places API)
GOOGLE_API_KEY=AIzaSyBR-BNaVJC5y10PFVL3h64RpNBoet3WlN8

# Google OAuth Credentials
GOOGLE_CLIENT_ID=123456789-abc123.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xyz789abc

# ... rest of file ...
```

(Replace with YOUR actual Client ID and Secret!)

---

## 🎯 **AFTER YOU SAVE:**

**Tell me**: "Credentials added" or "Done"

**Then I'll restart your server and we can TEST!** 🚀

---

**This is the last config step! Then we run your first audit!** 🎉

