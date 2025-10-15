/**
 * Field Mapping Configurations for Ad Platform Lead Forms
 * 
 * Defines standard fields for each platform's lead forms
 * Used by FieldMapper component to show available fields
 */

export interface IntegrationFieldDefinition {
  key: string
  label: string
  type: 'text' | 'email' | 'phone' | 'number' | 'date' | 'select' | 'checkbox'
  required: boolean
  description?: string
}

/**
 * Meta (Facebook/Instagram) Lead Ads Standard Fields
 * 
 * Reference: https://developers.facebook.com/docs/marketing-api/guides/lead-ads/create#standard-questions
 */
export const META_LEAD_ADS_FIELDS: IntegrationFieldDefinition[] = [
  { key: 'full_name', label: 'Full Name', type: 'text', required: true },
  { key: 'first_name', label: 'First Name', type: 'text', required: false },
  { key: 'last_name', label: 'Last Name', type: 'text', required: false },
  { key: 'email', label: 'Email Address', type: 'email', required: true },
  { key: 'phone_number', label: 'Phone Number', type: 'phone', required: false },
  { key: 'city', label: 'City', type: 'text', required: false },
  { key: 'state', label: 'State/Province', type: 'text', required: false },
  { key: 'zip_code', label: 'Zip/Postal Code', type: 'text', required: false },
  { key: 'country', label: 'Country', type: 'text', required: false },
  { key: 'company_name', label: 'Company Name', type: 'text', required: false },
  { key: 'job_title', label: 'Job Title', type: 'text', required: false },
  { key: 'work_email', label: 'Work Email', type: 'email', required: false },
  { key: 'work_phone_number', label: 'Work Phone', type: 'phone', required: false },
  { key: 'date_of_birth', label: 'Date of Birth', type: 'date', required: false },
  { key: 'gender', label: 'Gender', type: 'select', required: false },
  { key: 'marital_status', label: 'Marital Status', type: 'select', required: false },
  
  // Custom questions (common for dental practices)
  { key: 'custom_treatment_interest', label: 'Treatment Interest', type: 'select', required: false },
  { key: 'custom_urgency', label: 'Urgency Level', type: 'select', required: false },
  { key: 'custom_budget', label: 'Approximate Budget', type: 'select', required: false },
  { key: 'custom_preferred_date', label: 'Preferred Appointment Date', type: 'date', required: false },
  { key: 'custom_comments', label: 'Additional Comments', type: 'text', required: false },
]

/**
 * Google Ads Lead Form Extension Fields
 * 
 * Reference: https://developers.google.com/google-ads/api/docs/leads/overview
 */
export const GOOGLE_ADS_LEAD_FIELDS: IntegrationFieldDefinition[] = [
  { key: 'full_name', label: 'Full Name', type: 'text', required: true },
  { key: 'first_name', label: 'First Name', type: 'text', required: false },
  { key: 'last_name', label: 'Last Name', type: 'text', required: false },
  { key: 'email', label: 'Email Address', type: 'email', required: true },
  { key: 'phone_number', label: 'Phone Number', type: 'phone', required: false },
  { key: 'city', label: 'City', type: 'text', required: false },
  { key: 'region', label: 'State/Region', type: 'text', required: false },
  { key: 'postal_code', label: 'Postal Code', type: 'text', required: false },
  { key: 'country_code', label: 'Country', type: 'text', required: false },
  { key: 'company_name', label: 'Company Name', type: 'text', required: false },
  { key: 'job_title', label: 'Job Title', type: 'text', required: false },
  
  // Google-specific
  { key: 'gclid', label: 'Google Click ID (GCLID)', type: 'text', required: false, description: 'For conversion tracking' },
  { key: 'campaign_id', label: 'Campaign ID', type: 'text', required: false },
  { key: 'ad_group_id', label: 'Ad Group ID', type: 'text', required: false },
  
  // Custom questions
  { key: 'custom_question_1', label: 'Custom Question 1', type: 'text', required: false },
  { key: 'custom_question_2', label: 'Custom Question 2', type: 'text', required: false },
  { key: 'custom_question_3', label: 'Custom Question 3', type: 'text', required: false },
]

/**
 * TikTok Lead Generation Form Fields
 * 
 * Reference: https://ads.tiktok.com/marketing_api/docs?id=1739953377508354
 */
export const TIKTOK_LEAD_GEN_FIELDS: IntegrationFieldDefinition[] = [
  { key: 'full_name', label: 'Full Name', type: 'text', required: true },
  { key: 'first_name', label: 'First Name', type: 'text', required: false },
  { key: 'last_name', label: 'Last Name', type: 'text', required: false },
  { key: 'email', label: 'Email Address', type: 'email', required: true },
  { key: 'phone_number', label: 'Phone Number', type: 'phone', required: false },
  { key: 'city', label: 'City', type: 'text', required: false },
  { key: 'state', label: 'State/Province', type: 'text', required: false },
  { key: 'zip_code', label: 'Zip Code', type: 'text', required: false },
  { key: 'country', label: 'Country', type: 'text', required: false },
  
  // TikTok-specific
  { key: 'ttclid', label: 'TikTok Click ID', type: 'text', required: false, description: 'For conversion tracking' },
  { key: 'campaign_id', label: 'Campaign ID', type: 'text', required: false },
  { key: 'ad_id', label: 'Ad ID', type: 'text', required: false },
  
  // Custom questions
  { key: 'custom_question_1', label: 'Custom Question 1', type: 'text', required: false },
  { key: 'custom_question_2', label: 'Custom Question 2', type: 'text', required: false },
  { key: 'custom_question_3', label: 'Custom Question 3', type: 'text', required: false },
]

/**
 * LinkedIn Lead Gen Form Fields
 * 
 * Reference: https://docs.microsoft.com/en-us/linkedin/marketing/integrations/ads/advertising-targeting/lead-gen-forms
 */
export const LINKEDIN_LEAD_GEN_FIELDS: IntegrationFieldDefinition[] = [
  { key: 'firstName', label: 'First Name', type: 'text', required: true },
  { key: 'lastName', label: 'Last Name', type: 'text', required: true },
  { key: 'email', label: 'Email Address', type: 'email', required: true },
  { key: 'phone', label: 'Phone Number', type: 'phone', required: false },
  { key: 'company', label: 'Company Name', type: 'text', required: false },
  { key: 'jobTitle', label: 'Job Title', type: 'text', required: false },
  { key: 'city', label: 'City', type: 'text', required: false },
  { key: 'state', label: 'State', type: 'text', required: false },
  { key: 'country', label: 'Country', type: 'text', required: false },
  
  // LinkedIn-specific
  { key: 'linkedinProfileUrl', label: 'LinkedIn Profile URL', type: 'text', required: false },
  
  // Custom questions
  { key: 'customQuestion1', label: 'Custom Question 1', type: 'text', required: false },
  { key: 'customQuestion2', label: 'Custom Question 2', type: 'text', required: false },
]

/**
 * Get field definitions for an integration type
 */
export function getFieldDefinitions(integrationType: string): IntegrationFieldDefinition[] {
  switch (integrationType) {
    case 'facebook_ads':
    case 'instagram_ads':
    case 'meta_lead_ads':
      return META_LEAD_ADS_FIELDS
    
    case 'google_ads':
      return GOOGLE_ADS_LEAD_FIELDS
    
    case 'tiktok_ads':
    case 'tiktok_lead_gen':
      return TIKTOK_LEAD_GEN_FIELDS
    
    case 'linkedin_ads':
      return LINKEDIN_LEAD_GEN_FIELDS
    
    default:
      return []
  }
}

/**
 * Default recommended mappings (smart defaults)
 */
export function getDefaultMapping(integrationType: string): Record<string, string> {
  // Common mappings that work across platforms
  return {
    full_name: 'contact.full_name',
    first_name: 'contact.first_name',
    last_name: 'contact.last_name',
    email: 'contact.primary_email',
    phone_number: 'contact.primary_phone',
    phone: 'contact.primary_phone',
    city: 'contact.city',
    state: 'contact.state',
    zip_code: 'contact.postal_code',
    postal_code: 'contact.postal_code',
    country: 'contact.country',
    company_name: 'contact.company',
    company: 'contact.company',
    job_title: 'contact.job_title',
    
    // Deal mappings
    custom_budget: 'deal.value',
    custom_treatment_interest: 'deal.title',
    custom_comments: 'deal.description',
    
    // Attribution fields
    gclid: 'deal.utm_content',
    ttclid: 'deal.utm_content',
    campaign_id: 'deal.utm_campaign',
  }
}

/**
 * Apply field mapping to transform external data → CRM data
 * 
 * @param externalData - Data from integration (e.g., Meta lead ad response)
 * @param mapping - Field mapping config
 * @returns Transformed data ready for Contact/Deal creation
 */
export function applyFieldMapping(
  externalData: Record<string, any>,
  mapping: Record<string, string>
): {
  contactData: Record<string, any>
  dealData: Record<string, any>
  taskData: Record<string, any>
} {
  const contactData: Record<string, any> = {}
  const dealData: Record<string, any> = {}
  const taskData: Record<string, any> = {}
  
  for (const [sourceKey, targetPath] of Object.entries(mapping)) {
    const value = externalData[sourceKey]
    if (value === undefined || value === null) continue
    
    const [entity, field] = targetPath.split('.')
    
    if (entity === 'contact') {
      contactData[field] = value
    } else if (entity === 'deal') {
      dealData[field] = value
    } else if (entity === 'task') {
      taskData[field] = value
    }
  }
  
  return { contactData, dealData, taskData }
}

