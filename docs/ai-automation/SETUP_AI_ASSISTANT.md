# 🚀 SETUP AI ASSISTANT - STEP BY STEP

**Quick Start:** 3 simple steps to activate the SMARTEST AI assistant!

---

## 📋 **WHAT YOU NEED:**

1. ✅ OpenAI API Key (get from https://platform.openai.com)
2. ✅ Supabase access (you already have this)
3. ✅ 5 minutes

---

## 🎯 **STEP-BY-STEP SETUP:**

### **Step 1: Get OpenAI API Key**

```bash
1. Go to: https://platform.openai.com/api-keys
2. Sign in (or create account)
3. Click "+ Create new secret key"
4. Name it: "Dental CRM AI Assistant"
5. Copy the key: sk-proj-...
```

**Cost:** Pay-as-you-go
- First $5 free credit
- Then ~£0.04 per AI question
- ~£100-200/month for 5-10 users

---

### **Step 2: Add API Key to Your App**

```bash
1. Open your project folder
2. Find file: .env.local
3. Add this line:

OPENAI_API_KEY=sk-proj-YOUR_KEY_HERE

4. Save the file
```

**Example `.env.local`:**
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
OPENAI_API_KEY=sk-proj-abc123... ← ADD THIS LINE
```

---

### **Step 3: Run Database Migration**

```bash
1. Go to Supabase Dashboard
2. Click "SQL Editor"
3. Click "+ New query"
4. Open file: 17_ai_assistant_tables.sql
5. Copy ALL contents
6. Paste in Supabase
7. Click "Run" ▶
8. Wait for "Success" ✅
```

**This creates 5 new tables:**
- `ai_chat_sessions` - Conversation memory
- `ai_email_drafts` - Auto-generated drafts
- `ai_assistant_preferences` - Your settings
- `ai_usage_analytics` - Usage tracking
- `ai_suggestions` - Proactive alerts

---

### **Step 4: Restart Your App**

```bash
1. Stop dev server (Ctrl+C in terminal)
2. Start again: npm run dev
3. Wait for "Ready"
4. Go to: http://localhost:3000
```

---

## ✅ **VERIFY IT WORKS:**

### **Test 1: Deal AI Assistant**
```
1. Go to Pipeline page
2. Click any deal card
3. Look RIGHT → See "🤖 AI Assistant" sidebar
4. Type: "What's the status of this deal?"
5. Press Enter
6. ✅ AI responds with smart summary!
```

### **Test 2: Contact AI Assistant**
```
1. Go to Contacts
2. Click any contact
3. Look RIGHT → See AI sidebar
4. Type: "Show me all deals for this patient"
5. ✅ AI lists all deals with insights!
```

### **Test 3: Global AI Assistant**
```
1. Go to Pipeline page
2. See floating 🤖 button (bottom-right)
3. Click it
4. Type: "Which deals should I focus on today?"
5. ✅ AI prioritizes your deals!
```

### **Test 4: AI Settings**
```
1. Go to Settings → AI Assistant tab
2. See all customization options
3. Add a custom rule: "Always mention financing for deals >£3k"
4. Click Save
5. ✅ AI now follows your rule!
```

### **Test 5: AI Analytics**
```
1. Go to Settings → AI Analytics tab
2. See usage stats
3. See costs
4. See ROI estimate
5. ✅ Track everything!
```

---

## 🎨 **WHAT YOU'LL SEE:**

### **On Deal Page:**
```
┌──────────────────────┬─────────────────────┐
│ Deal: Dental Implants│ 🤖 AI Assistant     │
│                      │                     │
│ £15,000              │ 👋 Hi! I've        │
│ Stage: Planning      │ analyzed all 12    │
│                      │ conversations.      │
│ Activities:          │                     │
│ • Call (3 days ago)  │ Ask me anything!   │
│ • Email (5 days ago) │                     │
│                      │ [Summarize Deal]   │
│ Intelligence:        │ [Draft Email]      │
│ 85% Likely          │ [Suggest Tasks]     │
│ Positive Sentiment   │                     │
│                      │ You: What's the    │
│ [View Details]       │ status?            │
│                      │                     │
│                      │ AI: This is a hot  │
│                      │ lead! Patient is...│
│                      │                     │
│                      │ ✏️ Type here...    │
└──────────────────────┴─────────────────────┘
```

---

### **Floating AI Button (Pipeline/Tasks):**
```
            [Your Page Content]


                                   [🤖] ← Click!
```

**Click → Panel slides up!**

---

## 💡 **TIPS FOR BEST RESULTS:**

### **Ask Specific Questions:**
```
Good: "What concerns did they mention in the last 3 calls?"
Bad:  "Tell me about this"

Good: "Draft an email addressing their payment concerns"
Bad:  "Write email"

Good: "Which of my 15 deals should I focus on today?"
Bad:  "Help me"
```

### **Use Quick Actions:**
```
Instead of typing:
"Can you draft an email for me?"

Just click:
[Draft Email] button in AI response!
```

### **Teach AI Your Style:**
```
Go to Settings → AI Assistant
Add custom rules:
"For implant deals, mention our 10-year warranty"
"Always include patient testimonials for cosmetic work"
"Emphasize family package deals for multiple patients"

AI learns YOUR practice style!
```

---

## 🎊 **YOU'RE READY!**

**Once you complete the 4 setup steps above:**

✅ AI on every deal page  
✅ AI on every contact page  
✅ AI floating button on all pages  
✅ Auto-draft emails  
✅ Smart task suggestions  
✅ Daily briefings  
✅ Proactive monitoring  
✅ Full customization  
✅ Cost tracking  

---

**GET YOUR OPENAI API KEY AND LET'S GO!** 🚀🤖✨


