#!/usr/bin/env node
import 'dotenv/config.js';
import { Client } from 'pg';

const {
  TENANT_ID,
  INTEGRATION_CREDENTIAL_KEY,
  TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN,
  TWILIO_MESSAGING_SERVICE_SID,
  TWILIO_SMS_FROM,
  TWILIO_WHATSAPP_SENDER,
  TWILIO_VOICE_CALLER_ID,
  SENDGRID_API_KEY,
  DEFAULT_FROM_EMAIL,
  DEFAULT_REPLY_TO_EMAIL,
  SUPABASE_DB_HOST = 'aws-1-eu-west-1.pooler.supabase.com',
  SUPABASE_DB_PORT = '5432',
  SUPABASE_DB_USER,
  SUPABASE_DB_PASSWORD,
  SUPABASE_DB_NAME = 'postgres',
} = process.env;

function requireEnv(name, value) {
  if (!value || value.trim() === '') {
    console.error(`Missing required environment variable: ${name}`);
    process.exit(1);
  }
}

requireEnv('TENANT_ID', TENANT_ID);
requireEnv('INTEGRATION_CREDENTIAL_KEY', INTEGRATION_CREDENTIAL_KEY);
requireEnv('TWILIO_ACCOUNT_SID', TWILIO_ACCOUNT_SID);
requireEnv('TWILIO_AUTH_TOKEN', TWILIO_AUTH_TOKEN);
requireEnv('TWILIO_WHATSAPP_SENDER', TWILIO_WHATSAPP_SENDER);
requireEnv('TWILIO_VOICE_CALLER_ID', TWILIO_VOICE_CALLER_ID);
requireEnv('SENDGRID_API_KEY', SENDGRID_API_KEY);
requireEnv('DEFAULT_FROM_EMAIL', DEFAULT_FROM_EMAIL);
requireEnv('SUPABASE_DB_USER', SUPABASE_DB_USER);
requireEnv('SUPABASE_DB_PASSWORD', SUPABASE_DB_PASSWORD);

if (!TWILIO_MESSAGING_SERVICE_SID && !TWILIO_SMS_FROM) {
  console.error('Provide either TWILIO_MESSAGING_SERVICE_SID or TWILIO_SMS_FROM.');
  process.exit(1);
}

const secrets = {
  twilio: {
    accountSid: TWILIO_ACCOUNT_SID,
    authToken: TWILIO_AUTH_TOKEN,
    messagingServiceSid: TWILIO_MESSAGING_SERVICE_SID || null,
    smsFrom: TWILIO_SMS_FROM || null,
    whatsappSender: TWILIO_WHATSAPP_SENDER,
    voiceCallerId: TWILIO_VOICE_CALLER_ID,
  },
  sendgrid: {
    apiKey: SENDGRID_API_KEY,
    defaultFrom: DEFAULT_FROM_EMAIL,
    defaultReplyTo: DEFAULT_REPLY_TO_EMAIL || DEFAULT_FROM_EMAIL,
  },
};

const sslRejectUnauthorized = process.env.SUPABASE_DB_SSL_REJECT_UNAUTHORIZED !== 'false';
const sslConfig =
  process.env.SUPABASE_DB_SSL_MODE === 'disable'
    ? undefined
    : { rejectUnauthorized: sslRejectUnauthorized };

const client = new Client({
  host: SUPABASE_DB_HOST,
  port: Number(SUPABASE_DB_PORT),
  user: SUPABASE_DB_USER,
  password: SUPABASE_DB_PASSWORD,
  database: SUPABASE_DB_NAME,
  ssl: sslConfig,
});

const channelSettings = {
  twilio_voice_enabled: true,
  twilio_sms_enabled: Boolean(TWILIO_MESSAGING_SERVICE_SID || TWILIO_SMS_FROM),
  twilio_whatsapp_enabled: Boolean(TWILIO_WHATSAPP_SENDER),
  email_provider: 'sendgrid',
  default_from_email: DEFAULT_FROM_EMAIL,
  default_reply_to_email: DEFAULT_REPLY_TO_EMAIL || DEFAULT_FROM_EMAIL,
  metadata: {
    twilio: {
      accountSid: TWILIO_ACCOUNT_SID,
      messagingServiceSid: TWILIO_MESSAGING_SERVICE_SID || null,
      smsFrom: TWILIO_SMS_FROM || null,
      whatsappSender: TWILIO_WHATSAPP_SENDER,
      voiceCallerId: TWILIO_VOICE_CALLER_ID,
    },
    sendgrid: {
      defaultFrom: DEFAULT_FROM_EMAIL,
      defaultReplyTo: DEFAULT_REPLY_TO_EMAIL || DEFAULT_FROM_EMAIL,
    },
  },
  twilio_account_sid: TWILIO_ACCOUNT_SID,
  twilio_messaging_service_sid: TWILIO_MESSAGING_SERVICE_SID || null,
  twilio_sms_from_number: TWILIO_SMS_FROM || null,
  twilio_whatsapp_number: TWILIO_WHATSAPP_SENDER,
  twilio_voice_caller_id: TWILIO_VOICE_CALLER_ID,
};

async function run() {
  try {
    await client.connect();
    await client.query('BEGIN');

    await client.query(
      `
      INSERT INTO integration_channel_settings (
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
        twilio_voice_caller_id,
        updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW()
      )
      ON CONFLICT (tenant_id)
      DO UPDATE SET
        twilio_voice_enabled = EXCLUDED.twilio_voice_enabled,
        twilio_sms_enabled = EXCLUDED.twilio_sms_enabled,
        twilio_whatsapp_enabled = EXCLUDED.twilio_whatsapp_enabled,
        email_provider = EXCLUDED.email_provider,
        default_from_email = EXCLUDED.default_from_email,
        default_reply_to_email = EXCLUDED.default_reply_to_email,
        metadata = EXCLUDED.metadata,
        twilio_account_sid = EXCLUDED.twilio_account_sid,
        twilio_messaging_service_sid = EXCLUDED.twilio_messaging_service_sid,
        twilio_sms_from_number = EXCLUDED.twilio_sms_from_number,
        twilio_whatsapp_number = EXCLUDED.twilio_whatsapp_number,
        twilio_voice_caller_id = EXCLUDED.twilio_voice_caller_id,
        updated_at = NOW();
      `,
      [
        TENANT_ID,
        channelSettings.twilio_voice_enabled,
        channelSettings.twilio_sms_enabled,
        channelSettings.twilio_whatsapp_enabled,
        channelSettings.email_provider,
        channelSettings.default_from_email,
        channelSettings.default_reply_to_email,
        JSON.stringify(channelSettings.metadata),
        channelSettings.twilio_account_sid,
        channelSettings.twilio_messaging_service_sid,
        channelSettings.twilio_sms_from_number,
        channelSettings.twilio_whatsapp_number,
        channelSettings.twilio_voice_caller_id,
      ]
    );

    await client.query(
      `SELECT integration_store_credentials($1::uuid, $2::jsonb, $3::text, NULL::uuid);`,
      [TENANT_ID, secrets, INTEGRATION_CREDENTIAL_KEY]
    );

    await client.query('COMMIT');
    console.log('Credentials stored for tenant', TENANT_ID);
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Failed to store credentials:', err.message);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

run();
