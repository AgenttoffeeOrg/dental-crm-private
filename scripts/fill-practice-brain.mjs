#!/usr/bin/env node
/**
 * Fills Practice Brain with realistic UK private dental practice content.
 * Logs in via Playwright, PATCHes /api/settings/practice-brain, then reloads UI to verify.
 */

import { readFileSync } from 'node:fs'
import { chromium } from 'playwright'

const credsPath = new URL('../.claude/test-credentials.json', import.meta.url)
const creds = JSON.parse(readFileSync(credsPath, 'utf8'))
const { url: baseUrl, email, password } = creds.test_account

const PRACTICE_BRAIN = {
  practice_description: `Harbour Dental Studio is an award-winning private dental practice on Deansgate in Manchester city centre. Since 2008 we have helped patients across Greater Manchester with general dentistry, cosmetic smile makeovers, dental implants, and clear aligner orthodontics. Our team of eight clinicians includes cosmetic specialists and implant dentists, and we use digital scanning and same-day temporary restorations where appropriate. We are fully private — we do not offer NHS treatments — and we welcome nervous patients with longer appointments and sedation options.`,

  brand_voice: `Warm, professional, and reassuring — like a friendly clinician explaining things clearly. Use plain English, short sentences, and British spelling. Sign off as "The Harbour Dental Team" or "Harbour Dental Studio". Never use "dear sir/madam", never guarantee clinical outcomes, and avoid jargon without a brief explanation. Be empathetic with anxious patients. You may mention 0% finance options but must not pressure anyone.`,

  services_offered: [
    { name: 'New patient exam & health check', description: 'Comprehensive first visit with oral health assessment and treatment plan.' },
    { name: 'Hygiene visit (scale & polish)', description: 'Professional cleaning with tailored home-care advice.' },
    { name: 'Invisalign clear aligners', description: 'Discreet orthodontic treatment for adults and teens.' },
    { name: 'Teeth whitening (home kit)', description: 'Custom trays and professional-grade gel for safe whitening at home.' },
    { name: 'Composite bonding', description: 'Single-tooth cosmetic repair for chips, gaps, or worn edges.' },
    { name: 'Porcelain veneers', description: 'Hand-crafted veneers for a natural, long-lasting smile transformation.' },
    { name: 'White fillings', description: 'Mercury-free composite fillings matched to your tooth shade.' },
    { name: 'Root canal treatment (molar)', description: 'Pain relief and tooth preservation under local anaesthetic.' },
    { name: 'Single dental implant', description: 'Permanent replacement for one missing tooth including crown.' },
    { name: 'Porcelain crown', description: 'Strengthen and restore a damaged or heavily filled tooth.' },
    { name: 'Emergency appointment', description: 'Same-day relief for toothache, swelling, or trauma when available.' },
    { name: 'IV sedation dentistry', description: 'Calm, drowsy appointments for anxious patients on selected treatments.' },
    { name: "Children's dental check-up", description: 'Gentle check-ups for under-12s with fluoride advice where appropriate.' },
    { name: 'Smile makeover consultation', description: 'Free 30-minute consult to discuss cosmetic goals and options.' },
  ],

  pricing: [
    { service: 'New patient exam & health check', price: 'from £89', notes: 'Includes small X-rays if clinically required' },
    { service: 'Hygiene visit (scale & polish)', price: 'from £95', notes: '30-minute appointment' },
    { service: 'Invisalign clear aligners', price: 'from £3,500', notes: 'Full case; free consultation included' },
    { service: 'Teeth whitening (home kit)', price: 'from £350', notes: 'Custom trays and professional gel' },
    { service: 'Composite bonding', price: 'from £275 per tooth', notes: 'Single tooth; quote after exam' },
    { service: 'Porcelain veneers', price: 'from £850 per tooth', notes: 'Typically 4–10 teeth for a smile line' },
    { service: 'White fillings', price: 'from £120', notes: 'Price depends on size and location' },
    { service: 'Root canal treatment (molar)', price: 'from £650', notes: 'Excludes crown if needed' },
    { service: 'Single dental implant', price: 'from £2,400', notes: 'Implant fixture only; crown quoted separately' },
    { service: 'Porcelain crown', price: 'from £795', notes: 'Includes preparation and fitting' },
    { service: 'Emergency appointment', price: 'from £95', notes: 'Same-day subject to availability' },
    { service: 'IV sedation dentistry', price: 'from £350 per session', notes: 'In addition to treatment fees' },
    { service: "Children's dental check-up", price: 'from £45', notes: 'Under 12s' },
    { service: 'Smile makeover consultation', price: 'Free', notes: '30 minutes with a treatment coordinator' },
  ],

  opening_hours: {
    monday: { open: '08:30', close: '18:00', closed: false },
    tuesday: { open: '08:30', close: '18:00', closed: false },
    wednesday: { open: '08:30', close: '18:00', closed: false },
    thursday: { open: '08:30', close: '20:00', closed: false },
    friday: { open: '08:30', close: '17:00', closed: false },
    saturday: { open: '09:00', close: '13:00', closed: false },
    sunday: { open: '09:00', close: '17:00', closed: true },
  },

  faqs: [
    {
      question: 'Do you take NHS patients?',
      answer: 'We are a fully private practice and do not offer NHS treatments. We do offer 0% finance over 10 or 12 months on treatments over £1,000 (subject to status).',
    },
    {
      question: 'Where are you located?',
      answer: 'Harbour Dental Studio, 14 Deansgate, Manchester M3 3WD — two minutes from Deansgate-Castlefield tram stop. We are on the ground floor with step-free access.',
    },
    {
      question: 'Do you offer finance?',
      answer: 'Yes — 0% finance over 10 or 12 months is available on plans over £1,000 through our partner (subject to credit check). We can send a link during your consultation.',
    },
    {
      question: 'How do I book an appointment?',
      answer: 'Book online at harbourdental.co.uk/book, call us on 0161 555 0142, or reply to this message with your preferred days and we will offer times.',
    },
    {
      question: 'Do you see nervous or anxious patients?',
      answer: 'Absolutely. We offer longer appointments, a calm environment, and IV sedation for suitable treatments. Tell us when you book so we can allow extra time.',
    },
    {
      question: 'How long does Invisalign take?',
      answer: 'Most adult cases take 9–18 months depending on complexity. You will wear each aligner set for about two weeks and visit us every 6–8 weeks for checks.',
    },
    {
      question: 'Do you offer free consultations?',
      answer: 'Yes — smile makeover and Invisalign consultations are free (30 minutes). New patient exams are charged but include a full health check and X-rays if needed.',
    },
    {
      question: 'What if I have a dental emergency?',
      answer: 'Call 0161 555 0142 before 11am for a same-day emergency slot when available. Out of hours, listen to our voicemail for the on-call dentist number.',
    },
    {
      question: 'Do you treat children?',
      answer: 'Yes — we welcome children from age 3 for check-ups. Under-12 check-ups start from £45. We do not offer NHS paediatric contracts.',
    },
    {
      question: 'What is your cancellation policy?',
      answer: 'Please give at least 24 hours notice to reschedule or cancel without charge. Late cancellations or missed appointments may incur a £50 fee.',
    },
    {
      question: 'Is there parking nearby?',
      answer: 'There is no on-site parking. The nearest car parks are Q-Park Deansgate North (2 min walk) and NCP Great Northern (5 min walk). Metrolink is the easiest option.',
    },
    {
      question: 'How much is a hygiene appointment?',
      answer: 'Hygiene visits start from £95 for a 30-minute scale and polish. Your hygienist will confirm the exact fee at your visit based on your gum health.',
    },
  ],

  escalation_rules: `Stop the AI and hand off to a human immediately if:
• The patient mentions severe pain, swelling, bleeding that won't stop, trauma, or a possible dental emergency — notify the duty dentist and offer the emergency line (0161 555 0142).
• They request a refund, complaint, legal action, or speak angrily or abusively — escalate to the practice manager (Sarah, sarah@harbourdental.co.uk).
• They ask for clinical diagnosis, prescription medication, or medical advice beyond general practice information.
• They mention children at risk, safeguarding, or domestic concerns — escalate to the practice manager urgently.
• They want to cancel finance or dispute a payment plan — escalate to reception, do not promise outcomes.
• The message is in a language you cannot respond to confidently — ask reception to call back.`,

  additional_instructions: `Always mention that Invisalign and smile makeover consultations are free when relevant. Never promise same-day appointments except for emergencies before 11am. Share https://harbourdental.co.uk/book for online booking. Opening hours: Mon–Wed 8:30–18:00, Thu 8:30–20:00, Fri 8:30–17:00, Sat 9:00–13:00, closed Sundays. Phone: 0161 555 0142. Do not quote exact clinical durations or guarantee results. If asked about a service not listed, invite them to a free consultation rather than inventing prices.`,
}

const log = (msg) => console.log(`[fill-practice-brain] ${msg}`)

const browser = await chromium.launch({ headless: true })
const ctx = await browser.newContext()
const page = await ctx.newPage()

try {
  log(`Signing in at ${baseUrl}/sign-in`)
  await page.goto(`${baseUrl}/sign-in`, { waitUntil: 'domcontentloaded' })
  await page.locator('#email').fill(email)
  await page.locator('#password').fill(password)
  await Promise.all([
    page.waitForURL((u) => !u.toString().includes('/sign-in'), { timeout: 30_000 }),
    page.locator('button[type="submit"]:has-text("Sign in")').click(),
  ])
  log(`Signed in — now at ${page.url()}`)

  log('PATCHing Practice Brain via API')
  const patchResult = await page.evaluate(async (payload) => {
    const res = await fetch('/api/settings/practice-brain', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    })
    const body = await res.json().catch(() => ({}))
    return { status: res.status, ok: res.ok, body }
  }, PRACTICE_BRAIN)

  if (!patchResult.ok) {
    throw new Error(`PATCH failed: ${patchResult.status} ${JSON.stringify(patchResult.body)}`)
  }
  log(`PATCH succeeded (${patchResult.status})`)

  const settingsUrl = `${baseUrl}/settings?section=ai&tab=practice-brain`
  log(`Verifying UI at ${settingsUrl}`)
  await page.goto(settingsUrl, { waitUntil: 'domcontentloaded' })
  await page.getByRole('tab', { name: 'Practice Brain' }).click()
  await page.locator('[data-testid="practice-brain-tab"]').waitFor({ timeout: 30_000 })

  const aboutText = await page
    .locator('textarea')
    .first()
    .inputValue()
  if (!aboutText.includes('Harbour Dental Studio')) {
    throw new Error('UI verification failed: practice description not loaded')
  }

  const serviceCount = await page.locator('input[placeholder*="Invisalign"]').count()
  if (serviceCount < 12) {
    throw new Error(`UI verification failed: expected ≥12 services, saw ${serviceCount}`)
  }

  log('SUCCESS — Practice Brain filled and verified')
  console.log(
    JSON.stringify({
      ok: true,
      services: PRACTICE_BRAIN.services_offered.length,
      pricing: PRACTICE_BRAIN.pricing.length,
      faqs: PRACTICE_BRAIN.faqs.length,
    })
  )
} catch (err) {
  console.error('[fill-practice-brain] FAILED:', err?.message || err)
  await page
    .screenshot({ path: 'scripts/fill-practice-brain-failure.png', fullPage: true })
    .catch(() => {})
  process.exitCode = 1
} finally {
  await browser.close().catch(() => {})
}
