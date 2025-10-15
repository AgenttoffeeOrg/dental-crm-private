# 📋 FORM BUILDER — COMPLETE TASK LIST
**Total Tasks:** 280  
**Current Progress:** 0/280 (0%)  
**Status:** Ready to Begin

---

## 📊 PHASE BREAKDOWN

| Phase | Tasks | Estimated Time | Status |
|-------|-------|----------------|--------|
| **Phase 0: Foundation** | 45 tasks | 2 weeks | ⬜ Not Started |
| **Phase 1: Core Builder** | 72 tasks | 3 weeks | ⬜ Not Started |
| **Phase 2: Publishing & Analytics** | 63 tasks | 3 weeks | ⬜ Not Started |
| **Phase 3: Ad Integrations** | 48 tasks | 3 weeks | ⬜ Not Started |
| **Phase 4: Advanced Features** | 38 tasks | 3 weeks | ⬜ Not Started |
| **Phase 5: Polish & Scale** | 14 tasks | 2 weeks | ⬜ Not Started |

---

## ⬜ PHASE 0: FOUNDATION (45 tasks) — Week 1-2

### Database Integration (12 tasks)

**Forms CRUD**
- [ ] 1. Create `useMarketingForms` hook to load forms from `marketing_forms` table
- [ ] 2. Implement `createForm` mutation (INSERT into `marketing_forms`)
- [ ] 3. Implement `updateForm` mutation (UPDATE `marketing_forms`)
- [ ] 4. Implement `deleteForm` mutation (soft delete, set status='archived')
- [ ] 5. Implement `duplicateForm` mutation (clone existing form)
- [ ] 6. Add RLS policy: "Tenants can view their own forms"
- [ ] 7. Add RLS policy: "Tenants can create forms"
- [ ] 8. Add RLS policy: "Tenants can update their own forms"
- [ ] 9. Add RLS policy: "Tenants can delete their own forms"
- [ ] 10. Test: Create form via UI → verify saved to database
- [ ] 11. Test: Edit form via UI → verify changes persisted
- [ ] 12. Test: Delete form → verify status changed to 'archived'

**Form Submissions**
- [ ] 13. Update `/api/marketing/forms/submit` route to save to `marketing_form_submissions`
- [ ] 14. Add spam detection fields (is_spam, spam_score, honeypot_triggered)
- [ ] 15. Add metadata capture (IP, user agent, referrer, location)
- [ ] 16. Add UTM parameter capture (source, medium, campaign, term, content)
- [ ] 17. Add gclid/fbclid capture for attribution
- [ ] 18. Link submission to created Contact (contact_id foreign key)
- [ ] 19. Flag duplicate submissions (same email/phone within 24h)
- [ ] 20. Add RLS policy: "Tenants can view their own submissions"
- [ ] 21. Test: Submit form → verify submission saved to database
- [ ] 22. Test: Submit form → verify Contact created and linked
- [ ] 23. Test: Submit duplicate → verify duplicate_submission flag set
- [ ] 24. Test: Check submission meta (IP, user agent, UTM params captured)

### Spam Protection (8 tasks)

**Honeypot**
- [ ] 25. Add hidden honeypot field to form renderer
- [ ] 26. Add CSS to hide honeypot field (`position: absolute; left: -9999px`)
- [ ] 27. Check honeypot on submit — if filled, mark as spam
- [ ] 28. Log honeypot-triggered submissions separately
- [ ] 29. Test: Fill honeypot field → verify submission blocked

**Submission Time Check**
- [ ] 30. Capture form load timestamp in hidden field
- [ ] 31. Check submission time — if < 2 seconds, mark as spam
- [ ] 32. Test: Submit form in 1 second → verify marked as spam

**Rate Limiting**
- [ ] 33. Implement IP-based rate limiter (max 10 submissions/hour)
- [ ] 34. Return 429 Too Many Requests if limit exceeded
- [ ] 35. Add rate limit counter to Redis or in-memory store
- [ ] 36. Test: Submit 11 forms from same IP → verify 11th blocked
- [ ] 37. Test: Rate limit resets after 1 hour

### Form Embedding (8 tasks)

**Generate Embed Codes**
- [ ] 38. Create `generateEmbedCode` utility function
- [ ] 39. Generate iframe embed code with form ID
- [ ] 40. Generate script embed code (loads iframe dynamically)
- [ ] 41. Generate standalone HTML page
- [ ] 42. Add "Embed" button to form detail page
- [ ] 43. Show modal with embed code options
- [ ] 44. Add "Copy to Clipboard" button for each embed type
- [ ] 45. Test: Copy iframe code → paste in external website → form loads and submits correctly

---

## ⬜ PHASE 1: CORE BUILDER (72 tasks) — Week 3-5

### Drag-and-Drop Builder (15 tasks)

**Setup @dnd-kit**
- [ ] 46. Install `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`
- [ ] 47. Create `DndContext` wrapper for form builder
- [ ] 48. Create `SortableFieldList` component
- [ ] 49. Create `DraggableField` component with drag handle icon
- [ ] 50. Implement `onDragEnd` handler to reorder fields array
- [ ] 51. Update field `order` property on reorder
- [ ] 52. Add visual feedback during drag (opacity change, outline)
- [ ] 53. Add drop zone highlight
- [ ] 54. Test: Drag field A above field B → verify order changed
- [ ] 55. Test: Drag field from palette → verify added to form

**Field Palette**
- [ ] 56. Create `FieldPalette` component with all field types
- [ ] 57. Add drag handle to each palette item
- [ ] 58. Implement "Add Field" on click (alternative to drag)
- [ ] 59. Add search/filter to palette
- [ ] 60. Test: Drag "Email" field from palette → verify added to canvas

### Conditional Logic Engine (12 tasks)

**Rules Builder UI**
- [ ] 61. Create `ConditionalLogicBuilder` component
- [ ] 62. Add "Add Rule" button to field settings
- [ ] 63. Create rule form: IF [field] [operator] [value] THEN [action] [target field]
- [ ] 64. Support operators: equals, not equals, contains, greater than, less than, is empty, is not empty
- [ ] 65. Support actions: show, hide, require, optional
- [ ] 66. Add AND/OR logic for multiple conditions
- [ ] 67. Save rules in field's `conditionalLogic` property
- [ ] 68. Test: Create rule "If pain > 7, show emergency field"

**Rule Execution**
- [ ] 69. Create `evaluateConditionalLogic` utility function
- [ ] 70. Run rules on every field value change
- [ ] 71. Show/hide fields based on rules
- [ ] 72. Update required status based on rules
- [ ] 73. Test: Change pain_level to 8 → emergency field appears
- [ ] 74. Test: Change pain_level to 3 → emergency field hidden

### Multi-Step Forms (10 tasks)

**Stepper UI**
- [ ] 75. Create `MultiStepFormRenderer` component
- [ ] 76. Add "Page Break" field type to palette
- [ ] 77. Split fields into steps based on page breaks
- [ ] 78. Create progress indicator (Step 1 of 3)
- [ ] 79. Add "Back" and "Next" buttons
- [ ] 80. Validate current step before allowing "Next"
- [ ] 81. Save progress to localStorage (resume later)
- [ ] 82. Show summary on final step
- [ ] 83. Test: Create 3-step form → navigate back/forward → submit
- [ ] 84. Test: Reload page mid-form → verify progress restored

### Enhanced Field Types (12 tasks)

**File Upload**
- [ ] 85. Create `FileUploadField` component
- [ ] 86. Add file input with drag-and-drop
- [ ] 87. Validate file size (max 10MB)
- [ ] 88. Validate file type (images, PDFs only)
- [ ] 89. Upload to Supabase Storage
- [ ] 90. Save file URL in submission
- [ ] 91. Test: Upload PDF → verify saved to storage

**Signature Pad**
- [ ] 92. Install `signature_pad` library
- [ ] 93. Create `SignatureField` component with canvas
- [ ] 94. Add "Clear" button
- [ ] 95. Convert signature to base64 PNG
- [ ] 96. Save signature as image in storage
- [ ] 97. Test: Draw signature → submit → verify image saved

**Star Rating**
- [ ] 98. Create `StarRatingField` component (1-5 stars)
- [ ] 99. Make stars clickable and hoverable
- [ ] 100. Show selected rating visually
- [ ] 101. Test: Click 4 stars → submit → verify value=4

**NPS Widget**
- [ ] 102. Create `NPSField` component (0-10 scale)
- [ ] 103. Add labels: 0-6 = Detractor, 7-8 = Passive, 9-10 = Promoter
- [ ] 104. Highlight selected number
- [ ] 105. Calculate NPS score across all submissions
- [ ] 106. Test: Select 9 → verify classified as Promoter

**Date/Time Picker**
- [ ] 107. Install `react-datepicker` or use Radix UI Calendar
- [ ] 108. Create `DateField` component
- [ ] 109. Create `TimeField` component
- [ ] 110. Add date validation (min date, max date)
- [ ] 111. Test: Select date → submit → verify ISO format saved

### Validation Engine (8 tasks)

**Email Validation**
- [ ] 112. Add client-side email regex validation
- [ ] 113. Add MX record check (client-side warning, not blocking)
- [ ] 114. Add disposable email detection (mailinator, etc.)
- [ ] 115. Show validation error below field
- [ ] 116. Test: Enter invalid email → verify error shown

**Phone Validation**
- [ ] 117. Install `libphonenumber-js`
- [ ] 118. Validate phone in E.164 format
- [ ] 119. Add country code dropdown (optional)
- [ ] 120. Test: Enter "07700900000" → verify formatted to "+447700900000"

**Custom Validation**
- [ ] 121. Add regex pattern field to field settings
- [ ] 122. Add min/max length validation
- [ ] 123. Add custom error message field
- [ ] 124. Test: Set regex `^[A-Z]{3}$` → enter "ABC" → pass, enter "123" → fail

### GDPR Compliance (6 tasks)

- [ ] 125. Add "Consent Checkbox" field type
- [ ] 126. Make consent required for form submission
- [ ] 127. Add privacy policy link to form
- [ ] 128. Add data retention settings (default 2 years)
- [ ] 129. Add double opt-in option (send confirmation email)
- [ ] 130. Test: Submit without consent → verify blocked

### Thank You Page Customization (9 tasks)

- [ ] 131. Add "Success Message" editor to form settings
- [ ] 132. Support dynamic variables ({{full_name}}, {{email}})
- [ ] 133. Add "Redirect URL" option
- [ ] 134. Add "Send Confirmation Email" toggle
- [ ] 135. Create confirmation email template
- [ ] 136. Replace variables in success message on submit
- [ ] 137. Redirect to custom URL if specified
- [ ] 138. Send confirmation email if enabled
- [ ] 139. Test: Submit form → see "Thank you, John!" → check email

---

## ⬜ PHASE 2: PUBLISHING & ANALYTICS (63 tasks) — Week 6-8

### Form Hosting & Publishing (12 tasks)

**Hosted Pages**
- [ ] 140. Create `/forms/[tenant]/[slug]` public route
- [ ] 141. Fetch form by slug (no auth required)
- [ ] 142. Render form on clean page (no sidebar)
- [ ] 143. Add SEO meta tags (title, description)
- [ ] 144. Generate unique slug on form creation
- [ ] 145. Check slug uniqueness within tenant
- [ ] 146. Test: Access `forms.dentalcrm.com/dr-smith/contact` → form loads

**Embed Code Generation**
- [ ] 147. Create `EmbedCodeModal` component
- [ ] 148. Show iframe, script, and static HTML options
- [ ] 149. Add "Copy to Clipboard" for each
- [ ] 150. Generate QR code using `qrcode.react`
- [ ] 151. Add "Download QR Code" button
- [ ] 152. Test: Copy iframe code → paste in CodePen → form loads

**UTM Builder**
- [ ] 153. Add UTM parameter builder to share modal
- [ ] 154. Generate link with UTM params
- [ ] 155. Show preview of full URL
- [ ] 156. Test: Build URL with utm_source=facebook → copy → verify params in URL

### Google reCAPTCHA v3 (8 tasks)

- [ ] 157. Sign up for reCAPTCHA v3 keys
- [ ] 158. Add `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` to env
- [ ] 159. Install `react-google-recaptcha-v3`
- [ ] 160. Add reCAPTCHA script to form page
- [ ] 161. Execute reCAPTCHA on form submit
- [ ] 162. Send token to backend
- [ ] 163. Verify token with Google API on backend
- [ ] 164. Block if score < 0.5
- [ ] 165. Test: Submit form → check reCAPTCHA verified in logs

### Form Analytics Dashboard (15 tasks)

**Analytics UI**
- [ ] 166. Create `/forms/[id]/analytics` page
- [ ] 167. Fetch analytics from `marketing_form_submissions`
- [ ] 168. Calculate views, starts, completions, conversion rate
- [ ] 169. Show 4 stat cards (Views, Starts, Completions, Conversion Rate)
- [ ] 170. Add date range picker (last 7/30/90 days)
- [ ] 171. Test: View analytics → see stats

**Funnel Visualization**
- [ ] 172. Calculate drop-off at each step
- [ ] 173. Create horizontal funnel chart
- [ ] 174. Show % at each stage
- [ ] 175. Highlight biggest drop-off point
- [ ] 176. Test: View funnel → see drop-off percentages

**Traffic Sources**
- [ ] 177. Query submissions grouped by utm_source
- [ ] 178. Show pie chart of traffic sources
- [ ] 179. Show table: Source | Leads | Conversion %
- [ ] 180. Test: View traffic sources → see Google Ads 45%

**Device Breakdown**
- [ ] 181. Parse user_agent to detect device type
- [ ] 182. Show pie chart: Desktop, Mobile, Tablet
- [ ] 183. Test: View device breakdown → see Mobile 52%

**Field Drop-Off Analysis**
- [ ] 184. Track field interactions (focused, filled, abandoned)
- [ ] 185. Calculate % of users who reached each field
- [ ] 186. Show horizontal bar chart
- [ ] 187. Highlight fields with highest drop-off
- [ ] 188. Test: View field drop-off → see "Phone Number: 82%"

### GA4 Event Tracking (5 tasks)

- [ ] 189. Install Google Analytics 4
- [ ] 190. Fire `form_view` event on page load
- [ ] 191. Fire `form_start` event on first interaction
- [ ] 192. Fire `form_submit` event on successful submit
- [ ] 193. Fire `form_error` event on validation fail
- [ ] 194. Test: Submit form → verify events in GA4 DebugView

### Email Notifications (6 tasks)

- [ ] 195. Create email template for form submission
- [ ] 196. Add "Send Notification Email" toggle to form settings
- [ ] 197. Add "Notification Email" input (default to practice owner)
- [ ] 198. Send email using Resend API
- [ ] 199. Include submission data in email
- [ ] 200. Test: Submit form → verify email received

### Template Library (10 tasks)

**Create Templates**
- [ ] 201. Create "New Patient Inquiry" template
- [ ] 202. Create "Consultation Request" template
- [ ] 203. Create "Emergency Appointment" template
- [ ] 204. Create "Feedback/NPS Survey" template
- [ ] 205. Create "Referral Form" template
- [ ] 206. Create "Event Registration" template
- [ ] 207. Create "Treatment Interest" template
- [ ] 208. Create "Payment Plan Inquiry" template
- [ ] 209. Create "Insurance Verification" template
- [ ] 210. Create "Contact Us" template

**Template UI**
- [ ] 211. Create `/forms/templates` page
- [ ] 212. Show template cards with preview
- [ ] 213. Add "Use Template" button
- [ ] 214. Clone template and open in builder
- [ ] 215. Test: Click "Use Template" → form pre-filled with template fields

### Form Versioning (7 tasks)

- [ ] 216. Add `version` field to `marketing_forms` table
- [ ] 217. Create `form_versions` table for history
- [ ] 218. Save snapshot on every form update
- [ ] 219. Create version history UI
- [ ] 220. Add "Rollback" button to previous version
- [ ] 221. Show diff viewer (changed fields highlighted)
- [ ] 222. Test: Edit form → save → view history → rollback → verify restored

### CSV/Excel Export (3 tasks)

- [ ] 223. Add "Export CSV" button to analytics page
- [ ] 224. Generate CSV with all submissions
- [ ] 225. Add date range filter
- [ ] 226. Test: Export submissions → open in Excel → verify data correct

---

## ⬜ PHASE 3: AD PLATFORM INTEGRATIONS (48 tasks) — Week 9-11

### Meta Lead Ads Integration (12 tasks)

**Setup**
- [ ] 227. Create Meta App in Meta Developer Portal
- [ ] 228. Request Lead Ads API access
- [ ] 229. Add Meta App ID and Secret to env
- [ ] 230. Create OAuth flow for practice to connect Meta account
- [ ] 231. Store access token in `api_credentials` table
- [ ] 232. Test: Connect Meta account → verify token saved

**Webhook Receiver**
- [ ] 233. Create `/api/webhooks/meta-lead-ads` endpoint
- [ ] 234. Verify webhook signature
- [ ] 235. Parse lead data from payload
- [ ] 236. Map Meta fields to Contact fields
- [ ] 237. Create/update Contact
- [ ] 238. Optionally create Deal
- [ ] 239. Test: Submit Meta Lead Ad → verify Contact created in CRM

**Field Mapping UI**
- [ ] 240. Create "Meta Lead Ads Settings" page
- [ ] 241. Fetch available Meta lead forms
- [ ] 242. Show field mapping UI (Meta field → Contact field)
- [ ] 243. Save mapping config to database
- [ ] 244. Test: Map "full_name" → "full_name", "email" → "primary_email"

### TikTok Lead Generation Integration (12 tasks)

**Setup**
- [ ] 245. Create TikTok Business account
- [ ] 246. Set up TikTok Lead Generation API access
- [ ] 247. Add TikTok API credentials to env
- [ ] 248. Create OAuth flow for TikTok
- [ ] 249. Store access token
- [ ] 250. Test: Connect TikTok account

**Webhook Receiver**
- [ ] 251. Create `/api/webhooks/tiktok-lead-gen` endpoint
- [ ] 252. Verify webhook signature
- [ ] 253. Parse lead data
- [ ] 254. Map TikTok fields to Contact fields
- [ ] 255. Create Contact
- [ ] 256. Test: Submit TikTok lead → Contact created

**Field Mapping**
- [ ] 257. Create "TikTok Settings" page
- [ ] 258. Show field mapping UI
- [ ] 259. Save mapping config
- [ ] 260. Test: Map fields correctly

### Google Ads Lead Form Extensions (12 tasks)

**Setup**
- [ ] 261. Set up Google Ads API access
- [ ] 262. Create OAuth flow for Google Ads
- [ ] 263. Store refresh token
- [ ] 264. Test: Connect Google Ads account

**Polling Job**
- [ ] 265. Create cron job to poll Google Ads API every 15 minutes
- [ ] 266. Fetch new leads from Lead Form Extensions
- [ ] 267. Map Google fields to Contact fields
- [ ] 268. Create Contact
- [ ] 269. Mark lead as processed to avoid duplicates
- [ ] 270. Test: Submit Google lead form → Contact appears within 15 minutes

**Field Mapping**
- [ ] 271. Create "Google Ads Settings" page
- [ ] 272. Show field mapping UI
- [ ] 273. Save mapping config
- [ ] 274. Test: Map fields

### Lead Deduplication (6 tasks)

- [ ] 275. Check for existing Contact by email before creating
- [ ] 276. Check for existing Contact by phone before creating
- [ ] 277. Update existing Contact if found
- [ ] 278. Flag duplicate submissions (same email/phone within 24h)
- [ ] 279. Add "Duplicate Lead" badge in submissions list
- [ ] 280. Test: Submit same email twice → second flagged as duplicate

---

## ⬜ PHASE 4: ADVANCED FEATURES (38 tasks) — Week 12-14

### A/B Testing (8 tasks)

- [ ] 281. Add "Create Variant" button to form detail page
- [ ] 282. Clone form as variant
- [ ] 283. Split traffic 50/50 based on session ID
- [ ] 284. Track conversion rate per variant
- [ ] 285. Calculate statistical significance (Chi-squared test)
- [ ] 286. Auto-declare winner after 100+ submissions per variant
- [ ] 287. Show A/B test results dashboard
- [ ] 288. Test: Create variant → traffic split → see conversion rates

### Offline/Kiosk Mode (7 tasks)

- [ ] 289. Create service worker for offline capability
- [ ] 290. Cache form definition in IndexedDB
- [ ] 291. Queue submissions in IndexedDB when offline
- [ ] 292. Detect online/offline status
- [ ] 293. Sync queued submissions when online
- [ ] 294. Show "Offline Mode" indicator
- [ ] 295. Test: Turn off WiFi → submit form → turn on WiFi → verify synced

### Payment Fields (Optional) (6 tasks)

- [ ] 296. Sign up for Stripe
- [ ] 297. Install `@stripe/stripe-js` and `@stripe/react-stripe-js`
- [ ] 298. Create `PaymentField` component with Stripe Elements
- [ ] 299. Tokenize card on submit (never store card details)
- [ ] 300. Pass token to backend for processing
- [ ] 301. Test: Enter card → submit → verify token passed to backend

### Calculation Fields (5 tasks)

- [ ] 302. Add `calculation` field type
- [ ] 303. Create formula editor (e.g., `base_price + (addon_1 * qty)`)
- [ ] 304. Evaluate formula on field change
- [ ] 305. Show calculated result to user
- [ ] 306. Test: Create treatment estimate calculator → verify calculation correct

### Conversational Forms (6 tasks)

- [ ] 307. Create `ConversationalFormRenderer` component
- [ ] 308. Show one question at a time
- [ ] 309. Animate transitions between questions
- [ ] 310. Add "Press Enter to continue" hint
- [ ] 311. Optimize for mobile (large text, easy tap targets)
- [ ] 312. Test: Create conversational form → navigate with Enter key

### White-Labeling (6 tasks)

- [ ] 313. Add custom domain support (CNAME)
- [ ] 314. Verify domain ownership
- [ ] 315. Serve forms on custom domain
- [ ] 316. Add option to remove "Powered by DentalCRM" footer
- [ ] 317. Add custom logo upload to form settings
- [ ] 318. Test: Access form via custom domain → no branding

---

## ⬜ PHASE 5: POLISH & SCALE (14 tasks) — Week 15-16

### Accessibility Audit (4 tasks)

- [ ] 319. Run Lighthouse accessibility audit
- [ ] 320. Fix all accessibility issues (WCAG 2.1 AA)
- [ ] 321. Test with screen reader (NVDA/JAWS)
- [ ] 322. Test keyboard navigation (Tab, Enter, Escape)

### Performance Optimization (4 tasks)

- [ ] 323. Lazy load non-critical components
- [ ] 324. Optimize images (WebP, lazy loading)
- [ ] 325. Bundle splitting (separate form renderer from builder)
- [ ] 326. Run Lighthouse Performance audit → target 90+ score

### Security Hardening (3 tasks)

- [ ] 327. Run OWASP ZAP security scan
- [ ] 328. Fix all critical/high vulnerabilities
- [ ] 329. Add Content Security Policy (CSP) headers

### Load Testing (3 tasks)

- [ ] 330. Write load test script (Artillery or k6)
- [ ] 331. Simulate 10,000 submissions/day
- [ ] 332. Optimize slow queries, add caching if needed

---

## 📈 PROGRESS TRACKING

### Completion by Phase

| Phase | Status | Progress | ETA |
|-------|--------|----------|-----|
| Phase 0 | ⬜ Not Started | 0/45 (0%) | Week 1-2 |
| Phase 1 | ⬜ Not Started | 0/72 (0%) | Week 3-5 |
| Phase 2 | ⬜ Not Started | 0/63 (0%) | Week 6-8 |
| Phase 3 | ⬜ Not Started | 0/48 (0%) | Week 9-11 |
| Phase 4 | ⬜ Not Started | 0/38 (0%) | Week 12-14 |
| Phase 5 | ⬜ Not Started | 0/14 (0%) | Week 15-16 |

### Overall Progress

```
[░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░] 0/280 (0%)
```

---

## 🎯 QUICK START

### To Begin Phase 0:

1. ✅ Read `FORM_BUILDER_ENTERPRISE_AUDIT.md`
2. ✅ Create feature branch: `git checkout -b feature/form-builder-phase-0`
3. ✅ Start with Task #1: Create `useMarketingForms` hook
4. ✅ Check off each task as you complete it
5. ✅ Run non-regression tests after each task
6. ✅ Commit frequently with clear messages

### Daily Workflow:

1. Pick next unchecked task
2. Read acceptance criteria
3. Implement solution
4. Test manually
5. Write automated test (if applicable)
6. Run non-regression suite
7. Commit and push
8. Update this checklist (✅)
9. Repeat

---

## 📝 NOTES

- **Non-Regression Rule:** After completing any task, run the non-regression checklist. If ANY test fails, fix it before proceeding.
- **Feature Flags:** All Phase 3+ features should be behind feature flags for safe rollout.
- **Documentation:** Update user docs for each major feature.
- **Code Review:** Have another developer review code before merging.

---

**Generated:** October 15, 2025, 8:45 PM  
**Status:** Ready for Development  
**Next Action:** Begin Phase 0, Task #1

