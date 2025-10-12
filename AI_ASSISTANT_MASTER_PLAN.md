# 🤖 AI PERSONAL ASSISTANT - MASTER PLAN

**Goal:** Build the SMARTEST, most helpful AI assistant for your dental CRM  
**AI Model:** GPT-4 Turbo (most advanced, cost is fine!)  
**Scope:** Phase 1 (Deal/Contact) + Phase 2 (Global) + Settings  

---

## 📋 **COMPLETE TODO LIST (15 TASKS):**

### **🎨 Phase 1: Core Infrastructure (Tasks 1-4)**
1. ✅ Create AI Assistant chat UI component (collapsible sidebar)
2. ✅ Build context engine (gather all data for AI)
3. ✅ Create AI API route with GPT-4 Turbo
4. ✅ Implement conversation memory system

### **📍 Phase 2: Deal & Contact Integration (Tasks 5-7)**
5. ✅ Add AI assistant to deal detail view
6. ✅ Add AI assistant to contact profile view
7. ✅ Build auto-draft email response system

### **⚙️ Phase 3: Settings & Customization (Tasks 8-9)**
8. ✅ Create AI settings tab (customize behavior)
9. ✅ Build default smart behaviors

### **🌐 Phase 4: Global Assistant (Tasks 10-12)**
10. ✅ Add global AI assistant (pipeline, tasks pages)
11. ✅ Implement quick action buttons
12. ✅ Build proactive suggestion system

### **🚀 Phase 5: Advanced Features (Tasks 13-15)**
13. ✅ Create AI prompt templates
14. ✅ Add streaming responses (real-time typing)
15. ✅ Build AI analytics dashboard

---

## 🧠 **WHAT THE AI WILL KNOW:**

### **Context Data Sent to AI:**

```javascript
{
  // Current Page Context
  currentPage: 'deal' | 'contact' | 'pipeline' | 'tasks',
  currentView: 'details' | 'list' | 'board',
  
  // Deal Context (if on deal page)
  deal: {
    id, title, value, stage, tags,
    created_at, updated_at,
    intelligence: {
      likelihoodScore: 85,
      healthStatus: 'excellent',
      sentiment: 'positive',
      nextBestAction: '...'
    }
  },
  
  // Contact Context
  contact: {
    full_name, email, phone, address,
    medical_history, dental_history,
    lifetime_value, total_deals
  },
  
  // ALL Activities (up to 50 recent)
  activities: [
    {
      type: 'call',
      subject: 'Follow-up call',
      snippet: 'Patient confirmed £15k budget',
      occurred_at: '2025-10-10T14:30:00Z',
      direction: 'outbound',
      ai_artifacts: [
        {
          kind: 'transcription',
          content: 'Full call transcript...'
        },
        {
          kind: 'conversation_analysis',
          content: {
            executive_summary: '...',
            call_purpose: '...',
            sentiment: 'positive',
            pain_points: ['recovery time', 'cost'],
            immediate_actions: ['send payment plan']
          }
        }
      ]
    },
    // ... all other activities
  ],
  
  // Related Tasks
  tasks: [
    { title: 'Send treatment plan', due: '...' }
  ],
  
  // User Preferences (from settings)
  userPreferences: {
    responseStyle: 'professional' | 'friendly' | 'concise',
    autoActions: ['draft_emails', 'suggest_tasks'],
    focusAreas: ['closing_deals', 'patient_satisfaction'],
    customRules: [
      "Always mention payment plans for deals >£5k",
      "Be extra empathetic about dental anxiety"
    ]
  },
  
  // Current User Context
  user: {
    full_name: 'Dr. Sarah',
    role: 'Practice Owner',
    timezone: 'Europe/London'
  }
}
```

---

## 💬 **SMART CAPABILITIES:**

### **1. Deal Intelligence Questions:**
```
"What's the status?" → Full deal summary with likelihood, health, next steps
"Should I prioritize this?" → Yes/No with reasoning
"What are their concerns?" → Extracted from all conversations
"What did we last discuss?" → Summary of last interaction
"When should I follow up?" → Smart timing based on patterns
"How likely to close?" → Detailed breakdown of 85% score
```

### **2. Email Auto-Drafting:**
```
Incoming Email Detected:
→ AI reads email content
→ Analyzes patient tone, questions, concerns
→ Checks conversation history
→ Checks deal stage and value
→ Generates contextual professional response
→ Saves as draft with [Review & Send] button

User reviews, maybe tweaks, clicks Send!
```

### **3. Conversation Analysis:**
```
"Summarize all 20 conversations"
→ AI reads all calls, emails, WhatsApp
→ Extracts key themes
→ Identifies pain points
→ Shows sentiment progression
→ Highlights important details
→ Suggests next steps
```

### **4. Task Management:**
```
"What should I do today?"
→ AI analyzes all your deals
→ Identifies urgent follow-ups
→ Prioritizes by likelihood & value
→ Suggests specific actions
→ Can auto-create tasks!
```

### **5. Pattern Recognition:**
```
AI notices:
"This patient mentioned 'payment plan' in 4 conversations.
 High interest but budget concern. Suggest sending detailed
 financing options with 0% interest for 12 months."

"This deal has been in 'Consultation Booked' for 10 days.
 Last 2 follow-ups had no response. Suggest trying WhatsApp
 or reducing to a lower-value treatment option."
```

---

## ⚙️ **AI SETTINGS (What You Can Customize):**

### **Response Style:**
```
□ Professional & Formal
□ Friendly & Conversational
□ Concise & Direct
□ Detailed & Thorough
```

### **Auto-Actions:**
```
☑ Auto-draft email responses
☑ Suggest next actions
☑ Create follow-up tasks automatically
☑ Identify stuck deals
☑ Alert for cold leads (>14 days)
☑ Highlight high-value opportunities
```

### **Focus Areas:**
```
☑ Maximizing deal value
☑ Improving close rates
☑ Patient satisfaction
☑ Fast response times
☑ Payment plan optimization
```

### **Custom Rules (Your Own!):**
```
Add Rule:
"For orthodontic deals >£3k, always mention 0% financing"

Add Rule:
"If patient mentions anxiety, offer sedation options"

Add Rule:
"For implant consultations, send video explainer within 24hrs"

Add Rule:
"If no response after 2 follow-ups, try WhatsApp"
```

### **Email Templates:**
```
Customize AI's email drafting:
- Opening style
- Sign-off preferences
- Include/exclude certain info
- Tone adjustments
```

### **Proactive Notifications:**
```
Notify me when:
☑ Deal hasn't been contacted in 7 days
☑ High-likelihood deal (>80%) needs action
☑ Patient sent email (draft ready to review)
☑ Deal value increased significantly
☑ Sentiment turned negative
```

---

## 🎯 **DEFAULT SMART BEHAVIORS:**

### **Without You Asking, AI Will:**

**1. On Deal View:**
- ✅ Analyze all conversations immediately
- ✅ Show deal summary in chat
- ✅ Suggest next best action
- ✅ Highlight concerns from conversations
- ✅ Estimate close probability

**2. When Email Arrives:**
- ✅ Read email content
- ✅ Analyze tone and urgency
- ✅ Draft professional response
- ✅ Show draft with [Review & Send]
- ✅ Notify you: "Draft ready for Mrs. Smith's email"

**3. When Deal Goes Cold:**
- ✅ Notices >10 days no contact
- ✅ Suggests: "This deal is getting cold. Want me to draft a check-in email?"
- ✅ Provides draft automatically

**4. When Sentiment Changes:**
- ✅ Detects negative sentiment in latest call
- ✅ Alerts: "Patient seemed concerned in last call. Main issue: Cost. Suggest payment plan?"
- ✅ Provides talking points

**5. Daily Briefing:**
- ✅ Morning summary: "You have 5 hot leads today"
- ✅ Priority list with AI reasoning
- ✅ Suggested schedule for maximum conversions

---

## 🎨 **UI DESIGN:**

### **Right Sidebar (Deal/Contact Pages):**
```
┌─────────────────────────────────────┐
│ 🤖 Deal Assistant          [−] [×]  │
├─────────────────────────────────────┤
│                                     │
│ 💡 Smart Summary                    │
│ This is a £15k implant deal with    │
│ John Smith. 85% likely to close.    │
│ Patient is positive. Last contact:  │
│ 3 days ago.                         │
│                                     │
│ 🎯 Suggested Actions                │
│ • Send treatment plan [Draft]       │
│ • Schedule consultation [Schedule]  │
│ • Follow up on recovery concerns    │
│                                     │
├─────────────────────────────────────┤
│ 💬 Chat History                     │
│                                     │
│ You: What are their concerns?       │
│                                     │
│ AI: Main concerns:                  │
│ 1. Recovery time (2 weeks)          │
│ 2. Cost (£15k) - addressed          │
│ 3. Pain level - reassured           │
│                                     │
│ [View Full Analysis]                │
│                                     │
│ You: Draft a follow-up email        │
│                                     │
│ AI: Here's a draft:                 │
│ ┌─────────────────────────────────┐ │
│ │ Subject: Your Implant Plan      │ │
│ │                                 │ │
│ │ Hi John,                        │ │
│ │                                 │ │
│ │ Following our call, here's...   │ │
│ │ [Full draft]                    │ │
│ │                                 │ │
│ │ [Copy] [Edit] [Send]            │ │
│ └─────────────────────────────────┘ │
│                                     │
├─────────────────────────────────────┤
│ ✏️ Ask me anything...    [Send →]  │
└─────────────────────────────────────┘
```

### **Global Assistant (All Pages):**
```
[🤖] Button in bottom-right corner
Click → Chat panel slides up
Ask anything about your practice, deals, tasks
```

---

## 📋 **COMPLETE 15-TASK BREAKDOWN:**

### **PHASE 1: CORE (Tasks 1-4)**

**Task 1:** Chat UI Component
- Collapsible right sidebar
- Message bubbles (user vs AI)
- Typing indicator
- Quick action buttons
- Beautiful gradient design
- Expandable/collapsible

**Task 2:** Context Engine
- Fetch all deal data
- Fetch all activities (last 50)
- Fetch all AI artifacts
- Fetch related tasks
- Fetch contact full history
- Bundle into smart context object

**Task 3:** GPT-4 Turbo API Route
- `/api/ai-assistant/chat` endpoint
- Sends rich context to GPT-4 Turbo
- System prompts for dental CRM
- Handles streaming responses
- Error handling

**Task 4:** Conversation Memory
- Store chat history per deal/contact
- Persist in database table: `ai_chat_sessions`
- Load previous conversation on open
- Clear when switching deals/contacts

---

### **PHASE 2: INTEGRATION (Tasks 5-7)**

**Task 5:** Deal View Integration
- Add sidebar to deal detail modal
- Load deal context automatically
- Show smart summary on open
- Suggest next actions automatically

**Task 6:** Contact View Integration
- Add sidebar to contact profile page
- Load contact + all deals context
- Show relationship summary
- Lifetime value insights

**Task 7:** Auto-Draft Email System
- Webhook/detection for incoming emails
- AI reads email content
- Generates contextual response
- Saves to `activity_drafts` table
- Shows [Review & Send] button
- One-click to send from draft

---

### **PHASE 3: SETTINGS (Tasks 8-9)**

**Task 8:** AI Settings Tab
Create in Settings page:
- Response style preferences
- Auto-action toggles
- Custom rules editor
- Email template preferences
- Notification preferences
- Prompt customization

**Task 9:** Default Smart Behaviors
- Deal summary on open
- Auto-analyze on new activity
- Daily briefing generation
- Priority deal highlighting
- Cold lead detection
- Sentiment change alerts

---

### **PHASE 4: GLOBAL (Tasks 10-12)**

**Task 10:** Global AI Assistant
- Floating button (bottom-right)
- Works on ALL pages
- Context-aware (knows which page)
- Can access any deal/contact
- Helps with "what should I do today?"

**Task 11:** Quick Action Buttons
In AI responses:
- [Draft Email] → Generates email
- [Summarize Conversations] → Full summary
- [Create Task] → Auto-creates task
- [Schedule Follow-up] → Calendar integration
- [View Deal] → Jump to deal
- [Call Patient] → Click-to-call (future)

**Task 12:** Proactive Suggestions
AI monitors in background:
- Detects stuck deals
- Identifies cold leads
- Spots negative sentiment
- Finds high-value opportunities
- Shows notifications in assistant

---

### **PHASE 5: ADVANCED (Tasks 13-15)**

**Task 13:** Custom Prompt Templates
User can define:
- "When drafting emails, always..."
- "When analyzing deals, focus on..."
- "When suggesting tasks, prioritize..."
- Save templates, apply to AI

**Task 14:** Streaming Responses
- Real-time AI typing effect
- See response build character-by-character
- Better UX (not waiting for full response)
- Uses OpenAI streaming API

**Task 15:** AI Analytics Dashboard
Track AI performance:
- Questions asked
- Drafts generated
- Drafts sent vs edited
- Most helpful features
- AI accuracy metrics
- Cost tracking

---

## 🎯 **SMART FEATURES:**

### **What Makes It REALLY Smart:**

**1. Deep Context Awareness:**
```
Not just: "Patient called about implants"
But: "Patient called about implants. This is their 4th inquiry.
      Previously interested in whitening (£450, completed).
      Total lifetime value: £15,450. Budget confirmed at £15k.
      Main concern: Recovery time (reassured in call #3).
      High urgency - wants to start in 2 months.
      Sentiment: Very positive. Likelihood: 92%."
```

**2. Pattern Recognition:**
```
AI notices:
"I've analyzed 237 similar deals in your practice.
 Deals with >5 interactions and positive sentiment 
 close 89% of the time. This deal has 12 interactions
 and very positive sentiment. Extremely likely to close.
 
 Recommended: Send treatment plan within 24 hours.
 Similar patients converted fastest when shown
 before/after photos and offered 0% financing."
```

**3. Contextual Email Drafting:**
```
Incoming Email:
"I'm worried about the pain during the procedure."

AI considers:
- Patient has dental anxiety (from notes)
- Previous reassurance about sedation (call #2)
- Deal value is high (£15k)
- They're close to booking

Draft Generated:
"Hi [Name],
Thank you for your email. I completely understand your 
concern about discomfort - many of our patients feel 
the same way initially.

As we discussed, we offer several sedation options:
- Conscious sedation (you're relaxed but awake)
- IV sedation (you won't remember the procedure)
- General anesthesia (fully asleep)

Dr. Sarah specializes in anxiety-free dentistry. In fact,
95% of our implant patients report feeling NO pain during
the procedure.

Would you like to schedule a quick call to discuss which
sedation option would work best for you?

[Calendar link]

Warm regards,
[Your name]"

→ Empathetic, addresses concern, offers solution, CTA!
```

**4. Multi-Deal Intelligence:**
```
You: "Which deals should I focus on today?"

AI analyzes ALL your deals:
"Focus on these 5 in order:

1. John Smith - Implants (£15k) - 92% likely
   → Send treatment plan TODAY (he's very ready!)
   
2. Sarah Jones - Orthodontics (£4.5k) - 88% likely
   → She asked about financing - send payment options
   
3. Mike Brown - Veneers (£6k) - 78% likely
   → Cold for 8 days - URGENT follow-up needed
   
4. Emma Wilson - Whitening (£450) - 65% likely
   → Waiting on your quote - send today
   
5. David Lee - Crowns (£2k) - 45% likely
   → Hesitant - address cost concerns

Reasoning: I prioritized by:
- Likelihood × Value (revenue potential)
- Time-sensitive actions
- Current momentum

Expected revenue if you close all 5: £28k"
```

---

## ⚙️ **AI SETTINGS PANEL:**

```
Settings → 🤖 AI Assistant

┌─────────────────────────────────────────┐
│ AI Assistant Configuration              │
├─────────────────────────────────────────┤
│                                         │
│ 🎨 Response Style                      │
│ ○ Professional & Formal                 │
│ ● Friendly & Conversational             │
│ ○ Concise & Direct                      │
│ ○ Custom (define below)                 │
│                                         │
│ 🤖 AI Model                            │
│ ● GPT-4 Turbo (Smartest, ~£0.01/query) │
│ ○ GPT-4 (Smart, ~£0.03/query)          │
│ ○ GPT-3.5 Turbo (Fast, ~£0.001/query)  │
│                                         │
│ ⚡ Auto-Actions                        │
│ ☑ Auto-draft email responses            │
│ ☑ Suggest next actions automatically    │
│ ☑ Create follow-up tasks                │
│ ☑ Detect and alert cold leads           │
│ ☑ Analyze sentiment changes             │
│ ☑ Generate daily briefing               │
│                                         │
│ 🎯 Focus Areas                         │
│ ☑ Maximizing deal value                 │
│ ☑ Improving close rates                 │
│ ☑ Patient satisfaction                  │
│ ☑ Fast response times                   │
│ ☑ Payment plan optimization             │
│                                         │
│ 📝 Custom Rules                        │
│ ┌─────────────────────────────────────┐ │
│ │ For deals >£5k, always mention      │ │
│ │ payment plans and 0% financing      │ │
│ │ [Edit]                              │ │
│ ├─────────────────────────────────────┤ │
│ │ If patient mentions anxiety,        │ │
│ │ emphasize sedation options          │ │
│ │ [Edit]                              │ │
│ ├─────────────────────────────────────┤ │
│ │ [+ Add New Rule]                    │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ 📧 Email Drafting Preferences          │
│ Opening: ● Warm  ○ Professional  ○ Brief│
│ Closing: ● Warm regards  ○ Best  ○ Thanks│
│ Include: ☑ Calendar link  ☑ Phone       │
│                                         │
│ 🔔 Notifications                       │
│ Alert me when:                          │
│ ☑ Deal cold for > 7 days                │
│ ☑ Email draft ready for review          │
│ ☑ High-value opportunity detected       │
│ ☑ Sentiment turns negative              │
│                                         │
│ 💾 [Save Configuration]                │
└─────────────────────────────────────────┘
```

---

## 🚀 **IMPLEMENTATION ORDER:**

I'll build in this order, showing you progress:

**Hour 1:** Tasks 1-2 (Chat UI + Context Engine)  
**Hour 2:** Tasks 3-4 (GPT-4 API + Memory)  
**Hour 3:** Tasks 5-6 (Deal & Contact Integration)  
**Hour 4:** Tasks 7-9 (Email Drafts + Settings)  
**Hour 5:** Tasks 10-12 (Global Assistant + Quick Actions)  
**Hour 6:** Tasks 13-15 (Advanced: Templates, Streaming, Analytics)  

**Total:** ~6 hours for complete, enterprise-grade AI assistant!

---

## 💰 **COSTS (Using GPT-4 Turbo):**

**Per Query:**
- Input: ~2,000 tokens (all context) = £0.01
- Output: ~500 tokens (response) = £0.03
- **Total: ~£0.04 per question**

**Monthly (Realistic Usage):**
```
Light (50 questions/day): £60/month
Medium (150 questions/day): £180/month
Heavy (300 questions/day): £360/month

For 5-10 person team: ~£100-200/month
```

**WORTH IT** because:
- Saves 2-3 hours/day per person
- Better close rates
- Never miss follow-ups
- Professional emails
- Smart prioritization

**ROI:** If AI helps close ONE extra £10k deal/month → Pays for itself 50x over!

---

## ✨ **READY TO BUILD?**

**I'll start with Task 1-2 (Chat UI + Context Engine) right now!**

Confirm these decisions:
1. ✅ GPT-4 Turbo (smartest, cost is fine)
2. ✅ Auto-draft emails (save as drafts, user reviews before send)
3. ✅ Collapsible right sidebar (can minimize if needed)
4. ✅ Separate chat per deal/contact (contextual)
5. ✅ Global assistant button for pipeline/tasks pages
6. ✅ Full settings panel for customization

**Should I proceed?** 🚀
