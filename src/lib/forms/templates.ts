/**
 * Form Template Library
 * Pre-built templates for common dental practice use cases
 */

import type { FormField } from '@/hooks/use-marketing-forms'

export interface FormTemplate {
  id: string
  name: string
  description: string
  category: 'lead_gen' | 'patient_intake' | 'feedback' | 'event' | 'referral'
  icon: string
  fields: FormField[]
  recommendedSettings: {
    enableRecaptcha: boolean
    enableHoneypot: boolean
    autoAddTags: string[]
    successMessage: string
  }
}

const createField = (
  id: string,
  type: FormField['type'],
  label: string,
  options?: Partial<FormField>
): FormField => ({
  id,
  type,
  label,
  required: false,
  order: 0,
  ...options,
})

// Template 1: New Patient Inquiry
export const NEW_PATIENT_INQUIRY: FormTemplate = {
  id: 'new-patient-inquiry',
  name: 'New Patient Inquiry',
  description: 'Comprehensive form for potential new patients to request information',
  category: 'lead_gen',
  icon: '👤',
  fields: [
    createField('full_name', 'text', 'Full Name', {
      required: true,
      placeholder: 'Enter your full name',
    }),
    createField('email', 'email', 'Email Address', {
      required: true,
      placeholder: 'your.email@example.com',
    }),
    createField('phone', 'phone', 'Phone Number', {
      required: true,
      placeholder: '+44 7700 900000',
    }),
    createField('treatment_interest', 'select', 'What treatment are you interested in?', {
      required: true,
      options: [
        'General Checkup',
        'Teeth Cleaning',
        'Teeth Whitening',
        'Dental Implants',
        'Root Canal',
        'Orthodontics',
        'Veneers',
        'Emergency Care',
        'Other',
      ],
    }),
    createField('urgency', 'radio', 'How soon would you like to schedule?', {
      required: true,
      options: [
        'As soon as possible (Emergency)',
        'Within 1 week',
        'Within 1 month',
        'Planning ahead (1-3 months)',
        'Just researching options',
      ],
    }),
    createField('additional_info', 'textarea', 'Additional Information', {
      placeholder: 'Tell us more about your needs or concerns...',
    }),
    createField('consent', 'checkbox', 'I agree to the privacy policy and consent to being contacted', {
      required: true,
    }),
  ],
  recommendedSettings: {
    enableRecaptcha: true,
    enableHoneypot: true,
    autoAddTags: ['new-patient', 'website-inquiry'],
    successMessage: 'Thank you, {{full_name}}! We\'ll contact you within 24 hours to schedule your appointment.',
  },
}

// Template 2: Consultation Request
export const CONSULTATION_REQUEST: FormTemplate = {
  id: 'consultation-request',
  name: 'Free Consultation Request',
  description: 'Quick form for requesting a free consultation',
  category: 'lead_gen',
  icon: '💬',
  fields: [
    createField('full_name', 'text', 'Full Name', { required: true }),
    createField('email', 'email', 'Email Address', { required: true }),
    createField('phone', 'phone', 'Phone Number', { required: true }),
    createField('preferred_contact', 'radio', 'Preferred Contact Method', {
      required: true,
      options: ['Phone Call', 'Email', 'WhatsApp', 'Text Message'],
    }),
    createField('available_times', 'checkbox', 'When are you available?', {
      options: ['Mornings (9am-12pm)', 'Afternoons (12pm-5pm)', 'Evenings (5pm-8pm)', 'Weekends'],
    }),
    createField('questions', 'textarea', 'Questions or Concerns', {
      placeholder: 'What would you like to discuss?',
    }),
  ],
  recommendedSettings: {
    enableRecaptcha: true,
    enableHoneypot: true,
    autoAddTags: ['consultation', 'high-intent'],
    successMessage: 'Thank you! Our team will contact you within 4 business hours to schedule your free consultation.',
  },
}

// Template 3: Emergency Appointment
export const EMERGENCY_APPOINTMENT: FormTemplate = {
  id: 'emergency-appointment',
  name: 'Emergency Appointment Request',
  description: 'Urgent care form for patients in pain',
  category: 'patient_intake',
  icon: '🚨',
  fields: [
    createField('full_name', 'text', 'Full Name', { required: true }),
    createField('phone', 'phone', 'Phone Number', { required: true }),
    createField('pain_level', 'scale', 'Pain Level (0 = No Pain, 10 = Severe)', {
      required: true,
      validation: { min: 0, max: 10 },
    }),
    createField('symptoms', 'textarea', 'Describe Your Symptoms', {
      required: true,
      placeholder: 'What are you experiencing?',
    }),
    createField('existing_patient', 'radio', 'Are you an existing patient?', {
      required: true,
      options: ['Yes, I\'ve been here before', 'No, I\'m a new patient'],
    }),
    createField('insurance', 'radio', 'Do you have dental insurance?', {
      options: ['Yes', 'No', 'Not sure'],
    }),
  ],
  recommendedSettings: {
    enableRecaptcha: false, // Don't block emergencies
    enableHoneypot: true,
    autoAddTags: ['emergency', 'urgent', 'high-priority'],
    successMessage: 'We\'ve received your emergency request. Someone will call you within 15 minutes.',
  },
}

// Template 4: Feedback/NPS Survey
export const FEEDBACK_SURVEY: FormTemplate = {
  id: 'feedback-survey',
  name: 'Patient Feedback Survey',
  description: 'Collect feedback and Net Promoter Score',
  category: 'feedback',
  icon: '⭐',
  fields: [
    createField('full_name', 'text', 'Full Name (Optional)', { required: false }),
    createField('email', 'email', 'Email Address (Optional)', { required: false }),
    createField('nps_score', 'scale', 'How likely are you to recommend us to a friend?', {
      required: true,
      validation: { min: 0, max: 10 },
    }),
    createField('overall_rating', 'rating', 'Overall Experience Rating', {
      required: true,
    }),
    createField('staff_rating', 'rating', 'Staff Friendliness', { required: false }),
    createField('cleanliness_rating', 'rating', 'Clinic Cleanliness', { required: false }),
    createField('wait_time_rating', 'rating', 'Wait Time', { required: false }),
    createField('feedback', 'textarea', 'Additional Comments', {
      placeholder: 'Tell us what we did well or how we can improve...',
    }),
  ],
  recommendedSettings: {
    enableRecaptcha: false,
    enableHoneypot: true,
    autoAddTags: ['feedback', 'survey'],
    successMessage: 'Thank you for your feedback! Your input helps us improve our service.',
  },
}

// Template 5: Referral Form
export const REFERRAL_FORM: FormTemplate = {
  id: 'referral-form',
  name: 'Refer a Friend',
  description: 'Patient referral program form',
  category: 'referral',
  icon: '🤝',
  fields: [
    createField('your_name', 'text', 'Your Name', { required: true }),
    createField('your_email', 'email', 'Your Email', { required: true }),
    createField('friend_name', 'text', 'Friend\'s Name', { required: true }),
    createField('friend_email', 'email', 'Friend\'s Email', { required: false }),
    createField('friend_phone', 'phone', 'Friend\'s Phone', { required: true }),
    createField('relationship', 'select', 'Your Relationship', {
      options: ['Family Member', 'Friend', 'Colleague', 'Neighbor', 'Other'],
    }),
    createField('message', 'textarea', 'Why are you referring them?', {
      placeholder: 'Optional: Tell us why you think they\'d benefit from our services',
    }),
  ],
  recommendedSettings: {
    enableRecaptcha: true,
    enableHoneypot: true,
    autoAddTags: ['referral', 'friend-referral'],
    successMessage: 'Thank you for the referral! We\'ll reach out to {{friend_name}} soon.',
  },
}

// Template 6: Event Registration
export const EVENT_REGISTRATION: FormTemplate = {
  id: 'event-registration',
  name: 'Event Registration',
  description: 'Sign up for webinars, open houses, or educational events',
  category: 'event',
  icon: '📅',
  fields: [
    createField('full_name', 'text', 'Full Name', { required: true }),
    createField('email', 'email', 'Email Address', { required: true }),
    createField('phone', 'phone', 'Phone Number', { required: false }),
    createField('num_attendees', 'select', 'Number of Attendees', {
      required: true,
      options: ['1', '2', '3', '4', '5+'],
    }),
    createField('dietary_restrictions', 'textarea', 'Dietary Restrictions (if applicable)', {
      placeholder: 'Any allergies or special requirements?',
    }),
    createField('how_heard', 'select', 'How did you hear about this event?', {
      options: ['Email', 'Social Media', 'Friend', 'Website', 'Other'],
    }),
  ],
  recommendedSettings: {
    enableRecaptcha: true,
    enableHoneypot: true,
    autoAddTags: ['event', 'registration'],
    successMessage: 'You\'re registered! We\'ll send you event details and reminders via email.',
  },
}

// Template 7: Treatment Interest (Specific)
export const TREATMENT_INTEREST: FormTemplate = {
  id: 'treatment-interest',
  name: 'Treatment Interest Form',
  description: 'Detailed inquiry for specific treatments',
  category: 'lead_gen',
  icon: '🦷',
  fields: [
    createField('full_name', 'text', 'Full Name', { required: true }),
    createField('email', 'email', 'Email Address', { required: true }),
    createField('phone', 'phone', 'Phone Number', { required: true }),
    createField('treatment', 'select', 'Treatment You\'re Interested In', {
      required: true,
      options: [
        'Dental Implants',
        'Invisalign/Braces',
        'Teeth Whitening',
        'Veneers',
        'Smile Makeover',
        'Gum Treatment',
      ],
    }),
    createField('budget', 'select', 'Approximate Budget', {
      options: [
        'Under £1,000',
        '£1,000 - £3,000',
        '£3,000 - £7,000',
        '£7,000 - £15,000',
        '£15,000+',
        'Cost not a concern',
      ],
    }),
    createField('timeframe', 'radio', 'When are you looking to proceed?', {
      required: true,
      options: [
        'Immediately (within 2 weeks)',
        'Soon (1-2 months)',
        'Planning ahead (3-6 months)',
        'Just exploring options',
      ],
    }),
  ],
  recommendedSettings: {
    enableRecaptcha: true,
    enableHoneypot: true,
    autoAddTags: ['treatment-inquiry', 'high-value'],
    successMessage: 'Thank you! We\'ll send you detailed information about {{treatment}} and schedule a consultation.',
  },
}

// Template 8: Payment Plan Inquiry
export const PAYMENT_PLAN_INQUIRY: FormTemplate = {
  id: 'payment-plan-inquiry',
  name: 'Payment Plan Inquiry',
  description: 'Finance and payment options request',
  category: 'lead_gen',
  icon: '💳',
  fields: [
    createField('full_name', 'text', 'Full Name', { required: true }),
    createField('email', 'email', 'Email Address', { required: true }),
    createField('phone', 'phone', 'Phone Number', { required: true }),
    createField('treatment', 'select', 'Treatment You Need', {
      required: true,
      options: ['Dental Implants', 'Invisalign', 'Smile Makeover', 'Root Canal', 'Other'],
    }),
    createField('estimated_cost', 'select', 'Estimated Treatment Cost', {
      options: ['£1,000-£3,000', '£3,000-£7,000', '£7,000-£15,000', 'Not sure'],
    }),
    createField('monthly_budget', 'select', 'Preferred Monthly Payment', {
      options: ['£50-£100', '£100-£200', '£200-£500', '£500+'],
    }),
  ],
  recommendedSettings: {
    enableRecaptcha: true,
    enableHoneypot: true,
    autoAddTags: ['payment-plan', 'finance-inquiry'],
    successMessage: 'Thank you! Our finance team will contact you within 24 hours with personalized payment options.',
  },
}

// Template 9: Insurance Verification
export const INSURANCE_VERIFICATION: FormTemplate = {
  id: 'insurance-verification',
  name: 'Insurance Verification',
  description: 'Verify insurance coverage and benefits',
  category: 'patient_intake',
  icon: '🏥',
  fields: [
    createField('full_name', 'text', 'Full Name', { required: true }),
    createField('email', 'email', 'Email Address', { required: true }),
    createField('phone', 'phone', 'Phone Number', { required: true }),
    createField('insurance_provider', 'text', 'Insurance Provider', {
      required: true,
      placeholder: 'e.g., Bupa, AXA, Vitality',
    }),
    createField('policy_number', 'text', 'Policy/Membership Number', { required: true }),
    createField('treatment', 'select', 'Treatment Needed', {
      options: ['General Checkup', 'Cleaning', 'Fillings', 'Root Canal', 'Extraction', 'Other'],
    }),
  ],
  recommendedSettings: {
    enableRecaptcha: true,
    enableHoneypot: true,
    autoAddTags: ['insurance', 'verification'],
    successMessage: 'We\'ve received your insurance details and will verify your coverage within 1 business day.',
  },
}

// Template 10: Simple Contact Us
export const CONTACT_US: FormTemplate = {
  id: 'contact-us',
  name: 'Contact Us',
  description: 'Basic contact form for general inquiries',
  category: 'lead_gen',
  icon: '📧',
  fields: [
    createField('full_name', 'text', 'Name', { required: true }),
    createField('email', 'email', 'Email', { required: true }),
    createField('phone', 'phone', 'Phone (Optional)', { required: false }),
    createField('subject', 'select', 'Subject', {
      required: true,
      options: ['General Inquiry', 'Appointment', 'Billing', 'Feedback', 'Other'],
    }),
    createField('message', 'textarea', 'Message', {
      required: true,
      placeholder: 'How can we help you?',
    }),
  ],
  recommendedSettings: {
    enableRecaptcha: true,
    enableHoneypot: true,
    autoAddTags: ['contact', 'general-inquiry'],
    successMessage: 'Thanks for reaching out! We\'ll respond to your message within 24 hours.',
  },
}

// Export all templates
export const FORM_TEMPLATES: FormTemplate[] = [
  NEW_PATIENT_INQUIRY,
  CONSULTATION_REQUEST,
  EMERGENCY_APPOINTMENT,
  FEEDBACK_SURVEY,
  REFERRAL_FORM,
  EVENT_REGISTRATION,
  TREATMENT_INTEREST,
  PAYMENT_PLAN_INQUIRY,
  INSURANCE_VERIFICATION,
  CONTACT_US,
]

/**
 * Get template by ID
 */
export function getTemplate(templateId: string): FormTemplate | undefined {
  return FORM_TEMPLATES.find(t => t.id === templateId)
}

/**
 * Get templates by category
 */
export function getTemplatesByCategory(category: FormTemplate['category']): FormTemplate[] {
  return FORM_TEMPLATES.filter(t => t.category === category)
}

