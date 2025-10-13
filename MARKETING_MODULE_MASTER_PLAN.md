# 🚀 MARKETING MODULE - MASTER PLAN

**Project:** Mailchimp-style Marketing Module for DentalCRM  
**Start Date:** October 13, 2025  
**Estimated Tasks:** 85+ tasks  
**Complexity:** Enterprise-Grade, Full-Featured

---

## 📊 EXISTING CONTACT SCHEMA (MAPPED)

### ✅ Available Fields for Merge Tags:
- **Basic:** `full_name`, `preferred_name`, `title`, `primary_email`, `primary_phone`
- **Personal:** `date_of_birth`, `gender`, `occupation`, `employer`
- **Address:** `address`, `city`, `postal_code`, `country`
- **Preferences:** `communication_preference`, `language_preference`, `preferred_appointment_time`
- **Consent:** `marketing_consent`, `sms_consent`, `email_consent` ✅
- **Custom:** `custom_fields` (JSONB) - fully flexible
- **Tags:** `tags` (text array) - already exists! ✅

### ✅ No New Contacts Table Needed!
We'll map audiences/segments directly to existing contacts.

---

## 🗂️ DATABASE SCHEMA (NEW TABLES)

### **PHASE 1: Core Marketing Tables**
1. `marketing_audiences` - Logical groupings
2. `marketing_segments` - Saved filters/queries
3. `marketing_tags` - Tag definitions (maps to contacts.tags)
4. `contact_segment_membership` - Many-to-many mapping
5. `marketing_templates` - Email/SMS templates
6. `marketing_campaigns` - Campaigns
7. `marketing_campaign_variants` - A/B test variants
8. `marketing_sends` - Send log per contact
9. `marketing_events` - Opens, clicks, bounces, unsubscribes

### **PHASE 2: Automation & Forms**
10. `marketing_journeys` - Automation workflows
11. `marketing_journey_nodes` - Individual workflow nodes
12. `marketing_journey_runs` - Contact progress in journeys
13. `marketing_forms` - Form definitions
14. `marketing_form_submissions` - Form submission log
15. `marketing_landing_pages` - Landing page templates

### **PHASE 3: Collaboration & AI**
16. `marketing_comments` - Comments on campaigns/journeys
17. `marketing_ai_suggestions` - AI-generated content
18. `marketing_templates_library` - Shared template library

---

## 🎯 TASK BREAKDOWN (85 TASKS)

### **MODULE 1: DATABASE & FOUNDATION (12 tasks)**
1. Create database migration file for all marketing tables
2. Add marketing module permissions to RBAC system
3. Create TypeScript interfaces for all marketing entities
4. Build contact-to-audience mapping utilities
5. Create merge tag resolver service
6. Build segment query engine (filter builder logic)
7. Create MailProvider interface (SendGrid/Mailgun abstraction)
8. Create SmsProvider interface (Twilio abstraction)
9. Add feature flags for module capabilities
10. Create marketing module service layer architecture
11. Set up marketing routes structure (/marketing/*)
12. Create marketing module navigation integration

### **MODULE 2: AUDIENCES & SEGMENTS (10 tasks)**
13. Build audience list page UI
14. Create "New Audience" dialog
15. Build visual segment builder (filter UI)
16. Implement segment query engine (backend)
17. Create segment preview (contact count + sample)
18. Build tag management interface
19. Implement CSV import for contacts (maps to existing table)
20. Create audience detail view with member list
21. Build segment export (CSV download)
22. Add audience analytics (growth charts)

### **MODULE 3: EMAIL TEMPLATES (12 tasks)**
23. Build template list page
24. Create drag-and-drop email builder UI
25. Implement template blocks: Header, Text, Image, Button, Divider, Footer
26. Build HTML preview renderer
27. Create merge tag picker UI
28. Implement dynamic content (conditional blocks)
29. Build template save/load system
30. Create template library (pre-made templates)
31. Add AI subject line suggester
32. Add AI content rewriter
33. Implement template versioning
34. Build mobile preview toggle

### **MODULE 4: EMAIL CAMPAIGNS (15 tasks)**
35. Build campaigns list page (status tabs: Draft/Scheduled/Sent)
36. Create campaign creation wizard (Step 1: Basics)
37. Campaign wizard Step 2: Audience selection
38. Campaign wizard Step 3: Template selection/creation
39. Campaign wizard Step 4: Settings (from, subject, preheader)
40. Campaign wizard Step 5: Review & Schedule
41. Build A/B test campaign variant UI
42. Implement campaign send engine (backend)
43. Create send throttling logic
44. Build campaign status tracker (real-time progress)
45. Implement open tracking (pixel + endpoint)
46. Implement click tracking (link rewriting + endpoint)
47. Build unsubscribe handling (link + preference center)
48. Create campaign detail/report view
49. Build campaign duplicate/clone feature

### **MODULE 5: SMS CAMPAIGNS (8 tasks - Behind Feature Flag)**
50. Build SMS template creator (character counter)
51. Create SMS campaign wizard
52. Implement SMS send logic (Twilio abstraction)
53. Build SMS delivery tracking
54. Create SMS opt-out handling
55. Build SMS analytics view
56. Add compliance messaging (TCPA notice)
57. Implement SMS scheduling

### **MODULE 6: AUTOMATION JOURNEYS (15 tasks)**
58. Build journey list page
59. Create journey canvas UI (React Flow or similar)
60. Build node palette (Trigger, Action, Wait, Branch)
61. Implement Trigger nodes: Contact Created, Tag Added, Segment Entry, Inactivity, Link Clicked, Birthday/Anniversary
62. Implement Action nodes: Send Email, Send SMS, Add Tag, Remove Tag, Wait/Delay
63. Implement Branch nodes: If/Else on fields, Opened, Clicked, Segment Check
64. Build journey node editor (properties panel)
65. Create journey activation system
66. Build journey execution engine (cron/scheduled processor)
67. Implement journey state machine (per contact)
68. Build journey analytics (funnel view)
69. Create journey test mode (sample contacts)
70. Build journey versioning
71. Add journey pause/resume controls
72. Create journey contact log (who's in what journey)

### **MODULE 7: FORMS & LANDING PAGES (10 tasks)**
73. Build forms list page
74. Create form builder UI (field mapper)
75. Map form fields to Contact schema
76. Generate form embed code
77. Build public form submission handler
78. Create landing page builder (theme selector)
79. Generate hosted landing page URLs
80. Implement form submission → Contact creation/update
81. Build form analytics (submissions, conversions)
82. Create form spam protection (honeypot)

### **MODULE 8: REPORTS & ANALYTICS (8 tasks)**
83. Build campaign reports dashboard
84. Create A/B test comparison view
85. Build audience insights dashboard
86. Create engagement heatmaps (click maps)
87. Build journey analytics (funnel visualization)
88. Implement CSV export for all reports
89. Create scheduled report emails
90. Build marketing ROI calculator

### **MODULE 9: UI INTEGRATION (5 tasks)**
91. Add "Marketing" to main navigation
92. Create marketing dashboard (home page)
93. Build contact timeline integration (show campaign events)
94. Add campaign/journey quick actions to contact detail
95. Create marketing module onboarding wizard

### **MODULE 10: AI FEATURES (8 tasks)**
96. Build AI subject line generator
97. Create AI content rewriter
98. Implement send time optimizer (basic heuristic)
99. Build content tone analyzer
100. Create AI email personalization suggester
101. Build readability scorer
102. Implement spam score checker
103. Create AI campaign performance predictor

### **MODULE 11: TEAM COLLABORATION (5 tasks)**
104. Add campaign/journey commenting system
105. Build draft approval workflow
106. Create activity log per campaign
107. Implement @mentions in comments
108. Build notification system for approvals

---

## 📦 DELIVERABLES

1. **Database Migrations** - All tables, indexes, constraints
2. **Type Definitions** - Full TypeScript interfaces
3. **Service Layer** - Clean abstraction for all logic
4. **API Routes** - RESTful endpoints for all features
5. **UI Components** - Professional, enterprise-grade
6. **Documentation** - Setup guides, API docs, user manual
7. **Test Suite** - Acceptance tests for all features
8. **Feature Flags** - Easy enable/disable

---

## 🎯 IMPLEMENTATION PHASES

### **PHASE 1: Foundation (1-2 days)**
- Database schema
- Basic routes
- Service interfaces
- Audience/segment basics

### **PHASE 2: Core Features (3-4 days)**
- Template builder
- Email campaigns
- Basic journeys
- Reports

### **PHASE 3: Advanced Features (2-3 days)**
- A/B testing
- Complex journeys
- Forms & landing pages
- AI features

### **PHASE 4: Polish (1-2 days)**
- Team collaboration
- Analytics dashboards
- Integration refinement
- Documentation

---

## ⚠️ RISKS & MITIGATIONS

| Risk | Mitigation |
|------|------------|
| Breaking existing CRM | Build as separate module, minimal coupling |
| Complexity overload | Phased approach, feature flags |
| Performance issues | Proper indexing, background jobs |
| UI inconsistency | Reuse existing components, design system |

---

## 🔧 TECHNICAL DECISIONS

1. **Email Sending:** Abstract behind MailProvider interface
2. **Journey Execution:** Cron-based processor checking every 5 minutes
3. **Template Storage:** JSON blocks in database
4. **Segment Queries:** Build SQL dynamically from filter definitions
5. **Tracking:** Pixel for opens, redirect for clicks
6. **Forms:** Server-side validation, map to Contact fields
7. **AI:** OpenAI API with fallback to simple heuristics

---

## ✅ ACCEPTANCE CRITERIA

- [ ] Create segment with 10+ contacts
- [ ] Build email template with AI assistance
- [ ] Send email campaign to segment
- [ ] Track opens/clicks in report
- [ ] Create A/B test with 2 variants
- [ ] Build journey: Tag added → Email → Wait → Branch → Tag
- [ ] Create form, submit, see Contact created
- [ ] Export campaign report to CSV
- [ ] Comment on campaign draft
- [ ] All features accessible via clean UI

---

## 📋 DEPENDENCIES

**External (Already Have):**
- Supabase (database)
- Next.js (framework)
- shadcn/ui (components)
- OpenAI API (AI features)

**New (Will Need):**
- React Flow (journey canvas) - Install
- React Email Editor (template builder) - Or build custom
- Chart library (reports) - Already have?

---

## 💰 ESTIMATED EFFORT

- **Database & Foundation:** 8 hours
- **Audiences & Segments:** 12 hours
- **Templates & Campaigns:** 20 hours
- **Journeys:** 16 hours
- **Forms & Landing Pages:** 10 hours
- **Reports & Analytics:** 12 hours
- **AI Features:** 8 hours
- **Team Collaboration:** 6 hours
- **Testing & Polish:** 8 hours

**TOTAL:** ~100 hours (2-3 weeks full-time)

---

## 🎨 UI DESIGN PRINCIPLES

- Match existing DentalCRM design system
- Clean, professional, enterprise-grade
- Consistent with Contacts/Pipeline UI
- HubSpot/Mailchimp inspiration
- Mobile-responsive
- Accessible

---

**This is the full scope. Ready to build when you approve!** 🚀


