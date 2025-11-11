import { createServiceClient } from '@/lib/supabase-server'
import { ScriptTrigger } from '@/types/database'
import {
  SCRIPT_TRIGGER_LABELS,
  SCRIPT_TRIGGERS
} from '@/lib/services/script-trigger-metadata'

export interface ScriptVariantTemplate {
  slug: string
  title: string
  trigger: ScriptTrigger
  personaTags: string[]
  tone: string
  estimatedDurationSeconds: number
  successRate: number
  script: string
  marketingHighlight?: string
}

export interface ScriptTemplate {
  slug: string
  name: string
  description: string
  category: string
  marketingHook?: string
  variants: ScriptVariantTemplate[]
}

export const SCRIPT_LIBRARY_TEMPLATES: ScriptTemplate[] = [
  {
    slug: 'price-objection',
    name: 'Price Objection Playbook',
    description: 'Reframe price conversations around lifetime value, financing options, and phased care plans.',
    category: 'Conversion',
    marketingHook: 'Patients invest when value is clearer than price.',
    variants: [
      {
        slug: 'value-comparison',
        title: 'Value Comparison Bridge',
        trigger: 'price_objection',
        personaTags: ['cost_sensitive', 'researcher'],
        tone: 'confident-empathy',
        estimatedDurationSeconds: 110,
        successRate: 74,
        marketingHighlight: 'Positions treatment as a smart, planned investment.',
        script: `“I completely understand wanting to make sure this is the right investment. Most patients compare it to the cost of putting off care—because waiting often leads to emergency treatment that is two to three times higher. The plan we recommended includes every visit, digital scans, and follow-up checks so there are no surprise add-ons. If we break it down, it works out to about £{{monthly}} per month, which is roughly the cost of skipping one latte a day. Would it be helpful if I mapped the monthly option next to the long-term savings?”`
      },
      {
        slug: 'phased-treatment',
        title: 'Phase the Plan',
        trigger: 'price_objection',
        personaTags: ['planner', 'budget_guard'],
        tone: 'calm-explanatory',
        estimatedDurationSeconds: 95,
        successRate: 69,
        script: `“Thanks for letting me know budgeting is top of mind. The good news is we can phase treatment so you only commit to Stage One today. That tackles the urgent items and keeps everything stable. Once you see how comfortable Stage One feels, Stage Two becomes much easier to plan for. Shall we look at what Stage One alone would be, and the finance options other patients have chosen?”`
      },
      {
        slug: 'compare-financing',
        title: 'Financing Confidence Script',
        trigger: 'price_objection',
        personaTags: ['cost_sensitive', 'analytical'],
        tone: 'solution-focused',
        estimatedDurationSeconds: 85,
        successRate: 72,
        script: `“Most of our patients who had the same question chose our 0% finance plan. It spreads treatment over 18 months with no added interest, and you can even pick the debit day that lines up with payday. I can generate two side-by-side comparisons—standard pay-in-full and flexible monthly. Once we look at the difference, you can decide what feels better. Would you like me to pull that up?”`
      },
      {
        slug: 'future-savings',
        title: 'Future Cost Avoidance',
        trigger: 'price_objection',
        personaTags: ['future_oriented', 'logic_seeker'],
        tone: 'informative',
        estimatedDurationSeconds: 100,
        successRate: 67,
        script: `“You’re absolutely right to consider cost. One thing Dr. {{doctor}} asked us to explain is the cost of delaying. When similar patients waited six months, they often needed root canals or crowns, which added £1,200–£1,800 on top of the original plan. By completing this now, we lock the fee and prevent those extra procedures. How about we secure today’s pricing and schedule the first visit, and you still have two weeks to adjust if needed?”`
      },
      {
        slug: 'membership-bundle',
        title: 'Membership Bundle Upgrade',
        trigger: 'price_objection',
        personaTags: ['family_focused', 'saver'],
        tone: 'enthusiastic-supportive',
        estimatedDurationSeconds: 80,
        successRate: 71,
        script: `“If price is the only thing in the way, can I share something our membership patients love? The Smile Membership bundles hygiene, emergency visits, and 10% off restorative work. When we apply that member rate to your treatment, it brings today’s plan down by £{{discount}}. Would joining the membership make this feel more manageable?”`
      },
      {
        slug: 'insurance-maximizer',
        title: 'Insurance Maximizer',
        trigger: 'price_objection',
        personaTags: ['insurance_user'],
        tone: 'reassuring',
        estimatedDurationSeconds: 75,
        successRate: 66,
        script: `“Let’s make sure we use every bit of your insurance allowance. I can split treatment so we finish part now and the rest after the new benefit year renews, which means your out-of-pocket drops by about £{{savings}}. Many families take that approach—it lets them get the care without a big one-time expense. Want me to map that timeline for you?”`
      }
    ]
  },
  {
    slug: 'dental-anxiety',
    name: 'Dental Anxiety Playbook',
    description: 'Normalize fears, highlight comfort technology, and build trust before clinical discussions.',
    category: 'Experience',
    marketingHook: 'Comfort-first language that calms the nervous patient.',
    variants: [
      {
        slug: 'acknowledge-and-anchor',
        title: 'Acknowledge & Anchor',
        trigger: 'dental_anxiety',
        personaTags: ['anxious', 'low_trust'],
        tone: 'warm-empathetic',
        estimatedDurationSeconds: 105,
        successRate: 82,
        script: `“Thank you for sharing that—you’re not alone. About 6 out of 10 new patients tell me a previous experience made them hesitant. What Dr. {{doctor}} does differently is start with a ‘comfort pause’: you raise your hand and we stop immediately. We also use a topical gel so you barely feel the anesthetic. Would you feel better if I scheduled the first visit specifically as a comfort visit where you meet the team, tour the room, and decide at the end if you want to continue?”`
      },
      {
        slug: 'sensorial-expectation',
        title: 'Sensory Expectation Setting',
        trigger: 'dental_anxiety',
        personaTags: ['sensory_sensitive', 'detail_oriented'],
        tone: 'soothing-descriptive',
        estimatedDurationSeconds: 120,
        successRate: 78,
        script: `“Let me walk you through exactly what you’ll see, hear, and feel so there are no surprises. When you arrive we’ll seat you in our quiet room with noise-cancelling headphones and a weighted blanket if you’d like. The dentist will explain each step before touching anything, and you stay in control the entire time. Patients often tell me they finally relaxed once they knew the sequence. Should we reserve a morning slot when the practice is quieter so you can experience that calm start?”`
      },
      {
        slug: 'sedation-option',
        title: 'Comfort Menu with Sedation Option',
        trigger: 'dental_anxiety',
        personaTags: ['high_fear'],
        tone: 'confident-caring',
        estimatedDurationSeconds: 95,
        successRate: 76,
        script: `“We take anxiety seriously, which is why we built a comfort menu. You can choose oral sedation, aromatherapy, or simply longer appointments with extra breaks. Most anxious patients begin with oral sedation for the first visit, then step down as they build trust. I can reserve the first appointment with sedation already arranged so all you need to do is arrive. Does that sound like a plan that would make you feel in control?”`
      },
      {
        slug: 'test-drive',
        title: 'Comfort Test Drive',
        trigger: 'dental_anxiety',
        personaTags: ['skeptical', 'experiential'],
        tone: 'encouraging',
        estimatedDurationSeconds: 85,
        successRate: 73,
        script: `“If committing to the full visit feels like too much, how about we schedule a 20-minute ‘test drive’? You come in, meet the team, sit in the chair, test the headphones, and we stop there. Every anxious patient who did that told me it was the first time they could picture getting treatment. Once you experience how gentle the team is, the full appointment usually feels far easier. Would you like me to reserve that test drive for you?”`
      },
      {
        slug: 'share-success-story',
        title: 'Success Story Reassurance',
        trigger: 'dental_anxiety',
        personaTags: ['story_driven', 'relational'],
        tone: 'storytelling-empathy',
        estimatedDurationSeconds: 100,
        successRate: 79,
        script: `“I’m thinking about Sarah, who hadn’t seen a dentist in nine years because of anxiety. She came in shaking on her first visit, so we built a step-by-step plan with short appointments and our comfort playlist. Two months later she texted me a selfie smiling with her daughter at graduation. She told us, ‘It felt like you held my hand start to finish.’ I’d love to help you feel the same way. Can I book that gentle first visit for you so we can take the first step together?”`
      },
      {
        slug: 'tech-highlight',
        title: 'Technology Highlight',
        trigger: 'dental_anxiety',
        personaTags: ['tech_trusting', 'detail_oriented'],
        tone: 'informative-reassuring',
        estimatedDurationSeconds: 80,
        successRate: 74,
        script: `“One thing that puts anxious patients at ease is knowing we use digital scanners and single-tooth anesthesia. That means no trays full of impression goop and no numb face afterwards. You also watch everything on screen so you know exactly what is happening. Would you like me to email a quick video that walks through what those tools look like before your visit?”`
      }
    ]
  },
  {
    slug: 'timing-conflict',
    name: 'Timing Conflict Playbook',
    description: 'Handle scheduling barriers with concierge convenience and phased milestones.',
    category: 'Scheduling',
    variants: [
      {
        slug: 'micro-appointments',
        title: 'Micro Appointment Offer',
        trigger: 'timing_conflict',
        personaTags: ['busy_parent', 'executive'],
        tone: 'efficient-helpful',
        estimatedDurationSeconds: 70,
        successRate: 65,
        script: `“Your calendar sounds packed, so let’s keep this easy. We can split the visit into two micro-appointments of 25 minutes each—one during lunch and one before the school run. We build them around your calendar, not the other way around. Can I look at Tuesday early morning or Thursday lunch to see which feels lighter for you?”`
      },
      {
        slug: 'after-hours',
        title: 'After-Hours Concierge',
        trigger: 'timing_conflict',
        personaTags: ['night_owl', 'shift_worker'],
        tone: 'accommodating',
        estimatedDurationSeconds: 60,
        successRate: 62,
        script: `“We keep late-evening slots on Wednesdays specifically for patients who juggle shifts or childcare. There’s a concierge feel—quiet clinic, no waiting, and we handle everything start to finish. The next late slot is 7:30pm this Wednesday. Shall I hold that for you?”`
      },
      {
        slug: 'weekend-flex',
        title: 'Weekend Flex Plan',
        trigger: 'timing_conflict',
        personaTags: ['family_focused'],
        tone: 'friendly-practical',
        estimatedDurationSeconds: 65,
        successRate: 60,
        script: `“If weekdays are impossible, we do run a Saturday focus clinic twice a month for families like yours. It books fast, but I can secure the next one for you and text reminders the week before. Would Saturday the 12th work if I reserved the 10am slot now?”`
      },
      {
        slug: 'milestone-scheduling',
        title: 'Milestone Scheduling',
        trigger: 'timing_conflict',
        personaTags: ['planner', 'analytical'],
        tone: 'structured',
        estimatedDurationSeconds: 75,
        successRate: 63,
        script: `“Let’s anchor this to a milestone. If we start with the scan next week, we can complete treatment by the time school resumes. I’ll map each step with calendar invites so there’s no scrambling. Does pulling up the calendar now together work?”`
      },
      {
        slug: 'mobile-check-in',
        title: 'Mobile Check-In Convenience',
        trigger: 'timing_conflict',
        personaTags: ['tech_trusting', 'busy_parent'],
        tone: 'modern-concierge',
        estimatedDurationSeconds: 55,
        successRate: 58,
        script: `“To save you even more time we offer mobile check-in—you submit forms on your phone, arrive, and we take you straight back. Most visits door-to-door are under 45 minutes. If I hold the 8:00am slot you’ll be out by 8:45. Want me to lock that in?”`
      },
      {
        slug: 'care-coordinator',
        title: 'Care Coordinator Follow-Through',
        trigger: 'timing_conflict',
        personaTags: ['overwhelmed', 'caregiver'],
        tone: 'supportive',
        estimatedDurationSeconds: 85,
        successRate: 64,
        script: `“How about I become your scheduling co-pilot? I’ll pencil the visit that fits best, then check in 48 hours prior to adjust if life shifts. That way it’s secured, but you have flexibility. Let me grab the calendar and we’ll pick a day together—sound good?”`
      }
    ]
  },
  {
    slug: 'trust-credibility',
    name: 'Trust & Credibility Playbook',
    description: 'Build authority through social proof, clinical transparency, and third-party validation.',
    category: 'Relationship',
    variants: [
      {
        slug: 'expertise-highlight',
        title: 'Expertise Highlight',
        trigger: 'trust_and_credibility',
        personaTags: ['logic_seeker', 'researcher'],
        tone: 'confident-informational',
        estimatedDurationSeconds: 90,
        successRate: 70,
        script: `“I completely appreciate wanting to feel certain. Dr. {{doctor}} is a lecturer for the British Academy of Cosmetic Dentistry and has completed over 500 Invisalign cases. I can email you a short case study that mirrors your situation, with before-and-after photos and a quick note from the patient about their recovery. Would seeing that help you feel more confident moving forward?”`
      },
      {
        slug: 'transparency-offer',
        title: 'Transparent Process Offer',
        trigger: 'trust_and_credibility',
        personaTags: ['detail_oriented', 'skeptical'],
        tone: 'open-reassuring',
        estimatedDurationSeconds: 85,
        successRate: 68,
        script: `“We operate with full transparency. You’ll see every scan on the monitor, get a printed copy of the plan, and we never start without confirming the fee on paper. How about I send the treatment roadmap ahead of time so you can review it at home? We can then walk through questions together on a quick call before you commit.”`
      },
      {
        slug: 'peer-story',
        title: 'Peer Testimonial Story',
        trigger: 'trust_and_credibility',
        personaTags: ['story_driven', 'community'],
        tone: 'warm-storytelling',
        estimatedDurationSeconds: 95,
        successRate: 72,
        script: `“I’m thinking of Amarjit—he felt exactly the same way. He came to us after shopping around and loved that we pair every procedure with a satisfaction follow-up. After his treatment he left a review saying, ‘I finally felt listened to.’ I can share that review and even arrange a quick chat if you’d like to hear directly from him. Would that help you feel reassured?”`
      },
      {
        slug: 'clinical-tour',
        title: 'Clinical Tour Invitation',
        trigger: 'trust_and_credibility',
        personaTags: ['visual', 'analytical'],
        tone: 'inviting-professional',
        estimatedDurationSeconds: 70,
        successRate: 66,
        script: `“Sometimes the best way to feel secure is to see the environment yourself. We offer a five-minute clinical tour where you meet the nurse, see our sterilisation suite, and review certifications on the wall. Patients often tell us that transparency instantly built trust. Would you like me to book that mini tour before the treatment visit?”`
      },
      {
        slug: 'guarantee-angle',
        title: 'Confidence Guarantee Angle',
        trigger: 'trust_and_credibility',
        personaTags: ['assurance_seeker'],
        tone: 'assured-supportive',
        estimatedDurationSeconds: 65,
        successRate: 64,
        script: `“We back every major treatment with our Smile Confidence Guarantee: if anything doesn’t feel right within the first 12 months, we correct it without additional clinical fees. Knowing there’s a safety net often helps patients feel comfortable saying yes. Shall we go ahead and secure your start date under that guarantee?”`
      },
      {
        slug: 'third-party-proof',
        title: 'Third-Party Proof',
        trigger: 'trust_and_credibility',
        personaTags: ['data_driven'],
        tone: 'factual',
        estimatedDurationSeconds: 60,
        successRate: 61,
        script: `“To give you independent reassurance, we partner with Doctify for verified patient feedback. Over the past 12 months we’ve maintained a 4.9/5 rating with over 300 reviews. I can send you the link so you can read the latest experiences tonight. Would that help you feel ready to book?”`
      }
    ]
  },
  {
    slug: 'finance-insurance',
    name: 'Finance & Insurance Playbook',
    description: 'Coordinate insurance benefits, flexible payments, and clear affordability plans.',
    category: 'Financial',
    variants: [
      {
        slug: 'insurance-coordinator',
        title: 'Insurance Coordinator Introduction',
        trigger: 'finance_and_insurance',
        personaTags: ['insurance_user', 'busy_parent'],
        tone: 'helpful-professional',
        estimatedDurationSeconds: 70,
        successRate: 69,
        script: `“Let me connect you with Emily, our insurance coordinator. She’ll verify your plan today, submit pre-authorisations, and give you a written breakdown so you know every pound covered. Most patients love that we do the paperwork for them. I can have her call you within the next hour—does that work?”`
      },
      {
        slug: 'hybrid-pay',
        title: 'Hybrid Payment Mapping',
        trigger: 'finance_and_insurance',
        personaTags: ['budget_guard', 'planner'],
        tone: 'structured-supportive',
        estimatedDurationSeconds: 80,
        successRate: 63,
        script: `“We can design a hybrid payment plan—use your insurance allowance first, apply the practice membership discount, and finance the remainder over 10 months. I’ll run the exact numbers while we’re together so you see the monthly figure before you decide. Shall I prepare that comparison?”`
      },
      {
        slug: 'family-plan',
        title: 'Family Bundle Advantage',
        trigger: 'finance_and_insurance',
        personaTags: ['family_focused'],
        tone: 'optimistic',
        estimatedDurationSeconds: 60,
        successRate: 62,
        script: `“Since you mentioned your kids also need visits, the family bundle might be perfect. It gives you complimentary emergency visits and 15% off restorative treatment for everyone in the household. Once we apply that, today’s plan reduces by £{{discount}}. Shall I add the bundle so you can capture the saving?”`
      },
      {
        slug: 'tax-advantage',
        title: 'Tax Advantage Reminder',
        trigger: 'finance_and_insurance',
        personaTags: ['analytical', 'planner'],
        tone: 'informational',
        estimatedDurationSeconds: 55,
        successRate: 59,
        script: `“One thing patients overlook is that dental treatment can often be paid from a health cash plan or pretax allowance through their employer. If we schedule this month, you can claim it in the current tax year. I’m happy to prepare the paperwork so it’s ready to submit. Should we go ahead and lock a date while that allowance is still available?”`
      },
      {
        slug: 'deposit-secure',
        title: 'Deposit to Secure Pricing',
        trigger: 'finance_and_insurance',
        personaTags: ['value_seeker'],
        tone: 'urgent-friendly',
        estimatedDurationSeconds: 65,
        successRate: 61,
        script: `“Prices adjust every April with lab fees. If we take a small £{{deposit}} deposit today, we guarantee the current pricing for 90 days while you finalise financing. That way you’re protected from any increases. Would you like me to secure it for you?”`
      },
      {
        slug: 'finance-approval',
        title: 'Instant Finance Approval',
        trigger: 'finance_and_insurance',
        personaTags: ['decisive', 'time_sensitive'],
        tone: 'efficient',
        estimatedDurationSeconds: 55,
        successRate: 60,
        script: `“If we complete the finance form together it takes under two minutes and most patients receive instant approval while we’re on the phone. Then we schedule everything right away. Shall we go through that form now so it’s off your list?”`
      }
    ]
  },
  {
    slug: 'alternative-seeking',
    name: 'Alternative-Seeking Playbook',
    description: 'Position your practice as the trusted guide when patients compare options.',
    category: 'Competitive',
    variants: [
      {
        slug: 'comparison-framework',
        title: 'Comparison Framework',
        trigger: 'alternative_seeking',
        personaTags: ['researcher'],
        tone: 'objective-supportive',
        estimatedDurationSeconds: 90,
        successRate: 68,
        script: `“It’s smart to explore options. I can give you a comparison framework we use: clinician experience, lab quality, aftercare, and total lifetime cost. When patients compare using that lens, they often see that our lifetime guarantee and boutique lab actually reduce revisions later. Want me to email you the comparison checklist so you feel confident in your decision?”`
      },
      {
        slug: 'second-look',
        title: 'Second Look Offer',
        trigger: 'alternative_seeking',
        personaTags: ['analytical', 'skeptical'],
        tone: 'professional',
        estimatedDurationSeconds: 75,
        successRate: 65,
        script: `“How about we schedule a ‘second-look’ consult for you? You bring the other plan, and Dr. {{doctor}} will annotate it with what aligns and what differs. Patients love that it’s collaborative—it helps them make the best choice, even if that’s elsewhere. Shall I hold that second-look slot for you on Thursday?”`
      },
      {
        slug: 'evidence-pack',
        title: 'Evidence Pack Send',
        trigger: 'alternative_seeking',
        personaTags: ['detail_oriented'],
        tone: 'informative',
        estimatedDurationSeconds: 65,
        successRate: 60,
        script: `“I can send you our Evidence Pack—it includes case photos, material certifications, and aftercare results at 12 months. Patients comparing providers told me it was the deciding factor because it showed durability. Would that help you feel more decisive?”`
      },
      {
        slug: 'lifetime-value',
        title: 'Lifetime Value Emphasis',
        trigger: 'alternative_seeking',
        personaTags: ['value_seeker', 'planner'],
        tone: 'consultative',
        estimatedDurationSeconds: 85,
        successRate: 63,
        script: `“While another practice might quote lower upfront, when you factor in our 12-month adjustments, whitening top-up, and follow-up reviews, patients typically save £{{savings}} over three years versus revisiting issues elsewhere. Let’s look at the lifetime value instead of just the entry price. Shall I walk you through that comparison?”`
      },
      {
        slug: 'partnership-language',
        title: 'Partnership Language',
        trigger: 'alternative_seeking',
        personaTags: ['relationship_focused'],
        tone: 'warm-collaborative',
        estimatedDurationSeconds: 70,
        successRate: 62,
        script: `“No matter where you choose to begin, I want you to have a practice that feels like a partner. We pair every patient with a care guide—me—so you have one person to text when questions pop up. That continuity is why over 92% of our patients stay with us for future treatments. Would having that relationship make the decision easier for you?”`
      },
      {
        slug: 'risk-discussion',
        title: 'Risk Discussion',
        trigger: 'alternative_seeking',
        personaTags: ['risk_aware'],
        tone: 'candid',
        estimatedDurationSeconds: 60,
        successRate: 59,
        script: `“Something else to consider is the revision rate. Nationally, veneers done without digital planning are redone within 18 months 27% of the time. We use full-face digital planning to reduce that. Choosing a provider who invests in that tech saves both time and money. Does that clarifying detail help you move forward with us?”`
      }
    ]
  },
  {
    slug: 'pain-urgency',
    name: 'Pain & Urgency Playbook',
    description: 'Address acute discomfort with rapid relief plans and clear next steps.',
    category: 'Emergency',
    variants: [
      {
        slug: 'same-day-relief',
        title: 'Same-Day Relief Plan',
        trigger: 'pain_urgency',
        personaTags: ['in_pain', 'urgent'],
        tone: 'decisive-compassionate',
        estimatedDurationSeconds: 60,
        successRate: 84,
        script: `“I can hear you’re in pain—let’s get you comfortable quickly. I can reserve our emergency slot at 4pm today where Dr. {{doctor}} will numb the area, stabilise the tooth, and plan any definitive treatment afterwards. That means you leave pain-free tonight. Shall I secure that slot now?”`
      },
      {
        slug: 'pain-scale',
        title: 'Pain Scale Empathy',
        trigger: 'pain_urgency',
        personaTags: ['anxious', 'in_pain'],
        tone: 'soothing',
        estimatedDurationSeconds: 70,
        successRate: 78,
        script: `“On a scale of 1 to 10, where would you place the pain right now? If it’s above a 6, our protocol is to bring you in within four hours. We’ll prioritise numbing and a gentle temporary solution so you can rest tonight. Does that plan help you breathe a little easier?”`
      },
      {
        slug: 'aftercare-commitment',
        title: 'Aftercare Commitment',
        trigger: 'pain_urgency',
        personaTags: ['assurance_seeker'],
        tone: 'reassuring',
        estimatedDurationSeconds: 65,
        successRate: 75,
        script: `“We don’t just treat you and send you home—we check on you the next morning to adjust medication if needed. Patients love that they have our WhatsApp number if anything flares up overnight. I’ll text you a quick form after the appointment so we know how you’re feeling. Shall I get you booked into the urgent care slot now?”`
      },
      {
        slug: 'travel-advice',
        title: 'Travel Support Script',
        trigger: 'pain_urgency',
        personaTags: ['traveller'],
        tone: 'calm-informative',
        estimatedDurationSeconds: 75,
        successRate: 66,
        script: `“Since you’re travelling soon, we’ll stabilise the area today and provide a travel kit with medication guidance and emergency numbers for where you’re headed. That way you’re covered wherever you are. Would you like me to organise that visit for this afternoon?”`
      },
      {
        slug: 'post-op-roadmap',
        title: 'Post-Op Roadmap',
        trigger: 'pain_urgency',
        personaTags: ['detail_oriented'],
        tone: 'structured',
        estimatedDurationSeconds: 70,
        successRate: 71,
        script: `“I’ll map out exactly what happens after today: visit one relieves the pain, visit two finalises the fix within five days, and we email you a personalised aftercare plan. Knowing the roadmap helps most patients relax. Should I go ahead and reserve the first visit so we can start that process?”`
      },
      {
        slug: 'family-support',
        title: 'Family Support Angle',
        trigger: 'pain_urgency',
        personaTags: ['caregiver', 'family_focused'],
        tone: 'caring',
        estimatedDurationSeconds: 60,
        successRate: 74,
        script: `“If you’re worried about childcare while you come in, we have a family lounge where little ones can stay with our patient concierge. That way you don’t have to delay care. We’ll make sure you’re comfortable and looked after. Can I secure the next available slot for you?”`
      }
    ]
  },
  {
    slug: 'second-opinion',
    name: 'Second Opinion Playbook',
    description: 'Respect prior consultations while reframing value and clarity.',
    category: 'Consult',
    variants: [
      {
        slug: 'respectful-alignment',
        title: 'Respectful Alignment',
        trigger: 'second_opinion',
        personaTags: ['analytical', 'polite'],
        tone: 'respectful-collaborative',
        estimatedDurationSeconds: 85,
        successRate: 72,
        script: `“I’m glad you’re seeking a second opinion—it shows you care about getting it right. We’ll review the previous plan together, highlight what aligns, and address any gaps. Patients appreciate that we acknowledge good work from other clinicians while making sure nothing was overlooked. Shall I book you with Dr. {{doctor}} for that collaborative review?”`
      },
      {
        slug: 'clarity-session',
        title: 'Clarity Session Invite',
        trigger: 'second_opinion',
        personaTags: ['researcher', 'detail_oriented'],
        tone: 'clarifying',
        estimatedDurationSeconds: 75,
        successRate: 68,
        script: `“During our clarity session we capture fresh digital scans, show them on-screen, and map every option with pros/cons. Patients leave with a printed plan that includes visuals, which often makes the decision easier. Can I reserve that clarity session for you next week?”`
      },
      {
        slug: 'evidence-review',
        title: 'Evidence Review',
        trigger: 'second_opinion',
        personaTags: ['logic_seeker'],
        tone: 'objective',
        estimatedDurationSeconds: 70,
        successRate: 65,
        script: `“We’ll focus on evidence—not opinions. Dr. {{doctor}} will compare x-rays, gum health scores, and bite alignment to show where the plan lines up and where it could be enhanced. You’ll leave with a side-by-side report. Would that level of detail help you decide?”`
      },
      {
        slug: 'priority-roadmap',
        title: 'Priority Roadmap',
        trigger: 'second_opinion',
        personaTags: ['budget_guard', 'planner'],
        tone: 'strategic',
        estimatedDurationSeconds: 80,
        successRate: 63,
        script: `“Even if you keep parts of the original plan, we can help you prioritise what truly needs doing now versus later. Many patients use our roadmap to stage care sensibly. Would you like me to schedule that roadmap session so you have a clear game plan?”`
      },
      {
        slug: 'risk-explanation',
        title: 'Risk Explanation',
        trigger: 'second_opinion',
        personaTags: ['risk_aware'],
        tone: 'candid-supportive',
        estimatedDurationSeconds: 65,
        successRate: 60,
        script: `“We’ll walk through the ‘what if we wait’ scenario so you understand risks in plain language. Knowing the risk window often clarifies the best decision. Shall I hold the consult slot so we can review that together?”`
      },
      {
        slug: 'care-continuity',
        title: 'Care Continuity Promise',
        trigger: 'second_opinion',
        personaTags: ['relationship_focused'],
        tone: 'reassuring',
        estimatedDurationSeconds: 70,
        successRate: 66,
        script: `“Whatever you decide, you’ll have continuity—same dentist, same care concierge, and follow-up calls to ensure you feel supported. Patients say that level of consistency is why they chose us after a second opinion. Can I go ahead and book you for next Tuesday?”`
      }
    ]
  },
  {
    slug: 'universal-check-in',
    name: 'Universal Rapport Scripts',
    description: 'Warmers to start any conversation or follow-up when context is light.',
    category: 'Universal',
    variants: [
      {
        slug: 're-engage',
        title: 'Re-engagement Nudge',
        trigger: 'universal',
        personaTags: ['inactive', 'relationship_focused'],
        tone: 'friendly',
        estimatedDurationSeconds: 55,
        successRate: 58,
        script: `“Hi {{firstName}}, it’s {{agentName}} from {{practice}}. We’ve set aside a couple of smile review slots next week and I’d love to see how you’re feeling about your plan. Can I hold one for you and we’ll decide together if it still feels right?”`
      },
      {
        slug: 'post-consult',
        title: 'Post-Consult Follow-Up',
        trigger: 'universal',
        personaTags: ['recent_consult'],
        tone: 'supportive',
        estimatedDurationSeconds: 50,
        successRate: 57,
        script: `“Hi {{firstName}}, thanks again for meeting Dr. {{doctor}} today. I’m here for any questions that pop up—no pressure. I can also send a quick summary of what we discussed if you’d find that helpful. Would you like me to?”`
      },
      {
        slug: 'treatment-start',
        title: 'Treatment Start Encourager',
        trigger: 'universal',
        personaTags: ['undecided'],
        tone: 'motivational',
        estimatedDurationSeconds: 60,
        successRate: 56,
        script: `“I keep thinking about how excited you were to love your smile in photos again. We have an opening next Thursday that could get you there sooner. Want me to pencil it in so it’s yours, and you can decide over the weekend?”`
      },
      {
        slug: 'review-request',
        title: 'Review Request with Offer',
        trigger: 'universal',
        personaTags: ['loyal'],
        tone: 'grateful',
        estimatedDurationSeconds: 45,
        successRate: 62,
        script: `“We loved having you in this week! If you have a moment, sharing a quick review helps other anxious patients find us. As a thank-you we’ll add a complimentary whitening top-up at your next visit. Can I text you the link?”`
      }
    ]
  }
]

const TEMPLATE_SLUGS = SCRIPT_LIBRARY_TEMPLATES.map((template) => template.slug)

export async function ensureScriptLibrarySeeded(tenantId: string) {
  const supabase = createServiceClient()

  // Upsert scripts (parent records)
  const scriptRows = SCRIPT_LIBRARY_TEMPLATES.map((template) => ({
    tenant_id: tenantId,
    slug: template.slug,
    name: template.name,
    description: template.description,
    category: template.category,
    marketing_hook: template.marketingHook ?? null,
    is_active: true,
    metadata: {
      marketingHook: template.marketingHook,
      seededAt: new Date().toISOString(),
      templateSlug: template.slug
    }
  }))

  const { error: upsertScriptsError } = await supabase
    .from('sales_scripts')
    .upsert(scriptRows, { onConflict: 'tenant_id,slug' })

  if (upsertScriptsError) {
    throw upsertScriptsError
  }

  const { data: scriptsData, error: fetchScriptsError } = await supabase
    .from('sales_scripts')
    .select('id, slug')
    .eq('tenant_id', tenantId)
    .in('slug', TEMPLATE_SLUGS)

  if (fetchScriptsError) {
    throw fetchScriptsError
  }

  const scriptIdBySlug = new Map<string, string>()
  scriptsData?.forEach((row) => {
    scriptIdBySlug.set(row.slug, row.id)
  })

  const versionRows = SCRIPT_LIBRARY_TEMPLATES.flatMap((template) => {
    const scriptId = scriptIdBySlug.get(template.slug)
    if (!scriptId) {
      return []
    }

    return template.variants.map((variant, index) => ({
      tenant_id: tenantId,
      script_id: scriptId,
      slug: `${template.slug}-${variant.slug}`,
      version_number: index + 1,
      title: variant.title,
      content: variant.script,
      trigger_type: variant.trigger,
      persona_tags: variant.personaTags,
      tone_descriptor: variant.tone,
      variant_label: variant.title,
      estimated_duration_seconds: variant.estimatedDurationSeconds,
      usage_count: 0,
      helpful_count: 0,
      success_rate: variant.successRate,
      metadata: {
        marketingHighlight: variant.marketingHighlight,
        templateSlug: template.slug,
        triggerLabel: SCRIPT_TRIGGER_LABELS[variant.trigger]
      }
    }))
  })

  if (versionRows.length === 0) {
    return
  }

  const { error: upsertVersionsError } = await supabase
    .from('sales_script_versions')
    .upsert(versionRows, { onConflict: 'tenant_id,slug' })

  if (upsertVersionsError) {
    throw upsertVersionsError
  }
}

export { SCRIPT_TRIGGER_LABELS, SCRIPT_TRIGGERS } from '@/lib/services/script-trigger-metadata'

