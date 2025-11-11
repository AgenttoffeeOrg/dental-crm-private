import { createServiceClient } from '@/lib/supabase-server'

type SupabaseClient = ReturnType<typeof createServiceClient>

type Maybe<T> = T | null | undefined

interface TwilioSecrets {
  accountSid?: Maybe<string>
  authToken?: Maybe<string>
  messagingServiceSid?: Maybe<string>
  smsFrom?: Maybe<string>
  whatsappSender?: Maybe<string>
  voiceCallerId?: Maybe<string>
}

interface SendgridSecrets {
  apiKey?: Maybe<string>
  defaultFrom?: Maybe<string>
  defaultReplyTo?: Maybe<string>
}

interface LoadedSecrets {
  twilio?: TwilioSecrets
  sendgrid?: SendgridSecrets
  source: 'vault' | 'env' | 'legacy' | 'unknown'
}

export interface NormalizedIntegrationSettings {
  is_email_configured: boolean
  email_provider: Maybe<string>
  email_api_key?: Maybe<string>
  email_from_address?: Maybe<string>
  email_from_name?: Maybe<string>
  email_reply_to_address?: Maybe<string>

  is_sms_configured: boolean
  sms_account_sid?: Maybe<string>
  sms_auth_token?: Maybe<string>
  sms_from_number?: Maybe<string>
  sms_messaging_service_sid?: Maybe<string>

  is_whatsapp_configured: boolean
  whatsapp_account_sid?: Maybe<string>
  whatsapp_auth_token?: Maybe<string>
  whatsapp_from_number?: Maybe<string>

  is_voice_configured: boolean
  voice_account_sid?: Maybe<string>
  voice_auth_token?: Maybe<string>
  voice_from_number?: Maybe<string>

  /**
   * Optional debugging metadata so callers can trace where settings came from.
   */
  _debug?: {
    channelSource: 'channel_settings' | 'legacy' | 'env'
    secretSource: LoadedSecrets['source']
  }
}

function coerceString(value: Maybe<string>): string | undefined {
  if (!value) return undefined
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

async function loadIntegrationSecrets(
  supabase: SupabaseClient,
  tenantId: string
): Promise<LoadedSecrets> {
  const encryptionKey = process.env.INTEGRATION_CREDENTIAL_KEY
  if (!encryptionKey) {
    return { source: 'env' }
  }

  const { data, error } = await supabase.rpc('integration_load_credentials', {
    p_tenant_id: tenantId,
    p_encryption_key: encryptionKey,
  })

  if (error) {
    console.error('[integration] Failed to load encrypted credentials:', error)
    return { source: 'env' }
  }

  if (!data) {
    return { source: 'env' }
  }

  const secrets = data as Record<string, any>

  const twilioRaw = secrets.twilio as Record<string, any> | undefined
  const sendgridRaw = secrets.sendgrid as Record<string, any> | undefined

  const twilio: TwilioSecrets | undefined = twilioRaw
    ? {
        accountSid: coerceString(twilioRaw.accountSid),
        authToken: coerceString(twilioRaw.authToken),
        messagingServiceSid: coerceString(twilioRaw.messagingServiceSid),
        smsFrom: coerceString(twilioRaw.smsFrom),
        whatsappSender: coerceString(twilioRaw.whatsappSender),
        voiceCallerId: coerceString(twilioRaw.voiceCallerId),
      }
    : undefined

  const sendgrid: SendgridSecrets | undefined = sendgridRaw
    ? {
        apiKey: coerceString(sendgridRaw.apiKey),
        defaultFrom: coerceString(sendgridRaw.defaultFrom),
        defaultReplyTo: coerceString(sendgridRaw.defaultReplyTo),
      }
    : undefined

  return {
    twilio,
    sendgrid,
    source: 'vault',
  }
}

function loadSecretsFromEnv(): LoadedSecrets {
  const twilio: TwilioSecrets = {
    accountSid: coerceString(process.env.TWILIO_ACCOUNT_SID),
    authToken: coerceString(process.env.TWILIO_AUTH_TOKEN),
    messagingServiceSid: coerceString(process.env.TWILIO_MESSAGING_SERVICE_SID),
    smsFrom: coerceString(process.env.TWILIO_SMS_FROM),
    whatsappSender: coerceString(process.env.TWILIO_WHATSAPP_SENDER),
    voiceCallerId: coerceString(process.env.TWILIO_VOICE_CALLER_ID || process.env.TWILIO_SMS_FROM),
  }

  const sendgrid: SendgridSecrets = {
    apiKey: coerceString(process.env.SENDGRID_API_KEY),
    defaultFrom: coerceString(process.env.DEFAULT_FROM_EMAIL),
    defaultReplyTo: coerceString(process.env.DEFAULT_REPLY_TO_EMAIL || process.env.DEFAULT_FROM_EMAIL),
  }

  const hasTwilio =
    twilio.accountSid && twilio.authToken && (twilio.messagingServiceSid || twilio.smsFrom || twilio.voiceCallerId)
  const hasSendgrid = Boolean(sendgrid.apiKey)

  return {
    twilio: hasTwilio ? twilio : undefined,
    sendgrid: hasSendgrid ? sendgrid : undefined,
    source: 'env',
  }
}

function mergeSecrets(preferred: LoadedSecrets, fallback: LoadedSecrets): LoadedSecrets {
  const twilio = preferred.twilio || fallback.twilio
  const sendgrid = preferred.sendgrid || fallback.sendgrid

  return {
    twilio,
    sendgrid,
    source: preferred.source !== 'env' ? preferred.source : fallback.source,
  }
}

interface ChannelRow {
  tenant_id: string
  twilio_voice_enabled: boolean
  twilio_sms_enabled: boolean
  twilio_whatsapp_enabled: boolean
  email_provider: Maybe<string>
  default_from_email: Maybe<string>
  default_reply_to_email: Maybe<string>
  metadata: Record<string, any> | null
  twilio_account_sid?: Maybe<string>
  twilio_messaging_service_sid?: Maybe<string>
  twilio_sms_from_number?: Maybe<string>
  twilio_whatsapp_number?: Maybe<string>
  twilio_voice_caller_id?: Maybe<string>
}

function normalizeSettingsFromChannel(
  channel: ChannelRow | null,
  secrets: LoadedSecrets
): NormalizedIntegrationSettings | null {
  if (!channel) {
    return null
  }

  const metadata = channel.metadata || {}
  const twilioMeta = (metadata.twilio as Record<string, any> | undefined) || {}

  const twilio = secrets.twilio || {}
  const sendgrid = secrets.sendgrid || {}

  const emailProvider = channel.email_provider || (sendgrid.apiKey ? 'sendgrid' : null)
  const defaultFromEmail =
    channel.default_from_email ||
    sendgrid.defaultFrom ||
    (metadata.email && metadata.email.from_address) ||
    null

  const replyTo =
    channel.default_reply_to_email ||
    sendgrid.defaultReplyTo ||
    (metadata.email && metadata.email.reply_to) ||
    null

  const smsMessagingServiceSid = channel.twilio_messaging_service_sid || twilioMeta.messagingServiceSid || twilio.messagingServiceSid
  const smsFromNumber = channel.twilio_sms_from_number || twilioMeta.smsFrom || twilio.smsFrom
  const whatsappNumber = channel.twilio_whatsapp_number || twilioMeta.whatsappSender || twilio.whatsappSender
  const voiceCallerId = channel.twilio_voice_caller_id || twilioMeta.voiceCallerId || twilio.voiceCallerId
  const accountSid = channel.twilio_account_sid || twilioMeta.accountSid || twilio.accountSid

  const smsConfigured =
    Boolean(channel.twilio_sms_enabled) &&
    Boolean(accountSid) &&
    Boolean(twilio.authToken) &&
    Boolean(smsMessagingServiceSid || smsFromNumber)

  const whatsappConfigured =
    Boolean(channel.twilio_whatsapp_enabled) &&
    Boolean(accountSid) &&
    Boolean(twilio.authToken) &&
    Boolean(whatsappNumber)

  const voiceConfigured =
    Boolean(channel.twilio_voice_enabled) &&
    Boolean(accountSid) &&
    Boolean(twilio.authToken) &&
    Boolean(voiceCallerId)

  const emailConfigured =
    Boolean(emailProvider === 'sendgrid' ? sendgrid.apiKey : true) && Boolean(defaultFromEmail)

  return {
    is_email_configured: Boolean(emailConfigured),
    email_provider: emailProvider,
    email_api_key: sendgrid.apiKey,
    email_from_address: defaultFromEmail,
    email_from_name: metadata.email?.from_name || null,
    email_reply_to_address: replyTo,

    is_sms_configured: smsConfigured,
    sms_account_sid: accountSid,
    sms_auth_token: twilio.authToken,
    sms_from_number: smsFromNumber,
    sms_messaging_service_sid: smsMessagingServiceSid,

    is_whatsapp_configured: whatsappConfigured,
    whatsapp_account_sid: accountSid,
    whatsapp_auth_token: twilio.authToken,
    whatsapp_from_number: whatsappNumber,

    is_voice_configured: voiceConfigured,
    voice_account_sid: accountSid,
    voice_auth_token: twilio.authToken,
    voice_from_number: voiceCallerId,

    _debug: {
      channelSource: 'channel_settings',
      secretSource: secrets.source,
    },
  }
}

function normalizeSettingsFromLegacy(row: Record<string, any> | null): NormalizedIntegrationSettings | null {
  if (!row) return null

  return {
    is_email_configured: Boolean(row.is_email_configured),
    email_provider: row.email_provider,
    email_api_key: row.email_api_key,
    email_from_address: row.email_from_address,
    email_from_name: row.email_from_name,
    email_reply_to_address: row.email_reply_to_address || row.email_from_address,

    is_sms_configured: Boolean(row.is_sms_configured),
    sms_account_sid: row.sms_account_sid,
    sms_auth_token: row.sms_auth_token,
    sms_from_number: row.sms_from_number,
    sms_messaging_service_sid: row.sms_messaging_service_sid,

    is_whatsapp_configured: Boolean(row.is_whatsapp_configured),
    whatsapp_account_sid: row.whatsapp_account_sid,
    whatsapp_auth_token: row.whatsapp_auth_token,
    whatsapp_from_number: row.whatsapp_from_number,

    is_voice_configured: Boolean(row.is_voice_configured),
    voice_account_sid: row.voice_account_sid,
    voice_auth_token: row.voice_auth_token,
    voice_from_number: row.voice_from_number,

    _debug: {
      channelSource: 'legacy',
      secretSource: row.email_api_key || row.sms_auth_token ? 'legacy' : 'unknown',
    },
  }
}

function buildSettingsFromEnv(secrets: LoadedSecrets): NormalizedIntegrationSettings {
  const twilio = secrets.twilio || {}
  const sendgrid = secrets.sendgrid || {}

  const smsConfigured =
    Boolean(twilio.accountSid) &&
    Boolean(twilio.authToken) &&
    Boolean(twilio.messagingServiceSid || twilio.smsFrom)

  const whatsappConfigured =
    Boolean(twilio.accountSid) && Boolean(twilio.authToken) && Boolean(twilio.whatsappSender)

  const voiceConfigured = Boolean(twilio.accountSid) && Boolean(twilio.authToken) && Boolean(twilio.voiceCallerId)

  const defaultEmail = sendgrid.defaultFrom

  return {
    is_email_configured: Boolean(sendgrid.apiKey && defaultEmail),
    email_provider: sendgrid.apiKey ? 'sendgrid' : null,
    email_api_key: sendgrid.apiKey,
    email_from_address: defaultEmail,
    email_from_name: null,
    email_reply_to_address: sendgrid.defaultReplyTo,

    is_sms_configured: smsConfigured,
    sms_account_sid: twilio.accountSid,
    sms_auth_token: twilio.authToken,
    sms_from_number: twilio.smsFrom,
    sms_messaging_service_sid: twilio.messagingServiceSid,

    is_whatsapp_configured: whatsappConfigured,
    whatsapp_account_sid: twilio.accountSid,
    whatsapp_auth_token: twilio.authToken,
    whatsapp_from_number: twilio.whatsappSender,

    is_voice_configured: voiceConfigured,
    voice_account_sid: twilio.accountSid,
    voice_auth_token: twilio.authToken,
    voice_from_number: twilio.voiceCallerId || twilio.smsFrom,

    _debug: {
      channelSource: 'env',
      secretSource: secrets.source,
    },
  }
}

export async function loadTenantIntegrationSettings(
  tenantId: string,
  options?: { supabase?: SupabaseClient }
): Promise<NormalizedIntegrationSettings | null> {
  const supabase = options?.supabase ?? createServiceClient()

  const secretsFromVault = await loadIntegrationSecrets(supabase, tenantId)
  const secretsFromEnv = loadSecretsFromEnv()
  const mergedSecrets = mergeSecrets(secretsFromVault, secretsFromEnv)
  const channelPromise = supabase
    .from('integration_channel_settings')
    .select(
      `
        tenant_id,
        twilio_voice_enabled,
        twilio_sms_enabled,
        twilio_whatsapp_enabled,
        email_provider,
        default_from_email,
        default_reply_to_email,
        metadata,
        twilio_account_sid,
        twilio_messaging_service_sid,
        twilio_sms_from_number,
        twilio_whatsapp_number,
        twilio_voice_caller_id
      `
    )
    .eq('tenant_id', tenantId)
    .maybeSingle()

  const [{ data: channelRow, error }] = await Promise.all([channelPromise])

  if (error) {
    console.error('[integration] Failed to load channel settings:', error)
  }

  const normalizedFromChannel = normalizeSettingsFromChannel(channelRow as ChannelRow | null, mergedSecrets)
  if (normalizedFromChannel) {
    return normalizedFromChannel
  }

  // Fallback: legacy integration_settings table
  const { data: legacyRow, error: legacyError } = await supabase
    .from('integration_settings')
    .select('*')
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (legacyError) {
    console.error('[integration] Failed to load legacy integration settings:', legacyError)
  }

  const legacy = normalizeSettingsFromLegacy(legacyRow as Record<string, any> | null)
  if (legacy) {
    return legacy
  }

  // Final fallback: environment variables
  const fallback = buildSettingsFromEnv(mergedSecrets)

  if (!fallback.is_email_configured && !fallback.is_sms_configured && !fallback.is_whatsapp_configured && !fallback.is_voice_configured) {
    return null
  }

  return fallback
}


